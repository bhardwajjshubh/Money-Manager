const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
  tokenHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date }
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  currency: { type: String, default: 'INR' },
  theme: { type: String, enum: ['light', 'dark'], default: 'light' },
  createdAt: { type: Date, default: Date.now },
  refreshTokens: [refreshTokenSchema],
  isEmailVerified: { type: Boolean, default: true }
});

// Ensure an index exists for email lookups (unique, created in background).
userSchema.index({ email: 1 }, { unique: true, background: true });

// Index for refresh token lookups (used when validating refresh cookies)
userSchema.index({ 'refreshTokens.tokenHash': 1 });

module.exports = mongoose.model('User', userSchema);
