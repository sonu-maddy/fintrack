const { randomUUID } = require('crypto');

// Generate a request id, or accept a well-formed one from the caller.
module.exports = (req, res, next) => {
  const incoming = req.headers['x-request-id'];
  req.id = typeof incoming === 'string' && /^[\w-]{8,64}$/.test(incoming) ? incoming : randomUUID();
  req.headers['x-request-id'] = req.id;
  res.setHeader('x-request-id', req.id);
  next();
};
