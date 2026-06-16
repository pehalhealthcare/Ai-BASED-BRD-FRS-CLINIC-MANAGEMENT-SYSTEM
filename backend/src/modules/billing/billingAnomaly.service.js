const BillingAnomaly = require('./billingAnomaly.model');
const Invoice = require('./invoice.model');
const { LabOrder } = require('../labs/labOrder.model');
const PharmacySale = require('../pharmacy/pharmacySale.model');
const billingRepository = require('./billing.repository');
const aiService = require('../ai/ai.service');
const { createAuditLog } = require('../audit/audit.service');
const { AppError } = require('../../common/utils/AppError');
const { HTTP_STATUS } = require('../../common/constants/httpStatus');
const { buildPaginationMeta, getPagination } = require('../../common/utils/pagination');
const { resolveClinicContext } = require('../../common/utils/clinicContext');

const dayRange = (date = new Date()) => {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
};

const daysAgo = (days) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date;
};

const mapBillingItemType = (value) => {
  if (value === 'procedure') {
    return 'service';
  }

  return ['consultation', 'lab', 'pharmacy', 'service', 'other'].includes(value) ? value : 'other';
};

const hasItemType = (invoice, type) => (invoice.items || []).some((item) => mapBillingItemType(item.itemType) === type);

const resolveLinkedLabOrderId = (invoice) =>
  invoice.metadata?.linkedLabOrderId || invoice.metadata?.labOrderId || null;

const resolveLinkedPharmacySaleId = (invoice) =>
  invoice.metadata?.linkedPharmacySaleId || invoice.metadata?.pharmacySaleId || null;

const buildExpectedPriceMap = (invoice) => invoice.metadata?.expectedUnitPrices || {};

const calculateDiscountPercent = (invoice) => {
  const subtotal = Number(invoice.subtotal || 0);
  if (subtotal <= 0) {
    return 0;
  }

  return Number((((Number(invoice.discountAmount || 0) / subtotal) * 100) || 0).toFixed(2));
};

const roundMetric = (value) => Number(Number(value || 0).toFixed(2));

const countOverlappingServices = async ({ clinicId, patientId, currentInvoiceId, itemNames, start, end }) => {
  if (!patientId || !itemNames.length) {
    return 0;
  }

  const invoices = await Invoice.find({
    clinicId,
    patientId,
    _id: { $ne: currentInvoiceId },
    createdAt: { $gte: start, $lte: end }
  })
    .select('items')
    .lean();

  let count = 0;
  for (const invoice of invoices) {
    const overlap = (invoice.items || []).some((item) => itemNames.includes(String(item.name || '').trim().toLowerCase()));
    if (overlap) {
      count += 1;
    }
  }

  return count;
};

const buildHistoricalContext = async ({ invoice, actorUserId }) => {
  const invoiceDate = invoice.createdAt || invoice.invoiceDate || new Date();
  const { start, end } = dayRange(invoiceDate);
  const patientId = invoice.patientId?._id || invoice.patientId || null;
  const itemNames = (invoice.items || []).map((item) => String(item.name || '').trim().toLowerCase()).filter(Boolean);

  const [
    patientInvoiceCountToday,
    userCancelledInvoiceCountToday,
    patientRefundCount30d,
    duplicateInvoiceCount,
    averageInvoiceAmountRows,
    averageDiscountRows,
    sameServiceCountToday
  ] = await Promise.all([
    patientId
      ? Invoice.countDocuments({
          clinicId: invoice.clinicId,
          patientId,
          createdAt: { $gte: start, $lte: end }
        })
      : 0,
    Invoice.countDocuments({
      clinicId: invoice.clinicId,
      updatedBy: actorUserId,
      invoiceStatus: 'cancelled',
      updatedAt: { $gte: start, $lte: end }
    }),
    patientId
      ? Invoice.countDocuments({
          clinicId: invoice.clinicId,
          patientId,
          refundAmount: { $gt: 0 },
          updatedAt: { $gte: daysAgo(30) }
        })
      : 0,
    patientId
      ? Invoice.countDocuments({
          clinicId: invoice.clinicId,
          patientId,
          _id: { $ne: invoice._id },
          totalAmount: Number(invoice.totalAmount || 0),
          createdAt: { $gte: start, $lte: end }
        })
      : 0,
    patientId
      ? Invoice.aggregate([
          {
            $match: {
              clinicId: invoice.clinicId,
              patientId,
              createdAt: { $gte: daysAgo(30) }
            }
          },
          {
            $group: {
              _id: null,
              averageInvoiceAmount30d: { $avg: '$totalAmount' }
            }
          }
        ])
      : [],
    patientId
      ? Invoice.aggregate([
          {
            $match: {
              clinicId: invoice.clinicId,
              patientId,
              createdAt: { $gte: daysAgo(30) },
              subtotal: { $gt: 0 }
            }
          },
          {
            $project: {
              discountPercent: {
                $multiply: [{ $divide: ['$discountAmount', '$subtotal'] }, 100]
              }
            }
          },
          {
            $group: {
              _id: null,
              averageDiscountPercent30d: { $avg: '$discountPercent' }
            }
          }
        ])
      : [],
    countOverlappingServices({
      clinicId: invoice.clinicId,
      patientId,
      currentInvoiceId: invoice._id,
      itemNames,
      start,
      end
    })
  ]);

  return {
    patient_invoice_count_today: patientInvoiceCountToday,
    user_cancelled_invoice_count_today: userCancelledInvoiceCountToday,
    patient_refund_count_30d: patientRefundCount30d,
    duplicate_invoice_count: duplicateInvoiceCount,
    average_invoice_amount_30d: roundMetric(averageInvoiceAmountRows[0]?.averageInvoiceAmount30d || 0),
    average_discount_percent_30d: roundMetric(averageDiscountRows[0]?.averageDiscountPercent30d || 0),
    same_service_count_today: sameServiceCountToday
  };
};

const buildBillingAnomalyPayload = async ({ invoice, actorUserId }) => {
  const linkedLabOrderId = resolveLinkedLabOrderId(invoice);
  const linkedPharmacySaleId = resolveLinkedPharmacySaleId(invoice);
  const [labOrderExists, pharmacySaleExists, historicalContext] = await Promise.all([
    linkedLabOrderId ? LabOrder.exists({ _id: linkedLabOrderId, clinicId: invoice.clinicId }) : null,
    linkedPharmacySaleId ? PharmacySale.exists({ _id: linkedPharmacySaleId, clinicId: invoice.clinicId }) : null,
    buildHistoricalContext({ invoice, actorUserId })
  ]);
  const expectedPriceMap = buildExpectedPriceMap(invoice);

  return {
    invoice_id: String(invoice._id),
    patient_id: invoice.patientId?._id?.toString?.() || invoice.patientId?.toString?.() || null,
    user_id: actorUserId ? String(actorUserId) : null,
    invoice_status: invoice.invoiceStatus,
    payment_status: invoice.paymentStatus,
    total_amount: Number(invoice.totalAmount || 0),
    subtotal: Number(invoice.subtotal || 0),
    discount_amount: Number(invoice.discountAmount || 0),
    discount_percent: calculateDiscountPercent(invoice),
    tax_amount: Number(invoice.gstAmount || 0),
    paid_amount: Number(invoice.paidAmount || 0),
    refund_amount: Number(invoice.refundAmount || 0),
    payment_mode: invoice.payments?.length ? invoice.payments[invoice.payments.length - 1].paymentMode : null,
    created_at: invoice.createdAt || invoice.invoiceDate || new Date(),
    cancelled_at: invoice.cancelledAt || null,
    items: (invoice.items || []).map((item) => ({
      item_type: mapBillingItemType(item.itemType),
      item_id: null,
      name: item.name,
      quantity: Number(item.quantity || 0),
      unit_price: Number(item.unitPrice || 0),
      expected_unit_price:
        typeof expectedPriceMap[item.name] === 'number' ? Number(expectedPriceMap[item.name]) : undefined,
      total_price: Number(item.amount || 0)
    })),
    linked_consultation_id: invoice.consultationId?._id?.toString?.() || invoice.consultationId?.toString?.() || null,
    linked_lab_order_id: linkedLabOrderId ? String(linkedLabOrderId) : null,
    linked_pharmacy_sale_id: linkedPharmacySaleId ? String(linkedPharmacySaleId) : null,
    medicine_stock_deducted:
      typeof invoice.metadata?.medicineStockDeducted === 'boolean'
        ? invoice.metadata.medicineStockDeducted
        : hasItemType(invoice, 'pharmacy')
          ? Boolean(pharmacySaleExists)
          : true,
    lab_order_exists:
      typeof invoice.metadata?.labOrderExists === 'boolean'
        ? invoice.metadata.labOrderExists
        : hasItemType(invoice, 'lab')
          ? Boolean(labOrderExists || linkedLabOrderId)
          : true,
    manual_price_override: Boolean(invoice.metadata?.manualPriceOverride),
    historical_context: historicalContext
  };
};

const persistBillingAnomaly = async ({ clinicId, invoice, aiResponse }) =>
  BillingAnomaly.findOneAndUpdate(
    {
      clinicId,
      invoiceId: invoice._id
    },
    {
      clinicId,
      invoiceId: invoice._id,
      patientId: invoice.patientId?._id || invoice.patientId || null,
      anomalyScore: Number(aiResponse?.output?.anomaly_score || 0),
      riskLevel: aiResponse?.risk_level || 'low',
      triggeredRules: aiResponse?.output?.triggered_rules || [],
      requiresAdminReview: aiResponse?.requires_admin_review !== false,
      modelName: aiResponse?.model_name || '',
      modelVersion: aiResponse?.model_version || '',
      modelStatus: aiResponse?.model_status || 'fallback',
      explanation: aiResponse?.explanation || '',
      auditId: aiResponse?.audit_id || '',
      reviewStatus: 'pending',
      reviewedBy: null,
      reviewedAt: null,
      reviewNotes: ''
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  );

const buildFallbackAnomaly = () => ({
  output: {
    anomaly_score: 0.2,
    triggered_rules: []
  },
  confidence: 0,
  explanation:
    'Billing anomaly analysis was unavailable from the AI service, so no additional ML or rule-based fraud signal could be retrieved for this invoice refresh.',
  risk_level: 'low',
  requires_admin_review: true,
  model_name: 'billing_rule_fallback_unavailable',
  model_version: 'v1',
  model_status: 'unavailable',
  audit_id: ''
});

const syncBillingAnomalyForInvoice = async ({ clinicId, invoiceId, requesterId }) => {
  const invoice = await billingRepository.findInvoiceById({
    id: invoiceId,
    clinicId,
    populateDetails: true
  });

  if (!invoice) {
    return null;
  }

  const payload = await buildBillingAnomalyPayload({ invoice, actorUserId: requesterId });
  let aiResponse;
  try {
    const response = await aiService.getBillingAnomaly(payload);
    aiResponse = response?.data || response;
  } catch (_error) {
    aiResponse = buildFallbackAnomaly();
  }

  const triggeredRules = aiResponse?.output?.triggered_rules || [];
  const anomalyScore = Number(aiResponse?.output?.anomaly_score || 0);
  const shouldPersist = triggeredRules.length > 0 || aiResponse?.risk_level !== 'low' || anomalyScore >= 0.35;

  if (!shouldPersist) {
    await BillingAnomaly.deleteOne({ clinicId, invoiceId: invoice._id });
    return null;
  }

  return persistBillingAnomaly({ clinicId, invoice, aiResponse });
};

const listBillingAnomalies = async ({ requester, query = {}, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId: requestedClinicId || query.clinicId
  });
  const { page, limit } = getPagination(query);
  const filter = { clinicId };

  if (query.riskLevel) {
    filter.riskLevel = query.riskLevel;
  }
  if (query.reviewStatus) {
    filter.reviewStatus = query.reviewStatus;
  }
  if (query.modelStatus) {
    filter.modelStatus = query.modelStatus;
  }

  const [anomalies, total, totalFlagged, highRiskCount, mediumRiskCount, pendingReviewCount] = await Promise.all([
    BillingAnomaly.find(filter)
      .populate('invoiceId', 'invoiceNumber totalAmount invoiceStatus paymentStatus createdAt')
      .populate('patientId', 'patientId firstName lastName fullName')
      .populate('reviewedBy', 'name email role')
      .sort({ createdAt: -1, updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    BillingAnomaly.countDocuments(filter),
    BillingAnomaly.countDocuments({ clinicId }),
    BillingAnomaly.countDocuments({ clinicId, riskLevel: { $in: ['high', 'critical'] } }),
    BillingAnomaly.countDocuments({ clinicId, riskLevel: 'medium' }),
    BillingAnomaly.countDocuments({ clinicId, reviewStatus: 'pending' })
  ]);

  return {
    anomalies,
    summary: {
      totalFlagged,
      highRiskCount,
      mediumRiskCount,
      pendingReviewCount
    },
    pagination: buildPaginationMeta({ page, limit, total })
  };
};

const getBillingAnomalyById = async ({ requester, anomalyId, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId
  });
  const anomaly = await BillingAnomaly.findOne({ _id: anomalyId, clinicId })
    .populate('invoiceId')
    .populate('patientId', 'patientId firstName lastName fullName phone')
    .populate('reviewedBy', 'name email role')
    .lean();

  if (!anomaly) {
    throw new AppError('Billing anomaly record not found.', HTTP_STATUS.NOT_FOUND);
  }

  return anomaly;
};

const reviewBillingAnomaly = async ({
  requester,
  anomalyId,
  payload,
  requestedClinicId = null,
  req
}) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId
  });

  const anomaly = await BillingAnomaly.findOneAndUpdate(
    { _id: anomalyId, clinicId },
    {
      reviewStatus: payload.reviewStatus,
      reviewNotes: payload.reviewNotes?.trim?.() || '',
      reviewedBy: requester._id,
      reviewedAt: new Date()
    },
    {
      new: true,
      runValidators: true
    }
  )
    .populate('invoiceId', 'invoiceNumber totalAmount')
    .populate('patientId', 'patientId fullName')
    .populate('reviewedBy', 'name email role');

  if (!anomaly) {
    throw new AppError('Billing anomaly record not found.', HTTP_STATUS.NOT_FOUND);
  }

  await createAuditLog({
    actorUserId: requester._id,
    action: 'BILLING_ANOMALY_REVIEW_UPDATED',
    entity: 'BillingAnomaly',
    entityId: anomaly._id,
    metadata: {
      clinicId: String(clinicId),
      invoiceId: String(anomaly.invoiceId?._id || anomaly.invoiceId),
      reviewStatus: anomaly.reviewStatus
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  return anomaly;
};

module.exports = {
  syncBillingAnomalyForInvoice,
  listBillingAnomalies,
  getBillingAnomalyById,
  reviewBillingAnomaly
};
