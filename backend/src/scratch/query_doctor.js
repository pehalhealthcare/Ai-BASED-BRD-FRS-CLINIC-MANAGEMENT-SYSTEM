const mongoose = require('mongoose');
const { connectDB } = require('../config/database');
const Doctor = require('../modules/doctors/doctor.model');

const run = async () => {
  await connectDB();
  console.log('Connected to DB');

  const result = await Doctor.updateOne(
    { email: 'kaishavgupta4.2001@gmail.com' },
    { $set: { isOnlineAvailable: true } }
  );
  console.log('Update result:', result);

  const updatedDoc = await Doctor.findOne({ email: 'kaishavgupta4.2001@gmail.com' });
  console.log('Updated Doctor Profile isOnlineAvailable:', updatedDoc?.isOnlineAvailable);

  await mongoose.disconnect();
};

run();
