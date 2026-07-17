const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

const mongoUri = process.env.MONGO_URI_ATLAS || process.env.MONGO_URI;

mongoose.connect(mongoUri)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    const Doctor = mongoose.model('Doctor', new mongoose.Schema({}, { strict: false }));
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    
    const user = await User.findOne({ name: 'Dr Shyam' });
    if (user) {
      console.log('=== USER ===');
      console.log(JSON.stringify(user, null, 2));
      
      const doctor = await Doctor.findOne({ userId: user._id });
      if (doctor) {
        console.log('=== DOCTOR ===');
        console.log(JSON.stringify(doctor, null, 2));
      }
    }
    
    await mongoose.disconnect();
    console.log('Disconnected');
  })
  .catch(err => {
    console.error('Error:', err);
  });
