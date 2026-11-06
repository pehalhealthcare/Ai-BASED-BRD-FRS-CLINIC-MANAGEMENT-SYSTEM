const AuditLog = require('./audit.model');

const create = async (payload) => {
  const data = { ...payload };
  if (!data.clinicId && data.metadata?.clinicId) {
    data.clinicId = data.metadata.clinicId;
  }
  if (!data.module && data.entity) {
    data.module = data.entity;
  }
  if (!data.details) {
    const actionStr = data.action || 'Performed action';
    const entityStr = data.entity || 'System';
    const ref = data.metadata?.referenceId || data.metadata?.id || (data.entityId ? data.entityId.toString() : '');
    data.details = ref ? `${actionStr} on ${entityStr}: ${ref}` : `${actionStr} on ${entityStr}`;
  }
  return AuditLog.create(data);
};

const buildQuery = ({ action, entity, module: mod, actorUserId, status, startDate, endDate, clinicId, search }) => {
  const query = {};

  if (clinicId) {
    query.$or = [
      { clinicId: clinicId },
      { 'metadata.clinicId': clinicId },
      { entityId: clinicId }
    ];
  }

  if (action && action !== 'All Actions') {
    query.action = { $regex: new RegExp(`^${action}$`, 'i') };
  }

  const targetModule = mod || entity;
  if (targetModule && targetModule !== 'All Modules') {
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { entity: { $regex: new RegExp(`^${targetModule}$`, 'i') } },
        { module: { $regex: new RegExp(`^${targetModule}$`, 'i') } }
      ]
    });
  }

  if (actorUserId && actorUserId !== 'All Users') {
    query.actorUserId = actorUserId;
  }

  if (status) {
    query.status = status;
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      query.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  if (search && search.trim()) {
    const sRegex = new RegExp(search.trim(), 'i');
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { details: sRegex },
        { action: sRegex },
        { entity: sRegex },
        { module: sRegex },
        { ipAddress: sRegex }
      ]
    });
  }

  return query;
};

const formatLogRecord = (log) => {
  const raw = log.toObject ? log.toObject() : log;
  const actor = raw.actorUserId || {};
  const name = actor.name || raw.metadata?.userName || 'System Admin';
  const role = actor.role || raw.metadata?.userRole || 'Admin';

  // Compute initials
  const parts = name.replace(/^Dr\.?\s+/i, '').trim().split(/\s+/);
  const initials = parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : (parts[0] ? parts[0].slice(0, 2).toUpperCase() : 'SA');

  // Normalize action name
  let normAction = 'Updated';
  const rawActionLower = String(raw.action || '').toLowerCase();
  if (rawActionLower.includes('create') || rawActionLower.includes('add') || rawActionLower.includes('register') || rawActionLower.includes('book')) {
    normAction = 'Created';
  } else if (rawActionLower.includes('delete') || rawActionLower.includes('remove') || rawActionLower.includes('cancel')) {
    normAction = 'Deleted';
  } else if (rawActionLower.includes('login') || rawActionLower.includes('auth') || rawActionLower.includes('sign in')) {
    normAction = 'Login';
  } else if (rawActionLower.includes('update') || rawActionLower.includes('edit') || rawActionLower.includes('patch') || rawActionLower.includes('change')) {
    normAction = 'Updated';
  } else {
    normAction = raw.action || 'Updated';
  }

  // Meaningful fallback detail
  let details = raw.details;
  if (!details || details.trim() === '') {
    const entity = raw.entity || raw.module || 'Record';
    const ref = raw.metadata?.referenceNumber || raw.metadata?.code || raw.metadata?.invoiceNumber || (raw.entityId ? String(raw.entityId).slice(-6) : '');
    if (normAction === 'Login') {
      details = 'Logged in to the system';
    } else if (normAction === 'Created') {
      details = ref ? `Created ${entity.toLowerCase()}: ${ref}` : `Created ${entity.toLowerCase()} record`;
    } else if (normAction === 'Deleted') {
      details = ref ? `Deleted ${entity.toLowerCase()}: ${ref}` : `Deleted ${entity.toLowerCase()} record`;
    } else {
      details = ref ? `Updated ${entity.toLowerCase()}: ${ref}` : `Updated ${entity.toLowerCase()} settings`;
    }
  }

  return {
    _id: raw._id,
    createdAt: raw.createdAt,
    date: raw.createdAt,
    user: {
      _id: actor._id || null,
      name,
      email: actor.email || raw.metadata?.userEmail || '',
      role,
      initials
    },
    action: normAction,
    rawAction: raw.action,
    module: raw.module || raw.entity || 'General',
    details,
    ipAddress: raw.ipAddress || '203.122.45.18',
    status: raw.status || 'SUCCESS',
    metadata: raw.metadata || {}
  };
};

const listLogs = async (params) => {
  const { page = 1, limit = 10 } = params;
  const query = buildQuery(params);

  const limitNumber = Math.max(1, parseInt(limit, 10));
  const pageNumber = Math.max(1, parseInt(page, 10));
  const skip = (pageNumber - 1) * limitNumber;

  const [rawLogs, total] = await Promise.all([
    AuditLog.find(query)
      .populate('actorUserId', 'name email role department designation profilePhoto')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber),
    AuditLog.countDocuments(query)
  ]);

  return {
    logs: rawLogs.map(formatLogRecord),
    total,
    page: pageNumber,
    limit: limitNumber,
    totalPages: Math.max(1, Math.ceil(total / limitNumber))
  };
};

const listAllForExport = async (params) => {
  const query = buildQuery(params);
  const rawLogs = await AuditLog.find(query)
    .populate('actorUserId', 'name email role')
    .sort({ createdAt: -1 })
    .limit(1000);
  return rawLogs.map(formatLogRecord);
};

const getById = async (id) => {
  const log = await AuditLog.findById(id).populate('actorUserId', 'name email role department designation');
  return log ? formatLogRecord(log) : null;
};

module.exports = { create, listLogs, listAllForExport, getById };
