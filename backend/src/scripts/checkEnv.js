const { ZodError } = require('zod');

const print = (message) => {
  process.stdout.write(`${message}\n`);
};

const printError = (message) => {
  process.stderr.write(`${message}\n`);
};

const containsPlaceholder = (value = '') => /replace-with|<username>|<password>|<cluster-url>/i.test(String(value));

const run = () => {
  try {
    const { env } = require('../config/env');
    const { resolveMongoUri } = require('../config/database');

    print(`Detected NODE_ENV: ${env.nodeEnv}`);
    print(`Detected MONGO_MODE: ${env.mongoMode || (env.isDevelopment ? 'local' : 'not-set')}`);

    const { mode } = resolveMongoUri();
    print(`Resolved MongoDB mode: ${mode}`);

    const missing = [];

    if (!env.jwtSecret) {
      missing.push('JWT_SECRET is required.');
    }

    if (!env.seedAdminName) {
      missing.push('SEED_ADMIN_NAME is required for admin seeding.');
    }

    if (!env.seedAdminEmail) {
      missing.push('SEED_ADMIN_EMAIL is required for admin seeding.');
    }

    if (!env.seedAdminPassword) {
      missing.push('SEED_ADMIN_PASSWORD is required for admin seeding.');
    }

    if (containsPlaceholder(env.jwtSecret)) {
      missing.push('JWT_SECRET still contains a placeholder value. Set a real secret before shared or production-like use.');
    }

    if (env.mongoMode === 'atlas' && containsPlaceholder(env.mongoUriAtlas || '')) {
      missing.push('MONGO_URI_ATLAS still contains placeholder values.');
    }

    if (missing.length > 0) {
      printError('Environment validation failed.');
      missing.forEach((message) => printError(`- ${message}`));
      process.exit(1);
    }

    print('Environment validation passed.');
    process.exit(0);
  } catch (error) {
    if (error instanceof ZodError) {
      printError('Environment validation failed.');
      error.issues.forEach((issue) => {
        printError(`- ${issue.path.join('.') || 'env'}: ${issue.message}`);
      });
      process.exit(1);
    }

    const message = error instanceof Error ? error.message : 'Unknown environment validation error.';
    printError('Environment validation failed.');
    printError(`- ${message}`);
    process.exit(1);
  }
};

run();
