const mongoose = require('mongoose');
const { env } = require('../src/config/env');

const mongoUri = env.mongoMode === 'atlas' ? env.mongoUriAtlas : (env.mongoMode === 'local' ? env.mongoUriLocal : env.mongoUri);

async function inspectClinic() {
  await mongoose.connect(mongoUri);

  require('../src/modules/users/user.model');
  require('../src/modules/clinics/clinic.model');

  const User = mongoose.model('User');
  const Clinic = mongoose.model('Clinic');

  const user = await User.findOne({ email: 'jewag12274@ittiv.com' }).lean();
  console.log('User Document:', user);

  if (user && user.clinicId) {
    const clinic = await Clinic.findById(user.clinicId).lean();
    console.log('Clinic Document:', clinic);
  }

  await mongoose.disconnect();
}

inspectClinic();
