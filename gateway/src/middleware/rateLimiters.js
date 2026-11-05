const rateLimit = require('express-rate-limit');
const config = require('../config');
const { sendError } = require('../utils/apiError');

const handler = (req, res) => sendError(req, res, 429, 'RATE_LIMITED', 'Too many requests, please slow down');

const make = (limit, windowMs) =>
  rateLimit({ windowMs, limit: typeof limit === 'function' ? limit : () => limit, standardHeaders: true, legacyHeaders: false, handler });

module.exports = {
  globalLimiter: make(() => config.rateLimitMax, 60 * 1000),
  authLimiter: make(() => config.authRateLimitMax, 15 * 60 * 1000), // stricter for login/register/refresh
};
