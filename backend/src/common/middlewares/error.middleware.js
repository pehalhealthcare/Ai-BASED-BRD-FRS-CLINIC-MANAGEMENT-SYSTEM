const mongoose = require('mongoose');
const { ZodError } = require('zod');

const { env } = require('../../config/env');
const { HTTP_STATUS } = require('../constants/httpStatus');
const { RESPONSE_MESSAGES } = require('../constants/responseMessages');
const { AppError } = require('../utils/AppError');
const { sendError } = require('../utils/apiResponse');
const { logger } = require('../utils/logger');

const includeStack = (error) => (env.isDevelopment ? error.stack : undefined);

const isDatabaseUnavailableError = (error) => {
  if (!error) {
    return false;
  }

  return (
    error.name === 'MongoNotConnectedError' ||
    error.name === 'MongoServerSelectionError' ||
    (error.message && error.message.includes('buffering timed out after')) ||
    (error.message && error.message.includes('before initial connection is complete if `bufferCommands = false`'))
  );
};

const errorMiddleware = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    const issues = error.issues.map((issue) => ({
      field: issue.path.join('.') || undefined,
      message: issue.message
    }));
    const message = issues.map((i) => (i.field ? `${i.field}: ${i.message}` : i.message)).join('; ') || RESPONSE_MESSAGES.VALIDATION_FAILED;

    return sendError(
      res,
      message,
      issues,
      HTTP_STATUS.BAD_REQUEST,
      includeStack(error)
    );
  }

  if (error instanceof mongoose.Error.ValidationError) {
    const details = Object.values(error.errors).map((issue) => ({
      field: issue.path,
      message: issue.message
    }));
    const message = details.map((i) => (i.field ? `${i.field}: ${i.message}` : i.message)).join('; ') || RESPONSE_MESSAGES.VALIDATION_FAILED;

    return sendError(
      res,
      message,
      details,
      HTTP_STATUS.BAD_REQUEST,
      includeStack(error)
    );
  }

  if (error && error.code === 11000) {
    const rawKeys = Object.keys(error.keyValue || {});
    // Filter out clinic context IDs or other internal keys if multiple keys exist in a compound index
    const duplicateFields = rawKeys.filter(key => key !== 'clinicId' && key !== 'organizationId');
    
    // If we filtered out everything, default back to rawKeys
    const fieldsToReport = duplicateFields.length > 0 ? duplicateFields : rawKeys;
    
    const details = fieldsToReport.map((field) => {
      const val = error.keyValue[field];
      const fieldName = field.charAt(0).toUpperCase() + field.slice(1);
      return `${fieldName} "${val}" already exists.`;
    });
    
    const friendlyMessage = details.join(' ');

    return sendError(
      res,
      friendlyMessage,
      fieldsToReport.map((field) => ({
        field,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`
      })),
      HTTP_STATUS.CONFLICT,
      includeStack(error)
    );
  }

  if (error instanceof mongoose.Error.CastError) {
    return sendError(
      res,
      RESPONSE_MESSAGES.INVALID_IDENTIFIER,
      [{ field: error.path, message: `Invalid value provided for ${error.path}.` }],
      HTTP_STATUS.BAD_REQUEST,
      includeStack(error)
    );
  }

  if (error instanceof AppError) {
    const safeStack = error.statusCode >= HTTP_STATUS.INTERNAL_SERVER_ERROR ? undefined : includeStack(error);
    return sendError(res, error.message, error.errors, error.statusCode, safeStack);
  }

  if (isDatabaseUnavailableError(error)) {
    return sendError(
      res,
      RESPONSE_MESSAGES.DATABASE_UNAVAILABLE,
      [{ message: 'Database connection is not currently available.' }],
      HTTP_STATUS.SERVICE_UNAVAILABLE,
      includeStack(error)
    );
  }

  if (error && (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError')) {
    return sendError(
      res,
      'Authentication failed.',
      [{ message: error.name === 'TokenExpiredError' ? 'Token has expired.' : 'Invalid token.' }],
      HTTP_STATUS.UNAUTHORIZED,
      includeStack(error)
    );
  }

  logger.error('Unhandled backend error', error);

  return sendError(
    res,
    RESPONSE_MESSAGES.INTERNAL_SERVER_ERROR,
    [{ message: 'An unexpected error occurred.' }],
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    includeStack(error)
  );
};

module.exports = { errorMiddleware };
