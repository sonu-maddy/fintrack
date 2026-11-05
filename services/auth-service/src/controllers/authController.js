const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/errors');
const User = require('../models/User');
const authService = require('../services/authService');
const { registerSchema, loginSchema } = require('../validation/schemas');
const cookies = require('../utils/cookies');

const session = (res, { user, accessToken, refreshToken }) => {
  cookies.setRefreshCookie(res, refreshToken);
  res.json({ success: true, data: { user, accessToken, tokenType: 'Bearer' } });
};

exports.register = asyncHandler(async (req, res) => {
  const input = registerSchema.parse(req.body);
  const user = await authService.register(input);
  res.status(201).json({ success: true, data: { user } });
});

exports.login = asyncHandler(async (req, res) => {
  const input = loginSchema.parse(req.body);
  session(res, await authService.login(input));
});

exports.refresh = asyncHandler(async (req, res) => {
  try {
    session(res, await authService.refresh(req.cookies[cookies.NAME]));
  } catch (err) {
    cookies.clearRefreshCookie(res);
    throw err;
  }
});

exports.logout = asyncHandler(async (req, res) => {
  await authService.logout(req.cookies[cookies.NAME]);
  cookies.clearRefreshCookie(res);
  res.json({ success: true, data: { message: 'Logged out' } });
});

exports.me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  res.json({ success: true, data: { user } });
});
