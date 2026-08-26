const mongoose = require('mongoose');
const { env } = require('../src/config/env');

const mongoUri = env.mongoMode === 'atlas' ? env.mongoUriAtlas : (env.mongoMode === 'local' ? env.mongoUriLocal : env.mongoUri);

async function testApi() {
  await mongoose.connect(mongoUri);

  require('../src/modules/users/user.model');
  require('../src/modules/clinics/clinic.model');
  require('../src/modules/doctors/doctor.model');

  const User = mongoose.model('User');
  const Clinic = mongoose.model('Clinic');
  const Doctor = mongoose.model('Doctor');

  const ownerUser = await User.findOne({ email: 'jewag12274@ittiv.com' });
  if (!ownerUser) {
    console.log('Owner not found');
    await mongoose.disconnect();
    return;
  }

  // Simulate getMyDoctorsDashboard
  const clinicIds = [ownerUser.clinicId];
  const branches = await Clinic.find({ parentClinicId: ownerUser.clinicId }).select('_id');
  branches.forEach(b => clinicIds.push(b._id));
  const clinicFilter = { clinicId: { $in: clinicIds } };

  const approvedDoctors = await Doctor.find({ approvalStatus: 'approved', ...clinicFilter }).populate('clinicId', 'name code').lean();
  console.log('Approved doctors count:', approvedDoctors.length);

  const pendingUsers = await User.find({ role: 'DOCTOR', approvalStatus: { $in: ['pending_profile', 'pending_approval', 're_edit', 'pending_onboarding'] }, ...clinicFilter }).lean();
  console.log('Pending users count:', pendingUsers.length);
  for (const u of pendingUsers) {
    console.log('  Pending User:', { _id: u._id, email: u.email, approvalStatus: u.approvalStatus });
  }

  await mongoose.disconnect();
}

testApi();
