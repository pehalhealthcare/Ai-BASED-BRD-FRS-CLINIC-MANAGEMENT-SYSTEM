import { axiosClient, unwrapResponse } from './axiosClient';

export const patientApi = {
  list: async (params = {}) => unwrapResponse(await axiosClient.get('/patients', { params })),
  me: async () => unwrapResponse(await axiosClient.get('/patients/me')),
  updateMe: async (payload) => unwrapResponse(await axiosClient.patch('/patients/me', payload)),
  getById: async (id) => unwrapResponse(await axiosClient.get(`/patients/${id}`)),
  create: async (payload) => unwrapResponse(await axiosClient.post('/patients', payload)),
  update: async (id, payload) => unwrapResponse(await axiosClient.patch(`/patients/${id}`, payload)),
  history: async (id) => unwrapResponse(await axiosClient.get(`/patients/${id}/history`)),
  clinicalHistory: async (id) => unwrapResponse(await axiosClient.get(`/patients/${id}/clinical-history`))
};

export default patientApi;
