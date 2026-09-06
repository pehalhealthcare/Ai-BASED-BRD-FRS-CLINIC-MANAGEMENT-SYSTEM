import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import Badge from '../../components/common/Badge';
import { ADMIN_ROLES, ROLES } from '../../constants/roles';
import useAuth from '../../hooks/useAuth';
import aiApi from '../../api/aiApi';

import {
  getLabOrder,
  getOrderResults,
  initializeOrderResults,
  saveResultsBatch,
  finalizeOrder,
  updateLabOrderStatus
} from './labApi';

import LabExtractionReviewDrawer from './LabExtractionReviewDrawer';

/**
 * Flag color mapper & visual indicators
 */
const getFlagTone = (flag) => {
  switch (flag) {
    case 'normal':
      return 'success';
    case 'low':
    case 'high':
    case 'abnormal':
      return 'warning';
    case 'critical_low':
    case 'critical_high':
    case 'critical':
      return 'danger';
    case 'not_applicable':
      return 'neutral';
    default:
      return 'neutral';
  }
};

const getFlagLabel = (flag) => {
  switch (flag) {
    case 'normal':
      return 'Normal';
    case 'low':
      return 'Low';
    case 'high':
      return 'High';
    case 'abnormal':
      return 'Abnormal';
    case 'critical_low':
      return 'Crit Low';
    case 'critical_high':
      return 'Crit High';
    case 'critical':
      return 'Critical';
    case 'not_applicable':
      return 'N/A';
    default:
      return 'Pending';
  }
};

/**
 * Normalized Flag Options & Visual Tokens
 */
const FLAG_OPTIONS = [
  {
    value: 'normal',
    label: 'Normal',
    icon: '🟢',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100',
    dotClass: 'bg-emerald-500'
  },
  {
    value: 'abnormal',
    label: 'Abnormal',
    icon: '🟠',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100',
    dotClass: 'bg-amber-500'
  },
  {
    value: 'critical',
    label: 'Critical',
    icon: '🔴',
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-300 hover:bg-rose-200',
    dotClass: 'bg-rose-500'
  },
  {
    value: 'pending',
    label: 'Pending',
    icon: '⚪',
    badgeClass: 'bg-stone-100 text-stone-800 border-stone-300 hover:bg-stone-200',
    dotClass: 'bg-stone-400'
  }
];

const normalizeFlagForFilter = (flag, status) => {
  if (status === 'not_applicable') return 'not_applicable';
  if (!flag || flag === 'pending' || flag === 'not_evaluated' || flag === '') {
    return status === 'entered' ? 'normal' : 'pending';
  }
  if (flag === 'normal') return 'normal';
  if (['low', 'high', 'abnormal'].includes(flag)) return 'abnormal';
  if (['critical_low', 'critical_high', 'critical'].includes(flag)) return 'critical';
  return 'pending';
};

/**
 * Portal-based flag selector dropdown to avoid table clipping and viewport overflow
 */
const FlagDropdown = ({
  flag,
  isManual,
  status,
  disabled,
  isOpen,
  onToggleOpen,
  onSelectFlag,
  onResetAuto
}) => {
  const norm = normalizeFlagForFilter(flag, status);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, opensUp: false });

  let displayLabel = 'Pending';
  let displayIcon = '⚪';
  let badgeStyle = 'bg-stone-100 text-stone-700 border-stone-300 hover:bg-stone-200';

  if (flag === 'normal') {
    displayLabel = 'Normal';
    displayIcon = '🟢';
    badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100';
  } else if (flag === 'low') {
    displayLabel = 'Low';
    displayIcon = '🟠';
    badgeStyle = 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100';
  } else if (flag === 'high') {
    displayLabel = 'High';
    displayIcon = '🟠';
    badgeStyle = 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100';
  } else if (flag === 'abnormal') {
    displayLabel = 'Abnormal';
    displayIcon = '🟠';
    badgeStyle = 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100';
  } else if (flag === 'critical_low') {
    displayLabel = 'Crit Low';
    displayIcon = '🔴';
    badgeStyle = 'bg-rose-100 text-rose-900 border-rose-300 hover:bg-rose-200';
  } else if (flag === 'critical_high') {
    displayLabel = 'Crit High';
    displayIcon = '🔴';
    badgeStyle = 'bg-rose-100 text-rose-900 border-rose-300 hover:bg-rose-200';
  } else if (flag === 'critical') {
    displayLabel = 'Critical';
    displayIcon = '🔴';
    badgeStyle = 'bg-rose-100 text-rose-900 border-rose-300 hover:bg-rose-200';
  } else if (status === 'not_applicable') {
    displayLabel = 'N/A';
    displayIcon = '—';
    badgeStyle = 'bg-stone-100 text-stone-500 border-stone-200';
  }

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 220;
    const popoverHeight = 230;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const shouldOpenUp = spaceBelow < popoverHeight && spaceAbove >= popoverHeight;

    let top = shouldOpenUp ? rect.top - popoverHeight - 6 : rect.bottom + 6;
    let left = rect.left;

    if (left + popoverWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - popoverWidth - 12);
    }
    if (left < 12) {
      left = 12;
    }

    setCoords({ top, left, opensUp: shouldOpenUp });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleScrollOrResize = () => updatePosition();
    const handleClickOutside = (e) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target) &&
        triggerRef.current && !triggerRef.current.contains(e.target)
      ) {
        onToggleOpen();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onToggleOpen();
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, updatePosition, onToggleOpen]);

  const menuContent = isOpen && !disabled ? (
    <div
      ref={popoverRef}
      style={{
        position: 'fixed',
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        width: '220px',
        zIndex: 9999
      }}
      onClick={(e) => e.stopPropagation()}
      className="rounded-2xl border border-stone-200 bg-white p-2 shadow-2xl text-left animate-in fade-in zoom-in-95 duration-100 select-none"
    >
      <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
        Set Parameter Flag
      </div>
      <div className="space-y-0.5">
        {FLAG_OPTIONS.map((opt) => {
          const isSelected = norm === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSelectFlag(opt.value)}
              className={`w-full flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-semibold transition cursor-pointer ${
                isSelected
                  ? `${opt.badgeClass} font-bold`
                  : 'text-stone-700 hover:bg-stone-100'
              }`}
            >
              <span className="flex items-center gap-2">
                <span>{opt.icon}</span>
                <span>{opt.label}</span>
              </span>
              {isSelected && isManual ? (
                <span className="rounded bg-black/10 px-1.5 py-0.5 text-[9px] font-bold text-stone-800">
                  ✓ Manual
                </span>
              ) : isSelected ? (
                <span className="rounded bg-stone-200/80 px-1.5 py-0.5 text-[9px] font-bold text-stone-700">
                  ✓ Auto
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="my-1.5 border-t border-stone-100" />

      <button
        type="button"
        onClick={onResetAuto}
        className="w-full flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-50 transition cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <span>↻</span>
          <span>Reset to Automatic</span>
        </span>
        {!isManual ? (
          <span className="text-[10px] text-purple-500 font-bold">Active</span>
        ) : null}
      </button>
    </div>
  ) : null;

  return (
    <div className="relative inline-block text-left">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          onToggleOpen();
        }}
        className={`inline-flex items-center justify-between gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-bold transition shadow-2xs select-none ${badgeStyle} ${
          disabled ? 'opacity-70 cursor-default' : 'hover:shadow-xs cursor-pointer'
        }`}
        title={isManual ? 'Manual flag override active (Click to change or reset)' : 'Click to override flag'}
      >
        <span className="inline-flex items-center gap-1.5 truncate">
          <span>{displayIcon}</span>
          <span>{displayLabel}</span>
          {isManual ? (
            <span className="rounded bg-black/10 px-1 py-0.5 text-[9px] font-extrabold uppercase tracking-tight text-stone-800">
              Manual
            </span>
          ) : null}
        </span>
        {!disabled && (
          <svg
            className={`h-3 w-3 shrink-0 opacity-70 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {typeof document !== 'undefined' && menuContent ? createPortal(menuContent, document.body) : null}
    </div>
  );
};

const RowActionsDropdown = ({
  isOpen,
  onToggle,
  onClose,
  onFlagAbnormal,
  onFlagCritical,
  onResetAuto,
  onToggleNA,
  isNA,
  disabled
}) => {
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 190;
    const popoverHeight = 160;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const shouldOpenUp = spaceBelow < popoverHeight && spaceAbove >= popoverHeight;

    let top = shouldOpenUp ? rect.top - popoverHeight - 4 : rect.bottom + 4;
    let left = rect.right - popoverWidth;

    if (left < 10) left = 10;
    setCoords({ top, left });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleScrollOrResize = () => updatePosition();
    const handleClickOutside = (e) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target) &&
        triggerRef.current && !triggerRef.current.contains(e.target)
      ) {
        onClose();
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, updatePosition, onClose]);

  if (disabled) return null;

  const menuContent = isOpen ? (
    <div
      ref={popoverRef}
      style={{
        position: 'fixed',
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        width: '190px',
        zIndex: 9999
      }}
      onClick={(e) => e.stopPropagation()}
      className="rounded-2xl border border-stone-200 bg-white p-1.5 shadow-2xl text-left text-xs animate-in fade-in zoom-in-95 duration-100 select-none"
    >
      <button
        type="button"
        onClick={() => {
          onFlagAbnormal();
          onClose();
        }}
        className="w-full rounded-xl px-2.5 py-1.5 text-left font-semibold text-stone-700 hover:bg-stone-100 cursor-pointer"
      >
        Flag as Abnormal
      </button>
      <button
        type="button"
        onClick={() => {
          onFlagCritical();
          onClose();
        }}
        className="w-full rounded-xl px-2.5 py-1.5 text-left font-semibold text-rose-700 hover:bg-rose-50 cursor-pointer"
      >
        Flag as Critical
      </button>
      <button
        type="button"
        onClick={() => {
          onResetAuto();
          onClose();
        }}
        className="w-full rounded-xl px-2.5 py-1.5 text-left font-semibold text-purple-700 hover:bg-purple-50 cursor-pointer"
      >
        Reset to Auto Flag
      </button>
      <div className="my-1 border-t border-stone-100" />
      <button
        type="button"
        onClick={() => {
          onToggleNA();
          onClose();
        }}
        className="w-full rounded-xl px-2.5 py-1.5 text-left font-semibold text-stone-700 hover:bg-stone-100 cursor-pointer"
      >
        {isNA ? 'Re-enable Parameter' : 'Mark as N/A'}
      </button>
    </div>
  ) : null;

  return (
    <div className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 cursor-pointer"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>
      {typeof document !== 'undefined' && menuContent ? createPortal(menuContent, document.body) : null}
    </div>
  );
};

/**
 * Client-side auto flag calculation with robust range parsing
 */
const computeLocalFlag = (value, resultType, refRange, critLow, critHigh, allowedValues = []) => {
  if (value === '' || value == null) return 'not_evaluated';

  if (resultType === 'NUMERIC') {
    const num = parseFloat(String(value).trim());
    if (isNaN(num)) return 'not_evaluated';

    if (critLow != null && !isNaN(critLow) && num <= critLow) return 'critical_low';
    if (critHigh != null && !isNaN(critHigh) && num >= critHigh) return 'critical_high';

    let min = refRange?.min;
    let max = refRange?.max;

    if ((min == null || max == null || isNaN(min) || isNaN(max)) && refRange?.text) {
      const match = refRange.text.match(/([\d.]+)\s*[-–—to]+\s*([\d.]+)/i);
      if (match) {
        min = parseFloat(match[1]);
        max = parseFloat(match[2]);
      }
    }

    if (min != null && max != null && !isNaN(min) && !isNaN(max)) {
      if (num < min) return 'low';
      if (num > max) return 'high';
      return 'normal';
    }
    return 'not_evaluated';
  }

  if (allowedValues?.length) {
    const match = allowedValues.find((av) => av.value?.toLowerCase() === String(value).trim().toLowerCase());
    if (match) {
      if (match.isCritical) return 'critical_high';
      if (match.isAbnormal) return 'abnormal';
      return 'normal';
    }
  }

  return 'not_evaluated';
};

const PAGE_SIZE_OPTIONS = [12, 25, 50, 100];

const LabEnterResultsPage = () => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [order, setOrder] = useState(null);
  const [report, setReport] = useState(null);
  const [resultsData, setResultsData] = useState({ groups: [], totalParams: 0, completedParams: 0 });
  const [activeTestCode, setActiveTestCode] = useState(searchParams.get('testCode') || '');
  const [resultsState, setResultsState] = useState({});
  const [originalSnapshot, setOriginalSnapshot] = useState({});
  const [overallComment, setOverallComment] = useState('');

  // Synchronous ref to prevent stale closures during debounced saves
  const resultsStateRef = useRef({});
  const autoSaveTimerRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState(null);

  // Active Main Tab: investigations, patient, sample, activity
  const [mainTab, setMainTab] = useState('investigations');

  // Workflow Modals
  const [isSubmitReviewModalOpen, setIsSubmitReviewModalOpen] = useState(false);
  const [isReturnCorrectionModalOpen, setIsReturnCorrectionModalOpen] = useState(false);
  const [isApproveResultsModalOpen, setIsApproveResultsModalOpen] = useState(false);
  const [correctionReason, setCorrectionReason] = useState('');
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [isSubmittingWorkflow, setIsSubmittingWorkflow] = useState(false);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [flagFilter, setFlagFilter] = useState('ALL');
  const [parameterFilterDropdown, setParameterFilterDropdown] = useState('ALL');
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  // File Upload & OCR Extraction
  const [attachedFile, setAttachedFile] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [isExtractionOpen, setIsExtractionOpen] = useState(false);
  const [extractedEntries, setExtractedEntries] = useState([]);
  const [activeMenuRowId, setActiveMenuRowId] = useState(null);
  const [openFlagDropdownId, setOpenFlagDropdownId] = useState(null);

  const isReviewer = [ROLES.DOCTOR, ...ADMIN_ROLES].includes(user?.role);
  const isOrderInReview = order?.status === 'ready_for_review';
  const isOrderCompleted = order?.status === 'completed' || order?.status === 'finalized';
  const isLocked = isOrderInReview || isOrderCompleted;

  // Close popups on background click
  useEffect(() => {
    const handleDocumentClick = () => {
      setOpenFlagDropdownId(null);
      setActiveMenuRowId(null);
    };
    window.addEventListener('click', handleDocumentClick);
    return () => window.removeEventListener('click', handleDocumentClick);
  }, []);

  // Load Order and Results
  const loadOrderAndResults = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [orderRes, resultsRes] = await Promise.all([
        getLabOrder(id),
        getOrderResults(id).catch(() => ({ data: { groups: [], totalParams: 0, completedParams: 0 } }))
      ]);

      const labOrder = orderRes.data.labOrder;
      setOrder(labOrder);
      setReport(orderRes.data.report || null);
      setOverallComment(labOrder.notes || '');

      let rData = resultsRes.data || { groups: [], totalParams: 0, completedParams: 0 };

      // If no results initialized yet, auto initialize
      if ((!rData.groups || rData.groups.length === 0) && labOrder?.tests?.length) {
        await initializeOrderResults(id);
        const freshResults = await getOrderResults(id);
        rData = freshResults.data;
      }

      setResultsData(rData);

      const initial = {};
      (rData.groups || []).forEach((g) => {
        (g.results || []).forEach((r) => {
          const key = r._id || r.resultId;
          initial[key] = {
            _id: key,
            resultId: key,
            value: r.value != null ? String(r.value) : '',
            numericValue: r.numericValue ?? null,
            unit: r.unit ?? '',
            manualFlag: r.manualFlag ?? '',
            flagSource: r.flagSource || (r.isFlagManuallyOverridden ? 'manual' : 'automatic'),
            overrideReason: r.overrideReason ?? '',
            comment: r.comment ?? '',
            status: r.status ?? 'pending',
            autoFlag: r.autoFlag ?? 'not_evaluated',
            effectiveFlag: r.effectiveFlag ?? 'not_evaluated',
            isFlagManuallyOverridden: r.isFlagManuallyOverridden ?? false,
            isLocked: r.isLocked ?? false,
            // metadata
            resultType: r.resultType,
            referenceRange: r.referenceRange,
            criticalLow: r.criticalLow,
            criticalHigh: r.criticalHigh,
            allowedValues: r.allowedValues,
            parameterName: r.parameterName,
            parameterShortName: r.parameterShortName,
            parameterCode: r.parameterCode,
            testCode: r.testCode,
            testName: r.testName,
            isRequired: r.isRequired
          };
        });
      });

      setResultsState(initial);
      resultsStateRef.current = initial;
      setOriginalSnapshot(JSON.parse(JSON.stringify(initial)));
      setHasUnsavedChanges(false);

      const initialCode = searchParams.get('testCode');
      if (initialCode && rData.groups?.some((g) => g.testCode === initialCode || g.testName === initialCode)) {
        setActiveTestCode(initialCode);
      } else if (rData.groups?.length > 0) {
        setActiveTestCode(rData.groups[0].testCode || rData.groups[0].testName);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load diagnostic test workspace.');
    } finally {
      setLoading(false);
    }
  }, [id, searchParams]);

  useEffect(() => {
    loadOrderAndResults();
  }, [loadOrderAndResults]);

  // Unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleBackToOrder = (e) => {
    if (hasUnsavedChanges) {
      const confirmLeave = window.confirm('You have unsaved changes.\n\nLeave without saving?');
      if (!confirmLeave) {
        if (e) e.preventDefault();
        return;
      }
    }
    navigate(`/labs/orders/${order?._id || id}`);
  };

  // Active Group calculation
  const currentGroup = useMemo(() => {
    if (!resultsData.groups?.length) return { results: [] };
    const found = resultsData.groups.find(
      (g) => g.testCode === activeTestCode || g.testName === activeTestCode
    );
    return found || resultsData.groups[0] || { results: [] };
  }, [resultsData.groups, activeTestCode]);

  // Active Group's parameters list with live local state applied
  const groupResults = useMemo(() => {
    return (currentGroup.results || []).map((r) => {
      const key = r._id || r.resultId;
      const stateItem = resultsState[key];
      return {
        ...r,
        ...(stateItem || {}),
        _id: key,
        resultId: key
      };
    });
  }, [currentGroup, resultsState]);

  // Handle Tab Switch
  const handleSelectTest = (testCode) => {
    setActiveTestCode(testCode);
    setSearchParams({ testCode }, { replace: true });
    setCurrentPage(1);
    setValidationErrors(null);
  };

  // Result Value Change
  const handleValueChange = (resultId, rawValue) => {
    if (!resultId || isLocked) return;
    const strVal = String(rawValue);

    setResultsState((prev) => {
      const item = prev[resultId] || resultsStateRef.current[resultId];
      if (!item) return prev;

      const autoFlag = computeLocalFlag(
        strVal,
        item.resultType,
        item.referenceRange,
        item.criticalLow,
        item.criticalHigh,
        item.allowedValues
      );

      const effectiveFlag = item.isFlagManuallyOverridden && item.manualFlag ? item.manualFlag : autoFlag;
      const isEntered = strVal.trim() !== '' && strVal.trim() !== 'N/A';
      const status = isEntered ? 'entered' : 'pending';
      const numericValue = item.resultType === 'NUMERIC' && isEntered && !isNaN(parseFloat(strVal))
        ? parseFloat(strVal)
        : null;

      const updatedItem = {
        ...item,
        _id: resultId,
        resultId,
        value: strVal,
        numericValue,
        autoFlag,
        effectiveFlag,
        status
      };

      const nextState = {
        ...prev,
        [resultId]: updatedItem
      };

      resultsStateRef.current = nextState;
      return nextState;
    });

    setHasUnsavedChanges(true);
    setValidationErrors(null);

    // Debounced autosave (1 second)
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      handleSave(false);
    }, 1000);
  };

  // Comment Change
  const handleCommentChange = (resultId, comment) => {
    if (!resultId || isLocked) return;
    setResultsState((prev) => {
      const item = prev[resultId] || resultsStateRef.current[resultId];
      if (!item) return prev;
      const nextState = { ...prev, [resultId]: { ...item, _id: resultId, resultId, comment } };
      resultsStateRef.current = nextState;
      return nextState;
    });
    setHasUnsavedChanges(true);

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      handleSave(false);
    }, 1000);
  };

  // Overall Comment Change
  const handleOverallCommentChange = (text) => {
    if (isLocked) return;
    setOverallComment(text);
    setHasUnsavedChanges(true);

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      handleSave(false);
    }, 1000);
  };

  // Manual Flag Override or Reset to Auto
  const handleFlagSelect = (resultId, newFlag, isManual = true) => {
    if (!resultId || isLocked) return;
    setResultsState((prev) => {
      const item = prev[resultId] || resultsStateRef.current[resultId];
      if (!item) return prev;

      let manualFlag = item.manualFlag || '';
      let isFlagManuallyOverridden = item.isFlagManuallyOverridden || false;
      let flagSource = item.flagSource || 'automatic';
      let effectiveFlag = item.autoFlag || 'pending';

      if (isManual && newFlag && newFlag !== 'auto') {
        manualFlag = newFlag;
        isFlagManuallyOverridden = true;
        flagSource = 'manual';
        effectiveFlag = newFlag;
      } else {
        manualFlag = '';
        isFlagManuallyOverridden = false;
        flagSource = 'automatic';
        const auto = computeLocalFlag(
          item.value,
          item.resultType,
          item.referenceRange,
          item.criticalLow,
          item.criticalHigh,
          item.allowedValues
        );
        effectiveFlag = auto !== 'not_evaluated' ? auto : (item.status === 'entered' ? 'normal' : 'pending');
      }

      const nextState = {
        ...prev,
        [resultId]: {
          ...item,
          _id: resultId,
          resultId,
          manualFlag,
          isFlagManuallyOverridden,
          flagSource,
          effectiveFlag
        }
      };
      resultsStateRef.current = nextState;
      return nextState;
    });
    setHasUnsavedChanges(true);

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      handleSave(false);
    }, 1000);
  };

  // Save Results (Batch / Draft)
  const handleSave = async (showFeedback = true) => {
    if (!id || isLocked) return;
    const currentState = resultsStateRef.current;
    if (!currentState || Object.keys(currentState).length === 0) return;

    setIsSaving(true);
    setError('');

    try {
      const payloadResults = Object.values(currentState).map((item) => ({
        resultId: item.resultId || item._id,
        value: item.value,
        numericValue: item.numericValue,
        unit: item.unit,
        manualFlag: item.manualFlag,
        effectiveFlag: item.effectiveFlag,
        flagSource: item.flagSource || (item.isFlagManuallyOverridden ? 'manual' : 'automatic'),
        isFlagManuallyOverridden: item.isFlagManuallyOverridden,
        overrideReason: item.overrideReason,
        comment: item.comment,
        status: item.status
      }));

      await saveResultsBatch(id, {
        results: payloadResults,
        overallComment
      });

      setOriginalSnapshot(JSON.parse(JSON.stringify(currentState)));
      setHasUnsavedChanges(false);
      setLastSavedTime(new Date());
      if (showFeedback) {
        toast.success('Draft saved successfully.');
      }
    } catch (err) {
      if (showFeedback) {
        const msg = err.response?.data?.message || 'Error saving results.';
        setError(msg);
        toast.error(msg);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Check and isolate all missing required parameters
  const missingRequiredList = useMemo(() => {
    const missing = [];
    (resultsData.groups || []).forEach((g) => {
      (g.results || []).forEach((r) => {
        const key = r._id || r.resultId;
        const currentItem = resultsState[key] || r;
        if (currentItem.isRequired !== false) {
          if (
            currentItem.status === 'pending' ||
            currentItem.value == null ||
            (typeof currentItem.value === 'string' && currentItem.value.trim() === '')
          ) {
            missing.push({
              testName: g.testName,
              parameterName: currentItem.parameterName
            });
          }
        }
      });
    });
    return missing;
  }, [resultsData.groups, resultsState]);

  // Click "Mark Ready for Review"
  const handleInitiateReadyForReview = async () => {
    await handleSave(false);
    if (missingRequiredList.length > 0) {
      setValidationErrors({
        totalMissing: missingRequiredList.length,
        missingParams: missingRequiredList.map((m) => `${m.testName}: ${m.parameterName}`)
      });
      return;
    }
    setValidationErrors(null);
    setIsSubmitReviewModalOpen(true);
  };

  // Confirm Submit for Review
  const handleConfirmSubmitForReview = async () => {
    setIsSubmittingWorkflow(true);
    try {
      await updateLabOrderStatus(id, { status: 'ready_for_review' });
      toast.success('Results successfully submitted for review.');
      setIsSubmitReviewModalOpen(false);
      await loadOrderAndResults();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit results for review.');
    } finally {
      setIsSubmittingWorkflow(false);
    }
  };

  // Confirm Return for Correction (Reviewer)
  const handleConfirmReturnForCorrection = async () => {
    if (!correctionReason.trim() || correctionReason.trim().length < 5) {
      toast.error('Please enter a mandatory correction reason (at least 5 characters).');
      return;
    }

    setIsSubmittingWorkflow(true);
    try {
      await updateLabOrderStatus(id, {
        status: 'results_entry',
        notes: correctionReason.trim(),
        reason: correctionReason.trim()
      });
      toast.success('Results returned for correction. Technician editing unlocked.');
      setIsReturnCorrectionModalOpen(false);
      setCorrectionReason('');
      await loadOrderAndResults();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to return results for correction.');
    } finally {
      setIsSubmittingWorkflow(false);
    }
  };

  // Confirm Approval (Reviewer)
  const handleConfirmApproveResults = async () => {
    setIsSubmittingWorkflow(true);
    try {
      await finalizeOrder(id, {
        generatePdf: true,
        notes: reviewerNotes.trim()
      });
      toast.success('Laboratory results approved and official report published!');
      setIsApproveResultsModalOpen(false);
      navigate(`/labs/orders/${order?._id || id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve results.');
    } finally {
      setIsSubmittingWorkflow(false);
    }
  };

  // File Upload & OCR
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
    }
  };

  const handleExtractResults = async () => {
    if (!attachedFile) return;
    setOcrLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', attachedFile);

      const data = await aiApi.extractLabReport(formData);
      const output = data?.output || data;
      const entries = output?.result_entries || output?.resultEntries || output?.entries || [];

      if (entries.length > 0) {
        setExtractedEntries(entries);
        setIsExtractionOpen(true);
      } else {
        toast.error('No structured diagnostic parameters found in uploaded report.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to extract report data.');
    } finally {
      setOcrLoading(false);
    }
  };

  // Filtered & Paginated Results
  const filteredList = useMemo(() => {
    return groupResults.filter((item) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const mName = (item.parameterName || '').toLowerCase().includes(q);
        const mShort = (item.parameterShortName || '').toLowerCase().includes(q);
        const mCode = (item.parameterCode || '').toLowerCase().includes(q);
        if (!mName && !mShort && !mCode) return false;
      }

      if (parameterFilterDropdown === 'ABNORMAL_ONLY') {
        const norm = normalizeFlagForFilter(item.effectiveFlag, item.status);
        if (!['abnormal', 'critical'].includes(norm)) return false;
      } else if (parameterFilterDropdown === 'PENDING_ONLY') {
        const norm = normalizeFlagForFilter(item.effectiveFlag, item.status);
        if (norm !== 'pending') return false;
      }

      if (flagFilter === 'ALL') return true;
      const norm = normalizeFlagForFilter(item.effectiveFlag, item.status);
      if (flagFilter === 'PENDING') return norm === 'pending';
      if (flagFilter === 'NORMAL') return norm === 'normal';
      if (flagFilter === 'ABNORMAL') return norm === 'abnormal';
      if (flagFilter === 'CRITICAL') return norm === 'critical';

      return true;
    });
  }, [groupResults, searchQuery, flagFilter, parameterFilterDropdown]);

  const totalPages = Math.ceil(filteredList.length / pageSize) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage, pageSize]);

  // Dynamic Statistics
  const overallStats = useMemo(() => {
    let total = 0;
    let completed = 0;
    let normalCount = 0;
    let abnormalCount = 0;
    let criticalCount = 0;
    let pendingCount = 0;

    (resultsData.groups || []).forEach((g) => {
      (g.results || []).forEach((r) => {
        total++;
        const key = r._id || r.resultId;
        const item = resultsState[key] || r;
        const isCompleted = ['entered', 'not_applicable'].includes(item.status) && (item.status === 'not_applicable' || (item.value !== '' && item.value != null));
        if (isCompleted) completed++;

        const norm = normalizeFlagForFilter(item.effectiveFlag, item.status);
        if (norm === 'pending') pendingCount++;
        else if (norm === 'normal') normalCount++;
        else if (norm === 'abnormal') abnormalCount++;
        else if (norm === 'critical') criticalCount++;
      });
    });

    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const isAllComplete = total > 0 && completed === total;

    return { total, completed, pct, isAllComplete, normalCount, abnormalCount, criticalCount, pendingCount };
  }, [resultsData.groups, resultsState]);

  // Workflow Steps Config
  const steps = [
    {
      key: 'ordered',
      stepNum: 1,
      label: 'Ordered',
      date: order?.orderedAt || order?.createdAt ? new Date(order.orderedAt || order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '05 Sep 2026',
      time: order?.orderedAt || order?.createdAt ? new Date(order.orderedAt || order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:20 AM',
      isDone: ['sample_collected', 'processing', 'in_processing', 'results_entry', 'ready_for_review', 'completed'].includes(order?.status),
      isActive: order?.status === 'ordered'
    },
    {
      key: 'sample_collected',
      stepNum: 2,
      label: 'Sample Collected',
      date: order?.sampleCollectedAt ? new Date(order.sampleCollectedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '05 Sep 2026',
      time: order?.sampleCollectedAt ? new Date(order.sampleCollectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '11:11 AM',
      isDone: ['processing', 'in_processing', 'results_entry', 'ready_for_review', 'completed'].includes(order?.status),
      isActive: order?.status === 'sample_collected'
    },
    {
      key: 'processing',
      stepNum: 3,
      label: 'Processing',
      date: order?.processingStartedAt ? new Date(order.processingStartedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '05 Sep 2026',
      time: order?.processingStartedAt ? new Date(order.processingStartedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '11:30 AM',
      isDone: ['results_entry', 'ready_for_review', 'completed'].includes(order?.status),
      isActive: ['processing', 'in_processing', 'in_analysis'].includes(order?.status)
    },
    {
      key: 'results_entry',
      stepNum: 4,
      label: 'Results Entry',
      sublabel: 'In Progress',
      isDone: ['ready_for_review', 'completed'].includes(order?.status),
      isActive: order?.status === 'results_entry'
    },
    {
      key: 'ready_for_review',
      stepNum: 5,
      label: 'Ready for Review',
      sublabel: 'Pending',
      isDone: order?.status === 'completed',
      isActive: order?.status === 'ready_for_review'
    },
    {
      key: 'completed',
      stepNum: 6,
      label: 'Completed',
      sublabel: 'Pending',
      isDone: order?.status === 'completed',
      isActive: false
    }
  ];

  if (loading) {
    return <LoadingState label="Loading laboratory workstation..." />;
  }

  if (error && !order) {
    return <ErrorState title="Diagnostic order unavailable" description={error} />;
  }

  if (order && !['results_entry', 'ready_for_review', 'completed'].includes(order.status)) {
    return (
      <div className="min-h-screen bg-stone-50/70 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-stone-200 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
            🔒
          </div>
          <h2 className="text-xl font-extrabold text-stone-900">Results Entry Locked</h2>
          <p className="text-xs text-stone-600 leading-relaxed">
            Complete laboratory processing before entering test results. Current order status is <strong className="capitalize text-stone-800 font-bold">{order.status?.replaceAll('_', ' ')}</strong>.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => navigate(`/labs/orders/${order._id || id}`)}
              className="w-full py-2.5 px-4 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-2xl text-xs transition shadow-md shadow-violet-200 cursor-pointer"
            >
              ← Back to Order Details
            </button>
          </div>
        </div>
      </div>
    );
  }

  const patientNameDisplay = order?.patientId?.fullName || order?.guestPatient?.fullName || 'Vidya';
  const patientAgeDisplay = order?.patientId?.age ?? order?.guestPatient?.age ?? 29;
  const patientGenderDisplay = order?.patientId?.gender || order?.guestPatient?.gender || 'Female';
  const patientUhidDisplay = order?.patientId?.patientId || order?.patientId?.uhid || 'PAT-20260716-0001';
  const sampleIdDisplay = order?.sampleId || 'SMP-20260905-0010';
  const sampleTypeDisplay = order?.sampleType || order?.tests?.[0]?.specimenType || 'Whole Blood (EDTA)';
  const collectionDateDisplay = order?.sampleCollectedAt ? new Date(order.sampleCollectedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '05 Sep 2026, 11:11 AM';
  const orderDateDisplay = order?.orderedAt || order?.createdAt ? new Date(order.orderedAt || order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '05 Sep 2026';
  const paymentStatusDisplay = order?.paymentStatus || 'PAID';
  const priorityDisplay = order?.priority ? order.priority.charAt(0).toUpperCase() + order.priority.slice(1) : 'Routine';

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20 font-sans antialiased text-stone-800" id="lab-results-entry-page">
      
      {/* ========================================================= */}
      {/* 1. TOP HEADER                                             */}
      {/* ========================================================= */}
      <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-50 border border-purple-200 text-purple-700 text-xl font-bold shadow-2xs">
              🧪
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-stone-900 tracking-tight">Results Entry</h1>
              <p className="text-xs text-stone-500 mt-0.5">
                Enter laboratory results, validate values, and submit for review.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleBackToOrder}
              className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-1.5 text-xs font-bold text-stone-700 shadow-2xs hover:bg-stone-50 transition cursor-pointer"
              id="back-to-order-btn"
            >
              ← Back to Order
            </button>

            <span className="rounded-xl border border-blue-200 bg-blue-50/80 px-3 py-1.5 font-mono text-xs font-bold text-blue-700 shadow-2xs">
              {order?.orderNumber || 'LAB-20260905-0005'}
            </span>

            <span className="rounded-xl border border-purple-200 bg-purple-100/80 px-3 py-1.5 text-xs font-bold text-purple-800 shadow-2xs">
              {order?.status === 'ready_for_review' ? 'Ready for Review' : order?.status === 'completed' ? 'Completed' : 'Results Entry'}
            </span>
          </div>
        </div>
      </div>

      <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        
        {/* ========================================================= */}
        {/* 2. FULL-WIDTH WORKFLOW PROGRESS TRACKER (Callout 1)       */}
        {/* ========================================================= */}
        <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-2xs">
          <div className="relative flex items-center justify-between">
            
            {/* Connecting line */}
            <div className="absolute left-8 right-8 top-4 -translate-y-1/2 h-0.5 bg-stone-200 z-0">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{
                  width: order?.status === 'completed' ? '100%' : order?.status === 'ready_for_review' ? '80%' : '60%'
                }}
              />
            </div>

            {/* Stepper nodes */}
            {steps.map((step) => {
              const isCurrentStep = step.key === (order?.status === 'ready_for_review' ? 'ready_for_review' : order?.status === 'completed' ? 'completed' : 'results_entry');
              
              return (
                <div key={step.key} className="relative z-10 flex flex-col items-center text-center">
                  <div
                    className={`flex items-center justify-center rounded-full font-bold transition-all shadow-xs ${
                      isCurrentStep
                        ? 'h-9 w-9 bg-purple-700 text-white ring-4 ring-purple-100 text-sm font-extrabold'
                        : step.isDone
                        ? 'h-8 w-8 bg-emerald-600 text-white text-xs'
                        : 'h-8 w-8 border-2 border-stone-200 bg-white text-stone-400 text-xs'
                    }`}
                  >
                    {step.isDone ? '✓' : step.stepNum}
                  </div>

                  <div className="mt-2">
                    <div className={`text-xs font-bold ${isCurrentStep ? 'text-purple-900 font-extrabold' : step.isDone ? 'text-stone-800' : 'text-stone-400'}`}>
                      {step.label}
                    </div>

                    {step.date && step.time ? (
                      <div className="text-[10px] text-stone-400 mt-0.5">
                        {step.date}<br />{step.time}
                      </div>
                    ) : (
                      <div className={`text-[10px] font-semibold mt-0.5 ${isCurrentStep ? 'text-purple-600' : 'text-stone-400'}`}>
                        {step.sublabel || 'Pending'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3. PATIENT + SAMPLE SUMMARY COMPACT CARD                  */}
        {/* ========================================================= */}
        <div className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            
            {/* Patient profile */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-50 text-purple-700 text-lg font-bold border border-purple-100 shadow-2xs">
                👤
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-stone-900">{patientNameDisplay}</h3>
                <p className="text-xs text-stone-500">
                  Age: {patientAgeDisplay} yrs | {patientGenderDisplay} | UHID: <span className="font-mono font-semibold text-stone-700">{patientUhidDisplay}</span>
                </p>
              </div>
            </div>

            {/* Key Metadata Fields */}
            <div className="flex flex-wrap items-center gap-6 text-xs">
              <div>
                <span className="text-[10px] text-stone-400 block font-medium">Sample ID</span>
                <span className="font-mono font-bold text-stone-900">{sampleIdDisplay}</span>
              </div>

              <div>
                <span className="text-[10px] text-stone-400 block font-medium">Sample Type</span>
                <span className="font-bold text-stone-900">{sampleTypeDisplay}</span>
              </div>

              <div>
                <span className="text-[10px] text-stone-400 block font-medium">Collection Date</span>
                <span className="font-semibold text-stone-800">{collectionDateDisplay}</span>
              </div>

              <div>
                <span className="text-[10px] text-stone-400 block font-medium">Order Date</span>
                <span className="font-semibold text-stone-800">{orderDateDisplay}</span>
              </div>

              <div>
                <span className="text-[10px] text-stone-400 block font-medium">Payment Status</span>
                <span className="inline-flex items-center font-bold px-2 py-0.5 rounded-lg text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200">
                  ✓ {paymentStatusDisplay}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-stone-400 block font-medium">Priority</span>
                <span className="font-bold text-stone-900">{priorityDisplay}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4. NAVIGATION TABS                                        */}
        {/* ========================================================= */}
        <div className="flex items-center gap-6 border-b border-stone-200/80 px-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => setMainTab('investigations')}
            className={`flex items-center gap-1.5 pb-2.5 transition cursor-pointer ${
              mainTab === 'investigations'
                ? 'border-b-2 border-purple-700 text-purple-700 font-extrabold'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <span>🧪</span>
            <span>Investigations ({resultsData.groups?.length || 1})</span>
          </button>

          <button
            type="button"
            onClick={() => setMainTab('patient')}
            className={`flex items-center gap-1.5 pb-2.5 transition cursor-pointer ${
              mainTab === 'patient'
                ? 'border-b-2 border-purple-700 text-purple-700 font-extrabold'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <span>👤</span>
            <span>Patient Information</span>
          </button>

          <button
            type="button"
            onClick={() => setMainTab('sample')}
            className={`flex items-center gap-1.5 pb-2.5 transition cursor-pointer ${
              mainTab === 'sample'
                ? 'border-b-2 border-purple-700 text-purple-700 font-extrabold'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <span>📋</span>
            <span>Sample Information</span>
          </button>

          <button
            type="button"
            onClick={() => setMainTab('activity')}
            className={`flex items-center gap-1.5 pb-2.5 transition cursor-pointer ${
              mainTab === 'activity'
                ? 'border-b-2 border-purple-700 text-purple-700 font-extrabold'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <span>⏱️</span>
            <span>Activity Log</span>
          </button>
        </div>

        {/* TAB CONTENT: Patient / Sample / Activity Fallback views */}
        {mainTab === 'patient' && (
          <div className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-2xs space-y-4 text-xs">
            <h3 className="text-sm font-bold text-stone-900">Patient Demographic Profile</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div><span className="text-stone-400 text-[10px] block">Full Name</span><span className="font-bold text-stone-900">{patientNameDisplay}</span></div>
              <div><span className="text-stone-400 text-[10px] block">UHID</span><span className="font-mono font-bold text-stone-900">{patientUhidDisplay}</span></div>
              <div><span className="text-stone-400 text-[10px] block">Age & Gender</span><span className="font-bold text-stone-900">{patientAgeDisplay} yrs, {patientGenderDisplay}</span></div>
              <div><span className="text-stone-400 text-[10px] block">Phone</span><span className="font-bold text-stone-900">{order?.patientId?.phone || order?.guestPatient?.phone || '+91 98765 43210'}</span></div>
              <div><span className="text-stone-400 text-[10px] block">Referring Doctor</span><span className="font-bold text-stone-900">{order?.doctorId?.fullName || 'Self / Direct'}</span></div>
              <div><span className="text-stone-400 text-[10px] block">Address</span><span className="font-bold text-stone-900">{order?.patientId?.address || 'Indirapuram, Ghaziabad'}</span></div>
            </div>
          </div>
        )}

        {mainTab === 'sample' && (
          <div className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-2xs space-y-4 text-xs">
            <h3 className="text-sm font-bold text-stone-900">Specimen & Sample Information</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div><span className="text-stone-400 text-[10px] block">Sample ID</span><span className="font-mono font-bold text-stone-900">{sampleIdDisplay}</span></div>
              <div><span className="text-stone-400 text-[10px] block">Specimen Type</span><span className="font-bold text-stone-900">{sampleTypeDisplay}</span></div>
              <div><span className="text-stone-400 text-[10px] block">Collection Date/Time</span><span className="font-semibold text-stone-800">{collectionDateDisplay}</span></div>
              <div><span className="text-stone-400 text-[10px] block">Collected By</span><span className="font-semibold text-stone-800">{order?.sampleCollectedByName || 'Rajesh Sharma'}</span></div>
              <div><span className="text-stone-400 text-[10px] block">Container</span><span className="font-bold text-stone-900">EDTA Tube (Lavender)</span></div>
              <div><span className="text-stone-400 text-[10px] block">Status</span><span className="font-bold text-emerald-700">Collected & Verified</span></div>
            </div>
          </div>
        )}

        {mainTab === 'activity' && (
          <div className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-2xs space-y-4 text-xs">
            <h3 className="text-sm font-bold text-stone-900">Activity & Audit Timeline</h3>
            <div className="space-y-3 border-l-2 border-purple-200 pl-3.5">
              <div className="relative">
                <div className="font-bold text-stone-900">Order Placed & Registered</div>
                <div className="text-stone-500 text-[11px]">{orderDateDisplay} • Front Desk Staff</div>
              </div>
              {order?.sampleCollectedAt && (
                <div className="relative">
                  <div className="font-bold text-stone-900">Sample Collected</div>
                  <div className="text-stone-500 text-[11px]">{new Date(order.sampleCollectedAt).toLocaleString('en-GB')} • Phlebotomist</div>
                </div>
              )}
              {lastSavedTime && (
                <div className="relative">
                  <div className="font-bold text-stone-900">Results Draft Saved</div>
                  <div className="text-stone-500 text-[11px]">{lastSavedTime.toLocaleTimeString()} • {user?.fullName || 'Technician'}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 5. MAIN RESULTS WORKSPACE GRID (Left 70%, Right 30%)      */}
        {/* ========================================================= */}
        {mainTab === 'investigations' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            
            {/* LEFT COLUMN: Investigation Header, Filters, Results Table (8.5 cols) */}
            <div className="lg:col-span-8 xl:col-span-8.5 space-y-4">
              
              {/* Investigation Card Container */}
              <div className="rounded-2xl border border-stone-200/90 bg-white shadow-2xs overflow-hidden">
                
                {/* 5A. Investigation Header */}
                <div className="p-4 border-b border-stone-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-700 text-lg font-bold border border-purple-100 shadow-2xs">
                      🧪
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-extrabold text-stone-900">
                          {currentGroup.testName || 'Complete Blood Count (CBC)'}
                        </h2>
                        <span className="rounded bg-stone-100 px-1.5 py-0.2 text-[9px] font-bold text-stone-600 uppercase">
                          TEST
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        {groupResults.length} parameter{groupResults.length === 1 ? '' : 's'} • Specimen: {order?.tests?.[0]?.specimenType || 'EDTA (3ml)'}
                      </p>
                    </div>
                  </div>

                  <span className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 shadow-2xs">
                    {order?.status === 'ready_for_review' ? 'Ready for Review' : 'In Progress'}
                  </span>
                </div>

                {/* 5B. Results Summary Filter Bar with Counters and Progress (Callout 2) */}
                <div className="p-3.5 bg-[#f8fafc] border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  
                  {/* Left Dynamic Filter Pills */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => { setFlagFilter('ALL'); setCurrentPage(1); }}
                      className={`rounded-xl px-3 py-1 text-xs font-bold transition cursor-pointer ${
                        flagFilter === 'ALL'
                          ? 'bg-purple-700 text-white shadow-xs'
                          : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      All {overallStats.total}
                    </button>

                    <button
                      type="button"
                      onClick={() => { setFlagFilter('PENDING'); setCurrentPage(1); }}
                      className={`rounded-xl px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                        flagFilter === 'PENDING'
                          ? 'bg-stone-800 text-white shadow-xs'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      Pending {overallStats.pendingCount}
                    </button>

                    <button
                      type="button"
                      onClick={() => { setFlagFilter('NORMAL'); setCurrentPage(1); }}
                      className={`rounded-xl px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                        flagFilter === 'NORMAL'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      Normal {overallStats.normalCount}
                    </button>

                    <button
                      type="button"
                      onClick={() => { setFlagFilter('ABNORMAL'); setCurrentPage(1); }}
                      className={`rounded-xl px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                        flagFilter === 'ABNORMAL'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                      }`}
                    >
                      Abnormal {overallStats.abnormalCount}
                    </button>

                    <button
                      type="button"
                      onClick={() => { setFlagFilter('CRITICAL'); setCurrentPage(1); }}
                      className={`rounded-xl px-3 py-1 text-xs font-bold transition cursor-pointer ${
                        flagFilter === 'CRITICAL'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                      }`}
                    >
                      Critical {overallStats.criticalCount}
                    </button>
                  </div>

                  {/* Right Progress bar */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-stone-700 whitespace-nowrap">
                      {overallStats.completed} / {overallStats.total} Completed
                    </span>
                    <div className="h-2 w-32 overflow-hidden rounded-full bg-stone-200/80 border border-stone-200">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${overallStats.pct === 100 ? 'bg-emerald-500' : 'bg-purple-600'}`}
                        style={{ width: `${overallStats.pct}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs font-bold text-purple-700">
                      {overallStats.pct}%
                    </span>
                  </div>
                </div>

                {/* 5C. Search Bar & Dropdown Filter */}
                <div className="p-3 bg-white border-b border-stone-100 flex items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <svg className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search parameters..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full rounded-xl border border-stone-200 bg-stone-50/70 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-purple-600 focus:bg-white focus:ring-2 focus:ring-purple-100 transition"
                    />
                  </div>

                  <select
                    value={parameterFilterDropdown}
                    onChange={(e) => {
                      setParameterFilterDropdown(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 outline-none"
                  >
                    <option value="ALL">All Parameters</option>
                    <option value="ABNORMAL_ONLY">Abnormal & Critical Only</option>
                    <option value="PENDING_ONLY">Pending Only</option>
                  </select>
                </div>

                {/* 5D. Main Results Table (Callouts 3 & 4) */}
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse text-xs table-fixed">
                    <thead>
                      <tr className="border-b border-stone-200 bg-[#f8fafc] text-stone-600 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-3 w-[4%] min-w-[32px] text-center">#</th>
                        <th className="py-3 px-3 w-[22%] min-w-[150px]">Parameter</th>
                        <th className="py-3 px-3 w-[15%] min-w-[110px]">Result</th>
                        <th className="py-3 px-3 w-[10%] min-w-[70px]">Unit</th>
                        <th className="py-3 px-3 w-[16%] min-w-[110px]">Reference Range</th>
                        <th className="py-3 px-3 w-[15%] min-w-[110px]">Flag</th>
                        <th className="py-3 px-3 w-[14%] min-w-[100px]">Comment</th>
                        <th className="py-3 px-3 w-[4%] min-w-[32px] text-center">Action</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-stone-100 font-normal">
                      {paginatedList.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="py-10 text-center text-stone-400">
                            No matching parameters found for the active filter.
                          </td>
                        </tr>
                      ) : (
                        paginatedList.map((r, idx) => {
                          const key = r._id || r.resultId;
                          const itemState = resultsState[key] || r;
                          const isNA = itemState.status === 'not_applicable';
                          const flag = itemState.effectiveFlag || 'not_evaluated';
                          const isInputDisabled = isLocked;
                          const rowNumber = (currentPage - 1) * pageSize + idx + 1;

                          const refRangeText = r.referenceRange?.text ||
                            (r.referenceRange?.min != null && r.referenceRange?.max != null
                              ? `${r.referenceRange.min} - ${r.referenceRange.max}`
                              : '—');

                          return (
                            <tr
                              key={key}
                              className={`transition ${
                                flag === 'critical_low' || flag === 'critical_high' || flag === 'critical'
                                  ? 'bg-rose-50/40'
                                  : flag === 'low' || flag === 'high' || flag === 'abnormal'
                                  ? 'bg-amber-50/30'
                                  : isNA
                                  ? 'bg-stone-50 opacity-60'
                                  : 'hover:bg-stone-50/80'
                              }`}
                            >
                              {/* Row # */}
                              <td className="py-3 px-3 text-center align-middle font-mono text-stone-400 text-[11px]">
                                {rowNumber}
                              </td>

                              {/* Parameter Name */}
                              <td className="py-3 px-3 align-middle">
                                <div className="font-bold text-stone-900 leading-tight">
                                  {r.parameterName}
                                  {r.isRequired !== false ? <span className="ml-1 text-rose-500 font-bold" title="Required parameter">*</span> : null}
                                </div>
                                {r.parameterShortName && r.parameterShortName !== r.parameterName && (
                                  <div className="text-[10px] text-stone-400 mt-0.5">{r.parameterShortName}</div>
                                )}
                              </td>

                              {/* Result Input Field (Callout 3) */}
                              <td className="py-3 px-3 align-middle relative z-10">
                                {isNA ? (
                                  <span className="italic text-stone-400 text-xs">Not Applicable</span>
                                ) : r.resultType === 'ENUM' || r.resultType === 'QUALITATIVE' ? (
                                  <select
                                    value={itemState.value || ''}
                                    onChange={(e) => handleValueChange(key, e.target.value)}
                                    disabled={isInputDisabled}
                                    className="w-full rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-bold text-stone-900 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100 shadow-2xs cursor-pointer"
                                  >
                                    <option value="">Select value...</option>
                                    {(r.allowedValues || []).map((av) => (
                                      <option key={av.value} value={av.value}>
                                        {av.displayName || av.value}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    inputMode={r.resultType === 'NUMERIC' ? 'decimal' : 'text'}
                                    value={itemState.value ?? ''}
                                    onChange={(e) => handleValueChange(key, e.target.value)}
                                    disabled={isInputDisabled}
                                    readOnly={isInputDisabled}
                                    placeholder={r.resultType === 'NUMERIC' ? '' : 'Enter value...'}
                                    className={`w-full rounded-xl border px-3 py-1.5 text-xs font-bold outline-none transition focus:ring-2 shadow-2xs pointer-events-auto ${
                                      flag === 'critical_low' || flag === 'critical_high' || flag === 'critical'
                                        ? 'border-rose-300 bg-rose-50/60 text-rose-900 focus:border-rose-500 focus:ring-rose-100'
                                        : flag === 'low' || flag === 'high' || flag === 'abnormal'
                                        ? 'border-amber-300 bg-amber-50/60 text-amber-900 focus:border-amber-500 focus:ring-amber-100'
                                        : 'border-stone-300 bg-white text-stone-900 focus:border-purple-600 focus:ring-purple-100'
                                    }`}
                                    style={{ cursor: isInputDisabled ? 'default' : 'text' }}
                                  />
                                )}
                              </td>

                              {/* Unit */}
                              <td className="py-3 px-3 align-middle text-stone-600 font-mono text-[11px]">
                                {r.unit || '—'}
                              </td>

                              {/* Reference Range */}
                              <td className="py-3 px-3 align-middle text-stone-600 text-[11px]">
                                {refRangeText}
                              </td>

                              {/* Flag (Callout 4) */}
                              <td className="py-3 px-3 align-middle relative z-20">
                                <FlagDropdown
                                  flag={itemState.effectiveFlag}
                                  isManual={Boolean(itemState.isFlagManuallyOverridden)}
                                  status={itemState.status}
                                  disabled={isInputDisabled}
                                  isOpen={openFlagDropdownId === key}
                                  onToggleOpen={() => setOpenFlagDropdownId(openFlagDropdownId === key ? null : key)}
                                  onSelectFlag={(newFlag) => {
                                    handleFlagSelect(key, newFlag, true);
                                    setOpenFlagDropdownId(null);
                                  }}
                                  onResetAuto={() => {
                                    handleFlagSelect(key, 'auto', false);
                                    setOpenFlagDropdownId(null);
                                  }}
                                />
                              </td>

                              {/* Comment */}
                              <td className="py-3 px-3 align-middle relative z-10">
                                <input
                                  type="text"
                                  value={itemState.comment || ''}
                                  placeholder="Add comment..."
                                  onChange={(e) => handleCommentChange(key, e.target.value)}
                                  disabled={isInputDisabled}
                                  readOnly={isInputDisabled}
                                  className="w-full rounded-xl border border-stone-200 bg-stone-50/60 px-2.5 py-1.5 text-xs text-stone-700 outline-none focus:border-purple-500 focus:bg-white shadow-2xs pointer-events-auto"
                                  style={{ cursor: isInputDisabled ? 'default' : 'text' }}
                                />
                              </td>

                              {/* Action Menu */}
                              <td className="py-3 px-3 align-middle text-center relative">
                                <RowActionsDropdown
                                  isOpen={activeMenuRowId === key}
                                  onToggle={() => setActiveMenuRowId(activeMenuRowId === key ? null : key)}
                                  onClose={() => setActiveMenuRowId(null)}
                                  onFlagAbnormal={() => handleFlagSelect(key, 'abnormal', true)}
                                  onFlagCritical={() => handleFlagSelect(key, 'critical', true)}
                                  onResetAuto={() => handleFlagSelect(key, 'auto', false)}
                                  onToggleNA={() => {
                                    setResultsState((prev) => {
                                      const next = {
                                        ...prev,
                                        [key]: {
                                          ...prev[key],
                                          status: isNA ? 'pending' : 'not_applicable',
                                          value: isNA ? '' : 'N/A'
                                        }
                                      };
                                      resultsStateRef.current = next;
                                      return next;
                                    });
                                    setHasUnsavedChanges(true);
                                  }}
                                  isNA={isNA}
                                  disabled={isInputDisabled}
                                />
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination if multiple pages */}
                {totalPages > 1 && (
                  <div className="p-3 border-t border-stone-100 bg-[#f8fafc] flex items-center justify-between text-xs text-stone-500">
                    <span>Showing {paginatedList.length} of {filteredList.length} parameters</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((p) => p - 1)}
                        className="rounded-lg border border-stone-200 bg-white px-2 py-1 disabled:opacity-40"
                      >
                        ‹
                      </button>
                      <span className="font-bold">{currentPage} / {totalPages}</span>
                      <button
                        type="button"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((p) => p + 1)}
                        className="rounded-lg border border-stone-200 bg-white px-2 py-1 disabled:opacity-40"
                      >
                        ›
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 5E. Overall Laboratory Comment (Callout 8) */}
              <div className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-2xs space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">💬</span>
                  <label className="text-xs font-extrabold text-stone-900">Overall Laboratory Comment</label>
                </div>
                <textarea
                  rows={2}
                  value={overallComment}
                  onChange={(e) => handleOverallCommentChange(e.target.value)}
                  disabled={isLocked}
                  placeholder="Add an overall comment for this report (optional)..."
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/50 p-2.5 text-xs text-stone-800 outline-none focus:border-purple-600 focus:bg-white focus:ring-2 focus:ring-purple-100 shadow-2xs transition"
                  style={{ cursor: isLocked ? 'default' : 'text' }}
                />
              </div>

              {/* 5F. Missing Required Parameters Warning Banner (Callout 9) */}
              {missingRequiredList.length > 0 && !isLocked && (
                <div className="rounded-2xl border border-rose-300 bg-rose-50/90 p-3.5 flex items-center gap-3 shadow-2xs animate-in fade-in">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white font-bold text-xs shrink-0">
                    !
                  </div>
                  <div className="text-xs text-rose-900 font-semibold">
                    <span>
                      {missingRequiredList.length} required parameter{missingRequiredList.length === 1 ? ' is' : 's are'} missing:{' '}
                    </span>
                    <strong className="font-bold underline">
                      {missingRequiredList.map(m => m.parameterName).join(', ')}
                    </strong>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Investigation Info, Auto Fill, Summary, Quick Actions (3.5 cols) */}
            <div className="lg:col-span-4 xl:col-span-3.5 space-y-4">
              
              {/* CARD 1: Investigation Information */}
              <article className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-2xs space-y-3 text-xs">
                <div className="flex items-center gap-2 text-stone-900 font-extrabold text-xs">
                  <span>🧪</span>
                  <span>Investigation Information</span>
                </div>

                <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-xs pt-1">
                  <div>
                    <span className="text-stone-400 text-[10px] block">Test Name</span>
                    <div className="font-bold text-stone-900 mt-0.5">{currentGroup.testName || 'Complete Blood Count (CBC)'}</div>
                  </div>

                  <div>
                    <span className="text-stone-400 text-[10px] block">Parameters</span>
                    <div className="font-bold text-stone-900 mt-0.5">{groupResults.length}</div>
                  </div>

                  <div>
                    <span className="text-stone-400 text-[10px] block">Specimen Type</span>
                    <div className="font-bold text-stone-900 mt-0.5">{order?.tests?.[0]?.specimenType || 'Whole Blood'}</div>
                  </div>

                  <div>
                    <span className="text-stone-400 text-[10px] block">Container</span>
                    <div className="font-bold text-stone-900 mt-0.5">EDTA Tube (Lavender)</div>
                  </div>

                  <div>
                    <span className="text-stone-400 text-[10px] block">Required Volume</span>
                    <div className="font-bold text-stone-900 mt-0.5">3 mL</div>
                  </div>

                  <div>
                    <span className="text-stone-400 text-[10px] block">Collection Method</span>
                    <div className="font-bold text-stone-900 mt-0.5">Venous Blood</div>
                  </div>
                </div>
              </article>

              {/* CARD 2: Auto Fill from Report (Callout 5) */}
              {!isLocked && (
                <article className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-2xs space-y-2.5">
                  <div className="flex items-center gap-2 text-stone-900 font-extrabold text-xs">
                    <span>✨</span>
                    <span>Auto Fill from Report</span>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-stone-800">Upload & Extract Report</div>
                    <p className="text-[11px] text-stone-500">Upload a PDF, JPG or PNG to extract laboratory results.</p>
                  </div>

                  <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 bg-stone-50/70 p-4 text-center cursor-pointer transition hover:bg-purple-50/40 hover:border-purple-300">
                    <svg className="h-6 w-6 text-stone-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-xs font-bold text-stone-800">
                      Click to upload <span className="font-normal text-stone-500">or drag and drop</span>
                    </span>
                    <span className="text-[10px] text-stone-400 mt-0.5">PDF, JPG, PNG (Max 10 MB)</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileUpload}
                      disabled={ocrLoading}
                      className="hidden"
                    />
                  </label>

                  {attachedFile && (
                    <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 p-2 text-xs">
                      <span className="font-semibold text-stone-800 truncate max-w-[160px]">{attachedFile.name}</span>
                      <button
                        type="button"
                        onClick={handleExtractResults}
                        disabled={ocrLoading}
                        className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-[11px] shadow-2xs cursor-pointer"
                      >
                        {ocrLoading ? 'Extracting...' : 'Extract'}
                      </button>
                    </div>
                  )}
                </article>
              )}

              {/* CARD 3: Results Summary (Callout 6) */}
              <article className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-2xs space-y-2.5 text-xs">
                <div className="flex items-center gap-2 text-stone-900 font-extrabold text-xs">
                  <span>📊</span>
                  <span>Results Summary</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-stone-50 border border-stone-100">
                    <span className="text-[10px] text-stone-400 block">Total Parameters</span>
                    <span className="text-sm font-extrabold text-stone-900">{overallStats.total}</span>
                  </div>

                  <div className="p-2 rounded-xl bg-stone-50 border border-stone-100">
                    <span className="text-[10px] text-stone-400 block">Completed</span>
                    <span className="text-sm font-extrabold text-stone-900">{overallStats.completed}</span>
                  </div>

                  <div className="p-2 rounded-xl bg-stone-50 border border-stone-100">
                    <span className="text-[10px] text-stone-400 block">Pending</span>
                    <span className="text-sm font-extrabold text-stone-900">{overallStats.pendingCount}</span>
                  </div>

                  <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100">
                    <span className="text-[10px] text-emerald-600 block">Normal</span>
                    <span className="text-sm font-extrabold text-emerald-700">{overallStats.normalCount}</span>
                  </div>

                  <div className="p-2 rounded-xl bg-amber-50 border border-amber-100">
                    <span className="text-[10px] text-amber-600 block">Abnormal</span>
                    <span className="text-sm font-extrabold text-amber-700">{overallStats.abnormalCount}</span>
                  </div>

                  <div className="p-2 rounded-xl bg-rose-50 border border-rose-100">
                    <span className="text-[10px] text-rose-600 block">Critical</span>
                    <span className="text-sm font-extrabold text-rose-700">{overallStats.criticalCount}</span>
                  </div>
                </div>
              </article>

              {/* CARD 4: Quick Actions (Callout 7) */}
              <article className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 text-stone-900 font-extrabold text-xs">
                  <span>⚡</span>
                  <span>Quick Actions</span>
                </div>

                {!isLocked && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleSave(true)}
                        disabled={isSaving || groupResults.length === 0}
                        className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-40 shadow-2xs transition cursor-pointer"
                        id="panel-save-draft-btn"
                      >
                        <span>💾</span>
                        <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleInitiateReadyForReview}
                        disabled={isSaving || missingRequiredList.length > 0 || groupResults.length === 0}
                        className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:bg-stone-300 text-white px-3 py-2 text-xs font-bold shadow-md shadow-purple-200 disabled:shadow-none transition cursor-pointer"
                        id="panel-mark-ready-btn"
                      >
                        <span>✓</span>
                        <span>Mark Ready for Review</span>
                      </button>
                    </div>

                    {/* Validation helper text */}
                    {missingRequiredList.length > 0 ? (
                      <div className="flex items-start gap-1.5 text-[11px] text-rose-600 font-medium pt-1">
                        <span className="text-xs">!</span>
                        <span>All required parameters must be completed before marking ready for review.</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-bold pt-1">
                        <span>✓</span>
                        <span>All required parameters completed.</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Reviewer Actions (when in ready_for_review) */}
                {isOrderInReview && isReviewer && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setIsApproveResultsModalOpen(true)}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-xs font-bold shadow-md shadow-emerald-200 transition cursor-pointer"
                    >
                      <span>✓</span>
                      <span>Approve Results & Publish</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsReturnCorrectionModalOpen(true)}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 px-4 py-2 text-xs font-bold transition cursor-pointer"
                    >
                      <span>↩</span>
                      <span>Return for Correction</span>
                    </button>
                  </div>
                )}

                {/* Completed Report Link */}
                {isOrderCompleted && (
                  <Link
                    to={`/labs/orders/${order?._id || id}/reports`}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-xs font-bold shadow-md shadow-emerald-200 transition cursor-pointer"
                  >
                    <span>📄</span>
                    <span>View & Download Report</span>
                  </Link>
                )}
              </article>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 6. FIXED STICKY ACTION BAR AT BOTTOM                      */}
      {/* ========================================================= */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-stone-200 bg-white/95 backdrop-blur-md px-6 py-3 shadow-lg">
        <div className="w-full max-w-[1920px] mx-auto flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleBackToOrder}
            className="flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 transition cursor-pointer"
          >
            ← Back to Order
          </button>

          <div className="flex items-center gap-3">
            {!isLocked && (
              <>
                <button
                  type="button"
                  onClick={() => handleSave(true)}
                  disabled={isSaving || groupResults.length === 0}
                  className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-40 transition shadow-2xs cursor-pointer"
                >
                  {isSaving ? 'Saving...' : 'Save Draft'}
                </button>

                <button
                  type="button"
                  onClick={handleInitiateReadyForReview}
                  disabled={isSaving || missingRequiredList.length > 0 || groupResults.length === 0}
                  className="flex items-center gap-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:bg-stone-300 text-white px-5 py-2 text-xs font-bold shadow-md shadow-purple-200 disabled:shadow-none transition cursor-pointer"
                >
                  <span>✓</span>
                  <span>Mark Ready for Review</span>
                </button>
              </>
            )}

            {isOrderInReview && isReviewer && (
              <>
                <button
                  type="button"
                  onClick={() => setIsReturnCorrectionModalOpen(true)}
                  className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-xs font-bold text-amber-900 hover:bg-amber-50 cursor-pointer"
                >
                  ↩ Return for Correction
                </button>

                <button
                  type="button"
                  onClick={() => setIsApproveResultsModalOpen(true)}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 text-xs font-bold shadow-md shadow-emerald-200 cursor-pointer"
                >
                  ✓ Approve Results
                </button>
              </>
            )}

            {isOrderCompleted && (
              <Link
                to={`/labs/orders/${order?._id || id}/reports`}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 text-xs font-bold shadow-md shadow-emerald-200"
              >
                📄 View Report
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: SUBMIT FOR REVIEW CONFIRMATION                   */}
      {/* ========================================================= */}
      {isSubmitReviewModalOpen && (
        <div className="fixed top-16 right-0 bottom-0 left-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-hidden animate-in fade-in">
          <div className="w-full max-w-md max-h-[calc(100vh-5.5rem)] flex flex-col rounded-3xl bg-white p-6 shadow-2xl border border-stone-200 space-y-4 overflow-y-auto">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 text-lg font-bold">
                📋
              </div>
              <div>
                <h3 className="text-base font-extrabold text-stone-900">Submit Results for Review?</h3>
                <p className="text-xs text-stone-500">Order: {order?.orderNumber}</p>
              </div>
            </div>

            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-stone-400 font-medium">Patient:</span>
                <span className="font-bold text-stone-900">{patientNameDisplay}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400 font-medium">Completed Parameters:</span>
                <span className="font-bold text-emerald-700">{overallStats.completed} / {overallStats.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400 font-medium">Normal / Abnormal / Critical:</span>
                <span className="font-bold text-stone-800">{overallStats.normalCount} Normal • {overallStats.abnormalCount} Abnormal • {overallStats.criticalCount} Critical</span>
              </div>
            </div>

            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 font-medium">
              Once submitted, result values will be locked for technician editing until the reviewer returns the order for correction.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsSubmitReviewModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingWorkflow}
                onClick={handleConfirmSubmitForReview}
                className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-200 cursor-pointer"
              >
                {isSubmittingWorkflow ? 'Submitting...' : 'Submit for Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: RETURN FOR CORRECTION (Reviewer)                 */}
      {/* ========================================================= */}
      {isReturnCorrectionModalOpen && (
        <div className="fixed top-16 right-0 bottom-0 left-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-hidden animate-in fade-in">
          <div className="w-full max-w-md max-h-[calc(100vh-5.5rem)] flex flex-col rounded-3xl bg-white p-6 shadow-2xl border border-amber-200 space-y-4 overflow-y-auto">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 text-lg font-bold">
                ↩
              </div>
              <div>
                <h3 className="text-base font-extrabold text-stone-900">Return Results for Correction?</h3>
                <p className="text-xs text-stone-500">Unlocks result entry for technician revision</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-stone-700">
                Correction Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Please explain what needs to be corrected..."
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                className="w-full rounded-2xl border border-stone-200 p-3 text-xs outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsReturnCorrectionModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingWorkflow || correctionReason.trim().length < 5}
                onClick={handleConfirmReturnForCorrection}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-200 disabled:bg-stone-300 cursor-pointer"
              >
                {isSubmittingWorkflow ? 'Returning...' : 'Return for Correction'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: APPROVE RESULTS (Reviewer)                       */}
      {/* ========================================================= */}
      {isApproveResultsModalOpen && (
        <div className="fixed top-16 right-0 bottom-0 left-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-hidden animate-in fade-in">
          <div className="w-full max-w-md max-h-[calc(100vh-5.5rem)] flex flex-col rounded-3xl bg-white p-6 shadow-2xl border border-emerald-200 space-y-4 overflow-y-auto">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 text-lg font-bold">
                ✓
              </div>
              <div>
                <h3 className="text-base font-extrabold text-stone-900">Approve Laboratory Results?</h3>
                <p className="text-xs text-stone-500">Order: {order?.orderNumber}</p>
              </div>
            </div>

            <div className="bg-emerald-50/80 rounded-2xl border border-emerald-200 p-3.5 space-y-1.5 text-xs text-emerald-950 font-medium">
              <div className="flex justify-between">
                <span>Patient:</span>
                <span className="font-bold">{patientNameDisplay}</span>
              </div>
              <div className="flex justify-between">
                <span>All Required Parameters:</span>
                <span className="font-bold text-emerald-800">Completed ({overallStats.completed} / {overallStats.total})</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-stone-700">
                Reviewer Remarks (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Findings correlate with clinical diagnosis. Verified."
                value={reviewerNotes}
                onChange={(e) => setReviewerNotes(e.target.value)}
                className="w-full rounded-2xl border border-stone-200 p-2.5 text-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsApproveResultsModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingWorkflow}
                onClick={handleConfirmApproveResults}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-200 cursor-pointer"
              >
                {isSubmittingWorkflow ? 'Approving...' : 'Confirm Approval & Publish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extraction Review Drawer */}
      <LabExtractionReviewDrawer
        isOpen={isExtractionOpen}
        onClose={() => setIsExtractionOpen(false)}
        orderId={order?._id}
        allGroups={resultsData.groups || []}
        extractedData={extractedEntries}
        onApplied={() => {
          loadOrderAndResults();
        }}
      />
    </div>
  );
};

export default LabEnterResultsPage;
