import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Bot, User, ClipboardList, FileText, Globe, RefreshCcw, Send,
  Plus, X, Camera, Calendar, Stethoscope, AlertTriangle,
  CheckCircle2, Clock, ChevronRight, Activity, Pill, Heart,
  Phone, MapPin, UserCheck, Syringe, Bell, CreditCard, Shield
} from 'lucide-react';

import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { appointmentApi, billingApi, patientApi, prescriptionApi, doctorApi, clinicApi } from '../../lib/api';
import aiApi from '../../api/aiApi';
import PatientDocumentOcrPanel from './PatientDocumentOcrPanel';

// ============================================================
// Translations
// ============================================================

const TRANSLATIONS = {
  en: {
    welcome: 'Welcome, {username}! I am your AI Symptom Assistant. Tell me how you are feeling today, and I can help triage your symptoms and match you with the right doctor.',
    askAge: 'What is your age? (I will save this to your profile for future preference)',
    askDuration: 'For how many days have you been experiencing this problem?',
    askConditions: 'Do you have any known medical conditions? (e.g. Diabetes, Hypertension — type "None" if none)',
    loading: 'Analyzing your symptoms...',
    placeholder: 'Describe your symptoms...',
    buttonSend: 'Send',
    none: 'none'
  },
  hi: {
    welcome: 'नमस्ते {username}! मैं आपका एआई लक्षण सहायक हूँ। मुझे बताएं कि आज आप कैसा महसूस कर रहे हैं।',
    askAge: 'आपकी उम्र क्या है? (मैं इसे आपकी प्रोफ़ाइल में सहेज दूंगा)',
    askDuration: 'आपको यह समस्या कितने दिनों से हो रही है?',
    askConditions: 'क्या आपको पहले से कोई बीमारी है? ("कोई नहीं" लिखें यदि नहीं)',
    loading: 'आपके लक्षणों का विश्लेषण...',
    placeholder: 'अपना संदेश लिखें...',
    buttonSend: 'भेजें',
    none: 'कोई नहीं'
  },
  ta: {
    welcome: 'வரவேற்கிறோம் {username}! நான் உங்கள் AI அறிகுறி உதவியாளர்.',
    askAge: 'உங்கள் வயது என்ன?',
    askDuration: 'இந்த பிரச்சனை எத்தனை நாட்களாக உள்ளது?',
    askConditions: 'உங்களுக்கு மருத்துவ பின்னணி உள்ளதா? ("இல்லை" என்று எழுதவும்)',
    loading: 'ஆராயப்படுகின்றன...',
    placeholder: 'உங்கள் செய்தியை எழுதவும்...',
    buttonSend: 'அனுப்பு',
    none: 'இல்லை'
  },
  te: {
    welcome: 'స్వాగతం {username}! నేను మీ AI లక్షణాల సహాయకుడిని.',
    askAge: 'మీ వయస్సు ఎంత?',
    askDuration: 'ఈ సమస్య ఎన్ని రోజులుగా ఉంది?',
    askConditions: 'మీకు ఏవైనా ఆరోగ్య సమస్యలు ఉన్నాయా? ("ఏమీ లేదు" అని రాయండి)',
    loading: 'విశ్లేషిస్తున్నాము...',
    placeholder: 'మీ సందేశాన్ని టైప్ చేయండి...',
    buttonSend: 'పంపు',
    none: 'ఏమీ లేదు'
  },
  bn: {
    welcome: 'স্বাগতম {username}! আমি আপনার এআই লক্ষণ সহকারী।',
    askAge: 'আপনার বয়স কত?',
    askDuration: 'এই সমস্যা কত দিন ধরে হচ্ছে?',
    askConditions: 'আপনার পরিচিত শারীরিক সমস্যা আছে? ("কিছুই না" লিখুন)',
    loading: 'বিশ্লেষণ করা হচ্ছে...',
    placeholder: 'আপনার বার্তা লিখুন...',
    buttonSend: 'পাঠান',
    none: 'কিছুই না'
  }
};

const LANG_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिंदी' },
  { value: 'ta', label: 'தமிழ்' },
  { value: 'te', label: 'తెలుగు' },
  { value: 'bn', label: 'বাংলা' },
];

// ============================================================
// Helper sub-components
// ============================================================

const TagList = ({ items, color, onRemove }) => (
  <div className="flex flex-wrap gap-2 min-h-[40px]">
    {items.length > 0 ? items.map((item, i) => (
      <span
        key={i}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border
          ${color === 'rose'
            ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300'
            : color === 'sky'
            ? 'bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-500/10 dark:border-sky-500/30 dark:text-sky-300'
            : 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/10 dark:border-indigo-500/30 dark:text-indigo-300'
          }`}
      >
        {item}
        {onRemove && (
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="opacity-60 hover:opacity-100 transition ml-0.5"
            aria-label={`Remove ${item}`}
          >
            <X size={12} />
          </button>
        )}
      </span>
    )) : (
      <span className="text-xs text-slate-400 dark:text-slate-500 italic self-center">None added yet</span>
    )}
  </div>
);

const SectionLabel = ({ children }) => (
  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 mb-2">{children}</p>
);

const DoctorCard = ({ doc, onViewProfile, onBookSlot }) => (
  <div className="
    p-3.5 rounded-xl border
    bg-white dark:bg-navy-800
    border-slate-200 dark:border-white/10
    hover:border-aura-400 dark:hover:border-aura-500/50
    hover:-translate-y-0.5 hover:shadow-elevated dark:hover:shadow-elevated-dark
    transition-all duration-150 flex flex-col gap-3
  ">
    <div className="flex items-center gap-2.5">
      <Avatar name={doc.fullName} size="sm" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{doc.fullName}</p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">{doc.specialization}</p>
      </div>
      {doc.isActive && (
        <span className="ml-auto shrink-0 flex items-center gap-1 text-[10px] font-semibold text-aura-600 dark:text-aura-400">
          <span className="w-1.5 h-1.5 rounded-full bg-aura-500 animate-pulse" />
          Online
        </span>
      )}
    </div>
    <div className="flex gap-2">
      <button
        onClick={() => onViewProfile(doc)}
        className="flex-1 py-1.5 text-[11px] font-semibold rounded-lg bg-slate-100 dark:bg-white/8 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/15 transition"
      >
        View Profile
      </button>
      <button
        onClick={() => onBookSlot(doc)}
        className="flex-1 py-1.5 text-[11px] font-semibold rounded-lg bg-aura-600 dark:bg-aura-500 text-white hover:bg-aura-700 dark:hover:bg-aura-600 transition"
      >
        Book Slot
      </button>
    </div>
  </div>
);

const InputRow = ({ label, value, onChange, type = 'text', placeholder, required }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      className="
        w-full px-4 py-2.5 rounded-xl text-sm
        bg-white dark:bg-navy-800/60
        border border-slate-200 dark:border-white/10
        text-slate-900 dark:text-slate-100
        placeholder:text-slate-400 dark:placeholder:text-slate-600
        focus:outline-none focus:border-aura-500 focus:ring-2 focus:ring-aura-500/20
        transition
      "
    />
  </div>
);

const SelectRow = ({ label, value, onChange, children, required }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
    <select
      value={value}
      onChange={onChange}
      required={required}
      className="
        w-full px-4 py-2.5 rounded-xl text-sm
        bg-white dark:bg-navy-800/60
        border border-slate-200 dark:border-white/10
        text-slate-900 dark:text-slate-100
        focus:outline-none focus:border-aura-500 focus:ring-2 focus:ring-aura-500/20
        transition
      "
    >
      {children}
    </select>
  </div>
);

// ============================================================
// Main component
// ============================================================

const PatientPortalPage = () => {
  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('appointments');
  const [notifications, setNotifications] = useState([]);

  // Chatbot state
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [flowStep, setFlowStep] = useState('symptoms');
  const [collectedData, setCollectedData] = useState({ symptoms: '', age: '', duration: '', conditions: '' });
  const [chatMessages, setChatMessages] = useState([]);
  const [userQuery, setUserQuery] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const chatEndRef = useRef(null);

  // Doctor modal / booking
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [doctorModalOpen, setDoctorModalOpen] = useState(false);
  const [bookingDoctor, setBookingDoctor] = useState(null);
  const [bookingDate, setBookingDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingStatus, setBookingStatus] = useState('');
  const [clinics, setClinics] = useState([]);

  // Profile edit state
  const [profileForm, setProfileForm] = useState({
    firstName: '', lastName: '', gender: 'other', dateOfBirth: '', phone: '', email: '', bloodGroup: '',
    address: { line1: '', line2: '', city: '', state: '', pincode: '', country: 'India' },
    emergencyContact: { name: '', relation: '', phone: '' }
  });
  const [profileImageFile, setProfileImageFile] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccessMessage, setProfileSuccessMessage] = useState('');

  // Medical history state
  const [historyForm, setHistoryForm] = useState({ allergies: [], chronicConditions: [], currentMedications: [] });
  const [newAllergy, setNewAllergy] = useState('');
  const [newCondition, setNewCondition] = useState('');
  const [newMedication, setNewMedication] = useState('');
  const [savingHistory, setSavingHistory] = useState(false);
  const [historySuccessMessage, setHistorySuccessMessage] = useState('');

  // Billing & Insurance state
  const [insuranceForm, setInsuranceForm] = useState({
    provider: '', policyNumber: '', groupNumber: '', subscriberName: '', subscriberDob: '', autoClaimAutomation: false
  });
  const [newCardForm, setNewCardForm] = useState({
    cardholderName: '', cardNumber: '', expiryDate: '', CVV: ''
  });
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [savingBilling, setSavingBilling] = useState(false);
  const [billingSuccessMessage, setBillingSuccessMessage] = useState('');

  // ─── Data Loading ───────────────────────────────────────────

  const loadPortal = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError('');
    try {
      const profileResponse = await patientApi.me();
      const patient = profileResponse.data?.patient || profileResponse.patient;
      if (!patient?._id) throw new Error('Patient profile not linked.');

      setProfile(patient);
      setProfileForm({
        firstName: patient.firstName || '',
        lastName: patient.lastName || '',
        gender: patient.gender || 'other',
        dateOfBirth: patient.dateOfBirth ? new Date(patient.dateOfBirth).toISOString().split('T')[0] : '',
        phone: patient.phone || '',
        email: patient.email || '',
        bloodGroup: patient.bloodGroup || '',
        address: {
          line1: patient.address?.line1 || '',
          line2: patient.address?.line2 || '',
          city: patient.address?.city || '',
          state: patient.address?.state || '',
          pincode: patient.address?.pincode || '',
          country: patient.address?.country || 'India'
        },
        emergencyContact: {
          name: patient.emergencyContact?.name || '',
          relation: patient.emergencyContact?.relation || '',
          phone: patient.emergencyContact?.phone || ''
        }
      });
      setHistoryForm({
        allergies: patient.allergies || [],
        chronicConditions: patient.chronicConditions || [],
        currentMedications: patient.currentMedications || []
      });
      setInsuranceForm({
        provider: patient.insuranceDetails?.provider || '',
        policyNumber: patient.insuranceDetails?.policyNumber || '',
        groupNumber: patient.insuranceDetails?.groupNumber || '',
        subscriberName: patient.insuranceDetails?.subscriberName || '',
        subscriberDob: patient.insuranceDetails?.subscriberDob || '',
        autoClaimAutomation: patient.insuranceDetails?.autoClaimAutomation || false
      });
      setPaymentMethods(patient.paymentMethods || []);

      const [apptRes, rxRes, invRes, notifRes, clinicsRes] = await Promise.all([
        appointmentApi.getAppointments({ limit: 10 }),
        prescriptionApi.getByPatient(patient._id, { status: 'finalized', limit: 10 }),
        billingApi.getPatientInvoices(patient._id, { limit: 10 }),
        patientApi.notifications(patient._id).catch(() => ({ data: { notificationLogs: [] } })),
        clinicApi.list().catch(() => ({ data: { clinics: [] } }))
      ]);
      setAppointments(apptRes.data?.appointments || apptRes.appointments || []);
      setPrescriptions(rxRes.data?.prescriptions || rxRes.prescriptions || []);
      setInvoices(invRes.data?.invoices || invRes.invoices || []);
      setNotifications(notifRes.data?.notificationLogs || notifRes.notificationLogs || []);
      setClinics(clinicsRes.data?.clinics || clinicsRes.clinics || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load your patient portal.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => { loadPortal(true); }, [loadPortal]);

  // Welcome message (once, when profile loads)
  useEffect(() => {
    if (profile && chatMessages.length === 0) {
      const username = profile.fullName || profile.firstName || 'Patient';
      const welcomeMsg = TRANSLATIONS[selectedLanguage].welcome.replace('{username}', username);
      setChatMessages([{ id: 'welcome', sender: 'bot', text: welcomeMsg }]);
      setFlowStep('symptoms');
      setCollectedData({ symptoms: '', age: profile.age ? String(profile.age) : '', duration: '', conditions: '' });
    }
  }, [profile]);

  // Update welcome msg only if conversation hasn't started
  useEffect(() => {
    if (profile && chatMessages.length === 1 && chatMessages[0].id === 'welcome') {
      const username = profile.fullName || profile.firstName || 'Patient';
      const welcomeMsg = TRANSLATIONS[selectedLanguage].welcome.replace('{username}', username);
      setChatMessages([{ id: 'welcome', sender: 'bot', text: welcomeMsg }]);
    }
  }, [selectedLanguage]);

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isBotTyping]);

  // Fetch slots when booking doctor / date changes
  useEffect(() => {
    const fetchSlots = async () => {
      if (!bookingDoctor?._id || !bookingDate) { setAvailableSlots([]); return; }
      setLoadingSlots(true);
      try {
        const response = await appointmentApi.getAvailableSlots({ doctorId: bookingDoctor._id, date: bookingDate, durationMinutes: 15 });
        setAvailableSlots(response.slots || response.data?.slots || []);
        setSelectedSlot('');
      } catch { setAvailableSlots([]); }
      finally { setLoadingSlots(false); }
    };
    fetchSlots();
  }, [bookingDoctor, bookingDate]);

  // ─── Chat Handlers ──────────────────────────────────────────

  const addBotMessage = (text, results, delay = 700) => {
    return new Promise((resolve) => {
      setIsBotTyping(true);
      setTimeout(() => {
        setChatMessages((prev) => [...prev, { id: `bot-${Date.now()}`, sender: 'bot', text, results }]);
        setIsBotTyping(false);
        resolve();
      }, delay);
    });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!userQuery.trim()) return;
    const query = userQuery.trim();
    setUserQuery('');
    setChatMessages((prev) => [...prev, { id: `user-${Date.now()}`, sender: 'user', text: query }]);

    if (flowStep === 'symptoms') {
      const updatedData = { ...collectedData, symptoms: query };
      setCollectedData(updatedData);
      if (profile?.age) {
        setFlowStep('duration');
        await addBotMessage(TRANSLATIONS[selectedLanguage].askDuration);
      } else {
        setFlowStep('age');
        await addBotMessage(TRANSLATIONS[selectedLanguage].askAge);
      }
    } else if (flowStep === 'age') {
      const parsedAge = parseInt(query, 10);
      if (isNaN(parsedAge) || parsedAge <= 0) {
        await addBotMessage('Please enter a valid age number.');
        return;
      }
      try { await patientApi.updateMe({ age: parsedAge }); setProfile((p) => ({ ...p, age: parsedAge })); } catch {}
      setCollectedData((prev) => ({ ...prev, age: String(parsedAge) }));
      setFlowStep('duration');
      await addBotMessage(TRANSLATIONS[selectedLanguage].askDuration);
    } else if (flowStep === 'duration') {
      setCollectedData((prev) => ({ ...prev, duration: query }));
      setFlowStep('conditions');
      await addBotMessage(TRANSLATIONS[selectedLanguage].askConditions);
    } else if (flowStep === 'conditions') {
      const noneWord = TRANSLATIONS[selectedLanguage].none.toLowerCase();
      const rawCond = query.toLowerCase();
      const hasNoCondition = rawCond === 'none' || rawCond === noneWord || rawCond === 'no';
      const newConditionsList = hasNoCondition ? [] : query.split(',').map((i) => i.trim()).filter(Boolean);
      setCollectedData((prev) => ({ ...prev, conditions: query }));
      setFlowStep('complete');
      setIsBotTyping(true);

      try {
        const checkAge = profile?.age || parseInt(collectedData.age || '0', 10);
        const existingConditions = profile?.chronicConditions || [];
        const mergedConditions = Array.from(new Set([...existingConditions, ...newConditionsList]));

        if (newConditionsList.length > 0) {
          try { await patientApi.updateMe({ chronicConditions: mergedConditions }); setProfile((p) => ({ ...p, chronicConditions: mergedConditions })); } catch {}
        }

        const response = await aiApi.symptomCheck({
          symptoms: collectedData.symptoms,
          age: checkAge > 0 ? checkAge : undefined,
          gender: profile?.gender || undefined,
          duration: collectedData.duration || undefined,
          known_conditions: mergedConditions
        });

        let specDoctors = [];
        try {
          const docRes = await doctorApi.list({ specialization: response.recommendedSpecialization });
          specDoctors = docRes.doctors || docRes.data?.doctors || [];
        } catch {}

        const suggestedAvailable = specDoctors.filter((d) => d.isActive);
        setChatMessages((prev) => [
          ...prev,
          {
            id: `bot-res-${Date.now()}`,
            sender: 'bot',
            text: response.doctorNoteSummary || `Based on your symptoms, I recommend seeing a ${response.recommendedSpecialization || 'General Practitioner'}.`,
            results: { ...response, suggestedAvailable, moreDoctors: specDoctors }
          }
        ]);
      } catch {
        setChatMessages((prev) => [...prev, { id: `bot-err-${Date.now()}`, sender: 'bot', text: 'I apologize, but I am having trouble connecting to the symptom checker service. Please click reset to restart.' }]);
      } finally {
        setIsBotTyping(false);
      }
    }
  };

  const handleResetChat = () => {
    const username = profile?.fullName || profile?.firstName || 'Patient';
    setChatMessages([{ id: 'welcome', sender: 'bot', text: TRANSLATIONS[selectedLanguage].welcome.replace('{username}', username) }]);
    setFlowStep('symptoms');
    setCollectedData({ symptoms: '', age: profile?.age ? String(profile.age) : '', duration: '', conditions: '' });
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    if (!profile?._id || !bookingDoctor?._id || !selectedSlot) { setBookingStatus('Please fill all fields.'); return; }
    setBookingStatus('Booking...');
    try {
      await appointmentApi.createAppointment({
        patientId: profile._id,
        doctorId: bookingDoctor._id,
        appointmentDate: bookingDate,
        startTime: selectedSlot,
        durationMinutes: 15,
        appointmentType: 'scheduled',
        source: 'chatbot',
        reasonForVisit: `AI Chatbot Recommendation for ${bookingDoctor.specialization}`
      });
      setBookingStatus('');
      loadPortal(false);
      setChatMessages((prev) => [...prev, { id: `bot-book-${Date.now()}`, sender: 'bot', text: `✅ Appointment booked with ${bookingDoctor.fullName} on ${bookingDate} at ${selectedSlot}.` }]);
      setBookingDoctor(null);
      setSelectedSlot('');
    } catch (err) {
      setBookingStatus(err.response?.data?.message || 'Could not complete booking.');
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setProfileImageFile(reader.result);
    reader.readAsDataURL(file);
  };

  const handleOcrApply = (extracted = {}) => {
    setProfileForm((current) => ({
      ...current,
      firstName: extracted.firstName || current.firstName,
      lastName: extracted.lastName || current.lastName,
      phone: extracted.phone || current.phone,
      email: extracted.email || current.email,
      dateOfBirth: extracted.dateOfBirth?.slice?.(0, 10) || extracted.dateOfBirth || current.dateOfBirth,
      gender: ['male', 'female', 'other'].includes(extracted.gender) ? extracted.gender : current.gender,
      address: {
        ...current.address,
        line1: extracted.address?.line1 || current.address.line1,
        city: extracted.address?.city || current.address.city,
        state: extracted.address?.state || current.address.state,
        pincode: extracted.address?.pincode || current.address.pincode
      }
    }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSuccessMessage('');
    try {
      const payload = { ...profileForm, ...(profileImageFile ? { profileImage: profileImageFile } : {}) };
      const res = await patientApi.updateMe(payload);
      const updated = res.data?.patient || res.patient;
      if (updated) { setProfile(updated); setProfileImageFile(''); setProfileSuccessMessage('Profile updated successfully!'); loadPortal(false); }
    } catch { setError('Failed to save profile changes.'); }
    finally { setSavingProfile(false); }
  };

  const handleSaveHistory = async (e) => {
    e.preventDefault();
    setSavingHistory(true);
    setHistorySuccessMessage('');
    try {
      const res = await patientApi.updateMe({ allergies: historyForm.allergies, chronicConditions: historyForm.chronicConditions, currentMedications: historyForm.currentMedications });
      const updated = res.data?.patient || res.patient;
      if (updated) { setProfile(updated); setHistorySuccessMessage('Medical history saved!'); loadPortal(false); }
    } catch { setError('Failed to save medical history.'); }
    finally { setSavingHistory(false); }
  };

  const handleSaveInsurance = async (e) => {
    e.preventDefault();
    setSavingBilling(true);
    setBillingSuccessMessage('');
    try {
      const res = await patientApi.updateMe({ insuranceDetails: insuranceForm });
      const updated = res.data?.patient || res.patient;
      if (updated) {
        setProfile(updated);
        setInsuranceForm({
          provider: updated.insuranceDetails?.provider || '',
          policyNumber: updated.insuranceDetails?.policyNumber || '',
          groupNumber: updated.insuranceDetails?.groupNumber || '',
          subscriberName: updated.insuranceDetails?.subscriberName || '',
          subscriberDob: updated.insuranceDetails?.subscriberDob || '',
          autoClaimAutomation: updated.insuranceDetails?.autoClaimAutomation || false
        });
        setBillingSuccessMessage('Insurance details updated successfully.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update insurance details');
    } finally {
      setSavingBilling(false);
    }
  };

  const handleAddCard = async (e) => {
    e.preventDefault();
    if (!newCardForm.cardholderName || !newCardForm.cardNumber || !newCardForm.expiryDate) {
      alert('Please fill out all card details');
      return;
    }
    setSavingBilling(true);
    setBillingSuccessMessage('');
    try {
      const updatedCards = [...paymentMethods, {
        cardholderName: newCardForm.cardholderName,
        cardNumber: newCardForm.cardNumber.replace(/\s+/g, ''),
        expiryDate: newCardForm.expiryDate,
        cardType: 'Visa'
      }];
      const res = await patientApi.updateMe({ paymentMethods: updatedCards });
      const updated = res.data?.patient || res.patient;
      if (updated) {
        setProfile(updated);
        setPaymentMethods(updated.paymentMethods || []);
        setNewCardForm({ cardholderName: '', cardNumber: '', expiryDate: '', CVV: '' });
        setBillingSuccessMessage('Payment method added successfully.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add card');
    } finally {
      setSavingBilling(false);
    }
  };

  const handleRemoveCard = async (idx) => {
    if (!window.confirm('Are you sure you want to remove this payment method?')) return;
    setSavingBilling(true);
    setBillingSuccessMessage('');
    try {
      const updatedCards = paymentMethods.filter((_, i) => i !== idx);
      const res = await patientApi.updateMe({ paymentMethods: updatedCards });
      const updated = res.data?.patient || res.patient;
      if (updated) {
        setProfile(updated);
        setPaymentMethods(updated.paymentMethods || []);
        setBillingSuccessMessage('Payment method removed successfully.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove card');
    } finally {
      setSavingBilling(false);
    }
  };

  const addHistoryItem = (type, value, setter) => {
    if (!value.trim()) return;
    setHistoryForm((prev) => ({ ...prev, [type]: [...prev[type], value.trim()] }));
    setter('');
  };

  const removeHistoryItem = (type, index) => {
    setHistoryForm((prev) => ({ ...prev, [type]: prev[type].filter((_, i) => i !== index) }));
  };

  const pf = (field, value) => setProfileForm((prev) => ({ ...prev, [field]: value }));
  const pa = (field, value) => setProfileForm((prev) => ({ ...prev, address: { ...prev.address, [field]: value } }));
  const pe = (field, value) => setProfileForm((prev) => ({ ...prev, emergencyContact: { ...prev.emergencyContact, [field]: value } }));

  // ─── Loading/Error states ───────────────────────────────────

  if (loading) return <FullPageSpinner message="Loading your health portal..." />;

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-96 gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-500/10 flex items-center justify-center">
        <AlertTriangle className="text-rose-500" size={28} />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Portal Unavailable</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">{error}</p>
      </div>
      <button onClick={() => loadPortal(true)} className="px-5 py-2 rounded-xl bg-aura-600 text-white text-sm font-semibold hover:bg-aura-700 transition">
        Try again
      </button>
    </div>
  );

  const tabs = [
    { id: 'profile', label: 'My Profile', icon: <User size={16} /> },
    { id: 'history', label: 'Medical History', icon: <ClipboardList size={16} /> },
    { id: 'appointments', label: 'Appointments', icon: <Calendar size={16} /> },
    { id: 'prescriptions', label: 'Prescriptions', icon: <Pill size={16} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
    { id: 'records', label: 'Records', icon: <FileText size={16} /> },
    { id: 'billing', label: 'Billing & Insurance', icon: <CreditCard size={16} /> },
  ];

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto space-y-5 animate-fade-in">

      {/* ── Portal Header ── */}
      <div className="
        relative overflow-hidden rounded-2xl p-6
        bg-[#060d18] dark:bg-navy-900
        border border-white/[0.06]
      ">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-aura-500/10 blur-3xl" />
          <div className="absolute -bottom-16 -left-10 w-64 h-64 rounded-full bg-indigo-600/10 blur-3xl" />
        </div>

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Avatar */}
          <div className="relative">
            <Avatar src={profile?.profileImage} name={profile?.fullName || profile?.firstName} size="2xl" />
            <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-aura-500 border-2 border-[#060d18]" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-aura-400">Patient Portal</p>
            <h1 className="text-2xl font-bold text-white mt-0.5">
              Welcome, {profile?.fullName || profile?.firstName || 'Patient'}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
              <span className="text-[11px] text-white/40">
                ID: <span className="font-mono text-white/60">{profile?.patientId || 'Pending'}</span>
              </span>
              {profile?.bloodGroup && (
                <span className="text-[11px] text-white/40">
                  Blood: <span className="font-semibold text-rose-400">{profile.bloodGroup}</span>
                </span>
              )}
              {profile?.age && (
                <span className="text-[11px] text-white/40">
                  Age: <span className="text-white/70">{profile.age}y</span>
                </span>
              )}
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex gap-3 shrink-0">
            {[
              { label: 'Appointments', value: appointments.length, icon: <Calendar size={14} /> },
              { label: 'Prescriptions', value: prescriptions.length, icon: <Pill size={14} /> },
            ].map((s) => (
              <div key={s.label} className="text-center px-4 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08]">
                <div className="flex items-center justify-center gap-1 text-aura-400 mb-1">{s.icon}<span className="text-lg font-bold text-white">{s.value}</span></div>
                <p className="text-[10px] text-white/40 uppercase tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-slate-100 dark:bg-navy-800 border border-slate-200 dark:border-white/[0.06]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150
              flex-1 justify-center sm:flex-initial sm:justify-start
              ${activeTab === tab.id
                ? 'bg-white dark:bg-navy-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}
            `}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>


      {/* ── TAB: My Profile ── */}
      {activeTab === 'profile' && (
        <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 shadow-card dark:shadow-card-dark p-6 max-w-3xl">
          <div className="flex items-center gap-3 pb-5 mb-5 border-b border-slate-100 dark:border-white/[0.06]">
            <div className="w-9 h-9 rounded-xl bg-aura-50 dark:bg-aura-500/10 border border-aura-200 dark:border-aura-500/20 flex items-center justify-center">
              <User size={18} className="text-aura-600 dark:text-aura-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Edit My Profile</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">Update your personal details and emergency contact.</p>
            </div>
          </div>

          {profileSuccessMessage && (
            <div className="mb-5 flex items-center gap-2 p-3 rounded-xl bg-aura-50 dark:bg-aura-500/10 border border-aura-200 dark:border-aura-500/30 text-aura-700 dark:text-aura-300 text-sm font-medium animate-slide-down">
              <CheckCircle2 size={16} />
              {profileSuccessMessage}
            </div>
          )}

          <div className="mb-6">
            <PatientDocumentOcrPanel onApply={handleOcrApply} />
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-6">
            {/* Photo upload */}
            <div className="flex items-center gap-5 p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/8">
              <div className="relative">
                <Avatar
                  src={profileImageFile || profile?.profileImage}
                  name={`${profileForm.firstName} ${profileForm.lastName}`}
                  size="xl"
                />
                <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-aura-600 dark:bg-aura-500 border-2 border-white dark:border-navy-800 flex items-center justify-center cursor-pointer hover:bg-aura-700 transition">
                  <Camera size={12} className="text-white" />
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" aria-label="Upload profile photo" />
                </label>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Profile Photo</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Click the camera icon to upload. Accepts PNG, JPG.</p>
              </div>
            </div>

            {/* Basic info */}
            <div className="grid sm:grid-cols-2 gap-4">
              <InputRow label="First Name" value={profileForm.firstName} onChange={(e) => pf('firstName', e.target.value)} required />
              <InputRow label="Last Name" value={profileForm.lastName} onChange={(e) => pf('lastName', e.target.value)} />
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <SelectRow label="Gender" value={profileForm.gender} onChange={(e) => pf('gender', e.target.value)}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </SelectRow>
              <InputRow label="Date of Birth" type="date" value={profileForm.dateOfBirth} onChange={(e) => pf('dateOfBirth', e.target.value)} />
              <InputRow label="Blood Group" value={profileForm.bloodGroup} onChange={(e) => pf('bloodGroup', e.target.value)} placeholder="e.g. O+" />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <InputRow label="Phone" value={profileForm.phone} onChange={(e) => pf('phone', e.target.value)} required />
              <InputRow label="Email" type="email" value={profileForm.email} onChange={(e) => pf('email', e.target.value)} />
            </div>

            {/* Address */}
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1.5">
                <MapPin size={12} /> Address
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <InputRow label="Address Line 1" value={profileForm.address.line1} onChange={(e) => pa('line1', e.target.value)} />
                <InputRow label="Address Line 2" value={profileForm.address.line2} onChange={(e) => pa('line2', e.target.value)} />
              </div>
              <div className="grid sm:grid-cols-4 gap-4 mt-4">
                <InputRow label="City" value={profileForm.address.city} onChange={(e) => pa('city', e.target.value)} />
                <InputRow label="State" value={profileForm.address.state} onChange={(e) => pa('state', e.target.value)} />
                <InputRow label="Pincode" value={profileForm.address.pincode} onChange={(e) => pa('pincode', e.target.value)} />
                <InputRow label="Country" value={profileForm.address.country} onChange={(e) => pa('country', e.target.value)} />
              </div>
            </div>

            {/* Emergency Contact */}
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1.5">
                <Phone size={12} /> Emergency Contact
              </p>
              <div className="grid sm:grid-cols-3 gap-4">
                <InputRow label="Name" value={profileForm.emergencyContact.name} onChange={(e) => pe('name', e.target.value)} />
                <InputRow label="Relation" placeholder="e.g. Spouse, Father" value={profileForm.emergencyContact.relation} onChange={(e) => pe('relation', e.target.value)} />
                <InputRow label="Phone" value={profileForm.emergencyContact.phone} onChange={(e) => pe('phone', e.target.value)} />
              </div>
            </div>

            <div className="pt-2 flex justify-end border-t border-slate-100 dark:border-white/[0.06]">
              <button
                type="submit"
                disabled={savingProfile}
                className="px-6 py-2.5 rounded-xl bg-aura-600 dark:bg-aura-500 text-white text-sm font-semibold hover:bg-aura-700 dark:hover:bg-aura-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {savingProfile && <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                {savingProfile ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── TAB: Medical History ── */}
      {activeTab === 'history' && (
        <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 shadow-card dark:shadow-card-dark p-6 max-w-3xl">
          <div className="flex items-center gap-3 pb-5 mb-5 border-b border-slate-100 dark:border-white/[0.06]">
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 flex items-center justify-center">
              <Activity size={18} className="text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Medical History</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">Manage your allergies, conditions, and medications.</p>
            </div>
          </div>

          {historySuccessMessage && (
            <div className="mb-5 flex items-center gap-2 p-3 rounded-xl bg-aura-50 dark:bg-aura-500/10 border border-aura-200 dark:border-aura-500/30 text-aura-700 dark:text-aura-300 text-sm font-medium animate-slide-down">
              <CheckCircle2 size={16} />{historySuccessMessage}
            </div>
          )}

          <form onSubmit={handleSaveHistory} className="space-y-6">
            {/* Allergies */}
            {[
              { key: 'allergies', label: 'Allergies', color: 'rose', placeholder: 'Add allergy (e.g. Penicillin)', state: newAllergy, setState: setNewAllergy },
              { key: 'chronicConditions', label: 'Chronic Conditions', color: 'sky', placeholder: 'Add condition (e.g. Hypertension)', state: newCondition, setState: setNewCondition },
              { key: 'currentMedications', label: 'Current Medications', color: 'indigo', placeholder: 'Add medication (e.g. Metformin 500mg)', state: newMedication, setState: setNewMedication },
            ].map(({ key, label, color, placeholder, state, setState }) => (
              <div key={key} className="space-y-2.5">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</p>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/8 min-h-[52px]">
                  <TagList
                    items={historyForm[key]}
                    color={color}
                    onRemove={(i) => removeHistoryItem(key, i)}
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addHistoryItem(key, state, setState); } }}
                    placeholder={placeholder}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm bg-white dark:bg-navy-800/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-aura-500 focus:ring-2 focus:ring-aura-500/20 transition"
                  />
                  <button
                    type="button"
                    onClick={() => addHistoryItem(key, state, setState)}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-white/8 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/15 transition flex items-center gap-1.5"
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>
              </div>
            ))}

            <div className="pt-2 flex justify-end border-t border-slate-100 dark:border-white/[0.06]">
              <button
                type="submit"
                disabled={savingHistory}
                className="px-6 py-2.5 rounded-xl bg-aura-600 dark:bg-aura-500 text-white text-sm font-semibold hover:bg-aura-700 dark:hover:bg-aura-600 transition disabled:opacity-50 flex items-center gap-2"
              >
                {savingHistory && <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                {savingHistory ? 'Saving...' : 'Save History'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── TAB: Appointments ── */}
      {activeTab === 'appointments' && (
        <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 shadow-card dark:shadow-card-dark overflow-hidden p-6 max-w-4xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] pb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Upcoming & Past Appointments</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">View schedule details and cancel bookings if necessary.</p>
            </div>
            <Badge color="success">{appointments.length} Total</Badge>
          </div>

          <div className="space-y-4">
            {appointments.length > 0 ? (
              appointments.map((apt) => {
                const isCancelled = apt.status === 'cancelled';
                const isCompleted = apt.status === 'completed';
                return (
                  <div key={apt._id} className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-navy-900/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-aura-50 dark:bg-aura-500/10 flex items-center justify-center text-aura-600 dark:text-aura-400">
                        <Calendar size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                          {apt.doctorId?.fullName || 'Unknown Doctor'}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {apt.appointmentDate ? new Date(apt.appointmentDate).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : ''} at {apt.startTime || 'TBD'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      <Badge color={isCompleted ? 'success' : isCancelled ? 'danger' : 'info'}>
                        {apt.status || 'scheduled'}
                      </Badge>
                      {!isCancelled && !isCompleted && (
                        <button
                          onClick={async () => {
                            if (window.confirm('Are you sure you want to cancel this appointment?')) {
                              try {
                                await appointmentApi.cancelAppointment(apt._id, { reason: 'Cancelled by patient' });
                                loadPortal(false);
                              } catch (err) {
                                alert(err.response?.data?.message || 'Failed to cancel appointment');
                              }
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12">
                <Calendar size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">You don't have any appointments scheduled.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: Prescriptions ── */}
      {activeTab === 'prescriptions' && (
        <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 shadow-card dark:shadow-card-dark overflow-hidden p-6 max-w-4xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] pb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Past Prescriptions</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">View prescription history and instructions from your doctors.</p>
            </div>
            <Badge color="accent">{prescriptions.length} Records</Badge>
          </div>

          <div className="space-y-5">
            {prescriptions.length > 0 ? (
              prescriptions.map((rx) => (
                <div key={rx._id} className="p-5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-navy-900/50 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <Pill size={16} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                          Prescribed by: {rx.doctorId?.fullName || 'Clinic Physician'}
                        </h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          Date: {rx.createdAt ? new Date(rx.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : ''}
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={async () => {
                        try {
                          const response = await prescriptionApi.download(rx._id);
                          const blob = new Blob([response.data], { type: 'application/pdf' });
                          const url = window.URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.setAttribute('download', `prescription-${rx._id}.pdf`);
                          document.body.appendChild(link);
                          link.click();
                          link.remove();
                        } catch {
                          alert('Failed to download PDF.');
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-navy-800 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition"
                    >
                      Download PDF
                    </button>
                  </div>

                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-white/10 text-slate-400">
                          <th className="py-2 font-semibold">Medicine</th>
                          <th className="py-2 font-semibold">Dosage</th>
                          <th className="py-2 font-semibold">Frequency</th>
                          <th className="py-2 font-semibold">Duration</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-slate-300">
                        {rx.medications?.map((med, idx) => (
                          <tr key={idx}>
                            <td className="py-2 font-medium">{med.name}</td>
                            <td className="py-2">{med.dosage || 'As directed'}</td>
                            <td className="py-2">{med.frequency || 'N/A'}</td>
                            <td className="py-2">{med.duration || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <Pill size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">No past prescriptions found.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: Notifications ── */}
      {activeTab === 'notifications' && (
        <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 shadow-card dark:shadow-card-dark overflow-hidden p-6 max-w-4xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] pb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Active Alerts & Notifications</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">Upcoming appointment reminders and clinic alerts.</p>
            </div>
          </div>

          <div className="space-y-4">
            {(() => {
              const getAppointmentEndDateTime = (appointment) => {
                if (!appointment) return null;
                const dateStr = appointment.appointmentDate;
                const timeStr = appointment.endTime || appointment.startTime;
                if (!dateStr || !timeStr) return null;
                const date = new Date(dateStr);
                const [hours, minutes] = timeStr.split(':').map(Number);
                date.setHours(hours, minutes, 0, 0);
                return date;
              };

              const activeNotifs = notifications.filter(notif => {
                if (!notif.appointmentId) return true;
                const aptId = typeof notif.appointmentId === 'object' ? notif.appointmentId._id : notif.appointmentId;
                const appointment = appointments.find(a => a._id === aptId);
                if (!appointment) return true;
                const endDateTime = getAppointmentEndDateTime(appointment);
                if (!endDateTime) return true;
                
                // Expiry rule: remove ≥10 min after appointment ends
                const expiryTime = new Date(endDateTime.getTime() + 10 * 60 * 1000);
                return new Date() < expiryTime;
              });

              return activeNotifs.length > 0 ? (
                activeNotifs.map((notif) => (
                  <div key={notif._id} className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-navy-900/50 flex justify-between items-start gap-4">
                    <div className="flex gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 mt-0.5 shrink-0">
                        <Bell size={16} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{notif.subject || 'Alert'}</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{notif.body}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">
                          Received: {notif.createdAt ? new Date(notif.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : ''}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setNotifications(prev => prev.filter(n => n._id !== notif._id));
                      }}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <Bell size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">No active notifications.</p>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── TAB: Records ── */}
      {activeTab === 'records' && (
        <div className="grid md:grid-cols-2 gap-5">
          {/* Appointments */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 shadow-card dark:shadow-card-dark overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-white/[0.06] flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-aura-50 dark:bg-aura-500/10 flex items-center justify-center">
                <Calendar size={16} className="text-aura-600 dark:text-aura-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Appointments</h3>
              <Badge color="success" size="sm" className="ml-auto">{appointments.length}</Badge>
            </div>
            <div className="divide-y divide-slate-50 dark:divide-white/[0.04]">
              {appointments.length > 0 ? appointments.map((apt) => (
                <Link
                  key={apt._id}
                  to={`/appointments/${apt._id}`}
                  className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition group"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/8 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock size={14} className="text-slate-400 dark:text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {apt.doctorId?.fullName || 'Unknown Doctor'}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      {apt.appointmentDate ? new Date(apt.appointmentDate).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : 'Date TBD'}
                      {apt.startTime && ` • ${apt.startTime}`}
                    </p>
                  </div>
                  <Badge color={apt.status === 'completed' ? 'success' : apt.status === 'cancelled' ? 'danger' : 'info'} size="sm">
                    {apt.status || 'scheduled'}
                  </Badge>
                </Link>
              )) : (
                <div className="px-5 py-8 text-center">
                  <Calendar size={24} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">No appointments yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Prescriptions */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 shadow-card dark:shadow-card-dark overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-white/[0.06] flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                <Pill size={16} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Prescriptions</h3>
              <Badge color="accent" size="sm" className="ml-auto">{prescriptions.length}</Badge>
            </div>
            <div className="divide-y divide-slate-50 dark:divide-white/[0.04]">
              {prescriptions.length > 0 ? prescriptions.map((rx) => (
                <Link
                  key={rx._id}
                  to={`/prescriptions/${rx._id}`}
                  className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <ClipboardList size={14} className="text-indigo-500 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {rx.medications?.map((m) => m.name).join(', ') || 'Prescription'}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      {rx.createdAt ? new Date(rx.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : 'Date TBD'}
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-slate-400 mt-1 shrink-0" />
                </Link>
              )) : (
                <div className="px-5 py-8 text-center">
                  <Pill size={24} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">No prescriptions yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Invoices */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 shadow-card dark:shadow-card-dark overflow-hidden md:col-span-2">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-white/[0.06] flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                <FileText size={16} className="text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Billing & Invoices</h3>
              <Badge color="warning" size="sm" className="ml-auto">{invoices.length}</Badge>
            </div>
            <div className="divide-y divide-slate-50 dark:divide-white/[0.04]">
              {invoices.length > 0 ? invoices.map((inv) => (
                <Link
                  key={inv._id}
                  to={`/billing/${inv._id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Invoice #{inv.invoiceNumber || inv._id?.slice(-6)}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : ''}
                    </p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">₹{inv.totalAmount || 0}</p>
                    <Badge color={inv.paymentStatus === 'paid' ? 'success' : 'warning'} size="sm">{inv.paymentStatus || 'pending'}</Badge>
                  </div>
                </Link>
              )) : (
                <div className="px-5 py-8 text-center">
                  <FileText size={24} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">No invoices yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Billing & Insurance ── */}
      {activeTab === 'billing' && (
        <div className="grid md:grid-cols-2 gap-6 max-w-6xl">
          {/* Insurance Details Panel */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 shadow-card dark:shadow-card-dark p-6 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center">
                <Shield size={18} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Insurance Details</h2>
                <p className="text-xs text-slate-400 dark:text-slate-500">Provide auto insurance details for claim automation.</p>
              </div>
            </div>

            {billingSuccessMessage && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-sm font-medium animate-slide-down">
                <CheckCircle2 size={16} />
                {billingSuccessMessage}
              </div>
            )}

            <form onSubmit={handleSaveInsurance} className="space-y-4">
              <InputRow
                label="Insurance Provider"
                value={insuranceForm.provider}
                onChange={(e) => setInsuranceForm({ ...insuranceForm, provider: e.target.value })}
                placeholder="e.g. Acme Auto Insurance"
              />
              <div className="grid sm:grid-cols-2 gap-4">
                <InputRow
                  label="Policy Number"
                  value={insuranceForm.policyNumber}
                  onChange={(e) => setInsuranceForm({ ...insuranceForm, policyNumber: e.target.value })}
                  placeholder="Policy #"
                />
                <InputRow
                  label="Group Number"
                  value={insuranceForm.groupNumber}
                  onChange={(e) => setInsuranceForm({ ...insuranceForm, groupNumber: e.target.value })}
                  placeholder="Group #"
                />
              </div>
              <InputRow
                label="Subscriber Name"
                value={insuranceForm.subscriberName}
                onChange={(e) => setInsuranceForm({ ...insuranceForm, subscriberName: e.target.value })}
                placeholder="Name on card"
              />
              <InputRow
                label="Subscriber Date of Birth"
                type="date"
                value={insuranceForm.subscriberDob ? insuranceForm.subscriberDob.slice(0, 10) : ''}
                onChange={(e) => setInsuranceForm({ ...insuranceForm, subscriberDob: e.target.value })}
              />

              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/8">
                <input
                  type="checkbox"
                  id="autoClaimAutomation"
                  checked={insuranceForm.autoClaimAutomation}
                  onChange={(e) => setInsuranceForm({ ...insuranceForm, autoClaimAutomation: e.target.checked })}
                  className="w-4 h-4 rounded text-aura-600 border-slate-300 focus:ring-aura-500"
                />
                <label htmlFor="autoClaimAutomation" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Enable Auto Insurance Claims Automation
                </label>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingBilling}
                  className="px-6 py-2.5 rounded-xl bg-aura-600 dark:bg-aura-500 text-white text-sm font-semibold hover:bg-aura-700 dark:hover:bg-aura-600 transition disabled:opacity-50"
                >
                  {savingBilling ? 'Saving...' : 'Save Insurance'}
                </button>
              </div>
            </form>
          </div>

          {/* Payment Methods Panel */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 shadow-card dark:shadow-card-dark p-6 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center">
                <CreditCard size={18} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Payment Methods</h2>
                <p className="text-xs text-slate-400 dark:text-slate-500">Manage your saved credit/debit cards.</p>
              </div>
            </div>

            {/* List of Cards */}
            <div className="space-y-3">
              {paymentMethods.length > 0 ? (
                paymentMethods.map((pm, i) => (
                  <div key={i} className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-navy-900/50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-navy-800 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-400">
                        <CreditCard size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">•••• •••• •••• {pm.cardNumber?.slice(-4) || 'Card'}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{pm.cardholderName} | Exp: {pm.expiryDate}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveCard(i)}
                      className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic text-center py-4">No payment methods saved yet.</p>
              )}
            </div>

            {/* Add Card Form */}
            <div className="pt-4 border-t border-slate-100 dark:border-white/[0.06]">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Add New Card</h3>
              <form onSubmit={handleAddCard} className="space-y-4">
                <InputRow
                  label="Cardholder Name"
                  value={newCardForm.cardholderName}
                  onChange={(e) => setNewCardForm({ ...newCardForm, cardholderName: e.target.value })}
                  placeholder="John Doe"
                  required
                />
                <InputRow
                  label="Card Number"
                  value={newCardForm.cardNumber}
                  onChange={(e) => {
                    let val = e.target.value.replace(/\D/g, '').slice(0, 16);
                    let formatted = val.match(/.{1,4}/g)?.join(' ') || val;
                    setNewCardForm({ ...newCardForm, cardNumber: formatted });
                  }}
                  placeholder="4000 1234 5678 9010"
                  required
                />
                <div className="grid grid-cols-2 gap-4">
                  <InputRow
                    label="Expiry Date"
                    value={newCardForm.expiryDate}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      if (val.length >= 2) {
                        val = val.slice(0, 2) + '/' + val.slice(2);
                      }
                      setNewCardForm({ ...newCardForm, expiryDate: val });
                    }}
                    placeholder="MM/YY"
                    required
                  />
                  <InputRow
                    label="CVV"
                    type="password"
                    value={newCardForm.CVV}
                    onChange={(e) => setNewCardForm({ ...newCardForm, CVV: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                    placeholder="123"
                    required
                  />
                </div>
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={savingBilling}
                    className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white/8 text-white dark:text-slate-200 text-sm font-semibold hover:bg-slate-800 dark:hover:bg-white/12 transition disabled:opacity-50"
                  >
                    Add Payment Method
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Doctor Profile Modal ── */}
      <Modal open={doctorModalOpen} onClose={() => setDoctorModalOpen(false)} title="Doctor Profile" size="md">
        {selectedDoctor && (
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-4">
              <Avatar name={selectedDoctor.fullName} size="xl" />
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedDoctor.fullName}</h3>
                <p className="text-sm text-aura-600 dark:text-aura-400 font-medium">{selectedDoctor.specialization}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedDoctor.isActive && <Badge color="success" dot pulse>Available</Badge>}
                  {selectedDoctor.consultationFee && <Badge color="default">₹{selectedDoctor.consultationFee} / visit</Badge>}
                </div>
              </div>
            </div>

            {selectedDoctor.qualifications?.length > 0 && (
              <div>
                <SectionLabel>Qualifications</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {selectedDoctor.qualifications.map((q, i) => <Badge key={i} color="accent">{q}</Badge>)}
                </div>
              </div>
            )}

            {selectedDoctor.experience && (
              <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <UserCheck size={15} className="text-aura-500" />
                <span>{selectedDoctor.experience} years of experience</span>
              </div>
            )}

            {selectedDoctor.availability?.length > 0 && (
              <div>
                <SectionLabel>Weekly Timings</SectionLabel>
                <div className="grid gap-2 mt-1 max-h-40 overflow-y-auto pr-1">
                  {selectedDoctor.availability.filter(s => s.isAvailable).map((slot) => {
                    const matchedClinic = clinics.find(c => c._id === (slot.clinicId?._id || slot.clinicId));
                    return (
                      <div key={slot.dayOfWeek || slot._id || Math.random()} className="flex justify-between items-center bg-slate-50 dark:bg-white/5 p-2.5 rounded-xl border border-slate-100 dark:border-white/10 text-xs">
                        <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">{slot.dayOfWeek}</span>
                        <span className="text-slate-600 dark:text-slate-400 font-mono">{slot.startTime} - {slot.endTime} ({slot.slotDurationMinutes}m)</span>
                        <div className="flex gap-1.5 items-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                            slot.consultationMode === 'online'
                              ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-800 dark:text-sky-300 border-sky-100 dark:border-sky-500/20'
                              : 'bg-stone-100 dark:bg-white/5 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-white/10'
                          }`}>
                            {slot.consultationMode === 'online' ? 'Online' : 'Offline'}
                          </span>
                          <span className="text-[10px] bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-lg border border-emerald-100 dark:border-emerald-500/20 max-w-[130px] truncate">
                            {matchedClinic ? matchedClinic.name : (selectedDoctor.clinicId?.name || 'Assigned Clinic')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {selectedDoctor.availability.filter(s => s.isAvailable).length === 0 && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 italic">No weekly practice timings configured yet.</p>
                  )}
                </div>
              </div>
            )}

            {selectedDoctor.registrationDocument && (
              <div>
                <SectionLabel>Registration Certificate</SectionLabel>
                <a
                  href={selectedDoctor.registrationDocument}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-aura-600 dark:text-aura-400 hover:underline font-medium"
                >
                  <FileText size={15} />View Registration Document
                </a>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 dark:border-white/[0.06]">
              <button
                onClick={() => { setBookingDoctor(selectedDoctor); setDoctorModalOpen(false); setActiveTab('chat'); }}
                className="w-full py-2.5 rounded-xl text-sm font-semibold bg-aura-600 dark:bg-aura-500 text-white hover:bg-aura-700 dark:hover:bg-aura-600 transition"
              >
                Book Appointment with {selectedDoctor.firstName || selectedDoctor.fullName}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PatientPortalPage;
