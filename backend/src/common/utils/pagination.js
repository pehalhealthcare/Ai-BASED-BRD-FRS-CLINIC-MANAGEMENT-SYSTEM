const getPagination = ({ page = 1, limit = 10 } = {}) => {
  const normalizedPage = Number.isFinite(Number(page)) ? Math.max(1, Number(page)) : 1;
  const normalizedLimit = Number.isFinite(Number(limit)) ? Math.min(100, Math.max(1, Number(limit))) : 10;

  return {
    page: normalizedPage,
    limit: normalizedLimit,
    skip: (normalizedPage - 1) * normalizedLimit
  };
};

const buildPaginationMeta = ({ page, limit, total }) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit) || 1
});

module.exports = {
  getPagination,
  buildPaginationMeta
};
