const mongoose = require('mongoose');
const MONGO_URI = 'mongodb+srv://Kaishav:Kaishav123@cms.mbzaovj.mongodb.net/ai-cms?retryWrites=true&w=majority';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    const Consultation = require('../modules/consultations/consultation.model');
    const Appointment = require('../modules/appointments/appointment.model');
    
    const consultationId = '6a58b585ff1561e90a4cd8b5';
    const c = await Consultation.findById(consultationId).lean();
    
    if (!c) { console.log('Consultation NOT FOUND'); return; }
    
    console.log('=== CONSULTATION ===');
    console.log('_id:', c._id);
    console.log('Status:', c.status);
    console.log('ChiefComplaint:', c.chiefComplaint);
    console.log('AppointmentId:', c.appointmentId);
    console.log('PatientId:', c.patientId);
    console.log('DoctorId:', c.doctorId);
    
    if (c.appointmentId) {
      const appt = await Appointment.findById(c.appointmentId).lean();
      console.log('\n=== APPOINTMENT ===');
      console.log('_id:', appt?._id);
      console.log('Status:', appt?.status);
      console.log('AppointmentNumber:', appt?.appointmentNumber);
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}
run();
