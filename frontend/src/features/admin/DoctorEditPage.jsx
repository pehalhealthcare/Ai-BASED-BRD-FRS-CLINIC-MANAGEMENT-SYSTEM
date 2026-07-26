// src/features/admin/DoctorEditPage.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminApi, clinicApi, doctorApi } from '../../lib/api';
import useAuth from '../../hooks/useAuth';
import { haversineDistance } from '../../utils/geo';
import { toast } from 'react-hot-toast';
import LoadingState from '../../components/common/LoadingState';
import TimePicker from '../../components/ui/TimePicker';

import {
  Settings, Calendar, Search, Filter, Plus, Eye, Edit3, Trash,
  MoreVertical, Check, Star, Users, Briefcase, DollarSign,
  TrendingUp, Award, Clock, ArrowRight, ShieldAlert, GraduationCap,
  ChevronLeft, ChevronRight, Download, Ban, CalendarDays, CheckCircle,
  X, Info, AlertTriangle, RefreshCw, ZoomIn, ZoomOut, Maximize, Building, CheckSquare, Copy, Lock
} from 'lucide-react';

const DoctorEditPage = () => {
  const { id: doctorId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [doctor, setDoctor] = useState(null);
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Assignment & Schedule State
  const [assignedClinicIds, setAssignedClinicIds] = useState([]);
  const [primaryClinicId, setPrimaryClinicId] = useState('');
  const [consultationFee, setConsultationFee] = useState(500);
  const [followUpFee, setFollowUpFee] = useState(300);
  
  // slots: [{ clinicId, dayOfWeek, isAvailable, startTime, endTime }]
  const [slots, setSlots] = useState([]);
  const [clinicModes, setClinicModes] = useState({});
  const [selectedSlotDuration, setSelectedSlotDuration] = useState(15);
  const [clinicPolicies, setClinicPolicies] = useState({});

  // Leave Management State
  const [leaves, setLeaves] = useState([]);
  const [leavePolicy, setLeavePolicy] = useState({
    maxCasualLeavesPerYear: 12,
    maxSickLeavesPerYear: 10,
    maxAnnualLeavesPerYear: 20,
    maxEmergencyLeavesPerYear: 5,
    maxConsecutiveLeaveDays: 7,
    minAdvanceNoticeDays: 3,
    autoRejectWithoutNotice: false,
    allowHalfDayLeave: true,
    allowEmergencyLeave: true,
    requireApproval: true,
    allowBackdatedLeave: false,
    allowLeaveCancellation: true
  });

  // Bulk schedule modal states
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkClinicId, setBulkClinicId] = useState(null);
  const [bulkDays, setBulkDays] = useState({
    monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: false, sunday: false
  });
  const [bulkOfflineStart, setBulkOfflineStart] = useState('09:00 AM');
  const [bulkOfflineEnd, setBulkOfflineEnd] = useState('01:00 PM');
  const [bulkOfflineDuration, setBulkOfflineDuration] = useState(30);

  const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  const TIME_OPTIONS = [
    '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
    '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM',
    '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
    '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM',
    '08:00 PM', '08:30 PM', '09:00 PM', '09:30 PM'
  ];

  const hasOnlinePlanFeature = (clinic) => {
    if (!clinic) return false;
    const plan = clinic.subscription?.planId;
    if (plan) {
      const features = plan.features || [];
      const hasInPlan = features.some(f => {
        const fLower = String(f).toLowerCase().replace(/[_\s-]/g, '');
        return fLower === 'onlineconsultation' || fLower === 'online';
      });
      if (hasInPlan) return true;
    }
    const now = new Date();
    const trialFeatures = clinic.trialFeatures || [];
    return trialFeatures.some(tf => {
      const code = String(tf.featureCode || '').toLowerCase().replace(/[_\s-]/g, '');
      return (code === 'onlineconsultation' || code === 'online') && tf.isActive !== false && new Date(tf.expiryDate) > now;
    });
  };

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

  const hasCoordinates = (addr) => {
    return addr && typeof addr.latitude === 'number' && typeof addr.longitude === 'number';
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [docRes, clinicsRes] = await Promise.all([
          doctorApi.get(doctorId),
          clinicApi.list()
        ]);

        const foundDoctor = docRes.data?.doctor;
        if (!foundDoctor) {
          toast.error('Doctor not found');
          navigate(-1);
          return;
        }

        setDoctor(foundDoctor);
        setConsultationFee(foundDoctor.profile?.consultationFee || foundDoctor.consultationFee || 500);
        setFollowUpFee(foundDoctor.profile?.followUpFee || foundDoctor.followUpFee || 300);

        if (foundDoctor.leavePolicy) {
          setLeavePolicy({ ...leavePolicy, ...foundDoctor.leavePolicy });
        }

        const adminClinicId = user?.clinicId ? String(user.clinicId) : null;
        const orgId = foundDoctor.organizationId || foundDoctor.profile?.organizationId;
        const rawClinics = clinicsRes.data?.clinics || [];
        const docLat = foundDoctor.profile?.currentAddress?.latitude || 0;
        const docLng = foundDoctor.profile?.currentAddress?.longitude || 0;

        let filtered = [];
        if (adminClinicId) {
          filtered = rawClinics.filter((c) => {
            const cId = String(c._id);
            const parentId = c.parentClinicId?._id ? String(c.parentClinicId._id) : String(c.parentClinicId || '');
            return cId === adminClinicId || parentId === adminClinicId;
          });
        }
        if (filtered.length === 0 && orgId) {
          filtered = rawClinics.filter((c) => String(c.organizationId) === String(orgId));
        }

        let prefLocation = foundDoctor.clinicId?._id || foundDoctor.clinicId || foundDoctor.profile?.preferredPracticeLocation;
        if (!prefLocation && filtered.length > 0) {
          prefLocation = filtered[0]._id;
        }

        const filteredWithDistance = filtered.map((c) => {
          const dist = hasCoordinates(c.address) && hasCoordinates(foundDoctor.profile?.currentAddress)
            ? haversineDistance(docLat, docLng, c.address.latitude, c.address.longitude)
            : null;
          return { ...c, distance: dist };
        });

        setClinics(filteredWithDistance);

        const listAssigned = foundDoctor.assignedClinics || [];
        const mergedIds = listAssigned.map(c => typeof c === 'string' ? c : c._id);
        if (prefLocation && !mergedIds.includes(prefLocation.toString())) {
          mergedIds.unshift(prefLocation);
        }

        if (prefLocation) {
          setPrimaryClinicId(prefLocation);
        }
        setAssignedClinicIds(mergedIds);

        const initialModes = {};
        const initialPolicies = {};
        filteredWithDistance.forEach(c => {
          const hasOnline = hasOnlinePlanFeature(c);
          if (!hasOnline) {
            initialModes[c._id] = 'offline_only';
          } else {
            initialModes[c._id] = 'hybrid';
          }
          initialPolicies[c._id] = {
            consultationFee: consultationFee,
            followUpFee: followUpFee,
            followUpWindowDays: 7,
            followUpPolicy: 'free'
          };
        });

        if (foundDoctor.clinicPolicies && foundDoctor.clinicPolicies.length > 0) {
          foundDoctor.clinicPolicies.forEach(pol => {
            const cid = typeof pol.clinicId === 'object' ? pol.clinicId._id : pol.clinicId;
            if (initialPolicies[cid]) {
              initialPolicies[cid] = {
                consultationFee: pol.consultationFee,
                followUpFee: pol.followUpFee,
                followUpWindowDays: pol.followUpWindowDays,
                followUpPolicy: pol.followUpPolicy
              };
            }
          });
        }

        setClinicModes(initialModes);
        setClinicPolicies(initialPolicies);

        const initialSlots = [];
        filteredWithDistance.forEach((c) => {
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
            if (matchSlot && matchSlot.slotDurationMinutes) {
              setSelectedSlotDuration(matchSlot.slotDurationMinutes);
            }
          });
        });
        setSlots(initialSlots);

        // Fetch Leaves if available
        try {
          const { leaveApi } = require('../../lib/api');
          if (leaveApi && leaveApi.list) {
            const leavesRes = await leaveApi.list({ doctorId });
            setLeaves(leavesRes.data?.leaves || []);
          }
        } catch(e) { console.error('Error fetching leaves', e); }

      } catch (err) {
        console.error(err);
        toast.error('Failed to load doctor details');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [doctorId, user?.clinicId, navigate]);

  const calculateDistance = (c1Id, c2Id) => {
    const c1 = clinics.find((c) => String(c._id) === String(c1Id));
    const c2 = clinics.find((c) => String(c._id) === String(c2Id));
    if (!c1 || !c2 || !hasCoordinates(c1.address) || !hasCoordinates(c2.address)) return 0;
    return haversineDistance(c1.address.latitude, c1.address.longitude, c2.address.latitude, c2.address.longitude);
  };

  const getAutoAllowedMode = (clinicId) => {
    if (!primaryClinicId || String(clinicId) === String(primaryClinicId)) {
      return clinicModes[clinicId] === 'online_only' ? 'online' : 'offline';
    }
    const dist = calculateDistance(primaryClinicId, clinicId);
    if (dist > 15) return 'online'; // Strict Online Only
    return clinicModes[clinicId] === 'online_only' ? 'online' : 'offline';
  };

  const cellErrors = useMemo(() => {
    const errors = {};
    DAYS_OF_WEEK.forEach((day) => {
      const daySlots = slots.filter((s) => s.dayOfWeek === day && s.isAvailable && assignedClinicIds.includes(s.clinicId));
      if (daySlots.length === 0) return;
      daySlots.sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));
      for (let i = 0; i < daySlots.length - 1; i++) {
        const s1 = daySlots[i];
        const s2 = daySlots[i + 1];
        const gap = parseTimeToMinutes(s2.startTime) - parseTimeToMinutes(s1.endTime);
        if (gap < 90) {
          const errMsg = `Time conflict: Gap must be >= 1.5 hrs`;
          errors[`${s1.clinicId}-${day}`] = errMsg;
          errors[`${s2.clinicId}-${day}`] = errMsg;
        }
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

  const rulesValidation = useMemo(() => {
    const errorList = Object.values(cellErrors);
    return {
      isValid: errorList.length === 0,
      errors: Array.from(new Set(errorList))
    };
  }, [cellErrors]);

  const handleBulkApply = () => {
    if (!bulkClinicId) return;
    const updatedSlots = slots.map((s) => {
      if (s.clinicId === bulkClinicId && bulkDays[s.dayOfWeek]) {
        return {
          ...s,
          isAvailable: true,
          startTime: bulkOfflineStart,
          endTime: bulkOfflineEnd
        };
      }
      return s;
    });
    setSelectedSlotDuration(bulkOfflineDuration);
    setSlots(updatedSlots);
    setBulkModalOpen(false);
    toast.success('Schedule applied successfully');
  };

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
      
      const policiesArray = assignedClinicIds.map(cid => ({
        clinicId: cid,
        consultationFee: Number(clinicPolicies[cid]?.consultationFee || 0),
        followUpFee: Number(clinicPolicies[cid]?.followUpFee || 0),
        followUpWindowDays: Number(clinicPolicies[cid]?.followUpWindowDays || 7),
        followUpPolicy: clinicPolicies[cid]?.followUpPolicy || 'free'
      }));

      const payload = {
        clinicId: primaryClinicId,
        assignedClinics: assignedClinicIds.filter(id => String(id) !== String(primaryClinicId)),
        availability: activeSlots.map((s) => ({
          dayOfWeek: s.dayOfWeek,
          isAvailable: true,
          startTime: s.startTime,
          endTime: s.endTime,
          slotDurationMinutes: Number(selectedSlotDuration),
          clinicId: s.clinicId,
          consultationMode: getAutoAllowedMode(s.clinicId)
        })),
        clinicPolicies: policiesArray,
        leavePolicy: leavePolicy
      };

      await doctorApi.update(doctorId, payload);
      toast.success('Assignment changes sent for doctor approval!');
      navigate(-1);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to update doctor assignments');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !doctor) {
    return <LoadingState label="Loading doctor details..." />;
  }

  const isPendingAssignment = doctor?.assignmentStatus === 'pending_acceptance';

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-900 p-6 font-sans">
      
      {isPendingAssignment && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-amber-900">Pending Assignment Changes</h4>
            <p className="text-xs text-amber-700 mt-1">
              There are unapproved assignment changes for this doctor. Any further modifications to their schedule or clinic assignment will overwrite the pending request and send a new notification for approval.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 mb-6">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="text-[10px] font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1.5 transition uppercase tracking-wider mb-2"
          >
            &larr; Back to Doctors
          </button>
          <h1 className="text-2xl font-black text-slate-900">Edit Doctor</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage doctor's clinic assignments, schedule, consultation settings and leaves.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveChanges}
            disabled={isSubmitting || !rulesValidation.isValid}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="space-y-8 max-w-7xl mx-auto pb-20">
        
        {/* Read Only Profile */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col lg:flex-row gap-8">
          <div className="flex items-center gap-4 flex-1">
            {doctor.profile?.image ? (
              <img src={doctor.profile.image} alt={doctor.name} className="w-24 h-24 rounded-2xl object-cover border border-slate-100 shrink-0" />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 font-bold text-2xl shrink-0">MD</div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="text-xl font-black text-slate-900">{doctor.fullName || doctor.name}</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-50 text-indigo-600 border border-indigo-100">Active</span>
              </div>
              <p className="text-sm text-indigo-600 font-bold mb-2">{doctor.profile?.specialization || 'General Physician'}</p>
              
              <div className="grid grid-cols-2 gap-y-1 gap-x-4 text-xs text-slate-600">
                <div className="flex items-center gap-1.5"><Briefcase size={14} className="text-slate-400"/> {doctor.profile?.experienceYears || doctor.experienceYears || 0} Years Exp.</div>
                <div className="flex items-center gap-1.5"><GraduationCap size={14} className="text-slate-400"/> {doctor.profile?.qualification || 'MBBS'}</div>
                <div className="flex items-center gap-1.5"><Search size={14} className="text-slate-400"/> {doctor.phone}</div>
                <div className="flex items-center gap-1.5"><Building size={14} className="text-slate-400"/> Reg: {doctor.profile?.medicalRegistrationNumber || 'N/A'}</div>
              </div>
            </div>
          </div>
          
          <div className="flex-1 bg-slate-50 rounded-2xl p-5 border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800">Profile Information</h3>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full flex items-center gap-1"><Lock size={10} /> Managed by Doctor</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-400 mb-0.5">Qualification</p>
                <p className="font-bold text-slate-700">{doctor.profile?.qualification || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400 mb-0.5">Date of Birth</p>
                <p className="font-bold text-slate-700">{doctor.profile?.dob ? new Date(doctor.profile.dob).toLocaleDateString() : '-'}</p>
              </div>
              <div>
                <p className="text-slate-400 mb-0.5">Gender</p>
                <p className="font-bold text-slate-700 capitalize">{doctor.profile?.gender || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400 mb-0.5">Verification</p>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Verified</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-4 italic">Personal & professional details cannot be edited by clinic admin.</p>
          </div>
        </div>

        {/* 1. Clinic Assignments */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-black text-slate-900">1. Clinic Assignments</h3>
              <p className="text-xs text-slate-500 mt-0.5">Assign doctor to one or more clinics/branches.</p>
            </div>
            <button
              onClick={() => {
                const nextUnassigned = clinics.find((c) => !assignedClinicIds.includes(c._id));
                if (nextUnassigned) {
                  setAssignedClinicIds([...assignedClinicIds, nextUnassigned._id]);
                  if (!clinicPolicies[nextUnassigned._id]) {
                    setClinicPolicies({
                      ...clinicPolicies,
                      [nextUnassigned._id]: { consultationFee: 500, followUpFee: 300, followUpWindowDays: 7, followUpPolicy: 'free' }
                    });
                  }
                } else {
                  toast.error('All clinics are already assigned.');
                }
              }}
              className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
            >
              <Plus size={14} /> Assign Clinic
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-slate-500 border-b border-slate-100">
                  <th className="py-3 px-3 font-bold">Clinic / Branch</th>
                  <th className="py-3 px-3 font-bold text-center">Distance</th>
                  <th className="py-3 px-3 font-bold text-center">Consultation Mode</th>
                  <th className="py-3 px-3 font-bold text-center">Primary</th>
                  <th className="py-3 px-3 font-bold text-right">Actions</th>
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
                    <tr key={id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="py-4 px-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isPrimary ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                            <Building size={14} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{clinic.name} {isPrimary && <span className="text-indigo-600 font-black">(Primary)</span>}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">{clinic.address?.city || 'Location'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-3 text-center font-medium text-slate-600">{isPrimary ? '0 km' : `${dist.toFixed(1)} km`}</td>
                      <td className="py-4 px-3 text-center">
                        {isOnlineRestricted ? (
                          <span className="px-3 py-1 bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-bold">
                            Online Only
                          </span>
                        ) : (
                          <select
                            value={clinicModes[id] || 'hybrid'}
                            onChange={(e) => setClinicModes({ ...clinicModes, [id]: e.target.value })}
                            className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 text-xs outline-none font-medium hover:border-slate-300 transition"
                          >
                            <option value="hybrid">Offline & Online</option>
                            <option value="offline_only">Offline Only</option>
                            <option value="online_only">Online Only</option>
                          </select>
                        )}
                      </td>
                      <td className="py-4 px-3 text-center">
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name="primaryClinicGroup"
                            checked={isPrimary}
                            onChange={() => setPrimaryClinicId(id)}
                            className="hidden"
                          />
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                            isPrimary ? 'border-indigo-600' : 'border-slate-300 hover:border-indigo-400'
                          }`}>
                            {isPrimary && <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full" />}
                          </div>
                        </label>
                      </td>
                      <td className="py-4 px-3 text-right">
                        {!isPrimary && (
                          <button
                            onClick={() => setAssignedClinicIds(assignedClinicIds.filter((cid) => cid !== id))}
                            className="p-2 rounded-xl bg-white border border-slate-200 hover:border-rose-200 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition shadow-sm"
                          >
                            <Trash size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-indigo-600 bg-indigo-50 px-3 py-2 rounded-xl w-fit border border-indigo-100">
            <Info size={12} /> Only active assignments are visible to receptionists and patients for appointment booking.
          </div>
        </div>

        {/* 2. Weekly Schedule & Slots */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-black text-slate-900">2. Weekly Schedule & Slots</h3>
              <p className="text-xs text-slate-500 mt-0.5">Configure working days, sessions and slot duration for each assigned clinic.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Slot Duration</span>
                <select
                  value={selectedSlotDuration}
                  onChange={(e) => setSelectedSlotDuration(Number(e.target.value))}
                  className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-900 font-bold outline-none shadow-sm hover:border-slate-300 transition"
                >
                  <option value="15">15 mins</option>
                  <option value="30">30 mins</option>
                  <option value="45">45 mins</option>
                  <option value="60">60 mins</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {assignedClinicIds.map((cid) => {
              const clinic = clinics.find((c) => String(c._id) === String(cid));
              if (!clinic) return null;
              const isPrimary = String(cid) === String(primaryClinicId);
              const dist = isPrimary ? 0 : calculateDistance(primaryClinicId, cid);
              const mode = getAutoAllowedMode(cid);

              return (
                <div key={cid} className="rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 p-4 flex justify-between items-center border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-slate-800 text-sm">{clinic.name}</h4>
                      {isPrimary && <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-indigo-100 text-indigo-700">Primary</span>}
                    </div>
                    <button
                      onClick={() => { setBulkClinicId(cid); setBulkModalOpen(true); }}
                      className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1"
                    >
                      <Copy size={12} /> Quick Fill Schedule
                    </button>
                  </div>
                  
                  <div className="p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    {DAYS_OF_WEEK.map((day) => {
                      const slotIdx = slots.findIndex((s) => s.clinicId === cid && s.dayOfWeek === day);
                      const slot = slots[slotIdx];
                      const isAvailable = slot?.isAvailable || false;
                      const hasError = !!cellErrors[`${cid}-${day}`];
                      const errorMsg = cellErrors[`${cid}-${day}`];

                      return (
                        <div key={day} className={`p-3 rounded-xl border-2 transition-all ${
                          hasError
                            ? 'bg-rose-50 border-rose-200'
                            : isAvailable
                              ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                              : 'bg-white border-slate-100'
                        }`}>
                          <div className="flex justify-between items-center mb-3">
                            <span className={`capitalize font-bold text-xs ${isAvailable ? 'text-indigo-900' : 'text-slate-400'}`}>{day.slice(0, 3)}</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
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
                              />
                              <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-500"></div>
                            </label>
                          </div>
                          
                          {isAvailable ? (
                            <div className="space-y-2">
                              <div>
                                <p className="text-[9px] text-slate-500 font-medium mb-0.5">Start</p>
                                <select
                                  value={slot.startTime}
                                  onChange={(e) => {
                                    setSlots(slots.map(s => s.clinicId === cid && s.dayOfWeek === day ? { ...s, startTime: e.target.value } : s));
                                  }}
                                  className="w-full bg-white border border-slate-200 rounded px-1.5 py-1 text-[10px] text-slate-700 outline-none"
                                >
                                  {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                                </select>
                              </div>
                              <div>
                                <p className="text-[9px] text-slate-500 font-medium mb-0.5">End</p>
                                <select
                                  value={slot.endTime}
                                  onChange={(e) => {
                                    setSlots(slots.map(s => s.clinicId === cid && s.dayOfWeek === day ? { ...s, endTime: e.target.value } : s));
                                  }}
                                  className="w-full bg-white border border-slate-200 rounded px-1.5 py-1 text-[10px] text-slate-700 outline-none"
                                >
                                  {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                                </select>
                              </div>
                              {hasError && (
                                <p className="text-[9px] text-rose-600 font-bold leading-tight mt-2 flex items-start gap-1">
                                  <AlertTriangle size={10} className="shrink-0 mt-0.5"/> {errorMsg}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="h-20 flex items-center justify-center">
                              <p className="text-[10px] text-slate-400 font-medium">Not Available</p>
                            </div>
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

        {/* 3. Scheduling Rules (Read Only) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <ShieldAlert size={18} className="text-indigo-600" />
            <div>
              <h3 className="text-sm font-black text-slate-900">3. Scheduling Rules</h3>
              <p className="text-xs text-slate-500 mt-0.5">Rules below will be automatically applied for this doctor while booking appointments.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 font-black text-[10px] flex items-center justify-center shrink-0">1</div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Distance & Location Conditions</h4>
                  <ul className="mt-2 space-y-3">
                    <li className="text-[11px] text-slate-600 flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5"></div> <span><strong className="text-slate-800">Under 15 km:</strong> Offline mode is permitted. Minimum 1.5 hrs gap enforced.</span></li>
                    <li className="text-[11px] text-slate-600 flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5"></div> <span><strong className="text-slate-800">Over 15 km:</strong> Distance-based restrictions applied. Non-primary clinics are set to online.</span></li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-purple-50 text-purple-600 font-black text-[10px] flex items-center justify-center shrink-0">2</div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Time Gap Constraints</h4>
                  <ul className="mt-2 space-y-3">
                    <li className="text-[11px] text-slate-600 flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5"></div> <span><strong className="text-slate-800">Minimum gap enforced:</strong> At least 1.5 hours between any scheduled sessions on the same day.</span></li>
                    <li className="text-[11px] text-slate-600 flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5"></div> <span><strong className="text-slate-800">Global buffer:</strong> Buffer rule applies globally to all consecutive sessions to prevent double booking.</span></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Consultation Fees & Policies */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-sm font-black text-slate-900">4. Consultation Fees & Follow-up Policy</h3>
            <p className="text-xs text-slate-500 mt-0.5">Manage consultation fees and follow-up charging rules per clinic.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-slate-500 border-b border-slate-100">
                  <th className="py-3 px-3 font-bold">Clinic / Branch</th>
                  <th className="py-3 px-3 font-bold">Consultation Fee (₹)</th>
                  <th className="py-3 px-3 font-bold">Follow-up Fee (₹)</th>
                  <th className="py-3 px-3 font-bold">Follow-up Policy</th>
                  <th className="py-3 px-3 font-bold">Free Window (Days)</th>
                </tr>
              </thead>
              <tbody>
                {assignedClinicIds.map(cid => {
                  const clinic = clinics.find((c) => String(c._id) === String(cid));
                  if (!clinic) return null;
                  const policy = clinicPolicies[cid] || { consultationFee: 500, followUpFee: 300, followUpWindowDays: 7, followUpPolicy: 'free' };
                  return (
                    <tr key={cid} className="border-b border-slate-50">
                      <td className="py-4 px-3 font-bold text-slate-800">{clinic.name}</td>
                      <td className="py-4 px-3">
                        <input
                          type="number"
                          value={policy.consultationFee}
                          onChange={(e) => setClinicPolicies({ ...clinicPolicies, [cid]: { ...policy, consultationFee: e.target.value } })}
                          className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 outline-none hover:border-slate-300 focus:border-indigo-500 transition"
                        />
                      </td>
                      <td className="py-4 px-3">
                        <input
                          type="number"
                          value={policy.followUpFee}
                          onChange={(e) => setClinicPolicies({ ...clinicPolicies, [cid]: { ...policy, followUpFee: e.target.value } })}
                          className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 outline-none hover:border-slate-300 focus:border-indigo-500 transition"
                        />
                      </td>
                      <td className="py-4 px-3">
                        <select
                          value={policy.followUpPolicy}
                          onChange={(e) => setClinicPolicies({ ...clinicPolicies, [cid]: { ...policy, followUpPolicy: e.target.value } })}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 outline-none hover:border-slate-300 focus:border-indigo-500 transition"
                        >
                          <option value="free">Free Follow-up</option>
                          <option value="discounted">Discounted</option>
                          <option value="full">Charge Full Fee</option>
                        </select>
                      </td>
                      <td className="py-4 px-3">
                        <input
                          type="number"
                          value={policy.followUpWindowDays}
                          onChange={(e) => setClinicPolicies({ ...clinicPolicies, [cid]: { ...policy, followUpWindowDays: e.target.value } })}
                          className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 outline-none hover:border-slate-300 focus:border-indigo-500 transition"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. Doctor Leave Management & Policy */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="pb-3 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-black text-slate-900">5. Doctor Leave Management & Policy</h3>
              <p className="text-xs text-slate-500 mt-0.5">Manage doctor leaves and configure specific leave rules.</p>
            </div>
            <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5">
              <Calendar size={14} /> View Calendar
            </button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Leave Policy Settings */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-800 mb-4 flex items-center gap-2"><Settings size={14} className="text-indigo-600"/> Leave Policy for this Doctor</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Max Casual Leaves / Yr</label>
                  <input
                    type="number"
                    value={leavePolicy.maxCasualLeavesPerYear}
                    onChange={(e) => setLeavePolicy({ ...leavePolicy, maxCasualLeavesPerYear: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Max Sick Leaves / Yr</label>
                  <input
                    type="number"
                    value={leavePolicy.maxSickLeavesPerYear}
                    onChange={(e) => setLeavePolicy({ ...leavePolicy, maxSickLeavesPerYear: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Max Annual Leaves / Yr</label>
                  <input
                    type="number"
                    value={leavePolicy.maxAnnualLeavesPerYear}
                    onChange={(e) => setLeavePolicy({ ...leavePolicy, maxAnnualLeavesPerYear: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Min Advance Notice (Days)</label>
                  <input
                    type="number"
                    value={leavePolicy.minAdvanceNoticeDays}
                    onChange={(e) => setLeavePolicy({ ...leavePolicy, minAdvanceNoticeDays: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <label className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-100/50 transition">
                  <span className="text-xs font-bold text-slate-700">Auto Reject Without Notice</span>
                  <input type="checkbox" className="w-4 h-4 accent-indigo-600" checked={leavePolicy.autoRejectWithoutNotice} onChange={(e) => setLeavePolicy({...leavePolicy, autoRejectWithoutNotice: e.target.checked})} />
                </label>
                <label className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-100/50 transition">
                  <span className="text-xs font-bold text-slate-700">Require Approval for Leaves</span>
                  <input type="checkbox" className="w-4 h-4 accent-indigo-600" checked={leavePolicy.requireApproval} onChange={(e) => setLeavePolicy({...leavePolicy, requireApproval: e.target.checked})} />
                </label>
              </div>
            </div>

            {/* Leave History / Upcoming */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 mb-4 flex items-center gap-2"><CalendarDays size={14} className="text-emerald-600"/> Doctor Leaves</h4>
              
              {leaves && leaves.length > 0 ? (
                <div className="space-y-3">
                  {leaves.map((leave, idx) => (
                    <div key={idx} className="p-3 border border-slate-100 rounded-xl bg-white shadow-sm flex justify-between items-center">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{leave.leaveType || 'Casual Leave'}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{new Date(leave.start_datetime).toLocaleDateString()} to {new Date(leave.end_datetime).toLocaleDateString()}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase ${
                        leave.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 
                        leave.status === 'rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {leave.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                  <CalendarDays size={24} className="text-slate-300 mb-2" />
                  <p className="text-xs text-slate-500 font-medium">No leaves found for this doctor.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Bulk Apply Modal */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 w-full max-w-lg">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-black text-slate-900">Quick Fill Schedule</h3>
              <button onClick={() => setBulkModalOpen(false)} className="p-1.5 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200"><X size={16} /></button>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Apply to Days</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <label key={day} className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer transition ${bulkDays[day] ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                      <input type="checkbox" className="hidden" checked={bulkDays[day]} onChange={(e) => setBulkDays({ ...bulkDays, [day]: e.target.checked })} />
                      {day.slice(0,3).toUpperCase()}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Start Time</label>
                  <select value={bulkOfflineStart} onChange={(e) => setBulkOfflineStart(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500">
                    {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">End Time</label>
                  <select value={bulkOfflineEnd} onChange={(e) => setBulkOfflineEnd(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500">
                    {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <button onClick={() => setBulkModalOpen(false)} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition">Cancel</button>
                <button onClick={handleBulkApply} className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition">Apply Schedule</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorEditPage;
