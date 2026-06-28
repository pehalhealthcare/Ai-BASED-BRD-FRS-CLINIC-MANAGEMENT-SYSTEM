const twilio = require('twilio');
const nodemailer = require('nodemailer');
const { env } = require('../../config/env');
const { logger } = require('../../common/utils/logger');

const renderNotificationTemplate = (templateBody = '', variables = {}) =>
  String(templateBody).replace(/{{\s*([^{}]+?)\s*}}/g, (_match, variableName) => {
    const value = variables?.[variableName];

    if (value === null || typeof value === 'undefined') {
      return '';
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    return String(value);
  });

const buildProviderResult = (providerName, channel) => ({
  status: 'sent',
  provider: providerName,
  providerMessageId: `${providerName}-${Date.now()}`,
  channel
});

const mockProvider = {
  name: 'mock',
  async send(payload) {
    return buildProviderResult('mock', payload.channel);
  }
};

const consoleProvider = {
  name: 'console',
  async send(payload) {
    // Keep local development transparent without requiring any external provider.
    // eslint-disable-next-line no-console
    console.info('[notification:console]', {
      channel: payload.channel,
      subject: payload.subject || '',
      recipient: payload.recipient,
      body: payload.body
    });

    return buildProviderResult('console', payload.channel);
  }
};

const emailProvider = {
  name: 'email',
  async send(payload) {
    if (!env.emailHost || !env.emailUser || !env.emailPass) {
      logger.warn('[notification:email] Missing SMTP credentials (EMAIL_HOST, EMAIL_USER, EMAIL_PASS), falling back to console log.');
      // eslint-disable-next-line no-console
      console.info('[notification:email-fallback]', {
        subject: payload.subject || '',
        recipient: payload.recipient,
        body: payload.body
      });
      return buildProviderResult('email', payload.channel);
    }

    try {
      const transporter = nodemailer.createTransport({
        host: env.emailHost,
        port: env.emailPort || 587,
        secure: !!env.emailSecure,
        auth: {
          user: env.emailUser,
          pass: env.emailPass
        }
      });

      const recipientEmail = typeof payload.recipient === 'object' ? payload.recipient.email : payload.recipient;
      if (!recipientEmail) {
        throw new Error('Recipient email is missing.');
      }

      const mailOptions = {
        from: env.emailFrom || `"AI-CMS Clinic" <noreply@aicms.local>`,
        to: recipientEmail,
        subject: payload.subject || 'Notification from AI-CMS',
        text: payload.body,
        html: payload.body.replace(/\n/g, '<br>')
      };

      const info = await transporter.sendMail(mailOptions);
      logger.info(`[notification:email] Email sent successfully: MessageId=${info.messageId}`);

      return {
        status: 'sent',
        provider: 'email',
        providerMessageId: info.messageId,
        channel: payload.channel
      };
    } catch (error) {
      logger.error('[notification:email] Failed to send email via SMTP', error);
      throw error;
    }
  }
};

const twilioProvider = {
  name: 'twilio',
  async send(payload) {
    if (env.isDevelopment) {
      logger.info('[notification:twilio] Twilio provider is disconnected in development. Mocking send.');
      return mockProvider.send(payload);
    }

    if (!env.twilioAccountSid || !env.twilioAuthToken || !env.twilioPhoneNumber) {
      logger.warn('[notification:twilio] Missing Twilio configuration, falling back to mock.');
      return mockProvider.send(payload);
    }
    try {
      const client = twilio(env.twilioAccountSid, env.twilioAuthToken);
      let toPhone = payload.recipient?.phone;
      if (!toPhone) {
        throw new Error('Recipient phone number is missing.');
      }
      
      // Clean all non-digit characters except leading +
      toPhone = toPhone.replace(/(?!^\+)[^\d]/g, '');

      if (!toPhone.startsWith('+')) {
        if (toPhone.length === 10) {
          toPhone = '+91' + toPhone; // Assume Indian number for 10 digits
        } else {
          toPhone = '+' + toPhone;
        }
      }

      // If channel is whatsapp, prefix with 'whatsapp:'
      const isWhatsApp = payload.channel === 'whatsapp';
      const to = isWhatsApp ? `whatsapp:${toPhone}` : toPhone;
      const from = isWhatsApp ? `whatsapp:${env.twilioPhoneNumber}` : env.twilioPhoneNumber;

      const message = await client.messages.create({
        body: payload.body,
        from,
        to
      });

      return {
        status: 'sent',
        provider: 'twilio',
        providerMessageId: message.sid,
        channel: payload.channel
      };
    } catch (error) {
      logger.error('[notification:twilio] Failed to send message', error);
      throw error;
    }
  }
};

const providers = {
  mock: mockProvider,
  console: consoleProvider,
  email: emailProvider,
  twilio: twilioProvider
};

const getNotificationProvider = (providerName = env.notificationProvider) => {
  if (!providerName || !providers[providerName]) {
    return env.enableMockNotifications ? mockProvider : consoleProvider;
  }

  if (providerName === 'mock' && !env.enableMockNotifications) {
    return consoleProvider;
  }

  return providers[providerName];
};

module.exports = {
  renderNotificationTemplate,
  getNotificationProvider
};
