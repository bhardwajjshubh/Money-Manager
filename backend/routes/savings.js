const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const authenticate = require('../middleware/auth');
const SavingsGoal = require('../models/SavingsGoal');

const router = express.Router();

// Get all savings goals
router.get('/', authenticate, async (req, res) => {
  try {
      const goals = await SavingsGoal.find({ user: new mongoose.Types.ObjectId(req.userId) }).sort({ createdAt: -1 });
    res.json({ success: true, data: { goals } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create savings goal
router.post('/',
  authenticate,
  body('name').isLength({ min: 1 }).trim(),
  body('targetAmount').isFloat({ min: 0 }),
  body('savedAmount').optional().isFloat({ min: 0 }),
  body('deadline').optional().isISO8601(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    
    try {
      const { name, targetAmount, savedAmount, deadline } = req.body;
      const goal = await SavingsGoal.create({
        user: new mongoose.Types.ObjectId(req.userId),
        name,
        targetAmount,
        savedAmount: savedAmount || 0,
        deadline
      });
      res.status(201).json({ success: true, data: { goal } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// Get single goal
router.get('/:id', authenticate, async (req, res) => {
  try {
    const goal = await SavingsGoal.findOne({ _id: req.params.id, user: new mongoose.Types.ObjectId(req.userId) });
    if (!goal) return res.status(404).json({ success: false, message: 'Savings goal not found' });
    res.json({ success: true, data: { goal } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update savings goal
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { name, targetAmount, savedAmount, deadline } = req.body;
    const goal = await SavingsGoal.findOneAndUpdate(
      { _id: req.params.id, user: new mongoose.Types.ObjectId(req.userId) },
      { $set: { name, targetAmount, savedAmount, deadline } },
      { new: true, runValidators: true }
    );
    if (!goal) return res.status(404).json({ success: false, message: 'Savings goal not found' });
    res.json({ success: true, data: { goal } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete savings goal
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const goal = await SavingsGoal.findOneAndDelete({ _id: req.params.id, user: new mongoose.Types.ObjectId(req.userId) });
    if (!goal) return res.status(404).json({ success: false, message: 'Savings goal not found' });
    res.json({ success: true, message: 'Savings goal deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
