const mongoose = require('mongoose');
const { env } = require('../src/config/env');

const mongoUri = env.mongoMode === 'atlas' ? env.mongoUriAtlas : (env.mongoMode === 'local' ? env.mongoUriLocal : env.mongoUri);
console.log('Connecting to MongoDB on mode:', env.mongoMode);

async function inspect() {
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected to MongoDB successfully');
  } catch (cErr) {
    console.error('Failed to connect to MongoDB:', cErr);
    return;
  }

  try {
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const Doctor = mongoose.model('Doctor', new mongoose.Schema({}, { strict: false }));
    const Clinic = mongoose.model('Clinic', new mongoose.Schema({}, { strict: false }));

    // Find clinic owner
    const ownerUser = await User.findOne({ email: 'jewag12274@ittiv.com' });
    if (!ownerUser) {
      console.log('Owner user jewag12274@ittiv.com not found');
      await mongoose.disconnect();
      return;
    }
    console.log('Owner User:', {
      _id: ownerUser._id,
      email: ownerUser.email,
      clinicId: ownerUser.clinicId,
      role: ownerUser.role
    });

    if (ownerUser.clinicId) {
      const clinic = await Clinic.findById(ownerUser.clinicId);
      console.log('Clinic:', clinic ? { _id: clinic._id, name: clinic.name, isOnboardingCompleted: clinic.isOnboardingCompleted } : 'Clinic not found');

      const doctors = await Doctor.find({ clinicId: ownerUser.clinicId });
      console.log(`Found ${doctors.length} doctors under clinicId ${ownerUser.clinicId}:`);
      for (const d of doctors) {
        console.log({
          _id: d._id,
          fullName: d.fullName,
          email: d.email,
          approvalStatus: d.approvalStatus,
          isActive: d.isActive,
          userId: d.userId
        });

        if (d.userId) {
          const u = await User.findById(d.userId);
          console.log('  Associated User:', u ? { _id: u._id, email: u.email, approvalStatus: u.approvalStatus, isActive: u.isActive, clinicId: u.clinicId } : 'User not found');
        }
      }

      const users = await User.find({ clinicId: ownerUser.clinicId, role: 'DOCTOR' });
      console.log(`Found ${users.length} DOCTOR users under clinicId ${ownerUser.clinicId}:`);
      for (const u of users) {
        console.log({
          _id: u._id,
          email: u.email,
          approvalStatus: u.approvalStatus,
          isActive: u.isActive
        });
      }
    }
  } catch (err) {
    console.error('Inspection error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
  }
}

inspect();
