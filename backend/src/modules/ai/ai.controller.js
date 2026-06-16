const { asyncHandler } = require('../../common/utils/asyncHandler');
const aiService = require('./ai.service');

const symptomCheck = asyncHandler(async (req, res) => {
  const payload = await aiService.symptomCheck(req.body);
  return res.status(200).json(payload);
});

const noShow = asyncHandler(async (req, res) => {
  const payload = await aiService.noShow(req.body);
  return res.status(200).json(payload);
});

const formatClinicalNote = asyncHandler(async (req, res) => {
  const payload = await aiService.formatClinicalNote(req.body);
  return res.status(200).json(payload);
});

const drugSafetyCheck = asyncHandler(async (req, res) => {
  const payload = await aiService.checkDrugSafety(req.body);
  return res.status(200).json(payload);
});

const ocrExtract = asyncHandler(async (req, res) => {
  const payload = await aiService.ocrExtract({
    payloadBuffer: req.body,
    contentType: req.headers['content-type']
  });
  return res.status(200).json(payload);
});

const labReportExtract = asyncHandler(async (req, res) => {
  const payload = await aiService.labReportExtract({
    payloadBuffer: req.body,
    contentType: req.headers['content-type']
  });
  return res.status(200).json(payload);
});

const getDiagnosisSuggestions = asyncHandler(async (req, res) => {
  const payload = await aiService.getDiagnosisSuggestions(req.body);
  return res.status(200).json(payload);
});

const formatConsultationNote = asyncHandler(async (req, res) => {
  const payload = await aiService.formatConsultationNote(req.body);
  return res.status(200).json(payload);
});

const formatPrescriptionAdvice = asyncHandler(async (req, res) => {
  const payload = await aiService.formatPrescriptionAdvice(req.body);
  return res.status(200).json(payload);
});

const getLabTestRecommendations = asyncHandler(async (req, res) => {
  const payload = await aiService.getLabTestRecommendations(req.body);
  return res.status(200).json(payload);
});

module.exports = {
  symptomCheck,
  noShow,
  formatClinicalNote,
  drugSafetyCheck,
  ocrExtract,
  labReportExtract,
  getDiagnosisSuggestions,
  formatConsultationNote,
  formatPrescriptionAdvice,
  getLabTestRecommendations,
  consultationSuggestions: getDiagnosisSuggestions
};
