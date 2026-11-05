const Notification = require('../models/Notification');
const Setting = require('../models/Setting');
const config = require('../config');
const { notFound } = require('../utils/errors');

const OBJECT_ID = /^[a-f\d]{24}$/i;
const inr = (n) => `\u20B9${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)}`;

async function getThresholdPaise(userId) {
  const setting = await Setting.findOne({ userId });
  return setting ? setting.thresholdPaise : Math.round(config.defaultThreshold * 100);
}

async function getThreshold(userId) {
  const setting = await Setting.findOne({ userId });
  return {
    threshold: setting ? setting.thresholdPaise / 100 : config.defaultThreshold,
    isDefault: !setting,
  };
}

async function setThreshold(userId, threshold) {
  const setting = await Setting.findOneAndUpdate(
    { userId },
    { thresholdPaise: Math.round(threshold * 100) },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return { threshold: setting.thresholdPaise / 100, isDefault: false };
}

// Core business rule: alert only when a single expense is strictly above the user's threshold.
async function handleExpenseCreated(event) {
  const amountPaise = Math.round(event.amount * 100);
  const thresholdPaise = await getThresholdPaise(event.userId);
  if (amountPaise <= thresholdPaise) return { created: false, reason: 'below_threshold' };

  try {
    const notification = await Notification.create({
      userId: event.userId,
      eventId: event.eventId,
      transactionId: event.transactionId,
      message: `High expense: ${inr(event.amount)} on ${event.category} is above your ${inr(thresholdPaise / 100)} alert limit.`,
      amountPaise,
      category: event.category,
    });
    return { created: true, notification };
  } catch (err) {
    if (err.code === 11000) return { created: false, reason: 'duplicate' }; // already processed
    throw err;
  }
}

async function list(userId, { unread, page, limit }) {
  const filter = { userId };
  if (unread === 'true') filter.read = false;
  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ userId, read: false }),
  ]);
  return { items, page, limit, total, unreadCount };
}

async function markRead(userId, id) {
  if (!OBJECT_ID.test(id)) throw notFound('Notification not found');
  const n = await Notification.findOneAndUpdate({ _id: id, userId }, { read: true }, { new: true });
  if (!n) throw notFound('Notification not found');
  return n;
}

async function markAllRead(userId) {
  const result = await Notification.updateMany({ userId, read: false }, { read: true });
  return { updated: result.modifiedCount };
}

module.exports = { handleExpenseCreated, getThreshold, setThreshold, list, markRead, markAllRead };
