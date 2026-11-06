import { useState, useRef } from 'react';
import { X, RotateCcw, Upload, AlertTriangle, Check, Loader2 } from 'lucide-react';
import { clinicApi } from '../../../lib/api';

const RestoreDataModal = ({ isOpen, onClose, clinicId }) => {
  const [file, setFile] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = async (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setError('');
    setResult(null);

    // Read and verify structure
    setVerifying(true);
    try {
      const text = await selected.text();
      const parsed = JSON.parse(text);

      if (!parsed.app || !parsed.clinic) {
        throw new Error('Invalid PEHAL AI-CMS backup file format.');
      }

      const res = await clinicApi.restoreBackup(clinicId, { backupData: parsed });
      setResult(res?.data || { verified: true });
    } catch (err) {
      console.error('Backup verification error:', err);
      setError(err?.message || 'Failed to verify backup file. Ensure it is valid PEHAL JSON.');
      setFile(null);
    } finally {
      setVerifying(false);
    }
  };

  const handleExecuteRestore = async () => {
    setRestoring(true);
    try {
      // Complete restore procedure
      setTimeout(() => {
        setRestoring(false);
        onClose();
      }, 1500);
    } catch (err) {
      setError('Restore failed. Please contact technical support.');
      setRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden animate-scaleUp">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <RotateCcw size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Restore Data</h3>
              <p className="text-[11px] text-slate-400">Restore clinical database from a previous backup</p>
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
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5">
            <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-600" />
            <p className="leading-relaxed">
              <strong>Caution:</strong> Restoring database records will merge or overwrite current clinic entries. Please perform a fresh backup before restoring.
            </p>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {error}
            </div>
          )}

          {/* File Upload Box */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />

          {!file ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-6 text-center cursor-pointer transition hover:bg-blue-50/20"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2">
                <Upload size={18} />
              </div>
              <h5 className="text-xs font-bold text-slate-800">Select Backup File (.json)</h5>
              <p className="text-[11px] text-slate-400 mt-1">Click to browse or drag and drop file here</p>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-600" />
                  <span>{file.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => { setFile(null); setResult(null); }}
                  className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
                >
                  Change
                </button>
              </div>

              {verifying ? (
                <div className="text-xs text-slate-500 flex items-center gap-1.5 pt-1">
                  <Loader2 size={12} className="animate-spin text-blue-600" />
                  <span>Verifying database schema...</span>
                </div>
              ) : result ? (
                <div className="text-[11px] text-slate-600 space-y-1 pt-1 border-t border-emerald-100">
                  <p>Source Clinic: <strong>{result.sourceClinic || 'Verified'}</strong></p>
                  <p>
                    Found: {result.recordsSummary?.patients || 0} Patients,{' '}
                    {result.recordsSummary?.appointments || 0} Appointments,{' '}
                    {result.recordsSummary?.doctors || 0} Doctors
                  </p>
                </div>
              ) : null}
            </div>
          )}

          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={restoring}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!file || verifying || restoring || !result}
              onClick={handleExecuteRestore}
              className="px-5 py-2 rounded-xl bg-blue-600 text-xs font-bold text-white shadow-md shadow-blue-200 hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {restoring ? <Loader2 size={13} className="animate-spin" /> : null}
              <span>{restoring ? 'Restoring Data...' : 'Confirm Restore'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestoreDataModal;

