const fs = require('fs');
const path = require('path');
// Trigger restart for registering updated Mongoose schemas (consultation_completed enum)
const app = require('./app');
const { disconnectDB, connectDB } = require('./config/database');
const { env } = require('./config/env');
const { logger } = require('./common/utils/logger');

let server = null;

const shutdown = async (signal) => {
  logger.warn(`Received ${signal}. Shutting down gracefully.`);

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }

    await disconnectDB();
    logger.info('Backend shutdown completed.');
    process.exit(0);
  } catch (error) {
    logger.error('Graceful shutdown failed.', error);
    process.exit(1);
  }
};

const startOnlinePaymentTimeoutChecker = () => {
  setInterval(async () => {
    try {
      const mongoose = require('mongoose');
      // Verify DB is connected before querying
      if (mongoose.connection.readyState !== 1) return;

      const Consultation = require('./modules/consultations/consultation.model');
      const Appointment = require('./modules/appointments/appointment.model');
      const Invoice = require('./modules/billing/invoice.model');
      const { APPOINTMENT_STATUSES } = require('./common/constants/appointmentStatus');

      // Find completed consultations that are not yet marked as timeout processed
      const consultations = await Consultation.find({
        status: 'completed',
        'meta.onlinePaymentTimeoutProcessed': { $ne: true }
      });

      for (const consultation of consultations) {
        // Find the associated appointment
        const appointment = await Appointment.findById(consultation.appointmentId);
        if (!appointment || appointment.appointmentType !== 'teleconsultation') {
          consultation.meta = { ...consultation.meta, onlinePaymentTimeoutProcessed: true };
          await consultation.save();
          continue;
        }

        // Find associated invoice
        const invoice = await Invoice.findOne({ appointmentId: appointment._id });
        if (!invoice) {
          consultation.meta = { ...consultation.meta, onlinePaymentTimeoutProcessed: true };
          await consultation.save();
          continue;
        }

        // Check if paid
        if (invoice.paymentStatus === 'paid') {
          consultation.meta = { ...consultation.meta, onlinePaymentTimeoutProcessed: true };
          await consultation.save();
          continue;
        }

        // Check if 20 minutes have passed since completion
        const completedAt = new Date(consultation.completedAt);
        const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000);
        if (completedAt < twentyMinsAgo) {
          // Expired and unpaid! Cancel all upcoming and rest of appointments with this doctor for this patient
          console.log(`[Timeout Checker] Online consultation payment timeout for Patient: ${consultation.patientId}, Doctor: ${consultation.doctorId}`);

          consultation.meta = { ...consultation.meta, onlinePaymentTimeoutProcessed: true };
          await consultation.save();

          // Find and cancel upcoming appointments of this patient with this doctor
          const upcomingAppointments = await Appointment.find({
            patientId: consultation.patientId,
            doctorId: consultation.doctorId,
            status: { $in: ['booked', 'confirmed', 'checked_in', 'in_consultation'] },
            appointmentDate: { $gte: new Date().setHours(0,0,0,0) }
          });

          for (const apt of upcomingAppointments) {
            apt.status = APPOINTMENT_STATUSES.CANCELLED;
            apt.cancellationReason = 'Cancelled automatically due to unpaid online consultation fee within 20 minutes.';
            await apt.save();
            console.log(`[Timeout Checker] Cancelled upcoming appointment: ${apt._id}`);
        }
      }
    }

      // Clean up checkin_token_uuid if expired past 10 minutes
      const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
      const expiredTokensApts = await Appointment.find({
        checkin_token_uuid: { $ne: '' },
        checkinTokenExpiresAt: { $lt: tenMinsAgo }
      });
      for (const apt of expiredTokensApts) {
        console.log(`[Token Cleanup] Removing expired check-in token for appointment: ${apt._id}`);
        apt.checkin_token_uuid = '';
        await apt.save();
      }
    } catch (err) {
      console.error('[Timeout Checker] Error in online payment timeout background checker:', err);
    }},60000) // Check every 60 seconds
    
};

const startInsuranceCoverageResetJob = () => {
  setInterval(async () => {
    try {
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState !== 1) return;

      const Patient = require('./modules/patients/patient.model');

      // Find patients with linked insurance whose remaining coverage is less than coverageAmount
      const patients = await Patient.find({
        'insuranceDetails.coverageAmount': { $gt: 0 },
        $expr: { $lt: ['$insuranceDetails.remainingCoverage', '$insuranceDetails.coverageAmount'] }
      });

      for (const patient of patients) {
        const lastReset = patient.insuranceDetails.lastResetAt || patient.updatedAt || new Date();
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        if (new Date(lastReset) < oneDayAgo) {
          console.log(`[Insurance Reset] Resetting coverage for Patient: ${patient.fullName} (${patient._id}) back to ₹${patient.insuranceDetails.coverageAmount}`);
          patient.insuranceDetails.remainingCoverage = patient.insuranceDetails.coverageAmount;
          patient.insuranceDetails.lastResetAt = new Date();
          await patient.save();
        }
      }
    } catch (err) {
      console.error('[Insurance Reset] Error in insurance coverage reset background job:', err);
    }
  }, 60000); // Check every 60 seconds
};

const startServer = async () => {
  try {
    await fs.promises.mkdir(path.resolve(process.cwd(), env.prescriptionPdfDir), { recursive: true });
    await fs.promises.mkdir(path.resolve(process.cwd(), env.invoiceStorageDir), { recursive: true });
    await connectDB();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Database connection failed during startup.';

    if (env.isProduction) {
      logger.error(message);
      process.exit(1);
    }

    logger.warn(message);
    logger.warn('Continuing startup without an active MongoDB connection because NODE_ENV is not production.');
  }

  server = app.listen(env.port, () => {
    logger.info(`${env.appName} running at http://localhost:${env.port}`);
    logger.info(`Swagger docs available at http://localhost:${env.port}/api-docs`);
    startOnlinePaymentTimeoutChecker();
    startInsuranceCoverageResetJob();
  });
};


process.on('SIGINT', () => {
  shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  shutdown('SIGTERM');
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection detected.', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception detected.', error);
  shutdown('uncaughtException');
});

startServer();
