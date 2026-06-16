import { patientApi, pharmacyApi, prescriptionApi } from '../../lib/api';

export const createMedicine = (payload) => pharmacyApi.createMedicine(payload);
export const listMedicines = (params) => pharmacyApi.listMedicines(params);
export const getMedicine = (id) => pharmacyApi.getMedicine(id);
export const getMedicineForecast = (id) => pharmacyApi.getForecast(id);
export const updateMedicine = (id, payload) => pharmacyApi.updateMedicine(id, payload);
export const addMedicineBatch = (id, payload) => pharmacyApi.addBatch(id, payload);
export const dispensePrescription = (payload) => pharmacyApi.dispense(payload);
export const listDispensings = (params) => pharmacyApi.listDispensings(params);
export const getDispensing = (id) => pharmacyApi.getDispensing(id);
export const cancelDispensing = (id, payload) => pharmacyApi.cancelDispensing(id, payload);
export const getPatientMedicineHistory = (patientId, params) => patientApi.medicines(patientId, params);
export const getPrescription = (id) => prescriptionApi.get(id);

export default pharmacyApi;
