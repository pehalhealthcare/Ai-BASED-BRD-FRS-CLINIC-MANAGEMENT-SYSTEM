import { useState, useEffect } from 'react';
import {
  X, Calendar, Clock, MapPin, Copy, Star, CheckCircle2, Shield, Video,
  Building, CheckCircle, Info, ExternalLink, Share2, CalendarPlus, Heart, Users, ShieldAlert,
  RotateCcw, XCircle, FileText, Activity, CreditCard, Printer, CheckSquare, AlertTriangle, Bell
} from 'lucide-react';
import { getConsultation } from '../../consultations/consultationApi';
import { apiClient } from '../../../lib/api';

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

export default function AppointmentDetailsModal({ appointment, invoices = [], onClose, onReschedule }) {
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState(appointment?.appointmentType === 'teleconsultation' ? 'online' : 'offline');
  const [consultationTab, setConsultationTab] = useState('summary'); // summary, prescription, medicines, labTests, documents, payment
  const [consultationData, setConsultationData] = useState(null);
  const [loadingConsultation, setLoadingConsultation] = useState(false);

  const doctor = appointment?.doctorId;
  const clinic = appointment?.clinicId;
  const patient = appointment?.patientId;
  const apptId = appointment?.appointmentId || `APT-${appointment?._id?.slice(-8).toUpperCase()}`;
  const isCompleted = appointment?.status?.toLowerCase() === 'completed';

  // Check if invoice for doctor fee / consultation is paid
  const relatedInvoice = (invoices || []).find(
    (inv) =>
      String(inv.appointmentId?._id || inv.appointmentId) === String(appointment?._id) ||
      String(inv.consultationId?._id || inv.consultationId) === String(appointment?.consultationId?._id || appointment?.consultationId)
  );
  const isPaid = !relatedInvoice || relatedInvoice.paymentStatus === 'paid';

  useEffect(() => {
    if (isCompleted) {
      const consultationId = appointment.consultationId?._id || appointment.consultationId;
      if (consultationId) {
        setLoadingConsultation(true);
        getConsultation(consultationId)
          .then((res) => {
            setConsultationData(res?.data?.consultation || res?.consultation || res);
          })
          .catch((err) => {
            console.error('Failed to load EMR/Consultation details:', err);
          })
          .finally(() => {
            setLoadingConsultation(false);
          });
      }
    }
  }, [appointment, isCompleted]);

  const handleCopyId = () => {
    navigator.clipboard.writeText(apptId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  // Add items to local storage and redirect to pharmacy tab
  const handleBuyMedicines = (items) => {
    const prefill = items.map(name => ({
      name,
      qty: 1
    }));
    localStorage.setItem('pharmacy_cart_prefill', JSON.stringify(prefill));
    alert(`${items.length} medicines prepared! Redirecting you to Pharmacy store page to complete purchase.`);
    window.location.hash = '#/pharmacy'; // Support redirect if using hash route
    window.location.pathname = '/pharmacy'; // Support path route fallback
  };

  const isNotAttended = (() => {
    const status = appointment?.status?.toLowerCase() || '';
    if (status === 'no_show') return true;
    if (['booked', 'confirmed', 'scheduled'].includes(status)) {
      if (!appointment.appointmentDate) return false;
      const today = new Date();
      
      const dateStr = typeof appointment.appointmentDate === 'string' 
        ? appointment.appointmentDate.split('T')[0] 
        : new Date(appointment.appointmentDate).toISOString().split('T')[0];
      const [year, month, day] = dateStr.split('-').map(Number);
      
      let hours = 9, minutes = 0;
      if (appointment.startTime) {
        const parts = appointment.startTime.split(':');
        hours = Number(parts[0]);
        minutes = Number(parts[1]) || 0;
      }
      
      const apptDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
      const duration = Number(appointment.durationMinutes) || 15;
      const buffer = 15;
      const expirationDate = new Date(apptDate.getTime() + (duration + buffer) * 60 * 1000);
      
      return expirationDate < today;
    }
    return false;
  })();

  if (isNotAttended) {
    const formattedApptDate = appointment?.appointmentDate
      ? new Date(appointment.appointmentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : '28 Jun 2026';
    const formattedApptTime = appointment?.startTime ? fmt12(appointment.startTime) : '10:30 AM';
    const totalPaid = appointment?.paidAmount || 500;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
        style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)' }}
      >
        <div
          className="w-full max-w-6xl rounded-3xl shadow-2xl overflow-hidden flex flex-col my-4 max-h-[95vh] text-slate-800"
          style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
        >
          {/* Header Panel */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span>Appointments</span>
                <span>&gt;</span>
                <span className="text-teal-700 font-bold">Appointment Details</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 mt-1">Appointment Details</h2>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="bg-amber-50 border border-amber-150 text-amber-700 rounded-2xl px-3.5 py-1.5 flex items-center gap-2 text-xs font-bold">
                <Info size={15} className="text-amber-550" />
                <div className="text-left leading-none">
                  <p className="text-xs font-extrabold text-amber-650">Not Attended</p>
                  <p className="text-[9px] text-slate-405 font-medium mt-0.5 normal-case">Patient did not attend the appointment</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-250 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition"
              >
                Back to Appointments
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-250 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition"
              >
                <Printer size={13} />
                Print
              </button>
            </div>
          </div>

          {/* Scrollable Container */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Patient Header Box */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 grid grid-cols-1 md:grid-cols-3 gap-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-teal-550 border border-teal-100 flex items-center justify-center text-teal-750 text-lg font-black shrink-0 font-sans">
                  {patient?.firstName ? patient.firstName.slice(0, 2).toUpperCase() : 'KG'}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-extrabold text-slate-900 leading-snug">{patient?.fullName || `${patient?.firstName || 'Kaishav'} ${patient?.lastName || 'Gupta'}`}</h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">PID: {patient?.patientId || 'PAT-20260628-0005'}</p>
                  <span className="inline-block bg-teal-50 border border-teal-100/50 text-[9px] font-bold text-teal-700 px-2 py-0.5 rounded-full mt-2">Registered Patient</span>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3.5 text-xs font-medium text-slate-655">
                    <p><span className="text-slate-400 font-bold uppercase text-[9px]">Age / Gender:</span> {patient?.age || '25'} Y / {patient?.gender || 'Male'}</p>
                    <p><span className="text-slate-400 font-bold uppercase text-[9px]">Phone:</span> {patient?.phone || '8076439355'}</p>
                    <p className="col-span-2"><span className="text-slate-400 font-bold uppercase text-[9px]">Email:</span> {patient?.email || 'kaishav.gupta@email.com'}</p>
                    <p className="col-span-2"><span className="text-slate-400 font-bold uppercase text-[9px]">Address:</span> {patient?.address?.line1 || '123, Green Park, Sector 45, Gurugram, Haryana - 122003'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 md:border-l md:border-slate-100 md:pl-6 text-xs text-slate-700">
                <div>
                  <span className="text-slate-400 font-extrabold text-[9px] uppercase tracking-wider block">Appointment ID</span>
                  <span className="font-semibold text-slate-800">{apptId}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-extrabold text-[9px] uppercase tracking-wider block">Appointment Type</span>
                  <span className="font-semibold text-slate-800 capitalize">{appointment?.appointmentType?.replace('_', ' ') || 'General Consultation'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-extrabold text-[9px] uppercase tracking-wider block">Visit Reason</span>
                  <span className="font-semibold text-slate-800">{appointment?.reasonForVisit || 'Fever and cold'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-extrabold text-[9px] uppercase tracking-wider block">Booking Date</span>
                  <span className="font-semibold text-slate-500">{new Date(appointment?.createdAt || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              </div>

              <div className="space-y-4 md:border-l md:border-slate-100 md:pl-6 text-xs text-slate-700">
                <div>
                  <span className="text-slate-400 font-extrabold text-[9px] uppercase tracking-wider block">Appointment Date &amp; Time</span>
                  <span className="font-semibold text-slate-800">{formattedApptDate} (Sat) {formattedApptTime}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-extrabold text-[9px] uppercase tracking-wider block">Consultation Mode</span>
                  <span className="inline-block bg-red-50 border border-red-150 text-red-700 font-bold px-2 py-0.5 rounded-lg text-[10px] mt-1 capitalize">{appointment?.appointmentType === 'teleconsultation' ? 'Online' : 'Offline'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-extrabold text-[9px] uppercase tracking-wider block">Payment Status</span>
                  {appointment?.paymentStatus==='paid'?<span className="inline-block bg-emerald-50 border border-emerald-150 text-emerald-700 font-bold px-2 py-0.5 rounded-lg text-[10px] mt-1 uppercase">Paid</span>:<span className="inline-block bg-red-50 border border-red-150 text-red-700 font-bold px-2 py-0.5 rounded-lg text-[10px] mt-1 uppercase">unpaid</span>}
                </div>
                <div>
                  <span className="text-slate-400 font-extrabold text-[9px] uppercase tracking-wider block">Amount Paid</span>
                  <span className="font-semibold text-slate-900">₹{totalPaid}</span>
                </div>
              </div>
            </div>

            {/* Not Attended Warning Banner Box */}
            <div className="bg-amber-50/50 border border-amber-200 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-start gap-4 text-xs">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-650 shrink-0">
                  <Info size={20} className="text-amber-500" />
                </div>
                <div>
                  <h4 className="font-black text-amber-800 text-sm">Appointment Not Attended</h4>
                  <p className="text-amber-700 mt-1">The patient did not attend this appointment.</p>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-3 text-left md:text-right shrink-0">
                <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Scheduled On</p>
                <p className="text-amber-700 font-extrabold text-xs mt-1">{formattedApptDate}, {formattedApptTime}</p>
              </div>
            </div>

            {/* Important Info section */}
            <div className="bg-amber-50/20 border border-amber-100/50 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-amber-800">
                <Info size={16} />
                <h4 className="text-sm font-extrabold">Important Information</h4>
              </div>
              <ul className="space-y-4 text-xs font-semibold text-slate-600 pl-2">
                <li className="flex items-start gap-3">
                  <div className="p-1 bg-amber-100/50 text-amber-600 rounded-lg shrink-0 mt-0.5">
                    <CheckSquare size={14} />
                  </div>
                  <span>No consultation was conducted for this appointment.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="p-1 bg-amber-100/50 text-amber-600 rounded-lg shrink-0 mt-0.5">
                    <FileText size={14} />
                  </div>
                  <span>No cancellation charges have been applied.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="p-1 bg-amber-100/50 text-amber-600 rounded-lg shrink-0 mt-0.5">
                    <RotateCcw size={14} />
                  </div>
                  <span>If any payment has been made, the full amount will be refunded to the patient within 7 working days.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="p-1 bg-amber-100/50 text-amber-600 rounded-lg shrink-0 mt-0.5">
                    <CalendarPlus size={14} />
                  </div>
                  <span>You can reschedule the appointment if the patient wishes to book again.</span>
                </li>
              </ul>
            </div>

            {/* Support section */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm">
              <div className="flex items-center gap-4 text-xs">
                <div className="w-10 h-10 rounded-full bg-slate-105 flex items-center justify-center text-slate-655 shrink-0">
                  <Info size={20} className="text-amber-500" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900">Need Help?</h4>
                  <p className="text-slate-500 mt-1">If you have any questions or need further assistance, feel free to contact our support team.</p>
                </div>
              </div>
              <button
                onClick={() => alert('Support contact: support@aicms.health')}
                className="px-5 py-2.5 rounded-xl text-xs font-bold border border-amber-250 text-amber-655 hover:bg-amber-50 hover:border-amber-300 transition shrink-0"
              >
                Contact Support
              </button>
            </div>

          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-slate-500 text-xs">
              <Info size={14} className="text-slate-400 shrink-0" />
              <span>You can reschedule this appointment for a future date.</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onReschedule?.(appointment)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-white shadow-lg shadow-amber-500/20 transition flex items-center gap-1.5"
              >
                <CalendarPlus size={14} />
                Reschedule your appointment for next date
              </button>
            </div>
          </div>

        </div>
      </div>
    );
  }

  const isCancelled = appointment?.status?.toLowerCase()?.includes('cancel');

  if (isCancelled) {
    const formattedApptDate = appointment?.appointmentDate
      ? new Date(appointment.appointmentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : '28 Jun 2026';
    const formattedApptTime = appointment?.startTime ? fmt12(appointment.startTime) : '10:30 AM';
    
    const cancelDateStr = appointment?.updatedAt
      ? new Date(appointment.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' + new Date(appointment.updatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      : '27 Jun 2026, 09:15 AM';

    const whoCancelled = appointment?.status?.toLowerCase() === 'patient_cancelled' 
      ? 'by the patient.' 
      : appointment?.status?.toLowerCase() === 'clinic_cancelled' 
        ? 'by the clinic.' 
        : 'by the doctor/receptionist.';

    const totalPaid = appointment?.paidAmount || 0;
    const paymentStatus = appointment?.paymentStatus || 'unpaid';

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
        style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)' }}
      >
        <div
          className="w-full max-w-6xl rounded-3xl shadow-2xl overflow-hidden flex flex-col my-4 max-h-[95vh] text-slate-800"
          style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
        >
          {/* Header Panel */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span>Appointments</span>
                <span>&gt;</span>
                <span className="text-teal-700 font-bold">Appointment Details</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 mt-1">Appointment Details</h2>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="bg-red-50 border border-red-150 text-red-700 rounded-2xl px-3.5 py-1.5 flex items-center gap-2 text-xs font-bold">
                <XCircle size={15} className="text-red-500" />
                <div className="text-left leading-none">
                  <p className="text-xs font-extrabold text-red-650">Canceled</p>
                  <p className="text-[9px] text-slate-405 font-medium mt-0.5 normal-case">This appointment has been canceled</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-250 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition"
              >
                Back to Appointments
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-250 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition"
              >
                <Printer size={13} />
                Print
              </button>
            </div>
          </div>

          {/* Scrollable Container */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Patient Header Box */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 grid grid-cols-1 md:grid-cols-3 gap-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-teal-550 border border-teal-100 flex items-center justify-center text-teal-750 text-lg font-black shrink-0 font-sans">
                  {patient?.firstName ? patient.firstName.slice(0, 2).toUpperCase() : 'KG'}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-extrabold text-slate-900 leading-snug">{patient?.fullName || `${patient?.firstName || 'Kaishav'} ${patient?.lastName || 'Gupta'}`}</h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">PID: {patient?.patientId || 'PAT-20260628-0005'}</p>
                  <span className="inline-block bg-teal-50 border border-teal-100/50 text-[9px] font-bold text-teal-700 px-2 py-0.5 rounded-full mt-2">Registered Patient</span>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3.5 text-xs font-medium text-slate-655">
                    <p><span className="text-slate-400 font-bold uppercase text-[9px]">Age / Gender:</span> {patient?.age || '25'} Y / {patient?.gender || 'Male'}</p>
                    <p><span className="text-slate-400 font-bold uppercase text-[9px]">Phone:</span> {patient?.phone || '8076439355'}</p>
                    <p className="col-span-2"><span className="text-slate-400 font-bold uppercase text-[9px]">Email:</span> {patient?.email || 'kaishav.gupta@email.com'}</p>
                    <p className="col-span-2"><span className="text-slate-400 font-bold uppercase text-[9px]">Address:</span> {patient?.address?.line1 || '123, Green Park, Sector 45, Gurugram, Haryana - 122003'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 md:border-l md:border-slate-100 md:pl-6 text-xs text-slate-700">
                <div>
                  <span className="text-slate-400 font-extrabold text-[9px] uppercase tracking-wider block">Appointment ID</span>
                  <span className="font-semibold text-slate-800">{apptId}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-extrabold text-[9px] uppercase tracking-wider block">Appointment Type</span>
                  <span className="font-semibold text-slate-800 capitalize">{appointment?.appointmentType?.replace('_', ' ') || 'General Consultation'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-extrabold text-[9px] uppercase tracking-wider block">Visit Reason</span>
                  <span className="font-semibold text-slate-800">{appointment?.reasonForVisit || 'Fever and cold'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-extrabold text-[9px] uppercase tracking-wider block">Booking Date</span>
                  <span className="font-semibold text-slate-500">{new Date(appointment?.createdAt || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              </div>

              <div className="space-y-4 md:border-l md:border-slate-100 md:pl-6 text-xs text-slate-700">
                <div>
                  <span className="text-slate-400 font-extrabold text-[9px] uppercase tracking-wider block">Appointment Date &amp; Time</span>
                  <span className="font-semibold text-slate-800">{formattedApptDate} {formattedApptTime}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-extrabold text-[9px] uppercase tracking-wider block">Consultation Mode</span>
                  <span className="inline-block bg-red-50 border border-red-150 text-red-700 font-bold px-2 py-0.5 rounded-lg text-[10px] mt-1 capitalize">{appointment?.appointmentType === 'teleconsultation' ? 'Online' : 'Offline'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-extrabold text-[9px] uppercase tracking-wider block">Payment Status</span>
                  {appointment?.paymentStatus==='paid'?<span className="inline-block bg-emerald-50 border border-emerald-150 text-emerald-700 font-bold px-2 py-0.5 rounded-lg text-[10px] mt-1 uppercase">Paid</span>:<span className="inline-block bg-red-50 border border-red-150 text-red-700 font-bold px-2 py-0.5 rounded-lg text-[10px] mt-1 uppercase">unpaid</span>}
                </div>
                <div>
                  <span className="text-slate-400 font-extrabold text-[9px] uppercase tracking-wider block">Amount Paid</span>
                  <span className="font-semibold text-slate-900">₹{totalPaid}</span>
                </div>
              </div>
            </div>

            {/* Cancel Red Alert Box */}
            <div className="bg-red-50/50 border border-red-200 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-start gap-4 text-xs">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-655 shrink-0">
                  <XCircle size={20} />
                </div>
                <div>
                  <h4 className="font-black text-red-800 text-sm">Appointment Canceled</h4>
                  <p className="text-red-700 mt-1">This appointment has been canceled {whoCancelled}</p>
                </div>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-2xl px-5 py-3 text-left md:text-right shrink-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Canceled On</p>
                <p className="text-red-700 font-extrabold text-xs mt-1">{cancelDateStr}</p>
              </div>
            </div>

            {/* Important Info section */}
            <div className="bg-red-50/20 border border-red-100/50 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-red-800">
                <Info size={16} />
                <h4 className="text-sm font-extrabold">Important Information</h4>
              </div>
              <ul className="space-y-4 text-xs font-semibold text-slate-600 pl-2">
                <li className="flex items-start gap-3">
                  <div className="p-1 bg-red-100/50 text-red-600 rounded-lg shrink-0 mt-0.5">
                    <FileText size={14} />
                  </div>
                  <span>Any cancellation charges have been not applied for this appointment.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="p-1 bg-red-100/50 text-red-600 rounded-lg shrink-0 mt-0.5">
                    <RotateCcw size={14} />
                  </div>
                  <span>If any payment has been made, the full amount will be refunded to the patient within 7 working days.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="p-1 bg-red-100/50 text-red-600 rounded-lg shrink-0 mt-0.5">
                    <CheckSquare size={14} />
                  </div>
                  <span>No consultation was conducted for this appointment.</span>
                </li>
              </ul>
            </div>

            {/* Support section */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm">
              <div className="flex items-center gap-4 text-xs">
                <div className="w-10 h-10 rounded-full bg-slate-105 flex items-center justify-center text-slate-600 shrink-0">
                  <Info size={20} className="text-rose-500" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900">Need Help?</h4>
                  <p className="text-slate-500 mt-1">If you have any questions or need further assistance, feel free to contact our support team.</p>
                </div>
              </div>
              <button
                onClick={() => alert('Support contact: support@aicms.health')}
                className="px-5 py-2.5 rounded-xl text-xs font-bold border border-red-250 text-red-655 hover:bg-red-50 hover:border-red-300 transition shrink-0"
              >
                Contact Support
              </button>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // If completed, show EMR Consultation Details Layout (matching Image Layout)
  if (isCompleted) {
    const consultationDateStr = appointment?.appointmentDate
      ? new Date(appointment.appointmentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    const totalPaid = appointment?.paidAmount || 500;
    const paymentStatus = appointment?.paymentStatus || 'Paid';

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
        style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)' }}
      >
        <div
          className="w-full max-w-6xl rounded-3xl shadow-2xl overflow-hidden flex flex-col my-4 max-h-[95vh] text-slate-800"
          style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
        >
          {/* Header Panel */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span>Appointments</span>
                <span>&gt;</span>
                <span className="text-teal-700">Appointment Details</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 mt-1">Appointment Details</h2>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="bg-emerald-50 border border-emerald-250 text-emerald-700 rounded-full px-3 py-1 flex items-center gap-1.5 text-xs font-bold">
                <CheckCircle2 size={13} className="text-emerald-600" />
                <span>Completed</span>
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-250 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition"
              >
                Back to Appointments
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-250 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition"
              >
                <Printer size={13} />
                Print
              </button>
            </div>
          </div>

          {/* Scrollable Container */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Patient Header Box */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 grid grid-cols-1 md:grid-cols-3 gap-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 text-lg font-black shrink-0">
                  {patient?.firstName ? patient.firstName.slice(0, 2).toUpperCase() : 'PT'}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-extrabold text-slate-900 leading-snug">{patient?.fullName || `${patient?.firstName || 'Kaishav'} ${patient?.lastName || 'Gupta'}`}</h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">PID: {patient?.patientId || 'PAT-20260628-0005'}</p>
                  <span className="inline-block bg-teal-50 border border-teal-100/50 text-[9px] font-bold text-teal-700 px-2 py-0.5 rounded-full mt-2">Registered Patient</span>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3.5 text-xs font-medium text-slate-600">
                    <p><span className="text-slate-400 font-bold uppercase text-[9px]">Age/Gender:</span> {patient?.age || '25'} Y / {patient?.gender || 'Male'}</p>
                    <p><span className="text-slate-400 font-bold uppercase text-[9px]">Phone:</span> {patient?.phone || '8076439355'}</p>
                    <p className="col-span-2"><span className="text-slate-400 font-bold uppercase text-[9px]">Email:</span> {patient?.email || 'patientemail@test.com'}</p>
                    <p className="col-span-2"><span className="text-slate-400 font-bold uppercase text-[9px]">Address:</span> {patient?.address?.line1 || 'Gurugram, Haryana'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 md:border-l md:border-slate-100 md:pl-6 text-xs text-slate-700">
                <div>
                  <span className="text-slate-400 font-extrabold text-[9px] uppercase tracking-wider block">Appointment ID</span>
                  <span className="font-semibold text-slate-800">{apptId}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-extrabold text-[9px] uppercase tracking-wider block">Appointment Type</span>
                  <span className="font-semibold text-slate-800 capitalize">{appointment?.appointmentType?.replace('_', ' ') || 'General Consultation'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-extrabold text-[9px] uppercase tracking-wider block">Visit Reason</span>
                  <span className="font-semibold text-slate-800">{appointment?.reasonForVisit || 'Fever and cold'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-extrabold text-[9px] uppercase tracking-wider block">Booking Date</span>
                  <span className="font-semibold text-slate-500">{new Date(appointment?.createdAt || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              </div>

              <div className="space-y-4 md:border-l md:border-slate-100 md:pl-6 text-xs text-slate-700">
                <div>
                  <span className="text-slate-400 font-extrabold text-[9px] uppercase tracking-wider block">Appointment Date &amp; Time</span>
                  <span className="font-semibold text-slate-800">{consultationDateStr} {appointment?.startTime ? fmt12(appointment.startTime) : '10:30 AM'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-extrabold text-[9px] uppercase tracking-wider block">Consultation Mode</span>
                  <span className="inline-block bg-teal-50 border border-teal-150 text-teal-700 font-bold px-2 py-0.5 rounded-lg text-[10px] mt-1 capitalize">{appointment?.appointmentType === 'teleconsultation' ? 'Online' : 'Offline'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-extrabold text-[9px] uppercase tracking-wider block">Payment Status</span>
                  <span className="inline-block bg-emerald-50 border border-emerald-150 text-emerald-700 font-bold px-2 py-0.5 rounded-lg text-[10px] mt-1 uppercase">{paymentStatus}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-extrabold text-[9px] uppercase tracking-wider block">Amount Paid</span>
                  <span className="font-semibold text-slate-900">₹{totalPaid}</span>
                </div>
              </div>
            </div>

            {/* Completion Banner */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex justify-between items-center text-xs">
              <div className="flex items-center gap-3 text-emerald-800">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <div>
                  <p className="font-extrabold text-emerald-950">Appointment Completed</p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">This consultation was conducted in {appointment?.appointmentType === 'teleconsultation' ? 'Online' : 'Offline'} mode on {consultationDateStr} at {appointment?.startTime ? fmt12(appointment.startTime) : '10:30 AM'}.</p>
                </div>
              </div>
              <div className="text-right text-[10px] font-bold text-slate-400">
                Consultation Duration<br/>
                <span className="text-slate-700 font-extrabold text-xs">00h : 18m : 42s</span>
              </div>
            </div>

            {/* Tab navigation headers */}
            <div className="flex items-center border-b border-slate-200 bg-white rounded-t-2xl px-5 pt-3">
              {[
                { id: 'summary', label: 'Consultation Summary', icon: FileText },
                { id: 'prescription', label: 'Prescription', icon: FileText },
                { id: 'medicines', label: `Medicines (${consultationData?.prescription?.medicines?.length || 0})`, icon: Heart },
                { id: 'labTests', label: `Lab Tests (${consultationData?.labInvestigation?.length || 0})`, icon: ShieldAlert },
                { id: 'documents', label: 'Documents', icon: FileText },
                { id: 'payment', label: 'Payment', icon: CreditCard }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = consultationTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setConsultationTab(tab.id)}
                    className={`px-4 pb-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all duration-150 mr-4 ${isActive ? 'border-teal-650 text-teal-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                    <Icon size={14} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Body Contents */}
            <div className="bg-white rounded-b-2xl border-x border-b border-slate-200 p-6 shadow-sm min-h-[300px]">
              {loadingConsultation ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-teal-650 mb-3" />
                  <p className="text-xs text-slate-500">Loading consultation records...</p>
                </div>
              ) : (
                <>
                  {consultationTab === 'summary' && (
                    <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-6">
                      <div className="space-y-4 border-r border-slate-100 pr-6">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Doctor Details</h4>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 font-extrabold text-sm shrink-0">
                            {doctor?.fullName?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-800">Dr. {doctor?.fullName || 'Neha Dhawan'}</p>
                            <p className="text-[10px] text-slate-500 font-medium mt-0.5">{doctor?.specialization || 'General Physician'}</p>
                            <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Experience: {doctor?.experience || '10+ Years'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Consultation Notes</h4>
                        <div className="space-y-4 text-xs">
                          <div>
                            <span className="font-extrabold text-slate-800 block mb-1">Chief Complaint</span>
                            <p className="text-slate-600 bg-slate-50/50 p-3 rounded-xl border border-slate-100">{consultationData?.clinicalNotes?.chiefComplaints || appointment?.reasonForVisit || 'Patient has mild fever, sore throat and running nose.'}</p>
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-800 block mb-1">Diagnosis</span>
                            <p className="text-slate-600 bg-slate-50/50 p-3 rounded-xl border border-slate-100">{consultationData?.clinicalNotes?.diagnosis || 'Viral Upper Respiratory Infection (Common Cold)'}</p>
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-800 block mb-1">Advice</span>
                            <p className="text-slate-600 bg-slate-50/50 p-3 rounded-xl border border-slate-100">{consultationData?.clinicalNotes?.advice || 'Rest, drink plenty of fluids, take medicines as prescribed.'}</p>
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-800 block mb-1">Follow-up</span>
                            <p className="text-slate-600 bg-slate-50/50 p-3 rounded-xl border border-slate-100">{consultationData?.clinicalNotes?.followUp || 'Visit in 5 days if symptoms persist.'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {consultationTab === 'prescription' && (
                    !isPaid ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500">
                          <ShieldAlert size={28} />
                        </div>
                        <h4 className="text-sm font-black text-slate-800">Prescription Locked</h4>
                        <p className="text-xs text-slate-500 max-w-[320px] leading-relaxed">
                          Your medical prescription is locked because the doctor's consultation fee has not been paid. Please complete payment to unlock it.
                        </p>
                        {relatedInvoice && (
                          <a
                            href={`#/billing/${relatedInvoice._id}/checkout`}
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-lg transition"
                          >
                            Pay Doctor Fee
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center py-6">
                        <div className="w-full max-w-lg mb-4 flex justify-end">
                          <button
                            onClick={() => {
                              const meds = consultationData?.prescription?.medicines?.map(m => m.name) || ['Paracetamol 650mg', 'Levocetirizine 5mg', 'Cough Syrup'];
                              handleBuyMedicines(meds);
                            }}
                            className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-md transition"
                          >
                            Buy All Prescribed Medicines
                          </button>
                        </div>
                        
                        <div className="bg-white border border-slate-200 shadow-md p-8 max-w-lg w-full rounded-2xl relative text-xs text-slate-800">
                          <div className="text-center border-b border-slate-150 pb-4 mb-4">
                            <h4 className="text-sm font-black text-teal-800 tracking-wider">AI-CMS HEALTH CLINIC</h4>
                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">Dr. {doctor?.fullName || 'Neha Dhawan'}</p>
                            <p className="text-[9px] text-slate-400 font-medium">Reg No: {doctor?.doctorCode || '12345'}</p>
                          </div>
                          <p className="text-right text-[10px] font-bold text-slate-400 mb-4">Date: {consultationDateStr}</p>
                          <p className="text-sm font-black text-teal-700 mb-3">Rx</p>
                          
                          <div className="space-y-4 pl-4 border-l border-slate-100">
                            {consultationData?.prescription?.medicines && consultationData.prescription.medicines.length > 0 ? (
                              consultationData.prescription.medicines.map((med, index) => (
                                <div key={index} className="space-y-1">
                                  <p className="font-bold text-slate-800">{index + 1}. Tab. {med.name}</p>
                                  <p className="text-slate-500 pl-4">{med.dosage || '1-1-1'} ({med.duration || '3 Days'})</p>
                                </div>
                              ))
                            ) : (
                              <div className="space-y-4">
                                <div className="space-y-1">
                                  <p className="font-bold text-slate-800">1. Tab. Paracetamol 650mg</p>
                                  <p className="text-slate-500 pl-4">1-1-1 (After Food) - 3 Days</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="font-bold text-slate-800">2. Tab. Levocetirizine 5mg</p>
                                  <p className="text-slate-500 pl-4">1-0-1 (After Food) - 5 Days</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="font-bold text-slate-800">3. Cough Syrup</p>
                                  <p className="text-slate-500 pl-4">2 tsf TID - 5 Days</p>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="text-right border-t border-slate-100 pt-6 mt-8">
                            <p className="font-extrabold text-teal-700 italic">Neha</p>
                            <p className="text-[9px] font-bold text-slate-400">Dr. {doctor?.fullName || 'Neha Dhawan'}</p>
                          </div>
                        </div>
                      </div>
                    )
                  )}

                  {consultationTab === 'medicines' && (
                    !isPaid ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500">
                          <ShieldAlert size={28} />
                        </div>
                        <h4 className="text-sm font-black text-slate-800">Medicines Locked</h4>
                        <p className="text-xs text-slate-500 max-w-[320px] leading-relaxed">
                          Your prescribed medicines details are locked because the doctor's consultation fee has not been paid. Please complete payment to unlock.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                          <h4 className="text-xs font-black text-slate-800">Prescribed Medicines ({consultationData?.prescription?.medicines?.length || 3})</h4>
                          <button
                            onClick={() => {
                              const meds = consultationData?.prescription?.medicines?.map(m => m.name) || ['Paracetamol 650mg', 'Levocetirizine 5mg', 'Cough Syrup'];
                              handleBuyMedicines(meds);
                            }}
                            className="px-3.5 py-1.5 rounded-lg bg-teal-605 text-white font-bold text-[10px] bg-teal-600 hover:bg-teal-750 transition"
                          >
                            Buy All Medicines
                          </button>
                        </div>
                        
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left border-collapse">
                            <thead>
                              <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                                <th className="py-2.5 px-3">Medicine Name</th>
                                <th className="py-2.5 px-3">Dosage / Frequency</th>
                                <th className="py-2.5 px-3">Duration</th>
                                <th className="py-2.5 px-3">Instructions</th>
                                <th className="py-2.5 px-3 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {consultationData?.prescription?.medicines && consultationData.prescription.medicines.length > 0 ? (
                                consultationData.prescription.medicines.map((med, index) => (
                                  <tr key={index}>
                                    <td className="py-3 px-3 font-bold text-slate-800">{med.name}</td>
                                    <td className="py-3 px-3 text-slate-600">{med.dosage || med.frequency || '1-1-1'}</td>
                                    <td className="py-3 px-3 text-slate-655">{med.duration || '3 Days'}</td>
                                    <td className="py-3 px-3 text-slate-500">{med.instruction || 'After Food'}</td>
                                    <td className="py-3 px-3 text-right">
                                      <button
                                        onClick={() => handleBuyMedicines([med.name])}
                                        className="px-2.5 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-[10px] transition"
                                      >
                                        Buy
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <>
                                  <tr>
                                    <td className="py-3 px-3 font-bold text-slate-800">Paracetamol 650mg</td>
                                    <td className="py-3 px-3 text-slate-600">1-1-1</td>
                                    <td className="py-3 px-3 text-slate-655">3 Days</td>
                                    <td className="py-3 px-3 text-slate-500">After Food</td>
                                    <td className="py-3 px-3 text-right">
                                      <button
                                        onClick={() => handleBuyMedicines(['Paracetamol 650mg'])}
                                        className="px-2.5 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-[10px] transition"
                                      >
                                        Buy
                                      </button>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td className="py-3 px-3 font-bold text-slate-800">Levocetirizine 5mg</td>
                                    <td className="py-3 px-3 text-slate-600">1-0-1</td>
                                    <td className="py-3 px-3 text-slate-655">5 Days</td>
                                    <td className="py-3 px-3 text-slate-500">After Food</td>
                                    <td className="py-3 px-3 text-right">
                                      <button
                                        onClick={() => handleBuyMedicines(['Levocetirizine 5mg'])}
                                        className="px-2.5 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-[10px] transition"
                                      >
                                        Buy
                                      </button>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td className="py-3 px-3 font-bold text-slate-800">Cough Syrup</td>
                                    <td className="py-3 px-3 text-slate-600">2 tsf TID</td>
                                    <td className="py-3 px-3 text-slate-655">5 Days</td>
                                    <td className="py-3 px-3 text-slate-500">With warm water</td>
                                    <td className="py-3 px-3 text-right">
                                      <button
                                        onClick={() => handleBuyMedicines(['Cough Syrup'])}
                                        className="px-2.5 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-[10px] transition"
                                      >
                                        Buy
                                      </button>
                                    </td>
                                  </tr>
                                </>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  )}

                  {consultationTab === 'labTests' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                        <h4 className="text-xs font-black text-slate-800">Suggested Lab Investigations</h4>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                              <th className="py-2.5 px-3">Test Name</th>
                              <th className="py-2.5 px-3">Type</th>
                              <th className="py-2.5 px-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {consultationData?.labInvestigation && consultationData.labInvestigation.length > 0 ? (
                              consultationData.labInvestigation.map((test, index) => (
                                <tr key={index}>
                                  <td className="py-3 px-3 font-bold text-slate-800">{typeof test === 'string' ? test : test.testName || test.name}</td>
                                  <td className="py-3 px-3 text-slate-550">{test.testType || 'Blood Test'}</td>
                                  <td className="py-3 px-3">
                                    <span className="inline-block bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[9px] font-bold">Available</span>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <>
                                <tr>
                                  <td className="py-3 px-3 font-bold text-slate-800">Complete Blood Count (CBC)</td>
                                  <td className="py-3 px-3 text-slate-550">Blood Test</td>
                                  <td className="py-3 px-3">
                                    <span className="inline-block bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[9px] font-bold">Available</span>
                                  </td>
                                </tr>
                                <tr>
                                  <td className="py-3 px-3 font-bold text-slate-800">C-Reactive Protein (CRP)</td>
                                  <td className="py-3 px-3 text-slate-550">Blood Test</td>
                                  <td className="py-3 px-3">
                                    <span className="inline-block bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[9px] font-bold">Available</span>
                                  </td>
                                </tr>
                              </>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {consultationTab === 'documents' && (
                    <div className="space-y-4">
                      <h4 className="text-xs font-black text-slate-800 mb-2">Attached Reports &amp; E-Prescriptions</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl border border-slate-200 bg-white flex items-center justify-between shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-red-50 text-red-650 rounded-xl">
                              <FileText size={18} />
                            </div>
                            <div>
                              <p className="text-xs font-extrabold text-slate-800">Prescription_Receipt.pdf</p>
                              <p className="text-[10px] text-slate-400 font-bold mt-0.5">PDF Document • 1.2 MB</p>
                            </div>
                          </div>
                          <button className="text-teal-650 hover:text-teal-700 font-bold text-xs">Download</button>
                        </div>

                        <div className="p-4 rounded-2xl border border-slate-200 bg-white flex items-center justify-between shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-emerald-50 text-emerald-650 rounded-xl">
                              <FileText size={18} />
                            </div>
                            <div>
                              <p className="text-xs font-extrabold text-slate-800">Lab_Report_CBC.pdf</p>
                              <p className="text-[10px] text-slate-400 font-bold mt-0.5">PDF Document • 840 KB</p>
                            </div>
                          </div>
                          <button className="text-teal-650 hover:text-teal-700 font-bold text-xs">Download</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {consultationTab === 'payment' && (
                    <div className="space-y-4">
                      <h4 className="text-xs font-black text-slate-800 mb-3">Transaction &amp; Invoice Breakdown</h4>
                      <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100 space-y-3 text-xs">
                        <div className="flex justify-between border-b border-slate-100 pb-2">
                          <span className="text-slate-550">Consultation Fee</span>
                          <span className="font-bold text-slate-800">₹500.00</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-2">
                          <span className="text-slate-550">CGST (9%)</span>
                          <span className="font-bold text-slate-800">₹0.00</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-2">
                          <span className="text-slate-550">SGST (9%)</span>
                          <span className="font-bold text-slate-800">₹0.00</span>
                        </div>
                        <div className="flex justify-between text-sm font-black pt-1">
                          <span className="text-slate-905">Total Amount Paid</span>
                          <span className="text-teal-700">₹500.00</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Journey data
  const isRescheduled = appointment?.status?.toLowerCase() === 'rescheduled';
  const isCancelledExact = appointment?.status?.toLowerCase() === 'cancelled';

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
        title: isCancelledExact ? 'Cancelled by You' : 'Rescheduled by Doctor',
        time: '22 Jun 2026, 05:20 PM',
        desc: appointment.cancellationReason,
        completed: true,
        active: true,
        color: 'bg-purple-500'
      }
    ] : []),
    {
      title: 'Upcoming Appointment',
      time: appointment?.appointmentDate
        ? `${new Date(appointment.appointmentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}, ${fmt12(appointment?.startTime)}`
        : '27 Jun 2026, 10:00 AM',
      desc: 'Consultation pending',
      completed: false,
      active: true,
      color: 'bg-slate-700'
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
              appointment?.status?.toLowerCase() === 'called' ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Bell size={20} className="text-[#a5b4fc]" />
                  </div>
                  <h4 className="text-sm font-black text-indigo-300 uppercase tracking-wider">You Are Called!</h4>
                  <p className="text-xs text-slate-400 max-w-[240px] leading-relaxed">
                    Please proceed to the doctor's cabin. Tell the Doctor the OTP below to start your consultation.
                  </p>

                  <div className="space-y-2 w-full">
                    <span className="text-[8px] font-black text-slate-550 uppercase tracking-widest block">Your Consultation OTP</span>
                    <div className="flex justify-center gap-1.5">
                      {(appointment?.meta?.otp || '845291').split('').map((char, index) => (
                        <div key={index} className="w-8 h-10 rounded-lg bg-slate-950 border border-white/[0.08] flex items-center justify-center text-base font-extrabold text-white">
                          {char}
                        </div>
                      ))}
                    </div>
                    <span className="text-[9px] text-emerald-450 block font-bold mt-1">This OTP is valid for 03:00 minutes</span>
                  </div>

                  <div className="w-full flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-left">
                    <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-amber-300 leading-relaxed font-semibold">
                      Do not share this OTP with anyone except your doctor.
                    </p>
                  </div>

                  <div className="w-full grid grid-cols-2 gap-3 pt-3 border-t border-white/[0.06]">
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
                      <p className="text-[9px] uppercase tracking-wider text-slate-500">Token Number</p>
                      <p className="text-xs font-mono font-bold text-emerald-450 mt-1">{appointment?.meta?.tokenNumber || 'T-101'}</p>
                    </div>
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
                      <p className="text-[9px] uppercase tracking-wider text-slate-500">Room Number</p>
                      <p className="text-xs font-mono font-bold text-emerald-450 mt-1">{appointment?.meta?.roomNumber || 'AB-101'}</p>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 mt-2">Having trouble? Contact reception for help.</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                  {appointment?.checkin_token_uuid ? (
                    <div className="p-4 bg-white rounded-2xl inline-block shadow-lg">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${appointment.checkin_token_uuid}`}
                        alt="Check-in QR Code"
                        className="w-40 h-40"
                      />
                    </div>
                  ) : (
                    <div className="w-40 h-40 border border-dashed border-slate-700 rounded-2xl flex items-center justify-center text-slate-500 font-bold text-xs p-4">
                      QR Code Not Active or Already Checked In
                    </div>
                  )}
                  <p className="text-xs text-slate-300 max-w-[240px] leading-relaxed">
                    {appointment?.checkin_token_uuid ? 'Scan this QR code at clinic reception when you reach the clinic.' : 'You have already checked in or check-in is not active.'}
                  </p>
                  <div className="w-full grid grid-cols-2 gap-3 pt-3 border-t border-white/[0.06]">
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
                      <p className="text-[9px] uppercase tracking-wider text-slate-500">Token Number</p>
                      <p className="text-xs font-mono font-bold text-emerald-400 mt-1">{appointment?.meta?.queueTokenNumber || appointment?.meta?.tokenNumber || 'Pending Check-in'}</p>
                    </div>
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
                      <p className="text-[9px] uppercase tracking-wider text-slate-500">Room Number</p>
                      <p className="text-xs font-mono font-bold text-emerald-400 mt-1">{appointment?.meta?.roomNumber || 'AB-101'}</p>
                    </div>
                  </div>
                  <div className="w-full flex items-start gap-2 rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 text-left">
                    <Info size={13} className="text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-blue-300 leading-relaxed">
                      Enter the OTP to start your consultation with the doctor.
                    </p>
                  </div>
                </div>
              )
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
                    <p className="text-[11px] text-slate-450 mt-1.5 leading-relaxed">{step.desc}</p>
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
