import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import LoadingState from '../components/LoadingState';
import { useDataRefresh } from '../context/DataContext';

const monthOptions = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' }
];

const currentDate = new Date();
const defaultMonth = String(currentDate.getMonth() + 1);
const defaultYear = String(currentDate.getFullYear());

const yearOptions = Array.from({ length: 10 }, (_, index) => String(currentDate.getFullYear() - index));

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { refreshTrigger } = useDataRefresh();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [selectedYear, setSelectedYear] = useState(defaultYear);
  const [selectedIncomeMonth, setSelectedIncomeMonth] = useState(defaultMonth);
  const [selectedIncomeYear, setSelectedIncomeYear] = useState(defaultYear);

  useEffect(() => {
    fetchDashboard(selectedMonth, selectedYear, selectedIncomeMonth, selectedIncomeYear);
  }, [refreshTrigger, selectedMonth, selectedYear, selectedIncomeMonth, selectedIncomeYear]);

  const fetchDashboard = async (
    month = selectedMonth,
    year = selectedYear,
    incomeMonth = selectedIncomeMonth,
    incomeYear = selectedIncomeYear
  ) => {
    try {
      const query = new URLSearchParams();
      if (month) query.set('month', month);
      if (year) query.set('year', year);
      if (incomeMonth) query.set('incomeMonth', incomeMonth);
      if (incomeYear) query.set('incomeYear', incomeYear);

      const { data: response } = await api.get(`/dashboard?${query.toString()}`);
      setData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading dashboard" />;
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: user?.currency || 'INR' }).format(amount);
  };

  const selectedPeriodLabel = `${monthOptions.find((month) => month.value === selectedMonth)?.label || 'Month'} ${selectedYear}`;
  const selectedIncomePeriodLabel = `${monthOptions.find((month) => month.value === selectedIncomeMonth)?.label || 'Month'} ${selectedIncomeYear}`;

  const navigateToLoans = (hash = '#loan-section') => {
    navigate(`/loans${hash}`);
  };

  const navigateToCategoryExpenses = (categoryId) => {
    const query = new URLSearchParams();

    if (selectedMonth) query.set('month', selectedMonth);
    if (selectedYear) query.set('year', selectedYear);
    if (categoryId) query.set('category', categoryId);

    navigate(`/expenses?${query.toString()}`);
  };

  const navigateToSourceIncome = (source) => {
    const query = new URLSearchParams();

    if (selectedIncomeMonth) query.set('month', selectedIncomeMonth);
    if (selectedIncomeYear) query.set('year', selectedIncomeYear);
    if (source) query.set('source', source);

    navigate(`/income?${query.toString()}`);
  };

  const topCategories = data?.categoryExpenses || [];
  const topIncomeCategories = data?.categoryIncome || [];
  const previousCategories = data?.previousCategoryExpenses || [];
  const totalSelectedExpense = topCategories.reduce((sum, item) => sum + (item.total || 0), 0);
  const totalSelectedIncome = topIncomeCategories.reduce((sum, item) => sum + (item.total || 0), 0);
  const currentPeriod = data?.selectedPeriod || { income: 0, expense: 0, savings: 0 };
  const previousPeriod = data?.previousPeriod || { income: 0, expense: 0, savings: 0 };
  const budgetUsage = data?.budgetUsage || [];

  const categoryColorPalette = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  const topCategory = topCategories[0];
  const previousTopCategory = previousCategories.find((category) => category._id === topCategory?._id);
  const topCategoryChange = topCategory && previousTopCategory
    ? topCategory.total - (previousTopCategory.total || 0)
    : null;

  const savingsChange = currentPeriod.savings - previousPeriod.savings;
  const overspentBudget = budgetUsage.find((item) => item.exceeded);
  const totalIncomeChange = currentPeriod.income - previousPeriod.income;

  const smartInsights = [
    topCategory ? {
      tone: topCategoryChange >= 0 ? 'positive' : 'warning',
      icon: topCategoryChange >= 0 ? '↑' : '↓',
      text: topCategoryChange === null
        ? `Top spending category this month is ${topCategory.category?.name || 'Uncategorized'} with ${formatCurrency(topCategory.total || 0)}.`
        : `You spent ${Math.abs(Math.round((topCategoryChange / Math.max(previousTopCategory?.total || topCategory.total || 1, 1)) * 100))}% ${topCategoryChange >= 0 ? 'more' : 'less'} on ${topCategory.category?.name || 'Uncategorized'} than last month.`
    } : null,
    {
      tone: savingsChange >= 0 ? 'positive' : 'warning',
      icon: savingsChange >= 0 ? '↑' : '↓',
      text: savingsChange === 0
        ? `Your savings stayed flat at ${formatCurrency(currentPeriod.savings || 0)} this month.`
        : `Your savings ${savingsChange >= 0 ? 'increased' : 'decreased'} by ${formatCurrency(Math.abs(savingsChange))} compared to last month.`
    },
    overspentBudget ? {
      tone: 'alert',
      icon: '!',
      text: `${overspentBudget.budget.category?.name || 'A category'} expenses are exceeding your budget by ${formatCurrency(overspentBudget.spent - overspentBudget.budget.amount)}.`
    } : {
      tone: 'positive',
      icon: '✓',
      text: 'No categories are over budget for the selected month.'
    },
    {
      tone: totalIncomeChange >= 0 ? 'positive' : 'warning',
      icon: totalIncomeChange >= 0 ? '↑' : '↓',
      text: totalIncomeChange === 0
        ? 'Your income is steady compared to last month.'
        : `Your income ${totalIncomeChange >= 0 ? 'grew' : 'dropped'} by ${formatCurrency(Math.abs(totalIncomeChange))} compared to last month.`
    }
  ].filter(Boolean);

  const LoanSummaryCard = ({ title, amount, loans, tone, emptyMessage }) => {
    return (
      <div className="group relative overflow-visible rounded-lg bg-white shadow transition-all duration-300 hover:shadow-lg dark:bg-slate-900 dark:shadow-black/20">
        <button
          type="button"
          onClick={() => navigateToLoans()}
          className="block w-full text-left p-5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-slate-400">{title}</p>
              <p className={`mt-2 text-2xl font-bold ${tone}`}>{formatCurrency(amount)}</p>
            </div>
            <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
              View loans
            </div>
          </div>
        </button>

        <div className="pointer-events-none absolute left-0 right-0 top-full z-20 hidden pt-3 group-hover:block group-focus-within:block">
          <div className="mx-2 rounded-xl border border-gray-100 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-slate-950">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{title} details</p>
              <span className="text-xs text-gray-500 dark:text-slate-400">{loans.length} {loans.length === 1 ? 'person' : 'people'}</span>
            </div>

            <div className="max-h-60 space-y-2 overflow-auto pr-1">
              {loans.length > 0 ? loans.map((loan) => (
                <button
                  key={loan._id}
                  type="button"
                  onClick={() => navigateToLoans()}
                  className="pointer-events-auto flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors hover:bg-gray-50 dark:hover:bg-slate-800"
                >
                  <span className="truncate text-sm font-medium text-gray-800 dark:text-slate-100">{loan.personName}</span>
                  <span className="ml-3 shrink-0 text-sm font-semibold text-gray-900 dark:text-slate-100">{formatCurrency(loan.remainingAmount || 0)}</span>
                </button>
              )) : (
                <p className="text-sm text-gray-500 dark:text-slate-400">{emptyMessage}</p>
              )}
            </div>

            <p className="mt-3 text-xs text-gray-500 dark:text-slate-400">Click any row to open the loans page.</p>
          </div>
        </div>
      </div>
    );
  };

  const SmartInsightCard = ({ tone, icon, text }) => {
    const toneStyles = {
      positive: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
      warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
      alert: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
    };

    return (
      <div className="flex items-start gap-3 rounded-xl bg-white/70 p-4 shadow-sm ring-1 ring-gray-100 dark:bg-slate-900 dark:ring-slate-800">
        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${toneStyles[tone] || toneStyles.positive}`}>
          {icon}
        </div>
        <p className="text-sm leading-6 text-gray-700 dark:text-slate-200">{text}</p>
      </div>
    );
  };

  const monthlyTrendData = data?.monthlyTrend?.income.map((inc, idx) => ({
    month: `${inc._id.month}/${inc._id.year}`,
    income: inc.total,
    expense: data.monthlyTrend.expenses[idx]?.total || 0
  })) || [];

  const selectedCategoryExpenseCount = topCategories.length;
  const selectedCategoryIncomeCount = topIncomeCategories.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchDashboard(selectedMonth, selectedYear, selectedIncomeMonth, selectedIncomeYear)}
            className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 shadow"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="rounded-md bg-blue-500 p-3">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Current Balance</dt>
                  <dd className="text-lg font-semibold text-gray-900">{formatCurrency(data?.currentBalance || 0)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="rounded-md bg-green-500 p-3">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Income</dt>
                  <dd className="text-lg font-semibold text-gray-900">{formatCurrency(data?.totalIncome || 0)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="rounded-md bg-red-500 p-3">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Expenses</dt>
                  <dd className="text-lg font-semibold text-gray-900">{formatCurrency(data?.totalExpenses || 0)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="rounded-md bg-purple-500 p-3">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Savings</dt>
                  <dd className="text-lg font-semibold text-gray-900">{formatCurrency(data?.totalSavings || 0)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loans Section */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 mb-8">
        <LoanSummaryCard
          title="Money to Receive"
          amount={data?.moneyToReceive || 0}
          loans={data?.moneyToReceiveLoans || []}
          tone="text-green-600 dark:text-green-400"
          emptyMessage="No pending money to receive"
        />
        <LoanSummaryCard
          title="Money to Pay"
          amount={data?.moneyToPay || 0}
          loans={data?.moneyToPayLoans || []}
          tone="text-red-600 dark:text-red-400"
          emptyMessage="No pending money to pay"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 mb-8">
        {/* Top Spending Categories */}
        <div className="rounded-lg border border-gray-100 bg-white p-5 shadow transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">Top Spending Categories</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400">{selectedPeriodLabel}</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                {monthOptions.map((month) => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">{formatCurrency(totalSelectedExpense)}</p>
              <p className="text-sm text-gray-500 dark:text-slate-400">Total expenses in {selectedPeriodLabel}</p>
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">{selectedCategoryExpenseCount} {selectedCategoryExpenseCount === 1 ? 'category' : 'categories'}</p>
          </div>

          <div className="max-h-[24rem] space-y-4 overflow-y-auto pr-2">
            {topCategories.length > 0 ? topCategories.map((item, index) => {
              const categoryName = item.category?.name || 'Uncategorized';
              const percent = totalSelectedExpense > 0 ? Math.round((item.total / totalSelectedExpense) * 100) : 0;
              const barColor = categoryColorPalette[index % categoryColorPalette.length];

              return (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => navigateToCategoryExpenses(item.category?._id)}
                  className="w-full space-y-2 text-left transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:ring-offset-2 focus:ring-offset-transparent"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-sm font-semibold text-gray-500 dark:text-slate-400">{index + 1}</span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-md text-white" style={{ backgroundColor: barColor }}>
                      <span className="text-xs font-bold">{categoryName.slice(0, 1).toUpperCase()}</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-slate-100">{categoryName}</p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-gray-900 dark:text-slate-100">{formatCurrency(item.total || 0)}</p>
                    <p className="w-12 text-right text-sm font-semibold text-gray-600 dark:text-slate-300">{percent}%</p>
                  </div>
                  <div className="ml-9 h-2 rounded-full bg-gray-100 dark:bg-slate-800">
                    <div
                      className="h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(percent, 4)}%`, backgroundColor: barColor }}
                    />
                  </div>
                </button>
              );
            }) : (
              <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center dark:border-slate-700">
                <p className="text-sm text-gray-500 dark:text-slate-400">No expenses recorded for this period.</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Income Categories */}
        <div className="rounded-lg border border-gray-100 bg-white p-5 shadow transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">Top Income Categories</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400">{selectedIncomePeriodLabel}</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedIncomeMonth}
                onChange={(e) => setSelectedIncomeMonth(e.target.value)}
                className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                {monthOptions.map((month) => (
                  <option key={`income-month-${month.value}`} value={month.value}>{month.label}</option>
                ))}
              </select>
              <select
                value={selectedIncomeYear}
                onChange={(e) => setSelectedIncomeYear(e.target.value)}
                className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                {yearOptions.map((year) => (
                  <option key={`income-year-${year}`} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">{formatCurrency(totalSelectedIncome)}</p>
              <p className="text-sm text-gray-500 dark:text-slate-400">Total income in {selectedIncomePeriodLabel}</p>
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">{selectedCategoryIncomeCount} {selectedCategoryIncomeCount === 1 ? 'category' : 'categories'}</p>
          </div>

          <div className="max-h-[24rem] space-y-4 overflow-y-auto pr-2">
            {topIncomeCategories.length > 0 ? topIncomeCategories.map((item, index) => {
              const incomeSource = item.source || 'Other';
              const percent = totalSelectedIncome > 0 ? Math.round((item.total / totalSelectedIncome) * 100) : 0;
              const barColor = categoryColorPalette[index % categoryColorPalette.length];

              return (
                <button
                  key={`${item._id}-${index}`}
                  type="button"
                  onClick={() => navigateToSourceIncome(incomeSource)}
                  className="w-full space-y-2 text-left transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:ring-offset-2 focus:ring-offset-transparent"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-sm font-semibold text-gray-500 dark:text-slate-400">{index + 1}</span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-md text-white" style={{ backgroundColor: barColor }}>
                      <span className="text-xs font-bold">{incomeSource.slice(0, 1).toUpperCase()}</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-slate-100">{incomeSource}</p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-gray-900 dark:text-slate-100">{formatCurrency(item.total || 0)}</p>
                    <p className="w-12 text-right text-sm font-semibold text-gray-600 dark:text-slate-300">{percent}%</p>
                  </div>
                  <div className="ml-9 h-2 rounded-full bg-gray-100 dark:bg-slate-800">
                    <div
                      className="h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(percent, 4)}%`, backgroundColor: barColor }}
                    />
                  </div>
                </button>
              );
            }) : (
              <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center dark:border-slate-700">
                <p className="text-sm text-gray-500 dark:text-slate-400">No income recorded for this period.</p>
              </div>
            )}
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="bg-white shadow rounded-lg p-5 lg:col-span-2">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Income vs Expenses (6 Months)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} />
              <Line type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Smart Insights */}
      <div className="mb-8 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300">
            <span className="text-lg">💡</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Smart Insights</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400">Quick observations for {selectedPeriodLabel}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {smartInsights.map((insight, index) => (
            <SmartInsightCard key={`insight-${index}`} {...insight} />
          ))}
        </div>
      </div>
    </div>
  );
}
