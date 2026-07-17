import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Bot, User, ClipboardList, FileText, Globe, RefreshCcw, Send,
  Plus, X, Camera, Calendar, Stethoscope, AlertTriangle,
  CheckCircle2, Clock, ChevronRight, Activity, Pill, Heart,
  Phone, MapPin, UserCheck, Syringe, Bell, CreditCard, Shield,
  Eye, EyeOff, Lock, Unlock, ShieldAlert, UploadCloud, Trash2, Edit3,
  Search, Filter, SortAsc, ChevronLeft, Building2, RotateCcw,
  CalendarPlus, XCircle, Video, Star, TrendingUp, MessageSquare, LogOut, Menu
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
    welcome: 'Welcome, {username}! I am your AI Symptom Assistant. Tell me how you are feeling today, and I can help triage your symptoms.',
    askAge: 'What is your age?',
    askDuration: 'For how many days have you been experiencing this?',
    askConditions: 'Do you have any known medical conditions?',
    loading: 'Analyzing symptoms...',
    placeholder: 'Describe symptoms...',
    buttonSend: 'Send',
    none: 'none'
  }
};

const PatientPortalPage = () => {
  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'dashboard');
  const [notifications, setNotifications] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [selectedClinicId, setSelectedClinicId] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [globalSearchVal, setGlobalSearchVal] = useState('');

  // Appointments filter/sort tab state
  const [apptFilterTab, setApptFilterTab] = useState('all');
  const [apptSearch, setApptSearch] = useState('');
  const [apptSort, setApptSort] = useState('date');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [cancellingApptId, setCancellingApptId] = useState(null);

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    firstName: '', lastName: '', gender: 'other', dateOfBirth: '', phone: '', email: '', bloodGroup: '',
    address: { line1: '', line2: '', city: '', state: '', pincode: '', country: 'India' },
    emergencyContact: { name: '', relation: '', phone: '' }
  });
  const [profileImageFile, setProfileImageFile] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccessMessage, setProfileSuccessMessage] = useState('');

  // Medical History Lock/Form States
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
  const [historyForm, setHistoryForm] = useState({
    allergies: [], chronicConditions: [], currentMedications: [], pastSurgeries: [], familyHistory: [],
    lifestyle: { smoking: 'no', alcohol: 'no', exerciseFrequency: 'never', dietType: 'veg' }, pregnancyHistory: '', lmpDate: ''
  });
  const [newAllergy, setNewAllergy] = useState('');
  const [newCondition, setNewCondition] = useState('');
  const [newMedication, setNewMedication] = useState({ name: '', frequency: '' });
  const [newSurgery, setNewSurgery] = useState({ name: '', year: '' });
  const [newFamilyHistory, setNewFamilyHistory] = useState({ relation: '', condition: '' });
  const [savingHistory, setSavingHistory] = useState(false);
  const [historySuccessMessage, setHistorySuccessMessage] = useState('');

  // Billing states
  const [insuranceForm, setInsuranceForm] = useState({
    provider: '', policyNumber: '', groupNumber: '', subscriberName: '', subscriberDob: '', autoClaimAutomation: false
  });
  const [newCardForm, setNewCardForm] = useState({ cardholderName: '', cardNumber: '', expiryDate: '', CVV: '' });
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [savingBilling, setSavingBilling] = useState(false);
  const [billingSuccessMessage, setBillingSuccessMessage] = useState('');
  const [payments, setPayments] = useState([]);

  // Modal / Checkin states
  const [selectedApptDetails, setSelectedApptDetails] = useState(null);
  const [checkinQrModalOpen, setCheckinQrModalOpen] = useState(false);
  const [selectedCheckinAppt, setSelectedCheckinAppt] = useState(null);

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
        patientApi.getMyClinics().catch(() => ({ data: { clinics: [] } })),
        paymentApi.getHistory(patient._id).catch(() => ({ data: { payments: [] } }))
      ]);

      setAppointments(apptRes.data?.appointments || apptRes.appointments || []);
      setPrescriptions(rxRes.data?.prescriptions || rxRes.prescriptions || []);
      setInvoices(invRes.data?.invoices || invRes.invoices || []);
      setNotifications(notifRes.data?.notificationLogs || notifRes.notificationLogs || []);
      
      const fetchedClinics = clinicsRes.data?.clinics || clinicsRes.clinics || [];
      setClinics(fetchedClinics);
      if (fetchedClinics.length > 0) {
        setSelectedClinicId((prev) => prev || fetchedClinics[0]._id);
      }
      setPayments(paymentHistoryRes.data?.payments || paymentHistoryRes.payments || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load your patient portal.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => { loadPortal(true); }, [loadPortal]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
    const clinicId = searchParams.get('clinicId');
    if (clinicId) {
      setSelectedClinicId(clinicId);
    }
  }, [searchParams]);


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

  useEffect(() => {
    if (activeTab === 'history' && historySubTab === 'documents' && isHistoryUnlocked) {
      loadDocuments();
    }
  }, [activeTab, historySubTab, isHistoryUnlocked, loadDocuments]);

  // Profile Save
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSuccessMessage('');
    try {
      const payload = { ...profileForm, ...(profileImageFile ? { profileImage: profileImageFile } : {}) };
      const res = await patientApi.updateMe(payload);
      const updated = res.data?.patient || res.patient;
      if (updated) {
        setProfile(updated);
        setProfileImageFile('');
        setProfileSuccessMessage('Profile updated successfully!');
        loadPortal(false);
      }
    } catch {
      setError('Failed to save profile changes.');
    } finally {
      setSavingProfile(false);
    }
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
    } catch {
      alert('Failed to add card');
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
    } catch {
      alert('Failed to remove card');
    } finally {
      setSavingBilling(false);
    }
  };

  const removeHistoryItem = (type, index) => {
    setHistoryForm((prev) => ({ ...prev, [type]: prev[type].filter((_, i) => i !== index) }));
  };

  const addHistoryItem = (type, value, setter) => {
    if (!value.trim()) return;
    setHistoryForm((prev) => ({ ...prev, [type]: [...prev[type], value.trim()] }));
    setter('');
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setProfileImageFile(reader.result);
    reader.readAsDataURL(file);
  };

  const handleDownloadInvoice = async (invoiceId) => {
    try {
      const response = await billingApi.downloadInvoicePdf(invoiceId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to download invoice:', err);
    }
  };

  // Filter lists based on clinic context
  const filteredAppointments = appointments.filter(a => !selectedClinicId || String(a.clinicId?._id || a.clinicId) === String(selectedClinicId));
  const filteredPrescriptions = prescriptions.filter(p => !selectedClinicId || String(p.clinicId?._id || p.clinicId) === String(selectedClinicId));
  const filteredInvoices = invoices.filter(i => !selectedClinicId || String(i.clinicId?._id || i.clinicId) === String(selectedClinicId));
  const filteredNotifications = notifications.filter(n => !selectedClinicId || String(n.clinicId?._id || n.clinicId) === String(selectedClinicId));

  // Metrics counts
  const upcomingCount = filteredAppointments.filter(a => a.status === 'booked' || a.status === 'checked_in' || a.status === 'waiting').length;
  const completedCount = filteredAppointments.filter(a => a.status === 'completed').length;
  const activeRxCount = filteredPrescriptions.length;
  const pendingLabsCount = 1; // Simulated CBC/Vitamin D status
  const outstandingBillsSum = filteredInvoices
    .filter(i => i.paymentStatus === 'unpaid')
    .reduce((sum, i) => sum + (i.dueAmount || i.totalAmount || 0), 0);

  const activeClinic = clinics.find(c => String(c._id) === String(selectedClinicId));

  // Today's Appointment logic
  const todayAppointment = filteredAppointments.find(a => {
    if (a.status === 'cancelled' || a.status === 'completed') return false;
    const d = new Date(a.appointmentDate);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });

  if (loading) return <FullPageSpinner message="Loading your health portal..." />;

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-500/10 flex items-center justify-center">
        <AlertTriangle className="text-rose-500" size={28} />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Portal Unavailable</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">{error}</p>
      </div>
      <button onClick={() => loadPortal(true)} className="px-5 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition">
        Try again
      </button>
    </div>
  );

  return (
    <div className="space-y-6">


          {/* ============================================================ */}
          {/* ── STATE: Dashboard Home ── */}
          {/* ============================================================ */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
              
              {/* Left 2 Columns: Main health logs */}
              <div className="xl:col-span-2 space-y-6">
                
                {/* Welcome Card Banner */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 to-blue-800 p-6 md:p-8 text-white flex justify-between items-center shadow-lg shadow-blue-905/10">
                  <div className="space-y-4 max-w-md relative z-10">
                    <p className="text-xs font-black uppercase tracking-wider text-blue-200">Patient Dashboard</p>
                    <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Good Morning, {profile?.firstName || 'Kaishav'} 👋</h2>
                    <p className="text-xs text-blue-100/80 leading-relaxed">Welcome back to {activeClinic?.name || 'Garg Clinic'}. Select clinic in dropdown or clinics sidebar tab to view medical logs.</p>
                    
                    <div className="flex flex-wrap gap-4 pt-2">
                      <div className="flex items-center gap-2 bg-white/10 px-3.5 py-2 rounded-xl backdrop-blur-sm">
                        <User size={13} className="text-blue-200" />
                        <span className="text-[10px] font-bold">ID: {profile?.patientId || 'PT123456'}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-white/10 px-3.5 py-2 rounded-xl backdrop-blur-sm">
                        <Calendar size={13} className="text-blue-200" />
                        <span className="text-[10px] font-bold">Since: 12 Jan 2024</span>
                      </div>
                    </div>
                  </div>

                  {/* Graphic medical building illustration */}
                  <div className="hidden md:block w-48 shrink-0 select-none relative z-10 opacity-90">
                    <svg className="w-full h-auto" viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="15" y="10" width="70" height="70" rx="4" fill="#ffffff" fillOpacity="0.1" />
                      <rect x="25" y="20" width="50" height="60" rx="3" fill="#ffffff" />
                      <rect x="35" y="10" width="30" height="15" rx="2" fill="#3b82f6" />
                      <rect x="47" y="15" width="6" height="6" fill="#ffffff" />
                      <rect x="42" y="25" width="16" height="4" fill="#e2e8f0" />
                      <rect x="30" y="35" width="10" height="10" rx="1" fill="#93c5fd" />
                      <rect x="45" y="35" width="10" height="10" rx="1" fill="#93c5fd" />
                      <rect x="60" y="35" width="10" height="10" rx="1" fill="#93c5fd" />
                      <rect x="30" y="50" width="10" height="10" rx="1" fill="#93c5fd" />
                      <rect x="45" y="50" width="10" height="10" rx="1" fill="#3b82f6" />
                      <rect x="60" y="50" width="10" height="10" rx="1" fill="#93c5fd" />
                    </svg>
                  </div>
                </div>

                {/* Quick Actions Panel */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Quick Actions</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    {[
                      { label: 'Book Appointment', icon: <CalendarPlus size={20} className="text-violet-500" />, tab: 'appointments' },
                      { label: 'View Prescription', icon: <Pill size={20} className="text-emerald-500" />, tab: 'prescriptions' },
                      { label: 'Lab Reports', icon: <Syringe size={20} className="text-amber-500" />, tab: 'labs' },
                      { label: 'Pay Bills', icon: <CreditCard size={20} className="text-blue-500" />, tab: 'billing' },
                      { label: 'Upload Documents', icon: <UploadCloud size={20} className="text-rose-500" />, tab: 'documents' }
                    ].map((act, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveTab(act.tab)}
                        className="bg-white border border-slate-200 hover:border-blue-400 hover:shadow-sm p-4 rounded-2xl flex flex-col items-center justify-center gap-3 text-center transition"
                      >
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
                          {act.icon}
                        </div>
                        <span className="text-[11px] font-bold text-slate-700 leading-tight">{act.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Health Summary Metric Widgets */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Health Summary</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    {[
                      { label: 'Upcoming Appointments', count: upcomingCount, color: 'blue', tab: 'appointments' },
                      { label: 'Completed Consultations', count: completedCount, color: 'emerald', tab: 'history' },
                      { label: 'Active Prescriptions', count: activeRxCount, color: 'amber', tab: 'prescriptions' },
                      { label: 'Pending Lab Reports', count: pendingLabsCount, color: 'violet', tab: 'labs' },
                      { label: 'Outstanding Bills', count: `₹${outstandingBillsSum}`, color: 'rose', tab: 'billing' }
                    ].map((metric, i) => (
                      <div
                        key={i}
                        onClick={() => setActiveTab(metric.tab)}
                        className={`bg-white border border-slate-200 p-4 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-400 transition`}
                      >
                        <span className={`text-2xl font-black ${
                          metric.color === 'blue' ? 'text-blue-600' :
                          metric.color === 'emerald' ? 'text-emerald-500' :
                          metric.color === 'amber' ? 'text-amber-500' :
                          metric.color === 'violet' ? 'text-violet-500' : 'text-rose-500'
                        }`}>{metric.count}</span>
                        <span className="text-[9px] font-extrabold text-slate-400 mt-2 uppercase tracking-wide leading-tight">{metric.label}</span>
                        <span className="text-[9px] font-bold text-blue-600 mt-2 hover:underline">View All</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Consultations Timeline */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Recent Consultations</h3>
                    <button onClick={() => setActiveTab('history')} className="text-[11px] font-bold text-blue-600 hover:underline">View All</button>
                  </div>

                  <div className="space-y-4 relative before:absolute before:left-6 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                    {filteredAppointments.filter(a => a.status === 'completed').slice(0, 3).map((appt) => (
                      <div key={appt._id} className="relative pl-12 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-slate-55/50 hover:bg-slate-50 p-4 rounded-2xl border border-slate-100 transition">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-4 border-white bg-blue-500" />
                        <div>
                          <p className="text-xs font-black text-slate-900">Dr. {appt.doctorId?.fullName || 'Doctor'}</p>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">{appt.doctorId?.specialization || 'General Physician'} • {appt.appointmentDate ? new Date(appt.appointmentDate).toLocaleDateString() : 'Date'}</p>
                          <p className="text-[11px] text-slate-505 font-semibold mt-1">Diagnosis: {appt.reasonForVisit || 'General Health Check'}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Completed</span>
                          <button
                            onClick={() => setSelectedApptDetails(appt)}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-white text-[10px] font-bold transition"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    ))}
                    {filteredAppointments.filter(a => a.status === 'completed').length === 0 && (
                      <p className="text-xs text-slate-450 italic py-4 text-center">No completed consultations logged yet.</p>
                    )}
                  </div>
                </div>

              </div>

              {/* Right Sidebar Widgets */}
              <div className="space-y-6">
                
                {/* Today's Appointment Widget */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Today's Appointment</h3>
                    <button onClick={() => setActiveTab('appointments')} className="text-[11px] font-bold text-blue-600 hover:underline">View All</button>
                  </div>

                  {todayAppointment ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-2xl font-black text-blue-600 leading-none">{todayAppointment.startTime || 'TBD'}</p>
                          <p className="text-xs font-black text-slate-900 mt-2">Dr. {todayAppointment.doctorId?.fullName}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{todayAppointment.doctorId?.specialization || 'Physician'} • Token No: {todayAppointment.tokenNumber || '15'}</p>
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1.5">
                          <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 border border-blue-500/10">Confirmed</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedApptDetails(todayAppointment)}
                          className="flex-1 py-2 text-center text-xs font-bold border border-slate-200 hover:bg-slate-50 rounded-xl transition"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCheckinAppt(todayAppointment);
                            setCheckinQrModalOpen(true);
                          }}
                          className="flex-1 py-2 text-center text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-xl transition shadow-sm shadow-blue-500/15"
                        >
                          Check-in QR
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl">
                      <Calendar className="text-slate-300 mx-auto mb-2" size={24} />
                      <p className="text-xs text-slate-500 font-semibold">No appointments booked today</p>
                      <button
                        onClick={() => setActiveTab('appointments')}
                        className="mt-3 text-[11px] font-bold text-blue-600 hover:underline"
                      >
                        Book Appointment
                      </button>
                    </div>
                  )}
                </div>

                {/* Prescriptions Download List Widget */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Prescriptions</h3>
                    <button onClick={() => setActiveTab('prescriptions')} className="text-[11px] font-bold text-blue-600 hover:underline">View All</button>
                  </div>

                  <div className="space-y-3">
                    {filteredPrescriptions.slice(0, 3).map((rx) => (
                      <div key={rx._id} className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/50 border border-slate-100 flex items-center justify-between gap-3 transition">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">Dr. {rx.doctorId?.fullName || 'Doctor'}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{rx.finalizedAt ? new Date(rx.finalizedAt).toLocaleDateString() : 'Completed'}</p>
                        </div>
                        <button
                          onClick={() => alert('Download Prescription PDF')}
                          className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-600 transition"
                        >
                          <FileText size={14} />
                        </button>
                      </div>
                    ))}
                    {filteredPrescriptions.length === 0 && (
                      <p className="text-xs text-slate-450 italic py-2 text-center">No prescriptions listed.</p>
                    )}
                  </div>
                </div>

                {/* Recent Notifications Widget */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Notifications</h3>
                    <button onClick={() => setActiveTab('notifications')} className="text-[11px] font-bold text-blue-600 hover:underline">View All</button>
                  </div>

                  <div className="space-y-3">
                    {filteredNotifications.slice(0, 4).map((notif) => (
                      <div key={notif._id} className="p-3 rounded-2xl bg-slate-50/50 border border-slate-100 flex items-start gap-2.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                        <div>
                          <p className="text-[11px] font-bold text-slate-800 leading-normal">{notif.subject || notif.body}</p>
                          <p className="text-[9px] text-slate-450 mt-1 font-medium">{notif.sentAt ? new Date(notif.sentAt).toLocaleDateString() : 'Garg Clinic'}</p>
                        </div>
                      </div>
                    ))}
                    {filteredNotifications.length === 0 && (
                      <p className="text-xs text-slate-450 italic py-2 text-center">No recent alerts.</p>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* ── STATE: My Clinics Page ── */}
          {/* ============================================================ */}
          {activeTab === 'clinics' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-slate-900">My Registered Clinics</h2>
                <p className="text-xs text-slate-500 mt-0.5">Below is the complete list of B2B clinics you have relationships with.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {clinics.map((clinic) => (
                  <div key={clinic._id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 shrink-0">
                        <Building2 size={24} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-black text-slate-900 truncate">{clinic.name}</h3>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{clinic.phone || 'Contact Info'}</p>
                      </div>
                    </div>

                    <div className="text-xs text-slate-500 space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <p><span className="font-bold text-slate-700">Address:</span> {[clinic.address?.line1, clinic.address?.city, clinic.address?.state].filter(Boolean).join(', ')}</p>
                      <p><span className="font-bold text-slate-700">Membership Date:</span> 12 Jan 2024</p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedClinicId(clinic._id);
                          setActiveTab('dashboard');
                        }}
                        className="flex-1 py-2 text-center text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-xl transition"
                      >
                        Open Clinic
                      </button>
                      <button
                        onClick={() => {
                          setSelectedClinicId(clinic._id);
                          setActiveTab('appointments');
                        }}
                        className="flex-1 py-2 text-center text-xs font-bold border border-slate-200 hover:bg-slate-50 rounded-xl transition"
                      >
                        Book Appointment
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* ── STATE: Appointments Tab ── */}
          {/* ============================================================ */}
          {activeTab === 'appointments' && (
            <Appointments
              appointments={filteredAppointments}
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
              invoices={filteredInvoices}
            />
          )}

          {/* ============================================================ */}
          {/* ── STATE: Consultation History Timeline ── */}
          {/* ============================================================ */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-slate-900">Consultation History</h2>
                <p className="text-xs text-slate-500 mt-0.5">Timeline of all completed medical consultations at {activeClinic?.name || 'Clinic'}.</p>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6 relative before:absolute before:left-8 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-100">
                {filteredAppointments.filter(a => a.status === 'completed').map((appt) => (
                  <div key={appt._id} className="relative pl-12 space-y-3">
                    <div className="absolute left-6 top-1.5 -translate-x-1/2 w-4.5 h-4.5 rounded-full border-4 border-white bg-blue-600 shadow-sm" />
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div>
                        <p className="text-xs font-black text-slate-900">Dr. {appt.doctorId?.fullName || 'Physician'}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{appt.appointmentDate ? new Date(appt.appointmentDate).toLocaleDateString() : 'Date'} • {appt.startTime}</p>
                        <div className="mt-2 text-xs text-slate-650 font-semibold space-y-1">
                          <p><span className="text-slate-400">Chief Complaint:</span> {appt.reasonForVisit || 'N/A'}</p>
                          <p><span className="text-slate-400">Diagnosis Summary:</span> Checked & completed</p>
                        </div>
                      </div>
                      <div>
                        <button
                          onClick={() => setSelectedApptDetails(appt)}
                          className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold transition"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* ── STATE: Prescriptions ── */}
          {/* ============================================================ */}
          {activeTab === 'prescriptions' && (
            <Prescriptions
              prescriptions={filteredPrescriptions}
              prescriptionApi={prescriptionApi}
            />
          )}

          {/* ============================================================ */}
          {/* ── STATE: Lab Reports ── */}
          {/* ============================================================ */}
          {activeTab === 'labs' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-slate-900">Lab Reports</h2>
                <p className="text-xs text-slate-500 mt-0.5">Lab test requests and results from active diagnostics.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { name: 'CBC (Complete Blood Count)', doctor: 'Dr. Rahul Verma', status: 'Ready', date: '10 May 2024' },
                  { name: 'Vitamin D', doctor: 'Dr. Rahul Verma', status: 'Ready', date: '10 May 2024' },
                  { name: 'Blood Sugar', doctor: 'Dr. Neha Sharma', status: 'Processing', date: '28 Apr 2024' }
                ].map((lab, i) => (
                  <div key={i} className="bg-white border border-slate-200 rounded-3xl p-5 flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xs font-black text-slate-900">{lab.name}</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">Ordered by: {lab.doctor} • {lab.date}</p>
                      <div className="mt-2.5">
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider ${lab.status === 'Ready' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'}`}>
                          {lab.status}
                        </span>
                      </div>
                    </div>
                    {lab.status === 'Ready' && (
                      <button
                        onClick={() => alert('Downloading Lab Report PDF')}
                        className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 transition"
                      >
                        <FileText size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* ── STATE: Medical Documents ── */}
          {/* ============================================================ */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-slate-900">Medical Documents</h2>
                <p className="text-xs text-slate-500 mt-0.5">Upload and store prescriptions, MRI, CT scans, and lab results.</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6">
                <PatientDocumentOcrPanel onApply={() => loadDocuments()} />

                <div className="pt-4 border-t border-slate-100">
                  <SectionLabel>Your Files</SectionLabel>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {documents.map((doc) => (
                      <div key={doc._id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{doc.file_name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{doc.document_type || 'General Document'} • {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : 'N/A'}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => alert('Download document')}
                            className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-600 transition"
                          >
                            <FileText size={13} />
                          </button>
                          <button
                            onClick={async () => {
                              if (!window.confirm('Delete document?')) return;
                              await patientApi.deleteDocument(profile._id, doc._id);
                              loadDocuments();
                            }}
                            className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-rose-600 transition"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {documents.length === 0 && (
                      <p className="text-xs text-slate-400 italic">No custom uploaded files found.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* ── STATE: Bills & Payments ── */}
          {/* ============================================================ */}
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
              invoices={filteredInvoices}
              payments={payments}
              handleDownloadInvoice={handleDownloadInvoice}
            />
          )}

          {/* ============================================================ */}
          {/* ── STATE: Notifications Logs List ── */}
          {/* ============================================================ */}
          {activeTab === 'notifications' && (
            <Notifications
              notifications={filteredNotifications}
              setNotifications={setNotifications}
              appointments={filteredAppointments}
            />
          )}

          {/* ============================================================ */}
          {/* ── STATE: My Profile ── */}
          {/* ============================================================ */}
          {activeTab === 'profile' && (
            <MyProfile
              profile={profile}
              profileForm={profileForm}
              profileSuccessMessage={profileSuccessMessage}
              savingProfile={savingProfile}
              handleSaveProfile={handleSaveProfile}
              handleOcrApply={() => {}}
              profileImageFile={profileImageFile}
              handleImageChange={handleImageChange}
              pf={(f, v) => setProfileForm(p => ({ ...p, [f]: v }))}
              pa={(f, v) => setProfileForm(p => ({ ...p, address: { ...p.address, [f]: v } }))}
              pe={(f, v) => setProfileForm(p => ({ ...p, emergencyContact: { ...p.emergencyContact, [f]: v } }))}
              appointments={filteredAppointments}
              prescriptions={filteredPrescriptions}
            />
          )}

          {/* ============================================================ */}
          {/* ── STATE: Security Settings ── */}
          {/* ============================================================ */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-slate-900">Security Settings</h2>
                <p className="text-xs text-slate-500 mt-0.5">Manage your credentials, login history, and trusted devices.</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-xl space-y-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Change Password</h3>
                  <label className="grid gap-2 text-xs font-bold text-slate-700">
                    New Password
                    <input
                      type="password"
                      placeholder="Enter new account password"
                      className="rounded-xl border border-slate-200 px-4 py-2 text-xs focus:border-blue-500 outline-none transition"
                    />
                  </label>
                  <button className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm">
                    Update Password
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* ── STATE: Support ── */}
          {/* ============================================================ */}
          {activeTab === 'support' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-slate-900">Clinic Support</h2>
                <p className="text-xs text-slate-500 mt-0.5">Submit questions, requests, or report issues to {activeClinic?.name || 'Clinic'} staff.</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-xl space-y-4">
                <label className="grid gap-2 text-xs font-bold text-slate-700">
                  Message
                  <textarea
                    rows={4}
                    placeholder="Describe your issue or question..."
                    className="rounded-xl border border-slate-200 p-4 text-xs focus:border-blue-500 outline-none transition resize-none"
                  />
                </label>
                <button
                  onClick={() => alert('Support ticket logged successfully')}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm"
                >
                  Submit Ticket
                </button>
              </div>
            </div>
          )}

      {/* ── Appointment Details Modal ── */}
      {selectedApptDetails && (
        <AppointmentDetailsModal
          appointment={selectedApptDetails}
          onClose={() => setSelectedApptDetails(null)}
          onDownloadSlip={() => alert('Downloading appointment slip...')}
        />
      )}

      {/* ── Check-in QR Modal ── */}
      <Modal open={checkinQrModalOpen} onClose={() => setCheckinQrModalOpen(false)} title="Check-in QR Code" size="sm">
        {selectedCheckinAppt && (
          <div className="p-6 text-center space-y-4">
            <p className="text-xs text-slate-500">Scan this QR code at the clinic reception desk to automatically check-in.</p>
            <div className="w-48 h-48 mx-auto border border-slate-200 rounded-2xl overflow-hidden flex items-center justify-center p-4 bg-white">
              <img
                src={selectedCheckinAppt.qrCode || `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${selectedCheckinAppt.appointmentCode}`}
                alt="Checkin QR Code"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <p className="text-xs font-black text-slate-800">Token Number: {selectedCheckinAppt.tokenNumber || '15'}</p>
              <p className="text-[10px] font-mono text-slate-400 mt-1">Code: {selectedCheckinAppt.appointmentCode}</p>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};

const HelpCircleIcon = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <path d="M12 17h.01" />
  </svg>
);

export default PatientPortalPage;
