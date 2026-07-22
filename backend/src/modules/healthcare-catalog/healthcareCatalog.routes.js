const { Router } = require('express');
const { ROLES } = require('../../common/constants/roles');
const { protect } = require('../../common/middlewares/auth.middleware');
const { authorize } = require('../../common/middlewares/role.middleware');
const controller = require('./healthcareCatalog.controller');

const router = Router();

// ─── Read-only search routes for Clinic Admins ────────────────────────────────
// These allow clinic admins to search/browse the global catalog to import items.
// Must be registered BEFORE the SUPER_ADMIN-only middleware block.
router.get('/search/labs', protect, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), controller.getLabTests);
router.get('/search/medicines', protect, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PHARMACIST), controller.getGenericMedicines);
router.get('/search/categories', protect, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), controller.getCategories);
router.post('/search/medicines/draft', protect, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), controller.createMedicineDraft);
router.post('/search/labs/draft', protect, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), controller.createLabTestDraft);

// ─── Super Admin management routes ────────────────────────────────────────────
// All routes below require SUPER_ADMIN role
router.use(protect);
router.use(authorize(ROLES.SUPER_ADMIN));

// Category routes
router.get('/categories', controller.getCategories);
router.post('/categories', controller.createCategory);

// Lab test routes
router.get('/labs', controller.getLabTests);
router.post('/labs', controller.createLabTest);
router.put('/labs/:id', controller.updateLabTest);

// Medicine routes
router.get('/medicines', controller.getGenericMedicines);
router.post('/medicines', controller.createGenericMedicine);
router.put('/medicines/:id', controller.updateGenericMedicine);
router.put('/medicines/:id/classify', controller.classifyMedicine);
router.delete('/medicines/:id', controller.deleteGenericMedicine);

// Brand routes
router.get('/brands', controller.getBrands);
router.post('/brands', controller.createBrand);

// Import engine routes
router.post('/import/preview', controller.previewImport);
router.post('/import/confirm', controller.confirmImport);

module.exports = router;
