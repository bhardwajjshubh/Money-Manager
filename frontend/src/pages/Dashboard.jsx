import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import LoadingState from '../components/LoadingState';
import { useDataRefresh } from '../context/DataContext';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function Dashboard() {
  const { user } = useAuth();
  const { refreshTrigger } = useDataRefresh();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, [refreshTrigger]);

  const fetchDashboard = async () => {
    try {
      const { data: response } = await api.get('/dashboard');
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

  const monthlyTrendData = data?.monthlyTrend?.income.map((inc, idx) => ({
    month: `${inc._id.month}/${inc._id.year}`,
    income: inc.total,
    expense: data.monthlyTrend.expenses[idx]?.total || 0
  })) || [];

  const categoryData = data?.categoryExpenses.map((cat) => ({
    name: cat.category.name,
    value: cat.total
  })) || [];

  const categoryLegendData = categoryData.map((item, index) => ({
    ...item,
    color: COLORS[index % COLORS.length]
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboard}
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
        <div className="bg-white overflow-hidden shadow rounded-lg p-5">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Money to Receive</h3>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(data?.moneyToReceive || 0)}</p>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg p-5">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Money to Pay</h3>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(data?.moneyToPay || 0)}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 mb-8">
        {/* Monthly Trend */}
        <div className="bg-white shadow rounded-lg p-5">
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

        {/* Category Breakdown */}
        <div className="bg-white shadow rounded-lg p-5">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Expenses by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryLegendData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4">
            {categoryLegendData.length > 0 ? (
              <ul className="space-y-2">
                {categoryLegendData.map((category, index) => (
                  <li key={`category-legend-${index}`} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: category.color }}></span>
                    <span className="truncate">{category.name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No category data available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
