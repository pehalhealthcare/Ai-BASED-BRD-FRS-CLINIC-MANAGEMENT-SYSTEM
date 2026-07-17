const express = require('express');
const { Router } = require('express');

const { ROLES } = require('../../common/constants/roles');
const { protect } = require('../../common/middlewares/auth.middleware');
const { authorize } = require('../../common/middlewares/role.middleware');
const { validate } = require('../../common/middlewares/validate.middleware');
const { checkSubscriptionFeature } = require('../../common/middlewares/subscription.middleware');
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

router.post(
  '/symptom-check',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR, ROLES.PATIENT),
  checkSubscriptionFeature('symptom_checker'),
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
  checkSubscriptionFeature('voice_to_text'),
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
  checkSubscriptionFeature('diagnostic_suggestions'),
  validate(diagnosisSuggestionsSchema),
  aiController.getDiagnosisSuggestions
);
router.post(
  '/clinical/format-note',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR),
  checkSubscriptionFeature('consultation_summary'),
  validate(consultationFormatNoteSchema),
  aiController.formatConsultationNote
);
router.post(
  '/prescription/format-advice',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR),
  checkSubscriptionFeature('prescription_suggestions'),
  validate(prescriptionAdviceSchema),
  aiController.formatPrescriptionAdvice
);
router.post(
  '/lab-test-recommendations',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR),
  checkSubscriptionFeature('lab_recommendations'),
  validate(labTestRecommendationSchema),
  aiController.getLabTestRecommendations
);

router.post(
  '/clinical/consultation-suggestions',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR),
  checkSubscriptionFeature('consultation_assistant'),
  validate(diagnosisSuggestionsSchema),
  aiController.getDiagnosisSuggestions
);

module.exports = router;
