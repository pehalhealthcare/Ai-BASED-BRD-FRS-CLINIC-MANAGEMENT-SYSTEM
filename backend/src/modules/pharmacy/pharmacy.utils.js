const toDayStart = (value = new Date()) => {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const toDayEnd = (value = new Date()) => {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  date.setUTCHours(23, 59, 59, 999);
  return date;
};

const isBatchExpired = (expiryDate, today = new Date()) => {
  if (!expiryDate) {
    return false;
  }

  const expiry = toDayEnd(expiryDate).getTime();
  const start = toDayStart(today).getTime();
  const diffDays = Math.ceil((expiry - start) / (24 * 60 * 60 * 1000));

  // Treat as expired/unavailable if actual date is in the past OR if less than 30 days (1 month) are left
  return diffDays <= 30;
};

const getNearExpiryStatus = (expiryDate, today = new Date()) => {
  if (!expiryDate || isBatchExpired(expiryDate, today)) {
    return false;
  }

  const expiry = toDayEnd(expiryDate).getTime();
  const start = toDayStart(today).getTime();
  const diffDays = Math.ceil((expiry - start) / (24 * 60 * 60 * 1000));

  return diffDays <= 30;
};

const recalculateTotalStock = (medicine, today = new Date()) =>
  (medicine?.batches || []).reduce((total, batch) => {
    const quantity = Number(batch?.quantity || 0);

    if (quantity <= 0 || isBatchExpired(batch?.expiryDate, today)) {
      return total;
    }

    return total + quantity;
  }, 0);

const getMedicineStockFlags = (medicine, today = new Date()) => {
  const totalStock = recalculateTotalStock(medicine, today);
  const batches = medicine?.batches || [];

  return {
    lowStock: totalStock <= Number(medicine?.reorderLevel || 0),
    expired: batches.some((batch) => Number(batch?.quantity || 0) > 0 && isBatchExpired(batch?.expiryDate, today)),
    nearExpiry: batches.some(
      (batch) => Number(batch?.quantity || 0) > 0 && getNearExpiryStatus(batch?.expiryDate, today)
    )
  };
};

const allocateDispensingBatches = ({ medicine, requestedQuantity, today = new Date() }) => {
  const candidates = (medicine?.batches || [])
    .map((batch, index) => ({
      batch,
      index,
      expiryTimestamp: batch?.expiryDate ? new Date(batch.expiryDate).getTime() : Number.MAX_SAFE_INTEGER
    }))
    .filter(({ batch }) => Number(batch?.quantity || 0) > 0 && !isBatchExpired(batch?.expiryDate, today))
    .sort((left, right) => left.expiryTimestamp - right.expiryTimestamp);

  const allocations = [];
  let remainingQuantity = Number(requestedQuantity || 0);

  for (const candidate of candidates) {
    if (remainingQuantity <= 0) {
      break;
    }

    const availableQuantity = Number(candidate.batch.quantity || 0);
    const allocatedQuantity = Math.min(availableQuantity, remainingQuantity);

    if (allocatedQuantity <= 0) {
      continue;
    }

    medicine.batches[candidate.index].quantity = availableQuantity - allocatedQuantity;
    allocations.push({
      batchNumber: candidate.batch.batchNumber,
      quantity: allocatedQuantity,
      unitPrice:
        typeof candidate.batch.sellingPrice === 'number'
          ? Number(candidate.batch.sellingPrice)
          : Number(medicine.unitPrice || 0)
    });
    remainingQuantity -= allocatedQuantity;
  }

  medicine.totalStock = recalculateTotalStock(medicine, today);

  return {
    allocations,
    remainingQuantity
  };
};

module.exports = {
  recalculateTotalStock,
  getMedicineStockFlags,
  allocateDispensingBatches,
  isBatchExpired,
  getNearExpiryStatus
};
