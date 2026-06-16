import { useState } from 'react';

import { downloadPrescriptionPdf } from './prescriptionApi';

const PrescriptionPdfButton = ({ prescriptionId, disabled = false }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDownload = async () => {
    if (!prescriptionId || disabled) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await downloadPrescriptionPdf(prescriptionId);
      const blob = new Blob([response.data], {
        type: response.headers['content-type'] || 'application/pdf'
      });
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const disposition = response.headers['content-disposition'] || '';
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/i);

      link.href = objectUrl;
      link.download = filenameMatch?.[1] || `prescription-${prescriptionId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to download prescription PDF.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-2">
      <button
        type="button"
        disabled={disabled || loading}
        onClick={handleDownload}
        className="rounded-2xl border border-emerald-300 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:border-stone-200 disabled:text-stone-400"
      >
        {loading ? 'Preparing PDF...' : 'Download PDF'}
      </button>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </div>
  );
};

export default PrescriptionPdfButton;
