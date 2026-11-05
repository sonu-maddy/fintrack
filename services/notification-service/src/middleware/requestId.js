const { randomUUID } = require('crypto');

// Reuse the request id created by the gateway, or create one if missing/invalid.
module.exports = (req, res, next) => {
  const incoming = req.headers['x-request-id'];
  req.id = typeof incoming === 'string' && /^[\w-]{8,64}$/.test(incoming) ? incoming : randomUUID();
  res.setHeader('x-request-id', req.id);
  next();
};
