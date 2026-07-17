const mongoose = require('mongoose');
const { env } = require('../src/config/env');
const Clinic = require('../src/modules/clinics/clinic.model');
const User = require('../src/modules/users/user.model');

async function test() {
  await mongoose.connect(env.MONGO_URI || 'mongodb://localhost:27017/ai-cms');
  console.log('Connected to DB');
  const allClinics = await Clinic.find({});
  console.log('All clinics in DB:', allClinics.map(c => ({ name: c.name, approvalStatus: c.approvalStatus, email: c.ownerDetails?.email })));
  
  const allUsers = await User.find({});
  console.log('All users in DB:', allUsers.map(u => ({ name: u.name, email: u.email, role: u.role, approvalStatus: u.approvalStatus })));

  await mongoose.disconnect();
}

test().catch(console.error);
