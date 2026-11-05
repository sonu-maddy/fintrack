const list = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean);

const config = {
  get port() { return Number(process.env.PORT) || 8080; },
  get accessSecret() { return process.env.JWT_ACCESS_SECRET; },
  get internalToken() { return process.env.INTERNAL_TOKEN; },
  get corsOrigins() { return list(process.env.CORS_ORIGINS); },
  get rateLimitMax() { return Number(process.env.RATE_LIMIT_MAX) || 200; },
  get authRateLimitMax() { return Number(process.env.AUTH_RATE_LIMIT_MAX) || 30; },
  get proxyTimeoutMs() { return Number(process.env.PROXY_TIMEOUT_MS) || 60000; },
  services: {
    get auth() { return process.env.AUTH_SERVICE_URL; },
    get transactions() { return process.env.TRANSACTION_SERVICE_URL; },
    get notifications() { return process.env.NOTIFICATION_SERVICE_URL; },
  },
  validate() {
    const required = ['JWT_ACCESS_SECRET', 'INTERNAL_TOKEN', 'AUTH_SERVICE_URL', 'TRANSACTION_SERVICE_URL', 'NOTIFICATION_SERVICE_URL'];
    const missing = required.filter((k) => !process.env[k]);
    if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    if (process.env.JWT_ACCESS_SECRET.length < 32) throw new Error('JWT_ACCESS_SECRET must be at least 32 characters');
  },
};

module.exports = config;
