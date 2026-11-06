import React, { useState, useRef } from 'react';
import { 
  Sparkles, Calendar, Users, ShieldCheck, BarChart3, Cloud, 
  ArrowRight, ArrowLeft 
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

// ============================================================
// 3D Healthcare Vector Illustrations (Bespoke, High-Fidelity SVGs)
// ============================================================

// 1. AI-Powered Workflows: Adorable 3D Robot Doctor with Medical Clipboard & Sparkles
function AiWorkflowsGraphic() {
  return (
    <div className="relative w-full h-32 sm:h-36 flex items-center justify-center my-2 pointer-events-none select-none">
      <svg width="160" height="120" viewBox="0 0 160 120" fill="none" className="drop-shadow-md">
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
          <filter id="aiGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Soft ground shadow */}
        <ellipse cx="80" cy="112" rx="36" ry="6" fill="#0284C7" fillOpacity="0.15" />

        {/* Ambient sparkle glow */}
        <circle cx="134" cy="30" r="14" fill="#38BDF8" fillOpacity="0.15" filter="url(#aiGlow)" />

        {/* Robot Head Antenna */}
        <line x1="80" y1="18" x2="80" y2="28" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="80" cy="16" r="4" fill="#0284C7" stroke="#38BDF8" strokeWidth="1.5" />

        {/* Ears / Side Sensors */}
        <rect x="50" y="40" width="6" height="14" rx="3" fill="#0284C7" />
        <rect x="104" y="40" width="6" height="14" rx="3" fill="#0284C7" />

        {/* Robot Head Shell */}
        <rect x="54" y="26" width="52" height="42" rx="16" fill="url(#robotBodyGrad)" stroke="#BAE6FD" strokeWidth="2" />
        {/* Gloss highlight on top of head */}
        <path d="M64 30 C72 28 88 28 96 30" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity="0.9" />

        {/* Visor Screen */}
        <rect x="62" y="34" width="36" height="24" rx="8" fill="url(#robotVisorGrad)" stroke="#334155" strokeWidth="1" />
        {/* Visor Glowing Eyes */}
        <ellipse cx="71" cy="45" rx="3.5" ry="4.5" fill="#38BDF8" filter="url(#aiGlow)" />
        <ellipse cx="89" cy="45" rx="3.5" ry="4.5" fill="#38BDF8" filter="url(#aiGlow)" />
        <circle cx="72.5" cy="43.5" r="1.2" fill="#FFFFFF" />
        <circle cx="90.5" cy="43.5" r="1.2" fill="#FFFFFF" />
        {/* Happy smile line */}
        <path d="M77 50 Q 80 52 83 50" stroke="#38BDF8" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />

        {/* Robot Body / Coat */}
        <rect x="60" y="66" width="40" height="38" rx="10" fill="url(#robotBodyGrad)" stroke="#BAE6FD" strokeWidth="2" />
        {/* Doctor Stethoscope */}
        <path d="M66 68 C66 82, 94 82, 94 68" stroke="#0284C7" strokeWidth="2" fill="none" strokeLinecap="round" />
        <circle cx="80" cy="82" r="3.5" fill="#38BDF8" stroke="#0284C7" strokeWidth="1" />

        {/* 3D Medical Clipboard in Robot's Arm */}
        <g transform="rotate(6 100 56)">
          <rect x="94" y="52" width="42" height="52" rx="7" fill="url(#boardGrad)" stroke="#7DD3FC" strokeWidth="2" />
          {/* Top blue clip */}
          <rect x="106" y="47" width="18" height="9" rx="3" fill="#0070F3" />
          <circle cx="115" cy="51" r="1.5" fill="#FFFFFF" />
          {/* Medical Cross Badge */}
          <rect x="112" y="62" width="6" height="16" rx="1.5" fill="#0070F3" />
          <rect x="107" y="67" width="16" height="6" rx="1.5" fill="#0070F3" />
          {/* Checklist Lines */}
          <rect x="102" y="84" width="26" height="2.5" rx="1.2" fill="#94A3B8" />
          <rect x="102" y="90" width="20" height="2.5" rx="1.2" fill="#CBD5E1" />
        </g>

        {/* Floating AI Sparkles */}
        <path d="M136 22 L138 28 L144 30 L138 32 L136 38 L134 32 L128 30 L134 28 Z" fill="#38BDF8" />
        <path d="M26 44 L27.5 48 L31.5 49.5 L27.5 51 L26 55 L24.5 51 L20.5 49.5 L24.5 48 Z" fill="#818CF8" />
        <circle cx="34" cy="32" r="2" fill="#38BDF8" opacity="0.7" />
        <circle cx="140" cy="52" r="2" fill="#818CF8" opacity="0.6" />
      </svg>
    </div>
  );
}

// 2. End-to-End Management: 3D Calendar, Schedule Grid & Clock Sync
function EndToEndGraphic() {
  return (
    <div className="relative w-full h-32 sm:h-36 flex items-center justify-center my-2 pointer-events-none select-none">
      <svg width="160" height="120" viewBox="0 0 160 120" fill="none" className="drop-shadow-md">
        <defs>
          <linearGradient id="calHeaderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="100%" stopColor="#6366F1" />
          </linearGradient>
          <linearGradient id="clockFaceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#EEF2FF" />
          </linearGradient>
        </defs>

        {/* Soft ground shadow */}
        <ellipse cx="80" cy="112" rx="44" ry="6" fill="#4F46E5" fillOpacity="0.12" />

        {/* Layered calendar backing plate */}
        <rect x="36" y="24" width="76" height="80" rx="12" fill="#EEF2FF" transform="rotate(-3 36 24)" />

        {/* Main 3D Calendar Body */}
        <rect x="32" y="20" width="84" height="82" rx="12" fill="#FFFFFF" stroke="#C7D2FE" strokeWidth="2" />

        {/* Top Binder Header */}
        <path d="M32 32 C32 25.37 37.37 20 44 20 H104 C110.63 20 116 25.37 116 32 V36 H32 V32 Z" fill="url(#calHeaderGrad)" />
        {/* Binder Rings */}
        <circle cx="48" cy="18" r="3.5" fill="#FFFFFF" stroke="#818CF8" strokeWidth="1.5" />
        <circle cx="74" cy="18" r="3.5" fill="#FFFFFF" stroke="#818CF8" strokeWidth="1.5" />
        <circle cx="100" cy="18" r="3.5" fill="#FFFFFF" stroke="#818CF8" strokeWidth="1.5" />

        {/* Calendar Grid Slots */}
        {/* Row 1 */}
        <rect x="42" y="44" width="18" height="14" rx="3.5" fill="#EEF2FF" stroke="#C7D2FE" />
        <rect x="65" y="44" width="18" height="14" rx="3.5" fill="#EEF2FF" stroke="#C7D2FE" />
        <rect x="88" y="44" width="18" height="14" rx="3.5" fill="#DBEAFE" stroke="#60A5FA" />
        <path d="M94 51 L96.5 53.5 L101.5 48.5" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />

        {/* Row 2 */}
        <rect x="42" y="63" width="18" height="14" rx="3.5" fill="#EEF2FF" stroke="#C7D2FE" />
        <rect x="65" y="63" width="18" height="14" rx="3.5" fill="#DCFCE7" stroke="#86EFAC" />
        <path d="M71 70 L73.5 72.5 L78.5 67.5" stroke="#16A34A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="88" y="63" width="18" height="14" rx="3.5" fill="#FEF3C7" stroke="#FCD34D" />

        {/* Row 3 */}
        <rect x="42" y="82" width="18" height="12" rx="3.5" fill="#EEF2FF" stroke="#C7D2FE" />
        <rect x="65" y="82" width="18" height="12" rx="3.5" fill="#EEF2FF" stroke="#C7D2FE" />
        <rect x="88" y="82" width="18" height="12" rx="3.5" fill="#EEF2FF" stroke="#C7D2FE" />

        {/* 3D Round Clock floating on top-right */}
        <g transform="translate(104, 32)">
          <circle cx="18" cy="18" r="18" fill="url(#clockFaceGrad)" stroke="#818CF8" strokeWidth="2.5" />
          <circle cx="18" cy="18" r="15" fill="#FFFFFF" />
          {/* Hour & Minute Hands at 10:10 */}
          <line x1="18" y1="18" x2="18" y2="9" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" />
          <line x1="18" y1="18" x2="25" y2="14" stroke="#6366F1" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="18" cy="18" r="2.2" fill="#4F46E5" />
          {/* Tick marks */}
          <circle cx="18" cy="5" r="1" fill="#A5B4FC" />
          <circle cx="31" cy="18" r="1" fill="#A5B4FC" />
          <circle cx="18" cy="31" r="1" fill="#A5B4FC" />
          <circle cx="5" cy="18" r="1" fill="#A5B4FC" />
        </g>
      </svg>
    </div>
  );
}

// 3. Better Patient Experience: 3D Digital Health Profile Card, Avatar & Message
function PatientExperienceGraphic() {
  return (
    <div className="relative w-full h-32 sm:h-36 flex items-center justify-center my-2 pointer-events-none select-none">
      <svg width="160" height="120" viewBox="0 0 160 120" fill="none" className="drop-shadow-md">
        <defs>
          <linearGradient id="patientCardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#FAF5FF" />
          </linearGradient>
          <linearGradient id="avatarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A855F7" />
            <stop offset="100%" stopColor="#7E22CE" />
          </linearGradient>
        </defs>

        {/* Soft ground shadow */}
        <ellipse cx="80" cy="112" rx="44" ry="6" fill="#9333EA" fillOpacity="0.12" />

        {/* 3D Main Health Card */}
        <rect x="28" y="20" width="104" height="80" rx="14" fill="url(#patientCardGrad)" stroke="#DDD6FE" strokeWidth="2" />

        {/* Circular Avatar Frame */}
        <circle cx="54" cy="46" r="15" fill="#F3E8FF" stroke="#C084FC" strokeWidth="1.5" />
        {/* Avatar Silhouette */}
        <circle cx="54" cy="42" r="6.5" fill="url(#avatarGrad)" />
        <path d="M44 56 C44 51 49 50 54 50 C59 50 64 51 64 56" fill="url(#avatarGrad)" />
        {/* Active Online Indicator */}
        <circle cx="65" cy="56" r="4" fill="#22C55E" stroke="#FFFFFF" strokeWidth="1.5" />

        {/* Patient Info Bars */}
        <rect x="76" y="38" width="46" height="5" rx="2.5" fill="#7C3AED" />
        <rect x="76" y="47" width="34" height="4" rx="2" fill="#C4B5FD" />
        <rect x="76" y="55" width="24" height="3" rx="1.5" fill="#E9D5FF" />

        {/* ECG / Vitals Pulse Wave */}
        <path d="M38 78 H54 L58 71 L63 85 L68 73 L72 78 H120" stroke="#A855F7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Floating 3D Instant Message Pill */}
        <g transform="translate(82, 74)">
          <rect x="0" y="0" width="58" height="22" rx="11" fill="#FFFFFF" stroke="#C084FC" strokeWidth="1.5" />
          <circle cx="10" cy="11" r="3" fill="#22C55E" />
          <rect x="18" y="9.5" width="30" height="3" rx="1.5" fill="#9333EA" />
        </g>

        {/* Heart Sparkle */}
        <path d="M136 28 C136 24 142 22 144 26 C146 22 152 24 152 28 C152 34 144 38 144 38 C144 38 136 34 136 28 Z" fill="#F43F5E" opacity="0.8" />
      </svg>
    </div>
  );
}

// 4. Secure & Compliant: 3D Mint/Emerald Shield with Checkmark & Cyan Padlock
function SecureCompliantGraphic() {
  return (
    <div className="relative w-full h-32 sm:h-36 flex items-center justify-center my-2 pointer-events-none select-none">
      <svg width="160" height="120" viewBox="0 0 160 120" fill="none" className="drop-shadow-md">
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
        <ellipse cx="80" cy="112" rx="44" ry="6" fill="#059669" fillOpacity="0.12" />

        {/* Cloud backing */}
        <path d="M96 38 C96 30 106 28 112 33 C118 29 128 33 128 41 C135 43 136 53 128 58 H96 Z" fill="#D1FAE5" opacity="0.8" />

        {/* 3D Emerald Shield Outer Body */}
        <path d="M68 18 L104 32 V62 C104 84 68 100 68 100 C68 100 32 84 32 62 V32 L68 18 Z" fill="url(#shieldGrad)" stroke="#34D399" strokeWidth="2" />

        {/* Shield Inner Face */}
        <path d="M68 25 L97 36 V61 C97 78 68 91 68 91 C68 91 39 78 39 61 V36 L68 25 Z" fill="#FFFFFF" />

        {/* Center Checkmark Circle Badge */}
        <circle cx="68" cy="56" r="16" fill="#ECFDF5" stroke="#A7F3D0" strokeWidth="1.5" />
        <path d="M60 56 L66 62 L77 49" stroke="#059669" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* 3D Cyan Padlock on right side */}
        <g transform="translate(100, 48)">
          {/* Metallic Shackle */}
          <path d="M9 10 V5 C9 1.5 17 1.5 17 5 V10" stroke="#0284C7" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          {/* Padlock Body */}
          <rect x="2" y="9" width="22" height="20" rx="5" fill="url(#padlockGrad)" stroke="#38BDF8" strokeWidth="1.5" />
          {/* Keyhole */}
          <circle cx="13" cy="17" r="2" fill="#FFFFFF" />
          <path d="M13 18 V22" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
        </g>

        {/* Compliance Sparkle */}
        <path d="M26 34 L27.5 38 L31.5 39.5 L27.5 41 L26 45 L24.5 41 L20.5 39.5 L24.5 38 Z" fill="#34D399" />
      </svg>
    </div>
  );
}

// 5. Actionable Insights: 3D Golden/Orange Bar Chart with Isometric Depth & Upward Arrow
function ActionableInsightsGraphic() {
  return (
    <div className="relative w-full h-32 sm:h-36 flex items-center justify-center my-2 pointer-events-none select-none">
      <svg width="160" height="120" viewBox="0 0 160 120" fill="none" className="drop-shadow-md">
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
        <ellipse cx="80" cy="112" rx="44" ry="6" fill="#EA580C" fillOpacity="0.12" />

        {/* 3D Report Backplate */}
        <rect x="28" y="20" width="104" height="82" rx="12" fill="#FFFFFF" stroke="#FED7AA" strokeWidth="2" />
        {/* Horizontal grid lines */}
        <line x1="38" y1="42" x2="122" y2="42" stroke="#FFF7ED" strokeWidth="1.5" strokeDasharray="3 3" />
        <line x1="38" y1="62" x2="122" y2="62" stroke="#FFF7ED" strokeWidth="1.5" strokeDasharray="3 3" />
        <line x1="38" y1="82" x2="122" y2="82" stroke="#FFF7ED" strokeWidth="1.5" />

        {/* 3D Vertical Columns */}
        {/* Bar 1 */}
        <rect x="42" y="70" width="14" height="24" rx="4" fill="#FFEDD5" stroke="#FED7AA" />
        {/* Bar 2 */}
        <rect x="62" y="56" width="14" height="38" rx="4" fill="#FED7AA" stroke="#FDBA74" />
        {/* Bar 3 */}
        <rect x="82" y="44" width="14" height="50" rx="4" fill="#FDBA74" stroke="#FB923C" />
        {/* Bar 4 */}
        <rect x="102" y="30" width="14" height="64" rx="4" fill="url(#barGrad4)" stroke="#EA580C" />

        {/* 3D Upward Curved Growth Trendline */}
        <path d="M46 68 C62 58, 80 44, 116 22" stroke="url(#arrowGrad)" strokeWidth="4" strokeLinecap="round" />
        {/* Arrow Tip */}
        <polygon points="108,18 122,20 116,32" fill="#EA580C" />

        {/* Growth badge pill */}
        <g transform="translate(112, 10)">
          <circle cx="10" cy="10" r="10" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.5" />
          <path d="M7 11 L10 7 L13 11" stroke="#D97706" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}

// 6. Access Anywhere: 3D Cloud, Smartphone & Floating Medical Sheet
function AccessAnywhereGraphic() {
  return (
    <div className="relative w-full h-32 sm:h-36 flex items-center justify-center my-2 pointer-events-none select-none">
      <svg width="160" height="120" viewBox="0 0 160 120" fill="none" className="drop-shadow-md">
        <defs>
          <linearGradient id="cloudGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFE4E6" />
            <stop offset="100%" stopColor="#FDA4AF" />
          </linearGradient>
        </defs>

        {/* Soft ground shadow */}
        <ellipse cx="80" cy="112" rx="44" ry="6" fill="#E11D48" fillOpacity="0.12" />

        {/* 3D Cloud in background */}
        <path d="M88 42 C88 33 100 28 108 34 C114 30 126 34 126 42 C134 44 136 54 128 60 H88 C80 60 78 50 84 46 C82 43 84 42 88 42 Z" fill="url(#cloudGrad)" opacity="0.85" />

        {/* 3D Smartphone Device */}
        <rect x="46" y="20" width="56" height="84" rx="12" fill="#FFFFFF" stroke="#FECDD3" strokeWidth="2" />
        {/* Smartphone Screen */}
        <rect x="50" y="28" width="48" height="66" rx="6" fill="#FFF1F2" />
        {/* Speaker notch */}
        <rect x="68" y="24" width="12" height="2" rx="1" fill="#FDA4AF" />
        {/* Home indicator button */}
        <circle cx="74" cy="98" r="2.5" fill="#E11D48" />

        {/* Mini UI on Phone Screen */}
        <rect x="54" y="34" width="40" height="18" rx="4" fill="#FFFFFF" stroke="#FECDD3" />
        <circle cx="62" cy="43" r="4" fill="#F43F5E" />
        <rect x="70" y="40" width="20" height="2.5" rx="1.2" fill="#E11D48" />
        <rect x="70" y="45" width="14" height="2" rx="1" fill="#FDA4AF" />
        {/* Pulse line on phone */}
        <path d="M54 62 H62 L65 57 L68 67 L71 60 L74 62 H86" stroke="#E11D48" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Floating Prescription / Sheet overlapping phone */}
        <g transform="translate(86, 52) rotate(4)">
          <rect x="0" y="0" width="42" height="48" rx="6" fill="#FFFFFF" stroke="#FDA4AF" strokeWidth="1.5" />
          {/* Rx badge */}
          <rect x="8" y="8" width="10" height="10" rx="2" fill="#FFF1F2" />
          <path d="M11 11 L15 15 M15 11 L11 15" stroke="#E11D48" strokeWidth="1.5" strokeLinecap="round" />
          {/* Document lines */}
          <rect x="22" y="10" width="14" height="2.5" rx="1.2" fill="#E11D48" />
          <rect x="8" y="24" width="26" height="2" rx="1" fill="#CBD5E1" />
          <rect x="8" y="30" width="20" height="2" rx="1" fill="#CBD5E1" />
          <rect x="8" y="36" width="24" height="2" rx="1" fill="#CBD5E1" />
        </g>

        {/* Wi-Fi / Sync Waves */}
        <path d="M30 46 C34 42, 40 42, 44 46" stroke="#FB7185" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        <path d="M33 51 C35 48, 39 48, 41 51" stroke="#FB7185" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        <circle cx="37" cy="56" r="1.5" fill="#E11D48" />
      </svg>
    </div>
  );
}

// 7. Charming Modern Clinic Building Graphic (For Tablet Bottom Banner)
function ClinicBuildingGraphic() {
  return (
    <div className="w-24 h-20 sm:w-28 sm:h-22 shrink-0 pointer-events-none select-none flex items-center justify-center">
      <svg width="110" height="85" viewBox="0 0 110 85" fill="none" className="drop-shadow-sm">
        {/* Green grass lawn base */}
        <path d="M8 72 Q 55 76 102 72 L102 82 L8 82 Z" fill="#DCFCE7" />
        {/* Entrance stone pathway */}
        <polygon points="46,82 50,68 60,68 64,82" fill="#F1F5F9" stroke="#E2E8F0" />

        {/* Left manicured round tree */}
        <rect x="18" y="60" width="4" height="14" fill="#92400E" rx="1" />
        <circle cx="20" cy="54" r="11" fill="#22C55E" />
        <circle cx="20" cy="52" r="8" fill="#4ADE80" opacity="0.6" />

        {/* Right manicured round tree */}
        <rect x="88" y="60" width="4" height="14" fill="#92400E" rx="1" />
        <circle cx="90" cy="54" r="11" fill="#22C55E" />
        <circle cx="90" cy="52" r="8" fill="#4ADE80" opacity="0.6" />

        {/* Main Clinic Building Facade */}
        <rect x="28" y="34" width="54" height="36" rx="4" fill="#FFFFFF" stroke="#BAE6FD" strokeWidth="1.5" />
        {/* Classic Blue Clinic Canopy / Roof */}
        <rect x="24" y="30" width="62" height="7" rx="2" fill="#0070F3" />

        {/* Pediment Roof Crown with Medical Cross */}
        <rect x="44" y="16" width="22" height="15" rx="3" fill="#FFFFFF" stroke="#BAE6FD" strokeWidth="1.5" />
        {/* Blue Cross on roof */}
        <rect x="53" y="19" width="4" height="9" rx="1" fill="#0070F3" />
        <rect x="50.5" y="21.5" width="9" height="4" rx="1" fill="#0070F3" />

        {/* Double Glass Entrance Doors */}
        <rect x="48" y="48" width="14" height="22" rx="2" fill="#E0F2FE" stroke="#38BDF8" strokeWidth="1" />
        <line x1="55" y1="48" x2="55" y2="70" stroke="#38BDF8" strokeWidth="1" />

        {/* Left Windows */}
        <rect x="32" y="44" width="12" height="12" rx="2" fill="#EFF6FF" stroke="#BAE6FD" strokeWidth="1" />
        {/* Right Windows */}
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

  const features = [
    {
      id: 'ai-workflows',
      tag: '01',
      title: 'AI-Powered Workflows',
      shortTitle: 'AI Workflows',
      desc: 'Automate OPD, prescriptions, follow-ups and more.',
      icon: <Sparkles className="w-6 h-6 text-blue-600" />,
      bgIcon: 'bg-blue-50 text-blue-600 border border-blue-100',
      activeColor: 'text-blue-600',
      cardAccent: 'border-blue-200/90',
      stackBorder: 'border-blue-200/80',
      graphic: <AiWorkflowsGraphic />,
    },
    {
      id: 'end-to-end',
      tag: '02',
      title: 'End-to-End Management',
      shortTitle: 'End-to-End',
      desc: 'OPD, IPD, Lab, Pharmacy, Billing, Inventory — all in one place.',
      icon: <Calendar className="w-6 h-6 text-indigo-600" />,
      bgIcon: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
      activeColor: 'text-indigo-600',
      cardAccent: 'border-indigo-200/90',
      stackBorder: 'border-indigo-200/80',
      graphic: <EndToEndGraphic />,
    },
    {
      id: 'patient-exp',
      tag: '03',
      title: 'Better Patient Experience',
      shortTitle: 'Patient Experience',
      desc: 'Faster service, digital records and seamless communication.',
      icon: <Users className="w-6 h-6 text-purple-600" />,
      bgIcon: 'bg-purple-50 text-purple-600 border border-purple-100',
      activeColor: 'text-purple-600',
      cardAccent: 'border-purple-200/90',
      stackBorder: 'border-purple-200/80',
      graphic: <PatientExperienceGraphic />,
    },
    {
      id: 'security-compliant',
      tag: '04',
      title: 'Secure & Compliant',
      shortTitle: 'Secure & Compliant',
      desc: 'Built for Indian healthcare standards with enterprise-grade security.',
      icon: <ShieldCheck className="w-6 h-6 text-emerald-600" />,
      bgIcon: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
      activeColor: 'text-emerald-600',
      cardAccent: 'border-emerald-200/90',
      stackBorder: 'border-emerald-200/80',
      graphic: <SecureCompliantGraphic />,
    },
    {
      id: 'insights',
      tag: '05',
      title: 'Actionable Insights',
      shortTitle: 'Actionable Insights',
      desc: 'Real-time reports to help you grow your practice.',
      icon: <BarChart3 className="w-6 h-6 text-amber-600" />,
      bgIcon: 'bg-amber-50 text-amber-600 border border-amber-100',
      activeColor: 'text-amber-600',
      cardAccent: 'border-amber-200/90',
      stackBorder: 'border-amber-200/80',
      graphic: <ActionableInsightsGraphic />,
    },
    {
      id: 'access-anywhere',
      tag: '06',
      title: 'Access Anywhere',
      shortTitle: 'Access Anywhere',
      desc: 'Web, tablet and mobile — your clinic in your pocket.',
      icon: <Cloud className="w-6 h-6 text-rose-600" />,
      bgIcon: 'bg-rose-50 text-rose-600 border border-rose-100',
      activeColor: 'text-rose-600',
      cardAccent: 'border-rose-200/90',
      stackBorder: 'border-rose-200/80',
      graphic: <AccessAnywhereGraphic />,
    },
  ];

  const handleNext = () => {
    setDirection(1);
    setActiveIndex((prev) => (prev + 1) % features.length);
  };

  const handlePrev = () => {
    setDirection(-1);
    setActiveIndex((prev) => (prev - 1 + features.length) % features.length);
  };

  const handleExploreClick = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (onExploreFeatures) {
      onExploreFeatures();
    } else {
      const el = document.getElementById('solutions');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const currentFeature = features[activeIndex];

  // Dynamic stack layers behind the active card showing hints of next cards
  const stackLayers = [
    {
      rotate: '3deg',
      scale: 0.96,
      translateX: '6px',
      translateY: '6px',
      zIndex: 10,
      borderColor: features[(activeIndex + 1) % features.length].stackBorder,
    },
    {
      rotate: '6deg',
      scale: 0.92,
      translateX: '12px',
      translateY: '11px',
      zIndex: 9,
      borderColor: features[(activeIndex + 2) % features.length].stackBorder,
    },
    {
      rotate: '9deg',
      scale: 0.88,
      translateX: '18px',
      translateY: '16px',
      zIndex: 8,
      borderColor: features[(activeIndex + 3) % features.length].stackBorder,
    },
  ];

  return (
    <section 
      id="features" 
      className="py-14 sm:py-18 lg:py-24 bg-gradient-to-b from-white via-sky-50/20 to-white relative border-t border-slate-100 overflow-hidden"
    >
      {/* Ambient pale-blue background decorative gradient glow */}
      <div className="absolute top-1/4 -left-32 w-80 h-80 bg-blue-100/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-32 w-80 h-80 bg-sky-100/50 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 relative z-10">

        {/* ── 1. DESKTOP VIEW (≥ 1024px): Strictly Preserved ── */}
        <div className="modern-clinic-desktop">
          {/* Section Header Row */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 sm:mb-12 gap-4">
            <div>
              {/* Eyebrow Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[11px] font-black uppercase tracking-wider mb-3">
                <span>WHY AI-CMS</span>
              </div>

              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                Everything You Need to Run a{' '}
                <span className="text-blue-600">Modern Clinic</span>
              </h2>
              <p className="text-sm sm:text-base text-slate-500 mt-2 max-w-2xl font-normal">
                A complete, integrated and intelligent platform for today's healthcare providers.
              </p>
            </div>

            <a
              href="#solutions"
              onClick={handleExploreClick}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700 transition shrink-0 group cursor-pointer"
            >
              <span>Explore All Features</span>
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </a>
          </div>

          {/* 6 Feature Cards Grid (6 in 1 row on Desktop) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-4.5">
            {features.map((feat, index) => (
              <motion.div
                key={feat.id}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.35, delay: index * 0.05 }}
                className="bg-[#F8FAFC]/90 hover:bg-white border border-slate-200/80 hover:border-blue-200 rounded-2xl p-4.5 sm:p-5 flex flex-col items-center text-center shadow-xs hover:shadow-lg transition-all duration-300 group"
              >
                <div className={`w-12 h-12 rounded-2xl ${feat.bgIcon} flex items-center justify-center mb-3.5 group-hover:scale-105 transition-transform shadow-xs`}>
                  {feat.icon}
                </div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-1.5 leading-snug">
                  {feat.title}
                </h3>
                <p className="text-[12px] text-slate-500 leading-relaxed font-normal">
                  {feat.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── 2. MEDIUM-SCREEN VIEW (768px to 1023px): Intentional Balanced Tablet Grid ── */}
        <div className="modern-clinic-tablet">
          {/* Centered Heading with Hand-Drawn Annotation */}
          <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10 relative">
            {/* Top Eyebrow Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[11px] font-black uppercase tracking-wider mb-3">
              <span>WHY AI-CMS</span>
            </div>

            {/* Playful Top-Right Hand-Drawn Annotation */}
            <div className="hidden sm:flex absolute right-0 top-0 items-center gap-1.5 text-blue-600/90 text-xs font-semibold select-none">
              <span>One Platform for Complete Clinic Care</span>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="rotate-45">
                <path d="M4 8C8 14 14 18 20 18M20 18L15 17M20 18L19 13" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-snug">
              Everything You Need to Run a{' '}
              <span className="text-blue-600">Modern Clinic</span>
            </h2>
            <p className="text-sm sm:text-base text-slate-500 mt-2 font-normal">
              A complete, integrated and intelligent platform for today's healthcare providers.
            </p>
          </div>

          {/* 2-Column (or 3-Column on wider tablet) Rich Feature Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5 mb-8">
            {features.map((feat) => (
              <div
                key={feat.id}
                className={`bg-white rounded-2xl sm:rounded-3xl border ${feat.cardAccent} hover:border-blue-300 p-5 sm:p-6 flex flex-col justify-between h-full shadow-xs hover:shadow-lg transition-all duration-300 group relative overflow-hidden`}
              >
                <div>
                  {/* Card Header: Tag '01' + Category Icon Badge */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 font-bold text-xs tracking-wider">
                      {feat.tag}
                    </span>
                    <div className={`w-10 h-10 rounded-xl ${feat.bgIcon} flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs`}>
                      {React.cloneElement(feat.icon, { className: 'w-5 h-5' })}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors mb-1.5 leading-snug">
                    {feat.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-normal">
                    {feat.desc}
                  </p>
                </div>

                {/* Rich 3D Healthcare Graphic */}
                <div className="group-hover:scale-105 transition-transform duration-300">
                  {feat.graphic}
                </div>

                {/* Bottom Row: Circular Blue Forward Action Button */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleExploreClick}
                    aria-label={`Explore ${feat.title}`}
                    className="w-9 h-9 rounded-full bg-blue-50 group-hover:bg-[#0070F3] text-blue-600 group-hover:text-white flex items-center justify-center transition-all duration-200 shadow-xs active:scale-95"
                  >
                    <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Connected Clinic Banner & Primary CTA */}
          <div className="bg-gradient-to-r from-blue-50/80 via-sky-50/60 to-indigo-50/80 border border-blue-100/90 rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3 sm:gap-4 text-center sm:text-left">
              <ClinicBuildingGraphic />
              <div>
                <p className="text-xs sm:text-sm font-semibold text-blue-900 leading-tight">
                  All the tools you need in one connected platform
                </p>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                  Designed for small clinics, multi-specialty centers, and growing practices.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExploreClick}
              className="w-full sm:w-auto py-3 px-6 rounded-2xl bg-[#0070F3] hover:bg-blue-600 text-white font-bold text-sm sm:text-base shadow-md shadow-blue-500/25 active:scale-95 transition flex items-center justify-center gap-2 group shrink-0 min-h-[44px]"
            >
              <span>Explore All Features</span>
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>

        {/* ── 3. MOBILE VIEW (< 768px): Swipeable 3D Card Deck Experience ── */}
        <div className="modern-clinic-mobile">
          {/* Centered Heading */}
          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[11px] font-black uppercase tracking-wider mb-2.5">
              <span>WHY AI-CMS</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              Everything You Need <br />
              to Run a <span className="text-blue-600">Modern Clinic</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2 font-normal max-w-xs mx-auto">
              A complete, integrated and intelligent platform for today's healthcare providers.
            </p>
          </div>

          {/* Hand-drawn Playful Micro-Annotation: "Swipe to explore features" */}
          <div className="flex items-center justify-center gap-1.5 text-blue-600/90 text-[11px] font-semibold mb-2 select-none">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="rotate-12">
              <path d="M4 6C8 12 14 16 20 18M20 18L15 17M20 18L19 13" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Swipe to explore features</span>
          </div>

          {/* Interactive Card Deck Container with Side Navigation Arrows */}
          <div className="relative flex items-center justify-center gap-1.5 min-[360px]:gap-2 sm:gap-3 mb-3">
            {/* Left Nav Arrow Button */}
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous feature"
              className="w-8 h-8 min-[360px]:w-10 min-[360px]:h-10 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 shadow-md flex items-center justify-center transition active:scale-95 shrink-0 z-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <ArrowLeft size={16} className="min-[360px]:w-[18px] min-[360px]:h-[18px]" />
            </button>

            {/* Swipeable Card Deck Container */}
            <div 
              className="relative w-full max-w-[222px] min-[360px]:max-w-[270px] min-[400px]:max-w-[300px] sm:max-w-[320px] h-[355px] min-[360px]:h-[370px] sm:h-[380px] touch-pan-y"
              tabIndex={0}
              role="region"
              aria-label="Swipeable Modern Clinic features card deck"
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') handleNext();
                if (e.key === 'ArrowLeft') handlePrev();
              }}
            >
              {/* Visual background stacked layers */}
              {stackLayers.map((layer, i) => (
                <div
                  key={i}
                  aria-hidden="true"
                  className={`absolute inset-0 rounded-3xl border bg-white/95 shadow-sm pointer-events-none transition-all duration-300 ${layer.borderColor}`}
                  style={{
                    transform: `translate(${layer.translateX}, ${layer.translateY}) rotate(${layer.rotate}) scale(${layer.scale})`,
                    transformOrigin: 'bottom center',
                    zIndex: layer.zIndex,
                  }}
                />
              ))}

              {/* Active Top Card with Touch Drag/Swipe Support */}
              <AnimatePresence initial={false} custom={direction} mode="popLayout">
                <motion.div
                  key={activeIndex}
                  custom={direction}
                  variants={{
                    enter: (dir) => shouldReduceMotion ? { opacity: 0 } : ({
                      x: dir > 0 ? 120 : -120,
                      opacity: 0,
                      scale: 0.94,
                      rotate: dir > 0 ? 4 : -4,
                    }),
                    center: {
                      x: 0,
                      opacity: 1,
                      scale: 1,
                      rotate: 0,
                      transition: shouldReduceMotion ? { duration: 0.15 } : {
                        x: { type: 'spring', stiffness: 350, damping: 28 },
                        opacity: { duration: 0.2 },
                        rotate: { duration: 0.2 },
                      },
                    },
                    exit: (dir) => shouldReduceMotion ? { opacity: 0 } : ({
                      x: dir > 0 ? -260 : 260,
                      opacity: 0,
                      scale: 0.9,
                      rotate: dir > 0 ? -10 : 10,
                      transition: {
                        x: { type: 'spring', stiffness: 300, damping: 25 },
                        opacity: { duration: 0.2 },
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
                  className="absolute inset-0 bg-white rounded-3xl border border-slate-200/90 shadow-xl p-3.5 min-[360px]:p-5 sm:p-6 flex flex-col justify-between cursor-grab active:cursor-grabbing select-none z-20"
                >
                  <div>
                    {/* Top Row: Tag '01 / 06' + Frosted Glass Icon Badge */}
                    <div className="flex items-center justify-between mb-2 min-[360px]:mb-3">
                      {/* Pill Badge: 01 / 06 */}
                      <span className="px-2 min-[360px]:px-2.5 py-0.5 min-[360px]:py-1 rounded-full bg-slate-100 text-slate-600 font-bold text-[11px] min-[360px]:text-xs tracking-wider">
                        {`${currentFeature.tag} / 0${features.length}`}
                      </span>

                      {/* Frosted Glass Category Badge */}
                      <div className={`w-8 h-8 min-[360px]:w-10 min-[360px]:h-10 rounded-xl min-[360px]:rounded-2xl ${currentFeature.bgIcon} flex items-center justify-center shadow-xs`}>
                        {React.cloneElement(currentFeature.icon, { className: 'w-4 h-4 min-[360px]:w-5 min-[360px]:h-5' })}
                      </div>
                    </div>

                    {/* Feature Title */}
                    <h3 className="text-[15px] min-[360px]:text-lg sm:text-xl font-black text-slate-900 mb-1 leading-snug">
                      {currentFeature.title}
                    </h3>

                    {/* Feature Description */}
                    <p className="text-[11px] min-[360px]:text-xs sm:text-[13px] text-slate-500 leading-relaxed font-normal">
                      {currentFeature.desc}
                    </p>
                  </div>

                  {/* 3D Healthcare Vector Illustration */}
                  <div className="my-auto">
                    {currentFeature.graphic}
                  </div>

                  {/* Bottom Row: Circular Solid Blue Action Arrow Button */}
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isDraggingRef.current) return;
                        handleNext();
                      }}
                      aria-label="Next feature"
                      className="w-9 h-9 min-[360px]:w-11 min-[360px]:h-11 rounded-full bg-[#0070F3] hover:bg-blue-600 text-white flex items-center justify-center transition-all shadow-md shadow-blue-500/25 active:scale-90"
                    >
                      <ArrowRight size={16} className="min-[360px]:w-[18px] min-[360px]:h-[18px]" />
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Right Nav Arrow Button */}
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next feature"
              className="w-8 h-8 min-[360px]:w-10 min-[360px]:h-10 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 shadow-md flex items-center justify-center transition active:scale-95 shrink-0 z-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <ArrowRight size={16} className="min-[360px]:w-[18px] min-[360px]:h-[18px]" />
            </button>
          </div>

          {/* Pagination Indicators (Tappable Dots) */}
          <div className="flex items-center justify-center gap-1.5 min-[360px]:gap-2 mt-2 min-[360px]:mt-3 mb-3 min-[360px]:mb-4" role="tablist" aria-label="Feature progress">
            {features.map((feat, i) => (
              <button
                key={feat.id}
                type="button"
                role="tab"
                aria-selected={i === activeIndex}
                aria-label={`Jump to feature ${i + 1}: ${feat.title}`}
                onClick={() => {
                  setDirection(i > activeIndex ? 1 : -1);
                  setActiveIndex(i);
                }}
                className={`transition-all duration-300 rounded-full h-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  i === activeIndex
                    ? 'w-6 bg-blue-600 shadow-sm shadow-blue-500/30'
                    : 'w-2 bg-blue-200 hover:bg-blue-300'
                }`}
              />
            ))}
          </div>

          {/* Compact Feature Overview (2-Row by 3-Column Dock) */}
          <div className="p-2 min-[360px]:p-3 sm:p-3.5 rounded-2xl bg-white/90 border border-blue-100/90 shadow-sm backdrop-blur-md mb-4">
            <div className="grid grid-cols-3 gap-1.5 min-[360px]:gap-2 sm:gap-2.5">
              {features.map((feat, i) => {
                const isActive = i === activeIndex;
                return (
                  <button
                    key={feat.id}
                    type="button"
                    onClick={() => {
                      setDirection(i > activeIndex ? 1 : -1);
                      setActiveIndex(i);
                    }}
                    aria-label={`Select ${feat.title}`}
                    aria-pressed={isActive}
                    className={`flex flex-col items-center justify-center p-1.5 min-[360px]:p-2 rounded-xl transition-all duration-200 text-center select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 active:scale-95 ${
                      isActive
                        ? 'bg-blue-50/95 border border-blue-300 shadow-xs'
                        : 'bg-white/60 hover:bg-white border border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div className={`w-7 h-7 min-[360px]:w-8 min-[360px]:h-8 rounded-lg flex items-center justify-center mb-1 min-[360px]:mb-1.5 transition-transform ${
                      isActive ? 'scale-105 bg-blue-600 text-white shadow-xs' : `${feat.bgIcon} ${feat.activeColor}`
                    }`}>
                      {React.cloneElement(feat.icon, { className: 'w-3.5 h-3.5 min-[360px]:w-4 min-[360px]:h-4' })}
                    </div>
                    <span className={`text-[10px] min-[360px]:text-[11px] font-semibold leading-tight line-clamp-2 max-w-[85px] ${
                      isActive ? 'text-blue-700 font-bold' : 'text-slate-600'
                    }`}>
                      {feat.shortTitle}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile Full-Width Solid Blue Primary CTA Button */}
          <button
            type="button"
            onClick={handleExploreClick}
            className="w-full min-h-[48px] py-3.5 px-6 rounded-2xl bg-[#0070F3] hover:bg-blue-600 text-white font-bold text-sm sm:text-base shadow-md shadow-blue-600/25 active:scale-[0.98] transition flex items-center justify-center gap-2 mb-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            <span>Explore All Features</span>
            <ArrowRight size={16} />
          </button>
        </div>

      </div>
    </section>
  );
}
