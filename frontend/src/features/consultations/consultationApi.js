import { consultationApi } from '../../lib/api';

export const createConsultation = (payload) => consultationApi.create(payload);
export const listConsultations = (params) => consultationApi.list(params);
export const getConsultation = (id) => consultationApi.get(id);
export const getAppointmentConsultation = (appointmentId) => consultationApi.getByAppointment(appointmentId);
export const updateConsultation = (id, payload) => consultationApi.update(id, payload);
export const uploadConsultationVoiceNote = (id, formData) => consultationApi.uploadVoiceNote(id, formData);
export const editConsultationAiNote = (id, payload) => consultationApi.editAiNote(id, payload);
export const approveConsultationAiNote = (id, payload) => consultationApi.approveAiNote(id, payload);
export const rejectConsultationAiNote = (id, payload) => consultationApi.rejectAiNote(id, payload);
export const requestConsultationAiSuggestions = (id, payload) => consultationApi.requestAiSuggestions(id, payload);
export const reviewConsultationAiSuggestions = (id, payload) => consultationApi.reviewAiSuggestions(id, payload);
export const completeConsultation = (id, payload) => consultationApi.complete(id, payload);
export const downloadConsultationPdf = (id) => consultationApi.downloadPdf(id);
export const formatConsultationNote = (id, payload) => consultationApi.formatNote(id, payload);
export const getPatientConsultationHistory = (patientId, params) => consultationApi.historyByPatient(patientId, params);
export const getPatientClinicalHistory = (patientId) => consultationApi.getClinicalHistoryByPatient(patientId);
export const requestConsultationReedit = (id) => consultationApi.requestReedit(id);
export const verifyConsultationReedit = (id, payload) => consultationApi.verifyReedit(id, payload);

export default consultationApi;
