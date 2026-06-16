const { HTTP_STATUS } = require('../constants/httpStatus');

const successResponse = (message, data) => ({
  success: true,
  message,
  data
});

const errorResponse = (message, errors = [], stack) => ({
  success: false,
  message,
  errors,
  ...(stack ? { stack } : {})
});

const sendSuccess = (res, message, data = {}, statusCode = HTTP_STATUS.OK) =>
  res.status(statusCode).json(successResponse(message, data));

const sendError = (res, message, errors = [], statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, stack) =>
  res.status(statusCode).json(errorResponse(message, errors, stack));

module.exports = {
  successResponse,
  errorResponse,
  sendSuccess,
  sendError
};
