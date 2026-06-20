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
  const { clinicId, specialization, qualification, experienceYears, consultationFee, availability } = req.body;

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

  if (req.user?.organizationId && String(user.organizationId) !== String(req.user.organizationId)) {
    throw new AppError('Unauthorized access to this doctor', HTTP_STATUS.FORBIDDEN);
  }

  // Find or create Doctor profile
  let doctor = await Doctor.findOne({ userId: user._id });

  // Clinic Specialization Check
  const clinic = await Clinic.findById(clinicId);
  if (!clinic) {
    throw new AppError('Clinic not found', HTTP_STATUS.NOT_FOUND);
  }

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

  const clinicHasSpec = clinic.specializations && clinic.specializations.some(
    (id) => id.toString() === specDoc._id.toString()
  );
  if (!clinicHasSpec) {
    throw new AppError(
      `Specialization "${chosenSpecialization}" is not assigned to the clinic "${clinic.name}". Admin can only assign the doctor to a clinic that has this specialization.`,
      HTTP_STATUS.BAD_REQUEST
    );
  }

  if (!availability || !Array.isArray(availability) || availability.length === 0) {
    throw new AppError('Weekly availability slots must be compulsorily assigned during approval.', HTTP_STATUS.BAD_REQUEST);
  }

  const activeSlots = availability.filter((a) => a.isAvailable);
  if (activeSlots.length === 0) {
    throw new AppError('At least one weekly slot must be marked as available.', HTTP_STATUS.BAD_REQUEST);
  }

  // Find or create Doctor profile
  const doctorCode = await generateDoctorCode(clinicId);
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

  // Update profile with Super Admin appointed details
  doctor.clinicId = clinicId;
  doctor.assignedClinics = [clinicId];
  doctor.doctorCode = doctorCode;
  doctor.isActive = true;
  doctor.approvalStatus = 'approved';
  doctor.hasAcceptedSlot = false;
  doctor.initialSlotAccepted = false;
  doctor.organizationId = req.user?.organizationId || user.organizationId || doctor.organizationId;
  
  if (specialization) doctor.specialization = specialization;
  if (qualification) doctor.qualification = qualification;
  if (experienceYears !== undefined) doctor.experienceYears = Number(experienceYears);
  if (consultationFee !== undefined) doctor.consultationFee = Number(consultationFee);
  
  // Validate timing slots & distance constraints
  await doctorService.validateAvailabilitySlots(doctor, availability);
  
  doctor.availability = availability;

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
  const orgFilter = req.user?.organizationId ? { organizationId: req.user.organizationId } : {};

  // 1. Fetch approved doctors
  const approvedDoctors = await Doctor.find({ approvalStatus: 'approved', ...orgFilter }).populate('clinicId', 'name code').lean();

  // 2. Fetch pending/re-edit doctors
  const pendingUsers = await User.find({ role: 'DOCTOR', approvalStatus: { $in: ['pending_profile', 'pending_approval', 're_edit'] }, ...orgFilter }).lean();
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
        if (!req.user?.organizationId || String(bestDocProfile.organizationId) === String(req.user.organizationId)) {
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

module.exports = {
  listBillingAnomalies,
  getBillingAnomalyById,
  reviewBillingAnomaly,
  listPendingDoctors,
  approveDoctor,
  rejectDoctor,
  reEditDoctor,
  getMyDoctorsDashboard
};
