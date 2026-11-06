import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, Search, Download, ChevronDown, RefreshCw,
  FileText, CheckCircle2, AlertCircle, XCircle, Clock,
  IndianRupee, TrendingUp, Receipt, Eye, Printer,
  MoreVertical, ArrowUpRight, Filter, CreditCard,
  Calendar as CalendarIcon, User, RotateCcw, X, Check,
  ShieldCheck, DollarSign, Wallet
} from 'lucide-react';
import toast from 'react-hot-toast';

import { billingApi } from '../../lib/api';
import useAuth from '../../hooks/useAuth';
import {
  DATE_RANGE_OPTIONS,
  resolveDateRange,
  validateCustomDateRange,
  calculateBillingKpiComparison,
  checkHistoricalDataAvailability,
  getTodayStr,
  formatDateStr
} from '../../utils/kpiComparison';

/* ─── Currency & Date Formatters ──────────────────────── */
const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const fmtNum = (n) => new Intl.NumberFormat('en-IN').format(n || 0);

const fmtShortDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const fmtDateTime = (d) => {
  if (!d) return '—';
  const dateObj = new Date(d);
  return dateObj.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/* ─── Status Configurations ───────────────────────────── */
const PAYMENT_STATUS = {
  paid:      { label: 'Paid',      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  PAID:      { label: 'Paid',      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  partial:   { label: 'Partial',   cls: 'bg-blue-50 text-blue-700 border-blue-200',          icon: Clock },
  unpaid:    { label: 'Unpaid',    cls: 'bg-amber-50 text-amber-700 border-amber-200',       icon: AlertCircle },
  PENDING:   { label: 'Pending',   cls: 'bg-amber-50 text-amber-700 border-amber-200',       icon: Clock },
  refunded:  { label: 'Refunded',  cls: 'bg-purple-50 text-purple-700 border-purple-200',   icon: RotateCcw },
  REFUNDED:  { label: 'Refunded',  cls: 'bg-purple-50 text-purple-700 border-purple-200',   icon: RotateCcw },
  cancelled: { label: 'Cancelled', cls: 'bg-rose-50 text-rose-700 border-rose-200',          icon: XCircle },
  CANCELLED: { label: 'Cancelled', cls: 'bg-rose-50 text-rose-700 border-rose-200',          icon: XCircle }
};

const SERVICE_TYPE = {
  CONSULTATION: { label: 'Consultation', cls: 'bg-violet-50 text-violet-700 border-violet-100', color: '#8B5CF6' },
  LAB:          { label: 'Laboratory',   cls: 'bg-sky-50 text-sky-700 border-sky-100',          color: '#0EA5E9' },
  PHARMACY:     { label: 'Pharmacy',     cls: 'bg-blue-50 text-blue-700 border-blue-100',        color: '#2563EB' },
  PROCEDURE:    { label: 'Procedure',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-100', color: '#10B981' },
  TREATMENT:    { label: 'Treatment',    cls: 'bg-amber-50 text-amber-700 border-amber-100',     color: '#F59E0B' },
  other:        { label: 'Other',        cls: 'bg-slate-100 text-slate-600 border-slate-200',   color: '#64748B' }
};

/* ─── Sparkline SVG ──────────────────────────────────── */
const Sparkline = ({ color = '#2563EB', isUp = true }) => {
  const pts = (isUp
    ? [4, 9, 7, 14, 10, 16, 14]
    : [15, 12, 13, 8, 10, 6, 4]
  ).map((y, x) => `${x * 10 + 2},${22 - y}`).join(' ');
  return (
    <svg width="68" height="22" viewBox="0 0 68 22" fill="none">
      <polyline points={pts} stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/* ─── Revenue Donut SVG ──────────────────────────────── */
const RevenueDonut = ({ segments, total }) => {
  const size = 124;
  const r = 46;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  const segs = segments.map((d) => {
    const pct = total > 0 ? d.value / total : 0;
    const dash = pct * circ;
    const seg = { ...d, dash, gap: circ - dash, offset };
    offset += dash;
    return seg;
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F1F5F9" strokeWidth="16" />
      {segs.map((s, i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={s.color}
          strokeWidth="16"
          strokeDasharray={`${s.dash} ${s.gap}`}
          strokeDashoffset={-s.offset}
          strokeLinecap="butt"
        />
      ))}
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#0F172A"
        fontSize="12"
        fontWeight="800"
        transform={`rotate(90,${cx},${cy})`}
      >
        {fmt(total)}
      </text>
    </svg>
  );
};

/* ══════════════════════════════════════════════════════
   MAIN BILLING ADMIN COMPONENT
══════════════════════════════════════════════════════ */
const BillingAdminPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const clinicId = user?.clinicId || user?.clinic?._id;

  /* ─── Active Tab ───────────────────────────────────── */
  const [activeTab, setActiveTab] = useState('invoices'); // 'invoices' | 'payments' | 'refunds'

  /* ─── Date Range Filter State ──────────────────────── */
  const [dateRangeOption, setDateRangeOption] = useState(DATE_RANGE_OPTIONS.TODAY);
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  const [customOpen, setCustomOpen] = useState(false);
  const [tempFrom, setTempFrom] = useState('');
  const [tempTo, setTempTo] = useState('');
  const [customError, setCustomError] = useState('');
  const customPopoverRef = useRef(null);

  const resolvedRange = useMemo(() => {
    return resolveDateRange(dateRangeOption, customRange);
  }, [dateRangeOption, customRange]);

  /* ─── Close Custom Popover on Outside Click ────────── */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (customPopoverRef.current && !customPopoverRef.current.contains(e.target)) {
        setCustomOpen(false);
      }
    };
    if (customOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [customOpen]);

  /* ─── Filters & Search ─────────────────────────────── */
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  /* ─── Invoices Data & Progressive Infinite Scroll (5 Per Batch) ── */
  const BATCH_SIZE = 5;
  const [invoices, setInvoices] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalInvoicesCount, setTotalInvoicesCount] = useState(0);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [fetchingNext, setFetchingNext] = useState(false);
  const [loadError, setLoadError] = useState('');

  const tableContainerRef = useRef(null);
  const isFetchingRef = useRef(false);
  const activeRequestIdRef = useRef(0);

  /* ─── Billing Summary Data ─────────────────────────── */
  const [summary, setSummary] = useState(null);
  const [comparisonSummary, setComparisonSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  /* ─── Modals State ─────────────────────────────────── */
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [actionInvoice, setActionInvoice] = useState(null);
  const [submittingAction, setSubmittingAction] = useState(false);

  // Payment form state
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('Cash');
  const [payTxnId, setPayTxnId] = useState('');
  const [payNotes, setPayNotes] = useState('');

  // Refund form state
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');

  /* ─── Check 10-Day Historical Data Availability ────── */
  const hasSufficientHistory = useMemo(() => {
    return checkHistoricalDataAvailability(summary?.oldestDate);
  }, [summary?.oldestDate]);

  /* ─── Load Initial Invoices (Page 1 - 5 Records) ───── */
  const loadInitialInvoices = useCallback(async () => {
    const requestId = ++activeRequestIdRef.current;
    setLoadingInitial(true);
    setLoadError('');
    setPage(1);
    isFetchingRef.current = true;

    // Reset table scroll position to top
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTop = 0;
    }

    try {
      const res = await billingApi.getInvoices({
        page: 1,
        limit: BATCH_SIZE,
        tab: activeTab,
        from: resolvedRange.from,
        to: resolvedRange.to,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        serviceType: typeFilter || undefined
      });

      if (requestId !== activeRequestIdRef.current) return;

      const items = res?.data?.invoices || res?.invoices || [];
      const total = res?.data?.pagination?.total ?? res?.pagination?.total ?? items.length;
      setInvoices(items);
      setTotalInvoicesCount(total);
      setHasMore(items.length < total);
    } catch (err) {
      if (requestId !== activeRequestIdRef.current) return;
      setLoadError(err?.response?.data?.message || 'Failed to load invoices.');
    } finally {
      if (requestId === activeRequestIdRef.current) {
        setLoadingInitial(false);
        isFetchingRef.current = false;
      }
    }
  }, [activeTab, resolvedRange.from, resolvedRange.to, search, statusFilter, typeFilter]);

  /* ─── Fetch Next Page (Infinite Scroll - Next 5 Records) ─ */
  const fetchNextPage = useCallback(async () => {
    if (isFetchingRef.current || fetchingNext || !hasMore) return;
    isFetchingRef.current = true;
    setFetchingNext(true);
    const nextPage = page + 1;
    const currentRequestId = activeRequestIdRef.current;

    try {
      const res = await billingApi.getInvoices({
        page: nextPage,
        limit: BATCH_SIZE,
        tab: activeTab,
        from: resolvedRange.from,
        to: resolvedRange.to,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        serviceType: typeFilter || undefined
      });

      if (currentRequestId !== activeRequestIdRef.current) return;

      const newItems = res?.data?.invoices || res?.invoices || [];
      const total = res?.data?.pagination?.total ?? res?.pagination?.total ?? totalInvoicesCount;

      setInvoices((prev) => {
        const existingIds = new Set(prev.map((i) => String(i._id)));
        const deduplicated = newItems.filter((i) => !existingIds.has(String(i._id)));
        const combined = [...prev, ...deduplicated];
        const nextHasMore = combined.length < total && newItems.length > 0;
        setHasMore(nextHasMore);
        return combined;
      });
      setPage(nextPage);
    } catch (err) {
      if (currentRequestId === activeRequestIdRef.current) {
        toast.error('Failed to load more records.');
      }
    } finally {
      if (currentRequestId === activeRequestIdRef.current) {
        setFetchingNext(false);
        isFetchingRef.current = false;
      }
    }
  }, [fetchingNext, hasMore, page, activeTab, resolvedRange.from, resolvedRange.to, search, statusFilter, typeFilter, totalInvoicesCount]);

  /* ─── Load Billing Summary & Comparison Summary ────── */
  const loadSummaryData = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const [currentRes, compRes] = await Promise.allSettled([
        billingApi.getBillingSummary({ from: resolvedRange.from, to: resolvedRange.to }),
        resolvedRange.comparisonFrom && resolvedRange.comparisonTo
          ? billingApi.getBillingSummary({ from: resolvedRange.comparisonFrom, to: resolvedRange.comparisonTo })
          : Promise.resolve(null)
      ]);

      if (currentRes.status === 'fulfilled') {
        setSummary(currentRes.value?.data || currentRes.value || null);
      }
      if (compRes.status === 'fulfilled') {
        setComparisonSummary(compRes.value?.data || compRes.value || null);
      } else {
        setComparisonSummary(null);
      }
    } catch (err) {
      console.error('Failed to load summary:', err);
    } finally {
      setLoadingSummary(false);
    }
  }, [resolvedRange.from, resolvedRange.to, resolvedRange.comparisonFrom, resolvedRange.comparisonTo]);

  /* ─── Trigger Data Load on Filter Change ───────────── */
  useEffect(() => {
    loadInitialInvoices();
  }, [loadInitialInvoices]);

  useEffect(() => {
    loadSummaryData();
  }, [loadSummaryData]);

  /* ─── Scroll Container Handler (80% Height Trigger) ── */
  const handleTableScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight <= clientHeight) return;
    const scrollRatio = (scrollTop + clientHeight) / scrollHeight;
    if (scrollRatio >= 0.8) {
      if (!isFetchingRef.current && !fetchingNext && hasMore) {
        fetchNextPage();
      }
    }
  };

  /* ─── Date Range Handlers ──────────────────────────── */
  const handleRangeSelect = (option) => {
    setDateRangeOption(option);
    setCustomOpen(false);
    setCustomError('');
  };

  const handleApplyCustom = () => {
    const validation = validateCustomDateRange(tempFrom, tempTo, getTodayStr());
    if (!validation.isValid) {
      setCustomError(validation.error);
      return;
    }
    setCustomError('');
    setCustomRange({ from: tempFrom, to: tempTo });
    setDateRangeOption(DATE_RANGE_OPTIONS.CUSTOM);
    setCustomOpen(false);
  };

  const handleClearCustom = () => {
    setTempFrom('');
    setTempTo('');
    setCustomError('');
    setCustomRange({ from: '', to: '' });
    setDateRangeOption(DATE_RANGE_OPTIONS.TODAY);
    setCustomOpen(false);
  };

  /* ─── Payments & Refunds Derived Lists ─────────────── */
  const paymentsList = useMemo(() => {
    const list = [];
    invoices.forEach((inv) => {
      (inv.payments || []).forEach((p) => {
        list.push({
          _id: p._id || `${inv._id}_${p.paidAt}`,
          transactionId: p.transactionId || `TXN-${String(inv.invoiceNumber).slice(-6)}`,
          invoiceNumber: inv.invoiceNumber,
          invoiceId: inv._id,
          patient: inv.patientId,
          paymentMode: p.paymentMode || 'Cash',
          paidAt: p.paidAt,
          amount: p.amount || 0,
          status: 'COMPLETED'
        });
      });
    });
    return list.sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt));
  }, [invoices]);

  const refundsList = useMemo(() => {
    return invoices
      .filter((inv) => (inv.refundAmount && inv.refundAmount > 0) || inv.paymentStatus === 'refunded')
      .map((inv) => ({
        _id: `REF-${inv._id}`,
        refundId: `REF-${String(inv.invoiceNumber).replace(/^INV-?/, '')}`,
        invoiceNumber: inv.invoiceNumber,
        invoiceId: inv._id,
        patient: inv.patientId,
        refundAmount: inv.refundAmount || inv.paidAmount || 0,
        refundDate: inv.refundedAt || inv.updatedAt || inv.createdAt,
        reason: inv.cancellationReason || inv.notes?.split('Refund recorded:')?.[1]?.trim?.() || 'Requested by patient',
        status: 'Processed'
      }));
  }, [invoices]);

  /* ─── Revenue by Service Type Segments ─────────────── */
  const revenueSegments = useMemo(() => {
    const byType = summary?.revenueByType || {};
    const total = summary?.totalRevenue || Object.values(byType).reduce((s, v) => s + v, 0);

    return Object.entries(byType)
      .map(([key, value]) => {
        const normalizedKey = key.toUpperCase();
        const cfg = SERVICE_TYPE[normalizedKey] || SERVICE_TYPE.other;
        return {
          label: cfg.label,
          value: Number(value || 0),
          color: cfg.color,
          pct: total > 0 ? Math.round((Number(value) / total) * 100) : 0
        };
      })
      .filter((seg) => seg.value > 0);
  }, [summary]);

  /* ─── KPI Comparison Computations ──────────────────── */
  const isCompValid = Boolean(
    resolvedRange.comparisonFrom &&
    resolvedRange.comparisonTo &&
    comparisonSummary &&
    !loadingSummary
  );

  const kpis = useMemo(() => {
    const totalInvCurrent = summary?.totalInvoices ?? 0;
    const totalInvComp = comparisonSummary?.totalInvoices ?? 0;

    const paidInvCurrent = summary?.paidInvoices ?? 0;
    const paidInvComp = comparisonSummary?.paidInvoices ?? 0;

    const pendingInvCurrent = summary?.pendingInvoices ?? (summary?.unpaidInvoices || 0) + (summary?.partialInvoices || 0);
    const pendingInvComp = comparisonSummary?.pendingInvoices ?? (comparisonSummary?.unpaidInvoices || 0) + (comparisonSummary?.partialInvoices || 0);

    const totalRevCurrent = summary?.totalRevenue ?? 0;
    const totalRevComp = comparisonSummary?.totalRevenue ?? 0;

    const collectedCurrent = summary?.collectedAmount ?? 0;
    const collectedComp = comparisonSummary?.collectedAmount ?? 0;

    return [
      {
        label: 'Total Invoices',
        value: fmtNum(totalInvCurrent),
        icon: Receipt,
        color: '#2563EB',
        bg: 'bg-blue-50 text-blue-600 border border-blue-100',
        comparison: calculateBillingKpiComparison(
          totalInvCurrent,
          totalInvComp,
          isCompValid,
          resolvedRange.comparisonLabel,
          hasSufficientHistory
        )
      },
      {
        label: 'Paid Invoices',
        value: fmtNum(paidInvCurrent),
        icon: CheckCircle2,
        color: '#10B981',
        bg: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
        comparison: calculateBillingKpiComparison(
          paidInvCurrent,
          paidInvComp,
          isCompValid,
          resolvedRange.comparisonLabel,
          hasSufficientHistory
        )
      },
      {
        label: 'Pending Invoices',
        value: fmtNum(pendingInvCurrent),
        icon: Clock,
        color: '#F59E0B',
        bg: 'bg-amber-50 text-amber-600 border border-amber-100',
        comparison: calculateBillingKpiComparison(
          pendingInvCurrent,
          pendingInvComp,
          isCompValid,
          resolvedRange.comparisonLabel,
          hasSufficientHistory
        )
      },
      {
        label: 'Total Revenue',
        value: fmt(totalRevCurrent),
        icon: TrendingUp,
        color: '#6366F1',
        bg: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
        comparison: calculateBillingKpiComparison(
          totalRevCurrent,
          totalRevComp,
          isCompValid,
          resolvedRange.comparisonLabel,
          hasSufficientHistory
        )
      },
      {
        label: 'Collected Amount',
        value: fmt(collectedCurrent),
        icon: IndianRupee,
        color: '#0EA5E9',
        bg: 'bg-sky-50 text-sky-600 border border-sky-100',
        comparison: calculateBillingKpiComparison(
          collectedCurrent,
          collectedComp,
          isCompValid,
          resolvedRange.comparisonLabel,
          hasSufficientHistory
        )
      }
    ];
  }, [summary, comparisonSummary, isCompValid, resolvedRange.comparisonLabel, hasSufficientHistory]);

  /* ─── Helpers: Patient Display ─────────────────────── */
  const getPatientDisplay = (patient) => {
    if (!patient) return { name: 'Direct Walk-in', pid: '—', initials: 'PT' };
    const name = patient.fullName || [patient.firstName, patient.lastName].filter(Boolean).join(' ') || patient.name || 'Patient';
    const pid = patient.patientId || patient.pid || '—';
    const initials = (name.replace(/^(Mr|Mrs|Ms|Dr)\.?\s+/i, '').slice(0, 2) || 'PT').toUpperCase();
    return { name, pid, initials };
  };

  /* ─── Record Payment Submission ────────────────────── */
  const handleRecordPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!actionInvoice || !payAmount || Number(payAmount) <= 0) {
      toast.error('Please enter a valid payment amount.');
      return;
    }
    setSubmittingAction(true);
    try {
      await billingApi.recordPayment(actionInvoice._id, {
        amount: Number(payAmount),
        paymentMode: payMode,
        transactionId: payTxnId.trim() || undefined,
        notes: payNotes.trim() || undefined
      });
      toast.success('Payment recorded successfully.');
      setPaymentModalOpen(false);
      setActionInvoice(null);
      setPayAmount('');
      setPayTxnId('');
      setPayNotes('');
      loadInitialInvoices();
      loadSummaryData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to record payment.');
    } finally {
      setSubmittingAction(false);
    }
  };

  /* ─── Record Refund Submission ─────────────────────── */
  const handleRecordRefundSubmit = async (e) => {
    e.preventDefault();
    if (!actionInvoice || !refundAmount || Number(refundAmount) <= 0) {
      toast.error('Please enter a valid refund amount.');
      return;
    }
    if (!refundReason.trim()) {
      toast.error('Please enter a reason for the refund.');
      return;
    }
    setSubmittingAction(true);
    try {
      await billingApi.recordRefund(actionInvoice._id, {
        amount: Number(refundAmount),
        reason: refundReason.trim()
      });
      toast.success('Refund processed successfully.');
      setRefundModalOpen(false);
      setActionInvoice(null);
      setRefundAmount('');
      setRefundReason('');
      loadInitialInvoices();
      loadSummaryData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to record refund.');
    } finally {
      setSubmittingAction(false);
    }
  };

  /* ─── Export Reports ───────────────────────────────── */
  const handleExport = () => {
    let rows = [];
    let headers = [];
    let filename = `Billing_${activeTab}_${resolvedRange.from}_to_${resolvedRange.to}.csv`;

    if (activeTab === 'invoices') {
      if (invoices.length === 0) {
        toast.error('No invoices to export.');
        return;
      }
      headers = ['Invoice Number', 'Patient Name', 'Patient ID', 'Type', 'Date', 'Amount', 'Paid', 'Due', 'Status'];
      rows = invoices.map((inv) => {
        const pt = getPatientDisplay(inv.patientId);
        return [
          inv.invoiceNumber,
          `"${pt.name.replace(/"/g, '""')}"`,
          pt.pid,
          inv.serviceType || 'Consultation',
          fmtDateTime(inv.invoiceDate || inv.createdAt),
          inv.totalAmount || 0,
          inv.paidAmount || 0,
          inv.dueAmount || 0,
          inv.paymentStatus || 'unpaid'
        ];
      });
    } else if (activeTab === 'payments') {
      if (paymentsList.length === 0) {
        toast.error('No payments to export.');
        return;
      }
      headers = ['Transaction ID', 'Invoice Number', 'Patient Name', 'Method', 'Payment Date', 'Amount', 'Status'];
      rows = paymentsList.map((p) => {
        const pt = getPatientDisplay(p.patient);
        return [
          p.transactionId,
          p.invoiceNumber,
          `"${pt.name.replace(/"/g, '""')}"`,
          p.paymentMode,
          fmtDateTime(p.paidAt),
          p.amount,
          p.status
        ];
      });
    } else {
      if (refundsList.length === 0) {
        toast.error('No refunds to export.');
        return;
      }
      headers = ['Refund ID', 'Original Invoice', 'Patient Name', 'Refund Amount', 'Date', 'Reason', 'Status'];
      rows = refundsList.map((r) => {
        const pt = getPatientDisplay(r.patient);
        return [
          r.refundId,
          r.invoiceNumber,
          `"${pt.name.replace(/"/g, '""')}"`,
          r.refundAmount,
          fmtDateTime(r.refundDate),
          `"${r.reason.replace(/"/g, '""')}"`,
          r.status
        ];
      });
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Export completed successfully.');
  };

  /* ─────────────────────────────────────────────────────
     RENDER UI
  ───────────────────────────────────────────────────── */
  return (
    <div className="flex h-full w-full gap-6 overflow-hidden select-none">

      {/* ========================================================
          MAIN WORKSPACE (Left side)
          ======================================================== */}
      <div className="flex-1 flex flex-col gap-5 overflow-y-auto pr-1 [scrollbar-width:none]">

        {/* ── 1. Page Header with Date Filter Group ── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Billing & Invoices</h1>
            <p className="text-xs text-slate-400 mt-0.5">Manage clinic invoices, payments, refunds, and financial performance.</p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Date Range Selector Pill Group */}
            <div className="flex items-center bg-white border border-slate-200 rounded-full p-1 shadow-xs gap-1">
              <div className="flex items-center gap-1.5 pl-2.5 pr-1 text-slate-400 text-xs font-bold">
                <CalendarIcon size={13} />
                <span>Date Range</span>
              </div>

              <button
                type="button"
                onClick={() => handleRangeSelect(DATE_RANGE_OPTIONS.TODAY)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all duration-150 ${
                  dateRangeOption === DATE_RANGE_OPTIONS.TODAY
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Today
              </button>

              <button
                type="button"
                onClick={() => handleRangeSelect(DATE_RANGE_OPTIONS.YESTERDAY)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all duration-150 ${
                  dateRangeOption === DATE_RANGE_OPTIONS.YESTERDAY
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Yesterday
              </button>

              <button
                type="button"
                onClick={() => handleRangeSelect(DATE_RANGE_OPTIONS.THIS_MONTH)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all duration-150 ${
                  dateRangeOption === DATE_RANGE_OPTIONS.THIS_MONTH
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                This Month
              </button>

              <button
                type="button"
                onClick={() => handleRangeSelect(DATE_RANGE_OPTIONS.THIS_YEAR)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all duration-150 ${
                  dateRangeOption === DATE_RANGE_OPTIONS.THIS_YEAR
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                This Year
              </button>

              {/* Custom Popover Anchor */}
              <div className="relative" ref={customPopoverRef}>
                <button
                  type="button"
                  onClick={() => setCustomOpen(!customOpen)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all duration-150 ${
                    dateRangeOption === DATE_RANGE_OPTIONS.CUSTOM
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <CalendarIcon size={12} />
                  Custom
                </button>

                {/* Custom Popover Card */}
                {customOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-150 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <h4 className="text-xs font-black text-slate-800 mb-3">Custom Date Range</h4>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">From</label>
                        <div className="flex items-center gap-1.5 border border-slate-200 rounded-xl px-2.5 py-1.5 bg-slate-50/50 focus-within:border-blue-500 focus-within:bg-white transition">
                          <CalendarIcon size={12} className="text-slate-400 shrink-0" />
                          <input
                            type="date"
                            value={tempFrom}
                            max={getTodayStr()}
                            onChange={(e) => setTempFrom(e.target.value)}
                            className="w-full text-xs font-semibold text-slate-700 bg-transparent outline-none cursor-pointer"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">To</label>
                        <div className="flex items-center gap-1.5 border border-slate-200 rounded-xl px-2.5 py-1.5 bg-slate-50/50 focus-within:border-blue-500 focus-within:bg-white transition">
                          <CalendarIcon size={12} className="text-slate-400 shrink-0" />
                          <input
                            type="date"
                            value={tempTo}
                            max={getTodayStr()}
                            onChange={(e) => setTempTo(e.target.value)}
                            className="w-full text-xs font-semibold text-slate-700 bg-transparent outline-none cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                    {customError && (
                      <p className="text-[10px] text-rose-500 font-bold mt-2">{customError}</p>
                    )}

                    <div className="flex items-center justify-end gap-2 mt-4 pt-2.5 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={handleClearCustom}
                        className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 transition"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyCustom}
                        disabled={!tempFrom || !tempTo}
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Formatted Date Range Pill */}
            <div
              onClick={() => {
                setTempFrom(resolvedRange.from);
                setTempTo(resolvedRange.to);
                setCustomOpen(true);
              }}
              className="flex items-center gap-2 bg-white border border-slate-200 rounded-full px-3.5 py-1.5 shadow-xs cursor-pointer hover:border-slate-300 transition"
            >
              <CalendarIcon size={13} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-700">{resolvedRange.displayDate}</span>
              <ChevronDown size={13} className="text-slate-400" />
            </div>

            {/* Create New Invoice Button */}
            <Link
              to="/billing/invoices/new"
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4 py-1.5 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Create Invoice
            </Link>

            {/* Export Reports Button */}
            <button
              onClick={handleExport}
              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-full px-4 py-1.5 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" /> Export
            </button>
          </div>
        </div>

        {/* ── Sub-header Refresh Action ── */}
        <div className="flex items-center justify-between shrink-0">
          <button
            onClick={() => {
              loadInitialInvoices();
              loadSummaryData();
            }}
            disabled={loadingInitial || loadingSummary}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl px-3.5 py-1.5 text-xs font-bold transition flex items-center gap-1.5 shadow-xs disabled:opacity-55 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${loadingInitial || loadingSummary ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {/* ── 2. Five KPI Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 shrink-0">
          {kpis.map((kpi, idx) => {
            const Icon = kpi.icon;
            const comp = kpi.comparison;
            return (
              <div
                key={idx}
                className="bg-white p-5 rounded-[20px] border border-slate-150 shadow-xs flex flex-col justify-between h-[155px] hover:-translate-y-0.5 hover:shadow-md transition duration-200"
              >
                <div className="flex items-center justify-between shrink-0">
                  <div className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center ${kpi.bg}`}>
                    <Icon size={18} />
                  </div>
                  <Sparkline color={kpi.color} isUp={comp.type !== 'decrease'} />
                </div>

                <div className="mt-2 text-left">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                    {kpi.label}
                  </p>
                  <h3 className="text-[26px] font-black text-slate-900 leading-none mt-2 truncate">
                    {kpi.value}
                  </h3>
                  {comp.shouldDisplay ? (
                    <p className={`text-[10.5px] font-extrabold mt-1.5 leading-none ${comp.colorClass}`}>
                      {comp.text}
                    </p>
                  ) : (
                    <div className="h-[10.5px] mt-1.5" aria-hidden="true" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── 3. Tabs Navigation ── */}
        <div className="flex items-center gap-2 border-b border-slate-150 shrink-0 pb-1.5">
          {[
            { id: 'invoices', label: 'Invoices', count: totalInvoicesCount },
            { id: 'payments', label: 'Payments', count: paymentsList.length },
            { id: 'refunds',  label: 'Refunds',  count: refundsList.length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 pb-2.5 border-b-2 px-3 text-xs font-black transition shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* ── 4. Filter Bar (Search, Status, Type) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:border-blue-500 outline-none text-slate-800 placeholder-slate-400 transition"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 font-bold outline-none cursor-pointer focus:border-blue-500 transition"
            >
              <option value="">All Statuses</option>
              {activeTab === 'invoices' && (
                <>
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="refunded">Refunded</option>
                  <option value="cancelled">Cancelled</option>
                </>
              )}
              {activeTab === 'payments' && (
                <>
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="NetBanking">Net Banking</option>
                </>
              )}
              {activeTab === 'refunds' && (
                <>
                  <option value="refunded">Processed</option>
                </>
              )}
            </select>
          </div>

          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 font-bold outline-none cursor-pointer focus:border-blue-500 transition"
            >
              <option value="">All Invoice Types</option>
              <option value="CONSULTATION">Consultation</option>
              <option value="LAB">Laboratory</option>
              <option value="PHARMACY">Pharmacy</option>
              <option value="PROCEDURE">Procedure</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {/* ── 5. Independent Infinite Scrolling Table Container (Critical Requirement 6) ── */}
        <div
          ref={tableContainerRef}
          onScroll={handleTableScroll}
          className="bg-white rounded-3xl border border-slate-150 overflow-y-auto max-h-[520px] shadow-xs relative [scrollbar-width:thin]"
        >
          {/* TAB 1: INVOICES TABLE */}
          {activeTab === 'invoices' && (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-xs z-10 border-b border-slate-150 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Invoice No.</th>
                  <th className="py-3.5 px-4">Patient</th>
                  <th className="py-3.5 px-3">Invoice Type</th>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4 text-right">Paid</th>
                  <th className="py-3.5 px-4 text-right">Due</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loadError ? (
                  <tr>
                    <td colSpan="9" className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle size={22} className="text-rose-500" />
                        <p className="text-xs font-bold text-slate-700">Failed to load invoices</p>
                        <button
                          type="button"
                          onClick={loadInitialInvoices}
                          className="mt-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition"
                        >
                          Retry
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : loadingInitial ? (
                  <tr>
                    <td colSpan="9" className="py-16 text-center text-xs text-slate-400 font-bold">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw size={15} className="animate-spin text-blue-600" />
                        <span>Loading bills...</span>
                      </div>
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2.5">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-150 flex items-center justify-center text-slate-400">
                          <Receipt size={24} />
                        </div>
                        <h4 className="text-sm font-black text-slate-700">No invoices found</h4>
                        <p className="text-xs text-slate-400 font-medium">No billing records for the selected date range.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => {
                    const pt = getPatientDisplay(inv.patientId);
                    const statusCfg = PAYMENT_STATUS[inv.paymentStatus] || PAYMENT_STATUS.unpaid;
                    const StatusIcon = statusCfg.icon;
                    const typeCfg = SERVICE_TYPE[inv.serviceType] || SERVICE_TYPE.other;

                    return (
                      <tr key={inv._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setViewModalOpen(true);
                            }}
                            className="font-bold text-blue-600 hover:underline cursor-pointer block leading-none"
                          >
                            {inv.invoiceNumber}
                          </button>
                          <span className="text-[10px] text-slate-400 block mt-1">
                            {inv.invoiceStatus ? inv.invoiceStatus.toUpperCase() : 'ISSUED'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-700 font-black text-[10px] flex items-center justify-center shrink-0">
                              {pt.initials}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 truncate leading-none">{pt.name}</p>
                              <span className="text-[9.5px] text-slate-400 block mt-0.5">PID: {pt.pid}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${typeCfg.cls}`}>
                            {typeCfg.label}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 font-medium text-[11px]">
                          {fmtDateTime(inv.invoiceDate || inv.createdAt)}
                        </td>

                        <td className="py-3.5 px-4 text-right font-black text-slate-900">
                          {fmt(inv.totalAmount)}
                        </td>

                        <td className="py-3.5 px-4 text-right font-bold text-emerald-600">
                          {fmt(inv.paidAmount)}
                        </td>

                        <td className="py-3.5 px-4 text-right font-bold text-rose-600">
                          {fmt(inv.dueAmount)}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase ${statusCfg.cls}`}>
                            <StatusIcon size={10} />
                            {statusCfg.label}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedInvoice(inv);
                                setViewModalOpen(true);
                              }}
                              className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                              title="View Invoice"
                            >
                              <Eye size={14} />
                            </button>

                            {inv.dueAmount > 0 && inv.paymentStatus !== 'cancelled' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActionInvoice(inv);
                                  setPayAmount(String(inv.dueAmount));
                                  setPaymentModalOpen(true);
                                }}
                                className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                                title="Collect Payment"
                              >
                                Pay
                              </button>
                            )}

                            {inv.paidAmount > 0 && inv.paymentStatus !== 'cancelled' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActionInvoice(inv);
                                  setRefundAmount(String(inv.paidAmount));
                                  setRefundModalOpen(true);
                                }}
                                className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-purple-50 text-purple-700 hover:bg-purple-100 transition cursor-pointer"
                                title="Record Refund"
                              >
                                Refund
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {/* TAB 2: PAYMENTS TABLE */}
          {activeTab === 'payments' && (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-xs z-10 border-b border-slate-150 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Transaction ID</th>
                  <th className="py-3.5 px-4">Invoice No.</th>
                  <th className="py-3.5 px-4">Patient</th>
                  <th className="py-3.5 px-4">Payment Method</th>
                  <th className="py-3.5 px-4">Payment Date</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4 text-center">Payment Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loadError ? (
                  <tr>
                    <td colSpan="8" className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle size={22} className="text-rose-500" />
                        <p className="text-xs font-bold text-slate-700">Failed to load payments</p>
                        <button
                          type="button"
                          onClick={loadInitialInvoices}
                          className="mt-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition"
                        >
                          Retry
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : loadingInitial ? (
                  <tr>
                    <td colSpan="8" className="py-16 text-center text-xs text-slate-400 font-bold">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw size={15} className="animate-spin text-blue-600" />
                        <span>Loading payments...</span>
                      </div>
                    </td>
                  </tr>
                ) : paymentsList.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2.5">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-150 flex items-center justify-center text-slate-400">
                          <CreditCard size={24} />
                        </div>
                        <h4 className="text-sm font-black text-slate-700">No payment transactions</h4>
                        <p className="text-xs text-slate-400 font-medium">No completed payments for the selected date range.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paymentsList.map((p) => {
                    const pt = getPatientDisplay(p.patient);
                    return (
                      <tr key={p._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800 text-[11px]">
                          {p.transactionId}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-blue-600">
                          {p.invoiceNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-800 truncate">{pt.name}</p>
                          <span className="text-[9.5px] text-slate-400 block">PID: {pt.pid}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-100 uppercase">
                            <Wallet size={10} />
                            {p.paymentMode}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium text-[11px]">
                          {fmtDateTime(p.paidAt)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-emerald-600 text-[13px]">
                          {fmt(p.amount)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                            <CheckCircle2 size={10} />
                            Completed
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              const matching = invoices.find((i) => i._id === p.invoiceId);
                              if (matching) {
                                setSelectedInvoice(matching);
                                setViewModalOpen(true);
                              }
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                            title="View Invoice"
                          >
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {/* TAB 3: REFUNDS TABLE */}
          {activeTab === 'refunds' && (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-xs z-10 border-b border-slate-150 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Refund ID</th>
                  <th className="py-3.5 px-4">Original Invoice</th>
                  <th className="py-3.5 px-4">Patient</th>
                  <th className="py-3.5 px-4 text-right">Refund Amount</th>
                  <th className="py-3.5 px-4">Refund Date</th>
                  <th className="py-3.5 px-4">Refund Reason</th>
                  <th className="py-3.5 px-4 text-center">Refund Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loadError ? (
                  <tr>
                    <td colSpan="8" className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle size={22} className="text-rose-500" />
                        <p className="text-xs font-bold text-slate-700">Failed to load refunds</p>
                        <button
                          type="button"
                          onClick={loadInitialInvoices}
                          className="mt-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition"
                        >
                          Retry
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : loadingInitial ? (
                  <tr>
                    <td colSpan="8" className="py-16 text-center text-xs text-slate-400 font-bold">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw size={15} className="animate-spin text-blue-600" />
                        <span>Loading refunds...</span>
                      </div>
                    </td>
                  </tr>
                ) : refundsList.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2.5">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-150 flex items-center justify-center text-slate-400">
                          <RotateCcw size={24} />
                        </div>
                        <h4 className="text-sm font-black text-slate-700">No refunds recorded</h4>
                        <p className="text-xs text-slate-400 font-medium">No refund transactions for the selected date range.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  refundsList.map((r) => {
                    const pt = getPatientDisplay(r.patient);
                    return (
                      <tr key={r._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800 text-[11px]">
                          {r.refundId}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-blue-600">
                          {r.invoiceNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-800 truncate">{pt.name}</p>
                          <span className="text-[9.5px] text-slate-400 block">PID: {pt.pid}</span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-rose-600 text-[13px]">
                          {fmt(r.refundAmount)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium text-[11px]">
                          {fmtDateTime(r.refundDate)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 text-[11px] max-w-[200px] truncate" title={r.reason}>
                          {r.reason}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-200 uppercase">
                            <RotateCcw size={10} />
                            {r.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              const matching = invoices.find((i) => i._id === r.invoiceId);
                              if (matching) {
                                setSelectedInvoice(matching);
                                setViewModalOpen(true);
                              }
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                            title="View Original Invoice"
                          >
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {/* Bottom Infinite Scroll Fetcher Indicator */}
          {fetchingNext && (
            <div className="py-3 flex items-center justify-center gap-2 text-xs text-slate-400 font-bold bg-slate-50/50 border-t border-slate-100">
              <RefreshCw size={13} className="animate-spin text-blue-600" />
              <span>Loading more bills...</span>
            </div>
          )}

          {/* Subtle record counter / progress footer bar */}
          {!loadingInitial && totalInvoicesCount > 0 && (
            <div className="py-2.5 px-4 bg-slate-50/70 border-t border-slate-100 text-[11px] font-bold text-slate-500 flex items-center justify-between">
              <span>
                Showing {Math.min(activeTab === 'invoices' ? invoices.length : (activeTab === 'payments' ? paymentsList.length : refundsList.length), totalInvoicesCount)} of {totalInvoicesCount} records
              </span>
              {!hasMore && (
                <span className="text-slate-400 font-semibold">All bills loaded</span>
              )}
            </div>
          )}
        </div>

      </div>

      {/* ========================================================
          RIGHT-SIDE SUMMARY PANELS
          ======================================================== */}
      <div className="w-[340px] shrink-0 bg-white border border-slate-150 rounded-3xl p-5 shadow-xs hidden xl:flex flex-col gap-6 overflow-y-auto [scrollbar-width:none]">

        {/* Panel 1: Billing Summary */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-900 uppercase">Billing Summary</h3>
            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              {resolvedRange.displayDate}
            </span>
          </div>

          <div className="space-y-2.5 bg-slate-50/50 border border-slate-100 rounded-2xl p-4">
            {[
              { label: 'Total Invoices', val: fmtNum(summary?.totalInvoices ?? 0), color: '#2563EB' },
              { label: 'Paid Invoices',  val: fmtNum(summary?.paidInvoices ?? 0),  color: '#10B981' },
              { label: 'Pending Invoices', val: fmtNum(summary?.pendingInvoices ?? ((summary?.unpaidInvoices || 0) + (summary?.partialInvoices || 0))), color: '#F59E0B' },
              { label: 'Cancelled Invoices', val: fmtNum(summary?.cancelledInvoices ?? 0), color: '#EF4444' }
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: row.color }} />
                  <span className="text-slate-600 font-medium">{row.label}</span>
                </div>
                <span className="font-black text-slate-800">{row.val}</span>
              </div>
            ))}

            <div className="h-px bg-slate-200/80 my-2" />

            {[
              { label: 'Total Revenue',    val: fmt(summary?.totalRevenue ?? 0), color: 'text-slate-900' },
              { label: 'Collected Amount', val: fmt(summary?.collectedAmount ?? 0), color: 'text-emerald-600' },
              { label: 'Outstanding Amount', val: fmt(summary?.outstandingAmount ?? summary?.pendingAmount ?? 0), color: 'text-rose-600' }
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">{row.label}</span>
                <span className={`font-black ${row.color}`}>{row.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Panel 2: Revenue by Invoice Type */}
        <div className="space-y-4 border-t border-slate-100 pt-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-900 uppercase">Revenue by Invoice Type</h3>
          </div>

          {revenueSegments.length > 0 ? (
            <div className="space-y-4">
              <div className="flex justify-center py-2">
                <RevenueDonut segments={revenueSegments} total={summary?.totalRevenue ?? 0} />
              </div>

              <div className="space-y-2">
                {revenueSegments.map((seg) => (
                  <div key={seg.label} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: seg.color }} />
                      <span className="text-slate-600 font-medium">{seg.label}</span>
                    </div>
                    <span className="font-black text-slate-800">{fmt(seg.value)} ({seg.pct}%)</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-6 text-center">
              <Receipt size={24} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-600">No revenue data</p>
              <p className="text-[10px] text-slate-400 mt-0.5">No billable collections recorded for this period.</p>
            </div>
          )}
        </div>

      </div>

      {/* ========================================================
          MODAL: VIEW INVOICE DETAILS
          ======================================================== */}
      {viewModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-150 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Invoice Details</span>
                <h3 className="text-xl font-black text-slate-900">{selectedInvoice.invoiceNumber}</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Patient</p>
                <p className="font-bold text-slate-800 mt-0.5">{getPatientDisplay(selectedInvoice.patientId).name}</p>
                <p className="text-slate-400 text-[10px]">PID: {getPatientDisplay(selectedInvoice.patientId).pid}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Doctor</p>
                <p className="font-bold text-slate-800 mt-0.5">{selectedInvoice.doctorId?.fullName || 'Clinic Provider'}</p>
                <p className="text-slate-400 text-[10px]">{selectedInvoice.doctorId?.specialization?.name || 'General Practice'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Date & Status</p>
                <p className="font-bold text-slate-800 mt-0.5">{fmtDateTime(selectedInvoice.invoiceDate || selectedInvoice.createdAt)}</p>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                  (PAYMENT_STATUS[selectedInvoice.paymentStatus] || PAYMENT_STATUS.unpaid).cls
                }`}>
                  {selectedInvoice.paymentStatus}
                </span>
              </div>
            </div>

            {/* Itemized Table */}
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Itemized Services</p>
              <div className="border border-slate-150 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Item</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Price</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {(selectedInvoice.items || []).map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3">{it.name}</td>
                        <td className="py-2 px-3 text-center">{it.quantity}</td>
                        <td className="py-2 px-3 text-right">{fmt(it.unitPrice)}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">{fmt(it.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="bg-slate-50 rounded-2xl p-4 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-bold">{fmt(selectedInvoice.subtotal)}</span>
              </div>
              {selectedInvoice.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount:</span>
                  <span className="font-bold">-{fmt(selectedInvoice.discountAmount)}</span>
                </div>
              )}
              {selectedInvoice.gstAmount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>GST ({selectedInvoice.gstRate}%):</span>
                  <span className="font-bold">+{fmt(selectedInvoice.gstAmount)}</span>
                </div>
              )}
              <div className="border-t border-slate-200 pt-1.5 flex justify-between font-black text-slate-900 text-sm">
                <span>Total Amount:</span>
                <span>{fmt(selectedInvoice.totalAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-emerald-600">
                <span>Paid Amount:</span>
                <span>{fmt(selectedInvoice.paidAmount)}</span>
              </div>
              {selectedInvoice.dueAmount > 0 && (
                <div className="flex justify-between font-bold text-rose-600">
                  <span>Due Balance:</span>
                  <span>{fmt(selectedInvoice.dueAmount)}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: RECORD PAYMENT
          ======================================================== */}
      {paymentModalOpen && actionInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <form
            onSubmit={handleRecordPaymentSubmit}
            className="bg-white rounded-3xl shadow-2xl border border-slate-150 max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Collect Payment</span>
                <h3 className="text-base font-black text-slate-900">{actionInvoice.invoiceNumber}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="text-xs space-y-1 bg-slate-50 p-3 rounded-xl">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Invoice:</span>
                <span className="font-bold">{fmt(actionInvoice.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Currently Due:</span>
                <span className="font-black text-rose-600">{fmt(actionInvoice.dueAmount)}</span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Amount to Collect (₹)</label>
              <input
                type="number"
                min="1"
                max={actionInvoice.dueAmount}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm font-bold border border-slate-200 rounded-xl outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Payment Method</label>
              <select
                value={payMode}
                onChange={(e) => setPayMode(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl outline-none focus:border-blue-500"
              >
                <option value="Cash">Cash</option>
                <option value="Card">Credit / Debit Card</option>
                <option value="UPI">UPI / QR Code</option>
                <option value="NetBanking">Net Banking</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Transaction ID / Ref (Optional)</label>
              <input
                type="text"
                placeholder="e.g. UPI-987654321"
                value={payTxnId}
                onChange={(e) => setPayTxnId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Notes (Optional)</label>
              <textarea
                rows="2"
                placeholder="Payment receipt note..."
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingAction}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50"
              >
                {submittingAction ? 'Recording...' : 'Record Payment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================
          MODAL: RECORD REFUND
          ======================================================== */}
      {refundModalOpen && actionInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <form
            onSubmit={handleRecordRefundSubmit}
            className="bg-white rounded-3xl shadow-2xl border border-slate-150 max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Process Refund</span>
                <h3 className="text-base font-black text-slate-900">{actionInvoice.invoiceNumber}</h3>
              </div>
              <button
                type="button"
                onClick={() => setRefundModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="text-xs space-y-1 bg-slate-50 p-3 rounded-xl">
              <div className="flex justify-between">
                <span className="text-slate-500">Collected Amount:</span>
                <span className="font-bold text-emerald-600">{fmt(actionInvoice.paidAmount)}</span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Refund Amount (₹)</label>
              <input
                type="number"
                min="1"
                max={actionInvoice.paidAmount}
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm font-bold border border-slate-200 rounded-xl outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Reason for Refund</label>
              <textarea
                rows="3"
                placeholder="Reason (e.g. Appointment cancelled by doctor, duplicate payment)..."
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRefundModalOpen(false)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingAction}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50"
              >
                {submittingAction ? 'Processing...' : 'Process Refund'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default BillingAdminPage;
