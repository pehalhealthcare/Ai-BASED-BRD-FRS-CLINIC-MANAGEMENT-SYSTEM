const RESPONSE_MESSAGES = {
  HEALTH_CHECK_PASSED: 'Backend service is healthy',
  VALIDATION_FAILED: 'Validation failed.',
  INTERNAL_SERVER_ERROR: 'Internal server error.',
  DUPLICATE_RESOURCE: 'Duplicate resource.',
  INVALID_IDENTIFIER: 'Invalid resource identifier.',
  ROUTE_NOT_FOUND: 'Requested route was not found.',
  AUTHENTICATION_REQUIRED: 'Authentication is required.',
  ACCESS_DENIED: 'You do not have permission to perform this action.',
  DATABASE_UNAVAILABLE: 'Database is unavailable.',
  AI_SERVICE_UNAVAILABLE: 'AI service is temporarily unavailable'
};

module.exports = { RESPONSE_MESSAGES };
