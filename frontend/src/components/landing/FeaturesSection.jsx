import React from 'react';
import { 
  Sparkles, Calendar, Users, ShieldCheck, BarChart3, Cloud, 
  ArrowRight 
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function FeaturesSection({ onExploreFeatures }) {
  const features = [
    {
      id: 'ai-workflows',
      title: 'AI-Powered Workflows',
      desc: 'Automate OPD, prescriptions, follow-ups and more.',
      icon: <Sparkles className="w-[26px] h-[26px] text-blue-600" />,
      bgIcon: 'bg-blue-50 text-blue-600',
    },
    {
      id: 'end-to-end',
      title: 'End-to-End Management',
      desc: 'OPD, IPD, Lab, Pharmacy, Billing, Inventory – all in one place.',
      icon: <Calendar className="w-[26px] h-[26px] text-blue-600" />,
      bgIcon: 'bg-blue-50 text-blue-600',
    },
    {
      id: 'patient-exp',
      title: 'Better Patient Experience',
      desc: 'Faster service, digital records and seamless communication.',
      icon: <Users className="w-[26px] h-[26px] text-cyan-600" />,
      bgIcon: 'bg-cyan-50 text-cyan-600',
    },
    {
      id: 'security-compliant',
      title: 'Secure & Compliant',
      desc: 'Built for Indian healthcare standards with enterprise-grade security.',
      icon: <ShieldCheck className="w-[26px] h-[26px] text-rose-500" />,
      bgIcon: 'bg-rose-50 text-rose-500',
    },
    {
      id: 'insights',
      title: 'Actionable Insights',
      desc: 'Real-time reports to help you grow your practice.',
      icon: <BarChart3 className="w-[26px] h-[26px] text-blue-600" />,
      bgIcon: 'bg-blue-50 text-blue-600',
    },
    {
      id: 'access-anywhere',
      title: 'Access Anywhere',
      desc: 'Web, tablet and mobile – your clinic in your pocket.',
      icon: <Cloud className="w-[26px] h-[26px] text-blue-500" />,
      bgIcon: 'bg-blue-50 text-blue-500',
    },
  ];

  return (
    <section id="features" className="why-ai-cms-section">
      <div className="why-ai-cms-inner">
        
        {/* Section Header Row */}
        <div className="why-ai-cms-heading-row">
          <div className="why-ai-cms-heading-col">
            <div className="why-ai-cms-badge">
              WHY AI-CMS
            </div>
            <h2 className="why-ai-cms-heading">
              Everything You Need to Run a{' '}
              <span className="why-ai-cms-heading-accent">Modern Clinic</span>
            </h2>
            <p className="why-ai-cms-subtitle">
              A complete, integrated and intelligent platform for today's healthcare providers.
            </p>
          </div>

          <a
            href="#product"
            onClick={(e) => {
              e.preventDefault();
              if (onExploreFeatures) {
                onExploreFeatures();
              } else {
                const el = document.getElementById('product');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="why-ai-cms-explore-link group"
          >
            <span>Explore All Features</span>
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </a>
        </div>

        {/* 6 Feature Cards Grid */}
        <div className="why-ai-cms-grid">
          {features.map((feat, index) => (
            <motion.div
              key={feat.id}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.35, delay: index * 0.05 }}
              className="why-ai-cms-card"
            >
              <div className={`why-ai-cms-icon-wrapper ${feat.bgIcon}`}>
                {feat.icon}
              </div>
              <h3 className="why-ai-cms-card-title">
                {feat.title}
              </h3>
              <p className="why-ai-cms-card-desc">
                {feat.desc}
              </p>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
