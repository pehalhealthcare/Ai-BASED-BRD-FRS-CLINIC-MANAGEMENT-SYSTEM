import { useState, useEffect } from 'react';
import { pharmacyApi, labApi } from '../../lib/api';
import LabTestSearchPanel from './LabTestSearchPanel';

const FIELD_CLASS = 'w-full rounded-xl border border-slate-600/40 bg-slate-800/50 px-3 py-2 text-xs text-slate-200 outline-none transition-all focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10 placeholder:text-slate-500';
const SELECT_CLASS = 'w-full rounded-xl border border-slate-600/40 bg-slate-800/50 px-3 py-2 text-xs text-slate-200 outline-none transition-all focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10 cursor-pointer';

const routeOptions = ['oral', 'topical', 'injection', 'inhalation', 'other'];

export default function PrescriptionInConsultation({
  patient,
  consultation,
  medicines,
  setMedicines,
  labs,
  setLabs,
  procedures,
  setProcedures,
  advice,
  setAdvice,
  followUpDate,
  setFollowUpDate,
  isDraft = true
}) {
  const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [activeSearchIndex, setActiveSearchIndex] = useState(null);
  const [availableTests, setAvailableTests] = useState([]);

  // Load available lab tests for selection
  useEffect(() => {
    const fetchTests = async () => {
      try {
        const res = await labApi.listTests({ limit: 100 });
        if (res?.tests) setAvailableTests(res.tests);
      } catch (err) {
        console.error('Failed to load lab tests:', err);
      }
    };
    fetchTests();
  }, []);

  const handleMedicineSearch = async (index, query) => {
    handleMedicineChange(index, 'medicineName', query);
    if (!query.trim()) {
      setSearchResults([]);
      setActiveSearchIndex(null);
      return;
    }
    try {
      const res = await pharmacyApi.listMedicines({ search: query, limit: 5, isActive: true });
      if (res?.medicines) {
        setSearchResults(res.medicines);
        setActiveSearchIndex(index);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const selectMedicine = (index, med) => {
    handleMedicineChange(index, 'medicineName', med.name);
    handleMedicineChange(index, 'genericName', med.genericName || '');
    handleMedicineChange(index, 'dosage', med.strength || '');
    setSearchResults([]);
    setActiveSearchIndex(null);
  };

  const handleMedicineChange = (index, field, value) => {
    const updated = [...medicines];
    updated[index] = { ...updated[index], [field]: value };
    setMedicines(updated);
  };

  const handleAddMedicine = () => {
    setMedicines([
      ...medicines,
      {
        medicineName: '',
        genericName: '',
        dosage: '',
        frequency: '1-0-1',
        duration: '5 days',
        route: 'oral',
        timing: 'after food',
        instructions: '',
        quantity: 10,
        isSubstituteAllowed: false
      }
    ]);
  };

  const handleRemoveMedicine = (index) => {
    const updated = medicines.filter((_, i) => i !== index);
    setMedicines(updated.length ? updated : [{
      medicineName: '',
      genericName: '',
      dosage: '',
      frequency: '1-0-1',
      duration: '5 days',
      route: 'oral',
      timing: 'after food',
      instructions: '',
      quantity: 10,
      isSubstituteAllowed: false
    }]);
  };

  const handleAddLab = () => {
    setLabs([
      ...labs,
      { testName: '', priority: 'routine', sampleRequired: 'Blood', reason: '' }
    ]);
  };

  const handleRemoveLab = (index) => {
    const updated = labs.filter((_, i) => i !== index);
    setLabs(updated);
  };

  const handleLabChange = (index, field, value) => {
    const updated = [...labs];
    if (field === 'testName') {
      const selectedTest = availableTests.find(t => t.name === value);
      updated[index] = {
        ...updated[index],
        testName: value,
        sampleRequired: selectedTest?.sampleType || 'Blood'
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setLabs(updated);
  };

  const handleAddProcedure = () => {
    setProcedures([
      ...procedures,
      { name: '', code: '', fee: '', status: 'scheduled' }
    ]);
  };

  const handleRemoveProcedure = (index) => {
    const updated = procedures.filter((_, i) => i !== index);
    setProcedures(updated);
  };

  const handleProcedureChange = (index, field, value) => {
    const updated = [...procedures];
    updated[index] = { ...updated[index], [field]: value };
    setProcedures(updated);
  };

  return (
    <div className="grid gap-4">
      {/* ─── Prescription Builder ─── */}
      <div className="cons-section">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-800/20 border-b border-slate-700/30">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">4</span>
            <span className="text-sm font-semibold text-slate-200">Prescription Builder</span>
          </div>
          <button
            type="button"
            onClick={handleAddMedicine}
            className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-semibold"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
            Add Medicine
          </button>
        </div>

        <div className="p-4">
          <div className="grid gap-3">
            {medicines.map((med, idx) => (
              <div key={idx} className="relative p-3 rounded-xl border border-slate-700/30 bg-slate-900/20 grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
                {/* Medicine Name with Autocomplete */}
                <div className="md:col-span-4">
                  <label className="block text-[10px] text-slate-400 mb-1">Medicine Name *</label>
                  <input
                    className={FIELD_CLASS}
                    value={med.medicineName}
                    onChange={(e) => handleMedicineSearch(idx, e.target.value)}
                    placeholder="Search medicine..."
                  />
                  {activeSearchIndex === idx && searchResults.length > 0 && (
                    <div className="absolute z-50 left-3 right-3 md:left-auto md:w-64 mt-1 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
                      {searchResults.map((result) => (
                        <button
                          key={result._id}
                          type="button"
                          onClick={() => selectMedicine(idx, result)}
                          className="w-full text-left px-3.5 py-2 text-xs text-slate-200 hover:bg-slate-800/80 transition-colors border-b border-slate-800/40 last:border-0"
                        >
                          <p className="font-semibold text-emerald-400">{result.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{result.genericName} - {result.strength}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] text-slate-400 mb-1">Dosage</label>
                  <input
                    className={FIELD_CLASS}
                    value={med.dosage}
                    onChange={(e) => handleMedicineChange(idx, 'dosage', e.target.value)}
                    placeholder="e.g. 500mg"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] text-slate-400 mb-1">Frequency</label>
                  <input
                    className={FIELD_CLASS}
                    value={med.frequency}
                    onChange={(e) => handleMedicineChange(idx, 'frequency', e.target.value)}
                    placeholder="e.g. 1-0-1"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] text-slate-400 mb-1">Duration</label>
                  <input
                    className={FIELD_CLASS}
                    value={med.duration}
                    onChange={(e) => handleMedicineChange(idx, 'duration', e.target.value)}
                    placeholder="e.g. 5 days"
                  />
                </div>

                <div className="md:col-span-2 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => handleRemoveMedicine(idx)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>

                {/* Second Row of medicine properties */}
                <div className="md:col-span-3">
                  <label className="block text-[10px] text-slate-400 mb-1">Generic Name</label>
                  <input
                    className={FIELD_CLASS}
                    value={med.genericName}
                    onChange={(e) => handleMedicineChange(idx, 'genericName', e.target.value)}
                    placeholder="Generic name"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] text-slate-400 mb-1">Route</label>
                  <select
                    className={SELECT_CLASS}
                    value={med.route}
                    onChange={(e) => handleMedicineChange(idx, 'route', e.target.value)}
                  >
                    {routeOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] text-slate-400 mb-1">Timing</label>
                  <input
                    className={FIELD_CLASS}
                    value={med.timing}
                    onChange={(e) => handleMedicineChange(idx, 'timing', e.target.value)}
                    placeholder="e.g. After food"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-[10px] text-slate-400 mb-1">Instructions</label>
                  <input
                    className={FIELD_CLASS}
                    value={med.instructions}
                    onChange={(e) => handleMedicineChange(idx, 'instructions', e.target.value)}
                    placeholder="Special instructions..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] text-slate-400 mb-1">Qty</label>
                  <input
                    type="number"
                    className={FIELD_CLASS}
                    value={med.quantity}
                    onChange={(e) => handleMedicineChange(idx, 'quantity', e.target.value ? Number(e.target.value) : '')}
                    placeholder="Qty"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Lab Orders Panel ─── */}
      <div className="cons-section">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-800/20 border-b border-slate-700/30">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded bg-violet-500/20 text-violet-400 text-[10px] font-bold">5</span>
            <span className="text-sm font-semibold text-slate-200">Recommended Lab Tests</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSearchPanelOpen(true)}
              className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-semibold"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              Search & Offer Tests
            </button>
            <button
              type="button"
              onClick={handleAddLab}
              className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors font-semibold"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
              Add Lab Test
            </button>
          </div>
        </div>

        <div className="p-4">
          {!labs.length ? (
            <p className="text-xs text-slate-500 italic">No lab tests recommended yet.</p>
          ) : (
            <div className="grid gap-2">
              {labs.map((lab, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-slate-700/30 bg-slate-900/20 grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
                  <div className="md:col-span-4">
                    <label className="block text-[10px] text-slate-400 mb-1">Test Name *</label>
                    <select
                      className={SELECT_CLASS}
                      value={lab.testName}
                      onChange={(e) => handleLabChange(idx, 'testName', e.target.value)}
                    >
                      <option value="">Select Test...</option>
                      {availableTests.map((t) => <option key={t._id} value={t.name}>{t.name}</option>)}
                    </select>
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-[10px] text-slate-400 mb-1">Priority</label>
                    <select
                      className={SELECT_CLASS}
                      value={lab.priority}
                      onChange={(e) => handleLabChange(idx, 'priority', e.target.value)}
                    >
                      <option value="routine">Routine</option>
                      <option value="urgent">Urgent</option>
                      <option value="stat">STAT</option>
                    </select>
                  </div>

                  <div className="md:col-span-4">
                    <label className="block text-[10px] text-slate-400 mb-1">Reason/Indication</label>
                    <input
                      className={FIELD_CLASS}
                      value={lab.reason}
                      onChange={(e) => handleLabChange(idx, 'reason', e.target.value)}
                      placeholder="Reason for test..."
                    />
                  </div>

                  <div className="md:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveLab(idx)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Procedures Section ─── */}
      <div className="cons-section">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-800/20 border-b border-slate-700/30">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold">6</span>
            <span className="text-sm font-semibold text-slate-200">Recommended Procedures</span>
          </div>
          <button
            type="button"
            onClick={handleAddProcedure}
            className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors font-semibold"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
            Add Procedure
          </button>
        </div>

        <div className="p-4">
          {!procedures.length ? (
            <p className="text-xs text-slate-500 italic">No clinical procedures recommended yet.</p>
          ) : (
            <div className="grid gap-2">
              {procedures.map((proc, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-slate-700/30 bg-slate-900/20 grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
                  <div className="md:col-span-5">
                    <label className="block text-[10px] text-slate-400 mb-1">Procedure Name *</label>
                    <input
                      className={FIELD_CLASS}
                      value={proc.name}
                      onChange={(e) => handleProcedureChange(idx, 'name', e.target.value)}
                      placeholder="e.g. Wound dressing, ECG"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-[10px] text-slate-400 mb-1">Code</label>
                    <input
                      className={FIELD_CLASS}
                      value={proc.code}
                      onChange={(e) => handleProcedureChange(idx, 'code', e.target.value)}
                      placeholder="e.g. CPT-93000"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-[10px] text-slate-400 mb-1">Estimated Fee ($)</label>
                    <input
                      type="number"
                      className={FIELD_CLASS}
                      value={proc.fee}
                      onChange={(e) => handleProcedureChange(idx, 'fee', e.target.value)}
                      placeholder="Fee"
                    />
                  </div>

                  <div className="md:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveProcedure(idx)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Doctor Advice & Follow-up ─── */}
      <div className="cons-section">
        <div className="flex items-center gap-2 px-4 py-3 bg-slate-800/20 border-b border-slate-700/30">
          <span className="flex items-center justify-center w-5 h-5 rounded bg-blue-500/20 text-blue-400 text-[10px] font-bold">7</span>
          <span className="text-sm font-semibold text-slate-200">Patient Advice & Follow-up</span>
        </div>
        <div className="p-4 grid gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Doctor Advice</label>
            <textarea
              className={`${FIELD_CLASS} min-h-[60px]`}
              value={advice}
              onChange={(e) => setAdvice(e.target.value)}
              placeholder="General advice for the patient (e.g., diet, rest, alarm symptoms)..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Follow-up Date</label>
            <input
              type="date"
              className={FIELD_CLASS}
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      <LabTestSearchPanel
        isOpen={isSearchPanelOpen}
        onClose={() => setIsSearchPanelOpen(false)}
        patient={patient}
        consultation={consultation}
        onAddLabs={(selected) => {
          // merge selected tests into the current labs state
          setLabs([...labs, ...selected]);
        }}
      />
    </div>
  );
}
