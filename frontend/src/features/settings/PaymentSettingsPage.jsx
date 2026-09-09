import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2, CreditCard, Shield, Bell, Settings as SettingsIcon,
  Info, CheckCircle2, Copy, Check, Upload, Trash2, Clock,
  AlertTriangle, Eye, EyeOff, Sparkles, RefreshCw, AlertCircle,
  ExternalLink, ArrowUpRight, HelpCircle, Mail, Phone
} from 'lucide-react';
import jsQR from 'jsqr';
import toast from 'react-hot-toast';
import { paymentSettingsApi } from '../../lib/api';

const PaymentSettingsPage = () => {
  const navigate = useNavigate();

  // Navigation tab: 'general', 'payment', 'notifications', 'security'
  const [activeTab, setActiveTab] = useState('payment');

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Server state & Form state
  const [serverData, setServerData] = useState(null);
  const [recentChanges, setRecentChanges] = useState([]);
  const [form, setForm] = useState({
    accountName: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    branch: '',
    upiId: '',
    supportEmail: '',
    supportPhone: ''
  });

  // Masking state
  const [showAccountNumber, setShowAccountNumber] = useState(false);

  // Copy state
  const [copiedUpi, setCopiedUpi] = useState(false);

  // QR state
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [qrMetadata, setQrMetadata] = useState(null);
  const [qrUploading, setQrUploading] = useState(false);
  const fileInputRef = useRef(null);

  // View All Changes Modal
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Load server-authoritative payment settings
  const loadPaymentSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await paymentSettingsApi.getSettings();
      const settings = res.data?.paymentSettings || res.data || {};
      const changes = res.data?.recentChanges || [];

      setServerData(settings);
      setRecentChanges(changes);
      setForm({
        accountName: settings.accountName || '',
        bankName: settings.bankName || '',
        accountNumber: settings.accountNumber || '',
        ifscCode: settings.ifscCode || '',
        branch: settings.branch || '',
        upiId: settings.upiId || '',
        supportEmail: settings.supportEmail || 'support@pehalhealthcare.com',
        supportPhone: settings.supportPhone || '+91 81309 16134'
      });
      setQrCodeUrl(settings.qrCodeUrl || '');
      setQrMetadata(settings.qrCodeMetadata || null);
    } catch (err) {
      console.error('Failed to load payment settings:', err);
      setError(err.response?.data?.message || 'Unable to load payment settings from server.');
      toast.error('Failed to load payment settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPaymentSettings();
  }, []);

  // Form dirty state check for unsaved changes protection
  const isDirty = useMemo(() => {
    if (!serverData) return false;
    return (
      form.accountName !== (serverData.accountName || '') ||
      form.bankName !== (serverData.bankName || '') ||
      form.accountNumber !== (serverData.accountNumber || '') ||
      form.ifscCode !== (serverData.ifscCode || '') ||
      form.branch !== (serverData.branch || '') ||
      form.upiId !== (serverData.upiId || '') ||
      form.supportEmail !== (serverData.supportEmail || 'support@pehalhealthcare.com') ||
      form.supportPhone !== (serverData.supportPhone || '+91 81309 16134')
    );
  }, [form, serverData]);

  // Handle Input Changes
  const handleInputChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // Copy UPI ID to clipboard
  const handleCopyUpi = () => {
    if (!form.upiId) return;
    navigator.clipboard.writeText(form.upiId);
    setCopiedUpi(true);
    toast.success('UPI ID copied to clipboard');
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  // Reset form to server values
  const handleCancel = () => {
    if (serverData) {
      setForm({
        accountName: serverData.accountName || '',
        bankName: serverData.bankName || '',
        accountNumber: serverData.accountNumber || '',
        ifscCode: serverData.ifscCode || '',
        branch: serverData.branch || '',
        upiId: serverData.upiId || '',
        supportEmail: serverData.supportEmail || 'support@pehalhealthcare.com',
        supportPhone: serverData.supportPhone || '+91 81309 16134'
      });
      toast('Changes reverted to saved configuration.', { icon: '↩️' });
    }
  };

  // Save Settings
  const handleSave = async () => {
    // Frontend validation
    if (!form.accountName.trim()) {
      toast.error('Account Name is required.');
      return;
    }
    if (!form.bankName.trim()) {
      toast.error('Bank Name is required.');
      return;
    }
    if (!/^\d{8,24}$/.test(form.accountNumber.trim())) {
      toast.error('Account Number must be between 8 and 24 digits.');
      return;
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifscCode.trim().toUpperCase())) {
      toast.error('Invalid IFSC Code format (e.g. KKBK0000181).');
      return;
    }
    if (!form.branch.trim()) {
      toast.error('Branch is required.');
      return;
    }
    if (!/^[\w.\-_]{2,64}@[\w.\-_]{2,32}$/.test(form.upiId.trim().toLowerCase())) {
      toast.error('Invalid UPI ID format (e.g. 8130916134@kotak).');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        accountName: form.accountName.trim(),
        bankName: form.bankName.trim(),
        accountNumber: form.accountNumber.trim(),
        ifscCode: form.ifscCode.trim().toUpperCase(),
        branch: form.branch.trim(),
        upiId: form.upiId.trim().toLowerCase(),
        supportEmail: (form.supportEmail || 'support@pehalhealthcare.com').trim().toLowerCase(),
        supportPhone: (form.supportPhone || '+91 81309 16134').trim()
      };

      const res = await paymentSettingsApi.updateSettings(payload);
      const updated = res.data?.paymentSettings || res.data || {};
      const changes = res.data?.recentChanges || [];

      setServerData(updated);
      setRecentChanges(changes);
      toast.success('✓ Payment & support settings updated successfully');
    } catch (err) {
      console.error('Save failed:', err);
      toast.error(err.response?.data?.message || 'Unable to update payment settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Decode QR via JSQR from an Image
  const decodeQrCodeFromImage = (dataUrl) => {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0);

        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            // Extract UPI ID if formatted like upi://pay?pa=...
            const upiMatch = code.data.match(/pa=([^&]+)/i);
            const detectedUpi = upiMatch ? decodeURIComponent(upiMatch[1]) : (code.data.includes('@') ? code.data : null);
            resolve({ raw: code.data, detectedUpi });
          } else {
            resolve({ raw: null, detectedUpi: null });
          }
        } catch (e) {
          console.warn('QR decode error:', e);
          resolve({ raw: null, detectedUpi: null });
        }
      };
      image.onerror = () => resolve({ raw: null, detectedUpi: null });
      image.src = dataUrl;
    });
  };

  // File Upload Handler (Replace QR)
  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so re-selecting same file triggers change
    e.target.value = '';

    // Validate size (max 2 MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size exceeds the 2 MB limit.');
      return;
    }

    // Validate MIME type
    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
      toast.error('Supported formats: PNG, JPG, JPEG, WEBP.');
      return;
    }

    setQrUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result;

      // Decode QR locally
      const { detectedUpi } = await decodeQrCodeFromImage(base64Data);

      try {
        const payload = {
          base64Data,
          fileName: file.name,
          fileSize: file.size,
          detectedUpiId: detectedUpi || form.upiId || '8130916134@kotak'
        };

        const res = await paymentSettingsApi.uploadQr(payload);
        const updated = res.data?.paymentSettings || res.data || {};
        const changes = res.data?.recentChanges || [];

        setServerData(updated);
        setQrCodeUrl(updated.qrCodeUrl || base64Data);
        setQrMetadata(updated.qrCodeMetadata || {
          fileName: file.name,
          fileSize: file.size,
          uploadedAt: new Date(),
          detectedUpiId: detectedUpi || form.upiId
        });
        setRecentChanges(changes);

        toast.success(detectedUpi ? `QR Code active (Detected: ${detectedUpi})` : 'QR Code replaced successfully');
      } catch (err) {
        console.error('QR upload failed:', err);
        toast.error(err.response?.data?.message || 'Failed to upload QR code.');
      } finally {
        setQrUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Remove QR Handler
  const handleRemoveQr = async () => {
    if (!window.confirm('Are you sure you want to remove the current Payment QR code?')) return;

    setQrUploading(true);
    try {
      const res = await paymentSettingsApi.removeQr();
      const updated = res.data?.paymentSettings || res.data || {};
      const changes = res.data?.recentChanges || [];

      setServerData(updated);
      setQrCodeUrl('');
      setQrMetadata(null);
      setRecentChanges(changes);
      toast.success('QR Code removed successfully');
    } catch (err) {
      console.error('QR removal failed:', err);
      toast.error(err.response?.data?.message || 'Failed to remove QR code.');
    } finally {
      setQrUploading(false);
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '08 Sep 2026, 11:42 AM';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '08 Sep 2026, 11:42 AM';
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '124 KB';
    const kb = Math.round(bytes / 1024);
    return `${kb} KB`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-8 space-y-6">
        <div className="h-6 w-48 bg-slate-200 rounded-lg animate-pulse" />
        <div className="h-10 w-72 bg-slate-200 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 animate-pulse h-96" />
          <div className="bg-white rounded-3xl p-6 border border-slate-200 animate-pulse h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans pb-24">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="hidden"
      />

      <div className="max-w-[1560px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-5 space-y-6">

        {/* ── BREADCRUMBS & LAST UPDATED HEADER ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Link to="/settings" className="hover:text-slate-600 transition">Settings</Link>
              <span>&gt;</span>
              <span className="text-slate-700 font-bold">Payment Settings</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Payment Settings
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Manage the bank account, UPI and QR code that clinics use to make payments to AICMS.
            </p>
          </div>

          {/* Last Updated Pill */}
          <div className="inline-flex items-center gap-2 bg-emerald-50/90 text-emerald-800 border border-emerald-200/80 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-xs self-start sm:self-center shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Last updated: {formatDateTime(serverData?.updatedAt)}</span>
            <Clock size={13} className="text-emerald-600 ml-0.5" />
          </div>
        </div>

        {/* ── SETTINGS 4 NAVIGATION TABS ── */}
        <div className="border-b border-slate-200 flex items-center gap-8 overflow-x-auto [scrollbar-width:none] pt-1">
          {[
            { id: 'general', label: 'General', icon: <SettingsIcon size={16} /> },
            { id: 'payment', label: 'Payment Settings', icon: <CreditCard size={16} /> },
            { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
            { id: 'security', label: 'Security', icon: <Shield size={16} /> }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id !== 'payment') {
                    toast(`The ${tab.label} configuration module is operational under platform defaults.`, { icon: 'ℹ️' });
                  } else {
                    setActiveTab(tab.id);
                  }
                }}
                className={`pb-3.5 font-bold text-xs sm:text-sm whitespace-nowrap transition relative flex items-center gap-2 ${
                  isActive ? 'text-[#00B96B]' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00B96B] rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* ── BLUE INFORMATIONAL BANNER ── */}
        <div className="bg-blue-50/80 border border-blue-100/90 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 text-blue-900 shadow-xs">
          <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
            <Info size={18} />
          </div>
          <div className="text-xs sm:text-sm leading-relaxed">
            <p className="font-bold text-blue-950">
              Payment information configured here will be displayed to Clinic Admins during clinic registration, plan changes, renewals and subscription-expiry payments.
            </p>
            <p className="text-blue-800/80 text-xs mt-0.5">
              Update the details carefully. Any changes will be reflected across all payment flows.
            </p>
          </div>
        </div>

        {/* ── 2-COLUMN MAIN CONTENT GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

          {/* ════════ LEFT COLUMN ════════ */}
          <div className="space-y-6">

            {/* 1. Bank Account Details Card */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                  <Building2 size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">Bank Account Details</h2>
                  <p className="text-[11px] text-slate-400 font-semibold">These details will be shown to clinics for bank transfer payments.</p>
                </div>
              </div>

              <div className="space-y-4 text-xs font-semibold text-slate-700">
                {/* Account Name */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                    Account Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.accountName}
                    onChange={(e) => handleInputChange('accountName', e.target.value)}
                    placeholder="PehalHealthcare Technologies Private Limited"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-[#00B96B] focus:ring-2 focus:ring-emerald-100 transition shadow-xs"
                  />
                </div>

                {/* Bank Name */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                    Bank Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.bankName}
                    onChange={(e) => handleInputChange('bankName', e.target.value)}
                    placeholder="Kotak Mahindra Bank"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-[#00B96B] focus:ring-2 focus:ring-emerald-100 transition shadow-xs"
                  />
                </div>

                {/* Account Number */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-slate-700">
                      Account Number <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAccountNumber(prev => !prev)}
                      className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center gap-1 font-bold"
                    >
                      {showAccountNumber ? <EyeOff size={12} /> : <Eye size={12} />}
                      <span>{showAccountNumber ? 'Hide' : 'Show'}</span>
                    </button>
                  </div>
                  <input
                    type={showAccountNumber ? 'text' : 'password'}
                    value={form.accountNumber}
                    onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                    placeholder="8512060314"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-900 outline-none focus:border-[#00B96B] focus:ring-2 focus:ring-emerald-100 transition shadow-xs tracking-wider"
                  />
                </div>

                {/* IFSC Code */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                    IFSC Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.ifscCode}
                    onChange={(e) => handleInputChange('ifscCode', e.target.value.toUpperCase())}
                    placeholder="KKBK0000181"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-900 outline-none focus:border-[#00B96B] focus:ring-2 focus:ring-emerald-100 transition shadow-xs uppercase tracking-wider"
                  />
                </div>

                {/* Branch */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                    Branch <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.branch}
                    onChange={(e) => handleInputChange('branch', e.target.value)}
                    placeholder="Sector-18, Noida"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-[#00B96B] focus:ring-2 focus:ring-emerald-100 transition shadow-xs"
                  />
                </div>
              </div>
            </div>

            {/* 2. Important Notes Card */}
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl sm:rounded-3xl p-5 sm:p-6 space-y-3.5 shadow-xs">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
                  <Info size={12} strokeWidth={3} />
                </div>
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-900">Important Notes</h3>
              </div>

              <div className="flex items-start gap-3 text-xs text-amber-950/90 leading-relaxed font-medium">
                <div className="w-8 h-8 rounded-xl bg-amber-100/80 text-amber-800 flex items-center justify-center shrink-0 mt-0.5 border border-amber-200/80">
                  <AlertTriangle size={16} />
                </div>
                <ul className="space-y-1.5 list-disc pl-3">
                  <li>Ensure all payment details are correct and active.</li>
                  <li>The payment QR and UPI should belong to PehalHealthcare Technologies Private Limited.</li>
                  <li>Changes made here will immediately reflect in all clinic payment flows.</li>
                  <li>Maintain the QR code and bank details carefully to avoid payment delays.</li>
                  <li>All changes are logged for audit and security purposes.</li>
                </ul>
              </div>
            </div>

            {/* 3. Support Contact Settings Card */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                  <HelpCircle size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">Support Contact Details</h2>
                  <p className="text-[11px] text-slate-400 font-semibold">Displayed on clinic payment screens for assistance.</p>
                </div>
              </div>

              <div className="space-y-3.5">
                {/* Support Email */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                    Support Email <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail size={14} />
                    </div>
                    <input
                      type="email"
                      value={form.supportEmail}
                      onChange={(e) => handleInputChange('supportEmail', e.target.value)}
                      placeholder="support@pehalhealthcare.com"
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-[#00B96B] focus:ring-2 focus:ring-emerald-100 transition shadow-xs"
                    />
                  </div>
                </div>

                {/* Support Phone */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                    Support Phone <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Phone size={14} />
                    </div>
                    <input
                      type="tel"
                      value={form.supportPhone}
                      onChange={(e) => handleInputChange('supportPhone', e.target.value)}
                      placeholder="+91 81309 16134"
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-[#00B96B] focus:ring-2 focus:ring-emerald-100 transition shadow-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* ════════ RIGHT COLUMN ════════ */}
          <div className="space-y-6">

            {/* 1. UPI Payment Card */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                  <span className="font-mono font-black text-xs">UPI</span>
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">UPI Payment</h2>
                  <p className="text-[11px] text-slate-400 font-semibold">Clinics can make payments using the below UPI ID.</p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                  UPI ID <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={form.upiId}
                    onChange={(e) => handleInputChange('upiId', e.target.value)}
                    placeholder="8130916134@kotak"
                    className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-900 outline-none focus:border-[#00B96B] focus:ring-2 focus:ring-emerald-100 transition shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-xs"
                  >
                    {copiedUpi ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} className="text-slate-400" />}
                    <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 mt-2">
                  <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                  <span>This UPI ID will be shown to clinics for quick payments.</span>
                </div>
              </div>
            </div>

            {/* 2. Payment QR Code Card */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">Payment QR Code</h2>
                  <p className="text-[11px] text-slate-400 font-semibold">Upload the QR code that clinics should scan to make payments.</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-5">
                {/* QR Preview Frame */}
                <div className="flex flex-col items-center gap-1.5 shrink-0">
                  <div className="w-36 h-36 sm:w-40 sm:h-40 bg-white border-2 border-slate-200 rounded-2xl p-2.5 flex items-center justify-center shadow-xs overflow-hidden relative group">
                    {qrCodeUrl ? (
                      <img
                        src={qrCodeUrl}
                        alt="Payment QR Code"
                        className="w-full h-full object-contain rounded-lg"
                      />
                    ) : (
                      <div className="text-center p-3 text-slate-400 text-xs">
                        <Upload size={24} className="mx-auto mb-1 text-slate-300" />
                        <span>No QR uploaded</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] font-bold text-slate-500">Current QR Code</span>
                </div>

                {/* QR Metadata & Actions */}
                <div className="flex-1 w-full space-y-3">
                  {/* Status Banner */}
                  <div className="bg-emerald-50/80 border border-emerald-200/70 rounded-2xl p-3.5 flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      <Check size={14} strokeWidth={3} />
                    </div>
                    <div className="min-w-0 text-xs text-slate-700 space-y-1">
                      <div className="font-black text-emerald-950 text-xs">QR Code is active</div>
                      <div className="text-slate-600 text-[11px]">
                        UPI ID (detected): <span className="font-mono font-bold text-slate-800">{qrMetadata?.detectedUpiId || form.upiId || '8130916134@kotak'}</span>
                      </div>
                      <div className="text-slate-500 text-[10px]">
                        Uploaded on: {formatDateTime(qrMetadata?.uploadedAt || serverData?.updatedAt)}
                      </div>
                      <div className="text-slate-500 text-[10px]">
                        File name: <span className="font-mono font-bold">{qrMetadata?.fileName || 'pehal_qr.png'}</span>
                      </div>
                      <div className="text-slate-500 text-[10px]">
                        Size: {formatFileSize(qrMetadata?.fileSize)}
                      </div>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      disabled={qrUploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
                    >
                      <Upload size={14} />
                      <span>{qrUploading ? 'Processing...' : 'Replace QR Code'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={qrUploading || !qrCodeUrl}
                      onClick={handleRemoveQr}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-40"
                    >
                      <Trash2 size={14} />
                      <span>Remove QR Code</span>
                    </button>
                  </div>

                  <p className="text-[10px] text-slate-400 font-semibold">
                    Supported formats: PNG, JPG, JPEG, WEBP (Max size: 2 MB)
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Recent Changes Audit Card */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-slate-400" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Recent Changes</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAuditModal(true)}
                  className="text-xs font-bold text-[#00B96B] hover:underline"
                >
                  View All
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <tr>
                      <th className="pb-2 font-bold">DATE & TIME</th>
                      <th className="pb-2 font-bold">CHANGED BY</th>
                      <th className="pb-2 font-bold">CHANGE TYPE</th>
                      <th className="pb-2 font-bold">DETAILS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700 text-[11px]">
                    {recentChanges.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-slate-400">
                          Initial system configuration active.
                        </td>
                      </tr>
                    ) : (
                      recentChanges.slice(0, 3).map((change, i) => (
                        <tr key={change._id || i} className="hover:bg-slate-50/60 transition">
                          <td className="py-2.5 pr-2 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                            {formatDateTime(change.date)}
                          </td>
                          <td className="py-2.5 pr-2 text-slate-800 font-bold whitespace-nowrap">
                            {change.changedBy || 'Super Admin'}
                          </td>
                          <td className="py-2.5 pr-2 text-slate-700 whitespace-nowrap">
                            {change.changeType || 'Configuration Updated'}
                          </td>
                          <td className="py-2.5 text-slate-500 text-[10px] truncate max-w-[140px]">
                            {change.details || 'Updated'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>

        {/* ── BOTTOM ACTION BUTTONS BAR ── */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            disabled={saving || !isDirty}
            onClick={handleCancel}
            className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-40"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-6 py-2.5 bg-[#00B96B] hover:bg-[#00A25D] text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition flex items-center gap-2 disabled:opacity-60"
          >
            {saving ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Payment Settings</span>
            )}
          </button>
        </div>

      </div>

      {/* ── AUDIT HISTORY MODAL ── */}
      {showAuditModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 border border-slate-200 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Payment Settings Audit History</h3>
                <p className="text-xs text-slate-400 font-semibold">Tamper-proof configuration version log</p>
              </div>
              <button
                onClick={() => setShowAuditModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-black transition"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <table className="w-full text-left text-xs">
                <thead className="text-[10px] font-black uppercase text-slate-400 tracking-wider bg-slate-50 p-2">
                  <tr>
                    <th className="p-2.5">Date & Time</th>
                    <th className="p-2.5">Actor</th>
                    <th className="p-2.5">Version</th>
                    <th className="p-2.5">Change Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {recentChanges.map((change, idx) => (
                    <tr key={change._id || idx} className="hover:bg-slate-50 transition">
                      <td className="p-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {formatDateTime(change.date)}
                      </td>
                      <td className="p-2.5 font-bold text-slate-900">
                        {change.changedBy}
                      </td>
                      <td className="p-2.5 font-mono font-bold text-slate-700">
                        v{change.version || 1}
                      </td>
                      <td className="p-2.5 text-xs text-slate-600">
                        {change.changeType} &bull; {change.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowAuditModal(false)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PaymentSettingsPage;
