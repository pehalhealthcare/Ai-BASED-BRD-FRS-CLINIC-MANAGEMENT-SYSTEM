import React from 'react';
import { 
  FileText, Calendar, CheckCircle2, Stethoscope, 
  Pill, FlaskConical, IndianRupee, MessageSquare, ArrowRight 
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
    <section id="workflow" className="py-16 sm:py-20 lg:py-24 bg-[#F8FAFC]/70 relative border-y border-slate-100">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            From Patient Arrival to Complete Care — <span className="text-blue-600">Connected.</span>
          </h2>
          <p className="text-sm sm:text-base text-slate-500 mt-2 font-normal">
            A simple, streamlined workflow for your entire clinic.
          </p>
        </div>

        {/* 8-Step Connected Workflow */}
        <div className="relative">
          {/* Desktop connecting dotted line across all 8 items */}
          <div className="hidden lg:block absolute top-7 left-[4%] right-[4%] h-[2px] border-t-2 border-dashed border-blue-200/80 pointer-events-none z-0" />

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-6 sm:gap-4 relative z-10">
            {steps.map((step, index) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.35, delay: index * 0.05 }}
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
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-black tracking-wider">
                    {step.num}
                  </span>
                </div>

                {/* Step Title & Desc */}
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-1 leading-snug">
                  {step.title}
                </h3>
                <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
