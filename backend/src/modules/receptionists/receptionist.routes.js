const { Router } = require('express');
const { ROLES } = require('../../common/constants/roles');
const { protect } = require('../../common/middlewares/auth.middleware');
const { authorize } = require('../../common/middlewares/role.middleware');
const receptionistController = require('./receptionist.controller');

const router = Router();

router.get('/me/profile', protect, authorize(ROLES.RECEPTIONIST), receptionistController.getMyProfile);
router.put('/me/profile', protect, authorize(ROLES.RECEPTIONIST), receptionistController.updateMyProfile);
router.post('/me/submit', protect, authorize(ROLES.RECEPTIONIST), receptionistController.submitMyProfile);
router.post('/me/accept-slot', protect, authorize(ROLES.RECEPTIONIST), receptionistController.acceptMySlot);

module.exports = router;
