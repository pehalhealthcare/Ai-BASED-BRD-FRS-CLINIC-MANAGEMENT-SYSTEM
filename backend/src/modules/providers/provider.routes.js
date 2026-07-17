const { Router } = require('express');
const { ROLES } = require('../../common/constants/roles');
const { protect } = require('../../common/middlewares/auth.middleware');
const { authorize } = require('../../common/middlewares/role.middleware');
const controller = require('./provider.controller');
const mappingController = require('./providerMapping.controller');

const router = Router();

// Apply auth middleware to protect all routes
router.use(protect);
router.use(authorize(ROLES.ADMIN));

router.get('/branches', controller.getClinicBranches);

router.get('/', controller.getProviders);
router.post('/', controller.createProvider);

router.get('/:id', controller.getProvider);
router.put('/:id', controller.updateProvider);
router.delete('/:id', controller.archiveProvider);

router.patch('/:id/status', controller.changeStatus);

// Catalog mapping endpoints
router.get('/:providerId/mappings', mappingController.getMappings);
router.post('/mappings', mappingController.createMapping);
router.put('/mappings/:id', mappingController.updateMapping);
router.delete('/mappings/:id', mappingController.deleteMapping);
router.post('/mappings/import/preview', mappingController.previewImportMapping);

module.exports = router;
