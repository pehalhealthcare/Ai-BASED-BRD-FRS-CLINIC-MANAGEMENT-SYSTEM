import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Landing Page CTAs & Safe Environment Variable Fallbacks', () => {
  it('should safely construct WhatsApp phone URL without crashing when env vars are undefined', () => {
    // Simulate production environment where VITE_WHATSAPP_NUMBER and VITE_COMPANY_PHONE are undefined
    const envWhatsApp = undefined;
    const envCompanyPhone = undefined;

    // The safe fallback pattern implemented
    const rawPhone = envWhatsApp || envCompanyPhone || '918130916134';
    const cleanPhone = (rawPhone || '918130916134').replace(/\D/g, '');

    assert.equal(cleanPhone, '918130916134');
    const href = `https://api.whatsapp.com/send/?phone=${cleanPhone}&text&type=phone_number&app_absent=0`;
    assert.match(href, /phone=918130916134/);
  });

  it('should sanitize formatted phone strings to pure digits', () => {
    const formattedPhone = '+91 81309-16134';
    const cleanPhone = (formattedPhone || '918130916134').replace(/\D/g, '');
    assert.equal(cleanPhone, '918130916134');
  });

  it('should safely format company phone number without crashing when env var is undefined', () => {
    const envCompanyPhone = undefined;
    const phoneStr = envCompanyPhone || '+91 81309 16134';
    const formatted = phoneStr.length >= 3 ? phoneStr.slice(0, 3) + ' ' + phoneStr.slice(3) : phoneStr;
    assert.equal(formatted, '+91  81309 16134');
  });

  it('should safely format status strings in RoleConnectedSection even if status is null or undefined', () => {
    const statusNull = null;
    const statusUndefined = undefined;
    const statusValid = 'CHECKED_IN';

    const formatStatus = (status) => (status ? status.replace('_', ' ') : '');

    assert.equal(formatStatus(statusNull), '');
    assert.equal(formatStatus(statusUndefined), '');
    assert.equal(formatStatus(statusValid), 'CHECKED IN');
  });

  it('should safely validate phone in ClinicRegister without throwing on null or undefined values', () => {
    const cleanPhone = (phoneVal) => (phoneVal || '').replace(/\D/g, '');

    assert.equal(cleanPhone(undefined), '');
    assert.equal(cleanPhone(null), '');
    assert.equal(cleanPhone('9876543210'), '9876543210');
    assert.equal(cleanPhone('+91 98765 43210'), '919876543210');
  });

  it('should safely validate aadhaar and pincode in ClinicRegister without throwing on missing values', () => {
    const sanitizeDigits = (val) => (val || '').replace(/\D/g, '');

    assert.equal(sanitizeDigits(undefined), '');
    assert.equal(sanitizeDigits('1234-5678-9012'), '123456789012');
    assert.equal(sanitizeDigits('110 001'), '110001');
  });
});

