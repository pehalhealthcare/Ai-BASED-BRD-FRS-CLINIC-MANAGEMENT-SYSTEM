const mongoose = require('mongoose');
const request = require('supertest');
const { ROLES } = require('../src/common/constants/roles');

let app;
let Clinic;
let Patient;
let User;
let Invoice;
let Payment;
let PatientInsurance;
let InsuranceProvider;
let Doctor;
let DoctorEarning;
let OrganizationEarning;
let DoctorPayoutSetting;
let OrganizationFinancialSetting;

const generateTestToken = (role = ROLES.ADMIN, id = new mongoose.Types.ObjectId()) => {
  const jwt = require('jsonwebtoken');
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

beforeAll(() => {
  app = require('../src/app');
  Clinic = require('../src/modules/clinics/clinic.model');
  Patient = require('../src/modules/patients/patient.model');
  User = require('../src/modules/users/user.model');
  Invoice = require('../src/modules/billing/invoice.model');
  Payment = require('../src/modules/payment/schemas/payment.schema');
  PatientInsurance = require('../src/modules/insurance/schemas/policy.schema');
  InsuranceProvider = require('../src/modules/insurance/schemas/provider.schema');
  Doctor = require('../src/modules/doctors/doctor.model');
  DoctorEarning = require('../src/modules/settlements/schemas/doctorEarning.schema');
  OrganizationEarning = require('../src/modules/settlements/schemas/organizationEarning.schema');
  DoctorPayoutSetting = require('../src/modules/settlements/schemas/doctorPayoutSetting.schema');
  OrganizationFinancialSetting = require('../src/modules/settlements/schemas/organizationFinancialSetting.schema');
});

describe('Billing & Payment Module Test Suite', () => {
  let adminToken;
  let patientToken;
  let adminUser;
  let patientUser;
  let clinic;
  let patient;
  let doctor;
  let provider;
  let policy;

  beforeEach(async () => {
    // Clear all test collections
    await User.deleteMany({});
    await Clinic.deleteMany({});
    await Patient.deleteMany({});
    await Invoice.deleteMany({});
    await Payment.deleteMany({});
    await PatientInsurance.deleteMany({});
    await InsuranceProvider.deleteMany({});
    await Doctor.deleteMany({});
    await DoctorEarning.deleteMany({});
    await OrganizationEarning.deleteMany({});
    await DoctorPayoutSetting.deleteMany({});
    await OrganizationFinancialSetting.deleteMany({});

    // Create users
    adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'AdminPassword123!',
      role: ROLES.ADMIN,
      isActive: true
    });

    const adminLoginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@example.com',
      password: 'AdminPassword123!'
    });
    adminToken = adminLoginRes.body.data.accessToken;

    patientUser = await User.create({
      name: 'Jane Doe',
      email: 'janedoe@example.com',
      password: 'PatientPassword123!',
      role: ROLES.PATIENT,
      isActive: true
    });

    const patientLoginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'janedoe@example.com',
      password: 'PatientPassword123!'
    });
    patientToken = patientLoginRes.body.data.accessToken;

    // Create Clinic
    clinic = await Clinic.create({
      name: 'Test Clinic',
      code: 'CLINIC01',
      email: 'testclinic@example.com',
      phone: '1234567890',
      address: { line1: '123 Test St', city: 'Test City', state: 'TS', pincode: '123456', country: 'India' },
      isActive: true
    });

    // Create Patient
    patient = await Patient.create({
      userId: patientUser._id,
      patientId: 'PAT-999999',
      firstName: 'Jane',
      lastName: 'Doe',
      fullName: 'Jane Doe',
      email: 'janedoe@example.com',
      phone: '9876543210',
      clinicId: clinic._id,
      age: 30,
      gender: 'female',
      createdBy: adminUser._id,
      isActive: true
    });

    // Create Doctor user and record
    const doctorUser = await User.create({
      name: 'Dr John Smith',
      email: 'johnsmith@example.com',
      password: 'DoctorPassword123!',
      role: ROLES.DOCTOR,
      isActive: true
    });

    doctor = await Doctor.create({
      userId: doctorUser._id,
      doctorCode: 'DOC-1234',
      firstName: 'John',
      lastName: 'Smith',
      fullName: 'Dr John Smith',
      email: 'johnsmith@example.com',
      phone: '9998887776',
      clinicId: clinic._id,
      specialization: 'General Medicine',
      createdBy: adminUser._id,
      isActive: true
    });

    // Create Provider
    provider = await InsuranceProvider.create({
      providerCode: 'STAR',
      providerName: 'Star Health Insurance',
      logo: 'logo.png',
      contactEmail: 'contact@star.com',
      contactPhone: '1800-111-222',
      website: 'star.com',
      supportedClaimTypes: ['consultation', 'lab', 'hospitalization', 'emergency']
    });

    // Create Policy
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    policy = await PatientInsurance.create({
      patientId: patient._id,
      providerId: provider._id,
      policyNumber: 'STAR00009999',
      memberId: 'MEM-111222',
      groupId: 'GRP-333444',
      policyHolderName: 'Jane Doe',
      relationship: 'Self',
      policyStartDate: startDate,
      policyEndDate: endDate,
      coverageAmount: 200000,
      remainingCoverage: 200000,
      status: 'ACTIVE',
      benefits: {
        consultation: true,
        lab: true,
        pharmacy: false,
        hospitalization: true,
        roomRent: true,
        surgery: true,
        emergency: true
      }
    });

    // Create Financial Settings
    await OrganizationFinancialSetting.create({
      organizationId: new mongoose.Types.ObjectId(), // dummy org
      automaticSettlement: false,
      doctorRevenuePercentage: 70,
      clinicRevenuePercentage: 30
    });
  });

  describe('POST /api/v1/billing/appointment', () => {
    it('should create an invoice for consultation and calculate insurance covered amount (80% covered)', async () => {
      const res = await request(app)
        .post('/api/v1/billing/appointment')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: patient._id.toString(),
          clinicId: clinic._id.toString(),
          doctorId: doctor._id.toString(),
          items: [{ name: 'Doctor Consultation', quantity: 1, unitPrice: 1000 }],
          policyNumber: 'STAR00009999'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.invoice.serviceType).toBe('CONSULTATION');
      expect(res.body.data.invoice.totalAmount).toBe(1000);
      expect(res.body.data.invoice.insuranceCoveredAmount).toBe(800); // 80% covered
      expect(res.body.data.invoice.patientPayableAmount).toBe(200); // 20% remaining
    });
  });

  describe('Payment & Settlement Workflow', () => {
    it('should create payment order, verify signature, and split earnings between doctor (80%) and clinic (20%)', async () => {
      // 1. Create Invoice
      const invoice = await Invoice.create({
        invoiceNumber: 'INV-100002',
        clinicId: clinic._id,
        patientId: patient._id,
        doctorId: doctor._id,
        serviceType: 'CONSULTATION',
        items: [{ name: 'Consultation', quantity: 1, unitPrice: 2000, amount: 2000 }],
        subtotal: 2000,
        totalAmount: 2000,
        insuranceCoveredAmount: 1600,
        patientPayableAmount: 400,
        invoiceStatus: 'PENDING',
        paymentStatus: 'UNPAID',
        createdBy: adminUser._id
      });

      // 2. Create Payment Order
      const orderRes = await request(app)
        .post('/api/v1/payment/create-order')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          invoiceId: invoice._id.toString(),
          method: 'UPI'
        });

      expect(orderRes.status).toBe(201);
      expect(orderRes.body.data.gatewayOrderId).toBeDefined();
      expect(orderRes.body.data.amount).toBe(400);

      // 3. Verify Payment
      const verifyRes = await request(app)
        .post('/api/v1/payment/verify')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          gatewayOrderId: orderRes.body.data.gatewayOrderId,
          gatewayPaymentId: 'pay_verify_123',
          gatewaySignature: 'sig_verify_123'
        });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data.payment.status).toBe('SUCCESS');

      // Verify Invoice marked PAID
      const paidInvoice = await Invoice.findById(invoice._id);
      expect(paidInvoice.paymentStatus).toBe('PAID');

      // 4. Verify Earnings split records created (80/20 share by default)
      const docEarning = await DoctorEarning.findOne({ invoiceId: invoice._id });
      expect(docEarning).toBeDefined();
      expect(docEarning.doctorShare).toBe(320); // 80% of patientPayableAmount (400)
      expect(docEarning.clinicShare).toBe(2000 - 320); // gross - doctorShare
      expect(docEarning.status).toBe('PENDING');

      const orgEarning = await OrganizationEarning.findOne({ invoiceId: invoice._id });
      expect(orgEarning).toBeDefined();
      expect(orgEarning.grossRevenue).toBe(2000);
      expect(orgEarning.netRevenue).toBe(2000 - 320);
    });
  });

  describe('POST /api/v1/settlements/mark-paid', () => {
    it('should allow clinic admin to manually mark doctor payout as PAID', async () => {
      const earning = await DoctorEarning.create({
        doctorId: doctor._id,
        clinicId: clinic._id,
        invoiceId: new mongoose.Types.ObjectId(),
        earningType: 'CONSULTATION',
        grossAmount: 1000,
        doctorShare: 800,
        clinicShare: 200,
        status: 'PENDING'
      });

      const res = await request(app)
        .post('/api/v1/settlements/mark-paid')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          doctorEarningId: earning._id.toString(),
          transactionRef: 'TXN-PAYOUT-999',
          remarks: 'Month-end revenue share payout'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.payout.status).toBe('PAID');
      expect(res.body.data.payout.payoutDetails.transactionRef).toBe('TXN-PAYOUT-999');
    });
  });
});
