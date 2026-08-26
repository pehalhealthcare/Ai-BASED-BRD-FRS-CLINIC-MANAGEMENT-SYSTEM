import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, CheckCircle2, AlertTriangle, AlertCircle, RefreshCw, Layers, Check, X, ShieldAlert } from 'lucide-react';
import { healthcareCatalogApi } from '../../lib/api';
import toast from 'react-hot-toast';

const CatalogueUpdatesPage = () => {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeUpdate, setActiveUpdate] = useState(null);
  const [selectedChanges, setSelectedChanges] = useState([]); // list of unique keys (type_id)
  const [submitting, setSubmitting] = useState(false);

  // Mock a new update for demonstration if no pending updates are in the DB
  const [mockUpdate, setMockUpdate] = useState({
    _id: 'mock_nedl_2027_id',
    version: 'v2',
    source: 'ICMR NEDL',
    sourceVersion: '3rd Edition',
    sourceYear: 2027,
    status: 'PENDING_REVIEW',
    changes: {
      new: [
        { type: 'INVESTIGATION', name: 'Vitamin D3 (25-Hydroxy)', shortName: 'Vit D3', data: { department: 'Biochemistry', categoryName: 'Biochemistry', sampleType: 'Serum', normalReportingTime: 'Same Day' } },
        { type: 'PARAMETER', name: '25-OH Vitamin D3', shortName: 'VitD3-Param', data: { defaultUnit: 'ng/mL', decimalPrecision: 1 } }
      ],
      modified: [
        { type: 'INVESTIGATION', _id: 'inv_hba1c_id', name: 'Glycated Haemoglobin', shortName: 'HbA1c', customized: true, changes: { department: { old: 'Clinical Biochemistry', new: 'Endocrinology' } } }
      ],
      retired: [
        { type: 'INVESTIGATION', _id: 'inv_hbsag_id', name: 'HBsAg Screening', reason: 'Replaced by advanced molecular assay in 2027 guidelines' }
      ]
    }
  });

  const loadUpdates = async () => {
    setLoading(true);
    try {
      const res = await healthcareCatalogApi.getCatalogueUpdates();
      setUpdates(res?.data || res || []);
    } catch (err) {
      toast.error('Failed to load catalogue updates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUpdates();
  }, []);

  const handleImportMock = async () => {
    try {
      await healthcareCatalogApi.importCatalogueUpdate({
        version: 'v2',
        source: 'ICMR NEDL',
        sourceVersion: '3rd Edition',
        sourceYear: 2027,
        parameters: [
          { name: '25-OH Vitamin D3', shortName: 'VitD3-Param', defaultUnit: 'ng/mL', decimalPrecision: 1 }
        ],
        investigations: [
          { name: 'Vitamin D3 (25-Hydroxy)', shortName: 'Vit D3', department: 'Clinical Biochemistry', categoryName: 'Clinical Biochemistry', sampleType: 'Serum', normalReportingTime: 'Same Day' }
        ]
      });
      toast.success('New update imported successfully!');
      loadUpdates();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to import update');
    }
  };

  const handleApplyUpdate = async (updateId) => {
    setSubmitting(true);
    try {
      await healthcareCatalogApi.applyCatalogueUpdate(updateId, { approvedChangeIds: selectedChanges });
      toast.success('Catalogue update applied successfully!');
      setActiveUpdate(null);
      loadUpdates();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to apply update');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle change selection
  const toggleChangeSelection = (key) => {
    if (selectedChanges.includes(key)) {
      setSelectedChanges(selectedChanges.filter(c => c !== key));
    } else {
      setSelectedChanges([...selectedChanges, key]);
    }
  };

  const selectAll = (update) => {
    const keys = [];
    update.changes.new.forEach(item => keys.push(`${item.type}_${item.name}`));
    update.changes.modified.forEach(item => keys.push(`${item.type}_${item._id}`));
    update.changes.retired.forEach(item => keys.push(`${item.type}_${item._id}`));
    setSelectedChanges(keys);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
            Catalogue Updates <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full uppercase font-bold">Version Management</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Manage ICMR NEDL editions and catalog version upgrades.</p>
        </div>
        <button
          onClick={handleImportMock}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition"
        >
          Check for Updates
        </button>
      </div>

      {/* Main updates grid */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-6">
          {/* Current Applied Card */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Current Applied Version</span>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-slate-800 text-sm">ICMR NEDL</h4>
                <p className="text-xs text-slate-500">2nd Edition (2025)</p>
              </div>
              <span className="p-2 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </span>
            </div>
            <div className="pt-2 border-t border-slate-50 flex justify-between text-[10px] text-slate-450 font-bold">
              <span>Applied At: 15 Aug 2026</span>
              <span>By: Super Admin</span>
            </div>
          </div>

          {/* Pending updates list */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Update Pipeline</span>
            {updates.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-2xl text-center space-y-2 border border-slate-100">
                <Sparkles className="w-6 h-6 text-indigo-500 mx-auto" />
                <p className="text-xs font-bold text-slate-700">✓ Up to Date</p>
                <p className="text-[10px] text-slate-400">No pending catalogue updates detected.</p>
              </div>
            ) : (
              updates.map(u => (
                <div key={u._id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-500 uppercase">{u.source}</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${u.status === 'APPLIED' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600 animate-pulse'}`}>
                      {u.status}
                    </span>
                  </div>
                  <div>
                    <h5 className="font-black text-slate-800 text-xs">{u.sourceVersion} ({u.sourceYear})</h5>
                    <p className="text-[10px] text-slate-400">Imported At: {new Date(u.importedAt).toLocaleDateString()}</p>
                  </div>
                  {u.status === 'PENDING_REVIEW' && (
                    <button
                      onClick={() => {
                        setActiveUpdate(u);
                        selectAll(u);
                      }}
                      className="w-full py-1.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-[10px] font-black hover:bg-slate-50 transition"
                    >
                      Review Changes
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Diff Review Workspace */}
        <div className="col-span-2">
          {activeUpdate ? (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col max-h-[80vh] overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h4 className="font-black text-slate-800 text-sm">Reviewing: {activeUpdate.source} {activeUpdate.sourceVersion}</h4>
                  <p className="text-[10px] text-slate-400">Select items to approve for version update.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => selectAll(activeUpdate)}
                    className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-[10px] font-bold hover:bg-slate-50 transition"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setActiveUpdate(null)}
                    className="p-1.5 hover:bg-slate-100 text-slate-400 rounded-lg transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-5 overflow-y-auto flex-1 space-y-6">
                {/* NEW items section */}
                {activeUpdate.changes.new?.length > 0 && (
                  <div className="space-y-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">New Additions ({activeUpdate.changes.new.length})</span>
                    {activeUpdate.changes.new.map((item, idx) => {
                      const key = `${item.type}_${item.name}`;
                      const isChecked = selectedChanges.includes(key);
                      return (
                        <div key={idx} className="p-3.5 bg-white border border-slate-150 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-sm hover:border-indigo-150 transition">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleChangeSelection(key)}
                              className="rounded text-indigo-600 w-4 h-4"
                            />
                            <div>
                              <span className="font-black text-emerald-600 mr-2 uppercase text-[9px] bg-emerald-50 px-1.5 py-0.5 rounded">New</span>
                              <span className="font-extrabold text-slate-800">{item.name}</span>
                              {item.shortName && <span className="text-slate-400 ml-1.5">({item.shortName})</span>}
                              <span className="text-[10px] text-slate-400 block mt-0.5">{item.type} • {item.data?.department || 'Haematology'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* MODIFIED items section */}
                {activeUpdate.changes.modified?.length > 0 && (
                  <div className="space-y-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Modified Records ({activeUpdate.changes.modified.length})</span>
                    {activeUpdate.changes.modified.map((item, idx) => {
                      const key = `${item.type}_${item._id}`;
                      const isChecked = selectedChanges.includes(key);
                      return (
                        <div key={idx} className="p-4 bg-white border border-slate-150 rounded-2xl flex flex-col gap-3 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleChangeSelection(key)}
                                className="rounded text-indigo-600 w-4 h-4"
                              />
                              <div>
                                <span className="font-black text-blue-600 mr-2 uppercase text-[9px] bg-blue-50 px-1.5 py-0.5 rounded">Mod</span>
                                <span className="font-extrabold text-slate-800">{item.name}</span>
                              </div>
                            </div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">{item.type}</span>
                          </div>

                          {/* customization alert */}
                          {item.customized && (
                            <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-2 text-[10px] text-amber-800 leading-relaxed">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-black block">⚠ Custom Modification Detected</span>
                                This record was manually modified by Super Admin.
                              </div>
                            </div>
                          )}

                          {/* diff values */}
                          <div className="grid grid-cols-2 gap-4 text-[10px] bg-slate-50 p-2.5 rounded-xl">
                            {Object.keys(item.changes).map(field => (
                              <div key={field} className="col-span-2 flex items-center justify-between">
                                <span className="font-bold text-slate-500 uppercase">{field}</span>
                                <span className="flex items-center gap-1.5 text-slate-700">
                                  <span className="line-through text-red-500">{item.changes[field].old}</span>
                                  <ArrowRight className="w-3 h-3 text-slate-400" />
                                  <span className="font-bold text-emerald-600">{item.changes[field].new}</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* RETIRED items section */}
                {activeUpdate.changes.retired?.length > 0 && (
                  <div className="space-y-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Retired Records ({activeUpdate.changes.retired.length})</span>
                    {activeUpdate.changes.retired.map((item, idx) => {
                      const key = `${item.type}_${item._id}`;
                      const isChecked = selectedChanges.includes(key);
                      return (
                        <div key={idx} className="p-3.5 bg-white border border-slate-150 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-sm">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleChangeSelection(key)}
                              className="rounded text-indigo-600 w-4 h-4"
                            />
                            <div>
                              <span className="font-black text-red-600 mr-2 uppercase text-[9px] bg-red-50 px-1.5 py-0.5 rounded">Retired</span>
                              <span className="font-extrabold text-slate-800">{item.name}</span>
                              <span className="text-[10px] text-red-500 block mt-1 italic">Reason: {item.reason}</span>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">{item.type}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button
                  onClick={() => setActiveUpdate(null)}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleApplyUpdate(activeUpdate._id)}
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-150 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-4 h-4" />}
                  Approve Selected Changes ({selectedChanges.length})
                </button>
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-100 shadow-sm text-slate-400 space-y-2">
              <Layers className="w-8 h-8 text-slate-300" />
              <p className="text-xs font-bold text-slate-700">No Update Selected</p>
              <p className="text-[10px]">Select a pending update from the pipeline to review differences.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CatalogueUpdatesPage;
