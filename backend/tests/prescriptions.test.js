const request = require('supertest');

const { APPOINTMENT_STATUSES } = require('../src/common/constants/appointmentStatus');
const { ROLES } = require('../src/common/constants/roles');
const {
  createDoctorRecord,
  createPatientRecord,
  createUserWithClinic,
  getAuthHeaders
} = require('./helpers/phase3.helper');

jest.mock('../src/modules/prescriptions/prescriptionPdf.service', () => ({
  generatePrescriptionPdf: jest.fn(async ({ prescription }) => {
    const fs = require('fs');
    const path = require('path');
    const directory = path.resolve(process.cwd(), 'uploads', 'prescriptions');
    await fs.promises.mkdir(directory, { recursive: true });
    const filePath = path.join(directory, `prescription_${prescription.prescriptionNumber}.pdf`);
    await fs.promises.writeFile(filePath, '%PDF-1.4 mock prescription');
    return {
      filePath,
      relativePath: `uploads/prescriptions/prescription_${prescription.prescriptionNumber}.pdf`
    };
  })
}));

let app;

const buildDrugSafetyResponse = (severity = 'none', overrides = {}) => ({
  success: true,
  message: 'Drug safety analysis generated successfully',
  data: {
    output: {
      interaction_alerts: [],
      allergy_alerts: [],
      contraindication_alerts: [],
      duplicate_therapy_alerts: [],
      severity,
      doctor_override_required: ['medium', 'high', 'critical'].includes(severity),
      safe_to_continue: !['high', 'critical'].includes(severity),
      summary:
        severity === 'critical'
          ? 'Critical allergy alert found. Doctor must review before finalizing prescription.'
          : severity === 'high'
          ? 'High-severity medication safety alert found. Doctor review is required before finalizing prescription.'
          : severity === 'medium'
          ? 'Potential safety alert. Doctor review required.'
          : 'No major drug safety alert was detected by the local rules engine.',
      model_status: 'rules_engine',
      requires_doctor_review: true,
      disclaimer: 'This drug safety output is assistive only. It does not guarantee medication safety and must be reviewed by a qualified doctor.',
      ...overrides
    },
    confidence: 0.8,
    explanation: 'Drug safety rules were evaluated using local datasets.',
    risk_level: severity === 'none' ? 'low' : severity,
    requires_doctor_review: true,
    model_name: 'local-rules-drug-safety',
    model_version: 'phase-19-drug-safety-0.1.0',
    model_status: 'rules_engine',
    audit_id: `audit-${severity}`
  }
});

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
    chiefComplaint: 'Fever and cough for 2 days',
    symptoms: [
      { name: 'fever', severity: 'moderate', duration: '2 days', notes: '' },
      { name: 'cough', severity: 'mild', duration: '2 days', notes: '' }
    ],
    clinicalNotes: 'Patient reports fever and cough for two days.',
    diagnosis: {
      primary: 'Viral fever',
      secondary: [],
      notes: 'Stable condition'
    },
    treatmentPlan: 'Hydration and rest',
    status: 'completed',
    startedAt: new Date('2026-04-22T10:00:00.000Z'),
    completedAt: new Date('2026-04-22T10:30:00.000Z'),
    createdBy,
    updatedBy: createdBy,
    ...overrides
  });

const createPrescriptionRecord = async ({
  clinicId,
  patientId,
  doctorId,
  consultationId,
  appointmentId,
  createdBy,
  overrides = {}
}) => {
  const Prescription = require('../src/modules/prescriptions/prescription.model');
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-6);

  return Prescription.create({
    clinicId,
    patientId,
    doctorId,
    consultationId,
    appointmentId,
    prescriptionNumber: `RX-20260421-${suffix}`,
    diagnosisSnapshot: 'Viral fever',
    symptomsSnapshot: 'fever, cough',
    notes: 'Clinical notes snapshot',
    medicines: [buildMedicine()],
    advice: 'Hydration and rest',
    status: 'draft',
    createdBy,
    updatedBy: createdBy,
    ...overrides
  });
};

const buildMedicine = (overrides = {}) => ({
  medicineName: 'Demo tablet',
  dosage: '500 mg',
  frequency: 'Twice daily',
  duration: '5 days',
  route: 'oral',
  timing: 'After food',
  instructions: 'Demo medicine only',
  quantity: 10,
  isSubstituteAllowed: false,
  ...overrides
});

beforeAll(() => {
  app = require('../src/app');
});

beforeEach(() => {
  jest.restoreAllMocks();
  const aiService = require('../src/modules/ai/ai.service');
  jest.spyOn(aiService, 'checkDrugSafety').mockResolvedValue(buildDrugSafetyResponse());
});

describe('Prescription routes', () => {
  it('creates a prescription draft', async () => {
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

    const response = await request(app)
      .post('/api/v1/prescriptions')
      .set(getAuthHeaders(admin.token))
      .send({
        patientId: patient._id.toString(),
        consultationId: consultation._id.toString(),
        medicines: [buildMedicine()],
        advice: 'Hydration and rest'
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.prescription.status).toBe('draft');
    expect(response.body.data.prescription.drugSafetySeverity).toBe('none');
    expect(response.body.data.prescription.prescriptionNumber).toMatch(/^RX-\d{8}-\d{6}$/);
    expect(response.body.data.prescription.medicines).toHaveLength(1);

    const refreshedConsultation = await require('../src/modules/consultations/consultation.model').findById(consultation._id);
    expect(refreshedConsultation.prescriptionCreated).toBe(true);
  });

  it('rejects prescription creation without medicines', async () => {
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

    const response = await request(app)
      .post('/api/v1/prescriptions')
      .set(getAuthHeaders(admin.token))
      .send({
        patientId: patient._id.toString(),
        consultationId: consultation._id.toString(),
        medicines: []
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('updates a draft prescription and lists prescriptions by patient latest first', async () => {
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
    const consultationOne = await createConsultationRecord({
      clinicId: admin.clinic._id,
      patientId: patient._id,
      doctorId: doctor._id,
      appointmentId: appointmentOne._id,
      createdBy: admin.user._id,
      overrides: { createdAt: new Date('2026-04-22T10:45:00.000Z') }
    });
    const consultationTwo = await createConsultationRecord({
      clinicId: admin.clinic._id,
      patientId: patient._id,
      doctorId: doctor._id,
      appointmentId: appointmentTwo._id,
      createdBy: admin.user._id,
      overrides: { createdAt: new Date('2026-04-23T10:45:00.000Z') }
    });

    const firstPrescription = await createPrescriptionRecord({
      clinicId: admin.clinic._id,
      patientId: patient._id,
      doctorId: doctor._id,
      consultationId: consultationOne._id,
      appointmentId: appointmentOne._id,
      createdBy: admin.user._id,
      overrides: {
        createdAt: new Date('2026-04-22T10:45:00.000Z')
      }
    });
    const secondPrescription = await createPrescriptionRecord({
      clinicId: admin.clinic._id,
      patientId: patient._id,
      doctorId: doctor._id,
      consultationId: consultationTwo._id,
      appointmentId: appointmentTwo._id,
      createdBy: admin.user._id,
      overrides: {
        medicines: [buildMedicine({ medicineName: 'Demo syrup' })],
        advice: 'Second advice',
        createdAt: new Date('2026-04-23T10:45:00.000Z')
      }
    });

    const updateResponse = await request(app)
      .patch(`/api/v1/prescriptions/${firstPrescription._id}`)
      .set(getAuthHeaders(admin.token))
      .send({
        advice: 'Updated advice',
        medicines: [buildMedicine({ instructions: 'Updated instructions' })]
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.prescription.advice).toBe('Updated advice');
    expect(updateResponse.body.data.prescription.medicines[0].instructions).toBe('Updated instructions');

    const listResponse = await request(app)
      .get(`/api/v1/prescriptions/patient/${patient._id}?page=1&limit=10`)
      .set(getAuthHeaders(admin.token));

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data.prescriptions).toHaveLength(2);
    expect(listResponse.body.data.prescriptions[0]._id).toBe(String(secondPrescription._id));
  });

  it('requires doctorConfirmation to finalize and locks finalized prescriptions from updates', async () => {
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

    const prescription = await createPrescriptionRecord({
      clinicId: admin.clinic._id,
      patientId: patient._id,
      doctorId: doctor._id,
      consultationId: consultation._id,
      appointmentId: appointment._id,
      createdBy: admin.user._id
    });
    const prescriptionId = prescription._id;

    const invalidFinalize = await request(app)
      .post(`/api/v1/prescriptions/${prescriptionId}/finalize`)
      .set(getAuthHeaders(admin.token))
      .send({
        doctorConfirmation: false
      });

    expect(invalidFinalize.status).toBe(400);

    const validFinalize = await request(app)
      .post(`/api/v1/prescriptions/${prescriptionId}/finalize`)
      .set(getAuthHeaders(admin.token))
      .send({
        doctorConfirmation: true,
        finalAdvice: 'Final advice',
        followUpDate: '2030-04-25'
      });

    expect(validFinalize.status).toBe(200);
    expect(validFinalize.body.data.prescription.status).toBe('finalized');
    expect(validFinalize.body.data.prescription.pdfUrl).toContain(`/prescriptions/${prescriptionId}/download`);

    const updateAfterFinalize = await request(app)
      .patch(`/api/v1/prescriptions/${prescriptionId}`)
      .set(getAuthHeaders(admin.token))
      .send({
        advice: 'Should fail'
      });

    expect(updateAfterFinalize.status).toBe(400);
    expect(updateAfterFinalize.body.success).toBe(false);
  });

  it('returns conflict for high-severity drug safety alerts without override reason', async () => {
    const aiService = require('../src/modules/ai/ai.service');
    jest.spyOn(aiService, 'checkDrugSafety').mockResolvedValue(
      buildDrugSafetyResponse('critical', {
        allergy_alerts: [
          {
            medicine: 'Amoxicillin',
            allergy: 'penicillin',
            severity: 'critical',
            message: 'Possible allergy cross-reactivity risk.',
            source: 'local_rules'
          }
        ]
      })
    );

    const doctorUser = await createUserWithClinic({ role: ROLES.DOCTOR });
    const patient = await createPatientRecord({
      clinicId: doctorUser.clinic._id,
      createdBy: doctorUser.user._id,
      overrides: { allergies: ['penicillin'] }
    });
    const doctor = await createDoctorRecord({
      clinicId: doctorUser.clinic._id,
      createdBy: doctorUser.user._id,
      userId: doctorUser.user._id
    });
    const appointment = await createAppointmentRecord({
      clinicId: doctorUser.clinic._id,
      patientId: patient._id,
      doctorId: doctor._id,
      createdBy: doctorUser.user._id
    });
    const consultation = await createConsultationRecord({
      clinicId: doctorUser.clinic._id,
      patientId: patient._id,
      doctorId: doctor._id,
      appointmentId: appointment._id,
      createdBy: doctorUser.user._id
    });

    const prescription = await createPrescriptionRecord({
      clinicId: doctorUser.clinic._id,
      patientId: patient._id,
      doctorId: doctor._id,
      consultationId: consultation._id,
      appointmentId: appointment._id,
      createdBy: doctorUser.user._id,
      overrides: {
        medicines: [buildMedicine({ medicineName: 'Amoxicillin', genericName: 'amoxicillin' })]
      }
    });

    const response = await request(app)
      .post(`/api/v1/prescriptions/${prescription._id}/finalize`)
      .set(getAuthHeaders(doctorUser.token))
      .send({
        doctorConfirmation: true
      });

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
    expect(response.body.errors[0].code).toBe('DRUG_SAFETY_OVERRIDE_REQUIRED');
    expect(response.body.errors[0].drugSafetyCheck.output.severity).toBe('critical');
  });

  it('saves successfully with doctor override reason when high-severity alert exists', async () => {
    const aiService = require('../src/modules/ai/ai.service');
    jest.spyOn(aiService, 'checkDrugSafety').mockResolvedValue(
      buildDrugSafetyResponse('high', {
        interaction_alerts: [
          {
            drug_a: 'Warfarin',
            drug_b: 'Ibuprofen',
            severity: 'high',
            message: 'Potential increased bleeding risk.',
            source: 'local_rules',
            recommendation: 'Doctor review required before prescribing together.'
          }
        ]
      })
    );

    const doctorUser = await createUserWithClinic({ role: ROLES.DOCTOR });
    const patient = await createPatientRecord({
      clinicId: doctorUser.clinic._id,
      createdBy: doctorUser.user._id,
      overrides: { currentMedications: ['warfarin'] }
    });
    const doctor = await createDoctorRecord({
      clinicId: doctorUser.clinic._id,
      createdBy: doctorUser.user._id,
      userId: doctorUser.user._id
    });
    const appointment = await createAppointmentRecord({
      clinicId: doctorUser.clinic._id,
      patientId: patient._id,
      doctorId: doctor._id,
      createdBy: doctorUser.user._id
    });
    const consultation = await createConsultationRecord({
      clinicId: doctorUser.clinic._id,
      patientId: patient._id,
      doctorId: doctor._id,
      appointmentId: appointment._id,
      createdBy: doctorUser.user._id
    });

    const prescription = await createPrescriptionRecord({
      clinicId: doctorUser.clinic._id,
      patientId: patient._id,
      doctorId: doctor._id,
      consultationId: consultation._id,
      appointmentId: appointment._id,
      createdBy: doctorUser.user._id,
      overrides: {
        medicines: [buildMedicine({ medicineName: 'Ibuprofen', genericName: 'ibuprofen' })]
      }
    });

    const response = await request(app)
      .post(`/api/v1/prescriptions/${prescription._id}/finalize`)
      .set(getAuthHeaders(doctorUser.token))
      .send({
        doctorConfirmation: true,
        overrideReason: 'Benefits outweigh the short-term interaction risk and monitoring will be done.'
      });

    expect(response.status).toBe(200);
    expect(response.body.data.prescription.status).toBe('finalized');
    expect(response.body.data.prescription.overrideReason).toContain('Benefits outweigh');
    expect(response.body.data.prescription.doctorOverride.used).toBe(true);
  });

  it('downloads a generated prescription pdf', async () => {
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

    const prescription = await createPrescriptionRecord({
      clinicId: admin.clinic._id,
      patientId: patient._id,
      doctorId: doctor._id,
      consultationId: consultation._id,
      appointmentId: appointment._id,
      createdBy: admin.user._id
    });
    const prescriptionId = prescription._id;

    await request(app)
      .post(`/api/v1/prescriptions/${prescriptionId}/finalize`)
      .set(getAuthHeaders(admin.token))
      .send({
        doctorConfirmation: true
      });

    const downloadResponse = await request(app)
      .get(`/api/v1/prescriptions/${prescriptionId}/download`)
      .set(getAuthHeaders(admin.token));

    expect(downloadResponse.status).toBe(200);
    expect(downloadResponse.headers['content-type']).toContain('application/pdf');
  });
});
