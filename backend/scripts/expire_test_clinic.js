const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Register all dependent models before querying
require('../src/modules/subscriptions/subscriptionPlan.model');
const User = require('../src/modules/users/user.model');
const Clinic = require('../src/modules/clinics/clinic.model');
const { connectDB, disconnectDB } = require('../src/config/database');

async function expireTargetClinic() {
  await connectDB();
  console.log('MongoDB connection active');

  const targetEmail = 'satife4259@bejum.com';
  const user = await User.findOne({ email: targetEmail });

  if (!user) {
    console.error(`User with email ${targetEmail} not found!`);
    process.exit(1);
  }

  console.log('\n========================================');
  console.log('1. IDENTIFIED USER & CLINIC');
  console.log('========================================');
  console.log({
    userId: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    clinicId: user.clinicId?.toString()
  });

  const clinicId = user.clinicId;
  const clinic = await Clinic.findById(clinicId).populate('subscription.planId');

  if (!clinic) {
    console.error(`Clinic ${clinicId} not found!`);
    process.exit(1);
  }

  console.log('\nPREVIOUS CLINIC STATE:');
  console.log({
    clinicId: clinic._id.toString(),
    name: clinic.name,
    code: clinic.code,
    approvalStatus: clinic.approvalStatus,
    paymentStatus: clinic.paymentStatus,
    isOnboardingCompleted: clinic.isOnboardingCompleted,
    subscriptionStatus: clinic.subscription?.status,
    expiryDate: clinic.subscription?.expiryDate,
    planId: clinic.subscription?.planId?._id?.toString() || clinic.subscription?.planId?.toString(),
    planName: clinic.subscription?.planId?.name,
    billingCycle: clinic.subscription?.billingCycle
  });

  // Calculate past expiration date (yesterday)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  // Update subscription to Expired without touching any other clinic or user data using updateOne
  await Clinic.updateOne(
    { _id: clinicId },
    {
      $set: {
        'subscription.status': 'Expired',
        'subscription.expiryDate': yesterday,
        'subscription.renewalDate': yesterday,
        approvalStatus: 'approved',
        isOnboardingCompleted: true
      }
    }
  );

  const updatedClinic = await Clinic.findById(clinicId).populate('subscription.planId');

  console.log('\n========================================');
  console.log('2. UPDATED CLINIC STATE (EXPIRED)');
  console.log('========================================');
  console.log({
    clinicId: updatedClinic._id.toString(),
    name: updatedClinic.name,
    subscriptionStatus: updatedClinic.subscription?.status,
    expiryDate: updatedClinic.subscription?.expiryDate,
    plan: updatedClinic.subscription?.planId?.name || updatedClinic.subscription?.planId,
    billingCycle: updatedClinic.subscription?.billingCycle,
    approvalStatus: updatedClinic.approvalStatus,
    isOnboardingCompleted: updatedClinic.isOnboardingCompleted
  });

  await disconnectDB();
}

expireTargetClinic().catch(err => {
  console.error(err);
  process.exit(1);
});
