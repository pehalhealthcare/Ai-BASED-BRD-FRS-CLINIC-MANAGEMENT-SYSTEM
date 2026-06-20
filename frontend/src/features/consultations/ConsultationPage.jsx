import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import { appointmentApi } from '../../lib/api';
import AiSuggestionsPanel from './AiSuggestionsPanel';
import ConsultationForm from './ConsultationForm';
import ConsultationHistory from './ConsultationHistory';
import VoiceNotePanel from './VoiceNotePanel';
import {
  approveConsultationAiNote,
  completeConsultation,
  createConsultation,
  editConsultationAiNote,
  formatConsultationNote,
  getAppointmentConsultation,
  getConsultation,
  rejectConsultationAiNote,
  requestConsultationAiSuggestions,
  reviewConsultationAiSuggestions,
  uploadConsultationVoiceNote,
  updateConsultation
} from './consultationApi';

const createEmptySymptom = () => ({
  name: '',
  severity: 'mild',
  duration: '',
  notes: ''
});

const createInitialForm = () => ({
  chiefComplaint: '',
  symptoms: [createEmptySymptom()],
  vitals: {
    temperature: '',
    bloodPressure: '',
    pulse: '',
    respiratoryRate: '',
    oxygenSaturation: '',
    weight: '',
    height: ''
  },
  clinicalNotes: '',
  formattedClinicalNotes: {
    subjective: '',
    objective: '',
    assessment: '',
    plan: ''
  },
  transcript_text: '',
  ai_soap_note: {
    note_type: 'SOAP',
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    draft_ai_note: true,
    missing_information: []
  },
  voiceNoteLanguage: 'auto',
  diagnosis: {
    primary: '',
    secondary: [],
    notes: ''
  },
  secondaryDiagnosisInput: '',
  treatmentPlan: '',
  followUp: {
    required: false,
    date: '',
    notes: ''
  }
});

const normalizeVitals = (vitals = {}) =>
  Object.entries(vitals).reduce((result, [key, value]) => {
    if (value === '' || value === null || typeof value === 'undefined') {
      return result;
    }

    result[key] = key === 'bloodPressure' ? value : Number(value);
    return result;
  }, {});

const parseCommaSeparated = (value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const normalizeSymptomsForForm = (symptoms = []) => {
  if (!symptoms.length) {
    return [createEmptySymptom()];
  }

  return symptoms.map((symptom) => ({
    name: symptom?.name || '',
    severity: symptom?.severity || 'mild',
    duration: symptom?.duration || '',
    notes: symptom?.notes || ''
  }));
};

const ConsultationPage = () => {
  const { appointmentId, consultationId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(createInitialForm());
  const [consultation, setConsultation] = useState(null);
  const [patient, setPatient] = useState(null);
  const [doctor, setDoctor] = useState(null);
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [formatting, setFormatting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [voiceUploading, setVoiceUploading] = useState(false);
  const [aiDraftSaving, setAiDraftSaving] = useState(false);
  const [aiDraftApproving, setAiDraftApproving] = useState(false);
  const [aiDraftRejecting, setAiDraftRejecting] = useState(false);
  const [selectedAudioFile, setSelectedAudioFile] = useState(null);
  const [error, setError] = useState('');

  const applyConsultationToState = (responseData) => {
    const nextConsultation = responseData.consultation;
    const nextPatient = responseData.patient || nextConsultation?.patientId || patient;
    const nextDoctor = responseData.doctor || nextConsultation?.doctorId || doctor;
    const nextAppointment = responseData.appointment || nextConsultation?.appointmentId || appointment;
    const nextDiagnosis = nextConsultation?.diagnosis || {};
    const nextFormatted = nextConsultation?.formattedClinicalNotes || {};
    const nextFollowUp = nextConsultation?.followUp || {};
    const nextAiSoap = nextConsultation?.ai_soap_note || {};

    setConsultation(nextConsultation);
    setPatient(nextPatient);
    setDoctor(nextDoctor);
    setAppointment(nextAppointment);
    setForm({
      chiefComplaint: nextConsultation?.chiefComplaint || '',
      symptoms: normalizeSymptomsForForm(nextConsultation?.symptoms || []),
      vitals: {
        temperature: nextConsultation?.vitals?.temperature ?? '',
        bloodPressure: nextConsultation?.vitals?.bloodPressure ?? '',
        pulse: nextConsultation?.vitals?.pulse ?? '',
        respiratoryRate: nextConsultation?.vitals?.respiratoryRate ?? '',
        oxygenSaturation:
          nextConsultation?.vitals?.oxygenSaturation ?? nextConsultation?.vitals?.spo2 ?? '',
        weight: nextConsultation?.vitals?.weight ?? '',
        height: nextConsultation?.vitals?.height ?? ''
      },
      clinicalNotes: nextConsultation?.clinicalNotes || '',
      formattedClinicalNotes: {
        subjective: nextFormatted.subjective || '',
        objective: nextFormatted.objective || '',
        assessment: nextFormatted.assessment || '',
        plan: nextFormatted.plan || ''
      },
      transcript_text: nextConsultation?.transcript_text || '',
      ai_soap_note: {
        note_type: nextAiSoap.note_type || 'SOAP',
        subjective: nextAiSoap.subjective || '',
        objective: nextAiSoap.objective || '',
        assessment: nextAiSoap.assessment || '',
        plan: nextAiSoap.plan || '',
        draft_ai_note: typeof nextAiSoap.draft_ai_note === 'boolean' ? nextAiSoap.draft_ai_note : true,
        missing_information: nextAiSoap.missing_information || []
      },
      voiceNoteLanguage: 'auto',
      diagnosis: {
        primary: nextDiagnosis.primary || '',
        secondary: nextDiagnosis.secondary || [],
        notes: nextDiagnosis.notes || ''
      },
      secondaryDiagnosisInput: (nextDiagnosis.secondary || []).join(', '),
      treatmentPlan: nextConsultation?.treatmentPlan || '',
      followUp: {
        required: Boolean(nextFollowUp.required),
        date: nextFollowUp.date?.slice?.(0, 10) || nextFollowUp.date || '',
        notes: nextFollowUp.notes || ''
      }
    });
  };

  const loadConsultationById = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await getConsultation(consultationId);
      applyConsultationToState(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load consultation.');
    } finally {
      setLoading(false);
    }
  };

  const loadAppointmentWorkflow = async () => {
    setLoading(true);
    setError('');

    try {
      const consultationResponse = await getAppointmentConsultation(appointmentId);
      applyConsultationToState(consultationResponse.data);
      navigate(`/consultations/${consultationResponse.data.consultation._id}`, { replace: true });
    } catch (requestError) {
      if (requestError.response?.status !== 404) {
        setError(requestError.response?.data?.message || 'Unable to load consultation context.');
        setLoading(false);
        return;
      }

      try {
        const appointmentResponse = await appointmentApi.getAppointmentById(appointmentId);
        const nextAppointment = appointmentResponse.data.appointment;

        setAppointment(nextAppointment);
        setPatient(nextAppointment?.patientId || null);
        setDoctor(nextAppointment?.doctorId || null);
        setConsultation(null);
        setForm((current) => ({
          ...current,
          chiefComplaint: nextAppointment?.reasonForVisit || current.chiefComplaint
        }));
      } catch (fallbackError) {
        setError(fallbackError.response?.data?.message || 'Unable to load appointment context.');
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (consultationId) {
      loadConsultationById();
      return;
    }

    if (appointmentId) {
      loadAppointmentWorkflow();
      return;
    }

    setLoading(false);
  }, [appointmentId, consultationId]);

  const handleFieldChange = (path, value) => {
    setForm((current) => {
      const next = typeof structuredClone === 'function' ? structuredClone(current) : JSON.parse(JSON.stringify(current));
      const segments = path.split('.');
      let target = next;

      for (let index = 0; index < segments.length - 1; index += 1) {
        target = target[segments[index]];
      }

      target[segments[segments.length - 1]] = value;
      return next;
    });
  };

  const handleFormattedNoteChange = (field, value) => {
    handleFieldChange(`formattedClinicalNotes.${field}`, value);
  };

  const handleAiSoapNoteChange = (field, value) => {
    handleFieldChange(`ai_soap_note.${field}`, value);
  };

  const handleVitalsChange = (field, value) => {
    handleFieldChange(`vitals.${field}`, value);
  };

  const handleSymptomChange = (index, field, value) => {
    setForm((current) => ({
      ...current,
      symptoms: current.symptoms.map((symptom, symptomIndex) =>
        symptomIndex === index
          ? {
              ...symptom,
              [field]: value
            }
          : symptom
      )
    }));
  };

  const handleAddSymptom = () => {
    setForm((current) => ({
      ...current,
      symptoms: [...current.symptoms, createEmptySymptom()]
    }));
  };

  const handleRemoveSymptom = (index) => {
    setForm((current) => {
      const nextSymptoms = current.symptoms.filter((_, symptomIndex) => symptomIndex !== index);
      return {
        ...current,
        symptoms: nextSymptoms.length ? nextSymptoms : [createEmptySymptom()]
      };
    });
  };

  const buildPayload = (includeIdentifiers = false) => ({
    ...(includeIdentifiers
      ? {
          appointmentId: appointment?._id,
          patientId: patient?._id,
          doctorId: doctor?._id
        }
      : {}),
    chiefComplaint: form.chiefComplaint.trim(),
    symptoms: (form.symptoms || [])
      .map((symptom) => ({
        name: symptom.name.trim(),
        severity: symptom.severity || 'mild',
        duration: symptom.duration?.trim?.() || '',
        notes: symptom.notes?.trim?.() || ''
      }))
      .filter((symptom) => symptom.name),
    vitals: normalizeVitals(form.vitals),
    clinicalNotes: form.clinicalNotes.trim(),
    formattedClinicalNotes: form.formattedClinicalNotes,
    diagnosis: {
      primary: form.diagnosis.primary.trim(),
      secondary: parseCommaSeparated(form.secondaryDiagnosisInput),
      notes: form.diagnosis.notes.trim()
    },
    treatmentPlan: form.treatmentPlan.trim(),
    followUp: {
      required: Boolean(form.followUp.required),
      ...(form.followUp.date ? { date: form.followUp.date } : {}),
      notes: form.followUp.notes.trim()
    }
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (consultation?._id) {
        const response = await updateConsultation(consultation._id, buildPayload(false));
        applyConsultationToState({ consultation: response.data.consultation });
      } else {
        const response = await createConsultation(buildPayload(true));
        applyConsultationToState({ consultation: response.data.consultation });
        navigate(`/consultations/${response.data.consultation._id}`, { replace: true });
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save consultation.');
    } finally {
      setSaving(false);
    }
  };

  const handleRequestAi = async () => {
    if (!consultation?._id) {
      return;
    }

    setAiLoading(true);
    setError('');

    try {
      const response = await requestConsultationAiSuggestions(consultation._id, {
        includePatientHistory: true,
        includeVitals: true
      });
      applyConsultationToState({ consultation: response.data.consultation });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to request AI suggestions.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleReviewAi = async (payload) => {
    if (!consultation?._id) {
      return;
    }

    setReviewLoading(true);
    setError('');

    try {
      const response = await reviewConsultationAiSuggestions(consultation._id, payload);
      applyConsultationToState({ consultation: response.data.consultation });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save the AI review.');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleFormatNotes = async () => {
    if (!consultation?._id) {
      return;
    }

    setFormatting(true);
    setError('');

    try {
      const response = await formatConsultationNote(consultation._id, {
        rawNote: form.clinicalNotes || 'Not provided.',
        save: false,
        format: 'SOAP'
      });
      setForm((current) => ({
        ...current,
        formattedClinicalNotes: {
          subjective: response.data.formattedClinicalNotes?.subjective || '',
          objective: response.data.formattedClinicalNotes?.objective || '',
          assessment: response.data.formattedClinicalNotes?.assessment || '',
          plan: response.data.formattedClinicalNotes?.plan || ''
        }
      }));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to format the clinical note.');
    } finally {
      setFormatting(false);
    }
  };

  const handleUploadVoiceNote = async () => {
    if (!consultation?._id) {
      return;
    }

    setVoiceUploading(true);
    setError('');

    try {
      if (form.transcript_text && form.transcript_text.trim()) {
        const response = await formatClinicalNote(consultation._id, {
          rawNote: form.transcript_text,
          format: 'SOAP',
          save: true
        });
        applyConsultationToState({ consultation: response.data.consultation });
      } else if (selectedAudioFile) {
        const formData = new FormData();
        formData.append('file', selectedAudioFile);
        formData.append('language', form.voiceNoteLanguage || 'auto');
        const response = await uploadConsultationVoiceNote(consultation._id, formData);
        applyConsultationToState({ consultation: response.data.consultation });
      } else {
        throw new Error('Please record or choose an audio file first.');
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to process the voice note.');
    } finally {
      setVoiceUploading(false);
    }
  };

  const handleSaveAiDraftEdits = async () => {
    if (!consultation?._id) {
      return;
    }

    setAiDraftSaving(true);
    setError('');

    try {
      const response = await editConsultationAiNote(consultation._id, {
        transcript_text: form.transcript_text.trim(),
        ai_soap_note: {
          ...form.ai_soap_note,
          note_type: 'SOAP',
          draft_ai_note: true
        }
      });
      applyConsultationToState({ consultation: response.data.consultation });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save the AI draft edits.');
    } finally {
      setAiDraftSaving(false);
    }
  };

  const handleApproveAiNote = async () => {
    if (!consultation?._id) {
      return;
    }

    setAiDraftApproving(true);
    setError('');

    try {
      const response = await approveConsultationAiNote(consultation._id, {
        transcript_text: form.transcript_text.trim(),
        approved_note: {
          ...form.ai_soap_note,
          note_type: 'SOAP',
          draft_ai_note: false
        }
      });
      applyConsultationToState({ consultation: response.data.consultation });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to approve the AI draft note.');
    } finally {
      setAiDraftApproving(false);
    }
  };

  const handleRejectAiNote = async () => {
    if (!consultation?._id) {
      return;
    }

    setAiDraftRejecting(true);
    setError('');

    try {
      const response = await rejectConsultationAiNote(consultation._id, {});
      applyConsultationToState({ consultation: response.data.consultation });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to reject the AI draft note.');
    } finally {
      setAiDraftRejecting(false);
    }
  };

  const handleComplete = async () => {
    if (!consultation?._id) {
      return;
    }

    setCompleting(true);
    setError('');

    try {
      const response = await completeConsultation(consultation._id, {
        diagnosis: {
          primary: form.diagnosis.primary.trim(),
          secondary: parseCommaSeparated(form.secondaryDiagnosisInput),
          notes: form.diagnosis.notes.trim()
        },
        treatmentPlan: form.treatmentPlan.trim(),
        followUp: {
          required: Boolean(form.followUp.required),
          ...(form.followUp.date ? { date: form.followUp.date } : {}),
          notes: form.followUp.notes.trim()
        }
      });
      applyConsultationToState({ consultation: response.data.consultation });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to complete consultation.');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading consultation workspace..." />;
  }

  if (error && !patient && !appointment && !consultation) {
    return <ErrorState title="Consultation workspace unavailable" description={error} />;
  }

  return (
    <section className="grid gap-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Patient summary</p>
          <h1 className="mt-2 text-2xl font-semibold text-stone-900">{patient?.fullName || 'Patient not provided'}</h1>
          <dl className="mt-4 grid gap-3 text-sm text-stone-700 md:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-[0.16em] text-stone-500">Patient ID</dt>
              <dd className="mt-1 font-medium text-stone-900">{patient?.patientId || 'Not provided'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.16em] text-stone-500">Age / Gender</dt>
              <dd className="mt-1 font-medium text-stone-900">
                {[patient?.age ?? 'Not provided', patient?.gender || 'Not provided'].join(' / ')}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.16em] text-stone-500">Phone</dt>
              <dd className="mt-1 font-medium text-stone-900">{patient?.phone || 'Not provided'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.16em] text-stone-500">Known conditions</dt>
              <dd className="mt-1 font-medium text-stone-900">
                {patient?.chronicConditions?.join(', ') || 'Not provided'}
              </dd>
            </div>
          </dl>
          {patient?._id ? (
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                className="rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50"
                to={`/patients/${patient._id}`}
              >
                View patient profile
              </Link>
              <Link
                className="rounded-2xl border border-emerald-300 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                to={`/patients/${patient._id}/history`}
              >
                Open patient history
              </Link>
            </div>
          ) : null}
        </article>

        <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Appointment summary</p>
          <h2 className="mt-2 text-2xl font-semibold text-stone-900">{doctor?.fullName || 'Doctor not provided'}</h2>
          <dl className="mt-4 grid gap-3 text-sm text-stone-700 md:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-[0.16em] text-stone-500">Appointment date</dt>
              <dd className="mt-1 font-medium text-stone-900">{appointment?.appointmentDate?.slice?.(0, 10) || 'Not provided'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.16em] text-stone-500">Time</dt>
              <dd className="mt-1 font-medium text-stone-900">{`${appointment?.startTime || '--'} - ${appointment?.endTime || '--'}`}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.16em] text-stone-500">Appointment status</dt>
              <dd className="mt-1 font-medium text-stone-900">{appointment?.status?.replaceAll('_', ' ') || 'Not provided'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.16em] text-stone-500">Doctor code</dt>
              <dd className="mt-1 font-medium text-stone-900">{doctor?.doctorCode || 'Not provided'}</dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              className="rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50"
              to={`/appointments/${appointment?._id || appointmentId}`}
            >
              Back to appointment
            </Link>
            {consultation?._id && patient?._id ? (
              <Link
                className="rounded-2xl border border-emerald-300 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                to={`/prescriptions/new?patientId=${patient._id}&consultationId=${consultation._id}`}
              >
                Create prescription
              </Link>
            ) : null}
            {consultation?._id ? (
              <Link
                className="rounded-2xl border border-sky-300 px-4 py-3 text-sm font-semibold text-sky-700 hover:bg-sky-50"
                to={`/prescriptions?consultationId=${consultation._id}`}
              >
                View prescriptions
              </Link>
            ) : null}
            {consultation?._id && patient?._id ? (
              <Link
                className="rounded-2xl border border-amber-300 px-4 py-3 text-sm font-semibold text-amber-700 hover:bg-amber-50"
                to={`/billing/create?patientId=${patient._id}&consultationId=${consultation._id}&appointmentId=${appointment?._id || appointmentId}`}
              >
                Create invoice
              </Link>
            ) : null}
            {consultation?._id ? (
              <Link
                className="rounded-2xl border border-violet-300 px-4 py-3 text-sm font-semibold text-violet-700 hover:bg-violet-50"
                to={`/consultations/${consultation._id}/labs/new`}
              >
                Order labs
              </Link>
            ) : null}
            {patient?._id ? (
              <Link
                className="rounded-2xl border border-cyan-300 px-4 py-3 text-sm font-semibold text-cyan-700 hover:bg-cyan-50"
                to={`/patients/${patient._id}/labs`}
              >
                View lab history
              </Link>
            ) : null}
          </div>
        </article>
      </div>

      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="grid gap-6">
          <VoiceNotePanel
            consultation={consultation}
            form={form}
            selectedAudioName={selectedAudioFile?.name || ''}
            voiceUploading={voiceUploading}
            aiDraftSaving={aiDraftSaving}
            aiDraftApproving={aiDraftApproving}
            aiDraftRejecting={aiDraftRejecting}
            onAudioSelected={setSelectedAudioFile}
            onLanguageChange={(value) => handleFieldChange('voiceNoteLanguage', value)}
            onTranscriptChange={(value) => handleFieldChange('transcript_text', value)}
            onAiNoteFieldChange={handleAiSoapNoteChange}
            onUpload={handleUploadVoiceNote}
            onSaveDraftEdits={handleSaveAiDraftEdits}
            onApprove={handleApproveAiNote}
            onReject={handleRejectAiNote}
          />

          <ConsultationForm
            form={form}
            error={error}
            saving={saving}
            formatting={formatting}
            aiLoading={aiLoading}
            completing={completing}
            isExistingConsultation={Boolean(consultation?._id)}
            onFieldChange={handleFieldChange}
            onVitalsChange={handleVitalsChange}
            onSymptomChange={handleSymptomChange}
            onAddSymptom={handleAddSymptom}
            onRemoveSymptom={handleRemoveSymptom}
            onFormattedNoteChange={handleFormattedNoteChange}
            onSubmit={handleSubmit}
            onFormatNotes={handleFormatNotes}
            onRequestAi={handleRequestAi}
            onComplete={handleComplete}
          />

          <ConsultationHistory patientId={patient?._id} compact title="Patient clinical history" />
        </div>

        <AiSuggestionsPanel
          consultationId={consultation?._id}
          aiSuggestions={consultation?.aiSuggestions}
          aiReview={consultation?.aiReview}
          aiLoading={aiLoading}
          reviewLoading={reviewLoading}
          onRequestSuggestions={handleRequestAi}
          onReview={handleReviewAi}
        />
      </div>
    </section>
  );
};

export default ConsultationPage;
