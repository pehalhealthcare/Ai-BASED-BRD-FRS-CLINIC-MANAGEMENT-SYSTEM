const express = require('express');
const { Router } = require('express');

const { ROLES } = require('../../common/constants/roles');
const { protect } = require('../../common/middlewares/auth.middleware');
const { authorize } = require('../../common/middlewares/role.middleware');
const { validate } = require('../../common/middlewares/validate.middleware');
const aiController = require('./ai.controller');
const {
  symptomCheckSchema,
  noShowSchema,
  clinicalNoteSchema,
  drugSafetyCheckSchema,
  diagnosisSuggestionsSchema,
  consultationFormatNoteSchema,
  prescriptionAdviceSchema,
  labTestRecommendationSchema
} = require('./ai.validator');

const router = Router();
const multipartUpload = express.raw({
  type: (req) => (req.headers['content-type'] || '').includes('multipart/form-data'),
  limit: '20mb'
});

/**
 * @swagger
 * /api/v1/ai/symptom-check:
 *   post:
 *     summary: Proxy symptom checking to the AI service
 *
 * /api/v1/ai/no-show:
 *   post:
 *     summary: Proxy no-show scoring to the AI service
 *
 * /api/v1/ai/no-show-predict:
 *   post:
 *     summary: Proxy no-show prediction to the AI service
 *
 * /api/v1/ai/format-clinical-note:
 *   post:
 *     summary: Proxy clinical note formatting to the AI service
 *
 * /api/v1/ai/drug-safety-check:
 *   post:
 *     summary: Proxy drug safety screening to the AI service
 *
 * /api/v1/ai/ocr-extract:
 *   post:
 *     summary: Proxy OCR document extraction to the AI service
 *
 * /api/v1/ai/lab-report-extract:
 *   post:
 *     summary: Proxy lab report extraction to the AI service
 *
 * /api/v1/ai/clinical/diagnosis-suggestions:
 *   post:
 *     summary: Proxy diagnosis suggestions to the AI service
 *
 * /api/v1/ai/clinical/format-note:
 *   post:
 *     summary: Proxy clinical note SOAP formatting to the AI service
 *
 * /api/v1/ai/prescription/format-advice:
 *   post:
 *     summary: Proxy prescription advice formatting to the AI service
 */
router.post(
  '/symptom-check',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR, ROLES.PATIENT),
  validate(symptomCheckSchema),
  aiController.symptomCheck
);
router.post(
  '/no-show',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR),
  validate(noShowSchema),
  aiController.noShow
);
router.post(
  '/no-show-predict',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR),
  validate(noShowSchema),
  aiController.noShow
);
router.post(
  '/format-clinical-note',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR),
  validate(clinicalNoteSchema),
  aiController.formatClinicalNote
);
router.post(
  '/drug-safety-check',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR),
  validate(drugSafetyCheckSchema),
  aiController.drugSafetyCheck
);
router.post(
  '/ocr-extract',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR, ROLES.PATIENT),
  multipartUpload,
  aiController.ocrExtract
);
router.post(
  '/public/ocr-extract',
  multipartUpload,
  aiController.ocrExtract
);
router.post(
  '/lab-report-extract',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.LAB_TECHNICIAN),
  multipartUpload,
  aiController.labReportExtract
);
router.post(
  '/clinical/diagnosis-suggestions',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR),
  validate(diagnosisSuggestionsSchema),
  aiController.getDiagnosisSuggestions
);
router.post(
  '/clinical/format-note',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR),
  validate(consultationFormatNoteSchema),
  aiController.formatConsultationNote
);
router.post(
  '/prescription/format-advice',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR),
  validate(prescriptionAdviceSchema),
  aiController.formatPrescriptionAdvice
);
router.post(
  '/lab-test-recommendations',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR),
  validate(labTestRecommendationSchema),
  aiController.getLabTestRecommendations
);

// Backward-compatible alias for the earlier Phase 6 route name.
router.post(
  '/clinical/consultation-suggestions',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR),
  validate(diagnosisSuggestionsSchema),
  aiController.getDiagnosisSuggestions
);

module.exports = router;
