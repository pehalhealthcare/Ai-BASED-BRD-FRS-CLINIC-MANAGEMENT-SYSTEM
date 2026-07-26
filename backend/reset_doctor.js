const { connectDB } = require('./src/config/database');
const Doctor = require('./src/modules/doctors/doctor.model');
const User = require('./src/modules/users/user.model');
const mongoose = require('mongoose');
require('./src/config/env');

connectDB().then(async () => {
  const user = await User.findOne({ email: 's01uhksf1b@bltiwd.com' });
  if (user) {
    user.approvalStatus = 'pending_approval';
    await user.save();
    console.log('User approvalStatus updated to pending_approval');
  } else {
    console.log('User not found');
  }
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
