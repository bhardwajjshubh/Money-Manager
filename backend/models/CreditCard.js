const mongoose = require('mongoose');

const creditCardSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  cardName: { type: String, required: true, trim: true, maxlength: 100 },
  bankName: { type: String, required: true, trim: true, maxlength: 100 },
  lastFourDigits: { type: String, required: true, match: /^\d{4}$/ },
  creditLimit: { type: Number, required: true, min: 0 },
  statementDay: { type: Number, required: true, min: 1, max: 28 },
  paymentDueDay: { type: Number, required: true, min: 1, max: 31 },
  notes: { type: String, trim: true, maxlength: 500 },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });

creditCardSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('CreditCard', creditCardSchema);