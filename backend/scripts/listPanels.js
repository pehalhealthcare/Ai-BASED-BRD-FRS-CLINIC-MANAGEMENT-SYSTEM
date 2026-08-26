/**
 * Script: list panels/profiles currently in global_lab_tests
 */
const path = require('path');
require('../src/config/env');
const { connectDB } = require('../src/config/database');
const mongoose = require('mongoose');

async function run() {
  await connectDB();
  const db = mongoose.connection.db;
  const col = db.collection('global_lab_tests');

  const items = await col.find({ investigationType: { $in: ['PANEL', 'PROFILE'] } }).toArray();
  console.log(`Found ${items.length} panels/profiles:`);
  for (const item of items) {
    const mappingsCol = db.collection('investigation_parameters');
    const mappingCount = await mappingsCol.countDocuments({ investigationId: item._id });
    console.log(`- [${item.investigationType}] ${item.name} (${item.globalId}), mappingCount: ${mappingCount}, source: ${item.source}, createdAt: ${item.createdAt}`);
  }

  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
