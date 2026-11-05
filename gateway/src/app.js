const fs = require('fs');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yaml');

const config = require('./config');
const requestId = require('./middleware/requestId');
const httpLogger = require('./middleware/httpLogger');
const authenticate = require('./middleware/authenticate');
const { globalLimiter, authLimiter } = require('./middleware/rateLimiters');
const { serviceProxy } = require('./routes/proxy');
const { sendError } = require('./utils/apiError');

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(requestId);
app.use(httpLogger);

// Swagger UI is mounted before helmet because helmet's CSP blocks Swagger's inline script.
const specPath = path.join(__dirname, '..', 'openapi.yaml');
if (fs.existsSync(specPath)) {
  const spec = YAML.parse(fs.readFileSync(specPath, 'utf8'));
  app.get('/openapi.json', (_req, res) => res.json(spec));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec, { customSiteTitle: 'FinTrack API docs' }));
}

app.use(helmet());
app.use(
  cors({
    credentials: true,
    origin: (origin, cb) => {
      // Requests without an Origin header (curl, same-origin, health checks) are allowed.
      if (!origin || config.corsOrigins.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    exposedHeaders: ['x-request-id'],
  }),
);

app.get('/health', (_req, res) => res.json({ success: true, service: 'gateway', status: 'ok' }));

// Aggregated check of all downstream services (useful for uptime monitors and the demo).
app.get('/health/services', async (_req, res) => {
  const targets = { auth: config.services.auth, transactions: config.services.transactions, notifications: config.services.notifications };
  const entries = await Promise.all(
    Object.entries(targets).map(async ([name, url]) => {
      try {
        const r = await fetch(`${url}/health`, { signal: AbortSignal.timeout(10000) });
        return [name, r.ok ? 'ok' : `error (${r.status})`];
      } catch (err) {
        return [name, `unreachable (${err.name === 'TimeoutError' ? 'timeout' : 'connection failed'})`];
      }
    }),
  );
  const services = Object.fromEntries(entries);
  const allOk = Object.values(services).every((s) => s === 'ok');
  res.status(allOk ? 200 : 503).json({ success: allOk, service: 'gateway', status: allOk ? 'ok' : 'degraded', services });
});

app.use('/api', globalLimiter);

// Public auth endpoints get the stricter limiter; /me needs a valid token.
app.use(['/api/auth/login', '/api/auth/register', '/api/auth/refresh'], authLimiter);
app.use('/api/auth/me', authenticate);
app.use(['/api/transactions', '/api/notifications', '/api/settings'], authenticate);

// No body parser here on purpose: request bodies are streamed straight to the services.
app.use(serviceProxy({ target: config.services.auth, prefix: '/api/auth', rewriteTo: '' }));
app.use(serviceProxy({ target: config.services.transactions, prefix: '/api/transactions', rewriteTo: '/transactions' }));
app.use(serviceProxy({ target: config.services.notifications, prefix: '/api/notifications', rewriteTo: '/notifications' }));
app.use(serviceProxy({ target: config.services.notifications, prefix: '/api/settings', rewriteTo: '/settings' }));

app.use((req, res) => sendError(req, res, 404, 'ROUTE_NOT_FOUND', 'Route not found'));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  req.log.error({ err: err.message }, 'Unhandled gateway error');
  sendError(req, res, 500, 'INTERNAL_ERROR', 'Something went wrong');
});

module.exports = app;
