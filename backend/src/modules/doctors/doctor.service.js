const { HTTP_STATUS } = require('../../common/constants/httpStatus');
const { ROLES } = require('../../common/constants/roles');
const { AppError } = require('../../common/utils/AppError');
const { resolveClinicContext } = require('../../common/utils/clinicContext');
const { generateDoctorCode } = require('../../common/utils/generateDoctorCode');
const { buildPaginationMeta, getPagination } = require('../../common/utils/pagination');
const { formatDate, isTimeRangeOverlap, normalizeDate, normalizeDayOfWeek } = require('../../common/utils/slotUtils');
const { createAuditLog } = require('../audit/audit.service');
const doctorRepository = require('./doctor.repository');
const gridFsStorage = require('../../common/utils/gridFsStorage.service');

const resolveDoctorFiles = async (doctor) => {
  if (!doctor) return doctor;

  const docObj = typeof doctor.toObject === 'function' ? doctor.toObject() : doctor;

  if (docObj.image && docObj.image.startsWith('gridfs:')) {
    docObj.image = await gridFsStorage.downloadAsBase64(docObj.image);
  }
  if (docObj.documentPdf && docObj.documentPdf.startsWith('gridfs:')) {
    docObj.documentPdf = await gridFsStorage.downloadAsBase64(docObj.documentPdf);
  }
  if (docObj.signature && docObj.signature.startsWith('gridfs:')) {
    docObj.signature = await gridFsStorage.downloadAsBase64(docObj.signature);
  }
  if (docObj.bankAccount && docObj.bankAccount.passbookCopy && docObj.bankAccount.passbookCopy.startsWith('gridfs:')) {
    docObj.bankAccount.passbookCopy = await gridFsStorage.downloadAsBase64(docObj.bankAccount.passbookCopy);
  }

  return docObj;
};

const processAndSaveFile = async (doctor, field, newContent, filename) => {
  const currentRef = doctor[field];

  if (newContent && newContent.startsWith('data:')) {
    const fileRef = await gridFsStorage.uploadBase64(newContent, filename);
    if (currentRef && currentRef.startsWith('gridfs:')) {
      await gridFsStorage.deleteFile(currentRef);
    }
    doctor[field] = fileRef;
  } else {
    if (newContent === '' || !newContent) {
      if (currentRef && currentRef.startsWith('gridfs:')) {
        await gridFsStorage.deleteFile(currentRef);
      }
    }
    doctor[field] = newContent || '';
  }
};

const normalizeAvailability = (availability = []) =>
  availability.map((item) => ({
    ...item,
    dayOfWeek: normalizeDayOfWeek(item.dayOfWeek),
    slotDurationMinutes: Number(item.slotDurationMinutes || 30),
    clinicId: item.clinicId ? String(item.clinicId) : null,
    consultationMode: item.consultationMode || 'offline'
  }));

const ensureDoctorSelfAccess = async ({ requester, clinicId, doctor }) => {
  if (requester.role !== ROLES.DOCTOR) {
    return;
  }

  const ownDoctorProfile = await doctorRepository.findDoctorByUserIdAndClinic({
    userId: requester._id,
    clinicId
  });

  if (!ownDoctorProfile || String(ownDoctorProfile._id) !== String(doctor._id)) {
    throw new AppError('You do not have permission to access this doctor profile.', HTTP_STATUS.FORBIDDEN);
  }
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildDoctorFilter = ({ clinicId, search, specialization, isActive }) => {
  const filter = {
    $and: [
      {
        $or: [
          { clinicId },
          { 'availability.clinicId': clinicId }
        ]
      }
    ]
  };

  if (specialization) {
    filter.specialization = { $regex: escapeRegex(specialization), $options: 'i' };
  }

  if (typeof isActive === 'boolean') {
    filter.isActive = isActive;
  }

  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$and.push({
      $or: [
        { doctorCode: pattern },
        { firstName: pattern },
        { lastName: pattern },
        { fullName: pattern },
        { phone: pattern },
        { email: pattern },
        { specialization: pattern }
      ]
    });
  }

  return filter;
};

const getScopedDoctor = async ({ requester, doctorId, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId
  });
  
  const Doctor = require('./doctor.model');
  let doctor;
  if (requester.role === ROLES.RECEPTIONIST) {
    doctor = await Doctor.findOne({ _id: doctorId, organizationId: requester.organizationId });
  } else {
    doctor = await doctorRepository.findDoctorByIdAndClinic({ doctorId, clinicId });
  }

  if (!doctor) {
    throw new AppError('Doctor not found', HTTP_STATUS.NOT_FOUND);
  }

  return doctor;
};

const createDoctor = async ({ requester, payload, requestedClinicId = null, req }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId: requestedClinicId || payload.clinicId
  });

  const assignedClinics = payload.assignedClinics && payload.assignedClinics.length > 0
    ? payload.assignedClinics
    : [clinicId];

  const doctor = await doctorRepository.createDoctor({
    ...payload,
    clinicId,
    assignedClinics,
    availability: normalizeAvailability(payload.availability || []),
    doctorCode: await generateDoctorCode(clinicId),
    createdBy: requester._id,
    updatedBy: requester._id,
    image: '',
    documentPdf: ''
  });

  if (payload.image) {
    await processAndSaveFile(doctor, 'image', payload.image, 'doctor_photo');
  }
  if (payload.documentPdf) {
    await processAndSaveFile(doctor, 'documentPdf', payload.documentPdf, 'doctor_document');
  }
  if (payload.image || payload.documentPdf) {
    await doctor.save();
  }

  await createAuditLog({
    actorUserId: requester._id,
    action: 'DOCTOR_CREATED',
    entity: 'Doctor',
    entityId: doctor._id,
    metadata: {
      doctorCode: doctor.doctorCode,
      clinicId: String(clinicId)
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  return resolveDoctorFiles(doctor);
};

const listDoctors = async ({ requester, query }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId: query.clinicId
  });
  const { page, limit } = getPagination(query);
  const filter = buildDoctorFilter({
    clinicId,
    search: query.search,
    specialization: query.specialization,
    isActive: query.isActive
  });
  const { doctors, total } = await doctorRepository.listDoctors({ filter, page, limit });

  const resolvedDoctors = await Promise.all(doctors.map((doc) => resolveDoctorFiles(doc)));

  return {
    doctors: resolvedDoctors,
    pagination: buildPaginationMeta({ page, limit, total })
  };
};

const getDoctorById = async ({ requester, doctorId, requestedClinicId = null }) => {
  const doctor = await getScopedDoctor({ requester, doctorId, requestedClinicId });
  await ensureDoctorSelfAccess({
    requester,
    clinicId: doctor.clinicId,
    doctor
  });

  return resolveDoctorFiles(doctor);
};

const updateDoctor = async ({ requester, doctorId, payload, requestedClinicId = null, req }) => {
  const doctor = await getScopedDoctor({ requester, doctorId, requestedClinicId });

  if (payload.image !== undefined) {
    await processAndSaveFile(doctor, 'image', payload.image, 'doctor_photo');
  }
  if (payload.documentPdf !== undefined) {
    await processAndSaveFile(doctor, 'documentPdf', payload.documentPdf, 'doctor_document');
  }
  if (payload.signature !== undefined) {
    await processAndSaveFile(doctor, 'signature', payload.signature, 'doctor_signature');
  }

  if (payload.bankAccount && payload.bankAccount.passbookCopy !== undefined) {
    const currentRef = doctor.bankAccount?.passbookCopy;
    const newContent = payload.bankAccount.passbookCopy;
    if (newContent && newContent.startsWith('data:')) {
      const fileRef = await gridFsStorage.uploadBase64(newContent, 'passbook_copy');
      if (currentRef && currentRef.startsWith('gridfs:')) {
        await gridFsStorage.deleteFile(currentRef);
      }
      if (!doctor.bankAccount) doctor.bankAccount = {};
      doctor.bankAccount.passbookCopy = fileRef;
    } else {
      if (newContent === '' || !newContent) {
        if (currentRef && currentRef.startsWith('gridfs:')) {
          await gridFsStorage.deleteFile(currentRef);
        }
      }
      if (!doctor.bankAccount) doctor.bankAccount = {};
      doctor.bankAccount.passbookCopy = newContent || '';
    }
  }

  const { image, documentPdf, signature, bankAccount, ...otherPayload } = payload;

  if (bankAccount) {
    if (!doctor.bankAccount) {
      doctor.bankAccount = {};
    }
    if (bankAccount.accountNumber !== undefined) doctor.bankAccount.accountNumber = bankAccount.accountNumber;
    if (bankAccount.ifscCode !== undefined) doctor.bankAccount.ifscCode = bankAccount.ifscCode;
    if (bankAccount.bankName !== undefined) doctor.bankAccount.bankName = bankAccount.bankName;
    if (bankAccount.accountHolderName !== undefined) doctor.bankAccount.accountHolderName = bankAccount.accountHolderName;
  }

  if (otherPayload.clinicId) {
    const currentAssigned = otherPayload.assignedClinics || doctor.assignedClinics || [];
    const assignedStr = currentAssigned.map((id) => id.toString());
    if (!assignedStr.includes(otherPayload.clinicId.toString())) {
      otherPayload.assignedClinics = [...currentAssigned, otherPayload.clinicId];
    }
  } else if (
    otherPayload.assignedClinics &&
    !otherPayload.assignedClinics.map((id) => id.toString()).includes(doctor.clinicId.toString())
  ) {
    otherPayload.assignedClinics = [...otherPayload.assignedClinics, doctor.clinicId];
  }

  let availabilityChanged = false;
  let newAvailability = doctor.availability;
  if (payload.availability) {
    if (!Array.isArray(payload.availability) || payload.availability.length === 0) {
      throw new AppError('Weekly availability slots must be compulsorily assigned.', HTTP_STATUS.BAD_REQUEST);
    }
    const activeSlots = payload.availability.filter((a) => a.isAvailable);
    if (activeSlots.length === 0) {
      throw new AppError('At least one weekly slot must be marked as available.', HTTP_STATUS.BAD_REQUEST);
    }
    await validateAvailabilitySlots(doctor, payload.availability);
    newAvailability = normalizeAvailability(payload.availability);
    doctor.hasAcceptedSlot = false;
    availabilityChanged = true;
  }

  Object.assign(doctor, otherPayload, {
    availability: newAvailability,
    updatedBy: requester._id
  });
  await doctor.save();

  if (availabilityChanged) {
    const User = require('../users/user.model');
    await User.updateOne({ _id: doctor.userId }, { $set: { hasAcceptedSlot: false } });
  }

  await createAuditLog({
    actorUserId: requester._id,
    action: 'DOCTOR_UPDATED',
    entity: 'Doctor',
    entityId: doctor._id,
    metadata: {
      doctorCode: doctor.doctorCode
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  return resolveDoctorFiles(doctor);
};

const updateDoctorAvailability = async ({ requester, doctorId, availability, requestedClinicId = null, req }) => {
  const doctor = await getScopedDoctor({ requester, doctorId, requestedClinicId });

  if (!availability || !Array.isArray(availability) || availability.length === 0) {
    throw new AppError('Weekly availability slots must be compulsorily assigned.', HTTP_STATUS.BAD_REQUEST);
  }
  const activeSlots = availability.filter((a) => a.isAvailable);
  if (activeSlots.length === 0) {
    throw new AppError('At least one weekly slot must be marked as available.', HTTP_STATUS.BAD_REQUEST);
  }

  await validateAvailabilitySlots(doctor, availability);

  doctor.availability = normalizeAvailability(availability);
  doctor.hasAcceptedSlot = false;
  doctor.updatedBy = requester._id;
  await doctor.save();

  const User = require('../users/user.model');
  await User.updateOne({ _id: doctor.userId }, { $set: { hasAcceptedSlot: false } });

  await createAuditLog({
    actorUserId: requester._id,
    action: 'DOCTOR_AVAILABILITY_UPDATED',
    entity: 'Doctor',
    entityId: doctor._id,
    metadata: {
      doctorCode: doctor.doctorCode,
      availabilityCount: availability.length
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  return doctor;
};

const getDoctorAvailability = async ({ requester, doctorId, requestedClinicId = null }) => {
  const doctor = await getScopedDoctor({ requester, doctorId, requestedClinicId });
  await ensureDoctorSelfAccess({
    requester,
    clinicId: doctor.clinicId,
    doctor
  });

  return {
    doctorId: doctor._id,
    doctorCode: doctor.doctorCode,
    fullName: doctor.fullName,
    availability: doctor.availability || [],
    blockedSlots: doctor.blockedSlots || []
  };
};

const addDoctorBlockedSlot = async ({ requester, doctorId, payload, requestedClinicId = null, req }) => {
  const doctor = await getScopedDoctor({ requester, doctorId, requestedClinicId });
  await ensureDoctorSelfAccess({
    requester,
    clinicId: doctor.clinicId,
    doctor
  });

  const blockedSlotDate = normalizeDate(payload.date);
  const overlappingBlockedSlot = (doctor.blockedSlots || []).find(
    (item) => formatDate(item.date) === formatDate(blockedSlotDate) && isTimeRangeOverlap(payload.startTime, payload.endTime, item.startTime, item.endTime)
  );

  if (overlappingBlockedSlot) {
    throw new AppError('Blocked slot overlaps with an existing blocked slot.', HTTP_STATUS.CONFLICT);
  }

  doctor.blockedSlots = [
    ...(doctor.blockedSlots || []),
    {
      date: blockedSlotDate,
      startTime: payload.startTime,
      endTime: payload.endTime,
      reason: payload.reason || ''
    }
  ];
  doctor.updatedBy = requester._id;
  await doctor.save();

  await createAuditLog({
    actorUserId: requester._id,
    action: 'doctor_slot_blocked',
    entity: 'Doctor',
    entityId: doctor._id,
    metadata: {
      doctorCode: doctor.doctorCode,
      date: formatDate(blockedSlotDate),
      startTime: payload.startTime,
      endTime: payload.endTime,
      reason: payload.reason || ''
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  return doctor;
};

const deleteDoctor = async ({ requester, doctorId, requestedClinicId = null, req }) => {
  const doctor = await getScopedDoctor({ requester, doctorId, requestedClinicId });

  doctor.isActive = false;
  doctor.updatedBy = requester._id;
  await doctor.save();

  await createAuditLog({
    actorUserId: requester._id,
    action: 'DOCTOR_SOFT_DELETED',
    entity: 'Doctor',
    entityId: doctor._id,
    metadata: {
      doctorCode: doctor.doctorCode
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  return doctor;
};

const getMyProfile = async ({ requester }) => {
  const Doctor = require('./doctor.model');
  const doctor = await Doctor.findOne({ userId: requester._id })
    .populate('clinicId', 'name code address phone')
    .populate('userId', 'email name role');
  if (!doctor) {
    throw new AppError('Doctor profile not found', HTTP_STATUS.NOT_FOUND);
  }
  return resolveDoctorFiles(doctor);
};

const updateMyProfile = async ({ requester, payload }) => {
  const Doctor = require('./doctor.model');
  const doctor = await Doctor.findOne({ userId: requester._id });
  if (!doctor) {
    throw new AppError('Doctor profile not found', HTTP_STATUS.NOT_FOUND);
  }

  if (payload.image !== undefined) {
    await processAndSaveFile(doctor, 'image', payload.image, 'doctor_photo');
  }
  if (payload.documentPdf !== undefined) {
    await processAndSaveFile(doctor, 'documentPdf', payload.documentPdf, 'doctor_document');
  }
  if (payload.signature !== undefined) {
    await processAndSaveFile(doctor, 'signature', payload.signature, 'doctor_signature');
  }

  const allowedFields = [
    'specialization',
    'qualification',
    'medicalRegistrationNumber',
    'experienceYears',
    'consultationFee',
    'followUpFee',
    'isOnlineAvailable',
    'organizationId',
    'currentAddress',
    'permanentAddress',
    'preferredPracticeLocation',
    'phone',
    'signature'
  ];

  for (const field of allowedFields) {
    if (payload[field] !== undefined) {
      doctor[field] = payload[field];
    }
  }
  
  // Handle bank account updates explicitly
  if (payload.bankAccount) {
    if (!doctor.bankAccount) doctor.bankAccount = {};
    const ba = payload.bankAccount;
    if (ba.accountNumber !== undefined) doctor.bankAccount.accountNumber = ba.accountNumber;
    if (ba.ifscCode !== undefined) doctor.bankAccount.ifscCode = ba.ifscCode;
    if (ba.bankName !== undefined) doctor.bankAccount.bankName = ba.bankName;
    if (ba.accountHolderName !== undefined) doctor.bankAccount.accountHolderName = ba.accountHolderName;
    if (ba.passbookCopy !== undefined) doctor.bankAccount.passbookCopy = ba.passbookCopy;
  }
  
  if (payload.organizationId !== undefined) {
    const User = require('../users/user.model');
    await User.updateOne({ _id: requester._id }, { $set: { organizationId: payload.organizationId || null } });
  }

  await doctor.save();
  return resolveDoctorFiles(doctor);
};

const submitMyProfile = async ({ requester, payload }) => {
  const Doctor = require('./doctor.model');
  const User = require('../users/user.model');

  const doctor = await Doctor.findOne({ userId: requester._id });
  if (!doctor) {
    throw new AppError('Doctor profile not found', HTTP_STATUS.NOT_FOUND);
  }

  if (payload.image !== undefined) {
    await processAndSaveFile(doctor, 'image', payload.image, 'doctor_photo');
  }
  if (payload.documentPdf !== undefined) {
    await processAndSaveFile(doctor, 'documentPdf', payload.documentPdf, 'doctor_document');
  }
  if (payload.signature !== undefined) {
    await processAndSaveFile(doctor, 'signature', payload.signature, 'doctor_signature');
  }

  const allowedFields = [
    'specialization',
    'qualification',
    'medicalRegistrationNumber',
    'experienceYears',
    'consultationFee',
    'followUpFee',
    'isOnlineAvailable',
    'organizationId',
    'currentAddress',
    'permanentAddress',
    'preferredPracticeLocation',
    'phone',
    'signature'
  ];

  for (const field of allowedFields) {
    if (payload[field] !== undefined) {
      doctor[field] = payload[field];
    }
  }

  if (payload.organizationId !== undefined) {
    await User.updateOne({ _id: requester._id }, { $set: { organizationId: payload.organizationId || null } });
  }

  // Strict validation for submission
  if (!doctor.specialization?.trim()) {
    throw new AppError('Specialization is required for submission.', HTTP_STATUS.BAD_REQUEST);
  }
  if (!doctor.qualification?.trim()) {
    throw new AppError('Qualification is required for submission.', HTTP_STATUS.BAD_REQUEST);
  }
  if (!doctor.medicalRegistrationNumber?.trim()) {
    throw new AppError('Medical Registration Number is required for submission.', HTTP_STATUS.BAD_REQUEST);
  }
  if (!doctor.documentPdf?.trim()) {
    throw new AppError('Document PDF is compulsory and must be uploaded.', HTTP_STATUS.BAD_REQUEST);
  }
  if (!doctor.organizationId) {
    throw new AppError('Organization selection is required for submission.', HTTP_STATUS.BAD_REQUEST);
  }

  // Update status to pending_approval
  doctor.approvalStatus = 'pending_approval';
  doctor.reEditFields = {};
  doctor.reEditComments = '';
  await doctor.save();

  await User.updateOne(
    { _id: requester._id },
    { $set: { approvalStatus: 'pending_approval', reEditFields: {}, reEditComments: '' } }
  );

  return resolveDoctorFiles(doctor);
};

const acceptMySlot = async ({ requester }) => {
  const Doctor = require('./doctor.model');
  const User = require('../users/user.model');

  const doctor = await Doctor.findOne({ userId: requester._id });
  if (!doctor) {
    throw new AppError('Doctor profile not found', HTTP_STATUS.NOT_FOUND);
  }

  doctor.hasAcceptedSlot = true;
  doctor.initialSlotAccepted = true;
  await doctor.save();

  await User.updateOne(
    { _id: requester._id },
    { $set: { hasAcceptedSlot: true, initialSlotAccepted: true } }
  );

  return resolveDoctorFiles(doctor);
};

const validateAvailabilitySlots = async (doctor, availability) => {
  const activeSlots = availability.filter((a) => a.isAvailable);
  if (activeSlots.length === 0) return;

  const Clinic = require('../clinics/clinic.model');
  const primaryClinicId = doctor.clinicId;
  if (!primaryClinicId) return; // Doctor must have a primary clinic assigned

  // Fetch coordinates for all clinics involved
  const clinicIds = Array.from(new Set([
    primaryClinicId.toString(),
    ...activeSlots.map((s) => s.clinicId ? s.clinicId.toString() : null).filter(Boolean)
  ]));

  const clinics = await Clinic.find({ _id: { $in: clinicIds } });
  const clinicsMap = clinics.reduce((acc, c) => {
    acc[c._id.toString()] = c;
    return acc;
  }, {});

  const primaryClinic = clinicsMap[primaryClinicId.toString()];
  if (!primaryClinic) return;

  const lat1 = primaryClinic.address?.latitude;
  const lon1 = primaryClinic.address?.longitude;

  // Haversine distance helper
  const calculateDistance = (la1, lo1, la2, lo2) => {
    if (
      la1 === null || lo1 === null || la2 === null || lo2 === null ||
      la1 === undefined || lo1 === undefined || la2 === undefined || lo2 === undefined
    ) {
      return null;
    }
    const R = 6371; // km
    const dLat = ((la2 - la1) * Math.PI) / 180;
    const dLon = ((lo2 - lo1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((la1 * Math.PI) / 180) *
        Math.cos((la2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const assignedClinics = doctor.assignedClinics || [primaryClinicId];
  const assignedClinicsStr = assignedClinics.map((id) => id.toString());

  for (const slot of activeSlots) {
    if (!slot.clinicId) continue;

    if (!assignedClinicsStr.includes(slot.clinicId.toString())) {
      const slotClinic = clinicsMap[slot.clinicId.toString()];
      throw new AppError(
        `Doctor is not assigned to the clinic "${slotClinic?.name || 'Clinic'}". You must assign this clinic to the doctor first.`,
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const slotClinic = clinicsMap[slot.clinicId.toString()];
    if (!slotClinic) continue;

    const lat2 = slotClinic.address?.latitude;
    const lon2 = slotClinic.address?.longitude;

    const distance = calculateDistance(lat1, lon1, lat2, lon2);
    if (distance !== null) {
      if (distance > 15) {
        if (slot.consultationMode !== 'online') {
          throw new AppError(
            `Clinic ${slotClinic.name} is ${distance.toFixed(1)} km away (> 15 km). The consultation schedule must be conducted in online mode.`,
            HTTP_STATUS.BAD_REQUEST
          );
        }
      }
    }
  }

  // 2. Distance check (> 25 km) between any scheduled clinics on the same day
  const slotsByDay = activeSlots.reduce((acc, slot) => {
    if (!acc[slot.dayOfWeek]) acc[slot.dayOfWeek] = [];
    acc[slot.dayOfWeek].push(slot);
    return acc;
  }, {});

  for (const day of Object.keys(slotsByDay)) {
    const daySlots = slotsByDay[day];
    if (daySlots.length <= 1) continue;

    for (let i = 0; i < daySlots.length; i++) {
      for (let j = i + 1; j < daySlots.length; j++) {
        const s1 = daySlots[i];
        const s2 = daySlots[j];
        if (s1.clinicId && s2.clinicId && String(s1.clinicId) !== String(s2.clinicId)) {
          const c1 = clinicsMap[s1.clinicId.toString()];
          const c2 = clinicsMap[s2.clinicId.toString()];
          if (c1 && c2) {
            const latA = c1.address?.latitude || 0;
            const lonA = c1.address?.longitude || 0;
            const latB = c2.address?.latitude || 0;
            const lonB = c2.address?.longitude || 0;
            const d = calculateDistance(latA, lonA, latB, lonB);
            if (d !== null && d > 25) {
              const isS1Primary = String(s1.clinicId) === String(primaryClinicId);
              const targetSlot = isS1Primary ? s2 : s1;
              targetSlot.consultationMode = 'online';
            }
          }
        }
      }
    }
  }

  // 3. Gap constraint validations (at least 1h 30m / 90 minutes) on the same day
  const { parseTimeToMinutes } = require('../../common/utils/slotUtils');

  for (const day of Object.keys(slotsByDay)) {
    const daySlots = slotsByDay[day];
    if (daySlots.length <= 1) continue;

    // Sort slots by startTime
    daySlots.sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

    for (let i = 0; i < daySlots.length - 1; i++) {
      const currentSlot = daySlots[i];
      const nextSlot = daySlots[i + 1];

      const currentEnd = parseTimeToMinutes(currentSlot.endTime);
      const nextStart = parseTimeToMinutes(nextSlot.startTime);

      if (nextStart - currentEnd < 90) {
        const currentClinicName = clinicsMap[currentSlot.clinicId?.toString()]?.name || 'Clinic';
        const nextClinicName = clinicsMap[nextSlot.clinicId?.toString()]?.name || 'Clinic';
        throw new AppError(
          `There must be a gap of at least 1 hour 30 minutes between sessions on ${day} (${currentClinicName} ends at ${currentSlot.endTime}, ${nextClinicName} starts at ${nextSlot.startTime}).`,
          HTTP_STATUS.BAD_REQUEST
        );
      }
    }
  }
};

module.exports = {
  createDoctor,
  listDoctors,
  getDoctorById,
  updateDoctor,
  getDoctorAvailability,
  updateDoctorAvailability,
  addDoctorBlockedSlot,
  deleteDoctor,
  getMyProfile,
  updateMyProfile,
  submitMyProfile,
  acceptMySlot,
  resolveDoctorFiles,
  validateAvailabilitySlots
};
