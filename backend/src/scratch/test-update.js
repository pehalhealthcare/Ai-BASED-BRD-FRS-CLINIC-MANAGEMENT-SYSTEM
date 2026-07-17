const mongoose = require('mongoose');
const MONGO_URI = 'mongodb+srv://Kaishav:Kaishav123@cms.mbzaovj.mongodb.net/ai-cms?retryWrites=true&w=majority';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    const Consultation = require('../modules/consultations/consultation.model');
    
    // Try to update chiefComplaint as Save Draft would do
    const consultationId = '6a58b585ff1561e90a4cd8b5';
    const result = await Consultation.findByIdAndUpdate(
      consultationId,
      { $set: { chiefComplaint: 'Test Save Draft - ' + Date.now() } },
      { new: true }
    ).lean();
    
    if (result) {
      console.log('Update successful! New chiefComplaint:', result.chiefComplaint);
      console.log('Status:', result.status);
      
      // Reset it
      await Consultation.findByIdAndUpdate(consultationId, { $set: { chiefComplaint: 'Consultation' } });
      console.log('Reset done.');
    } else {
      console.log('Document not found!');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}
run();
