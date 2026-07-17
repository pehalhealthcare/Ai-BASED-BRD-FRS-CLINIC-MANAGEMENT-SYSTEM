const mongoose = require('mongoose');
const xlsx = require('xlsx');
const { previewImport } = require('../src/modules/healthcare-catalog/healthcareCatalog.service');
const { connectDB } = require('../src/config/database');

let app;

beforeAll(async () => {
  app = require('../src/app');
  await connectDB();
});

describe('Universal Healthcare Import Engine Parser Suite', () => {
  describe('Route Detection from Dosage Form', () => {
    it('detects correct routes based on dosage form keywords', async () => {
      const medicineData = [
        ['BRAND NAME', 'GENERIC NAME', 'STRENGTH', 'DOSAGE FORM', 'CATEGORY', 'ROUTE'],
        ['Crocin', 'Paracetamol', '500 mg', 'Tablet', 'Analgesics', ''],
        ['Amoxicillin Injection', 'Amoxicillin', '250 mg', 'Injection', 'Antibiotics', ''],
        ['Refresh Tears', 'Carboxymethylcellulose', '0.5%', 'Eye Drops', 'Ophthalmic', ''],
        ['Beta Cream', 'Betamethasone', '0.1%', 'Cream', 'Dermatology', ''],
        ['Asthalin Inhaler', 'Salbutamol', '100 mcg', 'Inhaler', 'Respiratory', ''],
        ['Otrivin Spray', 'Xylometazoline', '0.1%', 'Nasal Spray', 'Nasal', '']
      ];

      const ws = xlsx.utils.aoa_to_sheet(medicineData);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
      const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      const base64 = buffer.toString('base64');

      const preview = await previewImport(base64, 'MEDICINE', 'medicine_list.xlsx');
      
      expect(preview).toHaveLength(6);
      expect(preview[0].data.route).toBe('Oral');
      expect(preview[1].data.route).toBe('Injection');
      expect(preview[2].data.route).toBe('Ophthalmic');
      expect(preview[3].data.route).toBe('Topical');
      expect(preview[4].data.route).toBe('Inhalation');
      expect(preview[5].data.route).toBe('Nasal');
    });
  });

  describe('Medicine Type Classification & Ingredient Parsing', () => {
    it('classifies medicines and splits active ingredients correctly', async () => {
      const medicineData = [
        ['BRAND NAME', 'GENERIC NAME', 'STRENGTH', 'DOSAGE FORM', 'CATEGORY', 'ROUTE'],
        ['Crocin 500', 'Paracetamol', '500 mg', 'Tablet', 'Analgesics', ''], // Generic
        ['Augmentin 625', 'Amoxicillin + Clavulanic Acid', '500 mg + 125 mg', 'Tablet', 'Antibiotics', ''], // Combination
        ['Pan D', '', '40 mg', 'Capsule', 'Gastrointestinal', ''] // Brand-First
      ];

      const ws = xlsx.utils.aoa_to_sheet(medicineData);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
      const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      const base64 = buffer.toString('base64');

      const preview = await previewImport(base64, 'MEDICINE', 'meds.xlsx');

      expect(preview).toHaveLength(3);
      
      // Generic classification
      expect(preview[0].data.medicineType).toBe('Generic');
      expect(preview[0].data.activeIngredients).toHaveLength(1);
      expect(preview[0].data.activeIngredients[0].name).toBe('Paracetamol');
      expect(preview[0].data.activeIngredients[0].strength).toBe('500 mg');

      // Combination classification
      expect(preview[1].data.medicineType).toBe('Combination');
      expect(preview[1].data.activeIngredients).toHaveLength(2);
      expect(preview[1].data.activeIngredients[0].name).toBe('Amoxicillin');
      expect(preview[1].data.activeIngredients[0].strength).toBe('500 mg');
      expect(preview[1].data.activeIngredients[1].name).toBe('Clavulanic Acid');
      expect(preview[1].data.activeIngredients[1].strength).toBe('125 mg');

      // Brand-First classification
      expect(preview[2].data.medicineType).toBe('Brand-First');
      expect(preview[2].data.classificationStatus).toBe('Pending Classification');
      expect(preview[2].data.activeIngredients).toHaveLength(0);
    });
  });

  describe('JSON Parsers', () => {
    it('correctly parses JSON medicine import files', async () => {
      const jsonMeds = [
        {
          brandName: 'Crocin',
          genericName: 'Paracetamol',
          strength: '500 mg',
          dosageForm: 'Tablet',
          categoryName: 'Analgesics'
        }
      ];

      const buffer = Buffer.from(JSON.stringify(jsonMeds), 'utf-8');
      const base64 = buffer.toString('base64');

      const preview = await previewImport(base64, 'MEDICINE', 'meds.json');
      expect(preview).toHaveLength(1);
      expect(preview[0].data.displayName).toBe('Paracetamol');
      expect(preview[0].data.strength).toBe('500 mg');
    });

    it('correctly parses JSON lab import files', async () => {
      const jsonLabs = [
        {
          name: 'Complete Blood Count',
          shortName: 'CBC',
          categoryName: 'Haematology',
          sampleType: 'Blood',
          normalReportingTime: '12 Hours'
        }
      ];

      const buffer = Buffer.from(JSON.stringify(jsonLabs), 'utf-8');
      const base64 = buffer.toString('base64');

      const preview = await previewImport(base64, 'LAB', 'labs.json');
      expect(preview).toHaveLength(1);
      expect(preview[0].data.name).toBe('Complete Blood Count');
      expect(preview[0].data.shortName).toBe('CBC');
      expect(preview[0].data.sampleType).toBe('Blood');
    });
  });
});
