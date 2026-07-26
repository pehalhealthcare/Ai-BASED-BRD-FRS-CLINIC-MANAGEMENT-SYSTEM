const { connectDB } = require('../src/config/database');
const Token = require('../src/modules/appointments/token.model');
const Consultation = require('../src/modules/consultations/consultation.model');
const Appointment = require('../src/modules/appointments/appointment.model');
require('../src/config/env');

connectDB().then(async () => {
  console.log('Connected to DB');
  
  // 1. Find all in_consultation tokens
  const activeTokens = await Token.find({ status: 'in_consultation' }).populate('appointmentId');
  console.log(`Found ${activeTokens.length} active tokens in_consultation.`);
  
  for (const token of activeTokens) {
    const appt = token.appointmentId;
    const isOld = new Date(token.createdAt) < new Date(new Date().setHours(0,0,0,0));
    const isApptCompleted = appt && appt.status === 'completed';
    
    if (isOld || isApptCompleted || !appt) {
      console.log(`Updating token ${token._id} (Code: ${appt?.appointmentCode || 'N/A'}) to completed...`);
      token.status = 'completed';
      token.consultationCompleted = token.consultationCompleted || new Date();
      await token.save();
    }
  }

  // 2. Find any in_progress consultations
  const activeConsultations = await Consultation.find({ status: 'in_progress' });
  console.log(`Found ${activeConsultations.length} in_progress consultations.`);
  for (const c of activeConsultations) {
    console.log(`Updating consultation ${c._id} (Appt Code: ${c.appointmentId}) to completed...`);
    c.status = 'completed';
    await c.save();
  }

  console.log('Cleanup finished.');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
