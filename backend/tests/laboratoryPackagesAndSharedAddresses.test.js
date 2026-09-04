const request = require('supertest');
const mongoose = require('mongoose');

describe('Laboratory Packages & Central Patient Address Book Integration', () => {
  let app, Clinic, User, Patient, Provider, LabTest, GlobalLabTest, ROLES, generateAccessToken;
  let clinicId, clinic2Id, patientUser, patientProfileId, token, lab1ProviderId, lab2ProviderId;

  beforeAll(() => {
    Clinic = require('../src/modules/clinics/clinic.model');
    User = require('../src/modules/users/user.model');
    Patient = require('../src/modules/patients/patient.model');
    Provider = require('../src/modules/providers/provider.model');
    LabTest = require('../src/modules/labs/labTest.model');
    GlobalLabTest = require('../src/modules/healthcare-catalog/globalLabTest.model');
    ROLES = require('../src/common/constants/roles').ROLES;
    generateAccessToken = require('../src/modules/auth/token.service').generateAccessToken;
    app = require('../src/app');
  });

  beforeEach(async () => {
    // 1. Create Clinic A
    const clinic = await Clinic.create({
      name: "Ram's Dental Clinic",
      code: `RDC${Math.floor(100 + Math.random() * 900)}`,
      email: `clinic_a_${Date.now()}@aicms.test`,
      phone: '9876543210',
      address: { line1: 'Indiranagar Branch', city: 'Ghaziabad', state: 'Uttar Pradesh', pincode: '201001' },
      status: 'active',
      approvalStatus: 'approved',
      trialFeatures: [{ featureCode: 'labs', isActive: true, expiryDate: new Date(Date.now() + 864000000) }]
    });
    clinicId = clinic._id;

    // Create Clinic B
    const clinic2 = await Clinic.create({
      name: 'City Care Hospital',
      code: `CCH${Math.floor(100 + Math.random() * 900)}`,
      email: `clinic_b_${Date.now()}@aicms.test`,
      phone: '9876543211',
      address: { line1: 'Sector 62', city: 'Noida', state: 'Uttar Pradesh', pincode: '201301' },
      status: 'active',
      approvalStatus: 'approved',
      trialFeatures: [{ featureCode: 'labs', isActive: true, expiryDate: new Date(Date.now() + 864000000) }]
    });
    clinic2Id = clinic2._id;

    // 2. Create Patient User & Central Profile with pre-saved address
    patientUser = await User.create({
      name: 'vidya',
      email: `vidya_${Date.now()}@aicms.test`,
      phone: '9876543210',
      password: 'Password123!',
      role: ROLES.PATIENT,
      clinicId,
      activeClinic: clinicId,
      status: 'active',
      isActive: true,
      approvalStatus: 'approved'
    });

    const patientProfile = await Patient.create({
      clinicId,
      userId: patientUser._id,
      patientId: 'PAT-20260716-0001',
      firstName: 'vidya',
      lastName: 'sharma',
      fullName: 'vidya sharma',
      email: patientUser.email,
      phone: '9876543210',
      gender: 'female',
      dateOfBirth: new Date('1998-01-01'),
      address: {
        line1: 'H-23, Indiranagar, Near Shanti Park',
        city: 'Ghaziabad',
        state: 'Uttar Pradesh',
        pincode: '201001'
      },
      savedAddresses: [
        {
          fullName: 'vidya sharma',
          mobileNumber: '9876543210',
          houseFlatNumber: 'H-23',
          street: 'Indiranagar, Near Shanti Park',
          city: 'Ghaziabad',
          state: 'Uttar Pradesh',
          pinCode: '201001',
          addressType: 'Home',
          isDefault: true
        },
        {
          fullName: 'vidya sharma (Office)',
          mobileNumber: '9876543210',
          houseFlatNumber: 'Suite 405',
          buildingName: 'Tower B, Cyber City',
          street: 'Sector 62',
          city: 'Noida',
          state: 'Uttar Pradesh',
          pinCode: '201301',
          addressType: 'Work',
          isDefault: false
        }
      ]
    });
    patientProfileId = patientProfile._id;

    token = generateAccessToken(patientUser);

    // 3. Create Lab Provider 1 (Radha Krishna Laboratory)
    const lab1 = await Provider.create({
      globalId: `PROV-LAB-${Date.now()}-1`,
      name: 'Radha Krishna Laboratory',
      providerType: 'Laboratory',
      providerSubtype: 'Internal',
      providerCategory: 'Own Provider',
      contactPerson: 'Dr. R.K. Sharma',
      phone: '9876500000',
      email: `rk_lab_${Date.now()}@aicms.test`,
      address: { line1: 'Plot 14, Indiranagar', city: 'Ghaziabad', state: 'Uttar Pradesh', country: 'India', pincode: '201001' },
      clinicId,
      isActive: true,
      createdBy: patientUser._id
    });
    lab1ProviderId = lab1._id;

    // Create Lab Provider 2 (Apollo Diagnostics) in Clinic B
    const lab2 = await Provider.create({
      globalId: `PROV-LAB-${Date.now()}-2`,
      name: 'Apollo Diagnostics',
      providerType: 'Laboratory',
      providerSubtype: 'Internal',
      providerCategory: 'Own Provider',
      contactPerson: 'Dr. Apollo',
      phone: '9876500001',
      email: `apollo_lab_${Date.now()}@aicms.test`,
      address: { line1: 'Sector 18', city: 'Noida', state: 'Uttar Pradesh', country: 'India', pincode: '201301' },
      clinicId: clinic2Id,
      isActive: true,
      createdBy: patientUser._id
    });
    lab2ProviderId = lab2._id;
  });

  describe('1. Central Patient Address Book Management', () => {
    it('fetches existing saved addresses across clinics and healthcare services', async () => {
      const res = await request(app)
        .get('/api/v1/patients/me/addresses')
        .set('Authorization', `Bearer ${token}`)
        .set('x-clinic-id', clinicId.toString());

      expect(res.status).toBe(200);
      const addresses = res.body.data.addresses;
      expect(addresses.length).toBe(2);
      expect(addresses[0].addressType).toBe('Home');
      expect(addresses[0].city).toBe('Ghaziabad');
      expect(addresses[1].addressType).toBe('Work');
      expect(addresses[1].city).toBe('Noida');
    });

    it('adds a new address to the central patient profile and makes it immediately available', async () => {
      const newAddr = {
        fullName: 'vidya (Parents)',
        mobileNumber: '9876543210',
        houseFlatNumber: 'E-45',
        street: 'Shastri Nagar',
        city: 'Meerut',
        state: 'Uttar Pradesh',
        pinCode: '250002',
        addressType: 'Parents House',
        isDefault: false
      };

      const res = await request(app)
        .post('/api/v1/patients/me/addresses')
        .set('Authorization', `Bearer ${token}`)
        .set('x-clinic-id', clinicId.toString())
        .send(newAddr);

      expect(res.status).toBe(200);
      const addresses = res.body.data.addresses;
      expect(addresses.length).toBe(3);
      expect(addresses.some(a => a.addressType === 'Parents House' && a.city === 'Meerut')).toBe(true);

      // Verify persistence in DB
      const patientDoc = await Patient.findById(patientProfileId);
      expect(patientDoc.savedAddresses.length).toBe(3);
    });

    it('sets an address as default in the central address book', async () => {
      const patientDoc = await Patient.findById(patientProfileId);
      const workAddr = patientDoc.savedAddresses.find(a => a.addressType === 'Work');

      const res = await request(app)
        .patch(`/api/v1/patients/me/addresses/${workAddr._id}/default`)
        .set('Authorization', `Bearer ${token}`)
        .set('x-clinic-id', clinicId.toString());

      expect(res.status).toBe(200);
      const addresses = res.body.data.addresses;
      const updatedWork = addresses.find(a => String(a._id) === String(workAddr._id));
      expect(updatedWork.isDefault).toBe(true);
      const updatedHome = addresses.find(a => a.addressType === 'Home');
      expect(updatedHome.isDefault).toBe(false);
    });
  });

  describe('2. Laboratory-Specific Package Recommendations', () => {
    it('shows ONLY packages offered by the currently selected laboratory with real pricing and constituent validation', async () => {
      // 1. Setup individual tests in Lab 1 (Radha Krishna Laboratory)
      const tlc = await LabTest.create({
        clinicId,
        laboratoryId: lab1ProviderId,
        code: 'TLC01',
        name: 'Total Leucocyte Count (T.L.C)',
        price: 150,
        testPrice: 150,
        specimenType: 'Whole Blood',
        turnaroundTime: '24 Hours',
        isActive: true
      });

      const crp = await LabTest.create({
        clinicId,
        laboratoryId: lab1ProviderId,
        code: 'CRP01',
        name: 'C-Reactive Protein (CRP)',
        price: 300,
        testPrice: 300,
        specimenType: 'Serum',
        turnaroundTime: 'Same Day',
        isActive: true
      });

      const lft = await LabTest.create({
        clinicId,
        laboratoryId: lab1ProviderId,
        code: 'LFT01',
        name: 'Liver Function Test (LFT)',
        price: 750,
        testPrice: 750,
        specimenType: 'Serum',
        turnaroundTime: '24 Hours',
        isActive: true
      });

      // 2. Setup Lab 1's Package: "Complete Health Check" containing TLC, CRP, LFT
      const lab1Package = await LabTest.create({
        clinicId,
        laboratoryId: lab1ProviderId,
        code: 'PKG-CHC01',
        name: 'Complete Health Check',
        category: 'Health Checkup',
        price: 999, // Configured package price
        testPrice: 999,
        isPackage: true,
        packageTests: [tlc._id, crp._id, lft._id],
        turnaroundTime: '24 Hours',
        fastingRequired: '10-12 Hours Fasting Required',
        importantInstructions: 'Overnight fasting required before morning blood sample.',
        isActive: true
      });

      // 3. Setup Lab 2's Package in Clinic 2 (Apollo Diagnostics): "Apollo Cardiac Screen"
      const lab2Package = await LabTest.create({
        clinicId: clinic2Id,
        laboratoryId: lab2ProviderId,
        code: 'PKG-APOLLO-CARD',
        name: 'Apollo Cardiac Special Package',
        category: 'Cardiac',
        price: 2999,
        testPrice: 2999,
        isPackage: true,
        isActive: true
      });

      // Query smart packages for Lab 1 (Radha Krishna Laboratory)
      const res = await request(app)
        .get(`/api/v1/labs/smart-packages?clinicId=${clinicId.toString()}&laboratoryId=${lab1ProviderId.toString()}&testIds=TLC01,CRP01`)
        .set('Authorization', `Bearer ${token}`)
        .set('x-clinic-id', clinicId.toString());

      expect(res.status).toBe(200);
      const packages = res.body.data.packages || res.body.data.suggestions;
      expect(Array.isArray(packages)).toBe(true);
      expect(packages.length).toBe(1);

      const pkg = packages[0];
      expect(pkg.packageName).toBe('Complete Health Check');
      expect(pkg.packagePrice).toBe(999);
      // Individual total: 150 + 300 + 750 = 1200
      expect(pkg.individualTotal).toBe(1200);
      // Savings: 1200 - 999 = 201
      expect(pkg.savings).toBe(201);
      // Covers selected test count: 2 (TLC01 and CRP01)
      expect(pkg.coversSelectedCount).toBe(2);
      expect(pkg.fastingRequired).toBe('10-12 Hours Fasting Required');

      // Crucial invariant: Must NEVER return packages belonging to Lab 2 (Apollo Diagnostics)
      expect(packages.some(p => p.packageName.includes('Apollo'))).toBe(false);
    });

    it('returns empty array when selected laboratory does not offer any packages', async () => {
      // Query packages for unconfigured lab from Clinic 1
      const res = await request(app)
        .get(`/api/v1/labs/smart-packages?clinicId=${clinicId.toString()}&laboratoryId=${new mongoose.Types.ObjectId().toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .set('x-clinic-id', clinicId.toString());

      expect(res.status).toBe(200);
      const packages = res.body.data.packages || res.body.data.suggestions;
      expect(packages).toEqual([]);
    });
  });
});
