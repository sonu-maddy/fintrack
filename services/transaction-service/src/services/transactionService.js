const Transaction = require('../models/Transaction');
const { notFound } = require('../utils/errors');
const { monthRange, currentMonth, lastMonths } = require('../utils/dates');

const OBJECT_ID = /^[a-f\d]{24}$/i;
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toDoc = (userId, input) => ({
  userId,
  amountPaise: Math.round(input.amount * 100),
  type: input.type,
  category: input.category,
  date: new Date(`${input.date}T00:00:00Z`),
  note: input.note || '',
});

// Every query below is scoped by userId: users can never touch each other's data.
async function findOwned(userId, id) {
  if (!OBJECT_ID.test(id)) throw notFound('Transaction not found');
  const tx = await Transaction.findOne({ _id: id, userId });
  if (!tx) throw notFound('Transaction not found');
  return tx;
}

const create = (userId, input) => Transaction.create(toDoc(userId, input));

const getOne = (userId, id) => findOwned(userId, id);

async function update(userId, id, input) {
  const tx = await findOwned(userId, id);
  Object.assign(tx, toDoc(userId, input));
  return tx.save();
}

async function remove(userId, id) {
  const tx = await findOwned(userId, id);
  await tx.deleteOne();
}

async function list(userId, query) {
  const filter = { userId };
  if (query.month) {
    const { start, end } = monthRange(query.month);
    filter.date = { $gte: start, $lt: end };
  }
  if (query.type) filter.type = query.type;
  if (query.category) filter.category = query.category;
  if (query.q) filter.note = { $regex: escapeRegex(query.q), $options: 'i' };

  const sortField = query.sort.replace('-', '');
  const sort = { [sortField]: query.sort.startsWith('-') ? -1 : 1, _id: -1 };

  const [items, total] = await Promise.all([
    Transaction.find(filter).sort(sort).skip((query.page - 1) * query.limit).limit(query.limit),
    Transaction.countDocuments(filter),
  ]);

  return { items, page: query.page, limit: query.limit, total, totalPages: Math.max(1, Math.ceil(total / query.limit)) };
}

async function summary(userId, month) {
  const { start, end } = monthRange(month);
  const rows = await Transaction.aggregate([
    { $match: { userId, date: { $gte: start, $lt: end } } },
    { $group: { _id: { type: '$type', category: '$category' }, total: { $sum: '$amountPaise' }, count: { $sum: 1 } } },
  ]);

  let income = 0;
  let expense = 0;
  let count = 0;
  const expenseRows = [];
  const incomeRows = [];
  rows.forEach((r) => {
    count += r.count;
    if (r._id.type === 'income') {
      income += r.total;
      incomeRows.push({ category: r._id.category, total: r.total, count: r.count });
    } else {
      expense += r.total;
      expenseRows.push({ category: r._id.category, total: r.total, count: r.count });
    }
  });

  const shape = (list, base) =>
    list
      .sort((a, b) => b.total - a.total)
      .map((r) => ({
        category: r.category,
        total: r.total / 100,
        count: r.count,
        percentage: base ? Math.round((r.total / base) * 1000) / 10 : 0,
      }));

  return {
    month,
    totalIncome: income / 100,
    totalExpense: expense / 100,
    balance: (income - expense) / 100,
    transactionCount: count,
    byCategory: shape(expenseRows, expense), // category-wise expense breakdown
    incomeByCategory: shape(incomeRows, income),
  };
}

async function trend(userId, { months, to }) {
  const keys = lastMonths(to || currentMonth(), months);
  const start = monthRange(keys[0]).start;
  const end = monthRange(keys[keys.length - 1]).end;
  const rows = await Transaction.aggregate([
    { $match: { userId, date: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: { month: { $dateToString: { format: '%Y-%m', date: '$date' } }, type: '$type' },
        total: { $sum: '$amountPaise' },
      },
    },
  ]);
  const byMonth = Object.fromEntries(keys.map((k) => [k, { month: k, income: 0, expense: 0 }]));
  rows.forEach((r) => {
    if (byMonth[r._id.month]) byMonth[r._id.month][r._id.type] = r.total / 100;
  });
  return keys.map((k) => byMonth[k]);
}

module.exports = { create, getOne, update, remove, list, summary, trend };
