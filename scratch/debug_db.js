require('dotenv').config({ path: require('path').resolve(__dirname, '../backend/.env') });
const mongoose = require('mongoose');
const Token = require('../backend/src/modules/appointments/token.model');
const Appointment = require('../backend/src/modules/appointments/appointment.model');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cms');
  console.log('Connected to DB');

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const tokens = await Token.find({
    createdAt: { $gte: startOfDay, $lte: endOfDay }
  }).populate('appointmentId');

  console.log('--- Today Tokens ---');
  tokens.forEach(t => {
    console.log(`Token: ${t.tokenNumber}, Status: ${t.status}, Doc: ${t.doctorId}, ApptID: ${t.appointmentId?._id}, ApptStatus: ${t.appointmentId?.status}`);
  });

  const appts = await Appointment.find({
    appointmentDate: { $gte: startOfDay, $lte: endOfDay }
  });
  console.log('--- Today Appointments ---');
  appts.forEach(a => {
    console.log(`ApptID: ${a._id}, Status: ${a.status}, Time: ${a.startTime}, Patient: ${a.patientId}`);
  });

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
