const { z } = require('zod');

const email = z.string().trim().toLowerCase().email('Enter a valid email address').max(254);

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60),
  email,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be at most 72 characters')
    .regex(/[A-Za-z]/, 'Password must contain a letter')
    .regex(/\d/, 'Password must contain a number'),
});

const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required').max(72),
});

module.exports = { registerSchema, loginSchema };
