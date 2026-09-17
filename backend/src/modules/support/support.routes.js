const { Router } = require('express');
const mongoose = require('mongoose');
const { sendDemoBookingEmails, sendCustomerSupportEmails } = require('./supportEmail.service');
const { logger } = require('../../common/utils/logger');

const router = Router();

// Mongoose schema for SupportTicket / DemoBooking
const SupportTicketSchema = new mongoose.Schema({
  ticketId: { type: String, required: true, unique: true },
  type: { type: String, enum: ['support', 'demo'], default: 'support' },
  firstName: { type: String, required: true },
  lastName: { type: String, default: '' },
  fullName: { type: String },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  clinicName: { type: String, required: true },
  role: { type: String, default: 'Clinic Staff' },
  department: { type: String, default: 'General Inquiry' },
  priority: { type: String, default: 'Normal' },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  doctorsCount: { type: String },
  requestedDate: { type: String },
  requestedTime: { type: String },
  topics: { type: String },
  status: { type: String, default: 'Open' },
  emailStatus: { type: String, default: 'pending' },
  ipAddress: String,
  browserMetadata: String,
  createdAt: { type: Date, default: Date.now }
});

const SupportTicket = mongoose.models.SupportTicket || mongoose.model('SupportTicket', SupportTicketSchema);

/**
 * POST /api/v1/support/demo
 * Dedicated endpoint for Book a Demo form submissions.
 */
router.post('/demo', async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      clinicName,
      doctorsCount,
      selectedDate,
      selectedTime,
      topics,
      agree
    } = req.body;

    // Strict validation
    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ success: false, message: 'Full name is required.' });
    }
    if (!email || !email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ success: false, message: 'Valid work email is required.' });
    }
    if (!phone || !phone.trim() || phone.replace(/[^0-9]/g, '').length < 10) {
      return res.status(400).json({ success: false, message: 'Valid 10-digit phone number is required.' });
    }
    if (!clinicName || !clinicName.trim()) {
      return res.status(400).json({ success: false, message: 'Clinic or hospital name is required.' });
    }
    if (!doctorsCount) {
      return res.status(400).json({ success: false, message: 'Number of doctors is required.' });
    }
    if (!selectedDate) {
      return res.status(400).json({ success: false, message: 'Please select an appointment date.' });
    }
    if (!selectedTime) {
      return res.status(400).json({ success: false, message: 'Please select an appointment time slot.' });
    }
    if (!agree && agree !== undefined) {
      return res.status(400).json({ success: false, message: 'You must agree to the Terms of Service and Privacy Policy.' });
    }

    const ticketId = `DEMO-${Date.now().toString().slice(-6)}`;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
    const browserMetadata = req.headers['user-agent'];
    const submittedAt = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'medium' });

    // Save demo booking to MongoDB database
    const booking = new SupportTicket({
      ticketId,
      type: 'demo',
      firstName: fullName.split(' ')[0] || fullName,
      lastName: fullName.split(' ').slice(1).join(' ') || '',
      fullName,
      email,
      phone,
      clinicName,
      role: `Clinic Head (${doctorsCount})`,
      department: 'Product Demo',
      priority: 'High',
      subject: `PEHAL Demo Booking: ${selectedDate} at ${selectedTime}`,
      message: `Demo Session Request\nClinic: ${clinicName}\nDoctors: ${doctorsCount}\nSchedule: ${selectedDate} at ${selectedTime}\nTopics: ${topics || 'All Modules'}`,
      doctorsCount,
      requestedDate: selectedDate,
      requestedTime: selectedTime,
      topics,
      ipAddress,
      browserMetadata
    });

    await booking.save();

    // Send emails via SMTP configuration
    let emailStatus = 'sent';
    try {
      await sendDemoBookingEmails({
        ticketId,
        fullName,
        email,
        phone,
        clinicName,
        doctorsCount,
        selectedDate,
        selectedTime,
        topics,
        submittedAt
      });
      booking.emailStatus = 'sent';
      await booking.save();
    } catch (mailErr) {
      logger.error('[support/demo] Email sending failed:', mailErr);
      emailStatus = 'failed';
      booking.emailStatus = 'failed';
      await booking.save();
    }

    return res.status(200).json({
      success: true,
      ticketId,
      emailStatus,
      message: emailStatus === 'failed'
        ? 'Demo request received. Our team will contact you shortly.'
        : 'Demo scheduled successfully and confirmation email sent.'
    });
  } catch (err) {
    logger.error('[support/demo] Error processing demo booking:', err);
    return res.status(500).json({ success: false, message: 'Internal Server Error while booking demo.' });
  }
});

/**
 * POST /api/v1/support
 * Handles Customer Support tickets and routes demo requests if sent here.
 */
router.post('/', async (req, res) => {
  try {
    const {
      firstName,
      lastName = '',
      fullName,
      email,
      phone,
      clinicName,
      role = 'Clinic Owner',
      department = 'General Inquiry',
      priority = 'Normal',
      subject,
      message,
      doctorsCount,
      selectedDate,
      selectedTime,
      topics,
      agree
    } = req.body;

    const isDemo = department === 'Book a Demo Request' || department === 'Product Demo' || !!selectedDate;

    if (isDemo) {
      // Process as Demo Booking
      const effectiveFullName = fullName || `${firstName || ''} ${lastName || ''}`.trim();
      if (!effectiveFullName) {
        return res.status(400).json({ success: false, message: 'Full name is required.' });
      }
      if (!email || !/\S+@\S+\.\S+/.test(email)) {
        return res.status(400).json({ success: false, message: 'Valid work email is required.' });
      }
      if (!phone || phone.replace(/[^0-9]/g, '').length < 10) {
        return res.status(400).json({ success: false, message: 'Valid 10-digit phone number is required.' });
      }
      if (!clinicName || !clinicName.trim()) {
        return res.status(400).json({ success: false, message: 'Clinic or hospital name is required.' });
      }

      const ticketId = `DEMO-${Date.now().toString().slice(-6)}`;
      const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
      const browserMetadata = req.headers['user-agent'];
      const submittedAt = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'medium' });

      const booking = new SupportTicket({
        ticketId,
        type: 'demo',
        firstName: effectiveFullName.split(' ')[0] || effectiveFullName,
        lastName: effectiveFullName.split(' ').slice(1).join(' ') || '',
        fullName: effectiveFullName,
        email,
        phone,
        clinicName,
        role: role || `Clinic Head (${doctorsCount || '1-5'})`,
        department: 'Product Demo',
        priority: 'High',
        subject: subject || `PEHAL Demo Booking: ${selectedDate || 'Upcoming'} at ${selectedTime || 'Flexible'}`,
        message: message || `Demo Session Request\nClinic: ${clinicName}\nSchedule: ${selectedDate} at ${selectedTime}`,
        doctorsCount,
        requestedDate: selectedDate,
        requestedTime: selectedTime,
        topics,
        ipAddress,
        browserMetadata
      });

      await booking.save();

      let emailStatus = 'sent';
      try {
        await sendDemoBookingEmails({
          ticketId,
          fullName: effectiveFullName,
          email,
          phone,
          clinicName,
          doctorsCount: doctorsCount || '2-5 Doctors',
          selectedDate: selectedDate || new Date().toLocaleDateString(),
          selectedTime: selectedTime || '12:30 PM',
          topics: topics || message,
          submittedAt
        });
        booking.emailStatus = 'sent';
        await booking.save();
      } catch (mailErr) {
        logger.error('[support] Demo email sending failed:', mailErr);
        emailStatus = 'failed';
        booking.emailStatus = 'failed';
        await booking.save();
      }

      return res.status(200).json({
        success: true,
        ticketId,
        emailStatus,
        message: 'Demo scheduled successfully and confirmation email sent.'
      });
    }

    // ── Regular Customer Support Request ──
    if (!firstName || !firstName.trim()) {
      return res.status(400).json({ success: false, message: 'First name is required.' });
    }
    if (!lastName || !lastName.trim()) {
      return res.status(400).json({ success: false, message: 'Last name is required.' });
    }
    if (!email || !email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ success: false, message: 'Valid email address is required.' });
    }
    if (!phone || !phone.trim() || phone.replace(/[^0-9]/g, '').length < 10) {
      return res.status(400).json({ success: false, message: 'Valid 10-digit phone number is required.' });
    }
    if (!clinicName || !clinicName.trim()) {
      return res.status(400).json({ success: false, message: 'Clinic or hospital name is required.' });
    }
    if (!subject || !subject.trim()) {
      return res.status(400).json({ success: false, message: 'Subject is required.' });
    }
    if (!message || !message.trim() || message.trim().length < 10) {
      return res.status(400).json({ success: false, message: 'Message must be at least 10 characters.' });
    }

    const ticketId = `PHL-${Date.now().toString().slice(-6)}`;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
    const browserMetadata = req.headers['user-agent'];
    const submittedAt = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'medium' });

    // Save support ticket to MongoDB
    const ticket = new SupportTicket({
      ticketId,
      type: 'support',
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim(),
      email,
      phone,
      clinicName,
      role,
      department,
      priority,
      subject,
      message,
      ipAddress,
      browserMetadata
    });

    await ticket.save();

    // Send emails via SMTP configuration
    let emailStatus = 'sent';
    try {
      await sendCustomerSupportEmails({
        ticketId,
        firstName,
        lastName,
        email,
        phone,
        clinicName,
        role,
        department,
        priority,
        subject,
        message,
        ipAddress,
        browserMetadata,
        submittedAt
      });
      ticket.emailStatus = 'sent';
      await ticket.save();
    } catch (mailErr) {
      logger.error('[support] Support email delivery failed:', mailErr);
      emailStatus = 'failed';
      ticket.emailStatus = 'failed';
      await ticket.save();
    }

    return res.status(200).json({
      success: true,
      ticketId,
      emailStatus,
      message: emailStatus === 'failed'
        ? 'Your support request has been received. Our team is reviewing it.'
        : 'Support ticket created successfully and confirmation emails have been sent.'
    });
  } catch (err) {
    logger.error('[support] Failed to submit support ticket:', err);
    return res.status(500).json({ success: false, message: 'Internal Server Error while submitting ticket.' });
  }
});

module.exports = router;
