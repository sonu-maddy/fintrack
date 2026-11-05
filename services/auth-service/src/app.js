const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const requestId = require('./middleware/requestId');
const httpLogger = require('./middleware/httpLogger');
const internalAuth = require('./middleware/internalAuth');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const routes = require('./routes');

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(requestId);
app.use(httpLogger);
app.use(helmet());

app.get('/health', (_req, res) => res.json({ success: true, service: 'auth-service', status: 'ok' }));

app.use(internalAuth);
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
