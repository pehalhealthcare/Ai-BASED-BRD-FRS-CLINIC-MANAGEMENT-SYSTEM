import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminApi, clinicApi } from '../../lib/api';
import { toast } from 'react-hot-toast';

const FIELD_CLASS =
  'w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm outline-none text-stone-900 font-medium';

const ReceptionistReview = () => {
  const { receptionistId } = useParams();
  const navigate = useNavigate();
  
  const [receptionist, setReceptionist] = useState(null);
  const [clinics, setClinics] = useState([]);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Clinic & Shift State
  const [assignedClinicIds, setAssignedClinicIds] = useState([]);
  const [primaryClinicId, setPrimaryClinicId] = useState('');
  const [slots, setSlots] = useState([]); // [{ id, dayOfWeek, clinicId, startTime, endTime }]

  // Re-edit request state
  const [reEditComments, setReEditComments] = useState('');
  const [reEditFields, setReEditFields] = useState({
    qualification: false,
    documentPdf: false,
    image: false,
  });

  const DAYS_OF_WEEK = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ];

  // Load pending receptionist and organization clinics
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [pendingRes, clinicsRes] = await Promise.all([
          adminApi.listPendingReceptionists(),
          clinicApi.list(),
        ]);

        const pendingList = pendingRes.data?.pendingReceptionists || [];
        const found = pendingList.find((r) => String(r._id) === String(receptionistId));
        
        if (!found) {
          toast.error('Receptionist not found in pending list');
          navigate('/admin/clinics-dashboard');
          return;
        }

        setReceptionist(found);

        // Filter clinics of same organization
        const orgId = found.organizationId || found.profile?.organizationId;
        const rawClinics = clinicsRes.data?.clinics || [];
        const filtered = rawClinics.filter((c) => String(c.organizationId) === String(orgId));

        setClinics(filtered);
      } catch (err) {
        console.error(err);
        toast.error('Error loading receptionist data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [receptionistId, navigate]);

  const goNext = () => setStep((s) => Math.min(s + 1, 4));
  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  // Add slot to the schedule
  const addSlot = (day) => {
    const defaultClinic = primaryClinicId || assignedClinicIds[0] || '';
    setSlots((prev) => [
      ...prev,
      {
        id: `slot-${Date.now()}-${Math.random()}`,
        dayOfWeek: day,
        clinicId: defaultClinic,
        startTime: '09:00',
        endTime: '17:00'
      },
    ]);
  };

  const removeSlot = (id) => {
    setSlots((prev) => prev.filter((s) => s.id !== id));
  };

  const copyToWeekdays = (sourceDay) => {
    const sourceSlots = slots.filter((s) => s.dayOfWeek === sourceDay);
    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

    setSlots((prev) => {
      const nonWeekdaySlots = prev.filter((s) => !weekdays.includes(s.dayOfWeek));
      const clonedSlots = [];
      weekdays.forEach((day) => {
        sourceSlots.forEach((slot, index) => {
          clonedSlots.push({
            ...slot,
            id: `slot-cloned-${day}-${index}-${Date.now()}-${Math.random()}`,
            dayOfWeek: day,
          });
        });
      });
      return [...nonWeekdaySlots, ...clonedSlots];
    });

    toast.success(`Copied shift hours from ${sourceDay} to all weekdays (Mon-Fri)`);
  };

  const updateSlotField = (id, field, value) => {
    setSlots((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const validateAssignments = () => {
    if (assignedClinicIds.length === 0) {
      toast.error('Please assign at least one clinic to the receptionist');
      return false;
    }

    if (!primaryClinicId) {
      toast.error('Please select a Primary Clinic');
      return false;
    }

    const activeSlots = slots;
    if (activeSlots.length === 0) {
      toast.error('Please configure at least one shift timing slot');
      return false;
    }

    return true;
  };

  const handleApproveSubmit = async () => {
    if (!validateAssignments()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        clinicId: primaryClinicId,
        assignedClinics: assignedClinicIds,
        qualification: receptionist.profile?.qualification || '',
        experienceYears: Number(receptionist.profile?.experienceYears || 0),
        availability: slots.map((s) => ({
          dayOfWeek: s.dayOfWeek,
          isAvailable: true,
          startTime: s.startTime,
          endTime: s.endTime,
          clinicId: s.clinicId
        })),
      };

      await adminApi.approveReceptionist(receptionist._id, payload);
      toast.success('Receptionist registration approved successfully!');
      navigate('/admin/clinics-dashboard');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to approve receptionist');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!window.confirm("Are you sure you want to reject this receptionist's application?")) return;

    setIsSubmitting(true);
    try {
      await adminApi.rejectReceptionist(receptionist._id);
      toast.success('Receptionist registration request rejected.');
      navigate('/admin/clinics-dashboard');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to reject receptionist');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReEditSubmit = async () => {
    const flagged = {};
    let hasFlagged = false;
    Object.keys(reEditFields).forEach((key) => {
      if (reEditFields[key]) {
        flagged[key] = true;
        hasFlagged = true;
      }
    });

    if (!hasFlagged) {
      toast.error('Please select at least one field to request re-edit');
      return;
    }

    if (!reEditComments.trim()) {
      toast.error('Please provide a comment explaining what needs to be changed');
      return;
    }

    setIsSubmitting(true);
    try {
      await adminApi.requestReEditReceptionist(receptionist._id, {
        reEditFields: flagged,
        reEditComments: reEditComments.trim(),
      });
      toast.success('Re-edit request submitted.');
      navigate('/admin/clinics-dashboard');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to request re-edit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadDocument = () => {
    const docPdf = receptionist?.profile?.documentPdf;
    if (!docPdf) return;
    const docName = receptionist?.name || 'Receptionist';
    const link = document.createElement('a');
    link.href = docPdf;
    link.download = `License_${docName.replace(/\s+/g, '_')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-stone-50">
        <p className="text-stone-600 font-semibold text-lg">Loading registration details...</p>
      </div>
    );
  }

  const isAddressSame = () => {
    const cur = receptionist?.profile?.currentAddress || {};
    const perm = receptionist?.profile?.permanentAddress || {};
    return (
      cur.line1 === perm.line1 &&
      cur.city === perm.city &&
      cur.state === perm.state &&
      cur.pincode === perm.pincode
    );
  };

  const preferredClinic = clinics.find((c) => String(c._id) === String(receptionist?.profile?.preferredPracticeLocation));

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm">
            <h2 className="text-xl font-black text-stone-900 mb-6 border-b pb-3 border-stone-100">
              Step 1: Basic Profile Details
            </h2>
            <div className="grid md:grid-cols-[1fr_auto] gap-6">
              <div className="grid gap-6 flex-1">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                    Receptionist's Name
                  </label>
                  <input readOnly className={FIELD_CLASS} value={receptionist.name || ''} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <input readOnly className={FIELD_CLASS} value={receptionist.email || ''} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                    Phone Number
                  </label>
                  <input readOnly className={FIELD_CLASS} value={receptionist.phone || ''} />
                </div>
              </div>
              {receptionist.profile?.image ? (
                <div className="flex flex-col items-center justify-center p-4 border border-stone-200 bg-stone-50 rounded-2xl h-fit">
                  <img
                    src={receptionist.profile.image}
                    alt="Photo"
                    className="w-40 h-40 rounded-2xl object-cover border border-stone-200 shadow-sm"
                  />
                  <span className="text-[10px] text-stone-500 font-bold mt-2">Profile Photo</span>
                </div>
              ) : (
                <div className="w-40 h-40 rounded-2xl bg-stone-100 flex items-center justify-center text-xs font-bold text-stone-400 border border-dashed border-stone-200 h-fit">
                  No photo uploaded
                </div>
              )}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm">
            <h2 className="text-xl font-black text-stone-900 mb-6 border-b pb-3 border-stone-100">
              Step 2: Educational Qualifications & Certificates
            </h2>
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                  Degree / Qualification
                </label>
                <input readOnly className={FIELD_CLASS} value={receptionist.profile?.qualification || 'Not provided'} />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                  Experience (Years)
                </label>
                <input readOnly className={FIELD_CLASS} value={receptionist.profile?.experienceYears || '0'} />
              </div>
            </div>

            <div className="border-t border-stone-150 pt-6">
              <h3 className="text-sm font-bold text-stone-700 uppercase tracking-wider mb-4">
                Uploaded Qualification Document
              </h3>
              {receptionist.profile?.documentPdf ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-stone-200 overflow-hidden shadow-inner">
                    <iframe
                      src={receptionist.profile.documentPdf}
                      className="w-full h-[500px]"
                      title="Document Preview"
                    />
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={downloadDocument}
                      className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 text-xs font-bold transition shadow-md cursor-pointer"
                    >
                      Download Document File
                    </button>
                  </div>
                </div>
              ) : (
                <span className="text-xs text-stone-400 font-bold italic">No document uploaded</span>
              )}
            </div>
          </div>
        );
      case 3:
        const same = isAddressSame();
        return (
          <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm">
            <h2 className="text-xl font-black text-stone-900 mb-6 border-b pb-3 border-stone-100">
              Step 3: Address & Preferences
            </h2>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-xs font-black text-indigo-800 uppercase tracking-wider mb-3">
                  Current Address
                </h3>
                <div className="space-y-2">
                  <input readOnly className={FIELD_CLASS} value={receptionist.profile?.currentAddress?.line1 || ''} placeholder="Line 1" />
                  <input readOnly className={FIELD_CLASS} value={receptionist.profile?.currentAddress?.line2 || ''} placeholder="Line 2" />
                  <input readOnly className={FIELD_CLASS} value={`${receptionist.profile?.currentAddress?.city || ''}, ${receptionist.profile?.currentAddress?.state || ''}`} placeholder="City, State" />
                  <input readOnly className={FIELD_CLASS} value={receptionist.profile?.currentAddress?.pincode || ''} placeholder="Pincode" />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-black text-stone-800 uppercase tracking-wider">
                    Permanent Address
                  </h3>
                  {same && (
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                      Same as Current
                    </span>
                  )}
                </div>
                {!same ? (
                  <div className="space-y-2">
                    <input readOnly className={FIELD_CLASS} value={receptionist.profile?.permanentAddress?.line1 || ''} placeholder="Line 1" />
                    <input readOnly className={FIELD_CLASS} value={receptionist.profile?.permanentAddress?.line2 || ''} placeholder="Line 2" />
                    <input readOnly className={FIELD_CLASS} value={`${receptionist.profile?.permanentAddress?.city || ''}, ${receptionist.profile?.permanentAddress?.state || ''}`} placeholder="City, State" />
                    <input readOnly className={FIELD_CLASS} value={receptionist.profile?.permanentAddress?.pincode || ''} placeholder="Pincode" />
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-stone-50 border border-dashed border-stone-250 flex items-center justify-center h-[180px]">
                    <p className="text-stone-500 text-xs text-center font-medium">
                      Permanent Address is identical to the Current Address.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-stone-150 pt-6">
              <h3 className="text-xs font-black text-stone-800 uppercase tracking-wider mb-4">
                Preferred Branch Location Preference
              </h3>
              <div className="p-4 bg-indigo-50/20 border border-indigo-100 rounded-2xl">
                {preferredClinic ? (
                  <div>
                    <h4 className="font-bold text-sm text-stone-900">{preferredClinic.name} ({preferredClinic.code})</h4>
                    <p className="text-xs text-stone-600 mt-1">{preferredClinic.address?.line1 || ''}, {preferredClinic.address?.city || ''}</p>
                  </div>
                ) : (
                  <p className="text-xs text-stone-500 italic">No preference specified</p>
                )}
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-black text-stone-900 mb-2">
                Step 4: Clinic & Shift Assignment
              </h2>
              <p className="text-xs text-stone-500 mb-6">Assign receptionist to a single branch and configure weekly shift timings.</p>

              <div className="grid md:grid-cols-2 gap-4 max-h-[250px] overflow-y-auto pr-2 border-b pb-6 mb-6">
                {clinics.map((c) => {
                  const isAssigned = primaryClinicId === c._id;
                  return (
                    <div
                      key={c._id}
                      onClick={() => {
                        setAssignedClinicIds([c._id]);
                        setPrimaryClinicId(c._id);
                        setSlots((prev) => prev.map((s) => ({ ...s, clinicId: c._id })));
                      }}
                      className={`p-4 rounded-2xl border-2 flex items-start space-x-3 cursor-pointer transition-all duration-200 ${
                        isAssigned ? 'border-indigo-600 bg-indigo-50/5' : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="clinicSelector"
                        checked={isAssigned}
                        onChange={() => {}}
                        className="mt-1 accent-indigo-600 cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-sm text-stone-950">{c.name}</h4>
                          <span className="text-[10px] font-mono font-black bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">
                            {c.code}
                          </span>
                        </div>
                        <p className="text-xs text-stone-600 mt-1">
                          {c.address?.line1 || ''}, {c.address?.city || ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {primaryClinicId && (
                <div className="p-4 bg-indigo-50/30 border border-indigo-150 rounded-2xl">
                  <span className="text-xs text-indigo-700 font-bold uppercase tracking-wider block mb-1">
                    Appointed Clinic Branch
                  </span>
                  <h4 className="font-bold text-sm text-stone-900">
                    {clinics.find((c) => c._id === primaryClinicId)?.name}
                  </h4>
                </div>
              )}
            </div>

            {primaryClinicId && (
              <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm">
                <h2 className="text-lg font-black text-stone-900 mb-4 border-b pb-2 border-stone-100">
                  Weekly Shift Timing Planner
                </h2>

                <div className="space-y-6">
                  {DAYS_OF_WEEK.map((day) => {
                    const daySlots = slots.filter((s) => s.dayOfWeek === day);
                    return (
                      <div key={day} className="border-b border-stone-100 pb-4 last:border-0 last:pb-0">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-xs font-black uppercase tracking-widest text-stone-850 capitalize">
                            {day}
                          </h4>
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => copyToWeekdays(day)}
                              className="rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 px-3 py-1.5 text-xs font-bold transition cursor-pointer"
                            >
                              📋 Apply Mon-Fri Shifts
                            </button>
                            <button
                              type="button"
                              onClick={() => addSlot(day)}
                              className="rounded-xl border border-indigo-600 text-indigo-700 hover:bg-indigo-50 px-3 py-1.5 text-xs font-bold transition cursor-pointer"
                            >
                              + Add Shift Timing
                            </button>
                          </div>
                        </div>

                        {daySlots.length === 0 ? (
                          <p className="text-xs text-stone-400 italic pl-1">Not scheduled</p>
                        ) : (
                          <div className="space-y-3">
                            {daySlots.map((slot) => (
                              <div
                                key={slot.id}
                                className="flex flex-wrap items-center gap-3 p-3 bg-stone-50 border rounded-xl border-stone-200"
                              >
                                <div className="flex-1 min-w-[200px] text-xs font-semibold text-stone-750 flex items-center">
                                  🏢 {clinics.find((c) => String(c._id) === String(slot.clinicId))?.name || 'Assigned Clinic'}
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-[10px] text-stone-500 font-bold">Shift:</span>
                                  <input
                                    type="time"
                                    value={slot.startTime}
                                    onChange={(e) => updateSlotField(slot.id, 'startTime', e.target.value)}
                                    className="text-xs rounded-lg border border-stone-300 p-2 bg-white text-black"
                                  />
                                  <span className="text-stone-400 text-xs font-bold">to</span>
                                  <input
                                    type="time"
                                    value={slot.endTime}
                                    onChange={(e) => updateSlotField(slot.id, 'endTime', e.target.value)}
                                    className="text-xs rounded-lg border border-stone-300 p-2 bg-white text-black"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeSlot(slot.id)}
                                  className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center font-bold text-xs cursor-pointer ml-auto"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const renderReviewSidebar = () => {
    return (
      <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-6">
        <div>
          <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
            Verification Controls
          </h3>
          <p className="text-xs text-stone-500 leading-relaxed">
            Review receptionist certificates and addresses. Request re-edits if any documents are blurry or wrong, otherwise approve registration.
          </p>
        </div>

        {/* Option A: Request re-edit */}
        <div className="border-t border-stone-100 pt-4">
          <h4 className="text-xs font-black text-rose-700 uppercase tracking-wider mb-3">
            Request Re-Edit Profile
          </h4>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="flex items-center space-x-2 text-xs font-semibold text-stone-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reEditFields.qualification}
                  onChange={(e) => setReEditFields({ ...reEditFields, qualification: e.target.checked })}
                  className="accent-rose-600"
                />
                <span>Qualification / Degree</span>
              </label>
              <label className="flex items-center space-x-2 text-xs font-semibold text-stone-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reEditFields.documentPdf}
                  onChange={(e) => setReEditFields({ ...reEditFields, documentPdf: e.target.checked })}
                  className="accent-rose-600"
                />
                <span>Compulsory Document PDF</span>
              </label>
              <label className="flex items-center space-x-2 text-xs font-semibold text-stone-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reEditFields.image}
                  onChange={(e) => setReEditFields({ ...reEditFields, image: e.target.checked })}
                  className="accent-rose-600"
                />
                <span>Profile Photo</span>
              </label>
            </div>
            <textarea
              placeholder="Provide comments explaining what needs correction..."
              value={reEditComments}
              onChange={(e) => setReEditComments(e.target.value)}
              className="w-full h-24 rounded-xl border border-stone-300 p-3 text-xs outline-none focus:border-rose-500 bg-white text-stone-850"
            />
            <button
              onClick={handleReEditSubmit}
              disabled={isSubmitting}
              className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              Send Request back to Re-edit
            </button>
          </div>
        </div>

        {/* Option B: Reject / Approve */}
        <div className="border-t border-stone-100 pt-4 space-y-3">
          <button
            onClick={handleRejectSubmit}
            disabled={isSubmitting}
            className="w-full py-2.5 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-stone-800 cursor-pointer disabled:opacity-50"
          >
            Reject Request Application
          </button>
          {step === 4 && (
            <button
              onClick={handleApproveSubmit}
              disabled={isSubmitting}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-lg disabled:opacity-50"
            >
              Approve & Assign Shifts
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight text-white">Review Receptionist Application</h1>
          <p className="text-gray-300 text-sm mt-1">Verify details, assign clinic venues, and configure shift schedules.</p>
        </div>

        {/* Step Indicator Progress bar */}
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map((s) => (
            <button
              key={s}
              onClick={() => setStep(s)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                s === step
                  ? 'bg-indigo-600 text-white shadow'
                  : s < step
                  ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                  : 'bg-stone-100 text-stone-400 border border-stone-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          {renderStepContent()}

          <div className="flex justify-between border-t border-stone-100 pt-4">
            <button
              disabled={step === 1}
              onClick={goBack}
              className="px-5 py-2.5 rounded-xl border "
            >
              ← Back Phase
            </button>
            <button
              disabled={step === 4}
              onClick={goNext}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white  font-bold transition shadow cursor-pointer "
            >
              Next Phase →
            </button>
          </div>
        </div>

        <div>{renderReviewSidebar()}</div>
      </div>
    </div>
  );
};

export default ReceptionistReview;
