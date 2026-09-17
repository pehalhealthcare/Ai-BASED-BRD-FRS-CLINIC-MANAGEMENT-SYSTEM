const nodemailer = require('nodemailer');
const { env } = require('../../config/env');
const { logger } = require('../../common/utils/logger');

/**
 * Creates and returns a configured Nodemailer transporter using environment variables.
 */
function createTransporter() {
  const host = env.emailHost || 'smtp.gmail.com';
  const port = env.emailPort || 587;
  const secure = env.emailSecure === true || env.emailSecure === 'true';
  const user = env.emailUser;
  const pass = env.emailPass;

  if (!user || !pass) {
    logger.warn('[email] Missing EMAIL_USER or EMAIL_PASS in environment.');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass
    }
  });
}

/**
 * Sends notification emails for a New Demo Booking Request.
 * 1. Admin/Sales notification sent to configured PEHAL email address.
 * 2. Booking confirmation sent to the client's work email.
 */
async function sendDemoBookingEmails(demoData) {
  const {
    ticketId,
    fullName,
    email,
    phone,
    clinicName,
    doctorsCount,
    selectedDate,
    selectedTime,
    topics,
    submittedAt = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'medium' })
  } = demoData;

  const transporter = createTransporter();
  const recipientEmail = env.emailTo || env.emailUser || 'pehalhealthcare@gmail.com';
  const senderAddress = env.emailFrom || `"PEHAL Healthcare" <${env.emailUser || 'pehalhealthcare@gmail.com'}>`;

  // ── 1. Admin Email (New Demo Booking Request) ──
  const adminHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Demo Booking Request — PEHAL Healthcare</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 112, 243, 0.08); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0070F3 0%, #0051B3 100%); padding: 28px 32px; text-align: left;">
              <table role="presentation" width="100%">
                <tr>
                  <td>
                    <div style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">PEHAL HEALTHCARE</div>
                    <div style="font-size: 12px; font-weight: 600; color: #bae6fd; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px;">Product Demonstration Hub</div>
                  </td>
                  <td align="right">
                    <span style="background-color: rgba(255, 255, 255, 0.2); color: #ffffff; padding: 6px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                      ${ticketId}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td style="padding: 28px 32px 12px 32px;">
              <div style="display: inline-block; background-color: #EFF6FF; border: 1px solid #BFDBFE; color: #0070F3; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
                NEW DEMO BOOKING REQUEST
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #0f172a; line-height: 1.3;">
                A Clinic Owner Has Requested a Product Demo
              </h1>
              <p style="margin: 8px 0 0 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                Please review the requested schedule and prepare the personalized walkthrough session.
              </p>
            </td>
          </tr>

          <!-- Demo Appointment Highlight Box -->
          <tr>
            <td style="padding: 12px 32px;">
              <table role="presentation" width="100%" style="background: linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%); border: 1px solid #DBEAFE; border-radius: 12px; padding: 18px 20px;">
                <tr>
                  <td width="50%" style="vertical-align: top; padding-right: 12px;">
                    <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Requested Date</div>
                    <div style="font-size: 15px; font-weight: 800; color: #0070F3; margin-top: 4px;">${selectedDate}</div>
                  </td>
                  <td width="50%" style="vertical-align: top; padding-left: 12px; border-left: 1px solid #E2E8F0;">
                    <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Requested Time</div>
                    <div style="font-size: 15px; font-weight: 800; color: #0070F3; margin-top: 4px;">${selectedTime}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Demo Booking Details Section -->
          <tr>
            <td style="padding: 12px 32px 24px 32px;">
              <h2 style="font-size: 14px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #F1F5F9; padding-bottom: 8px; margin: 16px 0 12px 0;">
                Demo Booking Details
              </h2>
              
              <table role="presentation" width="100%" cellpadding="6" cellspacing="0" style="font-size: 13px;">
                <tr>
                  <td width="38%" style="color: #64748b; font-weight: 600; padding: 6px 0;">Full Name:</td>
                  <td width="62%" style="color: #0f172a; font-weight: 700; padding: 6px 0;">${fullName}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; font-weight: 600; padding: 6px 0;">Work Email:</td>
                  <td style="color: #0070F3; font-weight: 700; padding: 6px 0;"><a href="mailto:${email}" style="color: #0070F3; text-decoration: none;">${email}</a></td>
                </tr>
                <tr>
                  <td style="color: #64748b; font-weight: 600; padding: 6px 0;">Phone Number:</td>
                  <td style="color: #0f172a; font-weight: 700; padding: 6px 0;">${phone}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; font-weight: 600; padding: 6px 0;">Clinic / Hospital:</td>
                  <td style="color: #0f172a; font-weight: 700; padding: 6px 0;">${clinicName}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; font-weight: 600; padding: 6px 0;">Number of Doctors:</td>
                  <td style="color: #0f172a; font-weight: 700; padding: 6px 0;">${doctorsCount || 'Not specified'}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; font-weight: 600; padding: 6px 0;">Requested Date:</td>
                  <td style="color: #0f172a; font-weight: 700; padding: 6px 0;">${selectedDate}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; font-weight: 600; padding: 6px 0;">Requested Time:</td>
                  <td style="color: #0f172a; font-weight: 700; padding: 6px 0;">${selectedTime}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; font-weight: 600; padding: 6px 0; vertical-align: top;">What they would like to see:</td>
                  <td style="color: #0f172a; font-weight: 600; padding: 6px 0; line-height: 1.4;">${topics || 'Comprehensive overview (EMR, Billing, AI features)'}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; font-weight: 600; padding: 6px 0;">Submitted At:</td>
                  <td style="color: #64748b; font-weight: 500; padding: 6px 0;">${submittedAt}</td>
                </tr>
              </table>

              <!-- Quick Action Button -->
              <div style="margin-top: 24px; text-align: center;">
                <a href="mailto:${email}?subject=PEHAL%20Healthcare%20Demo%20Session%20Confirmed%20-%20${encodeURIComponent(selectedDate)}%20at%20${encodeURIComponent(selectedTime)}" 
                   style="display: inline-block; background-color: #0070F3; color: #ffffff; font-size: 13px; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 112, 243, 0.3);">
                  Reply to ${fullName} (${email})
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.5;">
              This is an automated notification from the PEHAL Healthcare Platform.<br />
              Recipient: ${recipientEmail} | Reference ID: ${ticketId}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const adminText = `
========================================
NEW DEMO BOOKING REQUEST — PEHAL HEALTHCARE
========================================

A clinic owner has requested a personalized PEHAL Healthcare product demonstration.

Demo Booking Details:
----------------------------------------
Name: ${fullName}
Work Email: ${email}
Phone Number: ${phone}
Clinic / Hospital: ${clinicName}
Number of Doctors: ${doctorsCount}
Requested Date: ${selectedDate}
Requested Time: ${selectedTime}
What they would like to see: ${topics || 'Comprehensive overview'}
Submitted At: ${submittedAt}
Booking ID: ${ticketId}

Reply-To: ${email}
`;

  // Send admin notification
  const adminMailOptions = {
    from: senderAddress,
    to: recipientEmail,
    replyTo: email,
    subject: 'New Demo Booking Request — PEHAL Healthcare',
    text: adminText,
    html: adminHtml
  };

  const adminInfo = await transporter.sendMail(adminMailOptions);
  logger.info(`[demo:email] Admin demo booking email sent: MessageId=${adminInfo.messageId}`);

  // ── 2. User Confirmation Email ──
  try {
    const userHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Your PEHAL Healthcare Demo is Scheduled</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 112, 243, 0.08); border: 1px solid #e2e8f0;">
          
          <tr>
            <td style="background: linear-gradient(135deg, #0070F3 0%, #0051B3 100%); padding: 28px 32px; text-align: left;">
              <div style="font-size: 20px; font-weight: 800; color: #ffffff;">PEHAL HEALTHCARE</div>
              <div style="font-size: 12px; font-weight: 600; color: #bae6fd; text-transform: uppercase; margin-top: 4px;">Personalized Product Walkthrough</div>
            </td>
          </tr>

          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 800; color: #0f172a;">
                Demo Booking Confirmed!
              </h1>
              <p style="margin: 0 0 20px 0; font-size: 14px; color: #475569; line-height: 1.6;">
                Dear <strong>${fullName}</strong>, thank you for scheduling a personalized PEHAL Healthcare demonstration for <strong>${clinicName}</strong>.
              </p>

              <div style="background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <div style="font-size: 12px; font-weight: 700; color: #0070F3; text-transform: uppercase; margin-bottom: 8px;">Session Details</div>
                <div style="font-size: 14px; color: #1e293b; margin-bottom: 6px;"><strong>Date:</strong> ${selectedDate}</div>
                <div style="font-size: 14px; color: #1e293b; margin-bottom: 6px;"><strong>Time:</strong> ${selectedTime}</div>
                <div style="font-size: 14px; color: #1e293b; margin-bottom: 6px;"><strong>Clinic:</strong> ${clinicName}</div>
                <div style="font-size: 14px; color: #1e293b;"><strong>Reference Code:</strong> ${ticketId}</div>
              </div>

              <p style="font-size: 13px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
                A PEHAL product specialist will join you for a focused 30-minute session to show you how our AI-powered clinic workflows, digital EMR, smart billing, and appointment systems fit your clinic.
              </p>
              
              <p style="font-size: 13px; color: #475569; line-height: 1.6; margin: 0;">
                If you need to reschedule or have questions before the demo, feel free to reply directly to this email.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; font-size: 11px; color: #94a3b8; text-align: center;">
              © 2026 PEHAL Healthcare Technologies Private Limited. All rights reserved.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    await transporter.sendMail({
      from: senderAddress,
      to: email,
      subject: `Your PEHAL Healthcare Demo is Scheduled — ${selectedDate} at ${selectedTime}`,
      html: userHtml
    });
    logger.info(`[demo:email] User confirmation email sent to ${email}`);
  } catch (userMailErr) {
    logger.warn('[demo:email] User confirmation email failed (admin notification succeeded):', userMailErr);
  }

  return { messageId: adminInfo.messageId, recipient: recipientEmail };
}

/**
 * Sends notification emails for a New Customer Support Request.
 * 1. Admin/Support notification sent to configured PEHAL email address.
 * 2. Ticket acknowledgment sent to customer's submitted email.
 */
async function sendCustomerSupportEmails(supportData) {
  const {
    ticketId,
    firstName,
    lastName = '',
    email,
    phone,
    clinicName,
    role = 'Clinic Staff',
    department = 'General Inquiry',
    priority = 'Normal',
    subject,
    message,
    ipAddress = 'N/A',
    browserMetadata = 'N/A',
    submittedAt = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'medium' })
  } = supportData;

  const transporter = createTransporter();
  const recipientEmail = env.emailTo || env.emailUser || 'pehalhealthcare@gmail.com';
  const senderAddress = env.emailFrom || `"PEHAL Support System" <${env.emailUser || 'pehalhealthcare@gmail.com'}>`;
  const fullName = `${firstName} ${lastName}`.trim();

  // ── 1. Admin/Support Email ──
  const adminHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Customer Support Request — PEHAL Healthcare</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); padding: 28px 32px; text-align: left; border-bottom: 3px solid #10B981;">
              <table role="presentation" width="100%">
                <tr>
                  <td>
                    <div style="font-size: 20px; font-weight: 800; color: #ffffff;">PEHAL HEALTHCARE</div>
                    <div style="font-size: 12px; font-weight: 600; color: #34D399; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px;">Customer Support Desk</div>
                  </td>
                  <td align="right">
                    <span style="background-color: ${priority === 'Critical' ? '#EF4444' : priority === 'High' ? '#F59E0B' : '#3B82F6'}; color: #ffffff; padding: 6px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase;">
                      ${priority} PRIORITY
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td style="padding: 28px 32px 12px 32px;">
              <div style="display: inline-block; background-color: #F0FDF4; border: 1px solid #BBF7D0; color: #059669; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
                NEW CUSTOMER SUPPORT REQUEST
              </div>
              <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #0f172a; line-height: 1.3;">
                Ticket ${ticketId}: ${subject}
              </h1>
              <p style="margin: 8px 0 0 0; font-size: 13px; color: #64748b;">
                Department: <strong style="color: #0f172a;">${department}</strong> | Target SLA: <strong style="color: #059669;">${priority === 'Critical' ? '15 Minutes' : '1 Hour'}</strong>
              </p>
            </td>
          </tr>

          <!-- Customer Support Request Details -->
          <tr>
            <td style="padding: 12px 32px 24px 32px;">
              <h2 style="font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #F1F5F9; padding-bottom: 8px; margin: 12px 0 12px 0;">
                Customer Support Request
              </h2>
              
              <table role="presentation" width="100%" cellpadding="5" cellspacing="0" style="font-size: 13px;">
                <tr>
                  <td width="36%" style="color: #64748b; font-weight: 600; padding: 5px 0;">Name:</td>
                  <td width="64%" style="color: #0f172a; font-weight: 700; padding: 5px 0;">${fullName}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; font-weight: 600; padding: 5px 0;">Email:</td>
                  <td style="color: #0070F3; font-weight: 700; padding: 5px 0;"><a href="mailto:${email}" style="color: #0070F3; text-decoration: none;">${email}</a></td>
                </tr>
                <tr>
                  <td style="color: #64748b; font-weight: 600; padding: 5px 0;">Phone Number:</td>
                  <td style="color: #0f172a; font-weight: 700; padding: 5px 0;">${phone}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; font-weight: 600; padding: 5px 0;">Clinic / Hospital:</td>
                  <td style="color: #0f172a; font-weight: 700; padding: 5px 0;">${clinicName}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; font-weight: 600; padding: 5px 0;">Role / Department:</td>
                  <td style="color: #0f172a; font-weight: 600; padding: 5px 0;">${role} — ${department}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; font-weight: 600; padding: 5px 0;">Priority:</td>
                  <td style="color: #0f172a; font-weight: 700; padding: 5px 0;">${priority}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; font-weight: 600; padding: 5px 0;">Subject:</td>
                  <td style="color: #0f172a; font-weight: 700; padding: 5px 0;">${subject}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; font-weight: 600; padding: 5px 0;">Submitted At:</td>
                  <td style="color: #64748b; font-weight: 500; padding: 5px 0;">${submittedAt}</td>
                </tr>
              </table>

              <!-- Customer Message Box -->
              <div style="margin-top: 16px;">
                <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 6px;">Message Content</div>
                <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px; font-size: 13.5px; line-height: 1.6; color: #1e293b;">
                  ${message.replace(/\n/g, '<br>')}
                </div>
              </div>

              <!-- Quick Action Button -->
              <div style="margin-top: 24px; text-align: center;">
                <a href="mailto:${email}?subject=Re:%20[${priority}%20Priority]%20PEHAL%20Support%20Ticket%20${ticketId}:%20${encodeURIComponent(subject)}" 
                   style="display: inline-block; background-color: #0F172A; color: #ffffff; font-size: 13px; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);">
                  Reply Directly to ${fullName} (${email})
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 32px; font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.5;">
              Audit Log: IP ${ipAddress} | Browser: ${browserMetadata}<br />
              Recipient: ${recipientEmail} | Ticket ID: ${ticketId}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const adminText = `
========================================
NEW CUSTOMER SUPPORT REQUEST — PEHAL HEALTHCARE
========================================

A customer has submitted a support request on the PEHAL Healthcare portal.

Customer Support Request:
----------------------------------------
Name: ${fullName}
Email: ${email}
Phone Number: ${phone}
Clinic / Hospital: ${clinicName}
Priority: ${priority}
Department: ${department}
Subject: ${subject}

Message:
${message}

Submitted At: ${submittedAt}
Ticket ID: ${ticketId}

Reply-To: ${email}
`;

  // Send admin/support notification
  const adminMailOptions = {
    from: senderAddress,
    to: recipientEmail,
    replyTo: email,
    subject: 'New Customer Support Request — PEHAL Healthcare',
    text: adminText,
    html: adminHtml
  };

  const adminInfo = await transporter.sendMail(adminMailOptions);
  logger.info(`[support:email] Admin support request email sent: MessageId=${adminInfo.messageId}`);

  // ── 2. User Acknowledgment Email ──
  try {
    const userHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Support Request Acknowledged — Ticket ${ticketId}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0;">
          
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 28px 32px; text-align: left;">
              <div style="font-size: 20px; font-weight: 800; color: #ffffff;">PEHAL HEALTHCARE</div>
              <div style="font-size: 12px; font-weight: 600; color: #a7f3d0; text-transform: uppercase; margin-top: 4px;">Support Desk</div>
            </td>
          </tr>

          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 800; color: #0f172a;">
                Support Request Acknowledged
              </h1>
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569; line-height: 1.6;">
                Dear <strong>${firstName}</strong>, thank you for contacting PEHAL Healthcare Support. We have received your request regarding <strong>"${subject}"</strong>.
              </p>

              <div style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; padding: 18px; margin-bottom: 20px;">
                <div style="font-size: 13.5px; color: #1e293b; margin-bottom: 6px;"><strong>Ticket Identifier:</strong> ${ticketId}</div>
                <div style="font-size: 13.5px; color: #1e293b; margin-bottom: 6px;"><strong>Target Department:</strong> ${department}</div>
                <div style="font-size: 13.5px; color: #1e293b; margin-bottom: 6px;"><strong>Priority Level:</strong> ${priority}</div>
                <div style="font-size: 13.5px; color: #1e293b;"><strong>Estimated Response:</strong> ${priority === 'Critical' ? 'Within 15 Minutes' : 'Within 1 Business Hour'}</div>
              </div>

              <p style="font-size: 13px; color: #475569; line-height: 1.6; margin: 0 0 12px 0;">
                Our technical support team is already reviewing your ticket. If you have additional details or attachments to share, please reply directly to this email.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 32px; font-size: 11px; color: #94a3b8; text-align: center;">
              © 2026 PEHAL Healthcare Technologies Private Limited. All rights reserved.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    await transporter.sendMail({
      from: senderAddress,
      to: email,
      subject: `We Received Your Support Request — Ticket ${ticketId}`,
      html: userHtml
    });
    logger.info(`[support:email] User acknowledgment email sent to ${email}`);
  } catch (userMailErr) {
    logger.warn('[support:email] User acknowledgment email failed (admin notification succeeded):', userMailErr);
  }

  return { messageId: adminInfo.messageId, recipient: recipientEmail };
}

module.exports = {
  sendDemoBookingEmails,
  sendCustomerSupportEmails
};
