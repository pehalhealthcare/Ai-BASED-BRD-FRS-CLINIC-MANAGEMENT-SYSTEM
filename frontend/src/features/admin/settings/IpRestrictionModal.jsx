import { useState } from 'react';
import { X, Globe, Plus, Trash2, Check, AlertCircle } from 'lucide-react';
import { clinicApi } from '../../../lib/api';

const IpRestrictionModal = ({ isOpen, onClose, allowedIps = [], clinicId, onSaved }) => {
  const [ips, setIps] = useState(allowedIps.length > 0 ? allowedIps : ['203.122.45.18']);
  const [newIp, setNewIp] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleAdd = (e) => {
    e.preventDefault();
    setError('');
    const trimmed = newIp.trim();
    if (!trimmed) return;

    // Basic IPv4 / IPv6 validation
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    if (!ipRegex.test(trimmed)) {
      setError('Please enter a valid IP address (e.g. 192.168.1.1 or 203.122.45.18)');
      return;
    }

    if (ips.includes(trimmed)) {
      setError('This IP address is already in the allowlist.');
      return;
    }

    setIps([...ips, trimmed]);
    setNewIp('');
  };

  const handleRemove = (ip) => {
    setIps(ips.filter(item => item !== ip));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await clinicApi.update(clinicId, {
        securitySettings: {
          ipRestriction: {
            enabled: ips.length > 0,
            allowedIps: ips
          }
        }
      });
      if (onSaved) onSaved(ips);
      onClose();
    } catch (err) {
      console.error('Failed to save IP restrictions:', err);
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
              <Globe size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">IP Address Whitelist</h3>
              <p className="text-[11px] text-slate-400">Restrict clinic account access to specific trusted IPs</p>
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

        <div className="p-6 space-y-4">
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              value={newIp}
              onChange={(e) => setNewIp(e.target.value)}
              placeholder="e.g. 203.122.45.18"
              className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <Plus size={14} />
              <span>Add</span>
            </button>
          </form>

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-1.5">
              <AlertCircle size={13} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {ips.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No IP restrictions configured. All IPs allowed.</p>
            ) : (
              ips.map((ip) => (
                <div
                  key={ip}
                  className="p-2.5 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between text-xs"
                >
                  <span className="font-mono text-slate-800">{ip}</span>
                  <button
                    type="button"
                    onClick={() => handleRemove(ip)}
                    className="text-slate-400 hover:text-rose-600 transition"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
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
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-blue-600 text-xs font-bold text-white shadow-md shadow-blue-200 hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Whitelist'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IpRestrictionModal;

