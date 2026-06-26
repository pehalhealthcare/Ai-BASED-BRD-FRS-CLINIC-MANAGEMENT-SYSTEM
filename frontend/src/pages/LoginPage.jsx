import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';
import ErrorState from '../components/common/ErrorState';
import Input from '../components/common/Input';
import { getDefaultRouteForRole } from '../constants/routes';
import useAuth from '../hooks/useAuth';
import { authApi } from '../lib/api';
import {
  Heart, Pill, FlaskConical, AlertTriangle, Shield, Calendar,
  User, Eye, EyeOff, Lock, Mail, Users, CheckCircle2, ChevronRight, Building2
} from 'lucide-react';

const LoginPage = () => {
  const { login, isAuthenticated, loading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [mode, setMode] = useState('login'); // 'login' or 'forgot_password'
  const [resetForm, setResetForm] = useState({ email: '', password: '', confirmPassword: '' });
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);

  if (isAuthenticated && !loading) {
    return <Navigate to={getDefaultRouteForRole(user?.role)} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const authData = await login(form);
      navigate(location.state?.from?.pathname || getDefaultRouteForRole(authData?.user?.role), { replace: true });
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">

      {/* ── HEADER ── */}
      <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
            <Heart size={20} fill="currentColor" />
          </div>
          <span className="text-lg font-black tracking-tight text-slate-900">
            Smart Clinic <span className="text-teal-600 font-bold">Management System</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-600">
          <Link to="/" className="hover:text-teal-600 transition flex items-center gap-1.5">
            <User size={16} className="text-teal-600" /> Find Doctor
          </Link>
          <Link to="/" className="hover:text-teal-600 transition flex items-center gap-1.5">
            <Pill size={16} className="text-emerald-600" /> Order Medicine
          </Link>
          <Link to="/" className="hover:text-teal-600 transition flex items-center gap-1.5">
            <FlaskConical size={16} className="text-purple-600" /> Lab Test
          </Link>
          <Link to="/" className="hover:text-teal-600 transition flex items-center gap-1.5 text-rose-600">
            <AlertTriangle size={16} className="text-rose-500" /> Emergency
          </Link>
        </nav>

        <Link to="/" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold transition shadow-sm">
          Get Started
        </Link>
      </header>

      {/* ── SPLIT BODY ── */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto p-6 gap-8 items-stretch justify-center">

        {/* Left Side: Benefits and Stats */}
        <div className="flex-1 bg-white border border-slate-200/60 rounded-3xl p-8 flex flex-col justify-between shadow-sm">
          <div className="space-y-6">
            <span className="inline-block px-3 py-1 rounded-full bg-teal-50 border border-teal-100 text-[10px] font-bold text-teal-600 uppercase tracking-wider">
              Your Health, Our Priority
            </span>
            <h2 className="text-3xl font-black text-slate-900 leading-tight">
              Smart Healthcare, <br />
              <span className="text-teal-600">Simplified for You</span>
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed max-w-md">
              Smart Clinic Management System connects you with the best doctors, clinics, and health services – all in one place. Book appointments, order medicines, run lab tests and get emergency help anytime, anywhere.
            </p>

            {/* Benefits Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4">
              {[
                { title: 'Easy Appointments', desc: 'Book appointments with verified doctors in just a few clicks.', icon: <Calendar size={18} />, color: 'text-teal-500', bg: 'bg-teal-50 border-teal-100' },
                { title: 'Quality Healthcare', desc: 'Connect with experienced and trusted healthcare professionals.', icon: <CheckCircle2 size={18} />, color: 'text-blue-500', bg: 'bg-blue-50 border-blue-100' },
                { title: 'Medicine Delivery', desc: 'Order medicines online and get them delivered fast to your doorstep.', icon: <Pill size={18} />, color: 'text-purple-500', bg: 'bg-purple-50 border-purple-100' },
                { title: 'Lab Tests at Home', desc: 'Book lab tests with home sample collection and get digital reports.', icon: <FlaskConical size={18} />, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-100' },
                { title: '24/7 Emergency', desc: 'Get instant help in medical emergencies anytime, anywhere.', icon: <AlertTriangle size={18} />, color: 'text-rose-500', bg: 'bg-rose-50 border-rose-100' },
                { title: 'Secure & Private', desc: 'Your health data is 100% secure and confidential with us.', icon: <Shield size={18} />, color: 'text-indigo-500', bg: 'bg-indigo-50 border-indigo-100' }
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
            </div>
          </div>

          {/* Stats Bar */}
          <div className="border-t border-slate-100 mt-10 pt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Happy Patients', value: '50K+', icon: <Users size={14} className="text-teal-600" /> },
              { label: 'Expert Doctors', value: '1K+', icon: <User size={14} className="text-blue-600" /> },
              { label: 'Clinics & Hospitals', value: '500+', icon: <Building2 size={14} className="text-purple-600" /> },
              { label: 'Secure & Safe', value: '100%', icon: <Shield size={14} className="text-emerald-600" /> }
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
          {mode === 'login' ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-black text-slate-900">Welcome Back!</h3>
                <p className="text-xs text-slate-400 mt-1.5">Login to your account and manage your healthcare seamlessly.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">Email or Phone Number</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="Enter your email or phone number"
                      className="w-full pl-10 pr-4 py-3.5 text-sm bg-white text-black rounded-xl border border-slate-200 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-100 transition"
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
                      className="w-full pl-10 pr-10 py-3.5 text-sm bg-white text-black rounded-xl border border-slate-200 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-100 transition"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1.5">
                  <label className="flex items-center gap-2 font-semibold text-slate-600 cursor-pointer">
                    <input type="checkbox" className="rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
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
                    className="font-bold text-teal-600 hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>

                {error && <ErrorState title="Login failed" description={error} />}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold shadow-md shadow-teal-500/10 hover:shadow-teal-500/20 transition cursor-pointer"
                >
                  {submitting ? 'Logging in...' : 'Login'}
                </button>
              </form>

              {/* Social Login */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <span className="w-1/4 border-b border-slate-100" />
                  <span>or continue with</span>
                  <span className="w-1/4 border-b border-slate-100" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => alert('Google authentication details coming soon')} className="flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition text-xs font-bold text-slate-600 cursor-pointer bg-white">
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Google</span>
                  </button>
                  <button onClick={() => alert('Apple authentication details coming soon')} className="flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition text-xs font-bold text-slate-600 cursor-pointer bg-white">
                    <svg className="w-4 h-4 fill-slate-800" viewBox="0 0 24 24">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.2.67-2.92 1.49-.62.71-1.16 1.85-1.01 2.96 1.12.09 2.27-.57 2.94-1.39z" />
                    </svg>
                    <span>Apple</span>
                  </button>
                </div>
              </div>

              <p className="text-center text-xs text-slate-500 pt-4">
                Don't have an account?{' '}
                <Link to="/register" className="font-bold text-teal-600 hover:underline">
                  Create an account
                </Link>
              </p>
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
                      className="w-full pl-10 pr-4 py-3 text-sm bg-white text-black rounded-xl border border-slate-200 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-100 transition"
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
                      className="w-full pl-10 pr-4 py-3 text-sm bg-white text-black rounded-xl border border-slate-200 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-100 transition"
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
                      className="w-full pl-10 pr-4 py-3 text-sm bg-white text-black rounded-xl border border-slate-200 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-100 transition"
                      required
                    />
                  </div>
                </div>

                {resetError && <ErrorState title="Reset failed" description={resetError} />}
                {resetSuccess && (
                  <p className="rounded-xl bg-teal-50 px-4 py-3 text-xs text-teal-700 font-bold border border-teal-100">
                    {resetSuccess}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={resetSubmitting}
                  className="w-full py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold transition cursor-pointer"
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
                  className="font-bold text-teal-600 hover:underline cursor-pointer"
                >
                  Sign in here
                </button>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── FOOTER BAR ── */}
      <footer className="bg-gradient-to-r from-teal-950 via-teal-900 to-teal-950 text-[11px] font-bold text-teal-100/80 py-5 px-6 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 shadow-inner">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-white flex items-center justify-center text-teal-900 shadow-sm">
            <Heart size={10} fill="currentColor" />
          </div>
          <span>Smart Clinic Management System. Your trusted partner in health and wellness.</span>
        </div>
        <div className="flex items-center gap-6 text-teal-200">
          <span>🛡 Trusted & Secure</span>
          <span>🔒 Privacy Protected</span>
          <span>📞 24/7 Support</span>
        </div>
      </footer>
    </div>
  );
};

export default LoginPage;
