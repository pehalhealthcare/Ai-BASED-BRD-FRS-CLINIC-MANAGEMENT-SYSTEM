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
      departments: { type: [String], default: [] }
    },
    approvalStatus: {
      type: String,
      enum: ['pending_approval', 'approved', 'rejected', 'suspended'],
      default: 'pending_approval'
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
        enum: ['Trial', 'Active', 'Pending Approval', 'Expired', 'Suspended', 'Cancelled'],
        default: 'Pending Approval'
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
      paymentTimeoutMinutes: { type: Number, default: 15 }
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
