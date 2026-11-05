const amqp = require('amqplib');
const config = require('../config');
const logger = require('../config/logger');
const { expenseEventSchema } = require('../validation/schemas');
const { handleExpenseCreated } = require('../services/notificationService');

const EXCHANGE = 'fintrack.events';
const MAIN_QUEUE = 'notifications.expense';
const RETRY_QUEUE = 'notifications.retry'; // waits 10s, then dead-letters back into MAIN_QUEUE
const DEAD_QUEUE = 'notifications.dlq'; // messages that failed MAX_ATTEMPTS times or are malformed
const RETRY_DELAY_MS = 10000;
const MAX_ATTEMPTS = 3;

let connection = null;
let stopping = false;
let reconnectTimer = null;
let attempt = 0;
let connected = false;

async function assertTopology(ch) {
  await ch.assertExchange(EXCHANGE, 'topic', { durable: true });
  await ch.assertQueue(DEAD_QUEUE, { durable: true });
  await ch.assertQueue(RETRY_QUEUE, {
    durable: true,
    arguments: {
      'x-message-ttl': RETRY_DELAY_MS,
      'x-dead-letter-exchange': '',
      'x-dead-letter-routing-key': MAIN_QUEUE,
    },
  });
  await ch.assertQueue(MAIN_QUEUE, { durable: true });
  await ch.bindQueue(MAIN_QUEUE, EXCHANGE, 'expense.created');
}

// Handles one message with manual ack. Exported so it can be tested with a fake channel.
async function processMessage(ch, msg) {
  if (!msg) return;
  const headers = msg.properties.headers || {};

  let event;
  try {
    event = expenseEventSchema.parse(JSON.parse(msg.content.toString()));
  } catch (err) {
    logger.error({ err: err.message }, 'Invalid event payload, moving to dead-letter queue');
    ch.sendToQueue(DEAD_QUEUE, msg.content, { persistent: true, headers: { ...headers, 'x-error': 'invalid payload' } });
    ch.ack(msg);
    return;
  }

  try {
    const result = await handleExpenseCreated(event);
    logger.info({ eventId: event.eventId, created: result.created, reason: result.reason }, 'expense.created processed');
    ch.ack(msg);
  } catch (err) {
    const attempts = Number(headers['x-attempts'] || 0) + 1;
    const target = attempts >= MAX_ATTEMPTS ? DEAD_QUEUE : RETRY_QUEUE;
    logger.error({ eventId: event.eventId, attempts, target, err: err.message }, 'Event processing failed');
    ch.sendToQueue(target, msg.content, {
      persistent: true,
      contentType: 'application/json',
      headers: { ...headers, 'x-attempts': attempts, 'x-error': err.message },
    });
    ch.ack(msg); // the failed copy is re-queued above, so the original can be acknowledged
  }
}

function scheduleReconnect() {
  if (stopping || reconnectTimer) return;
  const delay = Math.min(30000, 1000 * 2 ** attempt);
  attempt += 1;
  logger.warn({ delayMs: delay }, 'Scheduling RabbitMQ reconnect');
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    startConsumer();
  }, delay);
}

async function startConsumer() {
  if (!config.amqpUrl) {
    logger.warn('AMQP_URL is not set, consumer disabled');
    return;
  }
  try {
    connection = await amqp.connect(config.amqpUrl);
    connection.on('error', (err) => logger.error({ err: err.message }, 'RabbitMQ connection error'));
    connection.on('close', () => {
      connected = false;
      connection = null;
      scheduleReconnect();
    });
    const ch = await connection.createChannel();
    ch.on('error', (err) => logger.error({ err: err.message }, 'RabbitMQ channel error'));
    await assertTopology(ch);
    await ch.prefetch(10);
    await ch.consume(
      MAIN_QUEUE,
      (msg) => processMessage(ch, msg).catch((err) => logger.error({ err: err.message }, 'processMessage crashed')),
      { noAck: false },
    );
    connected = true;
    attempt = 0;
    logger.info('RabbitMQ consumer started');
  } catch (err) {
    logger.error({ err: err.message }, 'RabbitMQ consumer failed to start');
    scheduleReconnect();
  }
}

const isConnected = () => connected;

async function stopConsumer() {
  stopping = true;
  clearTimeout(reconnectTimer);
  try {
    if (connection) await connection.close();
  } catch (_err) { /* already closed */ }
}

module.exports = { startConsumer, stopConsumer, processMessage, isConnected, MAIN_QUEUE, RETRY_QUEUE, DEAD_QUEUE, MAX_ATTEMPTS };
