const { AppError } = require('../utils/errors');

// The gateway verifies the JWT and forwards the user id in x-user-id.
module.exports = (req, _res, next) => {
  const id = req.headers['x-user-id'];
  if (!id || typeof id !== 'string') {
    return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
  }
  req.userId = id;
  return next();
};
