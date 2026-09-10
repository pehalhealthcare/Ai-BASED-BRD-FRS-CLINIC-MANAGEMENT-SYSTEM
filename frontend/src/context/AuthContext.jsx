import { createContext, useEffect, useMemo, useState } from 'react';

import authApi from '../api/authApi';
import { clearAuthStorage, getStoredToken, getStoredUser, setStoredToken, setStoredUser } from '../utils/storage';

export const AuthContext = createContext({
  user: null,
  token: null,
  loading: true,
  isAuthenticated: false,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  refreshUser: async () => {}
});

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(getStoredToken());
  const [user, setUser] = useState(getStoredUser());
  const [loading, setLoading] = useState(Boolean(getStoredToken()));

  const applyAuthState = ({ nextToken, nextUser }) => {
    if (nextToken) {
      setStoredToken(nextToken);
      setToken(nextToken);
    }

    if (nextUser) {
      setStoredUser(nextUser);
      setUser(nextUser);
    }
  };

  const clearAuthState = () => {
    clearAuthStorage();
    setToken(null);
    setUser(null);
  };

  const refreshUser = async (suppressLoading = false) => {
    if (!getStoredToken()) {
      if (!suppressLoading) setLoading(false);
      return null;
    }

    if (!suppressLoading) setLoading(true);

    try {
      const data = await authApi.me();
      setStoredUser(data.user);
      setUser(data.user);
      return data.user;
    } catch (_error) {
      clearAuthState();
      return null;
    } finally {
      if (!suppressLoading) setLoading(false);
    }
  };

  const setAuthSession = ({ user: nextUser, token: nextToken }) => {
    applyAuthState({ nextToken, nextUser });
  };

  const login = async (credentialsOrUser, directToken) => {
    // If called with already authenticated user & token
    if (directToken && credentialsOrUser && typeof credentialsOrUser === 'object') {
      applyAuthState({
        nextToken: directToken,
        nextUser: credentialsOrUser
      });
      return { user: credentialsOrUser, accessToken: directToken };
    }

    // Direct { accessToken, user }
    if (credentialsOrUser?.accessToken && credentialsOrUser?.user) {
      applyAuthState({
        nextToken: credentialsOrUser.accessToken,
        nextUser: credentialsOrUser.user
      });
      return credentialsOrUser;
    }

    // Nested { data: { accessToken, user } }
    if (credentialsOrUser?.data?.accessToken && credentialsOrUser?.data?.user) {
      applyAuthState({
        nextToken: credentialsOrUser.data.accessToken,
        nextUser: credentialsOrUser.data.user
      });
      return credentialsOrUser.data;
    }

    // Direct { token, user }
    if (credentialsOrUser?.token && credentialsOrUser?.user) {
      applyAuthState({
        nextToken: credentialsOrUser.token,
        nextUser: credentialsOrUser.user
      });
      return credentialsOrUser;
    }

    // Nested { data: { token, user } }
    if (credentialsOrUser?.data?.token && credentialsOrUser?.data?.user) {
      applyAuthState({
        nextToken: credentialsOrUser.data.token,
        nextUser: credentialsOrUser.data.user
      });
      return credentialsOrUser.data;
    }

    const data = await authApi.login(credentialsOrUser);
    applyAuthState({
      nextToken: data.accessToken || data.token,
      nextUser: data.user
    });
    return data;
  };

  const register = async (payload) => {
    const data = await authApi.register(payload);
    applyAuthState({
      nextToken: data.accessToken,
      nextUser: data.user
    });
    return data;
  };

  const logout = async () => {
    try {
      if (getStoredToken()) {
        await authApi.logout();
      }
    } catch (_error) {
      // Local logout still proceeds.
    } finally {
      clearAuthState();
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      clearAuthState();
      setLoading(false);
    };

    window.addEventListener('ai-cms:unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('ai-cms:unauthorized', handleUnauthorized);
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(token),
      login,
      setAuthSession,
      register,
      logout,
      refreshUser
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
