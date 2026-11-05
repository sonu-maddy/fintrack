const asyncHandler = require('../utils/asyncHandler');
const service = require('../services/notificationService');
const { thresholdBody, listQuery } = require('../validation/schemas');

exports.list = asyncHandler(async (req, res) => {
  const query = listQuery.parse(req.query);
  res.json({ success: true, data: await service.list(req.userId, query) });
});

exports.markRead = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { notification: await service.markRead(req.userId, req.params.id) } });
});

exports.markAllRead = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.markAllRead(req.userId) });
});

exports.getThreshold = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.getThreshold(req.userId) });
});

exports.setThreshold = asyncHandler(async (req, res) => {
  const { threshold } = thresholdBody.parse(req.body);
  res.json({ success: true, data: await service.setThreshold(req.userId, threshold) });
});
