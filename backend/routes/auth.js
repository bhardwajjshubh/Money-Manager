const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const User = require('../models/User');
const { generateAccessToken, createRefreshToken } = require('../utils/jwt');
const { generateOTP, getOTPExpiry, hashOTP, sendOTPEmail, verifyOTP } = require('../utils/otpUtils');

const router = express.Router();

const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true, // required for SameSite=None
  sameSite: 'none', // allow cross-site (frontend on Vercel, API on Render)
};

const issueRefreshCookie = async (res, user) => {
  const { token, tokenHash, expiresAt } = createRefreshToken();
  user.refreshTokens.push({ tokenHash, expiresAt });
  await user.save();

  res.cookie(REFRESH_COOKIE_NAME, token, {
    ...REFRESH_COOKIE_OPTIONS,
    maxAge: expiresAt - Date.now()
  });
};

const validateRequest = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return false;
  }

  return true;
};

const handleSignupOtpRequest = async (req, res) => {
  if (!validateRequest(req, res)) return;

  const { name, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser?.isEmailVerified) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const otpExpiry = getOTPExpiry();
    const otpHash = hashOTP(otp);

    const user = existingUser || new User({
      name,
      email,
      passwordHash,
      isEmailVerified: false
    });

    user.name = name;
    user.email = email;
    user.passwordHash = passwordHash;
    user.isEmailVerified = false;
    user.emailVerificationOtpHash = otpHash;
    user.emailVerificationOtpExpiry = otpExpiry;

    await user.save();

    const emailSent = await sendOTPEmail(email, otp, 'signup');
    if (!emailSent) {
      return res.status(500).json({ success: false, message: 'Failed to send OTP email. Check email configuration.' });
    }

    return res.status(200).json({ success: true, message: 'OTP sent to your email address' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const handleForgotPasswordOtpRequest = async (req, res) => {
  if (!validateRequest(req, res)) return;

  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || !user.isEmailVerified) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }

    const otp = generateOTP();
    user.resetPasswordHash = hashOTP(otp);
    user.resetPasswordExpiry = getOTPExpiry();
    await user.save();

    const emailSent = await sendOTPEmail(email, otp, 'forgot-password');
    if (!emailSent) {
      return res.status(500).json({ success: false, message: 'Failed to send OTP email. Check email configuration.' });
    }

    return res.status(200).json({ success: true, message: 'OTP sent to your email address' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Signup: request OTP and create pending unverified account
router.post('/signup',
  body('name').isLength({ min: 1 }).trim(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  handleSignupOtpRequest
);

router.post('/signup-request-otp',
  body('name').isLength({ min: 1 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  handleSignupOtpRequest
);

router.post('/signup-verify-otp',
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric(),
  async (req, res) => {
    if (!validateRequest(req, res)) return;

    const { email, otp } = req.body;

    try {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ success: false, message: 'Pending signup not found' });
      }

      if (user.isEmailVerified) {
        return res.status(400).json({ success: false, message: 'Email is already verified' });
      }

      const verification = verifyOTP(user.emailVerificationOtpHash, otp, user.emailVerificationOtpExpiry);
      if (!verification.valid) {
        return res.status(400).json({ success: false, message: verification.message });
      }

      user.isEmailVerified = true;
      user.emailVerificationOtpHash = undefined;
      user.emailVerificationOtpExpiry = undefined;
      await user.save();

      return res.status(200).json({ success: true, message: 'Email verified successfully. You can now log in.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// Forgot Password: request OTP
router.post('/forgot-password',
  body('email').isEmail().normalizeEmail(),
  handleForgotPasswordOtpRequest
);

router.post('/forgot-password-request-otp',
  body('email').isEmail().normalizeEmail(),
  handleForgotPasswordOtpRequest
);

router.post('/forgot-password-verify-otp',
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric(),
  async (req, res) => {
    if (!validateRequest(req, res)) return;

    const { email, otp } = req.body;

    try {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const verification = verifyOTP(user.resetPasswordHash, otp, user.resetPasswordExpiry);
      if (!verification.valid) {
        return res.status(400).json({ success: false, message: verification.message });
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      user.resetPasswordHash = hashOTP(resetToken);
      user.resetPasswordExpiry = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();

      return res.status(200).json({ success: true, data: { resetToken } });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

router.post('/reset-password',
  body('email').isEmail().normalizeEmail(),
  body('resetToken').isLength({ min: 1 }),
  body('newPassword').isLength({ min: 8 }),
  async (req, res) => {
    if (!validateRequest(req, res)) return;

    const { email, resetToken, newPassword } = req.body;

    try {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ success: false, message: 'User not found' });
      }

      const isResetTokenValid = user.resetPasswordHash === hashOTP(resetToken)
        && user.resetPasswordExpiry
        && user.resetPasswordExpiry > new Date();

      if (!isResetTokenValid) {
        return res.status(400).json({ success: false, message: 'Reset token is invalid or expired' });
      }

      user.passwordHash = await bcrypt.hash(newPassword, 10);
      user.resetPasswordHash = undefined;
      user.resetPasswordExpiry = undefined;
      await user.save();

      return res.status(200).json({ success: true, message: 'Password reset successfully' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

router.post('/login',
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 1 }),
  async (req, res) => {
    if (!validateRequest(req, res)) return;
    const { email, password } = req.body;
    try {
      const user = await User.findOne({ email });
      if (!user) return res.status(400).json({ success: false, message: 'Invalid credentials' });
      if (!user.isEmailVerified) return res.status(403).json({ success: false, message: 'Please verify your email before logging in' });
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return res.status(400).json({ success: false, message: 'Invalid credentials' });

      const accessToken = generateAccessToken(user._id.toString());
      await issueRefreshCookie(res, user);
      res.json({ success: true, data: { user: { id: user._id, name: user.name, email: user.email, currency: user.currency }, accessToken } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

router.post('/refresh', async (req, res) => {
  const token = req.cookies['refreshToken'];
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
  const token = req.cookies['refreshToken'];
  if (token) {
    try {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      await User.updateOne({ 'refreshTokens.tokenHash': tokenHash }, { $pull: { refreshTokens: { tokenHash } } });
    } catch (err) {
      console.error('Error clearing refresh token', err);
    }
  }
  res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTIONS);
  res.json({ success: true, message: 'Logged out' });
});

module.exports = router;
