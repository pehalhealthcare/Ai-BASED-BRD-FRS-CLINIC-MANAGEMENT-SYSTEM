import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck, AlertTriangle, CheckCircle2, Building2,
  Calendar, FileText, Search, ArrowRight, Activity, Award
} from 'lucide-react';
import { verifyReport } from '../features/labs/labApi';
import pehalLogo from '../assets/pehal_logo.svg';

export default function PublicReportVerificationPage() {
  const { reportId, id } = useParams();
  const effectiveReportId = reportId || id || '';

  const [searchId, setSearchId] = useState(effectiveReportId);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(effectiveReportId));
  const [error, setError] = useState('');

  const fetchVerification = useCallback(async (targetId) => {
    if (!targetId || !targetId.trim()) return;
    setLoading(true);
    setError('');
    setData(null);

    try {
      const res = await verifyReport(targetId.trim());
      const result = res.data || res;
      if (result.isValid) {
        setData(result);
      } else {
        setError(result.message || 'The specified Report ID does not match any official laboratory records.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to verify laboratory report. Please check the Report ID and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (effectiveReportId) {
      fetchVerification(effectiveReportId);
    }
  }, [effectiveReportId, fetchVerification]);

  const handleManualSearch = (e) => {
    e.preventDefault();
    if (searchId.trim()) {
      fetchVerification(searchId.trim());
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return String(d);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-purple-50/30 to-slate-100 font-sans text-slate-800 antialiased flex flex-col justify-between">
      {/* ── TOP HEADER ── */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-3.5 shadow-2xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={pehalLogo} alt="PEHAL Healthcare" className="h-8 w-auto object-contain" />
            <div className="h-5 w-px bg-slate-200"></div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black tracking-tight text-slate-900">AICMS</span>
                <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[9px] font-black text-purple-700">
                  VERIFIED
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium leading-none">Diagnostic Document Verification</p>
            </div>
          </div>

          <Link
            to="/login"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
          >
            <span>Patient / Staff Login</span>
            <ArrowRight size={12} />
          </Link>
        </div>
      </header>

      {/* ── MAIN CONTENT AREA ── */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 sm:py-12">
        {/* Verification Search Bar */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-sm mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Official Laboratory Report Verification
              </h1>
              <p className="text-xs text-slate-500">
                Verify the authenticity and integrity of diagnostic reports issued by AICMS accredited laboratories.
              </p>
            </div>
          </div>

          <form onSubmit={handleManualSearch} className="flex flex-col sm:flex-row gap-2 mt-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder="Enter Report ID (e.g. RPT-LAB-20260904-0001)"
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/50 text-xs font-mono font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !searchId.trim()}
              className="rounded-2xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-purple-200 hover:bg-purple-700 transition cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Verifying…' : 'Verify Report'}
            </button>
          </form>
        </div>

        {/* ── RESULT CARDS ── */}
        {loading && (
          <div className="text-center py-12 bg-white rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="h-10 w-10 mx-auto rounded-full border-2 border-purple-600 border-t-transparent animate-spin mb-3"></div>
            <p className="text-xs font-bold text-slate-600">Verifying report in AICMS Diagnostic Registry...</p>
          </div>
        )}

        {error && !loading && (
          <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 text-center shadow-xs animate-in fade-in duration-200">
            <div className="h-12 w-12 mx-auto rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
              <AlertTriangle size={24} />
            </div>
            <h2 className="text-base font-black text-rose-900">Verification Failed</h2>
            <p className="text-xs text-rose-700 mt-1 max-w-md mx-auto leading-relaxed">{error}</p>
            <p className="text-[11px] text-rose-500 mt-3 font-medium">
              Please ensure the Report ID matches the code shown on the official diagnostic report or re-scan the QR code.
            </p>
          </div>
        )}

        {data && !loading && (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-md overflow-hidden animate-in fade-in duration-200">
            {/* Top Status Banner */}
            <div className={`p-6 sm:p-7 border-b ${
              data.isSuperseded
                ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
            }`}>
              <div className="flex items-start gap-4">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  data.isSuperseded ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  <CheckCircle2 size={26} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black uppercase tracking-wider">
                      {data.isSuperseded ? '⚠️ SUPERSEDED LABORATORY REPORT' : '✓ OFFICIAL VERIFIED LABORATORY REPORT'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                      data.isSuperseded
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    }`}>
                      Version {data.version}.0
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-black mt-1">
                    {data.testName || 'Diagnostic Investigation'}
                  </h2>
                  <p className="text-xs mt-1 opacity-80 leading-relaxed">
                    {data.isSuperseded
                      ? 'This version of the laboratory report has been superseded by a newer revised version approved by the pathologist.'
                      : 'This document is authenticated and officially registered on the AICMS National Healthcare Diagnostic Network.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Report ID</span>
                  <p className="font-mono font-black text-slate-900 text-sm">{data.reportNumber}</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Verification Status</span>
                  <p className="font-bold text-emerald-700 flex items-center gap-1.5">
                    <ShieldCheck size={14} />
                    <span>{data.status === 'SUPERSEDED' ? 'Superseded by Revision' : 'Officially Valid & Authentic'}</span>
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Laboratory</span>
                  <p className="font-black text-slate-900 flex items-center gap-1.5">
                    <Building2 size={13} className="text-slate-400" />
                    <span>{data.laboratoryName}</span>
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Referring Clinic</span>
                  <p className="font-black text-slate-900 flex items-center gap-1.5">
                    <Building2 size={13} className="text-slate-400" />
                    <span>{data.clinicName}</span>
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Reported & Published Date</span>
                  <p className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Calendar size={13} className="text-slate-400" />
                    <span>{formatDate(data.publishedAt || data.issuedAt)}</span>
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Authorized Pathologist</span>
                  <p className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Award size={13} className="text-purple-600" />
                    <span>{data.verifiedBy}</span>
                  </p>
                </div>
              </div>

              {/* Privacy Notice */}
              <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100 text-xs text-purple-900 flex items-start gap-3">
                <ShieldCheck size={16} className="text-purple-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-black">Patient Confidentiality & Data Protection</p>
                  <p className="text-[11px] text-purple-800 leading-relaxed">
                    Under healthcare privacy regulations (DISHA/HIPAA), individual clinical values, normal ranges, and patient demographic records are restricted to authenticated patients and authorized clinic personnel.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-slate-200 bg-white px-4 py-4 text-center text-xs text-slate-500">
        <p className="max-w-md mx-auto">
          AICMS Diagnostic Security Registry • Digitally verified by PEHAL Healthcare Platform
        </p>
      </footer>
    </div>
  );
}
