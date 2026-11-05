const mongoose = require('mongoose');
const config = require('./config');
const logger = require('./config/logger');

config.validate();
const app = require('./app');
const { startConsumer, stopConsumer } = require('./consumers/expenseConsumer');
const Notification = require('./models/Notification');

async function start() {
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 15000 });
  await Notification.init(); // make sure the unique eventId index exists before consuming
  logger.info('MongoDB connected');
  startConsumer(); // non-blocking, reconnects with backoff
  const server = app.listen(config.port, () => logger.info({ port: config.port }, 'notification-service listening'));

  const shutdown = (signal) => {
    logger.info({ signal }, 'Shutting down');
    server.close(async () => {
      await stopConsumer();
      await mongoose.disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  logger.error({ err: err.message }, 'Failed to start notification-service');
  process.exit(1);
});
