import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PhoneCall, Shield, HelpCircle, Building2, User, 
  ArrowRight, CheckCircle2, AlertTriangle, ArrowLeft, Mail, MapPin, 
  Clock, ShieldAlert, Globe, MessageSquare, Plus, Check, Stethoscope, Sparkles
} from 'lucide-react';
import PehalLogo from '../components/common/PehalLogo';
import axios from 'axios';

export default function ContactPage() {
  const navigate = useNavigate();
  
  // Form states
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    clinicName: '',
    role: '',
    department: 'General Inquiry',
    priority: 'Normal',
    subject: '',
    message: '',
    agree: false
  });

  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [successInfo, setSuccessInfo] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Validate form fields
  const validate = () => {
    const newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!formData.phone) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[0-9]{10}$/.test(formData.phone.replace(/[^0-9]/g, ''))) {
      newErrors.phone = 'Must be a 10 digit number';
    }

    if (!formData.clinicName.trim()) newErrors.clinicName = 'Clinic / Hospital is required';
    if (!formData.role) newErrors.role = 'Please select your role';
    if (!formData.subject.trim()) newErrors.subject = 'Subject is required';
    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.length < 15) {
      newErrors.message = 'Message must be at least 15 characters';
    }

    if (!formData.agree) newErrors.agree = 'You must agree to the privacy policy';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setStatus('loading');
    setErrorMessage('');

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/support`, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        clinicName: formData.clinicName,
        role: formData.role,
        department: formData.department,
        priority: formData.priority,
        subject: formData.subject,
        message: formData.message
      });

      if (response.data?.success) {
        setStatus('success');
        setSuccessInfo({
          ticketId: response.data.ticketId,
          estimatedResponse: formData.priority === 'Critical' ? 'Within 15 Minutes' : 'Within 1 Hour',
          assignedTo: 'Priority Tier ' + (formData.priority === 'Critical' ? '1' : '2')
        });

        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          clinicName: '',
          role: '',
          department: 'General Inquiry',
          priority: 'Normal',
          subject: '',
          message: '',
          agree: false
        });

        setTimeout(() => {
          setStatus('idle');
          setSuccessInfo(null);
        }, 8000);
      } else {
        throw new Error(response.data?.message || 'Submission failed');
      }
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMessage(err.response?.data?.message || err.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#08111D] text-white font-sans antialiased overflow-x-hidden relative flex flex-col justify-between">
      
      {/* 🔮 Cosmic Healthcare Background Overlays */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[5%] left-[5%] w-[600px] h-[600px] bg-emerald-500/[0.04] rounded-full blur-[140px] animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute bottom-[15%] right-[5%] w-[600px] h-[600px] bg-cyan-500/[0.03] rounded-full blur-[140px] animate-[pulse_10s_ease-in-out_infinite]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(#10b981 1.5px, transparent 1.5px)',
          backgroundSize: '36px 36px'
        }} />
      </div>

      {/* 🧭 Glass Navigation Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-8 flex items-center justify-between relative z-20">
        <Link to="/" className="flex items-center gap-2 hover:scale-[1.02] transition-transform">
          <PehalLogo variant="dark" height={38} />
        </Link>
        <button 
          onClick={() => navigate('/')} 
          className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400 hover:text-white transition-colors cursor-pointer bg-slate-900/60 border border-slate-800/80 px-4 py-2.5 rounded-xl backdrop-blur-md hover:bg-slate-800/40"
        >
          <ArrowLeft size={14} /> Back to Home
        </button>
      </header>

      {/* 🏢 Primary Contact Container */}
      <main className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-[46%_54%] gap-16 relative z-10 w-full flex-grow items-center">
        
        {/* ==========================================
            LEFT COLUMN: TRUST METRICS & SVG PANEL
            ========================================== */}
        <div className="space-y-12">
          {/* Badge & Heading */}
          <div className="space-y-5">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 text-[10px] font-black uppercase tracking-widest shadow-sm">
              <HelpCircle size={12} className="text-emerald-400 animate-bounce" />
              <span>Contact Support</span>
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-black tracking-tight leading-none text-white">
              Need Help? <br />We're <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Here 24/7.</span>
            </h1>
            <p className="text-slate-400 text-[15px] leading-relaxed max-w-md font-medium">
              Whether you're setting up your clinic, migrating data, onboarding doctors, configuring branches, or upgrading plans, our healthcare specialists are ready to assist you.
            </p>
          </div>

          {/* 6 Premium Glass Support Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
            {[
              {
                title: 'Live Support',
                val: 'Average response under 5m',
                badge: 'Online',
                icon: (
                  <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                )
              },
              {
                title: 'Email Support',
                val: 'support@pehalhealth.com',
                badge: '24/7 Support',
                icon: (
                  <svg className="w-5 h-5 text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                )
              },
              {
                title: 'Sales Team',
                val: 'sales@pehalhealth.com',
                badge: 'Custom Quote',
                icon: (
                  <svg className="w-5 h-5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                )
              },
              {
                title: 'Emergency Support',
                val: 'Priority Enterprise Hotline',
                badge: 'Tier-1 Help',
                icon: (
                  <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                )
              },
              {
                title: 'Phone Support',
                val: '+91 98765 43210',
                badge: 'Call Us',
                icon: (
                  <svg className="w-5 h-5 text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                )
              },
              {
                title: 'Office Location',
                val: 'Lucknow, Uttar Pradesh, IN',
                badge: 'HQ Office',
                icon: (
                  <svg className="w-5 h-5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )
              }
            ].map((card, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -6, scale: 1.02 }}
                className="p-5 rounded-2xl bg-slate-900/40 border border-slate-850/80 backdrop-blur-md hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 relative group cursor-default"
              >
                <div className="absolute top-3 right-3">
                  <span className="text-[8px] font-black tracking-widest text-slate-500 uppercase px-2 py-0.5 rounded bg-slate-950/80 border border-slate-850">
                    {card.badge}
                  </span>
                </div>
                <div className="w-9 h-9 rounded-xl bg-slate-950 flex items-center justify-center mb-3.5 border border-slate-850 shadow-inner group-hover:border-emerald-500/30 group-hover:text-emerald-400 transition-colors">
                  {card.icon}
                </div>
                <div className="text-[13px] font-black text-white">{card.title}</div>
                <div className="text-[11px] text-slate-500 font-bold mt-1 group-hover:text-slate-400 transition-colors">{card.val}</div>
              </motion.div>
            ))}
          </div>

          {/* Compliance Glass Pills */}
          <div className="flex flex-wrap items-center gap-3 pt-2 text-[9px] font-black text-slate-450 uppercase tracking-widest">
            <span className="px-3.5 py-2 bg-slate-900/55 border border-slate-850 rounded-full hover:border-emerald-500/40 hover:shadow-md transition-all cursor-default">✓ HIPAA Ready</span>
            <span className="px-3.5 py-2 bg-slate-900/55 border border-slate-850 rounded-full hover:border-emerald-500/40 hover:shadow-md transition-all cursor-default">✓ ISO 27001</span>
            <span className="px-3.5 py-2 bg-slate-900/55 border border-slate-850 rounded-full hover:border-emerald-500/40 hover:shadow-md transition-all cursor-default">✓ GDPR Ready</span>
            <span className="px-3.5 py-2 bg-slate-900/55 border border-slate-850 rounded-full hover:border-emerald-500/40 hover:shadow-md transition-all cursor-default">✓ AES-256 Encryption</span>
          </div>

          {/* ==========================================
              🏆 100% CUSTOM SVG ILLUSTRATION COMPOSITION
              ========================================== */}
          <div className="relative w-full max-w-lg bg-slate-900/20 rounded-[32px] border border-slate-850/50 p-6 overflow-hidden shadow-2xl backdrop-blur-sm">
            {/* Ambient glows behind vectors */}
            <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-36 h-36 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

            <svg viewBox="0 0 500 320" className="w-full h-auto relative z-10" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Background Network Nodes & Grid */}
              <g className="opacity-25">
                <circle cx="100" cy="80" r="1.5" fill="#10B981" />
                <circle cx="160" cy="50" r="1.5" fill="#10B981" />
                <circle cx="220" cy="90" r="1.5" fill="#10B981" />
                <line x1="100" y1="80" x2="160" y2="50" stroke="#10B981" strokeWidth="0.5" strokeDasharray="2,2" />
                <line x1="160" y1="50" x2="220" y2="90" stroke="#10B981" strokeWidth="0.5" strokeDasharray="2,2" />
              </g>

              {/* Heartbeat Line (Left Background) */}
              <path d="M20 250 L80 250 L88 230 L96 280 L104 210 L112 290 L120 260 L128 250 L180 250" stroke="#10B981" strokeWidth="1.5" className="opacity-30" />

              {/* Medical Cross (Floating background element) */}
              <g className="opacity-15" transform="translate(420, 40)">
                <rect x="10" y="0" width="8" height="28" fill="#10B981" rx="1.5" />
                <rect x="0" y="10" width="28" height="8" fill="#10B981" rx="1.5" />
              </g>

              {/* Secure Cloud Shield (Center) */}
              <g transform="translate(230, 20)" className="opacity-80">
                <path d="M20,10 L35,15 L35,30 C35,42 20,50 20,50 C20,50 5,42 5,30 L5,15 Z" stroke="#10B981" strokeWidth="1.5" fill="#08111D" />
                <path d="M16 28 L19 31 L25 23" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </g>

              {/* Hospital Building Vector (Right) */}
              <g transform="translate(340, 190)">
                {/* Main structure */}
                <rect x="10" y="30" width="80" height="60" rx="6" fill="#0B1C30" stroke="#1E293B" strokeWidth="1.5" />
                <rect x="35" y="10" width="30" height="20" rx="4" fill="#0B1C30" stroke="#1E293B" strokeWidth="1.5" />
                {/* Windows */}
                <rect x="20" y="42" width="10" height="10" rx="2" fill="#0F2D4A" />
                <rect x="68" y="42" width="10" height="10" rx="2" fill="#0F2D4A" />
                {/* Doors */}
                <rect x="42" y="65" width="16" height="25" rx="2" fill="#10B981" className="opacity-30" />
                {/* Medical Cross on Roof */}
                <path d="M50 16 V24 M46 20 H54" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
              </g>

              {/* AI Robot Assistant (Right-Center) */}
              <g transform="translate(260, 100)">
                {/* Floating Head */}
                <rect x="15" y="10" width="50" height="40" rx="16" fill="#0B1C30" stroke="#10B981" strokeWidth="2" />
                {/* Eye visor screen */}
                <rect x="22" y="20" width="36" height="15" rx="8" fill="#040D17" />
                {/* Glowing LED eyes */}
                <circle cx="32" cy="27" r="3.5" fill="#10B981" />
                <circle cx="48" cy="27" r="3.5" fill="#10B981" />
                {/* Body base structure */}
                <path d="M20 54 C20 54 10 70 15 90 H65 C70 70 60 54 60 54 Z" fill="#0B1C30" stroke="#1E293B" strokeWidth="1.5" />
                {/* AI chest plate */}
                <circle cx="40" cy="72" r="9" fill="#0F2D4A" stroke="#10B981" strokeWidth="1.5" />
                <text x="36" y="75" fill="#10B981" fontSize="8" fontWeight="bold" fontFamily="sans-serif">AI</text>
              </g>

              {/* Doctor Avatar Card (Far Right) */}
              <g transform="translate(390, 110)">
                <rect x="0" y="0" width="85" height="70" rx="14" fill="#0B1C30" stroke="#1E293B" strokeWidth="1.5" />
                {/* Head */}
                <circle cx="42" cy="22" r="10" fill="#1E293B" stroke="#10B981" strokeWidth="1.5" />
                {/* Hospital Badge Badge */}
                <rect x="15" y="42" width="55" height="6" rx="3" fill="#10B981" className="opacity-20" />
                <rect x="25" y="52" width="35" height="5" rx="2.5" fill="#0F2D4A" />
                <circle cx="42" cy="22" r="3" fill="#10B981" />
              </g>

              {/* Professional Healthcare Support Executive (Left Foreground) */}
              <g transform="translate(40, 130)">
                {/* Desk/Laptop base */}
                <path d="M0 160 L240 160" stroke="#1E293B" strokeWidth="2" />
                {/* Hair/Head back */}
                <path d="M80 50 C55 50 55 120 80 120 C105 120 105 50 80 50 Z" fill="#040D17" />
                {/* Face skin */}
                <circle cx="85" cy="75" r="22" fill="#F9DEC9" />
                {/* Professional Jacket */}
                <path d="M45 150 C45 110 125 110 125 150 Z" fill="#10B981" />
                {/* Headset arc */}
                <path d="M68 62 C70 50 95 50 98 62" stroke="#1E293B" strokeWidth="2.5" fill="none" />
                {/* Headset mic */}
                <path d="M85 85 L100 90" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
                <circle cx="102" cy="90" r="2.5" fill="#10B981" />
                
                {/* Laptop outline */}
                <path d="M110 150 L125 115 L165 115 L180 150 Z" fill="#0B1C30" stroke="#1E293B" strokeWidth="2" />
                {/* Medical symbol on laptop lid */}
                <path d="M145 125 V137 M139 131 H151" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
              </g>

              {/* Floating Chat Bubble (Left center) */}
              <g transform="translate(30, 45)">
                <rect x="0" y="0" width="60" height="35" rx="12" fill="#0B1C30" stroke="#10B981" strokeWidth="1.5" />
                <circle cx="18" cy="18" r="2" fill="#10B981" />
                <circle cx="30" cy="18" r="2" fill="#10B981" />
                <circle cx="42" cy="18" r="2" fill="#10B981" />
                <path d="M20 35 L12 43 L18 35 Z" fill="#0B1C30" stroke="#10B981" strokeWidth="1.5" />
              </g>
            </svg>
          </div>
        </div>

        {/* ==========================================
            RIGHT COLUMN: PREMIUM GLASS FORM
            ========================================== */}
        <div className="relative">
          {/* Morphing Success Overlay */}
          <AnimatePresence>
            {status === 'success' && successInfo && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                className="absolute inset-0 bg-[#08111D]/95 border border-emerald-500/40 rounded-[32px] p-8 flex flex-col justify-center items-center text-center z-30 shadow-2xl backdrop-blur-xl"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500 text-emerald-400 flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/10">
                  <Check className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-white mb-2">Message Sent Successfully</h3>
                <p className="text-slate-400 text-sm max-w-sm mb-8 font-medium">
                  We have received your ticket request. A confirmation email has been dispatched to your address.
                </p>

                <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-2xl p-6 text-left space-y-4 shadow-inner">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                    <span>Ticket Identifier:</span>
                    <span className="text-white font-black">{successInfo.ticketId}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                    <span>Estimated Response:</span>
                    <span className="text-emerald-400 font-black">{successInfo.estimatedResponse}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                    <span>Routing Queue:</span>
                    <span className="text-teal-400 font-black">{successInfo.assignedTo}</span>
                  </div>
                </div>
                
                <button 
                  onClick={() => setSuccessInfo(null)}
                  className="mt-8 text-xs font-black uppercase tracking-wider text-emerald-400 hover:text-emerald-350 cursor-pointer"
                >
                  Send another message
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form wrapper */}
          <div className="rounded-[32px] bg-slate-900/40 border border-slate-850 p-8 md:p-10 shadow-2xl backdrop-blur-xl relative">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
            
            <div className="mb-8 space-y-1">
              <h3 className="text-2xl font-black text-white tracking-tight">Send us a Message</h3>
              <p className="text-xs text-slate-500 font-bold">We will get back to you within one business hour.</p>
            </div>

            {status === 'error' && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-bold text-red-400">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* First & Last Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="relative">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">First Name *</label>
                  <input 
                    type="text" 
                    name="firstName" 
                    value={formData.firstName}
                    onChange={handleChange}
                    className={`w-full px-4 py-3.5 bg-slate-950/80 border rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition ${
                      errors.firstName ? 'border-red-500' : 'border-slate-800'
                    }`}
                    placeholder="Enter first name"
                  />
                  {errors.firstName && <span className="text-[10px] text-red-400 font-bold block mt-1">{errors.firstName}</span>}
                </div>
                
                <div className="relative">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">Last Name *</label>
                  <input 
                    type="text" 
                    name="lastName" 
                    value={formData.lastName}
                    onChange={handleChange}
                    className={`w-full px-4 py-3.5 bg-slate-950/80 border rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition ${
                      errors.lastName ? 'border-red-500' : 'border-slate-800'
                    }`}
                    placeholder="Enter last name"
                  />
                  {errors.lastName && <span className="text-[10px] text-red-400 font-bold block mt-1">{errors.lastName}</span>}
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="relative">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">Email Address *</label>
                  <input 
                    type="email" 
                    name="email" 
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full px-4 py-3.5 bg-slate-950/80 border rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition ${
                      errors.email ? 'border-red-500' : 'border-slate-800'
                    }`}
                    placeholder="Enter your email"
                  />
                  {errors.email && <span className="text-[10px] text-red-400 font-bold block mt-1">{errors.email}</span>}
                </div>

                <div className="relative">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">Phone Number *</label>
                  <input 
                    type="tel" 
                    name="phone" 
                    value={formData.phone}
                    onChange={handleChange}
                    className={`w-full px-4 py-3.5 bg-slate-950/80 border rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition ${
                      errors.phone ? 'border-red-500' : 'border-slate-800'
                    }`}
                    placeholder="Enter phone number"
                  />
                  {errors.phone && <span className="text-[10px] text-red-400 font-bold block mt-1">{errors.phone}</span>}
                </div>
              </div>

              {/* Clinic Name */}
              <div className="relative">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">Clinic / Hospital Name *</label>
                <input 
                  type="text" 
                  name="clinicName" 
                  value={formData.clinicName}
                  onChange={handleChange}
                  className={`w-full px-4 py-3.5 bg-slate-950/80 border rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition ${
                    errors.clinicName ? 'border-red-500' : 'border-slate-800'
                  }`}
                  placeholder="Enter your clinic or hospital name"
                />
                {errors.clinicName && <span className="text-[10px] text-red-400 font-bold block mt-1">{errors.clinicName}</span>}
              </div>

              {/* Role & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="relative">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">Your Role *</label>
                  <select 
                    name="role" 
                    value={formData.role}
                    onChange={handleChange}
                    className={`w-full px-4 py-3.5 bg-slate-950/80 border rounded-xl text-xs font-semibold text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition ${
                      errors.role ? 'border-red-500' : 'border-slate-800'
                    }`}
                  >
                    <option value="">Select your role</option>
                    <option value="Clinic Owner">Clinic Owner</option>
                    <option value="Clinic Admin">Clinic Admin</option>
                    <option value="Doctor">Doctor</option>
                    <option value="Receptionist">Receptionist</option>
                    <option value="Hospital">Hospital</option>
                    <option value="Other">Other</option>
                  </select>
                  {errors.role && <span className="text-[10px] text-red-400 font-bold block mt-1">{errors.role}</span>}
                </div>

                <div className="relative">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">Department *</label>
                  <select 
                    name="department" 
                    value={formData.department}
                    onChange={handleChange}
                    className="w-full px-4 py-3.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-semibold text-slate-450 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition"
                  >
                    <option value="Sales">Sales</option>
                    <option value="Technical Support">Technical Support</option>
                    <option value="Billing">Billing</option>
                    <option value="Migration">Migration</option>
                    <option value="API Integration">API Integration</option>
                    <option value="Feature Request">Feature Request</option>
                    <option value="Bug Report">Bug Report</option>
                    <option value="General Inquiry">General Inquiry</option>
                  </select>
                </div>
              </div>

              {/* Priority & Subject */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="relative">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">Priority *</label>
                  <select 
                    name="priority" 
                    value={formData.priority}
                    onChange={handleChange}
                    className="w-full px-4 py-3.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-semibold text-slate-455 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                <div className="relative">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">Subject *</label>
                  <input 
                    type="text" 
                    name="subject" 
                    value={formData.subject}
                    onChange={handleChange}
                    className={`w-full px-4 py-3.5 bg-slate-950/80 border rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition ${
                      errors.subject ? 'border-red-500' : 'border-slate-800'
                    }`}
                    placeholder="Enter subject"
                  />
                  {errors.subject && <span className="text-[10px] text-red-400 font-bold block mt-1">{errors.subject}</span>}
                </div>
              </div>

              {/* Message */}
              <div className="relative">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">Message *</label>
                <textarea 
                  name="message" 
                  value={formData.message}
                  onChange={handleChange}
                  rows={4}
                  className={`w-full px-4 py-3.5 bg-slate-950/80 border rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition resize-none ${
                    errors.message ? 'border-red-500' : 'border-slate-800'
                  }`}
                  placeholder="Tell us about your requirement..."
                />
                {errors.message && <span className="text-[10px] text-red-400 font-bold block mt-1">{errors.message}</span>}
              </div>

              {/* Consent checkbox */}
              <div className="relative flex items-start gap-2.5">
                <input 
                  type="checkbox" 
                  name="agree" 
                  id="agree"
                  checked={formData.agree}
                  onChange={handleChange}
                  className="mt-0.5"
                />
                <label htmlFor="agree" className="text-[11px] text-slate-400 font-semibold cursor-pointer">
                  I agree to the <span className="text-emerald-400 hover:underline">Privacy Policy</span> and <span className="text-emerald-400 hover:underline">Terms of Service</span>.
                </label>
              </div>
              {errors.agree && <span className="text-[10px] text-red-400 font-bold block">{errors.agree}</span>}

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={status === 'loading'}
                className="w-full py-4.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-700/10 hover:shadow-emerald-700/20 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed"
              >
                {status === 'loading' ? (
                  <span>Sending Ticket...</span>
                ) : (
                  <>
                    <span>Send Message</span>
                    <span className="text-sm">→</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="w-full text-center py-8 text-xs text-slate-600 font-bold border-t border-slate-900 bg-slate-950/30">
        &copy; 2026 PEHAL Healthcare. All rights reserved. | Powered by AI
      </footer>

    </div>
  );
}
