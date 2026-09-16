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
      id: 'multi-speciality',
      title: 'Multi-Speciality Clinics',
      subtitle: 'Manage multiple departments.',
      image: responsiveAssets.solutions.multiSpecialty,
    },
    {
      id: 'diagnostic-centers',
      title: 'Diagnostic Centers',
      subtitle: 'Lab integration & reporting.',
      image: responsiveAssets.solutions.diagnostic,
    },
    {
      id: 'dental-specialty',
      title: 'Dental & Specialty',
      subtitle: 'Tailored for your specialty.',
      image: responsiveAssets.solutions.dental,
    },
  ];

  return (
    <section id="solutions" className="py-16 sm:py-20 lg:py-24 bg-[#F8FAFC] relative">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 sm:mb-12 gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              Solutions for <span className="text-blue-600">Every Practice</span>
            </h2>
            <p className="text-sm sm:text-base text-slate-500 mt-2 max-w-2xl">
              Whether you're a single-doctor clinic or a multi-speciality center, AI-CMS adapts to your needs.
            </p>
          </div>

          <a
            href="#hero"
            onClick={(e) => {
              e.preventDefault();
              if (onSelectSolution) onSelectSolution();
            }}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700 transition shrink-0 group"
          >
            <span>View All Solutions</span>
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </a>
        </div>

        {/* 4 Solution Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {solutions.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              onClick={() => onSelectSolution && onSelectSolution(item.id)}
              className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-3 sm:p-4 flex flex-col shadow-sm hover:shadow-xl hover:border-blue-300 transition-all duration-300 group cursor-pointer"
            >
              {/* Image Container with Rounded Style */}
              <div className="relative aspect-[4/3] w-full rounded-xl sm:rounded-2xl overflow-hidden mb-3 bg-slate-100">
                <img
                  src={item.image}
                  alt={item.title}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>

              {/* Card Footer Info */}
              <div className="flex items-center justify-between pt-1 px-1">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {item.subtitle}
                  </p>
                </div>

                <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-blue-600 group-hover:text-white text-slate-400 flex items-center justify-center transition-all shrink-0">
                  <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
