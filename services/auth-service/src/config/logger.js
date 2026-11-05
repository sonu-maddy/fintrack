const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'test' ? 'silent' : 'info'),
  base: { service: 'auth-service' },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'password', '*.password',
      'accessToken', '*.accessToken',
      'refreshToken', '*.refreshToken',
      'req.headers.authorization', 'req.headers.cookie',
    ],
    censor: '[REDACTED]',
  },
});

module.exports = logger;
