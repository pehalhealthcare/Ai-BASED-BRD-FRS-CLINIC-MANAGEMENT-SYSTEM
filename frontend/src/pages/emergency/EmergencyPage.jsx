import { useState, useMemo } from 'react';
import { 
  Search, ShieldAlert, Heart, Calendar, Clock, MapPin, CheckCircle, 
  ChevronRight, Plus, Trash2, Printer, Mail, Share2, AlertTriangle, 
  Activity, Sparkles, Building, UserPlus, Users, X, Info, PlusCircle, Check
} from 'lucide-react';
import LoadingState from '../../components/common/LoadingState';

export default function EmergencyPage() {
  // Stats counters
  const [stats, setStats] = useState({
    todayTotal: 18,
    admitted: 7,
    underTreatment: 6,
    discharged: 5,
    criticalAlerts: 2
  });

  // Form State
  const [patientType, setPatientType] = useState('new'); // new, existing
  const [patientForm, setPatientForm] = useState({
    fullName: 'Amit Singh',
    phone: '9876543210',
    age: '32',
    gender: 'Male',
    uhid: '',
    email: '',
    bloodGroup: 'O+',
    idType: 'Aadhaar Card',
    idNumber: '1234-5678-9012',
    address: 'Sector 45, Gurugram, Haryana',
    isVIP: false,
    modeOfArrival: 'Ambulance',
    broughtBy: 'Self / Relatives',
    arrivalTime: '2025-07-01T16:35',
    emergencyType: 'Cardiac', // General Emergency, Trauma/Accident, Cardiac, Stroke, Others
    chiefComplaint: 'Severe chest pain radiating to left arm, shortness of breath.',
    briefDescription: 'Patient experienced sudden pressure in chest area approximately 30 minutes ago at work. Brought by colleagues.',
    bp: '130/85',
    pulse: '88',
    temperature: '98.4',
    spo2: '94',
    respRate: '22',
    painScale: 8,
    remarks: 'Cold sweats observed. Administered preliminary oxygen in ambulance.',
    triageLevel: 'Level 1 - Critical', // Level 1 - Critical, Level 2 - High, Level 3 - Moderate, Level 4 - Low
    assignedDoctor: 'Dr. Ankit Verma',
    department: 'Cardiology',
    priority: 'Critical', // Routine, Urgent, Critical
    directTo: 'ICU', // Consultation, Admission, ICU, OT
    referralHospital: '',
    ambulanceRequired: 'No',
    notes: 'Please prepare the cardiac care unit team immediately. High priority.',
    allergies: 'No known allergies',
    knownConditions: 'No known conditions',
    currentMedications: 'No medications'
  });

  // Recent cases table data
  const [recentCases, setRecentCases] = useState([
    {
      id: 'ER250701-0018',
      name: 'Ramesh Kumar',
      age: 45,
      gender: 'Male',
      arrivalTime: '04:20 PM',
      triageLevel: 'Level 1 - Critical',
      department: 'Cardiology',
      assignedTo: 'Dr. Ankit Verma',
      status: 'Under Treatment'
    },
    {
      id: 'ER250701-0017',
      name: 'Rajesh Verma',
      age: 29,
      gender: 'Male',
      arrivalTime: '03:45 PM',
      triageLevel: 'Level 2 - High',
      department: 'Orthopedics',
      assignedTo: 'Dr. Mehta',
      status: 'Admitted'
    },
    {
      id: 'ER250701-0016',
      name: 'Sunita Devi',
      age: 52,
      gender: 'Female',
      arrivalTime: '02:10 PM',
      triageLevel: 'Level 1 - Critical',
      department: 'Neurology',
      assignedTo: 'Dr. Sharma',
      status: 'Under Treatment'
    }
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPatientForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSelectField = (name, val) => {
    setPatientForm(prev => ({
      ...prev,
      [name]: val
    }));
  };

  const handleRegisterCase = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      const newCaseId = 'ER250701-' + Math.floor(1000 + Math.random() * 9000);
      const newCase = {
        id: newCaseId,
        name: patientForm.fullName,
        age: parseInt(patientForm.age) || 30,
        gender: patientForm.gender,
        arrivalTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        triageLevel: patientForm.triageLevel,
        department: patientForm.department,
        assignedTo: patientForm.assignedDoctor,
        status: patientForm.directTo === 'ICU' || patientForm.directTo === 'OT' ? 'Under Treatment' : 'Admitted'
      };

      setRecentCases([newCase, ...recentCases]);
      setStats(prev => ({
        ...prev,
        todayTotal: prev.todayTotal + 1,
        criticalAlerts: patientForm.triageLevel.includes('Critical') ? prev.criticalAlerts + 1 : prev.criticalAlerts
      }));

      setSaveSuccess(true);
      setSubmitting(false);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    }, 800);
  };

  const handleReset = () => {
    setPatientForm({
      fullName: '',
      phone: '',
      age: '',
      gender: 'Select',
      uhid: '',
      email: '',
      bloodGroup: 'O+',
      idType: 'Aadhaar Card',
      idNumber: '',
      address: '',
      isVIP: false,
      modeOfArrival: 'Walk-in',
      broughtBy: '',
      arrivalTime: new Date().toISOString().slice(0, 16),
      emergencyType: 'General Emergency',
      chiefComplaint: '',
      briefDescription: '',
      bp: '',
      pulse: '',
      temperature: '',
      spo2: '',
      respRate: '',
      painScale: 0,
      remarks: '',
      triageLevel: 'Level 4 - Low',
      assignedDoctor: 'Dr. Neha Dhawan',
      department: 'General Medicine',
      priority: 'Routine',
      directTo: 'Consultation',
      referralHospital: '',
      ambulanceRequired: 'No',
      notes: '',
      allergies: 'No known allergies',
      knownConditions: 'No known conditions',
      currentMedications: 'No medications'
    });
  };

  return (
    <div className="flex flex-col gap-6 min-h-screen bg-[#080f1a] text-slate-100 p-6 rounded-3xl overflow-hidden border border-white/[0.05]">
      
      {/* 1. Header Navigation Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/[0.06] pb-5 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 animate-pulse">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-wide flex items-center gap-2">
              Emergency Case 
              <span className="bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-black tracking-widest px-2.5 py-0.5 rounded-full uppercase">
                EMERGENCY
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-medium">Rapid Patient Intake, Triage Classification, and Bed / Doctor Assignment</p>
          </div>
        </div>
        
        {/* Right header statistics */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search Patient by Name, Mobile, UHID..."
              className="bg-[#0c1322] border border-white/[0.08] rounded-xl py-2 pl-9 pr-4 text-xs text-slate-200 focus:outline-none focus:border-red-500 placeholder:text-slate-500 font-medium transition w-56"
            />
          </div>
          <div className="bg-[#0c1322] border border-white/[0.08] rounded-xl px-4 py-2 text-xs font-bold text-slate-350 flex items-center gap-1.5">
            <Clock size={13} className="text-[#0dd5b8]" />
            <span>01 Jul 2025 • 04:35 PM</span>
          </div>
          <div className="flex items-center gap-3 border-l border-white/[0.08] pl-4">
            <div className="w-8 h-8 rounded-full bg-[#ec4899] flex items-center justify-center font-bold text-xs text-white">R</div>
            <div className="text-left hidden lg:block">
              <p className="text-xs font-bold text-white leading-none">Riya Sharma</p>
              <p className="text-[10px] text-slate-500 font-semibold mt-1">Receptionist Desk</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Top Metric Tiles row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 shrink-0">
        <div className="bg-[#0c1322] border border-white/[0.05] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider">Today's Emergency</p>
            <p className="text-2xl font-black text-white mt-1.5">{stats.todayTotal}</p>
            <p className="text-[9px] text-slate-400 mt-1 font-semibold">Intake Cases</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
            <Activity size={18} />
          </div>
        </div>

        <div className="bg-[#0c1322] border border-white/[0.05] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider">Admitted</p>
            <p className="text-2xl font-black text-white mt-1.5">{stats.admitted}</p>
            <p className="text-[9px] text-slate-400 mt-1 font-semibold">Patients</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <Building size={18} />
          </div>
        </div>

        <div className="bg-[#0c1322] border border-white/[0.05] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider">Under Treatment</p>
            <p className="text-2xl font-black text-white mt-1.5">{stats.underTreatment}</p>
            <p className="text-[9px] text-slate-400 mt-1 font-semibold">Patients</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Users size={18} />
          </div>
        </div>

        <div className="bg-[#0c1322] border border-white/[0.05] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider">Discharged</p>
            <p className="text-2xl font-black text-white mt-1.5">{stats.discharged}</p>
            <p className="text-[9px] text-slate-400 mt-1 font-semibold">Today</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <CheckCircle size={18} />
          </div>
        </div>

        <div className="bg-[#b91c1c] border border-red-500/30 rounded-2xl p-4 flex items-center justify-between shadow-[0_0_15px_rgba(239,68,68,0.2)]">
          <div>
            <p className="text-[10px] text-red-200 uppercase font-black tracking-wider">CRITICAL ALERT</p>
            <p className="text-2xl font-black text-white mt-1.5">{stats.criticalAlerts}</p>
            <p className="text-[9px] text-red-200 mt-1 font-semibold">Patients Waiting</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center animate-pulse">
            <Heart size={18} />
          </div>
        </div>
      </div>

      {/* 3. Main Workspace Grid */}
      <form onSubmit={handleRegisterCase} className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_1fr_360px] gap-6 min-h-0">
        
        {/* COLUMN 1 - Patient Info & Vitals */}
        <div className="space-y-6 overflow-y-auto pr-2">
          
          {/* Card 1: Patient Information */}
          <div className="bg-[#0c1322] border border-white/[0.05] rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-white/[0.04] pb-3">
              <span className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-black">1</span>
              <h3 className="text-xs font-black uppercase text-slate-350 tracking-wider">Patient Information</h3>
            </div>

            <div className="flex gap-4 text-xs font-bold">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="radio"
                  checked={patientType === 'new'}
                  onChange={() => setPatientType('new')}
                  className="accent-red-500"
                />
                <span>New Patient</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-500 hover:text-white transition">
                <input
                  type="radio"
                  checked={patientType === 'existing'}
                  onChange={() => setPatientType('existing')}
                  className="accent-red-500"
                />
                <span>Existing Patient</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold">Patient Name *</label>
                <input
                  type="text"
                  name="fullName"
                  value={patientForm.fullName}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-[#080f1a] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none focus:border-red-500 font-bold"
                  placeholder="Enter full name"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold">Mobile Number *</label>
                <div className="flex gap-2">
                  <span className="bg-[#080f1a] border border-white/[0.08] rounded-xl p-3 text-slate-400 font-bold">+91</span>
                  <input
                    type="text"
                    name="phone"
                    value={patientForm.phone}
                    onChange={handleInputChange}
                    required
                    className="flex-1 bg-[#080f1a] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none focus:border-red-500 font-bold"
                    placeholder="Enter mobile number"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold">Age *</label>
                <input
                  type="number"
                  name="age"
                  value={patientForm.age}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-[#080f1a] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none focus:border-red-500 font-bold text-center"
                  placeholder="Age"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold">Gender *</label>
                <select
                  name="gender"
                  value={patientForm.gender}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-[#080f1a] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none focus:border-red-500 font-bold"
                >
                  <option value="Select">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold">UHID (If Known)</label>
                <input
                  type="text"
                  name="uhid"
                  value={patientForm.uhid}
                  onChange={handleInputChange}
                  className="w-full bg-[#080f1a] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none focus:border-red-500"
                  placeholder="Enter UHID"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold">Blood Group</label>
                <select
                  name="bloodGroup"
                  value={patientForm.bloodGroup}
                  onChange={handleInputChange}
                  className="w-full bg-[#080f1a] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none focus:border-red-500 font-bold"
                >
                  <option value="O+">O+</option>
                  <option value="A+">A+</option>
                  <option value="B+">B+</option>
                  <option value="AB+">AB+</option>
                  <option value="O-">O-</option>
                  <option value="A-">A-</option>
                  <option value="B-">B-</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="text-[10px] text-slate-400 font-bold">Complete Address</label>
              <textarea
                name="address"
                value={patientForm.address}
                onChange={handleInputChange}
                className="w-full h-16 bg-[#080f1a] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none focus:border-red-500 resize-none font-bold"
                placeholder="Enter complete address"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-yellow-500">
              <input
                type="checkbox"
                name="isVIP"
                checked={patientForm.isVIP}
                onChange={handleInputChange}
                className="accent-yellow-500"
              />
              <span>VIP Patient</span>
            </label>
          </div>

          {/* Card 2: Emergency Details */}
          <div className="bg-[#0c1322] border border-white/[0.05] rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-white/[0.04] pb-3">
              <span className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-black">2</span>
              <h3 className="text-xs font-black uppercase text-slate-350 tracking-wider">Emergency Intake Details</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold">Mode of Arrival *</label>
                <select
                  name="modeOfArrival"
                  value={patientForm.modeOfArrival}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-[#080f1a] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none focus:border-red-500 font-bold"
                >
                  <option value="Ambulance">Ambulance</option>
                  <option value="Walk-in">Walk-in</option>
                  <option value="Brought by relatives">Brought by relatives/friends</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold">Brought By</label>
                <input
                  type="text"
                  name="broughtBy"
                  value={patientForm.broughtBy}
                  onChange={handleInputChange}
                  className="w-full bg-[#080f1a] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none focus:border-red-500 font-bold"
                  placeholder="Name of helper or relative"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-slate-400 font-bold block">Emergency Type *</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {['General Emergency', 'Trauma / Accident', 'Cardiac', 'Stroke', 'Others'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleSelectField('emergencyType', type)}
                    className={`py-3 rounded-xl border text-[10px] font-black transition text-center uppercase tracking-wider ${patientForm.emergencyType === type ? 'bg-red-500/15 border-red-500/30 text-red-400' : 'bg-transparent border-white/[0.08] text-slate-450 hover:text-white'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold">Chief Complaint</label>
                <input
                  type="text"
                  name="chiefComplaint"
                  value={patientForm.chiefComplaint}
                  onChange={handleInputChange}
                  className="w-full bg-[#080f1a] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none focus:border-red-500 font-bold"
                  placeholder="Primary issue reported"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold">Brief Description</label>
                <textarea
                  name="briefDescription"
                  value={patientForm.briefDescription}
                  onChange={handleInputChange}
                  className="w-full h-16 bg-[#080f1a] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none focus:border-red-500 resize-none font-bold"
                  placeholder="Describe the incident"
                />
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN 2 - Vitals, Triage, and Uploads */}
        <div className="space-y-6 overflow-y-auto pr-2">
          
          {/* Card 3: Initial Assessment (At Reception) */}
          <div className="bg-[#0c1322] border border-white/[0.05] rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-white/[0.04] pb-3">
              <span className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-black">3</span>
              <h3 className="text-xs font-black uppercase text-slate-350 tracking-wider">Initial Assessment / Vitals</h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-[9px] text-slate-500 font-extrabold uppercase">BP (mmHg)</label>
                <input
                  type="text"
                  name="bp"
                  value={patientForm.bp}
                  onChange={handleInputChange}
                  className="w-full bg-[#080f1a] border border-white/[0.08] rounded-xl p-2.5 text-white focus:outline-none text-center font-bold"
                  placeholder="120/80"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-slate-500 font-extrabold uppercase">Pulse (bpm)</label>
                <input
                  type="text"
                  name="pulse"
                  value={patientForm.pulse}
                  onChange={handleInputChange}
                  className="w-full bg-[#080f1a] border border-white/[0.08] rounded-xl p-2.5 text-white focus:outline-none text-center font-bold"
                  placeholder="78"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-slate-500 font-extrabold uppercase">Temp (°C)</label>
                <input
                  type="text"
                  name="temperature"
                  value={patientForm.temperature}
                  onChange={handleInputChange}
                  className="w-full bg-[#080f1a] border border-white/[0.08] rounded-xl p-2.5 text-white focus:outline-none text-center font-bold"
                  placeholder="98.6"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-slate-500 font-extrabold uppercase">SpO2 (%)</label>
                <input
                  type="text"
                  name="spo2"
                  value={patientForm.spo2}
                  onChange={handleInputChange}
                  className="w-full bg-[#080f1a] border border-white/[0.08] rounded-xl p-2.5 text-white focus:outline-none text-center font-bold"
                  placeholder="98"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-slate-500 font-extrabold uppercase">Resp. Rate</label>
                <input
                  type="text"
                  name="respRate"
                  value={patientForm.respRate}
                  onChange={handleInputChange}
                  className="w-full bg-[#080f1a] border border-white/[0.08] rounded-xl p-2.5 text-white focus:outline-none text-center font-bold"
                  placeholder="20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-slate-400 font-bold block">Pain Scale (0-10)</label>
              <div className="flex items-center justify-between bg-[#080f1a] p-3 rounded-xl border border-white/[0.05]">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleSelectField('painScale', val)}
                    className={`w-7 h-7 rounded-full text-xs font-black transition flex items-center justify-center ${patientForm.painScale === val ? 'bg-red-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="text-[10px] text-slate-400 font-bold">Vitals Remarks</label>
              <textarea
                name="remarks"
                value={patientForm.remarks}
                onChange={handleInputChange}
                className="w-full h-16 bg-[#080f1a] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none focus:border-red-500 resize-none font-bold"
                placeholder="Additional vitals context..."
              />
            </div>
          </div>

          {/* Card 4: Triage & Assignment */}
          <div className="bg-[#0c1322] border border-white/[0.05] rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-white/[0.04] pb-3">
              <span className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-black">4</span>
              <h3 className="text-xs font-black uppercase text-slate-350 tracking-wider">Triage Classification &amp; Doctor Assignment</h3>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-slate-400 font-bold block">Triage Level *</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { name: 'Level 1 - Critical', bg: 'bg-[#ef4444] border-red-600 text-white' },
                  { name: 'Level 2 - High', bg: 'bg-amber-650 border-amber-700 text-white' },
                  { name: 'Level 3 - Moderate', bg: 'bg-yellow-500 border-yellow-600 text-slate-950' },
                  { name: 'Level 4 - Low', bg: 'bg-emerald-600 border-emerald-700 text-white' }
                ].map(level => (
                  <button
                    key={level.name}
                    type="button"
                    onClick={() => handleSelectField('triageLevel', level.name)}
                    className={`py-3 rounded-xl border text-[10px] font-black transition text-center uppercase tracking-wider ${patientForm.triageLevel === level.name ? level.bg : 'bg-transparent border-white/[0.08] text-slate-450 hover:text-white'}`}
                  >
                    {level.name.split(' - ')[1]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold">Assigned To Doctor *</label>
                <select
                  name="assignedDoctor"
                  value={patientForm.assignedDoctor}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-[#080f1a] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none focus:border-red-500 font-bold"
                >
                  <option value="Dr. Ankit Verma">Dr. Ankit Verma</option>
                  <option value="Dr. Mehta">Dr. Mehta</option>
                  <option value="Dr. Sharma">Dr. Sharma</option>
                  <option value="Dr. Neha Dhawan">Dr. Neha Dhawan</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold">Department *</label>
                <select
                  name="department"
                  value={patientForm.department}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-[#080f1a] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none focus:border-red-500 font-bold"
                >
                  <option value="Cardiology">Cardiology</option>
                  <option value="Orthopedics">Orthopedics</option>
                  <option value="Neurology">Neurology</option>
                  <option value="General Medicine">General Medicine</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold block">Priority</label>
                <div className="flex gap-2">
                  {['Routine', 'Urgent', 'Critical'].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleSelectField('priority', p)}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-black border transition ${patientForm.priority === p ? 'bg-red-500/15 border-red-500/30 text-red-400' : 'bg-transparent border-white/[0.08] text-slate-450'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold block">Direct To Ward</label>
                <div className="flex gap-2">
                  {['Consultation', 'ICU', 'OT'].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleSelectField('directTo', d)}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-black border transition ${patientForm.directTo === d ? 'bg-red-500/15 border-red-500/30 text-red-400' : 'bg-transparent border-white/[0.08] text-slate-450'}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN 3 - Sidebar Summary & Alerts */}
        <div className="space-y-6 overflow-y-auto">
          
          {/* Card 6: Patient Summary */}
          <div className="bg-[#0c1322] border border-white/[0.05] rounded-2xl p-5 flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Patient Summary</h3>
              <button type="button" className="text-xs text-[#0dd5b8] font-bold hover:underline">Edit</button>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 font-black text-lg">
                AS
              </div>
              <div className="text-left">
                <h4 className="font-black text-white text-sm">{patientForm.fullName || 'Amit Singh'}</h4>
                <p className="text-[10px] text-slate-500 mt-1 font-semibold">
                  {patientForm.age} Y / {patientForm.gender} • <span className="text-[#0dd5b8]">New Patient</span>
                </p>
              </div>
            </div>

            <div className="bg-white/[0.01] border border-white/[0.04] rounded-xl p-3.5 space-y-2.5 text-xs font-semibold text-slate-400">
              <div className="flex justify-between">
                <span>Mobile</span>
                <span className="text-white">+91 {patientForm.phone}</span>
              </div>
              <div className="flex justify-between">
                <span>Arrival Mode</span>
                <span className="text-white">{patientForm.modeOfArrival}</span>
              </div>
              <div className="flex justify-between">
                <span>Emergency Type</span>
                <span className="text-white">{patientForm.emergencyType}</span>
              </div>
              <div className="flex justify-between">
                <span>Triage Level</span>
                <span className="text-red-400 font-bold">{patientForm.triageLevel}</span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Quick Actions</p>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-black">
                <button type="button" className="py-2.5 rounded-xl border border-white/[0.08] hover:bg-white/[0.03] transition flex items-center justify-center gap-1 text-slate-350">
                  <Printer size={11} />
                  <span>Print Wrist Band</span>
                </button>
                <button type="button" className="py-2.5 rounded-xl border border-white/[0.08] hover:bg-white/[0.03] transition flex items-center justify-center gap-1 text-slate-350">
                  <Printer size={11} />
                  <span>Print Triage Slip</span>
                </button>
                <button type="button" className="py-2.5 rounded-xl border border-white/[0.08] hover:bg-white/[0.03] transition flex items-center justify-center gap-1 text-slate-350">
                  <PlusCircle size={11} />
                  <span>Add to Queue</span>
                </button>
                <button type="button" className="py-2.5 rounded-xl border border-white/[0.08] hover:bg-white/[0.03] transition flex items-center justify-center gap-1 text-slate-350">
                  <Users size={11} />
                  <span>Send to Doctor</span>
                </button>
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 rounded-xl bg-red-650 hover:bg-red-700 text-white font-black text-xs transition shadow-2xl flex items-center justify-center gap-2"
              >
                <CheckCircle size={15} />
                <span>{submitting ? 'Registering...' : 'Save & Register Case'}</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="w-full py-3 rounded-xl bg-transparent border border-white/[0.08] hover:bg-white/[0.04] text-red-400 font-black text-xs transition"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Card 7: Critical Patients Tracker */}
          <div className="bg-[#0c1322] border border-white/[0.05] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
              <h3 className="text-xs font-black uppercase text-red-400 tracking-wider">Critical Patients (2)</h3>
              <span className="text-[10px] text-red-500 font-extrabold animate-pulse">● LIVE</span>
            </div>

            <div className="space-y-3">
              <div className="bg-red-500/5 border border-red-500/10 p-3 rounded-xl text-xs flex justify-between items-center">
                <div>
                  <p className="font-extrabold text-white">Sunita Devi</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">ER250701-0015 • ICU</p>
                </div>
                <span className="text-[9px] font-black text-red-400 bg-red-500/10 px-2 py-0.5 rounded">Dr. Mehta</span>
              </div>

              <div className="bg-red-500/5 border border-red-500/10 p-3 rounded-xl text-xs flex justify-between items-center">
                <div>
                  <p className="font-extrabold text-white">Rajesh Verma</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">ER250701-0017 • OT</p>
                </div>
                <span className="text-[9px] font-black text-red-400 bg-red-500/10 px-2 py-0.5 rounded">Dr. Sharma</span>
              </div>
            </div>
          </div>

        </div>

      </form>

      {/* 4. Bottom Recent Emergency Cases Table */}
      <div className="bg-[#0c1322] border border-white/[0.05] rounded-2xl p-5 flex flex-col min-h-[220px] shrink-0">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-white">Recent Emergency Registry</h3>
          <button className="text-[11px] text-[#0dd5b8] hover:underline font-bold">View All Case List »</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] bg-[#080f1a]/30 text-slate-500 text-[9px] font-black uppercase tracking-[0.12em]">
                <th className="py-3 px-4">Case ID</th>
                <th className="py-3 px-4">Patient Name</th>
                <th className="py-3 px-4">Age / Gender</th>
                <th className="py-3 px-4">Arrival Time</th>
                <th className="py-3 px-4">Triage Level</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Assigned To</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] font-bold text-slate-350">
              {recentCases.map(c => (
                <tr key={c.id} className="hover:bg-white/[0.01] transition-all">
                  <td className="py-3.5 px-4 text-white font-mono text-[11px] font-extrabold">{c.id}</td>
                  <td className="py-3.5 px-4 text-white font-black">{c.name}</td>
                  <td className="py-3.5 px-4 text-slate-400">{c.age} Y / {c.gender}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-450">{c.arrivalTime}</td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase border ${c.triageLevel.includes('Critical') ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                      {c.triageLevel}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-400">{c.department}</td>
                  <td className="py-3.5 px-4 text-slate-350">{c.assignedTo}</td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase border ${c.status === 'Under Treatment' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button type="button" className="px-3.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-[10px] font-bold transition">
                      View details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}