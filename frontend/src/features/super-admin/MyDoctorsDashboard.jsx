import { useEffect, useState } from 'react';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import PageHeader from '../../components/layout/PageHeader';
import { adminApi, clinicApi, specializationApi, doctorApi, userApi } from '../../lib/api';

const FIELD_CLASS =
  'w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-black';

const MyDoctorsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Dashboard state
  const [doctors, setDoctors] = useState([]);
  const [pendingDoctors, setPendingDoctors] = useState([]);
  const [categories, setCategories] = useState({});
  const [bestDoctor, setBestDoctor] = useState(null);
  const [clinics, setClinics] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [activeSpecialization, setActiveSpecialization] = useState(null);

  // Modals / forms
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [modalMode, setModalMode] = useState(''); // 'approve', 'view', 're_edit', 'edit_slots'
  const [targetClinicId, setTargetClinicId] = useState('');
  const [reEditComments, setReEditComments] = useState('');
  const [reEditFields, setReEditFields] = useState({
    specialization: false,
    qualification: false,
    medicalRegistrationNumber: false,
    documentPdf: false,
    image: false
  });
  const [approvalAvailability, setApprovalAvailability] = useState(
    ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => ({
      dayOfWeek: day,
      isAvailable: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(day),
      startTime: '09:00',
      endTime: '17:00',
      slotDurationMinutes: 30
    }))
  );

  // New specialization form
  const [newSpecName, setNewSpecName] = useState('');
  const [newSpecDesc, setNewSpecDesc] = useState('');
  const [modalError, setModalError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [dashRes, clinicsRes, specsRes] = await Promise.all([
        adminApi.getMyDoctorsDashboard(),
        clinicApi.list(),
        specializationApi.list()
      ]);

      setDoctors(dashRes.data?.doctors || []);
      setPendingDoctors(dashRes.data?.pendingDoctors || []);
      setCategories(dashRes.data?.categories || {});
      setBestDoctor(dashRes.data?.bestDoctor || null);
      setClinics(clinicsRes.data?.clinics || []);
      setSpecializations(specsRes.data?.specializations || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load My Doctors dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSpecialization = async (e) => {
    e.preventDefault();
    if (!newSpecName.trim()) return;
    try {
      await specializationApi.create({
        name: newSpecName.trim(),
        description: newSpecDesc.trim()
      });
      setNewSpecName('');
      setNewSpecDesc('');
      setMessage('Specialization created successfully!');
      // Reload specializations
      const specsRes = await specializationApi.list();
      setSpecializations(specsRes.data?.specializations || []);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create specialization.');
    }
  };

  const handleDeleteSpecialization = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this specialization?')) return;
    try {
      await specializationApi.remove(id);
      setMessage('Specialization deactivated successfully.');
      const specsRes = await specializationApi.list();
      setSpecializations(specsRes.data?.specializations || []);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete specialization.');
    }
  };

  const handleApprove = async (e) => {
    e.preventDefault();
    setModalError('');
    if (!targetClinicId) {
      setModalError('Please select a clinic to appoint this doctor.');
      return;
    }

    const activeSlots = approvalAvailability.filter((a) => a.isAvailable);
    if (activeSlots.length === 0) {
      setModalError('Please configure at least one weekly slot as available.');
      return;
    }

    try {
      await adminApi.approveDoctor(selectedDoctor._id, {
        clinicId: targetClinicId,
        specialization: selectedDoctor.profile?.specialization,
        qualification: selectedDoctor.profile?.qualification,
        experienceYears: selectedDoctor.profile?.experienceYears,
        consultationFee: selectedDoctor.profile?.consultationFee,
        availability: approvalAvailability
      });

      setMessage(`Doctor ${selectedDoctor.name || selectedDoctor.fullName} approved successfully.`);
      setSelectedDoctor(null);
      setModalMode('');
      loadData();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to approve doctor.');
    }
  };

  const handleSlotChange = (day, field, val) => {
    setApprovalAvailability((prev) =>
      prev.map((item) =>
        item.dayOfWeek === day
          ? {
              ...item,
              [field]: field === 'isAvailable' ? val : field === 'slotDurationMinutes' ? Number(val) : val
            }
          : item
      )
    );
  };

  const handleEditSlotsClick = () => {
    const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const currentAvailability = selectedDoctor.availability || selectedDoctor.profile?.availability || [];
    
    const mapped = DAYS.map((day) => {
      const match = currentAvailability.find((item) => item.dayOfWeek === day);
      return {
        dayOfWeek: day,
        isAvailable: match ? match.isAvailable : false,
        startTime: match ? match.startTime : '09:00',
        endTime: match ? match.endTime : '17:00',
        slotDurationMinutes: match ? match.slotDurationMinutes : 30
      };
    });
    setApprovalAvailability(mapped);
    setModalMode('edit_slots');
  };

  const handleUpdateApprovedSlots = async (e) => {
    e.preventDefault();
    setModalError('');
    const activeSlots = approvalAvailability.filter((a) => a.isAvailable);
    if (activeSlots.length === 0) {
      setModalError('Please configure at least one weekly slot as available.');
      return;
    }

    try {
      await doctorApi.updateAvailability(selectedDoctor._id, {
        availability: approvalAvailability
      });
      setMessage(`Weekly practice slots updated for Doctor ${selectedDoctor.fullName || selectedDoctor.name}.`);
      setSelectedDoctor(null);
      setModalMode('');
      loadData();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to update availability slots.');
    }
  };

  const handleReject = async (userId) => {
    if (!window.confirm("Are you sure you want to reject this doctor's application? This disables login access.")) return;
    try {
      await adminApi.rejectDoctor(userId);
      setMessage('Doctor application rejected/cancelled.');
      setSelectedDoctor(null);
      setModalMode('');
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject doctor.');
    }
  };

  const handleSendReEdit = async (e) => {
    e.preventDefault();
    setModalError('');
    if (!reEditComments.trim()) {
      setModalError('Please provide explanation comments for the re-edit request.');
      return;
    }

    const flaggedFields = {};
    Object.keys(reEditFields).forEach((key) => {
      if (reEditFields[key]) {
        flaggedFields[key] = true;
      }
    });

    if (Object.keys(flaggedFields).length === 0) {
      setModalError('Please select at least one section of the profile to mark for re-editing.');
      return;
    }

    try {
      await adminApi.requestReEdit(selectedDoctor._id, {
        reEditFields: flaggedFields,
        reEditComments: reEditComments.trim()
      });

      setMessage(`Doctor ${selectedDoctor.name} profile requested for re-edit.`);
      setSelectedDoctor(null);
      setModalMode('');
      loadData();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to request re-edit.');
    }
  };

  const downloadDocument = (doc) => {
    const docPdf = doc.profile?.documentPdf || doc.documentPdf;
    if (!docPdf) return;
    const docName = doc.name || doc.fullName || 'Doctor';
    const link = document.createElement('a');
    link.href = docPdf;
    link.download = `License_${docName.replace(/\s+/g, '_')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleToggleActive = async (doctor) => {
    const userId = doctor.userId?._id || doctor.userId;
    if (!userId) {
      alert('Error: Associated user ID not found.');
      return;
    }
    const nextActive = !doctor.isActive;
    const confirmMsg = nextActive
      ? `Are you sure you want to activate Doctor ${doctor.fullName}?`
      : `Are you sure you want to suspend Doctor ${doctor.fullName}? This will block their login access.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await userApi.updateStatus(userId, { isActive: nextActive });
      setMessage(`Doctor ${doctor.fullName} status updated successfully.`);
      setSelectedDoctor(null);
      setModalMode('');
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update doctor status.');
    }
  };

  const handleCancelAppointment = async (doctor) => {
    const userId = doctor.userId?._id || doctor.userId;
    if (!userId) {
      alert('Error: Associated user ID not found.');
      return;
    }
    if (!window.confirm(`Are you sure you want to cancel the appointment/verification of Doctor ${doctor.fullName}?`)) return;

    try {
      await adminApi.rejectDoctor(userId);
      setMessage(`Doctor ${doctor.fullName} appointment/verification cancelled.`);
      setSelectedDoctor(null);
      setModalMode('');
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel appointment.');
    }
  };

  if (loading) {
    return <LoadingState label="Loading My Doctors Dashboard..." />;
  }

  if (error) {
    return <ErrorState title="Dashboard Offline" description={error} />;
  }

  return (
    <div className="grid gap-8 p-1">
      <PageHeader
        eyebrow="Super Admin Panel"
        title="My Doctors"
        description="Monitor clinics directory, category counts, perform doctor verification, and manage allowed specializations."
      />

      {message && (
        <p className="rounded-2xl bg-emerald-50 px-4 py-3.5 text-sm text-emerald-700 font-semibold border border-emerald-100 transition">
          {message}
        </p>
      )}

      {/* Grid Stats Rows */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Metric Cards Column */}
        <div className="grid grid-cols-2 gap-4 lg:col-span-1">
          <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-3xl p-6 text-white shadow-lg flex flex-col justify-between">
            <span className="text-xs uppercase font-bold tracking-widest opacity-80">Total Doctors</span>
            <div className="mt-4">
              <h3 className="text-4xl font-black">{doctors.length}</h3>
              <p className="text-[10px] opacity-90 mt-1">Active across all clinics</p>
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <span className="text-xs uppercase font-bold text-stone-400 tracking-widest">Pending Review</span>
            <div className="mt-4">
              <h3 className="text-4xl font-black text-stone-900">{pendingDoctors.length}</h3>
              <p className="text-[10px] text-stone-500 mt-1">Awaiting verification</p>
            </div>
          </div>
        </div>

        {/* Best Performing Doctor Card */}
        <div className="bg-gradient-to-br from-indigo-950 to-stone-900 text-white rounded-3xl p-6 lg:col-span-2 shadow-xl border border-white/5 relative overflow-hidden flex flex-col justify-between md:flex-row md:items-center">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="space-y-4 md:max-w-md">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                👑 Best Performing Doctor
              </span>
            </div>
            {bestDoctor ? (
              <div>
                <h4 className="text-2xl font-black tracking-tight">{bestDoctor.fullName}</h4>
                <p className="text-sm text-stone-400 mt-1">
                  {bestDoctor.specialization} &bull; {bestDoctor.clinicId?.name || 'AI-CMS Clinic'}
                </p>
                <div className="flex gap-6 mt-4">
                  <div>
                    <span className="text-[10px] text-stone-400 uppercase font-bold tracking-widest block">Consultation Fee</span>
                    <strong className="text-sm">₹ {bestDoctor.consultationFee}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 uppercase font-bold tracking-widest block">Total Revenue</span>
                    <strong className="text-sm text-emerald-400">₹ {bestDoctor.totalRevenue}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-stone-400 text-sm">No billing/consultation revenue data recorded yet.</p>
            )}
          </div>
          {bestDoctor?.image && (
            <img
              src={bestDoctor.image}
              alt="Best doctor"
              className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover border-2 border-indigo-500/50 shadow-lg mt-4 md:mt-0"
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Specialization Admin Section */}
        <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm xl:col-span-1 space-y-6">
          <div>
            <h3 className="text-lg font-black text-stone-900">Hospital Specialties</h3>
            <p className="text-xs text-stone-500 mt-1">Manage allowed specialties. Only these options will be selectable during onboarding.</p>
          </div>

          <form onSubmit={handleCreateSpecialization} className="space-y-3">
            <input
              type="text"
              placeholder="Specialization Name (e.g. Cardiology)"
              required
              value={newSpecName}
              onChange={(e) => setNewSpecName(e.target.value)}
              className={FIELD_CLASS}
            />
            <input
              type="text"
              placeholder="Brief Description"
              value={newSpecDesc}
              onChange={(e) => setNewSpecDesc(e.target.value)}
              className={FIELD_CLASS}
            />
            <button
              type="submit"
              className="w-full rounded-2xl bg-indigo-600 py-3 text-xs font-bold text-white hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/15 cursor-pointer"
            >
              Add Specialization
            </button>
          </form>

          <div className="border-t border-stone-100 pt-4">
            <h4 className="text-xs uppercase font-bold text-stone-400 tracking-widest mb-3">Current List</h4>
            <div className="grid gap-2 max-h-60 overflow-y-auto pr-1">
              {specializations.map((spec) => (
                <div key={spec._id} className="flex justify-between items-center p-3 rounded-xl bg-stone-50 border border-stone-200/60 hover:bg-stone-100/30 transition">
                  <div>
                    <strong className="text-xs text-stone-800">{spec.name}</strong>
                    {spec.description && <p className="text-[10px] text-stone-500 mt-0.5">{spec.description}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteSpecialization(spec._id)}
                    className="text-stone-400 hover:text-rose-600 text-xs font-bold px-2 py-1 cursor-pointer"
                    title="Deactivate Specialization"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Categories Distribution & Pending Approvals */}
        <div className="xl:col-span-2 space-y-8">
          {/* Pending Reviews Queue */}
          <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm">
            <h3 className="text-lg font-black text-stone-900 mb-4">Verification & Approval Queue</h3>
            {pendingDoctors.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-stone-500 text-sm">All registrations are fully processed. No pending profiles.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider border-b border-stone-200">
                    <tr>
                      <th className="px-4 py-3">Doctor Name</th>
                      <th className="px-4 py-3">Specialization</th>
                      <th className="px-4 py-3">Current Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingDoctors.map((doc) => (
                      <tr key={doc._id} className="border-t border-stone-100 hover:bg-stone-50/50 transition-colors">
                        <td className="px-4 py-4 font-bold text-stone-900">{doc.name}</td>
                        <td className="px-4 py-4 text-stone-600">{doc.profile?.specialization || 'Not specified'}</td>
                        <td className="px-4 py-4">
                          {doc.approvalStatus === 're_edit' ? (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Re-edit Requested
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              Pending Review
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDoctor(doc);
                              setModalMode('approve');
                              setTargetClinicId(clinics[0]?._id || '');
                            }}
                            className="rounded-xl bg-emerald-600 px-3.5 py-2 text-[10px] font-bold text-white hover:bg-emerald-700 shadow-sm cursor-pointer"
                          >
                            Verify & Action
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Specialization Counts Summary */}
          <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm">
            <h3 className="text-lg font-black text-stone-900 mb-2">Doctor Specialties Breakdown</h3>
            <p className="text-xs text-stone-500 mb-4">Click any category below to view its appointed doctors and best performer.</p>
            {Object.keys(categories).length === 0 ? (
              <p className="text-stone-500 text-sm">No approved doctors categorized yet.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {Object.entries(categories).map(([cat, count]) => {
                  const isActive = activeSpecialization === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveSpecialization(isActive ? null : cat)}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-semibold transition cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 border-indigo-700 text-white shadow-md shadow-indigo-600/10'
                          : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100/50'
                      }`}
                    >
                      <span>{cat}</span>
                      <strong className={`rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black ${
                        isActive ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-850'
                      }`}>
                        {count}
                      </strong>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Specialization Doctor Details List */}
          {activeSpecialization && (
            <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm animate-fadeIn">
              <div className="flex justify-between items-center border-b border-stone-100 pb-4 mb-5">
                <div>
                  <h3 className="text-lg font-black text-stone-900">Category: {activeSpecialization}</h3>
                  <p className="text-xs text-stone-500 mt-1">Viewing all approved doctors specialized in this category.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSpecialization(null)}
                  className="text-stone-400 hover:text-stone-600 text-xs font-bold px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-50 cursor-pointer"
                >
                  Clear Selection
                </button>
              </div>

              {(() => {
                const docsInSpec = doctors.filter((doc) => doc.specialization === activeSpecialization);
                let bestDocInSpec = null;
                if (docsInSpec.length > 0) {
                  bestDocInSpec = [...docsInSpec].sort((a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0))[0];
                }

                if (docsInSpec.length === 0) {
                  return <p className="text-stone-500 text-xs italic">No approved doctors are assigned to this specialty currently.</p>;
                }

                return (
                  <div className="space-y-6">
                    {bestDocInSpec && bestDocInSpec.totalRevenue > 0 && (
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 flex items-center justify-between">
                        <div>
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 mb-2">
                            🏆 Top Performer in {activeSpecialization}
                          </span>
                          <h4 className="font-extrabold text-stone-900 text-sm">{bestDocInSpec.fullName}</h4>
                          <p className="text-xs text-stone-500 mt-0.5">{bestDocInSpec.clinicId?.name || 'AI-CMS Clinic'}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-stone-400 block uppercase font-bold tracking-widest">Revenue</span>
                          <strong className="text-emerald-700 text-base font-black font-mono">₹ {bestDocInSpec.totalRevenue.toLocaleString('en-IN')}</strong>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {docsInSpec.map((doc) => (
                        <div key={doc._id} className="p-4 rounded-2xl border border-stone-200 bg-stone-50 flex items-center justify-between hover:bg-white hover:shadow-md transition duration-200">
                          <div className="flex items-center gap-3">
                            {doc.image ? (
                              <img src={doc.image} alt={doc.fullName} className="w-10 h-10 rounded-full object-cover border border-stone-200" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center text-xs font-bold text-stone-400">MD</div>
                            )}
                            <div>
                              <h5 className="font-bold text-stone-900 text-xs">{doc.fullName}</h5>
                              <p className="text-[10px] text-stone-500 mt-0.5">{doc.clinicId?.name || 'N/A'}</p>
                              <span className="text-[10px] text-stone-500 font-semibold mt-1 block">
                                Revenue: <strong className="text-emerald-600">₹ {(doc.totalRevenue || 0).toLocaleString('en-IN')}</strong>
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDoctor(doc);
                              setModalMode('view');
                            }}
                            className="rounded-xl border border-stone-300 px-3 py-1.5 text-[9px] font-bold text-stone-700 hover:bg-stone-50 cursor-pointer"
                          >
                            View Profile
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Directory Grid */}
      <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm mt-4">
        <h3 className="text-lg font-black text-stone-900 mb-4">Doctor Directory (Approved)</h3>
        {doctors.length === 0 ? (
          <p className="text-stone-500 text-sm py-4">No active doctors appointed in clinics directory.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {doctors.map((doc) => (
              <div
                key={doc._id}
                className="p-4 rounded-2xl border border-stone-200 bg-stone-50 hover:bg-white hover:shadow-lg hover:border-indigo-200 transition-all duration-300 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {doc.image ? (
                    <img src={doc.image} alt={doc.fullName} className="w-12 h-12 rounded-full object-cover border border-stone-200" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-stone-200 flex items-center justify-center text-xs font-bold text-stone-400">MD</div>
                  )}
                  <div>
                    <h4 className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
                      {doc.fullName}
                      {!doc.isActive && (
                        <span className="inline-block px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                          Suspended
                        </span>
                      )}
                    </h4>
                    <p className="text-[10px] text-stone-500 mt-0.5">{doc.specialization} &bull; {doc.clinicId?.name || 'N/A'}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDoctor(doc);
                    setModalMode('view');
                  }}
                  className="rounded-xl border border-stone-300 px-3 py-1.5 text-[10px] font-bold text-stone-700 hover:bg-stone-50 cursor-pointer"
                >
                  View Details
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action / Detail modals */}
      {selectedDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[95vh] grid gap-6">
            <div className="flex justify-between items-start border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-2xl font-black text-stone-900">
                  {modalMode === 'view' ? 'Doctor Profile Overview' : 'Review Registration Request'}
                </h3>
                <p className="text-xs text-stone-500 mt-1">Logged Email: {selectedDoctor.email || selectedDoctor.profile?.email}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedDoctor(null);
                  setModalMode('');
                }}
                className="text-stone-400 hover:text-stone-600 text-2xl font-semibold cursor-pointer"
              >
                &times;
              </button>
            </div>

            {modalError && <p className="p-3 rounded-2xl bg-rose-50 text-rose-700 text-sm font-semibold">{modalError}</p>}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Photo Card */}
              <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-stone-50 border border-stone-200">
                {selectedDoctor.profile?.image || selectedDoctor.image ? (
                  <img
                    src={selectedDoctor.profile?.image || selectedDoctor.image}
                    alt={selectedDoctor.name || selectedDoctor.fullName}
                    className="w-24 h-24 rounded-full object-cover border-2 border-indigo-500 mb-4"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-stone-200 text-stone-400 flex items-center justify-center font-bold text-lg mb-4">No Photo</div>
                )}
                <h4 className="font-bold text-stone-900 text-base">{selectedDoctor.name || selectedDoctor.fullName}</h4>
                <p className="text-xs text-stone-500 mt-1">Phone: {selectedDoctor.phone || selectedDoctor.profile?.phone || 'N/A'}</p>

                {(selectedDoctor.profile?.documentPdf || selectedDoctor.documentPdf) ? (
                  <button
                    type="button"
                    onClick={() => downloadDocument(selectedDoctor)}
                    className="mt-6 w-full rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 py-2.5 text-xs font-bold hover:bg-indigo-100 transition cursor-pointer"
                  >
                    Download Verification PDF
                  </button>
                ) : (
                  <p className="text-xs text-rose-500 mt-6 font-semibold">No verification document uploaded.</p>
                )}
              </div>

              {/* Data Card */}
              <div className="md:col-span-2 space-y-5">
                {modalMode === 're_edit' ? (
                  <form onSubmit={handleSendReEdit} className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                      <strong className="text-xs text-amber-900 block mb-2">Mark profile sections to re-edit:</strong>
                      <div className="grid grid-cols-2 gap-2 text-xs text-amber-900">
                        {Object.keys(reEditFields).map((field) => (
                          <label key={field} className="flex items-center gap-2 cursor-pointer py-1">
                            <input
                              type="checkbox"
                              checked={reEditFields[field]}
                              onChange={(e) => setReEditFields({ ...reEditFields, [field]: e.target.checked })}
                              className="w-4 h-4 accent-amber-700 cursor-pointer"
                            />
                            <span className="capitalize">{field.replace(/([A-Z])/g, ' $1')}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-500 mb-1">Feedback Comments & Instructions</label>
                      <textarea
                        required
                        placeholder="Explain what needs to be changed..."
                        rows={3}
                        value={reEditComments}
                        onChange={(e) => setReEditComments(e.target.value)}
                        className={`${FIELD_CLASS} resize-none`}
                      />
                    </div>

                    <div className="flex justify-end gap-3 border-t border-stone-100 pt-4">
                      <button
                        type="button"
                        onClick={() => setModalMode('approve')}
                        className="rounded-2xl border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        className="rounded-2xl bg-amber-600 px-6 py-3 text-sm font-bold text-white hover:bg-amber-700 shadow-md shadow-amber-600/10 cursor-pointer"
                      >
                        Request Re-edit
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-stone-50 p-3 rounded-xl">
                        <span className="text-stone-400 font-medium block">Specialization</span>
                        <strong className="text-stone-800 text-sm">
                          {selectedDoctor.profile?.specialization || selectedDoctor.specialization || 'N/A'}
                        </strong>
                      </div>
                      <div className="bg-stone-50 p-3 rounded-xl">
                        <span className="text-stone-400 font-medium block">Qualification</span>
                        <strong className="text-stone-800 text-sm">
                          {selectedDoctor.profile?.qualification || selectedDoctor.qualification || 'N/A'}
                        </strong>
                      </div>
                      <div className="bg-stone-50 p-3 rounded-xl">
                        <span className="text-stone-400 font-medium block">Registration Code</span>
                        <strong className="text-stone-800 text-sm">
                          {selectedDoctor.profile?.medicalRegistrationNumber || selectedDoctor.medicalRegistrationNumber || 'N/A'}
                        </strong>
                      </div>
                      <div className="bg-stone-50 p-3 rounded-xl">
                        <span className="text-stone-400 font-medium block">Experience</span>
                        <strong className="text-stone-800 text-sm">
                          {selectedDoctor.profile?.experienceYears ?? selectedDoctor.experienceYears} Years
                        </strong>
                      </div>
                      <div className="bg-stone-50 p-3 rounded-xl">
                        <span className="text-stone-400 font-medium block">Consultation Fee</span>
                        <strong className="text-stone-800 text-sm">
                          ₹ {selectedDoctor.profile?.consultationFee ?? selectedDoctor.consultationFee}
                        </strong>
                      </div>
                      <div className="bg-stone-50 p-3 rounded-xl">
                        <span className="text-stone-400 font-medium block">Follow-up Fee</span>
                        <strong className="text-stone-800 text-sm">
                          ₹ {selectedDoctor.profile?.followUpFee ?? selectedDoctor.followUpFee}
                        </strong>
                      </div>
                    </div>

                    {modalMode === 'approve' && (
                      <form onSubmit={handleApprove} className="border-t border-stone-100 pt-4 space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-stone-500 mb-1">Select Clinic & Appoint Branch</label>
                          <select
                            required
                            value={targetClinicId}
                            onChange={(e) => setTargetClinicId(e.target.value)}
                            className={FIELD_CLASS}
                          >
                            <option value="" disabled>Choose clinic context...</option>
                            {clinics.map((c) => (
                              <option key={c._id} value={c._id}>
                                {c.name} {c.parentClinicId ? `(Branch - ${c.code})` : `(Group - ${c.code})`}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Compulsory Weekly Slots Builder */}
                        <div className="space-y-3 mt-4 border-t border-stone-100 pt-4">
                          <span className="text-xs font-bold text-stone-500 block mb-2">Configure Weekly Practice Slots (Compulsory)</span>
                          <div className="grid gap-2 max-h-60 overflow-y-auto pr-1">
                            {approvalAvailability.map((slot) => (
                              <div key={slot.dayOfWeek} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs">
                                <label className="flex items-center gap-2 cursor-pointer capitalize font-bold text-stone-800">
                                  <input
                                    type="checkbox"
                                    checked={slot.isAvailable}
                                    onChange={(e) => handleSlotChange(slot.dayOfWeek, 'isAvailable', e.target.checked)}
                                    className="w-4 h-4 accent-emerald-600 cursor-pointer"
                                  />
                                  {slot.dayOfWeek}
                                </label>

                                {slot.isAvailable ? (
                                  <>
                                    <div className="flex items-center gap-1">
                                      <span>Start:</span>
                                      <input
                                        type="time"
                                        value={slot.startTime}
                                        onChange={(e) => handleSlotChange(slot.dayOfWeek, 'startTime', e.target.value)}
                                        className="rounded-lg border border-stone-300 p-1 text-[11px] outline-none focus:border-emerald-500 text-black"
                                      />
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span>End:</span>
                                      <input
                                        type="time"
                                        value={slot.endTime}
                                        onChange={(e) => handleSlotChange(slot.dayOfWeek, 'endTime', e.target.value)}
                                        className="rounded-lg border border-stone-300 p-1 text-[11px] outline-none focus:border-emerald-500 text-black"
                                      />
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span>Min:</span>
                                      <input
                                        type="number"
                                        min="5"
                                        step="5"
                                        value={slot.slotDurationMinutes}
                                        onChange={(e) => handleSlotChange(slot.dayOfWeek, 'slotDurationMinutes', e.target.value)}
                                        className="w-14 rounded-lg border border-stone-300 p-1 text-[11px] text-black outline-none focus:border-emerald-500 text-center"
                                      />
                                    </div>
                                  </>
                                ) : (
                                  <span className="col-span-3 text-right text-stone-400 italic font-medium pr-2">Day Offline</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-2 gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleReject(selectedDoctor._id)}
                            className="rounded-2xl border border-rose-300 text-rose-600 px-4 py-2.5 text-xs font-bold hover:bg-rose-50 transition cursor-pointer"
                          >
                            Reject Application
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => {
                              setModalMode('re_edit');
                              setReEditComments('');
                              setReEditFields({
                                specialization: false,
                                qualification: false,
                                medicalRegistrationNumber: false,
                                documentPdf: false,
                                image: false
                              });
                            }}
                            className="rounded-2xl border border-amber-400 text-amber-700 px-4 py-2.5 text-xs font-bold hover:bg-amber-50 transition cursor-pointer"
                          >
                            Request Re-edit
                          </button>

                          <button
                            type="submit"
                            className="rounded-2xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/10 cursor-pointer"
                          >
                            Approve & Appoint
                          </button>
                        </div>
                      </form>
                    )}

                    {modalMode === 'view' && (
                      <div className="flex justify-between items-center pt-4 border-t border-stone-100 gap-2 flex-wrap">
                        <div className="flex gap-2 flex-wrap">
                          {selectedDoctor.approvalStatus === 'approved' && (
                            <>
                              <button
                                type="button"
                                onClick={handleEditSlotsClick}
                                className="rounded-2xl border border-indigo-350 text-indigo-750 px-4 py-2.5 text-xs font-bold hover:bg-indigo-50 transition cursor-pointer"
                              >
                                Edit Availability Slots
                              </button>
                              
                              <button
                                type="button"
                                onClick={() => handleToggleActive(selectedDoctor)}
                                className={`rounded-2xl border px-4 py-2.5 text-xs font-bold transition cursor-pointer ${
                                  selectedDoctor.isActive
                                    ? 'border-rose-300 text-rose-600 hover:bg-rose-50'
                                    : 'border-emerald-300 text-emerald-600 hover:bg-emerald-50'
                                }`}
                              >
                                {selectedDoctor.isActive ? 'Suspend Doctor' : 'Activate Doctor'}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleCancelAppointment(selectedDoctor)}
                                className="rounded-2xl border border-amber-300 text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                              >
                                Cancel Appointment
                              </button>
                            </>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDoctor(null);
                            setModalMode('');
                          }}
                          className="rounded-2xl bg-stone-850 text-white px-6 py-2.5 text-xs font-bold hover:bg-stone-900 cursor-pointer"
                        >
                          Done
                        </button>
                      </div>
                    )}

                    {modalMode === 'edit_slots' && (
                      <form onSubmit={handleUpdateApprovedSlots} className="border-t border-stone-100 pt-4 space-y-4">
                        {/* Slots builder */}
                        <div className="space-y-3 mt-4">
                          <span className="text-xs font-bold text-stone-500 block mb-2">Configure Practice Slots</span>
                          <div className="grid gap-2 max-h-60 overflow-y-auto pr-1">
                            {approvalAvailability.map((slot) => (
                              <div key={slot.dayOfWeek} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs">
                                <label className="flex items-center gap-2 cursor-pointer capitalize font-bold text-stone-800">
                                  <input
                                    type="checkbox"
                                    checked={slot.isAvailable}
                                    onChange={(e) => handleSlotChange(slot.dayOfWeek, 'isAvailable', e.target.checked)}
                                    className="w-4 h-4 accent-indigo-600 cursor-pointer"
                                  />
                                  {slot.dayOfWeek}
                                </label>

                                {slot.isAvailable ? (
                                  <>
                                    <div className="flex items-center gap-1">
                                      <span>Start:</span>
                                      <input
                                        type="time"
                                        value={slot.startTime}
                                        onChange={(e) => handleSlotChange(slot.dayOfWeek, 'startTime', e.target.value)}
                                        className="rounded-lg border border-stone-300 p-1 text-[11px] outline-none focus:border-indigo-500"
                                      />
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span>End:</span>
                                      <input
                                        type="time"
                                        value={slot.endTime}
                                        onChange={(e) => handleSlotChange(slot.dayOfWeek, 'endTime', e.target.value)}
                                        className="rounded-lg border border-stone-300 p-1 text-[11px] outline-none focus:border-indigo-500"
                                      />
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span>Min:</span>
                                      <input
                                        type="number"
                                        min="5"
                                        step="5"
                                        value={slot.slotDurationMinutes}
                                        onChange={(e) => handleSlotChange(slot.dayOfWeek, 'slotDurationMinutes', e.target.value)}
                                        className="w-14 rounded-lg border border-stone-300 p-1 text-[11px] outline-none focus:border-indigo-500 text-center"
                                      />
                                    </div>
                                  </>
                                ) : (
                                  <span className="col-span-3 text-right text-stone-400 italic font-medium pr-2">Day Offline</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-2 gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setModalMode('view')}
                            className="rounded-2xl border border-stone-300 px-5 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-50 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="rounded-2xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/10 cursor-pointer"
                          >
                            Save Slots
                          </button>
                        </div>
                      </form>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Document Preview Section */}
            {(selectedDoctor.profile?.documentPdf || selectedDoctor.documentPdf) && (
              <div className="border-t border-stone-100 pt-4">
                <span className="text-xs font-bold text-stone-400 block mb-2">Verification Document Preview</span>
                {(() => {
                  const docData = selectedDoctor.profile?.documentPdf || selectedDoctor.documentPdf;
                  if (docData.startsWith('data:application/pdf')) {
                    return (
                      <iframe
                        src={docData}
                        title="Document PDF Preview"
                        className="w-full h-96 rounded-2xl border border-stone-200"
                      />
                    );
                  } else if (docData.startsWith('data:image')) {
                    return (
                      <img
                        src={docData}
                        alt="Registration Document"
                        className="w-full max-h-96 object-contain rounded-2xl border border-stone-200"
                      />
                    );
                  } else {
                    return (
                      <div className="bg-stone-50 p-4 rounded-2xl text-center text-xs text-stone-500 border border-stone-200">
                        Binary document (non-standard format). Please use the download button to view.
                      </div>
                    );
                  }
                })()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MyDoctorsDashboard;
