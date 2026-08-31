import { aiAxiosClient, axiosClient, extractErrorMessage, unwrapResponse } from './axiosClient';

const postWithFallback = async ({
  backendPath,
  directPath,
  payload,
  fallbackTransform
}) => {
  try {
    return unwrapResponse(await axiosClient.post(backendPath, payload));
  } catch (error) {
    if (![404, 500, 503].includes(error?.response?.status)) {
      throw error;
    }

    try {
      const response = await aiAxiosClient.post(directPath, payload);
      const data = unwrapResponse(response);
      return typeof fallbackTransform === 'function' ? fallbackTransform(data) : data;
    } catch (directError) {
      throw new Error(extractErrorMessage(directError, 'AI service is unavailable.'));
    }
  }
};

export const aiApi = {
  /**
   * Symptom check — backend validator accepts ONLY: symptoms, age, gender, duration,
   * known_conditions, language. Strip all other fields before sending.
   */
  symptomCheck: async (payload) => {
    const cleanPayload = {
      symptoms: payload.symptoms,
      ...(payload.age != null && { age: payload.age }),
      ...(payload.gender && { gender: payload.gender }),
      ...(payload.duration && { duration: payload.duration }),
      ...(Array.isArray(payload.known_conditions) && payload.known_conditions.length > 0 && {
        known_conditions: payload.known_conditions
      }),
      ...(payload.language && { language: payload.language })
    };
    return postWithFallback({
      backendPath: '/ai/symptom-check',
      directPath: '/symptom-check',
      payload: cleanPayload,
      fallbackTransform: (data) => ({
        possibleConditions: data.possible_conditions || data.possibleConditions || [],
        recommendedSpecialization: data.recommended_specialization || data.recommendedSpecialization || '',
        urgency: data.urgency || 'low',
        redFlags: data.red_flags || data.redFlags || [],
        doctorNoteSummary: data.doctor_note_summary || data.doctorNoteSummary || '',
        disclaimer:
          data.safety_disclaimer ||
          data.disclaimer ||
          'AI suggestions are assistive only and not a final diagnosis.'
      })
    });
  },

  formatClinicalNote: async (payload) =>
    postWithFallback({
      backendPath: '/ai/format-clinical-note',
      directPath: '/format-clinical-note',
      payload
    }),

  transcribeAudio: async (formData) => {
    try {
      const response = await aiAxiosClient.post('/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return unwrapResponse(response);
    } catch (error) {
      throw new Error(extractErrorMessage(error, 'Audio transcription is currently unavailable.'));
    }
  },

  extractDocument: async (formData) => {
    try {
      const response = await axiosClient.post('/ai/ocr-extract', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return unwrapResponse(response);
    } catch (error) {
      throw new Error(extractErrorMessage(error, 'Document extraction is currently unavailable.'));
    }
  },

  publicOcrExtract: async (formData) => {
    try {
      const response = await axiosClient.post('/ai/public/ocr-extract', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return unwrapResponse(response);
    } catch (error) {
      throw new Error(extractErrorMessage(error, 'Document extraction is currently unavailable.'));
    }
  },

  extractLabReport: async (formData) => {
    try {
      const response = await axiosClient.post('/ai/lab-report-extract', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return unwrapResponse(response);
    } catch (error) {
      throw new Error(extractErrorMessage(error, 'Lab report extraction is currently unavailable.'));
    }
  },

  /**
   * Lab test recommendations — backend validator accepts ONLY:
   * symptoms (string), diagnosis (string), age, patient_id, consultation_id
   */
  labTestRecommendations: async (payload) => {
    const cleanPayload = {
      ...(payload.symptoms && { symptoms: payload.symptoms }),
      // map primaryDiagnosis or diagnosis -> diagnosis
      ...((payload.diagnosis || payload.primaryDiagnosis) && {
        diagnosis: payload.diagnosis || payload.primaryDiagnosis
      }),
      ...(payload.age != null && { age: payload.age }),
      ...((payload.patient_id || payload.patientId) && {
        patient_id: payload.patient_id || payload.patientId
      }),
      ...(payload.consultation_id && { consultation_id: payload.consultation_id })
    };
    return postWithFallback({
      backendPath: '/ai/lab-test-recommendations',
      directPath: '/lab-test-recommendations',
      payload: cleanPayload
    });
  },

  /**
   * Diagnosis assist — two paths:
   * 1. Backend /ai/clinical/consultation-suggestions → needs chiefComplaint (diagnosisSuggestionsSchema)
   * 2. Direct AI service /api/v1/ai/diagnosis-assist → needs symptoms string (DiagnosisAssistRequest)
   */
  diagnosisAssist: async (payload) => {
    const chiefComplaint = payload.chiefComplaint || payload.symptoms || 'General consultation';
    // Payload for the backend (Node.js Zod validator)
    const backendPayload = {
      chiefComplaint: chiefComplaint.substring(0, 500),
      symptoms: Array.isArray(payload.symptomsArray) ? payload.symptomsArray : [],
      vitals: payload.vitals || {},
      clinicalNotes: payload.history || payload.clinicalNotes || '',
      patientContext: {
        age: payload.age != null ? Number(payload.age) : null,
        gender: payload.gender || null,
        previousDiagnoses: Array.isArray(payload.known_conditions) ? payload.known_conditions : []
      }
    };
    // Payload for the AI service (Pydantic DiagnosisAssistRequest)
    const directPayload = {
      symptoms: chiefComplaint.substring(0, 500),
      history: payload.history || payload.clinicalNotes || null,
      vitals: payload.vitals || {},
      known_conditions: Array.isArray(payload.known_conditions) ? payload.known_conditions : [],
      patient_id: payload.patient_id || null
    };
    try {
      return unwrapResponse(await axiosClient.post('/ai/clinical/consultation-suggestions', backendPayload));
    } catch (error) {
      if (![404, 500, 503].includes(error?.response?.status)) {
        throw error;
      }
      try {
        const response = await aiAxiosClient.post('/api/v1/ai/diagnosis-assist', directPayload);
        return unwrapResponse(response);
      } catch (directError) {
        throw new Error(extractErrorMessage(directError, 'AI diagnosis service is unavailable.'));
      }
    }
  },

  /**
   * Generic consultation assist — Prescription, Procedures, Advice, Follow-up tabs.
   * Goes DIRECTLY to the AI service (port 8000) to bypass backend Zod validators.
   */
  consultationAssist: async (payload) => {
    const cleanPayload = {
      symptoms: String(payload.symptoms || 'general consultation'),
      ...(payload.age != null && { age: payload.age }),
      ...(payload.gender && { gender: payload.gender }),
      ...(Array.isArray(payload.known_conditions) && payload.known_conditions.length > 0 && {
        known_conditions: payload.known_conditions
      }),
      ...(payload.patient_id && { patient_id: payload.patient_id }),
      ...(payload.language && { language: payload.language })
    };
    try {
      // Direct call to AI service — no strict Zod validation there
      const response = await aiAxiosClient.post('/symptom-check', cleanPayload);
      const data = unwrapResponse(response);
      return {
        ...data,
        homeCareAdvice: data.output?.home_care_general_advice || data.home_care_general_advice || [],
        followUpQuestions: data.output?.follow_up_questions || data.follow_up_questions || [],
        redFlags: data.output?.red_flags || data.red_flags || [],
        possibleConditions: data.output?.top_3_possible_conditions || data.possibleConditions || []
      };
    } catch (directError) {
      // Last-resort fallback: backend symptom-check with clean payload
      try {
        return unwrapResponse(await axiosClient.post('/ai/symptom-check', cleanPayload));
      } catch (backendError) {
        throw new Error(extractErrorMessage(directError, 'AI consultation service is unavailable.'));
      }
    }
  }
};

export default aiApi;


