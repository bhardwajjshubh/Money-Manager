import { useState, useEffect } from 'react';
import LoadingState from '../components/LoadingState';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useDataRefresh } from '../context/DataContext';

export default function Income() {
  const { user } = useAuth();
  const { triggerRefresh } = useDataRefresh();
  const [incomes, setIncomes] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingIncomeId, setEditingIncomeId] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [formData, setFormData] = useState({ amount: '', source: '', date: '', notes: '', savingsGoalId: '' });

  useEffect(() => {
    fetchIncomes();
    fetchSavingsGoals();
  }, []);

  const fetchSavingsGoals = async () => {
    try {
      const { data } = await api.get('/savings');
      setSavingsGoals(data.data.goals || []);
    } catch (error) {
      console.error('Error fetching savings goals:', error);
    }
  };

  const fetchIncomes = async () => {
    try {
      const { data } = await api.get('/incomes');
      setIncomes(data.data.incomes);
    } catch (error) {
      console.error('Error fetching incomes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        amount: Number(formData.amount),
        source: formData.source,
        date: formData.date,
        notes: formData.notes,
        savingsGoalId: formData.savingsGoalId || undefined
      };

      if (editingIncomeId) {
        await api.patch(`/incomes/${editingIncomeId}`, payload);
      } else {
        await api.post('/incomes', payload);
      }

      setFormData({ amount: '', source: '', date: '', notes: '', savingsGoalId: '' });
      setEditingIncomeId(null);
      setShowForm(false);
      fetchIncomes();
      triggerRefresh();
    } catch (error) {
      console.error('Error saving income:', error);
    }
  };

  const handleEdit = (income) => {
    setFormData({
      amount: income.amount?.toString() || '',
      source: income.source || '',
      date: income.date ? income.date.slice(0, 10) : '',
      notes: income.notes || '',
      savingsGoalId: income.savingsGoal || ''
    });
    setEditingIncomeId(income._id);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setFormData({ amount: '', source: '', date: '', notes: '', savingsGoalId: '' });
    setEditingIncomeId(null);
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this income?')) return;
    try {
      await api.delete(`/incomes/${id}`);
      fetchIncomes();
      triggerRefresh();
    } catch (error) {
      console.error('Error deleting income:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: user?.currency || 'INR' }).format(amount);
  };

  const getFilteredIncomes = () => {
    if (!selectedDate) return incomes;
    return incomes.filter(income => {
      const incomeDate = new Date(income.date).toISOString().split('T')[0];
      return incomeDate === selectedDate;
    });
  };

  const filteredIncomes = getFilteredIncomes();

  if (loading) return <LoadingState label="Loading income" />;

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Income Management</h1>
        <button
          onClick={() => (showForm ? handleCancelForm() : setShowForm(true))}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : '+ Add Income'}
        </button>
      </div>

      {/* Date Filter Section */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
            />
          </div>
          {selectedDate && (
            <button
              onClick={() => setSelectedDate('')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Clear Filter
            </button>
          )}
        </div>
        {selectedDate && (
          <p className="text-sm text-gray-600 mt-2">
            Showing {filteredIncomes.length} record{filteredIncomes.length !== 1 ? 's' : ''} for {new Date(selectedDate).toLocaleDateString()}
          </p>
        )}
      </div>

      {showForm && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{editingIncomeId ? 'Edit Income' : 'Add Income'}</h2>
            {editingIncomeId && <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">Editing</span>}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Source</label>
                <input
                  type="text"
                  required
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                  placeholder="e.g., Salary, Freelance"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Allocate to Savings Goal (Optional)</label>
                <select
                  value={formData.savingsGoalId}
                  onChange={(e) => setFormData({ ...formData, savingsGoalId: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                >
                  <option value="">-- No Goal --</option>
                  {savingsGoals.map((goal) => (
                    <option key={goal._id} value={goal._id}>
                      {goal.name} (Target: ₹{goal.targetAmount})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {editingIncomeId ? 'Update Income' : 'Add Income'}
              </button>
              <button
                type="button"
                onClick={handleCancelForm}
                className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        {/* Desktop Table View */}
        <div className="hidden md:block">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Savings Goal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredIncomes.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    {selectedDate ? 'No records found for this date' : 'No incomes yet'}
                  </td>
                </tr>
              ) : (
              filteredIncomes.map((income) => (
                <tr key={income._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(income.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{income.source}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                    {formatCurrency(income.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {income.savingsGoal ? (savingsGoals.find(g => g._id === income.savingsGoal)?.name || 'Goal') : '--'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{income.notes}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEdit(income)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(income._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3 p-4">
          {filteredIncomes.length === 0 ? (
            <p className="text-center text-gray-500 py-8">{selectedDate ? 'No records found for this date' : 'No incomes yet'}</p>
          ) : (
            filteredIncomes.map((income) => (
              <div key={income._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="font-medium text-gray-900">{new Date(income.date).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(income)}
                      className="text-blue-600 hover:text-blue-900 p-1 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(income._id)}
                      className="text-red-600 hover:text-red-900 p-1"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-500">Source</p>
                    <p className="font-medium text-gray-900">{income.source}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Amount</p>
                    <p className="font-bold text-green-600 text-lg">{formatCurrency(income.amount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Savings Goal</p>
                    <p className="font-medium text-gray-900">
                      {income.savingsGoal ? (savingsGoals.find(g => g._id === income.savingsGoal)?.name || 'Goal') : '--'}
                    </p>
                  </div>
                  {income.notes && (
                    <div>
                      <p className="text-sm text-gray-500">Notes</p>
                      <p className="font-medium text-gray-900">{income.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
