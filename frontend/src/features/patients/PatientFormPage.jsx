import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import { patientApi } from '../../lib/api';
import PatientDocumentOcrPanel from './PatientDocumentOcrPanel';

const defaultForm = {
  firstName: '',
  lastName: '',
  gender: 'male',
  dateOfBirth: '',
  phone: '',
  email: '',
  bloodGroup: '',
  allergies: [],
  otherAllergy: '',
  chronicConditions: [],
  otherChronicCondition: '',
  currentMedications: [{ name: '', frequency: '' }],
  pastSurgeries: [{ name: '', year: '' }],
  familyHistory: [{ relation: '', condition: '' }],
  lifestyle: {
    smoking: 'no',
    alcohol: 'no',
    exerciseFrequency: '',
    dietType: ''
  },
  pregnancyHistory: '',
  lmpDate: '',
  address: {
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India'
  },
  emergencyContact: {
    name: '',
    relation: '',
    phone: ''
  }
};

const splitCommaSeparated = (value) =>
  typeof value === 'string'
    ? value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

const PatientFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [existingPatient, setExistingPatient] = useState(null);
  const [checkingExists, setCheckingExists] = useState(false);

  const handlePhoneChange = async (value) => {
    updateField('phone', value);
    const cleaned = value.trim();
    if (cleaned.length === 10) {
      setCheckingExists(true);
      try {
        const response = await patientApi.checkExists(cleaned);
        const exists = response.exists ?? response.data?.exists;
        const patientData = response.patient ?? response.data?.patient;
        if (exists && patientData) {
          setExistingPatient(patientData);
        } else {
          setExistingPatient(null);
        }
      } catch (err) {
        console.error('Failed to check existing patient:', err);
      } finally {
        setCheckingExists(false);
      }
    } else {
      setExistingPatient(null);
    }
  };

  const handleConfirmAssociation = async () => {
    if (!existingPatient?._id) return;
    setSubmitting(true);
    setError('');
    try {
      await patientApi.associate(existingPatient._id);
      setSuccessMessage('Patient associated with clinic successfully.');
      navigate(`/patients/${existingPatient._id}`, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to associate patient with clinic.');
    } finally {
      setSubmitting(false);
    }
  };


  const standardConditions = ['Diabetes', 'Hypertension', 'Asthma', 'Thyroid', 'Heart Disease', 'Kidney Disease', 'Cancer'];
  const standardAllergies = ['Penicillin', 'Dust', 'Peanuts', 'Milk'];

  useEffect(() => {
    if (!isEditMode) {
      return;
    }

    let isMounted = true;

    const loadPatient = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await patientApi.get(id);
        const patient = response.data.patient;

        if (!isMounted) {
          return;
        }

        const checkedConditions = (patient?.chronicConditions || []).filter(c => standardConditions.includes(c));
        const otherConditions = (patient?.chronicConditions || []).filter(c => !standardConditions.includes(c)).join(', ');

        const checkedAllergies = (patient?.allergies || []).filter(a => standardAllergies.includes(a));
        const otherAllergies = (patient?.allergies || []).filter(a => !standardAllergies.includes(a)).join(', ');

        const meds = (patient?.currentMedications || []).map(m => {
          if (typeof m === 'string') return { name: m, frequency: '' };
          return { name: m.name || '', frequency: m.frequency || '' };
        });
        if (meds.length === 0) meds.push({ name: '', frequency: '' });

        const surgeries = (patient?.pastSurgeries || []).map(s => ({ name: s.name || '', year: s.year || '' }));
        if (surgeries.length === 0) surgeries.push({ name: '', year: '' });

        const famHistory = (patient?.familyHistory || []).map(f => ({ relation: f.relation || '', condition: f.condition || '' }));
        if (famHistory.length === 0) famHistory.push({ relation: '', condition: '' });

        setForm({
          firstName: patient?.firstName || '',
          lastName: patient?.lastName || '',
          gender: patient?.gender || 'male',
          dateOfBirth: patient?.dateOfBirth ? patient.dateOfBirth.slice(0, 10) : '',
          phone: patient?.phone || '',
          email: patient?.email || '',
          bloodGroup: patient?.bloodGroup || '',
          allergies: checkedAllergies,
          otherAllergy: otherAllergies,
          chronicConditions: checkedConditions,
          otherChronicCondition: otherConditions,
          currentMedications: meds,
          pastSurgeries: surgeries,
          familyHistory: famHistory,
          lifestyle: {
            smoking: patient?.lifestyle?.smoking || 'no',
            alcohol: patient?.lifestyle?.alcohol || 'no',
            exerciseFrequency: patient?.lifestyle?.exerciseFrequency || '',
            dietType: patient?.lifestyle?.dietType || ''
          },
          pregnancyHistory: patient?.pregnancyHistory || '',
          lmpDate: patient?.lmpDate ? patient.lmpDate.slice(0, 10) : '',
          address: {
            line1: patient?.address?.line1 || '',
            line2: patient?.address?.line2 || '',
            city: patient?.address?.city || '',
            state: patient?.address?.state || '',
            pincode: patient?.address?.pincode || '',
            country: patient?.address?.country || 'India'
          },
          emergencyContact: {
            name: patient?.emergencyContact?.name || '',
            relation: patient?.emergencyContact?.relation || '',
            phone: patient?.emergencyContact?.phone || ''
          }
        });
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.response?.data?.message || 'Unable to load patient.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPatient();

    return () => {
      isMounted = false;
    };
  }, [id, isEditMode]);

  const pageTitle = useMemo(() => (isEditMode ? 'Edit patient' : 'Create patient'), [isEditMode]);

  const updateField = (name, value) => {
    setForm((current) => ({
      ...current,
      [name]: value
    }));
  };

  const updateNestedField = (group, name, value) => {
    setForm((current) => ({
      ...current,
      [group]: {
        ...current[group],
        [name]: value
      }
    }));
  };

  const handleOcrApply = (extracted = {}) => {
    setForm((current) => ({
      ...current,
      firstName: extracted.firstName || current.firstName,
      lastName: extracted.lastName || current.lastName,
      phone: extracted.phone || current.phone,
      email: extracted.email || current.email,
      dateOfBirth: extracted.dateOfBirth?.slice?.(0, 10) || extracted.dateOfBirth || current.dateOfBirth,
      gender: ['male', 'female', 'other'].includes(extracted.gender) ? extracted.gender : current.gender,
      address: {
        ...current.address,
        line1: extracted.address?.line1 || current.address.line1,
        city: extracted.address?.city || current.address.city,
        state: extracted.address?.state || current.address.state,
        pincode: extracted.address?.pincode || current.address.pincode
      }
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!form.firstName.trim() || !form.phone.trim() || !form.gender) {
      setError('First name, gender, and phone are required.');
      return;
    }

    setSubmitting(true);

    const payloadChronic = [...form.chronicConditions];
    if (form.otherChronicCondition.trim()) {
      payloadChronic.push(...splitCommaSeparated(form.otherChronicCondition));
    }

    const payloadAllergies = [...form.allergies];
    if (form.otherAllergy.trim()) {
      payloadAllergies.push(...splitCommaSeparated(form.otherAllergy));
    }

    const payloadMeds = form.currentMedications.filter(med => med.name.trim());
    const payloadSurgeries = form.pastSurgeries.filter(surg => surg.name.trim());
    const payloadFamily = form.familyHistory.filter(f => f.relation.trim() && f.condition.trim());

    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim() || undefined,
      gender: form.gender,
      dateOfBirth: form.dateOfBirth || undefined,
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      bloodGroup: form.bloodGroup.trim() || undefined,
      allergies: payloadAllergies,
      chronicConditions: payloadChronic,
      currentMedications: payloadMeds,
      pastSurgeries: payloadSurgeries,
      familyHistory: payloadFamily,
      lifestyle: form.lifestyle,
      pregnancyHistory: form.gender === 'female' ? form.pregnancyHistory : undefined,
      lmpDate: form.gender === 'female' && form.lmpDate ? form.lmpDate : undefined,
      address: {
        line1: form.address.line1.trim(),
        line2: form.address.line2.trim(),
        city: form.address.city.trim(),
        state: form.address.state.trim(),
        pincode: form.address.pincode.trim(),
        country: form.address.country.trim() || 'India'
      },
      emergencyContact: {
        name: form.emergencyContact.name.trim(),
        relation: form.emergencyContact.relation.trim(),
        phone: form.emergencyContact.phone.trim()
      }
    };

    try {
      const response = isEditMode ? await patientApi.update(id, payload) : await patientApi.create(payload);
      const patient = response.data.patient;

      setSuccessMessage(isEditMode ? 'Patient updated successfully.' : 'Patient created successfully.');
      navigate(`/patients/${patient._id}`, { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save patient.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading patient form..." />;
  }

  if (error && isEditMode && !form.firstName) {
    return <ErrorState title="Patient unavailable" description={error} />;
  }

  return (
    <section className="grid gap-6 pb-12">
      <div className="flex flex-col gap-3 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Patients</p>
          <h2 className="mt-2 text-2xl font-semibold text-stone-900">{pageTitle}</h2>
        </div>
        <Link className="text-sm font-semibold text-emerald-700 hover:text-emerald-800" to="/patients">
          Back to patient list
        </Link>
      </div>

      <PatientDocumentOcrPanel onApply={handleOcrApply} />

      {existingPatient && (
        <div className="flex flex-col gap-4 rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-lg shadow-amber-100 animate-fade-in">
          <div>
            <h3 className="text-lg font-bold text-amber-900">Existing patient found.</h3>
            <p className="text-sm text-amber-700 mt-1">Please confirm patient identity before linking with this clinic. Medical records from other clinics are not visible.</p>
          </div>
          <div className="grid grid-cols-3 gap-4 bg-white/60 p-4 rounded-2xl border border-amber-100">
            <div>
              <span className="text-xs text-stone-500 font-bold uppercase tracking-wider">Name</span>
              <p className="text-sm font-semibold text-stone-800 mt-0.5">{existingPatient.fullName || `${existingPatient.firstName} ${existingPatient.lastName}`}</p>
            </div>
            <div>
              <span className="text-xs text-stone-500 font-bold uppercase tracking-wider">Date of Birth</span>
              <p className="text-sm font-semibold text-stone-800 mt-0.5">{existingPatient.dateOfBirth ? new Date(existingPatient.dateOfBirth).toLocaleDateString() : 'N/A'}</p>
            </div>
            <div>
              <span className="text-xs text-stone-500 font-bold uppercase tracking-wider">Gender</span>
              <p className="text-sm font-semibold text-stone-800 mt-0.5 capitalize">{existingPatient.gender}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={handleConfirmAssociation}
              className="px-5 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-sm transition disabled:opacity-50"
            >
              Confirm and Associate with Clinic
            </button>
            <button
              type="button"
              onClick={() => {
                setExistingPatient(null);
                updateField('phone', '');
              }}
              className="px-5 py-2.5 rounded-2xl border border-stone-300 hover:bg-stone-50 text-stone-700 font-bold text-sm transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}


      <form className="grid gap-6" onSubmit={handleSubmit}>
        {/* Core Profile */}
        <div className="grid gap-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40 md:grid-cols-2">
          <h3 className="md:col-span-2 text-lg font-semibold text-stone-900">Demographics</h3>
          
          <label className="grid gap-2 text-sm text-stone-700">
            First name
            <input className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" value={form.firstName} onChange={(event) => updateField('firstName', event.target.value)} required />
          </label>
          <label className="grid gap-2 text-sm text-stone-700">
            Last name
            <input className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" value={form.lastName} onChange={(event) => updateField('lastName', event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm text-stone-700">
            Gender
            <select className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" value={form.gender} onChange={(event) => updateField('gender', event.target.value)}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm text-stone-700">
            Date of birth
            <input type="date" className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" value={form.dateOfBirth} onChange={(event) => updateField('dateOfBirth', event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm text-stone-700">
            Phone
            <input className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" value={form.phone} onChange={(event) => handlePhoneChange(event.target.value)} required />
            {checkingExists && <span className="text-xs text-stone-400">Checking patient database...</span>}
          </label>
          <label className="grid gap-2 text-sm text-stone-700">
            Email
            <input type="email" className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" value={form.email} onChange={(event) => updateField('email', event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm text-stone-700 md:col-span-2">
            Blood group
            <input className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" value={form.bloodGroup} onChange={(event) => updateField('bloodGroup', event.target.value)} />
          </label>
        </div>

        {/* Structured Medical History */}
        <div className="grid gap-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
          <h3 className="text-lg font-semibold text-stone-900 border-b border-stone-100 pb-3">Medical History</h3>
          
          {/* Chronic Diseases */}
          <div className="grid gap-3">
            <span className="text-sm font-semibold text-stone-800">Chronic Diseases</span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {standardConditions.map((disease) => (
                <label key={disease} className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.chronicConditions.includes(disease)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setForm(prev => ({
                        ...prev,
                        chronicConditions: checked
                          ? [...prev.chronicConditions, disease]
                          : prev.chronicConditions.filter(d => d !== disease)
                      }));
                    }}
                    className="w-4 h-4 accent-emerald-600 rounded"
                  />
                  <span>{disease}</span>
                </label>
              ))}
            </div>
            <label className="grid gap-2 text-sm text-stone-700 mt-2">
              <span>Other Chronic Conditions (comma separated)</span>
              <input
                className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                value={form.otherChronicCondition}
                onChange={(e) => updateField('otherChronicCondition', e.target.value)}
                placeholder="e.g. Migraine, Arthritis"
              />
            </label>
          </div>

          {/* Allergies */}
          <div className="grid gap-3 border-t border-stone-100 pt-4">
            <span className="text-sm font-semibold text-stone-800">Allergies</span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {standardAllergies.map((allergy) => (
                <label key={allergy} className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.allergies.includes(allergy)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setForm(prev => ({
                        ...prev,
                        allergies: checked
                          ? [...prev.allergies, allergy]
                          : prev.allergies.filter(a => a !== allergy)
                      }));
                    }}
                    className="w-4 h-4 accent-emerald-600 rounded"
                  />
                  <span>{allergy}</span>
                </label>
              ))}
            </div>
            <label className="grid gap-2 text-sm text-stone-700 mt-2">
              <span>Other Allergies (comma separated)</span>
              <input
                className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                value={form.otherAllergy}
                onChange={(e) => updateField('otherAllergy', e.target.value)}
                placeholder="e.g. Pollen, Soy"
              />
            </label>
          </div>

          {/* Current Medications Dynamic List */}
          <div className="grid gap-3 border-t border-stone-100 pt-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-stone-800">Current Medications</span>
              <button
                type="button"
                onClick={() => setForm(prev => ({
                  ...prev,
                  currentMedications: [...prev.currentMedications, { name: '', frequency: '' }]
                }))}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
              >
                + Add Medication
              </button>
            </div>
            {form.currentMedications.map((med, idx) => (
              <div key={idx} className="flex gap-3 items-center">
                <input
                  className="w-1/2 rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  value={med.name}
                  onChange={(e) => {
                    const updated = [...form.currentMedications];
                    updated[idx].name = e.target.value;
                    setForm(prev => ({ ...prev, currentMedications: updated }));
                  }}
                  placeholder="Medication name (e.g. Metformin 500mg)"
                />
                <input
                  className="w-1/2 rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  value={med.frequency}
                  onChange={(e) => {
                    const updated = [...form.currentMedications];
                    updated[idx].frequency = e.target.value;
                    setForm(prev => ({ ...prev, currentMedications: updated }));
                  }}
                  placeholder="Frequency (e.g. Twice Daily)"
                />
                {form.currentMedications.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({
                      ...prev,
                      currentMedications: prev.currentMedications.filter((_, i) => i !== idx)
                    }))}
                    className="text-rose-600 hover:text-rose-700 text-sm font-semibold px-2"
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Past Surgeries Dynamic List */}
          <div className="grid gap-3 border-t border-stone-100 pt-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-stone-800">Past Surgeries</span>
              <button
                type="button"
                onClick={() => setForm(prev => ({
                  ...prev,
                  pastSurgeries: [...prev.pastSurgeries, { name: '', year: '' }]
                }))}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
              >
                + Add Surgery
              </button>
            </div>
            {form.pastSurgeries.map((surg, idx) => (
              <div key={idx} className="flex gap-3 items-center">
                <input
                  className="w-1/2 rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  value={surg.name}
                  onChange={(e) => {
                    const updated = [...form.pastSurgeries];
                    updated[idx].name = e.target.value;
                    setForm(prev => ({ ...prev, pastSurgeries: updated }));
                  }}
                  placeholder="Surgery name (e.g. Appendix Removal)"
                />
                <input
                  className="w-1/2 rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  value={surg.year}
                  onChange={(e) => {
                    const updated = [...form.pastSurgeries];
                    updated[idx].year = e.target.value;
                    setForm(prev => ({ ...prev, pastSurgeries: updated }));
                  }}
                  placeholder="Year (e.g. 2022)"
                />
                {form.pastSurgeries.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({
                      ...prev,
                      pastSurgeries: prev.pastSurgeries.filter((_, i) => i !== idx)
                    }))}
                    className="text-rose-600 hover:text-rose-700 text-sm font-semibold px-2"
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Family History Dynamic List */}
          <div className="grid gap-3 border-t border-stone-100 pt-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-stone-800">Family History</span>
              <button
                type="button"
                onClick={() => setForm(prev => ({
                  ...prev,
                  familyHistory: [...prev.familyHistory, { relation: '', condition: '' }]
                }))}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
              >
                + Add Record
              </button>
            </div>
            {form.familyHistory.map((fam, idx) => (
              <div key={idx} className="flex gap-3 items-center">
                <input
                  className="w-1/2 rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  value={fam.relation}
                  onChange={(e) => {
                    const updated = [...form.familyHistory];
                    updated[idx].relation = e.target.value;
                    setForm(prev => ({ ...prev, familyHistory: updated }));
                  }}
                  placeholder="Relation (e.g. Father)"
                />
                <input
                  className="w-1/2 rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  value={fam.condition}
                  onChange={(e) => {
                    const updated = [...form.familyHistory];
                    updated[idx].condition = e.target.value;
                    setForm(prev => ({ ...prev, familyHistory: updated }));
                  }}
                  placeholder="Disease/Condition (e.g. Diabetes)"
                />
                {form.familyHistory.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({
                      ...prev,
                      familyHistory: prev.familyHistory.filter((_, i) => i !== idx)
                    }))}
                    className="text-rose-600 hover:text-rose-700 text-sm font-semibold px-2"
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Lifestyle */}
          <div className="grid gap-4 border-t border-stone-100 pt-4 md:grid-cols-2">
            <span className="text-sm font-semibold text-stone-800 md:col-span-2">Lifestyle</span>
            <label className="grid gap-2 text-sm text-stone-700">
              <span>Smoking</span>
              <select
                value={form.lifestyle.smoking}
                onChange={(e) => setForm(prev => ({
                  ...prev,
                  lifestyle: { ...prev.lifestyle, smoking: e.target.value }
                }))}
                className="w-full rounded-2xl border border-stone-300 bg-white text-stone-900 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
                <option value="former">Former Smoker</option>
              </select>
            </label>

            <label className="grid gap-2 text-sm text-stone-700">
              <span>Alcohol</span>
              <select
                value={form.lifestyle.alcohol}
                onChange={(e) => setForm(prev => ({
                  ...prev,
                  lifestyle: { ...prev.lifestyle, alcohol: e.target.value }
                }))}
                className="w-full rounded-2xl border border-stone-300 bg-white text-stone-900 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
                <option value="occasional">Occasional</option>
              </select>
            </label>

            <label className="grid gap-2 text-sm text-stone-700">
              <span>Exercise Frequency</span>
              <input
                className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                value={form.lifestyle.exerciseFrequency}
                onChange={(e) => setForm(prev => ({
                  ...prev,
                  lifestyle: { ...prev.lifestyle, exerciseFrequency: e.target.value }
                }))}
                placeholder="e.g. Daily, 2-3 times/week, None"
              />
            </label>

            <label className="grid gap-2 text-sm text-stone-700">
              <span>Diet Type</span>
              <input
                className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                value={form.lifestyle.dietType}
                onChange={(e) => setForm(prev => ({
                  ...prev,
                  lifestyle: { ...prev.lifestyle, dietType: e.target.value }
                }))}
                placeholder="e.g. Vegetarian, Non-Vegetarian, Vegan"
              />
            </label>
          </div>

          {/* Pregnancy & LMP for Female Patients */}
          {form.gender === 'female' && (
            <div className="grid gap-4 border-t border-stone-100 pt-4 md:grid-cols-2">
              <span className="text-sm font-semibold text-stone-800 md:col-span-2">Pregnancy History & LMP</span>
              <label className="grid gap-2 text-sm text-stone-700">
                <span>Pregnancy History</span>
                <input
                  className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  value={form.pregnancyHistory}
                  onChange={(e) => updateField('pregnancyHistory', e.target.value)}
                  placeholder="Details (e.g. G2P1A0)"
                />
              </label>
              <label className="grid gap-2 text-sm text-stone-700">
                <span>LMP Date</span>
                <input
                  type="date"
                  className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  value={form.lmpDate}
                  onChange={(e) => updateField('lmpDate', e.target.value)}
                />
              </label>
            </div>
          )}
        </div>

        {/* Address */}
        <div className="grid gap-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40 md:grid-cols-2">
          <h3 className="md:col-span-2 text-lg font-semibold text-stone-900">Address</h3>
          {['line1', 'line2', 'city', 'state', 'pincode', 'country'].map((field) => (
            <label key={field} className="grid gap-2 text-sm capitalize text-stone-700">
              {field}
              <input
                className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                value={form.address[field]}
                onChange={(event) => updateNestedField('address', field, event.target.value)}
              />
            </label>
          ))}
        </div>

        {/* Emergency Contact */}
        <div className="grid gap-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40 md:grid-cols-3">
          <h3 className="md:col-span-3 text-lg font-semibold text-stone-900">Emergency contact</h3>
          {['name', 'relation', 'phone'].map((field) => (
            <label key={field} className="grid gap-2 text-sm capitalize text-stone-700">
              {field}
              <input
                className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                value={form.emergencyContact[field]}
                onChange={(event) => updateNestedField('emergencyContact', field, event.target.value)}
              />
            </label>
          ))}
        </div>

        {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        {successMessage ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</p> : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Saving...' : isEditMode ? 'Save changes' : 'Create patient'}
          </button>
          <Link className="rounded-2xl border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50" to={isEditMode ? `/patients/${id}` : '/patients'}>
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
};

export default PatientFormPage;
