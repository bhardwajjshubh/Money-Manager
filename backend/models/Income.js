const mongoose = require('mongoose');

const incomeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: Number, required: true, min: 0 },
  source: { type: String, required: true, trim: true },
  date: { type: Date, required: true, index: true },
  notes: { type: String, trim: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  savingsGoal: { type: mongoose.Schema.Types.ObjectId, ref: 'SavingsGoal' }
}, { timestamps: true });

incomeSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('Income', incomeSchema);
