import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Calendar, Clock, CheckCircle2, ArrowLeft, ArrowRight, 
  Sparkles, Building2, User, Mail, Phone, Users, FileText,
  ShieldCheck, Check, AlertCircle, Laptop, Heart,
  BarChart2, ChevronLeft, ChevronRight, ChevronDown
} from 'lucide-react';
import PehalLogo from '../components/common/PehalLogo';
import { supportApi } from '../lib/api';

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

// Date State Enum
const DATE_STATE = {
  PAST: 'PAST',
  TODAY_WITH_SLOTS: 'TODAY_WITH_SLOTS',
  TODAY_NO_SLOTS: 'TODAY_NO_SLOTS',
  FUTURE_WITH_SLOTS: 'FUTURE_WITH_SLOTS',
  FUTURE_NO_SLOTS: 'FUTURE_NO_SLOTS',
  LOADING: 'LOADING'
};

export default function BookDemoPage() {
  const navigate = useNavigate();
  const errorSummaryRef = useRef(null);

  // Form input states (TC-16: All fields preserved on error)
  const [formData, setFormData] = useState({
    fullName: '',
    workEmail: '',
    phoneNumber: '',
    clinicName: '',
    doctorsCount: '',
    topics: '',
    privacyConsent: false
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [successData, setSuccessData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [autoSelectedNotice, setAutoSelectedNotice] = useState('');
  const [dateUnavailableMessage, setDateUnavailableMessage] = useState('');
  const [hasAutoAdvancedDate, setHasAutoAdvancedDate] = useState(false);

  // Validation Patterns & Helpers
  const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const PHONE_REGEX = /^[6-9][0-9]{9}$/;

  const getPhoneValidation = (phoneStr) => {
    const digits = (phoneStr || '').replace(/\D/g, '');
    if (!digits) return { state: 'empty', message: 'Phone number is required' };
    if (digits.length < 10) return { state: 'incomplete', message: 'Must be a 10-digit number' };
    if (!PHONE_REGEX.test(digits)) return { state: 'invalid', message: 'Must start with 6, 7, 8, or 9' };
    return { state: 'valid', message: '' };
  };

  const getEmailValidation = (emailStr, isBlur = false) => {
    const trimmed = (emailStr || '').trim();
    if (!trimmed) return { state: 'empty', message: 'Work email is required' };
    if (EMAIL_REGEX.test(trimmed)) return { state: 'valid', message: '' };

    if (!isBlur) {
      if (/\s/.test(trimmed) || (trimmed.match(/@/g) || []).length > 1) {
        return { state: 'invalid', message: 'Invalid work email address' };
      }
      const atIndex = trimmed.indexOf('@');
      if (atIndex === -1) {
        return { state: 'incomplete', message: '' };
      }
      const domainPart = trimmed.slice(atIndex + 1);
      if (!domainPart || !domainPart.includes('.')) {
        return { state: 'incomplete', message: '' };
      }
      const dotIndex = domainPart.lastIndexOf('.');
      const tld = domainPart.slice(dotIndex + 1);
      if (tld.length < 2) {
        return { state: 'incomplete', message: '' };
      }
    }

    return { state: 'invalid', message: 'Please enter a valid work email address' };
  };

  // Real-time valid states for UI feedback
  const isPhoneValid = useMemo(() => getPhoneValidation(formData.phoneNumber).state === 'valid', [formData.phoneNumber]);
  const isEmailValid = useMemo(() => getEmailValidation(formData.workEmail, false).state === 'valid', [formData.workEmail]);

  // System Booking Timezone (Asia/Kolkata)
  const BOOKING_TIMEZONE = 'Asia/Kolkata';

  const getNowInBookingTimezone = () => {
    const now = new Date();
    const options = {
      timeZone: BOOKING_TIMEZONE,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    };
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(now);
    const map = {};
    parts.forEach(p => { map[p.type] = parseInt(p.value, 10); });

    return {
      year: map.year,
      month: map.month - 1, // 0-indexed
      day: map.day,
      hour: map.hour,
      minute: map.minute,
      second: map.second
    };
  };

  // Real-time clock ticker to dynamically invalidate elapsed slots as time passes
  const [currentTimeTick, setCurrentTimeTick] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTimeTick(Date.now());
    }, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Current system date (00:00:00) in booking timezone
  const today = useMemo(() => {
    const nowInfo = getNowInBookingTimezone();
    const d = new Date(nowInfo.year, nowInfo.month, nowInfo.day);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [currentTimeTick]);

  // Minimum navigable month based on current system date
  const minBookingMonthDate = useMemo(() => {
    const d = new Date(today.getFullYear(), today.getMonth(), 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [today]);

  const [currentMonthDate, setCurrentMonthDate] = useState(() => {
    const nowInfo = getNowInBookingTimezone();
    const d = new Date(nowInfo.year, nowInfo.month, 1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Selected date and time
  const [selectedDate, setSelectedDate] = useState(() => {
    const nowInfo = getNowInBookingTimezone();
    const d = new Date(nowInfo.year, nowInfo.month, nowInfo.day);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [availabilityData, setAvailabilityData] = useState(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  // Check if selected date is today in booking timezone
  const isSelectedDateToday = useMemo(() => {
    if (!selectedDate) return false;
    const nowInfo = getNowInBookingTimezone();
    return (
      selectedDate.getFullYear() === nowInfo.year &&
      selectedDate.getMonth() === nowInfo.month &&
      selectedDate.getDate() === nowInfo.day
    );
  }, [selectedDate, currentTimeTick]);

  // Calendar calculations
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const monthName = currentMonthDate.toLocaleDateString('en-US', { month: 'long' });

  // Fetch real demo availability from API for the displayed month/year
  const fetchAvailability = async (y, m) => {
    setLoadingAvailability(true);
    try {
      const res = await supportApi.getDemoAvailability({ year: y ?? year, month: m ?? month });
      if (res?.data) {
        setAvailabilityData(res.data);
      }
    } catch (err) {
      console.warn('Could not fetch real demo availability:', err);
    } finally {
      setLoadingAvailability(false);
    }
  };

  useEffect(() => {
    fetchAvailability(year, month);
  }, [year, month]);

  // Automatically advance ONLY FOR TODAY when today has zero remaining slots
  useEffect(() => {
    if (!availabilityData) return;
    if (hasAutoAdvancedDate) return;

    const nowInfo = getNowInBookingTimezone();
    const isToday = selectedDate && (
      selectedDate.getFullYear() === nowInfo.year &&
      selectedDate.getMonth() === nowInfo.month &&
      selectedDate.getDate() === nowInfo.day
    );

    if (isToday) {
      const rawSlots = availabilityData.timeSlots || AVAILABLE_TIME_SLOTS;
      const remainingTodaySlots = rawSlots.filter(slot => {
        if (slot.hour < nowInfo.hour) return false;
        if (slot.hour === nowInfo.hour && slot.minute <= nowInfo.minute) return false;
        return true;
      });

      if (remainingTodaySlots.length === 0 && availabilityData.nextAvailableDate) {
        const { year: nextY, month: nextM, day: nextD } = availabilityData.nextAvailableDate;
        const nextDate = new Date(nextY, nextM, nextD);
        nextDate.setHours(0, 0, 0, 0);

        if (nextDate.getTime() !== selectedDate.getTime()) {
          setSelectedDate(nextDate);
          if (nextY !== year || nextM !== month) {
            setCurrentMonthDate(new Date(nextY, nextM, 1));
          }
          setAutoSelectedNotice("Today’s available slots have ended. We selected the next available date for you.");
          setHasAutoAdvancedDate(true);
        }
      }
    }
  }, [availabilityData, selectedDate, year, month, hasAutoAdvancedDate, currentTimeTick]);

  // Is calendar currently displaying the minimum navigable month (current system month)?
  const isAtOrBeforeMinMonth = useMemo(() => {
    const currentViewDate = new Date(year, month, 1);
    return currentViewDate <= minBookingMonthDate;
  }, [year, month, minBookingMonthDate]);

  // Maximum navigable month (from API maxMonth/maxYear or default 3 months ahead)
  const maxBookingMonthDate = useMemo(() => {
    if (availabilityData?.maxYear !== undefined && availabilityData?.maxMonth !== undefined) {
      return new Date(availabilityData.maxYear, availabilityData.maxMonth, 1);
    }
    return new Date(today.getFullYear(), today.getMonth() + 3, 1);
  }, [availabilityData, today]);

  const isAtOrAfterMaxMonth = useMemo(() => {
    const currentViewDate = new Date(year, month, 1);
    return currentViewDate >= maxBookingMonthDate;
  }, [year, month, maxBookingMonthDate]);

  // Dynamic available time slots based on selected date & current local time in Asia/Kolkata
  const availableTimeSlots = useMemo(() => {
    const rawSlots = (availabilityData?.dateSlots && selectedDate && availabilityData.dateSlots[selectedDate.getDate()]) ||
                     availabilityData?.timeSlots ||
                     AVAILABLE_TIME_SLOTS;
    const nowInfo = getNowInBookingTimezone();

    if (!isSelectedDateToday) {
      // Future dates: all API slots available
      return rawSlots.map(s => ({ ...s, isAvailable: true }));
    }

    // For today: strictly filter out all elapsed slots
    return rawSlots.filter(slot => {
      if (slot.hour < nowInfo.hour) return false;
      if (slot.hour === nowInfo.hour && slot.minute <= nowInfo.minute) return false;
      return true;
    }).map(s => ({ ...s, isAvailable: true }));
  }, [availabilityData, isSelectedDateToday, selectedDate, currentTimeTick]);

  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);

  // Automatically adjust selectedTimeSlot whenever availableTimeSlots changes
  useEffect(() => {
    if (availableTimeSlots.length === 0) {
      setSelectedTimeSlot(null);
      return;
    }
    const currentMatched = availableTimeSlots.find(s => s.label === selectedTimeSlot?.label);
    if (!currentMatched) {
      setSelectedTimeSlot(availableTimeSlots[0]); // Default to earliest upcoming slot
    }
  }, [availableTimeSlots, selectedTimeSlot]);

  // Generate calendar days with explicit Calendar State Model
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const prevMonthLastDate = new Date(year, month, 0).getDate();

    const availableDateNums = availabilityData?.availableDates;
    const nowInfo = getNowInBookingTimezone();
    const days = [];

    // Previous month filler days (always PAST)
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        dayNumber: prevMonthLastDate - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthLastDate - i),
        state: DATE_STATE.PAST,
        isClickable: false
      });
    }

    // Current month days
    for (let i = 1; i <= lastDate; i++) {
      const dayDate = new Date(year, month, i);
      dayDate.setHours(0, 0, 0, 0);

      const isPast = dayDate < today;
      const isTodayDate = dayDate.getTime() === today.getTime();

      let state = DATE_STATE.FUTURE_WITH_SLOTS;

      if (loadingAvailability) {
        state = DATE_STATE.LOADING;
      } else if (isPast) {
        state = DATE_STATE.PAST;
      } else if (isTodayDate) {
        const rawSlots = availabilityData?.timeSlots || AVAILABLE_TIME_SLOTS;
        const remainingSlots = rawSlots.filter(slot => {
          if (slot.hour < nowInfo.hour) return false;
          if (slot.hour === nowInfo.hour && slot.minute <= nowInfo.minute) return false;
          return true;
        });
        state = remainingSlots.length > 0 ? DATE_STATE.TODAY_WITH_SLOTS : DATE_STATE.TODAY_NO_SLOTS;
      } else {
        // Future date: check API availability (Sundays supported if in availableDates)
        const hasSlotsInApi = availableDateNums && Array.isArray(availableDateNums)
          ? availableDateNums.includes(i)
          : true;
        state = hasSlotsInApi ? DATE_STATE.FUTURE_WITH_SLOTS : DATE_STATE.FUTURE_NO_SLOTS;
      }

      const isClickable = state === DATE_STATE.TODAY_WITH_SLOTS || state === DATE_STATE.FUTURE_WITH_SLOTS;

      days.push({
        dayNumber: i,
        isCurrentMonth: true,
        date: dayDate,
        state,
        isClickable,
        isToday: isTodayDate
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
        state: DATE_STATE.PAST,
        isClickable: false
      });
    }

    return days;
  }, [year, month, today, availabilityData, loadingAvailability, currentTimeTick]);

  const handlePrevMonth = () => {
    if (isAtOrBeforeMinMonth) return;
    setDateUnavailableMessage('');
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    if (isAtOrAfterMaxMonth) return;
    setDateUnavailableMessage('');
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleSelectDay = (dayObj) => {
    if (!dayObj.isCurrentMonth) return;

    if (dayObj.state === DATE_STATE.PAST) {
      return;
    }

    // Requirement 8 & 10: When user manually clicks a date with NO SLOTS, show inline message and do NOT auto-jump
    if (dayObj.state === DATE_STATE.FUTURE_NO_SLOTS || dayObj.state === DATE_STATE.TODAY_NO_SLOTS) {
      setDateUnavailableMessage("This date has no available demo slots. Please choose another date.");
      return;
    }

    // Selectable date with confirmed slots (Requirement 1, 4, 9)
    setDateUnavailableMessage('');
    setAutoSelectedNotice('');
    setSelectedDate(dayObj.date);
    if (errors.selectedDate) {
      setErrors(prev => ({ ...prev, selectedDate: null }));
    }
  };

  // Clock Hand angles
  const minuteAngle = ((selectedTimeSlot?.minute || 0) / 60) * 360;
  const hourAngle = (((selectedTimeSlot?.hour || 12) % 12) + (selectedTimeSlot?.minute || 0) / 60) * 30;

  // Form Validation
  const validate = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    
    const emailVal = getEmailValidation(formData.workEmail, true);
    if (emailVal.state !== 'valid') {
      newErrors.workEmail = emailVal.message;
    }

    const phoneVal = getPhoneValidation(formData.phoneNumber);
    if (phoneVal.state !== 'valid') {
      newErrors.phoneNumber = phoneVal.message;
    }

    if (!formData.clinicName.trim()) newErrors.clinicName = 'Clinic or hospital name is required';
    if (!formData.doctorsCount) newErrors.doctorsCount = 'Please select number of doctors';
    if (!selectedDate) newErrors.selectedDate = 'Please select a date';
    if (!selectedTimeSlot) {
      newErrors.selectedTime = isSelectedDateToday
        ? 'No time slots available for today. Please select another date.'
        : 'Please select an appointment time slot.';
      setErrorMessage(newErrors.selectedTime);
    }
    if (!formData.privacyConsent) newErrors.privacyConsent = 'You must agree to the Terms and Privacy Policy';

    setErrors(newErrors);
    setTouched({
      fullName: true,
      workEmail: true,
      phoneNumber: true,
      clinicName: true,
      doctorsCount: true,
      privacyConsent: true
    });

    if (Object.keys(newErrors).length > 0) {
      const firstMsg = Object.values(newErrors)[0];
      setErrorMessage(firstMsg || 'Please complete all required fields correctly.');
      setTimeout(() => {
        if (errorSummaryRef.current) {
          errorSummaryRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          errorSummaryRef.current.focus();
        }
      }, 50);
      return false;
    }

    return true;
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));

    if (name === 'phoneNumber' || name === 'phone') {
      const v = getPhoneValidation(formData.phoneNumber);
      if (v.state !== 'valid') {
        setErrors(prev => ({ ...prev, phoneNumber: v.message }));
      } else {
        setErrors(prev => ({ ...prev, phoneNumber: null }));
      }
    } else if (name === 'workEmail' || name === 'email') {
      const v = getEmailValidation(formData.workEmail, true);
      if (v.state !== 'valid') {
        setErrors(prev => ({ ...prev, workEmail: v.message }));
      } else {
        setErrors(prev => ({ ...prev, workEmail: null }));
      }
    } else if (name === 'fullName' && !formData.fullName.trim()) {
      setErrors(prev => ({ ...prev, fullName: 'Full name is required' }));
    } else if (name === 'clinicName' && !formData.clinicName.trim()) {
      setErrors(prev => ({ ...prev, clinicName: 'Clinic or hospital name is required' }));
    } else if (name === 'doctorsCount' && !formData.doctorsCount) {
      setErrors(prev => ({ ...prev, doctorsCount: 'Please select number of doctors' }));
    }
  };

  const handlePhoneKeyDown = (e) => {
    if (
      ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key) ||
      (e.ctrlKey || e.metaKey)
    ) {
      return;
    }
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      return;
    }
    const input = e.target;
    const hasSelection = input.selectionStart !== input.selectionEnd;
    if (input.value.length >= 10 && !hasSelection) {
      e.preventDefault();
    }
  };

  const handlePhonePaste = (e) => {
    e.preventDefault();
    const pasteText = (e.clipboardData || window.clipboardData).getData('text');
    const cleaned = pasteText.replace(/\D/g, '');
    const currentVal = formData.phoneNumber || '';
    const input = e.target;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const combined = (currentVal.slice(0, start) + cleaned + currentVal.slice(end)).slice(0, 10);
    
    setFormData(prev => ({ ...prev, phoneNumber: combined }));
    const v = getPhoneValidation(combined);
    if (v.state === 'valid') {
      setErrors(prev => ({ ...prev, phoneNumber: null }));
    } else if (combined.length === 10 && v.state === 'invalid') {
      setErrors(prev => ({ ...prev, phoneNumber: v.message }));
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === 'phoneNumber' || name === 'phone') {
      const sanitized = value.replace(/\D/g, '').slice(0, 10);
      setFormData(prev => ({ ...prev, phoneNumber: sanitized }));

      const v = getPhoneValidation(sanitized);
      if (v.state === 'valid') {
        setErrors(prev => ({ ...prev, phoneNumber: null }));
      } else if (sanitized.length === 10 && v.state === 'invalid') {
        setErrors(prev => ({ ...prev, phoneNumber: v.message }));
      } else if (touched.phoneNumber && (v.state === 'invalid' || v.state === 'incomplete')) {
        setErrors(prev => ({ ...prev, phoneNumber: v.message }));
      } else if (errors.phoneNumber && v.state === 'incomplete' && !touched.phoneNumber) {
        setErrors(prev => ({ ...prev, phoneNumber: null }));
      }
      return;
    }

    if (name === 'workEmail' || name === 'email') {
      setFormData(prev => ({ ...prev, workEmail: value }));
      const v = getEmailValidation(value, false);
      if (v.state === 'valid') {
        setErrors(prev => ({ ...prev, workEmail: null }));
      } else if (v.state === 'invalid') {
        setErrors(prev => ({ ...prev, workEmail: v.message }));
      } else if (v.state === 'incomplete') {
        if (errors.workEmail && !touched.workEmail) {
          setErrors(prev => ({ ...prev, workEmail: null }));
        }
      }
      return;
    }

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
      workEmail: formData.workEmail.trim(),
      email: formData.workEmail.trim(),
      phoneNumber: formData.phoneNumber.trim(),
      phone: formData.phoneNumber.trim(),
      clinicName: formData.clinicName.trim(),
      doctorsCount: formData.doctorsCount,
      selectedDate: formattedDate,
      preferredDate: formattedDate,
      selectedTime: selectedTimeSlot.label,
      preferredTime: selectedTimeSlot.label,
      topics: formData.topics.trim(),
      privacyConsent: formData.privacyConsent,
      agree: formData.privacyConsent
    };

    try {
      const data = await supportApi.bookDemo(payload);
      
      if (data?.success) {
        setStatus('success');
        setSuccessData({
          bookingId: data.ticketId || `DEMO-${Date.now().toString().slice(-6)}`,
          dateText: formattedDate,
          timeText: selectedTimeSlot.label,
          fullName: formData.fullName,
          clinicName: formData.clinicName
        });
      } else {
        throw new Error(data?.message || 'Unable to book your demo. Please try again.');
      }
    } catch (err) {
      console.error('Demo booking error:', err);
      setStatus('error');
      const apiMsg = err.response?.data?.message || err.message || "We couldn't submit your request. Please try again.";
      setErrorMessage(apiMsg);
      setTimeout(() => {
        if (errorSummaryRef.current) {
          errorSummaryRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          errorSummaryRef.current.focus();
        }
      }, 50);
    }
  };

  const handleScheduleAnother = () => {
    setStatus('idle');
    setSuccessData(null);
    setFormData({
      fullName: '',
      workEmail: '',
      phoneNumber: '',
      clinicName: '',
      doctorsCount: '',
      topics: '',
      privacyConsent: false
    });
    setErrors({});
    setTouched({});
    setErrorMessage('');
    setAutoSelectedNotice('');
    setDateUnavailableMessage('');
    setHasAutoAdvancedDate(false);
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
        
        {/* Responsive Grid: Stacks on mobile/tablet, 2 columns on desktop (xl:) */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8 2xl:gap-14 items-start w-full">
          
          {/* Left Column (Hero Text + Doctor Visual + Feature Cards + Badges) */}
          <div className="xl:col-span-6 2xl:col-span-6 flex flex-col justify-between space-y-4 xl:space-y-5 2xl:space-y-6 w-full">
            
            {/* Top Hero Composition */}
            <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-0 w-full">
              
              {/* Left-Aligned Text */}
              <div className="flex-1 min-w-0 z-10 pt-1 sm:pr-4 text-center sm:text-left">
                <div className="inline-flex items-center gap-2 px-3 2xl:px-4 py-1 2xl:py-1.5 rounded-full bg-white border border-blue-200/90 text-[#0070F3] text-[10.5px] sm:text-[11.5px] 2xl:text-xs font-bold shadow-xs mb-2.5 2xl:mb-3">
                  <Calendar size={13} className="text-[#0070F3]" />
                  <span>BOOK A DEMO</span>
                </div>

                <h1 className="text-2xl min-[360px]:text-[28px] sm:text-3xl xl:text-[36px] 2xl:text-[44px] font-black text-[#0B1E3B] tracking-tight leading-[1.12] mb-2 2xl:mb-3">
                  See PEHAL <br className="hidden sm:inline" />
                  Healthcare <br className="hidden sm:inline" />
                  in Action
                  <span className="block text-[#0070F3] mt-1 font-black text-xl min-[360px]:text-2xl sm:text-2xl xl:text-[28px] 2xl:text-[34px]">
                    Book Your Personalized Demo
                  </span>
                </h1>

                <p className="text-slate-500 text-xs sm:text-[13px] 2xl:text-[15.5px] leading-relaxed font-medium">
                  A healthcare specialist will walk you through how PEHAL can streamline your clinic operations — from appointment management to EMR, billing, pharmacy, lab and AI-powered features tailored to your practice.
                </p>

                {/* Cursive Tagline (Desktop & Tablet) */}
                <div className="hidden sm:block mt-3 xl:mt-4 text-left">
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

              {/* Doctor Visual with Floating Badge */}
              <div className="shrink-0 w-[240px] sm:w-[260px] xl:w-[290px] 2xl:w-[350px] h-[220px] sm:h-[300px] xl:h-[350px] 2xl:h-[420px] relative select-none z-0 my-1 sm:my-0 flex items-center justify-center">
                {/* Dot Matrix Pattern */}
                <div 
                  className="absolute top-2 right-2 w-24 sm:w-28 2xl:w-36 h-28 sm:h-32 2xl:h-40 opacity-35 z-0 pointer-events-none"
                  style={{
                    backgroundImage: 'radial-gradient(#0070F3 1.5px, transparent 1.5px)',
                    backgroundSize: '13px 13px'
                  }}
                />

                {/* Abstract Blue Petals */}
                <img 
                  src={petalBackground} 
                  alt="PEHAL Abstract Background"
                  className="absolute top-1/2 sm:top-2 left-1/2 sm:left-auto -translate-x-1/2 sm:translate-x-0 -translate-y-1/2 sm:translate-y-0 right-auto sm:right-0 w-[220px] sm:w-[240px] xl:w-[270px] 2xl:w-[330px] h-auto object-contain z-0 opacity-95 pointer-events-none"
                />

                {/* Doctor with Headset SVG */}
                <img 
                  src={doctorImage} 
                  alt="PEHAL Healthcare Specialist"
                  className="relative sm:absolute sm:top-0 sm:right-2 w-[170px] sm:w-[195px] xl:w-[220px] 2xl:w-[270px] h-auto object-contain z-10 drop-shadow-[0_10px_25px_rgba(0,112,243,0.18)] pointer-events-none"
                />

                {/* Floating Smarter Clinics Badge */}
                <div className="absolute bottom-2 sm:bottom-10 xl:bottom-12 right-2 sm:left-2 xl:left-4 bg-white/95 backdrop-blur-md rounded-2xl p-2 sm:p-2.5 xl:p-3 border border-slate-100/90 shadow-[0_8px_24px_rgba(0,112,243,0.14)] flex items-center gap-2 2xl:gap-2.5 z-20 pointer-events-auto">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 2xl:w-8 2xl:h-8 rounded-xl bg-blue-50 border border-blue-100 text-[#0070F3] flex items-center justify-center shrink-0 shadow-xs">
                    <BarChart2 size={13} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] sm:text-[11px] 2xl:text-xs font-black text-[#0B1E3B] leading-none">Smarter Clinics</span>
                    <span className="text-[8.5px] sm:text-[9.5px] 2xl:text-[10.5px] font-bold text-[#0070F3] leading-tight mt-0.5">Healthier Tomorrows</span>
                  </div>
                </div>

              </div>

            </div>

            {/* 4 Feature Cards (2x2 Grid) */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 2xl:gap-4 z-10 w-full">
              {renderFeatureCards()}
            </div>

            {/* Mobile Cursive Tagline */}
            <div className="sm:hidden text-center py-1">
              <div 
                className="text-[#0070F3] font-bold text-xl leading-none inline-block"
                style={{ fontFamily: "'Caveat', cursive, sans-serif", transform: 'rotate(-2deg)' }}
              >
                Better Care, Brighter Tomorrows
              </div>
              <svg className="w-32 h-2 text-[#0070F3] mx-auto mt-0.5" viewBox="0 0 120 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 7C35 1.5 85 1 118 6" stroke="#0070F3" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </div>

            {/* Compliance Badges Row */}
            <div className="hidden sm:flex flex-wrap items-center gap-1.5 2xl:gap-2 z-10 pt-0.5">
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

          {/* Right Column: Single Schedule Demo Card */}
          <div className="xl:col-span-6 2xl:col-span-6 w-full">
            {renderSchedulerCard()}
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
  function renderFeatureCards() {
    return (
      <>
        {/* Card 1: Personalized Walkthrough */}
        <div className="bg-white rounded-2xl p-2.5 sm:p-3 xl:p-3.5 2xl:p-4 border border-slate-100 shadow-[0_3px_14px_rgba(0,112,243,0.06)] hover:shadow-md transition-shadow flex flex-col justify-between w-full box-border min-w-0">
          <div>
            <div className="w-6 h-6 sm:w-7 sm:h-7 2xl:w-8 2xl:h-8 rounded-lg bg-blue-50 border border-blue-100/80 text-[#0070F3] flex items-center justify-center mb-1.5 2xl:mb-2 shadow-xs shrink-0">
              <Laptop size={14} />
            </div>
            <h4 className="text-[11px] sm:text-xs xl:text-[13px] 2xl:text-[15px] font-black text-[#0B1E3B] leading-tight mb-0.5 truncate">
              Personalized Walkthrough
            </h4>
            <p className="text-[9.5px] sm:text-[10.5px] xl:text-[11px] 2xl:text-[12.5px] text-slate-500 leading-tight font-medium line-clamp-2">
              See how PEHAL fits your clinic's unique workflow.
            </p>
          </div>
        </div>

        {/* Card 2: 30-Minute Demo */}
        <div className="bg-white rounded-2xl p-2.5 sm:p-3 xl:p-3.5 2xl:p-4 border border-slate-100 shadow-[0_3px_14px_rgba(0,112,243,0.06)] hover:shadow-md transition-shadow flex flex-col justify-between w-full box-border min-w-0">
          <div>
            <div className="w-6 h-6 sm:w-7 sm:h-7 2xl:w-8 2xl:h-8 rounded-lg bg-blue-50 border border-blue-100/80 text-[#0070F3] flex items-center justify-center mb-1.5 2xl:mb-2 shadow-xs shrink-0">
              <Clock size={14} />
            </div>
            <h4 className="text-[11px] sm:text-xs xl:text-[13px] 2xl:text-[15px] font-black text-[#0B1E3B] leading-tight mb-0.5 truncate">
              30-Minute Demo
            </h4>
            <p className="text-[9.5px] sm:text-[10.5px] xl:text-[11px] 2xl:text-[12.5px] text-slate-500 leading-tight font-medium line-clamp-2">
              A focused, no-pressure session with our product specialist.
            </p>
          </div>
        </div>

        {/* Card 3: AI-Powered Workflows */}
        <div className="bg-white rounded-2xl p-2.5 sm:p-3 xl:p-3.5 2xl:p-4 border border-slate-100 shadow-[0_3px_14px_rgba(0,112,243,0.06)] hover:shadow-md transition-shadow flex flex-col justify-between w-full box-border min-w-0">
          <div>
            <div className="w-6 h-6 sm:w-7 sm:h-7 2xl:w-8 2xl:h-8 rounded-lg bg-blue-50 border border-blue-100/80 text-[#0070F3] flex items-center justify-center mb-1.5 2xl:mb-2 shadow-xs shrink-0">
              <Sparkles size={14} />
            </div>
            <h4 className="text-[11px] sm:text-xs xl:text-[13px] 2xl:text-[15px] font-black text-[#0B1E3B] leading-tight mb-0.5 truncate">
              AI-Powered Workflows
            </h4>
            <p className="text-[9.5px] sm:text-[10.5px] xl:text-[11px] 2xl:text-[12.5px] text-slate-500 leading-tight font-medium line-clamp-2">
              Explore our latest AI features for smarter, faster healthcare.
            </p>
          </div>
        </div>

        {/* Card 4: No Commitment */}
        <div className="bg-white rounded-2xl p-2.5 sm:p-3 xl:p-3.5 2xl:p-4 border border-slate-100 shadow-[0_3px_14px_rgba(0,112,243,0.06)] hover:shadow-md transition-shadow flex flex-col justify-between w-full box-border min-w-0">
          <div>
            <div className="w-6 h-6 sm:w-7 sm:h-7 2xl:w-8 2xl:h-8 rounded-lg bg-blue-50 border border-blue-100/80 text-[#0070F3] flex items-center justify-center mb-1.5 2xl:mb-2 shadow-xs shrink-0">
              <ShieldCheck size={14} />
            </div>
            <h4 className="text-[11px] sm:text-xs xl:text-[13px] 2xl:text-[15px] font-black text-[#0B1E3B] leading-tight mb-0.5 truncate">
              No Commitment
            </h4>
            <p className="text-[9.5px] sm:text-[10.5px] xl:text-[11px] 2xl:text-[12.5px] text-slate-500 leading-tight font-medium line-clamp-2">
              Just a conversation to help you make the right decision.
            </p>
          </div>
        </div>
      </>
    );
  }

  // Helper: Render Scheduler Card (Calendar + Clock + Form)
  function renderSchedulerCard() {
    return (
      <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 min-[390px]:p-4 sm:p-6 lg:p-6 xl:p-7 2xl:p-9 border border-slate-100 shadow-[0_12px_44px_rgba(0,112,243,0.07)] relative w-full box-border min-w-0">
        
        {/* Header: Icon + Title + Subtitle */}
        <div className="flex items-center gap-2.5 sm:gap-3 2xl:gap-4 mb-3.5 sm:mb-4 2xl:mb-5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 2xl:w-12 2xl:h-12 rounded-xl sm:rounded-2xl bg-blue-50 border border-blue-100/80 text-[#0070F3] flex items-center justify-center shrink-0 shadow-xs">
            <Calendar size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-xl xl:text-2xl 2xl:text-[28px] font-black text-[#0B1E3B] tracking-tight leading-tight truncate">
              Schedule Your Demo
            </h2>
            <p className="text-[11px] sm:text-xs 2xl:text-sm text-slate-500 font-medium leading-snug truncate">
              Choose a date and time that works for you.
            </p>
          </div>
        </div>

        {/* Form-Level Error Summary directly below "Schedule Your Demo" heading */}
        {errorMessage && status !== 'success' && (
          <div 
            ref={errorSummaryRef}
            tabIndex={-1}
            role="alert" 
            aria-live="assertive"
            className="mb-3.5 p-3 sm:p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-start gap-2.5 shadow-xs focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            <AlertCircle size={17} className="text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-red-900 leading-tight">Unable to book your demo</p>
              <p className="text-red-700 text-[11px] sm:text-xs mt-0.5 leading-snug">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Auto-selected Next Available Date Notice */}
        {autoSelectedNotice && status !== 'success' && (
          <div className="mb-3.5 flex items-center gap-2 p-2.5 sm:p-3 rounded-xl bg-blue-50/90 border border-blue-200/90 text-[#0070F3] text-[10.5px] sm:text-xs font-semibold shadow-2xs">
            <Sparkles size={14} className="shrink-0 text-[#0070F3]" />
            <span className="flex-1 leading-snug">{autoSelectedNotice}</span>
          </div>
        )}

        {/* Inline Date Unavailable Error Notice (Requirement 8 & 10) */}
        {dateUnavailableMessage && status !== 'success' && (
          <div className="mb-3.5 flex items-center gap-2 p-2.5 sm:p-3 rounded-xl bg-red-50/90 border border-red-200/90 text-red-700 text-[10.5px] sm:text-xs font-semibold shadow-2xs">
            <AlertCircle size={14} className="shrink-0 text-red-600" />
            <span className="flex-1 leading-snug">{dateUnavailableMessage}</span>
            <button 
              type="button" 
              onClick={() => setDateUnavailableMessage('')}
              className="text-red-500 hover:text-red-700 text-xs font-bold px-1"
            >
              ✕
            </button>
          </div>
        )}

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
                onClick={handleScheduleAnother}
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm 2xl:text-base transition cursor-pointer min-h-[44px] 2xl:min-h-[48px]"
              >
                <span>Schedule Another Demo</span>
              </button>
            </div>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-3 min-[390px]:space-y-3.5 sm:space-y-4 w-full box-border">
            
            {/* ── DATE & TIME SELECTOR SECTION ── */}
            <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2 min-[375px]:gap-2.5 sm:gap-3 2xl:gap-4 w-full box-border">
              
              {/* LEFT: Select a Date */}
              <div className="space-y-1 w-full box-border min-w-0">
                <span id="demo-date-label" className="text-[10px] min-[375px]:text-[10.5px] sm:text-[11px] 2xl:text-xs font-bold text-[#0B1E3B] uppercase tracking-wider flex items-center gap-1">
                  <span>Select a Date</span>
                  <span className="text-red-500">*</span>
                </span>

                <div 
                  role="region" 
                  aria-labelledby="demo-date-label"
                  className="bg-slate-50/60 rounded-xl sm:rounded-2xl border border-slate-200/90 p-1.5 min-[375px]:p-2 sm:p-3 shadow-2xs w-full box-border"
                >
                  {/* Month Navigation */}
                  <div className="flex items-center justify-between mb-1.5 px-0.5">
                    <button
                      type="button"
                      disabled={isAtOrBeforeMinMonth}
                      onClick={handlePrevMonth}
                      title={isAtOrBeforeMinMonth ? "No previous dates available" : "Previous month"}
                      aria-label={isAtOrBeforeMinMonth ? "No previous dates available" : "Previous month"}
                      aria-disabled={isAtOrBeforeMinMonth}
                      className={`w-5 h-5 min-[375px]:w-6 min-[375px]:h-6 rounded-md flex items-center justify-center transition select-none ${
                        isAtOrBeforeMinMonth
                          ? 'opacity-30 cursor-not-allowed text-slate-400 hover:bg-transparent bg-transparent'
                          : 'text-slate-600 hover:bg-slate-200/70 cursor-pointer active:scale-95'
                      }`}
                    >
                      <ChevronLeft size={13} />
                    </button>
                    <span className="text-[10px] min-[375px]:text-[11px] sm:text-xs font-bold text-[#0B1E3B] truncate">
                      {monthName} {year}
                    </span>
                    <button
                      type="button"
                      disabled={isAtOrAfterMaxMonth}
                      onClick={handleNextMonth}
                      title={isAtOrAfterMaxMonth ? "No further dates available" : "Next month"}
                      aria-label={isAtOrAfterMaxMonth ? "No further dates available" : "Next month"}
                      aria-disabled={isAtOrAfterMaxMonth}
                      className={`w-5 h-5 min-[375px]:w-6 min-[375px]:h-6 rounded-md flex items-center justify-center transition select-none ${
                        isAtOrAfterMaxMonth
                          ? 'opacity-30 cursor-not-allowed text-slate-400 hover:bg-transparent bg-transparent'
                          : 'text-slate-600 hover:bg-slate-200/70 cursor-pointer active:scale-95'
                      }`}
                    >
                      <ChevronRight size={13} />
                    </button>
                  </div>

                  {/* Graceful banner if no dates available in a future month */}
                  {availabilityData && !availabilityData.hasAvailableDates && (
                    <div className="text-[8.5px] text-amber-700 bg-amber-50 border border-amber-200/90 rounded-md p-1 mb-1 text-center font-semibold leading-tight">
                      No bookable dates in {monthName}. Please choose an upcoming month.
                    </div>
                  )}

                  {/* Day of Week Headers */}
                  <div className="grid grid-cols-7 gap-0.5 text-center mb-0.5" aria-hidden="true">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                      <span key={d} className="text-[8px] min-[375px]:text-[8.5px] sm:text-[9.5px] font-semibold text-slate-400">
                        {d}
                      </span>
                    ))}
                  </div>

                  {/* Calendar Day Numbers Grid with Explicit State Model */}
                  <div className="grid grid-cols-7 gap-0.5 text-center" role="grid" aria-label="Calendar dates">
                    {calendarDays.map((dayObj, i) => {
                      const isSelected = selectedDate && selectedDate.toDateString() === dayObj.date.toDateString() && dayObj.isCurrentMonth;
                      const isNoSlotsState = dayObj.state === DATE_STATE.FUTURE_NO_SLOTS || dayObj.state === DATE_STATE.TODAY_NO_SLOTS;

                      let cellStyling = '';
                      let cellTitle = '';

                      if (isSelected) {
                        cellStyling = 'bg-[#0070F3] text-white font-bold shadow-xs cursor-pointer';
                        cellTitle = `Selected: ${dayObj.date.toLocaleDateString()}`;
                      } else if (!dayObj.isCurrentMonth || dayObj.state === DATE_STATE.PAST) {
                        cellStyling = 'text-slate-300 opacity-40 cursor-not-allowed';
                        cellTitle = dayObj.isCurrentMonth ? 'Past date' : '';
                      } else if (isNoSlotsState) {
                        cellStyling = 'text-red-500/80 bg-red-50/50 hover:bg-red-100/60 border border-red-200/50 font-semibold cursor-pointer';
                        cellTitle = "No demo slots available for this date";
                      } else {
                        // Selectable future date or today with slots (including Sundays)
                        cellStyling = 'text-slate-700 hover:bg-blue-50 cursor-pointer font-medium';
                        cellTitle = `Select ${dayObj.date.toLocaleDateString()}`;
                      }

                      return (
                        <button
                          key={i}
                          type="button"
                          disabled={!dayObj.isCurrentMonth || dayObj.state === DATE_STATE.PAST}
                          onClick={() => handleSelectDay(dayObj)}
                          aria-selected={isSelected}
                          aria-label={cellTitle}
                          title={cellTitle}
                          className={`w-5 h-5 min-[375px]:w-5.5 min-[375px]:h-5.5 min-[390px]:w-6 min-[390px]:h-6 sm:w-7 sm:h-7 rounded-full text-[8.5px] min-[375px]:text-[9.5px] min-[390px]:text-[10px] sm:text-[11px] flex items-center justify-center mx-auto transition-all ${cellStyling}`}
                        >
                          {dayObj.dayNumber}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {errors.selectedDate && <p className="text-[9px] min-[375px]:text-[10px] 2xl:text-xs text-red-500 mt-0.5 font-bold">{errors.selectedDate}</p>}
              </div>

              {/* RIGHT: Select a Time */}
              <div className="space-y-1 w-full box-border min-w-0">
                <span id="demo-time-label" className="text-[10px] min-[375px]:text-[10.5px] sm:text-[11px] 2xl:text-xs font-bold text-[#0B1E3B] uppercase tracking-wider flex items-center gap-1">
                  <span>Select a Time</span>
                  <span className="text-red-500">*</span>
                </span>

                <div 
                  role="region"
                  aria-labelledby="demo-time-label"
                  className="bg-slate-50/60 rounded-xl sm:rounded-2xl border border-slate-200/90 p-1.5 min-[375px]:p-2 sm:p-3 shadow-2xs flex flex-col items-center justify-between min-h-[175px] min-[375px]:min-h-[185px] sm:min-h-[200px] w-full box-border"
                >
                  
                  {/* ⏱️ Analog Clock Face */}
                  <div className="relative w-16 h-16 min-[375px]:w-18 min-[375px]:h-18 sm:w-20 sm:h-20 2xl:w-22 2xl:h-22 rounded-full border border-slate-200 flex items-center justify-center my-0.5 bg-white shadow-2xs shrink-0" aria-hidden="true">
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
                  <div className={`px-2.5 py-0.5 rounded-full border font-black text-[9.5px] min-[375px]:text-[10.5px] sm:text-[11px] my-0.5 transition-colors ${
                    selectedTimeSlot 
                      ? 'bg-blue-50 border-blue-200/90 text-[#0070F3]' 
                      : 'bg-amber-50 border-amber-200/90 text-amber-700'
                  }`}>
                    {selectedTimeSlot ? selectedTimeSlot.label : 'No slot selected'}
                  </div>

                  {/* Available Time Slots Grid or Empty Notice */}
                  {availableTimeSlots.length > 0 ? (
                    <div className="grid grid-cols-3 gap-0.5 min-[375px]:gap-1 w-full box-border" role="group" aria-label="Available demo time slots">
                      {availableTimeSlots.map((slot) => {
                        const isSelected = selectedTimeSlot?.label === slot.label;
                        return (
                          <button
                            key={slot.label}
                            type="button"
                            onClick={() => {
                              setSelectedTimeSlot(slot);
                              if (errors.selectedTime) {
                                setErrors(prev => ({ ...prev, selectedTime: null }));
                              }
                            }}
                            aria-pressed={isSelected}
                            aria-label={`Select ${slot.label}`}
                            className={`py-0.5 min-[375px]:py-1 px-0.5 rounded-md text-[7.5px] min-[375px]:text-[8.5px] sm:text-[9.5px] font-bold border transition text-center truncate ${
                              isSelected
                                ? 'bg-[#0070F3] text-white border-[#0070F3] shadow-xs cursor-pointer'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:text-[#0070F3] cursor-pointer'
                            }`}
                          >
                            {slot.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : isSelectedDateToday ? (
                    <div className="w-full text-center px-1.5 py-2 bg-amber-50/90 border border-amber-200/90 rounded-xl my-0.5 box-border">
                      <p className="text-[9px] min-[375px]:text-[9.5px] sm:text-[10.5px] font-bold text-amber-900 leading-tight">
                        No time slots available for today.
                      </p>
                      <p className="text-[8px] min-[375px]:text-[8.5px] sm:text-[9.5px] text-amber-700 font-medium mt-0.5 leading-tight">
                        Please select another date.
                      </p>
                    </div>
                  ) : (
                    <div className="w-full text-center px-1.5 py-2 bg-slate-50 border border-slate-200 rounded-xl my-0.5 box-border">
                      <p className="text-[9px] min-[375px]:text-[9.5px] sm:text-[10.5px] font-bold text-slate-700 leading-tight">
                        No demo slots are currently available.
                      </p>
                      <p className="text-[8px] min-[375px]:text-[8.5px] sm:text-[9.5px] text-slate-500 font-medium mt-0.5 leading-tight">
                        Please check again later or contact support.
                      </p>
                    </div>
                  )}

                </div>
                {errors.selectedTime && <p className="text-[9px] min-[375px]:text-[10px] 2xl:text-xs text-red-500 mt-0.5 font-bold">{errors.selectedTime}</p>}
              </div>

            </div>

            {/* ── FORM FIELDS SECTION (TC-18: Unique IDs, Labels, Required Attributes) ── */}
            
            {/* Row 1: Full Name + Work Email */}
            <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2 min-[375px]:gap-2.5 sm:gap-3 2xl:gap-4 w-full box-border">
              {/* Full Name */}
              <div className="w-full box-border min-w-0">
                <label htmlFor="demo-full-name" className="block text-[9.5px] min-[375px]:text-[10.5px] sm:text-[11px] 2xl:text-xs font-bold text-[#0B1E3B] uppercase tracking-wider mb-1 truncate">
                  FULL NAME <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User size={13} className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    id="demo-full-name"
                    name="fullName"
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Enter full name"
                    className={`w-full bg-slate-50/70 border rounded-xl pl-9 min-[375px]:pl-9.5 sm:pl-10 2xl:pl-11 pr-2.5 py-1.5 min-[375px]:py-2 sm:py-2.5 2xl:py-3 min-h-[36px] min-[375px]:min-h-[40px] sm:min-h-[44px] 2xl:min-h-[50px] text-[11px] min-[375px]:text-xs 2xl:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 font-medium transition box-border ${
                      errors.fullName 
                        ? 'border-red-400 bg-red-50/30 focus:border-red-400 focus:ring-red-400/20' 
                        : formData.fullName.trim() && !errors.fullName
                        ? 'border-emerald-400/80 bg-emerald-50/15 focus:border-emerald-500 focus:ring-emerald-500/20'
                        : 'border-slate-200 focus:border-blue-300 focus:ring-[#0070F3]/30'
                    }`}
                  />
                  {formData.fullName.trim() && !errors.fullName && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none flex items-center">
                      <Check size={14} strokeWidth={2.5} />
                    </div>
                  )}
                </div>
                {errors.fullName && <p className="text-[9px] min-[375px]:text-[10px] 2xl:text-xs text-red-500 mt-0.5 font-bold">{errors.fullName}</p>}
              </div>

              {/* Work Email */}
              <div className="w-full box-border min-w-0">
                <label htmlFor="demo-work-email" className="block text-[9.5px] min-[375px]:text-[10.5px] sm:text-[11px] 2xl:text-xs font-bold text-[#0B1E3B] uppercase tracking-wider mb-1 truncate">
                  WORK EMAIL <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail size={13} className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    id="demo-work-email"
                    name="workEmail"
                    type="email"
                    required
                    value={formData.workEmail}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Enter work email"
                    className={`w-full bg-slate-50/70 border rounded-xl pl-9 min-[375px]:pl-9.5 sm:pl-10 2xl:pl-11 pr-8 py-1.5 min-[375px]:py-2 sm:py-2.5 2xl:py-3 min-h-[36px] min-[375px]:min-h-[40px] sm:min-h-[44px] 2xl:min-h-[50px] text-[11px] min-[375px]:text-xs 2xl:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 font-medium transition box-border ${
                      errors.workEmail 
                        ? 'border-red-400 bg-red-50/30 focus:border-red-400 focus:ring-red-400/20' 
                        : isEmailValid 
                        ? 'border-emerald-400/80 bg-emerald-50/15 focus:border-emerald-500 focus:ring-emerald-500/20' 
                        : 'border-slate-200 focus:border-blue-300 focus:ring-[#0070F3]/30'
                    }`}
                  />
                  {isEmailValid && !errors.workEmail && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none flex items-center">
                      <Check size={14} strokeWidth={2.5} />
                    </div>
                  )}
                </div>
                {errors.workEmail && <p className="text-[9px] min-[375px]:text-[10px] 2xl:text-xs text-red-500 mt-0.5 font-bold">{errors.workEmail}</p>}
              </div>
            </div>

            {/* Row 2: Phone Number + Clinic / Hospital Name */}
            <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2 min-[375px]:gap-2.5 sm:gap-3 2xl:gap-4 w-full box-border">
              {/* Phone Number */}
              <div className="w-full box-border min-w-0">
                <label htmlFor="demo-phone-number" className="block text-[9.5px] min-[375px]:text-[10.5px] sm:text-[11px] 2xl:text-xs font-bold text-[#0B1E3B] uppercase tracking-wider mb-1 truncate">
                  PHONE NUMBER <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone size={13} className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    id="demo-phone-number"
                    name="phoneNumber"
                    type="tel"
                    maxLength={10}
                    required
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    onKeyDown={handlePhoneKeyDown}
                    onPaste={handlePhonePaste}
                    onBlur={handleBlur}
                    placeholder="Enter 10-digit number"
                    className={`w-full bg-slate-50/70 border rounded-xl pl-9 min-[375px]:pl-9.5 sm:pl-10 2xl:pl-11 pr-8 py-1.5 min-[375px]:py-2 sm:py-2.5 2xl:py-3 min-h-[36px] min-[375px]:min-h-[40px] sm:min-h-[44px] 2xl:min-h-[50px] text-[11px] min-[375px]:text-xs 2xl:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 font-medium transition box-border ${
                      errors.phoneNumber 
                        ? 'border-red-400 bg-red-50/30 focus:border-red-400 focus:ring-red-400/20' 
                        : isPhoneValid 
                        ? 'border-emerald-400/80 bg-emerald-50/15 focus:border-emerald-500 focus:ring-emerald-500/20' 
                        : 'border-slate-200 focus:border-blue-300 focus:ring-[#0070F3]/30'
                    }`}
                  />
                  {isPhoneValid && !errors.phoneNumber && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none flex items-center">
                      <Check size={14} strokeWidth={2.5} />
                    </div>
                  )}
                </div>
                {errors.phoneNumber && <p className="text-[9px] min-[375px]:text-[10px] 2xl:text-xs text-red-500 mt-0.5 font-bold">{errors.phoneNumber}</p>}
              </div>

              {/* Clinic / Hospital Name */}
              <div className="w-full box-border min-w-0">
                <label htmlFor="demo-clinic-name" className="block text-[9.5px] min-[375px]:text-[10.5px] sm:text-[11px] 2xl:text-xs font-bold text-[#0B1E3B] uppercase tracking-wider mb-1 truncate">
                  CLINIC / HOSPITAL NAME <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building2 size={13} className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    id="demo-clinic-name"
                    name="clinicName"
                    type="text"
                    required
                    value={formData.clinicName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Enter clinic name"
                    className={`w-full bg-slate-50/70 border rounded-xl pl-9 min-[375px]:pl-9.5 sm:pl-10 2xl:pl-11 pr-2.5 py-1.5 min-[375px]:py-2 sm:py-2.5 2xl:py-3 min-h-[36px] min-[375px]:min-h-[40px] sm:min-h-[44px] 2xl:min-h-[50px] text-[11px] min-[375px]:text-xs 2xl:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 font-medium transition box-border ${
                      errors.clinicName 
                        ? 'border-red-400 bg-red-50/30 focus:border-red-400 focus:ring-red-400/20' 
                        : formData.clinicName.trim() && !errors.clinicName
                        ? 'border-emerald-400/80 bg-emerald-50/15 focus:border-emerald-500 focus:ring-emerald-500/20'
                        : 'border-slate-200 focus:border-blue-300 focus:ring-[#0070F3]/30'
                    }`}
                  />
                  {formData.clinicName.trim() && !errors.clinicName && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none flex items-center">
                      <Check size={14} strokeWidth={2.5} />
                    </div>
                  )}
                </div>
                {errors.clinicName && <p className="text-[9px] min-[375px]:text-[10px] 2xl:text-xs text-red-500 mt-0.5 font-bold">{errors.clinicName}</p>}
              </div>
            </div>

            {/* Row 3: Number of Doctors + What would you like to see */}
            <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2 min-[375px]:gap-2.5 sm:gap-3 2xl:gap-4 w-full box-border">
              {/* Number of Doctors Dropdown */}
              <div className="w-full box-border min-w-0">
                <label htmlFor="demo-doctors-count" className="block text-[9.5px] min-[375px]:text-[10.5px] sm:text-[11px] 2xl:text-xs font-bold text-[#0B1E3B] uppercase tracking-wider mb-1 truncate">
                  NUMBER OF DOCTORS <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Users size={13} className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <select
                    id="demo-doctors-count"
                    name="doctorsCount"
                    required
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
                <label htmlFor="demo-topics" className="block text-[9.5px] min-[375px]:text-[10.5px] sm:text-[11px] 2xl:text-xs font-bold text-[#0B1E3B] uppercase tracking-wider mb-1 truncate">
                  WHAT WOULD YOU LIKE TO SEE? <span className="text-slate-400 font-normal lowercase text-[8.5px] min-[375px]:text-[9.5px]">(Optional)</span>
                </label>
                <div className="relative">
                  <FileText size={13} className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    id="demo-topics"
                    name="topics"
                    type="text"
                    value={formData.topics}
                    onChange={handleChange}
                    placeholder="e.g. EMR, Billing, Pharmacy..."
                    className="w-full bg-slate-50/70 border border-slate-200 rounded-xl pl-9 min-[375px]:pl-9.5 sm:pl-10 2xl:pl-11 pr-2.5 py-1.5 min-[375px]:py-2 sm:py-2.5 2xl:py-3 min-h-[36px] min-[375px]:min-h-[40px] sm:min-h-[44px] 2xl:min-h-[50px] text-[11px] min-[375px]:text-xs 2xl:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0070F3]/30 font-medium transition box-border"
                  />
                </div>
              </div>
            </div>

            {/* Privacy & Terms Checkbox (TC-18: required, id="demo-privacy-consent", name="privacyConsent") */}
            <div className="pt-0.5">
              <div className="flex items-start gap-2 select-none text-[10px] min-[375px]:text-[11px] sm:text-xs 2xl:text-sm text-slate-600 font-medium">
                <input
                  id="demo-privacy-consent"
                  name="privacyConsent"
                  type="checkbox"
                  required
                  checked={formData.privacyConsent}
                  onChange={handleChange}
                  className="w-3.5 h-3.5 min-[375px]:w-4 min-[375px]:h-4 2xl:w-5 2xl:h-5 rounded border-slate-300 text-[#0070F3] focus:ring-[#0070F3]/40 cursor-pointer mt-0.5 shrink-0"
                />
                <label htmlFor="demo-privacy-consent" className="leading-snug cursor-pointer">
                  I agree to the <Link to="/" className="text-[#0070F3] hover:underline font-semibold">Privacy Policy</Link> and <Link to="/" className="text-[#0070F3] hover:underline font-semibold">Terms of Service</Link>.
                </label>
              </div>
              {errors.privacyConsent && <p className="text-[9px] min-[375px]:text-[10px] 2xl:text-xs text-red-500 mt-0.5 font-bold">{errors.privacyConsent}</p>}
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
