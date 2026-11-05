const mongoose = require('mongoose');

// Only a SHA-256 hash of the token is stored, never the token itself.
const refreshTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  familyId: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }, // TTL index cleans up expired tokens
  revokedAt: { type: Date, default: null },
  replacedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
}, { timestamps: true });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
