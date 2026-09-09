const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { connectDB, disconnectDB } = require('../src/config/database');
const User = require('../src/modules/users/user.model');
const Clinic = require('../src/modules/clinics/clinic.model');

async function createAdminUser() {
  await connectDB();

  const targetEmail = 'mswaroopcsebt@gmail.com';
  const clinic = await Clinic.findById('6a6cc9f4600658fc572f2a22');

  if (!clinic) {
    console.error('Clinic not found!');
    process.exit(1);
  }

  console.log('Found Clinic:', {
    id: clinic._id.toString(),
    name: clinic.name,
    code: clinic.code,
    ownerEmail: clinic.ownerDetails?.email,
    ownerName: clinic.ownerDetails?.name,
    subscriptionStatus: clinic.subscription?.status,
    expiryDate: clinic.subscription?.expiryDate
  });

  // Check if user already exists
  let user = await User.findOne({ email: targetEmail });
  const defaultPassword = 'Password123!';
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  if (!user) {
    user = await User.create({
      name: clinic.ownerDetails?.name || 'Mayank',
      email: targetEmail,
      phone: clinic.ownerDetails?.phone || '8000000000',
      password: hashedPassword,
      role: 'ADMIN',
      clinicId: clinic._id,
      approvalStatus: 'approved',
      isActive: true,
      isEmailVerified: true
    });
    console.log('Created Admin User for mswaroopcsebt@gmail.com:', {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      clinicId: user.clinicId?.toString(),
      defaultPassword
    });
  } else {
    user.clinicId = clinic._id;
    user.role = 'ADMIN';
    user.isActive = true;
    user.approvalStatus = 'approved';
    user.password = hashedPassword;
    await user.save();
    console.log('Updated existing user with clinicId and password:', {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      clinicId: user.clinicId?.toString()
    });
  }

  // Ensure clinic subscription is explicitly 'Expired'
  const pastDate = new Date('2026-08-30T16:15:01.241Z');
  await Clinic.updateOne(
    { _id: clinic._id },
    {
      $set: {
        'subscription.status': 'Expired',
        'subscription.expiryDate': pastDate,
        'subscription.renewalDate': pastDate,
        approvalStatus: 'approved',
        isOnboardingCompleted: true
      }
    }
  );

  console.log('\nVerified setup for mswaroopcsebt@gmail.com:');
  console.log({
    email: targetEmail,
    password: defaultPassword,
    clinicName: clinic.name,
    subscriptionStatus: 'Expired',
    expectedRouteOnLogin: '/clinic/expired'
  });

  await disconnectDB();
}

createAdminUser().catch(err => {
  console.error(err);
  process.exit(1);
});
