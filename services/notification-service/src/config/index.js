const config = {
  get port() { return Number(process.env.PORT) || 4003; },
  get mongoUri() { return process.env.MONGO_URI; },
  get amqpUrl() { return process.env.AMQP_URL; },
  // Threshold (in rupees) used until the user sets their own.
  get defaultThreshold() { return Number(process.env.DEFAULT_THRESHOLD) || 10000; },
  validate() {
    const missing = ['MONGO_URI', 'INTERNAL_TOKEN'].filter((k) => !process.env[k]);
    if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  },
};

module.exports = config;
