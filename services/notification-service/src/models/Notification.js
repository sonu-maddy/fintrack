const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    // Unique event id = idempotency guard: the same event can never create two notifications.
    eventId: { type: String, required: true, unique: true },
    transactionId: { type: String, required: true },
    type: { type: String, default: 'expense_threshold' },
    message: { type: String, required: true },
    amountPaise: { type: Number, required: true },
    category: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

notificationSchema.set('toJSON', {
  transform: (_doc, ret) => ({
    id: ret._id.toString(),
    type: ret.type,
    message: ret.message,
    amount: ret.amountPaise / 100,
    category: ret.category,
    transactionId: ret.transactionId,
    read: ret.read,
    createdAt: ret.createdAt,
  }),
});

module.exports = mongoose.model('Notification', notificationSchema);
