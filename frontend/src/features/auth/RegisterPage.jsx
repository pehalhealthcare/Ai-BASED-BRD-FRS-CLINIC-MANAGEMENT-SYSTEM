import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Phone, Briefcase, HeartPulse } from 'lucide-react';

import { authApi, organizationApi } from '../../lib/api';
import { setCurrentUser, setToken } from '../../lib/auth';

const ROLES_OPTIONS = [
  { value: 'PATIENT', label: 'Patient', description: 'Access personal health portal' },
  { value: 'RECEPTIONIST', label: 'Receptionist', description: 'Manage appointments & records' },
  { value: 'DOCTOR', label: 'Doctor', description: 'Consultations & prescriptions' },
  { value: 'PHARMACIST', label: 'Pharmacist', description: 'Pharmacy & dispensing' },
  { value: 'LAB_TECHNICIAN', label: 'Lab Technician', description: 'Lab orders & reports' },
];

const RegisterPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'PATIENT' });
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
      const payload = { ...form, phone: form.phone || undefined };
      const response = await authApi.register(payload);
      setToken(response.data.accessToken);
      setCurrentUser(response.data.user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed. Please review your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[var(--bg-base)]">

      {/* ── Left Branding Panel ── */}
      <div className="
        hidden lg:flex lg:flex-col lg:justify-between
        w-[42%] shrink-0 relative overflow-hidden
        bg-[#060d18] px-12 py-10
      ">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-indigo-600/20 blur-3xl animate-pulse" />
          <div className="absolute top-1/3 -left-16 w-80 h-80 rounded-full bg-aura-500/15 blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
          <div className="absolute bottom-0 right-1/4 w-72 h-72 rounded-full bg-violet-600/10 blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
          <div className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)',
              backgroundSize: '28px 28px'
            }}
          />
        </div>

        <div className="relative flex items-center gap-3 animate-fade-in">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-aura-500 to-indigo-600 flex items-center justify-center shadow-glow-teal">
            <HeartPulse size={20} className="text-white" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-aura-400">AI-CMS</p>
            <p className="text-white font-semibold text-sm leading-tight">Clinic Management</p>
          </div>
        </div>

        <div className="relative animate-slide-up" style={{ animationDelay: '100ms' }}>
          <h1 className="text-4xl font-bold text-white leading-tight">
            Join the future of{' '}
            <span className="gradient-text">healthcare</span>.
          </h1>
          <p className="mt-4 text-base text-white/55 leading-relaxed">
            Create your account and get instant access to AI-powered clinic tools tailored to your role.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3">
            {[
              { n: '10K+', label: 'Patients managed' },
              { n: '500+', label: 'Doctors onboarded' },
              { n: '98%', label: 'Satisfaction rate' },
              { n: '24/7', label: 'AI availability' },
            ].map((s) => (
              <div key={s.n} className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <p className="text-2xl font-bold text-white">{s.n}</p>
                <p className="text-xs text-white/40 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-white/25 animate-fade-in" style={{ animationDelay: '500ms' }}>
          Secure • HIPAA Compliant • End-to-end encrypted
        </p>
      </div>

      {/* ── Right Register Form ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-lg animate-slide-up">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-aura-500 to-indigo-600 flex items-center justify-center">
              <HeartPulse size={18} className="text-white" />
            </div>
            <p className="font-bold text-slate-900 dark:text-white">AI-CMS</p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-aura-600 dark:text-aura-400">Get started</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">Create your account</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Register a clinic account. Admin accounts are seed-only.
            </p>
          </div>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            {/* Full Name */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-name" className="text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</label>
              <div className="relative flex items-center">
                <User size={16} className="absolute left-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
                <input
                  id="reg-name" name="name" type="text" required
                  value={form.name} onChange={handleChange} placeholder="Dr. Jane Smith"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-white dark:bg-navy-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-aura-500 focus:ring-2 focus:ring-aura-500/20 transition"
                />
              </div>
            </div>

            {/* Email + Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="reg-email" className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                <div className="relative flex items-center">
                  <Mail size={16} className="absolute left-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
                  <input
                    id="reg-email" name="email" type="email" required
                    value={form.email} onChange={handleChange} placeholder="you@clinic.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-white dark:bg-navy-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-aura-500 focus:ring-2 focus:ring-aura-500/20 transition"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="reg-phone" className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone <span className="text-slate-400 font-normal">(optional)</span></label>
                <div className="relative flex items-center">
                  <Phone size={16} className="absolute left-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
                  <input
                    id="reg-phone" name="phone" type="tel"
                    value={form.phone} onChange={handleChange} placeholder="9999999999"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-white dark:bg-navy-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-aura-500 focus:ring-2 focus:ring-aura-500/20 transition"
                  />
                </div>
              </div>
            </div>

            {/* Role selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Briefcase size={14} />Role
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ROLES_OPTIONS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setForm((c) => ({ ...c, role: r.value }))}
                    className={`
                      px-3 py-2.5 rounded-xl border text-left transition-all duration-150 text-sm
                      ${form.role === r.value
                        ? 'border-aura-500 bg-aura-50 dark:bg-aura-500/10 text-aura-700 dark:text-aura-300 shadow-sm'
                        : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20'
                      }
                    `}
                  >
                    <p className="font-semibold leading-none">{r.label}</p>
                    <p className="text-[10px] mt-1 opacity-60 leading-tight">{r.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-password" className="text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
              <div className="relative flex items-center">
                <Lock size={16} className="absolute left-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
                <input
                  id="reg-password" name="password" type={showPassword ? 'text' : 'password'} required
                  value={form.password} onChange={handleChange} placeholder="Create a strong password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm bg-white dark:bg-navy-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-aura-500 focus:ring-2 focus:ring-aura-500/20 transition"
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition" aria-label={showPassword ? 'Hide' : 'Show'}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-500/30 animate-slide-down">
                <span className="text-rose-500 shrink-0">⚠</span>
                <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit" disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-aura-600 hover:bg-aura-700 dark:bg-aura-500 dark:hover:bg-aura-600 text-white font-semibold text-sm shadow-sm hover:shadow-glow-teal transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Already registered?{' '}
            <Link to="/login" className="font-semibold text-aura-600 dark:text-aura-400 hover:text-aura-700 dark:hover:text-aura-300 transition">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
