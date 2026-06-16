const sanitizeUser = (user) => {
  if (!user) {
    return null;
  }

  const source = typeof user.toObject === 'function' ? user.toObject() : { ...user };
  const { password, __v, deletedAt, ...sanitized } = source;

  return sanitized;
};

module.exports = { sanitizeUser };
