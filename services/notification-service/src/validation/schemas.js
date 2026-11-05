const { z } = require('zod');

const thresholdBody = z.object({
  threshold: z
    .number({ invalid_type_error: 'Threshold must be a number', required_error: 'Threshold is required' })
    .positive('Threshold must be greater than 0')
    .max(1_000_000_000, 'Threshold is too large')
    .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, 'At most 2 decimal places'),
});

const listQuery = z.object({
  unread: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Shape of the expense.created event published by the transaction service.
const expenseEventSchema = z.object({
  eventId: z.string().min(1),
  transactionId: z.string().min(1),
  userId: z.string().min(1),
  amount: z.number().positive(),
  category: z.string().min(1),
  date: z.string().min(1),
  occurredAt: z.string().optional(),
});

module.exports = { thresholdBody, listQuery, expenseEventSchema };
