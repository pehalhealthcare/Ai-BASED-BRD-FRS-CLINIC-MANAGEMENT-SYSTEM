const mongoose = require('mongoose');
const { env } = require('../config/env');
const User = require('../modules/users/user.model');

async function list() {
  await mongoose.connect(env.mongodbUri || 'mongodb://localhost:27017/office-clinic-management');
  try {
    const users = await User.find({}).limit(10);
    console.log('Users in DB:');
    users.forEach(u => console.log(`- ${u.email} (${u.role}) clinicId: ${u.clinicId}`));
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

list();
