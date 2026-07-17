const request = require('supertest');
const mongoose = require('mongoose');

const { ROLES } = require('../src/common/constants/roles');
const {
  createDoctorRecord,
  createPatientRecord,
  createUserWithClinic,
  getAuthHeaders
} = require('./helpers/phase3.helper');

let app;

const createAppointmentRecord = async ({ clinicId, patientId, doctorId, createdBy, overrides = {} }) =>
  require('../src/modules/appointments/appointment.model').create({
    clinicId,
    patientId,
    doctorId,
    createdBy,
    appointmentDate: new Date('2026-04-24T00:00:00.000Z'),
    startTime: '10:00',
    endTime: '10:30',
    durationMinutes: 30,
    appointmentType: 'scheduled',
    status: 'confirmed',
    reasonForVisit: 'Fever and body pain',
    symptomsSummary: 'fever',
    source: 'reception',
    ...overrides
  });

const createConsultationRecord = async ({ clinicId, patientId, doctorId, appointmentId, createdBy }) =>
  require('../src/modules/consultations/consultation.model').create({
    clinicId,
    patientId,
    doctorId,
    appointmentId,
    chiefComplaint: 'Fever and body pain',
    status: 'completed',
    startedAt: new Date('2026-04-24T10:00:00.000Z'),
    completedAt: new Date('2026-04-24T10:25:00.000Z'),
    diagnosis: {
      primary: 'Viral fever',
      secondary: [],
      notes: ''
    },
    treatmentPlan: 'Rest and oral medicines',
    createdBy,
    updatedBy: createdBy
  });

const createPrescriptionRecord = async ({
  clinicId,
  patientId,
  doctorId,
  consultationId,
  appointmentId,
  createdBy,
  overrides = {}
}) =>
  require('../src/modules/prescriptions/prescription.model').create({
    clinicId,
    patientId,
    doctorId,
    consultationId,
    appointmentId,
    prescriptionNumber: `RX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    diagnosisSnapshot: 'Viral fever',
    symptomsSnapshot: 'fever, body pain',
    notes: 'Dispense oral medicines',
    medicines: [
      {
        medicineName: 'Paracetamol 500',
        genericName: 'Paracetamol',
        dosage: '500 mg',
        frequency: 'Twice daily',
        duration: '5 days',
        route: 'oral',
        timing: 'After meals',
        instructions: 'After meals',
        quantity: 10,
        isSubstituteAllowed: false
      }
    ],
    advice: 'Hydration and rest',
    status: 'finalized',
    createdBy,
    updatedBy: createdBy,
    ...overrides
  });

beforeAll(() => {
  app = require('../src/app');
});

beforeEach(async () => {
  jest.restoreAllMocks();
  const collections = Object.values(require('mongoose').connection.collections);
  for (const collection of collections) {
    await collection.deleteMany({});
  }
});

describe('Pharmacy routes', () => {
  it('creates a medicine catalog item', async () => {
    const admin = await createUserWithClinic({ role: ROLES.ADMIN });

    const response = await request(app)
      .post('/api/v1/pharmacy/medicines')
      .set(getAuthHeaders(admin.token))
      .send({
        code: 'PCM500',
        name: 'Paracetamol 500',
        genericName: 'Paracetamol',
        brandName: 'PCM',
        category: 'Analgesic',
        form: 'Tablet',
        strength: '500 mg',
        manufacturer: 'ABC Pharma',
        unitPrice: 2.5,
        reorderLevel: 20,
        requiresPrescription: true,
        batches: [
          {
            batchNumber: 'PCM-APR-01',
            quantity: 100,
            expiryDate: '2027-04-30',
            purchasePrice: 1.8,
            sellingPrice: 2.5
          }
        ]
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.medicine.name).toBe('Paracetamol 500');
    expect(response.body.data.medicine.totalStock).toBe(100);
  });

  it('adds a stock batch and recalculates totalStock', async () => {
    const admin = await createUserWithClinic({ role: ROLES.ADMIN });
    const medicine = await require('../src/modules/pharmacy/medicine.model').create({
      clinicId: admin.clinic._id,
      code: 'PCM650',
      name: 'Paracetamol 650',
      unitPrice: 3,
      reorderLevel: 10,
      batches: [
        {
          batchNumber: 'PCM-ONE',
          quantity: 20,
          expiryDate: new Date('2027-03-31T00:00:00.000Z'),
          sellingPrice: 3
        }
      ],
      createdBy: admin.user._id,
      updatedBy: admin.user._id
    });

    const response = await request(app)
      .post(`/api/v1/pharmacy/medicines/${medicine._id}/batches`)
      .set(getAuthHeaders(admin.token))
      .send({
        batchNumber: 'PCM-TWO',
        quantity: 30,
        expiryDate: '2027-05-31',
        purchasePrice: 2.1,
        sellingPrice: 3.2
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.medicine.batches).toHaveLength(2);
    expect(response.body.data.medicine.totalStock).toBe(50);
  });

  it('returns stock flags for low stock and near expiry items', async () => {
    const admin = await createUserWithClinic({ role: ROLES.ADMIN });

    await require('../src/modules/pharmacy/medicine.model').create({
      clinicId: admin.clinic._id,
      code: 'LOW-01',
      name: 'Low Stock Tablet',
      reorderLevel: 20,
      unitPrice: 4,
      batches: [
        {
          batchNumber: 'LOW-BATCH',
          quantity: 10,
          expiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          sellingPrice: 4
        }
      ],
      createdBy: admin.user._id,
      updatedBy: admin.user._id
    });

    const response = await request(app)
      .get('/api/v1/pharmacy/medicines?lowStock=true&nearExpiry=true')
      .set(getAuthHeaders(admin.token));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.medicines).toHaveLength(1);
    expect(response.body.data.medicines[0].stockFlags.lowStock).toBe(true);
    expect(response.body.data.medicines[0].stockFlags.nearExpiry).toBe(true);
  });

  it('retrieves pharmacy demand forecast and persists the prediction record', async () => {
    const admin = await createUserWithClinic({ role: ROLES.ADMIN });
    const aiService = require('../src/modules/ai/ai.service');
    const AIPrediction = require('../src/modules/ai/aiPrediction.model');
    const Medicine = require('../src/modules/pharmacy/medicine.model');
    const DispensingRecord = require('../src/modules/pharmacy/dispensingRecord.model');
    const firstSaleDate = new Date();
    firstSaleDate.setUTCDate(firstSaleDate.getUTCDate() - 2);
    const secondSaleDate = new Date();
    secondSaleDate.setUTCDate(secondSaleDate.getUTCDate() - 1);
    const expiryDate = new Date();
    expiryDate.setUTCDate(expiryDate.getUTCDate() + 120);

    const medicine = await Medicine.create({
      clinicId: admin.clinic._id,
      code: 'AMOX-500',
      name: 'Amoxicillin 500',
      reorderLevel: 12,
      supplierLeadTimeDays: 5,
      unitPrice: 6,
      batches: [
        {
          batchNumber: 'AMOX-1',
          quantity: 40,
          expiryDate,
          sellingPrice: 6
        }
      ],
      createdBy: admin.user._id,
      updatedBy: admin.user._id
    });

    await DispensingRecord.create({
      clinicId: admin.clinic._id,
      prescriptionId: new mongoose.Types.ObjectId(),
      patientId: new mongoose.Types.ObjectId(),
      doctorId: new mongoose.Types.ObjectId(),
      dispensedBy: admin.user._id,
      items: [
        {
          medicineId: medicine._id,
          medicineName: medicine.name,
          batchNumber: 'AMOX-1',
          quantity: 4,
          unitPrice: 6,
          totalPrice: 24
        }
      ],
      subtotal: 24,
      status: 'dispensed',
      dispensedAt: firstSaleDate
    });

    await DispensingRecord.create({
      clinicId: admin.clinic._id,
      prescriptionId: new mongoose.Types.ObjectId(),
      patientId: new mongoose.Types.ObjectId(),
      doctorId: new mongoose.Types.ObjectId(),
      dispensedBy: admin.user._id,
      items: [
        {
          medicineId: medicine._id,
          medicineName: medicine.name,
          batchNumber: 'AMOX-1',
          quantity: 6,
          unitPrice: 6,
          totalPrice: 36
        }
      ],
      subtotal: 36,
      status: 'dispensed',
      dispensedAt: secondSaleDate
    });

    const forecastSpy = jest.spyOn(aiService, 'getPharmacyDemandForecast').mockResolvedValue({
      success: true,
      data: {
        output: {
          medicine_id: medicine._id.toString(),
          medicine_name: medicine.name,
          next_7_days_demand: 18,
          next_30_days_demand: 75,
          stockout_risk: 'medium',
          reorder_alert: true,
          reorder_quantity: 60,
          expiry_risk: 'low',
          days_until_stockout: 10,
          reason_codes: ['MODEL_FORECAST_AVAILABLE', 'LOW_STOCK']
        },
        confidence: 0.74,
        explanation: 'AutoARIMA generated an assistive forecast.',
        risk_level: 'medium',
        requires_doctor_review: false,
        requires_admin_review: true,
        model_name: 'AutoARIMA',
        model_version: 'v1',
        model_status: 'available',
        audit_id: 'audit-pharmacy-001'
      }
    });

    const response = await request(app)
      .get(`/api/v1/pharmacy/medicines/${medicine._id}/forecast`)
      .set(getAuthHeaders(admin.token));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.forecast.model_name).toBe('AutoARIMA');
    expect(response.body.data.forecast.output.reorder_alert).toBe(true);
    expect(forecastSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        medicine_id: medicine._id.toString(),
        medicine_name: 'Amoxicillin 500',
        current_stock: 40,
        reorder_level: 12,
        supplier_lead_time_days: 5,
        sales_history: [
          { date: firstSaleDate.toISOString().slice(0, 10), quantity_sold: 4 },
          { date: secondSaleDate.toISOString().slice(0, 10), quantity_sold: 6 }
        ]
      })
    );

    const prediction = await AIPrediction.findOne({
      clinicId: admin.clinic._id,
      medicineId: medicine._id,
      predictionType: 'pharmacy_demand'
    }).lean();

    expect(prediction).toBeTruthy();
    expect(prediction.patientId).toBeNull();
    expect(prediction.modelName).toBe('AutoARIMA');
    expect(prediction.outputData.output.next_30_days_demand).toBe(75);
  });

  it('returns a safe fallback forecast when the AI service is unavailable', async () => {
    const pharmacist = await createUserWithClinic({ role: ROLES.PHARMACIST });
    const aiService = require('../src/modules/ai/ai.service');
    const AIPrediction = require('../src/modules/ai/aiPrediction.model');
    const expiryDate = new Date();
    expiryDate.setUTCDate(expiryDate.getUTCDate() + 14);

    const medicine = await require('../src/modules/pharmacy/medicine.model').create({
      clinicId: pharmacist.clinic._id,
      code: 'IBU-400',
      name: 'Ibuprofen 400',
      reorderLevel: 20,
      supplierLeadTimeDays: 7,
      unitPrice: 3,
      batches: [
        {
          batchNumber: 'IBU-1',
          quantity: 10,
          expiryDate,
          sellingPrice: 3
        }
      ],
      createdBy: pharmacist.user._id,
      updatedBy: pharmacist.user._id
    });

    jest.spyOn(aiService, 'getPharmacyDemandForecast').mockRejectedValue(new Error('AI down'));

    const response = await request(app)
      .get(`/api/v1/pharmacy/medicines/${medicine._id}/forecast`)
      .set(getAuthHeaders(pharmacist.token));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.forecast.model_name).toBe('backend_rule_fallback');
    expect(response.body.data.forecast.model_status).toBe('unavailable');
    expect(response.body.data.forecast.explanation).toContain(
      'Forecast unavailable. Showing rule-based reorder status.'
    );

    const prediction = await AIPrediction.findOne({
      clinicId: pharmacist.clinic._id,
      medicineId: medicine._id,
      predictionType: 'pharmacy_demand'
    }).lean();

    expect(prediction).toBeTruthy();
    expect(prediction.modelName).toBe('backend_rule_fallback');
  });

  it('dispenses medicines successfully, deducts stock, creates sale, and updates prescription status', async () => {
    const pharmacist = await createUserWithClinic({ role: ROLES.PHARMACIST });
    const patient = await createPatientRecord({
      clinicId: pharmacist.clinic._id,
      createdBy: pharmacist.user._id
    });
    const doctor = await createDoctorRecord({
      clinicId: pharmacist.clinic._id,
      createdBy: pharmacist.user._id
    });
    const appointment = await createAppointmentRecord({
      clinicId: pharmacist.clinic._id,
      patientId: patient._id,
      doctorId: doctor._id,
      createdBy: pharmacist.user._id
    });
    const consultation = await createConsultationRecord({
      clinicId: pharmacist.clinic._id,
      patientId: patient._id,
      doctorId: doctor._id,
      appointmentId: appointment._id,
      createdBy: pharmacist.user._id
    });
    const prescription = await createPrescriptionRecord({
      clinicId: pharmacist.clinic._id,
      patientId: patient._id,
      doctorId: doctor._id,
      consultationId: consultation._id,
      appointmentId: appointment._id,
      createdBy: pharmacist.user._id
    });
    const medicine = await require('../src/modules/pharmacy/medicine.model').create({
      clinicId: pharmacist.clinic._id,
      code: 'PCM500',
      name: 'Paracetamol 500',
      genericName: 'Paracetamol',
      unitPrice: 2.5,
      reorderLevel: 10,
      batches: [
        {
          batchNumber: 'PCM-EARLY',
          quantity: 6,
          expiryDate: new Date('2027-04-30T00:00:00.000Z'),
          sellingPrice: 2.5
        },
        {
          batchNumber: 'PCM-LATE',
          quantity: 10,
          expiryDate: new Date('2027-05-31T00:00:00.000Z'),
          sellingPrice: 2.5
        }
      ],
      createdBy: pharmacist.user._id,
      updatedBy: pharmacist.user._id
    });

    const response = await request(app)
      .post('/api/v1/pharmacy/dispense')
      .set(getAuthHeaders(pharmacist.token))
      .send({
        prescriptionId: prescription._id.toString(),
        patientId: patient._id.toString(),
        doctorId: doctor._id.toString(),
        items: [
          {
            medicineId: medicine._id.toString(),
            quantity: 10,
            instructions: 'After meals'
          }
        ],
        notes: 'Dispensed from clinic pharmacy'
      });
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.dispensingRecord.status).toBe('dispensed');
    expect(response.body.data.dispensingRecord.items).toHaveLength(2);
    expect(response.body.data.dispensingRecord.items[0].batchNumber).toBe('PCM-EARLY');
    expect(response.body.data.dispensingRecord.items[1].batchNumber).toBe('PCM-LATE');
    expect(response.body.data.pharmacySale.amount).toBe(25);

    const refreshedMedicine = await require('../src/modules/pharmacy/medicine.model').findById(medicine._id).populate('batches');
    expect(refreshedMedicine.totalStock).toBe(6);
    expect(refreshedMedicine.batches.find((batch) => batch.batchNumber === 'PCM-EARLY').quantity).toBe(0);
    expect(refreshedMedicine.batches.find((batch) => batch.batchNumber === 'PCM-LATE').quantity).toBe(6);

    const refreshedPrescription = await require('../src/modules/prescriptions/prescription.model').findById(
      prescription._id
    );
    expect(refreshedPrescription.dispensingStatus).toBe('dispensed');
    expect(refreshedPrescription.dispensedAt).toBeTruthy();
  });

  it('rejects dispensing when stock is insufficient', async () => {
    const pharmacist = await createUserWithClinic({ role: ROLES.PHARMACIST });
    const patient = await createPatientRecord({
      clinicId: pharmacist.clinic._id,
      createdBy: pharmacist.user._id
    });
    const doctor = await createDoctorRecord({
      clinicId: pharmacist.clinic._id,
      createdBy: pharmacist.user._id
    });
    const appointment = await createAppointmentRecord({
      clinicId: pharmacist.clinic._id,
      patientId: patient._id,
      doctorId: doctor._id,
      createdBy: pharmacist.user._id
    });
    const consultation = await createConsultationRecord({
      clinicId: pharmacist.clinic._id,
      patientId: patient._id,
      doctorId: doctor._id,
      appointmentId: appointment._id,
      createdBy: pharmacist.user._id
    });
    const prescription = await createPrescriptionRecord({
      clinicId: pharmacist.clinic._id,
      patientId: patient._id,
      doctorId: doctor._id,
      consultationId: consultation._id,
      appointmentId: appointment._id,
      createdBy: pharmacist.user._id
    });
    const medicine = await require('../src/modules/pharmacy/medicine.model').create({
      clinicId: pharmacist.clinic._id,
      code: 'AZI-01',
      name: 'Azithromycin',
      unitPrice: 8,
      reorderLevel: 5,
      batches: [
        {
          batchNumber: 'AZI-BATCH',
          quantity: 5,
          expiryDate: new Date('2027-04-30T00:00:00.000Z'),
          sellingPrice: 8
        }
      ],
      createdBy: pharmacist.user._id,
      updatedBy: pharmacist.user._id
    });

    const response = await request(app)
      .post('/api/v1/pharmacy/dispense')
      .set(getAuthHeaders(pharmacist.token))
      .send({
        prescriptionId: prescription._id.toString(),
        patientId: patient._id.toString(),
        doctorId: doctor._id.toString(),
        items: [
          {
            medicineId: medicine._id.toString(),
            quantity: 8
          }
        ]
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Insufficient non-expired stock');
  });

  it('rejects dispensing from expired batches', async () => {
    const pharmacist = await createUserWithClinic({ role: ROLES.PHARMACIST });
    const patient = await createPatientRecord({
      clinicId: pharmacist.clinic._id,
      createdBy: pharmacist.user._id
    });
    const doctor = await createDoctorRecord({
      clinicId: pharmacist.clinic._id,
      createdBy: pharmacist.user._id
    });
    const appointment = await createAppointmentRecord({
      clinicId: pharmacist.clinic._id,
      patientId: patient._id,
      doctorId: doctor._id,
      createdBy: pharmacist.user._id
    });
    const consultation = await createConsultationRecord({
      clinicId: pharmacist.clinic._id,
      patientId: patient._id,
      doctorId: doctor._id,
      appointmentId: appointment._id,
      createdBy: pharmacist.user._id
    });
    const prescription = await createPrescriptionRecord({
      clinicId: pharmacist.clinic._id,
      patientId: patient._id,
      doctorId: doctor._id,
      consultationId: consultation._id,
      appointmentId: appointment._id,
      createdBy: pharmacist.user._id
    });
    const medicine = await require('../src/modules/pharmacy/medicine.model').create({
      clinicId: pharmacist.clinic._id,
      code: 'OLD-01',
      name: 'Expired Medicine',
      unitPrice: 5,
      reorderLevel: 5,
      batches: [
        {
          batchNumber: 'OLD-BATCH',
          quantity: 10,
          expiryDate: new Date('2020-01-31T00:00:00.000Z'),
          sellingPrice: 5
        }
      ],
      createdBy: pharmacist.user._id,
      updatedBy: pharmacist.user._id
    });

    const response = await request(app)
      .post('/api/v1/pharmacy/dispense')
      .set(getAuthHeaders(pharmacist.token))
      .send({
        prescriptionId: prescription._id.toString(),
        patientId: patient._id.toString(),
        doctorId: doctor._id.toString(),
        items: [
          {
            medicineId: medicine._id.toString(),
            quantity: 2
          }
        ]
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Insufficient non-expired stock');
  });

  it('returns patient medicine history with sale summary', async () => {
    const admin = await createUserWithClinic({ role: ROLES.ADMIN });
    const patient = await createPatientRecord({
      clinicId: admin.clinic._id,
      createdBy: admin.user._id
    });
    const doctor = await createDoctorRecord({
      clinicId: admin.clinic._id,
      createdBy: admin.user._id
    });
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
    const dispensingRecord = await require('../src/modules/pharmacy/dispensingRecord.model').create({
      clinicId: admin.clinic._id,
      prescriptionId: prescription._id,
      patientId: patient._id,
      doctorId: doctor._id,
      dispensedBy: admin.user._id,
      items: [
        {
          medicineId: new (require('mongoose').Types.ObjectId)(),
          medicineName: 'Paracetamol 500',
          batchNumber: 'PCM-1',
          quantity: 10,
          unitPrice: 2.5,
          totalPrice: 25,
          instructions: 'After meals'
        }
      ],
      subtotal: 25,
      status: 'dispensed',
      dispensedAt: new Date('2026-04-24T11:00:00.000Z')
    });

    await require('../src/modules/pharmacy/pharmacySale.model').create({
      clinicId: admin.clinic._id,
      dispensingRecordId: dispensingRecord._id,
      patientId: patient._id,
      amount: 25,
      paymentStatus: 'pending',
      createdBy: admin.user._id,
      updatedBy: admin.user._id
    });

    const response = await request(app)
      .get(`/api/v1/patients/${patient._id}/medicines?page=1&limit=10`)
      .set(getAuthHeaders(admin.token));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.dispensingRecords).toHaveLength(1);
    expect(response.body.data.dispensingRecords[0].pharmacySale.amount).toBe(25);
  });

  it('enforces clinic scoping for medicine detail', async () => {
    const clinicOneAdmin = await createUserWithClinic({ role: ROLES.ADMIN });
    const clinicTwoAdmin = await createUserWithClinic({ role: ROLES.ADMIN });
    const medicine = await require('../src/modules/pharmacy/medicine.model').create({
      clinicId: clinicOneAdmin.clinic._id,
      code: 'SCOPED-1',
      name: 'Scoped Medicine',
      unitPrice: 4,
      createdBy: clinicOneAdmin.user._id,
      updatedBy: clinicOneAdmin.user._id
    });

    const response = await request(app)
      .get(`/api/v1/pharmacy/medicines/${medicine._id}`)
      .set(getAuthHeaders(clinicTwoAdmin.token));

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });
});
