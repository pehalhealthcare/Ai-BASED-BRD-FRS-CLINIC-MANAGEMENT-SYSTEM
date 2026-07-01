import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Bot, User, ClipboardList, FileText, Globe, RefreshCcw, Send,
  Plus, X, Camera, Calendar, Stethoscope, AlertTriangle,
  CheckCircle2, Clock, ChevronRight, Activity, Pill, Heart,
  Phone, MapPin, UserCheck, Syringe, Bell, CreditCard, Shield,
  Eye, EyeOff, Lock, Unlock, ShieldAlert, UploadCloud, Trash2, Edit3,
  Search, Filter, SortAsc, ChevronLeft, Building2, RotateCcw,
  CalendarPlus, XCircle, Video, Star, TrendingUp
} from 'lucide-react';

import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { appointmentApi, billingApi, patientApi, prescriptionApi, doctorApi, clinicApi, paymentApi } from '../../lib/api';
import aiApi from '../../api/aiApi';
import PatientDocumentOcrPanel from './PatientDocumentOcrPanel';
import MyProfile from './PortalComponents/MyProfile';
import MedicalHistory from './PortalComponents/MedicalHistory';
import Appointments from './PortalComponents/Appointments';
import Prescriptions from './PortalComponents/Prescriptions';
import Notifications from './PortalComponents/Notifications';
import Records from './PortalComponents/Records';
import BillingInsurance from './PortalComponents/BillingInsurance';
import { SectionLabel } from './PortalComponents/SharedComponents';

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
// Consultation Payment Banner Helper Component
// ============================================================

const ConsultationPaymentBanner = ({ invoice }) => {
  const isOnline = invoice.appointmentId?.appointmentType === 'teleconsultation';
  const doctorName = invoice.doctorId?.fullName || invoice.appointmentId?.doctorId?.fullName || 'Doctor';
  const feeAmount = invoice.dueAmount || invoice.totalAmount || 0;
  const completedAt = invoice.consultationId?.completedAt || invoice.createdAt;

  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!isOnline || !completedAt) return;

    const calculateTime = () => {
      const completionTime = new Date(completedAt).getTime();
      const endTime = completionTime + 20 * 60 * 1000; // 20 mins
      const now = Date.now();
      const diff = endTime - now;

      if (diff <= 0) {
        setTimeLeft('00:00');
        setIsExpired(true);
        return;
      }

      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [isOnline, completedAt]);

  return (
    <div className={`
      relative overflow-hidden rounded-2xl p-5 border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300 shadow-sm
      ${isOnline
        ? isExpired
          ? 'bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-200'
          : 'bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-200'
        : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-800 dark:text-indigo-200'
      }
    `}>
      <div className="flex items-start gap-4">
        <div className={`
          w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border
          ${isOnline
            ? isExpired
              ? 'bg-rose-500/20 border-rose-500/30 text-rose-500'
              : 'bg-amber-500/20 border-amber-500/30 text-amber-500'
            : 'bg-indigo-500/20 border-indigo-500/30 text-indigo-500'
          }
        `}>
          {isOnline ? <Clock size={22} className={isExpired ? 'animate-pulse' : ''} /> : <CreditCard size={22} />}
        </div>

        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            Pending Consultation Fee: Dr. {doctorName}
          </h4>
          <p className="text-xs mt-1 text-slate-600 dark:text-slate-350 leading-relaxed">
            {isOnline
              ? isExpired
                ? 'The 20-minute payment window has expired. All upcoming appointments with this doctor have been cancelled.'
                : `This online consultation must be paid within 20 minutes. Please complete the payment to keep your upcoming appointments.`
              : 'Please complete your consultation fee payment. You can pay online here or at the clinic receptionist.'
            }
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span>Amount Due: ₹{feeAmount}</span>
            {isOnline && !isExpired && (
              <span className="flex items-center gap-1 text-rose-500 font-bold bg-rose-500/10 px-2 py-0.5 rounded-md">
                <Clock size={12} /> Time remaining: {timeLeft}
              </span>
            )}
            {isOnline && isExpired && (
              <span className="text-rose-500 font-bold bg-rose-500/15 px-2 py-0.5 rounded-md">
                Expired
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="shrink-0 w-full md:w-auto">
        {!isExpired && (
          <Link
            to={`/billing/${invoice._id}/checkout`}
            className={`
              inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm hover:scale-[1.02] transition-all w-full md:w-auto
              ${isOnline
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-indigo-600 hover:bg-indigo-700'
              }
            `}
          >
            <CreditCard size={15} />
            Pay Online (Razorpay)
          </Link>
        )}
      </div>
    </div>
  );
};

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
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'appointments');
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Appointments tab state
  const [apptFilterTab, setApptFilterTab] = useState('all');
  const [apptSearch, setApptSearch] = useState('');
  const [apptSort, setApptSort] = useState('date');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [cancellingApptId, setCancellingApptId] = useState(null);

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
  const [historyForm, setHistoryForm] = useState({
    allergies: [],
    chronicConditions: [],
    currentMedications: [],
    pastSurgeries: [],
    familyHistory: [],
    lifestyle: { smoking: 'no', alcohol: 'no', exerciseFrequency: 'never', dietType: 'veg' },
    pregnancyHistory: '',
    lmpDate: ''
  });
  const [newAllergy, setNewAllergy] = useState('');
  const [newCondition, setNewCondition] = useState('');
  const [newMedication, setNewMedication] = useState({ name: '', frequency: '' });
  const [newSurgery, setNewSurgery] = useState({ name: '', year: '' });
  const [newFamilyHistory, setNewFamilyHistory] = useState({ relation: '', condition: '' });
  const [savingHistory, setSavingHistory] = useState(false);
  const [historySuccessMessage, setHistorySuccessMessage] = useState('');
  const [isEditingHistory, setIsEditingHistory] = useState(false);

  // Security Password Lock States
  const [isHistoryUnlocked, setIsHistoryUnlocked] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [historySubTab, setHistorySubTab] = useState('overview');
  const [lockType, setLockType] = useState('account');
  const [customPassword, setCustomPassword] = useState('');
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

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
  const [payments, setPayments] = useState([]);

  // ─── Data Loading ───────────────────────────────────────────

  const loadPortal = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError('');
    try {
      const profileResponse = await patientApi.me();
      const patient = profileResponse.data?.patient || profileResponse.patient;
      if (!patient?._id) throw new Error('Patient profile not linked.');

      setProfile(patient);
      setLockType(patient.hasCustomHistoryPassword ? 'custom' : 'account');
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
        currentMedications: (patient.currentMedications || []).map(med => {
          if (typeof med === 'string') return { name: med, frequency: '' };
          return med || { name: '', frequency: '' };
        }),
        pastSurgeries: patient.pastSurgeries || [],
        familyHistory: patient.familyHistory || [],
        lifestyle: patient.lifestyle || { smoking: 'no', alcohol: 'no', exerciseFrequency: 'never', dietType: 'veg' },
        pregnancyHistory: patient.pregnancyHistory || '',
        lmpDate: patient.lmpDate ? new Date(patient.lmpDate).toISOString().split('T')[0] : ''
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

      const [apptRes, rxRes, invRes, notifRes, clinicsRes, paymentHistoryRes] = await Promise.all([
        appointmentApi.getAppointments({ limit: 100 }),
        prescriptionApi.getByPatient(patient._id, { status: 'finalized', limit: 100 }),
        billingApi.getPatientInvoices(patient._id, { limit: 100 }),
        patientApi.notifications(patient._id).catch(() => ({ data: { notificationLogs: [] } })),
        clinicApi.list().catch(() => ({ data: { clinics: [] } })),
        paymentApi.getHistory(patient._id).catch(() => ({ data: { payments: [] } }))
      ]);
      setAppointments(apptRes.data?.appointments || apptRes.appointments || []);
      setPrescriptions(rxRes.data?.prescriptions || rxRes.prescriptions || []);
      setInvoices(invRes.data?.invoices || invRes.invoices || []);
      setNotifications(notifRes.data?.notificationLogs || notifRes.notificationLogs || []);
      setClinics(clinicsRes.data?.clinics || clinicsRes.clinics || []);
      setPayments(paymentHistoryRes.data?.payments || paymentHistoryRes.payments || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load your patient portal.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => { loadPortal(true); }, [loadPortal]);

  const loadDocuments = useCallback(async () => {
    if (!profile?._id) return;
    setLoadingDocs(true);
    try {
      const res = await patientApi.listDocuments(profile._id);
      setDocuments(res.data?.documents || res.documents || []);
    } catch (err) {
      console.error('Failed to load documents', err);
    } finally {
      setLoadingDocs(false);
    }
  }, [profile?._id]);

  const handleDownloadInvoice = async (invoiceId) => {
    try {
      const response = await billingApi.downloadInvoicePdf(invoiceId);
      const blob = new Blob([response.data], {
        type: response.headers['content-type'] || 'application/pdf'
      });
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error('Failed to download invoice:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'history' && historySubTab === 'documents' && isHistoryUnlocked) {
      loadDocuments();
    }
  }, [activeTab, historySubTab, isHistoryUnlocked, loadDocuments]);

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
        clinicId: bookingDoctor?.clinic?._id || bookingDoctor?.clinicId || undefined,
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

  const handleVerifyPassword = async (e) => {
    e.preventDefault();
    if (!confirmPassword.trim()) {
      setUnlockError('Password is required.');
      return;
    }
    setUnlocking(true);
    setUnlockError('');
    try {
      await patientApi.verifyHistoryPassword(confirmPassword);
      setIsHistoryUnlocked(true);
      setConfirmPassword('');
    } catch (err) {
      setUnlockError(err.response?.data?.message || 'Incorrect password. Access denied.');
    } finally {
      setUnlocking(false);
    }
  };

  const handleSaveHistory = async (e) => {
    e.preventDefault();
    setSavingHistory(true);
    setHistorySuccessMessage('');
    try {
      const payloadMeds = (historyForm.currentMedications || []).map(med => {
        if (typeof med === 'string') return { name: med, frequency: '' };
        return med;
      });

      const payload = {
        allergies: historyForm.allergies,
        chronicConditions: historyForm.chronicConditions,
        currentMedications: payloadMeds,
        pastSurgeries: historyForm.pastSurgeries,
        familyHistory: historyForm.familyHistory,
        lifestyle: historyForm.lifestyle,
        pregnancyHistory: profile?.gender === 'female' ? historyForm.pregnancyHistory : undefined,
        lmpDate: (profile?.gender === 'female' && historyForm.lmpDate) ? historyForm.lmpDate : undefined,
        ...(lockType === 'custom' && customPassword.trim() ? { medicalHistoryPassword: customPassword.trim() } : {}),
        ...(lockType === 'account' ? { medicalHistoryPassword: '' } : {})
      };

      const res = await patientApi.updateMe(payload);
      const updated = res.data?.patient || res.patient;
      if (updated) {
        setProfile(updated);
        setHistorySuccessMessage('Medical history saved!');
        setCustomPassword('');
        loadPortal(false);
        setIsEditingHistory(false);
      }
    } catch {
      setError('Failed to save medical history.');
    } finally {
      setSavingHistory(false);
    }
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
    <div className="w-full space-y-5 animate-fade-in">

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

      {/* ── Pending Payment Notifications ── */}
      {invoices.filter(inv => inv.serviceType === 'CONSULTATION' && inv.paymentStatus !== 'paid').map(inv => (
        <ConsultationPaymentBanner key={inv._id} invoice={inv} />
      ))}

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
        <MyProfile
          profile={profile}
          profileForm={profileForm}
          profileSuccessMessage={profileSuccessMessage}
          savingProfile={savingProfile}
          handleSaveProfile={handleSaveProfile}
          handleOcrApply={handleOcrApply}
          profileImageFile={profileImageFile}
          handleImageChange={handleImageChange}
          pf={pf}
          pa={pa}
          pe={pe}
          appointments={appointments}
          prescriptions={prescriptions}
        />
      )}

      {/* ── TAB: Medical History ── */}
      {activeTab === 'history' && (
        <MedicalHistory
          isHistoryUnlocked={isHistoryUnlocked}
          setIsHistoryUnlocked={setIsHistoryUnlocked}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          unlockError={unlockError}
          unlocking={unlocking}
          handleVerifyPassword={handleVerifyPassword}
          profile={profile}
          isEditingHistory={isEditingHistory}
          setIsEditingHistory={setIsEditingHistory}
          historySubTab={historySubTab}
          setHistorySubTab={setHistorySubTab}
          historySuccessMessage={historySuccessMessage}
          historyForm={historyForm}
          setHistoryForm={setHistoryForm}
          removeHistoryItem={removeHistoryItem}
          addHistoryItem={addHistoryItem}
          newAllergy={newAllergy}
          setNewAllergy={setNewAllergy}
          newCondition={newCondition}
          setNewCondition={setNewCondition}
          newMedication={newMedication}
          setNewMedication={setNewMedication}
          newSurgery={newSurgery}
          setNewSurgery={setNewSurgery}
          newFamilyHistory={newFamilyHistory}
          setNewFamilyHistory={setNewFamilyHistory}
          lockType={lockType}
          setLockType={setLockType}
          customPassword={customPassword}
          setCustomPassword={setCustomPassword}
          savingHistory={savingHistory}
          handleSaveHistory={handleSaveHistory}
          documents={documents}
          loadingDocs={loadingDocs}
          loadDocuments={loadDocuments}
          patientApi={patientApi}
        />
      )}

      {/* ── TAB: Appointments ── */}
      {activeTab === 'appointments' && (
        <Appointments
          appointments={appointments}
          apptSearch={apptSearch}
          setApptSearch={setApptSearch}
          apptFilterTab={apptFilterTab}
          setApptFilterTab={setApptFilterTab}
          apptSort={apptSort}
          setApptSort={setApptSort}
          calendarMonth={calendarMonth}
          setCalendarMonth={setCalendarMonth}
          clinics={clinics}
          cancellingApptId={cancellingApptId}
          setCancellingApptId={setCancellingApptId}
          loadPortal={loadPortal}
          appointmentApi={appointmentApi}
          invoices={invoices}
        />
      )}

      {/* ── TAB: Prescriptions ── */}
      {activeTab === 'prescriptions' && (
        <Prescriptions
          prescriptions={prescriptions}
          prescriptionApi={prescriptionApi}
        />
      )}

      {/* ── TAB: Notifications ── */}
      {activeTab === 'notifications' && (
        <Notifications
          notifications={notifications}
          setNotifications={setNotifications}
          appointments={appointments}
        />
      )}

      {/* ── TAB: Records ── */}
      {activeTab === 'records' && (
        <Records
          appointments={appointments}
          prescriptions={prescriptions}
          invoices={invoices}
        />
      )}

      {/* ── TAB: Billing & Insurance ── */}
      {activeTab === 'billing' && (
        <BillingInsurance
          profile={profile}
          insuranceForm={insuranceForm}
          setInsuranceForm={setInsuranceForm}
          newCardForm={newCardForm}
          setNewCardForm={setNewCardForm}
          paymentMethods={paymentMethods}
          savingBilling={savingBilling}
          billingSuccessMessage={billingSuccessMessage}
          handleSaveInsurance={handleSaveInsurance}
          handleAddCard={handleAddCard}
          handleRemoveCard={handleRemoveCard}
          invoices={invoices}
          payments={payments}
          handleDownloadInvoice={handleDownloadInvoice}
        />
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
