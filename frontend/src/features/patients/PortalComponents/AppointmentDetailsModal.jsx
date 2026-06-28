import { useState } from 'react';
import {
  X, Calendar, Clock, MapPin, Copy, Star, CheckCircle2, Shield, Video,
  Building, CheckCircle, Info, ExternalLink, Share2, CalendarPlus, Heart, Users, ShieldAlert
} from 'lucide-react';

const CLINIC_FACILITIES = [
  { name: 'Digital Consultation', desc: 'Secure video consultations', icon: Video },
  { name: 'Pharmacy', desc: 'In-house medicine dispensing', icon: Shield },
  { name: 'Pathology Lab', desc: 'On-site diagnostic tests', icon: Heart },
  { name: 'Health Checkups', desc: 'Comprehensive preventative care', icon: Users },
  { name: '24x7 Emergency', desc: 'Round-the-clock emergency support', icon: ShieldAlert },
  { name: 'Expert Specialists', desc: 'Highly qualified doctors list', icon: CheckCircle2 },
  { name: 'Advanced Diagnostics', desc: 'State of the art medical scanners', icon: CheckCircle },
  { name: 'Cashless Insurance', desc: 'All major insurance provider tie-ups', icon: Shield },
  { name: 'Parking Available', desc: 'Spacious on-premise car parking', icon: Building },
  { name: 'Wheelchair Accessibility', desc: 'Specially abled friendly access paths', icon: CheckCircle2 }
];

function fmt12(time24) {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12 = ((h % 12) || 12);
  return `${String(h12).padStart(2,'0')}:${String(m).padStart(2,'0')} ${ampm}`;
}

export default function AppointmentDetailsModal({ appointment, onClose }) {
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState(appointment?.appointmentType === 'teleconsultation' ? 'online' : 'offline');

  const doctor = appointment?.doctorId;
  const clinic = appointment?.clinicId;
  const apptId = appointment?.appointmentId || `APT-${appointment?._id?.slice(-8).toUpperCase()}`;

  const handleCopyId = () => {
    navigator.clipboard.writeText(apptId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Appointment Journey data
  const isRescheduled = appointment?.status?.toLowerCase() === 'rescheduled';
  const isCancelled = appointment?.status?.toLowerCase() === 'cancelled';
  const isCompleted = appointment?.status?.toLowerCase() === 'completed';

  const steps = [
    {
      title: 'Appointment Scheduled',
      time: '20 Jun 2026, 09:30 AM',
      desc: 'Your appointment has been scheduled.',
      completed: true,
      active: true,
      color: 'bg-emerald-500'
    },
    ...(isRescheduled ? [
      {
        title: 'Rescheduled by You',
        time: '22 Jun 2026, 11:15 AM',
        desc: `Changed from 26 Jun 2026, 09:45 AM to 27 Jun 2026, 10:00 AM`,
        completed: true,
        active: true,
        color: 'bg-blue-500'
      }
    ] : []),
    ...(appointment?.cancellationReason ? [
      {
        title: isCancelled ? 'Cancelled by You' : 'Rescheduled by Doctor',
        time: '22 Jun 2026, 05:20 PM',
        desc: appointment.cancellationReason,
        completed: true,
        active: true,
        color: 'bg-purple-500'
      }
    ] : []),
    {
      title: isCompleted ? 'Appointment Completed' : 'Upcoming Appointment',
      time: appointment?.appointmentDate
        ? `${new Date(appointment.appointmentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}, ${fmt12(appointment?.startTime)}`
        : '27 Jun 2026, 10:00 AM',
      desc: isCompleted ? 'Consultation has been completed successfully.' : 'Consultation pending',
      completed: isCompleted,
      active: !isCompleted,
      color: isCompleted ? 'bg-indigo-500' : 'bg-slate-700'
    }
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)' }}
    >
      <div
        className="w-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-4 max-h-[92vh]"
        style={{ background: '#0c1524', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Header Section */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-white/[0.06] bg-slate-900/40">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6 w-full">
            {/* Doctor Info */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-aura-500/20 border border-aura-500/30 flex items-center justify-center text-xl font-bold text-aura-400 shrink-0">
                {(doctor?.fullName || 'D').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Consultation with</p>
                <h3 className="text-base font-extrabold text-white flex items-center gap-1.5 mt-0.5">
                  Dr. {doctor?.fullName || 'Alpha Doctor'}
                  <CheckCircle2 size={14} className="text-emerald-400" />
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{doctor?.specialization || 'General Physician'}</p>
                <p className="text-[10px] text-slate-500">{doctor?.qualifications?.join(', ') || 'MBBS, MD'}</p>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-6 sm:ml-auto pt-4 sm:pt-0 border-t sm:border-t-0 border-white/[0.06]">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Appointment ID</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-xs font-mono font-medium text-slate-300">{apptId}</span>
                  <button onClick={handleCopyId} className="text-slate-500 hover:text-white transition">
                    <Copy size={12} />
                  </button>
                  {copied && <span className="text-[9px] text-emerald-400 font-bold ml-1">Copied!</span>}
                </div>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Schedule Date &amp; Time</p>
                <p className="text-xs font-bold text-white mt-1">
                  {appointment?.appointmentDate
                    ? new Date(appointment.appointmentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '27 Jun 2026'}
                  , {appointment?.startTime ? fmt12(appointment.startTime) : '10:00 AM'}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Duration</p>
                <p className="text-xs font-bold text-slate-300 mt-1">{appointment?.durationMinutes || 15} - 20 mins</p>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition shrink-0 ml-4">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Modal Content Body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          
          {/* Inner Grid */}
          <div className="p-6 grid grid-cols-1 lg:grid-cols-[1.1fr_1.1fr_1fr] gap-6">

          {/* 1. Consultation Mode Panel */}
          <div className="rounded-xl border border-white/[0.06] bg-slate-900/20 p-5 flex flex-col">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Consultation Mode</h4>
            <div className="flex gap-2.5 mb-5">
              <button
                onClick={() => setMode('offline')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition ${mode === 'offline' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'border-white/[0.08] text-slate-400 hover:bg-white/5'}`}
              >
                <Building size={14} />
                Offline (In-Clinic)
              </button>
              <button
                onClick={() => setMode('online')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition ${mode === 'online' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'border-white/[0.08] text-slate-400 hover:bg-white/5'}`}
              >
                <Video size={14} />
                Online (Video Call)
              </button>
            </div>

            {mode === 'offline' ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                <div className="p-4 bg-white rounded-2xl inline-block shadow-lg">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${apptId}`}
                    alt="Check-in QR Code"
                    className="w-40 h-40"
                  />
                </div>
                <p className="text-xs text-slate-300 max-w-[240px] leading-relaxed">
                  Scan this QR code at clinic reception when you reach the clinic.
                </p>
                <div className="w-full grid grid-cols-2 gap-3 pt-3 border-t border-white/[0.06]">
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
                    <p className="text-[9px] uppercase tracking-wider text-slate-500">Token Number</p>
                    <p className="text-xs font-mono font-bold text-emerald-400 mt-1">TKN245</p>
                  </div>
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
                    <p className="text-[9px] uppercase tracking-wider text-slate-500">OTP Code</p>
                    <p className="text-xs font-mono font-bold text-emerald-400 mt-1">892341</p>
                  </div>
                </div>
                <div className="w-full flex items-start gap-2 rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 text-left">
                  <Info size={13} className="text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-blue-300 leading-relaxed">
                    Enter the OTP to start your consultation with the doctor.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-8">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                  <Video size={28} />
                </div>
                <h5 className="text-sm font-bold text-white">Online Video Consultation</h5>
                <p className="text-xs text-slate-400 max-w-[240px] leading-relaxed">
                  Your video consultation link will be activated 10 minutes prior to the scheduled appointment start time.
                </p>
                <button disabled className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-500 border border-white/[0.05] cursor-not-allowed">
                  Join Meeting Room
                </button>
              </div>
            )}
          </div>

          {/* 2. Journey Git-Tree Panel */}
          <div className="rounded-xl border border-white/[0.06] bg-slate-900/20 p-5 flex flex-col">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-5">Appointment Journey</h4>
            <div className="flex-1 space-y-6 relative pl-6">
              {/* Vertical line connecting nodes */}
              <div className="absolute left-[9px] top-1 bottom-1 w-0.5 bg-slate-800" />

              {steps.map((step, idx) => (
                <div key={idx} className="relative flex gap-4">
                  {/* Node icon / indicator */}
                  <div className={`absolute -left-[23px] w-[13px] h-[13px] rounded-full border-2 border-[#0c1524] ${step.color} shrink-0 mt-1`} />
                  
                  <div className="min-w-0">
                    <h5 className={`text-xs font-bold ${step.active ? 'text-emerald-400' : 'text-white'}`}>{step.title}</h5>
                    <p className="text-[9px] text-slate-500 font-semibold mt-0.5">{step.time}</p>
                    <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Clinic Overview Panel */}
          <div className="rounded-xl border border-white/[0.06] bg-slate-900/20 p-5 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">About Clinic</h4>
              <div className="w-full h-32 rounded-xl bg-slate-800/80 overflow-hidden relative mb-4 border border-white/[0.05]">
                <img
                  src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=400"
                  alt="Clinic Mockup"
                  className="w-full h-full object-cover opacity-60"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
                <div className="absolute bottom-3 left-4">
                  <p className="text-xs font-bold text-white">{clinic?.name || 'AI-CMS Health Clinic'}</p>
                  <p className="text-[10px] text-slate-350">{clinic?.address?.city || 'Gurugram'}</p>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-400 mb-4">
                <div className="flex items-start gap-1.5">
                  <MapPin size={13} className="text-slate-500 shrink-0 mt-0.5" />
                  <span>{clinic?.address?.line1 || 'Sector 48, Gurgaon, Haryana - 122018'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Star size={13} className="text-amber-400 fill-amber-400 shrink-0" />
                  <span className="font-bold text-slate-300">4.8</span>
                  <span className="text-[10px] text-slate-500">(1250+ Reviews)</span>
                  <button className="text-[10px] font-bold text-emerald-400 ml-auto flex items-center gap-0.5 hover:underline">
                    View on Map
                    <ExternalLink size={10} />
                  </button>
                </div>
              </div>

              <div className="border-t border-white/[0.06] pt-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Clinic Overview</p>
                <p className="text-[11px] text-slate-450 leading-relaxed">
                  AI-CMS Health Clinic is a multi-speciality healthcare center providing world-class medical services with modern facilities.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4 border-t border-white/[0.06] pt-4">
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-2.5 text-center">
                <p className="text-[9px] uppercase tracking-wider text-slate-500">Success Rate</p>
                <p className="text-sm font-extrabold text-white mt-0.5">96%</p>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-2.5 text-center">
                <p className="text-[9px] uppercase tracking-wider text-slate-500">Patients Treated</p>
                <p className="text-sm font-extrabold text-white mt-0.5">18K+</p>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-2.5 text-center">
                <p className="text-[9px] uppercase tracking-wider text-slate-500">Experience</p>
                <p className="text-sm font-extrabold text-white mt-0.5">10+ Years</p>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-2.5 text-center">
                <p className="text-[9px] uppercase tracking-wider text-slate-500">Doctors</p>
                <p className="text-sm font-extrabold text-white mt-0.5">25+</p>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews & Facilities Row */}
        <div className="px-6 pb-6 grid grid-cols-1 lg:grid-cols-[1.1fr_1.9fr] gap-6 border-t border-white/[0.06] pt-6 bg-slate-900/10">
          {/* Doctor Reviews */}
          <div className="rounded-xl border border-white/[0.06] bg-slate-900/20 p-5 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3.5">Doctor Review</h4>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={13} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <span className="text-xs font-bold text-white">5.0</span>
                <span className="text-[10px] text-slate-500 ml-auto">23 Jun 2026</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
                "Doctor is very friendly and explained everything clearly. The treatment is working well and I am feeling better."
              </p>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-3 border-t border-white/[0.06]">
              {['Wait Time', 'Explanation', 'Treatment', 'Staff Behavior'].map((label) => (
                <div key={label}>
                  <p className="text-[9px] font-semibold text-slate-500">{label}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={10} className="text-emerald-400 fill-emerald-400" />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Clinic Facilities Grid */}
          <div className="rounded-xl border border-white/[0.06] bg-slate-900/20 p-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Clinic Facilities</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CLINIC_FACILITIES.map((fac) => {
                const Icon = fac.icon;
                return (
                  <div key={fac.name} className="flex items-center gap-2.5 p-3 rounded-xl border border-white/[0.05] bg-white/[0.01]">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400">
                      <Icon size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{fac.name}</p>
                      <p className="text-[9px] text-slate-500 truncate mt-0.5">{fac.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-white/[0.06] bg-slate-900/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <Info size={14} className="text-slate-500 shrink-0" />
            <span>Please arrive 15 minutes before your appointment time.</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => alert('Event added to Calendar!')}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] transition flex items-center gap-1.5"
            >
              <CalendarPlus size={14} />
              Add to Calendar
            </button>
            <button
              onClick={() => alert('Appointment details shared!')}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/20 transition flex items-center gap-1.5"
            >
              <Share2 size={14} />
              Share Appointment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
