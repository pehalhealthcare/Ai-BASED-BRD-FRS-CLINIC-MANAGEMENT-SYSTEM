import { useState, useEffect, useRef } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { authApi } from '../lib/api';
import { getDefaultRouteForRole } from '../constants/routes';
import {
  Shield, Lock, Mail, Users, Eye, EyeOff, Globe, Info, AlertCircle, X,
  Building2, Activity, Smartphone, ArrowRight, ArrowLeft, CheckCircle2, RotateCw, Edit3
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
  const [rememberDevice, setRememberDevice] = useState(true);

  // Authentication Method: 'password' | 'otp'
  const [authMethod, setAuthMethod] = useState('password');
  // OTP Steps: 'email' | 'otp'
  const [otpStep, setOtpStep] = useState('email');
  const [otpEmail, setOtpEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputRefs = useRef([]);

  const [mode, setMode] = useState('login'); // 'login' | 'forgot_password'
  const [resetStep, setResetStep] = useState('request'); // 'request' | 'verify' | 'success'
  const [resetForm, setResetForm] = useState({ email: '', password: '', confirmPassword: '' });
  const [resetOtpDigits, setResetOtpDigits] = useState(['', '', '', '', '', '']);
  const [resetCooldown, setResetCooldown] = useState(0);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const resetOtpInputRefs = useRef([]);

  useEffect(() => {
    if (typeParam) setActiveTab(typeParam);
  }, [typeParam]);

  // Resend cooldown timer for Login OTP
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Resend cooldown timer for Password Reset OTP
  useEffect(() => {
    let timer;
    if (resetCooldown > 0) {
      timer = setInterval(() => {
        setResetCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resetCooldown]);

  const getAdminDestination = (clinic) => {
    if (!clinic) return '/clinic-setup/payment';
    const { approvalStatus, subscription, isOnboardingCompleted, paymentStatus } = clinic;
    const isApproved = approvalStatus === 'approved';

    if (approvalStatus === 'suspended' || subscription?.status === 'Suspended') {
      return '/clinic/suspended';
    }
    if (subscription?.status === 'Expired') {
      return '/clinic/expired';
    }
    if (!isApproved && (paymentStatus === 'NOT_SUBMITTED' || paymentStatus === 'REJECTED')) {
      return '/clinic-setup/payment';
    }
    if (!isApproved && paymentStatus === 'PENDING_VERIFICATION') {
      return '/clinic-setup/payment-status';
    }
    if (approvalStatus === 'pending_approval') {
      return '/clinic-setup/payment-status';
    }
    if (approvalStatus === 'rejected') {
      return '/clinic/corrections';
    }
    if (isApproved && !isOnboardingCompleted) {
      return '/clinic/onboarding';
    }
    return '/dashboard';
  };

  if (isAuthenticated && !loading) {
    if (user?.role === 'ADMIN') {
      return <Navigate to={getAdminDestination(user?.clinic)} replace />;
    }
    return <Navigate to={getDefaultRouteForRole(user?.role, user)} replace />;
  }

  const handleSuccessfulAuth = (authData) => {
    const userRole = authData?.user?.role;
    const clinic = authData?.user?.clinic;

    if (userRole === 'SUPER_ADMIN') {
      const fromPath = location.state?.from?.pathname;
      const dest = fromPath && fromPath !== '/dashboard' ? fromPath : '/clinics';
      navigate(dest, { replace: true });
      return;
    }

    if (userRole === 'ADMIN') {
      navigate(getAdminDestination(clinic), { replace: true });
      return;
    }

    const fallbackDestination = getDefaultRouteForRole(userRole, authData?.user);
    navigate(location.state?.from?.pathname || fallbackDestination, { replace: true });
  };

  // 1. Password Login Handler
  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const authData = await login({ email: form.email.trim(), password: form.password, portal: activeTab });
      if (authData?.requiresOtp) {
        const route = authData.role === 'DOCTOR' ? '/doctor-verify-otp' : '/staff-verify-otp';
        navigate(route, { state: { email: authData.email }, replace: true });
        return;
      }

      const userRole = authData?.user?.role;
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

      handleSuccessfulAuth(authData);
    } catch (loginError) {
      setError(loginError?.response?.data?.message || loginError?.message || 'Invalid email or password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // 2. OTP Login: Step 1 - Send OTP
  const handleSendOtp = async (event) => {
    if (event) event.preventDefault();
    setError('');

    const targetEmail = otpEmail.trim().toLowerCase();
    if (!targetEmail) {
      setError('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await authApi.sendLoginOtp({
        email: targetEmail,
        portal: activeTab
      });
      toast.success(response?.message || 'Verification code sent to your email!');
      setOtpStep('otp');
      setResendCooldown(30);
      setOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => {
        if (otpInputRefs.current[0]) {
          otpInputRefs.current[0].focus();
        }
      }, 100);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "We couldn't send the OTP right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // 3. OTP Login: Step 2 - Verify OTP & Login
  const handleVerifyOtp = async (event) => {
    if (event) event.preventDefault();
    setError('');

    const otpString = otpDigits.join('').trim();
    if (otpString.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await authApi.verifyLoginOtp({
        email: otpEmail.trim().toLowerCase(),
        otp: otpString,
        portal: activeTab
      });

      const authData = response?.data || response;
      await login(authData);
      toast.success('Login successful!');
      handleSuccessfulAuth(authData);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'The OTP you entered is incorrect. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // OTP digit handling
  const handleOtpDigitChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);
    setError('');

    if (digit && index < 5) {
      if (otpInputRefs.current[index + 1]) {
        otpInputRefs.current[index + 1].focus();
      }
    }
  };

  const handleOtpKeyDown = (index, event) => {
    if (event.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        const newDigits = [...otpDigits];
        newDigits[index - 1] = '';
        setOtpDigits(newDigits);
        if (otpInputRefs.current[index - 1]) {
          otpInputRefs.current[index - 1].focus();
        }
      }
    } else if (event.key === 'ArrowLeft' && index > 0) {
      if (otpInputRefs.current[index - 1]) {
        otpInputRefs.current[index - 1].focus();
      }
    } else if (event.key === 'ArrowRight' && index < 5) {
      if (otpInputRefs.current[index + 1]) {
        otpInputRefs.current[index + 1].focus();
      }
    }
  };

  const handleOtpPaste = (event) => {
    event.preventDefault();
    const pasteData = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasteData) {
      const newDigits = [...otpDigits];
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasteData[i] || '';
      }
      setOtpDigits(newDigits);
      const targetIndex = Math.min(pasteData.length, 5);
      if (otpInputRefs.current[targetIndex]) {
        otpInputRefs.current[targetIndex].focus();
      }
    }
  };

  // ════════ PASSWORD RESET HANDLERS (Two-Step Flow) ════════
  // Step 1: Request Password Reset & Send OTP (No DB password change yet!)
  const handleResetRequestSubmit = async (event) => {
    if (event) event.preventDefault();
    setResetError('');
    setResetSuccess('');

    const targetEmail = resetForm.email.trim().toLowerCase();
    if (!targetEmail) {
      setResetError('Please enter your email address.');
      return;
    }

    if (!resetForm.password || resetForm.password.length < 6) {
      setResetError('Password must be at least 6 characters long.');
      return;
    }

    if (resetForm.password !== resetForm.confirmPassword) {
      setResetError('Passwords do not match.');
      return;
    }

    setResetSubmitting(true);
    try {
      const response = await authApi.requestPasswordReset({
        email: targetEmail,
        password: resetForm.password,
        portal: activeTab
      });

      toast.success(response?.message || 'Verification code sent to your email!');
      setResetStep('verify');
      setResetCooldown(30);
      setResetOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => {
        if (resetOtpInputRefs.current[0]) {
          resetOtpInputRefs.current[0].focus();
        }
      }, 100);
    } catch (err) {
      setResetError(err.response?.data?.message || err.message || 'Failed to send password reset code.');
    } finally {
      setResetSubmitting(false);
    }
  };

  // Step 2: Resend Password Reset OTP
  const handleResendResetOtp = async () => {
    setResetError('');
    setResetSubmitting(true);
    try {
      const response = await authApi.requestPasswordReset({
        email: resetForm.email.trim().toLowerCase(),
        password: resetForm.password,
        portal: activeTab
      });
      toast.success(response?.message || 'New verification code sent!');
      setResetCooldown(30);
      setResetOtpDigits(['', '', '', '', '', '']);
      if (resetOtpInputRefs.current[0]) {
        resetOtpInputRefs.current[0].focus();
      }
    } catch (err) {
      setResetError(err.response?.data?.message || err.message || 'Failed to resend verification code.');
    } finally {
      setResetSubmitting(false);
    }
  };

  // Step 3: Verify OTP & Change Password
  const handleResetVerifySubmit = async (event) => {
    if (event) event.preventDefault();
    setResetError('');

    const otpString = resetOtpDigits.join('').trim();
    if (otpString.length !== 6) {
      setResetError('Please enter the complete 6-digit verification code.');
      return;
    }

    setResetSubmitting(true);
    try {
      const response = await authApi.verifyPasswordReset({
        email: resetForm.email.trim().toLowerCase(),
        otp: otpString,
        portal: activeTab
      });

      toast.success(response?.message || 'Password updated successfully!');
      setResetStep('success');
      setResetSuccess(response?.message || 'Your password has been updated successfully.');
    } catch (err) {
      setResetError(err.response?.data?.message || err.message || 'The OTP you entered is incorrect. Please try again.');
    } finally {
      setResetSubmitting(false);
    }
  };

  const handleResetReturnToLogin = () => {
    if (resetForm.email) {
      setForm((prev) => ({ ...prev, email: resetForm.email }));
    }
    setMode('login');
    setResetStep('request');
    setResetForm({ email: '', password: '', confirmPassword: '' });
    setResetOtpDigits(['', '', '', '', '', '']);
    setResetError('');
    setResetSuccess('');
    setError('');
  };

  const handleResetOtpDigitChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...resetOtpDigits];
    newDigits[index] = digit;
    setResetOtpDigits(newDigits);
    setResetError('');

    if (digit && index < 5) {
      if (resetOtpInputRefs.current[index + 1]) {
        resetOtpInputRefs.current[index + 1].focus();
      }
    }
  };

  const handleResetOtpKeyDown = (index, event) => {
    if (event.key === 'Backspace') {
      if (!resetOtpDigits[index] && index > 0) {
        const newDigits = [...resetOtpDigits];
        newDigits[index - 1] = '';
        setResetOtpDigits(newDigits);
        if (resetOtpInputRefs.current[index - 1]) {
          resetOtpInputRefs.current[index - 1].focus();
        }
      }
    } else if (event.key === 'ArrowLeft' && index > 0) {
      if (resetOtpInputRefs.current[index - 1]) {
        resetOtpInputRefs.current[index - 1].focus();
      }
    } else if (event.key === 'ArrowRight' && index < 5) {
      if (resetOtpInputRefs.current[index + 1]) {
        resetOtpInputRefs.current[index + 1].focus();
      }
    }
  };

  const handleResetOtpPaste = (event) => {
    event.preventDefault();
    const pasteData = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasteData) {
      const newDigits = [...resetOtpDigits];
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasteData[i] || '';
      }
      setResetOtpDigits(newDigits);
      const targetIndex = Math.min(pasteData.length, 5);
      if (resetOtpInputRefs.current[targetIndex]) {
        resetOtpInputRefs.current[targetIndex].focus();
      }
    }
  };

  const portalConfig = {
    clinic: {
      title:
        authMethod === 'otp' && otpStep === 'otp'
          ? 'Verify your email'
          : authMethod === 'otp'
          ? 'Login using OTP'
          : 'Welcome back,\nClinic Administrator',
      sub:
        authMethod === 'otp' && otpStep === 'otp'
          ? `We've sent a 6-digit verification code to ${otpEmail || 'your registered email address'}.`
          : 'Manage your clinics, staff, operations and business from one secure platform.',
      btn: 'Login as Clinic Admin',
      forgotTitle: 'Reset Clinic Admin Password',
    },
    staff: {
      title:
        authMethod === 'otp' && otpStep === 'otp'
          ? 'Verify your email'
          : authMethod === 'otp'
          ? 'Login using OTP'
          : 'Welcome back,\nDoctor & Staff',
      sub:
        authMethod === 'otp' && otpStep === 'otp'
          ? `We've sent a 6-digit verification code to ${otpEmail || 'your registered email address'}.`
          : 'Access your assigned clinic workspace securely.',
      btn: 'Login as Doctor / Staff',
      infoCard: 'Doctor and Staff accounts are provisioned by your clinic administrator.',
      forgotTitle: 'Reset Doctor / Staff Password',
    },
    patient: {
      title:
        authMethod === 'otp' && otpStep === 'otp'
          ? 'Verify your email'
          : authMethod === 'otp'
          ? 'Login using OTP'
          : 'Welcome back,\nPatient',
      sub:
        authMethod === 'otp' && otpStep === 'otp'
          ? `We've sent a 6-digit verification code to ${otpEmail || 'your registered email address'}.`
          : 'Access appointments, prescriptions and reports securely.',
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
                    onClick={() => {
                      setActiveTab(tab.key);
                      setError('');
                      setAuthMethod('password');
                      setOtpStep('email');
                      setOtpDigits(['', '', '', '', '', '']);
                    }}
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
                {mode === 'login'
                  ? info.title
                  : resetStep === 'verify'
                  ? 'Verify Your Email'
                  : resetStep === 'success'
                  ? 'Password Reset Successful'
                  : info.forgotTitle || 'Reset Your Password'}
              </h1>
              <p className="text-sm text-gray-500 leading-relaxed">
                {mode === 'login'
                  ? info.sub
                  : resetStep === 'verify'
                  ? `We've sent a 6-digit verification code to your registered email address.`
                  : resetStep === 'success'
                  ? 'Your password has been updated successfully.'
                  : "Enter your registered email and create a new password. We'll verify your email before changing your password."}
              </p>
            </div>

            {/* Inline Error Alert for Login */}
            {error && mode === 'login' && (
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

            {/* ── FORMS ROUTING ── */}
            {mode === 'forgot_password' ? (
              /* ════════ SECURE TWO-STEP FORGOT PASSWORD FLOW ════════ */
              <div className="space-y-6">
                {resetStep === 'request' ? (
                  /* ── Step 1: Email + New Password + Confirm ── */
                  <form onSubmit={handleResetRequestSubmit} className="space-y-4">
                    {/* Email Input */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Email Address</label>
                      <div className="relative">
                        <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="email"
                          value={resetForm.email}
                          onChange={(e) => {
                            setResetForm({ ...resetForm, email: e.target.value });
                            setResetError('');
                          }}
                          placeholder="Enter your registered email address"
                          required
                          className="w-full text-sm text-gray-800 placeholder-gray-400 font-medium bg-white transition"
                          style={{ paddingLeft: '40px', paddingRight: '16px', height: '56px', border: '1.5px solid #E5E7EB', borderRadius: '14px', outline: 'none' }}
                          onFocus={(e) => { e.target.style.borderColor = '#00B96B'; e.target.style.boxShadow = '0 0 0 3px rgba(0,185,107,0.1)'; }}
                          onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none'; }}
                        />
                      </div>
                    </div>

                    {/* New Password */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">New Password</label>
                      <div className="relative">
                        <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type={showResetPassword ? 'text' : 'password'}
                          value={resetForm.password}
                          onChange={(e) => {
                            setResetForm({ ...resetForm, password: e.target.value });
                            setResetError('');
                          }}
                          placeholder="Enter new password (min. 6 characters)"
                          required
                          className="w-full text-sm text-gray-800 placeholder-gray-400 font-medium bg-white transition"
                          style={{ paddingLeft: '40px', paddingRight: '60px', height: '56px', border: '1.5px solid #E5E7EB', borderRadius: '14px', outline: 'none' }}
                          onFocus={(e) => { e.target.style.borderColor = '#00B96B'; e.target.style.boxShadow = '0 0 0 3px rgba(0,185,107,0.1)'; }}
                          onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none'; }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowResetPassword(!showResetPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-gray-600 transition cursor-pointer"
                        >
                          {showResetPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                          {showResetPassword ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Confirm Password</label>
                      <div className="relative">
                        <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type={showResetConfirmPassword ? 'text' : 'password'}
                          value={resetForm.confirmPassword}
                          onChange={(e) => {
                            setResetForm({ ...resetForm, confirmPassword: e.target.value });
                            setResetError('');
                          }}
                          placeholder="Confirm your new password"
                          required
                          className="w-full text-sm text-gray-800 placeholder-gray-400 font-medium bg-white transition"
                          style={{ paddingLeft: '40px', paddingRight: '60px', height: '56px', border: '1.5px solid #E5E7EB', borderRadius: '14px', outline: 'none' }}
                          onFocus={(e) => { e.target.style.borderColor = '#00B96B'; e.target.style.boxShadow = '0 0 0 3px rgba(0,185,107,0.1)'; }}
                          onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none'; }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowResetConfirmPassword(!showResetConfirmPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-gray-600 transition cursor-pointer"
                        >
                          {showResetConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                          {showResetConfirmPassword ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>

                    {/* Inline Error Alert */}
                    {resetError && (
                      <div className="flex items-start gap-3 relative" style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '14px 16px', color: '#dc2626' }}>
                        <AlertCircle size={15} className="shrink-0 mt-0.5" />
                        <span className="text-xs font-semibold pr-6">{resetError}</span>
                        <button onClick={() => setResetError('')} className="absolute right-3 top-3 text-red-300 hover:text-red-500 transition">
                          <X size={14} />
                        </button>
                      </div>
                    )}

                    {/* Continue & Verify Email Button */}
                    <button
                      type="submit"
                      disabled={resetSubmitting}
                      className="w-full flex items-center justify-center gap-2 text-sm font-black text-white transition-all duration-300"
                      style={{
                        background: resetSubmitting ? '#86efac' : 'linear-gradient(to right, #00B96B, #05403A)',
                        borderRadius: '14px',
                        height: '56px',
                        boxShadow: '0 4px 14px rgba(0,185,107,0.25)',
                        cursor: resetSubmitting ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {resetSubmitting ? (
                        <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Mail size={16} />
                          Continue & Verify Email
                        </>
                      )}
                    </button>

                    <p className="text-center text-xs text-gray-500 font-semibold pt-1">
                      Remember your password?{' '}
                      <button
                        type="button"
                        onClick={handleResetReturnToLogin}
                        className="font-bold cursor-pointer"
                        style={{ color: '#00B96B' }}
                      >
                        Sign in here
                      </button>
                    </p>
                  </form>
                ) : resetStep === 'verify' ? (
                  /* ── Step 2: 6-Digit OTP Verification Screen ── */
                  <form onSubmit={handleResetVerifySubmit} className="space-y-6">
                    {/* Display user email with change button */}
                    <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <Mail size={15} className="text-gray-500 shrink-0" />
                        <span className="text-xs font-bold text-gray-800 truncate">{resetForm.email}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setResetStep('request');
                          setResetOtpDigits(['', '', '', '', '', '']);
                          setResetError('');
                        }}
                        className="text-xs font-bold text-[#00B96B] hover:underline shrink-0 flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 size={12} />
                        Change email
                      </button>
                    </div>

                    {/* 6 Digit Input Boxes */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-3 text-center">
                        Enter the 6-digit verification code sent to your email
                      </label>
                      <div className="flex justify-center items-center gap-2 sm:gap-3" onPaste={handleResetOtpPaste}>
                        {resetOtpDigits.map((digit, index) => (
                          <input
                            key={index}
                            id={`reset-otp-${index}`}
                            ref={(el) => (resetOtpInputRefs.current[index] = el)}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleResetOtpDigitChange(index, e.target.value)}
                            onKeyDown={(e) => handleResetOtpKeyDown(index, e)}
                            className="w-12 h-14 sm:w-14 sm:h-16 text-center text-xl font-black text-gray-900 bg-white border-2 rounded-xl outline-none transition"
                            style={{
                              borderColor: digit ? '#00B96B' : '#E5E7EB',
                              boxShadow: digit ? '0 0 0 3px rgba(0,185,107,0.15)' : 'none',
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = '#00B96B';
                              e.target.style.boxShadow = '0 0 0 3px rgba(0,185,107,0.15)';
                            }}
                            onBlur={(e) => {
                              if (!digit) {
                                e.target.style.borderColor = '#E5E7EB';
                                e.target.style.boxShadow = 'none';
                              }
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Inline Error Alert */}
                    {resetError && (
                      <div className="flex items-start gap-3 relative" style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '14px 16px', color: '#dc2626' }}>
                        <AlertCircle size={15} className="shrink-0 mt-0.5" />
                        <span className="text-xs font-semibold pr-6">{resetError}</span>
                        <button onClick={() => setResetError('')} className="absolute right-3 top-3 text-red-300 hover:text-red-500 transition">
                          <X size={14} />
                        </button>
                      </div>
                    )}

                    {/* Verify & Reset Password Button */}
                    <button
                      type="submit"
                      disabled={resetSubmitting || resetOtpDigits.join('').length !== 6}
                      className="w-full flex items-center justify-center gap-2 text-sm font-black text-white transition-all duration-300"
                      style={{
                        background: (resetSubmitting || resetOtpDigits.join('').length !== 6)
                          ? '#86efac'
                          : 'linear-gradient(to right, #00B96B, #05403A)',
                        borderRadius: '14px',
                        height: '56px',
                        boxShadow: '0 4px 14px rgba(0,185,107,0.25)',
                        cursor: (resetSubmitting || resetOtpDigits.join('').length !== 6) ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {resetSubmitting ? (
                        <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Lock size={15} />
                          Verify & Reset Password
                        </>
                      )}
                    </button>

                    {/* Resend OTP Section */}
                    <div className="text-center text-xs text-gray-500 font-medium">
                      Didn't receive the code?{' '}
                      {resetCooldown > 0 ? (
                        <span className="font-bold text-gray-400">
                          Resend OTP in {resetCooldown}s
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResendResetOtp}
                          disabled={resetSubmitting}
                          className="font-bold text-[#00B96B] hover:underline cursor-pointer inline-flex items-center gap-1"
                        >
                          <RotateCw size={12} className={resetSubmitting ? 'animate-spin' : ''} />
                          Resend OTP
                        </button>
                      )}
                    </div>

                    {/* Switch back to Login */}
                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={handleResetReturnToLogin}
                        className="text-xs font-bold text-gray-600 hover:text-gray-900 transition flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                      >
                        <ArrowLeft size={14} /> Back to Sign In
                      </button>
                    </div>
                  </form>
                ) : (
                  /* ── Step 3: Password Reset Successful Screen ── */
                  <div className="space-y-6 text-center py-4">
                    <div className="w-16 h-16 bg-green-50 border-2 border-green-200 rounded-full flex items-center justify-center mx-auto text-[#00B96B]">
                      <CheckCircle2 size={36} />
                    </div>

                    <div>
                      <h2 className="text-lg font-black text-gray-900 mb-1">Password Updated Successfully</h2>
                      <p className="text-xs text-gray-500 leading-relaxed max-w-sm mx-auto">
                        Your account password has been updated. You can now sign in using your new credentials.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleResetReturnToLogin}
                      className="w-full flex items-center justify-center gap-2 text-sm font-black text-white transition-all duration-300"
                      style={{
                        background: 'linear-gradient(to right, #00B96B, #05403A)',
                        borderRadius: '14px',
                        height: '56px',
                        boxShadow: '0 4px 14px rgba(0,185,107,0.25)',
                        cursor: 'pointer'
                      }}
                    >
                      <ArrowRight size={16} />
                      Sign In
                    </button>
                  </div>
                )}
              </div>
            ) : authMethod === 'otp' ? (
              /* ════════ UNIVERSAL OTP LOGIN VIEW ════════ */
              <div className="space-y-6">
                {otpStep === 'email' ? (
                  /* ── Step 1: Registered Email Entry ── */
                  <form onSubmit={handleSendOtp} className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-2">Registered Email Address</label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="email"
                          value={otpEmail}
                          onChange={(e) => {
                            setOtpEmail(e.target.value);
                            setError('');
                          }}
                          placeholder="Enter your registered email address"
                          required
                          autoFocus
                          className="w-full text-sm text-gray-800 placeholder-gray-400 font-medium bg-white transition"
                          style={{
                            paddingLeft: '44px',
                            paddingRight: '16px',
                            height: '56px',
                            border: '1.5px solid #E5E7EB',
                            borderRadius: '14px',
                            outline: 'none',
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#00B96B';
                            e.target.style.boxShadow = '0 0 0 3px rgba(0,185,107,0.1)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '#E5E7EB';
                            e.target.style.boxShadow = 'none';
                          }}
                        />
                      </div>
                    </div>

                    {/* Primary Send OTP Button */}
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
                          <Mail size={16} />
                          Send OTP
                        </>
                      )}
                    </button>

                    {/* Security Help Text */}
                    <p className="text-xs text-gray-500 text-center font-medium">
                      We'll send a one-time verification code to your registered email address.
                    </p>

                    {/* Divider & Switch back to Password */}
                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMethod('password');
                          setError('');
                        }}
                        className="text-xs font-bold text-gray-600 hover:text-gray-900 transition flex items-center justify-center gap-1.5 mx-auto"
                      >
                        <ArrowLeft size={14} /> Login with Password
                      </button>
                    </div>
                  </form>
                ) : (
                  /* ── Step 2: 6-Digit OTP Verification Screen ── */
                  <form onSubmit={handleVerifyOtp} className="space-y-6">
                    {/* Display user email with change button */}
                    <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <Mail size={15} className="text-gray-500 shrink-0" />
                        <span className="text-xs font-bold text-gray-800 truncate">{otpEmail}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setOtpStep('email');
                          setOtpDigits(['', '', '', '', '', '']);
                          setError('');
                        }}
                        className="text-xs font-bold text-[#00B96B] hover:underline shrink-0 flex items-center gap-1"
                      >
                        <Edit3 size={12} />
                        Change email
                      </button>
                    </div>

                    {/* 6 Digit Input Boxes */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-3 text-center">
                        Enter the 6-digit OTP sent to your email
                      </label>
                      <div className="flex justify-center items-center gap-2 sm:gap-3" onPaste={handleOtpPaste}>
                        {otpDigits.map((digit, index) => (
                          <input
                            key={index}
                            id={`login-otp-${index}`}
                            ref={(el) => (otpInputRefs.current[index] = el)}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(index, e)}
                            className="w-12 h-14 sm:w-14 sm:h-16 text-center text-xl font-black text-gray-900 bg-white border-2 rounded-xl outline-none transition"
                            style={{
                              borderColor: digit ? '#00B96B' : '#E5E7EB',
                              boxShadow: digit ? '0 0 0 3px rgba(0,185,107,0.15)' : 'none',
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = '#00B96B';
                              e.target.style.boxShadow = '0 0 0 3px rgba(0,185,107,0.15)';
                            }}
                            onBlur={(e) => {
                              if (!digit) {
                                e.target.style.borderColor = '#E5E7EB';
                                e.target.style.boxShadow = 'none';
                              }
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Verify & Login Button */}
                    <button
                      type="submit"
                      disabled={submitting || otpDigits.join('').length !== 6}
                      className="w-full flex items-center justify-center gap-2 text-sm font-black text-white transition-all duration-300"
                      style={{
                        background: (submitting || otpDigits.join('').length !== 6)
                          ? '#86efac'
                          : 'linear-gradient(to right, #00B96B, #05403A)',
                        borderRadius: '14px',
                        height: '56px',
                        boxShadow: '0 4px 14px rgba(0,185,107,0.25)',
                        cursor: (submitting || otpDigits.join('').length !== 6) ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {submitting ? (
                        <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Lock size={15} />
                          Verify & Login
                        </>
                      )}
                    </button>

                    {/* Resend OTP Section */}
                    <div className="text-center text-xs text-gray-500 font-medium">
                      Didn't receive the code?{' '}
                      {resendCooldown > 0 ? (
                        <span className="font-bold text-gray-400">
                          Resend OTP in {resendCooldown}s
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={submitting}
                          className="font-bold text-[#00B96B] hover:underline cursor-pointer inline-flex items-center gap-1"
                        >
                          <RotateCw size={12} className={submitting ? 'animate-spin' : ''} />
                          Resend OTP
                        </button>
                      )}
                    </div>

                    {/* Switch back to Password */}
                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMethod('password');
                          setOtpStep('email');
                          setOtpDigits(['', '', '', '', '', '']);
                          setError('');
                        }}
                        className="text-xs font-bold text-gray-600 hover:text-gray-900 transition flex items-center justify-center gap-1.5 mx-auto"
                      >
                        <ArrowLeft size={14} /> Login with Password
                      </button>
                    </div>
                  </form>
                )}

                {/* Role-specific Info/Security Cards */}
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
              </div>
            ) : (
              /* ════════ PASSWORD LOGIN VIEW (All Roles) ════════ */
              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">Email or Mobile</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
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

                {/* OTP Login Option for all roles */}
                <div className="flex items-center gap-3 py-1">
                  <span className="h-px bg-gray-200 flex-1" />
                  <span className="text-xs font-semibold text-gray-400">or</span>
                  <span className="h-px bg-gray-200 flex-1" />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod('otp');
                    setOtpStep('email');
                    setError('');
                  }}
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

                {/* Role-specific Info/Security Cards */}
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
