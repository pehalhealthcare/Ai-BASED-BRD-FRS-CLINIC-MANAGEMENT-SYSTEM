import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, KeyRound, Eye, EyeOff, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../../lib/api';
import { setCurrentUser, setToken } from '../../lib/auth';

const StaffOtpVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';

  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP code.');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const response = await authApi.verifyFirstLoginOtp({ email, otp, newPassword });
      setToken(response.data.accessToken);
      setCurrentUser(response.data.user);
      toast.success('Email verified! Please complete your profile onboarding.');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      {/* Background blobs for rich aesthetics */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-slate-950/80 backdrop-blur-md rounded-3xl shadow-2xl border border-stone-800 overflow-hidden relative z-10">
        {/* Header */}
        <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-indigo-700 px-8 py-8 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20 shadow-lg">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-black leading-tight">Verify Your Email</h1>
          <p className="text-emerald-100 text-xs mt-2">
            Enter the 6-digit OTP code sent to <strong>{email}</strong><br />
            and choose your new secure password.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-8 space-y-5">
          {/* OTP */}
          <div>
            <label className="block text-[10px] font-bold text-stone-400 mb-1.5 uppercase tracking-widest">
              OTP Code
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 6-digit OTP"
                className="w-full pl-10 pr-4 py-3 border border-stone-800 bg-stone-900 rounded-xl text-sm font-mono tracking-[0.3em] text-center text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-[10px] font-bold text-stone-400 mb-1.5 uppercase tracking-widest">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Set secure password"
                className="w-full px-4 pr-10 py-3 border border-stone-800 bg-stone-900 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-450 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-white" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-[10px] font-bold text-stone-400 mb-1.5 uppercase tracking-widest">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                className="w-full px-4 pr-10 py-3 border border-stone-800 bg-stone-900 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-450 hover:text-white"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-white" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
          >
            {loading ? 'Verifying…' : (
              <>
                <Sparkles size={16} />
                Verify & Set Password
              </>
            )}
          </button>

          <p className="text-center text-xs text-stone-500 pt-2">
            Didn't receive the OTP?{' '}
            <button
              type="button"
              className="text-emerald-500 font-semibold hover:underline"
              onClick={() => navigate('/login')}
            >
              Go back to login to resend
            </button>
          </p>
        </form>

        {/* Footer brand */}
        <div className="border-t border-stone-900 px-8 py-4 flex items-center justify-center gap-2 text-stone-500 bg-slate-950">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span className="text-[10px] font-bold uppercase tracking-wider">AI-CMS Staff Network</span>
        </div>
      </div>
    </div>
  );
};

export default StaffOtpVerification;
