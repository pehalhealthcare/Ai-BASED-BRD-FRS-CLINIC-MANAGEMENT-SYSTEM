const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { connectDB, disconnectDB } = require('../src/config/database');
const User = require('../src/modules/users/user.model');
const Clinic = require('../src/modules/clinics/clinic.model');
const SubscriptionPlan = require('../src/modules/subscriptions/subscriptionPlan.model');
const SubscriptionPayment = require('../src/modules/payment/models/subscriptionPayment.model');
const subscriptionPaymentService = require('../src/modules/payment/services/subscriptionPayment.service');

async function testSubmit() {
  await connectDB();
  console.log('Connected to DB');

  const user = await User.findOne({ email: 'satife4259@bejum.com' });
  const plan = await SubscriptionPlan.findOne({});

  console.log('Found user & plan:', {
    userId: user?._id?.toString(),
    clinicId: user?.clinicId?.toString(),
    planId: plan?._id?.toString(),
    planName: plan?.name
  });

  const testUtr = 'TESTUTR' + Date.now();
  const payment = await subscriptionPaymentService.submitPaymentAttempt({
    clinicId: user.clinicId,
    planId: plan._id,
    billingCycle: 'monthly',
    utr: testUtr
  });

  console.log('SUCCESS! Created renewal payment attempt:');
  console.log({
    id: payment._id.toString(),
    status: payment.status,
    amount: payment.amount,
    paymentType: payment.paymentType,
    attemptNumber: payment.attemptNumber,
    utr: payment.utr,
    submittedAt: payment.submittedAt
  });

  const clinic = await Clinic.findById(user.clinicId);
  console.log('Clinic status after renewal submission:');
  console.log({
    clinicId: clinic._id.toString(),
    name: clinic.name,
    paymentStatus: clinic.paymentStatus,
    subscriptionStatus: clinic.subscription?.status,
    approvalStatus: clinic.approvalStatus
  });

  // Clean up this scratch test payment so the user can test cleanly
  await SubscriptionPayment.deleteOne({ _id: payment._id });
  console.log('Cleaned up scratch test payment.');

  await disconnectDB();
}

testSubmit().catch(err => {
  console.error('Test submission failed:', err);
  process.exit(1);
});
