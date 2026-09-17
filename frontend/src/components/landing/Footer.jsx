import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Linkedin, Youtube, Twitter, Instagram, Facebook, 
  ChevronDown, Globe, Heart, Activity 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PehalLogo from '../common/PehalLogo';

export default function Footer() {
  const [expandedMobileSection, setExpandedMobileSection] = useState(null);

  const toggleMobileSection = (sectionName) => {
    setExpandedMobileSection(prev => (prev === sectionName ? null : sectionName));
  };

  const footerGroups = [
    {
      title: 'Product',
      links: [
        { label: 'Features', href: '#features' },
        { label: 'Pricing', href: '#pricing' },
        { label: 'Integrations', href: '#features' },
        { label: "What's New", href: '#product' },
      ],
    },
    {
      title: 'Solutions',
      links: [
        { label: 'For Clinics', href: '#solutions' },
        { label: 'For Hospitals', href: '#solutions' },
        { label: 'For Diagnostic Centers', href: '#solutions' },
        { label: 'For Dental Practices', href: '#solutions' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'Book a Demo', href: '/book-demo' },
        { label: 'Contact Support', href: '/contact-support' },
        { label: 'Help Center', href: '/contact-support' },
        { label: 'Case Studies', href: '#hero' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About Us', href: '#hero' },
        { label: 'Contact Support', href: '/contact-support' },
        { label: 'Book a Demo', href: '/book-demo' },
        { label: 'Careers', href: '#hero' },
      ],
    },
  ];

  const socialLinks = [
    { name: 'LinkedIn', icon: <Linkedin size={18} />, href: 'https://linkedin.com' },
    { name: 'YouTube', icon: <Youtube size={18} />, href: 'https://youtube.com' },
    { name: 'Twitter', icon: <Twitter size={18} />, href: 'https://twitter.com' },
    { name: 'Instagram', icon: <Instagram size={18} />, href: 'https://instagram.com' },
    { name: 'Facebook', icon: <Facebook size={18} />, href: 'https://facebook.com' },
  ];

  return (
    <footer id="footer" className="bg-white border-t border-slate-200/80 pt-12 sm:pt-16 pb-10 text-slate-600 text-sm">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        
        {/* Top Grid for Desktop / Tablet */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 lg:gap-6 pb-12 border-b border-slate-200/80">
          
          {/* Logo & Platform Info (lg:col-span-2 on desktop) */}
          <div className="lg:col-span-2 flex flex-col items-start">
            <Link to="/" className="flex items-center gap-3 mb-4">
              <div className="h-10 flex items-center">
                <PehalLogo variant="primary" className="h-10 w-auto" />
              </div>
              <div className="flex flex-col justify-center leading-none">
                <span className="text-lg font-black tracking-tight text-slate-900">
                  AI-CMS
                </span>
                <span className="text-[11px] font-medium text-slate-500">
                  AI-CMS Enterprise
                </span>
              </div>
            </Link>

            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-sm mb-4">
              Empowering healthcare providers across India with next-generation clinical workflows, intelligent queueing, and secure EMR management.
            </p>
          </div>

          {/* Desktop & Tablet Footer Links */}
          <div className="hidden sm:contents">
            {footerGroups.map((group) => (
              <div key={group.title} className="flex flex-col">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3.5">
                  {group.title}
                </h4>
                <ul className="flex flex-col gap-2.5">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      {link.href.startsWith('/') ? (
                        <Link
                          to={link.href}
                          className="text-xs sm:text-[13px] text-slate-600 hover:text-blue-600 transition-colors"
                        >
                          {link.label}
                        </Link>
                      ) : (
                        <a
                          href={link.href}
                          className="text-xs sm:text-[13px] text-slate-600 hover:text-blue-600 transition-colors"
                        >
                          {link.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Mobile Accordion View (< 640px) */}
          <div className="sm:hidden flex flex-col divide-y divide-slate-100">
            {footerGroups.map((group) => {
              const isOpen = expandedMobileSection === group.title;
              return (
                <div key={group.title} className="py-2.5">
                  <button
                    onClick={() => toggleMobileSection(group.title)}
                    className="w-full flex items-center justify-between py-2 text-left text-sm font-bold text-slate-900"
                  >
                    <span>{group.title}</span>
                    <ChevronDown
                      size={16}
                      className={`text-slate-400 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-blue-600' : ''
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.ul
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden flex flex-col gap-2 pt-2 pb-3 pl-2"
                      >
                        {group.links.map((link) => (
                          <li key={link.label}>
                            {link.href.startsWith('/') ? (
                              <Link
                                to={link.href}
                                className="text-xs text-slate-600 hover:text-blue-600 block py-1"
                              >
                                {link.label}
                              </Link>
                            ) : (
                              <a
                                href={link.href}
                                className="text-xs text-slate-600 hover:text-blue-600 block py-1"
                              >
                                {link.label}
                              </a>
                            )}
                          </li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Follow Us Column */}
          <div className="flex flex-col">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3.5">
              Follow Us
            </h4>
            <div className="flex items-center gap-2.5">
              {socialLinks.map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  className="w-9 h-9 rounded-full bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-600 flex items-center justify-center transition-colors shadow-sm"
                  aria-label={s.name}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

        </div>

        {/* Bottom Row: Legal, Language & Tagline */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          {/* Copyright */}
          <div>
            © 2025 Pehal Healthcare. All rights reserved.
          </div>

          {/* Legal Links */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <a href="#footer" className="hover:text-blue-600 transition">Privacy Policy</a>
            <span>•</span>
            <a href="#footer" className="hover:text-blue-600 transition">Terms of Service</a>
            <span>•</span>
            <a href="#footer" className="hover:text-blue-600 transition">Data Security</a>
            <span>•</span>
            <a href="#footer" className="hover:text-blue-600 transition">Sitemap</a>
          </div>

          {/* Language & Health Emblem */}
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs">
              <Globe size={13} />
              <span>English</span>
              <ChevronDown size={11} />
            </div>

            <div className="inline-flex items-center gap-1.5 text-blue-600 font-medium">
              <Activity size={14} className="animate-pulse" />
              <span>Healthcare for a Healthier Tomorrow.</span>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
}
