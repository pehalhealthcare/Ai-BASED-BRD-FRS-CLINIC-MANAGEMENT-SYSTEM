import { adminApi, dashboardApi, auditApi } from '../../lib/api';

export const getDashboardOverview = (params = {}) => dashboardApi.getOverview(params);
export const getDashboardAppointments = (params = {}) => dashboardApi.getAppointments(params);
export const getDashboardRevenue = (params = {}) => dashboardApi.getRevenue(params);
export const getDashboardPatients = (params = {}) => dashboardApi.getPatients(params);
export const getDashboardLabs = (params = {}) => dashboardApi.getLabs(params);
export const getDashboardPharmacy = (params = {}) => dashboardApi.getPharmacy(params);
export const getDashboardNotifications = (params = {}) => dashboardApi.getNotifications(params);
export const getDashboardDoctorWorkload = (params = {}) => dashboardApi.getDoctorWorkload(params);
export const getDashboardNoShow = (params = {}) => dashboardApi.getNoShow(params);
export const getDashboardActivityFeed = (params = {}) => dashboardApi.getActivityFeed(params);
export const listBillingAnomalies = (params = {}) => adminApi.listBillingAnomalies(params);
export const getBillingAnomaly = (id) => adminApi.getBillingAnomaly(id);
export const reviewBillingAnomaly = (id, payload) => adminApi.reviewBillingAnomaly(id, payload);
export const listAuditLogs = (params = {}) => auditApi.listLogs(params);
export const getAuditLog = (id) => auditApi.getLog(id);

export const dashboardFeatureApi = {
  getOverview: getDashboardOverview,
  getAppointments: getDashboardAppointments,
  getRevenue: getDashboardRevenue,
  getPatients: getDashboardPatients,
  getLabs: getDashboardLabs,
  getPharmacy: getDashboardPharmacy,
  getNotifications: getDashboardNotifications,
  getDoctorWorkload: getDashboardDoctorWorkload,
  getNoShow: getDashboardNoShow,
  getActivityFeed: getDashboardActivityFeed,
  listBillingAnomalies,
  getBillingAnomaly,
  reviewBillingAnomaly,
  listAuditLogs,
  getAuditLog
};

export default dashboardFeatureApi;
