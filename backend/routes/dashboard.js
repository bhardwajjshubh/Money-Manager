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

const firstTotal = (rows) => rows?.[0]?.total || 0;
const DASHBOARD_CACHE_TTL_MS = 15000;
const dashboardCache = new Map();
const buildDashboardCacheKey = (userId, query) => JSON.stringify({
  userId: String(userId),
  month: query.month || '',
  year: query.year || '',
  incomeMonth: query.incomeMonth || '',
  incomeYear: query.incomeYear || ''
});

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
    const cacheKey = buildDashboardCacheKey(userId, req.query);
    const cachedDashboard = dashboardCache.get(cacheKey);

    if (cachedDashboard && cachedDashboard.expiresAt > Date.now() && req.query.refresh !== '1') {
      res.set('Cache-Control', 'private, max-age=15');
      return res.json(cachedDashboard.payload);
    }

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const incomePromise = (async () => {
      console.time('dashboard-income-aggregate');
      try {
          return await Income.aggregate([
        { $match: { user: userId } },
        {
          $facet: {
            totals: [
              { $group: { _id: null, total: { $sum: '$amount' } } }
            ],
            selected: [
              { $match: { date: { $gte: startDate, $lt: endDate } } },
              { $group: { _id: null, total: { $sum: '$amount' } } }
            ],
            previous: [
              { $match: { date: { $gte: previousRange.startDate, $lt: previousRange.endDate } } },
              { $group: { _id: null, total: { $sum: '$amount' } } }
            ],
            categoryIncome: [
              { $match: { date: { $gte: incomeStartDate, $lt: incomeEndDate } } },
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
            ],
            monthlyTrend: [
              { $match: { date: { $gte: sixMonthsAgo } } },
              {
                $group: {
                  _id: { year: { $year: '$date' }, month: { $month: '$date' } },
                  total: { $sum: '$amount' }
                }
              },
              { $sort: { '_id.year': 1, '_id.month': 1 } }
            ]
          }
        }
      ]);
      } finally {
        console.timeEnd('dashboard-income-aggregate');
      }
    })();

    const expensePromise = (async () => {
      console.time('dashboard-expense-aggregate');
      try {
        return await Expense.aggregate([
        { $match: { user: userId } },
        {
          $facet: {
            totals: [
              { $group: { _id: null, total: { $sum: '$amount' } } }
            ],
            selected: [
              { $match: { date: { $gte: startDate, $lt: endDate } } },
              { $group: { _id: null, total: { $sum: '$amount' } } }
            ],
            previous: [
              { $match: { date: { $gte: previousRange.startDate, $lt: previousRange.endDate } } },
              { $group: { _id: null, total: { $sum: '$amount' } } }
            ],
            categoryExpenses: [
              { $match: { date: { $gte: startDate, $lt: endDate } } },
              { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
              { $sort: { total: -1 } },
              { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
              { $unwind: '$category' }
            ],
            previousCategoryExpenses: [
              { $match: { date: { $gte: previousRange.startDate, $lt: previousRange.endDate } } },
              { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
              { $sort: { total: -1 } },
              { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
              { $unwind: '$category' }
            ],
            monthlyTrend: [
              { $match: { date: { $gte: sixMonthsAgo } } },
              {
                $group: {
                  _id: { year: { $year: '$date' }, month: { $month: '$date' } },
                  total: { $sum: '$amount' }
                }
              },
              { $sort: { '_id.year': 1, '_id.month': 1 } }
            ]
          }
        }
      ]);
      } finally {
        console.timeEnd('dashboard-expense-aggregate');
      }
    })();

    const loanPromise = (async () => {
      console.time('dashboard-loan-aggregate');
      try {
        return await Loan.aggregate([
        { $match: { user: userId, remainingAmount: { $gt: 0 } } },
        {
          $facet: {
            lentTotal: [
              { $match: { type: 'lent' } },
              { $group: { _id: null, total: { $sum: '$remainingAmount' } } }
            ],
            moneyToReceiveLoans: [
              { $match: { type: 'lent' } },
              { $sort: { remainingAmount: -1, createdAt: -1 } },
              { $project: loanSummaryProjection }
            ],
            borrowedTotal: [
              { $match: { type: 'borrowed' } },
              { $group: { _id: null, total: { $sum: '$remainingAmount' } } }
            ],
            moneyToPayLoans: [
              { $match: { type: 'borrowed' } },
              { $sort: { remainingAmount: -1, createdAt: -1 } },
              { $project: loanSummaryProjection }
            ]
          }
        }
      ]);
      } finally {
        console.timeEnd('dashboard-loan-aggregate');
      }
    })();

    const budgetsPromise = (async () => {
      console.time('dashboard-budgets-find');
      try {
        return await Budget.find({
          user: userId,
          month: selectedMonth,
          year: selectedYear
        }).populate('category', 'name color type').lean();
      } finally {
        console.timeEnd('dashboard-budgets-find');
      }
    })();

    const [
      incomeStats,
      expenseStats,
      loanStats,
      budgets,
    ] = await Promise.all([
      incomePromise,
      expensePromise,
      loanPromise,
      budgetsPromise,
    ]);

    const totalIncome = firstTotal(incomeStats?.[0]?.totals);
    const totalExpenses = firstTotal(expenseStats?.[0]?.totals);
    const moneyToReceive = firstTotal(loanStats?.[0]?.lentTotal);
    const moneyToPay = firstTotal(loanStats?.[0]?.borrowedTotal);
    const moneyToReceiveLoans = loanStats?.[0]?.moneyToReceiveLoans || [];
    const moneyToPayLoans = loanStats?.[0]?.moneyToPayLoans || [];
    const currentBalance = totalIncome - totalExpenses;
    const totalSavings = totalIncome - totalExpenses;

    const selectedIncomeTotal = firstTotal(incomeStats?.[0]?.selected);
    const selectedExpenseTotal = firstTotal(expenseStats?.[0]?.selected);
    const previousIncomeTotal = firstTotal(incomeStats?.[0]?.previous);
    const previousExpenseTotal = firstTotal(expenseStats?.[0]?.previous);

    const selectedSavings = selectedIncomeTotal - selectedExpenseTotal;
    const previousSavings = previousIncomeTotal - previousExpenseTotal;

    const categoryExpenses = expenseStats?.[0]?.categoryExpenses || [];
    const categoryIncome = incomeStats?.[0]?.categoryIncome || [];
    const previousCategoryExpenses = expenseStats?.[0]?.previousCategoryExpenses || [];
    const monthlyIncome = incomeStats?.[0]?.monthlyTrend || [];
    const monthlyExpense = expenseStats?.[0]?.monthlyTrend || [];

    const budgetSpentMap = new Map(categoryExpenses.map((entry) => [String(entry._id), entry.total || 0]));
    const budgetUsage = budgets.map((budget) => {
      const spentAmount = budgetSpentMap.get(String(budget.category?._id)) || 0;
      const remaining = budget.amount - spentAmount;
      const percentage = budget.amount > 0 ? Math.round((spentAmount / budget.amount) * 100) : 0;

      return {
        budget,
        spent: spentAmount,
        remaining,
        percentage,
        exceeded: spentAmount > budget.amount
      };
    });
    
    const responsePayload = {
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
    };

    dashboardCache.set(cacheKey, {
      expiresAt: Date.now() + DASHBOARD_CACHE_TTL_MS,
      payload: responsePayload
    });

    res.set('Cache-Control', 'private, max-age=15');
    return res.json(responsePayload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
