import { useState, useEffect } from 'react';
import { Search, Plus } from 'lucide-react';
import { pharmacyApi } from '../../lib/api';

const FIELD_CLASS =
  'rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';

const routeOptions = ['oral', 'topical', 'injection', 'inhalation', 'other'];

const MedicineItemForm = ({ item, index, onChange, onRemove, disableRemove = false }) => {
  const [searchTerm, setSearchTerm] = useState(item.medicineName || '');
  const [searchResults, setSearchResults] = useState({ generics: [], brands: [], clinicInventory: [] });
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  // Scenario 1 & 2 UI details
  const [selectedGenericInfo, setSelectedGenericInfo] = useState(null);
  const [notAvailableWarning, setNotAvailableWarning] = useState(false);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults({ generics: [], brands: [], clinicInventory: [] });
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await pharmacyApi.searchAll(searchTerm);
        setSearchResults(res.data || res || { generics: [], brands: [], clinicInventory: [] });
      } catch (err) {
        console.error('Failed to search medicines:', err);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  const selectGeneric = (gen) => {
    // Check clinic inventory for this generic
    const matchingInClinic = searchResults.clinicInventory.filter(
      (med) => med.genericName?.toLowerCase() === gen.name.toLowerCase()
    );

    if (matchingInClinic.length > 0) {
      // Scenario 1: Generic exists in clinic. Show selection info
      setSelectedGenericInfo({
        generic: gen,
        clinicBrands: matchingInClinic
      });
      setNotAvailableWarning(false);
    } else {
      // Scenario 2: Generic not in clinic. Show warning
      setSelectedGenericInfo({
        generic: gen,
        clinicBrands: []
      });
      setNotAvailableWarning(true);
    }
    setShowDropdown(false);
  };

  const handlePrescribeGenericOnly = () => {
    const gen = selectedGenericInfo.generic;
    onChange(index, 'medicineName', gen.name);
    onChange(index, 'genericName', gen.name);
    onChange(index, 'strength', gen.strength);
    onChange(index, 'dosageForm', gen.dosageForm);
    onChange(index, 'route', gen.route?.toLowerCase() || 'oral');
    setSearchTerm(gen.name);
    setSelectedGenericInfo(null);
    setNotAvailableWarning(false);
  };

  const handlePrescribeBrand = (brandMed) => {
    onChange(index, 'medicineName', brandMed.name);
    onChange(index, 'genericName', brandMed.genericName || '');
    onChange(index, 'strength', brandMed.strength || '');
    onChange(index, 'dosageForm', brandMed.form || '');
    onChange(index, 'brandName', brandMed.brandName || '');
    setSearchTerm(brandMed.name);
    setSelectedGenericInfo(null);
    setNotAvailableWarning(false);
  };

  const handleNotifyPharmacy = async () => {
    const gen = selectedGenericInfo.generic;
    try {
      await pharmacyApi.createProcurementRequest({
        genericName: gen.name,
        strength: gen.strength,
        dosageForm: gen.dosageForm
      });
      alert('Pharmacy Procurement Request created successfully!');
    } catch (err) {
      console.error('Failed to notify pharmacy:', err);
    }
    // Continue prescribing anyway
    handlePrescribeGenericOnly();
  };

  const selectBrandDirectly = (brd) => {
    const displayName = brd.name;
    onChange(index, 'medicineName', displayName);
    onChange(index, 'genericName', brd.genericMedicineId?.name || '');
    onChange(index, 'strength', brd.genericMedicineId?.strength || '');
    onChange(index, 'dosageForm', brd.genericMedicineId?.dosageForm || '');
    setSearchTerm(displayName);
    setShowDropdown(false);
  };

  const selectInventoryDirectly = (inv) => {
    onChange(index, 'medicineName', inv.name);
    onChange(index, 'genericName', inv.genericName || '');
    onChange(index, 'strength', inv.strength || '');
    onChange(index, 'dosageForm', inv.form || '');
    setSearchTerm(inv.name);
    setShowDropdown(false);
  };

  return (
    <div className="relative grid gap-3 rounded-3xl border border-stone-200 bg-stone-50 p-4 xl:grid-cols-12">
      {/* Autocomplete Input */}
      <div className="relative xl:col-span-3">
        <input
          className={`${FIELD_CLASS} w-full pr-10`}
          value={searchTerm}
          onChange={(event) => {
            setSearchTerm(event.target.value);
            onChange(index, 'medicineName', event.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder="Search Generic, Brand, or Stock..."
        />
        <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400" />

        {showDropdown && (searchTerm.trim() !== '') && (
          <div className="absolute left-0 right-0 mt-2 max-h-72 overflow-y-auto bg-white border border-stone-200 rounded-2xl shadow-xl z-50 p-2 text-xs divide-y divide-stone-100">
            {loading && <p className="p-3 text-stone-500 font-semibold">Searching catalogues...</p>}
            
            {/* GENERICS */}
            <div>
              <p className="px-3 py-1 bg-stone-50 text-stone-400 font-bold uppercase tracking-wider text-[9px]">Generic Medicines</p>
              {searchResults.generics.length === 0 && <p className="px-3 py-2 text-stone-400 italic">No generics matched</p>}
              {searchResults.generics.map((gen) => (
                <button
                  key={gen._id}
                  type="button"
                  onClick={() => selectGeneric(gen)}
                  className="w-full text-left px-3 py-2 hover:bg-emerald-50 rounded-lg flex items-center justify-between"
                >
                  <span className="font-bold text-stone-800">{gen.name} ({gen.strength})</span>
                  <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase">Generic</span>
                </button>
              ))}
            </div>

            {/* BRANDS */}
            <div className="mt-2 pt-2">
              <p className="px-3 py-1 bg-stone-50 text-stone-400 font-bold uppercase tracking-wider text-[9px]">Brands</p>
              {searchResults.brands.length === 0 && <p className="px-3 py-2 text-stone-400 italic">No brands matched</p>}
              {searchResults.brands.map((brd) => (
                <button
                  key={brd._id}
                  type="button"
                  onClick={() => selectBrandDirectly(brd)}
                  className="w-full text-left px-3 py-2 hover:bg-sky-50 rounded-lg flex flex-col"
                >
                  <span className="font-bold text-stone-800">{brd.name}</span>
                  <span className="text-stone-400 text-[10px]">Generic: {brd.genericMedicineId?.name || 'N/A'}</span>
                </button>
              ))}
            </div>

            {/* CLINIC INVENTORY */}
            <div className="mt-2 pt-2">
              <p className="px-3 py-1 bg-stone-50 text-stone-400 font-bold uppercase tracking-wider text-[9px]">Available in Clinic</p>
              {searchResults.clinicInventory.length === 0 && <p className="px-3 py-2 text-stone-400 italic">No inventory matched</p>}
              {searchResults.clinicInventory.map((inv) => (
                <button
                  key={inv._id}
                  type="button"
                  onClick={() => selectInventoryDirectly(inv)}
                  className="w-full text-left px-3 py-2 hover:bg-teal-50 rounded-lg flex items-center justify-between"
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-teal-800">{inv.name}</span>
                    <span className="text-[10px] text-stone-400">Stock: {inv.totalStock} • Expiry: {inv.batches?.[0]?.expiryDate ? new Date(inv.batches[0].expiryDate).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <span className="bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase">In Clinic</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowDropdown(false)}
              className="w-full text-center py-2 text-stone-400 hover:text-stone-600 font-bold bg-stone-50 mt-1 rounded-xl"
            >
              Close Results
            </button>
          </div>
        )}
      </div>

      {/* Scenario 1: Generic exists in inventory view */}
      {selectedGenericInfo && !notAvailableWarning && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-stone-200 max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-stone-900">Available Brands for {selectedGenericInfo.generic.name}</h3>
            <p className="text-xs text-stone-500">We found the following brands matching this generic in clinic inventory:</p>
            <div className="divide-y divide-stone-100 max-h-48 overflow-y-auto">
              {selectedGenericInfo.clinicBrands.map((med) => (
                <div key={med._id} className="py-2.5 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-bold text-stone-850">{med.name}</span>
                    <span className="text-[10px] text-emerald-600 font-bold">Stock: {med.totalStock}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePrescribeBrand(med)}
                    className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold transition"
                  >
                    Select Brand
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-2 justify-end">
              <button
                type="button"
                onClick={() => setSelectedGenericInfo(null)}
                className="px-4 py-2 border border-stone-200 hover:bg-stone-50 rounded-xl text-xs font-bold text-stone-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePrescribeGenericOnly}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold"
              >
                Prescribe Generic
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scenario 2: Generic not available warning dialog */}
      {notAvailableWarning && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-stone-200 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="bg-amber-50 border border-amber-250 p-4 rounded-2xl flex flex-col gap-2">
              <span className="text-xs font-extrabold text-amber-700 uppercase tracking-wider">⚠️ Medicine Not in Pharmacy</span>
              <p className="text-xs text-amber-800 font-medium">
                This generic medicine is not available in the clinic pharmacy. The patient may purchase it from an external pharmacy. You can continue prescribing.
              </p>
            </div>
            <div className="flex items-center gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={handleNotifyPharmacy}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-md"
              >
                Notify Pharmacy
              </button>
              <button
                type="button"
                onClick={handlePrescribeGenericOnly}
                className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition"
              >
                Continue Prescription
              </button>
              <button
                type="button"
                onClick={() => {
                  setNotAvailableWarning(false);
                  setSelectedGenericInfo(null);
                }}
                className="px-4 py-2.5 border border-stone-200 hover:bg-stone-50 rounded-xl text-xs font-bold text-stone-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <input
        className={`${FIELD_CLASS} xl:col-span-2`}
        value={item.genericName}
        onChange={(event) => onChange(index, 'genericName', event.target.value)}
        placeholder="Generic name"
      />
      <input
        className={`${FIELD_CLASS} xl:col-span-2`}
        value={item.dosage}
        onChange={(event) => onChange(index, 'dosage', event.target.value)}
        placeholder="Dosage"
      />
      <input
        className={`${FIELD_CLASS} xl:col-span-2`}
        value={item.frequency}
        onChange={(event) => onChange(index, 'frequency', event.target.value)}
        placeholder="Frequency"
      />
      <input
        className={`${FIELD_CLASS} xl:col-span-2`}
        value={item.duration}
        onChange={(event) => onChange(index, 'duration', event.target.value)}
        placeholder="Duration"
      />
      <select
        className={`${FIELD_CLASS} xl:col-span-1`}
        value={item.route}
        onChange={(event) => onChange(index, 'route', event.target.value)}
      >
        {routeOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <input
        className={`${FIELD_CLASS} xl:col-span-2`}
        value={item.timing}
        onChange={(event) => onChange(index, 'timing', event.target.value)}
        placeholder="Timing"
      />
      <input
        className={`${FIELD_CLASS} xl:col-span-4`}
        value={item.instructions}
        onChange={(event) => onChange(index, 'instructions', event.target.value)}
        placeholder="Instructions"
      />
      <input
        className={`${FIELD_CLASS} xl:col-span-2`}
        type="number"
        min="1"
        value={item.quantity}
        onChange={(event) => onChange(index, 'quantity', event.target.value)}
        placeholder="Quantity"
      />
      <label className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-700 xl:col-span-2">
        <input
          type="checkbox"
          checked={Boolean(item.isSubstituteAllowed)}
          onChange={(event) => onChange(index, 'isSubstituteAllowed', event.target.checked)}
        />
        Substitute allowed
      </label>
      <button
        type="button"
        disabled={disableRemove}
        onClick={() => onRemove(index)}
        className="rounded-2xl border border-rose-300 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:border-stone-200 disabled:text-stone-400 xl:col-span-1"
      >
        Remove
      </button>
    </div>
  );
};

export default MedicineItemForm;
