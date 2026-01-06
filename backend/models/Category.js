const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  color: { type: String, default: '#3B82F6' },
  type: { type: String, enum: ['expense', 'income'], default: 'expense' },
  createdAt: { type: Date, default: Date.now }
});

categorySchema.index({ user: 1, name: 1 });

module.exports = mongoose.model('Category', categorySchema);
