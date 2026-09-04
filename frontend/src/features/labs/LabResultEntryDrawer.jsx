import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Badge from '../../components/common/Badge';
import { saveResultsBatch } from './labApi';

/**
 * Flag color mapper
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
      return 'Low ↓';
    case 'high':
      return 'High ↑';
    case 'critical_low':
      return 'CRITICAL LOW ↓↓';
    case 'critical_high':
      return 'CRITICAL HIGH ↑↑';
    case 'abnormal':
      return 'Abnormal';
    case 'not_applicable':
      return 'N/A';
    default:
      return 'Not Evaluated';
  }
};

/**
 * Client-side auto flag calculation
 */
const computeLocalFlag = (value, resultType, refRange, critLow, critHigh, allowedValues = []) => {
  if (value === '' || value == null) return 'not_evaluated';

  if (resultType === 'NUMERIC') {
    const num = parseFloat(value);
    if (isNaN(num)) return 'not_evaluated';
    if (critLow != null && num <= critLow) return 'critical_low';
    if (critHigh != null && num >= critHigh) return 'critical_high';
    if (refRange?.min != null && refRange?.max != null) {
      if (num < refRange.min) return 'low';
      if (num > refRange.max) return 'high';
      return 'normal';
    }
    return 'not_evaluated';
  }

  if (allowedValues?.length) {
    const match = allowedValues.find((av) => av.value?.toLowerCase() === String(value).toLowerCase());
    if (match) {
      if (match.isCritical) return 'critical_high';
      if (match.isAbnormal) return 'abnormal';
      return 'normal';
    }
  }

  return 'not_evaluated';
};

const LabResultEntryDrawer = ({
  isOpen,
  onClose,
  orderId,
  testGroup,
  allGroups = [],
  onSaved,
  isReadOnly = false
}) => {
  const [activeGroupKey, setActiveGroupKey] = useState(testGroup?.testCode || '');
  const [resultsState, setResultsState] = useState({});
  const [filterQuery, setFilterQuery] = useState('');
  const [flagFilter, setFlagFilter] = useState('ALL'); // ALL, PENDING, ABNORMAL, CRITICAL
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [expandedNotes, setExpandedNotes] = useState({});

  // Active group to display
  const currentGroup = useMemo(() => {
    if (!activeGroupKey && testGroup) return testGroup;
    return allGroups.find((g) => (g.testCode || g.testName) === activeGroupKey) || testGroup || { results: [] };
  }, [activeGroupKey, allGroups, testGroup]);

  // Sync state when drawer opens or group changes
  useEffect(() => {
    if (testGroup) {
      setActiveGroupKey(testGroup.testCode || testGroup.testName);
    }
  }, [testGroup]);

  // Initialize form state from results
  useEffect(() => {
    const initial = {};
    (allGroups || []).forEach((g) => {
      (g.results || []).forEach((r) => {
        initial[r._id] = {
          resultId: r._id,
          value: r.value ?? '',
          numericValue: r.numericValue ?? null,
          unit: r.unit ?? '',
          manualFlag: r.manualFlag ?? '',
          overrideReason: r.overrideReason ?? '',
          comment: r.comment ?? '',
          status: r.status ?? 'pending',
          autoFlag: r.autoFlag ?? 'not_evaluated',
          effectiveFlag: r.effectiveFlag ?? 'not_evaluated',
          isFlagManuallyOverridden: r.isFlagManuallyOverridden ?? false,
          isLocked: r.isLocked ?? false,
          // metadata snapshots for calculation
          resultType: r.resultType,
          referenceRange: r.referenceRange,
          criticalLow: r.criticalLow,
          criticalHigh: r.criticalHigh,
          allowedValues: r.allowedValues,
          parameterName: r.parameterName,
          testCode: r.testCode,
          testName: r.testName,
          isRequired: r.isRequired
        };
      });
    });
    setResultsState(initial);
    setHasUnsavedChanges(false);
    setSaveMessage('');
  }, [allGroups, isOpen]);

  // Handle value change
  const handleValueChange = (resultId, newValue) => {
    setResultsState((prev) => {
      const item = prev[resultId];
      if (!item || item.isLocked) return prev;

      const autoFlag = computeLocalFlag(
        newValue,
        item.resultType,
        item.referenceRange,
        item.criticalLow,
        item.criticalHigh,
        item.allowedValues
      );

      const effectiveFlag = item.isFlagManuallyOverridden && item.manualFlag ? item.manualFlag : autoFlag;
      const status = newValue !== '' ? 'entered' : 'pending';

      return {
        ...prev,
        [resultId]: {
          ...item,
          value: newValue,
          numericValue: item.resultType === 'NUMERIC' && newValue !== '' && !isNaN(parseFloat(newValue)) ? parseFloat(newValue) : null,
          autoFlag,
          effectiveFlag,
          status
        }
      };
    });
    setHasUnsavedChanges(true);
    setSaveMessage('');
  };

  // Handle manual flag override
  const handleFlagOverride = (resultId, newFlag) => {
    setResultsState((prev) => {
      const item = prev[resultId];
      if (!item || item.isLocked) return prev;

      const isOverridden = !!newFlag && newFlag !== '';
      const effectiveFlag = isOverridden ? newFlag : item.autoFlag;

      return {
        ...prev,
        [resultId]: {
          ...item,
          manualFlag: newFlag,
          isFlagManuallyOverridden: isOverridden,
          effectiveFlag
        }
      };
    });
    setHasUnsavedChanges(true);
  };

  // Handle comment change
  const handleCommentChange = (resultId, comment) => {
    setResultsState((prev) => {
      const item = prev[resultId];
      if (!item) return prev;
      return { ...prev, [resultId]: { ...item, comment } };
    });
    setHasUnsavedChanges(true);
  };

  // Handle N/A toggle
  const handleMarkNotApplicable = (resultId) => {
    setResultsState((prev) => {
      const item = prev[resultId];
      if (!item || item.isLocked) return prev;
      const isCurrentlyNA = item.status === 'not_applicable';
      return {
        ...prev,
        [resultId]: {
          ...item,
          status: isCurrentlyNA ? 'pending' : 'not_applicable',
          value: isCurrentlyNA ? '' : 'N/A',
          effectiveFlag: isCurrentlyNA ? 'not_evaluated' : 'not_applicable'
        }
      };
    });
    setHasUnsavedChanges(true);
  };

  // Save current group or all changes
  const handleSave = async (showNotification = true) => {
    if (!orderId) return;
    setIsSaving(true);
    setSaveMessage('');

    try {
      const payloadResults = Object.values(resultsState).map((item) => ({
        resultId: item.resultId,
        value: item.value,
        numericValue: item.numericValue,
        unit: item.unit,
        manualFlag: item.manualFlag,
        overrideReason: item.overrideReason,
        comment: item.comment,
        status: item.status
      }));

      await saveResultsBatch(orderId, { results: payloadResults });
      setHasUnsavedChanges(false);
      if (showNotification) {
        setSaveMessage('Results saved successfully.');
      }
      if (onSaved) onSaved();
    } catch (err) {
      setSaveMessage(`Error saving: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Filter items in active group
  const filteredResults = useMemo(() => {
    const list = (currentGroup?.results || []).map((r) => resultsState[r._id] || r);
    return list.filter((item) => {
      // text search
      if (filterQuery) {
        const q = filterQuery.toLowerCase();
        const matchesName = item.parameterName?.toLowerCase().includes(q);
        const matchesShort = item.parameterShortName?.toLowerCase().includes(q);
        if (!matchesName && !matchesShort) return false;
      }
      // flag filter
      if (flagFilter === 'PENDING') return item.status === 'pending';
      if (flagFilter === 'ABNORMAL') return ['low', 'high', 'abnormal'].includes(item.effectiveFlag);
      if (flagFilter === 'CRITICAL') return ['critical_low', 'critical_high'].includes(item.effectiveFlag);
      return true;
    });
  }, [currentGroup, resultsState, filterQuery, flagFilter]);

  // Group completion stats
  const currentStats = useMemo(() => {
    const list = (currentGroup?.results || []).map((r) => resultsState[r._id] || r);
    const total = list.length;
    const completed = list.filter((r) => ['entered', 'not_applicable'].includes(r.status)).length;
    const abnormal = list.filter((r) => ['low', 'high', 'abnormal'].includes(r.effectiveFlag)).length;
    const critical = list.filter((r) => ['critical_low', 'critical_high'].includes(r.effectiveFlag)).length;
    return { total, completed, abnormal, critical, pct: total ? Math.round((completed / total) * 100) : 0 };
  }, [currentGroup, resultsState]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-stone-900/60 backdrop-blur-sm transition-opacity" id="lab-result-entry-drawer">
      <div className="flex h-full w-full max-w-5xl flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="border-b border-stone-200 bg-stone-50/80 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-md shadow-violet-200">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-stone-900" id="drawer-title">
                    {currentGroup?.testName || 'Result Entry'}
                  </h2>
                  {currentGroup?.testCode ? (
                    <span className="rounded-lg bg-stone-200/80 px-2 py-0.5 text-xs font-semibold text-stone-700">
                      {currentGroup.testCode}
                    </span>
                  ) : null}
                  {isReadOnly ? (
                    <Badge tone="neutral">Read Only (Finalized)</Badge>
                  ) : (
                    <Badge tone="info">LIMS Entry Mode</Badge>
                  )}
                </div>
                <p className="text-xs text-stone-500">
                  Enter and verify diagnostic parameters. Abnormal and critical flags compute automatically in real-time.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Progress counter badge */}
              <div className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-3 py-1.5 shadow-sm">
                <div className="h-2 w-16 overflow-hidden rounded-full bg-stone-100">
                  <div
                    className={`h-full transition-all duration-300 ${currentStats.pct === 100 ? 'bg-emerald-500' : 'bg-violet-600'}`}
                    style={{ width: `${currentStats.pct}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-stone-700">
                  {currentStats.completed}/{currentStats.total} ({currentStats.pct}%)
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (hasUnsavedChanges) {
                    if (window.confirm('You have unsaved changes. Discard and close?')) {
                      onClose();
                    }
                  } else {
                    onClose();
                  }
                }}
                className="rounded-xl border border-stone-200 p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                id="close-drawer-btn"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Test Tabs (if multiple tests in order) */}
          {allGroups.length > 1 ? (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-stone-200/60 pt-3">
              {allGroups.map((g) => {
                const isSelected = (g.testCode || g.testName) === activeGroupKey;
                const gItems = (g.results || []).map((r) => resultsState[r._id] || r);
                const gCompleted = gItems.filter((r) => ['entered', 'not_applicable'].includes(r.status)).length;
                const gTotal = gItems.length;
                const gAllDone = gTotal > 0 && gCompleted === gTotal;

                return (
                  <button
                    key={g.testCode || g.testName}
                    type="button"
                    onClick={() => setActiveGroupKey(g.testCode || g.testName)}
                    className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                      isSelected
                        ? 'bg-violet-600 text-white shadow-sm shadow-violet-200'
                        : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <span>{g.testName}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                        isSelected
                          ? 'bg-violet-800 text-violet-100'
                          : gAllDone
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {gCompleted}/{gTotal}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-white px-6 py-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <svg className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search parameters..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 py-1.5 pl-9 pr-3 text-xs outline-none focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-100"
              id="parameter-search-input"
            />
          </div>

          <div className="flex items-center gap-1">
            {['ALL', 'PENDING', 'ABNORMAL', 'CRITICAL'].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFlagFilter(f)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  flagFilter === f
                    ? 'bg-stone-900 text-white'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                {f === 'ALL' && `All (${currentGroup?.results?.length || 0})`}
                {f === 'PENDING' && `Pending (${(currentGroup?.results || []).filter((r) => (resultsState[r._id]?.status || r.status) === 'pending').length})`}
                {f === 'ABNORMAL' && `Abnormal (${currentStats.abnormal})`}
                {f === 'CRITICAL' && `Critical (${currentStats.critical})`}
              </button>
            ))}
          </div>
        </div>

        {/* Parameter Results Table */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {filteredResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm font-semibold text-stone-600">No parameters match your search/filter.</p>
              <button
                type="button"
                onClick={() => {
                  setFilterQuery('');
                  setFlagFilter('ALL');
                }}
                className="mt-2 text-xs font-medium text-violet-600 hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50/75 text-stone-500 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4 w-[28%]">Parameter</th>
                    <th className="py-3 px-3 w-[22%]">Value</th>
                    <th className="py-3 px-3 w-[12%]">Unit</th>
                    <th className="py-3 px-3 w-[16%]">Reference Range</th>
                    <th className="py-3 px-3 w-[14%]">Flag</th>
                    <th className="py-3 px-3 w-[8%] text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-normal">
                  {filteredResults.map((r) => {
                    const itemState = resultsState[r._id] || r;
                    const isNA = itemState.status === 'not_applicable';
                    const flag = itemState.effectiveFlag || 'not_evaluated';
                    const hasNotes = !!(itemState.comment || itemState.overrideReason);
                    const isNotesExpanded = expandedNotes[r._id];

                    return (
                      <React.Fragment key={r._id}>
                        <tr
                          className={`group transition hover:bg-stone-50/60 ${
                            flag === 'critical_low' || flag === 'critical_high'
                              ? 'bg-rose-50/40'
                              : flag === 'low' || flag === 'high' || flag === 'abnormal'
                              ? 'bg-amber-50/30'
                              : isNA
                              ? 'bg-stone-50/50 opacity-60'
                              : ''
                          }`}
                        >
                          {/* Parameter Name */}
                          <td className="py-3.5 px-4 align-middle">
                            <div className="flex flex-col">
                              <span className="font-semibold text-stone-900">
                                {r.parameterName}
                                {r.isRequired ? <span className="ml-1 text-rose-500">*</span> : null}
                              </span>
                              {r.parameterShortName && r.parameterShortName !== r.parameterName ? (
                                <span className="text-[11px] text-stone-400">{r.parameterShortName}</span>
                              ) : null}
                            </div>
                          </td>

                          {/* Value Input */}
                          <td className="py-3.5 px-3 align-middle">
                            {isNA ? (
                              <span className="italic text-stone-400">Not Applicable</span>
                            ) : r.resultType === 'ENUM' || r.resultType === 'QUALITATIVE' ? (
                              <select
                                value={itemState.value || ''}
                                onChange={(e) => handleValueChange(r._id, e.target.value)}
                                disabled={isReadOnly || itemState.isLocked}
                                className="w-full rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 disabled:bg-stone-100 disabled:text-stone-400"
                                id={`input-${r._id}`}
                              >
                                <option value="">Select...</option>
                                {(r.allowedValues || []).map((av) => (
                                  <option key={av.value} value={av.value}>
                                    {av.displayName || av.value}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type={r.resultType === 'NUMERIC' ? 'number' : 'text'}
                                step={r.resultType === 'NUMERIC' ? '0.01' : undefined}
                                value={itemState.value ?? ''}
                                onChange={(e) => handleValueChange(r._id, e.target.value)}
                                disabled={isReadOnly || itemState.isLocked}
                                placeholder={r.resultType === 'NUMERIC' ? '0.00' : 'Enter value...'}
                                className={`w-full rounded-xl border px-2.5 py-1.5 text-xs font-semibold outline-none transition focus:ring-2 disabled:bg-stone-100 disabled:text-stone-400 ${
                                  flag === 'critical_low' || flag === 'critical_high'
                                    ? 'border-rose-300 bg-rose-50/50 text-rose-900 focus:border-rose-500 focus:ring-rose-100'
                                    : flag === 'low' || flag === 'high' || flag === 'abnormal'
                                    ? 'border-amber-300 bg-amber-50/50 text-amber-900 focus:border-amber-500 focus:ring-amber-100'
                                    : 'border-stone-200 bg-white text-stone-800 focus:border-violet-500 focus:ring-violet-100'
                                }`}
                                id={`input-${r._id}`}
                              />
                            )}
                          </td>

                          {/* Unit */}
                          <td className="py-3.5 px-3 align-middle text-stone-600 font-mono text-[11px]">
                            {r.unit || '—'}
                          </td>

                          {/* Reference Range */}
                          <td className="py-3.5 px-3 align-middle text-stone-600 text-[11px]">
                            {r.referenceRange?.text ||
                              (r.referenceRange?.min != null && r.referenceRange?.max != null
                                ? `${r.referenceRange.min} – ${r.referenceRange.max}`
                                : '—')}
                          </td>

                          {/* Flag Badge */}
                          <td className="py-3.5 px-3 align-middle">
                            <div className="flex flex-col gap-1">
                              <Badge tone={getFlagTone(flag)}>{getFlagLabel(flag)}</Badge>
                              {itemState.isFlagManuallyOverridden ? (
                                <span className="text-[10px] text-amber-600 font-medium">Overridden</span>
                              ) : null}
                            </div>
                          </td>

                          {/* Row Actions */}
                          <td className="py-3.5 px-3 align-middle text-center">
                            <div className="flex items-center justify-center gap-1">
                              {/* Toggle Notes/Override Drawer Row */}
                              <button
                                type="button"
                                title="Notes & Overrides"
                                onClick={() =>
                                  setExpandedNotes((prev) => ({ ...prev, [r._id]: !prev[r._id] }))
                                }
                                className={`rounded-lg p-1 transition ${
                                  hasNotes || isNotesExpanded
                                    ? 'bg-violet-100 text-violet-700'
                                    : 'text-stone-400 hover:bg-stone-100 hover:text-stone-700'
                                }`}
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>

                              {/* Toggle N/A */}
                              {!isReadOnly && !itemState.isLocked ? (
                                <button
                                  type="button"
                                  title={isNA ? 'Unmark N/A' : 'Mark as Not Applicable'}
                                  onClick={() => handleMarkNotApplicable(r._id)}
                                  className={`rounded-lg p-1 text-[11px] font-bold transition ${
                                    isNA
                                      ? 'bg-stone-200 text-stone-700'
                                      : 'text-stone-300 hover:bg-stone-100 hover:text-stone-600'
                                  }`}
                                >
                                  N/A
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>

                        {/* Expandable Notes & Flag Override Row */}
                        {isNotesExpanded ? (
                          <tr className="bg-stone-50/90 border-b border-stone-200">
                            <td colSpan={6} className="p-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl border border-stone-200 bg-white p-3">
                                <div>
                                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                                    Manual Flag Override
                                  </label>
                                  <div className="flex gap-2">
                                    <select
                                      value={itemState.manualFlag || ''}
                                      onChange={(e) => handleFlagOverride(r._id, e.target.value)}
                                      disabled={isReadOnly || itemState.isLocked}
                                      className="flex-1 rounded-xl border border-stone-200 bg-white px-2.5 py-1 text-xs outline-none focus:border-violet-500"
                                    >
                                      <option value="">Auto Flag ({getFlagLabel(itemState.autoFlag)})</option>
                                      <option value="normal">Normal</option>
                                      <option value="low">Low</option>
                                      <option value="high">High</option>
                                      <option value="critical_low">Critical Low</option>
                                      <option value="critical_high">Critical High</option>
                                      <option value="abnormal">Abnormal</option>
                                      <option value="not_applicable">Not Applicable</option>
                                    </select>
                                    {itemState.isFlagManuallyOverridden ? (
                                      <button
                                        type="button"
                                        onClick={() => handleFlagOverride(r._id, '')}
                                        className="text-xs text-rose-600 font-semibold hover:underline"
                                      >
                                        Reset
                                      </button>
                                    ) : null}
                                  </div>
                                  {itemState.isFlagManuallyOverridden ? (
                                    <input
                                      type="text"
                                      placeholder="Reason for flag override..."
                                      value={itemState.overrideReason || ''}
                                      onChange={(e) => {
                                        setResultsState((prev) => ({
                                          ...prev,
                                          [r._id]: { ...prev[r._id], overrideReason: e.target.value }
                                        }));
                                        setHasUnsavedChanges(true);
                                      }}
                                      className="mt-1.5 w-full rounded-xl border border-stone-200 px-2.5 py-1 text-xs outline-none focus:border-violet-500"
                                    />
                                  ) : null}
                                </div>

                                <div>
                                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                                    Clinical / Technologist Note
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g. Hemolyzed sample, repeat verified, clinical correlation advised..."
                                    value={itemState.comment || ''}
                                    onChange={(e) => handleCommentChange(r._id, e.target.value)}
                                    disabled={isReadOnly || itemState.isLocked}
                                    className="w-full rounded-xl border border-stone-200 px-2.5 py-1 text-xs outline-none focus:border-violet-500"
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Drawer Footer / Actions */}
        <div className="border-t border-stone-200 bg-stone-50 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {saveMessage ? (
                <span className={`text-xs font-semibold ${saveMessage.includes('Error') ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {saveMessage}
                </span>
              ) : hasUnsavedChanges ? (
                <span className="flex items-center gap-1.5 text-xs text-amber-700 font-medium">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  Unsaved changes
                </span>
              ) : (
                <span className="text-xs text-stone-500">All results up to date</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-stone-300 bg-white px-4 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
              >
                Close
              </button>

              {!isReadOnly ? (
                <button
                  type="button"
                  onClick={() => handleSave(true)}
                  disabled={isSaving || !hasUnsavedChanges}
                  className="flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-violet-200 hover:bg-violet-700 disabled:bg-stone-300 disabled:shadow-none"
                  id="save-results-btn"
                >
                  {isSaving ? (
                    <>
                      <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Results</span>
                  )}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabResultEntryDrawer;
