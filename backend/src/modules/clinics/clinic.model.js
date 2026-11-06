const mongoose = require('mongoose');

const clinicSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 150
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    address: {
      line1: {
        type: String,
        trim: true,
        default: ''
      },
      line2: {
        type: String,
        trim: true,
        default: ''
      },
      city: {
        type: String,
        trim: true,
        default: ''
      },
      state: {
        type: String,
        trim: true,
        default: ''
      },
      pincode: {
        type: String,
        trim: true,
        default: ''
      },
      country: {
        type: String,
        trim: true,
        default: 'India'
      },
      latitude: {
        type: Number,
        default: null
      },
      longitude: {
        type: Number,
        default: null
      }
    },
    image: {
      type: String,
      default: ''
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    email: {
      type: String,
      trim: true,
      default: ''
    },
    alternatePhone: {
      type: String,
      trim: true,
      default: ''
    },
    website: {
      type: String,
      trim: true,
      default: ''
    },
    clinicType: {
      type: String,
      trim: true,
      default: ''
    },
    timeZone: {
      type: String,
      trim: true,
      default: ''
    },
    currency: {
      type: String,
      trim: true,
      default: ''
    },
    workingDays: {
      type: String,
      trim: true,
      default: ''
    },
    workingHours: {
      type: String,
      trim: true,
      default: ''
    },
    socialLinks: {
      website: { type: String, trim: true, default: '' },
      facebook: { type: String, trim: true, default: '' },
      twitter: { type: String, trim: true, default: '' },
      instagram: { type: String, trim: true, default: '' }
    },
    communicationSettings: {
      senderId: { type: String, trim: true, default: '' },
      whatsappNumber: { type: String, trim: true, default: '' },
      enableApptConfirm: { type: Boolean, default: null },
      enableEmailNotif: { type: Boolean, default: null },
      enableSmsNotif: { type: Boolean, default: null }
    },
    preferences: {
      autoInvoice: { type: Boolean, default: null },
      inventoryAlerts: { type: Boolean, default: null },
      labApproval: { type: Boolean, default: null },
      dataEncryption: { type: Boolean, default: null },
      darkMode: { type: Boolean, default: false }
    },
    notificationSettings: {
      channels: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: true },
        whatsapp: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true }
      },
      events: {
        appointmentConfirmation: { type: Boolean, default: true },
        appointmentReminder: { type: Boolean, default: true },
        appointmentReschedule: { type: Boolean, default: true },
        appointmentCancellation: { type: Boolean, default: true },
        patientRegistration: { type: Boolean, default: true },
        invoicePaymentUpdates: { type: Boolean, default: true },
        labReportReady: { type: Boolean, default: false }
      }
    },
    integrations: {
      whatsapp: {
        enabled: { type: Boolean, default: false },
        status: { type: String, enum: ['connected', 'not_connected'], default: 'not_connected' },
        phoneNumberId: { type: String, default: '' },
        businessAccountId: { type: String, default: '' },
        apiKey: { type: String, default: '' },
        lastSync: { type: Date, default: null }
      },
      smsGateway: {
        enabled: { type: Boolean, default: false },
        status: { type: String, enum: ['connected', 'not_connected'], default: 'not_connected' },
        provider: { type: String, default: '' },
        senderId: { type: String, default: '' },
        apiKey: { type: String, default: '' },
        lastSync: { type: Date, default: null }
      },
      emailService: {
        enabled: { type: Boolean, default: false },
        status: { type: String, enum: ['connected', 'not_connected'], default: 'not_connected' },
        provider: { type: String, default: '' },
        host: { type: String, default: '' },
        port: { type: Number, default: 587 },
        user: { type: String, default: '' },
        pass: { type: String, default: '' },
        fromEmail: { type: String, default: '' },
        fromName: { type: String, default: '' },
        lastSync: { type: Date, default: null }
      },
      lis: {
        enabled: { type: Boolean, default: false },
        status: { type: String, enum: ['connected', 'not_connected'], default: 'not_connected' },
        systemName: { type: String, default: '' },
        endpointUrl: { type: String, default: '' },
        apiKey: { type: String, default: '' },
        autoSyncOrders: { type: Boolean, default: true },
        lastSync: { type: Date, default: null }
      },
      ris: {
        enabled: { type: Boolean, default: false },
        status: { type: String, enum: ['connected', 'not_connected'], default: 'not_connected' },
        systemName: { type: String, default: '' },
        endpointUrl: { type: String, default: '' },
        apiKey: { type: String, default: '' },
        autoSyncReports: { type: Boolean, default: true },
        lastSync: { type: Date, default: null }
      },
      paymentGateway: {
        enabled: { type: Boolean, default: false },
        status: { type: String, default: 'coming_soon' }
      }
    },
    securitySettings: {
      twoFactorAuth: { type: Boolean, default: false },
      loginAlerts: { type: Boolean, default: true },
      accountLockout: {
        enabled: { type: Boolean, default: true },
        maxFailedAttempts: { type: Number, default: 5 },
        lockoutDurationMinutes: { type: Number, default: 15 }
      },
      ipRestriction: {
        enabled: { type: Boolean, default: false },
        allowedIps: { type: [String], default: [] }
      },
      passwordPolicy: {
        minLength: { type: Number, default: 8 },
        requireUppercase: { type: Boolean, default: true },
        requireNumber: { type: Boolean, default: true },
        requireSpecialChar: { type: Boolean, default: true },
        expiryDays: { type: Number, default: 90 }
      },
      sessionManagement: {
        sessionTimeoutMinutes: { type: Number, default: 60 },
        maxConcurrentSessions: { type: Number, default: 3 }
      },
      trustedDevices: [
        {
          deviceId: { type: String, default: '' },
          deviceName: { type: String, default: '' },
          browser: { type: String, default: '' },
          os: { type: String, default: '' },
          ipAddress: { type: String, default: '' },
          lastActive: { type: Date, default: Date.now },
          trustedAt: { type: Date, default: Date.now }
        }
      ]
    },
    backupSettings: {
      autoBackup: { type: Boolean, default: true },
      backupFrequency: { type: String, enum: ['Daily', 'Weekly', 'Monthly'], default: 'Daily' },
      backupTime: { type: String, default: '02:00 AM' },
      lastBackupAt: { type: Date, default: null },
      lastBackupStatus: { type: String, enum: ['Successful', 'Failed', 'In Progress', 'None'], default: 'None' },
      lastBackupSizeBytes: { type: Number, default: 0 },
      lastBackupFilename: { type: String, default: '' },
      dataRetentionDays: { type: Number, default: 365 },
      backupHistory: [
        {
          timestamp: { type: Date, default: Date.now },
          status: { type: String, default: 'Successful' },
          sizeBytes: { type: Number, default: 0 },
          filename: { type: String, default: '' }
        }
      ]
    },
    parentClinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      default: null
    },
    isHeadquarters: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    },
    specializations: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Specialization'
      }
    ],
    // Add Onboarding and Registration fields
    ownerDetails: {
      name: { type: String, default: '' },
      designation: { type: String, default: '' },
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
      dob: { type: Date, default: null },
      gender: { type: String, default: '' },
      address: { type: String, default: '' },
      aadhaar: { type: String, default: '' },
      pan: { type: String, default: '' },
      profilePhoto: { type: String, default: '' }
    },
    clinicDetails: {
      registrationNumber: { type: String, default: '' },
      establishedYear: { type: String, default: '' },
      timings: [
        {
          dayRange: { type: String, default: '' },
          startTime: { type: String, default: '' },
          endTime: { type: String, default: '' }
        }
      ],
      consultationMode: { type: String, default: 'In-Clinic' },
      languagesSpoken: { type: [String], default: [] },
      shortDescription: { type: String, default: '' },
      images: { type: [String], default: [] },
      logo: { type: String, default: '' },
      description: { type: String, default: '' },
      departments: [
        {
          name: { type: String, required: true },
          active: { type: Boolean, default: true },
          departmentId: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
          createdAt: { type: Date, default: Date.now }
        }
      ]
    },
    approvalStatus: {
      type: String,
      enum: ['pending_approval', 'approved', 'rejected', 'suspended'],
      default: 'pending_approval',
      index: true
    },
    paymentStatus: {
      type: String,
      enum: ['NOT_PAID', 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'FREE_TIER'],
      default: 'NOT_PAID',
      index: true
    },
    subscription: {
      planId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SubscriptionPlan',
        default: null
      },
      billingCycle: {
        type: String,
        enum: ['monthly', 'yearly'],
        default: 'monthly'
      },
      startDate: { type: Date, default: null },
      renewalDate: { type: Date, default: null },
      expiryDate: { type: Date, default: null },
      status: {
        type: String,
        enum: ['Trial', 'Active', 'Pending Approval', 'Expired', 'Suspended', 'Cancelled', 'Free'],
        default: 'Pending Approval'
      },
      isFreeTier: {
        type: Boolean,
        default: false
      },
      freeTierAudit: {
        assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        assignedAt: { type: Date, default: null },
        durationDays: { type: Number, default: 0 },
        reason: { type: String, default: '' },
        notes: { type: String, default: '' },
        features: { type: [String], default: [] },
        limits: { type: mongoose.Schema.Types.Mixed, default: {} }
      },
      autoRecharge: {
        type: Boolean,
        default: false
      },
      paymentMethod: {
        last4: { type: String, default: '' },
        brand: { type: String, default: '' },
        token: { type: String, default: '' }
      }
    },
    trialFeatures: [
      {
        featureCode: { type: String, required: true },
        startDate: { type: Date, default: Date.now },
        expiryDate: { type: Date, required: true },
        isActive: { type: Boolean, default: true }
      }
    ],
    isOnboardingCompleted: {
      type: Boolean,
      default: false
    },
    rejectionReason: {
      type: String,
      default: ''
    },
    rejectionComments: {
      type: String,
      default: ''
    },
    incorrectFields: {
      type: [String],
      default: []
    },
    requestedDocuments: {
      type: [String],
      default: []
    },
    refundStatus: {
      type: String,
      enum: ['None', 'Pending', 'Approved', 'Rejected', 'Refunded'],
      default: 'None'
    },
    refundReason: {
      type: String,
      default: ''
    },
    refundRequestedAt: {
      type: Date,
      default: null
    },
    customLimits: {
      maxDoctors: { type: Number, default: null },
      maxStaff: { type: Number, default: null },
      maxPatients: { type: Number, default: null }
    },
    billingSettings: {
      // Procedure billing policy
      procedureBillingPolicy: {
        type: String,
        enum: ['payment_before_procedure', 'payment_after_procedure'],
        default: 'payment_before_procedure'
      },
      // Approval policy that determines who approves discount/waiver requests
      approvalPolicy: {
        type: String,
        enum: [
          'admin_only',               // Policy 1 — Clinic Admin Approval Only
          'doctor_first',             // Policy 2 — Doctor First Approval
          'doctor_first_with_limits', // Policy 2A — Doctor First with Approval Limits
          'doctor_then_admin',        // Policy 3 — Doctor Then Clinic Admin (both mandatory)
          'doctor_or_admin',          // Policy 4 — Doctor OR Clinic Admin (first wins)
          'dual_approval'             // Policy 5 — Dual Approval (both mandatory)
        ],
        default: 'admin_only'
      },
      // Max discount % a doctor can approve without escalation (used in doctor_first_with_limits)
      doctorMaxDiscountPercent: { type: Number, default: 20, min: 0, max: 100 },
      // Max discount amount (₹) a doctor can approve without escalation
      doctorMaxDiscountAmount: { type: Number, default: null },
      // Whether doctors are allowed to approve full consultation fee waivers
      allowDoctorFullWaiver: { type: Boolean, default: false },
      // When doctor limit is exceeded, automatically escalate to admin
      escalateWhenLimitExceeds: { type: Boolean, default: true },
      // Minutes a slot is held pending payment before being released
      slotReservationTimeoutMinutes: { type: Number, default: 15 },
      // Minutes an approval request is pending before being expired/rejected automatically
      approvalTimeoutMinutes: { type: Number, default: 15 },
      // Minutes a payment is pending after approval before being expired
      paymentTimeoutMinutes: { type: Number, default: 15 },
      // Missed & No-Show Policies
      allowRescheduleMissed: { type: Boolean, default: true },
      maxRescheduleWindowDays: { type: Number, default: 7 }, // 1, 3, 7, 15, 30, 0 (unlimited)
      maxAllowedReschedules: { type: Number, default: 2 }, // Number or 0 (unlimited)
      autoMarkNoShow: { type: Boolean, default: true },
      noShowGracePeriod: { type: String, default: 'Clinic Closing Time' }, // '15 Mins', '30 Mins', '1 Hour', 'Clinic Closing Time'
      refundPolicy: { type: String, enum: ['no_refund', 'partial_refund', 'full_refund'], default: 'no_refund' },
      refundPercentage: { type: Number, default: 70, min: 0, max: 100 },
      refundWalletAllowed: { type: Boolean, default: true },
      refundOriginalAllowed: { type: Boolean, default: true },
      refundManualApprovalRequired: { type: Boolean, default: true },
      enablePatientReschedule: { type: Boolean, default: true },
      enableReceptionistReschedule: { type: Boolean, default: true },
      // Patient Check-In Policy settings
      allowEarlyCheckIn: { type: Boolean, default: true },
      restrictEarlyCheckIn: { type: Boolean, default: false },
      earlyCheckInWindowMinutes: { type: Number, default: 30 }
    },
    prescriptionSettings: {
      allowManualFreeText: {
        type: Boolean,
        default: true
      }
    }
  },
  {
    collection: 'clinics',
    timestamps: true
  }
);

clinicSchema.index({ code: 1 }, { unique: true });
clinicSchema.index({ name: 1 });

const Clinic = mongoose.models.Clinic || mongoose.model('Clinic', clinicSchema);

const organizationSchema = new mongoose.Schema({
  name: { type: String },
  code: { type: String }
}, { timestamps: true, collection: 'clinics' });
mongoose.models.Organization || mongoose.model('Organization', organizationSchema);

module.exports = Clinic;
