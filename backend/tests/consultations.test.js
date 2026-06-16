const request = require('supertest');

const { APPOINTMENT_STATUSES } = require('../src/common/constants/appointmentStatus');
const { ROLES } = require('../src/common/constants/roles');
const { createDoctorRecord, createPatientRecord, createUserWithClinic, getAuthHeaders } = require('./helpers/phase3.helper');

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
    status: APPOINTMENT_STATUSES.CONFIRMED,
    reasonForVisit: 'Fever and cough',
    symptomsSummary: 'fever, cough',
    source: 'reception',
    ...overrides
  });

const createDoctorOwnedConsultationContext = async () => {
  const admin = await createUserWithClinic({ role: ROLES.ADMIN });
  const doctorUser = await createUserWithClinic({ role: ROLES.DOCTOR, clinicId: admin.clinic._id });
  const patient = await createPatientRecord({ clinicId: admin.clinic._id, createdBy: admin.user._id });
  const doctor = await createDoctorRecord({
    clinicId: admin.clinic._id,
    createdBy: admin.user._id,
    userId: doctorUser.user._id
  });
  const appointment = await createAppointmentRecord({
    clinicId: admin.clinic._id,
    patientId: patient._id,
    doctorId: doctor._id,
    createdBy: admin.user._id,
    overrides: {
      status: APPOINTMENT_STATUSES.IN_CONSULTATION
    }
  });
  const consultation = await require('../src/modules/consultations/consultation.model').create({
    clinicId: admin.clinic._id,
    appointmentId: appointment._id,
    patientId: patient._id,
    doctorId: doctor._id,
    chiefComplaint: 'Voice note review',
    clinicalNotes: '',
    formattedClinicalNotes: {
      subjective: '',
      objective: '',
      assessment: '',
      plan: ''
    },
    status: 'in_progress',
    startedAt: new Date(),
    createdBy: doctorUser.user._id,
    updatedBy: doctorUser.user._id
  });

  return {
    admin,
    doctorUser,
    patient,
    doctor,
    appointment,
    consultation
  };
};

beforeAll(() => {
  app = require('../src/app');
});

beforeEach(() => {
  jest.restoreAllMocks();
});

describe('Consultation routes', () => {
  it('creates a consultation and marks appointment in consultation', async () => {
    const admin = await createUserWithClinic({ role: ROLES.ADMIN });
    const patient = await createPatientRecord({ clinicId: admin.clinic._id, createdBy: admin.user._id });
    const doctor = await createDoctorRecord({ clinicId: admin.clinic._id, createdBy: admin.user._id });
    const appointment = await createAppointmentRecord({
      clinicId: admin.clinic._id,
      patientId: patient._id,
      doctorId: doctor._id,
      createdBy: admin.user._id
    });

    const response = await request(app)
      .post('/api/v1/consultations')
      .set(getAuthHeaders(admin.token))
      .send({
        appointmentId: appointment._id.toString(),
        patientId: patient._id.toString(),
        doctorId: doctor._id.toString(),
        chiefComplaint: 'Fever and cough for 2 days',
        symptoms: [
          { name: 'fever', severity: 'moderate', duration: '2 days', notes: 'More in evening' },
          { name: 'cough', severity: 'mild', duration: '2 days', notes: 'Dry cough' }
        ],
        vitals: {
          temperature: 101.2,
          pulse: 88,
          oxygenSaturation: 98,
          weight: 70
        },
        clinicalNotes: 'Patient reports fever for 2 days'
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.consultation.chiefComplaint).toBe('Fever and cough for 2 days');
    expect(response.body.data.consultation.status).toBe('in_progress');
    expect(response.body.data.consultation.symptoms).toHaveLength(2);

    const updatedAppointment = await require('../src/modules/appointments/appointment.model').findById(appointment._id);
    expect(updatedAppointment.status).toBe(APPOINTMENT_STATUSES.IN_CONSULTATION);
  });

  it('prevents duplicate consultation for the same appointment', async () => {
    const admin = await createUserWithClinic({ role: ROLES.ADMIN });
    const patient = await createPatientRecord({ clinicId: admin.clinic._id, createdBy: admin.user._id });
    const doctor = await createDoctorRecord({ clinicId: admin.clinic._id, createdBy: admin.user._id });
    const appointment = await createAppointmentRecord({
      clinicId: admin.clinic._id,
      patientId: patient._id,
      doctorId: doctor._id,
      createdBy: admin.user._id
    });

    await require('../src/modules/consultations/consultation.model').create({
      clinicId: admin.clinic._id,
      appointmentId: appointment._id,
      patientId: patient._id,
      doctorId: doctor._id,
      chiefComplaint: 'Existing consultation',
      status: 'in_progress',
      startedAt: new Date(),
      createdBy: admin.user._id,
      updatedBy: admin.user._id
    });

    const response = await request(app)
      .post('/api/v1/consultations')
      .set(getAuthHeaders(admin.token))
      .send({
        appointmentId: appointment._id.toString(),
        patientId: patient._id.toString(),
        doctorId: doctor._id.toString(),
        chiefComplaint: 'Attempted duplicate'
      });

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
  });

  it('returns patient consultation history through the Phase 6 route', async () => {
    const admin = await createUserWithClinic({ role: ROLES.ADMIN });
    const patient = await createPatientRecord({ clinicId: admin.clinic._id, createdBy: admin.user._id });
    const doctor = await createDoctorRecord({ clinicId: admin.clinic._id, createdBy: admin.user._id });
    const appointmentOne = await createAppointmentRecord({
      clinicId: admin.clinic._id,
      patientId: patient._id,
      doctorId: doctor._id,
      createdBy: admin.user._id
    });
    const appointmentTwo = await createAppointmentRecord({
      clinicId: admin.clinic._id,
      patientId: patient._id,
      doctorId: doctor._id,
      createdBy: admin.user._id,
      overrides: {
        appointmentDate: new Date('2026-04-23T00:00:00.000Z'),
        startTime: '11:00',
        endTime: '11:30'
      }
    });

    await require('../src/modules/consultations/consultation.model').create([
      {
        clinicId: admin.clinic._id,
        appointmentId: appointmentOne._id,
        patientId: patient._id,
        doctorId: doctor._id,
        chiefComplaint: 'Fever',
        diagnosis: { primary: 'Viral fever' },
        treatmentPlan: 'Hydration and rest',
        followUp: { required: true, date: new Date('2026-04-28T00:00:00.000Z') },
        status: 'completed',
        startedAt: new Date('2026-04-22T08:00:00.000Z'),
        completedAt: new Date('2026-04-22T08:30:00.000Z'),
        createdBy: admin.user._id,
        updatedBy: admin.user._id,
        createdAt: new Date('2026-04-22T08:00:00.000Z')
      },
      {
        clinicId: admin.clinic._id,
        appointmentId: appointmentTwo._id,
        patientId: patient._id,
        doctorId: doctor._id,
        chiefComplaint: 'Cough',
        diagnosis: { primary: 'Upper respiratory infection' },
        treatmentPlan: 'Symptomatic management',
        status: 'in_progress',
        startedAt: new Date('2026-04-23T09:00:00.000Z'),
        createdBy: admin.user._id,
        updatedBy: admin.user._id,
        createdAt: new Date('2026-04-23T09:00:00.000Z')
      }
    ]);

    const response = await request(app)
      .get(`/api/v1/consultations/patient/${patient._id}/history?page=1&limit=10`)
      .set(getAuthHeaders(admin.token));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.consultations).toHaveLength(2);
    expect(response.body.data.consultations[0].chiefComplaint).toBe('Cough');
    expect(response.body.data.pagination.total).toBe(2);
  });

  it('requests AI suggestions and stores them inside consultation and ai_predictions', async () => {
    const admin = await createUserWithClinic({ role: ROLES.ADMIN });
    const patient = await createPatientRecord({
      clinicId: admin.clinic._id,
      createdBy: admin.user._id,
      overrides: {
        chronicConditions: ['Diabetes'],
        age: 30
      }
    });
    const doctor = await createDoctorRecord({ clinicId: admin.clinic._id, createdBy: admin.user._id });
    const appointment = await createAppointmentRecord({
      clinicId: admin.clinic._id,
      patientId: patient._id,
      doctorId: doctor._id,
      createdBy: admin.user._id
    });
    const consultation = await require('../src/modules/consultations/consultation.model').create({
      clinicId: admin.clinic._id,
      appointmentId: appointment._id,
      patientId: patient._id,
      doctorId: doctor._id,
      chiefComplaint: 'Fever and cough',
      symptoms: [
        { name: 'fever', severity: 'moderate', duration: '2 days', notes: '' },
        { name: 'cough', severity: 'mild', duration: '2 days', notes: '' }
      ],
      clinicalNotes: 'Patient reports fever and cough.',
      status: 'in_progress',
      startedAt: new Date(),
      createdBy: admin.user._id,
      updatedBy: admin.user._id
    });

    const aiService = require('../src/modules/ai/ai.service');
    jest.spyOn(aiService, 'getDiagnosisSuggestions').mockResolvedValue({
      success: true,
      message: 'AI diagnosis suggestions generated successfully.',
      data: {
        suggestions: [
          {
            condition: 'Viral fever',
            confidence: 0.72,
            reasoning: 'Fever and cough commonly fit a viral febrile pattern.',
            recommendedSpecialization: 'General Physician',
            redFlags: ['Chest pain'],
            recommendedTests: ['CBC'],
            safetyNote: 'AI-generated suggestion. Doctor validation required.'
          }
        ],
        disclaimer: 'This is not a diagnosis. Doctor validation is mandatory.',
        modelName: 'rule-based-mvp-clinical-assistant',
        modelVersion: '0.1.0'
      }
    });

    const response = await request(app)
      .post(`/api/v1/consultations/${consultation._id}/ai-suggestions`)
      .set(getAuthHeaders(admin.token))
      .send({
        includePatientHistory: true,
        includeVitals: true
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.consultation.aiSuggestions.status).toBe('generated');
    expect(response.body.data.consultation.aiSuggestions.suggestions).toHaveLength(1);

    const refreshedConsultation = await require('../src/modules/consultations/consultation.model').findById(consultation._id);
    expect(refreshedConsultation.aiSuggestions.suggestions).toHaveLength(1);

    const predictions = await require('../src/modules/ai/aiPrediction.model').find({ consultationId: consultation._id });
    expect(predictions).toHaveLength(1);
    expect(predictions[0].predictionType).toBe('diagnosis_suggestion');
  });

  it('reviews AI suggestions without overwriting doctor diagnosis.primary', async () => {
    const admin = await createUserWithClinic({ role: ROLES.ADMIN });
    const patient = await createPatientRecord({ clinicId: admin.clinic._id, createdBy: admin.user._id });
    const doctor = await createDoctorRecord({ clinicId: admin.clinic._id, createdBy: admin.user._id });
    const appointment = await createAppointmentRecord({
      clinicId: admin.clinic._id,
      patientId: patient._id,
      doctorId: doctor._id,
      createdBy: admin.user._id
    });
    const consultation = await require('../src/modules/consultations/consultation.model').create({
      clinicId: admin.clinic._id,
      appointmentId: appointment._id,
      patientId: patient._id,
      doctorId: doctor._id,
      chiefComplaint: 'Fever',
      diagnosis: { primary: 'Acute febrile illness', secondary: [], notes: '' },
      aiSuggestions: {
        requested: true,
        generatedAt: new Date(),
        status: 'generated',
        suggestions: [
          {
            condition: 'Viral fever',
            confidence: 0.72,
            reasoning: 'Symptoms match viral pattern.',
            recommendedSpecialization: 'General Physician',
            redFlags: [],
            recommendedTests: ['CBC'],
            safetyNote: 'AI-generated suggestion. Doctor validation required.'
          }
        ]
      },
      status: 'in_progress',
      startedAt: new Date(),
      createdBy: admin.user._id,
      updatedBy: admin.user._id
    });

    const response = await request(app)
      .post(`/api/v1/consultations/${consultation._id}/ai-review`)
      .set(getAuthHeaders(admin.token))
      .send({
        decision: 'accepted',
        acceptedSuggestions: ['Viral fever'],
        rejectedSuggestions: [],
        doctorComment: 'Symptoms align with viral fever.'
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.consultation.aiReview.decision).toBe('accepted');
    expect(response.body.data.consultation.aiSuggestions.status).toBe('accepted');
    expect(response.body.data.consultation.diagnosis.primary).toBe('Acute febrile illness');
    expect(response.body.data.consultation.diagnosis.notes).toContain('Viral fever');
  });

  it('requires diagnosis.primary and treatmentPlan to complete consultation', async () => {
    const admin = await createUserWithClinic({ role: ROLES.ADMIN });
    const patient = await createPatientRecord({ clinicId: admin.clinic._id, createdBy: admin.user._id });
    const doctor = await createDoctorRecord({ clinicId: admin.clinic._id, createdBy: admin.user._id });
    const appointment = await createAppointmentRecord({
      clinicId: admin.clinic._id,
      patientId: patient._id,
      doctorId: doctor._id,
      createdBy: admin.user._id,
      overrides: {
        status: APPOINTMENT_STATUSES.IN_CONSULTATION
      }
    });
    const consultation = await require('../src/modules/consultations/consultation.model').create({
      clinicId: admin.clinic._id,
      appointmentId: appointment._id,
      patientId: patient._id,
      doctorId: doctor._id,
      chiefComplaint: 'Fever',
      clinicalNotes: 'Patient improved after hydration and rest advice.',
      status: 'in_progress',
      startedAt: new Date(),
      createdBy: admin.user._id,
      updatedBy: admin.user._id
    });

    const invalidResponse = await request(app)
      .post(`/api/v1/consultations/${consultation._id}/complete`)
      .set(getAuthHeaders(admin.token))
      .send({
        diagnosis: {
          primary: ''
        },
        treatmentPlan: ''
      });

    expect(invalidResponse.status).toBe(400);
    expect(invalidResponse.body.success).toBe(false);

    const validResponse = await request(app)
      .post(`/api/v1/consultations/${consultation._id}/complete`)
      .set(getAuthHeaders(admin.token))
      .send({
        diagnosis: {
          primary: 'Viral fever',
          secondary: [],
          notes: 'Patient stable. No emergency signs.'
        },
        treatmentPlan: 'Hydration, rest, and follow-up if fever persists.',
        followUp: {
          required: true,
          date: '2030-04-25',
          notes: 'Follow-up if symptoms persist.'
        }
      });

    expect(validResponse.status).toBe(200);
    expect(validResponse.body.success).toBe(true);
    expect(validResponse.body.data.consultation.status).toBe('completed');
    expect(validResponse.body.data.consultation.billingReady).toBe(true);

    const refreshedAppointment = await require('../src/modules/appointments/appointment.model').findById(appointment._id);
    expect(refreshedAppointment.status).toBe(APPOINTMENT_STATUSES.COMPLETED);
  });

  it('stores AI draft note from voice note without changing final EMR note before approval', async () => {
    const { doctorUser, consultation } = await createDoctorOwnedConsultationContext();
    const aiService = require('../src/modules/ai/ai.service');

    jest.spyOn(aiService, 'transcribeVoiceNote').mockResolvedValue({
      success: true,
      message: 'Transcription generated successfully',
      data: {
        output: {
          transcript: 'Patient reports fever and cough for two days.',
          language: 'en',
          duration_seconds: 12,
          segments: []
        },
        confidence: 0.58,
        model_name: 'mock-stt',
        model_version: 'phase-17',
        model_status: 'fallback',
        audit_id: 'audit-transcribe'
      }
    });
    jest.spyOn(aiService, 'formatClinicalNoteDraft').mockResolvedValue({
      success: true,
      message: 'Clinical note formatted successfully',
      data: {
        output: {
          note_type: 'SOAP',
          subjective: 'Patient reports fever and cough for two days.',
          objective: 'Not mentioned',
          assessment: 'Not mentioned',
          plan: 'Not mentioned',
          draft_ai_note: true,
          missing_information: ['Objective findings', 'Assessment', 'Plan']
        },
        confidence: 0.3,
        model_name: 'mock-note-formatter',
        model_version: 'phase-17',
        model_status: 'fallback',
        audit_id: 'audit-note'
      }
    });

    const response = await request(app)
      .post(`/api/v1/consultations/${consultation._id}/voice-note`)
      .set(getAuthHeaders(doctorUser.token))
      .field('language', 'en')
      .attach('file', Buffer.from('fake-audio-bytes'), 'sample.wav');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.consultation.transcript_text).toBe('Patient reports fever and cough for two days.');
    expect(response.body.data.consultation.ai_soap_note.subjective).toBe('Patient reports fever and cough for two days.');
    expect(response.body.data.consultation.formattedClinicalNotes.subjective).toBe('');

    const refreshed = await require('../src/modules/consultations/consultation.model').findById(consultation._id);
    expect(refreshed.ai_note_status).toBe('draft');
    expect(refreshed.clinicalNotes).toBe('');
    expect(refreshed.formattedClinicalNotes.subjective).toBe('');
  });

  it('allows doctor to edit and approve AI draft note but blocks non-doctor approval', async () => {
    const { admin, doctorUser, consultation } = await createDoctorOwnedConsultationContext();
    const Consultation = require('../src/modules/consultations/consultation.model');

    await Consultation.findByIdAndUpdate(consultation._id, {
      transcript_text: 'Patient reports fever.',
      ai_soap_note: {
        note_type: 'SOAP',
        subjective: 'Patient reports fever.',
        objective: 'Not mentioned',
        assessment: 'Not mentioned',
        plan: 'Not mentioned',
        draft_ai_note: true,
        missing_information: ['Objective findings', 'Assessment', 'Plan']
      },
      ai_note_status: 'draft'
    });

    const blockedResponse = await request(app)
      .post(`/api/v1/consultations/${consultation._id}/ai-note/approve`)
      .set(getAuthHeaders(admin.token))
      .send({});

    expect(blockedResponse.status).toBe(403);

    const editResponse = await request(app)
      .put(`/api/v1/consultations/${consultation._id}/ai-note/edit`)
      .set(getAuthHeaders(doctorUser.token))
      .send({
        transcript_text: 'Patient reports fever and mild cough.',
        ai_soap_note: {
          note_type: 'SOAP',
          subjective: 'Patient reports fever and mild cough.',
          objective: 'Temperature not mentioned',
          assessment: 'Not mentioned',
          plan: 'Rest and reassess after clinical examination.',
          draft_ai_note: true,
          missing_information: ['Assessment']
        }
      });

    expect(editResponse.status).toBe(200);
    expect(editResponse.body.data.consultation.ai_note_status).toBe('edited');

    const approveResponse = await request(app)
      .post(`/api/v1/consultations/${consultation._id}/ai-note/approve`)
      .set(getAuthHeaders(doctorUser.token))
      .send({
        transcript_text: 'Patient reports fever and mild cough.',
        approved_note: {
          note_type: 'SOAP',
          subjective: 'Patient reports fever and mild cough.',
          objective: 'Temperature not mentioned',
          assessment: 'Not mentioned',
          plan: 'Rest and reassess after clinical examination.',
          draft_ai_note: false,
          missing_information: ['Assessment']
        }
      });

    expect(approveResponse.status).toBe(200);
    expect(approveResponse.body.data.consultation.ai_note_status).toBe('approved');
    expect(approveResponse.body.data.consultation.formattedClinicalNotes.subjective).toBe(
      'Patient reports fever and mild cough.'
    );
    expect(approveResponse.body.data.consultation.clinicalNotes).toBe('Patient reports fever and mild cough.');
    expect(approveResponse.body.data.consultation.approved_by).toBeTruthy();
  });

  it('allows doctor to reject AI draft note', async () => {
    const { doctorUser, consultation } = await createDoctorOwnedConsultationContext();
    const Consultation = require('../src/modules/consultations/consultation.model');

    await Consultation.findByIdAndUpdate(consultation._id, {
      transcript_text: 'Patient reports dizziness.',
      ai_soap_note: {
        note_type: 'SOAP',
        subjective: 'Patient reports dizziness.',
        objective: 'Not mentioned',
        assessment: 'Not mentioned',
        plan: 'Not mentioned',
        draft_ai_note: true,
        missing_information: ['Objective findings', 'Assessment', 'Plan']
      },
      ai_note_status: 'draft'
    });

    const response = await request(app)
      .post(`/api/v1/consultations/${consultation._id}/ai-note/reject`)
      .set(getAuthHeaders(doctorUser.token))
      .send({
        reason: 'Doctor prefers manual documentation.'
      });

    expect(response.status).toBe(200);
    expect(response.body.data.consultation.ai_note_status).toBe('rejected');

    const refreshed = await Consultation.findById(consultation._id);
    expect(refreshed.ai_note_status).toBe('rejected');
    expect(refreshed.formattedClinicalNotes.subjective).toBe('');
  });
});
