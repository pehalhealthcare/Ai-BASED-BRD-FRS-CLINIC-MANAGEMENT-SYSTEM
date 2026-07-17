const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

const mongoUri = process.env.MONGO_URI_ATLAS || process.env.MONGO_URI;

mongoose.connect(mongoUri)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const admins = await User.find({ role: { $in: ['SUPER_ADMIN', 'ADMIN'] } });
    console.log(`Found ${admins.length} admins.`);
    admins.forEach((a) => {
      console.log(`Email: ${a.email}, Name: ${a.name}, Role: ${a.role}, Clinic: ${a.clinicId}`);
    });
    
    await mongoose.disconnect();
  })
  .catch(err => console.error(err));
