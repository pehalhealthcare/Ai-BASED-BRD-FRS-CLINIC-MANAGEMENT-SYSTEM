const Clinic = require('../clinics/clinic.model');
const SubscriptionPlan = require('./subscriptionPlan.model');
const SubscriptionBilling = require('./subscriptionBilling.model');
const { createNotificationRecord } = require('../notifications/notification.service');
const { createAuditLog } = require('../audit/audit.service');

const monitorSubscriptions = async () => {
  try {
    const clinics = await Clinic.find().populate('subscription.planId');
    const now = new Date();

    for (const clinic of clinics) {
      if (!clinic.subscription || !clinic.subscription.expiryDate) continue;

      const expiry = new Date(clinic.subscription.expiryDate);
      const diffTime = expiry - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Expired subscription check
      if (diffTime <= 0 && clinic.subscription.status !== 'Expired') {
        clinic.subscription.status = 'Expired';
        await clinic.save();

        // Audit Log
        await createAuditLog({
          action: 'subscription_expired',
          entity: 'Clinic',
          entityId: clinic._id,
          metadata: { planCode: clinic.subscription.planId?.code },
          status: 'SUCCESS'
        });

        // Notify
        await createNotificationRecord({
          clinicId: clinic._id,
          payload: {
            type: 'CRITICAL',
            channel: 'IN_APP',
            subject: 'Subscription Expired',
            body: 'Your subscription has expired. Access to premium features has been locked.'
          }
        });
        console.log(`[Subscription Monitor] Clinic ${clinic.name} subscription expired.`);
        continue;
      }

      // 24 Hours warning & Auto-recharge execution
      if (diffDays === 1 && diffTime > 0) {
        if (clinic.subscription.autoRecharge && clinic.subscription.paymentMethod?.token) {
          // Attempt auto-recharge
          try {
            console.log(`[Subscription Monitor] Auto-recharging subscription for ${clinic.name}...`);
            const plan = clinic.subscription.planId;
            const amount = clinic.subscription.billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
            const periodDays = clinic.subscription.billingCycle === 'yearly' ? 365 : 30;

            const newExpiry = new Date(expiry);
            newExpiry.setDate(newExpiry.getDate() + periodDays);

            clinic.subscription.expiryDate = newExpiry;
            clinic.subscription.renewalDate = newExpiry;
            clinic.subscription.status = 'Active';
            await clinic.save();

            // Create invoice
            await SubscriptionBilling.create({
              invoiceNumber: `INV-AUTO-${Date.now()}`,
              clinicId: clinic._id,
              planId: plan._id,
              paymentDate: new Date(),
              billingPeriod: `${expiry.toLocaleDateString()} - ${newExpiry.toLocaleDateString()}`,
              amountPaid: amount,
              creditApplied: 0,
              paymentMethod: `${clinic.subscription.paymentMethod.brand} ending in ${clinic.subscription.paymentMethod.last4}`,
              paymentStatus: 'success',
              transactionId: `TXN-AUTO-${Date.now()}`
            });

            // Log Audit
            await createAuditLog({
              action: 'subscription_renewed',
              entity: 'Clinic',
              entityId: clinic._id,
              metadata: { planCode: plan.code, autoRecharged: true, amountPaid: amount },
              status: 'SUCCESS'
            });

            // Success notifications
            await createNotificationRecord({
              clinicId: clinic._id,
              payload: {
                type: 'SUCCESS',
                channel: 'IN_APP',
                subject: 'Subscription Auto-Renewed',
                body: `Your subscription has been successfully renewed. Next renewal date: ${newExpiry.toLocaleDateString()}.`
              }
            });
          } catch (autoErr) {
            console.error(`[Subscription Monitor] Auto-recharge failed for ${clinic.name}:`, autoErr.message);
            
            // Log Failure
            await createAuditLog({
              action: 'payment_failed',
              entity: 'Clinic',
              entityId: clinic._id,
              metadata: { error: autoErr.message },
              status: 'FAILURE'
            });

            // Failure notifications
            await createNotificationRecord({
              clinicId: clinic._id,
              payload: {
                type: 'CRITICAL',
                channel: 'IN_APP',
                subject: 'Auto-Renewal Failed',
                body: 'Automatic renewal could not be completed because your payment was unsuccessful. Please renew manually.'
              }
            });
          }
        } else {
          // Just notify 24h before
          await createNotificationRecord({
            clinicId: clinic._id,
            payload: {
              type: 'WARNING',
              channel: 'IN_APP',
              subject: 'Subscription Expiry Warning',
              body: 'Your subscription will expire within the next 24 hours. Please renew your subscription to avoid interruption.'
            }
          });
        }
      }

      // 3 Days Notification
      if (diffDays === 3) {
        await createNotificationRecord({
          clinicId: clinic._id,
          payload: {
            type: 'WARNING',
            channel: 'IN_APP',
            subject: 'Subscription Expiring in 3 Days',
            body: 'Your subscription expires in 3 days. Renew now to prevent service lockouts.'
          }
        });
        // Mock Email & SMS
        console.log(`[SMS/EMAIL SIMULATION] Sent 3-day warning to clinic ${clinic.name}`);
      }

      // 7 Days Notification
      if (diffDays === 7) {
        await createNotificationRecord({
          clinicId: clinic._id,
          payload: {
            type: 'WARNING',
            channel: 'IN_APP',
            subject: 'Subscription Expiring in 7 Days',
            body: 'Your subscription expires in 7 days. Renew now to avoid service interruption.'
          }
        });
      }
    }
  } catch (err) {
    console.error('[Subscription Monitor] Error running subscription checks:', err);
  }
};

const startSubscriptionMonitor = () => {
  // Check immediately on startup
  setTimeout(monitorSubscriptions, 5000);
  
  // Check every 12 hours
  setInterval(monitorSubscriptions, 12 * 60 * 60 * 1000);
};

module.exports = {
  startSubscriptionMonitor
};
