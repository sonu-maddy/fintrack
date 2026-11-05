process.env.NODE_ENV = 'test';
process.env.INTERNAL_TOKEN = 'test-internal-token';

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let app;
let Notification;
let Setting;
let consumer;
let service;

const USER_A = 'user-a';
const USER_B = 'user-b';
const call = (method, path, userId = USER_A) =>
  request(app)[method](path).set('x-internal-token', process.env.INTERNAL_TOKEN).set('x-user-id', userId);

const event = (over = {}) => ({
  eventId: 'expense.created:tx1',
  transactionId: 'tx1',
  userId: USER_A,
  amount: 12000,
  category: 'Rent',
  date: '2026-11-04',
  ...over,
});
const message = (payload, headers = {}) => ({
  content: Buffer.from(typeof payload === 'string' ? payload : JSON.stringify(payload)),
  properties: { headers },
});
const fakeChannel = () => ({ ack: jest.fn(), sendToQueue: jest.fn() });

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  app = require('../src/app');
  Notification = require('../src/models/Notification');
  Setting = require('../src/models/Setting');
  consumer = require('../src/consumers/expenseConsumer');
  service = require('../src/services/notificationService');
  await Notification.init();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await Notification.deleteMany({});
  await Setting.deleteMany({});
});

describe('threshold comparison', () => {
  it('creates a notification when an expense exceeds the default threshold of 10,000', async () => {
    const result = await service.handleExpenseCreated(event({ amount: 12000 }));
    expect(result.created).toBe(true);
    const saved = await Notification.findOne({ userId: USER_A });
    expect(saved.message).toContain('12,000');
    expect(saved.read).toBe(false);
  });

  it('does not notify when the amount equals or is below the threshold', async () => {
    expect((await service.handleExpenseCreated(event({ eventId: 'a', amount: 10000 }))).created).toBe(false);
    expect((await service.handleExpenseCreated(event({ eventId: 'b', amount: 500 }))).created).toBe(false);
    expect(await Notification.countDocuments()).toBe(0);
  });

  it("respects the user's own threshold", async () => {
    await call('put', '/settings/threshold').send({ threshold: 500 });
    const result = await service.handleExpenseCreated(event({ amount: 800 }));
    expect(result.created).toBe(true);
    // Another user without a custom setting still uses the default.
    const other = await service.handleExpenseCreated(event({ eventId: 'x', userId: USER_B, amount: 800 }));
    expect(other.created).toBe(false);
  });
});

describe('event consumption', () => {
  it('acknowledges a processed message and creates the notification', async () => {
    const ch = fakeChannel();
    const msg = message(event());
    await consumer.processMessage(ch, msg);
    expect(ch.ack).toHaveBeenCalledWith(msg);
    expect(await Notification.countDocuments({ userId: USER_A })).toBe(1);
  });

  it('handles duplicate events idempotently', async () => {
    const ch = fakeChannel();
    await consumer.processMessage(ch, message(event()));
    await consumer.processMessage(ch, message(event()));
    expect(ch.ack).toHaveBeenCalledTimes(2);
    expect(await Notification.countDocuments()).toBe(1);
  });

  it('sends malformed messages to the dead-letter queue', async () => {
    const ch = fakeChannel();
    await consumer.processMessage(ch, message('not json'));
    expect(ch.sendToQueue).toHaveBeenCalledWith(consumer.DEAD_QUEUE, expect.any(Buffer), expect.any(Object));
    expect(ch.ack).toHaveBeenCalled();
  });

  it('retries failures, then dead-letters after the maximum attempts', async () => {
    const spy = jest.spyOn(Notification, 'create').mockRejectedValue(new Error('db down'));

    const first = fakeChannel();
    await consumer.processMessage(first, message(event(), { 'x-attempts': 0 }));
    expect(first.sendToQueue).toHaveBeenCalledWith(
      consumer.RETRY_QUEUE,
      expect.any(Buffer),
      expect.objectContaining({ headers: expect.objectContaining({ 'x-attempts': 1 }) }),
    );

    const last = fakeChannel();
    await consumer.processMessage(last, message(event(), { 'x-attempts': consumer.MAX_ATTEMPTS - 1 }));
    expect(last.sendToQueue).toHaveBeenCalledWith(consumer.DEAD_QUEUE, expect.any(Buffer), expect.any(Object));
    expect(last.ack).toHaveBeenCalled();

    spy.mockRestore();
  });
});

describe('notification API', () => {
  it('lists notifications with the unread count and marks one as read', async () => {
    await service.handleExpenseCreated(event({ eventId: 'e1', amount: 15000 }));
    await service.handleExpenseCreated(event({ eventId: 'e2', amount: 20000 }));

    const list = await call('get', '/notifications');
    expect(list.status).toBe(200);
    expect(list.body.data.unreadCount).toBe(2);
    expect(list.body.data.items).toHaveLength(2);

    const id = list.body.data.items[0].id;
    const read = await call('patch', `/notifications/${id}/read`);
    expect(read.status).toBe(200);
    expect(read.body.data.notification.read).toBe(true);

    const after = await call('get', '/notifications?unread=true');
    expect(after.body.data.unreadCount).toBe(1);
    expect(after.body.data.items).toHaveLength(1);
  });

  it("cannot read or mark another user's notification", async () => {
    await service.handleExpenseCreated(event({ eventId: 'e1', amount: 15000 }));
    const id = (await call('get', '/notifications')).body.data.items[0].id;
    expect((await call('patch', `/notifications/${id}/read`, USER_B)).status).toBe(404);
    expect((await call('get', '/notifications', USER_B)).body.data.total).toBe(0);
  });

  it('marks all as read', async () => {
    await service.handleExpenseCreated(event({ eventId: 'e1', amount: 15000 }));
    await service.handleExpenseCreated(event({ eventId: 'e2', amount: 20000 }));
    const res = await call('patch', '/notifications/read-all');
    expect(res.body.data.updated).toBe(2);
    expect((await call('get', '/notifications')).body.data.unreadCount).toBe(0);
  });

  it('gets and sets the threshold with validation', async () => {
    expect((await call('get', '/settings/threshold')).body.data).toEqual({ threshold: 10000, isDefault: true });
    const put = await call('put', '/settings/threshold').send({ threshold: 2500 });
    expect(put.body.data).toEqual({ threshold: 2500, isDefault: false });
    expect((await call('get', '/settings/threshold')).body.data.threshold).toBe(2500);
    expect((await call('put', '/settings/threshold').send({ threshold: -1 })).status).toBe(400);
    expect((await call('put', '/settings/threshold').send({ threshold: 'abc' })).status).toBe(400);
  });

  it('requires a user', async () => {
    const res = await request(app).get('/notifications').set('x-internal-token', process.env.INTERNAL_TOKEN);
    expect(res.status).toBe(401);
  });
});
