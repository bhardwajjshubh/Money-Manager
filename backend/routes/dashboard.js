const express = require('express');
const mongoose = require('mongoose');
const authenticate = require('../middleware/auth');
const Income = require('../models/Income');
const Expense = require('../models/Expense');
const Loan = require('../models/Loan');

const router = express.Router();

// Get dashboard overview
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    
    // Total income
    const incomeResult = await Income.aggregate([
      { $match: { user: userId } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalIncome = incomeResult[0]?.total || 0;
    
    // Total expenses
    const expenseResult = await Expense.aggregate([
      { $match: { user: userId } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalExpenses = expenseResult[0]?.total || 0;
    
    // Money to receive (lent)
    const lentResult = await Loan.aggregate([
      { $match: { user: userId, type: 'lent', status: { $in: ['open', 'partial', 'overdue'] } } },
      { $group: { _id: null, total: { $sum: '$remainingAmount' } } }
    ]);
    const moneyToReceive = lentResult[0]?.total || 0;
    
    // Money to pay (borrowed)
    const borrowedResult = await Loan.aggregate([
      { $match: { user: userId, type: 'borrowed', status: { $in: ['open', 'partial', 'overdue'] } } },
      { $group: { _id: null, total: { $sum: '$remainingAmount' } } }
    ]);
    const moneyToPay = borrowedResult[0]?.total || 0;
    
    const currentBalance = totalIncome - totalExpenses - moneyToReceive + moneyToPay;
    const totalSavings = totalIncome - totalExpenses;
    
    // Category-wise expenses (top 5)
    const categoryExpenses = await Expense.aggregate([
      { $match: { user: userId } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
      { $unwind: '$category' }
    ]);
    
    // Monthly trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyIncome = await Income.aggregate([
      { $match: { user: userId, date: { $gte: sixMonthsAgo } } },
      { $group: {
        _id: { year: { $year: '$date' }, month: { $month: '$date' } },
        total: { $sum: '$amount' }
      }},
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    const monthlyExpense = await Expense.aggregate([
      { $match: { user: userId, date: { $gte: sixMonthsAgo } } },
      { $group: {
        _id: { year: { $year: '$date' }, month: { $month: '$date' } },
        total: { $sum: '$amount' }
      }},
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    res.json({
      success: true,
      data: {
        currentBalance,
        totalIncome,
        totalExpenses,
        totalSavings,
        moneyToReceive,
        moneyToPay,
        categoryExpenses,
        monthlyTrend: {
          income: monthlyIncome,
          expenses: monthlyExpense
        }
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
