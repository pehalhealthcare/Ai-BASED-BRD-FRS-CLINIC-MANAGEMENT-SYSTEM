const express = require('express');
const { Router } = require('express');

const { ROLES } = require('../../common/constants/roles');
const { protect } = require('../../common/middlewares/auth.middleware');
const { authorize } = require('../../common/middlewares/role.middleware');
const { validate } = require('../../common/middlewares/validate.middleware');
const consultationController = require('./consultation.controller');
const {
  createConsultationSchema,
  consultationIdParamSchema,
  appointmentIdParamSchema,
  updateConsultationSchema,
  listConsultationQuerySchema,
  requestAiSuggestionsSchema,
  reviewAiSuggestionsSchema,
  completeConsultationSchema,
  formatClinicalNoteSchema,
  patientConsultationHistorySchema,
  voiceNoteParamSchema,
  editAiNoteSchema,
  approveAiNoteSchema,
  rejectAiNoteSchema
} = require('./consultation.validator');

const router = Router();
const voiceNoteUpload = express.raw({
  type: (req) => (req.headers['content-type'] || '').includes('multipart/form-data'),
  limit: '30mb'
});

router.post(
  '/',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR),
  validate(createConsultationSchema),
  consultationController.createConsultation
);
router.get(
  '/',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR),
  validate(listConsultationQuerySchema),
  consultationController.listConsultations
);
router.get(
  '/appointment/:appointmentId',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST),
  validate(appointmentIdParamSchema),
  consultationController.getAppointmentConsultation
);
router.get(
  '/patient/:patientId/history',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.PATIENT),
  validate(patientConsultationHistorySchema),
  consultationController.getPatientConsultationHistory
);
router.get(
  '/:id',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.PATIENT),
  validate(consultationIdParamSchema),
  consultationController.getConsultationById
);
router.patch(
  '/:id',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR),
  validate(updateConsultationSchema),
  consultationController.updateConsultation
);
router.post(
  '/:id/ai-suggestions',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR),
  validate(requestAiSuggestionsSchema),
  consultationController.requestAiSuggestions
);
router.post(
  '/:id/ai-review',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR),
  validate(reviewAiSuggestionsSchema),
  consultationController.reviewAiSuggestions
);
router.post(
  '/:id/format-note',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR),
  validate(formatClinicalNoteSchema),
  consultationController.formatClinicalNote
);
router.post(
  '/:id/voice-note',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR),
  voiceNoteUpload,
  validate(voiceNoteParamSchema),
  consultationController.uploadVoiceNote
);
router.put(
  '/:id/ai-note/edit',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR),
  validate(editAiNoteSchema),
  consultationController.editAiNote
);
router.post(
  '/:id/ai-note/approve',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR),
  validate(approveAiNoteSchema),
  consultationController.approveAiNote
);
router.post(
  '/:id/ai-note/reject',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR),
  validate(rejectAiNoteSchema),
  consultationController.rejectAiNote
);
router.post(
  '/:id/complete',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR),
  validate(completeConsultationSchema),
  consultationController.completeConsultation
);

router.get(
  '/:id/pdf',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.PATIENT),
  validate(consultationIdParamSchema),
  consultationController.downloadConsultationPdf
);

router.post(
  '/:id/request-reedit',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR),
  consultationController.requestReedit
);
router.post(
  '/:id/verify-reedit',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR),
  consultationController.verifyReedit
);

// Backward-compatible aliases kept for earlier Phase 6 route usage.
router.patch(
  '/:id/complete',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR),
  validate(completeConsultationSchema),
  consultationController.completeConsultation
);

module.exports = router;
