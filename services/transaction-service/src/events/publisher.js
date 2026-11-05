const amqp = require('amqplib');
const config = require('../config');
const logger = require('../config/logger');

const EXCHANGE = 'fintrack.events';

let connection = null;
let channel = null;
let stopping = false;
let reconnectTimer = null;
let attempt = 0;

function scheduleReconnect() {
  if (stopping || reconnectTimer) return;
  const delay = Math.min(30000, 1000 * 2 ** attempt);
  attempt += 1;
  logger.warn({ delayMs: delay }, 'Scheduling RabbitMQ reconnect');
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, delay);
}

async function connect() {
  if (!config.amqpUrl) {
    logger.warn('AMQP_URL is not set, events are disabled');
    return;
  }
  try {
    connection = await amqp.connect(config.amqpUrl);
    connection.on('error', (err) => logger.error({ err: err.message }, 'RabbitMQ connection error'));
    connection.on('close', () => {
      channel = null;
      connection = null;
      scheduleReconnect();
    });
    const ch = await connection.createConfirmChannel();
    ch.on('error', (err) => logger.error({ err: err.message }, 'RabbitMQ channel error'));
    await ch.assertExchange(EXCHANGE, 'topic', { durable: true });
    channel = ch;
    attempt = 0;
    logger.info('RabbitMQ publisher connected');
  } catch (err) {
    logger.error({ err: err.message }, 'RabbitMQ connection failed');
    scheduleReconnect();
  }
}

// Resolves true when the broker confirmed the message, false otherwise. Never throws.
function publish(routingKey, payload) {
  return new Promise((resolve) => {
    if (!channel) {
      logger.warn({ routingKey }, 'RabbitMQ not connected, event dropped');
      return resolve(false);
    }
    try {
      return channel.publish(
        EXCHANGE,
        routingKey,
        Buffer.from(JSON.stringify(payload)),
        { persistent: true, contentType: 'application/json', messageId: payload.eventId, timestamp: Date.now() },
        (err) => {
          if (err) {
            logger.error({ err: err.message, routingKey }, 'Broker did not confirm event');
            return resolve(false);
          }
          return resolve(true);
        },
      );
    } catch (err) {
      logger.error({ err: err.message }, 'Failed to publish event');
      return resolve(false);
    }
  });
}

const isConnected = () => Boolean(channel);

async function close() {
  stopping = true;
  clearTimeout(reconnectTimer);
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
  } catch (_err) { /* already closed */ }
}

module.exports = { connect, publish, isConnected, close, EXCHANGE };
