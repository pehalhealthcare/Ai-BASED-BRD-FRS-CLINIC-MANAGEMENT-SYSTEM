const { Router } = require('express');
const { ROLES } = require('../../../common/constants/roles');
const { protect } = require('../../../common/middlewares/auth.middleware');
const { authorize } = require('../../../common/middlewares/role.middleware');

const paymentSettingsController = require('../controllers/paymentSettings.controller');

const adminPaymentSettingsRouter = Router();
const publicPaymentDetailsRouter = Router();

/**
 * Super Admin Protected Routes (/api/v1/admin/payment-settings)
 */
adminPaymentSettingsRouter.use(protect, authorize(ROLES.SUPER_ADMIN));

adminPaymentSettingsRouter.get('/', paymentSettingsController.getAdminPaymentSettings);
adminPaymentSettingsRouter.put('/', paymentSettingsController.updateAdminPaymentSettings);
adminPaymentSettingsRouter.post('/qr', paymentSettingsController.uploadAdminQrCode);
adminPaymentSettingsRouter.delete('/qr', paymentSettingsController.removeAdminQrCode);

/**
 * Public / Clinic Payment Checkout Routes (/api/v1/payment-details)
 */
publicPaymentDetailsRouter.get('/', paymentSettingsController.getPublicPaymentDetails);

module.exports = {
  adminPaymentSettingsRouter,
  publicPaymentDetailsRouter
};
