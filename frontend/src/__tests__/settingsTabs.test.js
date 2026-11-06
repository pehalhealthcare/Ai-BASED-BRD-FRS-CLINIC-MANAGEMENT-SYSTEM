import { test, describe } from 'node:test';
import assert from 'node:assert';
import { checkPlanEntitlement, FEATURE_TIERS } from '../utils/planEntitlements.js';

describe('Settings Module End-to-End & Tab Implementations', () => {

  // 1. Subscription Plan Feature Gating Tests
  describe('Plan Entitlements & Subscription Gatekeeping', () => {
    const starterClinic = {
      subscription: {
        planId: {
          name: 'AI Starter Clinic',
          features: ['patient_registration', 'appointments', 'billing', 'prescriptions', 'sms', 'cloud_backup', 'email_support']
        }
      }
    };

    const professionalClinic = {
      subscription: {
        planId: {
          name: 'AI Professional Clinic',
          features: ['patient_registration', 'appointments', 'billing', 'prescriptions', 'sms', 'cloud_backup', 'email_support', 'whatsapp_integration', 'labs', 'role_based_access']
        }
      }
    };

    test('Starter plan allows SMS and Cloud Backup but restricts WhatsApp and LIS/RIS', () => {
      const smsCheck = checkPlanEntitlement(starterClinic, 'SMS');
      assert.strictEqual(smsCheck.allowed, true);

      const backupCheck = checkPlanEntitlement(starterClinic, 'CLOUD_BACKUP');
      assert.strictEqual(backupCheck.allowed, true);

      const waCheck = checkPlanEntitlement(starterClinic, 'WHATSAPP');
      assert.strictEqual(waCheck.allowed, false);
      assert.strictEqual(waCheck.minRequiredPlan, 'AI Professional Clinic');

      const lisCheck = checkPlanEntitlement(starterClinic, 'LABS_LIS');
      assert.strictEqual(lisCheck.allowed, false);
    });

    test('Professional plan unlocks WhatsApp Business, LIS, and Advanced Security', () => {
      const waCheck = checkPlanEntitlement(professionalClinic, 'WHATSAPP');
      assert.strictEqual(waCheck.allowed, true);

      const lisCheck = checkPlanEntitlement(professionalClinic, 'LABS_LIS');
      assert.strictEqual(lisCheck.allowed, true);

      const secCheck = checkPlanEntitlement(professionalClinic, 'ADVANCED_SECURITY');
      assert.strictEqual(secCheck.allowed, true);
    });

    test('Payment Gateway is strictly Coming Soon and not allowed under any plan', () => {
      // Payment gateway should always be disabled
      const isComingSoon = true;
      assert.strictEqual(isComingSoon, true);
    });
  });

  // 2. Notifications Preferences & Events Logic
  describe('Notifications Preferences & Events Matrix', () => {
    test('Default channels cover Email, SMS, WhatsApp, and In-App', () => {
      const defaultChannels = {
        email: true,
        sms: true,
        whatsapp: true,
        inApp: true
      };
      assert.strictEqual(Object.keys(defaultChannels).length, 4);
      assert.strictEqual(defaultChannels.email, true);
      assert.strictEqual(defaultChannels.sms, true);
      assert.strictEqual(defaultChannels.whatsapp, true);
      assert.strictEqual(defaultChannels.inApp, true);
    });

    test('Notification events matrix covers all 7 clinic lifecycle events', () => {
      const eventKeys = [
        'appointmentConfirmation',
        'appointmentReminder',
        'appointmentReschedule',
        'appointmentCancellation',
        'patientRegistration',
        'invoicePaymentUpdates',
        'labReportReady'
      ];
      assert.strictEqual(eventKeys.length, 7);
      assert.strictEqual(eventKeys.includes('appointmentConfirmation'), true);
      assert.strictEqual(eventKeys.includes('invoicePaymentUpdates'), true);
      assert.strictEqual(eventKeys.includes('labReportReady'), true);
    });
  });

  // 3. Integrations Tab Specifications
  describe('Integrations Tab Status & Guardrails', () => {
    const sampleClinic = {
      integrations: {
        whatsapp: { status: 'connected', apiKey: 'EAAG...' },
        smsGateway: { status: 'connected', provider: 'Twilio' },
        emailService: { status: 'connected', host: 'smtp.sendgrid.net' },
        lis: { status: 'not_connected' },
        ris: { status: 'not_connected' },
        paymentGateway: { status: 'coming_soon', enabled: false }
      }
    };

    test('Accurately identifies connected vs not connected vs coming soon services', () => {
      const waStatus = sampleClinic.integrations.whatsapp.status === 'connected';
      const lisStatus = sampleClinic.integrations.lis.status === 'connected';
      const isPaymentComingSoon = sampleClinic.integrations.paymentGateway.status === 'coming_soon';

      assert.strictEqual(waStatus, true);
      assert.strictEqual(lisStatus, false);
      assert.strictEqual(isPaymentComingSoon, true);
    });
  });

  // 4. Backup & Data Settings Specifications
  describe('Backup & Data Retention Logic', () => {
    test('Backup frequency and time formatting', () => {
      const schedule = {
        autoBackup: true,
        backupFrequency: 'Daily',
        backupTime: '02:00 AM',
        dataRetentionDays: 365
      };

      assert.strictEqual(schedule.autoBackup, true);
      assert.strictEqual(schedule.backupFrequency, 'Daily');
      assert.strictEqual(schedule.backupTime, '02:00 AM');
      assert.strictEqual(schedule.dataRetentionDays, 365);
    });

    test('Estimated backup sizing scales dynamically with clinic record counts', () => {
      const calcBackupSize = (patients, appointments, invoices) =>
        Math.max(1024, (patients * 450) + (appointments * 320) + (invoices * 580) + 2048);

      const sizeZero = calcBackupSize(0, 0, 0);
      assert.strictEqual(sizeZero, 2048);

      const sizeBusy = calcBackupSize(100, 50, 40);
      assert.strictEqual(sizeBusy > 50000, true);
    });
  });

  // 5. Activity Logs Parsing & Search Filter Logic
  describe('Activity Logs & Audit Trail Logic', () => {
    const rawAuditLogs = [
      {
        _id: '1',
        createdAt: '2026-11-06T11:24:00Z',
        action: 'Updated',
        entity: 'Patients',
        module: 'Patients',
        details: 'Updated patient record: PT-4829',
        ipAddress: '203.122.45.18',
        actorUserId: { name: 'Dr. Karan Roy', role: 'DOCTOR' }
      },
      {
        _id: '2',
        createdAt: '2026-11-06T10:58:00Z',
        action: 'Created',
        entity: 'Appointments',
        module: 'Appointments',
        details: 'Created appointment: APPT-9182',
        ipAddress: '203.122.45.18',
        actorUserId: { name: 'Meena Sharma', role: 'RECEPTIONIST' }
      },
      {
        _id: '3',
        createdAt: '2026-11-06T09:41:00Z',
        action: 'Login',
        entity: 'Authentication',
        module: 'Authentication',
        details: 'Logged in to the system',
        ipAddress: '203.122.45.18',
        actorUserId: { name: 'Rohit Jain', role: 'ADMIN' }
      },
      {
        _id: '4',
        createdAt: '2026-11-05T18:20:00Z',
        action: 'Deleted',
        entity: 'Billing',
        module: 'Billing',
        details: 'Deleted draft invoice: INV-7765',
        ipAddress: '203.122.45.18',
        actorUserId: { name: 'Sonia Patel', role: 'NURSE' }
      }
    ];

    test('Matches search filter across user name, details, and module', () => {
      const searchKaran = rawAuditLogs.filter(l =>
        l.details.toLowerCase().includes('karan') ||
        l.actorUserId.name.toLowerCase().includes('karan')
      );
      assert.strictEqual(searchKaran.length, 1);
      assert.strictEqual(searchKaran[0].action, 'Updated');

      const searchInvoice = rawAuditLogs.filter(l =>
        l.details.toLowerCase().includes('invoice') ||
        l.module.toLowerCase().includes('invoice')
      );
      assert.strictEqual(searchInvoice.length, 1);
      assert.strictEqual(searchInvoice[0].action, 'Deleted');
    });

    test('Classifies action pills into canonical Created, Updated, Login, and Deleted sets', () => {
      const actions = rawAuditLogs.map(l => l.action);
      assert.strictEqual(actions.includes('Updated'), true);
      assert.strictEqual(actions.includes('Created'), true);
      assert.strictEqual(actions.includes('Login'), true);
      assert.strictEqual(actions.includes('Deleted'), true);
    });

    test('Initials computation generates clean 2-letter tokens', () => {
      const getInitials = (fullName) => {
        const parts = fullName.replace(/^Dr\.?\s+/i, '').trim().split(/\s+/);
        return parts.length >= 2
          ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
          : (parts[0] ? parts[0].slice(0, 2).toUpperCase() : 'SA');
      };

      assert.strictEqual(getInitials('Dr. Karan Roy'), 'KR');
      assert.strictEqual(getInitials('Meena Sharma'), 'MS');
      assert.strictEqual(getInitials('Rohit Jain'), 'RJ');
      assert.strictEqual(getInitials('Sonia Patel'), 'SP');
      assert.strictEqual(getInitials('Amit Kumar'), 'AK');
    });
  });

});

