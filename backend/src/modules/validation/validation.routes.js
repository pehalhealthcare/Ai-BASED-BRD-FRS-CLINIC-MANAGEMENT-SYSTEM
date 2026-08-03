const { Router } = require('express');
const validationController = require('./validation.controller');
const { protect } = require('../../common/middlewares/auth.middleware');

const router = Router();

// Endpoint for real-time validation checks during onboarding/setup
router.get('/email', protect, validationController.validateEmail);
router.get('/phone', protect, validationController.validatePhone);

module.exports = router;
