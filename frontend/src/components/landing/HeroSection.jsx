import React from 'react';
import { Play, ArrowRight, ShieldCheck, Zap, Headphones, Calendar, Sparkles, CheckCircle2, ChevronRight, Activity, Users, FileText, IndianRupee } from 'lucide-react';
import { motion } from 'framer-motion';
import { responsiveAssets } from '../../constants/landingAssets';

export default function HeroSection({ onSetupClinic, onWatchVideo, onBookDemo }) {
  const benefitPills = [
    {
      icon: <Zap size={15} className="text-[#0070F3]" />,
      title: 'Quick Setup',
      desc: 'Go live in minutes',
    },
    {
      icon: <ShieldCheck size={15} className="text-[#0070F3]" />,
      title: 'Secure & Reliable',
      desc: 'Your data stays safe',
    },
    {
      icon: <Headphones size={15} className="text-[#0070F3]" />,
      title: 'Dedicated Support',
      desc: 'Assistance whenever needed',
    },
  ];

  return (
    <section id="hero" className="relative w-full pt-28 pb-16 lg:pt-32 lg:pb-20 overflow-hidden bg-gradient-to-b from-[#F0F7FF] via-[#F8FAFC] to-white">
      {/* ── BACKGROUND SUBTLE RADIAL GLOWS ── */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[500px] bg-blue-400/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-20 left-10 w-[450px] h-[450px] bg-sky-300/15 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          
          {/* ── LEFT COPY COLUMN (7 Cols) ── */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            
            {/* Pill Eyebrow */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E0F2FE] border border-[#BAE6FD] text-[#0284C7] text-xs sm:text-[13px] font-bold mb-5 shadow-xs"
            >
              <span>All-in-One Clinic Management</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.05 }}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-[52px] font-black text-[#071B3A] mb-4 sm:mb-5 tracking-tight leading-[1.12]"
            >
              Run Your Clinic <br />
              Smarter with{' '}
              <span className="bg-gradient-to-r from-[#0070F3] via-[#0060E6] to-[#0284C7] bg-clip-text text-transparent">
                AI-CMS
              </span>
            </motion.h1>

            {/* Supporting Description */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 }}
              className="text-sm sm:text-base md:text-lg text-[#64748B] leading-relaxed max-w-2xl mb-7 font-normal"
            >
              A complete clinic management platform with AI-powered workflows, seamless patient experience and intelligent automation — so you can focus on what truly matters:{' '}
              <strong className="font-bold text-[#071B3A]">Better Care.</strong>
            </motion.p>

            {/* 3 Value Points (Circular Icons) */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.15 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full max-w-2xl mb-8"
            >
              {benefitPills.map((b, i) => (
                <div key={i} className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-2xl bg-white/90 border border-slate-200/80 shadow-xs hover:border-blue-200 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                    {b.icon}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-black text-[#071B3A] leading-tight truncate">{b.title}</span>
                    <span className="text-[11px] text-[#64748B] font-medium leading-tight truncate">{b.desc}</span>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* 3 Hero CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.2 }}
              className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full sm:w-auto"
            >
              {/* Primary */}
              <button
                type="button"
                id="hero-setup-clinic-btn"
                onClick={onSetupClinic}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3.5 rounded-full bg-[#0070F3] hover:bg-[#0051CC] text-white font-bold text-sm sm:text-[15px] shadow-[0_8px_20px_rgba(0,112,243,0.30)] hover:shadow-[0_12px_28px_rgba(0,112,243,0.40)] hover:-translate-y-0.5 active:scale-[0.98] transition-all min-h-[46px]"
              >
                <span>Setup Your Clinic</span>
                <ArrowRight size={17} />
              </button>

              {/* Secondary: Book a Demo */}
              <button
                type="button"
                id="hero-book-demo-btn"
                onClick={onBookDemo}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3.5 rounded-full bg-white hover:bg-blue-50/50 text-[#0070F3] hover:text-[#0051CC] font-bold text-sm sm:text-[15px] border-2 border-[#0070F3] shadow-sm hover:shadow-[0_4px_16px_rgba(0,112,243,0.15)] hover:-translate-y-0.5 transition-all active:scale-[0.98] min-h-[46px]"
              >
                <Calendar size={17} className="text-[#0070F3]" />
                <span>Book a Demo</span>
              </button>

              {/* Tertiary: Watch 2 Min Video */}
              <button
                type="button"
                id="hero-watch-video-btn"
                onClick={onWatchVideo}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-3.5 rounded-full bg-white hover:bg-slate-50 text-[#1E293B] hover:text-[#0070F3] font-semibold text-sm sm:text-[14px] border border-slate-200/90 shadow-sm transition-all active:scale-[0.98] min-h-[46px]"
              >
                <div className="w-5 h-5 rounded-full bg-[#E0F2FE] text-[#0070F3] flex items-center justify-center shrink-0">
                  <Play size={10} className="fill-[#0070F3] ml-0.5" />
                </div>
                <span>Watch 2 Min Video</span>
              </button>
            </motion.div>

          </div>

          {/* ── RIGHT VISUAL COLUMN (5 Cols) ── */}
          <div className="lg:col-span-5 relative flex justify-center items-center">
            
            {/* Script Text in Top Right */}
            <div className="absolute -top-6 right-0 sm:right-4 z-20 pointer-events-none text-right">
              <span className="font-serif italic font-bold text-base sm:text-lg text-[#0070F3] drop-shadow-sm block leading-tight">
                Empowering Doctors
              </span>
              <span className="font-serif italic font-medium text-xs sm:text-sm text-[#0060E6] block">
                Enriching Lives
              </span>
            </div>

            {/* Doctor & Realistic Dashboard Visual Composite */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.2 }}
              className="relative w-full max-w-[540px] flex flex-col items-center"
            >
              {/* Doctor Headset / Portrait Background */}
              <div className="relative w-full max-w-[340px] sm:max-w-[400px] aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-tr from-blue-600 via-sky-400 to-blue-200 border-4 border-white mb-[-80px] sm:mb-[-100px] z-0">
                <img
                  src={responsiveAssets.hero.doctorHero || responsiveAssets.hero.doctor}
                  alt="Doctor with AICMS Platform"
                  className="w-full h-full object-cover object-top"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent" />
              </div>

              {/* Realistic AICMS Front Dashboard Card Overlap */}
              <div className="relative z-10 w-full bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl sm:rounded-3xl shadow-[0_20px_50px_rgba(0,112,243,0.18)] p-3.5 sm:p-4.5 space-y-3">
                {/* Header Bar */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span className="text-[11px] font-black text-slate-700 ml-1">AI-CMS Clinic Dashboard</span>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                    Live Demo
                  </span>
                </div>

                {/* 4 Mini Stat Cards */}
                <div className="grid grid-cols-4 gap-1.5 sm:gap-2 text-center">
                  <div className="p-1.5 sm:p-2 rounded-xl bg-blue-50/70 border border-blue-100">
                    <p className="text-[9px] text-slate-500 font-bold truncate">Today Appts</p>
                    <p className="text-xs sm:text-sm font-black text-blue-700">42</p>
                    <span className="text-[8px] text-emerald-600 font-bold">↑ 12%</span>
                  </div>
                  <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-50/70 border border-emerald-100">
                    <p className="text-[9px] text-slate-500 font-bold truncate">Checked In</p>
                    <p className="text-xs sm:text-sm font-black text-emerald-700">28</p>
                    <span className="text-[8px] text-emerald-600 font-bold">↑ 8%</span>
                  </div>
                  <div className="p-1.5 sm:p-2 rounded-xl bg-indigo-50/70 border border-indigo-100">
                    <p className="text-[9px] text-slate-500 font-bold truncate">Revenue</p>
                    <p className="text-xs sm:text-sm font-black text-indigo-700">₹48,320</p>
                    <span className="text-[8px] text-emerald-600 font-bold">↑ 16%</span>
                  </div>
                  <div className="p-1.5 sm:p-2 rounded-xl bg-amber-50/70 border border-amber-100">
                    <p className="text-[9px] text-slate-500 font-bold truncate">Pending Bills</p>
                    <p className="text-xs sm:text-sm font-black text-amber-700">6</p>
                    <span className="text-[8px] text-rose-500 font-bold">↓ 4%</span>
                  </div>
                </div>

                {/* Mini Chart / Recent Patients Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-600">
                      <span>Weekly Flow</span>
                      <span className="text-blue-600 font-extrabold">+18.4%</span>
                    </div>
                    {/* SVG Curve */}
                    <div className="h-9 w-full flex items-end pt-1">
                      <svg viewBox="0 0 100 30" className="w-full h-full text-blue-500" preserveAspectRatio="none">
                        <path d="M0 24 Q 20 18, 40 20 T 70 8 T 100 4" fill="none" stroke="currentColor" strokeWidth="2.5" />
                        <path d="M0 24 Q 20 18, 40 20 T 70 8 T 100 4 L 100 30 L 0 30 Z" fill="rgba(0,112,243,0.12)" />
                      </svg>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-600">
                      <span>Live Queue</span>
                      <span className="text-[9px] text-slate-400">Next Up</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-extrabold text-slate-800">Ramesh Kumar</span>
                      <span className="text-emerald-600 font-bold text-[9px] bg-emerald-50 px-1.5 py-0.5 rounded">OPD Ready</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-extrabold text-slate-800">Anita Patel</span>
                      <span className="text-blue-600 font-bold text-[9px] bg-blue-50 px-1.5 py-0.5 rounded">Vitals Done</span>
                    </div>
                  </div>
                </div>

              </div>

            </motion.div>

          </div>

        </div>
      </div>
    </section>
  );
}
