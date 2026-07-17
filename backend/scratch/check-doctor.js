const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

const mongoUri = process.env.MONGO_URI_ATLAS || process.env.MONGO_URI;

mongoose.connect(mongoUri)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    const Doctor = mongoose.model('Doctor', new mongoose.Schema({}, { strict: false }));
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    
    const pendingUsers = await User.find({ role: 'DOCTOR', approvalStatus: { $in: ['pending_profile', 'pending_approval', 're_edit'] } });
    console.log(`Found ${pendingUsers.length} pending doctors in Users collection.`);
    
    for (const user of pendingUsers) {
      console.log(`\nUser: ${user.name} (${user.email}) - approvalStatus: ${user.approvalStatus}`);
      const doctor = await Doctor.findOne({ userId: user._id });
      if (doctor) {
        console.log(`Doctor profile found. ID: ${doctor._id}`);
        console.log('Preferred location:', doctor.preferredPracticeLocation || doctor.profile?.preferredPracticeLocation);
        const availability = doctor.availability || doctor.profile?.availability || [];
        console.log(`Availability count: ${availability.length}`);
        availability.forEach((slot, idx) => {
          console.log(`[${idx}] Day: ${slot.dayOfWeek}, Clinic: ${slot.clinicId}, Mode: ${slot.consultationMode}, Available: ${slot.isAvailable}, Time: ${slot.startTime} - ${slot.endTime}`);
        });
      } else {
        console.log('No Doctor profile found.');
      }
    }
    
    await mongoose.disconnect();
    console.log('Disconnected');
  })
  .catch(err => {
    console.error('Error:', err);
  });
