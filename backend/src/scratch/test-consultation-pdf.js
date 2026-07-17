const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: 'd:/Office_work/CMS/backend/.env' });

async function run() {
  const uri = process.env.MONGO_URI_ATLAS;
  await mongoose.connect(uri);
  console.log('Connected to DB');
  
  const Consultation = require('../modules/consultations/consultation.model');
  const Prescription = require('../modules/prescriptions/prescription.model');
  const Clinic = require('../modules/clinics/clinic.model');
  const Patient = require('../modules/patients/patient.model');
  const Doctor = require('../modules/doctors/doctor.model');
  
  const consultation = await Consultation.findById('6a58b585ff1561e90a4cd8b5');
  const clinic = await Clinic.findById(consultation.clinicId).lean();
  const patient = await Patient.findById(consultation.patientId).lean();
  const doctor = await Doctor.findById(consultation.doctorId).lean();
  const prescription = await Prescription.findOne({ consultationId: consultation._id }).lean();
  
  const { generateConsultationPdf } = require('../modules/consultations/consultationPdf.service');
  
  console.log('Generating PDF...');
  const res = await generateConsultationPdf({
    consultation,
    clinic,
    patient,
    doctor,
    prescription
  });
  
  console.log('PDF Generated successfully:', res);
  await mongoose.disconnect();
}

run().catch(console.error);
