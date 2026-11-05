const { ZodError } = require('zod');
const logger = require('../config/logger');
const { AppError } = require('../utils/errors');

const notFoundHandler = (_req, _res, next) => next(new AppError(404, 'ROUTE_NOT_FOUND', 'Route not found'));

// One consistent error format for the whole system.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Something went wrong';
  let details;

  if (err instanceof AppError) {
    ({ status, code, message, details } = err);
  } else if (err instanceof ZodError) {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
  } else if (err && err.type === 'entity.parse.failed') {
    status = 400;
    code = 'INVALID_JSON';
    message = 'Malformed JSON body';
  } else if (err && err.type === 'entity.too.large') {
    status = 413;
    code = 'PAYLOAD_TOO_LARGE';
    message = 'Request body too large';
  } else if (err && err.code === 11000) {
    status = 409;
    code = 'DUPLICATE';
    message = 'Resource already exists';
  } else if (err && err.name === 'CastError') {
    status = 400;
    code = 'INVALID_ID';
    message = 'Invalid identifier';
  }

  if (status >= 500) {
    (req.log || logger).error({ err: { message: err && err.message, stack: err && err.stack } }, 'Unhandled error');
  }

  res.status(status).json({
    success: false,
    message,
    error: { code, ...(details ? { details } : {}) },
    requestId: req.id,
  });
};

module.exports = { errorHandler, notFoundHandler };
