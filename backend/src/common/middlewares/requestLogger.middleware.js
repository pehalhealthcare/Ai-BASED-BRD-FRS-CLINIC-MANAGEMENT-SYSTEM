const { env } = require('../../config/env');
const { logger } = require('../utils/logger');

const requestLogger = (req, res, next) => {
  if (env.isTest) {
    next();
    return;
  }

  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });

  next();
};

module.exports = { requestLogger };
