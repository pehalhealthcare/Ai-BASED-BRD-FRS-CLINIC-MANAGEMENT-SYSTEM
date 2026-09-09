const crypto = require('crypto');
const { env } = require('../../config/env');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard recommended IV length for GCM (96 bits)
const AUTH_TAG_LENGTH = 16; // 128-bit authentication tag

/**
 * Derives a 32-byte (256-bit) encryption key from the environment secret.
 */
const getEncryptionKey = () => {
  const secret = process.env.PAYMENT_SETTINGS_ENCRYPTION_KEY || env.jwtSecret || 'ai-cms-secure-default-encryption-secret-key-32-bytes!';
  return crypto.createHash('sha256').update(secret).digest();
};

/**
 * Encrypts a plaintext string using AES-256-GCM authenticated encryption.
 * Returns formatted ciphertext: "iv:authTag:encryptedData" in hex encoding.
 *
 * @param {string} plaintext
 * @returns {string} Encrypted ciphertext
 */
const encrypt = (plaintext) => {
  if (plaintext === null || plaintext === undefined || plaintext === '') {
    return '';
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  let encrypted = cipher.update(String(plaintext), 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encryptedData (all in hex)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};

/**
 * Decrypts an AES-256-GCM formatted ciphertext ("iv:authTag:encryptedData").
 *
 * @param {string} ciphertext
 * @returns {string} Decrypted plaintext string
 */
const decrypt = (ciphertext) => {
  if (!ciphertext || typeof ciphertext !== 'string') {
    return '';
  }

  // If not in encrypted format (e.g., during migration or legacy data), return as is
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    return ciphertext;
  }

  try {
    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    console.error('Decryption failed for ciphertext:', err.message);
    throw new Error('Failed to authenticate and decrypt sensitive payment data.');
  }
};

module.exports = {
  encrypt,
  decrypt
};
