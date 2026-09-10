const path = require('path');
const fs = require('fs');

const BRAND = {
  company: 'PEHAL Healthcare',
  product: 'AI-CMS Enterprise',
  description: 'Enterprise Clinic Management System',
  colors: {
    primary: '#00B96B',
    primaryDark: '#05403A',
    emerald: '#047857',
    orange: '#F58220',
    bg: '#F5F7FB',
    card: '#FFFFFF',
    textMain: '#0F172A',
    textMuted: '#475569',
    border: '#E2E8F0'
  }
};

/**
 * Returns the absolute path to the official PEPAL logo asset for CID embedding.
 */
const getLogoAttachment = () => {
  const possiblePaths = [
    path.join(__dirname, '../../assets/pehal_logo.jpeg'),
    path.join(__dirname, '../../../frontend/src/assets/logo.jpeg')
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return {
        filename: 'pepal-healthcare-logo.jpg',
        path: p,
        cid: 'pepal-logo'
      };
    }
  }

  return null;
};

/**
 * Generates official PEPAL Healthcare + AI-CMS Enterprise branded OTP email HTML & text.
 *
 * @param {Object} options
 * @param {string} options.otp - 6 digit verification code
 * @param {string} [options.portal] - 'clinic' | 'staff' | 'patient'
 * @param {string} [options.userRole] - 'ADMIN' | 'DOCTOR' | 'PATIENT' | etc.
 * @param {number} [options.expiresInMinutes=5]
 * @returns {{ subject: string, text: string, html: string, attachments: Array }}
 */
const generateOtpEmail = ({ otp, portal, userRole, expiresInMinutes = 5 }) => {
  let portalTitle = 'Account';
  let portalContext = 'AI-CMS Enterprise account';

  const roleUpper = String(userRole || '').toUpperCase();
  const portalLower = String(portal || '').toLowerCase();

  if (portalLower === 'clinic' || roleUpper === 'ADMIN' || roleUpper === 'SUPER_ADMIN') {
    portalTitle = 'Clinic Admin Portal';
    portalContext = 'AI-CMS Enterprise Clinic Admin Portal';
  } else if (
    portalLower === 'staff' ||
    roleUpper === 'DOCTOR' ||
    roleUpper === 'RECEPTIONIST' ||
    roleUpper === 'PHARMACIST' ||
    roleUpper === 'LAB_TECHNICIAN' ||
    roleUpper === 'NURSE' ||
    roleUpper === 'ACCOUNTANT' ||
    roleUpper === 'CLINIC_MANAGER'
  ) {
    portalTitle = 'Doctor & Staff Portal';
    portalContext = 'AI-CMS Enterprise Doctor & Staff Portal';
  } else if (portalLower === 'patient' || roleUpper === 'PATIENT') {
    portalTitle = 'Patient Portal';
    portalContext = 'AI-CMS Enterprise Patient Portal';
  }

  const subject = `Your AI-CMS Enterprise Login OTP`;
  const currentYear = new Date().getFullYear();

  const text = `Your AI-CMS Enterprise Login OTP

Hello,

You requested to sign in to your ${portalContext}.

Use the verification code below to complete your sign-in:

${otp}

⏱ This code expires in ${expiresInMinutes} minutes.

For your security, never share this verification code with anyone.

If you did not request this code, you can safely ignore this email. Someone may have entered your email address by mistake. Your account credentials and data remain secure.

---
${BRAND.company}
${BRAND.product}
${BRAND.description}
This is an automated message. Please do not reply to this email.
© ${currentYear} ${BRAND.company}. All rights reserved.`;

  const logoAttachment = getLogoAttachment();
  const logoImgSrc = logoAttachment ? 'cid:pepal-logo' : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${subject}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, p, a, h1, h2, h3, span { font-family: Arial, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #F5F7FB; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; color: #0F172A;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F5F7FB; min-height: 100vh; padding: 32px 16px;">
    <tr>
      <td align="center" valign="top">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; background-color: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 35px rgba(15, 23, 42, 0.08); border: 1px solid #E2E8F0;">
          
          <!-- BRAND HEADER -->
          <tr>
            <td style="background: linear-gradient(135deg, #00B96B 0%, #05403A 100%); padding: 36px 32px 32px 32px; text-align: center;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${logoImgSrc ? `
                <tr>
                  <td align="center" style="padding-bottom: 14px;">
                    <img src="${logoImgSrc}" alt="${BRAND.company}" width="180" height="auto" style="display: block; max-width: 180px; height: auto; border: 0; outline: none; text-decoration: none; border-radius: 8px;" />
                  </td>
                </tr>
                ` : `
                <tr>
                  <td align="center" style="padding-bottom: 8px;">
                    <div style="font-size: 24px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">${BRAND.company}</div>
                  </td>
                </tr>
                `}
                <tr>
                  <td align="center">
                    <div style="font-size: 16px; font-weight: 700; color: #FFFFFF; letter-spacing: 0.5px; text-transform: uppercase;">
                      ${BRAND.product}
                    </div>
                    <div style="font-size: 12px; font-weight: 500; color: rgba(255, 255, 255, 0.85); margin-top: 4px; letter-spacing: 0.3px;">
                      ${BRAND.description}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- MAIN CONTENT BODY -->
          <tr>
            <td style="padding: 40px 36px 32px 36px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <!-- Portal Badge / Title -->
                <tr>
                  <td style="padding-bottom: 8px;">
                    <div style="display: inline-block; background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 999px; padding: 4px 12px; font-size: 11px; font-weight: 700; color: #047857; text-transform: uppercase; letter-spacing: 0.5px;">
                      ${portalTitle}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 16px;">
                    <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #0F172A; letter-spacing: -0.4px; line-height: 1.3;">
                      Your Login Verification Code
                    </h1>
                  </td>
                </tr>

                <!-- Salutation & Description -->
                <tr>
                  <td style="padding-bottom: 24px; font-size: 14px; line-height: 1.6; color: #475569;">
                    <p style="margin: 0 0 12px 0;">Hello,</p>
                    <p style="margin: 0;">
                      You requested to sign in to your <strong>${portalContext}</strong>. Use the verification code below to complete your sign-in:
                    </p>
                  </td>
                </tr>

                <!-- OTP HIGHLIGHT BOX -->
                <tr>
                  <td align="center" style="padding: 8px 0 28px 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="background-color: #F0FDF4; border: 2px dashed #00B96B; border-radius: 16px; padding: 24px 36px; text-align: center; width: 100%; max-width: 440px;">
                      <tr>
                        <td align="center">
                          <div style="font-family: 'Courier New', Courier, monospace, sans-serif; font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #047857; margin: 0; line-height: 1.2;">
                            ${otp}
                          </div>
                          <div style="font-size: 13px; font-weight: 600; color: #059669; margin-top: 10px;">
                            ⏱ This code expires in ${expiresInMinutes} minutes.
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Security Guidance -->
                <tr>
                  <td style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px 20px; font-size: 12px; line-height: 1.6; color: #64748B;">
                    <p style="margin: 0 0 6px 0; font-weight: 700; color: #334155;">
                      🔒 Security Note
                    </p>
                    <p style="margin: 0 0 6px 0;">
                      For your security, never share this verification code with anyone.
                    </p>
                    <p style="margin: 0;">
                      If you did not request this code, you can safely ignore this email. Someone may have entered your email address by mistake. Your account credentials and data remain secure.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BRAND FOOTER -->
          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 24px 36px; text-align: center;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="font-size: 13px; font-weight: 800; color: #1E293B;">
                    ${BRAND.company}
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-size: 11px; font-weight: 600; color: #64748B; margin-top: 2px;">
                    ${BRAND.product} • ${BRAND.description}
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-size: 11px; color: #94A3B8; padding-top: 10px; line-height: 1.5;">
                    This is an automated message. Please do not reply to this email.<br>
                    &copy; ${currentYear} ${BRAND.company}. All rights reserved.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const attachments = logoAttachment ? [logoAttachment] : [];

  return {
    subject,
    text,
    html,
    attachments
  };
};

module.exports = {
  BRAND,
  getLogoAttachment,
  generateOtpEmail
};
