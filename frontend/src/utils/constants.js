// Mirrors the categories validated by the transaction service.
export const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Investments', 'Other'];
export const EXPENSE_CATEGORIES = ['Food', 'Rent', 'Transport', 'Shopping', 'Bills', 'Health', 'Entertainment', 'Other'];
export const ALL_CATEGORIES = [...new Set([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES])];

export const CATEGORY_COLORS = {
  Food: '#f59e0b',
  Rent: '#6366f1',
  Transport: '#0ea5e9',
  Shopping: '#ec4899',
  Bills: '#14b8a6',
  Health: '#ef4444',
  Entertainment: '#8b5cf6',
  Other: '#94a3b8',
  Salary: '#059669',
  Freelance: '#10b981',
  Investments: '#0d9488',
};
