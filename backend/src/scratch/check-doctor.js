const mongoose = require('mongoose');
const User = require('../modules/users/user.model');
const Doctor = require('../modules/doctors/doctor.model');

const MONGO_URI = 'mongodb+srv://Kaishav:Kaishav123@cms.mbzaovj.mongodb.net/ai-cms?retryWrites=true&w=majority';

async function check() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to DB');
  try {
    const user = await User.findOne({ email: 'sicija7810@epaynine.com' });
    if (!user) {
      console.log('Doctor user not found!');
      return;
    }
    console.log('User found:', {
      _id: user._id,
      email: user.email,
      role: user.role,
      clinicId: user.clinicId
    });

    const doctor = await Doctor.findOne({ userId: user._id });
    console.log('Linked Doctor Profile:', doctor ? {
      _id: doctor._id,
      clinicId: doctor.clinicId,
      isActive: doctor.isActive
    } : 'None');

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

check();
