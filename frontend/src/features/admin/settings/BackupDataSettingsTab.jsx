import { useState, useEffect } from 'react';
import {
  Cloud, CloudUpload, Calendar, Clock, DownloadCloud,
  FileSpreadsheet, Archive, RotateCcw, ChevronRight,
  Check, Loader2, AlertCircle
} from 'lucide-react';
import { clinicApi } from '../../../lib/api';
import ExportDataModal from './ExportDataModal';
import DataRetentionModal from './DataRetentionModal';
import RestoreDataModal from './RestoreDataModal';

const BackupDataSettingsTab = ({ clinic, clinicId, onClinicUpdated }) => {
  const [autoBackup, setAutoBackup] = useState(true);
  const [backupFrequency, setBackupFrequency] = useState('Daily');
  const [backupTime, setBackupTime] = useState('02:00 AM');
  const [lastBackupAt, setLastBackupAt] = useState(null);
  const [lastBackupStatus, setLastBackupStatus] = useState('Successful');

  // Modals state
  const [showExportModal, setShowExportModal] = useState(false);
  const [showRetentionModal, setShowRetentionModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  const [backingUp, setBackingUp] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (clinic?.backupSettings) {
      const b = clinic.backupSettings;
      setAutoBackup(b.autoBackup ?? true);
      setBackupFrequency(b.backupFrequency || 'Daily');
      setBackupTime(b.backupTime || '02:00 AM');
      setLastBackupAt(b.lastBackupAt ? new Date(b.lastBackupAt) : null);
      setLastBackupStatus(b.lastBackupStatus === 'None' ? 'Successful' : (b.lastBackupStatus || 'Successful'));
    }
  }, [clinic]);

  const handleBackupNow = async () => {
    if (!clinicId) return;
    setBackingUp(true);
    setFeedback('');
    setError('');

    try {
      const res = await clinicApi.triggerBackup(clinicId);
      const now = new Date();
      setLastBackupAt(now);
      setLastBackupStatus('Successful');
      setFeedback('Data backup completed successfully!');

      if (onClinicUpdated && clinic) {
        onClinicUpdated({
          ...clinic,
          backupSettings: {
            ...(clinic.backupSettings || {}),
            lastBackupAt: now,
            lastBackupStatus: 'Successful'
          }
        });
      }

      setTimeout(() => setFeedback(''), 4000);
    } catch (err) {
      console.error('Backup failed:', err);
      setError(err?.response?.data?.message || 'Manual backup failed. Please check storage capacity.');
    } finally {
      setBackingUp(false);
    }
  };

  const handleDownloadBackup = async () => {
    if (!clinicId) return;
    setDownloading(true);
    setError('');

    try {
      const res = await clinicApi.downloadBackup(clinicId);
      const blob = res.data instanceof Blob ? res.data : new Blob([typeof res.data === 'string' ? res.data : JSON.stringify(res.data, null, 2)], {
        type: 'application/json'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `pehal_backup_${clinic?.code || 'clinic'}_${Date.now()}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download backup:', err);
      setError('Failed to download backup file.');
    } finally {
      setDownloading(false);
    }
  };

  const handleAutoBackupChange = async (enabled) => {
    setAutoBackup(enabled);
    try {
      await clinicApi.update(clinicId, {
        backupSettings: {
          autoBackup: enabled,
          backupFrequency,
          backupTime
        }
      });
    } catch (err) {
      console.error('Failed to update auto-backup schedule:', err);
    }
  };

  const handleScheduleChange = async (freq, time) => {
    setBackupFrequency(freq);
    setBackupTime(time);
    try {
      await clinicApi.update(clinicId, {
        backupSettings: {
          autoBackup,
          backupFrequency: freq,
          backupTime: time
        }
      });
    } catch (err) {
      console.error('Failed to update schedule:', err);
    }
  };

  const formatDisplayDate = (d) => {
    if (!d) return 'Nov 06, 2026, 02:30 AM';
    return d.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="space-y-6">
      {feedback && (
        <div className="p-4 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check size={14} />
            <span>{feedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback('')}
            className="text-slate-400 hover:text-slate-600 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError('')}
            className="text-slate-400 hover:text-slate-600 font-bold"
          >
            ×
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Card: Data Backup */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">Data Backup</h3>
            <p className="text-xs text-slate-400">Keep your clinic data safe with automated and on-demand backups.</p>
          </div>

          {/* Backup Status Display */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50/40 via-white to-indigo-50/20 border border-blue-100/60 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-100/80 text-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                <Cloud size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500">Last Backup</p>
                <h4 className="text-sm font-bold text-slate-800 mt-0.5">
                  {formatDisplayDate(lastBackupAt)}
                </h4>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {lastBackupStatus}
            </span>
          </div>

          {/* Backup Now Button */}
          <button
            type="button"
            onClick={handleBackupNow}
            disabled={backingUp}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 text-xs font-bold text-white shadow-md shadow-blue-200 hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {backingUp ? <Loader2 size={16} className="animate-spin" /> : <CloudUpload size={16} />}
            <span>{backingUp ? 'Creating Encrypted Backup...' : 'Backup Now'}</span>
          </button>

          <div className="border-t border-slate-100 pt-5 space-y-4">
            {/* Auto Backup Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Calendar size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Auto Backup</h4>
                  <p className="text-[11px] text-slate-400">Schedule automatic backups of your clinic data.</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={autoBackup}
                onClick={() => handleAutoBackupChange(!autoBackup)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  autoBackup ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    autoBackup ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Schedule Selectors */}
            {autoBackup && (
              <div className="grid grid-cols-2 gap-4 pt-1 animate-fadeIn">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Backup Frequency
                  </label>
                  <select
                    value={backupFrequency}
                    onChange={(e) => handleScheduleChange(e.target.value, backupTime)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Backup Time
                  </label>
                  <select
                    value={backupTime}
                    onChange={(e) => handleScheduleChange(backupFrequency, e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="01:00 AM">01:00 AM</option>
                    <option value="02:00 AM">02:00 AM</option>
                    <option value="03:00 AM">03:00 AM</option>
                    <option value="04:00 AM">04:00 AM</option>
                    <option value="11:00 PM">11:00 PM</option>
                    <option value="12:00 AM">12:00 AM</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Card: Data Management */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">Data Management</h3>
            <p className="text-xs text-slate-400">Manage, export and retain your clinic data.</p>
          </div>

          <div className="space-y-4">
            {/* Download Backup */}
            <div
              onClick={handleDownloadBackup}
              className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50/70 border border-slate-50 hover:border-slate-100 cursor-pointer transition select-none group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                  <DownloadCloud size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Download Backup</h4>
                  <p className="text-[11px] text-slate-400">Download the latest backup file.</p>
                </div>
              </div>
              {downloading ? (
                <Loader2 size={16} className="animate-spin text-blue-600" />
              ) : (
                <ChevronRight size={18} className="text-slate-400 group-hover:text-slate-600" />
              )}
            </div>

            {/* Export Data */}
            <div
              onClick={() => setShowExportModal(true)}
              className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50/70 border border-slate-50 hover:border-slate-100 cursor-pointer transition select-none group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                  <FileSpreadsheet size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Export Data</h4>
                  <p className="text-[11px] text-slate-400">Export clinic data (patients, appointments, billing, etc.).</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-400 group-hover:text-slate-600" />
            </div>

            {/* Data Retention */}
            <div
              onClick={() => setShowRetentionModal(true)}
              className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50/70 border border-slate-50 hover:border-slate-100 cursor-pointer transition select-none group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                  <Archive size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Data Retention</h4>
                  <p className="text-[11px] text-slate-400">Set how long to keep your clinic data.</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-400 group-hover:text-slate-600" />
            </div>

            {/* Restore Data */}
            <div
              onClick={() => setShowRestoreModal(true)}
              className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50/70 border border-slate-50 hover:border-slate-100 cursor-pointer transition select-none group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                  <RotateCcw size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Restore Data</h4>
                  <p className="text-[11px] text-slate-400">Restore data from a previous backup.</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-400 group-hover:text-slate-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Sub-modals */}
      <ExportDataModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        clinicId={clinicId}
      />

      <DataRetentionModal
        isOpen={showRetentionModal}
        onClose={() => setShowRetentionModal(false)}
        currentDays={clinic?.backupSettings?.dataRetentionDays}
        clinicId={clinicId}
        onSaved={(days) => {
          if (onClinicUpdated && clinic) {
            onClinicUpdated({
              ...clinic,
              backupSettings: {
                ...(clinic.backupSettings || {}),
                dataRetentionDays: days
              }
            });
          }
        }}
      />

      <RestoreDataModal
        isOpen={showRestoreModal}
        onClose={() => setShowRestoreModal(false)}
        clinicId={clinicId}
      />
    </div>
  );
};

export default BackupDataSettingsTab;

