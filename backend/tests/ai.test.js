const request = require('supertest');

const { ROLES } = require('../src/common/constants/roles');
const { createUserWithClinic, getAuthHeaders } = require('./helpers/phase3.helper');

let app;

beforeAll(() => {
  app = require('../src/app');
});

beforeEach(() => {
  jest.restoreAllMocks();
});

describe('AI proxy routes', () => {
  it('validates symptom-check payloads', async () => {
    const admin = await createUserWithClinic({ role: ROLES.ADMIN });

    const response = await request(app)
      .post('/api/v1/ai/symptom-check')
      .set(getAuthHeaders(admin.token))
      .send({
        symptoms: 'ok',
        age: 200
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validation failed.');
  });

  it('returns safe 503 when AI service is unavailable', async () => {
    const admin = await createUserWithClinic({ role: ROLES.ADMIN });

    const response = await request(app)
      .post('/api/v1/ai/no-show')
      .set(getAuthHeaders(admin.token))
      .send({
        patient_id: 'PAT-0001',
        appointment_time: '2026-04-25T10:30:00Z'
      });

    expect(response.status).toBe(503);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('AI service is temporarily unavailable');
    expect(response.body.errors).toEqual(['Unable to connect to AI service']);
    expect(response.body.stack).toBeUndefined();
  });

  it('accepts the no-show-predict proxy alias', async () => {
    const admin = await createUserWithClinic({ role: ROLES.ADMIN });
    const aiService = require('../src/modules/ai/ai.service');

    jest.spyOn(aiService, 'noShow').mockResolvedValue({
      success: true,
      message: 'No-show risk generated successfully',
      data: {
        output: {
          risk_score: 0.41,
          risk_level: 'medium',
          reason_codes: ['REMINDER_NOT_SENT'],
          recommended_action: 'Send reminder and confirm appointment.',
          requires_staff_review: true
        },
        confidence: 0.58,
        model_name: 'rule_based_no_show',
        model_version: 'phase-20-fallback-1.0.0',
        model_status: 'fallback',
        audit_id: 'audit-no-show-001'
      }
    });

    const response = await request(app)
      .post('/api/v1/ai/no-show-predict')
      .set(getAuthHeaders(admin.token))
      .send({
        patient_id: 'PAT-0001',
        appointment_date: '2026-05-10',
        appointment_time: '10:30',
        previous_visits: 1,
        previous_no_shows: 0,
        previous_cancellations: 0,
        reminder_sent: false,
        payment_status: 'pending'
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.output.risk_level).toBe('medium');
  });

  it('allows patients to use symptom-check', async () => {
    const patient = await createUserWithClinic({ role: ROLES.PATIENT });
    const aiService = require('../src/modules/ai/ai.service');

    jest.spyOn(aiService, 'symptomCheck').mockResolvedValue({
      success: true,
      message: 'Symptom analysis generated successfully',
      data: {
        possibleConditions: [{ name: 'Common cold', reason: 'Short-duration upper respiratory symptoms.' }],
        recommendedSpecialization: 'General Physician',
        urgency: 'low',
        redFlags: [],
        disclaimer: 'AI suggestions are assistive only and not a final diagnosis.'
      }
    });

    const response = await request(app)
      .post('/api/v1/ai/symptom-check')
      .set(getAuthHeaders(patient.token))
      .send({
        symptoms: 'fever and sore throat for 2 days',
        age: 20,
        gender: 'male',
        duration: '2 days'
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.recommendedSpecialization).toBe('General Physician');
  });

  it('proxies prescription advice formatting through the backend AI route', async () => {
    const admin = await createUserWithClinic({ role: ROLES.ADMIN });
    const aiService = require('../src/modules/ai/ai.service');

    jest.spyOn(aiService, 'formatPrescriptionAdvice').mockResolvedValue({
      success: true,
      message: 'Advice formatted successfully',
      data: {
        formattedAdvice: 'Advice: Hydration and rest for three days.',
        disclaimer: 'AI assistance is not a final diagnosis or prescription. Doctor approval is mandatory.',
        doctor_review_required: true
      }
    });

    const response = await request(app)
      .post('/api/v1/ai/prescription/format-advice')
      .set(getAuthHeaders(admin.token))
      .send({
        diagnosis: 'Viral fever',
        doctorNotes: 'Patient is stable.',
        rawAdvice: 'Hydration and rest for three days'
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.doctor_review_required).toBe(true);
  });

  it('proxies OCR extraction multipart uploads through the backend AI route', async () => {
    const receptionist = await createUserWithClinic({ role: ROLES.RECEPTIONIST });
    const aiService = require('../src/modules/ai/ai.service');

    jest.spyOn(aiService, 'ocrExtract').mockResolvedValue({
      success: true,
      message: 'OCR extraction completed successfully',
      data: {
        output: { document_type: 'patient_id', extracted_fields: {}, pages: [], raw_text: '' },
        requires_human_review: true,
        model_status: 'fallback'
      }
    });

    const response = await request(app)
      .post('/api/v1/ai/ocr-extract')
      .set(getAuthHeaders(receptionist.token))
      .field('document_type', 'patient_id')
      .attach('file', Buffer.from('Name: Rahul Sharma'), 'document.png');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.requires_human_review).toBe(true);
  });

  it('proxies lab report extraction multipart uploads through the backend AI route', async () => {
    const labTechnician = await createUserWithClinic({ role: ROLES.LAB_TECHNICIAN });
    const aiService = require('../src/modules/ai/ai.service');

    jest.spyOn(aiService, 'labReportExtract').mockResolvedValue({
      success: true,
      message: 'Lab report extraction completed successfully',
      data: {
        output: { test_results: [], abnormal_values: [], critical_values: [], raw_text: '' },
        requires_doctor_review: true,
        requires_human_review: true,
        model_status: 'fallback'
      }
    });

    const response = await request(app)
      .post('/api/v1/ai/lab-report-extract')
      .set(getAuthHeaders(labTechnician.token))
      .field('patient_gender', 'male')
      .attach('file', Buffer.from('Hemoglobin 10.2 g/dL 13.0-17.0'), 'report.pdf');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.requires_human_review).toBe(true);
  });
});
