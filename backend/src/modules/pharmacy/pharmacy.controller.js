const { sendSuccess } = require('../../common/utils/apiResponse');
const { asyncHandler } = require('../../common/utils/asyncHandler');
const pharmacyService = require('./pharmacy.service');
const MedicineMaster = require('./medicineMaster.model');
const BrandMaster = require('./brandMaster.model');

const createMedicine = asyncHandler(async (req, res) => {
  const medicine = await pharmacyService.createMedicine({
    requester: req.user,
    payload: req.body,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Medicine created successfully', { medicine }, 201);
});

const listMedicines = asyncHandler(async (req, res) => {
  const data = await pharmacyService.listMedicines({
    requester: req.user,
    query: req.query,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Medicines retrieved successfully', data);
});

const getMedicineById = asyncHandler(async (req, res) => {
  const data = await pharmacyService.getMedicineById({
    requester: req.user,
    medicineId: req.params.id,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Medicine retrieved successfully', data);
});

const getMedicineDemandForecast = asyncHandler(async (req, res) => {
  const data = await pharmacyService.getMedicineDemandForecast({
    requester: req.user,
    medicineId: req.params.id,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Medicine demand forecast retrieved successfully', data);
});

const updateMedicine = asyncHandler(async (req, res) => {
  const medicine = await pharmacyService.updateMedicine({
    requester: req.user,
    medicineId: req.params.id,
    payload: req.body,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Medicine updated successfully', { medicine });
});

const addMedicineBatch = asyncHandler(async (req, res) => {
  const medicine = await pharmacyService.addMedicineBatch({
    requester: req.user,
    medicineId: req.params.id,
    payload: req.body,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Medicine batch added successfully', { medicine }, 201);
});

const dispensePrescription = asyncHandler(async (req, res) => {
  const data = await pharmacyService.dispensePrescription({
    requester: req.user,
    payload: req.body,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Medicines dispensed successfully', data, 201);
});

const listDispensings = asyncHandler(async (req, res) => {
  const data = await pharmacyService.listDispensings({
    requester: req.user,
    query: req.query,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Dispensing records retrieved successfully', data);
});

const getDispensingById = asyncHandler(async (req, res) => {
  const data = await pharmacyService.getDispensingById({
    requester: req.user,
    dispensingId: req.params.id,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Dispensing record retrieved successfully', data);
});

const cancelDispensing = asyncHandler(async (req, res) => {
  const dispensingRecord = await pharmacyService.cancelDispensing({
    requester: req.user,
    dispensingId: req.params.id,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Dispensing record cancelled successfully', {
    dispensingRecord
  });
});

const getPatientMedicineHistory = asyncHandler(async (req, res) => {
  const data = await pharmacyService.getPatientMedicineHistory({
    requester: req.user,
    patientId: req.params.patientId,
    query: req.query,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Patient medicine history retrieved successfully', data);
});


const createPharmacyOrder = asyncHandler(async (req, res) => {
  const pharmacyOrder = await pharmacyService.createPharmacyOrder({
    requester: req.user,
    payload: req.body,
    req
  });
  return sendSuccess(res, 'Pharmacy order created successfully', { pharmacyOrder }, 201);
});

const listPharmacyOrders = asyncHandler(async (req, res) => {
  const data = await pharmacyService.listPharmacyOrders({
    requester: req.user,
    query: req.query
  });
  return sendSuccess(res, 'Pharmacy orders retrieved successfully', data);
});

const updatePharmacyOrderStatus = asyncHandler(async (req, res) => {
  const pharmacyOrder = await pharmacyService.updatePharmacyOrderStatus({
    requester: req.user,
    orderId: req.params.id,
    status: req.body.status,
    req
  });
  return sendSuccess(res, 'Pharmacy order status updated successfully', { pharmacyOrder });
});

const listMedicineMasters = asyncHandler(async (req, res) => {
  const query = req.query.search
    ? { genericName: { $regex: new RegExp(req.query.search, 'i') } }
    : {};
  const masters = await MedicineMaster.find(query).limit(100);
  return sendSuccess(res, 'Medicine masters retrieved', { masters });
});

const listBrandMasters = asyncHandler(async (req, res) => {
  const query = req.query.search
    ? { brandName: { $regex: new RegExp(req.query.search, 'i') } }
    : {};
  if (req.query.genericMedicineId) {
    query.genericMedicineId = req.query.genericMedicineId;
  }
  const brands = await BrandMaster.find(query).populate('genericMedicineId').limit(100);
  return sendSuccess(res, 'Brand masters retrieved', { brands });
});

// ─── SUPPLIER MANAGEMENT CONTROLLERS ───────────────────────────────────────────

const createSupplier = asyncHandler(async (req, res) => {
  const supplier = await pharmacyService.createSupplier({
    requester: req.user,
    payload: req.body,
    requestedClinicId: req.query.clinicId
  });
  return sendSuccess(res, 'Supplier created successfully', { supplier }, 201);
});

const listSuppliers = asyncHandler(async (req, res) => {
  const suppliers = await pharmacyService.listSuppliers({
    requester: req.user,
    query: req.query,
    requestedClinicId: req.query.clinicId
  });
  return sendSuccess(res, 'Suppliers retrieved successfully', { suppliers });
});

const updateSupplier = asyncHandler(async (req, res) => {
  const supplier = await pharmacyService.updateSupplier({
    requester: req.user,
    supplierId: req.params.id,
    payload: req.body,
    requestedClinicId: req.query.clinicId
  });
  return sendSuccess(res, 'Supplier updated successfully', { supplier });
});

const deleteSupplier = asyncHandler(async (req, res) => {
  const result = await pharmacyService.deleteSupplier({
    requester: req.user,
    supplierId: req.params.id,
    requestedClinicId: req.query.clinicId
  });
  return sendSuccess(res, 'Supplier deleted successfully', result);
});

// ─── PURCHASE ORDER CONTROLLERS ───────────────────────────────────────────────

const createPurchaseOrder = asyncHandler(async (req, res) => {
  const purchaseOrder = await pharmacyService.createPurchaseOrder({
    requester: req.user,
    payload: req.body,
    requestedClinicId: req.query.clinicId
  });
  return sendSuccess(res, 'Purchase order created successfully', { purchaseOrder }, 201);
});

const listPurchaseOrders = asyncHandler(async (req, res) => {
  const purchaseOrders = await pharmacyService.listPurchaseOrders({
    requester: req.user,
    query: req.query,
    requestedClinicId: req.query.clinicId
  });
  return sendSuccess(res, 'Purchase orders retrieved successfully', { purchaseOrders });
});

const receivePurchaseOrder = asyncHandler(async (req, res) => {
  const purchaseOrder = await pharmacyService.receivePurchaseOrder({
    requester: req.user,
    poId: req.params.id,
    payload: req.body,
    requestedClinicId: req.query.clinicId,
    req
  });
  return sendSuccess(res, 'Purchase order received successfully', { purchaseOrder });
});

// ─── STOCK ADJUSTMENT CONTROLLERS ─────────────────────────────────────────────

const adjustStock = asyncHandler(async (req, res) => {
  const result = await pharmacyService.adjustStock({
    requester: req.user,
    payload: req.body,
    requestedClinicId: req.query.clinicId,
    req
  });
  return sendSuccess(res, 'Stock adjusted successfully', result);
});

// ─── STOCK LEDGER CONTROLLERS ─────────────────────────────────────────────────

const listStockLedgers = asyncHandler(async (req, res) => {
  const ledgers = await pharmacyService.listStockLedgers({
    requester: req.user,
    query: req.query,
    requestedClinicId: req.query.clinicId
  });
  return sendSuccess(res, 'Stock ledgers retrieved successfully', { ledgers });
});

// ─── INVENTORY DASHBOARD CONTROLLERS ──────────────────────────────────────────

const getPharmacyInventoryDashboard = asyncHandler(async (req, res) => {
  const stats = await pharmacyService.getPharmacyInventoryDashboard({
    requester: req.user,
    requestedClinicId: req.query.clinicId
  });
  return sendSuccess(res, 'Dispensary inventory dashboard statistics retrieved', stats);
});

module.exports = {
  createMedicine,
  listMedicines,
  getMedicineById,
  getMedicineDemandForecast,
  updateMedicine,
  addMedicineBatch,
  dispensePrescription,
  listDispensings,
  getDispensingById,
  cancelDispensing,
  getPatientMedicineHistory,
  createPharmacyOrder,
  listPharmacyOrders,
  updatePharmacyOrderStatus,
  listMedicineMasters,
  listBrandMasters,
  createSupplier,
  listSuppliers,
  updateSupplier,
  deleteSupplier,
  createPurchaseOrder,
  listPurchaseOrders,
  receivePurchaseOrder,
  adjustStock,
  listStockLedgers,
  getPharmacyInventoryDashboard,
  searchAllMedicines: asyncHandler(async (req, res) => {
    const data = await pharmacyService.searchAllMedicines({
      requester: req.user,
      search: req.query.search || '',
      clinicId: req.query.clinicId
    });
    return sendSuccess(res, 'Grouped medicine search results retrieved', data);
  }),
  createProcurementRequest: asyncHandler(async (req, res) => {
    const request = await pharmacyService.createProcurementRequest({
      requester: req.user,
      payload: req.body,
      clinicId: req.query.clinicId
    });
    return sendSuccess(res, 'Procurement request submitted successfully', { request }, HTTP_STATUS.CREATED);
  }),
  listProcurementRequests: asyncHandler(async (req, res) => {
    const requests = await pharmacyService.listProcurementRequests({
      requester: req.user,
      clinicId: req.query.clinicId
    });
    return sendSuccess(res, 'Procurement requests retrieved successfully', { requests });
  }),
  updateProcurementRequestStatus: asyncHandler(async (req, res) => {
    const request = await pharmacyService.updateProcurementRequestStatus({
      requester: req.user,
      requestId: req.params.id,
      status: req.body.status,
      clinicId: req.query.clinicId
    });
    return sendSuccess(res, 'Procurement request status updated successfully', { request });
  })
};
