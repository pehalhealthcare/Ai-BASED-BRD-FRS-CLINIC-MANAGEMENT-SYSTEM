import { useState, useEffect, useCallback } from 'react';
import { CreditCard, Printer, XCircle, Info, RefreshCw, CheckCircle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { procedureApi, billingApi } from '../../lib/api';
import toast from 'react-hot-toast';

export default function PendingProcedurePayments({ onPaymentSuccess }) {
  const [procedures, setProcedures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentMode, setPaymentMode] = useState('cash');
  const [transactionId, setTransactionId] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const res = await procedureApi.list({ status: 'Payment Pending' });
      setProcedures(res.procedures || res.data?.procedures || []);
    } catch (err) {
      console.error('Failed to fetch pending procedure payments:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
    const interval = setInterval(fetchPending, 15000);
    return () => clearInterval(interval);
  }, [fetchPending]);

  // Group procedures by invoiceId/consultationId
  const groupedPayments = procedures.reduce((acc, proc) => {
    const key = proc.invoiceId?._id || proc.consultationId;
    if (!acc[key]) {
      acc[key] = {
        invoiceId: proc.invoiceId?._id,
        invoiceNumber: proc.invoiceId?.invoiceNumber || 'PENDING',
        patientName: proc.patientId?.fullName || 'Walk-in Patient',
        patientId: proc.patientId?._id || 'N/A',
        appointmentId: proc.appointmentId || 'N/A',
        consultationId: proc.consultationId,
        doctorName: proc.doctorId?.fullName || 'General Physician',
        totalAmount: 0,
        procedures: []
      };
    }
    acc[key].totalAmount += proc.totalAmount;
    acc[key].procedures.push(proc);
    return acc;
  }, {});

  const paymentGroups = Object.values(groupedPayments);

  const handleCollectPaymentClick = (group) => {
    setSelectedInvoice(group);
    setPaymentMode('cash');
    setTransactionId('');
    setPaymentNotes('');
  };

  const handleProcessPayment = async () => {
    if (!selectedInvoice) return;
    setProcessingPayment(true);
    try {
      await procedureApi.pay(selectedInvoice.invoiceId, {
        amount: selectedInvoice.totalAmount,
        paymentMode,
        transactionId,
        notes: paymentNotes || `Procedure fee for ${selectedInvoice.procedures.map(p => p.name).join(', ')}`
      });
      toast.success('Payment collected and verified successfully!');
      setSelectedInvoice(null);
      fetchPending();
      if (onPaymentSuccess) onPaymentSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment processing failed.');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleCancelProcedure = async (procId) => {
    if (!window.confirm('Are you sure you want to cancel this procedure?')) return;
    try {
      await procedureApi.cancel(procId, { reason: 'Cancelled by Receptionist' });
      toast.success('Procedure cancelled successfully.');
      fetchPending();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel procedure.');
    }
  };

  const handlePrintInvoice = async (invoiceId) => {
    if (!invoiceId) return;
    try {
      const response = await billingApi.downloadInvoicePdf(invoiceId);
      const file = new Blob([response], { type: 'application/pdf' });
      const fileURL = URL.createObjectURL(file);
      window.open(fileURL);
    } catch (err) {
      toast.error('Failed to download invoice PDF');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-150 shadow-sm p-5 space-y-4">
      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <CreditCard className="text-teal-655" size={16} />
            Pending Procedure Payments
          </h3>
          <p className="text-[11px] text-slate-400">Collect payments before procedures begin</p>
        </div>
        <button onClick={fetchPending} className="text-slate-400 hover:text-slate-600 transition">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {paymentGroups.length === 0 ? (
        <div className="text-center py-6 text-slate-400 text-xs italic">
          No pending procedure payments.
        </div>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
          {paymentGroups.map((group) => {
            const isExpanded = expandedId === group.invoiceId;

            return (
              <div key={group.invoiceId || group.consultationId} className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{group.patientName}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">Doctor: {group.doctorName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-extrabold text-indigo-700">₹{group.totalAmount}</p>
                    <span className="text-[8px] font-black uppercase bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                      Unpaid
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1 border-t border-slate-100/50">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : group.invoiceId)}
                    className="text-[10px] font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1"
                  >
                    {group.procedures.length} Procedure{group.procedures.length > 1 ? 's' : ''}
                    {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                  </button>
                  <div className="flex items-center gap-1.5">
                    {group.invoiceId && (
                      <button
                        onClick={() => handlePrintInvoice(group.invoiceId)}
                        className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition"
                        title="Print Invoice"
                      >
                        <Printer size={12} />
                      </button>
                    )}
                    <button
                      onClick={() => handleCollectPaymentClick(group)}
                      className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-bold rounded-lg transition"
                    >
                      Collect Payment
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="pl-2 pt-2 space-y-1.5 border-l-2 border-indigo-200 mt-1">
                    {group.procedures.map((p) => (
                      <div key={p._id} className="flex justify-between items-center text-[10px]">
                        <span className="font-semibold text-slate-600">{p.name} (x{p.quantity})</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-700">₹{p.totalAmount}</span>
                          <button
                            onClick={() => handleCancelProcedure(p._id)}
                            className="text-rose-500 hover:text-rose-700 p-0.5"
                            title="Cancel Procedure"
                          >
                            <XCircle size={10} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Collect Payment Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-900">Record Procedure Payment</h3>
              <button onClick={() => setSelectedInvoice(null)} className="text-slate-400 hover:text-slate-600 text-xs">Close</button>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1">
                <div className="flex justify-between font-semibold"><span className="text-slate-500">Patient:</span> <span className="text-slate-800">{selectedInvoice.patientName}</span></div>
                <div className="flex justify-between font-semibold"><span className="text-slate-500">Amount Due:</span> <span className="text-indigo-700 font-extrabold">₹{selectedInvoice.totalAmount}</span></div>
                <div className="flex justify-between font-semibold"><span className="text-slate-500">Procedures:</span> <span className="text-slate-850 font-bold">{selectedInvoice.procedures.map(p => p.name).join(', ')}</span></div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Payment Method</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI / QR Code</option>
                  <option value="net_banking">Net Banking</option>
                  <option value="wallet">Wallet</option>
                  <option value="insurance">Insurance</option>
                  <option value="mixed">Mixed Payment</option>
                </select>
              </div>

              {paymentMode !== 'cash' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Transaction ID / Reference</label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="e.g. UPI Ref Number"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Notes</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Additional payment notes..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessPayment}
                disabled={processingPayment}
                className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-350 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
              >
                {processingPayment && <Loader2 size={13} className="animate-spin" />}
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
