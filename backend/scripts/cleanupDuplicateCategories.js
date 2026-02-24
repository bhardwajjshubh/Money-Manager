require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Category = require('../models/Category');
const Expense = require('../models/Expense');
const Income = require('../models/Income');
const Budget = require('../models/Budget');

const hasApplyFlag = process.argv.includes('--apply');

const normalizeName = (name) => (name || '').trim().toLowerCase();

async function findDuplicateGroups() {
  const categories = await Category.find({})
    .sort({ user: 1, type: 1, createdAt: 1, _id: 1 })
    .lean();

  const grouped = new Map();

  for (const category of categories) {
    const userId = String(category.user);
    const type = category.type || 'expense';
    const normalizedName = normalizeName(category.name);

    if (!normalizedName) continue;

    const key = `${userId}:${type}:${normalizedName}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        userId,
        type,
        normalizedName,
        keepCategory: category,
        duplicates: []
      });
      continue;
    }

    grouped.get(key).duplicates.push(category);
  }

  return [...grouped.values()].filter((group) => group.duplicates.length > 0);
}

async function cleanupGroup(group) {
  const keepCategoryId = group.keepCategory._id;
  const duplicateIds = group.duplicates.map((item) => item._id);
  const userObjectId = new mongoose.Types.ObjectId(group.userId);

  const expenseUpdate = await Expense.updateMany(
    { user: userObjectId, category: { $in: duplicateIds } },
    { $set: { category: keepCategoryId } }
  );

  const incomeUpdate = await Income.updateMany(
    { user: userObjectId, category: { $in: duplicateIds } },
    { $set: { category: keepCategoryId } }
  );

  const budgetsToReview = await Budget.find({
    user: userObjectId,
    category: { $in: duplicateIds }
  });

  let budgetReassigned = 0;
  let budgetMergedDeleted = 0;

  for (const budget of budgetsToReview) {
    const existingForKeep = await Budget.findOne({
      user: userObjectId,
      category: keepCategoryId,
      month: budget.month,
      year: budget.year
    });

    if (existingForKeep) {
      if ((budget.amount ?? 0) > (existingForKeep.amount ?? 0)) {
        existingForKeep.amount = budget.amount;
        await existingForKeep.save();
      }
      await Budget.deleteOne({ _id: budget._id });
      budgetMergedDeleted += 1;
    } else {
      budget.category = keepCategoryId;
      await budget.save();
      budgetReassigned += 1;
    }
  }

  const deleteResult = await Category.deleteMany({ _id: { $in: duplicateIds } });

  return {
    key: `${group.userId}:${group.type}:${group.normalizedName}`,
    keptCategoryId: String(keepCategoryId),
    removedCategoryCount: deleteResult.deletedCount || 0,
    reassignedExpenses: expenseUpdate.modifiedCount || 0,
    reassignedIncomes: incomeUpdate.modifiedCount || 0,
    reassignedBudgets: budgetReassigned,
    mergedDuplicateBudgets: budgetMergedDeleted
  };
}

async function main() {
  await connectDB();

  const duplicateGroups = await findDuplicateGroups();

  if (duplicateGroups.length === 0) {
    console.log('No duplicate categories found.');
    await mongoose.disconnect();
    return;
  }

  console.log(`Found ${duplicateGroups.length} duplicate category group(s).`);

  const preview = duplicateGroups.map((group) => ({
    userId: group.userId,
    type: group.type,
    name: group.normalizedName,
    keepCategoryId: String(group.keepCategory._id),
    duplicateCategoryIds: group.duplicates.map((item) => String(item._id)),
    duplicateCount: group.duplicates.length
  }));

  console.log('Duplicate groups preview:');
  console.log(JSON.stringify(preview, null, 2));

  if (!hasApplyFlag) {
    console.log('\nDry run only. No changes were made.');
    console.log('Run with: npm run cleanup:categories -- --apply');
    await mongoose.disconnect();
    return;
  }

  const results = [];
  for (const group of duplicateGroups) {
    const result = await cleanupGroup(group);
    results.push(result);
  }

  const totals = results.reduce(
    (acc, item) => {
      acc.removedCategories += item.removedCategoryCount;
      acc.reassignedExpenses += item.reassignedExpenses;
      acc.reassignedIncomes += item.reassignedIncomes;
      acc.reassignedBudgets += item.reassignedBudgets;
      acc.mergedDuplicateBudgets += item.mergedDuplicateBudgets;
      return acc;
    },
    {
      removedCategories: 0,
      reassignedExpenses: 0,
      reassignedIncomes: 0,
      reassignedBudgets: 0,
      mergedDuplicateBudgets: 0
    }
  );

  console.log('\nCleanup completed.');
  console.log(JSON.stringify({ totals, groupsProcessed: results.length, details: results }, null, 2));

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('Cleanup failed:', err);
  try {
    await mongoose.disconnect();
  } catch (disconnectError) {
    console.error('Disconnect failed:', disconnectError);
  }
  process.exit(1);
});
