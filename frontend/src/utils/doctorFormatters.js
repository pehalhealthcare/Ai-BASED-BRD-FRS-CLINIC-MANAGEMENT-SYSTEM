/**
 * Doctor Name Normalization Utilities
 * 
 * Provides centralized normalization for doctor names to avoid duplicate 'Dr.' or 'Dr' prefixes.
 * Examples:
 * - 'Shyam' -> 'Dr. Shyam'
 * - 'Dr Shyam' -> 'Dr. Shyam'
 * - 'Dr. Shyam' -> 'Dr. Shyam'
 * - 'Dr. Dr Shyam' -> 'Dr. Shyam'
 * - 'Dr. Dr. Shyam Ram' -> 'Dr. Shyam Ram'
 * - 'Rahul Sharma' -> 'Dr. Rahul Sharma'
 */

/**
 * Strips leading 'Dr.', 'Dr', 'Doctor', 'Doc.' title prefixes from a doctor's name,
 * returning the clean base name (useful for search, initials, or custom titling).
 * Uses word boundaries so legitimate names like 'Drew' or 'Drake' are preserved.
 *
 * @param {string|object} name - Doctor's name or doctor object
 * @returns {string} Clean name without title prefix
 */
export const cleanDoctorName = (name) => {
  if (!name) return '';
  const raw = name && typeof name === 'object'
    ? (name.fullName || name.name || name.user?.fullName || name.user?.name || name.userId?.name || '')
    : name;

  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';

  // If already prefixed with Professor/Prof, preserve that title
  if (/^prof(?:essor)?\b/i.test(trimmed)) {
    return trimmed;
  }

  // Strip any sequence of leading Dr, Dr., Doctor, Doc., DR prefixes with optional dots & spaces
  const stripped = trimmed.replace(/^(?:\s*(?:dr|doctor|doc)\b\.?\s*)+/gi, '').trim();
  return stripped || trimmed;
};

/**
 * Normalizes a doctor's display name to ensure exactly one professional 'Dr.' prefix.
 *
 * @param {string|object} name - Doctor name string or doctor object with name/fullName
 * @param {string} [fallback='Doctor'] - Fallback display if name is absent or empty
 * @returns {string} Properly formatted doctor name with single 'Dr.' title
 */
export const normalizeDoctorName = (name, fallback = 'Doctor') => {
  if (!name && !fallback) return '';

  const raw = name && typeof name === 'object'
    ? (name.fullName || name.name || name.user?.fullName || name.user?.name || name.userId?.name || '')
    : name;

  if (!raw || typeof raw !== 'string' || !raw.trim()) {
    return fallback;
  }

  const trimmed = raw.trim();
  if (/^(?:doctor|physician|general physician|—|-|n\/a)$/i.test(trimmed)) {
    return fallback || trimmed;
  }

  // Respect Professor titles if present
  if (/^prof(?:essor)?\b/i.test(trimmed)) {
    return trimmed.replace(/^prof(?:essor)?\.?\s*(?:dr\.?\s*)+/i, 'Prof. Dr. ');
  }

  const cleaned = cleanDoctorName(trimmed);
  if (!cleaned) return fallback;

  return `Dr. ${cleaned}`;
};

/**
 * Computes 1-2 letter uppercase initials for a doctor avatar based on their actual name
 * rather than accidental 'DD' from 'Dr. Dr Shyam'.
 *
 * @param {string|object} name - Doctor name or object
 * @param {string} [fallback='DR'] - Fallback initials
 * @returns {string} Initials (e.g. 'SH' for 'Shyam', 'RS' for 'Rahul Sharma')
 */
export const getDoctorInitials = (name, fallback = 'DR') => {
  const cleaned = cleanDoctorName(name);
  if (!cleaned || /^(?:doctor|physician|—|-|n\/a)$/i.test(cleaned)) {
    return fallback;
  }
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default normalizeDoctorName;

