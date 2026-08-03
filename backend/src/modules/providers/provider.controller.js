const { sendSuccess } = require('../../common/utils/apiResponse');
const { asyncHandler } = require('../../common/utils/asyncHandler');
const { AppError } = require('../../common/utils/AppError');
const { HTTP_STATUS } = require('../../common/constants/httpStatus');
const providerService = require('./provider.service');
const Clinic = require('../clinics/clinic.model');
const mongoose = require('mongoose');
const Provider = require('./provider.model');
const User = require('../users/user.model');

const createProvider = asyncHandler(async (req, res) => {
  const targetClinicId = req.user.clinicId;
  const errors = {};

  const {
    name,
    providerType,
    providerSubtype,
    phone,
    email,
    address,
    contactPerson,
    managerEmail,
    managerPhone,
    assignedBranches
  } = req.body;

  const isDraft = req.body.status === 'Draft';

  if (!name) errors.name = `${providerType === 'Laboratory' ? 'Laboratory' : 'Pharmacy'} Name is required.`;
  
  if (!isDraft) {
    if (!providerSubtype) errors.providerSubtype = 'Please select ownership.';
    if (!assignedBranches || assignedBranches.length === 0 || !assignedBranches[0]) {
      errors.assignedBranches = 'Please select a branch.';
    }
    if (!address || !address.line1) errors['address.line1'] = 'Address Line 1 is required.';
    if (!address || !address.city) errors['address.city'] = 'City is required.';
    if (!address || !address.state) errors['address.state'] = 'State is required.';
    if (!address || !address.pincode) errors['address.pincode'] = 'Postal Code is required.';

    if (!email) {
      errors.email = 'Email address is required.';
    } else {
      const ep = await Provider.findOne({ email: email.toLowerCase(), status: { $ne: 'Archived' } });
      const eu = await User.findOne({ email: email.toLowerCase() });
      if (ep || eu) errors.email = 'This email address is already registered.';
    }

    if (!phone) {
      errors.phone = 'Phone number is required.';
    } else {
      const ep = await Provider.findOne({ phone: phone.trim(), status: { $ne: 'Archived' } });
      const eu = await User.findOne({ phone: phone.trim() });
      if (ep || eu) errors.phone = 'This phone number is already registered.';
    }

    if (!contactPerson) errors.contactPerson = 'Manager name is required.';
    if (!managerEmail) {
      errors.managerEmail = 'Please enter a valid email address.';
    } else {
      const eu = await User.findOne({ email: managerEmail.toLowerCase() });
      if (eu) {
        if (eu.clinicId?.toString() !== targetClinicId?.toString()) {
          errors.managerEmail = 'This email address is already registered.';
        } else if (eu.assignedProviderId) {
          errors.managerEmail = 'This email address is already registered.';
        }
      }
    }

    if (!managerPhone) {
      errors.managerPhone = 'Please enter a valid phone number.';
    } else {
      const eu = await User.findOne({ phone: managerPhone.trim() });
      if (eu) {
        if (eu.clinicId?.toString() !== targetClinicId?.toString()) {
          errors.managerPhone = 'This phone number is already registered.';
        } else if (eu.assignedProviderId) {
          errors.managerPhone = 'This phone number is already registered.';
        }
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new AppError('Validation failed.', HTTP_STATUS.BAD_REQUEST, errors);
  }

  let resolvedBranches = assignedBranches;
  if (assignedBranches && assignedBranches.length > 0) {
    resolvedBranches = assignedBranches.map(bId => {
      if (bId === 'headquarters' || bId.startsWith('branch_') || bId.startsWith('branch-')) {
        return targetClinicId;
      }
      return bId;
    });
  }

  const payload = {
    providerSubtype: 'Internal',
    providerCategory: 'Own Provider',
    ...req.body,
    assignedBranches: resolvedBranches,
    creationMode: req.body.creationMode || 'STANDARD'
  };

  const result = await providerService.createProvider(req.user.clinicId, payload, req.user._id);
  return sendSuccess(res, 'Provider created successfully', result, HTTP_STATUS.CREATED);
});

const validateProviderEmail = asyncHandler(async (req, res) => {
  const { email, providerId } = req.body;
  if (!email) {
    throw new AppError('Email is required', HTTP_STATUS.BAD_REQUEST);
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return sendSuccess(res, 'Validation checked', { isValid: false, message: 'Please enter a valid email address.' });
  }

  const query = { email: email.toLowerCase(), status: { $ne: 'Archived' } };
  if (providerId) {
    query._id = { $ne: providerId };
  }
  const existingProvider = await Provider.findOne(query);
  if (existingProvider) {
    return sendSuccess(res, 'Validation checked', { isValid: false, message: 'This email address is already registered.' });
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return sendSuccess(res, 'Validation checked', { isValid: false, message: 'This email address is already registered.' });
  }

  const existingClinic = await Clinic.findOne({ 'ownerDetails.email': email.toLowerCase() });
  if (existingClinic) {
    return sendSuccess(res, 'Validation checked', { isValid: false, message: 'This email address is already registered.' });
  }

  return sendSuccess(res, 'Validation checked', { isValid: true, message: '✓ Available' });
});

const validateProviderPhone = asyncHandler(async (req, res) => {
  const { phone, providerId } = req.body;
  if (!phone) {
    throw new AppError('Phone is required', HTTP_STATUS.BAD_REQUEST);
  }

  const phoneDigits = phone.replace(/\D/g, '');
  if (phoneDigits.length < 10) {
    return sendSuccess(res, 'Validation checked', { isValid: false, message: 'Please enter a valid phone number.' });
  }

  const query = { phone: phone.trim(), status: { $ne: 'Archived' } };
  if (providerId) {
    query._id = { $ne: providerId };
  }
  const existingProvider = await Provider.findOne(query);
  if (existingProvider) {
    return sendSuccess(res, 'Validation checked', { isValid: false, message: 'This phone number is already registered.' });
  }

  const existingUser = await User.findOne({ phone: phone.trim() });
  if (existingUser) {
    return sendSuccess(res, 'Validation checked', { isValid: false, message: 'This phone number is already registered.' });
  }

  const existingClinic = await Clinic.findOne({ 'ownerDetails.phone': phone.trim() });
  if (existingClinic) {
    return sendSuccess(res, 'Validation checked', { isValid: false, message: 'This phone number is already registered.' });
  }

  return sendSuccess(res, 'Validation checked', { isValid: true, message: '✓ Available' });
});

const validateManagerEmail = asyncHandler(async (req, res) => {
  const { email, clinicId, providerId } = req.body;
  const targetClinicId = clinicId || req.user?.clinicId;

  if (!email) {
    throw new AppError('Manager email is required', HTTP_STATUS.BAD_REQUEST);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return sendSuccess(res, 'Validation checked', { isValid: false, message: 'Please enter a valid email address.' });
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return sendSuccess(res, 'Validation checked', { isValid: false, message: 'This email address is already registered.' });
  }

  const existingClinic = await Clinic.findOne({ 'ownerDetails.email': email.toLowerCase() });
  if (existingClinic) {
    return sendSuccess(res, 'Validation checked', { isValid: false, message: 'This email address is already registered.' });
  }

  const existingProvider = await Provider.findOne({ email: email.toLowerCase(), status: { $ne: 'Archived' } });
  if (existingProvider) {
    return sendSuccess(res, 'Validation checked', { isValid: false, message: 'This email address is already registered.' });
  }

  return sendSuccess(res, 'Validation checked', { isValid: true, message: '✓ Available' });
});

const validateManagerPhone = asyncHandler(async (req, res) => {
  const { phone, clinicId, providerId } = req.body;
  const targetClinicId = clinicId || req.user?.clinicId;

  if (!phone) {
    throw new AppError('Manager phone is required', HTTP_STATUS.BAD_REQUEST);
  }

  const phoneDigits = phone.replace(/\D/g, '');
  if (phoneDigits.length < 10) {
    return sendSuccess(res, 'Validation checked', { isValid: false, message: 'Please enter a valid phone number.' });
  }

  const existingUser = await User.findOne({ phone: phone.trim() });
  if (existingUser) {
    return sendSuccess(res, 'Validation checked', { isValid: false, message: 'This phone number is already registered.' });
  }

  const existingClinic = await Clinic.findOne({ 'ownerDetails.phone': phone.trim() });
  if (existingClinic) {
    return sendSuccess(res, 'Validation checked', { isValid: false, message: 'This phone number is already registered.' });
  }

  const existingProvider = await Provider.findOne({ phone: phone.trim(), status: { $ne: 'Archived' } });
  if (existingProvider) {
    return sendSuccess(res, 'Validation checked', { isValid: false, message: 'This phone number is already registered.' });
  }

  return sendSuccess(res, 'Validation checked', { isValid: true, message: '✓ Available' });
});

const validateBranch = asyncHandler(async (req, res) => {
  const { branchId, clinicId } = req.body;
  const targetClinicId = clinicId || req.user?.clinicId;

  if (!branchId) {
    return sendSuccess(res, 'Validation checked', { isValid: false, message: 'Please select a branch.' });
  }

  if (!mongoose.isValidObjectId(branchId)) {
    if (branchId === 'headquarters' || branchId.startsWith('branch_') || branchId.startsWith('branch-')) {
      return sendSuccess(res, 'Validation checked', { isValid: true });
    }
    return sendSuccess(res, 'Validation checked', { isValid: false, message: 'Please select a valid branch.' });
  }

  const branch = await Clinic.findOne({
    _id: branchId,
    $or: [
      { _id: targetClinicId },
      { parentClinicId: targetClinicId }
    ]
  });

  if (!branch) {
    return sendSuccess(res, 'Validation checked', { isValid: false, message: 'Please select a valid branch.' });
  }

  return sendSuccess(res, 'Validation checked', { isValid: true });
});

const validateProviderData = asyncHandler(async (req, res) => {
  const {
    name,
    providerType,
    providerSubtype,
    phone,
    email,
    address,
    contactPerson,
    managerEmail,
    managerPhone,
    assignedBranches,
    _id
  } = req.body;
  
  const targetClinicId = req.user?.clinicId;
  const errors = {};

  if (!name) {
    errors.name = `${providerType === 'Laboratory' ? 'Laboratory' : 'Pharmacy'} Name is required.`;
  }

  if (!providerSubtype) {
    errors.providerSubtype = 'Please select ownership.';
  }

  if (!assignedBranches || assignedBranches.length === 0 || !assignedBranches[0]) {
    errors.assignedBranches = 'Please select a branch.';
  } else {
    const firstBranch = assignedBranches[0];
    if (!mongoose.isValidObjectId(firstBranch)) {
      if (firstBranch !== 'headquarters' && !firstBranch.startsWith('branch_') && !firstBranch.startsWith('branch-')) {
        errors.assignedBranches = 'Please select a valid branch.';
      }
    } else {
      const branch = await Clinic.findOne({
        _id: firstBranch,
        $or: [
          { _id: targetClinicId },
          { parentClinicId: targetClinicId }
        ]
      });
      if (!branch) {
        errors.assignedBranches = 'Please select a valid branch.';
      }
    }
  }

  if (!address || !address.line1) {
    errors['address.line1'] = 'Address Line 1 is required.';
  }
  if (!address || !address.city) {
    errors['address.city'] = 'City is required.';
  }
  if (!address || !address.state) {
    errors['address.state'] = 'State is required.';
  }
  if (!address || !address.pincode) {
    errors['address.pincode'] = 'Postal Code is required.';
  }

  if (!email) {
    errors.email = 'Email address is required.';
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.email = 'Please enter a valid email address.';
    } else {
      const q = { email: email.toLowerCase(), status: { $ne: 'Archived' } };
      if (_id) q._id = { $ne: _id };
      const ep = await Provider.findOne(q);
      const eu = await User.findOne({ email: email.toLowerCase() });
      if (ep || (eu && eu.assignedProviderId?.toString() !== _id && eu.providerId?.toString() !== _id)) {
        errors.email = 'This email address is already registered.';
      }
    }
  }

  if (!phone) {
    errors.phone = 'Phone number is required.';
  } else {
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      errors.phone = 'Please enter a valid phone number.';
    } else {
      const q = { phone: phone.trim(), status: { $ne: 'Archived' } };
      if (_id) q._id = { $ne: _id };
      const ep = await Provider.findOne(q);
      const eu = await User.findOne({ phone: phone.trim() });
      if (ep || (eu && eu.assignedProviderId?.toString() !== _id && eu.providerId?.toString() !== _id)) {
        errors.phone = 'This phone number is already registered.';
      }
    }
  }

  if (!contactPerson) {
    errors.contactPerson = 'Manager name is required.';
  }

  if (!managerEmail) {
    errors.managerEmail = 'Please enter a valid email address.';
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(managerEmail)) {
      errors.managerEmail = 'Please enter a valid email address.';
    } else {
      const eu = await User.findOne({ email: managerEmail.toLowerCase() });
      if (eu) {
        if (eu.clinicId?.toString() !== targetClinicId?.toString()) {
          errors.managerEmail = 'This email address is already registered.';
        } else if (eu.assignedProviderId && eu.assignedProviderId.toString() !== _id) {
          errors.managerEmail = 'This email address is already registered.';
        }
      }
    }
  }

  if (!managerPhone) {
    errors.managerPhone = 'Please enter a valid phone number.';
  } else {
    const phoneDigits = managerPhone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      errors.managerPhone = 'Please enter a valid phone number.';
    } else {
      const eu = await User.findOne({ phone: managerPhone.trim() });
      if (eu) {
        if (eu.clinicId?.toString() !== targetClinicId?.toString()) {
          errors.managerPhone = 'This phone number is already registered.';
        } else if (eu.assignedProviderId && eu.assignedProviderId.toString() !== _id) {
          errors.managerPhone = 'This phone number is already registered.';
        }
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Validation failed.',
      errors
    });
  }

  return sendSuccess(res, 'Validation passed', { isValid: true });
});

const getProviders = asyncHandler(async (req, res) => {
  const clinicId = (req.user.role === 'PATIENT' ? req.query.clinicId : null) || req.user.clinicId || req.query.clinicId;
  if (!clinicId) {
    throw new AppError('Clinic ID is required', HTTP_STATUS.BAD_REQUEST);
  }
  const result = await providerService.getProviders(clinicId, req.query);
  return sendSuccess(res, 'Providers retrieved successfully', result);
});

const getProvider = asyncHandler(async (req, res) => {
  const clinicId = (req.user.role === 'PATIENT' ? req.query.clinicId : null) || req.user.clinicId || req.query.clinicId;
  if (!clinicId) {
    throw new AppError('Clinic ID is required', HTTP_STATUS.BAD_REQUEST);
  }
  const result = await providerService.getProviderById(clinicId, req.params.id);
  return sendSuccess(res, 'Provider retrieved successfully', result);
});

const updateProvider = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw new AppError('Invalid provider identifier. Please refresh and try again.', HTTP_STATUS.BAD_REQUEST);
  }
  const result = await providerService.updateProvider(req.user.clinicId, req.params.id, req.body, req.user._id);
  return sendSuccess(res, 'Provider updated successfully', result);
});

const archiveProvider = asyncHandler(async (req, res) => {
  const result = await providerService.archiveProvider(req.user.clinicId, req.params.id, req.user._id);
  return sendSuccess(res, 'Provider archived successfully', result);
});

const changeStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) {
    throw new AppError('Status is required', HTTP_STATUS.BAD_REQUEST);
  }
  const result = await providerService.changeStatus(req.user.clinicId, req.params.id, status, req.user._id);
  return sendSuccess(res, 'Provider status updated successfully', result);
});

const getClinicBranches = asyncHandler(async (req, res) => {
  const branches = await Clinic.find({
    $or: [
      { _id: req.user.clinicId },
      { parentClinicId: req.user.clinicId }
    ],
    isActive: true
  }).select('name code');
  return sendSuccess(res, 'Clinic branches retrieved successfully', branches);
});

const getLaboratoryStats = asyncHandler(async (req, res) => {
  const clinicId = (req.user.role === 'PATIENT' ? req.query.clinicId : null) || req.user.clinicId || req.query.clinicId;
  if (!clinicId) {
    throw new AppError('Clinic ID is required', HTTP_STATUS.BAD_REQUEST);
  }
  const result = await providerService.getLaboratoryStats(clinicId);
  return sendSuccess(res, 'Laboratory stats retrieved successfully', result);
});

const createPharmacyDraft = asyncHandler(async (req, res) => {
  const { providerType, name } = req.body;
  const clinicId = req.user.clinicId;
  const ProviderDraft = require('./providerDraft.model');

  let draftName = name;
  if (!draftName) {
    const existingDraftsCount = await ProviderDraft.countDocuments({ clinicId, providerType });
    draftName = providerType === 'Pharmacy'
      ? `New Pharmacy ${existingDraftsCount + 1}`
      : `New Laboratory ${existingDraftsCount + 1}`;
  }

  const draft = await ProviderDraft.create({
    clinicId,
    providerType,
    currentStep: 1,
    basicInfo: {
      name: draftName,
      providerSubtype: 'Internal',
      address: { country: 'India' }
    }
  });

  return sendSuccess(res, 'Draft provider created successfully', {
    draftId: draft._id,
    providerId: draft._id,
    currentStep: draft.currentStep,
    status: draft.status,
    basicInfo: draft.basicInfo,
    manager: draft.manager,
    operationalSetup: draft.operationalSetup,
    updatedAt: draft.updatedAt
  }, HTTP_STATUS.CREATED);
});

const getPharmacyDraft = asyncHandler(async (req, res) => {
  const { clinicId } = req.params;
  const { type = 'Pharmacy', providerId } = req.query;
  const ProviderDraft = require('./providerDraft.model');
  
  let query = { clinicId, providerType: type, status: 'Draft' };
  if (providerId && mongoose.isValidObjectId(providerId)) {
    query = { clinicId, _id: providerId };
  }
  
  const draft = await ProviderDraft.findOne(query);
  if (!draft) {
    return sendSuccess(res, 'No draft found', null);
  }

  return sendSuccess(res, 'Draft retrieved successfully', {
    draftId: draft._id,
    providerId: draft._id,
    currentStep: draft.currentStep || 1,
    status: draft.status || 'Draft',
    basicInfo: draft.basicInfo || {},
    manager: draft.manager || {},
    operationalSetup: draft.operationalSetup || {},
    review: {},
    updatedAt: draft.updatedAt
  });
});

const savePharmacyDraft = asyncHandler(async (req, res) => {
  const { draftId } = req.params;
  if (!mongoose.isValidObjectId(draftId)) {
    throw new AppError('Invalid draft identifier.', HTTP_STATUS.BAD_REQUEST);
  }
  const ProviderDraft = require('./providerDraft.model');
  const draft = await ProviderDraft.findById(draftId);
  if (!draft) {
    throw new AppError('Draft provider not found', HTTP_STATUS.NOT_FOUND);
  }

  const { basicInfo, manager, operationalSetup, currentStep } = req.body;

  if (currentStep !== undefined) {
    draft.currentStep = currentStep;
  }

  if (basicInfo) {
    draft.basicInfo = {
      ...draft.basicInfo,
      ...basicInfo,
      address: basicInfo.address ? {
        ...draft.basicInfo?.address,
        ...basicInfo.address
      } : draft.basicInfo?.address
    };
  }

  if (manager) {
    draft.manager = {
      ...draft.manager,
      ...manager
    };
  }

  if (operationalSetup) {
    draft.operationalSetup = {
      ...draft.operationalSetup,
      ...operationalSetup,
      workingHours: operationalSetup.workingHours ? {
        ...draft.operationalSetup?.workingHours,
        ...operationalSetup.workingHours
      } : draft.operationalSetup?.workingHours
    };
  }

  draft.status = 'Draft';
  await draft.save();

  return sendSuccess(res, 'Draft updated successfully', {
    draft: {
      draftId: draft._id,
      providerId: draft._id,
      currentStep: draft.currentStep,
      status: draft.status,
      basicInfo: draft.basicInfo,
      manager: draft.manager,
      operationalSetup: draft.operationalSetup,
      updatedAt: draft.updatedAt
    }
  });
});

module.exports = {
  createPharmacyDraft,
  getPharmacyDraft,
  savePharmacyDraft,
  getLaboratoryStats,
  createProvider,
  getProviders,
  getProvider,
  updateProvider,
  archiveProvider,
  changeStatus,
  getClinicBranches,
  validateProviderEmail,
  validateProviderPhone,
  validateManagerEmail,
  validateManagerPhone,
  validateBranch,
  validateProviderData
};
