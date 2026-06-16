const { Router } = require('express');
const { protect } = require('../../common/middlewares/auth.middleware');
const { authorize } = require('../../common/middlewares/role.middleware');
const { ROLES } = require('../../common/constants/roles');
const {
  listSpecializations,
  createSpecialization,
  deleteSpecialization
} = require('./specialization.controller');

const router = Router();

router.get('/', listSpecializations);
router.post('/', protect, authorize(ROLES.ADMIN), createSpecialization);
router.delete('/:id', protect, authorize(ROLES.ADMIN), deleteSpecialization);

module.exports = router;
