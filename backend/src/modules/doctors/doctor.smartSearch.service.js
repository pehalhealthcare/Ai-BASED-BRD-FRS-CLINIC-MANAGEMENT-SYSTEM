/**
 * Smart Doctor Search Service
 *
 * Searches ACROSS all organizations and clinics to find the best-matching
 * doctors for a given specialization, ranked by patient preference:
 *   - nearest      → closest clinic (Haversine distance)
 *   - earliest     → earliest available appointment slot
 *   - online       → online-available doctors, then lowest fee
 *   - lowest_fee   → ascending consultation fee
 */

const Doctor = require('./doctor.model');
const Clinic = require('../clinics/clinic.model');
const Organization = require('../organizations/organization.model');
const { normalizeDate, normalizeDayOfWeek } = require('../../common/utils/slotUtils');
const DoctorLeave = require('../leaves/doctorLeave.model');

/* ── Haversine (km) ────────────────────────────────────────────── */
const haversineKm = (lat1, lon1, lat2, lon2) => {
  if ([lat1, lon1, lat2, lon2].some(v => v == null)) return Infinity;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/* ── Find earliest available date for a doctor ─────────────────── */
const findEarliestSlot = (doctor) => {
  const avail = (doctor.availability || []).filter(s => s.isAvailable && s.startTime);
  if (avail.length === 0) return null;

  const dayOrder = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = new Date();
  const todayDayIdx = today.getDay(); // 0=Sun

  let bestDate = null;

  for (let offset = 0; offset <= 14; offset++) {
    const candidate = new Date(today);
    candidate.setDate(today.getDate() + offset);
    const dayName = dayOrder[candidate.getDay()];

    const match = avail.find(s => s.dayOfWeek === dayName);
    if (match) {
      // For today, check if start time hasn't passed
      if (offset === 0) {
        const [h, m] = (match.startTime || '09:00').split(':').map(Number);
        const slotStart = new Date(today);
        slotStart.setHours(h, m, 0, 0);
        if (slotStart <= today) continue;
      }
      bestDate = candidate;
      break;
    }
  }

  return bestDate;
};

/* ── Main search function ──────────────────────────────────────── */
const smartSearchDoctors = async ({ specialization, preference, lat, lng }) => {
  // 1. Find all active, approved doctors matching specialization across ALL clinics
  const escSpec = (specialization || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const filter = {
    approvalStatus: 'approved',
    isActive: true
  };

  if (escSpec) {
    filter.specialization = { $regex: escSpec, $options: 'i' };
  }

  const doctors = await Doctor.find(filter)
    .populate({
      path: 'clinicId',
      model: 'Clinic',
      select: 'name code address phone organizationId image',
      populate: {
        path: 'organizationId',
        model: 'Organization',
        select: 'name logo'
      }
    })
    .lean();

  if (doctors.length === 0) return [];

  // 2. Check for leaves today
  const today = normalizeDate(new Date());
  const approvedLeaves = await DoctorLeave.find({
    doctorId: { $in: doctors.map(d => d._id) },
    status: 'approved',
    startDate: { $lte: today },
    endDate: { $gte: today }
  }).lean();

  const onLeaveIds = new Set(approvedLeaves.map(l => String(l.doctorId)));

  // 3. Enrich each doctor with computed fields
  const enriched = doctors
    .filter(d => !onLeaveIds.has(String(d._id)))
    .map(doc => {
      const clinic = doc.clinicId || {};
      const org = clinic.organizationId || {};
      const clinicLat = clinic.address?.latitude;
      const clinicLng = clinic.address?.longitude;

      const distance =
        lat != null && lng != null
          ? haversineKm(lat, lng, clinicLat, clinicLng)
          : null;

      const earliestSlotDate = findEarliestSlot(doc);

      return {
        _id: doc._id,
        fullName: doc.fullName,
        specialization: doc.specialization,
        qualification: doc.qualification,
        experienceYears: doc.experienceYears,
        consultationFee: doc.consultationFee || 0,
        followUpFee: doc.followUpFee || 0,
        isOnlineAvailable: doc.isOnlineAvailable || false,
        image: doc.image || '',
        clinic: {
          _id: clinic._id,
          name: clinic.name || '',
          code: clinic.code || '',
          address: clinic.address || {},
          phone: clinic.phone || ''
        },
        organization: {
          _id: org._id,
          name: org.name || '',
          logo: org.logo || ''
        },
        distance: distance != null ? Math.round(distance * 10) / 10 : null,
        earliestSlotDate: earliestSlotDate ? earliestSlotDate.toISOString().split('T')[0] : null,
        // availability summary for the frontend
        availableDays: (doc.availability || [])
          .filter(s => s.isAvailable)
          .map(s => ({
            day: s.dayOfWeek,
            start: s.startTime,
            end: s.endTime,
            mode: s.consultationMode
          }))
      };
    });

  // 4. Rank by preference
  const sorted = [...enriched];

  switch (preference) {
    case 'nearest':
      sorted.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
      break;

    case 'earliest': {
      sorted.sort((a, b) => {
        const dateA = a.earliestSlotDate ? new Date(a.earliestSlotDate) : new Date('2099-12-31');
        const dateB = b.earliestSlotDate ? new Date(b.earliestSlotDate) : new Date('2099-12-31');
        return dateA - dateB;
      });
      break;
    }

    case 'online':
      sorted.sort((a, b) => {
        // Online-available first
        if (a.isOnlineAvailable !== b.isOnlineAvailable) {
          return a.isOnlineAvailable ? -1 : 1;
        }
        // Then by lowest fee
        return a.consultationFee - b.consultationFee;
      });
      break;

    case 'lowest_fee':
      sorted.sort((a, b) => a.consultationFee - b.consultationFee);
      break;

    default:
      // fallback: sort by experience descending
      sorted.sort((a, b) => b.experienceYears - a.experienceYears);
  }

  return sorted.slice(0, 10);
};

module.exports = { smartSearchDoctors };
