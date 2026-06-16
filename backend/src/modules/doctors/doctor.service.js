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
    slotDurationMinutes: Number(item.slotDurationMinutes || 30)
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
  const filter = { clinicId };

  if (specialization) {
    filter.specialization = { $regex: escapeRegex(specialization), $options: 'i' };
  }

  if (typeof isActive === 'boolean') {
    filter.isActive = isActive;
  }

  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [
      { doctorCode: pattern },
      { firstName: pattern },
      { lastName: pattern },
      { fullName: pattern },
      { phone: pattern },
      { email: pattern },
      { specialization: pattern }
    ];
  }

  return filter;
};

const getScopedDoctor = async ({ requester, doctorId, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId
  });
  const doctor = await doctorRepository.findDoctorByIdAndClinic({ doctorId, clinicId });

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

  const doctor = await doctorRepository.createDoctor({
    ...payload,
    clinicId,
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

  const { image, documentPdf, ...otherPayload } = payload;

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
  const doctor = await Doctor.findOne({ userId: requester._id }).populate('clinicId', 'name code address phone');
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

  const allowedFields = [
    'specialization',
    'qualification',
    'medicalRegistrationNumber',
    'experienceYears',
    'consultationFee',
    'followUpFee',
    'isOnlineAvailable',
    'organizationId'
  ];

  for (const field of allowedFields) {
    if (payload[field] !== undefined) {
      doctor[field] = payload[field];
    }
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

  const allowedFields = [
    'specialization',
    'qualification',
    'medicalRegistrationNumber',
    'experienceYears',
    'consultationFee',
    'followUpFee',
    'isOnlineAvailable',
    'organizationId'
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
  resolveDoctorFiles
};
