const { Router } = require('express');

const authRoutes = require('../modules/auth/auth.routes');
const aiRoutes = require('../modules/ai/ai.routes');
const adminRoutes = require('../modules/admin/admin.routes');
const appointmentRoutes = require('../modules/appointments/appointment.routes');
const billingRoutes = require('../modules/billing/billing.routes');
const consultationRoutes = require('../modules/consultations/consultation.routes');
const dashboardRoutes = require('../modules/dashboard/dashboard.routes');
const doctorRoutes = require('../modules/doctors/doctor.routes');
const healthRoutes = require('../modules/health/health.routes');
const labRoutes = require('../modules/labs/lab.routes');
const { notificationRouter, followUpRouter } = require('../modules/notifications/notification.routes');
const patientRoutes = require('../modules/patients/patient.routes');
const pharmacyRoutes = require('../modules/pharmacy/pharmacy.routes');
const prescriptionRoutes = require('../modules/prescriptions/prescription.routes');
const userRoutes = require('../modules/users/user.routes');
const auditRoutes = require('../modules/audit/audit.routes');
const clinicRoutes = require('../modules/clinics/clinic.routes');
const specializationRoutes = require('../modules/specializations/specialization.routes');
const holidayRoutes = require('../modules/holidays/clinicHoliday.routes');
const leaveRoutes = require('../modules/leaves/doctorLeave.routes');
const receptionistRoutes = require('../modules/receptionists/receptionist.routes');
const staffRoutes = require('../modules/staff/staff.routes');
const insuranceRoutes = require('../modules/insurance/routes/insurance.routes');
const billingModuleRoutes = require('../modules/billing/routes/billing.routes');
const paymentRoutes = require('../modules/payment/routes/payment.routes');
const settlementsRoutes = require('../modules/settlements/routes/settlements.routes');
const subscriptionsRoutes = require('../modules/subscriptions/subscriptions.routes');
const healthcareCatalogRoutes = require('../modules/healthcare-catalog/healthcareCatalog.routes');
const providerRoutes = require('../modules/providers/provider.routes');
const procedureRoutes = require('../modules/procedures/procedure.routes');
const chatRoutes = require('../modules/chat/chat.routes');
const supportRoutes = require('../modules/support/support.routes');
const validationRoutes = require('../modules/validation/validation.routes');

const router = Router();

const { protect } = require('../common/middlewares/auth.middleware');
const { checkSubscriptionFeature } = require('../common/middlewares/subscription.middleware');

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/ai', aiRoutes);
router.use('/admin', adminRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/billing', billingRoutes);
router.use('/consultations', consultationRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/labs', protect, checkSubscriptionFeature('labs'), labRoutes);
router.use('/notifications', notificationRouter);
router.use('/follow-ups', followUpRouter);
router.use('/pharmacy', protect, checkSubscriptionFeature('pharmacy'), pharmacyRoutes);
router.use('/users', userRoutes);
router.use('/patients', patientRoutes);
router.use('/doctors', doctorRoutes);
router.use('/receptionists', receptionistRoutes);
router.use('/staff', staffRoutes);
router.use('/prescriptions', prescriptionRoutes);
router.use('/audit', auditRoutes);
router.use('/clinics', clinicRoutes);
router.use('/clinic', clinicRoutes);
router.use('/specializations', specializationRoutes);
router.use('/holidays', holidayRoutes);
router.use('/leaves', leaveRoutes);
router.use('/', insuranceRoutes);
router.use('/payment', paymentRoutes);
router.use('/', settlementsRoutes);
router.use('/billing', billingModuleRoutes);
router.use('/subscriptions', subscriptionsRoutes);
router.use('/healthcare-catalog', healthcareCatalogRoutes);
router.use('/providers', providerRoutes);
const providerController = require('../modules/providers/provider.controller');
const onboardingDraftRouter = Router();
onboardingDraftRouter.post('/', protect, providerController.createPharmacyDraft);
onboardingDraftRouter.get('/:clinicId', protect, providerController.getPharmacyDraft);
onboardingDraftRouter.put('/:draftId', protect, providerController.savePharmacyDraft);
router.use('/onboarding/pharmacy/draft', onboardingDraftRouter);

router.use('/procedures', procedureRoutes);
router.use('/chat', chatRoutes);
router.use('/support', supportRoutes);
router.use('/validation', validationRoutes);

// In-memory FAQ database seeded with standard clinic questions
let faqsDb = [
  {
    _id: "faq1",
    q: "Is the PEHAL AI-CMS platform HIPAA compliant?",
    a: "Yes, PEHAL AI-CMS is fully HIPAA compliant. We follow industry-standard security protocols, data encryption, role-based access control, audit logs, and secure cloud infrastructure to ensure complete protection of patient data and privacy.",
    category: "Security",
    displayOrder: 1,
    icon: "Shield",
    illustration: "security_shield"
  },
  {
    _id: "faq2",
    q: "Can I manage multiple clinic branches from one account?",
    a: "Absolutely. The multi-branch dashboard allows clinic administrators to track schedules, billing, inventory, and staff rosters across multiple locations from one centralized account.",
    category: "Branches",
    displayOrder: 2,
    icon: "Hospital",
    illustration: "hospital_network"
  },
  {
    _id: "faq3",
    q: "How does the AI Consultation Assistant work?",
    a: "The AI assistant transcribes doctor-patient conversations in real-time, extracts key symptoms and diagnosis notes, and automatically populates the digital EMR templates for doctor review.",
    category: "AI",
    displayOrder: 3,
    icon: "Brain",
    illustration: "ai_assistant"
  },
  {
    _id: "faq4",
    q: "Is my data safe and how is it backed up?",
    a: "Your data is stored in secure cloud infrastructure with real-time replication and daily automated encrypted backups, ensuring zero data loss and 24/7 disaster recovery.",
    category: "Cloud",
    displayOrder: 4,
    icon: "Cloud",
    illustration: "cloud_backup"
  },
  {
    _id: "faq5",
    q: "Do you provide training and customer support?",
    a: "Yes, we provide 24/7 priority support and custom training sessions for clinic staff to ensure a smooth transition and operational success.",
    category: "Support",
    displayOrder: 5,
    icon: "Support",
    illustration: "customer_support"
  }
];

router.get('/faqs', (req, res) => {
  const visible = faqsDb.sort((a, b) => a.displayOrder - b.displayOrder);
  return res.json({ success: true, faqs: visible });
});

router.post('/admin/faqs', (req, res) => {
  const { q, a, category, displayOrder, icon, illustration } = req.body;
  const newFaq = {
    _id: `faq_${Date.now()}`,
    q,
    a,
    category: category || "General",
    displayOrder: parseInt(displayOrder) || (faqsDb.length + 1),
    icon: icon || "HelpCircle",
    illustration: illustration || ""
  };
  faqsDb.push(newFaq);
  return res.json({ success: true, faq: newFaq });
});

module.exports = router;
