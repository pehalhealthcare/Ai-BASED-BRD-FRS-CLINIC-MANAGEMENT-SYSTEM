import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import PageHeader from '../../components/layout/PageHeader';
import { consultationApi, aiApi } from '../../lib/api';
import { createLabOrder, listLabTests } from './labApi';

const FIELD_CLASS =
  'w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';

const LabOrderCreatePage = () => {
  const { consultationId } = useParams();
  const navigate = useNavigate();
  const [consultation, setConsultation] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [form, setForm] = useState({
    priority: 'routine',
    notes: '',
    selectedTestIds: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadContext = async () => {
      setLoading(true);
      setError('');

      try {
        const [consultationResponse, testsResponse] = await Promise.all([
          consultationApi.get(consultationId),
          listLabTests({ limit: 100, isActive: true })
        ]);

        if (!isMounted) {
          return;
        }

        setConsultation(consultationResponse.data.consultation);
        setCatalog(testsResponse.data.labTests || []);
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.response?.data?.message || 'Unable to load the lab ordering workspace.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadContext();

    return () => {
      isMounted = false;
    };
  }, [consultationId]);

  const handleToggleTest = (labTestId) => {
    setForm((current) => ({
      ...current,
      selectedTestIds: current.selectedTestIds.includes(labTestId)
        ? current.selectedTestIds.filter((id) => id !== labTestId)
        : [...current.selectedTestIds, labTestId]
    }));
  };

  const handleLoadSuggestions = async () => {
    setLoadingSuggestions(true);
    setError('');

    try {
      const response = await aiApi.labTestRecommendations({
        symptoms: [consultation?.chiefComplaint, ...(consultation?.symptoms || [])].filter(Boolean).join(', '),
        diagnosis: consultation?.diagnosis || consultation?.provisionalDiagnosis || '',
        age: consultation?.patientId?.age,
        patient_id: consultation?.patientId?._id,
        consultation_id: consultationId
      });

      const output = response?.data || response;
      const recommended = output?.suggested_tests || output?.recommended_tests || [];
      setSuggestions(recommended);

      const matchedIds = catalog
        .filter((test) =>
          recommended.some((item) => {
            const suggestedName = (item.test_name || item.name || '').toLowerCase();
            return (
              (item.code && item.code.toLowerCase() === test.code?.toLowerCase()) ||
              suggestedName.includes(test.name?.toLowerCase()) ||
              test.name?.toLowerCase().includes(suggestedName)
            );
          })
        )
        .map((test) => test._id);

      if (matchedIds.length) {
        setForm((current) => ({
          ...current,
          selectedTestIds: [...new Set([...current.selectedTestIds, ...matchedIds])]
        }));
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load AI lab test suggestions.');
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const response = await createLabOrder({
        consultationId,
        patientId: consultation.patientId?._id || consultation.patientId,
        doctorId: consultation.doctorId?._id || consultation.doctorId,
        ...(consultation.appointmentId?._id || consultation.appointmentId
          ? { appointmentId: consultation.appointmentId?._id || consultation.appointmentId }
          : {}),
        priority: form.priority,
        notes: form.notes,
        tests: form.selectedTestIds.map((labTestId) => ({ labTestId }))
      });

      navigate(`/labs/orders/${response.data.labOrder._id}`, { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to create the lab order.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading consultation lab context..." />;
  }

  if (error && !consultation) {
    return <ErrorState title="Lab order workspace unavailable" description={error} />;
  }

  if (!catalog.length) {
    return (
      <EmptyState
        title="No active lab catalog items"
        description="An admin needs to create lab tests before doctors can place lab orders."
        action={
          <div className="mt-4">
            <Link className="rounded-2xl border border-emerald-300 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50" to="/labs/tests">
              Open lab catalog
            </Link>
          </div>
        }
      />
    );
  }

  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow="Phase 11"
        title="Create lab order"
        description="Select one or more tests from the clinic catalog and attach the order directly to the active consultation."
        actions={
          <>
            <Link className="rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50" to={`/consultations/${consultationId}`}>
              Back to consultation
            </Link>
          </>
        }
      />

      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <article className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
          <div>
            <h2 className="text-xl font-semibold text-stone-900">Consultation context</h2>
            <p className="mt-2 text-sm text-stone-600">The backend will validate patient, doctor, clinic, and consultation ownership before creating the order.</p>
          </div>
          <div className="rounded-2xl bg-stone-50 p-4">
            <p className="text-sm font-semibold text-stone-900">{consultation?.patientId?.fullName || 'Patient not provided'}</p>
            <p className="mt-1 text-sm text-stone-600">Doctor: {consultation?.doctorId?.fullName || 'Doctor not provided'}</p>
            <p className="mt-1 text-sm text-stone-600">Chief complaint: {consultation?.chiefComplaint || 'Not provided'}</p>
            <p className="mt-1 text-sm text-stone-600">Consultation status: {consultation?.status || 'Not provided'}</p>
          </div>

          <form className="grid gap-4" onSubmit={handleSubmit}>
            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Priority</span>
              <select className={FIELD_CLASS} value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}>
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Clinical note</span>
              <textarea
                className={FIELD_CLASS}
                rows={5}
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Rule out infection, monitor anemia, verify metabolic panel..."
              />
            </label>

            <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-900">
              {form.selectedTestIds.length} test{form.selectedTestIds.length === 1 ? '' : 's'} selected
            </div>

            <button
              type="button"
              onClick={handleLoadSuggestions}
              disabled={loadingSuggestions}
              className="rounded-2xl border border-cyan-300 px-4 py-3 text-sm font-semibold text-cyan-700 hover:bg-cyan-50 disabled:opacity-60"
            >
              {loadingSuggestions ? 'Loading AI suggestions...' : 'Suggest lab tests with AI'}
            </button>

            {suggestions.length ? (
              <div className="grid gap-2 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
                <p className="font-semibold text-stone-900">AI suggested tests</p>
                {suggestions.map((item, index) => (
                  <p key={`${item.test_name || item.name}-${index}`}>
                    {item.test_name || item.name} — {item.reason || 'Clinical relevance'}
                  </p>
                ))}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={saving || !form.selectedTestIds.length}
              className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-stone-300"
            >
              {saving ? 'Creating...' : 'Create lab order'}
            </button>
          </form>
        </article>

        <div className="grid gap-4">
          {catalog.map((labTest) => {
            const isSelected = form.selectedTestIds.includes(labTest._id);

            return (
              <button
                key={labTest._id}
                type="button"
                onClick={() => handleToggleTest(labTest._id)}
                className={`rounded-3xl border p-5 text-left shadow-sm transition ${
                  isSelected
                    ? 'border-emerald-400 bg-emerald-50 shadow-emerald-100'
                    : 'border-stone-200 bg-white shadow-stone-200/40 hover:border-emerald-300 hover:bg-emerald-50/40'
                }`}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-semibold text-stone-900">{labTest.name}</h3>
                      <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">{labTest.code}</span>
                    </div>
                    <p className="mt-2 text-sm text-stone-600">
                      {labTest.category} | {labTest.specimenType || 'Specimen not provided'}
                    </p>
                    <p className="mt-1 text-sm text-stone-600">
                      Reference: {labTest.normalRange?.text || [labTest.normalRange?.min, labTest.normalRange?.max].filter((value) => typeof value !== 'undefined').join(' - ') || 'Not provided'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-stone-900">INR {Number(labTest.price || 0).toFixed(2)}</p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">{isSelected ? 'Selected' : 'Tap to add'}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default LabOrderCreatePage;
