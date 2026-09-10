import { axiosClient, unwrapResponse } from './axiosClient';

export const authApi = {
  login: async (payload) => unwrapResponse(await axiosClient.post('/auth/login', payload)),
  me: async () => unwrapResponse(await axiosClient.get('/auth/me')),
  logout: async () => unwrapResponse(await axiosClient.post('/auth/logout')),
  register: async (payload) => unwrapResponse(await axiosClient.post('/auth/register', payload)),
  sendLoginOtp: async (payload) => unwrapResponse(await axiosClient.post('/auth/send-otp', payload)),
  verifyLoginOtp: async (payload) => unwrapResponse(await axiosClient.post('/auth/verify-otp', payload)),
  requestPasswordReset: async (payload) => unwrapResponse(await axiosClient.post('/auth/password-reset/request', payload)),
  verifyPasswordReset: async (payload) => unwrapResponse(await axiosClient.post('/auth/password-reset/verify', payload)),
  resetPassword: async (payload) => unwrapResponse(await axiosClient.post('/auth/reset-password', payload)),
  sendClinicAdminOtp: async (payload) => unwrapResponse(await axiosClient.post('/auth/clinic-admin/send-otp', payload)),
  verifyClinicAdminOtp: async (payload) => unwrapResponse(await axiosClient.post('/auth/clinic-admin/verify-otp', payload))
};



export default authApi;
