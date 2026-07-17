import { useEffect, useRef, useState, useMemo } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Calendar, Clock, Filter, Eye, Printer, FileText, ChevronLeft, ChevronRight,
  Search, ArrowLeft, MoreHorizontal, ArrowRight, Activity, CheckCircle, CheckCircle2,
  XCircle, User, Sparkles, AlertCircle, ShoppingBag, Plus, BookOpen, Mic, Pause,
  Play, Square, Upload, Shield, AlertTriangle, Info, Trash2, Edit2, Settings, Lock,
  HelpCircle, Check, X, RefreshCw, Heart, FileDown, PlusCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserDoctor, faUser } from '@fortawesome/free-solid-svg-icons';

import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import { appointmentApi, prescriptionApi, billingApi, pharmacyApi, labApi } from '../../lib/api';
import { useFeatureAccess } from '../../hooks/useFeatureAccess';
import PremiumFeaturePlaceholder from '../../components/PremiumFeaturePlaceholder';

import {
  getConsultation,
  getAppointmentConsultation,
  createConsultation,
  updateConsultation,
  completeConsultation,
  downloadConsultationPdf,
  requestConsultationReedit,
  verifyConsultationReedit,
  uploadConsultationVoiceNote
} from './consultationApi';
import useAuth from '../../hooks/useAuth';
import SmartPrescriptionSearch from './SmartPrescriptionSearch';
import PreviousVisitsWorkspace from './PreviousVisitsWorkspace';
import CurrentMedicinesWorkspace from './CurrentMedicinesWorkspace';
import ChronicConditionsWorkspace from './ChronicConditionsWorkspace';

/* ─── FontAwesome Icon Prefix Compatibility Mapping ─── */
const byPrefixAndName = {
  fas: {
    'user-doctor': faUserDoctor,
    'user': faUser
  }
};

/* ─── Helpers ─── */
const createEmptySymptom = () => ({ name: '', severity: 'mild', duration: '', notes: '' });

const createInitialForm = () => ({
  chiefComplaint: '',
  symptoms: [createEmptySymptom()],
  vitals: { temperature: '98.6', bloodPressure: '120/80', pulse: '78', respiratoryRate: '18', oxygenSaturation: '98', weight: '65', height: '175', painScore: '0', bloodSugar: '' },
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

const ConsultationPage = ({ editMode, onCancelEdit, onCompleteEdit }) => {
  const { user } = useAuth();
  const { appointmentId: paramAppointmentId, consultationId: paramConsultationId } = useParams();
  const [searchParams] = useSearchParams();
  const appointmentId = paramAppointmentId || searchParams.get('appointmentId');
  const consultationId = paramConsultationId || searchParams.get('consultationId');
  const navigate = useNavigate();

  // Core state
  const [form, setForm] = useState(createInitialForm());
  const [consultation, setConsultation] = useState(null);
  const [patient, setPatient] = useState(null);
  const [doctor, setDoctor] = useState(null);
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  // Dynamic user-customizable history and examination states
  const [pastMedicalHistory, setPastMedicalHistory] = useState([
    'No Diabetes', 'No Hypertension', 'No Thyroid Disorder', 'No TB', 'No Asthma', 'No Heart Disease', 'No Known Drug Allergies'
  ]);
  const [familyHistory, setFamilyHistory] = useState([
    { label: 'Father: Hypertension', checked: true },
    { label: 'Mother: Diabetes', checked: true },
    { label: 'No Family History of Heart Disease', checked: false },
    { label: 'No Family History of Cancer', checked: false },
  ]);
  const [socialHistory, setSocialHistory] = useState([
    { label: 'Non Smoker', active: true },
    { label: 'Non Alcoholic', active: true },
    { label: 'No Drug Use', active: true },
    { label: 'Diet: Mixed', active: false },
  ]);
  const [lifestyleHistory, setLifestyleHistory] = useState([]);
  const [systemicExamination, setSystemicExamination] = useState([
    { sys: 'General', status: 'Alert, Oriented', note: 'No distress' },
    { sys: 'Skin', status: 'Normal', note: 'No pallor / Icterus' },
    { sys: 'Head & Neck', status: 'Normal', note: 'No JVD, No Lymphadenopathy' },
    { sys: 'Eyes', status: 'PERRLA', note: 'No redness / Discharge' },
    { sys: 'Cardiovascular', status: 'S1, S2 Normal', note: 'No Murmur' },
    { sys: 'Respiratory', status: 'Clear', note: 'B/L air entry equal' },
    { sys: 'Abdomen', status: 'Soft', note: 'Non-tender' },
    { sys: 'CNS', status: 'Motor Power Norm.', note: 'No Focal Deficit' },
    { sys: 'Extremities', status: 'Normal', note: 'No Edema' },
  ]);
  const [customVitals, setCustomVitals] = useState([]);

  // Inline add input states
  const [showPmhInput, setShowPmhInput] = useState(false);
  const [pmhInputVal, setPmhInputVal] = useState('');

  const [showFamilyInput, setShowFamilyInput] = useState(false);
  const [familyInputVal, setFamilyInputVal] = useState('');

  const [showSocialInput, setShowSocialInput] = useState(false);
  const [socialInputVal, setSocialInputVal] = useState('');

  const [showLifestyleInput, setShowLifestyleInput] = useState(false);
  const [lifestyleInputVal, setLifestyleInputVal] = useState('');

  const [showSysExamInput, setShowSysExamInput] = useState(false);
  const [sysExamInputVal, setSysExamInputVal] = useState('');

  const [showCustomVitalInput, setShowCustomVitalInput] = useState(false);
  const [customVitalName, setCustomVitalName] = useState('');
  const [customVitalUnit, setCustomVitalUnit] = useState('');
  const [customVitalValue, setCustomVitalValue] = useState('');

  const handleAddPastMedicalHistory = () => {
    setShowPmhInput(true);
  };

  const handleAddFamilyHistory = () => {
    setShowFamilyInput(true);
  };

  const handleAddSocialHistory = () => {
    setShowSocialInput(true);
  };

  const handleAddLifestyle = () => {
    setShowLifestyleInput(true);
  };

  const handleAddSystemicExamination = () => {
    setShowSysExamInput(true);
  };

  const handleAddCustomVital = () => {
    setShowCustomVitalInput(true);
  };

  // Active workspace tab (defaults to Laboratory)
  const [workspaceTab, setWorkspaceTab] = useState('Laboratory');

  // Prescription builder state
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
  const [procedures, setProcedures] = useState([
    { name: 'Nebulization', fee: 250, status: 'scheduled', indication: 'For wheezing and breathlessness', medication: 'Salbutamol 2.5ml', frequency: 'Once', route: 'Nebulizer', duration: '10' },
    { name: 'Injection (IM)', fee: 100, status: 'scheduled', indication: 'Given for pain relief', medication: 'Diclofenac 75 mg', frequency: 'Once', route: 'IM', dose: '75', site: 'Upper Gluteal' }
  ]);

  // Advice states mapping Image 1
  const [adviceSubTab, setAdviceSubTab] = useState('Diet Advice');
  const [dietAdviceText, setDietAdviceText] = useState(`• Take plenty of fluids (water, ORS, soups).\n• Eat light, home-cooked meals.\n• Include fruits like papaya, banana, and apple.\n• Avoid oily, spicy and heavy food.`);
  const [lifestyleAdviceText, setLifestyleAdviceText] = useState(`• Maintain a regular sleep cycle.\n• Manage stress through meditation or breathing exercises.\n• Avoid smoking and alcohol.`);
  const [activityAdviceText, setActivityAdviceText] = useState(`• Light walking is recommended.\n• Avoid strenuous activities for now.\n• Gradually increase activity as tolerated.`);
  const [restrictionsText, setRestrictionsText] = useState(`• Avoid heavy lifting.\n• Avoid exposure to dust and pollution.\n• Avoid driving if feeling drowsy or weak.`);
  const [precautionsText, setPrecautionsText] = useState(`• Take medications as prescribed.\n• Do not stop medications without consulting the doctor.\n• Monitor temperature twice daily.`);
  const [generalInstructionsText, setGeneralInstructionsText] = useState(`• Complete the full course of medicines.\n• Keep all follow-up appointments.\n• Contact clinic if symptoms worsen.`);

  // Follow up plan states mapping Image 2
  const [followUpType, setFollowUpType] = useState('In-Clinic');
  const [followUpAfterVal, setFollowUpAfterVal] = useState('7');
  const [followUpAfterUnit, setFollowUpAfterUnit] = useState('Days');
  const [followUpDate, setFollowUpDate] = useState('2026-07-21');
  const [followUpTime, setFollowUpTime] = useState('10:30 AM');
  const [followUpReason, setFollowUpReason] = useState('Review of symptoms and response to medication.');
  const [followUpPriority, setFollowUpPriority] = useState('Routine');
  const [followUpInstructions, setFollowUpInstructions] = useState(`• Take medicines as prescribed.\n• Monitor BP daily and maintain a log.\n• Follow diet and lifestyle advice.\n• Come empty stomach for next visit.`);
  const [bringReports, setBringReports] = useState(true);
  const [completeLabTests, setCompleteLabTests] = useState(true);
  const [bpChart, setBpChart] = useState(false);
  const [bloodSugarLog, setBloodSugarLog] = useState(false);
  const [otherRequiredField, setOtherRequiredField] = useState('');
  const [recommendedLabTests, setRecommendedLabTests] = useState(['Complete Blood Count (CBC)', 'Fasting Blood Sugar (FBS)', 'Lipid Profile']);

  // Search results for medicines/labs
  const [isSmartSearchOpen, setIsSmartSearchOpen] = useState(false);
  const [medicineSearchQuery, setMedicineSearchQuery] = useState('');
  const [medicineSearchResults, setMedicineSearchResults] = useState([]);
  const [activeMedicineIndex, setActiveMedicineIndex] = useState(null);
  const [labSearchQuery, setLabSearchQuery] = useState('');
  const [availableLabTests, setAvailableLabTests] = useState([]);
  const [selectedLabCategory, setSelectedLabCategory] = useState('All Categories');
  const [selectedLabProvider, setSelectedLabProvider] = useState('All Providers');

  const [procedureSearchQuery, setProcedureSearchQuery] = useState('');
  const [procedureSubFilter, setProcedureSubFilter] = useState('Common Procedures');

  // Diagnosis tab state
  const [secondaryDiagnosisTags, setSecondaryDiagnosisTags] = useState(['Allergic Rhinitis']);
  const [secondaryDiagnosisInput2, setSecondaryDiagnosisInput2] = useState('');
  const [differentialDiagnosisTags, setDifferentialDiagnosisTags] = useState(['Dengue Fever', 'Typhoid Fever', 'Influenza', 'Malaria']);
  const [differentialDiagnosisInput, setDifferentialDiagnosisInput] = useState('');
  const [diagnosisSeverity, setDiagnosisSeverity] = useState('Mild');
  const [diagnosisCertainty, setDiagnosisCertainty] = useState('Probable');
  const [diagnosisStatus, setDiagnosisStatus] = useState('Active');
  const [diagnosisOnset, setDiagnosisOnset] = useState('2026-07-12');
  const [treatmentPlanText, setTreatmentPlanText] = useState('Symptomatic treatment, hydration, rest and monitoring.');
  const [icdCode, setIcdCode] = useState('B34.9');

  // Laboratory tab state
  const [labSubFilter, setLabSubFilter] = useState('Recommended');
  const [labSpecialInstructions, setLabSpecialInstructions] = useState('');
  const [promptGlobalTest, setPromptGlobalTest] = useState(null);
  const [showNearbyLabsModal, setShowNearbyLabsModal] = useState(false);
  const [showCustomTestModal, setShowCustomTestModal] = useState(false);
  const [customTestType, setCustomTestType] = useState('custom');
  const [showMoreTests, setShowMoreTests] = useState(false);
  const [labCollectionPref, setLabCollectionPref] = useState('At Clinic');
  const [labPriority, setLabPriority] = useState('Routine');
  const [labFastingRequired, setLabFastingRequired] = useState(true);
  const [labClinicalNotes, setLabClinicalNotes] = useState('');


  // Invoice state
  const [invoice, setInvoice] = useState(null);
  const [pdfDownloading, setPdfDownloading] = useState(false);

  // Re-edit unlock state
  const [reeditRequested, setReeditRequested] = useState(false);
  const [reeditCodeInput, setReeditCodeInput] = useState('');
  const [verifyingReedit, setVerifyingReedit] = useState(false);

  // Persistent Voice-to-Text states
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingLanguage, setRecordingLanguage] = useState('en-US');
  const [dictatingField, setDictatingField] = useState(null);
  const [voiceUploading, setVoiceUploading] = useState(false);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const dictationInitialValRef = useRef('');
  const dictationAccumulatedRef = useRef('');

  const { getFeatureDetail, refresh } = useFeatureAccess();
  const symptomCheckerFeature = getFeatureDetail('symptom_checker');
  const assistantFeature = getFeatureDetail('consultation_assistant');
  const prescriptionSuggestionsFeature = getFeatureDetail('prescription_suggestions');
  const riskScoringFeature = getFeatureDetail('risk_scoring');
  const clinicalAlertsFeature = getFeatureDetail('clinical_alerts');
  const clinicalSummaryFeature = getFeatureDetail('clinical_summary');
  const labRecommendationsFeature = getFeatureDetail('lab_recommendations');
  const voiceToTextFeature = getFeatureDetail('voice_to_text');

  const [globalLabTests, setGlobalLabTests] = useState([]);
  const [isSearchingLabs, setIsSearchingLabs] = useState(false);

  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      setIsSearchingLabs(true);
      try {
        const res = await labApi.searchAllLabs({ search: labSearchQuery });
        const results = res?.data?.results || res?.results || [];
        setGlobalLabTests(results);
      } catch (err) {
        console.error('Failed to search lab tests:', err);
      } finally {
        setIsSearchingLabs(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [labSearchQuery]);

  // Load initial laboratory catalog
  useEffect(() => {
    const fetchTests = async () => {
      try {
        const res = await labApi.searchAllLabs({ search: '' });
        const results = res?.data?.results || res?.results || [];
        setGlobalLabTests(results);
      } catch (err) {
        console.error('Failed to load initial lab tests:', err);
      }
    };
    fetchTests();
  }, []);

  // Fetch initial consultation & patient details
  const applyConsultationToState = (responseData) => {
    const nextConsultation = responseData.consultation;
    if (editMode && nextConsultation) {
      nextConsultation.status = 'in_progress';
    }
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

    if (nextConsultation?.pastMedicalHistory && nextConsultation.pastMedicalHistory.length > 0) {
      setPastMedicalHistory(nextConsultation.pastMedicalHistory);
    }
    if (nextConsultation?.familyHistory && nextConsultation.familyHistory.length > 0) {
      setFamilyHistory(nextConsultation.familyHistory);
    }
    if (nextConsultation?.socialHistory && nextConsultation.socialHistory.length > 0) {
      setSocialHistory(nextConsultation.socialHistory);
    }
    if (nextConsultation?.lifestyleHistory && nextConsultation.lifestyleHistory.length > 0) {
      setLifestyleHistory(nextConsultation.lifestyleHistory);
    }
    if (nextConsultation?.systemicExamination && nextConsultation.systemicExamination.length > 0) {
      setSystemicExamination(nextConsultation.systemicExamination);
    }
    if (nextConsultation?.customVitalsList && nextConsultation.customVitalsList.length > 0) {
      setCustomVitals(nextConsultation.customVitalsList);
    }

    setForm({
      chiefComplaint: nextConsultation?.chiefComplaint || '',
      symptoms: normalizeSymptomsForForm(nextConsultation?.symptoms || []),
      vitals: {
        temperature: nextConsultation?.vitals?.temperature ?? '98.6',
        bloodPressure: nextConsultation?.vitals?.bloodPressure ?? '120/80',
        pulse: nextConsultation?.vitals?.pulse ?? '78',
        respiratoryRate: nextConsultation?.vitals?.respiratoryRate ?? '18',
        oxygenSaturation: nextConsultation?.vitals?.oxygenSaturation ?? nextConsultation?.vitals?.spo2 ?? '98',
        weight: nextConsultation?.vitals?.weight ?? '65',
        height: nextConsultation?.vitals?.height ?? '175',
        painScore: nextConsultation?.vitals?.painScore ?? '0',
        bloodSugar: nextConsultation?.vitals?.bloodSugar ?? '',
        ...(nextConsultation?.customVitalsList || []).reduce((acc, cv) => {
          acc[cv.key] = nextConsultation?.vitals?.[cv.key] ?? cv.value;
          return acc;
        }, {})
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
    setSecondaryDiagnosisTags(nextDiagnosis.secondary || []);
    setTreatmentPlanText(nextConsultation?.treatmentPlan || 'Symptomatic treatment, hydration, rest and monitoring.');
  };

  const loadConsultationById = async () => {
    setLoading(true); setError('');
    try {
      const response = await getConsultation(consultationId);
      applyConsultationToState(response.data);
      try {
        const presResp = await prescriptionApi.getByConsultation(consultationId);
        const pres = presResp?.prescription ||
          (presResp?.prescriptions && presResp.prescriptions.length > 0 ? presResp.prescriptions[0] : null) ||
          (presResp?.data?.prescriptions && presResp.data.prescriptions.length > 0 ? presResp.data.prescriptions[0] : null);
        if (pres) {
          setPrescription(pres);
          if (pres.medicines && pres.medicines.length > 0) setMedicines(pres.medicines);
          if (pres.labs && pres.labs.length > 0) setLabs(pres.labs);
          if (pres.procedures && pres.procedures.length > 0) setProcedures(pres.procedures);
          setDietAdviceText(pres.advice || dietAdviceText);
          if (pres.followUpDate) setFollowUpDate(pres.followUpDate.slice(0, 10));
        }
      } catch (_e) { }

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
        console.error('Failed to load invoice details:', invErr);
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
        console.error('Failed to load invoice details:', invErr);
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
        } catch (invErr) { }
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

  // Field Handlers
  const handleFieldChange = (path, value) => {
    setIsDirty(true);
    setForm((current) => {
      const next = JSON.parse(JSON.stringify(current));
      const segments = path.split('.');
      let target = next;
      for (let i = 0; i < segments.length - 1; i++) target = target[segments[i]];
      target[segments[segments.length - 1]] = value;
      return next;
    });
  };

  // 30-Second Auto Save logic
  useEffect(() => {
    if (!isDirty || consultation?.status === 'completed' || needsCheckIn) return;
    const interval = setInterval(async () => {
      try {
        let payload = buildPayload(false);
        if (consultation?._id) {
          await updateConsultation(consultation._id, payload);
        } else {
          const res = await createConsultation(buildPayload(true));
          applyConsultationToState({ consultation: res?.data?.consultation || res?.consultation });
        }

        const prescriptionPayload = {
          patientId: patient?._id || consultation?.patientId?._id || consultation?.patientId,
          consultationId: consultation?._id,
          appointmentId: appointment?._id || appointmentId,
          notes: form.clinicalNotes || '',
          medicines: medicines.filter(m => m.medicineName && m.medicineName.trim()).map(m => ({ ...m, quantity: m.quantity ? Number(m.quantity) : null })),
          labs: labs,
          procedures: procedures,
          advice: dietAdviceText,
          followUpDate: followUpDate || undefined
        };
        if (prescription?._id) {
          await prescriptionApi.update(prescription._id, prescriptionPayload);
        } else if (consultation?._id) {
          const res = await prescriptionApi.create(prescriptionPayload);
          if (res?.prescription) setPrescription(res.prescription);
        }
        setIsDirty(false);
      } catch (err) {
        console.error('Auto save failed:', err);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [isDirty, form, medicines, labs, procedures, dietAdviceText, followUpDate, consultation, appointment]);

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
        secondary: secondaryDiagnosisTags,
        notes: form.diagnosis?.notes ? form.diagnosis.notes.trim() : ''
      },
      treatmentPlan: treatmentPlanText ? treatmentPlanText.trim() : 'Follow prescribed medications and treatment plan.',
      followUp: { required: Boolean(form.followUp?.required), ...(form.followUp?.date ? { date: form.followUp.date } : {}), notes: form.followUp?.notes ? form.followUp.notes.trim() : '' },
      pastMedicalHistory,
      familyHistory,
      socialHistory,
      lifestyleHistory,
      systemicExamination,
      customVitalsList: customVitals,
      transcript_text: form.transcript_text || '',
      ai_soap_note: form.ai_soap_note || {},
      voiceNoteLanguage: form.voiceNoteLanguage || 'auto'
    };
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      let savedConsultation = null;
      if (consultation?._id) {
        const response = await updateConsultation(consultation._id, { ...buildPayload(false), isEdit: editMode });
        savedConsultation = response?.data?.consultation || response?.consultation;
      } else {
        const response = await createConsultation(buildPayload(true));
        savedConsultation = response?.data?.consultation || response?.consultation;
      }
      if (!savedConsultation?._id) {
        console.warn('handleSaveDraft: savedConsultation was empty, skipping prescription save.');
        toast.success('Draft saved.');
        setIsDirty(false);
        return;
      }
      applyConsultationToState({ consultation: savedConsultation });

      const prescriptionPayload = {
        patientId: patient?._id || savedConsultation.patientId?._id || savedConsultation.patientId,
        consultationId: savedConsultation._id,
        appointmentId: appointment?._id || appointmentId,
        notes: form.clinicalNotes || '',
        medicines: medicines.filter(m => m.medicineName && m.medicineName.trim()).map(m => ({ ...m, quantity: m.quantity ? Number(m.quantity) : null })),
        labs: labs,
        procedures: procedures,
        advice: dietAdviceText,
        followUpDate: followUpDate || undefined,
        isEdit: editMode
      };
      if (prescription?._id) {
        await prescriptionApi.update(prescription._id, prescriptionPayload);
      } else {
        const res = await prescriptionApi.create(prescriptionPayload);
        if (res?.data?.prescription) setPrescription(res.data.prescription);
        else if (res?.prescription) setPrescription(res.prescription);
      }
      setIsDirty(false);
      toast.success('Draft saved successfully.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save draft.');
    } finally { setSaving(false); }
  };

  const handleComplete = async () => {
    // Validate that all required fields have been filled
    if (!form.chiefComplaint?.trim()) {
      toast.error('Chief complaint is required.');
      return;
    }
    if (!form.diagnosis?.primary?.trim()) {
      toast.error('Primary diagnosis is required.');
      return;
    }
    if (!form.treatmentPlan?.trim()) {
      toast.error('Treatment plan is required.');
      return;
    }
    
    setCompleting(true);
    try {
      let activeConsultation = consultation;
      
      // If consultation draft doesn't exist yet, create it on the fly
      if (!activeConsultation?._id) {
        const response = await createConsultation(buildPayload(true));
        activeConsultation = response?.data?.consultation || response?.consultation;
        if (!activeConsultation?._id) {
          throw new Error('Failed to create consultation draft.');
        }
        applyConsultationToState({ consultation: activeConsultation });
      } else if (isDirty) {
        // If dirty, save the draft first
        const saveRes = await updateConsultation(activeConsultation._id, { ...buildPayload(false), isEdit: editMode });
        const updatedConsultation = saveRes?.data?.consultation || saveRes?.consultation;
        if (updatedConsultation) {
          activeConsultation = updatedConsultation;
          applyConsultationToState({ consultation: activeConsultation });
        }
      }

      const prescriptionPayload = {
        patientId: patient?._id || activeConsultation.patientId?._id || activeConsultation.patientId,
        consultationId: activeConsultation._id,
        appointmentId: appointment?._id || appointmentId,
        notes: form.clinicalNotes || '',
        medicines: medicines.filter(m => m.medicineName && m.medicineName.trim()).map(m => ({ ...m, quantity: m.quantity ? Number(m.quantity) : null })),
        labs: labs,
        procedures: procedures,
        advice: dietAdviceText,
        followUpDate: followUpDate || undefined,
        isEdit: editMode
      };

      let activePrescription = prescription;
      if (activePrescription?._id) {
        const res = await prescriptionApi.update(activePrescription._id, prescriptionPayload);
        const pres = res?.data?.prescription || res?.prescription;
        if (pres) activePrescription = pres;
      } else {
        const res = await prescriptionApi.create(prescriptionPayload);
        const pres = res?.data?.prescription || res?.prescription;
        if (pres) {
          activePrescription = pres;
          setPrescription(pres);
        }
      }

      // Send full form data on completion to ensure nothing is lost
      await completeConsultation(activeConsultation._id, { ...buildPayload(false), isEdit: editMode });

      if (activePrescription?._id) {
        await prescriptionApi.finalize(activePrescription._id, {
          followUpDate: followUpDate || undefined,
          finalAdvice: dietAdviceText,
          doctorConfirmation: true,
          isEdit: editMode
        });
      }

      toast.success(editMode ? 'Consultation edit completed successfully!' : 'Consultation completed successfully!');
      setIsDirty(false);
      
      if (editMode && onCompleteEdit) {
        onCompleteEdit();
      } else {
        // Update local consultation status so the page renders read-only view with PDF tools
        setConsultation(prev => ({ ...prev, ...activeConsultation, status: 'completed' }));
      }

      // Auto-trigger PDF download/open
      try {
        const res = await downloadConsultationPdf(activeConsultation._id);
        const blob = new Blob([res.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      } catch (pdfErr) {
        console.error('Failed to auto-open PDF:', pdfErr);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to complete consultation.');
    } finally { setCompleting(false); }
  };

  const handleViewPdf = async () => {
    if (!consultation?._id) return;
    setPdfDownloading(true);
    try {
      const res = await downloadConsultationPdf(consultation._id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      toast.error('Failed to download/open consultation PDF.');
    } finally { setPdfDownloading(false); }
  };

  // Medicine Master Search
  const handleMedicineQueryChange = async (index, query) => {
    const updated = [...medicines];
    updated[index].medicineName = query;
    setMedicines(updated);
    setMedicineSearchQuery(query);
    setActiveMedicineIndex(index);
    if (!query.trim()) {
      setMedicineSearchResults([]);
      return;
    }
    try {
      const res = await pharmacyApi.listMedicineMasters({ search: query, limit: 5 });
      if (res?.masters) setMedicineSearchResults(res.masters);
    } catch (err) {
      console.error(err);
    }
  };

  const selectMedicine = (index, med) => {
    const updated = [...medicines];
    updated[index] = {
      ...updated[index],
      medicineName: med.brandName || med.genericName,
      genericName: med.genericName || '',
      dosage: med.strengths?.[0] || ''
    };
    setMedicines(updated);
    setMedicineSearchResults([]);
    setActiveMedicineIndex(null);
    setIsDirty(true);
  };

  const getFieldValue = (fieldPath) => {
    if (!fieldPath) return '';
    if (fieldPath === 'dietAdviceText') return dietAdviceText;
    if (fieldPath === 'lifestyleAdviceText') return lifestyleAdviceText;
    if (fieldPath === 'activityAdviceText') return activityAdviceText;
    if (fieldPath === 'restrictionsText') return restrictionsText;
    if (fieldPath === 'precautionsText') return precautionsText;
    if (fieldPath === 'generalInstructionsText') return generalInstructionsText;
    if (fieldPath === 'treatmentPlanText') return treatmentPlanText;
    if (fieldPath === 'followUpInstructions') return followUpInstructions;
    if (fieldPath === 'followUpReason') return followUpReason;
    
    const segments = fieldPath.split('.');
    let target = form;
    for (let i = 0; i < segments.length; i++) {
      if (!target) return '';
      target = target[segments[i]];
    }
    return target || '';
  };

  const setFieldValue = (fieldPath, value) => {
    if (!fieldPath) return;
    if (fieldPath === 'dietAdviceText') setDietAdviceText(value);
    else if (fieldPath === 'lifestyleAdviceText') setLifestyleAdviceText(value);
    else if (fieldPath === 'activityAdviceText') setActivityAdviceText(value);
    else if (fieldPath === 'restrictionsText') setRestrictionsText(value);
    else if (fieldPath === 'precautionsText') setPrecautionsText(value);
    else if (fieldPath === 'generalInstructionsText') setGeneralInstructionsText(value);
    else if (fieldPath === 'treatmentPlanText') setTreatmentPlanText(value);
    else if (fieldPath === 'followUpInstructions') setFollowUpInstructions(value);
    else if (fieldPath === 'followUpReason') setFollowUpReason(value);
    else {
      setForm((current) => {
        const next = JSON.parse(JSON.stringify(current));
        const segments = fieldPath.split('.');
        let target = next;
        for (let i = 0; i < segments.length - 1; i++) target = target[segments[i]];
        target[segments[segments.length - 1]] = value;
        return next;
      });
    }
    setIsDirty(true);
  };

  // Speech Recognition Implementation (Toolbar & Inline inputs)
  const startVoiceDictation = (fieldPath = null) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Your browser does not support Speech Recognition.');
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }

      dictationInitialValRef.current = getFieldValue(fieldPath);
      dictationAccumulatedRef.current = '';

      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = recordingLanguage;

      rec.onresult = (event) => {
        let interimTrans = '';
        let finalTrans = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTrans += event.results[i][0].transcript + ' ';
          } else {
            interimTrans += event.results[i][0].transcript;
          }
        }

        if (finalTrans) {
          dictationAccumulatedRef.current += finalTrans;
        }

        const sessionText = (dictationAccumulatedRef.current + interimTrans).trim();
        const fullText = dictationInitialValRef.current 
          ? (dictationInitialValRef.current + ' ' + sessionText).trim()
          : sessionText;

        if (fieldPath) {
          setFieldValue(fieldPath, fullText);
        } else {
          // General dictate
          setForm(current => {
            const updatedText = (current.transcript_text + ' ' + finalTrans).trim();
            const lowerTrans = finalTrans.toLowerCase();
            let nextChief = current.chiefComplaint;
            let nextHpi = current.clinicalNotes;
            let nextDiag = current.diagnosis.primary;
            
            if (lowerTrans.includes('complaint is') || lowerTrans.includes('complaining of')) {
              nextChief = (nextChief + ' ' + finalTrans).trim();
            }
            if (lowerTrans.includes('fever started') || lowerTrans.includes('pain since')) {
              nextHpi = (nextHpi + ' ' + finalTrans).trim();
            }
            if (lowerTrans.includes('diagnosis is') || lowerTrans.includes('diagnose as')) {
              nextDiag = (nextDiag + ' ' + finalTrans).trim();
            }

            return {
              ...current,
              transcript_text: updatedText,
              chiefComplaint: nextChief,
              clinicalNotes: nextHpi,
              diagnosis: { ...current.diagnosis, primary: nextDiag }
            };
          });
          setIsDirty(true);
        }
      };

      rec.onstart = () => {
        setIsRecording(true);
        setIsPaused(false);
        setDictatingField(fieldPath);
        setRecordingSeconds(0);
        timerRef.current = setInterval(() => {
          setRecordingSeconds(prev => prev + 1);
        }, 1000);
      };

      rec.onend = () => {
        setIsRecording(false);
        setDictatingField(null);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };

      rec.start();
      recognitionRef.current = rec;
    } catch (e) {
      console.error(e);
      toast.error('Failed to initialize speech recognition.');
    }
  };

  const stopVoiceDictation = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
    setIsPaused(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const pauseVoiceDictation = () => {
    if (recognitionRef.current && isRecording && !isPaused) {
      recognitionRef.current.stop();
      setIsPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const resumeVoiceDictation = () => {
    if (isPaused) {
      startVoiceDictation(dictatingField);
    }
  };

  // Lab Category & search filters
  const filteredLabTests = useMemo(() => {
    return availableLabTests.filter(t => {
      const matchQuery = !labSearchQuery || t.name?.toLowerCase().includes(labSearchQuery.toLowerCase());
      const matchCategory = selectedLabCategory === 'All Categories' || t.category === selectedLabCategory;
      const matchProvider = selectedLabProvider === 'All Providers' || t.provider === selectedLabProvider;
      return matchQuery && matchCategory && matchProvider;
    });
  }, [availableLabTests, labSearchQuery, selectedLabCategory, selectedLabProvider]);

  // Request Access handlers for premium AI modules
  const handleRequestAccess = (featureCode) => {
    toast.success(`Access request sent to Clinic Admin for AI Module: ${featureCode}`);
  };

  if (loading) return <LoadingState label="Loading consultation workspace..." />;
  if (error && !patient && !appointment && !consultation) return <ErrorState title="Consultation workspace unavailable" description={error} />;

  const isReadOnly = consultation?.status === 'completed';
  const patientName = patient?.fullName || 'Patient';
  const doctorName = doctor?.fullName || 'Doctor';
  const apptDate = appointment?.appointmentDate ? new Date(appointment.appointmentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const apptTime = `${appointment?.startTime || '—'} – ${appointment?.endTime || '—'}`;
  const consultType = appointment?.consultationType || 'In-Clinic';
  const specialization = doctor?.specialization || 'General Physician';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased flex flex-col">

      {/* ─── Top Header Info Bar ─── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">

        {/* Patient Profile Metadata */}
        <div className="flex items-center gap-3.5">
          {patient?.avatarUrl ? (
            <img src={patient.avatarUrl} alt="Patient" className="w-12 h-12 rounded-full object-cover border border-slate-200 shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-205 text-indigo-650 flex items-center justify-center shrink-0 text-base">
              <FontAwesomeIcon icon={byPrefixAndName.fas['user']} />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-slate-900 leading-none">{patientName}</h1>
              <span className="text-[10px] bg-slate-100 text-slate-605 border border-slate-200 font-extrabold px-2 py-0.5 rounded-full uppercase">
                {patient?.gender || 'M'} • {patient?.age || '24'} Y • 15 Aug 2000
              </span>
            </div>
            <p className="text-[10px] font-bold text-slate-455 uppercase tracking-wide mt-1">
              UHID: {patient?.patientId || 'PAT-2026-0711-0001'}
            </p>
          </div>
        </div>

        {/* Appointment Status Info */}
        <div className="flex flex-wrap items-center gap-6">
          <div className="text-right">
            <span className="text-[8px] text-slate-400 font-black uppercase tracking-wider block">Appointment</span>
            <strong className="text-xs font-extrabold text-slate-850">#APT-2026-0711-032</strong>
            <span className="text-[9px] text-slate-500 block mt-0.5">{apptDate} | {apptTime}</span>
            <span className="text-[9px] text-slate-405 block">{consultType} • Cardiology</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 text-center min-w-[80px]">
            <p className="text-[8px] text-slate-450 font-black uppercase tracking-wider">Token</p>
            <p className="text-sm font-black text-indigo-705 mt-0.5">{appointment?.tokenNumber || 'OP-12'}</p>
          </div>

          {/* Doctor Avatar + Name (Using FontAwesomeIcon as fallback) */}
          <div className="flex items-center gap-2.5 border-l border-slate-200 pl-6">
            {doctor?.avatarUrl ? (
              <img src={doctor.avatarUrl} alt="Doctor" className="w-10 h-10 rounded-full object-cover border border-slate-200" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-707 flex items-center justify-center shrink-0">
                <FontAwesomeIcon icon={byPrefixAndName.fas['user-doctor']} />
              </div>
            )}
            <div>
              <h3 className="text-xs font-black text-slate-800 leading-tight">{doctorName}</h3>
              <p className="text-[9px] text-slate-405 font-bold leading-tight mt-0.5">{specialization}</p>
              <p className="text-[9px] text-slate-405 leading-tight">Reg No. 98765</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Premium AI Voice-to-Text persistent bar ─── */}
      <div className="px-6 pt-4 shrink-0">
        {!voiceToTextFeature.enabled ? (
          <PremiumFeaturePlaceholder
            featureCode="voice_to_text"
            featureName="AI Voice Consultation (Ambient Autofill)"
            description="Uses AI to transcribe talks between doctor and patient, understands the conversation, and automatically fills up the consultation form page."
            onRequested={() => handleRequestAccess('voice_to_text')}
          />
        ) : (
          <div className="bg-gradient-to-r from-violet-50/50 to-indigo-50/50 border border-indigo-100 rounded-2xl p-4.5 flex flex-col gap-2 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-indigo-705 uppercase tracking-wider">AI VOICE CONSULTATION <span className="text-[10px] text-slate-405 font-semibold">(Premium Ambient Feature)</span></span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (isRecording) {
                        stopVoiceDictation();
                      } else {
                        startVoiceDictation();
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${isRecording ? 'bg-indigo-650 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                  >
                    <Mic size={14} className={isRecording && !isPaused ? 'animate-pulse text-indigo-500' : ''} />
                    {isRecording ? 'Listening...' : 'Record'}
                  </button>
                </div>
              </div>

              {/* Voice Wave Mockup */}
              {isRecording && !isPaused && (
                <div className="flex items-center gap-0.5 px-3">
                  <span className="w-1 h-3 bg-indigo-500 rounded animate-pulse" />
                  <span className="w-1 h-5 bg-indigo-500 rounded animate-pulse" />
                  <span className="w-1 h-4 bg-indigo-500 rounded animate-pulse" />
                  <span className="w-1 h-6 bg-indigo-500 rounded animate-pulse" />
                  <span className="w-1 h-3 bg-indigo-500 rounded animate-pulse" />
                  <span className="w-1 h-5 bg-indigo-500 rounded animate-pulse" />
                </div>
              )}

              <div className="flex items-center gap-3">
                {/* Recording Timer */}
                {isRecording && (
                  <span className="text-xs font-bold text-slate-600 font-mono">
                    {Math.floor(recordingSeconds / 60).toString().padStart(2, '0')}:{(recordingSeconds % 60).toString().padStart(2, '0')}
                  </span>
                )}

                {isRecording && (
                  <button
                    onClick={isPaused ? resumeVoiceDictation : pauseVoiceDictation}
                    className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition"
                  >
                    {isPaused ? 'Resume' : 'Pause'}
                  </button>
                )}

                {isRecording && (
                  <button
                    onClick={stopVoiceDictation}
                    className="px-3 py-1.5 bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100/50 rounded-xl text-xs font-bold transition"
                  >
                    Stop
                  </button>
                )}

                <button className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition flex items-center gap-1.5">
                  <Upload size={13} /> Upload Audio
                </button>

                <select
                  value={recordingLanguage}
                  onChange={(e) => setRecordingLanguage(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                >
                  <option value="en-US">English (US)</option>
                  <option value="en-IN">English (India)</option>
                  <option value="hi-IN">Hindi (हिंदी)</option>
                </select>

                <div className="flex items-center gap-1 text-xs">
                  <span className="text-slate-450 font-bold uppercase text-[9px]">Speaker</span>
                  <select className="px-2 py-1 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none">
                    <option>Doctor</option>
                    <option>Patient</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">Auto fill on</span>
                  <input type="checkbox" defaultChecked className="rounded border-slate-205 text-indigo-655 focus:ring-indigo-505" />
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-455 font-semibold flex items-center justify-between mt-1">
              <span>✨ AI is transcribing your speech and filling the relevant fields automatically. You can edit anytime.</span>
              <a href="#" className="text-indigo-650 hover:underline">Learn more</a>
            </p>
          </div>
        )}
      </div>

      {/* Action Toolbar */}
      <div className="px-6 pt-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          {consultation?.status === 'completed' && (
            <button
              onClick={handleViewPdf}
              disabled={pdfDownloading}
              className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-655 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <FileDown size={14} /> View / Print PDF
            </button>
          )}
          <button className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-655 rounded-xl text-xs font-bold transition">
            Order Lab
          </button>
          <button className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-655 rounded-xl text-xs font-bold transition">
            Create Invoice
          </button>
        </div>

        <div className="flex items-center gap-2">
          {consultation?.status !== 'completed' ? (
            <>
              {editMode && (
                <button
                  onClick={onCancelEdit}
                  className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Cancel Edit
                </button>
              )}
              <button
                onClick={handleSaveDraft}
                disabled={saving}
                className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                onClick={handleComplete}
                disabled={completing}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {completing ? 'Completing...' : (editMode ? 'Complete Edit' : 'Complete Consultation')}
              </button>
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold">
              <Check size={14} className="text-emerald-500" /> Consultation Completed
            </span>
          )}
        </div>
      </div>

      {/* ─── 3 Column Grid Layout ─── */}
      <div className={`flex-1 grid grid-cols-1 ${['Previous Visits', 'Current Medicines', 'Chronic Conditions'].includes(workspaceTab) ? 'lg:grid-cols-[280px_1fr]' : 'lg:grid-cols-[280px_1fr_320px]'} gap-6 p-6 items-stretch`}>

        {/* LEFT COLUMN: Dynamic Patient Summary/Lab Overview */}
        <div className="flex flex-col gap-5">
          {workspaceTab === 'Laboratory' ? (
            <>
              {/* Laboratory Specific Left Column */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-450">LAB OVERVIEW</h3>
                <div className="flex flex-col gap-1 text-xs">
                  <button className="w-full text-left py-2 px-3 bg-indigo-50 border-l-2 border-indigo-650 text-indigo-707 font-extrabold rounded-r-lg">All Tests</button>
                  <button className="w-full text-left py-2 px-3 hover:bg-slate-50 text-slate-650 font-bold rounded-lg flex justify-between">
                    Recommended <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded text-[10px] font-black">AI</span>
                  </button>
                  <button className="w-full text-left py-2 px-3 hover:bg-slate-50 text-slate-655 font-bold rounded-lg">Frequently Ordered</button>
                  <button className="w-full text-left py-2 px-3 hover:bg-slate-50 text-slate-655 font-bold rounded-lg">Recent Orders</button>
                  <button className="w-full text-left py-2 px-3 hover:bg-slate-50 text-slate-655 font-bold rounded-lg">Favourites</button>
                  <button className="w-full text-left py-2 px-3 hover:bg-slate-50 text-slate-655 font-bold rounded-lg">Packages / Profiles</button>
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-450">TODAY'S LAB REPORTS</h3>
                <div className="space-y-3.5 text-xs">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <div><strong className="text-slate-850">CBC</strong><span className="text-[10px] text-slate-400 block mt-0.5">10 Jul 2026</span></div>
                    <span className="text-[10px] text-emerald-600 font-extrabold">Completed</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <div><strong className="text-slate-850">Lipid Profile</strong><span className="text-[10px] text-slate-400 block mt-0.5">02 May 2026</span></div>
                    <span className="text-[10px] text-emerald-600 font-extrabold">Completed</span>
                  </div>
                  <div className="flex justify-between items-center pb-1">
                    <div><strong className="text-slate-850">TSH</strong><span className="text-[10px] text-slate-400 block mt-0.5">15 Feb 2026</span></div>
                    <span className="text-[10px] text-emerald-600 font-extrabold">Completed</span>
                  </div>
                  <button className="w-full py-2 bg-slate-50 hover:bg-slate-105 text-slate-600 font-bold border border-slate-200 rounded-xl text-center transition">View All Reports</button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* General Patient Summary Left Column */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-450">PATIENT OVERVIEW</h3>
                <div className="flex flex-col gap-1 text-xs">
                  <button onClick={() => setWorkspaceTab('History')} className={`w-full text-left py-2 px-3 rounded-lg font-bold flex justify-between ${workspaceTab === 'History' ? 'bg-indigo-50 border-l-2 border-indigo-650 text-indigo-707 font-extrabold' : 'hover:bg-slate-50 text-slate-650'}`}>Overview</button>
                  <button className="w-full text-left py-2 px-3 hover:bg-slate-50 text-slate-650 font-bold rounded-lg flex justify-between">
                    Allergies (2) <span className="bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded text-[10px] font-black">2</span>
                  </button>
                  <button onClick={() => setWorkspaceTab('Current Medicines')} className={`w-full text-left py-2 px-3 rounded-lg font-bold flex justify-between ${workspaceTab === 'Current Medicines' ? 'bg-indigo-50 border-l-2 border-indigo-650 text-indigo-707 font-extrabold' : 'hover:bg-slate-50 text-slate-650'}`}>
                    Current Medicines (4) <span className="bg-indigo-50 text-indigo-605 px-1.5 py-0.5 rounded text-[10px] font-black">4</span>
                  </button>
                  <button onClick={() => setWorkspaceTab('Chronic Conditions')} className={`w-full text-left py-2 px-3 rounded-lg font-bold flex justify-between ${workspaceTab === 'Chronic Conditions' ? 'bg-indigo-50 border-l-2 border-indigo-650 text-indigo-707 font-extrabold' : 'hover:bg-slate-50 text-slate-650'}`}>
                    Chronic Conditions (2) <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded text-[10px] font-black">2</span>
                  </button>
                  <button onClick={() => setWorkspaceTab('Previous Visits')} className={`w-full text-left py-2 px-3 rounded-lg font-bold ${workspaceTab === 'Previous Visits' ? 'bg-indigo-50 border-l-2 border-indigo-650 text-indigo-707 font-extrabold' : 'hover:bg-slate-50 text-slate-655'}`}>Previous Visits</button>
                  <button onClick={() => setWorkspaceTab('Laboratory')} className={`w-full text-left py-2 px-3 rounded-lg font-bold ${workspaceTab === 'Laboratory' ? 'bg-indigo-50 border-l-2 border-indigo-650 text-indigo-707 font-extrabold' : 'hover:bg-slate-50 text-slate-655'}`}>Lab History</button>
                  <button className="w-full text-left py-2 px-3 hover:bg-slate-50 text-slate-655 font-bold rounded-lg flex justify-between">
                    Documents (4) <span className="text-slate-400">4</span>
                  </button>
                  <button className="w-full text-left py-2 px-3 hover:bg-slate-50 text-slate-655 font-bold rounded-lg">Family History</button>
                  <button className="w-full text-left py-2 px-3 hover:bg-slate-50 text-slate-655 font-bold rounded-lg">Vaccinations</button>
                </div>
              </div>

              {/* Vitals Panel */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">VITALS <span className="text-[10px] text-slate-400 font-semibold">(Today 01:05 PM)</span></h3>
                  <button onClick={() => setWorkspaceTab('Examination')} className="text-[10px] text-indigo-650 hover:text-indigo-850 font-black uppercase tracking-wider">Edit</button>
                </div>
                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="bg-slate-50/50 p-2 border border-slate-100 rounded-2xl">
                    <span className="text-slate-400 block font-bold text-[8px] uppercase">BP</span>
                    <strong className="text-slate-800 font-extrabold text-[11px] block mt-0.5">{form.vitals.bloodPressure || '120/80'}</strong>
                    <span className="text-[8px] text-slate-400 block">mmHg</span>
                  </div>
                  <div className="bg-slate-50/50 p-2 border border-slate-100 rounded-2xl">
                    <span className="text-slate-400 block font-bold text-[8px] uppercase">Pulse</span>
                    <strong className="text-slate-800 font-extrabold text-[11px] block mt-0.5">{form.vitals.pulse || '78'}</strong>
                    <span className="text-[8px] text-slate-400 block">bpm</span>
                  </div>
                  <div className="bg-slate-50/50 p-2 border border-slate-100 rounded-2xl">
                    <span className="text-slate-400 block font-bold text-[8px] uppercase">Temp.</span>
                    <strong className="text-slate-800 font-extrabold text-[11px] block mt-0.5">{form.vitals.temperature || '98.6'}</strong>
                    <span className="text-[8px] text-slate-400 block">°F</span>
                  </div>
                  <div className="bg-slate-50/50 p-2 border border-slate-100 rounded-2xl">
                    <span className="text-slate-400 block font-bold text-[8px] uppercase">SpO₂</span>
                    <strong className="text-slate-800 font-extrabold text-[11px] block mt-0.5">{form.vitals.oxygenSaturation || '98'}</strong>
                    <span className="text-[8px] text-slate-400 block">%</span>
                  </div>
                  <div className="bg-slate-50/50 p-2 border border-slate-100 rounded-2xl">
                    <span className="text-slate-400 block font-bold text-[8px] uppercase">Resp. Rate</span>
                    <strong className="text-slate-800 font-extrabold text-[11px] block mt-0.5">{form.vitals.respiratoryRate || '18'}</strong>
                    <span className="text-[8px] text-slate-400 block">/min</span>
                  </div>
                  <div className="bg-slate-50/50 p-2 border border-slate-100 rounded-2xl">
                    <span className="text-slate-400 block font-bold text-[8px] uppercase">Weight</span>
                    <strong className="text-slate-800 font-extrabold text-[11px] block mt-0.5">{form.vitals.weight || '65'}</strong>
                    <span className="text-[8px] text-slate-400 block">kg</span>
                  </div>
                  <div className="bg-slate-50/50 p-2 border border-slate-100 rounded-2xl">
                    <span className="text-slate-400 block font-bold text-[8px] uppercase">Height</span>
                    <strong className="text-slate-800 font-extrabold text-[11px] block mt-0.5">{form.vitals.height || '175'}</strong>
                    <span className="text-[8px] text-slate-400 block">cm</span>
                  </div>
                  <div className="bg-slate-50/50 p-2 border border-slate-100 rounded-2xl">
                    <span className="text-slate-400 block font-bold text-[8px] uppercase">BMI</span>
                    <strong className="text-slate-800 font-extrabold text-[11px] block mt-0.5">21.2</strong>
                    <span className="text-[8px] text-slate-400 block">kg/m²</span>
                  </div>
                  <div className="bg-slate-50/50 p-2 border border-slate-100 rounded-2xl">
                    <span className="text-slate-400 block font-bold text-[8px] uppercase">Pain Score</span>
                    <strong className="text-slate-800 font-extrabold text-[11px] block mt-0.5">{form.vitals.painScore || '0'}</strong>
                    <span className="text-[8px] text-slate-400 block">/10</span>
                  </div>
                </div>
                <button
                  onClick={() => setWorkspaceTab('Examination')}
                  className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-707 font-bold rounded-xl text-center text-xs mt-2"
                >
                  + Add Vital
                </button>
              </div>
            </>
          )}
        </div>

        {/* MIDDLE COLUMN: Redesigned Workspace Panel with 8 Tabs */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 flex flex-col gap-6 items-stretch">

          {/* Workspace Tab Headers */}
          <div className="flex border-b border-slate-200 overflow-x-auto pb-0.5 gap-2 shrink-0">
            {['History', 'Examination', 'Diagnosis', 'Prescription', 'Laboratory', 'Procedures', 'Advice', 'Follow-up', 'Previous Visits', 'Current Medicines', 'Chronic Conditions'].map((tab) => (
              <button
                key={tab}
                onClick={() => setWorkspaceTab(tab)}
                className={`pb-3 px-4 font-bold text-xs transition border-b-2 whitespace-nowrap ${workspaceTab === tab
                    ? 'border-indigo-650 text-indigo-705 font-black'
                    : 'border-transparent text-slate-405 hover:text-slate-700'
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Workspace Tab Contents */}
          <div className="flex-1 overflow-y-auto">
            {workspaceTab === 'History' && (
              <div className="space-y-5">

                {/* Chief Complaint */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/40">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center text-sm">📋</div>
                      <span className="text-sm font-bold text-slate-800">Chief Complaint</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (isRecording && dictatingField === 'chiefComplaint') {
                            stopVoiceDictation();
                          } else {
                            startVoiceDictation('chiefComplaint');
                          }
                        }}
                        className={`p-1.5 rounded-lg transition ${
                          isRecording && dictatingField === 'chiefComplaint'
                            ? 'text-rose-600 bg-rose-50 animate-pulse'
                            : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                        }`}
                        title={isRecording && dictatingField === 'chiefComplaint' ? 'Stop Recording' : 'Start Dictation'}
                      >
                        <Mic size={13} />
                      </button>
                      <button className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 font-medium transition">
                        <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5.5 9.5L2 13M2 13H6M2 13V9M10.5 6.5L14 3M14 3H10M14 3V7" /></svg>
                        Expand
                      </button>
                    </div>
                  </div>
                  <div className="px-4 py-3">
                    <textarea
                      value={form.chiefComplaint}
                      onChange={(e) => handleFieldChange('chiefComplaint', e.target.value)}
                      placeholder="Patient complains of fever with body ache and mild headache since 2 days."
                      rows={3}
                      className="w-full px-0 py-0 text-xs text-slate-700 border-0 focus:outline-none focus:ring-0 resize-none placeholder-slate-400 leading-relaxed bg-transparent"
                    />
                  </div>
                </div>

                {/* History of Present Illness */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/40">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center text-sm">🔮</div>
                      <span className="text-sm font-bold text-slate-800">History of Present Illness</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (isRecording && dictatingField === 'clinicalNotes') {
                            stopVoiceDictation();
                          } else {
                            startVoiceDictation('clinicalNotes');
                          }
                        }}
                        className={`p-1.5 rounded-lg transition ${
                          isRecording && dictatingField === 'clinicalNotes'
                            ? 'text-rose-600 bg-rose-50 animate-pulse'
                            : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                        }`}
                        title={isRecording && dictatingField === 'clinicalNotes' ? 'Stop Recording' : 'Start Dictation'}
                      >
                        <Mic size={13} />
                      </button>
                      <button className="px-2.5 py-1 text-xs text-slate-500 font-bold border border-slate-200 rounded-lg hover:bg-slate-50 transition flex items-center gap-1">
                        📋 Templates <span className="text-slate-300">▾</span>
                      </button>
                      <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
                        <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5.5 9.5L2 13M2 13H6M2 13V9M10.5 6.5L14 3M14 3H10M14 3V7" /></svg>
                      </button>
                    </div>
                  </div>
                  <div className="px-4 py-3">
                    <textarea
                      value={form.clinicalNotes}
                      onChange={(e) => handleFieldChange('clinicalNotes', e.target.value)}
                      placeholder="Fever started 2 days back, intermittent, high grade, associated with chills..."
                      rows={4}
                      className="w-full px-0 py-0 text-xs text-slate-700 border-0 focus:outline-none focus:ring-0 resize-none placeholder-slate-400 leading-relaxed bg-transparent"
                    />
                    <label className="flex items-center gap-2 mt-2 text-xs text-slate-500 cursor-pointer">
                      <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-300 accent-indigo-600" />
                      <span>No significant history</span>
                    </label>
                  </div>
                </div>

                {/* Past Medical History */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/40">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-sm">🏥</div>
                      <span className="text-sm font-bold text-slate-800">Past Medical History</span>
                    </div>
                    <button type="button" onClick={handleAddPastMedicalHistory} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition">
                      <Plus size={12} /> Add
                    </button>
                  </div>
                  <div className="px-4 py-3 flex flex-col gap-2">
                    <div className="flex flex-wrap gap-2">
                      {pastMedicalHistory.map((condition) => (
                        <span key={condition} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-700 text-[10px] font-bold">
                          <CheckCircle2 size={10} className="text-emerald-500" /> {condition}
                        </span>
                      ))}
                    </div>
                    {showPmhInput && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                        <input
                          type="text"
                          value={pmhInputVal}
                          onChange={(e) => setPmhInputVal(e.target.value)}
                          placeholder="e.g. No Thyroid Disorder"
                          className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 bg-white"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && pmhInputVal.trim()) {
                              setPastMedicalHistory([...pastMedicalHistory, pmhInputVal.trim()]);
                              setPmhInputVal('');
                              setShowPmhInput(false);
                              setIsDirty(true);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (pmhInputVal.trim()) {
                              setPastMedicalHistory([...pastMedicalHistory, pmhInputVal.trim()]);
                              setPmhInputVal('');
                              setShowPmhInput(false);
                              setIsDirty(true);
                            }
                          }}
                          className="text-[10px] font-bold text-white bg-indigo-650 hover:bg-indigo-707 px-3 py-1.5 rounded-xl transition"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowPmhInput(false);
                            setPmhInputVal('');
                          }}
                          className="text-[10px] font-bold text-slate-500 hover:bg-slate-100 px-3 py-1.5 rounded-xl transition"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Family History */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/40">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-sm">👨‍👩‍👧</div>
                      <span className="text-sm font-bold text-slate-800">Family History</span>
                    </div>
                    <button type="button" onClick={handleAddFamilyHistory} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition">
                      <Plus size={12} /> Add
                    </button>
                  </div>
                  <div className="px-4 py-3 flex flex-col gap-2">
                    <div className="flex flex-wrap gap-2.5">
                      {familyHistory.map((item) => (
                        <label key={item.label} className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={(e) => {
                              const updated = familyHistory.map(x => x.label === item.label ? { ...x, checked: e.target.checked } : x);
                              setFamilyHistory(updated);
                              setIsDirty(true);
                            }}
                            className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                          />
                          <span>{item.label}</span>
                        </label>
                      ))}
                    </div>
                    {showFamilyInput && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                        <input
                          type="text"
                          value={familyInputVal}
                          onChange={(e) => setFamilyInputVal(e.target.value)}
                          placeholder="e.g. Brother: Asthma"
                          className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 bg-white"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && familyInputVal.trim()) {
                              setFamilyHistory([...familyHistory, { label: familyInputVal.trim(), checked: true }]);
                              setFamilyInputVal('');
                              setShowFamilyInput(false);
                              setIsDirty(true);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (familyInputVal.trim()) {
                              setFamilyHistory([...familyHistory, { label: familyInputVal.trim(), checked: true }]);
                              setFamilyInputVal('');
                              setShowFamilyInput(false);
                              setIsDirty(true);
                            }
                          }}
                          className="text-[10px] font-bold text-white bg-indigo-650 hover:bg-indigo-707 px-3 py-1.5 rounded-xl transition"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowFamilyInput(false);
                            setFamilyInputVal('');
                          }}
                          className="text-[10px] font-bold text-slate-500 hover:bg-slate-100 px-3 py-1.5 rounded-xl transition"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Social History */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/40">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center text-sm">🌍</div>
                      <span className="text-sm font-bold text-slate-800">Social History</span>
                    </div>
                    <button type="button" onClick={handleAddSocialHistory} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition">
                      <Plus size={12} /> Add
                    </button>
                  </div>
                  <div className="px-4 py-3 flex flex-col gap-2">
                    <div className="flex flex-wrap gap-2.5">
                      {socialHistory.map((item) => (
                        <label key={item.label} className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.active}
                            onChange={(e) => {
                              const updated = socialHistory.map(x => x.label === item.label ? { ...x, active: e.target.checked } : x);
                              setSocialHistory(updated);
                              setIsDirty(true);
                            }}
                            className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                          />
                          <span className={item.active ? 'text-emerald-700 font-bold' : 'text-slate-500'}>{item.label}</span>
                        </label>
                      ))}
                    </div>
                    {showSocialInput && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                        <input
                          type="text"
                          value={socialInputVal}
                          onChange={(e) => setSocialInputVal(e.target.value)}
                          placeholder="e.g. Non Smoker"
                          className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 bg-white"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && socialInputVal.trim()) {
                              setSocialHistory([...socialHistory, { label: socialInputVal.trim(), active: true }]);
                              setSocialInputVal('');
                              setShowSocialInput(false);
                              setIsDirty(true);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (socialInputVal.trim()) {
                              setSocialHistory([...socialHistory, { label: socialInputVal.trim(), active: true }]);
                              setSocialInputVal('');
                              setShowSocialInput(false);
                              setIsDirty(true);
                            }
                          }}
                          className="text-[10px] font-bold text-white bg-indigo-650 hover:bg-indigo-707 px-3 py-1.5 rounded-xl transition"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowSocialInput(false);
                            setSocialInputVal('');
                          }}
                          className="text-[10px] font-bold text-slate-500 hover:bg-slate-100 px-3 py-1.5 rounded-xl transition"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Lifestyle */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/40">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center text-sm">🏃</div>
                      <span className="text-sm font-bold text-slate-800">Lifestyle</span>
                    </div>
                    <button type="button" onClick={handleAddLifestyle} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition">
                      <Plus size={12} /> Add
                    </button>
                  </div>
                  <div className="px-4 py-3 flex flex-col gap-2">
                    <div className="flex flex-wrap gap-2 text-xs">
                      {lifestyleHistory.length > 0 ? (
                        lifestyleHistory.map((item) => (
                          <span key={item} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-250 text-green-700 font-bold rounded-full">
                            ⭐ {item}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 italic">No lifestyle details recorded. Click + Add to record.</span>
                      )}
                    </div>
                    {showLifestyleInput && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                        <input
                          type="text"
                          value={lifestyleInputVal}
                          onChange={(e) => setLifestyleInputVal(e.target.value)}
                          placeholder="e.g. Regular exercise 3 times/week"
                          className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 bg-white w-64"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && lifestyleInputVal.trim()) {
                              setLifestyleHistory([...lifestyleHistory, lifestyleInputVal.trim()]);
                              setLifestyleInputVal('');
                              setShowLifestyleInput(false);
                              setIsDirty(true);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (lifestyleInputVal.trim()) {
                              setLifestyleHistory([...lifestyleHistory, lifestyleInputVal.trim()]);
                              setLifestyleInputVal('');
                              setShowLifestyleInput(false);
                              setIsDirty(true);
                            }
                          }}
                          className="text-[10px] font-bold text-white bg-indigo-650 hover:bg-indigo-707 px-3 py-1.5 rounded-xl transition"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowLifestyleInput(false);
                            setLifestyleInputVal('');
                          }}
                          className="text-[10px] font-bold text-slate-500 hover:bg-slate-100 px-3 py-1.5 rounded-xl transition"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}

            {workspaceTab === 'Examination' && (
              <div className="space-y-5">

                {/* Vitals Section */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center">
                        <Heart size={12} className="text-emerald-500" />
                      </div>
                      <span className="text-sm font-bold text-slate-800">Vitals</span>
                      <span className="text-[10px] text-slate-400">Recorded at {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={handleAddCustomVital} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition">
                        <Plus size={11} /> Add Custom Vital
                      </button>
                      <button className="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 border border-slate-200 rounded-lg px-2 py-1 hover:bg-slate-50 transition">
                        <RefreshCw size={10} /> Re-record
                      </button>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    {showCustomVitalInput && (
                      <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 flex flex-wrap items-center gap-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Vital Name</span>
                          <input
                            type="text"
                            value={customVitalName}
                            onChange={(e) => setCustomVitalName(e.target.value)}
                            placeholder="e.g. Blood Sugar"
                            className="text-xs px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none bg-white w-32"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Unit</span>
                          <input
                            type="text"
                            value={customVitalUnit}
                            onChange={(e) => setCustomVitalUnit(e.target.value)}
                            placeholder="e.g. mg/dL"
                            className="text-xs px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none bg-white w-20"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Value</span>
                          <input
                            type="text"
                            value={customVitalValue}
                            onChange={(e) => setCustomVitalValue(e.target.value)}
                            placeholder="e.g. 110"
                            className="text-xs px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none bg-white w-20"
                          />
                        </div>
                        <div className="flex items-end gap-1.5 h-full mt-4">
                          <button
                            type="button"
                            onClick={() => {
                              if (customVitalName.trim() && customVitalValue.trim()) {
                                const key = customVitalName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                                setForm(prev => ({
                                  ...prev,
                                  vitals: {
                                    ...prev.vitals,
                                    [key]: customVitalValue.trim()
                                  }
                                }));
                                setCustomVitals([...customVitals, {
                                  key,
                                  label: customVitalName.trim(),
                                  value: customVitalValue.trim(),
                                  unit: customVitalUnit.trim(),
                                  bg: 'bg-indigo-50',
                                  border: 'border-indigo-100',
                                  icon: '📊',
                                  color: 'text-indigo-650'
                                }]);
                                setCustomVitalName('');
                                setCustomVitalUnit('');
                                setCustomVitalValue('');
                                setShowCustomVitalInput(false);
                                setIsDirty(true);
                              }
                            }}
                            className="text-[10px] font-bold text-white bg-indigo-650 hover:bg-indigo-707 px-3 py-1.5 rounded-lg transition"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowCustomVitalInput(false);
                              setCustomVitalName('');
                              setCustomVitalUnit('');
                              setCustomVitalValue('');
                            }}
                            className="text-[10px] font-bold text-slate-500 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    {/* Row 1: 5 main vitals */}
                    <div className="grid grid-cols-5 gap-3">
                      {[
                        { key: 'temperature', label: 'Temperature', value: form.vitals.temperature, unit: '°F', bg: 'bg-red-50', border: 'border-red-100', icon: '🌡️', color: 'text-red-500' },
                        { key: 'bloodPressure', label: 'Blood Pressure', value: form.vitals.bloodPressure, unit: 'mmHg', bg: 'bg-rose-50', border: 'border-rose-100', icon: '❤️', color: 'text-rose-500' },
                        { key: 'pulse', label: 'Pulse Rate', value: form.vitals.pulse, unit: 'bpm', bg: 'bg-purple-50', border: 'border-purple-100', icon: '💜', color: 'text-purple-500' },
                        { key: 'respiratoryRate', label: 'Respiratory Rate', value: form.vitals.respiratoryRate, unit: '/min', bg: 'bg-blue-50', border: 'border-blue-100', icon: '💧', color: 'text-blue-500' },
                        { key: 'oxygenSaturation', label: 'SpO₂', value: form.vitals.oxygenSaturation, unit: '%', bg: 'bg-sky-50', border: 'border-sky-100', icon: '🫁', color: 'text-sky-500' },
                      ].map((v) => (
                        <div key={v.key} className={`${v.bg} border ${v.border} rounded-xl p-3 flex flex-col gap-1 group`}>
                          <div className="flex items-center justify-between">
                            <span className="text-lg">{v.icon}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase leading-tight text-right">{v.label}</span>
                          </div>
                          <input
                            type="text"
                            value={v.value}
                            onChange={(e) => handleFieldChange(`vitals.${v.key}`, e.target.value)}
                            className={`text-xl font-black ${v.color} bg-transparent border-0 focus:outline-none w-full p-0`}
                          />
                          <span className="text-[9px] text-slate-400 font-medium">{v.unit}</span>
                        </div>
                      ))}
                    </div>
                    {/* Row 2: 5 secondary vitals */}
                    <div className="grid grid-cols-5 gap-3">
                      {[
                        { key: 'height', label: 'Height', value: form.vitals.height, unit: 'cm', bg: 'bg-indigo-50', border: 'border-indigo-100', icon: '📏', color: 'text-indigo-600' },
                        { key: 'weight', label: 'Weight', value: form.vitals.weight, unit: 'kg', bg: 'bg-orange-50', border: 'border-orange-100', icon: '⚖️', color: 'text-orange-500' },
                        { key: 'bmi', label: 'BMI', value: (form.vitals.height && form.vitals.weight) ? (form.vitals.weight / Math.pow(form.vitals.height / 100, 2)).toFixed(1) : '--', unit: 'kg/m²', bg: 'bg-green-50', border: 'border-green-100', icon: '📊', color: 'text-green-600', readOnly: true },
                        { key: 'painScore', label: 'Pain Score', value: form.vitals.painScore, unit: '/10', bg: 'bg-yellow-50', border: 'border-yellow-100', icon: '😐', color: 'text-yellow-600' },
                        { key: 'bloodSugar', label: 'Blood Sugar', value: form.vitals.bloodSugar || '--', unit: 'mg/dL', bg: 'bg-violet-50', border: 'border-violet-100', icon: '🩸', color: 'text-violet-600' },
                      ].map((v) => (
                        <div key={v.key} className={`${v.bg} border ${v.border} rounded-xl p-3 flex flex-col gap-1`}>
                          <div className="flex items-center justify-between">
                            <span className="text-lg">{v.icon}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase leading-tight text-right">{v.label}</span>
                          </div>
                          {v.readOnly ? (
                            <span className={`text-xl font-black ${v.color}`}>{v.value}</span>
                          ) : (
                            <input
                              type="text"
                              value={v.value}
                              onChange={(e) => handleFieldChange(`vitals.${v.key}`, e.target.value)}
                              className={`text-xl font-black ${v.color} bg-transparent border-0 focus:outline-none w-full p-0`}
                            />
                          )}
                          <span className="text-[9px] text-slate-400 font-medium">{v.unit}</span>
                        </div>
                      ))}
                    </div>
                    {/* Row 3: Custom vitals */}
                    {customVitals.length > 0 && (
                      <div className="grid grid-cols-5 gap-3 mt-3">
                        {customVitals.map((v) => (
                          <div key={v.key} className={`${v.bg} border ${v.border} rounded-xl p-3 flex flex-col gap-1`}>
                            <div className="flex items-center justify-between">
                              <span className="text-lg">{v.icon}</span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase leading-tight text-right">{v.label}</span>
                            </div>
                            <input
                              type="text"
                              value={form.vitals[v.key] || ''}
                              onChange={(e) => handleFieldChange(`vitals.${v.key}`, e.target.value)}
                              className={`text-xl font-black ${v.color} bg-transparent border-0 focus:outline-none w-full p-0`}
                            />
                            <span className="text-[9px] text-slate-400 font-medium">{v.unit}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Lower two-column area */}
                <div className="grid grid-cols-2 gap-5">

                  {/* Systemic Examination (left) */}
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/40">
                      <span className="text-sm font-bold text-slate-800">Systemic Examination</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {systemicExamination.map((row, index) => (
                        <div key={row.sys} className="grid grid-cols-[90px_110px_1fr] items-center gap-2 px-3 py-2">
                          <span className="text-[10px] font-bold text-slate-600 leading-tight">{row.sys}</span>
                          <select
                            value={row.status}
                            onChange={(e) => {
                              const updated = [...systemicExamination];
                              updated[index].status = e.target.value;
                              setSystemicExamination(updated);
                              setIsDirty(true);
                            }}
                            className="text-[10px] text-slate-600 border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-indigo-400 transition"
                          >
                            <option value="Alert, Oriented">Alert, Oriented</option>
                            <option value="Normal">Normal</option>
                            <option value="Abnormal">Abnormal</option>
                            <option value="Not Examined">Not Examined</option>
                            <option value="PERRLA">PERRLA</option>
                            <option value="S1, S2 Normal">S1, S2 Normal</option>
                            <option value="Clear">Clear</option>
                            <option value="Soft">Soft</option>
                            <option value="Motor Power Norm.">Motor Power Norm.</option>
                          </select>
                          <input
                            value={row.note}
                            onChange={(e) => {
                              const updated = [...systemicExamination];
                              updated[index].note = e.target.value;
                              setSystemicExamination(updated);
                              setIsDirty(true);
                            }}
                            type="text"
                            className="text-[10px] text-slate-500 border-0 focus:outline-none bg-transparent placeholder-slate-350 truncate"
                            placeholder="Notes..."
                          />
                        </div>
                      ))}
                    </div>
                    <div className="px-3 py-2 border-t border-slate-100 flex flex-col gap-2">
                      <button type="button" onClick={handleAddSystemicExamination} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition">
                        <Plus size={12} /> Add System
                      </button>
                      {showSysExamInput && (
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="text"
                            value={sysExamInputVal}
                            onChange={(e) => setSysExamInputVal(e.target.value)}
                            placeholder="e.g. Musculoskeletal"
                            className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 bg-white"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && sysExamInputVal.trim()) {
                                setSystemicExamination([...systemicExamination, { sys: sysExamInputVal.trim(), status: 'Normal', note: '' }]);
                                setSysExamInputVal('');
                                setShowSysExamInput(false);
                                setIsDirty(true);
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (sysExamInputVal.trim()) {
                                setSystemicExamination([...systemicExamination, { sys: sysExamInputVal.trim(), status: 'Normal', note: '' }]);
                                setSysExamInputVal('');
                                setShowSysExamInput(false);
                                setIsDirty(true);
                              }
                            }}
                            className="text-[10px] font-bold text-white bg-indigo-650 hover:bg-indigo-707 px-3 py-1.5 rounded-xl transition"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowSysExamInput(false);
                              setSysExamInputVal('');
                            }}
                            className="text-[10px] font-bold text-slate-500 hover:bg-slate-100 px-3 py-1.5 rounded-xl transition"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* General Examination + Anthropometry (right) */}
                  <div className="space-y-4">
                    {/* General Examination */}
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/40">
                        <span className="text-sm font-bold text-slate-800">General Examination</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (isRecording && dictatingField === 'formattedClinicalNotes.objective') {
                                stopVoiceDictation();
                              } else {
                                startVoiceDictation('formattedClinicalNotes.objective');
                              }
                            }}
                            className={`p-1.5 rounded-lg transition ${
                              isRecording && dictatingField === 'formattedClinicalNotes.objective'
                                ? 'text-rose-600 bg-rose-50 animate-pulse'
                                : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                            }`}
                            title={isRecording && dictatingField === 'formattedClinicalNotes.objective' ? 'Stop Recording' : 'Start Dictation'}
                          >
                            <Mic size={13} />
                          </button>
                          <button className="text-xs font-bold text-slate-500 border border-slate-200 rounded-lg px-2.5 py-1 hover:bg-slate-50 transition flex items-center gap-1">
                            Insert Template <span className="text-slate-300">▾</span>
                          </button>
                        </div>
                      </div>
                      {/* Rich-text toolbar mock */}
                      <div className="flex items-center gap-0.5 px-3 py-2 border-b border-slate-100 bg-white">
                        {['B', 'I', 'U'].map((fmt) => (
                          <button key={fmt} className="w-6 h-6 rounded font-bold text-[10px] text-slate-500 hover:bg-slate-100 transition flex items-center justify-center">{fmt}</button>
                        ))}
                        <div className="w-px h-4 bg-slate-200 mx-1" />
                        {['≡', '⁝', '🔗', '↔'].map((icon) => (
                          <button key={icon} className="w-6 h-6 rounded text-[10px] text-slate-500 hover:bg-slate-100 transition flex items-center justify-center">{icon}</button>
                        ))}
                      </div>
                      <textarea
                        value={form.formattedClinicalNotes.objective}
                        onChange={(e) => handleFieldChange('formattedClinicalNotes.objective', e.target.value)}
                        placeholder="Write general examination findings..."
                        rows={5}
                        className="w-full px-4 py-3 text-xs text-slate-700 border-0 focus:outline-none focus:ring-0 resize-none placeholder-slate-400 leading-relaxed bg-white"
                      />
                    </div>

                    {/* Anthropometry */}
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/40">
                        <span className="text-sm font-bold text-slate-800">Anthropometry</span>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { label: 'Height (cm)', key: 'height' },
                            { label: 'Weight (kg)', key: 'weight' },
                            { label: 'BMI (kg/m²)', key: 'bmi', readOnly: true },
                          ].map((f) => (
                            <div key={f.label}>
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{f.label}</label>
                              {f.readOnly ? (
                                <div className="px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 bg-slate-50 font-bold">
                                  {(form.vitals.height && form.vitals.weight) ? (form.vitals.weight / Math.pow(form.vitals.height / 100, 2)).toFixed(1) : '--'}
                                </div>
                              ) : (
                                <input
                                  type="text"
                                  value={form.vitals[f.key] || '--'}
                                  onChange={(e) => handleFieldChange(`vitals.${f.key}`, e.target.value)}
                                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-indigo-400 transition"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { label: 'Waist (cm)', placeholder: '--' },
                            { label: 'Hip (cm)', placeholder: '--' },
                            { label: 'Waist-Hip Ratio', placeholder: '--', readOnly: true },
                          ].map((f) => (
                            <div key={f.label}>
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{f.label}</label>
                              <input
                                type="text"
                                placeholder={f.placeholder}
                                readOnly={f.readOnly}
                                className={`w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-indigo-400 transition ${f.readOnly ? 'bg-slate-50' : 'bg-white'}`}
                              />
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-end">
                          <button className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 transition">
                            <RefreshCw size={11} /> Recalculate BMI
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {workspaceTab === 'Diagnosis' && (
              <div className="space-y-4">

                {/* Header */}
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-sm">🩺</div>
                  <span className="text-base font-bold text-slate-800">Diagnosis &amp; Clinical Impression</span>
                </div>

                {/* Row 1: Primary Diagnosis + ICD-10 Code + Type */}
                <div className="grid grid-cols-[1fr_160px_130px] gap-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Primary Diagnosis *</label>
                      <button
                        type="button"
                        onClick={() => {
                          if (isRecording && dictatingField === 'diagnosis.primary') {
                            stopVoiceDictation();
                          } else {
                            startVoiceDictation('diagnosis.primary');
                          }
                        }}
                        className={`p-0.5 rounded transition ${
                          isRecording && dictatingField === 'diagnosis.primary'
                            ? 'text-rose-600 bg-rose-50 animate-pulse'
                            : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                        }`}
                        title={isRecording && dictatingField === 'diagnosis.primary' ? 'Stop Recording' : 'Start Dictation'}
                      >
                        <Mic size={11} />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={form.diagnosis.primary}
                      onChange={(e) => handleFieldChange('diagnosis.primary', e.target.value)}
                      placeholder="Acute Viral Fever"
                      className="w-full px-3 py-2.5 text-xs text-slate-700 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 transition"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">ICD-10 Code</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={icdCode}
                        onChange={(e) => setIcdCode(e.target.value)}
                        placeholder="B34.9"
                        className="w-full px-3 py-2.5 pr-8 text-xs text-slate-700 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 transition"
                      />
                      <Search size={12} className="absolute right-3 top-2.5 text-slate-400" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Type</label>
                    <select className="w-full px-3 py-2.5 text-xs text-slate-700 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-indigo-400 transition">
                      <option>Acute</option>
                      <option>Chronic</option>
                      <option>Sub-acute</option>
                    </select>
                  </div>
                </div>

                {/* Row 2: Secondary Diagnoses tag input */}
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Secondary Diagnoses (Optional)</label>
                  <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl bg-white focus-within:border-indigo-400 transition min-h-[38px]">
                    {secondaryDiagnosisTags.map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold">
                        {tag}
                        <button onClick={() => setSecondaryDiagnosisTags(secondaryDiagnosisTags.filter(t => t !== tag))} className="text-slate-400 hover:text-rose-500 transition ml-0.5">
                          <X size={9} />
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={secondaryDiagnosisInput2}
                      onChange={(e) => setSecondaryDiagnosisInput2(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === ',') && secondaryDiagnosisInput2.trim()) {
                          e.preventDefault();
                          setSecondaryDiagnosisTags([...secondaryDiagnosisTags, secondaryDiagnosisInput2.trim()]);
                          setSecondaryDiagnosisInput2('');
                        }
                      }}
                      placeholder={secondaryDiagnosisTags.length === 0 ? 'Search & add secondary diagnosis...' : ''}
                      className="flex-1 min-w-[160px] text-xs text-slate-600 bg-transparent border-0 focus:outline-none placeholder-slate-400"
                    />
                    <Search size={11} className="text-slate-300 ml-auto shrink-0" />
                  </div>
                </div>

                {/* Row 3: Clinical Impression */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Clinical Impression / Summary</label>
                    <button
                      type="button"
                      onClick={() => {
                        if (isRecording && dictatingField === 'diagnosis.notes') {
                          stopVoiceDictation();
                        } else {
                          startVoiceDictation('diagnosis.notes');
                        }
                      }}
                      className={`p-0.5 rounded transition ${
                        isRecording && dictatingField === 'diagnosis.notes'
                          ? 'text-rose-600 bg-rose-50 animate-pulse'
                          : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                      }`}
                      title={isRecording && dictatingField === 'diagnosis.notes' ? 'Stop Recording' : 'Start Dictation'}
                    >
                      <Mic size={11} />
                    </button>
                  </div>
                  <textarea
                    value={form.diagnosis.notes}
                    onChange={(e) => handleFieldChange('diagnosis.notes', e.target.value)}
                    placeholder="Patient presents with acute febrile illness with body ache and mild headache. No signs of bacterial infection."
                    rows={3}
                    className="w-full px-3 py-2.5 text-xs text-slate-700 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 transition resize-none"
                  />
                </div>

                {/* Row 4: 4 dropdowns */}
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Severity</label>
                    <select value={diagnosisSeverity} onChange={(e) => setDiagnosisSeverity(e.target.value)} className="w-full px-3 py-2.5 text-xs text-slate-700 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-indigo-400 transition">
                      <option>Mild</option>
                      <option>Moderate</option>
                      <option>Severe</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Certainty</label>
                    <select value={diagnosisCertainty} onChange={(e) => setDiagnosisCertainty(e.target.value)} className="w-full px-3 py-2.5 text-xs text-slate-700 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-indigo-400 transition">
                      <option>Probable</option>
                      <option>Confirmed</option>
                      <option>Suspected</option>
                      <option>Rule Out</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Status</label>
                    <select value={diagnosisStatus} onChange={(e) => setDiagnosisStatus(e.target.value)} className="w-full px-3 py-2.5 text-xs text-slate-700 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-indigo-400 transition">
                      <option>Active</option>
                      <option>Resolved</option>
                      <option>Monitoring</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Onset</label>
                    <input
                      type="date"
                      value={diagnosisOnset}
                      onChange={(e) => setDiagnosisOnset(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs text-slate-700 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 transition"
                    />
                  </div>
                </div>

                {/* Row 5: Differential Diagnosis tag input */}
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Differential Diagnosis (Optional)</label>
                  <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl bg-white focus-within:border-indigo-400 transition min-h-[38px]">
                    {differentialDiagnosisTags.map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold">
                        {tag}
                        <button onClick={() => setDifferentialDiagnosisTags(differentialDiagnosisTags.filter(t => t !== tag))} className="text-slate-400 hover:text-rose-500 transition ml-0.5">
                          <X size={9} />
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={differentialDiagnosisInput}
                      onChange={(e) => setDifferentialDiagnosisInput(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === ',') && differentialDiagnosisInput.trim()) {
                          e.preventDefault();
                          setDifferentialDiagnosisTags([...differentialDiagnosisTags, differentialDiagnosisInput.trim()]);
                          setDifferentialDiagnosisInput('');
                        }
                      }}
                      placeholder="Search & add differential diagnosis..."
                      className="flex-1 min-w-[160px] text-xs text-slate-600 bg-transparent border-0 focus:outline-none placeholder-slate-400"
                    />
                    <Search size={11} className="text-slate-300 ml-auto shrink-0" />
                  </div>
                </div>

                {/* Row 6: Treatment Plan */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Treatment Plan (Summary)</label>
                    <button
                      type="button"
                      onClick={() => {
                        if (isRecording && dictatingField === 'treatmentPlanText') {
                          stopVoiceDictation();
                        } else {
                          startVoiceDictation('treatmentPlanText');
                        }
                      }}
                      className={`p-0.5 rounded transition ${
                        isRecording && dictatingField === 'treatmentPlanText'
                          ? 'text-rose-600 bg-rose-50 animate-pulse'
                          : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                      }`}
                      title={isRecording && dictatingField === 'treatmentPlanText' ? 'Stop Recording' : 'Start Dictation'}
                    >
                      <Mic size={11} />
                    </button>
                  </div>
                  <textarea
                    value={treatmentPlanText}
                    onChange={(e) => { setTreatmentPlanText(e.target.value); setIsDirty(true); }}
                    placeholder="Symptomatic treatment, hydration, rest and monitoring."
                    rows={2}
                    className="w-full px-3 py-2.5 text-xs text-slate-700 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 transition resize-none"
                  />
                </div>

                {/* Row 7: Risk Assessment + Prognosis + Monitoring */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs">ℹ</div>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Risk Assessment</span>
                    </div>
                    <p className="text-sm font-black text-green-600">Low Risk</p>
                    <p className="text-[10px] text-slate-500">No immediate concerns</p>
                  </div>
                  <div className="bg-green-50 border border-green-100 rounded-2xl p-4 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-xs">👤</div>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Prognosis</span>
                    </div>
                    <p className="text-sm font-black text-green-600">Good</p>
                    <p className="text-[10px] text-slate-500">Expected recovery in 3-5 days</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs">👁</div>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Monitoring Required</span>
                    </div>
                    <p className="text-sm font-black text-slate-700">No</p>
                    <p className="text-[10px] text-slate-500">Routine follow-up</p>
                  </div>
                </div>

              </div>
            )}

            {workspaceTab === 'Prescription' && (
              <div className="space-y-6">
                {!isSmartSearchOpen ? (
                  <>
                    {/* ── Prescription Builder Header ── */}
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Prescription Builder</h3>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setIsSmartSearchOpen(true)}
                          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-all shadow-md shadow-violet-900/30 active:scale-95"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
                          Search Medicine
                        </button>
                        <button
                          onClick={() => {
                            setMedicines([...medicines, { medicineName: '', genericName: '', dosage: '', frequency: '1-0-1', duration: '5 days', route: 'oral', timing: 'after food', instructions: '', quantity: 10, isSubstituteAllowed: false }]);
                            setIsDirty(true);
                          }}
                          className="text-xs text-slate-400 hover:text-white font-bold flex items-center gap-1 transition-colors"
                        >
                          <PlusCircle size={14} /> Add
                        </button>
                      </div>
                    </div>

                    {/* Medicines List */}
                    <div className="space-y-4">
                      {medicines.map((med, index) => (
                        <div key={index} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 relative">
                          <button
                            onClick={() => {
                              const updated = medicines.filter((_, i) => i !== index);
                              setMedicines(updated.length ? updated : [{ medicineName: '', genericName: '', dosage: '', frequency: '1-0-1', duration: '5 days', route: 'oral', timing: 'after food', instructions: '', quantity: 10, isSubstituteAllowed: false }]);
                              setIsDirty(true);
                            }}
                            className="absolute top-3 right-3 text-slate-400 hover:text-rose-600 transition"
                          >
                            <Trash2 size={14} />
                          </button>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {/* Name Input */}
                            <div className="space-y-1 relative">
                              <label className="text-[9px] font-bold text-slate-400 uppercase">Medicine Name</label>
                              <input
                                type="text"
                                value={med.medicineName}
                                onChange={(e) => {
                                  const updated = [...medicines];
                                  updated[index].medicineName = e.target.value;
                                  setMedicines(updated);
                                  setIsDirty(true);
                                }}
                                placeholder="Medicine name..."
                                className="w-full px-3 py-1.5 text-xs text-slate-700 border border-slate-200 rounded-xl focus:outline-none transition"
                              />
                            </div>

                            {/* Dosage */}
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-400 uppercase">Dosage Strength</label>
                              <input
                                type="text"
                                value={med.dosage}
                                onChange={(e) => {
                                  const updated = [...medicines];
                                  updated[index].dosage = e.target.value;
                                  setMedicines(updated);
                                  setIsDirty(true);
                                }}
                                placeholder="e.g. 500mg"
                                className="w-full px-3 py-1.5 text-xs text-slate-700 border border-slate-200 rounded-xl focus:outline-none transition"
                              />
                            </div>

                            {/* Frequency */}
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-400 uppercase">Frequency</label>
                              <input
                                value={med.frequency}
                                onChange={(e) => {
                                  const updated = [...medicines];
                                  updated[index].frequency = e.target.value;
                                  setMedicines(updated);
                                  setIsDirty(true);
                                }}
                                placeholder="e.g. 1-0-1"
                                className="w-full px-3 py-1.5 text-xs text-slate-700 border border-slate-200 rounded-xl focus:outline-none transition"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {/* Duration */}
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-405 uppercase">Duration</label>
                              <input
                                type="text"
                                value={med.duration}
                                onChange={(e) => {
                                  const updated = [...medicines];
                                  updated[index].duration = e.target.value;
                                  setMedicines(updated);
                                  setIsDirty(true);
                                }}
                                placeholder="5 days"
                                className="w-full px-3 py-1.5 text-xs text-slate-700 border border-slate-200 rounded-xl focus:outline-none transition"
                              />
                            </div>

                            {/* Timing */}
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-405 uppercase">Timing</label>
                              <select
                                value={med.timing}
                                onChange={(e) => {
                                  const updated = [...medicines];
                                  updated[index].timing = e.target.value;
                                  setMedicines(updated);
                                  setIsDirty(true);
                                }}
                                className="w-full px-3 py-1.5 text-xs text-slate-700 border border-slate-200 rounded-xl bg-white focus:outline-none transition"
                              >
                                <option value="after food">After Food</option>
                                <option value="before food">Before Food</option>
                                <option value="with food">With Food</option>
                              </select>
                            </div>

                            {/* Quantity */}
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-405 uppercase">Qty</label>
                              <input
                                type="number"
                                value={med.quantity}
                                onChange={(e) => {
                                  const updated = [...medicines];
                                  updated[index].quantity = Number(e.target.value);
                                  setMedicines(updated);
                                  setIsDirty(true);
                                }}
                                className="w-full px-3 py-1.5 text-xs text-slate-700 border border-slate-200 rounded-xl focus:outline-none transition"
                              />
                            </div>

                            {/* Substitute Allowed */}
                            <div className="flex items-center gap-2 pt-5">
                              <input
                                type="checkbox"
                                checked={med.isSubstituteAllowed}
                                onChange={(e) => {
                                  const updated = [...medicines];
                                  updated[index].isSubstituteAllowed = e.target.checked;
                                  setMedicines(updated);
                                  setIsDirty(true);
                                }}
                                id={`sub-${index}`}
                                className="rounded border-slate-200 text-indigo-650 focus:ring-indigo-505"
                              />
                              <label htmlFor={`sub-${index}`} className="text-[10px] font-bold text-slate-500 uppercase cursor-pointer">Substitute Allowed</label>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <SmartPrescriptionSearch
                    isOpen={isSmartSearchOpen}
                    onClose={() => setIsSmartSearchOpen(false)}
                    onSavePrescription={(rows) => {
                      const existingNamed = medicines.filter(m => m.medicineName?.trim());
                      const merged = [
                        ...existingNamed,
                        ...rows.filter(r => !existingNamed.some(e => e.medicineName === r.medicineName))
                      ];
                      setMedicines(merged.length ? merged : rows);
                      setIsDirty(true);
                    }}
                    initialCart={[]}
                  />
                )}
              </div>
            )}

            {workspaceTab === 'Laboratory' && (
              <div className="space-y-4">

                {/* Search + Filters Row */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search test by name, code, category..."
                      value={labSearchQuery}
                      onChange={(e) => setLabSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-24 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 transition text-slate-700 bg-white"
                    />
                    {isSearchingLabs && (
                      <span className="absolute right-14 top-2 text-[10px] text-slate-400 animate-pulse">Searching...</span>
                    )}
                    <span className="absolute right-3 top-1.5 text-[9px] text-slate-400 font-bold border border-slate-200 rounded px-1.5 py-0.5">Ctrl + K</span>
                  </div>
                  <select
                    value={selectedLabCategory}
                    onChange={(e) => setSelectedLabCategory(e.target.value)}
                    className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-indigo-400 text-slate-600 transition"
                  >
                    <option>All Categories</option>
                    <option>Hematology</option>
                    <option>Biochemistry</option>
                    <option>Microbiology</option>
                    <option>Immunology</option>
                    <option>Endocrinology</option>
                    <option>Urine &amp; Stool</option>
                    <option>Radiology</option>
                  </select>
                  <select
                    value={selectedLabProvider}
                    onChange={(e) => setSelectedLabProvider(e.target.value)}
                    className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-indigo-400 text-slate-600 transition"
                  >
                    <option>All Providers</option>
                    <option>In-house Lab</option>
                    <option>External Center</option>
                  </select>
                </div>

                {/* Sub-filter pills */}
                <div className="flex gap-2">
                  {['Recommended', 'Frequently Ordered', 'Recent', 'Packages', 'Favorites'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setLabSubFilter(f)}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold border transition ${labSubFilter === f
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                {/* Two-column layout: left tests, right selected */}
                <div className="grid grid-cols-[1fr_280px] gap-4">

                  {/* LEFT: Recommended + All Tests */}
                  <div className="space-y-4">

                    {/* Recommended section */}
                    {!labSearchQuery && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            Recommended for This Patient
                            <span className="bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded text-[8px] font-black">AI</span>
                          </span>
                          {labRecommendationsFeature.enabled && (
                            <button
                              onClick={() => {
                                const recoTests = [
                                  { testName: 'CBC', sampleRequired: 'Blood' },
                                  { testName: 'LFT', sampleRequired: 'Blood' },
                                  { testName: 'CRP', sampleRequired: 'Blood' },
                                ];
                                const merged = [...labs];
                                recoTests.forEach(r => {
                                  if (!merged.some(l => l.testName === r.testName)) merged.push({ ...r, priority: 'routine', reason: '' });
                                });
                                setLabs(merged);
                                setIsDirty(true);
                              }}
                              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition"
                            >
                              Select All
                            </button>
                          )}
                        </div>
                        {!labRecommendationsFeature.enabled ? (
                          <PremiumFeaturePlaceholder
                            featureCode="lab_recommendations"
                            featureName="AI Lab Recommendations"
                            description="Suggests relevant laboratory investigations based on patients clinical context."
                            onRequested={() => handleRequestAccess('lab_recommendations')}
                          />
                        ) : (
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { name: 'CBC', full: 'Complete Blood Count' },
                              { name: 'ESR', full: 'Erythrocyte Sedimentation Rate' },
                              { name: 'CRP', full: 'C-Reactive Protein' },
                              { name: 'LFT', full: 'Liver Function Test' },
                              { name: 'RFT', full: 'Renal Function Test' },
                              { name: 'Dengue NS1', full: 'Dengue Antigen Test' },
                            ].map((test) => {
                              const isChecked = labs.some(l => l.testName === test.name);
                              return (
                                <label key={test.name} className={`flex items-start gap-2 p-3 border rounded-xl cursor-pointer transition ${isChecked ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 hover:bg-slate-50'
                                  }`}>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setLabs([...labs, { testName: test.name, priority: 'routine', sampleRequired: 'Blood', reason: '' }]);
                                      } else {
                                        setLabs(labs.filter(l => l.testName !== test.name));
                                      }
                                      setIsDirty(true);
                                    }}
                                    className="mt-0.5 rounded border-slate-300 accent-indigo-600 shrink-0"
                                  />
                                  <div className="text-[10px] leading-tight">
                                    <strong className="text-slate-800 block text-xs">{test.name}</strong>
                                    <span className="text-slate-400">{test.full}</span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* All Lab Tests Table */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 mb-2">All Laboratory Tests</h4>
                      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                              <th className="py-2.5 px-4">Test Name</th>
                              <th className="py-2.5 px-4">Sample 🩸</th>
                              <th className="py-2.5 px-4">Reporting Time</th>
                              <th className="py-2.5 px-4">Price (₹)</th>
                              <th className="py-2.5 px-4 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700">
                            {globalLabTests.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="py-8 px-4 text-center">
                                  <p className="text-slate-500 font-medium mb-3 text-[11px]">No matching laboratory test found.</p>
                                  <div className="flex justify-center gap-3">
                                    <button
                                      onClick={async () => {
                                        try {
                                          await labApi.createCustomRequest({ testName: labSearchQuery, isGlobalRequest: false });
                                          toast.success(`Custom test request for "${labSearchQuery}" submitted to Clinic Admin!`);
                                          const res = await labApi.searchAllLabs({ search: labSearchQuery });
                                          setGlobalLabTests(res?.data?.results || res?.results || []);
                                        } catch (err) {
                                          toast.error('Failed to submit request');
                                        }
                                      }}
                                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg text-[10px] font-bold transition"
                                    >
                                      Add Custom Test
                                    </button>
                                    <button
                                      onClick={async () => {
                                        try {
                                          await labApi.createCustomRequest({ testName: labSearchQuery, isGlobalRequest: true });
                                          toast.success(`Global catalogue request for "${labSearchQuery}" submitted to Super Admin!`);
                                          const res = await labApi.searchAllLabs({ search: labSearchQuery });
                                          setGlobalLabTests(res?.data?.results || res?.results || []);
                                        } catch (err) {
                                          toast.error('Failed to submit request');
                                        }
                                      }}
                                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-lg text-[10px] font-bold transition"
                                    >
                                      Request Global Catalogue Addition
                                    </button>
                                    <button
                                      onClick={() => setLabSearchQuery('')}
                                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition"
                                    >
                                      Continue Consultation
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ) : (
                              (() => {
                                const getProviderBadge = (provider) => {
                                  const p = (provider || '').toLowerCase();
                                  if (p.includes('clinic')) return 'bg-emerald-50 text-emerald-600 border border-emerald-200';
                                  if (p.includes('thyrocare')) return 'bg-blue-50 text-blue-600 border border-blue-200';
                                  if (p.includes('lal')) return 'bg-amber-50 text-amber-600 border border-amber-250';
                                  if (p.includes('metropolis')) return 'bg-purple-50 text-purple-600 border border-purple-200';
                                  if (p.includes('global') || p.includes('no laboratory')) return 'bg-slate-50 text-slate-500 border border-slate-200';
                                  return 'bg-rose-50 text-rose-600 border border-rose-200';
                                };

                                const getAvailabilityBadge = (avail) => {
                                  const a = (avail || '').toLowerCase();
                                  if (a.includes('available') && !a.includes('limited') && !a.includes('un')) {
                                    return 'bg-emerald-100 text-emerald-800';
                                  }
                                  if (a.includes('limited')) {
                                    return 'bg-amber-100 text-amber-800';
                                  }
                                  if (a.includes('global')) {
                                    return 'bg-slate-150 text-slate-700';
                                  }
                                  return 'bg-red-100 text-red-800';
                                };

                                const displayTests = showMoreTests ? globalLabTests : globalLabTests.slice(0, 6);
                                return displayTests.map((test) => {
                                  const isAdded = labs.some(l => l.testName === test.name);
                                  return (
                                    <tr key={test._id} className="hover:bg-slate-50/50 transition">
                                      <td className="py-2.5 px-4">
                                        <div className="flex items-start gap-2">
                                          <input
                                            type="checkbox"
                                            checked={isAdded}
                                            onChange={(e) => {
                                              const isGlobalWithoutLab = test.source === 'Global Diagnostic Master' || test.provider === 'No Laboratory Assigned';
                                              if (isGlobalWithoutLab && e.target.checked) {
                                                setPromptGlobalTest(test);
                                                return;
                                              }
                                              if (e.target.checked) {
                                                setLabs([...labs, { testName: test.name, priority: 'routine', sampleRequired: test.sampleType, reason: '', provider: test.provider }]);
                                              } else {
                                                setLabs(labs.filter(l => l.testName !== test.name));
                                              }
                                              setIsDirty(true);
                                            }}
                                            className="mt-1 rounded border-slate-350 accent-indigo-600 shrink-0"
                                          />
                                          <div className="min-w-0">
                                            <span className="font-semibold text-slate-800 text-[11px] block">{test.name}</span>
                                            <span className="text-[9px] text-slate-400 block mt-0.5">
                                              Category: {test.category} | Prep: {test.preparation || 'No Fasting'}
                                            </span>
                                            <div className="flex gap-1.5 mt-1">
                                              <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${getProviderBadge(test.provider)}`}>
                                                {test.provider}
                                              </span>
                                              <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${getAvailabilityBadge(test.availability)}`}>
                                                {test.availability}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="py-2.5 px-4">
                                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                                          <span className="text-red-500">🩸</span> {test.sampleType}
                                        </span>
                                      </td>
                                      <td className="py-2.5 px-4 text-[10px] text-slate-500">{test.tat}</td>
                                      <td className="py-2.5 px-4 text-[11px] font-bold text-slate-800">{test.price ? `₹${test.price}` : '—'}</td>
                                      <td className="py-2.5 px-4 text-center">
                                        <button
                                          onClick={() => {
                                            const isGlobalWithoutLab = test.source === 'Global Diagnostic Master' || test.provider === 'No Laboratory Assigned';
                                            if (isGlobalWithoutLab && !isAdded) {
                                              setPromptGlobalTest(test);
                                              return;
                                            }
                                            if (!isAdded) {
                                              setLabs([...labs, { testName: test.name, priority: 'routine', sampleRequired: test.sampleType, reason: '', provider: test.provider }]);
                                            } else {
                                              setLabs(labs.filter(l => l.testName !== test.name));
                                            }
                                            setIsDirty(true);
                                          }}
                                          className={`px-3.5 py-1.5 rounded-lg text-[10px] font-bold transition ${isAdded
                                              ? 'bg-teal-50 text-teal-700 border border-teal-200'
                                              : 'bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 border border-slate-200'
                                            }`}
                                        >
                                          {isAdded ? 'Added' : 'Add'}
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                });
                              })()
                            )}
                          </tbody>
                        </table>
                        <div className="py-3 border-t border-slate-100 text-center">
                          <button
                            onClick={() => setShowMoreTests(!showMoreTests)}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition flex items-center gap-1 mx-auto"
                          >
                            <Plus size={11} /> {showMoreTests ? 'Show Less' : 'Load More Tests'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Special Instructions + Attach Report */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Special Instructions for Lab</label>
                        <input
                          type="text"
                          value={labSpecialInstructions}
                          onChange={(e) => { setLabSpecialInstructions(e.target.value); setIsDirty(true); }}
                          placeholder="e.g. Please process as urgent if possible"
                          className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 transition text-slate-700"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Attach Previous Report (Optional)</label>
                        <div className="flex items-center justify-center gap-2 px-3 py-2.5 border border-dashed border-slate-300 rounded-xl text-slate-400 text-[10px] cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition">
                          <FileText size={13} />
                          Drag &amp; drop or click to upload
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* RIGHT: Selected Tests Panel + Lab Order Details */}
                  <div className="space-y-4">

                    {/* Selected Tests */}
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/40">
                        <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-wider">SELECTED TESTS ({labs.length})</h4>
                        <button onClick={() => { setLabs([]); setIsDirty(true); }} className="text-[9px] font-black text-rose-600 hover:text-rose-800 uppercase tracking-wider transition">Clear All</button>
                      </div>
                      <div className="divide-y divide-slate-100 max-h-[340px] overflow-y-auto">
                        {labs.map((l, index) => (
                          <div key={index} className="flex items-start justify-between px-3 py-3 hover:bg-slate-50/50 transition">
                            <div className="flex items-start gap-2">
                              <span className="text-slate-300 mt-0.5 cursor-grab text-xs">⠿</span>
                              <div className="text-[10px]">
                                <strong className="text-slate-800 text-xs block">{l.testName}</strong>
                                <span className="text-slate-400 block mt-0.5">• Sample: {l.sampleRequired || 'Blood'}</span>
                                <span className="text-slate-400 block">• Provider: <span className="text-indigo-650 font-semibold">{l.provider || 'Clinic Laboratory'}</span></span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="px-1.5 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-600 text-[8px] font-black uppercase rounded">Routine</span>
                              <button
                                onClick={() => { setLabs(labs.filter((_, i) => i !== index)); setIsDirty(true); }}
                                className="text-slate-300 hover:text-rose-500 transition"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                        {labs.length === 0 && (
                          <div className="px-4 py-6 text-center text-[10px] text-slate-400 italic">No tests selected yet.</div>
                        )}
                      </div>
                      <div className="px-3 py-2.5 border-t border-slate-100">
                        <button
                          onClick={() => {
                            const testName = prompt('Enter manual test name:');
                            if (testName) { setLabs([...labs, { testName, priority: 'routine', sampleRequired: 'Blood', reason: '' }]); setIsDirty(true); }
                          }}
                          className="w-full py-2 border border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/30 text-slate-500 hover:text-indigo-600 text-[10px] font-bold rounded-xl transition flex items-center justify-center gap-1"
                        >
                          <Plus size={11} /> Add Test Manually
                        </button>
                      </div>
                    </div>

                    {/* Lab Order Details */}
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/40">
                        <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-wider">LAB ORDER DETAILS</h4>
                      </div>
                      <div className="px-4 py-3 space-y-3">
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Priority</label>
                          <select value={labPriority} onChange={(e) => setLabPriority(e.target.value)} className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-indigo-400 transition text-slate-600">
                            <option>Routine</option>
                            <option>Urgent</option>
                            <option>STAT</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Fasting Required</label>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setLabFastingRequired(!labFastingRequired)}
                              className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${labFastingRequired ? 'bg-emerald-500' : 'bg-slate-200'
                                }`}
                            >
                              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${labFastingRequired ? 'translate-x-4' : 'translate-x-0'
                                }`} />
                            </button>
                            <span className="text-[10px] text-slate-500">{labFastingRequired ? 'For selected tests' : 'Not required'}</span>
                          </div>
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Clinical Notes (Optional)</label>
                          <textarea
                            value={labClinicalNotes}
                            onChange={(e) => { setLabClinicalNotes(e.target.value); setIsDirty(true); }}
                            placeholder="Enter clinical notes for lab technician..."
                            rows={2}
                            className="w-full px-3 py-2 text-[10px] border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 transition resize-none text-slate-700"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Collection Preference</label>
                          <div className="space-y-1.5">
                            {['At Clinic', 'Home Collection', 'External Center'].map((opt) => (
                              <label key={opt} className="flex items-center gap-2 text-[10px] text-slate-600 cursor-pointer">
                                <input
                                  type="radio"
                                  name="labCollection"
                                  checked={labCollectionPref === opt}
                                  onChange={() => setLabCollectionPref(opt)}
                                  className="accent-emerald-500"
                                />
                                {opt}
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                          <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            <Clock size={12} className="text-indigo-500 shrink-0" />
                            <div>
                              <span className="font-bold text-slate-700 block">Estimated Reporting</span>
                              <span>Same Day – 24 Hrs</span>
                            </div>
                          </div>
                          <p className="text-[9px] text-slate-400 mt-1">Based on selected tests</p>
                        </div>
                      </div>
                    </div>

                    {/* AI Insights */}
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                        <Sparkles size={13} className="text-indigo-500" />
                        <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-wider">AI INSIGHTS</h4>
                        <span className="text-[8px] bg-indigo-50 text-indigo-600 font-extrabold px-1.5 py-0.5 rounded ml-auto">Beta</span>
                      </div>
                      <div className="px-4 py-3 space-y-3">
                        <p className="text-[10px] text-slate-500">Based on symptoms and diagnosis, these tests are relevant.</p>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Helpful Add-ons:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {['ESR', 'LFT', 'RFT', 'D-Dimer'].map((t) => (
                              <button
                                key={t}
                                onClick={() => {
                                  if (!labs.some(l => l.testName === t)) {
                                    setLabs([...labs, { testName: t, priority: 'routine', sampleRequired: 'Blood', reason: '' }]);
                                    setIsDirty(true);
                                  }
                                }}
                                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-600 rounded-lg text-[10px] font-bold transition"
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            ['ESR', 'LFT', 'RFT', 'D-Dimer'].forEach(t => {
                              if (!labs.some(l => l.testName === t)) {
                                setLabs(prev => [...prev, { testName: t, priority: 'routine', sampleRequired: 'Blood', reason: '' }]);
                              }
                            });
                            setIsDirty(true);
                            toast.success('Recommended tests added!');
                          }}
                          className="w-full py-2 bg-slate-50 hover:bg-indigo-50 border border-slate-200 text-slate-600 hover:text-indigo-600 font-bold rounded-xl transition text-center text-[10px] uppercase"
                        >
                          Add Recommended
                        </button>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            )}

            {workspaceTab === 'Procedures' && (
              <div className="space-y-4">
                {/* Top bar: search + buttons */}
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="relative flex-1">
                    <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search procedure by name or keyword..."
                      value={procedureSearchQuery}
                      onChange={(e) => setProcedureSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-16 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 text-slate-700 bg-white"
                    />
                    <span className="absolute right-3 top-1.5 text-[9px] text-slate-400 font-bold border border-slate-200 rounded px-1.5 py-0.5">Ctrl + P</span>
                  </div>
                  <button className="px-3 py-2 bg-white hover:bg-amber-50 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs flex items-center gap-1.5 transition">
                    ⭐ Favorites
                  </button>
                  <button className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs flex items-center gap-1.5 transition">
                    📋 Procedure Templates
                  </button>
                </div>

                {/* Sub-filter pills */}
                <div className="flex gap-2">
                  {['Common Procedures', 'Favorites', 'All Procedures'].map((subcat) => (
                    <button
                      key={subcat}
                      onClick={() => setProcedureSubFilter(subcat)}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold border transition ${procedureSubFilter === subcat
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-500'
                        }`}
                    >
                      {subcat}
                    </button>
                  ))}
                </div>

                {/* Two-column: left list + right selected */}
                <div className="grid grid-cols-[210px_1fr] gap-5 items-start">
                  {/* LEFT: Procedure list with colored icons */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                    {[
                      { name: 'Injection (IM/IV/SC)', cat: 'Injections & Infusions', bg: 'bg-blue-50', icon: '💉' },
                      { name: 'Nebulization', cat: 'Respiratory Therapy', bg: 'bg-cyan-50', icon: '🌬️' },
                      { name: 'ECG', cat: 'Cardiac Procedures', bg: 'bg-rose-50', icon: '❤️' },
                      { name: 'Dressing', cat: 'Wound Care', bg: 'bg-purple-50', icon: '🩹' },
                      { name: 'Suture Removal', cat: 'Minor Procedures', bg: 'bg-orange-50', icon: '✂️' },
                      { name: 'Vaccination', cat: 'Preventive Care', bg: 'bg-teal-50', icon: '🛡️' },
                      { name: 'Physiotherapy Session', cat: 'Therapy & Rehab', bg: 'bg-indigo-50', icon: '🤸' },
                    ].map((pItem) => {
                      const isAdded = procedures.some(p => p.name === pItem.name);
                      return (
                        <button
                          key={pItem.name}
                          onClick={() => {
                            if (!isAdded) {
                              setProcedures([...procedures, {
                                name: pItem.name, fee: 150, status: 'scheduled',
                                indication: '', medication: '', frequency: 'Once',
                                route: '', duration: '', dose: '', site: ''
                              }]);
                              setIsDirty(true);
                            }
                          }}
                          className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 border-b border-slate-100 last:border-0 transition ${isAdded ? 'bg-emerald-50/60' : 'hover:bg-slate-50'}`}
                        >
                          <div className={`w-7 h-7 rounded-lg ${pItem.bg} flex items-center justify-center text-sm shrink-0`}>{pItem.icon}</div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-800 leading-tight truncate">{pItem.name}</p>
                            <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">{pItem.cat}</p>
                          </div>
                          {isAdded && <Check size={11} className="text-emerald-500 shrink-0" />}
                        </button>
                      );
                    })}
                    <button className="w-full py-2.5 text-center text-xs font-bold text-indigo-600 hover:bg-indigo-50 border-t border-slate-100 transition flex items-center justify-center gap-1">
                      View All Procedures <ArrowRight size={11} />
                    </button>
                  </div>

                  {/* RIGHT: Selected procedures */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-bold text-slate-700">Selected Procedures ({procedures.length})</h4>
                      {procedures.length > 0 && (
                        <button onClick={() => { setProcedures([]); setIsDirty(true); }} className="text-xs font-bold text-rose-500 hover:text-rose-700 transition">
                          Clear All
                        </button>
                      )}
                    </div>

                    {procedures.map((p, index) => (
                      <div key={index} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                        {/* Card header */}
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/40">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-extrabold text-[10px]">{index + 1}</span>
                            <span className="text-sm font-bold text-slate-800">{p.name}</span>
                            <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-600 text-[9px] font-black uppercase rounded-full">Planned</span>
                          </div>
                          <button onClick={() => { setProcedures(procedures.filter((_, i) => i !== index)); setIsDirty(true); }} className="text-slate-300 hover:text-rose-500 transition p-1 rounded-lg hover:bg-rose-50">
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {/* Card body */}
                        <div className="px-4 py-3 space-y-3">
                          {/* Notes / Indication */}
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Notes / Indication</label>
                            <input
                              type="text"
                              value={p.indication}
                              onChange={(e) => { const u = [...procedures]; u[index].indication = e.target.value; setProcedures(u); setIsDirty(true); }}
                              placeholder={p.name === 'Nebulization' ? 'For wheezing and breathlessness' : 'Enter notes or indication...'}
                              className="w-full px-3 py-2 text-xs text-slate-700 border border-slate-200 rounded-xl bg-slate-50/60 focus:bg-white focus:outline-none focus:border-indigo-400 transition"
                            />
                          </div>

                          {/* Nebulization fields */}
                          {p.name === 'Nebulization' && (
                            <>
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Medication / Solution</label>
                                  <select value={p.medication || 'Salbutamol 2.5ml'} onChange={(e) => { const u = [...procedures]; u[index].medication = e.target.value; setProcedures(u); setIsDirty(true); }} className="w-full px-3 py-2 text-xs text-slate-700 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-indigo-400 transition">
                                    <option>Salbutamol 2.5ml</option>
                                    <option>Duolin 2.5ml</option>
                                    <option>Budesonide</option>
                                    <option>Ipratropium</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Frequency</label>
                                  <select value={p.frequency || 'Once'} onChange={(e) => { const u = [...procedures]; u[index].frequency = e.target.value; setProcedures(u); setIsDirty(true); }} className="w-full px-3 py-2 text-xs text-slate-700 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-indigo-400 transition">
                                    <option>Once</option><option>Twice</option><option>Three times</option><option>Hourly</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Route / Method</label>
                                  <select value={p.route || 'Nebulizer'} onChange={(e) => { const u = [...procedures]; u[index].route = e.target.value; setProcedures(u); setIsDirty(true); }} className="w-full px-3 py-2 text-xs text-slate-700 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-indigo-400 transition">
                                    <option>Nebulizer</option><option>MDI</option><option>DPI</option>
                                  </select>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Duration</label>
                                  <div className="flex items-center gap-2">
                                    <input type="text" value={p.duration || '10'} onChange={(e) => { const u = [...procedures]; u[index].duration = e.target.value; setProcedures(u); setIsDirty(true); }} placeholder="10" className="w-20 px-3 py-2 text-xs text-slate-700 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-indigo-400 transition" />
                                    <span className="text-xs text-slate-400">min</span>
                                  </div>
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Charge (₹)</label>
                                  <input type="number" value={p.fee || 250} onChange={(e) => { const u = [...procedures]; u[index].fee = Number(e.target.value); setProcedures(u); setIsDirty(true); }} placeholder="250" className="w-full px-3 py-2 text-xs text-slate-700 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-indigo-400 transition" />
                                </div>
                              </div>
                            </>
                          )}

                          {/* Injection fields */}
                          {(p.name === 'Injection (IM)' || p.name === 'Injection (IM/IV/SC)') && (
                            <>
                              <div className="grid grid-cols-4 gap-3">
                                <div>
                                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Medication</label>
                                  <select value={p.medication || 'Diclofenac 75 mg'} onChange={(e) => { const u = [...procedures]; u[index].medication = e.target.value; setProcedures(u); setIsDirty(true); }} className="w-full px-3 py-2 text-xs text-slate-700 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-indigo-400 transition">
                                    <option>Diclofenac 75 mg</option><option>Paracetamol 100ml</option><option>Ondansetron 4mg</option><option>Pantoprazole 40mg</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Dose</label>
                                  <div className="flex items-center gap-1">
                                    <input type="text" value={p.dose || '75'} onChange={(e) => { const u = [...procedures]; u[index].dose = e.target.value; setProcedures(u); setIsDirty(true); }} placeholder="75" className="w-full px-3 py-2 text-xs text-slate-700 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-indigo-400 transition" />
                                    <span className="text-[10px] text-slate-400 shrink-0">mg</span>
                                  </div>
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Route</label>
                                  <select value={p.route || 'IM'} onChange={(e) => { const u = [...procedures]; u[index].route = e.target.value; setProcedures(u); setIsDirty(true); }} className="w-full px-3 py-2 text-xs text-slate-700 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-indigo-400 transition">
                                    <option>IM</option><option>IV</option><option>SC</option><option>ID</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Frequency</label>
                                  <select value={p.frequency || 'Once'} onChange={(e) => { const u = [...procedures]; u[index].frequency = e.target.value; setProcedures(u); setIsDirty(true); }} className="w-full px-3 py-2 text-xs text-slate-700 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-indigo-400 transition">
                                    <option>Once</option><option>Twice</option><option>SOS</option>
                                  </select>
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Site</label>
                                  <select value={p.site || 'Upper Gluteal'} onChange={(e) => { const u = [...procedures]; u[index].site = e.target.value; setProcedures(u); setIsDirty(true); }} className="w-full px-3 py-2 text-xs text-slate-700 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-indigo-400 transition">
                                    <option>Upper Gluteal</option><option>Deltoid</option><option>Vastus Lateralis</option><option>Antecubital</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Notes</label>
                                  <input type="text" value={p.indication} onChange={(e) => { const u = [...procedures]; u[index].indication = e.target.value; setProcedures(u); setIsDirty(true); }} placeholder="Given for pain relief" className="w-full px-3 py-2 text-xs text-slate-700 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-indigo-400 transition" />
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Charge (₹)</label>
                                  <input type="number" value={p.fee || 100} onChange={(e) => { const u = [...procedures]; u[index].fee = Number(e.target.value); setProcedures(u); setIsDirty(true); }} placeholder="100" className="w-full px-3 py-2 text-xs text-slate-700 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-indigo-400 transition" />
                                </div>
                              </div>
                            </>
                          )}

                          {/* Generic fields for other procedure types */}
                          {p.name !== 'Nebulization' && p.name !== 'Injection (IM)' && p.name !== 'Injection (IM/IV/SC)' && (
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Frequency</label>
                                <select value={p.frequency || 'Once'} onChange={(e) => { const u = [...procedures]; u[index].frequency = e.target.value; setProcedures(u); setIsDirty(true); }} className="w-full px-3 py-2 text-xs text-slate-700 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-indigo-400 transition">
                                  <option>Once</option><option>Twice</option><option>Daily</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Duration</label>
                                <input type="text" value={p.duration || ''} onChange={(e) => { const u = [...procedures]; u[index].duration = e.target.value; setProcedures(u); setIsDirty(true); }} placeholder="e.g. 30 min" className="w-full px-3 py-2 text-xs text-slate-700 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-indigo-400 transition" />
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Charge (₹)</label>
                                <input type="number" value={p.fee || 150} onChange={(e) => { const u = [...procedures]; u[index].fee = Number(e.target.value); setProcedures(u); setIsDirty(true); }} placeholder="150" className="w-full px-3 py-2 text-xs text-slate-700 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-indigo-400 transition" />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Add Procedure Manually */}
                    <button
                      onClick={() => { setProcedures([...procedures, { name: 'New Procedure', fee: 100, status: 'scheduled', indication: '', medication: '', frequency: 'Once', route: '', duration: '', dose: '', site: '' }]); setIsDirty(true); }}
                      className="w-full py-3 border border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/30 text-slate-500 hover:text-indigo-600 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition"
                    >
                      <Plus size={14} /> Add Procedure Manually
                    </button>
                  </div>
                </div>
              </div>
            )}

            {workspaceTab === 'Advice' && (
              <div className="space-y-4">

                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 bg-white px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm">🥦</div>
                    <span className="text-base font-bold text-slate-800">Patient Advice &amp; Instructions</span>
                  </div>
                  <button className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-1 hover:bg-slate-50 transition">
                    Use Template ▾
                  </button>
                </div>

                {/* Horizontal tabs */}
                <div className="flex gap-4 border-b border-slate-100 pb-2 text-xs font-bold text-slate-400">
                  {[
                    { key: 'Diet Advice', label: 'Diet Advice' },
                    { key: 'Lifestyle Advice', label: 'Lifestyle Advice' },
                    { key: 'Activity / Exercise', label: 'Activity / Exercise' },
                    { key: 'Restrictions', label: 'Restrictions' },
                    { key: 'Precautions', label: 'Precautions' },
                    { key: 'Home Care', label: 'Home Care' },
                    { key: 'General Instructions', label: 'General Instructions' }
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setAdviceSubTab(tab.key)}
                      className={`pb-2 transition ${adviceSubTab === tab.key ? 'text-emerald-500 border-b-2 border-emerald-500 font-extrabold' : 'hover:text-slate-600'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Main section: Left details (rich content), Right: Quick Templates */}
                <div className="grid grid-cols-[1fr_260px] gap-4">

                  {/* Left: Active card and lists */}
                  <div className="space-y-4">
                    {/* Active Advice Sub-tab details */}
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/40">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-500">🥦</span>
                          <span className="text-xs font-bold text-slate-800">{adviceSubTab} Details</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const activeField = 
                                adviceSubTab === 'Diet Advice' ? 'dietAdviceText' :
                                adviceSubTab === 'Lifestyle Advice' ? 'lifestyleAdviceText' :
                                adviceSubTab === 'Activity / Exercise' ? 'activityAdviceText' :
                                adviceSubTab === 'Restrictions' ? 'restrictionsText' :
                                adviceSubTab === 'Precautions' ? 'precautionsText' : 'generalInstructionsText';

                              if (isRecording && dictatingField === activeField) {
                                stopVoiceDictation();
                              } else {
                                startVoiceDictation(activeField);
                              }
                            }}
                            className={`p-1.5 rounded-lg transition ${
                              isRecording && dictatingField === (
                                adviceSubTab === 'Diet Advice' ? 'dietAdviceText' :
                                adviceSubTab === 'Lifestyle Advice' ? 'lifestyleAdviceText' :
                                adviceSubTab === 'Activity / Exercise' ? 'activityAdviceText' :
                                adviceSubTab === 'Restrictions' ? 'restrictionsText' :
                                adviceSubTab === 'Precautions' ? 'precautionsText' : 'generalInstructionsText'
                              )
                                ? 'text-rose-600 bg-rose-50 animate-pulse'
                                : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                            }`}
                            title={isRecording && dictatingField ? 'Stop Recording' : 'Start Dictation'}
                          >
                            <Mic size={13} />
                          </button>
                          <button className="text-[10px] text-indigo-600 font-bold hover:underline">Insert Template</button>
                        </div>
                      </div>
                      {/* Rich Text controls */}
                      <div className="flex items-center gap-0.5 px-3 py-2 border-b border-slate-100 bg-white">
                        {['B', 'I', 'U'].map((fmt) => (
                          <button key={fmt} className="w-6 h-6 rounded font-bold text-[10px] text-slate-500 hover:bg-slate-100 transition flex items-center justify-center">{fmt}</button>
                        ))}
                        <div className="w-px h-4 bg-slate-200 mx-1" />
                        {['≡', '⁝', '🔗', '↔'].map((icon) => (
                          <button key={icon} className="w-6 h-6 rounded text-[10px] text-slate-500 hover:bg-slate-100 transition flex items-center justify-center">{icon}</button>
                        ))}
                      </div>
                      <textarea
                        value={
                          adviceSubTab === 'Diet Advice' ? dietAdviceText :
                            adviceSubTab === 'Lifestyle Advice' ? lifestyleAdviceText :
                              adviceSubTab === 'Activity / Exercise' ? activityAdviceText :
                                adviceSubTab === 'Restrictions' ? restrictionsText :
                                  adviceSubTab === 'Precautions' ? precautionsText : generalInstructionsText
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (adviceSubTab === 'Diet Advice') setDietAdviceText(val);
                          else if (adviceSubTab === 'Lifestyle Advice') setLifestyleAdviceText(val);
                          else if (adviceSubTab === 'Activity / Exercise') setActivityAdviceText(val);
                          else if (adviceSubTab === 'Restrictions') setRestrictionsText(val);
                          else if (adviceSubTab === 'Precautions') setPrecautionsText(val);
                          else setGeneralInstructionsText(val);
                          setIsDirty(true);
                        }}
                        rows={5}
                        className="w-full px-4 py-3 text-xs text-slate-700 border-0 focus:outline-none focus:ring-0 resize-none placeholder-slate-400 leading-relaxed bg-white"
                        placeholder={`Enter details for ${adviceSubTab}...`}
                      />
                      {adviceSubTab === 'Diet Advice' && (
                        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/20">
                          <button className="px-3.5 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 text-[10px] font-black uppercase rounded-xl transition flex items-center gap-1">
                            + Add Food Item
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Secondary sections grid */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Lifestyle Advice Card */}
                      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm relative group">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-1.5 mb-2">
                          <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="text-emerald-500">🌱</span> Lifestyle Advice
                          </span>
                          <button className="text-[9px] text-indigo-650 font-bold hover:underline opacity-0 group-hover:opacity-100 transition">Use Template</button>
                        </div>
                        <textarea
                          value={lifestyleAdviceText}
                          onChange={(e) => { setLifestyleAdviceText(e.target.value); setIsDirty(true); }}
                          rows={2}
                          className="w-full text-[11px] text-slate-600 focus:outline-none resize-none font-medium leading-relaxed bg-transparent"
                        />
                      </div>

                      {/* Activity / Exercise Card */}
                      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm relative group">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-1.5 mb-2">
                          <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="text-amber-500">🏃</span> Activity / Exercise
                          </span>
                          <button className="text-[9px] text-indigo-650 font-bold hover:underline opacity-0 group-hover:opacity-100 transition">Use Template</button>
                        </div>
                        <textarea
                          value={activityAdviceText}
                          onChange={(e) => { setActivityAdviceText(e.target.value); setIsDirty(true); }}
                          rows={2}
                          className="w-full text-[11px] text-slate-600 focus:outline-none resize-none font-medium leading-relaxed bg-transparent"
                        />
                      </div>

                      {/* Restrictions Card */}
                      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm relative group">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-1.5 mb-2">
                          <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="text-rose-500">🚫</span> Restrictions
                          </span>
                          <button className="text-[9px] text-indigo-650 font-bold hover:underline opacity-0 group-hover:opacity-100 transition">Use Template</button>
                        </div>
                        <textarea
                          value={restrictionsText}
                          onChange={(e) => { setRestrictionsText(e.target.value); setIsDirty(true); }}
                          rows={2}
                          className="w-full text-[11px] text-slate-600 focus:outline-none resize-none font-medium leading-relaxed bg-transparent"
                        />
                      </div>

                      {/* Precautions Card */}
                      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm relative group">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-1.5 mb-2">
                          <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="text-indigo-550">🛡️</span> Precautions
                          </span>
                          <button className="text-[9px] text-indigo-650 font-bold hover:underline opacity-0 group-hover:opacity-100 transition">Use Template</button>
                        </div>
                        <textarea
                          value={precautionsText}
                          onChange={(e) => { setPrecautionsText(e.target.value); setIsDirty(true); }}
                          rows={2}
                          className="w-full text-[11px] text-slate-600 focus:outline-none resize-none font-medium leading-relaxed bg-transparent"
                        />
                      </div>
                    </div>

                    {/* General Instructions Card */}
                    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm relative group">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-1.5 mb-2">
                        <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="text-blue-500">ℹ️</span> General Instructions
                        </span>
                        <button className="text-[9px] text-indigo-650 font-bold hover:underline opacity-0 group-hover:opacity-100 transition">Use Template</button>
                      </div>
                      <textarea
                        value={generalInstructionsText}
                        onChange={(e) => { setGeneralInstructionsText(e.target.value); setIsDirty(true); }}
                        rows={2}
                        className="w-full text-[11px] text-slate-600 focus:outline-none resize-none font-medium leading-relaxed bg-transparent"
                      />
                    </div>
                  </div>

                  {/* Right Panel: Quick Templates */}
                  <div className="space-y-4">
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm p-4 space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Quick Templates</span>
                        <button className="text-[10px] text-slate-400 hover:text-slate-600">🔄</button>
                      </div>
                      <div className="space-y-2 text-[11px] font-semibold text-slate-655">
                        {[
                          'Fever Diet Plan',
                          'Diabetes Diet Plan',
                          'Hypertension Diet',
                          'Heart Healthy Diet',
                          'Post Surgery Diet'
                        ].map((tName) => (
                          <div
                            key={tName}
                            onClick={() => {
                              setDietAdviceText(`• High fluids intake.\n• Standard nutrition plan for ${tName}.`);
                              setIsDirty(true);
                              toast.success(`Applied ${tName}`);
                            }}
                            className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer transition"
                          >
                            {tName}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {workspaceTab === 'Follow-up' && (
              <div className="space-y-4">

                {/* Follow up Plan main card details */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm p-4 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <span className="text-emerald-500 text-sm">📅</span>
                    <strong className="text-base font-bold text-slate-800">Follow-up Plan</strong>
                  </div>

                  <div className="grid grid-cols-[auto_auto_1fr_180px] gap-4 items-center">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Follow-up Type *</label>
                      <div className="flex gap-1.5">
                        {['In-Clinic', 'Tele-Consultation', 'Review Only'].map((fType) => (
                          <button
                            key={fType}
                            type="button"
                            onClick={() => setFollowUpType(fType)}
                            className={`px-3 py-2 rounded-xl text-[10px] font-bold border transition ${followUpType === fType
                                ? 'bg-emerald-50 border-emerald-250 text-emerald-800'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                          >
                            {fType}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Follow-up After *</label>
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={followUpAfterVal}
                          onChange={(e) => setFollowUpAfterVal(e.target.value)}
                          className="w-12 px-2.5 py-2 text-xs text-slate-700 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 text-center"
                        />
                        <select
                          value={followUpAfterUnit}
                          onChange={(e) => setFollowUpAfterUnit(e.target.value)}
                          className="px-2.5 py-2 text-xs text-slate-605 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-indigo-400"
                        >
                          <option>Days</option>
                          <option>Weeks</option>
                          <option>Months</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Follow-up Date *</label>
                      <input
                        type="date"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs text-slate-700 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 transition"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Time (Optional)</label>
                      <input
                        type="text"
                        value={followUpTime}
                        onChange={(e) => setFollowUpTime(e.target.value)}
                        placeholder="10:30 AM"
                        className="w-full px-3 py-2 text-xs text-slate-700 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-[1fr_200px] gap-4">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Reason for Follow-up *</label>
                        <button
                          type="button"
                          onClick={() => {
                            if (isRecording && dictatingField === 'followUpReason') {
                              stopVoiceDictation();
                            } else {
                              startVoiceDictation('followUpReason');
                            }
                          }}
                          className={`p-0.5 rounded transition ${
                            isRecording && dictatingField === 'followUpReason'
                              ? 'text-rose-600 bg-rose-50 animate-pulse'
                              : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                          }`}
                          title={isRecording && dictatingField === 'followUpReason' ? 'Stop Recording' : 'Start Dictation'}
                        >
                          <Mic size={11} />
                        </button>
                      </div>
                      <textarea
                        value={followUpReason}
                        onChange={(e) => setFollowUpReason(e.target.value)}
                        placeholder="Review of symptoms and response to medication."
                        rows={2}
                        className="w-full px-3 py-2 text-xs text-slate-700 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 resize-none leading-relaxed"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Priority</label>
                      <div className="flex gap-1.5 pt-0.5">
                        {['Routine', 'Soon', 'Urgent'].map((prio) => (
                          <button
                            key={prio}
                            type="button"
                            onClick={() => setFollowUpPriority(prio)}
                            className={`flex-1 py-2 rounded-xl text-[10px] font-bold border transition ${followUpPriority === prio
                                ? 'bg-emerald-50 border-emerald-250 text-emerald-800'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                          >
                            {prio}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Instructions + Templates section */}
                <div className="grid grid-cols-[1fr_260px] gap-4">
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="flex justify-between items-center px-4 py-3 border-b border-slate-100 bg-slate-50/40">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="text-indigo-500">📄</span> Follow-up Instructions for Patient
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (isRecording && dictatingField === 'followUpInstructions') {
                              stopVoiceDictation();
                            } else {
                              startVoiceDictation('followUpInstructions');
                            }
                          }}
                          className={`p-1.5 rounded-lg transition ${
                            isRecording && dictatingField === 'followUpInstructions'
                              ? 'text-rose-600 bg-rose-50 animate-pulse'
                              : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                          }`}
                          title={isRecording && dictatingField === 'followUpInstructions' ? 'Stop Recording' : 'Start Dictation'}
                        >
                          <Mic size={13} />
                        </button>
                        <button className="text-[10px] text-indigo-650 font-bold hover:underline">Use Template ▾</button>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 px-3 py-2 border-b border-slate-100 bg-white">
                      {['B', 'I', 'U'].map((fmt) => (
                        <button key={fmt} className="w-6 h-6 rounded font-bold text-[10px] text-slate-500 hover:bg-slate-100 transition flex items-center justify-center">{fmt}</button>
                      ))}
                      <div className="w-px h-4 bg-slate-200 mx-1" />
                      {['≡', '⁝', '🔗', '↔'].map((icon) => (
                        <button key={icon} className="w-6 h-6 rounded text-[10px] text-slate-500 hover:bg-slate-100 transition flex items-center justify-center">{icon}</button>
                      ))}
                    </div>
                    <textarea
                      value={followUpInstructions}
                      onChange={(e) => setFollowUpInstructions(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 text-xs text-slate-700 border-0 focus:outline-none focus:ring-0 resize-none placeholder-slate-400 leading-relaxed bg-white"
                      placeholder="Take medicines as prescribed..."
                    />
                  </div>

                  {/* Templates Panel */}
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm p-4 space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Quick Templates</span>
                    </div>
                    <div className="space-y-2 text-[11px] font-semibold text-slate-655">
                      {[
                        'General Follow-up',
                        'Chronic Disease Review',
                        'Post Procedure Review',
                        'Lab Report Review',
                        'Medication Review'
                      ].map((tName) => (
                        <div
                          key={tName}
                          onClick={() => {
                            setFollowUpInstructions(`• Regular follow-up checklist for ${tName}.`);
                            setIsDirty(true);
                            toast.success(`Applied ${tName}`);
                          }}
                          className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer transition"
                        >
                          {tName}
                        </div>
                      ))}
                    </div>
                    <button className="w-full text-center text-[10px] text-indigo-600 font-bold hover:underline block pt-1">
                      View All Templates
                    </button>
                  </div>
                </div>

                {/* Checklist panels below */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Required Before Visit Checklist */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="text-indigo-500">📎</span> Required Before Next Visit
                    </span>
                    <div className="space-y-2 text-xs font-medium text-slate-700">
                      {[
                        { label: 'Bring previous reports', val: bringReports, set: setBringReports },
                        { label: 'Complete lab tests', val: completeLabTests, set: setCompleteLabTests },
                        { label: 'BP chart', val: bpChart, set: setBpChart },
                        { label: 'Blood sugar log', val: bloodSugarLog, set: setBloodSugarLog },
                      ].map((chk) => (
                        <label key={chk.label} className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={chk.val}
                            onChange={(e) => { chk.set(e.target.checked); setIsDirty(true); }}
                            className="rounded border-slate-350 accent-indigo-600 focus:ring-indigo-500"
                          />
                          <span>{chk.label}</span>
                        </label>
                      ))}
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Other</span>
                        <input
                          type="text"
                          value={otherRequiredField}
                          onChange={(e) => { setOtherRequiredField(e.target.value); setIsDirty(true); }}
                          placeholder="Please specify..."
                          className="flex-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-400 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Recommended Lab Tests Checklist */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="text-indigo-500">🔬</span> Recommended Before Next Visit
                      </span>
                      <button
                        onClick={() => {
                          const testName = prompt('Enter recommended lab test:');
                          if (testName) { setRecommendedLabTests([...recommendedLabTests, testName]); setIsDirty(true); }
                        }}
                        className="text-[10px] text-indigo-650 hover:text-indigo-850 font-black uppercase tracking-wider transition"
                      >
                        + Add Item
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {recommendedLabTests.map((test, index) => (
                        <div key={index} className="flex justify-between items-center text-xs p-2.5 bg-slate-50 border border-slate-150 rounded-xl">
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-500 text-[10px]">🧪</span>
                            <span className="font-semibold text-slate-700">{test}</span>
                          </div>
                          <button
                            onClick={() => { setRecommendedLabTests(recommendedLabTests.filter((_, i) => i !== index)); setIsDirty(true); }}
                            className="text-slate-300 hover:text-rose-600 transition"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => setWorkspaceTab('Laboratory')}
                      className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-707 font-bold rounded-xl text-center transition text-xs mt-2"
                    >
                      + Add Lab Test
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {workspaceTab === 'Previous Visits' && (
              <PreviousVisitsWorkspace
                patient={patient}
                currentUser={doctor}
                navigate={navigate}
              />
            )}

            {workspaceTab === 'Current Medicines' && (
              <CurrentMedicinesWorkspace
                patient={patient}
                currentUser={doctor}
                navigate={navigate}
                currentMedicines={medicines}
                setMedicines={setMedicines}
                setIsDirty={setIsDirty}
              />
            )}

            {workspaceTab === 'Chronic Conditions' && (
              <ChronicConditionsWorkspace
                patient={patient}
                currentUser={doctor}
                navigate={navigate}
                currentMedicines={medicines}
                setMedicines={setMedicines}
                setIsDirty={setIsDirty}
              />
            )}
          </div>

          {/* Unsaved Changes Indicator */}
          {isDirty && (
            <div className="text-[10px] text-slate-455 italic text-right shrink-0">
              ● Unsaved changes in current session (will auto-save in background)
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Premium AI Clinical Assistant & Alerts */}
        {!['Previous Visits', 'Current Medicines', 'Chronic Conditions'].includes(workspaceTab) && (
          <div className="flex flex-col gap-5">
          {/* AI Clinical Assistant (Gated by subscription) */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-indigo-707 flex items-center gap-1.5">
                <Sparkles size={14} className="text-indigo-600" />
                {workspaceTab === 'Laboratory' ? 'AI CONSULTATION ASSISTANT' : 'AI CLINICAL ASSISTANT'}
              </h3>
              <span className="text-[8px] bg-indigo-50 text-indigo-606 font-extrabold px-1.5 py-0.5 rounded">BETA</span>
            </div>

            {workspaceTab === 'Laboratory' ? (
              <>
                <div className="flex border-b border-slate-150 gap-4 text-xs font-bold shrink-0 pb-1.5">
                  <button className="text-indigo-650 border-b-2 border-indigo-650 pb-1">Suggestions</button>
                  <button className="text-slate-400 pb-1">Summary</button>
                </div>
                {!assistantFeature.enabled ? (
                  <PremiumFeaturePlaceholder
                    featureCode="consultation_assistant"
                    featureName="AI Clinical Assistant"
                    description="Suggests diagnoses, risk scorings, and recommends treatments."
                    onRequested={() => handleRequestAccess('consultation_assistant')}
                  />
                ) : (
                  <div className="space-y-4 text-xs">
                    <div className="space-y-2">
                      <span className="text-[10px] text-slate-455 font-black uppercase tracking-wider block">AI Suggested Tests</span>
                      <ul className="list-disc pl-4 space-y-1.5 text-slate-600 font-medium">
                        <li>CBC</li>
                        <li>CRP</li>
                        <li>Dengue NS1</li>
                        <li>Urine Routine</li>
                      </ul>
                    </div>
                    <button className="w-full py-2 bg-slate-50 border border-slate-200 text-slate-605 font-bold hover:bg-slate-100 rounded-xl transition text-center text-[10px] uppercase">
                      View All Suggestions
                    </button>
                  </div>
                )}
              </>
            ) : workspaceTab === 'Diagnosis' ? (
              <div className="space-y-4 text-xs">
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-455 font-black uppercase tracking-wider block">Diagnosis Suggestions</span>
                  <ol className="list-decimal pl-4 space-y-1.5 text-slate-600 font-medium">
                    <li className="flex justify-between items-center">
                      <span>Acute Viral Fever</span>
                      <span className="bg-emerald-100 text-emerald-800 text-[8px] font-black px-1 rounded">Most Likely</span>
                    </li>
                    <li>Dengue Fever</li>
                    <li>Influenza</li>
                  </ol>
                </div>
                <button className="w-full py-2 bg-slate-50 border border-slate-200 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition text-center text-[10px] uppercase">
                  View More Suggestions
                </button>
              </div>
            ) : workspaceTab === 'History' ? (
              <div className="space-y-4 text-xs">
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-455 font-black uppercase tracking-wider block">Smart Suggestions</span>
                  <ul className="list-disc pl-4 space-y-1.5 text-slate-600 font-medium">
                    <li>Consider CBC, Dengue NS1 if fever persists.</li>
                    <li>Hydration and rest advised.</li>
                    <li>Paracetamol for fever and body ache.</li>
                  </ul>
                </div>
                <button className="w-full py-2 bg-slate-50 border border-slate-200 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition text-center text-[10px] uppercase">
                  View More Suggestions
                </button>
              </div>
            ) : workspaceTab === 'Examination' ? (
              <div className="space-y-4 text-xs">
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-455 font-black uppercase tracking-wider block">Clinical Insights</span>
                  <ul className="list-disc pl-4 space-y-1.5 text-slate-600 font-medium">
                    <li>Vitals are within normal range.</li>
                    <li>No immediate risk identified.</li>
                    <li>Patient has history of Asthma.</li>
                    <li>Consider avoiding triggers.</li>
                  </ul>
                </div>
                <button className="w-full py-2 bg-slate-50 border border-slate-200 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition text-center text-[10px] uppercase">
                  More Insights
                </button>
              </div>
            ) : workspaceTab === 'Procedures' ? (
              <div className="space-y-4 text-xs">
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-455 font-black uppercase tracking-wider block">Relevant Suggestions</span>
                  <ul className="list-disc pl-4 space-y-1.5 text-slate-600 font-medium">
                    <li>Nebulization may help with bronchospasm.</li>
                    <li>Consider ECG to rule out arrhythmia.</li>
                    <li>Adequate hydration advised.</li>
                  </ul>
                </div>
                <button className="w-full py-2 bg-slate-50 border border-slate-200 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition text-center text-[10px] uppercase">
                  View More Suggestions
                </button>
              </div>
            ) : workspaceTab === 'Advice' ? (
              <div className="space-y-4 text-xs">
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-455 font-black uppercase tracking-wider block">Personalized Advice Suggestions</span>
                  <ul className="list-disc pl-4 space-y-1.5 text-slate-600 font-medium">
                    <li>Ensure adequate hydration.</li>
                    <li>Recommend rest for faster recovery.</li>
                    <li>Monitor fever and report if &gt; 102°F.</li>
                  </ul>
                </div>
                <button
                  onClick={() => {
                    setDietAdviceText(prev => prev + `\n• Ensure adequate hydration.\n• Rest for faster recovery.\n• Monitor fever.`);
                    setIsDirty(true);
                    toast.success('Suggestions applied to Diet Advice!');
                  }}
                  className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-707 font-bold rounded-xl transition text-center text-[10px] uppercase"
                >
                  Apply Suggestions
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-455 font-black uppercase tracking-wider block">Follow-up Suggestions</span>
                  <ul className="list-disc pl-4 space-y-1.5 text-slate-600 font-medium">
                    <li>Review in 1 week to assess symptom relief.</li>
                    <li>Check BP and lipid profile in next visit.</li>
                    <li>Re-evaluate medication dosage if needed.</li>
                  </ul>
                </div>
                <button className="w-full py-2 bg-slate-50 border border-slate-200 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition text-center text-[10px] uppercase">
                  Apply Suggestions
                </button>
              </div>
            )}

            {/* AI Risk Score */}
            <div className="border-t border-slate-100 pt-3.5 space-y-2">
              <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-455 tracking-wider">
                <span>Risk Score (AI)</span>
                <span>Score: 62/100</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3.5 py-1 bg-amber-50 border border-amber-250 text-amber-705 text-[10px] font-black uppercase rounded-lg">
                  Moderate Risk
                </span>
                <div className="h-2 flex-1 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: '62%' }} />
                </div>
              </div>
            </div>

            {/* Subscribed Plan details */}
            <div className="border-t border-slate-100 pt-3.5 space-y-2.5 text-[11px] text-slate-650">
              <div className="flex justify-between items-center font-bold">
                <span className="text-slate-400">YOUR PLAN:</span>
                <span className="text-indigo-650 uppercase">AI PROFESSIONAL CLINIC</span>
              </div>
              {[
                { label: 'Voice-to-Text', code: 'voice_to_text' },
                { label: 'AI Symptom Checker', code: 'symptom_checker' },
                { label: 'AI Consultation Assistant', code: 'consultation_assistant' },
                { label: 'AI Prescription Suggestions', code: 'prescription_suggestions' },
                { label: 'AI Risk Scoring', code: 'risk_scoring' },
                { label: 'Advanced Analytics', code: 'advanced_analytics' }
              ].map((f) => {
                const detail = getFeatureDetail(f.code);
                const isIncluded = detail?.enabled;
                return (
                  <div key={f.label} className="flex justify-between items-center">
                    <span className="font-semibold text-slate-600">{f.label}</span>
                    <span className={isIncluded ? "text-emerald-650 font-bold" : "text-rose-650 font-bold"}>
                      {isIncluded ? 'Included' : 'Not Included'}
                    </span>
                  </div>
                );
              })}
              <button className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-707 font-bold rounded-xl text-center transition mt-2">
                Manage Subscription
              </button>
            </div>
          </div>

          {/* Clinical Alerts */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-rose-707 flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-rose-500" />
                CLINICAL ALERTS <span className="bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded text-[10px] font-black">2</span>
              </h3>
            </div>

            {!clinicalAlertsFeature.enabled ? (
              <PremiumFeaturePlaceholder
                featureCode="clinical_alerts"
                featureName="AI Clinical Alerts"
                description="Monitors drug-allergy interactions, contraindications, and therapy duplication."
                onRequested={() => handleRequestAccess('clinical_alerts')}
              />
            ) : (
              <div className="space-y-3 text-xs">
                {/* Allergy alert */}
                <div className="bg-rose-50 border border-rose-100 p-3 rounded-2xl text-rose-800 space-y-1">
                  <span className="font-black text-[9px] uppercase tracking-wider block">Allergy Alert</span>
                  <p className="leading-relaxed">Patient is allergic to Penicillin.</p>
                </div>

                {/* Duplicate therapy / High risk alert */}
                <div className="bg-rose-50 border border-rose-100 p-3 rounded-2xl text-rose-800 space-y-1">
                  <span className="font-black text-[9px] uppercase tracking-wider block">
                    {workspaceTab === 'Procedures' ? 'Drug Interaction' : 'High Risk Condition'}
                  </span>
                  <p className="leading-relaxed">
                    {workspaceTab === 'Procedures' ? 'No interactions with planned procedures.' : 'Follow-up important for Asthma control.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* dynamic checklists for different tabs */}
          {(workspaceTab === 'History') && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">CONSULTATION CHECKLIST</h3>
              <div className="space-y-2.5 text-xs">
                {[
                  { label: 'History Completed', done: true },
                  { label: 'Vitals Recorded', done: true },
                  { label: 'Examination Pending', done: false },
                  { label: 'Diagnosis Pending', done: false },
                  { label: 'Prescription Pending', done: false },
                  { label: 'Lab Tests Pending', done: false },
                  { label: 'Follow-up Pending', done: false },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    {item.done ? (
                      <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0 block" />
                    )}
                    <span className={item.done ? 'text-slate-700 font-bold' : 'text-slate-400'}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(workspaceTab === 'Examination') && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">EXAMINATION CHECKLIST</h3>
              <div className="space-y-2.5 text-xs">
                {[
                  { label: 'Vitals Recorded', done: true },
                  { label: 'General Examination Added', done: true },
                  { label: 'Systemic Examination Added', done: true },
                  { label: 'Diagnosis Added', done: false },
                  { label: 'Prescription Added', done: false },
                  { label: 'Lab Tests Added', done: false },
                  { label: 'Follow-up Added', done: false },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    {item.done ? (
                      <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0 block" />
                    )}
                    <span className={item.done ? 'text-slate-700 font-bold' : 'text-slate-400'}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(workspaceTab === 'Diagnosis') && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">DIAGNOSIS CHECKLIST</h3>
              <div className="space-y-2.5 text-xs">
                {[
                  { label: 'Chief Complaint Added', done: true },
                  { label: 'History Taken', done: true },
                  { label: 'Examination Recorded', done: true },
                  { label: 'Diagnosis Added', done: false },
                  { label: 'Differential Added', done: false },
                  { label: 'Treatment Plan Added', done: false },
                  { label: 'Follow-up Planned', done: false },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    {item.done ? (
                      <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0 block" />
                    )}
                    <span className={item.done ? 'text-slate-700 font-bold' : 'text-slate-400'}>{item.label}</span>
                  </div>
                ))}
              </div>

              {/* Quick Templates Block in Right Panel under Diagnosis Checklist */}
              <div className="border-t border-slate-100 pt-3.5 space-y-2">
                <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-455 tracking-wider">
                  <span>Quick Templates</span>
                  <button className="text-[9px] text-indigo-650 font-bold hover:underline">+ Save as Template</button>
                </div>
                <div className="space-y-1.5 text-[11px] font-semibold text-slate-650">
                  <div className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer transition flex items-center justify-between">
                    <span>+ Viral Fever Template</span>
                  </div>
                  <div className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer transition flex items-center justify-between">
                    <span>- Upper Respiratory Infection</span>
                  </div>
                  <div className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer transition flex items-center justify-between">
                    <span>- Allergic Rhinitis</span>
                  </div>
                </div>
                <button className="w-full text-center text-[9px] text-indigo-600 font-bold hover:underline block pt-1">
                  View All Templates
                </button>
              </div>
            </div>
          )}

          {workspaceTab === 'Laboratory' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">LAB ORDER CHECKLIST</h3>
              <div className="space-y-2.5 text-xs">
                {[
                  { label: 'Patient Vitals Checked', done: true },
                  { label: 'Diagnosis Added', done: true },
                  { label: 'Lab Tests Selected', done: false },
                  { label: 'Priority Assigned', done: false },
                  { label: 'Fasting Status Specified', done: false },
                  { label: 'Sample Collection Preference', done: false },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    {item.done ? (
                      <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0 block" />
                    )}
                    <span className={item.done ? 'text-slate-700 font-bold' : 'text-slate-400'}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {workspaceTab === 'Procedures' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">PROCEDURE CHECKLIST</h3>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  <span className="text-slate-707 font-bold">History Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  <span className="text-slate-707 font-bold">Examination Done</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  <span className="text-slate-707 font-bold">Diagnosis Added</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  <span className="text-slate-707 font-bold">Prescription Added</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-slate-350 shrink-0" />
                  <span className="text-slate-400">Lab Tests Added</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  <span className="text-slate-707 font-bold">Procedures Added</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-slate-350 shrink-0" />
                  <span className="text-slate-400">Advice Added</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-slate-350 shrink-0" />
                  <span className="text-slate-400">Follow-up Added</span>
                </div>
              </div>
            </div>
          )}

          {workspaceTab === 'Advice' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">ADVICE CHECKLIST</h3>
              <div className="space-y-2.5 text-xs">
                {['Diet Advice Added', 'Lifestyle Advice Added', 'Activity / Exercise Added', 'Restrictions Added', 'Precautions Added', 'General Instructions Added'].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                    <span className="text-slate-707 font-bold">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {workspaceTab === 'Follow-up' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">FOLLOW-UP CHECKLIST</h3>
              <div className="space-y-2.5 text-xs font-semibold text-slate-650">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  <span className="text-slate-707 font-bold">Diagnosis Added</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  <span className="text-slate-707 font-bold">Treatment Plan Added</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  <span className="text-slate-707 font-bold">Advice Added</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  <span className="text-slate-707 font-bold">Laboratory Added</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  <span className="text-slate-707 font-bold">Procedures Added</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  <span className="text-slate-707 font-bold">Follow-up Added</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  <span className="text-slate-707 font-bold">Prescription Generated</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0 block" />
                  <span className="text-slate-400">Invoice Created</span>
                </div>
              </div>
            </div>
          )}
        </div>
        )}

      </div>

      {promptGlobalTest && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg">⚠️</span>
              <div>
                <h3 className="text-base font-bold text-slate-800">{promptGlobalTest.name}</h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">Global Diagnostic Master</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-150">
              No Laboratory currently offers this test for this clinic.
              <span className="font-bold block mt-2 text-slate-700">Patient Options:</span>
              Choose Nearby Partner Laboratory OR External Laboratory.
            </p>

            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setPromptGlobalTest(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl text-xs transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setPromptGlobalTest(null);
                  setShowNearbyLabsModal(true);
                }}
                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition"
              >
                Find Nearby Partner Labs
              </button>
              <button
                onClick={() => {
                  setLabs([...labs, { testName: promptGlobalTest.name, priority: 'routine', sampleRequired: promptGlobalTest.sampleType || 'Blood', reason: '', provider: 'External Laboratory' }]);
                  setPromptGlobalTest(null);
                  setIsDirty(true);
                  toast.success('Added global test (External Laboratory)');
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition"
              >
                Continue Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {showNearbyLabsModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span>📍</span> Nearby Laboratory Finder
              </h3>
              <button onClick={() => setShowNearbyLabsModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-500">Select a nearby laboratory provider to book the test for the patient.</p>

            <div className="space-y-3">
              {[
                { name: 'Dr Lal PathLabs', distance: '2.1 km', price: 850 },
                { name: 'Thyrocare', distance: '3.4 km', price: 825 },
                { name: 'Metropolis', distance: '4.8 km', price: 910 }
              ].map((labOpt) => (
                <div key={labOpt.name} className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-indigo-50/20 border border-slate-200 rounded-2xl transition">
                  <div>
                    <strong className="text-xs font-bold text-slate-800 block">{labOpt.name}</strong>
                    <span className="text-[10px] text-slate-400">Distance: {labOpt.distance}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-slate-700">₹{labOpt.price}</span>
                    <button
                      onClick={() => {
                        toast.success(`Booked with ${labOpt.name}!`);
                        setShowNearbyLabsModal(false);
                      }}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition"
                    >
                      Book
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ConsultationPage;
