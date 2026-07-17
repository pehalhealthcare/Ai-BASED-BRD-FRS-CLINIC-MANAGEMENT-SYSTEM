const mongoose = require('mongoose');
const { env } = require('../src/config/env');
const User = require('../src/modules/users/user.model');
const Doctor = require('../src/modules/doctors/doctor.model');

async function test() {
  const uri = 'mongodb+srv://Kaishav:Kaishav123@cms.mbzaovj.mongodb.net/ai-cms?retryWrites=true&w=majority';
  await mongoose.connect(uri);
  console.log('Connected to Atlas DB');

  try {
    const email = 'kaishavgupta4.2001@gmail.com';
    const user = await User.findOne({ email: email.toLowerCase() });
    console.log('User account details:', user);
    
    if (user) {
      const docProfile = await Doctor.findOne({ userId: user._id });
      console.log('Doctor profile details:', docProfile);
    }
  } catch (err) {
    console.error(err);
  }

  await mongoose.disconnect();
}

test().catch(console.error);
