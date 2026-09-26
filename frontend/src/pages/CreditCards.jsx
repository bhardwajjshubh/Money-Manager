import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const emptyCard = {
  cardName: '', bankName: '', lastFourDigits: '', creditLimit: '', statementDay: 1,
  paymentDueDay: 10, notes: '', status: 'active'
};

const emptyTransaction = {
  description: '', amount: '', categoryId: '', transactionDate: new Date().toISOString().slice(0, 10),
  transactionType: 'purchase', notes: ''
};

const formatDate = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set';

export default function CreditCards() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [cards, setCards] = useState([]);
  const [totals, setTotals] = useState({});
  const [categories, setCategories] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [statements, setStatements] = useState([]);
  const [payments, setPayments] = useState([]);
  const [showCardForm, setShowCardForm] = useState(false);
  const [editingCardId, setEditingCardId] = useState(null);
  const [cardForm, setCardForm] = useState(emptyCard);
  const [transactionForm, setTransactionForm] = useState(emptyTransaction);
  const [statementForm, setStatementForm] = useState({ billingPeriodStart: '', billingPeriodEnd: '', statementDate: '', dueDate: '', minimumAmountDue: '' });
  const [paymentForm, setPaymentForm] = useState({ statementId: '', amount: '', paymentDate: new Date().toISOString().slice(0, 10), paymentMethod: 'upi', referenceNumber: '', notes: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [reminderDays, setReminderDays] = useState(() => localStorage.getItem('creditCardReminderDays') || '3');

  const currency = useMemo(() => new Intl.NumberFormat('en-IN', { style: 'currency', currency: user?.currency || 'INR', maximumFractionDigits: 0 }), [user?.currency]);
  const selectedCard = cards.find((card) => card._id === selectedCardId) || cards[0];

  const loadCards = async () => {
    setLoading(true);
    try {
      const response = await api.get('/credit-cards');
      const nextCards = response.data.data.cards || [];
      setCards(nextCards);
      setTotals(response.data.data.totals || {});
      setSelectedCardId((current) => current || nextCards[0]?._id || '');
    } catch (error) {
      alert(error.response?.data?.message || 'Unable to load credit cards');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await api.get('/categories?type=expense');
      setCategories(response.data.data.categories || []);
    } catch (error) {
      console.error('Unable to load expense categories', error);
    }
  };

  const loadCardData = async (cardId = selectedCardId) => {
    if (!cardId) return;
    try {
      const [transactionResponse, statementResponse, paymentResponse] = await Promise.all([
        api.get(`/credit-cards/${cardId}/transactions${search ? `?q=${encodeURIComponent(search)}` : ''}`),
        api.get(`/credit-cards/${cardId}/statements`),
        api.get(`/credit-cards/${cardId}/payments`)
      ]);
      setTransactions(transactionResponse.data.data.transactions || []);
      setStatements(statementResponse.data.data.statements || []);
      setPayments(paymentResponse.data.data.payments || []);
    } catch (error) {
      alert(error.response?.data?.message || 'Unable to load card details');
    }
  };

  useEffect(() => { loadCards(); loadCategories(); }, []);
  useEffect(() => { loadCardData(); }, [selectedCardId, search]);

  const refresh = async () => {
    await loadCards();
    await loadCardData(selectedCardId);
  };

  const handleCardSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = { ...cardForm, creditLimit: Number(cardForm.creditLimit), statementDay: Number(cardForm.statementDay), paymentDueDay: Number(cardForm.paymentDueDay) };
      if (editingCardId) await api.patch(`/credit-cards/${editingCardId}`, payload);
      else await api.post('/credit-cards', payload);
      setCardForm(emptyCard); setEditingCardId(null); setShowCardForm(false); await loadCards();
    } catch (error) {
      alert(error.response?.data?.message || 'Unable to save credit card');
    } finally { setSaving(false); }
  };

  const handleDeleteCard = async (card) => {
    if (!window.confirm(`Delete ${card.cardName}? Cards with transactions must be marked inactive instead.`)) return;
    try { await api.delete(`/credit-cards/${card._id}`); setSelectedCardId(''); await loadCards(); }
    catch (error) { alert(error.response?.data?.message || 'Unable to delete credit card'); }
  };

  const handleTransactionSubmit = async (event) => {
    event.preventDefault();
    if (!selectedCard) return;
    setSaving(true);
    try {
      await api.post(`/credit-cards/${selectedCard._id}/transactions`, { ...transactionForm, amount: Number(transactionForm.amount) });
      setTransactionForm(emptyTransaction); await refresh();
    } catch (error) { alert(error.response?.data?.message || 'Unable to save transaction'); }
    finally { setSaving(false); }
  };

  const handleGenerateStatement = async (event) => {
    event.preventDefault();
    if (!selectedCard) return;
    try {
      await api.post(`/credit-cards/${selectedCard._id}/statements`, { ...statementForm, minimumAmountDue: statementForm.minimumAmountDue ? Number(statementForm.minimumAmountDue) : undefined });
      setStatementForm({ billingPeriodStart: '', billingPeriodEnd: '', statementDate: '', dueDate: '', minimumAmountDue: '' }); await refresh();
    } catch (error) { alert(error.response?.data?.message || 'Unable to generate statement'); }
  };

  const handlePaymentSubmit = async (event) => {
    event.preventDefault();
    if (!selectedCard) return;
    try {
      await api.post(`/credit-cards/${selectedCard._id}/payments`, { ...paymentForm, amount: Number(paymentForm.amount) });
      setPaymentForm({ ...paymentForm, statementId: '', amount: '', referenceNumber: '', notes: '' }); await refresh();
    } catch (error) { alert(error.response?.data?.message || 'Unable to record payment'); }
  };

  const inputClass = 'mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-slate-300';
  const tabs = [['overview', 'Overview'], ['transactions', 'Transactions'], ['statements', 'Bills & Statements'], ['payments', 'Payments'], ['settings', 'Settings']];

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center text-gray-500 dark:text-slate-400">Loading credit cards...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Credit Cards</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">Track balances, bills, transactions, and payments in one place.</p>
        </div>
        <button onClick={() => { setEditingCardId(null); setCardForm(emptyCard); setShowCardForm(true); }} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">+ Add Credit Card</button>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-lg border border-gray-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
        {tabs.map(([value, label]) => <button key={value} onClick={() => setActiveTab(value)} className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors sm:px-4 ${activeTab === value ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>{label}</button>)}
      </div>
      {activeTab === 'transactions' && <label className={`${labelClass} block max-w-sm`}>Search transactions<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search merchant or description" className={inputClass} /></label>}

      {showCardForm && <form onSubmit={handleCardSubmit} className="rounded-lg border border-blue-200 bg-blue-50 p-5 dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{editingCardId ? 'Edit Credit Card' : 'Add Credit Card'}</h2><button type="button" onClick={() => setShowCardForm(false)} className="text-sm text-gray-500">Cancel</button></div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[['cardName', 'Card name', 'text'], ['bankName', 'Bank name', 'text'], ['lastFourDigits', 'Last four digits', 'text'], ['creditLimit', 'Credit limit', 'number'], ['statementDay', 'Statement day (1-28)', 'number'], ['paymentDueDay', 'Payment due day (1-31)', 'number']].map(([field, label, type]) => <label key={field} className={labelClass}>{label}<input required={['cardName', 'bankName', 'lastFourDigits', 'creditLimit', 'statementDay', 'paymentDueDay'].includes(field)} type={type} min={type === 'number' ? 0 : undefined} max={field === 'statementDay' ? 28 : field === 'paymentDueDay' ? 31 : undefined} value={cardForm[field]} onChange={(event) => setCardForm({ ...cardForm, [field]: event.target.value })} className={inputClass} /></label>)}
          <label className={labelClass}>Status<select value={cardForm.status} onChange={(event) => setCardForm({ ...cardForm, status: event.target.value })} className={inputClass}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
          <label className={`${labelClass} md:col-span-2`}>Notes<textarea value={cardForm.notes} onChange={(event) => setCardForm({ ...cardForm, notes: event.target.value })} className={inputClass} rows="2" /></label>
        </div>
        <button disabled={saving} className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Saving...' : 'Save Card'}</button>
      </form>}

      {activeTab === 'overview' && <>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {[['Total Credit Limit', totals.totalCreditLimit, 'text-blue-600'], ['Total Outstanding Balance', totals.totalOutstandingBalance, 'text-red-600'], ['Available Credit', totals.availableCredit, 'text-emerald-600'], ['Unpaid Bills', totals.unpaidBills || 0, 'text-amber-600'], ['Upcoming Bill Amount', totals.upcomingBillAmount, 'text-purple-600'], ['Next Payment Due', formatDate(totals.nextPaymentDueDate), 'text-gray-900 dark:text-slate-100']].map(([label, value, color]) => <div key={label} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-medium text-gray-500 dark:text-slate-400">{label}</p><p className={`mt-2 text-lg font-bold ${color}`}>{typeof value === 'number' && label !== 'Unpaid Bills' ? currency.format(value) : value}</p></div>)}
        </div>
        {cards.length === 0 ? <EmptyState onAdd={() => setShowCardForm(true)} /> : <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">{cards.map((card) => <CardTile key={card._id} card={card} currency={currency} onSelect={() => { setSelectedCardId(card._id); setActiveTab('transactions'); }} onEdit={() => { setEditingCardId(card._id); setCardForm({ ...card, creditLimit: card.creditLimit.toString() }); setShowCardForm(true); }} onDelete={() => handleDeleteCard(card)} />)}</div>}
      </>}

      {activeTab === 'transactions' && <section className="space-y-4"><SectionHeader title="Credit Card Transactions" card={selectedCard} cards={cards} onCardChange={setSelectedCardId} /><form onSubmit={handleTransactionSubmit} className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-3"><label className={labelClass}>Merchant or description<input required value={transactionForm.description} onChange={(event) => setTransactionForm({ ...transactionForm, description: event.target.value })} className={inputClass} /></label><label className={labelClass}>Amount<input required min="0.01" step="0.01" type="number" value={transactionForm.amount} onChange={(event) => setTransactionForm({ ...transactionForm, amount: event.target.value })} className={inputClass} /></label><label className={labelClass}>Category<select required value={transactionForm.categoryId} onChange={(event) => setTransactionForm({ ...transactionForm, categoryId: event.target.value })} className={inputClass}><option value="">Select category</option>{categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</select></label><label className={labelClass}>Date<input required type="date" value={transactionForm.transactionDate} onChange={(event) => setTransactionForm({ ...transactionForm, transactionDate: event.target.value })} className={inputClass} /></label><label className={labelClass}>Type<select value={transactionForm.transactionType} onChange={(event) => setTransactionForm({ ...transactionForm, transactionType: event.target.value })} className={inputClass}><option value="purchase">Purchase</option><option value="refund">Refund</option><option value="adjustment">Adjustment</option></select></label><label className={labelClass}>Notes<input value={transactionForm.notes} onChange={(event) => setTransactionForm({ ...transactionForm, notes: event.target.value })} className={inputClass} /></label><button disabled={!selectedCard || saving} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 md:col-span-3 md:w-fit">Add Transaction</button></form><TransactionTable transactions={transactions} currency={currency} /></section>}

      {activeTab === 'statements' && <section className="space-y-4"><SectionHeader title="Bills & Statements" card={selectedCard} cards={cards} onCardChange={setSelectedCardId} /><form onSubmit={handleGenerateStatement} className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-3">{[['billingPeriodStart', 'Period start'], ['billingPeriodEnd', 'Period end'], ['statementDate', 'Statement date'], ['dueDate', 'Payment due date']].map(([field, label]) => <label key={field} className={labelClass}>{label}<input required type="date" value={statementForm[field]} onChange={(event) => setStatementForm({ ...statementForm, [field]: event.target.value })} className={inputClass} /></label>)}<label className={labelClass}>Minimum amount due<input type="number" min="0" step="0.01" value={statementForm.minimumAmountDue} onChange={(event) => setStatementForm({ ...statementForm, minimumAmountDue: event.target.value })} className={inputClass} /></label><button disabled={!selectedCard} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white md:w-fit">Generate Statement</button></form><StatementTable statements={statements} currency={currency} /></section>}

      {activeTab === 'payments' && <section className="space-y-4"><SectionHeader title="Payments" card={selectedCard} cards={cards} onCardChange={setSelectedCardId} /><form onSubmit={handlePaymentSubmit} className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-3"><label className={labelClass}>Statement<select required value={paymentForm.statementId} onChange={(event) => setPaymentForm({ ...paymentForm, statementId: event.target.value })} className={inputClass}><option value="">Select statement</option>{statements.filter((statement) => statement.status !== 'paid').map((statement) => <option key={statement._id} value={statement._id}>{formatDate(statement.statementDate)} - {currency.format(statement.totalAmount - statement.amountPaid)}</option>)}</select></label><label className={labelClass}>Payment amount<input required type="number" min="0.01" step="0.01" value={paymentForm.amount} onChange={(event) => setPaymentForm({ ...paymentForm, amount: event.target.value })} className={inputClass} /></label><label className={labelClass}>Payment date<input required type="date" value={paymentForm.paymentDate} onChange={(event) => setPaymentForm({ ...paymentForm, paymentDate: event.target.value })} className={inputClass} /></label><label className={labelClass}>Method<select value={paymentForm.paymentMethod} onChange={(event) => setPaymentForm({ ...paymentForm, paymentMethod: event.target.value })} className={inputClass}><option value="upi">UPI</option><option value="bank-transfer">Bank Transfer</option><option value="other">Other</option></select></label><label className={labelClass}>Reference<input value={paymentForm.referenceNumber} onChange={(event) => setPaymentForm({ ...paymentForm, referenceNumber: event.target.value })} className={inputClass} /></label><button disabled={!selectedCard} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white md:w-fit">Record Payment</button></form><PaymentTable payments={payments} currency={currency} /></section>}

      {activeTab === 'settings' && <section className="rounded-lg border border-gray-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Reminder preferences</h2><p className="mt-1 text-sm text-gray-600 dark:text-slate-400">Choose when in-app reminders should appear for upcoming bills.</p><label className={`${labelClass} mt-4 block max-w-xs`}>Remind me<select value={reminderDays} onChange={(event) => { setReminderDays(event.target.value); localStorage.setItem('creditCardReminderDays', event.target.value); }} className={inputClass}><option value="1">1 day before</option><option value="3">3 days before</option><option value="5">5 days before</option><option value="7">7 days before</option></select></label></section>}
    </div>
  );
}

function EmptyState({ onAdd }) {
  return <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900"><div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-2xl dark:bg-blue-950/50">▣</div><h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">No credit cards yet</h2><p className="mt-1 text-sm text-gray-600 dark:text-slate-400">Add your first card to start tracking balances and bills.</p><button onClick={onAdd} className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Add Your First Card</button></div>;
}

function CardTile({ card, currency, onSelect, onEdit, onDelete }) {
  return <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start justify-between"><div><p className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">{card.bankName}</p><h2 className="mt-1 text-lg font-semibold text-gray-900 dark:text-slate-100">{card.cardName}</h2><p className="mt-1 text-sm text-gray-500 dark:text-slate-400">•••• {card.lastFourDigits}</p></div><span className={`rounded-full px-2 py-1 text-xs font-semibold ${card.status === 'active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400'}`}>{card.status}</span></div><div className="mt-5 grid grid-cols-2 gap-3 text-sm"><Metric label="Limit" value={currency.format(card.creditLimit)} /><Metric label="Outstanding" value={currency.format(card.outstandingBalance)} /><Metric label="Available" value={currency.format(card.availableCredit)} /><Metric label="Due" value={formatDate(card.nextPaymentDueDate)} /></div><div className="mt-4"><div className="mb-1 flex justify-between text-xs text-gray-500 dark:text-slate-400"><span>Utilization</span><span>{Math.round(card.utilization || 0)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800"><div className={`h-full rounded-full ${card.utilization > 80 ? 'bg-red-500' : card.utilization > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, card.utilization || 0)}%` }} /></div></div><div className="mt-5 flex flex-wrap gap-2"><button onClick={onSelect} className="rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white">View Details</button><button onClick={onEdit} className="rounded-md border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 dark:border-slate-700 dark:text-slate-200">Edit Card</button><button onClick={onDelete} className="rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 dark:border-red-900/60">Delete</button></div></article>;
}

function Metric({ label, value }) { return <div><p className="text-xs text-gray-500 dark:text-slate-400">{label}</p><p className="mt-1 font-semibold text-gray-900 dark:text-slate-100">{value}</p></div>; }

function SectionHeader({ title, card, cards, onCardChange }) { return <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">{title}</h2><select value={card?._id || ''} onChange={(event) => onCardChange(event.target.value)} className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"><option value="">Select card</option>{cards.map((item) => <option key={item._id} value={item._id}>{item.cardName} •••• {item.lastFourDigits}</option>)}</select></div>; }

function TableShell({ children }) { return <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900">{children}</div>; }
function TransactionTable({ transactions, currency }) { return <TableShell><table className="min-w-full text-left text-sm"><thead className="border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-slate-800 dark:text-slate-400"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Type</th><th className="px-4 py-3 text-right">Amount</th></tr></thead><tbody>{transactions.map((item) => <tr key={item._id} className="border-b border-gray-100 dark:border-slate-800"><td className="px-4 py-3 text-gray-600 dark:text-slate-400">{formatDate(item.transactionDate)}</td><td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">{item.description}</td><td className="px-4 py-3 text-gray-600 dark:text-slate-400">{item.category?.name || 'Uncategorized'}</td><td className="px-4 py-3 capitalize text-gray-600 dark:text-slate-400">{item.transactionType}</td><td className={`px-4 py-3 text-right font-semibold ${item.transactionType === 'refund' ? 'text-emerald-600' : 'text-gray-900 dark:text-slate-100'}`}>{item.transactionType === 'refund' ? '-' : ''}{currency.format(item.amount)}</td></tr>)}</tbody></table>{transactions.length === 0 && <p className="p-8 text-center text-sm text-gray-500 dark:text-slate-400">No transactions found.</p>}</TableShell>; }
function StatementTable({ statements, currency }) { return <TableShell><table className="min-w-full text-left text-sm"><thead className="border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-slate-800 dark:text-slate-400"><tr><th className="px-4 py-3">Statement</th><th className="px-4 py-3">Period</th><th className="px-4 py-3">Due date</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Remaining</th></tr></thead><tbody>{statements.map((item) => <tr key={item._id} className="border-b border-gray-100 dark:border-slate-800"><td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">{formatDate(item.statementDate)}</td><td className="px-4 py-3 text-gray-600 dark:text-slate-400">{formatDate(item.billingPeriodStart)} - {formatDate(item.billingPeriodEnd)}</td><td className="px-4 py-3 text-gray-600 dark:text-slate-400">{formatDate(item.dueDate)}</td><td className="px-4 py-3 capitalize text-gray-600 dark:text-slate-400">{item.status}</td><td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-slate-100">{currency.format(Math.max(0, item.totalAmount - item.amountPaid))}</td></tr>)}</tbody></table>{statements.length === 0 && <p className="p-8 text-center text-sm text-gray-500 dark:text-slate-400">No statements generated yet.</p>}</TableShell>; }
function PaymentTable({ payments, currency }) { return <TableShell><table className="min-w-full text-left text-sm"><thead className="border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-slate-800 dark:text-slate-400"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Method</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3 text-right">Amount</th></tr></thead><tbody>{payments.map((item) => <tr key={item._id} className="border-b border-gray-100 dark:border-slate-800"><td className="px-4 py-3 text-gray-600 dark:text-slate-400">{formatDate(item.paymentDate)}</td><td className="px-4 py-3 capitalize text-gray-600 dark:text-slate-400">{item.paymentMethod.replace('-', ' ')}</td><td className="px-4 py-3 text-gray-600 dark:text-slate-400">{item.referenceNumber || '-'}</td><td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-slate-100">{currency.format(item.amount)}</td></tr>)}</tbody></table>{payments.length === 0 && <p className="p-8 text-center text-sm text-gray-500 dark:text-slate-400">No payments recorded yet.</p>}</TableShell>; }