const { connectDB } = require('../src/config/database');
const User = require('../src/modules/users/user.model');
const Medicine = require('../src/modules/pharmacy/medicine.model');
const Provider = require('../src/modules/providers/provider.model');
require('../src/config/env');

connectDB().then(async () => {
  console.log('Connected to DB');
  
  // 1. Find all Providers (pharmacies/labs)
  const providers = await Provider.find({});
  console.log(`Found ${providers.length} providers:`);
  providers.forEach(p => {
    console.log({ id: p._id, name: p.name, type: p.type, clinicId: p.clinicId });
  });

  // 2. Find Users for Ram Krishna Pharmacy
  const rkp = providers.find(p => p.name.includes('Ram Krishna'));
  if (rkp) {
    console.log('\nRam Krishna Pharmacy details:', rkp);
    const users = await User.find({ providerId: rkp._id });
    console.log(`Found ${users.length} users associated with this pharmacy:`);
    users.forEach(u => {
      console.log({ id: u._id, name: u.name, email: u.email, role: u.role, providerId: u.providerId });
    });
  }

  // 3. Find all Medicines in DB
  const medicines = await Medicine.find({});
  console.log(`\nFound ${medicines.length} medicines in total:`);
  medicines.forEach(m => {
    console.log({
      id: m._id,
      name: m.name,
      clinicId: m.clinicId,
      createdBy: m.createdBy,
      isActive: m.isActive
    });
  });

  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
