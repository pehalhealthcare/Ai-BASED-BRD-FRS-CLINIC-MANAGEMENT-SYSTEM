import { axiosClient, unwrapResponse } from './axiosClient';

export const prescriptionApi = {
  create: async (payload) => unwrapResponse(await axiosClient.post('/prescriptions', payload)),
  getById: async (id) => unwrapResponse(await axiosClient.get(`/prescriptions/${id}`)),
  getByPatient: async (patientId, params = {}) =>
    unwrapResponse(await axiosClient.get(`/prescriptions/patient/${patientId}`, { params })),
  getByConsultation: async (consultationId) =>
    unwrapResponse(await axiosClient.get(`/prescriptions/consultation/${consultationId}`)),
  update: async (id, payload) => unwrapResponse(await axiosClient.patch(`/prescriptions/${id}`, payload)),
  finalize: async (id, payload) => unwrapResponse(await axiosClient.post(`/prescriptions/${id}/finalize`, payload)),
  downloadPdf: async (id) =>
    axiosClient.get(`/prescriptions/${id}/download`, {
      responseType: 'blob'
    })
};

export default prescriptionApi;
