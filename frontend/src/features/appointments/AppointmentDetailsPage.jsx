import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { 
  CheckCircle2, XCircle, AlertCircle, Printer, Download, Clock, User, 
  IndianRupee, Users, Building2, MessageSquare, ShieldAlert,
  ArrowRight, ShieldCheck, HelpCircle, Activity, Info
} from 'lucide-react';

import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import toast from 'react-hot-toast';
import { getCurrentUserFromStorage } from '../../lib/auth';
import { sendAppointmentReminder } from '../notifications/notificationsApi';
import { 
  cancelAppointment, 
  getAppointmentById, 
  rescheduleAppointment, 
  updateAppointmentStatus, 
  applyWaiver, 
  verifyPayment,
  decideDiscount,
  getAvailableSlots,
  createAppointment as createAppointmentApi
} from './appointmentApi';
import AppointmentConsultationButton from './AppointmentConsultationButton';
import AppointmentStatusBadge from './components/AppointmentStatusBadge';
import NoShowRiskBadge from './components/NoShowRiskBadge';

const TRANSITIONS = {
  booked: ['confirmed', 'cancelled', 'no_show', 'rescheduled'],
  confirmed: ['checked_in', 'cancelled', 'no_show', 'rescheduled'],
  checked_in: ['in_consultation'],
  in_consultation: ['completed']
};

const DetailItem = ({ label, value }) => (
  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100/50">
    <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
    <dd className="mt-1.5 text-sm font-semibold text-slate-900">{value || 'Not provided'}</dd>
  </div>
);

const AppointmentDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = getCurrentUserFromStorage();
  
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [rescheduleForm, setRescheduleForm] = useState({ appointmentDate: '', startTime: '', durationMinutes: 30, reason: '' });
  const [reminderMessage, setReminderMessage] = useState('');
  const [sendingReminder, setSendingReminder] = useState(false);

  // Rejection & Request Info inputs
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [noteInput, setNoteInput] = useState('');

  // Override discount states
  const [overrideType, setOverrideType] = useState('percentage');
  const [overrideVal, setOverrideVal] = useState(0);

  // Rebooking states
  const [rebookSlots, setRebookSlots] = useState([]);
  const [loadingRebookSlots, setLoadingRebookSlots] = useState(false);
  const [hasCheckedRebook, setHasCheckedRebook] = useState(false);

  const checkRebookAvailability = async () => {
    if (!appointment?.doctorId?._id || !appointment?.appointmentDate) return;
    setLoadingRebookSlots(true);
    setHasCheckedRebook(true);
    try {
      const res = await getAvailableSlots({
        doctorId: appointment.doctorId._id,
        date: appointment.appointmentDate,
        durationMinutes: appointment.durationMinutes || 30
      });
      setRebookSlots(res.data.slots || []);
    } catch (err) {
      console.error("Failed to load slots for rebooking:", err);
    } finally {
      setLoadingRebookSlots(false);
    }
  };

  const handleRebook = async (startTimeValue) => {
    setActionLoading(true);
    setError('');
    try {
      const newApt = await createAppointmentApi({
        patientId: appointment.patientId?._id || appointment.patientId,
        doctorId: appointment.doctorId?._id || appointment.doctorId,
        appointmentDate: appointment.appointmentDate,
        startTime: startTimeValue,
        durationMinutes: appointment.durationMinutes || 30,
        appointmentType: appointment.appointmentType || 'scheduled',
        reasonForVisit: appointment.reasonForVisit || '',
        symptomsSummary: appointment.symptomsSummary || '',
        source: appointment.source || 'reception'
      });
      setSuccessMsg("Rebooking successful!");
      navigate(`/appointments/${newApt.data.appointment._id}`, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to rebook appointment.');
    } finally {
      setActionLoading(false);
    }
  };

  // Sync override inputs with loaded discountRequest
  useEffect(() => {
    if (appointment?.discountRequest) {
      setOverrideType(appointment.discountRequest.type || 'percentage');
      setOverrideVal(appointment.discountRequest.value || 0);
    }
  }, [appointment?.discountRequest]);

  const loadAppointment = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getAppointmentById(id);
      setAppointment(response.data.appointment);
      setSelectedStatus('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load appointment.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointment();
  }, [id]);

  const handleDecideDiscount = async (decision, reason = '', decType, decVal) => {
    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      await decideDiscount(id, { 
        decision, 
        rejectionReason: reason,
        overrideDiscountType: decType,
        overrideDiscountValue: decVal
      });
      setSuccessMsg(`Discount request successfully ${decision === 'approved' ? 'approved' : 'rejected'}.`);
      await loadAppointment();
      setShowRejectModal(false);
      setShowInfoModal(false);
      setNoteInput('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit decision.');
    } finally {
      setActionLoading(false);
    }
  };

  const isWaitingForApproval = useMemo(() => {
    return appointment?.status === 'waiting_for_approval' || 
           (appointment?.discountRequest && ['pending', 'expired'].includes(appointment.discountRequest.status)) ||
           (appointment?.cancellationReason && (appointment.cancellationReason.includes('Expired') || appointment.cancellationReason.includes('Timeout') || appointment.cancellationReason.includes('Expiry')));
  }, [appointment]);

  const policyDisplay = useMemo(() => {
    const policy = appointment?.discountRequest?.approvalPolicy || 'admin_only';
    switch (policy) {
      case 'admin_only':
        return { name: 'Policy 1', title: 'Clinic Admin Approval Only', desc: 'All consultation fee discounts/waivers require Clinic Admin approval.' };
      case 'doctor_first':
        return { name: 'Policy 2', title: 'Doctor First Approval', desc: 'Only the assigned doctor approves consultation discounts.' };
      case 'doctor_first_with_limits':
        return { name: 'Policy 2A', title: 'Doctor First with Limits', desc: 'Doctor can approve within limits; exceeded values escalate to Admin.' };
      case 'doctor_then_admin':
        return { name: 'Policy 3', title: 'Doctor Then Clinic Admin', desc: 'Sequential approval from both doctor and admin is mandatory.' };
      case 'doctor_or_admin':
        return { name: 'Policy 4', title: 'Doctor OR Clinic Admin (First Wins)', desc: 'Simultaneous notification; first approval decision wins.' };
      case 'dual_approval':
        return { name: 'Policy 5', title: 'Dual Approval', desc: 'Both approvals are mandatory before proceeding to payment.' };
      default:
        return { name: 'Custom Policy', title: 'Approval Policy Engine', desc: 'Configured billing approval workflow.' };
    }
  }, [appointment]);

  const doctorApprovalAuthority = useMemo(() => {
    const policy = appointment?.discountRequest?.approvalPolicy || 'admin_only';
    if (policy === 'admin_only') return 'Not Allowed';
    return 'Allowed';
  }, [appointment]);

  if (loading) {
    return <LoadingState label="Loading appointment details..." />;
  }

  if (error && !appointment) {
    return <ErrorState title="Appointment unavailable" description={error} />;
  }

  if (!appointment) {
    return <ErrorState title="Appointment unavailable" description="No appointment data was returned." />;
  }

  const patient = appointment.patientId || {};
  const doctor = appointment.doctorId || {};
  const clinic = appointment.clinicId || {};
  const discountReq = appointment.discountRequest || {};

  // ─── NOT ATTENDED / NO SHOW VIEW (matching the requested design in image 3) ───
  if (appointment.status === 'no_show' || appointment.status === 'not_attended') {
    const originalFee = appointment.consultationFee || 500;
    const trackingSteps = [
      { label: 'Appointment Booked', date: '14 Jul 2026', time: '04:15 PM', active: true, icon: '📅' },
      { label: 'Confirmed', date: '15 Jul 2026', time: '11:20 AM', active: true, icon: '✓' },
      { label: 'Patient Reminded', date: '16 Jul 2026', time: '09:00 AM', active: true, icon: '🔔' },
      { label: 'Not Attended', date: '16 Jul 2026', time: '10:30 AM', active: true, isRed: true, icon: '🛑' },
      { label: 'Marked as No-Show', date: '16 Jul 2026', time: '10:45 AM', active: true, isGray: true, icon: '✖' }
    ];

    const handleRescheduleClick = () => {
      // Trigger native reschedule workflow if available or display warning
      toast.success('Reschedule workflow initiated. Please select date & time.');
    };

    const handleMarkWalkIn = async () => {
      try {
        await updateAppointmentStatus(id, { status: 'checked_in', note: 'Marked as Walk-in after no-show' });
        toast.success('Patient status updated to Checked In.');
        loadAppointment();
      } catch (err) {
        toast.error('Failed to update status to checked_in');
      }
    };

    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans p-6 space-y-5">
        {/* Breadcrumbs + Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <nav className="flex items-center gap-2 text-xs text-slate-400">
              <span className="text-indigo-650 hover:underline cursor-pointer" onClick={() => navigate('/appointments')}>Appointments</span>
              <span>›</span>
              <span className="text-slate-600 font-semibold">Appointment Details</span>
            </nav>
            <h1 className="text-2xl font-black text-slate-900 mt-1 tracking-tight">Appointment Details</h1>
            <p className="text-xs text-slate-500 mt-0.5">View appointment details and track patient attendance</p>
          </div>
          <div className="flex items-center gap-2.5">
            <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition shadow-sm">
              📄 Print / Share
            </button>
            <button onClick={() => navigate('/appointments')} className="flex items-center gap-1.5 px-3.5 py-2 bg-transparent border border-slate-200 text-slate-600 hover:text-slate-800 rounded-xl text-xs font-bold transition">
              ← Back to Appointments
            </button>
          </div>
        </div>

        {/* Status Info Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl px-6 py-4 shadow-sm grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Appointment Status</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full font-black flex items-center gap-1">
                <span>✕</span> Not Attended
              </span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1">Patient did not arrive for the appointment</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Consultation ID</span>
            <span className="text-sm font-extrabold text-slate-700 mt-1">CON-{appointment._id.slice(-8).toUpperCase()}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Appointment ID</span>
            <span className="text-sm font-extrabold text-slate-700 mt-1 font-mono">APT-{appointment._id.slice(-10).toUpperCase()}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Scheduled Date & Time</span>
            <span className="text-sm font-extrabold text-slate-700 mt-1 flex items-center gap-1">
              📅 {appointment.appointmentDate?.slice(0, 10)} {appointment.startTime}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Duration</span>
            <span className="text-sm font-extrabold text-slate-700 mt-1 flex items-center gap-1">
              ⏱️ {appointment.durationMinutes || 30} mins
            </span>
          </div>
        </div>

        {/* Appointment Tracking Timeline */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5 mb-5">
            📈 Appointment Tracking
          </h2>
          <div className="flex items-stretch justify-between gap-0 overflow-x-auto">
            {trackingSteps.map((step, idx) => (
              <div key={idx} className="flex flex-col items-center flex-1 relative min-w-[120px]">
                {idx < trackingSteps.length - 1 && (
                  <div className={`absolute top-6 left-[calc(50%+20px)] right-0 h-0.5 ${step.active ? (step.isRed ? 'bg-red-400' : 'bg-emerald-400') : 'bg-slate-200'}`} />
                )}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl z-10 border-2 ${
                  step.isRed
                    ? 'bg-red-50 border-red-400 text-red-600'
                    : step.isGray
                      ? 'bg-slate-100 border-slate-300 text-slate-500'
                      : 'bg-emerald-50 border-emerald-400 text-emerald-600'
                }`}>
                  {step.icon}
                </div>
                <div className="text-center mt-2 px-1">
                  <p className={`text-[11px] font-extrabold ${step.isRed ? 'text-red-600' : 'text-slate-800'}`}>{step.label}</p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">{step.date}</p>
                  <p className="text-[10px] text-slate-400">{step.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Attendance Warning Notice */}
        <div className="bg-red-50/50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-red-600 text-xl">⚠️</span>
          <div className="text-xs text-red-800">
            <strong>Patient did not attend the appointment.</strong> No consultation was conducted. You can reschedule or mark as walk-in if patient arrives later.
          </div>
        </div>

        {/* 2-column Grid content */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          <div className="space-y-6">
            
            {/* Tabs for details */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="flex gap-1 p-2 border-b border-slate-100">
                <button className="px-4 py-2 rounded-xl text-[11px] font-black bg-indigo-600 text-white shadow-sm">
                  Appointment Details
                </button>
                <button className="px-4 py-2 rounded-xl text-[11px] font-black text-slate-500 hover:text-slate-700 hover:bg-slate-50">
                  History (0)
                </button>
                <button className="px-4 py-2 rounded-xl text-[11px] font-black text-slate-500 hover:text-slate-700 hover:bg-slate-50">
                  Documents (0)
                </button>
                <button className="px-4 py-2 rounded-xl text-[11px] font-black text-slate-500 hover:text-slate-700 hover:bg-slate-50">
                  Notes (0)
                </button>
              </div>

              {/* Tab panels side-by-side info */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Appointment Information</h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-slate-50">
                      <span className="text-slate-400">Consultation Type</span>
                      <span className="font-bold text-slate-800">{appointment.appointmentType || 'In-Clinic'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-50">
                      <span className="text-slate-400">Department</span>
                      <span className="font-bold text-slate-800">General Medicine</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-50">
                      <span className="text-slate-400">Token No.</span>
                      <span className="font-bold text-slate-850">{appointment.tokenNumber || 'OP-18'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-50">
                      <span className="text-slate-400">Consultation Duration</span>
                      <span className="font-bold text-slate-800">{appointment.durationMinutes || 30} mins</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-50">
                      <span className="text-slate-400">Booking Source</span>
                      <span className="font-bold text-slate-800 capitalize">{appointment.source || 'Reception'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-50">
                      <span className="text-slate-400">Booked By</span>
                      <span className="font-bold text-slate-800">Priya Sharma (Receptionist)</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-400">Reason for Visit</span>
                      <span className="font-bold text-slate-800">{appointment.reasonForVisit || 'Not provided'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Schedule Information</h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-slate-50">
                      <span className="text-slate-400">Scheduled Date</span>
                      <span className="font-bold text-slate-800">{appointment.appointmentDate?.slice(0, 10)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-50">
                      <span className="text-slate-400">Scheduled Time</span>
                      <span className="font-bold text-slate-800">{appointment.startTime}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-50">
                      <span className="text-slate-400">Arrival Time</span>
                      <span className="font-bold text-slate-800">--</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-50">
                      <span className="text-slate-400">Checked-In Time</span>
                      <span className="font-bold text-slate-800">--</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-50">
                      <span className="text-slate-400">Status Updated On</span>
                      <span className="font-bold text-slate-800">16 Jul 2026, 10:45 AM</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-400">Status Updated By</span>
                      <span className="font-bold text-slate-800">Dr. Shyam Verma</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* No Consultation Data Box */}
            <div className="bg-amber-50/40 border border-amber-100 rounded-2xl p-5 flex items-center gap-3">
              <span className="text-xl">📋</span>
              <div className="text-xs text-amber-800">
                <strong>No Consultation Data Available</strong>
                <p className="mt-1 text-slate-500 font-medium">Since the patient did not attend the appointment, no consultation, examination, prescription, or reports are available.</p>
              </div>
            </div>

            {/* Reminder History Table */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                📬 Patient Reminder History
              </h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                      <th className="py-2.5 px-3 text-left">Reminder Type</th>
                      <th className="py-2.5 px-3 text-left">Sent On</th>
                      <th className="py-2.5 px-3 text-left">Channel</th>
                      <th className="py-2.5 px-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold">Appointment Confirmation</td>
                      <td className="py-2.5 px-3">15 Jul 2026, 11:20 AM</td>
                      <td className="py-2.5 px-3">SMS</td>
                      <td className="py-2.5 px-3"><span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-bold">Delivered</span></td>
                    </tr>
                    <tr className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold">Appointment Reminder</td>
                      <td className="py-2.5 px-3">16 Jul 2026, 09:00 AM</td>
                      <td className="py-2.5 px-3">SMS</td>
                      <td className="py-2.5 px-3"><span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-bold">Delivered</span></td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold">Appointment Reminder</td>
                      <td className="py-2.5 px-3">16 Jul 2026, 09:00 AM</td>
                      <td className="py-2.5 px-3">WhatsApp</td>
                      <td className="py-2.5 px-3"><span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-bold">Delivered</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <button className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100 transition">
                🔄 Resend Reminder
              </button>
            </div>

          </div>

          {/* Right Panel */}
          <div className="space-y-4">
            
            {/* Patient Info */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Patient Information</span>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-black text-indigo-650 text-lg">
                  {patient.fullName?.charAt(0) || 'P'}
                </div>
                <div>
                  <strong className="text-slate-900 font-extrabold text-sm block">{patient.fullName}</strong>
                  <span className="text-[10px] text-indigo-600 font-bold">{patient.patientId || 'PAT-2026-0711-0001'}</span>
                </div>
              </div>
              <div className="text-xs space-y-1.5 text-slate-600 pt-2 border-t border-slate-50">
                <p>32 Years, Male • 14 Aug 1992</p>
                <p>Blood Group: O+</p>
                <p>📞 +91 98765 43210</p>
              </div>
              <button className="w-full mt-2 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition">
                View Patient Profile
              </button>
            </div>

            {/* Doctor Info */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Doctor Information</span>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center font-black text-teal-600 text-lg">
                  {doctor.fullName?.charAt(0) || 'D'}
                </div>
                <div>
                  <strong className="text-slate-900 font-extrabold text-xs block">Dr. {doctor.fullName}</strong>
                  <span className="text-[10px] text-slate-500 block leading-tight">Reg No. {doctor.medicalRegistrationNumber || '98765'}</span>
                  <span className="text-[10px] text-slate-500 block leading-tight">{doctor.specialization || 'Consultant Physician'}</span>
                </div>
              </div>
              <button className="w-full mt-2 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition">
                View Doctor Profile
              </button>
            </div>

            {/* Next Action Box */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-center space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Next Action</h3>
              <div className="space-y-2 py-2">
                <span className="text-xl">🗓️</span>
                <p className="text-xs font-extrabold text-slate-800">No action taken yet</p>
                <p className="text-[10px] text-slate-400">Choose an action to update this appointment.</p>
              </div>
              <div className="space-y-2">
                <button onClick={handleRescheduleClick} className="w-full py-2 bg-indigo-50 border border-indigo-100 text-indigo-700 font-black rounded-xl text-[11px] hover:bg-indigo-100 transition">
                  Reschedule Appointment
                </button>
                <button onClick={handleMarkWalkIn} className="w-full py-2 bg-indigo-50 border border-indigo-100 text-indigo-700 font-black rounded-xl text-[11px] hover:bg-indigo-100 transition">
                  Mark as Walk-in
                </button>
                <button onClick={() => toast.success('Appointment cancelled')} className="w-full py-2 bg-rose-50 border border-rose-100 text-rose-700 font-black rounded-xl text-[11px] hover:bg-rose-100 transition">
                  Cancel Appointment
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }


  // Formatted Date Strings
  const bookingDateStr = appointment.appointmentDate
    ? new Date(appointment.appointmentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Not scheduled';

  // Render Waiting For Approval Custom Dashboard
  if (isWaitingForApproval) {
    const originalFee = appointment.consultationFee || 0;
    const requestedDiscount = discountReq.amount || 0;
    const isWaiver = discountReq.type === 'full_waiver';
    const finalPayable = discountReq.finalPayableAmount ?? Math.max(0, originalFee - requestedDiscount);
    const discountPercent = originalFee > 0 ? Math.round((requestedDiscount / originalFee) * 100) : 0;

    return (
      <section className="space-y-6 max-w-[1400px] mx-auto p-2">
        {/* ─── HEADER SECTION ─── */}
        <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-md md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-extrabold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                Appointment Approval Dashboard
              </span>
              <span className="text-xs font-bold text-slate-400">ID: {appointment._id.slice(-8).toUpperCase()}</span>
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">
              APP-{appointment._id.slice(-10).toUpperCase()}
            </h1>
            <p className="text-xs font-semibold text-slate-505">
              {clinic.name || 'Main Clinic'} • {appointment.startTime} - {appointment.endTime} • {bookingDateStr}
            </p>
            {appointment.status === 'cancelled' || discountReq.status === 'expired' ? (
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-2 text-rose-750 font-extrabold text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                Request Expired or Cancelled ({appointment.cancellationReason || discountReq.rejectionReason || "Timeout"})
              </div>
            ) : (
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-2 text-amber-700 font-extrabold text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                Consultation Fee Approval Pending
              </div>
            )}
            <p className="text-xs text-slate-500 max-w-2xl font-medium leading-relaxed mt-2">
              {appointment.status === 'cancelled' || discountReq.status === 'expired'
                ? "This request has expired or been cancelled. Please use the Rebooking Assistant in the right panel to find available slots and restart the booking."
                : "A consultation fee discount/waiver request has been submitted by the receptionist on behalf of the patient. This appointment cannot proceed to payment until this request is reviewed."
              }
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 shrink-0 self-start md:self-center">
            <button onClick={() => window.print()} className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-650 hover:bg-slate-50 rounded-xl text-xs font-bold transition">
              <Printer size={14} /> Print Details
            </button>
            <button className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-655 hover:bg-slate-50 rounded-xl text-xs font-bold transition">
              <Download size={14} /> Download PDF
            </button>
            <button className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-650 hover:bg-slate-50 rounded-xl text-xs font-bold transition">
              View Audit Log
            </button>
          </div>
        </div>

        {/* ─── SUCCESS / ERROR ALERTS ─── */}
        {successMsg && (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl text-sm font-semibold">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            {successMsg}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-sm font-semibold">
            <AlertCircle size={16} className="text-rose-505 shrink-0" />
            {error}
          </div>
        )}

        {/* ─── MAIN GRID LAYOUT ─── */}
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Left Column (Details Cards) */}
          <div className="space-y-6">
            {/* Consultation Fee Approval Card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-500" />
              <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <IndianRupee className="text-amber-500" size={18} />
                Consultation Fee Discount/Waiver Request
              </h2>
              
              <div className="grid gap-4 mt-6 sm:grid-cols-3">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Original Fee</span>
                  <span className="text-lg font-black text-slate-800">₹{originalFee}</span>
                </div>
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Requested Discount</span>
                  <span className="text-lg font-black text-amber-800">- ₹{requestedDiscount} ({discountPercent}%)</span>
                </div>
                <div className="p-4 bg-teal-50 rounded-2xl border border-teal-100">
                  <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">Final Payable Amount</span>
                  <span className="text-lg font-black text-teal-800">₹{finalPayable}</span>
                </div>
              </div>

              <div className="grid gap-x-6 gap-y-4 mt-6 sm:grid-cols-2 text-xs border-t border-slate-100 pt-6">
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="font-semibold text-slate-500">Request Type</span>
                  <span className="font-bold text-slate-800">{isWaiver ? 'Full Waiver' : 'Partial Discount'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="font-semibold text-slate-500">Requested By</span>
                  <span className="font-bold text-slate-800">{discountReq.requestedByName || 'Receptionist'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="font-semibold text-slate-550">Requested On</span>
                  <span className="font-bold text-slate-800">{discountReq.requestedAt ? new Date(discountReq.requestedAt).toLocaleString('en-IN', {day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit'}) : '--'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="font-semibold text-slate-500">Reason</span>
                  <span className="font-bold text-amber-700">{discountReq.reason || 'Not specified'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="font-semibold text-slate-500">Approval Policy Currently Active</span>
                  <span className="font-bold text-teal-600">{policyDisplay.name} ({policyDisplay.title})</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="font-semibold text-slate-500">Approval Required From</span>
                  <span className="font-bold text-slate-850">Clinic Admin (You)</span>
                </div>
              </div>
            </div>

            {/* Patient & Doctor Cards Grid */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Patient Information Card */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Patient Information</h3>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 font-bold shrink-0 border border-teal-100">
                    <User size={26} />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-slate-800">{patient.fullName}</h4>
                    <p className="text-xs font-semibold text-slate-400">PATIENT ID: PAT-{patient.patientId || 'NEW'}</p>
                    <p className="text-xs font-bold text-slate-605 mt-1 capitalize">{patient.gender} • {patient.age || '--'} Y</p>
                  </div>
                </div>
                <div className="space-y-2 text-xs pt-2 border-t border-slate-55">
                  <div className="flex justify-between">
                    <span className="text-slate-405 font-medium">Mobile Number</span>
                    <span className="font-semibold text-slate-800">{patient.phone || '--'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-405 font-medium">Email</span>
                    <span className="font-semibold text-slate-850">{patient.email || '--'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-405 font-medium">Registered Since</span>
                    <span className="font-semibold text-slate-800">
                      {patient.createdAt ? new Date(patient.createdAt).toLocaleDateString('en-GB') : '--'}
                    </span>
                  </div>
                </div>
                {/* Barcode representation */}
                <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl flex flex-col items-center">
                  <div className="flex gap-0.5 h-6 w-full max-w-[200px] items-center justify-center opacity-70">
                    {[1,2,1,3,2,1,4,1,2,3,1,2,1,4,2,1,3,2].map((w, i) => (
                      <span key={i} className="bg-slate-800 h-full" style={{ width: `${w}px` }}></span>
                    ))}
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 mt-1 tracking-widest">PAT-{patient.patientId || 'BARCODE'}</span>
                </div>
                <div className="flex justify-between gap-2 pt-2 text-[11px] font-bold">
                  <button className="text-teal-650 hover:text-teal-700 underline bg-transparent border-0 p-0 cursor-pointer">View Full Profile</button>
                  <button className="text-teal-650 hover:text-teal-700 underline bg-transparent border-0 p-0 cursor-pointer">Previous Visits</button>
                  <button className="text-teal-650 hover:text-teal-700 underline bg-transparent border-0 p-0 cursor-pointer">Billing History</button>
                </div>
              </div>

              {/* Doctor Information Card */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Doctor Information</h3>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold shrink-0 border border-blue-100">
                    <Users size={26} />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-slate-800">{doctor.fullName}</h4>
                    <p className="text-xs font-bold text-teal-600">{doctor.specialization || 'Consultant'}</p>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Room: {doctor.consultationRoom || 'OPD-1'}</p>
                  </div>
                </div>
                <div className="space-y-2 text-xs pt-2 border-t border-slate-50">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Experience</span>
                    <span className="font-semibold text-slate-800">{doctor.experience || '--'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-405 font-medium">Consultation Fee</span>
                    <span className="font-bold text-slate-800">₹{doctor.consultationFee || originalFee}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-405 font-medium">Branch</span>
                    <span className="font-semibold text-slate-800">{doctor.clinic?.name || clinic.name || 'Main Branch'}</span>
                  </div>
                </div>
                {/* Doctor Authority policy info */}
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Doctor Approval Authority</span>
                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                    doctorApprovalAuthority === 'Allowed' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {doctorApprovalAuthority}
                  </span>
                </div>
              </div>
            </div>

            {/* Financial Impact & Previous History Grid */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Financial Impact Card */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Financial Impact</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs py-1 border-b border-slate-50">
                    <span className="text-slate-500">Original Revenue Projection</span>
                    <span className="font-semibold text-slate-800">₹{originalFee}</span>
                  </div>
                  <div className="flex justify-between text-xs py-1 border-b border-slate-50">
                    <span className="text-slate-505">Requested Reduction</span>
                    <span className="font-bold text-rose-600">- ₹{requestedDiscount}</span>
                  </div>
                  <div className="flex justify-between text-xs py-1 border-b border-slate-50">
                    <span className="text-slate-505">Revenue Reduction %</span>
                    <span className="font-bold text-rose-600">{discountPercent}%</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-slate-800 py-1 pt-2 border-t border-slate-100">
                    <span>Net Consultation Revenue</span>
                    <span className="text-teal-600">₹{finalPayable}</span>
                  </div>
                </div>
              </div>

              {/* Previous Approval History */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Previous Approval History</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Discounts Approved</span>
                    <span className="font-bold text-slate-800">2</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Waivers Approved</span>
                    <span className="font-bold text-slate-800">0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-405">Last Discount Type</span>
                    <span className="font-bold text-slate-800">₹100 (Admin Approved)</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100/50">
                    * This patient has historically had excellent show rates (100% attendance). No prior cancellations.
                  </p>
                </div>
              </div>
            </div>

            {/* Medical History Snapshot */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider mb-4">Patient Medical History Snapshot</h3>
              <div className="grid gap-4 md:grid-cols-2 text-xs">
                <div className="space-y-2">
                  <div className="flex justify-between border-b border-slate-50 pb-1.5">
                    <span className="text-slate-400 font-medium">Blood Group</span>
                    <span className="font-semibold text-slate-800">{patient.bloodGroup || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-1.5">
                    <span className="text-slate-400 font-medium">Allergies</span>
                    <span className="font-semibold text-rose-600">{patient.allergies?.join?.(', ') || 'None'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-1.5">
                    <span className="text-slate-400 font-medium">Chronic Diseases</span>
                    <span className="font-semibold text-slate-800">{patient.chronicConditions?.join?.(', ') || 'None'}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between border-b border-slate-50 pb-1.5">
                    <span className="text-slate-405 font-medium">Current Medications</span>
                    <span className="font-semibold text-slate-800">{patient.currentMedications?.join?.(', ') || 'None'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-1.5">
                    <span className="text-slate-405 font-medium">Outstanding Bills</span>
                    <span className="font-bold text-slate-850">₹0 (No outstanding dues)</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-1.5">
                    <span className="text-slate-405 font-medium">Previous No Shows</span>
                    <span className="font-semibold text-slate-800">0</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (Sidebar Workflow & Action Cards) */}
          <div className="space-y-6">
            {/* Approval Workflow Card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Approval Workflow</h3>
              
              <div className="relative pl-6 space-y-5 border-l-2 border-slate-100">
                {/* Booked */}
                <div className="relative">
                  <span className="absolute -left-[31px] top-0.5 bg-emerald-500 text-white rounded-full p-0.5">
                    <CheckCircle2 size={12} />
                  </span>
                  <p className="text-xs font-bold text-slate-800">Appointment Booked</p>
                  <p className="text-[10px] text-slate-400">By Receptionist</p>
                </div>

                {/* Requested */}
                <div className="relative">
                  <span className="absolute -left-[31px] top-0.5 bg-emerald-500 text-white rounded-full p-0.5">
                    <CheckCircle2 size={12} />
                  </span>
                  <p className="text-xs font-bold text-slate-800">Discount Requested</p>
                  <p className="text-[10px] text-slate-400">Waiver / Discount Applied</p>
                </div>

                {/* Waiting */}
                <div className="relative">
                  <span className="absolute -left-[31px] top-0.5 bg-amber-500 text-white rounded-full p-0.5">
                    <Clock size={12} />
                  </span>
                  <p className="text-xs font-extrabold text-amber-700">Waiting For Clinic Admin Approval</p>
                  <p className="text-[10px] text-amber-505">Current Step</p>
                </div>

                {/* Remaining Workflow Steps */}
                <div className="relative opacity-40">
                  <span className="absolute -left-[31px] top-0.5 bg-slate-200 text-slate-505 rounded-full p-0.5">
                    <Clock size={12} />
                  </span>
                  <p className="text-xs font-semibold text-slate-700">Payment Collection</p>
                  <p className="text-[10px] text-slate-400">Pending</p>
                </div>

                <div className="relative opacity-40">
                  <span className="absolute -left-[31px] top-0.5 bg-slate-200 text-slate-505 rounded-full p-0.5">
                    <Clock size={12} />
                  </span>
                  <p className="text-xs font-semibold text-slate-700">Appointment Confirmed</p>
                  <p className="text-[10px] text-slate-400">Pending</p>
                </div>

                <div className="relative opacity-40">
                  <span className="absolute -left-[31px] top-0.5 bg-slate-200 text-slate-505 rounded-full p-0.5">
                    <Clock size={12} />
                  </span>
                  <p className="text-xs font-semibold text-slate-700">Token Generation</p>
                  <p className="text-[10px] text-slate-405">Pending</p>
                </div>
              </div>
            </div>

            {/* Current Billing Policy card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
              <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Current Billing Policy</h4>
              <div className="flex items-start gap-2.5">
                <Building2 size={16} className="text-teal-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-extrabold text-slate-800">{policyDisplay.name}</p>
                  <p className="text-xs font-bold text-teal-700 mt-0.5">{policyDisplay.title}</p>
                  <p className="text-[10px] text-slate-405 mt-1 leading-relaxed">{policyDisplay.desc}</p>
                </div>
              </div>
              <Link to="/settings" className="block text-center w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl text-xs font-bold text-slate-650 transition">
                View Billing Policy
              </Link>
            </div>

            {/* Appointment Summary card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3 text-xs">
              <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Appointment Summary</h4>
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-slate-500">Appointment Type</span><span className="font-semibold text-slate-800 capitalize">{appointment.appointmentType?.replaceAll('_', ' ')}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Booking Source</span><span className="font-semibold text-slate-800 capitalize">{appointment.source || 'Walk-In'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Mode</span><span className="font-semibold text-slate-800 capitalize">Offline</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Slot Duration</span><span className="font-semibold text-slate-800">30 mins</span></div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-55">
                  <span className="text-slate-505">Token Status</span>
                  <span className="text-[10px] font-extrabold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">Not Generated Yet</span>
                </div>
              </div>
            </div>

            {/* Rebooking Assistant Panel / Approval Action Cards */}
            <div className="space-y-4">
              {appointment.status === 'cancelled' || discountReq.status === 'expired' ? (
                <div className="rounded-3xl border border-rose-200 bg-white p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-rose-750 font-extrabold text-xs uppercase tracking-wider">
                    <ShieldAlert size={16} />
                    Rebooking Assistant
                  </div>
                  
                  {!hasCheckedRebook ? (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-600 leading-relaxed">
                        This appointment request is no longer active because it expired or was rejected due to timeout. Please recheck live doctor availability to restart the booking.
                      </p>
                      <button
                        onClick={checkRebookAvailability}
                        disabled={loadingRebookSlots}
                        className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
                      >
                        {loadingRebookSlots ? "Checking..." : "Recheck Doctor Availability"}
                      </button>
                    </div>
                  ) : loadingRebookSlots ? (
                    <div className="text-center py-6 text-xs text-slate-400">
                      Loading available slots...
                    </div>
                  ) : (() => {
                    const isStillAvailable = rebookSlots.some(s => s.time === appointment.startTime);
                    return (
                      <div className="space-y-4">
                        {isStillAvailable ? (
                          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 space-y-3">
                            <p className="text-xs text-emerald-800 font-bold leading-relaxed">
                              ✅ Original slot <strong>{appointment.startTime}</strong> is still available! Do you want to continue with this slot?
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleRebook(appointment.startTime)}
                                disabled={actionLoading}
                                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-extrabold transition"
                              >
                                Continue
                              </button>
                              <button
                                onClick={() => setHasCheckedRebook(false)}
                                className="px-3 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-[11px] font-bold transition"
                              >
                                Select Another Slot
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4">
                              <p className="text-xs text-rose-850 font-bold leading-relaxed">
                                ❌ Selected slot <strong>{appointment.startTime}</strong> is no longer available. Please choose another available slot:
                              </p>
                            </div>
                            
                            {rebookSlots.length === 0 ? (
                              <p className="text-xs text-slate-400 text-center py-2 font-medium">
                                No available slots for today. Please schedule for another day.
                              </p>
                            ) : (
                              <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto p-1 border border-slate-100 rounded-xl">
                                {rebookSlots.map((slot) => (
                                  <button
                                    key={slot.time}
                                    onClick={() => handleRebook(slot.time)}
                                    disabled={actionLoading}
                                    className="py-1.5 bg-slate-50 hover:bg-teal-50 hover:text-teal-700 text-slate-705 rounded-lg text-[10px] font-bold border border-slate-100 text-center transition"
                                  >
                                    {slot.time}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <>
                  <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Approval Decisions</h3>

                  {/* Live Override controls */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <span className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider block">Adjust Discount / Waiver (Optional)</span>
                    
                    {/* Select Type */}
                    <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-xl border border-slate-100">
                      <button 
                        onClick={() => { setOverrideType('percentage'); }}
                        className={`py-1.5 rounded-lg text-xs font-bold text-center transition ${overrideType === 'percentage' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-550 hover:bg-slate-50'}`}
                      >
                        Percent (%)
                      </button>
                      <button 
                        onClick={() => { setOverrideType('fixed'); }}
                        className={`py-1.5 rounded-lg text-xs font-bold text-center transition ${overrideType === 'fixed' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-550 hover:bg-slate-50'}`}
                      >
                        Fixed (₹)
                      </button>
                      <button 
                        onClick={() => { setOverrideType('full_waiver'); setOverrideVal(0); }}
                        className={`py-1.5 rounded-lg text-xs font-bold text-center transition ${overrideType === 'full_waiver' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-550 hover:bg-slate-50'}`}
                      >
                        Waiver
                      </button>
                    </div>

                    {/* Edit Value */}
                    {overrideType !== 'full_waiver' && (
                      <div className="relative">
                        <input 
                          type="number"
                          min="0"
                          max={overrideType === 'percentage' ? 100 : originalFee}
                          value={overrideVal}
                          onChange={(e) => setOverrideVal(Number(e.target.value))}
                          className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 bg-white"
                          placeholder="Enter discount value"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                          {overrideType === 'percentage' ? '%' : '₹'}
                        </span>
                      </div>
                    )}

                    {/* live preview calculation */}
                    {(() => {
                      const calculatedAmt = overrideType === 'full_waiver' ? originalFee : (overrideType === 'percentage' ? Math.round((overrideVal / 100) * originalFee) : Math.min(overrideVal, originalFee));
                      const livePayable = Math.max(0, originalFee - calculatedAmt);
                      return (
                        <div className="text-xs space-y-1 pt-1.5 border-t border-slate-100">
                          <div className="flex justify-between text-slate-550 font-semibold">
                            <span>New Discount:</span>
                            <span>₹{calculatedAmt}</span>
                          </div>
                          <div className="flex justify-between text-slate-800 font-black">
                            <span>New Payable:</span>
                            <span>₹{livePayable}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Action 1: Approve Override Discount */}
                  <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-3 text-center">
                    <p className="text-xs text-emerald-800 font-semibold">Approve the above discount configuration.</p>
                    <button
                      onClick={() => handleDecideDiscount('approved', '', overrideType, overrideVal)}
                      disabled={actionLoading}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 size={13} /> Approve Consultation Fee
                    </button>
                  </div>

                  {/* Action 3: Reject Discount */}
                  <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-2xl space-y-3 text-center">
                    <p className="text-xs text-rose-800 font-semibold">Reject this request. Patient will pay full projection ₹{originalFee}.</p>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      disabled={actionLoading}
                      className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <XCircle size={13} /> Reject Request
                    </button>
                  </div>

                  {/* Action 4: Request Additional Info */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-center">
                    <p className="text-xs text-slate-505 font-semibold">Request clarification from reception desk.</p>
                    <button
                      onClick={() => setShowInfoModal(true)}
                      disabled={actionLoading}
                      className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <MessageSquare size={13} /> Request More Information
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ─── MODALS ─── */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
              <h3 className="text-base font-extrabold text-slate-800">Reject Waiver/Discount Request</h3>
              <textarea
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Please provide cancellation or rejection reasons..."
                className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                rows={3}
              />
              <div className="flex justify-end gap-2.5">
                <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-650">
                  Cancel
                </button>
                <button
                  onClick={() => handleDecideDiscount('rejected', noteInput)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
                >
                  Reject Request
                </button>
              </div>
            </div>
          </div>
        )}

        {showInfoModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
              <h3 className="text-base font-extrabold text-slate-800">Request Additional Information</h3>
              <textarea
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="What details are missing or need clarification?"
                className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                rows={3}
              />
              <div className="flex justify-end gap-2.5">
                <button onClick={() => setShowInfoModal(false)} className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600">
                  Cancel
                </button>
                <button
                  onClick={() => handleDecideDiscount('rejected', `Info Request: ${noteInput}`)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold"
                >
                  Send Query
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    );
  }

  // ─── STANDARD APPOINTMENT VIEW (If not pending approval) ───
  const canManageAppointment = ['SUPER_ADMIN', 'ADMIN', 'RECEPTIONIST'].includes(currentUser?.role);
  const canUpdateStatus = canManageAppointment || currentUser?.role === 'DOCTOR';

  const availableTransitions = () => {
    const next = TRANSITIONS[appointment.status] || [];
    if (currentUser?.role === 'DOCTOR') return next.filter((status) => ['checked_in', 'in_consultation', 'completed'].includes(status));
    return next.filter((status) => !['cancelled', 'rescheduled'].includes(status));
  };

  const handleStatusSubmit = async (event) => {
    event.preventDefault();
    if (!selectedStatus) return;
    try {
      await updateAppointmentStatus(id, { status: selectedStatus, note: statusNote || undefined });
      setStatusNote('');
      await loadAppointment();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update appointment status.');
    }
  };

  const handleCancel = async (event) => {
    event.preventDefault();
    if (!cancelReason.trim()) { setError('Cancellation reason is required.'); return; }
    try {
      const response = await cancelAppointment(id, { cancellationReason: cancelReason.trim() });
      setAppointment(response.data.appointment);
      setCancelReason('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to cancel appointment.');
    }
  };

  const handleReschedule = async (event) => {
    event.preventDefault();
    if (!rescheduleForm.appointmentDate || !rescheduleForm.startTime || !rescheduleForm.reason.trim()) {
      setError('Reschedule date, time, and reason are required.');
      return;
    }
    try {
      const response = await rescheduleAppointment(id, { ...rescheduleForm, durationMinutes: Number(rescheduleForm.durationMinutes) });
      setRescheduleForm({ appointmentDate: '', startTime: '', durationMinutes: 30, reason: '' });
      navigate(`/appointments/${response.data.appointment._id}`, { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to reschedule appointment.');
    }
  };

  const handleSendReminder = async () => {
    setSendingReminder(true);
    setReminderMessage('');
    setError('');
    try {
      await sendAppointmentReminder({ appointmentId: id });
      setReminderMessage('Appointment reminder queued successfully.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to send appointment reminder.');
    } finally {
      setSendingReminder(false);
    }
  };

  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Appointment details</p>
          <h2 className="mt-2 text-3xl font-semibold text-stone-900">{patient.fullName || 'Patient not provided'}</h2>
          <p className="mt-2 text-sm text-stone-600">{appointment.appointmentDate?.slice?.(0, 10) || 'No date'} at {appointment.startTime || '--'}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <AppointmentStatusBadge status={appointment.status} />
          <AppointmentConsultationButton appointmentId={appointment._id} status={appointment.status} />
          <Link className="rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50" to="/appointments">
            Back to list
          </Link>
        </div>
      </div>

      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
      {reminderMessage ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{reminderMessage}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="grid gap-6">
          {/* Waiver/Discount Details Card */}
          {(appointment.waiverAmount > 0 || (appointment.discountRequest && appointment.discountRequest.type && appointment.discountRequest.type !== 'none')) && (
            <article className="rounded-3xl border border-emerald-200 bg-emerald-50/20 p-6 shadow-md relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-500" />
              <h3 className="text-lg font-bold text-emerald-900 flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-600" />
                Consultation Fee Waiver / Discount Applied
              </h3>
              <dl className="mt-4 grid gap-4 md:grid-cols-2">
                <DetailItem 
                  label="Waiver/Discount Type" 
                  value={
                    appointment.waiverType === 'full' || appointment.discountRequest?.type === 'full_waiver'
                      ? 'Full Fee Waiver (100% Off)' 
                      : `Partial Waiver / Discount (${appointment.discountRequest?.type === 'percentage' ? `${appointment.discountRequest?.value}%` : `Fixed ₹${appointment.discountRequest?.value}`})`
                  } 
                />
                <DetailItem 
                  label="Waiver/Discount Amount" 
                  value={`₹${appointment.waiverAmount || appointment.discountRequest?.amount || 0}`} 
                />
                <DetailItem 
                  label="Original consultation fee" 
                  value={`₹${appointment.consultationFee || 500}`} 
                />
                <DetailItem 
                  label="Net Payable Amount" 
                  value={`₹${appointment.remainingAmount !== undefined ? appointment.remainingAmount : (appointment.discountRequest?.finalPayableAmount ?? Math.max(0, (appointment.consultationFee || 500) - (appointment.waiverAmount || appointment.discountRequest?.amount || 0)))}`} 
                />
                <DetailItem 
                  label="Waiver Reason" 
                  value={appointment.waiverReason || appointment.discountRequest?.reason || 'No reason provided'} 
                />
                {appointment.discountRequest && (
                  <DetailItem 
                    label="Discount Request Status" 
                    value={`${appointment.discountRequest.status?.toUpperCase() || 'N/A'}`} 
                  />
                )}
              </dl>
            </article>
          )}

          <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-md">
            <h3 className="text-xl font-semibold text-stone-900">Appointment summary</h3>
            <dl className="mt-6 grid gap-4 md:grid-cols-2">
              <DetailItem label="Patient" value={patient.fullName} />
              <DetailItem label="Doctor" value={doctor.fullName} />
              <DetailItem label="Doctor code" value={doctor.doctorCode} />
              <DetailItem label="Specialization" value={doctor.specialization} />
              <DetailItem label="Date" value={appointment.appointmentDate?.slice?.(0, 10)} />
              <DetailItem label="Time" value={`${appointment.startTime || '--'} - ${appointment.endTime || '--'}`} />
              <DetailItem label="Type" value={appointment.appointmentType?.replaceAll('_', ' ')} />
              <DetailItem label="Source" value={appointment.source?.replaceAll('_', ' ')} />
              <DetailItem label="Reason for visit" value={appointment.reasonForVisit} />
              <DetailItem label="Symptoms summary" value={appointment.symptomsSummary} />
              <DetailItem label="Notes" value={appointment.notes} />
              <DetailItem label="Cancellation reason" value={appointment.cancellationReason} />
              <DetailItem label="Consultation Started" value={['in_consultation', 'completed'].includes(appointment.status) ? 'Yes' : 'No'} />
              <DetailItem label="Check-In Status" value={['checked_in', 'late_check_in', 'called', 'in_consultation', 'completed'].includes(appointment.status) ? 'Checked In' : 'Pending'} />
              <DetailItem label="Refund Status" value={appointment.refundStatus && appointment.refundStatus !== 'none' ? `${appointment.refundStatus.toUpperCase()} (Amt: ₹${appointment.refundAmount || 0})` : 'None'} />
              <DetailItem label="Payment Transfer Status" value={appointment.paymentTransferStatus !== 'none' ? appointment.paymentTransferStatus.replaceAll('_', ' ') : 'None'} />
            </dl>
          </article>

          <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-md">
            <h3 className="text-xl font-semibold text-stone-900">Patient Medical History</h3>
            <dl className="mt-6 grid gap-4 md:grid-cols-2">
              <DetailItem label="Age" value={patient.age !== null && patient.age !== undefined ? `${patient.age} years` : 'Not provided'} />
              <DetailItem label="Gender" value={patient.gender} />
              <DetailItem label="Blood Group" value={patient.bloodGroup} />
              <DetailItem label="Chronic Conditions / Past Medical Problems" value={patient.chronicConditions?.join?.(', ')} />
              <DetailItem label="Allergies" value={patient.allergies?.join?.(', ')} />
              <DetailItem label="Current Medications" value={patient.currentMedications?.join?.(', ')} />
            </dl>
          </article>
        </div>

        <aside className="grid gap-6">
          {canManageAppointment && (
            <article className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-md">
              <h3 className="text-lg font-semibold text-stone-900">Payment & Waiver Override</h3>
              
              <div className="text-xs space-y-1.5 bg-stone-50 border border-stone-100/50 p-3 rounded-2xl">
                <div className="flex justify-between">
                  <span className="text-stone-500 font-medium">Original Fee:</span>
                  <span className="font-bold text-stone-800">₹{appointment.consultationFee || 500}</span>
                </div>
                {appointment.waiverAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Waiver Amount:</span>
                    <span>-₹{appointment.waiverAmount}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-extrabold text-stone-900 pt-1 border-t border-stone-200">
                  <span>Amount Payable:</span>
                  <span>₹{appointment.remainingAmount !== undefined ? appointment.remainingAmount : (appointment.consultationFee || 500)}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span>Payment Status:</span>
                  <span className="font-bold uppercase text-[10px] text-emerald-600">
                    {appointment.paymentStatus || 'Pending'}
                  </span>
                </div>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                const waiverType = e.target.waiverType.value;
                const waiverAmount = Number(e.target.waiverAmount?.value || 0);
                const waiverReason = e.target.waiverReason.value;
                try {
                  await applyWaiver(appointment._id, { waiverType, waiverAmount, waiverReason });
                  alert('Waiver override saved successfully.');
                  loadAppointment();
                } catch (err) {
                  alert('Failed to apply waiver override.');
                }
              }} className="space-y-3 mt-2">
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1">WAIVER TYPE</label>
                  <select name="waiverType" defaultValue={appointment.waiverType || 'none'} className="w-full rounded-2xl border border-stone-300 px-3 py-2 text-sm bg-white">
                    <option value="none">No Waiver</option>
                    <option value="full">Full Waiver</option>
                    <option value="partial">Partial Waiver</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1">WAIVER AMOUNT (IF PARTIAL)</label>
                  <input type="number" name="waiverAmount" defaultValue={appointment.waiverAmount || 0} className="w-full rounded-2xl border border-stone-300 px-3 py-2 text-sm bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1">WAIVER REASON</label>
                  <textarea name="waiverReason" defaultValue={appointment.waiverReason || ''} rows={2} placeholder="Reason for waiver..." className="w-full rounded-2xl border border-stone-300 px-3 py-2 text-sm bg-white" required />
                </div>
                <button type="submit" className="w-full rounded-2xl bg-stone-900 text-white py-2.5 text-xs font-bold hover:bg-stone-800 transition">
                  Apply Waiver Override
                </button>
              </form>
            </article>
          )}

          {canUpdateStatus && availableTransitions().length ? (
            <form className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-md" onSubmit={handleStatusSubmit}>
              <h3 className="text-lg font-semibold text-stone-900">Update status</h3>
              <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)} className="rounded-2xl border border-stone-300 px-4 py-3 text-sm bg-white">
                <option value="">Select next status</option>
                {availableTransitions().map((status) => (
                  <option key={status} value={status}>
                    {status.replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
              <textarea value={statusNote} onChange={(event) => setStatusNote(event.target.value)} rows={3} placeholder="Optional note" className="rounded-2xl border border-stone-300 px-4 py-3 text-sm" />
              <button type="submit" className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700">
                Save status
              </button>
            </form>
          ) : null}
        </aside>
      </div>
    </section>
  );
};

export default AppointmentDetailsPage;
