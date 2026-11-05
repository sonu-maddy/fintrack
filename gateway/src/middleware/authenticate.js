const jwt = require('jsonwebtoken');
const config = require('../config');
const { sendError } = require('../utils/apiError');

// Verifies the access token. Downstream services only ever see the verified user id.
module.exports = (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) return sendError(req, res, 401, 'UNAUTHORIZED', 'Authentication required');
  try {
    req.userId = jwt.verify(token, config.accessSecret).sub;
    return next();
  } catch (err) {
    return err.name === 'TokenExpiredError'
      ? sendError(req, res, 401, 'TOKEN_EXPIRED', 'Access token expired')
      : sendError(req, res, 401, 'INVALID_TOKEN', 'Invalid access token');
  }
};
