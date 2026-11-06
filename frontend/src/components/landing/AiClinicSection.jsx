import React, { useState } from 'react';
import { 
  Calendar, Stethoscope, Sparkles, Pill, 
  FlaskConical, Activity, ArrowRight, ArrowLeft, ShieldCheck 
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

export default function AiClinicSection({ onExploreAi }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  const aiFeatures = [
    {
      id: 'ai-sched',
      title: 'AI Appointment Scheduling',
      desc: 'Suggests best slots based on doctor availability and patient preferences.',
      icon: <Calendar className="w-5 h-5 text-blue-600" />,
      bgIcon: 'bg-blue-50/90 border border-blue-100',
      activeColor: 'text-blue-600',
    },
    {
      id: 'ai-symptom',
      title: 'AI Symptom Checker',
      desc: 'Helps understand patient symptoms for better triage and consultation.',
      icon: <Stethoscope className="w-5 h-5 text-emerald-600" />,
      bgIcon: 'bg-emerald-50/90 border border-emerald-100',
      activeColor: 'text-emerald-600',
    },
    {
      id: 'ai-assist',
      title: 'AI Consultation Assistant',
      desc: 'Summarizes patient history, reports and suggests clinical insights.',
      icon: <Sparkles className="w-5 h-5 text-indigo-600" />,
      bgIcon: 'bg-indigo-50/90 border border-indigo-100',
      activeColor: 'text-indigo-600',
    },
    {
      id: 'ai-rx',
      title: 'AI Prescription Suggestions',
      desc: 'Suggests medicines, dosages and cautions for doctor review.',
      icon: <Pill className="w-5 h-5 text-amber-600" />,
      bgIcon: 'bg-amber-50/90 border border-amber-100',
      activeColor: 'text-amber-600',
    },
    {
      id: 'ai-lab',
      title: 'AI Lab Recommendation',
      desc: 'Recommends relevant lab tests based on symptoms & findings.',
      icon: <FlaskConical className="w-5 h-5 text-cyan-600" />,
      bgIcon: 'bg-cyan-50/90 border border-cyan-100',
      activeColor: 'text-cyan-600',
    },
    {
      id: 'ai-risk',
      title: 'AI Patient Risk Scoring',
      desc: 'Identifies high-risk patients for early intervention and follow-up.',
      icon: <Activity className="w-5 h-5 text-rose-600" />,
      bgIcon: 'bg-rose-50/90 border border-rose-100',
      activeColor: 'text-rose-600',
    },
  ];

  const handleNext = () => {
    setDirection(1);
    setActiveIndex((prev) => (prev + 1) % aiFeatures.length);
  };

  const handlePrev = () => {
    setDirection(-1);
    setActiveIndex((prev) => (prev - 1 + aiFeatures.length) % aiFeatures.length);
  };

  const handleExploreClick = (e) => {
    if (e) e.preventDefault();
    if (onExploreAi) {
      onExploreAi();
    } else {
      const el = document.getElementById('ecosystem');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const currentFeature = aiFeatures[activeIndex];

  // Stacked cards configuration behind active card (Tinder-style fanning deck)
  const stackLayers = [
    {
      rotate: '-2.5deg',
      scale: 0.97,
      translateX: '-4px',
      translateY: '4px',
      zIndex: 11,
      bg: 'bg-white/95 border-emerald-200/90 shadow-sm',
    },
    {
      rotate: '3.5deg',
      scale: 0.95,
      translateX: '7px',
      translateY: '7px',
      zIndex: 10,
      bg: 'bg-white/95 border-emerald-200/90 shadow-sm',
    },
    {
      rotate: '7deg',
      scale: 0.92,
      translateX: '14px',
      translateY: '13px',
      zIndex: 9,
      bg: 'bg-white/90 border-purple-200/90 shadow-sm',
    },
    {
      rotate: '10.5deg',
      scale: 0.89,
      translateX: '20px',
      translateY: '19px',
      zIndex: 8,
      bg: 'bg-white/85 border-amber-200/90 shadow-sm',
    },
  ];

  return (
    <section id="ai-features" className="py-16 sm:py-20 lg:py-24 bg-white relative overflow-hidden">
      {/* Ambient pale-blue decorative gradients */}
      <div className="absolute top-1/4 -left-32 w-80 h-80 bg-blue-50/70 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-32 w-80 h-80 bg-sky-50/80 rounded-full blur-3xl pointer-events-none" />
      
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 relative z-10">
        
        {/* ── 1. DESKTOP VIEW (≥ 1024px): Strictly Preserved ── */}
        <div className="ai-features-desktop">
          {/* Desktop Heading with right-aligned link */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 sm:mb-12 gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                AI That Works With Your Clinic — <span className="text-blue-600">Not Around It</span>
              </h2>
              <p className="text-sm sm:text-base text-slate-500 mt-2 max-w-2xl font-normal">
                Intelligent assistance built into your everyday workflows.
              </p>
            </div>

            <a
              href="#ecosystem"
              onClick={handleExploreClick}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700 transition shrink-0 group"
            >
              <span>Explore AI Features</span>
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </a>
          </div>

          {/* Desktop 6 AI Cards in 2x3 Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 mb-8">
            {aiFeatures.map((feat, index) => (
              <motion.div
                key={feat.id}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.35, delay: index * 0.06 }}
                className="bg-[#F8FAFC]/90 hover:bg-white border border-slate-200/80 hover:border-blue-200 rounded-2xl p-5 sm:p-6 flex flex-col items-start text-left shadow-xs hover:shadow-lg transition-all duration-300 group"
              >
                <div className={`w-11 h-11 rounded-xl ${feat.bgIcon} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-xs`}>
                  {feat.icon}
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-2">
                  {feat.title}
                </h3>
                <p className="text-xs sm:text-[13px] text-slate-500 leading-relaxed font-normal">
                  {feat.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── 2. MEDIUM-SCREEN VIEW (768px to 1023px): Responsive Grid with Centered Content ── */}
        <div className="ai-features-tablet">
          {/* Centered Heading */}
          <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-snug">
              AI That Works With Your Clinic — <br className="hidden sm:inline" />
              <span className="text-blue-600">Not Around It</span>
            </h2>
            <p className="text-sm sm:text-base text-slate-500 mt-2 font-normal">
              Intelligent assistance built into your everyday workflows.
            </p>
          </div>

          {/* 3-Column x 2-Row Feature Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-5 mb-8">
            {aiFeatures.map((feat, index) => (
              <div
                key={feat.id}
                className={`bg-white rounded-2xl border p-5 flex flex-col justify-between h-full shadow-xs hover:shadow-md transition-all duration-200 group ${
                  index === 0 ? 'border-blue-500/80 shadow-xs' : 'border-blue-100/90 hover:border-blue-300'
                }`}
              >
                <div>
                  <div className={`w-11 h-11 rounded-xl ${feat.bgIcon} flex items-center justify-center mb-3.5 group-hover:scale-105 transition-transform shadow-xs`}>
                    {feat.icon}
                  </div>
                  <h3 className="text-sm sm:text-[15px] font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-1.5 leading-snug">
                    {feat.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-normal">
                    {feat.desc}
                  </p>
                </div>

                {/* Circular Arrow Button at bottom right */}
                <div className="pt-3 flex justify-end">
                  <div className="w-8 h-8 rounded-full bg-blue-50/90 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xs">
                    <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Centered Outline Pill Button */}
          <div className="flex justify-center mb-8">
            <button
              type="button"
              onClick={handleExploreClick}
              className="w-full py-3.5 px-6 rounded-full border border-blue-500 hover:border-blue-600 bg-white hover:bg-blue-50/60 text-blue-600 font-semibold text-sm sm:text-base flex items-center justify-center gap-2 transition shadow-xs group"
            >
              <span>Explore AI Features</span>
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>

        {/* ── 3. MOBILE VIEW (< 768px): Tinder-Style Swipeable Stacked Cards ── */}
        <div className="ai-features-mobile">
          {/* Centered Heading */}
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              AI That Works With <br />
              Your Clinic — <br />
              <span className="text-blue-600">Not Around It</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2 font-normal max-w-xs mx-auto">
              Intelligent assistance built into your everyday workflows.
            </p>
          </div>

          {/* Swipeable Card Deck Container */}
          <div 
            className="relative w-full max-w-[340px] sm:max-w-[360px] mx-auto h-[320px] sm:h-[340px] mb-4 touch-pan-y"
            tabIndex={0}
            role="region"
            aria-label="Swipeable AI features card deck"
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
                className={`absolute inset-0 rounded-3xl border shadow-sm pointer-events-none transition-all duration-300 ${layer.bg}`}
                style={{
                  transform: `translate(${layer.translateX || '0px'}, ${layer.translateY}) rotate(${layer.rotate}) scale(${layer.scale})`,
                  transformOrigin: 'bottom center',
                  zIndex: layer.zIndex,
                }}
              />
            ))}

            {/* Top Active Card with Drag/Swipe Support */}
            <AnimatePresence initial={false} custom={direction} mode="popLayout">
              <motion.div
                key={activeIndex}
                custom={direction}
                variants={{
                  enter: (direction) => shouldReduceMotion ? { opacity: 0 } : ({
                    x: direction > 0 ? 120 : -120,
                    opacity: 0,
                    scale: 0.94,
                    rotate: direction > 0 ? 4 : -4,
                  }),
                  center: {
                    x: 0,
                    opacity: 1,
                    scale: 1,
                    rotate: 0,
                    transition: shouldReduceMotion ? { duration: 0.1 } : {
                      x: { type: 'spring', stiffness: 350, damping: 28 },
                      opacity: { duration: 0.2 },
                      rotate: { duration: 0.2 },
                    },
                  },
                  exit: (direction) => shouldReduceMotion ? { opacity: 0 } : ({
                    x: direction > 0 ? -260 : 260,
                    opacity: 0,
                    scale: 0.9,
                    rotate: direction > 0 ? -12 : 12,
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
                onDragEnd={(e, { offset, velocity }) => {
                  const swipeThreshold = 50;
                  if (offset.x < -swipeThreshold || velocity.x < -300) {
                    handleNext();
                  } else if (offset.x > swipeThreshold || velocity.x > 300) {
                    handlePrev();
                  }
                }}
                className="absolute inset-0 bg-white rounded-3xl border border-slate-200/90 shadow-xl p-6 sm:p-7 flex flex-col justify-between cursor-grab active:cursor-grabbing select-none z-20"
              >
                <div>
                  {/* Feature Icon Container */}
                  <div className={`w-14 h-14 rounded-2xl ${currentFeature.bgIcon} flex items-center justify-center mb-5 shadow-xs`}>
                    {React.cloneElement(currentFeature.icon, { className: 'w-7 h-7' })}
                  </div>

                  {/* Feature Title */}
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-2.5 leading-snug">
                    {currentFeature.title}
                  </h3>

                  {/* Feature Description */}
                  <p className="text-sm sm:text-[15px] text-slate-500 leading-relaxed font-normal">
                    {currentFeature.desc}
                  </p>
                </div>

                {/* Bottom Row with Circular Arrow Control */}
                <div className="flex justify-end pt-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNext();
                    }}
                    aria-label="Next feature"
                    className="w-11 h-11 rounded-full bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white flex items-center justify-center transition-all shadow-xs active:scale-90"
                  >
                    <ArrowRight size={18} />
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Pagination Dots */}
          <div className="flex items-center justify-center gap-2 mt-5 mb-3" role="tablist" aria-label="Feature pagination">
            {aiFeatures.map((feat, i) => (
              <button
                key={feat.id}
                type="button"
                role="tab"
                aria-selected={i === activeIndex}
                aria-label={`Feature ${i + 1}: ${feat.title}`}
                onClick={() => {
                  setDirection(i > activeIndex ? 1 : -1);
                  setActiveIndex(i);
                }}
                className={`transition-all duration-300 rounded-full ${
                  i === activeIndex
                    ? 'w-3 h-3 bg-blue-600 shadow-xs'
                    : 'w-2 h-2 bg-blue-200 hover:bg-blue-300'
                }`}
              />
            ))}
          </div>

          {/* Swipe Guidance Controls */}
          <div className="flex flex-col items-center gap-1 mb-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous feature"
                className="p-1 text-slate-400 hover:text-blue-600 active:scale-95 transition"
              >
                <ArrowLeft size={16} />
              </button>

              {/* Hand Pointer / Swipe Icon */}
              <div className="w-8 h-8 rounded-full bg-blue-50/80 border border-blue-100 flex items-center justify-center text-blue-600">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/>
                  <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/>
                  <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/>
                  <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>
                </svg>
              </div>

              <button
                type="button"
                onClick={handleNext}
                aria-label="Next feature"
                className="p-1 text-slate-400 hover:text-blue-600 active:scale-95 transition"
              >
                <ArrowRight size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-500 font-medium text-center">
              Swipe left or right to explore all features
            </p>
          </div>

          {/* Mobile Full-Width Solid Blue CTA Button */}
          <button
            type="button"
            onClick={handleExploreClick}
            className="w-full py-3.5 px-6 rounded-2xl bg-[#0070F3] hover:bg-blue-600 text-white font-bold text-sm sm:text-base shadow-md shadow-blue-600/25 active:scale-[0.99] transition flex items-center justify-center gap-2 mb-6"
          >
            <span>Explore AI Features</span>
            <ArrowRight size={16} />
          </button>
        </div>

        {/* ── 4. Clinical Safety & Decision Responsibility Notice ── */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-center justify-center gap-2.5 text-center text-xs text-slate-600 mt-2">
          <ShieldCheck size={16} className="text-blue-600 shrink-0" />
          <span>
            <strong>AI Safety Notice:</strong> AI-assisted recommendations are provided for clinician review. The final clinical decision remains strictly with the authorized healthcare professional.
          </span>
        </div>

      </div>
    </section>
  );
}
