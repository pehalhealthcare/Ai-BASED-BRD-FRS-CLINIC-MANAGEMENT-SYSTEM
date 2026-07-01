// src/features/admin/DoctorEditPage.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doctorApi, clinicApi } from '../../lib/api';
import { haversineDistance } from '../../utils/geo';
import { toast } from 'react-hot-toast';
import LoadingState from '../../components/common/LoadingState';
import {
  Settings, Calendar, Search, Filter, Plus, Eye, Edit3, Trash,
  MoreVertical, Check, Star, Users, Briefcase, DollarSign,
  TrendingUp, Award, Clock, ArrowRight, ShieldAlert, GraduationCap,
  ChevronLeft, ChevronRight, Download, Ban, CalendarDays, CheckCircle,
  X, Info, AlertTriangle, RefreshCw, ZoomIn, ZoomOut, Maximize, Building, CheckSquare
} from 'lucide-react';

const DoctorEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [doctor, setDoctor] = useState(null);
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // States matching mockup
  const [assignedClinicIds, setAssignedClinicIds] = useState([]);
  const [primaryClinicId, setPrimaryClinicId] = useState('');
  const [consultationFee, setConsultationFee] = useState(500);
  const [followUpFee, setFollowUpFee] = useState(300);

  // Per-clinic fees state
  const [clinicFees, setClinicFees] = useState({}); // clinicId -> { consultationFee, followUpFee }

  // slots: [{ clinicId, dayOfWeek, isAvailable, startTime, endTime }]
  const [slots, setSlots] = useState([]);

  // Clinic consultation mode settings configured in the table
  const [clinicModes, setClinicModes] = useState({}); // clinicId -> 'offline' or 'online'

  // Slot duration
  const [selectedSlotDuration, setSelectedSlotDuration] = useState(30);

  // Maps and preview states
  const [mapZoom, setMapZoom] = useState(14);
  const [quickNote, setQuickNote] = useState('');

  const DAYS_OF_WEEK = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday'
  ];

  const TIME_OPTIONS = [
    '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
    '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM',
    '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
    '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM',
    '08:00 PM', '08:30 PM', '09:00 PM', '09:35 PM'
  ];

  // Helper: parse time HH:MM AM/PM to minutes
  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const match = timeStr.match(/^(\d+):(\d+)\s*(AM|PM)?$/i);
    if (!match) return 0;
    let hrs = Number(match[1]);
    const mins = Number(match[2]);
    const ampm = match[3];
    if (ampm) {
      if (ampm.toUpperCase() === 'PM' && hrs < 12) hrs += 12;
      if (ampm.toUpperCase() === 'AM' && hrs === 12) hrs = 0;
    }
    return hrs * 60 + mins;
  };

  // Helper: check coordinates
  const hasCoordinates = (addr) => {
    return addr && typeof addr.latitude === 'number' && typeof addr.longitude === 'number';
  };

  // Load doctor details and clinics
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [docRes, clinicsRes] = await Promise.all([
          doctorApi.get(id),
          clinicApi.list()
        ]);

        const foundDoctor = docRes.data?.doctor;
        if (!foundDoctor) {
          toast.error('Doctor details not found');
          navigate(-1);
          return;
        }

        setDoctor(foundDoctor);
        setConsultationFee(foundDoctor.profile?.consultationFee || foundDoctor.consultationFee || 500);
        setFollowUpFee(foundDoctor.profile?.followUpFee || foundDoctor.followUpFee || 300);
        setPrimaryClinicId(foundDoctor.clinicId?._id || foundDoctor.clinicId || '');
        
        const listAssigned = foundDoctor.assignedClinics || [];
        const primaryId = foundDoctor.clinicId?._id || foundDoctor.clinicId;
        const mergedIds = listAssigned.map(c => typeof c === 'string' ? c : c._id);
        if (primaryId && !mergedIds.includes(primaryId.toString())) {
          mergedIds.unshift(primaryId);
        }
        setAssignedClinicIds(mergedIds);

        // Prepopulate clinic modes and fees
        const initialModes = {};
        const initialFees = {};
        mergedIds.forEach((cid) => {
          initialModes[cid] = foundDoctor.profile?.clinicFees?.[cid]?.consultationMode || 'offline';
          initialFees[cid] = {
            consultationFee: foundDoctor.profile?.clinicFees?.[cid]?.consultationFee || foundDoctor.profile?.consultationFee || foundDoctor.consultationFee || 500,
            followUpFee: foundDoctor.profile?.clinicFees?.[cid]?.followUpFee || foundDoctor.profile?.followUpFee || foundDoctor.followUpFee || 300
          };
        });
        setClinicModes(initialModes);
        setClinicFees(initialFees);

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

        // Populate availability slots from doctor profile
        const initialSlots = [];
        filtered.forEach((c) => {
          DAYS_OF_WEEK.forEach((day) => {
            const matchSlot = foundDoctor.availability?.find(
              (s) => String(s.clinicId?._id || s.clinicId) === String(c._id) && s.dayOfWeek === day
            );
            initialSlots.push({
              clinicId: c._id,
              dayOfWeek: day,
              isAvailable: matchSlot ? matchSlot.isAvailable : false,
              startTime: matchSlot ? matchSlot.startTime : '09:00 AM',
              endTime: matchSlot ? matchSlot.endTime : '01:00 PM'
            });
          });
        });
        setSlots(initialSlots);

      } catch (err) {
        console.error(err);
        toast.error('Error loading doctor details');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, navigate]);

  // Haversine distance helper between two clinics
  const calculateDistance = (c1Id, c2Id) => {
    const c1 = clinics.find((c) => String(c._id) === String(c1Id));
    const c2 = clinics.find((c) => String(c._id) === String(c2Id));
    if (!c1 || !c2 || !hasCoordinates(c1.address) || !hasCoordinates(c2.address)) return 0;
    return haversineDistance(c1.address.latitude, c1.address.longitude, c2.address.latitude, c2.address.longitude);
  };

  // Determine allowed modes based on distance
  const getAutoAllowedMode = (clinicId) => {
    if (!primaryClinicId || String(clinicId) === String(primaryClinicId)) return 'offline';
    const dist = calculateDistance(primaryClinicId, clinicId);
    if (dist > 15) return 'online'; // Strict Online Only
    return clinicModes[clinicId] || 'offline';
  };

  // Live validator checks all slots against the distance and time gap rules
  const cellErrors = useMemo(() => {
    const errors = {}; // key: `${clinicId}-${dayOfWeek}`, value: error string message

    DAYS_OF_WEEK.forEach((day) => {
      // Find all active slots on this day
      const daySlots = slots.filter((s) => s.dayOfWeek === day && s.isAvailable && assignedClinicIds.includes(s.clinicId));
      if (daySlots.length === 0) return;

      // Sort chronologically by startTime
      daySlots.sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

      // 1. Check time gap between consecutive sessions (minimum 1.5 hours / 90 mins)
      for (let i = 0; i < daySlots.length - 1; i++) {
        const s1 = daySlots[i];
        const s2 = daySlots[i + 1];

        const s1End = parseTimeToMinutes(s1.endTime);
        const s2Start = parseTimeToMinutes(s2.startTime);
        const gap = s2Start - s1End;

        if (gap < 90) {
          const errMsg = `Time conflict: Gap between sessions must be >= 1.5 hrs`;
          errors[`${s1.clinicId}-${day}`] = errMsg;
          errors[`${s2.clinicId}-${day}`] = errMsg;
        }

        // 2. Distance check (> 25 km) on same day between different clinics (neither can be offline if distance > 25km)
        if (String(s1.clinicId) !== String(s2.clinicId)) {
          const dist = calculateDistance(s1.clinicId, s2.clinicId);
          const mode1 = getAutoAllowedMode(s1.clinicId);
          const mode2 = getAutoAllowedMode(s2.clinicId);

          if (dist > 25 && mode1 === 'offline' && mode2 === 'offline') {
            const errMsg = `Distance > 25km - both cannot be offline`;
            errors[`${s1.clinicId}-${day}`] = errMsg;
            errors[`${s2.clinicId}-${day}`] = errMsg;
          }
        }
      }
    });

    return errors;
  }, [slots, assignedClinicIds, primaryClinicId, clinicModes, clinics]);

  // Overall validation status
  const rulesValidation = useMemo(() => {
    const errorList = Object.values(cellErrors);
    return {
      isValid: errorList.length === 0,
      errors: Array.from(new Set(errorList))
    };
  }, [cellErrors]);

  const handleSaveChanges = async () => {
    if (!primaryClinicId) {
      toast.error('Please assign a primary clinic.');
      return;
    }
    if (!rulesValidation.isValid) {
      toast.error(rulesValidation.errors[0] || 'Schedule rules conflict. Please adjust timings.');
      return;
    }

    setIsSubmitting(true);
    try {
      const activeSlots = slots.filter((s) => s.isAvailable && assignedClinicIds.includes(s.clinicId));
      
      // Construct per-clinic clinicFees map for the payload
      const mappedClinicFees = {};
      assignedClinicIds.forEach((cid) => {
        mappedClinicFees[cid] = {
          consultationFee: Number(clinicFees[cid]?.consultationFee || consultationFee),
          followUpFee: Number(clinicFees[cid]?.followUpFee || followUpFee),
          consultationMode: getAutoAllowedMode(cid)
        };
      });

      const payload = {
        clinicId: primaryClinicId,
        assignedClinics: assignedClinicIds,
        consultationFee: Number(consultationFee),
        followUpFee: Number(followUpFee),
        clinicFees: mappedClinicFees,
        availability: activeSlots.map((s) => ({
          dayOfWeek: s.dayOfWeek,
          isAvailable: true,
          startTime: s.startTime,
          endTime: s.endTime,
          slotDurationMinutes: Number(selectedSlotDuration),
          clinicId: s.clinicId,
          consultationMode: getAutoAllowedMode(s.clinicId)
        })),
        note: quickNote
      };

      await doctorApi.update(doctor._id, payload);
      toast.success('Doctor details updated successfully!');
      navigate(-1);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to update doctor details');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading doctor details for editing..." />;
  }

  const preferredClinic = clinics.find((c) => String(c._id) === String(doctor?.profile?.preferredPracticeLocation));

  return (
    <div className="w-full min-h-screen bg-[#080e1a] text-slate-100 p-6 font-sans">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.06] mb-6">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="text-[10px] font-bold text-slate-400 hover:text-white flex items-center gap-1.5 transition uppercase tracking-wider mb-2"
          >
            &larr; Back to Doctor Details
          </button>
          <h1 className="text-xl font-black text-white">Edit Doctor Details</h1>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Manage doctor's clinic assignments, fees and schedule.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 text-xs font-bold transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveChanges}
            disabled={isSubmitting}
            className="px-5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1.3fr] gap-6">

        {/* LEFT COLUMN */}
        <div className="space-y-6">

          {/* Doctor Header Profile View */}
          <div className="bg-[#060d18] border border-white/[0.08] rounded-3xl p-6 flex items-center gap-4">
            {doctor.profile?.image ? (
              <img src={doctor.profile.image} alt={doctor.name} className="w-16 h-16 rounded-2xl object-cover border border-white/10 shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-white font-bold text-lg shrink-0">MD</div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-black text-white">{doctor.fullName || doctor.name}</h2>
                <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">Verified</span>
              </div>
              <p className="text-xs text-indigo-400 font-bold mt-1 flex items-center gap-1">
                <Briefcase size={12} /> {doctor.profile?.specialization || 'Cardiologist'}
              </p>
              <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                <span>Experience: {doctor.profile?.experienceYears || doctor.experienceYears || 3} Years</span>
                <span>•</span>
                <span>MBBS, MD ({doctor.profile?.qualification || 'Cardiology'})</span>
                <span>•</span>
                <span>Reg. No.: {doctor.profile?.medicalRegistrationNumber || 'REG-987654'}</span>
              </p>
              <p className="text-[9px] text-slate-505 mt-0.5">{doctor.email} | {doctor.phone || '+91 9990099900'}</p>
            </div>
          </div>

          {/* Verification Callout Block */}
          <div className="p-4 bg-slate-900/40 border border-white/5 rounded-3xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-400" />
              <span className="text-slate-400">Personal details are verified and cannot be edited.</span>
            </div>
            <button
              onClick={() => navigate(`/admin/doctors/${doctor._id}/review`)}
              className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold hover:underline"
            >
              View Full Profile
            </button>
          </div>

          {/* Assigned Clinics Widget */}
          <div className="bg-[#060d18] border border-white/[0.08] rounded-3xl p-6 space-y-4">
            <div className="flex justify-between items-center pb-2.5 border-b border-white/[0.04]">
              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Assigned Clinics</h3>
                <p className="text-[10px] text-slate-500">Manage clinics where doctor will be available.</p>
              </div>
              <button
                onClick={() => {
                  const nextUnassigned = clinics.find((c) => !assignedClinicIds.includes(c._id));
                  if (nextUnassigned) {
                    setAssignedClinicIds([...assignedClinicIds, nextUnassigned._id]);
                    setClinicFees({
                      ...clinicFees,
                      [nextUnassigned._id]: { consultationFee, followUpFee }
                    });
                  } else {
                    toast.error('All clinics are already assigned.');
                  }
                }}
                className="px-3 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white text-[10px] font-black rounded-lg transition flex items-center gap-1"
              >
                <Plus size={12} /> Add Clinic
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="text-slate-500 border-b border-white/[0.04]">
                    <th className="py-2.5 px-3">Clinic / Branch</th>
                    <th className="py-2.5 px-3 text-center">Type</th>
                    <th className="py-2.5 px-3 text-center">Distance from Primary</th>
                    <th className="py-2.5 px-3 text-center">Default Mode</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {assignedClinicIds.map((id) => {
                    const clinic = clinics.find((c) => String(c._id) === String(id));
                    if (!clinic) return null;
                    const isPrimary = String(id) === String(primaryClinicId);
                    const dist = isPrimary ? 0 : calculateDistance(primaryClinicId, id);
                    const isOnlineRestricted = dist > 15 && !isPrimary;

                    return (
                      <tr key={id} className="border-b border-white/[0.02] hover:bg-white/[0.01]">
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-200">{clinic.name}</p>
                          <p className="text-[9px] text-slate-505 mt-0.5">{clinic.address?.city || 'UP'}</p>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <label className="inline-flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name="editPrimaryRadio"
                              checked={isPrimary}
                              onChange={() => {
                                setPrimaryClinicId(id);
                              }}
                              className="accent-indigo-600 bg-slate-900 border-white/10"
                            />
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${
                              isPrimary
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                                : 'bg-slate-800 text-slate-450 border border-white/5 hover:bg-slate-700'
                            }`}>
                              {isPrimary ? 'Primary' : 'Secondary'}
                            </span>
                          </label>
                        </td>
                        <td className="py-3 px-3 text-center text-slate-350">{isPrimary ? '0 km' : `${dist.toFixed(1)} km`}</td>
                        <td className="py-3 px-3 text-center">
                          {isOnlineRestricted ? (
                            <span className="px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/15 rounded text-[10px] font-bold">
                              Online Only
                            </span>
                          ) : (
                            <select
                              value={clinicModes[id] || 'offline'}
                              onChange={(e) => {
                                setClinicModes({
                                  ...clinicModes,
                                  [id]: e.target.value
                                });
                              }}
                              className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-slate-200 text-[10px] outline-none"
                            >
                              <option value="offline">Offline & Online</option>
                              <option value="online">Online Only</option>
                            </select>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {!isPrimary && (
                            <button
                              onClick={() => {
                                setAssignedClinicIds(assignedClinicIds.filter((cid) => cid !== id));
                                const updatedFees = { ...clinicFees };
                                delete updatedFees[id];
                                setClinicFees(updatedFees);
                              }}
                              className="p-1.5 rounded bg-slate-900 border border-white/5 hover:border-white/10 text-slate-450 hover:text-rose-500 transition"
                            >
                              <Trash size={12} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center text-[10px] text-slate-500 pt-2 border-t border-white/[0.04]">
              <p>* Distance & Time gap rules are enforced based on the primary clinic location.</p>
              <button
                onClick={() => toast.success('Distance and gap rules are configured on the right panel.')}
                className="px-2 py-1 bg-slate-900 border border-white/15 rounded hover:text-white text-[9px] font-bold"
              >
                View Rules
              </button>
            </div>
          </div>

          {/* Allotted Schedule & Slots Widget */}
          <div className="bg-[#060d18] border border-white/[0.08] rounded-3xl p-6 space-y-4">
            <div className="flex justify-between items-center pb-2.5 border-b border-white/[0.04]">
              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Allotted Schedule & Slots</h3>
                <p className="text-[10px] text-slate-500">Manage weekly availability, slot duration and mode for each clinic.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-550 font-bold">Slot Duration</span>
                <select
                  value={selectedSlotDuration}
                  onChange={(e) => setSelectedSlotDuration(Number(e.target.value))}
                  className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                >
                  <option value="15">15 Minutes</option>
                  <option value="30">30 Minutes</option>
                  <option value="45">45 Minutes</option>
                  <option value="60">60 Minutes</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              {assignedClinicIds.map((cid) => {
                const clinic = clinics.find((c) => String(c._id) === String(cid));
                if (!clinic) return null;
                const isPrimary = String(cid) === String(primaryClinicId);
                const dist = isPrimary ? 0 : calculateDistance(primaryClinicId, cid);
                const mode = getAutoAllowedMode(cid);

                return (
                  <div key={cid} className="p-4 bg-slate-900/35 border border-white/5 rounded-2xl space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-white/5">
                      <span className="font-bold text-slate-200 text-xs">
                        {clinic.name} ({isPrimary ? 'Primary' : `Secondary, ${dist.toFixed(1)} km`})
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                        mode === 'online' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {mode === 'online' ? 'Online Only' : 'Offline & Online'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                      {DAYS_OF_WEEK.map((day) => {
                        const slotIdx = slots.findIndex((s) => s.clinicId === cid && s.dayOfWeek === day);
                        const slot = slots[slotIdx];
                        const isAvailable = slot?.isAvailable || false;
                        const hasError = !!cellErrors[`${cid}-${day}`];
                        const errorMsg = cellErrors[`${cid}-${day}`];

                        return (
                          <div key={day} className={`p-2 rounded-xl border text-center transition-all ${
                            hasError
                              ? 'bg-rose-500/5 border-rose-500/25'
                              : isAvailable
                                ? 'bg-indigo-650/10 border-indigo-650/25'
                                : 'bg-slate-955/20 border-white/5'
                          }`}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="capitalize font-bold text-[9px] text-slate-450">{day.slice(0, 3)}</span>
                              <input
                                type="checkbox"
                                checked={isAvailable}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setSlots(slots.map((s) => {
                                    if (s.clinicId === cid && s.dayOfWeek === day) {
                                      return { ...s, isAvailable: checked };
                                    }
                                    return s;
                                  }));
                                }}
                                className="rounded border-white/10 bg-slate-950 text-indigo-600 focus:ring-indigo-500 w-3 h-3 cursor-pointer"
                              />
                            </div>

                            {isAvailable ? (
                              <div className="space-y-1 mt-1.5 w-full">
                                <select
                                  value={slot.startTime}
                                  onChange={(e) => {
                                    setSlots(slots.map((s) => {
                                      if (s.clinicId === cid && s.dayOfWeek === day) {
                                        return { ...s, startTime: e.target.value };
                                      }
                                      return s;
                                    }));
                                  }}
                                  className="w-full bg-slate-950 border border-white/10 rounded text-[9px] text-white p-0.5 text-center"
                                >
                                  {TIME_OPTIONS.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                  ))}
                                </select>
                                <p className="text-[7px] text-slate-605">to</p>
                                <select
                                  value={slot.endTime}
                                  onChange={(e) => {
                                    setSlots(slots.map((s) => {
                                      if (s.clinicId === cid && s.dayOfWeek === day) {
                                        return { ...s, endTime: e.target.value };
                                      }
                                      return s;
                                    }));
                                  }}
                                  className="w-full bg-slate-955 border border-white/10 rounded text-[9px] text-white p-0.5 text-center"
                                >
                                  {TIME_OPTIONS.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                  ))}
                                </select>
                              </div>
                            ) : (
                              <span className="text-[8px] text-slate-655 font-bold block mt-3">Off</span>
                            )}

                            {hasError && isAvailable && (
                              <p className="text-[7px] text-rose-450 leading-tight mt-1.5 p-0.5 border border-rose-500/10 bg-rose-500/5 rounded">
                                {errorMsg}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">

          {/* Location Details */}
          <div className="bg-[#060d18] border border-white/[0.08] rounded-3xl p-5 space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Building size={13} className="text-purple-400" /> Location Details
            </h4>
            <div className="grid grid-cols-1 gap-3 text-[10px]">
              <div>
                <p className="text-slate-500 font-semibold uppercase">Current Location (at time of application)</p>
                <p className="text-slate-200 mt-1 leading-relaxed">{doctor.profile?.currentAddress?.line1 || 'Indirapuram, Ghaziabad, Uttar Pradesh 201010, India'}</p>
              </div>
              <div>
                <div className="flex justify-between items-center">
                  <p className="text-slate-505 font-semibold uppercase">Primary Location (Address Proof)</p>
                  <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 px-1 rounded font-bold uppercase">Same as Current</span>
                </div>
                <p className="text-slate-200 mt-1 leading-relaxed">{doctor.profile?.permanentAddress?.line1 || 'Indirapuram, Ghaziabad, Uttar Pradesh 201010, India'}</p>
              </div>
            </div>

            <div className="h-40 rounded-2xl overflow-hidden border border-white/10 bg-slate-950/40 relative">
              <div className="absolute bottom-2 right-2 bg-slate-955/85 backdrop-blur-sm border border-white/10 rounded-lg p-1 flex flex-col gap-1.5 z-10 text-white">
                <button
                  type="button"
                  onClick={() => setMapZoom(Math.min(20, mapZoom + 1))}
                  className="p-1 hover:bg-white/10 text-slate-300 hover:text-white transition rounded"
                >
                  <ZoomIn size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => setMapZoom(Math.max(10, mapZoom - 1))}
                  className="p-1 hover:bg-white/10 text-slate-300 hover:text-white transition rounded"
                >
                  <ZoomOut size={12} />
                </button>
              </div>
              {doctor.profile?.currentAddress?.latitude ? (
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://maps.google.com/maps?q=${doctor.profile.currentAddress.latitude},${doctor.profile.currentAddress.longitude}&t=&z=${mapZoom}&ie=UTF8&iwloc=&output=embed`}
                  frameBorder="0"
                  title="Doctor Edit Address Map"
                  className="opacity-75"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500 italic">No address coordinates available.</div>
              )}
            </div>
          </div>

          {/* Documents & Credentials */}
          <div className="bg-[#060d18] border border-white/[0.08] rounded-3xl p-5 space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <GraduationCap size={14} className="text-indigo-400" /> Documents & Credentials
            </h4>

            <div className="space-y-2">
              {[
                { name: 'Medical Registration Certificate', file: 'medical_registration_certificate.pdf' },
                { name: 'Qualification Certificate', file: 'md_certificate.pdf' },
                { name: 'Experience Certificate', file: 'experience_certificate.pdf' }
              ].map((docItem) => (
                <div key={docItem.name} className="p-3 bg-slate-955/50 border border-white/5 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white text-[10px]">{docItem.name}</p>
                    <p className="text-[8px] text-slate-505 mt-0.5">{docItem.file}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const pdfUrl = doctor.profile?.documentPdf;
                      if (pdfUrl) window.open(pdfUrl, '_blank');
                      else toast.error('No document file attached.');
                    }}
                    className="p-1.5 rounded bg-slate-900 border border-white/5 hover:border-white/10 text-slate-400 hover:text-white transition"
                  >
                    <Eye size={12} />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                const pdfUrl = doctor.profile?.documentPdf;
                if (pdfUrl) window.open(pdfUrl, '_blank');
                else toast.error('No document file attached.');
              }}
              className="w-full py-2 bg-slate-900 border border-white/10 hover:bg-white/5 text-white text-[10px] font-bold rounded-xl transition uppercase tracking-wider"
            >
              View All Documents
            </button>
          </div>

          {/* Fees & Charges (Interactive editable inputs) */}
          <div className="bg-[#060d18] border border-white/[0.08] rounded-3xl p-5 space-y-4">
            <div className="flex justify-between items-center pb-1 border-b border-white/[0.04]">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign size={13} className="text-indigo-400" /> Fees & Charges
              </h4>
              <button
                type="button"
                onClick={() => toast.success('Modify specific clinic fees below in real-time.')}
                className="px-2 py-1 bg-slate-900 border border-white/10 rounded hover:text-white text-[9px] font-bold"
              >
                Edit Fees
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Consultation Fee</p>
                <div className="space-y-2 mt-2">
                  {assignedClinicIds.map((cid) => {
                    const clinicObj = clinics.find(cl => String(cl._id) === String(cid));
                    if (!clinicObj) return null;
                    const feeVal = clinicFees[cid]?.consultationFee || consultationFee;

                    return (
                      <div key={cid} className="flex items-center justify-between gap-3 text-[11px]">
                        <span className="text-slate-400 truncate max-w-[150px]">{clinicObj.name}</span>
                        <div className="flex items-center bg-slate-955 border border-white/10 rounded-lg px-2 py-1 w-20 shrink-0">
                          <span className="text-[10px] text-slate-500 mr-1">₹</span>
                          <input
                            type="number"
                            min="0"
                            value={feeVal}
                            onChange={(e) => {
                              setClinicFees({
                                ...clinicFees,
                                [cid]: {
                                  ...clinicFees[cid],
                                  consultationFee: Number(e.target.value)
                                }
                              });
                            }}
                            className="bg-transparent border-0 outline-none text-slate-200 font-extrabold text-xs w-full text-right"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-white/[0.03]">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Follow-up Fee (Within 7 Days)</p>
                <div className="space-y-2 mt-2">
                  {assignedClinicIds.map((cid) => {
                    const clinicObj = clinics.find(cl => String(cl._id) === String(cid));
                    if (!clinicObj) return null;
                    const feeVal = clinicFees[cid]?.followUpFee || followUpFee;

                    return (
                      <div key={cid} className="flex items-center justify-between gap-3 text-[11px]">
                        <span className="text-slate-400 truncate max-w-[150px]">{clinicObj.name}</span>
                        <div className="flex items-center bg-slate-955 border border-white/10 rounded-lg px-2 py-1 w-20 shrink-0">
                          <span className="text-[10px] text-slate-505 mr-1">₹</span>
                          <input
                            type="number"
                            min="0"
                            value={feeVal}
                            onChange={(e) => {
                              setClinicFees({
                                ...clinicFees,
                                [cid]: {
                                  ...clinicFees[cid],
                                  followUpFee: Number(e.target.value)
                                }
                              });
                            }}
                            className="bg-transparent border-0 outline-none text-slate-200 font-extrabold text-xs w-full text-right"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Summary Status */}
          <div className="bg-[#060d18] border border-white/[0.08] rounded-3xl p-5 space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckSquare size={13} className="text-indigo-400" /> Summary Status
            </h4>
            <div className="space-y-2 text-[10px]">
              <div className="flex justify-between"><span className="text-slate-400">Profile & Documents</span><span className="text-emerald-400 font-bold">Verified</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Clinic Assignments</span><span className="text-emerald-400 font-bold">Configured</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Availability Schedule</span><span className="text-emerald-400 font-bold">Configured</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Rules Validation</span><span className="text-emerald-400 font-bold">No Errors</span></div>
            </div>
          </div>

          {/* Notes Card */}
          <div className="bg-[#060d18] border border-white/[0.08] rounded-3xl p-5 space-y-2">
            <label className="block text-xs font-bold text-slate-450 uppercase">Notes (Optional)</label>
            <textarea
              placeholder="Add a note for internal reference..."
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-slate-650 focus:outline-none focus:border-indigo-500 resize-none h-16"
            />
            <p className="text-[8px] text-slate-505">This note is for internal use only and will not be visible to the doctor.</p>
          </div>

        </div>

      </div>

      {/* Footer warning bar */}
      <div className="p-4 bg-[#0a1324] border border-white/[0.06] rounded-3xl mt-6 space-y-0.5">
        <p className="text-[10px] font-bold text-amber-500 flex items-center gap-1">
          <AlertTriangle size={12} /> Important
        </p>
        <p className="text-[9px] text-slate-505 leading-relaxed">
          All scheduling rules (distance, time gap, and mode restrictions) are automatically validated. The doctor will be able to start accepting appointments once approved.
        </p>
      </div>

    </div>
  );
};

export default DoctorEditPage;
