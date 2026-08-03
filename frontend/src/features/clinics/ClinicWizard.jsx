import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Link } from 'react-router-dom';
import { clinicApi, promoApi } from '../../lib/api';
import useAuth from '../../hooks/useAuth';
import {
  User, Mail, Phone, Lock, Calendar, MapPin,
  CreditCard, Check, ArrowRight, ArrowLeft, ShieldCheck,
  Clock, Plus, Trash, Globe, FileText, CheckCircle, HelpCircle, UploadCloud, Heart, Building2, X, RefreshCw,
  Eye, EyeOff, Shield, Award, CheckSquare, PhoneCall, HelpCircle as HelpIcon, Sparkles, MessageSquare,
  ChevronRight, ArrowLeft as ArrowLeftIcon, Play, ChevronLeft
} from 'lucide-react';
import MapPicker from '../../components/common/MapPicker';
import PehalLogo from '../../components/common/PehalLogo';
import { motion, AnimatePresence } from 'framer-motion';

// ──────────────────────────────────────────────────────────────────────
// AGE VALIDATION HELPERS
// ──────────────────────────────────────────────────────────────────────
const validateDOB = (dateStr) => {
  if (!dateStr) return { valid: false, error: 'Date of birth is required.' };
  const dob = new Date(dateStr);
  if (isNaN(dob.getTime())) return { valid: false, error: 'Please enter a valid date of birth.' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dob > today) return { valid: false, error: 'Date of birth cannot be a future date.' };
  // Accurate age calculation
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  if (age < 18) return { valid: false, error: 'You must be at least 18 years old to register a clinic.' };
  if (age > 120) return { valid: false, error: 'Please enter a valid date of birth.' };
  return { valid: true, error: '' };
};

// ──────────────────────────────────────────────────────────────────────
// PORTAL-BASED DATE PICKER (Fixes overflow clipping)
// ──────────────────────────────────────────────────────────────────────
const CustomDatePicker = ({ value, onChange, onValidate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [popupStyle, setPopupStyle] = useState({});
  const [inputText, setInputText] = useState('');
  const triggerRef = useRef(null);
  const popupRef = useRef(null);
  const today = new Date();

  // Parse value into display text (DD/MM/YYYY)
  const formatDisplay = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  // Initialize inputText from value
  useEffect(() => {
    setInputText(formatDisplay(value));
  }, [value]);

  // Build the initial calendar date from value (default: year 2000)
  const parseISOtoDate = (isoStr) => {
    if (!isoStr) return new Date(1990, 0, 1);
    const d = new Date(isoStr);
    return isNaN(d.getTime()) ? new Date(1990, 0, 1) : d;
  };

  const [calDate, setCalDate] = useState(() => parseISOtoDate(value));

  useEffect(() => {
    if (value) setCalDate(parseISOtoDate(value));
  }, [value]);

  const calYear = calDate.getFullYear();
  const calMonth = calDate.getMonth();

  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const years = [];
  for (let y = today.getFullYear(); y >= today.getFullYear() - 120; y--) years.push(y);

  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  // Compute popup position (portal: absolute to viewport)
  const computePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popupH = 340;
    const popupW = 288;
    let top = rect.bottom + window.scrollY + 6;
    let left = rect.left + window.scrollX;
    if (rect.bottom + popupH > window.innerHeight) {
      top = rect.top + window.scrollY - popupH - 6;
    }
    if (left + popupW > window.innerWidth) {
      left = window.innerWidth - popupW - 16;
    }
    setPopupStyle({ top, left, width: Math.max(rect.width, popupW) });
  }, []);

  const openCalendar = () => {
    computePosition();
    setIsOpen(true);
  };

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => { if (e.key === 'Escape') setIsOpen(false); };
    const handleClick = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        popupRef.current && !popupRef.current.contains(e.target)
      ) setIsOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [isOpen]);

  const emitChange = (isoStr) => {
    onChange(isoStr);
    setInputText(formatDisplay(isoStr));
    if (onValidate) onValidate(isoStr);
  };

  const handleDateSelect = (day) => {
    if (!day) return;
    const selected = new Date(calYear, calMonth, day);
    const yyyy = selected.getFullYear();
    const mm = String(selected.getMonth() + 1).padStart(2, '0');
    const dd = String(selected.getDate()).padStart(2, '0');
    emitChange(`${yyyy}-${mm}-${dd}`);
    setIsOpen(false);
  };

  // Parse manual text input (DD/MM/YYYY or YYYY-MM-DD)
  const handleInputBlur = () => {
    const text = inputText.trim();
    if (!text) { onChange(''); if (onValidate) onValidate(''); return; }
    let parsed = null;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
      const [dd, mm, yyyy] = text.split('/');
      parsed = new Date(`${yyyy}-${mm}-${dd}`);
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      parsed = new Date(text);
    }
    if (parsed && !isNaN(parsed.getTime())) {
      const yyyy = parsed.getFullYear();
      const mm = String(parsed.getMonth() + 1).padStart(2, '0');
      const dd = String(parsed.getDate()).padStart(2, '0');
      const isoStr = `${yyyy}-${mm}-${dd}`;
      emitChange(isoStr);
      setCalDate(parsed);
    } else {
      setInputText(formatDisplay(value));
    }
  };

  const selectedDate = value ? new Date(value) : null;

  return (
    <>
      {/* Trigger field */}
      <div ref={triggerRef} className="relative">
        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
        <input
          type="text"
          placeholder="DD/MM/YYYY"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onBlur={handleInputBlur}
          onFocus={openCalendar}
          className="w-full pl-9 pr-9 py-3 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100 transition text-sm text-slate-800"
          aria-label="Date of Birth"
          aria-haspopup="true"
          aria-expanded={isOpen}
          autoComplete="off"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => isOpen ? setIsOpen(false) : openCalendar()}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
          aria-label="Open calendar"
        >
          <Calendar size={14} />
        </button>
      </div>

      {/* Portal calendar popup */}
      {isOpen && createPortal(
        <div
          ref={popupRef}
          style={{
            position: 'absolute',
            top: popupStyle.top,
            left: popupStyle.left,
            width: popupStyle.width || 288,
            zIndex: 99999,
          }}
          className="bg-white border border-slate-200 rounded-2xl shadow-2xl p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Date picker calendar"
        >
          {/* Month / Year selectors */}
          <div className="flex items-center gap-2 mb-3">
            <button
              type="button"
              onClick={() => setCalDate(new Date(calYear, calMonth - 1, 1))}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition text-slate-500"
              aria-label="Previous month"
            >
              <ChevronLeft size={14} />
            </button>
            <select
              value={calMonth}
              onChange={(e) => setCalDate(new Date(calYear, Number(e.target.value), 1))}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 font-bold outline-none"
              aria-label="Select month"
            >
              {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <select
              value={calYear}
              onChange={(e) => setCalDate(new Date(Number(e.target.value), calMonth, 1))}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 font-bold outline-none w-20"
              aria-label="Select year"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button
              type="button"
              onClick={() => setCalDate(new Date(calYear, calMonth + 1, 1))}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition text-slate-500"
              aria-label="Next month"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
              <div key={d} className="h-7 flex items-center justify-center text-[10px] font-extrabold text-slate-400">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7">
            {days.map((day, idx) => {
              const isToday = day && today.getDate() === day && today.getMonth() === calMonth && today.getFullYear() === calYear;
              const isSelected = day && selectedDate &&
                selectedDate.getDate() === day &&
                selectedDate.getMonth() === calMonth &&
                selectedDate.getFullYear() === calYear;
              const isFuture = day && new Date(calYear, calMonth, day) > today;
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={!day || isFuture}
                  onClick={() => handleDateSelect(day)}
                  className={`h-8 w-full flex items-center justify-center rounded-lg text-xs font-semibold transition ${
                    !day ? 'invisible' :
                    isFuture ? 'text-slate-300 cursor-not-allowed' :
                    isSelected ? 'bg-green-600 text-white font-black shadow-sm' :
                    isToday ? 'border border-green-400 text-green-700 font-black' :
                    'text-slate-700 hover:bg-green-50 hover:text-green-700'
                  }`}
                  aria-label={day ? `${day} ${months[calMonth]} ${calYear}` : undefined}
                  aria-pressed={isSelected}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-center">
            <button
              type="button"
              onClick={() => { emitChange(''); setIsOpen(false); }}
              className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[10px] font-bold text-green-600 hover:text-green-800 transition"
            >
              Close
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

const STEPS = [
  { id: 1, name: "Owner Details", desc: "Credentials & security", duration: "2 min" },
  { id: 2, name: "Doctor Setup", desc: "Add medical practitioners", duration: "3 min" },
  { id: 3, name: "Department Setup", desc: "Configure specialties", duration: "2 min" },
  { id: 4, name: "Branch Setup", desc: "Manage clinic locations", duration: "2 min" },
  { id: 5, name: "Staff Setup", desc: "Configure roles & accounts", duration: "3 min" },
  { id: 6, name: "Healthcare Setup", desc: "Configure Pharmacy & Labs", duration: "2 min" },
  { id: 7, name: "AI Modules", desc: "Enable AI consultation tools", duration: "2 min" },
  { id: 8, name: "Video Consultation", desc: "Configure telemedicine settings", duration: "1 min" },
  { id: 9, name: "Clinic Schedule", desc: "Set working hours & shifts", duration: "2 min" },
  { id: 10, name: "Review & Launch", desc: "Verify and deploy", duration: "1 min" }
];

// Helper to convert AM/PM time to minutes from midnight
const timeToMinutes = (tStr) => {
  if (!tStr || tStr === 'Closed') return null;
  const match = tStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

// Check for overlapping shifts
const checkShiftOverlaps = (shifts) => {
  const activeShifts = shifts.map(s => {
    const start = timeToMinutes(s.startTime);
    const end = timeToMinutes(s.endTime);
    return { start, end };
  }).filter(s => s.start !== null && s.end !== null);

  for (let i = 0; i < activeShifts.length; i++) {
    const s1 = activeShifts[i];
    if (s1.end <= s1.start) {
      return { invalidRange: true, error: 'End time must be after start time.' };
    }
    for (let j = i + 1; j < activeShifts.length; j++) {
      const s2 = activeShifts[j];
      if (s1.start < s2.end && s2.start < s1.end) {
        return { overlap: true, error: 'Time ranges cannot overlap.' };
      }
    }
  }
  return { valid: true };
};

// Custom searchable TimePicker with 15m intervals
const TimePicker = ({ value, onChange, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  const times = [];
  for (let h = 0; h < 24; h++) {
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    const ampm = h >= 12 ? 'PM' : 'AM';
    for (let m = 0; m < 60; m += 15) {
      const minStr = String(m).padStart(2, '0');
      const hourStr = String(hour12).padStart(2, '0');
      times.push(`${hourStr}:${minStr} ${ampm}`);
    }
  }

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = times.filter(t => t.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative w-28" ref={containerRef}>
      <input
        type="text"
        disabled={disabled}
        readOnly
        value={value}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-center outline-none cursor-pointer focus:border-green-500 transition ${disabled ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'text-slate-800'}`}
      />
      {isOpen && (
        <div className="absolute z-[9999] mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto p-1">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-2 py-1 mb-1 border border-slate-200 rounded-lg text-[10px] outline-none focus:border-green-500 font-bold"
            autoFocus
          />
          <div className="space-y-0.5">
            {filtered.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => { onChange(t); setIsOpen(false); }}
                className="w-full text-left px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-green-50 hover:text-green-700 rounded-lg transition"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default function ClinicWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [progress, setProgress] = useState(0);
  const [plans, setPlans] = useState([]);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [wizardError, setWizardError] = useState('');
  const [mapTarget, setMapTarget] = useState('clinic');
  const [ownerEmailValidation, setOwnerEmailValidation] = useState(null);
  const [ownerPhoneValidation, setOwnerPhoneValidation] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const emailTimeout = useRef(null);
  const phoneTimeout = useRef(null);

  const [errors, setErrors] = useState({});
  const [uploadProgress, setUploadProgress] = useState({});
  const [localPreviews, setLocalPreviews] = useState({});
  const [regNumValidation, setRegNumValidation] = useState(null);
  const regNumTimeout = useRef(null);

  // Form states
  const [ownerForm, setOwnerForm] = useState({
    name: '',
    designation: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    dob: '',
    gender: '',
    address: '',
    aadhaar: '',
    pan: '',
    profilePhoto: '',
    nationality: 'Indian',
    preferredLanguage: 'English'
  });

  const [clinicForm, setClinicForm] = useState({
    name: '',
    clinicType: 'General Clinic',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    latitude: 26.8467,
    longitude: 80.9462,
    contactNumber: '',
    emailAddress: '',
    logo: '',
    description: '',
    registrationNumber: '',
    establishedYear: '',
    specialties: '',
    timings: [
      { dayRange: 'Monday - Friday', startTime: '09:00 AM', endTime: '08:00 PM' },
      { dayRange: 'Saturday', startTime: '09:00 AM', endTime: '02:00 PM' }
    ],
    closedOnSunday: true,
    consultationMode: 'Hybrid',
    languagesSpoken: 'English, Hindi',
    shortDescription: '',
    images: []
  });

  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [showMapPicker, setShowMapPicker] = useState(false);

  // Doctors Setup States
  const [doctors, setDoctors] = useState([
    { id: 'doc-1', name: 'Dr. Rahul Sharma', specialty: 'Cardiology', email: 'rahul.sharma@clinic.com', phone: '9876543210', verified: true }
  ]);
  const [doctorForm, setDoctorForm] = useState({ name: '', specialty: 'General Medicine', email: '', phone: '' });
  const [showAddDoctor, setShowAddDoctor] = useState(false);

  // Departments / Specialties Setup States
  const [departments, setDepartments] = useState([
    { name: 'Cardiology', doctorsCount: 2, active: true, color: 'blue' },
    { name: 'Neurology', doctorsCount: 1, active: true, color: 'purple' },
    { name: 'Orthopedics', doctorsCount: 1, active: true, color: 'indigo' },
    { name: 'Pediatrics', doctorsCount: 0, active: false, color: 'red' },
    { name: 'General Medicine', doctorsCount: 1, active: true, color: 'green' }
  ]);
  const [showAddDept, setShowAddDept] = useState(false);
  const [deptFormName, setDeptFormName] = useState('');

  // Branch Setup States
  const [branches, setBranches] = useState([
    { id: 'branch-1', name: 'Main Branch', address: '123, MG Road, Bengaluru, Karnataka - 560001', contact: '9876543210', manager: 'Shambhu Ram', active: true, isPrimary: true }
  ]);
  const [branchForm, setBranchForm] = useState({ name: '', address: '', contact: '', manager: '', active: true });
  const [showAddBranch, setShowAddBranch] = useState(false);

  // Staff Setup States
  const [staff, setStaff] = useState([
    { id: 'staff-1', name: 'Priya Sharma', role: 'Receptionist', email: 'priya@clinic.com', phone: '9876543210', active: true },
    { id: 'staff-2', name: 'Amit Verma', role: 'Pharmacist', email: 'amit@clinic.com', phone: '9876543211', active: true },
    { id: 'staff-3', name: 'Neha Patel', role: 'Lab Technician', email: 'neha@clinic.com', phone: '9876543212', active: true }
  ]);
  const [staffForm, setStaffForm] = useState({ name: '', role: 'Receptionist', email: '', phone: '', active: true });
  const [showAddStaff, setShowAddStaff] = useState(false);

  // Healthcare Module Setup States
  const [pharmacyName, setPharmacyName] = useState('City Pharmacy');
  const [pharmacyContact, setPharmacyContact] = useState('9876543210');
  const [pharmacyActive, setPharmacyActive] = useState(true);
  const [labName, setLabName] = useState('Central Lab');
  const [labContact, setLabContact] = useState('9876543210');
  const [labActive, setLabActive] = useState(true);

  // AI Modules Configuration States
  const [aiFeatures, setAiFeatures] = useState({
    voiceTranscription: true,
    consultationAssistant: true,
    symptomChecker: true,
    prescriptionSuggestions: true,
    riskScoring: false,
    labRecommendation: false,
    appointmentIntel: false,
    followUpReminders: false
  });

  // Video Consultations Setup States
  const [videoProvider, setVideoProvider] = useState('Zoom');
  const [videoFee, setVideoFee] = useState('500');
  const [videoDuration, setVideoDuration] = useState('15');
  const [videoWaitingRoom, setVideoWaitingRoom] = useState(true);
  const [videoRecording, setVideoRecording] = useState(true);
  const [videoReminders, setVideoReminders] = useState(true);

  // Smart Scheduling States
  const [scheduleType, setScheduleType] = useState('Monday - Friday');
  const [scheduleDays, setScheduleDays] = useState([
    { id: '1', dayRange: 'Monday - Friday', shifts: [{ startTime: '09:00 AM', endTime: '08:00 PM' }], closed: false }
  ]);

  const handleScheduleTypeChange = (type) => {
    setScheduleType(type);
    let daysList = [];
    if (type === 'Monday - Friday') {
      daysList = [{ id: '1', dayRange: 'Monday - Friday', shifts: [{ startTime: '09:00 AM', endTime: '08:00 PM' }], closed: false }];
    } else if (type === 'Monday - Saturday') {
      daysList = [{ id: '1', dayRange: 'Monday - Saturday', shifts: [{ startTime: '09:00 AM', endTime: '08:00 PM' }], closed: false }];
    } else if (type === 'Monday - Sunday') {
      daysList = [{ id: '1', dayRange: 'Monday - Sunday', shifts: [{ startTime: '09:00 AM', endTime: '08:00 PM' }], closed: false }];
    } else if (type === 'Tuesday - Saturday') {
      daysList = [{ id: '1', dayRange: 'Tuesday - Saturday', shifts: [{ startTime: '09:00 AM', endTime: '08:00 PM' }], closed: false }];
    } else if (type === 'Tuesday - Sunday') {
      daysList = [{ id: '1', dayRange: 'Tuesday - Sunday', shifts: [{ startTime: '09:00 AM', endTime: '08:00 PM' }], closed: false }];
    } else if (type === 'Wednesday - Sunday') {
      daysList = [{ id: '1', dayRange: 'Wednesday - Sunday', shifts: [{ startTime: '09:00 AM', endTime: '08:00 PM' }], closed: false }];
    } else if (type === 'Weekdays') {
      daysList = [{ id: '1', dayRange: 'Monday - Friday', shifts: [{ startTime: '09:00 AM', endTime: '08:00 PM' }], closed: false }];
    } else if (type === 'Weekends') {
      daysList = [{ id: '1', dayRange: 'Saturday - Sunday', shifts: [{ startTime: '09:00 AM', endTime: '08:00 PM' }], closed: false }];
    } else if (type === 'Individual Days') {
      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      daysList = dayNames.map((d, idx) => ({
        id: String(idx + 1),
        dayRange: d,
        shifts: [{ startTime: '09:00 AM', endTime: '08:00 PM' }],
        closed: d === 'Sunday'
      }));
    }
    setScheduleDays(daysList);
  };

  // Keep clinicForm.timings synchronized in real-time
  useEffect(() => {
    const formatted = [];
    scheduleDays.forEach(d => {
      if (d.closed) {
        formatted.push({
          dayRange: d.dayRange,
          startTime: 'Closed',
          endTime: 'Closed'
        });
      } else {
        d.shifts.forEach(s => {
          formatted.push({
            dayRange: d.dayRange,
            startTime: s.startTime,
            endTime: s.endTime
          });
        });
      }
    });
    setClinicForm(prev => ({ ...prev, timings: formatted }));
  }, [scheduleDays]);

  // Fetch plans
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await clinicApi.getRegistrationPlans();
        setPlans(response.data.plans || []);
        if (response.data.plans?.length > 0) {
          const professional = response.data.plans.find(p => p.code === 'PROFESSIONAL') || response.data.plans[0];
          setSelectedPlanId(professional._id);
        }
      } catch (err) {
        console.error("Failed to load plans:", err);
      }
    };
    fetchPlans();
  }, []);

  // Update progress percentage dynamically based on current step
  useEffect(() => {
    setProgress(Math.round((currentStep / 10) * 100));
  }, [currentStep]);

  // Periodic Auto-Save Draft
  useEffect(() => {
    if (!ownerForm.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerForm.email)) return;

    const interval = setInterval(async () => {
      try {
        await clinicApi.saveDraft({
          email: ownerForm.email,
          step: currentStep,
          ownerForm,
          clinicForm,
          selectedPlanId,
          billingCycle
        });
      } catch (err) {
        console.warn('Silent auto-save draft failed');
      }
    }, 12000);

    return () => clearInterval(interval);
  }, [ownerForm, clinicForm, selectedPlanId, billingCycle, currentStep]);

  // Validate Owner Email
  const handleValidateOwnerEmail = (emailVal) => {
    if (emailTimeout.current) clearTimeout(emailTimeout.current);
    if (!emailVal || !emailVal.trim()) {
      setOwnerEmailValidation(null);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      setOwnerEmailValidation({ status: 'invalid', message: 'Invalid email address format' });
      return;
    }
    setOwnerEmailValidation({ status: 'checking', message: '' });
    emailTimeout.current = setTimeout(async () => {
      try {
        const res = await clinicApi.validateEmail({ email: emailVal });
        if (res.data?.isUnique) {
          setOwnerEmailValidation({ status: 'valid', message: 'Available' });
        } else {
          setOwnerEmailValidation({ status: 'invalid', message: 'Email address already exists' });
        }
      } catch (err) {
        setOwnerEmailValidation({ status: 'invalid', message: 'Validation failed' });
      }
    }, 500);
  };

  // Validate Owner Phone
  const handleValidateOwnerPhone = (phoneVal) => {
    if (phoneTimeout.current) clearTimeout(phoneTimeout.current);
    const cleaned = phoneVal.replace(/\D/g, '').slice(0, 10);
    if (!cleaned) {
      setOwnerPhoneValidation(null);
      return;
    }
    if (cleaned.length !== 10) {
      setOwnerPhoneValidation({ status: 'invalid', message: 'Phone number must be exactly 10 digits' });
      return;
    }
    setOwnerPhoneValidation({ status: 'checking', message: '' });
    phoneTimeout.current = setTimeout(async () => {
      try {
        const res = await clinicApi.validatePhone({ phone: cleaned });
        if (res.data?.isUnique) {
          setOwnerPhoneValidation({ status: 'valid', message: 'Available' });
        } else {
          setOwnerPhoneValidation({ status: 'invalid', message: 'Phone number already exists' });
        }
      } catch (err) {
        setOwnerPhoneValidation({ status: 'invalid', message: 'Validation failed' });
      }
    }, 500);
  };

  // Validate Clinic Reg Number
  const handleValidateRegNumber = (regVal) => {
    if (regNumTimeout.current) clearTimeout(regNumTimeout.current);
    if (!regVal || !regVal.trim()) {
      setRegNumValidation(null);
      return;
    }
    setRegNumValidation({ status: 'checking', message: '' });
    regNumTimeout.current = setTimeout(async () => {
      try {
        const res = await clinicApi.validateRegistrationNumber({ registrationNumber: regVal });
        if (res.data?.isUnique) {
          setRegNumValidation({ status: 'valid', message: '✓ Available' });
        } else {
          setRegNumValidation({ status: 'invalid', message: 'This registration number is already registered.' });
        }
      } catch (err) {
        setRegNumValidation({ status: 'invalid', message: 'Validation failed' });
      }
    }, 500);
  };

  // Handle Draft Load on Blur
  const handleLoadDraft = async (emailVal) => {
    if (!emailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) return;
    try {
      const res = await clinicApi.getDraft(emailVal);
      if (res.data?.draft) {
        const draft = res.data.draft;
        setOwnerForm(prev => ({ ...prev, ...draft.ownerForm }));
        setClinicForm(prev => ({ ...prev, ...draft.clinicForm }));
        if (draft.selectedPlanId) setSelectedPlanId(draft.selectedPlanId);
        if (draft.billingCycle) setBillingCycle(draft.billingCycle);
        // Do not automatically change currentStep on blur to prevent jarring redirects
        // if (draft.step) setCurrentStep(draft.step);
      }
    } catch (err) {
      console.error('Failed to load draft:', err);
    }
  };

  // Manual Save Draft
  const handleSaveDraft = async () => {
    if (!ownerForm.email) {
      alert('Please enter an email address to save draft.');
      return;
    }
    try {
      setIsSubmitting(true);
      await clinicApi.saveDraft({
        email: ownerForm.email,
        step: currentStep,
        ownerForm,
        clinicForm,
        selectedPlanId,
        billingCycle
      });
      alert('Draft saved successfully! You can resume setup using this email address.');
    } catch (err) {
      alert('Failed to save draft.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (file, fieldName, isMultiple = false) => {
    if (!file) return;

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`File size exceeds 10MB limit: ${file.name}`);
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file format. Only JPEG, JPG, PNG, WEBP, and SVG are supported.');
      return;
    }

    setUploadProgress(prev => ({ ...prev, [fieldName]: 'uploading' }));

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Content = reader.result;
        if (!isMultiple) {
          setLocalPreviews(prev => ({ ...prev, [fieldName]: base64Content }));
        }

        const res = await clinicApi.uploadFile({
          file_data: base64Content,
          file_name: file.name
        });
        const fileRef = res.data.fileRef;

        if (isMultiple) {
          setClinicForm(prev => ({
            ...prev,
            images: [...(prev.images || []), fileRef]
          }));
          setLocalPreviews(prev => {
            const currentImages = prev.images || [];
            return {
              ...prev,
              images: [...currentImages, base64Content]
            };
          });
        } else if (fieldName === 'profilePhoto') {
          setOwnerForm(prev => ({ ...prev, profilePhoto: fileRef }));
        } else if (fieldName === 'logo') {
          setClinicForm(prev => ({ ...prev, logo: fileRef }));
        }

        setUploadProgress(prev => ({ ...prev, [fieldName]: 'success' }));
      } catch (err) {
        setUploadProgress(prev => ({ ...prev, [fieldName]: 'error' }));
      }
    };
    reader.readAsDataURL(file);
  };

  const highlightAndScroll = (newErrors) => {
    setErrors(newErrors);
    const firstErrorField = Object.keys(newErrors)[0];
    if (firstErrorField) {
      setTimeout(() => {
        const el = document.getElementById(firstErrorField) || document.getElementsByName(firstErrorField)[0];
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.focus();
        }
      }, 100);
    }
  };

  const validateStepOne = async () => {
    const newErrors = {};
    if (!ownerForm.name) newErrors.name = 'Owner name is required.';
    if (!ownerForm.designation) newErrors.designation = 'Designation is required.';
    if (!ownerForm.email) {
      newErrors.email = 'Please enter a valid email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerForm.email)) {
      newErrors.email = 'Please enter a valid email address.';
    }
    if (!ownerForm.phone) {
      newErrors.phone = 'Please enter a valid mobile number.';
    } else if (ownerForm.phone.replace(/\D/g, '').length !== 10) {
      newErrors.phone = 'Please enter a valid mobile number.';
    }
    if (!ownerForm.password) {
      newErrors.password = 'Password is required.';
    } else if (ownerForm.password.length < 6) {
      newErrors.password = 'Password must meet security requirements (at least 6 characters).';
    }
    if (ownerForm.password !== ownerForm.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }
    // ── DOB Validation with accurate 18+ age check ──
    const dobValidation = validateDOB(ownerForm.dob);
    if (!dobValidation.valid) newErrors.dob = dobValidation.error;
    if (!ownerForm.gender) newErrors.gender = 'Gender is required.';
    if (!ownerForm.address) newErrors.address = 'Please enter your address.';

    if (!newErrors.email || !newErrors.phone) {
      try {
        const [emailRes, phoneRes] = await Promise.all([
          !newErrors.email ? clinicApi.validateEmail({ email: ownerForm.email }) : Promise.resolve({ data: { isUnique: true } }),
          !newErrors.phone ? clinicApi.validatePhone({ phone: ownerForm.phone.replace(/\D/g, '') }) : Promise.resolve({ data: { isUnique: true } })
        ]);
        if (!emailRes.data.isUnique) newErrors.email = 'This email address is already registered.';
        if (!phoneRes.data.isUnique) newErrors.phone = 'This mobile number is already registered.';
      } catch (err) { }
    }

    if (Object.keys(newErrors).length > 0) {
      highlightAndScroll(newErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const validateStepTwo = async () => {
    const newErrors = {};
    if (!clinicForm.name) newErrors.clinicName = 'Clinic Name is required.';
    if (!clinicForm.registrationNumber) newErrors.registrationNumber = 'Clinic Registration Number is required.';
    if (!clinicForm.establishedYear) newErrors.establishedYear = 'Established Year is required.';
    if (!clinicForm.shortDescription) newErrors.shortDescription = 'Short Description is required.';
    if (!clinicForm.addressLine1) newErrors.addressLine1 = 'Please enter clinic address.';
    if (!clinicForm.city) newErrors.city = 'City is required.';
    if (!clinicForm.state) newErrors.state = 'State is required.';
    if (!clinicForm.pincode) newErrors.pincode = 'PIN Code is required.';
    if (!clinicForm.contactNumber) newErrors.contactNumber = 'Contact Number is required.';
    if (!clinicForm.timings || clinicForm.timings.length === 0) newErrors.timings = 'Please select clinic timings.';

    if (clinicForm.registrationNumber) {
      try {
        const res = await clinicApi.validateRegistrationNumber({ registrationNumber: clinicForm.registrationNumber });
        if (!res.data.isUnique) {
          newErrors.registrationNumber = 'This registration number is already registered.';
        }
      } catch (err) { }
    }

    if (Object.keys(newErrors).length > 0) {
      highlightAndScroll(newErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const validateStepThree = () => {
    const newErrors = {};
    if (!selectedPlanId) {
      newErrors.selectedPlan = 'Please select a subscription plan to continue.';
    }
    if (Object.keys(newErrors).length > 0) {
      highlightAndScroll(newErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const validateStep = async () => {
    setWizardError('');
    if (currentStep === 1) {
      return await validateStepOne();
    } else if (currentStep === 9) {
      return await validateStepTwo();
    }
    return true;
  };

  const handleNext = async () => {
    const isValid = await validateStep();
    if (isValid) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  // OTP Verification States
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpResent, setOtpResent] = useState(false);

  const handleSubmit = async () => {
    setWizardError('');
    const stepOneValid = await validateStepOne();
    if (!stepOneValid) {
      setCurrentStep(1);
      return;
    }
    const stepTwoValid = await validateStepTwo();
    if (!stepTwoValid) {
      setCurrentStep(9);
      return;
    }

    if (!hasAcceptedTerms) {
      setWizardError('You must confirm that all information is correct');
      return;
    }

    try {
      setIsSubmitting(true);
      await clinicApi.sendOtp({ email: ownerForm.email });
      setShowOtpModal(true);
      setOtpCode('');
      setOtpError('');
      setOtpResent(false);
    } catch (err) {
      setWizardError(err.response?.data?.message || 'Failed to send verification code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyAndRegister = async () => {
    if (!otpCode.trim()) {
      setOtpError('Please enter the OTP');
      return;
    }
    try {
      setOtpLoading(true);
      setOtpError('');
      await clinicApi.verifyOtp({ email: ownerForm.email, otp: otpCode });

      const payload = {
        ownerDetails: {
          name: ownerForm.name,
          designation: ownerForm.designation,
          phone: ownerForm.phone,
          email: ownerForm.email,
          password: ownerForm.password,
          dob: ownerForm.dob,
          gender: ownerForm.gender,
          address: ownerForm.address,
          aadhaar: ownerForm.aadhaar,
          pan: ownerForm.pan,
          profilePhoto: ownerForm.profilePhoto
        },
        clinicDetails: {
          ...clinicForm,
          specialties: clinicForm.specialties ? clinicForm.specialties.split(',').map(s => s.trim()).filter(Boolean) : [],
          languagesSpoken: clinicForm.languagesSpoken ? clinicForm.languagesSpoken.split(',').map(s => s.trim()).filter(Boolean) : [],
          doctorsList: doctors,
          departmentsList: departments,
          branchesList: branches,
          staffList: staff,
          pharmacyDetails: { name: pharmacyName, contact: pharmacyContact, active: pharmacyActive },
          labDetails: { name: labName, contact: labContact, active: labActive },
          aiModules: aiFeatures,
          videoConsultation: { provider: videoProvider, fee: videoFee, duration: videoDuration, waitingRoom: videoWaitingRoom, recording: videoRecording, reminders: videoReminders }
        },
        selectedPlan: {
          planId: selectedPlanId,
          billingCycle
        }
      };
      await clinicApi.submitRegistration(payload);
      setShowOtpModal(false);
      setSubmitSuccess(true);
    } catch (err) {
      setOtpError(err.response?.data?.message || 'Verification failed. Please check the code.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      setOtpLoading(true);
      setOtpError('');
      await clinicApi.sendOtp({ email: ownerForm.email });
      setOtpResent(true);
    } catch (err) {
      setOtpError('Failed to resend code.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleApplyPromo = async () => {
    setPromoError('');
    setPromoApplied(false);
    if (!promoCode.trim()) {
      setPromoError('Please enter a code');
      return;
    }
    try {
      const response = await promoApi.validate({
        code: promoCode.trim(),
        planId: selectedPlanId,
        billingCycle
      });
      setPromoApplied(true);
      setPromoDiscount(response.data.discountAmount || 0);
    } catch (err) {
      setPromoError(err.response?.data?.message || 'Invalid or inapplicable promo code');
    }
  };

  const handleTimingChange = (index, field, value) => {
    const newTimings = [...clinicForm.timings];
    newTimings[index][field] = value;
    setClinicForm(prev => ({ ...prev, timings: newTimings }));
  };

  const handleAddTiming = () => {
    setClinicForm(prev => ({
      ...prev,
      timings: [...prev.timings, { dayRange: 'Monday - Friday', startTime: '09:00 AM', endTime: '06:00 PM' }]
    }));
  };

  const handleRemoveTiming = (index) => {
    setClinicForm(prev => ({
      ...prev,
      timings: prev.timings.filter((_, idx) => idx !== index)
    }));
  };

  const handleLocateCallback = (addrObj) => {
    if (mapTarget === 'owner') {
      setOwnerForm(prev => ({
        ...prev,
        address: [addrObj.line1, addrObj.line2, addrObj.city, addrObj.state, addrObj.pincode].filter(Boolean).join(', ')
      }));
    } else {
      setClinicForm(prev => ({
        ...prev,
        addressLine1: addrObj.line1 || prev.addressLine1,
        addressLine2: addrObj.line2 || prev.addressLine2,
        city: addrObj.city || prev.city,
        state: addrObj.state || prev.state,
        pincode: addrObj.pincode || prev.pincode,
        latitude: addrObj.latitude || prev.latitude,
        longitude: addrObj.longitude || prev.longitude
      }));
    }
    setShowMapPicker(false);
  };

  const selectedPlanObj = plans.find(p => p._id === selectedPlanId);
  const activePlanObj = selectedPlanObj;

  const limits = React.useMemo(() => {
    const planName = (selectedPlanObj?.name || '').toLowerCase();
    if (planName.includes('starter')) {
      return {
        maxDocs: 1,
        maxStaff: 2,
        maxBranches: 1,
        ai: false,
        video: false,
        healthcare: false
      };
    } else if (planName.includes('professional')) {
      return {
        maxDocs: 3,
        maxStaff: 5,
        maxBranches: 2,
        ai: false,
        video: true,
        healthcare: true
      };
    } else {
      return {
        maxDocs: 999,
        maxStaff: 999,
        maxBranches: 5,
        ai: true,
        video: true,
        healthcare: true
      };
    }
  }, [selectedPlanObj]);

  // Success view
  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 relative overflow-hidden font-sans">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-green-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="bg-white rounded-3xl p-8 max-w-xl w-full text-center shadow-2xl border border-slate-100 relative z-10">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 shadow-inner">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">Registration Submitted!</h1>
          <p className="text-slate-500 font-medium mb-6">Status: <span className="text-amber-600 font-extrabold px-3 py-1 bg-amber-50 rounded-full text-xs border border-amber-200">Pending Approval</span></p>
          <div className="bg-slate-50 rounded-2xl p-6 text-left mb-8 border border-slate-150">
            <h3 className="font-extrabold text-slate-800 mb-3 text-sm">Next steps in onboarding:</h3>
            <ul className="space-y-3.5 text-xs text-slate-600 font-semibold">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">1</span>
                <span>Our Super Admin will review your clinic registration parameters.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">2</span>
                <span>You will receive an email verification summary once activated.</span>
              </li>
            </ul>
          </div>
          <Link to="/" className="inline-flex items-center justify-center px-6 py-3.5 bg-gradient-to-r from-green-500 to-green-700 hover:opacity-90 text-white font-black rounded-2xl transition duration-200 shadow-md">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F8FAFC] flex flex-col font-sans" style={{ height: '100dvh', minHeight: '100vh' }}>
      <style>{`
        .cw-scroll { overflow-y: auto; scrollbar-width: none; -ms-overflow-style: none; scroll-behavior: smooth; }
        .cw-scroll::-webkit-scrollbar { display: none; }
      `}</style>
      {/* ── FIXED TOP NAVIGATION ── */}
      <div className="w-full px-5 pt-3 pb-2 shrink-0 z-40 bg-[#F8FAFC]/95 backdrop-blur-md">
        <header className="max-w-[1840px] mx-auto bg-white border border-slate-100 px-5 py-2.5 rounded-full flex items-center justify-between shadow-md">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <PehalLogo variant="primary" height={32} />
            <div className="h-5 w-[1px] bg-slate-200 mx-1.5" />
            <div>
              <span className="text-[11px] font-black text-slate-900 block leading-none">AICMS</span>
              <span className="text-[8px] font-bold text-slate-400 block tracking-wider uppercase mt-0.5">AI Clinic Management System</span>
            </div>
          </div>

          {/* Stepper Navigation */}
          <div className="hidden xl:flex items-center gap-1">
            {STEPS.map((s, idx) => {
              const isCompleted = currentStep > s.id;
              const isActive = currentStep === s.id;
              return (
                <div key={s.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <button
                      type="button"
                      onClick={() => isCompleted && setCurrentStep(s.id)}
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black border-2 transition-all ${
                        isCompleted ? 'bg-green-600 border-green-600 text-white shadow-sm'
                        : isActive ? 'bg-white border-green-500 text-green-600 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-400'
                      }`}
                    >
                      {isCompleted ? <Check size={9} /> : s.id}
                    </button>
                    <span className={`block text-[8px] font-black leading-none mt-1 ${
                      isActive ? 'text-green-600' : isCompleted ? 'text-slate-600' : 'text-slate-400'
                    }`}>{s.name.split(' ')[0]}</span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className={`w-3.5 h-[1.5px] mx-1 rounded-full ${
                      isCompleted ? 'bg-green-400' : 'bg-slate-200'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-full text-[11px] font-extrabold transition shadow-sm bg-white cursor-pointer"
            >
              <CheckSquare size={12} /> Save Draft
            </button>
            <Link to="/set-your-clinic" className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-full text-[11px] font-extrabold transition bg-white">
              <HelpCircle size={12} /> Help
            </Link>
            <Link to="/" className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-full text-[11px] font-extrabold transition bg-white">
              <PhoneCall size={12} /> Contact Sales
            </Link>
            <Link to="/" className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 rounded-full text-[11px] font-extrabold transition">
              <X size={12} /> Exit Setup
            </Link>
          </div>
        </header>
      </div>

      {/* ── 3-COLUMN WORKSPACE ── */}
      <div className="flex-1 max-w-[1840px] w-full mx-auto px-5 py-3 flex flex-col lg:flex-row gap-4" style={{ minHeight: 0, overflow: 'hidden' }}>

        {/* ==================== LEFT SIDEBAR ==================== */}
        <div
          className="cw-scroll w-full lg:w-[22%] shrink-0 flex flex-col gap-4 bg-white border border-slate-150/70 rounded-2xl p-5 shadow-sm"
          style={{ overflowY: 'auto' }}
        >
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 mb-1">Clinic Setup</h3>
              <p className="text-[11px] text-slate-400 font-bold leading-normal">Complete all steps to launch your clinic on AICMS</p>
            </div>

            {/* Circular Progress Ring */}
            <div className="flex flex-col items-center justify-center py-6 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="56" cy="56" r="46" stroke="#E2E8F0" strokeWidth="6.5" fill="transparent" />
                  <motion.circle
                    cx="56"
                    cy="56"
                    r="46"
                    stroke="#16A34A"
                    strokeWidth="7"
                    fill="transparent"
                    strokeDasharray="289"
                    animate={{ strokeDashoffset: 289 - (289 * progress) / 100 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-xl font-black text-slate-900">{progress}%</span>
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase">Completed</span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-slate-400 mt-4 flex items-center gap-1.5">
                <Clock size={12} /> {Math.max(1, 11 - currentStep)} Minutes Remaining
              </span>
            </div>

            {/* Vertical timeline steps */}
            <div className="space-y-4 pl-2 relative">
              <div className="absolute top-1 bottom-1 left-[15px] w-[2px] bg-slate-100" />
              {STEPS.map((s) => {
                const isActive = currentStep === s.id;
                const isCompleted = currentStep > s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={!isCompleted && !isActive}
                    onClick={() => setCurrentStep(s.id)}
                    className="w-full text-left flex gap-3.5 items-start relative z-10 hover:bg-slate-50/50 p-1.5 rounded-xl transition duration-150 group cursor-pointer disabled:cursor-default"
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-[10px] border transition ${
                      isCompleted ? "bg-green-600 border-green-600 text-white"
                      : isActive ? "bg-green-50 border-green-600 text-green-700 shadow-sm"
                      : "bg-white border-slate-200 text-slate-400"
                    }`}>
                      {isCompleted ? <Check size={12} /> : s.id}
                    </div>
                    <div className="flex-1">
                      <h5 className={`text-xs font-black leading-tight ${isActive ? "text-green-600" : isCompleted ? "text-slate-700" : "text-slate-400"} group-hover:text-green-600 transition-colors`}>
                        {s.name}
                      </h5>
                      <span className="text-[9px] text-slate-400 block mt-0.5">{isActive ? 'In Progress' : isCompleted ? 'Completed' : 'Pending'} ({s.duration})</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Security Parameters */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4.5 space-y-3.5">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Security parameters</span>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Shield size={14} className="text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] font-black text-slate-800 block leading-tight">Secure Cloud</span>
                    <span className="text-[9px] text-slate-400 block">Enterprise grade security</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <CheckCircle size={14} className="text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] font-black text-slate-800 block leading-tight">HIPAA Ready</span>
                    <span className="text-[9px] text-slate-400 block">Healthcare compliant</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Sparkles size={14} className="text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] font-black text-slate-800 block leading-tight">AI Powered</span>
                    <span className="text-[9px] text-slate-400 block">Smart automation</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <RefreshCw size={14} className="text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] font-black text-slate-800 block leading-tight">Auto Backup</span>
                    <span className="text-[9px] text-slate-400 block">Your data is always safe</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Need Help Card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
              <div>
                <span className="text-xs font-black text-slate-800 block">Need Help?</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block leading-relaxed">We're here to help you set up your clinic.</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-600">
                <a href="#" className="flex items-center gap-1.5 py-2 justify-center bg-white border border-slate-200 rounded-xl hover:text-green-600 hover:border-green-200 transition"><MessageSquare size={11} /> Live Chat</a>
                <a href="#" className="flex items-center gap-1.5 py-2 justify-center bg-white border border-slate-200 rounded-xl hover:text-green-600 hover:border-green-200 transition"><Calendar size={11} /> Book Demo</a>
                <a href="#" className="flex items-center gap-1.5 py-2 justify-center bg-white border border-slate-200 rounded-xl hover:text-green-600 hover:border-green-200 transition"><FileText size={11} /> Documentation</a>
                <a href="#" className="flex items-center gap-1.5 py-2 justify-center bg-white border border-slate-200 rounded-xl hover:text-green-600 hover:border-green-200 transition"><Play size={11} /> Video Guide</a>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== CENTER SCROLLABLE FORM ==================== */}
        <div className="flex-1 lg:w-[56%] flex flex-col bg-white rounded-2xl shadow-md border border-slate-150/80 overflow-hidden">
          {/* Sticky step header inside card */}
          <div className="shrink-0 px-8 pt-7 pb-5 border-b border-slate-100 bg-white">
            <AnimatePresence mode="wait">
              <motion.div
                key={`header-${currentStep}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-black text-slate-900">Step {currentStep} of 10: {STEPS[currentStep - 1]?.name}</h3>
                    <p className="text-xs text-slate-400 mt-1 font-medium">{STEPS[currentStep - 1]?.desc}</p>
                  </div>
                  <div className="w-11 h-11 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center shrink-0">
                    {currentStep === 1 ? <User className="w-5 h-5" />
                     : currentStep === 2 ? <User className="w-5 h-5" />
                     : currentStep === 5 ? <User className="w-5 h-5" />
                     : currentStep === 7 ? <Sparkles className="w-5 h-5" />
                     : currentStep === 8 ? <PhoneCall className="w-5 h-5" />
                     : currentStep === 10 ? <Check className="w-5 h-5" />
                     : <Building2 className="w-5 h-5" />}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Scrollable form body */}
          <div className="cw-scroll flex-1 px-8 py-5" style={{ overflowY: 'auto' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >

                  {/* ── STEP 1: OWNER DETAILS ── */}
                  {currentStep === 1 && (
                    <div className="space-y-4">

                      {/* ─── CARD: Personal Information ─── */}
                      <div className="border border-slate-200 rounded-2xl overflow-hidden">
                        <div className="flex items-center gap-3 px-5 py-3.5 bg-slate-50 border-b border-slate-200">
                          <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                            <User size={15} />
                          </div>
                          <div>
                            <span className="text-sm font-black text-slate-800 block leading-tight">Personal Information</span>
                            <span className="text-[10px] text-slate-400 font-medium">Basic details about the clinic owner</span>
                          </div>
                        </div>
                        <div className="p-5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Owner Full Name */}
                            <div>
                              <label className="block text-[11px] font-extrabold text-slate-600 mb-1.5">Owner Full Name <span className="text-red-500">*</span></label>
                              <div className="relative">
                                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input
                                  type="text"
                                  id="name"
                                  placeholder="Enter owner full name"
                                  className={`w-full pl-9 pr-3 py-3 bg-slate-50/50 border rounded-xl outline-none focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100 transition text-sm text-slate-800 ${errors.name ? 'border-rose-500 bg-rose-50/10' : 'border-slate-200'}`}
                                  value={ownerForm.name}
                                  onChange={(e) => {
                                    setOwnerForm({ ...ownerForm, name: e.target.value });
                                    if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                                  }}
                                />
                              </div>
                              {errors.name && <p className="text-[10px] text-rose-500 mt-1">{errors.name}</p>}
                            </div>

                            {/* Designation */}
                            <div>
                              <label className="block text-[11px] font-extrabold text-slate-600 mb-1.5">Designation <span className="text-red-500">*</span></label>
                              <div className="relative">
                                <Award size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input
                                  type="text"
                                  id="designation"
                                  placeholder="e.g., Doctor, Director"
                                  className={`w-full pl-9 pr-3 py-3 bg-slate-50/50 border rounded-xl outline-none focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100 transition text-sm text-slate-800 ${errors.designation ? 'border-rose-500 bg-rose-50/10' : 'border-slate-200'}`}
                                  value={ownerForm.designation}
                                  onChange={(e) => {
                                    setOwnerForm({ ...ownerForm, designation: e.target.value });
                                    if (errors.designation) setErrors(prev => ({ ...prev, designation: '' }));
                                  }}
                                />
                              </div>
                              {errors.designation && <p className="text-[10px] text-rose-500 mt-1">{errors.designation}</p>}
                            </div>

                             {/* Date of Birth */}
                            <div>
                              <label className="block text-[11px] font-extrabold text-slate-600 mb-1.5">Date of Birth <span className="text-red-500">*</span></label>
                              <CustomDatePicker
                                value={ownerForm.dob}
                                onChange={(val) => {
                                  setOwnerForm({ ...ownerForm, dob: val });
                                  if (errors.dob) setErrors(prev => ({ ...prev, dob: '' }));
                                }}
                                onValidate={(val) => {
                                  const result = validateDOB(val);
                                  setErrors(prev => ({ ...prev, dob: result.valid ? '' : result.error }));
                                }}
                              />
                              {errors.dob && <p className="text-[10px] text-rose-500 mt-1 font-semibold">{errors.dob}</p>}
                            </div>

                            {/* Gender */}
                            <div>
                              <label className="block text-[11px] font-extrabold text-slate-600 mb-1.5">Gender <span className="text-red-500">*</span></label>
                              <div className="relative">
                                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <select
                                  id="gender"
                                  className={`w-full pl-9 pr-3 py-3 bg-slate-50/50 border rounded-xl outline-none text-sm text-slate-800 appearance-none ${errors.gender ? 'border-rose-500 bg-rose-50/10' : 'border-slate-200'}`}
                                  value={ownerForm.gender}
                                  onChange={(e) => {
                                    setOwnerForm({ ...ownerForm, gender: e.target.value });
                                    if (errors.gender) setErrors(prev => ({ ...prev, gender: '' }));
                                  }}
                                >
                                  <option value="">Select gender</option>
                                  <option value="Male">Male</option>
                                  <option value="Female">Female</option>
                                  <option value="Other">Other</option>
                                </select>
                              </div>
                              {errors.gender && <p className="text-[10px] text-rose-500 mt-1">{errors.gender}</p>}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ─── CARD: Contact Information ─── */}
                      <div className="border border-slate-200 rounded-2xl overflow-hidden">
                        <div className="flex items-center gap-3 px-5 py-3.5 bg-slate-50 border-b border-slate-200">
                          <div className="w-8 h-8 bg-green-100 text-green-600 rounded-xl flex items-center justify-center shrink-0">
                            <Phone size={15} />
                          </div>
                          <div>
                            <span className="text-sm font-black text-slate-800 block leading-tight">Contact Information</span>
                            <span className="text-[10px] text-slate-400 font-bold">Email and phone authentication details</span>
                          </div>
                        </div>
                        <div className="p-5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Email Address */}
                            <div>
                              <label className="block text-[11px] font-extrabold text-slate-600 mb-1.5">Email Address <span className="text-red-500">*</span></label>
                              <div className="relative">
                                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input
                                  type="email"
                                  id="email"
                                  placeholder="owner@clinic.com"
                                  className={`w-full pl-9 pr-3 py-3 bg-slate-50/50 border rounded-xl outline-none focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100 transition text-sm text-slate-800 ${errors.email ? 'border-rose-500 bg-rose-50/10' : 'border-slate-200'}`}
                                  value={ownerForm.email}
                                  onChange={(e) => {
                                    setOwnerForm({ ...ownerForm, email: e.target.value });
                                    if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                                  }}
                                  onBlur={(e) => handleLoadDraft(e.target.value)}
                                />
                              </div>
                              {errors.email && <p className="text-[10px] text-rose-500 mt-1">{errors.email}</p>}
                            </div>

                            {/* Mobile Number */}
                            <div>
                              <label className="block text-[11px] font-extrabold text-slate-600 mb-1.5">Mobile Number <span className="text-red-500">*</span></label>
                              <div className="relative">
                                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input
                                  type="tel"
                                  id="phone"
                                  placeholder="9876543210"
                                  className={`w-full pl-9 pr-3 py-3 bg-slate-50/50 border rounded-xl outline-none focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100 transition text-sm text-slate-800 ${errors.phone ? 'border-rose-500 bg-rose-50/10' : 'border-slate-200'}`}
                                  value={ownerForm.phone}
                                  onChange={(e) => {
                                    setOwnerForm({ ...ownerForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) });
                                    if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
                                  }}
                                />
                              </div>
                              {errors.phone && <p className="text-[10px] text-rose-500 mt-1">{errors.phone}</p>}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* CARD: Account Security */}
                      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                        <div className="flex items-center gap-3 px-5 py-3.5 bg-slate-50 border-b border-slate-200">
                          <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                            <Lock size={15} />
                          </div>
                          <div>
                            <span className="text-sm font-black text-slate-800 block leading-tight">Account Security</span>
                            <span className="text-[10px] text-slate-400 font-bold">Secure credentials for dashboard login</span>
                          </div>
                        </div>
                        <div className="p-5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Password */}
                            <div>
                              <label className="block text-[11px] font-extrabold text-slate-600 mb-1.5">Password <span className="text-red-500">*</span></label>
                              <div className="relative">
                                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input
                                  type={showPassword ? "text" : "password"}
                                  id="password"
                                  placeholder="••••••••"
                                  className={`w-full pl-9 pr-10 py-3 bg-slate-50/50 border rounded-xl outline-none focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100 transition text-sm text-slate-800 ${errors.password ? 'border-rose-500 bg-rose-50/10' : 'border-slate-200'}`}
                                  value={ownerForm.password}
                                  onChange={(e) => {
                                    setOwnerForm({ ...ownerForm, password: e.target.value });
                                    if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 outline-none"
                                >
                                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                              </div>
                              {errors.password && <p className="text-[10px] text-rose-500 mt-1">{errors.password}</p>}
                            </div>

                            {/* Confirm Password */}
                            <div>
                              <label className="block text-[11px] font-extrabold text-slate-600 mb-1.5">Confirm Password <span className="text-red-500">*</span></label>
                              <div className="relative">
                                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input
                                  type={showConfirmPassword ? "text" : "password"}
                                  id="confirmPassword"
                                  placeholder="••••••••"
                                  className={`w-full pl-9 pr-10 py-3 bg-slate-50/50 border rounded-xl outline-none focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100 transition text-sm text-slate-800 ${errors.confirmPassword ? 'border-rose-500 bg-rose-50/10' : 'border-slate-200'}`}
                                  value={ownerForm.confirmPassword}
                                  onChange={(e) => {
                                    setOwnerForm({ ...ownerForm, confirmPassword: e.target.value });
                                    if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: '' }));
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 outline-none"
                                >
                                  {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                              </div>
                              {errors.confirmPassword && <p className="text-[10px] text-rose-500 mt-1">{errors.confirmPassword}</p>}
                            </div>
                          </div>

                          {/* Nationality & Language Row */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[11px] font-extrabold text-slate-600 mb-1.5">Nationality <span className="text-red-500">*</span></label>
                              <div className="relative">
                                <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <select
                                  className="w-full pl-9 pr-3 py-3 bg-slate-50/50 border border-slate-200 rounded-xl outline-none text-sm text-slate-800 appearance-none font-bold text-slate-700"
                                  value={ownerForm.nationality}
                                  onChange={(e) => setOwnerForm({ ...ownerForm, nationality: e.target.value })}
                                >
                                  <option value="Indian">Indian</option>
                                  <option value="Other">Other</option>
                                </select>
                              </div>
                            </div>
                            <div>
                              <label className="block text-[11px] font-extrabold text-slate-600 mb-1.5">Preferred Language <span className="text-red-500">*</span></label>
                              <div className="relative">
                                <MessageSquare size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <select
                                  className="w-full pl-9 pr-3 py-3 bg-slate-50/50 border border-slate-200 rounded-xl outline-none text-sm text-slate-800 appearance-none"
                                  value={ownerForm.preferredLanguage}
                                  onChange={(e) => setOwnerForm({ ...ownerForm, preferredLanguage: e.target.value })}
                                >
                                  <option value="English">English</option>
                                  <option value="Hindi">Hindi</option>
                                  <option value="Bengali">Bengali</option>
                                  <option value="Tamil">Tamil</option>
                                  <option value="Telugu">Telugu</option>
                                  <option value="Marathi">Marathi</option>
                                  <option value="Gujarati">Gujarati</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ─── Address + Profile Photo (compact) ─── */}
                      <div className="border border-slate-200 rounded-2xl overflow-hidden">
                        <div className="flex items-center gap-3 px-5 py-3.5 bg-slate-50 border-b border-slate-200">
                          <div className="w-8 h-8 bg-rose-100 text-rose-500 rounded-xl flex items-center justify-center shrink-0">
                            <MapPin size={15} />
                          </div>
                          <div className="flex-1">
                            <span className="text-sm font-black text-slate-800 block leading-tight">Address Verification</span>
                            <span className="text-[10px] text-slate-400 font-medium">Owner residential or business address</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setMapTarget('owner');
                              setShowMapPicker(true);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl text-[10px] font-extrabold transition border border-green-200 cursor-pointer"
                          >
                            <MapPin size={11} /> Locate on Map
                          </button>
                        </div>
                        <div className="p-5 space-y-4">
                          <div className="relative">
                            <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                              type="text"
                              id="address"
                              placeholder="Enter owner's full address"
                              className={`w-full pl-9 pr-3 py-3 bg-slate-50/50 border rounded-xl outline-none focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100 transition text-sm text-slate-800 ${errors.address ? 'border-rose-500 bg-rose-50/10' : 'border-slate-200'}`}
                              value={ownerForm.address}
                              onChange={(e) => {
                                setOwnerForm({ ...ownerForm, address: e.target.value });
                                if (errors.address) setErrors(prev => ({ ...prev, address: '' }));
                              }}
                            />
                            {errors.address && <p className="text-[10px] text-rose-500 mt-1">{errors.address}</p>}
                          </div>

                          {/* Profile Photo inline */}
                          <div className="flex items-center gap-4 pt-3 border-t border-slate-100">
                            <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                              {localPreviews.profilePhoto ? (
                                <img src={localPreviews.profilePhoto} alt="Profile preview" className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-7 h-7 text-slate-400" />
                              )}
                            </div>
                            <div>
                              <p className="text-[11px] font-black text-slate-700 mb-1">Profile Photo <span className="text-slate-400 font-medium">(Optional)</span></p>
                              <input type="file" id="profilePhotoFile" className="hidden" onChange={(e) => handleFileUpload(e.target.files[0], 'profilePhoto')} />
                              <label htmlFor="profilePhotoFile" className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-[10px] font-extrabold cursor-pointer transition inline-flex items-center gap-1.5 text-slate-600">
                                <UploadCloud size={12} /> Upload Image
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── STEP 2: DOCTOR SETUP ── */}
                  {currentStep === 2 && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="text-sm font-black text-slate-800">Practitioner Roster</h4>
                          <p className="text-[10px] text-slate-400 font-bold">Configure active doctors for your clinical operations.</p>
                        </div>
                        {doctors.length < limits.maxDocs ? (
                          <button
                            type="button"
                            onClick={() => setShowAddDoctor(true)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-black rounded-xl cursor-pointer shadow-sm transition"
                          >
                            <Plus size={14} /> Add Doctor
                          </button>
                        ) : (
                          <span className="text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
                            Doctor Limit Reached ({limits.maxDocs})
                          </span>
                        )}
                      </div>

                      {/* Upgrade Warning Banner */}
                      {doctors.length >= limits.maxDocs && (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex justify-between items-center gap-3">
                          <div className="space-y-0.5">
                            <span className="text-xs font-black text-amber-800 block">Upgrade Plan to Add More Doctors</span>
                            <span className="text-[10px] text-amber-600 font-bold block">Your plan limits active doctors to {limits.maxDocs}. Upgrade for unlimited.</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const premiumPlan = plans.find(p => (p.name || '').toLowerCase().includes('premium'));
                              if (premiumPlan) setSelectedPlanId(premiumPlan._id);
                            }}
                            className="px-3.5 py-1.5 bg-slate-900 text-white font-black text-[10px] rounded-xl shadow-sm cursor-pointer"
                          >
                            Upgrade
                          </button>
                        </div>
                      )}

                      {showAddDoctor && (
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 relative">
                          <button onClick={() => setShowAddDoctor(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
                            <X size={15} />
                          </button>
                          <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">New Doctor Registration</h5>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-600 mb-1">Doctor Name</label>
                              <input
                                type="text"
                                placeholder="Dr. Jane Doe"
                                value={doctorForm.name}
                                onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-600 mb-1">Specialty</label>
                              <select
                                value={doctorForm.specialty}
                                onChange={(e) => setDoctorForm({ ...doctorForm, specialty: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none"
                              >
                                {departments.map(d => (
                                  <option key={d.name} value={d.name}>{d.name}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-600 mb-1">Email</label>
                              <input
                                type="email"
                                placeholder="jane.doe@clinic.com"
                                value={doctorForm.email}
                                onChange={(e) => setDoctorForm({ ...doctorForm, email: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-600 mb-1">Phone</label>
                              <input
                                type="tel"
                                placeholder="9876543210"
                                value={doctorForm.phone}
                                onChange={(e) => setDoctorForm({ ...doctorForm, phone: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none"
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (!doctorForm.name || !doctorForm.email || !doctorForm.phone) {
                                alert('Please fill in name, email and phone.');
                                return;
                              }
                              setDoctors([...doctors, { id: 'doc-' + Date.now(), ...doctorForm, verified: true }]);
                              setDoctorForm({ name: '', specialty: 'General Medicine', email: '', phone: '' });
                              setShowAddDoctor(false);
                            }}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black cursor-pointer shadow-sm"
                          >
                            Save Doctor
                          </button>
                        </div>
                      )}

                      {/* Doctors List */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {doctors.map(d => (
                          <div key={d.id} className="border border-slate-150 p-4.5 rounded-2xl bg-white flex justify-between items-center shadow-sm">
                            <div className="flex gap-3">
                              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs shrink-0">
                                {d.name.split(' ').map(n=>n[0]).join('').substring(0,3)}
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-xs font-black text-slate-805 block">{d.name}</span>
                                <span className="text-[10px] text-slate-400 font-bold block">{d.specialty}</span>
                                <span className="text-[9px] text-slate-505 block">{d.email} | {d.phone}</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setDoctors(doctors.filter(item => item.id !== d.id))}
                              className="text-slate-400 hover:text-rose-500 p-1"
                            >
                              <Trash size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── STEP 3: DEPARTMENT SETUP ── */}
                  {currentStep === 3 && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="text-sm font-black text-slate-800">Departments &amp; Specialties</h4>
                          <p className="text-[10px] text-slate-400 font-bold font-semibold">Configure operating specialties inside your clinic facility.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAddDept(true)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-black rounded-xl cursor-pointer shadow-sm"
                        >
                          <Plus size={14} /> Add Specialty
                        </button>
                      </div>

                      {showAddDept && (
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 relative">
                          <button onClick={() => setShowAddDept(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
                            <X size={15} />
                          </button>
                          <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">New Specialty</h5>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="e.g. Dermatology, Gynaecology"
                              value={deptFormName}
                              onChange={(e) => setDeptFormName(e.target.value)}
                              className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!deptFormName.trim()) return;
                                setDepartments([...departments, { name: deptFormName.trim(), doctorsCount: 0, active: true, color: 'purple' }]);
                                setDeptFormName('');
                                setShowAddDept(false);
                              }}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black cursor-pointer"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {departments.map((d) => (
                          <div
                            key={d.name}
                            onClick={() => {
                              setDepartments(departments.map(item => item.name === d.name ? { ...item, active: !item.active } : item));
                            }}
                            className={`rounded-2xl p-5 border-2 cursor-pointer transition flex flex-col justify-between h-32 ${
                              d.active ? "border-green-600 bg-green-50/10 shadow-sm" : "border-slate-200 bg-slate-50/30 opacity-70"
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <span className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase ${d.active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
                                {d.active ? 'Active' : 'Inactive'}
                              </span>
                              <CheckCircle size={15} className={d.active ? 'text-green-600' : 'text-slate-300'} />
                            </div>
                            <div>
                              <h5 className="text-xs font-black text-slate-850 block">{d.name}</h5>
                              <span className="text-[10px] text-slate-400 font-bold block mt-0.5">{d.doctorsCount} Practitioners Assigned</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── STEP 4: BRANCH SETUP ── */}
                  {currentStep === 4 && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="text-sm font-black text-slate-800">Clinic Branches</h4>
                          <p className="text-[10px] text-slate-400 font-bold">Configure geographical branches for your organization.</p>
                        </div>
                        {branches.length < limits.maxBranches ? (
                          <button
                            type="button"
                            onClick={() => setShowAddBranch(true)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-black rounded-xl cursor-pointer shadow-sm"
                          >
                            <Plus size={14} /> Add Branch
                          </button>
                        ) : (
                          <span className="text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
                            Plan Limit: {limits.maxBranches} Branch
                          </span>
                        )}
                      </div>

                      {/* Multi Branch upgrade prompt */}
                      {branches.length >= limits.maxBranches && (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex justify-between items-center gap-3">
                          <div className="space-y-0.5">
                            <span className="text-xs font-black text-amber-800 block">Need Multi-Branch Support?</span>
                            <span className="text-[10px] text-amber-600 font-bold block">Upgrade to AI Premium Clinic to configure up to 5 branch facilities.</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const premiumPlan = plans.find(p => (p.name || '').toLowerCase().includes('premium'));
                              if (premiumPlan) setSelectedPlanId(premiumPlan._id);
                            }}
                            className="px-3.5 py-1.5 bg-slate-900 text-white font-black text-[10px] rounded-xl shadow-sm cursor-pointer"
                          >
                            Upgrade
                          </button>
                        </div>
                      )}

                      {showAddBranch && (
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 relative">
                          <button onClick={() => setShowAddBranch(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
                            <X size={15} />
                          </button>
                          <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">New Branch Details</h5>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-600 mb-1">Branch Name</label>
                              <input
                                type="text"
                                placeholder="Branch office location"
                                value={branchForm.name}
                                onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-slate-200 text-xs outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-600 mb-1">Manager</label>
                              <input
                                type="text"
                                placeholder="Branch Administrator"
                                value={branchForm.manager}
                                onChange={(e) => setBranchForm({ ...branchForm, manager: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-slate-200 text-xs outline-none"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-[10px] font-extrabold text-slate-600 mb-1">Address</label>
                              <input
                                type="text"
                                placeholder="Branch location street details"
                                value={branchForm.address}
                                onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-slate-200 text-xs outline-none"
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (!branchForm.name || !branchForm.address) return;
                              setBranches([...branches, { id: 'branch-' + Date.now(), ...branchForm, active: true, isPrimary: false }]);
                              setBranchForm({ name: '', address: '', contact: '', manager: '', active: true });
                              setShowAddBranch(false);
                            }}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black cursor-pointer shadow-sm animate-ripple"
                          >
                            Save Branch
                          </button>
                        </div>
                      )}

                      <div className="space-y-4">
                        {branches.map(b => (
                          <div key={b.id} className="border border-slate-150 p-5 rounded-2xl bg-white flex justify-between items-start shadow-sm">
                            <div className="flex gap-4">
                              <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center shrink-0 border border-green-100">
                                <Building2 size={20} />
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-black text-slate-850 block">{b.name}</span>
                                  {b.isPrimary && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[8.5px] font-black rounded-full uppercase">Primary</span>}
                                </div>
                                <span className="text-xs text-slate-400 font-bold block">{b.address}</span>
                                <span className="text-[10px] text-slate-500 font-medium block">Manager: {b.manager || '-'}</span>
                              </div>
                            </div>
                            {!b.isPrimary && (
                              <button
                                type="button"
                                onClick={() => setBranches(branches.filter(item => item.id !== b.id))}
                                className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                              >
                                <Trash size={15} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── STEP 5: STAFF SETUP ── */}
                  {currentStep === 5 && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="text-sm font-black text-slate-800">Support Staff Configuration</h4>
                          <p className="text-[10px] text-slate-400 font-bold">Configure clinic assistants, receptionists, and pharmacy staff.</p>
                        </div>
                        {staff.length < limits.maxStaff ? (
                          <button
                            type="button"
                            onClick={() => setShowAddStaff(true)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-black rounded-xl cursor-pointer shadow-sm"
                          >
                            <Plus size={14} /> Add Staff
                          </button>
                        ) : (
                          <span className="text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
                            Staff Limit Reached ({limits.maxStaff})
                          </span>
                        )}
                      </div>

                      {staff.length >= limits.maxStaff && (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex justify-between items-center gap-3">
                          <div className="space-y-0.5">
                            <span className="text-xs font-black text-amber-800 block">Upgrade Plan for Additional Staff</span>
                            <span className="text-[10px] text-amber-600 font-bold block">Your plan limits support staff accounts to {limits.maxStaff}.</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const premiumPlan = plans.find(p => (p.name || '').toLowerCase().includes('premium'));
                              if (premiumPlan) setSelectedPlanId(premiumPlan._id);
                            }}
                            className="px-3.5 py-1.5 bg-slate-900 text-white font-black text-[10px] rounded-xl shadow-sm cursor-pointer"
                          >
                            Upgrade
                          </button>
                        </div>
                      )}

                      {showAddStaff && (
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 relative">
                          <button onClick={() => setShowAddStaff(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
                            <X size={15} />
                          </button>
                          <h5 className="text-xs font-black text-slate-805 uppercase tracking-wider">Register Support Staff</h5>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-600 mb-1">Staff Name</label>
                              <input
                                type="text"
                                placeholder="Staff Name"
                                value={staffForm.name}
                                onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-slate-200 text-xs outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-600 mb-1">Role</label>
                              <select
                                value={staffForm.role}
                                onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-slate-200 text-xs outline-none font-bold text-slate-700"
                              >
                                <option value="Receptionist">Receptionist</option>
                                <option value="Pharmacist">Pharmacist</option>
                                <option value="Lab Technician">Lab Technician</option>
                                <option value="Cashier">Cashier</option>
                                <option value="Nurse">Nurse</option>
                                <option value="Administrator">Administrator</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-600 mb-1">Email</label>
                              <input
                                type="email"
                                placeholder="staff@clinic.com"
                                value={staffForm.email}
                                onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-slate-200 text-xs outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-600 mb-1">Phone</label>
                              <input
                                type="tel"
                                placeholder="9876543210"
                                value={staffForm.phone}
                                onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-slate-200 text-xs outline-none"
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (!staffForm.name || !staffForm.email) return;
                              setStaff([...staff, { id: 'staff-' + Date.now(), ...staffForm, active: true }]);
                              setStaffForm({ name: '', role: 'Receptionist', email: '', phone: '', active: true });
                              setShowAddStaff(false);
                            }}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black cursor-pointer shadow-sm"
                          >
                            Save Staff Account
                          </button>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {staff.map(s => (
                          <div key={s.id} className="border border-slate-150 p-4.5 rounded-2xl bg-white flex justify-between items-center shadow-sm">
                            <div className="flex gap-3">
                              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-[10px] shrink-0">
                                {s.role.substring(0,2).toUpperCase()}
                              </div>
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-black text-slate-805 block">{s.name}</span>
                                  <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[8px] font-black rounded-md">{s.role}</span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-bold block">{s.email}</span>
                                <span className="text-[9px] text-slate-500 block">{s.phone}</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setStaff(staff.filter(item => item.id !== s.id))}
                              className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                            >
                              <Trash size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── STEP 6: HEALTHCARE SETUP ── */}
                  {currentStep === 6 && (
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-black text-slate-800">Pharmacy &amp; Laboratory Setup</h4>
                        <p className="text-[10px] text-slate-400 font-bold font-semibold">Configure auxiliary clinical modules attached to your clinic.</p>
                      </div>

                      {/* Pharmacy Config Section */}
                      <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-sm">
                        <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-200">
                          <div className="flex items-center gap-2.5">
                            <Building2 size={16} className="text-green-600" />
                            <span className="text-xs font-black text-slate-800 uppercase tracking-wide">Pharmacy Module</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400">Enable Pharmacy</span>
                            <input
                              type="checkbox"
                              checked={pharmacyActive}
                              onChange={(e) => setPharmacyActive(e.target.checked)}
                              className="w-4 h-4 text-green-650 cursor-pointer"
                            />
                          </div>
                        </div>
                        {pharmacyActive && (
                          <div className="p-5 grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-600 mb-1">Pharmacy Name</label>
                              <input
                                type="text"
                                value={pharmacyName}
                                onChange={(e) => setPharmacyName(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-605 mb-1">Contact Phone</label>
                              <input
                                type="tel"
                                value={pharmacyContact}
                                onChange={(e) => setPharmacyContact(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs outline-none"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Laboratory Config Section */}
                      <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-sm">
                        <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-200">
                          <div className="flex items-center gap-2.5">
                            <Building2 size={16} className="text-green-600" />
                            <span className="text-xs font-black text-slate-805 uppercase tracking-wide">Laboratory Module</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400">Enable Laboratory</span>
                            <input
                              type="checkbox"
                              checked={labActive}
                              onChange={(e) => setLabActive(e.target.checked)}
                              className="w-4 h-4 text-green-650 cursor-pointer"
                            />
                          </div>
                        </div>
                        {labActive && (
                          <div className="p-5 grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-600 mb-1">Laboratory Name</label>
                              <input
                                type="text"
                                value={labName}
                                onChange={(e) => setLabName(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 text-xs outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-605 mb-1">Contact Phone</label>
                              <input
                                type="tel"
                                value={labContact}
                                onChange={(e) => setLabContact(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 text-xs outline-none"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── STEP 7: AI MODULES ── */}
                  {currentStep === 7 && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="text-sm font-black text-slate-800">AI Intelligent Core Modules</h4>
                          <p className="text-[10px] text-slate-400 font-bold font-semibold">Configure clinical-grade automated assistant modules.</p>
                        </div>
                        <span className="px-3 py-1 bg-green-50 text-green-600 border border-green-200 text-[10px] font-black rounded-xl">
                          Features Dynamic
                        </span>
                      </div>

                      {/* Locked State if current plan doesn't support AI */}
                      {!limits.ai ? (
                        <div className="border border-slate-200 bg-white rounded-3xl p-8 text-center space-y-4 shadow-sm">
                          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-100">
                            <Lock size={20} />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-slate-900">AI Modules locked under {activePlanObj?.name}</h4>
                            <p className="text-xs text-slate-400 mt-1 font-semibold max-w-sm mx-auto leading-relaxed">
                              Voice transcription, Symptom scoring, and Consultation assistants require AI Premium Clinic or Enterprise ClinicOS license.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const premiumPlan = plans.find(p => (p.name || '').toLowerCase().includes('premium'));
                              if (premiumPlan) setSelectedPlanId(premiumPlan._id);
                            }}
                            className="px-5 py-2.5 bg-slate-900 text-white font-black text-xs rounded-xl shadow-md cursor-pointer hover:bg-slate-800 transition"
                          >
                            Upgrade Subscription
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[
                            { key: 'voiceTranscription', name: 'Voice Transcription', desc: 'Realtime dictation dictation dictation converter.' },
                            { key: 'consultationAssistant', name: 'AI Consultation Assistant', desc: 'Generates automated clinical SOAP notes.' },
                            { key: 'symptomChecker', name: 'Symptom Checker', desc: 'Predicts diagnostic risk pathways.' },
                            { key: 'prescriptionSuggestions', name: 'Prescription Suggestions', desc: 'Checks drug-drug interaction warning flags.' },
                            { key: 'riskScoring', name: 'Patient Risk Scoring', desc: 'Analyzes post-op readmission risks.' },
                            { key: 'labRecommendation', name: 'Lab Test Recommendation', desc: 'Auto recommends relevant diagnostics.' }
                          ].map(mod => (
                            <div key={mod.key} className="border border-slate-150 p-4.5 rounded-2xl bg-white flex justify-between items-start shadow-sm">
                              <div className="space-y-1 pr-4">
                                <span className="text-xs font-black text-slate-800 block">{mod.name}</span>
                                <span className="text-[10px] text-slate-400 font-bold block leading-relaxed">{mod.desc}</span>
                              </div>
                              <input
                                type="checkbox"
                                checked={aiFeatures[mod.key]}
                                onChange={(e) => setAiFeatures({ ...aiFeatures, [mod.key]: e.target.checked })}
                                className="mt-1 cursor-pointer w-4 h-4 text-green-655"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── STEP 8: VIDEO CONSULTATION ── */}
                  {currentStep === 8 && (
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-black text-slate-800">Telemedicine &amp; Video Consultations</h4>
                        <p className="text-[10px] text-slate-400 font-bold">Configure virtual remote appointment channels and parameters.</p>
                      </div>

                      {!limits.video ? (
                        <div className="border border-slate-200 bg-white rounded-3xl p-8 text-center space-y-4 shadow-sm">
                          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-100">
                            <Lock size={20} />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-slate-900">Video consultations restricted under Starter plan</h4>
                            <p className="text-xs text-slate-400 mt-1 font-semibold max-w-sm mx-auto leading-relaxed">
                              Zoom/Google Meet integrations and video appointment settings require a Professional or higher license.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const profPlan = plans.find(p => (p.name || '').toLowerCase().includes('professional')) || plans[0];
                              if (profPlan) setSelectedPlanId(profPlan._id);
                            }}
                            className="px-5 py-2.5 bg-slate-900 text-white font-black text-xs rounded-xl shadow-md cursor-pointer hover:bg-slate-800 transition"
                          >
                            Upgrade to Professional
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-5">
                          {/* Provider Selector Cards */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {['Zoom', 'Google Meet', 'MS Teams', 'Custom Provider'].map(provider => {
                              const isSelected = videoProvider === provider;
                              return (
                                <div
                                  key={provider}
                                  onClick={() => setVideoProvider(provider)}
                                  className={`rounded-2xl p-4 border-2 cursor-pointer transition text-center ${
                                    isSelected ? "border-green-600 bg-green-50/10 shadow-sm" : "border-slate-200 hover:border-slate-350 bg-white"
                                  }`}
                                >
                                  <Globe className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                                  <span className="text-xs font-black text-slate-800">{provider}</span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Fee and duration inputs */}
                          <div className="grid grid-cols-2 gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                            <div>
                              <label className="block text-[11px] font-extrabold text-slate-605 mb-1.5">Consultation Fee (₹)</label>
                              <input
                                type="number"
                                value={videoFee}
                                onChange={(e) => setVideoFee(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-extrabold text-slate-605 mb-1.5">Appointment Duration (Minutes)</label>
                              <input
                                type="number"
                                value={videoDuration}
                                onChange={(e) => setVideoDuration(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm outline-none"
                              />
                            </div>
                          </div>

                          {/* Telehealth Settings Toggles */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                              { label: 'Enable Waiting Room', checked: videoWaitingRoom, onChange: setVideoWaitingRoom },
                              { label: 'Record Consultations', checked: videoRecording, onChange: setVideoRecording },
                              { label: 'Enable Meeting Reminders', checked: videoReminders, onChange: setVideoReminders }
                            ].map((item, idx) => (
                              <div key={idx} className="border border-slate-150 p-4.5 rounded-2xl bg-white flex justify-between items-center shadow-sm">
                                <span className="text-xs font-black text-slate-805 text-slate-800">{item.label}</span>
                                <input
                                  type="checkbox"
                                  checked={item.checked}
                                  onChange={(e) => item.onChange(e.target.checked)}
                                  className="w-4 h-4 text-green-655 cursor-pointer"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── STEP 9: CLINIC TIMINGS & DETAILS ── */}
                  {currentStep === 9 && (
                    <div className="space-y-6">
                      {/* CARD: Clinic details */}
                      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                        <div className="flex items-center gap-3 px-5 py-3.5 bg-slate-50 border-b border-slate-200">
                          <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                            <Building2 size={15} />
                          </div>
                          <div>
                            <span className="text-sm font-black text-slate-850 block leading-tight">Clinic Details</span>
                            <span className="text-[10px] text-slate-400 font-bold">Roster parameters and coordinates</span>
                          </div>
                        </div>
                        <div className="p-5 space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Clinic Name */}
                            <div>
                              <label className="block text-[11px] font-extrabold text-slate-600 mb-1.5">Clinic Name <span className="text-red-500">*</span></label>
                              <input
                                type="text"
                                id="clinicName"
                                placeholder="Enter clinic official name"
                                className={`w-full px-4 py-3 bg-slate-50/50 border rounded-xl outline-none focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100 transition text-sm text-slate-800 ${errors.clinicName ? 'border-rose-500 bg-rose-50/10' : 'border-slate-200'}`}
                                value={clinicForm.name}
                                onChange={(e) => {
                                  setClinicForm({ ...clinicForm, name: e.target.value });
                                  if (errors.clinicName) setErrors(prev => ({ ...prev, clinicName: '' }));
                                }}
                              />
                              {errors.clinicName && <p className="text-[10px] text-rose-500 mt-1">{errors.clinicName}</p>}
                            </div>

                            {/* Registration Number */}
                            <div>
                              <label className="block text-[11px] font-extrabold text-slate-600 mb-1.5">Registration Number <span className="text-red-500">*</span></label>
                              <div className="relative">
                                <input
                                  type="text"
                                  id="registrationNumber"
                                  placeholder="e.g. REG-12345"
                                  className={`w-full px-4 py-3 bg-slate-50/50 border rounded-xl outline-none focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100 transition text-sm text-slate-800 ${errors.registrationNumber ? 'border-rose-500 bg-rose-50/10' : 'border-slate-200'}`}
                                  value={clinicForm.registrationNumber}
                                  onChange={(e) => {
                                    setClinicForm({ ...clinicForm, registrationNumber: e.target.value });
                                    if (errors.registrationNumber) setErrors(prev => ({ ...prev, registrationNumber: '' }));
                                  }}
                                  onBlur={(e) => handleValidateRegNumber(e.target.value)}
                                />
                                {regNumValidation && (
                                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase ${
                                    regNumValidation.status === 'valid' ? 'text-green-600' : regNumValidation.status === 'checking' ? 'text-slate-400' : 'text-rose-500'
                                  }`}>
                                    {regNumValidation.status === 'checking' ? 'Checking...' : regNumValidation.status === 'valid' ? '✓ Available' : 'Taken'}
                                  </span>
                                )}
                              </div>
                              {errors.registrationNumber && <p className="text-[10px] text-rose-500 mt-1">{errors.registrationNumber}</p>}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* Established Year */}
                            <div>
                              <label className="block text-[11px] font-extrabold text-slate-600 mb-1.5">Established Year <span className="text-red-500">*</span></label>
                              <input
                                type="number"
                                id="establishedYear"
                                placeholder="YYYY"
                                className={`w-full px-4 py-3 bg-slate-50/50 border rounded-xl outline-none focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100 transition text-sm text-slate-800 ${errors.establishedYear ? 'border-rose-500 bg-rose-50/10' : 'border-slate-200'}`}
                                value={clinicForm.establishedYear}
                                onChange={(e) => {
                                  setClinicForm({ ...clinicForm, establishedYear: e.target.value.replace(/\D/g, '').slice(0, 4) });
                                  if (errors.establishedYear) setErrors(prev => ({ ...prev, establishedYear: '' }));
                                }}
                              />
                              {errors.establishedYear && <p className="text-[10px] text-rose-500 mt-1">{errors.establishedYear}</p>}
                            </div>

                            {/* Consultation Mode */}
                            <div>
                              <label className="block text-[11px] font-extrabold text-slate-605 mb-1.5">Consultation Mode</label>
                              <select
                                className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl outline-none text-sm text-slate-800 font-semibold"
                                value={clinicForm.consultationMode}
                                onChange={(e) => setClinicForm({ ...clinicForm, consultationMode: e.target.value })}
                              >
                                <option value="In-Clinic">In-Clinic</option>
                                <option value="Video-Consultation">Video Consultation</option>
                                <option value="Hybrid">Hybrid</option>
                              </select>
                            </div>

                            {/* Languages Spoken */}
                            <div>
                              <label className="block text-[11px] font-extrabold text-slate-605 mb-1.5">Languages Spoken</label>
                              <input
                                type="text"
                                placeholder="English, Hindi"
                                className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm outline-none"
                                value={clinicForm.languagesSpoken}
                                onChange={(e) => setClinicForm({ ...clinicForm, languagesSpoken: e.target.value })}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Address Line 1 */}
                            <div>
                              <label className="block text-[11px] font-extrabold text-slate-600 mb-1.5">Clinic Street Address <span className="text-red-500">*</span></label>
                              <input
                                type="text"
                                id="addressLine1"
                                placeholder="123 MG Road"
                                className={`w-full px-4 py-3 bg-slate-50/50 border rounded-xl outline-none focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100 transition text-sm text-slate-800 ${errors.addressLine1 ? 'border-rose-500 bg-rose-50/10' : 'border-slate-200'}`}
                                value={clinicForm.addressLine1}
                                onChange={(e) => {
                                  setClinicForm({ ...clinicForm, addressLine1: e.target.value });
                                  if (errors.addressLine1) setErrors(prev => ({ ...prev, addressLine1: '' }));
                                }}
                              />
                              {errors.addressLine1 && <p className="text-[10px] text-rose-500 mt-1">{errors.addressLine1}</p>}
                            </div>

                            {/* PIN Code */}
                            <div>
                              <div className="flex justify-between items-center mb-1.5">
                                <label className="block text-[11px] font-extrabold text-slate-600">PIN Code <span className="text-red-500">*</span></label>
                                <button
                                  type="button"
                                  onClick={() => { setMapTarget('clinic'); setShowMapPicker(true); }}
                                  className="text-[10px] font-black text-green-600 hover:text-green-800 flex items-center gap-1 cursor-pointer"
                                >
                                  <MapPin size={11} /> Locate on Map
                                </button>
                              </div>
                              <input
                                type="text"
                                id="pincode"
                                placeholder="560001"
                                className={`w-full px-4 py-3 bg-slate-50/50 border rounded-xl outline-none focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100 transition text-sm text-slate-800 ${errors.pincode ? 'border-rose-500 bg-rose-50/10' : 'border-slate-200'}`}
                                value={clinicForm.pincode}
                                onChange={(e) => {
                                  setClinicForm({ ...clinicForm, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) });
                                  if (errors.pincode) setErrors(prev => ({ ...prev, pincode: '' }));
                                }}
                              />
                              {errors.pincode && <p className="text-[10px] text-rose-500 mt-1">{errors.pincode}</p>}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* City */}
                            <div>
                              <label className="block text-[11px] font-extrabold text-slate-600 mb-1.5">City <span className="text-red-500">*</span></label>
                              <input
                                type="text"
                                id="city"
                                placeholder="Bengaluru"
                                className={`w-full px-4 py-3 bg-slate-50/50 border rounded-xl outline-none focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100 transition text-sm text-slate-800 ${errors.city ? 'border-rose-500 bg-rose-50/10' : 'border-slate-200'}`}
                                value={clinicForm.city}
                                onChange={(e) => {
                                  setClinicForm({ ...clinicForm, city: e.target.value });
                                  if (errors.city) setErrors(prev => ({ ...prev, city: '' }));
                                }}
                              />
                              {errors.city && <p className="text-[10px] text-rose-500 mt-1">{errors.city}</p>}
                            </div>

                            {/* State */}
                            <div>
                              <label className="block text-[11px] font-extrabold text-slate-600 mb-1.5">State <span className="text-red-500">*</span></label>
                              <input
                                type="text"
                                id="state"
                                placeholder="Karnataka"
                                className={`w-full px-4 py-3 bg-slate-50/50 border rounded-xl outline-none focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100 transition text-sm text-slate-800 ${errors.state ? 'border-rose-500 bg-rose-50/10' : 'border-slate-200'}`}
                                value={clinicForm.state}
                                onChange={(e) => {
                                  setClinicForm({ ...clinicForm, state: e.target.value });
                                  if (errors.state) setErrors(prev => ({ ...prev, state: '' }));
                                }}
                              />
                              {errors.state && <p className="text-[10px] text-rose-500 mt-1">{errors.state}</p>}
                            </div>

                            {/* Contact Phone */}
                            <div>
                              <label className="block text-[11px] font-extrabold text-slate-600 mb-1.5">Clinic Phone <span className="text-red-500">*</span></label>
                              <input
                                type="tel"
                                id="contactNumber"
                                placeholder="9876543210"
                                className={`w-full px-4 py-3 bg-slate-50/50 border rounded-xl outline-none focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100 transition text-sm text-slate-800 ${errors.contactNumber ? 'border-rose-500 bg-rose-50/10' : 'border-slate-200'}`}
                                value={clinicForm.contactNumber}
                                onChange={(e) => {
                                  setClinicForm({ ...clinicForm, contactNumber: e.target.value.replace(/\D/g, '').slice(0, 10) });
                                  if (errors.contactNumber) setErrors(prev => ({ ...prev, contactNumber: '' }));
                                }}
                              />
                              {errors.contactNumber && <p className="text-[10px] text-rose-500 mt-1">{errors.contactNumber}</p>}
                            </div>
                          </div>

                          {/* Clinic Description */}
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-600 mb-1.5">Clinic Description <span className="text-red-500">*</span></label>
                            <textarea
                              id="shortDescription"
                              placeholder="Brief overview of your medical practice"
                              className={`w-full px-4 py-3 bg-slate-50/50 border rounded-xl outline-none focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100 transition text-sm text-slate-800 ${errors.shortDescription ? 'border-rose-500 bg-rose-50/10' : 'border-slate-200'}`}
                              rows="2"
                              value={clinicForm.shortDescription}
                              onChange={(e) => {
                                setClinicForm({ ...clinicForm, shortDescription: e.target.value });
                                if (errors.shortDescription) setErrors(prev => ({ ...prev, shortDescription: '' }));
                              }}
                            />
                            {errors.shortDescription && <p className="text-[10px] text-rose-500 mt-1">{errors.shortDescription}</p>}
                          </div>
                        </div>
                      </div>

                      {/* CARD: Clinic schedule timeline shifts */}
                      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200">
                          <div className="flex items-center gap-2.5">
                            <Clock size={16} className="text-green-600" />
                            <span className="text-xs font-black text-slate-800 uppercase tracking-wide">Working Schedule &amp; Shifts</span>
                          </div>
                          {limits.maxDocs > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                setScheduleDays(scheduleDays.map(d => {
                                  if (d.dayRange === scheduleType) {
                                    return { ...d, shifts: [...d.shifts, { startTime: '09:00 AM', endTime: '02:00 PM' }] };
                                  }
                                  return d;
                                }));
                              }}
                              className="text-[10px] font-black text-green-600 hover:text-green-800 flex items-center gap-1 cursor-pointer"
                            >
                              <Plus size={11} /> Add Shift
                            </button>
                          )}
                        </div>
                        <div className="p-5 space-y-4">
                          {/* Schedule Type Selector */}
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-600 mb-1.5">Schedule Type</label>
                            <select
                              value={scheduleType}
                              onChange={(e) => handleScheduleTypeChange(e.target.value)}
                              className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl outline-none text-sm text-slate-800 font-semibold"
                            >
                              <option value="Monday - Friday">Monday - Friday</option>
                              <option value="Monday - Saturday">Monday - Saturday</option>
                              <option value="Monday - Sunday">Monday - Sunday</option>
                              <option value="Individual Days">Individual Days</option>
                            </select>
                          </div>

                          {/* Dynamic Days Shifts Listing */}
                          <div className="space-y-4">
                            {scheduleDays.map((d, dayIdx) => {
                              const validation = checkShiftOverlaps(d.shifts);
                              return (
                                <div
                                  key={d.id}
                                  className={`rounded-2xl border p-4.5 transition duration-200 ${
                                    d.closed ? 'bg-slate-50/50 border-slate-200 opacity-75' : 'bg-white border-slate-200 shadow-sm'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-4 mb-3 pb-2.5 border-b border-slate-100">
                                    <span className={`text-sm font-black ${d.closed ? 'text-slate-400' : 'text-slate-800'}`}>
                                      {d.dayRange}
                                    </span>

                                    <div className="flex items-center gap-4">
                                      {/* Closed toggle */}
                                      <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                          type="checkbox"
                                          checked={d.closed}
                                          onChange={(e) => {
                                            const next = [...scheduleDays];
                                            next[dayIdx].closed = e.target.checked;
                                            setScheduleDays(next);
                                          }}
                                          className="rounded border-slate-300 text-green-600 focus:ring-green-500 h-3.5 w-3.5"
                                        />
                                        <span className="text-[10px] font-black text-slate-500">Mark Closed</span>
                                      </label>
                                    </div>
                                  </div>

                                  {d.closed ? (
                                    <div className="py-2 text-center text-xs font-black text-slate-400 bg-slate-100/50 rounded-xl border border-dashed border-slate-200">
                                      Closed Entire Day
                                    </div>
                                  ) : (
                                    <div className="space-y-3">
                                      {d.shifts.map((s, shiftIdx) => (
                                        <div key={shiftIdx} className="flex items-center gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                                          <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-extrabold text-slate-400">From</span>
                                            <TimePicker
                                              value={s.startTime}
                                              onChange={(val) => {
                                                const next = [...scheduleDays];
                                                next[dayIdx].shifts[shiftIdx].startTime = val;
                                                setScheduleDays(next);
                                              }}
                                            />
                                          </div>

                                          <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-extrabold text-slate-400">To</span>
                                            <TimePicker
                                              value={s.endTime}
                                              onChange={(val) => {
                                                const next = [...scheduleDays];
                                                next[dayIdx].shifts[shiftIdx].endTime = val;
                                                setScheduleDays(next);
                                              }}
                                            />
                                          </div>

                                          {d.shifts.length > 1 && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const next = [...scheduleDays];
                                                next[dayIdx].shifts.splice(shiftIdx, 1);
                                                setScheduleDays(next);
                                              }}
                                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition ml-auto cursor-pointer"
                                              title="Delete Shift"
                                            >
                                              <Trash size={12} />
                                            </button>
                                          )}
                                        </div>
                                      ))}

                                      <div className="flex items-center justify-between pt-1">
                                        {!validation.valid && (
                                          <p className="text-[10px] text-rose-500 font-bold">{validation.error}</p>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const next = [...scheduleDays];
                                            next[dayIdx].shifts.push({ startTime: '09:00 AM', endTime: '05:00 PM' });
                                            setScheduleDays(next);
                                          }}
                                          className="text-[10px] font-extrabold text-green-600 hover:text-green-800 transition ml-auto flex items-center gap-1"
                                        >
                                          + Add Shift
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── STEP 10: REVIEW & LAUNCH ── */}
                  {currentStep === 10 && (
                    <div className="space-y-8">
                      <div className="space-y-4">
                        {/* Summary Owner Card */}
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-150 relative">
                          <button onClick={() => setCurrentStep(1)} className="absolute right-4 top-4 text-xs font-black text-green-600 hover:underline">Edit</button>
                          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Owner Summary</h4>
                          <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-xs font-semibold text-slate-700">
                            <div>Name: <span className="text-slate-900 font-bold">{ownerForm.name || '-'}</span></div>
                            <div>Designation: <span className="text-slate-900 font-bold">{ownerForm.designation || '-'}</span></div>
                            <div>Email: <span className="text-slate-900 font-bold">{ownerForm.email || '-'}</span></div>
                            <div>Phone: <span className="text-slate-900 font-bold">{ownerForm.phone || '-'}</span></div>
                          </div>
                        </div>

                        {/* Summary Clinic Card */}
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-150 relative">
                          <button onClick={() => setCurrentStep(9)} className="absolute right-4 top-4 text-xs font-black text-green-600 hover:underline">Edit</button>
                          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Clinic Summary</h4>
                          <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-xs font-semibold text-slate-700">
                            <div>Name: <span className="text-slate-900 font-bold">{clinicForm.name || '-'}</span></div>
                            <div>Reg Number: <span className="text-slate-900 font-bold">{clinicForm.registrationNumber || '-'}</span></div>
                            <div>Mode: <span className="text-slate-900 font-bold">{clinicForm.consultationMode || '-'}</span></div>
                            <div>Doctors Count: <span className="text-slate-900 font-bold">{doctors.length} Doctors</span></div>
                          </div>
                        </div>

                        {/* Summary Modules Card */}
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-150">
                          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Auxiliary &amp; Modules Roster</h4>
                          <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-xs font-semibold text-slate-700">
                            <div>Pharmacy: <span className="text-slate-900 font-bold">{pharmacyActive ? 'Enabled (' + pharmacyName + ')' : 'Disabled'}</span></div>
                            <div>Laboratory: <span className="text-slate-900 font-bold">{labActive ? 'Enabled (' + labName + ')' : 'Disabled'}</span></div>
                            <div>Telemedicine Provider: <span className="text-slate-900 font-bold">{limits.video ? videoProvider : 'Restricted'}</span></div>
                            <div>AI Core Features: <span className="text-slate-900 font-bold">{limits.ai ? Object.values(aiFeatures).filter(Boolean).length + ' Active' : 'Restricted'}</span></div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 pt-4 border-t border-slate-100">
                        <input
                          type="checkbox"
                          id="termsCheckbox"
                          className="mt-1 cursor-pointer w-4 h-4 text-green-650"
                          checked={hasAcceptedTerms}
                          onChange={(e) => setHasAcceptedTerms(e.target.checked)}
                        />
                        <label htmlFor="termsCheckbox" className="text-xs font-bold text-slate-600 cursor-pointer">
                          I confirm that all clinic credentials, owner details, and identity documents provided are correct and legally valid.
                        </label>
                      </div>
                    </div>
                  )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* ==================== RIGHT SIDEBAR ==================== */}
        <div
          className="cw-scroll w-full lg:w-[22%] shrink-0 flex flex-col bg-white rounded-2xl border border-slate-150/70 shadow-sm"
          style={{ overflowY: 'auto' }}
        >
          <div className="flex flex-col gap-4 p-5 flex-1">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider block">AI Assistant Panel</h3>
              <p className="text-[10px] text-slate-400 font-bold block mt-0.5">Real-time setup assistant &amp; parameters</p>
            </div>

            {/* Current Plan Selector / Upgrade Badge */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Subscribed Plan</span>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-slate-800 uppercase">{activePlanObj?.name || 'Professional Clinic'}</span>
                  <span className="text-[9.5px] px-2 py-0.5 bg-green-100 text-green-700 font-extrabold rounded-full">ACTIVE</span>
                </div>
                <select
                  value={selectedPlanId}
                  onChange={(e) => {
                    setSelectedPlanId(e.target.value);
                    const chosen = plans.find(p => p._id === e.target.value);
                    if (chosen) {
                      const key = (chosen.name || '').toLowerCase();
                      if (key.includes('starter')) handleScheduleTypeChange('Monday - Friday');
                    }
                  }}
                  className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-extrabold text-slate-700 outline-none"
                >
                  {plans.map(p => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Usage Metrics & Limits */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Onboarding Limits</span>
              
              {/* Doctor Limit */}
              <div>
                <div className="flex justify-between items-center text-[10px] font-extrabold mb-1">
                  <span className="text-slate-500">Doctors</span>
                  <span className={doctors.length > (limits?.maxDocs || 1) ? "text-rose-500 font-black" : "text-slate-850 font-black"}>
                    {doctors.length} / {limits?.maxDocs === 999 ? 'Unlimited' : limits?.maxDocs}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${doctors.length > (limits?.maxDocs || 1) ? 'bg-rose-500' : 'bg-green-600'}`}
                    style={{ width: `${Math.min(100, (doctors.length / (limits?.maxDocs || 1)) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Staff Limit */}
              <div>
                <div className="flex justify-between items-center text-[10px] font-extrabold mb-1">
                  <span className="text-slate-500">Staff Members</span>
                  <span className={staff.length > (limits?.maxStaff || 2) ? "text-rose-500 font-black" : "text-slate-850 font-black"}>
                    {staff.length} / {limits?.maxStaff === 999 ? 'Unlimited' : limits?.maxStaff}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${staff.length > (limits?.maxStaff || 2) ? 'bg-rose-500' : 'bg-green-600'}`}
                    style={{ width: `${Math.min(100, (staff.length / (limits?.maxStaff || 2)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* AI Assistant Context & Guidance */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">AI Suggestions</span>
              <div className="bg-blue-50/50 border border-blue-100 p-3.5 rounded-xl space-y-2 text-[10.5px] font-bold text-blue-700 leading-normal">
                {currentStep === 1 && <p>✓ Enter administrative details first to establish clinic ownership credentials.</p>}
                {currentStep === 2 && doctors.length === 0 && <p className="text-amber-700 font-extrabold">⚠️ Attention: Add at least one doctor practitioner to operate this clinic.</p>}
                {currentStep === 2 && doctors.length > 0 && <p>✓ Perfect! You have configured {doctors.length} active practitioners.</p>}
                {currentStep === 3 && <p>💡 Tip: Cardiology, Neurology and Orthopedics departments are recommended for hospital setups.</p>}
                {currentStep === 4 && <p>✓ Configure branch setups. Multi-branch features require AI Premium or Enterprise plans.</p>}
                {currentStep === 7 && !limits.ai && <p className="text-amber-700 font-extrabold">🔒 AI features are locked. Upgrade to AI Premium Clinic for transcription &amp; risk scoring.</p>}
                {currentStep === 7 && limits.ai && <p>✨ AI Modules are active! Toggle desired modules to enable consultations assistant.</p>}
                {currentStep === 8 && <p>💡 Set Zoom or Google Meet settings to enable direct remote video appointments.</p>}
                {currentStep === 9 && <p>✓ Fill official clinic registration details and timings to synchronize client schedule rosters.</p>}
              </div>
            </div>

            {/* Talk to Onboarding Expert Card */}
            <div className="mt-auto bg-white border border-slate-200/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                  <PhoneCall size={15} className="text-green-600" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs font-black text-slate-800 block">Have Questions?</span>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-medium">Our setup experts are ready to help.</p>
                </div>
              </div>
              <a
                href="mailto:support@pehalhealth.com"
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] font-black transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <PhoneCall size={11} /> Talk to Expert
              </a>
            </div>
          </div>
        </div>

      </div>

      {/* ══════════════════════════════════════════════════════════════
           UNIFIED STICKY FOOTER — Full-width, spans all 3 columns
      ══════════════════════════════════════════════════════════════ */}
      <div className="shrink-0 w-full z-30" style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderTop: '1px solid #e2e8f0', boxShadow: '0 -4px 24px rgba(0,0,0,0.06)' }}>
        <div className="max-w-[1840px] mx-auto px-5 py-3 flex items-center justify-between gap-4">
          {/* Far Left — Back to Home / Back to Previous Step */}
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-1.5 text-xs font-extrabold text-slate-600 hover:text-slate-900 transition shrink-0 cursor-pointer"
            >
              <ArrowLeft size={14} /> Back
            </button>
          ) : (
            <div className="w-[80px]" />
          )}

          {/* Center — Security Message */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <ShieldCheck size={16} className="text-green-600 shrink-0" />
            <span>
              <span className="font-black text-slate-700">Your data is safe with us.</span>
              <span className="hidden sm:inline text-slate-400"> We use industry-standard encryption.</span>
            </span>
          </div>

          {/* Far Right — Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-black text-slate-700 bg-white hover:bg-slate-50 transition cursor-pointer shadow-sm"
            >
              Save &amp; Continue Later
            </button>

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1.5 px-5 py-2 text-white rounded-xl text-xs font-black shadow-md transition cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 4px 14px rgba(22,163,74,0.25)' }}
              >
                Continue to Next Step <ArrowRight size={13} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-5 py-2 text-white rounded-xl text-xs font-black shadow-md transition cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 4px 14px rgba(22,163,74,0.25)' }}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Onboarding'} <Check size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Map Picker Modal */}
      <MapPicker
        isOpen={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onSelectAddress={handleLocateCallback}
        initialAddress={
          mapTarget === 'owner'
            ? { line1: ownerForm.address }
            : {
                line1: clinicForm.addressLine1,
                line2: clinicForm.addressLine2,
                city: clinicForm.city,
                state: clinicForm.state,
                pincode: clinicForm.pincode,
                country: clinicForm.country
              }
        }
      />

      {/* OTP Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-100 text-center space-y-6">
            <div className="w-14 h-14 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-slate-900">Email Verification</h3>
              <p className="text-xs text-slate-400">We've sent a 6-digit security code to <strong className="text-slate-800">{ownerForm.email}</strong>.</p>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                maxLength="6"
                placeholder="0 0 0 0 0 0"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                className="w-full text-center px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-green-600 text-lg font-black tracking-widest"
              />
              {otpError && <p className="text-xs text-rose-500 font-bold">{otpError}</p>}
              {otpResent && <p className="text-xs text-green-600 font-bold">✓ Verification code resent successfully</p>}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={otpLoading}
                className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl text-xs font-black transition cursor-pointer"
              >
                Resend Code
              </button>
              <button
                type="button"
                onClick={handleVerifyAndRegister}
                disabled={otpLoading}
                className="flex-1 py-3 bg-gradient-to-r from-green-500 to-green-700 hover:opacity-90 text-white rounded-2xl text-xs font-black shadow-md shadow-green-500/20 transition cursor-pointer"
              >
                {otpLoading ? 'Verifying...' : 'Verify & Register'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
