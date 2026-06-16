import { aiApi, prescriptionApi } from '../../lib/api';

export const createPrescription = (payload) => prescriptionApi.create(payload);
export const getPrescription = (id) => prescriptionApi.get(id);
export const getPrescriptionsByPatient = (patientId, params) => prescriptionApi.getByPatient(patientId, params);
export const getPrescriptionsByConsultation = (consultationId) => prescriptionApi.getByConsultation(consultationId);
export const updatePrescription = (id, payload) => prescriptionApi.update(id, payload);
export const finalizePrescription = (id, payload) => prescriptionApi.finalize(id, payload);
export const cancelPrescription = (id, payload) => prescriptionApi.cancel(id, payload);
export const downloadPrescriptionPdf = (id) => prescriptionApi.download(id);
export const formatPrescriptionAdvice = (payload) => aiApi.formatPrescriptionAdvice(payload);
export const drugSafetyCheck = (payload) => aiApi.drugSafetyCheck(payload);

export default prescriptionApi;
