const { connectDB } = require('../src/config/database');
require('../src/modules/patients/patient.model');
require('../src/modules/doctors/doctor.model');
require('../src/modules/appointments/appointment.model');
const Token = require('../src/modules/appointments/token.model');
const Consultation = require('../src/modules/consultations/consultation.model');
require('../src/config/env');

connectDB().then(async () => {
  console.log('Connected to DB');
  
  const tokens = await Token.find({}).populate('appointmentId').populate('doctorId');
  console.log(`Found ${tokens.length} tokens:`);
  
  tokens.forEach(t => {
    console.log({
      id: t._id,
      doctor: t.doctorId?.name,
      appointmentCode: t.appointmentId?.appointmentCode,
      status: t.status,
      createdAt: t.createdAt
    });
  });

  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
