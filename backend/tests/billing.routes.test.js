const request = require('supertest');

const { APPOINTMENT_STATUSES } = require('../src/common/constants/appointmentStatus');
const { ROLES } = require('../src/common/constants/roles');
const {
  createDoctorRecord,
  createPatientRecord,
  createUserWithClinic,
  getAuthHeaders
} = require('./helpers/phase3.helper');

jest.mock('../src/common/utils/pdfGenerator', () => ({
  ensureDirectory: jest.fn(),
  generateInvoicePdf: jest.fn(async ({ invoice }) => {
    const fs = require('fs');
    const path = require('path');
    const directory = path.resolve(process.cwd(), 'storage', 'invoices');
    await fs.promises.mkdir(directory, { recursive: true });
    const filePath = path.join(directory, `${invoice.invoiceNumber}.pdf`);
    await fs.promises.writeFile(filePath, '%PDF-1.4 mock invoice');
    return {
      filePath,
      relativePath: `storage/invoices/${invoice.invoiceNumber}.pdf`
    };
  })
}));

let app;

const createAppointmentRecord = async ({ clinicId, patientId, doctorId, createdBy, overrides = {} }) =>
  require('../src/modules/appointments/appointment.model').create({
    clinicId,
    patientId,
    doctorId,
    createdBy,
    appointmentDate: new Date('2026-04-22T00:00:00.000Z'),
    startTime: '10:00',
    endTime: '10:30',
    durationMinutes: 30,
    appointmentType: 'scheduled',
    status: APPOINTMENT_STATUSES.COMPLETED,
    reasonForVisit: 'Follow-up review',
    symptomsSummary: 'fever, cough',
    source: 'reception',
    ...overrides
  });

const createConsultationRecord = async ({ clinicId, patientId, doctorId, appointmentId, createdBy, overrides = {} }) =>
  require('../src/modules/consultations/consultation.model').create({
    clinicId,
    patientId,
    doctorId,
    appointmentId,
    chiefComplaint: 'Fever and cough',
    symptoms: [{ name: 'fever', severity: 'moderate', duration: '2 days', notes: '' }],
    clinicalNotes: 'Patient reports fever for two days.',
    diagnosis: {
      primary: 'Viral fever',
      secondary: [],
      notes: 'Stable'
    },
    treatmentPlan: 'Hydration and rest',
    status: 'completed',
    billingReady: true,
    createdBy,
    updatedBy: createdBy,
    ...overrides
  });

beforeAll(() => {
  app = require('../src/app');
});

describe('Billing routes', () => {
  it('requires auth to create invoice', async () => {
    const response = await request(app).post('/api/v1/billing/invoices').send({});
    expect(response.status).toBe(401);
  });

  it('blocks doctor role from creating invoice', async () => {
    const doctorUser = await createUserWithClinic({ role: ROLES.DOCTOR });
    const response = await request(app)
      .post('/api/v1/billing/invoices')
      .set(getAuthHeaders(doctorUser.token))
      .send({
        items: []
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it('validates required invoice fields', async () => {
    const admin = await createUserWithClinic({ role: ROLES.ADMIN });
    const response = await request(app)
      .post('/api/v1/billing/invoices')
      .set(getAuthHeaders(admin.token))
      .send({
        items: []
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('creates invoice and calculates totals', async () => {
    const receptionist = await createUserWithClinic({ role: ROLES.RECEPTIONIST });
    const patient = await createPatientRecord({ clinicId: receptionist.clinic._id, createdBy: receptionist.user._id });
    const doctor = await createDoctorRecord({ clinicId: receptionist.clinic._id, createdBy: receptionist.user._id });
    const appointment = await createAppointmentRecord({
      clinicId: receptionist.clinic._id,
      patientId: patient._id,
      doctorId: doctor._id,
      createdBy: receptionist.user._id
    });
    const consultation = await createConsultationRecord({
      clinicId: receptionist.clinic._id,
      patientId: patient._id,
      doctorId: doctor._id,
      appointmentId: appointment._id,
      createdBy: receptionist.user._id
    });

    const response = await request(app)
      .post('/api/v1/billing/invoices')
      .set(getAuthHeaders(receptionist.token))
      .send({
        patientId: patient._id.toString(),
        appointmentId: appointment._id.toString(),
        consultationId: consultation._id.toString(),
        items: [
          {
            itemType: 'consultation',
            name: 'General Consultation',
            quantity: 1,
            unitPrice: 500
          }
        ],
        discountType: 'percentage',
        discountValue: 10,
        gstRate: 18
      });

    expect(response.status).toBe(201);
    expect(response.body.data.invoice.invoiceNumber).toMatch(/^INV-\d{8}-\d{4}$/);
    expect(response.body.data.invoice.subtotal).toBe(500);
    expect(response.body.data.invoice.discountAmount).toBe(50);
    expect(response.body.data.invoice.totalAmount).toBe(531);
  });

  it('records payment and updates payment status', async () => {
    const receptionist = await createUserWithClinic({ role: ROLES.RECEPTIONIST });
    const patient = await createPatientRecord({ clinicId: receptionist.clinic._id, createdBy: receptionist.user._id });
    const doctor = await createDoctorRecord({ clinicId: receptionist.clinic._id, createdBy: receptionist.user._id });
    const appointment = await createAppointmentRecord({
      clinicId: receptionist.clinic._id,
      patientId: patient._id,
      doctorId: doctor._id,
      createdBy: receptionist.user._id
    });
    const consultation = await createConsultationRecord({
      clinicId: receptionist.clinic._id,
      patientId: patient._id,
      doctorId: doctor._id,
      appointmentId: appointment._id,
      createdBy: receptionist.user._id
    });

    const createResponse = await request(app)
      .post('/api/v1/billing/invoices')
      .set(getAuthHeaders(receptionist.token))
      .send({
        patientId: patient._id.toString(),
        consultationId: consultation._id.toString(),
        items: [{ itemType: 'consultation', name: 'Consultation', quantity: 1, unitPrice: 1000 }],
        gstRate: 18
      });

    const invoiceId = createResponse.body.data.invoice._id;

    const paymentResponse = await request(app)
      .post(`/api/v1/billing/invoices/${invoiceId}/payments`)
      .set(getAuthHeaders(receptionist.token))
      .send({
        amount: 500,
        paymentMode: 'upi',
        transactionId: 'UPI123'
      });

    expect(paymentResponse.status).toBe(200);
    expect(paymentResponse.body.data.invoice.paymentStatus).toBe('partial');
    expect(paymentResponse.body.data.invoice.paidAmount).toBe(500);
  });

  it('rejects payment greater than the remaining due amount', async () => {
    const receptionist = await createUserWithClinic({ role: ROLES.RECEPTIONIST });
    const patient = await createPatientRecord({ clinicId: receptionist.clinic._id, createdBy: receptionist.user._id });
    const doctor = await createDoctorRecord({ clinicId: receptionist.clinic._id, createdBy: receptionist.user._id });
    const appointment = await createAppointmentRecord({
      clinicId: receptionist.clinic._id,
      patientId: patient._id,
      doctorId: doctor._id,
      createdBy: receptionist.user._id
    });
    const consultation = await createConsultationRecord({
      clinicId: receptionist.clinic._id,
      patientId: patient._id,
      doctorId: doctor._id,
      appointmentId: appointment._id,
      createdBy: receptionist.user._id
    });

    const createResponse = await request(app)
      .post('/api/v1/billing/invoices')
      .set(getAuthHeaders(receptionist.token))
      .send({
        patientId: patient._id.toString(),
        consultationId: consultation._id.toString(),
        items: [{ itemType: 'consultation', name: 'Consultation', quantity: 1, unitPrice: 1000 }],
        gstRate: 18
      });

    const invoiceId = createResponse.body.data.invoice._id;

    const paymentResponse = await request(app)
      .post(`/api/v1/billing/invoices/${invoiceId}/payments`)
      .set(getAuthHeaders(receptionist.token))
      .send({
        amount: 2000,
        paymentMode: 'cash'
      });

    expect(paymentResponse.status).toBe(400);
    expect(paymentResponse.body.success).toBe(false);
    expect(paymentResponse.body.message).toBe('Payment amount cannot exceed the due amount.');
  });

  it('returns invoice detail and generates invoice pdf', async () => {
    const admin = await createUserWithClinic({ role: ROLES.ADMIN });
    const patient = await createPatientRecord({ clinicId: admin.clinic._id, createdBy: admin.user._id });
    const doctor = await createDoctorRecord({ clinicId: admin.clinic._id, createdBy: admin.user._id });
    const appointment = await createAppointmentRecord({
      clinicId: admin.clinic._id,
      patientId: patient._id,
      doctorId: doctor._id,
      createdBy: admin.user._id
    });
    const consultation = await createConsultationRecord({
      clinicId: admin.clinic._id,
      patientId: patient._id,
      doctorId: doctor._id,
      appointmentId: appointment._id,
      createdBy: admin.user._id
    });

    const createResponse = await request(app)
      .post('/api/v1/billing/invoices')
      .set(getAuthHeaders(admin.token))
      .send({
        patientId: patient._id.toString(),
        consultationId: consultation._id.toString(),
        items: [{ itemType: 'consultation', name: 'Consultation', quantity: 1, unitPrice: 600 }],
        gstRate: 18
      });

    const invoiceId = createResponse.body.data.invoice._id;

    const getResponse = await request(app)
      .get(`/api/v1/billing/invoices/${invoiceId}`)
      .set(getAuthHeaders(admin.token));

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.data.invoice._id).toBe(invoiceId);

    const generateResponse = await request(app)
      .post(`/api/v1/billing/invoices/${invoiceId}/generate-pdf`)
      .set(getAuthHeaders(admin.token))
      .send({});

    expect(generateResponse.status).toBe(200);
    expect(generateResponse.body.data.invoice.pdfUrl).toContain(`/billing/invoices/${invoiceId}/pdf`);

    const downloadResponse = await request(app)
      .get(`/api/v1/billing/invoices/${invoiceId}/pdf`)
      .set(getAuthHeaders(admin.token));

    expect(downloadResponse.status).toBe(200);
    expect(downloadResponse.headers['content-type']).toContain('application/pdf');
  });
});
