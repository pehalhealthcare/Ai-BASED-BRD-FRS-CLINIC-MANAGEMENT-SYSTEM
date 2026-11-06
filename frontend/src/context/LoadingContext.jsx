import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Wifi, Shield, Database, LayoutGrid } from 'lucide-react';
import { getStoredToken, getStoredUser, clearAuthStorage } from '../utils/storage';
import authApi from '../api/authApi';
import { clinicApi } from '../lib/api';

const LoadingContext = createContext(null);

export const STAGES = [
  { id: 'connecting', label: 'Connecting', icon: Wifi },
  { id: 'authenticating', label: 'Authenticating', icon: Shield },
  { id: 'fetching', label: 'Fetching Data', icon: Database },
  { id: 'finalizing', label: 'Finalizing', icon: LayoutGrid }
];

const ROUTE_CONFIG = {
  dashboard: {
    heading: 'Preparing your clinic dashboard...',
    subheading: "Loading today's overview and clinic data"
  },
  appointments: {
    heading: 'Preparing appointments calendar...',
    subheading: 'Synchronizing patient schedules and doctor availability'
  },
  patients: {
    heading: 'Loading patient directory...',
    subheading: 'Accessing electronic medical records and clinical histories'
  },
  doctors: {
    heading: 'Preparing medical staff overview...',
    subheading: 'Retrieving doctor rosters, specializations, and shifts'
  },
  staff: {
    heading: 'Loading clinic personnel...',
    subheading: 'Verifying staff permissions and department assignments'
  },
  billing: {
    heading: 'Preparing billing & accounts...',
    subheading: 'Loading invoices, payment records, and fee ledgers'
  },
  payments: {
    heading: 'Syncing financial transactions...',
    subheading: 'Verifying payment gateways and receipt histories'
  },
  reports: {
    heading: 'Compiling analytics & insights...',
    subheading: 'Calculating performance metrics and operational summaries'
  },
  inventory: {
    heading: 'Loading clinic inventory...',
    subheading: 'Checking pharmacy stocks and medical supply levels'
  },
  settings: {
    heading: 'Loading system preferences...',
    subheading: 'Retrieving clinic configurations and security settings'
  }
};

// Helper: Wrap promise with timeout
const withTimeout = (promise, ms, timeoutErrorMsg) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(timeoutErrorMsg || `Operation timed out after ${ms}ms`));
    }, ms);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
};

export const LoadingProvider = ({ children }) => {
  // State machine: 'idle' | 'connecting' | 'authenticating' | 'fetching' | 'finalizing' | 'ready' | 'error'
  const [status, setStatus] = useState('connecting');
  const [isLoading, setIsLoading] = useState(true);
  const [isAppInitialized, setIsAppInitialized] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navProgress, setNavProgress] = useState(0);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [heading, setHeading] = useState('Preparing your clinic dashboard...');
  const [subheading, setSubheading] = useState("Loading today's overview and clinic data");
  const [error, setErrorState] = useState(null);
  const [pageKey, setPageKey] = useState('dashboard');

  const location = useLocation();
  const lifecycleIdRef = useRef(0);
  const isAppInitializedRef = useRef(false);
  const transitionTimerRef = useRef(null);
  const watchdogTimerRef = useRef(null);
  const navigationTimerRef = useRef(null);

  // Map route segment to page key and default copy
  const getRouteInfo = useCallback((pathname) => {
    const segments = pathname.split('/').filter(Boolean);
    const key = segments[0] || 'dashboard';
    const config = ROUTE_CONFIG[key] || ROUTE_CONFIG.dashboard;
    return { key, heading: config.heading, subheading: config.subheading };
  }, []);

  const setStage = useCallback((stageOrIndex) => {
    if (typeof stageOrIndex === 'number') {
      setCurrentStageIndex(Math.min(Math.max(stageOrIndex, 0), STAGES.length - 1));
    } else if (typeof stageOrIndex === 'string') {
      const idx = STAGES.findIndex((s) => s.id === stageOrIndex);
      if (idx !== -1) setCurrentStageIndex(idx);
    }
  }, []);

  const startLoading = useCallback((options = {}) => {
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    setErrorState(null);
    
    const key = options.key || pageKey;
    const config = ROUTE_CONFIG[key] || ROUTE_CONFIG.dashboard;
    
    setPageKey(key);
    setHeading(options.heading || config.heading);
    setSubheading(options.subheading || config.subheading);
    setCurrentStageIndex(options.initialStage ?? 0);
    setStatus('connecting');
    setIsLoading(true);
  }, [pageKey]);

  const stopLoading = useCallback(() => {
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);

    setCurrentStageIndex(STAGES.length - 1);
    setStatus('finalizing');

    transitionTimerRef.current = setTimeout(() => {
      setStatus('ready');
      setIsLoading(false);
      setIsAppInitialized(true);
      isAppInitializedRef.current = true;
      setErrorState(null);
    }, 180);
  }, []);

  const setError = useCallback((errMsg) => {
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);

    setStatus('error');
    setErrorState(typeof errMsg === 'string' ? errMsg : 'Initialization failed. Please check your network and retry.');
    setIsLoading(true);
  }, []);

  // Centralized Initialization Flow
  const runInitialization = useCallback(async () => {
    const currentLifecycleId = ++lifecycleIdRef.current;
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);

    // Watchdog timer: If anything unexpected freezes, force-release after 12 seconds
    watchdogTimerRef.current = setTimeout(() => {
      if (lifecycleIdRef.current === currentLifecycleId) {
        console.warn('[LoadingContext] Watchdog safety timer fired. Releasing loader.');
        stopLoading();
      }
    }, 12000);

    try {
      setErrorState(null);
      setIsLoading(true);

      // ─────────────────────────────────────────────────────────────
      // STAGE 1: CONNECTING
      // ─────────────────────────────────────────────────────────────
      setStatus('connecting');
      setCurrentStageIndex(0);
      setHeading('Connecting to clinic services...');
      setSubheading('Establishing secure connection and verifying network status');

      // 1.1 Check local network connectivity
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new Error('Network connection offline. Please check your internet connection.');
      }

      // 1.2 Non-blocking background WebSocket connection check (max 2.5s timeout)
      // Section 3: Do NOT let WebSocket failure block the dashboard!
      const socketCheckPromise = new Promise((resolve) => {
        try {
          const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';
          const socketTimeout = setTimeout(() => resolve({ connected: false, reason: 'timeout' }), 2000);
          
          // Test reachability non-blockingly
          fetch(`${socketUrl}/health`, { method: 'HEAD', mode: 'no-cors' })
            .then(() => {
              clearTimeout(socketTimeout);
              resolve({ connected: true });
            })
            .catch(() => {
              clearTimeout(socketTimeout);
              resolve({ connected: false, reason: 'network' });
            });
        } catch {
          resolve({ connected: false, reason: 'unsupported' });
        }
      });

      // Execute non-blocking check
      socketCheckPromise.then((res) => {
        if (!res.connected) {
          console.warn('[LoadingContext] WebSocket connection non-blocking notice:', res.reason);
        }
      });

      // Small tick for smooth stage transition
      await new Promise((r) => setTimeout(r, 120));
      if (lifecycleIdRef.current !== currentLifecycleId) return;

      // ─────────────────────────────────────────────────────────────
      // STAGE 2: AUTHENTICATING
      // ─────────────────────────────────────────────────────────────
      setStatus('authenticating');
      setCurrentStageIndex(1);
      setHeading('Authenticating session...');
      setSubheading('Validating security tokens and resolving permissions');

      const token = getStoredToken() || localStorage.getItem('token');
      
      if (!token) {
        // No token: user is unauthenticated or on public portal
        stopLoading();
        return;
      }

      // Validate token with authApi.me() with explicit 7000ms timeout
      let user = null;
      try {
        const authRes = await withTimeout(
          authApi.me(),
          7000,
          'Authentication service request timed out. Please retry.'
        );
        user = authRes?.user || authRes;
      } catch (authErr) {
        console.warn('[LoadingContext] authApi.me() error:', authErr);
        // If 401 Unauthorized, token has expired
        if (authErr?.response?.status === 401) {
          clearAuthStorage();
          throw new Error('Your session has expired. Please sign in again.');
        }
        
        // Fallback: check if valid cached user exists in local storage
        const cachedUser = getStoredUser();
        if (cachedUser && cachedUser._id) {
          user = cachedUser;
        } else {
          throw new Error(authErr?.message || 'Authentication failed. Please verify your credentials.');
        }
      }

      if (lifecycleIdRef.current !== currentLifecycleId) return;

      // ─────────────────────────────────────────────────────────────
      // STAGE 3: FETCHING DATA
      // ─────────────────────────────────────────────────────────────
      setStatus('fetching');
      setCurrentStageIndex(2);
      setHeading('Loading clinic overview & data...');
      setSubheading('Retrieving clinic configurations and dashboard metrics');

      // Critical clinic checks (e.g., for Clinic Owner / Admin)
      if (user?.role === 'ADMIN' || user?.role === 'CLINIC_ADMIN') {
        try {
          // Fetch clinic setup status with 5000ms timeout
          await withTimeout(
            clinicApi.getSetupStatus(),
            5000,
            'Clinic setup query timed out'
          );
        } catch (clinicErr) {
          // Section 3: Do not allow optional setup failures to block dashboard access!
          console.warn('[LoadingContext] Non-critical setup status query notice:', clinicErr.message);
        }
      }

      // Small tick for smooth stage transition
      await new Promise((r) => setTimeout(r, 120));
      if (lifecycleIdRef.current !== currentLifecycleId) return;

      // ─────────────────────────────────────────────────────────────
      // STAGE 4: FINALIZING
      // ─────────────────────────────────────────────────────────────
      setStatus('finalizing');
      setCurrentStageIndex(3);
      setHeading('Finalizing dashboard layout...');
      setSubheading('Mounting components and preparing workspace');

      // Brief transition to ensure layout stability before removing loader
      await new Promise((r) => setTimeout(r, 160));
      if (lifecycleIdRef.current !== currentLifecycleId) return;

      // Complete & display dashboard
      stopLoading();

    } catch (err) {
      if (lifecycleIdRef.current === currentLifecycleId) {
        console.error('[LoadingContext] Initialization error:', err);
        setError(err.message || 'Initialization encountered an unexpected error.');
      }
    }
  }, [stopLoading, setError]);

  const retry = useCallback(() => {
    setErrorState(null);
    runInitialization();
  }, [runInitialization]);

  const returnToLogin = useCallback(() => {
    clearAuthStorage();
    window.location.href = '/login';
  }, []);

  // Listen for real online / offline events
  useEffect(() => {
    const handleOnline = () => {
      if (error && error.toLowerCase().includes('network')) {
        setErrorState(null);
        runInitialization();
      }
    };
    const handleOffline = () => {
      setError('Network connection lost. Please check your internet connection.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [error, runInitialization, setError]);

  // Subtle navigation progress trigger (Option C)
  const triggerPageNavigation = useCallback((pathname) => {
    const routeInfo = getRouteInfo(pathname);
    setPageKey(routeInfo.key);

    setIsNavigating(true);
    setNavProgress(30);

    if (navigationTimerRef.current) clearTimeout(navigationTimerRef.current);

    setTimeout(() => {
      setNavProgress(80);
    }, 75);

    navigationTimerRef.current = setTimeout(() => {
      setNavProgress(100);
      setTimeout(() => {
        setIsNavigating(false);
        setNavProgress(0);
      }, 140);
    }, 220);
  }, [getRouteInfo]);

  // Route change & initialization handling
  useEffect(() => {
    const routeInfo = getRouteInfo(location.pathname);
    setPageKey(routeInfo.key);

    // Once initialized, tab and route changes NEVER trigger the full-screen loader!
    if (isAppInitializedRef.current) {
      triggerPageNavigation(location.pathname);
      return;
    }

    // Only run full initialization on cold mount / initial bootstrap
    runInitialization();

    return () => {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
      if (navigationTimerRef.current) clearTimeout(navigationTimerRef.current);
    };
  }, [location.pathname, getRouteInfo, runInitialization, triggerPageNavigation]);

  return (
    <LoadingContext.Provider
      value={{
        status,
        isLoading,
        isAppInitialized,
        isNavigating,
        navProgress,
        currentStageIndex,
        stages: STAGES,
        heading,
        subheading,
        pageKey,
        error,
        setStage,
        startLoading,
        stopLoading,
        setError,
        retry,
        returnToLogin,
        triggerPageNavigation
      }}
    >
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};
