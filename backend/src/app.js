const cors = require('cors');
const express = require('express');
const helmet = require('helmet');

const { errorMiddleware } = require('./common/middlewares/error.middleware');
const { notFoundMiddleware } = require('./common/middlewares/notFound.middleware');
const { sendSuccess } = require('./common/utils/apiResponse');
const { requestLogger } = require('./common/middlewares/requestLogger.middleware');
const { setupSwagger } = require('./config/swagger');
const { env } = require('./config/env');
const healthRoutes = require('./modules/health/health.routes');
const apiRoutes = require('./routes');

const app = express();

const allowCorsOrigin = (origin, callback) => {
  // Allow server-to-server tools and same-machine requests without an Origin header.
  if (!origin) {
    callback(null, true);
    return;
  }

  if (env.corsOrigins.includes(origin) || env.corsOrigins.includes('*')) {
    callback(null, true);
    return;
  }

  callback(new Error(`CORS origin "${origin}" is not allowed.`));
};

app.use(helmet());
app.use(
  cors({
    origin: allowCorsOrigin
  })
);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(requestLogger);

setupSwagger(app);

app.get('/', (_req, res) =>
  sendSuccess(res, 'AI-CMS backend is running', {
    health: '/health',
    apiHealth: `${env.apiPrefix}/health`,
    apiDocs: '/api-docs'
  })
);
app.use('/health', healthRoutes);
app.use(env.apiPrefix, apiRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
