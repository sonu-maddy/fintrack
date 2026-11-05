const { z } = require('zod');
const { INCOME_CATEGORIES, EXPENSE_CATEGORIES, ALL_CATEGORIES } = require('../config/categories');

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

const month = z.string().regex(MONTH_RE, 'Month must be in YYYY-MM format');

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, 'Enter a valid date');

const transactionBody = z
  .object({
    amount: z
      .number({ invalid_type_error: 'Amount must be a number', required_error: 'Amount is required' })
      .positive('Amount must be greater than 0')
      .max(1_000_000_000, 'Amount is too large')
      .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, 'Amount can have at most 2 decimal places'),
    type: z.enum(['income', 'expense'], { errorMap: () => ({ message: 'Type must be income or expense' }) }),
    category: z.string().trim().min(1, 'Category is required'),
    date: dateString,
    note: z.string().trim().max(200, 'Note must be at most 200 characters').optional().default(''),
  })
  .superRefine((val, ctx) => {
    const allowed = val.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    if (!allowed.includes(val.category)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['category'],
        message: `Category must be one of: ${allowed.join(', ')}`,
      });
    }
  });

const SORTS = ['date', '-date', 'amount', '-amount', 'createdAt', '-createdAt'];

const listQuery = z.object({
  month: month.optional(),
  type: z.enum(['income', 'expense']).optional(),
  category: z.enum(ALL_CATEGORIES).optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sort: z.enum(SORTS).default('-date'),
});

const summaryQuery = z.object({ month });

const trendQuery = z.object({
  months: z.coerce.number().int().min(1).max(24).default(6),
  to: month.optional(),
});

module.exports = { transactionBody, listQuery, summaryQuery, trendQuery };
