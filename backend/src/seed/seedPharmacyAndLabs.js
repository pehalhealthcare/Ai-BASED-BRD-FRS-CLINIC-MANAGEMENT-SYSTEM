const { connectDB, disconnectDB } = require('../config/database');
const Medicine = require('../modules/pharmacy/medicine.model');
const LabTest = require('../modules/labs/labTest.model');
const Clinic = require('../modules/clinics/clinic.model');
const { logger } = require('../common/utils/logger');

const CLINIC_1_ID = '6a3066611195900df6c85177'; // Appolo Hospital Indirapuram
const CLINIC_2_ID = '6a319eb54207f5b8b99c0873'; // Apolo Healthcare Headquarters

// 100 realistic medicines data
const MEDICINE_TEMPLATES = [
  { name: 'Paracetamol', genericName: 'Acetaminophen', category: 'Pain Relief', form: 'Tablet', strength: '500mg', manufacturer: 'GSK', price: 15 },
  { name: 'Ibuprofen', genericName: 'Ibuprofen', category: 'Pain Relief', form: 'Tablet', strength: '400mg', manufacturer: 'Abbott', price: 25 },
  { name: 'Amoxicillin', genericName: 'Amoxicillin', category: 'Antibiotics', form: 'Capsule', strength: '500mg', manufacturer: 'Sandoz', price: 80 },
  { name: 'Metformin', genericName: 'Metformin Hydrochloride', category: 'Diabetes Care', form: 'Tablet', strength: '850mg', manufacturer: 'Merck', price: 40 },
  { name: 'Atorvastatin', genericName: 'Atorvastatin Calcium', category: 'Vitamins & Supplements', form: 'Tablet', strength: '20mg', manufacturer: 'Pfizer', price: 120 },
  { name: 'Amlodipine', genericName: 'Amlodipine Besylate', category: 'Heart Care', form: 'Tablet', strength: '5mg', manufacturer: 'Cipla', price: 30 },
  { name: 'Lisinopril', genericName: 'Lisinopril', category: 'Heart Care', form: 'Tablet', strength: '10mg', manufacturer: 'Lupin', price: 45 },
  { name: 'Levothyroxine', genericName: 'Levothyroxine Sodium', category: 'Thyroid Care', form: 'Tablet', strength: '100mcg', manufacturer: 'AbbVie', price: 65 },
  { name: 'Omeprazole', genericName: 'Omeprazole', category: 'Stomach Care', form: 'Capsule', strength: '20mg', manufacturer: 'AstraZeneca', price: 50 },
  { name: 'Cetirizine', genericName: 'Cetirizine Hydrochloride', category: 'Cold & Cough', form: 'Tablet', strength: '10mg', manufacturer: 'Alkem', price: 18 },
  { name: 'Azithromycin', genericName: 'Azithromycin', category: 'Antibiotics', form: 'Tablet', strength: '500mg', manufacturer: 'Pfizer', price: 110 },
  { name: 'Losartan', genericName: 'Losartan Potassium', category: 'Heart Care', form: 'Tablet', strength: '50mg', manufacturer: 'Sun Pharma', price: 55 },
  { name: 'Albuterol', genericName: 'Albuterol Sulfate', category: 'Asthma Care', form: 'Inhaler', strength: '90mcg', manufacturer: 'GlaxoSmithKline', price: 320 },
  { name: 'Pantoprazole', genericName: 'Pantoprazole Sodium', category: 'Stomach Care', form: 'Tablet', strength: '40mg', manufacturer: 'Takeda', price: 60 },
  { name: 'Montelukast', genericName: 'Montelukast Sodium', category: 'Asthma Care', form: 'Tablet', strength: '10mg', manufacturer: 'Organon', price: 85 },
  { name: 'Escitalopram', genericName: 'Escitalopram Oxalate', category: 'Mental Health', form: 'Tablet', strength: '10mg', manufacturer: 'Lundbeck', price: 90 },
  { name: 'Sertraline', genericName: 'Sertraline Hydrochloride', category: 'Mental Health', form: 'Tablet', strength: '50mg', manufacturer: 'Viatris', price: 95 },
  { name: 'Rosuvastatin', genericName: 'Rosuvastatin Calcium', category: 'Vitamins & Supplements', form: 'Tablet', strength: '10mg', manufacturer: 'AstraZeneca', price: 140 },
  { name: 'Spironolactone', genericName: 'Spironolactone', category: 'Heart Care', form: 'Tablet', strength: '25mg', manufacturer: 'Pfizer', price: 48 },
  { name: 'Furosemide', genericName: 'Furosemide', category: 'Heart Care', form: 'Tablet', strength: '40mg', manufacturer: 'Sanofi', price: 20 },
  { name: 'Prednisone', genericName: 'Prednisone', category: 'Pain Relief', form: 'Tablet', strength: '10mg', manufacturer: 'West-Ward', price: 35 },
  { name: 'Gabapentin', genericName: 'Gabapentin', category: 'Pain Relief', form: 'Capsule', strength: '300mg', manufacturer: 'Glenmark', price: 130 },
  { name: 'Amoxicillin-Clavulanate', genericName: 'Amoxicillin Pot Clavulanate', category: 'Antibiotics', form: 'Tablet', strength: '625mg', manufacturer: 'GlaxoSmithKline', price: 180 },
  { name: 'Ciprofloxacin', genericName: 'Ciprofloxacin Hydrochloride', category: 'Antibiotics', form: 'Tablet', strength: '500mg', manufacturer: 'Bayer', price: 75 },
  { name: 'Meloxicam', genericName: 'Meloxicam', category: 'Pain Relief', form: 'Tablet', strength: '15mg', manufacturer: 'Boehringer Ingelheim', price: 42 },
  { name: 'Tramadol', genericName: 'Tramadol Hydrochloride', category: 'Pain Relief', form: 'Tablet', strength: '50mg', manufacturer: 'Grunenthal', price: 90 },
  { name: 'Duloxetine', genericName: 'Duloxetine Hydrochloride', category: 'Mental Health', form: 'Capsule', strength: '30mg', manufacturer: 'Eli Lilly', price: 115 },
  { name: 'Venlafaxine', genericName: 'Venlafaxine Hydrochloride', category: 'Mental Health', form: 'Capsule', strength: '75mg', manufacturer: 'Wyeth', price: 125 },
  { name: 'Carvedilol', genericName: 'Carvedilol', category: 'Heart Care', form: 'Tablet', strength: '6.25mg', manufacturer: 'Roche', price: 38 },
  { name: 'Tamsulosin', genericName: 'Tamsulosin Hydrochloride', category: 'Prostate Care', form: 'Capsule', strength: '0.4mg', manufacturer: 'Boehringer Ingelheim', price: 160 },
  { name: 'Trazodone', genericName: 'Trazodone Hydrochloride', category: 'Mental Health', form: 'Tablet', strength: '50mg', manufacturer: 'Angelini', price: 50 },
  { name: 'Ranitidine', genericName: 'Ranitidine Hydrochloride', category: 'Stomach Care', form: 'Tablet', strength: '150mg', manufacturer: 'GlaxoSmithKline', price: 22 },
  { name: 'Famotidine', genericName: 'Famotidine', category: 'Stomach Care', form: 'Tablet', strength: '20mg', manufacturer: 'Johnson & Johnson', price: 28 },
  { name: 'Doxycycline', genericName: 'Doxycycline Hyclate', category: 'Antibiotics', form: 'Capsule', strength: '100mg', manufacturer: 'Pfizer', price: 70 },
  { name: 'Clindamycin', genericName: 'Clindamycin Hydrochloride', category: 'Antibiotics', form: 'Capsule', strength: '300mg', manufacturer: 'Pfizer', price: 145 },
  { name: 'Glipizide', genericName: 'Glipizide', category: 'Diabetes Care', form: 'Tablet', strength: '5mg', manufacturer: 'Pfizer', price: 32 },
  { name: 'Gliclazide', genericName: 'Gliclazide', category: 'Diabetes Care', form: 'Tablet', strength: '60mg', manufacturer: 'Servier', price: 46 },
  { name: 'Pioglitazone', genericName: 'Pioglitazone', category: 'Diabetes Care', form: 'Tablet', strength: '15mg', manufacturer: 'Takeda', price: 52 },
  { name: 'Sitagliptin', genericName: 'Sitagliptin Phosphate', category: 'Diabetes Care', form: 'Tablet', strength: '100mg', manufacturer: 'MSD', price: 280 },
  { name: 'Empagliflozin', genericName: 'Empagliflozin', category: 'Diabetes Care', form: 'Tablet', strength: '10mg', manufacturer: 'Boehringer Ingelheim', price: 340 },
  { name: 'Vitamin D3', genericName: 'Cholecalciferol', category: 'Vitamins & Supplements', form: 'Capsule', strength: '60000 IU', manufacturer: 'Cadila', price: 90 },
  { name: 'Vitamin B12', genericName: 'Methylcobalamin', category: 'Vitamins & Supplements', form: 'Tablet', strength: '1500 mcg', manufacturer: 'Wockhardt', price: 75 },
  { name: 'Calcium + D3', genericName: 'Calcium Carbonate + Cholecalciferol', category: 'Vitamins & Supplements', form: 'Tablet', strength: '500mg/250 IU', manufacturer: 'Torrent', price: 60 },
  { name: 'Iron Supplement', genericName: 'Ferrous Ascorbate + Folic Acid', category: 'Vitamins & Supplements', form: 'Tablet', strength: '100mg/1.5mg', manufacturer: 'Emcure', price: 110 },
  { name: 'Zinc Multivitamin', genericName: 'Multivitamins + Minerals + Zinc', category: 'Vitamins & Supplements', form: 'Tablet', strength: 'Standard', manufacturer: 'Apex', price: 95 },
  { name: 'Hydrochlorothiazide', genericName: 'Hydrochlorothiazide', category: 'Heart Care', form: 'Tablet', strength: '12.5mg', manufacturer: 'Sandoz', price: 18 },
  { name: 'Clopidogrel', genericName: 'Clopidogrel Bisulfate', category: 'Heart Care', form: 'Tablet', strength: '75mg', manufacturer: 'Sanofi', price: 85 },
  { name: 'Aspirin Cardio', genericName: 'Acetylsalicylic Acid', category: 'Heart Care', form: 'Tablet', strength: '75mg', manufacturer: 'Bayer', price: 12 },
  { name: 'Spasmonil', genericName: 'Dicyclomine Hydrochloride', category: 'Pain Relief', form: 'Tablet', strength: '20mg', manufacturer: 'Cipla', price: 22 },
  { name: 'Loperamide', genericName: 'Loperamide Hydrochloride', category: 'Stomach Care', form: 'Capsule', strength: '2mg', manufacturer: 'Janssen', price: 15 }
];

// Let's dynamically duplicate and vary these 50 templates to make 100 distinct medicine definitions
const allMedicinesData = [];
for (let i = 0; i < 100; i++) {
  const base = MEDICINE_TEMPLATES[i % MEDICINE_TEMPLATES.length];
  const nameSuffix = i >= 50 ? ' Extra' : '';
  const code = `MED${String(i + 1).padStart(3, '0')}`;
  allMedicinesData.push({
    code,
    name: base.name + nameSuffix,
    genericName: base.genericName,
    category: base.category,
    form: base.form,
    strength: base.strength,
    manufacturer: base.manufacturer,
    unitPrice: base.price + (i >= 50 ? 10 : 0),
    brandName: `${base.manufacturer} Brand`,
    reorderLevel: 10,
    supplierLeadTimeDays: 7,
    requiresPrescription: i % 4 === 0 // some require prescription
  });
}

// 20 Lab Tests
const LAB_TEST_TEMPLATES = [
  { code: 'CBC', name: 'Complete Blood Count', category: 'Hematology', specimenType: 'Blood (EDTA)', unit: 'g/dL', min: 12, max: 16, price: 350 },
  { code: 'LIPID', name: 'Lipid Profile', category: 'Biochemistry', specimenType: 'Blood (Serum)', unit: 'mg/dL', min: 100, max: 200, price: 650 },
  { code: 'HBA1C', name: 'HbA1c (Glycated Hemoglobin)', category: 'Biochemistry', specimenType: 'Blood (EDTA)', unit: '%', min: 4, max: 5.7, price: 500 },
  { code: 'TSH', name: 'Thyroid Stimulating Hormone (TSH)', category: 'Hormone', specimenType: 'Blood (Serum)', unit: 'uIU/mL', min: 0.4, max: 4.5, price: 400 },
  { code: 'LFT', name: 'Liver Function Test (LFT)', category: 'Biochemistry', specimenType: 'Blood (Serum)', unit: 'U/L', min: 10, max: 40, price: 750 },
  { code: 'KFT', name: 'Kidney Function Test (KFT)', category: 'Biochemistry', specimenType: 'Blood (Serum)', unit: 'mg/dL', min: 0.6, max: 1.2, price: 800 },
  { code: 'FBS', name: 'Fasting Blood Sugar', category: 'Biochemistry', specimenType: 'Blood (Fluoride)', unit: 'mg/dL', min: 70, max: 100, price: 150 },
  { code: 'PPBS', name: 'Post-Prandial Blood Sugar', category: 'Biochemistry', specimenType: 'Blood (Fluoride)', unit: 'mg/dL', min: 70, max: 140, price: 150 },
  { code: 'VITD', name: 'Vitamin D (25-Hydroxy)', category: 'Vitamins', specimenType: 'Blood (Serum)', unit: 'ng/mL', min: 30, max: 100, price: 1500 },
  { code: 'VITB12', name: 'Vitamin B12', category: 'Vitamins', specimenType: 'Blood (Serum)', unit: 'pg/mL', min: 211, max: 911, price: 1200 },
  { code: 'URINE', name: 'Urinalysis (Urine Routine)', category: 'Urinalysis', specimenType: 'Urine', unit: '', min: null, max: null, price: 200 },
  { code: 'CRP', name: 'C-Reactive Protein (CRP)', category: 'Immunology', specimenType: 'Blood (Serum)', unit: 'mg/L', min: 0, max: 10, price: 450 },
  { code: 'ELECTRO', name: 'Serum Electrolytes', category: 'Biochemistry', specimenType: 'Blood (Serum)', unit: 'mEq/L', min: 135, max: 145, price: 500 },
  { code: 'IRON', name: 'Iron Studies', category: 'Biochemistry', specimenType: 'Blood (Serum)', unit: 'ug/dL', min: 50, max: 170, price: 900 },
  { code: 'CALCIUM', name: 'Serum Calcium', category: 'Biochemistry', specimenType: 'Blood (Serum)', unit: 'mg/dL', min: 8.5, max: 10.2, price: 300 },
  { code: 'URIC', name: 'Uric Acid', category: 'Biochemistry', specimenType: 'Blood (Serum)', unit: 'mg/dL', min: 3.5, max: 7.2, price: 350 },
  { code: 'DENGUE', name: 'Dengue NS1 Antigen', category: 'Serology', specimenType: 'Blood (Serum)', unit: 'Index', min: 0, max: 0.9, price: 800 },
  { code: 'MALARIA', name: 'Malaria Smear Test', category: 'Microbiology', specimenType: 'Blood (EDTA)', unit: '', min: null, max: null, price: 250 },
  { code: 'COVID', name: 'Covid-19 RT-PCR', category: 'Molecular', specimenType: 'Nasal/Throat Swab', unit: 'Ct', min: null, max: null, price: 1200 },
  { code: 'AMYLASE', name: 'Serum Amylase', category: 'Biochemistry', specimenType: 'Blood (Serum)', unit: 'U/L', min: 30, max: 110, price: 600 }
];

const seed = async () => {
  try {
    logger.info('Starting Pharmacy and Labs seeding...');
    await connectDB();

    // Verify clinics exist
    const clinics = await Clinic.find({});
    if (clinics.length < 2) {
      throw new Error(`At least two clinics are required to seed correctly. Found: ${clinics.length}`);
    }

    const c1 = clinics.find(c => String(c._id) === CLINIC_1_ID) || clinics[0];
    const c2 = clinics.find(c => String(c._id) === CLINIC_2_ID) || clinics[1];

    logger.info(`Clinic 1 Resolved: ${c1.name} (${c1._id})`);
    logger.info(`Clinic 2 Resolved: ${c2.name} (${c2._id})`);

    // Clean existing medicines and lab tests for all clinics
    const clinicIds = clinics.map(c => c._id);
    await Medicine.deleteMany({ clinicId: { $in: clinicIds } });
    await LabTest.deleteMany({ clinicId: { $in: clinicIds } });
    logger.info('Cleaned old records successfully.');

    // Seed Medicines
    const medicinesToInsert = [];
    allMedicinesData.forEach((med, idx) => {
      clinicIds.forEach(clinicId => {
        // Create batch to ensure totalStock > 0
        const quantity = 50; 
        const batches = [
          {
            batchNumber: `B-${med.code}-${clinicId.toString().slice(-4)}`,
            quantity,
            expiryDate: new Date('2028-12-31'),
            purchasePrice: Math.round(med.unitPrice * 0.7),
            sellingPrice: med.unitPrice,
            receivedAt: new Date()
          }
        ];

        const isActive = idx % 10 !== 0; // 10% medicines are inactive
        const finalBatches = (idx % 15 === 0) ? [] : batches; // some have 0 stock

        medicinesToInsert.push({
          ...med,
          clinicId,
          brandId: new (require('mongoose').Types.ObjectId)(),
          globalMedicineId: new (require('mongoose').Types.ObjectId)(),
          isActive,
          batches: finalBatches,
          totalStock: finalBatches.reduce((acc, b) => acc + b.quantity, 0)
        });
      });
    });

    const insertedMeds = await Medicine.insertMany(medicinesToInsert);
    logger.info(`Inserted ${insertedMeds.length} medicine records.`);

    // Seed Lab Tests
    const labTestsToInsert = [];
    LAB_TEST_TEMPLATES.forEach((test, idx) => {
      clinicIds.forEach(clinicId => {
        const isActive = idx % 8 !== 0; // Some tests inactive to check availability
        labTestsToInsert.push({
          clinicId,
          code: test.code,
          name: test.name,
          category: test.category,
          specimenType: test.specimenType,
          unit: test.unit,
          normalRange: {
            min: test.min,
            max: test.max,
            text: test.min ? '' : 'Negative'
          },
          price: test.price,
          isActive
        });
      });
    });

    const insertedLabs = await LabTest.insertMany(labTestsToInsert);
    logger.info(`Inserted ${insertedLabs.length} lab test records.`);

    logger.info('Pharmacy and Labs seeding completed successfully.');
    await disconnectDB();
  } catch (error) {
    logger.error('Seeding failed:', error);
    process.exit(1);
  }
};

seed();
