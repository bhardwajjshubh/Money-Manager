const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const authenticate = require('../middleware/auth');
const Loan = require('../models/Loan');

const router = express.Router();

// Get all loans
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, type, personName, page = 1, limit = 20 } = req.query;
    const filter = { user: new mongoose.Types.ObjectId(req.userId) };
    
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (personName) filter.personName = new RegExp(personName, 'i');
    
    const loans = await Loan.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await Loan.countDocuments(filter);
    
    res.json({ success: true, data: { loans, total, page: parseInt(page), pages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create loan
router.post('/',
  authenticate,
  body('personName').isLength({ min: 1 }).trim(),
  body('type').isIn(['lent', 'borrowed']),
  body('totalAmount').isFloat({ min: 0 }),
  body('dueDate').optional().isISO8601(),
  body('notes').optional().trim(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    
    try {
      const { personName, type, totalAmount, dueDate, notes } = req.body;
      const loan = await Loan.create({
        user: new mongoose.Types.ObjectId(req.userId),
        personName,
        type,
        totalAmount,
        remainingAmount: totalAmount,
        dueDate,
        notes
      });
      res.status(201).json({ success: true, data: { loan } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// Add payment to loan
router.post('/:id/payments',
  authenticate,
  body('amount').isFloat({ min: 0 }),
  body('date').optional().isISO8601(),
  body('note').optional().trim(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    
    try {
      const { amount, date, note } = req.body;
      const loan = await Loan.findOne({ _id: req.params.id, user: new mongoose.Types.ObjectId(req.userId) });
      if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });
      
      loan.payments.push({ amount, date: date || new Date(), note });
      loan.paidAmount += amount;
      await loan.save();
      
      res.json({ success: true, data: { loan } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// Get single loan
router.get('/:id', authenticate, async (req, res) => {
  try {
    const loan = await Loan.findOne({ _id: req.params.id, user: req.userId });
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });
    res.json({ success: true, data: { loan } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update loan
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { personName, totalAmount, dueDate, notes } = req.body;
    const loan = await Loan.findOneAndUpdate(
      { _id: req.params.id, user: new mongoose.Types.ObjectId(req.userId) },
      { $set: { personName, totalAmount, dueDate, notes } },
      { new: true, runValidators: true }
    );
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });
    res.json({ success: true, data: { loan } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete loan
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const loan = await Loan.findOneAndDelete({ _id: req.params.id, user: new mongoose.Types.ObjectId(req.userId) });
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });
    res.json({ success: true, message: 'Loan deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
