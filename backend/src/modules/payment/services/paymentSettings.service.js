const mongoose = require('mongoose');
const QRCode = require('qrcode');
const { encrypt, decrypt } = require('../../../common/utils/encryption');
const { uploadBase64, downloadAsBase64 } = require('../../../common/utils/gridFsStorage.service');
const PaymentSettings = require('../models/paymentSettings.model');
const AuditLog = require('../../audit/audit.model');
const { AppError } = require('../../../common/utils/AppError');
const { HTTP_STATUS } = require('../../../common/constants/httpStatus');

const INITIAL_DEFAULTS = {
  accountName: 'PehalHealthcare Technologies Private Limited',
  bankName: 'Kotak Mahindra Bank',
  accountNumber: '8512060314',
  ifscCode: 'KKBK0000181',
  branch: 'Sector-18, Noida',
  upiId: '8130916134@kotak',
  supportEmail: 'support@pehalhealthcare.com',
  supportPhone: '+91 81309 16134'
};

/**
 * Validates IFSC Code format: 4 letters, 0, then 6 alphanumeric characters.
 */
const validateIfsc = (ifsc) => {
  const clean = String(ifsc || '').trim().toUpperCase();
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(clean);
};

/**
 * Validates UPI ID format (e.g. name@bank or 8130916134@kotak).
 */
const validateUpi = (upi) => {
  const clean = String(upi || '').trim().toLowerCase();
  return /^[\w.\-_]{2,64}@[\w.\-_]{2,32}$/.test(clean);
};

/**
 * Validates Account Number (numeric string, 8 to 24 characters).
 */
const validateAccountNumber = (accNo) => {
  const clean = String(accNo || '').trim();
  return /^\d{8,24}$/.test(clean);
};

/**
 * Generates a dynamic amount-encoded UPI payment QR code as a base64 Data URI string.
 * When scanned in GPay / PhonePe / Paytm / BHIM, the amount is pre-filled automatically!
 */
const generateDynamicUpiQr = async ({ amount, clinicCode = '', planName = '', upiId, payeeName }) => {
  try {
    let resolvedUpi = upiId;
    let resolvedPayee = payeeName;

    if (!resolvedUpi || !resolvedPayee) {
      const active = await getOrSeedActiveSettings();
      const decrypted = await getDecryptedSettings(active);
      resolvedUpi = resolvedUpi || decrypted.upiId;
      resolvedPayee = resolvedPayee || decrypted.accountName;
    }

    const numAmount = Number(amount || 0);
    const amountStr = numAmount > 0 ? numAmount.toFixed(2) : '';
    const note = `AICMS - ${planName || 'Clinic Subscription'} ${clinicCode ? `(${clinicCode})` : ''}`.trim();

    let upiPayload = `upi://pay?pa=${encodeURIComponent(resolvedUpi)}&pn=${encodeURIComponent(resolvedPayee)}&cu=INR`;
    if (amountStr) {
      upiPayload += `&am=${encodeURIComponent(amountStr)}`;
    }
    if (note) {
      upiPayload += `&tn=${encodeURIComponent(note)}`;
    }

    const qrDataUri = await QRCode.toDataURL(upiPayload, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 400,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    return {
      qrDataUri,
      upiPayload,
      amount: numAmount,
      upiId: resolvedUpi,
      payeeName: resolvedPayee
    };
  } catch (err) {
    console.warn('Failed to generate dynamic UPI QR code Data URI:', err.message);
    return null;
  }
};

/**
 * Generates a default UPI payment QR code as a base64 Data URI string.
 */
const generateDefaultQrDataUri = async (upiId, payeeName) => {
  try {
    const upiPayload = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&cu=INR`;
    const qrDataUri = await QRCode.toDataURL(upiPayload, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 400,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
    return qrDataUri;
  } catch (err) {
    console.warn('Failed to generate default QR code Data URI:', err.message);
    return null;
  }
};

/**
 * Ensures that an active PaymentSettings document exists in the database.
 * If none exists, creates the initial version seeded with default configuration.
 */
const getOrSeedActiveSettings = async () => {
  let active = await PaymentSettings.findOne({ isActive: true }).sort({ version: -1 });

  if (!active) {
    // Generate initial QR code Data URI for seed
    const defaultQrDataUri = await generateDefaultQrDataUri(INITIAL_DEFAULTS.upiId, INITIAL_DEFAULTS.accountName);
    let qrRef = null;

    if (defaultQrDataUri) {
      try {
        qrRef = await uploadBase64(defaultQrDataUri, 'pehal_qr.png');
      } catch (uploadErr) {
        console.warn('GridFS seed upload fallback:', uploadErr.message);
        qrRef = defaultQrDataUri;
      }
    }

    active = await PaymentSettings.create({
      accountNameEncrypted: encrypt(INITIAL_DEFAULTS.accountName),
      bankNameEncrypted: encrypt(INITIAL_DEFAULTS.bankName),
      accountNumberEncrypted: encrypt(INITIAL_DEFAULTS.accountNumber),
      ifscCodeEncrypted: encrypt(INITIAL_DEFAULTS.ifscCode),
      branchEncrypted: encrypt(INITIAL_DEFAULTS.branch),
      upiIdEncrypted: encrypt(INITIAL_DEFAULTS.upiId),
      supportEmailEncrypted: encrypt(INITIAL_DEFAULTS.supportEmail),
      supportPhoneEncrypted: encrypt(INITIAL_DEFAULTS.supportPhone),
      accountNumberLast4: INITIAL_DEFAULTS.accountNumber.slice(-4),
      qrCodeReference: qrRef,
      qrCodeMetadata: {
        fileName: 'pehal_qr.png',
        fileSize: 124 * 1024,
        mimeType: 'image/png',
        uploadedAt: new Date(),
        detectedUpiId: INITIAL_DEFAULTS.upiId
      },
      version: 1,
      isActive: true,
      changeSummary: 'Initial System Configuration',
      changedFields: ['accountName', 'bankName', 'accountNumber', 'ifscCode', 'branch', 'upiId', 'qrCode', 'supportEmail', 'supportPhone']
    });

    // Create initial audit log
    try {
      await AuditLog.create({
        action: 'PAYMENT_SETTINGS_SEEDED',
        entity: 'PaymentSettings',
        entityId: active._id,
        metadata: {
          version: 1,
          summary: 'Initial Payment Configuration Seeded'
        },
        status: 'SUCCESS'
      });
    } catch (_auditErr) {
      // Non-blocking
    }
  }

  return active;
};

/**
 * Decrypts a PaymentSettings document and prepares it for Super Admin display.
 */
const getDecryptedSettings = async (doc) => {
  if (!doc) return null;

  let qrCodeUrl = '';
  if (doc.qrCodeReference) {
    if (doc.qrCodeReference.startsWith('gridfs:')) {
      try {
        qrCodeUrl = await downloadAsBase64(doc.qrCodeReference);
      } catch (err) {
        console.warn('Failed to resolve GridFS QR code:', err.message);
      }
    } else {
      qrCodeUrl = doc.qrCodeReference;
    }
  }

  return {
    _id: doc._id,
    accountName: decrypt(doc.accountNameEncrypted),
    bankName: decrypt(doc.bankNameEncrypted),
    accountNumber: decrypt(doc.accountNumberEncrypted),
    accountNumberLast4: doc.accountNumberLast4 || (doc.accountNumberEncrypted ? decrypt(doc.accountNumberEncrypted).slice(-4) : '****'),
    ifscCode: decrypt(doc.ifscCodeEncrypted),
    branch: decrypt(doc.branchEncrypted),
    upiId: decrypt(doc.upiIdEncrypted),
    supportEmail: doc.supportEmailEncrypted ? decrypt(doc.supportEmailEncrypted) : INITIAL_DEFAULTS.supportEmail,
    supportPhone: doc.supportPhoneEncrypted ? decrypt(doc.supportPhoneEncrypted) : INITIAL_DEFAULTS.supportPhone,
    qrCodeUrl: qrCodeUrl || '',
    qrCodeMetadata: doc.qrCodeMetadata || {
      fileName: 'pehal_qr.png',
      fileSize: 124 * 1024,
      uploadedAt: doc.updatedAt || doc.createdAt,
      detectedUpiId: decrypt(doc.upiIdEncrypted)
    },
    version: doc.version,
    isActive: doc.isActive,
    updatedAt: doc.updatedAt,
    createdAt: doc.createdAt
  };
};

/**
 * Super Admin updates bank, UPI, and support contact details.
 * Validates, encrypts, creates a new version, deactivates old version, and logs audit event.
 */
const updatePaymentSettings = async ({
  accountName,
  bankName,
  accountNumber,
  ifscCode,
  branch,
  upiId,
  supportEmail,
  supportPhone,
  user,
  ipAddress,
  userAgent
}) => {
  // 1. Server-side validation
  if (!accountName || typeof accountName !== 'string' || accountName.trim().length < 2) {
    throw new AppError('Account Name is required and must be at least 2 characters.', HTTP_STATUS.BAD_REQUEST);
  }
  if (!bankName || typeof bankName !== 'string' || bankName.trim().length < 2) {
    throw new AppError('Bank Name is required and must be at least 2 characters.', HTTP_STATUS.BAD_REQUEST);
  }
  const cleanAccNo = String(accountNumber || '').trim();
  if (!validateAccountNumber(cleanAccNo)) {
    throw new AppError('Account Number must be between 8 and 24 digits.', HTTP_STATUS.BAD_REQUEST);
  }
  const cleanIfsc = String(ifscCode || '').trim().toUpperCase();
  if (!validateIfsc(cleanIfsc)) {
    throw new AppError('Invalid IFSC Code format. Expected format: ABCD0123456 (4 letters, 0, 6 alphanumeric).', HTTP_STATUS.BAD_REQUEST);
  }
  if (!branch || typeof branch !== 'string' || branch.trim().length < 2) {
    throw new AppError('Branch is required.', HTTP_STATUS.BAD_REQUEST);
  }
  const cleanUpi = String(upiId || '').trim().toLowerCase();
  if (!validateUpi(cleanUpi)) {
    throw new AppError('Invalid UPI ID format. Expected format: username@bank or phone@bank.', HTTP_STATUS.BAD_REQUEST);
  }

  const cleanSupportEmail = String(supportEmail || INITIAL_DEFAULTS.supportEmail).trim().toLowerCase();
  const cleanSupportPhone = String(supportPhone || INITIAL_DEFAULTS.supportPhone).trim();

  // 2. Fetch current active settings
  const currentActive = await getOrSeedActiveSettings();
  const currentDecrypted = await getDecryptedSettings(currentActive);

  // 3. Track changed fields for sanitized audit logging
  const changedFields = [];
  if (currentDecrypted.accountName !== accountName.trim()) changedFields.push('accountName');
  if (currentDecrypted.bankName !== bankName.trim()) changedFields.push('bankName');
  if (currentDecrypted.accountNumber !== cleanAccNo) changedFields.push('accountNumber');
  if (currentDecrypted.ifscCode !== cleanIfsc) changedFields.push('ifscCode');
  if (currentDecrypted.branch !== branch.trim()) changedFields.push('branch');
  if (currentDecrypted.upiId !== cleanUpi) changedFields.push('upiId');
  if (currentDecrypted.supportEmail !== cleanSupportEmail) changedFields.push('supportEmail');
  if (currentDecrypted.supportPhone !== cleanSupportPhone) changedFields.push('supportPhone');

  let changeSummary = 'Payment Details Updated';
  if (changedFields.length === 1 && changedFields[0] === 'upiId') {
    changeSummary = 'UPI ID Updated';
  } else if (changedFields.includes('accountNumber') || changedFields.includes('bankName') || changedFields.includes('ifscCode')) {
    changeSummary = 'Bank Details Updated';
  } else if (changedFields.includes('supportEmail') || changedFields.includes('supportPhone')) {
    changeSummary = 'Support Contact Details Updated';
  }

  const newVersion = (currentActive.version || 1) + 1;

  // 4. Mark prior active configuration inactive
  await PaymentSettings.updateMany({ isActive: true }, { $set: { isActive: false } });

  // 5. Create new version with AES-256-GCM encrypted values
  const newSettings = await PaymentSettings.create({
    accountNameEncrypted: encrypt(accountName.trim()),
    bankNameEncrypted: encrypt(bankName.trim()),
    accountNumberEncrypted: encrypt(cleanAccNo),
    ifscCodeEncrypted: encrypt(cleanIfsc),
    branchEncrypted: encrypt(branch.trim()),
    upiIdEncrypted: encrypt(cleanUpi),
    supportEmailEncrypted: encrypt(cleanSupportEmail),
    supportPhoneEncrypted: encrypt(cleanSupportPhone),
    accountNumberLast4: cleanAccNo.slice(-4),
    qrCodeReference: currentActive.qrCodeReference,
    qrCodeMetadata: currentActive.qrCodeMetadata,
    version: newVersion,
    isActive: true,
    changeSummary,
    changedFields,
    createdBy: currentActive.createdBy || user?._id,
    updatedBy: user?._id
  });

  // 6. Write sanitized audit log (NO PLAINTEXT SECRETS)
  try {
    await AuditLog.create({
      actorUserId: user?._id || null,
      action: 'PAYMENT_SETTINGS_UPDATE',
      entity: 'PaymentSettings',
      entityId: newSettings._id,
      metadata: {
        version: newVersion,
        changedFields,
        changeSummary,
        actorName: user?.name || 'Super Admin',
        actorRole: user?.role || 'SUPER_ADMIN'
      },
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      status: 'SUCCESS'
    });
  } catch (auditErr) {
    console.warn('Failed to record payment settings audit log:', auditErr.message);
  }

  return getDecryptedSettings(newSettings);
};

/**
 * Super Admin uploads or replaces the Payment QR Code.
 */
const uploadQrCode = async ({
  base64Data,
  fileName = 'payment_qr.png',
  fileSize,
  detectedUpiId,
  user,
  ipAddress,
  userAgent
}) => {
  if (!base64Data || typeof base64Data !== 'string') {
    throw new AppError('QR Code image data is required.', HTTP_STATUS.BAD_REQUEST);
  }

  // Validate format and size
  const matches = base64Data.match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/);
  if (!matches) {
    throw new AppError('Invalid image format. Supported formats: PNG, JPG, JPEG, WEBP.', HTTP_STATUS.BAD_REQUEST);
  }

  const mimeType = matches[1];
  const buffer = Buffer.from(matches[3], 'base64');
  const actualSize = buffer.length;

  if (actualSize > 2 * 1024 * 1024) {
    throw new AppError('QR image file size exceeds the 2 MB limit.', HTTP_STATUS.BAD_REQUEST);
  }

  // Upload to GridFS
  const qrRef = await uploadBase64(base64Data, fileName || 'payment_qr.png');

  // Fetch current active settings
  const currentActive = await getOrSeedActiveSettings();
  const newVersion = (currentActive.version || 1) + 1;

  // Mark previous versions inactive
  await PaymentSettings.updateMany({ isActive: true }, { $set: { isActive: false } });

  // Create new active version with the updated QR code reference
  const newSettings = await PaymentSettings.create({
    accountNameEncrypted: currentActive.accountNameEncrypted,
    bankNameEncrypted: currentActive.bankNameEncrypted,
    accountNumberEncrypted: currentActive.accountNumberEncrypted,
    ifscCodeEncrypted: currentActive.ifscCodeEncrypted,
    branchEncrypted: currentActive.branchEncrypted,
    upiIdEncrypted: currentActive.upiIdEncrypted,
    supportEmailEncrypted: currentActive.supportEmailEncrypted,
    supportPhoneEncrypted: currentActive.supportPhoneEncrypted,
    accountNumberLast4: currentActive.accountNumberLast4,
    qrCodeReference: qrRef,
    qrCodeMetadata: {
      fileName: fileName || 'payment_qr.png',
      fileSize: actualSize,
      mimeType,
      uploadedAt: new Date(),
      detectedUpiId: detectedUpiId || null
    },
    version: newVersion,
    isActive: true,
    changeSummary: 'QR Code Replaced',
    changedFields: ['qrCode'],
    createdBy: currentActive.createdBy || user?._id,
    updatedBy: user?._id
  });

  // Write audit log
  try {
    await AuditLog.create({
      actorUserId: user?._id || null,
      action: 'PAYMENT_QR_UPLOAD',
      entity: 'PaymentSettings',
      entityId: newSettings._id,
      metadata: {
        version: newVersion,
        fileName: fileName || 'payment_qr.png',
        fileSize: actualSize,
        detectedUpiId: detectedUpiId || null,
        changeSummary: 'QR Code Replaced',
        actorName: user?.name || 'Super Admin',
        actorRole: user?.role || 'SUPER_ADMIN'
      },
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      status: 'SUCCESS'
    });
  } catch (auditErr) {
    console.warn('Failed to record QR upload audit log:', auditErr.message);
  }

  return getDecryptedSettings(newSettings);
};

/**
 * Super Admin removes the Payment QR Code.
 */
const removeQrCode = async ({ user, ipAddress, userAgent }) => {
  const currentActive = await getOrSeedActiveSettings();
  const newVersion = (currentActive.version || 1) + 1;

  await PaymentSettings.updateMany({ isActive: true }, { $set: { isActive: false } });

  const newSettings = await PaymentSettings.create({
    accountNameEncrypted: currentActive.accountNameEncrypted,
    bankNameEncrypted: currentActive.bankNameEncrypted,
    accountNumberEncrypted: currentActive.accountNumberEncrypted,
    ifscCodeEncrypted: currentActive.ifscCodeEncrypted,
    branchEncrypted: currentActive.branchEncrypted,
    upiIdEncrypted: currentActive.upiIdEncrypted,
    supportEmailEncrypted: currentActive.supportEmailEncrypted,
    supportPhoneEncrypted: currentActive.supportPhoneEncrypted,
    accountNumberLast4: currentActive.accountNumberLast4,
    qrCodeReference: null,
    qrCodeMetadata: null,
    version: newVersion,
    isActive: true,
    changeSummary: 'QR Code Removed',
    changedFields: ['qrCode'],
    createdBy: currentActive.createdBy || user?._id,
    updatedBy: user?._id
  });

  try {
    await AuditLog.create({
      actorUserId: user?._id || null,
      action: 'PAYMENT_QR_REMOVED',
      entity: 'PaymentSettings',
      entityId: newSettings._id,
      metadata: {
        version: newVersion,
        changeSummary: 'QR Code Removed',
        actorName: user?.name || 'Super Admin',
        actorRole: user?.role || 'SUPER_ADMIN'
      },
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      status: 'SUCCESS'
    });
  } catch (auditErr) {
    console.warn('Failed to record QR removal audit log:', auditErr.message);
  }

  return getDecryptedSettings(newSettings);
};

/**
 * Clinic-facing sanitized endpoint.
 * Returns ONLY the active payment details needed to complete payments.
 * NEVER returns internal database IDs, audit logs, or encryption details.
 */
const getSanitizedActiveDetails = async (options = {}) => {
  const active = await getOrSeedActiveSettings();
  const decrypted = await getDecryptedSettings(active);

  let dynamicQr = null;
  if (options.amount && Number(options.amount) > 0) {
    dynamicQr = await generateDynamicUpiQr({
      amount: Number(options.amount),
      clinicCode: options.clinicCode || '',
      planName: options.planName || '',
      upiId: decrypted.upiId,
      payeeName: decrypted.accountName
    });
  }

  return {
    accountName: decrypted.accountName,
    bankName: decrypted.bankName,
    accountNumber: decrypted.accountNumber,
    accountNumberLast4: decrypted.accountNumberLast4,
    ifscCode: decrypted.ifscCode,
    branch: decrypted.branch,
    upiId: decrypted.upiId,
    supportEmail: decrypted.supportEmail,
    supportPhone: decrypted.supportPhone,
    qrCodeUrl: decrypted.qrCodeUrl || '',
    dynamicQr: dynamicQr ? dynamicQr.qrDataUri : null,
    upiPayload: dynamicQr ? dynamicQr.upiPayload : `upi://pay?pa=${encodeURIComponent(decrypted.upiId)}&pn=${encodeURIComponent(decrypted.accountName)}&cu=INR`,
    qrCodeMetadata: decrypted.qrCodeMetadata ? {
      fileName: decrypted.qrCodeMetadata.fileName,
      fileSize: decrypted.qrCodeMetadata.fileSize,
      detectedUpiId: decrypted.qrCodeMetadata.detectedUpiId
    } : null
  };
};

/**
 * Retrieves audit history and version changes for the "Recent Changes" table.
 */
const getAuditHistory = async (limit = 10) => {
  const logs = await AuditLog.find({
    entity: 'PaymentSettings'
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('actorUserId', 'name role email');

  return logs.map((log) => ({
    _id: log._id,
    date: log.createdAt,
    changedBy: log.actorUserId?.name || log.metadata?.actorName || 'Super Admin',
    role: log.actorUserId?.role || log.metadata?.actorRole || 'SUPER_ADMIN',
    changeType: log.metadata?.changeSummary || log.action.replace('PAYMENT_SETTINGS_', '').replace(/_/g, ' '),
    details: log.metadata?.changedFields && log.metadata.changedFields.length > 0
      ? `Updated ${log.metadata.changedFields.join(', ')}`
      : (log.metadata?.summary || 'Configuration updated'),
    version: log.metadata?.version || 1
  }));
};

module.exports = {
  INITIAL_DEFAULTS,
  getOrSeedActiveSettings,
  getDecryptedSettings,
  updatePaymentSettings,
  uploadQrCode,
  removeQrCode,
  getSanitizedActiveDetails,
  generateDynamicUpiQr,
  getAuditHistory
};
