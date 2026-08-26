const mongoose = require('mongoose');
const { env } = require('../src/config/env');

const mongoUri = env.mongoMode === 'atlas' ? env.mongoUriAtlas : (env.mongoMode === 'local' ? env.mongoUriLocal : env.mongoUri);

async function deleteClinic() {
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  try {
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const Doctor = mongoose.model('Doctor', new mongoose.Schema({}, { strict: false }));
    const Staff = mongoose.model('Staff', new mongoose.Schema({}, { strict: false }));
    const Clinic = mongoose.model('Clinic', new mongoose.Schema({}, { strict: false }));
    const Provider = mongoose.model('Provider', new mongoose.Schema({}, { strict: false }));
    const EmailJob = mongoose.model('EmailJob', new mongoose.Schema({}, { strict: false }));
    const ClinicOnboardingDraft = mongoose.model('ClinicOnboardingDraft', new mongoose.Schema({}, { strict: false }));
    const OnboardingDraft = mongoose.model('OnboardingDraft', new mongoose.Schema({}, { strict: false }));

    const ownerEmail = 'jewag12274@ittiv.com';
    const ownerUser = await User.findOne({ email: ownerEmail });
    
    if (!ownerUser) {
      console.log(`User ${ownerEmail} not found. Checking if clinic or drafts exist...`);
    }

    const clinicId = ownerUser ? ownerUser.clinicId : null;

    // 1. Delete Owner User
    if (ownerUser) {
      const uRes = await User.deleteOne({ _id: ownerUser._id });
      console.log(`Deleted owner user ${ownerEmail}:`, uRes);
    }

    if (clinicId) {
      console.log(`Wiping all records related to Clinic ID: ${clinicId}`);

      // 2. Delete all Doctor profiles
      const docRes = await Doctor.deleteMany({ clinicId });
      console.log(`Deleted ${docRes.deletedCount} Doctor profiles.`);

      // 3. Delete all Staff profiles
      const staffRes = await Staff.deleteMany({ clinicId });
      console.log(`Deleted ${staffRes.deletedCount} Staff profiles.`);

      // 4. Delete all Users under this clinic
      const usersRes = await User.deleteMany({ clinicId });
      console.log(`Deleted ${usersRes.deletedCount} associated user accounts.`);

      // 5. Delete all Healthcare Providers
      const provRes = await Provider.deleteMany({ clinicId });
      console.log(`Deleted ${provRes.deletedCount} Healthcare Providers.`);

      // 6. Delete all branch clinics
      const branchRes = await Clinic.deleteMany({ parentClinicId: clinicId });
      console.log(`Deleted ${branchRes.deletedCount} branch clinics.`);

      // 7. Delete all pending/sent email jobs
      const emailRes = await EmailJob.deleteMany({ clinicId });
      console.log(`Deleted ${emailRes.deletedCount} email jobs.`);

      // 8. Delete ClinicOnboardingDraft
      const cDraftRes = await ClinicOnboardingDraft.deleteMany({ clinicId });
      console.log(`Deleted ${cDraftRes.deletedCount} clinic onboarding drafts.`);

      // 9. Delete main Clinic
      const clinicRes = await Clinic.deleteOne({ _id: clinicId });
      console.log(`Deleted main clinic:`, clinicRes);
    }

    // 10. Delete any generic onboarding drafts for the owner email
    const draftRes = await OnboardingDraft.deleteMany({ email: ownerEmail.toLowerCase() });
    console.log(`Deleted ${draftRes.deletedCount} general onboarding drafts for ${ownerEmail}.`);

    console.log('Cleanup finished successfully.');

  } catch (err) {
    console.error('Error during deletion:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
  }
}

deleteClinic();
