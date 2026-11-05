const config = require('../config');

const NAME = 'refreshToken';

// HttpOnly: JavaScript cannot read it. Path is scoped to the auth routes as the browser sees them.
const baseOptions = () => ({
  httpOnly: true,
  secure: config.cookie.secure,
  sameSite: config.cookie.sameSite,
  path: '/api/auth',
});

const setRefreshCookie = (res, token) =>
  res.cookie(NAME, token, { ...baseOptions(), maxAge: config.refreshTtlDays * 24 * 60 * 60 * 1000 });

const clearRefreshCookie = (res) => res.clearCookie(NAME, baseOptions());

module.exports = { NAME, setRefreshCookie, clearRefreshCookie };
