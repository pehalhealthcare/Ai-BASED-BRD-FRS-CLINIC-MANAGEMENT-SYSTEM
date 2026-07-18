const Provider = require('./provider.model');
const Counter = require('../counters/counter.model');
const { AppError } = require('../../common/utils/AppError');
const { HTTP_STATUS } = require('../../common/constants/httpStatus');
const { createAuditLog } = require('../audit/audit.service');
const { createOperatorStaff, replaceOperatorStaff, handleStatusChange } = require('./providerOperatorHelper');

const getNextGlobalId = async (prefix, counterKey) => {
  const counter = await Counter.findOneAndUpdate(
    { key: counterKey },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const seqStr = counter.seq.toString().padStart(6, '0');
  return `${prefix}-${seqStr}`;
};

const createProvider = async (clinicId, payload, actorUserId) => {
  const { name, providerType } = payload;

  const existing = await Provider.findOne({
    clinicId,
    name: new RegExp(`^${name.trim()}$`, 'i'),
    status: { $ne: 'Archived' }
  });

  if (existing) {
    throw new AppError(`A provider named "${name}" already exists for this clinic`, HTTP_STATUS.CONFLICT);
  }

  // Check Staff Quota Limit
  const Clinic = require('../clinics/clinic.model');
  const User = require('../users/user.model');
  const { STAFF_ROLES } = require('../../common/constants/roles');

  const clinic = await Clinic.findById(clinicId).populate('subscription.planId');
  if (!clinic) {
    throw new AppError('Clinic not found', HTTP_STATUS.NOT_FOUND);
  }

  let maxStaff = 2;
  if (clinic.customLimits && clinic.customLimits.maxStaff !== null) {
    maxStaff = clinic.customLimits.maxStaff;
  } else if (clinic.subscription && clinic.subscription.planId) {
    maxStaff = clinic.subscription.planId.limits?.maxStaff ?? 2;
  }

  const currentStaffCount = await User.countDocuments({
    clinicId,
    role: { $in: STAFF_ROLES },
    deletedAt: null
  });

  if (currentStaffCount >= maxStaff) {
    throw new AppError('You have reached your maximum staff limit for your current subscription plan. Upgrade your plan or free an existing staff slot before adding another Healthcare Provider.', HTTP_STATUS.BAD_REQUEST);
  }

  const globalId = await getNextGlobalId('PRV', 'global_provider_seq');

  const provider = await Provider.create({
    ...payload,
    globalId,
    clinicId,
    createdBy: actorUserId
  });

  // Automatically create linked Staff member
  try {
    await createOperatorStaff(clinicId, provider, actorUserId);
  } catch (err) {
    // If operator creation fails, delete provider to keep transaction atomic
    await Provider.deleteOne({ _id: provider._id });
    throw err;
  }

  await createAuditLog({
    actorUserId,
    action: 'CREATE_PROVIDER',
    entity: 'Provider',
    entityId: provider._id,
    metadata: { newValues: provider },
    status: 'SUCCESS'
  });

  return provider;
};

const getProviders = async (clinicId, query = {}) => {
  const { search, providerType, providerCategory, city, branch, status, page = 1, limit = 10 } = query;
  
  const filter = { clinicId, status: { $ne: 'Archived' } };

  if (providerType) filter.providerType = providerType;
  if (providerCategory) filter.providerCategory = providerCategory;
  if (status) filter.status = status;
  if (city) filter['address.city'] = new RegExp(city, 'i');
  if (branch) filter.assignedBranches = branch;

  if (search) {
    filter.$or = [
      { name: new RegExp(search, 'i') },
      { contactPerson: new RegExp(search, 'i') },
      { phone: new RegExp(search, 'i') },
      { globalId: new RegExp(search, 'i') }
    ];
  }

  const skip = (page - 1) * limit;
  const total = await Provider.countDocuments(filter);
  const items = await Provider.find(filter)
    .populate('assignedBranches', 'name code')
    .populate('createdBy', 'name email')
    .sort({ name: 1 })
    .skip(skip)
    .limit(limit);

  return { total, items, page, limit };
};

const getProviderById = async (clinicId, id) => {
  const provider = await Provider.findOne({ _id: id, clinicId, status: { $ne: 'Archived' } })
    .populate('assignedBranches', 'name code')
    .populate('createdBy', 'name email');

  if (!provider) {
    throw new AppError('Provider not found', HTTP_STATUS.NOT_FOUND);
  }
  return provider;
};

const updateProvider = async (clinicId, id, payload, actorUserId) => {
  const oldProvider = await Provider.findOne({ _id: id, clinicId });
  if (!oldProvider) {
    throw new AppError('Provider not found', HTTP_STATUS.NOT_FOUND);
  }

  if (payload.name && payload.name.trim().toLowerCase() !== oldProvider.name.toLowerCase()) {
    const existing = await Provider.findOne({
      clinicId,
      name: new RegExp(`^${payload.name.trim()}$`, 'i'),
      _id: { $ne: id },
      status: { $ne: 'Archived' }
    });
    if (existing) {
      throw new AppError(`A provider named "${payload.name}" already exists for this clinic`, HTTP_STATUS.CONFLICT);
    }
  }

  const updatedProvider = await Provider.findByIdAndUpdate(
    id,
    payload,
    { new: true }
  ).populate('assignedBranches', 'name code');

  // If Operator details have changed, handle replacement onboarding
  try {
    await replaceOperatorStaff(clinicId, updatedProvider, oldProvider, actorUserId);
  } catch (err) {
    logger.error('[provider:operator-replace] Failed to replace operator staff', err);
  }

  await createAuditLog({
    actorUserId,
    action: 'UPDATE_PROVIDER',
    entity: 'Provider',
    entityId: id,
    metadata: { previousValues: oldProvider, newValues: updatedProvider },
    status: 'SUCCESS'
  });

  return updatedProvider;
};

const archiveProvider = async (clinicId, id, actorUserId) => {
  const provider = await Provider.findOne({ _id: id, clinicId });
  if (!provider) {
    throw new AppError('Provider not found', HTTP_STATUS.NOT_FOUND);
  }

  // Soft delete check
  provider.status = 'Archived';
  await provider.save();

  await createAuditLog({
    actorUserId,
    action: 'ARCHIVE_PROVIDER',
    entity: 'Provider',
    entityId: id,
    metadata: { name: provider.name },
    status: 'SUCCESS'
  });

  return provider;
};

const changeStatus = async (clinicId, id, status, actorUserId) => {
  const provider = await Provider.findOne({ _id: id, clinicId });
  if (!provider) {
    throw new AppError('Provider not found', HTTP_STATUS.NOT_FOUND);
  }

  provider.status = status;
  await provider.save();

  try {
    await handleStatusChange(clinicId, provider, status, actorUserId);
  } catch (err) {
    logger.error('[provider:operator-status-sync] Failed to sync status with operator staff', err);
  }

  await createAuditLog({
    actorUserId,
    action: 'CHANGE_PROVIDER_STATUS',
    entity: 'Provider',
    entityId: id,
    metadata: { status },
    status: 'SUCCESS'
  });

  return provider;
};

module.exports = {
  createProvider,
  getProviders,
  getProviderById,
  updateProvider,
  archiveProvider,
  changeStatus
};
