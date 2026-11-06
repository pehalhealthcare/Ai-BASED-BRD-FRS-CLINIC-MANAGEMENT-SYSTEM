import React from 'react';

export const PharmacyIllustration = ({ className = "w-48 h-36" }) => (
  <svg viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="medGlow" x1="120" y1="20" x2="120" y2="180" gradientUnits="userSpaceOnUse">
        <stop stopColor="#E0F2FE" stopOpacity="0.8" />
        <stop stopColor="#BAE6FD" stopOpacity="0.2" />
      </linearGradient>
      <linearGradient id="amberBottle" x1="60" y1="70" x2="110" y2="160" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FBBF24" />
        <stop stopColor="#D97706" />
      </linearGradient>
      <linearGradient id="blisterPack" x1="10" y1="110" x2="110" y2="175" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFFFFF" />
        <stop stopColor="#E2E8F0" />
      </linearGradient>
      <filter id="softShadow" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#0F172A" floodOpacity="0.1" />
      </filter>
    </defs>

    {/* Ambient soft glow ground */}
    <ellipse cx="120" cy="160" rx="100" ry="18" fill="url(#medGlow)" />

    {/* Blue Medical Bottle with Cross */}
    <g filter="url(#softShadow)">
      {/* Bottle Body */}
      <rect x="145" y="70" width="55" height="85" rx="12" fill="white" stroke="#CBD5E1" strokeWidth="1.5" />
      {/* Label */}
      <rect x="147" y="85" width="51" height="55" fill="#F0F9FF" />
      {/* Medical Cross */}
      <path d="M172.5 100V125M160 112.5H185" stroke="#0070F3" strokeWidth="4.5" strokeLinecap="round" />
      {/* Bottle Neck & Cap */}
      <rect x="156" y="58" width="33" height="12" rx="3" fill="#E2E8F0" />
      <rect x="152" y="48" width="41" height="12" rx="4" fill="#0070F3" />
    </g>

    {/* Amber Pill Bottle */}
    <g filter="url(#softShadow)">
      <rect x="75" y="80" width="44" height="75" rx="10" fill="url(#amberBottle)" />
      <rect x="78" y="95" width="38" height="45" fill="#FEF3C7" />
      {/* Pill icon on label */}
      <circle cx="97" cy="117" r="8" fill="#F59E0B" />
      <rect x="82" y="70" width="30" height="10" rx="3" fill="#FCD34D" />
      <rect x="79" y="60" width="36" height="12" rx="4" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1" />
    </g>

    {/* Blister Pack */}
    <g filter="url(#softShadow)" transform="rotate(-12 70 140)">
      <rect x="25" y="105" width="85" height="50" rx="8" fill="url(#blisterPack)" stroke="#CBD5E1" strokeWidth="1.5" />
      {/* 6 pills in blister */}
      <circle cx="45" cy="120" r="7" fill="#F59E0B" />
      <circle cx="68" cy="120" r="7" fill="#0070F3" />
      <circle cx="91" cy="120" r="7" fill="#F59E0B" />
      <circle cx="45" cy="140" r="7" fill="#0070F3" />
      <circle cx="68" cy="140" r="7" fill="#F59E0B" />
      <circle cx="91" cy="140" r="7" fill="#0070F3" />
    </g>

    {/* Foreground Loose Capsule */}
    <g filter="url(#softShadow)" transform="rotate(25 125 155)">
      <rect x="110" y="148" width="30" height="12" rx="6" fill="#F59E0B" />
      <path d="M125 148H134C137.314 148 140 150.686 140 154C140 157.314 137.314 160 134 160H125V148Z" fill="#0070F3" />
    </g>

    {/* Small round tablet */}
    <circle cx="100" cy="165" r="6" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1" filter="url(#softShadow)" />
    <path d="M96 165H104" stroke="#CBD5E1" strokeWidth="1" />
  </svg>
);

export const LaboratoryIllustration = ({ className = "w-48 h-36" }) => (
  <svg viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="labGlow" x1="120" y1="20" x2="120" y2="180" gradientUnits="userSpaceOnUse">
        <stop stopColor="#E0F2FE" stopOpacity="0.8" />
        <stop stopColor="#F3E8FF" stopOpacity="0.2" />
      </linearGradient>
      <filter id="labShadow" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#0F172A" floodOpacity="0.1" />
      </filter>
    </defs>
    <ellipse cx="120" cy="160" rx="95" ry="18" fill="url(#labGlow)" />

    {/* Microscope */}
    <g filter="url(#labShadow)">
      {/* Base */}
      <rect x="120" y="145" width="70" height="14" rx="7" fill="#334155" />
      {/* Arm */}
      <path d="M175 145V90C175 75 160 65 145 65H135" stroke="#475569" strokeWidth="10" strokeLinecap="round" />
      {/* Eyepiece / Tube */}
      <path d="M125 50L145 75" stroke="#0070F3" strokeWidth="12" strokeLinecap="round" />
      <rect x="115" y="40" width="16" height="12" rx="4" fill="#1E293B" transform="rotate(-38 115 40)" />
      {/* Objective Turret */}
      <circle cx="145" cy="80" r="10" fill="#64748B" />
      <rect x="140" y="85" width="8" height="14" rx="2" fill="#0070F3" />
      {/* Stage */}
      <rect x="125" y="112" width="38" height="6" rx="3" fill="#1E293B" />
      {/* Slide */}
      <rect x="132" y="109" width="24" height="3" rx="1.5" fill="#38BDF8" />
    </g>

    {/* Test Tube Rack */}
    <g filter="url(#labShadow)">
      {/* Rack */}
      <rect x="40" y="125" width="70" height="32" rx="6" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="1.5" />
      {/* Tube 1: Purple */}
      <rect x="48" y="90" width="12" height="45" rx="6" fill="#FAF5FF" stroke="#C084FC" strokeWidth="1.5" />
      <rect x="49" y="110" width="10" height="23" rx="5" fill="#9333EA" />
      {/* Tube 2: Blue */}
      <rect x="68" y="80" width="12" height="55" rx="6" fill="#F0F9FF" stroke="#38BDF8" strokeWidth="1.5" />
      <rect x="69" y="105" width="10" height="28" rx="5" fill="#0284C7" />
      {/* Tube 3: Amber */}
      <rect x="88" y="95" width="12" height="40" rx="6" fill="#FEF3C7" stroke="#FBBF24" strokeWidth="1.5" />
      <rect x="89" y="115" width="10" height="18" rx="5" fill="#D97706" />
    </g>
  </svg>
);

export const InventoryIllustration = ({ className = "w-48 h-36" }) => (
  <svg viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="invGlow" x1="120" y1="20" x2="120" y2="180" gradientUnits="userSpaceOnUse">
        <stop stopColor="#E0F2FE" stopOpacity="0.8" />
        <stop stopColor="#ECFDF5" stopOpacity="0.2" />
      </linearGradient>
      <filter id="invShadow" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#0F172A" floodOpacity="0.1" />
      </filter>
    </defs>
    <ellipse cx="120" cy="160" rx="95" ry="18" fill="url(#invGlow)" />

    {/* Medical Shipping Box */}
    <g filter="url(#invShadow)">
      <rect x="55" y="85" width="80" height="70" rx="8" fill="#F59E0B" />
      <path d="M55 105H135" stroke="#D97706" strokeWidth="2" />
      {/* Blue Medical Tape */}
      <rect x="85" y="85" width="20" height="70" fill="#0284C7" />
      {/* Medical Cross on Box */}
      <rect x="65" y="115" width="15" height="15" rx="3" fill="#FEF3C7" />
      <path d="M72.5 118V127M68 122.5H77" stroke="#D97706" strokeWidth="2" strokeLinecap="round" />
    </g>

    {/* Barcode Scanner */}
    <g filter="url(#invShadow)" transform="rotate(-15 170 95)">
      {/* Scanner Head */}
      <rect x="145" y="65" width="45" height="30" rx="8" fill="#1E293B" />
      <rect x="140" y="70" width="6" height="20" rx="3" fill="#EF4444" />
      {/* Laser line */}
      <line x1="110" y1="80" x2="140" y2="80" stroke="#EF4444" strokeWidth="2.5" strokeDasharray="3 2" />
      {/* Handle */}
      <rect x="165" y="92" width="16" height="45" rx="6" fill="#334155" />
      {/* Cable / Base */}
      <path d="M173 137C173 150 185 155 195 155" stroke="#64748B" strokeWidth="4" strokeLinecap="round" />
    </g>

    {/* Clipboard Checklist */}
    <g filter="url(#invShadow)">
      <rect x="120" y="110" width="55" height="48" rx="6" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" />
      <rect x="138" y="105" width="18" height="8" rx="2" fill="#64748B" />
      <line x1="130" y1="122" x2="165" y2="122" stroke="#0070F3" strokeWidth="2" strokeLinecap="round" />
      <line x1="130" y1="132" x2="160" y2="132" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
      <line x1="130" y1="142" x2="155" y2="142" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
    </g>
  </svg>
);

export const BillingIllustration = ({ className = "w-48 h-36" }) => (
  <svg viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="billGlow" x1="120" y1="20" x2="120" y2="180" gradientUnits="userSpaceOnUse">
        <stop stopColor="#E0F2FE" stopOpacity="0.8" />
        <stop stopColor="#EFF6FF" stopOpacity="0.2" />
      </linearGradient>
      <filter id="billShadow" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#0F172A" floodOpacity="0.1" />
      </filter>
    </defs>
    <ellipse cx="120" cy="160" rx="95" ry="18" fill="url(#billGlow)" />

    {/* Invoice Paper Document */}
    <g filter="url(#billShadow)" transform="rotate(-6 100 110)">
      <rect x="60" y="60" width="70" height="95" rx="8" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" />
      {/* Top Banner */}
      <rect x="62" y="62" width="66" height="20" rx="6" fill="#0070F3" />
      <circle cx="75" cy="72" r="5" fill="#FFFFFF" opacity="0.8" />
      {/* Lines */}
      <line x1="72" y1="92" x2="118" y2="92" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="72" y1="102" x2="105" y2="102" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
      <line x1="72" y1="112" x2="112" y2="112" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
      {/* Total & Paid stamp */}
      <rect x="72" y="125" width="46" height="18" rx="4" fill="#ECFDF5" stroke="#10B981" strokeWidth="1" />
      <text x="82" y="137" fill="#059669" fontSize="8" fontWeight="bold">PAID ₹</text>
    </g>

    {/* Credit Card / POS */}
    <g filter="url(#billShadow)" transform="rotate(12 165 125)">
      <rect x="130" y="95" width="75" height="48" rx="7" fill="#1E293B" />
      <rect x="138" y="108" width="14" height="11" rx="2" fill="#F59E0B" />
      <circle cx="185" cy="128" r="7" fill="#EF4444" opacity="0.8" />
      <circle cx="194" cy="128" r="7" fill="#F59E0B" opacity="0.8" />
    </g>

    {/* Gold Rupee Coin */}
    <g filter="url(#billShadow)">
      <circle cx="135" cy="150" r="14" fill="#F59E0B" stroke="#FBBF24" strokeWidth="2" />
      <circle cx="135" cy="150" r="11" fill="#D97706" />
      <text x="130" y="155" fill="#FFFFFF" fontSize="13" fontWeight="black">₹</text>
    </g>
  </svg>
);
