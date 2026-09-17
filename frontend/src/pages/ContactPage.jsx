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
      <header className="w-full max-w-[1600px] 2xl:max-w-[1880px] mx-auto px-4 sm:px-6 lg:px-10 2xl:px-16 py-3.5 sm:py-5 flex items-center justify-between relative z-30 shrink-0">
        <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity min-w-0">
          <PehalLogo variant="primary" height={40} className="h-8 sm:h-9 2xl:h-11 w-auto shrink-0" />
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
        <button 
          type="button"
          onClick={() => navigate('/')} 
          className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs 2xl:text-sm font-bold uppercase tracking-wider text-slate-700 hover:text-[#0070F3] transition-all cursor-pointer bg-white hover:bg-blue-50/80 border border-slate-200/90 hover:border-blue-300 px-3.5 sm:px-4 2xl:px-6 py-2 sm:py-2.5 2xl:py-3 rounded-full shadow-xs shrink-0 whitespace-nowrap min-h-[40px] sm:min-h-[44px] 2xl:min-h-[48px]"
        >
          <ArrowLeft size={14} className="shrink-0" /> <span>BACK TO HOME</span>
        </button>
      </header>

      {/* 🏢 Main Content Container */}
      <main className="max-w-[1600px] 2xl:max-w-[1880px] mx-auto px-4 sm:px-6 lg:px-10 2xl:px-16 py-2 sm:py-4 flex-grow w-full flex flex-col justify-center">
        
        {/* =========================================================================
            1. LARGE / DESKTOP LAYOUT (1024px+ / lg:grid lg:grid-cols-12):
            Matches Desktop Reference Image:
            - Left 50% Column: Hero text on left, Doctor visual on right, 6 support cards in 2 columns below, Compliance badges
            - Right 50% Column: Full Customer Support Form Card
            ========================================================================= */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-6 lg:gap-8 xl:gap-10 2xl:gap-14 items-start w-full relative">
          
          {/* Left Column (50% on desktop: Hero Text + Doctor Visual + 6 Cards + Badges) */}
          <div className="lg:col-span-6 xl:col-span-6 2xl:col-span-6 flex flex-col justify-between space-y-4 xl:space-y-5 2xl:space-y-6">
            
            {/* Top Hero Composition: Left Text + Right Doctor */}
            <div className="relative min-h-[300px] lg:min-h-[330px] xl:min-h-[360px] 2xl:min-h-[410px] flex flex-col justify-between">
              
              {/* Left-Aligned Text */}
              <div className="w-full max-w-[310px] lg:max-w-[340px] xl:max-w-[380px] 2xl:max-w-[430px] z-10 relative pt-1">
                <div className="inline-flex items-center gap-2 px-3 2xl:px-4 py-1 2xl:py-1.5 rounded-full bg-white border border-blue-200/90 text-[#0070F3] text-[10.5px] xl:text-[11.5px] 2xl:text-xs font-bold shadow-xs mb-2.5 2xl:mb-3">
                  <Headphones size={13} className="text-[#0070F3]" />
                  <span>CONTACT SUPPORT</span>
                </div>

                <h1 className="text-2xl lg:text-3xl xl:text-[36px] 2xl:text-[44px] font-black text-[#0B1E3B] tracking-tight leading-[1.12] mb-2 2xl:mb-3">
                  Need Help? <br />
                  We're Here <span className="text-[#0070F3]">24/7.</span>
                </h1>

                <p className="text-slate-500 text-xs xl:text-[13px] 2xl:text-[15.5px] leading-relaxed font-medium">
                  Whether you're setting up your clinic, migrating data, onboarding doctors, configuring branches, or upgrading plans, our healthcare specialists are ready to assist you.
                </p>
              </div>

              {/* Right-Side Doctor Visual Composition */}
              <div className="absolute right-0 -top-2 lg:-top-4 w-[230px] lg:w-[260px] xl:w-[300px] 2xl:w-[360px] h-[310px] lg:h-[340px] xl:h-[370px] 2xl:h-[430px] pointer-events-none select-none z-0">
                {/* Dot Matrix Pattern */}
                <div 
                  className="absolute top-2 right-2 w-24 xl:w-28 2xl:w-36 h-28 xl:h-32 2xl:h-40 opacity-35 z-0"
                  style={{
                    backgroundImage: 'radial-gradient(#0070F3 1.5px, transparent 1.5px)',
                    backgroundSize: '13px 13px'
                  }}
                />

                {/* Abstract Blue Petals behind Doctor */}
                <img 
                  src={petalBackground} 
                  alt="PEHAL Abstract Background"
                  className="absolute top-2 right-0 w-[220px] lg:w-[250px] xl:w-[290px] 2xl:w-[350px] h-auto object-contain z-0 opacity-95"
                />

                {/* Doctor with Headset SVG */}
                <img 
                  src={doctorImage} 
                  alt="PEHAL Healthcare Support Specialist"
                  className="absolute top-0 right-2 w-[180px] lg:w-[205px] xl:w-[240px] 2xl:w-[290px] h-auto object-contain z-10 drop-shadow-[0_10px_25px_rgba(0,112,243,0.18)]"
                />

                {/* Floating Support Badge */}
                <div className="absolute bottom-12 xl:bottom-14 2xl:bottom-16 -left-3 lg:-left-4 xl:-left-6 bg-white/95 backdrop-blur-md rounded-2xl p-2 lg:p-2.5 xl:p-3 border border-slate-100/90 shadow-[0_8px_24px_rgba(0,112,243,0.14)] flex items-center gap-2 2xl:gap-2.5 z-20 pointer-events-auto">
                  <div className="w-6 h-6 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 rounded-xl bg-blue-50 border border-blue-100 text-[#0070F3] flex items-center justify-center shrink-0 shadow-xs">
                    <Headphones size={13} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10.5px] xl:text-[11px] 2xl:text-xs font-black text-[#0B1E3B] leading-none">Always Here</span>
                    <span className="text-[9px] xl:text-[9.5px] 2xl:text-[10.5px] font-bold text-[#0070F3] leading-tight mt-0.5">for a Healthier Tomorrow</span>
                  </div>
                  <Heart size={11} className="text-[#0070F3] ml-0.5 shrink-0" />
                </div>

                {/* Cursive Tagline with Underline Swoosh */}
                <div className="absolute bottom-0 -left-1 xl:-left-3 text-left z-20 pointer-events-auto">
                  <div 
                    className="text-[#0070F3] font-bold text-xl lg:text-2xl xl:text-[25px] 2xl:text-[29px] leading-[1.05] tracking-wide inline-block"
                    style={{ fontFamily: "'Caveat', cursive, sans-serif", transform: 'rotate(-3deg)', transformOrigin: 'left center' }}
                  >
                    Better Care, Brighter Tomorrows
                  </div>
                  <svg className="w-32 lg:w-36 xl:w-40 2xl:w-44 h-2 2xl:h-2.5 text-[#0070F3] mt-0.5" viewBox="0 0 120 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 7C35 1.5 85 1 118 6" stroke="#0070F3" strokeWidth="2.2" strokeLinecap="round" />
                  </svg>
                </div>

              </div>

            </div>

            {/* 6 Support Cards (2 Columns x 3 Rows) */}
            <div className="grid grid-cols-2 gap-2.5 xl:gap-3 2xl:gap-4 z-10 w-full">
              {renderSupportCards(false)}
            </div>

            {/* Compliance Badges Row */}
            <div className="flex flex-wrap items-center gap-1.5 2xl:gap-2 z-10 pt-0.5">
              {['HIPAA READY', 'NABH READY', 'GDPR READY', 'AES-256 ENCRYPTION'].map((badge) => (
                <span 
                  key={badge}
                  className="bg-white border border-blue-200/80 text-[#0070F3] px-2.5 2xl:px-3 py-1 rounded-full text-[9px] xl:text-[9.5px] 2xl:text-[11px] font-extrabold flex items-center gap-1 shadow-xs tracking-tight whitespace-nowrap"
                >
                  <Check size={11} strokeWidth={3} className="text-[#0070F3] shrink-0" />
                  <span>{badge}</span>
                </span>
              ))}
            </div>

          </div>

          {/* Right Column (50% on desktop: Support Form Card) */}
          <div className="lg:col-span-6 xl:col-span-6 2xl:col-span-6 w-full">
            {renderFormCard(false)}
          </div>

        </div>


        {/* =========================================================================
            2. TABLET / MEDIUM SCREEN LAYOUT (768px – 1023px / hidden md:flex lg:hidden):
            Balanced intermediate layout: Hero (Text + Doctor) -> Support Cards (2 cols) -> Badges -> Form
            ========================================================================= */}
        <div className="hidden md:flex lg:hidden flex-col space-y-6 w-full max-w-[960px] mx-auto">
          
          {/* Tablet Hero: Text (Left) + Doctor Visual (Right) */}
          <div className="grid grid-cols-12 gap-6 items-center w-full">
            
            {/* Hero Text */}
            <div className="col-span-7">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-blue-200/90 text-[#0070F3] text-[11px] font-bold shadow-xs mb-3">
                <Headphones size={13} className="text-[#0070F3]" />
                <span>CONTACT SUPPORT</span>
              </div>

              <h1 className="text-3xl md:text-[34px] font-black text-[#0B1E3B] tracking-tight leading-[1.15] mb-2.5">
                Need Help? <br />
                We're Here <span className="text-[#0070F3]">24/7.</span>
              </h1>

              <p className="text-slate-500 text-xs md:text-sm leading-relaxed font-medium">
                Whether you're setting up your clinic, migrating data, onboarding doctors, configuring branches, or upgrading plans, our healthcare specialists are ready to assist you.
              </p>
            </div>

            {/* Tablet Doctor Visual */}
            <div className="col-span-5 relative h-[250px] flex items-center justify-center select-none pointer-events-none">
              <div 
                className="absolute top-2 right-4 w-24 h-24 opacity-30 z-0"
                style={{
                  backgroundImage: 'radial-gradient(#0070F3 1.5px, transparent 1.5px)',
                  backgroundSize: '12px 12px'
                }}
              />
              <img 
                src={petalBackground} 
                alt="PEHAL Abstract Background"
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-auto object-contain z-0 opacity-95"
              />
              <img 
                src={doctorImage} 
                alt="PEHAL Healthcare Support Specialist"
                className="relative z-10 w-[200px] h-auto object-contain drop-shadow-[0_10px_24px_rgba(0,112,243,0.16)]"
              />
              <div className="absolute bottom-2 right-0 bg-white/95 backdrop-blur-md rounded-xl p-2 border border-slate-100 shadow-[0_6px_20px_rgba(0,112,243,0.12)] flex items-center gap-2 z-20 pointer-events-auto">
                <div className="w-6 h-6 rounded-lg bg-blue-50 text-[#0070F3] flex items-center justify-center shrink-0">
                  <Headphones size={13} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-[#0B1E3B] leading-none">Always Here</span>
                  <span className="text-[9px] font-bold text-[#0070F3] leading-none mt-0.5">for a Healthier Tomorrow</span>
                </div>
                <Heart size={11} className="text-[#0070F3] ml-0.5 shrink-0" />
              </div>
            </div>

          </div>

          {/* Tablet 6 Support Cards (2 Columns Grid) */}
          <div className="grid grid-cols-2 gap-3.5 w-full">
            {renderSupportCards(false)}
          </div>

          {/* Tablet Compliance Badges */}
          <div className="flex flex-wrap items-center gap-2">
            {['HIPAA READY', 'NABH READY', 'GDPR READY', 'AES-256 ENCRYPTION'].map((badge) => (
              <span 
                key={badge}
                className="bg-white border border-blue-200/80 text-[#0070F3] px-3 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1.5 shadow-xs tracking-tight whitespace-nowrap"
              >
                <Check size={11} strokeWidth={3} className="text-[#0070F3] shrink-0" />
                <span>{badge}</span>
              </span>
            ))}
          </div>

          {/* Tablet Form Card (Full Width) */}
          <div className="w-full pt-2">
            {renderFormCard(false)}
          </div>

        </div>


        {/* =========================================================================
            3. SMALL / MOBILE LAYOUT (320px – 767px / block md:hidden):
            Single Vertical Flow matching Mobile Reference Image:
            Header -> Contact Badge -> Heading -> Description -> Doctor + Petals -> 2-Col Cards -> Badges -> Form -> Footer
            ========================================================================= */}
        <div className="flex md:hidden flex-col space-y-4 w-full">
          
          {/* Contact Support Badge */}
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-blue-200/90 text-[#0070F3] text-[10.5px] font-bold shadow-xs">
              <Headphones size={12} className="text-[#0070F3]" />
              <span>CONTACT SUPPORT</span>
            </div>
          </div>

          {/* Mobile Heading */}
          <h1 className="text-[28px] min-[375px]:text-[32px] sm:text-[36px] font-black text-[#0B1E3B] tracking-tight leading-[1.15]">
            Need Help? <br />
            We're Here <span className="text-[#0070F3]">24/7.</span>
          </h1>

          {/* Mobile Description */}
          <p className="text-slate-500 text-xs sm:text-[13px] leading-relaxed font-medium">
            Whether you're setting up your clinic, migrating data, onboarding doctors, configuring branches, or upgrading plans, our healthcare specialists are ready to assist you.
          </p>

          {/* Mobile Doctor Visual Container */}
          <div className="relative w-full max-w-[340px] mx-auto h-[220px] sm:h-[250px] flex items-center justify-center my-2 select-none">
            {/* Dot Matrix Pattern */}
            <div 
              className="absolute top-1 right-2 w-24 h-24 opacity-30 z-0"
              style={{
                backgroundImage: 'radial-gradient(#0070F3 1.5px, transparent 1.5px)',
                backgroundSize: '12px 12px'
              }}
            />
            {/* Abstract Blue Petals strictly behind Doctor */}
            <img 
              src={petalBackground} 
              alt="PEHAL Abstract Background"
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[240px] sm:w-[270px] max-w-[85vw] h-auto object-contain z-0 opacity-95 pointer-events-none"
            />
            {/* Doctor SVG */}
            <img 
              src={doctorImage} 
              alt="PEHAL Healthcare Support Specialist"
              className="relative z-10 w-[185px] sm:w-[220px] h-auto object-contain drop-shadow-[0_8px_20px_rgba(0,112,243,0.15)]"
            />
            {/* Floating Support Badge on lower-right */}
            <div className="absolute bottom-1 right-2 min-[375px]:right-4 bg-white/95 backdrop-blur-md rounded-xl p-2 border border-slate-100 shadow-[0_6px_20px_rgba(0,112,243,0.12)] flex items-center gap-1.5 z-20 pointer-events-auto">
              <div className="w-6 h-6 rounded-lg bg-blue-50 text-[#0070F3] flex items-center justify-center shrink-0">
                <Headphones size={12} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-[#0B1E3B] leading-none">Always Here</span>
                <span className="text-[8.5px] font-bold text-[#0070F3] leading-none mt-0.5">for a Healthier Tomorrow</span>
              </div>
              <Heart size={10} className="text-[#0070F3] ml-0.5 shrink-0" />
            </div>
          </div>

          {/* Mobile 6 Support Cards (2 Columns Grid) */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full pt-1">
            {renderSupportCards(true)}
          </div>

          {/* Mobile Compliance Badges */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {['HIPAA READY', 'NABH READY', 'GDPR READY', 'AES-256 ENCRYPTION'].map((badge) => (
              <span 
                key={badge}
                className="bg-white border border-blue-200/80 text-[#0070F3] px-2 py-0.5 rounded-full text-[8.5px] min-[375px]:text-[9px] font-extrabold flex items-center gap-1 shadow-xs tracking-tight whitespace-nowrap"
              >
                <Check size={10} strokeWidth={3} className="text-[#0070F3] shrink-0" />
                <span>{badge}</span>
              </span>
            ))}
          </div>

          {/* Mobile Form Card */}
          <div className="w-full pt-2">
            {renderFormCard(true)}
          </div>

        </div>

      </main>

      {/* 🛡️ Footer */}
      <footer className="w-full max-w-[1600px] 2xl:max-w-[1880px] mx-auto px-4 sm:px-6 lg:px-10 2xl:px-16 py-4 text-xs 2xl:text-sm text-slate-500 border-t border-slate-200/80 mt-4 relative z-20 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0 text-center sm:text-left">
        <div>
          © 2026 PEHAL Healthcare. All rights reserved. | Powered by AI
        </div>
        <div className="flex items-center justify-center gap-1.5 text-slate-600 font-medium">
          <span>Technology for a Healthier Tomorrow</span>
          <Heart size={14} className="text-[#0070F3] fill-[#0070F3]/20 shrink-0" />
        </div>
      </footer>

    </div>
  );

  // Helper: Render Support Cards
  function renderSupportCards(isMobile = false) {
    return (
      <>
        {/* Card 1: Live Support */}
        <div className={`bg-white rounded-2xl ${isMobile ? 'p-2.5 sm:p-3' : 'p-3 xl:p-3.5 2xl:p-4'} border border-slate-100 shadow-[0_3px_14px_rgba(0,112,243,0.06)] hover:shadow-md transition-shadow flex flex-col justify-between w-full`}>
          <div>
            <div className="flex items-center justify-between mb-1.5 2xl:mb-2">
              <div className={`${isMobile ? 'w-6 h-6' : 'w-7 h-7 2xl:w-8 2xl:h-8'} rounded-lg bg-blue-50 border border-blue-100/80 text-[#0070F3] flex items-center justify-center shadow-xs`}>
                <MessageCircle size={isMobile ? 12 : 14} />
              </div>
              <span className="bg-blue-50 border border-blue-200 text-blue-600 text-[7.5px] sm:text-[8px] 2xl:text-[9.5px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                ONLINE
              </span>
            </div>
            <h4 className={`${isMobile ? 'text-[11px] sm:text-xs' : 'text-xs xl:text-[13px] 2xl:text-[15px]'} font-black text-[#0B1E3B] leading-tight mb-0.5`}>
              Live Support
            </h4>
            <p className={`${isMobile ? 'text-[9.5px]' : 'text-[10.5px] xl:text-[11px] 2xl:text-[12.5px]'} text-slate-500 leading-tight font-medium`}>
              Average response under 5m
            </p>
          </div>
        </div>

        {/* Card 2: Email Support */}
        <div className={`bg-white rounded-2xl ${isMobile ? 'p-2.5 sm:p-3' : 'p-3 xl:p-3.5 2xl:p-4'} border border-slate-100 shadow-[0_3px_14px_rgba(0,112,243,0.06)] hover:shadow-md transition-shadow flex flex-col justify-between w-full`}>
          <div>
            <div className="flex items-center justify-between mb-1.5 2xl:mb-2">
              <div className={`${isMobile ? 'w-6 h-6' : 'w-7 h-7 2xl:w-8 2xl:h-8'} rounded-lg bg-blue-50 border border-blue-100/80 text-[#0070F3] flex items-center justify-center shadow-xs`}>
                <Mail size={isMobile ? 12 : 14} />
              </div>
              <span className="bg-blue-50 border border-blue-200 text-[#0070F3] text-[7.5px] sm:text-[8px] 2xl:text-[9.5px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                24/7 SUPPORT
              </span>
            </div>
            <h4 className={`${isMobile ? 'text-[11px] sm:text-xs' : 'text-xs xl:text-[13px] 2xl:text-[15px]'} font-black text-[#0B1E3B] leading-tight mb-0.5`}>
              Email Support
            </h4>
            <p className={`${isMobile ? 'text-[9.5px]' : 'text-[10.5px] xl:text-[11px] 2xl:text-[12.5px]'} text-slate-500 leading-tight font-medium break-all`}>
              pehalhealthcare@gmail.com
            </p>
          </div>
        </div>

        {/* Card 3: Sales Team */}
        <div className={`bg-white rounded-2xl ${isMobile ? 'p-2.5 sm:p-3' : 'p-3 xl:p-3.5 2xl:p-4'} border border-slate-100 shadow-[0_3px_14px_rgba(0,112,243,0.06)] hover:shadow-md transition-shadow flex flex-col justify-between w-full`}>
          <div>
            <div className="flex items-center justify-between mb-1.5 2xl:mb-2">
              <div className={`${isMobile ? 'w-6 h-6' : 'w-7 h-7 2xl:w-8 2xl:h-8'} rounded-lg bg-blue-50 border border-blue-100/80 text-[#0070F3] flex items-center justify-center shadow-xs`}>
                <Users size={isMobile ? 12 : 14} />
              </div>
              <span className="bg-blue-50 border border-blue-200 text-[#0070F3] text-[7.5px] sm:text-[8px] 2xl:text-[9.5px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                CUSTOM QUOTE
              </span>
            </div>
            <h4 className={`${isMobile ? 'text-[11px] sm:text-xs' : 'text-xs xl:text-[13px] 2xl:text-[15px]'} font-black text-[#0B1E3B] leading-tight mb-0.5`}>
              Sales Team
            </h4>
            <p className={`${isMobile ? 'text-[9.5px]' : 'text-[10.5px] xl:text-[11px] 2xl:text-[12.5px]'} text-slate-500 leading-tight font-medium`}>
              Get pricing & demo
            </p>
          </div>
        </div>

        {/* Card 4: Emergency Support */}
        <div className={`bg-white rounded-2xl ${isMobile ? 'p-2.5 sm:p-3' : 'p-3 xl:p-3.5 2xl:p-4'} border border-slate-100 shadow-[0_3px_14px_rgba(0,112,243,0.06)] hover:shadow-md transition-shadow flex flex-col justify-between w-full`}>
          <div>
            <div className="flex items-center justify-between mb-1.5 2xl:mb-2">
              <div className={`${isMobile ? 'w-6 h-6' : 'w-7 h-7 2xl:w-8 2xl:h-8'} rounded-lg bg-blue-50 border border-blue-100/80 text-[#0070F3] flex items-center justify-center shadow-xs`}>
                <Shield size={isMobile ? 12 : 14} />
              </div>
              <span className="bg-blue-50 border border-blue-200 text-[#0070F3] text-[7.5px] sm:text-[8px] 2xl:text-[9.5px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                TIER-1 HELP
              </span>
            </div>
            <h4 className={`${isMobile ? 'text-[11px] sm:text-xs' : 'text-xs xl:text-[13px] 2xl:text-[15px]'} font-black text-[#0B1E3B] leading-tight mb-0.5`}>
              Emergency Support
            </h4>
            <p className={`${isMobile ? 'text-[9.5px]' : 'text-[10.5px] xl:text-[11px] 2xl:text-[12.5px]'} text-slate-500 leading-tight font-medium`}>
              Immediate assistance
            </p>
          </div>
        </div>

        {/* Card 5: Phone Support */}
        <div className={`bg-white rounded-2xl ${isMobile ? 'p-2.5 sm:p-3' : 'p-3 xl:p-3.5 2xl:p-4'} border border-slate-100 shadow-[0_3px_14px_rgba(0,112,243,0.06)] hover:shadow-md transition-shadow flex flex-col justify-between w-full`}>
          <div>
            <div className={`${isMobile ? 'w-6 h-6' : 'w-7 h-7 2xl:w-8 2xl:h-8'} rounded-lg bg-blue-50 border border-blue-100/80 text-[#0070F3] flex items-center justify-center mb-1.5 2xl:mb-2 shadow-xs`}>
              <Phone size={14} />
            </div>
            <h4 className={`${isMobile ? 'text-[11px] sm:text-xs' : 'text-xs xl:text-[13px] 2xl:text-[15px]'} font-black text-[#0B1E3B] leading-tight mb-0.5`}>
              Phone Support
            </h4>
            <p className={`${isMobile ? 'text-[9.5px]' : 'text-[10.5px] xl:text-[11px] 2xl:text-[12.5px]'} text-slate-500 font-medium`}>
              +91 8130916134
            </p>
          </div>
        </div>

        {/* Card 6: Office Location */}
        <div className={`bg-white rounded-2xl ${isMobile ? 'p-2.5 sm:p-3' : 'p-3 xl:p-3.5 2xl:p-4'} border border-slate-100 shadow-[0_3px_14px_rgba(0,112,243,0.06)] hover:shadow-md transition-shadow flex flex-col justify-between w-full`}>
          <div>
            <div className={`${isMobile ? 'w-6 h-6' : 'w-7 h-7 2xl:w-8 2xl:h-8'} rounded-lg bg-blue-50 border border-blue-100/80 text-[#0070F3] flex items-center justify-center mb-1.5 2xl:mb-2 shadow-xs`}>
              <MapPin size={14} />
            </div>
            <h4 className={`${isMobile ? 'text-[11px] sm:text-xs' : 'text-xs xl:text-[13px] 2xl:text-[15px]'} font-black text-[#0B1E3B] leading-tight mb-0.5`}>
              Office Location
            </h4>
            <p className={`${isMobile ? 'text-[9px]' : 'text-[10.5px] xl:text-[11px] 2xl:text-[12.5px]'} text-slate-500 font-medium leading-tight`}>
              R4/142 2nd floor, Sector 4, Block 4, Raj Nagar, Ghaziabad 201002
            </p>
          </div>
        </div>
      </>
    );
  }

  // Helper: Render Support Form Card
  function renderFormCard(isMobile = false) {
    return (
      <div className={`bg-white rounded-2xl sm:rounded-3xl ${isMobile ? 'p-4 sm:p-6' : 'p-5 lg:p-6 xl:p-7 2xl:p-9'} border border-slate-100 shadow-[0_12px_44px_rgba(0,112,243,0.07)] relative w-full box-border`}>
        
        {/* Header: Icon + Title + Subtitle */}
        <div className="flex items-center gap-2.5 sm:gap-3 2xl:gap-4 mb-4 sm:mb-5 2xl:mb-6">
          <div className="w-9 h-9 sm:w-10 sm:h-10 2xl:w-12 2xl:h-12 rounded-xl sm:rounded-2xl bg-blue-50 border border-blue-100/80 text-[#0070F3] flex items-center justify-center shrink-0 shadow-xs">
            <Mail size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-xl xl:text-2xl 2xl:text-[28px] font-black text-[#0B1E3B] tracking-tight leading-tight truncate">
              Send us a Message
            </h2>
            <p className="text-[11px] sm:text-xs 2xl:text-sm text-slate-500 font-medium leading-snug">
              We will get back to you within one business hour.
            </p>
          </div>
        </div>

        {/* Success State View */}
        {status === 'success' && successInfo ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-8 sm:py-10 text-center space-y-4"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-blue-50 border-2 border-blue-400 text-blue-600 flex items-center justify-center mx-auto shadow-md shadow-blue-500/15">
              <CheckCircle2 size={30} />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] sm:text-[11px] 2xl:text-xs font-black uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full inline-block">
                MESSAGE SENT SUCCESSFULLY • {successInfo.ticketId}
              </span>
              <h3 className="text-xl sm:text-2xl 2xl:text-3xl font-black text-[#0B1E3B]">
                Message Sent Successfully
              </h3>
              <p className="text-xs sm:text-sm 2xl:text-base text-slate-600 max-w-md mx-auto leading-relaxed">
                Thank you for contacting PEHAL Healthcare. Your ticket for <strong className="text-slate-900">{successInfo.clinicName}</strong> has been assigned to priority support queue ({successInfo.estimatedResponse}).
              </p>
              <p className="text-xs 2xl:text-sm text-slate-500 pt-1">
                You'll receive a confirmation email with the ticket details.
              </p>
            </div>

            <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#0070F3] hover:bg-[#005FE0] text-white font-bold text-xs sm:text-sm 2xl:text-base transition shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer min-h-[44px] 2xl:min-h-[48px]"
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
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm 2xl:text-base transition cursor-pointer min-h-[44px] 2xl:min-h-[48px]"
              >
                <span>Send Another Message</span>
              </button>
            </div>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-3.5 2xl:space-y-4 w-full">
            
            {/* ── ROW 1: FIRST NAME + LAST NAME (2 cols on 375px+) ── */}
            <div className="grid grid-cols-1 min-[375px]:grid-cols-2 gap-2.5 sm:gap-3 2xl:gap-4">
              {/* First Name */}
              <div className="w-full">
                <label className="block text-[10.5px] sm:text-[11px] 2xl:text-xs font-bold text-[#0B1E3B] uppercase tracking-wider mb-1">
                  FIRST NAME <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Enter first name"
                    className={`w-full bg-slate-50/70 border rounded-xl pl-9 pr-3.5 py-2 sm:py-2.5 2xl:py-3 min-h-[42px] sm:min-h-[44px] 2xl:min-h-[50px] text-xs 2xl:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0070F3]/30 font-medium transition ${
                      errors.firstName ? 'border-red-400 bg-red-50/30' : 'border-slate-200 focus:border-blue-300'
                    }`}
                  />
                </div>
                {errors.firstName && <p className="text-[10px] 2xl:text-xs text-red-500 mt-1 font-bold">{errors.firstName}</p>}
              </div>

              {/* Last Name */}
              <div className="w-full">
                <label className="block text-[10.5px] sm:text-[11px] 2xl:text-xs font-bold text-[#0B1E3B] uppercase tracking-wider mb-1">
                  LAST NAME <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Enter last name"
                    className={`w-full bg-slate-50/70 border rounded-xl pl-9 pr-3.5 py-2 sm:py-2.5 2xl:py-3 min-h-[42px] sm:min-h-[44px] 2xl:min-h-[50px] text-xs 2xl:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0070F3]/30 font-medium transition ${
                      errors.lastName ? 'border-red-400 bg-red-50/30' : 'border-slate-200 focus:border-blue-300'
                    }`}
                  />
                </div>
                {errors.lastName && <p className="text-[10px] 2xl:text-xs text-red-500 mt-1 font-bold">{errors.lastName}</p>}
              </div>
            </div>

            {/* ── ROW 2: EMAIL ADDRESS + PHONE NUMBER (2 cols on 375px+) ── */}
            <div className="grid grid-cols-1 min-[375px]:grid-cols-2 gap-2.5 sm:gap-3 2xl:gap-4">
              {/* Email Address */}
              <div className="w-full">
                <label className="block text-[10.5px] sm:text-[11px] 2xl:text-xs font-bold text-[#0B1E3B] uppercase tracking-wider mb-1">
                  EMAIL ADDRESS <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    className={`w-full bg-slate-50/70 border rounded-xl pl-9 pr-3.5 py-2 sm:py-2.5 2xl:py-3 min-h-[42px] sm:min-h-[44px] 2xl:min-h-[50px] text-xs 2xl:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0070F3]/30 font-medium transition ${
                      errors.email ? 'border-red-400 bg-red-50/30' : 'border-slate-200 focus:border-blue-300'
                    }`}
                  />
                </div>
                {errors.email && <p className="text-[10px] 2xl:text-xs text-red-500 mt-1 font-bold">{errors.email}</p>}
              </div>

              {/* Phone Number */}
              <div className="w-full">
                <label className="block text-[10.5px] sm:text-[11px] 2xl:text-xs font-bold text-[#0B1E3B] uppercase tracking-wider mb-1">
                  PHONE NUMBER <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Enter phone number"
                    className={`w-full bg-slate-50/70 border rounded-xl pl-9 pr-3.5 py-2 sm:py-2.5 2xl:py-3 min-h-[42px] sm:min-h-[44px] 2xl:min-h-[50px] text-xs 2xl:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0070F3]/30 font-medium transition ${
                      errors.phone ? 'border-red-400 bg-red-50/30' : 'border-slate-200 focus:border-blue-300'
                    }`}
                  />
                </div>
                {errors.phone && <p className="text-[10px] 2xl:text-xs text-red-500 mt-1 font-bold">{errors.phone}</p>}
              </div>
            </div>

            {/* ── ROW 3: CLINIC / HOSPITAL NAME (FULL WIDTH) ── */}
            <div className="w-full">
              <label className="block text-[10.5px] sm:text-[11px] 2xl:text-xs font-bold text-[#0B1E3B] uppercase tracking-wider mb-1">
                CLINIC / HOSPITAL NAME <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Building2 size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  name="clinicName"
                  value={formData.clinicName}
                  onChange={handleChange}
                  placeholder="Enter your clinic or hospital name"
                  className={`w-full bg-slate-50/70 border rounded-xl pl-9 pr-3.5 py-2 sm:py-2.5 2xl:py-3 min-h-[42px] sm:min-h-[44px] 2xl:min-h-[50px] text-xs 2xl:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0070F3]/30 font-medium transition ${
                    errors.clinicName ? 'border-red-400 bg-red-50/30' : 'border-slate-200 focus:border-blue-300'
                  }`}
                />
              </div>
              {errors.clinicName && <p className="text-[10px] 2xl:text-xs text-red-500 mt-1 font-bold">{errors.clinicName}</p>}
            </div>

            {/* ── ROW 4: PRIORITY + SUBJECT (2 cols on 375px+) ── */}
            <div className="grid grid-cols-1 min-[375px]:grid-cols-2 gap-2.5 sm:gap-3 2xl:gap-4">
              {/* Priority Dropdown */}
              <div className="w-full">
                <label className="block text-[10.5px] sm:text-[11px] 2xl:text-xs font-bold text-[#0B1E3B] uppercase tracking-wider mb-1">
                  PRIORITY <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Flag size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    className="w-full bg-slate-50/70 border border-slate-200 rounded-xl pl-9 pr-8 py-2 sm:py-2.5 2xl:py-3 min-h-[42px] sm:min-h-[44px] 2xl:min-h-[50px] text-xs 2xl:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0070F3]/30 focus:border-blue-300 appearance-none font-medium cursor-pointer"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Subject */}
              <div className="w-full">
                <label className="block text-[10.5px] sm:text-[11px] 2xl:text-xs font-bold text-[#0B1E3B] uppercase tracking-wider mb-1">
                  SUBJECT <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FileText size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="Enter subject"
                    className={`w-full bg-slate-50/70 border rounded-xl pl-9 pr-3.5 py-2 sm:py-2.5 2xl:py-3 min-h-[42px] sm:min-h-[44px] 2xl:min-h-[50px] text-xs 2xl:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0070F3]/30 font-medium transition ${
                      errors.subject ? 'border-red-400 bg-red-50/30' : 'border-slate-200 focus:border-blue-300'
                    }`}
                  />
                </div>
                {errors.subject && <p className="text-[10px] 2xl:text-xs text-red-500 mt-1 font-bold">{errors.subject}</p>}
              </div>
            </div>

            {/* ── ROW 5: MESSAGE (TEXTAREA) ── */}
            <div className="w-full">
              <label className="block text-[10.5px] sm:text-[11px] 2xl:text-xs font-bold text-[#0B1E3B] uppercase tracking-wider mb-1">
                MESSAGE <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MessageSquare size={14} className="absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
                <textarea
                  name="message"
                  rows={3}
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Tell us about your requirement..."
                  className={`w-full bg-slate-50/70 border rounded-xl pl-9 pr-3.5 py-2.5 text-xs 2xl:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0070F3]/30 font-medium resize-y min-h-[85px] sm:min-h-[95px] 2xl:min-h-[120px] transition ${
                    errors.message ? 'border-red-400 bg-red-50/30' : 'border-slate-200 focus:border-blue-300'
                  }`}
                />
              </div>
              {errors.message && <p className="text-[10px] 2xl:text-xs text-red-500 mt-1 font-bold">{errors.message}</p>}
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs 2xl:text-sm flex items-center gap-2">
                <AlertCircle size={15} className="text-red-500 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Privacy & Terms Checkbox */}
            <div className="pt-0.5">
              <label className="flex items-start gap-2 cursor-pointer select-none text-[11px] sm:text-xs 2xl:text-sm text-slate-600 font-medium">
                <input
                  type="checkbox"
                  name="agree"
                  checked={formData.agree}
                  onChange={handleChange}
                  className="w-4 h-4 2xl:w-5 2xl:h-5 rounded border-slate-300 text-[#0070F3] focus:ring-[#0070F3]/40 cursor-pointer mt-0.5 shrink-0"
                />
                <span className="leading-snug">
                  I agree to the <Link to="/" className="text-[#0070F3] hover:underline font-semibold">Privacy Policy</Link> and <Link to="/" className="text-[#0070F3] hover:underline font-semibold">Terms of Service</Link>.
                </span>
              </label>
              {errors.agree && <p className="text-[10px] 2xl:text-xs text-red-500 mt-1 font-bold">{errors.agree}</p>}
            </div>

            {/* ── SEND MESSAGE BUTTON ── */}
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full py-3 sm:py-3.5 2xl:py-4 px-6 rounded-xl sm:rounded-2xl bg-[#0070F3] hover:bg-[#005FE0] text-white font-black text-xs sm:text-sm 2xl:text-base uppercase tracking-wider transition-all duration-200 shadow-md shadow-blue-600/25 hover:shadow-lg hover:shadow-blue-600/35 hover:-translate-y-0.5 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 min-h-[46px] sm:min-h-[48px] 2xl:min-h-[54px]"
            >
              <Send size={15} />
              <span>{status === 'loading' ? 'SENDING...' : 'SEND MESSAGE'}</span>
              <span>→</span>
            </button>

          </form>
        )}

      </div>
    );
  }
}
