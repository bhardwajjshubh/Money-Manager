const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const authenticate = require('../middleware/auth');
const Expense = require('../models/Expense');

const router = express.Router();

const buildExpenseFilter = (query, userId) => {
  const { from, to, category, q, paymentMethod, month, year } = query;
  const filter = { user: new mongoose.Types.ObjectId(userId) };

  const monthNumber = month ? parseInt(month, 10) : null;
  const yearNumber = year ? parseInt(year, 10) : null;

  if (month && (Number.isNaN(monthNumber) || monthNumber < 1 || monthNumber > 12)) {
    const error = new Error('Invalid month. Expected value 1-12.');
    error.status = 400;
    throw error;
  }

  if (year && (Number.isNaN(yearNumber) || yearNumber < 1900 || yearNumber > 9999)) {
    const error = new Error('Invalid year. Expected value 1900-9999.');
    error.status = 400;
    throw error;
  }

  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  } else if (monthNumber && yearNumber) {
    filter.date = {
      $gte: new Date(Date.UTC(yearNumber, monthNumber - 1, 1, 0, 0, 0, 0)),
      $lte: new Date(Date.UTC(yearNumber, monthNumber, 0, 23, 59, 59, 999))
    };
  } else if (yearNumber) {
    filter.date = {
      $gte: new Date(Date.UTC(yearNumber, 0, 1, 0, 0, 0, 0)),
      $lte: new Date(Date.UTC(yearNumber, 11, 31, 23, 59, 59, 999))
    };
  } else if (monthNumber) {
    filter.$expr = { $eq: [{ $month: '$date' }, monthNumber] };
  }

  if (category) {
    if (!mongoose.Types.ObjectId.isValid(category)) {
      const error = new Error('Invalid category id.');
      error.status = 400;
      throw error;
    }
    filter.category = new mongoose.Types.ObjectId(category);
  }
  if (paymentMethod) filter.paymentMethod = paymentMethod;
  if (q) {
    filter.$or = [{ notes: new RegExp(q, 'i') }];
  }

  return filter;
};

// Get all expenses
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const filter = buildExpenseFilter(req.query, req.userId);
    
    const expenses = await Expense.find(filter)
      .populate('category', 'name color type')
      .sort({ date: -1 })
      .limit(limitNumber)
      .skip((pageNumber - 1) * limitNumber);
    
    const total = await Expense.countDocuments(filter);
    
    res.json({ success: true, data: { expenses, total, page: pageNumber, pages: Math.ceil(total / limitNumber) } });
  } catch (err) {
    console.error(err);
    if (err.status) {
      return res.status(err.status).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create expense
router.post('/',
  authenticate,
  body('amount').isFloat({ min: 0 }),
  body('categoryId').isMongoId(),
  body('date').isISO8601(),
  body('paymentMethod').optional().trim(),
  body('notes').optional().trim(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    
    try {
      const { amount, categoryId, date, paymentMethod, notes } = req.body;
      const expense = await Expense.create({
        user: new mongoose.Types.ObjectId(req.userId),
        amount,
        category: categoryId,
        date,
        paymentMethod,
        notes
      });
      await expense.populate('category', 'name color type');
      res.status(201).json({ success: true, data: { expense } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// Get expense summary
router.get('/summary', authenticate, async (req, res) => {
  try {
    const { groupBy } = req.query;
    const filter = buildExpenseFilter(req.query, req.userId);
    
    let groupField = null;
    if (groupBy === 'category') groupField = '$category';
    else if (groupBy === 'month') groupField = { $month: '$date' };
    
    const pipeline = [{ $match: filter }];
    
    if (groupField) {
      pipeline.push({
        $group: {
          _id: groupField,
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      });
      if (groupBy === 'category') {
        pipeline.push({ $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } });
        pipeline.push({ $unwind: '$category' });
      }
    } else {
      pipeline.push({ $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } });
    }
    
    const result = await Expense.aggregate(pipeline);
    
    res.json({ success: true, data: { summary: result } });
  } catch (err) {
    console.error(err);
    if (err.status) {
      return res.status(err.status).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get single expense
router.get('/:id', authenticate, async (req, res) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, user: new mongoose.Types.ObjectId(req.userId) }).populate('category');
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
    res.json({ success: true, data: { expense } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update expense
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { amount, categoryId, date, paymentMethod, notes } = req.body;
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, user: new mongoose.Types.ObjectId(req.userId) },
      { $set: { amount, category: categoryId, date, paymentMethod, notes } },
      { new: true, runValidators: true }
    ).populate('category');
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
    res.json({ success: true, data: { expense } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete expense
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, user: new mongoose.Types.ObjectId(req.userId) });
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
    res.json({ success: true, message: 'Expense deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
