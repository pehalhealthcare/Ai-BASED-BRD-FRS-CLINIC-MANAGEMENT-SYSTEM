const { Router } = require('express');
const { ROLES } = require('../../common/constants/roles');
const { protect } = require('../../common/middlewares/auth.middleware');
const { authorize } = require('../../common/middlewares/role.middleware');
const controller = require('./healthcareCatalog.controller');

const router = Router();

// ─── Read-only search routes for Clinic Admins ────────────────────────────────
// These allow clinic admins to search/browse the global catalog to import items.
// Must be registered BEFORE the SUPER_ADMIN-only middleware block.
router.get('/search/labs', protect, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LAB_TECHNICIAN, ROLES.LAB_OPERATOR), controller.getLabTests);
router.get('/search/medicines', protect, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PHARMACIST), controller.getGenericMedicines);
router.get('/search/categories', protect, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), controller.getCategories);
router.get('/search/parameters', protect, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), controller.getParameters);
router.get('/search/units', protect, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), controller.getUnits);
router.get('/search/conditions', protect, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), controller.getConditions);
router.post('/search/medicines/draft', protect, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), controller.createMedicineDraft);
router.post('/search/labs/draft', protect, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), controller.createLabTestDraft);

router.get('/parameters/:id/rules', protect, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), controller.getParameterClinicalRules);
router.post('/parameters/:id/validate-result', protect, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), controller.validateParameterResult);

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

// Global Parameter routes
router.get('/parameters', controller.getParameters);
router.post('/parameters', controller.createParameter);
router.put('/parameters/:id', controller.updateParameter);

// Laboratory Unit & Conditions routes
router.get('/global-lab/units', controller.getUnits);
router.post('/global-lab/units', controller.createUnit);
router.get('/global-lab/conditions', controller.getConditions);
router.post('/global-lab/conditions', controller.createCondition);

router.get('/labs/:investigationId/parameters', controller.getParametersForInvestigation);
router.post('/labs/:investigationId/parameters', controller.mapParameterToInvestigation);
router.delete('/labs/:investigationId/parameters/:parameterId', controller.unmapParameterFromInvestigation);
router.put('/labs/:investigationId/parameters/reorder', controller.reorderInvestigationParameters);
router.get('/labs/:investigationId/composition', controller.resolveInvestigationComposition);

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

// Catalogue Updates version management routes
router.get('/catalogue-updates', controller.getCatalogueUpdates);
router.post('/catalogue-updates', controller.importCatalogueUpdate);
router.post('/catalogue-updates/:id/apply', controller.applyCatalogueUpdate);

module.exports = router;
