import { axiosClient, unwrapResponse } from './axiosClient';

export const doctorApi = {
  list: async (params = {}) => unwrapResponse(await axiosClient.get('/doctors', { params })),
  getById: async (id) => unwrapResponse(await axiosClient.get(`/doctors/${id}`)),
  create: async (payload) => unwrapResponse(await axiosClient.post('/doctors', payload)),
  update: async (id, payload) => unwrapResponse(await axiosClient.patch(`/doctors/${id}`, payload)),
  availability: async (doctorId) => unwrapResponse(await axiosClient.get(`/doctors/${doctorId}/availability`))
};

export default doctorApi;
