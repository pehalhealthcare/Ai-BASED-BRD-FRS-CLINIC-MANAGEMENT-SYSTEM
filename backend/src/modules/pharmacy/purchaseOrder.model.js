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
      enum: ['Draft', 'Pending Approval', 'Submitted', 'Supplier Accepted', 'Partially Received', 'Fully Received', 'Completed', 'Cancelled'],
      default: 'Draft'
    },
    expectedDeliveryDate: {
      type: Date,
      default: null
    },
    paymentTerms: {
      type: String,
      default: 'Net 30'
    },
    billingAddress: {
      type: String,
      default: ''
    },
    deliveryAddress: {
      type: String,
      default: ''
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    remarks: {
      type: String,
      trim: true,
      default: ''
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Partially Paid', 'Fully Paid'],
      default: 'Pending'
    },
    totalPaid: {
      type: Number,
      default: 0
    },
    payments: [
      {
        paymentDate: { type: Date, default: Date.now },
        paymentMethod: { type: String, default: 'Cash' },
        transactionReference: { type: String, default: '' },
        amountPaid: { type: Number, required: true },
        remainingBalance: { type: Number, required: true }
      }
    ],
    timeline: [
      {
        status: { type: String, required: true },
        notes: { type: String, default: '' },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        updatedAt: { type: Date, default: Date.now }
      }
    ],
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
