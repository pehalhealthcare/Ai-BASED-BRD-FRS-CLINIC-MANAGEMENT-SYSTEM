import { axiosClient, unwrapResponse } from './axiosClient';

export const appointmentApi = {
  list: async (params = {}) => unwrapResponse(await axiosClient.get('/appointments', { params })),
  calendar: async (params = {}) => unwrapResponse(await axiosClient.get('/appointments/calendar', { params })),
  create: async (payload) => unwrapResponse(await axiosClient.post('/appointments', payload)),
  getById: async (id) => unwrapResponse(await axiosClient.get(`/appointments/${id}`)),
  availableSlots: async (params = {}) => unwrapResponse(await axiosClient.get('/appointments/available-slots', { params })),
  updateStatus: async (id, payload) => unwrapResponse(await axiosClient.patch(`/appointments/${id}/status`, payload)),
  getQueueStatus: async (doctorId) => unwrapResponse(await axiosClient.get(`/appointments/queue/${doctorId}`))
};

export default appointmentApi;
