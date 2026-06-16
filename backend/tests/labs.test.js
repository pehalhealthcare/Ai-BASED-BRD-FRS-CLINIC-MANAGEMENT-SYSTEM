const request = require('supertest');

const { ROLES } = require('../src/common/constants/roles');
const { createDoctorRecord, createPatientRecord, createUserWithClinic, getAuthHeaders } = require('./helpers/phase3.helper');

let app;

const createAppointmentRecord = async ({ clinicId, patientId, doctorId, createdBy, overrides = {} }) =>
  require('../src/modules/appointments/appointment.model').create({
    clinicId,
    patientId,
    doctorId,
    createdBy,
    appointmentDate: new Date('2026-04-23T00:00:00.000Z'),
    startTime: '09:00',
    endTime: '09:30',
    durationMinutes: 30,
    appointmentType: 'scheduled',
    status: 'confirmed',
    reasonForVisit: 'Fever and weakness',
    symptomsSummary: 'fever',
    source: 'reception',
    ...overrides
  });

const createConsultationRecord = async ({
  clinicId,
  patientId,
  doctorId,
  appointmentId,
  createdBy
}) =>
  require('../src/modules/consultations/consultation.model').create({
    clinicId,
    patientId,
    doctorId,
    appointmentId,
    chiefComplaint: 'Fever and weakness',
    status: 'in_progress',
    startedAt: new Date(),
    createdBy,
    updatedBy: createdBy
  });

beforeAll(() => {
  app = require('../src/app');
});

beforeEach(() => {
  jest.restoreAllMocks();
});

describe('Lab routes', () => {
  it('creates a lab test catalog item', async () => {
    const admin = await createUserWithClinic({ role: ROLES.ADMIN });

    const response = await request(app)
      .post('/api/v1/labs/tests')
      .set(getAuthHeaders(admin.token))
      .send({
        code: 'CBC',
        name: 'Complete Blood Count',
        category: 'Hematology',
        specimenType: 'Blood',
        unit: '',
        normalRange: { text: 'Varies by parameter' },
        price: 350
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.labTest.code).toBe('CBC');
    expect(response.body.data.labTest.category).toBe('Hematology');
  });

  it('creates a lab order, generates order number, and marks consultation labOrdered', async () => {
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
    const labTest = await require('../src/modules/labs/labTest.model').create({
      clinicId: admin.clinic._id,
      code: 'CBC',
      name: 'Complete Blood Count',
      category: 'Hematology',
      specimenType: 'Blood',
      unit: '',
      normalRange: { text: 'Varies by parameter' },
      createdBy: admin.user._id,
      updatedBy: admin.user._id
    });

    const response = await request(app)
      .post('/api/v1/labs/orders')
      .set(getAuthHeaders(admin.token))
      .send({
        consultationId: consultation._id.toString(),
        patientId: patient._id.toString(),
        doctorId: doctor._id.toString(),
        priority: 'routine',
        notes: 'Rule out infection',
        tests: [
          {
            labTestId: labTest._id.toString(),
            code: 'CBC',
            name: 'Complete Blood Count'
          }
        ]
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.labOrder.orderNumber).toMatch(/^LAB-\d{8}-\d{4}$/);
    expect(response.body.data.labOrder.tests).toHaveLength(1);
    expect(response.body.data.labOrder.tests[0].code).toBe('CBC');

    const refreshedConsultation = await require('../src/modules/consultations/consultation.model').findById(
      consultation._id
    );
    expect(refreshedConsultation.labOrdered).toBe(true);
  });

  it('validates lab order status transitions', async () => {
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
    const labOrder = await require('../src/modules/labs/labOrder.model').LabOrder.create({
      clinicId: admin.clinic._id,
      consultationId: consultation._id,
      patientId: patient._id,
      doctorId: doctor._id,
      orderNumber: 'LAB-20260423-0001',
      tests: [
        {
          code: 'CBC',
          name: 'Complete Blood Count',
          category: 'Hematology',
          specimenType: 'Blood',
          unit: '',
          normalRange: { text: 'Varies by parameter' },
          status: 'ordered'
        }
      ],
      status: 'ordered',
      createdBy: admin.user._id,
      updatedBy: admin.user._id
    });

    const invalidResponse = await request(app)
      .patch(`/api/v1/labs/orders/${labOrder._id}/status`)
      .set(getAuthHeaders(admin.token))
      .send({ status: 'completed' });

    expect(invalidResponse.status).toBe(400);
    expect(invalidResponse.body.success).toBe(false);

    const validResponse = await request(app)
      .patch(`/api/v1/labs/orders/${labOrder._id}/status`)
      .set(getAuthHeaders(admin.token))
      .send({ status: 'sample_collected' });

    expect(validResponse.status).toBe(200);
    expect(validResponse.body.data.labOrder.status).toBe('sample_collected');
    expect(validResponse.body.data.labOrder.tests[0].status).toBe('sample_collected');
  });

  it('creates a lab report and computes abnormal flags', async () => {
    const admin = await createUserWithClinic({ role: ROLES.ADMIN });
    const aiService = require('../src/modules/ai/ai.service');
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
    const labOrder = await require('../src/modules/labs/labOrder.model').LabOrder.create({
      clinicId: admin.clinic._id,
      consultationId: consultation._id,
      patientId: patient._id,
      doctorId: doctor._id,
      orderNumber: 'LAB-20260423-0002',
      tests: [
        {
          code: 'HB',
          name: 'Hemoglobin',
          category: 'Hematology',
          specimenType: 'Blood',
          unit: 'g/dL',
          normalRange: { min: 12, max: 16 },
          status: 'ordered'
        }
      ],
      status: 'processing',
      createdBy: admin.user._id,
      updatedBy: admin.user._id
    });

    jest.spyOn(aiService, 'analyzeLabResults').mockResolvedValue({
      success: true,
      message: 'Lab analysis generated successfully',
      data: {
        output: {
          abnormal_values: [
            {
              test_name: 'Hemoglobin',
              value: 10.2,
              unit: 'g/dL',
              status: 'low',
              normal_range: {
                min: 13,
                max: 17,
                unit: 'g/dL',
                source: 'local_reference'
              },
              severity: 'medium',
              message: 'Hemoglobin is below the expected reference range.'
            }
          ],
          critical_values: [],
          trend_summary: [],
          manual_review_items: [],
          overall_risk_level: 'medium',
          doctor_review_required: true,
          rule_status: 'available',
          trend_status: 'no_previous_data',
          notes: ['AI lab analysis is assistive only and must be reviewed by a doctor.']
        },
        confidence: 0.85,
        explanation: 'Lab values were evaluated using configured normal and critical reference ranges.',
        risk_level: 'medium',
        requires_doctor_review: true,
        requires_human_review: true,
        model_name: 'lab_rule_engine',
        model_version: '1.0.0',
        model_status: 'available',
        audit_id: 'audit-lab-001'
      }
    });

    const response = await request(app)
      .post('/api/v1/labs/reports')
      .set(getAuthHeaders(admin.token))
      .send({
        labOrderId: labOrder._id.toString(),
        reportFileName: 'cbc_report.pdf',
        reportUrl: '/uploads/reports/cbc_report.pdf',
        resultEntries: [
          {
            code: 'HB',
            name: 'Hemoglobin',
            value: '10.2',
            numericValue: 10.2,
            unit: 'g/dL',
            normalRange: { min: 12, max: 16 }
          }
        ]
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.labReport.resultEntries[0].isAbnormal).toBe(true);
    expect(response.body.data.labReport.resultEntries[0].abnormalFlag).toBe('low');
    expect(response.body.data.labReport.aiAnalysis.output.abnormal_values).toHaveLength(1);
    expect(response.body.data.labReport.aiRiskLevel).toBe('medium');
    expect(response.body.data.labReport.aiReviewStatus).toBe('pending_review');

    const refreshedOrder = await require('../src/modules/labs/labOrder.model').LabOrder.findById(labOrder._id);
    expect(refreshedOrder.status).toBe('completed');
  });

  it('persists ai_service_unavailable without breaking lab report save', async () => {
    const admin = await createUserWithClinic({ role: ROLES.ADMIN });
    const aiService = require('../src/modules/ai/ai.service');
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
    const labOrder = await require('../src/modules/labs/labOrder.model').LabOrder.create({
      clinicId: admin.clinic._id,
      consultationId: consultation._id,
      patientId: patient._id,
      doctorId: doctor._id,
      orderNumber: 'LAB-20260423-0004',
      tests: [
        {
          code: 'CR',
          name: 'Creatinine',
          category: 'Biochemistry',
          specimenType: 'Blood',
          unit: 'mg/dL',
          normalRange: { min: 0.6, max: 1.3 },
          status: 'ordered'
        }
      ],
      status: 'processing',
      createdBy: admin.user._id,
      updatedBy: admin.user._id
    });

    jest.spyOn(aiService, 'analyzeLabResults').mockRejectedValue(new Error('AI down'));

    const response = await request(app)
      .post('/api/v1/labs/reports')
      .set(getAuthHeaders(admin.token))
      .send({
        labOrderId: labOrder._id.toString(),
        resultEntries: [
          {
            code: 'CR',
            name: 'Creatinine',
            value: '1.1',
            numericValue: 1.1,
            unit: 'mg/dL',
            normalRange: { min: 0.6, max: 1.3 }
          }
        ]
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.labReport.aiAnalysisStatus).toBe('ai_service_unavailable');
  });

  it('updates lab AI review status and note', async () => {
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
    const labOrder = await require('../src/modules/labs/labOrder.model').LabOrder.create({
      clinicId: admin.clinic._id,
      consultationId: consultation._id,
      patientId: patient._id,
      doctorId: doctor._id,
      orderNumber: 'LAB-20260423-0005',
      tests: [{ code: 'HB', name: 'Hemoglobin', status: 'completed' }],
      status: 'completed',
      createdBy: admin.user._id,
      updatedBy: admin.user._id
    });
    const labReport = await require('../src/modules/labs/labReport.model').create({
      clinicId: admin.clinic._id,
      labOrderId: labOrder._id,
      patientId: patient._id,
      consultationId: consultation._id,
      resultEntries: [
        {
          code: 'HB',
          name: 'Hemoglobin',
          value: '10.0',
          numericValue: 10,
          unit: 'g/dL',
          isAbnormal: true,
          abnormalFlag: 'low'
        }
      ],
      aiAnalysis: {
        output: {
          abnormal_values: [{ test_name: 'Hemoglobin', status: 'low' }]
        },
        risk_level: 'medium'
      },
      aiAnalysisStatus: 'available',
      aiRiskLevel: 'medium',
      aiReviewStatus: 'pending_review',
      createdBy: admin.user._id,
      updatedBy: admin.user._id
    });

    const response = await request(app)
      .patch(`/api/v1/labs/reports/${labReport._id}/ai-review`)
      .set(getAuthHeaders(admin.token))
      .send({
        decision: 'accepted',
        reviewNote: 'Doctor agrees with the abnormal flag.'
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.labReport.aiReviewStatus).toBe('accepted');
    expect(response.body.data.labReport.aiReviewNote).toBe('Doctor agrees with the abnormal flag.');
    expect(response.body.data.labReport.aiReviewedAt).toBeTruthy();
  });

  it('blocks unauthorized roles from marking lab AI review', async () => {
    const admin = await createUserWithClinic({ role: ROLES.ADMIN });
    const receptionist = await createUserWithClinic({ role: ROLES.RECEPTIONIST });
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
    const labOrder = await require('../src/modules/labs/labOrder.model').LabOrder.create({
      clinicId: admin.clinic._id,
      consultationId: consultation._id,
      patientId: patient._id,
      doctorId: doctor._id,
      orderNumber: 'LAB-20260423-0006',
      tests: [{ code: 'HB', name: 'Hemoglobin', status: 'completed' }],
      status: 'completed',
      createdBy: admin.user._id,
      updatedBy: admin.user._id
    });
    const labReport = await require('../src/modules/labs/labReport.model').create({
      clinicId: admin.clinic._id,
      labOrderId: labOrder._id,
      patientId: patient._id,
      consultationId: consultation._id,
      aiAnalysis: { output: { abnormal_values: [] } },
      aiAnalysisStatus: 'available',
      aiReviewStatus: 'pending_review',
      createdBy: admin.user._id,
      updatedBy: admin.user._id
    });

    const response = await request(app)
      .patch(`/api/v1/labs/reports/${labReport._id}/ai-review`)
      .set(getAuthHeaders(receptionist.token))
      .send({
        decision: 'reviewed',
        reviewNote: 'Should not be allowed'
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it('returns patient lab history newest-first with report summary', async () => {
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
    const { LabOrder } = require('../src/modules/labs/labOrder.model');
    const LabReport = require('../src/modules/labs/labReport.model');

    const [olderOrder, newerOrder] = await LabOrder.create([
      {
        clinicId: admin.clinic._id,
        consultationId: consultation._id,
        patientId: patient._id,
        doctorId: doctor._id,
        orderNumber: 'LAB-20260422-0001',
        tests: [{ code: 'CBC', name: 'Complete Blood Count', status: 'completed' }],
        status: 'completed',
        orderedAt: new Date('2026-04-22T08:00:00.000Z'),
        createdBy: admin.user._id,
        updatedBy: admin.user._id
      },
      {
        clinicId: admin.clinic._id,
        consultationId: consultation._id,
        patientId: patient._id,
        doctorId: doctor._id,
        orderNumber: 'LAB-20260423-0003',
        tests: [{ code: 'CRP', name: 'C-Reactive Protein', status: 'ordered' }],
        status: 'ordered',
        orderedAt: new Date('2026-04-23T08:00:00.000Z'),
        createdBy: admin.user._id,
        updatedBy: admin.user._id
      }
    ]);

    await LabReport.create({
      clinicId: admin.clinic._id,
      labOrderId: olderOrder._id,
      patientId: patient._id,
      consultationId: consultation._id,
      resultEntries: [
        {
          code: 'CBC',
          name: 'Complete Blood Count',
          value: 'Normal',
          isAbnormal: false,
          abnormalFlag: 'normal'
        }
      ],
      aiAnalysis: {
        output: {
          abnormal_values: [],
          critical_values: [],
          trend_summary: [],
          manual_review_items: [],
          overall_risk_level: 'low',
          doctor_review_required: true,
          rule_status: 'available',
          trend_status: 'no_previous_data',
          notes: ['AI lab analysis is assistive only and must be reviewed by a doctor.']
        },
        confidence: 0.85,
        explanation: 'Lab values were evaluated using configured normal and critical reference ranges.',
        risk_level: 'low',
        requires_doctor_review: true,
        requires_human_review: true,
        model_name: 'lab_rule_engine',
        model_version: '1.0.0',
        model_status: 'available',
        audit_id: 'audit-history-001'
      },
      aiAnalysisStatus: 'available',
      aiRiskLevel: 'low',
      aiReviewStatus: 'reviewed',
      status: 'reviewed',
      createdBy: admin.user._id,
      updatedBy: admin.user._id
    });

    const response = await request(app)
      .get(`/api/v1/patients/${patient._id}/labs?page=1&limit=10`)
      .set(getAuthHeaders(admin.token));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.labOrders).toHaveLength(2);
    expect(response.body.data.labOrders[0].orderNumber).toBe(newerOrder.orderNumber);
    expect(response.body.data.labOrders[1].report.status).toBe('reviewed');
  });

  it('enforces clinic scoping for lab order detail', async () => {
    const clinicOneAdmin = await createUserWithClinic({ role: ROLES.ADMIN });
    const clinicTwoAdmin = await createUserWithClinic({ role: ROLES.ADMIN });
    const patient = await createPatientRecord({
      clinicId: clinicOneAdmin.clinic._id,
      createdBy: clinicOneAdmin.user._id
    });
    const doctor = await createDoctorRecord({
      clinicId: clinicOneAdmin.clinic._id,
      createdBy: clinicOneAdmin.user._id
    });
    const appointment = await createAppointmentRecord({
      clinicId: clinicOneAdmin.clinic._id,
      patientId: patient._id,
      doctorId: doctor._id,
      createdBy: clinicOneAdmin.user._id
    });
    const consultation = await createConsultationRecord({
      clinicId: clinicOneAdmin.clinic._id,
      patientId: patient._id,
      doctorId: doctor._id,
      appointmentId: appointment._id,
      createdBy: clinicOneAdmin.user._id
    });
    const labOrder = await require('../src/modules/labs/labOrder.model').LabOrder.create({
      clinicId: clinicOneAdmin.clinic._id,
      consultationId: consultation._id,
      patientId: patient._id,
      doctorId: doctor._id,
      orderNumber: 'LAB-20260423-0099',
      tests: [{ code: 'CBC', name: 'Complete Blood Count', status: 'ordered' }],
      status: 'ordered',
      createdBy: clinicOneAdmin.user._id,
      updatedBy: clinicOneAdmin.user._id
    });

    const response = await request(app)
      .get(`/api/v1/labs/orders/${labOrder._id}`)
      .set(getAuthHeaders(clinicTwoAdmin.token));

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });
});
