import React from 'react';
import { Wifi, Shield, Database, LayoutGrid, Check, RefreshCw, AlertTriangle } from 'lucide-react';
import { useLoading, STAGES } from '../../context/LoadingContext';
import pehalLogo from '../../assets/pehal_logo.svg';

const STAGE_ICONS = {
  connecting: Wifi,
  authenticating: Shield,
  fetching: Database,
  finalizing: LayoutGrid
};

const GlobalLoader = () => {
  const { 
    isLoading, 
    isAppInitialized,
    currentStageIndex, 
    heading, 
    subheading, 
    error, 
    retry,
    returnToLogin
  } = useLoading();

  // The full-screen loader only ever displays on initial cold bootstrap before the app is ready.
  // Once the application shell has loaded, normal navigation must NEVER trigger it again.
  if (!isLoading || isAppInitialized) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-between py-8 sm:py-12 px-4 sm:px-8 bg-gradient-to-b from-[#F8FAFD] via-[#F0F5FD] to-[#F5F8FF] overflow-hidden select-none animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Loading PEHAL AI-CMS"
    >
      {/* Ambient background decorative glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-gradient-to-br from-blue-200/40 via-cyan-100/30 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-gradient-to-tl from-purple-200/35 via-blue-100/25 to-transparent rounded-full blur-3xl pointer-events-none" />
      
      {/* Background Heartbeat / ECG Wave Line */}
      <svg 
        className="absolute w-full h-32 top-1/2 -translate-y-1/2 left-0 pointer-events-none opacity-40 overflow-visible" 
        viewBox="0 0 1400 120" 
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="ecgGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.05" />
            <stop offset="20%" stopColor="#60A5FA" stopOpacity="0.6" />
            <stop offset="42%" stopColor="#3B82F6" stopOpacity="0.75" />
            <stop offset="58%" stopColor="#8B5CF6" stopOpacity="0.75" />
            <stop offset="80%" stopColor="#60A5FA" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#93C5FD" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <path
          d="M0,60 L320,60 L335,60 L345,30 L355,90 L365,45 L375,75 L385,60 L510,60 M890,60 L1015,60 L1025,30 L1035,90 L1045,45 L1055,75 L1065,60 L1400,60"
          fill="none"
          stroke="url(#ecgGrad)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>

      {/* TOP: Official PEHAL Healthcare Logo & Subtitle */}
      <header className="relative z-10 flex flex-col items-center text-center">
        <div className="h-14 sm:h-16 flex items-center justify-center">
          <img 
            src={pehalLogo} 
            alt="PEHAL Healthcare" 
            className="h-full w-auto object-contain drop-shadow-sm max-w-[200px]" 
          />
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight mt-3">
          AI-CMS Enterprise
        </h1>
        <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
          Smart Clinic Management System
        </p>
      </header>

      {/* CENTER: Rotating Gradient Ring & Clinic Graphic */}
      <main className="relative z-10 flex flex-col items-center justify-center my-auto py-6">
        {/* Circular Animation Assembly */}
        <div className="relative w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center">
          {/* Subtle outer soft pulse aura */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-400/20 via-blue-500/20 to-purple-500/20 blur-xl animate-pulse" />

          {/* Rotating Gradient Ring SVG */}
          <svg 
            className="absolute inset-0 w-full h-full animate-[spin_2.2s_linear_infinite]" 
            viewBox="0 0 160 160"
          >
            <defs>
              <linearGradient id="spinnerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00C2FF" />
                <stop offset="45%" stopColor="#2563EB" />
                <stop offset="85%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#C084FC" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Background faint track */}
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke="#E2E8F0"
              strokeWidth="4"
              opacity="0.4"
            />
            {/* Active Rotating Gradient Arc */}
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke="url(#spinnerGradient)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray="310 140"
            />
          </svg>

          {/* Center Circular Card Container */}
          <div className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-white shadow-[0_10px_35px_-8px_rgba(37,99,235,0.18)] flex items-center justify-center border border-blue-50">
            {/* Custom Hospital / Clinic Illustration matching reference */}
            <svg 
              className="w-20 h-20 sm:w-22 sm:h-22 drop-shadow-sm" 
              viewBox="0 0 100 100" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Roof Medical Cross Badge */}
              <circle 
                cx="50" 
                cy="23" 
                r="13" 
                fill="#2563EB" 
              />
              <path 
                d="M50 16 V30 M43 23 H57" 
                stroke="#FFFFFF" 
                strokeWidth="3" 
                strokeLinecap="round" 
              />

              {/* Clinic Facade */}
              <rect 
                x="22" 
                y="34" 
                width="56" 
                height="46" 
                rx="5" 
                fill="#EEF5FF" 
                stroke="#60A5FA" 
                strokeWidth="2.5" 
              />

              {/* Windows Row 1 */}
              <rect x="29" y="42" width="10" height="9" rx="2" fill="#93C5FD" />
              <rect x="45" y="42" width="10" height="9" rx="2" fill="#93C5FD" />
              <rect x="61" y="42" width="10" height="9" rx="2" fill="#93C5FD" />

              {/* Windows Row 2 (Sides) */}
              <rect x="29" y="56" width="10" height="9" rx="2" fill="#93C5FD" />
              <rect x="61" y="56" width="10" height="9" rx="2" fill="#93C5FD" />

              {/* Main Entrance Double Door */}
              <rect x="44" y="55" width="12" height="25" rx="2" fill="#2563EB" />
              <line x1="50" y1="55" x2="50" y2="80" stroke="#93C5FD" strokeWidth="1.2" />

              {/* Foundation Ground Line */}
              <line 
                x1="16" 
                y1="80" 
                x2="84" 
                y2="80" 
                stroke="#3B82F6" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
              />
            </svg>
          </div>
        </div>

        {/* Dynamic Loading Message */}
        <div className="mt-8 text-center max-w-md px-4">
          {error ? (
            <div className="flex flex-col items-center space-y-3">
              <div className="flex items-center gap-2 text-rose-600 bg-rose-50 px-3.5 py-1.5 rounded-full border border-rose-200">
                <AlertTriangle size={16} />
                <span className="text-xs font-bold">Initialization Interrupted</span>
              </div>
              <p className="text-sm font-semibold text-slate-700 max-w-sm">{error}</p>
              <div className="flex items-center gap-3 mt-2">
                <button
                  type="button"
                  onClick={retry}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
                >
                  <RefreshCw size={14} />
                  Retry
                </button>
                <button
                  type="button"
                  onClick={returnToLogin || (() => { window.location.href = '/login'; })}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                >
                  Return to Login
                </button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight transition-all duration-300">
                {heading}
              </h2>
              <p className="text-xs sm:text-sm font-normal text-slate-500 mt-1 transition-all duration-300">
                {subheading}
              </p>
            </>
          )}
        </div>
      </main>

      {/* BOTTOM: Compact Horizontal Progress Tracker (4 Stages) */}
      <footer className="relative z-10 w-full max-w-2xl px-2 sm:px-6">
        <div className="flex items-center justify-between">
          {STAGES.map((stage, idx) => {
            const Icon = STAGE_ICONS[stage.id] || Wifi;
            const isCompleted = idx < currentStageIndex;
            const isActive = idx === currentStageIndex;
            const isPending = idx > currentStageIndex;

            // In reference design, when finalized/active, stage 4 has purple glow
            const isFinalActive = isActive && idx === 3;

            return (
              <React.Fragment key={stage.id}>
                {/* Connecting Progress Line */}
                {idx > 0 && (
                  <div className="flex-1 h-[2px] mx-1 sm:mx-3 transition-colors duration-500 overflow-hidden bg-slate-200">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        idx <= currentStageIndex 
                          ? idx === 3 && currentStageIndex === 3
                            ? 'bg-gradient-to-r from-blue-500 to-purple-500 w-full'
                            : 'bg-blue-500 w-full' 
                          : 'w-0'
                      }`}
                    />
                  </div>
                )}

                {/* Stage Item */}
                <div className="flex flex-col items-center">
                  <div className="relative">
                    {/* Circular Icon Container */}
                    <div
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isCompleted
                          ? 'bg-blue-50 border border-blue-200 text-blue-600 shadow-sm'
                          : isActive
                          ? isFinalActive
                            ? 'bg-purple-50 border-2 border-purple-400 text-purple-600 shadow-[0_0_18px_rgba(168,85,247,0.35)] scale-105'
                            : 'bg-blue-50 border-2 border-blue-500 text-blue-600 shadow-[0_0_15px_rgba(59,130,246,0.3)] scale-105'
                          : 'bg-slate-100/70 border border-slate-200/80 text-slate-400'
                      }`}
                    >
                      <Icon 
                        size={18} 
                        className={`transition-transform duration-300 ${
                          isActive ? 'scale-110' : ''
                        }`} 
                      />
                    </div>

                    {/* Checkmark Badge for Completed Stages */}
                    {isCompleted && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-sm animate-scale-up">
                        <Check size={10} strokeWidth={3.5} />
                      </span>
                    )}
                  </div>

                  {/* Stage Label */}
                  <span
                    className={`text-[11px] sm:text-xs font-semibold mt-2 tracking-tight transition-colors duration-300 text-center ${
                      isCompleted
                        ? 'text-slate-700 font-semibold'
                        : isActive
                        ? isFinalActive
                          ? 'text-purple-700 font-bold'
                          : 'text-blue-600 font-bold'
                        : 'text-slate-400 font-medium'
                    }`}
                  >
                    {stage.label}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </footer>
    </div>
  );
};

export default GlobalLoader;
