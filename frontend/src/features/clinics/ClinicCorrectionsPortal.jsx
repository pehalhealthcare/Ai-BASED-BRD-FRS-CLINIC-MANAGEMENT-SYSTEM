import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { clinicApi } from '../../lib/api';
import {
  AlertTriangle, XCircle, UploadCloud, Edit3, Send, RefreshCw,
  LogOut, Sparkles, ChevronRight, FileText, CheckCircle, IndianRupee,
  ArrowLeft, Clock, Phone, Mail
} from 'lucide-react';

const ClinicCorrectionsPortal = () => {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const clinic = user?.clinic || {};
  const [view, setView] = useState('rejection'); // 'rejection' | 'edit' | 'refund'
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundSubmitted, setRefundSubmitted] = useState(clinic.refundStatus === 'Pending');

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const handleResubmit = async () => {
    if (!clinic._id) return;
    setSubmitting(true);
    setError('');
    try {
      await clinicApi.resubmitRegistration(clinic._id, {});
      await refreshUser();
      setSuccess('Your registration has been resubmitted for review. Redirecting...');
      setTimeout(() => navigate('/clinic/status', { replace: true }), 2000);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to resubmit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefundRequest = async () => {
    if (!refundReason.trim()) { setError('Please provide a reason for the refund.'); return; }
    if (!clinic._id) return;
    setSubmitting(true);
    setError('');
    try {
      await clinicApi.requestRefund(clinic._id, { refundReason });
      setRefundSubmitted(true);
      setSuccess('Refund request submitted. Our team will review it shortly.');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to submit refund request.');
    } finally {
      setSubmitting(false);
    }
  };

  const refundStatusColor = {
    Pending: 'bg-amber-100 text-amber-700 border-amber-200',
    Approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    Rejected: 'bg-red-100 text-red-700 border-red-200',
    Refunded: 'bg-blue-100 text-blue-700 border-blue-200',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50/20 to-orange-50/10 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-black text-slate-800 text-lg tracking-tight">AI-CMS</span>
          <span className="ml-2 px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold border border-red-200">Registration Rejected</span>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-sm text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all font-medium">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-10">
        {/* Alert Banner */}
        <div className="bg-gradient-to-r from-red-600 to-rose-600 rounded-3xl p-8 mb-8 text-white shadow-xl shadow-red-200">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <XCircle className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-red-100 text-sm font-semibold uppercase tracking-widest mb-1">Action Required</p>
              <h1 className="text-3xl font-black mb-2">Registration Rejected</h1>
              <p className="text-red-100 text-sm leading-relaxed max-w-lg">
                Your clinic registration requires corrections. Please review the feedback below, correct the information, and resubmit.
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { key: 'rejection', label: 'Rejection Details', icon: AlertTriangle },
            { key: 'edit', label: 'Correct & Resubmit', icon: Edit3 },
            { key: 'refund', label: 'Request Refund', icon: IndianRupee },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => { setView(tab.key); setError(''); setSuccess(''); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  view === tab.key
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" /> {tab.label}
              </button>
            );
          })}
        </div>

        {success && (
          <div className="mb-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-700 font-medium text-sm">
            <CheckCircle className="w-5 h-5 shrink-0" /> {success}
          </div>
        )}
        {error && (
          <div className="mb-5 p-4 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-700 font-medium text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" /> {error}
          </div>
        )}

        {/* ─── Rejection Details View ─────────────────────────────────────── */}
        {view === 'rejection' && (
          <div className="space-y-5">
            {/* Reason */}
            {clinic.rejectionReason && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h3 className="font-black text-slate-800 mb-3 flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-500" /> Reason for Rejection
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed bg-red-50 border border-red-100 rounded-xl p-4">
                  {clinic.rejectionReason}
                </p>
              </div>
            )}

            {/* Comments */}
            {clinic.rejectionComments && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h3 className="font-black text-slate-800 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-500" /> Super Admin Comments
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                  {clinic.rejectionComments}
                </p>
              </div>
            )}

            {/* Incorrect Fields */}
            {clinic.incorrectFields?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h3 className="font-black text-slate-800 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" /> Fields Requiring Correction
                </h3>
                <div className="flex flex-wrap gap-2">
                  {clinic.incorrectFields.map((field, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold">
                      {field}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Requested Documents */}
            {clinic.requestedDocuments?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h3 className="font-black text-slate-800 mb-3 flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-blue-500" /> Documents Requested
                </h3>
                <ul className="space-y-2">
                  {clinic.requestedDocuments.map((doc, i) => (
                    <li key={i} className="flex items-center gap-2 text-slate-600 text-sm">
                      <ChevronRight className="w-4 h-4 text-blue-400 shrink-0" /> {doc}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => setView('edit')}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-200 hover:opacity-90 transition-all"
              >
                <Edit3 className="w-4 h-4" /> Edit & Resubmit
              </button>
              <button
                onClick={() => setView('refund')}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 bg-white text-slate-700 rounded-2xl font-bold text-sm border border-slate-200 hover:bg-slate-50 transition-all"
              >
                <IndianRupee className="w-4 h-4" /> Request Refund
              </button>
            </div>
          </div>
        )}

        {/* ─── Correct & Resubmit View ─────────────────────────────────────── */}
        {view === 'edit' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
            <h2 className="text-xl font-black text-slate-800 mb-2">Correct & Resubmit</h2>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Address the rejection reasons above, then click Resubmit for Approval. For now you can resubmit your current information — contact support if you need to update specific documents.
            </p>

            {/* Checklist of corrections needed */}
            {clinic.incorrectFields?.length > 0 && (
              <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Corrections Needed</p>
                <div className="space-y-2">
                  {clinic.incorrectFields.map((field, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{field}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 text-blue-700 text-sm leading-relaxed mb-6 flex items-start gap-3">
              <Phone className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                Need to update specific details? Email us at{' '}
                <a href="mailto:support@ai-cms.in" className="underline font-semibold">support@ai-cms.in</a>{' '}
                or call{' '}
                <a href="tel:+918000000000" className="underline font-semibold">+91 80000 00000</a>
              </span>
            </div>

            <button
              onClick={handleResubmit}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-200 hover:opacity-90 transition-all disabled:opacity-50"
            >
              {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {submitting ? 'Resubmitting...' : 'Resubmit for Approval'}
            </button>
          </div>
        )}

        {/* ─── Refund Request View ─────────────────────────────────────────── */}
        {view === 'refund' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
            <h2 className="text-xl font-black text-slate-800 mb-2">Request a Refund</h2>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              If you do not wish to continue with the registration, you may request a refund. A ticket will be raised for the Super Admin to review.
            </p>

            {refundSubmitted ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-amber-600" />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">Refund Request Submitted</h3>
                <p className="text-slate-400 text-sm mb-4">
                  Your refund request has been logged. Current status:
                </p>
                <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border ${refundStatusColor[clinic.refundStatus] || refundStatusColor['Pending']}`}>
                  {clinic.refundStatus || 'Pending'}
                </span>
                <p className="text-slate-400 text-xs mt-4">You'll be notified via email once processed.</p>
              </div>
            ) : (
              <>
                <div className="mb-5">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Reason for Refund</label>
                  <textarea
                    value={refundReason}
                    onChange={e => setRefundReason(e.target.value)}
                    rows={4}
                    placeholder="Please explain why you are requesting a refund..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none transition"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 text-amber-700 text-xs mb-6">
                  Refund eligibility is subject to our terms. Approved refunds are typically processed within 7–10 business days.
                </div>

                <button
                  onClick={handleRefundRequest}
                  disabled={submitting || !refundReason.trim()}
                  className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-orange-200 hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <IndianRupee className="w-4 h-4" />}
                  {submitting ? 'Submitting...' : 'Submit Refund Request'}
                </button>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default ClinicCorrectionsPortal;
