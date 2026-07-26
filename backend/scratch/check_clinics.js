const { connectDB } = require('../src/config/database');
const Clinic = require('../src/modules/clinics/clinic.model');
require('../src/config/env');

connectDB().then(async () => {
  console.log('Connected to DB');
  const clinics = await Clinic.find({});
  console.log(`Found ${clinics.length} clinics:`);
  clinics.forEach(c => {
    console.log({ id: c._id, name: c.name });
  });
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
