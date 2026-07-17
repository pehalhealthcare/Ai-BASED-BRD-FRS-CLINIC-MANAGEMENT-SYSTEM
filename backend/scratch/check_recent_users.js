const mongoose = require('mongoose');
const { env } = require('../src/config/env');
const User = require('../src/modules/users/user.model');
const Staff = require('../src/modules/staff/staff.model');
const Receptionist = require('../src/modules/receptionists/receptionist.model');

async function test() {
  await mongoose.connect(env.MONGO_URI || 'mongodb://localhost:27017/ai-cms');
  console.log('Connected to DB');
  
  const allUsers = await User.find({});
  console.log('--- ALL USERS ---');
  console.log(allUsers.map(u => ({ id: u._id, name: u.name, email: u.email, role: u.role, approvalStatus: u.approvalStatus })));

  const allStaff = await Staff.find({});
  console.log('--- ALL STAFF ---');
  console.log(allStaff.map(s => ({ id: s._id, userId: s.userId, fullName: s.fullName, role: s.role, approvalStatus: s.approvalStatus })));

  const allReceptionists = await Receptionist.find({});
  console.log('--- ALL RECEPTIONISTS ---');
  console.log(allReceptionists.map(r => ({ id: r._id, userId: r.userId, fullName: r.fullName, approvalStatus: r.approvalStatus })));

  await mongoose.disconnect();
}

test().catch(console.error);
