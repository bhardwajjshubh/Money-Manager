const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const User = require('../models/User');
const { generateAccessToken, createRefreshToken } = require('../utils/jwt');
const { verifyFirebaseIdToken } = require('../utils/firebaseAdmin');

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

router.post('/firebase-auth',
  body('idToken').isLength({ min: 1 }),
  body('name').optional().isLength({ min: 1 }).trim(),
  async (req, res) => {
    if (!validateRequest(req, res)) return;

    const { idToken, name } = req.body;

    try {
      const decodedToken = await verifyFirebaseIdToken(idToken);
      const email = decodedToken?.email;
      const emailVerified = decodedToken?.email_verified;

      if (!email) {
        return res.status(400).json({ success: false, message: 'Firebase token does not contain an email address' });
      }

      if (!emailVerified) {
        return res.status(403).json({ success: false, message: 'Please verify your email before logging in' });
      }

      let user = await User.findOne({ email });

      if (!user) {
        const fallbackName = name || email.split('@')[0] || 'User';
        const randomPassword = crypto.randomBytes(32).toString('hex');
        const passwordHash = await bcrypt.hash(randomPassword, 10);

        user = new User({
          name: fallbackName,
          email,
          passwordHash,
          isEmailVerified: true
        });
      } else {
        if (name && user.name !== name) user.name = name;
        user.isEmailVerified = true;
      }

      await user.save();

      const accessToken = generateAccessToken(user._id.toString());
      await issueRefreshCookie(res, user);

      return res.json({
        success: true,
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            currency: user.currency
          },
          accessToken
        }
      });
    } catch (err) {
      console.error('Firebase auth error:', err?.message || err);
      return res.status(401).json({ success: false, message: 'Invalid Firebase token' });
    }
  }
);

router.post('/forgot-password-check',
  body('email').isEmail().normalizeEmail(),
  async (req, res) => {
    if (!validateRequest(req, res)) return;

    const { email } = req.body;

    try {
      const user = await User.findOne({ email }).select('_id');

      if (!user) {
        return res.status(404).json({ success: false, message: 'Email not registered' });
      }

      return res.json({ success: true, message: 'Email is registered' });
    } catch (err) {
      console.error('Forgot password email check failed:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
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
