const pino = require('pino');

module.exports = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'test' ? 'silent' : 'info'),
  base: { service: 'gateway' },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: ['password', '*.password', 'accessToken', '*.accessToken', 'refreshToken', '*.refreshToken', 'req.headers.authorization', 'req.headers.cookie'],
    censor: '[REDACTED]',
  },
});
