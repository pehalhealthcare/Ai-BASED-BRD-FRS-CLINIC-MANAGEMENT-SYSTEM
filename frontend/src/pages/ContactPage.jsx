import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Headphones, MessageCircle, Mail, Users, Shield, Phone, MapPin,
  Building2, User, ArrowRight, ArrowLeft, Send, Check,
  AlertCircle, CheckCircle2, Heart, Flag, FileText, MessageSquare
} from 'lucide-react';
import PehalLogo from '../components/common/PehalLogo';
import axios from 'axios';

// Existing SVG Assets from src/assets/
import doctorImage from '../assets/pehal_doctor_headset.svg';
import petalBackground from '../assets/pehal_blue_petal_background.svg';

export default function ContactPage() {
  const navigate = useNavigate();
  
  // Form states
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    clinicName: '',
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
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[0-9]{10}$/.test(formData.phone.replace(/[^0-9]/g, ''))) {
      newErrors.phone = 'Must be a 10-digit number';
    }

    if (!formData.clinicName.trim()) newErrors.clinicName = 'Clinic or hospital name is required';
    if (!formData.subject.trim()) newErrors.subject = 'Subject is required';
    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }

    if (!formData.agree) newErrors.agree = 'You must agree to the Terms and Privacy Policy';

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
      const apiBase = import.meta.env.VITE_API_BASE_URL || '/api/v1';
      const response = await axios.post(`${apiBase}/support`, {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        clinicName: formData.clinicName.trim(),
        role: 'Clinic Owner',
        department: 'Customer Support',
        priority: formData.priority,
        subject: formData.subject.trim(),
        message: formData.message.trim(),
        agree: formData.agree
      });

      if (response.data?.success) {
        setStatus('success');
        setSuccessInfo({
          ticketId: response.data.ticketId || `PHL-${Date.now().toString().slice(-6)}`,
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          clinicName: formData.clinicName,
          priority: formData.priority,
          estimatedResponse: formData.priority === 'Urgent' ? 'Within 15 Minutes' : formData.priority === 'High' ? 'Within 30 Minutes' : 'Within 1 Hour'
        });

        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          clinicName: '',
          priority: 'Normal',
          subject: '',
          message: '',
          agree: false
        });
      } else {
        throw new Error(response.data?.message || 'Submission failed');
      }
    } catch (err) {
      console.error('Contact submit error:', err);
      setStatus('error');
      setErrorMessage(err.response?.data?.message || err.message || 'Something went wrong. Please check your connection and try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5F9FF] via-[#EBF3FE] to-[#F0F6FF] text-slate-800 font-sans antialiased overflow-x-hidden selection:bg-[#0070F3] selection:text-white flex flex-col justify-between">
      
      {/* 🧭 Top Navigation Header */}
      <header className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 py-5 sm:py-6 flex items-center justify-between relative z-30">
        <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <PehalLogo variant="primary" height={36} />
        </Link>
        <button 
          type="button"
          onClick={() => navigate('/')} 
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-[#0070F3] transition-all cursor-pointer bg-white hover:bg-blue-50/80 border border-slate-200/90 hover:border-blue-300 px-4 py-2.5 rounded-full shadow-xs"
        >
          <ArrowLeft size={14} /> <span>BACK TO HOME</span>
        </button>
      </header>

      {/* 🏢 Main Two-Column Container */}
      <main className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-10 py-2 sm:py-4 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start flex-grow w-full">
        
        {/* ==========================================
            LEFT COLUMN (50% on desktop): HERO, DOCTOR & SUPPORT CARDS
            ========================================== */}
        <div className="lg:col-span-6 xl:col-span-6 flex flex-col justify-between h-full space-y-6">
          
          {/* Top Hero & Doctor Composition Area */}
          <div className="relative min-h-[380px] sm:min-h-[420px] flex flex-col justify-between">
            
            {/* Left-Aligned Text Content */}
            <div className="max-w-[340px] sm:max-w-[380px] z-10 relative pt-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-blue-200/90 text-[#0070F3] text-[11px] font-bold shadow-xs mb-3">
                <Headphones size={13} className="text-[#0070F3]" />
                <span>CONTACT SUPPORT</span>
              </div>

              <h1 className="text-3xl sm:text-[38px] xl:text-[42px] font-black text-[#0B1E3B] tracking-tight leading-[1.12] mb-3">
                Need Help? <br />
                We're Here <span className="text-[#0070F3]">24/7.</span>
              </h1>

              <p className="text-slate-500 text-xs sm:text-[12.5px] leading-relaxed font-medium">
                Whether you're setting up your clinic, migrating data, onboarding doctors, configuring branches, or upgrading plans, our healthcare specialists are ready to assist you.
              </p>
            </div>

            {/* Doctor + Petal Graphic Composition (Positioned on the Right side of the left column) */}
            <div className="hidden sm:block absolute right-0 -top-4 w-[280px] md:w-[320px] xl:w-[360px] h-[420px] pointer-events-none select-none z-0">
              {/* Petal strictly BEHIND doctor */}
              <img 
                src={petalBackground} 
                alt="PEHAL Abstract Background"
                className="absolute top-4 right-0 w-[270px] md:w-[310px] xl:w-[340px] h-auto object-contain z-0 opacity-95"
              />
              {/* Doctor with Headset SVG */}
              <img 
                src={doctorImage} 
                alt="PEHAL Healthcare Support Specialist"
                className="absolute top-0 right-4 w-[220px] md:w-[250px] xl:w-[280px] h-auto object-contain z-10 drop-shadow-[0_10px_25px_rgba(0,112,243,0.18)]"
              />
              
              {/* Floating Doctor Badge: Always Here for a Healthier Tomorrow */}
              <div className="absolute bottom-14 right-2 bg-white/95 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 border border-slate-100/90 shadow-[0_8px_24px_rgba(0,112,243,0.14)] flex items-center gap-2.5 z-20 pointer-events-auto">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-50 border border-blue-100 text-[#0070F3] flex items-center justify-center shrink-0 shadow-xs">
                  <Headphones size={15} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-black text-[#0B1E3B] leading-none">Always Here</span>
                  <span className="text-[10px] font-bold text-[#0070F3] leading-tight mt-0.5">for a Healthier Tomorrow</span>
                </div>
                <Heart size={13} className="text-[#0070F3] ml-1 shrink-0" />
              </div>

              {/* Decorative Tagline with Cursive Treatment & Swoosh */}
              <div className="absolute bottom-0 right-4 text-right z-20 flex flex-col items-end pointer-events-auto">
                <div 
                  className="text-[#0070F3] font-bold text-2xl sm:text-[26px] leading-[1.05] tracking-wide"
                  style={{ fontFamily: "'Caveat', cursive, sans-serif", transform: 'rotate(-4deg)' }}
                >
                  Better Care, <br />
                  Brighter Tomorrows
                </div>
                {/* Decorative underline swoosh SVG */}
                <svg className="w-28 sm:w-32 h-3 text-[#0070F3] -mt-1 mr-1" viewBox="0 0 120 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 8.5C35 2 85 1.5 118 7" stroke="#0070F3" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* Mobile View Doctor Composition */}
            <div className="sm:hidden relative w-full h-[260px] flex items-center justify-center my-3">
              <img 
                src={petalBackground} 
                alt="PEHAL Abstract Background"
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[240px] h-auto object-contain z-0 opacity-95"
              />
              <img 
                src={doctorImage} 
                alt="PEHAL Healthcare Support Specialist"
                className="relative z-10 w-auto h-[240px] object-contain drop-shadow-md"
              />
              <div className="absolute bottom-2 right-2 bg-white/95 backdrop-blur-md rounded-xl p-2 border border-slate-100 shadow-md flex items-center gap-2 z-20">
                <div className="w-6 h-6 rounded-full bg-blue-50 text-[#0070F3] flex items-center justify-center shrink-0">
                  <Headphones size={13} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-[#0B1E3B] leading-none">Always Here</span>
                  <span className="text-[9px] font-bold text-[#0070F3] leading-none mt-0.5">for a Healthier Tomorrow</span>
                </div>
                <Heart size={11} className="text-[#0070F3] ml-0.5" />
              </div>
            </div>

          </div>

          {/* 6 SUPPORT INFORMATION CARDS (3 Rows of 2 Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-[460px] z-10">
            
            {/* Card 1: Live Support */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_4px_16px_rgba(0,112,243,0.05)] hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100/80 text-[#0070F3] flex items-center justify-center shadow-xs">
                    <MessageCircle size={16} />
                  </div>
                  <span className="bg-emerald-50 border border-emerald-200 text-emerald-600 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    ONLINE
                  </span>
                </div>
                <h4 className="text-[13px] font-black text-[#0B1E3B] leading-tight mb-1">
                  Live Support
                </h4>
                <p className="text-[11px] text-slate-500 leading-snug font-medium">
                  Average response under 5m
                </p>
              </div>
            </div>

            {/* Card 2: Email Support */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_4px_16px_rgba(0,112,243,0.05)] hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100/80 text-[#0070F3] flex items-center justify-center shadow-xs">
                    <Mail size={16} />
                  </div>
                  <span className="bg-blue-50 border border-blue-200 text-[#0070F3] text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    24/7 SUPPORT
                  </span>
                </div>
                <h4 className="text-[13px] font-black text-[#0B1E3B] leading-tight mb-1">
                  Email Support
                </h4>
                <p className="text-[11px] text-slate-500 leading-snug font-medium truncate">
                  support@pehalhealth.com
                </p>
              </div>
            </div>

            {/* Card 3: Sales Team */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_4px_16px_rgba(0,112,243,0.05)] hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100/80 text-[#0070F3] flex items-center justify-center shadow-xs">
                    <Users size={16} />
                  </div>
                  <span className="bg-blue-50 border border-blue-200 text-[#0070F3] text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    CUSTOM QUOTE
                  </span>
                </div>
                <h4 className="text-[13px] font-black text-[#0B1E3B] leading-tight mb-1">
                  Sales Team
                </h4>
                <p className="text-[11px] text-slate-500 leading-snug font-medium">
                  Get pricing & personalized demo
                </p>
              </div>
            </div>

            {/* Card 4: Emergency Support */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_4px_16px_rgba(0,112,243,0.05)] hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100/80 text-[#0070F3] flex items-center justify-center shadow-xs">
                    <Shield size={16} />
                  </div>
                  <span className="bg-blue-50 border border-blue-200 text-[#0070F3] text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    TIER-1 HELP
                  </span>
                </div>
                <h4 className="text-[13px] font-black text-[#0B1E3B] leading-tight mb-1">
                  Emergency Support
                </h4>
                <p className="text-[11px] text-slate-500 leading-snug font-medium">
                  Immediate assistance
                </p>
              </div>
            </div>

            {/* Card 5: Phone Support */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_4px_16px_rgba(0,112,243,0.05)] hover:shadow-md transition-shadow flex flex-col justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100/80 text-[#0070F3] flex items-center justify-center shadow-xs shrink-0">
                  <Phone size={16} />
                </div>
                <div>
                  <h4 className="text-[13px] font-black text-[#0B1E3B] leading-tight mb-0.5">
                    Phone Support
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    +91 98765 43210
                  </p>
                </div>
              </div>
            </div>

            {/* Card 6: Office Location */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_4px_16px_rgba(0,112,243,0.05)] hover:shadow-md transition-shadow flex flex-col justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100/80 text-[#0070F3] flex items-center justify-center shadow-xs shrink-0">
                  <MapPin size={16} />
                </div>
                <div>
                  <h4 className="text-[13px] font-black text-[#0B1E3B] leading-tight mb-0.5">
                    Office Location
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium truncate">
                    Lucknow, Uttar Pradesh, IN
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* COMPLIANCE BADGES (Single Row) */}
          <div className="flex flex-wrap items-center gap-2 pt-1 pb-1 z-10">
            {['HIPAA READY', 'NABH READY', 'GDPR READY', 'AES-256 ENCRYPTION'].map((badge) => (
              <span 
                key={badge}
                className="bg-white border border-blue-200/80 text-[#0070F3] px-3 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1.5 shadow-xs tracking-tight"
              >
                <Check size={12} strokeWidth={3} className="text-[#0070F3]" />
                <span>{badge}</span>
              </span>
            ))}
          </div>

        </div>

        {/* ==========================================
            RIGHT COLUMN (50% on desktop): SUPPORT FORM CARD
            ========================================== */}
        <div className="lg:col-span-6 xl:col-span-6 w-full">
          
          <div className="bg-white rounded-3xl p-5 sm:p-7 xl:p-8 border border-slate-100 shadow-[0_12px_44px_rgba(0,112,243,0.07)] relative">
            
            {/* Header: Icon + Title + Subtitle */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100/80 text-[#0070F3] flex items-center justify-center shrink-0 shadow-xs">
                <Mail size={18} />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl xl:text-2xl font-black text-[#0B1E3B] tracking-tight leading-tight">
                  Send us a Message
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  We will get back to you within one business hour.
                </p>
              </div>
            </div>

            {/* Success State View */}
            {status === 'success' && successInfo ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-10 text-center space-y-5"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-400 text-emerald-600 flex items-center justify-center mx-auto shadow-md shadow-emerald-500/15">
                  <CheckCircle2 size={32} />
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-3.5 py-1 rounded-full">
                    MESSAGE SENT SUCCESSFULLY • {successInfo.ticketId}
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-[#0B1E3B]">
                    Message Sent Successfully
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                    Thank you for contacting PEHAL Healthcare. Your ticket for <strong className="text-slate-900">{successInfo.clinicName}</strong> has been assigned to priority support queue ({successInfo.estimatedResponse}).
                  </p>
                  <p className="text-xs text-slate-500 pt-1">
                    You'll receive a confirmation email with the ticket details.
                  </p>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#0070F3] hover:bg-[#005FE0] text-white font-bold text-xs sm:text-sm transition shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Back to Home</span>
                    <ArrowRight size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStatus('idle');
                      setSuccessInfo(null);
                    }}
                    className="w-full sm:w-auto px-6 py-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm transition cursor-pointer"
                  >
                    <span>Send Another Message</span>
                  </button>
                </div>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* ── ROW 1: FIRST NAME + LAST NAME ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* First Name */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#0B1E3B] uppercase tracking-wider mb-1">
                      FIRST NAME <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        placeholder="Enter first name"
                        className={`w-full bg-slate-50/70 border rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0070F3]/30 font-medium ${
                          errors.firstName ? 'border-red-400 bg-red-50/30' : 'border-slate-200'
                        }`}
                      />
                    </div>
                    {errors.firstName && <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.firstName}</p>}
                  </div>

                  {/* Last Name */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#0B1E3B] uppercase tracking-wider mb-1">
                      LAST NAME <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        placeholder="Enter last name"
                        className={`w-full bg-slate-50/70 border rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0070F3]/30 font-medium ${
                          errors.lastName ? 'border-red-400 bg-red-50/30' : 'border-slate-200'
                        }`}
                      />
                    </div>
                    {errors.lastName && <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.lastName}</p>}
                  </div>
                </div>

                {/* ── ROW 2: EMAIL ADDRESS + PHONE NUMBER ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Email Address */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#0B1E3B] uppercase tracking-wider mb-1">
                      EMAIL ADDRESS <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="Enter your email"
                        className={`w-full bg-slate-50/70 border rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0070F3]/30 font-medium ${
                          errors.email ? 'border-red-400 bg-red-50/30' : 'border-slate-200'
                        }`}
                      />
                    </div>
                    {errors.email && <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.email}</p>}
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#0B1E3B] uppercase tracking-wider mb-1">
                      PHONE NUMBER <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="Enter phone number"
                        className={`w-full bg-slate-50/70 border rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0070F3]/30 font-medium ${
                          errors.phone ? 'border-red-400 bg-red-50/30' : 'border-slate-200'
                        }`}
                      />
                    </div>
                    {errors.phone && <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.phone}</p>}
                  </div>
                </div>

                {/* ── ROW 3: CLINIC / HOSPITAL NAME (FULL WIDTH) ── */}
                <div>
                  <label className="block text-[11px] font-bold text-[#0B1E3B] uppercase tracking-wider mb-1">
                    CLINIC / HOSPITAL NAME <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      name="clinicName"
                      value={formData.clinicName}
                      onChange={handleChange}
                      placeholder="Enter your clinic or hospital name"
                      className={`w-full bg-slate-50/70 border rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0070F3]/30 font-medium ${
                        errors.clinicName ? 'border-red-400 bg-red-50/30' : 'border-slate-200'
                      }`}
                    />
                  </div>
                  {errors.clinicName && <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.clinicName}</p>}
                </div>

                {/* ── ROW 4: PRIORITY + SUBJECT ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Priority Dropdown */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#0B1E3B] uppercase tracking-wider mb-1">
                      PRIORITY <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Flag size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <select
                        name="priority"
                        value={formData.priority}
                        onChange={handleChange}
                        className="w-full bg-slate-50/70 border border-slate-200 rounded-xl pl-9 pr-8 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0070F3]/30 appearance-none font-medium cursor-pointer"
                      >
                        <option value="Normal">Normal</option>
                        <option value="High">High</option>
                        <option value="Urgent">Urgent</option>
                      </select>
                    </div>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#0B1E3B] uppercase tracking-wider mb-1">
                      SUBJECT <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <FileText size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        placeholder="Enter subject"
                        className={`w-full bg-slate-50/70 border rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0070F3]/30 font-medium ${
                          errors.subject ? 'border-red-400 bg-red-50/30' : 'border-slate-200'
                        }`}
                      />
                    </div>
                    {errors.subject && <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.subject}</p>}
                  </div>
                </div>

                {/* ── ROW 5: MESSAGE (TEXTAREA) ── */}
                <div>
                  <label className="block text-[11px] font-bold text-[#0B1E3B] uppercase tracking-wider mb-1">
                    MESSAGE <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <MessageSquare size={14} className="absolute left-3.5 top-3 text-slate-400" />
                    <textarea
                      name="message"
                      rows={3}
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Tell us about your requirement..."
                      className={`w-full bg-slate-50/70 border rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0070F3]/30 font-medium resize-none ${
                        errors.message ? 'border-red-400 bg-red-50/30' : 'border-slate-200'
                      }`}
                    />
                  </div>
                  {errors.message && <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.message}</p>}
                </div>

                {/* Error Banner */}
                {errorMessage && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle size={15} className="text-red-500 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Privacy & Terms Checkbox */}
                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600 font-medium">
                    <input
                      type="checkbox"
                      name="agree"
                      checked={formData.agree}
                      onChange={handleChange}
                      className="w-4 h-4 rounded border-slate-300 text-[#0070F3] focus:ring-[#0070F3]/40 cursor-pointer"
                    />
                    <span>
                      I agree to the <Link to="/" className="text-[#0070F3] hover:underline font-semibold">Privacy Policy</Link> and <Link to="/" className="text-[#0070F3] hover:underline font-semibold">Terms of Service</Link>.
                    </span>
                  </label>
                  {errors.agree && <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.agree}</p>}
                </div>

                {/* ── SEND MESSAGE BUTTON ── */}
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full py-3.5 px-6 rounded-2xl bg-[#0070F3] hover:bg-[#005FE0] text-white font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 shadow-md shadow-blue-600/25 hover:shadow-lg hover:shadow-blue-600/35 hover:-translate-y-0.5 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <Send size={15} />
                  <span>{status === 'loading' ? 'SENDING...' : 'SEND MESSAGE'}</span>
                  <span>→</span>
                </button>

              </form>
            )}

          </div>

        </div>

      </main>

      {/* 🛡️ Footer */}
      <footer className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 py-5 text-xs text-slate-500 border-t border-slate-200/80 mt-6 relative z-20 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          © 2026 PEHAL Healthcare. All rights reserved. | Powered by AI
        </div>
        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
          <span>Technology for a Healthier Tomorrow</span>
          <Heart size={14} className="text-[#0070F3] fill-[#0070F3]/20" />
        </div>
      </footer>

    </div>
  );
}
