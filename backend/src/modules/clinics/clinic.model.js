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
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
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
    ]
  },
  {
    collection: 'clinics',
    timestamps: true
  }
);

clinicSchema.index({ code: 1 }, { unique: true });
clinicSchema.index({ name: 1 });

const Clinic = mongoose.models.Clinic || mongoose.model('Clinic', clinicSchema);

module.exports = Clinic;
