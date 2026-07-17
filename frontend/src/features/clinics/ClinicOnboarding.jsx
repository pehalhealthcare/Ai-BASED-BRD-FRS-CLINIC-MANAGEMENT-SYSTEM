import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { clinicApi, doctorApi, userApi, specializationApi } from '../../lib/api';
import { 
  Building2, User, Users, Calendar, DollarSign, 
  Settings, CheckCircle, ArrowRight, ArrowLeft, Plus, Trash2, Heart, ShieldCheck, Mail, Phone, Lock, Sparkles, Network, Code, Globe, Play, Clock, Check, LogOut
} from 'lucide-react';

const ClinicOnboarding = () => {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  
  // Metadata States
  const [flowData, setFlowData] = useState(null);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Timings/Fees Configuration States
  const [workingTimings, setWorkingTimings] = useState({
    dayRange: 'Monday - Friday',
    startTime: '09:00',
    endTime: '20:00',
    lunchStart: '13:00',
    lunchEnd: '14:00'
  });

  // Doctor Form inputs
  const [doctors, setDoctors] = useState([
    { fullName: '', email: '', phone: '' }
  ]);

  // Staff Form inputs
  const [staffList, setStaffList] = useState([
    { name: '', email: '', phone: '', role: 'RECEPTIONIST' }
  ]);

  // Departments List
  const [departments, setDepartments] = useState(['General Medicine', 'Pediatrics']);
  const [newDeptName, setNewDeptName] = useState('');

  // Branches List
  const [branches, setBranches] = useState([
    { name: '', code: '', phone: '', address: { street: '', city: '', state: '', country: 'India' } }
  ]);

  // Pharmacy / Lab Configs
  const [pharmacyName, setPharmacyName] = useState('');
  const [pharmacyGst, setPharmacyGst] = useState('');
  const [labName, setLabName] = useState('');
  const [availableSpecializations, setAvailableSpecializations] = useState([]);

  // AI & Video Options
  const [enabledAiFeatures, setEnabledAiFeatures] = useState({
    symptom_checker: true,
    consultation_assistant: true,
    voice_to_text: true
  });
  const [videoConfig, setVideoConfig] = useState({
    provider: 'Zoom',
    defaultFee: 500,
    duration: 15
  });

  const loadFlow = async () => {
    try {
      if (!user?.clinicId) {
        navigate('/login');
        return;
      }
      const data = await clinicApi.getOnboardingFlow(user.clinicId);
      setFlowData(data.data);
      if (data.data.isOnboardingCompleted) {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError('Failed to fetch onboarding plan details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFlow();
    specializationApi.list().then(res => {
      setAvailableSpecializations(res.specializations || res.data?.specializations || []);
    }).catch(() => {});
  }, [user, navigate]);

  const handleActivateTrial = async (featureCode) => {
    setSaving(true);
    try {
      const data = await clinicApi.activateTrialFeature(user.clinicId, { featureCode });
      setFlowData(data.data);
      alert(`${featureCode.replace('_', ' ').toUpperCase()} Trial activated successfully! New steps loaded.`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to activate trial feature.');
    } finally {
      setSaving(false);
    }
  };

  const handleNext = () => {
    if (currentStepIdx < (flowData?.steps?.length || 0) - 1) {
      setCurrentStepIdx(currentStepIdx + 1);
    }
  };

  const handleBack = () => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx(currentStepIdx - 1);
    }
  };

  const handleSubmitOnboarding = async () => {
    setSaving(true);
    setError('');
    try {
      // 1. Create Doctors
      const activeDoctors = doctors.filter(doc => doc.fullName?.trim() && doc.email?.trim() && doc.phone?.trim());
      for (const doc of activeDoctors) {
        await doctorApi.create({
          fullName: doc.fullName.trim(),
          email: doc.email.trim(),
          phone: doc.phone.trim()
        });
      }

      // 2. Create Staff members
      const activeStaff = staffList.filter(staff => staff.name?.trim() && staff.email?.trim() && staff.phone?.trim());
      for (const staff of activeStaff) {
        await userApi.create({
          name: staff.name.trim(),
          email: staff.email.trim(),
          password: staff.phone.trim(), // Use phone number as temporary password
          phone: staff.phone.trim(),
          role: staff.role
        });
      }

      // 3. Create Branches
      const activeBranches = branches.filter(branch => branch.name?.trim() && branch.code?.trim());
      for (const branch of activeBranches) {
        await clinicApi.create({
          ...branch,
          name: branch.name.trim(),
          code: branch.code.trim(),
          parentClinicId: user.clinicId
        });
      }

      // 4. Update Clinic Details (Timings, Departments, etc.)
      const updatedDetails = {
        timings: [
          {
            dayRange: workingTimings.dayRange,
            startTime: workingTimings.startTime,
            endTime: workingTimings.endTime
          }
        ],
        departments,
        pharmacyName,
        pharmacyGst,
        labName,
        aiConfig: enabledAiFeatures,
        videoConfig
      };

      await clinicApi.update(user.clinicId, {
        clinicDetails: updatedDetails,
        isOnboardingCompleted: true
      });

      await refreshUser();
      alert('Clinic configured successfully!');
      navigate('/dashboard', { replace: true });
      setError(err.response?.data?.message || err.message || 'Error completing setup.');
      console.error('Onboarding submission failed:', err);
      if (err.response?.data) {
        console.error('Validation Details:', JSON.stringify(err.response.data, null, 2));
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 bg-blue-150 text-blue-600 rounded-3xl flex items-center justify-center mx-auto animate-bounce">
            <Heart className="w-7 h-7 animate-pulse text-blue-600" fill="currentColor" />
          </div>
          <p className="text-sm font-black text-slate-700">Loading plan configurations...</p>
        </div>
      </div>
    );
  }

  const steps = flowData?.steps || [];
  const activeStep = steps[currentStepIdx];
  const progressPercent = Math.round((currentStepIdx / (steps.length - 1)) * 100);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 py-4 px-6 md:px-12 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
            <Heart size={18} fill="currentColor" />
          </div>
          <span className="text-xl font-black tracking-tight text-slate-900">AI-CMS Setup</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="px-3 py-1 bg-blue-50 border border-blue-100 rounded-full text-xs font-bold text-blue-600">
            {flowData?.planName}
          </span>
          {flowData?.subscriptionValidity && (
            <span className="text-xs text-slate-400 font-medium">
              Valid Till: {new Date(flowData.subscriptionValidity).toLocaleDateString()}
            </span>
          )}
          <button 
            type="button" 
            onClick={logout}
            className="px-4 py-2 border border-slate-200 hover:bg-red-50 hover:text-red-600 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-1.5 transition ml-2"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </header>

      {/* Main setup interface */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Step Tracker sidebar */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-lg font-black text-slate-900 mb-2">Setup Steps</h3>
            <div className="w-full bg-slate-100 h-2 rounded-full mb-6 overflow-hidden">
              <div className="bg-blue-600 h-full rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
            </div>

            <div className="space-y-5 relative pl-2">
              <div className="absolute top-1 bottom-1 left-[19px] w-[2px] bg-slate-100" />
              {steps.map((step, idx) => {
                const isActive = currentStepIdx === idx;
                const isCompleted = currentStepIdx > idx;
                return (
                  <div key={step.id} className="flex gap-4 items-start relative">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border-2 transition ${
                      isCompleted 
                        ? "bg-emerald-50 border-emerald-500 text-emerald-500" 
                        : isActive 
                          ? "bg-blue-600 border-blue-600 text-white" 
                          : "bg-white border-slate-200 text-slate-400"
                    }`}>
                      {isCompleted ? <Check className="w-4 h-4" /> : idx + 1}
                    </div>
                    <div>
                      <h4 className={`font-bold text-xs leading-tight ${isActive ? "text-blue-600" : isCompleted ? "text-slate-700" : "text-slate-400"}`}>
                        {step.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trial features section */}
          {flowData?.availableTrials?.length > 0 && (
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-indigo-900 font-extrabold text-sm">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <span>Premium Trials Available</span>
              </div>
              <p className="text-xs text-indigo-700 leading-relaxed">
                Activate these premium features for free during your trial setup.
              </p>
              <div className="space-y-3">
                {flowData.availableTrials.map(trial => (
                  <div key={trial.code} className="flex items-center justify-between p-3 bg-white rounded-2xl border border-indigo-50">
                    <div>
                      <h5 className="text-xs font-bold text-slate-800">{trial.name}</h5>
                      <span className="text-[10px] text-indigo-600 font-medium">Free for {trial.trialDays} days</span>
                    </div>
                    <button type="button" onClick={() => handleActivateTrial(trial.code)} disabled={saving}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-[10px] font-bold hover:bg-indigo-700 transition">
                      Try Now
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Trial Countdown indicators */}
          {flowData?.activeTrials?.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 space-y-3">
              <h4 className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-600" /> Active Trial Features
              </h4>
              <div className="space-y-2">
                {flowData.activeTrials.map(trial => (
                  <div key={trial.featureCode} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-emerald-100">
                    <span className="text-[10px] font-bold text-slate-700 uppercase">{trial.featureCode.replace('_', ' ')}</span>
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold">
                      {trial.daysRemaining} days left
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Dynamic setup contents panel */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl text-xs font-bold">
              {error}
            </div>
          )}

          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 min-h-[520px] flex flex-col justify-between">
            <div>
              {/* Step 0: Welcome Screen */}
              {activeStep?.id === 'welcome' && (
                <div className="space-y-6 text-center py-12 max-w-lg mx-auto">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto shadow-md">
                    <Building2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">Welcome to AI-CMS</h2>
                    <p className="text-sm font-medium text-slate-400 mt-2">Congratulations! Your clinic has been successfully approved.</p>
                  </div>

                  <div className="p-6 bg-slate-50 border border-slate-150 rounded-3xl text-left space-y-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 font-medium">Clinic Name</span>
                      <span className="font-bold text-slate-800">{flowData?.clinicName}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 font-medium">Plan Subscribed</span>
                      <span className="font-bold text-blue-600">{flowData?.planName}</span>
                    </div>
                    {flowData?.activeTrials?.length > 0 && (
                      <div className="pt-2 border-t border-slate-200">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase block mb-1">Premium Trial Features Included</span>
                        <div className="flex flex-wrap gap-1.5">
                          {flowData.activeTrials.map(t => (
                            <span key={t.featureCode} className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-[9px] font-bold">
                              {t.featureCode.replace('_', ' ').toUpperCase()} ({t.daysRemaining}d)
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <button type="button" onClick={handleNext}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-md shadow-blue-100">
                    Start Setup <ArrowRight className="w-4.5 h-4.5" />
                  </button>
                </div>
              )}

              {/* Doctors setup step */}
              {activeStep?.id === 'doctors' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-start pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">Doctor Setup</h3>
                      <p className="text-xs text-slate-400 mt-1">Add medical practitioners up to your plan limit ({flowData?.limits?.maxDoctors} maximum).</p>
                    </div>
                    {doctors.length < flowData?.limits?.maxDoctors && (
                      <button onClick={() => setDoctors([...doctors, { fullName: '', email: '', phone: '' }])}
                        className="px-3.5 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition flex items-center gap-1 ">
                        <Plus className="w-4 h-4" /> Add Doctor
                      </button>
                    )}
                  </div>

                  <div className="space-y-6 max-h-[350px] overflow-y-auto pr-2">
                    {doctors.map((doc, idx) => (
                      <div key={idx} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl relative space-y-4">
                        {doctors.length > 1 && (
                          <button onClick={() => setDoctors(doctors.filter((_, i) => i !== idx))} className="absolute top-4 right-4 text-slate-400 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">Doctor #{idx + 1}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">Doctor Name *</label>
                            <input type="text" value={doc.fullName} onChange={(e) => { const u = [...doctors]; u[idx].fullName = e.target.value; setDoctors(u); }}
                              placeholder="e.g. Dr. Rahul Sharma" className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600 text-xs text-gray-800" required />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">Email Address *</label>
                            <input type="email" value={doc.email} onChange={(e) => { const u = [...doctors]; u[idx].email = e.target.value; setDoctors(u); }}
                              placeholder="doctor@domain.com" className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600 text-xs text-gray-800" required />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">Mobile Number *</label>
                            <input type="tel" value={doc.phone} onChange={(e) => { const u = [...doctors]; u[idx].phone = e.target.value; setDoctors(u); }}
                              placeholder="e.g. 9876543210" className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600 text-xs text-gray-800" required />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Department Setup */}
              {activeStep?.id === 'departments' && (
                <div className="space-y-6">
                  <div className="pb-4 border-b border-slate-100">
                    <h3 className="text-lg font-black text-slate-900">Clinic Departments</h3>
                    <p className="text-xs text-slate-400 mt-1">Configure internal hospital sections (Limit: {flowData?.limits?.maxDepartments}).</p>
                  </div>

                  <div className="flex gap-3">
                    <input type="text" value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)}
                      placeholder="e.g. Cardiology" className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-xs" />
                    <button type="button" onClick={() => { if (newDeptName.trim() && departments.length < flowData?.limits?.maxDepartments) { setDepartments([...departments, newDeptName.trim()]); setNewDeptName(''); } }}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition">
                      Add
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {departments.map(dept => (
                      <span key={dept} className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
                        {dept}
                        <button type="button" onClick={() => setDepartments(departments.filter(d => d !== dept))} className="text-slate-400 hover:text-red-500 font-bold ml-1">✕</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Branch Setup */}
              {activeStep?.id === 'branches' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-start pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">Branch Offices Setup</h3>
                      <p className="text-xs text-slate-400 mt-1">Setup sub-branches supported by your plan (Limit: {flowData?.limits?.maxBranches}).</p>
                    </div>
                    {branches.length < flowData?.limits?.maxBranches && (
                      <button onClick={() => setBranches([...branches, { name: '', code: '', phone: '', address: { street: '', city: '', state: '', country: 'India' } }])}
                        className="px-3.5 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition flex items-center gap-1">
                        <Plus className="w-4 h-4" /> Add Branch
                      </button>
                    )}
                  </div>

                  <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
                    {branches.map((b, idx) => (
                      <div key={idx} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl relative space-y-4">
                        {branches.length > 1 && (
                          <button onClick={() => setBranches(branches.filter((_, i) => i !== idx))} className="absolute top-4 right-4 text-slate-400 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <h4 className="text-xs font-bold text-slate-650">Branch #{idx + 1}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">Branch Name *</label>
                            <input type="text" value={b.name} onChange={(e) => { const u = [...branches]; u[idx].name = e.target.value; setBranches(u); }}
                              placeholder="Name" className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs" required />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">Unique Branch Code *</label>
                            <input type="text" value={b.code} onChange={(e) => { const u = [...branches]; u[idx].code = e.target.value.toUpperCase(); setBranches(u); }}
                              placeholder="e.g. BR02" className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs" required />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Staff Setup */}
              {activeStep?.id === 'staff' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-start pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">Staff Accounts</h3>
                      <p className="text-xs text-slate-400 mt-1">Configure clinical desk staff, billing receptionists, etc (Limit: {flowData?.limits?.maxStaff}).</p>
                    </div>
                    {staffList.length < flowData?.limits?.maxStaff && (
                      <button onClick={() => setStaffList([...staffList, { name: '', email: '', phone: '', role: 'RECEPTIONIST' }])}
                        className="px-3.5 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition flex items-center gap-1 text-gray-800">
                        <Plus className="w-4 h-4" /> Add Staff
                      </button>
                    )}
                  </div>

                  <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
                    {staffList.map((st, idx) => (
                      <div key={idx} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl relative grid grid-cols-1 md:grid-cols-2 gap-4">
                        {staffList.length > 1 && (
                          <button onClick={() => setStaffList(staffList.filter((_, i) => i !== idx))} className="absolute top-4 right-4 text-slate-400 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Full Name *</label>
                          <input type="text" value={st.name} onChange={(e) => { const u = [...staffList]; u[idx].name = e.target.value; setStaffList(u); }}
                            className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-gray-800" required />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Staff Role *</label>
                          <select value={st.role} onChange={(e) => { const u = [...staffList]; u[idx].role = e.target.value; setStaffList(u); }}
                            className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-gray-800">
                            <option value="RECEPTIONIST">Receptionist</option>
                            <option value="PHARMACIST">Pharmacist</option>
                            <option value="LAB_TECHNICIAN">Lab Technician</option>
                            <option value="NURSE">Nurse</option>
                            <option value="ACCOUNTANT">Accountant</option>
                            <option value="CLINIC_MANAGER">Clinic Manager</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Email Address *</label>
                          <input type="email" value={st.email} onChange={(e) => { const u = [...staffList]; u[idx].email = e.target.value; setStaffList(u); }}
                            className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-gray-800" required />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Mobile Number *</label>
                          <input type="tel" value={st.phone} onChange={(e) => { const u = [...staffList]; u[idx].phone = e.target.value; setStaffList(u); }}
                            placeholder="Mobile number" className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-gray-800" required />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pharmacy Setup */}
              {activeStep?.id === 'pharmacy' && (
                <div className="space-y-6">
                  <div className="pb-4 border-b border-slate-100">
                    <h3 className="text-lg font-black text-slate-900">Pharmacy Setup</h3>
                    <p className="text-xs text-slate-400 mt-1">Configure your pharmaceutical desk parameters.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Pharmacy Name</label>
                      <input type="text" value={pharmacyName} onChange={(e) => setPharmacyName(e.target.value)}
                        placeholder="e.g. LifeCare Pharmacy" className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-gray-800" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">GST/TAX Registration Number</label>
                      <input type="text" value={pharmacyGst} onChange={(e) => setPharmacyGst(e.target.value)}
                        placeholder="GSTIN Number" className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-gray-800" />
                    </div>
                  </div>
                </div>
              )}

              {/* Laboratory Setup */}
              {activeStep?.id === 'laboratory' && (
                <div className="space-y-6">
                  <div className="pb-4 border-b border-slate-100">
                    <h3 className="text-lg font-black text-slate-900">Laboratory Setup</h3>
                    <p className="text-xs text-slate-400 mt-1">Configure diagnostic center parameters.</p>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Diagnostic Laboratory Name</label>
                    <input type="text" value={labName} onChange={(e) => setLabName(e.target.value)}
                      placeholder="e.g. PathLab Diagnostics" className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-gray-800" />
                  </div>
                </div>
              )}

              {/* AI Config */}
              {activeStep?.id === 'ai' && (
                <div className="space-y-6">
                  <div className="pb-4 border-b border-slate-100">
                    <h3 className="text-lg font-black text-slate-900">AI Modules Configurations</h3>
                    <p className="text-xs text-slate-400 mt-1">Enable smart clinical features matching your plan features.</p>
                  </div>
                  <div className="space-y-4">
                    <label className="flex items-center gap-3 p-4 bg-slate-50 hover:bg-slate-100/50 rounded-2xl border border-slate-150 cursor-pointer transition">
                      <input type="checkbox" checked={enabledAiFeatures.symptom_checker} onChange={(e) => setEnabledAiFeatures({ ...enabledAiFeatures, symptom_checker: e.target.checked })} />
                      <div>
                        <span className="block text-xs font-bold text-slate-800">AI Symptom Checker</span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">Assists clinical check-ins with symptoms suggestions</span>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-4 bg-slate-50 hover:bg-slate-100/50 rounded-2xl border border-slate-150 cursor-pointer transition">
                      <input type="checkbox" checked={enabledAiFeatures.consultation_assistant} onChange={(e) => setEnabledAiFeatures({ ...enabledAiFeatures, consultation_assistant: e.target.checked })} />
                      <div>
                        <span className="block text-xs font-bold text-slate-800">AI Consultation Assistant</span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">Helps generating voice-to-prescription records</span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Online Consultation */}
              {activeStep?.id === 'online_consultation' && (
                <div className="space-y-6">
                  <div className="pb-4 border-b border-slate-100">
                    <h3 className="text-lg font-black text-slate-900">Video Consultations Setup</h3>
                    <p className="text-xs text-slate-400 mt-1">Configure standard online consultation parameters.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Meeting Provider</label>
                      <select value={videoConfig.provider} onChange={(e) => setVideoConfig({ ...videoConfig, provider: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                        <option value="Zoom">Zoom Meetings</option>
                        <option value="GoogleMeet">Google Meet</option>
                        <option value="BuiltIn">AICMS Telehealth</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Default Consultation Fee</label>
                      <input type="number" value={videoConfig.defaultFee} onChange={(e) => setVideoConfig({ ...videoConfig, defaultFee: Number(e.target.value) })}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Duration (Mins)</label>
                      <input type="number" value={videoConfig.duration} onChange={(e) => setVideoConfig({ ...videoConfig, duration: Number(e.target.value) })}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
                    </div>
                  </div>
                </div>
              )}

              {/* Working days schedule */}
              {activeStep?.id === 'working_days' && (
                <div className="space-y-6">
                  <div className="pb-4 border-b border-slate-100">
                    <h3 className="text-lg font-black text-slate-900">Working timings</h3>
                    <p className="text-xs text-slate-400 mt-1">Configure hospital standard operating timings.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Working Days</label>
                      <select value={workingTimings.dayRange} onChange={(e) => setWorkingTimings({ ...workingTimings, dayRange: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-gray-800">
                        <option value="Monday - Friday">Monday - Friday</option>
                        <option value="Monday - Saturday">Monday - Saturday</option>
                        <option value="Everyday">Everyday</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Start Time</label>
                        <input type="time" value={workingTimings.startTime} onChange={(e) => setWorkingTimings({ ...workingTimings, startTime: e.target.value })}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-gray-800" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">End Time</label>
                        <input type="time" value={workingTimings.endTime} onChange={(e) => setWorkingTimings({ ...workingTimings, endTime: e.target.value })}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-gray-800" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Review & Launch */}
              {activeStep?.id === 'review' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="pb-4 border-b border-slate-100">
                    <h3 className="text-lg font-black text-slate-900">Review & Launch</h3>
                    <p className="text-xs text-slate-400 mt-1">Verify all configurations. Your setup will go live instantly.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Practitioners */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                      <span className="text-slate-450 block font-medium">Practitioners Configured</span>
                      <span className="font-extrabold text-slate-800 text-sm">
                        {doctors.filter(d => d.fullName?.trim() && d.email?.trim()).length} Doctors added
                      </span>
                    </div>

                    {/* Support Staff */}
                    {flowData?.limits?.maxStaff > 0 && (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                        <span className="text-slate-450 block font-medium">Support Staff Configured</span>
                        <span className="font-extrabold text-slate-800 text-sm">
                          {staffList.filter(s => s.name?.trim() && s.email?.trim()).length} Staff accounts added
                        </span>
                      </div>
                    )}

                    {/* Branches */}
                    {flowData?.limits?.maxBranches > 0 && (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                        <span className="text-slate-450 block font-medium">Branches Configured</span>
                        <span className="font-extrabold text-slate-800 text-sm">
                          {branches.filter(b => b.name?.trim() && b.code?.trim()).length} Sub-branches created
                        </span>
                      </div>
                    )}

                    {/* Operating hours */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                      <span className="text-slate-450 block font-medium">Standard Hours</span>
                      <span className="font-extrabold text-slate-800 text-sm">{workingTimings.dayRange} ({workingTimings.startTime} - {workingTimings.endTime})</span>
                    </div>

                    {/* Pharmacy Setup */}
                    {flowData?.features?.pharmacy && (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                        <span className="text-slate-450 block font-medium">Pharmacy Integration</span>
                        <span className="font-extrabold text-slate-800 text-sm">
                          {pharmacyName ? `${pharmacyName} (GST: ${pharmacyGst || 'N/A'})` : 'Not configured'}
                        </span>
                      </div>
                    )}

                    {/* Laboratory Setup */}
                    {flowData?.features?.labs && (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                        <span className="text-slate-450 block font-medium">Laboratory Integration</span>
                        <span className="font-extrabold text-slate-800 text-sm">
                          {labName ? labName : 'Not configured'}
                        </span>
                      </div>
                    )}

                    {/* AI Configuration */}
                    {flowData?.features?.ai_analytics && (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                        <span className="text-slate-450 block font-medium">AI Clinical Modules</span>
                        <span className="font-extrabold text-slate-800 text-sm">
                          {Object.entries(enabledAiFeatures)
                            .filter(([_, enabled]) => enabled)
                            .map(([key]) => key.replace('_', ' '))
                            .join(', ') || 'None enabled'}
                        </span>
                      </div>
                    )}

                    {/* Video Consultation */}
                    {flowData?.features?.telemedicine && (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                        <span className="text-slate-450 block font-medium">Video Consultation</span>
                        <span className="font-extrabold text-slate-800 text-sm">
                          {videoConfig.provider} (Fee: ₹{videoConfig.defaultFee}, Duration: {videoConfig.duration} mins)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* Step actions buttons */}
            {activeStep?.id !== 'welcome' && (
              <div className="flex justify-between items-center border-t border-slate-100 pt-6 mt-8">
                <button type="button" onClick={handleBack}
                  className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-800 font-bold text-xs transition flex items-center gap-1.5">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>

                {currentStepIdx < steps.length - 1 ? (
                  <button type="button" onClick={handleNext}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-blue-50">
                    Continue <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button type="button" onClick={handleSubmitOnboarding} disabled={saving}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-50 disabled:opacity-50">
                    {saving ? 'Activating Portal...' : 'Finish & Go to Dashboard'} <Sparkles className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ClinicOnboarding;
