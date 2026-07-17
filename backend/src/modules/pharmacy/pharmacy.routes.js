const { Router } = require('express');

const { ROLES } = require('../../common/constants/roles');
const { protect } = require('../../common/middlewares/auth.middleware');
const { authorize } = require('../../common/middlewares/role.middleware');
const { validate } = require('../../common/middlewares/validate.middleware');
const pharmacyController = require('./pharmacy.controller');
const {
  createMedicineSchema,
  updateMedicineSchema,
  addBatchSchema,
  listMedicinesQuerySchema,
  dispenseSchema,
  listDispensingsQuerySchema,
  medicineIdParamSchema,
  dispensingIdParamSchema,
  cancelDispensingSchema,
  createPharmacyOrderSchema,
  listPharmacyOrdersQuerySchema,
  updatePharmacyOrderStatusSchema,
  createSupplierSchema,
  updateSupplierSchema,
  createPurchaseOrderSchema,
  receivePurchaseOrderSchema,
  adjustStockSchema
} = require('./pharmacy.validator');

const router = Router();

router.get(
  '/masters/medicines',
  protect,
  pharmacyController.listMedicineMasters
);

router.get(
  '/masters/brands',
  protect,
  pharmacyController.listBrandMasters
);

router.post(
  '/medicines',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PHARMACIST),
  validate(createMedicineSchema),
  pharmacyController.createMedicine
);
router.get(
  '/medicines',
  protect,
  authorize(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.PHARMACIST,
    ROLES.DOCTOR,
    ROLES.RECEPTIONIST,
    ROLES.PATIENT
  ),
  validate(listMedicinesQuerySchema),
  pharmacyController.listMedicines
);
router.get(
  '/medicines/:id',
  protect,
  authorize(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.PHARMACIST,
    ROLES.DOCTOR,
    ROLES.RECEPTIONIST,
    ROLES.PATIENT
  ),
  validate(medicineIdParamSchema),
  pharmacyController.getMedicineById
);
router.get(
  '/medicines/:id/forecast',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PHARMACIST),
  validate(medicineIdParamSchema),
  pharmacyController.getMedicineDemandForecast
);
router.patch(
  '/medicines/:id',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PHARMACIST),
  validate(updateMedicineSchema),
  pharmacyController.updateMedicine
);
router.post(
  '/medicines/:id/batches',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PHARMACIST),
  validate(addBatchSchema),
  pharmacyController.addMedicineBatch
);
router.post(
  '/dispense',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PHARMACIST),
  validate(dispenseSchema),
  pharmacyController.dispensePrescription
);
router.get(
  '/dispensings',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PHARMACIST),
  validate(listDispensingsQuerySchema),
  pharmacyController.listDispensings
);
router.get(
  '/dispensings/:id',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PHARMACIST),
  validate(dispensingIdParamSchema),
  pharmacyController.getDispensingById
);
router.patch(
  '/dispensings/:id/cancel',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(cancelDispensingSchema),
  pharmacyController.cancelDispensing
);

// Pharmacy Order endpoints
router.post(
  '/orders',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PHARMACIST, ROLES.PATIENT),
  validate(createPharmacyOrderSchema),
  pharmacyController.createPharmacyOrder
);

router.get(
  '/orders',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PHARMACIST, ROLES.PATIENT),
  validate(listPharmacyOrdersQuerySchema),
  pharmacyController.listPharmacyOrders
);

router.patch(
  '/orders/:id/status',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PHARMACIST),
  validate(updatePharmacyOrderStatusSchema),
  pharmacyController.updatePharmacyOrderStatus
);

// Inventory Management endpoints
router.get(
  '/inventory/dashboard',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PHARMACIST),
  pharmacyController.getPharmacyInventoryDashboard
);

router.post(
  '/inventory/adjust',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PHARMACIST),
  validate(adjustStockSchema),
  pharmacyController.adjustStock
);

router.get(
  '/inventory/ledger',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PHARMACIST),
  pharmacyController.listStockLedgers
);

// Supplier CRUD
router.post(
  '/suppliers',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PHARMACIST),
  validate(createSupplierSchema),
  pharmacyController.createSupplier
);

router.get(
  '/suppliers',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PHARMACIST),
  pharmacyController.listSuppliers
);

router.put(
  '/suppliers/:id',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PHARMACIST),
  validate(updateSupplierSchema),
  pharmacyController.updateSupplier
);

router.delete(
  '/suppliers/:id',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PHARMACIST),
  pharmacyController.deleteSupplier
);

// Purchase Orders
router.post(
  '/purchase-orders',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PHARMACIST),
  validate(createPurchaseOrderSchema),
  pharmacyController.createPurchaseOrder
);

router.get(
  '/purchase-orders',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PHARMACIST),
  pharmacyController.listPurchaseOrders
);

router.post(
  '/purchase-orders/:id/receive',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PHARMACIST),
  validate(receivePurchaseOrderSchema),
  pharmacyController.receivePurchaseOrder
);

// ─── Procurement & Grouped Search endpoints ───────────────────────────────────
router.get(
  '/search-all',
  protect,
  pharmacyController.searchAllMedicines
);

router.post(
  '/procurement-requests',
  protect,
  pharmacyController.createProcurementRequest
);

router.get(
  '/procurement-requests',
  protect,
  pharmacyController.listProcurementRequests
);

router.patch(
  '/procurement-requests/:id/status',
  protect,
  pharmacyController.updateProcurementRequestStatus
);

module.exports = router;
