const request = require('supertest');

const { ROLES } = require('../src/common/constants/roles');
const { createUserWithClinic, getAuthHeaders } = require('./helpers/phase3.helper');

let app;

beforeAll(() => {
  app = require('../src/app');
});

describe('Doctors module', () => {
  it('create doctor requires admin', async () => {
    const receptionist = await createUserWithClinic({ role: ROLES.RECEPTIONIST });

    const response = await request(app)
      .post('/api/v1/doctors')
      .set(getAuthHeaders(receptionist.token))
      .send({
        firstName: 'Blocked',
        specialization: 'General Medicine',
        phone: '9555555555'
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it('doctorCode generated', async () => {
    const admin = await createUserWithClinic({ role: ROLES.ADMIN });

    const response = await request(app)
      .post('/api/v1/doctors')
      .set(getAuthHeaders(admin.token))
      .send({
        firstName: 'Meera',
        lastName: 'Singh',
        specialization: 'Cardiology',
        phone: '9666666666',
        consultationFee: 800
      });

    expect(response.status).toBe(201);
    expect(response.body.data.doctor.doctorCode).toMatch(/^DOC-\d{8}-\d{4}$/);
  });

  it('list doctors is clinic scoped', async () => {
    const clinicAAdmin = await createUserWithClinic({ role: ROLES.ADMIN });
    const clinicBAdmin = await createUserWithClinic({ role: ROLES.ADMIN });
    const clinicAReceptionist = await createUserWithClinic({
      role: ROLES.RECEPTIONIST,
      clinicId: clinicAAdmin.clinic._id
    });

    await request(app)
      .post('/api/v1/doctors')
      .set(getAuthHeaders(clinicAAdmin.token))
      .send({
        firstName: 'Clinic',
        lastName: 'A',
        specialization: 'Dermatology',
        phone: '9777777771'
      });

    await request(app)
      .post('/api/v1/doctors')
      .set(getAuthHeaders(clinicBAdmin.token))
      .send({
        firstName: 'Clinic',
        lastName: 'B',
        specialization: 'Neurology',
        phone: '9777777772'
      });

    const response = await request(app).get('/api/v1/doctors').set(getAuthHeaders(clinicAReceptionist.token));

    expect(response.status).toBe(200);
    expect(response.body.data.doctors).toHaveLength(1);
    expect(response.body.data.doctors[0].lastName).toBe('A');
  });

  it('update doctor works', async () => {
    const admin = await createUserWithClinic({ role: ROLES.ADMIN });
    const createResponse = await request(app)
      .post('/api/v1/doctors')
      .set(getAuthHeaders(admin.token))
      .send({
        firstName: 'Update',
        specialization: 'Orthopedics',
        phone: '9888888888'
      });

    const response = await request(app)
      .patch(`/api/v1/doctors/${createResponse.body.data.doctor._id}`)
      .set(getAuthHeaders(admin.token))
      .send({
        qualification: 'MBBS, MS',
        consultationFee: 1200
      });

    expect(response.status).toBe(200);
    expect(response.body.data.doctor.qualification).toBe('MBBS, MS');
    expect(response.body.data.doctor.consultationFee).toBe(1200);
  });

  it('update availability works', async () => {
    const admin = await createUserWithClinic({ role: ROLES.ADMIN });
    const createResponse = await request(app)
      .post('/api/v1/doctors')
      .set(getAuthHeaders(admin.token))
      .send({
        firstName: 'Availability',
        specialization: 'Pediatrics',
        phone: '9898989898'
      });

    const response = await request(app)
      .patch(`/api/v1/doctors/${createResponse.body.data.doctor._id}/availability`)
      .set(getAuthHeaders(admin.token))
      .send({
        availability: [
          {
            dayOfWeek: 'monday',
            isAvailable: true,
            startTime: '09:00',
            endTime: '13:00',
            slotDurationMinutes: 30
          }
        ]
      });

    expect(response.status).toBe(200);
    expect(response.body.data.doctor.availability).toHaveLength(1);
    expect(response.body.data.doctor.availability[0].dayOfWeek).toBe('monday');
  });

  it('soft delete works', async () => {
    const admin = await createUserWithClinic({ role: ROLES.ADMIN });
    const createResponse = await request(app)
      .post('/api/v1/doctors')
      .set(getAuthHeaders(admin.token))
      .send({
        firstName: 'ToDelete',
        specialization: 'ENT',
        phone: '9999999991'
      });

    const response = await request(app)
      .delete(`/api/v1/doctors/${createResponse.body.data.doctor._id}`)
      .set(getAuthHeaders(admin.token));

    expect(response.status).toBe(200);
    expect(response.body.data.doctor.isActive).toBe(false);
  });
});
