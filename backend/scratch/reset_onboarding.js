const mongoose = require('mongoose');
const { env } = require('../src/config/env');

const mongoUri = env.mongoMode === 'atlas' ? env.mongoUriAtlas : (env.mongoMode === 'local' ? env.mongoUriLocal : env.mongoUri);

async function resetOnboarding() {
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  try {
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const Doctor = mongoose.model('Doctor', new mongoose.Schema({}, { strict: false }));
    const Staff = mongoose.model('Staff', new mongoose.Schema({}, { strict: false }));
    const Clinic = mongoose.model('Clinic', new mongoose.Schema({}, { strict: false }));
    const Provider = mongoose.model('Provider', new mongoose.Schema({}, { strict: false }));
    const EmailJob = mongoose.model('EmailJob', new mongoose.Schema({}, { strict: false }));

    // Find the owner user
    const ownerUser = await User.findOne({ email: 'jewag12274@ittiv.com' });
    if (!ownerUser) {
      console.log('Error: Owner user jewag12274@ittiv.com not found');
      await mongoose.disconnect();
      return;
    }

    const clinicId = ownerUser.clinicId;
    if (!clinicId) {
      console.log('Error: Owner user has no clinicId associated.');
      await mongoose.disconnect();
      return;
    }

    console.log(`Resetting clinic onboarding for Clinic ID: ${clinicId}`);

    // 1. Delete all Doctor profiles
    const deletedDocs = await Doctor.deleteMany({ clinicId });
    console.log(`Deleted ${deletedDocs.deletedCount} Doctor profiles.`);

    // 2. Delete all Staff profiles
    const deletedStaff = await Staff.deleteMany({ clinicId });
    console.log(`Deleted ${deletedStaff.deletedCount} Staff profiles.`);

    // 3. Delete all Users under this clinic (except the owner!)
    const deletedUsers = await User.deleteMany({ clinicId, _id: { $ne: ownerUser._id } });
    console.log(`Deleted ${deletedUsers.deletedCount} user accounts.`);

    // 4. Delete all healthcare providers
    const deletedProviders = await Provider.deleteMany({ clinicId });
    console.log(`Deleted ${deletedProviders.deletedCount} Healthcare Providers.`);

    // 5. Delete all branch clinics
    const deletedBranches = await Clinic.deleteMany({ parentClinicId: clinicId });
    console.log(`Deleted ${deletedBranches.deletedCount} branch clinics.`);

    // 6. Delete pending email jobs for this clinic
    const deletedEmails = await EmailJob.deleteMany({ clinicId });
    console.log(`Deleted ${deletedEmails.deletedCount} pending/sent email jobs.`);

    // 7. Reset the main clinic details & status
    const clinic = await Clinic.findById(clinicId);
    if (clinic) {
      clinic.isOnboardingCompleted = false;
      clinic.isActive = false;
      // Reset details but preserve basic fields
      clinic.clinicDetails = {
        departments: [],
        aiConfig: {
          scribeEnabled: false,
          predictNoShowEnabled: false,
          anomalyBillingEnabled: false,
          inventoryForecastEnabled: false
        },
        videoEnabled: false
      };
      clinic.markModified('clinicDetails');
      await clinic.save();
      console.log('Successfully reset main clinic details & onboarding status.');
    } else {
      console.log('Error: Main clinic not found.');
    }

  } catch (err) {
    console.error('Error executing reset script:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
  }
}

resetOnboarding();
