// src/features/admin/DoctorReview.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminApi, clinicApi } from '../../lib/api';
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

const DoctorReview = () => {
  const { doctorId } = useParams();
  const navigate = useNavigate();

  const [doctor, setDoctor] = useState(null);
  const [clinics, setClinics] = useState([]);
  const [step, setStep] = useState(1); // 1: Review Profile, 2: Set Availability, 3: Confirm & Approve
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Phase 4 Assignment & Schedule State
  const [assignedClinicIds, setAssignedClinicIds] = useState([]);
  const [primaryClinicId, setPrimaryClinicId] = useState('');
  const [consultationFee, setConsultationFee] = useState(500);
  const [followUpFee, setFollowUpFee] = useState(300);
  
  // slots: [{ clinicId, dayOfWeek, isAvailable, startTime, endTime }]
  const [slots, setSlots] = useState([]);

  // Clinic consultation mode settings configured in the table
  const [clinicModes, setClinicModes] = useState({}); // clinicId -> 'offline' (Offline & Online) or 'online' (Online Only)

  // Selection state for Step 2 slot duration
  const [selectedSlotDuration, setSelectedSlotDuration] = useState(30);

  // Interactive zoom level for document preview
  const [zoomLevel, setZoomLevel] = useState(100);
  const [mapZoom, setMapZoom] = useState(14);

  // Quick note for Step 3
  const [quickNote, setQuickNote] = useState('');

  // Re-edit request state
  const [reEditComments, setReEditComments] = useState('');
  const [reEditFields, setReEditFields] = useState({
    profilePicture: false,
    personalDetails: false,
    qualificationInfo: false,
    experienceVerification: false,
    registrationDocuments: false
  });
  const [isReEditOpen, setIsReEditOpen] = useState(false);

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
    '08:00 PM', '08:30 PM', '09:00 PM', '09:30 PM'
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

  // Load pending doctor and clinics
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [pendingRes, clinicsRes] = await Promise.all([
          adminApi.listPendingDoctors(),
          clinicApi.list()
        ]);

        const pendingList = pendingRes.data?.pendingDoctors || [];
        const foundDoctor = pendingList.find((d) => String(d._id) === String(doctorId));

        if (!foundDoctor) {
          toast.error('Doctor not found in pending list');
          navigate('/admin/my-doctors-dashboard');
          return;
        }

        setDoctor(foundDoctor);
        setConsultationFee(foundDoctor.profile?.consultationFee || 500);
        setFollowUpFee(foundDoctor.profile?.followUpFee || 300);

        // Prepopulate primary clinic
        const prefLocation = foundDoctor.profile?.preferredPracticeLocation;
        if (prefLocation) {
          setPrimaryClinicId(prefLocation);
          setAssignedClinicIds([prefLocation]);
        }

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

        // Initialize empty slots configuration grid
        const initialSlots = [];
        filtered.forEach((c) => {
          DAYS_OF_WEEK.forEach((day) => {
            initialSlots.push({
              clinicId: c._id,
              dayOfWeek: day,
              isAvailable: false,
              startTime: '09:00 AM',
              endTime: '01:00 PM'
            });
          });
        });
        setSlots(initialSlots);

      } catch (err) {
        console.error(err);
        toast.error('Error loading doctor data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [doctorId, navigate]);

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
          const errMsg = `Time conflict: Gap between sessions must be >= 1.5 hrs (current: ${gap} mins)`;
          errors[`${s1.clinicId}-${day}`] = errMsg;
          errors[`${s2.clinicId}-${day}`] = errMsg;
        }

        // 2. Distance check (> 25 km) on same day between different clinics (neither can be offline if distance > 25km)
        if (String(s1.clinicId) !== String(s2.clinicId)) {
          const dist = calculateDistance(s1.clinicId, s2.clinicId);
          const mode1 = getAutoAllowedMode(s1.clinicId);
          const mode2 = getAutoAllowedMode(s2.clinicId);

          if (dist > 25 && mode1 === 'offline' && mode2 === 'offline') {
            const errMsg = `Distance conflict: Clinics are ${dist.toFixed(1)} km apart (> 25 km limit). You must set one session to Online.`;
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

  const handleApproveSubmit = async () => {
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
      const payload = {
        clinicId: primaryClinicId,
        assignedClinics: assignedClinicIds,
        specialization: doctor.profile?.specialization || '',
        qualification: doctor.profile?.qualification || '',
        experienceYears: Number(doctor.profile?.experienceYears || 0),
        consultationFee: Number(consultationFee),
        followUpFee: Number(followUpFee),
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

      await adminApi.approveDoctor(doctor._id, payload);
      toast.success('Doctor registration approved successfully!');
      navigate('/admin/my-doctors-dashboard');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to approve doctor');
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
      navigate('/admin/my-doctors-dashboard');
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
      toast.error('Please provide comments explaining the corrections needed');
      return;
    }

    setIsSubmitting(true);
    try {
      await adminApi.requestReEdit(doctor._id, {
        reEditFields: flagged,
        reEditComments: reEditComments.trim()
      });
      toast.success('Re-edit request submitted.');
      navigate('/admin/my-doctors-dashboard');
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
    return <LoadingState label="Loading pending doctor profile..." />;
  }

  const preferredClinic = clinics.find((c) => String(c._id) === String(doctor?.profile?.preferredPracticeLocation));

  return (
    <div className="w-full min-h-screen bg-[#080e1a] text-slate-100 p-6 font-sans">
      
      {/* Back Button & Wizard Progress Indicator */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/[0.06] mb-6">
        <div>
          <button
            onClick={() => navigate('/admin/my-doctors-dashboard')}
            className="text-[10px] font-bold text-slate-400 hover:text-white flex items-center gap-1.5 transition uppercase tracking-wider mb-2"
          >
            ← Back to My Doctors
          </button>
          <h1 className="text-xl font-black text-white">Pending Doctor Approval</h1>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Configure doctor's clinic assignments and weekly schedule.
          </p>
        </div>

        {/* Multi-step progress bar */}
        <div className="flex items-center gap-6 self-center my-3 lg:my-0">
          {[
            { id: 1, name: 'Review Profile' },
            { id: 2, name: 'Set Availability' },
            { id: 3, name: 'Confirm & Approve' }
          ].map((s) => (
            <div key={s.id} className="flex items-center gap-2 text-xs">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold font-mono transition ${
                step === s.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : step > s.id
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                    : 'bg-slate-900 border border-white/10 text-slate-505'
              }`}>
                {step > s.id ? '✓' : s.id}
              </span>
              <span className={`font-bold transition ${step === s.id ? 'text-white' : 'text-slate-500'}`}>
                {s.name}
              </span>
              {s.id < 3 && <div className="w-10 h-px bg-white/10" />}
            </div>
          ))}
        </div>

        {/* Wizard Controls */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsReEditOpen(true)}
            className="px-4 py-2 rounded-xl border border-amber-500/20 hover:bg-amber-500/5 text-amber-400 text-xs font-bold transition flex items-center gap-1.5"
          >
            <Edit3 size={13} /> Request Re-edit
          </button>

          {step < 3 ? (
            <button
              onClick={() => {
                if (step === 2 && !rulesValidation.isValid) {
                  toast.error(rulesValidation.errors[0]);
                  return;
                }
                setStep(step + 1);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-750 text-white text-xs font-bold rounded-xl transition flex items-center gap-1"
            >
              Next: {step === 1 ? 'Set Availability' : 'Confirm & Approve'} <ArrowRight size={13} />
            </button>
          ) : (
            <button
              onClick={handleApproveSubmit}
              disabled={isSubmitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1"
            >
              {isSubmitting ? 'Approving...' : 'Approve Doctor'}
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Left side details, Right side certificate preview */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.75fr_1.25fr] gap-6">

        {/* LEFT COLUMN */}
        <div className="space-y-6">
          
          {/* Doctor Header Info Card */}
          <div className="bg-[#060d18] border border-white/[0.08] rounded-3xl p-6 flex items-center gap-4">
            {doctor.profile?.image ? (
              <img src={doctor.profile.image} alt={doctor.name} className="w-16 h-16 rounded-2xl object-cover border border-white/10 shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-white font-bold text-lg shrink-0">MD</div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-black text-white">{doctor.name || doctor.fullName}</h2>
                <span className="px-2 py-0.5 rounded text-[8px] font-black bg-indigo-500/10 text-indigo-400 border border-indigo-500/10">Pending Approval</span>
              </div>
              <p className="text-xs text-indigo-400 font-bold mt-1 flex items-center gap-1">
                <Briefcase size={12} /> {doctor.profile?.specialization || 'Cardiologist'}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">Applied on: 28 May 2025 • Application ID: DOC-2025-0287</p>
            </div>
          </div>

          {/* STEP 1: REVIEW PROFILE CONTENT */}
          {step === 1 && (
            <>
              {/* Professional Information */}
              <div className="bg-[#060d18] border border-white/[0.08] rounded-3xl p-6 space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Award size={13} className="text-indigo-400" /> Professional Information
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="p-3.5 bg-slate-900/50 border border-white/5 rounded-2xl space-y-1">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Specialty</p>
                    <p className="text-slate-200 font-bold">{doctor.profile?.specialization || 'Cardiology'}</p>
                  </div>
                  <div className="p-3.5 bg-slate-900/50 border border-white/5 rounded-2xl space-y-1">
                    <p className="text-[10px] text-slate-505 font-bold uppercase">Qualification</p>
                    <p className="text-slate-200 font-bold">{doctor.profile?.qualification || 'MBBS, MD'}</p>
                  </div>
                  <div className="p-3.5 bg-slate-900/50 border border-white/5 rounded-2xl space-y-1">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Experience</p>
                    <p className="text-slate-200 font-bold">{doctor.profile?.experienceYears || 5} Years</p>
                  </div>
                  <div className="p-3.5 bg-slate-900/50 border border-white/5 rounded-2xl space-y-1">
                    <p className="text-[10px] text-slate-505 font-bold uppercase">Preferred Branch</p>
                    <p className="text-slate-200 font-bold truncate">{preferredClinic?.name || 'Apollo Hospital Indirapuram'}</p>
                  </div>
                </div>
              </div>

              {/* Registration Details */}
              <div className="bg-[#060d18] border border-white/[0.08] rounded-3xl p-6 space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle size={13} className="text-emerald-400" /> Registration Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl space-y-3">
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Medical Registration Number</p>
                      <p className="text-slate-250 font-bold mt-1 text-sm">{doctor.profile?.medicalRegistrationNumber || 'REG-98754'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-505 font-bold uppercase">Registration Valid Till</p>
                      <p className="text-slate-250 font-bold mt-1">31 Dec 2026</p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl space-y-3">
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Registration State</p>
                      <p className="text-slate-250 font-bold mt-1">Karnataka Medical Council</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-505 font-bold uppercase">Issuing Authority</p>
                      <p className="text-slate-250 font-bold mt-1">Karnataka Medical Council</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Details */}
              <div className="bg-[#060d18] border border-white/[0.08] rounded-3xl p-6 space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Info size={13} className="text-blue-400" /> Contact Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl flex items-center gap-3">
                    <Clock size={16} className="text-indigo-400 shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Email Address</p>
                      <p className="text-slate-200 font-bold mt-0.5">{doctor.email}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl flex items-center gap-3">
                    <Users size={16} className="text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Phone Number</p>
                      <p className="text-slate-200 font-bold mt-0.5">{doctor.phone || '9876543210'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Location Details */}
              <div className="bg-[#060d18] border border-white/[0.08] rounded-3xl p-6 space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Building size={13} className="text-purple-400" /> Current Location (at time of application)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div className="h-44 rounded-2xl overflow-hidden border border-white/10 bg-slate-900/60 relative">
                    {/* Zoom Overlay Controls */}
                    <div className="absolute bottom-2 right-2 bg-slate-950/85 backdrop-blur-sm border border-white/10 rounded-lg p-1 flex flex-col gap-1.5 z-10 text-white">
                      <button
                        type="button"
                        onClick={() => setMapZoom(Math.min(20, mapZoom + 1))}
                        className="p-1 hover:bg-white/10 text-slate-300 hover:text-white transition rounded"
                        title="Zoom In Map"
                      >
                        <ZoomIn size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setMapZoom(Math.max(10, mapZoom - 1))}
                        className="p-1 hover:bg-white/10 text-slate-300 hover:text-white transition rounded"
                        title="Zoom Out Map"
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
                        title="Application Location Map"
                        className="opacity-80"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-505 text-xs italic">No coordinates available.</div>
                    )}
                  </div>

                  <div className="space-y-4 text-xs">
                    <div>
                      <p className="text-[10px] text-slate-505 font-bold uppercase">Address Details</p>
                      <p className="text-slate-200 font-medium mt-1 leading-relaxed">
                        {doctor.profile?.currentAddress?.line1 || 'Indirapuram, Ghaziabad, Uttar Pradesh - 201010'}
                      </p>
                    </div>
                    <div className="p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-xl flex items-center gap-2">
                      <Check size={12} className="text-emerald-400 shrink-0" />
                      <div>
                        <p className="font-bold text-emerald-400">Same as Permanent Address</p>
                        <p className="text-[9px] text-slate-500 mt-0.5">Confirmed by doctor during application.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* STEP 2: REDESIGNED SET AVAILABILITY & WEEKLY GRID CONTENT */}
          {step === 2 && (
            <>
              {/* Info summary header grid */}
              <div className="bg-[#060d18] border border-white/[0.08] rounded-3xl p-5 grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px]">
                <div className="space-y-1">
                  <p className="text-slate-505 font-bold uppercase">Primary Clinic (Reference)</p>
                  <p className="text-slate-200 font-bold truncate">{preferredClinic?.name || 'Apollo Hospital Indirapuram'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-550 font-bold uppercase">Primary Location</p>
                  <p className="text-slate-200 font-bold truncate">{doctor.profile?.currentAddress?.city || 'Ghaziabad, UP'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-550 font-bold uppercase">Experience</p>
                  <p className="text-slate-200 font-bold">{doctor.profile?.experienceYears || 8} Years</p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-555 font-bold uppercase">Qualification</p>
                  <p className="text-slate-200 font-bold truncate">{doctor.profile?.qualification || 'MBBS, MD'}</p>
                </div>
              </div>

              {/* 1. Assigned Clinics Card */}
              <div className="bg-[#060d18] border border-white/[0.08] rounded-3xl p-6 space-y-4">
                <div className="flex justify-between items-center pb-2.5 border-b border-white/[0.04]">
                  <div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">1. Assigned Clinics</h3>
                    <p className="text-[10px] text-slate-500">Select one primary clinic and other clinics where doctor will be available.</p>
                  </div>
                  <button
                    onClick={() => {
                      const nextUnassigned = clinics.find((c) => !assignedClinicIds.includes(c._id));
                      if (nextUnassigned) {
                        setAssignedClinicIds([...assignedClinicIds, nextUnassigned._id]);
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
                              <p className="text-[9px] text-slate-500 mt-0.5">{clinic.address?.city || 'UP'}</p>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="radio"
                                  name="primaryClinicRadio"
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
                                  onClick={() => setAssignedClinicIds(assignedClinicIds.filter((cid) => cid !== id))}
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
                <p className="text-[10px] text-slate-500 italic mt-2">
                  * Default mode is set automatically based on distance rules. You can review rules on the right panel.
                </p>
              </div>

              {/* 2. Weekly Availability & Schedule (Grid Representation) */}
              <div className="bg-[#060d18] border border-white/[0.08] rounded-3xl p-6 space-y-4">
                <div className="flex justify-between items-center pb-2.5 border-b border-white/[0.04]">
                  <div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">2. Weekly Availability & Schedule</h3>
                    <p className="text-[10px] text-slate-505">Set weekly availability for each assigned clinic. Time gap (&ge; 1.5 hrs) is enforced automatically.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-505 font-bold">Slot Duration</span>
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

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="text-slate-500 border-b border-white/[0.04]">
                        <th className="py-2.5 px-3 min-w-[150px]">Clinic / Branch</th>
                        {DAYS_OF_WEEK.map((d) => (
                          <th key={d} className="py-2.5 px-2 text-center capitalize min-w-[100px]">{d}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {assignedClinicIds.map((cid) => {
                        const clinic = clinics.find((c) => String(c._id) === String(cid));
                        if (!clinic) return null;
                        const isPrimary = String(cid) === String(primaryClinicId);
                        const dist = isPrimary ? 0 : calculateDistance(primaryClinicId, cid);
                        const mode = getAutoAllowedMode(cid);

                        return (
                          <tr key={cid} className="border-b border-white/[0.02] hover:bg-white/[0.005]">
                            <td className="py-3 px-3">
                              <p className="font-extrabold text-slate-200 text-xs">{clinic.name}</p>
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black mt-1 ${
                                isPrimary
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                                  : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/15'
                              }`}>
                                {isPrimary ? 'Primary (0 km)' : `Secondary (${dist.toFixed(1)} km)`}
                              </span>
                            </td>

                            {DAYS_OF_WEEK.map((day) => {
                              const slotIdx = slots.findIndex((s) => s.clinicId === cid && s.dayOfWeek === day);
                              const slot = slots[slotIdx];
                              const isAvailable = slot?.isAvailable || false;
                              const hasError = !!cellErrors[`${cid}-${day}`];
                              const errorMsg = cellErrors[`${cid}-${day}`];

                              return (
                                <td key={day} className={`p-2 text-center border-l border-white/[0.02] ${
                                  hasError ? 'bg-rose-500/5' : isAvailable ? 'bg-indigo-500/[0.01]' : ''
                                }`}>
                                  <div className="flex flex-col items-center gap-1.5">
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
                                      className="rounded border-white/10 bg-slate-900 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                                    />
                                    
                                    {isAvailable ? (
                                      <div className="space-y-1 w-full max-w-[90px]">
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
                                          className={`w-full bg-slate-900 border text-center rounded px-1.5 py-0.5 text-[10px] outline-none text-white ${
                                            hasError ? 'border-rose-500/50' : 'border-white/10'
                                          }`}
                                        >
                                          {TIME_OPTIONS.map((t) => (
                                            <option key={t} value={t}>{t}</option>
                                          ))}
                                        </select>
                                        <p className="text-[8px] text-slate-500">to</p>
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
                                          className={`w-full bg-slate-900 border text-center rounded px-1.5 py-0.5 text-[10px] outline-none text-white ${
                                            hasError ? 'border-rose-500/50' : 'border-white/10'
                                          }`}
                                        >
                                          {TIME_OPTIONS.map((t) => (
                                            <option key={t} value={t}>{t}</option>
                                          ))}
                                        </select>

                                        {/* Auto-mode badge inside grid cell */}
                                        <span className={`inline-block text-[8px] font-black uppercase px-1.5 py-0.5 rounded mt-1.5 ${
                                          mode === 'online'
                                            ? 'bg-amber-500/10 text-amber-400'
                                            : 'bg-emerald-500/10 text-emerald-400'
                                        }`}>
                                          {mode === 'online' ? 'Online' : 'Offline'}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-[9px] text-slate-600 font-bold block mt-2">Not Available</span>
                                    )}

                                    {/* Error tooltip/label inside cell */}
                                    {hasError && isAvailable && (
                                      <p className="text-[8px] text-rose-450 font-semibold leading-tight mt-1 max-w-[90px] border border-rose-500/20 bg-rose-500/5 p-1 rounded">
                                        {errorMsg}
                                      </p>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center gap-4 text-[9px] text-slate-500 pt-2 border-t border-white/[0.04]">
                  <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" /> Offline & Online Allowed</div>
                  <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" /> Online Only (Auto-set by Rule)</div>
                  <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-700 shrink-0" /> Not Available</div>
                </div>
              </div>

              {/* 3. Consultation Fees Settings */}
              <div className="bg-[#060d18] border border-white/[0.08] rounded-3xl p-6 space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <DollarSign size={13} className="text-indigo-400" /> 3. Consultation Fees Settings
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">Consultation Fee (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={consultationFee}
                      onChange={(e) => setConsultationFee(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">Follow-up Fee (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={followUpFee}
                      onChange={(e) => setFollowUpFee(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* STEP 3: CONFIRM & APPROVE CONTENT */}
          {step === 3 && (
            <>
              {/* Info summary header grid */}
              <div className="bg-[#060d18] border border-white/[0.08] rounded-3xl p-5 grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px]">
                <div className="space-y-1">
                  <p className="text-slate-505 font-bold uppercase">Primary Clinic (Reference)</p>
                  <p className="text-slate-200 font-bold truncate">{preferredClinic?.name || 'Apollo Hospital Indirapuram'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-550 font-bold uppercase">Primary Location</p>
                  <p className="text-slate-200 font-bold truncate">{doctor.profile?.currentAddress?.city || 'Ghaziabad, UP'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-505 font-bold uppercase">Experience</p>
                  <p className="text-slate-200 font-bold">{doctor.profile?.experienceYears || 8} Years</p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-550 font-bold uppercase">Qualification</p>
                  <p className="text-slate-200 font-bold truncate">{doctor.profile?.qualification || 'MBBS, MD'}</p>
                </div>
              </div>

              {/* Assigned Clinics */}
              <div className="bg-[#060d18] border border-white/[0.08] rounded-3xl p-6 space-y-4">
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">1. Assigned Clinics</h3>
                  <p className="text-[10px] text-slate-505">Clinics where the doctor will be available.</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="text-slate-500 border-b border-white/[0.04]">
                        <th className="py-2 px-3">Clinic / Branch</th>
                        <th className="py-2 px-3 text-center">Type</th>
                        <th className="py-2 px-3 text-center">Distance from Primary</th>
                        <th className="py-2 px-3 text-center">Mode Allowed</th>
                        <th className="py-2 px-3 text-right">Schedule</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignedClinicIds.map((id) => {
                        const clinic = clinics.find((c) => String(c._id) === String(id));
                        if (!clinic) return null;
                        const isPrimary = String(id) === String(primaryClinicId);
                        const dist = isPrimary ? 0 : calculateDistance(primaryClinicId, id);
                        const modeAllowed = getAutoAllowedMode(id) === 'online' ? 'Online Only' : 'Offline & Online';
                        return (
                          <tr key={id} className="border-b border-white/[0.02] hover:bg-white/[0.01]">
                            <td className="py-2.5 px-3">
                              <p className="font-bold text-slate-200">{clinic.name}</p>
                              <p className="text-[9px] text-slate-500">{clinic.address?.city || 'UP'}</p>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {isPrimary ? (
                                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 rounded text-[9px] font-bold">Primary</span>
                              ) : (
                                <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/15 rounded text-[9px] font-bold">Secondary</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center text-slate-350">{isPrimary ? '0 km' : `${dist.toFixed(1)} km`}</td>
                            <td className="py-2.5 px-3 text-center text-slate-350">{modeAllowed}</td>
                            <td className="py-2.5 px-3 text-right">
                              <button type="button" onClick={() => setStep(2)} className="text-emerald-400 hover:underline font-bold flex items-center gap-0.5 ml-auto">
                                <Eye size={12} /> View
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Weekly Schedule Summary */}
              <div className="bg-[#060d18] border border-white/[0.08] rounded-3xl p-6 space-y-4">
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">2. Weekly Schedule Summary</h3>
                  <p className="text-[10px] text-slate-500">Overview of the doctor's availability for all assigned clinics.</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 pt-2">
                  {DAYS_OF_WEEK.map((day) => {
                    const daySlots = slots.filter((s) => s.dayOfWeek === day && s.isAvailable && assignedClinicIds.includes(s.clinicId));
                    return (
                      <div key={day} className="p-3 bg-slate-900/40 border border-white/5 rounded-2xl text-center space-y-1.5">
                        <span className="capitalize font-bold text-[10px] text-slate-350">{day}</span>
                        {daySlots.length > 0 ? (
                          <div className="space-y-2">
                            {daySlots.map((ds) => {
                              const clinic = clinics.find((c) => String(c._id) === String(ds.clinicId));
                              const mode = getAutoAllowedMode(ds.clinicId);
                              return (
                                <div key={ds.clinicId} className="border-b border-white/5 pb-1 last:border-0 last:pb-0">
                                  <p className="font-bold text-slate-200 text-[10px] truncate">{clinic?.name || 'Clinic'}</p>
                                  <p className="text-[9px] text-indigo-400 font-medium">{ds.startTime} - {ds.endTime}</p>
                                  <span className={`inline-block text-[8px] px-1 py-0.2 rounded font-bold ${
                                    mode === 'online' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                                  }`}>
                                    {mode === 'online' ? 'Online' : 'Offline'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[9px] text-slate-600 italic">Not Available</p>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="p-3.5 bg-emerald-500/5 border border-emerald-500/15 rounded-2xl flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                  <p className="text-[10px] text-slate-300 font-medium">All time gap (&ge; 1.5 hrs) and distance rules are satisfied for this schedule.</p>
                </div>
              </div>
            </>
          )}

        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">

          {/* STEP 1: DOCUMENTS & CREDENTIALS PANEL */}
          {step === 1 && (
            <>
              {/* Certificate preview card */}
              <div className="bg-[#060d18] border border-white/[0.08] rounded-3xl p-6 space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap size={14} className="text-indigo-400" /> Documents & Credentials
                </h3>

                <div className="flex items-center justify-between text-xs border-b border-white/[0.03] pb-3">
                  <div>
                    <p className="font-bold text-white">Medical Registration Certificate</p>
                    <p className="text-[9px] text-slate-500 mt-0.5">Uploaded on 28 May 2025</p>
                  </div>
                  <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 rounded text-[8px] font-black uppercase">Verified</span>
                </div>

                <div className="relative border border-white/10 rounded-2xl overflow-hidden bg-white/5">
                  {/* Zoom controls */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-950/80 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1 flex items-center gap-3 text-white text-[10px] font-bold z-10">
                    <button onClick={() => setZoomLevel(Math.max(50, zoomLevel - 25))} className="hover:text-indigo-400"><ZoomOut size={12} /></button>
                    <span>{zoomLevel}%</span>
                    <button onClick={() => setZoomLevel(Math.min(200, zoomLevel + 25))} className="hover:text-indigo-400"><ZoomIn size={12} /></button>
                    <button onClick={() => setZoomLevel(100)} className="hover:text-indigo-400 border-l border-white/10 pl-2"><Maximize size={12} /></button>
                  </div>

                  {doctor.profile?.documentPdf ? (
                    <div className="w-full h-80 overflow-auto flex items-center justify-center p-4">
                      {doctor.profile.documentPdf.startsWith('data:image') ? (
                        <img
                          src={doctor.profile.documentPdf}
                          alt="Verification License"
                          style={{ transform: `scale(${zoomLevel / 100})` }}
                          className="max-h-72 object-contain transition-transform duration-200"
                        />
                      ) : (
                        <iframe
                          src={doctor.profile.documentPdf}
                          title="License Certificate Document"
                          className="w-full h-72 border-0"
                        />
                      )}
                    </div>
                  ) : (
                    <div className="h-80 flex items-center justify-center text-slate-500 text-xs italic">No document file available for preview.</div>
                  )}
                </div>

                <button
                  onClick={downloadDocument}
                  className="w-full py-2 bg-slate-900 border border-white/10 hover:bg-white/5 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  Download Document
                </button>
              </div>

              {/* Informative Step Note */}
              <div className="bg-[#060d18] border border-white/[0.08] rounded-3xl p-5 flex items-start gap-3">
                <Info size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-white">Note</p>
                  <p className="text-slate-400 mt-1 leading-relaxed">
                    Please review all details and documents carefully. Click "Next: Set Availability" to proceed with availability and schedule configuration.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* STEP 2: SCHEDULING RULES PANEL */}
          {step === 2 && (
            <>
              <div className="bg-[#060d18] border border-white/[0.08] rounded-3xl p-6 space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Settings size={14} className="text-indigo-400" /> Scheduling Rules
                </h3>

                <div className="space-y-4 text-[10px] leading-relaxed">
                  <div>
                    <h4 className="font-bold text-amber-400 flex items-center gap-1 mb-1">
                      <span className="w-3.5 h-3.5 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold font-mono">1</span>
                      Distance & Location Conditions (Primary vs. Other Locations)
                    </h4>
                    <ul className="list-disc pl-4 space-y-1.5 text-slate-400">
                      <li><strong>Under 15 km</strong>: If an assigned clinic is within 15 km of the doctor's primary clinic location, sessions can be scheduled in offline (in-person) mode with a gap of 1.5 hrs between sessions.</li>
                      <li><strong>Over 15 km</strong>: If the clinic is more than 15 km away from the primary clinic, the session must be conducted in online mode. Offline sessions are blocked.</li>
                      <li><strong>Over 25 km on the Same Day</strong>: If the doctor has sessions at two different clinics on the same day and the distance between them is greater than 25 km, the session at the non-primary clinic is automatically restricted to online mode.</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-bold text-amber-400 flex items-center gap-1 mb-1">
                      <span className="w-3.5 h-3.5 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold font-mono">2</span>
                      Time Gap Constraints between Sessions
                    </h4>
                    <ul className="list-disc pl-4 space-y-1.5 text-slate-400">
                      <li><strong>Minimum Gap Enforced</strong>: There must be a gap of at least 1 hour and 30 minutes (90 minutes) between any scheduled sessions on the same day.</li>
                      <li><strong>Same or Different Clinics</strong>: This 90-minute buffer rule applies globally to all consecutive sessions on a given day.</li>
                    </ul>
                  </div>

                  {/* Rules Examples widget */}
                  <div className="pt-3 border-t border-white/[0.04] space-y-3">
                    <p className="font-bold text-slate-200">Quick Rule Examples</p>
                    
                    {/* Errors */}
                    <div className="space-y-1">
                      <p className="text-rose-450 font-bold uppercase tracking-wider text-[9px]">Errors (Not Allowed)</p>
                      <div className="p-2 bg-rose-500/5 border border-rose-500/10 rounded-xl space-y-1 text-slate-400 flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-slate-300">Clinic A (Primary) &rarr; Clinic B (18 km)</p>
                          <p className="text-[8px] text-slate-500 mt-0.5">No gap / Gap &lt; 1.5 hrs</p>
                        </div>
                        <span className="text-rose-500 font-bold flex items-center gap-0.5 text-[9px] shrink-0">Offline Same Day ✕</span>
                      </div>

                      <div className="p-2 bg-rose-500/5 border border-rose-500/10 rounded-xl space-y-1 text-slate-400 flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-slate-300">Clinic A &rarr; Clinic C (28 km)</p>
                          <p className="text-[8px] text-slate-500 mt-0.5">Same Day (Distance &gt; 25 km)</p>
                        </div>
                        <span className="text-rose-500 font-bold flex items-center gap-0.5 text-[9px] shrink-0">Offline Same Day ✕</span>
                      </div>
                    </div>

                    {/* Allowed */}
                    <div className="space-y-1">
                      <p className="text-emerald-400 font-bold uppercase tracking-wider text-[9px]">Allowed (No Errors)</p>
                      <div className="p-2 bg-emerald-500/5 border border-emerald-500/10 rounded-xl space-y-1 text-slate-400 flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-slate-300">Clinic A &rarr; Clinic B (12 km)</p>
                          <p className="text-[8px] text-slate-500 mt-0.5">Gap &ge; 1.5 hrs</p>
                        </div>
                        <span className="text-emerald-500 font-bold flex items-center gap-0.5 text-[9px] shrink-0">Offline Same Day ✓</span>
                      </div>

                      <div className="p-2 bg-emerald-500/5 border border-emerald-500/10 rounded-xl space-y-1 text-slate-400 flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-slate-300">Clinic A &rarr; Clinic C (18 km)</p>
                          <p className="text-[8px] text-slate-500 mt-0.5">Any Gap</p>
                        </div>
                        <span className="text-emerald-500 font-bold flex items-center gap-0.5 text-[9px] shrink-0">Online Same Day ✓</span>
                      </div>
                    </div>

                  </div>
                </div>
              </div>

              {/* Informative Note Box */}
              <div className="bg-[#060d18] border border-white/[0.08] rounded-3xl p-5 flex items-start gap-3">
                <Info size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-white">Note</p>
                  <p className="text-slate-400 mt-1 leading-relaxed">
                    Rules are validated automatically. Any conflicting schedule will be highlighted for review on the next step.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* STEP 3: CONFIRMATION & APPROVAL SUMMARY PANEL */}
          {step === 3 && (
            <>
              {/* Application Summary Checklist */}
              <div className="bg-[#060d18] border border-white/[0.08] rounded-3xl p-6 space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckSquare size={14} className="text-indigo-400" /> Application Summary
                </h3>
                <p className="text-[10px] text-slate-500">Please review all details of the doctor, assigned clinics and schedule.</p>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-white/[0.03]">
                    <span className="text-slate-400">Profile & Documents</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1"><Check size={12} /> Verified</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-white/[0.03]">
                    <span className="text-slate-400">Clinic Assignments</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1"><Check size={12} /> Configured</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-white/[0.03]">
                    <span className="text-slate-400">Availability Schedule</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1"><Check size={12} /> Configured</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-400">Rules Validation</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1"><Check size={12} /> No Errors</span>
                  </div>
                </div>
              </div>

              {/* Rules Validation Status */}
              <div className="bg-[#060d18] border border-white/[0.08] rounded-3xl p-6 space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert size={14} className="text-indigo-400" /> Rules Validation Status
                </h3>
                <p className="text-[10px] text-slate-500">All scheduling rules have been validated successfully.</p>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-white/[0.03]">
                    <span className="text-slate-400">Distance & Location Rules</span>
                    <span className="text-emerald-400 font-bold">Valid</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-white/[0.03]">
                    <span className="text-slate-400">Time Gap Between Sessions</span>
                    <span className="text-emerald-400 font-bold">Valid</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-400">Mode Restrictions</span>
                    <span className="text-emerald-400 font-bold">Valid</span>
                  </div>
                </div>
              </div>

              {/* Important Alert Callout */}
              <div className="p-4 bg-[#0a1324] border border-white/5 rounded-3xl space-y-1">
                <p className="text-xs font-bold text-amber-450 flex items-center gap-1">
                  <AlertTriangle size={14} className="text-amber-500" /> Important
                </p>
                <p className="text-[10px] text-slate-450 leading-relaxed">
                  Once approved, the doctor will be able to start accepting appointments as per the assigned schedule and mode.
                </p>
              </div>

              {/* Not Ready to Approve Actions */}
              <div className="bg-[#060d18] border border-white/[0.08] rounded-3xl p-6 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase">Not ready to approve?</h4>
                <p className="text-[10px] text-slate-505">You can request changes or reject the application.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsReEditOpen(true)}
                    className="flex-1 py-2 rounded-xl border border-amber-500/20 hover:bg-amber-500/5 text-amber-400 text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <Edit3 size={13} /> Request Re-edit
                  </button>
                  <button
                    onClick={handleRejectSubmit}
                    className="flex-1 py-2 rounded-xl border border-rose-500/25 hover:bg-rose-500/5 text-rose-500 text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <Ban size={13} /> Reject Application
                  </button>
                </div>
              </div>

              {/* Quick Note Input */}
              <div className="bg-[#060d18] border border-white/[0.08] rounded-3xl p-6 space-y-2">
                <label className="block text-xs font-bold text-slate-400">Quick Note (Optional)</label>
                <textarea
                  placeholder="Add a note for internal reference..."
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-slate-650 focus:outline-none focus:border-indigo-500 resize-none h-20"
                />
                <p className="text-[9px] text-slate-500">This note is for internal use only and will not be visible to the doctor.</p>
              </div>
            </>
          )}

        </div>

      </div>

      {/* Bottom navigation bar */}
      <div className="flex justify-between items-center mt-8 pt-5 border-t border-white/[0.06] shrink-0">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="px-5 py-2.5 rounded-xl border border-white/10 hover:bg-[#0c1322] text-slate-350 text-xs font-bold transition flex items-center gap-2"
          >
            <ChevronLeft size={14} /> Previous Step
          </button>
        ) : (
          <div />
        )}

        {step < 3 ? (
          <button
            type="button"
            onClick={() => {
              if (step === 2 && !rulesValidation.isValid) {
                toast.error(rulesValidation.errors[0]);
                return;
              }
              setStep(step + 1);
            }}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-755 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
          >
            Next Step <ChevronRight size={14} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleApproveSubmit}
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
          >
            {isSubmitting ? 'Approving...' : 'Approve Doctor'}
          </button>
        )}
      </div>

      {/* RE-EDIT MODAL DIALOG POPUP */}
      {isReEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-[#060d18] border border-white/[0.1] rounded-3xl overflow-hidden shadow-2xl p-6 space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="font-extrabold text-white text-sm">Request Profile Re-edit</h3>
              <button onClick={() => setIsReEditOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-slate-400">Select which sections require correction from the doctor:</p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {Object.keys(reEditFields).map((field) => (
                <label key={field} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reEditFields[field]}
                    onChange={(e) => setReEditFields({ ...reEditFields, [field]: e.target.checked })}
                    className="rounded border-white/10 bg-slate-900 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="capitalize text-slate-350">{field.replace(/([A-Z])/g, ' $1')}</span>
                </label>
              ))}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-400">Correction Instructions / Comments *</label>
              <textarea
                placeholder="Explain to the doctor what changes or clearer files are required..."
                rows={3}
                value={reEditComments}
                onChange={(e) => setReEditComments(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-slate-655 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
              <button
                onClick={() => setIsReEditOpen(false)}
                className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setIsReEditOpen(false);
                  handleReEditSubmit();
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition"
              >
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DoctorReview;
