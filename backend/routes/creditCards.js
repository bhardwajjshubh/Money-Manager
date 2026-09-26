const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const authenticate = require('../middleware/auth');
const CreditCard = require('../models/CreditCard');
const CreditCardTransaction = require('../models/CreditCardTransaction');
const CreditCardStatement = require('../models/CreditCardStatement');
const CreditCardPayment = require('../models/CreditCardPayment');
const Expense = require('../models/Expense');
const Category = require('../models/Category');

const router = express.Router();

const objectId = (value) => new mongoose.Types.ObjectId(value);
const transactionSign = (type) => type === 'refund' ? -1 : 1;

const findCard = (id, userId) => CreditCard.findOne({ _id: id, user: objectId(userId) });

const refreshStatementStatus = async (statementId) => {
  const statement = await CreditCardStatement.findById(statementId);
  if (!statement) return null;
  const amountPaid = await CreditCardPayment.aggregate([
    { $match: { statement: statement._id } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  statement.amountPaid = amountPaid[0]?.total || 0;
  if (statement.amountPaid >= statement.totalAmount) statement.status = 'paid';
  else if (statement.amountPaid > 0) statement.status = 'partially-paid';
  else if (statement.dueDate < new Date()) statement.status = 'overdue';
  else statement.status = 'unpaid';
  await statement.save();
  return statement;
};

const buildCardSummary = async (userId) => {
  const user = objectId(userId);
  const cards = await CreditCard.find({ user }).sort({ createdAt: -1 }).lean();
  const [transactions, payments, statements] = await Promise.all([
    CreditCardTransaction.aggregate([
      { $match: { user } },
      { $group: { _id: '$creditCard', balance: { $sum: { $multiply: ['$amount', { $cond: [{ $eq: ['$transactionType', 'refund'] }, -1, 1] }] } } } }
    ]),
    CreditCardPayment.aggregate([
      { $match: { user } },
      { $group: { _id: '$creditCard', paid: { $sum: '$amount' } } }
    ]),
    CreditCardStatement.find({ user, status: { $in: ['unpaid', 'partially-paid', 'overdue'] } }).sort({ dueDate: 1 }).lean()
  ]);
  const transactionMap = new Map(transactions.map((row) => [String(row._id), row.balance || 0]));
  const paymentMap = new Map(payments.map((row) => [String(row._id), row.paid || 0]));
  const cardSummaries = cards.map((card) => {
    const grossBalance = transactionMap.get(String(card._id)) || 0;
    const paid = paymentMap.get(String(card._id)) || 0;
    const outstandingBalance = Math.max(0, grossBalance - paid);
    const availableCredit = Math.max(0, card.creditLimit - outstandingBalance);
    return {
      ...card,
      outstandingBalance,
      availableCredit,
      utilization: card.creditLimit > 0 ? Math.min(100, (outstandingBalance / card.creditLimit) * 100) : 0,
      nextStatementDate: null,
      nextPaymentDueDate: null,
      upcomingBillAmount: 0
    };
  });
  const activeCards = cardSummaries.filter((card) => card.status === 'active');
  const upcomingStatements = statements.filter((statement) => statement.dueDate >= new Date());
  const nextStatement = upcomingStatements[0];
  const cardById = new Map(cardSummaries.map((card) => [String(card._id), card]));
  upcomingStatements.forEach((statement) => {
    const card = cardById.get(String(statement.creditCard));
    if (!card) return;
    if (!card.nextPaymentDueDate || statement.dueDate < card.nextPaymentDueDate) {
      card.nextPaymentDueDate = statement.dueDate;
      card.upcomingBillAmount = Math.max(0, statement.totalAmount - statement.amountPaid);
    }
  });
  const totalOutstandingBalance = activeCards.reduce((sum, card) => sum + card.outstandingBalance, 0);
  const totalCreditLimit = activeCards.reduce((sum, card) => sum + card.creditLimit, 0);
  const unpaidBills = statements.filter((statement) => statement.status !== 'paid').length;
  const upcomingBill = nextStatement ? Math.max(0, nextStatement.totalAmount - nextStatement.amountPaid) : 0;
  return {
    cards: cardSummaries,
    totals: {
      totalCreditLimit,
      totalOutstandingBalance,
      availableCredit: Math.max(0, totalCreditLimit - totalOutstandingBalance),
      utilization: totalCreditLimit > 0 ? Math.min(100, (totalOutstandingBalance / totalCreditLimit) * 100) : 0,
      unpaidBills,
      upcomingBillAmount: upcomingBill,
      nextPaymentDueDate: nextStatement?.dueDate || null
    }
  };
};

const validateRequest = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return false;
  }
  return true;
};

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    res.json({ success: true, data: await buildCardSummary(req.userId) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Unable to load credit cards' });
  }
});

router.post('/',
  body('cardName').trim().isLength({ min: 1, max: 100 }),
  body('bankName').trim().isLength({ min: 1, max: 100 }),
  body('lastFourDigits').matches(/^\d{4}$/),
  body('creditLimit').isFloat({ min: 0 }),
  body('statementDay').isInt({ min: 1, max: 28 }),
  body('paymentDueDay').isInt({ min: 1, max: 31 }),
  body('notes').optional().trim().isLength({ max: 500 }),
  body('status').optional().isIn(['active', 'inactive']),
  async (req, res) => {
    if (!validateRequest(req, res)) return;
    try {
      const card = await CreditCard.create({ ...req.body, user: objectId(req.userId) });
      res.status(201).json({ success: true, data: { card } });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Unable to create credit card' });
    }
  }
);

router.patch('/:id', async (req, res) => {
  try {
    const allowed = ['cardName', 'bankName', 'lastFourDigits', 'creditLimit', 'statementDay', 'paymentDueDay', 'notes', 'status'];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    if (updates.lastFourDigits && !/^\d{4}$/.test(updates.lastFourDigits)) return res.status(400).json({ success: false, message: 'Last four digits must contain exactly four numbers' });
    if (updates.creditLimit !== undefined && (!Number.isFinite(Number(updates.creditLimit)) || Number(updates.creditLimit) < 0)) return res.status(400).json({ success: false, message: 'Credit limit must be zero or greater' });
    const card = await CreditCard.findOneAndUpdate({ _id: req.params.id, user: objectId(req.userId) }, { $set: updates }, { new: true, runValidators: true });
    if (!card) return res.status(404).json({ success: false, message: 'Credit card not found' });
    res.json({ success: true, data: { card } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Unable to update credit card' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const card = await findCard(req.params.id, req.userId);
    if (!card) return res.status(404).json({ success: false, message: 'Credit card not found' });
    const linked = await CreditCardTransaction.exists({ creditCard: card._id });
    if (linked) return res.status(409).json({ success: false, message: 'Cards with transactions cannot be deleted. Mark the card inactive instead.' });
    await CreditCardPayment.deleteMany({ creditCard: card._id });
    await CreditCardStatement.deleteMany({ creditCard: card._id });
    await card.deleteOne();
    res.json({ success: true, message: 'Credit card deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Unable to delete credit card' });
  }
});

router.get('/:id/transactions', async (req, res) => {
  try {
    const card = await findCard(req.params.id, req.userId);
    if (!card) return res.status(404).json({ success: false, message: 'Credit card not found' });
    const filter = { user: objectId(req.userId), creditCard: card._id };
    if (req.query.type) filter.transactionType = req.query.type;
    if (req.query.q) filter.description = new RegExp(req.query.q, 'i');
    if (req.query.from || req.query.to) {
      filter.transactionDate = {};
      if (req.query.from) filter.transactionDate.$gte = new Date(req.query.from);
      if (req.query.to) filter.transactionDate.$lte = new Date(req.query.to);
    }
    const transactions = await CreditCardTransaction.find(filter).populate('category', 'name color').sort({ transactionDate: -1 }).limit(200).lean();
    res.json({ success: true, data: { transactions } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Unable to load transactions' });
  }
});

router.post('/:id/transactions',
  body('description').trim().isLength({ min: 1, max: 200 }),
  body('amount').isFloat({ min: 0.01 }),
  body('categoryId').isMongoId(),
  body('transactionDate').isISO8601(),
  body('transactionType').isIn(['purchase', 'refund', 'adjustment']),
  body('notes').optional().trim().isLength({ max: 500 }),
  async (req, res) => {
    if (!validateRequest(req, res)) return;
    try {
      const card = await findCard(req.params.id, req.userId);
      if (!card) return res.status(404).json({ success: false, message: 'Credit card not found' });
      const category = await Category.findOne({ _id: req.body.categoryId, user: objectId(req.userId), type: 'expense' });
      if (!category) return res.status(400).json({ success: false, message: 'Expense category not found' });
      const signedAmount = Number(req.body.amount) * transactionSign(req.body.transactionType);
      const expense = await Expense.create({
        user: objectId(req.userId), amount: signedAmount, category: category._id,
        paymentMethod: 'credit-card', date: req.body.transactionDate, notes: req.body.notes,
        creditCardTransactionType: req.body.transactionType
      });
      const transaction = await CreditCardTransaction.create({
        user: objectId(req.userId), creditCard: card._id, expense: expense._id,
        description: req.body.description, amount: req.body.amount, category: category._id,
        transactionDate: req.body.transactionDate, transactionType: req.body.transactionType, notes: req.body.notes
      });
      expense.creditCardTransaction = transaction._id;
      await expense.save();
      await transaction.populate('category', 'name color');
      res.status(201).json({ success: true, data: { transaction } });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Unable to create transaction' });
    }
  }
);

router.patch('/transactions/:transactionId', async (req, res) => {
  try {
    const transaction = await CreditCardTransaction.findOne({ _id: req.params.transactionId, user: objectId(req.userId) });
    if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });
    const category = req.body.categoryId ? await Category.findOne({ _id: req.body.categoryId, user: objectId(req.userId), type: 'expense' }) : null;
    if (req.body.categoryId && !category) return res.status(400).json({ success: false, message: 'Expense category not found' });
    const nextType = req.body.transactionType || transaction.transactionType;
    const nextAmount = req.body.amount === undefined ? transaction.amount : Number(req.body.amount);
    if (!Number.isFinite(nextAmount) || nextAmount <= 0 || !['purchase', 'refund', 'adjustment'].includes(nextType)) return res.status(400).json({ success: false, message: 'Invalid transaction amount or type' });
    Object.assign(transaction, {
      description: req.body.description ?? transaction.description, amount: nextAmount,
      category: req.body.categoryId || transaction.category, transactionDate: req.body.transactionDate || transaction.transactionDate,
      transactionType: nextType, notes: req.body.notes ?? transaction.notes
    });
    await transaction.save();
    const expense = await Expense.findOne({ _id: transaction.expense, user: objectId(req.userId) });
    if (expense) {
      expense.amount = nextAmount * transactionSign(nextType);
      expense.category = category?._id || transaction.category;
      expense.date = transaction.transactionDate;
      expense.notes = transaction.notes;
      expense.creditCardTransactionType = nextType;
      await expense.save();
    }
    await transaction.populate('category', 'name color');
    res.json({ success: true, data: { transaction } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Unable to update transaction' });
  }
});

router.delete('/transactions/:transactionId', async (req, res) => {
  try {
    const transaction = await CreditCardTransaction.findOneAndDelete({ _id: req.params.transactionId, user: objectId(req.userId) });
    if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });
    if (transaction.expense) await Expense.deleteOne({ _id: transaction.expense, user: objectId(req.userId) });
    res.json({ success: true, message: 'Transaction deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Unable to delete transaction' });
  }
});

router.get('/:id/statements', async (req, res) => {
  try {
    const statements = await CreditCardStatement.find({ creditCard: req.params.id, user: objectId(req.userId) }).sort({ statementDate: -1 }).lean();
    res.json({ success: true, data: { statements } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to load statements' });
  }
});

router.post('/:id/statements',
  body('billingPeriodStart').isISO8601(), body('billingPeriodEnd').isISO8601(),
  body('statementDate').isISO8601(), body('dueDate').isISO8601(),
  body('minimumAmountDue').optional().isFloat({ min: 0 }),
  async (req, res) => {
    if (!validateRequest(req, res)) return;
    try {
      const card = await findCard(req.params.id, req.userId);
      if (!card) return res.status(404).json({ success: false, message: 'Credit card not found' });
      const start = new Date(req.body.billingPeriodStart);
      const end = new Date(req.body.billingPeriodEnd);
      const transactions = await CreditCardTransaction.find({ user: objectId(req.userId), creditCard: card._id, transactionDate: { $gte: start, $lte: end } }).lean();
      const totalAmount = Math.max(0, transactions.reduce((sum, item) => sum + (item.amount * transactionSign(item.transactionType)), 0));
      const statement = await CreditCardStatement.create({
        user: objectId(req.userId), creditCard: card._id, billingPeriodStart: start, billingPeriodEnd: end,
        statementDate: req.body.statementDate, dueDate: req.body.dueDate, totalAmount,
        minimumAmountDue: req.body.minimumAmountDue === undefined ? Math.min(totalAmount, totalAmount * 0.05) : req.body.minimumAmountDue
      });
      res.status(201).json({ success: true, data: { statement } });
    } catch (error) {
      if (error.code === 11000) return res.status(409).json({ success: false, message: 'A statement already exists for this billing period' });
      console.error(error);
      res.status(500).json({ success: false, message: 'Unable to generate statement' });
    }
  }
);

router.get('/:id/payments', async (req, res) => {
  try {
    const payments = await CreditCardPayment.find({ creditCard: req.params.id, user: objectId(req.userId) }).sort({ paymentDate: -1 }).populate('statement', 'totalAmount amountPaid dueDate').lean();
    res.json({ success: true, data: { payments } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to load payments' });
  }
});

router.post('/:id/payments',
  body('statementId').isMongoId(), body('amount').isFloat({ min: 0.01 }),
  body('paymentDate').isISO8601(), body('paymentMethod').isIn(['bank-transfer', 'upi', 'other']),
  async (req, res) => {
    if (!validateRequest(req, res)) return;
    try {
      const card = await findCard(req.params.id, req.userId);
      const statement = await CreditCardStatement.findOne({ _id: req.body.statementId, creditCard: req.params.id, user: objectId(req.userId) });
      if (!card || !statement) return res.status(404).json({ success: false, message: 'Credit card statement not found' });
      const refreshedStatement = await refreshStatementStatus(statement._id);
      const remaining = Math.max(0, refreshedStatement.totalAmount - refreshedStatement.amountPaid);
      if (Number(req.body.amount) > remaining) return res.status(400).json({ success: false, message: `Payment cannot exceed the remaining amount of ${remaining}` });
      const payment = await CreditCardPayment.create({ ...req.body, statement: statement._id, creditCard: card._id, user: objectId(req.userId) });
      const updatedStatement = await refreshStatementStatus(statement._id);
      res.status(201).json({ success: true, data: { payment, statement: updatedStatement } });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Unable to record payment' });
    }
  }
);

router.patch('/payments/:paymentId', async (req, res) => {
  try {
    const payment = await CreditCardPayment.findOne({ _id: req.params.paymentId, user: objectId(req.userId) });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    Object.assign(payment, { amount: req.body.amount ?? payment.amount, paymentDate: req.body.paymentDate ?? payment.paymentDate, paymentMethod: req.body.paymentMethod ?? payment.paymentMethod, referenceNumber: req.body.referenceNumber ?? payment.referenceNumber, notes: req.body.notes ?? payment.notes });
    if (!Number.isFinite(Number(payment.amount)) || Number(payment.amount) <= 0) return res.status(400).json({ success: false, message: 'Payment amount must be greater than zero' });
    const otherPayments = await CreditCardPayment.aggregate([{ $match: { statement: payment.statement, _id: { $ne: payment._id } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
    const statement = await CreditCardStatement.findById(payment.statement);
    if (Number(payment.amount) + (otherPayments[0]?.total || 0) > statement.totalAmount) return res.status(400).json({ success: false, message: 'Payment exceeds the statement balance' });
    await payment.save();
    await refreshStatementStatus(payment.statement);
    res.json({ success: true, data: { payment } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Unable to update payment' });
  }
});

router.delete('/payments/:paymentId', async (req, res) => {
  try {
    const payment = await CreditCardPayment.findOneAndDelete({ _id: req.params.paymentId, user: objectId(req.userId) });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    await refreshStatementStatus(payment.statement);
    res.json({ success: true, message: 'Payment deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to delete payment' });
  }
});

module.exports = router;