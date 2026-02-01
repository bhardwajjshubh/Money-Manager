import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useDataRefresh } from '../context/DataContext';

export default function Expenses() {
  const { user } = useAuth();
  const { triggerRefresh } = useDataRefresh();
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [selectedCategoryOption, setSelectedCategoryOption] = useState('');
  const [formData, setFormData] = useState({
    amount: '',
    categoryId: '',
    date: '',
    paymentMethod: 'cash',
    notes: '',
    merchant: ''
  });

  const predefinedCategories = ['Grocery', 'Food', 'Cloth', 'Recharge', 'Transportation', 'Entertainment', 'Utilities', 'Health', 'Education', 'Shopping', 'Other'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchCategoriesOnly = async () => {
    const categoriesRes = await api.get('/categories?type=expense');
    setCategories(categoriesRes.data.data.categories);
  };

  const fetchData = async () => {
    try {
      const [expensesRes, categoriesRes] = await Promise.all([
        api.get('/expenses'),
        api.get('/categories?type=expense')
      ]);
      setExpenses(expensesRes.data.data.expenses);
      setCategories(categoriesRes.data.data.categories);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let categoryIdToUse = formData.categoryId;

      // If user typed a custom category, create it first
      if (!categoryIdToUse && customCategoryName.trim()) {
        const { data: catRes } = await api.post('/categories', {
          name: customCategoryName.trim(),
          type: 'expense',
          color: '#3B82F6'
        });
        categoryIdToUse = catRes.data.category._id;
        // refresh categories list so it appears next time
        fetchCategoriesOnly();
      }

      const payload = {
        amount: Number(formData.amount),
        categoryId: categoryIdToUse,
        date: formData.date,
        paymentMethod: formData.paymentMethod,
        notes: formData.notes,
        merchant: formData.merchant
      };

      if (editingExpenseId) {
        await api.patch(`/expenses/${editingExpenseId}`, payload);
      } else {
        await api.post('/expenses', payload);
      }

      setFormData({ amount: '', categoryId: '', date: '', paymentMethod: 'cash', notes: '', merchant: '' });
      setCustomCategoryName('');
      setEditingExpenseId(null);
      setShowForm(false);
      fetchData();
      triggerRefresh();
    } catch (error) {
      console.error('Error saving expense:', error);
    }
  };

  const handleEdit = (expense) => {
    setFormData({
      amount: expense.amount?.toString() || '',
      categoryId: expense.category?._id || '',
      date: expense.date ? expense.date.slice(0, 10) : '',
      paymentMethod: expense.paymentMethod || 'cash',
      notes: expense.notes || '',
      merchant: expense.merchant || ''
    });
    setCustomCategoryName(expense.category?.name || '');
    setSelectedCategoryOption(expense.category?.name || '');
    setEditingExpenseId(expense._id);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setFormData({ amount: '', categoryId: '', date: '', paymentMethod: 'cash', notes: '', merchant: '' });
    setCustomCategoryName('');
    setSelectedCategoryOption('');
    setEditingExpenseId(null);
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      fetchData();
      triggerRefresh();
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: user?.currency || 'INR' }).format(amount);
  };

  const getFilteredExpenses = () => {
    if (!selectedDate) return expenses;
    return expenses.filter(expense => {
      const expenseDate = new Date(expense.date).toISOString().split('T')[0];
      return expenseDate === selectedDate;
    });
  };

  const filteredExpenses = getFilteredExpenses();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Expense Management</h1>
        <button
          onClick={() => (showForm ? handleCancelForm() : setShowForm(true))}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : '+ Add Expense'}
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
            Showing {filteredExpenses.length} record{filteredExpenses.length !== 1 ? 's' : ''} for {new Date(selectedDate).toLocaleDateString()}
          </p>
        )}
      </div>

      {showForm && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{editingExpenseId ? 'Edit Expense' : 'Add Expense'}</h2>
            {editingExpenseId && <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">Editing</span>}
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
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <div className="space-y-3 mt-1">
                  <select
                    value={selectedCategoryOption}
                    onChange={(e) => {
                      const selectedValue = e.target.value;
                      setSelectedCategoryOption(selectedValue);
                      if (selectedValue && selectedValue !== 'custom') {
                        setCustomCategoryName(selectedValue);
                      } else {
                        setCustomCategoryName('');
                      }
                    }}
                    className="w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2"
                  >
                    <option value="">-- Select a category --</option>
                    {predefinedCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="custom">-- Or add custom category --</option>
                  </select>
                  
                  {selectedCategoryOption === 'custom' && (
                    <input
                      type="text"
                      required
                      placeholder="Enter custom category name"
                      value={customCategoryName}
                      onChange={(e) => setCustomCategoryName(e.target.value)}
                      className="w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2"
                    />
                  )}

                  {selectedCategoryOption && selectedCategoryOption !== 'custom' && (
                    <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
                      Selected: <span className="font-semibold">{selectedCategoryOption}</span>
                    </div>
                  )}
                </div>
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
                <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                  <option value="netbanking">Net Banking</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Merchant</label>
                <input
                  type="text"
                  value={formData.merchant}
                  onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
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
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {editingExpenseId ? 'Update Expense' : 'Add Expense'}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    {selectedDate ? 'No records found for this date' : 'No expenses yet'}
                  </td>
                </tr>
              ) : (
              filteredExpenses.map((expense) => (
                <tr key={expense._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(expense.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="inline-flex items-center">
                      <span className="h-3 w-3 rounded-full mr-2" style={{ backgroundColor: expense.category?.color || '#3B82F6' }}></span>
                      {expense.category?.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                    {formatCurrency(expense.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{expense.paymentMethod}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{expense.notes}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEdit(expense)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(expense._id)}
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
          {filteredExpenses.length === 0 ? (
            <p className="text-center text-gray-500 py-8">{selectedDate ? 'No records found for this date' : 'No expenses yet'}</p>
          ) : (
            filteredExpenses.map((expense) => (
              <div key={expense._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="font-medium text-gray-900">{new Date(expense.date).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(expense)}
                      className="text-blue-600 hover:text-blue-900 p-1 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(expense._id)}
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
                    <p className="text-sm text-gray-500">Category</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: expense.category?.color || '#3B82F6' }}></span>
                      <p className="font-medium text-gray-900">{expense.category?.name}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Amount</p>
                    <p className="font-bold text-red-600 text-lg">{formatCurrency(expense.amount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Payment Method</p>
                    <p className="font-medium text-gray-900">{expense.paymentMethod}</p>
                  </div>
                  {expense.notes && (
                    <div>
                      <p className="text-sm text-gray-500">Notes</p>
                      <p className="font-medium text-gray-900">{expense.notes}</p>
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
