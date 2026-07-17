import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../lib/api';
import useAuth from './useAuth';

let globalCache = null;
let globalListeners = [];

const setCache = (data) => {
  globalCache = data;
  globalListeners.forEach(listener => listener(data));
};

export const useFeatureAccess = () => {
  const { user } = useAuth();
  const [features, setFeatures] = useState(globalCache);
  const [loading, setLoading] = useState(!globalCache);

  useEffect(() => {
    const listener = (newData) => {
      setFeatures(newData);
    };
    globalListeners.push(listener);
    return () => {
      globalListeners = globalListeners.filter(l => l !== listener);
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!user || user.role === 'SUPER_ADMIN') {
      setLoading(false);
      return;
    }
    try {
      const res = await apiClient.get('/clinics/features/access');
      setCache(res.data?.data?.features || res.data?.features || res.features || {});
    } catch (err) {
      console.error('Failed to load feature access:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!globalCache && user && user.role !== 'SUPER_ADMIN') {
      refresh();
    } else if (globalCache) {
      setFeatures(globalCache);
      setLoading(false);
    }
  }, [user, refresh]);

  const hasAccess = useCallback((featureCode) => {
    if (user?.role === 'SUPER_ADMIN') return true;
    if (!features) return false;
    return !!features[featureCode]?.enabled;
  }, [features, user]);

  const getFeatureDetail = useCallback((featureCode) => {
    if (user?.role === 'SUPER_ADMIN') {
      return { enabled: true, isTrial: false, daysRemaining: 0, recommendedPlan: '', hasRequested: false };
    }
    return features?.[featureCode] || { enabled: false, isTrial: false, daysRemaining: 0, recommendedPlan: 'AI Premium', hasRequested: false };
  }, [features, user]);

  return {
    features,
    loading,
    refresh,
    hasAccess,
    getFeatureDetail
  };
};
