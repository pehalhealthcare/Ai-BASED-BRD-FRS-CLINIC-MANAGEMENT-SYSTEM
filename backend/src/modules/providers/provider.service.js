const Provider = require('./provider.model');
const Counter = require('../counters/counter.model');
const { AppError } = require('../../common/utils/AppError');
const { HTTP_STATUS } = require('../../common/constants/httpStatus');
const { createAuditLog } = require('../audit/audit.service');

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

  const globalId = await getNextGlobalId('PRV', 'global_provider_seq');

  const provider = await Provider.create({
    ...payload,
    globalId,
    clinicId,
    createdBy: actorUserId
  });

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
