import React from 'react';
import { 
  Play, ArrowRight, Sparkles, Check, Zap, Shield, Headphones, 
  User, FileText, ClipboardCheck, Activity, ShieldCheck 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { responsiveAssets } from '../../constants/landingAssets';

export default function ProductShowcaseSection({ onSetupClinic, onWatchVideo, onTryAssistant }) {
  const benefits = [
    { 
      label: 'Quick Setup', 
      desc: 'Up and running in minutes', 
      icon: <Zap size={16} className="text-sky-300" strokeWidth={2.5} /> 
    },
    { 
      label: 'Secure & Reliable', 
      desc: 'HIPAA-ready cloud EMR', 
      icon: <Shield size={16} className="text-sky-300" strokeWidth={2.5} /> 
    },
    { 
      label: 'Dedicated Support', 
      desc: 'Assistance whenever needed', 
      icon: <Headphones size={16} className="text-sky-300" strokeWidth={2.5} /> 
    },
  ];

  const aiFeatures = [
    'Summarize patient history',
    'Suggest treatment guidelines',
    'Generate prescription',
    'Check drug interactions',
  ];

  // Mobile dedicated 5-feature list matching reference image
  const mobileAiRows = [
    {
      icon: <Shield size={16} className="text-blue-600" />,
      text: 'Summarise patient history',
    },
    {
      icon: <FileText size={16} className="text-blue-600" />,
      text: 'Suggest treatment guidelines',
    },
    {
      icon: <ClipboardCheck size={16} className="text-blue-600" />,
      text: 'Generate prescriptions',
    },
    {
      icon: <Activity size={16} className="text-blue-600" />,
      text: 'Check drug interactions',
    },
  ];

  return (
    <section 
      id="product" 
      className="product-showcase-section"
      aria-label="AI-CMS Product Showcase"
    >
      {/* ── ROUNDED BLUE BANNER WITH aicms_blue_background.svg ── */}
      <div 
        className="product-showcase-banner"
        style={{ backgroundImage: `url(${responsiveAssets.product.background})` }}
      >
        
        {/* =========================================================================
            1. DESKTOP & TABLET LAYOUT (>= 768px) — PRESERVED UNCHANGED
            ========================================================================= */}
        <div className="product-showcase-grid hidden md:grid">
          
          {/* ── LEFT CONTENT (1.05fr) ── */}
          <div className="product-showcase-left flex flex-col items-start text-left">
            {/* Tagline Badge */}
            <div className="text-[11px] sm:text-xs font-bold text-sky-200 tracking-widest uppercase mb-1.5 sm:mb-2">
              ALL-IN-ONE CLINIC MANAGEMENT
            </div>

            {/* Headline */}
            <h2 className="text-2xl sm:text-3xl lg:text-[34px] xl:text-[38px] font-extrabold tracking-tight leading-[1.14] text-white mb-2 sm:mb-3">
              Run Your Clinic <br />
              Smarter with <span className="text-cyan-300">AI-CMS</span>
            </h2>

            {/* Description */}
            <p className="text-xs sm:text-sm lg:text-[14px] text-blue-100/90 leading-relaxed font-normal max-w-lg mb-1 sm:mb-2">
              Simplify operations, enhance patient care and focus on what truly matters — <strong className="text-white font-semibold">Better Care.</strong>
            </p>

            {/* Feature Highlights: 3 compact horizontal items */}
            <div className="product-showcase-benefits">
              {benefits.map((b, i) => (
                <div key={i} className="product-benefit-item">
                  <div className="product-benefit-icon-wrapper">
                    {b.icon}
                  </div>
                  <div>
                    <div className="product-benefit-title">{b.label}</div>
                    <div className="product-benefit-desc">{b.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA Buttons: Primary blue pill + Secondary glass pill */}
            <div className="flex flex-wrap items-center gap-3 w-full">
              <button
                type="button"
                onClick={onSetupClinic}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-950/40 border border-blue-400/30 transition active:scale-95 cursor-pointer"
              >
                <span>Setup Your Clinic</span>
                <ArrowRight size={15} />
              </button>

              <button
                type="button"
                onClick={onWatchVideo}
                className="inline-flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-full bg-blue-950/40 hover:bg-blue-950/60 text-white font-medium text-xs sm:text-sm border border-white/20 transition active:scale-95 backdrop-blur-sm cursor-pointer"
              >
                <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0">
                  <Play size={10} className="fill-blue-900 text-blue-900 ml-0.5" />
                </div>
                <span>Watch 2 Min Video</span>
              </button>
            </div>
          </div>

          {/* ── CENTER LAPTOP DEVICE (1.28fr) ── */}
          <div className="product-showcase-center product-laptop-container">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="w-full flex justify-center items-center"
            >
              <img
                src={responsiveAssets.product.desktop}
                alt="AI-CMS Clinical Dashboard on Laptop"
                loading="lazy"
                className="product-laptop-img"
              />
            </motion.div>
          </div>

          {/* ── RIGHT AI ASSISTANT CARD (0.75fr) + TAGLINE ── */}
          <div className="product-showcase-right flex flex-col items-center lg:items-end w-full">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="product-ai-card"
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-3.5 pb-2.5 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/30 shrink-0">
                  <Sparkles size={16} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">AI Assistant</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Your Clinical Copilot</p>
                </div>
              </div>

              {/* Checklist */}
              <div className="flex flex-col gap-2 mb-4">
                {aiFeatures.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-700 font-medium">
                    <div className="w-3.5 h-3.5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Check size={10} strokeWidth={3} />
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              {/* Blue CTA */}
              <button
                type="button"
                onClick={onTryAssistant || onSetupClinic}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/25 transition active:scale-95 cursor-pointer"
              >
                <span>Try AI Assistant</span>
                <ArrowRight size={14} />
              </button>
            </motion.div>

            {/* Handwritten cursive brand tagline */}
            <div className="product-tagline">
              Better Clinics • Brighter Tomorrows
            </div>
          </div>

        </div>

        {/* =========================================================================
            2. DEDICATED MOBILE COMPOSITION (< 768px, 320px–480px)
               MATCHING THE THIRD ATTACHED REFERENCE DESIGN EXACTLY
            ========================================================================= */}
        <div className="product-mobile-showcase md:hidden flex flex-col items-center text-center w-full">
          
          {/* ── TOP BADGE ── */}
          <div className="text-[11px] font-bold text-sky-200 tracking-widest uppercase mb-2">
            ALL-IN-ONE CLINIC MANAGEMENT
          </div>

          {/* ── TOP HEADLINE ── */}
          <h2 className="text-[28px] sm:text-[32px] font-black tracking-tight leading-[1.15] text-white mb-2.5">
            Run Your Clinic <br />
            Smarter with <span className="text-cyan-300">AI-CMS</span>
          </h2>

          {/* ── TOP SUBTITLE ── */}
          <p className="text-[13px] sm:text-[14px] text-blue-100/90 leading-relaxed font-normal max-w-xs mx-auto mb-6">
            Simplify operations, enhance patient care<br />
            and focus on what truly matters — <strong className="text-white font-semibold">Better Care.</strong>
          </p>

          {/* ── STANDALONE CENTERED LAPTOP DASHBOARD ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="w-full flex justify-center items-center mb-6"
          >
            <img
              src={responsiveAssets.product.device}
              alt="AI-CMS Clinical Dashboard on Laptop"
              loading="lazy"
              className="w-[92%] max-w-[390px] h-auto object-contain drop-shadow-[0_16px_36px_rgba(0,10,40,0.6)]"
            />
          </motion.div>

          {/* ── LARGE WHITE AI ASSISTANT CARD ── */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="product-mobile-ai-card w-[92%] max-w-[390px] bg-white rounded-3xl p-4 sm:p-5 shadow-2xl mb-3.5 text-left border border-white/60"
          >
            {/* Card Header: User Icon + Title + Blue Checkmark */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <User size={20} strokeWidth={2.2} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">AI Assistant</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Your Clinical Copilot</p>
                </div>
              </div>
              <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Check size={12} strokeWidth={3} />
              </div>
            </div>

            {/* 4 Detailed Feature Rows with Icons and Checkmarks */}
            <div className="flex flex-col gap-3">
              {mobileAiRows.map((row, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-50/80 flex items-center justify-center shrink-0">
                      {row.icon}
                    </div>
                    <span className="text-xs sm:text-[13px] font-medium text-slate-800 leading-tight">
                      {row.text}
                    </span>
                  </div>
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs ml-2">
                    <Check size={12} strokeWidth={3} />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ── PRIMARY CTA: TRY AI ASSISTANT ── */}
          <button
            type="button"
            onClick={onTryAssistant || onSetupClinic}
            className="w-[92%] max-w-[390px] py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-sm shadow-lg shadow-blue-950/40 flex items-center justify-center gap-2 mb-2.5 transition active:scale-95 cursor-pointer border border-blue-400/30"
          >
            <span>Try AI Assistant</span>
            <ArrowRight size={16} />
          </button>

          {/* ── SECONDARY CTA: WATCH 2 MIN VIDEO ── */}
          <button
            type="button"
            onClick={onWatchVideo}
            className="w-[92%] max-w-[390px] py-3 px-4 rounded-2xl bg-blue-950/40 hover:bg-blue-950/60 border border-white/20 text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-2.5 mb-7 transition active:scale-95 backdrop-blur-sm cursor-pointer shadow-md shadow-blue-950/30"
          >
            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0 shadow-xs">
              <Play size={10} className="fill-blue-900 text-blue-900 ml-0.5" />
            </div>
            <span>Watch 2 Min Video</span>
          </button>

          {/* ── COMPACT 3-COLUMN BENEFIT ROW ── */}
          <div className="grid grid-cols-3 gap-2 w-[94%] max-w-[400px] mb-6 items-center">
            {/* Benefit 1 */}
            <div className="flex items-center gap-2 justify-center">
              <div className="w-8 h-8 rounded-full bg-blue-500/25 border border-sky-400/30 flex items-center justify-center text-sky-300 shrink-0">
                <Zap size={14} strokeWidth={2.5} />
              </div>
              <div className="text-left">
                <div className="text-[11px] font-bold text-white leading-tight">Quick</div>
                <div className="text-[10px] text-blue-200/90 leading-tight">Setup</div>
              </div>
            </div>

            {/* Benefit 2 */}
            <div className="flex items-center gap-2 justify-center">
              <div className="w-8 h-8 rounded-full bg-blue-500/25 border border-sky-400/30 flex items-center justify-center text-sky-300 shrink-0">
                <Shield size={14} strokeWidth={2.5} />
              </div>
              <div className="text-left">
                <div className="text-[11px] font-bold text-white leading-tight">Secure &</div>
                <div className="text-[10px] text-blue-200/90 leading-tight">Reliable</div>
              </div>
            </div>

            {/* Benefit 3 */}
            <div className="flex items-center gap-2 justify-center">
              <div className="w-8 h-8 rounded-full bg-blue-500/25 border border-sky-400/30 flex items-center justify-center text-sky-300 shrink-0">
                <Headphones size={14} strokeWidth={2.5} />
              </div>
              <div className="text-left">
                <div className="text-[11px] font-bold text-white leading-tight">Dedicated</div>
                <div className="text-[10px] text-blue-200/90 leading-tight">Support</div>
              </div>
            </div>
          </div>

          {/* ── CURSIVE HANDWRITTEN TAGLINE ── */}
          <div className="product-mobile-tagline">
            Better Clinics,<br />
            Brighter Tomorrows
          </div>

        </div>

      </div>
    </section>
  );
}
