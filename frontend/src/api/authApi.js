import { axiosClient, unwrapResponse } from './axiosClient';

export const authApi = {
  login: async (payload) => unwrapResponse(await axiosClient.post('/auth/login', payload)),
  me: async () => unwrapResponse(await axiosClient.get('/auth/me')),
  logout: async () => unwrapResponse(await axiosClient.post('/auth/logout')),
  register: async (payload) => unwrapResponse(await axiosClient.post('/auth/register', payload))
};

export default authApi;
