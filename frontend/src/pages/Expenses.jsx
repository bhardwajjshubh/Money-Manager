import { useState, useEffect } from 'react';
import LoadingState from '../components/LoadingState';
import api from '../utils/api';
import { formatDateDDMMYYYY } from '../utils/date';
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
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedFilterCategoryId, setSelectedFilterCategoryId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [filteredTotalAmount, setFilteredTotalAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [selectedCategoryOption, setSelectedCategoryOption] = useState('');
  const [formData, setFormData] = useState({
    amount: '',
    categoryId: '',
    date: '',
    paymentMethod: 'upi',
    notes: ''
  });

  const predefinedCategories = ['Grocery', 'Food', 'Cloth', 'Recharge', 'Transportation', 'Entertainment', 'Utilities', 'Health', 'Education', 'Shopping', 'Freelance', 'Other'];
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
  const currentYearValue = new Date().getFullYear();
  const yearOptions = Array.from({ length: 10 }, (_, index) => String(currentYearValue - index));

  useEffect(() => {
    fetchCategoriesOnly();
  }, []);

  useEffect(() => {
    fetchData();
  }, [currentPage, selectedMonth, selectedYear, selectedFilterCategoryId]);

  const fetchCategoriesOnly = async () => {
    try {
      const categoriesRes = await api.get('/categories?type=expense');
      setCategories(categoriesRes.data.data.categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: String(currentPage),
        limit: String(itemsPerPage)
      });

      if (selectedMonth) query.set('month', selectedMonth);
      if (selectedYear) query.set('year', selectedYear);
      if (selectedFilterCategoryId) query.set('category', selectedFilterCategoryId);

      const [expensesRes, summaryRes] = await Promise.all([
        api.get(`/expenses?${query.toString()}`),
        api.get(`/expenses/summary?${query.toString()}`)
      ]);

      setExpenses(expensesRes.data.data.expenses);
      setTotalExpenses(expensesRes.data.data.total || 0);
      setTotalPages(expensesRes.data.data.pages || 1);

      const summary = summaryRes.data.data.summary || [];
      const totalAmount = summary.length > 0 ? (summary[0].total || 0) : 0;
      setFilteredTotalAmount(totalAmount);

      const backendPage = expensesRes.data.data.page || 1;
      if (backendPage !== currentPage) {
        setCurrentPage(backendPage);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setFilteredTotalAmount(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let categoryIdToUse = formData.categoryId;

      // Reuse existing category by name before creating a new one
      if (!categoryIdToUse && customCategoryName.trim()) {
        const normalizedName = customCategoryName.trim().toLowerCase();
        const existingCategory = categories.find(
          (category) => category.type === 'expense' && category.name?.trim().toLowerCase() === normalizedName
        );

        if (existingCategory) {
          categoryIdToUse = existingCategory._id;
        } else {
          const { data: catRes } = await api.post('/categories', {
            name: customCategoryName.trim(),
            type: 'expense',
            color: '#3B82F6'
          });
          categoryIdToUse = catRes.data.category._id;
          fetchCategoriesOnly();
        }
      }

      const payload = {
        amount: Number(formData.amount),
        categoryId: categoryIdToUse,
        date: formData.date,
        paymentMethod: formData.paymentMethod,
        notes: formData.notes
      };

      if (editingExpenseId) {
        await api.patch(`/expenses/${editingExpenseId}`, payload);
      } else {
        await api.post('/expenses', payload);
      }

      setFormData({ amount: '', categoryId: '', date: '', paymentMethod: 'upi', notes: '' });
      setCustomCategoryName('');
      setEditingExpenseId(null);
      setShowForm(false);
      setCurrentPage(1);
      triggerRefresh();
    } catch (error) {
      console.error('Error saving expense:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (expense) => {
    const expenseCategoryName = expense.category?.name || '';
    const isPredefinedCategory = predefinedCategories.includes(expenseCategoryName);

    setFormData({
      amount: expense.amount?.toString() || '',
      categoryId: expense.category?._id || '',
      date: expense.date ? expense.date.slice(0, 10) : '',
      paymentMethod: expense.paymentMethod || 'upi',
      notes: expense.notes || ''
    });
    setCustomCategoryName(expenseCategoryName);
    setSelectedCategoryOption(isPredefinedCategory ? expenseCategoryName : 'custom');
    setEditingExpenseId(expense._id);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setFormData({ amount: '', categoryId: '', date: '', paymentMethod: 'upi', notes: '' });
    setCustomCategoryName('');
    setSelectedCategoryOption('');
    setEditingExpenseId(null);
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      if (expenses.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
      } else {
        fetchData();
      }
      triggerRefresh();
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: user?.currency || 'INR' }).format(amount);
  };

  const pageStart = totalExpenses === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const pageEnd = Math.min(currentPage * itemsPerPage, totalExpenses);
  const hasFilters = Boolean(selectedMonth || selectedYear || selectedFilterCategoryId);

  if (loading) return <LoadingState label="Loading expenses" />;

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

      {/* Filter Section */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
            >
              <option value="">All Months</option>
              {monthOptions.map((monthOption) => (
                <option key={monthOption.value} value={monthOption.value}>{monthOption.label}</option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
            >
              <option value="">All Years</option>
              {yearOptions.map((yearOption) => (
                <option key={yearOption} value={yearOption}>{yearOption}</option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={selectedFilterCategoryId}
              onChange={(e) => {
                setSelectedFilterCategoryId(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category._id} value={category._id}>{category.name}</option>
              ))}
            </select>
          </div>

          <div>
            <button
              onClick={() => {
                setSelectedMonth('');
                setSelectedYear('');
                setSelectedFilterCategoryId('');
                setCurrentPage(1);
              }}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-sm text-gray-600 mt-2">
            Showing {pageStart}-{pageEnd} of {totalExpenses} record{totalExpenses !== 1 ? 's' : ''}
          </p>
          <p className="text-sm font-medium text-gray-800">
            {hasFilters ? 'Filtered' : 'Overall'} Total Expense: <span className="text-red-600">{formatCurrency(filteredTotalAmount)}</span>
          </p>
        </div>
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
                        const matchingCategory = categories.find(
                          (category) => category.type === 'expense' && category.name?.trim().toLowerCase() === selectedValue.toLowerCase()
                        );
                        setFormData({
                          ...formData,
                          categoryId: matchingCategory?._id || ''
                        });
                      } else {
                        setCustomCategoryName('');
                        setFormData({
                          ...formData,
                          categoryId: ''
                        });
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
                disabled={isSubmitting}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</span>
                ) : (
                  editingExpenseId ? 'Update Expense' : 'Add Expense'
                )}
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
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    {hasFilters ? 'No records found for selected filters' : 'No expenses yet'}
                  </td>
                </tr>
              ) : (
              expenses.map((expense) => (
                <tr key={expense._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDateDDMMYYYY(expense.date)}
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
          {expenses.length === 0 ? (
            <p className="text-center text-gray-500 py-8">{hasFilters ? 'No records found for selected filters' : 'No expenses yet'}</p>
          ) : (
            expenses.map((expense) => (
              <div key={expense._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="font-medium text-gray-900">{formatDateDDMMYYYY(expense.date)}</p>
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

        {totalPages > 1 && (
          <div className="border-t border-gray-200 px-4 py-3 sm:px-6 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
