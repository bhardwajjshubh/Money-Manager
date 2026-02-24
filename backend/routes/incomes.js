const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const authenticate = require('../middleware/auth');
const Income = require('../models/Income');

const router = express.Router();

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildIncomeFilter = (query, userId) => {
  const { from, to, year, month, source } = query;
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

  if (source) {
    const normalizedSource = source.trim();
    filter.source = new RegExp(`^${escapeRegex(normalizedSource)}$`, 'i');
  }

  return filter;
};

// Get all incomes
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const filter = buildIncomeFilter(req.query, req.userId);
    
    const incomes = await Income.find(filter)
      .populate('category', 'name color')
      .sort({ date: -1 })
      .limit(limitNumber)
      .skip((pageNumber - 1) * limitNumber);
    
    const total = await Income.countDocuments(filter);
    
    res.json({ success: true, data: { incomes, total, page: pageNumber, pages: Math.ceil(total / limitNumber) } });
  } catch (err) {
    console.error(err);
    if (err.status) {
      return res.status(err.status).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create income
router.post('/',
  authenticate,
  body('amount').isFloat({ min: 0 }),
  body('source').isLength({ min: 1 }).trim(),
  body('date').isISO8601(),
  body('notes').optional().trim(),
  body('categoryId').optional().isMongoId(),
  body('savingsGoalId').optional().isMongoId(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    
    try {
      const { amount, source, date, notes, categoryId, savingsGoalId } = req.body;
      const income = await Income.create({
        user: new mongoose.Types.ObjectId(req.userId),
        amount,
        source,
        date,
        notes,
        category: categoryId,
        savingsGoal: savingsGoalId
      });
      await income.populate('category', 'name color');
      res.status(201).json({ success: true, data: { income } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// Get income summary
router.get('/summary', authenticate, async (req, res) => {
  try {
    const filter = buildIncomeFilter(req.query, req.userId);
    
    const result = await Income.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    
    res.json({ success: true, data: { total: result[0]?.total || 0, count: result[0]?.count || 0 } });
  } catch (err) {
    console.error(err);
    if (err.status) {
      return res.status(err.status).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get distinct income sources for user
router.get('/sources', authenticate, async (req, res) => {
  try {
    const sourcesResult = await Income.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(req.userId) } },
      { $project: { source: { $trim: { input: '$source' } } } },
      { $match: { source: { $ne: '' } } },
      { $sort: { source: 1 } },
      { $group: { _id: { $toLower: '$source' }, source: { $first: '$source' } } },
      { $sort: { source: 1 } },
      { $project: { _id: 0, source: 1 } }
    ]);

    const sources = sourcesResult.map((item) => item.source);

    res.json({ success: true, data: { sources } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get single income
router.get('/:id', authenticate, async (req, res) => {
  try {
    const income = await Income.findOne({ _id: req.params.id, user: new mongoose.Types.ObjectId(req.userId) }).populate('category');
    if (!income) return res.status(404).json({ success: false, message: 'Income not found' });
    res.json({ success: true, data: { income } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update income
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { amount, source, date, notes, categoryId } = req.body;
    const income = await Income.findOneAndUpdate(
      { _id: req.params.id, user: new mongoose.Types.ObjectId(req.userId) },
      { $set: { amount, source, date, notes, category: categoryId } },
      { new: true, runValidators: true }
    ).populate('category');
    if (!income) return res.status(404).json({ success: false, message: 'Income not found' });
    res.json({ success: true, data: { income } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete income
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const income = await Income.findOneAndDelete({ _id: req.params.id, user: new mongoose.Types.ObjectId(req.userId) });
    if (!income) return res.status(404).json({ success: false, message: 'Income not found' });
    res.json({ success: true, message: 'Income deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
