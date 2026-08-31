const request = require('supertest');
const mongoose = require('mongoose');

const { ROLES } = require('../src/common/constants/roles');
const { createUserWithClinic, createDoctorRecord, createPatientRecord, getAuthHeaders } = require('./helpers/phase3.helper');

let app;
let GlobalLabTest;
let CatalogCategory;
let LabTest;
let Provider;
let LabOrder;

beforeAll(() => {
  app = require('../src/app');
  GlobalLabTest = require('../src/modules/healthcare-catalog/globalLabTest.model');
  CatalogCategory = require('../src/modules/healthcare-catalog/catalogCategory.model');
  LabTest = require('../src/modules/labs/labTest.model');
  Provider = require('../src/modules/providers/provider.model');
  LabOrder = require('../src/modules/labs/labOrder.model').LabOrder;

  const aiService = require('../src/modules/ai/ai.service');
  jest.spyOn(aiService, 'checkDrugSafety').mockResolvedValue({
    success: true,
    message: 'Drug safety verified',
    data: { output: { safe_to_continue: true, severity: 'none' } }
  });
});

describe('Merged Laboratory-Test Availability System', () => {
  it('correctly merges global catalogue with attached clinic laboratories with deduplication', async () => {
    // 1. Setup Doctor with Clinic
    const doctorFixture = await createUserWithClinic({ role: ROLES.DOCTOR });
    const doctorUser = doctorFixture.user;
    const clinicId = doctorFixture.clinic._id;
    const doctor = await createDoctorRecord({
      clinicId,
      createdBy: doctorUser._id,
      userId: doctorUser._id
    });

    // 2. Setup Catalog Categories
    const hematologyCat = await CatalogCategory.create({
      name: 'Hematology',
      code: 'HEM',
      type: 'LAB',
      isActive: true,
      createdBy: doctorUser._id
    });

    const biochemistryCat = await CatalogCategory.create({
      name: 'Biochemistry',
      code: 'BIO',
      type: 'LAB',
      isActive: true,
      createdBy: doctorUser._id
    });

    // 3. Setup 2 Attached Laboratories
    const labA = await Provider.create({
      globalId: 'PRV-LAB-001',
      clinicId,
      name: 'Alpha Diagnostics Lab',
      providerType: 'Laboratory',
      providerSubtype: 'Internal',
      providerCategory: 'Own Provider',
      contactPerson: 'Dr. Alpha',
      phone: '9988776655',
      email: 'alpha@lab.com',
      address: {
        line1: '123 Alpha Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        pincode: '400001'
      },
      status: 'Active',
      createdBy: doctorUser._id
    });

    const labB = await Provider.create({
      globalId: 'PRV-LAB-002',
      clinicId,
      name: 'Beta Pathology Lab',
      providerType: 'Laboratory',
      providerSubtype: 'External',
      providerCategory: 'Partner Provider',
      contactPerson: 'Dr. Beta',
      phone: '9988776644',
      email: 'beta@lab.com',
      address: {
        line1: '456 Beta Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        pincode: '400002'
      },
      status: 'Active',
      createdBy: doctorUser._id
    });

    // Setup an unrelated laboratory from another clinic
    const otherClinicId = new mongoose.Types.ObjectId();
    const otherClinicLab = await Provider.create({
      globalId: 'PRV-LAB-999',
      clinicId: otherClinicId,
      name: 'Other Clinic Unrelated Lab',
      providerType: 'Laboratory',
      providerSubtype: 'External',
      providerCategory: 'Partner Provider',
      contactPerson: 'Dr. Other',
      phone: '9988776633',
      email: 'other@lab.com',
      address: {
        line1: '789 Other Road',
        city: 'Delhi',
        state: 'Delhi',
        country: 'India',
        pincode: '110001'
      },
      status: 'Active',
      createdBy: doctorUser._id
    });

    // 4. Setup Global Laboratory Catalogue Tests
    const globalCbc = await GlobalLabTest.create({
      name: 'Complete Blood Count',
      shortName: 'CBC',
      globalId: 'GLT-CBC-001',
      internalCode: 'CBC',
      category: hematologyCat._id,
      department: 'Hematology',
      sampleType: 'Blood (EDTA)',
      normalReportingTime: '12 Hours',
      isActive: true,
      status: 'ACTIVE'
    });

    const globalLft = await GlobalLabTest.create({
      name: 'Liver Function Test',
      shortName: 'LFT',
      globalId: 'GLT-LFT-002',
      internalCode: 'LFT',
      category: biochemistryCat._id,
      department: 'Biochemistry',
      sampleType: 'Serum',
      normalReportingTime: '24 Hours',
      isActive: true,
      status: 'ACTIVE'
    });

    const globalCrp = await GlobalLabTest.create({
      name: 'C-Reactive Protein (CRP)',
      shortName: 'CRP',
      globalId: 'GLT-CRP-003',
      internalCode: 'CRP',
      category: biochemistryCat._id,
      department: 'Biochemistry',
      sampleType: 'Serum',
      normalReportingTime: '24 Hours',
      isActive: true,
      status: 'ACTIVE'
    });

    // 5. Setup Clinic Attached Lab Inventories
    // - CBC is offered by BOTH Lab A (₹300) and Lab B (₹350)
    await LabTest.create({
      clinicId,
      laboratoryId: labA._id,
      globalLabTestId: globalCbc._id,
      code: 'CBC',
      name: 'Complete Hemogram / CBC',
      category: 'Hematology',
      price: 300,
      turnaroundTime: '6 Hours',
      specimenType: 'Blood (EDTA)',
      isActive: true
    });

    await LabTest.create({
      clinicId,
      laboratoryId: labB._id,
      globalLabTestId: globalCbc._id,
      code: 'CBC-B',
      name: 'Complete Blood Count (CBC)',
      category: 'Hematology',
      price: 350,
      turnaroundTime: '12 Hours',
      specimenType: 'Blood (EDTA)',
      isActive: true
    });

    // - LFT is offered ONLY by Lab B (₹800)
    await LabTest.create({
      clinicId,
      laboratoryId: labB._id,
      globalLabTestId: globalLft._id,
      code: 'LFT',
      name: 'Liver Function Test',
      category: 'Biochemistry',
      price: 800,
      turnaroundTime: '24 Hours',
      specimenType: 'Serum',
      isActive: true
    });

    // - CRP is NOT offered by any attached clinic lab (Global only)

    // - Local-only test: 'Special Clinic In-House Urine Analysis' (not mapped to global)
    await LabTest.create({
      clinicId,
      laboratoryId: labA._id,
      globalLabTestId: null,
      code: 'SPEC-URINE',
      name: 'Special Clinic In-House Urine Analysis',
      category: 'Clinical Pathology',
      price: 200,
      turnaroundTime: '2 Hours',
      specimenType: 'Urine',
      isActive: true
    });

    // - Unrelated lab test from another clinic (should NOT appear)
    await LabTest.create({
      clinicId: otherClinicId,
      laboratoryId: otherClinicLab._id,
      code: 'SECRET-TEST',
      name: 'Secret Other Clinic Test',
      category: 'General',
      price: 9999,
      isActive: true
    });

    // 6. Test Search / Discovery API (Case 1, 2, 3, 4, 5)
    const res = await request(app)
      .get('/api/v1/labs/search')
      .set(getAuthHeaders(doctorFixture.token))
      .expect(200);

    const data = res.body.data || res.body;
    const results = data.results;
    const attachedLaboratories = data.attachedLaboratories;

    // Verify Attached Laboratories
    expect(attachedLaboratories).toHaveLength(2);
    expect(attachedLaboratories.map((l) => l.name)).toEqual(
      expect.arrayContaining(['Alpha Diagnostics Lab', 'Beta Pathology Lab'])
    );

    // Case 1 & 3: CBC exists in global + multiple attached labs -> 1 row, AVAILABLE, CLINIC LABORATORY, retains all provider IDs
    const cbcRows = results.filter((r) => r.code === 'CBC' || r.shortName === 'CBC');
    expect(cbcRows).toHaveLength(1);
    const cbc = cbcRows[0];
    expect(cbc.availability).toBe('AVAILABLE');
    expect(cbc.availabilitySource).toBe('CLINIC LABORATORY');
    expect(cbc.price).toBe(300); // lowest price among attached labs
    expect(cbc.laboratoryIds).toHaveLength(2);
    expect(cbc.providers).toHaveLength(2);

    // Case 5: LFT (mapped via globalLabTestId) -> 1 row, AVAILABLE, CLINIC LABORATORY, Lab B
    const lftRows = results.filter((r) => r.code === 'LFT' || r.shortName === 'LFT');
    expect(lftRows).toHaveLength(1);
    const lft = lftRows[0];
    expect(lft.availability).toBe('AVAILABLE');
    expect(lft.availabilitySource).toBe('CLINIC LABORATORY');
    expect(lft.price).toBe(800);
    expect(lft.laboratoryIds).toEqual([String(labB._id)]);

    // Case 2: CRP (Global only) -> 1 row, UNAVAILABLE, GLOBAL, price null
    const crpRows = results.filter((r) => r.code === 'CRP' || r.shortName === 'CRP');
    expect(crpRows).toHaveLength(1);
    const crp = crpRows[0];
    expect(crp.availability).toBe('UNAVAILABLE');
    expect(crp.availabilitySource).toBe('GLOBAL');
    expect(crp.price).toBeNull();

    // Case 4: Local-only Test -> 1 row, AVAILABLE, LOCAL LABORATORY
    const localRows = results.filter((r) => r.name === 'Special Clinic In-House Urine Analysis');
    expect(localRows).toHaveLength(1);
    const localTest = localRows[0];
    expect(localTest.availability).toBe('AVAILABLE');
    expect(localTest.availabilitySource).toBe('LOCAL LABORATORY');
    expect(localTest.globalInvestigationId).toBeNull();
    expect(localTest.price).toBe(200);

    // Verify Unrelated Lab Test did NOT leak
    const leaked = results.filter((r) => r.name === 'Secret Other Clinic Test');
    expect(leaked).toHaveLength(0);

    // 7. Test Category Filtering
    const resCat = await request(app)
      .get('/api/v1/labs/search?category=Hematology')
      .set(getAuthHeaders(doctorFixture.token))
      .expect(200);
    const catResults = (resCat.body.data || resCat.body).results;
    expect(catResults.length).toBeGreaterThanOrEqual(1);
    expect(catResults.every((t) => t.category === 'Hematology')).toBe(true);

    // 8. Test Search Filter (Case 7: Search "CBC")
    const resSearch = await request(app)
      .get('/api/v1/labs/search?search=CBC')
      .set(getAuthHeaders(doctorFixture.token))
      .expect(200);
    const searchResults = (resSearch.body.data || resSearch.body).results;
    expect(searchResults).toHaveLength(1);
    expect(searchResults[0].shortName).toBe('CBC');

    // 9. Test Provider Filtering (Case 6: Provider Filter switching)
    const resLabA = await request(app)
      .get(`/api/v1/labs/search?providerId=${labA._id}`)
      .set(getAuthHeaders(doctorFixture.token))
      .expect(200);

    const labAResults = (resLabA.body.data || resLabA.body).results;
    const cbcUnderLabA = labAResults.find((r) => r.shortName === 'CBC');
    expect(cbcUnderLabA.availability).toBe('AVAILABLE');
    expect(cbcUnderLabA.price).toBe(300);

    const lftUnderLabA = labAResults.find((r) => r.shortName === 'LFT');
    expect(lftUnderLabA.availability).toBe('UNAVAILABLE');
    expect(lftUnderLabA.price).toBeNull();

    // 10. Test Prescription creation & LabOrder separation (Case 10)
    const patientFixture = await createUserWithClinic({ role: ROLES.PATIENT, clinicId });
    const patient = await createPatientRecord({
      clinicId,
      createdBy: doctorUser._id,
      userId: patientFixture.user._id
    });
    const appointment = await require('../src/modules/appointments/appointment.model').create({
      clinicId,
      patientId: patient._id,
      doctorId: doctor._id,
      createdBy: doctorUser._id,
      appointmentDate: new Date('2026-04-22T00:00:00.000Z'),
      startTime: '10:00',
      endTime: '10:30',
      durationMinutes: 30,
      appointmentType: 'scheduled',
      status: 'confirmed',
      reasonForVisit: 'Follow-up review',
      symptomsSummary: 'fever',
      source: 'reception'
    });
    const consultation = await require('../src/modules/consultations/consultation.model').create({
      clinicId,
      patientId: patient._id,
      doctorId: doctor._id,
      appointmentId: appointment._id,
      chiefComplaint: 'Fever',
      status: 'in_progress',
      createdBy: doctorUser._id
    });

    const createPrescriptionRes = await request(app)
      .post('/api/v1/prescriptions')
      .set(getAuthHeaders(doctorFixture.token))
      .send({
        patientId: patient._id,
        doctorId: doctor._id,
        consultationId: consultation._id,
        appointmentId: appointment._id,
        medicines: [{ medicineName: 'Paracetamol', dosage: '500mg', frequency: 'TDS', duration: '3 days' }],
        labs: [
          {
            testName: 'Complete Blood Count',
            code: 'CBC',
            globalLabTestId: globalCbc._id,
            price: 300,
            priority: 'routine',
            sampleRequired: 'Blood (EDTA)',
            provider: 'Alpha Diagnostics Lab'
          }
        ]
      })
      .expect(201);

    const presData = createPrescriptionRes.body.data?.prescription || createPrescriptionRes.body.prescription;
    expect(presData.labs).toHaveLength(1);
    expect(presData.labs[0].testName).toBe('Complete Blood Count');

    // Confirm that NO LabOrder was created in the database
    const labOrdersCount = await LabOrder.countDocuments({ consultationId: consultation._id });
    expect(labOrdersCount).toBe(0);
  });
});
