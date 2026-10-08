import React from 'react';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { responsiveAssets } from '../../constants/landingAssets';

export default function SolutionsSection({ onSelectSolution }) {
  const solutions = [
    {
      id: 'general-clinics',
      title: 'General Clinics',
      subtitle: 'Streamline everyday practice.',
      image: responsiveAssets.solutions.general,
    },
    {
      id: 'dental-clinics',
      title: 'Dental Clinics',
      subtitle: 'Run your dental practice efficiently.',
      image: responsiveAssets.solutions.dental,
    },
    {
      id: 'eye-clinics',
      title: 'Eye Clinics',
      subtitle: 'Manage eye care with precision.',
      image: responsiveAssets.hero.medicalBackground || responsiveAssets.solutions.general,
    },
    {
      id: 'physiotherapy-clinics',
      title: 'Physiotherapy Clinics',
      subtitle: 'Track progress and treatment plans.',
      image: responsiveAssets.solutions.multiSpecialty,
    },
    {
      id: 'multi-speciality',
      title: 'Multi-Speciality Clinics',
      subtitle: 'Coordinate multiple departments.',
      image: responsiveAssets.solutions.multiSpecialty,
    },
    {
      id: 'diagnostic-centers',
      title: 'Diagnostic Centers',
      subtitle: 'Lab integration and reporting.',
      image: responsiveAssets.solutions.diagnostic,
    },
  ];

  return (
    <section id="solutions" className="py-16 sm:py-20 lg:py-24 bg-white relative">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        
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
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700 transition shrink-0 group"
          >
            <span>Explore All Solutions</span>
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        {/* 6 Solution Cards Grid (6 on Desktop, 3 on Tablet, 1 on Mobile) */}
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
    </section>
  );
}
