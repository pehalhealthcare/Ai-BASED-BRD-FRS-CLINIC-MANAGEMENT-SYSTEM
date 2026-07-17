const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

const mongoUri = process.env.MONGO_URI_ATLAS || process.env.MONGO_URI;

mongoose.connect(mongoUri)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    const appointmentService = require('../src/modules/appointments/appointment.service');
    
    // Doctor ID: 6a51410e234bc22d2ab00ac3
    // Clinic ID: 6a47e2003deae544f434752e
    try {
      const res = await appointmentService.getAvailableSlots({
        requester: { role: 'ADMIN', clinicId: '6a47e2003deae544f434752e' },
        query: {
          doctorId: '6a51410e234bc22d2ab00ac3',
          date: '2026-07-12',
          clinicId: '6a47e2003deae544f434752e'
        }
      });
      console.log('Available slots count:', res.slots.length);
      console.log('Slots:', res.slots);
    } catch (err) {
      console.error('Error in getAvailableSlots:', err);
    }
    
    await mongoose.disconnect();
  })
  .catch(err => console.error(err));
