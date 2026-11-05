const mongoose = require('mongoose');
const config = require('./config');
const logger = require('./config/logger');

config.validate();
const app = require('./app');

async function start() {
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 15000 });
  logger.info('MongoDB connected');
  const server = app.listen(config.port, () => logger.info({ port: config.port }, 'auth-service listening'));

  const shutdown = (signal) => {
    logger.info({ signal }, 'Shutting down');
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  logger.error({ err: err.message }, 'Failed to start auth-service');
  process.exit(1);
});
