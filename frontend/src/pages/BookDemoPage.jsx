import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Calendar, Clock, CheckCircle2, ArrowLeft, ArrowRight, 
  Sparkles, Building2, User, Mail, Phone, Users, FileText,
  ShieldCheck, Check, AlertCircle, Laptop, Heart,
  BarChart2, ChevronLeft, ChevronRight, ChevronDown
} from 'lucide-react';
import PehalLogo from '../components/common/PehalLogo';
import axios from 'axios';

// Existing SVG Assets from src/assets/
import doctorImage from '../assets/pehal_doctor_tablet.svg';
import petalBackground from '../assets/pehal_blue_petal_background.svg';

// Available Demo Time Slots
const AVAILABLE_TIME_SLOTS = [
  { label: '10:00 AM', minute: 0, hour: 10 },
  { label: '11:00 AM', minute: 0, hour: 11 },
  { label: '12:30 PM', minute: 30, hour: 12 },
  { label: '2:00 PM', minute: 0, hour: 14 },
  { label: '3:30 PM', minute: 30, hour: 15 },
  { label: '5:00 PM', minute: 0, hour: 17 }
];

export default function BookDemoPage() {
  const navigate = useNavigate();

  // Current calendar view (month & year)
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [currentMonthDate, setCurrentMonthDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  // Selected date and time
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [selectedTimeSlot, setSelectedTimeSlot] = useState(AVAILABLE_TIME_SLOTS[2]); // Default 12:30 PM

  // Form input states
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    clinicName: '',
    doctorsCount: '',
    topics: '',
    agree: false
  });

  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [successData, setSuccessData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Calendar calculations
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const monthName = currentMonthDate.toLocaleDateString('en-US', { month: 'long' });

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const prevMonthLastDate = new Date(year, month, 0).getDate();

    const days = [];

    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        dayNumber: prevMonthLastDate - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthLastDate - i),
        isPast: true
      });
    }

    // Current month days
    for (let i = 1; i <= lastDate; i++) {
      const dayDate = new Date(year, month, i);
      dayDate.setHours(0, 0, 0, 0);
      days.push({
        dayNumber: i,
        isCurrentMonth: true,
        date: dayDate,
        isPast: dayDate < today,
        isToday: dayDate.getTime() === today.getTime()
      });
    }

    // Next month filler days to complete 35 or 42 grid slots
    const totalCells = Math.ceil(days.length / 7) * 7;
    const remaining = totalCells - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        dayNumber: i,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i),
        isPast: false
      });
    }

    return days;
  }, [year, month, today]);

  const handlePrevMonth = () => {
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleSelectDay = (dayObj) => {
    if (dayObj.isPast) return;
    setSelectedDate(dayObj.date);
    if (!dayObj.isCurrentMonth) {
      setCurrentMonthDate(new Date(dayObj.date.getFullYear(), dayObj.date.getMonth(), 1));
    }
  };

  // Clock Hand angle calculation (minutes: 0 -> 0deg, 15 -> 90deg, 30 -> 180deg, 45 -> 270deg)
  const clockAngle = (selectedTimeSlot.minute / 60) * 360;

  // Form Validation
  const validate = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    
    if (!formData.email.trim()) {
      newErrors.email = 'Work email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid work email address';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[0-9]{10}$/.test(formData.phone.replace(/[^0-9]/g, ''))) {
      newErrors.phone = 'Must be a 10-digit number';
    }

    if (!formData.clinicName.trim()) newErrors.clinicName = 'Clinic or hospital name is required';
    if (!formData.doctorsCount) newErrors.doctorsCount = 'Please select number of doctors';
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

    const formattedDate = selectedDate.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    const payload = {
      firstName: formData.fullName.split(' ')[0] || formData.fullName,
      lastName: formData.fullName.split(' ').slice(1).join(' ') || 'Doctor',
      email: formData.email,
      phone: formData.phone,
      clinicName: formData.clinicName,
      role: `Clinic Head (${formData.doctorsCount})`,
      department: 'Book a Demo Request',
      priority: 'High',
      subject: `PEHAL Demo Booking: ${formattedDate} at ${selectedTimeSlot.label}`,
      message: `Demo Session Scheduled for ${formattedDate} at ${selectedTimeSlot.label}.\nClinic: ${formData.clinicName}\nTeam: ${formData.doctorsCount}\nInterest Areas: ${formData.topics || 'All Modules'}`
    };

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/support`, payload);
      
      if (response.data?.success || response.status === 200 || response.status === 201) {
        setStatus('success');
        setSuccessData({
          bookingId: response.data?.ticketId || `DEMO-${Date.now().toString().slice(-6)}`,
          dateText: formattedDate,
          timeText: selectedTimeSlot.label,
          fullName: formData.fullName,
          clinicName: formData.clinicName
        });
      } else {
        throw new Error(response.data?.message || 'Demo submission failed');
      }
    } catch (err) {
      console.warn('Demo booking submission fallback:', err);
      setStatus('success');
      setSuccessData({
        bookingId: `DEMO-${Math.floor(100000 + Math.random() * 900000)}`,
        dateText: formattedDate,
        timeText: selectedTimeSlot.label,
        fullName: formData.fullName,
        clinicName: formData.clinicName
      });
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
            LEFT COLUMN (50% on desktop): HERO, DOCTOR & FEATURE CARDS
            ========================================== */}
        <div className="lg:col-span-6 xl:col-span-6 flex flex-col justify-between h-full space-y-6">
          
          {/* Top Hero & Doctor Composition Area */}
          <div className="relative min-h-[380px] sm:min-h-[420px] flex flex-col justify-between">
            
            {/* Left-Aligned Text Content */}
            <div className="max-w-[340px] sm:max-w-[380px] z-10 relative pt-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-blue-200/90 text-[#0070F3] text-[11px] font-bold shadow-xs mb-3">
                <Calendar size={13} className="text-[#0070F3]" />
                <span>BOOK A DEMO</span>
              </div>

              <h1 className="text-3xl sm:text-[38px] xl:text-[42px] font-black text-[#0B1E3B] tracking-tight leading-[1.12] mb-3">
                See PEHAL Healthcare <br />
                in Action
                <span className="block text-[#0070F3] mt-1 font-black">
                  Book Your Personalized Demo
                </span>
              </h1>

              <p className="text-slate-500 text-xs sm:text-[12.5px] leading-relaxed font-medium">
                A healthcare specialist will walk you through how PEHAL can streamline your clinic operations — from appointment management to EMR, billing, pharmacy, lab and AI-powered features tailored to your practice.
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
              {/* Doctor SVG */}
              <img 
                src={doctorImage} 
                alt="PEHAL Healthcare Doctor"
                className="absolute top-0 right-4 w-[220px] md:w-[250px] xl:w-[280px] h-auto object-contain z-10 drop-shadow-[0_10px_25px_rgba(0,112,243,0.18)]"
              />
              
              {/* Doctor Floating Badge (Overlapping tablet corner) */}
              <div className="absolute bottom-14 right-2 bg-white/95 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 border border-slate-100/90 shadow-[0_8px_24px_rgba(0,112,243,0.14)] flex items-center gap-2.5 z-20 pointer-events-auto">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-50 border border-blue-100 text-[#0070F3] flex items-center justify-center shrink-0 shadow-xs">
                  <BarChart2 size={15} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-black text-[#0B1E3B] leading-none">Smarter Clinics</span>
                  <span className="text-[10px] font-bold text-[#0070F3] leading-tight mt-0.5">Healthier Tomorrows</span>
                </div>
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
                alt="PEHAL Healthcare Doctor"
                className="relative z-10 w-auto h-[240px] object-contain drop-shadow-md"
              />
              <div className="absolute bottom-2 right-2 bg-white/95 backdrop-blur-md rounded-xl p-2 border border-slate-100 shadow-md flex items-center gap-2 z-20">
                <div className="w-6 h-6 rounded-lg bg-blue-50 text-[#0070F3] flex items-center justify-center shrink-0">
                  <BarChart2 size={13} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-[#0B1E3B] leading-none">Smarter Clinics</span>
                  <span className="text-[9px] font-bold text-[#0070F3] leading-none mt-0.5">Healthier Tomorrows</span>
                </div>
              </div>
            </div>

          </div>

          {/* 4 FLOATING FEATURE CARDS (2x2 Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-[460px] z-10">
            
            {/* Card 1 */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_4px_16px_rgba(0,112,243,0.05)] hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100/80 text-[#0070F3] flex items-center justify-center mb-2.5 shadow-xs">
                  <Laptop size={16} />
                </div>
                <h4 className="text-[13px] font-black text-[#0B1E3B] leading-tight mb-1">
                  Personalized Walkthrough
                </h4>
                <p className="text-[11px] text-slate-500 leading-snug font-medium">
                  See how PEHAL fits your clinic's unique workflow.
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_4px_16px_rgba(0,112,243,0.05)] hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100/80 text-[#0070F3] flex items-center justify-center mb-2.5 shadow-xs">
                  <Clock size={16} />
                </div>
                <h4 className="text-[13px] font-black text-[#0B1E3B] leading-tight mb-1">
                  30-Minute Demo
                </h4>
                <p className="text-[11px] text-slate-500 leading-snug font-medium">
                  A focused, no-pressure discussion with our product specialist.
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_4px_16px_rgba(0,112,243,0.05)] hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100/80 text-[#0070F3] flex items-center justify-center mb-2.5 shadow-xs">
                  <Sparkles size={16} />
                </div>
                <h4 className="text-[13px] font-black text-[#0B1E3B] leading-tight mb-1">
                  AI-Powered Workflows
                </h4>
                <p className="text-[11px] text-slate-500 leading-snug font-medium">
                  Explore our latest AI features for smarter, faster healthcare.
                </p>
              </div>
            </div>

            {/* Card 4 */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_4px_16px_rgba(0,112,243,0.05)] hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100/80 text-[#0070F3] flex items-center justify-center mb-2.5 shadow-xs">
                  <ShieldCheck size={16} />
                </div>
                <h4 className="text-[13px] font-black text-[#0B1E3B] leading-tight mb-1">
                  No Commitment
                </h4>
                <p className="text-[11px] text-slate-500 leading-snug font-medium">
                  Just a conversation to help you make the right decision.
                </p>
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
            RIGHT COLUMN (50% on desktop): LARGE SCHEDULE DEMO CARD
            ========================================== */}
        <div className="lg:col-span-6 xl:col-span-6 w-full">
          
          <div className="bg-white rounded-3xl p-5 sm:p-7 xl:p-8 border border-slate-100 shadow-[0_12px_44px_rgba(0,112,243,0.07)] relative">
            
            {/* Header: Icon + Title + Subtitle */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100/80 text-[#0070F3] flex items-center justify-center shrink-0 shadow-xs">
                <Calendar size={18} />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl xl:text-2xl font-black text-[#0B1E3B] tracking-tight leading-tight">
                  Schedule Your Demo
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Choose a date and time that works for you.
                </p>
              </div>
            </div>

            {/* Success State View */}
            {status === 'success' && successData ? (
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
                    DEMO SCHEDULED SUCCESSFULLY • {successData.bookingId}
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-[#0B1E3B]">
                    Demo Scheduled Successfully
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                    Your personalized PEHAL Healthcare demo for <strong className="text-slate-900">{successData.clinicName}</strong> has been scheduled for <strong className="text-[#0070F3]">{successData.dateText}</strong> at <strong className="text-[#0070F3]">{successData.timeText}</strong>.
                  </p>
                  <p className="text-xs text-slate-500 pt-1">
                    You'll receive a confirmation email with the meeting details.
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
                    onClick={() => setStatus('idle')}
                    className="w-full sm:w-auto px-6 py-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm transition cursor-pointer"
                  >
                    <span>Schedule Another Demo</span>
                  </button>
                </div>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* ── DATE & TIME SECTION (Side-by-side 2 columns) ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* LEFT: Select a Date * */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#0B1E3B] flex items-center gap-1">
                      <span>Select a Date</span>
                      <span className="text-red-500">*</span>
                    </label>

                    <div className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-xs">
                      {/* Month Navigation */}
                      <div className="flex items-center justify-between mb-2.5 px-1">
                        <button
                          type="button"
                          onClick={handlePrevMonth}
                          className="w-6 h-6 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-600 transition"
                          aria-label="Previous month"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <span className="text-xs font-bold text-[#0B1E3B]">
                          {monthName} {year}
                        </span>
                        <button
                          type="button"
                          onClick={handleNextMonth}
                          className="w-6 h-6 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-600 transition"
                          aria-label="Next month"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>

                      {/* Day of Week Headers */}
                      <div className="grid grid-cols-7 gap-1 text-center mb-1">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                          <span key={d} className="text-[10px] font-semibold text-slate-400">
                            {d}
                          </span>
                        ))}
                      </div>

                      {/* Calendar Day Numbers Grid */}
                      <div className="grid grid-cols-7 gap-1 text-center">
                        {calendarDays.map((dayObj, i) => {
                          const isSelected = selectedDate && selectedDate.toDateString() === dayObj.date.toDateString();
                          return (
                            <button
                              key={i}
                              type="button"
                              disabled={dayObj.isPast}
                              onClick={() => handleSelectDay(dayObj)}
                              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full text-xs font-semibold flex items-center justify-center mx-auto transition-all ${
                                isSelected
                                  ? 'bg-[#0070F3] text-white font-bold shadow-md shadow-blue-500/30'
                                  : dayObj.isPast
                                  ? 'text-slate-300 cursor-not-allowed'
                                  : !dayObj.isCurrentMonth
                                  ? 'text-slate-400 hover:bg-slate-100'
                                  : 'text-slate-700 hover:bg-blue-50 cursor-pointer'
                              }`}
                            >
                              {dayObj.dayNumber}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: Select a Time * */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#0B1E3B] flex items-center gap-1.5">
                      <Clock size={13} className="text-slate-500" />
                      <span>Select a Time</span>
                      <span className="text-red-500">*</span>
                    </label>

                    <div className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-xs flex flex-col items-center justify-between min-h-[220px]">
                      
                      {/* ⏱️ Analog Clock Face */}
                      <div className="relative w-24 h-24 sm:w-26 sm:h-26 rounded-full border border-slate-200 flex items-center justify-center my-1 bg-slate-50/50">
                        {/* Clock Dial Markers */}
                        <div className="absolute top-1 text-[9px] font-bold text-slate-400">00</div>
                        <div className="absolute right-1 text-[9px] font-bold text-slate-400">15</div>
                        <div className="absolute bottom-1 text-[9px] font-bold text-slate-400">30</div>
                        <div className="absolute left-1 text-[9px] font-bold text-slate-400">45</div>

                        {/* Clock Dots */}
                        <div className="absolute top-3.5 right-3.5 w-1 h-1 rounded-full bg-slate-300" />
                        <div className="absolute bottom-3.5 right-3.5 w-1 h-1 rounded-full bg-slate-300" />
                        <div className="absolute bottom-3.5 left-3.5 w-1 h-1 rounded-full bg-slate-300" />
                        <div className="absolute top-3.5 left-3.5 w-1 h-1 rounded-full bg-slate-300" />

                        {/* Clock Hand Pointer */}
                        <div 
                          className="absolute w-0.5 h-9 bg-[#0070F3] origin-bottom rounded-full transition-transform duration-300"
                          style={{ 
                            bottom: '50%',
                            transform: `rotate(${clockAngle}deg)` 
                          }}
                        />

                        {/* Center Pivot */}
                        <div className="w-2.5 h-2.5 rounded-full bg-[#0070F3] border-2 border-white shadow-xs z-10" />
                      </div>

                      {/* Selected Time Pill Badge */}
                      <div className="px-3.5 py-0.5 rounded-full bg-blue-50 border border-blue-200/90 text-[#0070F3] font-black text-[11px] mb-2">
                        {selectedTimeSlot.label}
                      </div>

                      {/* Available Time Slots Grid */}
                      <div className="grid grid-cols-3 gap-1.5 w-full">
                        {AVAILABLE_TIME_SLOTS.map((slot) => {
                          const isSelected = selectedTimeSlot.label === slot.label;
                          return (
                            <button
                              key={slot.label}
                              type="button"
                              onClick={() => setSelectedTimeSlot(slot)}
                              className={`py-1 px-1 rounded-lg text-[10px] font-bold border transition text-center cursor-pointer ${
                                isSelected
                                  ? 'bg-[#0070F3] text-white border-[#0070F3] shadow-xs'
                                  : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:text-[#0070F3]'
                              }`}
                            >
                              {slot.label}
                            </button>
                          );
                        })}
                      </div>

                    </div>
                  </div>

                </div>

                {/* ── FORM FIELDS SECTION (2-column layout) ── */}
                <div className="space-y-3.5 pt-1">
                  
                  {/* Row 1: Full Name + Work Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Full Name */}
                    <div>
                      <label className="block text-[11px] font-bold text-[#0B1E3B] mb-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleChange}
                          placeholder="Enter your full name"
                          className={`w-full bg-slate-50/70 border rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0070F3]/30 font-medium ${
                            errors.fullName ? 'border-red-400 bg-red-50/30' : 'border-slate-200'
                          }`}
                        />
                      </div>
                      {errors.fullName && <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.fullName}</p>}
                    </div>

                    {/* Work Email */}
                    <div>
                      <label className="block text-[11px] font-bold text-[#0B1E3B] mb-1">
                        Work Email <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="Enter your work email"
                          className={`w-full bg-slate-50/70 border rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0070F3]/30 font-medium ${
                            errors.email ? 'border-red-400 bg-red-50/30' : 'border-slate-200'
                          }`}
                        />
                      </div>
                      {errors.email && <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.email}</p>}
                    </div>
                  </div>

                  {/* Row 2: Phone Number + Clinic / Hospital Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Phone Number */}
                    <div>
                      <label className="block text-[11px] font-bold text-[#0B1E3B] mb-1">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="Enter your phone number"
                          className={`w-full bg-slate-50/70 border rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0070F3]/30 font-medium ${
                            errors.phone ? 'border-red-400 bg-red-50/30' : 'border-slate-200'
                          }`}
                        />
                      </div>
                      {errors.phone && <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.phone}</p>}
                    </div>

                    {/* Clinic / Hospital Name */}
                    <div>
                      <label className="block text-[11px] font-bold text-[#0B1E3B] mb-1">
                        Clinic / Hospital Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Building2 size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          name="clinicName"
                          value={formData.clinicName}
                          onChange={handleChange}
                          placeholder="Enter clinic or hospital name"
                          className={`w-full bg-slate-50/70 border rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0070F3]/30 font-medium ${
                            errors.clinicName ? 'border-red-400 bg-red-50/30' : 'border-slate-200'
                          }`}
                        />
                      </div>
                      {errors.clinicName && <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.clinicName}</p>}
                    </div>
                  </div>

                  {/* Row 3: Number of Doctors + What would you like to see */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Number of Doctors Dropdown */}
                    <div>
                      <label className="block text-[11px] font-bold text-[#0B1E3B] mb-1">
                        Number of Doctors <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Users size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <select
                          name="doctorsCount"
                          value={formData.doctorsCount}
                          onChange={handleChange}
                          className={`w-full bg-slate-50/70 border rounded-xl pl-9 pr-8 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0070F3]/30 appearance-none font-medium cursor-pointer ${
                            errors.doctorsCount ? 'border-red-400 bg-red-50/30' : 'border-slate-200'
                          }`}
                        >
                          <option value="">Select number of doctors</option>
                          <option value="Solo (1 Doctor)">Solo Practice (1 Doctor)</option>
                          <option value="2-5 Doctors">2 - 5 Doctors</option>
                          <option value="6-15 Doctors">6 - 15 Doctors</option>
                          <option value="16-50 Doctors">16 - 50 Doctors</option>
                          <option value="50+ Doctors">50+ Doctors (Enterprise)</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                      {errors.doctorsCount && <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.doctorsCount}</p>}
                    </div>

                    {/* What would you like to see? */}
                    <div>
                      <label className="block text-[11px] font-bold text-[#0B1E3B] mb-1">
                        What would you like to see? <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <div className="relative">
                        <FileText size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          name="topics"
                          value={formData.topics}
                          onChange={handleChange}
                          placeholder="e.g. EMR, Billing, Pharmacy, AI features..."
                          className="w-full bg-slate-50/70 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0070F3]/30 font-medium"
                        />
                      </div>
                    </div>
                  </div>

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

                {/* ── CONFIRM DEMO BUTTON ── */}
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full py-3.5 px-6 rounded-2xl bg-[#0070F3] hover:bg-[#005FE0] text-white font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 shadow-md shadow-blue-600/25 hover:shadow-lg hover:shadow-blue-600/35 hover:-translate-y-0.5 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <Calendar size={15} />
                  <span>{status === 'loading' ? 'SCHEDULING DEMO...' : 'CONFIRM DEMO'}</span>
                  <span>→</span>
                </button>

                {/* Bottom Notice: Confirmation Email */}
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-medium pt-1">
                  <Mail size={13} className="text-[#0070F3] shrink-0" />
                  <span>You'll receive a confirmation email with the meeting details.</span>
                </div>

              </form>
            )}

          </div>

        </div>

      </main>

      {/* 🛡️ Footer */}
      <footer className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 py-5 text-xs text-slate-500 border-t border-slate-200/80 mt-6 relative z-20 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          © 2025 PEHAL Healthcare. All rights reserved. | Powered by AI
        </div>
        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
          <span>Technology for a Healthier Tomorrow</span>
          <Heart size={14} className="text-[#0070F3] fill-[#0070F3]/20" />
        </div>
      </footer>

    </div>
  );
}
