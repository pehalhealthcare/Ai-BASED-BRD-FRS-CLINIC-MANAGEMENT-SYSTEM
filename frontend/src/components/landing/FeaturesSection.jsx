import React from 'react';
import { 
  Sparkles, LayoutGrid, Users, ShieldCheck, BarChart3, Cloud, 
  ArrowRight 
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function FeaturesSection({ onExploreFeatures }) {
  const features = [
    {
      id: 'ai-workflows',
      title: 'AI-Powered Workflows',
      desc: 'Automate appointments, prescriptions, follow-ups and more.',
      icon: <Sparkles className="w-6 h-6 text-blue-600" />,
      bgIcon: 'bg-blue-50/90 border border-blue-100',
    },
    {
      id: 'end-to-end',
      title: 'End-to-End Management',
      desc: 'OPD, Lab, Pharmacy, Billing, Inventory — all in one place.',
      icon: <LayoutGrid className="w-6 h-6 text-blue-600" />,
      bgIcon: 'bg-blue-50/90 border border-blue-100',
    },
    {
      id: 'patient-exp',
      title: 'Better Patient Experience',
      desc: 'Faster service, digital records and seamless communication.',
      icon: <Users className="w-6 h-6 text-blue-600" />,
      bgIcon: 'bg-blue-50/90 border border-blue-100',
    },
    {
      id: 'security-compliant',
      title: 'Secure & Compliant',
      desc: 'Built for healthcare workflows with strong data protection.',
      icon: <ShieldCheck className="w-6 h-6 text-blue-600" />,
      bgIcon: 'bg-blue-50/90 border border-blue-100',
    },
    {
      id: 'insights',
      title: 'Actionable Insights',
      desc: 'Real-time reports to help you grow your practice.',
      icon: <BarChart3 className="w-6 h-6 text-blue-600" />,
      bgIcon: 'bg-blue-50/90 border border-blue-100',
    },
    {
      id: 'access-anywhere',
      title: 'Access Anywhere',
      desc: 'Web, tablet and mobile — your clinic in your pocket.',
      icon: <Cloud className="w-6 h-6 text-blue-600" />,
      bgIcon: 'bg-blue-50/90 border border-blue-100',
    },
  ];

  return (
    <section id="features" className="py-16 sm:py-20 lg:py-24 bg-white relative">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        
        {/* Section Header Row */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 sm:mb-12 gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              Everything You Need to Run a{' '}
              <span className="text-blue-600">Modern Clinic</span>
            </h2>
            <p className="text-sm sm:text-base text-slate-500 mt-2 max-w-2xl font-normal">
              A complete, integrated and intelligent platform for today's healthcare providers.
            </p>
          </div>

          <a
            href="#workflow"
            onClick={(e) => {
              e.preventDefault();
              if (onExploreFeatures) {
                onExploreFeatures();
              } else {
                const el = document.getElementById('workflow');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700 transition shrink-0 group"
          >
            <span>Explore All Features</span>
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </a>
        </div>

        {/* 6 Feature Cards Grid (6 in 1 row on Desktop, 3+3 on Tablet, 1 on Mobile) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-4.5">
          {features.map((feat, index) => (
            <motion.div
              key={feat.id}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.35, delay: index * 0.05 }}
              className="bg-[#F8FAFC]/90 hover:bg-white border border-slate-200/80 hover:border-blue-200 rounded-2xl p-4.5 sm:p-5 flex flex-col items-center text-center shadow-xs hover:shadow-lg transition-all duration-300 group"
            >
              <div className={`w-12 h-12 rounded-2xl ${feat.bgIcon} flex items-center justify-center mb-3.5 group-hover:scale-105 transition-transform shadow-xs`}>
                {feat.icon}
              </div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-1.5 leading-snug">
                {feat.title}
              </h3>
              <p className="text-[12px] text-slate-500 leading-relaxed font-normal">
                {feat.desc}
              </p>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
