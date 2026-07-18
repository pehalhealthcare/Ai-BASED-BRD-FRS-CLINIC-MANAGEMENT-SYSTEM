const mongoose = require('mongoose');

const timelineSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String,
      default: ''
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  { _id: false }
);

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    role: {
      type: String,
      default: ''
    },
    details: {
      type: String,
      default: ''
    }
  },
  { _id: false }
);

const procedureSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
      index: true
    },
    consultationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Consultation',
      required: true,
      index: true
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
      index: true
    },
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    code: {
      type: String,
      default: '',
      trim: true
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1
    },
    fee: {
      type: Number,
      default: 0,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    tax: {
      type: Number,
      default: 0,
      min: 0
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: [
        'Payment Pending',
        'Ready To Perform',
        'Called',
        'In Progress',
        'Completed',
        'Cancelled Before Payment',
        'Cancelled After Payment',
        'Refund Pending',
        'Refunded'
      ],
      default: 'Payment Pending',
      index: true
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      default: null,
      index: true
    },
    receiptNumber: {
      type: String,
      default: '',
      trim: true
    },
    performingStaffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    department: {
      type: String,
      default: '',
      trim: true
    },
    estimatedDuration: {
      type: String,
      default: '',
      trim: true
    },
    priority: {
      type: String,
      enum: ['routine', 'urgent', 'emergency'],
      default: 'routine'
    },
    startTime: {
      type: Date,
      default: null
    },
    endTime: {
      type: Date,
      default: null
    },
    room: {
      type: String,
      default: '',
      trim: true
    },
    equipmentUsed: {
      type: [String],
      default: []
    },
    notes: {
      type: String,
      default: ''
    },
    complications: {
      type: String,
      default: ''
    },
    cancellationReason: {
      type: String,
      default: ''
    },
    refundReason: {
      type: String,
      default: ''
    },
    refundStatus: {
      type: String,
      enum: ['None', 'Pending', 'Approved', 'Rejected', 'Refunded'],
      default: 'None'
    },
    timeline: [timelineSchema],
    auditLogs: [auditLogSchema]
  },
  {
    collection: 'procedures',
    timestamps: true
  }
);

procedureSchema.index({ clinicId: 1, status: 1 });
procedureSchema.index({ patientId: 1, createdAt: -1 });

const Procedure = mongoose.models.Procedure || mongoose.model('Procedure', procedureSchema);

module.exports = Procedure;
