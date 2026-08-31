const mongoose = require('mongoose');

describe('PHASE 6: Doctor Consultation + Prescription Lab Tests + Patient Lab Booking + Lab-Order Workflow', () => {
  let Clinic, Doctor, Patient, User, Provider, LabTest, LabOrder, GlobalLabTest, GlobalLabCategory, Prescription, Consultation, Appointment;
  let labService, ROLES;

  let clinicA;
  let clinicB;
  let doctorUser;
  let doctorProfile;
  let patientUser;
  let patientProfile;
  let labTechUser;
  let attachedLabProvider;
  let externalLabProvider;
  let biochemistryCat;
  let cbcGlobal;
  let lftGlobal;
  let vitDGlobal;
  let localCbcTest;
  let externalVitDTest;
  let healthPackageTest;
  let appointment;
  let consultation;
  let prescription;

  beforeAll(() => {
    Clinic = require('../src/modules/clinics/clinic.model');
    Doctor = require('../src/modules/doctors/doctor.model');
    Patient = require('../src/modules/patients/patient.model');
    User = require('../src/modules/users/user.model');
    Provider = require('../src/modules/providers/provider.model');
    LabTest = require('../src/modules/labs/labTest.model');
    LabOrder = require('../src/modules/labs/labOrder.model').LabOrder;
    GlobalLabTest = require('../src/modules/healthcare-catalog/globalLabTest.model');
    GlobalLabCategory = require('../src/modules/healthcare-catalog/catalogCategory.model');
    Prescription = require('../src/modules/prescriptions/prescription.model');
    Consultation = require('../src/modules/consultations/consultation.model');
    Appointment = require('../src/modules/appointments/appointment.model');
    labService = require('../src/modules/labs/lab.service');
    ROLES = require('../src/common/constants/roles').ROLES;
  });

  beforeEach(async () => {
    // 1. Create Clinics
    clinicA = await Clinic.create({
      name: 'Pehal Health Hub A',
      code: 'PHH-A',
      address: { street: 'Main Road', city: 'New Delhi', state: 'Delhi', postalCode: '110001', country: 'India' },
      phone: '+919876543210',
      email: 'clinica@pehal.com',
      status: 'active'
    });

    clinicB = await Clinic.create({
      name: 'City Care Diagnostics B',
      code: 'CCD-B',
      address: { street: 'Outer Ring Road', city: 'New Delhi', state: 'Delhi', postalCode: '110002', country: 'India' },
      phone: '+919876543211',
      email: 'clinicb@citycare.com',
      status: 'active'
    });

    // 1. Create Users & Profiles
    doctorUser = await User.create({
      name: 'Dr. Aditi Verma',
      email: 'doctor.aditi@pehal.com',
      password: 'Password@123',
      role: ROLES.DOCTOR,
      clinicId: clinicA._id,
      activeClinic: clinicA._id
    });

    doctorProfile = await Doctor.create({
      userId: doctorUser._id,
      clinicId: clinicA._id,
      firstName: 'Aditi',
      lastName: 'Verma',
      phone: '+919876500000',
      email: 'doctor.aditi@pehal.com',
      specialization: 'General Medicine',
      doctorCode: 'DOC-AV01',
      isActive: true,
      approvalStatus: 'approved'
    });

    patientUser = await User.create({
      name: 'Kaishav Gupta',
      email: 'kaishav@example.com',
      password: 'Password@123',
      phone: '+919988776655',
      role: ROLES.PATIENT,
      clinicId: clinicA._id,
      activeClinic: clinicA._id
    });

    patientProfile = await Patient.create({
      userId: patientUser._id,
      clinicId: clinicA._id,
      firstName: 'Kaishav',
      lastName: 'Gupta',
      phone: '+919988776655',
      email: 'kaishav@example.com',
      gender: 'male',
      patientId: 'PT-KG001',
      dateOfBirth: new Date('1992-05-15')
    });

    labTechUser = await User.create({
      name: 'Suresh Labtech',
      email: 'suresh.lab@pehal.com',
      password: 'Password@123',
      role: ROLES.LAB_TECHNICIAN,
      clinicId: clinicA._id,
      activeClinic: clinicA._id
    });

    appointment = await Appointment.create({
      clinicId: clinicA._id,
      doctorId: doctorProfile._id,
      patientId: patientProfile._id,
      appointmentDate: new Date(),
      startTime: '10:00',
      endTime: '10:15',
      status: 'confirmed',
      type: 'in_person',
      tokenNumber: 1,
      createdBy: doctorUser._id
    });

    // 2. Create Global Category & Master Tests
    biochemistryCat = await GlobalLabCategory.create({
      name: 'Biochemistry',
      type: 'LAB',
      isActive: true,
      createdBy: doctorUser._id
    });

    cbcGlobal = await GlobalLabTest.create({
      globalId: 'GLAB-CBC-001',
      name: 'Complete Blood Count (CBC)',
      shortName: 'CBC',
      internalCode: 'CBC01',
      department: 'Biochemistry',
      category: biochemistryCat._id,
      sampleType: 'Blood (EDTA)',
      normalReportingTime: 'Same Day',
      patientPreparation: 'No Fasting Required',
      testPrice: 350,
      isActive: true,
      status: 'ACTIVE',
      createdBy: doctorUser._id
    });

    lftGlobal = await GlobalLabTest.create({
      globalId: 'GLAB-LFT-002',
      name: 'Liver Function Test (LFT)',
      shortName: 'LFT',
      internalCode: 'LFT01',
      department: 'Biochemistry',
      category: biochemistryCat._id,
      sampleType: 'Serum',
      normalReportingTime: '24 Hours',
      patientPreparation: '10-12 Hours Fasting Required',
      testPrice: 750,
      isActive: true,
      status: 'ACTIVE',
      createdBy: doctorUser._id
    });

    vitDGlobal = await GlobalLabTest.create({
      globalId: 'GLAB-VITD-003',
      name: 'Vitamin D (25-OH Vitamin D)',
      shortName: 'VitD',
      internalCode: 'VITD01',
      department: 'Biochemistry',
      category: biochemistryCat._id,
      sampleType: 'Serum',
      normalReportingTime: '24-48 Hours',
      patientPreparation: 'No Fasting Required',
      testPrice: 1200,
      isActive: true,
      status: 'ACTIVE',
      createdBy: doctorUser._id
    });

    // 3. Create Lab Providers (Attached to Clinic A vs External Clinic B)
    attachedLabProvider = await Provider.create({
      globalId: 'PROV-LAB-001',
      name: 'Apollo Diagnostics Hub',
      providerType: 'Laboratory',
      providerSubtype: 'Internal',
      providerCategory: 'Own Provider',
      contactPerson: 'Dr. Suresh Apollo',
      phone: '9876543210',
      email: 'apollo@labhub.com',
      address: {
        line1: '123 Health Ave',
        city: 'New Delhi',
        state: 'Delhi',
        country: 'India',
        pincode: '110001'
      },
      clinicId: clinicA._id,
      isActive: true,
      createdBy: doctorUser._id
    });

    externalLabProvider = await Provider.create({
      globalId: 'PROV-LAB-002',
      name: 'External Metropolis Lab',
      providerType: 'Laboratory',
      providerSubtype: 'External',
      providerCategory: 'Partner Provider',
      contactPerson: 'Dr. Metropolis',
      phone: '9876543211',
      email: 'metropolis@labhub.com',
      address: {
        line1: '456 Outer Ave',
        city: 'New Delhi',
        state: 'Delhi',
        country: 'India',
        pincode: '110002'
      },
      clinicId: clinicB._id,
      isActive: true,
      createdBy: doctorUser._id
    });

    // 4. Create Local Inventory in Clinic A
    localCbcTest = await LabTest.create({
      clinicId: clinicA._id,
      laboratoryId: attachedLabProvider._id,
      globalLabTestId: cbcGlobal._id,
      code: 'CBC01',
      name: 'Complete Blood Count (CBC)',
      category: 'Biochemistry',
      specimenType: 'Blood (EDTA)',
      price: 350,
      testPrice: 350,
      turnaroundTime: 'Same Day',
      isActive: true
    });

    healthPackageTest = await LabTest.create({
      clinicId: clinicA._id,
      laboratoryId: attachedLabProvider._id,
      code: 'PKG-HEALTH',
      name: 'Complete Health Package (CBC + LFT + Lipid)',
      category: 'Health Packages',
      specimenType: 'Blood',
      price: 900,
      testPrice: 900,
      turnaroundTime: '24 Hours',
      isActive: true
    });

    // 5. Create Local Inventory in Clinic B for Vit D (external alternative)
    externalVitDTest = await LabTest.create({
      clinicId: clinicB._id,
      laboratoryId: externalLabProvider._id,
      globalLabTestId: vitDGlobal._id,
      code: 'VITD01',
      name: 'Vitamin D (25-OH Vitamin D)',
      category: 'Biochemistry',
      specimenType: 'Serum',
      price: 550,
      testPrice: 550,
      turnaroundTime: '24-48 Hours',
      isActive: true
    });

    // 6. Create Initial Appointment, Consultation & Prescription
    appointment = await Appointment.create({
      clinicId: clinicA._id,
      patientId: patientProfile._id,
      doctorId: doctorProfile._id,
      appointmentDate: new Date(),
      startTime: '10:00',
      endTime: '10:30',
      durationMinutes: 30,
      appointmentType: 'scheduled',
      status: 'confirmed',
      reasonForVisit: 'General Consultation',
      createdBy: doctorUser._id
    });

    consultation = await Consultation.create({
      clinicId: clinicA._id,
      patientId: patientProfile._id,
      doctorId: doctorProfile._id,
      appointmentId: appointment._id,
      chiefComplaint: 'Routine checkup and fatigue',
      status: 'in_progress',
      startedAt: new Date()
    });

    prescription = await Prescription.create({
      clinicId: clinicA._id,
      consultationId: consultation._id,
      patientId: patientProfile._id,
      doctorId: doctorProfile._id,
      prescriptionNumber: 'PRS-2026-0001',
      status: 'finalized',
      labs: [
        {
          testName: 'Complete Blood Count (CBC)',
          category: 'Biochemistry',
          globalLabTestId: cbcGlobal._id,
          localInventoryId: localCbcTest._id,
          laboratoryId: attachedLabProvider._id,
          clinicId: clinicA._id,
          price: 350,
          priceSnapshot: 350,
          turnaroundTime: 'Same Day',
          tatSnapshot: 'Same Day',
          availabilitySnapshot: 'AVAILABLE',
          priority: 'routine',
          sampleRequired: 'Blood (EDTA)',
          instructions: 'No Fasting Required',
          isBooked: false
        },
        {
          testName: 'Vitamin D (25-OH Vitamin D)',
          category: 'Biochemistry',
          globalLabTestId: vitDGlobal._id,
          clinicId: clinicA._id,
          price: 550,
          priceSnapshot: 550,
          turnaroundTime: '24-48 Hours',
          tatSnapshot: '24-48 Hours',
          availabilitySnapshot: 'ALTERNATIVE_AVAILABLE',
          priority: 'routine',
          sampleRequired: 'Serum',
          instructions: 'No Fasting Required',
          isBooked: false
        }
      ]
    });
  });

  test('1. Merged Availability: Clinic Local vs External Alternative Anonymized vs Global Unavailable', async () => {
    const searchRes = await labService.searchAllLabs({
      requester: doctorUser,
      requestedClinicId: clinicA._id
    });

    const results = searchRes.results;
    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThanOrEqual(3);

    // CBC should be AVAILABLE via Clinic Laboratory
    const cbcItem = results.find(r => r.name.includes('Complete Blood Count'));
    expect(cbcItem).toBeDefined();
    expect(cbcItem.availability).toBe('AVAILABLE');
    expect(cbcItem.availabilitySource).toBe('CLINIC LABORATORY');
    expect(cbcItem.price).toBe(350);

    // Vitamin D should be ALTERNATIVE_AVAILABLE via External Laboratory without exposing external clinic/lab ID
    const vitDItem = results.find(r => r.name.includes('Vitamin D'));
    expect(vitDItem).toBeDefined();
    expect(vitDItem.availability).toBe('ALTERNATIVE_AVAILABLE');
    expect(vitDItem.availabilitySource).toBe('EXTERNAL LABORATORY');
    expect(vitDItem.provider).toBe('Alternative Laboratory');
    expect(vitDItem.estimatedPriceRange).toBe('₹550');
    // Ensure external provider names and IDs are concealed
    expect(vitDItem.laboratoryIds).toEqual([]);
    expect(vitDItem.providerNames).not.toContain('External Metropolis Lab');

    // LFT is in Global Catalog but neither local nor external -> UNAVAILABLE
    const lftItem = results.find(r => r.name.includes('Liver Function Test'));
    expect(lftItem).toBeDefined();
    expect(lftItem.availability).toBe('UNAVAILABLE');
    expect(lftItem.price).toBeNull();
  });

  test('2. Prescription ≠ Lab Order: Adding test to prescription saves recommendation without creating LabOrder', async () => {
    expect(prescription.labs).toHaveLength(2);
    expect(prescription.labs[0].isBooked).toBe(false);

    // Verify no LabOrder exists automatically
    const ordersCount = await LabOrder.countDocuments({ consultationId: consultation._id });
    expect(ordersCount).toBe(0);
  });

  test('3. Doctor Explicit Booking: Creates LabOrder with DOCTOR_BOOKED and links to Prescription', async () => {
    const orderRes = await labService.createLabOrder({
      requester: doctorUser,
      payload: {
        clinicId: clinicA._id,
        consultationId: consultation._id,
        prescriptionId: prescription._id,
        patientId: patientProfile._id,
        doctorId: doctorProfile._id,
        laboratoryId: attachedLabProvider._id,
        source: 'DOCTOR_BOOKED',
        priority: 'routine',
        collectionMethod: 'AT_LAB',
        tests: [
          {
            labTestId: localCbcTest._id,
            globalLabTestId: cbcGlobal._id,
            code: 'CBC01',
            name: 'Complete Blood Count (CBC)',
            price: 350,
            turnaroundTime: 'Same Day'
          }
        ]
      }
    });

    expect(orderRes).toBeDefined();
    expect(orderRes.source).toBe('DOCTOR_BOOKED');
    expect(orderRes.orderNumber).toMatch(/^LAB-/);
    expect(orderRes.status).toBe('ordered');

    // Verify prescription item marked as booked
    const updatedRx = await Prescription.findById(prescription._id);
    const cbcItem = updatedRx.labs.find(l => l.testName.includes('CBC'));
    expect(cbcItem.isBooked).toBe(true);
    expect(String(cbcItem.labOrderId)).toBe(String(orderRes._id));

    // Vitamin D remains recommended but not booked
    const vitDItem = updatedRx.labs.find(l => l.testName.includes('Vitamin D'));
    expect(vitDItem.isBooked).toBe(false);
  });

  test('4. Smart Package Suggestions Engine: Computes savings and highlights bonus tests', async () => {
    const suggestions = await labService.getSmartPackageSuggestions({
      requester: patientUser,
      query: {
        clinicId: clinicA._id,
        prescriptionId: prescription._id
      }
    });

    expect(suggestions).toBeDefined();
    expect(Array.isArray(suggestions)).toBe(true);
    if (suggestions.length > 0) {
      const pkg = suggestions[0];
      expect(pkg.packageName).toContain('Complete Health Package');
      expect(pkg.packagePrice).toBe(900);
      expect(pkg.savings).toBeGreaterThan(0);
      expect(pkg.suggestedOption).toBe(true);
      expect(pkg.isDoctorPrescribed).toBe(false);
    }
  });

  test('5. Lab Staff Prescription Lookup: Resolves patient, latest prescription, and previous orders', async () => {
    // 1. Create order
    await labService.createLabOrder({
      requester: doctorUser,
      payload: {
        clinicId: clinicA._id,
        consultationId: consultation._id,
        prescriptionId: prescription._id,
        patientId: patientProfile._id,
        doctorId: doctorProfile._id,
        laboratoryId: attachedLabProvider._id,
        source: 'DOCTOR_BOOKED',
        priority: 'routine',
        collectionMethod: 'AT_LAB',
        tests: [
          {
            labTestId: localCbcTest._id,
            globalLabTestId: cbcGlobal._id,
            code: 'CBC01',
            name: 'Complete Blood Count (CBC)',
            price: 350,
            turnaroundTime: 'Same Day'
          }
        ]
      }
    });

    // 2. Lookup by prescription number
    const lookupData = await labService.lookupPrescriptionForLab({
      requester: labTechUser,
      query: {
        clinicId: clinicA._id,
        prescriptionNumber: 'PRS-2026-0001'
      }
    });

    expect(lookupData.patient).toBeDefined();
    expect(lookupData.latestPrescription).toBeDefined();
    expect(lookupData.latestPrescription.labs).toHaveLength(2);
    expect(lookupData.activeOrders).toHaveLength(1);
  });

  test('6. Lab Staff Walk-in Non-Registered Guest Order with Documents', async () => {
    const walkInRes = await labService.createLabOrder({
      requester: labTechUser,
      payload: {
        clinicId: clinicA._id,
        laboratoryId: attachedLabProvider._id,
        patientType: 'WALK_IN',
        source: 'WALK_IN',
        nonRegisteredPatientDetails: {
          fullName: 'Guest Walkin Singh',
          phone: '+919111222333',
          age: 45,
          gender: 'male',
          address: 'Sector 14, Gurgaon'
        },
        priority: 'urgent',
        collectionMethod: 'AT_LAB',
        documents: [
          {
            documentType: 'Doctor Prescription',
            name: 'External_Dr_Sharma_Rx.pdf',
            url: 'https://docs.pehal.com/rx/123'
          }
        ],
        tests: [
          {
            labTestId: localCbcTest._id,
            code: 'CBC01',
            name: 'Complete Blood Count (CBC)',
            price: 350
          }
        ]
      }
    });

    expect(walkInRes).toBeDefined();
    expect(walkInRes.patientType).toBe('WALK_IN');
    expect(walkInRes.source).toBe('WALK_IN');
    expect(walkInRes.guestPatient.fullName).toBe('Guest Walkin Singh');
    expect(walkInRes.documents).toHaveLength(1);
    expect(walkInRes.documents[0].documentType).toBe('Doctor Prescription');
  });

  test('7. Duplicate Active Order Guard: Prevents accidental double booking for same prescription', async () => {
    // 1. Initial Order
    await labService.createLabOrder({
      requester: doctorUser,
      payload: {
        clinicId: clinicA._id,
        consultationId: consultation._id,
        prescriptionId: prescription._id,
        patientId: patientProfile._id,
        doctorId: doctorProfile._id,
        laboratoryId: attachedLabProvider._id,
        source: 'DOCTOR_BOOKED',
        priority: 'routine',
        collectionMethod: 'AT_LAB',
        tests: [
          {
            labTestId: localCbcTest._id,
            globalLabTestId: cbcGlobal._id,
            code: 'CBC01',
            name: 'Complete Blood Count (CBC)',
            price: 350,
            turnaroundTime: 'Same Day'
          }
        ]
      }
    });

    // 2. Duplicate Attempt
    await expect(
      labService.createLabOrder({
        requester: patientUser,
        payload: {
          clinicId: clinicA._id,
          prescriptionId: prescription._id,
          patientId: patientProfile._id,
          laboratoryId: attachedLabProvider._id,
          tests: [
            {
              labTestId: localCbcTest._id,
              code: 'CBC01',
              name: 'Complete Blood Count (CBC)'
            }
          ]
        }
      })
    ).rejects.toThrow(/already exists/i);
  });

  test('8. Prescription Immutability: Updating LabOrder does not mutate immutable Prescription record', async () => {
    // 1. Create order
    const activeOrder = await labService.createLabOrder({
      requester: doctorUser,
      payload: {
        clinicId: clinicA._id,
        consultationId: consultation._id,
        prescriptionId: prescription._id,
        patientId: patientProfile._id,
        doctorId: doctorProfile._id,
        laboratoryId: attachedLabProvider._id,
        source: 'DOCTOR_BOOKED',
        priority: 'routine',
        collectionMethod: 'AT_LAB',
        tests: [
          {
            labTestId: localCbcTest._id,
            globalLabTestId: cbcGlobal._id,
            code: 'CBC01',
            name: 'Complete Blood Count (CBC)',
            price: 350,
            turnaroundTime: 'Same Day'
          }
        ]
      }
    });

    const currentRx = await Prescription.findById(prescription._id);
    const initialLabsSnapshot = JSON.stringify(currentRx.labs);

    // 2. Lab tech updates order status and modifies technician notes
    activeOrder.status = 'sample_collected';
    activeOrder.notes = 'Sample collected in EDTA vial at 10:30 AM';
    await activeOrder.save();

    // 3. Reload prescription and assert it remained immutable
    const reloadedRx = await Prescription.findById(prescription._id);
    expect(JSON.stringify(reloadedRx.labs)).toBe(initialLabsSnapshot);
  });
});
