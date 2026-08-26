const mongoose = require('mongoose');

const catalogueUpdateSchema = new mongoose.Schema(
  {
    version: {
      type: String,
      required: true,
      unique: true
    },
    source: {
      type: String,
      required: true
    },
    sourceVersion: {
      type: String,
      required: true
    },
    sourceYear: {
      type: Number,
      required: true
    },
    importedAt: {
      type: Date,
      default: Date.now
    },
    approvedAt: {
      type: Date,
      default: null
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    status: {
      type: String,
      enum: ['DRAFT', 'IMPORTED', 'PENDING_REVIEW', 'PARTIALLY_APPROVED', 'APPROVED', 'APPLIED', 'REJECTED', 'FAILED'],
      default: 'PENDING_REVIEW',
      required: true
    },
    changes: {
      type: mongoose.Schema.Types.Mixed,
      default: {
        new: [],
        modified: [],
        retired: []
      }
    },
    overrides: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    collection: 'catalogue_updates'
  }
);

const CatalogueUpdate = mongoose.models.CatalogueUpdate || mongoose.model('CatalogueUpdate', catalogueUpdateSchema);

module.exports = CatalogueUpdate;
