import {
  clearStoredToken,
  clearStoredUser,
  getStoredToken,
  getStoredUser,
  setStoredToken,
  setStoredUser
} from '../utils/storage';

export const getToken = () => getStoredToken();

export const setToken = (token) => {
  setStoredToken(token);
};

export const clearToken = () => {
  clearStoredToken();
};

export const getCurrentUserFromStorage = () => getStoredUser();

export const setCurrentUser = (user) => {
  setStoredUser(user);
};

export const clearCurrentUser = () => {
  clearStoredUser();
};

export const isAuthenticated = () => Boolean(getToken());
