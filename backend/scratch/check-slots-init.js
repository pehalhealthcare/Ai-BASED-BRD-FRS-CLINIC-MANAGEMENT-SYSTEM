const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

const mongoUri = process.env.MONGO_URI_ATLAS || process.env.MONGO_URI;

mongoose.connect(mongoUri)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    const Doctor = mongoose.model('Doctor', new mongoose.Schema({}, { strict: false }));
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const Clinic = mongoose.model('Clinic', new mongoose.Schema({}, { strict: false }));
    
    // Admin user: 6a47e2003deae544f4347532
    const adminUser = await User.findById("6a47e2003deae544f4347532");
    console.log('Admin user clinicId:', adminUser.clinicId);
    
    const doctorUser = await User.findOne({ name: 'Dr Shyam' });
    const doctorProfile = await Doctor.findOne({ userId: doctorUser._id });
    
    const rawClinics = await Clinic.find();
    
    const adminClinicId = adminUser.clinicId ? String(adminUser.clinicId) : null;
    const orgId = doctorUser.organizationId || doctorProfile.organizationId;
    
    let filtered = [];
    if (adminClinicId) {
      filtered = rawClinics.filter((c) => {
        const cId = String(c._id);
        const parentId = c.parentClinicId?._id ? String(c.parentClinicId._id) : String(c.parentClinicId || '');
        return cId === adminClinicId || parentId === adminClinicId;
      });
    }
    if (filtered.length === 0 && orgId) {
      filtered = rawClinics.filter((c) => String(c.organizationId) === String(orgId));
    }
    
    let prefLocation = doctorProfile.preferredPracticeLocation;
    if (prefLocation && !filtered.some((c) => String(c._id) === String(prefLocation))) {
      const prefClinic = rawClinics.find((c) => String(c._id) === String(prefLocation));
      if (prefClinic) {
        filtered.push(prefClinic);
      }
    }
    if (!prefLocation && filtered.length > 0) {
      prefLocation = filtered[0]._id;
    }
    
    console.log('Filtered clinics count:', filtered.length);
    filtered.forEach(c => console.log('Clinic:', c.name, c._id));
    
    const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const onboardingAvailability = doctorProfile.availability || [];
    
    const initialSlots = [];
    filtered.forEach((c) => {
      const isPrimary = String(c._id) === String(prefLocation);
      DAYS_OF_WEEK.forEach((day) => {
        const onboardingOfflineSlots = onboardingAvailability.filter(
          (a) => String(a.clinicId) === String(c._id) && a.dayOfWeek?.toLowerCase() === day.toLowerCase() && (a.consultationMode || 'offline') === 'offline'
        );
        const onboardingOnlineSlots = onboardingAvailability.filter(
          (a) => String(a.clinicId) === String(c._id) && a.dayOfWeek?.toLowerCase() === day.toLowerCase() && a.consultationMode === 'online'
        );
        
        if (isPrimary && onboardingOfflineSlots.length > 0) {
          onboardingOfflineSlots.forEach((slot, idx) => {
            initialSlots.push({
              clinicId: c._id,
              dayOfWeek: day,
              consultationMode: 'offline',
              isAvailable: slot.isAvailable !== false,
            });
          });
        } else {
          initialSlots.push({
            clinicId: c._id,
            dayOfWeek: day,
            consultationMode: 'offline',
            isAvailable: false,
          });
        }
      });
    });
    
    console.log('Initial slots count:', initialSlots.length);
    const activeSlots = initialSlots.filter(s => s.isAvailable);
    console.log('Active initial slots:', activeSlots);
    
    await mongoose.disconnect();
  })
  .catch(err => console.error(err));
