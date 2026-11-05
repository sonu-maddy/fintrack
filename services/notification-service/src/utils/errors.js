class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const notFound = (message = 'Resource not found') => new AppError(404, 'NOT_FOUND', message);

module.exports = { AppError, notFound };
