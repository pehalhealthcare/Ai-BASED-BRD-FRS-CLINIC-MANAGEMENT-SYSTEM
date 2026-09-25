import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, LogIn, Menu, X, ArrowRight, User, Building2, 
  Stethoscope, ChevronDown 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PehalLogo from '../common/PehalLogo';

export default function Header({ 
  onSetupClinic, 
  activeSection = 'hero', 
  onNavClick,
  isAuthenticated = false,
  user = null
}) {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoginDropdownOpen, setIsLoginDropdownOpen] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const lastScrollY = useRef(0);
  const loginDropdownRef = useRef(null);
  const searchContainerRef = useRef(null);

  const navLinks = [
    { label: 'Home', href: '#hero', id: 'hero', isPrimary: true },
    { label: 'Product', href: '#product', id: 'product', isPrimary: true },
    { label: 'Features', href: '#features', id: 'features', isPrimary: true },
    { label: 'Pricing', href: '#pricing', id: 'pricing', isPrimary: true },
    { label: 'Solutions', href: '#solutions', id: 'solutions', isPrimary: false },
    { label: 'About', href: '#footer', id: 'footer', isPrimary: false },
  ];

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (loginDropdownRef.current && !loginDropdownRef.current.contains(e.target)) {
        setIsLoginDropdownOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lock body scroll when mobile menu is active
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // Smart header hide/reveal on scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > 120 && currentScrollY > lastScrollY.current && !isMobileMenuOpen) {
        setShowHeader(false);
      } else {
        setShowHeader(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobileMenuOpen]);

  // Handle escape key to close menus
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
        setIsSearchOpen(false);
        setIsLoginDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLinkClick = (e, item) => {
    e.preventDefault();

    // Capture values synchronously — do NOT pass the SyntheticEvent into any
    // async context (it gets nullified after the handler returns in React 16,
    // and even in React 17+ it's safer to copy primitive values out).
    const sectionId = item.id;
    const href = item.href;

    // 1. Immediately restore body scroll (synchronously, before React re-renders).
    //    The useEffect that normally clears overflow only runs after the next render
    //    so we must do it here to unblock window.scrollTo.
    document.body.style.overflow = '';

    // 2. Close the drawer (triggers Framer Motion exit animation: 250ms).
    setIsMobileMenuOpen(false);

    // 3. Also notify parent so it can update activeSection state.
    if (onNavClick) {
      // Pass null for event since we already called preventDefault above.
      onNavClick(null, sectionId, href);
    }

    // 4. Wait for the drawer exit animation to complete before scrolling.
    //    If we scroll while the drawer is still collapsing, getBoundingClientRect
    //    returns wrong positions because the drawer height is still shifting layout.
    //    The exit animation duration is 250ms — we wait 300ms to be safe.
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (!el) return;

      if (sectionId === 'hero') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        // Use scrollIntoView so scroll-margin-top (set in CSS) handles header offset.
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 300);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const query = searchQuery.toLowerCase();
    
    // Quick section jump based on search
    if (query.includes('price') || query.includes('cost') || query.includes('plan')) {
      const el = document.getElementById('pricing');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else if (query.includes('feature') || query.includes('opd') || query.includes('emr') || query.includes('workflow')) {
      const el = document.getElementById('features');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else if (query.includes('product') || query.includes('laptop') || query.includes('copilot') || query.includes('assistant')) {
      const el = document.getElementById('product');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else if (query.includes('solution') || query.includes('clinic') || query.includes('hospital') || query.includes('dental') || query.includes('diagnostic')) {
      const el = document.getElementById('solutions');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else if (query.includes('about') || query.includes('contact') || query.includes('pehal')) {
      const el = document.getElementById('footer');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  return (
    <header
      className={`site-header-wrapper${
        !showHeader && !isMobileMenuOpen ? ' header-hidden' : ''
      }`}
    >
      <div 
        className={`site-header-container ${
          isMobileMenuOpen ? 'menu-open' : ''
        }`}
      >
        {/* ── HEADER MAIN BAR ── */}
        <div className="site-header-inner">
          
          {/* 1. Brand Area (Flex-shrink 0, non-wrapping) */}
          <div className="site-header-brand">
            <Link 
              to="/" 
              onClick={(e) => handleLinkClick(e, { id: 'hero', href: '#hero' })}
              className="flex items-center gap-2 sm:gap-2.5 lg:gap-3 group focus:outline-none shrink-0"
            >
              <div className="h-8 sm:h-10 lg:h-11 flex items-center shrink-0">
                <PehalLogo 
                  variant="primary" 
                  className="h-8 sm:h-10 lg:h-11 w-auto transition-transform duration-200 group-hover:scale-[1.03]" 
                />
              </div>
              <div className="h-6 sm:h-7 w-[1.5px] bg-slate-200 hidden sm:block mx-0.5 shrink-0" />
              <div className="flex flex-col justify-center leading-none shrink-0">
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="text-base sm:text-xl lg:text-[22px] font-black tracking-tight text-slate-900 leading-none">
                    AI-CMS
                  </span>
                  <span className="text-[8.5px] sm:text-[9.5px] lg:text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-1.5 sm:px-2 py-0.5 rounded-full shadow-xs leading-none">
                    PRO
                  </span>
                </div>
                <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 hidden md:inline-block tracking-tight mt-0.5 whitespace-nowrap">
                  AI-CMS Enterprise
                </span>
              </div>
            </Link>
          </div>

          {/* 2. Desktop Navigation (Priority responsive items) */}
          <nav 
            className="site-header-nav"
            aria-label="Main Navigation"
          >
            {navLinks.map((item) => {
              const isActive = (activeSection || 'hero') === item.id;
              return (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={(e) => handleLinkClick(e, item)}
                  className={`relative px-3 xl:px-4 py-2 text-sm font-semibold transition-all duration-200 rounded-full flex items-center justify-center whitespace-nowrap ${
                    !item.isPrimary ? 'nav-item-secondary' : ''
                  } ${
                    isActive 
                      ? 'text-blue-600 font-bold bg-blue-50/80' 
                      : 'text-slate-600 hover:text-blue-600 hover:bg-slate-100/60'
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeNavIndicator"
                      className="absolute -bottom-1 left-3 right-3 h-[2.5px] bg-blue-600 rounded-full shadow-xs shadow-blue-500/40"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </a>
              );
            })}
          </nav>

          {/* 3. Action CTAs (Search, Login, Setup CTA, Hamburger) */}
          <div className="site-header-actions">
            
            {/* Search Trigger Button (Tablet + Desktop) */}
            <div className="header-btn-search relative" ref={searchContainerRef}>
              <button
                type="button"
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="w-9 h-9 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-full flex items-center justify-center text-slate-600 hover:text-blue-600 bg-white/90 hover:bg-blue-50/60 transition-all border border-slate-200/90 shadow-xs hover:shadow"
                aria-label="Search site"
                title="Search AI-CMS"
              >
                <Search size={17} className="stroke-[2.2]" />
              </button>

              {/* Search Popover Dialog */}
              <AnimatePresence>
                {isSearchOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-13 sm:top-14 w-72 sm:w-80 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 z-50"
                  >
                    <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search product, features, pricing..."
                        className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-medium"
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-500 shrink-0 transition shadow-sm"
                      >
                        Go
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Login Menu Dropdown (Tablet + Desktop) */}
            <div className="header-btn-login relative" ref={loginDropdownRef}>
              <button
                type="button"
                onClick={() => setIsLoginDropdownOpen(!isLoginDropdownOpen)}
                className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 lg:px-5 h-9 sm:h-10 lg:h-11 rounded-full text-slate-700 hover:text-blue-600 bg-white/90 hover:bg-blue-50/60 text-xs sm:text-sm font-semibold transition-all border border-slate-200/90 hover:border-blue-200 shadow-xs whitespace-nowrap"
              >
                <LogIn size={15} className="text-slate-500 shrink-0" />
                <span>Login</span>
                <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 shrink-0 ${isLoginDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Login Dropdown Options */}
              <AnimatePresence>
                {isLoginDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-13 sm:top-14 w-60 bg-white border border-slate-200/90 rounded-2xl shadow-xl p-2 z-50 flex flex-col gap-1"
                  >
                    <Link
                      to="/login?type=clinic"
                      onClick={() => setIsLoginDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-blue-50/80 text-slate-700 hover:text-blue-600 text-xs sm:text-sm font-medium transition"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        <Building2 size={16} className="text-blue-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 leading-tight">Clinic Admin</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Manage clinic, billing & staff</div>
                      </div>
                    </Link>

                    <Link
                      to="/login?type=staff"
                      onClick={() => setIsLoginDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-blue-50/80 text-slate-700 hover:text-blue-700 text-xs sm:text-sm font-medium transition"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        <Stethoscope size={16} className="text-blue-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 leading-tight">Doctor & Staff</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">EMR, pharmacy & lab</div>
                      </div>
                    </Link>

                    <Link
                      to="/login?type=patient"
                      onClick={() => setIsLoginDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-indigo-50/80 text-slate-700 hover:text-indigo-700 text-xs sm:text-sm font-medium transition"
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                        <User size={16} className="text-indigo-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 leading-tight">Patient Portal</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Appointments & records</div>
                      </div>
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Primary CTA: Setup Your Clinic (Visible on Large Desktop >= 1200px) */}
            <button
              onClick={onSetupClinic}
              className="header-btn-cta items-center gap-2 px-4 sm:px-5 lg:px-6 h-9 sm:h-10 lg:h-11 rounded-full bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/25 hover:shadow-lg hover:shadow-blue-600/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 shrink-0 group whitespace-nowrap"
              aria-label="Setup Your Clinic"
            >
              <span>Setup Your Clinic</span>
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
            </button>

            {/* Hamburger Button (< 1200px: Mobile, Tablet, Medium Desktop) */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="header-btn-hamburger rounded-full text-slate-700 hover:bg-slate-100/80 bg-white/90 border border-slate-200/90 transition shadow-xs shrink-0"
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* ── EXPANDABLE NAVIGATION DRAWER (< 1200px) ── */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="border-t border-slate-100 px-4 sm:px-6 py-5 overflow-hidden flex flex-col gap-4"
            >
              {/* Search Bar inside Drawer */}
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search AI-CMS features, pricing..."
                    className="w-full text-xs sm:text-sm pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-medium"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shrink-0 shadow-sm"
                >
                  Search
                </button>
              </form>

              {/* Navigation Links Grid / List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {navLinks.map((item) => {
                  const isActive = (activeSection || 'hero') === item.id;
                  return (
                    <a
                      key={item.id}
                      href={item.href}
                      onClick={(e) => handleLinkClick(e, item)}
                      className={`flex items-center justify-between py-2.5 px-3.5 rounded-xl text-sm font-semibold transition min-h-[44px] ${
                        isActive 
                          ? 'bg-blue-50 text-blue-600' 
                          : 'text-slate-700 hover:bg-slate-50 hover:text-blue-600'
                      }`}
                    >
                      <span>{item.label}</span>
                      <ArrowRight size={14} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
                    </a>
                  );
                })}
              </div>

              {/* Account Access Section */}
              <div className="border-t border-slate-100 pt-3 flex flex-col gap-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
                  Portals & Login
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Link
                    to="/login?type=clinic"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/90 text-slate-700 text-xs font-semibold min-h-[44px] hover:bg-blue-50"
                  >
                    <Building2 size={16} className="text-blue-600 shrink-0" />
                    <span>Clinic Admin</span>
                  </Link>
                  <Link
                    to="/login?type=staff"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/90 text-slate-700 text-xs font-semibold min-h-[44px] hover:bg-blue-50"
                  >
                    <Stethoscope size={16} className="text-blue-600 shrink-0" />
                    <span>Doctor & Staff</span>
                  </Link>
                  <Link
                    to="/login?type=patient"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/90 text-slate-700 text-xs font-semibold min-h-[44px] hover:bg-indigo-50"
                  >
                    <User size={16} className="text-indigo-600 shrink-0" />
                    <span>Patient Portal</span>
                  </Link>
                </div>
              </div>

              {/* Setup Your Clinic Button (Full-Width inside Drawer) */}
              <div className="pt-2">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onSetupClinic();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-md shadow-blue-600/20 active:scale-[0.99] min-h-[44px]"
                >
                  <span>Setup Your Clinic</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
