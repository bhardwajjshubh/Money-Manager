import { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatDateDDMMYYYY } from '../utils/date';
import { useAuth } from '../context/AuthContext';

export default function Loans() {
  const { user } = useAuth();
  const [loans, setLoans] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(null);
  const [editingLoanId, setEditingLoanId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ personName: '', type: 'lent', totalAmount: '', dueDate: '', notes: '' });
  const [paymentData, setPaymentData] = useState({ amount: '', note: '' });

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    try {
      const { data } = await api.get('/loans');
      setLoans(data.data.loans);
    } catch (error) {
      console.error('Error fetching loans:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        personName: formData.personName,
        type: formData.type,
        totalAmount: Number(formData.totalAmount)
      };

      if (formData.dueDate) {
        payload.dueDate = formData.dueDate;
      }

      const trimmedNotes = formData.notes?.trim();
      if (trimmedNotes) {
        payload.notes = trimmedNotes;
      }

      if (editingLoanId) {
        await api.patch(`/loans/${editingLoanId}`, payload);
      } else {
        await api.post('/loans', payload);
      }

      setFormData({ personName: '', type: 'lent', totalAmount: '', dueDate: '', notes: '' });
      setEditingLoanId(null);
      setShowForm(false);
      fetchLoans();
    } catch (error) {
      console.error('Error saving loan:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (loan) => {
    setFormData({
      personName: loan.personName || '',
      type: loan.type || 'lent',
      totalAmount: loan.totalAmount?.toString() || '',
      dueDate: loan.dueDate ? loan.dueDate.slice(0, 10) : '',
      notes: loan.notes || ''
    });
    setEditingLoanId(loan._id);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setFormData({ personName: '', type: 'lent', totalAmount: '', dueDate: '', notes: '' });
    setEditingLoanId(null);
    setShowForm(false);
  };

  const handlePayment = async (loanId) => {
    try {
      await api.post(`/loans/${loanId}/payments`, paymentData);
      setPaymentData({ amount: '', note: '' });
      setShowPaymentForm(null);
      fetchLoans();
    } catch (error) {
      console.error('Error adding payment:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this loan record?')) return;
    try {
      await api.delete(`/loans/${id}`);
      fetchLoans();
    } catch (error) {
      console.error('Error deleting loan:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: user?.currency || 'INR' }).format(amount);
  };

  const getStatusColor = (status) => {
    const colors = {
      open: 'bg-blue-100 text-blue-800',
      partial: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Lending & Borrowing</h1>
        <button
          onClick={() => (showForm ? handleCancelForm() : setShowForm(true))}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : '+ Add Record'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{editingLoanId ? 'Edit Loan Record' : 'Add Loan Record'}</h2>
            {editingLoanId && <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">Editing</span>}
          </div>
          <form onSubmit={handleSubmit} className={`space-y-4 ${isSubmitting ? 'opacity-80 pointer-events-none' : ''}`}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Person Name</label>
                <input
                  type="text"
                  required
                  value={formData.personName}
                  onChange={(e) => setFormData({ ...formData, personName: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  disabled={!!editingLoanId}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                >
                  <option value="lent">Money Lent (To Receive)</option>
                  <option value="borrowed">Money Borrowed (To Pay)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={formData.totalAmount}
                  onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Due Date (Optional)</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
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
                  editingLoanId ? 'Update Record' : 'Add Record'
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
        {loans.map((loan) => (
          <div key={loan._id} className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{loan.personName}</h3>
                <p className="text-sm text-gray-500 capitalize">{loan.type === 'lent' ? 'Money Lent' : 'Money Borrowed'}</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(loan.status)}`}>
                  {loan.status}
                </span>
                <button onClick={() => handleEdit(loan)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Edit</button>
                <button onClick={() => handleDelete(loan._id)} className="text-red-600 hover:text-red-900">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-lg font-semibold text-gray-900">{formatCurrency(loan.totalAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Paid</p>
                <p className="text-lg font-semibold text-green-600">{formatCurrency(loan.paidAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Remaining</p>
                <p className="text-lg font-semibold text-red-600">{formatCurrency(loan.remainingAmount)}</p>
              </div>
            </div>

            {loan.dueDate && (
              <p className="text-sm text-gray-500 mb-2">Due: {formatDateDDMMYYYY(loan.dueDate)}</p>
            )}
            {loan.notes && <p className="text-sm text-gray-600 mb-2">{loan.notes}</p>}

            {loan.status !== 'paid' && (
              <div className="mt-4">
                {showPaymentForm === loan._id ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Amount"
                      value={paymentData.amount}
                      onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                      className="w-full min-w-0 sm:flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                    />
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2">
                      <button
                        onClick={() => handlePayment(loan._id)}
                        className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 whitespace-nowrap"
                      >
                        Add Payment
                      </button>
                      <button
                        onClick={() => setShowPaymentForm(null)}
                        className="w-full sm:w-auto px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 whitespace-nowrap"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowPaymentForm(loan._id)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Add Payment
                  </button>
                )}
              </div>
            )}

            {loan.payments && loan.payments.length > 0 && (
              <div className="mt-4 border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Payment History</p>
                {loan.payments.map((payment, idx) => (
                  <div key={idx} className="text-sm text-gray-600 flex justify-between">
                    <span>{formatDateDDMMYYYY(payment.date)}</span>
                    <span>{formatCurrency(payment.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
