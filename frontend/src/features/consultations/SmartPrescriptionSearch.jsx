import React, { useState, useEffect, useRef, useCallback } from 'react';
import { pharmacyApi } from '../../lib/api';

// ─── Utility helpers ──────────────────────────────────────────────────────────
const HISTORY_KEY = 'rx_search_history';
const getHistory = () => {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
};
const pushHistory = (q) => {
  if (!q.trim()) return;
  const existing = getHistory().filter(h => h !== q.trim());
  localStorage.setItem(HISTORY_KEY, JSON.stringify([q.trim(), ...existing].slice(0, 8)));
};

const FILTERS = ['All Results', 'Generic', 'Brands', 'Combinations', 'Available in Clinic', 'Prescription Only', 'OTC'];

const TIMING_OPTIONS = ['After Food', 'Before Food', 'With Food', 'Before Breakfast', 'Empty Stomach', 'Bedtime'];
const FREQUENCY_OPTIONS = ['1-0-0', '0-1-0', '0-0-1', '1-0-1', '1-1-0', '1-1-1', 'SOS', 'Once a week'];

const DEFAULT_MED_ROW = {
  medicineName: '', genericName: '', dosage: '', frequency: '1-0-1',
  duration: '5 days', route: 'oral', timing: 'After Food',
  instructions: '', quantity: 10, isSubstituteAllowed: false, brandName: ''
};

// ─── Availability badge ───────────────────────────────────────────────────────
function AvailBadge({ stock, inClinic }) {
  if (!inClinic) return (
    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">Not in Clinic</span>
  );
  if (stock === 0) return (
    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-650 border border-red-200 bg-red-50">Out of Stock</span>
  );
  if (stock < 20) return (
    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-650 border border-amber-200 bg-amber-55/10">Low Stock</span>
  );
  return (
    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">Available in Clinic</span>
  );
}

// ─── Type badge ───────────────────────────────────────────────────────────────
function TypeBadge({ type }) {
  const map = {
    generic: 'bg-violet-50 text-violet-650 border-violet-200',
    brand: 'bg-blue-50 text-blue-650 border-blue-200',
    combo: 'bg-amber-55/10 text-amber-650 border-amber-200',
    clinic: 'bg-teal-50 text-teal-650 border-teal-200',
  };
  const labels = { generic: 'GENERIC', brand: 'BRAND', combo: 'COMBO', clinic: 'CLINIC STOCK' };
  return (
    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border uppercase tracking-wider ${map[type] || map.generic}`}>
      {labels[type] || type.toUpperCase()}
    </span>
  );
}

// ─── Highlight matching text ──────────────────────────────────────────────────
function Highlight({ text = '', query = '' }) {
  if (!query) return <span>{text}</span>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part)
          ? <mark key={i} className="bg-violet-100 text-violet-850 rounded-sm not-italic font-bold">{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </span>
  );
}

// ─── Single medicine result card ──────────────────────────────────────────────
function MedResultCard({ med, type, query, isSelected, onClick, onAddToCart, inCart }) {
  const stockInfo = type === 'clinicInventory'
    ? { inClinic: true, stock: med.totalStock ?? 0 }
    : { inClinic: false, stock: 0 };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 flex items-start gap-3 transition-all rounded-xl border mb-1.5
        ${isSelected
          ? 'bg-violet-50/50 border-violet-300'
          : 'bg-white hover:bg-slate-50 border-slate-100 hover:border-slate-200'
        }`}
    >
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mt-0.5
        ${type === 'generic' ? 'bg-violet-100 text-violet-700' :
          type === 'brand' ? 'bg-blue-100 text-blue-700' :
          type === 'combo' ? 'bg-amber-100 text-amber-700' :
          'bg-teal-100 text-teal-700'}`}>
        {(type === 'generic' ? 'G' : type === 'brand' ? 'B' : type === 'combo' ? 'C' : 'S')}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
          <span className="text-[12px] font-bold text-slate-800 truncate">
            <Highlight text={med.brandName || med.name || med.genericName || ''} query={query} />
          </span>
          <TypeBadge type={type === 'clinicInventory' ? 'clinic' : type} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-slate-500">
            {med.strength || med.availableStrengths?.[0] || med.strengths?.[0] || ''} · {med.dosageForm || med.form || med.dosageForms?.[0] || ''}
          </span>
          {(med.manufacturer || med.genericMedicineId?.name || med.genericMedicineId?.genericName) && (
            <span className="text-[10px] text-slate-400">
              {med.manufacturer || `Generic: ${med.genericMedicineId?.name || med.genericMedicineId?.genericName}`}
            </span>
          )}
        </div>
        {(med.therapeuticCategory || med.drugCategory) && (
          <span className="text-[9px] text-slate-400 block mt-0.5">{med.therapeuticCategory || med.drugCategory}</span>
        )}
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0">
        <AvailBadge stock={stockInfo.stock} inClinic={stockInfo.inClinic} />
        {inCart && (
          <span className="text-[9px] font-bold text-emerald-600">✓ Added</span>
        )}
      </div>
    </button>
  );
}

// ─── Medicine details panel ───────────────────────────────────────────────────
function MedicineDetailsPanel({ med, medType, cartItems, onAdd, searchResults }) {
  const displayGeneric = med.genericName || med.genericMedicineId?.genericName || med.genericMedicineId?.name || '';
  const displayStrength = med.strength || med.availableStrengths?.[0] || med.strengths?.[0] || '';
  const displayForm = med.dosageForm || med.form || med.dosageForms?.[0] || '';
  const displayManufacturer = med.manufacturer || med.genericMedicineId?.manufacturer || '';
  const displayTherapeutic = med.therapeuticCategory || med.category || med.drugCategory || '';

  const [doseConfig, setDoseConfig] = useState({
    dosage: displayStrength,
    frequency: '1-0-1',
    duration: '5 days',
    timing: 'After Food',
    quantity: 10,
    instructions: '',
    isSubstituteAllowed: false
  });
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  // Reset when medicine changes
  useEffect(() => {
    if (!med) return;
    setDoseConfig({
      dosage: med.strength || med.availableStrengths?.[0] || med.strengths?.[0] || '',
      frequency: '1-0-1',
      duration: '5 days',
      timing: 'After Food',
      quantity: 10,
      instructions: '',
      isSubstituteAllowed: false
    });
    setAdded(false);
  }, [med?._id]);

  const alreadyInCart = cartItems.some(c => c._srcId === med?._id);

  const handleAdd = async () => {
    setAdding(true);
    await new Promise(r => setTimeout(r, 250));
    const row = {
      _srcId: med._id,
      medicineName: med.brandName || med.name || med.genericName || '',
      genericName: displayGeneric,
      brandName: med.brandName || '',
      dosage: doseConfig.dosage,
      frequency: doseConfig.frequency,
      duration: doseConfig.duration,
      route: med.route?.toLowerCase() || med.genericMedicineId?.route?.toLowerCase() || 'oral',
      timing: doseConfig.timing,
      instructions: doseConfig.instructions,
      quantity: doseConfig.quantity,
      isSubstituteAllowed: doseConfig.isSubstituteAllowed,
      _medType: medType,
      dosageForm: displayForm,
      therapeuticCategory: displayTherapeutic
    };
    onAdd(row);
    setAdding(false);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  // Clinic stock info
  const clinicMatch = searchResults?.clinicInventory?.find(
    c => c.genericName?.toLowerCase() === (med?.genericName || med?.name || '').toLowerCase()
  );
  const stockCount = med.totalStock ?? clinicMatch?.totalStock;
  const inClinic = medType === 'clinicInventory' || !!clinicMatch;

  const infoRows = [
    { label: 'Generic', value: displayGeneric || '—' },
    { label: 'Manufacturer', value: displayManufacturer || '—' },
    { label: 'Strength', value: med.strength || med.availableStrengths?.join(', ') || med.strengths?.join(', ') || '—' },
    { label: 'Dosage Form', value: med.dosageForm || med.form || med.dosageForms?.join(', ') || '—' },
    { label: 'Route', value: med.route || med.genericMedicineId?.route || '—' },
    { label: 'Therapeutic Class', value: displayTherapeutic || '—' },
    { label: 'Schedule', value: med.schedule || med.genericMedicineId?.schedule || 'OTC' },
    { label: 'Availability', value: inClinic ? '✓ Available in Clinic' : 'Not in Clinic' },
    ...(typeof stockCount !== 'undefined' ? [{ label: 'Stock', value: `${stockCount} Units` }] : []),
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-800 leading-tight">{med.brandName || med.name || med.genericName}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {displayGeneric} · {displayStrength}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <TypeBadge type={medType === 'clinicInventory' ? 'clinic' : medType} />
            <AvailBadge stock={stockCount ?? (inClinic ? 100 : 0)} inClinic={inClinic} />
          </div>
        </div>
      </div>

      {/* Info table */}
      <div className="p-4 border-b border-slate-100 grid grid-cols-2 gap-x-4 gap-y-2 overflow-y-auto max-h-40 bg-slate-50/50">
        {infoRows.map(({ label, value }) => (
          <div key={label}>
            <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">{label}</p>
            <p className={`text-[11px] font-semibold mt-0.5 ${label === 'Availability' && inClinic ? 'text-emerald-600' : 'text-slate-700'}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* AI Suggestions */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center gap-1.5 mb-2.5">
          <div className="w-4.5 h-4.5 rounded bg-violet-50 flex items-center justify-center">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-violet-600"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
          </div>
          <span className="text-[10px] font-bold text-violet-700 uppercase tracking-wider">AI Suggestions</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Common Dose', value: med.strength || doseConfig.dosage || '—' },
            { label: 'Frequency', value: '1-0-1' },
            { label: 'Duration', value: '3–5 Days' },
            { label: 'Timing', value: 'After Food' }
          ].map(({ label, value }) => (
            <div key={label} className="bg-violet-50/50 border border-violet-100 rounded-lg px-2.5 py-1.5">
              <p className="text-[9px] text-violet-500 uppercase tracking-wider font-semibold">{label}</p>
              <p className="text-[11px] font-bold text-violet-700">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Dose config form */}
      <div className="p-4 overflow-y-auto flex-1 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Configure Prescription</p>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Dosage */}
          <div>
            <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-1 font-semibold">Dosage</label>
            <input
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200"
              value={doseConfig.dosage}
              onChange={e => setDoseConfig(p => ({ ...p, dosage: e.target.value }))}
              placeholder="e.g. 500mg"
            />
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-1 font-semibold">Frequency</label>
            <select
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-violet-400 cursor-pointer"
              value={doseConfig.frequency}
              onChange={e => setDoseConfig(p => ({ ...p, frequency: e.target.value }))}
            >
              {FREQUENCY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-1 font-semibold">Duration</label>
            <input
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-violet-400"
              value={doseConfig.duration}
              onChange={e => setDoseConfig(p => ({ ...p, duration: e.target.value }))}
              placeholder="e.g. 5 days"
            />
          </div>

          {/* Timing */}
          <div>
            <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-1 font-semibold">Timing</label>
            <select
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-violet-400 cursor-pointer"
              value={doseConfig.timing}
              onChange={e => setDoseConfig(p => ({ ...p, timing: e.target.value }))}
            >
              {TIMING_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-1 font-semibold">Qty</label>
            <input
              type="number"
              min={1}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-violet-400"
              value={doseConfig.quantity}
              onChange={e => setDoseConfig(p => ({ ...p, quantity: Number(e.target.value) || 1 }))}
            />
          </div>

          {/* Substitute */}
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={doseConfig.isSubstituteAllowed}
                onChange={e => setDoseConfig(p => ({ ...p, isSubstituteAllowed: e.target.checked }))}
                className="rounded border-slate-350 text-violet-600 focus:ring-0"
              />
              <span className="text-[10px] text-slate-600 font-semibold">Sub Allowed</span>
            </label>
          </div>
        </div>

        {/* Instructions */}
        <div>
          <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-1 font-semibold">Instructions</label>
          <input
            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-violet-400"
            value={doseConfig.instructions}
            onChange={e => setDoseConfig(p => ({ ...p, instructions: e.target.value }))}
            placeholder="Special instructions..."
          />
        </div>

        {/* Not in clinic notice */}
        {!inClinic && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
            <p className="text-[10px] font-bold text-amber-700 mb-0.5">⚠ Not Stocked in Clinic</p>
            <p className="text-[10px] text-amber-600">Patient may purchase externally. You can still prescribe.</p>
          </div>
        )}
      </div>

      {/* Add to Prescription button */}
      <div className="p-4 border-t border-slate-100">
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all
            ${added
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
              : alreadyInCart
              ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              : 'bg-violet-600 hover:bg-violet-500 text-white border border-violet-750 shadow-md shadow-violet-900/10 active:scale-95'
            }`}
        >
          {adding ? (
            <>
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <circle cx="12" cy="12" r="10" className="opacity-25"/><path d="M12 2a10 10 0 0110 10" className="opacity-75"/>
              </svg>
              Adding...
            </>
          ) : added ? (
            <>✓ Medicine Added</>
          ) : alreadyInCart ? (
            <>✓ Already Added</>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
              Add to Prescription
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Prescription Cart ────────────────────────────────────────────────────────
function PrescriptionCart({ items, onRemove, onEdit, onSave, onClearAll }) {
  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50/50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div>
          <h3 className="text-xs font-black text-slate-700">PRESCRIPTION ({items.length})</h3>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-[10px] text-red-500 hover:text-red-700 font-bold transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-400">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
            </div>
            <p className="text-[11px] font-semibold text-slate-500">No medicines added yet</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Search & add medicines</p>
          </div>
        ) : (
          items.map((item, idx) => (
            <CartItem key={item._srcId || idx} item={item} idx={idx} onRemove={onRemove} onEdit={onEdit} />
          ))
        )}
      </div>

      {/* Footer buttons */}
      <div className="p-3 border-t border-slate-150 bg-white space-y-2">
        <button
          type="button"
          onClick={() => onEdit(null, null)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-slate-200 text-[11px] text-slate-650 hover:text-slate-800 hover:bg-slate-50 transition-colors font-semibold"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          Add Medicine
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={items.length === 0}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all
            ${items.length === 0
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/10 active:scale-95'}`}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          Save Prescription
        </button>
      </div>
    </div>
  );
}

// ─── Cart Item ────────────────────────────────────────────────────────────────
function CartItem({ item, idx, onRemove, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState({ ...item });

  const typeColor = item._medType === 'generic' ? 'text-violet-750 border-violet-200 bg-violet-50'
    : item._medType === 'brand' ? 'text-blue-750 border-blue-200 bg-blue-50'
    : item._medType === 'combo' ? 'text-amber-750 border-amber-200 bg-amber-50/50'
    : 'text-teal-750 border-teal-200 bg-teal-50';

  const saveEdit = () => {
    onEdit(item._srcId, local);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="p-3 rounded-xl border border-violet-200 bg-white space-y-2 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-bold text-slate-700">{item.medicineName}</p>
          <button type="button" onClick={() => setEditing(false)} className="text-slate-400 hover:text-slate-600">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { key: 'dosage', label: 'Dosage' },
            { key: 'duration', label: 'Duration' },
          ].map(({ key, label }) => (
            <div key={key}>
              <p className="text-[8px] text-slate-450 uppercase mb-0.5 font-bold">{label}</p>
              <input className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-800 outline-none" value={local[key]} onChange={e => setLocal(p => ({ ...p, [key]: e.target.value }))} />
            </div>
          ))}
          <div>
            <p className="text-[8px] text-slate-450 uppercase mb-0.5 font-bold">Frequency</p>
            <select className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-800 outline-none cursor-pointer" value={local.frequency} onChange={e => setLocal(p => ({ ...p, frequency: e.target.value }))}>
              {FREQUENCY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <p className="text-[8px] text-slate-450 uppercase mb-0.5 font-bold">Timing</p>
            <select className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-800 outline-none cursor-pointer" value={local.timing} onChange={e => setLocal(p => ({ ...p, timing: e.target.value }))}>
              {TIMING_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <p className="text-[8px] text-slate-450 uppercase mb-0.5 font-bold">Qty</p>
            <input type="number" min={1} className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-800 outline-none" value={local.quantity} onChange={e => setLocal(p => ({ ...p, quantity: Number(e.target.value) || 1 }))} />
          </div>
        </div>
        <button type="button" onClick={saveEdit} className="w-full py-1.5 bg-violet-650 hover:bg-violet-550 text-white text-[10px] font-bold rounded-lg transition-colors shadow-sm">
          Save Changes
        </button>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-xl border border-slate-100 bg-white hover:border-slate-200 transition-all group shadow-sm">
      {/* Number + name */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-650 text-[9px] font-bold flex items-center justify-center">
            {idx + 1}
          </span>
          <div>
            <p className="text-[11px] font-bold text-slate-800 leading-tight">{item.medicineName}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-full border uppercase tracking-wider ${typeColor}`}>
                {item._medType === 'clinicInventory' ? 'CLINIC' : (item._medType || 'generic').toUpperCase()}
              </span>
              {item.genericName && item.genericName !== item.medicineName && (
                <span className="text-[9px] text-slate-400 truncate max-w-[80px]">{item.genericName}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button type="button" onClick={() => setEditing(true)} className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-violet-650 hover:bg-slate-100 transition-colors">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button type="button" onClick={() => onRemove(item._srcId)} className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>
      {/* Details grid */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] pl-7">
        <div className="flex items-center gap-1 text-slate-500">
          <span className="text-slate-400">Dose:</span>
          <span className="text-slate-700 font-semibold">{item.dosage || '—'}</span>
        </div>
        <div className="flex items-center gap-1 text-slate-500">
          <span className="text-slate-400">Freq:</span>
          <span className="text-slate-700 font-semibold">{item.frequency}</span>
        </div>
        <div className="flex items-center gap-1 text-slate-500">
          <span className="text-slate-400">Dur:</span>
          <span className="text-slate-700 font-semibold">{item.duration}</span>
        </div>
        <div className="flex items-center gap-1 text-slate-500">
          <span className="text-slate-400">Timing:</span>
          <span className="text-slate-700 font-semibold">{item.timing}</span>
        </div>
        <div className="col-span-2 flex items-center gap-1 text-slate-500">
          <span className="text-slate-400">Qty:</span>
          <span className="text-slate-700 font-semibold">{item.quantity} Tablets</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SmartPrescriptionSearch({ isOpen, onClose, onSavePrescription, initialCart = [] }) {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All Results');
  const [searchResults, setSearchResults] = useState({ generics: [], brands: [], clinicInventory: [] });
  const [loading, setLoading] = useState(false);
  const [selectedMed, setSelectedMed] = useState(null);
  const [selectedMedType, setSelectedMedType] = useState(null);
  const [cartItems, setCartItems] = useState(initialCart);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const [history, setHistory] = useState(getHistory);

  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  // Sync initial cart
  useEffect(() => {
    if (isOpen) setCartItems(initialCart);
  }, [isOpen]);

  // Auto-focus
  useEffect(() => {
    if (isOpen) setTimeout(() => searchRef.current?.focus(), 100);
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setSearchResults({ generics: [], brands: [], clinicInventory: [] });
      setFocusedIdx(-1);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await pharmacyApi.searchAll(query.trim());
        const data = res?.data || res || { generics: [], brands: [], clinicInventory: [] };
        setSearchResults(data);
        setFocusedIdx(0);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // Flatten results for keyboard navigation
  const flatResults = useCallback(() => {
    const filtered = applyFilter(searchResults, activeFilter);
    return [
      ...filtered.generics.map(g => ({ med: g, type: 'generic' })),
      ...filtered.brands.map(b => ({ med: b, type: 'brand' })),
      ...(filtered.combos || []).map(c => ({ med: c, type: 'combo' })),
      ...filtered.clinicInventory.map(c => ({ med: c, type: 'clinicInventory' })),
    ];
  }, [searchResults, activeFilter]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      const flat = flatResults();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIdx(prev => {
          const next = prev + 1;
          if (next >= flat.length) return 0;
          const target = flat[next];
          if (target) {
            setSelectedMed(target.med);
            setSelectedMedType(target.type);
          }
          return next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIdx(prev => {
          const next = prev - 1;
          if (next < 0) return flat.length - 1;
          const target = flat[next];
          if (target) {
            setSelectedMed(target.med);
            setSelectedMedType(target.type);
          }
          return next;
        });
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, searchResults, activeFilter, flatResults, onClose]);

  const applyFilter = (data, filter) => {
    const generics = data.generics || [];
    const brands = data.brands || [];
    const clinicInventory = data.clinicInventory || [];
    const combos = data.combos || [];

    switch (filter) {
      case 'Generic':
        return { generics, brands: [], clinicInventory: [], combos: [] };
      case 'Brands':
        return { generics: [], brands, clinicInventory: [], combos: [] };
      case 'Combinations':
        return { generics: [], brands: [], clinicInventory: [], combos };
      case 'Available in Clinic':
        return { generics: [], brands: [], clinicInventory, combos: [] };
      case 'Prescription Only':
        return {
          generics: generics.filter(g => g.prescriptionRequired),
          brands: brands.filter(b => b.prescriptionRequired),
          clinicInventory: clinicInventory.filter(m => m.requiresPrescription),
          combos: []
        };
      case 'OTC':
        return {
          generics: generics.filter(g => !g.prescriptionRequired),
          brands: brands.filter(b => !b.prescriptionRequired),
          clinicInventory: clinicInventory.filter(m => !m.requiresPrescription),
          combos: []
        };
      default:
        return { generics, brands, clinicInventory, combos };
    }
  };

  const filtered = applyFilter(searchResults, activeFilter);

  const totalCount = (filtered.generics?.length || 0) +
    (filtered.brands?.length || 0) +
    (filtered.clinicInventory?.length || 0) +
    (filtered.combos?.length || 0);

  const handleAddToCart = (row) => {
    setCartItems(prev => {
      const exists = prev.findIndex(c => c._srcId === row._srcId);
      if (exists >= 0) {
        const updated = [...prev];
        updated[exists] = row;
        return updated;
      }
      return [...prev, row];
    });
  };

  const handleRemoveFromCart = (srcId) => {
    setCartItems(prev => prev.filter(c => c._srcId !== srcId));
  };

  const handleEditCartItem = (srcId, updated) => {
    if (!srcId) return; // "Add Medicine" signal — ignore, user should search
    setCartItems(prev => prev.map(c => c._srcId === srcId ? { ...c, ...updated } : c));
  };

  const handleSave = () => {
    pushHistory(query);
    // Convert cart items to the prescription row format
    const rows = cartItems.map(item => ({
      medicineName: item.medicineName,
      genericName: item.genericName || '',
      brandName: item.brandName || '',
      dosage: item.dosage || '',
      frequency: item.frequency || '1-0-1',
      duration: item.duration || '5 days',
      route: item.route || 'oral',
      timing: item.timing || 'After Food',
      instructions: item.instructions || '',
      quantity: item.quantity || 10,
      isSubstituteAllowed: item.isSubstituteAllowed || false,
      dosageForm: item.dosageForm || '',
      therapeuticCategory: item.therapeuticCategory || ''
    }));
    onSavePrescription(rows);
    onClose();
  };

  const selectMed = (med, type) => {
    setSelectedMed(med);
    setSelectedMedType(type);
    const flat = flatResults();
    const idx = flat.findIndex(f => f.med._id === med._id);
    if (idx >= 0) setFocusedIdx(idx);
  };

  if (!isOpen) return null;

  return (
    <div className="w-full flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden mt-4 shadow-sm">
      {/* ── Top Bar ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50" style={{ minHeight: 56 }}>
        {/* Brand info */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center shadow-md shadow-violet-950/10">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          </div>
          <span className="text-[11px] font-bold text-slate-600">Search Medicine (Generic, Brand, Composition, Manufacturer)</span>
        </div>

        {/* Search box */}
        <div className="flex-1 max-w-sm relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-450" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input
            ref={searchRef}
            className="w-full rounded-xl border border-slate-250 bg-white pl-9 pr-9 py-2 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-violet-500/60 focus:ring-1 focus:ring-violet-200 transition-all font-semibold"
            placeholder="Search..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setSearchResults({ generics: [], brands: [], clinicInventory: [] }); }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          )}
          {loading && (
            <svg className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-violet-600" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10" className="opacity-25"/><path d="M12 2a10 10 0 0110 10" className="opacity-75"/></svg>
          )}
        </div>

        {/* Close Button & Cross */}
        <button
          type="button"
          onClick={onClose}
          className="ml-auto flex items-center justify-center w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer shadow-sm"
          title="Close search"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      {/* ── Main 3-column area ── */}
      <div className="flex flex-1 overflow-hidden" style={{ minHeight: 460 }}>

        {/* ── LEFT: Search + Results ── */}
        <div className="flex flex-col border-r border-slate-150" style={{ width: '35%', minWidth: 300 }}>
          {/* Filter chips */}
          <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-slate-100 overflow-x-auto scrollbar-none flex-shrink-0 bg-slate-50/20">
            {FILTERS.map(f => {
              let cnt = 0;
              if (f === 'All Results') cnt = totalCount;
              else if (f === 'Generic') cnt = filtered.generics?.length || 0;
              else if (f === 'Brands') cnt = filtered.brands?.length || 0;
              else if (f === 'Combinations') cnt = filtered.combos?.length || 0;
              else if (f === 'Available in Clinic') cnt = filtered.clinicInventory?.length || 0;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setActiveFilter(f)}
                  className={`flex-shrink-0 flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all
                    ${activeFilter === f
                      ? 'bg-violet-50 border-violet-200 text-violet-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800'}`}
                >
                  {f}
                  {f !== 'Prescription Only' && f !== 'OTC' && (
                    <span className={`text-[9px] px-1 py-0.5 rounded-full font-extrabold ${activeFilter === f ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500'}`}>
                      {cnt}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto p-2 bg-white">
            {!query && history.length > 0 && (
              <div className="px-3 py-2">
                <p className="text-[9px] uppercase tracking-wider text-slate-400 font-black mb-2">Recent Searches</p>
                <div className="flex flex-wrap gap-1.5">
                  {history.map(h => (
                    <button key={h} type="button" onClick={() => setQuery(h)}
                      className="text-[10px] px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-650 hover:text-slate-800 hover:bg-slate-100 transition-colors font-semibold">
                      {h}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {query && !loading && totalCount === 0 && (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-400"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                </div>
                <p className="text-sm font-semibold text-slate-500">No results for "{query}"</p>
                <p className="text-[11px] text-slate-400 mt-1">Try another keyword or generic composition</p>
              </div>
            )}

            {!query && history.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-14 h-14 rounded-full bg-violet-50 border border-violet-100 flex items-center justify-center mb-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-violet-500"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                </div>
                <p className="text-sm font-bold text-slate-600">Search for a Medicine</p>
                <p className="text-[11px] text-slate-400 mt-1">Discover by generic name, brand, or FDC composition</p>
              </div>
            )}

            {/* ─ Generic Medicines ─ */}
            {filtered.generics?.length > 0 && (
              <div className="pt-2 pb-1">
                <div className="flex items-center gap-2 px-3 mb-1.5">
                  <div className="w-4 h-4 rounded bg-violet-50 flex items-center justify-center">
                    <span className="text-[8px] font-extrabold text-violet-650">G</span>
                  </div>
                  <p className="text-[9px] font-black uppercase tracking-wider text-violet-700">Generic Medicines</p>
                  <span className="text-[9px] text-violet-400">({filtered.generics.length})</span>
                </div>
                <div className="px-1">
                  {filtered.generics.map((med, i) => (
                    <MedResultCard
                      key={med._id}
                      med={med}
                      type="generic"
                      query={query}
                      isSelected={selectedMed?._id === med._id}
                      inCart={cartItems.some(c => c._srcId === med._id)}
                      onClick={() => selectMed(med, 'generic')}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ─ Brand Medicines ─ */}
            {filtered.brands?.length > 0 && (
              <div className="pt-1 pb-1">
                <div className="flex items-center gap-2 px-3 mb-1.5">
                  <div className="w-4 h-4 rounded bg-blue-50 flex items-center justify-center">
                    <span className="text-[8px] font-extrabold text-blue-650">B</span>
                  </div>
                  <p className="text-[9px] font-black uppercase tracking-wider text-blue-700">Brand Medicines</p>
                  <span className="text-[9px] text-blue-400">({filtered.brands.length})</span>
                </div>
                <div className="px-1">
                  {filtered.brands.map(med => (
                    <MedResultCard
                      key={med._id}
                      med={med}
                      type="brand"
                      query={query}
                      isSelected={selectedMed?._id === med._id}
                      inCart={cartItems.some(c => c._srcId === med._id)}
                      onClick={() => selectMed(med, 'brand')}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ─ Combinations ─ */}
            {filtered.combos?.length > 0 && (
              <div className="pt-1 pb-1">
                <div className="flex items-center gap-2 px-3 mb-1.5">
                  <div className="w-4 h-4 rounded bg-amber-50 flex items-center justify-center">
                    <span className="text-[8px] font-extrabold text-amber-650">C</span>
                  </div>
                  <p className="text-[9px] font-black uppercase tracking-wider text-amber-700">Combination Medicines (FDC)</p>
                  <span className="text-[9px] text-amber-400">({filtered.combos.length})</span>
                </div>
                <div className="px-1">
                  {filtered.combos.map(med => (
                    <MedResultCard
                      key={med._id}
                      med={med}
                      type="combo"
                      query={query}
                      isSelected={selectedMed?._id === med._id}
                      inCart={cartItems.some(c => c._srcId === med._id)}
                      onClick={() => selectMed(med, 'combo')}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ─ Clinic Inventory ─ */}
            {filtered.clinicInventory?.length > 0 && (
              <div className="pt-1 pb-3">
                <div className="flex items-center gap-2 px-3 mb-1.5">
                  <div className="w-4 h-4 rounded bg-teal-50 flex items-center justify-center">
                    <span className="text-[8px] font-extrabold text-teal-650">S</span>
                  </div>
                  <p className="text-[9px] font-black uppercase tracking-wider text-teal-700">In Clinic Stock</p>
                  <span className="text-[9px] text-teal-400">({filtered.clinicInventory.length})</span>
                </div>
                <div className="px-1">
                  {filtered.clinicInventory.map(med => (
                    <MedResultCard
                      key={med._id}
                      med={med}
                      type="clinicInventory"
                      query={query}
                      isSelected={selectedMed?._id === med._id}
                      inCart={cartItems.some(c => c._srcId === med._id)}
                      onClick={() => selectMed(med, 'clinicInventory')}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── MIDDLE: Medicine Details ── */}
        <div className="flex-1 border-r border-slate-150 overflow-hidden bg-white" style={{ minWidth: 0 }}>
          {!selectedMed ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-150 flex items-center justify-center mb-4">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-400">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M12 12h.01M12 16h.01"/>
                </svg>
              </div>
              <p className="text-sm font-bold text-slate-550">Select a medicine</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                Click any medicine in the search results to configure dosage, duration, timing, and add it to the prescription cart.
              </p>
            </div>
          ) : (
            <MedicineDetailsPanel
              key={selectedMed._id}
              med={selectedMed}
              medType={selectedMedType}
              cartItems={cartItems}
              searchResults={searchResults}
              onAdd={handleAddToCart}
            />
          )}
        </div>

        {/* ── RIGHT: Prescription Cart ── */}
        <div style={{ width: 280, flexShrink: 0 }} className="bg-slate-50/30 overflow-hidden border-l border-slate-100">
          <PrescriptionCart
            items={cartItems}
            onRemove={handleRemoveFromCart}
            onEdit={handleEditCartItem}
            onSave={handleSave}
            onClearAll={() => setCartItems([])}
          />
        </div>
      </div>

      {/* Footer hint */}
      <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 flex items-center gap-2">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500 flex-shrink-0"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
        <p className="text-[10px] text-slate-500 font-semibold">Prescribing generic medicine is recommended for better affordability and availability.</p>
      </div>
    </div>
  );
}
