import React from 'react';

/**
 * CompactPageLoader - Premium In-Page Loading Indicator
 * 
 * Replaces full-screen blocking modals with a compact, elegant spinner (20-24px)
 * using PEHAL primary blue (#2563EB).
 */
const CompactPageLoader = ({ 
  label = 'Loading...', 
  size = 22, 
  inline = false,
  className = '' 
}) => {
  const spinnerElement = (
    <div 
      className="relative flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
      role="status"
      aria-label={label}
    >
      {/* Outer subtle glow */}
      <div 
        className="absolute inset-0 rounded-full bg-blue-500/15 blur-[2px] animate-pulse pointer-events-none" 
      />

      {/* Rotating Circular Arc SVG */}
      <svg 
        className="w-full h-full animate-[spin_0.85s_linear_infinite]" 
        viewBox="0 0 24 24" 
        fill="none"
      >
        <circle 
          cx="12" 
          cy="12" 
          r="9.5" 
          stroke="#E2E8F0" 
          strokeWidth="2.5" 
          className="opacity-40"
        />
        <path 
          d="M12 2.5 A 9.5 9.5 0 0 1 21.5 12" 
          stroke="url(#compactBlueGrad)" 
          strokeWidth="2.5" 
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="compactBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00C2FF" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );

  if (inline) {
    return (
      <div className={`inline-flex items-center gap-2 text-xs font-medium text-slate-500 ${className}`}>
        {spinnerElement}
        {label && <span>{label}</span>}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center py-10 px-4 text-center select-none ${className}`}>
      {spinnerElement}
      {label && (
        <p className="mt-2 text-xs font-semibold text-slate-500 tracking-tight animate-fade-in">
          {label}
        </p>
      )}
    </div>
  );
};

export default CompactPageLoader;

