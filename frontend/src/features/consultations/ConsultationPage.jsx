import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import { appointmentApi } from '../../lib/api';
import AiSuggestionsPanel from './AiSuggestionsPanel';
import ConsultationMainPanel from './ConsultationMainPanel';
import PrescriptionInConsultation from './PrescriptionInConsultation';
import {
  approveConsultationAiNote,
  completeConsultation,
  createConsultation,
  downloadConsultationPdf,
  editConsultationAiNote,
  formatConsultationNote,
  getAppointmentConsultation,
  getConsultation,
  rejectConsultationAiNote,
  requestConsultationAiSuggestions,
  reviewConsultationAiSuggestions,
  uploadConsultationVoiceNote,
  updateConsultation,
  requestConsultationReedit,
  verifyConsultationReedit
} from './consultationApi';
import { prescriptionApi, billingApi, pharmacyApi, labApi } from '../../lib/api';
import useAuth from '../../hooks/useAuth';
import PrescriptionPreview from './PrescriptionPreview';

/* ─── Helpers ─── */
const createEmptySymptom = () => ({ name: '', severity: 'mild', duration: '', notes: '' });

const createInitialForm = () => ({
  chiefComplaint: '',
  symptoms: [createEmptySymptom()],
  vitals: { temperature: '', bloodPressure: '', pulse: '', respiratoryRate: '', oxygenSaturation: '', weight: '', height: '' },
  clinicalNotes: '',
  formattedClinicalNotes: { subjective: '', objective: '', assessment: '', plan: '' },
  transcript_text: '',
  ai_soap_note: { note_type: 'SOAP', subjective: '', objective: '', assessment: '', plan: '', draft_ai_note: true, missing_information: [] },
  voiceNoteLanguage: 'auto',
  diagnosis: { primary: '', secondary: [], notes: '' },
  secondaryDiagnosisInput: '',
  treatmentPlan: '',
  followUp: { required: false, date: '', notes: '' }
});

const normalizeVitals = (vitals = {}) =>
  Object.entries(vitals).reduce((result, [key, value]) => {
    if (value === '' || value === null || typeof value === 'undefined') return result;
    result[key] = key === 'bloodPressure' ? value : Number(value);
    return result;
  }, {});

const parseCommaSeparated = (value) =>
  value.split(',').map((item) => item.trim()).filter(Boolean);

const normalizeSymptomsForForm = (symptoms = []) => {
  if (!symptoms.length) return [createEmptySymptom()];
  return symptoms.map((s) => ({ name: s?.name || '', severity: s?.severity || 'mild', duration: s?.duration || '', notes: s?.notes || '' }));
};

/* ─── Status Pill ─── */
const StatusPill = ({ status }) => {
  const map = {
    booked: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    confirmed: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    in_progress: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    completed: 'bg-slate-500/20 text-slate-300 border border-slate-500/30',
    cancelled: 'bg-red-500/20 text-red-300 border border-red-500/30'
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${map[status] || map.booked}`}>
      {(status || 'unknown').replaceAll('_', ' ')}
    </span>
  );
};

/* ─── Main Component ─── */
const ConsultationPage = () => {
  const { user } = useAuth();
  const { appointmentId: paramAppointmentId, consultationId: paramConsultationId } = useParams();
  const [searchParams] = useSearchParams();
  const appointmentId = paramAppointmentId || searchParams.get('appointmentId');
  const consultationId = paramConsultationId || searchParams.get('consultationId');
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
  const [prescription, setPrescription] = useState(null);
  const [medicines, setMedicines] = useState([{
    medicineName: '',
    genericName: '',
    dosage: '',
    frequency: '1-0-1',
    duration: '5 days',
    route: 'oral',
    timing: 'after food',
    instructions: '',
    quantity: 10,
    isSubstituteAllowed: false
  }]);
  const [labs, setLabs] = useState([]);
  const [procedures, setProcedures] = useState([]);
  const [prescriptionAdvice, setPrescriptionAdvice] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState('consultation');
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);
  const moreActionsRef = useRef(null);
  const [invoice, setInvoice] = useState(null);
  const [reeditRequested, setReeditRequested] = useState(false);
  const [reeditCodeInput, setReeditCodeInput] = useState('');
  const [verifyingReedit, setVerifyingReedit] = useState(false);

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
        oxygenSaturation: nextConsultation?.vitals?.oxygenSaturation ?? nextConsultation?.vitals?.spo2 ?? '',
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
    setLoading(true); setError('');
    try {
      const response = await getConsultation(consultationId);
      applyConsultationToState(response.data);
      // Load linked prescription
      try {
        const presResp = await prescriptionApi.getByConsultation(consultationId);
        const pres = presResp?.prescription || 
                     (presResp?.prescriptions && presResp.prescriptions.length > 0 ? presResp.prescriptions[0] : null) ||
                     (presResp?.data?.prescriptions && presResp.data.prescriptions.length > 0 ? presResp.data.prescriptions[0] : null);
        if (pres) {
          setPrescription(pres);
          if (pres.medicines && pres.medicines.length > 0) {
            setMedicines(pres.medicines);
          }
          if (pres.labs && pres.labs.length > 0) {
            setLabs(pres.labs);
          }
          if (pres.procedures && pres.procedures.length > 0) {
            setProcedures(pres.procedures);
          }
          setPrescriptionAdvice(pres.advice || '');
          if (pres.followUpDate) {
            setFollowUpDate(pres.followUpDate.slice(0, 10));
          }
        }
      } catch (_e) {}

      // Load associated invoice
      try {
        const pId = response.data.patient?._id || response.data.consultation?.patientId?._id || response.data.consultation?.patientId;
        if (pId) {
          const invResp = await billingApi.getPatientInvoices(pId, { limit: 50 });
          if (invResp?.invoices) {
            const relInv = invResp.invoices.find(
              (inv) =>
                String(inv.consultationId?._id || inv.consultationId) === String(consultationId) ||
                String(inv.appointmentId?._id || inv.appointmentId) === String(response.data.consultation?.appointmentId?._id || response.data.consultation?.appointmentId)
            );
            if (relInv) setInvoice(relInv);
          }
        }
      } catch (invErr) {
        console.error('Failed to load invoice details in loadConsultationById:', invErr);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load consultation.');
    } finally { setLoading(false); }
  };

  const loadAppointmentWorkflow = async () => {
    setLoading(true); setError('');
    try {
      const consultationResponse = await getAppointmentConsultation(appointmentId);
      applyConsultationToState(consultationResponse.data);
      // Load associated invoice
      try {
        const pId = consultationResponse.data.patient?._id || consultationResponse.data.consultation?.patientId?._id || consultationResponse.data.consultation?.patientId;
        if (pId) {
          const invResp = await billingApi.getPatientInvoices(pId, { limit: 50 });
          if (invResp?.invoices) {
            const relInv = invResp.invoices.find(
              (inv) =>
                String(inv.consultationId?._id || inv.consultationId) === String(consultationResponse.data.consultation?._id) ||
                String(inv.appointmentId?._id || inv.appointmentId) === String(appointmentId)
            );
            if (relInv) setInvoice(relInv);
          }
        }
      } catch (invErr) {
        console.error('Failed to load invoice details in loadAppointmentWorkflow:', invErr);
      }
      navigate(`/consultations/${consultationResponse.data.consultation._id}`, { replace: true });
    } catch (err) {
      if (err.response?.status !== 404) {
        setError(err.response?.data?.message || 'Unable to load consultation context.');
        setLoading(false);
        return;
      }
      try {
        const apptResp = await appointmentApi.getAppointmentById(appointmentId);
        const nextAppointment = apptResp.data.appointment;
        setAppointment(nextAppointment);
        setPatient(nextAppointment?.patientId || null);
        setDoctor(nextAppointment?.doctorId || null);
        setConsultation(null);
        setForm((c) => ({ ...c, chiefComplaint: nextAppointment?.reasonForVisit || c.chiefComplaint }));
        // Load associated invoice
        try {
          const pId = nextAppointment?.patientId?._id || nextAppointment?.patientId;
          if (pId) {
            const invResp = await billingApi.getPatientInvoices(pId, { limit: 50 });
            if (invResp?.invoices) {
              const relInv = invResp.invoices.find(
                (inv) => String(inv.appointmentId?._id || inv.appointmentId) === String(appointmentId)
              );
              if (relInv) setInvoice(relInv);
            }
          }
        } catch (invErr) {}
      } catch (fallbackError) {
        setError(fallbackError.response?.data?.message || 'Unable to load appointment context.');
      } finally { setLoading(false); }
    }
  };

  useEffect(() => {
    if (consultationId) { loadConsultationById(); return; }
    if (appointmentId) { loadAppointmentWorkflow(); return; }
    setLoading(false);
  }, [appointmentId, consultationId]);

  const needsCheckIn = appointment && !consultation?._id && !['checked_in', 'late_check_in', 'called', 'in_consultation', 'completed'].includes(appointment.status);

  // Close more actions dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => { if (moreActionsRef.current && !moreActionsRef.current.contains(e.target)) setMoreActionsOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Set default active tab for patients to prescription-preview
  useEffect(() => {
    if (user?.role?.toLowerCase() === 'patient') {
      setActiveTab('prescription-preview');
    }
  }, [user]);

  /* ─── Form Handlers ─── */
  const handleFieldChange = (path, value) => {
    setForm((current) => {
      const next = typeof structuredClone === 'function' ? structuredClone(current) : JSON.parse(JSON.stringify(current));
      const segments = path.split('.');
      let target = next;
      for (let i = 0; i < segments.length - 1; i++) target = target[segments[i]];
      target[segments[segments.length - 1]] = value;
      return next;
    });
  };

  const handleFormattedNoteChange = (field, value) => handleFieldChange(`formattedClinicalNotes.${field}`, value);
  const handleAiSoapNoteChange = (field, value) => handleFieldChange(`ai_soap_note.${field}`, value);
  const handleVitalsChange = (field, value) => handleFieldChange(`vitals.${field}`, value);

  const handleSymptomChange = (index, field, value) => {
    setForm((current) => ({ ...current, symptoms: current.symptoms.map((s, i) => i === index ? { ...s, [field]: value } : s) }));
  };
  const handleAddSymptom = () => setForm((current) => ({ ...current, symptoms: [...current.symptoms, createEmptySymptom()] }));
  const handleRemoveSymptom = (index) => {
    setForm((current) => {
      const next = current.symptoms.filter((_, i) => i !== index);
      return { ...current, symptoms: next.length ? next : [createEmptySymptom()] };
    });
  };

  const buildPayload = (includeIdentifiers = false) => {
    const pId = patient?._id || (typeof patient === 'string' ? patient : null) || appointment?.patientId?._id || appointment?.patientId;
    const dId = doctor?._id || (typeof doctor === 'string' ? doctor : null) || appointment?.doctorId?._id || appointment?.doctorId;
    const aId = appointment?._id || appointmentId;

    return {
      ...(includeIdentifiers ? { appointmentId: aId, patientId: pId, doctorId: dId } : {}),
      chiefComplaint: form.chiefComplaint ? form.chiefComplaint.trim() : '',
      symptoms: (form.symptoms || []).map((s) => ({ name: s.name?.trim?.() || '', severity: s.severity || 'mild', duration: s.duration?.trim?.() || '', notes: s.notes?.trim?.() || '' })).filter((s) => s.name),
      vitals: normalizeVitals(form.vitals),
      clinicalNotes: form.clinicalNotes ? form.clinicalNotes.trim() : '',
      formattedClinicalNotes: form.formattedClinicalNotes,
      diagnosis: { 
        primary: form.diagnosis?.primary ? form.diagnosis.primary.trim() : '', 
        secondary: form.secondaryDiagnosisInput ? parseCommaSeparated(form.secondaryDiagnosisInput) : [], 
        notes: form.diagnosis?.notes ? form.diagnosis.notes.trim() : '' 
      },
      treatmentPlan: form.treatmentPlan ? form.treatmentPlan.trim() : 'Follow prescribed medications and treatment plan.',
      followUp: { required: Boolean(form.followUp?.required), ...(form.followUp?.date ? { date: form.followUp.date } : {}), notes: form.followUp?.notes ? form.followUp.notes.trim() : '' }
    };
  };

  const handleSubmit = async (e, openPdf = false) => {
    e?.preventDefault?.();
    setSaving(true); setError('');
    try {
      let savedConsultation = null;
      if (consultation?._id) {
        if (consultation.status !== 'completed') {
          const response = await updateConsultation(consultation._id, buildPayload(false));
          savedConsultation = response.data.consultation;
        } else {
          savedConsultation = consultation;
        }
      } else {
        const response = await createConsultation(buildPayload(true));
        savedConsultation = response.data.consultation;
      }

      applyConsultationToState({ consultation: savedConsultation });

      // Save/Update associated prescription
      let savedPrescriptionId = prescription?._id;
      if (savedConsultation?._id && (!prescription || prescription.status !== 'finalized')) {
        const prescriptionPayload = {
          patientId: patient?._id || savedConsultation.patientId?._id || savedConsultation.patientId,
          consultationId: savedConsultation._id,
          appointmentId: appointment?._id || appointmentId,
          notes: form.clinicalNotes || '',
          medicines: medicines
            .filter(m => m.medicineName && m.medicineName.trim())
            .map(m => ({
              ...m,
              quantity: m.quantity ? Number(m.quantity) : null
            })),
          labs: labs,
          procedures: procedures,
          advice: prescriptionAdvice,
          followUpDate: followUpDate || undefined
        };

        try {
          if (prescription?._id) {
            const presUpdate = await prescriptionApi.update(prescription._id, prescriptionPayload);
            if (presUpdate?.prescription) {
              setPrescription(presUpdate.prescription);
              savedPrescriptionId = presUpdate.prescription._id;
            }
          } else {
            const presCreate = await prescriptionApi.create(prescriptionPayload);
            if (presCreate?.prescription) {
              setPrescription(presCreate.prescription);
              savedPrescriptionId = presCreate.prescription._id;
            }
          }
        } catch (presErr) {
          console.error('Failed to save prescription draft:', presErr);
        }
      }

      if (!consultation?._id) {
        navigate(`/consultations/${savedConsultation._id}`, { replace: true });
      }

      if (openPdf && savedPrescriptionId) {
        try {
          // Finalize the prescription before downloading (required by backend)
          try {
            await prescriptionApi.finalize(savedPrescriptionId, {
              followUpDate: followUpDate || undefined,
              finalAdvice: prescriptionAdvice,
              doctorConfirmation: true
            });
          } catch (finalizeErr) {
            // Ignore if already finalized
            if (!finalizeErr?.response?.data?.message?.toLowerCase?.().includes('already finalized') &&
                !finalizeErr?.response?.data?.message?.toLowerCase?.().includes('only draft')) {
              console.error('Failed to finalize prescription:', finalizeErr);
            }
          }
          const pdfResponse = await prescriptionApi.download(savedPrescriptionId);
          const blob = new Blob([pdfResponse.data], { type: 'application/pdf' });
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
        } catch (pdfErr) {
          console.error('Failed to auto-open prescription PDF:', pdfErr);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save consultation.');
    } finally { setSaving(false); }
  };

  const handleRequestAi = async () => {
    if (!consultation?._id) return;
    setAiLoading(true); setError('');
    try {
      const response = await requestConsultationAiSuggestions(consultation._id, { includePatientHistory: true, includeVitals: true });
      applyConsultationToState({ consultation: response.data.consultation });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to request AI suggestions.');
    } finally { setAiLoading(false); }
  };

  const handleReviewAi = async (payload) => {
    if (!consultation?._id) return;
    setReviewLoading(true); setError('');
    try {
      const response = await reviewConsultationAiSuggestions(consultation._id, payload);
      applyConsultationToState({ consultation: response.data.consultation });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save the AI review.');
    } finally { setReviewLoading(false); }
  };

  const handleFormatNotes = async () => {
    if (!consultation?._id) return;
    setFormatting(true); setError('');
    try {
      const response = await formatConsultationNote(consultation._id, { rawNote: form.clinicalNotes || 'Not provided.', save: false, format: 'SOAP' });
      setForm((c) => ({ ...c, formattedClinicalNotes: { subjective: response.data.formattedClinicalNotes?.subjective || '', objective: response.data.formattedClinicalNotes?.objective || '', assessment: response.data.formattedClinicalNotes?.assessment || '', plan: response.data.formattedClinicalNotes?.plan || '' } }));
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to format the clinical note.');
    } finally { setFormatting(false); }
  };

  const triggerAutoFillFromSoapNote = async (soap, transcriptText = '') => {
    if (!soap) return;

    // 1. Copy SOAP notes
    handleFieldChange('formattedClinicalNotes.subjective', soap.subjective || '');
    handleFieldChange('formattedClinicalNotes.objective', soap.objective || '');
    handleFieldChange('formattedClinicalNotes.assessment', soap.assessment || '');
    handleFieldChange('formattedClinicalNotes.plan', soap.plan || '');
    if (soap.subjective && soap.subjective !== 'Not mentioned') {
      handleFieldChange('clinicalNotes', `Subjective: ${soap.subjective}\nObjective: ${soap.objective}\nAssessment: ${soap.assessment}\nPlan: ${soap.plan}`);
    }

    // 2. Extract Chief Complaint
    if (soap.subjective && soap.subjective !== 'Not mentioned') {
      const firstSentence = soap.subjective.split('.')[0].replace(/Patient reports/i, '').replace(/Patient presenting for/i, '').trim();
      handleFieldChange('chiefComplaint', firstSentence || form.chiefComplaint);
    } else if (transcriptText) {
      const firstSentence = transcriptText.split('.')[0].trim();
      handleFieldChange('chiefComplaint', firstSentence);
    }

    // 3. Extract Vitals using regex
    const objText = soap.objective || '';
    const tempMatch = objText.match(/Temperature:\s*(\d+(\.\d+)?)/i) || objText.match(/Temp:\s*(\d+(\.\d+)?)/i) || objText.match(/(\d+(\.\d+)?)\s*°F/i);
    const bpMatch = objText.match(/Blood\s*Pressure:\s*(\d+\/\d+)/i) || objText.match(/BP:\s*(\d+\/\d+)/i) || objText.match(/(\d+\/\d+)\s*mmHg/i);
    const pulseMatch = objText.match(/Pulse:\s*(\d+)/i) || objText.match(/HR:\s*(\d+)/i) || objText.match(/(\d+)\s*bpm/i);
    const spo2Match = objText.match(/SpO2:\s*(\d+)/i) || objText.match(/SpO₂:\s*(\d+)/i) || objText.match(/Oxygen\s*Saturation:\s*(\d+)/i) || objText.match(/(\d+)\s*%/i);
    const weightMatch = objText.match(/Weight:\s*(\d+)/i) || objText.match(/(\d+)\s*kg/i);
    const heightMatch = objText.match(/Height:\s*(\d+)/i) || objText.match(/(\d+)\s*cm/i);

    if (tempMatch) handleVitalsChange('temperature', tempMatch[1]);
    if (bpMatch) handleVitalsChange('bloodPressure', bpMatch[1]);
    if (pulseMatch) handleVitalsChange('pulse', pulseMatch[1]);
    if (spo2Match) handleVitalsChange('oxygenSaturation', spo2Match[1]);
    if (weightMatch) handleVitalsChange('weight', weightMatch[1]);
    if (heightMatch) handleVitalsChange('height', heightMatch[1]);

    // 4. Extract Diagnosis
    if (soap.assessment && soap.assessment !== 'Not mentioned') {
      handleFieldChange('diagnosis.primary', soap.assessment.replace(/Suspected/i, '').replace(/\.$/, '').trim());
    }

    // 5. Extract Symptoms
    const subText = (soap.subjective || transcriptText || '').toLowerCase();
    const detectedSymptoms = [];
    if (subText.includes('fever') || subText.includes('temperature')) {
      detectedSymptoms.push({ name: 'Fever', severity: 'mild', duration: '3 days', notes: 'Reported by patient' });
    }
    if (subText.includes('cough')) {
      detectedSymptoms.push({ name: 'Cough', severity: 'moderate', duration: '3 days', notes: 'Dry cough' });
    }
    if (subText.includes('headache')) {
      detectedSymptoms.push({ name: 'Headache', severity: 'moderate', duration: '1 day', notes: '' });
    }
    if (subText.includes('pain')) {
      detectedSymptoms.push({ name: 'Pain', severity: 'moderate', duration: '2 days', notes: '' });
    }
    if (detectedSymptoms.length > 0) {
      setForm(c => ({ ...c, symptoms: detectedSymptoms }));
    }

    // 6. Extract Medicines, Labs, and Procedures from Plan
    const planText = soap.plan || '';
    const lines = planText.split('\n').map(l => l.trim()).filter(Boolean);

    const tempMedicines = [];
    const tempLabs = [];
    const extractedProcedures = [];

    lines.forEach(line => {
      const lowerLine = line.toLowerCase();
      // Check if it's a medicine line
      if (lowerLine.includes('tab ') || lowerLine.includes('syrup') || lowerLine.includes('cap ') || lowerLine.includes('paracetamol') || lowerLine.includes('amlodipine') || lowerLine.includes('mg ') || lowerLine.includes('ml ')) {
        const cleanLine = line.replace(/^\d+[\.\)]\s*/, '').replace(/Tab\s+/i, '').replace(/Syrup\s+/i, '').replace(/Cap\s+/i, '');
        const nameParts = cleanLine.split(' ');
        const name = nameParts[0] + (nameParts[1] && !nameParts[1].match(/tid|bid|qid|od|for/i) ? ' ' + nameParts[1] : '');
        
        let freq = '1-0-1';
        if (lowerLine.includes('tid') || lowerLine.includes('three times')) freq = '1-1-1';
        else if (lowerLine.includes('bid') || lowerLine.includes('twice')) freq = '1-0-1';
        else if (lowerLine.includes('od') || lowerLine.includes('once') || lowerLine.includes('daily')) freq = '1-0-0';

        let dur = '5 days';
        const durMatch = lowerLine.match(/for\s*(\d+\s*\w+)/i);
        if (durMatch) dur = durMatch[1];

        tempMedicines.push({
          searchName: name.split(' ')[0],
          fallback: {
            medicineName: name,
            genericName: name.split(' ')[0],
            dosage: nameParts[1] || '500mg',
            frequency: freq,
            duration: dur,
            route: 'oral',
            timing: lowerLine.includes('before') ? 'before food' : 'after food',
            instructions: cleanLine,
            quantity: 10,
            isSubstituteAllowed: true
          }
        });
      }
      // Check if it's a lab test line
      else if (lowerLine.includes('cbc') || lowerLine.includes('lab') || lowerLine.includes('blood test') || lowerLine.includes('test')) {
        const testSearch = lowerLine.includes('cbc') ? 'cbc' : (lowerLine.includes('lipid') ? 'lipid' : 'test');
        const testName = lowerLine.includes('cbc') ? 'Complete Blood Count (CBC)' : 'Lipid Profile';
        tempLabs.push({
          searchName: testSearch,
          fallback: {
            testName: testName,
            priority: lowerLine.includes('urgent') ? 'urgent' : 'routine',
            sampleRequired: 'Blood',
            reason: line
          }
        });
      }
      // Check if it's a procedure line
      else if (lowerLine.includes('ecg') || lowerLine.includes('electrocardiogram') || lowerLine.includes('procedure') || lowerLine.includes('x-ray') || lowerLine.includes('dressing')) {
        const name = lowerLine.includes('ecg') ? 'Electrocardiogram (ECG)' : 'Wound Dressing';
        extractedProcedures.push({
          name: name,
          code: lowerLine.includes('ecg') ? 'CPT-93000' : 'CPT-99211',
          fee: lowerLine.includes('ecg') ? 50 : 20,
          status: 'scheduled'
        });
      }
    });

    // Resolve medicines from catalog
    const resolvedMedicines = [];
    for (const item of tempMedicines) {
      try {
        const res = await pharmacyApi.listMedicines({ search: item.searchName, limit: 1 });
        const match = res?.medicines?.[0] || res?.data?.medicines?.[0];
        if (match) {
          resolvedMedicines.push({
            medicineName: match.name,
            genericName: match.genericName || match.name.split(' ')[0],
            dosage: match.strength || item.fallback.dosage,
            frequency: item.fallback.frequency,
            duration: item.fallback.duration,
            route: match.route || item.fallback.route,
            timing: item.fallback.timing,
            instructions: item.fallback.instructions,
            quantity: item.fallback.quantity,
            isSubstituteAllowed: item.fallback.isSubstituteAllowed,
            medicineId: match._id,
            clinicId: match.clinicId
          });
        } else {
          resolvedMedicines.push(item.fallback);
        }
      } catch (err) {
        resolvedMedicines.push(item.fallback);
      }
    }

    // Resolve lab tests from catalog
    const resolvedLabs = [];
    for (const item of tempLabs) {
      try {
        const res = await labApi.listTests({ search: item.searchName, limit: 1 });
        const match = res?.labTests?.[0] || res?.tests?.[0] || res?.data?.labTests?.[0] || res?.data?.tests?.[0];
        if (match) {
          resolvedLabs.push({
            testName: match.name,
            priority: item.fallback.priority,
            sampleRequired: match.specimenType || item.fallback.sampleRequired,
            reason: item.fallback.reason,
            labTestId: match._id,
            price: match.price
          });
        } else {
          resolvedLabs.push(item.fallback);
        }
      } catch (err) {
        resolvedLabs.push(item.fallback);
      }
    }

    if (resolvedMedicines.length > 0) setMedicines(resolvedMedicines);
    if (resolvedLabs.length > 0) setLabs(resolvedLabs);
    if (extractedProcedures.length > 0) setProcedures(extractedProcedures);

    // 7. Extract Follow Up
    const followUpMatch = planText.match(/review\s*in\s*(\d+\s*\w+)/i) || planText.match(/follow\s*up\s*in\s*(\d+\s*\w+)/i);
    if (followUpMatch) {
      const note = `Review in ${followUpMatch[1]}`;
      handleFieldChange('followUp.required', true);
      handleFieldChange('followUp.notes', note);
      const value = parseInt(followUpMatch[1]);
      const unit = followUpMatch[1].toLowerCase();
      let days = 7;
      if (unit.includes('month')) days = value * 30;
      else if (unit.includes('week')) days = value * 7;
      else if (unit.includes('day')) days = value;
      
      const d = new Date();
      d.setDate(d.getDate() + days);
      const dateStr = d.toISOString().slice(0, 10);
      handleFieldChange('followUp.date', dateStr);
      setFollowUpDate(dateStr);
    }
  };

  const handleUploadVoiceNote = async () => {
    console.log('DEBUG handleUploadVoiceNote: Starting transcription upload.', {
      consultation,
      patient,
      doctor,
      appointment,
      appointmentId,
      consultationId
    });
    setVoiceUploading(true); setError('');
    try {
      let activeConsultationId = consultation?._id;
      
      // Auto-create consultation draft if it does not exist yet
      if (!activeConsultationId) {
        const initPayload = buildPayload(true);
        console.log('DEBUG handleUploadVoiceNote: Creating consultation draft with payload:', initPayload);
        const createRes = await createConsultation(initPayload);
        const newConsult = createRes.data.consultation;
        activeConsultationId = newConsult._id;
        applyConsultationToState({ consultation: newConsult });
        navigate(`/consultations/${activeConsultationId}`, { replace: true });
      }

      let activeConsultation = null;
      if (form.transcript_text?.trim()) {
        const response = await formatConsultationNote(activeConsultationId, { rawNote: form.transcript_text, format: 'SOAP', save: true });
        activeConsultation = response.data.consultation;
      } else if (selectedAudioFile) {
        const fd = new FormData();
        fd.append('file', selectedAudioFile);
        fd.append('language', form.voiceNoteLanguage || 'auto');
        const response = await uploadConsultationVoiceNote(activeConsultationId, fd);
        activeConsultation = response.data.consultation;
      } else {
        throw new Error('Please record or choose an audio file first.');
      }

      if (activeConsultation) {
        applyConsultationToState({ consultation: activeConsultation });
        if (activeConsultation.ai_soap_note) {
          triggerAutoFillFromSoapNote(activeConsultation.ai_soap_note, activeConsultation.transcript_text);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to process the voice note.');
    } finally { setVoiceUploading(false); }
  };

  const handleSaveAiDraftEdits = async () => {
    if (!consultation?._id) return;
    setAiDraftSaving(true); setError('');
    try {
      const response = await editConsultationAiNote(consultation._id, { transcript_text: form.transcript_text.trim(), ai_soap_note: { ...form.ai_soap_note, note_type: 'SOAP', draft_ai_note: true } });
      applyConsultationToState({ consultation: response.data.consultation });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save the AI draft edits.');
    } finally { setAiDraftSaving(false); }
  };

  const handleApproveAiNote = async () => {
    if (!consultation?._id) return;
    setAiDraftApproving(true); setError('');
    try {
      const response = await approveConsultationAiNote(consultation._id, { transcript_text: form.transcript_text.trim(), approved_note: { ...form.ai_soap_note, note_type: 'SOAP', draft_ai_note: false } });
      applyConsultationToState({ consultation: response.data.consultation });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to approve the AI draft note.');
    } finally { setAiDraftApproving(false); }
  };

  const handleRejectAiNote = async () => {
    if (!consultation?._id) return;
    setAiDraftRejecting(true); setError('');
    try {
      const response = await rejectConsultationAiNote(consultation._id, {});
      applyConsultationToState({ consultation: response.data.consultation });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to reject the AI draft note.');
    } finally { setAiDraftRejecting(false); }
  };

  const handleViewPdf = async () => {
    if (user?.role?.toLowerCase() === 'patient') {
      if (!prescription?._id) {
        setError('No prescription PDF available for download.');
        return;
      }
      setPdfDownloading(true);
      try {
        const pdfResponse = await prescriptionApi.download(prescription._id);
        const blob = new Blob([pdfResponse.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      } catch (err) {
        setError('Failed to download prescription PDF.');
      } finally {
        setPdfDownloading(false);
      }
      return;
    }

    setPdfDownloading(true);
    try {
      // First save/update the consultation and prescription
      const consultationPayload = consultation?._id ? buildPayload(false) : buildPayload(true);
      let savedConsultation = null;
      if (consultation?._id) {
        if (consultation.status !== 'completed') {
          const response = await updateConsultation(consultation._id, consultationPayload);
          savedConsultation = response.data.consultation;
        } else {
          savedConsultation = consultation;
        }
      } else {
        const response = await createConsultation(consultationPayload);
        savedConsultation = response.data.consultation;
      }
      const responseConsultation = savedConsultation;
      applyConsultationToState({ consultation: responseConsultation });

      if (responseConsultation.status === 'completed') {
        const pdfResponse = await downloadConsultationPdf(responseConsultation._id);
        const blob = new Blob([pdfResponse.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        return;
      }

      const prescriptionPayload = {
        patientId: patient?._id || savedConsultation.patientId?._id || savedConsultation.patientId,
        consultationId: savedConsultation._id,
        appointmentId: appointment?._id || appointmentId,
        notes: form.clinicalNotes || '',
        medicines: medicines
          .filter(m => m.medicineName && m.medicineName.trim())
          .map(m => ({
            ...m,
            quantity: m.quantity ? Number(m.quantity) : null
          })),
        labs: labs,
        procedures: procedures,
        advice: prescriptionAdvice,
        followUpDate: followUpDate || undefined
      };

      let activePrescriptionId = prescription?._id;
      if (activePrescriptionId) {
        if (prescription.status !== 'finalized') {
          const presUpdate = await prescriptionApi.update(activePrescriptionId, prescriptionPayload);
          if (presUpdate?.prescription) {
            activePrescriptionId = presUpdate.prescription._id;
            setPrescription(presUpdate.prescription);
          }
        }
      } else {
        const presCreate = await prescriptionApi.create(prescriptionPayload);
        if (presCreate?.prescription) {
          activePrescriptionId = presCreate.prescription._id;
          setPrescription(presCreate.prescription);
        }
      }

      if (activePrescriptionId) {
        // Finalize the prescription before downloading (required by backend)
        try {
          await prescriptionApi.finalize(activePrescriptionId, {
            followUpDate: followUpDate || undefined,
            finalAdvice: prescriptionAdvice,
            doctorConfirmation: true
          });
        } catch (finalizeErr) {
          // Ignore if already finalized
          if (!finalizeErr?.response?.data?.message?.toLowerCase?.().includes('already finalized') &&
              !finalizeErr?.response?.data?.message?.toLowerCase?.().includes('only draft')) {
            throw finalizeErr;
          }
        }
        const pdfResponse = await prescriptionApi.download(activePrescriptionId);
        const blob = new Blob([pdfResponse.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      } else {
        throw new Error('No prescription found/created.');
      }
    } catch (err) {
      const errMsg = err?.response?.data?.message || err?.message || '';
      setError(errMsg || 'Unable to open prescription PDF note.');
    } finally { setPdfDownloading(false); }
  };

  const handleComplete = async () => {
    if (!consultation?._id) return;
    setCompleting(true); setError('');
    try {
      // First save/update the prescription to ensure it has latest medicines/labs/procedures
      const prescriptionPayload = {
        patientId: patient?._id || consultation.patientId?._id || consultation.patientId,
        consultationId: consultation._id,
        appointmentId: appointment?._id || appointmentId,
        notes: form.clinicalNotes || '',
        medicines: medicines
          .filter(m => m.medicineName && m.medicineName.trim())
          .map(m => ({
            ...m,
            quantity: m.quantity ? Number(m.quantity) : null
          })),
        labs: labs,
        procedures: procedures,
        advice: prescriptionAdvice,
        followUpDate: followUpDate || undefined
      };

      let activePrescriptionId = prescription?._id;
      if (activePrescriptionId) {
        await prescriptionApi.update(activePrescriptionId, prescriptionPayload);
      } else {
        const res = await prescriptionApi.create(prescriptionPayload);
        if (res?.prescription) {
          activePrescriptionId = res.prescription._id;
          setPrescription(res.prescription);
        }
      }

      // Complete consultation on the backend
      const response = await completeConsultation(consultation._id, {
        diagnosis: { primary: (form.diagnosis?.primary || '').trim(), secondary: parseCommaSeparated(form.secondaryDiagnosisInput || ''), notes: (form.diagnosis?.notes || '').trim() },
        treatmentPlan: (form.treatmentPlan || '').trim() || 'Follow prescribed medications and treatment plan.',
        followUp: { required: Boolean(form.followUp?.required), ...(form.followUp?.date ? { date: form.followUp.date } : {}), notes: (form.followUp?.notes || '').trim() }
      });
      applyConsultationToState({ consultation: response.data.consultation });

      // Finalize prescription
      if (activePrescriptionId) {
        try {
          const finalRes = await prescriptionApi.finalize(activePrescriptionId, {
            followUpDate: followUpDate || undefined,
            finalAdvice: prescriptionAdvice,
            doctorConfirmation: true
          });
          if (finalRes?.prescription) setPrescription(finalRes.prescription);

          // Auto-download prescription PDF
          const pdfResponse = await prescriptionApi.download(activePrescriptionId);
          const blob = new Blob([pdfResponse.data], { type: 'application/pdf' });
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
        } catch (presFinalErr) {
          console.error('Failed to finalize prescription:', presFinalErr);
        }
      }

      try {
        const pdfResponse = await downloadConsultationPdf(consultation._id);
        const blob = new Blob([pdfResponse.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      } catch (pdfErr) { console.error('Failed to auto-open consultation PDF:', pdfErr); }
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to complete consultation.');
    } finally { setCompleting(false); }
  };

  const handleRequestReedit = async () => {
    if (!consultation?._id) return;
    setError('');
    try {
      await requestConsultationReedit(consultation._id);
      setReeditRequested(true);
      alert('A 6-digit authorization code has been sent to the patient\'s registered email address.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to request re-edit authorization code.');
    }
  };

  const handleVerifyReedit = async (e) => {
    e?.preventDefault();
    if (!consultation?._id || !reeditCodeInput.trim()) return;
    setVerifyingReedit(true);
    setError('');
    try {
      const response = await verifyConsultationReedit(consultation._id, { code: reeditCodeInput });
      applyConsultationToState({ consultation: response.consultation || response.data?.consultation || consultation });
      setReeditRequested(false);
      setReeditCodeInput('');
      
      // Reload workspace
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Please check the code.');
    } finally {
      setVerifyingReedit(false);
    }
  };

  const handlePayInvoice = (invoiceId) => {
    navigate(`/billing/${invoiceId}/checkout`);
  };

  if (loading) return <LoadingState label="Loading consultation workspace..." />;
  if (error && !patient && !appointment && !consultation) return <ErrorState title="Consultation workspace unavailable" description={error} />;

  const patientName = patient?.fullName || 'Patient';
  const doctorName = doctor?.fullName || 'Doctor';
  const apptDate = appointment?.appointmentDate ? new Date(appointment.appointmentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const apptTime = `${appointment?.startTime || '—'} – ${appointment?.endTime || '—'}`;
  const consultType = appointment?.consultationType || 'In-Clinic';
  const specialization = doctor?.specialization || 'General Physician';

  const TABS = user?.role?.toLowerCase() === 'patient'
    ? [
        { id: 'prescription-preview', label: 'Prescription Preview' },
        { id: 'history', label: 'History' },
        { id: 'lab-history', label: 'Lab History' },
        { id: 'invoice-history', label: 'Invoice History' },
        { id: 'documents', label: 'Documents' }
      ]
    : [
        { id: 'consultation', label: 'Consultation Workspace' },
        { id: 'history', label: 'History' },
        { id: 'prescriptions', label: 'Prescriptions' },
        { id: 'lab-history', label: 'Lab History' },
        { id: 'invoice-history', label: 'Invoice History' },
        { id: 'follow-ups', label: 'Follow-ups' },
        { id: 'documents', label: 'Documents' }
      ];


  return (
    <div className="consultation-workspace" style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>

      {/* ─── Top Info Bar: Patient + Appointment Cards ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">

        {/* Patient Card */}
        <div className="cons-card flex items-start gap-3 p-4">
          <div className="cons-avatar cons-avatar-green">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v2h20v-2c0-3.3-6.7-5-10-5z"/></svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="cons-label-xs text-emerald-400 mb-0.5">PATIENT</p>
            <h2 className="text-base font-bold text-white truncate">{patientName}</h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
              <div><p className="cons-label-xs">PATIENT ID</p><p className="cons-value-sm">{patient?.patientId || '—'}</p></div>
              <div><p className="cons-label-xs">AGE / GENDER</p><p className="cons-value-sm">{[patient?.age ?? '—', patient?.gender || '—'].join(' / ')}</p></div>
              <div><p className="cons-label-xs">PHONE</p><p className="cons-value-sm">{patient?.phone || '—'}</p></div>
              <div><p className="cons-label-xs">KNOWN CONDITIONS</p><p className="cons-value-sm truncate">{patient?.chronicConditions?.join(', ') || '—'}</p></div>
            </div>
          </div>
        </div>

        {/* Appointment Card */}
        <div className="cons-card flex items-start gap-3 p-4">
          <div className="cons-avatar cons-avatar-violet">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/></svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="cons-label-xs text-violet-400">APPOINTMENT</p>
              <StatusPill status={appointment?.status} />
            </div>
            <h2 className="text-base font-bold text-white truncate">{doctorName}</h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
              <div><p className="cons-label-xs">DATE & TIME</p><p className="cons-value-sm">{apptDate}, {apptTime}</p></div>
              <div><p className="cons-label-xs">CONSULTATION TYPE</p><p className="cons-value-sm">{consultType}</p></div>
              <div><p className="cons-label-xs">APPOINTMENT ID</p><p className="cons-value-sm">{appointment?.appointmentId || appointment?._id?.slice(-8)?.toUpperCase() || '—'}</p></div>
              <div><p className="cons-label-xs">SPECIALIZATION</p><p className="cons-value-sm">{specialization}</p></div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Action Toolbar ─── */}
      <div className="cons-toolbar">
        <div className="flex flex-wrap items-center gap-2">
          {user?.role?.toLowerCase() === 'patient' ? (
            <Link
              to="/portal"
              className="cons-btn cons-btn-ghost"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
              Back to Patient Portal
            </Link>
          ) : (
            <Link
              to={`/appointments/${appointment?._id || appointmentId}`}
              className="cons-btn cons-btn-ghost"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
              Back to Appointments
            </Link>
          )}

          {user?.role?.toLowerCase() !== 'patient' && consultation?._id && patient?._id && (
            <Link
              to={`/prescriptions/new?patientId=${patient._id}&consultationId=${consultation._id}`}
              className="cons-btn cons-btn-primary"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
              Create Prescription
            </Link>
          )}

          {user?.role?.toLowerCase() !== 'patient' && consultation?._id && (
            <Link
              to={`/consultations/${consultation._id}/labs/new`}
              className="cons-btn cons-btn-secondary"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18"/></svg>
              Order Labs
            </Link>
          )}

          {user?.role?.toLowerCase() !== 'patient' && consultation?._id && patient?._id && (
            <Link
              to={`/billing/create?patientId=${patient._id}&consultationId=${consultation._id}&appointmentId=${appointment?._id || appointmentId}`}
              className="cons-btn cons-btn-secondary"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"/></svg>
              Create Invoice
            </Link>
          )}

          {consultation?._id && (
            <button
              type="button"
              onClick={handleViewPdf}
              disabled={pdfDownloading}
              className="cons-btn cons-btn-secondary"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
              {pdfDownloading ? 'Opening...' : 'View/Print PDF'}
            </button>
          )}
        </div>

        {/* Save Actions */}
        <div className="flex items-center gap-3">
          {needsCheckIn && (
            <span className="text-xs font-bold text-rose-450 bg-rose-500/10 border border-rose-500/25 px-3.5 py-2 rounded-xl flex items-center gap-1.5 animate-pulse">
              ⚠️ Patient hasn't checked in at reception yet.
            </span>
          )}
          {user?.role?.toLowerCase() !== 'patient' && consultation?.status !== 'completed' && (
            <>
              <button
                type="button"
                onClick={(e) => handleSubmit(e, false)}
                disabled={saving || needsCheckIn}
                className="cons-btn cons-btn-ghost disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save as Draft'}
              </button>
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                disabled={saving || needsCheckIn}
                className="cons-btn cons-btn-save disabled:opacity-40 disabled:bg-slate-800 disabled:border-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed flex items-center gap-1.5"
                title={needsCheckIn ? "Patient must check in at reception first" : ""}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7"/></svg>
                {saving ? 'Saving...' : consultation?._id ? 'Save & Continue' : 'Start Consultation'}
              </button>
              {consultation?._id && (
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={completing}
                  className="cons-btn cons-btn-complete"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><polyline points="9,11 12,14 20,6"/></svg>
                  {completing ? 'Completing...' : 'Save & Print Note'}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ─── Tab Navigation ─── */}
      <div className="cons-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`cons-tab ${activeTab === tab.id ? 'cons-tab-active' : ''}`}
          >
            {tab.label}
            {tab.id === 'consultation' && consultation?._id && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">AI</span>
            )}
          </button>
        ))}
      </div>

      {/* ─── Error Banner ─── */}
      {error && (
        <div className="mb-3 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
          {error}
          <button type="button" onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-300">✕</button>
        </div>
      )}

      {/* ─── Re-edit Lock Panel for Completed Consultations ─── */}
      {user?.role?.toLowerCase() !== 'patient' && consultation?.status === 'completed' && (
        <div className="mb-4 p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Consultation Finalized & Locked</h4>
              <p className="text-xs text-slate-400 mt-1">This consultation is completed. To unlock and re-edit the consultation notes, request an authorization code from the patient.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {!reeditRequested ? (
              <button
                type="button"
                onClick={handleRequestReedit}
                className="w-full md:w-auto px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition"
              >
                Send Request Code
              </button>
            ) : (
              <form onSubmit={handleVerifyReedit} className="flex items-center gap-2 w-full md:w-auto">
                <input
                  type="text"
                  placeholder="Enter 6-Digit Code"
                  value={reeditCodeInput}
                  onChange={(e) => setReeditCodeInput(e.target.value)}
                  maxLength={6}
                  className="px-3 py-1.5 rounded-xl border border-white/10 bg-slate-950 text-white font-mono text-xs w-32 focus:outline-none focus:border-amber-500 text-center"
                />
                <button
                  type="submit"
                  disabled={verifyingReedit}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition"
                >
                  {verifyingReedit ? 'Verifying...' : 'Verify'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ─── Main Content ─── */}
      {activeTab === 'prescription-preview' && (
        <PrescriptionPreview
          consultation={consultation}
          prescription={prescription}
          patient={patient}
          doctor={doctor}
          appointment={appointment}
          invoice={invoice}
          onPayInvoice={handlePayInvoice}
        />
      )}

      {activeTab === 'consultation' && (
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1.3fr_340px] gap-4 items-start">
          <ConsultationMainPanel
            form={form}
            consultation={consultation}
            patient={patient}
            doctor={doctor}
            appointment={appointment}
            saving={saving}
            formatting={formatting}
            aiLoading={aiLoading}
            completing={completing}
            voiceUploading={voiceUploading}
            aiDraftSaving={aiDraftSaving}
            aiDraftApproving={aiDraftApproving}
            aiDraftRejecting={aiDraftRejecting}
            selectedAudioFile={selectedAudioFile}
            onFieldChange={handleFieldChange}
            onVitalsChange={handleVitalsChange}
            onSymptomChange={handleSymptomChange}
            onAddSymptom={handleAddSymptom}
            onRemoveSymptom={handleRemoveSymptom}
            onFormattedNoteChange={handleFormattedNoteChange}
            onAiSoapNoteChange={handleAiSoapNoteChange}
            onAudioSelected={setSelectedAudioFile}
            onSubmit={handleSubmit}
            onFormatNotes={handleFormatNotes}
            onRequestAi={handleRequestAi}
            onComplete={handleComplete}
            onUploadVoiceNote={handleUploadVoiceNote}
            onSaveAiDraftEdits={handleSaveAiDraftEdits}
            onApproveAiNote={handleApproveAiNote}
            onRejectAiNote={handleRejectAiNote}
          />

          <PrescriptionInConsultation
            patient={patient}
            consultation={consultation}
            medicines={medicines}
            setMedicines={setMedicines}
            labs={labs}
            setLabs={setLabs}
            procedures={procedures}
            setProcedures={setProcedures}
            advice={prescriptionAdvice}
            setAdvice={setPrescriptionAdvice}
            followUpDate={followUpDate}
            setFollowUpDate={setFollowUpDate}
            isDraft={consultation?.status !== 'completed'}
          />

          <AiSuggestionsPanel
            consultationId={consultation?._id}
            patient={patient}
            consultation={consultation}
            aiSuggestions={consultation?.aiSuggestions}
            aiReview={consultation?.aiReview}
            aiLoading={aiLoading}
            reviewLoading={reviewLoading}
            completing={completing}
            onRequestSuggestions={handleRequestAi}
            onReview={handleReviewAi}
            onComplete={handleComplete}
            vitals={form.vitals}
          />
        </div>
      )}

      {activeTab === 'history' && (
        <div className="cons-card p-6 text-slate-400 text-sm">
          Patient clinical history will appear here. <Link to={patient?._id ? `/patients/${patient._id}/history` : '#'} className="text-emerald-400 hover:underline">View full history →</Link>
        </div>
      )}
      {activeTab === 'prescriptions' && (
        <div className="cons-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white">Prescriptions</h3>
            {consultation?._id && patient?._id && (
              <Link to={`/prescriptions/new?patientId=${patient._id}&consultationId=${consultation._id}`} className="cons-btn cons-btn-primary text-xs py-1.5 px-3">+ New Prescription</Link>
            )}
          </div>
          {prescription ? (
            <div className="rounded-xl border border-slate-600/40 bg-slate-800/40 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{prescription.prescriptionNumber}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Status: {prescription.status} | {prescription.medicines?.length || 0} medicines</p>
                </div>
                <Link to={`/prescriptions/${prescription._id}`} className="cons-btn cons-btn-ghost text-xs py-1.5 px-3">View →</Link>
              </div>
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No prescriptions created for this consultation yet.</p>
          )}
        </div>
      )}
      {['lab-history', 'invoice-history', 'follow-ups', 'documents'].includes(activeTab) && (
        <div className="cons-card p-6 text-slate-400 text-sm">
          {activeTab.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} — coming soon or navigate to the relevant section.
        </div>
      )}
    </div>
  );
};

export default ConsultationPage;
