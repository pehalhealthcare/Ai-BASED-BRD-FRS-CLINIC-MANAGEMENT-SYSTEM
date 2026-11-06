import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Save, Camera, Globe, Facebook, Twitter, Instagram, Mail, Phone,
  Shield, UploadCloud, CreditCard, Pill, FlaskConical, Lock,
  Building2, CheckCircle2, AlertCircle, RefreshCw, Edit3, X, Check
} from 'lucide-react';
import { clinicApi } from '../../lib/api';
import BillingPolicySettings from './BillingPolicySettings';
import UsersAndRolesSection from './UsersAndRolesSection';
import NotificationsSettingsTab from './settings/NotificationsSettingsTab';
import IntegrationsSettingsTab from './settings/IntegrationsSettingsTab';
import SecuritySettingsTab from './settings/SecuritySettingsTab';
import BackupDataSettingsTab from './settings/BackupDataSettingsTab';
import ActivityLogsSettingsTab from './settings/ActivityLogsSettingsTab';
import useAuth from '../../hooks/useAuth';
import LoadingState from '../../components/common/LoadingState';
import PageHeader from '../../components/layout/PageHeader';

const TABS = [
  'Clinic Profile',
  'General Settings',
  'Users & Roles',
  'Notifications',
  'Billing & Payments',
  'Integrations',
  'Security',
  'Backup & Data',
  'Activity Logs'
];

const SettingsAdminPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('Clinic Profile');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [savingSection, setSavingSection] = useState(null);

  // File input refs
  const photoInputRef = useRef(null);
  const logoInputRef = useRef(null);

  // Raw clinic object from DB
  const [rawClinic, setRawClinic] = useState(null);

  // Section 1: Clinic Information
  const [clinicName, setClinicName] = useState('');
  const [clinicEmail, setClinicEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [alternateNumber, setAlternateNumber] = useState('');
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [clinicPhoto, setClinicPhoto] = useState('');

  // Section 2: Clinic Details
  const [clinicIdCode, setClinicIdCode] = useState('');
  const [regDate, setRegDate] = useState('');
  const [clinicType, setClinicType] = useState('');
  const [timeZone, setTimeZone] = useState('');
  const [currency, setCurrency] = useState('');
  const [workingDays, setWorkingDays] = useState('');
  const [workingHours, setWorkingHours] = useState('');
  const [showEditDetailsModal, setShowEditDetailsModal] = useState(false);
  const [editDetailsForm, setEditDetailsForm] = useState({
    clinicType: '',
    timeZone: '',
    currency: '',
    workingDays: '',
    workingHours: ''
  });

  // Section 3: Clinic Logo
  const [clinicLogo, setClinicLogo] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);

  // Section 4: About Clinic
  const [description, setDescription] = useState('');

  // Section 5: Social Links
  const [fbLink, setFbLink] = useState('');
  const [twLink, setTwLink] = useState('');
  const [igLink, setIgLink] = useState('');

  // Section 6: Contact & Communication
  const [senderId, setSenderId] = useState('');
  const [waNumber, setWaNumber] = useState('');
  const [enableApptConfirm, setEnableApptConfirm] = useState(false);
  const [enableEmailNotif, setEnableEmailNotif] = useState(false);
  const [enableSmsNotif, setEnableSmsNotif] = useState(false);

  // Section 7: Quick Preferences
  const [autoInvoice, setAutoInvoice] = useState(false);
  const [inventoryAlerts, setInventoryAlerts] = useState(false);
  const [labApproval, setLabApproval] = useState(false);
  const [dataEncryption, setDataEncryption] = useState(true);

  // General Settings tab state (preserved)
  const [allowRescheduleMissed, setAllowRescheduleMissed] = useState(true);
  const [maxRescheduleWindowDays, setMaxRescheduleWindowDays] = useState(7);
  const [maxAllowedReschedules, setMaxAllowedReschedules] = useState(2);
  const [autoMarkNoShow, setAutoMarkNoShow] = useState(true);
  const [noShowGracePeriod, setNoShowGracePeriod] = useState('Clinic Closing Time');
  const [refundPolicy, setRefundPolicy] = useState('no_refund');
  const [refundPercentage, setRefundPercentage] = useState(70);
  const [refundWalletAllowed, setRefundWalletAllowed] = useState(true);
  const [refundOriginalAllowed, setRefundOriginalAllowed] = useState(true);
  const [refundManualApprovalRequired, setRefundManualApprovalRequired] = useState(true);
  const [enablePatientReschedule, setEnablePatientReschedule] = useState(true);
  const [enableReceptionistReschedule, setEnableReceptionistReschedule] = useState(true);

  // Resolve authenticated clinic context
  const activeClinicId = useMemo(() => {
    return user?.clinicId?._id || user?.clinicId || user?.clinic?._id || localStorage.getItem('activeClinicId') || localStorage.getItem('selectedClinicId') || '';
  }, [user]);

  // Populate form with real database values
  const populateFromClinic = useCallback((clinic, fetchedClinicEmail) => {
    setRawClinic(clinic);

    // Section 1: Clinic Information
    setClinicName(clinic.name || '');
    setClinicEmail(clinic.email || fetchedClinicEmail || clinic.ownerDetails?.email || '');
    setPhoneNumber(clinic.phone || clinic.ownerDetails?.phone || '');
    setAlternateNumber(clinic.alternatePhone || clinic.clinicDetails?.alternatePhone || '');
    setAddress(clinic.address?.line1 || '');
    setCity(clinic.address?.city || '');
    setState(clinic.address?.state || '');
    setPincode(clinic.address?.pincode || '');
    setWebsite(clinic.website || clinic.socialLinks?.website || '');
    setClinicPhoto(clinic.image || clinic.clinicDetails?.images?.[0] || '');

    // Section 2: Clinic Details
    const codeDisplay = clinic.code 
      ? (clinic.code.startsWith('CLN-') ? clinic.code : `CLN-${clinic.code}`) 
      : (clinic._id ? String(clinic._id).slice(-8).toUpperCase() : '');
    setClinicIdCode(codeDisplay);

    if (clinic.createdAt) {
      try {
        const d = new Date(clinic.createdAt);
        setRegDate(!isNaN(d.getTime()) ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
      } catch {
        setRegDate('');
      }
    } else {
      setRegDate('');
    }

    setClinicType(clinic.clinicType || clinic.clinicDetails?.clinicType || '');
    setTimeZone(clinic.timeZone || '');
    setCurrency(clinic.currency || '');
    setWorkingDays(clinic.workingDays || clinic.clinicDetails?.timings?.[0]?.dayRange || '');
    
    if (clinic.workingHours) {
      setWorkingHours(clinic.workingHours);
    } else if (clinic.clinicDetails?.timings?.[0]?.startTime && clinic.clinicDetails?.timings?.[0]?.endTime) {
      setWorkingHours(`${clinic.clinicDetails.timings[0].startTime} - ${clinic.clinicDetails.timings[0].endTime}`);
    } else {
      setWorkingHours('');
    }

    // Section 3: Logo
    setClinicLogo(clinic.clinicDetails?.logo || clinic.logo || '');

    // Section 4: About Clinic
    setDescription(clinic.clinicDetails?.shortDescription || clinic.clinicDetails?.description || clinic.description || '');

    // Section 5: Social Links
    setFbLink(clinic.socialLinks?.facebook || '');
    setTwLink(clinic.socialLinks?.twitter || '');
    setIgLink(clinic.socialLinks?.instagram || '');

    // Section 6: Contact & Communication
    setSenderId(clinic.communicationSettings?.senderId || '');
    setWaNumber(clinic.communicationSettings?.whatsappNumber || '');
    setEnableApptConfirm(Boolean(clinic.communicationSettings?.enableApptConfirm));
    setEnableEmailNotif(Boolean(clinic.communicationSettings?.enableEmailNotif));
    setEnableSmsNotif(Boolean(clinic.communicationSettings?.enableSmsNotif));

    // Section 7: Quick Preferences
    setAutoInvoice(Boolean(clinic.preferences?.autoInvoice));
    setInventoryAlerts(Boolean(clinic.preferences?.inventoryAlerts));
    setLabApproval(Boolean(clinic.preferences?.labApproval));
    setDataEncryption(clinic.preferences?.dataEncryption !== undefined ? Boolean(clinic.preferences.dataEncryption) : true);

    // General Settings tab
    const billing = clinic.billingSettings || {};
    if (billing.allowRescheduleMissed !== undefined) setAllowRescheduleMissed(billing.allowRescheduleMissed);
    if (billing.maxRescheduleWindowDays !== undefined) setMaxRescheduleWindowDays(billing.maxRescheduleWindowDays);
    if (billing.maxAllowedReschedules !== undefined) setMaxAllowedReschedules(billing.maxAllowedReschedules);
    if (billing.autoMarkNoShow !== undefined) setAutoMarkNoShow(billing.autoMarkNoShow);
    if (billing.noShowGracePeriod !== undefined) setNoShowGracePeriod(billing.noShowGracePeriod);
    if (billing.refundPolicy !== undefined) setRefundPolicy(billing.refundPolicy);
    if (billing.refundPercentage !== undefined) setRefundPercentage(billing.refundPercentage);
    if (billing.refundWalletAllowed !== undefined) setRefundWalletAllowed(billing.refundWalletAllowed);
    if (billing.refundOriginalAllowed !== undefined) setRefundOriginalAllowed(billing.refundOriginalAllowed);
    if (billing.refundManualApprovalRequired !== undefined) setRefundManualApprovalRequired(billing.refundManualApprovalRequired);
    if (billing.enablePatientReschedule !== undefined) setEnablePatientReschedule(billing.enablePatientReschedule);
    if (billing.enableReceptionistReschedule !== undefined) setEnableReceptionistReschedule(billing.enableReceptionistReschedule);
  }, []);

  // Fetch from database
  const fetchProfile = useCallback(async () => {
    if (!activeClinicId) {
      setLoading(false);
      setError('No clinic context associated with this session. Please select or join a clinic.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await clinicApi.getDetails(activeClinicId);
      const clinic = response.data?.clinic || response.clinic || {};
      populateFromClinic(clinic, response.data?.clinicEmail || response.clinicEmail);
    } catch (err) {
      console.error('Error fetching clinic details:', err);
      setError(err?.response?.data?.message || 'Failed to retrieve clinic profile from the database.');
    } finally {
      setLoading(false);
    }
  }, [activeClinicId, populateFromClinic]);

  useEffect(() => {
    fetchProfile();

    const handleClinicChange = () => {
      fetchProfile();
    };

    window.addEventListener('clinic:changed', handleClinicChange);
    window.addEventListener('patient:clinic-changed', handleClinicChange);

    return () => {
      window.removeEventListener('clinic:changed', handleClinicChange);
      window.removeEventListener('patient:clinic-changed', handleClinicChange);
    };
  }, [fetchProfile]);

  // Dynamic Profile Completion Calculation
  const { completionPercent, missingFields, isProfileIncomplete } = useMemo(() => {
    const REQUIRED_FIELDS = [
      { key: 'name', label: 'Clinic Name', val: clinicName },
      { key: 'phone', label: 'Primary Phone Number', val: phoneNumber },
      { key: 'email', label: 'Clinic Email', val: clinicEmail },
      { key: 'address', label: 'Address', val: address },
      { key: 'city', label: 'City', val: city },
      { key: 'state', label: 'State', val: state },
      { key: 'pincode', label: 'Pincode', val: pincode }
    ];

    const completed = REQUIRED_FIELDS.filter(f => Boolean(f.val && f.val.trim()));
    const percent = Math.round((completed.length / REQUIRED_FIELDS.length) * 100);
    const missing = REQUIRED_FIELDS.filter(f => !f.val || !f.val.trim());

    return {
      completionPercent: percent,
      missingFields: missing,
      isProfileIncomplete: percent < 100
    };
  }, [clinicName, phoneNumber, clinicEmail, address, city, state, pincode]);

  // Flash message helper
  const showFeedback = (msg, isErr = false) => {
    if (isErr) {
      setError(msg);
      setSuccess('');
    } else {
      setSuccess(msg);
      setError('');
      setTimeout(() => setSuccess(''), 4000);
    }
  };

  // Section 1: Save Clinic Information
  const handleSaveClinicInfo = async () => {
    if (!activeClinicId) return;
    setSavingSection('info');
    setError('');
    setSuccess('');

    // Validation
    if (clinicEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clinicEmail.trim())) {
      showFeedback('Please enter a valid clinic email address.', true);
      setSavingSection(null);
      return;
    }
    if (pincode && !/^\d{6}$/.test(pincode.trim())) {
      showFeedback('Please enter a valid 6-digit postal pincode.', true);
      setSavingSection(null);
      return;
    }

    try {
      await clinicApi.update(activeClinicId, {
        name: clinicName.trim(),
        phone: phoneNumber.trim(),
        email: clinicEmail.trim(),
        alternatePhone: alternateNumber.trim(),
        website: website.trim(),
        address: {
          line1: address.trim(),
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
          country: 'India'
        }
      });
      showFeedback('Clinic Information saved successfully!');
      fetchProfile();
    } catch (err) {
      showFeedback(err?.response?.data?.message || 'Failed to update clinic information.', true);
    } finally {
      setSavingSection(null);
    }
  };

  // Section 2: Save Clinic Details (Modal)
  const handleSaveClinicDetails = async () => {
    if (!activeClinicId) return;
    setSavingSection('details');
    setError('');
    setSuccess('');
    try {
      await clinicApi.update(activeClinicId, {
        clinicType: editDetailsForm.clinicType.trim(),
        timeZone: editDetailsForm.timeZone.trim(),
        currency: editDetailsForm.currency.trim(),
        workingDays: editDetailsForm.workingDays.trim(),
        workingHours: editDetailsForm.workingHours.trim()
      });
      showFeedback('Clinic Details updated successfully!');
      setShowEditDetailsModal(false);
      fetchProfile();
    } catch (err) {
      showFeedback(err?.response?.data?.message || 'Failed to update clinic details.', true);
    } finally {
      setSavingSection(null);
    }
  };

  // Section 3: Handle Logo Upload
  const handleLogoFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeClinicId) return;

    if (file.size > 2 * 1024 * 1024) {
      showFeedback('Logo image size must be under 2MB.', true);
      return;
    }

    setLogoUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result;
      setClinicLogo(base64Data); // Immediate preview

      try {
        let fileRef = base64Data;
        try {
          const uploadRes = await clinicApi.uploadFile({
            file_data: base64Data,
            file_name: file.name
          });
          if (uploadRes?.data?.fileRef || uploadRes?.fileRef) {
            fileRef = uploadRes?.data?.fileRef || uploadRes?.fileRef;
          }
        } catch {
          // If GridFS upload endpoint is offline, use base64 data string directly
        }

        await clinicApi.update(activeClinicId, {
          clinicDetails: { logo: fileRef }
        });
        showFeedback('Clinic logo updated successfully!');
        fetchProfile();
      } catch (err) {
        showFeedback(err?.response?.data?.message || 'Failed to save clinic logo.', true);
      } finally {
        setLogoUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Section 1B: Handle Clinic Photo Upload
  const handlePhotoFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeClinicId) return;

    if (file.size > 2 * 1024 * 1024) {
      showFeedback('Clinic photo size must be under 2MB.', true);
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result;
      setClinicPhoto(base64Data);

      try {
        let fileRef = base64Data;
        try {
          const uploadRes = await clinicApi.uploadFile({
            file_data: base64Data,
            file_name: file.name
          });
          if (uploadRes?.data?.fileRef || uploadRes?.fileRef) {
            fileRef = uploadRes?.data?.fileRef || uploadRes?.fileRef;
          }
        } catch {
          // fallback base64
        }

        await clinicApi.update(activeClinicId, { image: fileRef });
        showFeedback('Clinic photo updated successfully!');
        fetchProfile();
      } catch (err) {
        showFeedback(err?.response?.data?.message || 'Failed to save clinic photo.', true);
      }
    };
    reader.readAsDataURL(file);
  };

  // Section 4: Save About Clinic
  const handleSaveAboutClinic = async () => {
    if (!activeClinicId) return;
    setSavingSection('about');
    try {
      await clinicApi.update(activeClinicId, {
        clinicDetails: { shortDescription: description.trim() }
      });
      showFeedback('Clinic description saved successfully!');
      fetchProfile();
    } catch (err) {
      showFeedback(err?.response?.data?.message || 'Failed to save clinic description.', true);
    } finally {
      setSavingSection(null);
    }
  };

  // Section 5: Save Social Links
  const handleSaveSocialLinks = async () => {
    if (!activeClinicId) return;
    setSavingSection('social');
    try {
      await clinicApi.update(activeClinicId, {
        website: website.trim(),
        socialLinks: {
          website: website.trim(),
          facebook: fbLink.trim(),
          twitter: twLink.trim(),
          instagram: igLink.trim()
        }
      });
      showFeedback('Social links saved successfully!');
      fetchProfile();
    } catch (err) {
      showFeedback(err?.response?.data?.message || 'Failed to save social links.', true);
    } finally {
      setSavingSection(null);
    }
  };

  // Section 6: Save Contact & Communication
  const handleSaveCommunication = async () => {
    if (!activeClinicId) return;
    setSavingSection('communication');
    try {
      await clinicApi.update(activeClinicId, {
        communicationSettings: {
          senderId: senderId.trim(),
          whatsappNumber: waNumber.trim(),
          enableApptConfirm,
          enableEmailNotif,
          enableSmsNotif
        }
      });
      showFeedback('Communication settings updated successfully!');
      fetchProfile();
    } catch (err) {
      showFeedback(err?.response?.data?.message || 'Failed to save communication settings.', true);
    } finally {
      setSavingSection(null);
    }
  };

  // Section 7: Toggle & Save Quick Preferences
  const handleTogglePreference = async (key, currentVal) => {
    if (!activeClinicId) return;
    const nextVal = !currentVal;
    
    // Optimistic UI update
    if (key === 'autoInvoice') setAutoInvoice(nextVal);
    if (key === 'inventoryAlerts') setInventoryAlerts(nextVal);
    if (key === 'labApproval') setLabApproval(nextVal);
    if (key === 'dataEncryption') setDataEncryption(nextVal);

    try {
      await clinicApi.update(activeClinicId, {
        preferences: {
          autoInvoice: key === 'autoInvoice' ? nextVal : autoInvoice,
          inventoryAlerts: key === 'inventoryAlerts' ? nextVal : inventoryAlerts,
          labApproval: key === 'labApproval' ? nextVal : labApproval,
          dataEncryption: key === 'dataEncryption' ? nextVal : dataEncryption
        }
      });
      showFeedback(`Preference updated successfully!`);
    } catch (err) {
      // Rollback on error
      if (key === 'autoInvoice') setAutoInvoice(currentVal);
      if (key === 'inventoryAlerts') setInventoryAlerts(currentVal);
      if (key === 'labApproval') setLabApproval(currentVal);
      if (key === 'dataEncryption') setDataEncryption(currentVal);
      showFeedback(err?.response?.data?.message || 'Failed to update preference.', true);
    }
  };

  if (loading) return <LoadingState label="Loading clinic profile from database..." />;

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <PageHeader
        eyebrow="Admin Panel"
        title="Settings"
        description="Manage your clinic profile, preferences, and system configurations."
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-100">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 text-xs font-bold whitespace-nowrap transition cursor-pointer border-b-2 -mb-px ${
              activeTab === tab
                ? 'text-blue-600 border-blue-600'
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Feedback Alerts */}
      {success && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-blue-600" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess('')} className="text-blue-400 hover:text-blue-600">
            <X size={14} />
          </button>
        </div>
      )}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-600">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── TAB 1: CLINIC PROFILE ── */}
      {activeTab === 'Clinic Profile' && (
        <div className="space-y-6">

          {/* First-Time Clinic Profile Completion Banner */}
          {isProfileIncomplete && (
            <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-blue-50/90 border border-blue-200/90 rounded-2xl p-5 shadow-sm space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Complete Your Clinic Profile</h3>
                    <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                      Your clinic profile is not fully configured yet. Add your clinic information to personalize your AI-CMS experience and ensure accurate details appear on receipts, notifications, and other clinic documents.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  <span className="text-xs font-black text-blue-700 bg-white px-3.5 py-1.5 rounded-xl border border-blue-200 shadow-2xs">
                    {completionPercent}% Complete
                  </span>
                </div>
              </div>

              {/* Progress Track */}
              <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>

              {/* Missing Fields Checklist */}
              {missingFields.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap pt-0.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Required fields to complete:</span>
                  {missingFields.map(f => (
                    <span key={f.key} className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200">
                      • {f.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Hidden File Inputs */}
          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/svg+xml,image/webp"
            className="hidden"
            onChange={handlePhotoFileChange}
          />
          <input
            ref={logoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/svg+xml,image/webp"
            className="hidden"
            onChange={handleLogoFileChange}
          />

          {/* Top Row Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

            {/* CARD 1: Clinic Information Form */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 lg:col-span-6 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-800">Clinic Information</p>
                <span className="text-[10px] text-slate-400 font-semibold">Persisted in database</span>
              </div>

              {/* Clinic Photo */}
              <div className="flex gap-4 items-center">
                <div 
                  onClick={() => photoInputRef.current?.click()}
                  className="relative w-20 h-20 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden group cursor-pointer"
                  title="Click to upload clinic photo"
                >
                  {clinicPhoto ? (
                    <img src={clinicPhoto} alt="Clinic" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-1">
                      <Camera size={18} className="text-slate-400 mb-1" />
                      <span className="text-[9px] font-bold text-slate-400 leading-tight">No Photo</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/45 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <Camera size={18} className="text-white" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-700">Upload Clinic Photo</p>
                  <p className="text-[10px] text-slate-400">Main profile image visible in notifications & receipts.</p>
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 underline cursor-pointer"
                  >
                    Choose Photo
                  </button>
                </div>
              </div>

              {/* Form Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Clinic Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={clinicName}
                    placeholder="Enter clinic name"
                    onChange={e => setClinicName(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Clinic Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={clinicEmail}
                    placeholder="clinic@example.com"
                    onChange={e => setClinicEmail(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={phoneNumber}
                    placeholder="+91 XXXXX XXXXX"
                    onChange={e => setPhoneNumber(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Alternate Number</label>
                  <input
                    type="text"
                    value={alternateNumber}
                    placeholder="Optional alternate phone"
                    onChange={e => setAlternateNumber(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-slate-700"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={address}
                    placeholder="Street, area, locality"
                    onChange={e => setAddress(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Website (Optional)</label>
                  <input
                    type="text"
                    value={website}
                    placeholder="https://yourclinic.com"
                    onChange={e => setWebsite(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    City <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={city}
                    placeholder="City"
                    onChange={e => setCity(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    State <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={state}
                    placeholder="State"
                    onChange={e => setState(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Pincode <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={pincode}
                    placeholder="6-digit PIN"
                    onChange={e => setPincode(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-slate-700"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveClinicInfo}
                disabled={savingSection === 'info'}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 text-xs font-bold text-white shadow-md shadow-blue-200 hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
              >
                {savingSection === 'info' ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                Save Changes
              </button>
            </div>

            {/* CARD 2: Clinic Details Section */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 lg:col-span-3 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-800">Clinic Details</p>
                <button
                  type="button"
                  onClick={() => {
                    setEditDetailsForm({
                      clinicType: clinicType || '',
                      timeZone: timeZone || '',
                      currency: currency || '',
                      workingDays: workingDays || '',
                      workingHours: workingHours || ''
                    });
                    setShowEditDetailsModal(true);
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Edit3 size={12} /> Edit
                </button>
              </div>

              <div className="space-y-3">
                {[
                  ['Clinic ID', clinicIdCode || 'Not configured'],
                  ['Registration Date', regDate || 'Not configured'],
                  ['Clinic Type', clinicType || 'Not configured'],
                  ['Time Zone', timeZone || 'Not configured'],
                  ['Currency', currency || 'Not configured'],
                  ['Working Days', workingDays || 'Not configured'],
                  ['Working Hours', workingHours || 'Not configured']
                ].map(([lbl, val]) => (
                  <div key={lbl} className="space-y-0.5 border-b border-slate-50 pb-2">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{lbl}</p>
                    <p className={`text-xs font-bold mt-0.5 ${val === 'Not configured' ? 'text-slate-400 italic font-normal' : 'text-slate-700'}`}>
                      {val}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* CARD 3: Clinic Logo Management */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 lg:col-span-3 space-y-4">
              <p className="text-sm font-bold text-slate-800">Clinic Logo</p>

              <div className="w-full aspect-square max-w-[160px] mx-auto border border-slate-200 rounded-2xl flex flex-col items-center justify-center bg-slate-50/50 p-4 relative overflow-hidden">
                {clinicLogo ? (
                  <img src={clinicLogo} alt="Clinic Logo" className="w-full h-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-black text-lg mb-2 shadow-xs">
                      {clinicName ? clinicName.charAt(0).toUpperCase() : <Building2 size={22} />}
                    </div>
                    <p className="text-xs font-black text-slate-800 line-clamp-1">{clinicName || 'My Clinic'}</p>
                    <p className="text-[9px] text-slate-400 font-bold tracking-wider uppercase mt-0.5">No Logo</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={logoUploading}
                  className="w-full py-2 bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {logoUploading ? <RefreshCw size={13} className="animate-spin text-blue-500" /> : <UploadCloud size={13} className="text-slate-400" />}
                  {clinicLogo ? 'Change Logo' : 'Upload Logo'}
                </button>
                <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                  Recommended: 512x512px.<br />JPG, PNG, SVG or WebP. Max 2MB.
                </p>
              </div>
            </div>

          </div>

          {/* Bottom Grid Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* CARD 4: About Clinic */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4 flex flex-col">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-800">About Clinic</p>
                <span className="text-[10px] text-slate-400">Public profile</span>
              </div>
              <div className="space-y-1 flex-1 flex flex-col">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Short Description</label>
                <textarea
                  value={description}
                  maxLength={500}
                  placeholder="Describe your clinic, medical specialties, patient care philosophy, and key healthcare services..."
                  onChange={e => setDescription(e.target.value)}
                  className="w-full flex-1 min-h-[120px] p-3 text-xs font-semibold rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-slate-700 resize-none leading-relaxed"
                />
                <p className="text-[9px] text-slate-400 text-right font-medium mt-1">{description.length}/500</p>
              </div>
              <button
                type="button"
                onClick={handleSaveAboutClinic}
                disabled={savingSection === 'about'}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 text-xs font-bold text-white shadow-md shadow-blue-200 hover:bg-blue-700 transition cursor-pointer self-start disabled:opacity-50"
              >
                {savingSection === 'about' ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                Save Changes
              </button>
            </div>

            {/* CARD 5: Social Links */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4 flex flex-col justify-between">
              <p className="text-sm font-bold text-slate-800">Social Links (Optional)</p>

              <div className="space-y-3.5">
                {[
                  { label: 'Website', val: website, setVal: setWebsite, icon: Globe, placeholder: 'https://example.com' },
                  { label: 'Facebook', val: fbLink, setVal: setFbLink, icon: Facebook, placeholder: 'https://facebook.com/yourclinic' },
                  { label: 'Twitter / X', val: twLink, setVal: setTwLink, icon: Twitter, placeholder: 'https://twitter.com/yourclinic' },
                  { label: 'Instagram', val: igLink, setVal: setIgLink, icon: Instagram, placeholder: 'https://instagram.com/yourclinic' }
                ].map((social, i) => {
                  const Icon = social.icon;
                  return (
                    <div key={i} className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{social.label}</label>
                      <div className="relative">
                        <Icon size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={social.val}
                          placeholder={social.placeholder}
                          onChange={e => social.setVal(e.target.value)}
                          className="w-full pl-8 pr-3.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-slate-700"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleSaveSocialLinks}
                disabled={savingSection === 'social'}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 text-xs font-bold text-white shadow-md shadow-blue-200 hover:bg-blue-700 transition cursor-pointer self-start disabled:opacity-50"
              >
                {savingSection === 'social' ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                Save Changes
              </button>
            </div>

            {/* CARD 6: Contact & Communication */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4 flex flex-col justify-between">
              <p className="text-sm font-bold text-slate-800">Contact & Communication</p>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-semibold">Default Email</span>
                  <span className={`font-bold ${clinicEmail ? 'text-slate-700' : 'text-slate-400 italic font-normal'}`}>
                    {clinicEmail || 'Not configured'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-semibold">SMS Sender ID</span>
                  <input
                    type="text"
                    value={senderId}
                    placeholder="e.g. MYCLNC"
                    maxLength={11}
                    onChange={e => setSenderId(e.target.value.toUpperCase())}
                    className="w-28 px-2 py-1 text-right text-xs font-bold text-slate-700 rounded-lg border border-slate-200 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-semibold">WhatsApp Number</span>
                  <input
                    type="text"
                    value={waNumber}
                    placeholder="+91..."
                    onChange={e => setWaNumber(e.target.value)}
                    className="w-36 px-2 py-1 text-right text-xs font-bold text-slate-700 rounded-lg border border-slate-200 focus:border-blue-500 outline-none"
                  />
                </div>

                <div className="h-px bg-slate-100 my-2" />

                {[
                  { label: 'Appointment Confirmation', val: enableApptConfirm, setVal: setEnableApptConfirm },
                  { label: 'Email Notifications', val: enableEmailNotif, setVal: setEnableEmailNotif },
                  { label: 'SMS Notifications', val: enableSmsNotif, setVal: setEnableSmsNotif }
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-semibold">{item.label}</span>
                    <button
                      type="button"
                      onClick={() => item.setVal(!item.val)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold cursor-pointer border transition ${
                        item.val
                          ? 'bg-blue-50 border-blue-200 text-blue-700'
                          : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      {item.val ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleSaveCommunication}
                disabled={savingSection === 'communication'}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 text-xs font-bold text-white shadow-md shadow-blue-200 hover:bg-blue-700 transition cursor-pointer self-start disabled:opacity-50"
              >
                {savingSection === 'communication' ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                Save Changes
              </button>
            </div>

          </div>

          {/* CARD 7: Quick Preferences */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-800">Quick Preferences</p>
                <p className="text-[11px] text-slate-400">Settings take effect immediately and persist for this clinic</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
              {[
                { 
                  id: 'autoInvoice', 
                  label: 'Auto Invoice Generation', 
                  desc: 'Automatically generate invoice after appointment completion', 
                  val: autoInvoice, 
                  icon: CreditCard, 
                  color: '#3b82f6', 
                  bg: '#eff6ff' 
                },
                { 
                  id: 'inventoryAlerts', 
                  label: 'Inventory Alerts', 
                  desc: 'Get notified when medicine stock is running low', 
                  val: inventoryAlerts, 
                  icon: Pill, 
                  color: '#2563EB', 
                  bg: '#ecfdf5' 
                },
                { 
                  id: 'labApproval', 
                  label: 'Lab Report Approval', 
                  desc: 'Require approval before releasing lab test reports', 
                  val: labApproval, 
                  icon: FlaskConical, 
                  color: '#eab308', 
                  bg: '#fef9c3' 
                },
                { 
                  id: 'dataEncryption', 
                  label: 'Data Encryption', 
                  desc: 'Encrypt patient and medical records in storage', 
                  val: dataEncryption, 
                  icon: Shield, 
                  color: '#ef4444', 
                  bg: '#fef2f2' 
                },
                { 
                  id: 'darkMode', 
                  label: 'Dark Mode', 
                  desc: 'System dark theme appearance (Locked in clinic tier)', 
                  val: false, 
                  icon: Lock, 
                  color: '#94a3b8', 
                  bg: '#f1f5f9', 
                  isLocked: true 
                }
              ].map((pref) => {
                const Icon = pref.icon;
                return (
                  <div key={pref.id} className="flex flex-col justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-3">
                    <div className="space-y-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: pref.bg }}>
                        <Icon size={14} style={{ color: pref.color }} />
                      </div>
                      <p className="text-xs font-bold text-slate-800 leading-snug">{pref.label}</p>
                      <p className="text-[10px] text-slate-400 leading-relaxed">{pref.desc}</p>
                    </div>

                    <button
                      type="button"
                      disabled={pref.isLocked}
                      onClick={() => !pref.isLocked && handleTogglePreference(pref.id, pref.val)}
                      className={`w-full py-1.5 rounded-xl border text-[10px] font-extrabold transition cursor-pointer ${
                        pref.isLocked
                          ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                          : pref.val
                          ? 'bg-blue-600 border-blue-600 text-white shadow'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {pref.isLocked ? 'Locked' : pref.val ? 'On' : 'Off'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Edit Clinic Details ── */}
      {showEditDetailsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Configure Clinic Details</h3>
              <button 
                type="button" 
                onClick={() => setShowEditDetailsModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Clinic Type</label>
                <input
                  type="text"
                  placeholder="e.g. Dental Clinic, Multi Speciality, Pediatrics"
                  value={editDetailsForm.clinicType}
                  onChange={e => setEditDetailsForm({ ...editDetailsForm, clinicType: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Time Zone</label>
                <input
                  type="text"
                  placeholder="e.g. (GMT+05:30) India Standard Time"
                  value={editDetailsForm.timeZone}
                  onChange={e => setEditDetailsForm({ ...editDetailsForm, timeZone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Currency</label>
                <input
                  type="text"
                  placeholder="e.g. INR (₹), USD ($)"
                  value={editDetailsForm.currency}
                  onChange={e => setEditDetailsForm({ ...editDetailsForm, currency: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Working Days</label>
                <input
                  type="text"
                  placeholder="e.g. Mon - Sat, Mon - Sun"
                  value={editDetailsForm.workingDays}
                  onChange={e => setEditDetailsForm({ ...editDetailsForm, workingDays: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Working Hours</label>
                <input
                  type="text"
                  placeholder="e.g. 09:00 AM - 08:00 PM"
                  value={editDetailsForm.workingHours}
                  onChange={e => setEditDetailsForm({ ...editDetailsForm, workingHours: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowEditDetailsModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveClinicDetails}
                disabled={savingSection === 'details'}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 text-xs font-bold text-white shadow hover:bg-blue-700 disabled:opacity-50"
              >
                {savingSection === 'details' ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                Save Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: GENERAL SETTINGS (PRESERVED) ── */}
      {activeTab === 'General Settings' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-800">No Show & Reschedule Policy</h3>
              <p className="text-[11px] text-slate-400 mt-1">Configure parameters for patient self-rescheduling, grace periods, auto-cancellation, and refunds.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-5">
              
              {/* Left Column: Reschedule Policies */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-700">Allow Rescheduling Missed Appointments</p>
                    <p className="text-[10px] text-slate-400">Allow patients/staff to reschedule unattended consultations.</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setAllowRescheduleMissed(!allowRescheduleMissed)}
                    className={`px-3 py-1 rounded-full text-[10px] font-extrabold border ${allowRescheduleMissed ? 'bg-blue-50 border-blue-250 text-blue-700' : 'bg-slate-100 border-slate-200 text-slate-500'}`}
                  >
                    {allowRescheduleMissed ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Maximum Reschedule Window</label>
                  <select 
                    value={maxRescheduleWindowDays} 
                    onChange={e => setMaxRescheduleWindowDays(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-slate-700 bg-white"
                  >
                    <option value={1}>1 Day</option>
                    <option value={3}>3 Days</option>
                    <option value={7}>7 Days</option>
                    <option value={15}>15 Days</option>
                    <option value={30}>30 Days</option>
                    <option value={0}>Custom / Unlimited</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Maximum Allowed Reschedules</label>
                  <select 
                    value={maxAllowedReschedules} 
                    onChange={e => setMaxAllowedReschedules(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-slate-700 bg-white"
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={0}>Unlimited</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-700">Patient Self-Reschedule</p>
                    <p className="text-[10px] text-slate-400">Allow patients to reschedule via Patient Portal.</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setEnablePatientReschedule(!enablePatientReschedule)}
                    className={`px-3 py-1 rounded-full text-[10px] font-extrabold border ${enablePatientReschedule ? 'bg-blue-50 border-blue-255 text-blue-700' : 'bg-slate-100 border-slate-200 text-slate-500'}`}
                  >
                    {enablePatientReschedule ? 'ON' : 'OFF'}
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-700">Receptionist Reschedule</p>
                    <p className="text-[10px] text-slate-400">Allow receptionists to reschedule bookings.</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setEnableReceptionistReschedule(!enableReceptionistReschedule)}
                    className={`px-3 py-1 rounded-full text-[10px] font-extrabold border ${enableReceptionistReschedule ? 'bg-blue-50 border-blue-255 text-blue-700' : 'bg-slate-100 border-slate-200 text-slate-500'}`}
                  >
                    {enableReceptionistReschedule ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>

              {/* Right Column: No-Show & Refund Policies */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-700">Auto Mark Unattended as No Show</p>
                    <p className="text-[10px] text-slate-400">Automatically flag un-checked-in slots as unattended.</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setAutoMarkNoShow(!autoMarkNoShow)}
                    className={`px-3 py-1 rounded-full text-[10px] font-extrabold border ${autoMarkNoShow ? 'bg-blue-50 border-blue-250 text-blue-700' : 'bg-slate-100 border-slate-200 text-slate-500'}`}
                  >
                    {autoMarkNoShow ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Grace Period Before No Show</label>
                  <select 
                    value={noShowGracePeriod} 
                    onChange={e => setNoShowGracePeriod(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-slate-700 bg-white"
                  >
                    <option value="15 Minutes">15 Minutes</option>
                    <option value="30 Minutes">30 Minutes</option>
                    <option value="1 Hour">1 Hour</option>
                    <option value="Clinic Closing Time">Clinic Closing Time</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Refund Policy</label>
                  <select 
                    value={refundPolicy} 
                    onChange={e => setRefundPolicy(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-slate-700 bg-white"
                  >
                    <option value="no_refund">No Refund</option>
                    <option value="partial_refund">Partial Refund</option>
                    <option value="full_refund">Full Refund</option>
                  </select>
                </div>

                {refundPolicy === 'partial_refund' && (
                  <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-bold uppercase">Refund Percentage</span>
                      <span className="font-extrabold text-blue-600">{refundPercentage}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={refundPercentage} 
                      onChange={e => setRefundPercentage(Number(e.target.value))}
                      className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                      <span>Patient receives {refundPercentage}%</span>
                      <span>Clinic retains {100 - refundPercentage}%</span>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Allow Refund As</label>
                  <div className="grid grid-cols-1 gap-2 text-xs font-semibold text-slate-700">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={refundWalletAllowed} onChange={e => setRefundWalletAllowed(e.target.checked)} />
                      <span>Wallet Credit</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={refundOriginalAllowed} onChange={e => setRefundOriginalAllowed(e.target.checked)} />
                      <span>Original Payment Method</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={refundManualApprovalRequired} onChange={e => setRefundManualApprovalRequired(e.target.checked)} />
                      <span>Manual Approval Required</span>
                    </label>
                  </div>
                </div>
              </div>

            </div>

            <div className="border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={async () => {
                  setSuccess('');
                  setError('');
                  try {
                    if (activeClinicId) {
                      await clinicApi.update(activeClinicId, {
                        billingSettings: {
                          allowRescheduleMissed,
                          maxRescheduleWindowDays,
                          maxAllowedReschedules,
                          autoMarkNoShow,
                          noShowGracePeriod,
                          refundPolicy,
                          refundPercentage,
                          refundWalletAllowed,
                          refundOriginalAllowed,
                          refundManualApprovalRequired,
                          enablePatientReschedule,
                          enableReceptionistReschedule
                        }
                      });
                      showFeedback('General Settings updated successfully!');
                    }
                  } catch (err) {
                    showFeedback('Failed to save General Settings.', true);
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-blue-600 text-xs font-bold text-white shadow-md shadow-blue-200 hover:bg-blue-700 transition cursor-pointer"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: USERS & ROLES ── */}
      {activeTab === 'Users & Roles' && (
        <UsersAndRolesSection />
      )}

      {/* ── TAB 4: NOTIFICATIONS ── */}
      {activeTab === 'Notifications' && (
        <NotificationsSettingsTab
          clinic={rawClinic}
          clinicId={activeClinicId}
          onClinicUpdated={setRawClinic}
        />
      )}

      {/* ── TAB 5: BILLING & PAYMENTS (PRESERVED) ── */}
      {activeTab === 'Billing & Payments' && (
        <BillingPolicySettings />
      )}

      {/* ── TAB 6: INTEGRATIONS ── */}
      {activeTab === 'Integrations' && (
        <IntegrationsSettingsTab
          clinic={rawClinic}
          clinicId={activeClinicId}
          onClinicUpdated={setRawClinic}
        />
      )}

      {/* ── TAB 7: SECURITY ── */}
      {activeTab === 'Security' && (
        <SecuritySettingsTab
          clinic={rawClinic}
          clinicId={activeClinicId}
          onClinicUpdated={setRawClinic}
          onNavigateToTab={setActiveTab}
        />
      )}

      {/* ── TAB 8: BACKUP & DATA ── */}
      {activeTab === 'Backup & Data' && (
        <BackupDataSettingsTab
          clinic={rawClinic}
          clinicId={activeClinicId}
          onClinicUpdated={setRawClinic}
        />
      )}

      {/* ── TAB 9: ACTIVITY LOGS ── */}
      {activeTab === 'Activity Logs' && (
        <ActivityLogsSettingsTab
          clinicId={activeClinicId}
        />
      )}
    </div>
  );
};

export default SettingsAdminPage;
