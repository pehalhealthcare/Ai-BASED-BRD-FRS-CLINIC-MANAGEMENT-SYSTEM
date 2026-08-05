const mongoose = require('mongoose');
const { env } = require('../src/config/env');
const { connectDB } = require('../src/config/database');
const User = require('../src/modules/users/user.model');
const Clinic = require('../src/modules/clinics/clinic.model');
const ClinicOnboardingDraft = require('../src/modules/clinics/clinicOnboardingDraft.model');
const SubscriptionPlan = require('../src/modules/subscriptions/subscriptionPlan.model');
const Doctor = require('../src/modules/doctors/doctor.model');
const Provider = require('../src/modules/providers/provider.model');

async function migrate() {
  console.log('Resolving and connecting to database...');
  await connectDB();
  console.log('Connected to DB successfully.');

  const email = 'wojerep430@bejum.com';
  console.log(`Searching for clinic owner with email: ${email}`);
  let owner = await User.findOne({ email, role: 'ADMIN' });

  let clinic;
  if (!owner) {
    console.log(`Clinic owner with email ${email} not found. Creating dummy clinic and owner for testing/migration...`);
    
    // Find or create a subscription plan
    let plan = await SubscriptionPlan.findOne({ code: 'PREMIUM' });
    if (!plan) {
      plan = await SubscriptionPlan.findOne({});
    }
    if (!plan) {
      console.log('Creating a dummy subscription plan first...');
      plan = await SubscriptionPlan.create({
        name: 'Premium Plan',
        code: 'PREMIUM',
        price: 99,
        billingCycle: 'monthly',
        features: ['pharmacy', 'labs', 'online_consultation', 'symptom_checker', 'consultation_assistant'],
        limits: { maxDoctors: 10, maxStaff: 15, maxBranches: 5, maxDepartments: 10 },
        isActive: true
      });
    }

    clinic = await Clinic.create({
      name: 'Existing Clinic',
      code: 'EXSTCL',
      phone: '9876543210',
      address: {
        line1: '123 Health St',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        country: 'India'
      },
      ownerDetails: {
        name: 'John Doe',
        phone: '9876543210',
        email: email,
        dob: new Date('1980-05-15'),
        gender: 'Male',
        address: '123 Health St'
      },
      clinicDetails: {
        registrationNumber: 'REG123456',
        establishedYear: '2015',
        consultationMode: 'Hybrid',
        languagesSpoken: ['English', 'Hindi'],
        departments: [
          { name: 'General Medicine', active: true },
          { name: 'Pediatrics', active: true }
        ]
      },
      approvalStatus: 'approved',
      isActive: false,
      isOnboardingCompleted: false,
      subscription: {
        planId: plan._id,
        billingCycle: 'monthly',
        startDate: new Date(),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'Active'
      }
    });

    owner = await User.create({
      name: 'John Doe',
      email: email,
      phone: '9876543210',
      password: '$2a$10$abcdefghijklmnopqrstuvwxyzuuuuuuuuuuuuuuuuuuuuuuuuu', // dummy hash
      role: 'ADMIN',
      clinicId: clinic._id,
      isActive: true,
      approvalStatus: 'approved'
    });

    console.log(`Created dummy owner ${owner._id} and clinic ${clinic._id}`);
  } else {
    clinic = await Clinic.findById(owner.clinicId);
    if (!clinic) {
      throw new Error(`Owner found but associated clinic ID ${owner.clinicId} not found in database.`);
    }
    console.log(`Found existing clinic: ${clinic.name} (${clinic._id})`);
  }

  // Pre-populate onboarding draft from existing DB data
  const doctorsCount = await Doctor.countDocuments({ clinicId: clinic._id });
  const staffCount = await User.countDocuments({ clinicId: clinic._id, role: { $in: ['RECEPTIONIST', 'PHARMACIST', 'LAB_TECHNICIAN'] } });
  const branchesCount = await Clinic.countDocuments({ parentClinicId: clinic._id });
  const providers = await Provider.find({ clinicId: clinic._id });

  // Map timings
  const scheduleDays = (clinic.clinicDetails?.timings || []).map((t, idx) => ({
    id: String(idx + 1),
    dayRange: t.dayRange || 'Monday - Friday',
    shifts: [{ startTime: t.startTime || '09:00 AM', endTime: t.endTime || '05:00 PM' }],
    closed: false
  }));

  const draftData = {
    currentStep: 0,
    ownerForm: {
      name: owner.name || clinic.ownerDetails?.name || '',
      designation: clinic.ownerDetails?.designation || 'Medical Director',
      phone: owner.phone || clinic.ownerDetails?.phone || '',
      email: owner.email,
      dob: clinic.ownerDetails?.dob ? new Date(clinic.ownerDetails.dob).toISOString().split('T')[0] : '',
      gender: clinic.ownerDetails?.gender || 'Male',
      nationality: 'Indian',
      preferredLanguage: 'English',
      aadhaar: clinic.ownerDetails?.aadhaar || '',
      pan: clinic.ownerDetails?.pan || '',
      address: clinic.ownerDetails?.address || clinic.address?.line1 || '',
      city: clinic.address?.city || '',
      state: clinic.address?.state || '',
      pincode: clinic.address?.pincode || '',
      country: clinic.address?.country || 'India',
      profilePhoto: clinic.ownerDetails?.profilePhoto || ''
    },
    clinicForm: {
      name: clinic.name,
      registrationNumber: clinic.clinicDetails?.registrationNumber || '',
      establishedYear: clinic.clinicDetails?.establishedYear || '',
      consultationMode: clinic.clinicDetails?.consultationMode || 'Hybrid',
      languagesSpoken: Array.isArray(clinic.clinicDetails?.languagesSpoken)
        ? clinic.clinicDetails.languagesSpoken.join(', ')
        : clinic.clinicDetails?.languagesSpoken || 'English, Hindi',
      addressLine1: clinic.address?.line1 || '',
      city: clinic.address?.city || '',
      state: clinic.address?.state || '',
      pincode: clinic.address?.pincode || '',
      contactNumber: clinic.phone || '',
      shortDescription: clinic.clinicDetails?.shortDescription || '',
      logo: clinic.clinicDetails?.logo || clinic.image || '',
      specialties: clinic.specializations && clinic.specializations.length > 0 ? 'Specialized' : 'General Medicine',
      latitude: clinic.address?.latitude || 12.9716,
      longitude: clinic.address?.longitude || 77.5946
    },
    selectedPlanId: clinic.subscription?.planId ? clinic.subscription.planId.toString() : '',
    doctors: [], // To be populated dynamically or left empty since we load them from DB
    departments: (clinic.clinicDetails?.departments || []).map(d => ({
      name: d.name,
      doctorsCount: 0,
      active: d.active !== false
    })),
    branches: [], // Load dynamically
    staff: [], // Load dynamically
    createdProviders: providers,
    aiFeatures: {
      voiceTranscription: true,
      consultationAssistant: true,
      symptomChecker: true,
      prescriptionSuggestions: true,
      riskScoring: false,
      labRecommendation: false,
      appointmentIntel: false,
      followUpReminders: false
    },
    videoProvider: 'Zoom',
    videoFee: '500',
    videoDuration: '15',
    videoWaitingRoom: true,
    scheduleType: 'Monday - Friday',
    scheduleDays: scheduleDays.length > 0 ? scheduleDays : [
      { id: '1', dayRange: 'Monday - Friday', shifts: [{ startTime: '09:00 AM', endTime: '05:00 PM' }], closed: false }
    ]
  };

  // Upsert the onboarding draft
  const draft = await ClinicOnboardingDraft.findOneAndUpdate(
    { clinicId: clinic._id },
    {
      clinicId: clinic._id,
      adminId: owner._id,
      currentStep: 0,
      draftData,
      updatedAt: new Date()
    },
    { upsert: true, new: true }
  );

  console.log(`Onboarding draft successfully migrated / created for clinic owner: ${email}`);
  console.log(JSON.stringify(draft, null, 2));

  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
