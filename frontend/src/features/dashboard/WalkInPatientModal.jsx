import { useState, useEffect } from 'react';
import { X, Calendar, Upload, Camera, Shield, FileText, CheckCircle2, User, Plus, Search, Check, Bot, Clock } from 'lucide-react';
import { patientApi, doctorApi, appointmentApi, receptionistApi } from '../../lib/api';
import { aiApi } from '../../api/aiApi';

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Puducherry'
];

export default function WalkInPatientModal({ isOpen, onClose, onSuccess }) {
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
  const [activeStep, setActiveStep] = useState(1); // Step 1: Find Patient, Step 2: Booking Details, Step 3: Confirm & Book
  const [bookingMode, setBookingMode] = useState('ai'); // 'ai' or 'manual'

  // Appointment Slots Date & Time variables
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null); // { startTime, endTime }
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Load doctors list for assignment dropdown
  useEffect(() => {
    const loadDoctors = async () => {
      try {
        const res = await doctorApi.list({ limit: 100 });
        const list = res?.doctors || res?.data?.doctors || res?.data || res || [];
        setDoctorsList(list);
        if (list.length > 0) {
          setSelectedDoctorId(list[0]._id);
        }
      } catch (err) {
        console.error('Failed to load doctors list:', err);
      }
    };
    loadDoctors();
  }, []);

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

        // Auto-select first slot as the "next available slot"
        if (slots.length > 0) {
          setSelectedSlot(slots[0]);
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

    const patientName = `${patient.firstName} ${patient.lastName}`;
    const ageGender = `${patient.age || '32'} Y / ${patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : 'Male'}`;
    const patientIdStr = patient.patientId || `PAC-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`;
    const phoneStr = patient.phone || '+91 98765 43210';
    const emailStr = patient.email || 'patientemail@test.com';
    
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
      // Image 1 Style: Identity card for newly registered patient
      printWindow.document.write(`
        <html>
          <head>
            <title>Walk-In Patient Card - ${patientName}</title>
            <script src="https://cdn.tailwindcss.com"></script>
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
            <div class="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden relative" style="width: 800px; height: 500px;">
              
              <div class="px-8 pt-8 pb-4 flex justify-between items-start">
                <div>
                  <div class="flex items-end space-x-[1px] h-10 mb-1">
                    ${Array.from({ length: 45 }).map((_, i) =>
                      '<div class="bg-slate-800 h-full" style="width: ' + (i % 3 === 0 ? '3px' : i % 5 === 0 ? '1px' : '2px') + '"></div>'
                    ).join('')}
                  </div>
                  <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Patient ID</p>
                  <p class="text-base font-extrabold text-teal-700">${patientIdStr}</p>
                </div>

                <div class="flex items-center gap-3">
                  <div class="text-right">
                    <div class="flex items-center gap-2 justify-end">
                      <span class="text-lg font-extrabold text-teal-700 tracking-tight">AI-CMS</span>
                    </div>
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Health Clinic</p>
                    <p class="text-[9px] font-medium text-emerald-600 italic mt-0.5">Care. Connect. Cure.</p>
                  </div>
                </div>
              </div>

              <div class="px-8 pb-4 flex justify-between items-center">
                <div class="flex items-center gap-4">
                  <div class="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                  </div>
                  <div>
                    <h2 class="text-xl font-extrabold text-slate-800 tracking-tight leading-tight">${patientName}</h2>
                    <p class="text-xs font-bold text-slate-400 mt-1">${ageGender}</p>
                    <p class="text-[10px] text-slate-400 font-semibold mt-0.5">Patient Email: ${emailStr}</p>
                  </div>
                </div>

                <div class="bg-teal-755 text-white rounded-2xl px-6 py-4 flex items-center gap-3.5 max-w-[280px]" style="background-color: #0d9488;">
                  <div class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                    </svg>
                  </div>
                  <div>
                    <p class="text-[10px] font-extrabold tracking-wider uppercase">Walk-In Patient Card</p>
                    <p class="text-[9px] text-teal-100 font-medium mt-1 leading-relaxed">This card is used for walk-in appointments only.</p>
                  </div>
                </div>
              </div>

              <div class="border-t border-slate-100 mx-8"></div>

              <div class="px-8 py-5 grid grid-cols-2 gap-8">
                <div class="space-y-2.5 text-xs text-slate-700">
                  <div class="flex items-center gap-2">
                    <span class="font-extrabold text-slate-855">Emergency Contact:</span>
                    <span class="font-semibold text-slate-600">${emergencyContactStr}</span>
                  </div>
                  <div class="flex items-start gap-2">
                    <span class="font-extrabold text-slate-855 shrink-0">Address:</span>
                    <span class="font-semibold text-slate-600 leading-normal">${addressStr}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="font-extrabold text-slate-855">Blood Group:</span>
                    <span class="font-semibold text-slate-600">${bloodGroup}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="font-extrabold text-slate-855">Allergies:</span>
                    <span class="font-semibold text-slate-600">${allergies}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="font-extrabold text-slate-855">Medical Conditions:</span>
                    <span class="font-semibold text-slate-600">${medicalConditions}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="font-extrabold text-slate-855">Additional Notes:</span>
                    <span class="font-semibold text-slate-600">${notes}</span>
                  </div>
                </div>

                <div class="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-[10px] text-slate-500 leading-relaxed space-y-2 flex flex-col justify-center">
                  <div class="flex items-center gap-1 text-teal-700 font-extrabold uppercase tracking-wide">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>Important Notes</span>
                  </div>
                  <ul class="list-disc pl-3 space-y-1 font-medium">
                    <li>If lost, you can download this card from your Patient Dashboard.</li>
                    <li>Login using:<br/>
                      <strong>Email:</strong> ${emailStr}<br/>
                      <strong>Password:</strong> ${phoneStr}
                    </li>
                    <li>If you change your email or phone number, please update it in your profile.</li>
                    <li>This card is valid for walk-in appointments only. Please carry it with you when visiting the clinic.</li>
                  </ul>
                </div>
              </div>

              <div class="absolute bottom-0 left-0 right-0 bg-teal-805 px-8 py-3 flex justify-between items-center text-[10px] text-teal-100 font-semibold uppercase tracking-wider" style="background-color: #0d9488;">
                <span class="flex items-center gap-1.5">
                  Thank you for choosing AI-CMS Health Clinic.
                </span>
                <span>We are here to care for you.</span>
              </div>

            </div>

            <script>
              window.onload = function() {
                window.print();
              }
            </script>
          </body>
        </html>
      `);
    } else {
      // Image 2 Style: Full Walk-In Appointment Token Card
      // Appointment Details & Doctor Details
      const tokenNumber = appointment?.tokenNumber || appointment?.queueToken || `A-${String(Math.floor(Math.random() * 900) + 100).slice(-3)}`;
      const bookingDateStr = appointment?.appointmentDate
        ? new Date(appointment.appointmentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      const bookingTimeStr = appointment?.startTime || '10:00 AM';
      
      // Doctor detail resolution
      const activeDoc = bookingMode === 'ai' ? chosenDoctor : doctorsList.find(d => d._id === selectedDoctorId);
      const doctorName = activeDoc?.fullName || activeDoc?.userId?.name || 'Dr. Neha Dhawan';
      const doctorSpecialty = activeDoc?.specialization || activeDoc?.specialty || 'General Physician';
      const docExperience = activeDoc?.experience || '10+ Years';
      const docClinicLocation = activeDoc?.clinic?.name || 'AI-CMS Health Clinic, Gurugram';

      printWindow.document.write(`
        <html>
          <head>
            <title>Walk-In Appointment Card - ${patientName}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
            <style>
              body { font-family: 'Inter', sans-serif; }
              @media print {
                body { -webkit-print-color-adjust: exact; margin: 0; }
              }
            </style>
          </head>
          <body class="bg-gray-100 p-6 flex justify-center items-center min-h-screen">
            <div class="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden relative p-8 max-w-4xl w-full" style="min-height: 850px;">
              
              <!-- Header Grid -->
              <div class="flex justify-between items-start mb-6">
                <div>
                  <div class="flex items-center gap-2 mb-1">
                    <div class="p-1.5 bg-teal-600 text-white rounded-xl">
                      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 16v3c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2v-3m14 0V9a2 2 0 00-2-2h-3m-6 9V9a2 2 0 012-2h3m-6 0a2 2 0 00-2-2h3m-3 0a2 2 0 012-2h3"></path>
                      </svg>
                    </div>
                    <div>
                      <span class="text-xl font-extrabold text-teal-800 tracking-tight block">AI-CMS</span>
                      <span class="text-xs font-semibold text-slate-400">Health Clinic</span>
                    </div>
                  </div>
                  <p class="text-[10px] font-medium text-teal-600 italic">Care. Connect. Cure.</p>
                </div>

                <div class="flex flex-col items-center">
                  <span class="bg-teal-700 text-white text-[9px] font-bold tracking-wider px-3 py-1 rounded-full uppercase mb-2">Walk-In Appointment</span>
                  <div class="flex items-end space-x-[1px] h-8 mb-1">
                    ${Array.from({ length: 40 }).map((_, i) =>
                      '<div class="bg-slate-800 h-full" style="width: ' + (i % 3 === 0 ? '3px' : i % 5 === 0 ? '1px' : '2px') + '"></div>'
                    ).join('')}
                  </div>
                  <p class="text-[9px] font-bold text-slate-400 tracking-wider">Patient ID: <span class="text-teal-700 font-extrabold">${patientIdStr}</span></p>
                </div>

                <div class="text-right">
                  <span class="text-base font-extrabold text-slate-800 block">AI-CMS HEALTH CLINIC</span>
                  <span class="text-xs font-semibold text-slate-400 flex items-center justify-end gap-1">
                    <svg class="w-3.5 h-3.5 text-teal-655" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    Gurugram, Haryana
                  </span>
                </div>
              </div>

              <!-- Patient Info Header Block -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-center bg-slate-50/40 p-6 rounded-3xl border border-slate-100 mb-8">
                <div class="flex items-center gap-4">
                  <div class="w-16 h-16 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0">
                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                  </div>
                  <div>
                    <h2 class="text-2xl font-extrabold text-slate-800 tracking-tight leading-tight">${patientName}</h2>
                    <p class="text-xs font-bold text-slate-400 mt-1">${ageGender}</p>
                    <p class="text-xs font-semibold text-slate-600 mt-1">${emailStr}</p>
                    <p class="text-xs font-semibold text-slate-600">${phoneStr}</p>
                  </div>
                </div>

                <!-- Token block -->
                <div class="bg-teal-50/50 border border-teal-100/60 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                  <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Your Token / Serial Number</p>
                  <p class="text-4xl font-black text-teal-600 my-1">${tokenNumber}</p>
                  <p class="text-[10px] text-teal-850 font-bold leading-normal">Please wait for your turn.<br/><span class="text-slate-400 font-semibold">We will call your token number on the display.</span></p>
                </div>
              </div>

              <!-- Main grid containing Details columns -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <!-- Left Column: Personal info & ID proof -->
                <div class="space-y-3.5 text-xs text-slate-700 border-r border-slate-100 pr-4">
                  <div class="flex justify-between py-1.5 border-b border-slate-50">
                    <span class="font-extrabold text-slate-400 uppercase tracking-wider text-[10px]">Date of Birth</span>
                    <span class="font-bold text-slate-800">${new Date(patient.dateOfBirth).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div class="flex justify-between py-1.5 border-b border-slate-50">
                    <span class="font-extrabold text-slate-400 uppercase tracking-wider text-[10px]">Blood Group</span>
                    <span class="font-bold text-teal-600">${bloodGroup}</span>
                  </div>
                  <div class="flex justify-between py-1.5 border-b border-slate-50">
                    <span class="font-extrabold text-slate-400 uppercase tracking-wider text-[10px]">Gender</span>
                    <span class="font-bold text-slate-800 capitalize">${patient.gender}</span>
                  </div>
                  <div class="flex justify-between py-1.5 border-b border-slate-50">
                    <span class="font-extrabold text-slate-400 uppercase tracking-wider text-[10px]">Mobile Number</span>
                    <span class="font-bold text-slate-800">${phoneStr}</span>
                  </div>
                  <div class="flex justify-between py-1.5 border-b border-slate-50">
                    <span class="font-extrabold text-slate-400 uppercase tracking-wider text-[10px]">Address</span>
                    <span class="font-bold text-slate-800 text-right max-w-[65%] leading-relaxed">${addressStr}</span>
                  </div>
                  <div class="flex justify-between py-1.5 border-b border-slate-50">
                    <span class="font-extrabold text-slate-400 uppercase tracking-wider text-[10px]">Allergies</span>
                    <span class="font-bold text-rose-600">${allergies}</span>
                  </div>
                  <div class="flex justify-between py-1.5 border-b border-slate-50">
                    <span class="font-extrabold text-slate-400 uppercase tracking-wider text-[10px]">Medical Conditions</span>
                    <span class="font-bold text-slate-800">${medicalConditions}</span>
                  </div>
                  <div class="flex justify-between py-1.5 border-b border-slate-50">
                    <span class="font-extrabold text-slate-400 uppercase tracking-wider text-[10px]">ID Proof</span>
                    <span class="font-bold text-slate-800">Aadhaar Card - Verified</span>
                  </div>
                  <div class="flex justify-between py-1.5 border-b border-slate-50">
                    <span class="font-extrabold text-slate-400 uppercase tracking-wider text-[10px]">Registered On</span>
                    <span class="font-bold text-slate-800">${bookingDateStr}</span>
                  </div>
                </div>

                <!-- Right Column: Appointment Details & Doctor details -->
                <div class="space-y-4">
                  <div class="bg-teal-50/20 border border-teal-100/40 rounded-2xl p-4">
                    <h3 class="text-xs font-black text-teal-850 uppercase tracking-wider mb-3">Appointment Details</h3>
                    <div class="space-y-2 text-xs">
                      <div class="flex justify-between border-b border-slate-100/50 pb-1.5">
                        <span class="text-slate-400 font-bold text-[10px] uppercase">Appointment Type</span>
                        <span class="font-bold text-slate-800">Walk-In</span>
                      </div>
                      <div class="flex justify-between border-b border-slate-100/50 pb-1.5">
                        <span class="text-slate-400 font-bold text-[10px] uppercase">Booking Date & Time</span>
                        <span class="font-bold text-slate-800">${bookingDateStr} | ${bookingTimeStr}</span>
                      </div>
                      <div class="flex justify-between border-b border-slate-100/50 pb-1.5">
                        <span class="text-slate-400 font-bold text-[10px] uppercase">Consultation For</span>
                        <span class="font-bold text-slate-800">${finalReason}</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-slate-400 font-bold text-[10px] uppercase">Mode</span>
                        <span class="font-bold text-slate-800">Offline</span>
                      </div>
                    </div>
                  </div>

                  <div class="bg-slate-50/50 border border-slate-100 rounded-2xl p-4">
                    <h3 class="text-xs font-black text-slate-700 uppercase tracking-wider mb-3">Doctor Details</h3>
                    <div class="space-y-2 text-xs">
                      <div class="flex justify-between border-b border-slate-100/50 pb-1.5">
                        <span class="text-slate-400 font-bold text-[10px] uppercase">Doctor Name</span>
                        <span class="font-bold text-slate-800">${doctorName}</span>
                      </div>
                      <div class="flex justify-between border-b border-slate-100/50 pb-1.5">
                        <span class="text-slate-400 font-bold text-[10px] uppercase">Specialization</span>
                        <span class="font-bold text-teal-600">${doctorSpecialty}</span>
                      </div>
                      <div class="flex justify-between border-b border-slate-100/50 pb-1.5">
                        <span class="text-slate-400 font-bold text-[10px] uppercase">Experience</span>
                        <span class="font-bold text-slate-800">${docExperience}</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-slate-400 font-bold text-[10px] uppercase">Consultation Location</span>
                        <span class="font-bold text-slate-800 text-right max-w-[60%] leading-relaxed">${docClinicLocation}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Bottom block for Emergency contact & Notes -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch border-t border-slate-100 pt-6 mb-12">
                <div class="bg-rose-50/30 border border-rose-100/50 rounded-2xl p-4 flex flex-col justify-center">
                  <h4 class="text-xs font-bold text-rose-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <svg class="w-3.5 h-3.5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    Emergency Contact
                  </h4>
                  <div class="space-y-1 text-xs">
                    <p class="text-slate-800"><span class="text-slate-400 font-bold">Name:</span> ${patient.emergencyContact?.name || 'Suresh Sharma'}</p>
                    <p class="text-slate-800"><span class="text-slate-400 font-bold">Relation:</span> Father</p>
                    <p class="text-slate-800"><span class="text-slate-400 font-bold">Phone Number:</span> ${patient.emergencyContact?.phone || '+91 98765 67890'}</p>
                  </div>
                </div>

                <div class="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex justify-between items-center">
                  <div class="space-y-1.5 text-[10px] text-slate-500 leading-normal max-w-[70%]">
                    <p class="font-bold text-teal-700 uppercase tracking-wider">Important Notes</p>
                    <ul class="list-disc pl-3 space-y-0.5 font-medium">
                      <li>This is a walk-in appointment. Please stay present at the clinic.</li>
                      <li>Keep this card with you and show it at the reception.</li>
                      <li>You will be called as per the token number.</li>
                      <li>For any help, contact our reception desk.</li>
                    </ul>
                  </div>
                  
                  <!-- QR Code Box -->
                  <div class="border border-slate-200 bg-white p-2 rounded-xl flex flex-col items-center justify-center shrink-0">
                    <div class="w-16 h-16 bg-slate-100 flex items-center justify-center text-slate-400">
                      <svg class="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <rect x="2" y="2" width="6" height="6" stroke-width="2"/>
                        <rect x="16" y="2" width="6" height="6" stroke-width="2"/>
                        <rect x="2" y="16" width="6" height="6" stroke-width="2"/>
                        <rect x="9" y="9" width="6" height="6" stroke-width="1.5"/>
                        <path d="M9 2h3m0 0v3m4 4h2M2 12h2m10 4h2M16 22h4" stroke-width="2"/>
                      </svg>
                    </div>
                    <span class="text-[7px] text-slate-400 font-bold tracking-wider mt-1 uppercase">Scan to View</span>
                  </div>
                </div>
              </div>

              <!-- Footer absolute bottom block -->
              <div class="absolute bottom-0 left-0 right-0 bg-teal-800 px-8 py-3 flex justify-between items-center text-[10px] text-teal-100 font-semibold uppercase tracking-wider" style="background-color: #0d9488;">
                <span class="flex items-center gap-1.5">
                  💡 If lost, download this card from your Patient Dashboard.
                </span>
                <span>Thank you for choosing AI-CMS Health Clinic.</span>
              </div>

            </div>

            <script>
              window.onload = function() {
                window.print();
              }
            </script>
          </body>
        </html>
      `);
    }
    printWindow.document.close();
  };

  const handleSearchPatient = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setError('');
    setSelectedPatient(null);
    try {
      const res = await patientApi.list({ search: searchQuery });
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
    const finalReason = chatCollected.symptoms || reasonForVisitReg;

    if (!finalDoctorId) {
      setError('Please select a doctor.');
      return;
    }
    if (!finalReason.trim()) {
      setError('Reason for visit is required.');
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
        <div className="flex items-center justify-center gap-1.5 md:gap-8 px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              activeStep >= 1 ? 'bg-teal-600 text-white' : 'bg-slate-205 text-slate-500'
            }`}>1</span>
            <span className={`text-xs font-bold ${activeStep >= 1 ? 'text-slate-800' : 'text-slate-400'}`}>Find Patient</span>
          </div>
          <div className="w-12 md:w-24 h-0.5 bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              activeStep >= 2 ? 'bg-teal-600 text-white' : 'bg-slate-205 text-slate-500'
            }`}>2</span>
            <span className={`text-xs font-bold ${activeStep >= 2 ? 'text-slate-800' : 'text-slate-400'}`}>Booking Details</span>
          </div>
          <div className="w-12 md:w-24 h-0.5 bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              activeStep >= 3 ? 'bg-teal-600 text-white' : 'bg-slate-205 text-slate-500'
            }`}>3</span>
            <span className={`text-xs font-bold ${activeStep >= 3 ? 'text-slate-800' : 'text-slate-400'}`}>Confirm & Book</span>
          </div>
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
              {/* Toggle new vs registered */}
              <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit self-center shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setRegistrationType('registered');
                    setError('');
                  }}
                  className={`px-6 py-2 text-xs font-bold rounded-xl transition ${
                    registrationType === 'registered' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Search Registered Patient
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRegistrationType('new');
                    setError('');
                  }}
                  className={`px-6 py-2 text-xs font-bold rounded-xl transition ${
                    registrationType === 'new' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Register New Patient
                </button>
              </div>

              {registrationType === 'registered' ? (
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
                        className="px-6 py-2.5 bg-teal-555 hover:bg-teal-600 disabled:bg-slate-205 disabled:text-slate-400 text-white text-xs font-bold rounded-xl shadow-md transition"
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

          {/* STEP 2: BOOKING DETAILS */}
          {activeStep === 2 && selectedPatient && (
            <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr] flex-1 items-stretch">
              
              {/* Left Column: Choose Booking Mode */}
              <div className="bg-white border border-slate-150 rounded-3xl p-6 flex flex-col shadow-sm">
                <h3 className="text-sm font-bold text-slate-850 border-b border-slate-50 pb-2 mb-4">Booking Method</h3>
                
                {/* Method selector */}
                <div className="grid grid-cols-2 gap-4 mb-4 shrink-0">
                  <div
                    onClick={() => setBookingMode('ai')}
                    className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col gap-2 relative ${
                      bookingMode === 'ai' ? 'border-teal-500 bg-teal-50/20 shadow-sm' : 'border-slate-150 hover:border-slate-200 bg-slate-50/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="p-2 bg-teal-100 text-teal-700 rounded-xl">
                        <Bot size={18} />
                      </div>
                      {bookingMode === 'ai' && (
                        <div className="w-4 h-4 rounded-full bg-teal-555 text-white flex items-center justify-center">
                          <Check size={10} className="stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-855">AI Assistant (Recommended)</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-1">Let AI analyze symptoms and suggest doctors</p>
                    </div>
                  </div>

                  <div
                    onClick={() => setBookingMode('manual')}
                    className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col gap-2 relative ${
                      bookingMode === 'manual' ? 'border-teal-500 bg-teal-50/20 shadow-sm' : 'border-slate-150 hover:border-slate-200 bg-slate-50/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="p-2 bg-teal-100 text-teal-700 rounded-xl">
                        <Search size={18} />
                      </div>
                      {bookingMode === 'manual' && (
                        <div className="w-4 h-4 rounded-full bg-teal-555 text-white flex items-center justify-center">
                          <Check size={10} className="stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-855">Manual Search</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-1">Directly search and assign doctor manually</p>
                    </div>
                  </div>
                </div>

                {/* Mode UI Rendering */}
                {bookingMode === 'ai' ? (
                  <div className="flex-1 flex flex-col justify-between min-h-[300px]">
                    {/* Bot Conversational UI */}
                    <div className="flex-1 space-y-3 p-4 border border-slate-100 bg-slate-50/30 rounded-2xl overflow-y-auto max-h-[240px]">
                      {/* Welcome message */}
                      <div className="flex gap-2">
                        <div className="w-6 h-6 rounded-full bg-teal-555 text-white flex items-center justify-center text-[10px] font-bold shrink-0">AI</div>
                        <div className="bg-white border border-slate-155 rounded-2xl rounded-tl-none px-3 py-2 text-xs font-medium text-slate-800 max-w-[85%]">
                          Hello! I can help you triage symptoms and find the most suitable doctor for {selectedPatient.firstName}.
                        </div>
                      </div>

                      {/* Chat History */}
                      {chatHistory.map((msg, idx) => (
                        <div key={idx} className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                          {msg.sender !== 'user' && (
                            <div className="w-6 h-6 rounded-full bg-teal-555 text-white flex items-center justify-center text-[10px] font-bold shrink-0">AI</div>
                          )}
                          <div className={`rounded-2xl px-3 py-2 text-xs font-medium max-w-[85%] ${
                            msg.sender === 'user'
                              ? 'bg-teal-600 text-white rounded-tr-none'
                              : 'bg-white border border-slate-155 text-slate-800 rounded-tl-none'
                          }`}>
                            {msg.text}
                          </div>
                        </div>
                      ))}

                      {/* Context-based prompt */}
                      {chatFlowStep === 'symptoms' && (
                        <div className="flex gap-2">
                          <div className="w-6 h-6 rounded-full bg-teal-555 text-white flex items-center justify-center text-[10px] font-bold shrink-0">AI</div>
                          <div className="bg-teal-50 border border-teal-100/60 rounded-2xl rounded-tl-none px-3 py-2 text-xs font-bold text-teal-950 max-w-[85%]">
                            Please describe the patient's symptoms or clinical complaint.
                          </div>
                        </div>
                      )}

                      {chatFlowStep === 'extraConditions' && (
                        <div className="flex gap-2">
                          <div className="w-6 h-6 rounded-full bg-teal-555 text-white flex items-center justify-center text-[10px] font-bold shrink-0">AI</div>
                          <div className="bg-teal-55 border border-teal-100/60 rounded-2xl rounded-tl-none px-3 py-2 text-xs font-bold text-teal-955 max-w-[85%]">
                            {selectedPatient.chronicConditions && selectedPatient.chronicConditions.length > 0 ? (
                              <span>Chronic history lists: <strong>{selectedPatient.chronicConditions.join(', ')}</strong>. Any other active medical conditions?</span>
                            ) : (
                              <span>Does the patient have any active medical conditions? Type "None" if there are none.</span>
                            )}
                          </div>
                        </div>
                      )}

                      {chatFlowStep === 'result' && aiTriageResult && (
                        <div className="flex gap-2">
                          <div className="w-6 h-6 rounded-full bg-teal-555 text-white flex items-center justify-center text-[10px] font-bold shrink-0">AI</div>
                          <div className="bg-teal-55 border border-teal-100/60 rounded-2xl rounded-tl-none px-3 py-2 text-xs text-slate-855 max-w-[85%] space-y-1">
                            <p className="font-bold text-teal-950">AI Recommended Specialty: {aiTriageResult.recommendedSpecialization}</p>
                            <p className="text-[10px] leading-relaxed">{aiTriageResult.doctorNoteSummary}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Chat inputs */}
                    <div className="flex gap-2 mt-4 shrink-0">
                      <input
                        type="text"
                        placeholder={
                          chatFlowStep === 'symptoms'
                            ? "e.g. skin allergy, fever and cold..."
                            : chatFlowStep === 'extraConditions'
                            ? "e.g. Diabetes, None..."
                            : "AI triage analysis completed."
                        }
                        disabled={chatFlowStep === 'result' || submitting}
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSendBotMessage(); }}
                        className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 focus:outline-none transition"
                      />
                      {chatFlowStep !== 'result' ? (
                        <button
                          type="button"
                          disabled={!chatInput.trim() || submitting}
                          onClick={handleSendBotMessage}
                          className="px-4 py-2.5 bg-teal-550 hover:bg-teal-600 disabled:bg-teal-400 text-white text-xs font-bold rounded-xl transition"
                        >
                          Send
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setChatFlowStep('symptoms');
                            setChatHistory([]);
                            setAiTriageResult(null);
                            setSuggestedDoctors([]);
                            setChosenDoctor(null);
                          }}
                          className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-705 text-xs font-bold rounded-xl transition"
                        >
                          Reset AI
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col justify-between min-h-[300px]">
                    <div className="space-y-4">
                      {/* Doctor Select manual */}
                      <div className="flex flex-col gap-1.5 font-bold">
                        <label className="text-xs font-bold text-slate-700">Select Doctor *</label>
                        <select
                          value={selectedDoctorId}
                          onChange={(e) => setSelectedDoctorId(e.target.value)}
                          required
                          className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 focus:outline-none transition"
                        >
                          <option value="">-- Choose Doctor --</option>
                          {doctorsList.map((doc) => (
                            <option key={doc._id} value={doc._id}>
                              {doc.fullName || doc.userId?.name} ({doc.specialization || 'General'})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Reason for visit manual */}
                      <div className="flex flex-col gap-1.5 flex-1">
                        <label className="text-xs font-bold text-slate-700">Reason for Visit *</label>
                        <textarea
                          value={reasonForVisitReg}
                          onChange={(e) => setReasonForVisitReg(e.target.value)}
                          placeholder="Reason for visit / symptoms details"
                          required
                          rows={4}
                          className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 focus:outline-none transition resize-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: AI Triage / Doctor Recommendation Matches & Date/Slots Selector */}
              <div className="bg-white border border-slate-150 rounded-3xl p-6 flex flex-col justify-between shadow-sm">
                <div className="space-y-4 flex-1 overflow-y-auto">
                  <h3 className="text-sm font-bold text-slate-800 border-b border-slate-50 pb-2 mb-2">Doctor & Slots Selection</h3>
                  
                  {bookingMode === 'ai' ? (
                    <div className="space-y-4">
                      {chatFlowStep !== 'result' ? (
                        <div className="p-6 text-center text-slate-400 text-xs font-semibold border border-dashed border-slate-150 rounded-2xl">
                          <Bot size={28} className="mx-auto text-slate-300 mb-2" />
                          Complete the AI chat steps to fetch recommended specialists.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="p-3 bg-teal-50/50 border border-teal-100 rounded-2xl text-[11px] text-teal-900 leading-relaxed">
                            💡 AI suggested specialization: <strong>{aiTriageResult?.recommendedSpecialization || 'General Physician'}</strong>
                          </div>

                          <div className="space-y-2">
                            <p className="text-[10px] font-bold text-slate-400 tracking-wider">Suggested Doctor Options</p>
                            {suggestedDoctors.length === 0 ? (
                              <p className="text-xs text-slate-450 italic">No doctors of this specialty found.</p>
                            ) : (
                              <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                                {suggestedDoctors.map((doc) => {
                                  const isSelected = chosenDoctor?._id === doc._id;
                                  return (
                                    <div
                                      key={doc._id}
                                      onClick={() => setChosenDoctor(doc)}
                                      className={`p-2.5 rounded-xl border transition cursor-pointer flex justify-between items-center ${
                                        isSelected ? 'border-teal-500 bg-teal-50/20 font-bold' : 'border-slate-150 hover:border-slate-200 bg-slate-50/10'
                                      }`}
                                    >
                                      <div>
                                        <p className="text-xs font-bold text-slate-800">{doc.fullName || doc.userId?.name}</p>
                                        <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                                          {doc.specialization} &bull; {doc.clinic?.name || 'In-Clinic'}
                                        </p>
                                      </div>
                                      {isSelected && <CheckCircle2 size={14} className="text-teal-600 shrink-0" />}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                        <p className="text-xs font-bold text-slate-805">Selected Doctor</p>
                        {doctorsList.find(d => d._id === selectedDoctorId) ? (
                          <div className="mt-1.5 text-xs text-slate-600">
                            <p className="font-semibold text-slate-800">{doctorsList.find(d => d._id === selectedDoctorId)?.fullName || doctorsList.find(d => d._id === selectedDoctorId)?.userId?.name}</p>
                            <p className="text-[10px] mt-0.5">{doctorsList.find(d => d._id === selectedDoctorId)?.specialization || 'General Practitioner'}</p>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic mt-1">Select a doctor from the list on the left.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Slots Date & Slots Selection */}
                  {((bookingMode === 'ai' && chosenDoctor) || (bookingMode === 'manual' && selectedDoctorId)) && (
                    <div className="border-t border-slate-100 pt-4 space-y-3 shrink-0">
                      {/* Choose Date */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Appointment Date</label>
                        <div className="relative">
                          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                          <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 focus:outline-none transition"
                          />
                        </div>
                      </div>

                      {/* Slots Time list */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Available Slots for this day</span>
                        
                        {loadingSlots ? (
                          <div className="py-6 text-center text-xs text-slate-400 font-semibold animate-pulse">
                            Loading slots...
                          </div>
                        ) : availableSlots.length === 0 ? (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-850 font-semibold leading-relaxed">
                            No available slots found for the selected date. Please choose another date.
                          </div>
                        ) : (
                          <div>
                            <div className="p-2 bg-teal-50/50 rounded-xl text-[10px] text-teal-850 font-bold mb-2 flex items-center justify-between">
                              <span>Next Auto-Selected slot:</span>
                              <span className="bg-teal-500 text-white px-2 py-0.5 rounded-md text-[9px] font-extrabold">
                                {availableSlots[0].startTime}
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-1.5 max-h-[120px] overflow-y-auto pr-1">
                              {availableSlots.map((slot, index) => {
                                const isSelected = selectedSlot?.startTime === slot.startTime;
                                return (
                                  <button
                                    key={index}
                                    type="button"
                                    onClick={() => setSelectedSlot(slot)}
                                    className={`py-1.5 px-2 text-center text-[10px] font-bold rounded-xl border transition flex items-center justify-center gap-1 ${
                                      isSelected
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
                    </div>
                  )}
                </div>

                <div className="flex justify-between gap-3 pt-6 border-t border-slate-100 shrink-0 mt-4">
                  <button
                    type="button"
                    onClick={() => setActiveStep(1)}
                    className="px-5 py-2.5 border border-slate-205 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={
                      (bookingMode === 'ai' ? !chosenDoctor : !selectedDoctorId) || !selectedSlot
                    }
                    onClick={() => setActiveStep(3)}
                    className="px-6 py-2.5 bg-teal-550 hover:bg-teal-600 disabled:bg-slate-205 disabled:text-slate-400 text-white text-xs font-bold rounded-xl shadow-md transition"
                  >
                    Continue to Confirm
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: CONFIRM & BOOK */}
          {activeStep === 3 && selectedPatient && (
            <div className="max-w-xl mx-auto w-full bg-white border border-slate-150 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-50 pb-2 mb-4">Confirm Appointment Details</h3>
                
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50/50 rounded-2xl space-y-3.5 text-xs font-medium text-slate-700 border border-slate-100">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Patient</span>
                      <span className="text-slate-905 font-bold">{selectedPatient.firstName} {selectedPatient.lastName}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-100/60 pt-2.5">
                      <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Assigned Doctor</span>
                      <span className="text-slate-905 font-bold">
                        {bookingMode === 'ai' ? (chosenDoctor?.fullName || chosenDoctor?.userId?.name) : (doctorsList.find(d => d._id === selectedDoctorId)?.fullName || doctorsList.find(d => d._id === selectedDoctorId)?.userId?.name)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-100/60 pt-2.5">
                      <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Specialization</span>
                      <span className="text-teal-700 font-bold">
                        {bookingMode === 'ai' ? chosenDoctor?.specialization : (doctorsList.find(d => d._id === selectedDoctorId)?.specialization || 'General')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-100/60 pt-2.5">
                      <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Appointment Time</span>
                      <span className="text-slate-905 font-bold">
                        {selectedDate} | {selectedSlot?.startTime} - {selectedSlot?.endTime}
                      </span>
                    </div>
                    <div className="flex justify-between items-start border-t border-slate-100/60 pt-2.5">
                      <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] shrink-0">Reason for Visit</span>
                      <span className="text-slate-905 font-semibold text-right leading-relaxed max-w-[70%]">
                        {bookingMode === 'ai' ? chatCollected.symptoms : reasonForVisitReg}
                      </span>
                    </div>
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
                  disabled={submitting}
                  onClick={handleBookWalkInForRegistered}
                  className="px-6 py-2.5 bg-teal-555 hover:bg-teal-600 disabled:bg-teal-400 text-white text-xs font-bold rounded-xl shadow-md transition"
                >
                  {submitting ? 'Booking...' : 'Confirm & Register Check-In'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
