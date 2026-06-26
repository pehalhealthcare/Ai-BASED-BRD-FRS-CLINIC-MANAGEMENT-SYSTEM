const { sendSuccess } = require('../../common/utils/apiResponse');
const { asyncHandler } = require('../../common/utils/asyncHandler');
const pharmacyService = require('./pharmacy.service');

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
  updatePharmacyOrderStatus
};
