const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true },
    thresholdPaise: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Setting', settingSchema);
