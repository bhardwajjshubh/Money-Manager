const mongoose = require('mongoose');

const creditCardPaymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  creditCard: { type: mongoose.Schema.Types.ObjectId, ref: 'CreditCard', required: true, index: true },
  statement: { type: mongoose.Schema.Types.ObjectId, ref: 'CreditCardStatement', required: true },
  amount: { type: Number, required: true, min: 0.01 },
  paymentDate: { type: Date, required: true },
  paymentMethod: { type: String, enum: ['bank-transfer', 'upi', 'other'], required: true },
  referenceNumber: { type: String, trim: true, maxlength: 100 },
  notes: { type: String, trim: true, maxlength: 500 }
}, { timestamps: true });

creditCardPaymentSchema.index({ user: 1, creditCard: 1, paymentDate: -1 });

module.exports = mongoose.model('CreditCardPayment', creditCardPaymentSchema);