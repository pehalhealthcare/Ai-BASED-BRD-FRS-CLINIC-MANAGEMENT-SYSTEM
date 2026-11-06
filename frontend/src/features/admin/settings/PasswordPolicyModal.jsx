import { useState } from 'react';
import { X, Lock, Check, Loader2 } from 'lucide-react';
import { clinicApi } from '../../../lib/api';

const PasswordPolicyModal = ({ isOpen, onClose, policy, clinicId, onSaved }) => {
  const [formData, setFormData] = useState({
    minLength: policy?.minLength || 8,
    requireUppercase: policy?.requireUppercase ?? true,
    requireNumber: policy?.requireNumber ?? true,
    requireSpecialChar: policy?.requireSpecialChar ?? true,
    expiryDays: policy?.expiryDays || 90
  });
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await clinicApi.update(clinicId, {
        securitySettings: {
          passwordPolicy: formData
        }
      });
      if (onSaved) onSaved(formData);
      onClose();
    } catch (err) {
      console.error('Failed to update password policy:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden animate-scaleUp">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Lock size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Password Policy</h3>
              <p className="text-[11px] text-slate-400">Configure complexity rules for all staff accounts</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Minimum Password Length (characters)
            </label>
            <input
              type="number"
              min={6}
              max={32}
              value={formData.minLength}
              onChange={(e) => setFormData(p => ({ ...p, minLength: Number(e.target.value) }))}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-2.5 pt-2">
            <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.requireUppercase}
                onChange={(e) => setFormData(p => ({ ...p, requireUppercase: e.target.checked }))}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <span>Require at least one uppercase letter (A-Z)</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.requireNumber}
                onChange={(e) => setFormData(p => ({ ...p, requireNumber: e.target.checked }))}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <span>Require at least one number (0-9)</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.requireSpecialChar}
                onChange={(e) => setFormData(p => ({ ...p, requireSpecialChar: e.target.checked }))}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <span>Require at least one special character (!@#$%^&*)</span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password Expiration Window (days)
            </label>
            <select
              value={formData.expiryDays}
              onChange={(e) => setFormData(p => ({ ...p, expiryDays: Number(e.target.value) }))}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
            >
              <option value={30}>30 Days</option>
              <option value={60}>60 Days</option>
              <option value={90}>90 Days (Recommended)</option>
              <option value={180}>180 Days</option>
              <option value={365}>365 Days</option>
              <option value={0}>Never Expire</option>
            </select>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-blue-600 text-xs font-bold text-white shadow-md shadow-blue-200 hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : null}
              <span>Save Policy</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordPolicyModal;

