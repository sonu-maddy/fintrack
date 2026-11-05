const mongoose = require('mongoose');

// Money is stored as integer paise to avoid floating point errors; the API speaks rupees.
const transactionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    amountPaise: { type: Number, required: true, min: 1, validate: Number.isInteger },
    type: { type: String, enum: ['income', 'expense'], required: true },
    category: { type: String, required: true },
    date: { type: Date, required: true }, // date-only value stored at 00:00 UTC
    note: { type: String, default: '', maxlength: 200 },
  },
  { timestamps: true },
);

transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, type: 1, category: 1 });

transactionSchema.set('toJSON', {
  transform: (_doc, ret) => ({
    id: ret._id.toString(),
    amount: ret.amountPaise / 100,
    type: ret.type,
    category: ret.category,
    date: ret.date.toISOString().slice(0, 10),
    note: ret.note,
    createdAt: ret.createdAt,
    updatedAt: ret.updatedAt,
  }),
});

module.exports = mongoose.model('Transaction', transactionSchema);
