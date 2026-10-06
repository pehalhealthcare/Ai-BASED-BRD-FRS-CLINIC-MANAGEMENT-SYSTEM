/**
 * Utility functions for Patient Portal normalization and formatting
 */

/**
 * Normalizes doctor names to avoid duplicate 'Dr.' or 'Dr' prefixes (DEF-23).
 * Examples:
 * - 'Dr. Shyam' -> 'Dr. Shyam'
 * - 'Dr Dr. Shyam' -> 'Dr. Shyam'
 * - 'Doctor Shyam' -> 'Dr. Shyam'
 * - 'Shyam' -> 'Dr. Shyam'
 */
export const formatDoctorName = (name) => {
  if (!name || typeof name !== 'string') return 'Dr. Assigned Doctor';
  const trimmed = name.trim();
  if (!trimmed || trimmed.toLowerCase() === 'n/a' || trimmed.toLowerCase() === 'undefined') {
    return 'Dr. Assigned Doctor';
  }
  
  // Strip existing 'Dr.', 'Dr', 'Doctor', 'Doc.' prefix variations repeatedly
  let cleaned = trimmed;
  cleaned = cleaned.replace(/^(dr\.|dr|doctor|doc\.)\s+/gi, '');
  cleaned = cleaned.replace(/^(dr\.|dr|doctor|doc\.)\s+/gi, '');
  cleaned = cleaned.trim();

  if (!cleaned) return 'Dr. Assigned Doctor';
  return `Dr. ${cleaned}`;
};

/**
 * Returns a time-based greeting using local time (DEF-22).
 * 05:00–11:59 -> Good Morning
 * 12:00–16:59 -> Good Afternoon
 * 17:00–04:59 -> Good Evening
 */
export const getTimeBasedGreeting = (date = new Date()) => {
  const hours = date.getHours();
  if (hours >= 5 && hours < 12) {
    return 'Good Morning';
  }
  if (hours >= 12 && hours < 17) {
    return 'Good Afternoon';
  }
  return 'Good Evening';
};

/**
 * Normalizes category strings for lab tests to prevent split/duplicate categories (DEF-11).
 * Maps HAEMATOLOGY, HEAMATOLOGY, (HB ELECTROPHORESIS) to Hematology, etc.
 */
export const normalizeCategory = (category) => {
  if (!category || typeof category !== 'string') return 'General';
  const clean = category.trim();
  const upper = clean.toUpperCase();

  if (
    upper === 'HAEMATOLOGY' ||
    upper === 'HEAMATOLOGY' ||
    upper === 'HEMATOLOGY' ||
    upper.includes('ELECTROPHORESIS') ||
    upper.includes('HAEMAT') ||
    upper.includes('HEMAT')
  ) {
    return 'Hematology';
  }

  if (upper.includes('BIOCHEM') || upper.includes('BIO-CHEM')) {
    return 'Biochemistry';
  }

  if (upper.includes('MICROBIO') || upper.includes('MICRO-BIO')) {
    return 'Microbiology';
  }

  if (upper.includes('SEROL') || upper.includes('IMMUNO')) {
    return 'Serology & Immunology';
  }

  if (upper.includes('PATHOL')) {
    return 'Pathology';
  }

  if (upper.includes('RADIOL') || upper.includes('X-RAY') || upper.includes('ULTRASOUND') || upper.includes('SCAN')) {
    return 'Radiology & Imaging';
  }

  // Capitalize first letter of each word if standard
  return clean.charAt(0).toUpperCase() + clean.slice(1);
};
