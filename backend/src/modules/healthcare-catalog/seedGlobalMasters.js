const GlobalLaboratoryUnit = require('./globalLaboratoryUnit.model');
const ReferenceRangeCondition = require('./referenceRangeCondition.model');
const logger = require('../../common/utils/logger').logger || console;

const standardUnits = [
  { symbol: 'g/dL', name: 'Grams per deciliter', category: 'Hematology', description: 'Standard unit for hemoglobin' },
  { symbol: 'mg/dL', name: 'Milligrams per deciliter', category: 'Biochemistry', description: 'Standard biochem unit' },
  { symbol: 'mmol/L', name: 'Millimoles per liter', category: 'Biochemistry', description: 'Standard biochem unit' },
  { symbol: 'µmol/L', name: 'Micromoles per liter', category: 'Biochemistry', description: 'Standard biochem unit' },
  { symbol: 'U/L', name: 'Units per liter', category: 'Enzymology', description: 'Standard enzyme activity unit' },
  { symbol: 'IU/L', name: 'International units per liter', category: 'Enzymology', description: 'Standard enzyme activity unit' },
  { symbol: 'mL/min/1.73m²', name: 'mL/min/1.73m²', category: 'Renal', description: 'GFR unit' },
  { symbol: 'ng/mL', name: 'Nanograms per milliliter', category: 'Endocrinology', description: 'Hormone/tumor marker unit' },
  { symbol: 'pg/mL', name: 'Picograms per milliliter', category: 'Endocrinology', description: 'Hormone unit' },
  { symbol: 'mg/L', name: 'Milligrams per liter', category: 'Proteins', description: 'Protein unit' },
  { symbol: 'µg/L', name: 'Micrograms per liter', category: 'Endocrinology', description: 'Micrograms per liter' },
  { symbol: '%', name: 'Percentage', category: 'General', description: 'Percentage fraction' },
  { symbol: 'cells/µL', name: 'Cells per microliter', category: 'Hematology', description: 'Cell count unit' },
  { symbol: '/HPF', name: 'Per high power field', category: 'Microscopy', description: 'Microscopy unit' },
  { symbol: '/LPF', name: 'Per low power field', category: 'Microscopy', description: 'Microscopy unit' },
  { symbol: 'mEq/L', name: 'Milliequivalents per liter', category: 'Electrolytes', description: 'Electrolyte unit' },
  { symbol: 'mmol/mol', name: 'Millimoles per mole', category: 'Diabetology', description: 'HbA1c unit' }
];

const standardConditions = [
  { name: 'None / General', type: 'GENERAL', description: 'Default/general reference condition' },
  { name: 'Fasting', type: 'METABOLIC', description: 'Patient fasting for 8-12 hours' },
  { name: 'Random', type: 'METABOLIC', description: 'Random collection time' },
  { name: 'Postprandial', type: 'METABOLIC', description: 'Post-meal collection state' },
  { name: 'Before Meal', type: 'METABOLIC', description: 'Pre-meal collection state' },
  { name: 'After Meal', type: 'METABOLIC', description: 'Post-meal collection state' },
  { name: 'Pre-Procedure', type: 'CLINICAL', description: 'Before clinical procedure' },
  { name: 'Post-Procedure', type: 'CLINICAL', description: 'After clinical procedure' },
  { name: 'Pregnancy', type: 'GESTATIONAL', description: 'Pregnancy reference state' },
  { name: 'Non-Pregnant', type: 'GESTATIONAL', description: 'Non-pregnant female reference state' },
  { name: 'First Trimester', type: 'GESTATIONAL', description: 'First trimester pregnancy' },
  { name: 'Second Trimester', type: 'GESTATIONAL', description: 'Second trimester pregnancy' },
  { name: 'Third Trimester', type: 'GESTATIONAL', description: 'Third trimester pregnancy' },
  { name: 'Pediatric', type: 'AGE_GROUP', description: 'Pediatric age reference group' },
  { name: 'Adult', type: 'AGE_GROUP', description: 'Adult age reference group' },
  { name: 'Geriatric', type: 'AGE_GROUP', description: 'Geriatric age reference group' }
];

const seedUnitsAndConditions = async () => {
  try {
    logger.info('Initializing system-defined Laboratory Units & Conditions seeding...');

    // Seed units
    let seededUnitsCount = 0;
    for (const unit of standardUnits) {
      const existing = await GlobalLaboratoryUnit.findOne({ symbol: unit.symbol });
      if (!existing) {
        await GlobalLaboratoryUnit.create({
          ...unit,
          isSystemDefined: true,
          isActive: true
        });
        seededUnitsCount++;
      }
    }
    if (seededUnitsCount > 0) {
      logger.info(`Seeded ${seededUnitsCount} new standard laboratory units.`);
    } else {
      logger.info('All standard laboratory units already present.');
    }

    // Seed conditions
    let seededConditionsCount = 0;
    for (const cond of standardConditions) {
      const existing = await ReferenceRangeCondition.findOne({ name: cond.name });
      if (!existing) {
        await ReferenceRangeCondition.create({
          ...cond,
          isSystemDefined: true,
          isActive: true
        });
        seededConditionsCount++;
      }
    }
    if (seededConditionsCount > 0) {
      logger.info(`Seeded ${seededConditionsCount} new standard reference conditions.`);
    } else {
      logger.info('All standard reference conditions already present.');
    }

    // Migrate/update existing panels/profiles to have source = USER_CREATED
    const GlobalLabTest = require('./globalLabTest.model');
    const result = await GlobalLabTest.updateMany(
      { investigationType: { $in: ['PANEL', 'PROFILE'] }, source: { $ne: 'USER_CREATED' } },
      { $set: { source: 'USER_CREATED' } }
    );
    if (result.modifiedCount > 0) {
      logger.info(`Migrated ${result.modifiedCount} existing panels/profiles to USER_CREATED source.`);
    }

  } catch (err) {
    logger.error('Error seeding laboratory units and conditions:', err.message);
  }
};

module.exports = { seedUnitsAndConditions };
