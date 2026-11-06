import { useState } from 'react';
import { X, Smartphone, Monitor, ShieldCheck, LogOut, Loader2 } from 'lucide-react';
import { clinicApi } from '../../../lib/api';

const SessionManagementModal = ({ isOpen, onClose, securitySettings, clinicId, onSaved }) => {
  const [sessionTimeout, setSessionTimeout] = useState(securitySettings?.sessionManagement?.sessionTimeoutMinutes || 60);
  const [maxSessions, setMaxSessions] = useState(securitySettings?.sessionManagement?.maxConcurrentSessions || 3);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await clinicApi.update(clinicId, {
        securitySettings: {
          sessionManagement: {
            sessionTimeoutMinutes: Number(sessionTimeout),
            maxConcurrentSessions: Number(maxSessions)
          }
        }
      });
      if (onSaved) {
        onSaved({
          sessionTimeoutMinutes: Number(sessionTimeout),
          maxConcurrentSessions: Number(maxSessions)
        });
      }
      onClose();
    } catch (err) {
      console.error('Failed to update session settings:', err);
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
              <Monitor size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Session Management</h3>
              <p className="text-[11px] text-slate-400">Configure idle timeouts and concurrent session controls</p>
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
              Idle Session Inactivity Timeout
            </label>
            <select
              value={sessionTimeout}
              onChange={(e) => setSessionTimeout(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
            >
              <option value={15}>15 Minutes</option>
              <option value={30}>30 Minutes</option>
              <option value={60}>1 Hour (Standard)</option>
              <option value={120}>2 Hours</option>
              <option value={480}>8 Hours (Full Shift)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Maximum Concurrent Logins per User
            </label>
            <select
              value={maxSessions}
              onChange={(e) => setMaxSessions(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
            >
              <option value={1}>1 Device (Strict)</option>
              <option value={2}>2 Devices</option>
              <option value={3}>3 Devices (Recommended)</option>
              <option value={5}>5 Devices</option>
            </select>
          </div>

          {/* Current Session indicator */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                <ShieldCheck size={16} />
              </div>
              <div>
                <h5 className="text-xs font-bold text-slate-800">Current Active Session</h5>
                <p className="text-[10px] text-slate-400">This Device • Windows Chrome • Active Now</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/50">
              Current
            </span>
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
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SessionManagementModal;

