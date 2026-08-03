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
    status: payload.creationMode === 'ONBOARDING' ? 'Draft' : (payload.deferInvitation ? 'Pending Activation' : (payload.status || 'Active')),
    createdBy: actorUserId
  });

  // Automatically create linked Staff member
  if (provider.status !== 'Draft') {
    try {
      await createOperatorStaff(clinicId, provider, actorUserId, payload.deferInvitation);
    } catch (err) {
      // If operator creation fails, delete provider to keep transaction atomic
      await Provider.deleteOne({ _id: provider._id });
      throw err;
    }
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

  const filter = { clinicId, status: { $nin: ['Archived', 'Draft'] } };

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

  const ClinicLabCatalog = require('../labs/clinicLabCatalog.model');
  const LabConsumable = require('../labs/labConsumable.model');
  const LabConsumableBatch = require('../labs/labConsumableBatch.model');
  const LabOrder = require('../labs/labOrder.model');
  const Invoice = require('../billing/invoice.model');

  const mappedItems = [];
  for (const item of items) {
    const raw = item.toObject();
    if (item.providerType === 'Laboratory') {
      let testsInInventory = 0;
      try {
        testsInInventory = await ClinicLabCatalog.countDocuments({ clinicId });
      } catch { }

      let lowStockAlerts = 0;
      try {
        lowStockAlerts = await LabConsumable.countDocuments({ clinicId, $expr: { $lte: ['$totalStock', '$reorderLevel'] } });
      } catch { }

      let pendingOrders = 0;
      try {
        pendingOrders = await LabOrder.countDocuments({ clinicId, status: 'ordered' });
      } catch { }

      let pendingTestOrders = 0;
      try {
        pendingTestOrders = await LabOrder.countDocuments({ clinicId, status: { $in: ['sample_collected', 'processing'] } });
      } catch { }

      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
      let expiringSoon = 0;
      try {
        expiringSoon = await LabConsumableBatch.countDocuments({
          clinicId,
          availableStock: { $gt: 0 },
          expiryDate: { $gte: new Date(), $lte: thirtyDaysLater }
        });
      } catch { }

      let todayRevenue = 0;
      try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayInvoices = await Invoice.find({
          clinicId,
          createdAt: { $gte: todayStart },
          status: 'paid'
        });
        for (const inv of todayInvoices) {
          if (inv.items) {
            for (const sub of inv.items) {
              if (sub.itemType === 'LabTest' || sub.itemType === 'Laboratory' || sub.name?.toLowerCase().includes('lab')) {
                todayRevenue += sub.amount || 0;
              }
            }
          }
        }
      } catch { }



      raw.stats = {
        testsInInventory,
        todayRevenue,
        lowStockAlerts,
        pendingOrders,
        pendingTestOrders,
        expiringSoon
      };
    }
    mappedItems.push(raw);
  }

  return { total, items: mappedItems, page, limit };
};

const getProviderById = async (clinicId, id) => {
  const provider = await Provider.findOne({ _id: id, clinicId, status: { $ne: 'Archived' } })
    .populate('assignedBranches', 'name code')
    .populate('createdBy', 'name email');

  if (!provider) {
    throw new AppError('Provider not found', HTTP_STATUS.NOT_FOUND);
  }

  const raw = provider.toObject();
  if (provider.providerType === 'Laboratory') {
    const ClinicLabCatalog = require('../labs/clinicLabCatalog.model');
    const LabConsumable = require('../labs/labConsumable.model');
    const LabConsumableBatch = require('../labs/labConsumableBatch.model');
    const LabOrder = require('../labs/labOrder.model');
    const Invoice = require('../billing/invoice.model');

    let testsInInventory = 0;
    try {
      testsInInventory = await ClinicLabCatalog.countDocuments({ clinicId });
    } catch { }

    let lowStockAlerts = 0;
    try {
      lowStockAlerts = await LabConsumable.countDocuments({ clinicId, $expr: { $lte: ['$totalStock', '$reorderLevel'] } });
    } catch { }

    let pendingOrders = 0;
    try {
      pendingOrders = await LabOrder.countDocuments({ clinicId, status: 'ordered' });
    } catch { }

    let pendingTestOrders = 0;
    try {
      pendingTestOrders = await LabOrder.countDocuments({ clinicId, status: { $in: ['sample_collected', 'processing'] } });
    } catch { }

    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    let expiringSoon = 0;
    try {
      expiringSoon = await LabConsumableBatch.countDocuments({
        clinicId,
        availableStock: { $gt: 0 },
        expiryDate: { $gte: new Date(), $lte: thirtyDaysLater }
      });
    } catch { }

    let todayRevenue = 0;
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayInvoices = await Invoice.find({
        clinicId,
        createdAt: { $gte: todayStart },
        status: 'paid'
      });
      for (const inv of todayInvoices) {
        if (inv.items) {
          for (const sub of inv.items) {
            if (sub.itemType === 'LabTest' || sub.itemType === 'Laboratory' || sub.name?.toLowerCase().includes('lab')) {
              todayRevenue += sub.amount || 0;
            }
          }
        }
      }
    } catch { }



    raw.stats = {
      testsInInventory,
      todayRevenue,
      lowStockAlerts,
      pendingOrders,
      pendingTestOrders,
      expiringSoon
    };
  }

  return raw;
};

const updateProvider = async (clinicId, id, payload, actorUserId) => {
  let oldProvider = await Provider.findOne({ _id: id, clinicId });
  let isPromotedFromDraft = false;

  if (!oldProvider) {
    const ProviderDraft = require('./providerDraft.model');
    const draft = await ProviderDraft.findOne({ _id: id, clinicId });
    if (!draft) {
      throw new AppError('Provider not found', HTTP_STATUS.NOT_FOUND);
    }

    const globalId = await getNextGlobalId('PRV', 'global_provider_seq');
    
    // Create actual Provider with explicit _id
    oldProvider = await Provider.create({
      _id: id,
      ...payload,
      globalId,
      clinicId,
      status: payload.status || 'Active',
      createdBy: actorUserId
    });

    // Delete draft
    await ProviderDraft.deleteOne({ _id: id });
    isPromotedFromDraft = true;
  }

  if (payload.status === 'Active' && oldProvider.status === 'Draft') {
    payload.deferInvitation = false;
    try {
      await handleStatusChange(clinicId, oldProvider, 'Active', actorUserId);
      const Staff = require('../staff/staff.model');
      const User = require('../users/user.model');
      const { sendOperatorOnboardingEmail } = require('./providerOperatorHelper');
      if (oldProvider.operatorStaffId) {
        const staff = await Staff.findById(oldProvider.operatorStaffId);
        if (staff) {
          const user = await User.findById(staff.userId);
          if (user) {
            await sendOperatorOnboardingEmail(clinicId, oldProvider, user, actorUserId);
          }
        }
      }
    } catch (err) {
      const { logger } = require('../../common/utils/logger');
      logger.error('[provider:operator-activation] Failed during status transition Draft -> Active', err);
    }
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
  const ProviderDraft = require('./providerDraft.model');
  const draft = await ProviderDraft.findOne({ _id: id, clinicId });

  if (draft) {
    // Delete the Draft
    await ProviderDraft.deleteOne({ _id: id });

    // Clean up any other linked records just in case
    try {
      const ProviderMapping = require('./providerMapping.model');
      await ProviderMapping.deleteMany({ providerId: id });
    } catch (e) {}
    try {
      const Staff = require('../staff/staff.model');
      await Staff.deleteMany({ assignedProviderId: id });
    } catch (e) {}
    try {
      const User = require('../users/user.model');
      await User.deleteMany({ assignedProviderId: id });
    } catch (e) {}

    await createAuditLog({
      actorUserId,
      action: 'ARCHIVE_PROVIDER',
      entity: 'ProviderDraft',
      entityId: id,
      metadata: { name: draft.basicInfo?.name, isHardDelete: true, isDraft: true },
      status: 'SUCCESS'
    });

    return { _id: id, name: draft.basicInfo?.name, providerType: draft.providerType, isDraft: true };
  }

  const provider = await Provider.findOne({ _id: id, clinicId });
  if (!provider) {
    throw new AppError('Provider not found', HTTP_STATUS.NOT_FOUND);
  }

  const Clinic = require('../clinics/clinic.model');
  const clinic = await Clinic.findById(clinicId);
  const isClinicOnboarding = clinic && !clinic.isOnboardingCompleted;

  let hasOperationalData = false;
  if (clinic && clinic.isOnboardingCompleted) {
    const PharmacyOrder = require('../pharmacy/pharmacyOrder.model');
    let labOrderCount = 0;
    try {
      const LabOrder = require('../labs/labOrder.model');
      labOrderCount = await LabOrder.countDocuments({ clinicId });
    } catch (e) {}
    let pharmacyOrderCount = 0;
    try {
      pharmacyOrderCount = await PharmacyOrder.countDocuments({ clinicId });
    } catch (e) {}
    hasOperationalData = pharmacyOrderCount > 0 || labOrderCount > 0;
  }

  const isHardDelete = isClinicOnboarding || !hasOperationalData;

  if (isHardDelete) {
    try {
      const ProviderMapping = require('./providerMapping.model');
      await ProviderMapping.deleteMany({ providerId: id });
    } catch (e) {}

    try {
      const Staff = require('../staff/staff.model');
      await Staff.deleteMany({ assignedProviderId: id });
    } catch (e) {}

    const User = require('../users/user.model');
    await User.deleteMany({ assignedProviderId: id });

    await Provider.deleteOne({ _id: id });
  } else {
    provider.status = 'Archived';
    try {
      const User = require('../users/user.model');
      await User.updateMany({ assignedProviderId: id }, { isActive: false, approvalStatus: 'disabled' });
      const Staff = require('../staff/staff.model');
      await Staff.updateMany({ assignedProviderId: id }, { isActive: false, approvalStatus: 'disabled' });
    } catch (e) {}
    await provider.save();
  }

  await createAuditLog({
    actorUserId,
    action: 'ARCHIVE_PROVIDER',
    entity: 'Provider',
    entityId: id,
    metadata: { name: provider.name, isHardDelete },
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

const getLaboratoryStats = async (clinicId) => {
  const Provider = require('./provider.model');
  const User = require('../users/user.model');
  const ClinicLabCatalog = require('../labs/clinicLabCatalog.model');
  const LabConsumable = require('../labs/labConsumable.model');
  const LabConsumableBatch = require('../labs/labConsumableBatch.model');
  const LabOrder = require('../labs/labOrder.model');
  const Invoice = require('../billing/invoice.model');

  const labs = await Provider.find({ clinicId, providerType: 'Laboratory', status: { $ne: 'Archived' } }).select('_id');
  const labIds = labs.map(l => l._id);

  const totalLaboratories = labIds.length;
  const activeLaboratories = await Provider.countDocuments({ clinicId, providerType: 'Laboratory', status: 'Active' });
  const inactiveLaboratories = await Provider.countDocuments({ clinicId, providerType: 'Laboratory', status: 'Inactive' });

  const laboratoryStaff = await User.countDocuments({ clinicId, providerId: { $in: labIds } });

  let testsInInventory = 0;
  try {
    testsInInventory = await ClinicLabCatalog.countDocuments({ clinicId });
  } catch { }

  let lowStockAlerts = 0;
  try {
    lowStockAlerts = await LabConsumable.countDocuments({ clinicId, $expr: { $lte: ['$totalStock', '$reorderLevel'] } });
  } catch { }

  let pendingOrders = 0;
  try {
    pendingOrders = await LabOrder.countDocuments({ clinicId, status: 'ordered' });
  } catch { }

  let pendingTestOrders = 0;
  try {
    pendingTestOrders = await LabOrder.countDocuments({ clinicId, status: { $in: ['sample_collected', 'processing'] } });
  } catch { }

  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
  let expiringSoon = 0;
  try {
    expiringSoon = await LabConsumableBatch.countDocuments({
      clinicId,
      availableStock: { $gt: 0 },
      expiryDate: { $gte: new Date(), $lte: thirtyDaysLater }
    });
  } catch { }

  let todayRevenue = 0;
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayInvoices = await Invoice.find({
      clinicId,
      createdAt: { $gte: todayStart },
      status: 'paid'
    });
    for (const inv of todayInvoices) {
      if (inv.items) {
        for (const item of inv.items) {
          if (item.itemType === 'LabTest' || item.itemType === 'Laboratory' || item.name?.toLowerCase().includes('lab')) {
            todayRevenue += item.amount || 0;
          }
        }
      }
    }
  } catch { }



  return {
    totalLaboratories,
    activeLaboratories,
    inactiveLaboratories,
    laboratoryStaff,
    testsInInventory,
    lowStockAlerts,
    pendingOrders,
    pendingTestOrders,
    expiringSoon,
    todayRevenue
  };
};

module.exports = {
  getLaboratoryStats,
  createProvider,
  getProviders,
  getProviderById,
  updateProvider,
  archiveProvider,
  changeStatus
};
