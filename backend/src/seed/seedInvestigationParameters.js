/**
 * seedInvestigationParameters.js
 *
 * Adds / updates Parameter definitions and Investigation→Parameter relationships
 * for every investigation in the existing Global Lab Catalogue database.
 *
 * SAFE TO RUN MULTIPLE TIMES — idempotent.
 *
 * Usage:
 *   node src/seed/seedInvestigationParameters.js
 *
 * What it does:
 *   1. Seeds additional Units (new symbols only, skips existing)
 *   2. Seeds new Parameters (new names only, skips existing)
 *   3. For every investigation in investigationMappings:
 *        - Finds the investigation by exact name in MongoDB
 *        - Deletes its existing InvestigationParameter records
 *        - Creates fresh InvestigationParameter records in display order
 *   4. Prints a full audit table and exits 1 if any required mappings fail
 */

'use strict';

const { env } = require('../config/env');
const { connectDB, disconnectDB } = require('../config/database');
const { logger } = require('../common/utils/logger');

const GlobalLaboratoryUnit    = require('../modules/healthcare-catalog/globalLaboratoryUnit.model');
const GlobalParameter         = require('../modules/healthcare-catalog/globalParameter.model');
const GlobalLabTest           = require('../modules/healthcare-catalog/globalLabTest.model');
const InvestigationParameter  = require('../modules/healthcare-catalog/investigationParameter.model');
const Counter                 = require('../modules/counters/counter.model');

const {
  additionalUnits,
  newParameters,
  investigationMappings,
  intentionallyEmptyInvestigations,
  EXISTING_PARAM_KEYS,
} = require('./data/investigationParamMappings');

// ─────────────────────────────────────────────────────────────────────────────
const getNextId = async (prefix, key) => {
  const c = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `${prefix}-${String(c.seq).padStart(6, '0')}`;
};

// ─────────────────────────────────────────────────────────────────────────────
const run = async () => {
  logger.info('[SeedInvParams] Connecting to database...');
  await connectDB();
  logger.info('[SeedInvParams] Connected.');

  // ── STEP 1: Seed additional units ─────────────────────────────────────────
  logger.info('[SeedInvParams] Step 1: Seeding additional units...');
  const unitMap = {}; // symbol → _id

  // Load all existing units first
  const existingUnits = await GlobalLaboratoryUnit.find({});
  for (const u of existingUnits) unitMap[u.symbol] = u._id;

  let newUnitCount = 0;
  for (const u of additionalUnits) {
    if (!unitMap[u.symbol]) {
      const created = await GlobalLaboratoryUnit.create({
        symbol: u.symbol,
        name: u.name,
        category: u.category,
        description: u.description,
        isSystemDefined: true,
        isActive: true,
      });
      unitMap[u.symbol] = created._id;
      newUnitCount++;
    }
  }
  logger.info(`[SeedInvParams] Units: ${newUnitCount} new added. Total in map: ${Object.keys(unitMap).length}`);

  // ── STEP 2: Load existing conditions ──────────────────────────────────────
  const ReferenceRangeCondition = require('../modules/healthcare-catalog/referenceRangeCondition.model');
  const condDocs = await ReferenceRangeCondition.find({});
  const condMap = {};
  for (const c of condDocs) condMap[c.name] = c._id;

  // ── STEP 3: Seed new parameters ───────────────────────────────────────────
  logger.info('[SeedInvParams] Step 3: Seeding new parameters...');
  const paramMap = {}; // seedKey → GlobalParameter doc

  // Load existing parameters by name for de-duplication
  const existingParams = await GlobalParameter.find({});
  // Build a name→doc map for existing
  const existingParamByName = {};
  for (const p of existingParams) existingParamByName[p.name] = p;

  // We need to also load by seedKey — but existing params have no seedKey field.
  // For existing params we match by name (which is unique).
  // Map the EXISTING_PARAM_KEYS to their existing parameter records by alternate name lookup.
  const EXISTING_KEY_NAME_MAP = {
    'PAR_HAEMOGLOBIN':     'Haemoglobin',
    'PAR_RBC_COUNT':       'RBC Count',
    'PAR_WBC_COUNT':       'Total Leukocyte Count',
    'PAR_PLATELET_COUNT':  'Platelet Count',
    'PAR_ESR':             'Erythrocyte Sedimentation Rate',
    'PAR_GLUCOSE_FASTING': 'Fasting Plasma Glucose',
    'PAR_GLUCOSE_PP':      'Post Prandial Glucose',
    'PAR_HBA1C':           'Glycated Haemoglobin',
    'PAR_SERUM_CREATININE':'Serum Creatinine',
    'PAR_BLOOD_UREA':      'Blood Urea',
    'PAR_TSH':             'Thyroid Stimulating Hormone',
    'PAR_CHOLESTEROL':     'Total Cholesterol',
    'PAR_TRIGLYCERIDES':   'Triglycerides',
    'PAR_HDL':             'HDL Cholesterol',
    'PAR_LDL':             'LDL Cholesterol',
    'PAR_HBSAG':           'HBsAg Screening',
  };

  for (const [key, name] of Object.entries(EXISTING_KEY_NAME_MAP)) {
    const doc = existingParamByName[name];
    if (doc) {
      paramMap[key] = doc;
    } else {
      logger.warn(`[SeedInvParams] Existing parameter "${name}" (${key}) not found in DB — will try to create`);
    }
  }

  // Create new parameters
  let newParamCount = 0;
  for (const p of newParameters) {
    // Skip if already exists by name
    if (existingParamByName[p.name]) {
      paramMap[p.seedKey] = existingParamByName[p.name];
      continue;
    }

    const defaultUnitId = p.defaultUnit ? (unitMap[p.defaultUnit] || null) : null;

    const resolvedRanges = (p.referenceRanges || []).map(r => ({
      gender:      r.gender === 'BOTH' ? 'ALL' : r.gender,
      ageFrom:     r.ageFrom,
      ageTo:       r.ageTo,
      ageUnit:     r.ageUnit ? r.ageUnit.toUpperCase() : '',
      conditionId: condMap[r.condition] || null,
      fromValue:   r.fromValue,
      toValue:     r.toValue,
      unitId:      defaultUnitId,
    }));

    const allowedVals = (p.allowedValues || []).map(v => ({
      value: v,
      code:  v.toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 20),
    }));

    const parameterId = await getNextId('PAR', 'global_parameter_seq');
    const created = await GlobalParameter.create({
      parameterId,
      name:            p.name,
      shortName:       p.shortName || '',
      alternateNames:  p.alternateNames || [],
      resultType:      p.resultType || 'NUMERIC',
      defaultUnitId,
      decimalPrecision: p.decimalPrecision || 0,
      allowedValues:   allowedVals,
      referenceRanges: resolvedRanges,
      sourceType:      'ICMR_NEDL',
      sourceVersion:   '2nd Edition',
      sourceYear:      2025,
      isActive:        true,
    });

    paramMap[p.seedKey] = created;
    newParamCount++;
  }
  logger.info(`[SeedInvParams] Parameters: ${newParamCount} new created. Total mapped: ${Object.keys(paramMap).length}`);

  // ── STEP 4: Apply investigation→parameter mappings ────────────────────────
  logger.info('[SeedInvParams] Step 4: Applying investigation→parameter mappings...');

  const auditRows = [];
  let totalRelationships = 0;
  let mappingErrors = 0;

  for (const [invName, paramKeys] of Object.entries(investigationMappings)) {
    // Find investigation by name (ATOMIC_TEST only — panels/profiles handled separately)
    const invDoc = await GlobalLabTest.findOne({
      name: invName,
      investigationType: 'ATOMIC_TEST',
    });

    if (!invDoc) {
      logger.warn(`[SeedInvParams] Investigation NOT FOUND in DB: "${invName}"`);
      auditRows.push({ name: invName, status: 'NOT_FOUND', count: 0 });
      mappingErrors++;
      continue;
    }

    // Resolve all parameter seedKeys to IDs
    const resolvedParams = [];
    let hasError = false;
    for (const keyOrObj of paramKeys) {
      const key = typeof keyOrObj === 'string' ? keyOrObj : keyOrObj.seedKey;
      const isRequired = typeof keyOrObj === 'string' ? true : (keyOrObj.isRequired !== false);
      const paramDoc = paramMap[key];
      if (!paramDoc) {
        logger.error(`[SeedInvParams] MISSING PARAMETER "${key}" referenced by investigation "${invName}"`);
        hasError = true;
        mappingErrors++;
      } else {
        resolvedParams.push({ doc: paramDoc, isRequired });
      }
    }

    if (hasError) {
      auditRows.push({ name: invName, status: 'PARAM_MISSING', count: 0 });
      continue;
    }

    // Delete existing relationships for this investigation
    await InvestigationParameter.deleteMany({ investigationId: invDoc._id });

    // Create fresh relationships
    let order = 1;
    for (const { doc, isRequired } of resolvedParams) {
      await InvestigationParameter.create({
        investigationId: invDoc._id,
        parameterId:     doc._id,
        displayOrder:    order++,
        isRequired,
      });
    }

    totalRelationships += resolvedParams.length;
    auditRows.push({ name: invName, status: 'OK', count: resolvedParams.length });
  }

  // ── STEP 5: Find investigations NOT in the mapping ─────────────────────────
  logger.info('[SeedInvParams] Step 5: Checking for unmapped investigations...');
  const allInvestigations = await GlobalLabTest.find({ investigationType: 'ATOMIC_TEST' });
  const mappedNames = new Set(Object.keys(investigationMappings));
  const unmapped = allInvestigations.filter(inv => !mappedNames.has(inv.name));

  // Check how many params each unmapped investigation has
  for (const inv of unmapped) {
    const count = await InvestigationParameter.countDocuments({ investigationId: inv._id });
    const isIntentional = intentionallyEmptyInvestigations[inv.name];
    auditRows.push({
      name:   inv.name,
      status: count > 0 ? 'EXISTING_PARAMS' : (isIntentional ? 'INTENTIONALLY_EMPTY' : 'UNMAPPED'),
      count,
    });
    if (count === 0 && !isIntentional) {
      logger.warn(`[SeedInvParams] UNMAPPED investigation with 0 parameters: "${inv.name}"`);
    }
  }

  // ── STEP 6: Final audit ────────────────────────────────────────────────────
  const totalParams  = await GlobalParameter.countDocuments();
  const totalInvs    = await GlobalLabTest.countDocuments({ investigationType: 'ATOMIC_TEST' });
  const totalRels    = await InvestigationParameter.countDocuments();
  const withParams   = await InvestigationParameter.distinct('investigationId');
  const withCount    = withParams.length;
  const withoutCount = totalInvs - withCount;

  const okRows      = auditRows.filter(r => r.status === 'OK');
  const failRows    = auditRows.filter(r => ['NOT_FOUND','PARAM_MISSING','UNMAPPED'].includes(r.status));
  const existingRows= auditRows.filter(r => r.status === 'EXISTING_PARAMS');
  const emptyRows   = auditRows.filter(r => r.status === 'INTENTIONALLY_EMPTY');

  // ── Print results ──────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log(' AICMS — INVESTIGATION PARAMETER SEED AUDIT');
  console.log('═'.repeat(60));
  console.log(`\nTotal Parameters in DB  : ${totalParams}`);
  console.log(`Total Investigations    : ${totalInvs}`);
  console.log(`  With Parameters       : ${withCount}`);
  console.log(`  Without Parameters    : ${withoutCount}`);
  console.log(`Total Inv→Param Records : ${totalRels}`);
  console.log(`New relationships added : ${totalRelationships}`);
  console.log();

  console.log('─'.repeat(60));
  console.log(' ✅ SUCCESSFULLY MAPPED INVESTIGATIONS');
  console.log('─'.repeat(60));
  for (const r of okRows.sort((a,b)=>a.name.localeCompare(b.name))) {
    console.log(`  ✓ ${r.name.padEnd(50)} ${r.count} params`);
  }

  if (existingRows.length > 0) {
    console.log();
    console.log('─'.repeat(60));
    console.log(' ℹ  INVESTIGATIONS WITH PRE-EXISTING PARAMS (not in mapping)');
    console.log('─'.repeat(60));
    for (const r of existingRows.sort((a,b)=>a.name.localeCompare(b.name))) {
      console.log(`  ℹ ${r.name.padEnd(50)} ${r.count} params (kept)`);
    }
  }

  if (emptyRows.length > 0) {
    console.log();
    console.log('─'.repeat(60));
    console.log(' ○  INTENTIONALLY EMPTY INVESTIGATIONS');
    console.log('─'.repeat(60));
    for (const r of emptyRows) {
      console.log(`  ○ ${r.name}`);
    }
  }

  if (failRows.length > 0) {
    console.log();
    console.log('─'.repeat(60));
    console.log(' ❌ FAILURES / UNMAPPED');
    console.log('─'.repeat(60));
    for (const r of failRows) {
      console.log(`  ✗ [${r.status}] ${r.name}`);
    }
  }

  console.log();
  if (mappingErrors > 0) {
    console.log(`⚠  SEED COMPLETED WITH ${mappingErrors} ERROR(S). Review above.`);
  } else {
    console.log('✅ SEED COMPLETED SUCCESSFULLY — all investigations mapped.');
  }
  console.log('═'.repeat(60) + '\n');

  await disconnectDB();
  process.exit(mappingErrors > 0 ? 1 : 0);
};

run().catch(err => {
  logger.error('[SeedInvParams] FATAL:', err.message);
  process.exit(1);
});
