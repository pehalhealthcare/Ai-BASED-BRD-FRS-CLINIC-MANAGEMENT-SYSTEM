import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import PageHeader from '../../components/layout/PageHeader';
import { adminApi, clinicApi, specializationApi, doctorApi, userApi } from '../../lib/api';

const FIELD_CLASS =
  'w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-black';

const MyDoctorsDashboard = () => {
  const navigate = useNavigate();
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
      id: `${day}-${Math.random()}`,
      dayOfWeek: day,
      isAvailable: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(day),
      startTime: '09:00',
      endTime: '17:00',
      slotDurationMinutes: 30,
      clinicId: '',
      consultationMode: 'offline'
    }))
  );
  const [editConsultationFee, setEditConsultationFee] = useState(0);
  const [editFollowUpFee, setEditFollowUpFee] = useState(0);
  const [editPrimaryClinicId, setEditPrimaryClinicId] = useState('');
  const [editAssignedClinics, setEditAssignedClinics] = useState([]);

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

  // Sync targetClinicId in approve flow
  useEffect(() => {
    if (modalMode === 'approve' && targetClinicId) {
      setApprovalAvailability((prev) =>
        prev.map((slot) => ({
          ...slot,
          clinicId: targetClinicId
        }))
      );
    }
  }, [targetClinicId, modalMode]);

  const getClinicDistance = (targetId) => {
    const primaryId = editPrimaryClinicId || selectedDoctor?.clinicId?._id || selectedDoctor?.clinicId;
    if (!primaryId || !targetId) return null;
    if (String(primaryId) === String(targetId)) return 0;

    const c1 = clinics.find((c) => String(c._id) === String(primaryId));
    const c2 = clinics.find((c) => String(c._id) === String(targetId));
    if (!c1 || !c2) return null;

    const lat1 = c1.address?.latitude || 0;
    const lon1 = c1.address?.longitude || 0;
    const lat2 = c2.address?.latitude || 0;
    const lon2 = c2.address?.longitude || 0;

    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleSlotChange = (id, field, val) => {
    setApprovalAvailability((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = {
          ...item,
          [field]: field === 'isAvailable' ? val : field === 'slotDurationMinutes' ? Number(val) : val
        };

        if (field === 'clinicId') {
          const distance = getClinicDistance(val);
          if (distance !== null && distance > 15) {
            updated.consultationMode = 'online';
          }
        }
        return updated;
      })
    );
  };

  const handleEditSlotsClick = () => {
    const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const currentAvailability = selectedDoctor.availability || selectedDoctor.profile?.availability || [];
    
    // Set primary and assigned clinics state
    const primaryId = selectedDoctor.clinicId?._id || selectedDoctor.clinicId || '';
    setEditPrimaryClinicId(primaryId);
    
    const assigned = selectedDoctor.assignedClinics || [];
    const assignedIds = assigned.map((c) => c._id || c);
    // Ensure primary clinic is in assigned clinics
    if (primaryId && !assignedIds.includes(primaryId)) {
      assignedIds.push(primaryId);
    }
    setEditAssignedClinics(assignedIds);

    let mapped = [];
    if (currentAvailability.length > 0) {
      mapped = currentAvailability.map((item, idx) => ({
        id: item._id || `${item.dayOfWeek}-${idx}-${Math.random()}`,
        dayOfWeek: item.dayOfWeek,
        isAvailable: item.isAvailable !== false,
        startTime: item.startTime || '09:00',
        endTime: item.endTime || '17:00',
        slotDurationMinutes: item.slotDurationMinutes || 30,
        clinicId: item.clinicId?._id || item.clinicId || primaryId,
        consultationMode: item.consultationMode || 'offline'
      }));
    } else {
      mapped = DAYS.map((day) => ({
        id: `${day}-${Math.random()}`,
        dayOfWeek: day,
        isAvailable: false,
        startTime: '09:00',
        endTime: '17:00',
        slotDurationMinutes: 30,
        clinicId: primaryId,
        consultationMode: 'offline'
      }));
    }

    setApprovalAvailability(mapped);
    setEditConsultationFee(selectedDoctor.consultationFee || selectedDoctor.profile?.consultationFee || 0);
    setEditFollowUpFee(selectedDoctor.followUpFee || selectedDoctor.profile?.followUpFee || 0);
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

    const slotsByDay = activeSlots.reduce((acc, slot) => {
      if (!acc[slot.dayOfWeek]) acc[slot.dayOfWeek] = [];
      acc[slot.dayOfWeek].push(slot);
      return acc;
    }, {});

    // Distance check (> 25 km) on the same day
    for (const day of Object.keys(slotsByDay)) {
      const daySlots = slotsByDay[day];
      if (daySlots.length <= 1) continue;

      for (let i = 0; i < daySlots.length; i++) {
        for (let j = i + 1; j < daySlots.length; j++) {
          const s1 = daySlots[i];
          const s2 = daySlots[j];
          if (s1.clinicId && s2.clinicId && String(s1.clinicId) !== String(s2.clinicId)) {
            const distance = getClinicDistance(s2.clinicId); // this gets distance from s2 to primary
            // However, we want the distance between s1 and s2 directly.
            // Let's compute directly inside the dashboard using coordinates.
            const c1 = clinics.find((c) => String(c._id) === String(s1.clinicId));
            const c2 = clinics.find((c) => String(c._id) === String(s2.clinicId));
            if (c1 && c2) {
              const lat1 = c1.address?.latitude || 0;
              const lon1 = c1.address?.longitude || 0;
              const lat2 = c2.address?.latitude || 0;
              const lon2 = c2.address?.longitude || 0;
              const R = 6371; // km
              const dLat = ((lat2 - lat1) * Math.PI) / 180;
              const dLon = ((lon2 - lon1) * Math.PI) / 180;
              const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos((lat1 * Math.PI) / 180) *
                  Math.cos((lat2 * Math.PI) / 180) *
                  Math.sin(dLon / 2) *
                  Math.sin(dLon / 2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
              const d = R * c;
              if (d > 25) {
                // If s1 is primary, s2 gets switched to online, otherwise s1 gets switched to online.
                const isS1Primary = String(s1.clinicId) === String(editPrimaryClinicId);
                const targetSlotToChange = isS1Primary ? s2 : s1;

                if (targetSlotToChange.consultationMode !== 'online') {
                  setApprovalAvailability((prev) =>
                    prev.map((item) =>
                      item.id === targetSlotToChange.id ? { ...item, consultationMode: 'online' } : item
                    )
                  );
                  const nonPrimaryClinicObj = clinics.find((c) => String(c._id) === String(targetSlotToChange.clinicId));
                  setModalError(`Distance between ${c1.name} and ${c2.name} is ${d.toFixed(1)} km (> 25 km). Consultation mode for ${nonPrimaryClinicObj?.name || 'the other clinic'} has been automatically set to Online.`);
                  // Scroll to top of the modal container
                  const scrollableDiv = document.querySelector('.overflow-y-auto');
                  if (scrollableDiv) {
                    scrollableDiv.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                  return;
                }
              }
            }
          }
        }
      }
    }

    // Gap validation
    for (const day of Object.keys(slotsByDay)) {
      const daySlots = slotsByDay[day];
      if (daySlots.length <= 1) continue;

      daySlots.sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

      for (let i = 0; i < daySlots.length - 1; i++) {
        const currentSlot = daySlots[i];
        const nextSlot = daySlots[i + 1];

        const currentEnd = parseTimeToMinutes(currentSlot.endTime);
        const nextStart = parseTimeToMinutes(nextSlot.startTime);

        if (nextStart - currentEnd < 90) {
          const c1 = clinics.find((c) => String(c._id) === String(currentSlot.clinicId));
          const c2 = clinics.find((c) => String(c._id) === String(nextSlot.clinicId));
          setModalError(`There must be a gap of at least 1 hour 30 minutes between sessions on ${day} (${c1?.name || 'Clinic'} ends at ${currentSlot.endTime}, ${c2?.name || 'Clinic'} starts at ${nextSlot.startTime}).`);
          return;
        }
      }
    }

    try {
      await doctorApi.update(selectedDoctor._id, {
        clinicId: editPrimaryClinicId,
        assignedClinics: editAssignedClinics,
        consultationFee: editConsultationFee,
        followUpFee: editFollowUpFee,
        availability: approvalAvailability
      });
      setMessage(`Weekly practice slots and fees updated for Doctor ${selectedDoctor.fullName || selectedDoctor.name}.`);
      setSelectedDoctor(null);
      setModalMode('');
      loadData();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to update availability slots or fees.');
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
                            onClick={() => navigate(`/admin/doctors/${doc._id}/review`)}
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
          <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">

            {/* ── Hero Banner ── */}
            <div className="relative bg-gradient-to-br from-indigo-900 via-indigo-800 to-violet-900 px-6 pt-8 pb-16 overflow-hidden flex-shrink-0">
              {/* Decorative blobs */}
              <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-indigo-400/10 blur-2xl pointer-events-none" />

              {/* Close button */}
              <button
                onClick={() => { setSelectedDoctor(null); setModalMode(''); }}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-lg font-bold transition cursor-pointer z-10"
              >
                ×
              </button>

              {/* Mode Badge */}
              <div className="mb-4">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                  modalMode === 'view'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  {modalMode === 'view' ? '✅ Approved Profile' : modalMode === 'approve' ? '⏳ Pending Review' : modalMode === 're_edit' ? '✏️ Re-edit Request' : '🕐 Edit Availability'}
                </span>
              </div>

              <h2 className="text-2xl font-black text-white tracking-tight">
                {modalMode === 'view' ? 'Doctor Profile Overview' :
                 modalMode === 'approve' ? 'Review Registration Request' :
                 modalMode === 're_edit' ? 'Request Profile Re-edit' : 'Edit Availability & Fees'}
              </h2>
              <p className="text-indigo-300 text-xs mt-1">
                {selectedDoctor.email || selectedDoctor.profile?.email}
              </p>
            </div>

            {/* ── Avatar Overlap ── */}
            <div className="relative px-6 -mt-10 flex items-end gap-5 flex-shrink-0">
              <div className="relative flex-shrink-0">
                {(selectedDoctor.profile?.image || selectedDoctor.image) ? (
                  <img
                    src={selectedDoctor.profile?.image || selectedDoctor.image}
                    alt={selectedDoctor.name || selectedDoctor.fullName}
                    className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-xl"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 border-4 border-white shadow-xl flex items-center justify-center text-white font-black text-xl">
                    {(selectedDoctor.name || selectedDoctor.fullName || 'D').charAt(0).toUpperCase()}
                  </div>
                )}
                {/* Active status ring */}
                {selectedDoctor.approvalStatus === 'approved' && (
                  <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white ${
                    selectedDoctor.isActive ? 'bg-emerald-500' : 'bg-rose-500'
                  }`} title={selectedDoctor.isActive ? 'Active' : 'Suspended'} />
                )}
              </div>
              <div className="pb-2">
                <h3 className="text-lg font-black text-stone-900 leading-tight">
                  {selectedDoctor.name || selectedDoctor.fullName}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  {selectedDoctor.profile?.specialization || selectedDoctor.specialization || 'Doctor'}
                  {selectedDoctor.phone || selectedDoctor.profile?.phone ? ` · ${selectedDoctor.phone || selectedDoctor.profile?.phone}` : ''}
                </p>
              </div>
            </div>

            {/* ── Scrollable Content ── */}
            <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4 space-y-5">

            {modalError && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-200">
                <span className="text-rose-500 text-lg flex-shrink-0">⚠️</span>
                <p className="text-rose-700 text-sm font-semibold">{modalError}</p>
              </div>
            )}

            {/* ── Re-edit Form ── */}
            {modalMode === 're_edit' ? (
              <form onSubmit={handleSendReEdit} className="space-y-5">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                  <p className="text-xs font-black text-amber-900 uppercase tracking-widest mb-3">Select Sections to Re-edit</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.keys(reEditFields).map((field) => (
                      <label key={field} className={`flex items-center gap-2 cursor-pointer py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                        reEditFields[field]
                          ? 'bg-amber-200/60 border-amber-400 text-amber-900'
                          : 'bg-white border-amber-200 text-amber-700 hover:bg-amber-100/50'
                      }`}>
                        <input
                          type="checkbox"
                          checked={reEditFields[field]}
                          onChange={(e) => setReEditFields({ ...reEditFields, [field]: e.target.checked })}
                          className="w-3.5 h-3.5 accent-amber-700 cursor-pointer"
                        />
                        <span className="capitalize">{field.replace(/([A-Z])/g, ' $1')}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-2">Feedback Comments & Instructions</label>
                  <textarea
                    required
                    placeholder="Explain clearly what needs to be changed or corrected..."
                    rows={4}
                    value={reEditComments}
                    onChange={(e) => setReEditComments(e.target.value)}
                    className={`${FIELD_CLASS} resize-none`}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalMode('approve')}
                    className="rounded-2xl border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer transition"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    className="rounded-2xl bg-amber-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-amber-600 shadow-lg shadow-amber-500/20 cursor-pointer transition"
                  >
                    Send Re-edit Request
                  </button>
                </div>
              </form>
            ) : (
              <>
                {/* ── Info Grid ── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { icon: '🩺', label: 'Specialization', value: selectedDoctor.profile?.specialization || selectedDoctor.specialization || 'N/A', accent: 'indigo' },
                    { icon: '🎓', label: 'Qualification', value: selectedDoctor.profile?.qualification || selectedDoctor.qualification || 'N/A', accent: 'violet' },
                    { icon: '🪪', label: 'Reg. Number', value: selectedDoctor.profile?.medicalRegistrationNumber || selectedDoctor.medicalRegistrationNumber || 'N/A', accent: 'sky' },
                    { icon: '⏳', label: 'Experience', value: `${selectedDoctor.profile?.experienceYears ?? selectedDoctor.experienceYears ?? 0} Years`, accent: 'teal' },
                    { icon: '💊', label: 'Consult Fee', value: `₹ ${selectedDoctor.profile?.consultationFee ?? selectedDoctor.consultationFee ?? 0}`, accent: 'emerald' },
                    { icon: '🔁', label: 'Follow-up Fee', value: `₹ ${selectedDoctor.profile?.followUpFee ?? selectedDoctor.followUpFee ?? 0}`, accent: 'green' },
                  ].map(({ icon, label, value, accent }) => (
                    <div key={label} className={`relative overflow-hidden rounded-2xl border p-4 bg-gradient-to-br ${
                      accent === 'indigo' ? 'from-indigo-50 to-white border-indigo-100' :
                      accent === 'violet' ? 'from-violet-50 to-white border-violet-100' :
                      accent === 'sky'    ? 'from-sky-50 to-white border-sky-100' :
                      accent === 'teal'   ? 'from-teal-50 to-white border-teal-100' :
                      accent === 'emerald'? 'from-emerald-50 to-white border-emerald-100' :
                                           'from-green-50 to-white border-green-100'
                    }`}>
                      <span className="text-lg block mb-1">{icon}</span>
                      <p className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">{label}</p>
                      <p className="text-sm font-black text-stone-900 mt-0.5 truncate" title={value}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* ── Assigned Clinics ── */}
                <div className="rounded-2xl border border-stone-200 p-4 bg-stone-50">
                  <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">🏥 Assigned Practice Clinics</p>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const primaryId = selectedDoctor.clinicId?._id || selectedDoctor.clinicId;
                      const assignedList = selectedDoctor.assignedClinics?.length
                        ? selectedDoctor.assignedClinics
                        : (primaryId ? [primaryId] : []);
                      if (!assignedList.length) return <p className="text-xs text-stone-400 italic">No clinics assigned yet.</p>;
                      return assignedList.map((c) => {
                        const cObj = clinics.find(item => String(item._id) === String(c._id || c));
                        if (!cObj) return null;
                        const isPrimary = String(cObj._id) === String(primaryId);
                        return (
                          <span key={cObj._id} className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border font-semibold ${
                            isPrimary
                              ? 'bg-indigo-600 border-indigo-700 text-white shadow-md shadow-indigo-600/15'
                              : 'bg-white border-stone-200 text-stone-700'
                          }`}>
                            {isPrimary && <span className="text-[9px]">⭐</span>}
                            {cObj.name}
                            {isPrimary && <span className="opacity-70 text-[9px] font-bold ml-0.5">PRIMARY</span>}
                          </span>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* ── Weekly Timings ── */}
                <div className="rounded-2xl border border-stone-200 overflow-hidden">
                  <div className="px-4 py-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">🕐 Weekly Practice Schedule</p>
                  </div>
                  <div className="divide-y divide-stone-100">
                    {(() => {
                      const slots = (selectedDoctor.availability || selectedDoctor.profile?.availability || []).filter(s => s.isAvailable);
                      if (!slots.length) return (
                        <p className="text-xs text-stone-400 italic px-4 py-4">No weekly practice timings configured yet.</p>
                      );
                      const dayColors = { monday: 'bg-indigo-500', tuesday: 'bg-violet-500', wednesday: 'bg-sky-500', thursday: 'bg-teal-500', friday: 'bg-emerald-500', saturday: 'bg-amber-500', sunday: 'bg-rose-500' };
                      return slots.map((slot) => {
                        const matchedClinic = clinics.find(c => String(c._id) === String(slot.clinicId?._id || slot.clinicId));
                        const dayColor = dayColors[slot.dayOfWeek] || 'bg-stone-500';
                        return (
                          <div key={slot._id || slot.dayOfWeek} className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dayColor}`} />
                            <span className="font-bold text-stone-800 text-xs capitalize w-20 flex-shrink-0">{slot.dayOfWeek}</span>
                            <span className="text-stone-600 text-xs font-mono flex-1">{slot.startTime} – {slot.endTime}</span>
                            <span className="text-[10px] text-stone-400 font-semibold">{slot.slotDurationMinutes} min</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                              slot.consultationMode === 'online'
                                ? 'bg-sky-50 text-sky-700 border-sky-200'
                                : 'bg-stone-100 text-stone-600 border-stone-200'
                            }`}>
                              {slot.consultationMode === 'online' ? '🌐 Online' : '🏥 Offline'}
                            </span>
                            {matchedClinic && (
                              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-lg border border-emerald-100 max-w-[90px] truncate" title={matchedClinic.name}>
                                {matchedClinic.name}
                              </span>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* ── Download Document ── */}
                {(selectedDoctor.profile?.documentPdf || selectedDoctor.documentPdf) && (
                  <button
                    type="button"
                    onClick={() => downloadDocument(selectedDoctor)}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 py-3 text-sm font-bold transition cursor-pointer"
                  >
                    📄 Download Verification Document (PDF)
                  </button>
                )}

                {/* ── Approve Flow ── */}
                {modalMode === 'approve' && (
                  <form onSubmit={handleApprove} className="space-y-4 rounded-2xl border border-indigo-100 bg-indigo-50/30 p-5">
                    <p className="text-xs font-black text-indigo-900 uppercase tracking-widest">🏥 Appoint to Clinic</p>

                    {(() => {
                      const docSpec = (selectedDoctor?.profile?.specialization || selectedDoctor?.specialization || '').trim().toLowerCase();
                      const filteredClinics = clinics.filter((c) => {
                        if (!docSpec) return false;
                        return (c.specializations || []).some(
                          (spec) => spec.name?.trim().toLowerCase() === docSpec && spec.isActive
                        );
                      });
                      return (
                        <>
                          <select
                            required
                            value={targetClinicId}
                            onChange={(e) => setTargetClinicId(e.target.value)}
                            className={FIELD_CLASS}
                          >
                            <option value="" disabled>Choose clinic to appoint...</option>
                            {filteredClinics.map((c) => (
                              <option key={c._id} value={c._id}>
                                {c.name} {c.parentClinicId ? `(Branch – ${c.code})` : `(Group – ${c.code})`}
                              </option>
                            ))}
                          </select>
                          {filteredClinics.length === 0 && (
                            <div className="flex items-start gap-3 p-3 rounded-xl bg-rose-50 border border-rose-200">
                              <span className="text-rose-500 flex-shrink-0">⚠️</span>
                              <p className="text-xs font-semibold text-rose-700">
                                No active clinics offer <strong>{selectedDoctor?.profile?.specialization || selectedDoctor?.specialization || 'this'}</strong> specialization. Please assign it to a clinic first.
                              </p>
                            </div>
                          )}
                        </>
                      );
                    })()}

                    <div className="border-t border-indigo-100 pt-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">Configure Weekly Practice Slots</p>
                      <div className="grid gap-2 max-h-56 overflow-y-auto pr-1">
                        {approvalAvailability.map((slot) => (
                          <div key={slot.id} className={`grid items-center gap-3 p-3 rounded-xl border text-xs transition ${
                            slot.isAvailable ? 'bg-white border-indigo-200' : 'bg-stone-50 border-stone-200'
                          }`} style={{ gridTemplateColumns: '1fr auto auto auto' }}>
                            <label className="flex items-center gap-2 cursor-pointer capitalize font-bold text-stone-800">
                              <input
                                type="checkbox"
                                checked={slot.isAvailable}
                                onChange={(e) => handleSlotChange(slot.id, 'isAvailable', e.target.checked)}
                                className="w-4 h-4 accent-emerald-600 cursor-pointer"
                              />
                              {slot.dayOfWeek}
                            </label>
                            {slot.isAvailable ? (
                              <>
                                <div className="flex items-center gap-1">
                                  <span className="text-stone-400">Start:</span>
                                  <input type="time" value={slot.startTime}
                                    onChange={(e) => handleSlotChange(slot.id, 'startTime', e.target.value)}
                                    className="rounded-lg border border-stone-300 p-1 text-[11px] outline-none focus:border-emerald-500 text-black" />
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-stone-400">End:</span>
                                  <input type="time" value={slot.endTime}
                                    onChange={(e) => handleSlotChange(slot.id, 'endTime', e.target.value)}
                                    className="rounded-lg border border-stone-300 p-1 text-[11px] outline-none focus:border-emerald-500 text-black" />
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-stone-400">Min:</span>
                                  <input type="number" min="5" step="5" value={slot.slotDurationMinutes}
                                    onChange={(e) => handleSlotChange(slot.id, 'slotDurationMinutes', e.target.value)}
                                    className="w-14 rounded-lg border border-stone-300 p-1 text-[11px] text-black outline-none focus:border-emerald-500 text-center" />
                                </div>
                              </>
                            ) : (
                              <span className="col-span-3 text-right text-stone-400 italic pr-2">Day Off</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-between items-center gap-3 pt-2 border-t border-indigo-100">
                      <button type="button" onClick={() => handleReject(selectedDoctor._id)}
                        className="rounded-2xl border border-rose-300 text-rose-600 px-4 py-2.5 text-xs font-bold hover:bg-rose-50 transition cursor-pointer">
                        ✕ Reject Application
                      </button>
                      <button type="button" onClick={() => {
                          setModalMode('re_edit');
                          setReEditComments('');
                          setReEditFields({ specialization: false, qualification: false, medicalRegistrationNumber: false, documentPdf: false, image: false });
                        }}
                        className="rounded-2xl border border-amber-300 text-amber-700 px-4 py-2.5 text-xs font-bold hover:bg-amber-50 transition cursor-pointer">
                        ✏️ Request Re-edit
                      </button>
                      <button type="submit"
                        className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-2.5 text-xs font-bold text-white hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/25 cursor-pointer transition">
                        ✅ Approve & Appoint
                      </button>
                    </div>
                  </form>
                )}

                {/* ── View Mode Actions ── */}
                {modalMode === 'view' && (
                  <div className="flex flex-wrap justify-between items-center gap-3 pt-2 border-t border-stone-100">
                    <div className="flex flex-wrap gap-2">
                      {selectedDoctor.approvalStatus === 'approved' && (
                        <>
                          <button type="button" onClick={handleEditSlotsClick}
                            className="rounded-2xl border border-indigo-200 text-indigo-700 px-4 py-2.5 text-xs font-bold hover:bg-indigo-50 transition cursor-pointer">
                            🕐 Edit Slots & Fees
                          </button>
                          <button type="button" onClick={() => handleToggleActive(selectedDoctor)}
                            className={`rounded-2xl border px-4 py-2.5 text-xs font-bold transition cursor-pointer ${
                              selectedDoctor.isActive
                                ? 'border-rose-300 text-rose-600 hover:bg-rose-50'
                                : 'border-emerald-300 text-emerald-600 hover:bg-emerald-50'
                            }`}>
                            {selectedDoctor.isActive ? '⏸ Suspend Doctor' : '▶ Activate Doctor'}
                          </button>
                          <button type="button" onClick={() => handleCancelAppointment(selectedDoctor)}
                            className="rounded-2xl border border-amber-300 text-amber-600 px-4 py-2.5 text-xs font-bold hover:bg-amber-50 transition cursor-pointer">
                            Cancel Appointment
                          </button>
                        </>
                      )}
                    </div>
                    <button type="button" onClick={() => { setSelectedDoctor(null); setModalMode(''); }}
                      className="rounded-2xl bg-stone-900 text-white px-6 py-2.5 text-xs font-bold hover:bg-stone-700 cursor-pointer transition">
                      Done
                    </button>
                  </div>
                )}

                {/* ── Edit Slots Mode ── */}
                {modalMode === 'edit_slots' && (
                  <form onSubmit={handleUpdateApprovedSlots} className="space-y-5 rounded-2xl border border-indigo-100 bg-indigo-50/20 p-5">
                    <p className="text-xs font-black text-indigo-900 uppercase tracking-widest">✏️ Edit Availability, Clinics & Fees</p>

                    {/* Clinic Assignment */}
                    <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Clinic Assignment Settings</p>
                      <div>
                        <label className="block text-[11px] font-bold text-stone-600 mb-1.5">Primary Appointed Clinic</label>
                        <select required value={editPrimaryClinicId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditPrimaryClinicId(val);
                            if (val && !editAssignedClinics.includes(val)) setEditAssignedClinics((prev) => [...prev, val]);
                          }}
                          className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-black outline-none focus:border-indigo-500">
                          <option value="" disabled>Select Primary Clinic...</option>
                          {clinics.map((c) => (
                            <option key={c._id} value={c._id}>{c.name} {c.parentClinicId ? `(Branch – ${c.code})` : `(Group – ${c.code})`}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-stone-600 mb-1.5">Additional Practice Clinics</label>
                        <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto p-2 bg-stone-50 rounded-xl border border-stone-200">
                          {clinics.map((c) => {
                            const isChecked = editAssignedClinics.includes(c._id);
                            const isPrimary = editPrimaryClinicId === c._id;
                            return (
                              <label key={c._id} className={`flex items-center gap-1.5 text-xs cursor-pointer font-medium px-2.5 py-1.5 rounded-lg border transition ${
                                isPrimary ? 'bg-indigo-600 border-indigo-700 text-white cursor-default' :
                                isChecked ? 'bg-indigo-50 border-indigo-300 text-indigo-800' :
                                'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'
                              }`}>
                                <input type="checkbox" checked={isChecked} disabled={isPrimary}
                                  onChange={(e) => {
                                    if (e.target.checked) setEditAssignedClinics((prev) => [...prev, c._id]);
                                    else setEditAssignedClinics((prev) => prev.filter((id) => id !== c._id));
                                  }}
                                  className="accent-indigo-600 cursor-pointer" />
                                {c.name} {isPrimary && <span className="text-[9px] font-black opacity-70">PRIMARY</span>}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Fees */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-stone-600 mb-1.5">Consultation Fee (₹)</label>
                        <input type="number" required min="0" value={editConsultationFee}
                          onChange={(e) => setEditConsultationFee(Number(e.target.value))}
                          className={FIELD_CLASS} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-stone-600 mb-1.5">Follow-up Fee (₹)</label>
                        <input type="number" required min="0" value={editFollowUpFee}
                          onChange={(e) => setEditFollowUpFee(Number(e.target.value))}
                          className={FIELD_CLASS} />
                      </div>
                    </div>

                    {/* Slots */}
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">Practice Slots &amp; Per-slot Clinic</p>
                      
                      {/* Grid representation */}
                      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white p-4">
                        <table className="w-full border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-stone-200">
                              <th className="py-2 px-3 text-left font-black text-stone-500 uppercase tracking-wider w-28">Day</th>
                              {editAssignedClinics.map((clinicId) => {
                                const clinicObj = clinics.find((c) => String(c._id) === String(clinicId));
                                if (!clinicObj) return null;
                                const isPrimary = String(clinicId) === String(editPrimaryClinicId);
                                return (
                                  <th key={clinicId} className="py-2 px-3 text-center border-l border-stone-100 min-w-[320px]">
                                    <div className="flex flex-col items-center justify-center space-y-1">
                                      <span className="font-extrabold text-stone-800 text-[11px] block leading-tight text-center max-w-[280px] break-words">
                                        {clinicObj.name}
                                      </span>
                                      {isPrimary ? (
                                        <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                          ★ Primary Default
                                        </span>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditPrimaryClinicId(clinicId);
                                          }}
                                          className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer bg-indigo-50 px-2 py-0.5 rounded-full"
                                        >
                                          ★ Make Default
                                        </button>
                                      )}
                                    </div>
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody>
                            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                              <tr key={day} className="border-b border-stone-100 hover:bg-stone-50/50">
                                <td className="py-3 px-3 font-bold text-stone-700 capitalize">{day}</td>
                                {editAssignedClinics.map((clinicId) => {
                                  // Find slot or create placeholder
                                  let slot = approvalAvailability.find(
                                    (s) => s.dayOfWeek === day && String(s.clinicId) === String(clinicId)
                                  );

                                  const handleGridSlotChange = (field, value) => {
                                    setApprovalAvailability((prev) => {
                                      const existingIdx = prev.findIndex(
                                        (s) => s.dayOfWeek === day && String(s.clinicId) === String(clinicId)
                                      );

                                      let updatedList = [...prev];
                                      if (existingIdx > -1) {
                                        const updatedSlot = {
                                          ...updatedList[existingIdx],
                                          [field]: field === 'isAvailable' ? value : field === 'slotDurationMinutes' ? Number(value) : value
                                        };
                                        if (field === 'clinicId') {
                                          const distance = getClinicDistance(value);
                                          if (distance !== null && distance > 15) {
                                            updatedSlot.consultationMode = 'online';
                                          }
                                        }
                                        updatedList[existingIdx] = updatedSlot;
                                      } else {
                                        // create new slot
                                        const newSlot = {
                                          id: `${day}-${clinicId}-${Math.random()}`,
                                          dayOfWeek: day,
                                          isAvailable: field === 'isAvailable' ? value : false,
                                          startTime: '09:00',
                                          endTime: '17:00',
                                          slotDurationMinutes: 30,
                                          clinicId: clinicId,
                                          consultationMode: 'offline'
                                        };
                                        if (field !== 'isAvailable') {
                                          newSlot[field] = field === 'slotDurationMinutes' ? Number(value) : value;
                                        }
                                        const distance = getClinicDistance(clinicId);
                                        if (distance !== null && distance > 15) {
                                          newSlot.consultationMode = 'online';
                                        }
                                        updatedList.push(newSlot);
                                      }
                                      return updatedList;
                                    });
                                  };

                                  const isAvailable = slot?.isAvailable || false;
                                  const distance = getClinicDistance(clinicId);

                                  return (
                                    <td key={clinicId} className="py-3 px-3 border-l border-stone-100">
                                      <div className="flex items-center justify-center gap-2 flex-wrap">
                                        {/* Toggle Checkbox */}
                                        <label className="flex items-center cursor-pointer p-1" title="Configure availability for this day and clinic">
                                          <input
                                            type="checkbox"
                                            checked={isAvailable}
                                            onChange={(e) => handleGridSlotChange('isAvailable', e.target.checked)}
                                            className="w-4 h-4 accent-indigo-600 cursor-pointer"
                                          />
                                        </label>

                                        {isAvailable && (
                                          <div className="flex flex-wrap items-center gap-1.5 justify-center">
                                            {/* Mode Select */}
                                            <div className="flex items-center gap-0.5">
                                              <span className="text-[9px] text-stone-400">Mode:</span>
                                              <select
                                                value={slot?.consultationMode || 'offline'}
                                                onChange={(e) => handleGridSlotChange('consultationMode', e.target.value)}
                                                disabled={distance !== null && distance > 15}
                                                className="rounded-lg border border-stone-300 px-1 py-0.5 text-[10px] outline-none focus:border-indigo-500 text-black w-[64px]"
                                              >
                                                <option value="offline">Offline</option>
                                                <option value="online">Online</option>
                                              </select>
                                              {distance !== null && (
                                                <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${
                                                  distance > 15 ? 'bg-rose-100 text-rose-600' :
                                                  distance > 5  ? 'bg-amber-100 text-amber-600' :
                                                                  'bg-stone-100 text-stone-500'
                                                }`}>
                                                  {distance.toFixed(1)}km
                                                </span>
                                              )}
                                            </div>

                                            {/* Start */}
                                            <div className="flex items-center gap-0.5">
                                              <span className="text-[9px] text-stone-400">Start:</span>
                                              <input
                                                type="time"
                                                value={slot?.startTime || '09:00'}
                                                onChange={(e) => handleGridSlotChange('startTime', e.target.value)}
                                                className="rounded-lg border border-stone-300 px-1 py-0.5 text-[10px] outline-none focus:border-indigo-500 text-black w-[68px]"
                                              />
                                            </div>

                                            {/* End */}
                                            <div className="flex items-center gap-0.5">
                                              <span className="text-[9px] text-stone-400">End:</span>
                                              <input
                                                type="time"
                                                value={slot?.endTime || '17:00'}
                                                onChange={(e) => handleGridSlotChange('endTime', e.target.value)}
                                                className="rounded-lg border border-stone-300 px-1 py-0.5 text-[10px] outline-none focus:border-indigo-500 text-black w-[68px]"
                                              />
                                            </div>

                                            {/* Duration */}
                                            <div className="flex items-center gap-0.5">
                                              <span className="text-[9px] text-stone-400">Min:</span>
                                              <input
                                                type="number"
                                                min="5"
                                                step="5"
                                                value={slot?.slotDurationMinutes || 30}
                                                onChange={(e) => handleGridSlotChange('slotDurationMinutes', e.target.value)}
                                                className="rounded-lg border border-stone-300 px-1 py-0.5 text-[10px] outline-none focus:border-indigo-500 text-center text-black w-8"
                                              />
                                            </div>
                                          </div>
                                        )}

                                        {!isAvailable && (
                                          <span className="text-[10px] text-stone-400 italic">Day Off</span>
                                        )}
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="flex justify-between items-center gap-3 pt-2 border-t border-indigo-100">
                      <button type="button" onClick={() => setModalMode('view')}
                        className="rounded-2xl border border-stone-300 px-5 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-50 cursor-pointer transition">
                        Cancel
                      </button>
                      <button type="submit"
                        className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-2.5 text-xs font-bold text-white hover:from-indigo-700 hover:to-violet-700 shadow-lg shadow-indigo-500/25 cursor-pointer transition">
                        💾 Save Timing & Fees
                      </button>
                    </div>
                  </form>
                )}

                {/* ── Document Preview ── */}
                {(selectedDoctor.profile?.documentPdf || selectedDoctor.documentPdf) && (() => {
                  const docData = selectedDoctor.profile?.documentPdf || selectedDoctor.documentPdf;
                  return (
                    <div className="rounded-2xl border border-stone-200 overflow-hidden">
                      <div className="px-4 py-3 bg-stone-50 border-b border-stone-200">
                        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">📄 Verification Document Preview</p>
                      </div>
                      {docData.startsWith('data:application/pdf') ? (
                        <iframe src={docData} title="Document PDF Preview" className="w-full h-80" />
                      ) : docData.startsWith('data:image') ? (
                        <img src={docData} alt="Registration Document" className="w-full max-h-80 object-contain" />
                      ) : (
                        <div className="p-4 text-center text-xs text-stone-500">
                          Binary document (non-standard format). Use the download button to view.
                        </div>
                      )}
                    </div>
                  );
                })()}
              </>
            )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyDoctorsDashboard;
