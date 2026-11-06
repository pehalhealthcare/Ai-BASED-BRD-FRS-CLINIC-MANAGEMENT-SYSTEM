import React, { useState } from 'react';
import { 
  Users, Eye, Building2, FlaskConical, ArrowRight, ArrowLeft 
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { responsiveAssets } from '../../constants/landingAssets';

// Custom lightweight SVG Icons matching the reference design
const ToothIcon = ({ className = "w-5 h-5 text-amber-500" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2C8.5 2 6 4 6 7.5C6 9.5 6.8 11.2 7 13C7.3 15.5 6.5 19.5 8 21.5C9.2 23 10.5 21.5 11 19C11.3 17.5 11.6 15 12 15C12.4 15 12.7 17.5 13 19C13.5 21.5 14.8 23 16 21.5C17.5 19.5 16.7 15.5 17 13C17.2 11.2 18 9.5 18 7.5C18 4 15.5 2 12 2Z" />
  </svg>
);

const PhysioIcon = ({ className = "w-5 h-5 text-emerald-600" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="18" cy="5" r="2" />
    <path d="M14 9l3 2v4" />
    <path d="M7 17l4-2 3 2 4-4" />
    <path d="M4 11l3-1 3 3" />
    <path d="M6 19l2-3" />
  </svg>
);

export default function SolutionsSection({ onSelectSolution }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  const solutions = [
    {
      id: 'general-clinics',
      title: 'General Clinics',
      shortTitle: 'General Clinics',
      subtitle: 'Streamline everyday practice.',
      desc: 'Streamline everyday practice with AI-powered workflows.',
      image: responsiveAssets.solutions.general,
      icon: <Users className="w-5 h-5 text-blue-600" />,
      bgIcon: 'bg-blue-50 border border-blue-100',
      activeColor: 'text-blue-600',
    },
    {
      id: 'dental-clinics',
      title: 'Dental Clinics',
      shortTitle: 'Dental Clinics',
      subtitle: 'Run your dental practice efficiently.',
      desc: 'Run your dental practice with complete patient, appointment and treatment management.',
      image: responsiveAssets.solutions.dental,
      icon: <ToothIcon className="w-5 h-5 text-amber-500" />,
      bgIcon: 'bg-amber-50 border border-amber-100',
      activeColor: 'text-amber-500',
    },
    {
      id: 'eye-clinics',
      title: 'Eye Clinics',
      shortTitle: 'Eye Clinics',
      subtitle: 'Manage eye care with precision.',
      desc: 'Manage eye care with specialized workflows and patient tracking.',
      image: responsiveAssets.hero.medicalBackground || responsiveAssets.solutions.general,
      icon: <Eye className="w-5 h-5 text-purple-600" />,
      bgIcon: 'bg-purple-50 border border-purple-100',
      activeColor: 'text-purple-600',
    },
    {
      id: 'physiotherapy-clinics',
      title: 'Physiotherapy Clinics',
      shortTitle: 'Physiotherapy Clinics',
      subtitle: 'Track progress and treatment plans.',
      desc: 'Track progress, manage sessions and improve patient outcomes.',
      image: responsiveAssets.solutions.multiSpecialty,
      icon: <PhysioIcon className="w-5 h-5 text-emerald-600" />,
      bgIcon: 'bg-emerald-50 border border-emerald-100',
      activeColor: 'text-emerald-600',
    },
    {
      id: 'multi-speciality',
      title: 'Multi-Speciality Centers',
      shortTitle: 'Multi-Speciality',
      subtitle: 'Coordinate multiple departments.',
      desc: 'Coordinate multiple departments with unified patient records and advanced reporting.',
      image: responsiveAssets.solutions.multiSpecialty,
      icon: <Building2 className="w-5 h-5 text-rose-500" />,
      bgIcon: 'bg-rose-50 border border-rose-100',
      activeColor: 'text-rose-500',
    },
    {
      id: 'diagnostic-centers',
      title: 'Diagnostic Centers',
      shortTitle: 'Diagnostic Centers',
      subtitle: 'Lab integration and reporting.',
      desc: 'Lab integration, report management and workflow automation.',
      image: responsiveAssets.solutions.diagnostic,
      icon: <FlaskConical className="w-5 h-5 text-cyan-600" />,
      bgIcon: 'bg-cyan-50 border border-cyan-100',
      activeColor: 'text-cyan-600',
    },
  ];

  const handleNext = () => {
    setDirection(1);
    setActiveIndex((prev) => (prev + 1) % solutions.length);
  };

  const handlePrev = () => {
    setDirection(-1);
    setActiveIndex((prev) => (prev - 1 + solutions.length) % solutions.length);
  };

  const handleSelectSolution = (id, index) => {
    if (index !== undefined) {
      setDirection(index > activeIndex ? 1 : -1);
      setActiveIndex(index);
    }
    if (onSelectSolution) {
      onSelectSolution(id);
    }
  };

  const currentSolution = solutions[activeIndex];

  // Visual fanning background layers for mobile stacked deck matching reference image
  const stackLayers = [
    {
      rotate: '3deg',
      scale: 0.97,
      translateX: '5px',
      translateY: '4px',
      zIndex: 11,
      bg: 'bg-white/95 border-emerald-300/80 shadow-md',
    },
    {
      rotate: '6.5deg',
      scale: 0.94,
      translateX: '11px',
      translateY: '8px',
      zIndex: 10,
      bg: 'bg-white/90 border-purple-300/80 shadow-md',
    },
    {
      rotate: '10deg',
      scale: 0.91,
      translateX: '17px',
      translateY: '12px',
      zIndex: 9,
      bg: 'bg-white/85 border-amber-300/70 shadow-sm',
    },
  ];

  return (
    <section id="solutions" className="py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-white via-sky-50/20 to-white relative overflow-hidden">
      {/* Subtle ambient decorative gradient glow */}
      <div className="absolute top-1/4 -left-32 w-80 h-80 bg-blue-100/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-32 w-80 h-80 bg-sky-100/50 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 relative z-10">

        {/* ── 1. DESKTOP VIEW (≥ 1024px): Strictly Preserved ── */}
        <div className="solutions-desktop">
          {/* Header Row */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 sm:mb-12 gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                Solutions for <span className="text-blue-600">Every Practice</span>
              </h2>
              <p className="text-sm sm:text-base text-slate-500 mt-2 max-w-2xl font-normal">
                Whether you're a single-doctor clinic or a multi-speciality center, AI-CMS adapts to your needs.
              </p>
            </div>

            <button
              onClick={() => onSelectSolution && onSelectSolution()}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700 transition shrink-0 group cursor-pointer"
            >
              <span>Explore All Solutions</span>
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          {/* 6 Solution Cards Grid (6 on Desktop) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-5">
            {solutions.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.35, delay: index * 0.05 }}
                onClick={() => onSelectSolution && onSelectSolution(item.id)}
                className="bg-[#F8FAFC]/90 hover:bg-white border border-slate-200/80 hover:border-blue-300 rounded-2xl p-3 sm:p-3.5 flex flex-col shadow-xs hover:shadow-xl transition-all duration-300 group cursor-pointer"
              >
                {/* Image Container with Rounded Style */}
                <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden mb-3 bg-slate-100">
                  <img
                    src={item.image}
                    alt={item.title}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>

                {/* Card Bottom Text & Arrow */}
                <div className="flex items-center justify-between pt-1 px-1">
                  <div className="min-w-0 pr-2">
                    <h3 className="text-xs sm:text-[13.5px] font-black text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5 font-normal">
                      {item.subtitle}
                    </p>
                  </div>

                  <div className="w-7 h-7 rounded-full bg-slate-100 group-hover:bg-blue-600 group-hover:text-white text-slate-400 flex items-center justify-center transition-all shrink-0">
                    <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── 2. MEDIUM-SCREEN VIEW (580px to 1023px): Responsive Solution Grid ── */}
        <div className="solutions-tablet">
          {/* Centered Heading */}
          <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-snug">
              Solutions for <span className="text-blue-600">Every Practice</span>
            </h2>
            <p className="text-sm sm:text-base text-slate-500 mt-2 font-normal">
              Whether you're a single-doctor clinic or a multi-speciality center, AI-CMS adapts to your needs.
            </p>
          </div>

          {/* 3-Column x 2-Row Responsive Image Grid */}
          <div className="grid grid-cols-2 min-[720px]:grid-cols-3 gap-4 lg:gap-5 mb-8">
            {solutions.map((item, index) => (
              <div
                key={item.id}
                onClick={() => handleSelectSolution(item.id, index)}
                className="bg-white rounded-2xl overflow-hidden border border-slate-200/90 hover:border-blue-300 p-0 flex flex-col justify-between h-full shadow-xs hover:shadow-md transition-all duration-200 group cursor-pointer"
              >
                <div>
                  {/* Category Image */}
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                    <img
                      src={item.image}
                      alt={item.title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>

                  {/* Overlapping Category Icon & Text */}
                  <div className="px-5 pt-0 pb-2">
                    <div className={`-mt-5 mb-3 relative z-10 w-10 h-10 rounded-xl ${item.bgIcon} flex items-center justify-center shadow-sm`}>
                      {item.icon}
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-1.5 leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed font-normal">
                      {item.desc}
                    </p>
                  </div>
                </div>

                {/* Circular Arrow Button at bottom right */}
                <div className="p-4 pt-1 flex justify-end">
                  <div className="w-8 h-8 rounded-full bg-blue-50/90 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xs">
                    <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Full-Width Outline Pill CTA Button matching reference image */}
          <div className="w-full mb-4">
            <button
              type="button"
              onClick={() => onSelectSolution && onSelectSolution()}
              className="w-full py-3.5 px-6 rounded-2xl border border-blue-300 hover:border-blue-500 bg-white hover:bg-blue-50/40 text-blue-600 font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition shadow-xs group"
            >
              <span>Explore All Solutions</span>
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>

        {/* ── 3. MOBILE VIEW (< 580px): Tinder-Style Swipeable Stacked Cards ── */}
        <div className="solutions-mobile">
          {/* Centered Heading */}
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              Solutions for <br />
              <span className="text-blue-600">Every Practice</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2 font-normal max-w-xs mx-auto">
              Whether you're a single-doctor clinic or a multi-speciality center, AI-CMS adapts to your needs.
            </p>
          </div>

          {/* Stack Container with Side Navigation Arrows */}
          <div className="relative flex items-center justify-center gap-1.5 sm:gap-3 mb-4 w-full">
            {/* Left Nav Arrow Button */}
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous solution"
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 shadow-md flex items-center justify-center transition active:scale-95 shrink-0 z-30"
            >
              <ArrowLeft size={16} />
            </button>

            {/* Swipeable Card Deck Container */}
            <div 
              className="relative flex-1 max-w-[280px] sm:max-w-[310px] h-[370px] sm:h-[385px] touch-pan-y mx-auto"
              tabIndex={0}
              role="region"
              aria-label="Swipeable Solutions card deck"
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
                    const swipeThreshold = 45;
                    if (offset.x < -swipeThreshold || velocity.x < -300) {
                      handleNext();
                    } else if (offset.x > swipeThreshold || velocity.x > 300) {
                      handlePrev();
                    }
                  }}
                  className="absolute inset-0 bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden flex flex-col justify-between cursor-grab active:cursor-grabbing select-none z-20"
                >
                  <div>
                    {/* Top Category Image Container */}
                    <div className="relative h-40 sm:h-44 w-full overflow-hidden bg-slate-100">
                      <img
                        src={currentSolution.image}
                        alt={currentSolution.title}
                        className="w-full h-full object-cover"
                      />

                      {/* Card Counter Badge: 01 / 06 */}
                      <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md text-slate-700 font-bold text-[11px] shadow-xs">
                        {`0${activeIndex + 1} / 0${solutions.length}`}
                      </span>
                    </div>

                    {/* Overlapping Category Icon & Details */}
                    <div className="px-5 pt-0 pb-2">
                      <div className={`-mt-5 mb-2.5 relative z-10 w-11 h-11 rounded-2xl ${currentSolution.bgIcon} flex items-center justify-center shadow-md`}>
                        {currentSolution.icon}
                      </div>

                      {/* Category Title */}
                      <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-1 leading-snug">
                        {currentSolution.title}
                      </h3>

                      {/* Category Description */}
                      <p className="text-xs sm:text-[13px] text-slate-500 leading-relaxed font-normal">
                        {currentSolution.desc}
                      </p>
                    </div>
                  </div>

                  {/* Bottom Row with Circular Arrow Control */}
                  <div className="px-5 pb-4 flex justify-end">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNext();
                      }}
                      aria-label="Next solution"
                      className="w-10 h-10 rounded-full bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white flex items-center justify-center transition-all shadow-xs active:scale-90"
                    >
                      <ArrowRight size={17} />
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Right Nav Arrow Button */}
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next solution"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 shadow-md flex items-center justify-center transition active:scale-95 shrink-0 z-30"
            >
              <ArrowRight size={18} />
            </button>
          </div>

          {/* Pagination Dots */}
          <div className="flex items-center justify-center gap-2 mt-4 mb-2" role="tablist" aria-label="Solutions pagination">
            {solutions.map((item, i) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={i === activeIndex}
                aria-label={`Solution ${i + 1}: ${item.title}`}
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

          {/* Helper Instruction */}
          <p className="text-xs text-slate-500 font-medium text-center mb-4">
            Swipe to explore all solutions
          </p>

          {/* Mobile Full-Width Blue Gradient CTA Button */}
          <button
            type="button"
            onClick={() => onSelectSolution && onSelectSolution()}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-[#0070F3] hover:from-blue-700 hover:to-blue-600 text-white font-bold text-sm sm:text-base shadow-md shadow-blue-500/25 active:scale-[0.99] transition flex items-center justify-center gap-2 mb-5"
          >
            <span>Explore All Solutions</span>
            <ArrowRight size={16} />
          </button>

          {/* Solution Category Shortcuts Grid (3 columns x 2 rows) */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mb-2" role="tablist" aria-label="Solution categories">
            {solutions.map((item, i) => {
              const isSelected = i === activeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => {
                    setDirection(i > activeIndex ? 1 : -1);
                    setActiveIndex(i);
                  }}
                  className={`p-2.5 sm:p-3 rounded-2xl border text-center flex flex-col items-center justify-center transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/70 shadow-xs ring-1 ring-blue-400'
                      : 'border-slate-200/80 bg-white hover:border-blue-200 hover:bg-slate-50/50'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl ${item.bgIcon} flex items-center justify-center mb-1.5`}>
                    {item.icon}
                  </div>
                  <span className={`text-[11px] sm:text-xs font-bold leading-tight ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
                    {item.shortTitle}
                  </span>
                </button>
              );
            })}
          </div>

        </div>

      </div>
    </section>
  );
}
