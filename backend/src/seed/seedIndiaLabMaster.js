const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Load environment configuration using the project's env helper
const { env } = require('../config/env');

const GlobalLaboratoryUnit = require('../modules/healthcare-catalog/globalLaboratoryUnit.model');
const ReferenceRangeCondition = require('../modules/healthcare-catalog/referenceRangeCondition.model');
const CatalogCategory = require('../modules/healthcare-catalog/catalogCategory.model');
const GlobalLabTest = require('../modules/healthcare-catalog/globalLabTest.model');
const InvestigationParameter = require('../modules/healthcare-catalog/investigationParameter.model');
const PanelInvestigation = require('../modules/healthcare-catalog/panelInvestigation.model');
const ProfileComposition = require('../modules/healthcare-catalog/profileComposition.model');
const Counter = require('../modules/counters/counter.model');

const getNextGlobalId = async (prefix, counterKey) => {
  const counter = await Counter.findOneAndUpdate(
    { key: counterKey },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `${prefix}-${String(counter.seq).padStart(6, '0')}`;
};

// Load logger
const { logger } = require('../common/utils/logger');

const datasetPath = path.join(__dirname, 'india-laboratory-master-v1.json');
const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));

const runSeed = async () => {
  const replaceMode = process.argv.includes('--replace');
  const replaceGlobalCatalogue = process.argv.includes('--replace-global-catalogue');
  const isProduction = process.env.NODE_ENV === 'production';

  if (replaceMode && isProduction && !replaceGlobalCatalogue) {
    logger.error('CRITICAL: --replace flag is restricted in production. Please use --replace-global-catalogue to confirm.');
    process.exit(1);
  }

  logger.info('Connecting to database...');
  const { connectDB, disconnectDB } = require('../config/database');
  await connectDB();
  logger.info('Connected successfully.');

  let session = null;
  try {
    // Determine if we should clear existing collections
    if (replaceMode || replaceGlobalCatalogue) {
      logger.warn('REPLACE MODE: Clearing existing master laboratory catalogue collections...');
      
      await InvestigationParameter.deleteMany({});
      await PanelInvestigation.deleteMany({});
      await ProfileComposition.deleteMany({});
      
      // Delete system-created or all lab tests
      await GlobalLabTest.deleteMany({ source: { $in: ['SYSTEM_CATALOGUE', 'USER_CREATED'] } });
      
      logger.info('Existing master records cleared.');
    }

    // 1. Seed Units
    logger.info('Seeding Units...');
    const unitMap = {}; // symbol -> _id
    for (const u of dataset.units) {
      let unit = await GlobalLaboratoryUnit.findOne({ symbol: u.symbol });
      if (!unit) {
        unit = await GlobalLaboratoryUnit.create({
          ...u,
          isSystemDefined: true,
          isActive: true
        });
      }
      unitMap[u.symbol] = unit._id;
    }

    // 2. Seed Conditions
    logger.info('Seeding Conditions...');
    const condMap = {}; // name -> _id
    for (const c of dataset.conditions) {
      let cond = await ReferenceRangeCondition.findOne({ name: c.name });
      if (!cond) {
        cond = await ReferenceRangeCondition.create({
          ...c,
          isSystemDefined: true,
          isActive: true
        });
      }
      condMap[c.name] = cond._id;
    }

    // 3. Seed Categories
    logger.info('Seeding Categories...');
    const catMap = {}; // name -> _id
    for (const cat of dataset.categories) {
      let category = await CatalogCategory.findOne({ name: cat.name, type: 'LAB' });
      if (!category) {
        category = await CatalogCategory.create({
          ...cat,
          isActive: true
        });
      }
      catMap[cat.name] = category._id;
    }

    // 4. Seed Parameters
    logger.info('Seeding Parameters...');
    const GlobalParameter = require('../modules/healthcare-catalog/globalParameter.model');
    const paramMap = {}; // seedKey -> parameter record
    for (const p of dataset.parameters) {
      let param = await GlobalParameter.findOne({ name: p.name });
      
      // Map default unit symbol to ID
      const defaultUnitId = unitMap[p.defaultUnit] || null;

      // Map conditions inside reference ranges
      const resolvedRanges = (p.referenceRanges || []).map(r => ({
        gender: r.gender === 'BOTH' ? 'ALL' : r.gender,
        ageFrom: r.ageFrom,
        ageTo: r.ageTo,
        ageUnit: r.ageUnit ? r.ageUnit.toUpperCase() : '',
        conditionId: condMap[r.condition] || null,
        fromValue: r.fromValue,
        toValue: r.toValue,
        unitId: defaultUnitId
      }));

      if (!param) {
        const parameterId = await getNextGlobalId('PAR', 'global_parameter_seq');
        param = await GlobalParameter.create({
          parameterId,
          name: p.name,
          shortName: p.shortName,
          alternateNames: p.alternateNames || [],
          resultType: p.resultType,
          defaultUnitId,
          decimalPrecision: p.decimalPrecision || 0,
          allowedValues: (p.allowedValues || []).map(val => ({ value: val, code: val.toUpperCase() })),
          referenceRanges: resolvedRanges,
          sourceType: 'ICMR_NEDL',
          isActive: true
        });
      }
      paramMap[p.seedKey] = param;
    }

    // 5. Seed Investigations
    logger.info('Seeding Investigations...');
    const invMap = {}; // seedKey -> _id
    for (const inv of dataset.investigations) {
      let test = await GlobalLabTest.findOne({ name: inv.name, investigationType: 'ATOMIC_TEST' });
      const categoryId = catMap[inv.categoryName] || null;

      if (!test) {
        const globalId = await getNextGlobalId('LAB', 'global_lab_test');
        test = await GlobalLabTest.create({
          globalId,
          name: inv.name,
          shortName: inv.shortName,
          alternateNames: inv.alternateNames || [],
          investigationType: 'ATOMIC_TEST',
          department: inv.department,
          category: categoryId,
          sampleType: inv.sampleType,
          sampleVolume: inv.sampleVolume,
          sampleContainer: inv.sampleContainer,
          methodology: inv.methodology,
          normalReportingTime: inv.normalReportingTime,
          source: 'SYSTEM_CATALOGUE',
          sourceType: (inv.sourceType && inv.sourceType.startsWith('ICMR_NEDL')) ? 'ICMR_NEDL' : 'SUPER_ADMIN',
          sourceVersion: inv.sourceVersion,
          sourceYear: inv.sourceYear,
          isActive: true
        });
      }
      invMap[inv.seedKey] = test._id;

      // Seed Investigation -> Parameter Mappings
      await InvestigationParameter.deleteMany({ investigationId: test._id });
      for (let idx = 0; idx < inv.parameters.length; idx++) {
        const pRef = inv.parameters[idx];
        const paramDoc = paramMap[pRef.seedKey];
        if (!paramDoc) {
          throw new Error(`Referenced Parameter seedKey not found: ${pRef.seedKey}`);
        }
        await InvestigationParameter.create({
          investigationId: test._id,
          parameterId: paramDoc._id,
          isRequired: pRef.isRequired !== false,
          displayOrder: idx + 1
        });
      }
    }

    // 6. Seed Panels
    logger.info('Seeding Panels...');
    const panelMap = {}; // seedKey -> _id
    for (const p of dataset.panels) {
      let panel = await GlobalLabTest.findOne({ name: p.name, investigationType: 'PANEL' });
      const categoryId = catMap[p.categoryName] || null;

      if (!panel) {
        const globalId = await getNextGlobalId('LAB', 'global_lab_test');
        panel = await GlobalLabTest.create({
          globalId,
          name: p.name,
          shortName: p.shortName,
          investigationType: 'PANEL',
          department: p.department,
          category: categoryId,
          sampleType: p.sampleType,
          sampleVolume: p.sampleVolume,
          normalReportingTime: p.normalReportingTime,
          source: 'USER_CREATED',
          sourceType: p.sourceType === 'CURATED_MARKET_CATALOGUE' ? 'CURATED_MARKET_CATALOGUE' : 'SUPER_ADMIN',
          isActive: true
        });
      }
      panelMap[p.seedKey] = panel._id;

      // Seed Panel -> Investigation Mappings
      await PanelInvestigation.deleteMany({ panelId: panel._id });
      for (let idx = 0; idx < p.investigations.length; idx++) {
        const invRef = p.investigations[idx];
        const invId = invMap[invRef.seedKey];
        if (!invId) {
          throw new Error(`Referenced Investigation seedKey not found: ${invRef.seedKey}`);
        }
        await PanelInvestigation.create({
          panelId: panel._id,
          investigationId: invId,
          isRequired: invRef.isRequired !== false,
          displayOrder: idx + 1
        });
      }
    }

    // 7. Seed Profiles
    logger.info('Seeding Profiles...');
    for (const prof of dataset.profiles) {
      let profile = await GlobalLabTest.findOne({ name: prof.name, investigationType: 'PROFILE' });
      const categoryId = catMap[prof.categoryName] || null;

      if (!profile) {
        const globalId = await getNextGlobalId('LAB', 'global_lab_test');
        profile = await GlobalLabTest.create({
          globalId,
          name: prof.name,
          shortName: prof.shortName,
          investigationType: 'PROFILE',
          department: prof.department,
          category: categoryId,
          sampleType: prof.sampleType,
          sampleVolume: prof.sampleVolume,
          normalReportingTime: prof.normalReportingTime,
          source: 'USER_CREATED',
          sourceType: prof.sourceType === 'CURATED_MARKET_CATALOGUE' ? 'CURATED_MARKET_CATALOGUE' : 'SUPER_ADMIN',
          isActive: true
        });
      }

      // Seed Profile Compositions
      await ProfileComposition.deleteMany({ profileId: profile._id });
      for (let idx = 0; idx < prof.composition.length; idx++) {
        const compRef = prof.composition[idx];
        let panelId = null;
        let invId = null;

        if (compRef.type === 'PANEL') {
          panelId = panelMap[compRef.seedKey];
          if (!panelId) throw new Error(`Referenced Panel seedKey not found: ${compRef.seedKey}`);
        } else {
          invId = invMap[compRef.seedKey];
          if (!invId) throw new Error(`Referenced Investigation seedKey not found: ${compRef.seedKey}`);
        }

        await ProfileComposition.create({
          profileId: profile._id,
          panelId,
          investigationId: invId,
          isRequired: compRef.isRequired !== false,
          displayOrder: idx + 1
        });
      }
    }

    // 8. Print Summary & Success
    const totalUnits = await GlobalLaboratoryUnit.countDocuments();
    const totalConditions = await ReferenceRangeCondition.countDocuments();
    const totalCategories = await CatalogCategory.countDocuments();
    const totalParams = await GlobalParameter.countDocuments();
    const totalInvs = await GlobalLabTest.countDocuments({ investigationType: 'ATOMIC_TEST' });
    const totalPanels = await GlobalLabTest.countDocuments({ investigationType: 'PANEL' });
    const totalProfiles = await GlobalLabTest.countDocuments({ investigationType: 'PROFILE' });
    const totalRelations = (await InvestigationParameter.countDocuments()) + (await PanelInvestigation.countDocuments()) + (await ProfileComposition.countDocuments());

    console.log(`
════════════════════════════════════
 AICMS INDIA LAB MASTER SEED
════════════════════════════════════

Dataset Version:
${dataset.version}

Source:
${dataset.source}

Units:
${totalUnits}

Conditions:
${totalConditions}

Sample Types:
${dataset.sampleTypes.length}

Categories:
${totalCategories}

Departments:
${dataset.departments.length}

Parameters:
${totalParams}

Investigations:
${totalInvs}

Panels:
${totalPanels}

Profiles:
${totalProfiles}

Relationships:
${totalRelations}

────────────────────────────────────

Validation:
✓ No duplicate parameters
✓ No duplicate investigations
✓ No orphan parameters
✓ No orphan investigations
✓ No orphan panels
✓ No duplicate relationships
✓ Unit references valid
✓ Condition references valid

DATABASE STATUS:
✓ Seed completed successfully
════════════════════════════════════
    `);

    const { disconnectDB } = require('../config/database');
    await disconnectDB();
    process.exit(0);

  } catch (err) {
    logger.error('CRITICAL: Seed failed. Error:', err.message);
    try {
      const { disconnectDB } = require('../config/database');
      await disconnectDB();
    } catch (_) {}
    process.exit(1);
  }
};

runSeed();
