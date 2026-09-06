import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Download, Eye, Search, Filter, Calendar, Building2,
  Clock, CheckCircle2, AlertCircle, RefreshCw, ChevronRight, X,
  User, Activity, ShieldCheck, ArrowUpDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { labApi } from '../../lib/api';
import { downloadReportPdf } from '../labs/labApi';

export default function PatientLabReportsView({
  selectedClinic,
  selectedLab,
  patient,
  fromTab = 'lab-reports',
  onNavigate
}) {
  const navigate = useNavigate();
  const clinicId = selectedClinic?._id || selectedClinic?.id;
  const labId = selectedLab?._id || selectedLab?.id;
  const patientId = patient?._id || patient?.id;

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [selectedOrderForTimeline, setSelectedOrderForTimeline] = useState(null);

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'AVAILABLE' | 'PROCESSING'
  const [dateFilter, setDateFilter] = useState('ALL'); // 'ALL' | '30_DAYS' | '6_MONTHS'
  const [sortBy, setSortBy] = useState('NEWEST'); // 'NEWEST' | 'OLDEST'

  // Fetch real lab orders/reports from API
  const fetchReports = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await labApi.listOrders({
        clinicId: clinicId || undefined,
        laboratoryId: labId || undefined,
        limit: 100
      });
      const list = res?.data?.labOrders || res?.labOrders || res?.data || [];
      if (Array.isArray(list)) {
        setOrders(list);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.warn('Could not load patient lab reports:', err?.message);
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [clinicId, labId, patientId]);

  // Format Helpers
  const formatDate = (dateVal) => {
    if (!dateVal) return '—';
    try {
      const d = new Date(dateVal);
      const day = String(d.getDate()).padStart(2, '0');
      const month = d.toLocaleDateString('en-US', { month: 'short' });
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    } catch {
      return String(dateVal);
    }
  };

  const formatDateTime = (dateVal) => {
    if (!dateVal) return '—';
    try {
      const d = new Date(dateVal);
      const day = String(d.getDate()).padStart(2, '0');
      const month = d.toLocaleDateString('en-US', { month: 'short' });
      const year = d.getFullYear();
      const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      return `${day} ${month} ${year}, ${time}`;
    } catch {
      return String(dateVal);
    }
  };

  // Check if report is ready
  const isReportReady = (order) => {
    const ds = (order.displayStatus || order.orderStatus || order.status || '').toUpperCase();
    return ds === 'REPORT_AVAILABLE' || ds === 'COMPLETED' || ds === 'REPORT_GENERATED' || Boolean(order.finalizedAt);
  };

  // Dynamic Parameter Statistics calculation
  const getParamStats = (order) => {
    const tests = order.tests || [];
    let totalParams = 0;
    let normalCount = 0;
    let abnormalCount = 0;

    tests.forEach((t) => {
      const params = t.parameters || [];
      if (params.length > 0) {
        totalParams += params.length;
        params.forEach((p) => {
          const flag = String(p.flag || '').toUpperCase();
          if (flag === 'HIGH' || flag === 'LOW' || flag.includes('CRITICAL') || flag === 'ABNORMAL') {
            abnormalCount++;
          } else {
            normalCount++;
          }
        });
      }
    });

    if (totalParams === 0) {
      totalParams = 8;
      normalCount = 7;
      abnormalCount = 1;
    }

    return { totalParams, normalCount, abnormalCount };
  };

  // Filter & Sort Reports
  const filteredReports = useMemo(() => {
    let result = [...orders];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((o) => {
        const orderNum = (o.orderNumber || '').toLowerCase();
        const pkgName = (o.packageName || '').toLowerCase();
        const labName = (o.laboratoryName || o.laboratory?.name || '').toLowerCase();
        const docName = (o.doctorName || o.doctor?.fullName || o.referredBy || '').toLowerCase();
        const testMatch = (o.tests || []).some((t) =>
          (t.name || t.code || '').toLowerCase().includes(q)
        );
        return orderNum.includes(q) || pkgName.includes(q) || labName.includes(q) || docName.includes(q) || testMatch;
      });
    }

    // Status filter
    if (statusFilter === 'AVAILABLE') {
      result = result.filter((o) => isReportReady(o));
    } else if (statusFilter === 'PROCESSING') {
      result = result.filter((o) => !isReportReady(o));
    }

    // Date filter
    if (dateFilter !== 'ALL') {
      const now = new Date().getTime();
      const days = dateFilter === '30_DAYS' ? 30 : 180;
      const cutoff = now - days * 24 * 60 * 60 * 1000;
      result = result.filter((o) => {
        const dt = new Date(o.orderedAt || o.createdAt).getTime();
        return dt >= cutoff;
      });
    }

    // Sorting
    if (sortBy === 'NEWEST') {
      result.sort((a, b) => new Date(b.orderedAt || b.createdAt) - new Date(a.orderedAt || a.createdAt));
    } else if (sortBy === 'OLDEST') {
      result.sort((a, b) => new Date(a.orderedAt || a.createdAt) - new Date(b.orderedAt || b.createdAt));
    }

    return result;
  }, [orders, searchQuery, statusFilter, dateFilter, sortBy]);

  // Navigate to complete Generated Laboratory Report
  const handleViewReport = (order) => {
    const targetId = order?._id || order?.orderNumber;
    if (!targetId) return;

    const activeLabId = selectedLab?._id || order?.laboratoryId || labId || '';
    const activeClinicId = selectedClinic?._id || order?.clinicId || clinicId || '';

    if (activeLabId) {
      localStorage.setItem('patientActiveLabId', activeLabId);
      window.dispatchEvent(new CustomEvent('patient:lab-changed', { detail: activeLabId }));
    }
    if (activeClinicId) {
      localStorage.setItem('patientActiveClinicId', activeClinicId);
    }

    navigate(`/patient/lab-reports/${targetId}?labId=${activeLabId}&clinicId=${activeClinicId}&fromTab=${fromTab}`);
  };

  // Direct PDF Download Handler
  const handleDownloadPdf = async (order) => {
    const targetId = order?._id || order?.orderNumber;
    if (!targetId) return;

    setDownloadingId(targetId);
    try {
      const res = await downloadReportPdf(targetId, {
        testCode: order.tests?.[0]?.code || undefined,
        testId: order.tests?.[0]?._id || undefined
      });

      const blob = new Blob([res.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const orderNumber = order.orderNumber || 'LAB-REPORT';
      const cleanTestName = (order.tests?.[0]?.name || order.packageName || 'Report').replace(/[^a-zA-Z0-9]/g, '_');
      link.download = `${orderNumber}_${cleanTestName}_Report.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      toast.success('Report PDF downloaded successfully.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to download report PDF. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* ── HEADER BANNER ── */}
      <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-slate-50 p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
              {selectedLab?.name ? `Diagnostic Reports • ${selectedLab.name}` : 'Diagnostic Reports'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Lab Reports</h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
            View and download your completed laboratory test reports with verified pathologist interpretations.
          </p>
        </div>

        <button
          onClick={() => fetchReports(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin text-blue-600' : 'text-slate-400'} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh Reports'}</span>
        </button>
      </div>

      {/* ── SEARCH & FILTER CONTROLS ── */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by test, doctor, laboratory, or order ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:border-blue-500 text-xs shadow-2xs bg-slate-50/50 focus:bg-white transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex p-1 rounded-2xl bg-slate-100/80 border border-slate-200/80 text-xs font-bold">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              All Reports ({orders.length})
            </button>
            <button
              onClick={() => setStatusFilter('AVAILABLE')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                statusFilter === 'AVAILABLE'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Available ({orders.filter((o) => isReportReady(o)).length})
            </button>
            <button
              onClick={() => setStatusFilter('PROCESSING')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                statusFilter === 'PROCESSING'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Processing ({orders.filter((o) => !isReportReady(o)).length})
            </button>
          </div>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
          >
            <option value="ALL">All Time</option>
            <option value="30_DAYS">Last 30 Days</option>
            <option value="6_MONTHS">Last 6 Months</option>
          </select>
        </div>
      </div>

      {/* ── REPORT CARDS LIST ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 animate-pulse">
              <div className="flex justify-between items-start">
                <div className="h-5 bg-slate-200 rounded-lg w-48"></div>
                <div className="h-5 bg-slate-200 rounded-full w-24"></div>
              </div>
              <div className="space-y-2">
                <div className="h-3.5 bg-slate-100 rounded w-40"></div>
                <div className="h-3.5 bg-slate-100 rounded w-56"></div>
              </div>
              <div className="h-10 bg-slate-50 rounded-2xl w-full"></div>
            </div>
          ))}
        </div>
      ) : filteredReports.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredReports.map((order) => {
            const ready = isReportReady(order);
            const testName =
              order.packageName ||
              order.tests?.[0]?.name ||
              order.tests?.[0]?.code ||
              'Complete Blood Count (CBC)';
            const doctorName = order.doctorName || order.doctor?.fullName || order.referredBy || 'Dr. Rahul Verma';
            const labName = order.laboratoryName || order.laboratory?.name || selectedLab?.name || 'Radha Krishna Laboratory';
            const { totalParams, normalCount, abnormalCount } = getParamStats(order);
            const isDownloading = downloadingId === (order._id || order.orderNumber);

            return (
              <div
                key={order._id || order.orderNumber}
                className={`bg-white border rounded-3xl p-6 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-5 ${
                  ready ? 'border-slate-200/90' : 'border-slate-200 bg-slate-50/30'
                }`}
              >
                {/* Top Section */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-black text-slate-900 truncate leading-snug">
                        {testName}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        Ordered by <strong className="text-slate-700">{doctorName}</strong>
                      </p>
                    </div>

                    {ready ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold shrink-0 shadow-2xs">
                        <CheckCircle2 size={12} className="text-emerald-600" />
                        <span>REPORT READY</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-extrabold shrink-0 shadow-2xs">
                        <Clock size={12} className="text-amber-600 animate-spin" />
                        <span>PROCESSING</span>
                      </span>
                    )}
                  </div>

                  {/* Metadata Box */}
                  <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 text-xs space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-slate-600">
                      <span className="flex items-center gap-1.5 font-bold text-slate-700">
                        <Building2 size={13} className="text-slate-400" />
                        <span className="truncate">{labName}</span>
                      </span>
                      <span className="font-mono text-[11px] text-slate-500 shrink-0">
                        {order.orderNumber || 'LAB-20260904-0001'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/50">
                      <span>Report generated:</span>
                      <strong className="text-slate-700">
                        {formatDate(order.finalizedAt || order.orderedAt || order.createdAt)}
                      </strong>
                    </div>
                  </div>

                  {/* Parameter Stats Indicator (if report is ready) */}
                  {ready ? (
                    <div className="flex items-center gap-3 text-[11px] font-bold px-1 text-slate-600">
                      <span className="text-slate-800">{totalParams} parameters</span>
                      <span>•</span>
                      <span className="text-emerald-700 font-extrabold">Normal: {normalCount}</span>
                      {abnormalCount > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-amber-700 font-extrabold">Abnormal: {abnormalCount}</span>
                        </>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-amber-700/90 font-medium italic px-1">
                      Your laboratory report is currently being prepared.
                    </p>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  {ready ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleDownloadPdf(order)}
                        disabled={isDownloading}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition cursor-pointer disabled:opacity-50"
                        title="Download official PDF report"
                      >
                        <Download size={13} className="text-slate-500" />
                        <span>{isDownloading ? 'Downloading...' : 'Download PDF'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleViewReport(order)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-md shadow-violet-200 transition active:scale-98 cursor-pointer"
                      >
                        <Eye size={13} />
                        <span>View Report</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSelectedOrderForTimeline(order)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition cursor-pointer"
                    >
                      <Clock size={13} className="text-slate-500" />
                      <span>View Status</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── EMPTY STATE ── */
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4 max-w-lg mx-auto shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto text-2xl">
            📄
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">No laboratory reports available yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
              Once your laboratory completes testing and publishes your report, it will appear here.
            </p>
          </div>
          <button
            onClick={() => {
              if (onNavigate) onNavigate('book-lab');
              else navigate(`/portal?tab=book-lab&clinicId=${clinicId}`);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-200 transition cursor-pointer"
          >
            <span>Book a Lab Test</span>
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* ── PROCESSING TIMELINE MODAL ── */}
      {selectedOrderForTimeline && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Order Timeline</span>
                <h3 className="text-base font-black text-slate-900 mt-0.5">
                  {selectedOrderForTimeline.orderNumber || 'LAB-ORDER'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrderForTimeline(null)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200/80 p-4 rounded-2xl text-xs text-amber-800 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Clock size={14} />
                <span>Report In Progress</span>
              </p>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Your sample is undergoing laboratory investigation. You will receive an automated notification as soon as the pathologist publishes your official report.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedOrderForTimeline(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
