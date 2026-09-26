const mongoose = require('mongoose');

const creditCardStatementSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  creditCard: { type: mongoose.Schema.Types.ObjectId, ref: 'CreditCard', required: true, index: true },
  billingPeriodStart: { type: Date, required: true },
  billingPeriodEnd: { type: Date, required: true },
  statementDate: { type: Date, required: true },
  dueDate: { type: Date, required: true },
  totalAmount: { type: Number, required: true, min: 0 },
  minimumAmountDue: { type: Number, required: true, min: 0 },
  amountPaid: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ['unpaid', 'partially-paid', 'paid', 'overdue'], default: 'unpaid' }
}, { timestamps: true });

creditCardStatementSchema.index({ user: 1, creditCard: 1, billingPeriodStart: 1, billingPeriodEnd: 1 }, { unique: true });

module.exports = mongoose.model('CreditCardStatement', creditCardStatementSchema);