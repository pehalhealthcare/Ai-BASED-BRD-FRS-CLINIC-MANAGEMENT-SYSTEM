const request = require('supertest');

const { ROLES } = require('../src/common/constants/roles');
const { createUserWithClinic, getAuthHeaders } = require('./helpers/phase3.helper');

let app;

beforeAll(() => {
  app = require('../src/app');
});

describe('Patients module', () => {
  it('create patient requires auth', async () => {
    const response = await request(app).post('/api/v1/patients').send({
      firstName: 'Unauth',
      gender: 'male',
      phone: '9999999999'
    });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('create patient generates patientId', async () => {
    const { token } = await createUserWithClinic({ role: ROLES.ADMIN });
    const response = await request(app)
      .post('/api/v1/patients')
      .set(getAuthHeaders(token))
      .send({
        firstName: 'Anita',
        lastName: 'Sharma',
        gender: 'female',
        dateOfBirth: '1995-03-14',
        phone: '9876543210',
        email: 'anita@example.com'
      });

    expect(response.status).toBe(201);
    expect(response.body.data.patient.patientId).toMatch(/^PAT-\d{8}-\d{4}$/);
    expect(response.body.data.patient.clinicId).toBeTruthy();
  });

  it('list patients is clinic scoped', async () => {
    const clinicAAdmin = await createUserWithClinic({ role: ROLES.ADMIN });
    const clinicBAdmin = await createUserWithClinic({ role: ROLES.ADMIN });
    const clinicADoctor = await createUserWithClinic({
      role: ROLES.DOCTOR,
      clinicId: clinicAAdmin.clinic._id
    });

    await request(app).post('/api/v1/patients').set(getAuthHeaders(clinicAAdmin.token)).send({
      firstName: 'ClinicA',
      gender: 'male',
      phone: '9000000001'
    });

    await request(app).post('/api/v1/patients').set(getAuthHeaders(clinicBAdmin.token)).send({
      firstName: 'ClinicB',
      gender: 'female',
      phone: '9000000002'
    });

    const response = await request(app).get('/api/v1/patients').set(getAuthHeaders(clinicADoctor.token));

    expect(response.status).toBe(200);
    expect(response.body.data.patients).toHaveLength(1);
    expect(response.body.data.patients[0].firstName).toBe('ClinicA');
  });

  it('search patient by phone, name, and patientId', async () => {
    const { token } = await createUserWithClinic({ role: ROLES.RECEPTIONIST });

    const createResponse = await request(app)
      .post('/api/v1/patients')
      .set(getAuthHeaders(token))
      .send({
        firstName: 'Searchable',
        lastName: 'Patient',
        gender: 'other',
        phone: '9111111111',
        email: 'searchable@example.com'
      });

    const patientId = createResponse.body.data.patient.patientId;

    const nameSearch = await request(app)
      .get('/api/v1/patients')
      .set(getAuthHeaders(token))
      .query({ search: 'Searchable' });
    const phoneSearch = await request(app)
      .get('/api/v1/patients')
      .set(getAuthHeaders(token))
      .query({ search: '9111111111' });
    const idSearch = await request(app)
      .get('/api/v1/patients')
      .set(getAuthHeaders(token))
      .query({ search: patientId });

    expect(nameSearch.body.data.patients).toHaveLength(1);
    expect(phoneSearch.body.data.patients).toHaveLength(1);
    expect(idSearch.body.data.patients).toHaveLength(1);
  });

  it('update patient works', async () => {
    const { token } = await createUserWithClinic({ role: ROLES.ADMIN });
    const createResponse = await request(app)
      .post('/api/v1/patients')
      .set(getAuthHeaders(token))
      .send({
        firstName: 'Before',
        gender: 'male',
        phone: '9222222222'
      });

    const response = await request(app)
      .patch(`/api/v1/patients/${createResponse.body.data.patient._id}`)
      .set(getAuthHeaders(token))
      .send({
        firstName: 'After',
        allergies: ['Dust']
      });

    expect(response.status).toBe(200);
    expect(response.body.data.patient.firstName).toBe('After');
    expect(response.body.data.patient.allergies).toEqual(['Dust']);
  });

  it('soft delete works', async () => {
    const { token } = await createUserWithClinic({ role: ROLES.ADMIN });
    const createResponse = await request(app)
      .post('/api/v1/patients')
      .set(getAuthHeaders(token))
      .send({
        firstName: 'ToDelete',
        gender: 'male',
        phone: '9333333333'
      });

    const response = await request(app)
      .delete(`/api/v1/patients/${createResponse.body.data.patient._id}`)
      .set(getAuthHeaders(token));

    expect(response.status).toBe(200);
    expect(response.body.data.patient.isActive).toBe(false);
  });

  it('history endpoint returns safe structure', async () => {
    const admin = await createUserWithClinic({ role: ROLES.ADMIN });
    const doctor = await createUserWithClinic({
      role: ROLES.DOCTOR,
      clinicId: admin.clinic._id
    });

    const createResponse = await request(app)
      .post('/api/v1/patients')
      .set(getAuthHeaders(admin.token))
      .send({
        firstName: 'History',
        gender: 'female',
        phone: '9444444444'
      });

    const response = await request(app)
      .get(`/api/v1/patients/${createResponse.body.data.patient._id}/history`)
      .set(getAuthHeaders(doctor.token));

    expect(response.status).toBe(200);
    expect(response.body.data.summary).toEqual({
      totalAppointments: 0,
      totalConsultations: 0,
      totalPrescriptions: 0,
      totalInvoices: 0,
      totalLabOrders: 0,
      totalDispensings: 0,
      totalNotifications: 0,
      totalFollowUps: 0
    });
    expect(response.body.data.appointments).toEqual([]);
    expect(response.body.data.consultations).toEqual([]);
    expect(response.body.data.prescriptions).toEqual([]);
    expect(response.body.data.invoices).toEqual([]);
    expect(response.body.data.labs).toEqual([]);
    expect(response.body.data.dispensings).toEqual([]);
    expect(response.body.data.notifications).toEqual([]);
    expect(response.body.data.followUps).toEqual([]);
  });
});
