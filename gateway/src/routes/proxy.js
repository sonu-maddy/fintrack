const { createProxyMiddleware } = require('http-proxy-middleware');
const config = require('../config');
const logger = require('../config/logger');
const { sendError } = require('../utils/apiError');

// prefix: public path (/api/auth), rewriteTo: path the service expects ('' or /transactions)
function serviceProxy({ target, prefix, rewriteTo }) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    xfwd: true,
    timeout: config.proxyTimeoutMs,
    proxyTimeout: config.proxyTimeoutMs,
    pathFilter: prefix,
    pathRewrite: { [`^${prefix}`]: rewriteTo },
    on: {
      proxyReq: (proxyReq, req) => {
        // Never trust identity headers coming from the outside.
        proxyReq.removeHeader('x-user-id');
        proxyReq.removeHeader('x-internal-token');
        proxyReq.setHeader('x-internal-token', config.internalToken);
        proxyReq.setHeader('x-request-id', req.id);
        if (req.userId) proxyReq.setHeader('x-user-id', req.userId);
      },
      error: (err, req, res) => {
        logger.error({ requestId: req.id, err: err.message, target }, 'Upstream error');
        if (res && typeof res.writeHead === 'function' && !res.headersSent) {
          const timedOut = /timeout|ETIMEDOUT/i.test(err.message);
          sendError(req, res, timedOut ? 504 : 502, timedOut ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNAVAILABLE',
            timedOut ? 'The service took too long to respond. It may be waking up, please retry.' : 'Service temporarily unavailable');
        }
      },
    },
  });
}

module.exports = { serviceProxy };
