const fs = require('fs');
const path = require('path');

const app = require('./app');
const { disconnectDB, connectDB } = require('./config/database');
const { env } = require('./config/env');
const { logger } = require('./common/utils/logger');

let server = null;

const shutdown = async (signal) => {
  logger.warn(`Received ${signal}. Shutting down gracefully.`);

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }

    await disconnectDB();
    logger.info('Backend shutdown completed.');
    process.exit(0);
  } catch (error) {
    logger.error('Graceful shutdown failed.', error);
    process.exit(1);
  }
};

const startServer = async () => {
  try {
    await fs.promises.mkdir(path.resolve(process.cwd(), env.prescriptionPdfDir), { recursive: true });
    await fs.promises.mkdir(path.resolve(process.cwd(), env.invoiceStorageDir), { recursive: true });
    await connectDB();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Database connection failed during startup.';

    if (env.isProduction) {
      logger.error(message);
      process.exit(1);
    }

    logger.warn(message);
    logger.warn('Continuing startup without an active MongoDB connection because NODE_ENV is not production.');
  }

  server = app.listen(env.port, () => {
    logger.info(`${env.appName} running at http://localhost:${env.port}`);
    logger.info(`Swagger docs available at http://localhost:${env.port}/api-docs`);
  });
};

process.on('SIGINT', () => {
  shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  shutdown('SIGTERM');
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection detected.', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception detected.', error);
  shutdown('uncaughtException');
});

startServer();
