const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const User = require('../models/User');
const { generateAccessToken, createRefreshToken } = require('../utils/jwt');

const router = express.Router();

const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true, // required for SameSite=None
  sameSite: 'none', // allow cross-site (frontend on Vercel, API on Render)
};

// Signup: Direct registration without OTP
router.post('/signup',
  body('name').isLength({ min: 1 }),
  body('email').isEmail(),
  body('password').isLength({ min: 8 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    
    const { name, email, password } = req.body;
    try {
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Email already registered' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Create user
      const user = new User({
        name,
        email,
        passwordHash,
        isEmailVerified: true
      });
      await user.save();

      // Generate tokens
      const accessToken = generateAccessToken(user._id.toString());
      const { token, tokenHash, expiresAt } = createRefreshToken();
      user.refreshTokens.push({ tokenHash, expiresAt });
      await user.save();

      res.cookie('refreshToken', token, { 
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: expiresAt - Date.now() 
      });
      
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


// Forgot Password: Direct password reset
router.post('/forgot-password',
  body('email').isEmail(),
  body('newPassword').isLength({ min: 8 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    
    const { email, newPassword } = req.body;
    try {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ success: false, message: 'User not found' });
      }

      // Hash and update password
      const passwordHash = await bcrypt.hash(newPassword, 10);
      user.passwordHash = passwordHash;
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

      res.cookie('refreshToken', token, { 
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: expiresAt - Date.now() 
      });
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
      await User.updateOne({}, { $pull: { refreshTokens: { tokenHash } } });
    } catch (err) {
      console.error('Error clearing refresh token', err);
    }
  }
  res.clearCookie('refreshToken', { 
    httpOnly: true,
    secure: true,
    sameSite: 'none'
  });
  res.json({ success: true, message: 'Logged out' });
});

module.exports = router;
