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
  symptomCheck: async (payload) =>
    postWithFallback({
      backendPath: '/ai/symptom-check',
      directPath: '/symptom-check',
      payload,
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
    }),
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
  labTestRecommendations: async (payload) =>
    postWithFallback({
      backendPath: '/ai/lab-test-recommendations',
      directPath: '/lab-test-recommendations',
      payload
    })
};

export default aiApi;
