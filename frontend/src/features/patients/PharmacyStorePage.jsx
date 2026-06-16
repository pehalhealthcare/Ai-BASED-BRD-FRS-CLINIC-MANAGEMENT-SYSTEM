import { useEffect, useState } from 'react';
import { Pill, Search, UserCheck, MessageSquare, AlertCircle, ShoppingBag, X } from 'lucide-react';
import { pharmacyApi, prescriptionApi, patientApi } from '../../lib/api';
import useAuth from '../../hooks/useAuth';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { FullPageSpinner } from '../../components/ui/Spinner';

const PharmacyStorePage = () => {
  const { user } = useAuth();
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Pharmacist help modal state
  const [pharmacistModalOpen, setPharmacistModalOpen] = useState(false);
  const [pharmacistQuery, setPharmacistQuery] = useState('');
  const [submittingQuery, setSubmittingQuery] = useState(false);
  const [querySuccess, setQuerySuccess] = useState(false);

  // Reserve modal state
  const [reserveModalOpen, setReserveModalOpen] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [reserveQty, setReserveQty] = useState(1);
  const [reserving, setReserving] = useState(false);
  const [reserveSuccess, setReserveSuccess] = useState(false);
  const [patientPrescriptions, setPatientPrescriptions] = useState([]);
  const [prescriptionType, setPrescriptionType] = useState('system'); // 'system' or 'manual'
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');

  useEffect(() => {
    const fetchPatientPrescriptions = async () => {
      try {
        const profileRes = await patientApi.me();
        const patient = profileRes.data?.patient || profileRes.patient;
        if (patient?._id) {
          const response = await prescriptionApi.getByPatient(patient._id, { status: 'finalized', limit: 10 });
          setPatientPrescriptions(response.data?.prescriptions || response.prescriptions || []);
        }
      } catch (err) {
        console.error('Failed to load prescriptions', err);
      }
    };
    if (reserveModalOpen) {
      fetchPatientPrescriptions();
    }
  }, [reserveModalOpen]);

  useEffect(() => {
    const fetchMedicines = async () => {
      try {
        setLoading(true);
        const response = await pharmacyApi.listMedicines({ limit: 50, isActive: true });
        setMedicines(response.data?.medicines || response.medicines || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch pharmacy inventory.');
      } finally {
        setLoading(false);
      }
    };
    fetchMedicines();
  }, []);

  const handleContactPharmacist = (e) => {
    e.preventDefault();
    if (!pharmacistQuery.trim()) return;
    setSubmittingQuery(true);
    // Simulate sending message to Pharmacist
    setTimeout(() => {
      setSubmittingQuery(false);
      setQuerySuccess(true);
      setPharmacistQuery('');
      setTimeout(() => {
        setQuerySuccess(false);
        setPharmacistModalOpen(false);
      }, 2500);
    }, 1200);
  };

  const handleReserveMedication = (e) => {
    e.preventDefault();
    if (!selectedMedicine) return;
    setReserving(true);
    // Simulate dispensing/reservation request
    setTimeout(() => {
      setReserving(false);
      setReserveSuccess(true);
      setTimeout(() => {
        setReserveSuccess(false);
        setReserveModalOpen(false);
        setSelectedMedicine(null);
        setReserveQty(1);
      }, 2500);
    }, 1200);
  };

  const categories = ['All', ...new Set(medicines.map(m => m.category).filter(Boolean))];

  const filteredMedicines = medicines.filter(med => {
    const matchesSearch = med.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (med.genericName && med.genericName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || med.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) return <FullPageSpinner message="Opening the AuraPharmacy catalog..." />;

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 md:p-6 animate-fade-in">
      {/* Header Panel */}
      <div className="relative overflow-hidden rounded-2xl p-6 bg-[#060d18] dark:bg-navy-900 border border-white/[0.06]">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute -bottom-16 -left-10 w-64 h-64 rounded-full bg-indigo-600/10 blur-3xl" />
        </div>

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-aura-400">AuraCare Pharmacy</p>
            <h1 className="text-2xl md:text-3xl font-bold text-white mt-1">Pharmacy Store</h1>
            <p className="text-sm text-slate-400 mt-2 max-w-xl">
              Browse available medications, reserve prescriptions for quick pickup, or connect directly with our duty pharmacist.
            </p>
          </div>

          <button
            onClick={() => setPharmacistModalOpen(true)}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-aura-600 to-indigo-600 hover:from-aura-500 hover:to-indigo-500 text-white text-sm font-semibold transition shadow-glow-teal"
          >
            <MessageSquare size={16} />
            Ask a Pharmacist
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Catalog Control Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-navy-800 p-4 rounded-2xl border border-slate-200 dark:border-white/[0.08]">
        {/* Search */}
        <div className="relative w-full sm:flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by medicine name or active ingredient..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-aura-500 transition"
          />
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto w-full sm:w-auto py-1 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-aura-600 text-white shadow-sm'
                  : 'bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-navy-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Medicines Catalog Grid */}
      {filteredMedicines.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMedicines.map((med) => {
            const isOutOfStock = (med.totalStock ?? 0) <= 0;
            return (
              <Card
                key={med._id}
                className="hover:border-aura-400 dark:hover:border-aura-500/40 hover:-translate-y-1 hover:shadow-elevated transition-all duration-300 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="w-10 h-10 rounded-xl bg-aura-50 dark:bg-aura-500/10 flex items-center justify-center">
                      <Pill size={20} className="text-aura-600 dark:text-aura-400" />
                    </div>
                    <Badge color={isOutOfStock ? 'danger' : (med.totalStock < 10 ? 'warning' : 'success')}>
                      {isOutOfStock ? 'Out of Stock' : `${med.totalStock} Available`}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white line-clamp-1">{med.name}</h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 italic mt-0.5">{med.genericName || 'Active Formula'}</p>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {med.category && <Badge color="default">{med.category}</Badge>}
                    {med.strength && <Badge color="default">{med.strength}</Badge>}
                    {med.form && <Badge color="default">{med.form}</Badge>}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Price per unit</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">₹{Number(med.unitPrice || 0).toFixed(2)}</p>
                  </div>

                  <button
                    disabled={isOutOfStock}
                    onClick={() => {
                      setSelectedMedicine(med);
                      setReserveModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-aura-600 hover:bg-aura-700 disabled:bg-slate-100 dark:disabled:bg-white/5 text-white disabled:text-slate-400 dark:disabled:text-slate-600 transition"
                  >
                    <ShoppingBag size={14} />
                    Reserve
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-navy-800 rounded-2xl border border-slate-200 dark:border-white/[0.08]">
          <Pill size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-base font-semibold text-slate-900 dark:text-white">No Medicines Found</p>
          <p className="text-sm text-slate-400 mt-1">Try relaxing your search keywords or choosing another category.</p>
        </div>
      )}

      {/* Seek Pharmacist Modal */}
      {pharmacistModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-navy-800 rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-2xl p-6 animate-scale-up">
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                  <UserCheck size={16} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Duty Pharmacist Desk</h3>
              </div>
              <button onClick={() => setPharmacistModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400">
                <X size={18} />
              </button>
            </div>

            {querySuccess ? (
              <div className="py-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-aura-500/10 flex items-center justify-center mx-auto text-aura-500">
                  <UserCheck size={24} />
                </div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Request Sent to Pharmacist</h4>
                <p className="text-xs text-slate-400 dark:text-slate-500">A pharmacist will get back to you shortly on your registered number.</p>
              </div>
            ) : (
              <form onSubmit={handleContactPharmacist} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Your Message or Medication Query</label>
                  <textarea
                    rows={4}
                    value={pharmacistQuery}
                    onChange={(e) => setPharmacistQuery(e.target.value)}
                    required
                    placeholder="Ask about side effects, correct dosage, drug interactions, or stock availability..."
                    className="w-full px-4 py-3 rounded-xl text-sm bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-aura-500 transition resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingQuery}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold bg-aura-600 hover:bg-aura-700 text-white transition flex justify-center items-center gap-2"
                >
                  {submittingQuery ? 'Sending...' : 'Submit Message'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Reserve Medication Modal */}
      {reserveModalOpen && selectedMedicine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-navy-800 rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-2xl p-6 animate-scale-up">
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-aura-50 dark:bg-aura-500/10 flex items-center justify-center">
                  <Pill size={16} className="text-aura-600 dark:text-aura-400" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Reserve Medication</h3>
              </div>
              <button onClick={() => setReserveModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400">
                <X size={18} />
              </button>
            </div>

            {reserveSuccess ? (
              <div className="py-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-aura-500/10 flex items-center justify-center mx-auto text-aura-500">
                  <ShoppingBag size={24} />
                </div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Reservation Successful</h4>
                <p className="text-xs text-slate-400 dark:text-slate-500">Your reserved medications are held under patient name: <span className="font-semibold">{user?.name}</span> for pickup within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleReserveMedication} className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{selectedMedicine.name}</h4>
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic mt-0.5">{selectedMedicine.genericName}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Unit Price</label>
                    <p className="text-sm font-bold text-slate-950 dark:text-white">₹{Number(selectedMedicine.unitPrice || 0).toFixed(2)}</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Max Available</label>
                    <p className="text-sm font-bold text-slate-950 dark:text-white">{selectedMedicine.totalStock}</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Quantity to Reserve</label>
                  <input
                    type="number"
                    min={1}
                    max={selectedMedicine.totalStock}
                    value={reserveQty}
                    onChange={(e) => setReserveQty(Math.min(selectedMedicine.totalStock, Math.max(1, Number(e.target.value))))}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-aura-500 transition"
                  />
                </div>

                {/* Prescription Type Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Prescription Verification</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPrescriptionType('system')}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase transition ${
                        prescriptionType === 'system'
                          ? 'bg-aura-600 text-white'
                          : 'bg-slate-100 dark:bg-white/8 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      Use Clinic Rx
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrescriptionType('manual')}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase transition ${
                        prescriptionType === 'manual'
                          ? 'bg-aura-600 text-white'
                          : 'bg-slate-100 dark:bg-white/8 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      Upload Manual Rx
                    </button>
                  </div>
                </div>

                {/* Selection Fields */}
                {prescriptionType === 'system' ? (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Choose Available Prescription</label>
                    {patientPrescriptions.length > 0 ? (
                      <select
                        value={selectedPrescriptionId}
                        onChange={(e) => setSelectedPrescriptionId(e.target.value)}
                        required
                        className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-aura-500 transition"
                      >
                        <option value="">Select prescription...</option>
                        {patientPrescriptions.map((rx) => (
                          <option key={rx._id} value={rx._id}>
                            {new Date(rx.createdAt).toLocaleDateString()} — Dr. {rx.doctorId?.fullName || 'Physician'}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-[11px] text-amber-500 dark:text-amber-400 italic bg-amber-50 dark:bg-amber-500/10 p-2 rounded-xl border border-amber-200 dark:border-amber-500/20">
                        No active clinic prescriptions found. Please upload manually.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Upload prescription document</label>
                    <input
                      type="file"
                      required
                      accept=".pdf,image/*"
                      onChange={(e) => setUploadedFileName(e.target.files[0]?.name || '')}
                      className="w-full text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[11px] file:font-semibold file:bg-aura-600 file:text-white hover:file:bg-aura-700 cursor-pointer"
                    />
                    {uploadedFileName && (
                      <p className="text-[10px] text-aura-600 dark:text-aura-400 mt-1">File selected: {uploadedFileName}</p>
                    )}
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Est. Total</span>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">₹{(Number(selectedMedicine.unitPrice || 0) * reserveQty).toFixed(2)}</p>
                  </div>
                  <button
                    type="submit"
                    disabled={reserving || (prescriptionType === 'system' && patientPrescriptions.length === 0)}
                    className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-aura-600 hover:bg-aura-700 text-white transition disabled:opacity-50"
                  >
                    {reserving ? 'Reserving...' : 'Confirm'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PharmacyStorePage;
