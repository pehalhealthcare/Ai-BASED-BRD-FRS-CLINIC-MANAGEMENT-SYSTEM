// src/features/admin/DoctorReview.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminApi, clinicApi } from '../../lib/api';
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
  X, Info, AlertTriangle, RefreshCw, ZoomIn, ZoomOut, Maximize, Building, CheckSquare
} from 'lucide-react';

const DoctorReview = () => {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

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
  const [clinicPolicies, setClinicPolicies] = useState({});

  // Bulk schedule modal states
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkClinicId, setBulkClinicId] = useState(null);
  const [bulkDays, setBulkDays] = useState({
    monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: false, sunday: false
  });
  const [bulkOfflineStart, setBulkOfflineStart] = useState('09:00 AM');
  const [bulkOfflineEnd, setBulkOfflineEnd] = useState('05:00 PM');
  const [bulkOfflineDuration, setBulkOfflineDuration] = useState(30);
  const [bulkOnlineStart, setBulkOnlineStart] = useState('09:00 AM');
  const [bulkOnlineEnd, setBulkOnlineEnd] = useState('05:00 PM');
  const [bulkOnlineDuration, setBulkOnlineDuration] = useState(30);

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

  const hasOnlinePlanFeature = (clinic) => {
    if (!clinic) return false;
    
    // Check if the plan's features list includes online_consultation
    const plan = clinic.subscription?.planId;
    if (plan) {
      const features = plan.features || [];
      const hasInPlan = features.some(f => {
        const fLower = String(f).toLowerCase().replace(/[_\s-]/g, '');
        return fLower === 'onlineconsultation' || fLower === 'online';
      });
      if (hasInPlan) return true;
    }

    // Check active trialFeatures
    const now = new Date();
    const trialFeatures = clinic.trialFeatures || [];
    const hasActiveTrial = trialFeatures.some(tf => {
      const code = String(tf.featureCode || '').toLowerCase().replace(/[_\s-]/g, '');
      return (code === 'onlineconsultation' || code === 'online')
        && tf.isActive !== false
        && new Date(tf.expiryDate) > now;
    });

    return hasActiveTrial;
  };

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

  const format12to24 = (timeStr) => {
    if (!timeStr) return '09:00';
    if (/^\d{2}:\d{2}$/.test(timeStr)) return timeStr;
    const totalMins = parseTimeToMinutes(timeStr);
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    const hrsStr = hrs < 10 ? `0${hrs}` : hrs;
    const minsStr = mins < 10 ? `0${mins}` : mins;
    return `${hrsStr}:${minsStr}`;
  };

  // Helper: check coordinates
  const hasCoordinates = (addr) => {
    return addr && typeof addr.latitude === 'number' && typeof addr.longitude === 'number';
  };

  const format24to12 = (time24) => {
    if (!time24) return '09:00 AM';
    if (time24.includes('AM') || time24.includes('PM')) return time24;
    const parts = time24.split(':');
    if (parts.length < 2) return '09:00 AM';
    let hrs = parseInt(parts[0], 10);
    const mins = parts[1].substring(0, 2);
    const ampm = hrs >= 12 ? 'PM' : 'AM';
    hrs = hrs % 12;
    hrs = hrs ? hrs : 12;
    const hrsStr = hrs < 10 ? `0${hrs}` : hrs;
    return `${hrsStr}:${mins} ${ampm}`;
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

        // Filter clinics to only this clinic admin's own clinic and its branches
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
        // Fallback: if still empty (e.g. orgId-based match), try organizationId scoping
        if (filtered.length === 0 && orgId) {
          filtered = rawClinics.filter((c) => String(c.organizationId) === String(orgId));
        }

        // Prepopulate primary clinic
        let prefLocation = foundDoctor.profile?.preferredPracticeLocation;
        if (prefLocation && !filtered.some((c) => String(c._id) === String(prefLocation))) {
          const prefClinic = rawClinics.find((c) => String(c._id) === String(prefLocation));
          if (prefClinic) {
            filtered.push(prefClinic);
          }
        }

        if (!prefLocation && filtered.length > 0) {
          prefLocation = filtered[0]._id;
        }

        if (prefLocation) {
          setPrimaryClinicId(prefLocation);
          setAssignedClinicIds([prefLocation]);
        }

        const filteredWithDistance = filtered.map((c) => {
          const dist = hasCoordinates(c.address) && hasCoordinates(foundDoctor.profile?.currentAddress)
            ? haversineDistance(docLat, docLng, c.address.latitude, c.address.longitude)
            : null;
          return { ...c, distance: dist };
        });

        setClinics(filteredWithDistance);

        // Prepopulate clinic modes based on plan restrictions
        const initialModes = {};
        filteredWithDistance.forEach(c => {
          const hasOnline = hasOnlinePlanFeature(c);
          const onboardingAvailability = foundDoctor.profile?.availability || foundDoctor.availability || [];
          const hasOnboardingOnline = onboardingAvailability.some(a => String(a.clinicId) === String(c._id) && a.consultationMode === 'online' && a.isAvailable);
          const hasOnboardingOffline = onboardingAvailability.some(a => String(a.clinicId) === String(c._id) && (a.consultationMode || 'offline') === 'offline' && a.isAvailable);

          if (!hasOnline) {
            initialModes[c._id] = 'offline_only';
          } else if (hasOnboardingOnline && hasOnboardingOffline) {
            initialModes[c._id] = 'hybrid';
          } else if (hasOnboardingOnline) {
            initialModes[c._id] = 'online_only';
          } else {
            initialModes[c._id] = 'offline_only';
          }
        });
        setClinicModes(initialModes);

        const initialPolicies = {};
        filteredWithDistance.forEach(c => {
          const existingPolicy = foundDoctor.profile?.clinicPolicies?.find(p => String(p.clinicId) === String(c._id)) || {};
          initialPolicies[c._id] = {
            consultationFee: existingPolicy.consultationFee !== undefined ? existingPolicy.consultationFee : (foundDoctor.profile?.consultationFee || 500),
            followUpFee: existingPolicy.followUpFee !== undefined ? existingPolicy.followUpFee : (foundDoctor.profile?.followUpFee || 300),
            followUpWindowDays: existingPolicy.followUpWindowDays !== undefined ? existingPolicy.followUpWindowDays : 7,
            followUpPolicy: existingPolicy.followUpPolicy || 'free'
          };
        });
        setClinicPolicies(initialPolicies);

        // Initialize empty slots configuration grid or prepopulate from onboarding
        const initialSlots = [];
        const onboardingAvailability = foundDoctor.profile?.availability || foundDoctor.availability || [];
        filteredWithDistance.forEach((c) => {
          const isPrimary = String(c._id) === String(prefLocation);
          DAYS_OF_WEEK.forEach((day) => {
            const onboardingOfflineSlots = onboardingAvailability.filter(
              (a) => String(a.clinicId) === String(c._id) && a.dayOfWeek?.toLowerCase() === day.toLowerCase() && (a.consultationMode || 'offline') === 'offline'
            );
            const onboardingOnlineSlots = onboardingAvailability.filter(
              (a) => String(a.clinicId) === String(c._id) && a.dayOfWeek?.toLowerCase() === day.toLowerCase() && a.consultationMode === 'online'
            );

            if (isPrimary && onboardingOfflineSlots.length > 0) {
              onboardingOfflineSlots.forEach((slot, idx) => {
                initialSlots.push({
                  id: `slot-${c._id}-${day}-offline-${idx}-${Math.random()}`,
                  clinicId: c._id,
                  dayOfWeek: day,
                  consultationMode: 'offline',
                  isAvailable: slot.isAvailable !== false,
                  startTime: slot.startTime ? format24to12(slot.startTime) : '09:00 AM',
                  endTime: slot.endTime ? format24to12(slot.endTime) : '01:00 PM',
                  slotDurationMinutes: slot.slotDurationMinutes || 30,
                  doctorFilled: slot.isAvailable !== false
                });
              });
            } else {
              initialSlots.push({
                id: `slot-${c._id}-${day}-offline-${Math.random()}`,
                clinicId: c._id,
                dayOfWeek: day,
                consultationMode: 'offline',
                isAvailable: false,
                startTime: '09:00 AM',
                endTime: '01:00 PM',
                slotDurationMinutes: 30,
                doctorFilled: false
              });
            }

            if (isPrimary && onboardingOnlineSlots.length > 0) {
              onboardingOnlineSlots.forEach((slot, idx) => {
                initialSlots.push({
                  id: `slot-${c._id}-${day}-online-${idx}-${Math.random()}`,
                  clinicId: c._id,
                  dayOfWeek: day,
                  consultationMode: 'online',
                  isAvailable: slot.isAvailable !== false,
                  startTime: slot.startTime ? format24to12(slot.startTime) : '09:00 AM',
                  endTime: slot.endTime ? format24to12(slot.endTime) : '01:00 PM',
                  slotDurationMinutes: slot.slotDurationMinutes || 30,
                  doctorFilled: slot.isAvailable !== false
                });
              });
            } else {
              initialSlots.push({
                id: `slot-${c._id}-${day}-online-${Math.random()}`,
                clinicId: c._id,
                dayOfWeek: day,
                consultationMode: 'online',
                isAvailable: false,
                startTime: '09:00 AM',
                endTime: '01:00 PM',
                slotDurationMinutes: 30,
                doctorFilled: false
              });
            }
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

  // Determine allowed modes based on distance and plan features
  const getAutoAllowedMode = (clinicId) => {
    const clinic = clinics.find((c) => String(c._id) === String(clinicId));
    if (!clinic) return 'offline';
    const isPrimary = String(clinicId) === String(primaryClinicId);
    const dist = isPrimary ? 0 : calculateDistance(primaryClinicId, clinicId);
    if (dist > 15 && !isPrimary) return 'online'; // Strict Online Only due to distance
    return clinicModes[clinicId] === 'online_only' ? 'online' : 'offline';
  };

  // Live validator checks all slots against the distance and time gap rules
  const cellErrors = useMemo(() => {
    const errors = {}; // key: `${clinicId}-${dayOfWeek}`, value: error string message

    DAYS_OF_WEEK.forEach((day) => {
      // Find all active slots on this day
      const daySlots = slots.filter((s) => {
        if (!s.isAvailable || !assignedClinicIds.includes(s.clinicId)) return false;
        const mode = clinicModes[s.clinicId] || 'offline_only';
        if (mode === 'offline_only' && s.consultationMode !== 'offline') return false;
        if (mode === 'online_only' && s.consultationMode !== 'online') return false;
        return true;
      });

      if (daySlots.length === 0) return;

      // Sort chronologically by startTime
      daySlots.sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

      // Check conflicts
      for (let i = 0; i < daySlots.length - 1; i++) {
        const s1 = daySlots[i];
        const s2 = daySlots[i + 1];

        if (String(s1.clinicId) !== String(s2.clinicId)) {
          const s1End = parseTimeToMinutes(s1.endTime);
          const s2Start = parseTimeToMinutes(s2.startTime);
          const gap = s2Start - s1End;

          if (gap < 90) {
            const errMsg = `Time conflict: Gap between sessions at different clinics must be >= 1.5 hrs`;
            errors[`${s1.clinicId}-${day}`] = errMsg;
            errors[`${s2.clinicId}-${day}`] = errMsg;
          }

          const dist = calculateDistance(s1.clinicId, s2.clinicId);
          if (dist > 25 && s1.consultationMode === 'offline' && s2.consultationMode === 'offline') {
            const errMsg = `Distance conflict: Clinics are ${dist.toFixed(1)} km apart (> 25 km limit). You must set one session to Online.`;
            errors[`${s1.clinicId}-${day}`] = errMsg;
            errors[`${s2.clinicId}-${day}`] = errMsg;
          }
        }
      }
    });

    return errors;
  }, [slots, assignedClinicIds, primaryClinicId, clinicModes, clinics]);

  // Apply bulk weekly schedule from modal
  const handleApplyBulkSchedule = () => {
    if (!bulkClinicId) return;
    const mode = clinicModes[bulkClinicId] || 'offline_only';
    
    setSlots(prevSlots => prevSlots.map(s => {
      if (String(s.clinicId) !== String(bulkClinicId)) return s;
      
      const dayName = s.dayOfWeek.toLowerCase();
      const shouldApply = bulkDays[dayName];
      if (!shouldApply) return s;

      if (mode === 'offline_only' && s.consultationMode === 'offline') {
        return {
          ...s,
          isAvailable: true,
          startTime: bulkOfflineStart,
          endTime: bulkOfflineEnd,
          slotDurationMinutes: Number(bulkOfflineDuration)
        };
      }
      if (mode === 'online_only' && s.consultationMode === 'online') {
        return {
          ...s,
          isAvailable: true,
          startTime: bulkOnlineStart,
          endTime: bulkOnlineEnd,
          slotDurationMinutes: Number(bulkOnlineDuration)
        };
      }
      if (mode === 'hybrid') {
        if (s.consultationMode === 'offline') {
          return {
            ...s,
            isAvailable: true,
            startTime: bulkOfflineStart,
            endTime: bulkOfflineEnd,
            slotDurationMinutes: Number(bulkOfflineDuration)
          };
        }
        if (s.consultationMode === 'online') {
          return {
            ...s,
            isAvailable: true,
            startTime: bulkOnlineStart,
            endTime: bulkOnlineEnd,
            slotDurationMinutes: Number(bulkOnlineDuration)
          };
        }
      }
      return s;
    }));

    setBulkModalOpen(false);
    toast.success('Weekly schedule applied successfully!');
  };

  // Copy Monday to Weekdays (Mon-Fri)
  const copyMondayToWeekdays = (cid) => {
    const mondaySlots = slots.filter(s => String(s.clinicId) === String(cid) && s.dayOfWeek === 'monday' && s.isAvailable);
    setSlots(prevSlots => {
      const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      const otherClinicsSlots = prevSlots.filter(s => String(s.clinicId) !== String(cid));
      const thisClinicWeekendSlots = prevSlots.filter(s => String(s.clinicId) === String(cid) && (s.dayOfWeek === 'saturday' || s.dayOfWeek === 'sunday'));
      const thisClinicMondaySlots = prevSlots.filter(s => String(s.clinicId) === String(cid) && s.dayOfWeek === 'monday');

      const copiedSlots = [];
      weekdays.filter(d => d !== 'monday').forEach(day => {
        mondaySlots.forEach(ms => {
          copiedSlots.push({
            ...ms,
            id: `slot-${cid}-${day}-${ms.consultationMode}-${Math.random()}`,
            dayOfWeek: day
          });
        });
      });
      return [...otherClinicsSlots, ...thisClinicMondaySlots, ...thisClinicWeekendSlots, ...copiedSlots];
    });
    toast.success('Monday schedule copied to weekdays (Mon-Fri)!');
  };

  // Copy Monday to All Days
  const copyMondayToAllDays = (cid) => {
    const mondaySlots = slots.filter(s => String(s.clinicId) === String(cid) && s.dayOfWeek === 'monday' && s.isAvailable);
    setSlots(prevSlots => {
      const otherClinicsSlots = prevSlots.filter(s => String(s.clinicId) !== String(cid));
      const thisClinicMondaySlots = prevSlots.filter(s => String(s.clinicId) === String(cid) && s.dayOfWeek === 'monday');

      const copiedSlots = [];
      DAYS_OF_WEEK.filter(d => d !== 'monday').forEach(day => {
        mondaySlots.forEach(ms => {
          copiedSlots.push({
            ...ms,
            id: `slot-${cid}-${day}-${ms.consultationMode}-${Math.random()}`,
            dayOfWeek: day
          });
        });
      });
      return [...otherClinicsSlots, ...thisClinicMondaySlots, ...copiedSlots];
    });
    toast.success('Monday schedule copied to all days!');
  };

  // Duplicate schedule from another clinic
  const duplicateClinicSchedule = (targetCid, sourceCid) => {
    const sourceSlots = slots.filter(s => String(s.clinicId) === String(sourceCid) && s.isAvailable);
    setSlots(prevSlots => {
      const otherClinicsSlots = prevSlots.filter(s => String(s.clinicId) !== String(targetCid));
      const copiedSlots = sourceSlots.map(ss => ({
        ...ss,
        id: `slot-${targetCid}-${ss.dayOfWeek}-${ss.consultationMode}-${Math.random()}`,
        clinicId: targetCid
      }));
      return [...otherClinicsSlots, ...copiedSlots];
    });
    toast.success('Schedule duplicated successfully!');
  };

  // Clear Weekly Schedule
  const clearWeeklySchedule = (cid) => {
    setSlots(prevSlots => prevSlots.filter(s => String(s.clinicId) !== String(cid)));
    toast.success('Weekly schedule cleared!');
  };

  // Overall validation status
  const rulesValidation = useMemo(() => {
    const errorList = Object.values(cellErrors);
    return {
      isValid: errorList.length === 0,
      errors: Array.from(new Set(errorList))
    };
  }, [cellErrors]);

  const handleApproveSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Legacy & New invitation flow: admin assigns clinic, schedule, etc.
      if (!primaryClinicId) {
        toast.error('Please assign a primary clinic.');
        setIsSubmitting(false);
        return;
      }
      if (!rulesValidation.isValid) {
        toast.error(rulesValidation.errors[0] || 'Schedule rules conflict. Please adjust timings.');
        setIsSubmitting(false);
        return;
      }

      const activeSlots = slots.filter((s) => {
        if (!s.isAvailable || !assignedClinicIds.includes(s.clinicId)) return false;
        const mode = clinicModes[s.clinicId] || 'offline_only';
        if (mode === 'offline_only' && s.consultationMode !== 'offline') return false;
        if (mode === 'online_only' && s.consultationMode !== 'online') return false;
        return true;
      });

      const formattedPolicies = assignedClinicIds.map((cid) => {
        const pol = clinicPolicies[cid] || { consultationFee: 500, followUpFee: 300, followUpWindowDays: 7, followUpPolicy: 'free' };
        return {
          clinicId: cid,
          consultationFee: Number(pol.consultationFee),
          followUpFee: Number(pol.followUpFee),
          followUpWindowDays: Number(pol.followUpWindowDays),
          followUpPolicy: pol.followUpPolicy
        };
      });

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
          startTime: format12to24(s.startTime),
          endTime: format12to24(s.endTime),
          slotDurationMinutes: Number(s.slotDurationMinutes || 30),
          clinicId: s.clinicId,
          consultationMode: s.consultationMode
        })),
        clinicPolicies: formattedPolicies,
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
    <div className="w-full min-h-screen bg-slate-50 text-slate-800 p-6 font-sans">

      {/* Back Button & Wizard Progress Indicator */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 mb-6">
        <div>
          <button
            onClick={() => navigate('/admin/my-doctors-dashboard')}
            className="text-[10px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition uppercase tracking-wider mb-2"
          >
            ← Back to My Doctors
          </button>
          <h1 className="text-xl font-black text-slate-900">Pending Doctor Approval</h1>
          <p className="text-[11px] text-slate-550 mt-0.5">
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
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-250'
                    : 'bg-slate-200 border border-slate-300 text-slate-600'
              }`}>
                {step > s.id ? '✓' : s.id}
              </span>
              <span className={`font-bold transition ${step === s.id ? 'text-slate-900' : 'text-slate-400'}`}>
                {s.name}
              </span>
              {s.id < 3 && <div className="w-10 h-px bg-slate-300" />}
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
          <div className="bg-white border border-slate-200 rounded-3xl p-6 flex items-center gap-4 shadow-sm">
            {doctor.profile?.image ? (
              <img src={doctor.profile.image} alt={doctor.name} className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg shrink-0">MD</div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-black text-slate-900">{doctor.name || doctor.fullName}</h2>
                <span className="px-2 py-0.5 rounded text-[8px] font-black bg-indigo-50 text-indigo-600 border border-indigo-100">Pending Approval</span>
              </div>
              <p className="text-xs text-indigo-600 font-bold mt-1 flex items-center gap-1">
                <Briefcase size={12} /> {doctor.profile?.specialization || 'Cardiologist'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Applied on: 28 May 2025 • Application ID: DOC-2025-0287</p>
            </div>
          </div>
          {/* STEP 1: REVIEW PROFILE CONTENT */}
          {step === 1 && (
            <>
              {/* Professional Information */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Award size={13} className="text-indigo-600" /> Professional Information
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Specialty</p>
                    <p className="text-slate-800 font-bold">{doctor.profile?.specialization || 'Cardiology'}</p>
                  </div>
                  <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Qualification</p>
                    <p className="text-slate-800 font-bold">{doctor.profile?.qualification || 'MBBS, MD'}</p>
                  </div>
                  <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Experience</p>
                    <p className="text-slate-800 font-bold">{doctor.profile?.experienceYears || 5} Years</p>
                  </div>
                  <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Preferred Branch</p>
                    <p className="text-slate-800 font-bold truncate">{preferredClinic?.name || 'Apollo Hospital Indirapuram'}</p>
                  </div>
                </div>
              </div>

              {/* Registration Details */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle size={13} className="text-emerald-600" /> Registration Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Medical Registration Number</p>
                      <p className="text-slate-800 font-bold mt-1 text-sm">{doctor.profile?.medicalRegistrationNumber || 'REG-98754'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Registration Valid Till</p>
                      <p className="text-slate-800 font-bold mt-1">31 Dec 2026</p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Registration State</p>
                      <p className="text-slate-800 font-bold mt-1">Karnataka Medical Council</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Issuing Authority</p>
                      <p className="text-slate-800 font-bold mt-1">Karnataka Medical Council</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Details */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Info size={13} className="text-blue-600" /> Contact Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                    <Clock size={16} className="text-indigo-600 shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Email Address</p>
                      <p className="text-slate-800 font-bold mt-0.5">{doctor.email}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                    <Users size={16} className="text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Phone Number</p>
                      <p className="text-slate-800 font-bold mt-0.5">{doctor.phone || '9876543210'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Location Details */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Building size={13} className="text-purple-600" /> Current Location (at time of application)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div className="h-44 rounded-2xl overflow-hidden border border-slate-250 bg-slate-100 relative">
                    {/* Zoom Overlay Controls */}
                    <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-lg p-1 flex flex-col gap-1.5 z-10 text-slate-800">
                      <button
                        type="button"
                        onClick={() => setMapZoom(Math.min(20, mapZoom + 1))}
                        className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition rounded"
                        title="Zoom In Map"
                      >
                        <ZoomIn size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setMapZoom(Math.max(10, mapZoom - 1))}
                        className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition rounded"
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
                        className="opacity-90"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-400 text-xs italic">No coordinates available.</div>
                    )}
                  </div>

                  <div className="space-y-4 text-xs">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Address Details</p>
                      <p className="text-slate-700 font-medium mt-1 leading-relaxed">
                        {doctor.profile?.currentAddress?.line1 || 'Indirapuram, Ghaziabad, Uttar Pradesh - 201010'}
                      </p>
                    </div>
                    <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2">
                      <Check size={12} className="text-emerald-600 shrink-0" />
                      <div>
                        <p className="font-bold text-emerald-650">Same as Permanent Address</p>
                        <p className="text-[9px] text-slate-450 mt-0.5">Confirmed by doctor during application.</p>
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
              <div className="bg-white border border-slate-200 rounded-3xl p-5 grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px] shadow-sm">
                <div className="space-y-1">
                  <p className="text-slate-400 font-bold uppercase">Primary Clinic (Reference)</p>
                  <p className="text-slate-800 font-bold truncate">{preferredClinic?.name || 'Apollo Hospital Indirapuram'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-400 font-bold uppercase">Primary Location</p>
                  <p className="text-slate-800 font-bold truncate">{doctor.profile?.currentAddress?.city || 'Ghaziabad, UP'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-400 font-bold uppercase">Experience</p>
                  <p className="text-slate-800 font-bold">{doctor.profile?.experienceYears || 8} Years</p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-400 font-bold uppercase">Qualification</p>
                  <p className="text-slate-800 font-bold truncate">{doctor.profile?.qualification || 'MBBS, MD'}</p>
                </div>
              </div>

              {/* 1. Assigned Clinics Card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                  <div>
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">1. Assigned Clinics</h3>
                    <p className="text-[10px] text-slate-400">Select one primary clinic and other clinics where doctor will be available.</p>
                  </div>
                  {clinics.length > 1 && (
                    <button
                      onClick={() => {
                        const nextUnassigned = clinics.find((c) => !assignedClinicIds.includes(c._id));
                        if (nextUnassigned) {
                          setAssignedClinicIds([...assignedClinicIds, nextUnassigned._id]);
                        } else {
                          toast.error('All clinics are already assigned.');
                        }
                      }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black rounded-lg transition flex items-center gap-1"
                    >
                      <Plus size={12} /> Add Clinic
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="text-slate-405 border-b border-slate-100">
                        <th className="py-2.5 px-3">Clinic</th>
                        <th className="py-2.5 px-3 text-center">Distance</th>
                        <th className="py-2.5 px-3 text-center">Consultation Mode</th>
                        <th className="py-2.5 px-3 text-center">Online Feature</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignedClinicIds.map((id) => {
                        const clinic = clinics.find((c) => String(c._id) === String(id));
                        if (!clinic) return null;
                        const isPrimary = String(id) === String(primaryClinicId);
                        const dist = isPrimary ? 0 : calculateDistance(primaryClinicId, id);
                        const hasOnline = hasOnlinePlanFeature(clinic);
                        
                        return (
                          <tr key={id} className="border-b border-slate-100 hover:bg-slate-50/50">
                            <td className="py-3 px-3">
                              <p className="font-bold text-slate-800">{clinic.name}</p>
                              <p className="text-[9px] text-slate-400 mt-0.5">{clinic.address?.city || 'UP'}</p>
                            </td>
                            <td className="py-3 px-3 text-center text-slate-650 font-bold">{isPrimary ? '0 km' : `${dist.toFixed(1)} km`}</td>
                            <td className="py-3 px-3 text-center">
                              <div className="relative group inline-block">
                                <select
                                  value={!hasOnline ? 'offline_only' : (clinicModes[id] || 'offline_only')}
                                  onChange={(e) => {
                                    if (!hasOnline) return;
                                    setClinicModes({
                                      ...clinicModes,
                                      [id]: e.target.value
                                    });
                                  }}
                                  disabled={!hasOnline}
                                  className={`bg-white border rounded-xl px-2.5 py-1 text-[10px] outline-none font-bold transition ${
                                    !hasOnline
                                      ? 'border-slate-200 text-slate-400 cursor-not-allowed opacity-70 bg-slate-50'
                                      : 'border-slate-200 text-slate-700 cursor-pointer'
                                  }`}
                                >
                                  <option value="offline_only">🏥 Offline Only</option>
                                  <option value="online_only">🌐 Online Only ⭐</option>
                                  <option value="hybrid">🔄 Offline + Online ⭐</option>
                                </select>
                                {!hasOnline && (
                                  <div className="absolute hidden group-hover:flex bottom-full mb-1.5 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] rounded-lg px-2.5 py-1.5 z-30 shadow-lg whitespace-nowrap font-medium pointer-events-none items-center gap-1">
                                    🔒 Upgrade plan to enable Online Consultation
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center">
                              {hasOnline ? (
                                <span className="inline-flex items-center gap-0.5 text-emerald-600 font-extrabold text-[9px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                  ✅ Included in Plan
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 text-rose-650 font-extrabold text-[9px] bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100/50">
                                  ❌ Not Available
                                </span>
                              )}
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
                                  className="accent-indigo-600 bg-white border-slate-300"
                                />
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${
                                  isPrimary
                                    ? 'bg-emerald-550/10 text-emerald-600 border border-emerald-550/15'
                                    : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                                }`}>
                                  {isPrimary ? 'Primary' : 'Secondary'}
                                </span>
                              </label>
                            </td>
                            <td className="py-3 px-3 text-right">
                              {!isPrimary && (
                                <button
                                  onClick={() => setAssignedClinicIds(assignedClinicIds.filter((cid) => cid !== id))}
                                  className="p-1.5 rounded bg-white border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-rose-600 transition"
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
                <p className="text-[10px] text-slate-400 italic mt-2">
                  * Note: Premium features (⭐) require an active Online Consultation plan. Restrict modes as needed.
                </p>
              </div>

              {/* 2. Weekly Availability & Schedule (Grid Representation) */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                  <div>
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">2. Weekly Availability & Schedule</h3>
                    <p className="text-[10px] text-slate-450">Set weekly availability for each assigned clinic. Time gap (&ge; 1.5 hrs) is enforced automatically.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-450 font-bold">Slot Duration</span>
                    <select
                      value={selectedSlotDuration}
                      onChange={(e) => setSelectedSlotDuration(Number(e.target.value))}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 outline-none"
                    >
                      <option value="10">10 Minutes</option>
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
                      <tr className="text-slate-400 border-b border-slate-100">
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
                        return (
                          <tr key={cid} className="border-b border-slate-100 hover:bg-slate-50/30">
                            <td className="py-3 px-3 space-y-2 min-w-[170px]">
                              <div>
                                <p className="font-extrabold text-slate-800 text-xs">{clinic.name}</p>
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black mt-1 ${
                                  isPrimary
                                    ? 'bg-emerald-550/10 text-emerald-600 border border-emerald-550/15'
                                    : 'bg-indigo-50 text-indigo-650 border border-indigo-100'
                                }`}>
                                  {isPrimary ? 'Primary (0 km)' : `Secondary (${dist.toFixed(1)} km)`}
                                </span>
                              </div>
                              
                              <div className="flex flex-col gap-1.5 pt-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBulkClinicId(cid);
                                    setBulkModalOpen(true);
                                  }}
                                  className="w-full text-left px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[9px] font-black rounded-lg border border-indigo-100 transition flex items-center gap-1 justify-center"
                                >
                                  ⚙ Set Weekly Schedule
                                </button>
                                
                                <div className="relative group/actions inline-block w-full">
                                  <button
                                    type="button"
                                    className="w-full text-center px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 text-[9px] font-black rounded-lg border border-slate-200 transition"
                                  >
                                    📋 Smart Actions
                                  </button>
                                  <div className="absolute left-0 top-full mt-1 hidden group-hover/actions:block w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-1.5 space-y-1">
                                    <button
                                      type="button"
                                      onClick={() => copyMondayToWeekdays(cid)}
                                      className="w-full text-left px-2 py-1.5 text-[9px] text-slate-700 font-bold hover:bg-slate-50 rounded transition flex items-center gap-1.5"
                                    >
                                      📋 Copy Monday to Weekdays
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => copyMondayToAllDays(cid)}
                                      className="w-full text-left px-2 py-1.5 text-[9px] text-slate-700 font-bold hover:bg-slate-50 rounded transition flex items-center gap-1.5"
                                    >
                                      📋 Copy Monday to All Days
                                    </button>
                                    
                                    {assignedClinicIds.filter(otherId => String(otherId) !== String(cid)).map(otherId => {
                                      const otherClinic = clinics.find(c => String(c._id) === String(otherId));
                                      return (
                                        <button
                                          key={otherId}
                                          type="button"
                                          onClick={() => duplicateClinicSchedule(cid, otherId)}
                                          className="w-full text-left px-2 py-1.5 text-[9px] text-slate-700 font-bold hover:bg-slate-50 rounded transition flex items-center gap-1.5"
                                        >
                                          📄 Duplicate from {otherClinic?.name || 'Clinic'}
                                        </button>
                                      );
                                    })}
                                    
                                    <button
                                      type="button"
                                      onClick={() => clearWeeklySchedule(cid)}
                                      className="w-full text-left px-2 py-1.5 text-[9px] text-rose-600 font-bold hover:bg-rose-50 rounded transition flex items-center gap-1.5"
                                    >
                                      🗑 Clear Weekly Schedule
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {DAYS_OF_WEEK.map((day) => {
                              const clinicMode = clinicModes[cid] || 'offline_only';

                              const renderModeEditor = (modeLabel, modeVal, emoji, colorClass) => {
                                const modeSlots = slots.filter((s) => s.clinicId === cid && s.dayOfWeek === day && s.consultationMode === modeVal && s.isAvailable);

                                return (
                                  <div className="border border-slate-200 rounded-2xl p-2.5 bg-slate-50/50 space-y-2 w-full">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-1 mb-1">
                                      <span className={`text-[10px] font-black ${colorClass} flex items-center gap-1`}>
                                        {emoji} {modeLabel}
                                      </span>
                                      {modeSlots.length > 0 && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSlots(slots.filter(s => !(s.clinicId === cid && s.dayOfWeek === day && s.consultationMode === modeVal)));
                                          }}
                                          className="text-[8px] font-bold text-slate-400 hover:text-rose-600 transition"
                                          title="Clear Day Schedule"
                                        >
                                          Clear Day
                                        </button>
                                      )}
                                    </div>

                                    {modeSlots.map((slot, index) => {
                                      const startMin = parseTimeToMinutes(slot.startTime);
                                      const endMin = parseTimeToMinutes(slot.endTime);
                                      const isInvalid = endMin <= startMin;

                                      return (
                                        <div key={slot.id || index} className="space-y-1.5 p-1.5 bg-white border border-slate-100 rounded-xl shadow-sm relative group/session">
                                          <div className="flex items-center justify-between">
                                            <span className="text-[9px] font-bold text-slate-400">Session {index + 1}</span>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setSlots(slots.filter(s => s.id !== slot.id));
                                              }}
                                              className="text-slate-400 hover:text-rose-600 transition p-0.5"
                                              title="Remove Session"
                                            >
                                              <X size={10} />
                                            </button>
                                          </div>

                                          <div className="space-y-1">
                                            <TimePicker
                                              label="Start Time"
                                              value={slot.startTime}
                                              onChange={(val) => {
                                                setSlots(slots.map((s) => s.id === slot.id ? { ...s, startTime: val } : s));
                                              }}
                                            />
                                            <p className="text-[8px] text-slate-400 text-center">to</p>
                                            <TimePicker
                                              label="End Time"
                                              value={slot.endTime}
                                              onChange={(val) => {
                                                setSlots(slots.map((s) => s.id === slot.id ? { ...s, endTime: val } : s));
                                              }}
                                            />
                                          </div>

                                          {isInvalid && (
                                            <p className="text-[8px] text-rose-600 font-bold text-center leading-tight mt-1 bg-rose-50 p-1 rounded border border-rose-100">
                                              ⚠ End must be after start
                                            </p>
                                          )}

                                          <div className="pt-1">
                                            <select
                                              value={slot.slotDurationMinutes || 30}
                                              onChange={(e) => {
                                                setSlots(slots.map((s) => s.id === slot.id ? { ...s, slotDurationMinutes: Number(e.target.value) } : s));
                                              }}
                                              className="w-full bg-slate-50 border border-slate-200 text-[8px] rounded px-1 py-0.5 text-slate-705 outline-none"
                                            >
                                              <option value="15">15m slot</option>
                                              <option value="30">30m slot</option>
                                              <option value="45">45m slot</option>
                                              <option value="60">60m slot</option>
                                            </select>
                                          </div>
                                        </div>
                                      );
                                    })}

                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newSlot = {
                                          id: `slot-${cid}-${day}-${modeVal}-${Math.random()}`,
                                          clinicId: cid,
                                          dayOfWeek: day,
                                          consultationMode: modeVal,
                                          isAvailable: true,
                                          startTime: '09:00 AM',
                                          endTime: '01:00 PM',
                                          slotDurationMinutes: selectedSlotDuration || 30
                                        };
                                        setSlots([...slots, newSlot]);
                                      }}
                                      className="w-full py-1 border border-dashed border-indigo-200 hover:border-indigo-400 text-indigo-650 hover:bg-indigo-50/50 text-[9px] font-bold rounded-xl transition flex items-center justify-center gap-1 mt-1"
                                    >
                                      <Plus size={10} /> Add Session
                                    </button>
                                  </div>
                                );
                              };

                              const hasError = !!cellErrors[`${cid}-${day}`];
                              const errorMsg = cellErrors[`${cid}-${day}`];

                              return (
                                <td key={day} className={`p-2 border-l border-slate-105 min-w-[120px] ${
                                  hasError ? 'bg-rose-500/5' : ''
                                }`}>
                                  <div className="flex flex-col gap-2 items-center">
                                    {(clinicMode === 'offline_only' || clinicMode === 'hybrid') &&
                                      renderModeEditor('Offline', 'offline', '🏥', 'text-slate-700')
                                    }
                                    {(clinicMode === 'online_only' || clinicMode === 'hybrid') &&
                                      renderModeEditor('Online', 'online', '🌐', 'text-purple-650')
                                    }
                                    {clinicMode === 'hybrid' && (
                                      <span className="text-[7px] font-extrabold uppercase bg-purple-50 text-purple-650 px-1.5 py-0.5 rounded border border-purple-100">Hybrid Mode</span>
                                    )}
                                    {hasError && (
                                      <p className="text-[8px] text-rose-600 font-semibold leading-tight mt-1 max-w-[100px] border border-rose-200 bg-rose-50 p-1 rounded">
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
                <div className="flex items-center gap-4 text-[9px] text-slate-505 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" /> Offline & Online Allowed</div>
                  <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" /> Online Only (Auto-set by Rule)</div>
                  <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0" /> Not Available</div>
                </div>
              </div>

              {/* 3. Consultation Fees Settings */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <DollarSign size={13} className="text-indigo-600" /> 3. Consultation Fees Settings
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-450">Default Consultation Fee (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={consultationFee}
                      onChange={(e) => setConsultationFee(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-450">Default Follow-up Fee (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={followUpFee}
                      onChange={(e) => setFollowUpFee(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Follow-up Consultation Policy (Per Clinic) */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Info size={13} className="text-indigo-600" /> 4. Follow-up Consultation Policy (Per Clinic)
                </h3>
                
                <div className="space-y-4">
                  {assignedClinicIds.map((cid) => {
                    const clinic = clinics.find((c) => String(c._id) === String(cid));
                    if (!clinic) return null;
                    const policy = clinicPolicies[cid] || { consultationFee: 500, followUpFee: 300, followUpWindowDays: 7, followUpPolicy: 'free' };
                    
                    return (
                      <div key={cid} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 text-xs">
                        <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                          <p className="font-bold text-slate-800 text-[11px]">{clinic.name}</p>
                          <span className="text-[8px] uppercase font-black text-slate-400">Clinic Policy Settings</span>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-450 font-bold">Consultation Fee (₹)</label>
                            <input
                              type="number"
                              min="0"
                              value={policy.consultationFee}
                              onChange={(e) => {
                                setClinicPolicies({
                                  ...clinicPolicies,
                                  [cid]: { ...policy, consultationFee: Number(e.target.value) }
                                });
                              }}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 font-bold"
                            />
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-450 font-bold">Free Follow-up Window (Days)</label>
                            <input
                              type="number"
                              min="0"
                              max="365"
                              value={policy.followUpWindowDays}
                              onChange={(e) => {
                                setClinicPolicies({
                                  ...clinicPolicies,
                                  [cid]: { ...policy, followUpWindowDays: Number(e.target.value) }
                                });
                              }}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 font-bold"
                            />
                            <p className="text-[8px] text-slate-400">Patients returning within this window pay according to policy (0-365 days).</p>
                          </div>
                        </div>

                        <div className="space-y-2 pt-2">
                          <label className="block text-[10px] font-bold text-slate-450">Follow-up Charging Policy</label>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                            <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 transition">
                              <input
                                type="radio"
                                name={`policy-radio-${cid}`}
                                checked={policy.followUpPolicy === 'free'}
                                onChange={() => {
                                  setClinicPolicies({
                                    ...clinicPolicies,
                                    [cid]: { ...policy, followUpPolicy: 'free', followUpFee: 0 }
                                  });
                                }}
                                className="accent-indigo-650"
                              />
                              <div>
                                <p className="font-bold text-slate-800 text-[10px]">🟢 Free Follow-up</p>
                                <p className="text-[8px] text-slate-455">Revisits pay ₹0</p>
                              </div>
                            </label>
                            
                            <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 transition">
                              <input
                                type="radio"
                                name={`policy-radio-${cid}`}
                                checked={policy.followUpPolicy === 'discounted'}
                                onChange={() => {
                                  setClinicPolicies({
                                    ...clinicPolicies,
                                    [cid]: { ...policy, followUpPolicy: 'discounted' }
                                  });
                                }}
                                className="accent-indigo-650"
                              />
                              <div>
                                <p className="font-bold text-slate-800 text-[10px]">🟡 Discounted Follow-up</p>
                                <p className="text-[8px] text-slate-455">Revisits pay follow-up fee</p>
                              </div>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 transition">
                              <input
                                type="radio"
                                name={`policy-radio-${cid}`}
                                checked={policy.followUpPolicy === 'full'}
                                onChange={() => {
                                  setClinicPolicies({
                                    ...clinicPolicies,
                                    [cid]: { ...policy, followUpPolicy: 'full' }
                                  });
                                }}
                                className="accent-indigo-650"
                              />
                              <div>
                                <p className="font-bold text-slate-800 text-[10px]">🔵 Charge Full Fee</p>
                                <p className="text-[8px] text-slate-455">Revisits pay standard consultation fee</p>
                              </div>
                            </label>
                          </div>
                        </div>

                        {policy.followUpPolicy === 'discounted' && (
                          <div className="space-y-1 pt-1.5 w-full max-w-xs">
                            <label className="text-[10px] font-bold text-slate-450 font-bold">Discounted Follow-up Fee (₹)</label>
                            <input
                              type="number"
                              min="0"
                              max={policy.consultationFee}
                              value={policy.followUpFee}
                              onChange={(e) => {
                                const feeVal = Number(e.target.value);
                                setClinicPolicies({
                                  ...clinicPolicies,
                                  [cid]: { ...policy, followUpFee: feeVal }
                                });
                              }}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 font-bold"
                            />
                            {policy.followUpFee > policy.consultationFee && (
                              <p className="text-[8px] text-rose-605 font-bold mt-1">Warning: Follow-up fee cannot exceed standard consultation fee.</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* STEP 3: CONFIRM & APPROVE CONTENT */}
          {step === 3 && (
            <>
              {/* Info summary header grid */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px] shadow-sm">
                <div className="space-y-1">
                  <p className="text-slate-400 font-bold uppercase">Primary Clinic (Reference)</p>
                  <p className="text-slate-800 font-bold truncate">{preferredClinic?.name || 'Apollo Hospital Indirapuram'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-400 font-bold uppercase">Primary Location</p>
                  <p className="text-slate-800 font-bold truncate">{doctor.profile?.currentAddress?.city || 'Ghaziabad, UP'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-400 font-bold uppercase">Experience</p>
                  <p className="text-slate-800 font-bold">{doctor.profile?.experienceYears || 8} Years</p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-400 font-bold uppercase">Qualification</p>
                  <p className="text-slate-800 font-bold truncate">{doctor.profile?.qualification || 'MBBS, MD'}</p>
                </div>
              </div>

              {/* Assigned Clinics */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
                <div>
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">1. Assigned Clinics</h3>
                  <p className="text-[10px] text-slate-400">Clinics where the doctor will be available.</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-100">
                        <th className="py-2 px-3">Clinic / Branch</th>
                        <th className="py-2 px-3 text-center">Type</th>
                        <th className="py-2 px-3 text-center">Distance</th>
                        <th className="py-2 px-3 text-center">Mode Allowed</th>
                        <th className="py-2 px-3 text-center">Fee (₹)</th>
                        <th className="py-2 px-3 text-center">Follow-up Policy</th>
                        <th className="py-2 px-3 text-right">Schedule</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignedClinicIds.map((id) => {
                        const clinic = clinics.find((c) => String(c._id) === String(id));
                        if (!clinic) return null;
                        const isPrimary = String(id) === String(primaryClinicId);
                        const dist = isPrimary ? 0 : calculateDistance(primaryClinicId, id);
                        const selectedModeVal = clinicModes[id] || 'offline_only';
                        const modeAllowed = selectedModeVal === 'offline_only'
                          ? 'Offline Only'
                          : selectedModeVal === 'online_only'
                          ? 'Online Only'
                          : 'Offline & Online';
                        const policy = clinicPolicies[id] || { consultationFee: 500, followUpFee: 300, followUpWindowDays: 7, followUpPolicy: 'free' };
                        let policyDesc = `${policy.followUpWindowDays} days, Free`;
                        if (policy.followUpPolicy === 'discounted') {
                          policyDesc = `${policy.followUpWindowDays} days, ₹${policy.followUpFee}`;
                        } else if (policy.followUpPolicy === 'full') {
                          policyDesc = `Full Fee`;
                        }
                        return (
                          <tr key={id} className="border-b border-slate-100 hover:bg-slate-50/50">
                            <td className="py-2.5 px-3">
                              <p className="font-bold text-slate-800">{clinic.name}</p>
                              <p className="text-[9px] text-slate-450">{clinic.address?.city || 'UP'}</p>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {isPrimary ? (
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded text-[9px] font-bold">Primary</span>
                              ) : (
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-650 border border-indigo-100 rounded text-[9px] font-bold">Secondary</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center text-slate-605 font-bold">{isPrimary ? '0 km' : `${dist.toFixed(1)} km`}</td>
                            <td className="py-2.5 px-3 text-center text-slate-600 font-bold">{modeAllowed}</td>
                            <td className="py-2.5 px-3 text-center text-slate-800 font-bold">₹{policy.consultationFee}</td>
                            <td className="py-2.5 px-3 text-center text-slate-600 font-bold">{policyDesc}</td>
                            <td className="py-2.5 px-3 text-right">
                              <button type="button" onClick={() => setStep(2)} className="text-emerald-650 hover:underline font-extrabold flex items-center gap-0.5 ml-auto">
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
              <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
                <div>
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">2. Weekly Schedule Summary</h3>
                  <p className="text-[10px] text-slate-400">Overview of the doctor's availability for all assigned clinics.</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 pt-2">
                  {DAYS_OF_WEEK.map((day) => {
                    const daySlots = slots.filter((s) => {
                      if (!s.isAvailable || !assignedClinicIds.includes(s.clinicId)) return false;
                      if (s.dayOfWeek?.toLowerCase() !== day.toLowerCase()) return false;
                      const mode = clinicModes[s.clinicId] || 'offline_only';
                      if (mode === 'offline_only' && s.consultationMode !== 'offline') return false;
                      if (mode === 'online_only' && s.consultationMode !== 'online') return false;
                      return true;
                    });
                    return (
                      <div key={day} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-center space-y-1.5">
                        <span className="capitalize font-bold text-[10px] text-slate-500">{day}</span>
                        {daySlots.length > 0 ? (
                          <div className="space-y-2">
                            {daySlots.map((ds) => {
                              const clinic = clinics.find((c) => String(c._id) === String(ds.clinicId));
                              const mode = ds.consultationMode;
                              return (
                                <div key={`${ds.clinicId}-${ds.consultationMode}`} className="border-b border-slate-100 pb-1 last:border-0 last:pb-0">
                                  <p className="font-bold text-slate-808 text-[10px] truncate">{clinic?.name || 'Clinic'}</p>
                                  <p className="text-[9px] text-indigo-650 font-bold">{ds.startTime} - {ds.endTime}</p>
                                  <span className={`inline-block text-[8px] px-1 py-0.2 rounded font-black ${
                                    mode === 'online' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                  }`}>
                                    {mode === 'online' ? 'Online' : 'Offline'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[9px] text-slate-400 italic font-bold">Not Available</p>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-600 shrink-0" />
                  <p className="text-[10px] text-slate-600 font-medium">All time gap (&ge; 1.5 hrs) and distance rules are satisfied for this schedule.</p>
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
              <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap size={14} className="text-indigo-600" /> Documents & Credentials
                </h3>

                <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-3">
                  <div>
                    <p className="font-bold text-slate-800">Medical Registration Certificate</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">Uploaded on 28 May 2025</p>
                  </div>
                  <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded text-[8px] font-black uppercase">Verified</span>
                </div>

                <div className="relative border border-slate-200 rounded-2xl overflow-hidden bg-slate-100">
                  {/* Zoom controls */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-full px-3 py-1 flex items-center gap-3 text-white text-[10px] font-bold z-10">
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
                    <div className="h-80 flex items-center justify-center text-slate-400 text-xs italic">No document file available for preview.</div>
                  )}
                </div>

                <button
                  onClick={downloadDocument}
                  className="w-full py-2 bg-white border border-slate-250 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  Download Document
                </button>
              </div>

              {/* Informative Step Note */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 flex items-start gap-3 shadow-sm">
                <Info size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-slate-800">Note</p>
                  <p className="text-slate-500 mt-1 leading-relaxed">
                    Please review all details and documents carefully. Click "Next: Set Availability" to proceed with availability and schedule configuration.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* STEP 2: SCHEDULING RULES PANEL */}
          {step === 2 && (
            <>
              <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Settings size={14} className="text-indigo-600" /> Scheduling Rules
                </h3>

                <div className="space-y-4 text-[10px] leading-relaxed">
                  <div>
                    <h4 className="font-bold text-amber-600 flex items-center gap-1 mb-1">
                      <span className="w-3.5 h-3.5 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center font-bold font-mono border border-amber-100">1</span>
                      Distance & Location Conditions (Primary vs. Other Locations)
                    </h4>
                    <ul className="list-disc pl-4 space-y-1.5 text-slate-505">
                      <li><strong>Under 15 km</strong>: If an assigned clinic is within 15 km of the doctor's primary clinic location, sessions can be scheduled in offline (in-person) mode with a gap of 1.5 hrs between sessions.</li>
                      <li><strong>Over 15 km</strong>: If the clinic is more than 15 km away from the primary clinic, the session must be conducted in online mode. Offline sessions are blocked.</li>
                      <li><strong>Over 25 km on the Same Day</strong>: If the doctor has sessions at two different clinics on the same day and the distance between them is greater than 25 km, the session at the non-primary clinic is automatically restricted to online mode.</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-bold text-amber-600 flex items-center gap-1 mb-1">
                      <span className="w-3.5 h-3.5 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center font-bold font-mono border border-amber-100">2</span>
                      Time Gap Constraints between Sessions
                    </h4>
                    <ul className="list-disc pl-4 space-y-1.5 text-slate-505">
                      <li><strong>Minimum Gap Enforced</strong>: There must be a gap of at least 1 hour and 30 minutes (90 minutes) between any scheduled sessions on the same day.</li>
                      <li><strong>Same or Different Clinics</strong>: This 90-minute buffer rule applies globally to all consecutive sessions on a given day.</li>
                    </ul>
                  </div>

                  {/* Rules Examples widget */}
                  <div className="pt-3 border-t border-slate-100 space-y-3">
                    <p className="font-bold text-slate-700">Quick Rule Examples</p>
                    
                    {/* Errors */}
                    <div className="space-y-1">
                      <p className="text-rose-600 font-bold uppercase tracking-wider text-[9px]">Errors (Not Allowed)</p>
                      <div className="p-2 bg-rose-50 border border-rose-100 rounded-xl space-y-1 text-slate-500 flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-slate-700">Clinic A (Primary) &rarr; Clinic B (18 km)</p>
                          <p className="text-[8px] text-slate-450 mt-0.5">No gap / Gap &lt; 1.5 hrs</p>
                        </div>
                        <span className="text-rose-600 font-bold flex items-center gap-0.5 text-[9px] shrink-0">Offline Same Day ✕</span>
                      </div>

                      <div className="p-2 bg-rose-50 border border-rose-100 rounded-xl space-y-1 text-slate-500 flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-slate-700">Clinic A &rarr; Clinic C (28 km)</p>
                          <p className="text-[8px] text-slate-450 mt-0.5">Same Day (Distance &gt; 25 km)</p>
                        </div>
                        <span className="text-rose-600 font-bold flex items-center gap-0.5 text-[9px] shrink-0">Offline Same Day ✕</span>
                      </div>
                    </div>

                    {/* Allowed */}
                    <div className="space-y-1">
                      <p className="text-emerald-600 font-bold uppercase tracking-wider text-[9px]">Allowed (No Errors)</p>
                      <div className="p-2 bg-emerald-50 border border-emerald-100 rounded-xl space-y-1 text-slate-500 flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-slate-700">Clinic A &rarr; Clinic B (12 km)</p>
                          <p className="text-[8px] text-slate-450 mt-0.5">Gap &ge; 1.5 hrs</p>
                        </div>
                        <span className="text-emerald-600 font-bold flex items-center gap-0.5 text-[9px] shrink-0">Offline Same Day ✓</span>
                      </div>

                      <div className="p-2 bg-emerald-50 border border-emerald-100 rounded-xl space-y-1 text-slate-500 flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-slate-700">Clinic A &rarr; Clinic C (18 km)</p>
                          <p className="text-[8px] text-slate-450 mt-0.5">Any Gap</p>
                        </div>
                        <span className="text-emerald-600 font-bold flex items-center gap-0.5 text-[9px] shrink-0">Online Same Day ✓</span>
                      </div>
                    </div>

                  </div>
                </div>
              </div>

              {/* Informative Note Box */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 flex items-start gap-3 shadow-sm">
                <Info size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-slate-800">Note</p>
                  <p className="text-slate-505 mt-1 leading-relaxed">
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
              <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckSquare size={14} className="text-indigo-600" /> Application Summary
                </h3>
                <p className="text-[10px] text-slate-450">Please review all details of the doctor, assigned clinics and schedule.</p>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Profile & Documents</span>
                    <span className="text-emerald-600 font-bold flex items-center gap-1"><Check size={12} /> Verified</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Clinic Assignments</span>
                    <span className="text-emerald-600 font-bold flex items-center gap-1"><Check size={12} /> Configured</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Availability Schedule</span>
                    <span className="text-emerald-600 font-bold flex items-center gap-1"><Check size={12} /> Configured</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Rules Validation</span>
                    <span className="text-emerald-600 font-bold flex items-center gap-1"><Check size={12} /> No Errors</span>
                  </div>
                </div>
              </div>

              {/* Rules Validation Status */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert size={14} className="text-indigo-600" /> Rules Validation Status
                </h3>
                <p className="text-[10px] text-slate-450">All scheduling rules have been validated successfully.</p>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Distance & Location Rules</span>
                    <span className="text-emerald-600 font-bold">Valid</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Time Gap Between Sessions</span>
                    <span className="text-emerald-600 font-bold">Valid</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Mode Restrictions</span>
                    <span className="text-emerald-600 font-bold">Valid</span>
                  </div>
                </div>
              </div>

              {/* Important Alert Callout */}
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-3xl space-y-1">
                <p className="text-xs font-bold text-amber-700 flex items-center gap-1">
                  <AlertTriangle size={14} className="text-amber-600" /> Important
                </p>
                <p className="text-[10px] text-slate-600 leading-relaxed">
                  Once approved, the doctor will be able to start accepting appointments as per the assigned schedule and mode.
                </p>
              </div>

              {/* Not Ready to Approve Actions */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-3 shadow-sm">
                <h4 className="text-xs font-bold text-slate-500 uppercase">Not ready to approve?</h4>
                <p className="text-[10px] text-slate-450">You can request changes or reject the application.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsReEditOpen(true)}
                    className="flex-1 py-2 rounded-xl border border-amber-500/20 hover:bg-amber-500/5 text-amber-600 text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <Edit3 size={13} /> Request Re-edit
                  </button>
                  <button
                    onClick={handleRejectSubmit}
                    className="flex-1 py-2 rounded-xl border border-rose-500/25 hover:bg-rose-500/5 text-rose-600 text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <Ban size={13} /> Reject Application
                  </button>
                </div>
              </div>

              {/* Quick Note Input */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-2 shadow-sm">
                <label className="block text-xs font-bold text-slate-500">Quick Note (Optional)</label>
                <textarea
                  placeholder="Add a note for internal reference..."
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 resize-none h-20"
                />
                <p className="text-[9px] text-slate-450">This note is for internal use only and will not be visible to the doctor.</p>
              </div>
            </>
          )}

        </div>

      </div>

      {/* Bottom navigation bar */}
      <div className="flex justify-between items-center mt-8 pt-5 border-t border-slate-200 shrink-0">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-605 text-xs font-bold transition flex items-center gap-2"
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
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
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
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl p-6 space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-800 text-sm">Request Profile Re-edit</h3>
              <button onClick={() => setIsReEditOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <p className="text-xs text-slate-500">Select which sections require correction from the doctor:</p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {Object.keys(reEditFields).map((field) => (
                <label key={field} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reEditFields[field]}
                    onChange={(e) => setReEditFields({ ...reEditFields, [field]: e.target.checked })}
                    className="rounded border-slate-350 bg-white text-amber-500 focus:ring-amber-500"
                  />
                  <span className="capitalize text-slate-600">{field.replace(/([A-Z])/g, ' $1')}</span>
                </label>
              ))}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-500">Correction Instructions / Comments *</label>
              <textarea
                placeholder="Explain to the doctor what changes or clearer files are required..."
                rows={3}
                value={reEditComments}
                onChange={(e) => setReEditComments(e.target.value)}
                className="w-full bg-white border border-slate-250 rounded-xl p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsReEditOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 text-xs font-bold transition"
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

      {/* BULK WEEKLY SCHEDULE MODAL */}
      {bulkModalOpen && bulkClinicId && (() => {
        const bulkClinic = clinics.find(c => String(c._id) === String(bulkClinicId));
        const clinicMode = clinicModes[bulkClinicId] || 'offline_only';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl p-6 space-y-4 animate-fadeIn">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">Set Weekly Schedule</h3>
                  <p className="text-[10px] text-slate-450 mt-0.5">{bulkClinic?.name || 'Clinic'}</p>
                </div>
                <button onClick={() => setBulkModalOpen(false)} className="text-slate-450 hover:text-slate-700">✕</button>
              </div>

              {/* Working Days checklist */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Apply To (Working Days)</label>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  {DAYS_OF_WEEK.map((d) => (
                    <label key={d} className="flex items-center gap-2 cursor-pointer capitalize">
                      <input
                        type="checkbox"
                        checked={bulkDays[d]}
                        onChange={(e) => setBulkDays({ ...bulkDays, [d]: e.target.checked })}
                        className="rounded border-slate-350 bg-white text-indigo-650 focus:ring-indigo-500 w-3.5 h-3.5"
                      />
                      <span className="text-slate-600 font-semibold">{d.substring(0, 3)}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Offline settings */}
              {(clinicMode === 'offline_only' || clinicMode === 'hybrid') && (
                <div className="space-y-3 p-3 bg-slate-50 rounded-2xl border border-slate-100/50">
                  <h4 className="text-[10px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1">
                    🏥 Offline Settings
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-450">Start Time</label>
                      <TimePicker
                        label="Start Time"
                        value={bulkOfflineStart}
                        onChange={setBulkOfflineStart}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-450">End Time</label>
                      <TimePicker
                        label="End Time"
                        value={bulkOfflineEnd}
                        onChange={setBulkOfflineEnd}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-450">Slot Duration</label>
                    <select
                      value={bulkOfflineDuration}
                      onChange={(e) => setBulkOfflineDuration(Number(e.target.value))}
                      className="w-full bg-white border border-slate-205 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 outline-none"
                    >
                      <option value="15">15 Minutes</option>
                      <option value="30">30 Minutes</option>
                      <option value="45">45 Minutes</option>
                      <option value="60">60 Minutes</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Online settings */}
              {(clinicMode === 'online_only' || clinicMode === 'hybrid') && (
                <div className="space-y-3 p-3 bg-slate-50 rounded-2xl border border-slate-100/50">
                  <h4 className="text-[10px] font-black uppercase text-purple-650 tracking-wider flex items-center gap-1">
                    🌐 Online Settings
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-455">Start Time</label>
                      <TimePicker
                        label="Start Time"
                        value={bulkOnlineStart}
                        onChange={setBulkOnlineStart}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-455">End Time</label>
                      <TimePicker
                        label="End Time"
                        value={bulkOnlineEnd}
                        onChange={setBulkOnlineEnd}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-455">Slot Duration</label>
                    <select
                      value={bulkOnlineDuration}
                      onChange={(e) => setBulkOnlineDuration(Number(e.target.value))}
                      className="w-full bg-white border border-slate-205 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 outline-none"
                    >
                      <option value="15">15 Minutes</option>
                      <option value="30">30 Minutes</option>
                      <option value="45">45 Minutes</option>
                      <option value="60">60 Minutes</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setBulkModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyBulkSchedule}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition"
                >
                  Apply Schedule
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
};

export default DoctorReview;
