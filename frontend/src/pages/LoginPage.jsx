import { useState, useEffect, useRef } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { authApi } from '../lib/api';
import { getDefaultRouteForRole } from '../constants/routes';
import PehalLogo from '../components/common/PehalLogo';
import {
  Shield, Lock, Mail, Users, Eye, EyeOff, Globe, AlertCircle, X,
  Building2, Activity, Smartphone, ArrowRight, ArrowLeft, CheckCircle2, RotateCw, Edit3,
  Calendar, CreditCard, Pill, FlaskConical, BarChart3, Cloud, Heart, ChevronDown, User, Check
} from 'lucide-react';
import toast from 'react-hot-toast';

// 3 SVG assets
import doctorCutout from '../assets/aicms_login_image_1.svg';
import tabletDevice from '../assets/clinic_overview_dashboard.svg';
import pehalFlowerBackground from '../assets/mint_green_flower_background.svg';
import devicesMockup from '../assets/aicms_image_4.svg';

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
  const mobileOtpInputRefs = useRef([]);

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
  const mobileResetOtpInputRefs = useRef([]);

  const [isExtraSmall, setIsExtraSmall] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 320
  );

  useEffect(() => {
    const handleResize = () => {
      setIsExtraSmall(window.innerWidth < 320);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        setSubmitting(false);
        return;
      }
      if (activeTab === 'staff' && userRole === 'PATIENT') {
        setError('This account is not authorized for the Staff Portal. Please use the Patient Sign In page.');
        setSubmitting(false);
        return;
      }
      if (activeTab === 'staff' && userRole === 'ADMIN') {
        setError('This account belongs to a Clinic Administrator. Please use the Clinic Portal Login.');
        setSubmitting(false);
        return;
      }
      if (activeTab === 'clinic' && userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
        setError('This account is not registered as a Clinic Admin. Please sign in using the correct portal.');
        setSubmitting(false);
        return;
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

  // ════════ PASSWORD RESET HANDLERS ════════
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

  const tabs = [
    { key: 'clinic', label: 'Clinic Admin', shortLabel: 'Admin', icon: <Building2 size={14} /> },
    { key: 'staff', label: 'Doctor / Staff', shortLabel: 'Staff', icon: <Users size={14} /> },
    { key: 'patient', label: 'Patient', shortLabel: 'Patient', icon: <User size={14} /> },
  ];

  const featurePills = [
    { label: 'Appointments & Scheduling', icon: <Calendar size={15} className="text-[#0070F3]" /> },
    { label: 'Patient Management', icon: <Users size={15} className="text-[#0070F3]" /> },
    { label: 'Billing & Reports', icon: <CreditCard size={15} className="text-[#0070F3]" /> },
    { label: 'Pharmacy Management', icon: <Pill size={15} className="text-[#0070F3]" /> },
    { label: 'Laboratory Management', icon: <FlaskConical size={15} className="text-[#0070F3]" /> },
    { label: 'AI-Powered Insights', icon: <BarChart3 size={15} className="text-[#0070F3]" /> },
  ];

  const getActiveRoleLabel = () => {
    if (activeTab === 'clinic') return 'Clinic Admin';
    if (activeTab === 'staff') return 'Doctor / Staff';
    return 'Patient';
  };

  return (
    <div
      className="relative min-h-[100dvh] lg:h-[100dvh] lg:max-h-[100dvh] w-full lg:w-screen overflow-x-hidden lg:overflow-hidden bg-[#F0F7FF] text-[#071B3A] font-sans antialiased flex flex-col lg:justify-between selection:bg-[#0070F3]/20 selection:text-[#0051CC]"
      style={{
        background: [
          'radial-gradient(circle at 18% 24%, rgba(2, 132, 199, 0.12) 0%, transparent 40%)',
          'radial-gradient(circle at 75% 18%, rgba(0, 112, 243, 0.10) 0%, transparent 42%)',
          'radial-gradient(circle at 45% 65%, rgba(2, 132, 199, 0.08) 0%, transparent 45%)',
          'radial-gradient(circle at 86% 78%, rgba(224, 242, 254, 0.75) 0%, transparent 50%)',
          'radial-gradient(circle at 25% 85%, rgba(235, 244, 255, 0.90) 0%, transparent 45%)',
          'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 45%, #F0F7FF 100%)'
        ].join(', '),
      }}
    >
      
      {/* ── BACKGROUND DECORATIVE SHAPES & AMBIENT BLUE GLOW ── */}
      {/* Soft Luminous Blue Glow behind Center/Hero */}
      <div
        className="absolute top-[8%] left-[24%] w-[640px] h-[640px] rounded-full pointer-events-none select-none blur-[115px] -z-0"
        style={{
          background: 'radial-gradient(circle, rgba(2,132,199,0.18) 0%, rgba(0,112,243,0.08) 55%, transparent 75%)',
        }}
        aria-hidden="true"
      />

      {/* Soft Ice Blue Glow near Top-Left */}
      <div
        className="absolute -top-[10%] -left-[6%] w-[480px] h-[480px] rounded-full pointer-events-none select-none blur-[90px] -z-0"
        style={{
          background: 'radial-gradient(circle, rgba(224,242,254,0.85) 0%, rgba(235,244,255,0.4) 60%, transparent 80%)',
        }}
        aria-hidden="true"
      />

      {/* Subtle Blue Ambient behind Login Card */}
      <div
        className="absolute top-[18%] right-[3%] w-[520px] h-[520px] rounded-full pointer-events-none select-none blur-[95px] -z-0"
        style={{
          background: 'radial-gradient(circle, rgba(0,112,243,0.10) 0%, rgba(0,81,204,0.04) 60%, transparent 80%)',
        }}
        aria-hidden="true"
      />

      {/* Soft Wave Decorative Ambient Shape in Blue */}
      <svg
        className="absolute top-0 right-0 w-[55%] h-[85%] pointer-events-none select-none opacity-45 -z-0"
        viewBox="0 0 800 700"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M200,0 C350,180 500,120 650,300 C750,420 800,550 800,700 L800,0 Z"
          fill="url(#blueAmbientWave)"
        />
        <defs>
          <linearGradient id="blueAmbientWave" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#BAE6FD" stopOpacity="0.45" />
            <stop offset="60%" stopColor="#E0F2FE" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#F8FAFC" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* ── DESKTOP HEADER (lg+) ── */}
      <header className="hidden lg:flex relative z-30 w-full px-8 sm:px-12 lg:px-14 xl:px-16 items-center justify-between shrink-0 h-16 xl:h-20">
        {/* Left: PEHAL Logo + AI-CMS text */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Link to="/" className="flex items-center transition-opacity hover:opacity-90">
            <PehalLogo height={48} className="w-auto h-10 sm:h-12" />
          </Link>
          <div className="hidden sm:block h-8 w-[1.5px] bg-[#E2E8F0]" />
          <div className="flex flex-col justify-center">
            <span className="text-lg sm:text-xl font-black tracking-tight text-[#071B3A] leading-none">
              AI-CMS
            </span>
            <span className="text-[12px] font-medium text-[#64748B] tracking-normal hidden md:inline mt-1">
              Intelligent Clinic Management System
            </span>
          </div>
        </div>

        {/* Right: Language Selector + Back to Home */}
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 border border-[#E2E8F0] text-xs font-bold text-[#071B3A] shadow-xs cursor-pointer hover:bg-slate-50 transition">
            <Globe size={15} className="text-[#0070F3]" />
            <span>English</span>
            <ChevronDown size={14} className="text-[#64748B]" />
          </div>

          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#0070F3] hover:text-[#0051CC] transition-colors py-1.5 px-3 rounded-lg hover:bg-[#E0F2FE]"
          >
            <ArrowLeft size={16} className="text-[#0070F3]" />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      {/* ════════ DESKTOP MAIN WORKSPACE (lg+) ════════ */}
      <main className="hidden lg:flex relative z-10 w-full px-8 sm:px-12 lg:px-14 xl:px-16 flex-1 flex-col justify-center min-h-0 overflow-hidden py-1">

        {/* TWO-COLUMN LAYOUT — Desktop (lg+) */}
        <div className="flex w-full h-full max-h-full items-center justify-between gap-6 lg:gap-8 xl:gap-12 min-h-0">

          {/* ═══════════════════════════════════════
              LEFT HERO SECTION (50–55% width)
              Continuous canvas matching target design
              ═══════════════════════════════════════ */}
          <section className="flex-[1.1] h-full max-h-full relative flex flex-col justify-between min-h-0 overflow-visible">

            {/* ── TOP-LEFT CONTENT: Kicker + Heading + Subtitle + Script ── */}
            <div className="relative shrink-0 pt-2 lg:pt-4 xl:pt-6 z-20 max-w-[340px] lg:max-w-[380px] xl:max-w-[400px]">
              {/* Pill badge */}
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#E0F2FE] border border-[#BAE6FD] text-[#0284C7] text-[11px] xl:text-xs font-bold tracking-wide mb-2.5 shadow-xs whitespace-nowrap">
                <span>Better Care</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#0284C7]" />
                <span>Smarter Clinics</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#0284C7]" />
                <span>Healthier Communities</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-[40px] xl:text-[48px] font-black tracking-tight leading-[1.08] mb-2.5">
                <span className="text-[#071B3A]">Welcome to</span><br />
                <span className="text-[#0070F3]">PEHAL</span><br />
                <span className="text-[#071B3A]">Healthcare</span>
              </h1>

              <p className="text-xs sm:text-[13px] lg:text-sm text-[#64748B] font-medium leading-relaxed max-w-[240px] lg:max-w-[260px] xl:max-w-[280px] mb-3">
                Manage your clinic, staff, patients and operations in one secure platform.
              </p>

              {/* Handwritten script slogan in Blue */}
              <div className="select-none pointer-events-none mb-1">
                <span
                  className="text-[#0284C7] font-serif italic text-sm lg:text-[15px] xl:text-lg font-bold leading-tight inline-block"
                  style={{ transform: 'rotate(-7deg)', transformOrigin: 'left center' }}
                >
                  Technology<br />for a Healthier<br />Tomorrow ♡
                </span>
              </div>
            </div>

            {/* ── BLUE PETALS / FLOWER BACKGROUND BEHIND DOCTORS ── */}
            <div
              className="absolute pointer-events-none select-none flex items-end justify-center"
              style={{
                right: '0%',
                bottom: '0%',
                width: '78%',
                height: '100%',
                maxHeight: '780px',
                zIndex: 3,
              }}
            >
              <img
                src={pehalFlowerBackground}
                alt=""
                aria-hidden="true"
                className="w-full h-full object-contain"
                style={{ objectPosition: 'center bottom' }}
              />
            </div>

            {/* ── DOCTORS HERO ARTWORK — large, positioned behind devices ── */}
            <div
              className="absolute pointer-events-none select-none flex items-end justify-end"
              style={{
                right: '0%',
                bottom: '0%',
                width: '76%',
                height: '100%',
                maxHeight: '780px',
                zIndex: 5,
              }}
            >
              <img
                src={doctorCutout}
                alt="PEHAL Healthcare Doctors"
                className="w-full h-full object-contain drop-shadow-[0_16px_36px_rgba(0,0,0,0.10)]"
                style={{ objectPosition: 'right bottom' }}
              />
            </div>

            {/* ── DEVICES (Laptop Dashboard + Smartphone Mockup) — lower-left foreground ── */}
            <div
              className="absolute bottom-0 left-[0%] pointer-events-none select-none flex items-end"
              style={{
                width: '62%',
                maxWidth: '600px',
                height: '52%',
                zIndex: 12,
              }}
            >
              <img
                src={devicesMockup}
                alt="AI-CMS Platform on Laptop and Mobile"
                className="w-full h-full object-contain drop-shadow-[0_20px_40px_rgba(15,23,42,0.22)]"
                style={{ objectPosition: 'left bottom' }}
              />
            </div>
          </section>

          {/* RIGHT LOGIN CARD (45–50% width) */}
          <section className="w-[460px] lg:w-[490px] xl:w-[530px] 2xl:w-[560px] shrink-0 flex items-center justify-center min-h-0 z-20">
            <div
              className="w-full rounded-[24px] p-6 sm:p-7 lg:p-8 xl:p-9 shadow-[0_20px_60px_rgba(0,112,243,0.08),0_2px_8px_rgba(0,0,0,0.02)] border border-[#E2E8F0] flex flex-col justify-between max-h-full overflow-hidden"
              style={{ background: '#FFFFFF' }}
            >
              {/* Card Title & Subtitle */}
              <div className="mb-4">
                <h2 className="text-2xl lg:text-[28px] font-black text-[#071B3A] tracking-tight leading-tight mb-1">
                  {mode === 'login'
                    ? 'Login to Your Account'
                    : resetStep === 'verify'
                    ? 'Verify Your Email'
                    : resetStep === 'success'
                    ? 'Password Updated'
                    : 'Reset Your Password'}
                </h2>
                <p className="text-xs lg:text-[13px] text-[#64748B] font-medium leading-tight">
                  {mode === 'login'
                    ? 'Access your clinic and continue providing better care.'
                    : resetStep === 'verify'
                    ? `Verification code sent to ${resetForm.email || 'your email'}.`
                    : resetStep === 'success'
                    ? 'Password changed. Sign in with new credentials.'
                    : 'Enter registered email and new password.'}
                </p>
              </div>

              {/* Role Selector Tabs */}
              {mode === 'login' && (
                <div
                  className="flex items-center bg-[#F1F5F9] p-1 rounded-xl mb-4"
                  role="tablist"
                  aria-label="Login Roles"
                >
                  {tabs.map((tab) => {
                    const isActive = activeTab === tab.key;
                    return (
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
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                          isActive
                            ? 'bg-[#0070F3] text-white shadow-xs scale-[1.01]'
                            : 'text-[#071B3A] hover:text-[#0070F3]'
                        }`}
                      >
                        {tab.icon}
                        <span className="truncate">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Inline Error Alert */}
              {error && mode === 'login' && (
                <div className="flex items-start gap-2 mb-3 p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-600 relative shrink-0">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold pr-5 leading-tight">{error}</p>
                  <button
                    type="button"
                    onClick={() => setError('')}
                    className="absolute right-2.5 top-2.5 text-red-400 hover:text-red-700"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              {/* Form Content */}
              {mode === 'forgot_password' ? (
                /* Forgot Password Flow */
                <div className="space-y-3">
                  {resetStep === 'request' ? (
                    <form onSubmit={handleResetRequestSubmit} className="space-y-2.5">
                      <div>
                        <label className="block text-[12px] font-bold text-[#071B3A] mb-1">Email Address</label>
                        <div className="relative">
                          <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
                          <input
                            type="email"
                            value={resetForm.email}
                            onChange={(e) => {
                              setResetForm({ ...resetForm, email: e.target.value });
                              setResetError('');
                            }}
                            placeholder="Enter your email"
                            required
                            className="w-full text-[13px] font-medium text-[#071B3A] bg-white pl-10 pr-3 h-11 xl:h-12 rounded-xl border border-[#E2E8F0] outline-none focus:border-[#0070F3] focus:ring-3 focus:ring-[#0070F3]/10 transition"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[12px] font-bold text-[#071B3A] mb-1">New Password</label>
                        <div className="relative">
                          <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
                          <input
                            type={showResetPassword ? 'text' : 'password'}
                            value={resetForm.password}
                            onChange={(e) => {
                              setResetForm({ ...resetForm, password: e.target.value });
                              setResetError('');
                            }}
                            placeholder="Min. 6 characters"
                            required
                            className="w-full text-[13px] font-medium text-[#071B3A] bg-white pl-10 pr-10 h-11 xl:h-12 rounded-xl border border-[#E2E8F0] outline-none focus:border-[#0070F3] focus:ring-3 focus:ring-[#0070F3]/10 transition"
                          />
                          <button
                            type="button"
                            onClick={() => setShowResetPassword(!showResetPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B]"
                          >
                            {showResetPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[12px] font-bold text-[#071B3A] mb-1">Confirm Password</label>
                        <div className="relative">
                          <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
                          <input
                            type={showResetConfirmPassword ? 'text' : 'password'}
                            value={resetForm.confirmPassword}
                            onChange={(e) => {
                              setResetForm({ ...resetForm, confirmPassword: e.target.value });
                              setResetError('');
                            }}
                            placeholder="Confirm password"
                            required
                            className="w-full text-[13px] font-medium text-[#071B3A] bg-white pl-10 pr-10 h-11 xl:h-12 rounded-xl border border-[#E2E8F0] outline-none focus:border-[#0070F3] focus:ring-3 focus:ring-[#0070F3]/10 transition"
                          />
                          <button
                            type="button"
                            onClick={() => setShowResetConfirmPassword(!showResetConfirmPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B]"
                          >
                            {showResetConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      {resetError && (
                        <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-semibold">
                          {resetError}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={resetSubmitting}
                        className="w-full flex items-center justify-center gap-2 h-11 xl:h-12 rounded-xl text-xs xl:text-sm font-bold text-white shadow-md shadow-[#0070F3]/20 hover:brightness-105 transition cursor-pointer"
                        style={{ background: 'linear-gradient(135deg, #0070F3 0%, #0051CC 100%)' }}
                      >
                        {resetSubmitting ? (
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <Mail size={16} />
                            <span>Continue &amp; Verify Email</span>
                          </>
                        )}
                      </button>

                      <p className="text-center text-xs text-[#64748B] font-semibold">
                        Remember password?{' '}
                        <button
                          type="button"
                          onClick={handleResetReturnToLogin}
                          className="font-bold text-[#0070F3] hover:underline cursor-pointer"
                        >
                          Sign in
                        </button>
                      </p>
                    </form>
                  ) : resetStep === 'verify' ? (
                    <form onSubmit={handleResetVerifySubmit} className="space-y-3">
                      <div className="flex items-center justify-between bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs">
                        <span className="font-bold text-[#071B3A] truncate">{resetForm.email}</span>
                        <button
                          type="button"
                          onClick={() => setResetStep('request')}
                          className="font-bold text-[#0070F3] hover:underline text-xs"
                        >
                          Change
                        </button>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#071B3A] mb-1.5 text-center">
                          Enter 6-digit verification code
                        </label>
                        <div className="flex justify-center items-center gap-2" onPaste={handleResetOtpPaste}>
                          {resetOtpDigits.map((digit, index) => (
                            <input
                              key={index}
                              ref={(el) => (resetOtpInputRefs.current[index] = el)}
                              type="text"
                              inputMode="numeric"
                              maxLength={1}
                              value={digit}
                              onChange={(e) => handleResetOtpDigitChange(index, e.target.value)}
                              onKeyDown={(e) => handleResetOtpKeyDown(index, e)}
                              className="w-9 h-11 text-center text-base font-black text-[#071B3A] bg-white border border-[#E2E8F0] rounded-xl outline-none focus:border-[#0070F3] focus:ring-3 focus:ring-[#0070F3]/10"
                            />
                          ))}
                        </div>
                      </div>

                      {resetError && (
                        <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-semibold">
                          {resetError}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={resetSubmitting || resetOtpDigits.join('').length !== 6}
                        className="w-full flex items-center justify-center gap-2 h-11 xl:h-12 rounded-xl text-xs xl:text-sm font-bold text-white shadow-md shadow-[#0070F3]/20 hover:brightness-105 transition"
                        style={{ background: 'linear-gradient(135deg, #0070F3 0%, #0051CC 100%)' }}
                      >
                        {resetSubmitting ? (
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 size={16} />
                            <span>Confirm &amp; Update Password</span>
                          </>
                        )}
                      </button>

                      <div className="text-center text-xs text-[#64748B]">
                        {resetCooldown > 0 ? (
                          <span>Resend in {resetCooldown}s</span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleResetRequestSubmit}
                            className="font-bold text-[#0070F3] hover:underline"
                          >
                            Resend OTP
                          </button>
                        )}
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-3.5 text-center py-3">
                      <div className="w-12 h-12 bg-[#E0F2FE] text-[#0070F3] border border-[#BAE6FD] rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 size={28} />
                      </div>
                      <h3 className="text-base font-black text-[#071B3A]">Password Changed</h3>
                      <button
                        type="button"
                        onClick={handleResetReturnToLogin}
                        className="w-full flex items-center justify-center gap-2 h-11 xl:h-12 rounded-xl text-xs xl:text-sm font-bold text-white shadow-md shadow-[#0070F3]/20 hover:brightness-105 transition"
                        style={{ background: 'linear-gradient(135deg, #0070F3 0%, #0051CC 100%)' }}
                      >
                        <ArrowRight size={16} />
                        <span>Sign In</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : authMethod === 'otp' ? (
                /* OTP Login Flow */
                <div className="space-y-3">
                  {otpStep === 'email' ? (
                    <form onSubmit={handleSendOtp} className="space-y-3">
                      <div>
                        <label className="block text-[12px] font-bold text-[#071B3A] mb-1">
                          Registered Email Address
                        </label>
                        <div className="relative">
                          <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
                          <input
                            type="email"
                            value={otpEmail}
                            onChange={(e) => {
                              setOtpEmail(e.target.value);
                              setError('');
                            }}
                            placeholder="Enter email address"
                            required
                            autoFocus
                            className="w-full text-[13px] font-medium text-[#071B3A] bg-white pl-10 pr-3 h-11 xl:h-12 rounded-xl border border-[#E2E8F0] outline-none focus:border-[#0070F3] focus:ring-3 focus:ring-[#0070F3]/10"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full flex items-center justify-center gap-2 h-11 xl:h-12 rounded-xl text-xs xl:text-sm font-bold text-white shadow-md shadow-[#0070F3]/20 hover:brightness-105 transition"
                        style={{ background: 'linear-gradient(135deg, #0070F3 0%, #0051CC 100%)' }}
                      >
                        {submitting ? (
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <Smartphone size={16} />
                            <span>Send Verification OTP</span>
                          </>
                        )}
                      </button>

                      <div className="text-center pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMethod('password');
                            setError('');
                          }}
                          className="text-xs font-bold text-[#64748B] hover:text-[#071B3A] inline-flex items-center gap-1"
                        >
                          <ArrowLeft size={13} /> Login with Password
                        </button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-3">
                      <div className="flex items-center justify-between bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl px-3 py-1.5 text-xs">
                        <span className="font-bold text-[#071B3A] truncate">{otpEmail}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setOtpStep('email');
                            setOtpDigits(['', '', '', '', '', '']);
                            setError('');
                          }}
                          className="font-bold text-[#0070F3] hover:underline text-xs"
                        >
                          Change
                        </button>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#071B3A] mb-1.5 text-center">
                          Enter 6-digit code
                        </label>
                        <div className="flex justify-center items-center gap-2" onPaste={handleOtpPaste}>
                          {otpDigits.map((digit, index) => (
                            <input
                              key={index}
                              ref={(el) => (otpInputRefs.current[index] = el)}
                              type="text"
                              inputMode="numeric"
                              maxLength={1}
                              value={digit}
                              onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                              onKeyDown={(e) => handleOtpKeyDown(index, e)}
                              className="w-9 h-11 text-center text-base font-black text-[#071B3A] bg-white border border-[#E2E8F0] rounded-xl outline-none focus:border-[#0070F3] focus:ring-3 focus:ring-[#0070F3]/10"
                            />
                          ))}
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={submitting || otpDigits.join('').length !== 6}
                        className="w-full flex items-center justify-center gap-2 h-11 xl:h-12 rounded-xl text-xs xl:text-sm font-bold text-white shadow-md shadow-[#0070F3]/20 hover:brightness-105 transition"
                        style={{ background: 'linear-gradient(135deg, #0070F3 0%, #0051CC 100%)' }}
                      >
                        {submitting ? (
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <Lock size={16} />
                            <span>Verify &amp; Login as {getActiveRoleLabel()}</span>
                          </>
                        )}
                      </button>

                      <div className="text-center text-xs text-[#64748B]">
                        {resendCooldown > 0 ? (
                          <span>Resend in {resendCooldown}s</span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleSendOtp}
                            className="font-bold text-[#0070F3] hover:underline"
                          >
                            Resend OTP
                          </button>
                        )}
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                /* Standard Password Login Form */
                <form onSubmit={handlePasswordSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[12px] font-bold text-[#071B3A] mb-1">
                      Email or Mobile Number
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
                      <input
                        type="text"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="Enter your email or mobile number"
                        required
                        className="w-full text-[13px] font-medium text-[#071B3A] placeholder:text-[#94A3B8] bg-white pl-10 pr-3 h-11 xl:h-12 rounded-xl border border-[#E2E8F0] outline-none focus:border-[#0070F3] focus:ring-3 focus:ring-[#0070F3]/10 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[12px] font-bold text-[#071B3A] mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        placeholder="Enter your password"
                        required
                        className="w-full text-[13px] font-medium text-[#071B3A] placeholder:text-[#94A3B8] bg-white pl-10 pr-10 h-11 xl:h-12 rounded-xl border border-[#E2E8F0] outline-none focus:border-[#0070F3] focus:ring-3 focus:ring-[#0070F3]/10 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#071B3A] transition"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-[#071B3A] font-medium">
                      <input
                        type="checkbox"
                        checked={rememberDevice}
                        onChange={(e) => setRememberDevice(e.target.checked)}
                        className="w-4 h-4 rounded accent-[#0070F3] border-[#E2E8F0] focus:ring-[#0070F3]"
                      />
                      <span>Remember this device</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot_password');
                        setError('');
                        setResetError('');
                        setResetSuccess('');
                      }}
                      className="font-bold text-[#0070F3] hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 h-11 xl:h-12 rounded-xl text-xs xl:text-sm font-bold text-white shadow-md shadow-[#0070F3]/25 hover:brightness-105 active:bg-[#0051CC] transition cursor-pointer disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg, #0070F3 0%, #0051CC 100%)' }}
                  >
                    {submitting ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Lock size={15} />
                        <span>Login as {getActiveRoleLabel()}</span>
                        <ArrowRight size={15} />
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-3 py-0.5">
                    <span className="h-px bg-[#E2E8F0] flex-1" />
                    <span className="text-[11px] font-semibold text-[#94A3B8] uppercase">or</span>
                    <span className="h-px bg-[#E2E8F0] flex-1" />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod('otp');
                      setOtpStep('email');
                      setError('');
                    }}
                    className="w-full flex items-center justify-center gap-2 h-11 xl:h-12 rounded-xl text-xs xl:text-sm font-bold text-[#071B3A] bg-white border border-[#E2E8F0] hover:bg-slate-50 transition cursor-pointer"
                  >
                    <Smartphone size={16} className="text-[#64748B]" />
                    <span>Login using OTP</span>
                  </button>

                  <div className="pt-1.5 text-center text-xs font-medium text-[#64748B]">
                    <span>New to PEHAL Healthcare? </span>
                    <Link
                      to="/register-clinic"
                      className="font-bold text-[#0070F3] hover:underline inline-flex items-center gap-0.5 ml-0.5"
                    >
                      <span>Register Your Clinic</span>
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </form>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* ── DESKTOP FOOTER (lg+) ── */}
      <footer className="hidden lg:flex relative z-20 w-full shrink-0 items-center justify-between min-h-[48px] px-8 sm:px-12 lg:px-14 xl:px-16 py-2.5">
        {/* Left: One Platform text with blue dash */}
        <div className="flex items-center gap-3 select-none">
          <span className="w-5 h-[3px] bg-[#0070F3] rounded-full" />
          <span className="text-xs sm:text-[13px] font-bold text-[#1E3A8A]">
            One Platform. Complete Clinic Management.
          </span>
        </div>

        {/* Right: 3 Trust items on blue-ambient background */}
        <div className="flex items-center gap-6 sm:gap-8">
          <div className="flex items-center gap-2.5">
            <Shield size={18} className="text-[#0070F3] shrink-0" />
            <div>
              <p className="text-[11.5px] font-bold text-[#071B3A] leading-tight">Secure &amp; Compliant</p>
              <p className="text-[10px] text-[#64748B] mt-0.5 hidden sm:block">Your data is always safe</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Cloud size={18} className="text-[#0070F3] shrink-0" />
            <div>
              <p className="text-[11.5px] font-bold text-[#071B3A] leading-tight">Cloud Based</p>
              <p className="text-[10px] text-[#64748B] mt-0.5 hidden sm:block">Access from anywhere</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Heart size={18} className="text-[#0070F3] shrink-0" />
            <div>
              <p className="text-[11.5px] font-bold text-[#071B3A] leading-tight">Patient First</p>
              <p className="text-[10px] text-[#64748B] mt-0.5 hidden sm:block">Better care for all</p>
            </div>
          </div>
        </div>
      </footer>

      {/* ═══════════════════════════════════════════════════════════════════
          DEDICATED MOBILE COMPOSITION (< 1024px)
          Exact match to mobile reference design (media_1789627287368.png)
         ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex lg:hidden flex-col w-full min-h-[100dvh] bg-[#F0F7FF] text-[#071B3A] relative overflow-x-hidden" style={{ background: 'radial-gradient(circle at 20% 15%, rgba(2,132,199,0.12) 0%, transparent 45%), radial-gradient(circle at 85% 75%, rgba(0,112,243,0.08) 0%, transparent 45%), linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 60%, #F0F7FF 100%)' }}>
        {/* Dedicated CSS adaptation for extra-small mobile screens below 320px (<319px down to 260px) */}
        <style>{`
          @media (max-width: 319px) {
            .mobile-top-section {
              padding-left: clamp(8px, 2.8vw, 10px) !important;
              padding-right: clamp(8px, 2.8vw, 10px) !important;
              padding-top: 6px !important;
            }
            .mobile-card-inner {
              padding-left: clamp(10px, 3.5vw, 14px) !important;
              padding-right: clamp(10px, 3.5vw, 14px) !important;
              padding-top: 10px !important;
              padding-bottom: 14px !important;
              width: 100% !important;
              box-sizing: border-box !important;
            }
            .mobile-header-logo {
              height: clamp(20px, 7vw, 24px) !important;
            }
            .mobile-lang-pill {
              padding: 2px 6px !important;
              font-size: clamp(8.5px, 2.8vw, 9.5px) !important;
              gap: 3px !important;
            }
            .mobile-hero-title {
              font-size: clamp(14px, 4.8vw, 16.5px) !important;
              line-height: 1.1 !important;
              margin-bottom: 2px !important;
            }
            .mobile-hero-subtitle {
              font-size: clamp(7.5px, 2.6vw, 8.5px) !important;
              line-height: 1.25 !important;
              max-width: clamp(110px, 40vw, 130px) !important;
              margin-bottom: 2px !important;
            }
            .mobile-hero-cursive {
              font-size: clamp(9.5px, 3.2vw, 11px) !important;
              line-height: 1.15 !important;
            }
            .mobile-role-tabs {
              display: grid !important;
              grid-template-columns: repeat(3, 1fr) !important;
              padding: 2px !important;
              gap: 2px !important;
              border-radius: 12px !important;
              margin-bottom: 8px !important;
            }
            .mobile-role-tab-btn {
              min-width: 0 !important;
              width: 100% !important;
              padding: 5px 2px !important;
              font-size: clamp(9px, 3vw, 10px) !important;
              border-radius: 9px !important;
              gap: 2px !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
            }
            .mobile-tab-icon svg {
              width: 11px !important;
              height: 11px !important;
            }
            .mobile-input-label {
              font-size: clamp(10.5px, 3.4vw, 12px) !important;
              margin-bottom: 3px !important;
            }
            .mobile-input {
              width: 100% !important;
              box-sizing: border-box !important;
              min-height: 42px !important;
              height: clamp(42px, 11vw, 46px) !important;
              font-size: clamp(11.5px, 3.6vw, 13px) !important;
              padding-left: clamp(30px, 9.5vw, 36px) !important;
              padding-right: clamp(28px, 9vw, 34px) !important;
              border-radius: 10px !important;
              text-overflow: ellipsis !important;
            }
            .mobile-input::placeholder {
              text-overflow: ellipsis !important;
              white-space: nowrap !important;
              overflow: hidden !important;
              font-size: clamp(10.5px, 3.4vw, 12px) !important;
            }
            .mobile-input-icon {
              left: clamp(8px, 2.6vw, 11px) !important;
              width: 14px !important;
              height: 14px !important;
            }
            .mobile-eye-btn {
              right: clamp(4px, 1.5vw, 8px) !important;
              padding: 4px !important;
            }
            .mobile-eye-btn svg {
              width: 14px !important;
              height: 14px !important;
            }
            .mobile-remember-row {
              display: flex !important;
              flex-direction: row !important;
              align-items: center !important;
              justify-content: space-between !important;
              gap: clamp(4px, 1.8vw, 8px) !important;
              width: 100% !important;
              padding-top: 2px !important;
              padding-bottom: 2px !important;
              flex-wrap: nowrap !important;
            }
            .mobile-remember-label {
              display: flex !important;
              align-items: center !important;
              gap: 4px !important;
              min-width: 0 !important;
              flex: 1 1 auto !important;
            }
            .mobile-remember-box {
              width: 13px !important;
              height: 13px !important;
              border-radius: 3px !important;
              flex-shrink: 0 !important;
            }
            .mobile-remember-box svg {
              width: 9px !important;
              height: 9px !important;
            }
            .mobile-remember-text {
              font-size: clamp(9.5px, 3.1vw, 11px) !important;
              white-space: nowrap !important;
              overflow: hidden !important;
              text-overflow: ellipsis !important;
            }
            .mobile-forgot-link {
              font-size: clamp(9.5px, 3.1vw, 11px) !important;
              white-space: nowrap !important;
              flex-shrink: 0 !important;
              text-decoration: none !important;
            }
            .mobile-submit-btn {
              width: 100% !important;
              min-height: 42px !important;
              height: clamp(42px, 11vw, 46px) !important;
              border-radius: clamp(9px, 2.5vw, 12px) !important;
              font-size: clamp(11.5px, 3.5vw, 13px) !important;
              padding: 0 8px !important;
              gap: 5px !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              box-sizing: border-box !important;
            }
            .mobile-btn-icon {
              width: 13px !important;
              height: 13px !important;
              flex-shrink: 0 !important;
            }
            .mobile-or-divider {
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              gap: 6px !important;
              margin-top: 6px !important;
              margin-bottom: 6px !important;
              width: 100% !important;
            }
            .mobile-or-text {
              font-size: clamp(9.5px, 3vw, 11px) !important;
              padding: 0 6px !important;
            }
            .mobile-otp-btn {
              width: 100% !important;
              min-height: 42px !important;
              height: clamp(42px, 11vw, 46px) !important;
              border-radius: clamp(9px, 2.5vw, 12px) !important;
              font-size: clamp(11.5px, 3.5vw, 13px) !important;
              padding: 0 8px !important;
              gap: 5px !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              box-sizing: border-box !important;
            }
            .mobile-register-row {
              display: flex !important;
              flex-wrap: wrap !important;
              align-items: center !important;
              justify-content: center !important;
              gap: 2px 5px !important;
              font-size: clamp(9.5px, 3.1vw, 11px) !important;
              padding-top: 4px !important;
              padding-bottom: 2px !important;
            }
            .mobile-register-row a {
              white-space: nowrap !important;
            }
            .mobile-otp-digit {
              width: clamp(28px, 9vw, 34px) !important;
              height: clamp(34px, 10vw, 38px) !important;
              font-size: clamp(12px, 3.8vw, 14px) !important;
              border-radius: 8px !important;
            }
            .mobile-trust-badges {
              padding-top: 8px !important;
              gap: 2px !important;
            }
            .mobile-trust-item {
              gap: 3px !important;
            }
            .mobile-trust-icon {
              width: 12px !important;
              height: 12px !important;
            }
            .mobile-trust-title {
              font-size: clamp(7.5px, 2.5vw, 8.5px) !important;
            }
            .mobile-trust-desc {
              font-size: clamp(6.5px, 2.2vw, 7.5px) !important;
            }
          }
        `}</style>
        
        {/* Soft Background Radial Blurs */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-blue-100/40 rounded-full blur-3xl pointer-events-none -z-1" />
        <div className="absolute top-48 left-[-40px] w-60 h-60 bg-blue-100/30 rounded-full blur-2xl pointer-events-none -z-1" />
        <div className="fixed bottom-0 left-0 w-52 h-36 bg-blue-100/60 rounded-tr-[100px] blur-2xl pointer-events-none -z-1" />
        <div className="fixed bottom-0 right-0 w-48 h-32 bg-blue-100/50 rounded-tl-[80px] blur-2xl pointer-events-none -z-1" />

        {/* ── TOP SECTION (Header + Hero Artwork) ── */}
        <div className="mobile-top-section w-full max-w-[440px] mx-auto px-2.5 min-[340px]:px-3 min-[360px]:px-4.5 pt-2 min-[360px]:pt-3 shrink-0 flex flex-col">

          {/* ── MOBILE HEADER ── */}
          <header className="w-full pb-1.5 min-[360px]:pb-2 flex items-center justify-between relative z-20 shrink-0">
            {/* Left: PEHAL Logo + Divider + AI-CMS text */}
            <div className="flex items-center gap-1.5 min-[360px]:gap-2">
              <Link to="/" className="flex items-center">
                <PehalLogo height={32} className="mobile-header-logo w-auto h-6.5 min-[340px]:h-7 min-[360px]:h-8" />
              </Link>
              <div className="h-4.5 min-[360px]:h-6 w-[1.5px] bg-slate-200 mx-0.5" />
              <div className="flex flex-col justify-center">
                <span className="text-xs min-[360px]:text-sm font-black tracking-tight text-[#071B3A] leading-none">
                  AI-CMS
                </span>
                <span className="text-[8px] min-[340px]:text-[8.5px] min-[360px]:text-[10px] font-medium text-slate-500 leading-tight mt-0.5">
                  Intelligent Clinic<br />Management System
                </span>
              </div>
            </div>

            {/* Right: Language Pill */}
            <button
              type="button"
              className="mobile-lang-pill inline-flex items-center gap-1 min-[360px]:gap-1.5 px-2 min-[340px]:px-2.5 min-[360px]:px-3 py-0.5 min-[340px]:py-1 min-[360px]:py-1.5 rounded-full bg-white/95 backdrop-blur-xs border border-slate-200 text-slate-700 text-[10px] min-[340px]:text-[11px] min-[360px]:text-xs font-semibold shadow-2xs hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
            >
              <Globe size={11} className="text-slate-600 shrink-0" />
              <span>English</span>
              <ChevronDown size={11} className="text-slate-500 shrink-0" />
            </button>
          </header>

          {/* ── MOBILE HERO SECTION (Above the card) ── */}
          <div className="relative w-full pt-0.5 flex items-stretch overflow-hidden">
            
            {/* 12-dot grid pattern near top-right */}
            <div className="absolute top-1 right-2 min-[360px]:right-3 z-0 grid grid-cols-4 gap-1 min-[340px]:gap-1.5 min-[360px]:gap-2 opacity-35 select-none pointer-events-none">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="w-1 min-[340px]:w-1.5 h-1 min-[340px]:h-1.5 rounded-full bg-[#0070F3]" />
              ))}
            </div>

            {/* Mint Green Flower Background behind doctors */}
            <div
              className="absolute right-[-8px] top-[-8px] w-[140px] h-[160px] min-[320px]:w-[165px] min-[320px]:h-[185px] min-[360px]:w-[200px] min-[360px]:h-[220px] min-[400px]:w-[245px] min-[400px]:h-[265px] pointer-events-none select-none z-1"
            >
              <img
                src={pehalFlowerBackground}
                alt=""
                aria-hidden="true"
                className="w-full h-full object-contain object-right-top"
              />
            </div>

            {/* Soft mint green circular glow behind doctors' heads */}
            <div className="absolute right-2 top-1 w-28 h-28 min-[340px]:w-36 min-[340px]:h-36 min-[360px]:w-40 min-[360px]:w-40 rounded-full bg-blue-200/35 blur-xl pointer-events-none z-1" />

            {/* LEFT CONTENT: Heading + Subtitle + Cursive Script + 3 Indicators */}
            <div className="relative z-10 w-[50%] min-[340px]:w-[52%] min-[360px]:w-[50%] pr-0.5 flex flex-col justify-start gap-1 min-[360px]:gap-1.5 pb-2 min-[360px]:pb-3">
              <div>
                <h1 className="mobile-hero-title text-[16px] min-[320px]:text-[18px] min-[340px]:text-[20px] min-[375px]:text-[23px] min-[400px]:text-[25px] font-black tracking-tight leading-[1.08] text-[#071B3A] mb-0.5 min-[360px]:mb-1">
                  Welcome to<br />
                  <span className="text-[#0070F3]">PEHAL</span><br />
                  Healthcare
                </h1>
                <p className="mobile-hero-subtitle text-[8.5px] min-[320px]:text-[9.5px] min-[340px]:text-[10.5px] min-[375px]:text-[11px] text-slate-600 font-medium leading-[1.26] min-[320px]:leading-[1.3] max-w-[130px] min-[320px]:max-w-[145px] min-[360px]:max-w-[180px] mb-0.5 min-[340px]:mb-1 min-[360px]:mb-1.5">
                  Manage your clinic, staff, patients and operations in one secure platform.
                </p>

                {/* Cursive Tag */}
                <div
                  className="mb-0.5 min-[360px]:mb-1 origin-left select-none pointer-events-none"
                  style={{ transform: 'rotate(-4.5deg)' }}
                >
                  <span
                    className="mobile-hero-cursive text-[#0070F3] text-[11px] min-[320px]:text-[12.5px] min-[340px]:text-[14px] min-[375px]:text-[15.5px] font-bold leading-tight inline-block"
                    style={{ fontFamily: "'Caveat', cursive" }}
                  >
                    Technology<br />for a Healthier<br />Tomorrow ♡
                  </span>
                </div>
              </div>

              {/* 3 Slider indicators */}
              <div className="flex items-center gap-1.5 pt-0.5 pb-0.5">
                <span className="w-4 min-[320px]:w-5 min-[360px]:w-6 h-1 min-[320px]:h-1.5 rounded-full bg-[#0070F3]" />
                <span className="w-1 min-[320px]:w-1.5 h-1 min-[320px]:h-1.5 rounded-full bg-slate-300" />
                <span className="w-1 min-[320px]:w-1.5 h-1 min-[320px]:h-1.5 rounded-full bg-slate-300" />
              </div>
            </div>

            {/* RIGHT CONTENT: Doctors Hero Cutout (waist terminates behind the top curve of white card) */}
            <div
              className="absolute right-[-4px] min-[340px]:right-[-6px] min-[360px]:right-[-8px] bottom-0 w-[50%] min-[320px]:w-[56%] min-[360px]:w-[63%] max-w-[165px] min-[320px]:max-w-[205px] min-[360px]:max-w-[245px] min-[400px]:max-w-[275px] h-[105%] z-10 pointer-events-none select-none flex items-end justify-end"
            >
              <img
                src={doctorCutout}
                alt="PEHAL Healthcare Doctors"
                className="w-full h-full object-contain object-bottom drop-shadow-[0_12px_22px_rgba(0,0,0,0.08)]"
              />
            </div>
          </div>
        </div>

        {/* ── WHITE LOGIN CARD (Full-width bottom sheet extending to viewport bottom) ── */}
        <div
          className="relative z-20 w-full bg-white rounded-t-[28px] min-[360px]:rounded-t-[32px] rounded-b-none shadow-[0_-8px_30px_rgba(0,112,243,0.08)] border-t border-[#E2E8F0]/60 flex flex-col flex-1 -mt-3.5 min-[360px]:-mt-4.5"
        >
          <div className="mobile-card-inner w-full max-w-[440px] mx-auto px-3.5 min-[360px]:px-5 pt-3.5 min-[360px]:pt-4.5 pb-6 flex flex-col flex-1">
            {/* Role Tabs */}
            {mode === 'login' && (
              <div
                className="mobile-role-tabs flex items-center bg-[#E0F2FE] border border-[#BAE6FD]/80 p-1 rounded-2xl mb-2.5 min-[360px]:mb-3.5"
                role="tablist"
              >
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab.key);
                        setError('');
                        setAuthMethod('password');
                        setOtpStep('email');
                      }}
                      className={`mobile-role-tab-btn flex-1 min-w-0 flex items-center justify-center gap-0.5 min-[340px]:gap-1 min-[360px]:gap-1.5 py-1.5 min-[360px]:py-2 px-0.5 min-[330px]:px-1 min-[360px]:px-2 rounded-xl text-[10px] min-[330px]:text-[10.5px] min-[360px]:text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-gradient-to-r from-[#0070F3] to-[#0051CC] text-white shadow-xs'
                          : 'text-[#0284C7] hover:text-[#0051CC] font-semibold'
                      }`}
                    >
                      <span className="shrink-0 mobile-tab-icon">{tab.icon}</span>
                      <span className="hidden min-[310px]:inline truncate whitespace-nowrap">{tab.label}</span>
                      <span className="inline min-[310px]:hidden whitespace-nowrap">{tab.shortLabel || tab.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Inline Error Message */}
            {error && mode === 'login' && (
              <div className="flex items-start gap-2 mb-2 p-2 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-semibold">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* STANDARD PASSWORD LOGIN */}
            {authMethod === 'password' && mode === 'login' && (
              <form onSubmit={handlePasswordSubmit} className="space-y-2 min-[360px]:space-y-2.5 min-[400px]:space-y-3">
                <div>
                  <label className="mobile-input-label block text-xs min-[360px]:text-[13px] font-semibold text-slate-800 mb-1">
                    Email or Mobile Number
                  </label>
                  <div className="relative">
                    <Mail size={16} className="mobile-input-icon absolute left-3 min-[360px]:left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder={isExtraSmall ? 'Enter email or mobile' : 'Enter email or mobile number'}
                      required
                      className="mobile-input w-full text-xs min-[360px]:text-[13.5px] font-normal text-slate-800 bg-[#FAFCFB] hover:bg-white focus:bg-white pl-[38px] min-[360px]:pl-10 pr-3 min-[360px]:pr-4 h-10.5 min-[360px]:h-11 min-[400px]:h-12 rounded-xl border border-[#E2E8F0] outline-none focus:border-[#0070F3] focus:ring-2 focus:ring-[#0070F3]/12 transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="mobile-input-label block text-xs min-[360px]:text-[13px] font-semibold text-slate-800 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock size={16} className="mobile-input-icon absolute left-3 min-[360px]:left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder={isExtraSmall ? 'Enter password' : 'Enter your password'}
                      required
                      className="mobile-input w-full text-xs min-[360px]:text-[13.5px] font-normal text-slate-800 bg-[#FAFCFB] hover:bg-white focus:bg-white pl-[38px] min-[360px]:pl-10 pr-9 min-[360px]:pr-10 h-10.5 min-[360px]:h-11 min-[400px]:h-12 rounded-xl border border-[#E2E8F0] outline-none focus:border-[#0070F3] focus:ring-2 focus:ring-[#0070F3]/12 transition-all placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="mobile-eye-btn absolute right-2 min-[360px]:right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="mobile-remember-row flex items-center justify-between text-[11px] min-[360px]:text-xs py-0.5 gap-1 w-full">
                  <label
                    onClick={() => setRememberDevice(!rememberDevice)}
                    className="mobile-remember-label flex items-center gap-1.5 min-[360px]:gap-2 cursor-pointer select-none text-slate-700 font-medium min-w-0"
                  >
                    <div
                      className={`mobile-remember-box w-3.5 h-3.5 min-[360px]:w-4 min-[360px]:h-4 rounded-[4px] flex items-center justify-center shrink-0 transition-all ${
                        rememberDevice
                          ? 'bg-[#0070F3] text-white shadow-xs'
                          : 'border border-[#E2E8F0] bg-white hover:border-[#0070F3]'
                      }`}
                    >
                      {rememberDevice && <Check size={10} strokeWidth={3.5} />}
                    </div>
                    <span className="mobile-remember-text truncate whitespace-nowrap">Remember this device</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot_password');
                      setError('');
                    }}
                    className="mobile-forgot-link font-bold text-[#0070F3] hover:underline cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="mobile-submit-btn w-full h-10.5 min-[360px]:h-11 min-[400px]:h-12 rounded-xl font-bold text-xs min-[360px]:text-sm text-white bg-gradient-to-r from-[#0070F3] to-[#0051CC] shadow-md shadow-[#0070F3]/25 flex items-center justify-center gap-1.5 min-[360px]:gap-2 transition-all cursor-pointer disabled:opacity-70 active:scale-[0.99] hover:brightness-105"
                >
                  <Lock size={14} className="mobile-btn-icon shrink-0" />
                  <span className="truncate">Login as {getActiveRoleLabel()}</span>
                  <ArrowRight size={14} className="mobile-btn-icon shrink-0" />
                </button>

                <div className="mobile-or-divider flex items-center justify-center gap-2 my-1.5 min-[360px]:my-2.5 w-full">
                  <div className="flex-1 border-t border-slate-200" />
                  <span className="mobile-or-text bg-white px-2 text-xs font-normal text-slate-400 shrink-0 select-none">
                    or
                  </span>
                  <div className="flex-1 border-t border-slate-200" />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod('otp');
                    setOtpStep('email');
                    setError('');
                  }}
                  className="mobile-otp-btn w-full h-10.5 min-[360px]:h-11 min-[400px]:h-12 rounded-xl font-semibold text-xs min-[360px]:text-sm text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs flex items-center justify-center gap-1.5 min-[360px]:gap-2 transition-all cursor-pointer active:scale-[0.99]"
                >
                  <Smartphone size={15} className="mobile-btn-icon text-slate-700 shrink-0" />
                  <span className="whitespace-nowrap">Login using <strong className="font-extrabold text-slate-900">OTP</strong></span>
                </button>

                <div className="mobile-register-row flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-center pt-1 min-[360px]:pt-1.5 pb-0.5 text-[11px] min-[360px]:text-xs font-medium text-[#64748B]">
                  <span className="whitespace-nowrap">New to PEHAL Healthcare?</span>
                  <Link
                    to="/register-clinic"
                    className="font-bold text-[#0070F3] hover:underline inline-flex items-center gap-0.5 whitespace-nowrap"
                  >
                    <span>Register Your Clinic</span>
                    <ArrowRight size={11} className="shrink-0" />
                  </Link>
                </div>
              </form>
            )}

            {/* OTP LOGIN FLOW */}
            {authMethod === 'otp' && mode === 'login' && (
              <div className="space-y-2 min-[360px]:space-y-2.5 min-[400px]:space-y-3">
                {otpStep === 'email' ? (
                  <form onSubmit={handleSendOtp} className="space-y-2 min-[360px]:space-y-2.5 min-[400px]:space-y-3">
                    <div>
                      <label className="mobile-input-label block text-xs min-[360px]:text-[13px] font-semibold text-slate-800 mb-1">
                        Registered Email Address
                      </label>
                      <div className="relative">
                        <Mail size={16} className="mobile-input-icon absolute left-3 min-[360px]:left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="email"
                          value={otpEmail}
                          onChange={(e) => setOtpEmail(e.target.value)}
                          placeholder="name@clinic.com"
                          required
                          className="mobile-input w-full text-xs min-[360px]:text-[13.5px] font-normal text-slate-800 bg-[#FAFCFB] hover:bg-white focus:bg-white pl-[38px] min-[360px]:pl-10 pr-3 min-[360px]:pr-4 h-10.5 min-[360px]:h-11 min-[400px]:h-12 rounded-xl border border-[#E2E8F0] outline-none focus:border-[#0070F3] focus:ring-2 focus:ring-[#0070F3]/12"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="mobile-submit-btn w-full h-10.5 min-[360px]:h-11 min-[400px]:h-12 rounded-xl font-bold text-xs min-[360px]:text-sm text-white bg-gradient-to-r from-[#0070F3] to-[#0051CC] shadow-md shadow-[#087443]/20 flex items-center justify-center gap-1.5 min-[360px]:gap-2 cursor-pointer disabled:opacity-70 active:scale-[0.99] hover:brightness-105"
                    >
                      <span>Send Verification Code</span>
                      <ArrowRight size={14} className="mobile-btn-icon" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAuthMethod('password');
                        setError('');
                      }}
                      className="w-full text-center text-xs font-bold text-slate-600 hover:text-slate-800 pt-0.5 cursor-pointer"
                    >
                      Back to Password Login
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-2 min-[360px]:space-y-2.5 min-[400px]:space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="mobile-input-label text-xs min-[360px]:text-[13px] font-semibold text-slate-800">
                          Enter 6-Digit Code
                        </label>
                        <button
                          type="button"
                          onClick={() => setOtpStep('email')}
                          className="text-[11px] min-[360px]:text-xs font-bold text-[#0070F3] hover:underline"
                        >
                          Change Email
                        </button>
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        {otpDigits.map((digit, idx) => (
                          <input
                            key={idx}
                            ref={(el) => (mobileOtpInputRefs.current[idx] = el)}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                            className="mobile-otp-digit w-8.5 min-[360px]:w-10.5 h-10 min-[360px]:h-11 text-center text-sm min-[360px]:text-base font-bold text-slate-800 bg-white rounded-xl border border-[#E2E8F0] outline-none focus:border-[#0070F3] focus:ring-2 focus:ring-[#0070F3]/12"
                          />
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="mobile-submit-btn w-full h-10.5 min-[360px]:h-11 min-[400px]:h-12 rounded-xl font-bold text-xs min-[360px]:text-sm text-white bg-gradient-to-r from-[#0070F3] to-[#0051CC] shadow-md shadow-[#087443]/20 flex items-center justify-center gap-1.5 min-[360px]:gap-2 cursor-pointer disabled:opacity-70 active:scale-[0.99] hover:brightness-105"
                    >
                      <CheckCircle2 size={15} className="mobile-btn-icon" />
                      <span>Verify &amp; Sign In</span>
                    </button>

                    <div className="flex items-center justify-between text-[11px] min-[360px]:text-xs pt-0.5">
                      <button
                        type="button"
                        disabled={resendCooldown > 0 || submitting}
                        onClick={handleResendOtp}
                        className="font-bold text-[#0070F3] disabled:text-slate-400 hover:underline cursor-pointer"
                      >
                        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuthMethod('password')}
                        className="font-semibold text-slate-500 hover:text-slate-700"
                      >
                        Use Password
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* FORGOT PASSWORD FLOW */}
            {mode === 'forgot_password' && (
              <div className="space-y-2.5 min-[360px]:space-y-3.5">
                {resetError && (
                  <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-semibold">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{resetError}</span>
                  </div>
                )}

                {resetStep === 'request' && (
                  <form onSubmit={handleResetRequestSubmit} className="space-y-2.5 min-[360px]:space-y-3.5">
                    <div>
                      <label className="mobile-input-label block text-xs min-[360px]:text-[13px] font-semibold text-slate-800 mb-1">
                        Account Email
                      </label>
                      <div className="relative">
                        <Mail size={16} className="mobile-input-icon absolute left-3.5 min-[360px]:left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="email"
                          value={resetForm.email}
                          onChange={(e) => setResetForm({ ...resetForm, email: e.target.value })}
                          placeholder="Enter registered email"
                          required
                          className="mobile-input w-full text-xs min-[360px]:text-[13.5px] font-normal text-slate-800 bg-[#FAFCFB] hover:bg-white focus:bg-white pl-9 min-[360px]:pl-11 pr-3 min-[360px]:pr-4 h-11 min-[360px]:h-12 rounded-xl border border-[#E2E8F0] outline-none focus:border-[#0070F3] focus:ring-2 focus:ring-[#0070F3]/12"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={resetSubmitting}
                      className="mobile-submit-btn w-full h-11 min-[360px]:h-12 rounded-xl font-bold text-xs min-[360px]:text-sm text-white bg-gradient-to-r from-[#0070F3] to-[#0051CC] shadow-md shadow-[#087443]/20 flex items-center justify-center gap-1.5 min-[360px]:gap-2 cursor-pointer disabled:opacity-70 active:scale-[0.99] hover:brightness-105"
                    >
                      <span>Send Reset OTP</span>
                      <ArrowRight size={14} className="mobile-btn-icon" />
                    </button>

                    <button
                      type="button"
                      onClick={handleResetReturnToLogin}
                      className="w-full text-center text-xs font-bold text-slate-600 hover:text-slate-800 pt-0.5 cursor-pointer"
                    >
                      Back to Sign In
                    </button>
                  </form>
                )}

                {resetStep === 'verify' && (
                  <form onSubmit={handleResetChangePasswordSubmit} className="space-y-2.5 min-[360px]:space-y-3.5">
                    <div>
                      <label className="mobile-input-label block text-xs min-[360px]:text-[13px] font-semibold text-slate-800 mb-1">
                        Enter 6-Digit Reset Code
                      </label>
                      <div className="flex items-center justify-between gap-1">
                        {resetOtpDigits.map((digit, idx) => (
                          <input
                            key={idx}
                            ref={(el) => (mobileResetOtpInputRefs.current[idx] = el)}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleResetOtpDigitChange(idx, e.target.value)}
                            onKeyDown={(e) => handleResetOtpKeyDown(idx, e)}
                            className="mobile-otp-digit w-9 min-[360px]:w-11 h-11 min-[360px]:h-12 text-center text-sm min-[360px]:text-base font-bold text-slate-800 bg-white rounded-xl border border-[#E2E8F0] outline-none focus:border-[#0070F3] focus:ring-2 focus:ring-[#0070F3]/12"
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="mobile-input-label block text-xs min-[360px]:text-[13px] font-semibold text-slate-800 mb-1">
                        New Password
                      </label>
                      <div className="relative">
                        <Lock size={16} className="mobile-input-icon absolute left-3.5 min-[360px]:left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type={showResetPassword ? 'text' : 'password'}
                          value={resetForm.password}
                          onChange={(e) => setResetForm({ ...resetForm, password: e.target.value })}
                          placeholder="At least 6 characters"
                          required
                          className="mobile-input w-full text-xs min-[360px]:text-[13.5px] font-normal text-slate-800 bg-[#FAFCFB] hover:bg-white focus:bg-white pl-9 min-[360px]:pl-11 pr-9 min-[360px]:pr-11 h-11 min-[360px]:h-12 rounded-xl border border-[#E2E8F0] outline-none focus:border-[#0070F3] focus:ring-2 focus:ring-[#0070F3]/12"
                        />
                        <button
                          type="button"
                          onClick={() => setShowResetPassword(!showResetPassword)}
                          className="mobile-eye-btn absolute right-2.5 min-[360px]:right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                        >
                          {showResetPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="mobile-input-label block text-xs min-[360px]:text-[13px] font-semibold text-slate-800 mb-1">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <Lock size={16} className="mobile-input-icon absolute left-3.5 min-[360px]:left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type={showResetConfirmPassword ? 'text' : 'password'}
                          value={resetForm.confirmPassword}
                          onChange={(e) => setResetForm({ ...resetForm, confirmPassword: e.target.value })}
                          placeholder="Re-enter new password"
                          required
                          className="mobile-input w-full text-xs min-[360px]:text-[13.5px] font-normal text-slate-800 bg-[#FAFCFB] hover:bg-white focus:bg-white pl-9 min-[360px]:pl-11 pr-9 min-[360px]:pr-11 h-11 min-[360px]:h-12 rounded-xl border border-[#E2E8F0] outline-none focus:border-[#0070F3] focus:ring-2 focus:ring-[#0070F3]/12"
                        />
                        <button
                          type="button"
                          onClick={() => setShowResetConfirmPassword(!showResetConfirmPassword)}
                          className="mobile-eye-btn absolute right-2.5 min-[360px]:right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                        >
                          {showResetConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={resetSubmitting}
                      className="mobile-submit-btn w-full h-11 min-[360px]:h-12 rounded-xl font-bold text-xs min-[360px]:text-sm text-white bg-gradient-to-r from-[#0070F3] to-[#0051CC] shadow-md shadow-[#087443]/20 flex items-center justify-center gap-1.5 min-[360px]:gap-2 cursor-pointer disabled:opacity-70 active:scale-[0.99] hover:brightness-105"
                    >
                      <CheckCircle2 size={15} className="mobile-btn-icon" />
                      <span>Reset Password</span>
                    </button>

                    <div className="flex items-center justify-between text-[11px] min-[360px]:text-xs pt-0.5">
                      <button
                        type="button"
                        disabled={resetCooldown > 0 || resetSubmitting}
                        onClick={handleResendResetOtp}
                        className="font-bold text-[#0070F3] disabled:text-slate-400 hover:underline cursor-pointer"
                      >
                        {resetCooldown > 0 ? `Resend in ${resetCooldown}s` : 'Resend Code'}
                      </button>
                      <button
                        type="button"
                        onClick={handleResetReturnToLogin}
                        className="font-semibold text-slate-500 hover:text-slate-700"
                      >
                        Back to Sign In
                      </button>
                    </div>
                  </form>
                )}

                {resetStep === 'success' && (
                  <div className="text-center py-3 space-y-2.5">
                    <div className="w-10 h-10 min-[360px]:w-12 min-[360px]:h-12 rounded-full bg-[#E9F9F0] text-[#0070F3] flex items-center justify-center mx-auto">
                      <CheckCircle2 size={24} />
                    </div>
                    <h3 className="text-xs min-[360px]:text-sm font-black text-slate-800">Password Changed!</h3>
                    <p className="text-[11px] min-[360px]:text-xs text-slate-600 max-w-[240px] mx-auto">
                      {resetSuccess || 'You can now sign in with your new password.'}
                    </p>
                    <button
                      type="button"
                      onClick={handleResetReturnToLogin}
                      className="mobile-submit-btn w-full h-11 min-[360px]:h-12 rounded-xl font-bold text-xs min-[360px]:text-sm text-white bg-gradient-to-r from-[#0070F3] to-[#0051CC] shadow-md shadow-[#087443]/20 flex items-center justify-center gap-1.5 hover:brightness-105 transition"
                    >
                      <span>Sign In Now</span>
                      <ArrowRight size={14} className="mobile-btn-icon" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── 3 BOTTOM TRUST BADGES (Inside card footer) ── */}
            <div className="mobile-trust-badges pt-3 min-[360px]:pt-4 mt-auto border-t border-[#E2E8F0]/50 grid grid-cols-3 gap-0.5 min-[360px]:gap-1 text-left">
              <div className="mobile-trust-item flex items-start gap-1 min-[360px]:gap-1.5 pr-0.5 min-[360px]:pr-1">
                <Shield size={15} className="mobile-trust-icon text-[#0070F3] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="mobile-trust-title text-[8px] min-[330px]:text-[9px] min-[360px]:text-[10px] sm:text-[10.5px] font-bold text-slate-800 leading-tight">
                    <span className="hidden min-[330px]:inline">Secure &amp; Compliant</span>
                    <span className="inline min-[330px]:hidden">Secure</span>
                  </p>
                  <p className="mobile-trust-desc text-[7px] min-[330px]:text-[7.5px] min-[360px]:text-[8px] sm:text-[8.5px] text-slate-500 leading-tight mt-0.5">
                    <span className="hidden min-[330px]:inline">Your data is safe</span>
                    <span className="inline min-[330px]:hidden">100% Safe</span>
                  </p>
                </div>
              </div>
              <div className="mobile-trust-item flex items-start gap-1 min-[360px]:gap-1.5 border-l border-slate-200/80 px-1 min-[360px]:px-1.5">
                <Cloud size={15} className="mobile-trust-icon text-[#0070F3] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="mobile-trust-title text-[8px] min-[330px]:text-[9px] min-[360px]:text-[10px] sm:text-[10.5px] font-bold text-slate-800 leading-tight">Cloud Based</p>
                  <p className="mobile-trust-desc text-[7px] min-[330px]:text-[7.5px] min-[360px]:text-[8px] sm:text-[8.5px] text-slate-500 leading-tight mt-0.5">
                    <span className="hidden min-[330px]:inline">Access anywhere</span>
                    <span className="inline min-[330px]:hidden">Anywhere</span>
                  </p>
                </div>
              </div>
              <div className="mobile-trust-item flex items-start gap-1 min-[360px]:gap-1.5 border-l border-slate-200/80 pl-1 min-[360px]:pl-1.5">
                <Heart size={15} className="mobile-trust-icon text-[#0070F3] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="mobile-trust-title text-[8px] min-[330px]:text-[9px] min-[360px]:text-[10px] sm:text-[10.5px] font-bold text-slate-800 leading-tight">Patient First</p>
                  <p className="mobile-trust-desc text-[7px] min-[330px]:text-[7.5px] min-[360px]:text-[8px] sm:text-[8.5px] text-slate-500 leading-tight mt-0.5">Better care</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
