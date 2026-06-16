const request = require('supertest');

const { ROLES } = require('../src/common/constants/roles');
const {
  createDoctorRecord,
  createPatientRecord,
  createUserWithClinic,
  getAuthHeaders
} = require('./helpers/phase3.helper');

let app;

const createAppointmentRecord = async ({ clinicId, patientId, doctorId, createdBy }) =>
  require('../src/modules/appointments/appointment.model').create({
    clinicId,
    patientId,
    doctorId,
    createdBy,
    appointmentDate: new Date('2026-04-26T00:00:00.000Z'),
    startTime: '10:00',
    endTime: '10:30',
    durationMinutes: 30,
    appointmentType: 'scheduled',
    status: 'completed',
    reasonForVisit: 'Follow-up',
    symptomsSummary: 'fever',
    source: 'reception'
  });

const createConsultationRecord = async ({ clinicId, patientId, doctorId, appointmentId, createdBy }) =>
  require('../src/modules/consultations/consultation.model').create({
    clinicId,
    patientId,
    doctorId,
    appointmentId,
    chiefComplaint: 'Fever',
    status: 'completed',
    startedAt: new Date('2026-04-26T10:00:00.000Z'),
    completedAt: new Date('2026-04-26T10:20:00.000Z'),
    diagnosis: {
      primary: 'Viral fever',
      secondary: [],
      notes: ''
    },
    treatmentPlan: 'Hydration',
    billingReady: true,
    createdBy,
    updatedBy: createdBy
  });

beforeAll(() => {
  app = require('../src/app');
});

beforeEach(() => {
  jest.restoreAllMocks();
});

describe('Billing anomaly admin workflow', () => {
  it('persists billing anomaly data when an invoice is created', async () => {
    const admin = await createUserWithClinic({ role: ROLES.ADMIN });
    const aiService = require('../src/modules/ai/ai.service');
    const BillingAnomaly = require('../src/modules/billing/billingAnomaly.model');
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

    jest.spyOn(aiService, 'getBillingAnomaly').mockResolvedValue({
      success: true,
      data: {
        output: {
          anomaly_score: 0.82,
          triggered_rules: [
            {
              code: 'UNUSUAL_DISCOUNT',
              severity: 'medium',
              message: 'Discount review required.',
              evidence: { discount_percent: 35 }
            }
          ]
        },
        confidence: 0.58,
        explanation: 'Rule-based billing anomaly review was used.',
        risk_level: 'high',
        requires_admin_review: true,
        model_name: 'billing_isolation_forest',
        model_version: 'v1',
        model_status: 'fallback',
        audit_id: 'billing-audit-001'
      }
    });

    const response = await request(app)
      .post('/api/v1/billing/invoices')
      .set(getAuthHeaders(admin.token))
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
        discountValue: 35,
        gstRate: 18
      });

    expect(response.status).toBe(201);
    const invoiceId = response.body.data.invoice._id;

    const anomaly = await BillingAnomaly.findOne({
      clinicId: admin.clinic._id,
      invoiceId
    }).lean();

    expect(anomaly).toBeTruthy();
    expect(anomaly.riskLevel).toBe('high');
    expect(anomaly.modelStatus).toBe('fallback');
    expect(anomaly.triggeredRules[0].code).toBe('UNUSUAL_DISCOUNT');
  });

  it('allows admin users to list, view, and review billing anomalies', async () => {
    const admin = await createUserWithClinic({ role: ROLES.ADMIN });
    const patient = await createPatientRecord({ clinicId: admin.clinic._id, createdBy: admin.user._id });
    const invoice = await require('../src/modules/billing/invoice.model').create({
      invoiceNumber: 'INV-BILLING-ANOM-1',
      clinicId: admin.clinic._id,
      patientId: patient._id,
      createdBy: admin.user._id,
      updatedBy: admin.user._id,
      items: [
        {
          itemType: 'consultation',
          name: 'Consultation fee',
          quantity: 1,
          unitPrice: 500,
          amount: 500
        }
      ],
      subtotal: 500,
      taxableAmount: 500,
      totalAmount: 500,
      paidAmount: 0,
      dueAmount: 500,
      paymentStatus: 'unpaid',
      invoiceStatus: 'issued'
    });
    const anomalyRecord = await require('../src/modules/billing/billingAnomaly.model').create({
      clinicId: admin.clinic._id,
      invoiceId: invoice._id,
      patientId: patient._id,
      anomalyScore: 0.7,
      riskLevel: 'high',
      triggeredRules: [
        {
          code: 'DUPLICATE_INVOICE',
          severity: 'high',
          message: 'Duplicate invoice activity detected.',
          evidence: { duplicate_invoice_count: 1 }
        }
      ],
      requiresAdminReview: true,
      modelName: 'billing_isolation_forest',
      modelVersion: 'v1',
      modelStatus: 'available',
      explanation: 'IsolationForest and rules flagged this invoice.',
      auditId: 'billing-audit-002'
    });

    const listResponse = await request(app)
      .get('/api/v1/admin/billing-anomalies')
      .set(getAuthHeaders(admin.token));

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data.summary.totalFlagged).toBe(1);
    expect(listResponse.body.data.anomalies).toHaveLength(1);

    const detailResponse = await request(app)
      .get(`/api/v1/admin/billing-anomalies/${anomalyRecord._id}`)
      .set(getAuthHeaders(admin.token));

    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.data.anomaly.auditId).toBe('billing-audit-002');

    const reviewResponse = await request(app)
      .patch(`/api/v1/admin/billing-anomalies/${anomalyRecord._id}/review`)
      .set(getAuthHeaders(admin.token))
      .send({
        reviewStatus: 'confirmed',
        reviewNotes: 'Confirmed after reconciliation review.'
      });

    expect(reviewResponse.status).toBe(200);
    expect(reviewResponse.body.data.anomaly.reviewStatus).toBe('confirmed');
    expect(reviewResponse.body.data.anomaly.reviewNotes).toBe('Confirmed after reconciliation review.');
  });

  it('blocks non-admin roles from accessing billing anomaly review endpoints', async () => {
    const admin = await createUserWithClinic({ role: ROLES.ADMIN });
    const doctorUser = await createUserWithClinic({ role: ROLES.DOCTOR, clinicId: admin.clinic._id });
    const patient = await createPatientRecord({ clinicId: admin.clinic._id, createdBy: admin.user._id });
    const invoice = await require('../src/modules/billing/invoice.model').create({
      invoiceNumber: 'INV-BILLING-ANOM-2',
      clinicId: admin.clinic._id,
      patientId: patient._id,
      createdBy: admin.user._id,
      updatedBy: admin.user._id,
      items: [
        {
          itemType: 'consultation',
          name: 'Consultation fee',
          quantity: 1,
          unitPrice: 500,
          amount: 500
        }
      ],
      subtotal: 500,
      taxableAmount: 500,
      totalAmount: 500,
      paidAmount: 0,
      dueAmount: 500,
      paymentStatus: 'unpaid',
      invoiceStatus: 'issued'
    });
    const anomalyRecord = await require('../src/modules/billing/billingAnomaly.model').create({
      clinicId: admin.clinic._id,
      invoiceId: invoice._id,
      patientId: patient._id,
      anomalyScore: 0.4,
      riskLevel: 'medium',
      triggeredRules: [],
      requiresAdminReview: true,
      modelName: 'billing_isolation_forest',
      modelVersion: 'v1',
      modelStatus: 'fallback',
      explanation: 'Rule-based fallback used.',
      auditId: 'billing-audit-003'
    });

    const listResponse = await request(app)
      .get('/api/v1/admin/billing-anomalies')
      .set(getAuthHeaders(doctorUser.token));

    expect(listResponse.status).toBe(403);

    const reviewResponse = await request(app)
      .patch(`/api/v1/admin/billing-anomalies/${anomalyRecord._id}/review`)
      .set(getAuthHeaders(doctorUser.token))
      .send({
        reviewStatus: 'dismissed',
        reviewNotes: 'Not allowed'
      });

    expect(reviewResponse.status).toBe(403);
  });
});
