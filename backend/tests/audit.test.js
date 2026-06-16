const request = require('supertest');
const { ROLES } = require('../src/common/constants/roles');
let app;
let AuditLog;
let User;

beforeAll(() => {
  app = require('../src/app');
  AuditLog = require('../src/modules/audit/audit.model');
  User = require('../src/modules/users/user.model');
});

describe('Audit Log READ APIs', () => {
  let adminToken;
  let patientToken;
  let sampleLogId;

  beforeEach(async () => {
    await User.deleteMany({});
    await AuditLog.deleteMany({});

    // Create Admin user
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'AdminPassword123!',
      role: ROLES.ADMIN,
      isActive: true
    });

    const adminLoginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@example.com',
      password: 'AdminPassword123!'
    });
    adminToken = adminLoginRes.body.data.accessToken;

    // Create Patient user
    const patientUser = await User.create({
      name: 'Patient User',
      email: 'patient@example.com',
      password: 'PatientPassword123!',
      role: ROLES.PATIENT,
      isActive: true
    });

    const patientLoginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'patient@example.com',
      password: 'PatientPassword123!'
    });
    patientToken = patientLoginRes.body.data.accessToken;

    // Create some sample audit logs
    const log1 = await AuditLog.create({
      actorUserId: adminUser._id,
      action: 'APPOINTMENT_CREATED',
      entity: 'Appointment',
      metadata: { appointmentId: '123' },
      status: 'SUCCESS'
    });
    sampleLogId = log1._id.toString();

    await AuditLog.create({
      actorUserId: patientUser._id,
      action: 'USER_LOGIN_FAILED',
      entity: 'Auth',
      metadata: { reason: 'INVALID_PASSWORD' },
      status: 'FAILURE'
    });
  });

  it('fails if non-admin attempts to retrieve audit logs', async () => {
    const res = await request(app)
      .get('/api/v1/audit')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('retrieves paginated audit logs successfully for admin', async () => {
    const res = await request(app)
      .get('/api/v1/audit')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.logs.length).toBeGreaterThanOrEqual(2);
    expect(res.body.data.total).toBeGreaterThanOrEqual(2);
    expect(res.body.data.logs[0].actorUserId.name).toBeDefined();
  });

  it('filters audit logs by action', async () => {
    const res = await request(app)
      .get('/api/v1/audit')
      .query({ action: 'APPOINTMENT_CREATED' })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.logs).toHaveLength(1);
    expect(res.body.data.logs[0].action).toBe('APPOINTMENT_CREATED');
  });

  it('filters audit logs by status', async () => {
    const res = await request(app)
      .get('/api/v1/audit')
      .query({ status: 'FAILURE' })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.logs).toHaveLength(1);
    expect(res.body.data.logs[0].status).toBe('FAILURE');
  });

  it('retrieves specific log by ID for admin', async () => {
    const res = await request(app)
      .get(`/api/v1/audit/${sampleLogId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.log._id).toBe(sampleLogId);
    expect(res.body.data.log.action).toBe('APPOINTMENT_CREATED');
  });

  it('returns 404 for non-existent audit log ID', async () => {
    const nonExistentId = '60c72b2f9b1d8e2518e9ffff';
    const res = await request(app)
      .get(`/api/v1/audit/${nonExistentId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});
