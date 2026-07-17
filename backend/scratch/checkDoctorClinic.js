const mongoose = require('mongoose');
const User = require('../src/modules/users/user.model');
const Doctor = require('../src/modules/doctors/doctor.model');
const Clinic = require('../src/modules/clinics/clinic.model');

async function run() {
  const uri = 'mongodb+srv://Kaishav:Kaishav123@cms.mbzaovj.mongodb.net/ai-cms?retryWrites=true&w=majority';
  await mongoose.connect(uri);
  
  try {
    const user = await User.findOne({ email: 'kaishavgupta4.2001@gmail.com' });
    if (!user) {
      console.log('User not found');
      return;
    }
    console.log('User clinicId:', user.clinicId);
    if (user.clinicId) {
      const userClinic = await Clinic.findById(user.clinicId);
      console.log('User Clinic Name:', userClinic ? userClinic.name : 'Not Found');
    }

    const doctor = await Doctor.findOne({ userId: user._id });
    if (doctor) {
      console.log('Doctor clinicId:', doctor.clinicId);
      console.log('Doctor assignedClinics:', doctor.assignedClinics);
      if (doctor.clinicId) {
        const docClinic = await Clinic.findById(doctor.clinicId);
        console.log('Doctor Clinic Name:', docClinic ? docClinic.name : 'Not Found');
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
