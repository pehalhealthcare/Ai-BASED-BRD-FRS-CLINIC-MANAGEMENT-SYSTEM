const { Router } = require('express');

const { protect } = require('../../common/middlewares/auth.middleware');
const { validate } = require('../../common/middlewares/validate.middleware');
const authController = require('./auth.controller');
const {
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  requestPasswordResetSchema,
  verifyPasswordResetSchema,
  sendClinicAdminOtpSchema,
  verifyClinicAdminOtpSchema,
  sendLoginOtpSchema,
  verifyLoginOtpSchema
} = require('./auth.validator');

const router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a user
 *     tags:
 *       - Auth
 */
router.post('/register', validate(registerSchema), authController.register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Login a user
 *     tags:
 *       - Auth
 */
router.post('/login', validate(loginSchema), authController.login);

// Password Reset Routes (Secure Two-Step Flow)
router.post('/password-reset/request', validate(requestPasswordResetSchema), authController.requestPasswordReset);
router.post('/password-reset/verify', validate(verifyPasswordResetSchema), authController.verifyPasswordReset);
router.post('/reset-password/request', validate(requestPasswordResetSchema), authController.requestPasswordReset);
router.post('/reset-password/verify', validate(verifyPasswordResetSchema), authController.verifyPasswordReset);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

router.post('/verify-first-login-otp', authController.verifyFirstLoginOtp);
router.post('/send-otp', validate(sendLoginOtpSchema), authController.sendLoginOtp);
router.post('/verify-otp', validate(verifyLoginOtpSchema), authController.verifyLoginOtp);
router.post('/clinic-admin/send-otp', validate(sendClinicAdminOtpSchema), authController.sendClinicAdminOtp);
router.post('/clinic-admin/verify-otp', validate(verifyClinicAdminOtpSchema), authController.verifyClinicAdminOtp);
router.get('/me', protect, authController.me);
router.post('/logout', protect, authController.logout);

module.exports = router;

