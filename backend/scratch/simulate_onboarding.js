const mongoose = require('mongoose');
const { env } = require('../src/config/env');
const User = require('../src/modules/users/user.model');
const Staff = require('../src/modules/staff/staff.model');
const Receptionist = require('../src/modules/receptionists/receptionist.model');
const staffService = require('../src/modules/staff/staff.service');

async function test() {
  await mongoose.connect(env.MONGO_URI || 'mongodb://localhost:27017/ai-cms');
  console.log('Connected to DB');

  // 1. Create a dummy staff user
  const email = `test_staff_${Date.now()}@example.com`;
  const name = 'Test Staff';
  const role = 'RECEPTIONIST';
  
  const user = await User.create({
    name,
    email,
    phone: '9999999999',
    password: 'Password123!',
    role,
    isActive: false,
    approvalStatus: 'pending_invitation'
  });

  const staff = await Staff.create({
    userId: user._id,
    firstName: 'Test',
    lastName: 'Staff',
    fullName: name,
    phone: '9999999999',
    email,
    role,
    isActive: false,
    approvalStatus: 'pending_invitation'
  });

  const receptionist = await Receptionist.create({
    userId: user._id,
    firstName: 'Test',
    lastName: 'Staff',
    fullName: name,
    phone: '9999999999',
    email,
    isActive: false,
    approvalStatus: 'pending_invitation'
  });

  console.log('Created user and profiles:', {
    userStatus: user.approvalStatus,
    staffStatus: staff.approvalStatus,
    receptionistStatus: receptionist.approvalStatus
  });

  // 2. Simulate OTP verification (setting to onboarding_in_progress)
  user.approvalStatus = 'onboarding_in_progress';
  await user.save();
  await Staff.updateOne({ userId: user._id }, { approvalStatus: 'onboarding_in_progress' });
  await Receptionist.updateOne({ userId: user._id }, { approvalStatus: 'onboarding_in_progress' });

  // 3. Call submitMyProfile
  const payload = {
    firstName: 'Test',
    lastName: 'Staff',
    fullName: name,
    gender: 'male',
    dateOfBirth: '1990-01-01',
    phone: '9999999999',
    currentAddress: {
      line1: '123 Test St',
      city: 'Test City',
      state: 'Test State',
      pincode: '123456',
      country: 'India'
    },
    qualification: 'Diploma',
    experienceYears: 2
  };

  const updatedStaff = await staffService.submitMyProfile({
    requester: user,
    payload
  });

  const freshUser = await User.findById(user._id);
  const freshStaff = await Staff.findOne({ userId: user._id });
  const freshReceptionist = await Receptionist.findOne({ userId: user._id });

  console.log('After submitMyProfile:', {
    userStatus: freshUser.approvalStatus,
    staffStatus: freshStaff.approvalStatus,
    receptionistStatus: freshReceptionist.approvalStatus
  });

  // Cleanup
  await User.deleteOne({ _id: user._id });
  await Staff.deleteOne({ userId: user._id });
  await Receptionist.deleteOne({ userId: user._id });
  
  await mongoose.disconnect();
}

test().catch(console.error);
