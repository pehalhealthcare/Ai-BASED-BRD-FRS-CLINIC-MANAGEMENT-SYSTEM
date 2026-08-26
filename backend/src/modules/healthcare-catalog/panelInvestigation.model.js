const mongoose = require('mongoose');

const panelInvestigationSchema = new mongoose.Schema(
  {
    panelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GlobalLabTest',
      required: true
    },
    investigationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GlobalLabTest',
      required: true
    },
    displayOrder: {
      type: Number,
      required: true,
      default: 0
    },
    isRequired: {
      type: Boolean,
      required: true,
      default: true
    }
  },
  {
    timestamps: true,
    collection: 'panel_investigations'
  }
);

panelInvestigationSchema.index({ panelId: 1, investigationId: 1 }, { unique: true });
panelInvestigationSchema.index({ panelId: 1, displayOrder: 1 });

const PanelInvestigation = mongoose.models.PanelInvestigation || mongoose.model('PanelInvestigation', panelInvestigationSchema);

module.exports = PanelInvestigation;
