const mongoose = require('mongoose');
const MONGO_URI = 'mongodb+srv://Kaishav:Kaishav123@cms.mbzaovj.mongodb.net/ai-cms?retryWrites=true&w=majority';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB.');
    const Consultation = require('../modules/consultations/consultation.model');
    const { downloadConsultationPdf } = require('../modules/consultations/consultation.service');
    
    // Find the latest completed consultation
    const consultation = await Consultation.findOne({ status: 'completed' }).sort({ updatedAt: -1 });
    if (!consultation) {
      console.log('No completed consultation found!');
      return;
    }
    console.log('Found completed consultation:', consultation._id);

    const result = await downloadConsultationPdf({
      requester: { _id: consultation.doctorId, role: 'doctor' },
      consultationId: consultation._id,
      requestedClinicId: consultation.clinicId
    });

    console.log('PDF Generated Successfully! Path:', result.filePath);
  } catch (err) {
    console.error('Error generating PDF:', err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
