import { useState } from 'react';
import { X, Archive, Check, Loader2 } from 'lucide-react';
import { clinicApi } from '../../../lib/api';

const RETENTION_OPTIONS = [
  { days: 90, label: '3 Months (90 Days)' },
  { days: 180, label: '6 Months (180 Days)' },
  { days: 365, label: '1 Year (365 Days) — Recommended' },
  { days: 1095, label: '3 Years (1,095 Days)' },
  { days: 1825, label: '5 Years (1,825 Days) — Standard Medical Legal' },
  { days: 0, label: 'Indefinite (Keep all records forever)' }
];

const DataRetentionModal = ({ isOpen, onClose, currentDays = 365, clinicId, onSaved }) => {
  const [retentionDays, setRetentionDays] = useState(currentDays);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await clinicApi.update(clinicId, {
        backupSettings: {
          dataRetentionDays: Number(retentionDays)
        }
      });
      if (onSaved) onSaved(Number(retentionDays));
      onClose();
    } catch (err) {
      console.error('Failed to update retention policy:', err);
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
              <Archive size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Data Retention Policy</h3>
              <p className="text-[11px] text-slate-400">Configure how long clinical and billing data is retained</p>
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
          <p className="text-xs text-slate-500 leading-relaxed">
            Specify the lifecycle duration for patient visit records, invoices, and diagnostic history. Expired data is archived securely into cold storage.
          </p>

          <div className="space-y-2">
            {RETENTION_OPTIONS.map((opt) => {
              const selected = retentionDays === opt.days;
              return (
                <label
                  key={opt.days}
                  onClick={() => setRetentionDays(opt.days)}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition text-xs select-none ${
                    selected
                      ? 'border-blue-500 bg-blue-50/50 text-blue-900 font-semibold'
                      : 'border-slate-100 hover:border-slate-200 text-slate-700'
                  }`}
                >
                  <span>{opt.label}</span>
                  {selected && <Check size={14} className="text-blue-600" />}
                </label>
              );
            })}
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

export default DataRetentionModal;

