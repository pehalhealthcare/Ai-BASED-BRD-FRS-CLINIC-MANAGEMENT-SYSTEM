import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Calendar, User, UserCheck, Shield, Clock, FileText, 
  MapPin, AlertCircle, CheckCircle, RotateCcw, Paperclip, CreditCard 
} from 'lucide-react';
import { procedureApi } from '../../lib/api';
import toast from 'react-hot-toast';

export default function ProcedureDetailPage() {
  const { procedureId } = useParams();
  const navigate = useNavigate();
  const [procedure, setProcedure] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const res = await procedureApi.get(procedureId);
        setProcedure(res.procedure || res.data?.procedure || null);
      } catch (err) {
        toast.error('Failed to load procedure details');
      } finally {
        setLoading(false);
      }
    };
    if (procedureId) {
      fetchDetails();
    }
  }, [procedureId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
        <span className="animate-spin text-indigo-600 text-2xl mb-4">⌛</span>
        <p className="text-xs font-bold">Loading procedure details...</p>
      </div>
    );
  }

  if (!procedure) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 space-y-4">
        <AlertCircle className="mx-auto text-rose-500" size={32} />
        <p className="text-sm font-bold">Procedure not found.</p>
        <button 
          onClick={() => navigate('/procedures')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
        >
          Back to Procedures
        </button>
      </div>
    );
  }

  // Future-ready hooks/structure for status-specific workflows
  // You can plugin editable routes or components here when the status matching triggers.
  const getStatusAction = (status) => {
    switch (status) {
      case 'Payment Pending':
        return { label: 'Verify & Collect Payment', route: `/billing/${procedure.invoiceId || ''}/checkout`, disabled: true };
      case 'Ready To Perform':
        return { label: 'Prepare Room & Start', route: `/procedures/${procedure._id}/perform`, disabled: true };
      case 'In Progress':
        return { label: 'Mark as Completed', route: `/procedures/${procedure._id}/complete`, disabled: true };
      default:
        return null;
    }
  };

  const statusAction = getStatusAction(procedure.status);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Payment Pending':
        return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'Ready To Perform':
        return 'bg-purple-50 text-purple-600 border-purple-100';
      case 'Called':
      case 'In Progress':
        return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'Completed':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'Cancelled Before Payment':
      case 'Cancelled After Payment':
      case 'Cancelled':
        return 'bg-rose-50 text-rose-600 border-rose-100';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-1">
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <button
          onClick={() => navigate('/procedures')}
          className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft size={16} /> Back to Procedures
        </button>

        {statusAction && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 italic">Future Action Placeholder:</span>
            <button
              disabled
              className="px-4 py-2 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl text-xs font-bold cursor-not-allowed"
              title={`${statusAction.label} (Flow disabled for now)`}
            >
              {statusAction.label}
            </button>
          </div>
        )}
      </div>

      {/* Main Header card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            <Shield size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-black text-slate-900">{procedure.name}</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(procedure.status)}`}>
                {procedure.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Category: <span className="font-bold text-slate-600">{procedure.category || 'Clinical'}</span> | ID: {procedure._id}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-right">
          <div>
            <p className="text-slate-400 font-semibold">Amount</p>
            <p className="text-lg font-black text-slate-800">INR {procedure.amount || 0}</p>
          </div>
        </div>
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Details Cards */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card 1: Patient & Appointment Info */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <User size={14} /> Patient & Appointment Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <p className="text-slate-400">Patient Name</p>
                <p className="font-bold text-slate-800">{procedure.patientId?.fullName || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-slate-400">UHID / Patient ID</p>
                <p className="font-bold text-slate-800">{procedure.patientId?.patientCode || procedure.patientId?._id || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-slate-400">Referenced Doctor</p>
                <p className="font-bold text-slate-800">{procedure.doctorId?.fullName || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-slate-400">Appointment Type</p>
                <p className="font-bold text-slate-800">
                  <span className="px-2 py-0.5 rounded-full bg-slate-50 border border-slate-100 font-extrabold text-[10px]">
                    {procedure.consultationId ? 'Consultation Reference' : 'Direct Booking'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Clinical Details */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <FileText size={14} /> Clinical Execution details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <p className="text-slate-400">Assigned Staff</p>
                <p className="font-bold text-slate-800">{procedure.performingStaff || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-slate-400">Assigned Room</p>
                <p className="font-bold text-slate-800">{procedure.room || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-slate-400">Scheduled Time</p>
                <p className="font-bold text-slate-800">
                  {procedure.scheduledTime ? new Date(procedure.scheduledTime).toLocaleString() : 'N/A'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-slate-400">Completion Time</p>
                <p className="font-bold text-slate-800">
                  {procedure.completedAt ? new Date(procedure.completedAt).toLocaleString() : 'N/A'}
                </p>
              </div>

              <div className="md:col-span-2 border-t border-slate-50 pt-3 space-y-1">
                <p className="text-slate-400">Equipment Used</p>
                <p className="font-bold text-slate-800">
                  {procedure.equipmentUsed?.length > 0 ? procedure.equipmentUsed.join(', ') : 'None logged'}
                </p>
              </div>

              <div className="md:col-span-2 space-y-1">
                <p className="text-slate-400">Clinical Notes</p>
                <p className="text-slate-700 bg-slate-50 border border-slate-100 p-2.5 rounded-xl whitespace-pre-wrap leading-relaxed text-[11px]">
                  {procedure.notes || 'No clinical execution notes logged yet.'}
                </p>
              </div>

              {procedure.complications && (
                <div className="md:col-span-2 space-y-1">
                  <p className="text-slate-400">Complications</p>
                  <p className="text-rose-700 bg-rose-50 border border-rose-100 p-2.5 rounded-xl whitespace-pre-wrap leading-relaxed text-[11px]">
                    {procedure.complications}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Billing & Payments */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <CreditCard size={14} /> Billing & Invoice Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <p className="text-slate-400">Invoice ID</p>
                <p className="font-bold text-slate-800">{procedure.invoiceId || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-slate-400">Payment Status</p>
                <p className="font-bold text-slate-800">
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                    procedure.paymentStatus === 'Paid' 
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      : 'bg-amber-50 text-amber-600 border border-amber-100'
                  }`}>
                    {procedure.paymentStatus || 'Pending'}
                  </span>
                </p>
              </div>
              {procedure.refundDetails?.refundedAmount > 0 && (
                <>
                  <div className="space-y-1">
                    <p className="text-slate-400">Refunded Amount</p>
                    <p className="font-bold text-rose-600">INR {procedure.refundDetails.refundedAmount}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-400">Refund Status</p>
                    <p className="font-bold text-slate-600">{procedure.refundDetails.status}</p>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Timeline & Logs */}
        <div className="space-y-6">
          
          {/* Audit Logs / Timeline */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Clock size={14} /> Timeline History
            </h3>

            <div className="relative pl-4 border-l border-slate-100 space-y-6">
              {procedure.timeline && procedure.timeline.length > 0 ? (
                procedure.timeline.map((log, index) => (
                  <div key={index} className="relative">
                    {/* Circle marker */}
                    <div className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-indigo-600 border border-white" />
                    
                    <div className="text-xs space-y-0.5">
                      <p className="font-bold text-slate-800">{log.status}</p>
                      <p className="text-slate-400 text-[10px]">
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                      {log.notes && (
                        <p className="text-slate-500 text-[11px] leading-relaxed italic bg-slate-50 p-1.5 rounded-lg border border-slate-100 mt-1">
                          {log.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic">No timeline entries recorded.</p>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
