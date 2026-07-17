import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import PageHeader from '../../components/layout/PageHeader';
import { dispensePrescription, getPrescription, listDispensings, listMedicines } from './pharmacyApi';
import StockFlagBadge from './StockFlagBadge';

const FIELD_CLASS =
  'w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';

const DispensePage = () => {
  const { prescriptionId } = useParams();
  const navigate = useNavigate();
  const [prescription, setPrescription] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [existingDispensing, setExistingDispensing] = useState(null);
  const [form, setForm] = useState({
    notes: '',
    items: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadContext = async () => {
      setLoading(true);
      setError('');

      try {
        const [prescriptionResponse, medicinesResponse, existingDispensingResponse] = await Promise.all([
          getPrescription(prescriptionId),
          listMedicines({ limit: 100, isActive: true }),
          listDispensings({ prescriptionId, limit: 1 }).catch(() => ({ data: { dispensingRecords: [] } }))
        ]);

        if (!isMounted) {
          return;
        }

        const nextPrescription = prescriptionResponse.data.prescription;
        setPrescription(nextPrescription);
        setMedicines(medicinesResponse.data.medicines || []);
        setExistingDispensing(existingDispensingResponse.data.dispensingRecords?.[0] || null);
        setForm({
          notes: '',
          items:
            nextPrescription.medicines?.length
              ? nextPrescription.medicines.map((medicine) => ({
                  prescribedName: medicine.medicineName || '',
                  quantity: medicine.quantity || 1,
                  instructions: medicine.instructions || '',
                  medicineId: ''
                }))
              : []
        });
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.response?.data?.message || 'Unable to load dispensing context.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadContext();

    return () => {
      isMounted = false;
    };
  }, [prescriptionId]);

  const handleItemChange = (index, field, value) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value
            }
          : item
      )
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const response = await dispensePrescription({
        prescriptionId,
        patientId: prescription.patientId?._id || prescription.patientId,
        doctorId: prescription.doctorId?._id || prescription.doctorId,
        items: form.items.map((item) => ({
          medicineId: item.medicineId,
          quantity: Number(item.quantity),
          instructions: item.instructions
        })),
        notes: form.notes
      });

      navigate(`/pharmacy/dispensings/${response.data.dispensingRecord._id}`, { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to dispense this prescription.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading dispensing workspace..." />;
  }

  if (error && !prescription) {
    return <ErrorState title="Dispensing unavailable" description={error} />;
  }

  if (!prescription) {
    return <ErrorState title="Dispensing unavailable" description="No prescription was returned." />;
  }

  if (!form.items.length) {
    return <EmptyState title="No medicines on prescription" description="This prescription does not contain dispense-ready medicine rows." />;
  }

  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow="Phase 12"
        title={`Dispense ${prescription.prescriptionNumber || 'prescription'}`}
        description="Match prescribed medicines to the clinic catalog and let the backend allocate stock by FEFO."
        actions={
          <>
            <Link className="rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50" to={`/prescriptions/${prescriptionId}`}>
              Back to prescription
            </Link>
            {existingDispensing?._id ? (
              <Link className="rounded-2xl border border-cyan-300 px-4 py-3 text-sm font-semibold text-cyan-700 hover:bg-cyan-50" to={`/pharmacy/dispensings/${existingDispensing._id}`}>
                Open existing dispensing
              </Link>
            ) : null}
          </>
        }
      />

      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      {prescription.dispensingStatus === 'dispensed' ? (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-900">
          This prescription is already marked as dispensed. {existingDispensing?._id ? 'Open the existing dispensing record to review details.' : 'Refresh if you expect a linked dispensing record.'}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <article className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
          <div>
            <h2 className="text-xl font-semibold text-stone-900">Prescription context</h2>
            <p className="mt-2 text-sm text-stone-600">Only finalized prescriptions should be dispensed, and the backend will reject insufficient or expired stock automatically.</p>
          </div>
          <div className="rounded-2xl bg-stone-50 p-4">
            <p className="text-sm font-semibold text-stone-900">{prescription.patientId?.fullName || 'Patient not provided'}</p>
            <p className="mt-1 text-sm text-stone-600">Doctor: {prescription.doctorId?.fullName || 'Not provided'}</p>
            <p className="mt-1 text-sm text-stone-600">Status: {prescription.status || 'Not provided'}</p>
            <p className="mt-1 text-sm text-stone-600">Dispensing status: {prescription.dispensingStatus || 'not_dispensed'}</p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-sm font-semibold text-stone-900">Prescribed items</p>
            <ul className="mt-3 space-y-2 text-sm text-stone-700">
              {(prescription.medicines || []).map((medicine, index) => (
                <li key={`${medicine.medicineName}-${index}`}>
                  {medicine.medicineName} | Qty {medicine.quantity ?? 'Not provided'} | {medicine.instructions || 'No instructions'}
                </li>
              ))}
            </ul>
          </div>
        </article>

        <form className="grid gap-6" onSubmit={handleSubmit}>
          <article className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
            <h2 className="text-xl font-semibold text-stone-900">Catalog mapping</h2>
            <div className="grid gap-4">
              {form.items.map((item, index) => (
                <div key={`${item.prescribedName}-${index}`} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <p className="text-sm font-semibold text-stone-900">{item.prescribedName || `Prescription item ${index + 1}`}</p>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2 text-sm font-medium text-stone-700 md:col-span-2">
                      <div className="flex justify-between items-center">
                        <span>Select medicine</span>
                        {prescription.medicines?.[index]?.isSubstituteAllowed === false ? (
                          <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded font-black uppercase">Substitution Disabled</span>
                        ) : (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-black uppercase text-right">Substitution Suggested</span>
                        )}
                      </div>
                      <select className={FIELD_CLASS} value={item.medicineId} onChange={(event) => handleItemChange(index, 'medicineId', event.target.value)} required>
                        <option value="">Choose from catalog</option>
                        {(() => {
                          const prescribedItem = prescription.medicines?.[index] || {};
                          const prescribedGeneric = (prescribedItem.genericName || prescribedItem.medicineName || '').toLowerCase();
                          const isSubAllowed = prescribedItem.isSubstituteAllowed !== false;

                          // Filter options: if substitution is disabled, only allow exact match by name. Otherwise allow generic matches.
                          let filtered = medicines;
                          if (!isSubAllowed) {
                            filtered = medicines.filter(m => m.name.toLowerCase() === (prescribedItem.medicineName || '').toLowerCase());
                          } else if (prescribedGeneric) {
                            // Smart suggestion: filter medicines matching genericName or brand composition
                            filtered = medicines.filter(m =>
                              m.genericName?.toLowerCase() === prescribedGeneric ||
                              m.name?.toLowerCase() === prescribedGeneric
                            );
                          }

                          // If no direct matches are found, fallback to the entire list to not block dispensing
                          if (filtered.length === 0) {
                            filtered = medicines;
                          }

                          // Sort: Highest stock, Nearest Expiry (FEFO)
                          const sorted = [...filtered].sort((a, b) => {
                            // Sort by stock descending
                            if ((b.totalStock || 0) !== (a.totalStock || 0)) {
                              return (b.totalStock || 0) - (a.totalStock || 0);
                            }
                            // FEFO: Sort by expiry ascending
                            const expA = a.batches?.[0]?.expiryDate ? new Date(a.batches[0].expiryDate).getTime() : Infinity;
                            const expB = b.batches?.[0]?.expiryDate ? new Date(b.batches[0].expiryDate).getTime() : Infinity;
                            return expA - expB;
                          });

                          return sorted.map((medicine) => (
                            <option key={medicine._id} value={medicine._id}>
                              {medicine.name} ({medicine.totalStock ?? 0} in stock)
                            </option>
                          ));
                        })()}
                      </select>
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-stone-700">
                      <span>Quantity</span>
                      <input className={FIELD_CLASS} type="number" min="1" step="1" value={item.quantity} onChange={(event) => handleItemChange(index, 'quantity', event.target.value)} required />
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-stone-700">
                      <span>Instructions</span>
                      <input className={FIELD_CLASS} value={item.instructions} onChange={(event) => handleItemChange(index, 'instructions', event.target.value)} />
                    </label>
                  </div>
                  {item.medicineId ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(() => {
                        const selectedMedicine = medicines.find((medicine) => medicine._id === item.medicineId);
                        if (!selectedMedicine) {
                          return null;
                        }

                        return (
                          <>
                            {selectedMedicine.stockFlags?.lowStock ? <StockFlagBadge flag="lowStock" /> : null}
                            {selectedMedicine.stockFlags?.nearExpiry ? <StockFlagBadge flag="nearExpiry" /> : null}
                            {selectedMedicine.stockFlags?.expired ? <StockFlagBadge flag="expired" /> : null}
                          </>
                        );
                      })()}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </article>

          <article className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Dispensing note</span>
              <textarea className={FIELD_CLASS} rows={4} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
            </label>
            <button
              type="submit"
              disabled={saving || prescription.dispensingStatus === 'dispensed'}
              className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-stone-300"
            >
              {saving ? 'Dispensing...' : 'Dispense medicines'}
            </button>
          </article>
        </form>
      </div>
    </section>
  );
};

export default DispensePage;
