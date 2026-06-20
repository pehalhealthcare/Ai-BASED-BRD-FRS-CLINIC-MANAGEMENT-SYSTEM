const request = require('supertest');
const bcrypt = require('bcryptjs');

const { ROLES } = require('../src/common/constants/roles');
let app;
let AuditLog;
let User;
let connectDB;
let seedAdmin;

const buildRegisterPayload = (overrides = {}) => ({
  name: 'Reception User',
  email: `reception-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`,
  phone: '9999999999',
  password: 'StrongPass123!',
  role: ROLES.RECEPTIONIST,
  ...overrides
});

beforeAll(() => {
  app = require('../src/app');
  AuditLog = require('../src/modules/audit/audit.model');
  User = require('../src/modules/users/user.model');
  ({ connectDB } = require('../src/config/database'));
  ({ seedAdmin } = require('../src/seed/seedAdmin'));
});

beforeEach(async () => {
  jest.restoreAllMocks();
  const Clinic = require('../src/modules/clinics/clinic.model');
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  await Clinic.create({
    name: `Default Test Clinic ${suffix}`,
    code: `CL${suffix}`.slice(-10),
    isActive: true
  });
});

const createSuperAdmin = async () => {
  return User.create({
    name: 'Platform Admin',
    email: 'admin@example.com',
    password: 'Admin123!',
    role: ROLES.SUPER_ADMIN,
    isActive: true
  });
};

describe('Auth + RBAC', () => {
  it('registers a user successfully', async () => {
    const registerPayload = buildRegisterPayload();
    const response = await request(app).post('/api/v1/auth/register').send(registerPayload);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe(registerPayload.email);
    expect(response.body.data.user.password).toBeUndefined();
    expect(response.body.data.accessToken).toEqual(expect.any(String));
  });

  it('stores a hashed password and never exposes it in auth responses', async () => {
    const registerPayload = buildRegisterPayload({ email: 'hash-check@example.com' });
    const registerResponse = await request(app).post('/api/v1/auth/register').send(registerPayload);

    const storedUser = await User.findOne({ email: registerPayload.email }).select('+password');

    expect(storedUser.password).not.toBe(registerPayload.password);
    await expect(bcrypt.compare(registerPayload.password, storedUser.password)).resolves.toBe(true);
    expect(registerResponse.body.data.user.password).toBeUndefined();

    const loginResponse = await request(app).post('/api/v1/auth/login').send({
      email: registerPayload.email.toUpperCase(),
      password: registerPayload.password
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.data.user.password).toBeUndefined();
  });

  it('fails when registering a duplicate email', async () => {
    const registerPayload = buildRegisterPayload({ email: 'duplicate@example.com' });
    await request(app).post('/api/v1/auth/register').send(registerPayload);

    const response = await request(app).post('/api/v1/auth/register').send(registerPayload);

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
  });

  it('logs in with correct password', async () => {
    const registerPayload = buildRegisterPayload({ email: 'login-success@example.com' });
    await request(app).post('/api/v1/auth/register').send(registerPayload);

    const response = await request(app).post('/api/v1/auth/login').send({
      email: registerPayload.email,
      password: registerPayload.password
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.accessToken).toEqual(expect.any(String));
  });

  it('fails login with wrong password', async () => {
    const registerPayload = buildRegisterPayload({ email: 'wrong-password@example.com' });
    await request(app).post('/api/v1/auth/register').send(registerPayload);

    const response = await request(app).post('/api/v1/auth/login').send({
      email: registerPayload.email,
      password: 'WrongPassword123!'
    });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('/auth/me fails without token', async () => {
    const response = await request(app).get('/api/v1/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('/auth/me works with token', async () => {
    const registerPayload = buildRegisterPayload({ email: 'me-success@example.com' });
    const registerResponse = await request(app).post('/api/v1/auth/register').send(registerPayload);
    const token = registerResponse.body.data.accessToken;

    const response = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe(registerPayload.email);
    expect(response.body.data.user.password).toBeUndefined();
  });

  it('public registration cannot create SUPER_ADMIN', async () => {
    const registerPayload = buildRegisterPayload({
      email: 'super-admin-attempt@example.com',
      role: ROLES.SUPER_ADMIN
    });
    const response = await request(app).post('/api/v1/auth/register').send({
      ...registerPayload
    });

    expect([400, 403]).toContain(response.status);
    expect(response.body.success).toBe(false);
  });

  it('public registration cannot create ADMIN', async () => {
    const registerPayload = buildRegisterPayload({
      email: 'admin-attempt@example.com',
      role: ROLES.ADMIN
    });
    const response = await request(app).post('/api/v1/auth/register').send(registerPayload);

    expect([400, 403]).toContain(response.status);
    expect(response.body.success).toBe(false);
  });

  it('returns clean validation errors for invalid auth payloads', async () => {
    const response = await request(app).post('/api/v1/auth/register').send({
      name: 'A',
      email: 'not-an-email',
      password: 'weak',
      role: ROLES.PATIENT
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validation failed.');
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'body.name' }),
        expect.objectContaining({ field: 'body.email' }),
        expect.objectContaining({ field: 'body.password' })
      ])
    );
  });

  it('returns a clean service-unavailable response when the database is unavailable during registration', async () => {
    const registerPayload = buildRegisterPayload({ email: 'db-down-register@example.com' });
    const findOneSpy = jest.spyOn(User, 'findOne').mockImplementationOnce(() => {
      throw new Error('Cannot call `users.findOne()` before initial connection is complete if `bufferCommands = false`.');
    });

    const response = await request(app).post('/api/v1/auth/register').send(registerPayload);

    expect(response.status).toBe(503);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Database is unavailable.');

    findOneSpy.mockRestore();
  });

  it('non-admin cannot access GET /users', async () => {
    const registerPayload = buildRegisterPayload({
      email: 'patient-access@example.com',
      role: ROLES.PATIENT
    });
    const registerResponse = await request(app).post('/api/v1/auth/register').send({
      ...registerPayload
    });
    const token = registerResponse.body.data.accessToken;

    const response = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it('super admin helper can access GET /users', async () => {
    await createSuperAdmin();

    const loginResponse = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@example.com',
      password: 'Admin123!'
    });

    const response = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${loginResponse.body.data.accessToken}`);

    expect(loginResponse.status).toBe(200);
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('writes safe auth audit logs for register and login events', async () => {
    await AuditLog.deleteMany({});

    const registerPayload = buildRegisterPayload({ email: 'audit-success@example.com' });
    const registerResponse = await request(app).post('/api/v1/auth/register').send(registerPayload);

    await request(app).post('/api/v1/auth/login').send({
      email: registerPayload.email,
      password: registerPayload.password
    });

    const auditEntries = await AuditLog.find({
      action: { $in: ['USER_REGISTERED', 'USER_LOGIN_SUCCESS'] }
    }).lean();

    expect(auditEntries).toHaveLength(2);

    auditEntries.forEach((entry) => {
      expect(entry.entity).toBe('Auth');
      expect(entry.status).toBe('SUCCESS');
      expect(entry.metadata?.password).toBeUndefined();
    });

    expect(registerResponse.body.data.user.password).toBeUndefined();
  });

  it('writes safe auth audit logs for failed login attempts', async () => {
    await AuditLog.deleteMany({});

    const registerPayload = buildRegisterPayload({ email: 'audit-failure@example.com' });
    await request(app).post('/api/v1/auth/register').send(registerPayload);

    const response = await request(app).post('/api/v1/auth/login').send({
      email: registerPayload.email,
      password: 'WrongPassword123!'
    });

    const auditLog = await AuditLog.findOne({ action: 'USER_LOGIN_FAILED' }).lean();

    expect(response.status).toBe(401);
    expect(auditLog).toEqual(
      expect.objectContaining({
        entity: 'Auth',
        status: 'FAILURE'
      })
    );
    expect(auditLog.metadata.password).toBeUndefined();
    expect(auditLog.metadata.reason).toBe('INVALID_PASSWORD');
  });

  it('seeds a SUPER_ADMIN once without creating duplicates', async () => {
    await AuditLog.deleteMany({});
    await User.deleteMany({});

    const seedPayload = {
      name: 'Seeded Super Admin',
      email: 'seeded-admin@example.com',
      password: 'Admin123!'
    };

    const firstSeed = await seedAdmin(seedPayload);
    const secondSeed = await seedAdmin(seedPayload);
    await connectDB();

    const admins = await User.find({ email: seedPayload.email });
    const seedAuditLogs = await AuditLog.find({ action: 'ADMIN_SEEDED' }).lean();

    expect(firstSeed.role).toBe(ROLES.SUPER_ADMIN);
    expect(secondSeed.email).toBe(seedPayload.email);
    expect(admins).toHaveLength(1);
    expect(seedAuditLogs).toHaveLength(1);
    expect(seedAuditLogs[0].metadata.password).toBeUndefined();
  });

  it('allows resetting password without verification but validates password schema', async () => {
    const registerPayload = buildRegisterPayload({ email: 'reset-password@example.com' });
    await request(app).post('/api/v1/auth/register').send(registerPayload);

    // 1. Reset password fails if password is too simple
    const failRes = await request(app).post('/api/v1/auth/reset-password').send({
      email: registerPayload.email,
      password: 'short'
    });
    expect(failRes.status).toBe(400);

    // 2. Reset password succeeds with a valid password
    const successRes = await request(app).post('/api/v1/auth/reset-password').send({
      email: registerPayload.email,
      password: 'NewPassword123!'
    });
    expect(successRes.status).toBe(200);

    // 3. Can login with the new password
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: registerPayload.email,
      password: 'NewPassword123!'
    });
    expect(loginRes.status).toBe(200);
  });
});
