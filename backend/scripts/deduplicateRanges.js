/**
 * One-shot script: remove duplicate referenceRanges from all GlobalParameter documents.
 * Run from backend/: node scripts/deduplicateRanges.js
 */
const path = require('path');
// Load the app's env config (handles MONGO_MODE, ATLAS vs local, etc.)
require('../src/config/env');
const { connectDB } = require('../src/config/database');
const mongoose = require('mongoose');

async function run() {
  await connectDB();
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  const col = db.collection('global_parameters');

  const docs = await col.find({}).toArray();
  let fixedCount = 0;

  for (const doc of docs) {
    const ranges = doc.referenceRanges || [];
    const seen = new Map();
    for (const r of ranges) {
      const key = [
        r.gender,
        r.ageFrom ?? '',
        r.ageTo ?? '',
        r.ageUnit ?? '',
        String(r.conditionId ?? ''),
        r.fromValue,
        r.toValue,
        String(r.unitId ?? '')
      ].join('|');
      seen.set(key, r);
    }
    const deduped = Array.from(seen.values());
    if (deduped.length !== ranges.length) {
      await col.updateOne(
        { _id: doc._id },
        { $set: { referenceRanges: deduped } }
      );
      console.log(`Fixed "${doc.name}": ${ranges.length} → ${deduped.length} ranges`);
      fixedCount++;
    }
  }

  console.log(`Done. ${fixedCount} parameter(s) deduplicated.`);
  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

