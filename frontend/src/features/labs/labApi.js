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
export const initializeOrderResults = (orderId, payload) => labApi.initializeOrderResults(orderId, payload);
export const getOrderResults = (orderId, params) => labApi.getOrderResults(orderId, params);
export const saveResultsBatch = (orderId, payload) => labApi.saveResultsBatch(orderId, payload);
export const updateSingleResult = (orderId, resultId, payload) => labApi.updateSingleResult(orderId, resultId, payload);
export const checkOrderCompletion = (orderId, params) => labApi.checkOrderCompletion(orderId, params);
export const finalizeOrder = (orderId, payload) => labApi.finalizeOrder(orderId, payload);
export const amendOrder = (orderId, payload) => labApi.amendOrder(orderId, payload);
export const generateOrderPdf = (reportId, payload) => labApi.generateOrderPdf(reportId, payload);

export default labApi;
