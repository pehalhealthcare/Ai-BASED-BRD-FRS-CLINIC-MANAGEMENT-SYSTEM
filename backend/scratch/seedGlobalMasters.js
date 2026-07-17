const mongoose = require('mongoose');

const MedicineMaster = require('../src/modules/pharmacy/medicineMaster.model');
const BrandMaster = require('../src/modules/pharmacy/brandMaster.model');
const ClinicPharmacyInventory = require('../src/modules/pharmacy/clinicPharmacyInventory.model');
const MedicineBatch = require('../src/modules/pharmacy/medicineBatch.model');
const LabTestMaster = require('../src/modules/labs/labTestMaster.model');
const ClinicLabCatalog = require('../src/modules/labs/clinicLabCatalog.model');

// Load legacy models
const LegacyMedicine = require('../src/modules/pharmacy/medicine.model');
const LegacyLabTest = require('../src/modules/labs/labTest.model');

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function run() {
  const uri = 'mongodb+srv://Kaishav:Kaishav123@cms.mbzaovj.mongodb.net/ai-cms?retryWrites=true&w=majority';
  await mongoose.connect(uri);
  console.log('Connected to Database');

  try {
    // 1. Seed Medicine Masters
    console.log('Seeding Medicine Masters...');
    const genericDrugs = [
      { genericName: 'Paracetamol', drugCategory: 'Analgesics', drugClass: 'NSAIDs', strengths: ['500mg', '650mg'], dosageForms: ['Tablet', 'Syrup'] },
      { genericName: 'Ibuprofen', drugCategory: 'Analgesics', drugClass: 'NSAIDs', strengths: ['200mg', '400mg'], dosageForms: ['Tablet'] },
      { genericName: 'Amoxicillin', drugCategory: 'Anti-Infectives', drugClass: 'Penicillins', strengths: ['250mg', '500mg'], dosageForms: ['Capsule', 'Suspension'] },
      { genericName: 'Metformin', drugCategory: 'Antidiabetic Agents', drugClass: 'Biguanides', strengths: ['500mg', '850mg', '1000mg'], dosageForms: ['Tablet'] },
      { genericName: 'Pantoprazole', drugCategory: 'Gastrointestinal Agents', drugClass: 'Proton Pump Inhibitors', strengths: ['20mg', '40mg'], dosageForms: ['Tablet', 'Injection'] }
    ];

    for (const d of genericDrugs) {
      await MedicineMaster.findOneAndUpdate(
        { genericName: d.genericName },
        { $setOnInsert: d },
        { upsert: true }
      );
    }
    console.log('Medicine Masters seeded.');

    // Get mapped IDs
    const paracetamol = await MedicineMaster.findOne({ genericName: 'Paracetamol' });
    const amoxicillin = await MedicineMaster.findOne({ genericName: 'Amoxicillin' });

    // 2. Seed Brands
    console.log('Seeding Brands...');
    const brands = [
      { brandName: 'Dolo 650', manufacturer: 'Micro Labs Ltd', genericMedicineId: paracetamol._id, availableStrengths: ['650mg'], dosageForm: 'Tablet' },
      { brandName: 'Crocin 650', manufacturer: 'GlaxoSmithKline', genericMedicineId: paracetamol._id, availableStrengths: ['650mg'], dosageForm: 'Tablet' },
      { brandName: 'Calpol 650', manufacturer: 'GlaxoSmithKline', genericMedicineId: paracetamol._id, availableStrengths: ['650mg'], dosageForm: 'Tablet' },
      { brandName: 'Mox 500', manufacturer: 'Sun Pharmaceutical Industries', genericMedicineId: amoxicillin._id, availableStrengths: ['500mg'], dosageForm: 'Capsule' }
    ];

    for (const b of brands) {
      await BrandMaster.findOneAndUpdate(
        { brandName: b.brandName },
        { $setOnInsert: b },
        { upsert: true }
      );
    }
    console.log('Brands seeded.');

    // 3. Seed Lab Test Masters
    console.log('Seeding Lab Test Masters...');
    const labTests = [
      { name: 'CBC', category: 'Hematology', department: 'Pathology', sampleType: 'Whole Blood', normalRange: { text: 'Varies by parameter' } },
      { name: 'LFT', category: 'Biochemistry', department: 'Pathology', sampleType: 'Serum', normalRange: { text: 'Varies by parameter' } },
      { name: 'KFT', category: 'Biochemistry', department: 'Pathology', sampleType: 'Serum', normalRange: { text: 'Varies by parameter' } },
      { name: 'HbA1c', category: 'Diabetology', department: 'Pathology', sampleType: 'Whole Blood', normalRange: { min: 4, max: 5.6, unit: '%', text: 'Normal: 4 - 5.6%' } },
      { name: 'Lipid Profile', category: 'Cardiology', department: 'Pathology', sampleType: 'Serum', normalRange: { text: 'Varies by parameter' } }
    ];

    for (const t of labTests) {
      await LabTestMaster.findOneAndUpdate(
        { name: t.name },
        { $setOnInsert: t },
        { upsert: true }
      );
    }
    console.log('Lab Test Masters seeded.');

    // 4. Migrate Legacy Medicines
    console.log('Migrating legacy medicines...');
    const legacyMeds = await LegacyMedicine.find();
    console.log(`Found ${legacyMeds.length} legacy medicines. Migrating...`);

    for (const med of legacyMeds) {
      // 1. Find or create master generic
      const genericName = med.genericName || med.name || 'Unknown Generic';
      let masterGen = await MedicineMaster.findOne({ genericName: { $regex: new RegExp(`^${escapeRegExp(genericName)}$`, 'i') } });
      if (!masterGen) {
        masterGen = await MedicineMaster.create({
          genericName,
          drugCategory: med.category || 'General',
          strengths: [med.strength || '500mg'],
          dosageForms: [med.form || 'Tablet']
        });
      }

      // 2. Find or create Brand
      const brandName = med.brandName || med.name || 'General Brand';
      let brand = await BrandMaster.findOne({ brandName: { $regex: new RegExp(`^${escapeRegExp(brandName)}$`, 'i') } });
      if (!brand) {
        brand = await BrandMaster.create({
          brandName,
          manufacturer: med.manufacturer || 'Unknown',
          genericMedicineId: masterGen._id,
          availableStrengths: [med.strength || '500mg'],
          dosageForm: med.form || 'Tablet'
        });
      }

      // 3. Create Clinic Inventory entry
      let inv = await ClinicPharmacyInventory.findOne({ clinicId: med.clinicId, brandId: brand._id });
      if (!inv) {
        inv = await ClinicPharmacyInventory.create({
          clinicId: med.clinicId,
          brandId: brand._id,
          distributor: 'Legacy Migrated',
          purchasePrice: med.unitPrice || 0,
          sellingPrice: med.unitPrice || 0,
          minimumStock: med.reorderLevel || 10,
          reorderLevel: med.reorderLevel || 10,
          isActive: med.isActive
        });
      }

      // 4. Create Batches
      if (med.batches && med.batches.length > 0) {
        for (const b of med.batches) {
          const exists = await MedicineBatch.findOne({ inventoryId: inv._id, batchNumber: b.batchNumber });
          if (!exists) {
            await MedicineBatch.create({
              inventoryId: inv._id,
              batchNumber: b.batchNumber || 'MIGRATED',
              expiryDate: b.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
              purchaseQuantity: b.quantity || 0,
              availableStock: b.quantity || 0,
              purchasePrice: b.purchasePrice || 0,
              sellingPrice: b.sellingPrice || 0
            });
          }
        }
      }
    }
    console.log('Legacy medicines migration complete.');

    // 5. Migrate Legacy Lab Tests
    console.log('Migrating legacy lab tests...');
    const legacyLabs = await LegacyLabTest.find();
    console.log(`Found ${legacyLabs.length} legacy lab tests. Migrating...`);

    for (const test of legacyLabs) {
      let masterTest = await LabTestMaster.findOne({ name: { $regex: new RegExp(`^${escapeRegExp(test.name)}$`, 'i') } });
      if (!masterTest) {
        masterTest = await LabTestMaster.create({
          name: test.name,
          category: test.category || 'General',
          sampleType: test.specimenType || 'Blood',
          normalRange: { text: test.normalRange?.text || '' }
        });
      }

      const exists = await ClinicLabCatalog.findOne({ clinicId: test.clinicId, labTestMasterId: masterTest._id });
      if (!exists) {
        await ClinicLabCatalog.create({
          clinicId: test.clinicId,
          labTestMasterId: masterTest._id,
          testPrice: test.price || 0,
          isActive: test.isActive
        });
      }
    }
    console.log('Legacy lab tests migration complete.');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Database disconnected');
  }
}

run();
