const express = require('express');
const mongoose = require('mongoose');
const authenticate = require('../middleware/auth');
const Income = require('../models/Income');
const Expense = require('../models/Expense');
const Loan = require('../models/Loan');
const Budget = require('../models/Budget');

const router = express.Router();

const loanSummaryProjection = {
  personName: 1,
  remainingAmount: 1,
  totalAmount: 1,
  paidAmount: 1,
  dueDate: 1,
  status: 1,
  createdAt: 1
};

const outstandingLoanMatch = (userId, type) => ({
  user: userId,
  type,
  remainingAmount: { $gt: 0 }
});

const buildMonthRange = (monthValue, yearValue) => {
  const month = Number(monthValue) || new Date().getMonth() + 1;
  const year = Number(yearValue) || new Date().getFullYear();
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  return { month, year, startDate, endDate };
};

const buildPreviousMonthRange = (month, year) => {
  const previousDate = new Date(year, month - 1, 1);
  previousDate.setMonth(previousDate.getMonth() - 1);

  return buildMonthRange(previousDate.getMonth() + 1, previousDate.getFullYear());
};

// Get dashboard overview
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const { month: selectedMonth, year: selectedYear, startDate, endDate } = buildMonthRange(req.query.month, req.query.year);
    const {
      month: selectedIncomeMonth,
      year: selectedIncomeYear,
      startDate: incomeStartDate,
      endDate: incomeEndDate
    } = buildMonthRange(req.query.incomeMonth || req.query.month, req.query.incomeYear || req.query.year);
    const previousRange = buildPreviousMonthRange(selectedMonth, selectedYear);
    
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
      { $match: outstandingLoanMatch(userId, 'lent') },
      { $group: { _id: null, total: { $sum: '$remainingAmount' } } }
    ]);
    const moneyToReceive = lentResult[0]?.total || 0;

    const moneyToReceiveLoans = await Loan.find({
      ...outstandingLoanMatch(userId, 'lent')
    })
      .select(loanSummaryProjection)
      .sort({ remainingAmount: -1, createdAt: -1 })
      .lean();
    
    // Money to pay (borrowed)
    const borrowedResult = await Loan.aggregate([
      { $match: outstandingLoanMatch(userId, 'borrowed') },
      { $group: { _id: null, total: { $sum: '$remainingAmount' } } }
    ]);
    const moneyToPay = borrowedResult[0]?.total || 0;

    const moneyToPayLoans = await Loan.find({
      ...outstandingLoanMatch(userId, 'borrowed')
    })
      .select(loanSummaryProjection)
      .sort({ remainingAmount: -1, createdAt: -1 })
      .lean();
    
    // Current balance should reflect only actual income/expenses, not outstanding loans
    const currentBalance = totalIncome - totalExpenses;
    const totalSavings = totalIncome - totalExpenses;
    
    // Category-wise expenses for the selected month/year
    const categoryExpenses = await Expense.aggregate([
      { $match: { user: userId, date: { $gte: startDate, $lt: endDate } } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
      { $unwind: '$category' }
    ]);

    const categoryIncome = await Income.aggregate([
      { $match: { user: userId, date: { $gte: incomeStartDate, $lt: incomeEndDate } } },
      {
        $project: {
          amount: 1,
          sourceLabel: {
            $let: {
              vars: { trimmedSource: { $trim: { input: { $ifNull: ['$source', ''] } } } },
              in: {
                $cond: [
                  { $eq: ['$$trimmedSource', ''] },
                  'Other',
                  '$$trimmedSource'
                ]
              }
            }
          }
        }
      },
      {
        $group: {
          _id: { $toLower: '$sourceLabel' },
          source: { $first: '$sourceLabel' },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]);

    const previousCategoryExpenses = await Expense.aggregate([
      { $match: { user: userId, date: { $gte: previousRange.startDate, $lt: previousRange.endDate } } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
      { $unwind: '$category' }
    ]);

    const selectedIncomeResult = await Income.aggregate([
      { $match: { user: userId, date: { $gte: startDate, $lt: endDate } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const selectedExpenseResult = await Expense.aggregate([
      { $match: { user: userId, date: { $gte: startDate, $lt: endDate } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const previousIncomeResult = await Income.aggregate([
      { $match: { user: userId, date: { $gte: previousRange.startDate, $lt: previousRange.endDate } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const previousExpenseResult = await Expense.aggregate([
      { $match: { user: userId, date: { $gte: previousRange.startDate, $lt: previousRange.endDate } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const selectedIncomeTotal = selectedIncomeResult[0]?.total || 0;
    const selectedExpenseTotal = selectedExpenseResult[0]?.total || 0;
    const previousIncomeTotal = previousIncomeResult[0]?.total || 0;
    const previousExpenseTotal = previousExpenseResult[0]?.total || 0;

    const selectedSavings = selectedIncomeTotal - selectedExpenseTotal;
    const previousSavings = previousIncomeTotal - previousExpenseTotal;

    const budgets = await Budget.find({
      user: userId,
      month: selectedMonth,
      year: selectedYear
    }).populate('category', 'name color type').lean();

    const budgetUsage = await Promise.all(budgets.map(async (budget) => {
      const spent = await Expense.aggregate([
        {
          $match: {
            user: userId,
            category: budget.category._id,
            date: { $gte: startDate, $lt: endDate }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      const spentAmount = spent[0]?.total || 0;
      const remaining = budget.amount - spentAmount;
      const percentage = budget.amount > 0 ? Math.round((spentAmount / budget.amount) * 100) : 0;

      return {
        budget,
        spent: spentAmount,
        remaining,
        percentage,
        exceeded: spentAmount > budget.amount
      };
    }));
    
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
        moneyToReceiveLoans,
        moneyToPayLoans,
        categoryExpenses,
        categoryIncome,
        previousCategoryExpenses,
        selectedPeriod: {
          month: selectedMonth,
          year: selectedYear,
          income: selectedIncomeTotal,
          expense: selectedExpenseTotal,
          savings: selectedSavings
        },
        previousPeriod: {
          month: previousRange.month,
          year: previousRange.year,
          income: previousIncomeTotal,
          expense: previousExpenseTotal,
          savings: previousSavings
        },
        budgetUsage,
        selectedMonth,
        selectedYear,
        selectedIncomeMonth,
        selectedIncomeYear,
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
