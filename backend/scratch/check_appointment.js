const { connectDB } = require('../src/config/database');
require('../src/modules/patients/patient.model');
require('../src/modules/doctors/doctor.model');
const Appointment = require('../src/modules/appointments/appointment.model');
require('../src/config/env');

connectDB().then(async () => {
  console.log('Connected to DB');
  
  const all = await Appointment.find({}).populate('patientId').populate('doctorId');
  
  console.log('All Appointments in System:');
  all.forEach(apt => {
    console.log({
      appointmentCode: apt.appointmentCode,
      status: apt.status,
      patientName: apt.patientId?.name,
      patientIdCard: apt.patientId?.patientIdCard || apt.patientId?.idCard,
      doctorName: apt.doctorId?.name,
      appointmentDate: apt.appointmentDate,
      startTime: apt.startTime,
      paymentStatus: apt.paymentStatus,
      queueNumber: apt.queueNumber,
      tokenNumber: apt.tokenNumber
    });
  });

  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
