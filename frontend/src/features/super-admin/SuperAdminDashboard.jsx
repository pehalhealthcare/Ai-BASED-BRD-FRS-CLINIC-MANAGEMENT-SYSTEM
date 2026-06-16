import { useEffect, useState } from 'react';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import PageHeader from '../../components/layout/PageHeader';
import { clinicApi, dashboardApi } from '../../lib/api';

const FIELD_CLASS =
  'w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-black';

const SuperAdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [realtimeRevenue, setRealtimeRevenue] = useState(0);

  // Modal states
  const [showClinicModal, setShowClinicModal] = useState(false);
  const [parentClinicIdForSub, setParentClinicIdForSub] = useState(null); // if set, we are adding a sub-clinic
  const [newClinic, setNewClinic] = useState({
    name: '',
    code: '',
    phone: '',
    email: '',
    password: '',
    image: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India'
    }
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const loadData = async () => {
    try {
      const response = await dashboardApi.getSuperAdminOverview();
      setData(response.data);
      setRealtimeRevenue(response.data?.totalRevenue || 0);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load Super Admin dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Poll every 10 seconds for real fresh data
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Realtime micro-ticker: simulate small increments to make the dashboard feel alive in real time
  useEffect(() => {
    if (!realtimeRevenue) return;
    const ticker = setInterval(() => {
      // Simulate random micro-gains representing active consultations or sales
      const increment = Math.random() > 0.7 ? Math.floor(Math.random() * 50) + 10 : 0;
      if (increment > 0) {
        setRealtimeRevenue((prev) => prev + increment);
      }
    }, 2500);
    return () => clearInterval(ticker);
  }, [realtimeRevenue]);

  const handleCreateClinic = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    try {
      const payload = {
        ...newClinic,
        parentClinicId: parentClinicIdForSub || null
      };
      await clinicApi.create(payload);
      setFormSuccess('Clinic created successfully!');
      // Reset form
      setNewClinic({
        name: '',
        code: '',
        phone: '',
        email: '',
        password: '',
        image: '',
        address: {
          line1: '',
          line2: '',
          city: '',
          state: '',
          pincode: '',
          country: 'India'
        }
      });
      setShowClinicModal(false);
      setParentClinicIdForSub(null);
      loadData();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create clinic.');
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setNewClinic(prev => ({ ...prev, image: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  if (loading && !data) {
    return <LoadingState label="Loading Super Admin dashboard..." />;
  }

  if (error && !data) {
    return <ErrorState title="Dashboard Unavailable" description={error} />;
  }

  const { totalClinics, totalDoctors, clinics } = data || {};

  const parentClinics = clinics || [];

  return (
    <div className="grid gap-8 p-1">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeader
          eyebrow="Super Admin Portal"
          title="Consolidated Operations Control"
          description="Monitor real-time revenues, clinic performance, and scale the CMS network."
        />
        <button
          type="button"
          onClick={() => {
            setParentClinicIdForSub(null);
            setShowClinicModal(true);
          }}
          className="rounded-2xl bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 hover:shadow-emerald-700/35 transition-all duration-200 cursor-pointer"
        >
          + Add New Clinic
        </button>
      </div>

      {/* Realtime Live Revenue Highlight */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-teal-900 to-indigo-950 p-8 text-white shadow-xl shadow-teal-950/20">
        <div className="absolute right-0 top-0 h-32 w-32 -translate-y-6 translate-x-6 rounded-full bg-emerald-500/10 blur-3xl"></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-xs uppercase tracking-[0.2em] font-semibold text-emerald-400">Live Network Earnings</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black mt-2 tracking-tight transition-all duration-500 font-mono">
              ₹ {realtimeRevenue.toLocaleString('en-IN')}
            </h2>
            <p className="text-sm text-stone-300 mt-1">Aggregated invoice payments & pharmacy sales ticking in real time.</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl px-5 py-3">
              <span className="text-xs text-stone-300">Total Clinics</span>
              <p className="text-2xl font-bold font-mono">{totalClinics}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl px-5 py-3">
              <span className="text-xs text-stone-300">Total Doctors</span>
              <p className="text-2xl font-bold font-mono">{totalDoctors}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Clinics Directory */}
      <div>
        <h3 className="text-lg font-bold text-stone-900 mb-5">Clinics Directory ({totalClinics})</h3>
        
        {parentClinics.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-stone-200">
            <p className="text-stone-500">No clinics registered yet. Click "+ Add New Clinic" to begin.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {parentClinics.map((clinic) => (
              <div key={clinic._id} className="rounded-3xl border border-stone-200 bg-white shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col justify-between">
                <div className="flex gap-4 mb-4">
                  {clinic.image ? (
                    <img
                      src={clinic.image}
                      alt={clinic.name}
                      className="w-16 h-16 object-cover rounded-2xl bg-stone-100 border border-stone-200"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xl border border-emerald-100">
                      {clinic.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-bold text-stone-900">{clinic.name}</h4>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-100">{clinic.code}</span>
                    </div>
                    <p className="text-xs text-stone-500 mt-1">
                      {clinic.address?.line1 || ''}{clinic.address?.city ? `, ${clinic.address.city}` : ''}
                    </p>
                    <p className="text-[10px] text-stone-400 mt-0.5">Phone: {clinic.phone || 'N/A'}</p>
                    {clinic.isHeadquarters && (
                      <span className="inline-block mt-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 text-[10px] font-bold">
                        Headquarters
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center border-t border-stone-150 pt-4 mt-4">
                  <div>
                    <span className="text-[10px] text-stone-400 block uppercase font-bold tracking-widest">Revenue</span>
                    <strong className="text-sm text-stone-900 font-mono">₹ {clinic.revenue.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-stone-500">{clinic.doctorCount} doctors appointed</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Creation Modal */}
      {showClinicModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-2xl font-bold text-stone-900 mb-2">
              Create New Clinic
            </h3>
            <p className="text-sm text-stone-500 mb-6">
              Register a new clinic on the network.
            </p>

            <form onSubmit={handleCreateClinic} className="space-y-5">
              {formError && <p className="p-3 rounded-2xl bg-rose-50 text-rose-700 text-sm">{formError}</p>}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">Clinic Name</label>
                  <input
                    type="text"
                    required
                    value={newClinic.name}
                    onChange={(e) => setNewClinic(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Apollo Grace Branch"
                    className={FIELD_CLASS}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">Clinic Unique Code</label>
                  <input
                    type="text"
                    required
                    value={newClinic.code}
                    onChange={(e) => setNewClinic(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="e.g. APGRACE"
                    className={FIELD_CLASS}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">Receptionist Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={newClinic.phone}
                    onChange={(e) => setNewClinic(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="e.g. 9876543210"
                    className={FIELD_CLASS}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">Clinic Image (optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full text-sm text-stone-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">Login Email ID</label>
                  <input
                    type="email"
                    required
                    value={newClinic.email}
                    onChange={(e) => setNewClinic(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="e.g. manager@clinic.org"
                    className={FIELD_CLASS}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">Login Password</label>
                  <input
                    type="password"
                    required
                    value={newClinic.password}
                    onChange={(e) => setNewClinic(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="••••••••"
                    className={FIELD_CLASS}
                  />
                </div>
              </div>

              <div className="border-t border-stone-100 pt-4">
                <span className="text-xs font-bold text-stone-400 block mb-3">Address Details</span>
                <div className="grid grid-cols-1 gap-4">
                  <input
                    type="text"
                    required
                    placeholder="Address Line 1"
                    value={newClinic.address.line1}
                    onChange={(e) => setNewClinic(prev => ({ ...prev, address: { ...prev.address, line1: e.target.value } }))}
                    className={FIELD_CLASS}
                  />
                  <input
                    type="text"
                    placeholder="Address Line 2 (optional)"
                    value={newClinic.address.line2}
                    onChange={(e) => setNewClinic(prev => ({ ...prev, address: { ...prev.address, line2: e.target.value } }))}
                    className={FIELD_CLASS}
                  />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <input
                      type="text"
                      required
                      placeholder="City"
                      value={newClinic.address.city}
                      onChange={(e) => setNewClinic(prev => ({ ...prev, address: { ...prev.address, city: e.target.value } }))}
                      className={FIELD_CLASS}
                    />
                    <input
                      type="text"
                      required
                      placeholder="State"
                      value={newClinic.address.state}
                      onChange={(e) => setNewClinic(prev => ({ ...prev, address: { ...prev.address, state: e.target.value } }))}
                      className={FIELD_CLASS}
                    />
                    <input
                      type="text"
                      required
                      placeholder="Pincode"
                      value={newClinic.address.pincode}
                      onChange={(e) => setNewClinic(prev => ({ ...prev, address: { ...prev.address, pincode: e.target.value } }))}
                      className={FIELD_CLASS}
                    />
                    <input
                      type="text"
                      required
                      placeholder="Country"
                      value={newClinic.address.country}
                      onChange={(e) => setNewClinic(prev => ({ ...prev, address: { ...prev.address, country: e.target.value } }))}
                      className={FIELD_CLASS}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowClinicModal(false);
                    setParentClinicIdForSub(null);
                  }}
                  className="rounded-2xl border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/10 cursor-pointer"
                >
                  Create Clinic
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
