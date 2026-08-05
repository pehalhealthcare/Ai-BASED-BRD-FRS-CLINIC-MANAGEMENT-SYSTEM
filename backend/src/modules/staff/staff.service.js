const Staff = require('./staff.model');
const User = require('../users/user.model');
const { AppError } = require('../../common/utils/AppError');
const { HTTP_STATUS } = require('../../common/constants/httpStatus');
const gridFsStorage = require('../../common/utils/gridFsStorage.service');

const resolveStaffFiles = async (staff) => {
  if (!staff) return null;
  const staffObj = staff.toObject ? staff.toObject() : staff;

  if (staffObj.image && staffObj.image.startsWith('gridfs:')) {
    staffObj.image = await gridFsStorage.downloadAsBase64(staffObj.image).catch(() => staffObj.image);
  }
  if (staffObj.documentPdf && staffObj.documentPdf.startsWith('gridfs:')) {
    staffObj.documentPdf = await gridFsStorage.downloadAsBase64(staffObj.documentPdf).catch(() => staffObj.documentPdf);
  }
  if (staffObj.signatureImage && staffObj.signatureImage.startsWith('gridfs:')) {
    staffObj.signatureImage = await gridFsStorage.downloadAsBase64(staffObj.signatureImage).catch(() => staffObj.signatureImage);
  }
  if (staffObj.certificationsPdf && staffObj.certificationsPdf.startsWith('gridfs:')) {
    staffObj.certificationsPdf = await gridFsStorage.downloadAsBase64(staffObj.certificationsPdf).catch(() => staffObj.certificationsPdf);
  }

  return staffObj;
};

const processAndSaveFile = async (staff, field, newContent, filename) => {
  const currentRef = staff[field];

  if (newContent && newContent.startsWith('data:')) {
    const fileRef = await gridFsStorage.uploadBase64(newContent, filename);
    if (currentRef && currentRef.startsWith('gridfs:')) {
      await gridFsStorage.deleteFile(currentRef).catch(() => {});
    }
    staff[field] = fileRef;
  } else {
    if (newContent === '' || !newContent) {
      if (currentRef && currentRef.startsWith('gridfs:')) {
        await gridFsStorage.deleteFile(currentRef).catch(() => {});
      }
    }
    staff[field] = newContent || '';
  }
};
const findOrCreateStaff = async (userId, requester) => {
  let staff = await Staff.findOne({ userId });
  if (!staff) {
    const parts = (requester.name || '').split(' ');
    const firstName = parts[0] || 'Staff';
    const lastName = parts.slice(1).join(' ') || '';
    const staffCode = `STF-${String(userId).slice(-4).toUpperCase()}`;

    const dbUser = await User.findById(userId);
    const clinicId = dbUser?.clinicId || requester.clinicId || null;
    const approvalStatus = dbUser?.approvalStatus || requester.approvalStatus || 'pending_profile';

    staff = await Staff.create({
      userId,
      clinicId,
      firstName,
      lastName,
      fullName: requester.name || dbUser?.name || 'Staff',
      phone: requester.phone || dbUser?.phone || '9000000000',
      email: requester.email || dbUser?.email,
      role: requester.role || dbUser?.role || 'NURSE',
      staffCode,
      isActive: false,
      approvalStatus
    });
  }
  return staff;
};

const getMyProfile = async ({ requester }) => {
  let staff = await findOrCreateStaff(requester._id, requester);
  staff = await Staff.findById(staff._id)
    .populate('clinicId', 'name code address phone')
    .populate('userId', 'email name role');
  return resolveStaffFiles(staff);
};

const updateMyProfile = async ({ requester, payload }) => {
  const staff = await findOrCreateStaff(requester._id, requester);

  if (payload.image !== undefined) {
    await processAndSaveFile(staff, 'image', payload.image, 'staff_photo');
  }
  if (payload.documentPdf !== undefined) {
    await processAndSaveFile(staff, 'documentPdf', payload.documentPdf, 'staff_document');
  }
  if (payload.signatureImage !== undefined) {
    await processAndSaveFile(staff, 'signatureImage', payload.signatureImage, 'staff_signature');
  }
  if (payload.certificationsPdf !== undefined) {
    await processAndSaveFile(staff, 'certificationsPdf', payload.certificationsPdf, 'staff_certifications');
  }

  const allowedFields = [
    'firstName',
    'lastName',
    'fullName',
    'gender',
    'dateOfBirth',
    'phone',
    'qualification',
    'experienceYears',
    'currentAddress',
    'permanentAddress',
    'availability'
  ];

  for (const field of allowedFields) {
    if (payload[field] !== undefined) {
      staff[field] = payload[field];
    }
  }

  await staff.save();

  // Sync with Receptionist collection if user is RECEPTIONIST
  if (requester.role === 'RECEPTIONIST') {
    const Receptionist = require('../receptionists/receptionist.model');
    const receptionist = await Receptionist.findOne({ userId: requester._id });
    if (receptionist) {
      if (payload.image !== undefined) receptionist.image = staff.image;
      if (payload.documentPdf !== undefined) receptionist.documentPdf = staff.documentPdf;
      
      const recFields = ['qualification', 'experienceYears', 'currentAddress', 'permanentAddress', 'phone'];
      for (const field of recFields) {
        if (payload[field] !== undefined) {
          receptionist[field] = payload[field];
        }
      }
      await receptionist.save();
    }
  }

  return resolveStaffFiles(staff);
};

const submitMyProfile = async ({ requester, payload }) => {
  const staff = await findOrCreateStaff(requester._id, requester);

  if (payload.image !== undefined) {
    await processAndSaveFile(staff, 'image', payload.image, 'staff_photo');
  }
  if (payload.documentPdf !== undefined) {
    await processAndSaveFile(staff, 'documentPdf', payload.documentPdf, 'staff_document');
  }
  if (payload.signatureImage !== undefined) {
    await processAndSaveFile(staff, 'signatureImage', payload.signatureImage, 'staff_signature');
  }
  if (payload.certificationsPdf !== undefined) {
    await processAndSaveFile(staff, 'certificationsPdf', payload.certificationsPdf, 'staff_certifications');
  }

  const allowedFields = [
    'firstName',
    'lastName',
    'fullName',
    'gender',
    'dateOfBirth',
    'phone',
    'qualification',
    'experienceYears',
    'currentAddress',
    'permanentAddress',
    'availability'
  ];

  for (const field of allowedFields) {
    if (payload[field] !== undefined) {
      staff[field] = payload[field];
    }
  }

  // Validations
  if (!staff.fullName?.trim()) {
    throw new AppError('Full Name is required for submission.', HTTP_STATUS.BAD_REQUEST);
  }
  if (!staff.gender) {
    throw new AppError('Gender is required for submission.', HTTP_STATUS.BAD_REQUEST);
  }
  if (!staff.dateOfBirth) {
    throw new AppError('Date of Birth is required for submission.', HTTP_STATUS.BAD_REQUEST);
  }
  if (!staff.qualification?.trim()) {
    throw new AppError('Qualification is required for submission.', HTTP_STATUS.BAD_REQUEST);
  }
  if (!staff.currentAddress?.line1?.trim()) {
    throw new AppError('Address is required for submission.', HTTP_STATUS.BAD_REQUEST);
  }

  staff.approvalStatus = 'pending_approval';
  staff.reEditFields = {};
  staff.reEditComments = '';
  await staff.save();

  await User.updateOne(
    { _id: requester._id },
    { $set: { approvalStatus: 'pending_approval', reEditFields: {}, reEditComments: '' } }
  );

  // Sync with Receptionist collection if user is RECEPTIONIST
  if (requester.role === 'RECEPTIONIST') {
    const Receptionist = require('../receptionists/receptionist.model');
    const receptionist = await Receptionist.findOne({ userId: requester._id });
    if (receptionist) {
      if (payload.image !== undefined) receptionist.image = staff.image;
      if (payload.documentPdf !== undefined) receptionist.documentPdf = staff.documentPdf;
      
      const recFields = ['qualification', 'experienceYears', 'currentAddress', 'permanentAddress', 'phone'];
      for (const field of recFields) {
        if (payload[field] !== undefined) {
          receptionist[field] = payload[field];
        }
      }
      receptionist.approvalStatus = 'pending_approval';
      receptionist.reEditFields = {};
      receptionist.reEditComments = '';
      await receptionist.save();
    }
  }

  return resolveStaffFiles(staff);
};

const acceptMySlot = async ({ requester }) => {
  const staff = await findOrCreateStaff(requester._id, requester);

  staff.hasAcceptedSlot = true;
  staff.initialSlotAccepted = true;
  staff.isActive = true;
  staff.invitationStatus = 'Active';
  staff.offerStatus = 'Accepted';
  staff.accountStatus = 'Active';
  if (!staff.activatedAt) staff.activatedAt = new Date();
  await staff.save();

  await User.updateOne(
    { _id: requester._id },
    { $set: { hasAcceptedSlot: true, initialSlotAccepted: true, isActive: true } }
  );

  // Sync with Receptionist collection if user is RECEPTIONIST
  if (requester.role === 'RECEPTIONIST') {
    const Receptionist = require('../receptionists/receptionist.model');
    await Receptionist.updateOne(
      { userId: requester._id },
      { $set: { hasAcceptedSlot: true, initialSlotAccepted: true, isActive: true } }
    );
  }

  return resolveStaffFiles(staff);
};

const getOnboardingDetailsByToken = async (token) => {
  const User = require('../users/user.model');
  const Staff = require('./staff.model');
  const Clinic = require('../clinics/clinic.model');

  const user = await User.findById(token);
  if (!user) throw new AppError('Invalid or expired token', HTTP_STATUS.NOT_FOUND);

  const staff = await Staff.findOne({ userId: user._id });
  if (!staff) throw new AppError('Staff record not found', HTTP_STATUS.NOT_FOUND);

  const clinic = await Clinic.findById(user.clinicId);

  return {
    user: {
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role
    },
    staff,
    clinicName: clinic ? clinic.name : ''
  };
};

const submitOnboardingByToken = async ({ token, payload }) => {
  const User = require('../users/user.model');
  const Staff = require('./staff.model');
  const bcrypt = require('bcryptjs');

  const user = await User.findById(token);
  if (!user) throw new AppError('Invalid or expired token', HTTP_STATUS.NOT_FOUND);

  const staff = await Staff.findOne({ userId: user._id });
  if (!staff) throw new AppError('Staff record not found', HTTP_STATUS.NOT_FOUND);

  // Update password if provided
  if (payload.password) {
    user.password = await bcrypt.hash(payload.password, 10);
  }
  user.approvalStatus = 'pending_approval';
  await user.save();

  // Update staff details
  if (payload.fullName) staff.fullName = payload.fullName;
  if (payload.gender) staff.gender = payload.gender;
  if (payload.dateOfBirth) staff.dateOfBirth = payload.dateOfBirth;
  if (payload.qualification) staff.qualification = payload.qualification;
  if (payload.currentAddress) staff.currentAddress = payload.currentAddress;
  if (payload.permanentAddress) staff.permanentAddress = payload.permanentAddress;
  
  staff.invitationStatus = 'Waiting for Approval';
  staff.approvalStatus = 'pending_approval';
  await staff.save();

  // If receptionist, update legacy receptionist model too
  if (user.role === 'RECEPTIONIST') {
    const Receptionist = require('../receptionists/receptionist.model');
    let receptionist = await Receptionist.findOne({ userId: user._id });
    if (receptionist) {
      receptionist.approvalStatus = 'pending_approval';
      if (payload.qualification) receptionist.qualification = payload.qualification;
      if (payload.currentAddress) receptionist.currentAddress = payload.currentAddress;
      await receptionist.save();
    }
  }

  return { user, staff };
};

const acceptOfferByToken = async (token) => {
  const User = require('../users/user.model');
  const Staff = require('./staff.model');

  const user = await User.findById(token);
  if (!user) throw new AppError('Invalid or expired token', HTTP_STATUS.NOT_FOUND);

  const staff = await Staff.findOne({ userId: user._id });
  if (!staff) throw new AppError('Staff record not found', HTTP_STATUS.NOT_FOUND);

  if (staff.invitationStatus !== 'Offer Pending') {
    throw new AppError('No pending offer found for this staff member', HTTP_STATUS.BAD_REQUEST);
  }

  user.isActive = true;
  user.approvalStatus = 'approved';
  await user.save();

  staff.isActive = true;
  staff.invitationStatus = 'Active';
  staff.offerStatus = 'Accepted';
  staff.accountStatus = 'Active';
  staff.activatedAt = new Date();
  await staff.save();

  if (user.role === 'RECEPTIONIST') {
    const Receptionist = require('../receptionists/receptionist.model');
    const receptionist = await Receptionist.findOne({ userId: user._id });
    if (receptionist) {
      receptionist.isActive = true;
      receptionist.approvalStatus = 'approved';
      await receptionist.save();
    }
  }

  return { user, staff };
};

module.exports = {
  resolveStaffFiles,
  getMyProfile,
  updateMyProfile,
  submitMyProfile,
  acceptMySlot,
  getOnboardingDetailsByToken,
  submitOnboardingByToken,
  acceptOfferByToken
};
