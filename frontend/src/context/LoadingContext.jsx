import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const LoadingContext = createContext(null);

export const LoadingProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [pageKey, setPageKey] = useState('dashboard');
  const [stages, setStages] = useState([]);
  const location = useLocation();
  const timeoutRef = useRef(null);

  const startLoading = (key) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    // 250ms debounce to prevent flashing on instant cache hits
    timeoutRef.current = setTimeout(() => {
      setPageKey(key);
      setIsLoading(true);
      setStages(['Connecting WebSocket', 'Authenticating Clinic Session']);
    }, 250);
  };

  const stopLoading = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsLoading(false);
    setStages([]);
  };

  const addStage = (stage) => {
    setStages((prev) => {
      if (prev.includes(stage)) return prev;
      return [...prev, stage];
    });
  };

  // Auto-trigger loading transitions on path change (route changes)
  useEffect(() => {
    const segments = location.pathname.split('/').filter(Boolean);
    const key = segments[0] || 'dashboard';
    
    startLoading(key);
    
    // Simulate loading completion when DOM/route mounts
    const finishTimer = setTimeout(() => {
      addStage('Fetching branch metrics');
      addStage('Loading structural elements');
      
      const readyTimer = setTimeout(() => {
        addStage('Almost Ready...');
        const finalTimer = setTimeout(() => {
          stopLoading();
        }, 300);
        return () => clearTimeout(finalTimer);
      }, 400);
      
      return () => clearTimeout(readyTimer);
    }, 500);

    return () => {
      clearTimeout(finishTimer);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [location.pathname]);

  return (
    <LoadingContext.Provider value={{ isLoading, pageKey, stages, startLoading, stopLoading, addStage }}>
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
