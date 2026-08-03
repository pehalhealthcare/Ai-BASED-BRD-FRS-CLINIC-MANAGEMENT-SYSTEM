const nodemailer = require('nodemailer');
const { env } = require('../../config/env');
const { logger } = require('../../common/utils/logger');
const EmailJob = require('./emailJob.model');

const queueEmail = async (clinicId, recipient, subject, body) => {
  try {
    const job = await EmailJob.create({
      clinicId,
      recipient: recipient.toLowerCase().trim(),
      subject,
      body,
      status: 'Pending',
      attempts: 0
    });
    logger.info(`[EmailQueue] Queued email to ${recipient} (Job ID: ${job._id})`);
    return job;
  } catch (err) {
    logger.error('[EmailQueue] Failed to queue email:', err);
    throw err;
  }
};

const processQueue = async () => {
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) return;

    // Find up to 5 pending jobs
    const jobs = await EmailJob.find({ status: 'Pending', attempts: { $lt: 3 } }).limit(5);
    if (jobs.length === 0) return;

    const transporter = nodemailer.createTransport({
      host: env.emailHost,
      port: env.emailPort || 587,
      secure: !!env.emailSecure,
      auth: {
        user: env.emailUser,
        pass: env.emailPass
      }
    });

    for (const job of jobs) {
      job.attempts += 1;
      try {
        await transporter.sendMail({
          from: env.emailFrom || `"PEHAL Healthcare" <noreply@pehalhealth.com>`,
          to: job.recipient,
          subject: job.subject,
          text: job.body,
          html: job.body.replace(/\n/g, '<br>')
        });

        job.status = 'Sent';
        job.errorLog = '';
        logger.info(`[EmailQueue] Successfully sent email to ${job.recipient} (Job ID: ${job._id})`);
      } catch (sendErr) {
        logger.error(`[EmailQueue] Failed to send email to ${job.recipient} (Attempt ${job.attempts}):`, sendErr);
        job.errorLog = sendErr.message || String(sendErr);
        if (job.attempts >= 3) {
          job.status = 'Failed';
        }
      }
      await job.save();
    }
  } catch (err) {
    logger.error('[EmailQueue] Error processing email queue:', err);
  }
};

const startEmailQueueProcessor = () => {
  logger.info('[EmailQueue] Starting background email queue processor...');
  setInterval(processQueue, 5000); // Check every 5 seconds
};

module.exports = {
  queueEmail,
  startEmailQueueProcessor
};
