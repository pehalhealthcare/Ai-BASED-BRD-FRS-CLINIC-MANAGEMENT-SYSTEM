const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

const mongoUri = process.env.MONGO_URI_ATLAS || process.env.MONGO_URI;

mongoose.connect(mongoUri)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    const Clinic = mongoose.model('Clinic', new mongoose.Schema({}, { strict: false }));
    const clinics = await Clinic.find();
    console.log(`Found ${clinics.length} clinics in collection.`);
    clinics.forEach((c) => {
      console.log(`ID: ${c._id}, Name: ${c.name}, Parent: ${c.parentClinicId}, Org: ${c.organizationId}`);
    });
    
    await mongoose.disconnect();
    console.log('Disconnected');
  })
  .catch(err => {
    console.error('Error:', err);
  });
