import React, { useState } from 'react';
import { X, Upload, CheckCircle2, AlertTriangle, HelpCircle, RefreshCw, FileText, Download } from 'lucide-react';
import { healthcareCatalogApi } from '../../lib/api';
import toast from 'react-hot-toast';

const ImportModal = ({ isOpen, onClose, importType, onImportComplete }) => {
  const [file, setFile] = useState(null);
  const [base64Data, setBase64Data] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);
  const [decisions, setDecisions] = useState({});
  const [batchName, setBatchName] = useState('');
  const [summary, setSummary] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = React.useRef(null);

  const isPdf = file?.name?.toLowerCase().endsWith('.pdf');

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const fileExtension = selectedFile.name.split('.').pop().toLowerCase();
    const allowedExtensions = ['xlsx', 'xls', 'csv', 'pdf', 'json'];
    if (!allowedExtensions.includes(fileExtension)) {
      toast.error('Only .xlsx, .xls, .csv, .pdf, and .json files are supported');
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      setBase64Data(base64);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleUploadSubmit = async () => {
    if (!base64Data) {
      toast.error('Please select a file first');
      return;
    }
    setLoading(true);
    setElapsed(0);
    elapsedRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    try {
      const res = await healthcareCatalogApi.previewImport({
        fileData: base64Data,
        importType,
        fileName: file?.name
      });
      const data = res?.data ?? res ?? [];
      setPreviewRows(data);

      // Initialize default decisions
      const initialDecisions = {};
      data.forEach((row) => {
        if (row.matchStatus === 'EXISTING') {
          initialDecisions[row.index] = { decision: 'MAP', existingId: row.matchedRecord?._id };
        } else {
          initialDecisions[row.index] = { decision: 'NEW', existingId: null };
        }
      });
      setDecisions(initialDecisions);
      setStep(2);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to parse file');
    } finally {
      clearInterval(elapsedRef.current);
      setElapsed(0);
      setLoading(false);
    }
  };

  const handleDecisionChange = (index, decision, existingId = null) => {
    setDecisions(prev => ({
      ...prev,
      [index]: { decision, existingId }
    }));
  };

  const handleConfirmImport = async () => {
    setLoading(true);
    try {
      const itemsToConfirm = previewRows.map(row => ({
        decision: decisions[row.index]?.decision || 'NEW',
        existingId: decisions[row.index]?.existingId,
        data: row.data
      }));

      const res = await healthcareCatalogApi.confirmImport({
        items: itemsToConfirm,
        importType,
        batchName: batchName.trim() || file?.name || 'Import',
        fileName: file?.name || 'imported_file.xlsx'
      });

      const resultSummary = res?.data ?? res ?? {};
      
      // Calculate duplicate conflicts count based on pre-flight status
      const conflicts = previewRows.filter(r => r.matchStatus === 'CONFLICT').length;
      setSummary({
        totalRead: resultSummary.totalRead || previewRows.length,
        created: resultSummary.created || 0,
        mapped: resultSummary.mapped || 0,
        skipped: resultSummary.skipped || 0,
        conflicts: conflicts
      });

      toast.success('Catalog imported successfully');
      setStep(3);
      if (onImportComplete) onImportComplete();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    if (!summary) return;
    const headers = ['Row Number', 'Name', 'Category', 'Action Decision', 'Status'];
    const rows = previewRows.map(row => {
      const dec = decisions[row.index];
      const action = dec?.decision === 'MAP' ? `Mapped to ${dec.existingId}` : dec?.decision === 'SKIP' ? 'Skipped' : 'Created New';
      return [
        row.index + 1,
        row.data.name || row.data.displayName,
        row.data.categoryName || 'General',
        action,
        row.matchStatus
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `import_report_${batchName || 'catalog'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exactMatches = previewRows.filter(r => r.matchStatus === 'EXISTING').length;
  const fuzzyMatches = previewRows.filter(r => r.matchStatus === 'CONFLICT').length;
  const cleanRows = previewRows.filter(r => r.matchStatus === 'NEW').length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900">
              Import {importType === 'LAB' ? 'Laboratory Tests' : 'Medicines'}
            </h3>
            <p className="text-xs text-slate-400">Step {step} of 3</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl transition text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
          {step === 1 && (
            <div className="space-y-6">
              {/* PDF Parsing Loading Overlay */}
              {loading && (
                <div className="rounded-3xl border border-blue-100 bg-blue-50 p-8 text-center space-y-4">
                  <div className="flex items-center justify-center gap-3">
                    <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
                    <span className="text-base font-black text-blue-800">
                      {isPdf ? 'Extracting & parsing PDF…' : 'Parsing file…'}
                    </span>
                  </div>
                  {isPdf && (
                    <>
                      <p className="text-sm text-blue-600">
                        Large PDFs (like NLEM / CDSCO) can take <strong>30–60 seconds</strong> to extract and match.
                        <br />Please keep this window open and do not refresh.
                      </p>
                      {/* Animated progress bar */}
                      <div className="w-full bg-blue-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${Math.min((elapsed / 75) * 100, 95)}%` }}
                        />
                      </div>
                      <p className="text-xs text-blue-400">{elapsed}s elapsed</p>
                    </>
                  )}
                </div>
              )}

              {/* Drag and Drop Zone */}
              {!loading && (
                <div className="border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center bg-white hover:border-blue-400 transition cursor-pointer relative">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept=".xlsx,.xls,.csv,.pdf,.json"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">
                    {file ? file.name : 'Select or drag your file here'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Supports PDF, Excel (.xlsx, .xls), CSV and JSON formats up to 20MB</p>
                </div>
              )}

              {/* Batch Tagging */}
              {!loading && (
                <div className="bg-white p-6 rounded-3xl border border-slate-100 space-y-3">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">Import Batch Tag (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Partner Lab Price list"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              {/* Summary Metrics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl text-center">
                  <span className="text-emerald-600 font-bold block text-xl">{cleanRows}</span>
                  <span className="text-xs text-emerald-800 font-semibold">New Records (🟢)</span>
                </div>
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl text-center">
                  <span className="text-blue-600 font-bold block text-xl">{exactMatches}</span>
                  <span className="text-xs text-blue-800 font-semibold">Existing Records (🟡)</span>
                </div>
                <div className="bg-red-50 border border-red-100 p-4 rounded-2xl text-center">
                  <span className="text-red-600 font-bold block text-xl">{fuzzyMatches}</span>
                  <span className="text-xs text-red-800 font-semibold">Duplicate Conflicts (🔴)</span>
                </div>
              </div>

              {/* Match Resolution Panel */}
              <div className="space-y-4">
                <h4 className="text-sm font-black text-slate-700">Duplicate Matching & Mapping Decisions</h4>
                <div className="space-y-3">
                  {previewRows.map((row) => (
                    <div key={row.index} className="bg-white p-5 rounded-2xl border border-slate-100 space-y-3">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-500 mr-2">Index {row.index + 1}</span>
                          <span className="text-sm font-bold text-slate-800">{row.data.name || row.data.displayName}</span>
                          
                          <div className="text-xs text-slate-500 mt-2 space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            {row.data.categoryName && <div>Category: <span className="font-semibold text-slate-700">{row.data.categoryName}</span></div>}
                            {importType === 'MEDICINE' ? (
                              <>
                                <div>Type: <span className="font-semibold text-blue-600">{row.data.medicineType}</span></div>
                                {row.data.genericName && <div>Generic: <span className="font-semibold text-slate-700">{row.data.genericName}</span></div>}
                                {row.data.brandName && <div>Brand: <span className="font-semibold text-slate-700">{row.data.brandName}</span></div>}
                                <div>Form / Strength: <span className="font-semibold text-slate-700">{row.data.dosageForm} ({row.data.strength})</span></div>
                                {row.data.route && <div>Route: <span className="font-semibold text-slate-700">{row.data.route}</span></div>}
                                {row.data.activeIngredients && row.data.activeIngredients.length > 0 && (
                                  <div className="text-slate-600">Active Ingredients: <span className="font-semibold">{row.data.activeIngredients.map(i => `${i.name} (${i.strength})`).join(', ')}</span></div>
                                )}
                              </>
                            ) : (
                              <>
                                <div>Sample Type: <span className="font-semibold text-slate-700">{row.data.sampleType}</span></div>
                                <div>Methodology: <span className="font-semibold text-slate-700">{row.data.methodology || 'N/A'}</span></div>
                                <div>Reporting Time: <span className="font-semibold text-slate-700">{row.data.normalReportingTime}</span></div>
                              </>
                            )}
                          </div>
                        </div>

                        {row.matchStatus === 'NEW' && (
                          <span className="flex items-center gap-1 text-xs text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg">
                            🟢 New Test
                          </span>
                        )}

                        {row.matchStatus === 'EXISTING' && (
                          <span className="flex items-center gap-1 text-xs text-amber-600 font-bold bg-amber-50 px-2.5 py-1 rounded-lg">
                            🟡 Existing Test
                          </span>
                        )}

                        {row.matchStatus === 'CONFLICT' && (
                          <span className="flex items-center gap-1 text-xs text-red-600 font-bold bg-red-50 px-2.5 py-1 rounded-lg">
                            🔴 Duplicate Conflict
                          </span>
                        )}
                      </div>

                      {/* Decisive radio buttons when match exists */}
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 mt-2 space-y-2.5">
                        {row.matchedRecord && (
                          <p className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                            Possible Match found in database: <strong className="text-slate-700">{row.matchedRecord.name}</strong> ({row.matchedRecord.globalId})
                          </p>
                        )}

                        <div className="flex gap-4">
                          {row.matchedRecord && (
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                              <input
                                type="radio"
                                name={`decision-${row.index}`}
                                checked={decisions[row.index]?.decision === 'MAP'}
                                onChange={() => handleDecisionChange(row.index, 'MAP', row.matchedRecord._id)}
                                className="text-blue-600 focus:ring-blue-500"
                              />
                              Map to Existing
                            </label>
                          )}
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                            <input
                              type="radio"
                              name={`decision-${row.index}`}
                              checked={decisions[row.index]?.decision === 'NEW'}
                              onChange={() => handleDecisionChange(row.index, 'NEW')}
                              className="text-blue-600 focus:ring-blue-500"
                            />
                            Create New Test
                          </label>
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                            <input
                              type="radio"
                              name={`decision-${row.index}`}
                              checked={decisions[row.index]?.decision === 'SKIP'}
                              onChange={() => handleDecisionChange(row.index, 'SKIP')}
                              className="text-blue-600 focus:ring-blue-500"
                            />
                            Skip Row
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && summary && (
            <div className="py-8 space-y-6 max-w-md mx-auto">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h4 className="text-lg font-black text-slate-900">Import Completed Successfully</h4>
                <p className="text-xs text-slate-400">
                  The laboratory catalog has been populated and mapping choices successfully applied.
                </p>
              </div>

              {/* Statistics Panel */}
              <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-4 shadow-sm">
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span className="text-slate-500">Total Rows Read</span>
                  <span className="text-slate-800 font-bold">{summary.totalRead}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-semibold border-t border-slate-50 pt-3">
                  <span className="text-emerald-600 font-bold">🟢 Imported</span>
                  <span className="text-emerald-700 font-black">{summary.created}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-semibold border-t border-slate-50 pt-3">
                  <span className="text-blue-600 font-bold">🟡 Mapped</span>
                  <span className="text-blue-700 font-black">{summary.mapped}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-semibold border-t border-slate-50 pt-3">
                  <span className="text-slate-400 font-bold">⚪ Skipped</span>
                  <span className="text-slate-600 font-black">{summary.skipped}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-semibold border-t border-slate-50 pt-3">
                  <span className="text-red-500 font-bold">🔴 Duplicate Conflicts</span>
                  <span className="text-red-600 font-black">{summary.conflicts}</span>
                </div>
              </div>

              <div className="text-center">
                <button
                  onClick={downloadReport}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs transition"
                >
                  <Download className="w-4 h-4" /> Download Import Report
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3">
          {step === 1 && (
            <>
              <button onClick={onClose} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-2xl text-sm font-bold hover:bg-slate-50 transition">Cancel</button>
              <button
                onClick={handleUploadSubmit}
                disabled={loading || !file}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl text-sm font-bold hover:opacity-90 disabled:opacity-50 transition shadow-lg shadow-blue-100"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                {loading ? (isPdf ? 'Extracting PDF…' : 'Parsing…') : 'Parse & Match'}
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <button onClick={() => setStep(1)} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-2xl text-sm font-bold hover:bg-slate-50 transition">Back</button>
              <button
                onClick={handleConfirmImport}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl text-sm font-bold hover:opacity-90 disabled:opacity-50 transition shadow-lg shadow-blue-100"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                Confirm Import
              </button>
            </>
          )}

          {step === 3 && (
            <button onClick={onClose} className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl text-sm font-bold hover:opacity-90 transition">Close</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
