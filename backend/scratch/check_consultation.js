const { connectDB } = require('../src/config/database');
require('../src/modules/patients/patient.model');
require('../src/modules/doctors/doctor.model');
require('../src/modules/appointments/appointment.model');
const Consultation = require('../src/modules/consultations/consultation.model');
require('../src/config/env');

connectDB().then(async () => {
  console.log('Connected to DB');
  
  const consultations = await Consultation.find({}).populate('patientId').populate('appointmentId');
  console.log(`Found ${consultations.length} consultations:`);
  
  consultations.forEach(c => {
    console.log({
      id: c._id,
      patientName: c.patientId?.name,
      appointmentCode: c.appointmentId?.appointmentCode,
      status: c.status,
      chiefComplaint: c.chiefComplaint,
      createdAt: c.createdAt
    });
  });

  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
