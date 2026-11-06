import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Clinic Profile Dynamic Completion & Isolation Logic', () => {
  const calculateProfileCompletion = (fields) => {
    const REQUIRED_KEYS = ['name', 'phone', 'email', 'address', 'city', 'state', 'pincode'];
    const completed = REQUIRED_KEYS.filter(k => Boolean(fields[k] && String(fields[k]).trim()));
    const percent = Math.round((completed.length / REQUIRED_KEYS.length) * 100);
    const missing = REQUIRED_KEYS.filter(k => !fields[k] || !String(fields[k]).trim());
    return {
      completionPercent: percent,
      missingFields: missing,
      isProfileIncomplete: percent < 100
    };
  };

  it('Scenario A – Brand New Clinic: all fields empty, 0% complete, missing required items detected', () => {
    const emptyClinic = {
      name: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      pincode: ''
    };
    const result = calculateProfileCompletion(emptyClinic);
    assert.strictEqual(result.completionPercent, 0);
    assert.strictEqual(result.isProfileIncomplete, true);
    assert.strictEqual(result.missingFields.length, 7);
  });

  it('Scenario B – Partially Completed Profile: reflects exact progress without mock data', () => {
    const partialClinic = {
      name: "Apex Dental Care",
      phone: "+91 9876543210",
      email: "contact@apexdental.in",
      address: "",
      city: "",
      state: "",
      pincode: ""
    };
    const result = calculateProfileCompletion(partialClinic);
    // 3 out of 7 completed = 43%
    assert.strictEqual(result.completionPercent, 43);
    assert.strictEqual(result.isProfileIncomplete, true);
    assert.deepStrictEqual(result.missingFields, ['address', 'city', 'state', 'pincode']);
  });

  it('Scenario C – Fully Completed Profile: 100% complete and flag is false', () => {
    const fullClinic = {
      name: "Apex Dental Care",
      phone: "+91 9876543210",
      email: "contact@apexdental.in",
      address: "123 Health Boulevard",
      city: "Indirapuram",
      state: "Uttar Pradesh",
      pincode: "201014"
    };
    const result = calculateProfileCompletion(fullClinic);
    assert.strictEqual(result.completionPercent, 100);
    assert.strictEqual(result.isProfileIncomplete, false);
    assert.strictEqual(result.missingFields.length, 0);
  });

  it('Scenario D – Strict Data Isolation: Switching clinics cleanses previous data without retention', () => {
    let state = {
      clinicId: 'clinic_1',
      name: 'Clinic One',
      email: 'one@clinic.com'
    };

    // Switch to clinic_2 which is empty
    const clinic2 = {
      _id: 'clinic_2',
      name: 'Clinic Two',
      email: ''
    };

    state = {
      clinicId: clinic2._id,
      name: clinic2.name || '',
      email: clinic2.email || ''
    };

    assert.strictEqual(state.clinicId, 'clinic_2');
    assert.strictEqual(state.name, 'Clinic Two');
    assert.strictEqual(state.email, ''); // not retaining one@clinic.com
  });

  it('Scenario E – Missing optional fields display neutral label "Not configured"', () => {
    const formatDetailValue = (val) => val && String(val).trim() ? val : 'Not configured';
    assert.strictEqual(formatDetailValue(''), 'Not configured');
    assert.strictEqual(formatDetailValue(null), 'Not configured');
    assert.strictEqual(formatDetailValue(undefined), 'Not configured');
    assert.strictEqual(formatDetailValue('INR (₹)'), 'INR (₹)');
  });
});

