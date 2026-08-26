const mongoose = require('mongoose');
const { env } = require('../src/config/env');

const mongoUri = env.mongoMode === 'atlas' ? env.mongoUriAtlas : (env.mongoMode === 'local' ? env.mongoUriLocal : env.mongoUri);

async function forceReset() {
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  try {
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const Doctor = mongoose.model('Doctor', new mongoose.Schema({}, { strict: false }));
    const Staff = mongoose.model('Staff', new mongoose.Schema({}, { strict: false }));
    const Clinic = mongoose.model('Clinic', new mongoose.Schema({}, { strict: false }));
    const Provider = mongoose.model('Provider', new mongoose.Schema({}, { strict: false }));
    const EmailJob = mongoose.model('EmailJob', new mongoose.Schema({}, { strict: false }));

    const ownerUser = await User.findOne({ email: 'jewag12274@ittiv.com' });
    if (!ownerUser) {
      console.log('Owner not found');
      await mongoose.disconnect();
      return;
    }

    const clinicId = ownerUser.clinicId;
    console.log(`Force resetting clinic ${clinicId}...`);

    // Clean up collections
    await Doctor.deleteMany({ clinicId });
    await Staff.deleteMany({ clinicId });
    await User.deleteMany({ clinicId, _id: { $ne: ownerUser._id } });
    await Provider.deleteMany({ clinicId });
    await Clinic.deleteMany({ parentClinicId: clinicId });
    await EmailJob.deleteMany({ clinicId });

    // Use raw updateOne to bypass any save issues
    const res = await Clinic.updateOne(
      { _id: clinicId },
      { 
        $set: { 
          isOnboardingCompleted: false, 
          isActive: false,
          'clinicDetails.departments': [] 
        } 
      }
    );
    console.log('Update result:', res);

    const verifiedClinic = await Clinic.findById(clinicId).lean();
    console.log('Verified Clinic Status:', {
      _id: verifiedClinic._id,
      isOnboardingCompleted: verifiedClinic.isOnboardingCompleted,
      isActive: verifiedClinic.isActive
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
  }
}

forceReset();
