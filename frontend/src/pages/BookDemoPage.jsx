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
import doctorImage from '../assets/pehal_doctor_headset.svg';
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

    // Next month filler days to complete grid
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

  // Clock Hand angles
  const minuteAngle = (selectedTimeSlot.minute / 60) * 360;
  const hourAngle = ((selectedTimeSlot.hour % 12) + selectedTimeSlot.minute / 60) * 30;

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
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      clinicName: formData.clinicName.trim(),
      doctorsCount: formData.doctorsCount,
      selectedDate: formattedDate,
      selectedTime: selectedTimeSlot.label,
      topics: formData.topics.trim(),
      agree: formData.agree
    };

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '/api/v1';
      const response = await axios.post(`${apiBase}/support/demo`, payload);
      
      if (response.data?.success) {
        setStatus('success');
        setSuccessData({
          bookingId: response.data.ticketId || `DEMO-${Date.now().toString().slice(-6)}`,
          dateText: formattedDate,
          timeText: selectedTimeSlot.label,
          fullName: formData.fullName,
          clinicName: formData.clinicName
        });
      } else {
        throw new Error(response.data?.message || 'Demo scheduling failed');
      }
    } catch (err) {
      console.error('Demo booking error:', err);
      setStatus('error');
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to schedule demo. Please check your connection and try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5F9FF] via-[#EBF3FE] to-[#F0F6FF] text-slate-800 font-sans antialiased overflow-x-hidden selection:bg-[#0070F3] selection:text-white flex flex-col justify-between w-full box-border">
      
      {/* 🧭 Top Navigation Header */}
      <header className="w-full max-w-[1600px] 2xl:max-w-[1880px] mx-auto px-3.5 min-[390px]:px-4 sm:px-6 lg:px-10 2xl:px-16 py-3 min-[390px]:py-3.5 sm:py-5 flex items-center justify-between relative z-30 shrink-0 box-border">
        <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity min-w-0">
          <PehalLogo variant="primary" height={36} className="h-7 min-[375px]:h-8 sm:h-9 2xl:h-11 w-auto shrink-0" />
        </Link>
        <button 
          type="button"
          onClick={() => navigate('/')} 
          className="flex items-center gap-1.5 sm:gap-2 text-[10px] min-[375px]:text-[11px] sm:text-xs 2xl:text-sm font-bold uppercase tracking-wider text-slate-700 hover:text-[#0070F3] transition-all cursor-pointer bg-white hover:bg-blue-50/80 border border-slate-200/90 hover:border-blue-300 px-2.5 min-[375px]:px-3.5 sm:px-4 2xl:px-6 py-1.5 sm:py-2.5 2xl:py-3 rounded-full shadow-xs shrink-0 whitespace-nowrap min-h-[36px] sm:min-h-[42px] 2xl:min-h-[48px]"
        >
          <ArrowLeft size={13} className="shrink-0" /> <span>BACK TO HOME</span>
        </button>
      </header>

      {/* 🏢 Main Content Container */}
      <main className="max-w-[1600px] 2xl:max-w-[1880px] mx-auto px-3 min-[390px]:px-4 sm:px-6 lg:px-10 2xl:px-16 py-2 sm:py-4 flex-grow w-full flex flex-col justify-center box-border">
        
        {/* =========================================================================
            1. LARGE / DESKTOP LAYOUT (1280px+ / xl:grid xl:grid-cols-12):
            Matches Desktop Composition:
            - Left 50% Column: Hero text on left, Doctor visual on right, 4 feature cards in 2x2 grid below, Compliance badges
            - Right 50% Column: Full Schedule Demo Card (Calendar + Clock + Form)
            ========================================================================= */}
        <div className="hidden xl:grid xl:grid-cols-12 gap-8 2xl:gap-14 items-start w-full relative">
          
          {/* Left Column (50% on desktop: Hero Text + Doctor Visual + 4 Feature Cards + Badges) */}
          <div className="xl:col-span-6 2xl:col-span-6 flex flex-col justify-between space-y-4 xl:space-y-5 2xl:space-y-6">
            
            {/* Top Hero Composition: Left Text + Right Doctor — side-by-side flex row */}
            <div className="relative flex flex-row items-start gap-0 w-full">
              
              {/* Left-Aligned Text — takes its own width, no absolute positioning */}
              <div className="flex-1 min-w-0 z-10 pt-1 pr-4">
                <div className="inline-flex items-center gap-2 px-3 2xl:px-4 py-1 2xl:py-1.5 rounded-full bg-white border border-blue-200/90 text-[#0070F3] text-[11px] xl:text-[11.5px] 2xl:text-xs font-bold shadow-xs mb-2.5 2xl:mb-3">
                  <Calendar size={13} className="text-[#0070F3]" />
                  <span>BOOK A DEMO</span>
                </div>

                <h1 className="text-3xl xl:text-[36px] 2xl:text-[44px] font-black text-[#0B1E3B] tracking-tight leading-[1.12] mb-2 2xl:mb-3">
                  See PEHAL <br />
                  Healthcare <br />
                  in Action
                  <span className="block text-[#0070F3] mt-1 font-black text-2xl xl:text-[28px] 2xl:text-[34px]">
                    Book Your Personalized Demo
                  </span>
                </h1>

                <p className="text-slate-500 text-xs xl:text-[13px] 2xl:text-[15.5px] leading-relaxed font-medium">
                  A healthcare specialist will walk you through how PEHAL can streamline your clinic operations — from appointment management to EMR, billing, pharmacy, lab and AI-powered features tailored to your practice.
                </p>

                {/* Cursive Tagline — placed under text, not overlapping */}
                <div className="mt-3 xl:mt-4 text-left">
                  <div 
                    className="text-[#0070F3] font-bold text-xl xl:text-[22px] 2xl:text-[26px] leading-[1.05] tracking-wide inline-block"
                    style={{ fontFamily: "'Caveat', cursive, sans-serif", transform: 'rotate(-2deg)', transformOrigin: 'left center' }}
                  >
                    Better Care, Brighter Tomorrows
                  </div>
                  <svg className="w-36 xl:w-40 2xl:w-44 h-2 2xl:h-2.5 text-[#0070F3] mt-0.5" viewBox="0 0 120 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 7C35 1.5 85 1 118 6" stroke="#0070F3" strokeWidth="2.2" strokeLinecap="round" />
                  </svg>
                </div>
              </div>

              {/* Right-Side Doctor Visual — fixed width, no negative left offsets */}
              <div className="shrink-0 w-[260px] xl:w-[290px] 2xl:w-[350px] h-[320px] xl:h-[350px] 2xl:h-[420px] relative pointer-events-none select-none z-0">
                {/* Dot Matrix Pattern */}
                <div 
                  className="absolute top-2 right-2 w-28 2xl:w-36 h-32 2xl:h-40 opacity-35 z-0"
                  style={{
                    backgroundImage: 'radial-gradient(#0070F3 1.5px, transparent 1.5px)',
                    backgroundSize: '13px 13px'
                  }}
                />

                {/* Abstract Blue Petals behind Doctor */}
                <img 
                  src={petalBackground} 
                  alt="PEHAL Abstract Background"
                  className="absolute top-2 right-0 w-[240px] xl:w-[270px] 2xl:w-[330px] h-auto object-contain z-0 opacity-95"
                />

                {/* Doctor with Headset SVG */}
                <img 
                  src={doctorImage} 
                  alt="PEHAL Healthcare Specialist"
                  className="absolute top-0 right-2 w-[195px] xl:w-[220px] 2xl:w-[270px] h-auto object-contain z-10 drop-shadow-[0_10px_25px_rgba(0,112,243,0.18)]"
                />

                {/* Floating Smarter Clinics Badge — kept inside doctor column */}
                <div className="absolute bottom-10 xl:bottom-12 left-2 xl:left-4 bg-white/95 backdrop-blur-md rounded-2xl p-2.5 xl:p-3 border border-slate-100/90 shadow-[0_8px_24px_rgba(0,112,243,0.14)] flex items-center gap-2 2xl:gap-2.5 z-20 pointer-events-auto">
                  <div className="w-7 h-7 2xl:w-8 2xl:h-8 rounded-xl bg-blue-50 border border-blue-100 text-[#0070F3] flex items-center justify-center shrink-0 shadow-xs">
                    <BarChart2 size={14} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] 2xl:text-xs font-black text-[#0B1E3B] leading-none">Smarter Clinics</span>
                    <span className="text-[9.5px] 2xl:text-[10.5px] font-bold text-[#0070F3] leading-tight mt-0.5">Healthier Tomorrows</span>
                  </div>
                </div>

              </div>

            </div>

            {/* 4 Feature Cards (2x2 Grid) */}
            <div className="grid grid-cols-2 gap-3 2xl:gap-4 z-10 w-full">
              {renderFeatureCards(false)}
            </div>

            {/* Compliance Badges Row */}
            <div className="flex flex-wrap items-center gap-1.5 2xl:gap-2 z-10 pt-0.5">
              {['HIPAA READY', 'NABH READY', 'GDPR READY', 'AES-256 ENCRYPTION'].map((badge) => (
                <span 
                  key={badge}
                  className="bg-white border border-blue-200/80 text-[#0070F3] px-2.5 2xl:px-3 py-1 rounded-full text-[9.5px] 2xl:text-[11px] font-extrabold flex items-center gap-1 shadow-xs tracking-tight whitespace-nowrap"
                >
                  <Check size={11} strokeWidth={3} className="text-[#0070F3] shrink-0" />
                  <span>{badge}</span>
                </span>
              ))}
            </div>

          </div>

          {/* Right Column (50% on desktop: Schedule Your Demo Card) */}
          <div className="xl:col-span-6 2xl:col-span-6 w-full">
            {renderSchedulerCard(false)}
          </div>

        </div>


        {/* =========================================================================
            2. TABLET / MEDIUM SCREEN LAYOUT (768px – 1279px / hidden md:flex xl:hidden):
            Balanced intermediate layout: Hero (Text + Doctor) -> Feature Cards (2x2) -> Tagline -> Schedule Card
            ========================================================================= */}
        <div className="hidden md:flex xl:hidden flex-col space-y-6 w-full max-w-[960px] mx-auto">
          
          {/* Tablet Hero: Text (Left) + Doctor Visual (Right) */}
          <div className="grid grid-cols-12 gap-6 items-center w-full">
            
            {/* Hero Text */}
            <div className="col-span-7">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-blue-200/90 text-[#0070F3] text-[11px] font-bold shadow-xs mb-3">
                <Calendar size={13} className="text-[#0070F3]" />
                <span>BOOK A DEMO</span>
              </div>

              <h1 className="text-3xl md:text-[34px] font-black text-[#0B1E3B] tracking-tight leading-[1.15] mb-2.5">
                See PEHAL Healthcare in Action <br />
                <span className="text-[#0070F3] text-2xl md:text-[26px]">
                  Book Your Personalized Demo
                </span>
              </h1>

              <p className="text-slate-500 text-xs md:text-sm leading-relaxed font-medium">
                A healthcare specialist will walk you through how PEHAL can streamline your clinic operations — from appointment management to EMR, billing, pharmacy, lab and AI-powered features tailored to your practice.
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
                alt="PEHAL Healthcare Specialist"
                className="relative z-10 w-[200px] h-auto object-contain drop-shadow-[0_10px_24px_rgba(0,112,243,0.16)]"
              />
              <div className="absolute bottom-2 right-0 bg-white/95 backdrop-blur-md rounded-xl p-2 border border-slate-100 shadow-[0_6px_20px_rgba(0,112,243,0.12)] flex items-center gap-2 z-20 pointer-events-auto">
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

          {/* Tablet 4 Feature Cards (2x2 Grid) */}
          <div className="grid grid-cols-2 gap-3.5 w-full">
            {renderFeatureCards(false)}
          </div>

          {/* Tagline Centered */}
          <div className="text-center py-1">
            <div 
              className="text-[#0070F3] font-bold text-2xl leading-tight inline-block"
              style={{ fontFamily: "'Caveat', cursive, sans-serif" }}
            >
              Better Care, Brighter Tomorrows
            </div>
            <svg className="w-36 h-2 text-[#0070F3] mx-auto mt-0.5" viewBox="0 0 120 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 7C35 1.5 85 1 118 6" stroke="#0070F3" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </div>

          {/* Tablet Schedule Card (Full Width) */}
          <div className="w-full pt-2">
            {renderSchedulerCard(false)}
          </div>

        </div>


        {/* =========================================================================
            3. SMALL / MOBILE LAYOUT (320px – 767px / block md:hidden):
            Single Vertical Flow matching Mobile Reference Image:
            Header -> Book Demo Badge -> Heading -> Description -> Doctor + Petals -> 
            Smarter Clinics Card -> 4 Feature Cards (2 cols) -> Better Care Tagline -> Schedule Demo Card -> Footer
            ========================================================================= */}
        <div className="flex md:hidden flex-col space-y-3.5 min-[390px]:space-y-4 w-full box-border">
          
          {/* Book a Demo Badge */}
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-blue-200/90 text-[#0070F3] text-[10px] min-[375px]:text-[10.5px] font-bold shadow-xs">
              <Calendar size={12} className="text-[#0070F3]" />
              <span>BOOK A DEMO</span>
            </div>
          </div>

          {/* Mobile Heading */}
          <h1 className="text-[26px] min-[360px]:text-[28px] min-[390px]:text-[32px] sm:text-[36px] font-black text-[#0B1E3B] tracking-tight leading-[1.12]">
            See PEHAL <br />
            Healthcare <br />
            in Action <br />
            <span className="text-[#0070F3] font-black text-xl min-[360px]:text-[22px] min-[390px]:text-2xl sm:text-[26px] block mt-0.5">
              Book Your Personalized Demo
            </span>
          </h1>

          {/* Mobile Description */}
          <p className="text-slate-500 text-[11.5px] min-[375px]:text-xs sm:text-[13px] leading-relaxed font-medium">
            A healthcare specialist will walk you through how PEHAL can streamline your clinic operations — from appointment management to EMR, billing, pharmacy, lab and AI-powered features tailored to your practice.
          </p>

          {/* Mobile Doctor Visual Container */}
          <div className="relative w-full max-w-[340px] mx-auto h-[210px] min-[375px]:h-[230px] sm:h-[250px] flex items-center justify-center my-1 select-none">
            {/* Dot Matrix Pattern */}
            <div 
              className="absolute top-1 right-2 w-20 min-[375px]:w-24 h-20 min-[375px]:h-24 opacity-30 z-0"
              style={{
                backgroundImage: 'radial-gradient(#0070F3 1.5px, transparent 1.5px)',
                backgroundSize: '12px 12px'
              }}
            />
            {/* Abstract Blue Petals strictly behind Doctor */}
            <img 
              src={petalBackground} 
              alt="PEHAL Abstract Background"
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] min-[375px]:w-[250px] sm:w-[270px] max-w-[80vw] h-auto object-contain z-0 opacity-95 pointer-events-none"
            />
            {/* Doctor SVG */}
            <img 
              src={doctorImage} 
              alt="PEHAL Healthcare Specialist"
              className="relative z-10 w-[170px] min-[375px]:w-[195px] sm:w-[220px] h-auto object-contain drop-shadow-[0_8px_20px_rgba(0,112,243,0.15)]"
            />
            {/* Floating Smarter Clinics Badge on lower-right */}
            <div className="absolute bottom-1 right-1 min-[375px]:right-2 sm:right-4 bg-white/95 backdrop-blur-md rounded-xl p-1.5 min-[375px]:p-2 border border-slate-100 shadow-[0_6px_20px_rgba(0,112,243,0.12)] flex items-center gap-1.5 z-20 pointer-events-auto">
              <div className="w-5.5 h-5.5 min-[375px]:w-6 min-[375px]:h-6 rounded-lg bg-blue-50 text-[#0070F3] flex items-center justify-center shrink-0">
                <BarChart2 size={12} />
              </div>
              <div className="flex flex-col">
                <span className="text-[9.5px] min-[375px]:text-[10px] font-black text-[#0B1E3B] leading-none">Smarter Clinics</span>
                <span className="text-[8px] min-[375px]:text-[8.5px] font-bold text-[#0070F3] leading-none mt-0.5">Healthier Tomorrows</span>
              </div>
            </div>
          </div>

          {/* Mobile 4 Feature Cards (2 Columns Grid) */}
          <div className="grid grid-cols-2 gap-2 min-[375px]:gap-2.5 sm:gap-3 w-full pt-0.5 box-border">
            {renderFeatureCards(true)}
          </div>

          {/* Mobile Better Care Tagline (Centered) */}
          <div className="text-center py-1.5">
            <div 
              className="text-[#0070F3] font-bold text-xl min-[375px]:text-2xl leading-none inline-block"
              style={{ fontFamily: "'Caveat', cursive, sans-serif", transform: 'rotate(-2deg)' }}
            >
              Better Care, Brighter Tomorrows
            </div>
            <svg className="w-32 min-[375px]:w-36 h-2 text-[#0070F3] mx-auto mt-0.5" viewBox="0 0 120 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 7C35 1.5 85 1 118 6" stroke="#0070F3" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </div>

          {/* Mobile Schedule Demo Card */}
          <div className="w-full pt-0.5 box-border">
            {renderSchedulerCard(true)}
          </div>

        </div>

      </main>

      {/* 🛡️ Footer */}
      <footer className="w-full max-w-[1600px] 2xl:max-w-[1880px] mx-auto px-3.5 min-[390px]:px-4 sm:px-6 lg:px-10 2xl:px-16 py-3.5 sm:py-4 text-xs 2xl:text-sm text-slate-500 border-t border-slate-200/80 mt-4 relative z-20 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0 text-center sm:text-left box-border">
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

  // Helper: Render 4 Feature Cards
  function renderFeatureCards(isMobile = false) {
    return (
      <>
        {/* Card 1: Personalized Walkthrough */}
        <div className={`bg-white rounded-2xl ${isMobile ? 'p-2 min-[375px]:p-2.5 sm:p-3' : 'p-3 xl:p-3.5 2xl:p-4'} border border-slate-100 shadow-[0_3px_14px_rgba(0,112,243,0.06)] hover:shadow-md transition-shadow flex flex-col justify-between w-full box-border min-w-0`}>
          <div>
            <div className={`${isMobile ? 'w-5.5 h-5.5 min-[375px]:w-6 min-[375px]:h-6' : 'w-7 h-7 2xl:w-8 2xl:h-8'} rounded-lg bg-blue-50 border border-blue-100/80 text-[#0070F3] flex items-center justify-center mb-1.5 2xl:mb-2 shadow-xs shrink-0`}>
              <Laptop size={isMobile ? 12 : 15} />
            </div>
            <h4 className={`${isMobile ? 'text-[10px] min-[375px]:text-[11px] sm:text-xs' : 'text-xs xl:text-[13px] 2xl:text-[15px]'} font-black text-[#0B1E3B] leading-tight mb-0.5 truncate`}>
              Personalized Walkthrough
            </h4>
            <p className={`${isMobile ? 'text-[8.5px] min-[375px]:text-[9.5px]' : 'text-[10.5px] xl:text-[11px] 2xl:text-[12.5px]'} text-slate-500 leading-tight font-medium line-clamp-2`}>
              See how PEHAL fits your clinic's unique workflow.
            </p>
          </div>
        </div>

        {/* Card 2: 30-Minute Demo */}
        <div className={`bg-white rounded-2xl ${isMobile ? 'p-2 min-[375px]:p-2.5 sm:p-3' : 'p-3 xl:p-3.5 2xl:p-4'} border border-slate-100 shadow-[0_3px_14px_rgba(0,112,243,0.06)] hover:shadow-md transition-shadow flex flex-col justify-between w-full box-border min-w-0`}>
          <div>
            <div className={`${isMobile ? 'w-5.5 h-5.5 min-[375px]:w-6 min-[375px]:h-6' : 'w-7 h-7 2xl:w-8 2xl:h-8'} rounded-lg bg-blue-50 border border-blue-100/80 text-[#0070F3] flex items-center justify-center mb-1.5 2xl:mb-2 shadow-xs shrink-0`}>
              <Clock size={isMobile ? 12 : 15} />
            </div>
            <h4 className={`${isMobile ? 'text-[10px] min-[375px]:text-[11px] sm:text-xs' : 'text-xs xl:text-[13px] 2xl:text-[15px]'} font-black text-[#0B1E3B] leading-tight mb-0.5 truncate`}>
              30-Minute Demo
            </h4>
            <p className={`${isMobile ? 'text-[8.5px] min-[375px]:text-[9.5px]' : 'text-[10.5px] xl:text-[11px] 2xl:text-[12.5px]'} text-slate-500 leading-tight font-medium line-clamp-2`}>
              A focused, no-pressure session with our product specialist.
            </p>
          </div>
        </div>

        {/* Card 3: AI-Powered Workflows */}
        <div className={`bg-white rounded-2xl ${isMobile ? 'p-2 min-[375px]:p-2.5 sm:p-3' : 'p-3 xl:p-3.5 2xl:p-4'} border border-slate-100 shadow-[0_3px_14px_rgba(0,112,243,0.06)] hover:shadow-md transition-shadow flex flex-col justify-between w-full box-border min-w-0`}>
          <div>
            <div className={`${isMobile ? 'w-5.5 h-5.5 min-[375px]:w-6 min-[375px]:h-6' : 'w-7 h-7 2xl:w-8 2xl:h-8'} rounded-lg bg-blue-50 border border-blue-100/80 text-[#0070F3] flex items-center justify-center mb-1.5 2xl:mb-2 shadow-xs shrink-0`}>
              <Sparkles size={isMobile ? 12 : 15} />
            </div>
            <h4 className={`${isMobile ? 'text-[10px] min-[375px]:text-[11px] sm:text-xs' : 'text-xs xl:text-[13px] 2xl:text-[15px]'} font-black text-[#0B1E3B] leading-tight mb-0.5 truncate`}>
              AI-Powered Workflows
            </h4>
            <p className={`${isMobile ? 'text-[8.5px] min-[375px]:text-[9.5px]' : 'text-[10.5px] xl:text-[11px] 2xl:text-[12.5px]'} text-slate-500 leading-tight font-medium line-clamp-2`}>
              Explore our latest AI features for smarter, faster healthcare.
            </p>
          </div>
        </div>

        {/* Card 4: No Commitment */}
        <div className={`bg-white rounded-2xl ${isMobile ? 'p-2 min-[375px]:p-2.5 sm:p-3' : 'p-3 xl:p-3.5 2xl:p-4'} border border-slate-100 shadow-[0_3px_14px_rgba(0,112,243,0.06)] hover:shadow-md transition-shadow flex flex-col justify-between w-full box-border min-w-0`}>
          <div>
            <div className={`${isMobile ? 'w-5.5 h-5.5 min-[375px]:w-6 min-[375px]:h-6' : 'w-7 h-7 2xl:w-8 2xl:h-8'} rounded-lg bg-blue-50 border border-blue-100/80 text-[#0070F3] flex items-center justify-center mb-1.5 2xl:mb-2 shadow-xs shrink-0`}>
              <ShieldCheck size={isMobile ? 12 : 15} />
            </div>
            <h4 className={`${isMobile ? 'text-[10px] min-[375px]:text-[11px] sm:text-xs' : 'text-xs xl:text-[13px] 2xl:text-[15px]'} font-black text-[#0B1E3B] leading-tight mb-0.5 truncate`}>
              No Commitment
            </h4>
            <p className={`${isMobile ? 'text-[8.5px] min-[375px]:text-[9.5px]' : 'text-[10.5px] xl:text-[11px] 2xl:text-[12.5px]'} text-slate-500 leading-tight font-medium line-clamp-2`}>
              Just a conversation to help you make the right decision.
            </p>
          </div>
        </div>
      </>
    );
  }

  // Helper: Render Scheduler Card (Calendar + Clock + Form)
  function renderSchedulerCard(isMobile = false) {
    return (
      <div className={`bg-white rounded-2xl sm:rounded-3xl ${isMobile ? 'p-3 min-[360px]:p-3.5 min-[390px]:p-4 sm:p-6' : 'p-5 lg:p-6 xl:p-7 2xl:p-9'} border border-slate-100 shadow-[0_12px_44px_rgba(0,112,243,0.07)] relative w-full box-border min-w-0`}>
        
        {/* Header: Icon + Title + Subtitle */}
        <div className="flex items-center gap-2 min-[375px]:gap-2.5 sm:gap-3 2xl:gap-4 mb-3.5 min-[390px]:mb-4 sm:mb-5 2xl:mb-6">
          <div className="w-8 h-8 min-[375px]:w-9 min-[375px]:h-9 sm:w-10 sm:h-10 2xl:w-12 2xl:h-12 rounded-xl sm:rounded-2xl bg-blue-50 border border-blue-100/80 text-[#0070F3] flex items-center justify-center shrink-0 shadow-xs">
            <Calendar size={isMobile ? 16 : 18} />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm min-[375px]:text-base sm:text-xl xl:text-2xl 2xl:text-[28px] font-black text-[#0B1E3B] tracking-tight leading-tight truncate">
              Schedule Your Demo
            </h2>
            <p className="text-[10.5px] min-[375px]:text-[11px] sm:text-xs 2xl:text-sm text-slate-500 font-medium leading-snug truncate">
              Choose a date and time that works for you.
            </p>
          </div>
        </div>

        {/* Success State View */}
        {status === 'success' && successData ? (
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
                DEMO SCHEDULED SUCCESSFULLY • {successData.bookingId}
              </span>
              <h3 className="text-xl sm:text-2xl 2xl:text-3xl font-black text-[#0B1E3B]">
                Demo Scheduled Successfully
              </h3>
              <p className="text-xs sm:text-sm 2xl:text-base text-slate-600 max-w-md mx-auto leading-relaxed">
                Your personalized PEHAL Healthcare demo for <strong className="text-slate-900">{successData.clinicName}</strong> has been scheduled for <strong className="text-[#0070F3]">{successData.dateText}</strong> at <strong className="text-[#0070F3]">{successData.timeText}</strong>.
              </p>
              <p className="text-xs 2xl:text-sm text-slate-500 pt-1">
                You'll receive a confirmation email with the meeting details.
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
                  setSuccessData(null);
                }}
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm 2xl:text-base transition cursor-pointer min-h-[44px] 2xl:min-h-[48px]"
              >
                <span>Schedule Another Demo</span>
              </button>
            </div>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 min-[390px]:space-y-3.5 sm:space-y-4 w-full box-border">
            
            {/* ── DATE & TIME SELECTOR SECTION (Stacked on <360px, 2-cols on 360px+) ── */}
            <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2 min-[375px]:gap-2.5 sm:gap-3 2xl:gap-4 w-full box-border">
              
              {/* LEFT: Select a Date * */}
              <div className="space-y-1 w-full box-border min-w-0">
                <label className="text-[10px] min-[375px]:text-[10.5px] sm:text-[11px] 2xl:text-xs font-bold text-[#0B1E3B] uppercase tracking-wider flex items-center gap-1">
                  <span>Select a Date</span>
                  <span className="text-red-500">*</span>
                </label>

                <div className="bg-slate-50/60 rounded-xl sm:rounded-2xl border border-slate-200/90 p-1.5 min-[375px]:p-2 sm:p-3 shadow-2xs w-full box-border">
                  {/* Month Navigation */}
                  <div className="flex items-center justify-between mb-1.5 px-0.5">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="w-5 h-5 min-[375px]:w-6 min-[375px]:h-6 rounded-md hover:bg-slate-200/70 flex items-center justify-center text-slate-600 transition cursor-pointer"
                      aria-label="Previous month"
                    >
                      <ChevronLeft size={13} />
                    </button>
                    <span className="text-[10px] min-[375px]:text-[11px] sm:text-xs font-bold text-[#0B1E3B] truncate">
                      {monthName} {year}
                    </span>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="w-5 h-5 min-[375px]:w-6 min-[375px]:h-6 rounded-md hover:bg-slate-200/70 flex items-center justify-center text-slate-600 transition cursor-pointer"
                      aria-label="Next month"
                    >
                      <ChevronRight size={13} />
                    </button>
                  </div>

                  {/* Day of Week Headers */}
                  <div className="grid grid-cols-7 gap-0.5 text-center mb-0.5">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                      <span key={d} className="text-[8px] min-[375px]:text-[8.5px] sm:text-[9.5px] font-semibold text-slate-400">
                        {d}
                      </span>
                    ))}
                  </div>

                  {/* Calendar Day Numbers Grid */}
                  <div className="grid grid-cols-7 gap-0.5 text-center">
                    {calendarDays.map((dayObj, i) => {
                      const isSelected = selectedDate && selectedDate.toDateString() === dayObj.date.toDateString();
                      return (
                        <button
                          key={i}
                          type="button"
                          disabled={dayObj.isPast}
                          onClick={() => handleSelectDay(dayObj)}
                          className={`w-5 h-5 min-[375px]:w-5.5 min-[375px]:h-5.5 min-[390px]:w-6 min-[390px]:h-6 sm:w-7 sm:h-7 rounded-full text-[8.5px] min-[375px]:text-[9.5px] min-[390px]:text-[10px] sm:text-[11px] font-semibold flex items-center justify-center mx-auto transition-all ${
                            isSelected
                              ? 'bg-[#0070F3] text-white font-bold shadow-xs'
                              : dayObj.isPast
                              ? 'text-slate-300 cursor-not-allowed'
                              : !dayObj.isCurrentMonth
                              ? 'text-slate-400 hover:bg-slate-200/60 cursor-pointer'
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
              <div className="space-y-1 w-full box-border min-w-0">
                <label className="text-[10px] min-[375px]:text-[10.5px] sm:text-[11px] 2xl:text-xs font-bold text-[#0B1E3B] uppercase tracking-wider flex items-center gap-1">
                  <span>Select a Time</span>
                  <span className="text-red-500">*</span>
                </label>

                <div className="bg-slate-50/60 rounded-xl sm:rounded-2xl border border-slate-200/90 p-1.5 min-[375px]:p-2 sm:p-3 shadow-2xs flex flex-col items-center justify-between min-h-[175px] min-[375px]:min-h-[185px] sm:min-h-[200px] w-full box-border">
                  
                  {/* ⏱️ Analog Clock Face */}
                  <div className="relative w-16 h-16 min-[375px]:w-18 min-[375px]:h-18 sm:w-20 sm:h-20 2xl:w-22 2xl:h-22 rounded-full border border-slate-200 flex items-center justify-center my-0.5 bg-white shadow-2xs shrink-0">
                    {/* Clock Dial Markers */}
                    <div className="absolute top-0.5 text-[7.5px] min-[375px]:text-[8px] font-bold text-slate-400 leading-none">00</div>
                    <div className="absolute right-0.5 text-[7.5px] min-[375px]:text-[8px] font-bold text-slate-400 leading-none">15</div>
                    <div className="absolute bottom-0.5 text-[7.5px] min-[375px]:text-[8px] font-bold text-slate-400 leading-none">30</div>
                    <div className="absolute left-0.5 text-[7.5px] min-[375px]:text-[8px] font-bold text-slate-400 leading-none">45</div>

                    {/* Clock Dots */}
                    <div className="absolute top-2.5 right-2.5 w-0.5 h-0.5 rounded-full bg-slate-200" />
                    <div className="absolute bottom-2.5 right-2.5 w-0.5 h-0.5 rounded-full bg-slate-200" />
                    <div className="absolute bottom-2.5 left-2.5 w-0.5 h-0.5 rounded-full bg-slate-200" />
                    <div className="absolute top-2.5 left-2.5 w-0.5 h-0.5 rounded-full bg-slate-200" />

                    {/* Minute Hand Pointer */}
                    <div 
                      className="absolute w-0.5 h-5 min-[375px]:h-6 sm:h-7 bg-[#0070F3] origin-bottom rounded-full transition-transform duration-300"
                      style={{ 
                        bottom: '50%',
                        transform: `rotate(${minuteAngle}deg)` 
                      }}
                    />

                    {/* Hour Hand Pointer */}
                    <div 
                      className="absolute w-1 h-3.5 min-[375px]:h-4 sm:h-5 bg-[#0B1E3B] origin-bottom rounded-full transition-transform duration-300"
                      style={{ 
                        bottom: '50%',
                        transform: `rotate(${hourAngle}deg)` 
                      }}
                    />

                    {/* Center Pivot */}
                    <div className="w-1.5 h-1.5 min-[375px]:w-2 min-[375px]:h-2 rounded-full bg-[#0070F3] border-2 border-white shadow-xs z-10" />
                  </div>

                  {/* Selected Time Pill Badge */}
                  <div className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200/90 text-[#0070F3] font-black text-[9.5px] min-[375px]:text-[10.5px] sm:text-[11px] my-0.5">
                    {selectedTimeSlot.label}
                  </div>

                  {/* Available Time Slots Grid (3 columns) */}
                  <div className="grid grid-cols-3 gap-0.5 min-[375px]:gap-1 w-full box-border">
                    {AVAILABLE_TIME_SLOTS.map((slot) => {
                      const isSelected = selectedTimeSlot.label === slot.label;
                      return (
                        <button
                          key={slot.label}
                          type="button"
                          onClick={() => setSelectedTimeSlot(slot)}
                          className={`py-0.5 min-[375px]:py-1 px-0.5 rounded-md text-[7.5px] min-[375px]:text-[8.5px] sm:text-[9.5px] font-bold border transition text-center cursor-pointer truncate ${
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

            {/* ── FORM FIELDS SECTION (Stacked on <360px, 2-cols on 360px+) ── */}
            
            {/* Row 1: Full Name + Work Email */}
            <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2 min-[375px]:gap-2.5 sm:gap-3 2xl:gap-4 w-full box-border">
              {/* Full Name */}
              <div className="w-full box-border min-w-0">
                <label className="block text-[9.5px] min-[375px]:text-[10.5px] sm:text-[11px] 2xl:text-xs font-bold text-[#0B1E3B] uppercase tracking-wider mb-1 truncate">
                  FULL NAME <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User size={13} className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Enter full name"
                    className={`w-full bg-slate-50/70 border rounded-xl pl-9 min-[375px]:pl-9.5 sm:pl-10 2xl:pl-11 pr-2.5 py-1.5 min-[375px]:py-2 sm:py-2.5 2xl:py-3 min-h-[36px] min-[375px]:min-h-[40px] sm:min-h-[44px] 2xl:min-h-[50px] text-[11px] min-[375px]:text-xs 2xl:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0070F3]/30 font-medium transition box-border ${
                      errors.fullName ? 'border-red-400 bg-red-50/30' : 'border-slate-200 focus:border-blue-300'
                    }`}
                  />
                </div>
                {errors.fullName && <p className="text-[9px] min-[375px]:text-[10px] 2xl:text-xs text-red-500 mt-0.5 font-bold">{errors.fullName}</p>}
              </div>

              {/* Work Email */}
              <div className="w-full box-border min-w-0">
                <label className="block text-[9.5px] min-[375px]:text-[10.5px] sm:text-[11px] 2xl:text-xs font-bold text-[#0B1E3B] uppercase tracking-wider mb-1 truncate">
                  WORK EMAIL <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail size={13} className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter work email"
                    className={`w-full bg-slate-50/70 border rounded-xl pl-9 min-[375px]:pl-9.5 sm:pl-10 2xl:pl-11 pr-2.5 py-1.5 min-[375px]:py-2 sm:py-2.5 2xl:py-3 min-h-[36px] min-[375px]:min-h-[40px] sm:min-h-[44px] 2xl:min-h-[50px] text-[11px] min-[375px]:text-xs 2xl:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0070F3]/30 font-medium transition box-border ${
                      errors.email ? 'border-red-400 bg-red-50/30' : 'border-slate-200 focus:border-blue-300'
                    }`}
                  />
                </div>
                {errors.email && <p className="text-[9px] min-[375px]:text-[10px] 2xl:text-xs text-red-500 mt-0.5 font-bold">{errors.email}</p>}
              </div>
            </div>

            {/* Row 2: Phone Number + Clinic / Hospital Name */}
            <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2 min-[375px]:gap-2.5 sm:gap-3 2xl:gap-4 w-full box-border">
              {/* Phone Number */}
              <div className="w-full box-border min-w-0">
                <label className="block text-[9.5px] min-[375px]:text-[10.5px] sm:text-[11px] 2xl:text-xs font-bold text-[#0B1E3B] uppercase tracking-wider mb-1 truncate">
                  PHONE NUMBER <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone size={13} className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Enter phone number"
                    className={`w-full bg-slate-50/70 border rounded-xl pl-9 min-[375px]:pl-9.5 sm:pl-10 2xl:pl-11 pr-2.5 py-1.5 min-[375px]:py-2 sm:py-2.5 2xl:py-3 min-h-[36px] min-[375px]:min-h-[40px] sm:min-h-[44px] 2xl:min-h-[50px] text-[11px] min-[375px]:text-xs 2xl:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0070F3]/30 font-medium transition box-border ${
                      errors.phone ? 'border-red-400 bg-red-50/30' : 'border-slate-200 focus:border-blue-300'
                    }`}
                  />
                </div>
                {errors.phone && <p className="text-[9px] min-[375px]:text-[10px] 2xl:text-xs text-red-500 mt-0.5 font-bold">{errors.phone}</p>}
              </div>

              {/* Clinic / Hospital Name */}
              <div className="w-full box-border min-w-0">
                <label className="block text-[9.5px] min-[375px]:text-[10.5px] sm:text-[11px] 2xl:text-xs font-bold text-[#0B1E3B] uppercase tracking-wider mb-1 truncate">
                  CLINIC / HOSPITAL NAME <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building2 size={13} className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    name="clinicName"
                    value={formData.clinicName}
                    onChange={handleChange}
                    placeholder="Enter clinic name"
                    className={`w-full bg-slate-50/70 border rounded-xl pl-9 min-[375px]:pl-9.5 sm:pl-10 2xl:pl-11 pr-2.5 py-1.5 min-[375px]:py-2 sm:py-2.5 2xl:py-3 min-h-[36px] min-[375px]:min-h-[40px] sm:min-h-[44px] 2xl:min-h-[50px] text-[11px] min-[375px]:text-xs 2xl:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0070F3]/30 font-medium transition box-border ${
                      errors.clinicName ? 'border-red-400 bg-red-50/30' : 'border-slate-200 focus:border-blue-300'
                    }`}
                  />
                </div>
                {errors.clinicName && <p className="text-[9px] min-[375px]:text-[10px] 2xl:text-xs text-red-500 mt-0.5 font-bold">{errors.clinicName}</p>}
              </div>
            </div>

            {/* Row 3: Number of Doctors + What would you like to see */}
            <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2 min-[375px]:gap-2.5 sm:gap-3 2xl:gap-4 w-full box-border">
              {/* Number of Doctors Dropdown */}
              <div className="w-full box-border min-w-0">
                <label className="block text-[9.5px] min-[375px]:text-[10.5px] sm:text-[11px] 2xl:text-xs font-bold text-[#0B1E3B] uppercase tracking-wider mb-1 truncate">
                  NUMBER OF DOCTORS <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Users size={13} className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <select
                    name="doctorsCount"
                    value={formData.doctorsCount}
                    onChange={handleChange}
                    className={`w-full bg-slate-50/70 border rounded-xl pl-9 min-[375px]:pl-9.5 sm:pl-10 2xl:pl-11 pr-7 py-1.5 min-[375px]:py-2 sm:py-2.5 2xl:py-3 min-h-[36px] min-[375px]:min-h-[40px] sm:min-h-[44px] 2xl:min-h-[50px] text-[11px] min-[375px]:text-xs 2xl:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0070F3]/30 appearance-none font-medium cursor-pointer box-border truncate ${
                      errors.doctorsCount ? 'border-red-400 bg-red-50/30' : 'border-slate-200 focus:border-blue-300'
                    }`}
                  >
                    <option value="">Select doctors count</option>
                    <option value="Solo (1 Doctor)">Solo (1 Doctor)</option>
                    <option value="2-5 Doctors">2 - 5 Doctors</option>
                    <option value="6-15 Doctors">6 - 15 Doctors</option>
                    <option value="16-50 Doctors">16 - 50 Doctors</option>
                    <option value="50+ Doctors">50+ Doctors (Enterprise)</option>
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 min-[375px]:right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
                {errors.doctorsCount && <p className="text-[9px] min-[375px]:text-[10px] 2xl:text-xs text-red-500 mt-0.5 font-bold">{errors.doctorsCount}</p>}
              </div>

              {/* What would you like to see? */}
              <div className="w-full box-border min-w-0">
                <label className="block text-[9.5px] min-[375px]:text-[10.5px] sm:text-[11px] 2xl:text-xs font-bold text-[#0B1E3B] uppercase tracking-wider mb-1 truncate">
                  WHAT WOULD YOU LIKE TO SEE? <span className="text-slate-400 font-normal lowercase text-[8.5px] min-[375px]:text-[9.5px]">(Optional)</span>
                </label>
                <div className="relative">
                  <FileText size={13} className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    name="topics"
                    value={formData.topics}
                    onChange={handleChange}
                    placeholder="e.g. EMR, Billing, Pharmacy..."
                    className="w-full bg-slate-50/70 border border-slate-200 rounded-xl pl-9 min-[375px]:pl-9.5 sm:pl-10 2xl:pl-11 pr-2.5 py-1.5 min-[375px]:py-2 sm:py-2.5 2xl:py-3 min-h-[36px] min-[375px]:min-h-[40px] sm:min-h-[44px] 2xl:min-h-[50px] text-[11px] min-[375px]:text-xs 2xl:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0070F3]/30 font-medium transition box-border"
                  />
                </div>
              </div>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-2.5 sm:p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[11px] sm:text-xs 2xl:text-sm flex items-center gap-2">
                <AlertCircle size={14} className="text-red-500 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Privacy & Terms Checkbox */}
            <div className="pt-0.5">
              <label className="flex items-start gap-2 cursor-pointer select-none text-[10px] min-[375px]:text-[11px] sm:text-xs 2xl:text-sm text-slate-600 font-medium">
                <input
                  type="checkbox"
                  name="agree"
                  checked={formData.agree}
                  onChange={handleChange}
                  className="w-3.5 h-3.5 min-[375px]:w-4 min-[375px]:h-4 2xl:w-5 2xl:h-5 rounded border-slate-300 text-[#0070F3] focus:ring-[#0070F3]/40 cursor-pointer mt-0.5 shrink-0"
                />
                <span className="leading-snug">
                  I agree to the <Link to="/" className="text-[#0070F3] hover:underline font-semibold">Privacy Policy</Link> and <Link to="/" className="text-[#0070F3] hover:underline font-semibold">Terms of Service</Link>.
                </span>
              </label>
              {errors.agree && <p className="text-[9px] min-[375px]:text-[10px] 2xl:text-xs text-red-500 mt-0.5 font-bold">{errors.agree}</p>}
            </div>

            {/* ── CONFIRM DEMO BUTTON ── */}
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full py-2.5 min-[375px]:py-3 sm:py-3.5 2xl:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl bg-[#0070F3] hover:bg-[#005FE0] text-white font-black text-xs min-[375px]:text-[13px] sm:text-sm 2xl:text-base uppercase tracking-wider transition-all duration-200 shadow-md shadow-blue-600/25 hover:shadow-lg hover:shadow-blue-600/35 hover:-translate-y-0.5 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 min-h-[42px] min-[375px]:min-h-[46px] sm:min-h-[48px] 2xl:min-h-[54px]"
            >
              <Calendar size={14} />
              <span>{status === 'loading' ? 'SCHEDULING DEMO...' : 'CONFIRM DEMO'}</span>
              <span>→</span>
            </button>

            {/* Bottom Notice: Confirmation Email */}
            <div className="flex items-center justify-center gap-1.5 text-[9.5px] min-[375px]:text-[10.5px] sm:text-[11px] 2xl:text-xs text-slate-500 font-medium pt-0.5 text-center">
              <Mail size={12} className="text-[#0070F3] shrink-0" />
              <span>You'll receive a confirmation email with the meeting details.</span>
            </div>

          </form>
        )}

      </div>
    );
  }
}
