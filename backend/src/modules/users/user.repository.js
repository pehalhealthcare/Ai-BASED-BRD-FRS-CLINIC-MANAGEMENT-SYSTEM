const User = require('./user.model');

const normalizeEmail = (email) => {
  if (typeof email !== 'string') {
    return email;
  }

  return email.trim().toLowerCase();
};

const buildBaseFilter = (filters = {}) => ({
  deletedAt: null,
  ...filters
});

const createUser = (payload) =>
  User.create({
    ...payload,
    email: normalizeEmail(payload.email)
  });

const findByEmail = (email, options = {}) => {
  const query = User.findOne(buildBaseFilter({ email: normalizeEmail(email) }));

  if (options.includePassword) {
    query.select('+password');
  }

  return query;
};

const findById = (id, options = {}) => {
  const query = User.findOne(buildBaseFilter({ _id: id }));

  if (options.includePassword) {
    query.select('+password');
  }

  return query;
};

const findActiveUserById = (id) => User.findOne(buildBaseFilter({ _id: id, isActive: true }));

const listUsers = async ({ filter = {}, page = 1, limit = 10, sort = { createdAt: -1 } }) => {
  const skip = (page - 1) * limit;
  const mergedFilter = buildBaseFilter(filter);

  const [users, total] = await Promise.all([
    User.find(mergedFilter).sort(sort).skip(skip).limit(limit),
    User.countDocuments(mergedFilter)
  ]);

  return {
    users,
    total
  };
};

const updateUserById = (id, updates, options = {}) =>
  User.findOneAndUpdate(buildBaseFilter({ _id: id }), updates, {
    new: true,
    runValidators: true,
    ...options
  });

const countByRole = (role) => User.countDocuments(buildBaseFilter({ role }));

module.exports = {
  createUser,
  findByEmail,
  findById,
  findActiveUserById,
  listUsers,
  updateUserById,
  countByRole,
  normalizeEmail
};
