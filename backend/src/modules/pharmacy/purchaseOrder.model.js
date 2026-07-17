const mongoose = require('mongoose');

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
      index: true
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      default: null,
      index: true
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
      index: true
    },
    items: [
      {
        medicineId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Medicine',
          required: true
        },
        quantity: {
          type: Number,
          required: true,
          min: 1
        },
        unitCost: {
          type: Number,
          required: true,
          min: 0
        },
        receivedQuantity: {
          type: Number,
          default: 0,
          min: 0
        },
        status: {
          type: String,
          enum: ['Pending', 'Partially Received', 'Received', 'Cancelled'],
          default: 'Pending'
        }
      }
    ],
    status: {
      type: String,
      enum: ['Draft', 'Pending Approval', 'Submitted', 'Partially Received', 'Received', 'Cancelled'],
      default: 'Draft'
    },
    remarks: {
      type: String,
      trim: true,
      default: ''
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true,
    collection: 'purchase_orders'
  }
);

const PurchaseOrder = mongoose.models.PurchaseOrder || mongoose.model('PurchaseOrder', purchaseOrderSchema);
module.exports = PurchaseOrder;
