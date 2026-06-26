import { labApi, patientApi } from '../../lib/api';

export const createLabTest = (payload) => labApi.createTest(payload);
export const listLabTests = (params) => labApi.listTests(params);
export const createLabOrder = (payload) => labApi.createOrder(payload);
export const listLabOrders = (params) => labApi.listOrders(params);
export const getLabOrder = (id) => labApi.getOrder(id);
export const updateLabOrderStatus = (id, payload) => labApi.updateOrderStatus(id, payload);
export const createLabReport = (payload) => labApi.createReport(payload);
export const getLabReport = (id) => labApi.getReport(id);
export const updateLabReport = (id, payload) => labApi.updateReport(id, payload);
export const reviewLabAnalysis = (id, payload) => labApi.reviewAiAnalysis(id, payload);
export const finalizeLabReport = (id, payload) => labApi.finalizeReport(id, payload);
export const getPatientLabHistory = (patientId, params) => patientApi.labs(patientId, params);
export const updateLabTest = (id, payload) => labApi.updateTest(id, payload);

export default labApi;
