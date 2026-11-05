const config = {
  get port() { return Number(process.env.PORT) || 4002; },
  get mongoUri() { return process.env.MONGO_URI; },
  get amqpUrl() { return process.env.AMQP_URL; },
  validate() {
    const missing = ['MONGO_URI', 'INTERNAL_TOKEN'].filter((k) => !process.env[k]);
    if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  },
};

module.exports = config;
