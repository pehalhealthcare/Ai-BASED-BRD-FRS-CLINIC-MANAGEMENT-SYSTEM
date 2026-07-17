import { useState, useEffect } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';
import ErrorState from '../components/common/ErrorState';
import Input from '../components/common/Input';
import { getDefaultRouteForRole } from '../constants/routes';
import useAuth from '../hooks/useAuth';
import { authApi } from '../lib/api';
import {
  Heart, Pill, FlaskConical, AlertTriangle, Shield, Calendar,
  User, Eye, EyeOff, Lock, Mail, Users, CheckCircle2, ChevronRight, Building2,Sparkles 
} from 'lucide-react';

const LoginPage = () => {
  const { login, isAuthenticated, loading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Parse query parameter ?type=patient or ?type=staff
  const queryParams = new URLSearchParams(location.search);
  const typeParam = queryParams.get('type'); // 'patient' or 'staff'
  
  const [activeTab, setActiveTab] = useState(typeParam || 'patient');
  const [form, setForm] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [mode, setMode] = useState('login'); // 'login' or 'forgot_password'
  const [resetForm, setResetForm] = useState({ email: '', password: '', confirmPassword: '' });
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);

  // Sync tab state with query parameter if it changes
  useEffect(() => {
    if (typeParam) {
      setActiveTab(typeParam);
    }
  }, [typeParam]);

  if (isAuthenticated && !loading) {
    return <Navigate to={getDefaultRouteForRole(user?.role)} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const authData = await login(form);
      if (authData?.requiresOtp) {
        if (authData.role === 'DOCTOR') {
          navigate('/doctor-verify-otp', { state: { email: authData.email }, replace: true });
        } else {
          navigate('/staff-verify-otp', { state: { email: authData.email }, replace: true });
        }
        return;
      }
      const userRole = authData?.user?.role;
      const clinic = authData?.user?.clinic;
      
      // Perform role verification
      if (activeTab === 'patient' && userRole !== 'PATIENT') {
        setError('Only patient accounts can sign in here.');
        setSubmitting(false);
        return;
      }
      if (activeTab === 'staff' && userRole === 'PATIENT') {
        setError('Only doctor, staff, and admin accounts can sign in here.');
        setSubmitting(false);
        return;
      }

      // Clinic Admin: Redirect based on clinic approval status
      if (userRole === 'ADMIN' && clinic) {
        const { approvalStatus, subscription, isOnboardingCompleted } = clinic;

        if (approvalStatus === 'pending_approval') {
          navigate('/clinic/status', { replace: true });
          return;
        }
        if (approvalStatus === 'rejected') {
          navigate('/clinic/corrections', { replace: true });
          return;
        }
        if (approvalStatus === 'suspended' || subscription?.status === 'Suspended') {
          navigate('/clinic/suspended', { replace: true });
          return;
        }
        if (subscription?.status === 'Expired') {
          navigate('/clinic/expired', { replace: true });
          return;
        }
        if (approvalStatus === 'approved' && !isOnboardingCompleted) {
          navigate('/clinic/onboarding', { replace: true });
          return;
        }
      }

      navigate(location.state?.from?.pathname || getDefaultRouteForRole(userRole), { replace: true });
    } catch (loginError) {
      setError(loginError?.response?.data?.message || loginError?.message || 'Unable to sign in.');
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
      await authApi.resetPassword({
        email: resetForm.email,
        password: resetForm.password
      });
      setResetSuccess('Password has been reset successfully. You can now sign in.');
      setResetForm({ email: '', password: '', confirmPassword: '' });
    } catch (err) {
      setResetError(err.response?.data?.message || err.message || 'Failed to reset password.');
    } finally {
      setResetSubmitting(false);
    }
  };

  const themeColor = activeTab === 'patient' ? 'purple' : 'emerald';
  const themeAccentHex = activeTab === 'patient' ? '#7c3aed' : '#059669';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">

      {/* ── HEADER ── */}
      <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Heart size={20} fill="currentColor" />
          </div>
          <span className="text-lg font-black tracking-tight text-slate-900">
            AICMS <span className="text-blue-600 font-bold">Portal</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link to="/" className="text-xs font-bold text-slate-600 hover:text-blue-650 transition">
            Back to Home
          </Link>
        </div>
      </header>

      {/* ── SPLIT BODY ── */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto p-6 gap-8 items-stretch justify-center">

        {/* Left Side: Benefits and Stats */}
        <div className="flex-1 bg-white border border-slate-200/60 rounded-3xl p-8 flex flex-col justify-between shadow-sm">
          <div className="space-y-6">
            <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              activeTab === 'patient' ? 'bg-purple-50 border border-purple-100 text-purple-650' : 'bg-emerald-50 border border-emerald-100 text-emerald-650'
            }`}>
              {activeTab === 'patient' ? 'Patient Portal Access' : 'Clinic Workspace Login'}
            </span>
            
            <h2 className="text-3xl font-black text-slate-900 leading-tight">
              {activeTab === 'patient' ? (
                <>Smart Healthcare, <br /><span className="text-purple-600">Simplified for You</span></>
              ) : (
                <>Practice Medicine, <br /><span className="text-emerald-600">Powered by AI</span></>
              )}
            </h2>
            
            <p className="text-sm text-slate-500 leading-relaxed max-w-md">
              {activeTab === 'patient' 
                ? 'Access your prescriptions, schedule clinic visits, receive lab results, and chat with our smart triage assistant.' 
                : 'Manage patient workflows, write digital prescriptions, check automated lab reports, and manage appointment timings.'}
            </p>

            {/* Benefits Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4">
              {activeTab === 'patient' ? (
                <>
                  {[
                    { title: 'Easy Appointments', desc: 'Book appointments with verified doctors in just a few clicks.', icon: <Calendar size={18} />, color: 'text-purple-500', bg: 'bg-purple-50 border-purple-100' },
                    { title: 'Secure Health Records', desc: 'Your medical history and prescriptions stored safely.', icon: <Shield size={18} />, color: 'text-blue-500', bg: 'bg-blue-50 border-blue-100' },
                    { title: 'Medicine Store', desc: 'Order doctor prescribed medicines directly online.', icon: <Pill size={18} />, color: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-100' },
                    { title: 'Home Lab Tests', desc: 'Schedule samples collections and fetch digital reports.', icon: <FlaskConical size={18} />, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-100' }
                  ].map((item, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className={`w-8 h-8 rounded-lg ${item.bg} border ${item.color} flex items-center justify-center shrink-0`}>
                        {item.icon}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">{item.title}</h4>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  {[
                    { title: 'Patient Timelines', desc: 'Review unified history, past treatments, and chronic conditions.', icon: <Users size={18} />, color: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-100' },
                    { title: 'AI Assistant', desc: 'Generate medical notes and summaries automatically.', icon: <Sparkles className="w-[18px] h-[18px]" />, color: 'text-blue-500', bg: 'bg-blue-50 border-blue-100' },
                    { title: 'Billing Control', desc: 'Raise bills, process checkout invoices, and track revenue.', icon: <Building2 size={18} />, color: 'text-purple-500', bg: 'bg-purple-50 border-purple-100' },
                    { title: 'Smart Timings', desc: 'Toggle holiday settings and set availability hours.', icon: <Calendar size={18} />, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-100' }
                  ].map((item, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className={`w-8 h-8 rounded-lg ${item.bg} border ${item.color} flex items-center justify-center shrink-0`}>
                        {item.icon}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">{item.title}</h4>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Stats Bar */}
          <div className="border-t border-slate-100 mt-10 pt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Happy Patients', value: '50K+', icon: <Users size={14} className="text-blue-600" /> },
              { label: 'Expert Doctors', value: '1K+', icon: <User size={14} className="text-emerald-600" /> },
              { label: 'Clinics & Hospitals', value: '500+', icon: <Building2 size={14} className="text-purple-600" /> },
              { label: 'Secure & Safe', value: '100%', icon: <Shield size={14} className="text-blue-600" /> }
            ].map((stat, idx) => (
              <div key={idx} className="text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-1 text-slate-900 font-black text-lg">
                  {stat.icon} <span>{stat.value}</span>
                </div>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Form Card */}
        <div className="w-full lg:w-[480px] bg-white border border-slate-200/60 rounded-3xl p-8 flex flex-col justify-center shadow-sm shrink-0">
          
          {/* Tab Selector (only visible if type query is not hardcoded) */}
          {!typeParam && (
            <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('patient');
                  setError('');
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                  activeTab === 'patient' ? 'bg-white text-purple-650 shadow-sm' : 'text-slate-500'
                }`}
              >
                Patient Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('staff');
                  setError('');
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                  activeTab === 'staff' ? 'bg-white text-emerald-650 shadow-sm' : 'text-slate-500'
                }`}
              >
                Staff Login
              </button>
            </div>
          )}

          {mode === 'login' ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-black text-slate-900">
                  {activeTab === 'patient' ? 'Patient Sign In' : 'Staff Sign In'}
                </h3>
                <p className="text-xs text-slate-400 mt-1.5">
                  {activeTab === 'patient' 
                    ? 'Enter your patient account details to access the portal.' 
                    : 'Log in to access clinic workspaces and clinical modules.'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">Email Address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="Enter your email address"
                      className={`w-full pl-10 pr-4 py-3.5 text-sm bg-white text-black rounded-xl border border-slate-200 outline-none transition focus:ring-1 ${
                        activeTab === 'patient' 
                          ? 'focus:border-purple-500 focus:ring-purple-100' 
                          : 'focus:border-emerald-500 focus:ring-emerald-100'
                      }`}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="Enter your password"
                      className={`w-full pl-10 pr-10 py-3.5 text-sm bg-white text-black rounded-xl border border-slate-200 outline-none transition focus:ring-1 ${
                        activeTab === 'patient' 
                          ? 'focus:border-purple-500 focus:ring-purple-100' 
                          : 'focus:border-emerald-500 focus:ring-emerald-100'
                      }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-650 transition cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1.5">
                  <label className="flex items-center gap-2 font-semibold text-slate-600 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className={`rounded border-slate-350 ${
                        activeTab === 'patient' ? 'text-purple-600 focus:ring-purple-500' : 'text-emerald-600 focus:ring-emerald-500'
                      }`} 
                    />
                    Remember me
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot_password');
                      setError('');
                      setResetError('');
                      setResetSuccess('');
                    }}
                    className={`font-bold hover:underline cursor-pointer ${
                      activeTab === 'patient' ? 'text-purple-600' : 'text-emerald-600'
                    }`}
                  >
                    Forgot Password?
                  </button>
                </div>

                {error && <ErrorState title="Login failed" description={error} />}

                <button
                  type="submit"
                  disabled={submitting}
                  className={`w-full py-3.5 rounded-xl text-white text-sm font-bold shadow-md transition cursor-pointer ${
                    activeTab === 'patient'
                      ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/10 hover:shadow-purple-500/20'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/10 hover:shadow-emerald-500/20'
                  }`}
                >
                  {submitting ? 'Logging in...' : 'Login'}
                </button>
              </form>

              {activeTab === 'patient' ? (
                <p className="text-center text-xs text-slate-500 pt-4">
                  Don't have a patient account?{' '}
                  <Link to="/register?type=patient" className="font-bold text-purple-600 hover:underline">
                    Create patient account
                  </Link>
                </p>
              ) : (
                <p className="text-center text-xs text-slate-400 font-semibold pt-4">
                  🔑 Staff & Doctor credentials are created directly by the clinic administrator.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-black text-slate-900">Reset Password</h3>
                <p className="text-xs text-slate-400 mt-1.5">Enter your email and choose a new password.</p>
              </div>

              <form onSubmit={handleResetSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={resetForm.email}
                      onChange={(e) => setResetForm({ ...resetForm, email: e.target.value })}
                      placeholder="Enter your email"
                      className="w-full pl-10 pr-4 py-3 text-sm bg-white text-black rounded-xl border border-slate-200 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100 transition"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">New Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      value={resetForm.password}
                      onChange={(e) => setResetForm({ ...resetForm, password: e.target.value })}
                      placeholder="Enter new password"
                      className="w-full pl-10 pr-4 py-3 text-sm bg-white text-black rounded-xl border border-slate-200 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100 transition"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">Confirm New Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      value={resetForm.confirmPassword}
                      onChange={(e) => setResetForm({ ...resetForm, confirmPassword: e.target.value })}
                      placeholder="Confirm new password"
                      className="w-full pl-10 pr-4 py-3 text-sm bg-white text-black rounded-xl border border-slate-200 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100 transition"
                      required
                    />
                  </div>
                </div>

                {resetError && <ErrorState title="Reset failed" description={resetError} />}
                {resetSuccess && (
                  <p className="rounded-xl bg-blue-50 px-4 py-3 text-xs text-blue-700 font-bold border border-blue-100">
                    {resetSuccess}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={resetSubmitting}
                  className="w-full py-3.5 rounded-xl bg-blue-650 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition cursor-pointer"
                >
                  {resetSubmitting ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>

              <p className="text-center text-xs text-slate-500">
                Remember your password?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError('');
                    setResetError('');
                    setResetSuccess('');
                  }}
                  className={`font-bold hover:underline cursor-pointer ${
                    activeTab === 'patient' ? 'text-purple-650' : 'text-emerald-650'
                  }`}
                >
                  Sign in here
                </button>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── FOOTER BAR ── */}
      <footer className="bg-slate-900 text-[11px] font-bold text-slate-450 py-5 px-6 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 shadow-inner">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <Heart size={10} fill="currentColor" />
          </div>
          <span className="text-slate-400">AICMS Portal. Your trusted partner in health and wellness.</span>
        </div>
        <div className="flex items-center gap-6 text-slate-500">
          <span>🛡 Trusted & Secure</span>
          <span>🔒 Privacy Protected</span>
          <span>📞 24/7 Support</span>
        </div>
      </footer>
    </div>
  )
};

export default LoginPage;
