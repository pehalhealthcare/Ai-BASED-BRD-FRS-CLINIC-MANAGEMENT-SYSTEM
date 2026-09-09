const mongoose = require('mongoose');
const { connectDB } = require('../src/config/database');

async function purgeClinic() {
  await connectDB();
  const clinicId = new mongoose.Types.ObjectId('6aa0715ba494c4f558f4c494');
  const clinicIdStr = '6aa0715ba494c4f558f4c494';
  const userId = new mongoose.Types.ObjectId('6aa0715ca494c4f558f4c496');
  const userIdStr = '6aa0715ca494c4f558f4c496';
  const email = 'bepivel476@fidhost.com';

  console.log(`Starting deletion for clinic: ${clinicIdStr} and user email: ${email}`);

  const collections = await mongoose.connection.db.listCollections().toArray();
  const deletionSummary = [];

  for (const colInfo of collections) {
    const name = colInfo.name;
    const c = mongoose.connection.db.collection(name);

    // Build comprehensive match filter
    const filter = {
      $or: [
        { _id: clinicId },
        { _id: userId },
        { clinicId: clinicId },
        { clinicId: clinicIdStr },
        { clinicIds: clinicId },
        { clinicIds: clinicIdStr },
        { 'clinics.clinicId': clinicId },
        { 'clinics.clinicId': clinicIdStr },
        { 'ownerDetails.email': { $regex: new RegExp(`^${email}$`, 'i') } },
        { userId: userId },
        { userId: userIdStr },
        { adminId: userId },
        { adminId: userIdStr },
        { ownerId: userId },
        { ownerId: userIdStr },
        { createdBy: userId },
        { createdBy: userIdStr },
        { email: { $regex: new RegExp(`^${email}$`, 'i') } },
        { clinicEmail: { $regex: new RegExp(`^${email}$`, 'i') } },
        { adminEmail: { $regex: new RegExp(`^${email}$`, 'i') } },
        { recipient: { $regex: new RegExp(`^${email}$`, 'i') } },
        { 'contactInfo.email': { $regex: new RegExp(`^${email}$`, 'i') } },
        { 'contact.email': { $regex: new RegExp(`^${email}$`, 'i') } }
      ]
    };

    try {
      const count = await c.countDocuments(filter);
      if (count > 0) {
        const deleteRes = await c.deleteMany(filter);
        deletionSummary.push({
          collection: name,
          deletedCount: deleteRes.deletedCount
        });
        console.log(`Deleted ${deleteRes.deletedCount} document(s) from "${name}".`);
      }
    } catch (err) {
      console.warn(`Error querying collection ${name}:`, err.message);
    }
  }

  // Also check if any other collection has references inside nested arrays or objects
  console.log('\n--- Deletion Summary ---');
  console.log(JSON.stringify(deletionSummary, null, 2));

  // Verification step
  console.log('\n--- Verification: Checking for any remaining traces ---');
  let remainingCount = 0;
  for (const colInfo of collections) {
    const name = colInfo.name;
    const c = mongoose.connection.db.collection(name);
    try {
      const cnt = await c.countDocuments({
        $or: [
          { _id: clinicId },
          { _id: userId },
          { clinicId: clinicId },
          { clinicId: clinicIdStr },
          { email: { $regex: new RegExp(`^${email}$`, 'i') } }
        ]
      });
      if (cnt > 0) {
        console.log(`WARNING: Collection ${name} still has ${cnt} document(s)!`);
        remainingCount += cnt;
      }
    } catch (err) {}
  }

  if (remainingCount === 0) {
    console.log('Verification SUCCESS: No records remain for this clinic or email.');
  } else {
    console.log(`Verification FAILED: ${remainingCount} records still present.`);
  }

  await mongoose.disconnect();
}

purgeClinic().catch(err => {
  console.error('Purge error:', err);
  process.exit(1);
});
