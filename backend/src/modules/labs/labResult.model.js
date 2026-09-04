const mongoose = require("mongoose");

const editHistorySchema = new mongoose.Schema(
  {
    previousValue: { type: String, default: "" },
    previousFlag: { type: String, default: "" },
    newValue: { type: String, default: "" },
    newFlag: { type: String, default: "" },
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    editedAt: { type: Date, default: Date.now },
    reason: { type: String, trim: true, default: "" }
  },
  { _id: true }
);

const referenceRangeSnapshotSchema = new mongoose.Schema(
  {
    min: { type: Number, default: null },
    max: { type: Number, default: null },
    text: { type: String, trim: true, default: "" },
    displayLabel: { type: String, trim: true, default: "" }
  },
  { _id: false }
);

const labResultSchema = new mongoose.Schema(
  {
    clinicId: { type: mongoose.Schema.Types.ObjectId, ref: "Clinic", required: true, index: true },
    labOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "LabOrder", required: true, index: true },
    labReportId: { type: mongoose.Schema.Types.ObjectId, ref: "LabReport", default: null },
    labTestId: { type: mongoose.Schema.Types.ObjectId, ref: "LabTest", default: null },
    orderTestItemId: { type: mongoose.Schema.Types.ObjectId, default: null },
    testCode: { type: String, trim: true, default: "" },
    testName: { type: String, trim: true, default: "" },
    parameterId: { type: mongoose.Schema.Types.ObjectId, default: null },
    parameterName: { type: String, trim: true, required: true },
    parameterShortName: { type: String, trim: true, default: "" },
    parameterCode: { type: String, trim: true, default: "" },
    resultType: {
      type: String,
      enum: ["NUMERIC", "TEXT", "QUALITATIVE", "BOOLEAN", "ENUM", "PERCENTAGE", "RATIO"],
      default: "NUMERIC"
    },
    value: { type: String, trim: true, default: "" },
    numericValue: { type: Number, default: null },
    unit: { type: String, trim: true, default: "" },
    referenceRange: { type: referenceRangeSnapshotSchema, default: () => ({}) },
    criticalLow: { type: Number, default: null },
    criticalHigh: { type: Number, default: null },
    allowedValues: [
      {
        value: { type: String, required: true },
        displayName: { type: String, default: "" },
        isAbnormal: { type: Boolean, default: false },
        isCritical: { type: Boolean, default: false }
      }
    ],
    autoFlag: {
      type: String,
      enum: ["normal", "low", "high", "critical_low", "critical_high", "abnormal", "not_evaluated"],
      default: "not_evaluated"
    },
    manualFlag: {
      type: String,
      enum: ["normal", "low", "high", "critical_low", "critical_high", "abnormal", "not_applicable", ""],
      default: ""
    },
    isFlagManuallyOverridden: { type: Boolean, default: false },
    overriddenBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    overriddenAt: { type: Date, default: null },
    overrideReason: { type: String, trim: true, default: "" },
    effectiveFlag: {
      type: String,
      enum: ["normal", "low", "high", "critical_low", "critical_high", "abnormal", "not_applicable", "not_evaluated", ""],
      default: "not_evaluated"
    },
    comment: { type: String, trim: true, default: "" },
    isRequired: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
    decimalPrecision: { type: Number, default: 1 },
    method: { type: String, trim: true, default: "" },
    status: { type: String, enum: ["pending", "entered", "not_applicable"], default: "pending" },
    enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    enteredAt: { type: Date, default: null },
    editHistory: { type: [editHistorySchema], default: [] },
    isLocked: { type: Boolean, default: false },
    lockedAt: { type: Date, default: null },
    lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    isAmended: { type: Boolean, default: false },
    amendedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    amendedAt: { type: Date, default: null },
    amendReason: { type: String, trim: true, default: "" }
  },
  { collection: "lab_results", timestamps: true }
);

labResultSchema.index({ clinicId: 1, labOrderId: 1, testCode: 1, displayOrder: 1 });
labResultSchema.index({ clinicId: 1, labOrderId: 1, status: 1 });
labResultSchema.index({ clinicId: 1, labOrderId: 1, effectiveFlag: 1 });
labResultSchema.index({ labOrderId: 1, parameterName: 1, testCode: 1 }, { unique: true });

const LabResult = mongoose.models.LabResult || mongoose.model("LabResult", labResultSchema);
module.exports = LabResult;
