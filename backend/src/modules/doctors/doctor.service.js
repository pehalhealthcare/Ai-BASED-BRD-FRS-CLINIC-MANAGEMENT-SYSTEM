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

const buildDoctorFilter = ({ clinicIds, search, specialization, isActive, approvalStatus = 'approved' }) => {
  const filter = {
    $and: [
      {
        $or: [
          { clinicId: { $in: clinicIds } },
          { 'availability.clinicId': { $in: clinicIds } },
          { assignedClinics: { $in: clinicIds } }
        ]
      }
    ]
  };

  if (approvalStatus) {
    filter.approvalStatus = approvalStatus;
  }

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
  const mongoose = require('mongoose');
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId
  });
  
  const Doctor = require('./doctor.model');
  let doctor = await Doctor.findById(doctorId);

  if (!doctor) {
    throw new AppError('Doctor not found', HTTP_STATUS.NOT_FOUND);
  }

  if (requester.role === ROLES.SUPER_ADMIN) {
    return doctor;
  }

  // Determine allowed clinic IDs based on requester role
  let allowedClinicIds = [];
  if (requester.role === ROLES.RECEPTIONIST || requester.role === ROLES.PATIENT) {
    allowedClinicIds = [new mongoose.Types.ObjectId(clinicId)];
  } else {
    // Admin can see doctors in the whole clinic group
    const Clinic = require('../clinics/clinic.model');
    const targetClinic = await Clinic.findById(clinicId).select('parentClinicId');
    const mainClinicId = targetClinic?.parentClinicId || clinicId;

    const clinicsInGroup = await Clinic.find({
      $or: [
        { _id: mainClinicId },
        { parentClinicId: mainClinicId }
      ]
    }).select('_id');

    allowedClinicIds = clinicsInGroup.map(c => c._id);
    if (!allowedClinicIds.some(id => String(id) === String(clinicId))) {
      allowedClinicIds.push(new mongoose.Types.ObjectId(clinicId));
    }
  }

  const allowedClinicStrs = allowedClinicIds.map(id => id.toString());
  
  const doctorClinicIdStr = doctor.clinicId ? doctor.clinicId.toString() : null;
  const assignedClinicStrs = (doctor.assignedClinics || []).map(id => id.toString());

  const hasAccess = (doctorClinicIdStr && allowedClinicStrs.includes(doctorClinicIdStr)) || 
                    assignedClinicStrs.some(id => allowedClinicStrs.includes(id));

  if (!hasAccess && requester.role !== ROLES.DOCTOR) {
    throw new AppError('Doctor not found in your clinic network', HTTP_STATUS.NOT_FOUND);
  }

  return doctor;
};

const createDoctor = async ({ requester, payload, requestedClinicId = null, req }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId: requestedClinicId || payload.clinicId
  });

  const User = require('../users/user.model');
  const Clinic = require('../clinics/clinic.model');
  const bcrypt = require('bcryptjs');
  const nodemailer = require('nodemailer');
  const { env } = require('../../config/env');
  const { logger } = require('../../common/utils/logger');

  const fullName = payload.fullName || `${payload.firstName || 'Doctor'} ${payload.lastName || ''}`.trim();
  const existingUser = await User.findOne({ email: payload.email.toLowerCase() });
  let newUser;

  if (existingUser) {
    // Check if a doctor profile already exists for this user ID
    const Doctor = require('./doctor.model');
    const existingDocProfile = await Doctor.findOne({ userId: existingUser._id });
    if (existingDocProfile) {
      throw new AppError('A doctor profile with this email address already exists', HTTP_STATUS.CONFLICT);
    }
    // If user exists (e.g. pre-created) but has no doctor profile, link to this user
    newUser = existingUser;
    if (newUser.role !== ROLES.DOCTOR && newUser.role !== ROLES.ADMIN) {
      newUser.role = ROLES.DOCTOR;
      await newUser.save();
    }
  } else {
    const hashedPassword = await bcrypt.hash(payload.phone, 10);
    newUser = await User.create({
      name: fullName,
      email: payload.email.toLowerCase(),
      phone: payload.phone,
      password: hashedPassword,
      role: ROLES.DOCTOR,
      clinicId,
      isActive: true,
      approvalStatus: 'pending_profile'
    });
  }

  const assignedClinics = payload.assignedClinics && payload.assignedClinics.length > 0
    ? payload.assignedClinics
    : [clinicId];

  const parts = fullName ? fullName.split(' ') : ['Doctor'];
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ') || '';

  const doctor = await doctorRepository.createDoctor({
    title: payload.title || 'Dr.',
    firstName,
    lastName,
    fullName,
    clinicId,
    userId: newUser._id,
    assignedClinics,
    email: payload.email.toLowerCase(),
    phone: payload.phone,
    approvalStatus: 'pending_profile',
    isActive: false,
    doctorCode: await generateDoctorCode(clinicId),
    createdBy: requester._id,
    updatedBy: requester._id
  });

  const clinic = await Clinic.findById(clinicId);
  const clinicName = clinic ? clinic.name : 'Gupta\'s CLlinic';

  const subject = `Welcome to ${clinicName}`;
  const body = `Hello ${fullName},

${clinicName} has invited you to join their clinic as a Doctor on AI-CMS.

Use the following credentials to activate your account:

* Email: ${newUser.email}
* Temporary Password: ${payload.phone}

During your first login, an OTP will be sent to your registered email address for verification.

After verification, you will complete your professional profile before it is reviewed by the Clinic Admin.`;

  try {
    const transporter = nodemailer.createTransport({
      host: env.emailHost,
      port: env.emailPort || 587,
      secure: !!env.emailSecure,
      auth: {
        user: env.emailUser,
        pass: env.emailPass
      }
    });
    await transporter.sendMail({
      from: env.emailFrom || `"AI-CMS Clinic" <noreply@aicms.local>`,
      to: newUser.email,
      subject,
      text: body,
      html: body.replace(/\n/g, '<br>')
    });
    logger.info(`[doctor:invite] Sent successfully to ${newUser.email}`);
  } catch (error) {
    logger.error('[doctor:invite] Failed to send email via SMTP', error);
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
    ipAddress: req?.ip || '127.0.0.1',
    userAgent: req?.get ? req.get('user-agent') : 'unknown',
    status: 'SUCCESS'
  });

  return resolveDoctorFiles(doctor);
};

const listDoctors = async ({ requester, query }) => {
  const mongoose = require('mongoose');
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId: query.clinicId
  });
  
  let clinicIds = [];
  if (requester.role === ROLES.RECEPTIONIST || requester.role === ROLES.PATIENT) {
    clinicIds = [new mongoose.Types.ObjectId(clinicId)];
  } else {
    const Clinic = require('../clinics/clinic.model');
    const targetClinic = await Clinic.findById(clinicId).select('parentClinicId');
    const mainClinicId = targetClinic?.parentClinicId || clinicId;

    const clinicsInGroup = await Clinic.find({
      $or: [
        { _id: mainClinicId },
        { parentClinicId: mainClinicId }
      ]
    }).select('_id');

    clinicIds = clinicsInGroup.map(c => c._id);
    if (!clinicIds.some(id => String(id) === String(clinicId))) {
      clinicIds.push(new mongoose.Types.ObjectId(clinicId));
    }
  }

  const { page, limit } = getPagination(query);
  const filter = buildDoctorFilter({
    clinicIds,
    search: query.search,
    specialization: query.specialization,
    isActive: query.isActive,
    approvalStatus: query.approvalStatus || 'approved'
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

  const assignmentFields = ['clinicId', 'assignedClinics', 'availability', 'consultationDuration', 'clinicPolicies', 'leavePolicy'];
  let hasAssignmentChanges = false;
  let pendingData = doctor.pendingAssignment || {};

  assignmentFields.forEach(field => {
    if (otherPayload[field] !== undefined) {
      hasAssignmentChanges = true;
      pendingData[field] = otherPayload[field];
      delete otherPayload[field];
    }
  });

  if (hasAssignmentChanges) {
    if (pendingData.availability) {
      if (!Array.isArray(pendingData.availability) || pendingData.availability.length === 0) {
        throw new AppError('Weekly availability slots must be compulsorily assigned.', HTTP_STATUS.BAD_REQUEST);
      }
      const activeSlots = pendingData.availability.filter((a) => a.isAvailable);
      if (activeSlots.length === 0) {
        throw new AppError('At least one weekly slot must be marked as available.', HTTP_STATUS.BAD_REQUEST);
      }
      await validateAvailabilitySlots(doctor, pendingData.availability);
      pendingData.availability = normalizeAvailability(pendingData.availability);
    }
    
    if (pendingData.clinicId && !pendingData.assignedClinics) {
      const currentAssigned = doctor.assignedClinics || [];
      const assignedStr = currentAssigned.map((id) => id.toString());
      if (!assignedStr.includes(pendingData.clinicId.toString())) {
        pendingData.assignedClinics = [...currentAssigned, pendingData.clinicId];
      }
    }

    doctor.pendingAssignment = pendingData;
    doctor.assignmentStatus = 'pending_acceptance';
  }

  Object.assign(doctor, otherPayload, {
    updatedBy: requester._id
  });
  await doctor.save();

  if (hasAssignmentChanges) {
    try {
      const { sendDoctorAssignmentUpdateNotification } = require('../notifications/notification.service');
      if (sendDoctorAssignmentUpdateNotification) {
        await sendDoctorAssignmentUpdateNotification({ doctor, actorUserId: requester._id });
      }
    } catch (err) {
      // Best effort
    }
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

  doctor.pendingAssignment = {
    ...(doctor.pendingAssignment || {}),
    availability: normalizeAvailability(availability)
  };
  doctor.assignmentStatus = 'pending_acceptance';
  doctor.updatedBy = requester._id;
  await doctor.save();

  try {
    const { sendDoctorAssignmentUpdateNotification } = require('../notifications/notification.service');
    if (sendDoctorAssignmentUpdateNotification) {
      await sendDoctorAssignmentUpdateNotification({ doctor, actorUserId: requester._id });
    }
  } catch (err) {
    // Best effort
  }

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
    'subSpeciality',
    'qualification',
    'medicalRegistrationNumber',
    'medicalCouncil',
    'experienceYears',
    'consultationFee',
    'followUpFee',
    'consultationDuration',
    'biography',
    'isOnlineAvailable',
    'organizationId',
    'currentAddress',
    'permanentAddress',
    'preferredPracticeLocation',
    'phone',
    'signature',
    'gender'
  ];

  for (const field of allowedFields) {
    if (payload[field] !== undefined) {
      doctor[field] = payload[field];
    }
  }

  // Handle fullName -> firstName/lastName split
  if (payload.fullName) {
    const parts = payload.fullName.trim().split(' ');
    doctor.firstName = parts[0];
    doctor.lastName = parts.slice(1).join(' ') || '';
    doctor.fullName = payload.fullName.trim();
  }

  // Handle dob as date
  if (payload.dob) {
    doctor.dob = new Date(payload.dob);
  }

  // Handle languagesSpoken (string or array)
  if (payload.languagesSpoken !== undefined) {
    if (typeof payload.languagesSpoken === 'string') {
      doctor.languagesSpoken = payload.languagesSpoken
        ? payload.languagesSpoken.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
    } else if (Array.isArray(payload.languagesSpoken)) {
      doctor.languagesSpoken = payload.languagesSpoken;
    }
  }

  // Handle availability slots
  if (payload.availability && Array.isArray(payload.availability)) {
    doctor.availability = payload.availability;
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
    'subSpeciality',
    'qualification',
    'medicalRegistrationNumber',
    'medicalCouncil',
    'experienceYears',
    'consultationFee',
    'followUpFee',
    'consultationDuration',
    'biography',
    'isOnlineAvailable',
    'organizationId',
    'currentAddress',
    'permanentAddress',
    'preferredPracticeLocation',
    'phone',
    'signature',
    'gender'
  ];

  for (const field of allowedFields) {
    if (payload[field] !== undefined) {
      doctor[field] = payload[field];
    }
  }

  // Handle fullName -> firstName/lastName split
  if (payload.fullName) {
    const parts = payload.fullName.trim().split(' ');
    doctor.firstName = parts[0];
    doctor.lastName = parts.slice(1).join(' ') || '';
    doctor.fullName = payload.fullName.trim();
  }

  // Handle dob as date
  if (payload.dob) {
    doctor.dob = new Date(payload.dob);
  }

  // Handle languagesSpoken (string or array)
  if (payload.languagesSpoken !== undefined) {
    if (typeof payload.languagesSpoken === 'string') {
      doctor.languagesSpoken = payload.languagesSpoken
        ? payload.languagesSpoken.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
    } else if (Array.isArray(payload.languagesSpoken)) {
      doctor.languagesSpoken = payload.languagesSpoken;
    }
  }

  // Handle availability slots
  if (payload.availability && Array.isArray(payload.availability)) {
    doctor.availability = payload.availability;
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

const acceptAssignmentChanges = async ({ requester, doctorId }) => {
  const doctor = await getScopedDoctor({ requester, doctorId });
  await ensureDoctorSelfAccess({ requester, clinicId: doctor.clinicId, doctor });

  if (doctor.assignmentStatus !== 'pending_acceptance') {
    throw new AppError('No pending assignment changes to accept.', HTTP_STATUS.BAD_REQUEST);
  }

  const pending = doctor.pendingAssignment || {};
  Object.assign(doctor, pending);
  doctor.pendingAssignment = null;
  doctor.assignmentStatus = 'active';
  doctor.assignmentVersion += 1;
  doctor.hasAcceptedSlot = true;
  doctor.initialSlotAccepted = true;
  await doctor.save();

  const User = require('../users/user.model');
  await User.updateOne({ _id: doctor.userId }, { $set: { hasAcceptedSlot: true } });

  await createAuditLog({
    actorUserId: requester._id,
    action: 'DOCTOR_ASSIGNMENT_ACCEPTED',
    entity: 'Doctor',
    entityId: doctor._id,
    metadata: {
      version: doctor.assignmentVersion
    },
    ipAddress: '127.0.0.1',
    userAgent: 'system',
    status: 'SUCCESS'
  });

  return doctor;
};

const declineAssignmentChanges = async ({ requester, doctorId }) => {
  const doctor = await getScopedDoctor({ requester, doctorId });
  await ensureDoctorSelfAccess({ requester, clinicId: doctor.clinicId, doctor });

  if (doctor.assignmentStatus !== 'pending_acceptance') {
    throw new AppError('No pending assignment changes to decline.', HTTP_STATUS.BAD_REQUEST);
  }

  doctor.pendingAssignment = null;
  doctor.assignmentStatus = 'declined';
  await doctor.save();

  await createAuditLog({
    actorUserId: requester._id,
    action: 'DOCTOR_ASSIGNMENT_DECLINED',
    entity: 'Doctor',
    entityId: doctor._id,
    metadata: {},
    ipAddress: '127.0.0.1',
    userAgent: 'system',
    status: 'SUCCESS'
  });

  return doctor;
};

const clarifyAssignmentChanges = async ({ requester, doctorId, clarification }) => {
  const doctor = await getScopedDoctor({ requester, doctorId });
  await ensureDoctorSelfAccess({ requester, clinicId: doctor.clinicId, doctor });

  if (doctor.assignmentStatus !== 'pending_acceptance') {
    throw new AppError('No pending assignment changes to request clarification on.', HTTP_STATUS.BAD_REQUEST);
  }

  doctor.assignmentStatus = 'clarification_requested';
  doctor.assignmentClarification = clarification;
  await doctor.save();

  await createAuditLog({
    actorUserId: requester._id,
    action: 'DOCTOR_ASSIGNMENT_CLARIFICATION_REQUESTED',
    entity: 'Doctor',
    entityId: doctor._id,
    metadata: { clarification },
    ipAddress: '127.0.0.1',
    userAgent: 'system',
    status: 'SUCCESS'
  });

  return doctor;
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
  acceptAssignmentChanges,
  declineAssignmentChanges,
  clarifyAssignmentChanges,
  resolveDoctorFiles,
  validateAvailabilitySlots
};
