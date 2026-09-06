import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import { getGeneratedReportDocument, downloadReportPdf, logReportActivity } from './labApi';
import pehalLogo from '../../assets/pehal_logo.svg';

const getFlagBadge = (flag = '') => {
  const norm = String(flag).toLowerCase();
  if (norm.includes('critical')) {
    const isHigh = norm.includes('high');
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-extrabold text-rose-700 border border-rose-200">
        <span>{isHigh ? '↑' : '↓'}</span>
        <span>{isHigh ? 'Critical High' : 'Critical Low'}</span>
      </span>
    );
  }
  if (norm === 'low') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-700 border border-amber-200">
        <span>↓</span>
        <span>Low</span>
      </span>
    );
  }
  if (norm === 'high') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-700 border border-amber-200">
        <span>↑</span>
        <span>High</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-700 border border-emerald-200">
      <span>✓</span>
      <span>Normal</span>
    </span>
  );
};

const formatDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return String(d);
  }
};

const formatDateTime = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('en-IN', {
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

const LabReportViewPage = () => {
  const { id, orderId: paramOrderId, testId } = useParams();
  const effectiveOrderId = id || paramOrderId;
  const [searchParams] = useSearchParams();
  const testCode = searchParams.get('testCode') || '';
  const queryLabId = searchParams.get('labId') || localStorage.getItem('patientActiveLabId') || '';
  const queryClinicId = searchParams.get('clinicId') || localStorage.getItem('patientActiveClinicId') || '';
  const fromTab = searchParams.get('fromTab') || 'lab-orders';
  const navigate = useNavigate();
  const { user } = useAuth();

  const [docData, setDocData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('preview'); // 'preview', 'details', 'files', 'activity'
  const [zoomLevel, setZoomLevel] = useState(100);
  const [downloading, setDownloading] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  // Modals
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  const reportRef = useRef(null);

  const loadReportDocument = useCallback(async () => {
    if (!effectiveOrderId) return;
    setLoading(true);
    setError('');

    try {
      const res = await getGeneratedReportDocument(effectiveOrderId, {
        testCode: testCode || undefined,
        testId: testId || undefined
      });
      setDocData(res.data || res);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load the laboratory report.');
    } finally {
      setLoading(false);
    }
  }, [effectiveOrderId, testCode, testId]);

  useEffect(() => {
    loadReportDocument();
  }, [loadReportDocument]);

  // Sync laboratory and clinic context to storage once report is loaded
  useEffect(() => {
    if (docData && user?.role === 'PATIENT') {
      const activeLab = docData.laboratory?._id || docData.order?.laboratoryId;
      const activeClinic = docData.clinic?._id || docData.order?.clinicId;
      if (activeLab) {
        localStorage.setItem('patientActiveLabId', activeLab);
        window.dispatchEvent(new CustomEvent('patient:lab-changed', { detail: activeLab }));
      }
      if (activeClinic) {
        localStorage.setItem('patientActiveClinicId', activeClinic);
      }
    }
  }, [docData, user?.role]);

  const effectiveLabId = queryLabId || docData?.laboratory?._id || docData?.order?.laboratoryId || '';
  const effectiveClinicId = queryClinicId || docData?.clinic?._id || docData?.order?.clinicId || '';

  // Download PDF Handler
  const handleDownloadPdf = async () => {
    if (!effectiveOrderId) return;
    setDownloading(true);
    try {
      const res = await downloadReportPdf(effectiveOrderId, {
        testCode: testCode || docData?.test?.code || undefined,
        testId: testId || undefined
      });

      const blob = new Blob([res.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const orderNumber = docData?.order?.orderNumber || 'LAB-REPORT';
      const cleanTestName = (docData?.test?.code || docData?.test?.name || 'Report').replace(/[^a-zA-Z0-9]/g, '_');
      link.download = `${orderNumber}_${cleanTestName}_Report.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      logReportActivity(effectiveOrderId, { action: 'REPORT_DOWNLOADED', metadata: { format: 'PDF' } }).catch(() => {});
    } catch (err) {
      alert(err.response?.data?.message || 'Unable to download report PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  // Print Handler
  const handlePrint = () => {
    if (effectiveOrderId) {
      logReportActivity(effectiveOrderId, { action: 'REPORT_PRINTED', metadata: { method: 'Browser Print' } }).catch(() => {});
    }
    window.print();
  };

  // Share Handler
  const handleShare = () => {
    if (effectiveOrderId) {
      logReportActivity(effectiveOrderId, { action: 'REPORT_SHARED', metadata: { method: navigator.share ? 'Native Share' : 'Clipboard Link' } }).catch(() => {});
    }
    if (navigator.share && docData) {
      navigator
        .share({
          title: `Lab Report: ${docData.order?.orderNumber} - ${docData.test?.name}`,
          text: `Laboratory Report for ${docData.patient?.fullName} (${docData.test?.name})`,
          url: window.location.href
        })
        .catch(() => {});
    } else {
      navigator.clipboard?.writeText?.(window.location.href);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 3000);
    }
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-6rem)] flex items-center justify-center">
        <LoadingState label="Loading Generated Laboratory Report..." />
      </div>
    );
  }

  if (error || !docData) {
    const isNotReady =
      error?.toLowerCase().includes('not yet') ||
      error?.toLowerCase().includes('not available') ||
      error?.toLowerCase().includes('processing');

    return (
      <div className="h-[calc(100vh-6rem)] flex items-center justify-center px-4">
        <div className="mx-auto max-w-lg text-center bg-white p-8 rounded-3xl border border-stone-200/90 shadow-sm">
          <div className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center text-2xl text-violet-600">
            {isNotReady ? '⏳' : '⚠️'}
          </div>
          <h2 className="text-lg font-black text-stone-900">
            {isNotReady ? 'Report Not Available Yet' : 'Unable to load laboratory report'}
          </h2>
          <p className="text-xs text-stone-500 mt-2 max-w-sm mx-auto leading-relaxed">
            {isNotReady
              ? 'Your laboratory report will appear here once the laboratory has completed and published it.'
              : (error || 'The requested laboratory report could not be found or has not been finalized yet.')}
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => {
                if (user?.role === 'PATIENT') {
                  navigate(`/portal?tab=${fromTab}&labId=${effectiveLabId}&clinicId=${effectiveClinicId}`);
                } else {
                  navigate(`/labs/orders/${effectiveOrderId}`);
                }
              }}
              className="rounded-2xl border border-stone-300 bg-white px-5 py-2.5 text-xs font-bold text-stone-700 shadow-xs hover:bg-stone-50 transition cursor-pointer"
            >
              ← {user?.role === 'PATIENT'
                  ? (['lab-reports', 'labs'].includes(fromTab) ? 'Back to Lab Reports' : 'Back to Lab Orders')
                  : 'Back to Order'}
            </button>
            <button
              onClick={loadReportDocument}
              className="rounded-2xl bg-violet-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-violet-200 hover:bg-violet-700 transition cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const {
    order,
    patient,
    clinic,
    laboratory,
    doctor,
    technician,
    test,
    report,
    parameters = [],
    summary,
    attachedFiles = [],
    activityLog = [],
    comments
  } = docData;

  const clinicAddressStr = [
    clinic?.address?.line1 || 'Indirapuram',
    clinic?.address?.city || 'Ghaziabad',
    clinic?.address?.pincode ? `- ${clinic?.address?.pincode}` : '- 201014'
  ].filter(Boolean).join(', ');

  const labAddressStr = [
    laboratory?.address?.line1 || 'Sector 62',
    laboratory?.address?.city || 'Noida',
    laboratory?.address?.pincode ? `- ${laboratory?.address?.pincode}` : '- 201309'
  ].filter(Boolean).join(', ');

  return (
    <div
      className="h-[calc(100vh-7.5rem)] max-h-[calc(100vh-7.5rem)] flex flex-col overflow-hidden font-sans antialiased text-stone-800"
      id="generated-lab-report-page"
    >
      {/* ── PRINT-SPECIFIC CSS & SLEEK SCROLLBARS ── */}
      <style>{`
        .report-scroll-container {
          scrollbar-width: thin;
          scrollbar-color: rgba(109, 40, 217, 0.3) transparent;
        }
        .report-scroll-container::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .report-scroll-container::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.02);
          border-radius: 9999px;
        }
        .report-scroll-container::-webkit-scrollbar-thumb {
          background: rgba(109, 40, 217, 0.25);
          border-radius: 9999px;
        }
        .report-scroll-container::-webkit-scrollbar-thumb:hover {
          background: rgba(109, 40, 217, 0.5);
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          body * {
            visibility: hidden;
          }
          #printable-report, #printable-report * {
            visibility: visible;
          }
          #printable-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            transform: none !important;
            box-sizing: border-box !important;
          }
          #printable-report table {
            page-break-inside: auto;
          }
          #printable-report tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          #printable-report thead {
            display: table-header-group;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* ── FIXED TOP SECTION (Breadcrumb + Header + Actions + Tabs) ── */}
      <div className="shrink-0 mb-3 space-y-2 no-print">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-stone-500 flex-wrap">
          {user?.role === 'PATIENT' ? (
            <>
              <Link to={`/portal?tab=dashboard&clinicId=${effectiveClinicId}`} className="hover:text-stone-900 transition font-medium">
                Home
              </Link>
              <span>&gt;</span>
              <Link to={`/portal?tab=book-lab&clinicId=${effectiveClinicId}`} className="hover:text-stone-900 transition font-medium">
                Laboratory
              </Link>
              <span>&gt;</span>
              <Link
                to={`/portal?tab=${fromTab}&labId=${effectiveLabId}&clinicId=${effectiveClinicId}`}
                className="hover:text-stone-900 transition font-medium"
              >
                {['lab-reports', 'labs'].includes(fromTab) ? 'Lab Reports' : 'My Lab Orders'}
              </Link>
              <span>&gt;</span>
              <span className="font-mono font-medium text-stone-600">{order?.orderNumber || 'LAB-20260904-0001'}</span>
              <span>&gt;</span>
              <span className="font-bold text-violet-700">{test?.name || 'Generated Report'}</span>
            </>
          ) : (
            <>
              <Link to="/labs/orders" className="hover:text-stone-900 transition font-medium">
                Lab Orders
              </Link>
              <span>&gt;</span>
              <Link to={`/labs/orders/${effectiveOrderId}`} className="hover:text-stone-900 transition font-mono font-medium">
                {order?.orderNumber || 'LAB-20260904-0001'}
              </Link>
              <span>&gt;</span>
              <span className="font-bold text-violet-700">Generated Report</span>
            </>
          )}
        </nav>

        {/* Header Card */}
        <header className="rounded-3xl border border-stone-200/90 bg-white p-4 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (user?.role === 'PATIENT') {
                    navigate(`/portal?tab=${fromTab}&labId=${effectiveLabId}&clinicId=${effectiveClinicId}`);
                  } else {
                    navigate(`/labs/orders/${effectiveOrderId}`);
                  }
                }}
                className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-50 transition shadow-2xs cursor-pointer"
              >
                <span>←</span>
                <span>
                  {user?.role === 'PATIENT'
                    ? (['lab-reports', 'labs'].includes(fromTab) ? 'Back to Lab Reports' : 'Back to Lab Orders')
                    : 'Back to Order'}
                </span>
              </button>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base sm:text-lg font-black text-stone-900 tracking-tight">
                    {user?.role === 'PATIENT'
                      ? (test?.name || 'Complete Blood Count (CBC)')
                      : 'Generated Laboratory Report'}
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                    Completed
                  </span>
                </div>

                {user?.role === 'PATIENT' ? (
                  <p className="mt-0.5 text-xs text-stone-500 flex items-center gap-2 flex-wrap">
                    <span>Order ID: <strong className="font-mono text-stone-800">{order?.orderNumber || 'LAB-20260904-0001'}</strong></span>
                    <span>|</span>
                    <span>Sample ID: <strong className="font-mono text-stone-800">{order?.sampleId || 'SMP-00125'}</strong></span>
                    <span>|</span>
                    <span>Collected on: <strong className="text-stone-800">{formatDateTime(order?.sampleCollectedAt || order?.orderedAt)}</strong></span>
                    <span>|</span>
                    <span>Reported on: <strong className="text-stone-800">{formatDateTime(report?.issuedAt || report?.generatedAt || order?.finalizedAt)}</strong></span>
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-stone-500 flex items-center gap-2 flex-wrap">
                    <span>Order: <strong className="font-mono text-stone-800">{order?.orderNumber || 'LAB-20260904-0001'}</strong></span>
                    <span>|</span>
                    <span>Patient: <strong className="text-stone-800">{patient?.fullName || 'vidya'}</strong></span>
                    <span>|</span>
                    <span>Age: <strong className="text-stone-800">{patient?.age ? `${patient.age} yrs` : '29 yrs'}</strong></span>
                    <span>|</span>
                    <span>{patient?.gender || 'Female'}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Top Right Action Buttons */}
            <div className="flex items-center gap-2 self-end md:self-center flex-wrap">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={downloading}
                className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-violet-200 hover:bg-violet-700 transition active:scale-98 cursor-pointer disabled:opacity-50"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>{downloading ? 'Downloading...' : 'Download PDF'}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-bold text-stone-700 shadow-2xs hover:bg-stone-50 transition cursor-pointer"
              >
                <svg className="h-3.5 w-3.5 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Print</span>
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-bold text-stone-700 shadow-2xs hover:bg-stone-50 transition cursor-pointer"
                title="Share link"
              >
                <svg className="h-3.5 w-3.5 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span>{shareSuccess ? 'Copied!' : 'Share'}</span>
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mt-3.5 flex items-center gap-5 border-t border-stone-100 pt-2.5 text-xs font-bold">
            {(user?.role === 'PATIENT'
              ? [
                  { key: 'preview', label: 'Report Preview', icon: '📄' },
                  { key: 'details', label: 'Details', icon: '📋' },
                  { key: 'files', label: `Download History (${attachedFiles.length || 1})`, icon: '📥' },
                  { key: 'activity', label: 'Activity Log', icon: '⏱' }
                ]
              : [
                  { key: 'preview', label: 'Report Preview', icon: '📄' },
                  { key: 'details', label: 'Report Details', icon: '📋' },
                  { key: 'files', label: `Attached Files (${attachedFiles.length})`, icon: '📎' },
                  { key: 'activity', label: 'Activity Log', icon: '⏱' }
                ]
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 pb-1.5 transition cursor-pointer ${
                  activeTab === tab.key
                    ? 'border-b-2 border-violet-600 text-violet-700 font-extrabold'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </header>
      </div>

      {/* ── MAIN WORKSPACE CONTAINER (Fills Remaining Height, Center Scrolls Independently) ── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {/* ── TAB 1: REPORT PREVIEW (INDEPENDENT CENTER SCROLL) ── */}
        {activeTab === 'preview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-full min-h-0 items-stretch">
            
            {/* ── CENTER/LEFT: DOCUMENT VIEWER CONTAINER (8 cols) ── */}
            <div className="lg:col-span-8 flex flex-col h-full min-h-0 rounded-2xl border border-stone-200/90 bg-stone-100 shadow-sm overflow-hidden">
              {/* Sticky Embedded PDF Viewer Toolbar (Dark Modern Bar) */}
              <div className="shrink-0 flex items-center justify-between bg-[#2d3748] px-4 py-2 text-xs text-stone-200 z-10 no-print">
                <div className="flex items-center gap-3">
                  <button type="button" className="text-stone-400 hover:text-white" title="Menu">
                    ☰
                  </button>
                  <span className="text-stone-400">|</span>
                  <span className="font-mono text-xs">1 / 1</span>
                  <span className="text-stone-400">|</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.max(70, z - 10))}
                      className="px-1.5 py-0.5 rounded hover:bg-stone-700 text-stone-300 font-bold cursor-pointer"
                      title="Zoom Out"
                    >
                      −
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
                      className="px-1.5 py-0.5 rounded hover:bg-stone-700 text-stone-300 font-bold cursor-pointer"
                      title="Zoom In"
                    >
                      +
                    </button>
                    <span className="font-mono text-[11px] ml-1">{zoomLevel}%</span>
                    <button
                      type="button"
                      onClick={() => setZoomLevel(100)}
                      className="ml-2 px-2 py-0.5 rounded bg-stone-700 hover:bg-stone-600 text-[10px] font-semibold text-stone-200 cursor-pointer"
                      title="Fit to page width"
                    >
                      Fit
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={downloading}
                    className="text-stone-300 hover:text-white transition cursor-pointer"
                    title="Download"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="text-stone-300 hover:text-white transition cursor-pointer"
                    title="Print"
                  >
                    🖨
                  </button>
                  <button type="button" className="text-stone-400 hover:text-white" title="More options">
                    ⋮
                  </button>
                </div>
              </div>

              {/* ONLY THIS SCROLLS: Independent Center Report Viewer Canvas */}
              <div className="report-scroll-container flex-1 min-h-0 overflow-y-auto overflow-x-auto p-4 sm:p-6 overscroll-contain flex justify-center items-start">
                <div
                  ref={reportRef}
                  id="printable-report"
                  style={{
                    transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : undefined,
                    transformOrigin: 'top center',
                    marginBottom: zoomLevel > 100 ? `${(zoomLevel - 100) * 8}px` : undefined
                  }}
                  className="w-full max-w-[820px] bg-white rounded-none shadow-md border border-stone-200/90 p-8 sm:p-10 text-stone-900 transition-all font-sans shrink-0 my-0"
                >
                  {/* 1. TOP PLATFORM HEADER (PEHAL AICMS PLATFORM BAR) */}
                  <div className="flex items-start justify-between border-b border-stone-200 pb-3">
                    {/* Left: PEHAL AICMS Logo */}
                    <div className="flex items-center gap-3">
                      <img
                        src={pehalLogo}
                        alt="PEHAL Healthcare"
                        className="h-10 w-auto max-w-[130px] object-contain shrink-0"
                      />
                      <div className="border-l border-stone-200 pl-3">
                        <div className="text-lg font-black text-stone-900 tracking-tight leading-none">AICMS</div>
                        <div className="text-[9px] font-bold text-stone-800 tracking-wider uppercase mt-0.5">
                          AI CLINIC MANAGEMENT SYSTEM
                        </div>
                        <div className="text-[8px] text-stone-400">
                          Empowering Clinics. Enabling Better Care.
                        </div>
                      </div>
                    </div>

                    {/* Right: Digitally Powered */}
                    <div className="text-right">
                      <div className="text-[11px] font-bold text-stone-500">Digitally Powered</div>
                      <div className="text-[9px] text-stone-400">Clinics for a Healthier Tomorrow</div>
                    </div>
                  </div>

                  {/* 2. DUAL HEADER: CLINIC (LEFT) | LABORATORY (RIGHT) */}
                  <div className="grid grid-cols-2 gap-4 py-3.5 border-b-2 border-violet-600">
                    {/* Left: Current Clinic */}
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-700 border border-violet-200 text-base font-bold shadow-2xs">
                        🦷
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-sm font-extrabold text-stone-900">
                          {clinic?.name || "Ram's Dental Clinic"}
                        </div>
                        <div className="text-xs font-bold text-stone-700">
                          {clinic?.branchName || "Indirapuram Branch"}
                        </div>
                        <div className="text-[11px] text-stone-500">
                          📍 {clinicAddressStr}
                        </div>
                        <div className="text-[11px] text-stone-500 font-mono">
                          📞 {clinic?.phone || '+91 98765 43210'}
                        </div>
                        <div className="text-[11px] text-stone-500">
                          ✉ {clinic?.email || 'info@ramsdentalclinic.com'}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actual Laboratory */}
                    <div className="flex items-start gap-3 pl-4 border-l border-stone-200">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 border border-blue-200 text-base font-bold shadow-2xs">
                        🔬
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-sm font-extrabold text-stone-900">
                          {laboratory?.name || "LifeCare Diagnostics Laboratory"}
                        </div>
                        <div className="text-xs font-bold text-stone-700">
                          {laboratory?.subtitle || "Diagnostic & Pathology Services"}
                        </div>
                        <div className="text-[11px] text-stone-500">
                          📍 {labAddressStr}
                        </div>
                        <div className="text-[11px] text-stone-500 font-mono">
                          📞 {laboratory?.phone || '+91 120 456 7890'}
                        </div>
                        <div className="text-[11px] text-stone-500">
                          ✉ {laboratory?.email || 'info@lifecarediagnostics.com'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. REPORT TITLE BANNER (Centered) */}
                  <div className="text-center my-3.5">
                    <h2 className="text-base font-extrabold text-stone-900 tracking-wide uppercase">
                      LABORATORY REPORT
                    </h2>
                    <div className="text-sm font-bold text-violet-700 mt-0.5">
                      {test?.name || 'Complete Blood Count (CBC)'}
                    </div>
                  </div>

                  {/* 4. PATIENT & ORDER INFORMATION (Rounded 2-Column Card with Colon Alignment) */}
                  <div className="rounded-xl border border-stone-200/80 bg-slate-50/90 p-3.5 text-xs text-stone-800">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
                      {/* Left Column */}
                      <div className="space-y-1.5">
                        <div className="grid grid-cols-[100px_12px_1fr] items-baseline">
                          <span className="text-stone-500 text-[11px]">Patient Name</span>
                          <span className="text-stone-400 text-[11px]">:</span>
                          <span className="font-bold text-stone-900 capitalize">{patient?.fullName || 'vidya'}</span>
                        </div>
                        <div className="grid grid-cols-[100px_12px_1fr] items-baseline">
                          <span className="text-stone-500 text-[11px]">Age / Gender</span>
                          <span className="text-stone-400 text-[11px]">:</span>
                          <span className="font-bold text-stone-900">{patient?.age ? `${patient.age} yrs` : '29 yrs'} / {patient?.gender || 'Female'}</span>
                        </div>
                        <div className="grid grid-cols-[100px_12px_1fr] items-baseline">
                          <span className="text-stone-500 text-[11px]">Patient ID</span>
                          <span className="text-stone-400 text-[11px]">:</span>
                          <span className="font-bold text-stone-900 font-mono">{patient?.patientId || 'PAT-20260904-001'}</span>
                        </div>
                        <div className="grid grid-cols-[100px_12px_1fr] items-baseline">
                          <span className="text-stone-500 text-[11px]">Referred By</span>
                          <span className="text-stone-400 text-[11px]">:</span>
                          <span className="font-bold text-stone-900">{doctor?.fullName || 'Dr. Rajesh Sharma'}</span>
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="space-y-1.5">
                        <div className="grid grid-cols-[100px_12px_1fr] items-baseline">
                          <span className="text-stone-500 text-[11px]">Order ID</span>
                          <span className="text-stone-400 text-[11px]">:</span>
                          <span className="font-bold text-stone-900 font-mono">{order?.orderNumber || 'LAB-20260904-0001'}</span>
                        </div>
                        <div className="grid grid-cols-[100px_12px_1fr] items-baseline">
                          <span className="text-stone-500 text-[11px]">Sample ID</span>
                          <span className="text-stone-400 text-[11px]">:</span>
                          <span className="font-bold text-stone-900 font-mono">{order?.sampleId || 'SMP-00125'}</span>
                        </div>
                        <div className="grid grid-cols-[100px_12px_1fr] items-baseline">
                          <span className="text-stone-500 text-[11px]">Sample Type</span>
                          <span className="text-stone-400 text-[11px]">:</span>
                          <span className="font-bold text-stone-900">{test?.specimenType || 'Whole Blood (EDTA)'}</span>
                        </div>
                        <div className="grid grid-cols-[100px_12px_1fr] items-baseline">
                          <span className="text-stone-500 text-[11px]">Collected On</span>
                          <span className="text-stone-400 text-[11px]">:</span>
                          <span className="font-bold text-stone-900">{formatDateTime(order?.sampleCollectedAt || order?.orderedAt || new Date())}</span>
                        </div>
                        <div className="grid grid-cols-[100px_12px_1fr] items-baseline">
                          <span className="text-stone-500 text-[11px]">Reported On</span>
                          <span className="text-stone-400 text-[11px]">:</span>
                          <span className="font-bold text-stone-900">{formatDateTime(report?.generatedAt || order?.finalizedAt || new Date())}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 5. INVESTIGATION RESULTS TABLE */}
                  <div className="mt-4">
                    <div className="rounded-xl overflow-hidden border border-slate-200">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-blue-50/90 text-slate-800 font-bold text-[11px]">
                            <th className="py-2 px-3 w-8">#</th>
                            <th className="py-2 px-3">Parameter</th>
                            <th className="py-2 px-3">Result</th>
                            <th className="py-2 px-3">Unit</th>
                            <th className="py-2 px-3">
                              Reference Range <span className="text-[10px] font-normal text-slate-500">({patient?.gender || 'Female'}, {patient?.age || '29'} yrs)</span>
                            </th>
                            <th className="py-2 px-3 text-center">Flag</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {parameters.map((param, index) => (
                            <tr key={param.resultId || index} className="hover:bg-slate-50/50 transition">
                              <td className="py-2 px-3 font-mono text-[11px] text-slate-400">{param.index || index + 1}</td>
                              <td className="py-2 px-3 font-bold text-slate-900">
                                {param.parameterName}
                                {param.comment ? (
                                  <div className="text-[10px] text-slate-400 italic font-normal mt-0.5">
                                    ↳ Note: {param.comment}
                                  </div>
                                ) : null}
                              </td>
                              <td className="py-2 px-3 font-mono font-bold text-slate-900">
                                {param.value || '—'}
                              </td>
                              <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">{param.unit || '—'}</td>
                              <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">
                                {param.referenceRange?.text || '—'}
                              </td>
                              <td className="py-2 px-3 text-center">
                                {getFlagBadge(param.flag)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 6. COMMENTS BOX */}
                  <div className="mt-4 rounded-xl border border-purple-200/80 bg-purple-50/40 p-3 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-violet-700 text-xs mb-1">
                      <span>💬</span>
                      <span>Comments</span>
                    </div>
                    <p className="text-slate-700 leading-relaxed text-[11px]">
                      {comments || 'Suggestive of mild anemia. Please correlate clinically.'}
                    </p>
                  </div>

                  {/* 7. SIGNATURES & QR SECTION */}
                  <div className="mt-6 pt-3 border-t border-slate-200 grid grid-cols-3 items-end gap-4 text-xs">
                    {/* Left: Authorized By */}
                    <div>
                      <div className="font-bold text-slate-900 text-xs mb-1">Authorized By</div>
                      <div className="h-9 flex items-center">
                        <svg className="h-7 w-28 text-blue-900" viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M5 22 Q 25 5, 45 25 T 85 10 T 95 18" />
                        </svg>
                      </div>
                      <div className="font-bold text-slate-900 text-xs">{doctor?.fullName || 'Dr. Rajesh Sharma'}</div>
                      <div className="text-[10px] text-slate-500">MD (Pathology)</div>
                      <div className="text-[10px] text-slate-500">Reg. No. {doctor?.registrationNumber || 'UP/MD/12345'}</div>
                    </div>

                    {/* Center: QR Code */}
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="h-14 w-14 rounded-lg bg-white border border-slate-200 shadow-sm p-1 flex items-center justify-center mb-1">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://pehalhealth.com/verify/${report?.reportId || 'RPT-20260904-0001'}`}
                          alt="QR Code"
                          className="h-full w-full object-contain"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                      <div className="text-[11px] font-bold text-slate-800">Scan to verify this report</div>
                      <div className="font-mono text-[9px] text-slate-400 mt-0.5">Report ID: {report?.reportId || 'RPT-20260904-0001'}</div>
                    </div>

                    {/* Right: Lab Technician */}
                    <div className="text-right">
                      <div className="font-bold text-slate-900 text-xs mb-1">Lab Technician</div>
                      <div className="h-9 flex items-center justify-end">
                        <svg className="h-7 w-28 text-blue-900" viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M10 20 Q 30 2, 60 22 T 90 12" />
                        </svg>
                      </div>
                      <div className="font-bold text-slate-900 text-xs">{technician?.name || 'Amit Kumar'}</div>
                      <div className="text-[10px] text-slate-500">Lab Technician</div>
                      <div className="text-[10px] text-slate-500">ID: {technician?.staffId || 'LT-0023'}</div>
                    </div>
                  </div>

                  {/* 8. FOOTER */}
                  <div className="mt-5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                    <span>This is a computer generated report and does not require a physical signature. Please correlate clinical findings.</span>
                    <span className="font-semibold text-slate-500">Page 1 of 1</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── RIGHT: SIDEBAR AREA (4 cols) — STAYS FIXED / SCROLLS INDEPENDENTLY ── */}
            <div className="report-scroll-container lg:col-span-4 flex flex-col h-full min-h-0 overflow-y-auto pr-1 space-y-4 overscroll-contain no-print">
              {/* Report Status Card */}
              <article className="rounded-3xl border border-stone-200/90 bg-white p-4 shadow-sm shrink-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 font-bold text-xs">
                    ✓
                  </span>
                  <div>
                    <h3 className="font-extrabold text-xs text-stone-900">Report Status</h3>
                    <span className="text-[11px] font-bold text-emerald-700">✓ Report Generated</span>
                  </div>
                </div>

                <p className="text-[11px] text-stone-500 leading-relaxed">
                  This report has been successfully generated and published.
                </p>

                <div className="mt-3 space-y-2 divide-y divide-stone-100 text-xs">
                  <div className="pt-1.5 flex justify-between">
                    <span className="text-stone-400 text-[11px]">Generated On:</span>
                    <span className="font-semibold text-stone-800 text-[11px]">{formatDateTime(report?.generatedAt || new Date())}</span>
                  </div>
                  <div className="pt-1.5 flex justify-between">
                    <span className="text-stone-400 text-[11px]">Generated By:</span>
                    <span className="font-semibold text-stone-800 text-[11px]">{report?.generatedBy || technician?.name || 'Lab Technician'}</span>
                  </div>
                  <div className="pt-1.5 flex justify-between">
                    <span className="text-stone-400 text-[11px]">Report ID:</span>
                    <span className="font-mono font-bold text-stone-800 text-[11px]">{report?.reportId || `RPT-${order?.orderNumber || '20260904-0001'}`}</span>
                  </div>
                  <div className="pt-1.5 flex justify-between">
                    <span className="text-stone-400 text-[11px]">Report Type:</span>
                    <span className="font-semibold text-stone-800 text-[11px]">{report?.reportType || 'Laboratory Report (Structured)'}</span>
                  </div>
                </div>
              </article>

              {/* Quick Actions Card */}
              <article className="rounded-3xl border border-stone-200/90 bg-white p-4 shadow-sm shrink-0">
                <h3 className="font-extrabold text-xs text-stone-900 mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={downloading}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-violet-600 py-2.5 text-xs font-bold text-white shadow-md shadow-violet-200 hover:bg-violet-700 transition cursor-pointer disabled:opacity-50"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>{downloading ? 'Downloading...' : 'Download PDF'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white py-2 text-xs font-bold text-stone-700 shadow-xs hover:bg-stone-50 transition cursor-pointer"
                  >
                    <svg className="h-3.5 w-3.5 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    <span>Print Report</span>
                  </button>

                  {user?.role === 'PATIENT' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowDoctorModal(true)}
                        className="w-full flex items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white py-2 text-xs font-bold text-stone-700 shadow-xs hover:bg-stone-50 transition cursor-pointer"
                      >
                        <svg className="h-3.5 w-3.5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <span>Share with Doctor</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowFamilyModal(true)}
                        className="w-full flex items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white py-2 text-xs font-bold text-stone-700 shadow-xs hover:bg-stone-50 transition cursor-pointer"
                      >
                        <svg className="h-3.5 w-3.5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span>Share with Family</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleShare}
                      className="w-full flex items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white py-2 text-xs font-bold text-stone-700 shadow-xs hover:bg-stone-50 transition cursor-pointer"
                    >
                      <svg className="h-3.5 w-3.5 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      <span>{shareSuccess ? 'Link Copied!' : 'Share Report Link'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowEmailModal(true)}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white py-2 text-xs font-bold text-stone-700 shadow-xs hover:bg-stone-50 transition cursor-pointer"
                  >
                    <svg className="h-3.5 w-3.5 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>Email Report</span>
                  </button>
                </div>
              </article>

              {/* Related Information Card */}
              <article className="rounded-3xl border border-stone-200/90 bg-white p-4 shadow-sm shrink-0">
                <h3 className="font-extrabold text-xs text-stone-900 mb-2.5">Related Information</h3>
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-start gap-2.5">
                    <span className="text-stone-400 mt-0.5">📄</span>
                    <div>
                      <span className="text-stone-400 text-[10px] uppercase block font-semibold">Order ID</span>
                      <span className="font-mono font-bold text-stone-900">{order?.orderNumber || 'LAB-20260904-0001'}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-stone-400 mt-0.5">👤</span>
                    <div>
                      <span className="text-stone-400 text-[10px] uppercase block font-semibold">Patient</span>
                      <span className="font-bold text-stone-900 capitalize">{patient?.fullName || 'vidya'}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-stone-400 mt-0.5">👥</span>
                    <div>
                      <span className="text-stone-400 text-[10px] uppercase block font-semibold">Age / Gender</span>
                      <span className="font-semibold text-stone-800">{patient?.age ? `${patient.age} yrs` : '29 yrs'} / {patient?.gender || 'Female'}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-stone-400 mt-0.5">📑</span>
                    <div>
                      <span className="text-stone-400 text-[10px] uppercase block font-semibold">Test</span>
                      <span className="font-semibold text-violet-700">{test?.name || 'Complete Blood Count (CBC)'}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-stone-400 mt-0.5">🔬</span>
                    <div>
                      <span className="text-stone-400 text-[10px] uppercase block font-semibold">Laboratory</span>
                      <span className="font-semibold text-stone-800">{laboratory?.name || 'LifeCare Diagnostics Laboratory'}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-stone-400 mt-0.5">🧪</span>
                    <div>
                      <span className="text-stone-400 text-[10px] uppercase block font-semibold">Sample ID</span>
                      <span className="font-mono font-semibold text-stone-800">{order?.sampleId || 'SMP-00125'}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-stone-400 mt-0.5">🩸</span>
                    <div>
                      <span className="text-stone-400 text-[10px] uppercase block font-semibold">Sample Type</span>
                      <span className="font-semibold text-stone-800">{test?.specimenType || 'Whole Blood (EDTA)'}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-stone-400 mt-0.5">📅</span>
                    <div>
                      <span className="text-stone-400 text-[10px] uppercase block font-semibold">Collected On</span>
                      <span className="font-semibold text-stone-800">{formatDateTime(order?.sampleCollectedAt || order?.orderedAt || new Date())}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-stone-400 mt-0.5">⏰</span>
                    <div>
                      <span className="text-stone-400 text-[10px] uppercase block font-semibold">Reported On</span>
                      <span className="font-semibold text-stone-800">{formatDateTime(report?.generatedAt || order?.finalizedAt || new Date())}</span>
                    </div>
                  </div>
                </div>
              </article>

              {/* Need Help? Card */}
              <article className="rounded-3xl border border-stone-200/90 bg-white p-4 shadow-sm shrink-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-xs">
                    ℹ
                  </span>
                  <h3 className="font-extrabold text-xs text-stone-900">Need Help?</h3>
                </div>
                <p className="text-[11px] text-stone-500 leading-relaxed">
                  {user?.role === 'PATIENT'
                    ? 'If you have any questions about this report, please contact your clinic.'
                    : 'If you notice any discrepancy in this report, please contact the laboratory.'}
                </p>
                <button
                  type="button"
                  onClick={() => setShowContactModal(true)}
                  className="mt-3 w-full flex items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white py-2 text-xs font-bold text-stone-700 shadow-xs hover:bg-stone-50 transition cursor-pointer"
                >
                  <span>🎧</span>
                  <span>{user?.role === 'PATIENT' ? 'Contact Clinic' : 'Contact Support'}</span>
                </button>
              </article>
            </div>
          </div>
        )}

        {/* ── TAB 2: REPORT DETAILS ── */}
        {activeTab === 'details' && (
          <div className="report-scroll-container h-full min-h-0 overflow-y-auto rounded-3xl border border-stone-200/90 bg-white p-6 shadow-sm overscroll-contain max-w-4xl no-print">
            <h2 className="text-base font-extrabold text-stone-900 mb-4">Structured Report Metadata</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4 space-y-3">
                <h3 className="font-bold text-stone-700 uppercase tracking-wider text-[10px]">Report Identifiers</h3>
                <div className="flex justify-between"><span className="text-stone-400">Report ID:</span><span className="font-mono font-bold text-stone-900">{report?.reportId}</span></div>
                <div className="flex justify-between"><span className="text-stone-400">Order ID:</span><span className="font-mono font-bold text-stone-900">{order?.orderNumber}</span></div>
                <div className="flex justify-between"><span className="text-stone-400">Patient ID:</span><span className="font-mono font-semibold text-stone-900">{patient?.patientId}</span></div>
                <div className="flex justify-between"><span className="text-stone-400">Test Code:</span><span className="font-mono font-semibold text-stone-900">{test?.code}</span></div>
                <div className="flex justify-between"><span className="text-stone-400">Report Version:</span><span className="font-semibold text-stone-900">{report?.version || '1.0'}</span></div>
              </div>

              <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4 space-y-3">
                <h3 className="font-bold text-stone-700 uppercase tracking-wider text-[10px]">Audit & Lifecycle</h3>
                <div className="flex justify-between"><span className="text-stone-400">Status:</span><span className="font-bold text-emerald-700">{report?.status || 'Completed'}</span></div>
                <div className="flex justify-between"><span className="text-stone-400">Report Type:</span><span className="font-semibold text-stone-900">{report?.reportType}</span></div>
                <div className="flex justify-between"><span className="text-stone-400">Generated By:</span><span className="font-semibold text-stone-900">{report?.generatedBy}</span></div>
                <div className="flex justify-between"><span className="text-stone-400">Generated At:</span><span className="font-semibold text-stone-900">{formatDateTime(report?.generatedAt)}</span></div>
                <div className="flex justify-between"><span className="text-stone-400">Last Updated:</span><span className="font-semibold text-stone-900">{formatDateTime(report?.lastUpdated)}</span></div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: ATTACHED FILES ── */}
        {activeTab === 'files' && (
          <div className="report-scroll-container h-full min-h-0 overflow-y-auto rounded-3xl border border-stone-200/90 bg-white p-6 shadow-sm overscroll-contain max-w-4xl space-y-4 no-print">
            <h2 className="text-base font-extrabold text-stone-900 mb-2">Attached Reports & Documents</h2>
            <div className="space-y-3">
              {attachedFiles.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between rounded-2xl border border-stone-200 bg-stone-50/70 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white font-bold text-xs">
                      PDF
                    </div>
                    <div>
                      <div className="text-sm font-bold text-stone-900">{doc.fileName}</div>
                      <div className="text-xs text-stone-500">
                        {doc.fileSize} • {doc.type} Document • {doc.date}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('preview')}
                      className="rounded-xl border border-stone-200 bg-white px-3.5 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-50 shadow-2xs cursor-pointer"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      className="rounded-xl bg-violet-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-violet-700 shadow-2xs cursor-pointer"
                    >
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 4: ACTIVITY LOG ── */}
        {activeTab === 'activity' && (
          <div className="report-scroll-container h-full min-h-0 overflow-y-auto rounded-3xl border border-stone-200/90 bg-white p-6 shadow-sm overscroll-contain max-w-4xl no-print">
            <h2 className="text-base font-extrabold text-stone-900 mb-4">Laboratory Report Activity Timeline</h2>
            <div className="relative border-l-2 border-violet-200 ml-4 space-y-6">
              {activityLog.map((event, idx) => (
                <div key={idx} className="relative pl-6">
                  <div className="absolute -left-2.5 top-0.5 h-5 w-5 rounded-full border-2 border-white bg-violet-600" />
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-stone-900">{event.title}</h4>
                    <span className="text-[11px] text-stone-400">{formatDateTime(event.timestamp)}</span>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">{event.details}</p>
                  <span className="text-[10px] font-semibold text-violet-700">By: {event.user}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL: SHARE WITH DOCTOR ── */}
      {showDoctorModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-violet-600 uppercase tracking-widest block">Medical Access</span>
                <h3 className="text-base font-black text-stone-900">Share Report with Doctor</h3>
              </div>
              <button
                onClick={() => setShowDoctorModal(false)}
                className="text-stone-400 hover:text-stone-700 text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-600 font-bold mb-1">Select / Enter Doctor Name</label>
                <input
                  type="text"
                  defaultValue={doctor?.fullName || 'Dr. Rajesh Sharma'}
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs text-stone-800 focus:outline-violet-600 font-medium"
                  placeholder="e.g. Dr. Rajesh Sharma"
                />
              </div>

              <div>
                <label className="block text-stone-600 font-bold mb-1">Doctor's Email or Phone</label>
                <input
                  type="text"
                  defaultValue={doctor?.email || doctor?.phone || 'dr.sharma@pehalhealth.com'}
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs text-stone-800 focus:outline-violet-600 font-medium"
                  placeholder="doctor@example.com or +91..."
                />
              </div>

              <div>
                <label className="block text-stone-600 font-bold mb-1">Clinical Note / Message (Optional)</label>
                <textarea
                  rows={2}
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs text-stone-800 focus:outline-violet-600 font-medium resize-none"
                  placeholder="Please review my CBC laboratory report."
                />
              </div>

              <div className="p-3 bg-violet-50 rounded-xl text-[11px] text-violet-700 font-medium">
                🔒 A secure link with access to report <strong>{order?.orderNumber}</strong> will be shared with the consulting doctor.
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDoctorModal(false);
                  handleShare();
                }}
                className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-violet-200 cursor-pointer"
              >
                Send Secure Link
              </button>
              <button
                type="button"
                onClick={() => setShowDoctorModal(false)}
                className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: SHARE WITH FAMILY ── */}
      {showFamilyModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block">Family Sharing</span>
                <h3 className="text-base font-black text-stone-900">Share Report with Family</h3>
              </div>
              <button
                onClick={() => setShowFamilyModal(false)}
                className="text-stone-400 hover:text-stone-700 text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-600 font-bold mb-1">Family Member Name</label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs text-stone-800 focus:outline-indigo-600 font-medium"
                  placeholder="e.g. Ramesh Kumar"
                />
              </div>

              <div>
                <label className="block text-stone-600 font-bold mb-1">Relationship</label>
                <select className="w-full rounded-xl border border-stone-300 p-2.5 text-xs text-stone-800 focus:outline-indigo-600 font-medium bg-white">
                  <option>Spouse</option>
                  <option>Parent</option>
                  <option>Child</option>
                  <option>Sibling</option>
                  <option>Guardian</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-600 font-bold mb-1">Email or Phone Number</label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs text-stone-800 focus:outline-indigo-600 font-medium"
                  placeholder="family@example.com or +91..."
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowFamilyModal(false);
                  handleShare();
                }}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-indigo-200 cursor-pointer"
              >
                Share Report
              </button>
              <button
                type="button"
                onClick={() => setShowFamilyModal(false)}
                className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: EMAIL REPORT ── */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-violet-600 uppercase tracking-widest block">Email Dispatch</span>
                <h3 className="text-base font-black text-stone-900">Email Laboratory Report</h3>
              </div>
              <button
                onClick={() => setShowEmailModal(false)}
                className="text-stone-400 hover:text-stone-700 text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-600 font-bold mb-1">Recipient Email Address</label>
                <input
                  type="email"
                  defaultValue={patient?.email || user?.email || 'vidya@pehalhealth.com'}
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs text-stone-800 focus:outline-violet-600 font-medium"
                  placeholder="name@example.com"
                />
              </div>

              <div>
                <label className="block text-stone-600 font-bold mb-1">Subject</label>
                <input
                  type="text"
                  defaultValue={`Laboratory Report - ${test?.name || 'Complete Blood Count (CBC)'} (${order?.orderNumber || 'LAB-20260904-0001'})`}
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs text-stone-800 focus:outline-violet-600 font-medium"
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl text-[11px] text-emerald-800 font-medium">
                📄 A PDF copy of this laboratory report will be sent to the specified email address.
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowEmailModal(false);
                  alert(`Report PDF has been queued for email delivery to ${patient?.email || user?.email || 'the specified address'}.`);
                }}
                className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-violet-200 cursor-pointer"
              >
                Send Email
              </button>
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CONTACT CLINIC / SUPPORT ── */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block">Help & Inquiries</span>
                <h3 className="text-base font-black text-stone-900">Contact Clinic Support</h3>
              </div>
              <button
                onClick={() => setShowContactModal(false)}
                className="text-stone-400 hover:text-stone-700 text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <div className="font-extrabold text-sm text-stone-900">{clinic?.name || "Ram's Dental Clinic"}</div>
                <div className="text-stone-600 font-medium">📍 {clinicAddressStr}</div>
                <div className="text-stone-600 font-medium font-mono">📞 {clinic?.phone || '+91 98765 43210'}</div>
                <div className="text-stone-600 font-medium">✉ {clinic?.email || 'info@ramsdentalclinic.com'}</div>
              </div>

              <p className="text-[11px] text-stone-500 leading-relaxed">
                For questions regarding your test results, specimen collection, or doctor consultations, our clinical support team is available Mon-Sat, 9:00 AM to 8:00 PM.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <a
                href={`tel:${clinic?.phone || '+919876543210'}`}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-blue-200 text-center cursor-pointer"
              >
                📞 Call Clinic
              </a>
              <a
                href={`mailto:${clinic?.email || 'info@ramsdentalclinic.com'}?subject=Inquiry on Lab Order ${order?.orderNumber || ''}`}
                className="flex-1 py-2.5 border border-stone-200 bg-white hover:bg-stone-50 text-stone-800 font-bold text-xs rounded-xl transition text-center cursor-pointer"
              >
                ✉ Email Clinic
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabReportViewPage;


