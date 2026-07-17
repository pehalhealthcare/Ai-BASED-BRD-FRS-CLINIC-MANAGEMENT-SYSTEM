const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

const mongoUri = process.env.MONGO_URI_ATLAS || process.env.MONGO_URI;

mongoose.connect(mongoUri)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const hashedPassword = await bcrypt.hash('Password@123', 10);
    
    const result = await User.updateOne(
      { email: 'kaishavgupta65416@gmail.com' },
      { $set: { password: hashedPassword } }
    );
    
    console.log('Password reset result:', result);
    await mongoose.disconnect();
  })
  .catch(err => console.error(err));
