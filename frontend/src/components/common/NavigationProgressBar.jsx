import React from 'react';
import { useLoading } from '../../context/LoadingContext';

/**
 * NavigationProgressBar - Subtle Navigation Progress (Option C)
 * 
 * Provides an instantaneous, lightweight progress line at the very top of the
 * main content viewport during tab switches. Completely non-blocking and minimal.
 */
const NavigationProgressBar = () => {
  const { isNavigating, navProgress = 0 } = useLoading();

  if (!isNavigating && navProgress === 0) return null;

  return (
    <div 
      className="absolute top-0 left-0 right-0 h-[2.5px] z-30 pointer-events-none overflow-hidden bg-transparent"
      aria-hidden="true"
    >
      <div
        className="h-full bg-gradient-to-r from-sky-400 via-blue-600 to-indigo-600 transition-all ease-out shadow-[0_0_8px_rgba(37,99,235,0.6)]"
        style={{
          width: `${navProgress}%`,
          transitionDuration: navProgress === 100 ? '120ms' : '220ms',
          opacity: navProgress === 100 ? 0 : 1
        }}
      />
    </div>
  );
};

export default NavigationProgressBar;

