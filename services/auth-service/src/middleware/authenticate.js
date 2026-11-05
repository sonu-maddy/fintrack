const { AppError } = require('../utils/errors');
const { verifyAccessToken } = require('../services/tokenService');

// Defence in depth: the gateway already verified the JWT, the service checks it again.
module.exports = (req, _res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
  try {
    req.userId = verifyAccessToken(token).sub;
    return next();
  } catch (err) {
    const expired = err.name === 'TokenExpiredError';
    return next(new AppError(401, expired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN', expired ? 'Access token expired' : 'Invalid access token'));
  }
};
