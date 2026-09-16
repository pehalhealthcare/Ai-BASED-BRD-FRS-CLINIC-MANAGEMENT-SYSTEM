import React from 'react';
import { Play, ArrowRight, CheckCircle2, Shield, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { responsiveAssets } from '../../constants/landingAssets';

export default function HeroSection({ onSetupClinic, onWatchVideo }) {
  const trustPoints = [
    'No credit card required',
    'Quick setup',
    'HIPAA-ready',
    'Trusted by 1,000+',
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
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50/90 border border-blue-200/80 text-blue-700 text-xs sm:text-sm font-semibold mb-4 shadow-sm"
            >
              <Shield size={14} className="text-blue-600 shrink-0 fill-blue-600/10" />
              <span>Trusted by 1,000+ Clinics Across India</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.06 }}
              className="hero-headline font-black text-slate-900 mb-4"
            >
              Modern Technology{' '}
              <br className="hidden sm:block" />
              for{' '}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 bg-clip-text text-transparent">
                Healthier Communities
              </span>
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.12 }}
              className="hero-desc text-slate-600 mb-6 font-normal"
            >
              AI-CMS simplifies clinic operations with intelligent workflows,
              seamless patient experience and data-driven insights — so you can
              focus on what truly matters:{' '}
              <strong className="font-bold text-slate-900">Better Care.</strong>
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.18 }}
              className="hero-actions flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto mb-6"
            >
              <button
                onClick={onSetupClinic}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm sm:text-base shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all"
              >
                <span>Setup Your Clinic</span>
                <ArrowRight size={18} />
              </button>

              <button
                onClick={onWatchVideo}
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-full bg-white/90 hover:bg-white text-slate-700 hover:text-blue-600 font-semibold text-sm sm:text-base border border-slate-200 shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
              >
                <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Play size={12} className="fill-blue-600 ml-0.5" />
                </div>
                <span>Watch 2 Min Video</span>
              </button>
            </motion.div>

            {/* Trust checkmarks */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.24 }}
              className="hero-trust"
            >
              {trustPoints.map((point, i) => (
                <div key={i} className="flex items-center gap-1.5 whitespace-nowrap">
                  <CheckCircle2 size={15} className="text-blue-600 shrink-0" />
                  <span className="text-xs sm:text-sm text-slate-600 font-medium">{point}</span>
                </div>
              ))}
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
                    stroke="#1e3a8a"
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
                  <span className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">AI Assistant</span>
                  <span className="text-[10px] sm:text-xs text-slate-500 font-medium">Summarize today's patients</span>
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
                    stroke="#1e3a8a"
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

    </section>
  );
}

