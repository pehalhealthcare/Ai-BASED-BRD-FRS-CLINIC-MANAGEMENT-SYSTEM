const { connectDB, disconnectDB } = require('../config/database');
const GlobalLabTest = require('../modules/healthcare-catalog/globalLabTest.model');

async function runMigration() {
  console.log('Connecting to database...');
  await connectDB();
  console.log('Connected. Starting migration...');

  const result = await GlobalLabTest.updateMany(
    {
      $or: [
        { investigationType: { $exists: false } },
        { version: { $exists: false } }
      ]
    },
    {
      $set: {
        investigationType: 'ATOMIC_TEST',
        version: 1
      }
    }
  );

  console.log(`Migration completed successfully! Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
  await disconnectDB();
  console.log('Disconnected from DB.');
}

if (require.main === module) {
  runMigration().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}

module.exports = runMigration;
