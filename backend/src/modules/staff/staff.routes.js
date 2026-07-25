const express = require('express');
const router = express.Router();
const staffController = require('./staff.controller');
const { protect } = require('../../common/middlewares/auth.middleware');
const { authorize } = require('../../common/middlewares/role.middleware');
const { STAFF_ROLES } = require('../../common/constants/roles');

router.get('/me/profile', protect, authorize(...STAFF_ROLES), staffController.getMyProfile);
router.put('/me/profile', protect, authorize(...STAFF_ROLES), staffController.updateMyProfile);
router.post('/me/submit', protect, authorize(...STAFF_ROLES), staffController.submitMyProfile);
router.post('/me/accept-slot', protect, authorize(...STAFF_ROLES), staffController.acceptMySlot);

// Public onboarding & offer routes using secure tokens
router.get('/onboarding-details', staffController.getOnboardingDetailsByToken);
router.post('/submit-onboarding', staffController.submitOnboardingByToken);
router.post('/accept-offer', staffController.acceptOfferByToken);

module.exports = router;
