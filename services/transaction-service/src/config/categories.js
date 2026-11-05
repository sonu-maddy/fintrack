// Single source of truth for valid categories (the frontend mirrors this list).
const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Investments', 'Other'];
const EXPENSE_CATEGORIES = ['Food', 'Rent', 'Transport', 'Shopping', 'Bills', 'Health', 'Entertainment', 'Other'];

module.exports = {
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  ALL_CATEGORIES: [...new Set([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES])],
};
