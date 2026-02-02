import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function Budgets() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState([]);
  const [usage, setUsage] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ categoryId: '', amount: '', month: new Date().getMonth() + 1, year: new Date().getFullYear() });

  useEffect(() => {
    fetchData();
  }, [formData.month, formData.year]);

  const fetchData = async () => {
    try {
      const [categoriesRes, usageRes] = await Promise.all([
        api.get('/categories?type=expense'),
        api.get(`/budgets/usage?month=${formData.month}&year=${formData.year}`)
      ]);
      setCategories(categoriesRes.data.data.categories);
      setUsage(usageRes.data.data.usage);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = { ...formData, amount: Number(formData.amount) };

      if (editingBudgetId) {
        await api.patch(`/budgets/${editingBudgetId}`, { amount: payload.amount });
      } else {
        await api.post('/budgets', payload);
      }

      setFormData({ categoryId: '', amount: '', month: formData.month, year: formData.year });
      setEditingBudgetId(null);
      setShowForm(false);
      fetchData();
    } catch (error) {
      console.error('Error saving budget:', error);
      alert(error.response?.data?.message || 'Error saving budget');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (budget) => {
    setFormData({
      categoryId: budget.category?._id || budget.category,
      amount: budget.amount?.toString() || '',
      month: budget.month,
      year: budget.year
    });
    setEditingBudgetId(budget._id);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setFormData({ categoryId: '', amount: '', month: formData.month, year: formData.year });
    setEditingBudgetId(null);
    setShowForm(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: user?.currency || 'INR' }).format(amount);
  };

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Budget Planner</h1>
        <div className="flex items-center space-x-2">
          <select
            value={formData.month}
            onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </select>
          <select
            value={formData.year}
            onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={() => (showForm ? handleCancelForm() : setShowForm(true))}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            {showForm ? 'Cancel' : '+ Add Budget'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{editingBudgetId ? 'Edit Budget' : 'Add Budget'}</h2>
            {editingBudgetId && <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">Editing</span>}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  required
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  disabled={!!editingBudgetId}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Budget Amount</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</span>
                ) : (
                  editingBudgetId ? 'Update Budget' : 'Add Budget'
                )}
              </button>
              <button type="button" onClick={handleCancelForm} className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {usage.map((item) => (
          <div key={item.budget._id} className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium text-gray-900">{item.budget.category.name}</h3>
              <span className={`text-sm font-medium ${item.exceeded ? 'text-red-600' : 'text-green-600'}`}>
                {item.percentage}%
              </span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm text-gray-500">{new Date(item.budget.year, item.budget.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
              <button onClick={() => handleEdit(item.budget)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Edit</button>
            </div>
            <div className="mb-2">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>{formatCurrency(item.spent)} spent</span>
                <span>{formatCurrency(item.budget.amount)} budget</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${item.exceeded ? 'bg-red-500' : item.percentage > 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
                  style={{ width: `${Math.min(item.percentage, 100)}%` }}
                ></div>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              {item.remaining > 0 ? `${formatCurrency(item.remaining)} remaining` : `Over budget by ${formatCurrency(Math.abs(item.remaining))}`}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
