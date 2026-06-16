const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.setTimeout(30000);

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_EXPIRES_IN = '1d';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.API_PREFIX = '/api/v1';
process.env.APP_NAME = 'AI-CMS Backend';
process.env.LOG_LEVEL = 'error';
process.env.MONGO_MODE = 'direct';
process.env.AI_SERVICE_URL = 'http://127.0.0.1:6553';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongoServer.getUri('ai_cms_test');
  process.env.MONGO_URI_LOCAL = 'mongodb://localhost:27017/ai_cms_test';
  process.env.MONGO_URI_ATLAS = 'mongodb+srv://test-user:test-pass@test-cluster/ai_cms_test?retryWrites=true&w=majority';

  jest.resetModules();

  const { connectDB } = require('../src/config/database');
  await connectDB();
});

afterEach(async () => {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  const collections = mongoose.connection.collections;

  for (const collection of Object.values(collections)) {
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  const { disconnectDB } = require('../src/config/database');
  await disconnectDB();

  if (mongoServer) {
    await mongoServer.stop();
  }
});
