const { RESPONSE_MESSAGES } = require('../../common/constants/responseMessages');
const { sendSuccess } = require('../../common/utils/apiResponse');
const { getHealthStatus } = require('./health.service');

const getHealth = (_req, res) => sendSuccess(res, RESPONSE_MESSAGES.HEALTH_CHECK_PASSED, getHealthStatus());

module.exports = { getHealth };
