const pinoHttp = require('pino-http');
const logger = require('../config/logger');

module.exports = pinoHttp({
  logger,
  genReqId: (req) => req.id,
  customProps: (req) => ({ requestId: req.id }),
  serializers: {
    req: (req) => ({ method: req.method, path: String(req.url).split('?')[0] }),
    res: (res) => ({ status: res.statusCode }),
  },
  autoLogging: { ignore: (req) => req.url === '/health' },
});
