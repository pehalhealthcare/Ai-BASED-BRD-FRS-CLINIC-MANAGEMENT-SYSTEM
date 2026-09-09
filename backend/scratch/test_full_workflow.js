const mongoose = require('mongoose');
const { connectDB } = require('../src/config/database');
const request = require('supertest');
const app = require('../src/app');

async function runE2ETest() {
  await connectDB();
  console.log('\n=============================================');
  console.log('--- STARTING E2E PAYMENT & LIFECYCLE TEST ---');
  console.log('=============================================\n');

  const testEmail = `testclinic_${Date.now()}@example.com`;
  const testPhone = '9888877771';
  const testClinicName = `Apollo Apex ${Date.now().toString().slice(-4)}`;

  // 1. Fetch available plans
  const SubscriptionPlan = require('../src/modules/subscriptions/subscriptionPlan.model');
  const plan = await SubscriptionPlan.findOne({ isActive: true }) || await SubscriptionPlan.create({
    name: 'AI Professional Clinic',
    code: 'PRO_CLINIC',
    price: 1999,
    priceMonthly: 1999,
    priceYearly: 19990,
    features: ['appointments', 'billing', 'prescriptions', 'emr'],
    isActive: true
  });

  console.log(`✓ Using Subscription Plan: "${plan.name}" (Price: ₹${plan.priceMonthly}/mo)`);

  // 2. Submit Registration (Step 1 -> 4 + OTP Verified)
  const regRes = await request(app)
    .post('/api/v1/clinics/register/submit')
    .send({
      ownerDetails: {
        name: 'Dr. Alok Verma',
        designation: 'Medical Director',
        phone: testPhone,
        email: testEmail,
        password: 'Password123!',
        dob: '1985-05-15',
        gender: 'Male',
        nationality: 'Indian',
        preferredLanguage: 'English'
      },
      clinicDetails: {
        name: testClinicName,
        registrationNumber: `REG-${Date.now().toString().slice(-6)}`,
        establishedYear: '2015',
        consultationMode: 'Hybrid',
        languagesSpoken: ['English', 'Hindi'],
        addressLine1: 'Sector 62, Electronic City',
        city: 'Noida',
        state: 'Uttar Pradesh',
        pincode: '201301',
        contactNumber: testPhone
      },
      selectedPlan: {
        planId: plan._id.toString(),
        billingCycle: 'monthly'
      }
    });

  if (regRes.status !== 201) {
    console.error('Registration failed:', regRes.status, regRes.body);
    process.exit(1);
  }

  const token = regRes.body.data.accessToken;
  const clinic = regRes.body.data.clinic;
  const user = regRes.body.data.user;

  console.log(`✓ Clinic Created: ID=${clinic._id}, Name="${clinic.name}", Code="${clinic.code}"`);
  console.log(`✓ Owner User Created: ID=${user._id}, Email="${user.email}", Role="${user.role}", EmailVerified=${user.isEmailVerified}`);
  console.log(`✓ JWT Token Generated: ${token.slice(0, 20)}...`);

  // 3. Verify Setup Status: Must require PAYMENT
  const statusRes1 = await request(app)
    .get('/api/v1/clinics/setup-status')
    .set('Authorization', `Bearer ${token}`);

  console.log('\n--- SETUP STATUS (Pre-Payment) ---');
  console.log(`  emailVerified: ${statusRes1.body.data.emailVerified}`);
  console.log(`  paymentStatus: ${statusRes1.body.data.paymentStatus}`);
  console.log(`  approvalStatus: ${statusRes1.body.data.approvalStatus}`);
  console.log(`  nextRequiredAction: ${statusRes1.body.data.nextRequiredAction}`);
  console.log(`  targetRoute: ${statusRes1.body.data.targetRoute}`);

  if (statusRes1.body.data.nextRequiredAction !== 'PAYMENT' || statusRes1.body.data.paymentStatus !== 'NOT_SUBMITTED') {
    throw new Error('Pre-payment setup status assertion failed!');
  }

  // 4. Initiate Payment: Fetch price calculation & dynamic QR
  const initRes = await request(app)
    .post('/api/v1/subscription/initiate')
    .set('Authorization', `Bearer ${token}`)
    .send({
      clinicId: clinic._id,
      planId: plan._id,
      billingCycle: 'monthly'
    });

  console.log('\n--- PAYMENT INITIATION (Server-Side Price Authority) ---');
  console.log(`  Plan Name: ${initRes.body.data.plan.name}`);
  console.log(`  Calculated Payable Amount: ₹${initRes.body.data.plan.amount}`);
  console.log(`  Bank Account Name: ${initRes.body.data.paymentDetails.accountName}`);
  console.log(`  Bank Name: ${initRes.body.data.paymentDetails.bankName}`);
  console.log(`  Account Number: ${initRes.body.data.paymentDetails.accountNumber}`);
  console.log(`  IFSC Code: ${initRes.body.data.paymentDetails.ifscCode}`);
  console.log(`  UPI ID: ${initRes.body.data.paymentDetails.upiId}`);
  console.log(`  Dynamic UPI Payload: ${initRes.body.data.paymentDetails.upiPayload}`);
  console.log(`  Dynamic QR Data URI: ${initRes.body.data.paymentDetails.dynamicQr ? 'Generated ✓' : 'Failed ✗'}`);

  if (!initRes.body.data.paymentDetails.dynamicQr) {
    throw new Error('Dynamic QR was not generated!');
  }

  // 5. Submit Payment (UTR)
  const testUtr = `UTR${Date.now().toString().slice(-10)}`;
  const submitRes = await request(app)
    .post('/api/v1/subscription/submit')
    .set('Authorization', `Bearer ${token}`)
    .send({
      clinicId: clinic._id,
      planId: plan._id,
      billingCycle: 'monthly',
      utr: testUtr,
      transactionId: `TXN${Date.now()}`
    });

  console.log('\n--- PAYMENT SUBMISSION ---');
  console.log(`  Submitted UTR: ${submitRes.body.data.payment.utr}`);
  console.log(`  Payment Status: ${submitRes.body.data.payment.status}`);
  console.log(`  Attempt Number: ${submitRes.body.data.payment.attemptNumber}`);

  // 6. Verify Setup Status: Must require PAYMENT_VERIFICATION
  const statusRes2 = await request(app)
    .get('/api/v1/clinics/setup-status')
    .set('Authorization', `Bearer ${token}`);

  console.log('\n--- SETUP STATUS (Post-Payment Submission) ---');
  console.log(`  paymentStatus: ${statusRes2.body.data.paymentStatus}`);
  console.log(`  nextRequiredAction: ${statusRes2.body.data.nextRequiredAction}`);
  console.log(`  targetRoute: ${statusRes2.body.data.targetRoute}`);

  if (statusRes2.body.data.paymentStatus !== 'PENDING_VERIFICATION') {
    throw new Error('Post-submission payment status assertion failed!');
  }

  // 7. Super Admin Verifies Payment
  const User = require('../src/modules/users/user.model');
  const superAdmin = await User.findOne({ role: 'SUPER_ADMIN' });
  const { generateAccessToken } = require('../src/modules/auth/token.service');
  const adminToken = generateAccessToken(superAdmin);

  const verifyRes = await request(app)
    .post(`/api/v1/admin/payments/${submitRes.body.data.payment._id}/verify`)
    .set('Authorization', `Bearer ${adminToken}`);

  console.log('\n--- SUPER ADMIN VERIFICATION ---');
  console.log(`  Verified Message: ${verifyRes.body.message}`);
  console.log(`  Clinic Approval Status: ${verifyRes.body.data.clinic.approvalStatus}`);
  console.log(`  Clinic Subscription Status: ${verifyRes.body.data.clinic.subscription.status}`);

  // 8. Verify Setup Status: Must require ONBOARDING
  const statusRes3 = await request(app)
    .get('/api/v1/clinics/setup-status')
    .set('Authorization', `Bearer ${token}`);

  console.log('\n--- SETUP STATUS (Post-Super Admin Verification) ---');
  console.log(`  paymentStatus: ${statusRes3.body.data.paymentStatus}`);
  console.log(`  approvalStatus: ${statusRes3.body.data.approvalStatus}`);
  console.log(`  onboardingStatus: ${statusRes3.body.data.onboardingStatus}`);
  console.log(`  nextRequiredAction: ${statusRes3.body.data.nextRequiredAction}`);
  console.log(`  targetRoute: ${statusRes3.body.data.targetRoute}`);

  if (statusRes3.body.data.nextRequiredAction !== 'ONBOARDING' || statusRes3.body.data.paymentStatus !== 'VERIFIED') {
    throw new Error('Post-verification setup status assertion failed!');
  }

  // 9. Clean up test records
  const Clinic = require('../src/modules/clinics/clinic.model');
  const SubscriptionPayment = require('../src/modules/payment/models/subscriptionPayment.model');
  await Clinic.deleteOne({ _id: clinic._id });
  await User.deleteOne({ _id: user._id });
  await SubscriptionPayment.deleteMany({ clinicId: clinic._id });

  console.log('\n=============================================');
  console.log('✓ ALL E2E LIFECYCLE & PAYMENT TESTS PASSED!');
  console.log('=============================================\n');

  await mongoose.disconnect();
}

runE2ETest().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
