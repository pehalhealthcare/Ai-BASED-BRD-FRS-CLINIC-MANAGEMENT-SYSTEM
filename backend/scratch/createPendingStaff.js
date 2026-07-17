const mongoose = require('mongoose');
const User = require('../src/modules/users/user.model');
const Clinic = require('../src/modules/clinics/clinic.model');
const { createStaffByAdmin } = require('../src/modules/users/user.service');

async function run() {
  const uri = 'mongodb+srv://Kaishav:Kaishav123@cms.mbzaovj.mongodb.net/ai-cms?retryWrites=true&w=majority';
  await mongoose.connect(uri);
  console.log('Connected to Atlas DB');

  try {
    const adminUser = await User.findOne({ role: 'ADMIN' });
    if (!adminUser) {
      console.log('No ADMIN user found to act as requester');
      return;
    }

    console.log(`Using admin: ${adminUser.email} (clinicId: ${adminUser.clinicId})`);

    // Delete existing test user if any
    await User.deleteOne({ email: 'anita@test.com' });
    const Staff = require('../src/modules/staff/staff.model');
    await Staff.deleteOne({ email: 'anita@test.com' });

    const newUser = await createStaffByAdmin({
      name: 'Nurse Anita',
      email: 'anita@test.com',
      phone: '9999999999',
      password: '9999999999', // Phone as temp password
      role: 'NURSE',
      requester: adminUser,
      requestedClinicId: adminUser.clinicId
    });

    console.log('Successfully seeded pending staff user:', newUser);
  } catch (err) {
    console.error('Error seeding staff:', err);
  } finally {
    await mongoose.disconnect();
  }
}

run().catch(console.error);
