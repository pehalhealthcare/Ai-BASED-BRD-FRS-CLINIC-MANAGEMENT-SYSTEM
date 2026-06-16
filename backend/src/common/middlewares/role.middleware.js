const { HTTP_STATUS } = require('../constants/httpStatus');
const { RESPONSE_MESSAGES } = require('../constants/responseMessages');
const { AppError } = require('../utils/AppError');

const authorize =
  (...allowedRoles) =>
  (req, _res, next) => {
    if (!req.user) {
      return next(new AppError(RESPONSE_MESSAGES.AUTHENTICATION_REQUIRED, HTTP_STATUS.UNAUTHORIZED));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError(RESPONSE_MESSAGES.ACCESS_DENIED, HTTP_STATUS.FORBIDDEN));
    }

    return next();
  };

module.exports = { authorize };
