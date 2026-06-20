import axios from 'axios';

import { clearToken, getToken, clearCurrentUser } from './auth';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearToken();
      clearCurrentUser();
    }

    return Promise.reject(error);
  }
);

const extractData = async (request) => {
  const response = await request;
  return response.data;
};

const sanitizeParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== undefined && value !== null)
  );

const authApi = {
  register: (payload) => extractData(apiClient.post('/auth/register', payload)),
  login: (payload) => extractData(apiClient.post('/auth/login', payload)),
  resetPassword: (payload) => extractData(apiClient.post('/auth/reset-password', payload)),
  me: () => extractData(apiClient.get('/auth/me')),
  logout: () => extractData(apiClient.post('/auth/logout'))
};

const userApi = {
  list: (params = {}) => extractData(apiClient.get('/users', { params })),
  get: (id) => extractData(apiClient.get(`/users/${id}`)),
  updateRole: (id, payload) => extractData(apiClient.patch(`/users/${id}/role`, payload)),
  updateStatus: (id, payload) => extractData(apiClient.patch(`/users/${id}/status`, payload))
};

const patientApi = {
  me: () => extractData(apiClient.get('/patients/me')),
  updateMe: (payload) => extractData(apiClient.patch('/patients/me', payload)),
  create: (payload) => extractData(apiClient.post('/patients', payload)),
  list: (params = {}) => extractData(apiClient.get('/patients', { params })),
  get: (id) => extractData(apiClient.get(`/patients/${id}`)),
  update: (id, payload) => extractData(apiClient.patch(`/patients/${id}`, payload)),
  remove: (id) => extractData(apiClient.delete(`/patients/${id}`)),
  history: (id) => extractData(apiClient.get(`/patients/${id}/history`)),
  labs: (id, params = {}) => extractData(apiClient.get(`/patients/${id}/labs`, { params })),
  medicines: (id, params = {}) => extractData(apiClient.get(`/patients/${id}/medicines`, { params })),
  notifications: (id, params = {}) => extractData(apiClient.get(`/patients/${id}/notifications`, { params }))
};

const doctorApi = {
  create: (payload) => extractData(apiClient.post('/doctors', payload)),
  list: (params = {}) => extractData(apiClient.get('/doctors', { params })),
  get: (id) => extractData(apiClient.get(`/doctors/${id}`)),
  update: (id, payload) => extractData(apiClient.patch(`/doctors/${id}`, payload)),
  remove: (id) => extractData(apiClient.delete(`/doctors/${id}`)),
  getAvailability: (id) => extractData(apiClient.get(`/doctors/${id}/availability`)),
  updateAvailability: (id, payload) => extractData(apiClient.put(`/doctors/${id}/availability`, payload)),
  patchAvailability: (id, payload) => extractData(apiClient.patch(`/doctors/${id}/availability`, payload)),
  blockSlot: (id, payload) => extractData(apiClient.post(`/doctors/${id}/blocked-slots`, payload)),
  getMyProfile: () => extractData(apiClient.get('/doctors/me/profile')),
  updateMyProfile: (payload) => extractData(apiClient.put('/doctors/me/profile', payload)),
  submitMyProfile: (payload) => extractData(apiClient.post('/doctors/me/submit', payload)),
  acceptMySlot: () => extractData(apiClient.post('/doctors/me/accept-slot'))
};

const appointmentApi = {
  createAppointment: (payload) => extractData(apiClient.post('/appointments', payload)),
  getAppointments: (params = {}) => extractData(apiClient.get('/appointments', { params })),
  getAppointmentById: (id) => extractData(apiClient.get(`/appointments/${id}`)),
  getCalendarAppointments: (params = {}) => extractData(apiClient.get('/appointments/calendar', { params })),
  getAvailableSlots: (params = {}) => extractData(apiClient.get('/appointments/available-slots', { params })),
  updateAppointmentStatus: (id, payload) => extractData(apiClient.patch(`/appointments/${id}/status`, payload)),
  cancelAppointment: (id, payload) => extractData(apiClient.patch(`/appointments/${id}/cancel`, payload)),
  rescheduleAppointment: (id, payload) => extractData(apiClient.patch(`/appointments/${id}/reschedule`, payload)),
  getDoctorAvailability: (doctorId) => extractData(apiClient.get(`/doctors/${doctorId}/availability`)),
  updateDoctorAvailability: (doctorId, payload) => extractData(apiClient.put(`/doctors/${doctorId}/availability`, payload)),
  blockDoctorSlot: (doctorId, payload) => extractData(apiClient.post(`/doctors/${doctorId}/blocked-slots`, payload)),
  getQueueStatus: (doctorId) => extractData(apiClient.get(`/appointments/queue/${doctorId}`))
};

const consultationApi = {
  create: (payload) => extractData(apiClient.post('/consultations', payload)),
  list: (params = {}) => extractData(apiClient.get('/consultations', { params })),
  get: (id) => extractData(apiClient.get(`/consultations/${id}`)),
  getByAppointment: (appointmentId) => extractData(apiClient.get(`/consultations/appointment/${appointmentId}`)),
  update: (id, payload) => extractData(apiClient.patch(`/consultations/${id}`, payload)),
  uploadVoiceNote: async (id, formData) =>
    extractData(
      apiClient.post(`/consultations/${id}/voice-note`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
    ),
  editAiNote: (id, payload) => extractData(apiClient.put(`/consultations/${id}/ai-note/edit`, payload)),
  approveAiNote: (id, payload = {}) => extractData(apiClient.post(`/consultations/${id}/ai-note/approve`, payload)),
  rejectAiNote: (id, payload = {}) => extractData(apiClient.post(`/consultations/${id}/ai-note/reject`, payload)),
  requestAiSuggestions: (id, payload = {}) => extractData(apiClient.post(`/consultations/${id}/ai-suggestions`, payload)),
  reviewAiSuggestions: (id, payload) => extractData(apiClient.post(`/consultations/${id}/ai-review`, payload)),
  complete: (id, payload) => extractData(apiClient.post(`/consultations/${id}/complete`, payload)),
  formatNote: (id, payload) => extractData(apiClient.post(`/consultations/${id}/format-note`, payload)),
  historyByPatient: (patientId, params = {}) =>
    extractData(apiClient.get(`/consultations/patient/${patientId}/history`, { params })),
  getClinicalHistoryByPatient: (patientId) => extractData(apiClient.get(`/patients/${patientId}/clinical-history`)),
  // Backward-compatible alias kept for earlier component imports.
  decideAiSuggestion: (consultationId, _suggestionId, payload) =>
    extractData(
      apiClient.post(`/consultations/${consultationId}/ai-review`, {
        decision: payload?.status === 'accepted' ? 'accepted' : payload?.status === 'rejected' ? 'rejected' : 'partially_accepted',
        doctorComment: payload?.doctorEditedContent || ''
      })
    )
};

const prescriptionApi = {
  create: (payload) => extractData(apiClient.post('/prescriptions', payload)),
  get: (id) => extractData(apiClient.get(`/prescriptions/${id}`)),
  getByPatient: (patientId, params = {}) => extractData(apiClient.get(`/prescriptions/patient/${patientId}`, { params })),
  getByConsultation: (consultationId) => extractData(apiClient.get(`/prescriptions/consultation/${consultationId}`)),
  update: (id, payload) => extractData(apiClient.patch(`/prescriptions/${id}`, payload)),
  finalize: (id, payload) => extractData(apiClient.post(`/prescriptions/${id}/finalize`, payload)),
  cancel: (id, payload) => extractData(apiClient.post(`/prescriptions/${id}/cancel`, payload)),
  download: async (id) => {
    const response = await apiClient.get(`/prescriptions/${id}/download`, {
      responseType: 'blob'
    });

    return response;
  }
};

const billingApi = {
  createInvoice: (payload) => extractData(apiClient.post('/billing/invoices', payload)),
  getInvoices: (params = {}) => extractData(apiClient.get('/billing/invoices', { params })),
  getInvoiceById: (id) => extractData(apiClient.get(`/billing/invoices/${id}`)),
  updateInvoice: (id, payload) => extractData(apiClient.put(`/billing/invoices/${id}`, payload)),
  recordPayment: (invoiceId, payload) => extractData(apiClient.post(`/billing/invoices/${invoiceId}/payments`, payload)),
  generateInvoicePdf: (invoiceId) => extractData(apiClient.post(`/billing/invoices/${invoiceId}/generate-pdf`, {})),
  downloadInvoicePdf: async (invoiceId) =>
    apiClient.get(`/billing/invoices/${invoiceId}/pdf`, {
      responseType: 'blob'
    }),
  cancelInvoice: (invoiceId, payload) => extractData(apiClient.patch(`/billing/invoices/${invoiceId}/cancel`, payload)),
  getPatientInvoices: (patientId, params = {}) =>
    extractData(apiClient.get(`/billing/patient/${patientId}/invoices`, { params })),
  getBillingSummary: (params = {}) => extractData(apiClient.get('/billing/summary', { params })),
  createRazorpayOrder: (invoiceId) => extractData(apiClient.post(`/billing/invoices/${invoiceId}/razorpay-order`)),
  verifyRazorpayPayment: (invoiceId, payload) => extractData(apiClient.post(`/billing/invoices/${invoiceId}/razorpay-verify`, payload)),
  recordRefund: (invoiceId, payload) => extractData(apiClient.post(`/billing/invoices/${invoiceId}/refund`, payload))
};

const labApi = {
  createTest: (payload) => extractData(apiClient.post('/labs/tests', payload)),
  listTests: (params = {}) => extractData(apiClient.get('/labs/tests', { params })),
  createOrder: (payload) => extractData(apiClient.post('/labs/orders', payload)),
  listOrders: (params = {}) => extractData(apiClient.get('/labs/orders', { params })),
  getOrder: (id) => extractData(apiClient.get(`/labs/orders/${id}`)),
  updateOrderStatus: (id, payload) => extractData(apiClient.patch(`/labs/orders/${id}/status`, payload)),
  createReport: (payload) => extractData(apiClient.post('/labs/reports', payload)),
  getReport: (id) => extractData(apiClient.get(`/labs/reports/${id}`)),
  updateReport: (id, payload) => extractData(apiClient.patch(`/labs/reports/${id}`, payload)),
  reviewAiAnalysis: (id, payload) => extractData(apiClient.patch(`/labs/reports/${id}/ai-review`, payload)),
  finalizeReport: (id, payload = {}) => extractData(apiClient.patch(`/labs/reports/${id}/finalize`, payload))
};

const pharmacyApi = {
  createMedicine: (payload) => extractData(apiClient.post('/pharmacy/medicines', payload)),
  listMedicines: (params = {}) => extractData(apiClient.get('/pharmacy/medicines', { params })),
  getMedicine: (id) => extractData(apiClient.get(`/pharmacy/medicines/${id}`)),
  getForecast: (id) => extractData(apiClient.get(`/pharmacy/medicines/${id}/forecast`)),
  updateMedicine: (id, payload) => extractData(apiClient.patch(`/pharmacy/medicines/${id}`, payload)),
  addBatch: (id, payload) => extractData(apiClient.post(`/pharmacy/medicines/${id}/batches`, payload)),
  dispense: (payload) => extractData(apiClient.post('/pharmacy/dispense', payload)),
  listDispensings: (params = {}) => extractData(apiClient.get('/pharmacy/dispensings', { params })),
  getDispensing: (id) => extractData(apiClient.get(`/pharmacy/dispensings/${id}`)),
  cancelDispensing: (id, payload = {}) => extractData(apiClient.patch(`/pharmacy/dispensings/${id}/cancel`, payload))
};

const notificationApi = {
  createTemplate: (payload) => extractData(apiClient.post('/notifications/templates', payload)),
  listTemplates: (params = {}) => extractData(apiClient.get('/notifications/templates', { params })),
  send: (payload) => extractData(apiClient.post('/notifications/send', payload)),
  sendAppointmentReminder: (payload) =>
    extractData(apiClient.post('/notifications/appointment-reminder', payload)),
  listLogs: (params = {}) => extractData(apiClient.get('/notifications/logs', { params })),
  getLog: (id) => extractData(apiClient.get(`/notifications/logs/${id}`)),
  cancelLog: (id, payload = {}) => extractData(apiClient.patch(`/notifications/logs/${id}/cancel`, payload)),
  dispatchPending: (payload = {}) => extractData(apiClient.post('/notifications/dispatch-pending', payload))
};

const followUpApi = {
  create: (payload) => extractData(apiClient.post('/notifications/follow-up', payload)),
  list: (params = {}) => extractData(apiClient.get('/follow-ups', { params })),
  updateStatus: (id, payload) => extractData(apiClient.patch(`/follow-ups/${id}/status`, payload))
};

const dashboardApi = {
  getOverview: (params = {}) => extractData(apiClient.get('/dashboard/overview', { params: sanitizeParams(params) })),
  getAppointments: (params = {}) => extractData(apiClient.get('/dashboard/appointments', { params: sanitizeParams(params) })),
  getRevenue: (params = {}) => extractData(apiClient.get('/dashboard/revenue', { params: sanitizeParams(params) })),
  getPatients: (params = {}) => extractData(apiClient.get('/dashboard/patients', { params: sanitizeParams(params) })),
  getLabs: (params = {}) => extractData(apiClient.get('/dashboard/labs', { params: sanitizeParams(params) })),
  getPharmacy: (params = {}) => extractData(apiClient.get('/dashboard/pharmacy', { params: sanitizeParams(params) })),
  getNotifications: (params = {}) => extractData(apiClient.get('/dashboard/notifications', { params: sanitizeParams(params) })),
  getDoctorWorkload: (params = {}) => extractData(apiClient.get('/dashboard/doctor-workload', { params: sanitizeParams(params) })),
  getNoShow: (params = {}) => extractData(apiClient.get('/dashboard/no-show', { params: sanitizeParams(params) })),
  getActivityFeed: (params = {}) => extractData(apiClient.get('/dashboard/activity-feed', { params: sanitizeParams(params) })),
  getSuperAdminOverview: () => extractData(apiClient.get('/dashboard/super-admin/overview'))
};

const adminApi = {
  listBillingAnomalies: (params = {}) =>
    extractData(apiClient.get('/admin/billing-anomalies', { params: sanitizeParams(params) })),
  getBillingAnomaly: (id) => extractData(apiClient.get(`/admin/billing-anomalies/${id}`)),
  reviewBillingAnomaly: (id, payload) =>
    extractData(apiClient.patch(`/admin/billing-anomalies/${id}/review`, payload)),
  listPendingDoctors: () => extractData(apiClient.get('/admin/pending-doctors')),
  approveDoctor: (userId, payload) => extractData(apiClient.post(`/admin/approve-doctor/${userId}`, payload)),
  rejectDoctor: (userId) => extractData(apiClient.post(`/admin/reject-doctor/${userId}`)),
  getMyDoctorsDashboard: () => extractData(apiClient.get('/admin/my-doctors/dashboard')),
  requestReEdit: (userId, payload) => extractData(apiClient.post(`/admin/doctors/${userId}/re-edit`, payload))
};

const clinicApi = {
  create: (payload) => extractData(apiClient.post('/clinics', payload)),
  list: () => extractData(apiClient.get('/clinics')),
  getDetails: (id) => extractData(apiClient.get(`/clinics/${id}/details`)),
  update: (id, payload) => extractData(apiClient.put(`/clinics/${id}`, payload))
};

const specializationApi = {
  list: (params = {}) => extractData(apiClient.get('/specializations', { params })),
  create: (payload) => extractData(apiClient.post('/specializations', payload)),
  update: (id, payload) => extractData(apiClient.put(`/specializations/${id}`, payload)),
  remove: (id) => extractData(apiClient.delete(`/specializations/${id}`)),
  getAnalytics: (id) => extractData(apiClient.get(`/specializations/${id}/analytics`))
};

const auditApi = {
  listLogs: (params = {}) => extractData(apiClient.get('/audit', { params: sanitizeParams(params) })),
  getLog: (id) => extractData(apiClient.get(`/audit/${id}`))
};

const aiApi = {
  formatPrescriptionAdvice: (payload) => extractData(apiClient.post('/ai/prescription/format-advice', payload)),
  drugSafetyCheck: (payload) => extractData(apiClient.post('/ai/drug-safety-check', payload)),
  extractDocument: async (formData) =>
    extractData(
      apiClient.post('/ai/ocr-extract', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    ),
  extractLabReport: async (formData) =>
    extractData(
      apiClient.post('/ai/lab-report-extract', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    ),
  labTestRecommendations: (payload) => extractData(apiClient.post('/ai/lab-test-recommendations', payload))
};

const healthApi = {
  backend: () => extractData(apiClient.get('/health'))
};

const organizationApi = {
  create: (payload) => extractData(apiClient.post('/organizations', payload)),
  list: () => extractData(apiClient.get('/organizations')),
  getDetails: (id) => extractData(apiClient.get(`/organizations/${id}`)),
  update: (id, payload) => extractData(apiClient.put(`/organizations/${id}`, payload)),
  toggleStatus: (id, isActive) => extractData(apiClient.patch(`/organizations/${id}/status`, { isActive })),
  getProfile: () => extractData(apiClient.get('/organizations/profile')),
  updateProfile: (payload) => extractData(apiClient.put('/organizations/profile', payload)),
  getPublic: () => extractData(apiClient.get('/organizations/public'))
};

export {
  apiClient,
  authApi,
  userApi,
  patientApi,
  doctorApi,
  appointmentApi,
  consultationApi,
  prescriptionApi,
  billingApi,
  labApi,
  pharmacyApi,
  notificationApi,
  followUpApi,
  dashboardApi,
  adminApi,
  clinicApi,
  auditApi,
  aiApi,
  healthApi,
  specializationApi,
  organizationApi
};
