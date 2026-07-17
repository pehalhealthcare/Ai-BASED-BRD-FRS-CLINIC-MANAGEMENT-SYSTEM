const { HTTP_STATUS } = require('../constants/httpStatus');
const { RESPONSE_MESSAGES } = require('../constants/responseMessages');
const { AppError } = require('../utils/AppError');
const { verifyAccessToken } = require('../../modules/auth/token.service');
const userRepository = require('../../modules/users/user.repository');
const { ensureUserClinicContext } = require('../utils/clinicContext');

const protect = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError(RESPONSE_MESSAGES.AUTHENTICATION_REQUIRED, HTTP_STATUS.UNAUTHORIZED));
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);
    const user = await userRepository.findById(payload.sub);

    if (!user || user.deletedAt) {
      return next(new AppError(RESPONSE_MESSAGES.AUTHENTICATION_REQUIRED, HTTP_STATUS.UNAUTHORIZED));
    }

    const isOnboardingOrPending = [
      'pending_profile',
      'onboarding_in_progress',
      'pending_approval',
      're_edit',
      'changes_requested'
    ].includes(user.approvalStatus);

    if (!user.isActive && !isOnboardingOrPending) {
      return next(new AppError(RESPONSE_MESSAGES.AUTHENTICATION_REQUIRED, HTTP_STATUS.UNAUTHORIZED));
    }

    await ensureUserClinicContext(user);
    req.user = user;
    return next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }

    return next(new AppError(RESPONSE_MESSAGES.AUTHENTICATION_REQUIRED, HTTP_STATUS.UNAUTHORIZED));
  }
};

module.exports = { protect };
