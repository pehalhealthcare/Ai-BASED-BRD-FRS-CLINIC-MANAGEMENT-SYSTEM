const GlobalParameter = require('./globalParameter.model');
const { AppError } = require('../../common/utils/AppError');

// Helper to normalize patient age to days for comparison
const convertToDays = (age, unit) => {
  if (age === null || age === undefined) return null;
  const u = String(unit).toUpperCase();
  if (u === 'DAYS') return age;
  if (u === 'MONTHS') return age * 30;
  if (u === 'YEARS') return age * 365;
  return age * 365; // default to years
};

// Check if two age ranges overlap
const checkAgeOverlap = (rangeA, rangeB) => {
  const fromA = convertToDays(rangeA.ageFrom ?? 0, rangeA.ageUnit || 'YEARS');
  const toA = convertToDays(rangeA.ageTo ?? 999, rangeA.ageUnit || 'YEARS');
  
  const fromB = convertToDays(rangeB.ageFrom ?? 0, rangeB.ageUnit || 'YEARS');
  const toB = convertToDays(rangeB.ageTo ?? 999, rangeB.ageUnit || 'YEARS');

  return fromA <= toB && fromB <= toA;
};

// Check if two reference ranges are ambiguously overlapping
const checkOverlappingRanges = (ranges) => {
  const activeRanges = ranges.filter(r => r.isActive !== false);
  for (let i = 0; i < activeRanges.length; i++) {
    for (let j = i + 1; j < activeRanges.length; j++) {
      const rA = activeRanges[i];
      const rB = activeRanges[j];

      // Genders must match or one is ALL
      const genderOverlap = rA.gender === rB.gender || rA.gender === 'ALL' || rB.gender === 'ALL';
      if (!genderOverlap) continue;

      // Pregnancy status must match or one is ANY
      const pregnancyOverlap = rA.pregnancyStatus === rB.pregnancyStatus || rA.pregnancyStatus === 'ANY' || rB.pregnancyStatus === 'ANY';
      if (!pregnancyOverlap) continue;

      // Specimen type must match or one is empty
      const specimenOverlap = !rA.specimenType || !rB.specimenType || rA.specimenType === rB.specimenType;
      if (!specimenOverlap) continue;

      // Conditions must match or one is null
      const conditionOverlap = !rA.conditionId || !rB.conditionId || String(rA.conditionId) === String(rB.conditionId);
      if (!conditionOverlap) continue;

      // Age range overlaps
      if (checkAgeOverlap(rA, rB)) {
        throw new AppError(
          `Overlapping Reference Ranges Detected: Conflicting ranges configured for gender ${rA.gender} / ${rB.gender} and overlapping ages.`,
          400
        );
      }
    }
  }
};

const evaluateOperator = (val, operator, limit) => {
  if (limit === null || limit === undefined) return true;
  switch (operator) {
    case '>': return val > limit;
    case '>=': return val >= limit;
    case '<': return val < limit;
    case '<=': return val <= limit;
    default: return true;
  }
};

/**
 * Classifies a parameter result value against reference ranges and critical thresholds
 */
const classifyResult = (parameter, val, patientContext = {}, specimenContext = {}) => {
  const { resultType, decimalPrecision = 1, technicalMin, technicalMax, criticalLow, criticalHigh } = parameter;

  if (resultType === 'TEXT') {
    return {
      isValid: true,
      classification: 'NORMAL',
      referenceRangeText: 'Free text result',
      criticalStatus: 'NONE'
    };
  }

  if (resultType === 'QUALITATIVE') {
    const stringVal = String(val).trim();
    const matchedVal = parameter.allowedValues.find(av => av.isActive !== false && av.value.toLowerCase() === stringVal.toLowerCase());
    
    if (!matchedVal) {
      return {
        isValid: false,
        classification: 'INVALID',
        referenceRangeText: `Expected allowed values: ${parameter.allowedValues.map(av => av.value).join(', ')}`,
        criticalStatus: 'NONE'
      };
    }

    let classification = 'NORMAL';
    if (matchedVal.isAbnormal) classification = 'HIGH'; // Standard abnormal
    
    let criticalStatus = 'NONE';
    if (matchedVal.isCritical) criticalStatus = 'CRITICAL';

    return {
      isValid: true,
      classification,
      referenceRangeText: 'Configured allowed value',
      criticalStatus,
      matchedValue: matchedVal
    };
  }

  // Handle NUMERIC & PERCENTAGE & RATIO & BOOLEAN & ENUM
  const numericVal = Number(val);
  if (isNaN(numericVal)) {
    return {
      isValid: false,
      classification: 'INVALID',
      referenceRangeText: 'Numeric value required',
      criticalStatus: 'NONE'
    };
  }

  // Technical Acceptable limit validation
  if (technicalMin !== null && technicalMin !== undefined && numericVal < technicalMin) {
    return {
      isValid: false,
      classification: 'INVALID',
      referenceRangeText: `Below technical acceptable minimum limit (${technicalMin})`,
      criticalStatus: 'NONE'
    };
  }
  if (technicalMax !== null && technicalMax !== undefined && numericVal > technicalMax) {
    return {
      isValid: false,
      classification: 'INVALID',
      referenceRangeText: `Above technical acceptable maximum limit (${technicalMax})`,
      criticalStatus: 'NONE'
    };
  }

  // Find all matched reference ranges
  const matchingRanges = [];
  const gender = String(patientContext.gender || 'ALL').toUpperCase();
  const patientAge = patientContext.age ?? null;
  const patientAgeUnit = String(patientContext.ageUnit || 'YEARS').toUpperCase();
  const pregnancy = String(patientContext.pregnancyStatus || 'ANY').toUpperCase();
  const specimen = String(specimenContext.specimenType || '').trim();
  const conditionId = patientContext.conditionId ? String(patientContext.conditionId) : null;

  for (const range of parameter.referenceRanges) {
    if (range.isActive === false) continue;

    // Filter gender
    if (range.gender !== 'ALL' && range.gender !== gender) continue;

    // Filter pregnancy
    if (range.pregnancyStatus !== 'ANY' && range.pregnancyStatus !== pregnancy) continue;

    // Filter specimen
    if (range.specimenType && range.specimenType.toLowerCase() !== specimen.toLowerCase()) continue;

    // Filter condition
    if (range.conditionId && String(range.conditionId) !== conditionId) continue;

    // Filter age
    if (patientAge !== null) {
      const patientAgeInDays = convertToDays(patientAge, patientAgeUnit);
      const rangeFromInDays = convertToDays(range.ageFrom ?? 0, range.ageUnit || 'YEARS');
      const rangeToInDays = convertToDays(range.ageTo ?? 999999, range.ageUnit || 'YEARS');
      
      if (patientAgeInDays < rangeFromInDays || patientAgeInDays > rangeToInDays) continue;
    }

    // Specificity score
    let specificity = 0;
    if (range.gender !== 'ALL') specificity += 2;
    if (range.ageFrom !== null || range.ageTo !== null) specificity += 2;
    if (range.pregnancyStatus !== 'ANY') specificity += 2;
    if (range.specimenType) specificity += 2;
    if (range.conditionId) specificity += 2;

    matchingRanges.push({ range, specificity });
  }

  // Sort by specificity score descending
  matchingRanges.sort((a, b) => b.specificity - a.specificity);
  const bestMatch = matchingRanges[0]?.range || null;

  // Evaluate Critical Values
  let criticalStatus = 'NONE';
  if (criticalLow !== null && criticalLow !== undefined && numericVal <= criticalLow) {
    criticalStatus = 'CRITICAL_LOW';
  } else if (criticalHigh !== null && criticalHigh !== undefined && numericVal >= criticalHigh) {
    criticalStatus = 'CRITICAL_HIGH';
  }

  // If no reference range matching, evaluate critical thresholds but return normal classification
  if (!bestMatch) {
    return {
      isValid: true,
      classification: criticalStatus !== 'NONE' ? (criticalStatus === 'CRITICAL_LOW' ? 'LOW' : 'HIGH') : 'NORMAL',
      referenceRangeText: 'No reference rules matched',
      criticalStatus
    };
  }

  // Evaluate clinical boundaries of best matching range
  const lower = bestMatch.lowerValue !== null && bestMatch.lowerValue !== undefined ? bestMatch.lowerValue : bestMatch.fromValue;
  const upper = bestMatch.upperValue !== null && bestMatch.upperValue !== undefined ? bestMatch.upperValue : bestMatch.toValue;
  const unit = bestMatch.unitId?.symbol || bestMatch.unit || '';

  let isLow = false;
  let isHigh = false;

  if (bestMatch.lowerOperator === 'Between' || bestMatch.upperOperator === 'Between') {
    if (lower !== null && lower !== undefined && numericVal < lower) isLow = true;
    if (upper !== null && upper !== undefined && numericVal > upper) isHigh = true;
  } else {
    // Custom operator bounds evaluation
    if (lower !== null && lower !== undefined) {
      const satisfiesLower = evaluateOperator(numericVal, bestMatch.lowerOperator, lower);
      if (!satisfiesLower) {
        if (bestMatch.lowerOperator.includes('<')) isHigh = true;
        if (bestMatch.lowerOperator.includes('>')) isLow = true;
      }
    }
    if (upper !== null && upper !== undefined) {
      const satisfiesUpper = evaluateOperator(numericVal, bestMatch.upperOperator, upper);
      if (!satisfiesUpper) {
        if (bestMatch.upperOperator.includes('<')) isHigh = true;
        if (bestMatch.upperOperator.includes('>')) isLow = true;
      }
    }
  }

  let classification = 'NORMAL';
  if (isLow) classification = 'LOW';
  if (isHigh) classification = 'HIGH';

  // Format dynamic display string
  let rangeStr = '';
  if (bestMatch.lowerOperator === 'Between') {
    rangeStr = `${lower} - ${upper}`;
  } else {
    rangeStr = `${bestMatch.lowerOperator} ${lower}`;
  }
  if (unit) rangeStr += ` ${unit}`;

  return {
    isValid: true,
    classification,
    referenceRangeText: rangeStr,
    criticalStatus,
    matchedRange: bestMatch
  };
};

module.exports = {
  checkOverlappingRanges,
  classifyResult,
  convertToDays
};
