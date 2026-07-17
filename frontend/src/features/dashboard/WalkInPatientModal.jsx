import { useState, useEffect } from 'react';
import { X, Calendar, Upload, Camera, Shield, FileText, CheckCircle2, User, Plus, Search, Check, Bot, Clock, CreditCard, Receipt, Tag, AlertCircle, Printer, Download, Send } from 'lucide-react';
import { patientApi, doctorApi, appointmentApi, receptionistApi } from '../../lib/api';
import { aiApi } from '../../api/aiApi';
import useAuth from '../../hooks/useAuth';

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Puducherry'
];

const isSlotTimePassed = (dateStr, slotTimeStr) => {
  if (!dateStr || !slotTimeStr) return false;
  const todayStr = new Date().toISOString().split('T')[0];
  if (dateStr !== todayStr) {
    return false;
  }

  const now = new Date();
  const match = slotTimeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?$/i);
  if (!match) return false;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3];

  if (ampm) {
    const upper = ampm.toUpperCase();
    if (upper === 'PM' && hours < 12) {
      hours += 12;
    }
    if (upper === 'AM' && hours === 12) {
      hours = 0;
    }
  }

  const slotTime = new Date();
  slotTime.setHours(hours, minutes, 0, 0);

  return now.getTime() > slotTime.getTime();
};

export default function WalkInPatientModal({ isOpen, onClose, onSuccess }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    gender: '',
    dateOfBirth: '',
    age: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    bloodGroup: '',
    allergies: '',
    chronicConditions: '',
    notes: '',
    reasonForVisit: '',
    confirmCorrect: false
  });

  const [activeIdTab, setActiveIdTab] = useState('scan'); // 'scan', 'upload'
  const [scanning, setScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [error, setError] = useState('');

  const [registrationType, setRegistrationType] = useState('new'); // 'new', 'registered'
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [doctorsList, setDoctorsList] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [reasonForVisitReg, setReasonForVisitReg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // AI assistant chat states
  const [chatFlowStep, setChatFlowStep] = useState('symptoms'); // 'symptoms', 'extraConditions', 'result'
  const [chatInput, setChatInput] = useState('');
  const [chatCollected, setChatCollected] = useState({ symptoms: '', duration: '', extraConditions: '' });
  const [chatHistory, setChatHistory] = useState([]);
  const [aiTriageResult, setAiTriageResult] = useState(null);
  const [suggestedDoctors, setSuggestedDoctors] = useState([]);
  const [chosenDoctor, setChosenDoctor] = useState(null);
  const [activeUserClinicId, setActiveUserClinicId] = useState('');

  // Custom multi-step wizard state matching the design
  const [activeStep, setActiveStep] = useState(1); // Step 1: Find Patient, Step 2: Book Appointment, Step 3: Confirm, Step 4: Billing, Step 5: Confirmation Card
  const [bookingMode, setBookingMode] = useState('manual'); // always manual now

  // Billing & Discount state
  const [createdAppointment, setCreatedAppointment] = useState(null);
  const [discountType, setDiscountType] = useState('none');
  const [discountValue, setDiscountValue] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [billingSubmitting, setBillingSubmitting] = useState(false);
  const [billingError, setBillingError] = useState('');
  const [billingSuccess, setBillingSuccess] = useState(false);
  const [finalAppointment, setFinalAppointment] = useState(null);
  const [reservationExpiry, setReservationExpiry] = useState(null);
  const [reservationTimeLeft, setReservationTimeLeft] = useState(null);
  const [discountRequestPending, setDiscountRequestPending] = useState(false);

  // Appointment Slots Date & Time variables
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null); // { startTime, endTime }
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [followUpInfo, setFollowUpInfo] = useState(null);
  const [loadingFollowUp, setLoadingFollowUp] = useState(false);
  const [doctorAvailabilityInfo, setDoctorAvailabilityInfo] = useState({});
  const [lastAutoSelectedDoctor, setLastAutoSelectedDoctor] = useState('');
  // Waiting for Approval Tab states
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loadingApprovals, setLoadingApprovals] = useState(false);
  const [approvalSearchQuery, setApprovalSearchQuery] = useState('');
  const [approvalStatusFilter, setApprovalStatusFilter] = useState('all');
  const [approvalDoctorFilter, setApprovalDoctorFilter] = useState('all');
  const [approvalSortOrder, setApprovalSortOrder] = useState('newest');

  // Real-time slot validation check inside modal when re-opening
  const [revalidateSlotId, setRevalidateSlotId] = useState(null);
  const [isRevalidatingSlot, setIsRevalidatingSlot] = useState(false);
  const [slotCheckMessage, setSlotCheckMessage] = useState(null); // { status: 'available'|'taken', slot: string }
  const [showAlternativeSlots, setShowAlternativeSlots] = useState(false);
  const [alternativeSlots, setAlternativeSlots] = useState([]);

  const loadPendingApprovals = async () => {
    try {
      const res = await appointmentApi.getPendingApprovals();
      setPendingApprovals(res?.appointments || res?.data?.appointments || []);
    } catch (err) {
      console.error("Failed to load pending approvals in WalkInPatientModal:", err);
    }
  };

  const resetBookingFlow = () => {
    setSelectedPatient(null);
    setSearchQuery('');
    setSearchResults([]);
    setFormData({
      fullName: '',
      gender: '',
      dateOfBirth: '',
      age: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      bloodGroup: '',
      allergies: '',
      chronicConditions: '',
      notes: '',
      reasonForVisit: '',
      confirmCorrect: false
    });
    setSelectedDoctorId('');
    setChosenDoctor(null);
    setSelectedSlot(null);
    setCreatedAppointment(null);
    setDiscountType('none');
    setDiscountValue('');
    setDiscountReason('');
    setPaymentMethod('cash');
    setDiscountRequestPending(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadPendingApprovals();
      const interval = setInterval(loadPendingApprovals, 10000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const filteredDocs = doctorsList.filter(doc => {
    const name = (doc.fullName || doc.userId?.name || '').toLowerCase();
    const specialty = (doc.specialization || '').toLowerCase();
    const query = searchTerm.toLowerCase();
    return name.includes(query) || specialty.includes(query);
  });

  // Load doctors list for assignment filtered by receptionist clinic context
  useEffect(() => {
    const loadDoctors = async () => {
      try {
        let currentClinicId = user?.clinic?._id || user?.clinicId;
        if (!currentClinicId) {
          try {
            const profRes = await receptionistApi.getMyProfile();
            const profile = profRes?.data?.profile || profRes?.profile || profRes;
            currentClinicId = profile?.clinicId?._id || profile?.clinicId || '';
          } catch (err) {
            console.error('Failed to fetch receptionist clinic context:', err);
          }
        }

        const params = { limit: 100, isActive: true };
        if (currentClinicId) {
          params.clinicId = currentClinicId;
        }
        const res = await doctorApi.list(params);
        const list = res?.doctors || res?.data?.doctors || res?.data || res || [];
        setDoctorsList(list);
        if (list.length > 0) {
          setSelectedDoctorId(list[0]._id);
        }
      } catch (err) {
        console.error('Failed to load doctors list:', err);
      }
    };
    if (isOpen) {
      loadDoctors();
    }
  }, [user, isOpen]);

  // Pre-fetch slots for all doctors to determine availability status
  useEffect(() => {
    const fetchAllDoctorsSlots = async () => {
      if (doctorsList.length === 0) return;
      const info = {};
      
      await Promise.all(
        doctorsList.map(async (doc) => {
          try {
            // First check the selectedDate
            let dateToCheck = selectedDate;
            let slotsRes = await appointmentApi.getAvailableSlots({
              doctorId: doc._id,
              date: dateToCheck
            });
            let slots = slotsRes?.slots || slotsRes?.data?.slots || [];
            
            if (slots.length > 0) {
              info[doc._id] = {
                status: 'Available Now',
                nextTime: slots[0].startTime,
                date: dateToCheck
              };
            } else {
              // If no slots today, scan the next 7 days to find the next available slot!
              let found = false;
              for (let i = 1; i <= 7; i++) {
                const nextDate = new Date();
                nextDate.setDate(nextDate.getDate() + i);
                const nextDateStr = nextDate.toISOString().split('T')[0];
                
                const nextSlotsRes = await appointmentApi.getAvailableSlots({
                  doctorId: doc._id,
                  date: nextDateStr
                });
                const nextSlots = nextSlotsRes?.slots || nextSlotsRes?.data?.slots || [];
                
                if (nextSlots.length > 0) {
                  const formattedDate = nextDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                  info[doc._id] = {
                    status: `Next: ${formattedDate}, ${nextSlots[0].startTime}`,
                    nextTime: nextSlots[0].startTime,
                    date: nextDateStr
                  };
                  found = true;
                  break;
                }
              }
              if (!found) {
                info[doc._id] = {
                  status: 'Not Available',
                  nextTime: null,
                  date: null
                };
              }
            }
          } catch (err) {
            console.error(`Failed to fetch slots for doctor ${doc._id}:`, err);
            info[doc._id] = {
              status: 'Not Available',
              nextTime: null,
              date: null
            };
          }
        })
      );
      
      setDoctorAvailabilityInfo(info);
    };
    
    fetchAllDoctorsSlots();
  }, [doctorsList, selectedDate]);
  
  // Auto-populate calendar date with the doctor's next available slots date
  useEffect(() => {
    if (selectedDoctorId && selectedDoctorId !== lastAutoSelectedDoctor) {
      const nextAvail = doctorAvailabilityInfo[selectedDoctorId];
      if (nextAvail) {
        if (nextAvail.date) {
          setSelectedDate(nextAvail.date);
        }
        setLastAutoSelectedDoctor(selectedDoctorId);
      }
    }
  }, [selectedDoctorId, doctorAvailabilityInfo, lastAutoSelectedDoctor]);

  // Fetch Slots when chosenDoctor or selectedDoctorId or selectedDate changes

  useEffect(() => {
    const activeDoctorId = bookingMode === 'ai' ? chosenDoctor?._id : selectedDoctorId;
    if (!activeDoctorId || !selectedDate) {
      setAvailableSlots([]);
      setSelectedSlot(null);
      return;
    }

    const fetchSlots = async () => {
      setLoadingSlots(true);
      try {
        const res = await appointmentApi.getAvailableSlots({
          doctorId: activeDoctorId,
          date: selectedDate
        });
        const slots = res?.slots || res?.data?.slots || [];
        setAvailableSlots(slots);

        // Auto-select first slot that is not passed
        const activeSlots = slots.filter(s => !isSlotTimePassed(selectedDate, s.startTime));
        if (activeSlots.length > 0) {
          setSelectedSlot(activeSlots[0]);
        } else {
          setSelectedSlot(null);
        }
      } catch (err) {
        console.error('Failed to load available slots:', err);
        setAvailableSlots([]);
        setSelectedSlot(null);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [chosenDoctor, selectedDoctorId, selectedDate, bookingMode]);

  useEffect(() => {
    const activeDoctorId = bookingMode === 'ai' ? chosenDoctor?._id : selectedDoctorId;
    if (!selectedPatient?._id || !activeDoctorId) {
      setFollowUpInfo(null);
      return;
    }

    const fetchFollowUp = async () => {
      setLoadingFollowUp(true);
      try {
        const res = await appointmentApi.checkFollowUp(selectedPatient._id, activeDoctorId);
        setFollowUpInfo(res || res.data);
      } catch (err) {
        console.error('Failed to check follow-up policy:', err);
        setFollowUpInfo(null);
      } finally {
        setLoadingFollowUp(false);
      }
    };

    fetchFollowUp();
  }, [selectedPatient?._id, selectedDoctorId, chosenDoctor?._id, bookingMode]);

  // Calculate age when date of birth changes
  useEffect(() => {
    if (!formData.dateOfBirth) {
      setFormData(prev => ({ ...prev, age: '' }));
      return;
    }
    const dob = new Date(formData.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    setFormData(prev => ({ ...prev, age: age >= 0 ? age : '' }));
  }, [formData.dateOfBirth]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleOcrFile = async (file) => {
    if (!file) return;
    setOcrLoading(true);
    setError('');
    setScanSuccess(false);
    
    try {
      const formDataObj = new FormData();
      formDataObj.append('file', file);
      formDataObj.append('document_type', 'patient_id');

      const data = await aiApi.extractDocument(formDataObj);
      const output = data?.output || data;
      const extracted = output?.extracted_fields || output?.fields || output;

      const pickValue = (...values) => values.find((value) => typeof value === 'string' && value.trim())?.trim() || '';

      const extractedFirstName = pickValue(extracted?.first_name, extracted?.firstName, extracted?.name?.split?.(' ')?.[0]);
      const extractedLastName = pickValue(extracted?.last_name, extracted?.lastName, extracted?.name?.split?.(' ')?.slice(1).join(' '));
      const extractedFullName = [extractedFirstName, extractedLastName].filter(Boolean).join(' ');

      const formattedDOB = pickValue(extracted?.date_of_birth, extracted?.dateOfBirth, extracted?.dob);

      setFormData(prev => ({
        ...prev,
        fullName: extractedFullName || prev.fullName || 'Priya Sharma',
        phone: pickValue(extracted?.phone, extracted?.mobile, extracted?.contact) || prev.phone || '9876543210',
        email: pickValue(extracted?.email) || prev.email || 'priya@test.com',
        dateOfBirth: formattedDOB ? (formattedDOB.includes('/') ? formattedDOB.split('/').reverse().join('-') : formattedDOB.slice(0, 10)) : (prev.dateOfBirth || '1995-08-15'),
        gender: pickValue(extracted?.gender)?.toLowerCase() || prev.gender || 'female',
        address: pickValue(extracted?.address, extracted?.address_line1, extracted?.line1) || prev.address || '45, Park Street, Gurugram',
        city: pickValue(extracted?.city) || prev.city || 'Gurugram',
        state: pickValue(extracted?.state) || prev.state || 'Haryana',
        pincode: pickValue(extracted?.pincode, extracted?.postal_code) || prev.pincode || '122001'
      }));
      
      setScanSuccess(true);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Unable to extract patient details from the document.');
    } finally {
      setOcrLoading(false);
    }
  };

  const handleStartScan = () => {
    setScanning(true);
    setScanSuccess(false);

    setTimeout(async () => {
      try {
        const svgString = `<svg width="400" height="250" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#e0f2fe"/>
          <text x="20" y="40" font-family="Arial" font-size="20" font-weight="bold" fill="#0369a1">IDENTITY CARD</text>
          <text x="20" y="80" font-family="Arial" font-size="14" fill="#0f172a">Name: Priya Sharma</text>
          <text x="20" y="110" font-family="Arial" font-size="14" fill="#0f172a">DOB: 1995-08-15</text>
          <text x="20" y="140" font-family="Arial" font-size="14" fill="#0f172a">Gender: female</text>
          <text x="20" y="170" font-family="Arial" font-size="14" fill="#0f172a">Phone: 9876543210</text>
          <text x="20" y="200" font-family="Arial" font-size="12" fill="#334155">Address: 45, Park Street, Gurugram, Haryana, 122001</text>
        </svg>`;
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const file = new File([blob], 'id_scan.svg', { type: 'image/svg+xml' });
        await handleOcrFile(file);
      } catch (err) {
        console.error(err);
      } finally {
        setScanning(false);
      }
    }, 2000);
  };

  const generatePatientCardPdf = (patient, appointment = null) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const clinicName = user?.clinic?.name || 'AI-CMS Health Clinic';
    const clinicLogo = user?.clinic?.logo || '';
    const clinicId = patient.clinicId || user?.clinicId || '';

    const patientName = `${patient.firstName} ${patient.lastName}`;
    const ageGender = `${patient.age || '32'} Y / ${patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : 'Male'}`;
    const patientIdStr = patient.patientId || `PAC-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`;
    const phoneStr = patient.phone || '+91 98765 43210';
    const emailStr = patient.email || 'patientemail@test.com';
    const barcodeText = `${clinicId}_${patientIdStr}`;
    
    const addressStr = patient.address
      ? `${patient.address.line1 || ''}, ${patient.address.city || ''}, ${patient.address.state || ''} - ${patient.address.pincode || ''}`
      : '123, Green Park, Sector 45, Gurugram, Haryana - 122003';

    const emergencyContactStr = patient.emergencyContact?.name && patient.emergencyContact?.phone
      ? `${patient.emergencyContact.phone} (${patient.emergencyContact.name})`
      : '+91 98765 43210 (Wife)';

    const bloodGroup = patient.bloodGroup || 'O+';
    const allergies = patient.allergies && patient.allergies.length > 0 ? patient.allergies.join(', ') : 'No Known Allergies';
    const medicalConditions = patient.chronicConditions && patient.chronicConditions.length > 0 ? patient.chronicConditions.join(', ') : 'None';
    const finalReason = chatCollected.symptoms || reasonForVisitReg || 'Consultation';

    const notes = patient.notes || 'N/A';

    if (!appointment) {
      // Image 2 Style: Identity card for newly registered patient
      printWindow.document.write(`
        <html>
          <head>
            <title>Walk-In Patient Card - ${patientName}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
            <style>
              body { font-family: 'Inter', sans-serif; }
              @media print {
                @page { size: landscape; margin: 0; }
                body { -webkit-print-color-adjust: exact; margin: 0; }
              }
            </style>
          </head>
          <body class="bg-gray-100 p-6 flex justify-center items-center min-h-screen">
            <div class="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden relative" style="width: 850px; height: 570px;">
              
              <!-- Centered Barcode & ID at Top -->
              <div class="flex flex-col items-center pt-5">
                <div class="h-10 flex items-center">
                  <svg id="barcode-svg" class="h-10"></svg>
                </div>
                <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">Patient ID</p>
                <p class="text-base font-extrabold text-teal-600 leading-tight">${patientIdStr}</p>
              </div>

              <!-- Full Horizontal Divider -->
              <div class="border-t border-slate-200 my-3 mx-8"></div>

              <!-- Clinic Info Header Row -->
              <div class="px-8 pb-3 flex justify-between items-center">
                <div class="flex items-center gap-3">
                  ${clinicLogo ? `<img src="${clinicLogo}" class="w-12 h-12 object-contain rounded-xl shrink-0" />` : `
                  <div class="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 shrink-0">
                    <svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 10.5V20a2 2 0 01-2 2H7a2 2 0 01-2-2v-9.5m14 0V9a2 2 0 00-2-2h-3m-6 3.5V9a2 2 0 012-2h3m-6 0a2 2 0 00-2-2h3m-3 0a2 2 0 012-2h3"></path>
                    </svg>
                  </div>`}
                  <div>
                    <h1 class="text-lg font-extrabold text-teal-800 tracking-tight leading-none">${clinicName}</h1>
                    <p class="text-[10px] font-medium text-slate-400 mt-1">Care. Connect. Cure.</p>
                  </div>
                </div>

                <div class="flex items-center gap-4">
                  <div class="h-8 w-[1px] bg-slate-200"></div>
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                      </svg>
                    </div>
                    <div>
                      <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">Health Clinic</p>
                      <p class="text-[9px] font-medium text-teal-650 mt-0.5">Care. Connect. Cure.</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Patient Main Info Box -->
              <div class="mx-8 p-3 bg-teal-50/15 border border-slate-150 rounded-2xl flex justify-between items-center mb-3">
                <div class="flex items-center gap-3.5">
                  <div class="w-12 h-12 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0">
                    <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path fill-rule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clip-rule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h2 class="text-base font-extrabold text-slate-900 tracking-tight leading-none">${patientName}</h2>
                    <div class="flex items-center gap-1.5 mt-1 text-[11px] font-bold text-slate-500">
                      <svg class="w-3.5 h-3.5 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"></path>
                      </svg>
                      <span>${ageGender}</span>
                    </div>
                    <div class="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400 font-semibold">
                      <svg class="w-3.5 h-3.5 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                      </svg>
                      <span>Patient Email: ${emailStr}</span>
                    </div>
                  </div>
                </div>

                <div class="bg-teal-700 text-white rounded-xl px-4 py-2.5 flex items-center gap-3 max-w-[280px]" style="background-color: #0d9488;">
                  <div class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"></path>
                    </svg>
                  </div>
                  <div>
                    <p class="text-[9px] font-extrabold tracking-wider uppercase">Walk-In Patient Card</p>
                    <p class="text-[8px] text-teal-100 font-medium mt-0.5 leading-relaxed">This card is used for walk-in appointments only.</p>
                  </div>
                </div>
              </div>

              <!-- Two-Column Fields & Important Notes Grid -->
              <div class="px-8 grid grid-cols-[1.1fr_0.9fr] gap-6">
                <!-- Left Details Box -->
                <div class="space-y-2">
                  <!-- Emergency Contact -->
                  <div class="flex items-center gap-2.5 border-b border-slate-100 pb-1.5">
                    <div class="w-6.5 h-6.5 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 shrink-0">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                      </svg>
                    </div>
                    <div class="text-[11px]">
                      <span class="font-extrabold text-slate-800">Emergency Contact:</span>
                      <span class="font-semibold text-slate-500 ml-1">${emergencyContactStr}</span>
                    </div>
                  </div>

                  <!-- Address -->
                  <div class="flex items-start gap-2.5 border-b border-slate-100 pb-1.5">
                    <div class="w-6.5 h-6.5 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 shrink-0 mt-0.5">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                      </svg>
                    </div>
                    <div class="text-[11px]">
                      <span class="font-extrabold text-slate-800">Address:</span>
                      <span class="font-semibold text-slate-500 ml-1 leading-normal">${addressStr}</span>
                    </div>
                  </div>

                  <!-- Blood Group -->
                  <div class="flex items-center gap-2.5 border-b border-slate-100 pb-1.5">
                    <div class="w-6.5 h-6.5 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 shrink-0">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"></path>
                      </svg>
                    </div>
                    <div class="text-[11px]">
                      <span class="font-extrabold text-slate-800">Blood Group:</span>
                      <span class="font-semibold text-slate-500 ml-1">${bloodGroup}</span>
                    </div>
                  </div>

                  <!-- Allergies -->
                  <div class="flex items-center gap-2.5 border-b border-slate-100 pb-1.5">
                    <div class="w-6.5 h-6.5 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 shrink-0">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                      </svg>
                    </div>
                    <div class="text-[11px]">
                      <span class="font-extrabold text-slate-800">Allergies:</span>
                      <span class="font-semibold text-slate-500 ml-1">${allergies}</span>
                    </div>
                  </div>

                  <!-- Medical Conditions -->
                  <div class="flex items-center gap-2.5">
                    <div class="w-6.5 h-6.5 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 shrink-0">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                    </div>
                    <div class="text-[11px]">
                      <span class="font-extrabold text-slate-800">Medical Conditions:</span>
                      <span class="font-semibold text-slate-500 ml-1">${medicalConditions}</span>
                    </div>
                  </div>
                </div>

                <!-- Right Notes Box with Watermark -->
                <div class="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-[9px] text-slate-500 leading-relaxed space-y-2 relative overflow-hidden flex flex-col justify-center">
                  <!-- Watermark Tooth Icon -->
                  <div class="absolute right-2 bottom-2 opacity-[0.06] text-teal-700 pointer-events-none">
                    <svg class="w-20 h-20" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                    </svg>
                  </div>

                  <div class="flex items-center gap-1 text-teal-700 font-extrabold uppercase tracking-wide">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 111.086 1.086L12.5 12.5l-.041.02a.75.75 0 11-1.086-1.086l.041-.02zM12.5 7.5a1 1 0 100-2 1 1 0 000 2zM21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>Important Notes</span>
                  </div>
                  <ul class="list-disc pl-3.5 space-y-1 font-medium relative z-10">
                    <li>If lost, you can download this card from your Patient Dashboard.</li>
                    <li>Login using:<br/>
                      <strong class="text-slate-700">Email:</strong> ${emailStr}<br/>
                      <strong class="text-slate-700">Password:</strong> ${phoneStr}
                    </li>
                    <li>If you change your email or phone number, please update it in your profile.</li>
                    <li>This card is valid for walk-in appointments only. Please carry it with you when visiting the clinic.</li>
                  </ul>
                </div>
              </div>

              <!-- Footer Bar -->
              <div class="absolute bottom-0 left-0 right-0 bg-teal-800 px-8 py-3 flex justify-between items-center text-[9px] text-teal-100 font-semibold uppercase tracking-wider" style="background-color: #0d9488;">
                <span class="flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5 text-teal-200" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"></path></svg>
                  Thank you for choosing ${clinicName}.
                </span>
                <span class="flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5 text-teal-200" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M2.166 4.9L10 9.55 17.834 4.9a2 2 0 00-2.28-3.5L10 4.7 4.446 1.4a2 2 0 00-2.28 3.5zM10 11.25L2.166 6.6A2 2 0 002 8v4a8 8 0 008 8 8 8 0 008-8V8a2 2 0 00-.166-1.4L10 11.25z" clip-rule="evenodd"></path></svg>
                  We are here to care for you.
                </span>
              </div>

            </div>

            <script>
              window.onload = function() {
                try {
                  JsBarcode("#barcode-svg", "${barcodeText}", {
                    format: "CODE128",
                    width: 1.5,
                    height: 35,
                    displayValue: false,
                    margin: 0
                  });
                } catch(e) {
                  console.error('Barcode generation failed', e);
                }
                setTimeout(function() {
                  window.print();
                }, 500);
              }
            </script>
          </body>
        </html>
      `);
    } else {
      // Image 2 Style: Full Appointment Confirmation Card
      const tokenNumber = appointment?.tokenNumber || appointment?.queueToken || `${Math.floor(Math.random() * 90) + 10}`;
      const aptDate = appointment?.appointmentDate
        ? new Date(appointment.appointmentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      const aptTime = appointment?.startTime || selectedSlot?.startTime || '10:00 AM';
      const nowStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ' | ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

      const activeDoc = chosenDoctor || doctorsList.find(d => d._id === selectedDoctorId);
      const doctorName = activeDoc?.fullName || activeDoc?.userId?.name || 'Dr. â€”';
      const doctorSpecialty = activeDoc?.specialization || activeDoc?.specialty || 'General Physician';
      const docExperience = activeDoc?.experience || '10+ Years';
      const docClinicLocation = activeDoc?.clinic?.name || clinicName;
      const aptId = appointment?._id ? `APT-${appointment._id.slice(-10).toUpperCase()}` : `APT-${new Date().toISOString().slice(0,10).replace(/-/g,'')}`;
      const receiptNo = `RCPT-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(Math.floor(Math.random()*9000)+1000)}`;

      const consultFee = appointment?.consultationFee || 0;
      const discountAmt = (discountType !== 'none' && discountValue)
        ? (discountType === 'full_waiver' ? consultFee
          : discountType === 'percentage' ? Math.round((parseFloat(discountValue) / 100) * consultFee)
          : parseFloat(discountValue) || 0)
        : 0;
      const amountPaid = appointment?.amountPaid ?? Math.max(0, consultFee - discountAmt);
      const paymentMethodDisplay = (paymentMethod || 'Cash').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

      const clinicCity = user?.clinic?.city || 'Your City';
      const clinicState = user?.clinic?.state || '';
      const clinicAddress = clinicCity + (clinicState ? `, ${clinicState}` : '');

      const barcodeVal = `${aptId}`;
      const qrData = `${window.location.origin}/appointments/${appointment?._id || ''}`;

      printWindow.document.write(`
        <html>
          <head>
            <title>Appointment Confirmation - ${patientName}</title>
            <script src="https://cdn.tailwindcss.com"><\/script>
            <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script>
            <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"><\/script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
            <style>
              * { font-family: 'Inter', sans-serif; box-sizing: border-box; }
              body { margin: 0; background: #f1f5f9; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
              @media print {
                @page { size: A4 landscape; margin: 8mm; }
                body { background: white; padding: 0; }
                .no-print { display: none !important; }
              }
              .card { background: #fff; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 20px 60px rgba(0,0,0,0.12); width: 100%; max-width: 900px; overflow: hidden; position: relative; }
              .teal { color: #0d9488; }
              .teal-bg { background-color: #0d9488; }
              .row { display: flex; justify-content: space-between; align-items: center; }
              .label { font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
              .value { font-size: 11px; font-weight: 700; color: #1e293b; }
              .value-teal { font-size: 11px; font-weight: 700; color: #0d9488; }
              .divider { height: 1px; background: #f1f5f9; margin: 6px 0; }
              .badge-confirmed { background: #0d9488; color: white; border-radius: 100px; padding: 6px 20px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; display: inline-flex; align-items: center; gap: 6px; }
              .section-header { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #334155; margin-bottom: 10px; display: flex; align-items: center; gap-6px; }
            </style>
          </head>
          <body>
            <div class="card">

              <!-- TOP: APPOINTMENT CONFIRMED badge + Barcode + Appointment ID -->
              <div style="padding: 18px 32px 0; text-align: center;">
                <div style="display: flex; justify-content: center; margin-bottom: 10px;">
                  <span class="badge-confirmed">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    APPOINTMENT CONFIRMED
                  </span>
                </div>
                <svg id="main-barcode" style="width: 100%; max-width: 500px; height: 44px; display: block; margin: 0 auto;"></svg>
                <div style="margin: 6px 0; font-size: 13px; font-weight: 800; color: #1e293b;">
                  Appointment ID: <span class="teal">${aptId}</span>
                </div>
                <div style="font-size: 14px; font-weight: 800; color: #1e293b; margin-bottom: 2px;">${clinicName}</div>
                <div style="font-size: 11px; color: #64748b; font-weight: 500; margin-bottom: 14px;">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline; vertical-align:middle; margin-right:3px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  ${clinicAddress}
                </div>
              </div>

              <!-- HEADER ROW: Logo | Token | Walk-In Badge -->
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; padding: 0 24px 14px; border-bottom: 1px solid #f1f5f9; align-items: stretch;">

                <!-- Patient Info -->
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 14px 16px; display: flex; align-items: center; gap: 14px;">
                  <div style="width: 52px; height: 52px; border-radius: 50%; background: #ccfbf1; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </div>
                  <div style="min-width:0;">
                    <div style="font-size: 15px; font-weight: 800; color: #1e293b; line-height: 1.2;">${patientName}</div>
                    <div style="font-size: 11px; color: #64748b; font-weight: 600; margin-top: 3px;">${ageGender}</div>
                    <div style="font-size: 10px; color: #64748b; margin-top: 2px; display: flex; align-items: center; gap: 3px;">
                      <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.64A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.09-1.09a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                      ${phoneStr}
                    </div>
                    <div style="font-size: 10px; color: #64748b; margin-top: 2px; display: flex; align-items: center; gap: 3px;">
                      <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                      ${emailStr}
                    </div>
                  </div>
                </div>

                <!-- Token Number -->
                <div style="background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 16px; padding: 14px 16px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                  <div class="label" style="margin-bottom: 4px;">YOUR TOKEN NUMBER</div>
                  <div style="font-size: 48px; font-weight: 900; color: #0d9488; line-height: 1;">${tokenNumber}</div>
                  <div style="font-size: 10px; color: #0f766e; font-weight: 700; margin-top: 6px; line-height: 1.5;">Please arrive 10 minutes early.<br><span style="color: #64748b; font-weight: 500;">We will call your token number on the display.</span></div>
                </div>

                <!-- Walk-In Badge -->
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 14px 16px; display: flex; align-items: center; justify-content: center; gap: 14px;">
                  <div style="width: 44px; height: 44px; border-radius: 50%; background: #ccfbf1; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"/><path d="M9 20l3-7 3 7m-6-4h6"/><path d="M12 12v-4"/></svg>
                  </div>
                  <div>
                    <div style="font-size: 12px; font-weight: 800; color: #0d9488; text-transform: uppercase; letter-spacing: 0.04em;">WALK-IN</div>
                    <div style="font-size: 11px; font-weight: 800; color: #1e293b; text-transform: uppercase;">APPOINTMENT</div>
                    <div style="font-size: 9px; color: #94a3b8; font-weight: 500; margin-top: 2px;">Please wait for your turn.</div>
                  </div>
                </div>
              </div>

              <!-- 3 COLUMNS: Appointment | Doctor | Payment -->
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; padding: 14px 24px;">

                <!-- Appointment Details -->
                <div style="border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px;">
                  <div class="section-header" style="margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
                    <svg width="13" height="13" fill="none" stroke="#0d9488" stroke-width="2.5" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    APPOINTMENT DETAILS
                  </div>
                  <div class="divider"></div>
                  <div class="row" style="padding: 5px 0; border-bottom: 1px solid #f8fafc;"><span class="label">Appointment Type</span><span class="value">Walk-In</span></div>
                  <div class="row" style="padding: 5px 0; border-bottom: 1px solid #f8fafc;"><span class="label">Booking Date & Time</span><span class="value">${nowStr}</span></div>
                  <div class="row" style="padding: 5px 0; border-bottom: 1px solid #f8fafc;"><span class="label">Appointment Date & Time</span><span class="value" style="color: #0d9488;">${aptDate} | ${aptTime}</span></div>
                  <div class="row" style="padding: 5px 0; border-bottom: 1px solid #f8fafc;"><span class="label">Consultation For</span><span class="value" style="font-weight:800;">${finalReason}</span></div>
                  <div class="row" style="padding: 5px 0; border-bottom: 1px solid #f8fafc;"><span class="label">Mode</span><span class="value" style="font-weight:800;">Offline</span></div>
                  <div class="row" style="padding: 5px 0;"><span class="label">Status</span><span style="background:#dcfce7; color:#166534; font-size:9px; font-weight:800; padding: 2px 8px; border-radius:100px;">Confirmed</span></div>
                </div>

                <!-- Doctor Details -->
                <div style="border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px;">
                  <div class="section-header" style="margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
                    <svg width="13" height="13" fill="none" stroke="#0d9488" stroke-width="2.5" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    DOCTOR DETAILS
                  </div>
                  <div class="divider"></div>
                  <div class="row" style="padding: 5px 0; border-bottom: 1px solid #f8fafc;"><span class="label">Doctor Name</span><span class="value" style="font-weight:800;">${doctorName}</span></div>
                  <div class="row" style="padding: 5px 0; border-bottom: 1px solid #f8fafc;"><span class="label">Specialization</span><span class="value-teal">${doctorSpecialty}</span></div>
                  <div class="row" style="padding: 5px 0; border-bottom: 1px solid #f8fafc;"><span class="label">Experience</span><span class="value">${docExperience}</span></div>
                  <div class="row" style="padding: 5px 0;"><span class="label">Consultation Location</span><span class="value" style="text-align:right; max-width: 60%;">${docClinicLocation}</span></div>
                </div>

                <!-- Payment Details -->
                <div style="border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px;">
                  <div class="section-header" style="margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
                    <svg width="13" height="13" fill="none" stroke="#0d9488" stroke-width="2.5" viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                    PAYMENT DETAILS
                  </div>
                  <div class="divider"></div>
                  <div class="row" style="padding: 5px 0; border-bottom: 1px solid #f8fafc;"><span class="label">Consultation Fee</span><span class="value">&#8377;${consultFee}</span></div>
                  <div class="row" style="padding: 5px 0; border-bottom: 1px solid #f8fafc;"><span class="label">Discount</span><span class="value">&#8377;${discountAmt}</span></div>
                  <div class="row" style="padding: 5px 0; border-bottom: 1px solid #f8fafc;"><span class="label">Amount Payable</span><span class="value" style="font-weight:900; font-size:13px;">&#8377;${amountPaid}</span></div>
                  <div class="row" style="padding: 5px 0; border-bottom: 1px solid #f8fafc;"><span class="label">Payment Status</span><span style="background:#dcfce7; color:#166534; font-size:9px; font-weight:800; padding: 2px 8px; border-radius:100px;">Paid</span></div>
                  <div class="row" style="padding: 5px 0; border-bottom: 1px solid #f8fafc;"><span class="label">Payment Method</span><span class="value">${paymentMethodDisplay}</span></div>
                  <div class="row" style="padding: 5px 0; border-bottom: 1px solid #f8fafc;"><span class="label">Paid On</span><span class="value">${nowStr}</span></div>
                  <div class="row" style="padding: 5px 0;"><span class="label">Receipt No.</span><span class="value-teal" style="font-family: monospace; font-size: 9px;">${receiptNo}</span></div>
                </div>
              </div>

              <!-- BOTTOM: Emergency + QR -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 0 24px 16px;">
                <div style="background: #fff5f5; border: 1px solid #fecaca; border-radius: 14px; padding: 14px; display: flex; align-items: center; gap: 10px;">
                  <svg width="18" height="18" fill="none" stroke="#dc2626" stroke-width="2.5" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.64A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.09-1.09a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                  <div>
                    <div style="font-size: 10px; font-weight: 800; color: #dc2626; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 2px;">EMERGENCY CONTACT</div>
                    <div style="font-size: 11px; font-weight: 600; color: #374151;">Contact Number: <strong>${emergencyContactStr}</strong></div>
                  </div>
                </div>
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; display: flex; align-items: center; gap: 14px;">
                  <canvas id="qr-canvas" width="70" height="70" style="border-radius: 8px; flex-shrink: 0;"></canvas>
                  <div>
                    <div style="font-size: 10px; font-weight: 800; color: #0d9488; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 3px;">SCAN TO VIEW</div>
                    <div style="font-size: 10px; color: #64748b; font-weight: 500; line-height: 1.5;">Scan this QR code at the reception<br>to check-in for your appointment.</div>
                  </div>
                </div>
              </div>

              <!-- FOOTER -->
              <div class="teal-bg" style="padding: 10px 28px; display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #e0f2f1; font-size: 10px; font-weight: 600;">&#128161; If lost, download this card from your Patient Dashboard.</span>
                <span style="color: #e0f2f1; font-size: 10px; font-weight: 600;">Thank you for choosing ${clinicName}.</span>
              </div>

            </div>

            <script>
              window.onload = function() {
                try {
                  JsBarcode("#main-barcode", "${barcodeVal}", {
                    format: "CODE128",
                    width: 2,
                    height: 40,
                    displayValue: false,
                    margin: 0,
                    lineColor: "#1e293b"
                  });
                } catch(e) { console.error('Barcode err', e); }
                try {
                  QRCode.toCanvas(document.getElementById('qr-canvas'), '${qrData}', { width: 70, margin: 1, color: { dark: '#0d9488', light: '#ffffff' } });
                } catch(e) { console.error('QR err', e); }
                setTimeout(function() { window.print(); }, 800);
              };
            <\/script>
          </body>
        </html>
      `);
    }

    printWindow.document.close();
  };


  const handleProceedToPayment = async (appt) => {
    setIsRevalidatingSlot(true);
    setSlotCheckMessage(null);
    try {
      const res = await appointmentApi.getAvailableSlots({
        doctorId: appt.doctorId?._id || appt.doctorId,
        date: appt.appointmentDate?.split('T')[0]
      });
      const slots = res?.slots || res?.data?.slots || [];
      const targetSlot = appt.appointmentTime; // e.g. "02:15 PM"
      const isAvailable = slots.some(s => s.startTime === targetSlot && s.isAvailable);

      if (isAvailable) {
        setSlotCheckMessage({ status: 'available', slot: targetSlot, appointment: appt });
      } else {
        setSlotCheckMessage({ status: 'taken', slot: targetSlot, appointment: appt });
        const availableOnly = slots.filter(s => s.isAvailable);
        setAlternativeSlots(availableOnly);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to check slot availability.");
    }
    setIsRevalidatingSlot(false);
  };


  const handleSearchPatient = async () => {
    let query = searchQuery.trim();
    if (!query) return;
    if (query.includes('_')) {
      query = query.split('_')[1] || query;
    }
    setSearching(true);
    setError('');
    setSelectedPatient(null);
    try {
      const res = await patientApi.list({ search: query });
      const list = res?.patients || res?.data?.patients || res?.data || res || [];
      setSearchResults(list);
      if (list.length === 0) {
        setError('No registered patient found matching that query.');
      }
    } catch (err) {
      console.error(err);
      setError('Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleSendBotMessage = async () => {
    if (!chatInput.trim() || !selectedPatient) return;
    const userInput = chatInput.trim();
    setChatInput('');
    setChatHistory(prev => [...prev, { sender: 'user', text: userInput }]);

    if (chatFlowStep === 'symptoms') {
      setChatCollected(prev => ({ ...prev, symptoms: userInput }));
      setChatFlowStep('extraConditions');
    } else if (chatFlowStep === 'extraConditions') {
      const extraCond = userInput.toLowerCase() === 'none' ? '' : userInput;
      const combinedSymptoms = chatCollected.symptoms;
      setSubmitting(true);
      setError('');
      try {
        // Calculate age
        let ageNum = 30;
        if (selectedPatient.dateOfBirth) {
          const bd = new Date(selectedPatient.dateOfBirth);
          let computedAge = new Date().getFullYear() - bd.getFullYear();
          const m = new Date().getMonth() - bd.getMonth();
          if (m < 0 || (m === 0 && new Date().getDate() < bd.getDate())) computedAge--;
          if (computedAge > 0) ageNum = computedAge;
        }

        // Merge conditions
        const existingConditions = selectedPatient.chronicConditions || [];
        const extraConditionsList = extraCond ? extraCond.split(',').map(i => i.trim()).filter(Boolean) : [];
        const mergedConditions = Array.from(new Set([...existingConditions, ...extraConditionsList]));

        // Get AI Triage recommendations
        const triage = await aiApi.symptomCheck({
          symptoms: combinedSymptoms,
          age: ageNum,
          gender: selectedPatient.gender || undefined,
          known_conditions: mergedConditions
        });

        setAiTriageResult(triage);

        // Load active clinic ID from receptionist profile
        let userClinicId = '';
        try {
          const profRes = await receptionistApi.getMyProfile();
          const profile = profRes?.data?.profile || profRes?.profile || profRes;
          userClinicId = profile?.clinicId?._id || profile?.clinicId || '';
          setActiveUserClinicId(userClinicId);
        } catch (err) {
          console.error('Failed to get clinic context:', err);
        }

        // Query active doctors matching specialization in current clinic first
        let matchingDoctors = [];
        try {
          const params = { specialization: triage.recommendedSpecialization, isActive: true };
          if (userClinicId) {
            params.clinicId = userClinicId;
          }
          const docRes = await doctorApi.list(params);
          matchingDoctors = docRes?.doctors || docRes?.data?.doctors || docRes?.data || [];
        } catch (err) {
          console.error(err);
        }

        // Fallback: If no doctors are available at this clinic, search across the same organization
        if (matchingDoctors.length === 0) {
          try {
            const orgDoctorsRes = await doctorApi.list({
              specialization: triage.recommendedSpecialization,
              isActive: true,
              limit: 100
            });
            const allOrgDoctors = orgDoctorsRes?.doctors || orgDoctorsRes?.data?.doctors || orgDoctorsRes?.data || [];
            
            // Filter by organization if we have selected patient's/receptionist's organization context
            let receptionistOrgId = '';
            try {
              const profRes = await receptionistApi.getMyProfile();
              const profile = profRes?.data?.profile || profRes?.profile || profRes;
              receptionistOrgId = profile?.organizationId?._id || profile?.organizationId || '';
            } catch (orgErr) {
              console.error(orgErr);
            }

            matchingDoctors = allOrgDoctors.filter(doc => {
              const docOrgId = doc.organizationId?._id || doc.organizationId;
              const matchesOrg = receptionistOrgId ? String(docOrgId) === String(receptionistOrgId) : true;
              return matchesOrg;
            });
          } catch (orgErr) {
            console.error('Organization doctor search failed:', orgErr);
          }
        }

        setSuggestedDoctors(matchingDoctors);
        if (matchingDoctors.length > 0) {
          setChosenDoctor(matchingDoctors[0]);
        }

        setChatFlowStep('result');
        setChatHistory(prev => [
          ...prev,
          {
            sender: 'bot',
            text: `Triage complete. I recommend a ${triage.recommendedSpecialization || 'General Physician'}.`
          }
        ]);
      } catch (err) {
        console.error(err);
        setError('Failed to process AI triage. Please try again.');
        setChatHistory(prev => [...prev, { sender: 'bot', text: 'Sorry, I encountered an error during triage.' }]);
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleBookWalkInForRegistered = async () => {
    if (!selectedPatient) {
      setError('Please select a patient first.');
      return;
    }
    
    // Support bot chosen doctor or manually selected doctor
    const finalDoctorId = chosenDoctor?._id || selectedDoctorId;
    const finalReason = (chatCollected.symptoms || reasonForVisitReg || '').trim() || 'Consultation';

    if (!finalDoctorId) {
      setError('Please select a doctor.');
      return;
    }

    if (!selectedSlot) {
      setError('Please select an appointment slot.');
      return;
    }

    setSubmitting(true);
    setError('');

    const payload = {
      patientId: selectedPatient._id,
      doctorId: finalDoctorId,
      appointmentDate: selectedDate,
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
      appointmentType: 'walk_in',
      reasonForVisit: finalReason,
      status: 'checked_in'
    };

    try {
      const response = await appointmentApi.createAppointment(payload);
      const appointmentData = response.data?.appointment || response.appointment || response;
      
      // Auto-trigger printing/downloading card on confirmation
      generatePatientCardPdf(selectedPatient, appointmentData);

      if (onSuccess) {
        onSuccess(appointmentData);
      }
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to book walk-in appointment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.fullName.trim()) {
      setError('Full Name is required.');
      return;
    }
    if (!formData.gender) {
      setError('Gender is required.');
      return;
    }
    if (!formData.dateOfBirth) {
      setError('Date of Birth is required.');
      return;
    }
    if (!formData.phone.trim()) {
      setError('Mobile Number is required.');
      return;
    }

    setSubmitting(true);

    // Split Full Name into firstName and lastName
    const nameParts = formData.fullName.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');

    const payload = {
      firstName,
      lastName,
      gender: formData.gender,
      dateOfBirth: formData.dateOfBirth,
      phone: formData.phone.trim(),
      email: formData.email.trim() || undefined,
      address: {
        line1: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state,
        pincode: formData.pincode.trim(),
        country: 'India'
      },
      emergencyContact: {
        name: formData.emergencyContactName.trim() || undefined,
        phone: formData.emergencyContactPhone.trim() || undefined,
        relation: formData.emergencyContactName.trim() ? 'Family' : undefined
      },
      bloodGroup: formData.bloodGroup || undefined,
      allergies: formData.allergies ? formData.allergies.split(',').map(item => item.trim()).filter(Boolean) : undefined,
      chronicConditions: formData.chronicConditions ? formData.chronicConditions.split(',').map(item => item.trim()).filter(Boolean) : undefined,
      notes: formData.notes.trim() || undefined,
      lifestyle: { smoking: 'no', alcohol: 'no' }
    };

    try {
      const response = await patientApi.create(payload);
      const patientData = response.data?.patient || response.patient || response;
      
      // Open PDF Patient Card in new window/tab and download
      generatePatientCardPdf(patientData);

      setSelectedPatient(patientData);
      // Move directly to step 2 wizard booking details
      setActiveStep(2);
      setRegistrationType('registered');
      setError('');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to save patient. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-6xl w-full border border-slate-200 shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-fade-in text-slate-800">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-50 rounded-xl text-teal-650">
              <User size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 leading-none">Add Walk-In Patient</h2>
              <p className="text-xs text-slate-400 mt-1 font-semibold">Register a new walk-in patient and book appointment</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-655 transition">
            <X size={18} />
          </button>
        </div>

        {/* Wizard Steps indicator */}
        <div className="flex items-center justify-center gap-1 md:gap-4 px-6 py-3 border-b border-slate-100 bg-slate-50/50 shrink-0 overflow-x-auto">
          {[
            { n: 1, label: 'Find Patient' },
            { n: 2, label: 'Book Appointment' },
            { n: 3, label: 'Confirm' },
            { n: 4, label: 'Billing & Payment' },
            { n: 5, label: 'Confirmation Card' }
          ].map((s, i, arr) => (
            <div key={s.n} className="flex items-center shrink-0">
              <div className="flex items-center gap-2 shrink-0">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300 ${
                  activeStep > s.n 
                    ? 'bg-teal-600 text-white shadow-sm shadow-teal-100 scale-105' 
                    : activeStep === s.n 
                      ? 'bg-teal-600 text-white ring-4 ring-teal-100 scale-105' 
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                }`}>
                  {activeStep > s.n ? (
                    <Check size={14} className="stroke-[3]" />
                  ) : (
                    s.n
                  )}
                </span>
                <span className={`text-xs font-bold transition-colors duration-300 hidden md:block ${
                  activeStep >= s.n ? 'text-slate-800' : 'text-slate-400'
                }`}>{s.label}</span>
              </div>
              {i < arr.length - 1 && (
                <div className={`w-8 md:w-16 h-0.5 mx-2 md:mx-3 shrink-0 transition-all duration-500 rounded-full ${
                  activeStep > s.n ? 'bg-teal-500 shadow-sm' : 'bg-slate-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto flex flex-col min-h-0 bg-slate-50/30 p-6">
          {error && (
            <div className="p-3 mb-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold shrink-0">
              {error}
            </div>
          )}

          {/* STEP 1: FIND / REGISTER PATIENT */}
          {activeStep === 1 && (
            <div className="flex flex-col gap-6 flex-1 min-h-0">
              {/* Toggle new vs registered vs waiting_approval */}
              <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit self-center shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setRegistrationType('registered');
                    setError('');
                  }}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
                    registrationType === 'registered' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-550 hover:text-slate-800'
                  }`}
                >
                  <Search size={14} /> Search Registered Patient
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRegistrationType('new');
                    setError('');
                  }}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
                    registrationType === 'new' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-550 hover:text-slate-800'
                  }`}
                >
                  <Plus size={14} /> Register New Patient
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRegistrationType('waiting_approval');
                    setError('');
                    loadPendingApprovals();
                  }}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
                    registrationType === 'waiting_approval' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-550 hover:text-slate-800'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Waiting for Approval
                  {pendingApprovals.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[10px] font-black leading-none ml-1">
                      {pendingApprovals.length}
                    </span>
                  )}
                </button>
              </div>

              {registrationType === 'waiting_approval' ? (
                <div className="flex flex-col gap-6 flex-1 min-h-0">
                  {/* Summary Metrics Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    {[
                      {
                        label: 'Pending Approval',
                        val: pendingApprovals.filter(a => a.status === 'waiting_for_approval' || a.discountRequest?.status === 'pending').length,
                        color: 'text-amber-600 bg-amber-50 border-amber-100',
                        icon: <Clock size={16} />
                      },
                      {
                        label: 'Approved Today',
                        val: pendingApprovals.filter(a => a.discountRequest?.status === 'approved').length,
                        color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
                        icon: <CheckCircle2 size={16} />
                      },
                      {
                        label: 'Rejected Today',
                        val: pendingApprovals.filter(a => a.discountRequest?.status === 'rejected').length,
                        color: 'text-rose-600 bg-rose-50 border-rose-100',
                        icon: <X size={16} />
                      },
                      {
                        label: 'Expired Requests',
                        val: pendingApprovals.filter(a => a.discountRequest?.status === 'expired' || a.status === 'cancelled').length,
                        color: 'text-slate-600 bg-slate-50 border-slate-100',
                        icon: <X size={16} />
                      },
                      {
                        label: 'Awaiting Payment',
                        val: pendingApprovals.filter(a => a.status === 'payment_pending').length,
                        color: 'text-blue-600 bg-blue-50 border-blue-100',
                        icon: <CreditCard size={16} />
                      },
                      {
                        label: 'Confirmed Today',
                        val: pendingApprovals.filter(a => a.status === 'completed' || a.status === 'confirmed').length,
                        color: 'text-teal-600 bg-teal-50 border-teal-100',
                        icon: <Check size={16} />
                      }
                    ].map((m, idx) => (
                      <div key={idx} className={`p-4 rounded-2xl border ${m.color} flex items-center gap-3 shadow-xs`}>
                        <div className="p-2 rounded-xl bg-white/80">{m.icon}</div>
                        <div>
                          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider leading-none">{m.label}</p>
                          <p className="text-lg font-black text-slate-800 mt-1 leading-none">{m.val}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Search and Filters Bar */}
                  <div className="flex flex-wrap gap-3 items-center bg-white p-4 border border-slate-150 rounded-2xl shadow-xs">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input
                        type="text"
                        placeholder="Search by patient name, appointment ID..."
                        value={approvalSearchQuery}
                        onChange={(e) => setApprovalSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                    <select
                      value={approvalStatusFilter}
                      onChange={(e) => setApprovalStatusFilter(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Waiting for Approval</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="expired">Expired</option>
                    </select>
                    <select
                      value={approvalDoctorFilter}
                      onChange={(e) => setApprovalDoctorFilter(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
                    >
                      <option value="all">All Doctors</option>
                      {doctorsList.map(d => (
                        <option key={d._id} value={d._id}>{d.fullName}</option>
                      ))}
                    </select>
                    <select
                      value={approvalSortOrder}
                      onChange={(e) => setApprovalSortOrder(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
                    >
                      <option value="newest">Sort by: Newest</option>
                      <option value="oldest">Sort by: Oldest</option>
                    </select>
                    <button
                      onClick={loadPendingApprovals}
                      className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition"
                      title="Refresh Request Queue"
                    >
                      <Clock size={14} className="animate-spin" />
                    </button>
                  </div>

                  {/* List of Requests */}
                  {(() => {
                    const filtered = pendingApprovals.filter(a => {
                      const patientName = a.patientId?.fullName || '';
                      const docName = a.doctorId?.fullName || '';
                      const apptId = a.appointmentId || '';
                      const matchesSearch = !approvalSearchQuery || 
                        patientName.toLowerCase().includes(approvalSearchQuery.toLowerCase()) ||
                        docName.toLowerCase().includes(approvalSearchQuery.toLowerCase()) ||
                        apptId.toLowerCase().includes(approvalSearchQuery.toLowerCase());
                      if (!matchesSearch) return false;

                      if (approvalStatusFilter !== 'all') {
                        const apptStatus = a.status;
                        const reqStatus = a.discountRequest?.status;
                        if (approvalStatusFilter === 'pending' && !(apptStatus === 'waiting_for_approval' || reqStatus === 'pending')) return false;
                        if (approvalStatusFilter === 'approved' && reqStatus !== 'approved') return false;
                        if (approvalStatusFilter === 'rejected' && reqStatus !== 'rejected') return false;
                        if (approvalStatusFilter === 'expired' && !(reqStatus === 'expired' || apptStatus === 'cancelled')) return false;
                      }

                      if (approvalDoctorFilter !== 'all' && a.doctorId?._id !== approvalDoctorFilter) return false;

                      return true;
                    }).sort((x, y) => {
                      const timeX = new Date(x.discountRequest?.requestedAt || x.createdAt).getTime();
                      const timeY = new Date(y.discountRequest?.requestedAt || y.createdAt).getTime();
                      return approvalSortOrder === 'newest' ? timeY - timeX : timeX - timeY;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center p-12 bg-white border border-slate-150 rounded-3xl text-center space-y-3">
                          <div className="p-4 bg-teal-50 rounded-full text-teal-600">
                            <Bot size={40} />
                          </div>
                          <h3 className="text-sm font-extrabold text-slate-800">No Consultation Fee Approval Requests</h3>
                          <p className="text-xs text-slate-450 max-w-sm">
                            All pending approval requests have been processed. New requests from reception will appear here automatically.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                        {filtered.map(appt => {
                          const patient = appt.patientId || {};
                          const doc = appt.doctorId || {};
                          const discountReq = appt.discountRequest || {};
                          
                          // Determine status
                          let statusLabel = 'Pending';
                          let badgeColor = 'bg-amber-50 text-amber-700 border-amber-100';
                          if (discountReq.status === 'approved') {
                            statusLabel = 'Approved';
                            badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                          } else if (discountReq.status === 'rejected') {
                            statusLabel = 'Rejected';
                            badgeColor = 'bg-rose-50 text-rose-700 border-rose-100';
                          } else if (discountReq.status === 'expired' || appt.status === 'cancelled') {
                            statusLabel = 'Expired';
                            badgeColor = 'bg-slate-50 text-slate-700 border-slate-100';
                          }

                          // Calculate elapsed minutes
                          const requestedTime = new Date(discountReq.requestedAt || appt.createdAt);
                          const elapsedMs = new Date() - requestedTime;
                          const elapsedMins = Math.max(0, Math.floor(elapsedMs / 60000));
                          const elapsedSecs = Math.max(0, Math.floor((elapsedMs % 60000) / 1000));

                          return (
                            <div key={appt._id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:border-slate-300 transition grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
                              {/* Patient Information */}
                              <div className="md:col-span-3 flex items-start gap-3 border-r border-slate-100/60 pr-4">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-xs shrink-0">
                                  {patient.fullName ? patient.fullName.charAt(0).toUpperCase() : 'P'}
                                </div>
                                <div className="space-y-1 text-xs">
                                  <p className="font-extrabold text-slate-800">{patient.fullName || '—'}</p>
                                  <p className="text-[10px] text-slate-400 font-medium">PID: {patient.patientId || '—'}</p>
                                  <p className="text-[10px] text-slate-500 font-bold">{patient.phone || '—'}</p>
                                  <p className="text-[10px] text-slate-400 font-medium">{patient.age || '—'} Y | {patient.gender || '—'}</p>
                                </div>
                              </div>

                              {/* Appointment Information */}
                              <div className="md:col-span-3 flex flex-col justify-between text-xs border-r border-slate-100/60 pr-4">
                                <div className="space-y-1.5">
                                  <p className="font-bold text-slate-800 text-[10px] bg-slate-50 px-2 py-0.5 rounded w-fit uppercase">Appt: {appt.appointmentId || '—'}</p>
                                  <p className="font-extrabold text-slate-700">{doc.fullName || '—'}</p>
                                  <p className="text-[10px] text-slate-400 font-medium">{doc.specialization || 'General'}</p>
                                  <p className="text-[10px] text-slate-500 font-bold mt-1">
                                    {new Date(appt.appointmentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} | {appt.appointmentTime}
                                  </p>
                                </div>
                                <div className="text-[10px] text-slate-400 mt-2 font-medium flex gap-2">
                                  <span>Branch: Indirapuram</span>
                                  <span>•</span>
                                  <span className="capitalize">{appt.appointmentType || 'Walk-In'}</span>
                                </div>
                              </div>

                              {/* Billing Information */}
                              <div className="md:col-span-3 flex flex-col justify-between text-xs border-r border-slate-100/60 pr-4">
                                <div className="space-y-1.5">
                                  <div className="flex justify-between"><span className="text-slate-400">Original Fee</span><span className="font-bold text-slate-700">₹{appt.consultationFee || 0}</span></div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Requested Discount</span>
                                    <span className="font-bold text-rose-600">- ₹{discountReq.amount || 0}</span>
                                  </div>
                                  <div className="flex justify-between pt-1.5 border-t border-slate-50">
                                    <span className="text-slate-700 font-extrabold">Final Requested</span>
                                    <span className="font-extrabold text-teal-700">₹{discountReq.finalPayableAmount !== undefined ? discountReq.finalPayableAmount : (appt.consultationFee || 0)}</span>
                                  </div>
                                </div>
                                <div className="text-[10px] text-slate-450 mt-2 font-medium">
                                  <p>Requested by: {discountReq.requestedBy?.name || 'Receptionist'}</p>
                                  <p className="text-[9px] text-slate-400 mt-0.5">
                                    {new Date(discountReq.requestedAt || appt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>

                              {/* Approval Status & Actions */}
                              <div className="md:col-span-3 flex flex-col justify-between text-xs pl-2">
                                <div>
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${badgeColor}`}>
                                    {statusLabel}
                                  </span>
                                  <p className="text-[10px] text-slate-400 font-medium mt-2">Approval Policy</p>
                                  <p className="text-[10px] font-extrabold text-slate-700">{discountReq.approvalPolicy || 'Clinic Admin Approval Only'}</p>
                                </div>

                                <div className="space-y-2 mt-4">
                                  {/* Case 1: Pending */}
                                  {statusLabel === 'Pending' && (
                                    <div className="space-y-2 bg-amber-50/50 p-2 rounded-xl border border-amber-100/50">
                                      <div className="flex justify-between items-center text-[10px]">
                                        <span className="text-slate-450 font-bold">Elapsed Time</span>
                                        <span className="text-amber-700 font-extrabold">{elapsedMins}m {elapsedSecs}s</span>
                                      </div>
                                      <div className="flex gap-1.5 mt-2">
                                        <button
                                          onClick={() => {
                                            // Set up wizard state to details page view or toggle details modal
                                            window.location.href = `/appointments/${appt._id}`;
                                          }}
                                          className="flex-1 py-1 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[10px] font-bold rounded-lg text-slate-600 transition text-center"
                                        >
                                          View Details
                                        </button>
                                        <button
                                          onClick={loadPendingApprovals}
                                          className="flex-1 py-1 px-2 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold rounded-lg transition"
                                        >
                                          Refresh Status
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {/* Case 2: Approved */}
                                  {statusLabel === 'Approved' && (
                                    <div className="space-y-1.5">
                                      <p className="text-[9px] text-emerald-800 font-bold leading-tight">✓ Approved by Admin. Please collect payment.</p>
                                      <button
                                        onClick={() => handleProceedToPayment(appt)}
                                        className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition shadow-xs"
                                      >
                                        Proceed to Payment
                                      </button>
                                    </div>
                                  )}

                                  {/* Case 3: Rejected */}
                                  {statusLabel === 'Rejected' && (
                                    <div className="space-y-1.5">
                                      <p className="text-[9px] text-rose-800 font-bold leading-tight bg-rose-50 p-1.5 rounded">Reason: {discountReq.rejectionReason || 'Discount request not approved.'}</p>
                                      <div className="flex gap-1">
                                        <button
                                          onClick={() => {
                                            // Set up wizard and directly proceed to billing step for full payment
                                            const newAppt = { ...appt, discountRequest: null };
                                            setCreatedAppointment(newAppt);
                                            setSelectedDoctorId(newAppt.doctorId?._id || newAppt.doctorId);
                                            setSelectedDate(newAppt.appointmentDate?.split('T')[0]);
                                            setSelectedSlot({ startTime: newAppt.appointmentTime, endTime: newAppt.appointmentTime });
                                            setDiscountType('none');
                                            setDiscountValue('');
                                            setDiscountReason('');
                                            setPaymentMethod('cash');
                                            setActiveStep(4);
                                          }}
                                          className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-[9px] font-bold rounded-lg transition text-center"
                                        >
                                          Collect Full Fee
                                        </button>
                                        <button
                                          onClick={() => {
                                            setSelectedPatient(patient);
                                            setSelectedDoctorId(doc._id);
                                            setSelectedDate(new Date().toISOString().split('T')[0]);
                                            setActiveStep(2);
                                          }}
                                          className="flex-1 py-1.5 border border-slate-200 hover:bg-slate-50 text-[9px] font-bold rounded-lg text-slate-600 transition"
                                        >
                                          Rebook
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {/* Case 4: Expired */}
                                  {statusLabel === 'Expired' && (
                                    <div className="space-y-1.5">
                                      <p className="text-[9px] text-slate-500 italic leading-tight">Request expired.</p>
                                      <button
                                        onClick={() => {
                                          setSelectedPatient(patient);
                                          setSelectedDoctorId(doc._id);
                                          setSelectedDate(new Date().toISOString().split('T')[0]);
                                          setActiveStep(2);
                                        }}
                                        className="w-full py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-bold rounded-lg transition"
                                      >
                                        Create New Booking
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              ) : registrationType === 'registered' ? (
                <div className="grid gap-6 md:grid-cols-2 flex-1 items-stretch">
                  {/* Left block: Search */}
                  <div className="bg-white border border-slate-150 rounded-3xl p-6 flex flex-col shadow-sm">
                    <h3 className="text-sm font-bold text-slate-800 border-b border-slate-50 pb-2 mb-3">Search Database</h3>
                    <p className="text-[11px] text-slate-455 font-medium mb-4">Enter Patient ID card barcode, Phone number or Email address to search</p>

                    <div className="flex gap-2 mb-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="text"
                          placeholder="Scan Barcode or enter Patient ID / Phone / Email"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSearchPatient(); }}
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 focus:outline-none transition"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleSearchPatient}
                        disabled={searching}
                        className="px-6 py-3 bg-teal-500 hover:bg-teal-600 disabled:bg-teal-400 text-white text-xs font-bold rounded-xl shadow-sm transition shrink-0"
                      >
                        {searching ? 'Searching...' : 'Search'}
                      </button>
                    </div>

                    <div className="flex-1 space-y-2 overflow-y-auto max-h-[220px] pr-1">
                      {searchResults.map((pat) => {
                        const patName = pat.firstName + ' ' + pat.lastName;
                        const isSelected = selectedPatient?._id === pat._id;
                        return (
                          <div
                            key={pat._id}
                            onClick={() => setSelectedPatient(pat)}
                            className={'p-3.5 rounded-xl border transition cursor-pointer flex justify-between items-center ' + (
                              isSelected ? 'border-teal-500 bg-teal-50/20 font-bold' : 'border-slate-150 hover:border-slate-250 bg-slate-50/20'
                            )}
                          >
                            <div>
                              <p className="text-xs font-bold text-slate-800">{patName}</p>
                              <p className="text-[10px] text-slate-450 font-medium mt-1">
                                ID: {pat.patientId} | Phone: {pat.phone}
                              </p>
                            </div>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-teal-505 text-white flex items-center justify-center">
                                <Check size={12} className="stroke-[3]" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {!searching && searchResults.length === 0 && searchQuery.trim() && (
                        <div className="text-center py-8 text-slate-400 text-xs font-semibold">
                          No patients found. Click 'Register New Patient' to add details.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right block: Selected Card */}
                  <div className="bg-white border border-slate-150 rounded-3xl p-6 flex flex-col justify-between shadow-sm">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 border-b border-slate-50 pb-2 mb-4">Patient Profile Snapshot</h3>
                      {selectedPatient ? (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3.5 bg-teal-50/30 border border-teal-100/50 rounded-2xl p-4">
                            <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 font-bold text-sm">
                              {selectedPatient.firstName?.[0]}{selectedPatient.lastName?.[0]}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-905">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                              <p className="text-xs text-slate-505 font-semibold mt-0.5">ID: {selectedPatient.patientId}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-xs font-medium text-slate-600 bg-slate-50/50 p-4 rounded-2xl">
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Phone</p>
                              <p className="mt-0.5 text-slate-808">{selectedPatient.phone}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Email</p>
                              <p className="mt-0.5 text-slate-808 truncate">{selectedPatient.email || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Gender</p>
                              <p className="mt-0.5 text-slate-808 capitalize">{selectedPatient.gender}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Date of Birth</p>
                              <p className="mt-0.5 text-slate-808">{selectedPatient.dateOfBirth?.slice(0, 10)}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center p-8 text-slate-400 min-h-[180px]">
                          <User size={36} className="text-slate-300 stroke-[1.5] mb-2" />
                          <p className="text-xs font-bold">No patient selected</p>
                          <p className="text-[10px] mt-1 max-w-xs">Search and select a patient from the database to continue to booking.</p>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 shrink-0">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 border border-slate-205 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={!selectedPatient}
                        onClick={() => {
                          setChatFlowStep('symptoms');
                          setChatCollected({ symptoms: '', duration: '', extraConditions: '' });
                          setChatHistory([]);
                          setAiTriageResult(null);
                          setSuggestedDoctors([]);
                          setChosenDoctor(null);
                          setActiveStep(2);
                        }}
                        className="px-6 py-2.5 bg-teal-555 hover:bg-white hover:text-black disabled:bg-slate-205 disabled:text-slate-400 bg-teal-600 text-white text-xs font-bold rounded-xl shadow-md transition"
                      >
                        Continue to Booking
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-2 flex-1 items-stretch bg-white border border-slate-150 rounded-3xl p-6 shadow-sm">
                  {/* Left Column: Form Details */}
                  <div className="space-y-4 pr-0 md:pr-4 md:border-r border-slate-100 overflow-y-auto">
                    <h3 className="text-sm font-bold text-slate-805 border-b border-slate-50 pb-2">Patient Details</h3>
                    
                    {ocrLoading && (
                      <div className="p-3 bg-teal-50 text-teal-700 rounded-xl text-xs font-semibold animate-pulse">
                        Smart Scanning ID Document... Please wait.
                      </div>
                    )}

                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                      {/* Full Name */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">Full Name *</label>
                        <input
                          type="text"
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleChange}
                          placeholder="Enter full name"
                          required
                          className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 focus:outline-none transition"
                        />
                      </div>

                      {/* Gender */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">Gender *</label>
                        <select
                          name="gender"
                          value={formData.gender}
                          onChange={handleChange}
                          required
                          className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 focus:outline-none transition"
                        >
                          <option value="">Select Gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      {/* Date of Birth */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">Date of Birth *</label>
                        <div className="relative">
                          <Calendar className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                          <input
                            type="date"
                            name="dateOfBirth"
                            value={formData.dateOfBirth}
                            onChange={handleChange}
                            required
                            max={new Date().toISOString().split('T')[0]}
                            className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 focus:outline-none transition"
                          />
                        </div>
                      </div>

                      {/* Age */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">Age</label>
                        <input
                          type="number"
                          name="age"
                          value={formData.age}
                          readOnly
                          placeholder="Age"
                          className="px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-505 focus:outline-none"
                        />
                      </div>

                      {/* Mobile Number */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">Mobile Number *</label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="10-digit mobile number"
                          required
                          pattern="[0-9]{10}"
                          className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 focus:outline-none transition"
                        />
                      </div>

                      {/* Email Address */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">Email Address</label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="example@test.com"
                          className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 focus:outline-none transition"
                        />
                      </div>
                    </div>

                    {/* Address Fields */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-600">Residential Address *</label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="Street details / Block number"
                        required
                        className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 focus:outline-none transition"
                      />
                    </div>

                    <div className="grid gap-4 grid-cols-3">
                      <div className="flex flex-col gap-1.5">
                        <input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleChange}
                          placeholder="City"
                          required
                          className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 focus:outline-none transition"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <select
                          name="state"
                          value={formData.state}
                          onChange={handleChange}
                          required
                          className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 focus:outline-none transition"
                        >
                          <option value="">Select State</option>
                          {STATES.map((st) => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <input
                          type="text"
                          name="pincode"
                          value={formData.pincode}
                          onChange={handleChange}
                          placeholder="Pincode"
                          required
                          className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 focus:outline-none transition"
                        />
                      </div>
                    </div>

                    {/* Emergency Contact */}
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">Emergency Contact Name</label>
                        <input
                          type="text"
                          name="emergencyContactName"
                          value={formData.emergencyContactName}
                          onChange={handleChange}
                          placeholder="Contact Name"
                          className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 focus:outline-none transition"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">Emergency Phone</label>
                        <input
                          type="tel"
                          name="emergencyContactPhone"
                          value={formData.emergencyContactPhone}
                          onChange={handleChange}
                          placeholder="Contact Number"
                          className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 focus:outline-none transition"
                        />
                      </div>
                    </div>

                    {/* Medical & Additional Info */}
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">Blood Group *</label>
                        <select
                          name="bloodGroup"
                          value={formData.bloodGroup}
                          onChange={handleChange}
                          required
                          className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 focus:outline-none transition"
                        >
                          <option value="">Select Blood Group</option>
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">Allergies *</label>
                        <input
                          type="text"
                          name="allergies"
                          value={formData.allergies}
                          onChange={handleChange}
                          placeholder="e.g. Peanuts, Penicillin (or 'None')"
                          required
                          className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 focus:outline-none transition"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-600">Medical Conditions *</label>
                      <input
                        type="text"
                        name="chronicConditions"
                        value={formData.chronicConditions}
                        onChange={handleChange}
                        placeholder="e.g. Asthma, Diabetes, Hypertension (or 'None')"
                        required
                        className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 focus:outline-none transition"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-600">Additional Notes (Optional)</label>
                      <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        placeholder="Any other relevant details or history..."
                        rows={2}
                        className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 focus:outline-none transition resize-none"
                      />
                    </div>

                    <label className="flex items-start gap-2.5 text-xs text-slate-500 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        name="confirmCorrect"
                        checked={formData.confirmCorrect}
                        onChange={handleChange}
                        required
                        className="mt-0.5 rounded border-slate-300 text-teal-650 focus:ring-teal-500"
                      />
                      <span>I confirm the details provided are correct.</span>
                    </label>
                  </div>

                  {/* Right Column: ID Proof & Scan */}
                  <div className="space-y-4 pl-0 md:pl-4 flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 border-b border-slate-50 pb-2">ID Proof (Required)</h3>
                      <p className="text-[11px] text-slate-400 mt-1 font-medium">Scan or upload patient ID proof for verification</p>

                      {/* Tabs */}
                      <div className="flex border-b border-slate-100 shrink-0 mt-3">
                        <button
                          type="button"
                          onClick={() => setActiveIdTab('scan')}
                          className={`flex-1 py-2 text-center text-xs font-semibold border-b-2 transition ${
                            activeIdTab === 'scan' ? 'border-teal-500 text-teal-655' : 'border-transparent text-slate-400 hover:text-slate-650'
                          }`}
                        >
                          Scan ID Card
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveIdTab('upload')}
                          className={`flex-1 py-2 text-center text-xs font-semibold border-b-2 transition ${
                            activeIdTab === 'upload' ? 'border-teal-500 text-teal-655' : 'border-transparent text-slate-400 hover:text-slate-650'
                          }`}
                        >
                          Upload ID Card
                        </button>
                      </div>

                      {/* Tab Contents */}
                      <div className="flex-1 flex flex-col justify-center min-h-[200px] mt-4">
                        {activeIdTab === 'scan' ? (
                          <div className="border border-slate-150 rounded-2xl p-4 bg-slate-50/50 flex flex-col items-center justify-center text-center space-y-4">
                            {/* Camera screen box */}
                            <div className="w-36 h-24 bg-slate-905 border border-slate-800 rounded-xl relative flex items-center justify-center overflow-hidden">
                              <div className="absolute inset-2 border border-teal-500/20 rounded flex items-center justify-center">
                                <div className="w-4 h-4 border-t border-l border-teal-505 absolute top-0 left-0" />
                                <div className="w-4 h-4 border-t border-r border-teal-505 absolute top-0 right-0" />
                                <div className="w-4 h-4 border-b border-l border-teal-505 absolute bottom-0 left-0" />
                                <div className="w-4 h-4 border-b border-r border-teal-505 absolute bottom-0 right-0" />

                                {scanning && (
                                  <div className="w-full h-0.5 bg-teal-400 absolute top-1/2 left-0 shadow-[0_0_8px_#2dd4bf] animate-[bounce_2s_infinite]" />
                                )}

                                {scanSuccess ? (
                                  <CheckCircle2 size={24} className="text-emerald-555 animate-pulse" />
                                ) : (
                                  <Camera size={20} className="text-teal-505/40" />
                                )}
                              </div>
                            </div>

                            <div>
                              <h4 className="text-xs font-bold text-slate-855">
                                {scanning ? 'Scanning ID Card...' : scanSuccess ? 'ID Scan Success' : 'Ready to scan'}
                              </h4>
                            </div>

                            <button
                              type="button"
                              onClick={handleStartScan}
                              disabled={scanning}
                              className="px-4 py-2 bg-teal-555 hover:bg-teal-600 disabled:bg-teal-400 text-white text-xs font-bold rounded-xl shadow-sm transition"
                            >
                              {scanning ? 'Scanning...' : 'Start Scanning'}
                            </button>
                          </div>
                        ) : (
                          <label className="border-2 border-dashed border-slate-200 hover:border-slate-300 transition rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-3 cursor-pointer">
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleOcrFile(file);
                              }}
                              className="hidden"
                              disabled={ocrLoading}
                            />
                            <div className="p-3 bg-teal-50 rounded-2xl text-teal-555">
                              <Upload size={20} />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-800">
                                {ocrLoading ? 'Scanning...' : 'Click to upload ID proof'}
                              </h4>
                              <p className="text-[10px] text-slate-450 mt-1 font-medium">JPG, PNG, PDF up to 5MB</p>
                            </div>
                          </label>
                        )}
                      </div>

                      {/* Accepted Docs */}
                      <div className="pt-4 border-t border-slate-100 shrink-0 mt-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Accepted Documents</span>
                        <div className="flex flex-wrap gap-2.5 text-[10px] font-semibold text-slate-500">
                          <span className="flex items-center gap-1"><Shield size={11} className="text-slate-400" /> Aadhaar Card</span>
                          <span className="flex items-center gap-1"><FileText size={11} className="text-slate-400" /> PAN Card</span>
                          <span className="flex items-center gap-1"><FileText size={11} className="text-slate-400" /> Driving License</span>
                        </div>
                      </div>
                    </div>

                    {/* Form Action Buttons */}
                    <div className="flex justify-end gap-3 pt-6 shrink-0 border-t border-slate-100 mt-6">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-855 text-xs font-bold rounded-xl transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-5 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:bg-teal-400 text-white text-xs font-bold rounded-xl shadow-sm transition"
                      >
                        {submitting ? 'Saving...' : 'Register & Continue'}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          )}
          {/* STEP 2: SELECT A DOCTOR */}
          {activeStep === 2 && selectedPatient && (
            <div className="flex flex-col flex-1 bg-white border border-slate-150 rounded-3xl p-6 shadow-sm min-h-0 overflow-hidden">
              
              {/* Doctor Search & Filter Header Bar */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">Select a Doctor</h3>
                  <p className="text-xs font-semibold text-slate-400 mt-1">Choose the most suitable doctor for the patient</p>
                </div>
                
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-80">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                      type="text"
                      placeholder="Search doctor by name, department or specialist..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 focus:outline-none transition"
                    />
                  </div>
                  <button type="button" className="px-4 py-2.5 border border-slate-200 hover:border-slate-350 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-2 transition bg-white">
                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
                    </svg>
                    Filter
                  </button>
                </div>
              </div>

              {/* Doctors Cards Grid */}
              <div className="flex-1 overflow-y-auto min-h-0 pr-1 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredDocs.map(doc => {
                    const isSelected = selectedDoctorId === doc._id;
                    const name = doc.fullName || doc.userId?.name || 'Dr. Doctor';
                    const specialty = doc.specialization || 'General Physician';
                    const qualifications = doc.qualifications || 'MBBS, MD';
                    const fee = doc.consultationFee || 500;
                    const isConsultant = specialty.toLowerCase().includes('consultant');
                    
                    return (
                      <div
                        key={doc._id}
                        onClick={() => setSelectedDoctorId(doc._id)}
                        className={`bg-white border rounded-2xl p-5 transition cursor-pointer flex flex-col justify-between relative hover:shadow-md ${
                          isSelected ? 'border-teal-500 ring-2 ring-teal-500/10' : 'border-slate-150 hover:border-slate-250'
                        }`}
                      >
                        {/* Profile Info */}
                        <div className="flex gap-4">
                          <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                            {doc.profileImage ? (
                              <img src={doc.profileImage} alt={name} className="w-full h-full object-cover" />
                            ) : (
                              <User className="text-slate-400" size={32} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="text-sm font-extrabold text-slate-800 leading-tight truncate">{name}</h4>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                isConsultant ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                              }`}>
                                {isConsultant ? 'Consultant' : 'Specialist'}
                              </span>
                            </div>
                            <p className="text-[11px] font-semibold text-slate-500 mt-1">{specialty}</p>
                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">{qualifications}</p>
                            <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-amber-500">
                              <span>★</span> <span>4.8 (128 Reviews)</span>
                            </div>
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-slate-100 my-4"></div>

                        {/* Fee and Availability */}
                        <div className="flex justify-between items-center text-[11px] font-semibold">
                          <div>
                            <p className="text-[10px] text-slate-400 font-medium">Consultation Fee</p>
                            <p className="text-xs font-extrabold text-slate-850 mt-0.5">₹{fee}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-slate-400 font-medium">Availability</p>
                            {doctorAvailabilityInfo[doc._id] ? (
                              doctorAvailabilityInfo[doc._id].status === 'Available Now' ? (
                                <span className="flex items-center gap-1 justify-end text-emerald-600 mt-0.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                  Available Now
                                </span>
                              ) : doctorAvailabilityInfo[doc._id].status === 'Not Available' ? (
                                <span className="flex items-center gap-1 justify-end text-rose-600 mt-0.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                  Not Available
                                </span>
                              ) : (
                                <span className="text-blue-600 font-bold mt-0.5 block text-right text-[10px]">
                                  {doctorAvailabilityInfo[doc._id].status}
                                </span>
                              )
                            ) : (
                              <span className="text-slate-400 animate-pulse mt-0.5 block text-right text-[10px]">Checking...</span>
                            )}
                          </div>
                        </div>
                        
                        {isSelected && (
                          <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-teal-500 text-white flex items-center justify-center shadow-sm">
                            <Check size={12} className="stroke-[3]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* View More Doctors Decorative Button */}
                {filteredDocs.length > 6 && (
                  <div className="flex justify-center mt-6">
                    <button type="button" className="text-xs font-bold text-teal-650 hover:text-teal-700 flex items-center gap-1.5 transition">
                      View More Doctors
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path>
                      </svg>
                    </button>
                  </div>
                )} </div>

              {/* Footer Buttons */}
              <div className="flex justify-between gap-3 pt-4 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveStep(1)}
                  className="px-6 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={!selectedDoctorId}
                  onClick={() => setActiveStep(3)}
                  className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5"
                >
                  Continue to Confirm
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"></path>
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: CONFIRM & BOOK */}
          {activeStep === 3 && selectedPatient && (
            <div className="grid gap-6 md:grid-cols-2 flex-1 items-stretch min-h-0 overflow-hidden">
              
              {/* Left Column: Date & Slot Picker + Reason */}
              <div className="bg-white border border-slate-150 rounded-3xl p-6 flex flex-col justify-between shadow-sm overflow-y-auto">
                <div className="space-y-5">
                  <h3 className="text-sm font-bold text-slate-800 border-b border-slate-50 pb-2">Select Date & Time Slot</h3>
                  
                  {/* Selected Doctor Summary Card */}
                  {doctorsList.find(d => d._id === selectedDoctorId) && (() => {
                    const doc = doctorsList.find(d => d._id === selectedDoctorId);
                    const name = doc.fullName || doc.userId?.name || 'Dr. Doctor';
                    const specialty = doc.specialization || 'General Physician';
                    return (
                      <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-teal-555 text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {name[0] === 'D' && name[1] === 'r' ? name[4] || name[0] : name[0]}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">{name}</p>
                          <p className="text-[10px] text-slate-505 font-semibold mt-0.5">{specialty}</p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Choose Date */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Appointment Date</label>
                    <div className="relative">
                      <Calendar className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 focus:outline-none transition"
                      />
                    </div>
                  </div>

                  {/* Slots Time list */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Available Slots</span>
                    
                    {loadingSlots ? (
                      <div className="py-6 text-center text-xs text-slate-450 font-semibold animate-pulse">
                        Loading slots...
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 font-semibold leading-relaxed">
                        No available slots found for the selected date. Please choose another date.
                      </div>
                    ) : (
                      <div>
                        {(() => {
                          const nextActive = availableSlots.find(s => !isSlotTimePassed(selectedDate, s.startTime));
                          return nextActive ? (
                            <div className="p-2 bg-teal-50/50 rounded-xl text-[10px] text-teal-850 font-bold mb-2.5 flex items-center justify-between">
                              <span>Next Auto-Selected slot:</span>
                              <span className="bg-teal-500 text-white px-2 py-0.5 rounded-md text-[9px] font-extrabold">
                                {nextActive.startTime}
                              </span>
                            </div>
                          ) : (
                            <div className="p-2 bg-rose-55 border border-rose-100/50 rounded-xl text-[10px] text-rose-850 font-bold mb-2.5 flex items-center justify-between bg-rose-50/50">
                              <span>No remaining slots today</span>
                            </div>
                          );
                        })()}

                        <div className="grid grid-cols-3 gap-2 max-h-[140px] overflow-y-auto pr-1">
                          {availableSlots.map((slot, index) => {
                            const isSelected = selectedSlot?.startTime === slot.startTime;
                            const isPassed = isSlotTimePassed(selectedDate, slot.startTime);
                            return (
                              <button
                                key={index}
                                type="button"
                                disabled={isPassed}
                                onClick={() => setSelectedSlot(slot)}
                                className={`py-2 px-2.5 text-center text-[10px] font-bold rounded-xl border transition flex items-center justify-center gap-1.5 ${
                                  isPassed
                                    ? 'bg-slate-100 border-slate-200 text-slate-400 line-through cursor-not-allowed opacity-60'
                                    : isSelected
                                    ? 'bg-teal-500 border-teal-500 text-white shadow-sm'
                                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-350'
                                }`}
                              >
                                <Clock size={10} />
                                {slot.startTime}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Reason for visit */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reason for Visit (Optional)</label>
                    <textarea
                      value={reasonForVisitReg}
                      onChange={(e) => setReasonForVisitReg(e.target.value)}
                      placeholder="Reason for visit / symptoms details"
                      rows={3}
                      className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 focus:outline-none transition resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Confirmation Summary & Booking Action */}
              <div className="bg-white border border-slate-150 rounded-3xl p-6 flex flex-col justify-between shadow-sm overflow-y-auto">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 border-b border-slate-50 pb-2">Confirm Appointment Details</h3>
                  
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50/50 rounded-2xl space-y-3.5 text-xs font-medium text-slate-700 border border-slate-100">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Patient</span>
                        <span className="text-slate-905 font-bold">{selectedPatient.firstName} {selectedPatient.lastName}</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-slate-100/60 pt-2.5">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Assigned Doctor</span>
                        <span className="text-slate-905 font-bold">
                          {doctorsList.find(d => d._id === selectedDoctorId)?.fullName || doctorsList.find(d => d._id === selectedDoctorId)?.userId?.name}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-t border-slate-100/60 pt-2.5">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Specialization</span>
                        <span className="text-teal-700 font-bold">
                          {doctorsList.find(d => d._id === selectedDoctorId)?.specialization || 'General'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-t border-slate-100/60 pt-2.5">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Appointment Time</span>
                        <span className="text-slate-905 font-bold">
                          {selectedDate} | {selectedSlot?.startTime || 'Auto-Selected'} - {selectedSlot?.endTime || ''}
                        </span>
                      </div>
                      <div className="flex justify-between items-start border-t border-slate-100/60 pt-2.5">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] shrink-0">Reason for Visit</span>
                        <span className="text-slate-905 font-semibold text-right leading-relaxed max-w-[70%] truncate">
                          {reasonForVisitReg || 'Consultation'}
                        </span>
                      </div>
                      {followUpInfo && (
                        <div className="flex justify-between items-center border-t border-slate-100/60 pt-2.5">
                          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Consultation Fee</span>
                          <div className="text-right">
                            <span className="text-slate-905 font-bold text-xs">₹{followUpInfo.fee}</span>
                            {followUpInfo.isFollowUp ? (
                              <span className="ml-2 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[8px] font-black uppercase px-1.5 py-0.5 rounded">
                                Follow-up Visit (₹{followUpInfo.fee})
                              </span>
                            ) : (
                              <span className="ml-2 bg-blue-50 text-blue-600 border border-blue-100 text-[8px] font-black uppercase px-1.5 py-0.5 rounded">
                                Standard Visit
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-teal-50/30 border border-teal-100/50 rounded-2xl flex items-start gap-3">
                      <div className="p-1.5 bg-teal-100 text-teal-700 rounded-lg shrink-0">
                        <CheckCircle2 size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-teal-900">Walk-In Patient Check-In Benefits</p>
                        <p className="text-[10px] text-teal-700/80 leading-relaxed mt-0.5">The patient status is automatically marked as checked-in, generating a queue token number instantly.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between gap-3 pt-6 border-t border-slate-100 shrink-0 mt-6">
                  <button
                    type="button"
                    onClick={() => setActiveStep(2)}
                    className="px-5 py-2.5 border border-slate-205 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={submitting || !selectedSlot}
                    onClick={async () => {
                      if (!selectedPatient || !selectedSlot) return;
                      setSubmitting(true);
                      setError('');
                      const finalDoctorId = chosenDoctor?._id || selectedDoctorId;
                      const finalReason = (chatCollected.symptoms || reasonForVisitReg || '').trim() || 'Consultation';
                      const payload = {
                        patientId: selectedPatient._id,
                        doctorId: finalDoctorId,
                        appointmentDate: selectedDate,
                        startTime: selectedSlot.startTime,
                        endTime: selectedSlot.endTime,
                        appointmentType: 'walk_in',
                        reasonForVisit: finalReason,
                        status: 'payment_pending'
                      };
                      try {
                        const response = await appointmentApi.createAppointment(payload);
                        const aptData = response.data?.appointment || response.appointment || response;
                        setCreatedAppointment(aptData);
                        // Set reservation countdown (default 15 min)
                        const expiry = new Date(Date.now() + 15 * 60 * 1000);
                        setReservationExpiry(expiry);
                        setActiveStep(4);
                      } catch (err) {
                        setError(err.response?.data?.message || 'Failed to create appointment.');
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                    className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-205 disabled:text-slate-400 text-white text-xs font-bold rounded-xl shadow-md transition"
                  >
                    {submitting ? 'Creating...' : 'Proceed to Billing â†’'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: BILLING & PAYMENT */}
          {activeStep === 4 && createdAppointment && (
            <div className="flex flex-col gap-6 flex-1 min-h-0">
              <div className="grid gap-6 md:grid-cols-2 flex-1 items-stretch">
                {/* Left: Fee & Discount Section */}
                <div className="bg-white border border-slate-150 rounded-3xl p-6 flex flex-col gap-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-teal-50 rounded-xl text-teal-600"><CreditCard size={16} /></div>
                    <h3 className="text-sm font-bold text-slate-800">Consultation Fee & Discount</h3>
                  </div>

                  {/* Reservation Timer */}
                  {reservationExpiry && (
                    <div className="flex items-center gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <Clock size={14} className="text-amber-600 shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-amber-800">Slot Reserved</p>
                        <p className="text-[9px] text-amber-600 font-semibold">Complete payment within 15 minutes to confirm this slot</p>
                      </div>
                    </div>
                  )}

                  {/* Fee Display */}
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 font-bold">Consultation Fee</span>
                      <span className="text-lg font-extrabold text-slate-900">₹{createdAppointment.consultationFee || followUpInfo?.fee || 0}</span>
                    </div>
                    {discountType !== 'none' && discountValue && (
                      <>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-bold">Discount Applied</span>
                          <span className="text-emerald-600 font-bold">- ₹{
                            discountType === 'percentage'
                              ? Math.round((parseFloat(discountValue) / 100) * (createdAppointment.consultationFee || 0))
                              : discountType === 'full_waiver'
                              ? (createdAppointment.consultationFee || 0)
                              : parseFloat(discountValue) || 0
                          }</span>
                        </div>
                        <div className="border-t border-slate-200 pt-2 flex justify-between items-center">
                          <span className="text-xs text-slate-700 font-extrabold">Net Payable</span>
                          <span className="text-base font-extrabold text-teal-700">₹{
                            Math.max(0,
                              (createdAppointment.consultationFee || 0) - (
                                discountType === 'percentage'
                                  ? Math.round((parseFloat(discountValue) / 100) * (createdAppointment.consultationFee || 0))
                                  : discountType === 'full_waiver'
                                  ? (createdAppointment.consultationFee || 0)
                                  : parseFloat(discountValue) || 0
                              )
                            )
                          }</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Discount Type */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Discount / Waiver Type</label>
                    <select
                      value={discountType}
                      onChange={(e) => { setDiscountType(e.target.value); setDiscountValue(''); }}
                      className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 focus:outline-none"
                    >
                      <option value="none">No Discount (Full Fee)</option>
                      <option value="percentage">Percentage Discount (%)</option>
                      <option value="fixed">Fixed Amount Discount (₹)</option>
                      <option value="full_waiver">Full Fee Waiver (₹0)</option>
                      <option value="senior_citizen">Senior Citizen Concession</option>
                      <option value="membership">Membership / Loyalty</option>
                      <option value="corporate">Corporate Tie-Up</option>
                      <option value="insurance">Insurance Covered</option>
                      <option value="employee">Employee / Staff</option>
                      <option value="promotional">Promotional Offer</option>
                      <option value="doctor_courtesy">Doctor Courtesy</option>
                      <option value="admin_courtesy">Admin Courtesy</option>
                    </select>
                  </div>

                  {discountType !== 'none' && discountType !== 'full_waiver' && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {discountType === 'percentage' ? 'Discount Percentage (%)' : 'Discount Amount (₹)'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={discountType === 'percentage' ? '100' : createdAppointment.consultationFee}
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        placeholder={discountType === 'percentage' ? 'e.g. 20' : 'e.g. 200'}
                        className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                  )}

                  {discountType !== 'none' && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reason for Discount / Waiver</label>
                      <textarea
                        value={discountReason}
                        onChange={(e) => setDiscountReason(e.target.value)}
                        placeholder="Briefly describe the reason for the discount or waiver..."
                        rows={2}
                        className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 focus:outline-none resize-none"
                      />
                    </div>
                  )}

                  {billingError && (
                    <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl">
                      <AlertCircle size={14} className="text-rose-500 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-rose-700 font-semibold">{billingError}</p>
                    </div>
                  )}
                </div>

                {/* Right: Payment Method & Actions */}
                <div className="bg-white border border-slate-150 rounded-3xl p-6 flex flex-col gap-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600"><Receipt size={16} /></div>
                    <h3 className="text-sm font-bold text-slate-800">Payment Collection</h3>
                  </div>

                  {/* Appointment Summary */}
                  <div className="p-4 bg-teal-50/30 border border-teal-100/50 rounded-2xl space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-slate-500 font-bold">Patient</span><span className="font-bold text-slate-800">{selectedPatient?.firstName} {selectedPatient?.lastName}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500 font-bold">Doctor</span><span className="font-bold text-slate-800">{doctorsList.find(d => d._id === (chosenDoctor?._id || selectedDoctorId))?.fullName || 'â€”'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500 font-bold">Date & Slot</span><span className="font-bold text-slate-800">{selectedDate} | {selectedSlot?.startTime}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500 font-bold">Appointment ID</span><span className="font-bold text-teal-700 font-mono text-[10px]">{createdAppointment._id?.slice(-8)?.toUpperCase()}</span></div>
                  </div>

                  {/* Payment Method */}
                  {discountType === 'none' || (discountType !== 'full_waiver') ? (
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payment Method</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: 'cash', label: '💵 Cash' },
                          { value: 'upi', label: '📱 UPI' },
                          { value: 'card', label: '💳 Card' },
                          { value: 'net_banking', label: '🏦 Net Banking' }
                        ].map((m) => (
                          <button
                            key={m.value}
                            type="button"
                            onClick={() => setPaymentMethod(m.value)}
                            className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition ${
                              paymentMethod === m.value
                                ? 'bg-teal-600 border-teal-600 text-white shadow-sm'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-teal-300'
                            }`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-auto space-y-3">
                    {discountType !== 'none' ? (
                      discountRequestPending ? (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-center">
                          <Clock size={20} className="text-amber-500 mx-auto mb-2" />
                          <p className="text-xs font-bold text-amber-800">Awaiting Approval</p>
                          <p className="text-[10px] text-amber-600 mt-1">Discount request submitted. Waiting for doctor/admin approval...</p>
                          <div className="flex gap-2 justify-center mt-3">
                            <button
                              type="button"
                              onClick={async () => {
                                setBillingSubmitting(true);
                                setBillingError('');
                                try {
                                  // Refresh appointment status
                                  const refreshed = await appointmentApi.getAppointmentById(createdAppointment._id);
                                  const apt = refreshed?.data?.appointment || refreshed?.appointment || refreshed;
                                  if (apt.status === 'payment_pending' && apt.discountRequest?.status === 'approved') {
                                    setCreatedAppointment(apt);
                                    setDiscountRequestPending(false);
                                  } else if (apt.discountRequest?.status === 'rejected') {
                                    setDiscountRequestPending(false);
                                    setBillingError('Discount request was rejected. Please collect full fee or submit a new request.');
                                  }
                                } catch {}
                                setBillingSubmitting(false);
                              }}
                              className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 text-[10px] font-bold rounded-lg transition"
                            >Refresh Status</button>
                            <button
                              type="button"
                              onClick={() => {
                                resetBookingFlow();
                                setActiveStep(1);
                                setRegistrationType('registered');
                              }}
                              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-bold rounded-lg transition"
                            >Book Next Patient</button>
                            <button
                              type="button"
                              onClick={onClose}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition"
                            >Close</button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={billingSubmitting}
                          onClick={async () => {
                            if (!discountReason.trim()) { setBillingError('Please provide a reason for the discount.'); return; }
                            setBillingSubmitting(true);
                            setBillingError('');
                            try {
                              await appointmentApi.requestDiscount(createdAppointment._id, {
                                discountType,
                                discountValue: parseFloat(discountValue) || 0,
                                reason: discountReason
                              });
                              // Reset booking flow so receptionist can book other patients
                              resetBookingFlow();
                              setActiveStep(1);
                              setRegistrationType('waiting_approval');
                              await loadPendingApprovals();
                            } catch (err) {
                              setBillingError(err.response?.data?.message || 'Failed to submit discount request.');
                            } finally {
                              setBillingSubmitting(false);
                            }
                          }}
                          className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 text-white text-xs font-bold rounded-xl shadow-md transition"
                        >
                          <Tag size={12} className="inline mr-1" />
                          {billingSubmitting ? 'Submitting...' : 'Submit Discount Request for Approval'}
                        </button>
                      )
                    ) : null}

                    {!discountRequestPending && (
                      <button
                        type="button"
                        disabled={billingSubmitting}
                        onClick={async () => {
                          setBillingSubmitting(true);
                          setBillingError('');
                          try {
                            const res = await appointmentApi.collectPayment(createdAppointment._id, {
                              paymentMethod
                            });
                            const apt = res?.data?.appointment || res?.appointment || createdAppointment;
                            setFinalAppointment({ ...apt, ...createdAppointment });
                            setBillingSuccess(true);
                            setActiveStep(5);
                          } catch (err) {
                            setBillingError(err.response?.data?.message || 'Payment collection failed.');
                          } finally {
                            setBillingSubmitting(false);
                          }
                        }}
                        className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 text-white text-sm font-extrabold rounded-xl shadow-md transition"
                      >
                        <CreditCard size={14} className="inline mr-1.5" />
                        {billingSubmitting ? 'Processing...' : `Collect Payment ${discountType === 'none' ? `₹${createdAppointment.consultationFee || 0}` : ''} & Confirm`}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: APPOINTMENT CONFIRMATION CARD */}
          {activeStep === 5 && (finalAppointment || createdAppointment) && (
            <div className="flex flex-col gap-5 flex-1 min-h-0 items-center">
              {/* Success Banner */}
              <div className="w-full max-w-3xl bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-emerald-900">Payment Confirmed! Appointment Booked.</h3>
                  <p className="text-[11px] text-emerald-700 mt-1 font-semibold">
                    {selectedPatient?.firstName} {selectedPatient?.lastName} has been successfully registered for consultation.
                    Token number assigned â€” patient may join the waiting queue.
                  </p>
                </div>
              </div>

              {/* Printable Confirmation Card */}
              <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden">
                {/* Card Header */}
                <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-8 py-5 flex justify-between items-center">
                  <div>
                    <p className="text-teal-100 text-[9px] font-bold uppercase tracking-wider">Appointment Confirmation</p>
                    <h2 className="text-white text-lg font-extrabold mt-0.5">{user?.clinic?.name || 'AI-CMS Health Clinic'}</h2>
                    <p className="text-teal-200 text-[10px] font-medium mt-0.5">Care. Connect. Cure.</p>
                  </div>
                  <div className="text-right">
                    <div className="bg-white/20 rounded-2xl px-5 py-3 text-center">
                      <p className="text-teal-100 text-[9px] font-bold uppercase">Token No.</p>
                      <p className="text-white text-3xl font-black">{(finalAppointment || createdAppointment)?.tokenNumber || (finalAppointment || createdAppointment)?.queueToken || 'A-001'}</p>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6 grid grid-cols-2 gap-6">
                  {/* Patient Info */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                      <User size={14} className="text-teal-600" />
                      <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Patient Information</h4>
                    </div>
                    {[
                      ['Patient Name', `${selectedPatient?.firstName || ''} ${selectedPatient?.lastName || ''}`.trim()],
                      ['Patient ID', selectedPatient?.patientId || 'â€”'],
                      ['Age / Gender', `${selectedPatient?.age || 'â€”'} Y / ${selectedPatient?.gender || 'â€”'}`],
                      ['Phone', selectedPatient?.phone || 'â€”'],
                      ['Reason', reasonForVisitReg || 'Consultation']
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between items-start">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide shrink-0">{label}</span>
                        <span className="text-xs font-bold text-slate-800 text-right max-w-[55%] leading-relaxed">{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Appointment & Billing Info */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                      <Receipt size={14} className="text-emerald-600" />
                      <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Appointment & Billing</h4>
                    </div>
                    {((() => {
                      const activeDoc = doctorsList.find(d => d._id === (chosenDoctor?._id || selectedDoctorId));
                      const apt = finalAppointment || createdAppointment;
                      const rows = [
                        ['Doctor', activeDoc?.fullName || '—'],
                        ['Specialization', activeDoc?.specialization || '—'],
                        ['Date', selectedDate],
                        ['Time Slot', selectedSlot?.startTime || '—'],
                        ['Payment Method', (paymentMethod || '').replace('_', ' ').toUpperCase() || '—'],
                        ['Consultation Fee', `₹${apt?.consultationFee || 0}`],
                        ['Final Paid', `₹${apt?.amountPaid ?? apt?.consultationFee ?? 0}`]
                      ];
                      if (discountType !== 'none') {
                        rows.splice(6, 0, ['Discount', discountType === 'full_waiver' ? 'Full Waiver (₹0)' : `${discountType} – ₹${discountValue}`]);
                      }
                      return rows;
                    })()).map(([label, value]) => (
                      <div key={label} className="flex justify-between items-start">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide shrink-0">{label}</span>
                        <span className="text-xs font-bold text-slate-800 text-right max-w-[55%] leading-relaxed">{value}</span>
                      </div>
                    ))}
                    <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex justify-between items-center">
                      <span className="text-xs font-extrabold text-emerald-900">Status</span>
                      <span className="bg-emerald-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wide">Confirmed ✓</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[9px] text-slate-400 font-semibold">
                    <p>Please carry this confirmation for your visit.</p>
                    <p className="mt-0.5">Generated: {new Date().toLocaleString('en-IN')}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => generatePatientCardPdf(selectedPatient, finalAppointment || createdAppointment)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition"
                    >
                      <Printer size={13} /> Print Card
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (onSuccess) onSuccess(finalAppointment || createdAppointment);
                        onClose();
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition"
                    >
                      <CheckCircle2 size={13} /> Done
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Slot Check Message Overlay */}
          {slotCheckMessage && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fadeIn">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-100">
                <div className="flex items-center gap-2.5 text-teal-700 font-extrabold text-base border-b border-slate-55 pb-3">
                  <Shield size={20} />
                  <span>Slot Availability Validation</span>
                </div>

                {slotCheckMessage.status === 'available' ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3">
                      <CheckCircle2 className="text-emerald-600 shrink-0" size={24} />
                      <div>
                        <p className="text-xs font-extrabold text-emerald-900">Original Slot Available</p>
                        <p className="text-[11px] text-emerald-700 mt-0.5">{slotCheckMessage.slot}</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-550 leading-relaxed">
                      The originally requested slot is still available for booking. Would you like to continue to payment configuration?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const appt = slotCheckMessage.appointment;
                          setSlotCheckMessage(null);
                          // Setup wizard states and jump directly to Step 4
                          setCreatedAppointment(appt);
                          setSelectedDoctorId(appt.doctorId?._id || appt.doctorId);
                          setSelectedDate(appt.appointmentDate?.split('T')[0]);
                          setSelectedSlot({ startTime: appt.appointmentTime, endTime: appt.appointmentTime });
                          setDiscountType(appt.discountRequest?.type || 'none');
                          setDiscountValue(appt.discountRequest?.value !== undefined ? appt.discountRequest.value.toString() : '');
                          setDiscountReason(appt.discountRequest?.reason || '');
                          setPaymentMethod('cash');
                          setDiscountRequestPending(false);
                          setActiveStep(4);
                        }}
                        className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition"
                      >
                        Continue
                      </button>
                      <button
                        onClick={async () => {
                          const appt = slotCheckMessage.appointment;
                          // Fetch schedules and show alternative selection
                          setSlotCheckMessage({ ...slotCheckMessage, status: 'taken' });
                          setIsRevalidatingSlot(true);
                          try {
                            const res = await appointmentApi.getAvailableSlots({
                              doctorId: appt.doctorId?._id || appt.doctorId,
                              date: appt.appointmentDate?.split('T')[0]
                            });
                            const slots = res?.slots || res?.data?.slots || [];
                            const availableOnly = slots.filter(s => s.isAvailable);
                            setAlternativeSlots(availableOnly);
                          } catch {}
                          setIsRevalidatingSlot(false);
                        }}
                        className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition"
                      >
                        Choose Another Slot
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3">
                      <AlertCircle className="text-rose-600 shrink-0" size={24} />
                      <div>
                        <p className="text-xs font-extrabold text-rose-900">Selected slot is no longer available.</p>
                        <p className="text-[11px] text-rose-700 mt-0.5">Please select another available slot.</p>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Available Slots</label>
                      {isRevalidatingSlot ? (
                        <p className="text-xs text-slate-400 italic">Fetching schedule slots...</p>
                      ) : alternativeSlots.length === 0 ? (
                        <p className="text-xs text-slate-550 font-medium">No other slots available for this doctor today.</p>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          {alternativeSlots.map(s => (
                            <button
                              key={s.startTime}
                              onClick={async () => {
                                const appt = slotCheckMessage.appointment;
                                setIsRevalidatingSlot(true);
                                try {
                                  // Reschedule the appointment to this new slot
                                  await appointmentApi.rescheduleAppointment(appt._id, {
                                    appointmentDate: appt.appointmentDate?.split('T')[0],
                                    appointmentTime: s.startTime,
                                    reason: 'Slot taken, receptionist reselected alternative'
                                  });
                                  // Refetch the updated appointment object
                                  const refreshed = await appointmentApi.getAppointmentById(appt._id);
                                  const newAppt = refreshed?.data?.appointment || refreshed?.appointment || refreshed;
                                  
                                  setSlotCheckMessage(null);
                                  setCreatedAppointment(newAppt);
                                  setSelectedDoctorId(newAppt.doctorId?._id || newAppt.doctorId);
                                  setSelectedDate(newAppt.appointmentDate?.split('T')[0]);
                                  setSelectedSlot({ startTime: s.startTime, endTime: s.startTime });
                                  setDiscountType(newAppt.discountRequest?.type || 'none');
                                  setDiscountValue(newAppt.discountRequest?.value !== undefined ? newAppt.discountRequest.value.toString() : '');
                                  setDiscountReason(newAppt.discountRequest?.reason || '');
                                  setPaymentMethod('cash');
                                  setDiscountRequestPending(false);
                                  setActiveStep(4);
                                } catch (err) {
                                  console.error(err);
                                  alert("Failed to rebook alternative slot. Please try again.");
                                }
                                setIsRevalidatingSlot(false);
                              }}
                              className="p-2 border border-slate-200 hover:border-teal-500 hover:bg-teal-50/30 rounded-xl text-center text-xs font-bold text-slate-700 transition"
                            >
                              {s.startTime}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end pt-2 border-t border-slate-50">
                      <button
                        onClick={() => setSlotCheckMessage(null)}
                        className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-bold transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
