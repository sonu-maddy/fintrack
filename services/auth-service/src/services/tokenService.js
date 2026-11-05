const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const RefreshToken = require('../models/RefreshToken');
const config = require('../config');
const { AppError } = require('../utils/errors');

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

const signAccessToken = (user) =>
  jwt.sign({ email: user.email }, config.accessSecret, {
    subject: String(user._id),
    expiresIn: config.accessTtl,
  });

const verifyAccessToken = (token) => jwt.verify(token, config.accessSecret);

async function issueRefreshToken(userId, familyId = crypto.randomUUID()) {
  const token = crypto.randomBytes(48).toString('hex');
  const doc = await RefreshToken.create({
    userId,
    familyId,
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + config.refreshTtlDays * 24 * 60 * 60 * 1000),
  });
  return { token, doc };
}

const reuseError = () =>
  new AppError(401, 'REFRESH_TOKEN_REUSED', 'Session is no longer valid, please log in again');

// Rotation: each refresh token is single-use. Using an old one revokes the whole family.
async function rotateRefreshToken(token) {
  const current = await RefreshToken.findOne({ tokenHash: sha256(token) });
  if (!current) throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Invalid refresh token');

  if (current.revokedAt) {
    await RefreshToken.updateMany({ familyId: current.familyId, revokedAt: null }, { revokedAt: new Date() });
    throw reuseError();
  }
  if (current.expiresAt <= new Date()) {
    throw new AppError(401, 'REFRESH_TOKEN_EXPIRED', 'Refresh token expired, please log in again');
  }

  // Atomic revoke: if two requests race, only one wins.
  const revoked = await RefreshToken.findOneAndUpdate(
    { _id: current._id, revokedAt: null },
    { revokedAt: new Date() },
  );
  if (!revoked) throw reuseError();

  const next = await issueRefreshToken(current.userId, current.familyId);
  await RefreshToken.updateOne({ _id: current._id }, { replacedBy: next.doc._id });
  return { userId: current.userId, token: next.token };
}

async function revokeRefreshToken(token) {
  if (!token) return;
  await RefreshToken.updateOne({ tokenHash: sha256(token), revokedAt: null }, { revokedAt: new Date() });
}

module.exports = { signAccessToken, verifyAccessToken, issueRefreshToken, rotateRefreshToken, revokeRefreshToken };
