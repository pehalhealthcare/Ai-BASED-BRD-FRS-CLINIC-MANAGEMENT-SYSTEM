import axios from 'axios';

import { clearAuthStorage, getStoredToken } from '../utils/storage';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
const aiBaseURL =
  import.meta.env.VITE_AI_BASE_URL ||
  import.meta.env.VITE_AI_SERVICE_URL ||
  'http://localhost:8000/api/v1';

export const axiosClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const aiAxiosClient = axios.create({
  baseURL: aiBaseURL
});

const attachAuthorization = (config) => {
  const token = getStoredToken();

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
};

const handleUnauthorized = (error) => {
  if (error?.response?.status === 401) {
    clearAuthStorage();
    window.dispatchEvent(new CustomEvent('ai-cms:unauthorized'));
  }

  return Promise.reject(error);
};

axiosClient.interceptors.request.use(attachAuthorization);
aiAxiosClient.interceptors.request.use(attachAuthorization);
axiosClient.interceptors.response.use((response) => response, handleUnauthorized);
aiAxiosClient.interceptors.response.use((response) => response, handleUnauthorized);

export const unwrapResponse = (response) => {
  const payload = response?.data;

  if (typeof payload === 'undefined' || payload === null) {
    return {};
  }

  if (typeof payload === 'object' && 'data' in payload) {
    return payload.data ?? {};
  }

  return payload;
};

export const extractMessage = (response) => response?.data?.message || '';

export const extractErrorMessage = (error, fallback = 'Something went wrong.') =>
  error?.response?.data?.message ||
  error?.response?.data?.errors?.[0]?.message ||
  error?.message ||
  fallback;
