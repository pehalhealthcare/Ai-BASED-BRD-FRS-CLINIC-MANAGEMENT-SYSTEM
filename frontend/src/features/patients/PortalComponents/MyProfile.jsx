import { useState } from 'react';
import {
  Camera, MapPin, Phone, CheckCircle2, User, Mail, Shield, Heart,
  Lock, ChevronRight, Download, Bell, FileText, Activity, Edit3, ShieldAlert,
  Calendar
} from 'lucide-react';
import Avatar from '../../../components/ui/Avatar';
import PatientDocumentOcrPanel from '../PatientDocumentOcrPanel';
import { InputRow, SelectRow } from './SharedComponents';

export default function MyProfile({
  profile,
  profileForm,
  profileSuccessMessage,
  savingProfile,
  handleSaveProfile,
  handleOcrApply,
  profileImageFile,
  handleImageChange,
  pf,
  pa,
  pe,
  appointments = [],
  prescriptions = [],
}) {
  const [isEditing, setIsEditing] = useState(false);

  // Helper variables for fallback display
  const username = profile?.fullName || `${profileForm.firstName} ${profileForm.lastName}`.trim() || 'Raj Sharma';
  const age = profile?.age || 22;
  const gender = profile?.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : 'Male';
  const patientId = profile?.patientId || 'PAT-20260622-0001';
  const bloodGroup = profile?.bloodGroup || 'O+';
  
  const formattedDob = profile?.dateOfBirth
    ? new Date(profile.dateOfBirth).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'June 22, 2003';

  const addressString = [
    profile?.address?.line1 || profileForm.address?.line1,
    profile?.address?.line2 || profileForm.address?.line2,
    profile?.address?.city || profileForm.address?.city,
    profile?.address?.state || profileForm.address?.state,
    profile?.address?.pincode || profileForm.address?.pincode,
    profile?.address?.country || profileForm.address?.country || 'India'
  ].filter(Boolean).join(', ');

  const emergencyName = profile?.emergencyContact?.name || profileForm.emergencyContact?.name || 'Sunita Sharma';
  const emergencyRelation = profile?.emergencyContact?.relation || profileForm.emergencyContact?.relation || 'Mother';
  const emergencyPhone = profile?.emergencyContact?.phone || profileForm.emergencyContact?.phone || '+91 98765 43211';

  const insuranceProvider = profile?.insuranceDetails?.provider || 'Star Health Insurance';
  const insurancePolicy = profile?.insuranceDetails?.policyNumber || 'SHI12345678901';
  const insuranceValidTill = 'Dec 31, 2026';

  const onSubmit = async (e) => {
    e.preventDefault();
    await handleSaveProfile(e);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 shadow-card dark:shadow-card-dark p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between pb-5 mb-5 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-aura-50 dark:bg-aura-500/10 border border-aura-200 dark:border-aura-500/20 flex items-center justify-center">
              <User size={18} className="text-aura-600 dark:text-aura-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Edit My Profile</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">Update your personal details and emergency contact.</p>
            </div>
          </div>
          <button
            onClick={() => setIsEditing(false)}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition"
          >
            Cancel Edit
          </button>
        </div>

        {profileSuccessMessage && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-aura-50 dark:bg-aura-500/10 border border-aura-200 dark:border-aura-500/30 text-aura-700 dark:text-aura-300 text-sm font-medium animate-slide-down">
            <CheckCircle2 size={16} />
            {profileSuccessMessage}
          </div>
        )}

        <div className="mb-4">
          <PatientDocumentOcrPanel onApply={handleOcrApply} />
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
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
            <InputRow label="Phone (Non-editable)" value={profileForm.phone} disabled required />
            <InputRow label="Email (Non-editable)" type="email" value={profileForm.email} disabled />
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

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-white/[0.06]">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-white/5 transition"
            >
              Cancel
            </button>
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
    );
  }

  // Dashboard Read-Only view matching the design in the image
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex gap-4">
          <div className="px-5 py-3 rounded-2xl bg-slate-50 dark:bg-navy-900/60 border border-slate-200 dark:border-white/10 min-w-[120px]">
            <div className="flex items-center gap-2 text-aura-500 dark:text-aura-400 mb-1">
              <Calendar size={15} />
              <span className="text-lg font-extrabold text-slate-900 dark:text-white">{appointments.length}</span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Appointments</p>
          </div>
          <div className="px-5 py-3 rounded-2xl bg-slate-50 dark:bg-navy-900/60 border border-slate-200 dark:border-white/10 min-w-[120px]">
            <div className="flex items-center gap-2 text-aura-500 dark:text-aura-400 mb-1">
              <FileText size={15} />
              <span className="text-lg font-extrabold text-slate-900 dark:text-white">{prescriptions.length}</span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Prescriptions</p>
          </div>
        </div>
      </div>

      {/* 1. MAIN LAYOUT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT & CENTER: Profile Details (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 p-6">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-white/[0.06]">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <User size={16} className="text-aura-500" />
                Personal Information
              </h3>
              <button
                onClick={() => setIsEditing(true)}
                className="px-3.5 py-1.5 text-xs font-bold rounded-xl border border-aura-500/20 text-aura-500 hover:bg-aura-500/5 transition flex items-center gap-1.5"
              >
                <Edit3 size={11} />
                Edit Profile
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-6">
              {[
                { label: 'Full Name', value: username },
                { label: 'Date of Birth', value: formattedDob },
                { label: 'Gender', value: gender },
                { label: 'Blood Group', value: bloodGroup },
                { label: 'Nationality', value: profile?.nationality || 'Indian' },
                { label: 'Marital Status', value: profile?.maritalStatus || 'Single' },
                { label: 'Occupation', value: profile?.occupation || 'Student' },
                { label: 'Language', value: profile?.language || 'English, Hindi' }
              ].map(item => (
                <div key={item.label}>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{item.label}</p>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Information */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 p-6">
            <div className="flex items-center pb-4 mb-4 border-b border-slate-100 dark:border-white/[0.06]">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Mail size={16} className="text-aura-500" />
                Contact Information
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Phone Number</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{profile?.phone || profileForm.phone || '+91 98765 43210'}</p>
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10">Primary</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Email Address</p>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1.5">{profile?.email || profileForm.email || 'raj.sharma@example.com'}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Address</p>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1.5 leading-relaxed">{addressString || '123, Green Avenue, Sector 14, Gurugram, Haryana - 122001, India'}</p>
              </div>
            </div>
          </div>

          {/* Row: Emergency & Insurance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Emergency Contact */}
            <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 p-6">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-white/[0.06]">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Heart size={16} className="text-rose-500" />
                  Emergency Contact
                </h3>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-aura-500/20 text-aura-500 hover:bg-aura-500/5 transition flex items-center gap-1"
                >
                  <Edit3 size={10} />
                  Edit
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Contact Name</p>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{emergencyName}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Phone Number</p>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{emergencyPhone}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Relationship</p>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{emergencyRelation}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Insurance Information */}
            <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 p-6">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-white/[0.06]">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Shield size={16} className="text-aura-500" />
                  Insurance Information
                </h3>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-aura-500/20 text-aura-500 hover:bg-aura-500/5 transition flex items-center gap-1"
                >
                  <Edit3 size={10} />
                  Edit
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Provider</p>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{insuranceProvider}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Policy Number</p>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{insurancePolicy}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Valid Till</p>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{insuranceValidTill}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Sidebar widgets (1/3 width) */}
        <div className="space-y-6">
          {/* Health Summary */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 p-6">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 pb-4 mb-4 border-b border-slate-100 dark:border-white/[0.06]">
              <Activity size={16} className="text-aura-500" />
              Health Summary
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Blood Group', value: bloodGroup, badge: null },
                { label: 'Height', value: profile?.height || '175 cm', badge: null },
                { label: 'Weight', value: profile?.weight || '68 kg', badge: null },
                { label: 'Body Mass Index', value: profile?.bmi || '22.2', badge: 'Normal' }
              ].map(box => (
                <div key={box.label} className="p-3.5 rounded-xl bg-slate-50 dark:bg-navy-900/50 border border-slate-100 dark:border-white/[0.04]">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">{box.label}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200">{box.value}</span>
                    {box.badge && (
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10">{box.badge}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 p-6">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 pb-4 mb-4 border-b border-slate-100 dark:border-white/[0.06]">
              <Activity size={16} className="text-aura-500" />
              Quick Actions
            </h3>
            <div className="space-y-4">
              {[
                {
                  title: 'Update Profile',
                  desc: 'Edit your personal information',
                  icon: <User size={14} className="text-aura-500" />,
                  bg: 'bg-aura-500/10',
                  action: () => setIsEditing(true)
                },
                {
                  title: 'Change Password',
                  desc: 'Manage your account security',
                  icon: <Lock size={14} className="text-amber-500" />,
                  bg: 'bg-amber-500/10',
                  action: () => alert('Change password feature is managed in your Account Settings.')
                },
                {
                  title: 'Download Health Summary',
                  desc: 'Get a copy of your health summary',
                  icon: <Download size={14} className="text-sky-500" />,
                  bg: 'bg-sky-500/10',
                  action: () => alert('Generating PDF Health Summary. Your download will start shortly...')
                },
                {
                  title: 'Manage Notifications',
                  desc: 'Control your notification preferences',
                  icon: <Bell size={14} className="text-purple-500" />,
                  bg: 'bg-purple-500/10',
                  action: () => alert('Notifications can be configured in your Notifications tab.')
                }
              ].map(action => (
                <button
                  key={action.title}
                  onClick={action.action}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition text-left group"
                >
                  <div className={`w-9 h-9 rounded-xl ${action.bg} flex items-center justify-center shrink-0`}>
                    {action.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-aura-500 dark:group-hover:text-aura-400 transition">{action.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{action.desc}</p>
                  </div>
                  <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. FOOTER PRIVACY BANNER */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Lock size={15} className="text-emerald-500" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Your data is secure and encrypted</p>
            <p className="text-[10px] text-slate-400 mt-0.5">We take your privacy seriously. Your personal information is protected with industry-standard encryption.</p>
          </div>
        </div>
        <button
          onClick={() => alert('All personal data is encrypted at rest and in transit in compliance with HIPAA and GDPR guidelines.')}
          className="text-xs font-bold text-aura-500 hover:text-aura-600 transition whitespace-nowrap"
        >
          Learn more about privacy &gt;
        </button>
      </div>
    </div>
  );
}
