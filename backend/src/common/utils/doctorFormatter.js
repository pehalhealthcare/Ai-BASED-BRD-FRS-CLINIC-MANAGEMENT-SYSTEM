/**
 * Centralized Doctor Name Normalization (Backend Utility)
 * Normalizes doctor names for display/notifications without modifying database records.
 */

const cleanDoctorName = (name) => {
  if (!name) return '';
  const raw = name && typeof name === 'object'
    ? (name.fullName || name.name || name.user?.fullName || name.user?.name || name.userId?.name || '')
    : name;

  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';

  if (/^prof(?:essor)?\b/i.test(trimmed)) {
    return trimmed;
  }

  const stripped = trimmed.replace(/^(?:\s*(?:dr|doctor|doc)\b\.?\s*)+/gi, '').trim();
  return stripped || trimmed;
};

const normalizeDoctorName = (name, fallback = 'Doctor') => {
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

  if (/^prof(?:essor)?\b/i.test(trimmed)) {
    return trimmed.replace(/^prof(?:essor)?\.?\s*(?:dr\.?\s*)+/i, 'Prof. Dr. ');
  }

  const cleaned = cleanDoctorName(trimmed);
  if (!cleaned) return fallback;

  return `Dr. ${cleaned}`;
};

module.exports = {
  cleanDoctorName,
  normalizeDoctorName
};

