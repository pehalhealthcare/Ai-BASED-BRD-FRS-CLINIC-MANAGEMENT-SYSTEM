const { sendSuccess } = require('../../common/utils/apiResponse');
const { asyncHandler } = require('../../common/utils/asyncHandler');
const pharmacyService = require('./pharmacy.service');
const MedicineMaster = require('./medicineMaster.model');
const BrandMaster = require('./brandMaster.model');
const PharmacyCoupon = require('./pharmacyCoupon.model');

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

const updateBatchStatus = asyncHandler(async (req, res) => {
  const data = await pharmacyService.updateBatchStatus({
    requester: req.user,
    batchId: req.params.id,
    payload: req.body,
    req
  });

  return sendSuccess(res, 'Batch status updated successfully', data);
});

const deleteBatch = asyncHandler(async (req, res) => {
  const data = await pharmacyService.deleteBatch({
    requester: req.user,
    batchId: req.params.id,
    req
  });

  return sendSuccess(res, 'Batch deleted successfully', data);
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

const createWalkinSale = asyncHandler(async (req, res) => {
  const data = await pharmacyService.createWalkinSale({
    requester: req.user,
    payload: req.body,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Walk-in sale completed successfully', data, 201);
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
    payload: req.body,
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

const createManufacturer = asyncHandler(async (req, res) => {
  const manufacturer = await pharmacyService.createManufacturer({
    requester: req.user,
    payload: req.body,
    requestedClinicId: req.query.clinicId
  });
  return sendSuccess(res, 'Manufacturer created successfully', { manufacturer }, 201);
});

const listManufacturers = asyncHandler(async (req, res) => {
  const manufacturers = await pharmacyService.listManufacturers({
    requester: req.user,
    query: req.query,
    requestedClinicId: req.query.clinicId
  });
  return sendSuccess(res, 'Manufacturers retrieved successfully', { manufacturers });
});

const updateManufacturer = asyncHandler(async (req, res) => {
  const manufacturer = await pharmacyService.updateManufacturer({
    requester: req.user,
    manufacturerId: req.params.id,
    payload: req.body,
    requestedClinicId: req.query.clinicId
  });
  return sendSuccess(res, 'Manufacturer updated successfully', { manufacturer });
});

const deleteManufacturer = asyncHandler(async (req, res) => {
  const result = await pharmacyService.deleteManufacturer({
    requester: req.user,
    manufacturerId: req.params.id,
    requestedClinicId: req.query.clinicId
  });
  return sendSuccess(res, 'Manufacturer deleted successfully', result);
});

const getManufacturerAnalytics = asyncHandler(async (req, res) => {
  const analytics = await pharmacyService.getManufacturerAnalytics({
    requester: req.user,
    manufacturerId: req.params.id,
    requestedClinicId: req.query.clinicId
  });
  return sendSuccess(res, 'Manufacturer analytics retrieved successfully', { analytics });
});

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

const getSupplierAnalytics = asyncHandler(async (req, res) => {
  const analytics = await pharmacyService.getSupplierAnalytics({
    requester: req.user,
    supplierId: req.params.id,
    requestedClinicId: req.query.clinicId
  });
  return sendSuccess(res, 'Supplier analytics retrieved successfully', { analytics });
});

const getSupplierPurchaseHistory = asyncHandler(async (req, res) => {
  const history = await pharmacyService.getSupplierPurchaseHistory({
    requester: req.user,
    supplierId: req.params.id,
    requestedClinicId: req.query.clinicId
  });
  return sendSuccess(res, 'Supplier purchase history retrieved successfully', { history });
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
const updatePurchaseOrderStatus = asyncHandler(async (req, res) => {
  const purchaseOrder = await pharmacyService.updatePurchaseOrderStatus({
    requester: req.user,
    poId: req.params.id,
    payload: req.body,
    requestedClinicId: req.query.clinicId
  });
  return sendSuccess(res, 'Purchase order status updated successfully', { purchaseOrder });
});

const recordPoPayment = asyncHandler(async (req, res) => {
  const purchaseOrder = await pharmacyService.recordPoPayment({
    requester: req.user,
    poId: req.params.id,
    payload: req.body,
    requestedClinicId: req.query.clinicId
  });
  return sendSuccess(res, 'Payment recorded successfully', { purchaseOrder });
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

const getPharmacyReports = asyncHandler(async (req, res) => {
  const reports = await pharmacyService.getPharmacyReports({
    requester: req.user,
    requestedClinicId: req.query.clinicId,
    providerId: req.query.providerId
  });
  return sendSuccess(res, 'Pharmacy reports and analytics retrieved successfully', reports);
});

const getPharmacySalesPerformance = asyncHandler(async (req, res) => {
  const analytics = await pharmacyService.getPharmacySalesPerformance({
    requester: req.user,
    requestedClinicId: req.query.clinicId,
    providerId: req.query.providerId,
    filters: {
      from: req.query.from,
      to: req.query.to,
      category: req.query.category,
      manufacturer: req.query.manufacturer,
      supplier: req.query.supplier,
      doctorId: req.query.doctorId,
      customerType: req.query.customerType,
      paymentMethod: req.query.paymentMethod,
      medicineId: req.query.medicineId,
      orderStatus: req.query.orderStatus,
      couponCode: req.query.couponCode
    }
  });
  return sendSuccess(res, 'Pharmacy sales performance analytics retrieved successfully', analytics);
});

// ─── INVENTORY DASHBOARD CONTROLLERS ──────────────────────────────────────────

const getPharmacyInventoryDashboard = asyncHandler(async (req, res) => {
  const stats = await pharmacyService.getPharmacyInventoryDashboard({
    requester: req.user,
    requestedClinicId: req.query.clinicId,
    providerId: req.query.providerId
  });
  return sendSuccess(res, 'Dispensary inventory dashboard statistics retrieved', stats);
});

// Pharmacy Coupons Controllers
const createCoupon = asyncHandler(async (req, res) => {
  const { 
    code, description, type, value, displayOnCheckout, expiryDate, clinicId, providerId,
    minOrderValue, maxDiscount, usageLimit, usedCount, applicableMedicines, eligiblePatients
  } = req.body;
  if (!code || !type || value === undefined || !clinicId || !providerId) {
    return res.status(400).json({ success: false, message: 'Missing required coupon fields.' });
  }

  const existing = await PharmacyCoupon.findOne({ providerId, code: code.toUpperCase(), isActive: true });
  if (existing) {
    return res.status(400).json({ success: false, message: `Coupon code "${code.toUpperCase()}" already exists.` });
  }

  const coupon = await PharmacyCoupon.create({
    clinicId,
    providerId,
    code: code.toUpperCase(),
    description,
    type,
    value,
    displayOnCheckout: displayOnCheckout !== false,
    expiryDate,
    minOrderValue: minOrderValue || 0,
    maxDiscount: maxDiscount || 0,
    usageLimit: usageLimit || 100,
    usedCount: usedCount || 0,
    applicableMedicines: applicableMedicines || [],
    eligiblePatients: eligiblePatients || 'everyone'
  });

  return sendSuccess(res, 'Pharmacy coupon created successfully', { coupon }, 201);
});

const listCoupons = asyncHandler(async (req, res) => {
  const { clinicId, providerId, displayOnCheckout } = req.query;
  const filter = {};
  if (clinicId) filter.clinicId = clinicId;
  if (providerId) filter.providerId = providerId;
  if (displayOnCheckout !== undefined) filter.displayOnCheckout = displayOnCheckout === 'true';
  filter.isActive = true;

  const coupons = await PharmacyCoupon.find(filter).sort({ createdAt: -1 });
  return sendSuccess(res, 'Pharmacy coupons retrieved successfully', { coupons });
});

const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await PharmacyCoupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!coupon) {
    return res.status(404).json({ success: false, message: 'Coupon not found.' });
  }
  return sendSuccess(res, 'Pharmacy coupon updated successfully', { coupon });
});

const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await PharmacyCoupon.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!coupon) {
    return res.status(404).json({ success: false, message: 'Coupon not found.' });
  }
  return sendSuccess(res, 'Pharmacy coupon archived successfully', { coupon });
});

module.exports = {
  updateCoupon,
  createMedicine,
  listMedicines,
  getMedicineById,
  getMedicineDemandForecast,
  updateMedicine,
  addMedicineBatch,
  updateBatchStatus,
  deleteBatch,
  dispensePrescription,
  createWalkinSale,
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
  getSupplierAnalytics,
  getSupplierPurchaseHistory,
  createManufacturer,
  listManufacturers,
  updateManufacturer,
  deleteManufacturer,
  getManufacturerAnalytics,
  createPurchaseOrder,
  listPurchaseOrders,
  updatePurchaseOrderStatus,
  recordPoPayment,
  receivePurchaseOrder,
  adjustStock,
  listStockLedgers,
  getPharmacyInventoryDashboard,
  getPharmacyReports,
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
  }),
  regeneratePickupCode: asyncHandler(async (req, res) => {
    const order = await pharmacyService.regeneratePickupCode({
      requester: req.user,
      orderId: req.params.id,
      req
    });
    return sendSuccess(res, 'Pickup code regenerated successfully', { order });
  }),
  verifyPickupCode: asyncHandler(async (req, res) => {
    const order = await pharmacyService.verifyPickupCode({
      requester: req.user,
      orderId: req.params.id,
      pickupCode: req.body.pickupCode,
      verificationMethod: req.body.verificationMethod || 'Manual',
      req
    });
    return sendSuccess(res, 'Pickup verified successfully. Order completed.', { order });
  }),
  createCoupon,
  listCoupons,
  deleteCoupon,
  getPharmacySalesPerformance
};
