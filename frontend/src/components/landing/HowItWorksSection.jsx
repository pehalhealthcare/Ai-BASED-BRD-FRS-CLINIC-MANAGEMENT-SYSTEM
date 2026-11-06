import React from 'react';
import { 
  FileText, Calendar, CheckCircle2, Stethoscope, 
  Pill, FlaskConical, IndianRupee, MessageSquare 
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function HowItWorksSection() {
  const steps = [
    {
      num: '01',
      title: 'Patient Registration',
      desc: 'Create patient profile once and keep records for lifetime.',
      icon: <FileText className="w-5 h-5 text-blue-600" />,
    },
    {
      num: '02',
      title: 'Appointment',
      desc: 'Manage doctors, schedules and slots with AI assistance.',
      icon: <Calendar className="w-5 h-5 text-blue-600" />,
    },
    {
      num: '03',
      title: 'Check-In',
      desc: 'Quick check-in and token management at reception.',
      icon: <CheckCircle2 className="w-5 h-5 text-blue-600" />,
    },
    {
      num: '04',
      title: 'Consultation',
      desc: 'Access full history, reports and AI tools during consultation.',
      icon: <Stethoscope className="w-5 h-5 text-blue-600" />,
    },
    {
      num: '05',
      title: 'Prescription',
      desc: 'Generate digital prescriptions with medicine & lab tests.',
      icon: <Pill className="w-5 h-5 text-blue-600" />,
    },
    {
      num: '06',
      title: 'Lab / Pharmacy',
      desc: 'Order lab tests, dispense medicines and track inventory.',
      icon: <FlaskConical className="w-5 h-5 text-blue-600" />,
    },
    {
      num: '07',
      title: 'Billing & Payment',
      desc: 'Create bills, collect payments and manage dues.',
      icon: <IndianRupee className="w-5 h-5 text-blue-600" />,
    },
    {
      num: '08',
      title: 'Follow-Up',
      desc: 'Send reminders and keep patients engaged with reports.',
      icon: <MessageSquare className="w-5 h-5 text-blue-600" />,
    },
  ];

  return (
    <section id="workflow" className="py-14 sm:py-18 lg:py-24 bg-[#F8FAFC]/70 relative border-y border-slate-100 overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14 lg:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            From Patient Arrival to Complete Care — <span className="text-blue-600">Connected.</span>
          </h2>
          <p className="text-sm sm:text-base text-slate-500 mt-2 font-normal">
            A simple, streamlined workflow for your entire clinic.
          </p>
        </div>

        {/* ── 1. DESKTOP VIEW (≥ 1024px): 8 Columns in 1 Row ── */}
        <div className="workflow-desktop relative">
          {/* Connecting dashed line across all 8 items */}
          <div className="absolute top-7 left-[4%] right-[4%] h-[2px] border-t-2 border-dashed border-blue-200/90 pointer-events-none z-0" />

          <div className="grid grid-cols-8 gap-3 xl:gap-4 relative z-10">
            {steps.map((step, index) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.35, delay: index * 0.04 }}
                className="flex flex-col items-center text-center group relative"
              >
                {/* Circular Icon with number badge */}
                <div className="relative mb-3.5">
                  <div className="w-14 h-14 rounded-full bg-white border-2 border-blue-100 shadow-sm flex items-center justify-center group-hover:border-blue-500 group-hover:shadow-md transition-all duration-300">
                    <div className="w-10 h-10 rounded-full bg-blue-50/80 flex items-center justify-center">
                      {step.icon}
                    </div>
                  </div>
                  {/* Step number badge */}
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-black tracking-wider shadow-xs">
                    {step.num}
                  </span>
                </div>

                {/* Step Title & Desc */}
                <h3 className="text-xs xl:text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-1 leading-snug">
                  {step.title}
                </h3>
                <p className="text-[11px] xl:text-[11.5px] text-slate-500 leading-relaxed font-normal">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── 2. TABLET VIEW (768px to 1023px): 4 Columns × 2 Rows with Cards & Connectors ── */}
        <div className="workflow-tablet flex-col gap-4 sm:gap-5">
          {/* Row 1: Steps 01 to 04 */}
          <div className="relative">
            {/* Dashed connector line behind Row 1 cards */}
            <div className="absolute top-1/2 left-[6%] right-[6%] -translate-y-1/2 h-[2px] border-t-2 border-dashed border-blue-200/90 pointer-events-none z-0" />
            
            <div className="grid grid-cols-4 gap-3 sm:gap-4 relative z-10">
              {steps.slice(0, 4).map((step, index) => (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-30px' }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="bg-white rounded-2xl border border-blue-100/90 shadow-xs hover:shadow-md hover:border-blue-300 transition-all duration-200 p-3 sm:p-3.5 flex items-start gap-2.5 h-full relative z-10 group"
                >
                  {/* Icon container */}
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50/90 border border-blue-100/80 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-105 transition-transform mt-0.5">
                    {React.cloneElement(step.icon, { className: 'w-4 h-4 sm:w-5 sm:h-5 text-blue-600' })}
                  </div>

                  {/* Title with inline circular badge & description */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[9.5px] font-black flex items-center justify-center shadow-xs shrink-0">
                        {step.num}
                      </span>
                      <h3 className="text-xs sm:text-[13px] font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-[10.5px] sm:text-[11px] text-slate-500 leading-snug font-normal">
                      {step.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Row 2: Steps 05 to 08 */}
          <div className="relative">
            {/* Dashed connector line behind Row 2 cards */}
            <div className="absolute top-1/2 left-[6%] right-[6%] -translate-y-1/2 h-[2px] border-t-2 border-dashed border-blue-200/90 pointer-events-none z-0" />
            
            <div className="grid grid-cols-4 gap-3 sm:gap-4 relative z-10">
              {steps.slice(4, 8).map((step, index) => (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-30px' }}
                  transition={{ duration: 0.3, delay: (index + 4) * 0.05 }}
                  className="bg-white rounded-2xl border border-blue-100/90 shadow-xs hover:shadow-md hover:border-blue-300 transition-all duration-200 p-3 sm:p-3.5 flex items-start gap-2.5 h-full relative z-10 group"
                >
                  {/* Icon container */}
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50/90 border border-blue-100/80 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-105 transition-transform mt-0.5">
                    {React.cloneElement(step.icon, { className: 'w-4 h-4 sm:w-5 sm:h-5 text-blue-600' })}
                  </div>

                  {/* Title with inline circular badge & description */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[9.5px] font-black flex items-center justify-center shadow-xs shrink-0">
                        {step.num}
                      </span>
                      <h3 className="text-xs sm:text-[13px] font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-[10.5px] sm:text-[11px] text-slate-500 leading-snug font-normal">
                      {step.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* ── 3. MOBILE VIEW (< 768px): 2 Columns Adapting to Viewport ── */}
        <div className="workflow-mobile">
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            {steps.map((step, index) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-20px' }}
                transition={{ duration: 0.3, delay: index * 0.04 }}
                className="bg-white rounded-xl sm:rounded-2xl border border-blue-100/90 shadow-xs hover:shadow-sm p-3 sm:p-3.5 flex flex-col justify-between h-full group transition-all"
              >
                <div>
                  {/* Top Row: Icon on Left, Circular Badge on Right */}
                  <div className="flex items-center justify-between mb-2 sm:mb-2.5">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-50/90 border border-blue-100/80 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
                      {React.cloneElement(step.icon, { className: 'w-4 h-4 sm:w-4.5 sm:h-4.5 text-blue-600' })}
                    </div>
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[9.5px] font-black flex items-center justify-center shadow-xs shrink-0">
                      {step.num}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-xs sm:text-[13px] font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-1 leading-snug">
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="text-[10px] sm:text-[11px] text-slate-500 leading-relaxed font-normal">
                    {step.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
