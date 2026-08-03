import { useState, useEffect } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { authApi } from '../lib/api';
import {
  Shield, Lock, Mail, Users, Eye, EyeOff, Globe, Info, AlertCircle, X,
  Building2, Activity, Smartphone, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';

import signinSidebar from '../assets/signinsidebar.jpeg';

const LoginPage = () => {
  const { login, isAuthenticated, loading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const typeParam = queryParams.get('type');

  const [activeTab, setActiveTab] = useState(typeParam || 'clinic');
  const [form, setForm] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [mode, setMode] = useState('login');
  const [resetForm, setResetForm] = useState({ email: '', password: '', confirmPassword: '' });
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);

  useEffect(() => {
    if (typeParam) setActiveTab(typeParam);
  }, [typeParam]);

  if (isAuthenticated && !loading) {
    return <Navigate to={user?.role ? '/dashboard' : '/'} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const authData = await login({ ...form, portal: activeTab });
      if (authData?.requiresOtp) {
        const route = authData.role === 'DOCTOR' ? '/doctor-verify-otp' : '/staff-verify-otp';
        navigate(route, { state: { email: authData.email }, replace: true });
        return;
      }
      const userRole = authData?.user?.role;
      const clinic = authData?.user?.clinic;

      if (userRole === 'SUPER_ADMIN') { navigate('/dashboard', { replace: true }); return; }

      if (activeTab === 'patient' && userRole !== 'PATIENT') {
        setError('This account is not registered as a Patient. Please sign in using the correct portal.');
        setSubmitting(false); return;
      }
      if (activeTab === 'staff' && userRole === 'PATIENT') {
        setError('This account is not authorized for the Staff Portal. Please use the Patient Sign In page.');
        setSubmitting(false); return;
      }
      if (activeTab === 'staff' && userRole === 'ADMIN') {
        setError('This account belongs to a Clinic Administrator. Please use the Clinic Portal Login.');
        setSubmitting(false); return;
      }
      if (activeTab === 'clinic' && userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
        setError('This account is not registered as a Clinic Admin. Please sign in using the correct portal.');
        setSubmitting(false); return;
      }

      if (userRole === 'ADMIN' && clinic) {
        const { approvalStatus, subscription, isOnboardingCompleted } = clinic;
        if (approvalStatus === 'pending_approval') { navigate('/clinic/status', { replace: true }); return; }
        if (approvalStatus === 'rejected') { navigate('/clinic/corrections', { replace: true }); return; }
        if (approvalStatus === 'suspended' || subscription?.status === 'Suspended') { navigate('/clinic/suspended', { replace: true }); return; }
        if (subscription?.status === 'Expired') { navigate('/clinic/expired', { replace: true }); return; }
        if (approvalStatus === 'approved' && !isOnboardingCompleted) { navigate('/clinic/onboarding', { replace: true }); return; }
      }

      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (loginError) {
      setError(loginError?.response?.data?.message || loginError?.message || 'Invalid email or password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetSubmit = async (event) => {
    event.preventDefault();
    setResetSubmitting(true);
    setResetError('');
    setResetSuccess('');

    if (resetForm.password !== resetForm.confirmPassword) {
      setResetError('Passwords do not match.');
      setResetSubmitting(false);
      return;
    }

    try {
      await authApi.resetPassword({ email: resetForm.email, password: resetForm.password });
      setResetSuccess('Password has been reset successfully. You can now sign in.');
      setResetForm({ email: '', password: '', confirmPassword: '' });
    } catch (err) {
      setResetError(err.response?.data?.message || err.message || 'Failed to reset password.');
    } finally {
      setResetSubmitting(false);
    }
  };

  const portalConfig = {
    clinic: {
      title: 'Welcome back,\nClinic Administrator',
      sub: 'Manage your clinics, staff, operations and business from one secure platform.',
      btn: 'Login as Clinic Admin',
      forgotTitle: 'Reset Clinic Admin Password',
    },
    staff: {
      title: 'Welcome back,\nDoctor & Staff',
      sub: 'Access your assigned clinic workspace securely.',
      btn: 'Login as Doctor / Staff',
      infoCard: 'Doctor and Staff accounts are provisioned by your clinic administrator.',
      forgotTitle: 'Reset Doctor / Staff Password',
    },
    patient: {
      title: 'Welcome back,\nPatient',
      sub: 'Access appointments, prescriptions and reports securely.',
      btn: 'Login as Patient',
      infoCard: 'Patient accounts are securely created by your healthcare provider. Please contact your clinic if you do not have login credentials.',
      forgotTitle: 'Reset Patient Password',
    },
  };

  const info = portalConfig[activeTab] || portalConfig.clinic;

  const tabs = [
    { key: 'clinic', label: 'Clinic Admin', icon: <Building2 size={14} /> },
    { key: 'staff', label: 'Doctor / Staff', icon: <Users size={14} /> },
    { key: 'patient', label: 'Patient', icon: <Activity size={14} /> },
  ];

  return (
    <div className="min-h-screen w-screen bg-[#F5F7FB] flex items-center justify-center p-3 sm:py-3 sm:px-4">
      <div
        className="w-[96vw] bg-white overflow-hidden flex shadow-2xl transition-all duration-300"
        style={{
          maxWidth: '1780px',
          minHeight: '940px',
          height: '96vh',
          borderRadius: '28px',
          boxShadow: '0 25px 70px rgba(15, 23, 42, 0.12)',
          margin: '12px auto',
        }}
      >
        {/* ── LEFT PANEL: signinsidebar.jpeg ── */}
        <div
          className="hidden lg:block"
          style={{ width: '52%', flexShrink: 0, position: 'relative', overflow: 'hidden', borderRadius: '28px 0 0 28px' }}
        >
          <img
            src={signinSidebar}
            alt="AI-CMS Pehal Healthcare"
            className="absolute inset-0 w-full h-full object-cover object-center block"
          />
        </div>

        {/* ── RIGHT PANEL: Dynamic Login ── */}
        <div
          className="flex-grow flex flex-col justify-between overflow-y-auto bg-white"
          style={{ padding: '64px', minWidth: 0, width: '48%' }}
        >
          {/* Language Selector */}
          <div className="flex justify-end mb-6">
            <button className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 border border-gray-200 rounded-xl px-3 py-2 hover:bg-gray-50 transition">
              <Globe size={13} />
              English
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </button>
          </div>

          <div className="max-w-[720px] w-full mx-auto my-auto space-y-6">
            {/* Segmented Tab Selector */}
            {mode === 'login' && (
              <div
                className="flex mb-8 mx-auto"
                style={{
                  background: '#f3f4f6',
                  borderRadius: '999px',
                  padding: '5px',
                  gap: '4px',
                  maxWidth: '720px',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)'
                }}
              >
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => { setActiveTab(tab.key); setError(''); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-black transition-all duration-300"
                    style={{
                      borderRadius: '999px',
                      background: activeTab === tab.key ? 'linear-gradient(to right, #00B96B, #05403A)' : 'transparent',
                      color: activeTab === tab.key ? '#ffffff' : '#4b5563',
                      boxShadow: activeTab === tab.key ? '0 4px 12px rgba(0,185,107,0.25)' : 'none',
                    }}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {/* Heading */}
            <div className="mb-6">
              <h1
                className="font-black text-gray-900 leading-tight whitespace-pre-line"
                style={{ fontSize: '32px', marginBottom: '8px' }}
              >
                {mode === 'login' ? info.title : info.forgotTitle}
              </h1>
              <p className="text-sm text-gray-500 leading-relaxed">
                {mode === 'login' ? info.sub : 'Please enter your email and confirm your new password below.'}
              </p>
            </div>

            {/* Inline Error Alert */}
            {error && (
              <div
                className="flex items-start gap-3 mb-4 relative"
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  color: '#dc2626',
                }}
              >
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span className="text-xs font-semibold pr-6">{error}</span>
                <button
                  onClick={() => setError('')}
                  className="absolute right-3 top-3 text-red-300 hover:text-red-500 transition"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* ── FORM ── */}
            {mode === 'login' ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">Email or Mobile</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="Enter your email or mobile number"
                      required
                      className="w-full text-sm text-gray-800 placeholder-gray-400 font-medium bg-white transition"
                      style={{
                        paddingLeft: '44px',
                        paddingRight: '16px',
                        height: '56px',
                        border: '1.5px solid #E5E7EB',
                        borderRadius: '14px',
                        outline: 'none',
                      }}
                      onFocus={(e) => { e.target.style.borderColor = '#00B96B'; e.target.style.boxShadow = '0 0 0 3px rgba(0,185,107,0.1)'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="Enter your password"
                      required
                      className="w-full text-sm text-gray-800 placeholder-gray-400 font-medium bg-white transition"
                      style={{
                        paddingLeft: '44px',
                        paddingRight: '60px',
                        height: '56px',
                        border: '1.5px solid #E5E7EB',
                        borderRadius: '14px',
                        outline: 'none',
                      }}
                      onFocus={(e) => { e.target.style.borderColor = '#00B96B'; e.target.style.boxShadow = '0 0 0 3px rgba(0,185,107,0.1)'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none'; }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-bold text-gray-450 hover:text-gray-650 transition cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                {/* Remember + Forgot */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberDevice}
                      onChange={(e) => setRememberDevice(e.target.checked)}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: '#00B96B' }}
                    />
                    <span className="text-xs font-semibold text-gray-600">Remember this device</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => { setMode('forgot_password'); setError(''); setResetError(''); setResetSuccess(''); }}
                    className="text-xs font-bold transition hover:opacity-80"
                    style={{ color: '#00B96B' }}
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Primary Login Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 text-sm font-black text-white transition-all duration-300"
                  style={{
                    background: submitting ? '#86efac' : 'linear-gradient(to right, #00B96B, #05403A)',
                    borderRadius: '14px',
                    height: '56px',
                    boxShadow: '0 4px 14px rgba(0,185,107,0.25)',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submitting ? (
                    <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Lock size={15} />
                      {info.btn}
                    </>
                  )}
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3 py-1">
                  <span className="h-px bg-gray-200 flex-1" />
                  <span className="text-xs font-semibold text-gray-400">or login with</span>
                  <span className="h-px bg-gray-200 flex-1" />
                </div>

                {/* OTP Button */}
                <button
                  type="button"
                  onClick={() => toast('OTP login coming soon')}
                  className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-gray-700 bg-white transition hover:bg-gray-50"
                  style={{
                    border: '1.5px solid #E5E7EB',
                    borderRadius: '14px',
                    height: '56px',
                    cursor: 'pointer',
                  }}
                >
                  <Smartphone size={15} className="text-gray-500" />
                  Login using OTP
                </button>

                {/* SSO Button */}
                <button
                  type="button"
                  onClick={() => toast('SSO coming soon')}
                  className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-gray-700 bg-white transition hover:bg-gray-50"
                  style={{
                    border: '1.5px solid #E5E7EB',
                    borderRadius: '14px',
                    height: '56px',
                    cursor: 'pointer',
                  }}
                >
                  <Shield size={15} className="text-gray-500" />
                  Continue with Single Sign-On (SSO)
                </button>

                {/* Info / Security Card */}
                {activeTab === 'clinic' ? (
                  <div
                    className="flex items-start gap-3"
                    style={{
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '16px',
                      padding: '14px 16px',
                    }}
                  >
                    <Shield size={15} className="text-green-600 shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold text-gray-600 leading-relaxed">
                      Enterprise-grade encryption protects your organization and patient data.
                    </p>
                  </div>
                ) : (
                  info.infoCard && (
                    <div
                      className="flex items-start gap-3"
                      style={{
                        background: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: '16px',
                        padding: '14px 16px',
                      }}
                    >
                      <Info size={15} className="text-gray-400 shrink-0 mt-0.5" />
                      <p className="text-xs font-semibold text-gray-500 leading-relaxed">
                        {info.infoCard}
                      </p>
                    </div>
                  )
                )}

                {/* Setup Clinic CTA — only for clinic tab */}
                {activeTab === 'clinic' && (
                  <div
                    className="flex items-center justify-between shadow-sm"
                    style={{
                      border: '1.5px solid #E5E7EB',
                      borderRadius: '18px',
                      padding: '16px 20px',
                      background: '#ffffff',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex items-center justify-center shrink-0"
                        style={{
                          width: '42px',
                          height: '42px',
                          background: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          borderRadius: '10px',
                        }}
                      >
                        <Building2 size={18} className="text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-green-700 mb-0.5">Don't have a clinic yet?</p>
                        <p className="text-[11px] text-gray-500 font-medium">Set up your clinic in minutes and start managing your healthcare operations.</p>
                      </div>
                    </div>
                    <Link
                      to="/set-your-clinic"
                      className="shrink-0 flex items-center gap-1 text-xs font-bold transition ml-3 hover:opacity-80"
                      style={{
                        color: '#00B96B',
                        border: '1.5px solid #00B96B',
                        borderRadius: '10px',
                        padding: '8px 14px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Setup Your Clinic <ArrowRight size={12} />
                    </Link>
                  </div>
                )}
              </form>
            ) : (
              /* ── FORGOT PASSWORD FORM ── */
              <form onSubmit={handleResetSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={resetForm.email}
                      onChange={(e) => setResetForm({ ...resetForm, email: e.target.value })}
                      placeholder="Enter your email"
                      required
                      className="w-full text-sm text-gray-800 placeholder-gray-400 font-medium bg-white transition"
                      style={{ paddingLeft: '40px', paddingRight: '16px', height: '56px', border: '1.5px solid #E5E7EB', borderRadius: '14px', outline: 'none' }}
                      onFocus={(e) => { e.target.style.borderColor = '#00B96B'; e.target.style.boxShadow = '0 0 0 3px rgba(0,185,107,0.1)'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      value={resetForm.password}
                      onChange={(e) => setResetForm({ ...resetForm, password: e.target.value })}
                      placeholder="Enter new password"
                      required
                      className="w-full text-sm text-gray-800 placeholder-gray-400 font-medium bg-white transition"
                      style={{ paddingLeft: '40px', paddingRight: '16px', height: '56px', border: '1.5px solid #E5E7EB', borderRadius: '14px', outline: 'none' }}
                      onFocus={(e) => { e.target.style.borderColor = '#00B96B'; e.target.style.boxShadow = '0 0 0 3px rgba(0,185,107,0.1)'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      value={resetForm.confirmPassword}
                      onChange={(e) => setResetForm({ ...resetForm, confirmPassword: e.target.value })}
                      placeholder="Confirm new password"
                      required
                      className="w-full text-sm text-gray-800 placeholder-gray-400 font-medium bg-white transition"
                      style={{ paddingLeft: '40px', paddingRight: '16px', height: '56px', border: '1.5px solid #E5E7EB', borderRadius: '14px', outline: 'none' }}
                      onFocus={(e) => { e.target.style.borderColor = '#00B96B'; e.target.style.boxShadow = '0 0 0 3px rgba(0,185,107,0.1)'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                </div>

                {resetError && (
                  <div className="flex items-start gap-3" style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '14px 16px', color: '#dc2626' }}>
                    <AlertCircle size={15} className="shrink-0 mt-0.5" />
                    <span className="text-xs font-semibold">{resetError}</span>
                  </div>
                )}
                {resetSuccess && (
                  <div className="flex items-start gap-3" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '14px 16px', color: '#15803d' }}>
                    <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
                    <span className="text-xs font-semibold">{resetSuccess}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={resetSubmitting}
                  className="w-full flex items-center justify-center gap-2 text-sm font-black text-white"
                  style={{ background: '#00B96B', borderRadius: '14px', height: '56px', boxShadow: '0 4px 14px rgba(0,185,107,0.3)', cursor: 'pointer' }}
                >
                  {resetSubmitting ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : 'Reset Password'}
                </button>

                <p className="text-center text-xs text-gray-500 font-semibold">
                  Remember your password?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError(''); setResetError(''); setResetSuccess(''); }}
                    className="font-bold"
                    style={{ color: '#00B96B' }}
                  >
                    Sign in here
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
