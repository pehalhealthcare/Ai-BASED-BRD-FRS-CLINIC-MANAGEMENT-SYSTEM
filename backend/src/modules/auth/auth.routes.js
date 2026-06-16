const { Router } = require('express');

const { protect } = require('../../common/middlewares/auth.middleware');
const { validate } = require('../../common/middlewares/validate.middleware');
const authController = require('./auth.controller');
const { loginSchema, registerSchema } = require('./auth.validator');

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
router.get('/me', protect, authController.me);
router.post('/logout', protect, authController.logout);

module.exports = router;
