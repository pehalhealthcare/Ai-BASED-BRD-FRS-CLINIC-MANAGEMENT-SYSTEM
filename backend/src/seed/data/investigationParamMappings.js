/**
 * AICMS India Lab Master — Investigation Parameter Mappings
 * 
 * Defines:
 *   1. additionalUnits   — new unit symbols to seed if missing
 *   2. newParameters     — all parameters beyond the base 16 already seeded
 *   3. investigationMappings — maps every investigation name (exact DB string)
 *                              to an ordered list of parameter seedKeys
 *
 * Rules:
 *   - Every seedKey in investigationMappings must exist in newParameters or
 *     in EXISTING_PARAM_KEYS (parameters already seeded).
 *   - The investigation name must exactly match the string stored in MongoDB.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 0. ALREADY-SEEDED PARAMETER KEYS (do not redefine these)
// ─────────────────────────────────────────────────────────────────────────────
const EXISTING_PARAM_KEYS = new Set([
  'PAR_HAEMOGLOBIN',
  'PAR_RBC_COUNT',
  'PAR_WBC_COUNT',        // Total Leukocyte Count
  'PAR_PLATELET_COUNT',
  'PAR_ESR',
  'PAR_GLUCOSE_FASTING',
  'PAR_GLUCOSE_PP',
  'PAR_HBA1C',
  'PAR_SERUM_CREATININE',
  'PAR_BLOOD_UREA',
  'PAR_TSH',
  'PAR_CHOLESTEROL',
  'PAR_TRIGLYCERIDES',
  'PAR_HDL',
  'PAR_LDL',
  'PAR_HBSAG',
]);

// ─────────────────────────────────────────────────────────────────────────────
// 1. ADDITIONAL UNITS  (symbol, name, category, description)
// ─────────────────────────────────────────────────────────────────────────────
const additionalUnits = [
  { symbol: 'mEq/L',      name: 'Milliequivalents per liter',      category: 'Biochemistry',    description: 'Electrolytes' },
  { symbol: 'µg/dL',      name: 'Micrograms per deciliter',        category: 'Biochemistry',    description: 'Iron, cortisol, DHEA' },
  { symbol: 'µg/mL',      name: 'Micrograms per milliliter',       category: 'Pharmacology',    description: 'Therapeutic drug monitoring' },
  { symbol: 'mIU/mL',     name: 'Milli-international units per mL',category: 'Endocrinology',   description: 'FSH, LH, HCG' },
  { symbol: 'µIU/mL',     name: 'Micro-international units per mL',category: 'Endocrinology',   description: 'TSH, Insulin' },
  { symbol: 'mL',         name: 'Milliliters',                     category: 'General',         description: 'Semen volume' },
  { symbol: 'mg/24hr',    name: 'Milligrams per 24 hours',         category: 'Biochemistry',    description: '24-hour urine collections' },
  { symbol: 'cells/hpf',  name: 'Cells per high-power field',      category: 'Microscopy',      description: 'Urine/stool microscopy' },
  { symbol: 'million/mL', name: 'Million per milliliter',          category: 'Reproductive',    description: 'Sperm count' },
  { symbol: 'IU/mL',      name: 'International units per mL',      category: 'Immunology',      description: 'RF, ASO, IgE' },
  { symbol: 'U/gHb',      name: 'Units per gram of haemoglobin',   category: 'Enzymology',      description: 'G6PD activity' },
  { symbol: 'titre',      name: 'Titre',                           category: 'Serology',        description: 'Widal agglutination titre' },
  { symbol: 'nmol/L',     name: 'Nanomoles per liter',             category: 'Endocrinology',   description: 'Hormones alternate unit' },
  { symbol: 'pmol/L',     name: 'Picomoles per liter',             category: 'Endocrinology',   description: 'Hormones alternate unit' },
  { symbol: 'ng/dL',      name: 'Nanograms per deciliter',         category: 'Endocrinology',   description: 'Free hormones' },
  { symbol: 'µg/L',       name: 'Micrograms per liter',            category: 'Biochemistry',    description: 'Trace elements' },
  { symbol: 'g/L',        name: 'Grams per liter',                 category: 'Biochemistry',    description: 'Proteins' },
];

// ─────────────────────────────────────────────────────────────────────────────
// 2. NEW PARAMETERS
// Each: { seedKey, name, shortName, alternateNames, resultType, defaultUnit,
//         decimalPrecision, referenceRanges, allowedValues }
// resultType: NUMERIC | TEXT | QUALITATIVE | BOOLEAN | ENUM | PERCENTAGE | RATIO
// allowedValues: used when resultType = QUALITATIVE/ENUM (array of strings)
// referenceRanges: { gender:'BOTH'|'MALE'|'FEMALE', ageFrom, ageTo, ageUnit:'Years',
//                    condition:'None'|'Fasting'|'Postprandial', fromValue, toValue }
// ─────────────────────────────────────────────────────────────────────────────
const newParameters = [

  // ── HAEMATOLOGY CBC indices ───────────────────────────────────────────────
  { seedKey:'PAR_PCV', name:'Packed Cell Volume', shortName:'PCV',
    alternateNames:['Haematocrit','HCT'], resultType:'NUMERIC', defaultUnit:'%', decimalPrecision:1,
    referenceRanges:[
      {gender:'MALE',  ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:40,toValue:54},
      {gender:'FEMALE',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:36,toValue:47}
    ]},
  { seedKey:'PAR_MCV', name:'Mean Corpuscular Volume', shortName:'MCV',
    alternateNames:[], resultType:'NUMERIC', defaultUnit:'fL', decimalPrecision:1,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:80,toValue:100}]},
  { seedKey:'PAR_MCH', name:'Mean Corpuscular Haemoglobin', shortName:'MCH',
    alternateNames:[], resultType:'NUMERIC', defaultUnit:'pg', decimalPrecision:1,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:27,toValue:33}]},
  { seedKey:'PAR_MCHC', name:'Mean Corpuscular Haemoglobin Concentration', shortName:'MCHC',
    alternateNames:[], resultType:'NUMERIC', defaultUnit:'g/dL', decimalPrecision:1,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:31.5,toValue:36}]},
  { seedKey:'PAR_NEUTROPHILS_PCT', name:'Neutrophils', shortName:'Neut%',
    alternateNames:['Polymorphs'], resultType:'NUMERIC', defaultUnit:'%', decimalPrecision:1,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:40,toValue:75}]},
  { seedKey:'PAR_LYMPHOCYTES_PCT', name:'Lymphocytes', shortName:'Lymph%',
    alternateNames:[], resultType:'NUMERIC', defaultUnit:'%', decimalPrecision:1,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:20,toValue:45}]},
  { seedKey:'PAR_MONOCYTES_PCT', name:'Monocytes', shortName:'Mono%',
    alternateNames:[], resultType:'NUMERIC', defaultUnit:'%', decimalPrecision:1,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:2,toValue:10}]},
  { seedKey:'PAR_EOSINOPHILS_PCT', name:'Eosinophils', shortName:'Eos%',
    alternateNames:[], resultType:'NUMERIC', defaultUnit:'%', decimalPrecision:1,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:1,toValue:6}]},
  { seedKey:'PAR_BASOPHILS_PCT', name:'Basophils', shortName:'Baso%',
    alternateNames:[], resultType:'NUMERIC', defaultUnit:'%', decimalPrecision:1,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:0,toValue:1}]},
  { seedKey:'PAR_RETICULOCYTE_COUNT', name:'Reticulocyte Count', shortName:'Retic%',
    alternateNames:['Reticulocytes'], resultType:'NUMERIC', defaultUnit:'%', decimalPrecision:2,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:0.5,toValue:2.5}]},
  { seedKey:'PAR_AEC', name:'Absolute Eosinophil Count', shortName:'AEC',
    alternateNames:[], resultType:'NUMERIC', defaultUnit:'cells/µL', decimalPrecision:0,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:0,toValue:500}]},
  { seedKey:'PAR_ANC', name:'Absolute Neutrophil Count', shortName:'ANC',
    alternateNames:[], resultType:'NUMERIC', defaultUnit:'cells/µL', decimalPrecision:0,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:1800,toValue:7700}]},

  // ── PERIPHERAL SMEAR ──────────────────────────────────────────────────────
  { seedKey:'PAR_PS_RBC_MORPH', name:'RBC Morphology', shortName:'RBC Morph',
    alternateNames:['Red Cell Morphology'], resultType:'TEXT', defaultUnit:'No Unit', decimalPrecision:0, referenceRanges:[]},
  { seedKey:'PAR_PS_WBC_MORPH', name:'WBC Morphology', shortName:'WBC Morph',
    alternateNames:['White Cell Morphology'], resultType:'TEXT', defaultUnit:'No Unit', decimalPrecision:0, referenceRanges:[]},
  { seedKey:'PAR_PS_PLT_MORPH', name:'Platelet Morphology', shortName:'PLT Morph',
    alternateNames:[], resultType:'TEXT', defaultUnit:'No Unit', decimalPrecision:0, referenceRanges:[]},
  { seedKey:'PAR_PS_IMPRESSION', name:'Peripheral Smear Impression', shortName:'PS Impression',
    alternateNames:['Overall Impression'], resultType:'TEXT', defaultUnit:'No Unit', decimalPrecision:0, referenceRanges:[]},
  { seedKey:'PAR_MALARIAL_PARASITE', name:'Malarial Parasite', shortName:'MP',
    alternateNames:['Malaria Parasite'], resultType:'QUALITATIVE', defaultUnit:'No Unit', decimalPrecision:0,
    referenceRanges:[], allowedValues:['Not Seen','P. falciparum','P. vivax','P. malariae','P. ovale','Mixed']},
  { seedKey:'PAR_MICROFILARIA', name:'Microfilaria', shortName:'Microfilaria',
    alternateNames:[], resultType:'QUALITATIVE', defaultUnit:'No Unit', decimalPrecision:0,
    referenceRanges:[], allowedValues:['Not Seen','Seen']},

  // ── HB ELECTROPHORESIS / HPLC ─────────────────────────────────────────────
  { seedKey:'PAR_HBF', name:'Haemoglobin F', shortName:'HbF',
    alternateNames:['Fetal Haemoglobin'], resultType:'NUMERIC', defaultUnit:'%', decimalPrecision:1,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:0,toValue:2}]},
  { seedKey:'PAR_HBA2', name:'Haemoglobin A2', shortName:'HbA2',
    alternateNames:[], resultType:'NUMERIC', defaultUnit:'%', decimalPrecision:1,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:1.5,toValue:3.5}]},

  // ── G6PD ──────────────────────────────────────────────────────────────────
  { seedKey:'PAR_G6PD', name:'G6PD Activity', shortName:'G6PD',
    alternateNames:['Glucose-6-Phosphate Dehydrogenase'], resultType:'NUMERIC', defaultUnit:'U/gHb', decimalPrecision:1,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:4.6,toValue:13.5}]},

  // ── BLOOD GROUP ───────────────────────────────────────────────────────────
  { seedKey:'PAR_BLOOD_GROUP_ABO', name:'ABO Blood Group', shortName:'ABO',
    alternateNames:['Blood Group'], resultType:'QUALITATIVE', defaultUnit:'No Unit', decimalPrecision:0,
    referenceRanges:[], allowedValues:['A','B','AB','O']},
  { seedKey:'PAR_BLOOD_GROUP_RH', name:'Rh Factor', shortName:'Rh',
    alternateNames:['Rhesus Factor'], resultType:'QUALITATIVE', defaultUnit:'No Unit', decimalPrecision:0,
    referenceRanges:[], allowedValues:['Positive','Negative']},
  { seedKey:'PAR_DIRECT_COOMBS', name:'Direct Coombs Test', shortName:'DCT',
    alternateNames:['Direct Antiglobulin Test','DAT'], resultType:'QUALITATIVE', defaultUnit:'No Unit', decimalPrecision:0,
    referenceRanges:[], allowedValues:['Negative','Weakly Positive','Positive','Strongly Positive']},
  { seedKey:'PAR_INDIRECT_COOMBS', name:'Indirect Coombs Test', shortName:'ICT',
    alternateNames:['Indirect Antiglobulin Test','IAT'], resultType:'QUALITATIVE', defaultUnit:'No Unit', decimalPrecision:0,
    referenceRanges:[], allowedValues:['Negative','Positive']},

  // ── COAGULATION ───────────────────────────────────────────────────────────
  { seedKey:'PAR_PT', name:'Prothrombin Time', shortName:'PT',
    alternateNames:[], resultType:'NUMERIC', defaultUnit:'sec', decimalPrecision:1,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:10,toValue:14}]},
  { seedKey:'PAR_INR', name:'International Normalised Ratio', shortName:'INR',
    alternateNames:[], resultType:'NUMERIC', defaultUnit:'ratio', decimalPrecision:2,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:0.8,toValue:1.2}]},
  { seedKey:'PAR_APTT', name:'Activated Partial Thromboplastin Time', shortName:'APTT',
    alternateNames:['PTT','PTTK'], resultType:'NUMERIC', defaultUnit:'sec', decimalPrecision:1,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:25,toValue:35}]},

  // ── LIVER FUNCTION ────────────────────────────────────────────────────────
  { seedKey:'PAR_SGPT', name:'Serum Glutamate Pyruvate Transaminase', shortName:'SGPT',
    alternateNames:['ALT','Alanine Aminotransferase'], resultType:'NUMERIC', defaultUnit:'U/L', decimalPrecision:0,
    referenceRanges:[
      {gender:'MALE',  ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:7,toValue:56},
      {gender:'FEMALE',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:7,toValue:45}
    ]},
  { seedKey:'PAR_SGOT', name:'Serum Glutamate Oxaloacetate Transaminase', shortName:'SGOT',
    alternateNames:['AST','Aspartate Aminotransferase'], resultType:'NUMERIC', defaultUnit:'U/L', decimalPrecision:0,
    referenceRanges:[
      {gender:'MALE',  ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:10,toValue:40},
      {gender:'FEMALE',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:10,toValue:35}
    ]},
  { seedKey:'PAR_ALP', name:'Alkaline Phosphatase', shortName:'ALP',
    alternateNames:['Alkaline Phosphatase'], resultType:'NUMERIC', defaultUnit:'U/L', decimalPrecision:0,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:44,toValue:147}]},
  { seedKey:'PAR_GGT', name:'Gamma-Glutamyl Transferase', shortName:'GGT',
    alternateNames:['GGTP','Gamma GT'], resultType:'NUMERIC', defaultUnit:'U/L', decimalPrecision:0,
    referenceRanges:[
      {gender:'MALE',  ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:9,toValue:48},
      {gender:'FEMALE',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:9,toValue:36}
    ]},
  { seedKey:'PAR_TOTAL_BILIRUBIN', name:'Total Bilirubin', shortName:'T.Bil',
    alternateNames:['Serum Bilirubin Total'], resultType:'NUMERIC', defaultUnit:'mg/dL', decimalPrecision:2,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:0.2,toValue:1.2}]},
  { seedKey:'PAR_DIRECT_BILIRUBIN', name:'Direct Bilirubin', shortName:'D.Bil',
    alternateNames:['Conjugated Bilirubin'], resultType:'NUMERIC', defaultUnit:'mg/dL', decimalPrecision:2,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:0,toValue:0.3}]},
  { seedKey:'PAR_INDIRECT_BILIRUBIN', name:'Indirect Bilirubin', shortName:'I.Bil',
    alternateNames:['Unconjugated Bilirubin'], resultType:'NUMERIC', defaultUnit:'mg/dL', decimalPrecision:2,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:0.2,toValue:0.9}]},
  { seedKey:'PAR_TOTAL_PROTEIN', name:'Total Protein', shortName:'TP',
    alternateNames:['Serum Total Protein'], resultType:'NUMERIC', defaultUnit:'g/dL', decimalPrecision:1,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:6.3,toValue:8.2}]},
  { seedKey:'PAR_ALBUMIN', name:'Albumin', shortName:'Alb',
    alternateNames:['Serum Albumin'], resultType:'NUMERIC', defaultUnit:'g/dL', decimalPrecision:1,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:3.5,toValue:5.0}]},
  { seedKey:'PAR_GLOBULIN', name:'Globulin', shortName:'Glob',
    alternateNames:['Serum Globulin'], resultType:'NUMERIC', defaultUnit:'g/dL', decimalPrecision:1,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:2.0,toValue:3.5}]},
  { seedKey:'PAR_AG_RATIO', name:'Albumin Globulin Ratio', shortName:'A/G Ratio',
    alternateNames:['A:G Ratio'], resultType:'NUMERIC', defaultUnit:'ratio', decimalPrecision:2,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:1.0,toValue:2.5}]},

  // ── RENAL / BIOCHEMISTRY ──────────────────────────────────────────────────
  { seedKey:'PAR_BUN', name:'Blood Urea Nitrogen', shortName:'BUN',
    alternateNames:['Urea Nitrogen'], resultType:'NUMERIC', defaultUnit:'mg/dL', decimalPrecision:0,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:7,toValue:20}]},
  { seedKey:'PAR_URIC_ACID', name:'Uric Acid', shortName:'UA',
    alternateNames:['Serum Uric Acid'], resultType:'NUMERIC', defaultUnit:'mg/dL', decimalPrecision:1,
    referenceRanges:[
      {gender:'MALE',  ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:3.4,toValue:7.0},
      {gender:'FEMALE',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:2.4,toValue:6.0}
    ]},

  // ── ELECTROLYTES ──────────────────────────────────────────────────────────
  { seedKey:'PAR_SODIUM', name:'Serum Sodium', shortName:'Na',
    alternateNames:['Sodium'], resultType:'NUMERIC', defaultUnit:'mEq/L', decimalPrecision:0,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:136,toValue:145}]},
  { seedKey:'PAR_POTASSIUM', name:'Serum Potassium', shortName:'K',
    alternateNames:['Potassium'], resultType:'NUMERIC', defaultUnit:'mEq/L', decimalPrecision:1,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:3.5,toValue:5.1}]},
  { seedKey:'PAR_CHLORIDE', name:'Serum Chloride', shortName:'Cl',
    alternateNames:['Chloride'], resultType:'NUMERIC', defaultUnit:'mEq/L', decimalPrecision:0,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:98,toValue:107}]},

  // ── MINERALS ──────────────────────────────────────────────────────────────
  { seedKey:'PAR_CALCIUM', name:'Serum Calcium', shortName:'Ca',
    alternateNames:['Calcium'], resultType:'NUMERIC', defaultUnit:'mg/dL', decimalPrecision:1,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:8.5,toValue:10.5}]},
  { seedKey:'PAR_PHOSPHORUS', name:'Serum Phosphorus', shortName:'PO4',
    alternateNames:['Inorganic Phosphate'], resultType:'NUMERIC', defaultUnit:'mg/dL', decimalPrecision:1,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:2.5,toValue:4.5}]},
  { seedKey:'PAR_MAGNESIUM', name:'Serum Magnesium', shortName:'Mg',
    alternateNames:['Magnesium'], resultType:'NUMERIC', defaultUnit:'mg/dL', decimalPrecision:2,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:1.7,toValue:2.4}]},
  { seedKey:'PAR_IONIC_CALCIUM', name:'Ionized Calcium', shortName:'iCa',
    alternateNames:['Ionic Calcium','Ionised Calcium'], resultType:'NUMERIC', defaultUnit:'mg/dL', decimalPrecision:2,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:4.5,toValue:5.6}]},

  // ── ENZYMES ───────────────────────────────────────────────────────────────
  { seedKey:'PAR_LDH', name:'Lactate Dehydrogenase', shortName:'LDH',
    alternateNames:['LDH'], resultType:'NUMERIC', defaultUnit:'U/L', decimalPrecision:0,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:140,toValue:280}]},
  { seedKey:'PAR_CPK', name:'Creatine Phosphokinase', shortName:'CPK',
    alternateNames:['CK','Creatine Kinase'], resultType:'NUMERIC', defaultUnit:'U/L', decimalPrecision:0,
    referenceRanges:[
      {gender:'MALE',  ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:52,toValue:336},
      {gender:'FEMALE',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:38,toValue:176}
    ]},
  { seedKey:'PAR_CPK_MB', name:'CPK-MB', shortName:'CK-MB',
    alternateNames:['CPK-MB isoenzyme'], resultType:'NUMERIC', defaultUnit:'U/L', decimalPrecision:0,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:0,toValue:25}]},
  { seedKey:'PAR_AMYLASE', name:'Amylase', shortName:'AMY',
    alternateNames:['Serum Amylase'], resultType:'NUMERIC', defaultUnit:'U/L', decimalPrecision:0,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:28,toValue:100}]},
  { seedKey:'PAR_LIPASE', name:'Lipase', shortName:'LPS',
    alternateNames:['Serum Lipase'], resultType:'NUMERIC', defaultUnit:'U/L', decimalPrecision:0,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:13,toValue:60}]},
  { seedKey:'PAR_ACID_PHOSPHATASE', name:'Acid Phosphatase', shortName:'ACP',
    alternateNames:['Serum Acid Phosphatase'], resultType:'NUMERIC', defaultUnit:'U/L', decimalPrecision:1,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:0,toValue:5.5}]},
  { seedKey:'PAR_ACE', name:'Angiotensin Converting Enzyme', shortName:'ACE',
    alternateNames:['ACE Level'], resultType:'NUMERIC', defaultUnit:'U/L', decimalPrecision:0,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:8,toValue:52}]},

  // ── CARDIAC MARKERS ───────────────────────────────────────────────────────
  { seedKey:'PAR_TROPONIN_T', name:'Troponin T', shortName:'TropT',
    alternateNames:['Troponin-T','Trop T'], resultType:'NUMERIC', defaultUnit:'ng/mL', decimalPrecision:3,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:0,toValue:0.1}]},

  // ── LIPIDS ────────────────────────────────────────────────────────────────
  { seedKey:'PAR_VLDL', name:'VLDL Cholesterol', shortName:'VLDL',
    alternateNames:['Very Low Density Lipoprotein'], resultType:'NUMERIC', defaultUnit:'mg/dL', decimalPrecision:0,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:5,toValue:40}]},

  // ── IRON STUDIES ──────────────────────────────────────────────────────────
  { seedKey:'PAR_SERUM_IRON', name:'Serum Iron', shortName:'S.Iron',
    alternateNames:['Iron'], resultType:'NUMERIC', defaultUnit:'µg/dL', decimalPrecision:0,
    referenceRanges:[
      {gender:'MALE',  ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:65,toValue:177},
      {gender:'FEMALE',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:50,toValue:170}
    ]},
  { seedKey:'PAR_TIBC', name:'Total Iron Binding Capacity', shortName:'TIBC',
    alternateNames:['TIBC'], resultType:'NUMERIC', defaultUnit:'µg/dL', decimalPrecision:0,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:250,toValue:370}]},
  { seedKey:'PAR_TRANSFERRIN_SAT', name:'Transferrin Saturation', shortName:'TSAT',
    alternateNames:['Iron Saturation'], resultType:'NUMERIC', defaultUnit:'%', decimalPrecision:1,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:20,toValue:50}]},
  { seedKey:'PAR_FERRITIN', name:'Ferritin', shortName:'Ferritin',
    alternateNames:['Serum Ferritin'], resultType:'NUMERIC', defaultUnit:'ng/mL', decimalPrecision:1,
    referenceRanges:[
      {gender:'MALE',  ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:24,toValue:336},
      {gender:'FEMALE',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:11,toValue:307}
    ]},

  // ── VITAMINS ──────────────────────────────────────────────────────────────
  { seedKey:'PAR_FOLIC_ACID', name:'Folic Acid', shortName:'Folate',
    alternateNames:['Folate','Vitamin B9'], resultType:'NUMERIC', defaultUnit:'ng/mL', decimalPrecision:1,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:3.1,toValue:17.5}]},
  { seedKey:'PAR_VITAMIN_B12', name:'Vitamin B12', shortName:'B12',
    alternateNames:['Cyanocobalamin','Cobalamin'], resultType:'NUMERIC', defaultUnit:'pg/mL', decimalPrecision:0,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:200,toValue:900}]},
  { seedKey:'PAR_VITAMIN_D3', name:'25-Hydroxy Vitamin D', shortName:'Vit D3',
    alternateNames:['Vitamin D3','25-OH Vitamin D','Calcidiol'], resultType:'NUMERIC', defaultUnit:'ng/mL', decimalPrecision:1,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:30,toValue:100}]},

  // ── THYROID ───────────────────────────────────────────────────────────────
  { seedKey:'PAR_FREE_T3', name:'Free Triiodothyronine', shortName:'FT3',
    alternateNames:['Free T3'], resultType:'NUMERIC', defaultUnit:'pg/mL', decimalPrecision:2,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:1.71,toValue:3.71}]},
  { seedKey:'PAR_FREE_T4', name:'Free Thyroxine', shortName:'FT4',
    alternateNames:['Free T4'], resultType:'NUMERIC', defaultUnit:'ng/dL', decimalPrecision:2,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:0.7,toValue:1.48}]},
  { seedKey:'PAR_TOTAL_T3', name:'Total Triiodothyronine', shortName:'T3',
    alternateNames:['Total T3','T3 Total'], resultType:'NUMERIC', defaultUnit:'ng/dL', decimalPrecision:0,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:80,toValue:200}]},
  { seedKey:'PAR_TOTAL_T4', name:'Total Thyroxine', shortName:'T4',
    alternateNames:['Total T4','T4 Total'], resultType:'NUMERIC', defaultUnit:'µg/dL', decimalPrecision:1,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:5.1,toValue:14.1}]},

  // ── REPRODUCTIVE HORMONES ─────────────────────────────────────────────────
  { seedKey:'PAR_FSH', name:'Follicle Stimulating Hormone', shortName:'FSH',
    alternateNames:[], resultType:'NUMERIC', defaultUnit:'mIU/mL', decimalPrecision:2,
    referenceRanges:[
      {gender:'MALE',  ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:1.5,toValue:12.4},
      {gender:'FEMALE',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:3.5,toValue:12.5}
    ]},
  { seedKey:'PAR_LH', name:'Luteinising Hormone', shortName:'LH',
    alternateNames:['Luteinizing Hormone'], resultType:'NUMERIC', defaultUnit:'mIU/mL', decimalPrecision:2,
    referenceRanges:[
      {gender:'MALE',  ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:1.7,toValue:8.6},
      {gender:'FEMALE',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:2.4,toValue:12.6}
    ]},
  { seedKey:'PAR_PROLACTIN', name:'Prolactin', shortName:'PRL',
    alternateNames:['Serum Prolactin'], resultType:'NUMERIC', defaultUnit:'ng/mL', decimalPrecision:2,
    referenceRanges:[
      {gender:'MALE',  ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:4.0,toValue:15.2},
      {gender:'FEMALE',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:4.8,toValue:23.3}
    ]},
  { seedKey:'PAR_TESTOSTERONE_TOTAL', name:'Testosterone Total', shortName:'Testo',
    alternateNames:['Total Testosterone'], resultType:'NUMERIC', defaultUnit:'ng/mL', decimalPrecision:2,
    referenceRanges:[
      {gender:'MALE',  ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:1.75,toValue:7.81},
      {gender:'FEMALE',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:0.06,toValue:0.82}
    ]},
  { seedKey:'PAR_TESTOSTERONE_FREE', name:'Free Testosterone', shortName:'Free Testo',
    alternateNames:['Testosterone Free'], resultType:'NUMERIC', defaultUnit:'pg/mL', decimalPrecision:1,
    referenceRanges:[
      {gender:'MALE',  ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:46,toValue:224},
      {gender:'FEMALE',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:0.3,toValue:19}
    ]},
  { seedKey:'PAR_ESTRADIOL', name:'Estradiol', shortName:'E2',
    alternateNames:['Oestradiol','17β-Estradiol'], resultType:'NUMERIC', defaultUnit:'pg/mL', decimalPrecision:1,
    referenceRanges:[
      {gender:'MALE',  ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:10,toValue:40},
      {gender:'FEMALE',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:30,toValue:400}
    ]},
  { seedKey:'PAR_PROGESTERONE', name:'Progesterone', shortName:'Prog',
    alternateNames:['Serum Progesterone','P4'], resultType:'NUMERIC', defaultUnit:'ng/mL', decimalPrecision:2,
    referenceRanges:[
      {gender:'MALE',  ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:0.27,toValue:0.9},
      {gender:'FEMALE',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:0.15,toValue:25}
    ]},
  { seedKey:'PAR_BETA_HCG', name:'Beta Human Chorionic Gonadotrophin', shortName:'β-HCG',
    alternateNames:['Beta HCG','B-HCG'], resultType:'NUMERIC', defaultUnit:'mIU/mL', decimalPrecision:1,
    referenceRanges:[{gender:'FEMALE',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:0,toValue:5}]},
  { seedKey:'PAR_HCG_URINE', name:'HCG Urine Pregnancy Test', shortName:'UPT',
    alternateNames:['Urine Pregnancy Test'], resultType:'QUALITATIVE', defaultUnit:'No Unit', decimalPrecision:0,
    referenceRanges:[], allowedValues:['Negative','Positive']},

  // ── OTHER ENDOCRINOLOGY ───────────────────────────────────────────────────
  { seedKey:'PAR_PTH', name:'Parathyroid Hormone', shortName:'PTH',
    alternateNames:['iPTH','Intact PTH'], resultType:'NUMERIC', defaultUnit:'pg/mL', decimalPrecision:1,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:15,toValue:65}]},
  { seedKey:'PAR_CORTISOL', name:'Cortisol', shortName:'Cortisol',
    alternateNames:['Serum Cortisol'], resultType:'NUMERIC', defaultUnit:'µg/dL', decimalPrecision:1,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:5,toValue:23}]},
  { seedKey:'PAR_ACTH', name:'Adrenocorticotropic Hormone', shortName:'ACTH',
    alternateNames:['Corticotropin'], resultType:'NUMERIC', defaultUnit:'pg/mL', decimalPrecision:1,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:7.2,toValue:63.3}]},
  { seedKey:'PAR_GROWTH_HORMONE', name:'Growth Hormone', shortName:'GH',
    alternateNames:['Somatotropin'], resultType:'NUMERIC', defaultUnit:'ng/mL', decimalPrecision:2,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:0,toValue:3}]},
  { seedKey:'PAR_DHEA', name:'Dehydroepiandrosterone', shortName:'DHEA',
    alternateNames:[], resultType:'NUMERIC', defaultUnit:'µg/dL', decimalPrecision:1,
    referenceRanges:[
      {gender:'MALE',  ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:180,toValue:1250},
      {gender:'FEMALE',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:130,toValue:980}
    ]},
  { seedKey:'PAR_DHEAS', name:'Dehydroepiandrosterone Sulphate', shortName:'DHEAS',
    alternateNames:['DHEA-S'], resultType:'NUMERIC', defaultUnit:'µg/dL', decimalPrecision:1,
    referenceRanges:[
      {gender:'MALE',  ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:160,toValue:449},
      {gender:'FEMALE',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:45,toValue:270}
    ]},
  { seedKey:'PAR_ANDROSTENEDIONE', name:'Androstenedione', shortName:'Androstenedione',
    alternateNames:[], resultType:'NUMERIC', defaultUnit:'ng/mL', decimalPrecision:2,
    referenceRanges:[
      {gender:'MALE',  ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:0.6,toValue:3.1},
      {gender:'FEMALE',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:0.3,toValue:3.3}
    ]},
  { seedKey:'PAR_17OHP', name:'17-Hydroxy Progesterone', shortName:'17-OHP',
    alternateNames:['17 Hydroxy Progesterone'], resultType:'NUMERIC', defaultUnit:'ng/mL', decimalPrecision:2,
    referenceRanges:[
      {gender:'MALE',  ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:0.5,toValue:2.5},
      {gender:'FEMALE',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:0.2,toValue:2.0}
    ]},
  { seedKey:'PAR_CALCITONIN', name:'Calcitonin', shortName:'Calcitonin',
    alternateNames:[], resultType:'NUMERIC', defaultUnit:'pg/mL', decimalPrecision:1,
    referenceRanges:[
      {gender:'MALE',  ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:0,toValue:18.2},
      {gender:'FEMALE',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:0,toValue:11.5}
    ]},
  { seedKey:'PAR_INSULIN_FASTING', name:'Insulin Fasting', shortName:'S.Insulin',
    alternateNames:['Serum Insulin Fasting'], resultType:'NUMERIC', defaultUnit:'µIU/mL', decimalPrecision:1,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'Fasting',fromValue:2.6,toValue:24.9}]},
  { seedKey:'PAR_INSULIN_PP', name:'Insulin Post Prandial', shortName:'Insulin PP',
    alternateNames:['Postprandial Insulin'], resultType:'NUMERIC', defaultUnit:'µIU/mL', decimalPrecision:1,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'Postprandial',fromValue:10,toValue:120}]},
  { seedKey:'PAR_C_PEPTIDE', name:'C-Peptide', shortName:'C-Pep',
    alternateNames:['Connecting Peptide'], resultType:'NUMERIC', defaultUnit:'ng/mL', decimalPrecision:2,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'Fasting',fromValue:0.8,toValue:3.85}]},

  // ── GLUCOSE VARIANTS ──────────────────────────────────────────────────────
  { seedKey:'PAR_GLUCOSE_RANDOM', name:'Random Blood Glucose', shortName:'RBS',
    alternateNames:['Random Blood Sugar'], resultType:'NUMERIC', defaultUnit:'mg/dL', decimalPrecision:0,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:70,toValue:140}]},
  { seedKey:'PAR_GLUCOSE_CHALLENGE', name:'Glucose Challenge Test', shortName:'GCT',
    alternateNames:['GCT'], resultType:'NUMERIC', defaultUnit:'mg/dL', decimalPrecision:0,
    referenceRanges:[{gender:'FEMALE',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:0,toValue:139}]},
  { seedKey:'PAR_GLUCOSE_GTT_0', name:'GTT Fasting Glucose', shortName:'GTT 0hr',
    alternateNames:[], resultType:'NUMERIC', defaultUnit:'mg/dL', decimalPrecision:0,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'Fasting',fromValue:70,toValue:99}]},
  { seedKey:'PAR_GLUCOSE_GTT_2', name:'GTT 2hr Post-Glucose', shortName:'GTT 2hr',
    alternateNames:[], resultType:'NUMERIC', defaultUnit:'mg/dL', decimalPrecision:0,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'Postprandial',fromValue:70,toValue:140}]},

  // ── TUMOUR MARKERS ────────────────────────────────────────────────────────
  { seedKey:'PAR_PSA_TOTAL', name:'PSA Total', shortName:'PSA',
    alternateNames:['Total PSA','Prostate Specific Antigen Total'], resultType:'NUMERIC', defaultUnit:'ng/mL', decimalPrecision:3,
    referenceRanges:[{gender:'MALE',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:0,toValue:4}]},
  { seedKey:'PAR_PSA_FREE', name:'PSA Free', shortName:'Free PSA',
    alternateNames:['Free Prostate Specific Antigen'], resultType:'NUMERIC', defaultUnit:'ng/mL', decimalPrecision:3,
    referenceRanges:[{gender:'MALE',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:0,toValue:1}]},
  { seedKey:'PAR_CEA', name:'Carcinoembryonic Antigen', shortName:'CEA',
    alternateNames:['CEA'], resultType:'NUMERIC', defaultUnit:'ng/mL', decimalPrecision:1,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:0,toValue:2.5}]},
  { seedKey:'PAR_CA125', name:'CA-125', shortName:'CA-125',
    alternateNames:['Cancer Antigen 125'], resultType:'NUMERIC', defaultUnit:'IU/mL', decimalPrecision:1,
    referenceRanges:[{gender:'FEMALE',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:0,toValue:35}]},
  { seedKey:'PAR_CA199', name:'CA-19.9', shortName:'CA-19.9',
    alternateNames:['Carbohydrate Antigen 19-9'], resultType:'NUMERIC', defaultUnit:'IU/mL', decimalPrecision:1,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:0,toValue:37}]},
  { seedKey:'PAR_CA153', name:'CA-15.3', shortName:'CA-15.3',
    alternateNames:['Cancer Antigen 15-3'], resultType:'NUMERIC', defaultUnit:'IU/mL', decimalPrecision:1,
    referenceRanges:[{gender:'FEMALE',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:0,toValue:31.3}]},
  { seedKey:'PAR_AFP', name:'Alpha-Fetoprotein', shortName:'AFP',
    alternateNames:['Alpha Fetoprotein'], resultType:'NUMERIC', defaultUnit:'ng/mL', decimalPrecision:2,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:0,toValue:8.1}]},

  // ── IMMUNOLOGY / SEROLOGY ─────────────────────────────────────────────────
  { seedKey:'PAR_CRP', name:'C-Reactive Protein', shortName:'CRP',
    alternateNames:['hs-CRP'], resultType:'NUMERIC', defaultUnit:'mg/L', decimalPrecision:1,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:0,toValue:5}]},
  { seedKey:'PAR_RF', name:'Rheumatoid Factor', shortName:'RF',
    alternateNames:['RA Factor'], resultType:'NUMERIC', defaultUnit:'IU/mL', decimalPrecision:1,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:0,toValue:14}]},
  { seedKey:'PAR_ASO', name:'Anti-Streptolysin O Titre', shortName:'ASO',
    alternateNames:['ASOT','ASO Titre'], resultType:'NUMERIC', defaultUnit:'IU/mL', decimalPrecision:0,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:0,toValue:200}]},
  { seedKey:'PAR_ANA', name:'Anti-Nuclear Antibody', shortName:'ANA',
    alternateNames:['Antinuclear Antibody'], resultType:'QUALITATIVE', defaultUnit:'No Unit', decimalPrecision:0,
    referenceRanges:[], allowedValues:['Negative','Weakly Positive','Positive','Strongly Positive']},
  { seedKey:'PAR_COMPLEMENT_C3', name:'Complement C3', shortName:'C3',
    alternateNames:['C3 Complement'], resultType:'NUMERIC', defaultUnit:'mg/dL', decimalPrecision:1,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:90,toValue:180}]},
  { seedKey:'PAR_COMPLEMENT_C4', name:'Complement C4', shortName:'C4',
    alternateNames:['C4 Complement'], resultType:'NUMERIC', defaultUnit:'mg/dL', decimalPrecision:1,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:16,toValue:47}]},
  { seedKey:'PAR_ANTI_HCV', name:'Anti-HCV', shortName:'Anti-HCV',
    alternateNames:['Hepatitis C Antibody','HCV Antibody'], resultType:'QUALITATIVE', defaultUnit:'No Unit', decimalPrecision:0,
    referenceRanges:[], allowedValues:['Non-Reactive','Reactive']},
  { seedKey:'PAR_HIV_SCREENING', name:'HIV Screening', shortName:'HIV',
    alternateNames:['HIV 1&2 Antibody'], resultType:'QUALITATIVE', defaultUnit:'No Unit', decimalPrecision:0,
    referenceRanges:[], allowedValues:['Non-Reactive','Reactive']},
  { seedKey:'PAR_VDRL', name:'VDRL', shortName:'VDRL',
    alternateNames:['RPR','Syphilis Screening'], resultType:'QUALITATIVE', defaultUnit:'No Unit', decimalPrecision:0,
    referenceRanges:[], allowedValues:['Non-Reactive','Reactive']},
  { seedKey:'PAR_WIDAL_TO', name:'Widal Typhoid O', shortName:'Widal TO',
    alternateNames:['Typhoid O Agglutinin'], resultType:'TEXT', defaultUnit:'No Unit', decimalPrecision:0, referenceRanges:[]},
  { seedKey:'PAR_WIDAL_TH', name:'Widal Typhoid H', shortName:'Widal TH',
    alternateNames:['Typhoid H Agglutinin'], resultType:'TEXT', defaultUnit:'No Unit', decimalPrecision:0, referenceRanges:[]},
  { seedKey:'PAR_WIDAL_AO', name:'Widal Para A O', shortName:'Widal AO',
    alternateNames:['Paratyphoid A O'], resultType:'TEXT', defaultUnit:'No Unit', decimalPrecision:0, referenceRanges:[]},
  { seedKey:'PAR_WIDAL_BO', name:'Widal Para B O', shortName:'Widal BO',
    alternateNames:['Paratyphoid B O'], resultType:'TEXT', defaultUnit:'No Unit', decimalPrecision:0, referenceRanges:[]},
  { seedKey:'PAR_EH_IGG', name:'Entamoeba histolytica IgG', shortName:'EH IgG',
    alternateNames:['Amoeba IgG'], resultType:'QUALITATIVE', defaultUnit:'No Unit', decimalPrecision:0,
    referenceRanges:[], allowedValues:['Negative','Positive']},
  { seedKey:'PAR_HLA_B27', name:'HLA B-27', shortName:'HLA B27',
    alternateNames:['Human Leukocyte Antigen B27'], resultType:'QUALITATIVE', defaultUnit:'No Unit', decimalPrecision:0,
    referenceRanges:[], allowedValues:['Negative','Positive']},
  { seedKey:'PAR_CD4', name:'CD4 Count', shortName:'CD4',
    alternateNames:['T-Helper Cell Count'], resultType:'NUMERIC', defaultUnit:'cells/µL', decimalPrecision:0,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:500,toValue:1500}]},
  { seedKey:'PAR_CD8', name:'CD8 Count', shortName:'CD8',
    alternateNames:['Cytotoxic T Cell Count'], resultType:'NUMERIC', defaultUnit:'cells/µL', decimalPrecision:0,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:300,toValue:1000}]},
  { seedKey:'PAR_P_ANCA', name:'p-ANCA', shortName:'p-ANCA',
    alternateNames:['Perinuclear ANCA'], resultType:'QUALITATIVE', defaultUnit:'No Unit', decimalPrecision:0,
    referenceRanges:[], allowedValues:['Negative','Positive']},
  { seedKey:'PAR_C_ANCA', name:'c-ANCA', shortName:'c-ANCA',
    alternateNames:['Cytoplasmic ANCA'], resultType:'QUALITATIVE', defaultUnit:'No Unit', decimalPrecision:0,
    referenceRanges:[], allowedValues:['Negative','Positive']},
  { seedKey:'PAR_TISSUE_TG_IGA', name:'Anti-Tissue Transglutaminase IgA', shortName:'tTG IgA',
    alternateNames:['tTG IgA','Tissue Transglutaminase IgA'], resultType:'NUMERIC', defaultUnit:'IU/mL', decimalPrecision:1,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:0,toValue:10}]},

  // ── DOUBLE / TRIPLE MARKER ────────────────────────────────────────────────
  { seedKey:'PAR_PAPP_A', name:'Pregnancy Associated Plasma Protein A', shortName:'PAPP-A',
    alternateNames:['PAPPA'], resultType:'NUMERIC', defaultUnit:'mIU/mL', decimalPrecision:3, referenceRanges:[]},
  { seedKey:'PAR_FREE_BETA_HCG', name:'Free Beta HCG', shortName:'Free β-HCG',
    alternateNames:['Free Beta Human Chorionic Gonadotrophin'], resultType:'NUMERIC', defaultUnit:'ng/mL', decimalPrecision:2, referenceRanges:[]},
  { seedKey:'PAR_AFP_TRIPLE', name:'AFP (Triple Marker)', shortName:'AFP (TM)',
    alternateNames:['Alpha Fetoprotein Triple Marker'], resultType:'NUMERIC', defaultUnit:'ng/mL', decimalPrecision:2, referenceRanges:[]},
  { seedKey:'PAR_UE3', name:'Unconjugated Estriol', shortName:'uE3',
    alternateNames:['Unconjugated Oestriol'], resultType:'NUMERIC', defaultUnit:'ng/mL', decimalPrecision:3, referenceRanges:[]},
  { seedKey:'PAR_INHIBIN_A', name:'Inhibin A', shortName:'Inhibin A',
    alternateNames:[], resultType:'NUMERIC', defaultUnit:'pg/mL', decimalPrecision:1, referenceRanges:[]},

  // ── HOMOCYSTEINE ──────────────────────────────────────────────────────────
  { seedKey:'PAR_HOMOCYSTEINE', name:'Homocysteine', shortName:'Hcy',
    alternateNames:['Total Homocysteine'], resultType:'NUMERIC', defaultUnit:'µmol/L', decimalPrecision:1,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:5,toValue:15}]},

  // ── THERAPEUTIC DRUG MONITORING ───────────────────────────────────────────
  { seedKey:'PAR_PHENYTOIN', name:'Phenytoin', shortName:'Phenytoin',
    alternateNames:['Dilantin','Diphenylhydantoin'], resultType:'NUMERIC', defaultUnit:'µg/mL', decimalPrecision:1,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:10,toValue:20}]},
  { seedKey:'PAR_PHENOBARBITONE', name:'Phenobarbitone', shortName:'Phenobarb',
    alternateNames:['Phenobarbital'], resultType:'NUMERIC', defaultUnit:'µg/mL', decimalPrecision:1,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:15,toValue:40}]},
  { seedKey:'PAR_CARBAMAZEPINE', name:'Carbamazepine', shortName:'CBZ',
    alternateNames:['Tegretol'], resultType:'NUMERIC', defaultUnit:'µg/mL', decimalPrecision:1,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:4,toValue:12}]},
  { seedKey:'PAR_VALPROATE', name:'Valproate', shortName:'VPA',
    alternateNames:['Sodium Valproate','Valproic Acid'], resultType:'NUMERIC', defaultUnit:'µg/mL', decimalPrecision:1,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:50,toValue:100}]},
  { seedKey:'PAR_LITHIUM', name:'Lithium', shortName:'Li',
    alternateNames:['Serum Lithium'], resultType:'NUMERIC', defaultUnit:'mEq/L', decimalPrecision:2,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:0.6,toValue:1.2}]},

  // ── URINE PHYSICAL & CHEMICAL ─────────────────────────────────────────────
  { seedKey:'PAR_URINE_COLOUR', name:'Urine Colour', shortName:'U.Colour',
    alternateNames:['Urine Color'], resultType:'TEXT', defaultUnit:'No Unit', decimalPrecision:0, referenceRanges:[]},
  { seedKey:'PAR_URINE_APPEARANCE', name:'Urine Appearance', shortName:'U.Appearance',
    alternateNames:['Urine Transparency'], resultType:'QUALITATIVE', defaultUnit:'No Unit', decimalPrecision:0,
    referenceRanges:[], allowedValues:['Clear','Turbid','Hazy','Cloudy']},
  { seedKey:'PAR_URINE_PH', name:'Urine pH', shortName:'U.pH',
    alternateNames:[], resultType:'NUMERIC', defaultUnit:'No Unit', decimalPrecision:1,
    referenceRanges:[{gender:'BOTH',ageFrom:0,ageTo:120,ageUnit:'Years',condition:'None',fromValue:4.5,toValue:8.0}]},
  { seedKey:'PAR_URINE_SG', name:'Urine Specific Gravity', shortName:'U.SG',
    alternateNames:[], resultType:'NUMERIC', defaultUnit:'No Unit', decimalPrecision:3,
    referenceRanges:[{gender:'BOTH',ageFrom:0,ageTo:120,ageUnit:'Years',condition:'None',fromValue:1.005,toValue:1.030}]},
  { seedKey:'PAR_URINE_PROTEIN_QUAL', name:'Urine Protein', shortName:'U.Protein',
    alternateNames:['Urine Albumin Qualitative'], resultType:'QUALITATIVE', defaultUnit:'No Unit', decimalPrecision:0,
    referenceRanges:[], allowedValues:['Nil','Trace','+1','+2','+3','+4']},
  { seedKey:'PAR_URINE_GLUCOSE_QUAL', name:'Urine Glucose', shortName:'U.Glucose',
    alternateNames:['Urine Sugar'], resultType:'QUALITATIVE', defaultUnit:'No Unit', decimalPrecision:0,
    referenceRanges:[], allowedValues:['Nil','Trace','+1','+2','+3','+4']},
  { seedKey:'PAR_URINE_KETONES', name:'Urine Ketones', shortName:'U.Ketones',
    alternateNames:['Ketone Bodies'], resultType:'QUALITATIVE', defaultUnit:'No Unit', decimalPrecision:0,
    referenceRanges:[], allowedValues:['Negative','Trace','Small','Moderate','Large']},
  { seedKey:'PAR_URINE_BILIRUBIN_QUAL', name:'Urine Bilirubin', shortName:'U.Bilirubin',
    alternateNames:[], resultType:'QUALITATIVE', defaultUnit:'No Unit', decimalPrecision:0,
    referenceRanges:[], allowedValues:['Negative','Positive']},
  { seedKey:'PAR_URINE_UROBILINOGEN', name:'Urine Urobilinogen', shortName:'U.Urobili',
    alternateNames:[], resultType:'QUALITATIVE', defaultUnit:'No Unit', decimalPrecision:0,
    referenceRanges:[], allowedValues:['Normal','Abnormal']},
  { seedKey:'PAR_URINE_BLOOD', name:'Urine Blood', shortName:'U.Blood',
    alternateNames:['Urine Occult Blood'], resultType:'QUALITATIVE', defaultUnit:'No Unit', decimalPrecision:0,
    referenceRanges:[], allowedValues:['Negative','Trace','+1','+2','+3']},
  { seedKey:'PAR_URINE_NITRITE', name:'Urine Nitrite', shortName:'U.Nitrite',
    alternateNames:[], resultType:'QUALITATIVE', defaultUnit:'No Unit', decimalPrecision:0,
    referenceRanges:[], allowedValues:['Negative','Positive']},
  { seedKey:'PAR_URINE_LE', name:'Urine Leukocyte Esterase', shortName:'U.LE',
    alternateNames:['Leukocyte Esterase'], resultType:'QUALITATIVE', defaultUnit:'No Unit', decimalPrecision:0,
    referenceRanges:[], allowedValues:['Negative','Trace','+1','+2','+3']},

  // ── URINE MICROSCOPY ──────────────────────────────────────────────────────
  { seedKey:'PAR_URINE_MICRO_RBC', name:'Urine RBC (Microscopy)', shortName:'U.RBC',
    alternateNames:['Urine Red Blood Cells'], resultType:'NUMERIC', defaultUnit:'cells/hpf', decimalPrecision:0,
    referenceRanges:[{gender:'BOTH',ageFrom:0,ageTo:120,ageUnit:'Years',condition:'None',fromValue:0,toValue:2}]},
  { seedKey:'PAR_URINE_MICRO_WBC', name:'Urine WBC (Microscopy)', shortName:'U.WBC',
    alternateNames:['Urine Pus Cells','Urine White Blood Cells'], resultType:'NUMERIC', defaultUnit:'cells/hpf', decimalPrecision:0,
    referenceRanges:[{gender:'BOTH',ageFrom:0,ageTo:120,ageUnit:'Years',condition:'None',fromValue:0,toValue:5}]},
  { seedKey:'PAR_URINE_MICRO_CASTS', name:'Urine Casts', shortName:'U.Casts',
    alternateNames:[], resultType:'TEXT', defaultUnit:'No Unit', decimalPrecision:0, referenceRanges:[]},
  { seedKey:'PAR_URINE_MICRO_CRYSTALS', name:'Urine Crystals', shortName:'U.Crystals',
    alternateNames:[], resultType:'TEXT', defaultUnit:'No Unit', decimalPrecision:0, referenceRanges:[]},
  { seedKey:'PAR_URINE_MICRO_EPITHELIAL', name:'Urine Epithelial Cells', shortName:'U.Epithelial',
    alternateNames:[], resultType:'TEXT', defaultUnit:'No Unit', decimalPrecision:0, referenceRanges:[]},

  // ── SPECIAL URINE TESTS ───────────────────────────────────────────────────
  { seedKey:'PAR_URINE_BILE_PIGMENT', name:'Urine Bile Pigment', shortName:'U.Bile Pigment',
    alternateNames:[], resultType:'QUALITATIVE', defaultUnit:'No Unit', decimalPrecision:0,
    referenceRanges:[], allowedValues:['Absent','Present']},
  { seedKey:'PAR_URINE_BILE_SALT', name:'Urine Bile Salt', shortName:'U.Bile Salt',
    alternateNames:[], resultType:'QUALITATIVE', defaultUnit:'No Unit', decimalPrecision:0,
    referenceRanges:[], allowedValues:['Absent','Present']},
  { seedKey:'PAR_URINE_BENCE_JONES', name:'Bence Jones Protein', shortName:'BJP',
    alternateNames:['Urine Bence Jones Protein'], resultType:'QUALITATIVE', defaultUnit:'No Unit', decimalPrecision:0,
    referenceRanges:[], allowedValues:['Absent','Present']},
  { seedKey:'PAR_URINE_MICROALBUMIN', name:'Urine Microalbumin', shortName:'U.Microalb',
    alternateNames:['Microalbuminuria'], resultType:'NUMERIC', defaultUnit:'mg/L', decimalPrecision:1,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:0,toValue:20}]},
  { seedKey:'PAR_24HR_URINE_PROTEIN', name:'24-Hour Urinary Protein', shortName:'24hr U.Protein',
    alternateNames:['24hr Urine Protein'], resultType:'NUMERIC', defaultUnit:'mg/24hr', decimalPrecision:0,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:0,toValue:150}]},
  { seedKey:'PAR_24HR_URINE_CREATININE', name:'24-Hour Urinary Creatinine', shortName:'24hr U.Creat',
    alternateNames:['24hr Urine Creatinine'], resultType:'NUMERIC', defaultUnit:'mg/24hr', decimalPrecision:0,
    referenceRanges:[
      {gender:'MALE',  ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:800,toValue:2000},
      {gender:'FEMALE',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:600,toValue:1600}
    ]},
  { seedKey:'PAR_URINE_PCR', name:'Urine Protein Creatinine Ratio', shortName:'U.PCR',
    alternateNames:['Protein Creatinine Ratio'], resultType:'NUMERIC', defaultUnit:'ratio', decimalPrecision:3,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:0,toValue:0.2}]},
  { seedKey:'PAR_URINARY_CHLORIDE', name:'Urinary Chloride', shortName:'U.Cl',
    alternateNames:['Urine Chloride'], resultType:'NUMERIC', defaultUnit:'mEq/L', decimalPrecision:0,
    referenceRanges:[{gender:'BOTH',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:110,toValue:250}]},
  { seedKey:'PAR_URINE_REDUCING_SUBSTANCES', name:'Urine Reducing Substances', shortName:'U.Reducing',
    alternateNames:[], resultType:'QUALITATIVE', defaultUnit:'No Unit', decimalPrecision:0,
    referenceRanges:[], allowedValues:['Negative','Positive']},

  // ── STOOL ─────────────────────────────────────────────────────────────────
  { seedKey:'PAR_STOOL_COLOUR', name:'Stool Colour', shortName:'Stool Colour',
    alternateNames:['Stool Color'], resultType:'TEXT', defaultUnit:'No Unit', decimalPrecision:0, referenceRanges:[]},
  { seedKey:'PAR_STOOL_CONSISTENCY', name:'Stool Consistency', shortName:'Stool Consist.',
    alternateNames:[], resultType:'QUALITATIVE', defaultUnit:'No Unit', decimalPrecision:0,
    referenceRanges:[], allowedValues:['Formed','Soft','Loose','Watery','Hard']},
  { seedKey:'PAR_STOOL_REACTION', name:'Stool Reaction', shortName:'Stool Reaction',
    alternateNames:[], resultType:'QUALITATIVE', defaultUnit:'No Unit', decimalPrecision:0,
    referenceRanges:[], allowedValues:['Acidic','Neutral','Alkaline']},
  { seedKey:'PAR_STOOL_MUCUS', name:'Stool Mucus', shortName:'Stool Mucus',
    alternateNames:[], resultType:'QUALITATIVE', defaultUnit:'No Unit', decimalPrecision:0,
    referenceRanges:[], allowedValues:['Absent','Present']},
  { seedKey:'PAR_STOOL_BLOOD', name:'Stool Blood', shortName:'Stool Blood',
    alternateNames:[], resultType:'QUALITATIVE', defaultUnit:'No Unit', decimalPrecision:0,
    referenceRanges:[], allowedValues:['Absent','Present']},
  { seedKey:'PAR_STOOL_MICRO_RBC', name:'Stool RBC (Microscopy)', shortName:'Stool RBC',
    alternateNames:[], resultType:'TEXT', defaultUnit:'No Unit', decimalPrecision:0, referenceRanges:[]},
  { seedKey:'PAR_STOOL_MICRO_WBC', name:'Stool WBC (Microscopy)', shortName:'Stool WBC',
    alternateNames:[], resultType:'TEXT', defaultUnit:'No Unit', decimalPrecision:0, referenceRanges:[]},
  { seedKey:'PAR_STOOL_OVA_CYSTS', name:'Stool Ova / Cysts', shortName:'Ova/Cysts',
    alternateNames:['Ova and Parasites'], resultType:'TEXT', defaultUnit:'No Unit', decimalPrecision:0, referenceRanges:[]},
  { seedKey:'PAR_STOOL_OCCULT_BLOOD', name:'Stool Occult Blood', shortName:'SOB',
    alternateNames:['Faecal Occult Blood','FOB'], resultType:'QUALITATIVE', defaultUnit:'No Unit', decimalPrecision:0,
    referenceRanges:[], allowedValues:['Negative','Positive']},
  { seedKey:'PAR_STOOL_PH', name:'Stool pH', shortName:'Stool pH',
    alternateNames:[], resultType:'NUMERIC', defaultUnit:'No Unit', decimalPrecision:1,
    referenceRanges:[{gender:'BOTH',ageFrom:0,ageTo:120,ageUnit:'Years',condition:'None',fromValue:6,toValue:7.5}]},
  { seedKey:'PAR_REDUCING_SUBSTANCES', name:'Reducing Substances (Stool)', shortName:'RS',
    alternateNames:['Stool Reducing Substances'], resultType:'QUALITATIVE', defaultUnit:'No Unit', decimalPrecision:0,
    referenceRanges:[], allowedValues:['Negative','Positive']},

  // ── MICROBIOLOGY ──────────────────────────────────────────────────────────
  { seedKey:'PAR_MICRO_GRAM_STAIN', name:'Gram Stain Result', shortName:'Gram Stain',
    alternateNames:[], resultType:'TEXT', defaultUnit:'No Unit', decimalPrecision:0, referenceRanges:[]},
  { seedKey:'PAR_MICRO_AFB_STAIN', name:'AFB Stain Result', shortName:'AFB',
    alternateNames:['Acid Fast Bacilli'], resultType:'QUALITATIVE', defaultUnit:'No Unit', decimalPrecision:0,
    referenceRanges:[], allowedValues:['Negative','Scanty','+1','+2','+3']},
  { seedKey:'PAR_MICRO_FUNGAL_STAIN', name:'Fungal Stain Result', shortName:'Fungal Stain',
    alternateNames:['KOH Mount'], resultType:'TEXT', defaultUnit:'No Unit', decimalPrecision:0, referenceRanges:[]},
  { seedKey:'PAR_MICRO_ORGANISM', name:'Organism Identified', shortName:'Organism',
    alternateNames:['Causative Organism'], resultType:'TEXT', defaultUnit:'No Unit', decimalPrecision:0, referenceRanges:[]},
  { seedKey:'PAR_MICRO_COLONY_COUNT', name:'Colony Count', shortName:'Colony Count',
    alternateNames:[], resultType:'TEXT', defaultUnit:'No Unit', decimalPrecision:0, referenceRanges:[]},
  { seedKey:'PAR_MICRO_SENSITIVITY', name:'Sensitivity Pattern', shortName:'Sensitivity',
    alternateNames:['Antibiogram'], resultType:'TEXT', defaultUnit:'No Unit', decimalPrecision:0, referenceRanges:[]},
  { seedKey:'PAR_MICRO_HANGING_DROP', name:'Hanging Drop Test', shortName:'Hanging Drop',
    alternateNames:[], resultType:'TEXT', defaultUnit:'No Unit', decimalPrecision:0, referenceRanges:[]},
  { seedKey:'PAR_TB_PCR', name:'TB PCR', shortName:'TB PCR',
    alternateNames:['Mycobacterium tuberculosis PCR','MTB PCR'], resultType:'QUALITATIVE', defaultUnit:'No Unit', decimalPrecision:0,
    referenceRanges:[], allowedValues:['Not Detected','Detected']},

  // ── SEMEN ANALYSIS ────────────────────────────────────────────────────────
  { seedKey:'PAR_SEMEN_VOLUME', name:'Semen Volume', shortName:'Vol',
    alternateNames:[], resultType:'NUMERIC', defaultUnit:'mL', decimalPrecision:1,
    referenceRanges:[{gender:'MALE',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:1.5,toValue:6}]},
  { seedKey:'PAR_SEMEN_PH', name:'Semen pH', shortName:'Semen pH',
    alternateNames:[], resultType:'NUMERIC', defaultUnit:'No Unit', decimalPrecision:1,
    referenceRanges:[{gender:'MALE',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:7.2,toValue:8.0}]},
  { seedKey:'PAR_SPERM_COUNT', name:'Sperm Count', shortName:'Sperm Count',
    alternateNames:['Sperm Concentration'], resultType:'NUMERIC', defaultUnit:'million/mL', decimalPrecision:1,
    referenceRanges:[{gender:'MALE',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:16,toValue:200}]},
  { seedKey:'PAR_SPERM_MOTILITY', name:'Sperm Motility', shortName:'Motility',
    alternateNames:['Total Motility'], resultType:'NUMERIC', defaultUnit:'%', decimalPrecision:0,
    referenceRanges:[{gender:'MALE',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:40,toValue:100}]},
  { seedKey:'PAR_SPERM_MORPHOLOGY', name:'Sperm Morphology', shortName:'Morphology',
    alternateNames:['Normal Forms'], resultType:'NUMERIC', defaultUnit:'%', decimalPrecision:0,
    referenceRanges:[{gender:'MALE',ageFrom:18,ageTo:65,ageUnit:'Years',condition:'None',fromValue:4,toValue:100}]},

  // ── HISTOLOGY / CYTOLOGY ──────────────────────────────────────────────────
  { seedKey:'PAR_PAP_SMEAR_RESULT', name:'Pap Smear Result', shortName:'Pap Smear',
    alternateNames:['Cervical Smear','Pap Test'], resultType:'TEXT', defaultUnit:'No Unit', decimalPrecision:0, referenceRanges:[]},
  { seedKey:'PAR_FNAC_RESULT', name:'FNAC Result', shortName:'FNAC',
    alternateNames:['Fine Needle Aspiration Cytology'], resultType:'TEXT', defaultUnit:'No Unit', decimalPrecision:0, referenceRanges:[]},
  { seedKey:'PAR_BIOPSY_RESULT', name:'Histopathology Report', shortName:'Biopsy',
    alternateNames:['Biopsy Result','HPE Result'], resultType:'TEXT', defaultUnit:'No Unit', decimalPrecision:0, referenceRanges:[]},
  { seedKey:'PAR_FLUID_CYTOLOGY', name:'Fluid Cytology', shortName:'Fluid Cytol.',
    alternateNames:['Malignant Cell Cytology'], resultType:'TEXT', defaultUnit:'No Unit', decimalPrecision:0, referenceRanges:[]},
  { seedKey:'PAR_STONE_ANALYSIS', name:'Renal Stone Composition', shortName:'Stone Comp.',
    alternateNames:['Stone Analysis'], resultType:'TEXT', defaultUnit:'No Unit', decimalPrecision:0, referenceRanges:[]},
  { seedKey:'PAR_PROTEIN_ELECTROPHORESIS', name:'Protein Electrophoresis Pattern', shortName:'Prot. Electro.',
    alternateNames:['Serum Protein Electrophoresis','SPEP'], resultType:'TEXT', defaultUnit:'No Unit', decimalPrecision:0, referenceRanges:[]},
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. INVESTIGATION → PARAMETER MAPPINGS
// Key: exact investigation name as stored in MongoDB
// Value: ordered array of parameter seedKeys (isRequired defaults to true)
//        or objects { seedKey, isRequired } for optional params
// ─────────────────────────────────────────────────────────────────────────────
const investigationMappings = {

  // ── HAEMATOLOGY ──────────────────────────────────────────────────────────
  'Complete Blood Count': [
    'PAR_HAEMOGLOBIN','PAR_RBC_COUNT','PAR_WBC_COUNT','PAR_PLATELET_COUNT',
    'PAR_PCV','PAR_MCV','PAR_MCH','PAR_MCHC'
  ],
  'Haemogram': [
    'PAR_HAEMOGLOBIN','PAR_RBC_COUNT','PAR_WBC_COUNT','PAR_PLATELET_COUNT',
    'PAR_PCV','PAR_MCV','PAR_MCH','PAR_MCHC',
    'PAR_NEUTROPHILS_PCT','PAR_LYMPHOCYTES_PCT','PAR_MONOCYTES_PCT',
    'PAR_EOSINOPHILS_PCT','PAR_BASOPHILS_PCT'
  ],
  'D.L.C': [
    'PAR_NEUTROPHILS_PCT','PAR_LYMPHOCYTES_PCT','PAR_MONOCYTES_PCT',
    'PAR_EOSINOPHILS_PCT','PAR_BASOPHILS_PCT'
  ],
  'Haemoglobin': [
    'PAR_HAEMOGLOBIN'
  ],
  'Platelet Count': [
    'PAR_PLATELET_COUNT'
  ],
  'R.B.C Count': [
    'PAR_RBC_COUNT'
  ],
  'T.L.C': [
    'PAR_WBC_COUNT'
  ],
  'P.C.V': [
    'PAR_PCV'
  ],
  'Erythrocyte Sedimentation Rate': [
    'PAR_ESR'
  ],
  'E.S.R': [
    'PAR_ESR'
  ],
  'Reticulocyte Count': [
    'PAR_RETICULOCYTE_COUNT'
  ],
  'Absolute Eosinophil Count': [
    'PAR_AEC'
  ],
  'absolute neutrophil count': [
    'PAR_ANC'
  ],

  // ── PERIPHERAL SMEAR ──────────────────────────────────────────────────────
  'Hb,PS': [
    'PAR_HAEMOGLOBIN','PAR_PS_RBC_MORPH','PAR_PS_WBC_MORPH',
    'PAR_PS_PLT_MORPH','PAR_PS_IMPRESSION'
  ],
  'Peripheral smear for M.P': [
    'PAR_PS_RBC_MORPH','PAR_MALARIAL_PARASITE','PAR_PS_IMPRESSION'
  ],
  'Peripheral smear for Microfilaria': [
    'PAR_MICROFILARIA','PAR_PS_IMPRESSION'
  ],
  'Peripheral smear for TOA': [
    'PAR_PS_RBC_MORPH','PAR_PS_WBC_MORPH','PAR_PS_PLT_MORPH','PAR_PS_IMPRESSION'
  ],

  // ── HB ELECTROPHORESIS / HPLC ─────────────────────────────────────────────
  'Hb F / Hb A2 by HPLC': [
    'PAR_HAEMOGLOBIN','PAR_HBF','PAR_HBA2'
  ],

  // ── G6PD ─────────────────────────────────────────────────────────────────
  'G6PD': [
    'PAR_G6PD'
  ],

  // ── BLOOD GROUP ───────────────────────────────────────────────────────────
  'Blood Group -ABO & RH': [
    'PAR_BLOOD_GROUP_ABO','PAR_BLOOD_GROUP_RH'
  ],
  "Coomb's test - Direct": [
    'PAR_DIRECT_COOMBS'
  ],
  "Coomb's test - Indirect": [
    'PAR_INDIRECT_COOMBS'
  ],

  // ── COAGULATION ───────────────────────────────────────────────────────────
  'Prothrombin Time (PT)': [
    'PAR_PT','PAR_INR'
  ],
  'P.T.T.K.': [
    'PAR_APTT'
  ],

  // ── LIVER FUNCTION ────────────────────────────────────────────────────────
  'Liver Function test(LFT)': [
    'PAR_TOTAL_BILIRUBIN','PAR_DIRECT_BILIRUBIN','PAR_INDIRECT_BILIRUBIN',
    'PAR_SGPT','PAR_SGOT','PAR_ALP','PAR_GGT',
    'PAR_TOTAL_PROTEIN','PAR_ALBUMIN','PAR_GLOBULIN','PAR_AG_RATIO'
  ],
  'SGPT': [
    'PAR_SGPT'
  ],
  'SGOT': [
    'PAR_SGOT'
  ],
  'Alkaline Phosphatas': [
    'PAR_ALP'
  ],
  'GGT': [
    'PAR_GGT'
  ],
  'Bilirubin': [
    'PAR_TOTAL_BILIRUBIN','PAR_DIRECT_BILIRUBIN','PAR_INDIRECT_BILIRUBIN'
  ],
  'Total Proteins': [
    'PAR_TOTAL_PROTEIN','PAR_ALBUMIN','PAR_GLOBULIN','PAR_AG_RATIO'
  ],
  'LDH': [
    'PAR_LDH'
  ],
  'Acid phosphatase': [
    'PAR_ACID_PHOSPHATASE'
  ],

  // ── RENAL FUNCTION ────────────────────────────────────────────────────────
  'Kidney Function test(KFT)': [
    'PAR_BLOOD_UREA','PAR_SERUM_CREATININE','PAR_URIC_ACID',
    'PAR_SODIUM','PAR_POTASSIUM','PAR_CHLORIDE',
    'PAR_CALCIUM','PAR_PHOSPHORUS'
  ],
  'Serum Creatinine': [
    'PAR_SERUM_CREATININE'
  ],
  'Creatinine': [
    'PAR_SERUM_CREATININE'
  ],
  'Blood Urea': [
    'PAR_BLOOD_UREA'
  ],
  'Urea': [
    'PAR_BLOOD_UREA'
  ],
  'BUN (Blood urea nitrogen)': [
    'PAR_BUN'
  ],
  'Uric acid': [
    'PAR_URIC_ACID'
  ],

  // ── ELECTROLYTES ──────────────────────────────────────────────────────────
  'Electrolytes(Na & K)': [
    'PAR_SODIUM','PAR_POTASSIUM'
  ],
  'Chloride': [
    'PAR_CHLORIDE'
  ],

  // ── MINERALS ──────────────────────────────────────────────────────────────
  'Calcium': [
    'PAR_CALCIUM'
  ],
  'Phosphorus': [
    'PAR_PHOSPHORUS'
  ],
  'Magnesium': [
    'PAR_MAGNESIUM'
  ],
  'Ionic calcium': [
    'PAR_IONIC_CALCIUM'
  ],

  // ── ENZYMES ───────────────────────────────────────────────────────────────
  'CPK': [
    'PAR_CPK'
  ],
  'CPK - MB': [
    'PAR_CPK_MB'
  ],
  'Amylase': [
    'PAR_AMYLASE'
  ],
  'Lipase': [
    'PAR_LIPASE'
  ],
  'Angiotensin Converting enzyme(ACE)': [
    'PAR_ACE'
  ],

  // ── CARDIAC ───────────────────────────────────────────────────────────────
  'Troponin T (Trop t)': [
    'PAR_TROPONIN_T'
  ],

  // ── LIPIDS ────────────────────────────────────────────────────────────────
  'Lipid Profile': [
    'PAR_CHOLESTEROL','PAR_TRIGLYCERIDES','PAR_HDL','PAR_LDL','PAR_VLDL'
  ],
  'Cholesterol': [
    'PAR_CHOLESTEROL'
  ],
  'Triglycerides': [
    'PAR_TRIGLYCERIDES'
  ],
  'HDL cholestrol': [
    'PAR_HDL'
  ],

  // ── IRON STUDIES ──────────────────────────────────────────────────────────
  'Serum Iron': [
    'PAR_SERUM_IRON','PAR_TIBC','PAR_TRANSFERRIN_SAT'
  ],
  'TIBC': [
    'PAR_TIBC'
  ],
  'Ferritin': [
    'PAR_FERRITIN'
  ],

  // ── VITAMINS ──────────────────────────────────────────────────────────────
  'Folic acid': [
    'PAR_FOLIC_ACID'
  ],
  'Vitamin B-12 levels': [
    'PAR_VITAMIN_B12'
  ],
  'Vitamin -D3(25-hydroxy)': [
    'PAR_VITAMIN_D3'
  ],

  // ── GLUCOSE ───────────────────────────────────────────────────────────────
  'Fasting Blood Glucose': [
    'PAR_GLUCOSE_FASTING'
  ],
  'Sugar Fasting': [
    'PAR_GLUCOSE_FASTING'
  ],
  'Sugar PP': [
    'PAR_GLUCOSE_PP'
  ],
  'Sugar Fasting & PP': [
    'PAR_GLUCOSE_FASTING','PAR_GLUCOSE_PP'
  ],
  'Sugar Random': [
    'PAR_GLUCOSE_RANDOM'
  ],
  'Glucose challenge test': [
    'PAR_GLUCOSE_CHALLENGE'
  ],
  'Glucose Tolerance test (GTT)': [
    'PAR_GLUCOSE_GTT_0','PAR_GLUCOSE_GTT_2'
  ],
  'Glycated Haemoglobin': [
    'PAR_HBA1C'
  ],
  'Glycosylated Hb (HbA1c)': [
    'PAR_HBA1C'
  ],

  // ── THYROID ───────────────────────────────────────────────────────────────
  'Thyroid Stimulating Hormone': [
    'PAR_TSH'
  ],
  'Free thyrod (FT3,FT4,TSH)': [
    'PAR_FREE_T3','PAR_FREE_T4','PAR_TSH'
  ],
  'FT3 / FT4 / TSH': [
    'PAR_FREE_T3','PAR_FREE_T4','PAR_TSH'
  ],
  'Total T3,T4': [
    'PAR_TOTAL_T3','PAR_TOTAL_T4'
  ],
  'Total thyroid (T3,T4,TSH)': [
    'PAR_TOTAL_T3','PAR_TOTAL_T4','PAR_TSH'
  ],

  // ── REPRODUCTIVE / FERTILITY ──────────────────────────────────────────────
  'FSH': [
    'PAR_FSH'
  ],
  'LH': [
    'PAR_LH'
  ],
  'Prolactin': [
    'PAR_PROLACTIN'
  ],
  'Testosterone - Total': [
    'PAR_TESTOSTERONE_TOTAL'
  ],
  'Testosterone - Free': [
    'PAR_TESTOSTERONE_FREE'
  ],
  'Estradiol (E2)': [
    'PAR_ESTRADIOL'
  ],
  'Progesterone (P4)': [
    'PAR_PROGESTERONE'
  ],
  'Beta - HCG': [
    'PAR_BETA_HCG'
  ],
  'HCG-Urine pregnancy test': [
    'PAR_HCG_URINE'
  ],
  'Double marker (PAPPA & HCG)': [
    'PAR_PAPP_A','PAR_FREE_BETA_HCG'
  ],
  'Triple marker': [
    'PAR_AFP_TRIPLE','PAR_BETA_HCG','PAR_UE3','PAR_INHIBIN_A'
  ],

  // ── OTHER ENDOCRINOLOGY ───────────────────────────────────────────────────
  'Cortisol': [
    'PAR_CORTISOL'
  ],
  'Cortisol - Morning': [
    'PAR_CORTISOL'
  ],
  'Cortisol - Evening': [
    'PAR_CORTISOL'
  ],
  'ACTH': [
    'PAR_ACTH'
  ],
  'Groeth Hormone': [
    'PAR_GROWTH_HORMONE'
  ],
  'DHEA': [
    'PAR_DHEA'
  ],
  'DHEAS': [
    'PAR_DHEAS'
  ],
  'Androstenedione': [
    'PAR_ANDROSTENEDIONE'
  ],
  '17 Hydroxy Progesterone': [
    'PAR_17OHP'
  ],
  'Calcitonin': [
    'PAR_CALCITONIN'
  ],
  'S. Insulin': [
    'PAR_INSULIN_FASTING'
  ],
  'S. Insulin - Fasting': [
    'PAR_INSULIN_FASTING'
  ],
  'S. Insulin - PP': [
    'PAR_INSULIN_PP'
  ],
  'C- peptide': [
    'PAR_C_PEPTIDE'
  ],
  'Parathyroid Hormone (PTH)': [
    'PAR_PTH'
  ],

  // ── TUMOUR MARKERS ────────────────────────────────────────────────────────
  'PSA - Total': [
    'PAR_PSA_TOTAL'
  ],
  'PSA - Free': [
    'PAR_PSA_FREE','PAR_PSA_TOTAL'
  ],
  'CEA': [
    'PAR_CEA'
  ],
  'CA - 125': [
    'PAR_CA125'
  ],
  'CA - 19.9': [
    'PAR_CA199'
  ],
  'CA - 15.3': [
    'PAR_CA153'
  ],
  'Alpha-Fetoprotein (AFP)': [
    'PAR_AFP'
  ],

  // ── IMMUNOLOGY / SEROLOGY ─────────────────────────────────────────────────
  'Rheumatoid Arthritis': [
    'PAR_RF'
  ],
  'Rheumatoid Arthritis (R.A) Factor': [
    'PAR_RF'
  ],
  'A.S.O Titre': [
    'PAR_ASO'
  ],
  'Complement C3': [
    'PAR_COMPLEMENT_C3'
  ],
  'Complement C4': [
    'PAR_COMPLEMENT_C4'
  ],
  'HBsAg Screening': [
    'PAR_HBSAG'
  ],
  'VDRL': [
    'PAR_VDRL'
  ],
  'Widal': [
    'PAR_WIDAL_TO','PAR_WIDAL_TH','PAR_WIDAL_AO','PAR_WIDAL_BO'
  ],
  'Entamoeba Histoytica (EH) Serology': [
    'PAR_EH_IGG'
  ],
  'HLA B- 27': [
    'PAR_HLA_B27'
  ],
  'CD - 4': [
    'PAR_CD4'
  ],
  'CD - 8': [
    'PAR_CD8'
  ],
  'c- ANCA': [
    'PAR_C_ANCA'
  ],
  'p-ANCA': [
    'PAR_P_ANCA'
  ],
  'Tissue Transglutamine IgA,tTg IgA': [
    'PAR_TISSUE_TG_IGA'
  ],
  'Homocysteine': [
    'PAR_HOMOCYSTEINE'
  ],

  // ── THERAPEUTIC DRUG MONITORING ───────────────────────────────────────────
  'Dilantin/Eptoin/Phenytoin': [
    'PAR_PHENYTOIN'
  ],
  'Phenobarbitone': [
    'PAR_PHENOBARBITONE'
  ],
  'Carbamazapine/Tegritol': [
    'PAR_CARBAMAZEPINE'
  ],
  'Valproate': [
    'PAR_VALPROATE'
  ],
  'Lithium': [
    'PAR_LITHIUM'
  ],

  // ── URINE ROUTINE / SPECIAL ───────────────────────────────────────────────
  'Urine Routine & Microscopy (R/M)': [
    'PAR_URINE_COLOUR','PAR_URINE_APPEARANCE','PAR_URINE_PH','PAR_URINE_SG',
    'PAR_URINE_PROTEIN_QUAL','PAR_URINE_GLUCOSE_QUAL','PAR_URINE_KETONES',
    'PAR_URINE_BILIRUBIN_QUAL','PAR_URINE_UROBILINOGEN',
    'PAR_URINE_BLOOD','PAR_URINE_NITRITE','PAR_URINE_LE',
    'PAR_URINE_MICRO_RBC','PAR_URINE_MICRO_WBC',
    'PAR_URINE_MICRO_CASTS','PAR_URINE_MICRO_CRYSTALS','PAR_URINE_MICRO_EPITHELIAL'
  ],
  'Urine Microalbumin': [
    'PAR_URINE_MICROALBUMIN'
  ],
  'Urine for Ketone Bodies': [
    'PAR_URINE_KETONES'
  ],
  'Urine for Urobillinogen': [
    'PAR_URINE_UROBILINOGEN'
  ],
  'Urine for Bile pigment': [
    'PAR_URINE_BILE_PIGMENT'
  ],
  'Urine for Bile Salt': [
    'PAR_URINE_BILE_SALT'
  ],
  "Urine for Bence jone's Protein": [
    'PAR_URINE_BENCE_JONES'
  ],
  'Urinary protein/creatinin ratio': [
    'PAR_URINE_PCR'
  ],
  'Urinary chloride': [
    'PAR_URINARY_CHLORIDE'
  ],
  '24 hr urinary protein': [
    'PAR_24HR_URINE_PROTEIN'
  ],
  '24 hr urinary creatinin': [
    'PAR_24HR_URINE_CREATININE'
  ],

  // ── STOOL ─────────────────────────────────────────────────────────────────
  'Stool routine & Microscopy': [
    'PAR_STOOL_COLOUR','PAR_STOOL_CONSISTENCY','PAR_STOOL_REACTION',
    'PAR_STOOL_MUCUS','PAR_STOOL_BLOOD',
    'PAR_STOOL_MICRO_RBC','PAR_STOOL_MICRO_WBC',
    'PAR_STOOL_OVA_CYSTS','PAR_STOOL_OCCULT_BLOOD'
  ],
  'Stool for occult Blood': [
    'PAR_STOOL_OCCULT_BLOOD'
  ],
  'Stool for Reducing substances': [
    'PAR_REDUCING_SUBSTANCES'
  ],
  'Stool for virio cholera (Hanging drop)': [
    'PAR_MICRO_HANGING_DROP'
  ],
  'stool PH': [
    'PAR_STOOL_PH'
  ],

  // ── MICROBIOLOGY ──────────────────────────────────────────────────────────
  'culcture & sensitivity - Aerobic': [
    'PAR_MICRO_GRAM_STAIN','PAR_MICRO_ORGANISM',
    'PAR_MICRO_COLONY_COUNT','PAR_MICRO_SENSITIVITY'
  ],
  'Culcture & Sensitivity - Blood': [
    'PAR_MICRO_ORGANISM','PAR_MICRO_COLONY_COUNT','PAR_MICRO_SENSITIVITY'
  ],
  'gram stain': [
    'PAR_MICRO_GRAM_STAIN'
  ],
  'AFB stain (Acid fast bacilli)': [
    'PAR_MICRO_AFB_STAIN'
  ],
  'fungal stain': [
    'PAR_MICRO_FUNGAL_STAIN'
  ],
  'T.B PCR': [
    'PAR_TB_PCR'
  ],

  // ── SEMEN ANALYSIS ────────────────────────────────────────────────────────
  'semen analysis (R/M)': [
    'PAR_SEMEN_VOLUME','PAR_SEMEN_PH',
    'PAR_SPERM_COUNT','PAR_SPERM_MOTILITY','PAR_SPERM_MORPHOLOGY'
  ],

  // ── HISTOLOGY / CYTOLOGY ──────────────────────────────────────────────────
  'Pap smear': [
    'PAR_PAP_SMEAR_RESULT'
  ],
  'FNAC': [
    'PAR_FNAC_RESULT'
  ],
  'Biopsy -D&C/cervical': [
    'PAR_BIOPSY_RESULT'
  ],
  'Biopsy -small': [
    'PAR_BIOPSY_RESULT'
  ],
  'Biopsy-Large': [
    'PAR_BIOPSY_RESULT'
  ],
  'Fluid for maligant cell': [
    'PAR_FLUID_CYTOLOGY'
  ],
  'Stone analysis': [
    'PAR_STONE_ANALYSIS'
  ],
  'Protein electrophoresis': [
    'PAR_PROTEIN_ELECTROPHORESIS'
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. INVESTIGATIONS INTENTIONALLY WITHOUT PARAMETERS
// These are tests where the result IS the investigation-level report
// and individual parameter decomposition is not standard practice in India.
// ─────────────────────────────────────────────────────────────────────────────
const intentionallyEmptyInvestigations = {
  // No investigations should be intentionally empty in this dataset.
  // All have been mapped above.
};

module.exports = {
  additionalUnits,
  newParameters,
  investigationMappings,
  intentionallyEmptyInvestigations,
  EXISTING_PARAM_KEYS,
};
