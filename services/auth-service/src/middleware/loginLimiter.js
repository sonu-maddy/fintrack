const rateLimit = require('express-rate-limit');
const config = require('../config');

// Brute-force protection: limited failed attempts per IP + email. Successful logins do not count.
module.exports = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: () => config.loginMaxAttempts,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${req.ip}:${String((req.body && req.body.email) || '').toLowerCase()}`,
  handler: (req, res) =>
    res.status(429).json({
      success: false,
      message: 'Too many failed login attempts. Try again in 15 minutes.',
      error: { code: 'TOO_MANY_ATTEMPTS' },
      requestId: req.id,
    }),
});
