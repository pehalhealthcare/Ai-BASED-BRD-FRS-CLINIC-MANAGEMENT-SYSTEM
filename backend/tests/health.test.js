const request = require('supertest');

let app;
let connectDB;
let disconnectDB;

beforeAll(() => {
  app = require('../src/app');
  ({ connectDB, disconnectDB } = require('../src/config/database'));
});

describe('Health routes', () => {
  it('returns root health status', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Backend service is healthy');
    expect(response.body.data.service).toBe('backend');
    expect(response.body.data.database).toEqual(
      expect.objectContaining({
        status: expect.any(String),
        mode: expect.any(String)
      })
    );
  });

  it('returns versioned health status', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('ok');
    expect(response.body.data.database.mode).toBe('direct');
  });

  it('returns health even when the database is disconnected', async () => {
    await disconnectDB();

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.database.status).toBe('disconnected');

    await connectDB();
  });

  it('returns consistent error response for unknown routes', async () => {
    const response = await request(app).get('/unknown-route');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Route GET /unknown-route not found');
    expect(Array.isArray(response.body.errors)).toBe(true);
  });
});
