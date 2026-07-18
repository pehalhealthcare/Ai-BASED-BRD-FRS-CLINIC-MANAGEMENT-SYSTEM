const { Router } = require('express');

const { authorize } = require('../../common/middlewares/role.middleware');
const { protect } = require('../../common/middlewares/auth.middleware');
const { validate } = require('../../common/middlewares/validate.middleware');
const { ROLES } = require('../../common/constants/roles');
const userController = require('./user.controller');
const {
  listUsersQuerySchema,
  updateRoleSchema,
  updateStatusSchema,
  updateProviderSchema,
  userIdParamSchema
} = require('./user.validator');

const router = Router();

/**
 * @openapi
 * /users:
 *   get:
 *     summary: List users
 *     tags:
 *       - Users
 */
router.get('/', protect, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), validate(listUsersQuerySchema), userController.listUsers);
router.post('/', protect, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), userController.createStaff);

router.get('/:id', protect, validate(userIdParamSchema), userController.getUserById);

router.patch('/:id/role',protect,authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),validate(updateRoleSchema),userController.updateUserRole);

router.patch('/:id/status',protect,authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),validate(updateStatusSchema),userController.updateUserStatus);

router.patch('/:id/provider',protect,authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),validate(updateProviderSchema),userController.updateUserProvider);

router.delete('/:id', protect, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), validate(userIdParamSchema), userController.deleteUser);

module.exports = router;
