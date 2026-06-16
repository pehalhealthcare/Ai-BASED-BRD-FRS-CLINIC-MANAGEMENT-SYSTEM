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
const organizationRoutes = require('../modules/organizations/organization.routes');

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/ai', aiRoutes);
router.use('/admin', adminRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/billing', billingRoutes);
router.use('/consultations', consultationRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/labs', labRoutes);
router.use('/notifications', notificationRouter);
router.use('/follow-ups', followUpRouter);
router.use('/pharmacy', pharmacyRoutes);
router.use('/users', userRoutes);
router.use('/patients', patientRoutes);
router.use('/doctors', doctorRoutes);
router.use('/prescriptions', prescriptionRoutes);
router.use('/audit', auditRoutes);
router.use('/clinics', clinicRoutes);
router.use('/specializations', specializationRoutes);
router.use('/organizations', organizationRoutes);

module.exports = router;
