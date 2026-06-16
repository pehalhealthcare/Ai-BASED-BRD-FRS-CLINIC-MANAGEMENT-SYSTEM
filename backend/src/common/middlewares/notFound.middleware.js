const { HTTP_STATUS } = require('../constants/httpStatus');
const { AppError } = require('../utils/AppError');

const notFoundMiddleware = (req, _res, next) => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, HTTP_STATUS.NOT_FOUND));
};

module.exports = { notFoundMiddleware };
