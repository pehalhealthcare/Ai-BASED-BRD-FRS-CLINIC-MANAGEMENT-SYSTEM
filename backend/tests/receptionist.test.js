const request = require('supertest');
const { ROLES } = require('../src/common/constants/roles');

let app;
let User;
let Receptionist;
let Clinic;

beforeAll(() => {
  app = require('../src/app');
  User = require('../src/modules/users/user.model');
  Receptionist = require('../src/modules/receptionists/receptionist.model');
  Clinic = require('../src/modules/clinics/clinic.model');
});

describe('Receptionist Onboarding & Approval API', () => {
  let receptionistToken;
  let receptionistUserId;
  let adminToken;
  let clinicId;

  beforeEach(async () => {
    await User.deleteMany({});
    await Receptionist.deleteMany({});
    await Clinic.deleteMany({});
    
    const Organization = require('../src/modules/organizations/organization.model');
    await Organization.deleteMany({});

    // 1. Create a clinic
    const clinic = await Clinic.create({
      name: 'Test Onboarding Clinic',
      code: 'ONBOARDT1',
      isActive: true
    });
    clinicId = clinic._id;

    // 2. Create Admin user
    const adminUser = await User.create({
      name: 'Clinic Admin',
      email: 'admin@onboard.com',
      password: 'AdminPassword123!',
      role: ROLES.ADMIN,
      isActive: true,
      clinicId: clinicId
    });

    const adminLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@onboard.com',
      password: 'AdminPassword123!'
    });
    adminToken = adminLogin.body.data.accessToken;

    // 3. Register a Receptionist
    const registerResponse = await request(app).post('/api/v1/auth/register').send({
      name: 'Sarah Receptionist',
      email: 'sarah@test.com',
      password: 'Password123!',
      role: ROLES.RECEPTIONIST,
      phone: '9988776655'
    });

    receptionistUserId = registerResponse.body.data.user.id || registerResponse.body.data.user._id;
    receptionistToken = registerResponse.body.data.accessToken;
  });

  it('registers receptionist with pending_profile status and creates a default Receptionist profile', async () => {
    const user = await User.findById(receptionistUserId);
    expect(user.approvalStatus).toBe('pending_profile');

    const profile = await Receptionist.findOne({ userId: receptionistUserId });
    expect(profile).toBeDefined();
    expect(profile.fullName).toBe('Sarah Receptionist');
    expect(profile.approvalStatus).toBe('pending_profile');
  });

  it('allows receptionist to fetch, update, and submit profile for approval', async () => {
    // 1. Fetch profile
    let res = await request(app)
      .get('/api/v1/receptionists/me/profile')
      .set('Authorization', `Bearer ${receptionistToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.profile.fullName).toBe('Sarah Receptionist');

    // 2. Update profile
    res = await request(app)
      .put('/api/v1/receptionists/me/profile')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({
        qualification: 'Diploma in Administration',
        experienceYears: 3
      });
    expect(res.status).toBe(200);
    expect(res.body.data.profile.qualification).toBe('Diploma in Administration');
    expect(res.body.data.profile.experienceYears).toBe(3);

    // 3. Submit profile (should fail without organization selection or documentPdf)
    res = await request(app)
      .post('/api/v1/receptionists/me/submit')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({
        qualification: 'Diploma in Administration'
      });
    expect(res.status).toBe(400);

    // Create a mock Org first
    const Organization = require('../src/modules/organizations/organization.model');
    const org = await Organization.create({ name: 'Onboard Org', email: 'org@onboard.com' });

    // Submit successfully
    res = await request(app)
      .post('/api/v1/receptionists/me/submit')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({
        qualification: 'Diploma in Administration',
        organizationId: org._id,
        documentPdf: 'data:application/pdf;base64,JVBERi0xLjQKJ...'
      });
    expect(res.status).toBe(200);
    expect(res.body.data.profile.approvalStatus).toBe('pending_approval');

    const updatedUser = await User.findById(receptionistUserId);
    expect(updatedUser.approvalStatus).toBe('pending_approval');
  });

  it('allows admin to list pending receptionists, approve them, and set shift availability', async () => {
    // Create an Org
    const Organization = require('../src/modules/organizations/organization.model');
    const org = await Organization.create({ name: 'Onboard Org', email: 'org@onboard.com' });

    // Receptionist submits profile
    await request(app)
      .post('/api/v1/receptionists/me/submit')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({
        qualification: 'Diploma in Administration',
        organizationId: org._id,
        documentPdf: 'data:application/pdf;base64,JVBERi0xLjQKJ...'
      });

    // 1. Admin lists pending receptionists
    let res = await request(app)
      .get('/api/v1/admin/pending-receptionists')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.pendingReceptionists).toHaveLength(1);
    expect(res.body.data.pendingReceptionists[0].name).toBe('Sarah Receptionist');

    // 2. Admin approves receptionist with clinic & shift hours
    res = await request(app)
      .post(`/api/v1/admin/approve-receptionist/${receptionistUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        clinicId: clinicId,
        assignedClinics: [clinicId],
        qualification: 'Diploma in Administration',
        availability: [
          { dayOfWeek: 'monday', isAvailable: true, startTime: '09:00', endTime: '17:00', clinicId: clinicId }
        ]
      });
    expect(res.status).toBe(200);
    expect(res.body.data.receptionist.approvalStatus).toBe('approved');
    expect(res.body.data.receptionist.hasAcceptedSlot).toBe(false);

    // 3. Receptionist accepts slots
    res = await request(app)
      .post('/api/v1/receptionists/me/accept-slot')
      .set('Authorization', `Bearer ${receptionistToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.profile.hasAcceptedSlot).toBe(true);

    const activeUser = await User.findById(receptionistUserId);
    expect(activeUser.isActive).toBe(true);
    expect(activeUser.hasAcceptedSlot).toBe(true);
  });

  it('rejects receptionist approval if multiple clinics are assigned', async () => {
    const Organization = require('../src/modules/organizations/organization.model');
    const org = await Organization.create({ name: 'Onboard Org', email: 'org@onboard.com' });

    // Submit profile
    await request(app)
      .post('/api/v1/receptionists/me/submit')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({
        qualification: 'Diploma in Administration',
        organizationId: org._id,
        documentPdf: 'data:application/pdf;base64,JVBERi0xLjQKJ...'
      });

    const otherClinic = await Clinic.create({
      name: 'Other Clinic Branch',
      code: 'OTHERC1',
      isActive: true
    });

    const res = await request(app)
      .post(`/api/v1/admin/approve-receptionist/${receptionistUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        clinicId: clinicId,
        assignedClinics: [clinicId, otherClinic._id],
        qualification: 'Diploma in Administration',
        availability: [
          { dayOfWeek: 'monday', isAvailable: true, startTime: '09:00', endTime: '17:00', clinicId: clinicId }
        ]
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('at most one clinic branch');
  });

  it('rejects receptionist approval if availability slots clinicId does not match the assigned clinic', async () => {
    const Organization = require('../src/modules/organizations/organization.model');
    const org = await Organization.create({ name: 'Onboard Org', email: 'org@onboard.com' });

    // Submit profile
    await request(app)
      .post('/api/v1/receptionists/me/submit')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({
        qualification: 'Diploma in Administration',
        organizationId: org._id,
        documentPdf: 'data:application/pdf;base64,JVBERi0xLjQKJ...'
      });

    const otherClinic = await Clinic.create({
      name: 'Other Clinic Branch',
      code: 'OTHERC1',
      isActive: true
    });

    const res = await request(app)
      .post(`/api/v1/admin/approve-receptionist/${receptionistUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        clinicId: clinicId,
        assignedClinics: [clinicId],
        qualification: 'Diploma in Administration',
        availability: [
          { dayOfWeek: 'monday', isAvailable: true, startTime: '09:00', endTime: '17:00', clinicId: otherClinic._id }
        ]
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('slots must match the assigned clinic branch');
  });
});
