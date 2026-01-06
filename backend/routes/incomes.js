const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const authenticate = require('../middleware/auth');
const Income = require('../models/Income');

const router = express.Router();

// Get all incomes
router.get('/', authenticate, async (req, res) => {
  try {
    const { from, to, year, month, page = 1, limit = 20 } = req.query;
    const filter = { user: new mongoose.Types.ObjectId(req.userId) };
    
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    
    if (year && month) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      filter.date = { $gte: startDate, $lte: endDate };
    }
    
    const incomes = await Income.find(filter)
      .populate('category', 'name color')
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await Income.countDocuments(filter);
    
    res.json({ success: true, data: { incomes, total, page: parseInt(page), pages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error(err);
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
    const { from, to } = req.query;
    const filter = { user: new mongoose.Types.ObjectId(req.userId) };
    
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    
    const result = await Income.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    
    res.json({ success: true, data: { total: result[0]?.total || 0, count: result[0]?.count || 0 } });
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
