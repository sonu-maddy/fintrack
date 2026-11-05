const bcrypt = require('bcryptjs');
const User = require('../models/User');
const config = require('../config');
const { AppError } = require('../utils/errors');
const tokens = require('./tokenService');

async function register({ name, email, password }) {
  const exists = await User.exists({ email });
  if (exists) throw new AppError(409, 'EMAIL_EXISTS', 'An account with this email already exists');
  const passwordHash = await bcrypt.hash(password, config.bcryptRounds);
  try {
    return await User.create({ name, email, passwordHash });
  } catch (err) {
    if (err.code === 11000) throw new AppError(409, 'EMAIL_EXISTS', 'An account with this email already exists');
    throw err;
  }
}

async function login({ email, password }) {
  const user = await User.findOne({ email });
  // Same error for unknown email and wrong password, so accounts cannot be enumerated.
  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) throw new AppError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password');
  const accessToken = tokens.signAccessToken(user);
  const refresh = await tokens.issueRefreshToken(user._id);
  return { user, accessToken, refreshToken: refresh.token };
}

async function refresh(refreshToken) {
  if (!refreshToken) throw new AppError(401, 'NO_REFRESH_TOKEN', 'No refresh token provided');
  const rotated = await tokens.rotateRefreshToken(refreshToken);
  const user = await User.findById(rotated.userId);
  if (!user) throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'User no longer exists');
  return { user, accessToken: tokens.signAccessToken(user), refreshToken: rotated.token };
}

module.exports = { register, login, refresh, logout: tokens.revokeRefreshToken };
