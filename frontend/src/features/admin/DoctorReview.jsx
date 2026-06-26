// src/features/admin/DoctorReview.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminApi, clinicApi } from '../../lib/api';
import MapPicker from '../../components/common/MapPicker';
import { haversineDistance } from '../../utils/geo';
import { toast } from 'react-hot-toast';

const FIELD_CLASS =
  'w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm outline-none text-stone-900 font-medium';

const DoctorReview = () => {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  
  const [doctor, setDoctor] = useState(null);
  const [clinics, setClinics] = useState([]);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Phase 4 Assignment & Schedule State
  const [assignedClinicIds, setAssignedClinicIds] = useState([]);
  const [primaryClinicId, setPrimaryClinicId] = useState('');
  const [consultationFee, setConsultationFee] = useState(0);
  const [followUpFee, setFollowUpFee] = useState(0);
  const [slots, setSlots] = useState([]); // [{ id, dayOfWeek, clinicId, startTime, endTime, consultationMode, slotDurationMinutes }]

  // Overall Daily Timelines configured by admin
  const [dailyTimelines, setDailyTimelines] = useState(
    [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ].reduce((acc, day) => {
      acc[day] = { startTime: '09:00', endTime: '18:00', enabled: false };
      return acc;
    }, {})
  );

  // Re-edit request state
  const [reEditComments, setReEditComments] = useState('');
  const [reEditFields, setReEditFields] = useState({
    specialization: false,
    qualification: false,
    medicalRegistrationNumber: false,
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

  // Helper: parse time HH:MM to minutes
  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [hrs, mins] = timeStr.split(':').map(Number);
    return hrs * 60 + mins;
  };

  // Helper: check if two address points are valid coordinates
  const hasCoordinates = (addr) => {
    return addr && typeof addr.latitude === 'number' && typeof addr.longitude === 'number';
  };

  // Load pending doctor and organization clinics
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [pendingRes, clinicsRes] = await Promise.all([
          adminApi.listPendingDoctors(),
          clinicApi.list(),
        ]);

        const pendingList = pendingRes.data?.pendingDoctors || [];
        const foundDoctor = pendingList.find((d) => String(d._id) === String(doctorId));
        
        if (!foundDoctor) {
          toast.error('Doctor not found in pending list');
          navigate('/admin/doctors');
          return;
        }

        setDoctor(foundDoctor);
        setConsultationFee(foundDoctor.profile?.consultationFee || 0);
        setFollowUpFee(foundDoctor.profile?.followUpFee || 0);

        // Filter clinics of same organization and compute distances
        const orgId = foundDoctor.organizationId || foundDoctor.profile?.organizationId;
        const rawClinics = clinicsRes.data?.clinics || [];
        
        const docLat = foundDoctor.profile?.currentAddress?.latitude || 0;
        const docLng = foundDoctor.profile?.currentAddress?.longitude || 0;

        const filtered = rawClinics
          .filter((c) => String(c.organizationId) === String(orgId))
          .map((c) => {
            const dist = hasCoordinates(c.address) && hasCoordinates(foundDoctor.profile?.currentAddress)
              ? haversineDistance(docLat, docLng, c.address.latitude, c.address.longitude)
              : null;
            return { ...c, distance: dist };
          });

        setClinics(filtered);
      } catch (err) {
        console.error(err);
        toast.error('Error loading doctor data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [doctorId, navigate]);

  // Helpers for navigation
  const goNext = () => setStep((s) => Math.min(s + 1, 4));
  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  // Add slot to the schedule
  const addSlot = (day) => {
    const defaultClinic = primaryClinicId || assignedClinicIds[0] || '';
    const timeline = dailyTimelines[day];
    const defaultStart = (timeline && timeline.enabled) ? timeline.startTime : '09:00';
    const defaultEnd = (timeline && timeline.enabled) ? timeline.endTime : '13:00';

    // Verify distance if adding a slot for a secondary clinic offline
    if (defaultClinic && primaryClinicId && String(defaultClinic) !== String(primaryClinicId)) {
      const primaryClinic = clinics.find((c) => String(c._id) === String(primaryClinicId));
      const clinic = clinics.find((c) => String(c._id) === String(defaultClinic));
      if (primaryClinic && clinic) {
        const dist = hasCoordinates(primaryClinic.address) && hasCoordinates(clinic.address)
          ? haversineDistance(
              primaryClinic.address.latitude,
              primaryClinic.address.longitude,
              clinic.address.latitude,
              clinic.address.longitude
            )
          : 0;
        if (dist > 25) {
          toast.error(`Clinic "${clinic.name}" is ${dist.toFixed(1)} km away from the Primary Clinic (> 25 km limit). You can only schedule online sessions for this clinic.`);
          // Add as online
          setSlots((prev) => [
            ...prev,
            {
              id: `slot-${Date.now()}-${Math.random()}`,
              dayOfWeek: day,
              clinicId: defaultClinic,
              startTime: defaultStart,
              endTime: defaultEnd,
              consultationMode: 'online',
              slotDurationMinutes: 30,
            },
          ]);
          return;
        }
      }
    }

    setSlots((prev) => [
      ...prev,
      {
        id: `slot-${Date.now()}-${Math.random()}`,
        dayOfWeek: day,
        clinicId: defaultClinic,
        startTime: defaultStart,
        endTime: defaultEnd,
        consultationMode: 'offline',
        slotDurationMinutes: 30,
      },
    ]);
  };

  // Remove slot from schedule
  const removeSlot = (id) => {
    setSlots((prev) => prev.filter((s) => s.id !== id));
  };

  // Copy one day's timeline and slot configuration to all weekdays (Mon-Fri)
  const copyToWeekdays = (sourceDay) => {
    const sourceSlots = slots.filter((s) => s.dayOfWeek === sourceDay);
    const sourceTimeline = dailyTimelines[sourceDay];
    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

    setDailyTimelines((prev) => {
      const updated = { ...prev };
      weekdays.forEach((day) => {
        updated[day] = { ...sourceTimeline };
      });
      return updated;
    });

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

    toast.success(`Copied schedule from ${sourceDay} to all weekdays (Mon-Fri)`);
  };

  // Edit slot details
  const updateSlotField = (id, field, value) => {
    setSlots((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const updated = { ...s, [field]: value };
        
        // Auto-enforce distance mode restriction (not more than 25km from Primary for offline)
        if (field === 'clinicId' || field === 'consultationMode') {
          const targetClinicId = field === 'clinicId' ? value : s.clinicId;
          const targetMode = field === 'consultationMode' ? value : s.consultationMode;

          if (primaryClinicId && String(targetClinicId) !== String(primaryClinicId)) {
            const primaryClinic = clinics.find((c) => String(c._id) === String(primaryClinicId));
            const clinic = clinics.find((c) => String(c._id) === String(targetClinicId));
            if (primaryClinic && clinic) {
              const dist = hasCoordinates(primaryClinic.address) && hasCoordinates(clinic.address)
                ? haversineDistance(
                    primaryClinic.address.latitude,
                    primaryClinic.address.longitude,
                    clinic.address.latitude,
                    clinic.address.longitude
                  )
                : 0;
              if (targetMode === 'offline' && dist > 25) {
                toast.error(`Clinic "${clinic.name}" is ${dist.toFixed(1)} km away from the Primary Clinic (> 25 km limit). You cannot set offline session slots for it.`);
                updated.consultationMode = 'online';
              }
            }
          }
        }
        return updated;
      })
    );
  };

  // Enforce overall timeline and travel gap rules for each day
  const checkDailyTimeline = (day) => {
    const timeline = dailyTimelines[day];
    const dayOfflineSlots = slots
      .filter((s) => s.dayOfWeek === day && s.consultationMode === 'offline')
      .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

    const dayOnlineSlots = slots
      .filter((s) => s.dayOfWeek === day && s.consultationMode === 'online');

    // 1. Validate online slots: no overlap with offline slots or traveling time
    for (const online of dayOnlineSlots) {
      const onStart = parseTimeToMinutes(online.startTime);
      const onEnd = parseTimeToMinutes(online.endTime);

      if (onStart >= onEnd) {
        return {
          isValid: false,
          message: `Online slot starts after or at the same time it ends: ${online.startTime} - ${online.endTime}`
        };
      }

      // Check overlap with offline slots
      for (const offline of dayOfflineSlots) {
        const offStart = parseTimeToMinutes(offline.startTime);
        const offEnd = parseTimeToMinutes(offline.endTime);
        if (Math.max(onStart, offStart) < Math.min(onEnd, offEnd)) {
          return {
            isValid: false,
            message: `Online slot (${online.startTime}-${online.endTime}) overlaps with offline slot at clinic (${offline.startTime}-${offline.endTime}).`
          };
        }
      }

      // Check overlap with travel gaps (1.5 hours after each offline slot to the next offline slot)
      for (let i = 0; i < dayOfflineSlots.length - 1; i++) {
        const s1 = dayOfflineSlots[i];
        const s2 = dayOfflineSlots[i + 1];
        if (String(s1.clinicId) !== String(s2.clinicId)) {
          const gapStart = parseTimeToMinutes(s1.endTime);
          const gapEnd = gapStart + 90; // 1.5 hr traveling time
          if (Math.max(onStart, gapStart) < Math.min(onEnd, gapEnd)) {
            return {
              isValid: false,
              message: `Online slot (${online.startTime}-${online.endTime}) overlaps with 1.5-hr traveling time (${s1.endTime}-${s2.startTime}) for the next clinic.`
            };
          }
        }
      }
    }

    if (dayOfflineSlots.length === 0) {
      return { isValid: true, message: 'No offline slots scheduled.' };
    }

    if (!timeline || !timeline.enabled) {
      return { isValid: true, message: 'Timeline check not enabled by admin.' };
    }

    const tStart = parseTimeToMinutes(timeline.startTime);
    const tEnd = parseTimeToMinutes(timeline.endTime);
    const sStart = parseTimeToMinutes(dayOfflineSlots[0].startTime);
    const sEnd = parseTimeToMinutes(dayOfflineSlots[dayOfflineSlots.length - 1].endTime);

    if (sStart !== tStart) {
      return {
        isValid: false,
        message: `First offline session must start at configured timeline start: ${timeline.startTime}. Currently starts at ${dayOfflineSlots[0].startTime}.`,
      };
    }

    if (sEnd !== tEnd) {
      return {
        isValid: false,
        message: `Last offline session must end at configured timeline end: ${timeline.endTime}. Currently ends at ${dayOfflineSlots[dayOfflineSlots.length - 1].endTime}.`,
      };
    }

    // Check all gaps are at least 90 minutes (1.5 hours) and distance < 25km between different clinics
    for (let i = 0; i < dayOfflineSlots.length - 1; i++) {
      const s1 = dayOfflineSlots[i];
      const s2 = dayOfflineSlots[i + 1];

      if (String(s1.clinicId) !== String(s2.clinicId)) {
        const c1 = clinics.find((c) => String(c._id) === String(s1.clinicId));
        const c2 = clinics.find((c) => String(c._id) === String(s2.clinicId));
        
        if (c1 && c2) {
          const distanceBetween = hasCoordinates(c1.address) && hasCoordinates(c2.address)
            ? haversineDistance(c1.address.latitude, c1.address.longitude, c2.address.latitude, c2.address.longitude)
            : 0;
            
          if (distanceBetween > 25) {
            return {
              isValid: false,
              message: `Clinics "${c1.name}" and "${c2.name}" are ${distanceBetween.toFixed(1)} km apart (exceeds 25km limit). Offline sessions must be scheduled on alternate days.`
            };
          }
        }

        const currentEnd = parseTimeToMinutes(s1.endTime);
        const nextStart = parseTimeToMinutes(s2.startTime);
        const gap = nextStart - currentEnd;
        if (gap < 90) {
          const c1 = clinics.find((c) => String(c._id) === String(s1.clinicId));
          const c2 = clinics.find((c) => String(c._id) === String(s2.clinicId));
          return {
            isValid: false,
            message: `Gap between sessions at "${c1?.name || 'Clinic A'}" and "${c2?.name || 'Clinic B'}" must be at least 1.5 hours (90 minutes). Current gap: ${gap} minutes.`,
          };
        }
      }
    }

    return { isValid: true, message: 'Timeline successfully matched with travel/wait times.' };
  };

  // Validate assignments based on the strict rules
  const validateAssignments = () => {
    if (assignedClinicIds.length === 0) {
      toast.error('Please assign at least one clinic to the doctor');
      return false;
    }

    if (!primaryClinicId) {
      toast.error('Please select a Primary Clinic');
      return false;
    }

    const activeSlots = slots;
    if (activeSlots.length === 0) {
      toast.error('Please configure at least one availability slot');
      return false;
    }

    const primaryClinic = clinics.find((c) => String(c._id) === String(primaryClinicId));
    if (!primaryClinic) return false;

    // 1. Check offline mode distance constraints from Primary Clinic
    for (const slot of activeSlots) {
      if (slot.consultationMode === 'offline' && String(slot.clinicId) !== String(primaryClinicId)) {
        const secondaryClinic = clinics.find((c) => String(c._id) === String(slot.clinicId));
        if (secondaryClinic) {
          const distToPrimary = hasCoordinates(primaryClinic.address) && hasCoordinates(secondaryClinic.address)
            ? haversineDistance(
                primaryClinic.address.latitude,
                primaryClinic.address.longitude,
                secondaryClinic.address.latitude,
                secondaryClinic.address.longitude
              )
            : 0;

          if (distToPrimary > 25) {
            toast.error(
              `Clinic "${secondaryClinic.name}" is ${distToPrimary.toFixed(1)} km away from the Primary Clinic "${primaryClinic.name}" (> 25 km limit). You cannot set offline slots for this clinic.`
            );
            return false;
          }
        }
      }
    }

    // 2. Validate overall timeline matching for each day
    for (const day of [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ]) {
      const result = checkDailyTimeline(day);
      if (!result.isValid) {
        toast.error(`Timeline error on ${day}: ${result.message}`);
        return false;
      }
    }

    // Group slots by day of the week to validate conflicts
    const slotsByDay = activeSlots.reduce((acc, s) => {
      if (!acc[s.dayOfWeek]) acc[s.dayOfWeek] = [];
      acc[s.dayOfWeek].push(s);
      return acc;
    }, {});

    for (const day of Object.keys(slotsByDay)) {
      const daySlots = slotsByDay[day];
      if (daySlots.length <= 1) continue;

      // Sort slots chronologically
      daySlots.sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

      for (let i = 0; i < daySlots.length; i++) {
        for (let j = i + 1; j < daySlots.length; j++) {
          const s1 = daySlots[i];
          const s2 = daySlots[j];

          // If scheduled for different clinics
          if (String(s1.clinicId) !== String(s2.clinicId)) {
            const c1 = clinics.find((c) => String(c._id) === String(s1.clinicId));
            const c2 = clinics.find((c) => String(c._id) === String(s2.clinicId));

            if (c1 && c2) {
              const distanceBetweenClinics = hasCoordinates(c1.address) && hasCoordinates(c2.address)
                ? haversineDistance(c1.address.latitude, c1.address.longitude, c2.address.latitude, c2.address.longitude)
                : 0;

              if (s1.consultationMode === 'offline' && s2.consultationMode === 'offline') {
                if (distanceBetweenClinics > 25) {
                  toast.error(
                    `Clinics "${c1.name}" and "${c2.name}" are ${distanceBetweenClinics.toFixed(1)} km apart (> 25 km). Offline sessions must be scheduled on alternate days. You cannot schedule both offline on ${day}.`
                  );
                  return false;
                } else {
                  const s1End = parseTimeToMinutes(s1.endTime);
                  const s2Start = parseTimeToMinutes(s2.startTime);
                  const gap = s2Start - s1End;

                  if (gap < 90) {
                    toast.error(
                      `There must be a gap of at least 1.5 hours (90 minutes) between offline sessions at "${c1.name}" and "${c2.name}" on ${day}. Current gap is ${gap} minutes.`
                    );
                    return false;
                  }
                }
              }
            }
          }
        }
      }
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
        specialization: doctor.profile?.specialization || '',
        qualification: doctor.profile?.qualification || '',
        experienceYears: Number(doctor.profile?.experienceYears || 0),
        consultationFee: Number(consultationFee),
        availability: slots.map((s) => ({
          dayOfWeek: s.dayOfWeek,
          isAvailable: true,
          startTime: s.startTime,
          endTime: s.endTime,
          slotDurationMinutes: Number(s.slotDurationMinutes),
          clinicId: s.clinicId,
          consultationMode: s.consultationMode,
        })),
      };

      await adminApi.approveDoctor(doctor._id, payload);
      toast.success('Doctor registration approved successfully!');
      navigate('/admin/doctors');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to approve doctor registration');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!window.confirm("Are you sure you want to reject this doctor's application?")) return;

    setIsSubmitting(true);
    try {
      await adminApi.rejectDoctor(doctor._id);
      toast.success('Doctor registration request rejected.');
      navigate('/admin/doctors');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to reject doctor');
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
      await adminApi.requestReEdit(doctor._id, {
        reEditFields: flagged,
        reEditComments: reEditComments.trim(),
      });
      toast.success('Re-edit request submitted.');
      navigate('/admin/doctors');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to request re-edit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadDocument = () => {
    const docPdf = doctor?.profile?.documentPdf;
    if (!docPdf) return;
    const docName = doctor?.name || 'Doctor';
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

  // Address compare helper
  const isAddressSame = () => {
    const cur = doctor?.profile?.currentAddress || {};
    const perm = doctor?.profile?.permanentAddress || {};
    return (
      cur.line1 === perm.line1 &&
      cur.city === perm.city &&
      cur.state === perm.state &&
      cur.pincode === perm.pincode
    );
  };

  const preferredClinic = clinics.find((c) => String(c._id) === String(doctor?.profile?.preferredPracticeLocation));

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="bg-white/80 backdrop-blur-xl border border-stone-200 rounded-3xl p-6 shadow-xl">
            <h2 className="text-xl font-black text-stone-900 mb-6 border-b pb-3 border-stone-100">
              Phase 1: Basic Profile Details
            </h2>
            <div className="grid md:grid-cols-[1fr_auto] gap-6">
              <div className="grid gap-6 flex-1">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                    Doctor's Name
                  </label>
                  <input readOnly className={FIELD_CLASS} value={doctor.name || ''} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <input readOnly className={FIELD_CLASS} value={doctor.email || ''} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                    Phone Number
                  </label>
                  <input readOnly className={FIELD_CLASS} value={doctor.phone || ''} />
                </div>
              </div>
              {doctor.profile?.image ? (
                <div className="flex flex-col items-center justify-center p-4 border border-stone-200 bg-stone-50 rounded-2xl h-fit">
                  <img
                    src={doctor.profile.image}
                    alt="Doctor Photo"
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
          <div className="bg-white/80 backdrop-blur-xl border border-stone-200 rounded-3xl p-6 shadow-xl">
            <h2 className="text-xl font-black text-stone-900 mb-6 border-b pb-3 border-stone-100">
              Phase 2: Educational Qualifications & Credentials
            </h2>
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                  Degree / Qualification
                </label>
                <input readOnly className={FIELD_CLASS} value={doctor.profile?.qualification || 'Not provided'} />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                  Medical Registration Number
                </label>
                <input readOnly className={FIELD_CLASS} value={doctor.profile?.medicalRegistrationNumber || 'Not provided'} />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                  Specialization Applied
                </label>
                <input readOnly className={FIELD_CLASS} value={doctor.profile?.specialization || 'Not provided'} />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                  Experience (Years)
                </label>
                <input readOnly className={FIELD_CLASS} value={doctor.profile?.experienceYears || '0'} />
              </div>
            </div>

            <div className="border-t border-stone-150 pt-6">
              <h3 className="text-sm font-bold text-stone-700 uppercase tracking-wider mb-4">
                Uploaded Document File (License / Marksheet)
              </h3>
              {doctor.profile?.documentPdf ? (
                <div className="space-y-4">
                  {(doctor.profile.documentPdf.startsWith('data:application/pdf') || doctor.profile.documentPdf.includes('pdf')) ? (
                    <div className="rounded-2xl border border-stone-200 overflow-hidden shadow-inner">
                      <iframe
                        src={doctor.profile.documentPdf}
                        className="w-full h-[500px]"
                        title="Document Preview"
                      />
                    </div>
                  ) : (
                    <div className="p-6 rounded-2xl bg-amber-50 text-amber-800 text-xs border border-amber-200 text-center font-medium">
                      Uploaded document format is Word (.docx/.doc) or other format. Inline preview is only available for PDF. Please click the button below to download and view.
                    </div>
                  )}
                  <div>
                    <button
                      type="button"
                      onClick={downloadDocument}
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-xs font-bold transition shadow-md cursor-pointer"
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
          <div className="bg-white/80 backdrop-blur-xl border border-stone-200 rounded-3xl p-6 shadow-xl">
            <h2 className="text-xl font-black text-stone-900 mb-6 border-b pb-3 border-stone-100">
              Phase 3: Address & Preference Details
            </h2>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-xs font-black text-emerald-800 uppercase tracking-wider mb-3">
                  Current Address
                </h3>
                <div className="space-y-2">
                  <input readOnly className={FIELD_CLASS} value={doctor.profile?.currentAddress?.line1 || ''} placeholder="Line 1" />
                  <input readOnly className={FIELD_CLASS} value={doctor.profile?.currentAddress?.line2 || ''} placeholder="Line 2" />
                  <input readOnly className={FIELD_CLASS} value={`${doctor.profile?.currentAddress?.city || ''}, ${doctor.profile?.currentAddress?.state || ''}`} placeholder="City, State" />
                  <input readOnly className={FIELD_CLASS} value={doctor.profile?.currentAddress?.pincode || ''} placeholder="Pincode" />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-black text-stone-800 uppercase tracking-wider">
                    Permanent Address
                  </h3>
                  {same && (
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                      Same as Current
                    </span>
                  )}
                </div>
                {!same ? (
                  <div className="space-y-2">
                    <input readOnly className={FIELD_CLASS} value={doctor.profile?.permanentAddress?.line1 || ''} placeholder="Line 1" />
                    <input readOnly className={FIELD_CLASS} value={doctor.profile?.permanentAddress?.line2 || ''} placeholder="Line 2" />
                    <input readOnly className={FIELD_CLASS} value={`${doctor.profile?.permanentAddress?.city || ''}, ${doctor.profile?.permanentAddress?.state || ''}`} placeholder="City, State" />
                    <input readOnly className={FIELD_CLASS} value={doctor.profile?.permanentAddress?.pincode || ''} placeholder="Pincode" />
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-stone-50 border border-dashed border-stone-250 flex items-center justify-center h-[180px]">
                    <p className="text-stone-500 text-xs text-center font-medium">
                      Permanent Address is marked identical to the Current Address.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-stone-150 pt-6">
              <h3 className="text-xs font-black text-stone-800 uppercase tracking-wider mb-4">
                Preferred Work Branch (Clinic)
              </h3>
              <div className="p-4 bg-emerald-50/20 border border-emerald-100 rounded-2xl mb-6">
                {preferredClinic ? (
                  <div>
                    <h4 className="font-bold text-sm text-stone-900">{preferredClinic.name} ({preferredClinic.code})</h4>
                    <p className="text-xs text-stone-600 mt-1">{preferredClinic.address?.line1 || ''}, {preferredClinic.address?.city || ''}</p>
                    {preferredClinic.distance !== null && (
                      <p className="text-[10px] text-emerald-700 font-bold mt-2 uppercase tracking-wide">
                        Distance to doctor: {preferredClinic.distance.toFixed(1)} km
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-stone-500 italic">No preference specified by doctor</p>
                )}
              </div>

              {doctor.profile?.currentAddress?.latitude && doctor.profile?.currentAddress?.longitude ? (
                <div>
                  <h4 className="text-xs font-black text-stone-500 uppercase tracking-wider mb-3">
                    Map Location Coordinates
                  </h4>
                  <div className="h-64 rounded-2xl overflow-hidden border border-stone-250 shadow-inner">
                    <iframe
                      width="100%"
                      height="100%"
                      src={`https://maps.google.com/maps?q=${doctor.profile.currentAddress.latitude},${doctor.profile.currentAddress.longitude}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                      frameBorder="0"
                      scrolling="no"
                      marginHeight="0"
                      marginWidth="0"
                      title="Doctor Address Map"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <h4 className="text-xs font-black text-stone-500 uppercase tracking-wider mb-3">
                    Map Location Coordinates
                  </h4>
                  <div className="h-64 rounded-2xl border border-dashed border-stone-300 flex items-center justify-center bg-stone-50">
                    <p className="text-stone-500 text-xs italic font-medium">No map coordinates available for this address</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      case 4:
        const primaryClinic = clinics.find((c) => String(c._id) === String(primaryClinicId));

        return (
          <div className="space-y-6">
            {/* Clinic Assignment Card */}
            <div className="bg-white/80 backdrop-blur-xl border border-stone-200 rounded-3xl p-6 shadow-xl">
              <h2 className="text-xl font-black text-stone-900 mb-2">
                Phase 4: Clinic & Slot Assignment
              </h2>
              <div className="text-xs text-stone-500 mb-6 space-y-1">
                <p>• <strong>Primary Clinic</strong>: Always allowed offline regardless of distance.</p>
                <p>• <strong>Secondary Clinics (&le; 25km from Primary)</strong>: Offline allowed with at least 1.5-hour gap between sessions on the same day.</p>
                <p>• <strong>Secondary Clinics (25 - 50km from Primary)</strong>: Offline allowed on alternate days (different days of the week) only.</p>
                <p>• <strong>Secondary Clinics (&gt; 50km from Primary)</strong>: Online consultation only.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-2 border-b pb-6 mb-6">
                {clinics.map((c) => {
                  const isAssigned = assignedClinicIds.includes(c._id);
                  const isPrimary = String(c._id) === String(primaryClinicId);

                  // Calculate distance from primary clinic for secondary branches
                  let distToPrimary = null;
                  if (primaryClinic && !isPrimary && hasCoordinates(primaryClinic.address) && hasCoordinates(c.address)) {
                    distToPrimary = haversineDistance(
                      primaryClinic.address.latitude,
                      primaryClinic.address.longitude,
                      c.address.latitude,
                      c.address.longitude
                    );
                  }

                  // Determine offline allowance status label
                  let modeStatusLabel = 'Offline & Online';
                  let statusBg = 'bg-emerald-100 text-emerald-800 border border-emerald-200';
                  if (!isPrimary && distToPrimary !== null) {
                    if (distToPrimary > 50) {
                      modeStatusLabel = 'Online Only (>50km from Primary)';
                      statusBg = 'bg-rose-100 text-rose-800 border border-rose-200';
                    } else if (distToPrimary > 25) {
                      modeStatusLabel = 'Alternate Days Offline (25-50km)';
                      statusBg = 'bg-amber-100 text-amber-800 border border-amber-200';
                    }
                  }

                  return (
                    <div
                      key={c._id}
                      onClick={() => {
                        if (isAssigned) {
                          setAssignedClinicIds((prev) => prev.filter((id) => id !== c._id));
                          if (primaryClinicId === c._id) setPrimaryClinicId('');
                        } else {
                          setAssignedClinicIds((prev) => [...prev, c._id]);
                        }
                      }}
                      className={`p-4 rounded-2xl border-2 flex items-start space-x-3 cursor-pointer transition-all duration-200 ${
                        isAssigned ? 'border-emerald-600 bg-emerald-50/15' : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isAssigned}
                        onChange={() => {}}
                        className="mt-1 accent-emerald-600"
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
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {c.distance !== null && (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50/50 px-1.5 py-0.5 rounded">
                              {c.distance.toFixed(1)} km from doctor
                            </span>
                          )}
                          {distToPrimary !== null && (
                            <span className="text-[10px] font-bold text-indigo-800 bg-indigo-50/50 px-1.5 py-0.5 rounded">
                              {distToPrimary.toFixed(1)} km from Primary
                            </span>
                          )}
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${statusBg}`}>
                            {isPrimary ? 'Primary Clinic' : modeStatusLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {assignedClinicIds.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-2">
                      Primary Appointed Clinic
                    </label>
                    <select
                      value={primaryClinicId}
                      onChange={(e) => setPrimaryClinicId(e.target.value)}
                      className="w-full rounded-2xl border border-stone-350 bg-white px-4 py-3 text-sm text-stone-900"
                      required
                    >
                      <option value="" disabled>Select Primary Clinic...</option>
                      {clinics
                        .filter((c) => assignedClinicIds.includes(c._id))
                        .map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.name} ({c.code})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Weekly Availability Schedule Card */}
            {assignedClinicIds.length > 0 ? (
              <div className="bg-white/80 backdrop-blur-xl border border-stone-200 rounded-3xl p-6 shadow-xl">
                <h2 className="text-lg font-black text-stone-900 mb-4 border-b pb-2 border-stone-100">
                  Weekly Practice Availability Planner
                </h2>

                <div className="space-y-6">
                  {DAYS_OF_WEEK.map((day) => {
                    const daySlots = slots.filter((s) => s.dayOfWeek === day);
                    return (
                      <div key={day} className="border-b border-stone-100 pb-4 last:border-0 last:pb-0">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-xs font-black uppercase tracking-widest text-stone-800 capitalize">
                            {day}
                          </h4>
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => copyToWeekdays(day)}
                              className="rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 px-3 py-1.5 text-xs font-bold transition cursor-pointer"
                            >
                              📋 Apply to Weekdays (Mon-Fri)
                            </button>
                            <button
                              type="button"
                              onClick={() => addSlot(day)}
                              className="rounded-xl border border-emerald-600 text-emerald-700 hover:bg-emerald-50 px-3 py-1.5 text-xs font-bold transition cursor-pointer"
                            >
                              + Add Session Slot
                            </button>
                          </div>
                        </div>

                        {/* Daily Timeline Inputs */}
                        <div className="flex flex-wrap items-center gap-4 bg-stone-50 border border-stone-250 p-3 rounded-2xl mb-3">
                          <label className="flex items-center space-x-2 text-xs font-bold text-stone-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={dailyTimelines[day]?.enabled || false}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setDailyTimelines((prev) => ({
                                  ...prev,
                                  [day]: { ...prev[day], enabled: checked },
                                }));

                                // Automatically set a default whole-day slot for the primary clinic matching the timeline
                                if (checked) {
                                  const timeline = dailyTimelines[day];
                                  const tStart = timeline?.startTime || '09:00';
                                  const tEnd = timeline?.endTime || '18:00';
                                  const defaultClinic = primaryClinicId || assignedClinicIds[0] || '';

                                  setSlots((prev) => {
                                    // Filter out any existing slots for this day and insert the whole day slot
                                    const filtered = prev.filter((s) => s.dayOfWeek !== day);
                                    return [
                                      ...filtered,
                                      {
                                        id: `slot-${Date.now()}-${Math.random()}`,
                                        dayOfWeek: day,
                                        clinicId: defaultClinic,
                                        startTime: tStart,
                                        endTime: tEnd,
                                        consultationMode: 'offline',
                                        slotDurationMinutes: 30,
                                      }
                                    ];
                                  });
                                }
                              }}
                              className="accent-emerald-600 w-4 h-4 cursor-pointer"
                            />
                            <span>Enable Daily Timeline Restriction</span>
                          </label>

                          {dailyTimelines[day]?.enabled && (
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-stone-500 font-bold">Timeline Limit:</span>
                              <input
                                type="time"
                                value={dailyTimelines[day]?.startTime || '09:00'}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setDailyTimelines((prev) => ({
                                    ...prev,
                                    [day]: { ...prev[day], startTime: val },
                                  }));
                                }}
                                className="text-xs rounded-lg border border-stone-300 p-1.5 bg-white text-black"
                              />
                              <span className="text-xs text-stone-400">to</span>
                              <input
                                type="time"
                                value={dailyTimelines[day]?.endTime || '18:00'}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setDailyTimelines((prev) => ({
                                    ...prev,
                                    [day]: { ...prev[day], endTime: val },
                                  }));
                                }}
                                className="text-xs rounded-lg border border-stone-300 p-1.5 bg-white text-black"
                              />
                            </div>
                          )}

                          {(() => {
                            const res = checkDailyTimeline(day);
                            if (dailyTimelines[day]?.enabled) {
                              return (
                                <span
                                  className={`text-[10px] font-bold px-2 py-1 rounded-lg ml-auto ${
                                    res.isValid
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      : 'bg-rose-100 text-rose-800 border border-rose-250'
                                  }`}
                                >
                                  {res.isValid ? '✓ Timeline Match' : `✗ ${res.message}`}
                                </span>
                              );
                            }
                            return (
                              <span className="text-[10px] font-bold px-2 py-1 rounded-lg ml-auto bg-stone-100 text-stone-600 border border-stone-200">
                                Timeline Off
                              </span>
                            );
                          })()}
                        </div>

                        {daySlots.length === 0 ? (
                          <p className="text-xs text-stone-400 italic pl-1">Unavailable / No slots scheduled</p>
                        ) : (
                          <div className="space-y-3">
                            {daySlots.map((slot) => {
                              const slotClinic = clinics.find((c) => String(c._id) === String(slot.clinicId));
                              const offlineRestricted = slotClinic?.distance !== null && slotClinic?.distance > 60;

                              return (
                                <div
                                  key={slot.id}
                                  className="flex flex-wrap items-center gap-3 p-3 bg-stone-50 border rounded-xl border-stone-200"
                                >
                                  {/* Clinic Selection */}
                                  <div className="flex-1 min-w-[200px]">
                                    <select
                                      value={slot.clinicId}
                                      onChange={(e) => updateSlotField(slot.id, 'clinicId', e.target.value)}
                                      className="w-full text-xs bg-white rounded-lg border border-stone-300 p-2 text-black"
                                    >
                                      {clinics
                                        .filter((c) => assignedClinicIds.includes(c._id))
                                        .map((c) => (
                                          <option key={c._id} value={c._id}>
                                            {c.name} ({c.distance ? `${c.distance.toFixed(1)} km` : 'N/A'})
                                          </option>
                                        ))}
                                    </select>
                                  </div>

                                  {/* Start & End Times */}
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="time"
                                      value={slot.startTime}
                                      onChange={(e) => updateSlotField(slot.id, 'startTime', e.target.value)}
                                      className="text-xs rounded-lg border border-stone-300 p-2 bg-white text-black"
                                    />
                                    <span className="text-stone-400 text-xs">to</span>
                                    <input
                                      type="time"
                                      value={slot.endTime}
                                      onChange={(e) => updateSlotField(slot.id, 'endTime', e.target.value)}
                                      className="text-xs rounded-lg border border-stone-300 p-2 bg-white text-black"
                                    />
                                  </div>

                                  {/* Mode (Offline / Online) */}
                                  <div>
                                    <select
                                      value={slot.consultationMode}
                                      onChange={(e) => updateSlotField(slot.id, 'consultationMode', e.target.value)}
                                      className="text-xs rounded-lg border border-stone-300 p-2 bg-white text-black"
                                    >
                                      <option value="offline" disabled={offlineRestricted}>
                                        Offline (In-Clinic)
                                      </option>
                                      <option value="online">Online (Teleconsultation)</option>
                                    </select>
                                    {offlineRestricted && (
                                      <p className="text-[9px] text-rose-600 font-bold mt-1">
                                        Online only: Clinic is &gt;60km away.
                                      </p>
                                    )}
                                  </div>

                                  {/* Delete button */}
                                  <button
                                    type="button"
                                    onClick={() => removeSlot(slot.id)}
                                    className="ml-auto text-stone-400 hover:text-rose-600 text-xs font-bold p-1 cursor-pointer"
                                  >
                                    &times; Remove
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* Approval, Re-edit, Reject Panels */}
            {assignedClinicIds.length > 0 ? (
              <div className="grid md:grid-cols-3 gap-6">
                {/* Approve Form Card */}
                <div className="bg-emerald-50/50 border border-emerald-200 rounded-3xl p-6 shadow-lg md:col-span-2">
                  <h3 className="text-base font-black text-emerald-950 mb-4 uppercase tracking-wide">
                    Option A: Approve & Appoint
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Consultation Fee (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={consultationFee}
                        onChange={(e) => setConsultationFee(e.target.value)}
                        className="w-full bg-white rounded-xl border border-stone-300 p-2 text-xs font-medium text-black"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Follow-up Fee (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={followUpFee}
                        onChange={(e) => setFollowUpFee(e.target.value)}
                        className="w-full bg-white rounded-xl border border-stone-300 p-2 text-xs font-medium text-black"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleApproveSubmit}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 rounded-2xl transition shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Processing Approval...' : '✅ Approve & Issue Appointment'}
                  </button>
                </div>

                {/* Reject Card */}
                <div className="bg-rose-50/50 border border-rose-200 rounded-3xl p-6 shadow-lg flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-black text-rose-950 mb-3 uppercase tracking-wide">
                      Option B: Reject Request
                    </h3>
                    <p className="text-xs text-rose-700 font-medium mb-4">
                      Reject the doctor's registration request. This disables their login access permanently.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleRejectSubmit}
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-3 rounded-2xl transition shadow-md cursor-pointer disabled:opacity-50"
                  >
                    🚫 Reject & Discard
                  </button>
                </div>

                {/* Re-edit Request Card */}
                <div className="bg-amber-50/50 border border-amber-200 rounded-3xl p-6 shadow-lg md:col-span-3">
                  <h3 className="text-base font-black text-amber-950 mb-4 uppercase tracking-wide">
                    Option C: Send Back for Re-edit
                  </h3>
                  <p className="text-xs text-amber-800 font-medium mb-4">
                    If some files or details uploaded by the doctor are invalid or unclear, check the appropriate flags below and add explanatory comments.
                  </p>

                  <div className="flex flex-wrap gap-4 mb-4">
                    {Object.keys(reEditFields).map((field) => (
                      <label key={field} className="flex items-center space-x-2 text-xs font-bold text-stone-700 capitalize cursor-pointer">
                        <input
                          type="checkbox"
                          checked={reEditFields[field]}
                          onChange={(e) =>
                            setReEditFields((prev) => ({ ...prev, [field]: e.target.checked }))
                          }
                          className="accent-amber-600"
                        />
                        <span>{field.replace(/([A-Z])/g, ' $1')}</span>
                      </label>
                    ))}
                  </div>

                  <div className="mb-4">
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Comments / Description of Changes Needed
                    </label>
                    <textarea
                      placeholder="Explain to the doctor what changes are required (e.g. upload a clearer registration license PDF)..."
                      value={reEditComments}
                      onChange={(e) => setReEditComments(e.target.value)}
                      className="w-full text-xs rounded-xl border border-stone-300 p-3 bg-white h-20 outline-none focus:ring-2 focus:ring-amber-200"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleReEditSubmit}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-3 rounded-2xl transition shadow-md cursor-pointer disabled:opacity-50"
                  >
                    ✏️ Send Back to Doctor
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-8 min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-100">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-700">
              Administrative Panel
            </span>
            <h1 className="text-2xl font-black text-stone-900">Review Doctor Registration</h1>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="text-stone-600 hover:text-stone-800 text-sm font-bold flex items-center gap-1 border border-stone-300 px-4 py-2 bg-white rounded-xl shadow-sm cursor-pointer"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Phase Step indicators */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { step: 1, name: 'Phase 1: Basic Info' },
            { step: 2, name: 'Phase 2: Credentials' },
            { step: 3, name: 'Phase 3: Address & Map' },
            { step: 4, name: 'Phase 4: Clinics & Slots' },
          ].map((item) => (
            <div
              key={item.step}
              onClick={() => {
                // Allow jumping to steps only if loaded
                if (doctor) setStep(item.step);
              }}
              className={`text-center py-2.5 rounded-xl border cursor-pointer transition-all duration-300 ${
                step === item.step
                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/10'
                  : step > item.step
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950 font-bold'
                  : 'bg-white border-stone-200 text-stone-400 hover:text-stone-600'
              }`}
            >
              <div className="text-[10px] font-black uppercase tracking-wider">{item.name}</div>
            </div>
          ))}
        </div>

        {/* Render active phase content */}
        <div className="mb-6">{renderStepContent()}</div>

        {/* Step Navigation Buttons */}
        <div className="flex justify-between items-center mt-6">
          <button
            disabled={step === 1}
            onClick={goBack}
            className="px-5 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-bold text-xs bg-white hover:bg-stone-50 transition cursor-pointer disabled:opacity-50"
          >
            Previous Phase
          </button>
          
          {step < 4 && (
            <button
              onClick={goNext}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition shadow-md cursor-pointer"
            >
              Next Phase →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoctorReview;
