import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Camera, User, Phone, Mail, Building, ShieldCheck, 
  Lock, CheckCircle2, AlertCircle, Loader2, KeyRound 
} from 'lucide-react';
import toast from 'react-hot-toast';
import Avatar from '../ui/Avatar';
import authApi from '../../api/authApi';

export const ViewProfileModal = ({ isOpen, onClose, user, onOpenEdit, onOpenChangePassword }) => {
  if (!isOpen) return null;

  const roleLabel = (() => {
    if (user?.role === 'admin') return 'Clinic Owner';
    if (user?.role === 'super_admin') return 'Super Administrator';
    if (user?.role === 'doctor') return user?.specialization?.name || 'Doctor';
    if (user?.role === 'receptionist') return 'Receptionist';
    return user?.role ? user.role.toUpperCase() : 'Staff Member';
  })();

  const clinicName = user?.clinic?.name || "Ram's Dental Clinic";
  const avatarSrc = user?.avatar || user?.profilePhoto || user?.image || user?.clinic?.ownerDetails?.profilePhoto;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden"
        >
          {/* Header Banner */}
          <div className="h-28 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative px-6 pt-5">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition"
              aria-label="Close"
            >
              <X size={16} />
            </button>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white backdrop-blur-md border border-white/20">
              <ShieldCheck size={12} /> {roleLabel}
            </span>
          </div>

          {/* Profile Avatar & Info */}
          <div className="px-6 pb-6 pt-0">
            <div className="relative -mt-14 mb-4 flex justify-between items-end">
              <Avatar
                src={avatarSrc}
                name={user?.name || 'User'}
                size="w-24 h-24 text-2xl"
                gradientBorder={true}
                showOnline={true}
                className="bg-white p-1 ring-4 ring-white shadow-xl"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { onClose(); onOpenEdit(); }}
                  className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-xs font-black transition border border-blue-200/60"
                >
                  Edit Profile
                </button>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                {user?.name || 'User'}
              </h2>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">{roleLabel}</p>
            </div>

            {/* Detail Rows */}
            <div className="mt-5 space-y-2.5">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                <Mail size={16} className="text-indigo-500 shrink-0" />
                <div className="min-w-0">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Email Address</span>
                  <span className="font-bold text-slate-800 truncate block">{user?.email || '—'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                <Phone size={16} className="text-emerald-500 shrink-0" />
                <div className="min-w-0">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Phone</span>
                  <span className="font-bold text-slate-800 truncate block">{user?.phone || 'Not configured'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                <Building size={16} className="text-blue-500 shrink-0" />
                <div className="min-w-0">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Associated Clinic</span>
                  <span className="font-bold text-slate-800 truncate block">{clinicName} • Indirapuram Branch</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => { onClose(); onOpenChangePassword(); }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5"
              >
                <KeyRound size={14} /> Change Password
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export const EditProfileModal = ({ isOpen, onClose, user, onUserUpdated }) => {
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || user?.profilePhoto || user?.image || user?.clinic?.ownerDetails?.profilePhoto || '');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name cannot be empty.');
      return;
    }

    setSaving(true);
    try {
      const response = await authApi.updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        avatar: avatarPreview,
        profilePhoto: avatarPreview
      });

      const updatedUser = response?.user || response?.data?.user;
      if (updatedUser && onUserUpdated) {
        onUserUpdated(updatedUser);
      }
      toast.success('Profile updated successfully!');
      onClose();
    } catch (err) {
      console.error('Failed to update profile:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900">Edit Profile</h2>
              <p className="text-[11px] text-slate-400 font-semibold">Update your avatar and personal details</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSave} className="p-6 space-y-4">
            {/* Avatar Uploader */}
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <Avatar
                  src={avatarPreview}
                  name={name || 'User'}
                  size="w-20 h-20 text-xl"
                  gradientBorder={true}
                  className="bg-white p-1 ring-4 ring-slate-100"
                />
                <div className="absolute inset-0 rounded-full bg-slate-950/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs">
                  <Camera size={20} />
                  <span className="text-[8px] font-bold mt-1">Upload</span>
                </div>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-black text-blue-600 hover:text-blue-700 transition"
                >
                  Choose New Photo
                </button>
                <p className="text-[10px] text-slate-400">JPG, PNG or WEBP (max. 5MB)</p>
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="e.g. Dr. King Sharma"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 transition"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl text-xs font-black text-white bg-blue-600 hover:bg-blue-700 active:scale-98 transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {saving && <Loader2 size={13} className="animate-spin" />}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export const ChangePasswordModal = ({ isOpen, onClose, userEmail }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      await authApi.resetPassword({
        email: userEmail,
        password: newPassword
      });
      toast.success('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } catch (err) {
      console.error('Failed to change password:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to update password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Lock size={15} />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900">Change Password</h2>
                <p className="text-[11px] text-slate-400 font-semibold">Keep your SaaS account safe</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">New Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter at least 6 characters"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New Password</label>
              <div className="relative">
                <CheckCircle2 size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 transition"
                />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 active:scale-98 transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {saving && <Loader2 size={13} className="animate-spin" />}
                {saving ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

