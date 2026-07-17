const mongoose = require('mongoose');
const User = require('../src/modules/users/user.model');
const Staff = require('../src/modules/staff/staff.model');
const Receptionist = require('../src/modules/receptionists/receptionist.model');

async function test() {
  await mongoose.connect('mongodb+srv://Kaishav:Kaishav123@cms.mbzaovj.mongodb.net/ai-cms?retryWrites=true&w=majority');
  console.log('Connected to DB');
  
  const user = await User.findOne({ email: 'kvg.buisness4.2001@gmail.com' });
  console.log('--- USER ---');
  console.log(JSON.stringify(user, null, 2));

  if (user) {
    const staff = await Staff.findOne({ userId: user._id });
    console.log('--- STAFF ---');
    console.log(JSON.stringify(staff, null, 2));

    const receptionist = await Receptionist.findOne({ userId: user._id });
    console.log('--- RECEPTIONIST ---');
    console.log(JSON.stringify(receptionist, null, 2));
  }

  await mongoose.disconnect();
}

test().catch(console.error);
