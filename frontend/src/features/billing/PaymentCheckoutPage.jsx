import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getInvoiceById } from './billing.api';
import { paymentApi, patientApi, billingApi } from '../../lib/api';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';

const PaymentCheckoutPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [method, setMethod] = useState('UPI');
  const [gateway, setGateway] = useState('RAZORPAY');
  const [showSimulatedModal, setShowSimulatedModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);
  const [useInsurance, setUseInsurance] = useState(true);
  const [unpaidInvoicesList, setUnpaidInvoicesList] = useState([]);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState([]);

  useEffect(() => {
    const fetchInvoiceAndProfile = async () => {
      try {
        if (id === 'all') {
          const profileRes = await patientApi.me();
          const pat = profileRes.data?.patient || profileRes.patient;
          setProfile(pat);
          
          const invRes = await billingApi.getPatientInvoices(pat._id);
          const unpaid = (invRes.data?.invoices || invRes.invoices || []).filter(inv => inv.paymentStatus !== 'paid' && inv.paymentStatus !== 'PAID');
          if (unpaid.length === 0) {
            setError('No unpaid invoices found.');
            setLoading(false);
            return;
          }
          setUnpaidInvoicesList(unpaid);
          setSelectedInvoiceIds(unpaid.map(inv => inv._id));
          
          const totalAmount = unpaid.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
          const subtotal = unpaid.reduce((sum, inv) => sum + (inv.subtotal || 0), 0);
          const discountAmount = unpaid.reduce((sum, inv) => sum + (inv.discountAmount || 0), 0);
          const gstAmount = unpaid.reduce((sum, inv) => sum + (inv.gstAmount || 0), 0);
          
          const hasIns = pat.insuranceDetails?.coverageAmount > 0;
          const remainingCoverage = pat.insuranceDetails?.remainingCoverage || 0;
          const calculatedCoverage = hasIns ? Math.min(totalAmount * 0.8, remainingCoverage) : 0;
          
          const virtualInv = {
            _id: 'all',
            invoiceNumber: 'ALL-UNPAID-BILLS',
            serviceType: 'Multiple Services',
            subtotal,
            discountAmount,
            gstAmount,
            totalAmount,
            insuranceCoveredAmount: calculatedCoverage,
            patientPayableAmount: totalAmount - calculatedCoverage
          };
          setInvoice(virtualInv);
          if (calculatedCoverage <= 0) {
            setUseInsurance(false);
          }
        } else {
          const res = await getInvoiceById(id);
          const inv = res.data.invoice;
          setInvoice(inv);
          
          try {
            const profileRes = await patientApi.me();
            const pat = profileRes.data?.patient || profileRes.patient;
            setProfile(pat);
            
            const hasIns = pat.insuranceDetails?.coverageAmount > 0;
            const remainingCoverage = pat.insuranceDetails?.remainingCoverage || 0;
            const calculatedCoverage = inv.insuranceCoveredAmount > 0 
              ? inv.insuranceCoveredAmount 
              : (hasIns ? Math.min((inv.totalAmount || 0) * 0.8, remainingCoverage) : 0);
              
            if (calculatedCoverage <= 0) {
              setUseInsurance(false);
            }
          } catch (profileErr) {
            console.error('Failed to load profile:', profileErr);
            if (inv && inv.insuranceCoveredAmount <= 0) {
              setUseInsurance(false);
            }
          }
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load checkout details.');
      } finally {
        setLoading(false);
      }
    };
    fetchInvoiceAndProfile();
  }, [id]);

  const selectedInvoices = id === 'all'
    ? unpaidInvoicesList.filter(inv => selectedInvoiceIds.includes(inv._id))
    : (invoice ? [invoice] : []);

  const totalAmount = selectedInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
  const subtotal = selectedInvoices.reduce((sum, inv) => sum + (inv.subtotal || 0), 0);
  const discountAmount = selectedInvoices.reduce((sum, inv) => sum + (inv.discountAmount || 0), 0);
  const gstAmount = selectedInvoices.reduce((sum, inv) => sum + (inv.gstAmount || 0), 0);

  const coveredAmount = id === 'all'
    ? selectedInvoices.reduce((sum, inv) => {
        const remainingCoverage = profile?.insuranceDetails?.remainingCoverage || 0;
        const hasIns = profile?.insuranceDetails?.coverageAmount > 0;
        const calculatedCoverage = hasIns ? Math.min((inv.totalAmount || 0) * 0.8, remainingCoverage) : 0;
        return sum + (inv.insuranceCoveredAmount > 0 ? inv.insuranceCoveredAmount : calculatedCoverage);
      }, 0)
    : (invoice?.insuranceCoveredAmount > 0
        ? invoice.insuranceCoveredAmount
        : (profile?.insuranceDetails?.coverageAmount > 0
            ? Math.min((invoice?.totalAmount || 0) * 0.8, (profile?.insuranceDetails?.remainingCoverage || 0))
            : 0));

  const finalPayable = useInsurance ? (totalAmount - coveredAmount) : totalAmount;
  const reductionPercent = totalAmount > 0 ? Math.round((coveredAmount / totalAmount) * 100) : 0;

  const handleInitiatePayment = async () => {
    if (id === 'all' && selectedInvoiceIds.length === 0) {
      setError('Please select at least one bill to pay.');
      return;
    }
    setProcessing(true);
    setError('');
    try {
      if (gateway === 'RAZORPAY') {
        const res = await paymentApi.createOrder({
          invoiceId: invoice._id,
          selectedInvoiceIds: id === 'all' ? selectedInvoiceIds : undefined,
          method,
          gateway: 'RAZORPAY',
          useInsurance
        });
        setCreatedOrder(res.data);
        setShowSimulatedModal(true);
      } else {
        // Cash or manual payment
        const res = await paymentApi.createOrder({
          invoiceId: invoice._id,
          selectedInvoiceIds: id === 'all' ? selectedInvoiceIds : undefined,
          method,
          gateway: 'MANUAL',
          useInsurance
        });
        await paymentApi.verifyPayment({
          gatewayOrderId: res.data.gatewayOrderId,
          gatewayPaymentId: `pay_manual_${Math.random().toString(36).substring(7)}`,
          gatewaySignature: 'sig_manual_bypass'
        });
        navigate(`/billing/${id}/success`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Payment initiation failed.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSimulatePayment = async (success) => {
    setProcessing(true);
    setShowSimulatedModal(false);
    try {
      if (success) {
        await paymentApi.verifyPayment({
          gatewayOrderId: createdOrder.gatewayOrderId,
          gatewayPaymentId: `pay_rzp_mock_${Math.random().toString(36).substring(7)}`,
          gatewaySignature: `sig_rzp_mock_${Math.random().toString(36).substring(7)}`
        });
        navigate(`/billing/${id}/success`);
      } else {
        navigate(`/billing/${id}/failure`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Payment verification failed.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error && !invoice) return <ErrorState title="Checkout Error" description={error} />;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-3xl shadow-xl border border-stone-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-8">
          <h1 className="text-2xl font-bold">Secure Checkout</h1>
          <p className="opacity-90 text-sm mt-1">Invoice: {invoice?.invoiceNumber}</p>
        </div>

        {/* Invoice details */}
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            {id === 'all' && (
              <div className="space-y-3 bg-stone-50 p-5 rounded-2xl border border-stone-200">
                <h3 className="text-sm font-bold text-stone-750">Select Bills to Pay</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {unpaidInvoicesList.map(inv => (
                    <label key={inv._id} className="flex items-center gap-3 p-3.5 bg-white rounded-xl border border-stone-200 hover:border-emerald-500 cursor-pointer transition">
                      <input
                        type="checkbox"
                        checked={selectedInvoiceIds.includes(inv._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedInvoiceIds([...selectedInvoiceIds, inv._id]);
                          } else {
                            setSelectedInvoiceIds(selectedInvoiceIds.filter(iid => iid !== inv._id));
                          }
                        }}
                        className="w-4 h-4 text-emerald-600 border-stone-300 rounded focus:ring-emerald-500 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0 text-xs">
                        <p className="font-semibold text-stone-800">
                          {inv.serviceType} (#{inv.invoiceNumber || inv._id?.slice(-6)})
                        </p>
                        <p className="text-stone-500">
                          {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('en-IN') : '—'}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-stone-800">
                        ₹{(inv.totalAmount || 0).toLocaleString('en-IN')}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <h2 className="text-lg font-semibold text-stone-800 border-b pb-2">Invoice Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-stone-500">Service Type:</span>
                <span className="font-semibold text-stone-800">{invoice?.serviceType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Subtotal:</span>
                <span className="text-stone-700">₹{subtotal}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Discount:</span>
                  <span>-₹{discountAmount}</span>
                </div>
              )}
              {gstAmount > 0 && (
                <div className="flex justify-between">
                  <span>GST:</span>
                  <span>+₹{gstAmount}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-3 font-semibold text-stone-800">
                <span>Total Bill:</span>
                <span>₹{totalAmount}</span>
              </div>
            </div>

            {/* Insurance details */}
            {coveredAmount > 0 && (
              <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
                    🛡️ Insurance Coverage Available
                  </h3>
                  <input
                    type="checkbox"
                    id="useInsuranceCheckbox"
                    checked={useInsurance}
                    onChange={(e) => setUseInsurance(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 border-emerald-300 rounded focus:ring-emerald-500 cursor-pointer"
                  />
                </div>
                <label htmlFor="useInsuranceCheckbox" className="text-xs text-emerald-600 block cursor-pointer font-semibold">
                  Use insurance coverage to reduce bill amount.
                </label>
                {useInsurance && (
                  <div className="space-y-2 pt-2 border-t border-emerald-200 text-sm text-emerald-700">
                    <div className="flex justify-between">
                      <span>Covered Amount ({reductionPercent}% reduction):</span>
                      <span>-₹{coveredAmount}</span>
                    </div>
                  </div>
                )}
                <div className="flex justify-between text-sm text-emerald-800 font-bold border-t border-emerald-200 pt-2">
                  <span>Payable Now:</span>
                  <span>₹{finalPayable}</span>
                </div>
              </div>
            )}
          </div>

          {/* Payment options */}
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-stone-800 border-b pb-2">Payment Details</h2>

            {/* Gateways */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">Gateway</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setGateway('RAZORPAY')}
                  className={`py-3 px-4 rounded-xl border-2 text-sm font-medium transition ${
                    gateway === 'RAZORPAY' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-stone-200 text-stone-600'
                  }`}
                >
                  Razorpay (Test Mode)
                </button>
                <button
                  type="button"
                  onClick={() => setGateway('MANUAL')}
                  className={`py-3 px-4 rounded-xl border-2 text-sm font-medium transition ${
                    gateway === 'MANUAL' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-stone-200 text-stone-600'
                  }`}
                >
                  Manual / Cash
                </button>
              </div>
            </div>

            {/* Methods */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">Payment Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none"
              >
                <option value="UPI">UPI (GPay/PhonePe)</option>
                <option value="CARD">Credit/Debit Card</option>
                <option value="NET_BANKING">Net Banking</option>
                <option value="CASH">Cash Payment</option>
              </select>
            </div>

            {error && <div className="text-red-600 text-sm font-medium">{error}</div>}

            <button
              onClick={handleInitiatePayment}
              disabled={processing}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg transition disabled:opacity-50"
            >
              {processing ? 'Processing...' : `Pay ₹${finalPayable}`}
            </button>
            <div className="text-center">
              <Link to={`/billing/${id}`} className="text-xs font-semibold text-stone-500 hover:text-stone-800">
                Cancel & Go Back
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Simulated Razorpay Overlay Modal */}
      {showSimulatedModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-stone-100 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b pb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">💳</span>
                <h3 className="font-bold text-stone-800 text-lg">Razorpay Test Gateway</h3>
              </div>
              <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">TEST MODE</span>
            </div>

            <div className="space-y-4">
              <p className="text-stone-600 text-sm">
                You are paying <span className="font-semibold text-stone-800">₹{finalPayable}</span> to <span className="font-semibold text-stone-800">Clinic AI</span>.
              </p>
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/60 text-xs text-stone-500 font-mono space-y-2">
                <div>Order ID: {createdOrder?.gatewayOrderId}</div>
                <div>Payment ID: {createdOrder?.paymentId}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <button
                onClick={() => handleSimulatePayment(true)}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow transition"
              >
                Simulate Success
              </button>
              <button
                onClick={() => handleSimulatePayment(false)}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold shadow transition"
              >
                Simulate Fail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentCheckoutPage;
