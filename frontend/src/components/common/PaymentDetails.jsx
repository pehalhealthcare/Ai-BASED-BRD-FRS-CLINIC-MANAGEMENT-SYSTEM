import React, { useState, useEffect } from 'react';
import {
  Building2, CreditCard, Copy, Check, QrCode,
  ShieldCheck, AlertCircle, RefreshCw, CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { paymentSettingsApi } from '../../lib/api';

/**
 * Centralized, Reusable Payment Details Component
 * Automatically fetches the active bank account, UPI ID, and QR code from the server.
 * Used across Clinic Registration, Plan Upgrades, Downgrades, Renewals, and Expiry flows.
 */
const PaymentDetails = ({
  amount,
  planName = 'Clinic Subscription',
  onUtrSubmit,
  showUtrInput = true,
  submitting = false
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [details, setDetails] = useState(null);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');

  useEffect(() => {
    let isMounted = true;
    const loadDetails = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await paymentSettingsApi.getActiveDetails();
        const data = res.data?.paymentDetails || res.data || {};
        if (isMounted) {
          setDetails(data);
        }
      } catch (err) {
        console.error('Failed to load active payment details:', err);
        if (isMounted) {
          setError(err.response?.data?.message || 'Unable to load payment configuration.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadDetails();
    return () => { isMounted = false; };
  }, []);

  const handleCopyUpi = () => {
    if (!details?.upiId) return;
    navigator.clipboard.writeText(details.upiId);
    setCopiedUpi(true);
    toast.success('UPI ID copied to clipboard');
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  const handleUtrSubmitForm = (e) => {
    e.preventDefault();
    if (!utrNumber.trim()) {
      toast.error('Please enter the 12-digit UTR / Transaction Reference Number.');
      return;
    }
    if (onUtrSubmit) {
      onUtrSubmit(utrNumber.trim());
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm animate-pulse space-y-4">
        <div className="h-6 w-48 bg-slate-200 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-44 bg-slate-100 rounded-2xl" />
          <div className="h-44 bg-slate-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-2">
        <AlertCircle size={28} className="mx-auto text-rose-500" />
        <h4 className="text-sm font-black text-rose-900">Payment Details Unavailable</h4>
        <p className="text-xs text-rose-700 font-medium">{error || 'Unable to load current payment settings.'}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-6 text-slate-900 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            Official Payment Details
          </span>
          <h3 className="text-lg font-black text-slate-900 mt-1">Make Payment for {planName}</h3>
          <p className="text-xs text-slate-500 font-medium">
            Transfer via UPI scan, UPI ID or Direct NEFT / RTGS / IMPS Bank Transfer.
          </p>
        </div>

        {amount !== undefined && amount !== null && (
          <div className="text-left sm:text-right bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Payable Amount</span>
            <span className="text-xl font-black text-slate-900">₹{Number(amount).toLocaleString('en-IN')}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: QR Code & UPI */}
        <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
          <div className="flex items-center gap-2">
            <QrCode size={18} className="text-emerald-600" />
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Scan UPI QR Code</h4>
          </div>

          <div className="flex items-center justify-center">
            {details.qrCodeUrl ? (
              <div className="w-40 h-40 bg-white border-2 border-slate-200 rounded-2xl p-2.5 flex items-center justify-center shadow-xs">
                <img
                  src={details.qrCodeUrl}
                  alt="Payment QR"
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>
            ) : (
              <div className="w-40 h-40 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 text-xs text-center p-3">
                Scan QR directly using UPI ID below
              </div>
            )}
          </div>

          {/* UPI ID Box */}
          <div className="space-y-1.5 pt-2">
            <label className="text-[10px] uppercase font-bold text-slate-400">UPI ID for Direct Transfer</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={details.upiId || ''}
                className="flex-1 px-3.5 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-900 outline-none select-all"
              />
              <button
                type="button"
                onClick={handleCopyUpi}
                className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0"
              >
                {copiedUpi ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} className="text-slate-400" />}
                <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Bank Transfer Details */}
        <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-5 space-y-3.5 flex flex-col justify-between">
          <div className="flex items-center gap-2 border-b border-slate-200/60 pb-3">
            <Building2 size={18} className="text-emerald-600" />
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Bank Transfer (NEFT / RTGS / IMPS)</h4>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-400 font-semibold">Account Name:</span>
              <span className="font-bold text-slate-900 text-right max-w-[200px] truncate">
                {details.accountName || '—'}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-400 font-semibold">Bank Name:</span>
              <span className="font-bold text-slate-900">
                {details.bankName || '—'}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-400 font-semibold">Account Number:</span>
              <span className="font-mono font-bold text-slate-900 tracking-wider">
                {details.accountNumber || '—'}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-400 font-semibold">IFSC Code:</span>
              <span className="font-mono font-bold text-slate-900 tracking-wider">
                {details.ifscCode || '—'}
              </span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-slate-400 font-semibold">Branch:</span>
              <span className="font-semibold text-slate-800">
                {details.branch || '—'}
              </span>
            </div>
          </div>

          <div className="p-2.5 bg-emerald-50/80 border border-emerald-100 rounded-xl flex items-center gap-2 text-[11px] text-emerald-800 font-semibold">
            <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
            <span>Payments are securely received by PehalHealthcare Technologies Pvt. Ltd.</span>
          </div>
        </div>
      </div>

      {/* Optional UTR Submission Form */}
      {showUtrInput && onUtrSubmit && (
        <form onSubmit={handleUtrSubmitForm} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
          <label className="block text-xs font-black text-slate-800">
            Submit UTR / Transaction Reference Number <span className="text-rose-500">*</span>
          </label>
          <p className="text-[11px] text-slate-400 font-semibold">
            After making the transfer, please enter your 12-digit UTR / Reference ID below for instant admin verification.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
            <input
              type="text"
              required
              value={utrNumber}
              onChange={(e) => setUtrNumber(e.target.value)}
              placeholder="e.g. 624518920134"
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-[#00B96B] focus:ring-2 focus:ring-emerald-100 transition"
            />
            <button
              type="submit"
              disabled={submitting || !utrNumber.trim()}
              className="px-6 py-2.5 bg-[#00B96B] hover:bg-[#00A25D] text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
            >
              {submitting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Submit UTR for Verification</span>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default PaymentDetails;
