const { encrypt, decrypt } = require('../src/common/utils/encryption');

describe('Payment Settings Security & Encryption Unit Tests', () => {
  test('AES-256-GCM properly encrypts and decrypts sensitive values', () => {
    const sensitiveAccountNumber = '8512060314';
    const encrypted = encrypt(sensitiveAccountNumber);

    expect(encrypted).not.toBe(sensitiveAccountNumber);
    expect(encrypted.split(':').length).toBe(3); // iv:authTag:ciphertext

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(sensitiveAccountNumber);
  });

  test('Produces unique ciphertext for identical plaintext due to random IVs', () => {
    const text = 'PehalHealthcare Technologies Private Limited';
    const enc1 = encrypt(text);
    const enc2 = encrypt(text);

    expect(enc1).not.toBe(enc2);
    expect(decrypt(enc1)).toBe(text);
    expect(decrypt(enc2)).toBe(text);
  });

  test('Fails securely if ciphertext or auth tag is tampered with', () => {
    const original = encrypt('8130916134@kotak');
    const parts = original.split(':');
    // Tamper with the encrypted body
    const tampered = `${parts[0]}:${parts[1]}:${parts[2].slice(0, -2)}ff`;

    expect(() => decrypt(tampered)).toThrow('Failed to authenticate and decrypt sensitive payment data.');
  });

  test('Validates IFSC codes accurately', () => {
    const validIfsc = 'KKBK0000181';
    const invalidIfsc1 = 'KKBK000';
    const invalidIfsc2 = '12340000181';

    const regex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    expect(regex.test(validIfsc)).toBe(true);
    expect(regex.test(invalidIfsc1)).toBe(false);
    expect(regex.test(invalidIfsc2)).toBe(false);
  });

  test('Validates UPI IDs accurately', () => {
    const validUpi = '8130916134@kotak';
    const invalidUpi = 'invalid-upi-without-at';

    const regex = /^[\w.\-_]{2,64}@[\w.\-_]{2,32}$/;
    expect(regex.test(validUpi)).toBe(true);
    expect(regex.test(invalidUpi)).toBe(false);
  });
});
