const { Router } = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const { env } = require('../../config/env');

const router = Router();

// Mongoose schema for SupportTicket
const SupportTicketSchema = new mongoose.Schema({
  ticketId: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  clinicName: { type: String, required: true },
  role: { type: String, required: true },
  department: { type: String, required: true },
  priority: { type: String, required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, default: 'Open' },
  ipAddress: String,
  browserMetadata: String,
  createdAt: { type: Date, default: Date.now }
});

const SupportTicket = mongoose.models.SupportTicket || mongoose.model('SupportTicket', SupportTicketSchema);

router.post('/', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, clinicName, role, department, priority, subject, message } = req.body;
    
    // Simple sanitation & validation
    if (!firstName || !lastName || !email || !phone || !clinicName || !role || !department || !priority || !subject || !message) {
      return res.status(400).json({ success: false, message: 'All required fields must be completed.' });
    }

    const ticketId = `PHL-${Date.now().toString().slice(-6)}`;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const browserMetadata = req.headers['user-agent'];

    // Save ticket to MongoDB database
    const ticket = new SupportTicket({
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
      browserMetadata
    });

    await ticket.save();

    // Nodemailer SMTP Transporter
    let emailStatus = 'sent';
    try {
      const transporter = nodemailer.createTransport({
        host: env.emailHost || 'smtp.gmail.com',
        port: env.emailPort || 587,
        secure: env.emailSecure === 'true' || env.emailSecure === true,
        auth: {
          user: env.emailUser || 'noreply@pehalhealth.com',
          pass: env.emailPass || 'placeholder'
        }
      });

      // HTML template for support destination
      const supportEmailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; color: #1e293b;">
          <h2 style="color: #059669; border-bottom: 2px solid #34d399; padding-bottom: 8px;">[${priority}] Support Ticket Received - ${ticketId}</h2>
          <p><strong>Date & Time:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>From:</strong> ${firstName} ${lastName} (<a href="mailto:${email}">${email}</a>)</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <p><strong>Clinic Name:</strong> ${clinicName}</p>
          <p><strong>User Role:</strong> ${role}</p>
          <p><strong>Target Department:</strong> ${department}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p><strong>Message:</strong></p>
          <p style="background-color: #f8fafc; padding: 16px; border-radius: 8px; font-size: 14px; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 11px; color: #94a3b8;">
            <strong>Audit Log:</strong> IP: ${ipAddress} | Browser: ${browserMetadata}
          </p>
        </div>
      `;

      // Email to support destination
      await transporter.sendMail({
        from: env.emailFrom || `"PEHAL Support System" <noreply@pehalhealth.com>`,
        to: 'kaishavgupta4.2001@gmail.com',
        subject: `[${priority}] Support Ticket - ${ticketId}: ${subject}`,
        html: supportEmailHtml
      });

      // Confirmation email back to user
      const userEmailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; color: #1e293b;">
          <h2 style="color: #059669; border-bottom: 2px solid #34d399; padding-bottom: 8px;">Support Request Acknowledged</h2>
          <p>Dear ${firstName},</p>
          <p>Thank you for contacting PEHAL Healthcare Support. We have successfully registered your ticket regarding <strong>"${subject}"</strong>.</p>
          <p>Our designated support specialists are reviewing your request, and will get back to you within <strong>1 business hour</strong>.</p>
          <div style="background-color: #f0fdf4; border: 1px solid #d1fae5; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 13px;">
            <p style="margin: 0 0 8px 0;"><strong>Ticket ID:</strong> ${ticketId}</p>
            <p style="margin: 0 0 8px 0;"><strong>Department:</strong> ${department}</p>
            <p style="margin: 0;"><strong>Priority:</strong> ${priority}</p>
          </div>
          <p>If you have additional details to submit, please reply directly to this email without modifying the ticket ID in the subject.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 11px; color: #64748b;">
            PEHAL Healthcare Technologies Private Limited. | support@pehalhealth.com
          </p>
        </div>
      `;

      await transporter.sendMail({
        from: env.emailFrom || `"PEHAL Support System" <noreply@pehalhealth.com>`,
        to: email,
        subject: `We received your support request - Ticket ${ticketId}`,
        html: userEmailHtml
      });
    } catch (mailErr) {
      console.error('Mail delivery failed via SMTP, but ticket saved to DB:', mailErr);
      emailStatus = 'failed';
    }

    return res.status(200).json({
      success: true,
      ticketId,
      emailStatus,
      message: emailStatus === 'failed'
        ? 'Your request has been received successfully. We are experiencing a temporary email delivery issue, but our support team has already received your request.'
        : 'Support ticket created successfully and confirmation emails have been sent.'
    });
  } catch (err) {
    console.error('Failed to submit contact ticket:', err);
    return res.status(500).json({ success: false, message: 'Internal Server Error.' });
  }
});

module.exports = router;
