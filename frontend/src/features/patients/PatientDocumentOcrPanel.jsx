import { useState } from 'react';

import aiApi from '../../api/aiApi';

const FIELD_CLASS =
  'rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';

const pickValue = (...values) => values.find((value) => typeof value === 'string' && value.trim())?.trim() || '';

const PatientDocumentOcrPanel = ({ onApply }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', 'patient_id');

      const data = await aiApi.extractDocument(formData);
      const output = data?.output || data;
      const extracted = output?.extracted_fields || output?.fields || output;

      onApply?.({
        firstName: pickValue(extracted?.first_name, extracted?.firstName, extracted?.name?.split?.(' ')?.[0]),
        lastName: pickValue(extracted?.last_name, extracted?.lastName, extracted?.name?.split?.(' ')?.slice(1).join(' ')),
        phone: pickValue(extracted?.phone, extracted?.mobile, extracted?.contact),
        email: pickValue(extracted?.email),
        dateOfBirth: pickValue(extracted?.date_of_birth, extracted?.dateOfBirth, extracted?.dob),
        gender: pickValue(extracted?.gender)?.toLowerCase(),
        address: {
          line1: pickValue(extracted?.address, extracted?.address_line1, extracted?.line1),
          city: pickValue(extracted?.city),
          state: pickValue(extracted?.state),
          pincode: pickValue(extracted?.pincode, extracted?.postal_code)
        }
      });

      setMessage('Document scanned. Review the autofilled fields before saving.');
    } catch (requestError) {
      setError(requestError.message || 'Unable to extract patient details from the document.');
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  return (
    <div className="grid gap-3 rounded-3xl border border-sky-200 bg-sky-50/70 p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Smart registration</p>
        <h3 className="mt-1 text-lg font-semibold text-stone-900">Upload ID or registration document</h3>
        <p className="mt-1 text-sm text-stone-600">
          OCR will attempt to autofill patient details. Always verify extracted data before saving.
        </p>
      </div>
      <label className="grid gap-2 text-sm font-medium text-stone-700">
        <span>Document image or PDF</span>
        <input className={FIELD_CLASS} type="file" accept="image/*,.pdf" onChange={handleUpload} disabled={loading} />
      </label>
      {loading ? <p className="text-sm text-sky-700">Extracting document details...</p> : null}
      {message ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
    </div>
  );
};

export default PatientDocumentOcrPanel;
