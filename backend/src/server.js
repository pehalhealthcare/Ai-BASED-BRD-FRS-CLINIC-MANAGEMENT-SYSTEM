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

      // Automatically mark un-checked-in appointments as NOT_ATTENDED
      const ClinicModel = require('./modules/clinics/clinic.model');
      const clinics = await ClinicModel.find({});
      const todayStart = new Date();
      todayStart.setHours(0,0,0,0);
      const todayEnd = new Date();
      todayEnd.setHours(23,59,59,999);

      for (const clinic of clinics) {
        const settings = clinic.billingSettings || {};
        if (settings.autoMarkNoShow !== false) {
          // Unattended booked appointments for today
          const activeBooked = await Appointment.find({
            clinicId: clinic._id,
            appointmentDate: { $gte: todayStart, $lte: todayEnd },
            status: { $in: [APPOINTMENT_STATUSES.BOOKED, APPOINTMENT_STATUSES.CONFIRMED] }
          });
          const nowTime = new Date();
          for (const apt of activeBooked) {
            let thresholdPassed = false;
            const [sh, sm] = apt.startTime.split(':').map(Number);
            const apptStart = new Date(apt.appointmentDate);
            apptStart.setHours(sh, sm, 0, 0);

            if (settings.noShowGracePeriod === '15 Minutes') {
              thresholdPassed = nowTime > new Date(apptStart.getTime() + 15 * 60 * 1000);
            } else if (settings.noShowGracePeriod === '30 Minutes') {
              thresholdPassed = nowTime > new Date(apptStart.getTime() + 30 * 60 * 1000);
            } else if (settings.noShowGracePeriod === '1 Hour') {
              thresholdPassed = nowTime > new Date(apptStart.getTime() + 60 * 60 * 1000);
            } else {
              // Default to Clinic Closing Time (e.g. 8:00 PM or end of day)
              const closingTime = new Date();
              closingTime.setHours(22, 0, 0, 0); // e.g. 10:00 PM local time
              thresholdPassed = nowTime > closingTime;
            }

            if (thresholdPassed) {
              console.log(`[Auto No-Show] Marking Appointment ${apt._id} as not_attended due to inactivity`);
              apt.status = APPOINTMENT_STATUSES.NOT_ATTENDED;
              await apt.save();

              // Emit update event
              emitAppointmentEvent('appointment:no-show', {
                clinicId: apt.clinicId,
                doctorId: String(apt.doctorId),
                patientId: String(apt.patientId),
                appointmentId: String(apt._id),
                status: APPOINTMENT_STATUSES.NOT_ATTENDED
              });
              
              // Trigger notification for no show
              try {
                const { sendNoShowNotifications } = require('./modules/notifications/notification.service');
                sendNoShowNotifications({ appointment: apt }).catch(() => null);
              } catch (_) {}
            }
          }
        }
      }
    } catch (err) {
      console.error('[Timeout Checker] Error in online payment timeout background checker:', err);
    }
  }, 60000); // Check every 60 seconds
};

const startReservationExpiryJob = () => {
  setInterval(async () => {
    try {
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState !== 1) return;

      const Appointment = require('./modules/appointments/appointment.model');
      const { emitAppointmentEvent } = require('./modules/appointments/appointment.service');

      const expiredAppts = await Appointment.find({
        status: { $in: ['payment_pending', 'waiting_for_approval', 'waiver_pending', 'draft'] },
        reservationExpiresAt: { $lt: new Date() }
      });

      for (const apt of expiredAppts) {
        console.log(`[Reservation Expiry] Expiring slot lock for Appointment: ${apt._id}, Doctor: ${apt.doctorId}`);
        
        apt.status = 'reservation_expired';
        apt.reservationExpiresAt = null;
        await apt.save();

        // Broadcast to clients
        emitAppointmentEvent('appointment:reservation-expired', {
          clinicId: apt.clinicId,
          doctorId: String(apt.doctorId),
          patientId: String(apt.patientId),
          appointmentId: String(apt._id),
          status: 'reservation_expired'
        });

        // Broadcast slot released specifically for doctor scheduling screen updates
        if (global.io) {
          global.io.to(String(apt.clinicId)).emit('doctor:slot-released', {
            doctorId: String(apt.doctorId),
            appointmentDate: apt.appointmentDate,
            startTime: apt.startTime,
            endTime: apt.endTime
          });
        }
      }
    } catch (err) {
      console.error('[Reservation Expiry] Error in background job:', err);
    }
  }, 10000); // Check every 10 seconds for snappy responsive updates
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
    try {
      const { seedPlans } = require('./modules/subscriptions/subscription.service');
      await seedPlans();
    } catch (seedErr) {
      logger.error('Failed to seed subscription plans:', seedErr);
    }
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
    startReservationExpiryJob();
    const { startSubscriptionMonitor } = require('./modules/subscriptions/subscriptionMonitor');
    startSubscriptionMonitor();
    const { startOnboardingDraftCleanupJob } = require('./modules/providers/onboardingCleanup');
    startOnboardingDraftCleanupJob();
    const { startEmailQueueProcessor } = require('./modules/notifications/emailQueue.service');
    startEmailQueueProcessor();
  });

  // Attach socket.io
  const { Server } = require('socket.io');
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });
  global.io = io;

  io.on('connection', (socket) => {
    logger.info(`Socket client connected: ${socket.id}`);

    // Join user room
    socket.on('join_user', (userId) => {
      socket.join(userId);
      logger.info(`Socket ${socket.id} joined user room: ${userId}`);
    });

    // Join clinic room (for receptionists, admins — broadcasts appointment events)
    socket.on('join_clinic', (clinicId) => {
      socket.join(String(clinicId));
      logger.info(`Socket ${socket.id} joined clinic room: ${clinicId}`);
    });

    // Join conversation room
    socket.on('join_conversation', (conversationId) => {
      socket.join(conversationId);
      logger.info(`Socket ${socket.id} joined conversation: ${conversationId}`);
    });

    // Handle incoming message real-time notification/relay
    socket.on('send_message', (data) => {
      // Broadcast to other users in the room
      socket.to(data.conversationId).emit('receive_message', data);
      
      // Also notify receiver specifically (for badges and sidebar updates)
      if (data.receiverId) {
        socket.to(data.receiverId).emit('message_notification', {
          conversationId: data.conversationId,
          senderId: data.senderId,
          message: data.message,
          unreadCount: 1
        });
      }
    });

    // Handle typing indicator
    socket.on('typing', (data) => {
      socket.to(data.conversationId).emit('typing', data);
    });

    // ── Telemedicine / WebRTC Signaling ──
    socket.on('join_meeting', (meetingId) => {
      socket.join(meetingId);
      logger.info(`Socket ${socket.id} joined meeting room: ${meetingId}`);
      // Notify other participants in the room
      socket.to(meetingId).emit('participant_joined', { socketId: socket.id });
    });

    // Relay all WebRTC signals (offer, answer, ICE candidates) to the rest of the meeting room
    socket.on('webrtc_signal', (data) => {
      socket.to(data.meetingId).emit('webrtc_signal', {
        senderId: socket.id,
        signal: data.signal
      });
    });

    // Doctor notifies they are ready — relay to everyone in meeting room AND patient's personal room
    socket.on('doctor_ready', (data) => {
      if (data.meetingId) {
        socket.to(data.meetingId).emit('doctor_ready', data);
        logger.info(`Doctor ready signal broadcast to meeting room: ${data.meetingId}`);
      }
    });

    // Doctor calls patient directly via their user room
    socket.on('call_patient', (data) => {
      if (data.patientId) {
        socket.to(String(data.patientId)).emit('incoming_call', {
          meetingId: data.meetingId,
          doctorId: data.doctorId,
          doctorName: data.doctorName
        });
        // Also emit to meeting room (patient may already be there)
        if (data.meetingId) {
          socket.to(data.meetingId).emit('incoming_call', {
            meetingId: data.meetingId,
            doctorId: data.doctorId,
            doctorName: data.doctorName
          });
        }
      }
    });

    // Patient accepts call — notify everyone in meeting room AND update appointment status
    socket.on('accept_call', async (data) => {
      if (data.meetingId) {
        // Emit patient_joined to everyone else in the meeting room (i.e., the doctor)
        socket.to(data.meetingId).emit('patient_joined', {
          meetingId: data.meetingId,
          patientId: data.patientId
        });
        logger.info(`Patient joined meeting ${data.meetingId} — notified doctor`);

        // Dynamic State Machine Transition: update appointment status to PATIENT_JOINED_WAITING
        try {
          const Appointment = require('./modules/appointments/appointment.model');
          const appt = await Appointment.findById(data.meetingId);
          if (appt && ['DOCTOR_READY', 'BOOKED', 'CONFIRMED', 'CALLED'].includes(appt.status?.toUpperCase())) {
            appt.status = 'PATIENT_JOINED_WAITING';
            await appt.save();
            const { emitAppointmentEvent } = require('./modules/appointments/appointment.service');
            emitAppointmentEvent('appointment:status-updated', {
              clinicId: appt.clinicId,
              doctorId: appt.doctorId,
              patientId: appt.patientId,
              appointment: appt
            });
          }
        } catch (err) {
          logger.error('Failed to update status on accept_call:', err);
        }
      }
    });

    // Also handle patient_joined_consultation as an alias for accept_call
    socket.on('patient_joined_consultation', (data) => {
      if (data.meetingId) {
        socket.to(data.meetingId).emit('patient_joined', data);
      }
    });

    socket.on('reject_call', (data) => {
      if (data.meetingId) {
        socket.to(data.meetingId).emit('call_rejected', { meetingId: data.meetingId });
      }
    });

    socket.on('end_call', (data) => {
      if (data.meetingId) {
        socket.to(data.meetingId).emit('meeting_ended', { meetingId: data.meetingId });
      }
    });

    // Camera / mic state relay
    socket.on('camera_state_changed', (data) => {
      if (data.meetingId) socket.to(data.meetingId).emit('camera_state_changed', data);
    });

    socket.on('mic_state_changed', (data) => {
      if (data.meetingId) socket.to(data.meetingId).emit('mic_state_changed', data);
    });

    socket.on('disconnect', () => {
      logger.info(`Socket client disconnected: ${socket.id}`);
    });
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
