import { axiosClient, unwrapResponse } from './axiosClient';

export const consultationApi = {
  list: async (params = {}) => unwrapResponse(await axiosClient.get('/consultations', { params })),
  create: async (payload) => unwrapResponse(await axiosClient.post('/consultations', payload)),
  getById: async (id) => unwrapResponse(await axiosClient.get(`/consultations/${id}`)),
  getByAppointment: async (appointmentId) =>
    unwrapResponse(await axiosClient.get(`/consultations/appointment/${appointmentId}`)),
  update: async (id, payload) => unwrapResponse(await axiosClient.patch(`/consultations/${id}`, payload)),
  complete: async (id, payload) => unwrapResponse(await axiosClient.post(`/consultations/${id}/complete`, payload)),
  requestAiSuggestions: async (id, payload = {}) =>
    unwrapResponse(await axiosClient.post(`/consultations/${id}/ai-suggestions`, payload)),
  reviewAiSuggestions: async (id, payload) =>
    unwrapResponse(await axiosClient.post(`/consultations/${id}/ai-review`, payload)),
  formatNote: async (id, payload) => unwrapResponse(await axiosClient.post(`/consultations/${id}/format-note`, payload)),
  historyByPatient: async (patientId, params = {}) =>
    unwrapResponse(await axiosClient.get(`/consultations/patient/${patientId}/history`, { params })),
  downloadPdf: async (id) =>
    unwrapResponse(
      await axiosClient.get(`/consultations/${id}/pdf`, {
        responseType: 'blob'
      })
    )
};

export default consultationApi;

