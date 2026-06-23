const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const authenticate = require('../middleware/auth');
const Category = require('../models/Category');
const Expense = require('../models/Expense');

const router = express.Router();

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Get all categories for user
router.get('/', authenticate, async (req, res) => {
  try {
    const { type, search } = req.query;
    const filter = { user: new mongoose.Types.ObjectId(req.userId) };
    if (type) filter.type = type;
    if (search) filter.name = new RegExp(search, 'i');
    
    const categories = await Category.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: { categories } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create category
router.post('/',
  authenticate,
  body('name').isLength({ min: 1 }).trim(),
  body('type').optional().isIn(['expense', 'income']),
  body('color').optional().isString(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    
    try {
      const { name, type, color } = req.body;
      const normalizedName = (name || '').trim();
      const categoryType = type || 'expense';

      const existingCategory = await Category.findOne({
        user: new mongoose.Types.ObjectId(req.userId),
        type: categoryType,
        name: new RegExp(`^${escapeRegex(normalizedName)}$`, 'i')
      });

      if (existingCategory) {
        return res.json({ success: true, data: { category: existingCategory, existing: true } });
      }

      const category = await Category.create({
        user: new mongoose.Types.ObjectId(req.userId),
        name: normalizedName,
        type: categoryType,
        color
      });

      res.status(201).json({ success: true, data: { category } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// Get single category
router.get('/:id', authenticate, async (req, res) => {
  try {
    const category = await Category.findOne({ _id: req.params.id, user: new mongoose.Types.ObjectId(req.userId) });
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, data: { category } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update category
router.patch('/:id',
  authenticate,
  body('name').optional().isLength({ min: 1 }).trim(),
  body('type').optional().isIn(['expense', 'income']),
  body('color').optional().isString(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    
    try {
      const { name, type, color } = req.body;
      const category = await Category.findOneAndUpdate(
        { _id: req.params.id, user: new mongoose.Types.ObjectId(req.userId) },
        { $set: { name, type, color } },
        { new: true, runValidators: true }
      );
      if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
      res.json({ success: true, data: { category } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// Delete category
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const category = await Category.findOneAndDelete({ _id: req.params.id, user: new mongoose.Types.ObjectId(req.userId) });
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, message: 'Category deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Add subcategory
router.post('/:id/subcategories', authenticate, body('name').isLength({ min: 1 }).trim(), body('color').optional().isString(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  try {
    const { name, color } = req.body;
    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, user: new mongoose.Types.ObjectId(req.userId) },
      { $push: { subcategories: { name, color } } },
      { new: true }
    );
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.status(201).json({ success: true, data: { subcategories: category.subcategories } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update subcategory
router.patch('/:id/subcategories/:subId', authenticate, body('name').optional().isLength({ min: 1 }).trim(), body('color').optional().isString(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  try {
    const { name, color } = req.body;
    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, user: new mongoose.Types.ObjectId(req.userId), 'subcategories._id': req.params.subId },
      { $set: { 'subcategories.$.name': name, 'subcategories.$.color': color } },
      { new: true }
    );
    if (!category) return res.status(404).json({ success: false, message: 'Subcategory not found' });
    if (name) {
      await Expense.updateMany(
        { user: new mongoose.Types.ObjectId(req.userId), category: req.params.id, subcategoryId: req.params.subId },
        { $set: { subcategoryName: name } }
      );
    }
    res.json({ success: true, data: { subcategories: category.subcategories } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete subcategory
router.delete('/:id/subcategories/:subId', authenticate, async (req, res) => {
  try {
    const category = await Category.findOne({ _id: req.params.id, user: new mongoose.Types.ObjectId(req.userId) });
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    const sub = category.subcategories.id(req.params.subId);
    if (!sub) return res.status(404).json({ success: false, message: 'Subcategory not found' });
    const subName = sub.name;
    sub.remove();
    await category.save();
    await Expense.updateMany(
      { user: new mongoose.Types.ObjectId(req.userId), category: req.params.id, subcategoryId: req.params.subId },
      { $unset: { subcategoryId: '' } }
    );
    res.json({ success: true, message: 'Subcategory deleted', data: { subcategoryName: subName } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
