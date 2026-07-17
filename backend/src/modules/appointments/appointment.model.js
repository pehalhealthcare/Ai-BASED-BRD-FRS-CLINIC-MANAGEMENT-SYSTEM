const mongoose = require('mongoose');

const { APPOINTMENT_STATUSES } = require('../../common/constants/appointmentStatus');

const noShowRiskSchema = new mongoose.Schema(
  {
    score: {
      type: Number,
      default: 0.1
    },
    level: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low'
    },
    reasons: {
      type: [String],
      default: []
    },
    reasonCodes: {
      type: [String],
      default: []
    },
    recommendedAction: {
      type: String,
      trim: true,
      default: 'Standard reminder is sufficient.'
    },
    confidence: {
      type: Number,
      default: 0
    },
    modelName: {
      type: String,
      trim: true,
      default: 'rule_based_no_show_local'
    },
    modelVersion: {
      type: String,
      trim: true,
      default: 'local-1.0.0'
    },
    modelStatus: {
      type: String,
      enum: ['available', 'fallback', 'insufficient_data', 'unavailable', 'local'],
      default: 'local'
    },
    requiresStaffReview: {
      type: Boolean,
      default: true
    },
    auditId: {
      type: String,
      trim: true,
      default: ''
    },
    generatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const appointmentSchema = new mongoose.Schema(
  {
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    appointmentDate: {
      type: Date,
      required: true
    },
    startTime: {
      type: String,
      required: true,
      trim: true
    },
    endTime: {
      type: String,
      required: true,
      trim: true
    },
    durationMinutes: {
      type: Number,
      enum: [15, 30, 45, 60],
      default: 30
    },
    appointmentType: {
      type: String,
      enum: ['scheduled', 'walk_in', 'follow_up', 'teleconsultation', 'emergency'],
      default: 'scheduled'
    },
    status: {
      type: String,
      enum: Object.values(APPOINTMENT_STATUSES),
      default: APPOINTMENT_STATUSES.BOOKED
    },
    discountRequest: {
      type: {
        type: String,
        enum: [
          'none', 'percentage', 'fixed', 'full_waiver', 'membership',
          'senior_citizen', 'corporate', 'insurance', 'employee',
          'promotional', 'doctor_courtesy', 'admin_courtesy'
        ],
        default: 'none'
      },
      value: { type: Number, default: 0 },
      amount: { type: Number, default: 0 },
      reason: { type: String, default: '' },
      requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      requestedAt: { type: Date, default: null },
      status: {
        type: String,
        enum: ['none', 'pending', 'approved', 'rejected', 'expired'],
        default: 'none'
      },
      decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      decidedAt: { type: Date, default: null },
      rejectionReason: { type: String, default: '' },
      approvalAuthority: { 
        type: String, 
        enum: ['doctor', 'admin', 'auto', 'sequential', 'either', 'both'], 
        default: 'admin' 
      },
      approvalPolicy: { type: String, default: 'admin_only' },
      approvalSequence: [
        {
          role: { type: String },
          status: { type: String, default: 'pending' },
          decidedAt: { type: Date, default: null },
          decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
        }
      ],
      finalApprovedDiscount: { type: Number, default: 0 },
      finalPayableAmount: { type: Number, default: 0 }
    },
    slotReservedUntil: {
      type: Date,
      default: null
    },
    reasonForVisit: {
      type: String,
      trim: true,
      default: ''
    },
    symptomsSummary: {
      type: String,
      trim: true,
      default: ''
    },
    source: {
      type: String,
      enum: ['reception', 'patient_app', 'chatbot', 'admin'],
      default: 'reception'
    },
    noShowRisk: {
      type: noShowRiskSchema,
      default: () => ({})
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    cancellationReason: {
      type: String,
      trim: true,
      default: ''
    },
    rescheduledFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null
    },
    isEarlyBooking: {
      type: Boolean,
      default: false
    },
    earlyBookingReason: {
      type: String,
      enum: ['doctor_request', 'receptionist_discretion', 'none'],
      default: 'none'
    },
    appointmentCode: {
      type: String,
      trim: true,
      default: ''
    },
    queueNumber: {
      type: Number,
      default: null
    },
    tokenNumber: {
      type: Number,
      default: null
    },
    qrCode: {
      type: String,
      trim: true,
      default: ''
    },
    meta: {
      type: Object,
      default: {}
    },
    checkin_token_uuid: {
      type: String,
      trim: true,
      default: ''
    },
    checkinTokenExpiresAt: {
      type: Date,
      default: null
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'fully_waived', 'partially_waived'],
      default: 'pending'
    },
    consultationFee: {
      type: Number,
      default: 0
    },
    waiverType: {
      type: String,
      enum: ['none', 'full', 'partial'],
      default: 'none'
    },
    waiverAmount: {
      type: Number,
      default: 0
    },
    remainingAmount: {
      type: Number,
      default: 0
    },
    amountPaid: {
      type: Number,
      default: 0
    },
    paymentDate: {
      type: Date,
      default: null
    },
    paymentMethod: {
      type: String,
      default: ''
    },
    waiverReason: {
      type: String,
      default: ''
    },
    waivedByDoctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      default: null
    },
    waivedByAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    waiverLastUpdated: {
      type: Date,
      default: null
    },
    waiverAdminNotes: {
      type: String,
      default: ''
    },
    refundStatus: {
      type: String,
      enum: ['none', 'eligible', 'scheduled', 'refunded', 'failed'],
      default: 'none'
    },
    refundAmount: {
      type: Number,
      default: 0
    },
    refundProcessedAt: {
      type: Date,
      default: null
    },
    refundProcessedBy: {
      type: String,
      default: ''
    },
    refundTransactionId: {
      type: String,
      default: ''
    },
    paymentTransferStatus: {
      type: String,
      enum: ['none', 'transferred', 'received_transfer'],
      default: 'none'
    },
    transferredToAppointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null
    },
    transferredFromAppointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null
    }
  },
  {
    collection: 'appointments',
    timestamps: true
  }
);

appointmentSchema.index({ doctorId: 1, appointmentDate: 1, startTime: 1 });
appointmentSchema.index({ patientId: 1, appointmentDate: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ clinicId: 1 });

const Appointment = mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;
