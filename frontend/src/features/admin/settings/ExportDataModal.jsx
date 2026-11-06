import { useState } from 'react';
import { X, FileSpreadsheet, Download, Check, Loader2, AlertCircle } from 'lucide-react';
import { clinicApi } from '../../../lib/api';

const MODULE_OPTIONS = [
  { id: 'patients', label: 'Patients Directory & Demographics' },
  { id: 'appointments', label: 'Appointment Schedules & History' },
  { id: 'billing', label: 'Invoices, Receipts & Payments' },
  { id: 'doctors', label: 'Doctor Profiles & Consultations' }
];

const ExportDataModal = ({ isOpen, onClose, clinicId }) => {
  const [selectedModules, setSelectedModules] = useState(['patients', 'appointments']);
  const [format, setFormat] = useState('csv');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const toggleModule = (id) => {
    setSelectedModules(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleExport = async (e) => {
    e.preventDefault();
    if (selectedModules.length === 0) {
      setError('Please select at least one module to export.');
      return;
    }
    setError('');
    setExporting(true);

    try {
      const res = await clinicApi.exportClinicData(clinicId, {
        modules: selectedModules,
        format
      });

      // Handle download
      const blob = res.data instanceof Blob ? res.data : new Blob([typeof res.data === 'string' ? res.data : JSON.stringify(res.data, null, 2)], {
        type: format === 'csv' ? 'text/csv' : 'application/json'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `pehal_export_${Date.now()}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      onClose();
    } catch (err) {
      console.error('Export failed:', err);
      setError(err?.response?.data?.message || 'Failed to export data.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden animate-scaleUp">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Export Clinic Data</h3>
              <p className="text-[11px] text-slate-400">Download selective datasets in Excel/CSV or JSON</p>
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

        <form onSubmit={handleExport} className="p-6 space-y-4">
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-1.5">
              <AlertCircle size={13} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Select Modules to Include
            </label>
            <div className="space-y-2">
              {MODULE_OPTIONS.map((m) => {
                const checked = selectedModules.includes(m.id);
                return (
                  <label
                    key={m.id}
                    onClick={() => toggleModule(m.id)}
                    className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 cursor-pointer select-none text-xs text-slate-700"
                  >
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                        checked ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                      }`}
                    >
                      {checked && <Check size={12} strokeWidth={3} />}
                    </div>
                    <span>{m.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Export Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormat('csv')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  format === 'csv'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span>CSV / Excel</span>
              </button>
              <button
                type="button"
                onClick={() => setFormat('json')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  format === 'json'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span>Structured JSON</span>
              </button>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={exporting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={exporting}
              className="px-5 py-2 rounded-xl bg-blue-600 text-xs font-bold text-white shadow-md shadow-blue-200 hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              <span>{exporting ? 'Exporting...' : 'Download Export'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExportDataModal;

