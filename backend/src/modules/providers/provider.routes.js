const { Router } = require('express');
const { ROLES } = require('../../common/constants/roles');
const { protect } = require('../../common/middlewares/auth.middleware');
const { authorize } = require('../../common/middlewares/role.middleware');
const controller = require('./provider.controller');
const mappingController = require('./providerMapping.controller');

const router = Router();

// Apply auth middleware to protect all routes
router.use(protect);

router.get('/branches', authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN), controller.getClinicBranches);
router.get('/analytics/laboratory', authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN), controller.getLaboratoryStats);

// Validation endpoints
router.post('/validate/email', authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN), controller.validateProviderEmail);
router.post('/validate/phone', authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN), controller.validateProviderPhone);
router.post('/validate/manager-email', authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN), controller.validateManagerEmail);
router.post('/validate/manager-phone', authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN), controller.validateManagerPhone);
router.post('/validate/branch', authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN), controller.validateBranch);
router.post('/validate/provider-data', authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN), controller.validateProviderData);

// GET routes are accessible by any authenticated user (including Patients, Doctors, Receptionists)
router.get('/', controller.getProviders);
router.get('/:id', controller.getProvider);
router.get('/:providerId/mappings', mappingController.getMappings);

// Modify routes are restricted to Admin / Super Admin
router.post('/', authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN), controller.createProvider);
router.put('/:id', authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN), controller.updateProvider);
router.delete('/:id', authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN), controller.archiveProvider);
router.patch('/:id/status', authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN), controller.changeStatus);

// Catalog mapping modify endpoints
router.post('/mappings', authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN), mappingController.createMapping);
router.put('/mappings/:id', authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN), mappingController.updateMapping);
router.delete('/mappings/:id', authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN), mappingController.deleteMapping);
router.post('/mappings/import/preview', authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN), mappingController.previewImportMapping);

module.exports = router;
