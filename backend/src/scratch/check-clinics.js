const mongoose = require('mongoose');
const Clinic = require('../modules/clinics/clinic.model');
const User = require('../modules/users/user.model');

const MONGO_URI = 'mongodb+srv://Kaishav:Kaishav123@cms.mbzaovj.mongodb.net/ai-cms?retryWrites=true&w=majority';

async function check() {
  await mongoose.connect(MONGO_URI);
  try {
    const clinics = await Clinic.find({});
    console.log('Clinics in DB:');
    clinics.forEach(c => console.log(`- ${c.name}: ${c._id}`));

    const doctorUser = await User.findOne({ email: 'sicija7810@epaynine.com' });
    console.log('Doctor clinicId:', doctorUser.clinicId);

    const LabTest = require('../modules/labs/labTest.model');
    const count = await LabTest.countDocuments({ clinicId: doctorUser.clinicId });
    console.log('LabTest count for doctor clinic:', count);

    const sampleTests = await LabTest.find({ clinicId: doctorUser.clinicId }).limit(5);
    console.log('Sample tests:');
    sampleTests.forEach(t => console.log(`- ${t.name} (${t.code}): active=${t.isActive}`));
  } finally {
    await mongoose.disconnect();
  }
}
check();
