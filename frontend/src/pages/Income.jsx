import { useState, useEffect, useRef } from 'react';
import LoadingState from '../components/LoadingState';
import api from '../utils/api';
import { formatDateDDMMYYYY } from '../utils/date';
import { useAuth } from '../context/AuthContext';
import { useDataRefresh } from '../context/DataContext';

export default function Income() {
  const { user } = useAuth();
  const { triggerRefresh } = useDataRefresh();
  const formSectionRef = useRef(null);
  const [incomes, setIncomes] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingIncomeId, setEditingIncomeId] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState('');
  const [sourceFilterOptions, setSourceFilterOptions] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalIncomes, setTotalIncomes] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [filteredTotalIncome, setFilteredTotalIncome] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSourceOption, setSelectedSourceOption] = useState('');
  const [customSourceName, setCustomSourceName] = useState('');
  const [formData, setFormData] = useState({ amount: '', source: '', date: '', notes: '', savingsGoalId: '' });
  const predefinedSources = ['Salary', 'Freelance', 'Business', 'Interest', 'Rental', 'Bonus', 'Gift', 'Refund', 'Borrowed'];
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
    fetchSavingsGoals();
  }, []);

  useEffect(() => {
    fetchIncomes();
  }, [currentPage, selectedMonth, selectedYear, selectedSourceFilter]);

  useEffect(() => {
    if (showForm && editingIncomeId && formSectionRef.current) {
      formSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showForm, editingIncomeId]);

  const fetchSavingsGoals = async () => {
    try {
      const { data } = await api.get('/savings');
      setSavingsGoals(data.data.goals || []);
    } catch (error) {
      console.error('Error fetching savings goals:', error);
    }
  };

  const fetchIncomes = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: String(currentPage),
        limit: String(itemsPerPage)
      });

      if (selectedMonth) query.set('month', selectedMonth);
      if (selectedYear) query.set('year', selectedYear);
      if (selectedSourceFilter) query.set('source', selectedSourceFilter);

      const [incomesRes, sourcesRes, summaryRes] = await Promise.all([
        api.get(`/incomes?${query.toString()}`),
        api.get('/incomes/sources'),
        api.get(`/incomes/summary?${query.toString()}`)
      ]);

      setIncomes(incomesRes.data.data.incomes);
      setTotalIncomes(incomesRes.data.data.total || 0);
      setTotalPages(incomesRes.data.data.pages || 1);
      setSourceFilterOptions(sourcesRes.data.data.sources || []);
      setFilteredTotalIncome(summaryRes.data.data.total || 0);

      const backendPage = incomesRes.data.data.page || 1;
      if (backendPage !== currentPage) {
        setCurrentPage(backendPage);
      }
    } catch (error) {
      console.error('Error fetching incomes:', error);
      setFilteredTotalIncome(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const sourceToUse = selectedSourceOption === 'other'
        ? customSourceName.trim()
        : formData.source;

      const payload = {
        amount: Number(formData.amount),
        source: sourceToUse,
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
      setSelectedSourceOption('');
      setCustomSourceName('');
      setEditingIncomeId(null);
      setShowForm(false);
      setCurrentPage(1);
      await fetchIncomes();
    } catch (error) {
      console.error('Error saving income:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (income) => {
    const incomeSource = income.source || '';
    const isPredefinedSource = predefinedSources.includes(incomeSource);

    setFormData({
      amount: income.amount?.toString() || '',
      source: isPredefinedSource ? incomeSource : '',
      date: income.date ? income.date.slice(0, 10) : '',
      notes: income.notes || '',
      savingsGoalId: income.savingsGoal || ''
    });
    setSelectedSourceOption(isPredefinedSource ? incomeSource : 'other');
    setCustomSourceName(isPredefinedSource ? '' : incomeSource);
    setEditingIncomeId(income._id);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setFormData({ amount: '', source: '', date: '', notes: '', savingsGoalId: '' });
    setSelectedSourceOption('');
    setCustomSourceName('');
    setEditingIncomeId(null);
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this income?')) return;
    try {
      await api.delete(`/incomes/${id}`);
      if (incomes.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
      } else {
        await fetchIncomes();
      }
    } catch (error) {
      console.error('Error deleting income:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: user?.currency || 'INR' }).format(amount);
  };

  const pageStart = totalIncomes === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const pageEnd = Math.min(currentPage * itemsPerPage, totalIncomes);
  const hasFilters = Boolean(selectedMonth || selectedYear || selectedSourceFilter);

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
            <label className="block text-sm font-medium text-gray-700 mb-2">Source</label>
            <select
              value={selectedSourceFilter}
              onChange={(e) => {
                setSelectedSourceFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
            >
              <option value="">All Sources</option>
              {sourceFilterOptions.map((sourceOption) => (
                <option key={sourceOption} value={sourceOption}>{sourceOption}</option>
              ))}
            </select>
          </div>

          <div>
            <button
              onClick={() => {
                setSelectedMonth('');
                setSelectedYear('');
                setSelectedSourceFilter('');
                setCurrentPage(1);
              }}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Showing {pageStart}-{pageEnd} of {totalIncomes} record{totalIncomes !== 1 ? 's' : ''}
        </p>
        <p className="text-sm font-medium text-gray-800 mt-1">
          {hasFilters ? 'Filtered' : 'Overall'} Total Income: <span className="text-green-600">{formatCurrency(filteredTotalIncome)}</span>
        </p>
      </div>

      {showForm && (
        <div ref={formSectionRef} className="bg-white shadow rounded-lg p-6 mb-6">
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
                <div className="space-y-3 mt-1">
                  <select
                    required
                    value={selectedSourceOption}
                    onChange={(e) => {
                      const selectedValue = e.target.value;
                      setSelectedSourceOption(selectedValue);
                      if (selectedValue && selectedValue !== 'other') {
                        setFormData({ ...formData, source: selectedValue });
                        setCustomSourceName('');
                      } else {
                        setFormData({ ...formData, source: '' });
                      }
                    }}
                    className="w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2"
                  >
                    <option value="">-- Select source --</option>
                    {predefinedSources.map((source) => (
                      <option key={source} value={source}>{source}</option>
                    ))}
                    <option value="other">Other</option>
                  </select>

                  {selectedSourceOption === 'other' && (
                    <input
                      type="text"
                      required
                      value={customSourceName}
                      onChange={(e) => setCustomSourceName(e.target.value)}
                      className="w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2"
                      placeholder="Enter source name"
                    />
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
                disabled={isSubmitting}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</span>
                ) : (
                  editingIncomeId ? 'Update Income' : 'Add Income'
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Savings Goal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {incomes.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    {hasFilters ? 'No records found for selected filters' : 'No incomes yet'}
                  </td>
                </tr>
              ) : (
              incomes.map((income) => (
                <tr key={income._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDateDDMMYYYY(income.date)}
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
          {incomes.length === 0 ? (
            <p className="text-center text-gray-500 py-8">{hasFilters ? 'No records found for selected filters' : 'No incomes yet'}</p>
          ) : (
            incomes.map((income) => (
              <div key={income._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="font-medium text-gray-900">{formatDateDDMMYYYY(income.date)}</p>
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
