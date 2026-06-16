const mongoose = require('mongoose');

const { env } = require('./env');
const { logger } = require('../common/utils/logger');

// Allow mongoose to buffer commands until the initial connection is established.
// This avoids throwing when a request arrives while the DB is still connecting.
mongoose.set('bufferCommands', true);

let lastConnectionError = null;

const VALID_MONGO_MODES = ['local', 'atlas', 'direct'];
const ATLAS_PLACEHOLDER_PATTERN = /<username>|<password>|<cluster-url>/i;

const getResolvedMongoMode = () => {
  const requestedMode = env.mongoMode?.trim().toLowerCase();

  if (VALID_MONGO_MODES.includes(requestedMode)) {
    return requestedMode;
  }

  if (env.isTest && env.mongoUri) {
    return 'direct';
  }

  if (env.isDevelopment) {
    return 'local';
  }

  if (!requestedMode) {
    throw new Error('MONGO_MODE is required in non-development environments. Use local, atlas, or direct.');
  }

  throw new Error(`Unsupported MONGO_MODE "${env.mongoMode}". Use local, atlas, or direct.`);
};

const resolveMongoUri = () => {
  const mode = getResolvedMongoMode();
  let selectedUri = '';
  let requiredVariable = '';

  if (mode === 'local') {
    selectedUri = env.mongoUriLocal;
    requiredVariable = 'MONGO_URI_LOCAL';
  } else if (mode === 'atlas') {
    selectedUri = env.mongoUriAtlas;
    requiredVariable = 'MONGO_URI_ATLAS';
  } else {
    selectedUri = env.mongoUri;
    requiredVariable = 'MONGO_URI';
  }

  if (!selectedUri) {
    throw new Error(`MongoDB mode "${mode}" requires ${requiredVariable} to be configured.`);
  }

  if (mode === 'atlas' && ATLAS_PLACEHOLDER_PATTERN.test(selectedUri)) {
    throw new Error('MONGO_URI_ATLAS contains placeholder values. Replace <username>, <password>, and <cluster-url>.');
  }

  return {
    mode,
    uri: selectedUri
  };
};

const getConnectionFailureMessage = (mode) => {
  if (mode === 'local') {
    return 'Local MongoDB connection failed. Start MongoDB locally or set MONGO_MODE=atlas and configure MONGO_URI_ATLAS.';
  }

  if (mode === 'atlas') {
    return 'MongoDB Atlas connection failed. Check username, password, IP whitelist, and cluster URL.';
  }

  return 'MongoDB connection failed. Check MONGO_URI and the database server availability.';
};

const connectDB = async () => {
  if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
    return resolveMongoUri();
  }

  const { mode, uri } = resolveMongoUri();
  logger.info(`MongoDB mode: ${mode}`);

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: env.dbConnectTimeoutMs,
      autoIndex: !env.isProduction
    });

    lastConnectionError = null;
    logger.info('MongoDB connection established successfully.');

    return { mode, uri };
  } catch (error) {
    const safeMessage = getConnectionFailureMessage(mode);
    const errorMessage = error instanceof Error ? error.message : 'Unknown MongoDB connection error.';

    lastConnectionError = safeMessage;
    logger.error(safeMessage, errorMessage);
    throw new Error(safeMessage);
  }
};

const disconnectDB = async () => {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.disconnect();
  logger.info('MongoDB connection closed.');
};

const getDatabaseStatus = () => ({
  status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  readyState: mongoose.connection.readyState,
  mode: (() => {
    try {
      return getResolvedMongoMode();
    } catch (_error) {
      return env.isDevelopment ? 'local' : 'direct';
    }
  })(),
  lastError: lastConnectionError
});

module.exports = {
  connectDB,
  disconnectDB,
  resolveMongoUri,
  getDatabaseStatus
};
