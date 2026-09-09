const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { connectDB, disconnectDB } = require('../src/config/database');
const User = require('../src/modules/users/user.model');
const Clinic = require('../src/modules/clinics/clinic.model');

async function listAllExpiredClinics() {
  await connectDB();

  // Find all clinics where subscription status is Expired or expiryDate < now
  const now = new Date();
  const clinics = await Clinic.find({});
  
  console.log(`Total clinics in DB: ${clinics.length}`);
  
  for (const c of clinics) {
    const adminUser = await User.findOne({ clinicId: c._id, role: 'ADMIN' });
    const isExpired = c.subscription?.status === 'Expired' || (c.subscription?.expiryDate && new Date(c.subscription.expiryDate) < now);
    
    console.log({
      clinicId: c._id.toString(),
      name: c.name,
      code: c.code,
      approvalStatus: c.approvalStatus,
      paymentStatus: c.paymentStatus,
      subscriptionStatus: c.subscription?.status,
      expiryDate: c.subscription?.expiryDate,
      isExpired: isExpired,
      adminEmail: adminUser?.email,
      adminName: adminUser?.name,
      adminActive: adminUser?.isActive
    });
  }

  // Also list all users in DB with email containing 'swaroop' or 'ms' or 'gmail'
  const gmailUsers = await User.find({ email: /gmail\.com/i });
  console.log('\nAll Gmail users in DB:');
  console.table(gmailUsers.map(u => ({
    id: u._id.toString(),
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    clinicId: u.clinicId?.toString()
  })));

  await disconnectDB();
}

listAllExpiredClinics().catch(err => {
  console.error(err);
  process.exit(1);
});
