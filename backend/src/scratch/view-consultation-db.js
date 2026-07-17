const mongoose = require('mongoose');
require('dotenv').config({ path: 'd:/Office_work/CMS/backend/.env' });

async function run() {
  const uri = process.env.MONGO_URI_ATLAS;
  await mongoose.connect(uri);
  console.log('Connected to DB');
  
  const Appointment = require('../modules/appointments/appointment.model');
  const appt = await Appointment.findById('6a58b52fff1561e90a4cd7b4').lean();
  console.log('APPOINTMENT:', JSON.stringify(appt, null, 2));
  
  await mongoose.disconnect();
}

run().catch(console.error);
