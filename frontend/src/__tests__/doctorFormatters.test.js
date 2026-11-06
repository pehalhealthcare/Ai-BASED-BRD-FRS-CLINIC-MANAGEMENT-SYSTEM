import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDoctorName, cleanDoctorName, getDoctorInitials } from '../utils/doctorFormatters.js';

describe('Doctor Name Normalization', () => {
  it('adds Dr. prefix when missing (e.g. Shyam -> Dr. Shyam)', () => {
    assert.equal(normalizeDoctorName('Shyam'), 'Dr. Shyam');
    assert.equal(normalizeDoctorName('Rahul Sharma'), 'Dr. Rahul Sharma');
  });

  it('keeps single Dr. prefix when already present (e.g. Dr Shyam -> Dr. Shyam, Dr. Shyam -> Dr. Shyam)', () => {
    assert.equal(normalizeDoctorName('Dr Shyam'), 'Dr. Shyam');
    assert.equal(normalizeDoctorName('Dr. Shyam'), 'Dr. Shyam');
    assert.equal(normalizeDoctorName('dr shyam'), 'Dr. shyam');
    assert.equal(normalizeDoctorName('DR. Shyam'), 'Dr. Shyam');
  });

  it('removes accidental consecutive duplicate Dr. prefixes (e.g. Dr. Dr Shyam -> Dr. Shyam)', () => {
    assert.equal(normalizeDoctorName('Dr. Dr Shyam'), 'Dr. Shyam');
    assert.equal(normalizeDoctorName('Dr. Dr. Shyam Ram'), 'Dr. Shyam Ram');
    assert.equal(normalizeDoctorName('Dr. Dr. Rahul Sharma'), 'Dr. Rahul Sharma');
    assert.equal(normalizeDoctorName('Dr.  Dr.  Dr.   Shyam'), 'Dr. Shyam');
    assert.equal(normalizeDoctorName('Doctor Dr. Shyam'), 'Dr. Shyam');
  });

  it('preserves names where Dr is part of a legitimate word (e.g. Drew, Drake)', () => {
    assert.equal(normalizeDoctorName('Drew Carey'), 'Dr. Drew Carey');
    assert.equal(normalizeDoctorName('Drake'), 'Dr. Drake');
  });

  it('handles object input with fullName or name', () => {
    assert.equal(normalizeDoctorName({ fullName: 'Dr. Dr Shyam' }), 'Dr. Shyam');
    assert.equal(normalizeDoctorName({ name: 'Rahul Sharma' }), 'Dr. Rahul Sharma');
    assert.equal(normalizeDoctorName({ user: { fullName: 'Dr. Shyam' } }), 'Dr. Shyam');
  });

  it('handles fallback and empty inputs gracefully', () => {
    assert.equal(normalizeDoctorName(null), 'Doctor');
    assert.equal(normalizeDoctorName(undefined), 'Doctor');
    assert.equal(normalizeDoctorName(''), 'Doctor');
    assert.equal(normalizeDoctorName('—', '—'), '—');
    assert.equal(normalizeDoctorName('Doctor'), 'Doctor');
  });

  it('computes clean initials without accidental DD', () => {
    assert.equal(getDoctorInitials('Shyam'), 'SH');
    assert.equal(getDoctorInitials('Dr. Shyam'), 'SH');
    assert.equal(getDoctorInitials('Dr. Dr Shyam'), 'SH');
    assert.equal(getDoctorInitials('Dr. Dr. Shyam Ram'), 'SR');
    assert.equal(getDoctorInitials('Dr. Rahul Sharma'), 'RS');
    assert.equal(getDoctorInitials(null), 'DR');
  });

  it('cleanDoctorName returns the plain name without any Dr prefix', () => {
    assert.equal(cleanDoctorName('Dr. Dr Shyam'), 'Shyam');
    assert.equal(cleanDoctorName('Dr. Shyam Ram'), 'Shyam Ram');
    assert.equal(cleanDoctorName('Rahul Sharma'), 'Rahul Sharma');
  });
});

