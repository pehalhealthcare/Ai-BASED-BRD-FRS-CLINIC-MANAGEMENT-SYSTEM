import React from 'react';
import { ArrowRight, Sparkles, CheckCircle2, BarChart2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CTASection({ onSetupClinic }) {
  const points = [
    'Quick setup',
    'Free onboarding',
    'Dedicated support',
  ];

  return (
    <section className="py-12 sm:py-16 bg-white relative">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        
        {/* Main CTA Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative bg-gradient-to-r from-[#034EB8] via-[#0560DF] to-[#0D77FF] rounded-3xl p-6 sm:p-10 lg:p-12 text-white overflow-hidden shadow-2xl shadow-blue-900/20"
        >
          {/* Decorative Glow and Lines */}
          <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-sky-300/20 rounded-full blur-[90px] pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-blue-950/30 rounded-full blur-[80px] pointer-events-none -ml-20 -mb-20" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            
            {/* Left Info */}
            <div className="flex items-start sm:items-center gap-4 sm:gap-5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 shadow-lg">
                <BarChart2 size={24} className="text-white" />
              </div>

              <div>
                <div className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-sky-200 mb-1">
                  READY TO TRANSFORM YOUR CLINIC?
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight">
                  Join AI-CMS Today
                </h2>
                <p className="text-xs sm:text-sm md:text-base text-blue-100 mt-1 font-normal">
                  Get started in minutes. No credit card required.
                </p>
              </div>
            </div>

            {/* Right Action & Trust Points */}
            <div className="flex flex-col sm:items-end gap-3 shrink-0">
              <button
                onClick={onSetupClinic}
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-3.5 sm:py-4 rounded-full bg-white text-blue-800 hover:bg-sky-50 font-bold text-sm sm:text-base shadow-xl transition active:scale-95"
              >
                <span>Setup Your Clinic</span>
                <ArrowRight size={18} />
              </button>

              {/* Subtext Guarantees */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-blue-100 font-medium">
                {points.map((p, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-sky-300" />
                    <span>{p}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Handwritten accent on bottom right */}
          <div className="absolute right-6 bottom-2 sm:bottom-3 text-[11px] sm:text-xs text-sky-200/80 font-serif italic hidden md:block pointer-events-none">
            Better Clinics • Brighter Tomorrows
          </div>

        </motion.div>

      </div>
    </section>
  );
}
