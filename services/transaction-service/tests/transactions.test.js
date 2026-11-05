process.env.NODE_ENV = 'test';
process.env.INTERNAL_TOKEN = 'test-internal-token';

jest.mock('../src/events/publisher', () => ({
  connect: jest.fn(),
  publish: jest.fn().mockResolvedValue(true),
  isConnected: jest.fn().mockReturnValue(true),
  close: jest.fn(),
}));

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const publisher = require('../src/events/publisher');

let mongod;
let app;
let Transaction;

const USER_A = 'user-a';
const USER_B = 'user-b';
const call = (method, path, userId = USER_A) => {
  const req = request(app)[method](path).set('x-internal-token', process.env.INTERNAL_TOKEN);
  return userId ? req.set('x-user-id', userId) : req;
};
const valid = { amount: 1500.5, type: 'expense', category: 'Food', date: '2026-10-15', note: 'Groceries' };
const make = (over = {}, userId = USER_A) => call('post', '/transactions', userId).send({ ...valid, ...over });

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  app = require('../src/app');
  Transaction = require('../src/models/Transaction');
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await Transaction.deleteMany({});
  publisher.publish.mockClear();
});

describe('create', () => {
  it('creates an income transaction and does not publish an event', async () => {
    const res = await make({ type: 'income', category: 'Salary', amount: 85000 });
    expect(res.status).toBe(201);
    expect(res.body.data.transaction).toMatchObject({ amount: 85000, type: 'income', category: 'Salary', date: '2026-10-15' });
    expect(publisher.publish).not.toHaveBeenCalled();
  });

  it('creates an expense and publishes expense.created', async () => {
    const res = await make();
    expect(res.status).toBe(201);
    expect(res.body.data.transaction.amount).toBe(1500.5);
    await new Promise((r) => setImmediate(r));
    expect(publisher.publish).toHaveBeenCalledTimes(1);
    const [key, payload] = publisher.publish.mock.calls[0];
    expect(key).toBe('expense.created');
    expect(payload).toMatchObject({
      transactionId: res.body.data.transaction.id,
      userId: USER_A,
      amount: 1500.5,
      category: 'Food',
      date: '2026-10-15',
    });
  });

  it('still returns 201 when the broker is down', async () => {
    publisher.publish.mockResolvedValueOnce(false);
    const res = await make();
    expect(res.status).toBe(201);
  });

  it.each([
    ['zero amount', { amount: 0 }],
    ['negative amount', { amount: -5 }],
    ['string amount', { amount: '100' }],
    ['3 decimal places', { amount: 10.123 }],
    ['bad type', { type: 'transfer' }],
    ['unknown category', { category: 'Gold' }],
    ['income category on an expense', { category: 'Salary' }],
    ['invalid date', { date: '2026-02-31' }],
    ['malformed date', { date: '15/10/2026' }],
  ])('rejects %s', async (_name, over) => {
    const res = await make(over);
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ success: false, error: { code: 'VALIDATION_ERROR' } });
  });

  it('requires a user (no x-user-id)', async () => {
    const res = await call('post', '/transactions', null).send(valid);
    expect(res.status).toBe(401);
  });
});

describe('update and delete', () => {
  it('updates a transaction', async () => {
    const { body } = await make();
    const id = body.data.transaction.id;
    const res = await call('put', `/transactions/${id}`).send({ ...valid, amount: 99, note: 'Changed' });
    expect(res.status).toBe(200);
    expect(res.body.data.transaction).toMatchObject({ amount: 99, note: 'Changed' });
  });

  it('deletes a transaction', async () => {
    const { body } = await make();
    const id = body.data.transaction.id;
    expect((await call('delete', `/transactions/${id}`)).status).toBe(200);
    expect((await call('get', `/transactions/${id}`)).status).toBe(404);
  });

  it('returns 404 for a malformed id', async () => {
    expect((await call('delete', '/transactions/not-an-id')).status).toBe(404);
  });
});

describe('ownership', () => {
  it("does not let another user read, update or delete someone else's transaction", async () => {
    const { body } = await make();
    const id = body.data.transaction.id;
    expect((await call('get', `/transactions/${id}`, USER_B)).status).toBe(404);
    expect((await call('put', `/transactions/${id}`, USER_B).send(valid)).status).toBe(404);
    expect((await call('delete', `/transactions/${id}`, USER_B)).status).toBe(404);
    expect((await call('get', `/transactions/${id}`, USER_A)).status).toBe(200);
  });

  it('only lists the current users transactions', async () => {
    await make({}, USER_A);
    await make({}, USER_B);
    const res = await call('get', '/transactions', USER_A);
    expect(res.body.data.total).toBe(1);
  });
});

describe('listing, filters and pagination', () => {
  beforeEach(async () => {
    await make({ type: 'income', category: 'Salary', amount: 50000, date: '2026-10-01', note: 'October salary' });
    await make({ type: 'expense', category: 'Rent', amount: 15000, date: '2026-10-02', note: 'Rent' });
    await make({ type: 'expense', category: 'Food', amount: 500, date: '2026-10-10', note: 'Lunch with team' });
    await make({ type: 'expense', category: 'Food', amount: 700, date: '2026-09-28', note: 'Dinner' });
    await make({ type: 'expense', category: 'Transport', amount: 300, date: '2026-09-30', note: 'Cab' });
  });

  it('filters by month (boundaries are inclusive of the first and last day)', async () => {
    const oct = await call('get', '/transactions?month=2026-10');
    expect(oct.body.data.total).toBe(3);
    const sep = await call('get', '/transactions?month=2026-09');
    expect(sep.body.data.total).toBe(2);
  });

  it('filters by type and category', async () => {
    expect((await call('get', '/transactions?type=income')).body.data.total).toBe(1);
    expect((await call('get', '/transactions?category=Food')).body.data.total).toBe(2);
    expect((await call('get', '/transactions?month=2026-10&type=expense&category=Food')).body.data.total).toBe(1);
  });

  it('searches notes safely (regex characters are escaped)', async () => {
    expect((await call('get', '/transactions?q=lunch')).body.data.total).toBe(1);
    expect((await call('get', '/transactions?q=.*')).body.data.total).toBe(0);
  });

  it('paginates and sorts', async () => {
    const p1 = await call('get', '/transactions?limit=2&page=1&sort=-amount');
    expect(p1.body.data).toMatchObject({ page: 1, limit: 2, total: 5, totalPages: 3 });
    expect(p1.body.data.items.map((t) => t.amount)).toEqual([50000, 15000]);
    const p3 = await call('get', '/transactions?limit=2&page=3&sort=-amount');
    expect(p3.body.data.items).toHaveLength(1);
  });

  it('rejects invalid query parameters (including operator injection)', async () => {
    expect((await call('get', '/transactions?month=2026-13')).status).toBe(400);
    expect((await call('get', '/transactions?limit=1000')).status).toBe(400);
    expect((await call('get', '/transactions?type[$ne]=income')).status).toBe(400);
  });
});

describe('monthly summary', () => {
  beforeEach(async () => {
    await make({ type: 'income', category: 'Salary', amount: 50000, date: '2026-10-01' });
    await make({ type: 'income', category: 'Freelance', amount: 10000.5, date: '2026-10-12' });
    await make({ type: 'expense', category: 'Rent', amount: 15000, date: '2026-10-02' });
    await make({ type: 'expense', category: 'Food', amount: 4999.5, date: '2026-10-10' });
    await make({ type: 'expense', category: 'Food', amount: 5000, date: '2026-10-20' });
    await make({ type: 'expense', category: 'Food', amount: 777, date: '2026-09-20' }); // other month
  });

  it('calculates totals, balance and the category breakdown', async () => {
    const res = await call('get', '/transactions/summary?month=2026-10');
    expect(res.status).toBe(200);
    const s = res.body.data;
    expect(s.totalIncome).toBe(60000.5);
    expect(s.totalExpense).toBe(24999.5);
    expect(s.balance).toBe(35001);
    expect(s.byCategory[0]).toMatchObject({ category: 'Food', total: 9999.5, count: 2 });
    expect(s.byCategory[1]).toMatchObject({ category: 'Rent', total: 15000 });
    expect(s.byCategory.reduce((a, c) => a + c.total, 0)).toBeCloseTo(s.totalExpense, 2);
  });

  it('returns zeros for an empty month and validates the month', async () => {
    const empty = await call('get', '/transactions/summary?month=2025-01');
    expect(empty.body.data).toMatchObject({ totalIncome: 0, totalExpense: 0, balance: 0, byCategory: [] });
    expect((await call('get', '/transactions/summary')).status).toBe(400);
  });

  it("does not include another user's data", async () => {
    const res = await call('get', '/transactions/summary?month=2026-10', USER_B);
    expect(res.body.data.totalIncome).toBe(0);
  });

  it('returns a monthly trend with empty months filled in', async () => {
    const res = await call('get', '/transactions/trend?months=3&to=2026-10');
    expect(res.body.data.months).toEqual([
      { month: '2026-08', income: 0, expense: 0 },
      { month: '2026-09', income: 0, expense: 777 },
      { month: '2026-10', income: 60000.5, expense: 24999.5 },
    ]);
  });
});
