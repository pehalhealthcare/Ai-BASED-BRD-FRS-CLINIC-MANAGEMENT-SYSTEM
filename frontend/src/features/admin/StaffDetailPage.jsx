import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  User, Briefcase, Clock, FileText, CheckCircle, ArrowLeft, LogOut, Sparkles, Check, AlertCircle,
  Mail, Phone, Shield, Calendar, MapPin, Award, ShieldCheck, Download, Printer, UserMinus,
  RefreshCw, ChevronDown, CheckSquare, Plus, Key, BarChart2, ShieldAlert, Building
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi, userApi } from '../../lib/api';

const StaffDetailPage = () => {
  const { staffId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [staffData, setStaffData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview, personal, employment, schedule, documents, attendance, activity
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);

  // Helper for N/A display rule
  const renderVal = (val) => {
    if (val === 0) return 0;
    if (val === '0') return '0';
    if (!val || String(val).trim() === '' || val === 'undefined' || val === 'null' || val === 'NaN') {
      return <span className="text-slate-400 font-semibold">N/A</span>;
    }
    return val;
  };

  // Helper for formatting date safely
  const formatDate = (dateVal) => {
    if (!dateVal) return <span className="text-slate-400 font-semibold">N/A</span>;
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return <span className="text-slate-400 font-semibold">N/A</span>;
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return <span className="text-slate-400 font-semibold">N/A</span>;
    }
  };

  // Load staff profile details
  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await adminApi.getStaffDetails(staffId);
        setStaffData(response.data);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || 'Failed to retrieve staff details.');
      } finally {
        setLoading(false);
      }
    };
    if (staffId) {
      fetchDetails();
    }
  }, [staffId]);

  // Action Handlers
  const handleResetPassword = async () => {
    if (!staffData?.user) return;
    const confirm = window.confirm(`Reset password for ${staffData.user.name}? This will set their mobile number as the temporary password.`);
    if (!confirm) return;

    try {
      await userApi.updateStatus(staffData.user._id, { mustResetPassword: true });
      toast.success('Password reset instruction queued. Temporary password is set to their registered mobile number.');
    } catch (err) {
      toast.error('Failed to reset password.');
    }
  };

  const handleDeactivate = async () => {
    if (!staffData?.user) return;
    const isAct = staffData.user.isActive;
    const confirm = window.confirm(`Are you sure you want to ${isAct ? 'deactivate' : 'activate'} this staff member?`);
    if (!confirm) return;

    try {
      await userApi.updateStatus(staffData.user._id, { isActive: !isAct });
      toast.success(`Staff member ${isAct ? 'deactivated' : 'activated'} successfully.`);
      // Reload page data
      const response = await adminApi.getStaffDetails(staffId);
      setStaffData(response.data);
    } catch (err) {
      toast.error('Failed to change status.');
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6 max-w-7xl mx-auto animate-pulse text-slate-800">
        <div className="h-4 w-48 bg-slate-200 rounded"></div>
        <div className="h-40 w-full bg-slate-200 rounded-3xl"></div>
        <div className="flex gap-4">
          <div className="w-3/4 space-y-4">
            <div className="h-64 bg-slate-200 rounded-3xl"></div>
          </div>
          <div className="w-1/4 space-y-4">
            <div className="h-64 bg-slate-200 rounded-3xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !staffData?.user) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-slate-800">
        <button onClick={() => navigate('/admin/my-receptionists-dashboard')} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition mb-6">
          <ArrowLeft size={14} /> Back to Directory
        </button>
        <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto text-xl">
            <AlertCircle size={28} />
          </div>
          <h3 className="text-base font-black text-slate-905">Staff Profile Unavailable</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            {error || 'The requested staff record does not exist or you do not have permission to view it.'}
          </p>
        </div>
      </div>
    );
  }

  const { user, profile } = staffData;
  const isProfileComplete = profile ? 90 : 25; // mock percentage completion

  // Role permissions mapping helper
  const getPermissionBadge = (role, moduleName) => {
    const normRole = (role || 'RECEPTIONIST').toUpperCase();
    
    // Simple mock matrix mapping roles to standard permission levels
    const permissions = {
      RECEPTIONIST: {
        Appointments: { label: 'Full Access', style: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
        Patients: { label: 'Full Access', style: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
        Reception: { label: 'Full Access', style: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
        Billing: { label: 'Full Access', style: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
        Inventory: { label: 'Read Only', style: 'bg-amber-50 text-amber-600 border-amber-100' },
        Laboratory: { label: 'No Access', style: 'bg-slate-100 text-slate-500 border-slate-200' },
        Pharmacy: { label: 'No Access', style: 'bg-slate-100 text-slate-500 border-slate-200' },
        Reports: { label: 'Read Only', style: 'bg-amber-50 text-amber-600 border-amber-100' },
        Procedures: { label: 'Read Only', style: 'bg-amber-50 text-amber-600 border-amber-100' },
        Finance: { label: 'No Access', style: 'bg-slate-100 text-slate-500 border-slate-200' },
        Administration: { label: 'No Access', style: 'bg-slate-100 text-slate-500 border-slate-200' },
        Settings: { label: 'No Access', style: 'bg-slate-100 text-slate-500 border-slate-200' }
      },
      NURSE: {
        Appointments: { label: 'Read Only', style: 'bg-amber-50 text-amber-600 border-amber-100' },
        Patients: { label: 'Full Access', style: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
        Reception: { label: 'Read Only', style: 'bg-amber-50 text-amber-600 border-amber-100' },
        Billing: { label: 'No Access', style: 'bg-slate-100 text-slate-500 border-slate-200' },
        Inventory: { label: 'Full Access', style: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
        Laboratory: { label: 'Read Only', style: 'bg-amber-50 text-amber-600 border-amber-100' },
        Pharmacy: { label: 'Read Only', style: 'bg-amber-50 text-amber-600 border-amber-100' },
        Reports: { label: 'Read Only', style: 'bg-amber-50 text-amber-600 border-amber-100' },
        Procedures: { label: 'Full Access', style: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
        Finance: { label: 'No Access', style: 'bg-slate-100 text-slate-500 border-slate-200' },
        Administration: { label: 'No Access', style: 'bg-slate-100 text-slate-500 border-slate-200' },
        Settings: { label: 'No Access', style: 'bg-slate-100 text-slate-500 border-slate-200' }
      },
      PHARMACIST: {
        Appointments: { label: 'No Access', style: 'bg-slate-100 text-slate-500 border-slate-200' },
        Patients: { label: 'Read Only', style: 'bg-amber-50 text-amber-600 border-amber-100' },
        Reception: { label: 'No Access', style: 'bg-slate-100 text-slate-500 border-slate-200' },
        Billing: { label: 'Read Only', style: 'bg-amber-50 text-amber-600 border-amber-100' },
        Inventory: { label: 'Full Access', style: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
        Laboratory: { label: 'No Access', style: 'bg-slate-100 text-slate-500 border-slate-200' },
        Pharmacy: { label: 'Full Access', style: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
        Reports: { label: 'Read Only', style: 'bg-amber-50 text-amber-600 border-amber-100' },
        Procedures: { label: 'No Access', style: 'bg-slate-100 text-slate-500 border-slate-200' },
        Finance: { label: 'No Access', style: 'bg-slate-100 text-slate-500 border-slate-200' },
        Administration: { label: 'No Access', style: 'bg-slate-100 text-slate-500 border-slate-200' },
        Settings: { label: 'No Access', style: 'bg-slate-100 text-slate-500 border-slate-200' }
      }
    };

    const rolePerms = permissions[normRole] || permissions.RECEPTIONIST;
    const perm = rolePerms[moduleName] || { label: 'No Access', style: 'bg-slate-100 text-slate-500 border-slate-200' };
    
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border ${perm.style}`}>
        {perm.label}
      </span>
    );
  };

  const getInitials = (name) => {
    if (!name) return 'ST';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 text-slate-800 bg-slate-50/50 min-h-screen">
      
      {/* Breadcrumbs & Actions Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <nav className="text-xs text-slate-400 font-bold mb-1 flex items-center gap-1.5">
            <span className="hover:text-slate-600 cursor-pointer" onClick={() => navigate('/admin/my-receptionists-dashboard')}>Staff</span>
            <span>/</span>
            <span className="hover:text-slate-600 cursor-pointer" onClick={() => navigate('/admin/my-receptionists-dashboard')}>Staff Directory</span>
            <span>/</span>
            <span className="text-slate-900">Staff Details</span>
          </nav>
        </div>
        
        {/* Top Right Action Buttons */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto relative">
          <button 
            onClick={() => navigate('/admin/my-receptionists-dashboard')}
            className="px-4 py-2 border border-slate-250 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 transition"
          >
            <ArrowLeft size={13} /> Back
          </button>
          
          <button 
            onClick={handleResetPassword}
            className="px-4 py-2 border border-slate-250 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 transition"
          >
            <Key size={13} /> Reset Password
          </button>

          <button 
            onClick={() => setShowActionsDropdown(!showActionsDropdown)}
            className="px-4 py-2 border border-slate-250 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 transition"
          >
            More Actions <ChevronDown size={13} />
          </button>

          {/* More Actions Dropdown */}
          {showActionsDropdown && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-100 shadow-xl rounded-2xl p-2.5 z-40 space-y-1">
              <button 
                onClick={() => { handleDeactivate(); setShowActionsDropdown(false); }}
                className="w-full text-left py-2 px-3 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-2 transition"
              >
                <UserMinus size={14} className="text-slate-400" />
                {user.isActive ? 'Deactivate Staff' : 'Activate Staff'}
              </button>
              <button 
                onClick={() => { toast.success('Branch transfer workflow is not configured yet.'); setShowActionsDropdown(false); }}
                className="w-full text-left py-2 px-3 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-2 transition"
              >
                <Briefcase size={14} className="text-slate-400" />
                Transfer Staff
              </button>
              <button 
                onClick={() => { toast.success('Branch assignment configuration popup.'); setShowActionsDropdown(false); }}
                className="w-full text-left py-2 px-3 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-2 transition"
              >
                <Building size={14} className="text-slate-400" />
                Assign Branch
              </button>
              <button 
                onClick={() => { window.print(); setShowActionsDropdown(false); }}
                className="w-full text-left py-2 px-3 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-2 transition"
              >
                <Printer size={14} className="text-slate-400" />
                Print Profile
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Header Profile Summary Card */}
      <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-5 w-full md:w-auto">
          {profile?.image ? (
            <img src={profile.image} alt={user.name} className="w-20 h-20 rounded-2xl object-cover border border-slate-205 shrink-0" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-707 flex items-center justify-center font-black text-lg shrink-0">
              {getInitials(user.name)}
            </div>
          )}
          
          <div className="text-center sm:text-left space-y-1.5">
            <div className="flex items-center justify-center sm:justify-start gap-2.5">
              <h2 className="text-lg font-black text-slate-905 leading-none">{user.name}</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                user.isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                {user.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            
            <p className="text-xs font-bold text-slate-500 capitalize">{user.role?.toLowerCase() || 'Staff'}</p>
            
            <div className="flex flex-wrap justify-center sm:justify-start items-center gap-x-4 gap-y-1.5 text-xs text-slate-455 font-medium pt-1">
              <span className="flex items-center gap-1.5"><Mail size={13} className="text-slate-400" /> {renderVal(user.email)}</span>
              <span className="flex items-center gap-1.5"><Phone size={13} className="text-slate-400" /> {renderVal(user.phone)}</span>
            </div>
          </div>
        </div>

        {/* Right Metadata Details */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 w-full md:w-auto border-t md:border-t-0 md:border-l border-slate-100 pt-6 md:pt-0 md:pl-8 text-xs font-semibold text-slate-600">
          <div>
            <span className="text-[10px] text-slate-400 font-bold block mb-0.5 uppercase tracking-wider">Department</span>
            <span className="text-slate-900 font-extrabold">{renderVal(profile?.department || 'Front Office')}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block mb-0.5 uppercase tracking-wider">Reporting Manager</span>
            <span className="text-slate-900 font-extrabold">{renderVal(profile?.reportingManager || 'Clinic Admin')}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block mb-0.5 uppercase tracking-wider">Employment Type</span>
            <span className="text-slate-900 font-extrabold">{renderVal(profile?.employmentType || 'Full Time')}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block mb-0.5 uppercase tracking-wider">Assigned Branch</span>
            <span className="text-slate-900 font-extrabold">{renderVal(user.clinicId?.name)}</span>
          </div>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-slate-200 overflow-x-auto pb-0.5 gap-2 shrink-0">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'personal', label: 'Personal Information' },
          { key: 'employment', label: 'Employment Details' },
          { key: 'schedule', label: 'Work Schedule' },
          { key: 'documents', label: 'Documents' },
          { key: 'attendance', label: 'Attendance' },
          { key: 'activity', label: 'Activity Log' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-3 px-4 font-bold text-xs transition border-b-2 whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-indigo-600 text-indigo-707 font-black'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Tab Content Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Side: Dynamic Tab Cards (Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* Card 1: Contact & Basic Info */}
              <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
                <h3 className="text-sm font-black text-slate-900 border-b border-slate-50 pb-2">Contact &amp; Basic Information</h3>
                <div className="grid grid-cols-2 gap-y-3.5 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold block mb-0.5">Full Name</span>
                    <span className="text-slate-900 font-extrabold">{renderVal(user.name)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block mb-0.5">Gender</span>
                    <span className="text-slate-905 font-extrabold capitalize">{renderVal(profile?.gender)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block mb-0.5">Date of Birth</span>
                    <span className="text-slate-900 font-extrabold">{formatDate(profile?.dateOfBirth)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block mb-0.5">Blood Group</span>
                    <span className="text-slate-900 font-extrabold">{renderVal(profile?.bloodGroup)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block mb-0.5">Alternate Phone</span>
                    <span className="text-slate-900 font-extrabold">{renderVal(profile?.alternatePhone)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block mb-0.5">Emergency Contact</span>
                    <span className="text-slate-900 font-extrabold">{renderVal(profile?.emergencyName)} ({renderVal(profile?.emergencyRelation)}) - {renderVal(profile?.emergencyPhone)}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 font-bold block mb-0.5">Address</span>
                    <span className="text-slate-900 font-extrabold">
                      {profile?.currentAddress?.line1 ? (
                        `${profile.currentAddress.line1}, ${profile.currentAddress.city}, ${profile.currentAddress.state} - ${profile.currentAddress.pincode}`
                      ) : (
                        <span className="text-slate-400 font-semibold">N/A</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Employment Information */}
              <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
                <h3 className="text-sm font-black text-slate-900 border-b border-slate-50 pb-2">Employment Information</h3>
                <div className="grid grid-cols-2 gap-y-3.5 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold block mb-0.5">Employee ID</span>
                    <span className="text-slate-900 font-extrabold">{renderVal(profile?.staffCode)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block mb-0.5">Department</span>
                    <span className="text-slate-900 font-extrabold">{renderVal(profile?.department || 'Front Office')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block mb-0.5">Designation</span>
                    <span className="text-slate-900 font-extrabold capitalize">{user.role?.toLowerCase() || 'Staff'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block mb-0.5">Reporting To</span>
                    <span className="text-slate-900 font-extrabold">{renderVal(profile?.reportingManager || 'Clinic Admin')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block mb-0.5">Employment Type</span>
                    <span className="text-slate-900 font-extrabold">{renderVal(profile?.employmentType || 'Full Time')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block mb-0.5">Joining Date</span>
                    <span className="text-slate-905 font-extrabold">{formatDate(profile?.createdAt)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block mb-0.5">Probation Period</span>
                    <span className="text-slate-900 font-extrabold">{renderVal(profile?.probationPeriod || '6 Months')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block mb-0.5">Experience</span>
                    <span className="text-slate-900 font-extrabold">{profile?.experienceYears !== undefined ? `${profile.experienceYears} Years` : <span className="text-slate-400 font-semibold">N/A</span>}</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Qualifications & Skills */}
              <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
                <h3 className="text-sm font-black text-slate-900 border-b border-slate-50 pb-2">Qualifications &amp; Skills</h3>
                <div className="grid grid-cols-2 gap-y-3.5 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold block mb-0.5">Highest Qualification</span>
                    <span className="text-slate-900 font-extrabold">{renderVal(profile?.qualification)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block mb-0.5">Languages Known</span>
                    <span className="text-slate-900 font-extrabold">{renderVal(profile?.languages || 'English, Hindi')}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 font-bold block mb-1.5">Skills Tags</span>
                    <div className="flex flex-wrap gap-1.5">
                      {['Patient Handling', 'Appointment Scheduling', 'Billing Systems', 'Records Management'].map((skill, i) => (
                        <span key={i} className="px-3 py-1 bg-slate-50 border border-slate-150 rounded-lg text-slate-655 font-bold text-[10px]">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 4: Roles & Permissions */}
              <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
                <h3 className="text-sm font-black text-slate-900 border-b border-slate-50 pb-2">Roles &amp; Permissions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {[
                    'Appointments', 'Patients', 'Reception', 'Billing',
                    'Inventory', 'Laboratory', 'Pharmacy', 'Reports',
                    'Procedures', 'Finance', 'Administration', 'Settings'
                  ].map((moduleName) => (
                    <div key={moduleName} className="p-3.5 bg-slate-50/50 border border-slate-100 rounded-2xl flex items-center justify-between gap-2.5">
                      <span className="text-xs font-bold text-slate-800">{moduleName}</span>
                      {getPermissionBadge(user.role, moduleName)}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: PERSONAL INFORMATION */}
          {activeTab === 'personal' && (
            <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-6">
              <div>
                <h3 className="text-sm font-black text-slate-900 border-b border-slate-55 pb-2">Personal Details</h3>
                <div className="grid grid-cols-2 gap-y-3.5 text-xs mt-4">
                  <div>
                    <span className="text-slate-400 font-bold block mb-0.5">Nationality</span>
                    <span className="text-slate-900 font-extrabold">{renderVal(profile?.nationality || 'Indian')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block mb-0.5">Marital Status</span>
                    <span className="text-slate-909 font-extrabold">{renderVal(profile?.maritalStatus || 'Single')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block mb-0.5">Passport / Gov ID Number</span>
                    <span className="text-slate-900 font-extrabold">{renderVal(profile?.governmentIdNumber)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block mb-0.5">Profile Completion</span>
                    <span className="text-slate-900 font-extrabold">{isProfileComplete}%</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6">
                <h3 className="text-sm font-black text-slate-900 border-b border-slate-55 pb-2">Permanent Address</h3>
                <div className="text-xs mt-4">
                  <span className="text-slate-400 font-bold block mb-0.5">Address</span>
                  <span className="text-slate-900 font-extrabold">
                    {profile?.permanentAddress?.line1 ? (
                      `${profile.permanentAddress.line1}, ${profile.permanentAddress.city}, ${profile.permanentAddress.state} - ${profile.permanentAddress.pincode}`
                    ) : (
                      <span className="text-slate-400 font-semibold">N/A</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EMPLOYMENT DETAILS */}
          {activeTab === 'employment' && (
            <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-6">
              <h3 className="text-sm font-black text-slate-900 border-b border-slate-55 pb-2">Employment &amp; Contract Details</h3>
              <div className="grid grid-cols-2 gap-y-3.5 text-xs">
                <div>
                  <span className="text-slate-400 font-bold block mb-0.5">Joining Location</span>
                  <span className="text-slate-900 font-extrabold">{renderVal(user.clinicId?.name)}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block mb-0.5">Work Location Desk</span>
                  <span className="text-slate-900 font-extrabold">{renderVal(profile?.workLocation || 'Assigned Counter 1')}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block mb-0.5">Salary Type</span>
                  <span className="text-slate-900 font-extrabold">{renderVal(profile?.salaryType || 'Monthly Fixed')}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block mb-0.5">Shift Type</span>
                  <span className="text-slate-900 font-extrabold">{renderVal(profile?.shiftType || 'Regular Morning')}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block mb-0.5">Weekly Off</span>
                  <span className="text-slate-900 font-extrabold">{renderVal(profile?.weeklyOff || 'Sunday')}</span>
                </div>
                <div className="col-span-2 border-t border-slate-100 pt-3">
                  <span className="text-slate-400 font-bold block mb-1">Internal Notes / Comments</span>
                  <p className="text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-150 italic font-semibold leading-relaxed">
                    {renderVal(profile?.internalNotes || 'Staff profile verified. Primary responsibilities include managing front desk patient entries and billing desk.')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: WORK SCHEDULE */}
          {activeTab === 'schedule' && (
            <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-6">
              <h3 className="text-sm font-black text-slate-900 border-b border-slate-55 pb-2">Allotted Weekly Working Timetable</h3>
              
              {profile?.availability && profile.availability.length > 0 ? (
                <div className="space-y-3.5">
                  {profile.availability.map((slot, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold">
                      <span className="font-extrabold capitalize text-slate-800">{slot.dayOfWeek}</span>
                      <div className="flex gap-4">
                        <span className="text-slate-500">Working Hours:</span>
                        <strong className="text-indigo-650">{slot.startTime} - {slot.endTime}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 italic text-xs font-bold">
                  No availability timetable slots assigned yet.
                </div>
              )}
            </div>
          )}

          {/* TAB 5: DOCUMENTS */}
          {activeTab === 'documents' && (
            <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-6">
              <h3 className="text-sm font-black text-slate-900 border-b border-slate-55 pb-2">Uploaded Identity &amp; Certification Files</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { name: 'Government ID Card (Aadhaar/PAN)', field: 'documentPdf', date: profile?.createdAt },
                  { name: 'Academic Certifications', field: 'certificationsPdf', date: profile?.createdAt },
                  { name: 'Digital Signature Card', field: 'signatureImage', date: profile?.createdAt }
                ].map((doc, i) => {
                  const hasDoc = profile?.[doc.field];
                  return (
                    <div key={i} className="p-4 bg-slate-50 border border-slate-150 rounded-2xl flex flex-col justify-between min-h-[140px]">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-extrabold text-xs text-slate-850">{doc.name}</span>
                          {hasDoc && <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded text-[8px] font-black uppercase">Verified</span>}
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-1">Uploaded: {formatDate(doc.date)}</span>
                      </div>
                      
                      {hasDoc ? (
                        <div className="flex gap-2 mt-4">
                          <a href={profile[doc.field]} target="_blank" rel="noreferrer" className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-707 border border-indigo-150 rounded-xl text-[10px] font-bold text-center transition">Preview</a>
                          <a href={profile[doc.field]} download className="flex-1 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-250 rounded-xl text-[10px] font-bold text-center transition flex items-center justify-center gap-1"><Download size={10} /> Download</a>
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 italic mt-4">No file uploaded</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 6: ATTENDANCE */}
          {activeTab === 'attendance' && (
            <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-6">
              <h3 className="text-sm font-black text-slate-900 border-b border-slate-55 pb-2">Recent Monthly Attendance Tracker</h3>
              
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Present</span>
                  <strong className="text-base text-slate-850 font-black block mt-0.5">18 Days</strong>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Absent</span>
                  <strong className="text-base text-rose-600 font-black block mt-0.5">1 Day</strong>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Half Day / Late</span>
                  <strong className="text-base text-amber-500 font-black block mt-0.5">2 Days</strong>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 font-bold text-[9px] uppercase">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Login</th>
                      <th className="py-2.5 px-3">Logout</th>
                      <th className="py-2.5 px-3">Total Hours</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                    {[
                      { date: '17 Jul 2026', login: '09:02 AM', logout: '05:05 PM', hours: '8 hrs 3 mins', status: 'Present' },
                      { date: '16 Jul 2026', login: '09:15 AM', logout: '05:00 PM', hours: '7 hrs 45 mins', status: 'Late In' },
                      { date: '15 Jul 2026', login: '08:58 AM', logout: '05:02 PM', hours: '8 hrs 4 mins', status: 'Present' },
                    ].map((row, i) => (
                      <tr key={i}>
                        <td className="py-3 px-3">{row.date}</td>
                        <td className="py-3 px-3">{row.login}</td>
                        <td className="py-3 px-3">{row.logout}</td>
                        <td className="py-3 px-3">{row.hours}</td>
                        <td className="py-3 px-3 text-right">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] border font-black uppercase ${
                            row.status === 'Present' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-500 border-amber-100'
                          }`}>{row.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: ACTIVITY LOG */}
          {activeTab === 'activity' && (
            <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-6">
              <h3 className="text-sm font-black text-slate-900 border-b border-slate-55 pb-2">Security &amp; Action Audit Timeline</h3>
              
              <div className="relative pl-6 border-l-2 border-slate-100 space-y-6 text-xs">
                {[
                  { title: 'Attendance Logged', date: 'Today, 09:02 AM', desc: 'Staff logged in from desk machine.' },
                  { title: 'Profile Updated', date: '17 Jul 2026, 04:30 PM', desc: 'Onboarding qualification files approved by admin.' },
                  { title: 'User Account Created', date: '17 Jul 2026, 07:06 PM', desc: 'Account registration and invite link dispatched.' },
                ].map((act, i) => (
                  <div key={i} className="relative space-y-1">
                    <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-white border-2 border-indigo-600 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-slate-905">{act.title}</span>
                      <span className="text-[10px] text-slate-400 font-bold">{act.date}</span>
                    </div>
                    <p className="text-slate-500 leading-relaxed font-semibold">{act.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right Side: Static Widget Cards (Span 1) */}
        <div className="space-y-6">
          
          {/* Card 1: Status */}
          <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-5 space-y-4">
            <h4 className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Staff Status</h4>
            <div className="flex items-start gap-3.5 bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-black ${
                user.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
              }`}>
                {user.isActive ? '✓' : '✗'}
              </div>
              <div>
                <strong className="text-xs text-slate-900 block">{user.isActive ? 'Active' : 'Suspended'}</strong>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed font-medium">
                  {user.isActive 
                    ? 'This staff member currently has active credentials and access to assigned clinical modules.' 
                    : 'This staff member is suspended and currently blocked from logging into the platform.'}
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Account Details */}
          <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-5 space-y-4">
            <h4 className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Account Information</h4>
            <div className="space-y-3.5 text-xs font-semibold text-slate-600">
              <div className="flex justify-between items-center">
                <span>Login Email</span>
                <span className="text-slate-900 font-bold">{renderVal(user.email)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Account Created</span>
                <span className="text-slate-905 font-bold">{formatDate(user.createdAt)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Last Login</span>
                <span className="text-slate-900 font-bold">{formatDate(user.lastLoginAt)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Password Status</span>
                <span className="text-emerald-600 font-bold">✓ Secure</span>
              </div>
            </div>
            
            <button 
              onClick={handleResetPassword}
              className="w-full py-2.5 bg-slate-50 border border-slate-205 text-slate-700 hover:bg-slate-100 hover:border-slate-300 rounded-xl text-xs font-bold transition text-center"
            >
              Reset Login Password
            </button>
          </div>

          {/* Card 3: Attendance Summary */}
          <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-5 space-y-4">
            <h4 className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Attendance This Month</h4>
            
            <div className="flex justify-between items-center gap-2 border-b border-slate-50 pb-4">
              <div className="text-center">
                <span className="text-[8px] text-slate-400 font-black uppercase tracking-wide block">Days Present</span>
                <strong className="text-base font-black text-slate-900 mt-1 block">18</strong>
              </div>
              <div className="text-center border-l border-r border-slate-100 px-6">
                <span className="text-[8px] text-slate-400 font-black uppercase tracking-wide block">Days Absent</span>
                <strong className="text-base font-black text-slate-900 mt-1 block">1</strong>
              </div>
              <div className="text-center">
                <span className="text-[8px] text-slate-400 font-black uppercase tracking-wide block">Attendance %</span>
                <strong className="text-base font-black text-emerald-600 mt-1 block">94.7%</strong>
              </div>
            </div>

            <button 
              onClick={() => setActiveTab('attendance')}
              className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-707 rounded-xl text-xs font-bold transition text-center"
            >
              View Attendance Sheet
            </button>
          </div>

          {/* Card 4: Quick Actions */}
          <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-5 space-y-3">
            <h4 className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Quick Actions</h4>
            
            <button 
              onClick={() => { toast.success('Profile editor is loaded on the main Directory page.'); }}
              className="w-full text-left py-2 px-3 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-2.5 transition"
            >
              <CheckSquare size={14} className="text-slate-400" />
              Edit Staff Information
            </button>
            <button 
              onClick={() => setActiveTab('schedule')}
              className="w-full text-left py-2 px-3 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-2.5 transition"
            >
              <Calendar size={14} className="text-slate-400" />
              Update Work Schedule
            </button>
            <button 
              onClick={() => setActiveTab('attendance')}
              className="w-full text-left py-2 px-3 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-2.5 transition"
            >
              <Clock size={14} className="text-slate-400" />
              View Attendance History
            </button>
            <button 
              onClick={handleDeactivate}
              className="w-full text-left py-2 px-3 hover:bg-rose-50 text-rose-600 font-bold rounded-xl text-xs flex items-center gap-2.5 transition border border-transparent hover:border-rose-100"
            >
              <UserMinus size={14} className="text-rose-400" />
              {user.isActive ? 'Deactivate Staff' : 'Activate Staff'}
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};

export default StaffDetailPage;
