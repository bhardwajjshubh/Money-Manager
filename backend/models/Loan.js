const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true, min: 0 },
  date: { type: Date, default: Date.now },
  note: { type: String, trim: true }
});

const loanSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  personName: { type: String, required: true, trim: true },
  type: { type: String, enum: ['lent', 'borrowed'], required: true },
  totalAmount: { type: Number, required: true, min: 0 },
  paidAmount: { type: Number, default: 0, min: 0 },
  remainingAmount: { type: Number, required: true, min: 0 },
  dueDate: { type: Date },
  status: { type: String, enum: ['open', 'partial', 'paid', 'overdue'], default: 'open' },
  payments: [paymentSchema],
  notes: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now }
});

loanSchema.pre('save', function(next) {
  this.remainingAmount = this.totalAmount - (this.paidAmount || 0);
  if (this.remainingAmount <= 0) {
    this.status = 'paid';
  } else if (this.paidAmount > 0) {
    this.status = 'partial';
  } else if (this.dueDate && this.dueDate < new Date() && this.status !== 'paid') {
    this.status = 'overdue';
  }
  next();
});

module.exports = mongoose.model('Loan', loanSchema);
