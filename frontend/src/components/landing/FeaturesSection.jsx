import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Sparkles, Calendar, Users, ShieldCheck, BarChart3, Cloud, 
  ArrowRight, ArrowLeft 
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

// ============================================================
// 3D Healthcare Vector Illustrations (Bespoke, High-Fidelity SVGs)
// ============================================================

// 1. AI-Powered Workflows: 3D Robot Doctor with Medical Clipboard & Glowing AI Sparkles
function AiWorkflowsGraphic() {
  return (
    <div className="relative w-full h-32 sm:h-36 flex items-center justify-center my-1 pointer-events-none select-none">
      <svg width="170" height="125" viewBox="0 0 170 125" fill="none" className="drop-shadow-lg">
        <defs>
          <linearGradient id="robotBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E0F2FE" />
          </linearGradient>
          <linearGradient id="robotVisorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#1E293B" />
          </linearGradient>
          <linearGradient id="boardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F0F9FF" />
          </linearGradient>
          <filter id="aiGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Soft ground shadow */}
        <ellipse cx="85" cy="116" rx="42" ry="6" fill="#0284C7" fillOpacity="0.14" />

        {/* Ambient sparkle glow */}
        <circle cx="140" cy="30" r="16" fill="#38BDF8" fillOpacity="0.18" filter="url(#aiGlow)" />

        {/* Robot Head Antenna */}
        <line x1="85" y1="16" x2="85" y2="28" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="85" cy="14" r="4.5" fill="#0284C7" stroke="#38BDF8" strokeWidth="1.5" />

        {/* Ears / Side Sensors */}
        <rect x="52" y="42" width="7" height="15" rx="3.5" fill="#0284C7" />
        <rect x="111" y="42" width="7" height="15" rx="3.5" fill="#0284C7" />

        {/* Robot Head Shell */}
        <rect x="57" y="28" width="56" height="44" rx="16" fill="url(#robotBodyGrad)" stroke="#BAE6FD" strokeWidth="2" />
        {/* Gloss highlight on top of head */}
        <path d="M68 32 C76 30 94 30 102 32" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity="0.9" />

        {/* Visor Screen */}
        <rect x="65" y="36" width="40" height="26" rx="9" fill="url(#robotVisorGrad)" stroke="#334155" strokeWidth="1" />
        {/* Visor Glowing Eyes */}
        <ellipse cx="75" cy="48" rx="4" ry="5" fill="#38BDF8" filter="url(#aiGlow)" />
        <ellipse cx="95" cy="48" rx="4" ry="5" fill="#38BDF8" filter="url(#aiGlow)" />
        <circle cx="76.5" cy="46.5" r="1.3" fill="#FFFFFF" />
        <circle cx="96.5" cy="46.5" r="1.3" fill="#FFFFFF" />
        {/* Happy smile line */}
        <path d="M81 54 Q 85 56.5 89 54" stroke="#38BDF8" strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />

        {/* Robot Body / Coat */}
        <rect x="63" y="70" width="44" height="40" rx="12" fill="url(#robotBodyGrad)" stroke="#BAE6FD" strokeWidth="2" />
        {/* Doctor Stethoscope */}
        <path d="M69 72 C69 88, 101 88, 101 72" stroke="#0284C7" strokeWidth="2" fill="none" strokeLinecap="round" />
        <circle cx="85" cy="87" r="4" fill="#38BDF8" stroke="#0284C7" strokeWidth="1" />

        {/* 3D Medical Clipboard in Robot's Arm */}
        <g transform="rotate(6 108 58)">
          <rect x="102" y="54" width="44" height="54" rx="8" fill="url(#boardGrad)" stroke="#7DD3FC" strokeWidth="2" />
          {/* Top blue clip */}
          <rect x="114" y="49" width="20" height="10" rx="3" fill="#0070F3" />
          <circle cx="124" cy="53" r="1.8" fill="#FFFFFF" />
          {/* Medical Cross Badge */}
          <rect x="121" y="65" width="6" height="16" rx="1.5" fill="#0070F3" />
          <rect x="116" y="70" width="16" height="6" rx="1.5" fill="#0070F3" />
          {/* Checklist Lines */}
          <rect x="110" y="88" width="28" height="2.5" rx="1.2" fill="#94A3B8" />
          <rect x="110" y="94" width="22" height="2.5" rx="1.2" fill="#CBD5E1" />
        </g>

        {/* Floating AI Sparkles */}
        <path d="M142 22 L144 28 L150 30 L144 32 L142 38 L140 32 L134 30 L140 28 Z" fill="#38BDF8" />
        <path d="M26 44 L28 48 L32 50 L28 52 L26 56 L24 52 L20 50 L24 48 Z" fill="#818CF8" />
        <circle cx="34" cy="32" r="2.5" fill="#38BDF8" opacity="0.8" />
        <circle cx="148" cy="54" r="2.5" fill="#818CF8" opacity="0.7" />
      </svg>
    </div>
  );
}

// 2. End-to-End Management: 3D Calendar, Schedule Grid & Clock Sync
function EndToEndGraphic() {
  return (
    <div className="relative w-full h-32 sm:h-36 flex items-center justify-center my-1 pointer-events-none select-none">
      <svg width="170" height="125" viewBox="0 0 170 125" fill="none" className="drop-shadow-lg">
        <defs>
          <linearGradient id="calHeaderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0284C7" />
            <stop offset="100%" stopColor="#0EA5E9" />
          </linearGradient>
          <linearGradient id="clockFaceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E0F2FE" />
          </linearGradient>
        </defs>

        {/* Soft ground shadow */}
        <ellipse cx="85" cy="116" rx="48" ry="6" fill="#0284C7" fillOpacity="0.14" />

        {/* Layered calendar backing plate */}
        <rect x="38" y="24" width="82" height="84" rx="14" fill="#E0F2FE" transform="rotate(-3 38 24)" />

        {/* Main 3D Calendar Body */}
        <rect x="34" y="20" width="90" height="86" rx="14" fill="#FFFFFF" stroke="#BAE6FD" strokeWidth="2" />

        {/* Top Binder Header */}
        <path d="M34 32 C34 25.37 39.37 20 46 20 H112 C118.63 20 124 25.37 124 32 V36 H34 V32 Z" fill="url(#calHeaderGrad)" />
        {/* Binder Rings */}
        <circle cx="50" cy="18" r="3.8" fill="#FFFFFF" stroke="#38BDF8" strokeWidth="1.6" />
        <circle cx="79" cy="18" r="3.8" fill="#FFFFFF" stroke="#38BDF8" strokeWidth="1.6" />
        <circle cx="108" cy="18" r="3.8" fill="#FFFFFF" stroke="#38BDF8" strokeWidth="1.6" />

        {/* Calendar Grid Slots */}
        {/* Row 1 */}
        <rect x="44" y="44" width="20" height="15" rx="4" fill="#F0F9FF" stroke="#BAE6FD" />
        <rect x="69" y="44" width="20" height="15" rx="4" fill="#F0F9FF" stroke="#BAE6FD" />
        <rect x="94" y="44" width="20" height="15" rx="4" fill="#DBEAFE" stroke="#60A5FA" />
        <path d="M100 51.5 L103 54.5 L108 49" stroke="#0284C7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Row 2 */}
        <rect x="44" y="64" width="20" height="15" rx="4" fill="#F0F9FF" stroke="#BAE6FD" />
        <rect x="69" y="64" width="20" height="15" rx="4" fill="#DCFCE7" stroke="#86EFAC" />
        <path d="M75 71.5 L78 74.5 L83 69" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="94" y="64" width="20" height="15" rx="4" fill="#FEF3C7" stroke="#FCD34D" />

        {/* Row 3 */}
        <rect x="44" y="84" width="20" height="14" rx="4" fill="#F0F9FF" stroke="#BAE6FD" />
        <rect x="69" y="84" width="20" height="14" rx="4" fill="#F0F9FF" stroke="#BAE6FD" />
        <rect x="94" y="84" width="20" height="14" rx="4" fill="#F0F9FF" stroke="#BAE6FD" />

        {/* 3D Round Clock floating on top-right */}
        <g transform="translate(112, 34)">
          <circle cx="20" cy="20" r="20" fill="url(#clockFaceGrad)" stroke="#38BDF8" strokeWidth="2.5" />
          <circle cx="20" cy="20" r="16" fill="#FFFFFF" />
          {/* Hands at 10:10 */}
          <line x1="20" y1="20" x2="20" y2="10" stroke="#0284C7" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="20" y1="20" x2="28" y2="15" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round" />
          <circle cx="20" cy="20" r="2.5" fill="#0284C7" />
          {/* Ticks */}
          <circle cx="20" cy="6" r="1.2" fill="#7DD3FC" />
          <circle cx="34" cy="20" r="1.2" fill="#7DD3FC" />
          <circle cx="20" cy="34" r="1.2" fill="#7DD3FC" />
          <circle cx="6" cy="20" r="1.2" fill="#7DD3FC" />
        </g>
      </svg>
    </div>
  );
}

// 3. Better Patient Experience: 3D Digital Health Profile Card, Avatar & Message
function PatientExperienceGraphic() {
  return (
    <div className="relative w-full h-32 sm:h-36 flex items-center justify-center my-1 pointer-events-none select-none">
      <svg width="170" height="125" viewBox="0 0 170 125" fill="none" className="drop-shadow-lg">
        <defs>
          <linearGradient id="patientCardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#FAF5FF" />
          </linearGradient>
          <linearGradient id="avatarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C084FC" />
            <stop offset="100%" stopColor="#9333EA" />
          </linearGradient>
        </defs>

        {/* Soft ground shadow */}
        <ellipse cx="85" cy="116" rx="48" ry="6" fill="#9333EA" fillOpacity="0.14" />

        {/* 3D Main Health Card */}
        <rect x="30" y="22" width="110" height="84" rx="16" fill="url(#patientCardGrad)" stroke="#E9D5FF" strokeWidth="2" />

        {/* Circular Avatar Frame */}
        <circle cx="58" cy="50" r="16" fill="#F3E8FF" stroke="#D8B4FE" strokeWidth="1.5" />
        {/* Avatar Silhouette */}
        <circle cx="58" cy="45" r="7" fill="url(#avatarGrad)" />
        <path d="M47 60 C47 54 52 53 58 53 C64 53 69 54 69 60" fill="url(#avatarGrad)" />
        {/* Active Online Indicator */}
        <circle cx="69" cy="60" r="4" fill="#22C55E" stroke="#FFFFFF" strokeWidth="1.5" />

        {/* Patient Info Bars */}
        <rect x="82" y="42" width="48" height="5.5" rx="2.5" fill="#9333EA" />
        <rect x="82" y="51" width="36" height="4.5" rx="2" fill="#C4B5FD" />
        <rect x="82" y="59" width="26" height="3.5" rx="1.5" fill="#E9D5FF" />

        {/* ECG / Vitals Pulse Wave */}
        <path d="M42 82 H58 L62 74 L67 89 L72 77 L76 82 H128" stroke="#A855F7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Floating 3D Instant Message Pill */}
        <g transform="translate(88, 78)">
          <rect x="0" y="0" width="62" height="24" rx="12" fill="#FFFFFF" stroke="#D8B4FE" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="3.5" fill="#22C55E" />
          <rect x="20" y="10.5" width="32" height="3" rx="1.5" fill="#9333EA" />
        </g>

        {/* Heart Sparkle */}
        <path d="M144 28 C144 24 150 22 152 26 C154 22 160 24 160 28 C160 34 152 38 152 38 C152 38 144 34 144 28 Z" fill="#EC4899" opacity="0.85" />
      </svg>
    </div>
  );
}

// 4. Secure & Compliant: 3D Mint/Emerald Shield with Checkmark & Cyan Padlock
function SecureCompliantGraphic() {
  return (
    <div className="relative w-full h-32 sm:h-36 flex items-center justify-center my-1 pointer-events-none select-none">
      <svg width="170" height="125" viewBox="0 0 170 125" fill="none" className="drop-shadow-lg">
        <defs>
          <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="padlockGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0EA5E9" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>
        </defs>

        {/* Soft ground shadow */}
        <ellipse cx="85" cy="116" rx="48" ry="6" fill="#059669" fillOpacity="0.14" />

        {/* Cloud backing */}
        <path d="M102 40 C102 32 112 30 118 35 C124 31 134 35 134 43 C142 45 143 55 135 60 H102 Z" fill="#D1FAE5" opacity="0.85" />

        {/* 3D Emerald Shield Outer Body */}
        <path d="M72 18 L110 33 V65 C110 88 72 105 72 105 C72 105 34 88 34 65 V33 L72 18 Z" fill="url(#shieldGrad)" stroke="#34D399" strokeWidth="2" />

        {/* Shield Inner Face */}
        <path d="M72 26 L103 37 V64 C103 82 72 96 72 96 C72 96 41 82 41 64 V37 L72 26 Z" fill="#FFFFFF" />

        {/* Center Checkmark Circle Badge */}
        <circle cx="72" cy="58" r="17" fill="#ECFDF5" stroke="#A7F3D0" strokeWidth="1.5" />
        <path d="M63 58 L70 65 L82 51" stroke="#059669" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* 3D Cyan Padlock on right side */}
        <g transform="translate(106, 52)">
          {/* Metallic Shackle */}
          <path d="M10 11 V6 C10 2 18 2 18 6 V11" stroke="#0284C7" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          {/* Padlock Body */}
          <rect x="3" y="10" width="24" height="22" rx="6" fill="url(#padlockGrad)" stroke="#38BDF8" strokeWidth="1.5" />
          {/* Keyhole */}
          <circle cx="15" cy="19" r="2.2" fill="#FFFFFF" />
          <path d="M15 20 V25" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" />
        </g>

        {/* Compliance Sparkle */}
        <path d="M28 36 L30 40 L34 41.5 L30 43 L28 47 L26 43 L22 41.5 L26 40 Z" fill="#34D399" />
      </svg>
    </div>
  );
}

// 5. Actionable Insights: 3D Golden/Orange Bar Chart with Growth Arrow
function ActionableInsightsGraphic() {
  return (
    <div className="relative w-full h-32 sm:h-36 flex items-center justify-center my-1 pointer-events-none select-none">
      <svg width="170" height="125" viewBox="0 0 170 125" fill="none" className="drop-shadow-lg">
        <defs>
          <linearGradient id="barGrad4" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#EA580C" />
            <stop offset="100%" stopColor="#C2410C" />
          </linearGradient>
          <linearGradient id="arrowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EA580C" />
          </linearGradient>
        </defs>

        {/* Soft ground shadow */}
        <ellipse cx="85" cy="116" rx="48" ry="6" fill="#EA580C" fillOpacity="0.14" />

        {/* 3D Report Backplate */}
        <rect x="30" y="22" width="110" height="86" rx="14" fill="#FFFFFF" stroke="#FED7AA" strokeWidth="2" />
        {/* Horizontal grid lines */}
        <line x1="40" y1="44" x2="130" y2="44" stroke="#FFF7ED" strokeWidth="1.5" strokeDasharray="3 3" />
        <line x1="40" y1="65" x2="130" y2="65" stroke="#FFF7ED" strokeWidth="1.5" strokeDasharray="3 3" />
        <line x1="40" y1="86" x2="130" y2="86" stroke="#FFF7ED" strokeWidth="1.5" />

        {/* 3D Vertical Columns */}
        <rect x="44" y="73" width="15" height="25" rx="4.5" fill="#FFEDD5" stroke="#FED7AA" />
        <rect x="66" y="58" width="15" height="40" rx="4.5" fill="#FED7AA" stroke="#FDBA74" />
        <rect x="88" y="45" width="15" height="53" rx="4.5" fill="#FDBA74" stroke="#FB923C" />
        <rect x="110" y="30" width="15" height="68" rx="4.5" fill="url(#barGrad4)" stroke="#EA580C" />

        {/* 3D Upward Curved Growth Trendline */}
        <path d="M48 71 C65 60, 85 45, 122 23" stroke="url(#arrowGrad)" strokeWidth="4.5" strokeLinecap="round" />
        <polygon points="114,18 128,21 122,34" fill="#EA580C" />

        {/* Growth badge pill */}
        <g transform="translate(118, 11)">
          <circle cx="11" cy="11" r="11" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.5" />
          <path d="M8 12 L11 8 L14 12" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}

// 6. Access Anywhere: 3D Smartphone, Tablet Card & Wi-Fi Pulse (Matches Reference Image)
function AccessAnywhereGraphic() {
  return (
    <div className="relative w-full h-32 sm:h-36 flex items-center justify-center my-1 pointer-events-none select-none">
      <svg width="170" height="125" viewBox="0 0 170 125" fill="none" className="drop-shadow-lg">
        <defs>
          <linearGradient id="phoneFrameGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#FFF1F2" />
          </linearGradient>
          <linearGradient id="cloudBackGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFE4E6" />
            <stop offset="100%" stopColor="#FECDD3" />
          </linearGradient>
        </defs>

        {/* Soft ground shadow */}
        <ellipse cx="85" cy="116" rx="48" ry="6" fill="#F43F5E" fillOpacity="0.14" />

        {/* 3D Cloud in background */}
        <path d="M94 40 C94 30 106 25 116 32 C122 27 136 31 136 40 C144 42 146 54 138 60 H94 C85 60 83 49 89 45 C87 42 89 40 94 40 Z" fill="url(#cloudBackGrad)" opacity="0.85" />

        {/* 3D Smartphone Device */}
        <rect x="52" y="18" width="60" height="90" rx="14" fill="url(#phoneFrameGrad)" stroke="#FECDD3" strokeWidth="2.5" />
        {/* Smartphone Screen */}
        <rect x="56" y="26" width="52" height="72" rx="8" fill="#FFFFFF" />
        {/* Top speaker notch */}
        <rect x="75" y="22" width="14" height="2.5" rx="1.2" fill="#FDA4AF" />

        {/* Health App UI Header on Phone */}
        <rect x="61" y="32" width="42" height="20" rx="5" fill="#FFF1F2" stroke="#FECDD3" />
        <circle cx="70" cy="42" r="4.5" fill="#F43F5E" />
        <path d="M68 42 L69.5 43.5 L72 40.5" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="78" y="39" width="20" height="2.5" rx="1.2" fill="#E11D48" />
        <rect x="78" y="44" width="14" height="2" rx="1" fill="#FDA4AF" />

        {/* ECG Heartbeat line on Phone */}
        <path d="M61 62 H70 L73 56 L77 68 L81 60 L84 62 H97" stroke="#F43F5E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Overlapping 3D Tablet / Health Card */}
        <g transform="translate(92, 52) rotate(4)">
          <rect x="0" y="0" width="46" height="52" rx="8" fill="#FFFFFF" stroke="#FDA4AF" strokeWidth="2" />
          {/* Mini header badge */}
          <rect x="8" y="8" width="12" height="12" rx="3" fill="#FFF1F2" />
          <path d="M11 14 H17 M14 11 V17" stroke="#E11D48" strokeWidth="1.6" strokeLinecap="round" />
          {/* Card vital lines */}
          <rect x="24" y="11" width="14" height="3" rx="1.5" fill="#E11D48" />
          <rect x="8" y="26" width="30" height="2.5" rx="1.2" fill="#CBD5E1" />
          <rect x="8" y="32" width="24" height="2.5" rx="1.2" fill="#CBD5E1" />
          <rect x="8" y="38" width="28" height="2.5" rx="1.2" fill="#CBD5E1" />
        </g>

        {/* Radiating Wi-Fi Waves on Left */}
        <path d="M34 46 C39 41, 46 41, 51 46" stroke="#FB7185" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        <path d="M38 52 C41 48, 45 48, 48 52" stroke="#FB7185" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        <circle cx="43" cy="58" r="1.8" fill="#E11D48" />
      </svg>
    </div>
  );
}

// 7. Charming Modern Clinic Building Graphic
function ClinicBuildingGraphic() {
  return (
    <div className="w-24 h-20 sm:w-28 sm:h-22 shrink-0 pointer-events-none select-none flex items-center justify-center">
      <svg width="110" height="85" viewBox="0 0 110 85" fill="none" className="drop-shadow-sm">
        <path d="M8 72 Q 55 76 102 72 L102 82 L8 82 Z" fill="#DCFCE7" />
        <polygon points="46,82 50,68 60,68 64,82" fill="#F1F5F9" stroke="#E2E8F0" />
        <rect x="18" y="60" width="4" height="14" fill="#92400E" rx="1" />
        <circle cx="20" cy="54" r="11" fill="#22C55E" />
        <circle cx="20" cy="52" r="8" fill="#4ADE80" opacity="0.6" />
        <rect x="88" y="60" width="4" height="14" fill="#92400E" rx="1" />
        <circle cx="90" cy="54" r="11" fill="#22C55E" />
        <circle cx="90" cy="52" r="8" fill="#4ADE80" opacity="0.6" />
        <rect x="28" y="34" width="54" height="36" rx="4" fill="#FFFFFF" stroke="#BAE6FD" strokeWidth="1.5" />
        <rect x="24" y="30" width="62" height="7" rx="2" fill="#0070F3" />
        <rect x="44" y="16" width="22" height="15" rx="3" fill="#FFFFFF" stroke="#BAE6FD" strokeWidth="1.5" />
        <rect x="53" y="19" width="4" height="9" rx="1" fill="#0070F3" />
        <rect x="50.5" y="21.5" width="9" height="4" rx="1" fill="#0070F3" />
        <rect x="48" y="48" width="14" height="22" rx="2" fill="#E0F2FE" stroke="#38BDF8" strokeWidth="1" />
        <line x1="55" y1="48" x2="55" y2="70" stroke="#38BDF8" strokeWidth="1" />
        <rect x="32" y="44" width="12" height="12" rx="2" fill="#EFF6FF" stroke="#BAE6FD" strokeWidth="1" />
        <rect x="66" y="44" width="12" height="12" rx="2" fill="#EFF6FF" stroke="#BAE6FD" strokeWidth="1" />
      </svg>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT: FeaturesSection
// ============================================================
export default function FeaturesSection({ onExploreFeatures }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const shouldReduceMotion = useReducedMotion();
  const isDraggingRef = useRef(false);

  // All 6 existing features preserved with bespoke cinematic styling
  const features = [
    {
      id: 'ai-workflows',
      tag: '01',
      title: 'AI-Powered Workflows',
      shortTitle: 'AI Workflows',
      desc: 'Automate OPD, prescriptions, follow-ups and more.',
      icon: <Sparkles className="w-5 h-5" />,
      bgIcon: 'bg-blue-50 text-blue-600 border border-blue-100',
      activeColor: 'text-blue-600',
      cardAccent: 'border-blue-200/90',
      graphic: <AiWorkflowsGraphic />,
      theme: {
        ambientPrimary: 'rgba(59, 130, 246, 0.22)',
        ambientSecondary: 'rgba(139, 92, 246, 0.18)',
        accentColor: '#2563EB',
        floatingPill: 'bg-blue-50 text-blue-600 border border-blue-100',
        floatingIcon: Sparkles,
      }
    },
    {
      id: 'end-to-end',
      tag: '02',
      title: 'End-to-End Management',
      shortTitle: 'End-to-End',
      desc: 'OPD, IPD, Lab, Pharmacy, Billing, Inventory — all in one place.',
      icon: <Calendar className="w-5 h-5" />,
      bgIcon: 'bg-sky-50 text-sky-600 border border-sky-100',
      activeColor: 'text-sky-600',
      cardAccent: 'border-sky-200/90',
      graphic: <EndToEndGraphic />,
      theme: {
        ambientPrimary: 'rgba(6, 182, 212, 0.22)',
        ambientSecondary: 'rgba(56, 189, 248, 0.18)',
        accentColor: '#0284C7',
        floatingPill: 'bg-sky-50 text-sky-600 border border-sky-100',
        floatingIcon: Calendar,
      }
    },
    {
      id: 'patient-exp',
      tag: '03',
      title: 'Better Patient Experience',
      shortTitle: 'Patient Experience',
      desc: 'Faster service, digital records and seamless communication.',
      icon: <Users className="w-5 h-5" />,
      bgIcon: 'bg-purple-50 text-purple-600 border border-purple-100',
      activeColor: 'text-purple-600',
      cardAccent: 'border-purple-200/90',
      graphic: <PatientExperienceGraphic />,
      theme: {
        ambientPrimary: 'rgba(168, 85, 247, 0.20)',
        ambientSecondary: 'rgba(236, 72, 153, 0.16)',
        accentColor: '#9333EA',
        floatingPill: 'bg-purple-50 text-purple-600 border border-purple-100',
        floatingIcon: Users,
      }
    },
    {
      id: 'security-compliant',
      tag: '04',
      title: 'Secure & Compliant',
      shortTitle: 'Secure & Compliant',
      desc: 'Built for Indian healthcare standards with enterprise-grade security.',
      icon: <ShieldCheck className="w-5 h-5" />,
      bgIcon: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
      activeColor: 'text-emerald-600',
      cardAccent: 'border-emerald-200/90',
      graphic: <SecureCompliantGraphic />,
      theme: {
        ambientPrimary: 'rgba(16, 185, 129, 0.20)',
        ambientSecondary: 'rgba(20, 184, 166, 0.16)',
        accentColor: '#059669',
        floatingPill: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
        floatingIcon: ShieldCheck,
      }
    },
    {
      id: 'insights',
      tag: '05',
      title: 'Actionable Insights',
      shortTitle: 'Actionable Insights',
      desc: 'Real-time reports to help you grow your practice.',
      icon: <BarChart3 className="w-5 h-5" />,
      bgIcon: 'bg-amber-50 text-amber-600 border border-amber-100',
      activeColor: 'text-amber-600',
      cardAccent: 'border-amber-200/90',
      graphic: <ActionableInsightsGraphic />,
      theme: {
        ambientPrimary: 'rgba(245, 158, 11, 0.20)',
        ambientSecondary: 'rgba(249, 115, 22, 0.16)',
        accentColor: '#D97706',
        floatingPill: 'bg-amber-50 text-amber-600 border border-amber-100',
        floatingIcon: BarChart3,
      }
    },
    {
      id: 'access-anywhere',
      tag: '06',
      title: 'Access Anywhere',
      shortTitle: 'Access Anywhere',
      desc: 'Web, tablet and mobile — your clinic in your pocket.',
      icon: <Cloud className="w-5 h-5" />,
      bgIcon: 'bg-rose-50 text-rose-500 border border-rose-100',
      activeColor: 'text-rose-500',
      cardAccent: 'border-rose-200/90',
      graphic: <AccessAnywhereGraphic />,
      theme: {
        ambientPrimary: 'rgba(14, 165, 233, 0.22)',
        ambientSecondary: 'rgba(244, 63, 94, 0.18)',
        accentColor: '#0070F3',
        floatingPill: 'bg-rose-50 text-rose-500 border border-rose-100',
        floatingIcon: Cloud,
      }
    },
  ];

  const currentFeature = features[activeIndex];

  const handleNext = useCallback(() => {
    setDirection(1);
    setActiveIndex((prev) => (prev + 1) % features.length);
  }, [features.length]);

  const handlePrev = useCallback(() => {
    setDirection(-1);
    setActiveIndex((prev) => (prev - 1 + features.length) % features.length);
  }, [features.length]);

  const handleSelectFeature = useCallback((index) => {
    setDirection(index > activeIndex ? 1 : -1);
    setActiveIndex(index);
  }, [activeIndex]);

  const handleExploreClick = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (onExploreFeatures) {
      onExploreFeatures();
    } else {
      const el = document.getElementById('solutions');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev]);

  const FloatingIconComponent = currentFeature.theme.floatingIcon;

  return (
    <section 
      id="features" 
      className="py-14 sm:py-20 lg:py-24 bg-gradient-to-b from-white via-slate-50/40 to-white relative border-t border-slate-100 overflow-hidden select-none"
    >
      {/* ── Dynamic Cinematic Background reacting to active feature ── */}
      <div 
        className="absolute top-1/4 -left-32 w-[420px] h-[420px] rounded-full blur-[110px] pointer-events-none transition-all duration-700 ease-out"
        style={{ background: currentFeature.theme.ambientPrimary }}
      />
      <div 
        className="absolute top-1/2 -right-32 w-[460px] h-[460px] rounded-full blur-[120px] pointer-events-none transition-all duration-700 ease-out"
        style={{ background: currentFeature.theme.ambientSecondary }}
      />
      <div 
        className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[520px] h-[340px] rounded-full blur-[130px] pointer-events-none transition-all duration-700 ease-out"
        style={{ background: currentFeature.theme.ambientPrimary, opacity: 0.4 }}
      />

      {/* Subtle flowing cinematic gradient wave contours */}
      <div className="absolute inset-0 pointer-events-none opacity-40 overflow-hidden">
        <svg className="w-full h-full min-w-[1200px]" viewBox="0 0 1440 800" fill="none" preserveAspectRatio="none">
          <path 
            d="M-100,240 C320,120 540,460 920,280 C1200,160 1380,360 1540,240" 
            stroke="url(#cinematicWaveGrad)" 
            strokeWidth="1.5" 
            strokeDasharray="4 6" 
          />
          <path 
            d="M-60,420 C360,320 620,580 1020,410 C1280,310 1420,520 1560,440" 
            stroke="url(#cinematicWaveGrad)" 
            strokeWidth="2" 
          />
          <defs>
            <linearGradient id="cinematicWaveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#818CF8" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.15" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 relative z-10">

        {/* ── 1. SECTION HEADER (Center-aligned, vibrant blue gradient on 'Modern Clinic') ── */}
        <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8">
          {/* Eyebrow Badge */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-blue-50/90 border border-blue-200 text-blue-600 text-[11px] font-black uppercase tracking-widest shadow-xs mb-3">
            <span>WHY AI-CMS</span>
          </div>

          {/* Main Heading with vibrant blue gradient */}
          <h2 className="text-2xl min-[360px]:text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Everything You Need <br className="hidden min-[360px]:inline" />
            to Run a{' '}
            <span className="bg-gradient-to-r from-blue-600 via-sky-500 to-blue-700 bg-clip-text text-transparent">
              Modern Clinic
            </span>
          </h2>

          {/* Supporting description */}
          <p className="text-xs min-[360px]:text-sm sm:text-base text-slate-500 mt-2.5 font-normal leading-relaxed max-w-lg mx-auto">
            A complete, integrated and intelligent platform for today's healthcare providers.
          </p>

          {/* Animated Swipe Indicator with Hand Icon */}
          <div className="flex items-center justify-center gap-2 text-blue-600/90 text-xs font-semibold mt-4 mb-1 select-none">
            <div className="h-px w-8 sm:w-16 bg-gradient-to-r from-transparent to-blue-200" />
            <motion.div 
              animate={shouldReduceMotion ? {} : { x: [-3, 3, -3] }} 
              transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
              className="flex items-center gap-1.5"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-blue-600">
                <path d="M12 11V6a2 2 0 1 1 4 0v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8 13V8.5a1.5 1.5 0 0 1 3 0V12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M16 11.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-2a6 6 0 0 1-5.65-4L4 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="tracking-wide">Swipe to explore features</span>
            </motion.div>
            <div className="h-px w-8 sm:w-16 bg-gradient-to-l from-transparent to-blue-200" />
          </div>
        </div>

        {/* ── 2. CINEMATIC FEATURE CAROUSEL (Centerpiece with Layered Glass Cards) ── */}
        <div className="relative flex items-center justify-center gap-2 sm:gap-4 lg:gap-6 mb-5 sm:mb-6">
          
          {/* Left Navigation: Circular White Glass Button */}
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous feature"
            className="w-9 h-9 min-[360px]:w-10 min-[360px]:h-10 sm:w-12 sm:h-12 rounded-full bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-md text-slate-700 hover:text-blue-600 hover:border-blue-300 hover:scale-105 active:scale-95 flex items-center justify-center transition-all shrink-0 z-30 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <ArrowLeft size={18} className="text-slate-800" />
          </button>

          {/* Center 3D Card Stack Container */}
          <div 
            className="relative w-full max-w-[276px] min-[360px]:max-w-[296px] min-[400px]:max-w-[320px] sm:max-w-[360px] lg:max-w-[390px] h-[375px] min-[360px]:h-[390px] sm:h-[415px] lg:h-[435px] touch-pan-y"
            tabIndex={0}
            role="region"
            aria-label="Interactive modern clinic features carousel"
          >
            {/* 3D Stacked Layered Cards Flanking the Active Card (Matches Reference Image) */}
            {/* Left Stacked Card - Layer 2 */}
            <div
              aria-hidden="true"
              className="absolute inset-0 rounded-[28px] sm:rounded-[32px] bg-white/45 backdrop-blur-sm border border-white/60 shadow-xs pointer-events-none transition-all duration-300"
              style={{
                transform: 'translateX(-34px) scale(0.88) rotate(-4deg)',
                transformOrigin: 'bottom center',
                zIndex: 8,
              }}
            />
            {/* Left Stacked Card - Layer 1 */}
            <div
              aria-hidden="true"
              className="absolute inset-0 rounded-[28px] sm:rounded-[32px] bg-white/70 backdrop-blur-md border border-white/80 shadow-sm pointer-events-none transition-all duration-300"
              style={{
                transform: 'translateX(-18px) scale(0.94) rotate(-2deg)',
                transformOrigin: 'bottom center',
                zIndex: 10,
              }}
            />
            {/* Right Stacked Card - Layer 2 */}
            <div
              aria-hidden="true"
              className="absolute inset-0 rounded-[28px] sm:rounded-[32px] bg-white/45 backdrop-blur-sm border border-white/60 shadow-xs pointer-events-none transition-all duration-300"
              style={{
                transform: 'translateX(34px) scale(0.88) rotate(4deg)',
                transformOrigin: 'bottom center',
                zIndex: 8,
              }}
            />
            {/* Right Stacked Card - Layer 1 */}
            <div
              aria-hidden="true"
              className="absolute inset-0 rounded-[28px] sm:rounded-[32px] bg-white/70 backdrop-blur-md border border-white/80 shadow-sm pointer-events-none transition-all duration-300"
              style={{
                transform: 'translateX(18px) scale(0.94) rotate(2deg)',
                transformOrigin: 'bottom center',
                zIndex: 10,
              }}
            />

            {/* Active Front Card with Framer Motion Swipe & Gestures */}
            <AnimatePresence initial={false} custom={direction} mode="popLayout">
              <motion.div
                key={activeIndex}
                custom={direction}
                variants={{
                  enter: (dir) => shouldReduceMotion ? { opacity: 0 } : ({
                    x: dir > 0 ? 140 : -140,
                    opacity: 0,
                    scale: 0.92,
                    rotate: dir > 0 ? 3 : -3,
                  }),
                  center: {
                    x: 0,
                    opacity: 1,
                    scale: 1,
                    rotate: 0,
                    transition: shouldReduceMotion ? { duration: 0.15 } : {
                      x: { type: 'spring', stiffness: 350, damping: 28 },
                      opacity: { duration: 0.22 },
                      scale: { duration: 0.22 },
                    },
                  },
                  exit: (dir) => shouldReduceMotion ? { opacity: 0 } : ({
                    x: dir > 0 ? -220 : 220,
                    opacity: 0,
                    scale: 0.9,
                    rotate: dir > 0 ? -6 : 6,
                    transition: {
                      duration: 0.2,
                    },
                  }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.65}
                onDragStart={() => {
                  isDraggingRef.current = true;
                }}
                onDragEnd={(e, { offset, velocity }) => {
                  setTimeout(() => {
                    isDraggingRef.current = false;
                  }, 80);
                  const swipeThreshold = 40;
                  if (offset.x < -swipeThreshold || velocity.x < -250) {
                    handleNext();
                  } else if (offset.x > swipeThreshold || velocity.x > 250) {
                    handlePrev();
                  }
                }}
                className="absolute inset-0 bg-white/90 backdrop-blur-xl rounded-[28px] sm:rounded-[32px] border border-white/95 shadow-[0_20px_50px_rgba(8,112,184,0.12)] p-4 sm:p-6 flex flex-col justify-between cursor-grab active:cursor-grabbing select-none z-20"
              >
                <div>
                  {/* Card Header Row: Feature Number Indicator & Floating Specialty Icon */}
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    {/* Feature Number Indicator: 01 / 06 */}
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-extrabold text-[11px] sm:text-xs tracking-wider">
                      {`${currentFeature.tag} / 0${features.length}`}
                    </span>

                    {/* Floating Specialty Icon Container */}
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl ${currentFeature.theme.floatingPill} flex items-center justify-center shadow-xs`}>
                      <FloatingIconComponent className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Feature Title */}
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-1 leading-snug">
                    {currentFeature.title}
                  </h3>

                  {/* Short Description */}
                  <p className="text-xs sm:text-[13px] text-slate-500 leading-relaxed font-normal">
                    {currentFeature.desc}
                  </p>
                </div>

                {/* Center 3D Vector Illustration */}
                <div className="my-auto py-1">
                  {currentFeature.graphic}
                </div>

                {/* Card Bottom Row: Circular Blue Next Action Button */}
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isDraggingRef.current) return;
                      handleNext();
                    }}
                    aria-label="Advance to next feature"
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#0070F3] hover:bg-blue-600 text-white flex items-center justify-center transition-all shadow-md shadow-blue-500/30 active:scale-90 cursor-pointer"
                  >
                    <ArrowRight size={18} />
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right Navigation: Circular Blue Gradient Button */}
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next feature"
            className="w-9 h-9 min-[360px]:w-10 min-[360px]:h-10 sm:w-12 sm:h-12 rounded-full bg-[#0070F3] hover:bg-blue-600 shadow-md shadow-blue-500/30 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shrink-0 z-30 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <ArrowRight size={18} className="text-white" />
          </button>
        </div>

        {/* ── 3. PAGINATION DOTS (Direct Tappable Indicators) ── */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-6 sm:mb-8" role="tablist" aria-label="Feature progression">
          {features.map((feat, i) => (
            <button
              key={feat.id}
              type="button"
              role="tab"
              aria-selected={i === activeIndex}
              aria-label={`Jump to feature ${i + 1}: ${feat.title}`}
              onClick={() => handleSelectFeature(i)}
              className={`transition-all duration-300 rounded-full h-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                i === activeIndex
                  ? 'w-6 bg-blue-600 shadow-sm shadow-blue-500/30'
                  : 'w-2 bg-blue-200 hover:bg-blue-300'
              }`}
            />
          ))}
        </div>

        {/* ── 4. FEATURE CATEGORY GRID (Interactive 2-Row x 3-Column on Mobile, Balanced on Desktop) ── */}
        <div className="max-w-md sm:max-w-xl lg:max-w-4xl mx-auto mb-6 sm:mb-8">
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
            {features.map((feat, i) => {
              const isActive = i === activeIndex;
              return (
                <button
                  key={feat.id}
                  type="button"
                  onClick={() => handleSelectFeature(i)}
                  aria-label={`View feature: ${feat.title}`}
                  aria-pressed={isActive}
                  className={`flex flex-col items-center justify-center p-2.5 sm:p-3.5 rounded-2xl transition-all duration-200 text-center select-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 active:scale-95 ${
                    isActive
                      ? 'bg-gradient-to-b from-blue-50/95 to-sky-50/60 border-2 border-blue-500 shadow-md shadow-blue-500/15 scale-[1.02]'
                      : 'bg-white/80 hover:bg-white border border-slate-200/80 shadow-xs hover:shadow-md'
                  }`}
                >
                  {/* Category Tile Icon */}
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mb-1.5 transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30 scale-105'
                      : `${feat.bgIcon} ${feat.activeColor}`
                  }`}>
                    {feat.icon}
                  </div>
                  {/* Category Title */}
                  <span className={`text-[11px] sm:text-xs font-bold leading-tight ${
                    isActive ? 'text-blue-700 font-black' : 'text-slate-700'
                  }`}>
                    {feat.shortTitle}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 5. EXPLORE ALL FEATURES CTA (Vibrant Blue Full-Width/Prominent Pill) ── */}
        <div className="max-w-xs min-[360px]:max-w-sm sm:max-w-md mx-auto">
          <button
            type="button"
            onClick={handleExploreClick}
            className="w-full min-h-[48px] py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#0070F3] via-blue-600 to-[#0052cc] hover:from-blue-600 hover:to-blue-700 text-white font-black text-sm sm:text-base shadow-lg shadow-blue-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            <span>Explore All Features</span>
            <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
          </button>
        </div>

      </div>
    </section>
  );
}
