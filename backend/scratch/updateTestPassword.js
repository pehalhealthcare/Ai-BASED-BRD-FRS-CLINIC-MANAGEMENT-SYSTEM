const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { connectDB } = require('../src/config/database');
const User = require('../src/modules/users/user.model');

async function run() {
  await connectDB();
  const hashedPassword = await bcrypt.hash('Password123!', 10);
  const result = await User.updateOne(
    { email: 'wojerep430@bejum.com' },
    { $set: { password: hashedPassword } }
  );
  console.log('Password updated successfully:', result);
  await mongoose.disconnect();
}

run().catch(console.error);
