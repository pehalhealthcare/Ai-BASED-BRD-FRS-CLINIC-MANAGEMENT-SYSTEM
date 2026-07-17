const mongoose = require('mongoose');

const clinicMembershipSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true
    },
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true
    },
    membershipDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active'
    },
    primaryClinic: {
      type: Boolean,
      default: false
    }
  },
  {
    collection: 'clinic_memberships',
    timestamps: true
  }
);

// Ensure a patient has only one membership record per clinic
clinicMembershipSchema.index({ patientId: 1, clinicId: 1 }, { unique: true });
clinicMembershipSchema.index({ clinicId: 1 });
clinicMembershipSchema.index({ patientId: 1 });

const ClinicMembership = mongoose.models.ClinicMembership || mongoose.model('ClinicMembership', clinicMembershipSchema);

module.exports = ClinicMembership;
