const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const authenticate = require('../middleware/auth');
const Budget = require('../models/Budget');
const Expense = require('../models/Expense');

const router = express.Router();

// Get budgets
router.get('/', authenticate, async (req, res) => {
  try {
    const { month, year } = req.query;
    const filter = { user: new mongoose.Types.ObjectId(req.userId) };
    
    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);
    
    const budgets = await Budget.find(filter).populate('category', 'name color type');
    res.json({ success: true, data: { budgets } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create budget
router.post('/',
  authenticate,
  body('categoryId').isMongoId(),
  body('amount').isFloat({ min: 0 }),
  body('month').isInt({ min: 1, max: 12 }),
  body('year').isInt({ min: 2000, max: 3000 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    
    try {
      const { categoryId, amount, month, year } = req.body;
      const budget = await Budget.create({
        user: new mongoose.Types.ObjectId(req.userId),
        category: categoryId,
        amount,
        month,
        year
      });
      await budget.populate('category', 'name color type');
      res.status(201).json({ success: true, data: { budget } });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(400).json({ success: false, message: 'Budget already exists for this category and period' });
      }
      console.error(err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// Get budget usage
router.get('/usage', authenticate, async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'Month and year required' });
    }
    
    const budgets = await Budget.find({
      user: new mongoose.Types.ObjectId(req.userId),
      month: parseInt(month),
      year: parseInt(year)
    }).populate('category', 'name color type');
    
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    const usage = await Promise.all(budgets.map(async (budget) => {
      const spent = await Expense.aggregate([
        {
          $match: {
            user: new mongoose.Types.ObjectId(budget.user),
            category: budget.category._id,
            date: { $gte: startDate, $lte: endDate }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      
      const spentAmount = spent[0]?.total || 0;
      const remaining = budget.amount - spentAmount;
      const percentage = budget.amount > 0 ? (spentAmount / budget.amount) * 100 : 0;
      
      return {
        budget: budget.toObject(),
        spent: spentAmount,
        remaining,
        percentage: Math.round(percentage),
        exceeded: spentAmount > budget.amount
      };
    }));
    
    res.json({ success: true, data: { usage } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update budget
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { amount } = req.body;
    const budget = await Budget.findOneAndUpdate(
      { _id: req.params.id, user: new mongoose.Types.ObjectId(req.userId) },
      { $set: { amount } },
      { new: true, runValidators: true }
    ).populate('category');
    if (!budget) return res.status(404).json({ success: false, message: 'Budget not found' });
    res.json({ success: true, data: { budget } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete budget
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const budget = await Budget.findOneAndDelete({ _id: req.params.id, user: new mongoose.Types.ObjectId(req.userId) });
    if (!budget) return res.status(404).json({ success: false, message: 'Budget not found' });
    res.json({ success: true, message: 'Budget deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
