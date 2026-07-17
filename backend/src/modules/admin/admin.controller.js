const { sendSuccess } = require('../../common/utils/apiResponse');
const { asyncHandler } = require('../../common/utils/asyncHandler');
const billingAnomalyService = require('../billing/billingAnomaly.service');
const User = require('../users/user.model');
const Doctor = require('../doctors/doctor.model');
const doctorService = require('../doctors/doctor.service');
const { generateDoctorCode } = require('../../common/utils/generateDoctorCode');
const { AppError } = require('../../common/utils/AppError');
const { HTTP_STATUS } = require('../../common/constants/httpStatus');
const Clinic = require('../clinics/clinic.model');
const Specialization = require('../specializations/specialization.model');
const Receptionist = require('../receptionists/receptionist.model');
const receptionistService = require('../receptionists/receptionist.service');
const Staff = require('../staff/staff.model');
const staffService = require('../staff/staff.service');
const { generateReceptionistCode } = require('../../common/utils/generateReceptionistCode');

const listBillingAnomalies = asyncHandler(async (req, res) => {
  const data = await billingAnomalyService.listBillingAnomalies({
    requester: req.user,
    query: req.query,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Billing anomalies retrieved successfully', data);
});

const getBillingAnomalyById = asyncHandler(async (req, res) => {
  const anomaly = await billingAnomalyService.getBillingAnomalyById({
    requester: req.user,
    anomalyId: req.params.id,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Billing anomaly retrieved successfully', { anomaly });
});

const reviewBillingAnomaly = asyncHandler(async (req, res) => {
  const anomaly = await billingAnomalyService.reviewBillingAnomaly({
    requester: req.user,
    anomalyId: req.params.id,
    payload: req.body,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Billing anomaly review updated successfully', { anomaly });
});

const listPendingDoctors = asyncHandler(async (req, res) => {
  const orgFilter = req.user?.organizationId ? { organizationId: req.user.organizationId } : {};
  const pendingUsers = await User.find({ role: 'DOCTOR', approvalStatus: { $in: ['pending_profile', 'pending_approval', 're_edit'] }, ...orgFilter }).lean();
  const userIds = pendingUsers.map((u) => u._id);
  const doctorProfiles = await Doctor.find({ userId: { $in: userIds } }).lean();

  const resolvedProfiles = await Promise.all(
    doctorProfiles.map((p) => doctorService.resolveDoctorFiles(p))
  );

  const combined = pendingUsers.map((user) => {
    const profile = resolvedProfiles.find((p) => String(p.userId) === String(user._id));
    return {
      ...user,
      profile
    };
  });

  return sendSuccess(res, 'Pending doctors retrieved successfully', { pendingDoctors: combined });
});

const approveDoctor = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }

  if (user.role !== 'DOCTOR') {
    throw new AppError('User is not registered as a doctor', HTTP_STATUS.BAD_REQUEST);
  }

  if (user.approvalStatus === 'approved') {
    throw new AppError('Doctor is already approved', HTTP_STATUS.BAD_REQUEST);
  }

  if (user.approvalStatus !== 'pending_approval') {
    throw new AppError('Doctor has not completed and submitted their profile for approval yet.', HTTP_STATUS.BAD_REQUEST);
  }

  if (req.user?.organizationId && String(user.organizationId) !== String(req.user.organizationId)) {
    throw new AppError('Unauthorized access to this doctor', HTTP_STATUS.FORBIDDEN);
  }

  // Find or create Doctor profile
  let doctor = await Doctor.findOne({ userId: user._id });

  // Determine clinic: admin's clinic is used if not specified
  const clinicId = req.body.clinicId || req.user.clinicId;
  if (!clinicId) {
    throw new AppError('No clinic found. Admin must be assigned to a clinic.', HTTP_STATUS.BAD_REQUEST);
  }

  const clinic = await Clinic.findById(clinicId);
  if (!clinic) {
    throw new AppError('Clinic not found', HTTP_STATUS.NOT_FOUND);
  }

  // For new invitation flow (pending_approval): doctor has filled profile, use existing data
  // For legacy flow: admin supplies all details via request body
  const isNewInvitationFlow = user.approvalStatus === 'pending_approval' && (!req.body.availability || req.body.availability.length === 0);

  if (isNewInvitationFlow) {
    // Validate that doctor has filled in required profile fields
    if (!doctor) {
      throw new AppError('Doctor profile record not found. Cannot approve.', HTTP_STATUS.BAD_REQUEST);
    }
    if (!doctor.specialization?.trim()) {
      throw new AppError('Doctor has not filled in their specialization. Ask them to complete their profile first.', HTTP_STATUS.BAD_REQUEST);
    }
    if (!doctor.qualification?.trim()) {
      throw new AppError('Doctor has not filled in their qualification. Ask them to complete their profile first.', HTTP_STATUS.BAD_REQUEST);
    }
  } else {
    // Legacy flow: Admin provides all details
    const { assignedClinics, specialization, qualification, experienceYears, consultationFee, availability, clinicPolicies } = req.body;

    const chosenSpecialization = specialization || (doctor ? doctor.specialization : '');
    if (!chosenSpecialization || !chosenSpecialization.trim()) {
      throw new AppError('Specialization is required to approve the doctor profile', HTTP_STATUS.BAD_REQUEST);
    }

    const specDoc = await Specialization.findOne({
      name: { $regex: new RegExp(`^${chosenSpecialization.trim()}$`, 'i') },
      isActive: true
    });
    if (!specDoc) {
      throw new AppError(`Specialization "${chosenSpecialization}" is either not defined or inactive.`, HTTP_STATUS.BAD_REQUEST);
    }

    if (!availability || !Array.isArray(availability) || availability.length === 0) {
      throw new AppError('Weekly availability slots must be assigned during approval.', HTTP_STATUS.BAD_REQUEST);
    }

    const activeSlots = availability.filter((a) => a.isAvailable);
    if (activeSlots.length === 0) {
      throw new AppError('At least one weekly slot must be marked as available.', HTTP_STATUS.BAD_REQUEST);
    }

    // Create doctor profile if not exists
    const parts = user.name ? user.name.split(' ') : ['Doctor'];
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ') || '';

    if (!doctor) {
      doctor = new Doctor({
        userId: user._id,
        firstName,
        lastName,
        fullName: user.name,
        phone: user.phone || '9000000000',
        email: user.email,
        organizationId: req.user?.organizationId || user.organizationId,
        createdBy: req.user._id
      });
    }

    const resolvedAssignedClinics = Array.from(new Set([
      clinicId.toString(),
      ...(assignedClinics || []).map((id) => id.toString())
    ]));
    doctor.assignedClinics = resolvedAssignedClinics;

    if (specialization) doctor.specialization = specialization;
    if (qualification) doctor.qualification = qualification;
    if (experienceYears !== undefined) doctor.experienceYears = Number(experienceYears);
    if (consultationFee !== undefined) doctor.consultationFee = Number(consultationFee);
    if (clinicPolicies !== undefined) doctor.clinicPolicies = clinicPolicies;

    await doctorService.validateAvailabilitySlots(doctor, availability);
    doctor.availability = availability;
  }

  // Generate doctor code if not already assigned
  if (!doctor.doctorCode) {
    doctor.doctorCode = await generateDoctorCode(clinicId);
  }

  // Apply shared updates
  doctor.clinicId = clinicId;
  if (!doctor.assignedClinics || !doctor.assignedClinics.length) {
    doctor.assignedClinics = [clinicId];
  }
  doctor.isActive = true;
  doctor.approvalStatus = 'approved';
  doctor.hasAcceptedSlot = false;
  doctor.initialSlotAccepted = false;
  doctor.organizationId = req.user?.organizationId || user.organizationId || doctor.organizationId;
  doctor.updatedBy = req.user._id;
  await doctor.save();

  // Activate User and set clinic
  user.isActive = true;
  user.clinicId = clinicId;
  user.approvalStatus = 'approved';
  user.hasAcceptedSlot = false;
  user.initialSlotAccepted = false;
  user.organizationId = req.user?.organizationId || user.organizationId;
  await user.save();

  const resolvedDoctor = await doctorService.resolveDoctorFiles(doctor);

  return sendSuccess(res, 'Doctor approved and appointed successfully', { doctor: resolvedDoctor });
});


const rejectDoctor = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }

  if (user.role !== 'DOCTOR') {
    throw new AppError('User is not registered as a doctor', HTTP_STATUS.BAD_REQUEST);
  }

  if (req.user?.organizationId && String(user.organizationId) !== String(req.user.organizationId)) {
    throw new AppError('Unauthorized access to this doctor', HTTP_STATUS.FORBIDDEN);
  }

  user.approvalStatus = 'rejected';
  user.isActive = false;
  await user.save();

  const doctor = await Doctor.findOne({ userId: user._id });
  if (doctor) {
    doctor.approvalStatus = 'rejected';
    doctor.isActive = false;
    await doctor.save();
  }

  return sendSuccess(res, 'Doctor registration request rejected successfully');
});

const reEditDoctor = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { reEditFields, reEditComments } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }

  if (user.role !== 'DOCTOR') {
    throw new AppError('User is not registered as a doctor', HTTP_STATUS.BAD_REQUEST);
  }

  if (req.user?.organizationId && String(user.organizationId) !== String(req.user.organizationId)) {
    throw new AppError('Unauthorized access to this doctor', HTTP_STATUS.FORBIDDEN);
  }

  user.approvalStatus = 're_edit';
  user.reEditFields = reEditFields || {};
  user.reEditComments = reEditComments || '';
  await user.save();

  const doctor = await Doctor.findOne({ userId });
  if (doctor) {
    doctor.approvalStatus = 're_edit';
    doctor.reEditFields = reEditFields || {};
    doctor.reEditComments = reEditComments || '';
    await doctor.save();
  }

  return sendSuccess(res, 'Doctor profile marked for re-edit successfully', { user });
});

const getMyDoctorsDashboard = asyncHandler(async (req, res) => {
  const clinicIds = [req.user.clinicId];
  const Clinic = require('../clinics/clinic.model');
  const branches = await Clinic.find({ parentClinicId: req.user.clinicId }).select('_id');
  branches.forEach(b => clinicIds.push(b._id));
  const clinicFilter = { clinicId: { $in: clinicIds } };

  // 1. Fetch approved doctors
  const approvedDoctors = await Doctor.find({ approvalStatus: 'approved', ...clinicFilter }).populate('clinicId', 'name code').lean();

  // 2. Fetch pending/re-edit doctors
  const pendingUsers = await User.find({ role: 'DOCTOR', approvalStatus: { $in: ['pending_profile', 'pending_approval', 're_edit'] }, ...clinicFilter }).lean();
  const userIds = pendingUsers.map((u) => u._id);
  const doctorProfiles = await Doctor.find({ userId: { $in: userIds } }).lean();
  const resolvedPendingProfiles = await Promise.all(
    doctorProfiles.map((p) => doctorService.resolveDoctorFiles(p))
  );
  const pendingDoctorsCombined = pendingUsers.map((user) => {
    const profile = resolvedPendingProfiles.find((p) => String(p.userId) === String(user._id));
    return {
      ...user,
      profile
    };
  });

  // 3. Calculate doctor revenues
  const Invoice = require('../billing/invoice.model');
  const doctorRevenues = await Invoice.aggregate([
    {
      $lookup: {
        from: 'appointments',
        localField: 'appointmentId',
        foreignField: '_id',
        as: 'appointment'
      }
    },
    {
      $unwind: {
        path: '$appointment',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $lookup: {
        from: 'consultations',
        localField: 'consultationId',
        foreignField: '_id',
        as: 'consultation'
      }
    },
    {
      $unwind: {
        path: '$consultation',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        totalAmount: 1,
        doctorId: {
          $ifNull: ['$appointment.doctorId', '$consultation.doctorId']
        }
      }
    },
    {
      $match: {
        doctorId: { $ne: null }
      }
    },
    {
      $group: {
        _id: '$doctorId',
        totalRevenue: { $sum: '$totalAmount' }
      }
    },
    {
      $sort: { totalRevenue: -1 }
    }
  ]);

  const revenuesMap = {};
  doctorRevenues.forEach((r) => {
    if (r._id) {
      revenuesMap[String(r._id)] = r.totalRevenue || 0;
    }
  });

  const resolvedApprovedDoctors = await Promise.all(
    approvedDoctors.map(async (doc) => {
      const resolved = await doctorService.resolveDoctorFiles(doc);
      return {
        ...resolved,
        totalRevenue: revenuesMap[String(doc._id)] || 0
      };
    })
  );

  // 4. Count specializations categories
  const categories = {};
  resolvedApprovedDoctors.forEach((doc) => {
    const spec = doc.specialization || 'Unspecified';
    categories[spec] = (categories[spec] || 0) + 1;
  });

  let bestDoctor = null;
  if (doctorRevenues.length > 0) {
    for (const topDocRevenue of doctorRevenues) {
      const bestDocProfile = await Doctor.findById(topDocRevenue._id).populate('clinicId', 'name code').lean();
      if (bestDocProfile) {
        if (!req.user?.clinicId || clinicIds.map(String).includes(String(bestDocProfile.clinicId))) {
          const resolvedBestDoc = await doctorService.resolveDoctorFiles(bestDocProfile);
          bestDoctor = {
            ...resolvedBestDoc,
            totalRevenue: topDocRevenue.totalRevenue
          };
          break;
        }
      }
    }
  }

  return sendSuccess(res, 'My Doctors Dashboard data retrieved successfully', {
    doctors: resolvedApprovedDoctors,
    pendingDoctors: pendingDoctorsCombined,
    categories,
    bestDoctor
  });
});

const listPendingReceptionists = asyncHandler(async (req, res) => {
  const orgFilter = req.user?.organizationId ? { organizationId: req.user.organizationId } : {};
  const { STAFF_ROLES } = require('../../common/constants/roles');
  
  const pendingUsers = await User.find({
    role: { $in: STAFF_ROLES },
    approvalStatus: { $in: ['pending_profile', 'pending_approval', 're_edit', 'pending_invitation', 'otp_verification_pending', 'onboarding_in_progress', 'changes_requested'] },
    ...orgFilter
  }).lean();

  const userIds = pendingUsers.map((u) => u._id);
  const staffProfiles = await Staff.find({ userId: { $in: userIds } }).lean();
  const receptionistProfiles = await Receptionist.find({ userId: { $in: userIds } }).lean();

  const resolvedStaffProfiles = await Promise.all(
    staffProfiles.map((p) => staffService.resolveStaffFiles(p))
  );
  const resolvedRecProfiles = await Promise.all(
    receptionistProfiles.map((p) => receptionistService.resolveReceptionistFiles(p))
  );

  const combined = pendingUsers.map((user) => {
    let profile = resolvedStaffProfiles.find((p) => String(p.userId) === String(user._id));
    if (!profile) {
      profile = resolvedRecProfiles.find((p) => String(p.userId) === String(user._id));
    }
    return {
      ...user,
      profile
    };
  });

  return sendSuccess(res, 'Pending staff retrieved successfully', { pendingReceptionists: combined });
});

const approveReceptionist = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { clinicId, assignedClinics, qualification, experienceYears, availability } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }

  const { STAFF_ROLES } = require('../../common/constants/roles');
  if (!STAFF_ROLES.includes(user.role)) {
    throw new AppError('User is not registered as a staff member', HTTP_STATUS.BAD_REQUEST);
  }

  if (user.approvalStatus === 'approved') {
    throw new AppError('Staff member is already approved', HTTP_STATUS.BAD_REQUEST);
  }

  if (req.user?.organizationId && String(user.organizationId) !== String(req.user.organizationId)) {
    throw new AppError('Unauthorized access to this staff member', HTTP_STATUS.FORBIDDEN);
  }

  let staff = await Staff.findOne({ userId: user._id });
  let receptionist = await Receptionist.findOne({ userId: user._id });

  const clinic = await Clinic.findById(clinicId);
  if (!clinic) {
    throw new AppError('Clinic not found', HTTP_STATUS.NOT_FOUND);
  }

  if (!availability || !Array.isArray(availability) || availability.length === 0) {
    throw new AppError('Weekly shift hours must be compulsorily assigned during approval.', HTTP_STATUS.BAD_REQUEST);
  }

  const activeSlots = availability.filter((a) => a.isAvailable);
  if (activeSlots.length === 0) {
    throw new AppError('At least one shift slot must be marked as available.', HTTP_STATUS.BAD_REQUEST);
  }

  const staffCode = `STF-${String(user._id).slice(-4).toUpperCase()}`;
  const parts = user.name ? user.name.split(' ') : ['Staff'];
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ') || '';

  if (!staff) {
    staff = new Staff({
      userId: user._id,
      firstName,
      lastName,
      fullName: user.name,
      phone: user.phone || '9000000000',
      email: user.email,
      role: user.role,
      organizationId: req.user?.organizationId || user.organizationId,
      createdBy: req.user._id
    });
  }

  if (user.role === 'RECEPTIONIST' && !receptionist) {
    receptionist = new Receptionist({
      userId: user._id,
      firstName,
      lastName,
      fullName: user.name,
      phone: user.phone || '9000000000',
      email: user.email,
      organizationId: req.user?.organizationId || user.organizationId,
      createdBy: req.user._id
    });
  }

  const resolvedAssignedClinics = Array.from(new Set([
    clinicId.toString(),
    ...(assignedClinics || []).map((id) => id.toString())
  ]));

  if (resolvedAssignedClinics.length > 1) {
    throw new AppError('Staff can be assigned to at most one clinic branch.', HTTP_STATUS.BAD_REQUEST);
  }

  if (availability && Array.isArray(availability)) {
    for (const slot of availability) {
      if (slot.clinicId && slot.clinicId.toString() !== clinicId.toString()) {
        throw new AppError('All availability slots must match the assigned clinic branch.', HTTP_STATUS.BAD_REQUEST);
      }
    }
  }

  // Update unified staff model
  staff.clinicId = clinicId;
  staff.assignedClinics = resolvedAssignedClinics;
  staff.staffCode = staffCode;
  staff.isActive = true;
  staff.approvalStatus = 'approved';
  staff.hasAcceptedSlot = false; // Require staff to accept their assigned shift
  staff.initialSlotAccepted = false;
  staff.organizationId = req.user?.organizationId || user.organizationId || staff.organizationId;
  if (qualification) staff.qualification = qualification;
  if (experienceYears !== undefined) staff.experienceYears = Number(experienceYears);
  staff.availability = availability;
  staff.updatedBy = req.user._id;
  await staff.save();

  // If receptionist, update legacy receptionist model too
  if (receptionist) {
    receptionist.clinicId = clinicId;
    receptionist.assignedClinics = resolvedAssignedClinics;
    receptionist.receptionistCode = staffCode;
    receptionist.isActive = true;
    receptionist.approvalStatus = 'approved';
    receptionist.hasAcceptedSlot = false;
    receptionist.initialSlotAccepted = false;
    receptionist.organizationId = req.user?.organizationId || user.organizationId || receptionist.organizationId;
    if (qualification) receptionist.qualification = qualification;
    if (experienceYears !== undefined) receptionist.experienceYears = Number(experienceYears);
    receptionist.availability = availability;
    receptionist.updatedBy = req.user._id;
    await receptionist.save();
  }

  user.isActive = true;
  user.clinicId = clinicId;
  user.approvalStatus = 'approved';
  user.hasAcceptedSlot = false;
  user.initialSlotAccepted = false;
  user.organizationId = req.user?.organizationId || user.organizationId;
  await user.save();

  const resolvedStaff = await staffService.resolveStaffFiles(staff);

  return sendSuccess(res, 'Staff approved and appointed successfully', { receptionist: resolvedStaff });
});

const rejectReceptionist = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }

  const { STAFF_ROLES } = require('../../common/constants/roles');
  if (!STAFF_ROLES.includes(user.role)) {
    throw new AppError('User is not registered as a staff member', HTTP_STATUS.BAD_REQUEST);
  }

  if (req.user?.organizationId && String(user.organizationId) !== String(req.user.organizationId)) {
    throw new AppError('Unauthorized access to this staff member', HTTP_STATUS.FORBIDDEN);
  }

  user.approvalStatus = 'rejected';
  user.isActive = false;
  await user.save();

  const staff = await Staff.findOne({ userId: user._id });
  if (staff) {
    staff.approvalStatus = 'rejected';
    staff.isActive = false;
    await staff.save();
  }

  const receptionist = await Receptionist.findOne({ userId: user._id });
  if (receptionist) {
    receptionist.approvalStatus = 'rejected';
    receptionist.isActive = false;
    await receptionist.save();
  }

  return sendSuccess(res, 'Staff registration request rejected successfully');
});

const reEditReceptionist = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { reEditFields, reEditComments } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }

  const { STAFF_ROLES } = require('../../common/constants/roles');
  if (!STAFF_ROLES.includes(user.role)) {
    throw new AppError('User is not registered as a staff member', HTTP_STATUS.BAD_REQUEST);
  }

  if (req.user?.organizationId && String(user.organizationId) !== String(req.user.organizationId)) {
    throw new AppError('Unauthorized access to this staff member', HTTP_STATUS.FORBIDDEN);
  }

  user.approvalStatus = 'changes_requested';
  user.reEditFields = reEditFields || {};
  user.reEditComments = reEditComments || '';
  await user.save();

  const staff = await Staff.findOne({ userId });
  if (staff) {
    staff.approvalStatus = 'changes_requested';
    staff.reEditFields = reEditFields || {};
    staff.reEditComments = reEditComments || '';
    await staff.save();
  }

  const receptionist = await Receptionist.findOne({ userId });
  if (receptionist) {
    receptionist.approvalStatus = 'changes_requested';
    receptionist.reEditFields = reEditFields || {};
    receptionist.reEditComments = reEditComments || '';
    await receptionist.save();
  }

  return sendSuccess(res, 'Staff profile marked for changes request successfully', { user });
});

const getMyReceptionistsDashboard = asyncHandler(async (req, res) => {
  const clinicIds = [req.user.clinicId];
  const Clinic = require('../clinics/clinic.model');
  const branches = await Clinic.find({ parentClinicId: req.user.clinicId }).select('_id');
  branches.forEach(b => clinicIds.push(b._id));
  const clinicFilter = { clinicId: { $in: clinicIds } };

  const { STAFF_ROLES } = require('../../common/constants/roles');

  const approvedStaff = await Staff.find({ approvalStatus: 'approved', ...clinicFilter }).populate('clinicId', 'name code').populate('userId').lean();

  const pendingUsers = await User.find({
    role: { $in: STAFF_ROLES },
    approvalStatus: { $in: ['pending_profile', 'pending_approval', 're_edit', 'pending_invitation', 'otp_verification_pending', 'onboarding_in_progress', 'changes_requested'] },
    ...clinicFilter
  }).lean();

  const userIds = pendingUsers.map((u) => u._id);
  const staffProfiles = await Staff.find({ userId: { $in: userIds } }).lean();
  const receptionistProfiles = await Receptionist.find({ userId: { $in: userIds } }).lean();

  const resolvedPendingProfiles = await Promise.all(
    staffProfiles.map((p) => staffService.resolveStaffFiles(p))
  );
  const resolvedRecProfiles = await Promise.all(
    receptionistProfiles.map((p) => receptionistService.resolveReceptionistFiles(p))
  );

  const pendingStaffCombined = pendingUsers.map((user) => {
    let profile = resolvedPendingProfiles.find((p) => String(p.userId) === String(user._id));
    if (!profile) {
      profile = resolvedRecProfiles.find((p) => String(p.userId) === String(user._id));
    }
    return {
      ...user,
      profile
    };
  });

  const resolvedApprovedStaff = await Promise.all(
    approvedStaff.map((doc) => staffService.resolveStaffFiles(doc))
  );

  // If approvedStaff is empty, fallback to legacy receptionists for backward compatibility
  let finalApproved = resolvedApprovedStaff;
  if (finalApproved.length === 0) {
    const approvedReceptionists = await Receptionist.find({ approvalStatus: 'approved', ...clinicFilter }).populate('clinicId', 'name code').populate('userId').lean();
    finalApproved = await Promise.all(
      approvedReceptionists.map((doc) => receptionistService.resolveReceptionistFiles(doc))
    );
  }

  return sendSuccess(res, 'My Staff Dashboard data retrieved successfully', {
    receptionists: finalApproved,
    pendingReceptionists: pendingStaffCombined
  });
});

module.exports = {
  listBillingAnomalies,
  getBillingAnomalyById,
  reviewBillingAnomaly,
  listPendingDoctors,
  approveDoctor,
  rejectDoctor,
  reEditDoctor,
  getMyDoctorsDashboard,
  listPendingReceptionists,
  approveReceptionist,
  rejectReceptionist,
  reEditReceptionist,
  getMyReceptionistsDashboard
};
