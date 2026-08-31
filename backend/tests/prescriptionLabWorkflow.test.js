const request = require('supertest');

describe('Clinical Consultation & Lab Order Integration Workflow', () => {
  let app, Prescription, LabOrder, GlobalLabTest, LabTest, Patient, User, Doctor, Clinic, Consultation, Appointment, Provider;
  let clinic, doctor, doctorUser, patient, patientUser, consultation, appointment, globalTest, localTest, jwtToken, providerLab;

  beforeAll(() => {
    app = require('../src/app');
    Prescription = require('../src/modules/prescriptions/prescription.model');
    LabOrder = require('../src/modules/labs/labOrder.model').LabOrder;
    GlobalLabTest = require('../src/modules/healthcare-catalog/globalLabTest.model');
    LabTest = require('../src/modules/labs/labTest.model');
    Patient = require('../src/modules/patients/patient.model');
    User = require('../src/modules/users/user.model');
    Doctor = require('../src/modules/doctors/doctor.model');
    Clinic = require('../src/modules/clinics/clinic.model');
    Consultation = require('../src/modules/consultations/consultation.model');
    Appointment = require('../src/modules/appointments/appointment.model');
    Provider = require('../src/modules/providers/provider.model');
  });

  beforeEach(async () => {
    clinic = await Clinic.create({
      name: 'Pehal Diagnostics Clinic',
      code: 'PEHAL_DIAG',
      status: 'active',
      approvalStatus: 'approved'
    });

    doctorUser = await User.create({
      name: 'Dr. John Miller',
      email: 'john.miller@pehal.com',
      phone: '9988776655',
      password: 'password123',
      role: 'SUPER_ADMIN',
      clinicId: clinic._id,
      approvalStatus: 'approved'
    });

    providerLab = await Provider.create({
      globalId: 'LAB-PROV-1001',
      clinicId: clinic._id,
      name: 'Pehal Lab One',
      providerType: 'Laboratory',
      providerSubtype: 'Internal',
      providerCategory: 'Own Provider',
      contactPerson: 'Lab Manager',
      phone: '9999911001',
      email: 'labmanager@pehal.com',
      address: { line1: 'street 1', city: 'City', state: 'State', country: 'Country', pincode: '110011' },
      createdBy: doctorUser._id
    });

    doctor = await Doctor.create({
      userId: doctorUser._id,
      clinicId: clinic._id,
      firstName: 'John',
      lastName: 'Miller',
      fullName: 'Dr. John Miller',
      phone: '9988776655',
      isActive: true
    });

    patientUser = await User.create({
      name: 'Amit Kumar',
      email: 'amit.kumar@test.com',
      phone: '9888877777',
      password: 'password123',
      role: 'PATIENT',
      clinicId: clinic._id,
      approvalStatus: 'approved'
    });

    patient = await Patient.create({
      userId: patientUser._id,
      clinicId: clinic._id,
      patientId: 'PAT-000001',
      firstName: 'Amit',
      lastName: 'Kumar',
      fullName: 'Amit Kumar',
      phone: '9888877777',
      gender: 'male',
      isActive: true
    });

    appointment = await Appointment.create({
      clinicId: clinic._id,
      patientId: patient._id,
      doctorId: doctor._id,
      appointmentDate: new Date(),
      startTime: '10:00',
      endTime: '10:30',
      createdBy: doctorUser._id,
      status: 'confirmed'
    });

    consultation = await Consultation.create({
      clinicId: clinic._id,
      patientId: patient._id,
      doctorId: doctor._id,
      appointmentId: appointment._id,
      chiefComplaint: 'Fever and cough',
      status: 'completed'
    });

    const CatalogCategory = require('../src/modules/healthcare-catalog/catalogCategory.model');
    const cat = await CatalogCategory.create({
      name: 'Hematology',
      code: 'HEM',
      type: 'LAB',
      department: 'Hematology',
      isActive: true
    });

    globalTest = await GlobalLabTest.create({
      name: 'Complete Blood Count',
      shortName: 'CBC',
      globalId: 'GLT-0001',
      department: 'Hematology',
      investigationType: 'ATOMIC_TEST',
      sampleType: 'Blood',
      category: cat._id,
      testPrice: 350,
      normalReportingTime: 'Same Day'
    });

    localTest = await LabTest.create({
      clinicId: clinic._id,
      laboratoryId: providerLab._id,
      globalLabTestId: globalTest._id,
      code: 'CBC',
      name: 'Complete Blood Count',
      price: 350,
      turnaroundTime: 'Same Day',
      isActive: true
    });

    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'john.miller@pehal.com',
      password: 'password123'
    });
    jwtToken = loginRes.body.data.accessToken;
  });

  test('Prescription finalization does NOT automatically create a lab order', async () => {
    const rxPayload = {
      consultationId: consultation._id,
      patientId: patient._id,
      doctorId: doctor._id,
      appointmentId: appointment._id,
      prescriptionNumber: 'PRS-1002003',
      labs: [
        {
          testName: globalTest.name,
          globalLabTestId: globalTest._id,
          priority: 'routine',
          sampleRequired: 'Blood',
          availabilitySnapshot: 'AVAILABLE',
          priceSnapshot: 350,
          tatSnapshot: 'Same Day',
          code: 'CBC'
        }
      ]
    };

    const res = await request(app)
      .post('/api/v1/prescriptions')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send(rxPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const ordersCount = await LabOrder.countDocuments({ consultationId: consultation._id });
    expect(ordersCount).toBe(0); // MUST remain separate from clinical recommendations
  });

  test('Booking a prescription recommended test creates a mapped lab order', async () => {
    let rx = await Prescription.findOne({ consultationId: consultation._id });
    if (!rx) {
      rx = await Prescription.create({
        consultationId: consultation._id,
        patientId: patient._id,
        doctorId: doctor._id,
        appointmentId: appointment._id,
        clinicId: clinic._id,
        prescriptionNumber: 'PRS-1002004',
        labs: [
          {
            testName: globalTest.name,
            globalLabTestId: globalTest._id,
            localInventoryId: localTest._id,
            priority: 'routine',
            sampleRequired: 'Blood',
            availabilitySnapshot: 'AVAILABLE',
            priceSnapshot: 350,
            tatSnapshot: 'Same Day',
            code: 'CBC'
          }
        ]
      });
    }

    const orderPayload = {
      consultationId: consultation._id,
      patientId: patient._id,
      doctorId: doctor._id,
      prescriptionId: rx._id,
      clinicId: clinic._id,
      tests: [
        {
          labTestId: localTest._id,
          code: 'CBC',
          name: 'Complete Blood Count'
        }
      ],
      price: 350,
      source: 'PRESCRIPTION',
      collectionMethod: 'AT_LAB'
    };

    const res = await request(app)
      .post('/api/v1/labs/orders')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send(orderPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    // Assert link
    const updatedRx = await Prescription.findById(rx._id);
    expect(updatedRx.labs[0].isBooked).toBe(true);
    expect(updatedRx.labs[0].labOrderId).toBeDefined();
  });
});
