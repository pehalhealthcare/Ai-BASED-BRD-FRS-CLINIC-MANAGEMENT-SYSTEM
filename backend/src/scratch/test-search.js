/**
 * End-to-end test: simulates the exact scenario the doctor hits at /api/v1/pharmacy/search-all
 * when their JWT token was issued WITHOUT clinicId embedded (the old token case).
 */
const mongoose = require('mongoose');
const MONGO_URI = 'mongodb+srv://Kaishav:Kaishav123@cms.mbzaovj.mongodb.net/ai-cms?retryWrites=true&w=majority';

async function test() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to DB');

  try {
    const pharmacyService = require('../modules/pharmacy/pharmacy.service');

    // Simulate req.user when clinicId is MISSING from JWT (the failing case)
    const requesterWithoutClinicId = {
      _id: new mongoose.Types.ObjectId('6a51410e234bc22d2ab00ac0'),
      role: 'DOCTOR',
      clinicId: undefined  // <-- this is the failure scenario
    };

    console.log('\n=== Test 1: requester WITHOUT clinicId in JWT ===');
    const result1 = await pharmacyService.searchAllMedicines({
      requester: requesterWithoutClinicId,
      search: 'para',
      clinicId: null
    });
    console.log('✅ Search succeeded!');
    console.log(`  generics: ${result1.generics.length}, brands: ${result1.brands.length}, clinicInventory: ${result1.clinicInventory.length}`);

    // Simulate req.user when clinicId IS in JWT (the normal case)
    const requesterWithClinicId = {
      _id: new mongoose.Types.ObjectId('6a51410e234bc22d2ab00ac0'),
      role: 'DOCTOR',
      clinicId: new mongoose.Types.ObjectId('6a47e2003deae544f434752e')
    };

    console.log('\n=== Test 2: requester WITH clinicId in JWT ===');
    const result2 = await pharmacyService.searchAllMedicines({
      requester: requesterWithClinicId,
      search: 'para',
      clinicId: null
    });
    console.log('✅ Search succeeded!');
    console.log(`  generics: ${result2.generics.length}, brands: ${result2.brands.length}, clinicInventory: ${result2.clinicInventory.length}`);

  } catch (err) {
    console.error('❌ Test FAILED:', err.message);
    console.error(err.stack);
  } finally {
    await mongoose.disconnect();
  }
}

test();
