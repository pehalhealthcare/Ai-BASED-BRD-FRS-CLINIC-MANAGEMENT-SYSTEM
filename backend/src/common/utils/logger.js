const { env } = require('../../config/env');

const levelWeights = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const shouldLog = (level) => levelWeights[level] <= levelWeights[env.logLevel];

const formatMessage = (level, message) => `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}`;

const log = (level, message, meta) => {
  if (!shouldLog(level)) {
    return;
  }

  const formatted = formatMessage(level, message);

  if (meta === undefined) {
    console[level](formatted);
    return;
  }

  console[level](formatted, meta);
};

const logger = {
  info: (message, meta) => log('info', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  error: (message, meta) => log('error', message, meta),
  debug: (message, meta) => log('debug', message, meta)
};

module.exports = { logger };
