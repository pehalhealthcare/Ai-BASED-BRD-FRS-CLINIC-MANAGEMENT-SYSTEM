import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Building2, User, Sparkles, Shield, Database,
  Users, ArrowRight, Activity, Calendar, 
  FileText, Pill, FlaskConical, CreditCard,
  Plus, CheckCircle, Star, LogIn, Sparkle, CheckCircle2, ChevronRight, Check, Package, Crown, Zap, HelpCircle, Linkedin, Twitter, Facebook, Instagram, Github,
  Laptop, Tablet, Smartphone, Eye, ArrowUpRight, CheckSquare, XCircle, Stethoscope, AlertTriangle, MessageSquare, PhoneCall, ShieldAlert, Globe, Menu, X
} from 'lucide-react';
import useAuth from '../hooks/useAuth';
import { getDefaultRouteForRole } from '../constants/routes';
import PehalLogo from '../components/common/PehalLogo';
import dashboardIllustration from '../assets/dashboard_illustration.svg';
import { subscriptionApi, faqApi } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';

function CountUp({ end, duration = 1500 }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let target = parseFloat(end.replace(/[^\d.]/g, ''));
    let suffix = end.replace(/[\d.]/g, '');
    let isFloat = end.includes('.');
    
    let startTime = null;
    let animationFrameId;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      let currentVal = progress * target;
      if (isFloat) {
        setCount(currentVal.toFixed(2) + suffix);
      } else {
        setCount(Math.floor(currentVal) + suffix);
      }
      
      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [end, duration]);

  return <span>{count}</span>;
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  
  const [activeFaq, setActiveFaq] = useState(null);
  const [activeModuleTab, setActiveModuleTab] = useState('doctor');
  const [showHeader, setShowHeader] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSetupClinicClick = () => {
    if (!isAuthenticated) {
      navigate('/clinic/register');
      return;
    }

    if (user?.role === 'ADMIN' && user?.clinic) {
      if (user.clinic.isOnboardingCompleted) {
        navigate('/clinic/dashboard');
      } else {
        navigate('/clinic/onboarding');
      }
    } else {
      navigate('/clinic/register');
    }
  };

  // Dynamic Pricing state variables
  const [plans, setPlans] = useState([]);
  const [activePlanId, setActivePlanId] = useState(null);
  const [hoveredPlanId, setHoveredPlanId] = useState(null);
  const [activeSecId, setActiveSecId] = useState('sec0');
  const [loadingPlans, setLoadingPlans] = useState(true);
  const sliderRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const loadPlans = useCallback(async () => {
    try {
      const res = await subscriptionApi.getPublicPlans();
      const list = res?.data?.plans ?? res?.plans ?? [];
      const sorted = [...list].sort((a, b) => (a.priceMonthly || 0) - (b.priceMonthly || 0));
      setPlans(sorted);
      if (sorted.length > 0) {
        const popIndex = sorted.findIndex(p => p.isPopular || p.popular || p.badge);
        setActivePlanId(sorted[popIndex !== -1 ? popIndex : 0]?._id);
      }
    } catch (err) {
      console.error('Failed to load pricing plans:', err);
      const fallback = [
        { _id: 'starter', name: 'AI Starter Clinic', desc: 'Ideal for independent doctor clinics.', priceMonthly: 999, features: ['Upto 2 Active Users', 'Basic EMR Module', 'Appointment Scheduling', 'Billing & Invoicing'], badge: 'Starter' },
        { _id: 'professional', name: 'AI Professional Clinic', desc: 'Best for growing multi-doctor clinics.', priceMonthly: 2499, features: ['Upto 10 Active Users', 'Advanced EMR & Lab Modules', 'Pharmacy Inventory Control', 'SSO & OTP Logins', 'AI Assistant triage'], popular: true, badge: 'Most Popular' },
        { _id: 'enterprise', name: 'Enterprise Clinic', desc: 'Custom security and hospital scalability.', priceMonthly: 0, priceCustom: true, features: ['Unlimited Users & Branches', 'Custom integration APIs', 'Dedicated database instance', '24/7 SLA Support', 'AI Voice Transcription'], badge: 'Enterprise' }
      ];
      setPlans(fallback);
      setActivePlanId('professional');
    } finally {
      setLoadingPlans(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - sliderRef.current.offsetLeft);
    setScrollLeft(sliderRef.current.scrollLeft);
  };
  const handleMouseLeave = () => {
    setIsDragging(false);
  };
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - sliderRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    sliderRef.current.scrollLeft = scrollLeft - walk;
  };

  // Dynamic FAQ state variables
  const [faqs, setFaqs] = useState([]);
  const [loadingFaqs, setLoadingFaqs] = useState(true);
  const [faqSearchQuery, setFaqSearchQuery] = useState('');
  const [faqSelectedCategory, setFaqSelectedCategory] = useState('All');

  const loadFaqs = useCallback(async () => {
    try {
      const res = await faqApi.getFaqs();
      const list = res?.data?.faqs ?? res?.faqs ?? [];
      setFaqs(list);
    } catch (err) {
      console.error('Failed to load FAQs:', err);
      // Fallback matching the requested layout design
      const fallback = [
        { _id: 'faq1', q: 'Is the PEHAL AI-CMS platform HIPAA compliant?', a: 'Yes, PEHAL AI-CMS is fully HIPAA compliant. We follow industry-standard security protocols, data encryption, role-based access control, audit logs, and secure cloud infrastructure to ensure complete protection of patient data and privacy.', category: 'Security', icon: 'Shield', illustration: 'security_shield' },
        { _id: 'faq2', q: 'Can I manage multiple clinic branches from one account?', a: 'Absolutely. The multi-branch dashboard allows clinic administrators to track schedules, billing, inventory, and staff rosters across multiple locations from one centralized account.', category: 'Branches', icon: 'Hospital', illustration: 'hospital_network' },
        { _id: 'faq3', q: 'How does the AI Consultation Assistant work?', a: 'The AI assistant transcribes doctor-patient conversations in real-time, extracts key symptoms and diagnosis notes, and automatically populates the digital EMR templates for doctor review.', category: 'AI', icon: 'Brain', illustration: 'ai_assistant' },
        { _id: 'faq4', q: 'Is my data safe and how is it backed up?', a: 'Your data is securely hosted with automated real-time replication and daily encrypted backups to ensure high availability and robust data safety.', category: 'Cloud', icon: 'Cloud', illustration: 'cloud_backup' },
        { _id: 'faq5', q: 'Do you provide training and customer support?', a: 'Yes, we offer comprehensive training modules and 24/7 dedicated customer support to ensure your clinic operates without any operational disruption.', category: 'Support', icon: 'Support', illustration: 'customer_support' }
      ];
      setFaqs(fallback);
    } finally {
      setLoadingFaqs(false);
    }
  }, []);

  useEffect(() => {
    loadFaqs();
  }, [loadFaqs]);

  // AI Assistant Chat interactive state
  const [typedPlaceholder, setTypedPlaceholder] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(true);
  const [chatInputValue, setChatInputValue] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);

  const placeholders = useMemo(() => [
    "Ask anything about the patient...",
    "Book Rahul's follow-up appointment...",
    "Generate prescription...",
    "Suggest alternative medicine..."
  ], []);

  const [chatMessages, setChatMessages] = useState([
    { id: 1, sender: 'ai', text: "Hello, I've analyzed patient Rahul's historical health record. Recommend cardiologist consultation due to recurring arrhythmia flags.", time: '02:58 PM', showMedication: false },
    { id: 2, sender: 'doctor', text: "Agreed. Book slot with cardiologist on Tuesday.", time: '02:59 PM', isSigned: true },
    { id: 3, sender: 'ai', text: "Tuesday 03:00 PM slot selected. Recommended medicines generated:", time: '03:00 PM', showMedication: true }
  ]);

  const [isInputFocused, setIsInputFocused] = useState(false);

  // Typewriter logic with humanized typing variations, commas/periods pauses
  useEffect(() => {
    if (isInputFocused || chatInputValue) {
      // Pause typing when focused or typing
      return;
    }

    let timer;
    const currentFullText = placeholders[placeholderIndex];

    const handleType = () => {
      if (isDeleting) {
        setTypedPlaceholder(currentFullText.substring(0, charIndex - 1));
        setCharIndex(prev => prev - 1);
      } else {
        setTypedPlaceholder(currentFullText.substring(0, charIndex + 1));
        setCharIndex(prev => prev + 1);
      }
    };

    if (!isDeleting && charIndex === currentFullText.length) {
      // Full sentence typed, pause
      timer = setTimeout(() => setIsDeleting(true), 1200);
    } else if (isDeleting && charIndex === 0) {
      // Finished deleting, move to next
      setIsDeleting(false);
      setPlaceholderIndex(prev => (prev + 1) % placeholders.length);
    } else {
      // Regular typing or deleting with delays
      const delay = isDeleting 
        ? 25 // deleting speed: 20-30ms
        : (currentFullText[charIndex] === ',' || currentFullText[charIndex] === '.')
          ? 380 // pause after commas/periods
          : Math.floor(Math.random() * 20) + 45; // typing speed: 45-65ms

      timer = setTimeout(handleType, delay);
    }

    return () => clearTimeout(timer);
  }, [charIndex, isDeleting, placeholderIndex, placeholders, isInputFocused, chatInputValue]);

  // When input loses focus and is empty, reset typewriter to beginning
  useEffect(() => {
    if (!isInputFocused && !chatInputValue) {
      setPlaceholderIndex(0);
      setCharIndex(0);
      setIsDeleting(false);
      setTypedPlaceholder('');
    }
  }, [isInputFocused, chatInputValue]);

  const handleSendChatMessage = () => {
    const textToSend = chatInputValue.trim();
    if (!textToSend) return;

    const newTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // 1. Add Doctor Message
    const docMsg = {
      id: Date.now(),
      sender: 'doctor',
      text: textToSend,
      time: newTime,
      isSigned: true
    };
    
    setChatMessages(prev => [...prev, docMsg]);
    setChatInputValue('');
    setIsAiTyping(true);

    // 2. Simulate AI response
    setTimeout(() => {
      setIsAiTyping(false);
      const isMedicineReq = textToSend.toLowerCase().includes('prescription') || textToSend.toLowerCase().includes('medicine') || textToSend.toLowerCase().includes('drug');
      const aiMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        text: isMedicineReq 
          ? "Here is the recommended medication card for the patient's record based on your instructions:" 
          : `Processed: "${textToSend}". Auto-action successfully logged in PEHAL clinical database.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        showMedication: isMedicineReq
      };
      setChatMessages(prev => [...prev, aiMsg]);
    }, 2000);
  };
  
  const lastScrollY = useRef(0);
  const inactivityTimer = useRef(null);
  const isHoveringHeader = useRef(false);

  // Restart the 10-second auto-hide timer
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      // Hide if not hovering, not near top of page, and no activity for 10s
      if (!isHoveringHeader.current && window.scrollY > 150) {
        setShowHeader(false);
      }
    }, 10000);
  }, []);

  // Intelligently hide/reveal navbar on scroll direction and inactivity
  useEffect(() => {
    lastScrollY.current = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          
          if (currentScrollY > lastScrollY.current && currentScrollY > 150) {
            // Scrolling down
            if (!isHoveringHeader.current) {
              setShowHeader(false);
            }
          } else if (currentScrollY < lastScrollY.current) {
            // Scrolling up
            setShowHeader(true);
          }
          
          lastScrollY.current = currentScrollY;
          resetInactivityTimer(); // Reset inactivity timer on any scroll
          ticking = false;
        });
        ticking = true;
      }
    };

    const handleMouseMove = (e) => {
      // Reveal if mouse is near top (top 40px)
      if (e.clientY <= 40 && !showHeader) {
        setShowHeader(true);
        resetInactivityTimer();
      }
    };

    // Attach passive listeners
    window.addEventListener('scroll', handleScroll, { passive: true });
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
    }

    // Start initial timer
    resetInactivityTimer();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [showHeader, resetInactivityTimer]);

  const handleGetStarted = () => {
    if (isAuthenticated && user) {
      navigate(getDefaultRouteForRole(user.role));
    } else {
      navigate('/login');
    }
  };

  const toggleFaq = (idx) => {
    setActiveFaq(activeFaq === idx ? null : idx);
  };

  const modules = {
    doctor: {
      title: 'Doctor Module',
      icon: 'stethoscope',
      desc: 'Seamless consult flows, electronic prescription templates, drug safety checkers, and direct EMR timeline access.',
      features: ['One-click prescription generation', 'Drug interaction warnings', 'Patient vitals tracking timeline'],
      featureDetails: [
        { title: 'Smart Prescription Engine', desc: 'Generate structured digital prescriptions in one click with drug safety validation.' },
        { title: 'Drug Interaction Alerts', desc: 'Real-time warnings for contraindicated drug combinations and allergens.' },
        { title: 'Patient Vitals Timeline', desc: 'Track patient health metrics and consult history on a visual timeline.' },
        { title: 'Voice-to-EMR Transcription', desc: 'AI-powered voice notes transcribed directly into EMR templates for review.' },
      ]
    },
    reception: {
      title: 'Reception Module',
      icon: 'reception',
      desc: 'Manage doctor calendars, schedule active queues, collect tokens, print billing invoices, and coordinate patient arrivals.',
      features: ['Walk-in appointment registry', 'Live token display manager', 'Coordinated doctor schedule sync'],
      featureDetails: [
        { title: 'Walk-in Appointment Registry', desc: 'Register walk-in patients instantly and assign them to available doctor slots.' },
        { title: 'Live Token Display Manager', desc: 'Display real-time queue token numbers on waiting room screens automatically.' },
        { title: 'Doctor Schedule Sync', desc: 'Keep all doctor calendars synchronized and prevent double-booking in real time.' },
        { title: 'Invoice & Billing Print', desc: 'Generate and print patient billing invoices with itemized service breakdowns.' },
      ]
    },
    patient: {
      title: 'Patient Portal',
      icon: 'patient',
      desc: 'Look up nearby healthcare clinics, book calendar appointments, view digital prescriptions, and retrieve lab records.',
      features: ['Secure OTP authentication', 'Interactive doctor slot picker', 'PDF prescription history access'],
      featureDetails: [
        { title: 'Secure OTP Authentication', desc: 'Patients log in via mobile OTP ensuring secure access to personal health records.' },
        { title: 'Interactive Slot Picker', desc: 'Browse available doctor time slots and book appointments from any device.' },
        { title: 'Prescription History PDF', desc: 'Download past digital prescriptions as PDFs for personal records or pharmacy.' },
        { title: 'Lab Report Access', desc: 'View and download structured lab test results directly from the patient portal.' },
      ]
    },
    pharmacy: {
      title: 'Pharmacy Operator',
      icon: 'pharmacy',
      desc: 'Manage medical inventory, dispense prescription batches, auto-calculate stock depletion, and raise restock alerts.',
      features: ['QR code prescription scanner', 'Stock expiry alerts & tracking', 'Integrated billing & discount receipts'],
      featureDetails: [
        { title: 'QR Prescription Scanner', desc: 'Scan QR-coded prescriptions to instantly fetch and dispense the correct medicines.' },
        { title: 'Stock Expiry Alerts', desc: 'Automated alerts for near-expiry medicines to prevent wastage and compliance risks.' },
        { title: 'Integrated Billing Receipts', desc: 'Generate itemized billing receipts with discount codes applied automatically.' },
        { title: 'Restock Demand Prediction', desc: 'AI predicts medicine reorder quantities based on historical prescription patterns.' },
      ]
    },
    laboratory: {
      title: 'Laboratory Operator',
      icon: 'laboratory',
      desc: 'Register test orders, configure diagnostic catalog packages, upload PDF test reports, and dispatch test outcomes.',
      features: ['Barcoded sample sorting', 'Direct PDF report generator', 'Automated SMS test updates'],
      featureDetails: [
        { title: 'Barcoded Sample Tracking', desc: 'Assign unique barcodes to samples and track them through the testing pipeline.' },
        { title: 'PDF Report Generator', desc: 'Generate and upload structured test result PDFs directly to patient records.' },
        { title: 'Automated SMS Updates', desc: 'Send automated SMS notifications to patients when test results are ready.' },
        { title: 'Diagnostic Catalog Manager', desc: 'Configure test package pricing, durations, and result templates with ease.' },
      ]
    },
    admin: {
      title: 'Clinic Administrator',
      icon: 'admin',
      desc: 'Configure clinic branches, onboard healthcare operators, track pricing catalog packages, and view diagnostic revenue analytics.',
      features: ['Role-based staff credentials', 'Comprehensive billing charts', 'Branch-wide operational parameters'],
      featureDetails: [
        { title: 'Role-Based Access Control', desc: 'Assign granular access permissions to each staff member based on their clinical role.' },
        { title: 'Revenue Analytics Dashboard', desc: 'Visual billing charts and revenue breakdowns across departments and time periods.' },
        { title: 'Branch Configuration', desc: 'Set up operational parameters, timing, and services for each clinic branch.' },
        { title: 'Staff Onboarding Workflow', desc: 'Streamline new staff registration, credential assignment, and module access provisioning.' },
      ]
    },
  };

  const faqItems = [
    { q: 'Is the PEHAL AI-CMS platform HIPAA compliant?', a: 'Yes, PEHAL AI-CMS fully adheres to the Health Insurance Portability and Accountability Act (HIPAA) security guidelines, utilizing end-to-end 256-bit encryption for all patient medical charts and doctor consult files.' },
    { q: 'Can I manage multiple clinic branches from one account?', a: 'Absolutely. The multi-branch dashboard allows clinic administrators to track schedules, billing, inventory, and staff rosters across multiple locations from one centralized account.' },
    { q: 'How does the AI Consultation Assistant work?', a: 'The AI assistant transcribes doctor-patient conversations in real-time, extracts key symptoms and diagnosis notes, and automatically populates the digital EMR templates for doctor review.' }
  ];

  const features = [
    { title: 'AI Appointment Scheduling', desc: 'Reduce no-shows and optimize calendar flows with automated smart scheduling.', icon: <Calendar size={26} />, color: 'from-emerald-500 to-green-600' },
    { title: 'Digital EMR & Records', desc: 'Securely manage medical records, consult histories, and patient timelines.', icon: <FileText size={26} />, color: 'from-green-500 to-teal-600' },
    { title: 'Online Pharmacy & Billing', desc: 'Generate paperless invoices and support integrated multi-channel payments.', icon: <CreditCard size={26} />, color: 'from-emerald-600 to-teal-700' },
    { title: 'Laboratory Management', desc: 'Order tests and deliver structured lab results straight to patients.', icon: <FlaskConical size={26} />, color: 'from-green-600 to-emerald-700' },
    { title: 'Inventory Control', desc: 'Track medicines, trigger reorder alerts, and manage stock.', icon: <Pill size={26} />, color: 'from-emerald-500 to-teal-600' },
    { title: 'AI Consultation Assistant', desc: 'Translate voice prescriptions to clinical records automatically.', icon: <Sparkles size={26} />, color: 'from-green-500 to-emerald-600' },
    { title: 'Cloud Backup & Security', desc: 'Keep data secure and accessible from anywhere with robust encryption.', icon: <Database size={26} />, color: 'from-slate-700 to-slate-900' },
    { title: 'Multi Branch Operations', desc: 'Manage multiple branches and franchises from a centralized corporate dashboard.', icon: <Building2 size={26} />, color: 'from-teal-500 to-emerald-600' },
  ];

  const trustBadges = [
    { label: 'AI Powered', icon: <Sparkles size={18} className="text-green-600" /> },
    { label: 'NABH Ready', icon: <Shield size={18} className="text-green-600" /> },
    { label: 'HIPAA Ready', icon: <CheckCircle2 size={18} className="text-green-600" /> },
    { label: 'Cloud Hosted', icon: <Globe size={18} className="text-green-600" /> },
    { label: 'ISO Certified', icon: <CheckCircle2 size={18} className="text-green-600" /> },
    { label: '24×7 Support', icon: <PhoneCall size={18} className="text-green-600" /> },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans antialiased overflow-x-hidden relative">
      
      {/* ── BACKGROUND GLOWS ── */}
      <div className="absolute top-0 left-1/4 w-[900px] h-[900px] bg-green-500/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-[800px] right-1/4 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[130px] pointer-events-none" />

      {/* ── STICKY GLASS NAVIGATION BAR ── */}
      <div 
        className={`fixed top-4 left-0 right-0 z-50 w-full px-8 lg:px-16 transition-all duration-[400ms] ease-in-out ${showHeader ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{ 
          transform: showHeader ? 'translate3d(0, 0, 0)' : 'translate3d(0, -120%, 0)', 
          willChange: 'transform, opacity' 
        }}
        onMouseEnter={() => {
          isHoveringHeader.current = true;
          setShowHeader(true);
          if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
        }}
        onMouseLeave={() => {
          isHoveringHeader.current = false;
          resetInactivityTimer();
        }}
      >
        <header className="max-w-[1720px] mx-auto bg-white/95 backdrop-blur-xl border border-slate-200/60 px-6 sm:px-10 h-[96px] rounded-full flex items-center justify-between shadow-lg shadow-slate-150/40 transition-all duration-200 relative">
          {/* Logo with breathing room */}
          <div className="flex items-center gap-2 shrink-0">
            <PehalLogo variant="primary" height={58} />
          </div>

          {/* Navigation Links - Luxurious Spacing */}
          <nav className="hidden xl:flex items-center gap-12 text-[16px] font-semibold tracking-wide text-slate-655">
            <a href="#features" className="relative group hover:text-green-600 transition-colors duration-200">
              Features
              <span className="absolute bottom-[-4px] left-0 w-0 h-[2px] bg-green-600 transition-all duration-300 group-hover:w-full" />
            </a>
            <a href="#ai-assistant" className="relative group hover:text-green-600 transition-colors duration-200">
              AI Modules
              <span className="absolute bottom-[-4px] left-0 w-0 h-[2px] bg-green-600 transition-all duration-300 group-hover:w-full" />
            </a>
            <a href="#special-modules" className="relative group hover:text-green-600 transition-colors duration-200">
              Modules
              <span className="absolute bottom-[-4px] left-0 w-0 h-[2px] bg-green-600 transition-all duration-300 group-hover:w-full" />
            </a>
            <a href="#pricing" className="relative group hover:text-green-600 transition-colors duration-200">
              Pricing
              <span className="absolute bottom-[-4px] left-0 w-0 h-[2px] bg-green-600 transition-all duration-300 group-hover:w-full" />
            </a>
            <a href="#security" className="relative group hover:text-green-600 transition-colors duration-200">
              Security
              <span className="absolute bottom-[-4px] left-0 w-0 h-[2px] bg-green-600 transition-all duration-300 group-hover:w-full" />
            </a>
          </nav>

          {/* Action CTAs - Pill buttons, aligned text */}
          <div className="flex items-center gap-3 shrink-0">
            <Link 
              to="/login?type=patient" 
              className="hidden xl:flex items-center justify-center gap-2 px-6 h-[50px] rounded-full text-slate-700 hover:text-green-600 text-[15px] font-semibold transition-all duration-300 border border-slate-200 bg-white/50 hover:bg-white hover:scale-[1.02] hover:shadow-md"
            >
              <User size={14} className="text-slate-400" /> Patient Portal
            </Link>
            <Link 
              to="/login?type=clinic" 
              className="hidden xl:flex items-center justify-center gap-2 px-6 h-[50px] rounded-full text-slate-700 hover:text-green-600 text-[15px] font-semibold transition-all duration-300 border border-slate-200 bg-white/50 hover:bg-white hover:scale-[1.02] hover:shadow-md"
            >
              <Building2 size={14} className="text-slate-400" /> Clinic Login
            </Link>
            <Link 
              to="/login?type=staff" 
              className="hidden xl:flex items-center justify-center gap-2 px-6 h-[50px] rounded-full text-slate-700 hover:text-green-600 text-[15px] font-semibold transition-all duration-300 border border-slate-200 bg-white/50 hover:bg-white hover:scale-[1.02] hover:shadow-md"
            >
              <LogIn size={14} className="text-slate-400" /> Staff Login
            </Link>
            
            {/* Desktop & Tablet CTA Button */}
            <button
              onClick={handleSetupClinicClick}
              className="hidden md:flex items-center justify-center gap-2 px-8 h-[56px] rounded-[16px] bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white text-[18px] font-bold shadow-md shadow-green-500/20 hover:shadow-lg hover:shadow-green-500/30 hover:translate-y-[-2px] active:translate-y-[0px] active:scale-[0.98] transition-all duration-250 cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 shrink-0"
              aria-label="Setup Your Clinic"
            >
              Setup Your Clinic
            </button>

            {/* Mobile/Tablet Hamburger Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="xl:hidden flex items-center justify-center w-12 h-12 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          {/* Mobile & Tablet Dropdown Navigation Overlay */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="xl:hidden absolute top-[110px] left-0 right-0 bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 shadow-xl flex flex-col gap-4 z-40 mx-4 sm:mx-8"
              >
                <a href="#features" onClick={() => setIsMobileMenuOpen(false)} className="text-slate-700 hover:text-green-600 font-semibold py-2 border-b border-slate-100">Features</a>
                <a href="#ai-assistant" onClick={() => setIsMobileMenuOpen(false)} className="text-slate-700 hover:text-green-600 font-semibold py-2 border-b border-slate-100">AI Modules</a>
                <a href="#special-modules" onClick={() => setIsMobileMenuOpen(false)} className="text-slate-700 hover:text-green-600 font-semibold py-2 border-b border-slate-100">Modules</a>
                <a href="#pricing" onClick={() => setIsMobileMenuOpen(false)} className="text-slate-700 hover:text-green-600 font-semibold py-2 border-b border-slate-100">Pricing</a>
                <a href="#security" onClick={() => setIsMobileMenuOpen(false)} className="text-slate-700 hover:text-green-600 font-semibold py-2 border-b border-slate-100">Security</a>
                
                <Link to="/login?type=patient" onClick={() => setIsMobileMenuOpen(false)} className="text-slate-700 hover:text-green-600 font-semibold py-2 border-b border-slate-100 flex items-center gap-2"><User size={14} /> Patient Portal</Link>
                <Link to="/login?type=clinic" onClick={() => setIsMobileMenuOpen(false)} className="text-slate-700 hover:text-green-600 font-semibold py-2 border-b border-slate-100 flex items-center gap-2"><Building2 size={14} /> Clinic Login</Link>
                <Link to="/login?type=staff" onClick={() => setIsMobileMenuOpen(false)} className="text-slate-700 hover:text-green-600 font-semibold py-2 border-b border-slate-100 flex items-center gap-2"><LogIn size={14} /> Staff Login</Link>

                {/* Mobile-only CTA */}
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleSetupClinicClick();
                  }}
                  className="md:hidden w-full py-4 rounded-[16px] bg-gradient-to-r from-green-500 to-green-650 hover:from-green-400 hover:to-green-550 text-white text-base font-bold shadow-md shadow-green-500/20 text-center cursor-pointer transition-all duration-200 mt-2"
                  aria-label="Setup Your Clinic"
                >
                  Setup Your Clinic
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </header>
      </div>

      {/* ── HERO SECTION ── */}
      <section className="relative pt-[200px] pb-28 px-8 lg:px-16 max-w-[1720px] mx-auto w-full min-h-[95vh] flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center w-full">
          
          {/* Left Text */}
          <div className="lg:col-span-5 space-y-8 text-left">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center justify-center gap-2 bg-green-50/80 border border-green-150 rounded-full px-6 h-[42px] text-[12px] font-black text-green-700 uppercase tracking-wide shadow-sm"
            >
              <Sparkle className="w-4 h-4 text-green-600 animate-pulse shrink-0" /> India's Smartest AI Clinic Platform
            </motion.div>

            <div className="space-y-4">
              <h2 className="text-[13px] font-black text-slate-400 uppercase tracking-[0.22em] block">PEHAL HEALTHCARE • AI-CMS</h2>
              <h1 className="text-7xl sm:text-[80px] font-extrabold text-slate-900 leading-[1.05] tracking-tight">
                Run Your Clinic <br />
                <span className="bg-gradient-to-r from-green-500 to-emerald-650 bg-clip-text text-transparent">Smarter</span> with AI
              </h1>
            </div>

            <p className="text-slate-500 leading-relaxed text-base max-w-[700px]">
              Modern clinic management platform powered by AI for appointments, EMR, pharmacy, laboratory, billing, telemedicine, inventory, and patient engagement.
            </p>

            {/* Enterprise size CTA buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link 
                to="/set-your-clinic" 
                className="flex items-center justify-center gap-2 h-[60px] min-w-[200px] px-8 rounded-[16px] bg-gradient-to-r from-green-500 to-green-700 text-white text-base font-bold shadow-lg shadow-green-500/25 hover:opacity-95 transition-all duration-300 hover:scale-[1.02] group"
              >
                Start Free Trial 
                <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <button 
                onClick={handleGetStarted}
                className="flex items-center justify-center gap-2 h-[60px] min-w-[200px] px-8 rounded-[16px] border border-slate-200 bg-white hover:bg-slate-50 text-slate-750 text-base font-bold shadow-sm transition-all duration-300 hover:scale-[1.02]"
              >
                Book Demo
              </button>
            </div>

            {/* Premium Trust Badges */}
            <div className="flex flex-wrap gap-3 pt-6">
              {trustBadges.map((badge, idx) => (
                <div 
                  key={idx} 
                  className="inline-flex items-center justify-center gap-2 h-[42px] px-5 rounded-full text-xs font-semibold border backdrop-blur-md bg-white/70 border-slate-200/80 text-slate-700 shadow-sm hover:scale-[1.03] hover:border-green-600 transition-all duration-200 cursor-default"
                >
                  {badge.icon}
                  <span>{badge.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right SVG Illustration Mockup (Enlarged by ~18%) */}
          <div className="lg:col-span-7 flex justify-center items-center relative lg:pl-10">
            <motion.div 
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="w-full max-w-[950px] relative rounded-[32px] bg-slate-100/50 p-3 overflow-hidden flex items-center justify-center shadow-2xl border border-slate-200/40 lg:scale-[1.12] transition-transform"
            >
              <img 
                src={dashboardIllustration} 
                alt="PEHAL AI-CMS Platform Preview" 
                className="w-full h-auto object-contain rounded-2xl shadow-xl"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── TRUST BAR, METRICS & VECTOR LOGOS ── */}
      <section className="pt-[120px] pb-[80px] px-8 lg:px-16 relative overflow-hidden" style={{
        background: 'linear-gradient(135deg, #e8f8f2 0%, #f0faf6 25%, #eaf6fb 55%, #e6f4f9 80%, #f0fbf8 100%)'
      }}>
        {/* Large soft mint blob - top-left */}
        <div className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(110,231,183,0.22) 0%, rgba(167,243,208,0.12) 40%, transparent 70%)' }} />
        {/* Large soft cyan blob - bottom-right */}
        <div className="absolute -bottom-40 -right-40 w-[700px] h-[700px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(103,232,249,0.18) 0%, rgba(165,243,252,0.1) 40%, transparent 70%)' }} />
        {/* Mint glow behind left logo cards */}
        <div className="absolute top-[52%] left-[5%] w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.08) 0%, transparent 65%)', filter: 'blur(60px)' }} />
        {/* Cyan glow behind right logo cards */}
        <div className="absolute top-[52%] right-[5%] w-[450px] h-[450px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.07) 0%, transparent 65%)', filter: 'blur(60px)' }} />

        {/* Healthcare hex-node pattern overlay (ultra-light, < 3%) */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%2310b981' stroke-width='0.5' opacity='0.18'%3E%3Cpolygon points='40,4 70,20 70,56 40,72 10,56 10,20'/%3E%3Ccircle cx='40' cy='38' r='4'/%3E%3Cline x1='40' y1='20' x2='40' y2='34'/%3E%3Cline x1='40' y1='42' x2='40' y2='56'/%3E%3Cline x1='10' y1='20' x2='24' y2='33'/%3E%3Cline x1='70' y1='20' x2='56' y2='33'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '80px 80px',
          opacity: 0.022
        }} />

        {/* Floating sparkle particles — top-right */}
        <div className="absolute top-[12%] right-[4%] pointer-events-none opacity-30">
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
            <circle cx="20" cy="20" r="3" fill="#34d399" opacity="0.6"/>
            <circle cx="60" cy="10" r="2" fill="#22d3ee" opacity="0.5"/>
            <circle cx="100" cy="30" r="2.5" fill="#34d399" opacity="0.4"/>
            <circle cx="40" cy="70" r="2" fill="#6ee7b7" opacity="0.5"/>
            <circle cx="85" cy="80" r="3" fill="#22d3ee" opacity="0.4"/>
            <circle cx="110" cy="60" r="1.5" fill="#34d399" opacity="0.6"/>
          </svg>
        </div>

        {/* Floating sparkle particles — bottom-left */}
        <div className="absolute bottom-[20%] left-[3%] pointer-events-none opacity-25">
          <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
            <circle cx="15" cy="15" r="2.5" fill="#34d399" opacity="0.6"/>
            <circle cx="50" cy="5" r="2" fill="#22d3ee" opacity="0.5"/>
            <circle cx="80" cy="25" r="2" fill="#34d399" opacity="0.4"/>
            <circle cx="30" cy="60" r="3" fill="#6ee7b7" opacity="0.5"/>
            <circle cx="70" cy="75" r="2" fill="#22d3ee" opacity="0.4"/>
          </svg>
        </div>

        {/* Decorative gradient ring — top-left corner */}
        <div className="absolute top-[8%] left-[6%] w-[80px] h-[80px] rounded-full border-2 border-emerald-300/20 pointer-events-none" />
        <div className="absolute top-[6%] left-[4%] w-[120px] h-[120px] rounded-full border border-cyan-300/10 pointer-events-none" />

        <div className="max-w-[1600px] mx-auto relative z-10">

          {/* Animated Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { end: '500+', label: 'Clinics Onboarded', icon: <Building2 size={34} className="text-green-600" /> },
              { end: '100K+', label: 'Patients Managed', icon: <Users size={34} className="text-green-600" /> },
              { end: '120+', label: 'AI Modules Active', icon: <Sparkles size={34} className="text-green-600" /> },
              { end: '99.99%', label: 'System Uptime', icon: <Activity size={34} className="text-green-600" /> }
            ].map((stat, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center justify-between h-[260px] p-10 rounded-[28px] border border-white/80 bg-white/70 backdrop-blur-md shadow-sm hover:shadow-2xl hover:-translate-y-2 hover:border-green-500 transition-all duration-300 group"
              >
                <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-tr from-green-50/90 to-emerald-100/60 border border-white flex items-center justify-center shadow-md relative group-hover:scale-110 transition-transform duration-300">
                  <div className="absolute inset-0.5 rounded-full bg-white/70 backdrop-blur-sm flex items-center justify-center">
                    {stat.icon}
                  </div>
                </div>
                <div className="text-5xl sm:text-[62px] font-extrabold tracking-tight bg-gradient-to-r from-green-600 to-emerald-650 bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-300 select-none">
                  <CountUp end={stat.end} />
                </div>
                <div className="space-y-1.5 text-center select-none">
                  <div className="text-[18px] font-semibold text-slate-500 tracking-wide">{stat.label}</div>
                  <div className="w-[60px] h-[3px] bg-gradient-to-r from-green-500 to-emerald-500 rounded-full shadow-sm shadow-green-500/30 mx-auto mt-2 transition-all group-hover:w-[80px]" />
                </div>
              </div>
            ))}
          </div>

          {/* Section Heading — 100px below KPI cards */}
          <div className="text-center mt-[100px] space-y-[24px] max-w-4xl mx-auto">
            <h3 className="text-4xl sm:text-[54px] font-extrabold text-slate-900 tracking-tight leading-tight max-w-[900px] mx-auto">
              Trusted by Leading Healthcare Organizations
            </h3>
            <p className="text-slate-500 text-[18px] font-medium leading-relaxed max-w-[850px] mx-auto">
              Serving modern clinics, multispecialty hospitals, diagnostic centers and healthcare enterprises across India.
            </p>
          </div>

          {/* Hospital Logo Cards — 70px below heading */}
          <div className="mt-[70px] grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {[
              {
                name: 'Apollo Hospitals',
                svg: (
                  <svg className="w-full h-full" viewBox="0 0 180 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g transform="translate(8, 8) scale(1.3)">
                      <path d="M15,0 L3,5 L3,16 C3,26 15,33 15,33 C15,33 27,26 27,16 L27,5 L15,0 Z" fill="#005B94" />
                      <polygon points="15,7 17.5,13 23.5,13 18.5,17 20.5,23 15,19.5 9.5,23 11.5,17 6.5,13 12.5,13" fill="#F8B12E" />
                    </g>
                    <text x="52" y="36" fontWeight="800" fontSize="22" letterSpacing="2" fontFamily="system-ui, sans-serif" fill="#005B94">Apollo</text>
                    <text x="52" y="54" fontWeight="700" fontSize="11" letterSpacing="3" fontFamily="system-ui, sans-serif" fill="#4E6178">HOSPITALS</text>
                  </svg>
                )
              },
              {
                name: 'Fortis Healthcare',
                svg: (
                  <svg className="w-full h-full" viewBox="0 0 180 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g transform="translate(8, 10) scale(1.3)">
                      <path d="M15,2 C7.8,2 2,7.8 2,15 C2,22.2 7.8,28 15,28 C22.2,28 28,22.2 28,15 C28,7.8 22.2,2 15,2 Z" fill="#128A54" />
                      <path d="M15,8 L15,22 M8,15 L22,15" stroke="#D32F2F" strokeWidth="5" strokeLinecap="round" />
                    </g>
                    <text x="54" y="34" fontWeight="900" fontSize="23" letterSpacing="0.5" fontFamily="system-ui, sans-serif" fill="#128A54">Fortis</text>
                    <text x="54" y="53" fontWeight="700" fontSize="10" letterSpacing="3.5" fontFamily="system-ui, sans-serif" fill="#4E6178">HEALTHCARE</text>
                  </svg>
                )
              },
              {
                name: 'Manipal Hospitals',
                svg: (
                  <svg className="w-full h-full" viewBox="0 0 180 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g transform="translate(8, 10) scale(1.25)">
                      <path d="M15,2 C9.5,2 5,6.5 5,12 C5,17.5 9.5,22 15,22 C20.5,22 25,17.5 25,12 C25,6.5 20.5,2 15,2 Z" fill="#E86E25" />
                      <path d="M15,9 C12.5,9 11,11.5 11,14 M15,9 C17.5,9 19,11.5 19,14" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                    </g>
                    <text x="52" y="35" fontWeight="900" fontSize="21" letterSpacing="0" fontFamily="system-ui, sans-serif" fill="#E86E25">manipal</text>
                    <text x="52" y="53" fontWeight="700" fontSize="10" letterSpacing="4" fontFamily="system-ui, sans-serif" fill="#4E6178">HOSPITALS</text>
                  </svg>
                )
              },
              {
                name: 'Medanta',
                svg: (
                  <svg className="w-full h-full" viewBox="0 0 180 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g transform="translate(6, 18) scale(1.2)">
                      <path d="M2,15 L9,15 L13,3 L18,27 L23,15 L30,15" stroke="#E63946" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      <circle cx="16" cy="15" r="3.5" fill="#E63946" />
                    </g>
                    <text x="50" y="35" fontWeight="900" fontSize="23" letterSpacing="0" fontFamily="system-ui, sans-serif" fill="#1C2D42">medanta</text>
                    <text x="50" y="53" fontWeight="700" fontSize="10" letterSpacing="2" fontFamily="system-ui, sans-serif" fill="#E63946">THE MEDICITY</text>
                  </svg>
                )
              },
              {
                name: "Rainbow Children's Hospitals",
                svg: (
                  <svg className="w-full h-full" viewBox="0 0 180 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g transform="translate(6, 8) scale(1.3)">
                      <path d="M4,24 C4,12 13,4 13,4 C13,4 22,12 22,24" stroke="#FF4D6D" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                      <path d="M7,26 C7,16 13,10 13,10 C13,10 19,16 19,26" stroke="#FF9F1C" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                      <path d="M10,27 C10,21 13,16 13,16 C13,16 16,21 16,27" stroke="#2EC4B6" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                    </g>
                    <text x="44" y="32" fontWeight="900" fontSize="20" letterSpacing="0" fontFamily="system-ui, sans-serif" fill="#2A2B5F">Rainbow</text>
                    <text x="44" y="50" fontWeight="700" fontSize="10" letterSpacing="1" fontFamily="system-ui, sans-serif" fill="#FF4D6D">Children's Hospital</text>
                  </svg>
                )
              },
              {
                name: 'Aster DM Healthcare',
                svg: (
                  <svg className="w-full h-full" viewBox="0 0 180 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g transform="translate(6, 8) scale(1.3)">
                      <circle cx="15" cy="16" r="13" fill="#008080" />
                      <path d="M15,9 L15,23 M8,16 L22,16 M10,11 L20,21 M10,21 L20,11" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
                    </g>
                    <text x="50" y="32" fontWeight="900" fontSize="24" letterSpacing="0" fontFamily="system-ui, sans-serif" fill="#0E3A53">Aster</text>
                    <text x="50" y="52" fontWeight="700" fontSize="10" letterSpacing="1.5" fontFamily="system-ui, sans-serif" fill="#008080">DM HEALTHCARE</text>
                  </svg>
                )
              }
            ].map((logo, idx) => (
              <motion.div 
                key={idx}
                whileHover={{ scale: 1.04, translateY: -6 }}
                className="w-full h-[140px] rounded-[20px] border border-white/90 bg-white shadow-md hover:border-green-400 hover:shadow-xl transition-all duration-250 cursor-pointer overflow-hidden flex items-center justify-center px-6 py-5"
              >
                {logo.svg}
              </motion.div>
            ))}
          </div>

          {/* Trust Badges — 70px below logo cards */}
          <div className="mt-[70px] flex flex-wrap items-center justify-center gap-4">
            {trustBadges.map((badge, idx) => (
              <motion.div
                key={idx}
                whileHover={{ scale: 1.04, translateY: -3 }}
                className="inline-flex items-center justify-center gap-3 h-[58px] px-7 rounded-full text-[15px] font-semibold border-2 bg-white border-slate-200/80 text-slate-700 hover:border-green-500 hover:text-green-700 hover:shadow-lg hover:shadow-green-500/10 shadow-sm transition-all duration-200 cursor-default"
              >
                {badge.icon}
                <span>{badge.label}</span>
              </motion.div>
            ))}
          </div>

        </div>

        {/* ── BOTTOM DECORATIVE LAYER ── */}

        {/* Emerald glow behind badge area */}
        <div className="absolute bottom-[80px] left-1/2 -translate-x-1/2 w-[800px] h-[220px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(52,211,153,0.06) 0%, transparent 70%)', filter: 'blur(50px)' }} />

        {/* Bottom-left dot mesh */}
        <div className="absolute bottom-0 left-0 w-[300px] h-[220px] pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle, rgba(52,211,153,0.4) 1.5px, transparent 1.5px)',
          backgroundSize: '22px 22px',
          maskImage: 'radial-gradient(ellipse at bottom left, black 15%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at bottom left, black 15%, transparent 70%)',
          opacity: 0.38
        }} />

        {/* Bottom-right dot mesh */}
        <div className="absolute bottom-0 right-0 w-[300px] h-[220px] pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle, rgba(103,232,249,0.4) 1.5px, transparent 1.5px)',
          backgroundSize: '22px 22px',
          maskImage: 'radial-gradient(ellipse at bottom right, black 15%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at bottom right, black 15%, transparent 70%)',
          opacity: 0.38
        }} />

        {/* Floating sparkle particles — top-right edge */}
        <div className="absolute top-[15%] right-[4%] pointer-events-none opacity-30">
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
            <circle cx="20" cy="20" r="3" fill="#34d399" opacity="0.6"/>
            <circle cx="60" cy="10" r="2" fill="#22d3ee" opacity="0.5"/>
            <circle cx="100" cy="30" r="2.5" fill="#34d399" opacity="0.4"/>
            <circle cx="40" cy="70" r="2" fill="#6ee7b7" opacity="0.5"/>
            <circle cx="85" cy="80" r="3" fill="#22d3ee" opacity="0.4"/>
            <circle cx="110" cy="60" r="1.5" fill="#34d399" opacity="0.6"/>
            <circle cx="15" cy="95" r="2" fill="#6ee7b7" opacity="0.4"/>
          </svg>
        </div>

        {/* Floating sparkle particles — center-left edge */}
        <div className="absolute bottom-[25%] left-[3%] pointer-events-none opacity-25">
          <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
            <circle cx="15" cy="15" r="2.5" fill="#34d399" opacity="0.6"/>
            <circle cx="50" cy="5" r="2" fill="#22d3ee" opacity="0.5"/>
            <circle cx="80" cy="25" r="2" fill="#34d399" opacity="0.4"/>
            <circle cx="30" cy="60" r="3" fill="#6ee7b7" opacity="0.5"/>
            <circle cx="70" cy="75" r="2" fill="#22d3ee" opacity="0.4"/>
          </svg>
        </div>

        {/* Decorative gradient rings — top-left corner */}
        <div className="absolute top-[8%] left-[6%] w-[80px] h-[80px] rounded-full border-2 border-emerald-300/20 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.04) 0%, transparent 70%)' }} />
        <div className="absolute top-[6%] left-[4%] w-[120px] h-[120px] rounded-full border border-cyan-300/10 pointer-events-none" />

        {/* Flowing wave SVG — premium bottom decoration */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none overflow-hidden" style={{ height: '160px' }}>
          <svg viewBox="0 0 1440 160" preserveAspectRatio="none" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,80 C180,20 360,140 540,80 C720,20 900,130 1080,70 C1260,10 1380,100 1440,80 L1440,160 L0,160 Z"
              fill="url(#waveGrad1)" opacity="0.25"/>
            <path d="M0,100 C120,50 280,150 480,90 C680,30 860,140 1080,90 C1260,50 1380,120 1440,100 L1440,160 L0,160 Z"
              fill="url(#waveGrad2)" opacity="0.18"/>
            <path d="M0,120 C200,80 400,150 600,110 C800,70 1000,145 1200,110 C1300,93 1380,125 1440,115"
              stroke="url(#waveStroke1)" strokeWidth="1.5" fill="none" opacity="0.5"/>
            <path d="M0,140 C240,110 480,155 720,130 C960,108 1200,148 1440,130"
              stroke="url(#waveStroke2)" strokeWidth="1" fill="none" opacity="0.35"/>
            <defs>
              <linearGradient id="waveGrad1" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#6ee7b7"/>
                <stop offset="50%" stopColor="#67e8f9"/>
                <stop offset="100%" stopColor="#a7f3d0"/>
              </linearGradient>
              <linearGradient id="waveGrad2" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#34d399"/>
                <stop offset="60%" stopColor="#22d3ee"/>
                <stop offset="100%" stopColor="#6ee7b7"/>
              </linearGradient>
              <linearGradient id="waveStroke1" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#34d399"/>
                <stop offset="100%" stopColor="#06b6d4"/>
              </linearGradient>
              <linearGradient id="waveStroke2" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#6ee7b7"/>
                <stop offset="100%" stopColor="#22d3ee"/>
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Gradient fade into next section */}
        <div className="absolute bottom-0 left-0 right-0 h-[60px] pointer-events-none" style={{
          background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.65))'
        }} />

      </section>

      {/* ── FEATURE GRID — Premium Enterprise Redesign ── */}
      <section id="features" className="pt-[120px] pb-[100px] px-8 lg:px-16 relative overflow-hidden" style={{
        background: 'linear-gradient(150deg, #f0fdf8 0%, #f8fffc 20%, #eafbf7 45%, #f0fbff 70%, #edf9ff 100%)'
      }}>

        {/* Background glows */}
        <div className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.10) 0%, transparent 65%)' }} />
        <div className="absolute top-[30%] right-[0%] w-[600px] h-[600px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(103,232,249,0.08) 0%, transparent 65%)' }} />
        <div className="absolute top-[55%] left-[35%] w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 65%)', filter: 'blur(40px)' }} />

        {/* Healthcare hex-node pattern overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%2310b981' stroke-width='0.5' opacity='0.15'%3E%3Cpolygon points='40,4 70,20 70,56 40,72 10,56 10,20'/%3E%3Ccircle cx='40' cy='38' r='4'/%3E%3Cline x1='40' y1='20' x2='40' y2='34'/%3E%3Cline x1='40' y1='42' x2='40' y2='56'/%3E%3Cline x1='10' y1='20' x2='24' y2='33'/%3E%3Cline x1='70' y1='20' x2='56' y2='33'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '80px 80px',
          opacity: 0.018
        }} />

        {/* Sparkle particles — top right */}
        <div className="absolute top-[8%] right-[5%] pointer-events-none opacity-35">
          <svg width="140" height="140" viewBox="0 0 140 140" fill="none">
            <circle cx="20" cy="20" r="3" fill="#34d399" opacity="0.7"/>
            <circle cx="70" cy="10" r="2" fill="#22d3ee" opacity="0.6"/>
            <circle cx="120" cy="35" r="2.5" fill="#34d399" opacity="0.5"/>
            <circle cx="45" cy="80" r="2" fill="#6ee7b7" opacity="0.6"/>
            <circle cx="100" cy="100" r="3.5" fill="#22d3ee" opacity="0.5"/>
            <circle cx="130" cy="70" r="1.5" fill="#34d399" opacity="0.7"/>
            <circle cx="10" cy="110" r="2" fill="#6ee7b7" opacity="0.5"/>
          </svg>
        </div>
        {/* Sparkle particles — bottom left */}
        <div className="absolute bottom-[15%] left-[3%] pointer-events-none opacity-30">
          <svg width="110" height="110" viewBox="0 0 110 110" fill="none">
            <circle cx="15" cy="15" r="2.5" fill="#34d399" opacity="0.7"/>
            <circle cx="60" cy="5" r="2" fill="#22d3ee" opacity="0.6"/>
            <circle cx="95" cy="30" r="2" fill="#34d399" opacity="0.5"/>
            <circle cx="30" cy="70" r="3" fill="#6ee7b7" opacity="0.6"/>
            <circle cx="80" cy="90" r="2" fill="#22d3ee" opacity="0.5"/>
          </svg>
        </div>

        {/* Decorative rings */}
        <div className="absolute top-[5%] left-[8%] w-[90px] h-[90px] rounded-full border-2 border-emerald-300/15 pointer-events-none" />
        <div className="absolute top-[3%] left-[6%] w-[140px] h-[140px] rounded-full border border-cyan-300/10 pointer-events-none" />
        <div className="absolute bottom-[10%] right-[7%] w-[70px] h-[70px] rounded-full border border-emerald-400/15 pointer-events-none" />

        <div className="max-w-[1600px] mx-auto relative z-10">

          {/* Header */}
          <div className="text-center space-y-6 mb-[70px]">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 h-[40px] px-5 rounded-full border border-green-200/80 shadow-sm text-[11px] font-bold uppercase tracking-[1.5px] text-green-700"
              style={{ background: 'linear-gradient(135deg, rgba(220,252,231,0.8) 0%, rgba(209,250,229,0.6) 100%)' }}
            >
              <Sparkles size={13} className="text-green-600" />
              System Capabilities
            </motion.div>

            {/* Heading */}
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: 0.08 }}
              className="text-[52px] sm:text-[72px] font-extrabold tracking-[-2px] leading-[1.05] text-slate-900"
            >
              Everything{' '}
              <span className="bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">Your</span>
              {' '}Clinic Needs
            </motion.h2>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="text-slate-500 text-[18px] font-normal leading-[1.8] max-w-[800px] mx-auto"
            >
              Built for single clinics, healthcare chains, hospitals and diagnostic networks.
            </motion.p>

            {/* ECG Divider */}
            <motion.div
              initial={{ opacity: 0, scaleX: 0.6 }}
              whileInView={{ opacity: 1, scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.22 }}
              className="flex items-center justify-center gap-4 pt-2"
            >
              <div className="h-[1px] w-[100px] bg-gradient-to-r from-transparent to-green-400/60" />
              <svg width="60" height="20" viewBox="0 0 60 20" fill="none" className="opacity-70">
                <path d="M0,10 L10,10 L14,2 L18,18 L22,10 L60,10" stroke="url(#ecgGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <defs>
                  <linearGradient id="ecgGrad" x1="0" y1="0" x2="60" y2="0">
                    <stop offset="0%" stopColor="#34d399"/>
                    <stop offset="100%" stopColor="#06b6d4"/>
                  </linearGradient>
                </defs>
              </svg>
              <div className="h-[1px] w-[100px] bg-gradient-to-l from-transparent to-green-400/60" />
            </motion.div>
          </div>

          {/* Feature Cards — 4×2 Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                title: 'AI Appointment Scheduling',
                desc: 'Reduce no-shows and optimize calendar flows with automated smart scheduling.',
                icon: <Calendar size={28} />,
                watermark: <Calendar size={96} />,
                gradient: 'from-emerald-500 to-green-600',
                num: '01'
              },
              {
                title: 'Digital EMR & Records',
                desc: 'Securely manage medical records, consult histories, and patient timelines.',
                icon: <FileText size={28} />,
                watermark: <FileText size={96} />,
                gradient: 'from-green-500 to-teal-600',
                num: '02'
              },
              {
                title: 'Online Pharmacy & Billing',
                desc: 'Generate paperless invoices and support integrated multi-channel payments.',
                icon: <CreditCard size={28} />,
                watermark: <CreditCard size={96} />,
                gradient: 'from-teal-500 to-emerald-600',
                num: '03'
              },
              {
                title: 'Laboratory Management',
                desc: 'Order tests and deliver structured lab results straight to patients.',
                icon: <FlaskConical size={28} />,
                watermark: <FlaskConical size={96} />,
                gradient: 'from-green-600 to-emerald-700',
                num: '04'
              },
              {
                title: 'Inventory Control',
                desc: 'Track medicines, trigger reorder alerts, and manage stock efficiently.',
                icon: <Pill size={28} />,
                watermark: <Pill size={96} />,
                gradient: 'from-emerald-500 to-teal-600',
                num: '05'
              },
              {
                title: 'AI Consultation Assistant',
                desc: 'Translate voice prescriptions to clinical records automatically with AI accuracy.',
                icon: <Sparkles size={28} />,
                watermark: <Sparkles size={96} />,
                gradient: 'from-green-500 to-emerald-600',
                num: '06'
              },
              {
                title: 'Cloud Backup & Security',
                desc: 'Keep data secure and accessible from anywhere with robust encryption.',
                icon: <Database size={28} />,
                watermark: <Database size={96} />,
                gradient: 'from-slate-700 to-slate-900',
                num: '07'
              },
              {
                title: 'Multi Branch Operations',
                desc: 'Manage multiple branches and franchises from a centralized corporate dashboard.',
                icon: <Building2 size={28} />,
                watermark: <Building2 size={96} />,
                gradient: 'from-teal-500 to-emerald-600',
                num: '08'
              }
            ].map((card, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.08 }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="group relative h-[340px] rounded-[28px] p-8 bg-white border border-slate-100 shadow-lg hover:shadow-2xl hover:border-green-400 transition-all duration-300 flex flex-col overflow-hidden cursor-pointer"
                style={{ boxShadow: '0 8px 32px -8px rgba(0,0,0,0.10), 0 1px 3px rgba(0,0,0,0.05)' }}
              >
                {/* Number badge — top right */}
                <div className="absolute top-6 right-6 w-[36px] h-[36px] rounded-full flex items-center justify-center text-[13px] font-bold text-green-700 group-hover:bg-green-500 group-hover:text-white transition-all duration-300" style={{ background: 'rgba(209,250,229,0.7)' }}>
                  {card.num}
                </div>

                {/* Watermark icon — bottom right */}
                <div className="absolute bottom-4 right-4 text-slate-200 group-hover:text-green-100 transition-colors duration-300 pointer-events-none opacity-[0.07] group-hover:opacity-[0.12]">
                  {card.watermark}
                </div>

                {/* Circular icon */}
                <div className={`w-[74px] h-[74px] rounded-full bg-gradient-to-tr ${card.gradient} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300 shrink-0`}
                  style={{ boxShadow: '0 6px 20px -4px rgba(16,185,129,0.45)' }}
                >
                  {card.icon}
                </div>

                {/* Text content */}
                <div className="mt-5 flex-1 space-y-3">
                  <h4 className="text-[20px] font-bold text-slate-900 leading-snug tracking-[-0.3px] max-w-[160px]">
                    {card.title}
                  </h4>
                  <p className="text-[15px] text-slate-400 leading-[1.75] line-clamp-3">
                    {card.desc}
                  </p>
                </div>

                {/* Arrow CTA — bottom left */}
                <div className="mt-4 shrink-0">
                  <div className={`w-[38px] h-[38px] rounded-full bg-gradient-to-tr ${card.gradient} flex items-center justify-center shadow-md group-hover:scale-110 group-hover:rotate-[-40deg] transition-all duration-300`}>
                    <ArrowRight size={16} className="text-white" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Premium Floating Trust Bar */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.2 }}
            className="mt-[80px] mx-auto max-w-[1100px] h-[88px] rounded-[44px] flex items-center justify-around px-10 border border-slate-100/80 bg-white/90 backdrop-blur-md"
            style={{ boxShadow: '0 16px 48px -12px rgba(16,185,129,0.15), 0 4px 16px -4px rgba(0,0,0,0.06)' }}
          >
            {trustBadges.map((badge, idx) => (
              <React.Fragment key={idx}>
                <motion.div
                  whileHover={{ scale: 1.06, y: -2 }}
                  className="flex items-center gap-2.5 text-[14px] font-semibold text-slate-600 hover:text-green-700 transition-colors duration-200 cursor-default"
                >
                  {badge.icon}
                  <span>{badge.label}</span>
                </motion.div>
                {idx < trustBadges.length - 1 && (
                  <div className="h-[28px] w-[1px] bg-slate-100" />
                )}
              </React.Fragment>
            ))}
          </motion.div>

        </div>

        {/* Bottom dot meshes */}
        <div className="absolute bottom-0 left-0 w-[260px] h-[180px] pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle, rgba(52,211,153,0.38) 1.5px, transparent 1.5px)',
          backgroundSize: '20px 20px',
          maskImage: 'radial-gradient(ellipse at bottom left, black 15%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at bottom left, black 15%, transparent 70%)',
          opacity: 0.35
        }} />
        <div className="absolute bottom-0 right-0 w-[260px] h-[180px] pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle, rgba(103,232,249,0.38) 1.5px, transparent 1.5px)',
          backgroundSize: '20px 20px',
          maskImage: 'radial-gradient(ellipse at bottom right, black 15%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at bottom right, black 15%, transparent 70%)',
          opacity: 0.35
        }} />

        {/* Flowing wave bottom decoration */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none overflow-hidden" style={{ height: '100px' }}>
          <svg viewBox="0 0 1440 100" preserveAspectRatio="none" className="w-full h-full" fill="none">
            <path d="M0,50 C200,10 400,90 600,50 C800,10 1000,80 1200,45 C1320,22 1400,65 1440,50 L1440,100 L0,100 Z"
              fill="url(#featWave1)" opacity="0.22"/>
            <path d="M0,68 C150,38 350,95 550,62 C750,30 950,88 1150,60 C1300,40 1390,78 1440,68 L1440,100 L0,100 Z"
              fill="url(#featWave2)" opacity="0.16"/>
            <path d="M0,82 C240,60 480,98 720,75 C960,55 1200,92 1440,78"
              stroke="url(#featWaveStroke)" strokeWidth="1.5" fill="none" opacity="0.45"/>
            <defs>
              <linearGradient id="featWave1" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#6ee7b7"/>
                <stop offset="50%" stopColor="#67e8f9"/>
                <stop offset="100%" stopColor="#a7f3d0"/>
              </linearGradient>
              <linearGradient id="featWave2" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#34d399"/>
                <stop offset="100%" stopColor="#22d3ee"/>
              </linearGradient>
              <linearGradient id="featWaveStroke" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#34d399"/>
                <stop offset="100%" stopColor="#06b6d4"/>
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Fade into next section */}
        <div className="absolute bottom-0 left-0 right-0 h-[50px] pointer-events-none" style={{
          background: 'linear-gradient(to bottom, transparent, rgba(248,250,252,0.7))'
        }} />

      </section>

      {/* ── CUSTOM ROLE MODULES ── Premium Enterprise Redesign */}
      <section id="special-modules" className="pt-[120px] pb-[100px] px-8 lg:px-16 relative overflow-hidden" style={{
        background: 'linear-gradient(150deg, #f0fdf8 0%, #f8fffc 22%, #eafbf7 48%, #f0fbff 72%, #edf9ff 100%)'
      }}>

        {/* Background glows */}
        <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(103,232,249,0.10) 0%, transparent 65%)' }} />
        <div className="absolute top-[40%] -left-20 w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.08) 0%, transparent 65%)' }} />
        <div className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 65%)', filter: 'blur(30px)' }} />

        {/* Hex-node pattern */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%2310b981' stroke-width='0.5' opacity='0.15'%3E%3Cpolygon points='40,4 70,20 70,56 40,72 10,56 10,20'/%3E%3Ccircle cx='40' cy='38' r='4'/%3E%3Cline x1='40' y1='20' x2='40' y2='34'/%3E%3Cline x1='40' y1='42' x2='40' y2='56'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '80px 80px', opacity: 0.018
        }} />

        {/* Sparkle particles */}
        <div className="absolute top-[6%] right-[4%] pointer-events-none opacity-30">
          <svg width="130" height="130" viewBox="0 0 130 130" fill="none">
            <circle cx="20" cy="20" r="3" fill="#34d399" opacity="0.7"/>
            <circle cx="65" cy="8" r="2" fill="#22d3ee" opacity="0.6"/>
            <circle cx="110" cy="35" r="2.5" fill="#34d399" opacity="0.5"/>
            <circle cx="40" cy="80" r="2" fill="#6ee7b7" opacity="0.6"/>
            <circle cx="95" cy="100" r="3" fill="#22d3ee" opacity="0.5"/>
            <circle cx="120" cy="65" r="1.5" fill="#34d399" opacity="0.7"/>
          </svg>
        </div>
        <div className="absolute bottom-[18%] left-[3%] pointer-events-none opacity-25">
          <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
            <circle cx="12" cy="12" r="2.5" fill="#34d399" opacity="0.7"/>
            <circle cx="55" cy="5" r="2" fill="#22d3ee" opacity="0.6"/>
            <circle cx="88" cy="28" r="2" fill="#34d399" opacity="0.5"/>
            <circle cx="28" cy="65" r="3" fill="#6ee7b7" opacity="0.6"/>
            <circle cx="75" cy="82" r="2" fill="#22d3ee" opacity="0.5"/>
          </svg>
        </div>

        {/* Decorative rings */}
        <div className="absolute top-[4%] left-[7%] w-[90px] h-[90px] rounded-full border-2 border-emerald-300/15 pointer-events-none" />
        <div className="absolute top-[2%] left-[5%] w-[140px] h-[140px] rounded-full border border-cyan-300/10 pointer-events-none" />

        <div className="max-w-[1600px] mx-auto relative z-10">

          {/* ── Section Header ── */}
          <div className="text-center space-y-5 mb-[60px]">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 h-[38px] px-5 rounded-full border border-green-200/80 shadow-sm text-[11px] font-bold uppercase tracking-[1.5px] text-green-700"
              style={{ background: 'linear-gradient(135deg, rgba(220,252,231,0.85) 0%, rgba(209,250,229,0.65) 100%)' }}
            >
              <Users size={13} className="text-green-600" />
              Custom Roles
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: 0.08 }}
              className="text-[48px] sm:text-[64px] font-extrabold tracking-[-2px] leading-[1.05] text-slate-900"
            >
              Custom Role{' '}
              <span className="bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">Modules</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.14 }}
              className="text-slate-500 text-[17px] font-normal leading-[1.75] max-w-[650px] mx-auto"
            >
              Tailored dashboard systems configured specifically for different clinic profiles.
            </motion.p>

            {/* ECG Divider */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex items-center justify-center gap-3 pt-1"
            >
              <div className="h-[1px] w-[90px] bg-gradient-to-r from-transparent to-green-400/60" />
              <svg width="56" height="18" viewBox="0 0 56 18" fill="none">
                <path d="M0,9 L10,9 L13,2 L17,16 L21,9 L56,9" stroke="url(#modEcg)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <defs><linearGradient id="modEcg" x1="0" y1="0" x2="56" y2="0"><stop offset="0%" stopColor="#34d399"/><stop offset="100%" stopColor="#06b6d4"/></linearGradient></defs>
              </svg>
              <div className="h-[1px] w-[90px] bg-gradient-to-l from-transparent to-green-400/60" />
            </motion.div>
          </div>

          {/* ── Navigation Pills ── */}
          {(() => {
            const moduleIcons = {
              doctor: <Stethoscope size={17} />,
              reception: <Users size={17} />,
              patient: <User size={17} />,
              pharmacy: <Pill size={17} />,
              laboratory: <FlaskConical size={17} />,
              admin: <Building2 size={17} />,
            };
            return (
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.18 }}
                className="flex flex-wrap items-center justify-center gap-3 mb-[48px]"
              >
                {Object.keys(modules).map((key) => {
                  const isActive = activeModuleTab === key;
                  return (
                    <motion.button
                      key={key}
                      onClick={() => setActiveModuleTab(key)}
                      whileHover={{ scale: 1.04, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      className={`inline-flex items-center gap-2.5 h-[52px] px-7 rounded-full text-[14px] font-semibold capitalize transition-all duration-300 border cursor-pointer ${
                        isActive
                          ? 'text-white border-transparent shadow-lg shadow-green-500/25'
                          : 'bg-white/90 border-slate-200/80 text-slate-600 hover:border-green-400 hover:text-green-700 shadow-sm backdrop-blur-sm'
                      }`}
                      style={isActive ? { background: 'linear-gradient(135deg, #22c55e 0%, #10b981 100%)' } : {}}
                    >
                      {moduleIcons[key]}
                      {key.charAt(0).toUpperCase() + key.slice(1)} Module
                    </motion.button>
                  );
                })}
              </motion.div>
            );
          })()}

          {/* ── Showcase Card ── */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="w-full rounded-[32px] border border-slate-100 bg-white overflow-hidden"
            style={{ boxShadow: '0 20px 60px -15px rgba(16,185,129,0.12), 0 8px 24px -8px rgba(0,0,0,0.07)' }}
          >
            <AnimatePresence mode="wait">
              {(() => {
                const currentModuleKey = modules[activeModuleTab] ? activeModuleTab : 'doctor';
                const currentModule = modules[currentModuleKey];
                return (
                  <motion.div
                    key={currentModuleKey}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.32, ease: 'easeInOut' }}
                    className="grid grid-cols-1 lg:grid-cols-[55%_45%] min-h-[520px]"
                  >
                    {/* Left Side */}
                    <div className="p-12 flex flex-col gap-6 relative overflow-hidden">
                      {/* Module icon card */}
                      <div className="w-[72px] h-[72px] rounded-[22px] flex items-center justify-center text-green-600 border border-green-100 shrink-0"
                        style={{ background: 'linear-gradient(135deg, rgba(220,252,231,0.9) 0%, rgba(187,247,208,0.6) 100%)', boxShadow: '0 8px 24px -6px rgba(16,185,129,0.25)' }}
                      >
                        {{
                          doctor: <Stethoscope size={32} />,
                          reception: <Users size={32} />,
                          patient: <User size={32} />,
                          pharmacy: <Pill size={32} />,
                          laboratory: <FlaskConical size={32} />,
                          admin: <Building2 size={32} />,
                        }[currentModuleKey]}
                      </div>

                      {/* Title + underline */}
                      <div className="space-y-3">
                        <h3 className="text-[32px] sm:text-[38px] font-bold text-slate-900 leading-tight tracking-[-0.5px]">
                          {currentModule.title}
                        </h3>
                        <div className="w-[80px] h-[3px] rounded-full" style={{ background: 'linear-gradient(90deg, #22c55e, #06b6d4)' }} />
                      </div>

                      {/* Description */}
                      <p className="text-[16px] text-slate-500 leading-[1.8] max-w-[480px]">
                        {currentModule.desc}
                      </p>

                      {/* SVG Illustration — unique per module */}
                      <div className="flex-1 flex items-end mt-2">
                        {{
                      doctor: (
                        <svg viewBox="0 0 360 180" fill="none" className="w-full max-w-[340px] opacity-80">
                          {/* Laptop body */}
                          <rect x="60" y="30" width="240" height="150" rx="12" fill="#f0fdf4" stroke="#bbf7d0" strokeWidth="1.5"/>
                          <rect x="72" y="42" width="216" height="124" rx="7" fill="#dcfce7"/>
                          {/* Screen content: chart */}
                          <polyline points="90,130 120,100 150,115 180,85 210,95 240,70 270,80" stroke="#22c55e" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                          <circle cx="180" cy="85" r="5" fill="#22c55e"/>
                          <circle cx="240" cy="70" r="5" fill="#10b981"/>
                          {/* Prescription card */}
                          <rect x="85" y="48" width="85" height="50" rx="6" fill="white" stroke="#d1fae5" strokeWidth="1"/>
                          <rect x="93" y="56" width="50" height="4" rx="2" fill="#bbf7d0"/>
                          <rect x="93" y="64" width="65" height="3" rx="1.5" fill="#e5e7eb"/>
                          <rect x="93" y="70" width="55" height="3" rx="1.5" fill="#e5e7eb"/>
                          <rect x="93" y="76" width="40" height="3" rx="1.5" fill="#e5e7eb"/>
                          {/* Stethoscope icon */}
                          <circle cx="295" cy="60" r="22" fill="#f0fdf4" stroke="#bbf7d0" strokeWidth="1.5"/>
                          <path d="M285,55 C285,50 290,48 295,48 C300,48 305,50 305,55 L305,65 C305,72 298,76 295,76 C292,76 285,72 285,65 Z" stroke="#22c55e" strokeWidth="2" fill="none"/>
                          <circle cx="295" cy="78" r="4" fill="#22c55e"/>
                          {/* Base */}
                          <rect x="40" y="180" width="280" height="8" rx="4" fill="#d1fae5"/>
                        </svg>
                      ),
                      reception: (
                        <svg viewBox="0 0 360 180" fill="none" className="w-full max-w-[340px] opacity-80">
                          {/* Desk */}
                          <rect x="40" y="120" width="280" height="14" rx="5" fill="#d1fae5"/>
                          <rect x="60" y="134" width="8" height="40" rx="3" fill="#bbf7d0"/>
                          <rect x="292" y="134" width="8" height="40" rx="3" fill="#bbf7d0"/>
                          {/* Monitor */}
                          <rect x="120" y="40" width="120" height="80" rx="8" fill="#f0fdf4" stroke="#bbf7d0" strokeWidth="1.5"/>
                          <rect x="128" y="48" width="104" height="64" rx="5" fill="#dcfce7"/>
                          {/* Token display on screen */}
                          <rect x="145" y="58" width="70" height="40" rx="4" fill="white" stroke="#d1fae5"/>
                          <text x="155" y="80" fontFamily="system-ui" fontSize="20" fontWeight="800" fill="#22c55e">07</text>
                          <rect x="128" y="120" width="104" height="4" rx="2" fill="#bbf7d0"/>
                          <rect x="168" y="124" width="24" height="16" rx="3" fill="#d1fae5"/>
                          {/* Queue cards */}
                          <rect x="50" y="60" width="60" height="36" rx="6" fill="white" stroke="#d1fae5" strokeWidth="1"/>
                          <rect x="58" y="68" width="30" height="4" rx="2" fill="#bbf7d0"/>
                          <rect x="58" y="76" width="40" height="3" rx="1.5" fill="#e5e7eb"/>
                          <rect x="250" y="60" width="60" height="36" rx="6" fill="white" stroke="#d1fae5" strokeWidth="1"/>
                          <rect x="258" y="68" width="30" height="4" rx="2" fill="#bbf7d0"/>
                          <rect x="258" y="76" width="40" height="3" rx="1.5" fill="#e5e7eb"/>
                        </svg>
                      ),
                      patient: (
                        <svg viewBox="0 0 360 180" fill="none" className="w-full max-w-[340px] opacity-80">
                          {/* Phone frame */}
                          <rect x="130" y="10" width="100" height="170" rx="16" fill="#f0fdf4" stroke="#bbf7d0" strokeWidth="1.5"/>
                          <rect x="138" y="22" width="84" height="146" rx="10" fill="#dcfce7"/>
                          {/* App UI */}
                          <rect x="145" y="30" width="70" height="12" rx="4" fill="#22c55e" opacity="0.8"/>
                          <rect x="145" y="47" width="70" height="25" rx="6" fill="white" stroke="#d1fae5"/>
                          <circle cx="156" cy="59" r="6" fill="#bbf7d0"/>
                          <rect x="168" y="55" width="35" height="3" rx="1.5" fill="#d1d5db"/>
                          <rect x="168" y="62" width="25" height="3" rx="1.5" fill="#e5e7eb"/>
                          <rect x="145" y="78" width="70" height="25" rx="6" fill="white" stroke="#d1fae5"/>
                          <circle cx="156" cy="90" r="6" fill="#a7f3d0"/>
                          <rect x="168" y="86" width="35" height="3" rx="1.5" fill="#d1d5db"/>
                          <rect x="168" y="93" width="25" height="3" rx="1.5" fill="#e5e7eb"/>
                          <rect x="145" y="110" width="70" height="30" rx="6" fill="#22c55e" opacity="0.15"/>
                          <rect x="153" y="121" width="54" height="4" rx="2" fill="#22c55e" opacity="0.5"/>
                          {/* Side elements */}
                          <rect x="50" y="50" width="65" height="80" rx="10" fill="white" stroke="#d1fae5" strokeWidth="1"/>
                          <rect x="58" y="60" width="40" height="4" rx="2" fill="#bbf7d0"/>
                          <rect x="58" y="70" width="50" height="3" rx="1.5" fill="#e5e7eb"/>
                          <rect x="58" y="78" width="40" height="3" rx="1.5" fill="#e5e7eb"/>
                          <rect x="58" y="94" width="45" height="20" rx="5" fill="#22c55e" opacity="0.2"/>
                          <rect x="245" y="50" width="65" height="80" rx="10" fill="white" stroke="#d1fae5" strokeWidth="1"/>
                          <rect x="253" y="60" width="40" height="4" rx="2" fill="#bbf7d0"/>
                          <rect x="253" y="70" width="50" height="3" rx="1.5" fill="#e5e7eb"/>
                          <rect x="253" y="78" width="40" height="3" rx="1.5" fill="#e5e7eb"/>
                          <rect x="253" y="94" width="45" height="20" rx="5" fill="#22c55e" opacity="0.2"/>
                        </svg>
                      ),
                      pharmacy: (
                        <svg viewBox="0 0 360 180" fill="none" className="w-full max-w-[340px] opacity-80">
                          {/* Shelf */}
                          <rect x="30" y="140" width="300" height="8" rx="3" fill="#d1fae5"/>
                          <rect x="30" y="90" width="300" height="5" rx="2" fill="#d1fae5"/>
                          {/* Medicine boxes */}
                          {[40,90,140,190,240,290].map((x, i) => (
                            <g key={i}>
                              <rect x={x} y={96} width="38" height="44" rx="5" fill={['#f0fdf4','#dcfce7','#d1fae5','#a7f3d0','#f0fdf4','#dcfce7'][i]} stroke="#bbf7d0" strokeWidth="1"/>
                              <rect x={x+6} y={106} width="26" height="3" rx="1.5" fill="#22c55e" opacity="0.5"/>
                              <rect x={x+6} y={113} width="20" height="2" rx="1" fill="#6ee7b7" opacity="0.5"/>
                            </g>
                          ))}
                          {/* QR scanner */}
                          <rect x="140" y="20" width="80" height="65" rx="8" fill="white" stroke="#bbf7d0" strokeWidth="1.5"/>
                          <rect x="150" y="30" width="60" height="45" rx="4" fill="#f0fdf4"/>
                          {[0,1,2,3,4].map(i => <rect key={i} x={153} y={33+i*8} width={54} height={4} rx={1} fill="#22c55e" opacity={0.15+i*0.1}/>)}
                          <path d="M150,30 L155,30 L155,35" stroke="#22c55e" strokeWidth="2" fill="none"/>
                          <path d="M200,30 L205,30 L205,35" stroke="#22c55e" strokeWidth="2" fill="none"/>
                          <path d="M150,70 L155,70 L155,75" stroke="#22c55e" strokeWidth="2" fill="none"/>
                          <path d="M200,70 L205,70 L205,75" stroke="#22c55e" strokeWidth="2" fill="none"/>
                        </svg>
                      ),
                      laboratory: (
                        <svg viewBox="0 0 360 180" fill="none" className="w-full max-w-[340px] opacity-80">
                          {/* Lab bench */}
                          <rect x="30" y="150" width="300" height="10" rx="4" fill="#d1fae5"/>
                          {/* Test tubes */}
                          {[60,110,160].map((x, i) => (
                            <g key={i}>
                              <rect x={x} y={80} width={20} height={70} rx={10} fill={['#dcfce7','#a7f3d0','#bbf7d0'][i]} stroke="#6ee7b7" strokeWidth="1"/>
                              <rect x={x+2} y={110} width={16} height={38} rx={8} fill={['#22c55e','#10b981','#34d399'][i]} opacity="0.35"/>
                            </g>
                          ))}
                          {/* Microscope */}
                          <ellipse cx="260" cy="148" rx="35" ry="6" fill="#d1fae5"/>
                          <rect x="252" y="80" width="16" height="68" rx="4" fill="#f0fdf4" stroke="#bbf7d0" strokeWidth="1.5"/>
                          <ellipse cx="260" cy="80" rx="22" ry="14" fill="#f0fdf4" stroke="#bbf7d0" strokeWidth="1.5"/>
                          <rect x="255" y="55" width="10" height="28" rx="3" fill="#d1fae5" stroke="#bbf7d0" strokeWidth="1"/>
                          <circle cx="260" cy="52" r="10" fill="#22c55e" opacity="0.3"/>
                          {/* DNA strand hint */}
                          <path d="M20,30 C30,50 40,70 30,90 C40,110 50,130 40,150" stroke="#22c55e" strokeWidth="1.5" fill="none" opacity="0.4" strokeDasharray="4,3"/>
                          <path d="M45,30 C35,50 25,70 35,90 C25,110 15,130 25,150" stroke="#10b981" strokeWidth="1.5" fill="none" opacity="0.3" strokeDasharray="4,3"/>
                          {/* Report card */}
                          <rect x="185" y="40" width="70" height="90" rx="6" fill="white" stroke="#d1fae5" strokeWidth="1"/>
                          <rect x="193" y="50" width="40" height="4" rx="2" fill="#bbf7d0"/>
                          {[0,1,2,3,4,5].map(i => <rect key={i} x={193} y={60+i*10} width={54} height={3} rx={1.5} fill="#e5e7eb"/>)}
                        </svg>
                      ),
                      admin: (
                        <svg viewBox="0 0 360 180" fill="none" className="w-full max-w-[340px] opacity-80">
                          {/* Dashboard frame */}
                          <rect x="30" y="20" width="300" height="150" rx="12" fill="#f0fdf4" stroke="#bbf7d0" strokeWidth="1.5"/>
                          {/* Sidebar */}
                          <rect x="30" y="20" width="60" height="150" rx="12" fill="#dcfce7"/>
                          {[40,65,90,115,140].map((y,i) => <rect key={i} x={38} y={y} width={44} height={16} rx={5} fill={i===0?'#22c55e':'#f0fdf4'} opacity={i===0?0.9:0.7}/>)}
                          {/* Charts area */}
                          <rect x="100" y="30" width="110" height="65" rx="8" fill="white" stroke="#d1fae5"/>
                          <polyline points="110,85 130,65 150,75 170,50 190,60 205,40" stroke="#22c55e" strokeWidth="2" fill="none" strokeLinecap="round"/>
                          <rect x="100" y="105" width="50" height="55" rx="8" fill="white" stroke="#d1fae5"/>
                          {[0,1,2,3].map(i => <rect key={i} x={108} y={112+i*11} width={34} height={7} rx={3} fill={['#22c55e','#10b981','#34d399','#6ee7b7'][i]} opacity={0.5+i*0.1}/>)}
                          <rect x="160" y="105" width="170" height="55" rx="8" fill="white" stroke="#d1fae5"/>
                          <rect x="168" y="114" width="50" height="4" rx="2" fill="#bbf7d0"/>
                          <rect x="168" y="124" width="145" height="3" rx="1.5" fill="#e5e7eb"/>
                          <rect x="168" y="133" width="120" height="3" rx="1.5" fill="#e5e7eb"/>
                          <rect x="168" y="142" width="135" height="3" rx="1.5" fill="#e5e7eb"/>
                          <rect x="220" y="30" width="110" height="65" rx="8" fill="white" stroke="#d1fae5"/>
                          {[0,1,2,3].map(i => (
                            <rect key={i} x={230+i*24} y={50} width={18} height={35-i*6} rx={4} fill={['#22c55e','#10b981','#34d399','#6ee7b7'][i]} opacity="0.6"/>
                          ))}
                        </svg>
                      ),
                    }[currentModuleKey]}
                  </div>
                </div>

                {/* Right Side — Feature Panel */}
                <div className="p-10 flex flex-col gap-0 border-l border-slate-100" style={{ background: 'linear-gradient(160deg, rgba(240,253,244,0.6) 0%, rgba(236,253,245,0.4) 100%)' }}>
                  <p className="text-[11px] font-bold uppercase tracking-[2px] text-green-600 mb-6">
                    Core Features Included
                  </p>
                  <div className="space-y-1 flex-1">
                    {currentModule.featureDetails.map((feat, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.28, delay: i * 0.07 }}
                        whileHover={{ x: 4, backgroundColor: 'rgba(240,253,244,0.9)' }}
                        className="flex items-start gap-4 p-4 rounded-[14px] cursor-default transition-all duration-200 group"
                      >
                        <div className="w-[38px] h-[38px] rounded-full flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200" style={{ background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', boxShadow: '0 4px 12px -4px rgba(34,197,94,0.25)' }}>
                          <CheckCircle2 size={18} className="text-green-600" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[15px] font-bold text-slate-800 leading-snug">{feat.title}</p>
                          <p className="text-[13px] text-slate-400 leading-[1.6]">{feat.desc}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

              </motion.div>
              );
              })()}
            </AnimatePresence>
          </motion.div>

        </div>

        {/* Bottom dot meshes */}
        <div className="absolute bottom-0 left-0 w-[240px] h-[160px] pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle, rgba(52,211,153,0.38) 1.5px, transparent 1.5px)',
          backgroundSize: '20px 20px',
          maskImage: 'radial-gradient(ellipse at bottom left, black 15%, transparent 72%)',
          WebkitMaskImage: 'radial-gradient(ellipse at bottom left, black 15%, transparent 72%)',
          opacity: 0.32
        }} />
        <div className="absolute bottom-0 right-0 w-[240px] h-[160px] pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle, rgba(103,232,249,0.38) 1.5px, transparent 1.5px)',
          backgroundSize: '20px 20px',
          maskImage: 'radial-gradient(ellipse at bottom right, black 15%, transparent 72%)',
          WebkitMaskImage: 'radial-gradient(ellipse at bottom right, black 15%, transparent 72%)',
          opacity: 0.32
        }} />

        {/* Flowing wave bottom */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none overflow-hidden" style={{ height: '90px' }}>
          <svg viewBox="0 0 1440 90" preserveAspectRatio="none" className="w-full h-full" fill="none">
            <path d="M0,45 C200,10 400,80 600,45 C800,10 1000,70 1200,38 C1320,20 1400,58 1440,45 L1440,90 L0,90 Z" fill="url(#modWave1)" opacity="0.22"/>
            <path d="M0,62 C150,35 380,88 580,58 C780,28 980,80 1180,55 C1320,38 1400,70 1440,62 L1440,90 L0,90 Z" fill="url(#modWave2)" opacity="0.15"/>
            <path d="M0,78 C240,55 480,90 720,70 C960,50 1200,85 1440,72" stroke="url(#modWaveS)" strokeWidth="1.5" fill="none" opacity="0.45"/>
            <defs>
              <linearGradient id="modWave1" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#6ee7b7"/><stop offset="50%" stopColor="#67e8f9"/><stop offset="100%" stopColor="#a7f3d0"/></linearGradient>
              <linearGradient id="modWave2" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#34d399"/><stop offset="100%" stopColor="#22d3ee"/></linearGradient>
              <linearGradient id="modWaveS" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#34d399"/><stop offset="100%" stopColor="#06b6d4"/></linearGradient>
            </defs>
          </svg>
        </div>

        {/* Fade into next section */}
        <div className="absolute bottom-0 left-0 right-0 h-[50px] pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent, rgba(248,250,252,0.65))' }} />

      </section>

      {/* ── AI SHOWCASE (DARK GRADIENT CONSOLE) ── */}
      <section id="ai-assistant" className="py-32 px-6 lg:px-16 bg-[#07111F] text-white relative overflow-hidden">
        {/* Deep navy, midnight blue, emerald glow radial background mesh */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#07111F] via-[#0B1324] to-[#081F1A] pointer-events-none" />
        
        {/* Soft glowing radial gradients */}
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[150px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-1/2 left-1/3 w-[800px] h-[800px] bg-green-500/5 rounded-full blur-[180px] pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[130px] pointer-events-none animate-pulse" style={{ animationDuration: '12s' }} />

        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:40px_40px]" />

        {/* Molecular & dotted patterns */}
        <div className="absolute top-12 right-12 w-[180px] h-[180px] opacity-15 pointer-events-none">
          <svg viewBox="0 0 100 100" className="w-full h-full text-green-400" fill="none" stroke="currentColor" strokeWidth="1">
            <circle cx="50" cy="20" r="4" fill="currentColor" />
            <circle cx="20" cy="50" r="4" fill="currentColor" />
            <circle cx="80" cy="50" r="4" fill="currentColor" />
            <circle cx="50" cy="80" r="4" fill="currentColor" />
            <line x1="50" y1="24" x2="20" y2="46" />
            <line x1="50" y1="24" x2="80" y2="46" />
            <line x1="20" y1="54" x2="50" y2="76" />
            <line x1="80" y1="54" x2="50" y2="76" />
            <line x1="50" y1="20" x2="50" y2="80" strokeDasharray="2,2" />
          </svg>
        </div>

        {/* Medical dotted pattern */}
        <div className="absolute bottom-20 left-12 w-[140px] h-[100px] opacity-20 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle, #4ade80 1px, transparent 1px)',
          backgroundSize: '16px 16px'
        }} />

        {/* Floating particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full bg-green-400/40"
              style={{
                top: `${20 + i * 15}%`,
                left: `${10 + (i * 17) % 80}%`,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0.2, 0.8, 0.2],
                scale: [1, 1.4, 1]
              }}
              transition={{
                duration: 6 + i * 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>

        <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-[45%_55%] gap-16 items-center relative z-10">
          {/* Left Text */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-green-500/30 bg-green-950/40 text-green-300 text-xs font-semibold tracking-wider uppercase shadow-[0_0_15px_rgba(34,197,94,0.15)]">
              <Sparkles size={14} className="text-green-400 animate-pulse" />
              <span>Intelligent AI Modules</span>
            </div>

            {/* Heading */}
            <h2 className="text-4xl sm:text-[60px] font-black leading-[1.1] tracking-tight">
              Meet Your AI Clinic <br />
              <span className="bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">Assistant</span>
            </h2>

            {/* Description */}
            <p className="text-slate-400 text-[17px] leading-[1.7] max-w-[520px]">
              Automate routine operational work and elevate doctor productivity using AI models trained specifically for healthcare contexts.
            </p>
            
            {/* Feature list */}
            <ul className="space-y-4 max-w-[500px]">
              {[
                "Predict no-shows & appointment cancellations",
                "Dynamic medicine inventory forecasting",
                "AI prescription recommendations",
                "AI voice-to-text transcription",
                "Smart clinical decision support",
                "AI follow-up reminder automation"
              ].map((feature, idx) => (
                <motion.li 
                  key={idx}
                  whileHover={{ x: 6 }}
                  className="flex items-center gap-4 text-[15px] font-medium text-slate-300 hover:text-white transition-colors duration-200 group cursor-default"
                >
                  <span className="w-6 h-6 rounded-full flex items-center justify-center bg-green-500/10 border border-green-500/20 text-green-400 group-hover:bg-green-500/20 group-hover:border-green-500/40 group-hover:shadow-[0_0_10px_rgba(74,222,128,0.3)] transition-all duration-200 shrink-0">
                    <Check size={14} />
                  </span>
                  <span>{feature}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Right Floating Chat Mockup */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex justify-center"
          >
            {/* Main Chat Card */}
            <div 
              className="w-full max-w-[620px] bg-slate-900/60 border border-slate-800/80 rounded-[28px] p-6 shadow-[0_30px_70px_-20px_rgba(0,0,0,0.8),0_0_50px_rgba(16,185,129,0.05)] backdrop-blur-xl relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-300"
              style={{
                transform: 'translate3d(0, 0, 0)',
                willChange: 'transform'
              }}
            >
              {/* Top ambient highlight inside chat */}
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-green-500/20 to-transparent" />

              {/* Chat Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4.5 mb-5">
                <div className="flex items-center gap-3">
                  {/* AI Brain SVG Icon */}
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" strokeOpacity="0.2"/>
                      <path d="M12 6v12M12 12H6m12 0h-6M12 12l4.5-4.5M12 12l-4.5 4.5M12 12l4.5 4.5M12 12l-4.5-4.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div>
                    <span className="text-xs font-black tracking-wider uppercase text-green-400 block leading-none">PEHAL Triage Model v1.2</span>
                    <span className="text-[10px] text-slate-500 font-bold">Autopilot Mode Active</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 bg-slate-950/60 px-3 py-1.5 rounded-full border border-slate-800/80">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                  <span className="text-[11px] text-slate-400 font-semibold">120ms latency</span>
                </div>
              </div>
              
              {/* Conversation Area */}
              <div className="space-y-5 text-sm max-h-[340px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                {chatMessages.map((msg) => (
                  <motion.div 
                    key={msg.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex items-start gap-3 ${msg.sender === 'doctor' ? 'justify-end' : ''}`}
                  >
                    {msg.sender === 'ai' && (
                      <div className="w-9 h-9 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 flex items-center justify-center shrink-0 font-extrabold text-xs relative shadow-[0_0_10px_rgba(34,197,94,0.1)]">
                        AI
                        <span className="absolute -inset-0.5 rounded-full border border-green-400/20 animate-ping" style={{ animationDuration: '3s' }} />
                      </div>
                    )}
                    
                    {msg.sender === 'ai' ? (
                      <div className="bg-slate-950/80 p-4 rounded-2xl rounded-tl-none border border-slate-800/60 max-w-[85%] text-slate-300 shadow-sm space-y-3">
                        <p className="leading-relaxed">{msg.text}</p>
                        
                        {msg.showMedication && (
                          <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.3 }}
                            className="bg-slate-900 border border-slate-850 rounded-xl p-3.5 flex items-start gap-3"
                          >
                            <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 shrink-0">
                              <Pill size={16} />
                            </div>
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-white">Metoprolol Succinate</span>
                                <span className="text-[10px] bg-green-900/30 text-green-400 px-2 py-0.5 rounded-full border border-green-800/30 font-bold animate-pulse">RX Badge</span>
                              </div>
                              <p className="text-[11px] text-slate-400 font-medium">25mg · Once Daily · 14 Days</p>
                            </div>
                          </motion.div>
                        )}
                        <span className="text-[10px] text-slate-600 block text-right">{msg.time}</span>
                      </div>
                    ) : (
                      <div className="bg-green-600/90 p-4 rounded-2xl rounded-tr-none max-w-[85%] text-white shadow-md shadow-green-950/30">
                        <p className="font-semibold leading-relaxed">{msg.text}</p>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10 text-[9px] text-green-100">
                          <span>{msg.isSigned ? "Doctor Signature verified" : "Verified Doctor"}</span>
                          <span>{msg.time}</span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}

                {/* AI Typing Indicator */}
                {isAiTyping && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-3"
                  >
                    <div className="w-9 h-9 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 flex items-center justify-center shrink-0 font-extrabold text-xs">
                      AI
                    </div>
                    <div className="bg-slate-950/80 px-5 py-4 rounded-2xl rounded-tl-none border border-slate-800/60 flex items-center gap-1.5 shadow-inner">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Chat Input Area Wrapper */}
              <div className="mt-5 pt-4 border-t border-slate-800 relative">
                {/* CSS styles for custom text cursor & microphone breathing animation */}
                <style dangerouslySetInnerHTML={{__html: `
                  @keyframes cursorBlink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                  }
                  @keyframes micBreathe {
                    0%, 100% { box-shadow: 0 0 10px rgba(16,185,129,0.15); border-color: rgba(16,185,129,0.25); }
                    50% { box-shadow: 0 0 18px rgba(16,185,129,0.45); border-color: rgba(16,185,129,0.55); }
                  }
                  .animate-cursor-blink {
                    animation: cursorBlink 0.8s infinite;
                  }
                  .animate-mic-breathe {
                    animation: micBreathe 2s infinite ease-in-out;
                  }
                `}} />

                {/* Ambient glow underneath the input */}
                <div className="absolute -bottom-8 left-10 right-10 h-6 bg-emerald-500/10 blur-xl pointer-events-none rounded-full" />
                <div className="absolute -bottom-6 left-1/4 right-1/4 h-4 bg-teal-500/15 blur-lg pointer-events-none rounded-full" />

                <div className="flex items-center gap-3">
                  {/* Container with custom focus logic, dark glass, emerald border */}
                  <motion.div 
                    className="relative flex-1 flex items-center h-16 bg-slate-950/70 border rounded-[32px] px-5 backdrop-blur-md transition-all duration-[250ms] ease-out"
                    style={{
                      borderColor: isInputFocused ? 'rgba(44,232,151,0.55)' : 'rgba(255,255,255,0.08)',
                      boxShadow: isInputFocused ? '0 0 18px rgba(44,232,151,0.22)' : 'none',
                      y: isInputFocused ? -2 : 0,
                      backgroundColor: isInputFocused ? 'rgba(15, 23, 42, 0.8)' : 'rgba(2, 6, 23, 0.7)'
                    }}
                  >
                    <input 
                      type="text" 
                      value={chatInputValue}
                      onFocus={() => setIsInputFocused(true)}
                      onBlur={() => setIsInputFocused(false)}
                      onChange={(e) => setChatInputValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                      className="w-full bg-transparent border-none text-xs text-slate-200 focus:outline-none placeholder-slate-500 font-semibold z-10 caret-emerald-400"
                      style={{
                        outline: 'none',
                        boxShadow: 'none',
                        WebkitAppearance: 'none',
                        appearance: 'none'
                      }}
                    />
                    
                    {/* Visual typing simulation overlay when input is idle and empty */}
                    {!chatInputValue && !isInputFocused && (
                      <div className="absolute left-5 text-xs text-slate-500 font-semibold pointer-events-none flex items-center">
                        <span>{typedPlaceholder}</span>
                        <span className="w-[2px] h-[16px] bg-emerald-450 rounded-full ml-[1px] animate-cursor-blink shadow-[0_0_8px_#34d399]" />
                      </div>
                    )}

                    {/* Blinking cursor when user focuses but has not typed */}
                    {!chatInputValue && isInputFocused && (
                      <span className="absolute left-[20px] w-[2px] h-[16px] bg-emerald-450 rounded-full animate-cursor-blink shadow-[0_0_8px_#34d399] pointer-events-none" />
                    )}

                    {/* Microphone Widget with slow breathing idle glow & listening pulse */}
                    <div className="absolute right-3 flex items-center gap-2">
                      <button 
                        type="button" 
                        onClick={() => setIsVoiceActive(!isVoiceActive)}
                        className={`relative h-10 w-10 rounded-full bg-slate-900 border flex items-center justify-center transition-all duration-200 shadow-inner group ${
                          isVoiceActive ? 'border-emerald-500/40' : 'animate-mic-breathe border-emerald-500/10'
                        }`}
                      >
                        {isVoiceActive && (
                          <>
                            {/* Soundwave expanding rings */}
                            <span className="absolute inset-0 rounded-full border border-emerald-500/40 animate-ping opacity-60" style={{ animationDuration: '2s' }} />
                            <span className="absolute -inset-1 rounded-full border border-emerald-500/10 animate-ping opacity-30" style={{ animationDuration: '3.5s' }} />
                          </>
                        )}
                        <motion.svg 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2.5" 
                          className={`w-4 h-4 ${isVoiceActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-emerald-400'}`}
                          animate={isVoiceActive ? {
                            scale: [1, 1.06, 0.96, 1],
                          } : {}}
                          transition={{
                            repeat: Infinity,
                            duration: 2,
                            ease: "easeInOut"
                          }}
                        >
                          <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M19 10v1a7 7 0 01-14 0v-1M12 19v4M8 23h8" strokeLinecap="round" strokeLinejoin="round"/>
                        </motion.svg>
                      </button>

                      {/* Small active waveform bars */}
                      {isVoiceActive && (
                        <div className="flex items-center gap-[2px] h-3 mr-1 shrink-0">
                          {[1, 2, 3].map((val) => (
                            <motion.span 
                              key={val}
                              className="w-[1.5px] bg-emerald-450 rounded-full"
                              animate={{
                                height: [3, val === 2 ? 10 : 6, 3]
                              }}
                              transition={{
                                repeat: Infinity,
                                duration: 0.5 + val * 0.1,
                                ease: "easeInOut"
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>

                  {/* Send Button: Emerald-to-teal gradient circular button */}
                  <motion.button 
                    type="button" 
                    onClick={handleSendChatMessage}
                    whileHover="hover"
                    whileTap="tap"
                    className="h-[58px] w-[58px] rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 hover:shadow-emerald-400/40 relative overflow-hidden shrink-0 border border-emerald-400/30"
                  >
                    <motion.svg 
                      viewBox="0 0 24 24" 
                      fill="currentColor" 
                      className="w-5 h-5 text-white"
                      variants={{
                        hover: { rotate: 10, scale: 1.08 },
                        tap: { x: [0, 8, 0], y: [0, -3, 0], scale: 0.95 }
                      }}
                      transition={{ type: "spring", stiffness: 350, damping: 12 }}
                    >
                      {/* Custom SVG plane with rounded edges */}
                      <path d="M3.4 22a.8.8 0 01-.8-.9l1.6-6.4 12.8-2.7-12.8-2.7L2.6 2.9a.8.8 0 011.1-.9l18 9.5a.8.8 0 010 1.4l-18 9.5a.8.8 0 01-.3.1z"/>
                    </motion.svg>
                    {/* Ripple feedback inside */}
                    <motion.span 
                      className="absolute inset-0 bg-white/25 rounded-full pointer-events-none opacity-0"
                      variants={{
                        tap: { scale: [0, 2], opacity: [0.6, 0] }
                      }}
                      transition={{ duration: 0.4 }}
                    />
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Section Divider - Glowing wave SVG */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none overflow-hidden" style={{ height: '80px' }}>
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="w-full h-full" fill="none">
            <path d="M0,40 C320,80 640,0 960,40 C1280,80 1380,20 1440,30 L1440,80 L0,80 Z" fill="#F8FAFC" />
            <path d="M0,40 C320,80 640,0 960,40 C1280,80 1380,20 1440,30" stroke="url(#waveGlow)" strokeWidth="3" opacity="0.35" fill="none" />
            <defs>
              <linearGradient id="waveGlow" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="50%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#34d399" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </section>
      <section className="py-36 px-6 lg:px-16 bg-white relative overflow-hidden min-h-[820px] lg:min-h-[920px] flex items-center">
        {/* Soft background graphic accents */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Subtle cyan radial glow */}
          <div className="absolute top-1/4 right-[10%] w-[700px] h-[700px] bg-cyan-300/10 rounded-full blur-[140px] mix-blend-multiply animate-pulse" style={{ animationDuration: '9s' }} />
          {/* Subtle light emerald gradient */}
          <div className="absolute bottom-1/4 left-[15%] w-[650px] h-[650px] bg-emerald-300/10 rounded-full blur-[130px] mix-blend-multiply" />
          
          {/* Medical Hexagon Network (5% opacity) */}
          <svg className="absolute top-12 left-10 w-[240px] h-[240px] text-slate-900 opacity-[0.04]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M30 20 L50 9 L70 20 L70 42 L50 53 L30 42 Z M50 53 L50 75 L70 86 L90 75 L90 53 L70 42 Z M10 53 L30 42 L30 64 L50 75 L50 97 L30 86 Z" />
            <circle cx="50" cy="9" r="2.5" fill="currentColor" />
            <circle cx="70" cy="20" r="2.5" fill="currentColor" />
            <circle cx="70" cy="42" r="2.5" fill="currentColor" />
            <circle cx="50" cy="53" r="2.5" fill="currentColor" />
            <circle cx="30" cy="42" r="2.5" fill="currentColor" />
            <circle cx="30" cy="20" r="2.5" fill="currentColor" />
          </svg>

          {/* Faint network connecting lines */}
          <svg className="absolute right-20 bottom-16 w-[300px] h-[220px] text-green-400 opacity-[0.06]" viewBox="0 0 100 80" fill="none" stroke="currentColor" strokeWidth="0.75">
            <circle cx="10" cy="70" r="2" fill="currentColor" />
            <circle cx="40" cy="40" r="2" fill="currentColor" />
            <circle cx="50" cy="15" r="2" fill="currentColor" />
            <circle cx="80" cy="50" r="2" fill="currentColor" />
            <circle cx="90" cy="25" r="2" fill="currentColor" />
            <line x1="10" y1="70" x2="40" y2="40" />
            <line x1="40" y1="40" x2="50" y2="15" />
            <line x1="40" y1="40" x2="80" y2="50" />
            <line x1="50" y1="15" x2="90" y2="25" />
            <line x1="80" y1="50" x2="90" y2="25" strokeDasharray="2,2" />
          </svg>

          {/* Floating tiny particles */}
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-cyan-400/20"
              style={{
                top: `${15 + i * 18}%`,
                right: `${5 + (i * 22) % 40}%`,
              }}
              animate={{
                y: [0, -25, 0],
                x: [0, 15, 0],
                opacity: [0.3, 0.7, 0.3]
              }}
              transition={{
                duration: 7 + i * 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>

        <div className="max-w-[1440px] mx-auto w-full grid grid-cols-1 lg:grid-cols-[44%_56%] gap-16 lg:gap-24 items-center relative z-10">
          {/* Left Text Column */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-10"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2.5 px-4.5 py-2 rounded-full bg-emerald-55/15 border border-emerald-500/20 text-emerald-700 text-xs font-semibold uppercase tracking-widest shadow-sm">
              <Laptop size={14} className="text-emerald-600" />
              <span>Responsive Ecosystem</span>
            </div>

            {/* Heading */}
            <h2 className="text-5xl sm:text-[76px] font-black text-slate-900 leading-[1.05] tracking-tight">
              One Platform. <br />
              <span className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-500 bg-clip-text text-transparent">All Devices.</span>
            </h2>

            {/* Description */}
            <p className="text-slate-500/90 text-[21px] leading-[1.8] max-w-[620px]">
              Access appointments, prescriptions, EMR, AI assistant, billing, pharmacy, laboratory, and clinic operations from any device.
            </p>

            {/* Feature Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-7 max-w-[540px]">
              {[
                {
                  title: 'Desktop Optimized',
                  desc: 'Central Command',
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-green-600">
                      <rect x="2" y="3" width="20" height="14" rx="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                      <path d="M12 7l1.5 1.5M12 7l-1.5 1.5" />
                    </svg>
                  )
                },
                {
                  title: 'Tablet Ready',
                  desc: 'Clinical Mobility',
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-green-600">
                      <rect x="4" y="2" width="16" height="20" rx="2" transform="rotate(90 12 12)" />
                      <circle cx="12" cy="18" r="1" />
                    </svg>
                  )
                },
                {
                  title: 'Mobile First',
                  desc: 'On-the-go Patient App',
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-green-600">
                      <rect x="5" y="2" width="14" height="20" rx="2" />
                      <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  )
                },
                {
                  title: 'Cloud Sync',
                  desc: 'Instant Handshake',
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-green-600">
                      <path d="M18 10a6 6 0 00-12 0c-1.7 0-3 1.3-3 3s1.3 3 3 3h12c1.7 0 3-1.3 3-3s-1.3-3-3-3z" />
                      <path d="M12 12v3M10 14l2-2 2 2" />
                    </svg>
                  )
                }
              ].map((card, idx) => (
                <div 
                  key={idx} 
                  className="bg-white/70 border border-slate-200/80 p-5 rounded-[22px] shadow-sm backdrop-blur-md flex items-start gap-4 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg hover:border-green-500/40 hover:bg-white cursor-default group"
                >
                  <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200 shadow-inner">
                    {card.icon}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800 tracking-tight leading-none mb-1 group-hover:text-green-600 transition-colors">{card.title}</h4>
                    <p className="text-[11px] text-slate-400 font-bold tracking-wide">{card.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right Devices Column */}
          <div className="relative flex items-center justify-center min-h-[560px] lg:min-h-[660px] w-full mt-12 lg:mt-0">
            {/* Center Desktop Monitor (Background layer, floats up/down) */}
            <motion.div 
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
              className="w-full max-w-[550px] z-10 md:absolute shadow-[0_30px_70px_-15px_rgba(0,0,0,0.12)] rounded-t-xl"
              style={{ transform: 'translate3d(0,0,0)', willChange: 'transform' }}
            >
              <div className="bg-slate-900/95 p-2 rounded-t-[22px]">
                {/* Clean Bezel Only, No container box */}
                <div className="bg-slate-950 p-2.5 rounded-t-[16px] border border-slate-800/60">
                  <div className="relative bg-white aspect-[16/10] rounded-[8px] overflow-hidden border border-slate-200 shadow-inner">
                    <div className="absolute inset-0 flex bg-[#F8FAFC] text-[8px] font-semibold text-slate-600 select-none">
                      {/* Sidebar */}
                      <div className="w-[28%] bg-slate-900 text-slate-400 p-2.5 flex flex-col gap-3.5 border-r border-slate-850 shrink-0">
                        <div className="flex items-center gap-1.5 text-white border-b border-slate-800 pb-2.5">
                          <div className="w-4 h-4 rounded bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-[8px] font-black text-white shrink-0 shadow-sm">P</div>
                          <span className="text-[9px] font-black tracking-tight">PEHAL AI</span>
                        </div>
                        <div className="space-y-2">
                          <div className="bg-green-600 text-white rounded px-2 py-1 flex items-center gap-1 font-black"><Activity size={8} />Dashboard</div>
                          <div className="hover:bg-slate-800 px-2 py-1 rounded flex items-center gap-1"><Calendar size={8} />Appointments</div>
                          <div className="hover:bg-slate-800 px-2 py-1 rounded flex items-center gap-1"><Users size={8} />Patients</div>
                          <div className="hover:bg-slate-800 px-2 py-1 rounded flex items-center gap-1"><Pill size={8} />Pharmacy</div>
                        </div>
                      </div>
                      {/* Main UI view */}
                      <div className="flex-1 p-3.5 space-y-4 flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2 shrink-0">
                          <span className="text-[11px] font-black text-slate-800">Good Morning, Dr. Sharma 👋</span>
                          <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                        </div>
                        {/* Dynamic Grid stats */}
                        <div className="grid grid-cols-3 gap-2 shrink-0">
                          <div className="bg-white p-2 border border-slate-200/80 rounded-lg shadow-sm">
                            <span className="text-slate-400 block text-[6px] font-black uppercase">Appointments</span>
                            <motion.span 
                              animate={{ scale: [1, 1.05, 1] }} 
                              transition={{ duration: 3, repeat: Infinity }}
                              className="text-[12px] font-black text-slate-800 block mt-0.5"
                            >
                              128
                            </motion.span>
                          </div>
                          <div className="bg-white p-2 border border-slate-200/80 rounded-lg shadow-sm">
                            <span className="text-slate-400 block text-[6px] font-black uppercase">Patients</span>
                            <span className="text-[12px] font-black text-slate-800 block mt-0.5">1,248</span>
                          </div>
                          <div className="bg-white p-2 border border-slate-200/80 rounded-lg shadow-sm">
                            <span className="text-slate-400 block text-[6px] font-black uppercase">Revenue</span>
                            <span className="text-[12px] font-black text-slate-800 block mt-0.5">₹48k</span>
                          </div>
                        </div>
                        {/* Interactive Graph Chart */}
                        <div className="flex-1 bg-white p-2 border border-slate-200/80 rounded-lg shadow-sm flex flex-col justify-between overflow-hidden">
                          <span className="text-[7px] font-black text-slate-800 block">Weekly Consulting Activity</span>
                          <div className="flex-1 flex items-end gap-2.5 pt-3">
                            {[35, 55, 25, 75, 90, 45, 65, 80].map((val, i) => (
                              <motion.div 
                                key={i}
                                className="flex-1 bg-gradient-to-t from-green-500/20 to-emerald-500/50 rounded-t" 
                                animate={{ height: [`${val-10}%`, `${val}%`, `${val-10}%`] }}
                                transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: "easeInOut" }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-slate-900 h-2 w-full border-t border-slate-800 hidden md:block" />
              <div className="w-28 h-20 bg-gradient-to-b from-slate-300 to-slate-450 mx-auto rounded-b-xl shadow-md hidden md:block relative border-t border-slate-200" />
            </motion.div>

            {/* Front-left Tablet Mockup (rotates and floats) */}
            <motion.div 
              animate={{ y: [-10, -18, -10], rotate: [-2, 0, -2] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              whileHover={{ scale: 1.05, zIndex: 40 }}
              className="w-full max-w-[290px] z-20 md:absolute md:left-[-20px] md:bottom-2 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.18)] rounded-[24px] bg-slate-950 p-2.5 border border-slate-850"
              style={{ transform: 'translate3d(0,0,0)', willChange: 'transform' }}
            >
              <div className="relative bg-white aspect-[4/3] rounded-[16px] overflow-hidden border border-slate-200 p-2.5 flex flex-col gap-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span className="font-black text-slate-800 text-[9px]">Consult Calendar</span>
                  <span className="text-[6.5px] text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded">Live Sync</span>
                </div>
                <div className="flex-1 grid grid-cols-[38%_62%] gap-2 overflow-hidden">
                  {/* Miniature Calendar UI */}
                  <div className="border-r border-slate-100 pr-1.5 space-y-1 text-slate-400 text-[5px]">
                    <div className="grid grid-cols-7 gap-0.5 text-center font-bold">
                      {['S','M','T','W','T','F','S'].map((d, i) => <span key={i}>{d}</span>)}
                    </div>
                    <div className="grid grid-cols-7 gap-0.5 text-center">
                      {[...Array(28)].map((_, i) => (
                        <span key={i} className={`rounded-[1.5px] py-0.5 ${i === 18 ? 'bg-green-600 text-white font-black' : ''}`}>{i+1}</span>
                      ))}
                    </div>
                  </div>
                  {/* Schedule items */}
                  <div className="space-y-1.5 text-[5.5px]">
                    <div className="bg-emerald-50 border-l-2 border-emerald-500 p-1.5 rounded flex flex-col">
                      <span className="font-black text-emerald-950 text-[6px]">10:30 AM · Priya Mehta</span>
                      <span className="text-emerald-700">Follow-up Consult</span>
                    </div>
                    <div className="bg-blue-50 border-l-2 border-blue-500 p-1.5 rounded flex flex-col">
                      <span className="font-black text-blue-950 text-[6px]">12:00 PM · Rahul Verma</span>
                      <span className="text-blue-700">Arrhythmia Review</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Front-right Phone Mockup (floats higher) */}
            <motion.div 
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              whileHover={{ scale: 1.05, zIndex: 40 }}
              className="w-full max-w-[180px] z-35 md:absolute md:right-[40px] md:bottom-[-20px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.22)] rounded-[34px] bg-slate-950 p-3 border border-slate-850"
              style={{ transform: 'translate3d(0,0,0)', willChange: 'transform' }}
            >
              {/* iPhone screen with dynamic island */}
              <div className="relative bg-slate-900 text-white rounded-[26px] overflow-hidden border border-slate-800 text-[8px] font-semibold p-3.5 aspect-[9/19] flex flex-col gap-3.5">
                <div className="mx-auto w-11 h-4 bg-black rounded-full mb-1 flex items-center justify-center shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                </div>
                <div className="space-y-2.5 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <p className="text-[7.5px] text-slate-400 font-bold block leading-none">Patient Portal</p>
                    <p className="text-[11px] font-black text-white leading-tight">Welcome, Rahul</p>
                  </div>
                  {/* Appointment card */}
                  <div className="bg-slate-950/65 border border-slate-850 p-2.5 rounded-xl space-y-1.5">
                    <span className="text-[6.5px] text-slate-500 block font-black uppercase">Upcoming Consult</span>
                    <p className="font-black text-[8.5px] text-green-400">Dr. Priya Mehta</p>
                    <p className="text-[6.5px] text-slate-400 leading-none">Tue, 21 May · 03:00 PM</p>
                  </div>
                  {/* Prescription */}
                  <div className="bg-slate-950/65 border border-slate-850 p-2.5 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-white block text-[7.5px] font-black">Metoprolol 25mg</span>
                      <span className="text-[6px] text-slate-400 block mt-0.5">1-0-1 After Food</span>
                    </div>
                    <CheckCircle2 size={13} className="text-green-500" />
                  </div>
                  <button type="button" className="w-full py-2.5 rounded-lg bg-green-600 text-white font-black text-[7.5px] uppercase tracking-wider block text-center shadow-md shadow-green-900/30">
                    Book Consult
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Smart Watch Mockup (Far right, breathes) */}
            <motion.div 
              animate={{ scale: [1, 1.03, 1], y: [0, -3, 0] }}
              transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
              whileHover={{ scale: 1.05, zIndex: 40 }}
              className="w-full max-w-[115px] z-20 md:absolute md:right-[-60px] md:top-[18%] shadow-[0_15px_35px_-8px_rgba(0,0,0,0.25)] rounded-[22px] bg-slate-950 p-2 border border-slate-850"
              style={{ transform: 'translate3d(0,0,0)', willChange: 'transform' }}
            >
              <div className="relative bg-black text-white rounded-[15px] overflow-hidden border border-slate-900 aspect-[1/1.2] p-2 flex flex-col justify-between text-[6.5px] font-bold">
                <div className="flex items-center justify-between text-slate-500 font-black text-[5px]">
                  <span>PEHAL</span>
                  <span className="text-red-500 animate-pulse">♥ 74 bpm</span>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-1.5 rounded-lg flex flex-col gap-0.5 my-1.5">
                  <span className="text-green-400 font-black text-[6.5px] block leading-none">Meds Intake</span>
                  <span className="text-[5.5px] text-slate-300">Metoprolol</span>
                  <span className="text-[5px] text-slate-500 font-medium">Take in 5m</span>
                </div>
                <div className="bg-green-600 rounded py-1 text-center text-white text-[5px] uppercase font-black cursor-pointer hover:bg-green-500 transition">
                  Dismiss
                </div>
              </div>
            </motion.div>

          </div>
        </div>

        {/* Layered bottom decorative waves */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none overflow-hidden" style={{ height: '90px' }}>
          <svg viewBox="0 0 1440 90" preserveAspectRatio="none" className="w-full h-full" fill="none">
            {/* Wave 1 - Emerald */}
            <path d="M0,50 C240,10 480,90 720,50 C960,10 1200,80 1440,60 L1440,90 L0,90 Z" fill="#10b981" opacity="0.04" />
            {/* Wave 2 - Cyan */}
            <path d="M0,65 C180,30 400,99 640,65 C880,30 1120,90 1440,75 L1440,90 L0,90 Z" fill="#06b6d4" opacity="0.03" />
            {/* Wave 3 - Teal */}
            <path d="M0,80 C320,60 640,95 960,75 C1280,55 1380,85 1440,80 L1440,90 L0,90 Z" fill="#14b8a6" opacity="0.03" />
          </svg>
        </div>
      </section>

      {/* ── COMPARISON TABLE ── */}
      <section className="py-36 px-6 lg:px-16 bg-gradient-to-b from-[#F8FAFC] via-[#F0FDF4]/30 to-[#ECFDF5]/50 relative overflow-hidden">
        {/* Soft background glows and mesh overlays */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-green-300/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-teal-300/5 rounded-full blur-[140px]" />
          
          {/* Subtle connecting node SVG background */}
          <svg className="absolute top-20 right-20 w-[280px] h-[280px] text-emerald-500 opacity-[0.03]" viewBox="0 0 100 100" fill="currentColor">
            <circle cx="20" cy="20" r="2" />
            <circle cx="80" cy="20" r="2" />
            <circle cx="50" cy="50" r="3" />
            <circle cx="30" cy="80" r="2" />
            <circle cx="70" cy="80" r="2" />
            <line x1="20" y1="20" x2="50" y2="50" stroke="currentColor" strokeWidth="0.5" />
            <line x1="80" y1="20" x2="50" y2="50" stroke="currentColor" strokeWidth="0.5" />
            <line x1="30" y1="80" x2="50" y2="50" stroke="currentColor" strokeWidth="0.5" />
            <line x1="70" y1="80" x2="50" y2="50" stroke="currentColor" strokeWidth="0.5" />
          </svg>

          {/* Dotted pattern overlay */}
          <div className="absolute top-10 left-10 w-[120px] h-[120px] opacity-[0.08]" style={{
            backgroundImage: 'radial-gradient(circle, #0ea5e9 1px, transparent 1px)',
            backgroundSize: '18px 18px'
          }} />
        </div>

        <div className="max-w-[1440px] mx-auto space-y-20 relative z-10">
          
          {/* Section Header */}
          <div className="text-center space-y-5 max-w-3xl mx-auto">
            {/* Premium Badge */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4.5 py-1.5 rounded-full bg-emerald-50/80 border border-emerald-200/50 text-emerald-800 text-[11px] font-black uppercase tracking-wider shadow-sm backdrop-blur-md"
            >
              <Activity size={12} className="text-emerald-600 animate-pulse" />
              <span>Why Pehal Healthcare AI-CMS</span>
            </motion.div>

            {/* Main Heading */}
            <h3 className="text-4xl sm:text-[60px] font-black tracking-tight text-slate-900 leading-tight">
              Platform <span className="bg-gradient-to-r from-[#0EA5A4] to-[#16C784] bg-clip-text text-transparent">Comparisons</span>
            </h3>

            {/* Subtitle */}
            <p className="text-slate-500/90 text-[17px] leading-[1.7] max-w-xl mx-auto font-medium">
              See how Pehal Healthcare AI-CMS outperforms traditional hospital systems and manual processes at every critical touchpoint.
            </p>
          </div>

          {/* Reusable comparison rows data */}
          {(() => {
            const comparisonRows = [
              {
                id: 'booking',
                parameter: 'Booking System',
                icon: <Calendar size={18} className="text-green-600" />,
                manual: { title: 'Paper registers', desc: 'Manual entry, high errors' },
                traditional: { title: 'Local offline software', desc: 'Limited access, no sync' },
                ai: { title: 'AI calendar optimization', desc: 'Smart scheduling, auto optimization' }
              },
              {
                id: 'emr',
                parameter: 'EMR & Prescription',
                icon: <FileText size={18} className="text-green-600" />,
                manual: { title: 'Written receipts', desc: 'Illegible handwriting, lost data' },
                traditional: { title: 'Static doc templates', desc: 'No personalization' },
                ai: { title: 'Interactive timeline records', desc: 'Smart EMR with version history' }
              },
              {
                id: 'safety',
                parameter: 'Drug Safety Checks',
                icon: <Shield size={18} className="text-green-600" />,
                manual: { title: 'None', desc: 'High risk of drug interactions' },
                traditional: { title: 'Reference books', desc: 'Manual lookup, time consuming' },
                ai: { title: 'Integrated interaction alerts', desc: 'Real-time safety & allergy checks' }
              },
              {
                id: 'billing',
                parameter: 'Billing & Pharmacy',
                icon: <CreditCard size={18} className="text-green-600" />,
                manual: { title: 'Cash receipts', desc: 'Manual totals, no tracking' },
                traditional: { title: 'Separate invoices', desc: 'Disconnected billing system' },
                ai: { title: 'Central auto-depletion', desc: 'Inventory sync with billing' }
              }
            ];

            return (
              <div className="space-y-12 w-full">
                {/* Desktop Glass Comparison Card */}
                <motion.div 
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7 }}
                  className="hidden md:block bg-white/80 border border-slate-200/60 rounded-[36px] shadow-2xl shadow-slate-100/50 backdrop-blur-xl overflow-hidden"
                >
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50 text-[13px] font-black text-slate-800">
                        <th className="p-8 w-1/4 text-left">
                          <span className="flex items-center gap-2">
                            <Activity size={16} className="text-slate-400" />
                            Feature Parameter
                          </span>
                        </th>
                        <th className="p-8 w-1/4 text-left font-black text-purple-900/80">
                          <span className="flex items-center gap-2">
                            <XCircle size={16} className="text-purple-500" />
                            Manual Process
                          </span>
                        </th>
                        <th className="p-8 w-1/4 text-left font-black text-amber-900/85">
                          <span className="flex items-center gap-2">
                            <AlertTriangle size={16} className="text-amber-500" />
                            Traditional HMS
                          </span>
                        </th>
                        {/* Highlights Column */}
                        <th className="p-8 w-1/4 text-left bg-emerald-500/5 text-emerald-800 font-extrabold relative shadow-[inset_1px_0_0_rgba(16,185,129,0.08),inset_-1px_0_0_rgba(16,185,129,0.08)]">
                          <span className="flex items-center gap-2 relative z-10">
                            <Sparkles size={16} className="text-emerald-600 animate-pulse" />
                            PEHAL Healthcare AI-CMS
                          </span>
                          <div className="absolute top-0 bottom-0 left-0 w-[3px] bg-emerald-500" />
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-655">
                      {comparisonRows.map((row) => (
                        <tr 
                          key={row.id} 
                          className="hover:bg-slate-50/40 transition-all duration-300 group"
                        >
                          {/* Parameter cell */}
                          <td className="p-8 align-middle">
                            <div className="flex items-center gap-3.5">
                              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600 group-hover:scale-105 transition-transform shrink-0 shadow-inner">
                                {row.icon}
                              </div>
                              <span className="text-[14.5px] font-black text-slate-800 group-hover:text-green-600 transition-colors">{row.parameter}</span>
                            </div>
                          </td>

                          {/* Manual cell */}
                          <td className="p-8 align-middle">
                            <div className="space-y-1">
                              <span className="flex items-center gap-1.5 text-slate-500 font-bold text-[13.5px]">
                                <span className="text-purple-400 font-black">✕</span> {row.manual.title}
                              </span>
                              <p className="text-[11.5px] text-slate-400 font-medium pl-4">{row.manual.desc}</p>
                            </div>
                          </td>

                          {/* Traditional HMS cell */}
                          <td className="p-8 align-middle">
                            <div className="space-y-1">
                              <span className="flex items-center gap-1.5 text-slate-600 font-bold text-[13.5px]">
                                <span className="text-amber-500 font-bold">!</span> {row.traditional.title}
                              </span>
                              <p className="text-[11.5px] text-slate-400 font-medium pl-4">{row.traditional.desc}</p>
                            </div>
                          </td>

                          {/* AI-CMS Highlighting cell */}
                          <td className="p-8 align-middle bg-emerald-500/[0.02] shadow-[inset_1px_0_0_rgba(16,185,129,0.06),inset_-1px_0_0_rgba(16,185,129,0.06)] relative group-hover:bg-emerald-500/[0.04]">
                            <div className="space-y-1 pl-1">
                              <span className="flex items-center gap-2 text-emerald-700 font-black text-[14.5px]">
                                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 shadow-sm" /> 
                                {row.ai.title}
                              </span>
                              <p className="text-[12px] text-emerald-600/90 font-medium pl-6">{row.ai.desc}</p>
                            </div>
                            <div className="absolute top-0 bottom-0 left-0 w-[3px] bg-emerald-500/20 group-hover:bg-emerald-500 transition-colors" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </motion.div>

                {/* Mobile Responsive Cards */}
                <div className="md:hidden space-y-6">
                  {comparisonRows.map((row) => (
                    <motion.div 
                      key={row.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-md space-y-5"
                    >
                      <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                        <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center text-green-600 shrink-0">
                          {row.icon}
                        </div>
                        <span className="text-base font-black text-slate-800">{row.parameter}</span>
                      </div>

                      <div className="space-y-4 text-xs font-semibold">
                        <div className="bg-purple-50/50 p-3.5 rounded-xl border border-purple-100">
                          <span className="text-purple-700 font-black block mb-0.5">✕ Manual Process</span>
                          <span className="text-slate-600 font-bold">{row.manual.title}</span>
                          <p className="text-[11px] text-slate-400 font-medium mt-1">{row.manual.desc}</p>
                        </div>
                        <div className="bg-amber-50/40 p-3.5 rounded-xl border border-amber-100">
                          <span className="text-amber-700 font-black block mb-0.5">! Traditional HMS</span>
                          <span className="text-slate-700 font-bold">{row.traditional.title}</span>
                          <p className="text-[11px] text-slate-400 font-medium mt-1">{row.traditional.desc}</p>
                        </div>
                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200/80 relative overflow-hidden">
                          <span className="text-emerald-700 font-black block mb-1">✔ PEHAL Healthcare AI-CMS</span>
                          <span className="text-emerald-800 font-black text-sm block">{row.ai.title}</span>
                          <p className="text-[11.5px] text-emerald-600/90 font-medium mt-1">{row.ai.desc}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Bottom Information Statistics Panel */}
                <motion.div 
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: 0.2 }}
                  className="bg-white/90 border border-slate-200/70 p-8 lg:p-12 rounded-[36px] shadow-xl backdrop-blur-xl grid grid-cols-1 lg:grid-cols-[45%_55%] gap-12 items-center"
                >
                  {/* Left content */}
                  <div className="space-y-5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner">
                      <Shield size={24} />
                    </div>
                    <h4 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                      Built for Healthcare.<br />Designed for Impact.
                    </h4>
                    <p className="text-slate-500/90 text-sm leading-relaxed max-w-md font-medium">
                      Pehal Healthcare AI-CMS combines intelligence, automation, AI assistance, smart scheduling, billing, pharmacy, laboratory management, and real-time analytics into one intelligent healthcare ecosystem.
                    </p>
                  </div>

                  {/* Right stats cards */}
                  <div className="grid grid-cols-2 gap-4 lg:gap-6">
                    {[
                      { val: '99.9%', label: 'Data Accuracy', desc: 'Clinical precision logs', color: 'text-emerald-600', icon: <CheckCircle2 size={16} /> },
                      { val: '60%', label: 'Time Saved', desc: 'In consulting workflows', color: 'text-blue-600', icon: <Activity size={16} /> },
                      { val: '3x', label: 'Efficiency Lift', desc: 'Operational capacity', color: 'text-teal-600', icon: <Sparkles size={16} /> },
                      { val: '24×7', label: 'Cloud Hosted', desc: 'Uptime SLA guarantees', color: 'text-slate-800', icon: <Globe size={16} /> }
                    ].map((stat, i) => (
                      <motion.div 
                        key={i}
                        whileHover={{ y: -4, scale: 1.02 }}
                        className="bg-slate-50/50 border border-slate-200/60 p-5 rounded-2xl flex flex-col gap-1 transition-all hover:bg-white shadow-sm hover:shadow-md cursor-default"
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xl lg:text-2xl font-black ${stat.color}`}>{stat.val}</span>
                          <span className="text-slate-400">{stat.icon}</span>
                        </div>
                        <span className="text-xs font-black text-slate-800 mt-1">{stat.label}</span>
                        <p className="text-[10px] text-slate-400 font-bold leading-none mt-0.5">{stat.desc}</p>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>
            );
          })()}

        </div>
      </section>

      {/* ── PRICING PREVIEW ── */}
      <section id="pricing" className="py-36 px-6 lg:px-16 bg-gradient-to-b from-white via-[#F0FDF4]/20 to-[#ECFDF5]/30 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/3 left-10 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[120px]" />
          
          {/* Faint network illustration overlay */}
          <svg className="absolute top-24 left-[15%] w-[180px] h-[180px] text-green-600 opacity-[0.03]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1">
            <circle cx="50" cy="50" r="40" strokeDasharray="4,4" />
            <path d="M50 10 L50 90 M10 50 L90 50" />
            <circle cx="50" cy="10" r="3" fill="currentColor" />
            <circle cx="50" cy="90" r="3" fill="currentColor" />
            <circle cx="10" cy="50" r="3" fill="currentColor" />
            <circle cx="90" cy="50" r="3" fill="currentColor" />
          </svg>
        </div>

        <div className="max-w-[1440px] mx-auto space-y-20 relative z-10">
          
          {/* Header */}
          <div className="text-center space-y-5 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4.5 py-1.5 rounded-full bg-emerald-50/80 border border-emerald-200/50 text-emerald-800 text-[11px] font-black uppercase tracking-wider shadow-sm backdrop-blur-md">
              <Sparkles size={12} className="text-emerald-600" />
              <span>Flexible Subscription Plans</span>
            </div>
            <h2 className="text-4xl sm:text-[60px] font-black text-slate-900 tracking-tight leading-tight">
              Choose the <span className="bg-gradient-to-r from-green-600 to-emerald-650 bg-clip-text text-transparent">Right Plan</span>
            </h2>
            <p className="text-slate-500/90 text-[17px] leading-[1.7] max-w-lg mx-auto font-medium">
              Enterprise-grade SaaS pricing, dynamically custom-tailored to your clinic's specific operational needs.
            </p>
          </div>

          {/* Pricing Slider Carousel */}
          {loadingPlans ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-bold text-slate-500">Loading subscription plans...</span>
            </div>
          ) : (
            <div className="relative w-full">
              {/* Left/Right scroll indicators for desktop */}
              {plans.length > 3 && (
                <div className="absolute -top-12 right-2 hidden md:flex items-center gap-2 text-slate-400 select-none">
                  <span className="text-[10px] font-black uppercase tracking-widest bg-slate-100 border border-slate-200 px-3 py-1 rounded-full">Drag or Scroll to Explore</span>
                </div>
              )}

              {/* Slider Viewport Container */}
              <div 
                ref={sliderRef}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                className="flex gap-8 overflow-x-auto scrollbar-none snap-x snap-mandatory scroll-smooth pb-12 pt-6 px-4 cursor-grab active:cursor-grabbing select-none"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {plans.map((plan, idx) => {
                  const isActive = plan._id === activePlanId;
                  const isHovered = plan._id === hoveredPlanId;
                  const isHighlighted = isActive || isHovered;
                  const isPopular = plan.isPopular || plan.popular || plan.badge === 'Most Popular';
                  const displayPrice = plan.priceMonthly ?? 0;
                  
                  return (
                    <motion.div
                      id={`pricing-card-${plan._id}`}
                      key={plan._id}
                      onClick={() => {
                        setActivePlanId(plan._id);
                        const cardEl = document.getElementById(`pricing-card-${plan._id}`);
                        if (cardEl && sliderRef.current) {
                          cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                        }
                      }}
                      onMouseEnter={() => setHoveredPlanId(plan._id)}
                      onMouseLeave={() => setHoveredPlanId(null)}
                      animate={{
                        scale: isHighlighted ? 1.05 : 0.98,
                        y: isHighlighted ? -16 : 0,
                        opacity: isHighlighted ? 1 : 0.88,
                      }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      className={`w-full max-w-[370px] min-w-[310px] md:min-w-[350px] shrink-0 snap-center rounded-[36px] p-8 border flex flex-col justify-between relative bg-white/90 backdrop-blur-xl transition-shadow cursor-pointer ${
                        isHighlighted
                          ? "border-emerald-500 shadow-2xl shadow-emerald-500/10 ring-2 ring-emerald-500/10"
                          : isPopular 
                            ? "border-green-600/30 shadow-md hover:border-green-650"
                            : "border-slate-200/80 shadow-sm hover:border-slate-350"
                      }`}
                    >
                      {/* Active Indicator Glowing Border Effect */}
                      {isHighlighted && (
                        <div className="absolute inset-0 rounded-[36px] bg-gradient-to-tr from-emerald-500/10 via-transparent to-cyan-500/10 pointer-events-none" />
                      )}

                      {/* Pill Badge */}
                      {plan.badge && (
                        <div className="absolute -top-3.5 left-8">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-4 py-1.5 rounded-full shadow-md ${
                            isPopular 
                              ? "bg-emerald-600 text-white" 
                              : "bg-slate-900 text-white"
                          }`}>
                            {plan.badge}
                          </span>
                        </div>
                      )}

                      {/* Card Content Header */}
                      <div className="space-y-6">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-2">{plan.name}</h4>
                            <p className="text-[11.5px] text-slate-400 font-bold leading-normal">{plan.desc || plan.description || 'Flexible module bundle'}</p>
                          </div>
                          {/* Dynamic Theme Icon */}
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${
                            isHighlighted ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"
                          }`}>
                            {idx === 0 ? <Package size={20} /> : idx === 1 ? <Crown size={20} /> : <Zap size={20} />}
                          </div>
                        </div>

                        {/* Price Block */}
                        <div className="border-t border-slate-100/60 pt-5">
                          <div className="flex items-baseline">
                            <span className="text-4xl font-black text-slate-900 tracking-tight">
                              {plan.priceCustom || displayPrice === 0 ? "Custom" : `₹${displayPrice}`}
                            </span>
                            {!plan.priceCustom && displayPrice > 0 && (
                              <span className="text-xs text-slate-400 font-extrabold uppercase ml-1">/ month</span>
                            )}
                          </div>
                          {plan.trialDays > 0 && (
                            <span className="text-[10px] font-black text-emerald-600 block mt-1 uppercase tracking-wide">
                              ★ {plan.trialDays} Day Free Trial Included
                            </span>
                          )}
                        </div>

                        {/* Dynamic Scrollable Features List */}
                        <div className="border-t border-slate-100/60 pt-5">
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3">Included Modules & Limits</p>
                          <div 
                            className="max-h-[300px] overflow-y-auto space-y-4 scrollbar-none pr-1"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                          >
                            {/* Limits specs */}
                            {(plan.userLimit !== undefined || plan.branchLimit !== undefined) && (
                              <div className="space-y-2 border-b border-slate-100 pb-3">
                                {plan.userLimit !== undefined && (
                                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                                    <span>User Limit:</span>
                                    <span className="text-slate-900 font-black">{plan.userLimit === 0 || plan.userLimit === 9999 ? 'Unlimited' : plan.userLimit} Users</span>
                                  </div>
                                )}
                                {plan.branchLimit !== undefined && (
                                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                                    <span>Branch Limit:</span>
                                    <span className="text-slate-900 font-black">{plan.branchLimit === 0 || plan.branchLimit === 9999 ? 'Unlimited' : plan.branchLimit} Branch</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Features items */}
                            {(plan.features || []).map((feature, i) => (
                              <div key={i} className="flex items-start gap-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50/50 p-1.5 rounded-lg transition-colors">
                                <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                                <span className="leading-tight">{feature}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Card Button */}
                      <button 
                        type="button" 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/set-your-clinic');
                        }}
                        className={`w-full py-4 px-6 rounded-2xl text-[13.5px] font-black transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer mt-8 ${
                          isActive
                            ? "bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/10 hover:shadow-emerald-600/25 border border-transparent" 
                            : idx === 0 
                              ? "bg-transparent text-emerald-600 border border-emerald-500/50 hover:bg-emerald-50/30" 
                              : "bg-transparent text-indigo-600 border border-indigo-500/50 hover:bg-indigo-50/30"
                        }`}
                      >
                        <span>{plan.priceCustom || plan.priceMonthly === 0 ? "Contact Sales" : "Choose Plan"}</span>
                        <span className="text-base font-medium">→</span>
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="bg-white/90 border border-slate-200/70 p-8 lg:p-12 rounded-[36px] shadow-xl backdrop-blur-xl grid grid-cols-1 lg:grid-cols-[45%_55%] gap-12 items-center"
          >
            {/* Left content */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner shrink-0 mt-1">
                <Shield size={24} />
              </div>
              <div className="space-y-2">
                <h4 className="text-xl font-black text-slate-905 tracking-tight leading-tight">
                  Enterprise Grade. Secure. Scalable.
                </h4>
                <p className="text-slate-500/90 text-xs leading-relaxed font-medium">
                  Built with HIPAA-ready architecture, role-based access control, and end-to-end data encryption.
                </p>
              </div>
            </div>

            {/* Right stats cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { val: '99.9%', label: 'Uptime SLA', icon: <Shield size={14} className="text-emerald-600" /> },
                { val: '10K+', label: 'Clinics Trust Us', icon: <Users size={14} className="text-purple-600" /> },
                { val: 'Secure', label: 'Cloud Infra', icon: <Globe size={14} className="text-blue-600" /> },
                { val: '7 Day', label: 'Free Trial', icon: <Sparkles size={14} className="text-amber-500" /> }
              ].map((stat, i) => (
                <div 
                  key={i}
                  className="bg-slate-50/50 border border-slate-200/60 p-4 rounded-2xl flex flex-col items-center text-center justify-center gap-1 transition-all hover:bg-white shadow-sm hover:shadow-md cursor-default"
                >
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0">
                    {stat.icon}
                  </div>
                  <span className="text-sm font-black text-slate-800 mt-1 block leading-none">{stat.val}</span>
                  <span className="text-[9px] text-slate-400 font-bold leading-none mt-0.5">{stat.label}</span>
                </div>
              ))}
            </div>
          </motion.div>

        </div>
      </section>

      {/* ── FAQ SECTION ── */}
      <section className="py-36 px-6 lg:px-16 bg-gradient-to-b from-[#F8FAFC] via-[#F0FDF4]/20 to-[#ECFDF5]/30 relative overflow-hidden">
        {/* Ambient background graphics */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 right-[5%] w-[450px] h-[450px] bg-emerald-500/5 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 left-[5%] w-[450px] h-[450px] bg-cyan-500/5 rounded-full blur-[100px]" />
          
          {/* Medical molecule SVG pattern top-right */}
          <svg className="absolute top-10 right-10 w-[240px] h-[240px] text-emerald-500 opacity-[0.03]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M20 20 L40 40 M40 40 L60 20 M40 40 L40 70 M40 70 L20 90 M40 70 L60 90" />
            <circle cx="20" cy="20" r="3" fill="currentColor" />
            <circle cx="40" cy="40" r="3" fill="currentColor" />
            <circle cx="60" cy="20" r="3" fill="currentColor" />
            <circle cx="40" cy="70" r="3" fill="currentColor" />
            <circle cx="20" cy="90" r="3" fill="currentColor" />
            <circle cx="60" cy="90" r="3" fill="currentColor" />
          </svg>

          {/* Dot matrix top-left */}
          <div className="absolute top-12 left-12 w-[140px] h-[140px] opacity-[0.05]" style={{
            backgroundImage: 'radial-gradient(circle, #0ea5e9 1px, transparent 1px)',
            backgroundSize: '16px 16px'
          }} />
        </div>

        <div className="max-w-[1600px] mx-auto space-y-16 relative z-10">
          {/* Section Header */}
          <div className="text-center space-y-5 max-w-3xl mx-auto">
            {/* Badge */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4.5 py-1.5 rounded-full bg-emerald-50/80 border border-emerald-200/50 text-emerald-800 text-[11px] font-black uppercase tracking-wider shadow-sm backdrop-blur-md"
            >
              <HelpCircle size={12} className="text-emerald-600" />
              <span>Support & Help Center</span>
            </motion.div>

            {/* Main Heading */}
            <h3 className="text-4xl sm:text-[60px] font-black text-slate-900 tracking-tight leading-tight">
              Frequently Asked <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">Questions</span>
            </h3>

            {/* Subtitle */}
            <p className="text-slate-500/95 text-[20px] leading-[1.8] max-w-2xl mx-auto font-medium">
              Find answers to the most common questions about PEHAL Healthcare AI-CMS, security, pricing, and clinical workflows.
            </p>
          </div>

          {/* Interactive Filtering Area */}
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Search Bar */}
            <div className="relative">
              <input 
                type="text" 
                value={faqSearchQuery}
                onChange={(e) => setFaqSearchQuery(e.target.value)}
                placeholder="Search your question..."
                className="w-full h-16 pl-14 pr-6 rounded-2xl bg-white border border-slate-200/80 text-slate-700 placeholder-slate-400 font-semibold focus:outline-none focus:border-emerald-500/60 focus:ring-4 focus:ring-emerald-500/5 shadow-sm transition-all duration-300"
              />
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Category chips */}
            {(() => {
              // Extract unique categories dynamically from database/fetch state
              const categories = ['All', ...new Set(faqs.map(f => f.category || 'General'))];
              
              return (
                <div className="flex flex-wrap gap-2.5 justify-center py-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setFaqSelectedCategory(cat)}
                      className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-200 border cursor-pointer ${
                        faqSelectedCategory === cat
                          ? "bg-emerald-600 text-white border-transparent shadow-md"
                          : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Accordions List Area */}
          <div className="max-w-4xl mx-auto space-y-6">
            {(() => {
              const filtered = faqs.filter(f => {
                const matchesSearch = f.q.toLowerCase().includes(faqSearchQuery.toLowerCase()) || f.a.toLowerCase().includes(faqSearchQuery.toLowerCase());
                const matchesCategory = faqSelectedCategory === 'All' || (f.category || 'General') === faqSelectedCategory;
                return matchesSearch && matchesCategory;
              });

              if (filtered.length === 0) {
                return (
                  <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/60 p-8 shadow-sm">
                    <span className="text-slate-400 block text-3xl mb-3">🔍</span>
                    <h4 className="text-base font-black text-slate-800">No Questions Found</h4>
                    <p className="text-xs text-slate-400 mt-1 font-bold">Try adjusting your search criteria or choosing a different filter category.</p>
                  </div>
                );
              }

              const getCategoryIcon = (cat) => {
                switch(cat?.toLowerCase()) {
                  case 'security': return <Shield size={18} className="text-emerald-600" />;
                  case 'branches': return <Building2 size={18} className="text-emerald-600" />;
                  case 'ai': return <Sparkles size={18} className="text-emerald-600" />;
                  case 'cloud': return <Globe size={18} className="text-emerald-600" />;
                  case 'support': return <PhoneCall size={18} className="text-emerald-600" />;
                  default: return <Stethoscope size={18} className="text-emerald-600" />;
                }
              };

              return (
                <div className="space-y-5">
                  {filtered.map((faq, idx) => {
                    const isExpanded = activeFaq === faq._id;
                    
                    return (
                      <motion.div
                        key={faq._id}
                        layout
                        className={`bg-white border rounded-[24px] shadow-sm overflow-hidden transition-all duration-300 ${
                          isExpanded 
                            ? "border-emerald-500 ring-4 ring-emerald-500/5 shadow-md" 
                            : "border-slate-200/80 hover:border-slate-350 hover:shadow-md"
                        }`}
                      >
                        {/* Question clickable header */}
                        <button
                          type="button"
                          onClick={() => setActiveFaq(isExpanded ? null : faq._id)}
                          className="w-full flex items-center justify-between text-left p-6 md:p-8 cursor-pointer select-none gap-6"
                        >
                          <div className="flex items-center gap-4.5">
                            {/* Category Icon Container */}
                            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center shrink-0 shadow-inner">
                              {getCategoryIcon(faq.category)}
                            </div>
                            <span className="text-lg md:text-[20px] font-black text-slate-900 tracking-tight leading-tight">{faq.q}</span>
                          </div>

                          {/* Plus/Minus indicator */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 shrink-0 ${
                            isExpanded ? 'bg-emerald-600 text-white rotate-180 scale-105' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                          }`}>
                            <span className="text-lg font-black leading-none">{isExpanded ? '−' : '+'}</span>
                          </div>
                        </button>

                        {/* Answer panel (Framer Motion auto-height) */}
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              className="border-t border-slate-100 bg-[#F0FDF4]/20"
                            >
                              <div className="p-6 md:p-8 pt-0 space-y-4 md:flex items-start justify-between gap-8">
                                <div className="space-y-4 flex-1">
                                  <p className="text-[15.5px] leading-[1.8] text-slate-500 font-semibold max-w-[680px] pt-6">{faq.a}</p>
                                </div>
                                
                                {/* Right illustration decoration based on illustration metadata */}
                                {faq.illustration === 'security_shield' && (
                                  <div className="hidden md:block shrink-0 mt-6 bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm">
                                    <svg className="w-24 h-24 text-emerald-500" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5">
                                      <path d="M50,15 L80,25 L80,55 C80,75 50,90 50,90 C50,90 20,75 20,55 L20,25 Z" />
                                      <path d="M35,50 L45,60 L65,40" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Still Need Help Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto bg-white/90 border border-slate-200/70 p-8 rounded-[32px] shadow-lg backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-8"
          >
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner shrink-0">
                <PhoneCall size={24} />
              </div>
              <div className="space-y-1">
                <h4 className="text-xl font-black text-slate-900 tracking-tight leading-none">Still have questions?</h4>
                <p className="text-slate-400 text-xs font-bold">Our healthcare experts are ready to help you understand how PEHAL AI-CMS can transform your clinic.</p>
              </div>
            </div>
            
            <button 
              type="button" 
              onClick={() => navigate('/contact')}
              className="px-6 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[13.5px] transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-700/10 hover:shadow-emerald-700/20 hover:-translate-y-0.5 shrink-0"
            >
              <span>Contact Support</span>
              <span className="text-base leading-none">→</span>
            </button>
          </motion.div>

        </div>

        {/* Faint flowing waves across the bottom */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none overflow-hidden" style={{ height: '80px' }}>
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="w-full h-full" fill="none">
            <path d="M0,50 C320,90 640,10 960,50 C1280,90 1380,30 1440,40 L1440,80 L0,80 Z" fill="#1E293B" opacity="0.04" />
          </svg>
        </div>
      </section>

      {/* ── SECURITY, FINAL CTA, & FOOTER OVERHAUL (DARK ENTERPRISE GRID) ── */}
      <div className="bg-[#07111F] text-white relative overflow-hidden">
        {/* Futuristic Grid & Particle Overlays */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
          <div className="absolute top-[200px] left-[10%] w-[600px] h-[600px] bg-emerald-500/[0.03] rounded-full blur-[150px]" />
          <div className="absolute top-[600px] right-[10%] w-[600px] h-[600px] bg-cyan-500/[0.03] rounded-full blur-[150px]" />
          
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 opacity-[0.02]" style={{
            backgroundImage: 'radial-gradient(#22c55e 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }} />
        </div>

        {/* ========================================
            SECTION 1: ENTERPRISE SECURITY
            ======================================== */}
        <section id="security" className="py-36 px-6 lg:px-16 relative z-10 max-w-[1600px] mx-auto">
          <div className="text-center space-y-5 max-w-3xl mx-auto mb-20">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 text-[11px] font-black uppercase tracking-widest shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Compliance & Security</span>
            </div>

            {/* Heading */}
            <h3 className="text-4xl sm:text-[60px] font-black tracking-tight leading-tight">
              Enterprise-Grade <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Security</span>
            </h3>

            {/* Description */}
            <p className="text-slate-400 text-[18px] leading-[1.8] max-w-2xl mx-auto font-medium">
              We maintain strict regulatory standards and medical safeguards to protect patient health records and credentials at scale.
            </p>
          </div>

          {/* Premium Floating Security Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {[
              {
                id: 'sec0',
                title: 'HIPAA Ready',
                desc: 'Strict end-to-end access authorization and healthcare safety logs.',
                badge: 'Verified HIPAA',
                icon: (
                  <svg className="w-12 h-12 text-emerald-400" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M50,15 L80,25 L80,55 C80,75 50,90 50,90 C50,90 20,75 20,55 L20,25 Z" />
                    <path d="M35,50 L45,60 L65,40" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )
              },
              {
                id: 'sec1',
                title: 'ISO 27001 Certified',
                desc: 'Adherence to internationally recognized information security compliance controls.',
                badge: 'Certified',
                icon: (
                  <svg className="w-12 h-12 text-teal-400" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M50 15 L85 30 L85 70 L50 90 L15 70 L15 30 Z" />
                    <circle cx="50" cy="50" r="10" />
                    <path d="M50 30 L50 70 M30 50 L70 50" strokeDasharray="3,3" />
                  </svg>
                )
              },
              {
                id: 'sec2',
                title: 'End-to-End Encryption',
                desc: 'All medical records are secured using AES-256 bit encrypted databases.',
                badge: 'AES-256 Enabled',
                icon: (
                  <svg className="w-12 h-12 text-cyan-400" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M30 40 V25 A20 20 0 0 1 70 25 V40 M20 40 H80 V90 H20 Z" />
                    <circle cx="50" cy="65" r="5" fill="currentColor" />
                    <path d="M50 70 L50 80" />
                  </svg>
                )
              },
              {
                id: 'sec3',
                title: 'Privacy Protected',
                desc: 'Granular role permissions and full action logs tracked automatically.',
                badge: 'Audit Verified',
                icon: (
                  <svg className="w-12 h-12 text-emerald-400" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="50" cy="50" r="30" />
                    <path d="M50 35 V50 L60 55" />
                    <path d="M50 10 V15 M50 85 V90 M10 50 H15 M85 50 H90" />
                  </svg>
                )
              }
            ].map((sec) => {
              const isHighlighted = activeSecId === sec.id;
              
              return (
                <motion.div
                  key={sec.id}
                  onMouseEnter={() => setActiveSecId(sec.id)}
                  whileHover={{ y: -10, scale: 1.02 }}
                  className={`relative p-8 rounded-[32px] border transition-all duration-500 backdrop-blur-xl cursor-pointer ${
                    isHighlighted 
                      ? "bg-slate-900/90 border-emerald-500 shadow-2xl shadow-emerald-500/10 ring-2 ring-emerald-500/10" 
                      : "bg-slate-900/40 border-slate-800/80 hover:border-slate-700/80"
                  }`}
                >
                  {/* Glowing background highlights for active card */}
                  {isHighlighted && (
                    <div className="absolute inset-0 rounded-[32px] bg-gradient-to-tr from-emerald-500/5 via-transparent to-cyan-500/5 pointer-events-none" />
                  )}

                  {/* Top Badge */}
                  <div className="flex justify-between items-center mb-6">
                    <span className={`text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-full ${
                      isHighlighted ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800/80 text-slate-400"
                    }`}>
                      {sec.badge}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>

                  {/* Custom SVG Icon Container */}
                  <div className="mb-6 inline-block bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-inner relative">
                    {sec.icon}
                    {isHighlighted && (
                      <span className="absolute -inset-1 rounded-2xl bg-emerald-500/10 animate-ping pointer-events-none" />
                    )}
                  </div>

                  {/* Content details */}
                  <h4 className="text-xl font-black text-white mb-2.5 tracking-tight leading-tight">{sec.title}</h4>
                  <p className="text-xs text-slate-400 font-bold leading-relaxed">{sec.desc}</p>
                </motion.div>
              );
            })}
          </div>

          {/* ========================================
              SECURITY STATS SECTION
              ======================================== */}
          <div className="mt-24 max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { val: '99.99%', desc: 'System Uptime' },
              { val: 'AES-256', desc: 'Encryption Standard' },
              { val: 'HIPAA', desc: 'Ready / Safeguard' },
              { val: 'ISO 27001', desc: 'Security Certified' }
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -4 }}
                className="bg-slate-900/60 border border-slate-850 p-6 rounded-[24px] text-center shadow-md backdrop-blur-md relative"
              >
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
                <span className="text-2xl sm:text-3xl font-black text-white block tracking-tight leading-none mb-1">{stat.val}</span>
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">{stat.desc}</span>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ========================================
            SECTION DIVIDER: GLOWING MEDICAL WAVEFORM
            ======================================== */}
        <div className="relative py-12 overflow-hidden w-full">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <svg className="w-full h-24 text-emerald-500" viewBox="0 0 1440 100" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path 
                d="M0,50 L400,50 L420,20 L440,80 L460,10 L480,90 L500,40 L520,60 L540,50 L1440,50" 
                strokeDasharray="6,6"
                className="animate-[dash_20s_linear_infinite]"
              />
            </svg>
          </div>
        </div>

        {/* ========================================
            SECTION 2: FINAL CTA
            ======================================== */}
        <section className="py-24 px-6 lg:px-16 relative z-10 max-w-[1600px] mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-5xl mx-auto rounded-[40px] bg-slate-900/60 border border-slate-800/80 p-10 lg:p-20 relative overflow-hidden shadow-2xl backdrop-blur-xl text-center"
          >
            {/* Glowing background element */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

            {/* Heartbeat SVG illustration overlay */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-5">
              <svg className="absolute bottom-4 left-4 w-40 h-40 text-emerald-500" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10,50 L40,50 L45,30 L50,70 L55,45 L60,55 L65,50 L90,50" />
              </svg>
              <svg className="absolute top-4 right-4 w-40 h-40 text-cyan-500" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="50" cy="50" r="30" />
                <path d="M50 20 V80 M20 50 H80" />
              </svg>
            </div>

            <div className="relative z-10 space-y-8">
              {/* Heading */}
              <h3 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight max-w-3xl mx-auto">
                Ready to <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Transform</span> Your Clinic?
              </h3>

              {/* Subheading */}
              <p className="text-slate-450 text-base max-w-xl mx-auto font-semibold leading-relaxed">
                Join hundreds of clinic owners and medical professionals automating electronic charts, booking operations, pharmacy inventory, and laboratory workflows with zero friction.
              </p>

              {/* Call-to-actions */}
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
                <Link 
                  to="/set-your-clinic"
                  className="w-full sm:w-auto px-10 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl transition-all duration-300 shadow-lg shadow-emerald-700/20 hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Start Free Trial</span>
                  <span className="text-base">→</span>
                </Link>

                <Link 
                  to="/contact"
                  className="w-full sm:w-auto px-10 py-4 bg-transparent border border-slate-700 hover:border-slate-500 text-white font-black rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-800/40"
                >
                  <span>Book Live Demo</span>
                </Link>
              </div>

              {/* Feature checkpoints under buttons */}
              <div className="flex flex-wrap justify-center items-center gap-6 pt-4 text-xs font-black text-slate-500">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  No credit card required
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  14-day free trial
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  Setup in minutes
                </span>
              </div>
            </div>
          </motion.div>

          {/* ========================================
              SOCIAL PROOF SECTION (ENTERPRISE TRUST STRIP)
              ======================================== */}
          <div className="mt-28 space-y-10 relative">
            {/* Inline CSS styling for pure CSS hardware-accelerated marquee */}
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes marquee-loop {
                0% { transform: translate3d(0, 0, 0); }
                100% { transform: translate3d(-50%, 0, 0); }
              }
              .marquee-track {
                display: flex;
                width: max-content;
                animation: marquee-loop 35s linear infinite;
                will-change: transform;
              }
              .marquee-container:hover .marquee-track {
                animation-play-state: paused;
              }
            `}} />

            {/* Header Title with Green Accent Line */}
            <div className="text-center space-y-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 select-none">
                Trusted by Leading Clinics, Hospitals &amp; Healthcare Organizations
              </p>
              <div className="w-12 h-0.5 bg-emerald-500 mx-auto rounded-full opacity-60" />
            </div>

            {/* Premium Glass Container for Logos */}
            <div className="max-w-6xl mx-auto rounded-[32px] bg-slate-900/30 border border-slate-850 p-8 shadow-inner backdrop-blur-xl relative overflow-hidden marquee-container">
              {/* Subtle background nodes overlay */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-5">
                <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="0.5">
                  <circle cx="20" cy="50" r="10" />
                  <circle cx="80" cy="50" r="10" />
                  <path d="M20 50 H80" strokeDasharray="2,2" />
                </svg>
              </div>

              {/* Loop Track wrapper */}
              <div className="overflow-hidden relative w-full flex">
                <div className="marquee-track gap-16 items-center">
                  {/* First instances of 10 hospital SVGs */}
                  {[
                    { name: 'Apollo Hospitals', icon: <path d="M12 2 L22 6 V15 C22 20 12 25 12 25 C12 25 2 20 2 15 V6 Z" fill="none" stroke="currentColor" strokeWidth="2" /> },
                    { name: 'Max Healthcare', icon: <path d="M12 2 L22 12 L12 22 L2 12 Z" stroke="currentColor" strokeWidth="2" /> },
                    { name: 'Fortis Healthcare', icon: <path d="M12 2 V22 M2 12 H22" stroke="currentColor" strokeWidth="2" /> },
                    { name: 'Narayana Health', icon: <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" /> },
                    { name: 'Manipal Hospitals', icon: <path d="M6 12 A6 6 0 1 1 18 12 A6 6 0 1 1 6 12" stroke="currentColor" strokeWidth="2" /> },
                    { name: 'Cloudnine Hospitals', icon: <path d="M4 12 C4 8 12 4 12 4 C12 4 20 8 20 12 C20 16 12 20 12 20 C12 20 4 16 4 12 Z" stroke="currentColor" strokeWidth="2" /> },
                    { name: 'Aster DM', icon: <path d="M12 2 L12 22 M2 12 H22 M5 5 L19 19 M5 19 L19 5" stroke="currentColor" strokeWidth="2" /> },
                    { name: 'Medanta', icon: <path d="M4 12 H20 M12 4 V20" stroke="currentColor" strokeWidth="2" /> },
                    { name: 'Yashoda Hospitals', icon: <path d="M2 12 C12 2 12 22 22 12" stroke="currentColor" strokeWidth="2" /> },
                    { name: 'CARE Hospitals', icon: <path d="M12 21 C12 21 2 14 2 8 C2 4.5 5 2.5 8 2.5 C10.5 2.5 12 4.5 12 4.5 C12 4.5 13.5 2.5 16 2.5 C19 2.5 22 4.5 22 8 C22 14 12 21 12 21 Z" stroke="currentColor" strokeWidth="2" /> }
                  ].map((h, i) => (
                    <div 
                      key={`h1-${i}`}
                      className="flex items-center gap-2.5 text-slate-400 hover:text-white transition-all duration-300 transform hover:-translate-y-1.5 hover:scale-105 cursor-pointer opacity-70 hover:opacity-100 select-none group shrink-0"
                    >
                      <svg className="w-6 h-6 text-slate-400 group-hover:text-emerald-400 transition-colors" viewBox="0 0 24 24" fill="none">
                        {h.icon}
                      </svg>
                      <span className="text-[11px] font-black uppercase tracking-wider">{h.name}</span>
                    </div>
                  ))}

                  {/* Duplicate list for seamless infinite loop */}
                  {[
                    { name: 'Apollo Hospitals', icon: <path d="M12 2 L22 6 V15 C22 20 12 25 12 25 C12 25 2 20 2 15 V6 Z" fill="none" stroke="currentColor" strokeWidth="2" /> },
                    { name: 'Max Healthcare', icon: <path d="M12 2 L22 12 L12 22 L2 12 Z" stroke="currentColor" strokeWidth="2" /> },
                    { name: 'Fortis Healthcare', icon: <path d="M12 2 V22 M2 12 H22" stroke="currentColor" strokeWidth="2" /> },
                    { name: 'Narayana Health', icon: <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" /> },
                    { name: 'Manipal Hospitals', icon: <path d="M6 12 A6 6 0 1 1 18 12 A6 6 0 1 1 6 12" stroke="currentColor" strokeWidth="2" /> },
                    { name: 'Cloudnine Hospitals', icon: <path d="M4 12 C4 8 12 4 12 4 C12 4 20 8 20 12 C20 16 12 20 12 20 C12 20 4 16 4 12 Z" stroke="currentColor" strokeWidth="2" /> },
                    { name: 'Aster DM', icon: <path d="M12 2 L12 22 M2 12 H22 M5 5 L19 19 M5 19 L19 5" stroke="currentColor" strokeWidth="2" /> },
                    { name: 'Medanta', icon: <path d="M4 12 H20 M12 4 V20" stroke="currentColor" strokeWidth="2" /> },
                    { name: 'Yashoda Hospitals', icon: <path d="M2 12 C12 2 12 22 22 12" stroke="currentColor" strokeWidth="2" /> },
                    { name: 'CARE Hospitals', icon: <path d="M12 21 C12 21 2 14 2 8 C2 4.5 5 2.5 8 2.5 C10.5 2.5 12 4.5 12 4.5 C12 4.5 13.5 2.5 16 2.5 C19 2.5 22 4.5 22 8 C22 14 12 21 12 21 Z" stroke="currentColor" strokeWidth="2" /> }
                  ].map((h, i) => (
                    <div 
                      key={`h2-${i}`}
                      className="flex items-center gap-2.5 text-slate-400 hover:text-white transition-all duration-300 transform hover:-translate-y-1.5 hover:scale-105 cursor-pointer opacity-70 hover:opacity-100 select-none group shrink-0"
                    >
                      <svg className="w-6 h-6 text-slate-400 group-hover:text-emerald-400 transition-colors" viewBox="0 0 24 24" fill="none">
                        {h.icon}
                      </svg>
                      <span className="text-[11px] font-black uppercase tracking-wider">{h.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Optional Trust Badges (HIPAA, ISO, GDPR, AES-256) */}
            <div className="flex flex-wrap justify-center items-center gap-4 text-[10px] font-black text-slate-450 pt-2 uppercase tracking-wider select-none">
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/40 border border-slate-850 rounded-full hover:border-emerald-500/35 transition-all">
                <CheckCircle size={10} className="text-emerald-500" />
                HIPAA Ready
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/40 border border-slate-850 rounded-full hover:border-emerald-500/35 transition-all">
                <CheckCircle size={10} className="text-emerald-500" />
                ISO 27001 Certified
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/40 border border-slate-850 rounded-full hover:border-emerald-500/35 transition-all">
                <CheckCircle size={10} className="text-emerald-500" />
                GDPR Ready
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/40 border border-slate-850 rounded-full hover:border-emerald-500/35 transition-all">
                <CheckCircle size={10} className="text-emerald-500" />
                AES-256 Encryption
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/40 border border-slate-850 rounded-full hover:border-emerald-500/35 transition-all">
                <CheckCircle size={10} className="text-emerald-500" />
                99.99% Uptime
              </span>
            </div>
          </div>
        </section>

        {/* ========================================
            SECTION 3: ENTERPRISE FOOTER
            ======================================== */}
        <footer className="border-t border-slate-850 py-24 px-6 lg:px-16 relative z-10 max-w-[1400px] mx-auto text-slate-400">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            {/* Col 1 */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-white">
                <PehalLogo variant="dark" height={42} />
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-bold">
                AI-CMS – Intelligent Healthcare Management System. A complete, unified, AI-powered platform to manage your clinic operations, staff scheduling, electronic records, and billing with zero friction.
              </p>
              
              {/* Circular Social Icons */}
              <div className="flex items-center gap-3 pt-2">
                {[
                  { icon: <Linkedin size={15} />, link: '#' },
                  { icon: <Twitter size={15} />, link: '#' },
                  { icon: <Facebook size={15} />, link: '#' },
                  { icon: <Instagram size={15} />, link: '#' },
                  { icon: <Github size={15} />, link: '#' }
                ].map((social, i) => (
                  <a 
                    key={i} 
                    href={social.link} 
                    className="w-9 h-9 rounded-full bg-slate-900 border border-slate-850 hover:border-emerald-500/50 hover:text-white flex items-center justify-center transition-all duration-300 hover:scale-105 shadow-sm"
                  >
                    {social.icon}
                  </a>
                ))}
              </div>
            </div>

            {/* Col 2 */}
            <div className="space-y-4">
              <h5 className="text-xs font-bold text-white uppercase tracking-wider">Solutions</h5>
              <ul className="space-y-3 text-xs font-bold text-slate-500">
                <li><Link to="/login?type=clinic" className="hover:text-white transition relative group">For Clinics<span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-emerald-500 transition-all duration-300 group-hover:w-full" /></Link></li>
                <li><Link to="/login?type=staff" className="hover:text-white transition relative group">For Doctors &amp; Staff<span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-emerald-500 transition-all duration-300 group-hover:w-full" /></Link></li>
                <li><Link to="/login?type=patient" className="hover:text-white transition relative group">For Patients<span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-emerald-500 transition-all duration-300 group-hover:w-full" /></Link></li>
              </ul>
            </div>

            {/* Col 3 */}
            <div className="space-y-4">
              <h5 className="text-xs font-bold text-white uppercase tracking-wider">Compliance</h5>
              <ul className="space-y-3 text-xs font-bold text-slate-500">
                <li><a href="#" className="hover:text-white transition relative group">HIPAA Safeguards<span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-emerald-500 transition-all duration-300 group-hover:w-full" /></a></li>
                <li><a href="#" className="hover:text-white transition relative group">ISO 27001<span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-emerald-500 transition-all duration-300 group-hover:w-full" /></a></li>
                <li><a href="#" className="hover:text-white transition relative group">Encryption Policies<span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-emerald-500 transition-all duration-300 group-hover:w-full" /></a></li>
              </ul>
            </div>

            {/* Col 4 */}
            <div className="space-y-4">
              <h5 className="text-xs font-bold text-white uppercase tracking-wider">Contact &amp; Support</h5>
              <p className="text-[11.5px] text-slate-500 leading-relaxed font-bold">Pehal Healthcare Technologies Private Limited.</p>
              <p className="text-[11.5px] text-slate-500 font-bold hover:text-white transition cursor-pointer">support@pehalhealth.com</p>
            </div>
          </div>

          {/* Bottom copyright details row */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6 text-[11px] text-slate-500 border-t border-slate-850 pt-10 font-bold">
            <div className="flex items-center gap-2">
              <span>&copy; 2026 PEHAL Healthcare. All rights reserved.</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
            </div>
            
            <div className="flex items-center gap-8">
              <a href="#" className="hover:text-white transition">Privacy Policy</a>
              <a href="#" className="hover:text-white transition">Terms of Service</a>
              <span className="flex items-center gap-1 select-none text-slate-655 font-black uppercase text-[10px]">
                Powered by AI
                <span className="w-2.5 h-2.5 text-emerald-500 shrink-0 animate-pulse">❤</span>
              </span>
            </div>
          </div>
        </footer>
      </div>

    </div>
  );
}
