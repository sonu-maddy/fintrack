const crypto = require('crypto');
const { AppError } = require('../utils/errors');

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

// Only the gateway knows INTERNAL_TOKEN, so requests that skip the gateway are rejected.
module.exports = (req, _res, next) => {
  const expected = process.env.INTERNAL_TOKEN;
  const received = req.headers['x-internal-token'];
  if (!expected || !received || !safeEqual(received, expected)) {
    return next(new AppError(401, 'UNAUTHORIZED_INTERNAL', 'Direct access to this service is not allowed'));
  }
  return next();
};
