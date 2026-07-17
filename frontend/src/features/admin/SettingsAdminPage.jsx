import { useState, useEffect } from 'react';
import {
  Save, Camera, Globe, Facebook, Twitter, Instagram, Mail, Phone,
  ToggleLeft, ToggleRight, Shield, Database, Activity, User, Key,
  Lock, Settings as SettingsIcon, UploadCloud, BellRing, Settings2, CreditCard, Pill, FlaskConical
} from 'lucide-react';
import { clinicApi } from '../../lib/api';
import BillingPolicySettings from './BillingPolicySettings';
import useAuth from '../../hooks/useAuth';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
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

  // Primary states matching Image 2
  const [clinicName, setClinicName] = useState('Sunrise Clinic');
  const [clinicEmail, setClinicEmail] = useState('info@sunriseclinic.com');
  const [phoneNumber, setPhoneNumber] = useState('+91 98765 43210');
  const [alternateNumber, setAlternateNumber] = useState('+91 91234 56789');
  const [address, setAddress] = useState('Indirapuram, Ghaziabad, Uttar Pradesh, India');
  const [website, setWebsite] = useState('www.sunriseclinic.com');
  const [city, setCity] = useState('Ghaziabad');
  const [state, setState] = useState('Uttar Pradesh');
  const [pincode, setPincode] = useState('201014');

  // Details
  const [clinicId, setClinicId] = useState('CLN-2023-0001');
  const [regDate, setRegDate] = useState('12 Jan 2023');
  const [clinicType, setClinicType] = useState('Multi Speciality');

  // Bottom Forms
  const [description, setDescription] = useState(
    'Sunrise Clinic is a multi-speciality healthcare center committed to providing quality medical services with compassion and care. Our experienced team of doctors and staff work round the clock for your better health.'
  );

  // Social Links
  const [fbLink, setFbLink] = useState('https://facebook.com/sunriseclinic');
  const [twLink, setTwLink] = useState('https://twitter.com/sunriseclinic');
  const [igLink, setIgLink] = useState('https://instagram.com/sunriseclinic');

  // Contact & Communication
  const [senderId, setSenderId] = useState('SUNRISE');
  const [waNumber, setWaNumber] = useState('+91 98765 43210');
  const [enableApptConfirm, setEnableApptConfirm] = useState(true);
  const [enableEmailNotif, setEnableEmailNotif] = useState(true);
  const [enableSmsNotif, setEnableSmsNotif] = useState(false);

  // Quick Preferences
  const [autoInvoice, setAutoInvoice] = useState(true);
  const [inventoryAlerts, setInventoryAlerts] = useState(true);
  const [labApproval, setLabApproval] = useState(false);
  const [dataEncryption, setDataEncryption] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.clinicId) {
        setLoading(false);
        return;
      }
      try {
        const response = await clinicApi.getDetails(user.clinicId);
        const clinic = response.data?.clinic || {};
        if (clinic.name) setClinicName(clinic.name);
        if (clinic.email) setClinicEmail(clinic.email);
        if (clinic.phone) setPhoneNumber(clinic.phone);
        if (clinic.code) setClinicId(`CLN-${clinic.code}`);
        if (clinic.address) {
          const addrStr = [clinic.address.line1, clinic.address.line2, clinic.address.city, clinic.address.state, clinic.address.pincode].filter(Boolean).join(', ');
          if (addrStr) setAddress(addrStr);
          if (clinic.address.city) setCity(clinic.address.city);
          if (clinic.address.state) setState(clinic.address.state);
          if (clinic.address.pincode) setPincode(clinic.address.pincode);
        }
      } catch (err) {
        console.error('Error fetching clinic details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user?.clinicId]);

  const handleSaveClinicInfo = async () => {
    setSuccess('');
    setError('');
    try {
      if (user?.clinicId) {
        await clinicApi.update(user.clinicId, {
          name: clinicName,
          phone: phoneNumber,
          email: clinicEmail,
          address: {
            line1: address,
            city,
            state,
            pincode
          }
        });
      }
      setSuccess('Clinic Information updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update clinic information.');
    }
  };

  if (loading) return <LoadingState label="Loading settings..." />;

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <PageHeader
        eyebrow="Admin Panel"
        title="Settings"
        description="Manage your clinic profile, preference and system configurations."
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-100">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 text-xs font-bold whitespace-nowrap transition cursor-pointer border-b-2 -mb-px ${activeTab === tab
                ? 'text-blue-600 border-blue-600'
                : 'text-slate-500 border-transparent hover:text-slate-700'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
          {success}
        </div>
      )}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
          {error}
        </div>
      )}

      {activeTab === 'Clinic Profile' && (
        <div className="space-y-6">
          {/* Top Row Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

            {/* Clinic Information */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 lg:col-span-6 space-y-4">
              <p className="text-sm font-bold text-slate-800">Clinic Information</p>

              <div className="flex gap-4 items-center">
                <div className="relative w-20 h-20 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden group">
                  <span className="text-xs font-bold text-slate-400">Clinic Photo</span>
                  <button className="absolute inset-0 bg-black/45 flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer">
                    <Camera size={16} className="text-white" />
                  </button>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-700">Upload Clinic Photo</p>
                  <p className="text-[10px] text-slate-400">Main profile image visible in notifications & receipts.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Clinic Name</label>
                  <input type="text" value={clinicName} onChange={e => setClinicName(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-slate-700" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Clinic Email</label>
                  <input type="email" value={clinicEmail} onChange={e => setClinicEmail(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-slate-700" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone Number</label>
                  <input type="text" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-slate-700" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Alternate Number</label>
                  <input type="text" value={alternateNumber} onChange={e => setAlternateNumber(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-slate-700" />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Address</label>
                  <input type="text" value={address} onChange={e => setAddress(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-slate-700" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Website (Optional)</label>
                  <input type="text" value={website} onChange={e => setWebsite(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-slate-700" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">City</label>
                  <input type="text" value={city} onChange={e => setCity(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-slate-700" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">State</label>
                  <input type="text" value={state} onChange={e => setState(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-slate-700" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pincode</label>
                  <input type="text" value={pincode} onChange={e => setPincode(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-slate-700" />
                </div>
              </div>

              <button
                onClick={handleSaveClinicInfo}
                className="px-5 py-2 rounded-xl bg-blue-600 text-xs font-bold text-white shadow-md shadow-blue-200 hover:bg-blue-700 transition cursor-pointer"
              >
                Save Changes
              </button>
            </div>

            {/* Clinic Details */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 lg:col-span-3 space-y-4">
              <p className="text-sm font-bold text-slate-800">Clinic Details</p>

              <div className="space-y-3">
                {[
                  ['Clinic ID', clinicId],
                  ['Registration Date', regDate],
                  ['Clinic Type', clinicType],
                  ['Time Zone', '(GMT+05:30) India Standard Time'],
                  ['Currency', 'INR (₹)'],
                  ['Working Days', 'Mon - Sun'],
                  ['Working Hours', '09:00 AM - 08:00 PM']
                ].map(([label, val]) => (
                  <div key={label} className="space-y-0.5 border-b border-slate-50 pb-2">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                    <p className="text-xs font-bold text-slate-700 mt-0.5">{val}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Clinic Logo */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 lg:col-span-3 space-y-4">
              <p className="text-sm font-bold text-slate-800">Clinic Logo</p>

              <div className="w-full aspect-square max-w-[160px] mx-auto border border-slate-150 rounded-2xl flex flex-col items-center justify-center bg-slate-50/50 p-4">
                <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center text-white text-base font-black mb-2 shadow-md">
                  ☀️
                </div>
                <p className="text-xs font-black text-slate-800">SUNRISE</p>
                <p className="text-[9px] text-slate-400 font-bold tracking-wider">CLINIC</p>
              </div>

              <div className="space-y-3">
                <button className="w-full py-2 bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5">
                  <UploadCloud size={13} className="text-slate-400" />
                  Change Logo
                </button>
                <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                  Recommended size: 512x512px.<br />JPG, PNG or SVG. Max size 2MB.
                </p>
              </div>
            </div>

          </div>

          {/* Bottom Grid Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* About Clinic */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4 flex flex-col">
              <p className="text-sm font-bold text-slate-800">About Clinic</p>
              <div className="space-y-1 flex-1 flex flex-col">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Short Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full flex-1 min-h-[120px] p-3 text-xs font-semibold rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-slate-700 resize-none leading-relaxed"
                />
                <p className="text-[9px] text-slate-400 text-right font-medium mt-1">{description.length}/500</p>
              </div>
              <button
                onClick={() => alert('Description updated')}
                className="px-5 py-2.5 rounded-xl bg-blue-600 text-xs font-bold text-white shadow-md shadow-blue-200 hover:bg-blue-700 transition cursor-pointer self-start"
              >
                Save Changes
              </button>
            </div>

            {/* Social Links */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4 flex flex-col justify-between">
              <p className="text-sm font-bold text-slate-800">Social Links (Optional)</p>

              <div className="space-y-3.5">
                {[
                  { label: 'Website', val: website, setVal: setWebsite, icon: Globe },
                  { label: 'Facebook', val: fbLink, setVal: setFbLink, icon: Facebook },
                  { label: 'Twitter', val: twLink, setVal: setTwLink, icon: Twitter },
                  { label: 'Instagram', val: igLink, setVal: setIgLink, icon: Instagram }
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
                          onChange={e => social.setVal(e.target.value)}
                          className="w-full pl-8 pr-3.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-slate-700"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => alert('Social links updated')}
                className="px-5 py-2.5 rounded-xl bg-blue-600 text-xs font-bold text-white shadow-md shadow-blue-200 hover:bg-blue-700 transition cursor-pointer self-start"
              >
                Save Changes
              </button>
            </div>

            {/* Contact & Communication */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4 flex flex-col justify-between">
              <p className="text-sm font-bold text-slate-800">Contact & Communication</p>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-semibold">Default Email</span>
                  <span className="font-bold text-slate-700">{clinicEmail}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-semibold">SMS Sender ID</span>
                  <span className="font-bold text-slate-700">{senderId}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-semibold">WhatsApp Number</span>
                  <span className="font-bold text-slate-700">{waNumber}</span>
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
                      onClick={() => item.setVal(!item.val)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold cursor-pointer border ${item.val
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-slate-50 border-slate-200 text-slate-500'
                        }`}
                    >
                      {item.val ? 'Enable' : 'Disable'}
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={() => alert('Communication settings updated')}
                className="px-5 py-2.5 rounded-xl bg-blue-600 text-xs font-bold text-white shadow-md shadow-blue-200 hover:bg-blue-700 transition cursor-pointer self-start"
              >
                Save Changes
              </button>
            </div>

          </div>

          {/* Quick Preferences */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <p className="text-sm font-bold text-slate-800">Quick Preferences</p>

            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
              {[
                { label: 'Auto Invoice Generation', desc: 'Automatically generate invoice after appointment completion', val: autoInvoice, set: setAutoInvoice, icon: CreditCard, color: '#3b82f6', bg: '#eff6ff' },
                { label: 'Inventory Alerts', desc: 'Get notified when medicine stock is running low', val: inventoryAlerts, set: setInventoryAlerts, icon: Pill, color: '#10b981', bg: '#ecfdf5' },
                { label: 'Lab Report Approval', desc: 'Require approval before sending lab reports', val: labApproval, set: setLabApproval, icon: FlaskConical, color: '#eab308', bg: '#fef9c3' },
                { label: 'Data Encryption', desc: 'Encrypt sensitive data for better security', val: dataEncryption, set: setDataEncryption, icon: Shield, color: '#ef4444', bg: '#fef2f2' },
                { label: 'Dark Mode', desc: 'Enable dark mode for the application (Locked)', val: false, set: () => { }, icon: Lock, color: '#94a3b8', bg: '#f1f5f9', isLocked: true }
              ].map((pref, i) => {
                const Icon = pref.icon;
                return (
                  <div key={i} className="flex flex-col justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-3">
                    <div className="space-y-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: pref.bg }}>
                        <Icon size={14} style={{ color: pref.color }} />
                      </div>
                      <p className="text-xs font-bold text-slate-800 leading-snug">{pref.label}</p>
                      <p className="text-[10px] text-slate-400 leading-relaxed">{pref.desc}</p>
                    </div>

                    <button
                      onClick={() => !pref.isLocked && pref.set(!pref.val)}
                      className={`w-full py-1.5 rounded-xl border text-[10px] font-extrabold transition cursor-pointer ${pref.isLocked
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

      {activeTab === 'Billing & Payments' && (
        <BillingPolicySettings />
      )}
    </div>
  );
};

export default SettingsAdminPage;
