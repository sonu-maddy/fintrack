const mongoose = require('mongoose');
const config = require('./config');
const logger = require('./config/logger');

config.validate();
const app = require('./app');
const publisher = require('./events/publisher');

async function start() {
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 15000 });
  logger.info('MongoDB connected');
  publisher.connect(); // non-blocking: the service works even if the broker is down
  const server = app.listen(config.port, () => logger.info({ port: config.port }, 'transaction-service listening'));

  const shutdown = (signal) => {
    logger.info({ signal }, 'Shutting down');
    server.close(async () => {
      await publisher.close();
      await mongoose.disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  logger.error({ err: err.message }, 'Failed to start transaction-service');
  process.exit(1);
});
