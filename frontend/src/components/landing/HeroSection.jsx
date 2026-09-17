import React from 'react';
import { Play, ArrowRight, CheckCircle2, Shield, Sparkles, Calendar, Cloud, ShieldCheck, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { responsiveAssets } from '../../constants/landingAssets';

export default function HeroSection({ onSetupClinic, onWatchVideo, onBookDemo }) {
  const trustPoints = [
    'No credit card required',
    'Quick setup',
    'HIPAA-ready',
  ];

  const bottomRibbonItems = [
    {
      icon: <ShieldCheck size={22} className="text-[#0070F3]" />,
      title: 'Trusted by 1,000+ Clinics',
      desc: 'Across India',
    },
    {
      icon: <Cloud size={22} className="text-[#0070F3]" />,
      title: 'Cloud Based & Secure',
      desc: 'Your data is always safe',
    },
    {
      icon: <Shield size={22} className="text-[#0070F3]" />,
      title: 'HIPAA Compliant',
      desc: 'Enterprise-grade security',
    },
    {
      icon: <Heart size={22} className="text-[#0070F3]" />,
      title: 'Better Care for All',
      desc: 'Technology for a healthier tomorrow',
    },
  ];

  return (
    <section id="hero" className="hero-section-full">

      {/* ── FULL MEDICAL CLINIC BACKGROUND CANVAS ── */}
      <div
        className="hero-medical-bg"
        aria-hidden="true"
        style={{ backgroundImage: `url(${responsiveAssets.hero.medicalBackground})` }}
      />

      {/* ── HERO CONTENT WRAPPER ── */}
      <div className="hero-content-wrap">
        <div className="hero-grid-layout">

          {/* ── LEFT COPY COLUMN ── */}
          <div className="hero-copy">

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E0F2FE]/90 border border-[#BAE6FD] text-[#0284C7] text-xs sm:text-sm font-semibold mb-4 sm:mb-5 shadow-xs whitespace-nowrap"
            >
              <Shield size={14} className="text-[#0284C7] shrink-0 fill-[#0284C7]/15" />
              <span>Trusted by 1,000+ Clinics Across India</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.06 }}
              className="hero-headline font-black text-[#071B3A] mb-4 sm:mb-5 tracking-tight leading-[1.08]"
            >
              Modern Technology{' '}
              <br />
              for{' '}
              <span className="bg-gradient-to-r from-[#0070F3] via-[#0060E6] to-[#0284C7] bg-clip-text text-transparent">
                Healthier Communities
              </span>
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.12 }}
              className="hero-desc text-[#64748B] mb-6 sm:mb-7 font-normal"
            >
              AI-CMS simplifies clinic operations with intelligent workflows,
              seamless patient experience and data-driven insights — so you can
              focus on what truly matters:{' '}
              <strong className="font-bold text-[#071B3A]">Better Care.</strong>
            </motion.p>

            {/* CTA Buttons Row (3 buttons) */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.18 }}
              className="hero-actions flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-3.5 w-full mb-6 sm:mb-7"
            >
              {/* 1. Setup Your Clinic */}
              <button
                type="button"
                id="hero-setup-clinic-btn"
                onClick={onSetupClinic}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3.5 rounded-full bg-[#0070F3] hover:bg-[#0051CC] text-white font-bold text-sm sm:text-[15px] shadow-[0_8px_20px_rgba(0,112,243,0.30)] hover:shadow-[0_12px_28px_rgba(0,112,243,0.40)] hover:-translate-y-0.5 active:scale-[0.98] transition-all min-h-[46px]"
              >
                <span>Setup Your Clinic</span>
                <ArrowRight size={17} />
              </button>

              {/* 2. Watch 2 Min Video */}
              <button
                type="button"
                id="hero-watch-video-btn"
                onClick={onWatchVideo}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-5 sm:px-6 py-3.5 rounded-full bg-white/95 hover:bg-white text-[#1E293B] hover:text-[#0070F3] font-semibold text-sm sm:text-[15px] border border-slate-200/90 shadow-sm hover:shadow-md hover:border-[#BAE6FD] transition-all active:scale-[0.98] min-h-[46px]"
              >
                <div className="w-6 h-6 rounded-full bg-[#E0F2FE] text-[#0070F3] flex items-center justify-center shrink-0">
                  <Play size={11} className="fill-[#0070F3] ml-0.5" />
                </div>
                <span>Watch 2 Min Video</span>
              </button>

              {/* 3. Book a Demo */}
              <button
                type="button"
                id="hero-book-demo-btn"
                onClick={onBookDemo}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3.5 rounded-full bg-white hover:bg-blue-50/50 text-[#0070F3] hover:text-[#0051CC] font-bold text-sm sm:text-[15px] border-2 border-[#0070F3] shadow-sm hover:shadow-[0_4px_16px_rgba(0,112,243,0.15)] hover:-translate-y-0.5 transition-all active:scale-[0.98] min-h-[46px]"
              >
                <Calendar size={17} className="text-[#0070F3]" />
                <span>Book a Demo</span>
              </button>
            </motion.div>

            {/* Trust checkmarks under buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.24 }}
              className="hero-trust flex flex-wrap items-center gap-2.5 sm:gap-4 text-xs sm:text-[13px] text-[#64748B] font-medium"
            >
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <CheckCircle2 size={16} className="text-[#0070F3] shrink-0" />
                <span>No credit card required</span>
              </div>
              <span className="hidden sm:inline text-slate-300 font-light select-none">|</span>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <CheckCircle2 size={16} className="text-[#0070F3] shrink-0" />
                <span>Quick setup</span>
              </div>
              <span className="hidden sm:inline text-slate-300 font-light select-none">|</span>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <CheckCircle2 size={16} className="text-[#0070F3] shrink-0" />
                <span>HIPAA-ready</span>
              </div>
            </motion.div>

          </div>

          {/* ── DESKTOP ARTWORK COMPOSITION (≥ 768px) ── */}
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.2 }}
            className="hero-artwork-column hero-artwork-desktop select-none"
          >
            <div className="hero-artwork-container">

              {/* Handwritten script slogan (Desktop) */}
              <div className="hero-script-slogan">
                <span>Empowering</span>
                <span>Doctors</span>
                <span>Enriching Lives</span>
                <svg
                  viewBox="0 0 120 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="hero-script-swoosh"
                  aria-hidden="true"
                >
                  <path
                    d="M2 6C32 1.5 82 2 118 8.5"
                    stroke="#0070F3"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              {/* Floating AI Assistant Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.88, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.35 }}
                className="hero-floating-ai-card"
              >
                <div className="hero-floating-ai-icon">
                  <Sparkles size={16} className="text-white fill-white/20" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs sm:text-sm font-bold text-[#071B3A] leading-tight">AI Assistant</span>
                  <span className="text-[10px] sm:text-xs text-[#64748B] font-medium">Summarize today's patients</span>
                </div>
              </motion.div>

              {/* Doctor Portrait with Blue Aura */}
              <img
                src={responsiveAssets.hero.doctorHero}
                alt="Doctor with AI Assistant"
                className="hero-doctor-portrait"
              />

              {/* Devices (Laptop Dashboard + Mobile App) */}
              <img
                src={responsiveAssets.hero.devices}
                alt="AI-CMS Platform on Laptop and Mobile"
                className="hero-devices-overlay"
              />

            </div>
          </motion.div>

          {/* ── MOBILE ARTWORK COMPOSITION (< 768px) ── */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.22 }}
            className="hero-artwork-mobile select-none"
          >
            {/* Doctor Image (aicms_image_3.svg) with responsive handwritten slogan */}
            <div className="mobile-doctor-wrap">
              {/* Handwritten script slogan positioned in upper-right of doctor artwork */}
              <div className="mobile-script-slogan">
                <span>Empowering</span>
                <span>Doctors</span>
                <span>Enriching Lives</span>
                <svg
                  viewBox="0 0 120 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="mobile-script-swoosh"
                  aria-hidden="true"
                >
                  <path
                    d="M2 6C32 1.5 82 2 118 8.5"
                    stroke="#0070F3"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <img
                src={responsiveAssets.hero.doctor}
                alt="Doctor using AI Clinic Management System"
                className="mobile-doctor-img"
              />
            </div>

            {/* Devices Image (aicms_image_4.svg) overlapping lower doctor portion */}
            <div className="mobile-devices-wrap">
              <img
                src={responsiveAssets.hero.devices}
                alt="AI-CMS Tablet and Mobile Platform"
                className="mobile-devices-img"
              />
            </div>
          </motion.div>

        </div>
      </div>

      {/* ── BOTTOM TRUST RIBBON BAR ── */}
      <div className="w-full bg-white/95 backdrop-blur-md border-t border-blue-100/70 shadow-[0_-4px_24px_rgba(0,112,243,0.03)] relative z-20 mt-auto">
        <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-12 py-4 sm:py-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 divide-y sm:divide-y-0 lg:divide-x divide-slate-100/80">
            {bottomRibbonItems.map((item, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-3 sm:gap-3.5 pt-3 sm:pt-0 ${
                  idx > 0 ? 'lg:pl-6 xl:pl-8' : ''
                }`}
              >
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-50/80 border border-[#BAE6FD]/80 flex items-center justify-center shrink-0 text-[#0070F3]">
                  {item.icon}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs sm:text-[13.5px] font-bold text-[#071B3A] leading-tight">
                    {item.title}
                  </span>
                  <span className="text-[11px] sm:text-xs text-[#64748B] font-medium leading-tight">
                    {item.desc}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </section>
  );
}

