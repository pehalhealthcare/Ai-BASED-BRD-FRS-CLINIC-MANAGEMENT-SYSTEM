const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../src/config/database');
const User = require('../src/modules/users/user.model');
const AuditLog = require('../src/modules/audit/audit.model');

async function run() {
  try {
    await connectDB();
    console.log('Connected to DB');

    // Search all collections for superadmin / super.admin
    const collections = await mongoose.connection.db.listCollections().toArray();
    for (const col of collections) {
      const colName = col.name;
      const results = await mongoose.connection.db.collection(colName).find({
        $or: [
          { email: { $regex: 'super.*admin.*test', $options: 'i' } },
          { 'metadata.email': { $regex: 'super.*admin.*test', $options: 'i' } }
        ]
      }).toArray();
      if (results.length > 0) {
        console.log(`Found in collection ${colName}:`, results.length, 'records');
      }
    }

    // Find the user
    const targetEmail = 'pehalhealthcare@gmail.com';
    const userToUpdate = await User.findOne({
      $or: [
        { email: 'superadmin@test.com' },
        { email: 'super.admin@test.com' },
        { email: { $regex: '^super\\.?admin@test\\.com$', $options: 'i' } }
      ]
    });

    if (userToUpdate) {
      console.log('Found super admin user to update:', {
        id: userToUpdate._id,
        name: userToUpdate.name,
        currentEmail: userToUpdate.email,
        role: userToUpdate.role
      });

      userToUpdate.email = targetEmail;
      await userToUpdate.save();
      console.log(`Successfully updated User ${userToUpdate._id} email to ${targetEmail}`);
    } else {
      console.log('No user matched superadmin@test.com / super.admin@test.com');
    }

    // Verify
    const updatedUser = await User.findOne({ email: targetEmail });
    console.log('Verification check for', targetEmail, ':', updatedUser ? {
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      isActive: updatedUser.isActive
    } : 'NOT FOUND');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
}

run();
