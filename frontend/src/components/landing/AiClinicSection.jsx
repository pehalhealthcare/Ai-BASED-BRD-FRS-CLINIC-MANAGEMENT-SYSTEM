import React from 'react';
import { 
  Calendar, Stethoscope, Sparkles, Pill, 
  FlaskConical, Activity, ArrowRight, ShieldCheck 
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function AiClinicSection({ onExploreAi }) {
  const aiFeatures = [
    {
      id: 'ai-sched',
      title: 'AI Appointment Scheduling',
      desc: 'Suggests best slots based on doctor availability and patient preferences.',
      icon: <Calendar className="w-5 h-5 text-blue-600" />,
      bgIcon: 'bg-blue-50/80 border border-blue-100',
    },
    {
      id: 'ai-symptom',
      title: 'AI Symptom Checker',
      desc: 'Helps understand patient symptoms for better triage and consultation.',
      icon: <Stethoscope className="w-5 h-5 text-emerald-600" />,
      bgIcon: 'bg-emerald-50/80 border border-emerald-100',
    },
    {
      id: 'ai-assist',
      title: 'AI Consultation Assistant',
      desc: 'Summarizes patient history, reports and suggests clinical insights.',
      icon: <Sparkles className="w-5 h-5 text-indigo-600" />,
      bgIcon: 'bg-indigo-50/80 border border-indigo-100',
    },
    {
      id: 'ai-rx',
      title: 'AI Prescription Suggestions',
      desc: 'Suggests medicines, dosages and cautions for doctor review.',
      icon: <Pill className="w-5 h-5 text-amber-600" />,
      bgIcon: 'bg-amber-50/80 border border-amber-100',
    },
    {
      id: 'ai-lab',
      title: 'AI Lab Recommendation',
      desc: 'Recommends relevant lab tests based on symptoms & findings.',
      icon: <FlaskConical className="w-5 h-5 text-cyan-600" />,
      bgIcon: 'bg-cyan-50/80 border border-cyan-100',
    },
    {
      id: 'ai-risk',
      title: 'AI Patient Risk Scoring',
      desc: 'Identifies high-risk patients for early intervention and follow-up.',
      icon: <Activity className="w-5 h-5 text-rose-600" />,
      bgIcon: 'bg-rose-50/80 border border-rose-100',
    },
  ];

  return (
    <section id="ai-features" className="py-16 sm:py-20 lg:py-24 bg-white relative">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        
        {/* Section Heading */}
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
            onClick={(e) => {
              e.preventDefault();
              if (onExploreAi) {
                onExploreAi();
              } else {
                const el = document.getElementById('ecosystem');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700 transition shrink-0 group"
          >
            <span>Explore AI Features</span>
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </a>
        </div>

        {/* 6 AI Cards in 2x3 Grid */}
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

        {/* Clinical Safety & Decision Responsibility Notice */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-center justify-center gap-2.5 text-center text-xs text-slate-600">
          <ShieldCheck size={16} className="text-blue-600 shrink-0" />
          <span>
            <strong>AI Safety Notice:</strong> AI-assisted recommendations are provided for clinician review. The final clinical decision remains strictly with the authorized healthcare professional.
          </span>
        </div>

      </div>
    </section>
  );
}
