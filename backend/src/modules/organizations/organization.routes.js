const { Router } = require('express');
const { ROLES } = require('../../common/constants/roles');
const { protect } = require('../../common/middlewares/auth.middleware');
const { authorize } = require('../../common/middlewares/role.middleware');
const {
  createOrganization,
  listOrganizations,
  getOrganizationDetails,
  updateOrganization,
  toggleOrganizationStatus,
  getMyOrganizationProfile,
  updateMyOrganizationProfile,
  getPublicOrganizations
} = require('./organization.controller');

const router = Router();

router.get('/public', getPublicOrganizations);

router.use(protect);

router.get('/profile', authorize(ROLES.ADMIN), getMyOrganizationProfile);
router.put('/profile', authorize(ROLES.ADMIN), updateMyOrganizationProfile);

router.use(authorize(ROLES.SUPER_ADMIN));

router.post('/', createOrganization);
router.get('/', listOrganizations);
router.get('/:id', getOrganizationDetails);
router.put('/:id', updateOrganization);
router.patch('/:id/status', toggleOrganizationStatus);

module.exports = router;
