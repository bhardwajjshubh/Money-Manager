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
  resetPasswordHash: String,
  resetPasswordExpiry: Date,
  // OTP fields
  otp: String,
  otpExpiry: Date,
  isEmailVerified: { type: Boolean, default: false },
  tempSignupData: {
    name: String,
    email: String,
    passwordHash: String
  }
});

module.exports = mongoose.model('User', userSchema);
