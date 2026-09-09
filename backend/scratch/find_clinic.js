const mongoose = require('mongoose');
const { connectDB } = require('../src/config/database');

async function findRelated() {
  await connectDB();
  const clinicId = new mongoose.Types.ObjectId('6aa0715ba494c4f558f4c494');
  const clinicIdStr = '6aa0715ba494c4f558f4c494';
  const userId = new mongoose.Types.ObjectId('6aa0715ca494c4f558f4c496');
  const userIdStr = '6aa0715ca494c4f558f4c496';
  const email = 'bepivel476@fidhost.com';

  const allCols = await mongoose.connection.db.listCollections().toArray();
  const summary = {};

  for (let colInfo of allCols) {
    const name = colInfo.name;
    const c = mongoose.connection.db.collection(name);

    const query = {
      $or: [
        { _id: clinicId },
        { _id: userId },
        { clinicId: clinicId },
        { clinicId: clinicIdStr },
        { clinicIds: clinicId },
        { clinicIds: clinicIdStr },
        { 'clinics.clinicId': clinicId },
        { 'clinics.clinicId': clinicIdStr },
        { userId: userId },
        { userId: userIdStr },
        { adminId: userId },
        { adminId: userIdStr },
        { ownerId: userId },
        { ownerId: userIdStr },
        { createdBy: userId },
        { email: email },
        { email: { $regex: new RegExp(`^${email}$`, 'i') } }
      ]
    };

    try {
      const count = await c.countDocuments(query);
      if (count > 0) {
        const docs = await c.find(query).toArray();
        summary[name] = {
          count,
          ids: docs.map(d => d._id)
        };
      }
    } catch (e) {
      // Some collections might have different schema or index errors, ignore or log
    }
  }

  console.log('=== COLLECTIONS CONTAINING CLINIC/USER DATA ===');
  console.log(JSON.stringify(summary, null, 2));

  // Let's also inspect clinic document in detail
  const clinicDoc = await mongoose.connection.db.collection('clinics').findOne({ _id: clinicId });
  console.log('=== CLINIC DOCUMENT ===');
  console.log(JSON.stringify(clinicDoc, null, 2));

  await mongoose.disconnect();
}

findRelated().catch(err => {
  console.error(err);
  process.exit(1);
});
