const { Router } = require('express');
const { protect } = require('../../common/middlewares/auth.middleware');
const { authorize } = require('../../common/middlewares/role.middleware');
const { ROLES } = require('../../common/constants/roles');
const {
  listSpecializations,
  createSpecialization,
  updateSpecialization,
  deleteSpecialization,
  getSpecializationAnalytics
} = require('./specialization.controller');

const router = Router();

const optionalProtect = async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return protect(req, res, next);
  }
  return next();
};

router.get('/', optionalProtect, listSpecializations);
router.post('/', protect, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), createSpecialization);
router.put('/:id', protect, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), updateSpecialization);
router.delete('/:id', protect, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), deleteSpecialization);
router.get('/:id/analytics', protect, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), getSpecializationAnalytics);

module.exports = router;
