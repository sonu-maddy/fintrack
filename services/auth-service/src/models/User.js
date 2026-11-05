const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true },
);

// Never leak the password hash.
userSchema.set('toJSON', {
  transform: (_doc, ret) => ({
    id: ret._id.toString(),
    name: ret.name,
    email: ret.email,
    createdAt: ret.createdAt,
  }),
});

module.exports = mongoose.model('User', userSchema);
