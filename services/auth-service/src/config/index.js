// Values are read lazily so tests can set process.env before first use.
const config = {
  get port() { return Number(process.env.PORT) || 4001; },
  get mongoUri() { return process.env.MONGO_URI; },
  get accessSecret() { return process.env.JWT_ACCESS_SECRET; },
  get accessTtl() { return process.env.ACCESS_TOKEN_TTL || '15m'; },
  get refreshTtlDays() { return Number(process.env.REFRESH_TOKEN_TTL_DAYS) || 7; },
  get bcryptRounds() { return Number(process.env.BCRYPT_ROUNDS) || 12; },
  get loginMaxAttempts() { return Number(process.env.LOGIN_MAX_ATTEMPTS) || 5; },
  get cookie() {
    return {
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: process.env.COOKIE_SAMESITE || 'lax',
    };
  },
  validate() {
    const missing = ['MONGO_URI', 'JWT_ACCESS_SECRET', 'INTERNAL_TOKEN'].filter((k) => !process.env[k]);
    if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    if (process.env.JWT_ACCESS_SECRET.length < 32) throw new Error('JWT_ACCESS_SECRET must be at least 32 characters');
  },
};

module.exports = config;
