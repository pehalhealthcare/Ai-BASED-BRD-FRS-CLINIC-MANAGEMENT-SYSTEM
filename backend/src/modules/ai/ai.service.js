const axios = require('axios');

const { env } = require('../../config/env');
const { HTTP_STATUS } = require('../../common/constants/httpStatus');
const { AppError } = require('../../common/utils/AppError');

const aiClient = axios.create({
  baseURL: env.aiServiceUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

const mapAiError = (error) => {
  if (error.response) {
    const statusCode = error.response.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    const message = error.response.data?.message || 'AI service request failed';
    const errors = error.response.data?.errors || [{ message: 'AI service returned an error response.' }];
    throw new AppError(message, statusCode, errors);
  }

  throw new AppError('AI service is temporarily unavailable', HTTP_STATUS.SERVICE_UNAVAILABLE, [
    'Unable to connect to AI service'
  ]);
};

const proxyPost = async (path, payload) => {
  try {
    const response = await aiClient.post(path, payload);
    return response.data;
  } catch (error) {
    mapAiError(error);
  }
};

const proxyMultipart = async (path, payloadBuffer, contentType) => {
  try {
    const response = await aiClient.post(path, payloadBuffer, {
      headers: {
        'Content-Type': contentType
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });
    return response.data;
  } catch (error) {
    mapAiError(error);
  }
};

const symptomCheck = (payload) => proxyPost('/api/v1/ai/symptom-check', payload);

const noShow = (payload) => proxyPost('/api/v1/ai/no-show', payload);

const formatClinicalNote = (payload) => proxyPost('/api/v1/ai/format-clinical-note', payload);
const formatClinicalNoteDraft = (payload) => proxyPost('/ai/format-clinical-note', payload);
const checkDrugSafety = (payload) => proxyPost('/ai/drug-safety-check', payload);
const transcribeVoiceNote = ({ payloadBuffer, contentType }) => proxyMultipart('/ai/transcribe', payloadBuffer, contentType);
const ocrExtract = ({ payloadBuffer, contentType }) => proxyMultipart('/ai/ocr-extract', payloadBuffer, contentType);
const labReportExtract = ({ payloadBuffer, contentType }) => proxyMultipart('/ai/lab-report-extract', payloadBuffer, contentType);
const analyzeLabResults = (payload) => proxyPost('/ai/lab-analysis', payload);
const getPharmacyDemandForecast = (payload) => proxyPost('/ai/pharmacy-demand', payload);
const getBillingAnomaly = (payload) => proxyPost('/ai/billing-anomaly', payload);
const getLabTestRecommendations = (payload) => proxyPost('/api/v1/ai/lab-test-recommendations', payload);

const getDiagnosisSuggestions = (payload) => proxyPost('/api/v1/clinical/diagnosis-suggestions', payload);

const formatConsultationNote = (payload) => proxyPost('/api/v1/clinical/format-note', payload);

const formatPrescriptionAdvice = (payload) => proxyPost('/api/v1/prescription/format-advice', payload);

module.exports = {
  symptomCheck,
  noShow,
  formatClinicalNote,
  formatClinicalNoteDraft,
  checkDrugSafety,
  transcribeVoiceNote,
  ocrExtract,
  labReportExtract,
  analyzeLabResults,
  getPharmacyDemandForecast,
  getBillingAnomaly,
  getLabTestRecommendations,
  getDiagnosisSuggestions,
  formatConsultationNote,
  formatPrescriptionAdvice,
  // Backward-compatible alias
  consultationSuggestions: getDiagnosisSuggestions
};
