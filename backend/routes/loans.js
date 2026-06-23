const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const authenticate = require('../middleware/auth');
const Loan = require('../models/Loan');

const router = express.Router();

const normalizeLoanFinancials = (loan) => {
  const totalAmount = Number(loan.totalAmount) || 0;
  const paidAmount = (loan.payments || []).reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  const remainingAmount = totalAmount - paidAmount;

  let status = 'open';
  if (remainingAmount <= 0) {
    status = 'paid';
  } else if (paidAmount > 0) {
    status = 'partial';
  } else if (loan.dueDate && loan.dueDate < new Date()) {
    status = 'overdue';
  }

  return { paidAmount, remainingAmount, status };
};

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

    await Promise.all(loans.map(async (loan) => {
      const normalized = normalizeLoanFinancials(loan);
      if (
        Number(loan.paidAmount) !== normalized.paidAmount ||
        Number(loan.remainingAmount) !== normalized.remainingAmount ||
        loan.status !== normalized.status
      ) {
        loan.paidAmount = normalized.paidAmount;
        loan.remainingAmount = normalized.remainingAmount;
        loan.status = normalized.status;
        await loan.save();
      }
    }));
    
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
  (req, res, next) => {
    if (req.body?.dueDate === '') delete req.body.dueDate;
    if (req.body?.notes === '') delete req.body.notes;
    next();
  },
  body('personName').isLength({ min: 1 }).trim(),
  body('type').isIn(['lent', 'borrowed']),
  body('totalAmount').isFloat({ min: 0 }).toFloat(),
  body('dueDate').optional({ nullable: true, checkFalsy: true }).isISO8601(),
  body('notes').optional({ nullable: true, checkFalsy: true }).trim(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    
    try {
      const { personName, type, totalAmount, dueDate, notes } = req.body;
      const normalizedTotalAmount = Number(totalAmount);
      const loan = await Loan.create({
        user: new mongoose.Types.ObjectId(req.userId),
        personName,
        type,
        totalAmount: normalizedTotalAmount,
        remainingAmount: normalizedTotalAmount,
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
  body('amount').isFloat({ min: 0 }).toFloat(),
  body('date').optional().isISO8601(),
  body('note').optional().trim(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    
    try {
      const { amount, date, note } = req.body;
      const normalizedAmount = Number(amount);
      const loan = await Loan.findOne({ _id: req.params.id, user: new mongoose.Types.ObjectId(req.userId) });
      if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });
      
      loan.payments.push({ amount: normalizedAmount, date: date || new Date(), note });
      loan.paidAmount = loan.payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
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

    const normalized = normalizeLoanFinancials(loan);
    if (
      Number(loan.paidAmount) !== normalized.paidAmount ||
      Number(loan.remainingAmount) !== normalized.remainingAmount ||
      loan.status !== normalized.status
    ) {
      loan.paidAmount = normalized.paidAmount;
      loan.remainingAmount = normalized.remainingAmount;
      loan.status = normalized.status;
      await loan.save();
    }

    res.json({ success: true, data: { loan } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update loan
router.patch('/:id',
  authenticate,
  (req, res, next) => {
    if (req.body?.dueDate === '') delete req.body.dueDate;
    if (req.body?.notes === '') delete req.body.notes;
    next();
  },
  async (req, res) => {
  try {
    const { personName, totalAmount, dueDate, notes } = req.body;
    const normalizedTotalAmount = Number(totalAmount);
    const loan = await Loan.findOneAndUpdate(
      { _id: req.params.id, user: new mongoose.Types.ObjectId(req.userId) },
      { $set: { personName, totalAmount: normalizedTotalAmount, dueDate, notes } },
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
