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
import { appointmentApi, billingApi, patientApi, prescriptionApi, doctorApi, clinicApi, paymentApi, providersApi, labApi, pharmacyApi } from '../../lib/api';
import aiApi from '../../api/aiApi';
import PatientDocumentOcrPanel from './PatientDocumentOcrPanel';
import MyProfile from './PortalComponents/MyProfile';
import MedicalHistory from './PortalComponents/MedicalHistory';
import Appointments from './PortalComponents/Appointments';
import Prescriptions from './PortalComponents/Prescriptions';
import AppointmentDetailsModal from './PortalComponents/AppointmentDetailsModal';
import Notifications from './PortalComponents/Notifications';
import Records from './PortalComponents/Records';
import BillingInsurance from './PortalComponents/BillingInsurance';
import { SectionLabel } from './PortalComponents/SharedComponents';

// ============================================================
// Translations & Helpers
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
  const selectedLabId = searchParams.get('labId') || '';
  const selectedPharmacyId = searchParams.get('pharmacyId') || '';
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'dashboard');
  const [notifications, setNotifications] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [clinicDoctors, setClinicDoctors] = useState([]);
  const [selectedClinicId, setSelectedClinicId] = useState(() => searchParams.get('clinicId') || localStorage.getItem('patientActiveClinicId') || '');
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
  const [carts, setCarts] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('patient_carts') || '{}');
    } catch {
      return {};
    }
  });
  const cart = carts[selectedPharmacyId] || [];
  const updateCart = (newCart) => {
    const nextCarts = { ...carts, [selectedPharmacyId]: newCart };
    setCarts(nextCarts);
    localStorage.setItem('patient_carts', JSON.stringify(nextCarts));
  };
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [newAddressForm, setNewAddressForm] = useState({
    fullName: '', mobileNumber: '', alternateNumber: '',
    houseFlatNumber: '', buildingName: '', street: '', landmark: '', area: '',
    city: '', state: '', pinCode: '', addressType: 'Home', isDefault: false
  });
  const [savingAddress, setSavingAddress] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState('');
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState('');
  const [manualPrescriptionFile, setManualPrescriptionFile] = useState('');
  const [prescriptionType, setPrescriptionType] = useState('system');
  const [pharmacyOrders, setPharmacyOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [labSearchQuery, setLabSearchQuery] = useState('');
  const [pharmacySearchQuery, setPharmacySearchQuery] = useState('');
  const [labList, setLabList] = useState([]);
  const [pharmacyList, setPharmacyList] = useState([]);
  const activeLab = labList.find(l => String(l._id) === String(selectedLabId)) || null;
  const activePharmacy = pharmacyList.find(p => String(p._id) === String(selectedPharmacyId)) || null;
  const [loadingWorkspaceData, setLoadingWorkspaceData] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [workspaceMappings, setWorkspaceMappings] = useState([]);
  const [loadingMappings, setLoadingMappings] = useState(false);

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

  useEffect(() => {
    if (selectedClinicId) {
      localStorage.setItem('patientActiveClinicId', selectedClinicId);
    }
    loadPortal(true);
  }, [selectedClinicId, loadPortal]);

  useEffect(() => {
    const handleClinicChange = (e) => {
      setSelectedClinicId(e.detail);
    };
    window.addEventListener('patient:clinic-changed', handleClinicChange);
    return () => {
      window.removeEventListener('patient:clinic-changed', handleClinicChange);
    };
  }, []);

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

  useEffect(() => {
    if (selectedClinicId) {
      setLoadingWorkspaceData(true);
      Promise.all([
        providersApi.getProviders({ clinicId: selectedClinicId, providerType: 'Laboratory', limit: 100 }).catch(() => ({ data: { items: [] } })),
        providersApi.getProviders({ clinicId: selectedClinicId, providerType: 'Pharmacy', limit: 100 }).catch(() => ({ data: { items: [] } }))
      ]).then(([labsRes, pharsRes]) => {
        setLabList(labsRes.data?.items || labsRes.items || []);
        setPharmacyList(pharsRes.data?.items || pharsRes.items || []);
      }).catch(err => {
        console.error('Failed to load workspace providers:', err);
      }).finally(() => {
        setLoadingWorkspaceData(false);
      });
    } else {
      setLabList([]);
      setPharmacyList([]);
    }
  }, [selectedClinicId]);

  useEffect(() => {
    if (selectedClinicId) {
      doctorApi.list({ clinicId: selectedClinicId })
        .then(res => {
          setClinicDoctors(res.data?.doctors || res.doctors || []);
        })
        .catch(err => {
          console.error('Failed to load clinic doctors:', err);
        });
    } else {
      setClinicDoctors([]);
    }
  }, [selectedClinicId]);

  useEffect(() => {
    const activeId = selectedLabId || selectedPharmacyId;
    const clinicIdForMapping = searchParams.get('clinicId') || selectedClinicId;
    if (activeId && clinicIdForMapping) {
      setLoadingMappings(true);
      if (selectedPharmacyId) {
        pharmacyApi.listMedicines({ clinicId: clinicIdForMapping, providerId: selectedPharmacyId, limit: 100 })
          .then(res => {
            const list = res.medicines || res.data?.medicines || (Array.isArray(res) ? res : []);
            const mapped = list.map(m => {
              const tabletsPerStrip = parseInt(m.packSize) || (m.form?.toLowerCase().includes('tablet') || m.form?.toLowerCase().includes('capsule') ? 10 : 1);
              return {
                _id: m._id,
                mappingType: 'Medicine',
                status: 'Active',
                providerName: m.name,
                genericName: m.genericName || '',
                mrp: m.sellingPrice || m.unitPrice || 0,
                strength: m.strength || '',
                packSize: tabletsPerStrip,
                manufacturer: m.manufacturer || '',
                dosageForm: m.form || 'General',
                category: m.category || 'General',
                totalStock: m.totalStock || 0,
                requiresPrescription: m.requiresPrescription || false
              };
            });
            setWorkspaceMappings(mapped);
          })
          .catch(err => {
            console.error('Failed to load pharmacy medicines:', err);
            setWorkspaceMappings([]);
          })
          .finally(() => {
            setLoadingMappings(false);
          });
      } else if (selectedLabId) {
        labApi.listTests({ clinicId: clinicIdForMapping, providerId: selectedLabId, limit: 100 })
          .then(res => {
            const list = res.labTests || res.data?.labTests || (Array.isArray(res) ? res : []);
            const mapped = list.map(t => ({
              _id: t._id,
              mappingType: 'LabTest',
              status: 'Active',
              providerName: t.name,
              mrp: t.price || t.testPrice || 0,
              sampleType: t.specimenType || '',
              normalReportingTime: t.turnaroundTime || '',
              methodology: t.category || 'General'
            }));
            setWorkspaceMappings(mapped);
          })
          .catch(err => {
            console.error('Failed to load lab tests:', err);
            setWorkspaceMappings([]);
          })
          .finally(() => {
            setLoadingMappings(false);
          });
      }
    } else {
      setWorkspaceMappings([]);
    }
  }, [selectedLabId, selectedPharmacyId, selectedClinicId, searchParams]);

  useEffect(() => {
    if (selectedPharmacyId) {
      providersApi.getPharmacyCoupons({ providerId: selectedPharmacyId })
        .then(res => {
          const list = res.coupons || res.data?.coupons || [];
          setAvailableCoupons(list);
        })
        .catch(err => {
          console.error('Failed to load pharmacy coupons:', err);
          setAvailableCoupons([]);
        });
    } else {
      setAvailableCoupons([]);
    }
  }, [selectedPharmacyId]);


  useEffect(() => {
    const hasHomeDelivery = activePharmacy?.services?.homeDelivery;
    const hasPickup = activePharmacy?.services?.pickupAvailable;
    if (hasHomeDelivery && hasPickup) {
      setDeliveryMethod(prev => prev || 'Home Delivery');
    } else if (hasHomeDelivery) {
      setDeliveryMethod('Home Delivery');
    } else if (hasPickup) {
      setDeliveryMethod('Pickup');
    } else {
      setDeliveryMethod('');
    }
  }, [activePharmacy]);

  const fetchPharmacyOrders = useCallback(() => {
    if (!selectedClinicId) return;
    setLoadingOrders(true);
    providersApi.getPharmacyOrders({ clinicId: selectedClinicId, limit: 100 })
      .then(res => {
        setPharmacyOrders(res.orders || res.data?.orders || (Array.isArray(res) ? res : []));
      })
      .catch(err => {
        console.error('Failed to load pharmacy orders:', err);
      })
      .finally(() => {
        setLoadingOrders(false);
      });
  }, [selectedClinicId]);

  useEffect(() => {
    if (activeTab === 'pharmacy-orders-workspace') {
      fetchPharmacyOrders();
    }
  }, [activeTab, fetchPharmacyOrders]);

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
  const filteredDocuments = documents.filter(d => !selectedClinicId || String(d.clinicId?._id || d.clinicId) === String(selectedClinicId));



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
                    <span className={`text-2xl font-black ${metric.color === 'blue' ? 'text-blue-600' :
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
      {/* ── STATE: My Clinic Page ── */}
      {/* ============================================================ */}
      {activeTab === 'my-clinic' && activeClinic && (
        <div className="space-y-8 animate-fade-in">
          {/* Clinic Banner & Quick Stats */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-lg">
            <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white to-transparent pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-3xl">
                  🏥
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-black">{activeClinic.name}</h2>
                  <p className="text-xs text-blue-100 font-semibold mt-1">
                    📍 {[activeClinic.address?.line1, activeClinic.address?.city].filter(Boolean).join(', ')}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setActiveTab('appointments')}
                  className="px-5 py-2.5 bg-white hover:bg-slate-50 text-blue-700 font-bold rounded-2xl text-xs transition shadow-md shadow-blue-900/10"
                >
                  Book Appointment 📅
                </button>
              </div>
            </div>
          </div>

          {/* Two Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">

            {/* Left Columns - Main Info & Doctors */}
            <div className="space-y-8">
              {/* Clinic Details Grid */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3">Clinic Overview</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-xs">
                  <div className="space-y-1">
                    <p className="text-slate-400 font-bold">Contact Phone</p>
                    <p className="text-slate-805 font-black text-sm">{activeClinic.phone || '+91 99999 88888'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-400 font-bold">Email Address</p>
                    <p className="text-slate-850 font-black text-sm">{activeClinic.email || `contact@${activeClinic.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-400 font-bold">Working Hours</p>
                    <p className="text-slate-850 font-black text-sm">09:00 AM - 08:00 PM</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-400 font-bold">Emergency Contact 🚨</p>
                    <p className="text-rose-600 font-black text-sm">+91 98765 43210</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-400 font-bold">Clinic Administrator</p>
                    <p className="text-slate-850 font-black text-sm">Admin Office (Ext. 101)</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-400 font-bold">Services Status</p>
                    <span className="inline-block bg-emerald-500/10 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">Operational</span>
                  </div>
                </div>
              </div>

              {/* Assigned Doctors */}
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Our Specialist Doctors</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {clinicDoctors.map((doc) => (
                    <div key={doc._id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:shadow transition duration-200 flex flex-col justify-between space-y-4">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-extrabold text-base shrink-0">
                          {doc.fullName?.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-black text-slate-805 truncate">Dr. {doc.fullName}</h4>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5 truncate">{doc.specialization || 'General Physician'}</p>
                          <p className="text-[9px] text-slate-500 font-medium mt-1 truncate">{doc.qualifications || 'MBBS, MD'}</p>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-[10px]">
                        <div>
                          <p className="text-slate-400 font-bold">Availability</p>
                          <p className="text-slate-700 font-extrabold mt-0.5">Mon - Sat (09:00 - 17:00)</p>
                        </div>
                        <button
                          onClick={() => {
                            navigate(`/portal?tab=appointments&clinicId=${activeClinic._id}&doctorId=${doc._id}`);
                          }}
                          className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-black rounded-xl transition"
                        >
                          Book Slot
                        </button>
                      </div>
                    </div>
                  ))}
                  {clinicDoctors.length === 0 && (
                    <p className="text-xs text-slate-450 italic col-span-2 py-4">No doctors assigned at this moment.</p>
                  )}
                </div>
              </div>

              {/* Services Available */}
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Services Available</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { title: 'Consultation', desc: 'OPD Services', icon: '🩺' },
                    { title: 'Laboratory', desc: 'Blood Tests & Scans', icon: '🔬' },
                    { title: 'Pharmacy', desc: 'Medicine Dispensing', icon: '💊' },
                    { title: 'Procedures', desc: 'Minor Surgeries', icon: '🩹' },
                    { title: 'Vaccination', desc: 'Immunization Care', icon: '💉' },
                    { title: 'Physiotherapy', desc: 'Rehab Services', icon: '🏃' },
                    { title: 'Dental', desc: 'Oral Treatments', icon: '🦷' },
                    { title: 'Others', desc: 'Specialist Care', icon: '🏥' }
                  ].map((srv, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-150 rounded-2xl p-4 text-center space-y-1 hover:bg-slate-100/70 transition">
                      <p className="text-2xl">{srv.icon}</p>
                      <p className="text-xs font-black text-slate-800 mt-2">{srv.title}</p>
                      <p className="text-[9px] text-slate-400 font-medium">{srv.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Timeline & Documents */}
            <div className="space-y-6">
              {/* Recent Visits (Timeline) */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Recent Visits</h3>
                <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                  {filteredAppointments.filter(a => a.status === 'completed').slice(0, 3).map((appt) => (
                    <div key={appt._id} className="relative pl-7 text-xs">
                      <div className="absolute left-3 top-1.5 -translate-x-1/2 w-2 h-2 rounded-full bg-blue-600 border border-white" />
                      <p className="font-extrabold text-slate-800">Completed Consultation</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Dr. {appt.doctorId?.fullName || 'Physician'}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">{new Date(appt.appointmentDate).toLocaleDateString()}</p>
                    </div>
                  ))}
                  {filteredAppointments.filter(a => a.status === 'completed').length === 0 && (
                    <p className="text-[11px] text-slate-400 italic">No completed visits found.</p>
                  )}
                </div>
              </div>

              {/* Upcoming Appointments */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Upcoming Schedule</h3>
                <div className="space-y-3">
                  {filteredAppointments.filter(a => ['booked', 'confirmed', 'scheduled'].includes(a.status)).slice(0, 2).map((appt) => (
                    <div key={appt._id} className="p-3 rounded-2xl bg-blue-50/50 border border-blue-100/50 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-black text-blue-800">{appt.startTime}</p>
                        <p className="text-[10px] text-slate-500 font-bold mt-0.5">Dr. {appt.doctorId?.fullName}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">{new Date(appt.appointmentDate).toLocaleDateString()}</p>
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">Booked</span>
                    </div>
                  ))}
                  {filteredAppointments.filter(a => ['booked', 'confirmed', 'scheduled'].includes(a.status)).length === 0 && (
                    <p className="text-[11px] text-slate-400 italic">No upcoming appointments scheduled.</p>
                  )}
                </div>
              </div>

              {/* Clinic Documents */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Shared Documents</h3>
                <div className="space-y-2">
                  {filteredDocuments.slice(0, 3).map((doc) => (
                    <div key={doc._id} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-slate-100">
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="text-base shrink-0">📄</span>
                        <p className="text-xs font-bold text-slate-800 truncate">{doc.file_name}</p>
                      </div>
                      <button
                        onClick={() => alert('Download document')}
                        className="text-[10px] font-bold text-blue-600 hover:underline shrink-0"
                      >
                        Get
                      </button>
                    </div>
                  ))}
                  {filteredDocuments.length === 0 && (
                    <p className="text-[11px] text-slate-400 italic">No shared documents.</p>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ── STATE: Book Lab Test (Choose Laboratory) ── */}
      {/* ============================================================ */}
      {activeTab === 'book-lab' && !selectedLabId && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h2 className="text-xl font-black text-slate-900">Book Lab Test</h2>
            <p className="text-xs text-slate-500 mt-0.5">Select a laboratory to view available tests and book.</p>
          </div>

          {/* Search Bar */}
          <div className="max-w-md relative">
            <input
              type="text"
              placeholder="Search laboratory..."
              value={labSearchQuery}
              onChange={(e) => setLabSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:border-blue-500 text-xs shadow-sm bg-white"
            />
            <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
          </div>

          {/* Lab Cards List */}
          {labList.filter(lab => lab.name.toLowerCase().includes(labSearchQuery.toLowerCase())).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {labList
                .filter(lab => lab.name.toLowerCase().includes(labSearchQuery.toLowerCase()))
                .map((lab) => (
                  <div key={lab._id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4 hover:shadow transition duration-200">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 text-xl">
                        🧪
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-black text-slate-900 truncate">{lab.name}</h3>
                        <p className="text-[10px] text-slate-400 mt-0.5">⭐ {lab.rating || '4.5'} reviews</p>
                      </div>
                    </div>

                    <div className="text-xs text-slate-500 space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-100 font-medium">
                      <p><span className="font-bold text-slate-700">Hours:</span> {lab.timings || '08:00 AM - 08:00 PM'}</p>
                      <p><span className="font-bold text-slate-700">Available Tests:</span> {lab.testsCount || '350+'}</p>
                    </div>

                    <button
                      onClick={() => {
                        const currentParams = new URLSearchParams(location.search);
                        currentParams.set('labId', lab._id);
                        currentParams.set('tab', 'lab-tests');
                        if (selectedClinicId) currentParams.set('clinicId', selectedClinicId);
                        setSearchParams(currentParams);
                      }}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-sm"
                    >
                      View Tests
                    </button>
                  </div>
                ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center">
              <p className="text-xs text-slate-400 italic">No laboratories registered under this clinic.</p>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* ── STATE: Lab Workspace - Tests List ── */}
      {/* ============================================================ */}
      {activeTab === 'lab-tests' && selectedLabId && (
        <div className="space-y-6 animate-fade-in">
          <button
            onClick={() => {
              const currentParams = new URLSearchParams(location.search);
              currentParams.delete('labId');
              currentParams.set('tab', 'book-lab');
              setSearchParams(currentParams);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-extrabold text-xs transition duration-150"
          >
            <ChevronLeft size={14} className="text-slate-405" />
            <span>Back to Laboratories</span>
          </button>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-150">
            <div>
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-1">Book Lab Test • {activeLab?.name}</span>
              <h2 className="text-xl font-black text-slate-900">{activeLab?.name}</h2>
              <p className="text-xs text-slate-500 mt-1">⭐ {activeLab?.rating} reviews • 🕒 Open • {activeLab?.timings}</p>
            </div>
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="w-full sm:max-w-xs relative">
              <input
                type="text"
                placeholder="Search tests..."
                value={labSearchQuery}
                onChange={(e) => setLabSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 text-xs shadow-sm bg-white"
              />
              <Search size={14} className="absolute left-3.5 top-3 text-slate-400" />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-600"
            >
              <option value="All">All Categories</option>
              <option value="Hematology">Hematology</option>
              <option value="Biochemistry">Biochemistry</option>
              <option value="Vitamins">Vitamins</option>
            </select>
          </div>

          {/* Lab Tests Grid */}
          {loadingMappings ? (
            <div className="flex justify-center items-center py-16">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : (
            (() => {
              const labTestMappings = workspaceMappings
                .filter(item => item.mappingType === 'LabTest' && item.status === 'Active')
                .map(item => ({
                  id: item._id,
                  name: item.providerName || item.globalLabTestId?.name || 'Lab Test',
                  price: Number(item.mrp) || Number(item.price) || 0,
                  sample: item.sampleType || '',
                  time: item.normalReportingTime || '',
                  category: item.methodology || item.globalLabTestId?.category || 'General'
                }))
                .filter(t => t.name.toLowerCase().includes(labSearchQuery.toLowerCase()))
                .filter(t => categoryFilter === 'All' || t.category === categoryFilter);

              if (labTestMappings.length === 0) {
                return (
                  <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center col-span-full">
                    <div className="text-4xl mb-3">🧪</div>
                    <p className="text-sm font-bold text-slate-600">No lab tests have been listed by laboratory.</p>
                    <p className="text-xs text-slate-400 mt-1">The laboratory store has not listed any tests yet.</p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {labTestMappings.map((test) => (
                    <div key={test.id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col justify-between space-y-4 hover:shadow transition duration-200">
                      <div>
                        <span className="text-[9px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md uppercase tracking-wider">{test.category}</span>
                        <h4 className="text-xs font-black text-slate-800 mt-2.5">{test.name}</h4>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {[test.sample && `🧪 ${test.sample}`, test.time && `🕒 ${test.time}`].filter(Boolean).join(' • ')}
                        </p>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                        <p className="text-sm font-black text-slate-800">
                          {test.price > 0 ? `₹${test.price}` : 'Price on request'}
                        </p>
                        <button
                          onClick={() => toast.success('Lab test booking request sent successfully!')}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-[10px] transition"
                        >
                          Book Test
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* ── STATE: Lab Workspace - Packages, Bookings, Reports ── */}
      {/* ============================================================ */}
      {['lab-packages', 'lab-bookings', 'lab-reports'].includes(activeTab) && selectedLabId && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-150">
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-1">{activeTab.replace('lab-', '').toUpperCase()} • {activeLab?.name}</span>
            <h2 className="text-xl font-black text-slate-900">{activeLab?.name}</h2>
          </div>
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center">
            <p className="text-xs text-slate-450 italic">No items listed in {activeTab.replace('lab-', '')} at this moment.</p>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ── STATE: Buy Medicine (Choose Pharmacy Store) ── */}
      {/* ============================================================ */}
      {activeTab === 'buy-medicine' && !selectedPharmacyId && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h2 className="text-xl font-black text-slate-900">Buy Medicine</h2>
            <p className="text-xs text-slate-500 mt-0.5">Select a pharmacy store to search medicines and place order.</p>
          </div>

          {/* Search Bar */}
          <div className="max-w-md relative">
            <input
              type="text"
              placeholder="Search pharmacy..."
              value={pharmacySearchQuery}
              onChange={(e) => setPharmacySearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:border-blue-500 text-xs shadow-sm bg-white"
            />
            <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
          </div>

          {/* Pharmacy Cards List */}
          {pharmacyList.filter(ph => ph.name.toLowerCase().includes(pharmacySearchQuery.toLowerCase())).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pharmacyList
                .filter(ph => ph.name.toLowerCase().includes(pharmacySearchQuery.toLowerCase()))
                .map((ph) => (
                  <div key={ph._id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4 hover:shadow transition duration-200">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-655 shrink-0 text-xl">
                        💊
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-black text-slate-900 truncate">{ph.name}</h3>
                        <p className="text-[10px] text-slate-400 mt-0.5">⭐ {ph.rating || '4.5'} reviews</p>
                      </div>
                    </div>

                    <div className="text-xs text-slate-500 space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-100 font-medium">
                      <p><span className="font-bold text-slate-700">Hours:</span> {ph.timings || '09:00 AM - 09:00 PM'}</p>
                      <p><span className="font-bold text-slate-700">Type:</span> {ph.categories || 'Medicines & Wellness'}</p>
                    </div>

                    <button
                      onClick={() => {
                        const currentParams = new URLSearchParams(location.search);
                        currentParams.set('pharmacyId', ph._id);
                        currentParams.set('tab', 'pharmacy-medicines');
                        if (selectedClinicId) currentParams.set('clinicId', selectedClinicId);
                        setSearchParams(currentParams);
                      }}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-sm"
                    >
                      Visit Store
                    </button>
                  </div>
                ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center">
              <p className="text-xs text-slate-400 italic">No pharmacies registered under this clinic.</p>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* ── STATE: Pharmacy Workspace - Medicines Grid ── */}
      {/* ============================================================ */}
      {activeTab === 'pharmacy-medicines' && selectedPharmacyId && (
        <div className="space-y-6 animate-fade-in pb-16 relative">
          <button
            onClick={() => {
              const currentParams = new URLSearchParams(location.search);
              currentParams.delete('pharmacyId');
              currentParams.set('tab', 'buy-medicine');
              setSearchParams(currentParams);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-extrabold text-xs transition duration-150"
          >
            <ChevronLeft size={14} className="text-slate-405" />
            <span>Back to Pharmacies</span>
          </button>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-150">
            <div>
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-1">Pharmacy Store • {activePharmacy?.name}</span>
              <h2 className="text-xl font-black text-slate-900">{activePharmacy?.name}</h2>
              <p className="text-xs text-slate-500 mt-1">⭐ {activePharmacy?.rating} reviews • 🕒 Open • {activePharmacy?.timings}</p>
            </div>
          </div>

          {/* Search & Categories */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="w-full sm:max-w-xs relative">
              <input
                type="text"
                placeholder="Search medicines..."
                value={pharmacySearchQuery}
                onChange={(e) => setPharmacySearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 text-xs shadow-sm bg-white"
              />
              <Search size={14} className="absolute left-3.5 top-3 text-slate-400" />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-600"
            >
              <option value="All">All Categories</option>
              <option value="Tablet">Tablets</option>
              <option value="Capsule">Capsules</option>
              <option value="OTC">OTC Medicines</option>
            </select>
          </div>

          {/* Medicines List Grid */}
          {loadingMappings ? (
            <div className="flex justify-center items-center py-16">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : (
            (() => {
              const medicineMappings = workspaceMappings
                .filter(item => item.mappingType === 'Medicine' && item.status === 'Active')
                .map(item => ({
                  id: item._id,
                  name: item.providerName || 'Medicine',
                  genericName: item.genericName || '',
                  price: Number(item.mrp) || Number(item.price) || 0,
                  strength: item.strength || '',
                  packSize: Number(item.packSize) || 10,
                  mfg: item.manufacturer || '',
                  dosageForm: item.dosageForm || 'Tablet',
                  category: item.category || 'General',
                  totalStock: Number(item.totalStock) || 0,
                  requiresPrescription: item.requiresPrescription || false
                }))
                .filter(m => m.name.toLowerCase().includes(pharmacySearchQuery.toLowerCase()))
                .filter(m => categoryFilter === 'All' || m.category === categoryFilter);

              if (medicineMappings.length === 0) {
                return (
                  <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center col-span-full">
                    <div className="text-4xl mb-3">💊</div>
                    <p className="text-sm font-bold text-slate-600">No medicines have been listed by pharmacy store.</p>
                    <p className="text-xs text-slate-400 mt-1">The pharmacy store has not listed any medicines yet.</p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {medicineMappings.map((med) => {
                    const cartItem = cart.find(item => item.id === med.id);
                    const isInCart = !!cartItem;
                    const tabletsQty = cartItem?.tablets || 0;
                    const stripsQty = cartItem?.strips || 0;
                    const totalUnitsInCart = (stripsQty * med.packSize) + tabletsQty;

                    // Stock text
                    let stockText = '';
                    let stockClass = '';
                    if (med.totalStock <= 0) {
                      stockText = 'Out of Stock';
                      stockClass = 'text-rose-600 font-bold bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md text-[9px]';
                    } else if (med.totalStock < 15) {
                      stockText = `Only ${med.totalStock} left`;
                      stockClass = 'text-amber-600 font-bold bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md text-[9px]';
                    } else {
                      stockText = `In Stock (${med.totalStock} units)`;
                      stockClass = 'text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md text-[9px]';
                    }

                    const handleAddToCart = () => {
                      if (med.totalStock <= 0) {
                        toast.error('This medicine is out of stock!');
                        return;
                      }
                      if (med.packSize > med.totalStock) {
                        updateCart([...cart, { ...med, tablets: 1, strips: 0, id: med.id }]);
                        toast.success(`${med.name} (1 Tablet) added to cart!`);
                      } else {
                        updateCart([...cart, { ...med, tablets: 0, strips: 1, id: med.id }]);
                        toast.success(`${med.name} (1 Strip of ${med.packSize}) added to cart!`);
                      }
                    };

                    const updateQty = (tabletsOffset, stripsOffset) => {
                      const nextTablets = Math.max(0, tabletsQty + tabletsOffset);
                      const nextStrips = Math.max(0, stripsQty + stripsOffset);
                      const totalUnitsNew = (nextStrips * med.packSize) + nextTablets;

                      if (totalUnitsNew > med.totalStock) {
                        toast.error(`Cannot add more. Exceeds available stock of ${med.totalStock} units.`);
                        return;
                      }

                      if (totalUnitsNew === 0) {
                        updateCart(cart.filter(item => item.id !== med.id));
                        toast.success(`${med.name} removed from cart.`);
                      } else {
                        updateCart(cart.map(item => item.id === med.id ? { ...item, tablets: nextTablets, strips: nextStrips } : item));
                      }
                    };

                    return (
                      <div key={med.id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col justify-between space-y-4 hover:shadow transition duration-200">
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-1.5 items-center">
                            <span className="text-[9px] font-bold bg-teal-50 text-teal-700 px-2 py-0.5 rounded-md uppercase tracking-wider">{med.category}</span>
                            {med.requiresPrescription && (
                              <span className="text-[9px] font-bold bg-rose-50 text-rose-700 px-2 py-0.5 rounded-md uppercase tracking-wider border border-rose-100">Rx Required</span>
                            )}
                          </div>
                          
                          <h4 className="text-xs font-black text-slate-800 leading-snug">{med.name}</h4>
                          <p className="text-[10px] text-slate-400 font-bold italic mt-0.5 truncate">{med.genericName}</p>
                          
                          <div className="text-[10px] text-slate-500 space-y-0.5 pt-1">
                            <p><span className="font-bold text-slate-400">Mfg:</span> {med.mfg || 'N/A'}</p>
                            <p><span className="font-bold text-slate-400">Form:</span> {med.dosageForm} • <span className="font-bold text-slate-400">Strength:</span> {med.strength}</p>
                          </div>
                          
                          <p className="text-[9px] text-slate-400 font-bold bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1 mt-2 inline-block">1 Strip = {med.packSize} Tablets</p>

                          <div className="mt-3 flex items-center justify-between">
                            <span className={stockClass}>{stockText}</span>
                            {isInCart && (
                              <span className="text-teal-600 font-black text-[10px] flex items-center gap-1">✔ In Cart</span>
                            )}
                          </div>
                        </div>

                        <div className="border-t border-slate-100 pt-3">
                          <div className="flex items-center justify-between text-xs">
                            <div>
                              <p className="text-[9px] text-slate-400 font-bold">UNIT PRICE</p>
                              <p className="text-sm font-black text-slate-800 mt-0.5">₹{med.price.toFixed(2)}</p>
                            </div>
                            
                            {!isInCart ? (
                              <button
                                onClick={handleAddToCart}
                                disabled={med.totalStock <= 0}
                                className={`px-4 py-2 font-bold rounded-xl text-xs transition shadow-sm ${
                                  med.totalStock <= 0 
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
                                    : 'bg-teal-600 hover:bg-teal-700 text-white'
                                }`}
                              >
                                Add to Cart
                              </button>
                            ) : null}
                          </div>

                          {isInCart && (
                            <div className="flex flex-col gap-2 w-full mt-3 bg-slate-50 border border-slate-200/60 p-3 rounded-2xl animate-fade-in">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-slate-500">Tablets</span>
                                <div className="flex items-center gap-2">
                                  <button onClick={() => updateQty(-1, 0)} className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-100">-</button>
                                  <span className="font-black text-slate-800 min-w-4 text-center text-xs">{tabletsQty}</span>
                                  <button onClick={() => updateQty(1, 0)} className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-100">+</button>
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-xs border-t border-slate-200/50 pt-2">
                                <span className="font-bold text-slate-500">Strips</span>
                                <div className="flex items-center gap-2">
                                  <button onClick={() => updateQty(0, -1)} className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-100">-</button>
                                  <span className="font-black text-slate-800 min-w-4 text-center text-xs">{stripsQty}</span>
                                  <button onClick={() => updateQty(0, 1)} className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-100">+</button>
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-[10px] font-black border-t border-slate-200/50 pt-2 text-teal-700">
                                <span>Subtotal</span>
                                <span>₹{(totalUnitsInCart * med.price).toFixed(2)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()
          )}

          {/* Floating Cart Widget */}
          {cart.length > 0 && (() => {
            const uniqueMedicinesCount = cart.length;
            const totalTabletsInCart = cart.reduce((sum, item) => sum + (item.tablets || 0), 0);
            const totalStripsInCart = cart.reduce((sum, item) => sum + (item.strips || 0), 0);
            const estimatedAmount = cart.reduce((sum, item) => {
              const units = ((item.strips || 0) * (item.packSize || 10)) + (item.tablets || 0);
              return sum + (units * (item.price || 0));
            }, 0);

            return (
              <div className="fixed bottom-6 left-[300px] right-6 md:left-[320px] bg-teal-600 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center justify-between gap-4 animate-slide-up z-30">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🛒</span>
                  <div>
                    <p className="text-xs font-black">My Cart</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-teal-100 font-bold mt-0.5">
                      <span>Medicines: {uniqueMedicinesCount}</span>
                      {totalTabletsInCart > 0 && <span>Tablets: {totalTabletsInCart}</span>}
                      {totalStripsInCart > 0 && <span>Strips: {totalStripsInCart}</span>}
                      <span className="text-white bg-teal-700/50 px-2 py-0.5 rounded-md">Estimated: ₹{estimatedAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const currentParams = new URLSearchParams(location.search);
                    currentParams.set('tab', 'pharmacy-cart');
                    setSearchParams(currentParams);
                  }}
                  className="px-4 py-2 bg-white text-teal-750 hover:bg-slate-50 font-black rounded-xl text-xs transition shadow-md shrink-0"
                >
                  View Cart
                </button>
              </div>
            );
          })()}
        </div>
      )}

      {activeTab === 'pharmacy-cart' && selectedPharmacyId && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h2 className="text-xl font-black text-slate-900">Your Cart</h2>
            <p className="text-xs text-slate-500 mt-0.5">Review items, select delivery preference, and place order from {activePharmacy?.name || 'Pharmacy Store'}.</p>
          </div>

          {cart.length > 0 ? (() => {
            const hasHomeDelivery = activePharmacy?.services?.homeDelivery;
            const hasPickup = activePharmacy?.services?.pickupAvailable;
            
            // Subtotal calculation
            const subtotal = cart.reduce((sum, item) => {
              const units = ((item.strips || 0) * (item.packSize || 10)) + (item.tablets || 0);
              return sum + (units * (item.price || 0));
            }, 0);
            
            // Coupon discount calculation
            let discountAmt = 0;
            if (appliedCoupon) {
              if (appliedCoupon.type === 'percentage') {
                discountAmt = subtotal * (appliedCoupon.value / 100);
              } else if (appliedCoupon.type === 'flat') {
                discountAmt = Math.min(subtotal, appliedCoupon.value);
              }
            }

            const deliveryFee = deliveryMethod === 'Home Delivery' ? 50 : 0;
            const taxes = (subtotal - discountAmt) * 0.05; // 5% GST
            const totalPayable = subtotal - discountAmt + deliveryFee + taxes;

            // Check if any cart item requires prescription
            const rxRequired = cart.some(item => item.requiresPrescription);

            const handleCheckout = async () => {
              if (!deliveryMethod) {
                toast.error('Please choose a delivery method.');
                return;
              }
              if (deliveryMethod === 'Home Delivery' && !selectedAddressId) {
                toast.error('Please select a delivery address or add a new one.');
                return;
              }
              if (rxRequired) {
                if (prescriptionType === 'system' && !selectedPrescriptionId) {
                  toast.error('Please select an EMR prescription.');
                  return;
                }
                if (prescriptionType === 'manual' && !manualPrescriptionFile) {
                  toast.error('Please enter details or upload a manual prescription.');
                  return;
                }
              }

              setCheckingOut(true);
              try {
                // Loop through items in cart to create separate pharmacy orders
                const promises = cart.map((item) => {
                  const qty = ((item.strips || 0) * (item.packSize || 10)) + (item.tablets || 0);
                  
                  const chosenAddrObj = deliveryMethod === 'Home Delivery' 
                    ? (profile?.savedAddresses || []).find(a => String(a._id) === String(selectedAddressId))
                    : null;
                  
                  return providersApi.createPharmacyOrder({
                    medicineId: item.id,
                    quantity: qty,
                    prescriptionType,
                    prescriptionId: (prescriptionType === 'system' && selectedPrescriptionId) ? selectedPrescriptionId : null,
                    prescriptionFile: prescriptionType === 'manual' ? manualPrescriptionFile : '',
                    clinicId: selectedClinicId,
                    deliveryMethod,
                    deliveryAddress: chosenAddrObj,
                    pickupLocation: activePharmacy?.name || '',
                    pickupAddress: activePharmacy?.address ? `${activePharmacy.address.line1}, ${activePharmacy.address.city}, ${activePharmacy.address.state}` : '',
                    preparationTime: '30-45 minutes'
                  });
                });

                await Promise.all(promises);
                toast.success('Your pharmacy order has been placed successfully!');
                updateCart([]); // Clear cart
                
                // Reset state
                setSelectedAddressId('');
                setSelectedPrescriptionId('');
                setManualPrescriptionFile('');

                // Navigate to orders
                const currentParams = new URLSearchParams(location.search);
                currentParams.set('tab', 'pharmacy-orders-workspace');
                setSearchParams(currentParams);
              } catch (err) {
                console.error(err);
                toast.error(err.response?.data?.message || 'Failed to place order. Check stock availability.');
              } finally {
                setCheckingOut(false);
              }
            };

            const handleAddAddress = async (e) => {
              e.preventDefault();
              setSavingAddress(true);
              try {
                const updatedAddresses = [...(profile?.savedAddresses || []), { ...newAddressForm, _id: new Date().getTime().toString() }];
                const res = await patientApi.updateMe({ savedAddresses: updatedAddresses });
                const updated = res.data?.patient || res.patient;
                if (updated) {
                  setProfile(updated);
                  toast.success('Address saved successfully!');
                  setShowNewAddressForm(false);
                  setNewAddressForm({
                    fullName: '', mobileNumber: '', alternateNumber: '',
                    houseFlatNumber: '', buildingName: '', street: '', landmark: '', area: '',
                    city: '', state: '', pinCode: '', addressType: 'Home', isDefault: false
                  });
                }
              } catch (err) {
                toast.error('Failed to save address.');
              } finally {
                setSavingAddress(false);
              }
            };

            return (
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
                
                {/* Left Side: Items & Checkout details */}
                <div className="space-y-6">
                  
                  {/* Cart Items List */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                    <h3 className="text-xs font-black text-slate-450 uppercase tracking-widest">Cart Items</h3>
                    <div className="space-y-4">
                      {cart.map((item) => {
                        const totalUnits = ((item.strips || 0) * (item.packSize || 10)) + (item.tablets || 0);
                        const itemSubtotal = totalUnits * item.price;
                        
                        const handleItemQtyUpdate = (tabletsOffset, stripsOffset) => {
                          const nextTablets = Math.max(0, (item.tablets || 0) + tabletsOffset);
                          const nextStrips = Math.max(0, (item.strips || 0) + stripsOffset);
                          const totalUnitsNew = (nextStrips * item.packSize) + nextTablets;

                          if (totalUnitsNew > item.totalStock) {
                            toast.error(`Cannot add more. Exceeds available stock of ${item.totalStock} units.`);
                            return;
                          }

                          if (totalUnitsNew === 0) {
                            updateCart(cart.filter(c => c.id !== item.id));
                            toast.success(`${item.name} removed from cart.`);
                          } else {
                            updateCart(cart.map(c => c.id === item.id ? { ...c, tablets: nextTablets, strips: nextStrips } : c));
                          }
                        };

                        return (
                          <div key={item.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 border-b border-slate-100 last:border-0 gap-4">
                            <div className="space-y-1">
                              <h4 className="text-xs font-black text-slate-800">{item.name}</h4>
                              <p className="text-[10px] text-slate-400 font-bold">{item.manufacturer} • MRP: ₹{item.price.toFixed(2)}/Unit</p>
                              {item.requiresPrescription && (
                                <span className="inline-block text-[8px] font-bold bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded border border-rose-100 uppercase tracking-wider">Rx Required</span>
                              )}
                            </div>
                            
                            {/* Quantity selection controls */}
                            <div className="flex items-center gap-4 text-xs">
                              <div className="flex items-center gap-3 bg-slate-50 border border-slate-150 p-2 rounded-2xl">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-bold text-slate-450">Tabs:</span>
                                  <button onClick={() => handleItemQtyUpdate(-1, 0)} className="w-5 h-5 flex items-center justify-center bg-white border border-slate-200 rounded font-bold text-slate-600 hover:bg-slate-100">-</button>
                                  <span className="font-extrabold text-slate-800 min-w-3 text-center">{item.tablets || 0}</span>
                                  <button onClick={() => handleItemQtyUpdate(1, 0)} className="w-5 h-5 flex items-center justify-center bg-white border border-slate-200 rounded font-bold text-slate-600 hover:bg-slate-100">+</button>
                                </div>
                                <div className="w-px h-4 bg-slate-200" />
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-bold text-slate-450">Strips:</span>
                                  <button onClick={() => handleItemQtyUpdate(0, -1)} className="w-5 h-5 flex items-center justify-center bg-white border border-slate-200 rounded font-bold text-slate-600 hover:bg-slate-100">-</button>
                                  <span className="font-extrabold text-slate-800 min-w-3 text-center">{item.strips || 0}</span>
                                  <button onClick={() => handleItemQtyUpdate(0, 1)} className="w-5 h-5 flex items-center justify-center bg-white border border-slate-200 rounded font-bold text-slate-600 hover:bg-slate-100">+</button>
                                </div>
                              </div>

                              <div className="text-right min-w-[70px]">
                                <p className="text-[9px] text-slate-400 font-bold">SUBTOTAL</p>
                                <p className="text-xs font-black text-slate-800 mt-0.5">₹{itemSubtotal.toFixed(2)}</p>
                              </div>

                              <button
                                onClick={() => {
                                  updateCart(cart.filter(c => c.id !== item.id));
                                  toast.success(`${item.name} removed from cart.`);
                                }}
                                className="text-rose-500 hover:text-rose-600 font-bold text-[10px]"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Prescription Upload Area (if any medicine requires it) */}
                  {rxRequired && (
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="text-rose-600 text-lg">📄</span>
                        <h3 className="text-xs font-black text-slate-850 uppercase tracking-widest">Prescription Required</h3>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-normal">One or more medicines in your cart require a valid medical prescription to be dispensed. Please select an option below:</p>
                      
                      <div className="flex gap-4 border-b border-slate-100 pb-3">
                        <button
                          onClick={() => setPrescriptionType('system')}
                          className={`px-3.5 py-1.5 rounded-xl font-bold text-[10px] border transition ${
                            prescriptionType === 'system' 
                              ? 'bg-teal-50 border-teal-200 text-teal-700' 
                              : 'bg-white border-slate-200 text-slate-600'
                          }`}
                        >
                          Select from EMR Profile
                        </button>
                        <button
                          onClick={() => setPrescriptionType('manual')}
                          className={`px-3.5 py-1.5 rounded-xl font-bold text-[10px] border transition ${
                            prescriptionType === 'manual' 
                              ? 'bg-teal-50 border-teal-200 text-teal-700' 
                              : 'bg-white border-slate-200 text-slate-600'
                          }`}
                        >
                          Manual Prescription Details
                        </button>
                      </div>

                      {prescriptionType === 'system' ? (
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Choose prescription</label>
                          {prescriptions.length > 0 ? (
                            <select
                              value={selectedPrescriptionId}
                              onChange={(e) => setSelectedPrescriptionId(e.target.value)}
                              className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700"
                            >
                              <option value="">-- Choose EMR Prescription --</option>
                              {prescriptions.map(rx => (
                                <option key={rx._id} value={rx._id}>
                                  {rx.finalizedAt ? new Date(rx.finalizedAt).toLocaleDateString() : 'N/A'} - Dr. {rx.doctorId?.fullName || 'Physician'}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic">No prescriptions found in your medical history.</p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Attachment details / note</label>
                          <input
                            type="text"
                            placeholder="Enter notes (e.g. prescription dated 22/07/2026 by Dr. Garg)"
                            value={manualPrescriptionFile}
                            onChange={(e) => setManualPrescriptionFile(e.target.value)}
                            className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-750"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Delivery Preference */}
                  {(!hasHomeDelivery && !hasPickup) ? (
                    <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 text-center text-rose-800">
                      <p className="text-xs font-black">This pharmacy is currently not accepting online medicine orders.</p>
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                      <h3 className="text-xs font-black text-slate-450 uppercase tracking-widest">Delivery Method</h3>
                      
                      {/* Scenario 1: Both enabled */}
                      {hasHomeDelivery && hasPickup && (
                        <div className="flex gap-6 text-xs font-bold text-slate-700">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="radio" 
                              name="delivery_pref"
                              checked={deliveryMethod === 'Home Delivery'} 
                              onChange={() => setDeliveryMethod('Home Delivery')}
                              className="text-teal-600 focus:ring-teal-500"
                            />
                            <span>Home Delivery</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="radio" 
                              name="delivery_pref"
                              checked={deliveryMethod === 'Pickup'} 
                              onChange={() => setDeliveryMethod('Pickup')}
                              className="text-teal-600 focus:ring-teal-500"
                            />
                            <span>Self Pickup</span>
                          </label>
                        </div>
                      )}

                      {/* Home Delivery Section */}
                      {deliveryMethod === 'Home Delivery' && (
                        <div className="space-y-4 pt-2">
                          <div className="flex justify-between items-center">
                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Select Delivery Address</h4>
                            <button
                              onClick={() => setShowNewAddressForm(!showNewAddressForm)}
                              className="text-[10px] font-black text-blue-600 hover:underline"
                            >
                              {showNewAddressForm ? 'Select Existing' : '+ Add New Address'}
                            </button>
                          </div>

                          {!showNewAddressForm ? (
                            <div className="space-y-3">
                              {(profile?.savedAddresses || []).length > 0 ? (
                                (profile.savedAddresses).map((addr) => (
                                  <label key={addr._id} className={`flex items-start gap-3 p-3.5 border rounded-2xl cursor-pointer transition ${
                                    String(selectedAddressId) === String(addr._id) 
                                      ? 'bg-teal-50/50 border-teal-500' 
                                      : 'bg-slate-50/50 border-slate-200 hover:bg-slate-50'
                                  }`}>
                                    <input 
                                      type="radio" 
                                      name="selected_addr"
                                      checked={String(selectedAddressId) === String(addr._id)}
                                      onChange={() => setSelectedAddressId(addr._id)}
                                      className="text-teal-600 focus:ring-teal-500 mt-1 shrink-0"
                                    />
                                    <div className="min-w-0 text-xs">
                                      <div className="flex items-center gap-2">
                                        <span className="font-extrabold text-slate-800">{addr.fullName}</span>
                                        <span className="text-[8px] font-extrabold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded uppercase">{addr.addressType}</span>
                                      </div>
                                      <p className="text-[10px] text-slate-500 mt-1">Mobile: {addr.mobileNumber} {addr.alternateNumber && `• Alt: ${addr.alternateNumber}`}</p>
                                      <p className="text-[10px] text-slate-500 mt-0.5">
                                        {[addr.houseFlatNumber, addr.buildingName, addr.street, addr.landmark, addr.area, addr.city, addr.state, addr.pinCode].filter(Boolean).join(', ')}
                                      </p>
                                    </div>
                                  </label>
                                ))
                              ) : (
                                <p className="text-xs text-slate-450 italic">No saved addresses found. Please add a new one below.</p>
                              )}
                            </div>
                          ) : (
                            <form onSubmit={handleAddAddress} className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-200/60 text-xs text-slate-700 grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="font-bold text-slate-650">Full Name *</label>
                                <input required type="text" value={newAddressForm.fullName} onChange={(e) => setNewAddressForm({...newAddressForm, fullName: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-1.5" />
                              </div>
                              <div className="space-y-1">
                                <label className="font-bold text-slate-650">Mobile Number *</label>
                                <input required type="text" value={newAddressForm.mobileNumber} onChange={(e) => setNewAddressForm({...newAddressForm, mobileNumber: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-1.5" />
                              </div>
                              <div className="space-y-1">
                                <label className="font-bold text-slate-650">Alternate Number</label>
                                <input type="text" value={newAddressForm.alternateNumber} onChange={(e) => setNewAddressForm({...newAddressForm, alternateNumber: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-1.5" />
                              </div>
                              <div className="space-y-1">
                                <label className="font-bold text-slate-650">House / Flat Number *</label>
                                <input required type="text" value={newAddressForm.houseFlatNumber} onChange={(e) => setNewAddressForm({...newAddressForm, houseFlatNumber: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-1.5" />
                              </div>
                              <div className="space-y-1">
                                <label className="font-bold text-slate-650">Building Name</label>
                                <input type="text" value={newAddressForm.buildingName} onChange={(e) => setNewAddressForm({...newAddressForm, buildingName: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-1.5" />
                              </div>
                              <div className="space-y-1">
                                <label className="font-bold text-slate-650">Street *</label>
                                <input required type="text" value={newAddressForm.street} onChange={(e) => setNewAddressForm({...newAddressForm, street: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-1.5" />
                              </div>
                              <div className="space-y-1">
                                <label className="font-bold text-slate-650">Landmark</label>
                                <input type="text" value={newAddressForm.landmark} onChange={(e) => setNewAddressForm({...newAddressForm, landmark: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-1.5" />
                              </div>
                              <div className="space-y-1">
                                <label className="font-bold text-slate-650">Area *</label>
                                <input required type="text" value={newAddressForm.area} onChange={(e) => setNewAddressForm({...newAddressForm, area: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-1.5" />
                              </div>
                              <div className="space-y-1">
                                <label className="font-bold text-slate-650">City *</label>
                                <input required type="text" value={newAddressForm.city} onChange={(e) => setNewAddressForm({...newAddressForm, city: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-1.5" />
                              </div>
                              <div className="space-y-1">
                                <label className="font-bold text-slate-650">State *</label>
                                <input required type="text" value={newAddressForm.state} onChange={(e) => setNewAddressForm({...newAddressForm, state: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-1.5" />
                              </div>
                              <div className="space-y-1">
                                <label className="font-bold text-slate-650">PIN Code *</label>
                                <input required type="text" value={newAddressForm.pinCode} onChange={(e) => setNewAddressForm({...newAddressForm, pinCode: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-1.5" />
                              </div>
                              <div className="space-y-1">
                                <label className="font-bold text-slate-650">Address Type *</label>
                                <div className="flex gap-4 py-2">
                                  {['Home', 'Work', 'Other'].map(type => (
                                    <label key={type} className="flex items-center gap-1 cursor-pointer">
                                      <input type="radio" name="address_type" checked={newAddressForm.addressType === type} onChange={() => setNewAddressForm({...newAddressForm, addressType: type})} />
                                      <span>{type}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                              
                              <div className="col-span-full pt-2">
                                <button
                                  type="submit"
                                  disabled={savingAddress}
                                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition disabled:opacity-50"
                                >
                                  {savingAddress ? 'Saving Address...' : 'Save & Add Address'}
                                </button>
                              </div>
                            </form>
                          )}
                        </div>
                      )}

                      {/* Pickup Info Section */}
                      {deliveryMethod === 'Pickup' && (
                        <div className="pt-2 bg-slate-50 border border-slate-200/60 p-4 rounded-2xl text-xs text-slate-700 space-y-2">
                          <h4 className="font-black text-slate-800">Pickup Location Details</h4>
                          <p><span className="font-bold text-slate-500">Pharmacy Store:</span> {activePharmacy?.name}</p>
                          <p><span className="font-bold text-slate-500">Address:</span> {activePharmacy?.address ? `${activePharmacy.address.line1}, ${activePharmacy.address.city}, ${activePharmacy.address.state} ${activePharmacy.address.pincode}` : 'Registered Address'}</p>
                          <p><span className="font-bold text-slate-500">Working Hours:</span> {activePharmacy?.timings || '09:00 AM - 09:00 PM'}</p>
                          <p className="text-emerald-700 font-extrabold mt-1">🕒 Estimated Preparation Time: 30-45 minutes</p>
                        </div>
                      )}

                    </div>
                  )}

                </div>

                {/* Right Side: Order Summary */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-5 sticky top-6">
                  
                  {/* Coupon / Promo Code Panel */}
                  <div className="border-b border-slate-100 pb-4 space-y-3">
                    <h4 className="text-[10px] font-black text-slate-450 uppercase tracking-widest">Apply Promo Code</h4>
                    
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter coupon code"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        className="flex-1 text-xs border border-slate-205 rounded-xl px-3 py-1.5 focus:outline-none focus:border-teal-500 uppercase font-bold text-slate-800 bg-slate-50"
                      />
                      <button
                        onClick={() => {
                          const found = (availableCoupons || []).find(c => c.code === couponInput.trim().toUpperCase());
                          if (found) {
                            setAppliedCoupon(found);
                            toast.success(`Coupon "${found.code}" applied successfully!`);
                          } else {
                            toast.error('Invalid coupon code. This coupon is not recognized by the pharmacy.');
                          }
                        }}
                        className="px-3.5 py-1.5 bg-slate-800 text-white font-extrabold rounded-xl text-xs hover:bg-slate-900 transition"
                      >
                        Apply
                      </button>
                    </div>

                    {/* Applied Coupon Info */}
                    {appliedCoupon && (
                      <div className="flex items-center justify-between bg-emerald-50 border border-emerald-150 p-2.5 rounded-xl text-[10px] text-emerald-800 font-bold animate-fade-in">
                        <div className="flex items-center gap-1.5">
                          <span>🎉</span>
                          <div>
                            <p className="font-extrabold uppercase tracking-wider">{appliedCoupon.code} Applied</p>
                            <p className="text-[8px] text-emerald-600 font-medium">
                              {appliedCoupon.description || (appliedCoupon.type === 'percentage' ? `${appliedCoupon.value}% Off` : `₹${appliedCoupon.value} Off`)}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setAppliedCoupon(null);
                            setCouponInput('');
                            toast.success('Coupon removed.');
                          }}
                          className="text-rose-600 hover:text-rose-700 font-extrabold uppercase text-[9px] ml-2"
                        >
                          Remove
                        </button>
                      </div>
                    )}

                    {/* Popular Coupons badges */}
                    {(availableCoupons || []).some(c => c.displayOnCheckout) && (
                      <div className="space-y-1.5 pt-1">
                        <p className="text-[9px] text-slate-400 font-bold">Pharmacy Coupon Offers (Click to apply):</p>
                        <div className="flex flex-wrap gap-2 pt-0.5">
                          {availableCoupons.filter(c => c.displayOnCheckout).map(c => (
                            <button
                              key={c._id || c.code}
                              onClick={() => {
                                setAppliedCoupon(c);
                                setCouponInput(c.code);
                                toast.success(`Coupon "${c.code}" applied!`);
                              }}
                              className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 font-extrabold rounded-lg text-[9px] border border-teal-150 transition animate-fade-in"
                            >
                              {c.code} ({c.type === 'percentage' ? `${c.value}% Off` : `₹${c.value} Off`})
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100">Order Summary</h3>
                  
                  <div className="space-y-2.5 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span>Medicines Total</span>
                      <span className="font-bold text-slate-800">₹{subtotal.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Discount {appliedCoupon ? `(${appliedCoupon.code})` : ''}</span>
                      <span>-₹{discountAmt.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span>Delivery Fee</span>
                      <span>{deliveryFee > 0 ? `₹${deliveryFee.toFixed(2)}` : 'Free'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Taxes & GST (5%)</span>
                      <span>₹{taxes.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between border-t border-slate-100 pt-3 font-black text-sm text-slate-900">
                      <span>Grand Total</span>
                      <span className="text-teal-700 font-black">₹{totalPayable.toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={checkingOut || (!hasHomeDelivery && !hasPickup)}
                    className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-extrabold rounded-2xl text-xs transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {checkingOut ? 'Placing Order...' : 'Proceed to Checkout'}
                  </button>
                </div>

              </div>
            );
          })() : (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-3xl mx-auto">
                🛒
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-800">Your cart is empty</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-[280px] mx-auto">Browse medicines and add items to your cart to checkout.</p>
              </div>
              <button
                onClick={() => {
                  const currentParams = new URLSearchParams(location.search);
                  currentParams.set('tab', 'pharmacy-medicines');
                  setSearchParams(currentParams);
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-xs transition shadow-md"
              >
                Start Shopping
              </button>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* ── STATE: Pharmacy Workspace - Categories, Offers, Orders, Prescriptions ── */}
      {/* ============================================================ */}
      {['pharmacy-categories', 'pharmacy-offers', 'pharmacy-orders-workspace', 'pharmacy-prescriptions'].includes(activeTab) && selectedPharmacyId && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-150">
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-1">{activeTab.replace('pharmacy-', '').toUpperCase()} • {activePharmacy?.name}</span>
            <h2 className="text-xl font-black text-slate-900">{activePharmacy?.name}</h2>
          </div>
          
          {activeTab === 'pharmacy-orders-workspace' ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-slate-450 uppercase tracking-widest">Active Orders</h3>
              
              {loadingOrders ? (
                <div className="flex justify-center items-center py-12">
                  <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                </div>
              ) : pharmacyOrders.length > 0 ? (
                <div className="space-y-6">
                  {pharmacyOrders.map((ord) => {
                    const medicineName = ord.medicineId?.name || 'Medicine';
                    const formattedDate = ord.orderedAt ? new Date(ord.orderedAt).toLocaleString() : 'N/A';
                    
                    // Status styling
                    let statusLabel = 'Pending Confirmation';
                    let statusStyle = 'bg-amber-50 text-amber-700 border-amber-200';
                    if (ord.status === 'confirmed') {
                      statusLabel = 'Confirmed';
                      statusStyle = 'bg-blue-50 text-blue-700 border-blue-200';
                    } else if (ord.status === 'preparing') {
                      statusLabel = 'Preparing Order';
                      statusStyle = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                    } else if (ord.status === 'packed') {
                      statusLabel = 'Packed';
                      statusStyle = 'bg-cyan-50 text-cyan-700 border-cyan-200';
                    } else if (ord.status === 'ready_for_pickup') {
                      statusLabel = 'Ready for Pickup';
                      statusStyle = 'bg-purple-50 text-purple-700 border-purple-200';
                    } else if (ord.status === 'ready_for_delivery') {
                      statusLabel = 'Ready for Delivery';
                      statusStyle = 'bg-sky-50 text-sky-700 border-sky-200';
                    } else if (ord.status === 'out_for_delivery') {
                      statusLabel = 'Out for Delivery';
                      statusStyle = 'bg-purple-50 text-purple-700 border-purple-200';
                    } else if (ord.status === 'completed') {
                      statusLabel = ord.deliveryMethod === 'Pickup' ? 'Picked Up' : 'Delivered';
                      statusStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                    } else if (ord.status === 'cancelled') {
                      statusLabel = 'Cancelled';
                    } else if (ord.status === 'rejected') {
                      statusLabel = 'Rejected';
                      statusStyle = 'bg-rose-50 text-rose-700 border-rose-200';
                    }

                    const handleCancelOrder = () => {
                      if (window.confirm('Are you sure you want to cancel this order?')) {
                        providersApi.updatePharmacyOrderStatus(ord._id, 'cancelled')
                          .then(() => {
                            toast.success('Order cancelled successfully.');
                            fetchPharmacyOrders();
                          })
                          .catch(() => toast.error('Failed to cancel order.'));
                      }
                    };

                    return (
                      <div key={ord._id} className="border border-slate-150 p-5 rounded-2xl bg-slate-50/30 flex flex-col space-y-4 hover:border-slate-200 transition">
                        <div className="flex flex-wrap justify-between items-start gap-4">
                          <div>
                            <span className="text-[10px] font-black text-slate-400">ORDER ID: {ord._id}</span>
                            <h4 className="text-xs font-black text-slate-800 mt-1">{medicineName}</h4>
                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">Quantity: {ord.quantity} units • Ordered: {formattedDate}</p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-bold border px-2.5 py-0.5 rounded-lg uppercase tracking-wider ${statusStyle}`}>{statusLabel}</span>
                            {['pending', 'confirmed'].includes(ord.status) && (
                              <button
                                onClick={handleCancelOrder}
                                className="px-2.5 py-1 text-[9px] font-extrabold text-rose-600 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 transition"
                              >
                                Cancel Order
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Additional Pickup / Delivery details */}
                        <div className="text-[10px] text-slate-500 border-t border-slate-150/50 pt-3 space-y-1.5 font-medium">
                          <p><span className="font-bold text-slate-400">Method:</span> {ord.deliveryMethod || 'Pickup'}</p>
                          
                          {ord.deliveryMethod === 'Home Delivery' && ord.deliveryAddress && (
                            <p><span className="font-bold text-slate-400">Address:</span> {ord.deliveryAddress.fullName}, {ord.deliveryAddress.houseFlatNumber}, {ord.deliveryAddress.street}, {ord.deliveryAddress.city}</p>
                          )}
                          
                          {ord.deliveryMethod === 'Pickup' && (
                            <div className="bg-white border border-slate-200 p-3 rounded-xl mt-2 space-y-1 text-slate-650">
                              <p className="font-bold text-slate-700">Pickup Instructions:</p>
                              <p>Present the Order ID or the QR Code below to the pharmacist upon arrival.</p>
                              {ord.pickupSlot ? (
                                <p className="text-blue-700 font-bold">🕒 Assigned Pickup Slot: {ord.pickupSlot}</p>
                              ) : (
                                <p className="text-slate-450 italic">Pharmacist will assign a pickup slot shortly.</p>
                              )}
                              
                              {/* QR Code Graphic / Representation */}
                              <div className="flex items-center gap-3 pt-2">
                                <div className="w-12 h-12 bg-slate-50 border border-slate-200 p-1 rounded-lg shrink-0 flex items-center justify-center font-bold text-xs select-none">
                                  <svg className="w-full h-full text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M3 3h6v6H3V3zm12 0h6v6h-6V3zM3 15h6v6H3v-6zm14 0h2v2h-2v-2zm2 2h2v2h-2v-2zm-2 2h2v2h-2v-2zm-2-2h2v2h-2v-2zm-2 2h2v2h-2v-2zm2-4h2v2h-2v-2zm-4 0h2v2H9v-2zm0 4h2v2H9v-2z" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="font-bold text-slate-700 text-[10px]">Pickup Code: <span className="font-black text-slate-900">{ord._id.slice(-6).toUpperCase()}</span></p>
                                  <p className="text-[9px] text-slate-400 font-bold">Ready for scan at counter</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {ord.status === 'rejected' && ord.rejectionReason && (
                            <p className="text-rose-600 bg-rose-50 border border-rose-100 p-2.5 rounded-lg mt-2 font-bold"><span className="font-black">Rejection Reason:</span> {ord.rejectionReason}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-xs text-slate-450 italic">No active orders placed under this pharmacy yet.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center">
              <p className="text-xs text-slate-450 italic">No items listed in {activeTab.replace('pharmacy-', '')} at this moment.</p>
            </div>
          )}
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
          handleOcrApply={() => { }}
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
