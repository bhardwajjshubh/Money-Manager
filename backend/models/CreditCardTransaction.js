const mongoose = require('mongoose');

const creditCardTransactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  creditCard: { type: mongoose.Schema.Types.ObjectId, ref: 'CreditCard', required: true, index: true },
  expense: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense' },
  description: { type: String, required: true, trim: true, maxlength: 200 },
  amount: { type: Number, required: true, min: 0 },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  transactionDate: { type: Date, required: true, index: true },
  transactionType: { type: String, enum: ['purchase', 'refund', 'adjustment'], default: 'purchase' },
  notes: { type: String, trim: true, maxlength: 500 }
}, { timestamps: true });

creditCardTransactionSchema.index({ user: 1, creditCard: 1, transactionDate: -1 });

module.exports = mongoose.model('CreditCardTransaction', creditCardTransactionSchema);