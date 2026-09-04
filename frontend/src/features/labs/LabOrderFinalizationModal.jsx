import React, { useState, useEffect } from 'react';
import Badge from '../../components/common/Badge';
import { checkOrderCompletion, finalizeOrder } from './labApi';

const LabOrderFinalizationModal = ({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  onFinalized,
  onOpenTestResultEntry
}) => {
  const [checking, setChecking] = useState(true);
  const [completionData, setCompletionData] = useState(null);
  const [error, setError] = useState('');
  const [finalizing, setFinalizing] = useState(false);
  const [generatePdf, setGeneratePdf] = useState(true);
  const [finalNotes, setFinalNotes] = useState('');

  const loadCompletionCheck = async () => {
    if (!orderId) return;
    setChecking(true);
    setError('');

    try {
      const response = await checkOrderCompletion(orderId);
      setCompletionData(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to check order completion status.');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCompletionCheck();
    }
  }, [isOpen, orderId]);

  const handleFinalize = async () => {
    setFinalizing(true);
    setError('');

    try {
      const response = await finalizeOrder(orderId, {
        generatePdf,
        notes: finalNotes
      });
      if (onFinalized) onFinalized(response.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Finalization failed.');
    } finally {
      setFinalizing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" id="lab-finalization-modal">
      <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl overflow-hidden border border-stone-100 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="border-b border-stone-200 bg-stone-50/80 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-md shadow-violet-200">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">Finalize Laboratory Order</h3>
                <p className="text-xs text-stone-500">Order: {orderNumber || orderId}</p>
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
        </div>

        {/* Body */}
        <div className="p-6">
          {checking ? (
            <div className="flex flex-col items-center justify-center py-10">
              <svg className="h-8 w-8 animate-spin text-violet-600 mb-3" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <p className="text-xs font-semibold text-stone-600">Validating order completeness across all diagnostic tests...</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs font-medium text-rose-700">
              {error}
            </div>
          ) : !completionData?.canFinalize ? (
            <div className="space-y-4">
              {/* Incomplete Alert */}
              <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white text-xs font-bold shrink-0">
                    !
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-900">
                      Cannot Finalize: {completionData?.totalMissing} Required Parameter(s) Missing
                    </h4>
                    <p className="mt-1 text-xs text-amber-700">
                      In accordance with clinical protocol, every diagnostic investigation in this order must have its mandatory parameter values entered or marked N/A before the order can be marked completed.
                    </p>
                  </div>
                </div>
              </div>

              {/* List of missing groups */}
              <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-4">
                <h5 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">
                  Missing Result Parameters:
                </h5>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {(completionData?.missingGroups || []).map((group, idx) => (
                    <div key={idx} className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-stone-900">{group.testName}</span>
                        {onOpenTestResultEntry ? (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenTestResultEntry(group.testName);
                            }}
                            className="text-xs font-semibold text-violet-600 hover:underline"
                          >
                            Enter Results →
                          </button>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {group.missingParams.map((paramName, pIdx) => (
                          <span
                            key={pIdx}
                            className="rounded-lg bg-rose-50 border border-rose-200 px-2 py-0.5 text-[11px] font-semibold text-rose-700"
                          >
                            {paramName}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Ready Confirmation Banner */}
              <div className="rounded-2xl border border-emerald-300 bg-emerald-50/80 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white font-bold shrink-0">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-900">
                      All {completionData.totalParams} Diagnostic Parameters Verified
                    </h4>
                    <p className="text-xs text-emerald-700">
                      This order is fully completed and ready for official release and report publication.
                    </p>
                  </div>
                </div>
              </div>

              {/* Option checkboxes & Notes */}
              <div className="space-y-3 rounded-2xl border border-stone-200 bg-stone-50/50 p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={generatePdf}
                    onChange={(e) => setGeneratePdf(e.target.checked)}
                    className="h-4 w-4 rounded text-violet-600 focus:ring-violet-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-stone-800">Generate Official Structured PDF Report</span>
                    <p className="text-stone-500 text-[11px]">
                      Creates a publication-ready PDF with clinic header, reference ranges, and flagged values.
                    </p>
                  </div>
                </label>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Final Technologist / Pathologist Sign-off Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Verified by Senior Pathologist. Patient alerted regarding abnormal glucose."
                    value={finalNotes}
                    onChange={(e) => setFinalNotes(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                  />
                </div>
              </div>

              {/* Locking Warning */}
              <div className="flex items-center gap-2 text-[11px] text-stone-500">
                <svg className="h-4 w-4 text-stone-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Finalizing locks all results. Subsequent changes will require an official amendment audit record.</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-stone-200 bg-stone-50 px-6 py-4">
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-stone-300 bg-white px-4 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </button>

            {completionData?.canFinalize ? (
              <button
                type="button"
                onClick={handleFinalize}
                disabled={finalizing}
                className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-emerald-200 hover:bg-emerald-700 disabled:bg-stone-300 disabled:shadow-none"
                id="confirm-finalize-btn"
              >
                {finalizing ? (
                  <>
                    <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Finalizing Order...</span>
                  </>
                ) : (
                  <span>Confirm & Finalize Order</span>
                )}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabOrderFinalizationModal;
