const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { connectDB, disconnectDB } = require('../src/config/database');

async function resetTestClinic() {
  await connectDB();
  console.log('MongoDB connection active');

  const targetEmail = 'satife4259@bejum.com';
  const User = mongoose.models.User || require('../src/modules/users/user.model');
  const Clinic = mongoose.models.Clinic || require('../src/modules/clinics/clinic.model');
  const SubscriptionPayment = mongoose.models.SubscriptionPayment || require('../src/modules/payment/models/subscriptionPayment.model');

  // Find user and clinic
  const user = await User.findOne({ email: targetEmail });
  if (!user) {
    console.log(`No user found with email ${targetEmail}. Checking if any clinic exists with matching contact email...`);
  }

  const clinicId = user?.clinicId;
  const clinic = clinicId ? await Clinic.findById(clinicId) : await Clinic.findOne({ contactEmail: targetEmail });

  console.log('==================================================');
  console.log('IDENTIFIED TARGET TEST CLINIC & USER FOR RESET');
  console.log('==================================================');
  console.log({
    user: user ? {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      clinicId: user.clinicId?.toString()
    } : null,
    clinic: clinic ? {
      _id: clinic._id.toString(),
      name: clinic.name,
      code: clinic.code,
      contactEmail: clinic.contactEmail
    } : null
  });

  const resolvedClinicId = clinic?._id || clinicId;
  const userIds = user ? [user._id] : [];

  if (resolvedClinicId) {
    // Find all users belonging to this clinic
    const clinicUsers = await User.find({ clinicId: resolvedClinicId });
    clinicUsers.forEach(u => {
      if (!userIds.some(id => id.toString() === u._id.toString())) {
        userIds.push(u._id);
      }
    });
  }

  console.log(`Associated User IDs to clean up:`, userIds.map(id => id.toString()));
  console.log(`Associated Clinic ID to clean up:`, resolvedClinicId?.toString());

  // Count records to be deleted across all collections
  const collections = mongoose.connection.collections;
  const deletionSummary = {};

  // 1. Subscription Payments
  if (resolvedClinicId) {
    const paymentCount = await SubscriptionPayment.countDocuments({ clinicId: resolvedClinicId });
    deletionSummary['subscription_payments'] = paymentCount;
    await SubscriptionPayment.deleteMany({ clinicId: resolvedClinicId });
  }

  // 2. All collection cascaded deletions by clinicId or userId
  for (const [colName, col] of Object.entries(collections)) {
    if (['subscription_plans', 'payment_settings', 'roles', 'permissions'].includes(colName)) {
      // Never touch global master collections
      continue;
    }

    try {
      const filter = [];
      if (resolvedClinicId) {
        filter.push({ clinicId: resolvedClinicId });
        filter.push({ clinic: resolvedClinicId });
        filter.push({ organizationId: resolvedClinicId });
      }
      if (userIds.length > 0) {
        filter.push({ userId: { $in: userIds } });
        filter.push({ user: { $in: userIds } });
        filter.push({ doctorId: { $in: userIds } });
        filter.push({ patientId: { $in: userIds } });
        filter.push({ adminId: { $in: userIds } });
      }

      if (filter.length > 0) {
        const query = { $or: filter };
        const count = await col.countDocuments(query);
        if (count > 0 && colName !== 'subscription_payments' && colName !== 'clinics' && colName !== 'users') {
          deletionSummary[colName] = count;
          await col.deleteMany(query);
        }
      }
    } catch (err) {
      // Silently continue for collections without these fields
    }
  }

  // 3. Delete Users
  if (userIds.length > 0) {
    const userCount = await User.countDocuments({ _id: { $in: userIds } });
    deletionSummary['users'] = userCount;
    await User.deleteMany({ _id: { $in: userIds } });
  }

  // 4. Delete Clinic
  if (resolvedClinicId) {
    const clinicCount = await Clinic.countDocuments({ _id: resolvedClinicId });
    deletionSummary['clinics'] = clinicCount;
    await Clinic.deleteMany({ _id: resolvedClinicId });
  }

  console.log('\n==================================================');
  console.log('RESET DELETION SUMMARY');
  console.log('==================================================');
  console.table(deletionSummary);

  // Verification that email and clinic are 100% gone
  const checkUser = await User.findOne({ email: targetEmail });
  const checkClinic = resolvedClinicId ? await Clinic.findById(resolvedClinicId) : null;
  const checkPayments = resolvedClinicId ? await SubscriptionPayment.find({ clinicId: resolvedClinicId }) : [];

  console.log('\n==================================================');
  console.log('POST-CLEANUP VERIFICATION');
  console.log('==================================================');
  console.log({
    userExists: Boolean(checkUser),
    clinicExists: Boolean(checkClinic),
    remainingPaymentsCount: checkPayments.length,
    emailAvailableForFreshRegistration: !checkUser
  });

  await disconnectDB();
}

resetTestClinic().catch(err => {
  console.error('Reset failed:', err);
  process.exit(1);
});
