import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, Stethoscope, Shield, Zap, HeartPulse } from 'lucide-react';

import { authApi } from '../../lib/api';
import { setCurrentUser, setToken } from '../../lib/auth';

const FEATURES = [
  { icon: <HeartPulse size={18} />, text: 'AI-powered symptom analysis' },
  { icon: <Shield size={18} />, text: 'Secure medical records management' },
  { icon: <Stethoscope size={18} />, text: 'Smart doctor matching' },
  { icon: <Zap size={18} />, text: 'Instant appointment booking' },
];

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setForm((cur) => ({ ...cur, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await authApi.login(form);
      setToken(response.data.accessToken);
      setCurrentUser(response.data.user);
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[var(--bg-base)]">

      {/* ── Left Branding Panel ── */}
      <div className="
        hidden lg:flex lg:flex-col lg:justify-between
        w-[45%] shrink-0 relative overflow-hidden
        bg-[#060d18] px-12 py-10
      ">
        {/* Animated gradient blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-aura-500/20 blur-3xl animate-pulse" />
          <div className="absolute top-1/2 -right-24 w-80 h-80 rounded-full bg-indigo-600/20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute -bottom-24 left-1/3 w-72 h-72 rounded-full bg-aura-400/10 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
              backgroundSize: '40px 40px'
            }}
          />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-3 animate-fade-in">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-aura-500 to-indigo-600 flex items-center justify-center shadow-glow-teal">
            <HeartPulse size={20} className="text-white" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-aura-400">AI-CMS</p>
            <p className="text-white font-semibold text-sm leading-tight">Clinic Management</p>
          </div>
        </div>

        {/* Headline */}
        <div className="relative space-y-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight">
              Healthcare,{' '}
              <span className="gradient-text">intelligently</span>{' '}
              managed.
            </h1>
            <p className="mt-4 text-base text-white/60 leading-relaxed">
              AI-powered clinic management for patients, doctors, and staff. One platform for complete care.
            </p>
          </div>

          <ul className="space-y-3">
            {FEATURES.map((f, i) => (
              <li
                key={i}
                className="flex items-center gap-3 text-sm text-white/70 animate-slide-up"
                style={{ animationDelay: `${200 + i * 80}ms` }}
              >
                <span className="w-7 h-7 rounded-lg bg-aura-500/15 border border-aura-500/20 flex items-center justify-center text-aura-400 shrink-0">
                  {f.icon}
                </span>
                {f.text}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer quote */}
        <div className="relative animate-fade-in" style={{ animationDelay: '600ms' }}>
          <p className="text-xs text-white/30">Trusted by clinics worldwide • HIPAA compliant</p>
        </div>
      </div>

      {/* ── Right Auth Form ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md animate-slide-up">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-aura-500 to-indigo-600 flex items-center justify-center">
              <HeartPulse size={18} className="text-white" />
            </div>
            <p className="font-bold text-slate-900 dark:text-white">AI-CMS</p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-aura-600 dark:text-aura-400">Welcome back</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">Sign in to your account</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Access the clinic platform with your registered credentials.
            </p>
          </div>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Email address
              </label>
              <div className="relative flex items-center">
                <Mail size={16} className="absolute left-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@clinic.com"
                  className="
                    w-full pl-10 pr-4 py-2.5 rounded-xl text-sm
                    bg-white dark:bg-navy-800
                    border border-slate-200 dark:border-white/10
                    text-slate-900 dark:text-slate-100
                    placeholder:text-slate-400 dark:placeholder:text-slate-600
                    focus:outline-none focus:border-aura-500 focus:ring-2 focus:ring-aura-500/20
                    transition
                  "
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-password" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Password
              </label>
              <div className="relative flex items-center">
                <Lock size={16} className="absolute left-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className="
                    w-full pl-10 pr-10 py-2.5 rounded-xl text-sm
                    bg-white dark:bg-navy-800
                    border border-slate-200 dark:border-white/10
                    text-slate-900 dark:text-slate-100
                    placeholder:text-slate-400 dark:placeholder:text-slate-600
                    focus:outline-none focus:border-aura-500 focus:ring-2 focus:ring-aura-500/20
                    transition
                  "
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-500/30 animate-slide-down">
                <span className="text-rose-500 mt-0.5 shrink-0">⚠</span>
                <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="
                w-full mt-2 py-2.5 px-4 rounded-xl
                bg-aura-600 hover:bg-aura-700 active:bg-aura-800
                dark:bg-aura-500 dark:hover:bg-aura-600
                text-white font-semibold text-sm
                shadow-sm hover:shadow-glow-teal
                transition-all duration-150
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center gap-2
              "
            >
              {loading && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Need an account?{' '}
            <Link to="/register" className="font-semibold text-aura-600 dark:text-aura-400 hover:text-aura-700 dark:hover:text-aura-300 transition">
              Create one here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
