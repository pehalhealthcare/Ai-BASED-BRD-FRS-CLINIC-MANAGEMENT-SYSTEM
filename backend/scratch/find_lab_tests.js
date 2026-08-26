const { connectDB } = require('../src/config/database');
const User = require('../src/modules/users/user.model');
const LabTest = require('../src/modules/labs/labTest.model');
const mongoose = require('mongoose');
require('../src/config/env');

connectDB().then(async () => {
  const user = await User.findOne({ email: 'ay5sf@web-library.net' });
  if (!user) {
    console.log('User ay5sf@web-library.net not found');
    process.exit(0);
  }

  console.log('Found user:', {
    id: user._id,
    name: user.name,
    role: user.role,
    providerId: user.providerId,
    clinicId: user.clinicId
  });

  const providerId = user.providerId;
  if (!providerId) {
    console.log('User has no providerId');
    process.exit(0);
  }

  const tests = await LabTest.find({ laboratoryId: providerId });
  console.log(`Found ${tests.length} tests for laboratoryId ${providerId}:`);
  tests.forEach(t => {
    console.log(` - ${t.name} (Code: ${t.code}, ID: ${t._id})`);
  });

  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
