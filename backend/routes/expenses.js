const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const authenticate = require('../middleware/auth');
const Expense = require('../models/Expense');

const router = express.Router();

// Get all expenses
router.get('/', authenticate, async (req, res) => {
  try {
    const { from, to, category, q, page = 1, limit = 20, paymentMethod } = req.query;
    const filter = { user: new mongoose.Types.ObjectId(req.userId) };
    
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    
    if (category) filter.category = category;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (q) {
      filter.$or = [
        { notes: new RegExp(q, 'i') },
        { merchant: new RegExp(q, 'i') }
      ];
    }
    
    const expenses = await Expense.find(filter)
      .populate('category', 'name color type')
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await Expense.countDocuments(filter);
    
    res.json({ success: true, data: { expenses, total, page: parseInt(page), pages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error(err);
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
  body('merchant').optional().trim(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    
    try {
      const { amount, categoryId, date, paymentMethod, notes, merchant } = req.body;
      const expense = await Expense.create({
        user: new mongoose.Types.ObjectId(req.userId),
        amount,
        category: categoryId,
        date,
        paymentMethod,
        notes,
        merchant
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
    const { from, to, groupBy } = req.query;
    const filter = { user: new mongoose.Types.ObjectId(req.userId) };
    
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    
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
    const { amount, categoryId, date, paymentMethod, notes, merchant } = req.body;
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, user: new mongoose.Types.ObjectId(req.userId) },
      { $set: { amount, category: categoryId, date, paymentMethod, notes, merchant } },
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
