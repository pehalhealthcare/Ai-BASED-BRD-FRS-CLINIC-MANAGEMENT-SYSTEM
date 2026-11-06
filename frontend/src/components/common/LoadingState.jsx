import React from 'react';
import CompactPageLoader from './CompactPageLoader';

/**
 * LoadingState - Compact Premium In-Page Loading Indicator
 * 
 * Complies with UI/UX requirements:
 * - 20-26px circular animated spinner using PEHAL's primary blue (#2563EB)
 * - Smooth rotation animation
 * - Minimal visual footprint
 * - Non-blocking in-page rendering
 */
const LoadingState = ({ 
  label = 'Loading...', 
  size = 24, 
  inline = false, 
  className = '' 
}) => {
  return (
    <CompactPageLoader 
      label={label} 
      size={size} 
      inline={inline} 
      className={className} 
    />
  );
};

export default LoadingState;
