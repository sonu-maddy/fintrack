const asyncHandler = require('../utils/asyncHandler');
const service = require('../services/transactionService');
const { transactionBody, listQuery, summaryQuery, trendQuery } = require('../validation/schemas');
const { publishExpenseCreated } = require('../events/expenseEvents');

exports.list = asyncHandler(async (req, res) => {
  const query = listQuery.parse(req.query);
  res.json({ success: true, data: await service.list(req.userId, query) });
});

exports.create = asyncHandler(async (req, res) => {
  const input = transactionBody.parse(req.body);
  const tx = await service.create(req.userId, input);
  if (tx.type === 'expense') publishExpenseCreated(tx, req.id); // async, not awaited
  res.status(201).json({ success: true, data: { transaction: tx } });
});

exports.getOne = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { transaction: await service.getOne(req.userId, req.params.id) } });
});

exports.update = asyncHandler(async (req, res) => {
  const input = transactionBody.parse(req.body);
  res.json({ success: true, data: { transaction: await service.update(req.userId, req.params.id, input) } });
});

exports.remove = asyncHandler(async (req, res) => {
  await service.remove(req.userId, req.params.id);
  res.json({ success: true, data: { message: 'Transaction deleted' } });
});

exports.summary = asyncHandler(async (req, res) => {
  const { month } = summaryQuery.parse(req.query);
  res.json({ success: true, data: await service.summary(req.userId, month) });
});

exports.trend = asyncHandler(async (req, res) => {
  const query = trendQuery.parse(req.query);
  res.json({ success: true, data: { months: await service.trend(req.userId, query) } });
});
