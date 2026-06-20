const { Router } = require('express');

const { protect } = require('../../common/middlewares/auth.middleware');
const { validate } = require('../../common/middlewares/validate.middleware');
const authController = require('./auth.controller');
const { loginSchema, registerSchema, resetPasswordSchema } = require('./auth.validator');

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
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);
router.get('/me', protect, authController.me);
router.post('/logout', protect, authController.logout);

module.exports = router;
