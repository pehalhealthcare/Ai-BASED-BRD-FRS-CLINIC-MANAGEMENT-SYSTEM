import React, { useState, useEffect, useMemo } from 'react';
import Badge from '../../components/common/Badge';
import { saveResultsBatch } from './labApi';

const LabExtractionReviewDrawer = ({
  isOpen,
  onClose,
  orderId,
  allGroups = [],
  extractedData = [],
  onApplied
}) => {
  // Flatten all order parameters for easy lookup
  const orderParameters = useMemo(() => {
    const list = [];
    (allGroups || []).forEach((g) => {
      (g.results || []).forEach((r) => {
        list.push({
          ...r,
          groupName: g.testName,
          groupCode: g.testCode
        });
      });
    });
    return list;
  }, [allGroups]);

  // Initial mapping computation: match extracted item to order param by name/code
  const [mappings, setMappings] = useState([]);
  const [isApplying, setIsApplying] = useState(false);
  const [applyError, setApplyError] = useState('');

  useEffect(() => {
    if (!extractedData || extractedData.length === 0) {
      setMappings([]);
      return;
    }

    const calculated = extractedData.map((ext, idx) => {
      const extName = (ext.name || ext.parameterName || ext.code || '').trim().toLowerCase();
      // Find best match in order parameters
      const matchedParam = orderParameters.find((p) => {
        const pName = (p.parameterName || '').toLowerCase();
        const pShort = (p.parameterShortName || '').toLowerCase();
        const pCode = (p.parameterCode || '').toLowerCase();
        return (
          pName === extName ||
          pShort === extName ||
          pCode === extName ||
          pName.includes(extName) ||
          extName.includes(pName)
        );
      });

      return {
        id: `ext-${idx}`,
        extractedName: ext.name || ext.parameterName || 'Unknown Param',
        extractedValue: ext.value != null ? String(ext.value) : '',
        extractedUnit: ext.unit || '',
        extractedRange: ext.normalRange?.text || (ext.normalRange?.min != null ? `${ext.normalRange.min}-${ext.normalRange.max}` : ''),
        extractedFlag: ext.abnormalFlag || 'normal',
        confidence: ext.confidence ?? 0.95,
        targetResultId: matchedParam ? matchedParam._id : '',
        isSelected: !!matchedParam
      };
    });

    setMappings(calculated);
  }, [extractedData, orderParameters]);

  const handleToggleSelect = (id) => {
    setMappings((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isSelected: !m.isSelected } : m))
    );
  };

  const handleTargetChange = (id, targetResultId) => {
    setMappings((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              targetResultId,
              isSelected: !!targetResultId
            }
          : m
      )
    );
  };

  const handleValueChange = (id, extractedValue) => {
    setMappings((prev) =>
      prev.map((m) => (m.id === id ? { ...m, extractedValue } : m))
    );
  };

  const matchedCount = mappings.filter((m) => m.targetResultId && m.isSelected).length;
  const unmappedCount = mappings.filter((m) => !m.targetResultId).length;

  const handleApply = async () => {
    const toApply = mappings.filter((m) => m.targetResultId && m.isSelected && m.extractedValue !== '');
    if (toApply.length === 0) {
      setApplyError('No mapped parameters selected to apply.');
      return;
    }

    setIsApplying(true);
    setApplyError('');

    try {
      const payloadResults = toApply.map((m) => {
        const num = parseFloat(m.extractedValue);
        return {
          resultId: m.targetResultId,
          value: m.extractedValue,
          numericValue: !isNaN(num) ? num : null,
          unit: m.extractedUnit || undefined,
          status: 'entered'
        };
      });

      await saveResultsBatch(orderId, { results: payloadResults });
      if (onApplied) onApplied();
      onClose();
    } catch (err) {
      setApplyError(err.response?.data?.message || err.message || 'Failed to apply extracted results.');
    } finally {
      setIsApplying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-stone-900/60 backdrop-blur-sm transition-opacity" id="lab-extraction-review-drawer">
      <div className="flex h-full w-full max-w-4xl flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="border-b border-stone-200 bg-stone-50/80 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-200">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-stone-900">AI Report Extraction Review</h2>
                <p className="text-xs text-stone-500">
                  Review extracted parameters and map them to this order's diagnostic tests.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-stone-200 p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Stats Bar */}
          <div className="mt-4 flex flex-wrap gap-3">
            <span className="rounded-xl bg-white border border-stone-200 px-3 py-1 text-xs font-semibold text-stone-700 shadow-sm">
              Total Extracted: {mappings.length}
            </span>
            <span className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-800">
              Auto-Matched: {matchedCount}
            </span>
            {unmappedCount > 0 ? (
              <span className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-800">
                Unmapped / Needs Selection: {unmappedCount}
              </span>
            ) : null}
          </div>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {mappings.length === 0 ? (
            <div className="py-16 text-center text-sm text-stone-500">
              No parameters extracted from the uploaded document.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50/75 text-stone-500 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-3 w-[6%] text-center">Include</th>
                    <th className="py-3 px-3 w-[28%]">Extracted Finding</th>
                    <th className="py-3 px-3 w-[18%]">Extracted Value</th>
                    <th className="py-3 px-3 w-[36%]">Map to Order Test Parameter</th>
                    <th className="py-3 px-3 w-[12%] text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {mappings.map((m) => {
                    const isMatched = !!m.targetResultId;

                    return (
                      <tr
                        key={m.id}
                        className={`transition hover:bg-stone-50/60 ${
                          !isMatched ? 'bg-amber-50/20' : m.isSelected ? 'bg-emerald-50/20' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3.5 px-3 text-center align-middle">
                          <input
                            type="checkbox"
                            checked={m.isSelected && isMatched}
                            disabled={!isMatched}
                            onChange={() => handleToggleSelect(m.id)}
                            className="h-4 w-4 rounded text-violet-600 focus:ring-violet-500"
                          />
                        </td>

                        {/* Extracted Name & Unit */}
                        <td className="py-3.5 px-3 align-middle">
                          <div className="font-semibold text-stone-900">{m.extractedName}</div>
                          {m.extractedUnit || m.extractedRange ? (
                            <div className="text-[11px] text-stone-400">
                              Unit: {m.extractedUnit || '—'} | Range: {m.extractedRange || '—'}
                            </div>
                          ) : null}
                        </td>

                        {/* Extracted Value editable */}
                        <td className="py-3.5 px-3 align-middle">
                          <input
                            type="text"
                            value={m.extractedValue}
                            onChange={(e) => handleValueChange(m.id, e.target.value)}
                            className="w-full rounded-xl border border-stone-200 px-2 py-1 text-xs font-semibold outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                          />
                        </td>

                        {/* Target Order Parameter Selector */}
                        <td className="py-3.5 px-3 align-middle">
                          <select
                            value={m.targetResultId || ''}
                            onChange={(e) => handleTargetChange(m.id, e.target.value)}
                            className="w-full rounded-xl border border-stone-200 bg-white px-2 py-1 text-xs outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                          >
                            <option value="">-- Do not map (Ignore) --</option>
                            {orderParameters.map((p) => (
                              <option key={p._id} value={p._id}>
                                [{p.groupName}] {p.parameterName} ({p.unit || 'no unit'})
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Status badge */}
                        <td className="py-3.5 px-3 text-center align-middle">
                          {isMatched ? (
                            <Badge tone="success">Matched</Badge>
                          ) : (
                            <Badge tone="warning">Unmapped</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-stone-200 bg-stone-50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              {applyError ? <p className="text-xs font-semibold text-rose-600">{applyError}</p> : null}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-stone-300 bg-white px-4 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={isApplying || matchedCount === 0}
                className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-emerald-200 hover:bg-emerald-700 disabled:bg-stone-300 disabled:shadow-none"
              >
                {isApplying ? (
                  <span>Applying ({matchedCount})...</span>
                ) : (
                  <span>Apply {matchedCount} Parameters to Order</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabExtractionReviewDrawer;
