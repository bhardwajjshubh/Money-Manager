const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const authenticate = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// Get current user profile
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-passwordHash -refreshTokens -resetPasswordHash -resetPasswordExpiry -emailVerificationOtpHash -emailVerificationOtpExpiry');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: { user } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update user profile
router.patch('/me',
  authenticate,
  body('name').optional().isLength({ min: 1 }).trim(),
  body('currency').optional().isString().trim(),
  body('theme').optional().isIn(['light', 'dark']),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    
    try {
      const { name, currency, theme } = req.body;
      const user = await User.findByIdAndUpdate(
        req.userId,
        { $set: { name, currency, theme } },
        { new: true, runValidators: true }
      ).select('-passwordHash -refreshTokens -resetPasswordHash -resetPasswordExpiry -emailVerificationOtpHash -emailVerificationOtpExpiry');
      
      res.json({ success: true, data: { user } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// Change password
router.patch('/change-password',
  authenticate,
  body('currentPassword').isLength({ min: 1 }),
  body('newPassword').isLength({ min: 8 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await User.findById(req.userId);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      
      const ok = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!ok) return res.status(400).json({ success: false, message: 'Current password is incorrect' });
      
      user.passwordHash = await bcrypt.hash(newPassword, 10);
      await user.save();
      
      res.json({ success: true, message: 'Password changed successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

module.exports = router;
