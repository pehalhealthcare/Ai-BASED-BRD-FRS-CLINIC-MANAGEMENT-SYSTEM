const mongoose = require('mongoose');
const { env } = require('../src/config/env');
const User = require('../src/modules/users/user.model');
const Staff = require('../src/modules/staff/staff.model');
const authService = require('../src/modules/auth/auth.service');
const staffService = require('../src/modules/staff/staff.service');

async function test() {
  await mongoose.connect(env.MONGO_URI || 'mongodb://localhost:27017/ai-cms');
  console.log('Connected to DB');

  // Create user
  const email = `test_staff_${Date.now()}@example.com`;
  const user = await User.create({
    name: 'Test Staff',
    email,
    phone: '9999999999',
    password: 'Password123!',
    role: 'RECEPTIONIST',
    isActive: false,
    approvalStatus: 'onboarding_in_progress'
  });

  const staff = await Staff.create({
    userId: user._id,
    firstName: 'Test',
    lastName: 'Staff',
    fullName: 'Test Staff',
    phone: '9999999999',
    email,
    role: 'RECEPTIONIST',
    isActive: false,
    approvalStatus: 'onboarding_in_progress'
  });

  // Call getCurrentUser (which is used by /auth/me)
  let currentUser = await authService.getCurrentUser(user);
  console.log('Current User initially:', currentUser.approvalStatus);

  // Submit profile
  const payload = {
    firstName: 'Test',
    lastName: 'Staff',
    fullName: 'Test Staff',
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

  await staffService.submitMyProfile({
    requester: user,
    payload
  });

  // Fetch from DB again to simulate what protect middleware does
  const userFromDb = await User.findById(user._id);
  currentUser = await authService.getCurrentUser(userFromDb);
  console.log('Current User after submit:', currentUser.approvalStatus);

  // Cleanup
  await User.deleteOne({ _id: user._id });
  await Staff.deleteOne({ userId: user._id });

  await mongoose.disconnect();
}

test().catch(console.error);
