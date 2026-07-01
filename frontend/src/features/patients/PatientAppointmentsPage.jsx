import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Calendar, RotateCcw, Building2, MessageCircle,
  ArrowUp, ChevronRight, Sparkles, Loader2,
  Bot, User, Mic, Pill, FlaskConical, Check,
  MapPin, Clock, Monitor, IndianRupee, Star,
  Stethoscope, Eye, Filter, Heart, CheckCircle2, ShieldAlert, Activity,
  Phone, Mail, Globe, Shield
} from 'lucide-react';
import { appointmentApi, patientApi, doctorApi, clinicApi } from '../../lib/api';
import aiApi from '../../api/aiApi';
import useAuth from '../../hooks/useAuth';

/* ══════════════════════════════════════════════════════════════════
   CONSTANTS
   ══════════════════════════════════════════════════════════════════ */

const MOCK_CONVERSATIONS = [
  { id: 'c1', letter: 'U', bg: 'bg-indigo-600', title: 'Upcoming Appointment Details', preview: 'When is my next appointment?',        time: 'Today, 10:39 AM' },
  { id: 'c2', letter: 'R', bg: 'bg-amber-600',  title: 'Reschedule Request',           preview: 'Can we reschedule my appointment...', time: 'Yesterday, 03:15 PM' },
  { id: 'c3', letter: 'C', bg: 'bg-cyan-600',   title: 'Clinic Information',           preview: 'What are the clinic hours?',          time: 'May 24, 2025' },
  { id: 'c4', letter: 'P', bg: 'bg-violet-600', title: 'Previous Consultation',        preview: 'Summary of my last appointment...',    time: 'May 20, 2025' },
  { id: 'c5', letter: 'B', bg: 'bg-emerald-600',title: 'Payment & Billing',            preview: 'Can you show my payment history?',     time: 'May 18, 2025' },
  { id: 'c6', letter: 'Q', bg: 'bg-orange-600', title: 'Prescription Query',           preview: 'Information about my prescriptions...',time: 'May 15, 2025' },
  { id: 'c7', letter: 'F', bg: 'bg-pink-600',   title: 'Follow-up Appointment',        preview: 'Schedule a follow-up appointment...',  time: 'May 10, 2025' },
  { id: 'c8', letter: 'G', bg: 'bg-indigo-500', title: 'General Health Question',      preview: 'What should I do for headache?',       time: 'May 8, 2025' },
];

const ACTION_CARDS = [
  { icon: Calendar,      title: 'Book an Appointment', desc: 'AI-powered symptom triage & smart doctor matching', iconColor: 'text-blue-400',    bgColor: 'bg-blue-500/10',    action: 'book' },
  { icon: RotateCcw,     title: 'Reschedule',          desc: 'Reschedule or change your appointment time',       iconColor: 'text-purple-400',  bgColor: 'bg-purple-500/10',  action: 'reschedule' },
  { icon: Building2,     title: 'Clinic Details',      desc: 'View clinic info, location & contact details',    iconColor: 'text-emerald-400', bgColor: 'bg-emerald-500/10', action: 'clinic' },
  { icon: Pill,          title: 'Dosage Calculator',   desc: 'Get AI-estimated safe dosage for a medicine',     iconColor: 'text-amber-400',   bgColor: 'bg-amber-500/10',   action: 'dosage' },
];

const PREFERENCE_OPTIONS = [
  { key: 'nearest',    icon: MapPin,       label: 'Nearest Doctor',         desc: 'Closest clinic to your location', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  { key: 'earliest',   icon: Clock,        label: 'Earliest Appointment',   desc: 'First available consultation',    color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/30' },
  { key: 'online',     icon: Monitor,      label: 'Online Consultation',    desc: 'Video/chat consultation',         color: 'text-violet-400',  bg: 'bg-violet-500/10',  border: 'border-violet-500/30' },
  { key: 'lowest_fee', icon: IndianRupee,  label: 'Lowest Consultation Fee',desc: 'Most affordable option',          color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/30' },
];

const PRECAUTIONS_MAP = {
  cardi: ['Avoid strenuous activity or heavy lifting.', 'Rest in a comfortable upright position.', 'Seek emergency help for chest pain spreading to arm or jaw.'],
  pulmon: ['Rest upright to assist breathing.', 'Keep room well-ventilated.', 'Drink warm fluids.'],
  respir: ['Rest upright to assist breathing.', 'Keep room well-ventilated.', 'Drink warm fluids.'],
  gastro: ['Stay hydrated — sip water or ORS.', 'Avoid oily or dairy food for 24h.', 'Seek care if blood in stool or vomit.'],
  digest: ['Stay hydrated — sip water or ORS.', 'Avoid oily or dairy food for 24h.', 'Seek care if blood in stool or vomit.'],
  derm: ['Avoid scratching affected area.', 'Keep skin clean and dry.', 'Wear loose cotton clothing.'],
  skin: ['Avoid scratching affected area.', 'Keep skin clean and dry.', 'Wear loose cotton clothing.'],
  ortho: ['Apply R.I.C.E. — Rest, Ice, Compress, Elevate.', 'Avoid weight on painful limb.', 'Limit sharp-pain movements.'],
  bone: ['Apply R.I.C.E. — Rest, Ice, Compress, Elevate.', 'Avoid weight on painful limb.', 'Limit sharp-pain movements.'],
  joint: ['Apply R.I.C.E. — Rest, Ice, Compress, Elevate.', 'Avoid weight on painful limb.', 'Limit sharp-pain movements.'],
};
const DEFAULT_PRECAUTIONS = ['Get plenty of rest and sleep.', 'Stay hydrated.', 'Monitor your temperature.', 'Avoid self-medicating without a prescription.'];

/* ── Small helpers ─────────────────────────────────────────────── */
const StatusBadge = ({ status }) => {
  const M = {
    completed: { l: 'Completed', c: 'bg-emerald-500/10 text-emerald-400' },
    cancelled: { l: 'Cancelled', c: 'bg-rose-500/10 text-rose-400' },
    scheduled: { l: 'Scheduled', c: 'bg-aura-500/10 text-aura-400' },
    pending:   { l: 'Pending',   c: 'bg-amber-500/10 text-amber-400' },
    confirmed: { l: 'Confirmed', c: 'bg-blue-500/10 text-blue-400' },
  };
  const { l, c } = M[status?.toLowerCase()] || M.scheduled;
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${c}`}>{l}</span>;
};

const getPrecautions = (spec) => {
  const s = (spec || '').toLowerCase();
  for (const [key, precs] of Object.entries(PRECAUTIONS_MAP)) {
    if (s.includes(key)) return precs;
  }
  return DEFAULT_PRECAUTIONS;
};

const getDoctorAvailableDates = (doc) => {
  const dates = [];
  const today = new Date();
  const hasAvailability = doc?.availability && doc.availability.some(a => a.isAvailable !== false);
  
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    
    if (hasAvailability) {
      const dayName = d.toLocaleDateString('en-US', { weekday: 'lowercase' });
      const dayAvail = doc.availability.find(
        (a) => a.dayOfWeek?.toLowerCase() === dayName && a.isAvailable !== false
      );
      if (!dayAvail) continue;
    }
    
    dates.push({
      dateString: d.toISOString().split('T')[0],
      formatted: d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
      rawDate: d
    });
  }
  return dates;
};

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/* ══════════════════════════════════════════════════════════════════
   MESSAGE BUBBLE COMPONENT
   ══════════════════════════════════════════════════════════════════ */
const MessageBubble = ({ msg, handlers, bookingDate, setBookingDate, bookingTime, setBookingTime, selectedDoc, availableSlots, selectedSlot, selectSlot }) => {
  const isUser = msg.sender === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
        isUser ? 'bg-aura-600' : 'bg-gradient-to-br from-aura-500 to-indigo-600'}`}>
        {isUser ? <User size={14} className="text-white" /> : <Bot size={14} className="text-white" />}
      </div>

      <div className={`max-w-[78%] flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-aura-600 text-white rounded-tr-sm'
            : 'bg-[#111827] border border-white/[0.07] text-slate-200 rounded-tl-sm'
        }`}>
          {msg.text}

          {/* ── initial_options ── */}
          {msg.payload?.type === 'initial_options' && (
            <div className="mt-3 space-y-2">
              <button onClick={handlers.startBooking}
                className="w-full text-left px-3 py-2.5 rounded-xl bg-white/[0.05] hover:bg-aura-500/10 border border-white/[0.08] hover:border-aura-500/30 text-[12px] font-semibold text-slate-200 transition flex items-center gap-2.5">
                <Calendar size={14} className="text-aura-400 shrink-0" /> Book an appointment with a doctor
              </button>
              <Link to="/pharmacy/medicines"
                className="w-full text-left px-3 py-2.5 rounded-xl bg-white/[0.05] hover:bg-emerald-500/10 border border-white/[0.08] hover:border-emerald-500/30 text-[12px] font-semibold text-slate-200 transition flex items-center gap-2.5">
                <Pill size={14} className="text-emerald-400 shrink-0" /> Order from pharmacy
              </Link>
              <Link to="/labs/tests"
                className="w-full text-left px-3 py-2.5 rounded-xl bg-white/[0.05] hover:bg-indigo-500/10 border border-white/[0.08] hover:border-indigo-500/30 text-[12px] font-semibold text-slate-200 transition flex items-center gap-2.5">
                <FlaskConical size={14} className="text-indigo-400 shrink-0" /> Book a lab test
              </Link>
              <button onClick={handlers.startDosage}
                className="w-full text-left px-3 py-2.5 rounded-xl bg-white/[0.05] hover:bg-amber-500/10 border border-white/[0.08] hover:border-amber-500/30 text-[12px] font-semibold text-slate-200 transition flex items-center gap-2.5">
                <Pill size={14} className="text-amber-400 shrink-0" /> Dosage calculator
              </button>
            </div>
          )}

          {/* ── triage_results ── */}
          {msg.payload?.type === 'triage_results' && (
            <div className="mt-4 space-y-4">
              {/* Specialization card */}
              <div className="p-3 rounded-xl bg-white/[0.05] border border-white/[0.08]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">AI Triage Result</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    msg.payload.triage?.urgency === 'high'   ? 'bg-rose-500/15 text-rose-400' :
                    msg.payload.triage?.urgency === 'medium' ? 'bg-amber-500/15 text-amber-400' :
                                                               'bg-emerald-500/15 text-emerald-400'}`}>
                    {msg.payload.triage?.urgency} urgency
                  </span>
                </div>
                <p className="text-white font-bold text-sm flex items-center gap-2">
                  <Stethoscope size={14} className="text-aura-400" />
                  {msg.payload.triage?.recommendedSpecialization || 'General Physician'}
                </p>
              </div>

              {/* Labs */}
              {msg.payload.labs?.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">🧪 Suggested Pre-consultation Labs</p>
                  <div className="space-y-1.5">
                    {msg.payload.labs.map((lab, i) => (
                      <div key={i} className="px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                        <p className="text-[12px] font-semibold text-indigo-300">{lab.test_name}</p>
                        <p className="text-[11px] text-indigo-400/70 mt-0.5">{lab.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Precautions */}
              {msg.payload.precautions?.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">⚠️ Recommended Safety Precautions</p>
                  <ul className="list-disc list-inside space-y-1 text-slate-300 text-xs">
                    {msg.payload.precautions.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* ── preference_picker ── */}
          {msg.payload?.type === 'preference_picker' && (
            <div className="mt-3 grid grid-cols-1 gap-2">
              {PREFERENCE_OPTIONS.map(opt => {
                const Icon = opt.icon;
                return (
                  <button key={opt.key} onClick={() => handlers.selectPreference(opt.key)}
                    className="w-full text-left p-3 rounded-xl bg-white/[0.04] hover:bg-[#1f293d] border border-white/[0.08] hover:border-aura-500/30 transition flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg ${opt.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <Icon size={16} className={opt.color} />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-xs leading-none">{opt.label}</p>
                      <p className="text-[10px] text-slate-500 mt-1">{opt.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── doctor_list ── */}
          {msg.payload?.type === 'doctor_list' && (
            <div className="mt-3 space-y-2">
              {msg.payload.doctors.slice(0, 4).map(doc => (
                <div key={doc._id} className="p-3 rounded-xl bg-[#1f293d]/50 border border-white/[0.08] flex items-center justify-between gap-3">
                  <div>
                    <p className="text-white font-bold text-xs">Dr. {doc.fullName}</p>
                    <p className="text-[10px] text-slate-400">{doc.specialization} • {doc.experience}y exp</p>
                    {doc.clinic?.name && <p className="text-[10px] text-slate-500 mt-0.5">🏥 {doc.clinic.name}</p>}
                    {doc.distance != null && <p className="text-[10px] text-emerald-400 mt-0.5">📍 {(doc.distance / 1000).toFixed(1)} km away</p>}
                  </div>
                  <button onClick={() => handlers.selectDoctor(doc)}
                    className="px-3 py-1.5 rounded-lg bg-aura-600 hover:bg-aura-700 text-white text-[11px] font-bold transition">
                    Select
                  </button>
                </div>
              ))}
              {msg.payload.doctors.length === 0 && <p className="text-xs text-slate-500 italic">No doctors matching specialization available.</p>}
            </div>
          )}

          {/* ── select_date_time ── */}
          {msg.payload?.type === 'select_date_time' && (() => {
            const todayStr = new Date().toLocaleDateString('en-CA');
            const filteredSlots = availableSlots.filter(slot => {
              if (bookingDate !== todayStr) return true;
              const now = new Date();
              const currentMinutes = now.getHours() * 60 + now.getMinutes();
              const [hours, minutes] = slot.startTime.split(':').map(Number);
              return (hours * 60 + minutes) > currentMinutes;
            });

            return (
              <div className="mt-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-bold uppercase">Select Date</label>
                  <div className="grid grid-cols-3 gap-2 max-h-36 overflow-y-auto pr-1">
                    {getDoctorAvailableDates(selectedDoc).map((d) => (
                      <button key={d.dateString} onClick={() => { setBookingDate(d.dateString); selectSlot(null); }}
                        className={`py-1.5 rounded-lg text-[10px] font-semibold transition border ${
                          bookingDate === d.dateString 
                          ? 'bg-aura-600 text-white border-aura-500' 
                          : 'bg-white/[0.05] text-slate-300 border-white/[0.1] hover:border-aura-500/50'
                        }`}>
                        {d.formatted}
                      </button>
                    ))}
                  </div>
                </div>
                
                {filteredSlots.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase">Available Time Slots</label>
                    <div className="grid grid-cols-3 gap-2">
                      {filteredSlots.map((slot) => (
                        <button key={slot.startTime} onClick={() => slot.available && selectSlot(slot)}
                          disabled={!slot.available}
                          className={`py-1.5 rounded-lg text-[11px] font-semibold transition border ${
                            !slot.available
                            ? 'bg-slate-800/40 text-slate-500 border-white/[0.03] cursor-not-allowed opacity-50 line-through'
                            : selectedSlot?.startTime === slot.startTime 
                              ? 'bg-aura-600 text-white border-aura-500' 
                              : 'bg-white/[0.05] text-slate-300 border-white/[0.1] hover:border-aura-500/50'
                          }`}>
                          {slot.startTime}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button onClick={handlers.confirmBooking}
                  className="w-full py-2.5 rounded-xl bg-aura-600 hover:bg-aura-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5">
                  <Check size={14} /> Confirm Appoinment
                </button>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ══════════════════════════════════════════════════════════════════ */
const PatientAppointmentsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const view = searchParams.get('view');

  // Database Clinics
  const [dbClinics, setDbClinics] = useState([]);

  // Chat States
  const [messages, setMessages]       = useState([]);
  const [inputValue, setInputValue]   = useState('');
  const [isTyping, setIsTyping]       = useState(false);
  const [chatStarted, setChatStarted] = useState(false);
  const [flow, setFlow]               = useState('menu');

  // Booking data
  const [patientProfile, setPatientProfile] = useState(null);
  const [symptomsInput, setSymptomsInput]   = useState('');
  const [selectedDoc, setSelectedDoc]       = useState(null);
  const [bookingDate, setBookingDate]       = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot]   = useState(null);

  // Dosage data
  const [dosageMed, setDosageMed]       = useState('');
  const [dosageAge, setDosageAge]       = useState('');

  // Right panel
  const [appointments, setAppointments] = useState([]);
  const [apptLoading, setApptLoading]   = useState(true);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Missing States
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [activeClinicTab, setActiveClinicTab] = useState('overview');
  const [activeTab, setActiveTab] = useState('appointments');
  const [bookingTime, setBookingTime] = useState('');
  const [clinicDoctors, setClinicDoctors] = useState([]);
  const [triageResult, setTriageResult] = useState(null);

  // Load Clinics List
  useEffect(() => {
    clinicApi.list({ limit: 20 })
      .then(res => setDbClinics(res.data?.clinics || res.clinics || []))
      .catch(() => {});
  }, []);

  // Fetch Doctors for Selected Clinic
  useEffect(() => {
    if (selectedClinic && selectedClinic.id) {
      doctorApi.list({ clinicId: selectedClinic.id })
        .then(res => {
          const docs = res.doctors || res.data?.doctors || res || [];
          setClinicDoctors(docs);
        })
        .catch(() => setClinicDoctors([]));
    } else {
      setClinicDoctors([]);
    }
  }, [selectedClinic]);

  // Fetch Slots
  useEffect(() => {
    if (bookingDate && selectedDoc) {
      appointmentApi.getAvailableSlots({
        doctorId: selectedDoc._id || selectedDoc.id,
        date: bookingDate,
        clinicId: selectedDoc.clinic?._id || selectedDoc.clinicId || undefined,
        durationMinutes: 15
      })
        .then(res => setAvailableSlots(res.slots || res.data?.slots || []))
        .catch(() => setAvailableSlots([]));
    }
  }, [bookingDate, selectedDoc]);

  /* ── Init ── */
  useEffect(() => {
    if (user) {
      setMessages([
        { id: uid(), sender: 'bot', text: `Hi ${user.name?.split(' ')[0] || 'there'}! 👋` },
        { id: uid(), sender: 'bot', text: `Welcome to Aura Smart Health Care . How can I help you today?`, payload: { type: 'initial_options' } },
      ]);
    }
  }, [user]);

  useEffect(() => {
    (async () => {
      try {
        const data = await patientApi.me();
        setPatientProfile(data?.data?.patient || data?.patient || data);
      } catch (e) { /* */ }
    })();
  }, [user]);

  useEffect(() => {
    appointmentApi.getAppointments({ limit: 30 })
      .then(r => setAppointments(r?.appointments || r?.data?.appointments || []))
      .catch(() => {})
      .finally(() => setApptLoading(false));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  /* ── Helpers ── */
  const addMsg = (sender, text, payload = null) => {
    setMessages(prev => [...prev, { id: uid(), sender, text, payload }]);
  };
  const ensureChatStarted = () => { if (!chatStarted) setChatStarted(true); };

  const selectSlot = (slot) => setSelectedSlot(slot);

  /* ══════════════════════════════════════════════════════════════
     FLOW HANDLERS
  ══════════════════════════════════════════════════════════════ */

  const startBooking = async () => {
    ensureChatStarted();
    setFlow('booking_start');
    setIsTyping(true);
    try {
      const data = await patientApi.me();
      const p = data?.data?.patient || data?.patient || data;
      if (p) setPatientProfile(p);
    } catch (e) { /* */ }
    setTimeout(() => {
      setIsTyping(false);
      addMsg('bot', 'What problem are you experiencing? Please describe your symptoms in detail.');
    }, 600);
  };

  const startDosage = () => {
    ensureChatStarted();
    setFlow('dosage_medicine');
    setIsTyping(true);
    setTimeout(() => { setIsTyping(false); addMsg('bot', 'What is the name of the medicine? (e.g. Paracetamol, Ibuprofen)'); }, 600);
  };

  /* ── AI Triage ── */
  const processTriage = async (symptoms, conditions, dob) => {
    setIsTyping(true);
    try {
      const bd = new Date(dob);
      let age = new Date().getFullYear() - bd.getFullYear();
      const m = new Date().getMonth() - bd.getMonth();
      if (m < 0 || (m === 0 && new Date().getDate() < bd.getDate())) age--;

      const triage = await aiApi.symptomCheck({
        symptoms, age,
        gender: patientProfile?.gender || undefined,
        known_conditions: conditions
      });

      let labs = [];
      try {
        const lr = await aiApi.labTestRecommendations({ symptoms, age });
        labs = lr.suggested_tests || lr.data?.suggested_tests || [];
      } catch (e) { /* */ }

      const precautions = getPrecautions(triage.recommendedSpecialization);

      setIsTyping(false);
      setTriageResult(triage);

      addMsg('bot', 'AI Triage completed. Here are your results:', {
        type: 'triage_results',
        triage,
        labs,
        precautions
      });

      setTimeout(() => {
        addMsg('bot', 'How would you like to consult?', { type: 'preference_picker' });
        setFlow('booking_preference');
      }, 800);
    } catch (err) {
      console.error(err);
      setIsTyping(false);
      addMsg('bot', 'I could not analyze your symptoms right now. Please try again later.');
      showMenu();
    }
  };

  /* ── Preference selected ── */
  const selectPreference = async (pref) => {
    ensureChatStarted();
    const opt = PREFERENCE_OPTIONS.find(o => o.key === pref);
    addMsg('user', opt?.label || pref);
    setIsTyping(true);

    const lat = patientProfile?.currentAddress?.latitude;
    const lng = patientProfile?.currentAddress?.longitude;

    try {
      const res = await doctorApi.smartSearch({
        specialization: triageResult?.recommendedSpecialization || 'General Physician',
        preference: pref,
        ...(lat && lng ? { lat, lng } : {})
      });

      const docs = res?.doctors || res?.data?.doctors || [];
      setIsTyping(false);

      addMsg('bot', `Found ${docs.length} doctor${docs.length !== 1 ? 's' : ''} ranked by "${opt?.label || pref}":`, {
        type: 'doctor_list',
        doctors: docs
      });
      setFlow('booking_results');
    } catch (err) {
      console.error(err);
      setIsTyping(false);
      addMsg('bot', 'Could not search doctors. Falling back to default listing…');
      try {
        const fallback = await doctorApi.list({ specialization: triageResult?.recommendedSpecialization });
        const docs = (fallback.doctors || fallback.data?.doctors || []).map(d => ({
          ...d,
          clinic: { name: '', _id: d.clinicId },
          organization: { name: '' },
          distance: null
        }));
        addMsg('bot', `Here are ${docs.length} doctor(s) matching the specialization:`, {
          type: 'doctor_list',
          doctors: docs.slice(0, 10)
        });
      } catch (e2) {
        addMsg('bot', 'No doctors found. Please try again later.');
      }
      setFlow('booking_results');
    }
  };

  /* ── Doctor selected ── */
  const selectDoctor = (doc) => {
    setSelectedDoc(doc);
    setFlow('booking_confirm');
    addMsg('user', `Book with Dr. ${doc.fullName}`);
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const clinicInfo = doc.clinic?.name ? ` at ${doc.clinic.name}` : '';
      addMsg('bot', `Great! Pick a date and time for your consultation with Dr. ${doc.fullName}${clinicInfo}:`, { type: 'select_date_time' });
    }, 600);
  };

  /* ── Confirm booking ── */
  const confirmBooking = async () => {
    if (!selectedSlot) { addMsg('bot', 'Please select a time slot.'); return; }
    if (user?.role?.toUpperCase() !== 'PATIENT') {
      addMsg('bot', '❌ Booking failed: Only patients are authorized to book slots directly.');
      return;
    }
    setIsTyping(true);
    try {
      // Validate slot availability at the backend first
      const checkRes = await appointmentApi.getAvailableSlots({
        doctorId: selectedDoc?._id || selectedDoc?.id,
        date: bookingDate,
        clinicId: selectedDoc?.clinic?._id || selectedDoc?.clinicId || undefined,
        durationMinutes: 15
      });
      const freshSlots = checkRes.slots || checkRes.data?.slots || [];
      const match = freshSlots.find(s => s.startTime === selectedSlot.startTime);
      if (!match || !match.available) {
        setIsTyping(false);
        addMsg('bot', '❌ Sorry, this slot is no longer available. Please select another slot.');
        setAvailableSlots(freshSlots);
        selectSlot(null);
        return;
      }

      await appointmentApi.createAppointment({
        patientId: patientProfile?._id || patientProfile?.id,
        doctorId: selectedDoc?._id || selectedDoc?.id,
        clinicId: selectedDoc?.clinic?._id || undefined,
        appointmentDate: bookingDate,
        startTime: selectedSlot.startTime,
        durationMinutes: 15,
        appointmentType: 'scheduled',
        source: 'chatbot',
        reasonForVisit: `AI Triage: ${selectedDoc?.specialization || 'General Practitioner'}`,
        symptomsSummary: symptomsInput,
      });
      setIsTyping(false);
      const dateStr = new Date(bookingDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      addMsg('bot', `✅ Appointment request submitted!\n\n📅 ${dateStr}\n⏰ ${selectedSlot.startTime}\n👨‍⚕️ Dr. ${selectedDoc?.fullName}\n🏥 ${selectedDoc?.clinic?.name || 'Clinic'}\n\nYour appointment has been booked.`);
      setSelectedDoc(null); setBookingDate(''); selectSlot(null);
      try {
        const r = await appointmentApi.getAppointments({ limit: 30 });
        setAppointments(r?.appointments || r?.data?.appointments || []);
      } catch (e) { /* */ }
      setTimeout(showMenu, 1200);
    } catch (err) {
      setIsTyping(false);
      addMsg('bot', `❌ Booking failed: ${err.response?.data?.message || err.message}`);
      setSelectedDoc(null); setBookingDate(''); selectSlot(null);
    }
  };

  const showMenu = () => {
    setFlow('menu');
    addMsg('bot', 'What else can I help with?', { type: 'initial_options' });
  };

  const calcDosage = (med, age, weight) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const w = Number(weight), a = Number(age), m = med.toLowerCase();
      let dose = '';
      if (m.includes('paracetamol') || m.includes('crocin') || m.includes('acetaminophen'))
        dose = `${(w * 15).toFixed(0)}mg orally every 4–6 hours (max 4 doses/24h)`;
      else if (m.includes('ibuprofen'))
        dose = `${(w * 10).toFixed(0)}mg orally every 6–8 hours (take with food)`;
      else if (m.includes('amoxicillin'))
        dose = `${((w * 30) / 3).toFixed(0)}mg orally 3× daily (5–7 day course)`;
      else
        dose = a < 12 ? 'Paediatric formulation (~7.5mg/kg). Consult paediatrician.' : 'Adult dosage — check leaflet or ask pharmacist.';

      addMsg('bot', `💊 Dosage for ${med} (Age ${age}y, Weight ${weight}kg):\n\n${dose}\n\n⚠️ Always verify with your doctor before administering.`);
      setDosageMed(''); setDosageAge('');
      setTimeout(showMenu, 600);
    }, 1000);
  };

  const handleSend = async (override) => {
    const raw = override ?? inputValue;
    const text = raw.trim();
    if (!text || isTyping) return;
    setInputValue('');
    ensureChatStarted();
    addMsg('user', text);
    setIsTyping(true);
    const lower = text.toLowerCase();

    if (flow === 'menu' || flow === 'booking_results') {
      if (lower.includes('appointment') || lower.includes('book') || lower.includes('schedule') || lower.includes('doctor'))
        return startBooking();
      if (lower.includes('pharmacy') || lower.includes('medicine') || lower.includes('order'))
        { setTimeout(() => { setIsTyping(false); addMsg('bot', 'Redirecting to pharmacy…'); setTimeout(() => navigate('/pharmacy/medicines'), 500); }, 400); return; }
      if (lower.includes('lab') || lower.includes('test'))
        { setTimeout(() => { setIsTyping(false); addMsg('bot', 'Redirecting to lab tests…'); setTimeout(() => navigate('/labs/tests'), 500); }, 400); return; }
      if (lower.includes('dosage') || lower.includes('dose'))
        return startDosage();
      if (lower.includes('reschedule'))
        { setTimeout(() => { setIsTyping(false); addMsg('bot', "Share the appointment date you'd like to change and your preferred new time."); }, 600); return; }
      if (lower.includes('hour') || lower.includes('open'))
        { setTimeout(() => { setIsTyping(false); addMsg('bot', 'Clinic hours: Mon–Sat, 9:00 AM – 6:00 PM. Specialist hours may differ.'); }, 600); return; }
      if (lower.includes('location') || lower.includes('address') || lower.includes('where'))
        { setTimeout(() => { setIsTyping(false); addMsg('bot', "Check the 'Clinic Details' card above for the full address and map."); }, 600); return; }
      
      setTimeout(() => { setIsTyping(false); addMsg('bot', "I can help with appointments, dosage, labs, and pharmacy. Try one of the actions above!", { type: 'initial_options' }); }, 600);
      return;
    }

    if (flow === 'booking_start') {
      setSymptomsInput(text);
      setFlow('booking_symptoms');
      const existing = patientProfile?.chronicConditions || [];
      setTimeout(() => {
        setIsTyping(false);
        addMsg('bot', existing.length > 0
          ? `I see you have: ${existing.join(', ')}. Any additional conditions? ("none" if not)`
          : 'Do you have any known medical conditions? (Type "none" if none)');
      }, 700);
      return;
    }

    if (flow === 'booking_symptoms') {
      const noneWords = ['none', 'no', 'nothing', 'nil'];
      const hasNew = !noneWords.includes(lower.trim());
      let conds = [...(patientProfile?.chronicConditions || [])];
      if (hasNew) {
        const nc = text.split(',').map(c => c.trim()).filter(Boolean);
        conds = Array.from(new Set([...conds, ...nc]));
        try { await patientApi.updateMe({ chronicConditions: conds }); } catch (e) { /* */ }
      }
      const hasDob = patientProfile?.dateOfBirth;
      if (hasDob) {
        setFlow('booking_processing');
        setTimeout(() => processTriage(symptomsInput, conds, patientProfile.dateOfBirth), 300);
      } else {
        setFlow('booking_dob');
        setTimeout(() => { setIsTyping(false); addMsg('bot', 'What is your date of birth? (YYYY-MM-DD)'); }, 600);
      }
      return;
    }

    if (flow === 'booking_dob') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        setIsTyping(false);
        addMsg('bot', 'Invalid format. Use YYYY-MM-DD (e.g. 1990-05-15).');
        return;
      }
      setFlow('booking_processing');
      let fresh = patientProfile;
      try {
        const r = await patientApi.updateMe({ dateOfBirth: text });
        fresh = r?.data?.patient || r?.patient || r;
        if (fresh) setPatientProfile(fresh);
      } catch (e) { /* */ }
      setTimeout(() => processTriage(symptomsInput, fresh?.chronicConditions || [], text), 300);
      return;
    }

    if (flow === 'dosage_medicine') {
      setDosageMed(text); setFlow('dosage_age');
      setTimeout(() => { setIsTyping(false); addMsg('bot', "Patient's age in years?"); }, 500);
      return;
    }
    if (flow === 'dosage_age') {
      if (isNaN(Number(text))) { setIsTyping(false); addMsg('bot', 'Enter a valid number.'); return; }
      setDosageAge(text); setFlow('dosage_weight');
      setTimeout(() => { setIsTyping(false); addMsg('bot', "Patient's weight in kg?"); }, 500);
      return;
    }
    if (flow === 'dosage_weight') {
      if (isNaN(Number(text))) { setIsTyping(false); addMsg('bot', 'Enter a valid number.'); return; }
      setFlow('menu');
      calcDosage(dosageMed, dosageAge, text);
      return;
    }

    setTimeout(() => { setIsTyping(false); addMsg('bot', "Try the action buttons or describe what you need!"); }, 500);
  };

  const handleCardClick = (card) => {
    ensureChatStarted();
    if (card.action === 'book') { addMsg('user', 'Book an appointment'); startBooking(); }
    else if (card.action === 'dosage') { addMsg('user', 'Dosage calculator'); startDosage(); }
    else if (card.action === 'reschedule') handleSend('Can you reschedule my appointment?');
    else if (card.action === 'clinic') handleSend('Where is the clinic located?');
  };

  const rightPanelAppts = appointments.map(a => ({
    id:      a._id,
    letter:  (a.doctorId?.fullName?.[0] || 'D').toUpperCase(),
    bg:      'bg-aura-600',
    title:   a.doctorId?.fullName || 'Doctor Appointment',
    preview: a.reasonForVisit || `${a.clinicId?.name || 'Clinic'} • ${a.startTime || ''}`,
    time:    a.appointmentDate ? new Date(a.appointmentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'TBD',
    status:  a.status,
  }));

  const handlers = { startBooking, startDosage, selectPreference, selectDoctor, confirmBooking };

  // ══════════════════════════════════════════════════════════════════
  // RENDER CLINIC DETAILS DASHBOARD VIEW (when view === 'clinic')
  // ══════════════════════════════════════════════════════════════════
  if (view === 'clinic') {
    const displayClinics = dbClinics.map((c, i) => ({
      id: c._id || String(i),
      name: c.name,
      rating: c?.rating || '4.7',
      reviews: c?.reviews || '90',
      dist: `${(0.8 + i * 0.4).toFixed(1)} km`,
      type: 'AuraCare Clinic',
      specs: 'General Consultation, Triage',
      img: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&auto=format&fit=crop&q=60',
      isNearest: i === 0,
      phone: c.phone || '+91 98765 43210',
      email: c.email || 'info@auracare.com',
      web: c.web || 'www.auracare.com'
    }));

    // DETAILED CLINIC VIEW
    if (selectedClinic) {
      // Find other clinics of the hospital group
      const otherClinics = displayClinics.filter(c => c.id !== selectedClinic.id);

      return (
        <div className="w-full space-y-6 p-4 md:p-6 animate-fade-in bg-[#080e1a] text-slate-100 min-h-screen">
          {/* Breadcrumb Header */}
          <div className="pb-2 border-b border-white/[0.06] flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">
                <span className="cursor-pointer hover:text-aura-400" onClick={() => setSelectedClinic(null)}>My Portal</span> &gt; View Clinic &amp; Details
              </p>
              <h1 className="text-xl md:text-2xl font-extrabold text-white mt-1">View Clinic &amp; Details</h1>
            </div>
            <button 
              onClick={() => setSelectedClinic(null)}
              className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 text-xs font-bold transition flex items-center gap-1.5"
            >
              &larr; Back to Listings
            </button>
          </div>

          {/* TWO COLUMN GRID */}
          <div className="flex flex-col lg:flex-row gap-6 w-full items-start">
            {/* LEFT PANEL (2/3 width) */}
            <div className="flex-1 min-w-0 space-y-6 w-full lg:w-2/3">
              {/* Header Details Card */}
              <div className="relative overflow-hidden rounded-2xl p-6 bg-[#060d18] border border-white/[0.08] flex flex-col md:flex-row gap-6">
                
                {/* Background glows */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-aura-500/10 blur-3xl" />
                  <div className="absolute -bottom-16 -left-10 w-64 h-64 rounded-full bg-indigo-600/10 blur-3xl" />
                </div>

                {/* Left: Image with star rating overlay */}
                <div className="relative w-full md:w-64 h-48 rounded-xl bg-slate-900 border border-white/10 overflow-hidden shrink-0">
                  <img 
                    src={selectedClinic.img || "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&auto=format&fit=crop&q=60"} 
                    alt={selectedClinic.name} 
                    className="w-full h-full object-cover" 
                  />
                  <div className="absolute bottom-2.5 left-2.5 bg-slate-950/80 border border-white/15 backdrop-blur-md px-2 py-1 rounded-lg text-xs font-bold text-amber-400 flex items-center gap-1">
                    <Star size={12} fill="currentColor" className="text-amber-400" />
                    <span>{selectedClinic.rating || '4.8'}</span>
                  </div>
                </div>

                {/* Right: Content details */}
                <div className="relative flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    {/* Nearest Tag at the top if matches closest clinic */}
                    {(selectedClinic.isNearest || selectedClinic.dist === '0.8 km' || selectedClinic.id === '1') && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 mb-2">
                        <MapPin size={10} className="fill-emerald-400/20" />
                        Nearest to You
                      </span>
                    )}

                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-xl md:text-2xl font-extrabold text-white leading-tight">
                        {selectedClinic.name}
                      </h2>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">
                        <CheckCircle2 size={10} /> Verified Clinic
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mt-1">{selectedClinic.type || 'Multi-specialty Clinic'}</p>
                    
                    {/* Sub-badges */}
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {[
                        { text: 'Experienced Doctors', icon: <User size={10} /> },
                        { text: 'Modern Facilities', icon: <Sparkles size={10} /> },
                        { text: 'Personalized Care', icon: <Heart size={10} /> },
                        { text: 'Patient First Approach', icon: <Activity size={10} /> }
                      ].map((item, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium bg-white/[0.04] text-slate-300 border border-white/[0.05]">
                          {item.icon}
                          {item.text}
                        </span>
                      ))}
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed mt-3.5">
                      {selectedClinic.name} is a modern clinic providing comprehensive healthcare services with a patient-first approach. Our team of experienced doctors ensures you receive the best care possible.
                    </p>
                  </div>

                  {/* Contact Row */}
                  <div className="flex items-center gap-3.5 flex-wrap pt-2 text-xs border-t border-white/[0.04]">
                    <a href={`tel:${selectedClinic.phone}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 transition border border-white/[0.05]">
                      <Phone size={12} className="text-aura-400" />
                      {selectedClinic.phone || '+91 98765 43210'}
                    </a>
                    <a href={`mailto:${selectedClinic.email}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 transition border border-white/[0.05]">
                      <Mail size={12} className="text-aura-400" />
                      {selectedClinic.email || 'info@aicmsclinic.com'}
                    </a>
                    <a href={`https://${selectedClinic.web}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 transition border border-white/[0.05]">
                      <Globe size={12} className="text-aura-400" />
                      {selectedClinic.web || 'www.aicmsclinic.com'}
                    </a>
                  </div>

                </div>
              </div>

              {/* Tabs Row */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 border-b border-white/[0.06] scrollbar-none">
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'doctors', label: 'Doctors (8)' },
                  { id: 'services', label: 'Services' },
                  { id: 'facilities', label: 'Facilities' },
                  { id: 'reviews', label: `Reviews (${selectedClinic.reviews || '128'})` },
                  { id: 'insurance', label: 'Insurance' },
                  { id: 'gallery', label: 'Gallery' }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveClinicTab(t.id)}
                    className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                      activeClinicTab === t.id
                        ? 'text-aura-400 border-aura-400'
                        : 'text-slate-400 border-transparent hover:text-slate-200'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Overview Tab Content */}
              {activeClinicTab === 'overview' && (
                <div className="space-y-6">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                      { val: `${selectedClinic.rating || '4.8'} ★`, label: `${selectedClinic.reviews || '128'} Reviews`, icon: <Star size={16} className="text-amber-500" /> },
                      { val: '8+', label: 'Expert Doctors', icon: <User size={16} className="text-blue-400" /> },
                      { val: '5', label: 'Specialties', icon: <Stethoscope size={16} className="text-purple-400" /> },
                      { val: '12K+', label: 'Happy Patients', icon: <Heart size={16} className="text-rose-400" /> },
                      { val: '98%', label: 'Patient Satisfaction', icon: <Activity size={16} className="text-emerald-400" /> }
                    ].map((st, i) => (
                      <div key={i} className="p-4 rounded-xl bg-[#060d18] border border-white/[0.06] flex flex-col items-center justify-center text-center space-y-1">
                        <div className="w-8 h-8 rounded-full bg-white/[0.04] flex items-center justify-center mb-1">{st.icon}</div>
                        <p className="text-base font-bold text-white leading-none">{st.val}</p>
                        <p className="text-[10px] text-slate-500">{st.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Our Services Section */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-bold text-white">Our Services</h3>
                      <button className="text-xs font-bold text-aura-500 hover:text-aura-600" onClick={() => setActiveClinicTab('services')}>
                        View All Services
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { title: 'General Consultation', desc: 'Consult with our general physicians for routine checkups and treatment.', icon: <Stethoscope size={16} className="text-purple-400" /> },
                        { title: 'Pediatrics', desc: 'Specialized care for infants, children, and adolescents.', icon: <Sparkles size={16} className="text-amber-400" /> },
                        { title: 'Cardiology', desc: 'Comprehensive heart care and cardiac health management.', icon: <Heart size={16} className="text-rose-400" /> },
                        { title: 'Dermatology', desc: 'Skin, hair, and nail care with advanced treatments.', icon: <User size={16} className="text-emerald-400" /> },
                        { title: 'Orthopedics', desc: 'Bone, joint, and muscle care for improved mobility.', icon: <Activity size={16} className="text-blue-400" /> },
                        { title: 'Gynecology', desc: 'Women\'s health and wellness with expert care.', icon: <User size={16} className="text-pink-400" /> },
                        { title: 'Diagnostics', desc: 'Advanced lab tests and imaging for accurate diagnosis.', icon: <FlaskConical size={16} className="text-indigo-400" /> },
                        { title: 'Physiotherapy', desc: 'Rehabilitation and pain management for better movement.', icon: <Activity size={16} className="text-amber-500" /> }
                      ].map((srv, idx) => (
                        <div key={idx} className="p-4 rounded-xl bg-[#060d18] border border-white/[0.06] flex flex-col justify-between space-y-4 hover:border-white/20 transition-all">
                          <div className="space-y-2">
                            <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">{srv.icon}</div>
                            <h4 className="text-xs font-bold text-white">{srv.title}</h4>
                            <p className="text-[10px] text-slate-400 leading-relaxed">{srv.desc}</p>
                          </div>
                          <button 
                            onClick={() => {
                              setSelectedDoc(null);
                              setSelectedClinic(null);
                              // Trigger booking chatbot query
                              startBooking();
                            }}
                            className="w-full py-1.5 rounded-lg bg-white/[0.04] hover:bg-aura-500/10 hover:text-white border border-white/[0.08] hover:border-aura-500/30 text-[10px] font-bold text-slate-300 transition"
                          >
                            Book Appointment
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Priority banner */}
                  <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4 flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <Shield size={20} className="text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-emerald-400">Your Health, Our Priority</h4>
                      <p className="text-[10px] text-emerald-500/70 mt-0.5">We are committed to providing the best healthcare experience with advanced technology and compassionate care.</p>
                    </div>
                  </div>

                </div>
              )}

              {/* Doctors Tab Content */}
              {activeClinicTab === 'doctors' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {clinicDoctors.map((doc, idx) => ({
                    ...doc,
                    _id: doc._id || String(idx),
                    fullName: doc.fullName,
                    specialization: doc.specialization || 'General Physician',
                    experience: doc.experience || 5,
                    rating: doc.rating || 4.8,
                    slots: ['09:00 AM', '11:00 AM', '02:00 PM', '04:00 PM']
                  })).map((doc, idx) => (
                    <div key={doc._id || idx} className="p-4 rounded-2xl bg-[#060d18] border border-white/[0.06] flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-white">Dr. {doc.fullName}</h4>
                        <p className="text-[10px] text-slate-400">{doc.specialization} • {doc.experience} Years Exp</p>
                        <div className="flex items-center gap-1 text-[9px] text-amber-400 font-bold">
                          <Star size={10} fill="currentColor" /> {doc.rating} Rating
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          setSelectedDoc(doc._id ? doc : { ...doc, _id: String(idx) });
                          setBookingDate(new Date().toISOString().split('T')[0]);
                          setFlow('booking_confirm');
                          addMsg('user', `Book with Dr. ${doc.fullName}`);
                          // Back to chatbot view
                          setSelectedClinic(null);
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-aura-600 hover:bg-aura-700 text-white text-[10px] font-bold transition"
                      >
                        Book Slot
                      </button>
                    </div>
                  ))}
                  {clinicDoctors.length === 0 && dbClinics.length > 0 && (
                    <div className="col-span-1 sm:col-span-2 p-6 text-center text-slate-400 italic bg-[#060d18] rounded-2xl border border-white/[0.06]">
                      No doctors are currently available at this clinic.
                    </div>
                  )}
                </div>
              )}

              {/* Placeholder tabs */}
              {['services', 'facilities', 'reviews', 'insurance', 'gallery'].includes(activeClinicTab) && (
                <div className="p-8 rounded-xl bg-[#060d18] border border-white/[0.06] text-center space-y-3">
                  <Sparkles className="mx-auto text-aura-400" size={32} />
                  <div>
                    <h3 className="text-xs font-bold text-white capitalize">{activeClinicTab} Details</h3>
                    <p className="text-[10px] text-slate-400 mt-1">This section contains advanced amenities and dynamic configuration for {selectedClinic.name}.</p>
                  </div>
                </div>
              )}

            </div>

            {/* RIGHT PANEL (1/3 width) */}
            <div className="w-full lg:w-1/3 space-y-6">
              {/* Card 1: Book Appointment */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#060d18] p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Calendar size={15} className="text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Book an Appointment</h3>
                    <p className="text-[9px] text-slate-500">Consult with our specialists</p>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    setSelectedClinic(null);
                    startBooking();
                  }}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-extrabold transition flex items-center justify-center gap-1.5"
                >
                  <Calendar size={13} /> Book Appointment
                </button>
                <a 
                  href={`tel:${selectedClinic.phone}`}
                  className="w-full py-2.5 rounded-xl border border-emerald-500/25 hover:bg-emerald-500/5 text-emerald-400 text-xs font-bold transition flex items-center justify-center gap-1.5 text-center"
                >
                  <Phone size={13} /> Call Clinic
                </a>
              </div>

              {/* Card 2: Clinic Information */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#060d18] p-5 space-y-3.5">
                <h3 className="text-xs font-bold text-white border-b border-white/[0.06] pb-2">Clinic Information</h3>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Clinic Type</span>
                    <span className="text-slate-300 font-medium">Multi-specialty</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Established</span>
                    <span className="text-slate-300 font-medium">2015</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Doctors</span>
                    <span className="text-slate-300 font-medium">8+</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Patients Treated</span>
                    <span className="text-slate-300 font-medium">12,000+</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Languages</span>
                    <span className="text-slate-300 font-medium">English, Hindi</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Clinic Hours */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#060d18] p-5 space-y-3.5">
                <h3 className="text-xs font-bold text-white border-b border-white/[0.06] pb-2">Clinic Hours</h3>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Monday - Friday</span>
                    <span className="text-slate-300 font-medium">09:00 AM - 08:00 PM</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Saturday</span>
                    <span className="text-slate-300 font-medium">09:00 AM - 04:00 PM</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Sunday</span>
                    <span className="text-slate-300 font-medium">10:00 AM - 02:00 PM</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-white/[0.04]">
                    <span className="text-rose-400 font-semibold">Emergency Services</span>
                    <span className="text-rose-450 font-bold">24 x 7 Available</span>
                  </div>
                </div>
              </div>

              {/* Card 4: Clinic Location */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#060d18] p-5 space-y-4">
                <h3 className="text-xs font-bold text-white border-b border-white/[0.06] pb-2">Clinic Location</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {selectedClinic.name}, 123, Health Street, Sector 45, Gurgaon, Haryana - 122003
                </p>
                {/* Mock map visual */}
                <div className="relative h-24 rounded-lg bg-slate-950 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full opacity-10" viewBox="0 0 100 100">
                    <line x1="20" y1="0" x2="20" y2="100" stroke="#fff" strokeWidth="0.5" />
                    <line x1="50" y1="0" x2="50" y2="100" stroke="#fff" strokeWidth="0.5" />
                    <line x1="80" y1="0" x2="80" y2="100" stroke="#fff" strokeWidth="0.5" />
                    <line x1="0" y1="30" x2="100" y2="30" stroke="#fff" strokeWidth="0.5" />
                    <line x1="0" y1="60" x2="100" y2="60" stroke="#fff" strokeWidth="0.5" />
                  </svg>
                  <MapPin size={24} className="text-emerald-500 animate-bounce absolute" />
                </div>
                <button 
                  onClick={() => window.open('https://maps.google.com', '_blank')}
                  className="w-full py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  <MapPin size={12} /> Get Directions
                </button>
              </div>

              {/* Card 5: Other Locations / Clinics of the Hospital Group */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#060d18] p-5 space-y-3.5">
                <div className="flex justify-between items-center border-b border-white/[0.06] pb-2">
                  <h3 className="text-xs font-bold text-white">Other Clinics / Locations</h3>
                  <span className="text-[10px] text-slate-500 font-semibold">Group Network</span>
                </div>
                <div className="space-y-3">
                  {otherClinics.map(oc => (
                    <div 
                      key={oc.id}
                      className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.1] transition-all flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-300 truncate">{oc.name}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{oc.type} • {oc.dist}</p>
                      </div>
                      <button 
                        onClick={() => {
                          setSelectedClinic(oc);
                          setActiveClinicTab('overview');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-aura-500/20 border border-white/10 hover:border-aura-500/30 text-white text-[10px] font-bold transition shrink-0"
                      >
                        View
                      </button>
                    </div>
                  ))}
                  {otherClinics.length === 0 && (
                    <p className="text-xs text-slate-500 italic">No other network clinics found.</p>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full space-y-6 p-4 md:p-6 animate-fade-in bg-[#080e1a] text-slate-100 min-h-screen">
        
        {/* Breadcrumb Header */}
        <div className="pb-2 border-b border-white/[0.06]">
          <p className="text-xs text-slate-500">My Portal &gt; View Clinics &amp; Hospitals</p>
          <h1 className="text-xl md:text-2xl font-extrabold text-white mt-1">View Clinics &amp; Hospitals</h1>
        </div>

        {/* TWO COLUMN GRID */}
        <div className="flex flex-col lg:flex-row gap-6 w-full items-start">
          
          {/* LEFT PANEL (2/3 width) */}
          <div className="flex-1 min-w-0 space-y-6 w-full lg:w-2/3">
            
            {/* Search and Maps Banner */}
            <div className="relative overflow-hidden rounded-2xl p-6 bg-[#060d18] border border-white/[0.06] flex flex-col md:flex-row md:items-center justify-between gap-6">
              {/* Background glows */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-aura-500/10 blur-3xl" />
                <div className="absolute -bottom-16 -left-10 w-64 h-64 rounded-full bg-indigo-600/10 blur-3xl" />
              </div>

              <div className="relative flex-1 space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-white">Find the best care, near you</h2>
                  <p className="text-xs text-slate-400 mt-1">Search and explore top-rated clinics &amp; hospitals near your location or in any city.</p>
                </div>

                <div className="relative w-full max-w-md">
                  <input
                    type="text"
                    placeholder="Search by hospital, clinic, specialty or doctor..."
                    className="w-full pl-4 pr-10 py-2.5 rounded-xl text-xs bg-slate-900 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-aura-500 transition"
                  />
                  <MessageCircle size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                </div>

                <div className="flex items-center gap-3">
                  <button className="px-4 py-2 rounded-xl bg-aura-600 hover:bg-aura-700 text-white text-xs font-bold transition flex items-center gap-1.5">
                    <MapPin size={13} />
                    Near Me
                  </button>
                  <button className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 text-xs font-bold transition">
                    In City
                  </button>
                  <div className="text-[11px] text-slate-400 ml-2">
                    Current Location: <span className="font-semibold text-white">Sector 45, Gurgaon</span>
                  </div>
                </div>
              </div>

              {/* Graphic map mockup */}
              <div className="relative w-full md:w-56 h-40 rounded-xl bg-slate-900 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                <div className="absolute inset-0 bg-slate-950/20 z-10" />
                {/* SVG Mock Map */}
                <svg className="w-full h-full opacity-40" viewBox="0 0 100 100">
                  <line x1="10" y1="0" x2="10" y2="100" stroke="#fff" strokeWidth="0.5" />
                  <line x1="40" y1="0" x2="40" y2="100" stroke="#fff" strokeWidth="0.5" />
                  <line x1="80" y1="0" x2="80" y2="100" stroke="#fff" strokeWidth="0.5" />
                  <line x1="0" y1="30" x2="100" y2="30" stroke="#fff" strokeWidth="0.5" />
                  <line x1="0" y1="70" x2="100" y2="70" stroke="#fff" strokeWidth="0.5" />
                </svg>
                <div className="absolute w-4 h-4 rounded-full bg-aura-500 animate-ping z-20" />
                <div className="absolute w-2.5 h-2.5 rounded-full bg-aura-500 border border-white z-20" />
                {/* Map Pins */}
                <MapPin size={14} className="text-emerald-500 absolute top-6 left-12 z-20" />
                <MapPin size={14} className="text-indigo-400 absolute bottom-8 right-14 z-20" />
                <MapPin size={14} className="text-rose-500 absolute top-10 right-8 z-20" />
              </div>
            </div>

            {displayClinics.length > 0 ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Nearest to You</h3>
                  <button className="text-xs font-bold text-aura-500 hover:text-aura-600">View All</button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {displayClinics.map(c => (
                    <div key={c.id} className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 overflow-hidden flex flex-col justify-between hover:border-aura-400 transition-all duration-150">
                      <div className="w-full h-24 bg-slate-100 dark:bg-navy-900 relative">
                        <img src={c.img} alt={c.name} className="w-full h-full object-cover" />
                        <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-900/80 text-white border border-white/10">{c.dist}</span>
                      </div>
                      <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start gap-1">
                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{c.name}</h4>
                            <span className="flex items-center gap-0.5 text-[9px] text-amber-500 shrink-0 font-bold"><Star size={10} fill="currentColor" />{c.rating}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">{c.type}</p>
                          <p className="text-[9px] text-slate-500 mt-1 line-clamp-1">{c.specs}</p>
                        </div>
                        <button onClick={() => setSelectedClinic(c)}
                          className="w-full mt-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-[10px] font-bold text-slate-700 dark:text-slate-300 transition text-center">
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-sm text-slate-400 font-semibold">no hospital or clinic's are to been show here</p>
              </div>
            )}

            {/* Popular Treatments */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Popular Treatments &amp; Specialties</h3>
                <button className="text-xs font-bold text-aura-500 hover:text-aura-600">View All Specialties</button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
                {[
                  { name: 'Cardiology', label: 'Heart Care', icon: <Heart size={14} className="text-rose-500" />, bg: 'bg-rose-500/15' },
                  { name: 'Orthopedics', label: 'Bone & Joint', icon: <Activity size={14} className="text-blue-500" />, bg: 'bg-blue-500/15' },
                  { name: 'Dermatology', label: 'Skin & Hair', icon: <User size={14} className="text-amber-500" />, bg: 'bg-amber-500/15' },
                  { name: 'Pediatrics', label: 'Child Care', icon: <Sparkles size={14} className="text-purple-500" />, bg: 'bg-purple-500/15' },
                  { name: 'Gynecology', label: 'Women\'s Health', icon: <User size={14} className="text-pink-500" />, bg: 'bg-pink-500/15' },
                  { name: 'Neurology', label: 'Brain & Nerve', icon: <Stethoscope size={14} className="text-emerald-500" />, bg: 'bg-emerald-500/15' },
                  { name: 'Ophthalmology', label: 'Eye Care', icon: <Eye size={14} className="text-sky-500" />, bg: 'bg-sky-500/15' },
                  { name: 'Dental Care', label: 'Teeth & Gum', icon: <Sparkles size={14} className="text-teal-500" />, bg: 'bg-teal-500/15' }
                ].map(spec => (
                  <button key={spec.name} onClick={() => alert(`Browsing ${spec.name} doctors`)}
                    className="p-3 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 hover:border-aura-400 transition flex flex-col items-center justify-center text-center space-y-2">
                    <div className={`w-9 h-9 rounded-full ${spec.bg} flex items-center justify-center shrink-0`}>
                      {spec.icon}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 leading-none">{spec.name}</p>
                      <p className="text-[8px] text-slate-400 mt-1">{spec.label}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT PANEL (1/3 width) */}
          <div className="w-full lg:w-1/3 space-y-6">
            
            {/* Quick Actions */}
            <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 p-5">
              <h3 className="text-sm font-bold text-slate-850 dark:text-slate-200 pb-3 mb-3 border-b border-slate-100 dark:border-white/[0.06]">Quick Actions</h3>
              <div className="space-y-3">
                {[
                  { title: 'View All Clinics', desc: 'Browse all clinics near you', action: () => alert('Showing all clinics') },
                  { title: 'View All Hospitals', desc: 'Browse all hospitals near you', action: () => alert('Showing all hospitals') },
                  { title: 'Compare Facilities', desc: 'Compare clinics & hospitals details', action: () => alert('Comparing facilities') }
                ].map((act, i) => (
                  <button key={i} onClick={act.action} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition text-left group">
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-aura-500 transition">{act.title}</p>
                      <p className="text-[10px] text-slate-450 mt-0.5">{act.desc}</p>
                    </div>
                    <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition" />
                  </button>
                ))}
              </div>
            </div>

            {/* Current Location widget */}
            <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 p-5">
              <div className="flex justify-between items-center pb-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Location</h3>
                <button onClick={() => alert('Change Location modal opened')} className="text-xs font-bold text-aura-500 hover:text-aura-600">Change</button>
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 flex items-center gap-1.5">
                <MapPin size={14} className="text-rose-500" />
                Sector 45, Gurgaon, Haryana, India
              </p>
            </div>

            {/* Filter Results Widget */}
            <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 p-5 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-white/[0.06]">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Filter Results</h3>
                <button onClick={() => alert('Cleared filters')} className="text-xs font-bold text-slate-400 hover:text-slate-500">Clear All</button>
              </div>

              {/* Radius */}
              <div className="space-y-2">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Search Radius</label>
                <div className="grid grid-cols-4 gap-2">
                  {['2 km', '5 km', '10 km', '20 km'].map((dist, idx) => (
                    <button key={dist} onClick={() => alert(`Radius filter set to ${dist}`)}
                      className={`py-1.5 text-center text-xs font-bold rounded-lg transition-all ${
                        idx === 0
                          ? 'bg-aura-600 text-white shadow-sm'
                          : 'bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-white/10 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {dist}
                    </button>
                  ))}
                </div>
              </div>

              {/* Checkboxes Type */}
              <div className="space-y-2">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded border-slate-300 text-aura-600 focus:ring-aura-500" />
                    Clinic
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded border-slate-300 text-aura-600 focus:ring-aura-500" />
                    Hospital
                  </label>
                </div>
              </div>

              {/* Specialty dropdown */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Specialty</label>
                <select className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 focus:outline-none">
                  <option>Select Specialty</option>
                  <option>Cardiology</option>
                  <option>Orthopedics</option>
                  <option>Dermatology</option>
                </select>
              </div>

              {/* Ratings dropdown */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Ratings</label>
                <select className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 focus:outline-none">
                  <option>4.0 &amp; above</option>
                  <option>4.5 &amp; above</option>
                  <option>3.5 &amp; above</option>
                </select>
              </div>

              {/* Checkboxes Facilities */}
              <div className="space-y-2">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Facilities</label>
                <div className="space-y-2">
                  {['24x7 Emergency', 'Parking Available', 'Online Appointment', 'Insurance Accepted'].map(fac => (
                    <label key={fac} className="flex items-center gap-2.5 text-xs font-semibold text-slate-750 dark:text-slate-300 cursor-pointer">
                      <input type="checkbox" className="rounded border-slate-300 text-aura-600 focus:ring-aura-500" />
                      {fac}
                    </label>
                  ))}
                </div>
              </div>

              <button onClick={() => alert('Filters applied')}
                className="w-full py-2.5 rounded-xl bg-aura-600 hover:bg-aura-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5">
                <Filter size={13} />
                Apply Filters
              </button>
            </div>

          </div>
        </div>

      </div>
    );
  }

  const placeholder = flow === 'booking_dob' ? 'YYYY-MM-DD...' :
                      flow === 'dosage_medicine' ? 'Medicine name...' :
                      flow === 'dosage_age' ? 'Age...' :
                      flow === 'dosage_weight' ? 'Weight in kg...' :
                      'Describe symptoms or ask a question...';

  // DEFAULT VIEW: AI symptom check chatbot & past history listing
  return (
    <div className="flex overflow-hidden" style={{ height: 'calc(100vh - 64px)', margin: '-24px' }}>

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="flex-1 flex flex-col bg-[#080e1a] overflow-hidden">
        <div className="flex-1 overflow-y-auto">

          {/* Hero (before chat starts) */}
          {!chatStarted && (
            <div className="flex flex-col items-center px-6 pt-10 pb-4">
              <div className="relative mb-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-aura-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-aura-500/30">
                  <Sparkles size={28} className="text-white" />
                </div>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#080e1a]" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white text-center mb-2">How can I help you today?</h1>
              <p className="text-slate-400 text-sm text-center mb-8">Ask about your health, appointments, or anything else.</p>

              <div className="w-full max-w-2xl grid grid-cols-2 gap-3.5 mb-8">
                {ACTION_CARDS.map((card, i) => {
                  const Icon = card.icon;
                  return (
                    <button key={i} onClick={() => handleCardClick(card)}
                      className="group p-4 rounded-2xl border border-white/[0.07] bg-[#111827] hover:bg-[#1a2336] hover:shadow-lg transition-all duration-200 text-left">
                      <div className={`w-10 h-10 rounded-xl ${card.bgColor} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200`}>
                        <Icon size={22} className={card.iconColor} />
                      </div>
                      <h3 className="text-white font-semibold text-sm mb-1 leading-snug">{card.title}</h3>
                      <p className="text-slate-500 text-[11px] leading-relaxed">{card.desc}</p>
                    </button>
                  );
                })}
              </div>

              <p className="text-slate-700 text-[11px] text-center max-w-sm leading-relaxed pb-4">
                Important: Not a substitute for professional medical advice.
              </p>
            </div>
          )}

          {/* Chat messages */}
          {chatStarted && (
            <div className="px-4 md:px-8 py-6 space-y-5 max-w-2xl mx-auto w-full">
              {messages.map(msg => (
                <div key={msg.id}>
                  <MessageBubble msg={msg} handlers={handlers}
                    bookingDate={bookingDate} setBookingDate={setBookingDate}
                    bookingTime={bookingTime} setBookingTime={setBookingTime}
                    selectedDoc={selectedDoc} availableSlots={availableSlots}
                    selectedSlot={selectedSlot} selectSlot={selectSlot} />
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-aura-500 to-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot size={14} className="text-white" />
                  </div>
                  <div className="px-4 py-3 bg-[#111827] border border-white/[0.07] rounded-2xl rounded-tl-sm inline-flex">
                    <div className="flex gap-1.5 items-center h-4">
                      {[0, 150, 300].map(d => (
                        <div key={d} className="w-1.5 h-1.5 rounded-full bg-aura-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Quick actions bar */}
        {chatStarted && (flow === 'menu' || flow === 'booking_results') && (
          <div className="px-4 md:px-8 py-2 border-t border-white/[0.04] bg-[#060c17] shrink-0 flex gap-2 overflow-x-auto no-scrollbar">
            <button onClick={startBooking} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-aura-500/10 text-aura-300 hover:bg-aura-500/20 border border-aura-500/20 transition whitespace-nowrap">
              <Calendar size={12} /> Book Doctor
            </button>
            <button onClick={startDosage} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/20 transition whitespace-nowrap">
              <Pill size={12} /> Dosage Calc
            </button>
            <Link to="/labs/tests" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/20 transition whitespace-nowrap">
              <FlaskConical size={12} /> Lab Tests
            </Link>
            <Link to="/pharmacy/medicines" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/20 transition whitespace-nowrap">
              <Pill size={12} /> Pharmacy
            </Link>
          </div>
        )}

        {/* Chat input */}
        <div className="px-4 md:px-8 py-4 border-t border-white/[0.06] bg-[#080e1a] shrink-0">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#111827] border border-white/[0.08] focus-within:border-aura-500/40 transition-colors duration-200">
              <input ref={inputRef} id="apt-chat-input"
                type={(flow === 'dosage_age' || flow === 'dosage_weight') ? 'number' : 'text'}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder={placeholder}
                autoComplete="off"
                className="flex-1 bg-transparent text-white text-sm placeholder:text-slate-600 outline-none" />
              <button aria-label="Voice" className="p-2 rounded-lg text-slate-600 hover:text-slate-400 hover:bg-white/5 transition">
                <Mic size={16} />
              </button>
              <button onClick={() => handleSend()} disabled={!inputValue.trim() || isTyping} aria-label="Send"
                className="p-2 rounded-xl bg-aura-600 hover:bg-aura-700 disabled:opacity-40 text-white transition-all duration-150">
                {isTyping ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ RIGHT PANEL ═══ */}
      <div className="hidden lg:flex flex-col w-[300px] shrink-0 border-l border-white/[0.06] bg-[#060c17]">
        <div className="px-4 pt-5 pb-0 border-b border-white/[0.06] shrink-0">
          <h2 className="text-white text-sm font-semibold mb-3">Appointment History &amp; Conversations</h2>
          <div className="flex gap-5">
            {['appointments', 'chats'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`text-[12px] font-semibold pb-3 border-b-2 transition-all duration-150 ${
                  activeTab === tab ? 'text-aura-400 border-aura-400' : 'text-slate-600 border-transparent hover:text-slate-300'}`}>
                {tab === 'appointments' ? 'Appointments' : 'Past Chats'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
          {activeTab === 'appointments' ? (
            apptLoading ? (
              <div className="flex items-center justify-center py-16"><Loader2 size={20} className="text-aura-500 animate-spin" /></div>
            ) : rightPanelAppts.length > 0 ? (
              rightPanelAppts.map(item => (
                <button key={item.id} className="w-full px-4 py-3.5 hover:bg-white/[0.025] transition text-left flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full ${item.bg} flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5`}>{item.letter}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-white text-[12px] font-semibold truncate flex-1">{item.title}</p>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="text-slate-500 text-[11px] truncate">{item.preview}</p>
                    <p className="text-slate-700 text-[10px] mt-0.5">{item.time}</p>
                  </div>
                </button>
              ))
            ) : (
              MOCK_CONVERSATIONS.map(item => (
                <button key={item.id} className="w-full px-4 py-3.5 hover:bg-white/[0.025] transition text-left flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full ${item.bg} flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5`}>{item.letter}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-[12px] font-semibold">{item.title}</p>
                    <p className="text-slate-500 text-[11px] mt-0.5 truncate">{item.preview}</p>
                    <p className="text-slate-700 text-[10px] mt-0.5">{item.time}</p>
                  </div>
                </button>
              ))
            )
          ) : (
            MOCK_CONVERSATIONS.map(item => (
              <button key={item.id} className="w-full px-4 py-3.5 hover:bg-white/[0.025] transition text-left flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full ${item.bg} flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5`}>{item.letter}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-[12px] font-semibold">{item.title}</p>
                  <p className="text-slate-500 text-[11px] mt-0.5 truncate">{item.preview}</p>
                  <p className="text-slate-700 text-[10px] mt-0.5">{item.time}</p>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="px-4 py-3 border-t border-white/[0.06] shrink-0">
          <button className="w-full flex items-center justify-center gap-2 text-slate-600 hover:text-slate-300 text-[11px] font-medium transition py-1">
            <ChevronRight size={12} /> View All Conversations
          </button>
        </div>
      </div>
    </div>
  );
};

export default PatientAppointmentsPage;
