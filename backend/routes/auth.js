const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const User = require('../models/User');
const { generateAccessToken, createRefreshToken } = require('../utils/jwt');
const { generateOTP, getOTPExpiry, sendOTPEmail, verifyOTP } = require('../utils/otpUtils');

const router = express.Router();

const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
};

// Signup Step 1: Request OTP
router.post('/signup-request-otp',
  body('email').isEmail(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    
    const { email } = req.body;
    try {
      const existing = await User.findOne({ email });
      if (existing && existing.isEmailVerified) {
        return res.status(400).json({ success: false, message: 'Email already registered' });
      }

      const otp = generateOTP();
      const otpExpiry = getOTPExpiry();
      
      // Send OTP via email
      const emailSent = await sendOTPEmail(email, otp, 'signup');
      if (!emailSent) {
        return res.status(500).json({ success: false, message: 'Failed to send OTP email' });
      }

      // Store OTP temporarily in database (update or create unverified user)
      await User.updateOne(
        { email },
        {
          email,
          otp,
          otpExpiry,
          isEmailVerified: false
        },
        { upsert: true }
      );

      res.status(200).json({ success: true, message: 'OTP sent to email' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// Signup Step 2: Verify OTP and Create User
router.post('/signup-verify-otp',
  body('email').isEmail(),
  body('otp').isLength({ min: 6, max: 6 }),
  body('name').isLength({ min: 1 }),
  body('password').isLength({ min: 8 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    
    const { email, otp, name, password } = req.body;
    try {
      const user = await User.findOne({ email });
      if (!user) return res.status(400).json({ success: false, message: 'Request OTP first' });
      
      // Verify OTP
      const verification = verifyOTP(user.otp, otp, user.otpExpiry);
      if (!verification.valid) {
        return res.status(400).json({ success: false, message: verification.message });
      }

      // Hash password and update user
      const passwordHash = await bcrypt.hash(password, 10);
      user.name = name;
      user.passwordHash = passwordHash;
      user.isEmailVerified = true;
      user.otp = undefined;
      user.otpExpiry = undefined;
      user.tempSignupData = undefined;
      await user.save();

      // Generate tokens
      const accessToken = generateAccessToken(user._id.toString());
      const { token, tokenHash, expiresAt } = createRefreshToken();
      user.refreshTokens.push({ tokenHash, expiresAt });
      await user.save();

      res.cookie(REFRESH_COOKIE_NAME, token, { ...REFRESH_COOKIE_OPTIONS, maxAge: expiresAt - Date.now() });
      res.status(201).json({ 
        success: true, 
        data: { 
          user: { id: user._id, name: user.name, email: user.email, currency: user.currency }, 
          accessToken 
        } 
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// Old signup endpoint (kept for backward compatibility, but disabled)
router.post('/signup',
  body('name').isLength({ min: 1 }),
  body('email').isEmail(),
  body('password').isLength({ min: 8 }),
  async (req, res) => {
    res.status(400).json({ success: false, message: 'Use signup-request-otp and signup-verify-otp endpoints' });
  }
);

// Forgot Password Step 1: Request OTP
router.post('/forgot-password-request-otp',
  body('email').isEmail(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    
    const { email } = req.body;
    try {
      const user = await User.findOne({ email });
      if (!user) {
        // Don't reveal if user exists
        return res.status(200).json({ success: true, message: 'If email exists, OTP will be sent' });
      }

      const otp = generateOTP();
      const otpExpiry = getOTPExpiry();
      
      // Send OTP via email
      const emailSent = await sendOTPEmail(email, otp, 'forgot-password');
      if (!emailSent) {
        return res.status(500).json({ success: false, message: 'Failed to send OTP email' });
      }

      // Store OTP temporarily
      user.otp = otp;
      user.otpExpiry = otpExpiry;
      await user.save();

      res.status(200).json({ success: true, message: 'OTP sent to email' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// Forgot Password Step 2: Verify OTP
router.post('/forgot-password-verify-otp',
  body('email').isEmail(),
  body('otp').isLength({ min: 6, max: 6 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    
    const { email, otp } = req.body;
    try {
      const user = await User.findOne({ email });
      if (!user) return res.status(400).json({ success: false, message: 'User not found' });
      
      // Verify OTP
      const verification = verifyOTP(user.otp, otp, user.otpExpiry);
      if (!verification.valid) {
        return res.status(400).json({ success: false, message: verification.message });
      }

      // Generate temporary token for password reset
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
      
      user.resetPasswordHash = resetTokenHash;
      user.resetPasswordExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      user.otp = undefined;
      user.otpExpiry = undefined;
      await user.save();

      res.status(200).json({ 
        success: true, 
        message: 'OTP verified. Proceed to reset password',
        resetToken 
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// Forgot Password Step 3: Reset Password
router.post('/reset-password',
  body('email').isEmail(),
  body('resetToken').notEmpty(),
  body('newPassword').isLength({ min: 8 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    
    const { email, resetToken, newPassword } = req.body;
    try {
      const user = await User.findOne({ email });
      if (!user) return res.status(400).json({ success: false, message: 'User not found' });
      
      const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
      
      if (user.resetPasswordHash !== resetTokenHash) {
        return res.status(400).json({ success: false, message: 'Invalid reset token' });
      }
      
      if (new Date() > user.resetPasswordExpiry) {
        return res.status(400).json({ success: false, message: 'Reset token expired' });
      }

      // Update password
      const passwordHash = await bcrypt.hash(newPassword, 10);
      user.passwordHash = passwordHash;
      user.resetPasswordHash = undefined;
      user.resetPasswordExpiry = undefined;
      await user.save();

      res.status(200).json({ success: true, message: 'Password reset successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

router.post('/login',
  body('email').isEmail(),
  body('password').isLength({ min: 1 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    const { email, password } = req.body;
    try {
      const user = await User.findOne({ email });
      if (!user) return res.status(400).json({ success: false, message: 'Invalid credentials' });
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return res.status(400).json({ success: false, message: 'Invalid credentials' });

      const accessToken = generateAccessToken(user._id.toString());
      const { token, tokenHash, expiresAt } = createRefreshToken();
      user.refreshTokens.push({ tokenHash, expiresAt });
      await user.save();

      res.cookie(REFRESH_COOKIE_NAME, token, { ...REFRESH_COOKIE_OPTIONS, maxAge: expiresAt - Date.now() });
      res.json({ success: true, data: { user: { id: user._id, name: user.name, email: user.email, currency: user.currency }, accessToken } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

router.post('/refresh', async (req, res) => {
  const token = req.cookies[REFRESH_COOKIE_NAME];
  if (!token) return res.status(401).json({ success: false, message: 'Missing refresh token' });
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ 'refreshTokens.tokenHash': tokenHash });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    const stored = user.refreshTokens.find(r => r.tokenHash === tokenHash);
    if (!stored || stored.expiresAt < new Date()) return res.status(401).json({ success: false, message: 'Refresh token expired' });

    const accessToken = generateAccessToken(user._id.toString());
    res.json({ success: true, data: { accessToken } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/logout', async (req, res) => {
  const token = req.cookies[REFRESH_COOKIE_NAME];
  if (token) {
    try {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      await User.updateOne({}, { $pull: { refreshTokens: { tokenHash } } });
    } catch (err) {
      console.error('Error clearing refresh token', err);
    }
  }
  res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTIONS);
  res.json({ success: true, message: 'Logged out' });
});

module.exports = router;
