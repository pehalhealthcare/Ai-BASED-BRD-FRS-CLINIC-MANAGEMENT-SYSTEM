import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import aiApi from '../../../api/aiApi';
import appointmentApi from '../../../api/appointmentApi';
import doctorApi from '../../../api/doctorApi';
import patientApi from '../../../api/patientApi';
import Badge from '../../../components/common/Badge';
import Button from '../../../components/common/Button';
import Card from '../../../components/common/Card';
import EmptyState from '../../../components/common/EmptyState';
import ErrorState from '../../../components/common/ErrorState';
import Input from '../../../components/common/Input';
import Select from '../../../components/common/Select';
import Textarea from '../../../components/common/Textarea';
import { ROLES } from '../../../constants/roles';
import useApi from '../../../hooks/useApi';
import useAuth from '../../../hooks/useAuth';
import useDebounce from '../../../hooks/useDebounce';
import { notificationApi } from '../../../lib/api';

const FAQ_ENTRIES = [
  {
    match: ['hours', 'timing', 'open', 'close'],
    answer:
      'Clinic hours are typically 9:00 AM to 8:00 PM on weekdays and 9:00 AM to 2:00 PM on Saturdays. For emergencies, visit the nearest emergency department.'
  },
  {
    match: ['book', 'appointment', 'schedule'],
    answer:
      'You can book an appointment from the patient portal or ask the assistant to auto-book the next available slot after a symptom check.'
  },
  {
    match: ['prescription', 'medicine', 'rx'],
    answer:
      'Finalized prescriptions appear in your patient portal. Download or share them with the pharmacy after doctor review.'
  },
  {
    match: ['bill', 'invoice', 'payment', 'pay'],
    answer:
      'Invoices are available under Billing in the patient portal. Reception can record cash payments or initiate online payment when enabled.'
  },
  {
    match: ['lab', 'report', 'test'],
    answer:
      'Lab orders are placed during consultation. Reports are reviewed by the lab team and doctor before they are shared with you.'
  }
];

const matchFaq = (text = '') => {
  const normalized = text.toLowerCase();
  return FAQ_ENTRIES.find((entry) => entry.match.some((term) => normalized.includes(term)))?.answer || null;
};

const SymptomChatbotWidget = ({ isPatientDashboard = false, onBookingSuccess }) => {
  const { user } = useAuth();
  const isPatientUser = user?.role === ROLES.PATIENT;
  const [linkedPatientId, setLinkedPatientId] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [patientOptions, setPatientOptions] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [form, setForm] = useState({
    symptoms: '',
    age: '',
    gender: '',
    duration: '',
    known_conditions: '',
    language: 'en'
  });
  const [result, setResult] = useState(null);

  // Recommended Doctors and Slots Selection State
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookingStatus, setBookingStatus] = useState('');
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const debouncedSearch = useDebounce(patientSearch, 300);
  const { loading, error, execute, setError } = useApi(aiApi.symptomCheck);

  useEffect(() => {
    const loadLinkedPatient = async () => {
      if (!isPatientUser) return;
      try {
        const data = await patientApi.me();
        setLinkedPatientId(data?.patient?._id || '');
        if (data?.patient?.age) {
          setForm((current) => ({ ...current, age: String(data.patient.age) }));
        }
        if (data?.patient?.gender) {
          setForm((current) => ({ ...current, gender: data.patient.gender }));
        }
      } catch (_error) {
        setLinkedPatientId('');
      }
    };
    loadLinkedPatient();
  }, [isPatientUser]);

  useEffect(() => {
    const loadPatients = async () => {
      if (isPatientUser || !debouncedSearch.trim()) {
        setPatientOptions([]);
        return;
      }
      try {
        const data = await patientApi.list({ search: debouncedSearch, limit: 8 });
        setPatientOptions(data.patients || []);
      } catch (_error) {
        setPatientOptions([]);
      }
    };
    loadPatients();
  }, [debouncedSearch, isPatientUser]);

  // Fetch Recommended Doctors when triage result recommendedSpecialization is available
  useEffect(() => {
    const fetchDoctors = async () => {
      if (!result?.recommendedSpecialization) {
        setDoctors([]);
        setSelectedDoctor(null);
        return;
      }
      setLoadingDoctors(true);
      try {
        const response = await doctorApi.list({ specialization: result.recommendedSpecialization });
        const matchingDoctors = response.doctors || [];
        setDoctors(matchingDoctors);
        
        // Default select the first doctor if available
        if (matchingDoctors.length > 0) {
          setSelectedDoctor(matchingDoctors[0]);
        } else {
          // Fallback to fetch all active doctors if none matching specialization found
          const allDocsRes = await doctorApi.list({ limit: 10 });
          setDoctors(allDocsRes.doctors || []);
          if (allDocsRes.doctors?.length > 0) {
            setSelectedDoctor(allDocsRes.doctors[0]);
          } else {
            setSelectedDoctor(null);
          }
        }
      } catch (err) {
        console.error('Error fetching recommended doctors:', err);
        setDoctors([]);
        setSelectedDoctor(null);
      } finally {
        setLoadingDoctors(false);
      }
    };
    fetchDoctors();
  }, [result]);

  // Fetch Slots when selectedDoctor or selectedDate changes
  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedDoctor?._id || !selectedDate) {
        setSlots([]);
        setSelectedSlot(null);
        return;
      }
      setLoadingSlots(true);
      try {
        const response = await appointmentApi.availableSlots({
          doctorId: selectedDoctor._id,
          date: selectedDate,
          durationMinutes: 15
        });
        setSlots(response.slots || []);
        setSelectedSlot(null);
      } catch (err) {
        console.error('Error fetching available slots:', err);
        setSlots([]);
        setSelectedSlot(null);
      } finally {
        setLoadingSlots(false);
      }
    };
    fetchSlots();
  }, [selectedDoctor, selectedDate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setBookingStatus('');
    setDoctors([]);
    setSelectedDoctor(null);
    setSlots([]);
    setSelectedSlot(null);

    const faqAnswer = matchFaq(form.symptoms);

    if (faqAnswer) {
      setResult({
        possibleConditions: [{ name: 'Clinic FAQ', reason: faqAnswer }],
        recommendedSpecialization: 'General Physician',
        urgency: 'low',
        redFlags: [],
        disclaimer: 'This is general clinic information. For medical concerns, describe your symptoms for AI-assisted triage.',
        doctorNoteSummary: faqAnswer
      });
      return;
    }

    try {
      const data = await execute({
        symptoms: form.symptoms,
        age: form.age ? Number(form.age) : undefined,
        gender: form.gender || undefined,
        duration: form.duration || undefined,
        language: form.language || 'en',
        known_conditions: form.known_conditions
          ? form.known_conditions.split(',').map((item) => item.trim()).filter(Boolean)
          : []
      });
      setResult(data);
    } catch (_error) {
      setResult(null);
    }
  };

  const handleBookSlot = async () => {
    const targetPatientId = isPatientUser ? linkedPatientId : selectedPatient;

    if (!targetPatientId) {
      setBookingStatus('Failed: No linked patient profile found.');
      return;
    }

    if (!selectedDoctor?._id || !selectedSlot) {
      setBookingStatus('Failed: Please select a doctor and time slot.');
      return;
    }

    setBookingStatus('Booking appointment...');

    try {
      const bookingResponse = await appointmentApi.create({
        patientId: targetPatientId,
        doctorId: selectedDoctor._id,
        appointmentDate: selectedDate,
        startTime: selectedSlot,
        durationMinutes: 15,
        appointmentType: 'scheduled',
        source: 'chatbot',
        reasonForVisit: `AI Chatbot: Recommended for ${result?.recommendedSpecialization || 'General Practitioner'}`,
        symptomsSummary: form.symptoms
      });

      const appointmentId = bookingResponse?.appointment?._id || bookingResponse?.data?.appointment?._id || bookingResponse?._id;

      if (appointmentId) {
        try {
          await notificationApi.send({
            patientId: targetPatientId,
            appointmentId,
            type: 'appointment_reminder',
            channel: 'sms',
            subject: 'Appointment booked',
            body: `Your appointment with ${selectedDoctor.fullName} is booked for ${selectedDate} at ${selectedSlot} via the AI assistant.`
          });
        } catch (_notificationError) {
          // Booking succeeded even if notification queue fails.
        }
      }

      setBookingStatus(`Success! Booked with ${selectedDoctor.fullName} on ${selectedDate} at ${selectedSlot}.`);
      
      // Clear forms/results or invoke callback
      if (typeof onBookingSuccess === 'function') {
        onBookingSuccess();
      }
    } catch (err) {
      console.error(err);
      setBookingStatus(err.response?.data?.message || 'Failed: Could not book appointment.');
    }
  };

  const activePatientId = isPatientUser ? linkedPatientId : selectedPatient;

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <h2 className="text-xl font-bold text-stone-900 mb-2 flex items-center gap-2">
            <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
            Describe your symptoms
          </h2>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            {!isPatientUser && (
              <>
                <label className="grid gap-2 text-sm font-medium text-stone-700">
                  <span>Link patient (optional)</span>
                  <Input
                    value={patientSearch}
                    onChange={(event) => setPatientSearch(event.target.value)}
                    placeholder="Search patient by name or ID"
                  />
                </label>
                <Select value={selectedPatient} onChange={(event) => setSelectedPatient(event.target.value)}>
                  <option value="">No patient selected</option>
                  {patientOptions.map((patient) => (
                    <option key={patient._id} value={patient._id}>
                      {patient.fullName} ({patient.patientId})
                    </option>
                  ))}
                </Select>
              </>
            )}

            {isPatientUser && !linkedPatientId && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-800">
                Your account is not linked to a patient record yet. Contact clinic reception to link your profile.
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-stone-700">
                <span>Preferred Language</span>
                <Select
                  value={form.language}
                  onChange={(event) => setForm((current) => ({ ...current, language: event.target.value }))}
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="ta">Tamil</option>
                  <option value="te">Telugu</option>
                  <option value="bn">Bengali</option>
                </Select>
              </label>

              <label className="grid gap-2 text-sm font-medium text-stone-700">
                <span>Duration</span>
                <Input
                  value={form.duration}
                  onChange={(event) => setForm((current) => ({ ...current, duration: event.target.value }))}
                  placeholder="e.g. 2 days"
                />
              </label>
            </div>

            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Symptoms or Questions</span>
              <Textarea
                rows={4}
                value={form.symptoms}
                onChange={(event) => setForm((current) => ({ ...current, symptoms: event.target.value }))}
                placeholder="Example: I have a sudden high fever, sore throat and difficulty swallowing since yesterday."
                required
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-stone-700">
                <span>Age</span>
                <Input
                  type="number"
                  min="0"
                  max="120"
                  value={form.age}
                  onChange={(event) => setForm((current) => ({ ...current, age: event.target.value }))}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-stone-700">
                <span>Gender</span>
                <Select value={form.gender} onChange={(event) => setForm((current) => ({ ...current, gender: event.target.value }))}>
                  <option value="">Not provided</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </Select>
              </label>
            </div>

            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Known Medical Conditions</span>
              <Input
                value={form.known_conditions}
                onChange={(event) => setForm((current) => ({ ...current, known_conditions: event.target.value }))}
                placeholder="e.g. Diabetes, Hypertension (comma separated)"
              />
            </label>

            <Button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-2xl shadow-md transition-all">
              {loading ? 'Analyzing symptoms...' : 'Run Symptom Check'}
            </Button>
          </form>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <h2 className="text-xl font-bold text-stone-900 mb-2 flex items-center gap-2">
            AI Guidance & Recommendations
          </h2>
          <p className="text-sm text-stone-600 mb-4">
            Guidance is assistive only and must be reviewed by a professional clinician.
          </p>

          {error && <ErrorState title="AI assistant unavailable" description={error} />}

          {!result ? (
            <EmptyState title="Waiting for symptoms" description="Submit your symptoms on the left to receive AI triage recommendations and match with available doctors." />
          ) : (
            <div className="grid gap-5">
              {/* Triage Info */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-stone-200 bg-stone-50/50">
                <div>
                  <p className="text-xs uppercase tracking-wider text-stone-500 font-semibold">AI Recommended Specialization</p>
                  <p className="text-base font-bold text-stone-800">{result.recommendedSpecialization || 'General Physician'}</p>
                </div>
                <Badge tone={result.urgency === 'high' ? 'danger' : result.urgency === 'medium' ? 'warning' : 'success'}>
                  {result.urgency || 'low'} urgency
                </Badge>
              </div>

              {result.doctorNoteSummary && (
                <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4 text-sm text-sky-900 leading-relaxed shadow-sm">
                  <span className="font-semibold block mb-1">AI Symptom Summary:</span>
                  {result.doctorNoteSummary}
                </div>
              )}

              {result.redFlags?.length > 0 && (
                <div className="rounded-2xl border border-rose-100 bg-rose-50/75 p-4">
                  <p className="font-semibold text-rose-900 text-sm mb-1 flex items-center gap-1">
                    ⚠️ Red Flags (Seek urgent attention if present)
                  </p>
                  <ul className="grid gap-1 text-sm text-rose-800 list-disc list-inside">
                    {result.redFlags.map((flag) => (
                      <li key={flag}>{flag}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommended Doctors list */}
              <div>
                <h3 className="text-sm font-semibold text-stone-800 mb-3 uppercase tracking-wider">
                  Recommended Doctors ({result.recommendedSpecialization || 'General Physician'})
                </h3>
                {loadingDoctors ? (
                  <p className="text-sm text-stone-500">Searching matches...</p>
                ) : doctors.length === 0 ? (
                  <p className="text-sm text-stone-500 bg-stone-50 p-3 rounded-2xl border">No doctors matching this specialization. Let reception know or book manually.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {doctors.map((doc) => {
                      const isSelected = selectedDoctor?._id === doc._id;
                      return (
                        <button
                          key={doc._id}
                          type="button"
                          onClick={() => setSelectedDoctor(doc)}
                          className={`flex flex-col text-left p-3 rounded-2xl border transition-all ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-50/80 shadow-sm text-emerald-900 ring-2 ring-emerald-600/20'
                              : 'border-stone-200 bg-white hover:border-stone-300 text-stone-800'
                          }`}
                        >
                          <span className="font-bold text-sm">{doc.fullName}</span>
                          <span className="text-xs text-stone-500 mt-1">{doc.specialization}</span>
                          <span className="text-xs bg-stone-100 px-2 py-0.5 rounded text-stone-600 mt-2 self-start font-mono">
                            {doc.doctorCode}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Slots Selection */}
              {selectedDoctor && (
                <div className="border-t border-stone-100 pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <h3 className="text-sm font-semibold text-stone-800 uppercase tracking-wider">
                      Available Slots
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-stone-500">Select Date:</span>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="text-xs rounded-lg border border-stone-300 px-2 py-1 font-medium bg-white text-stone-800 outline-none focus:border-emerald-500"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>

                  {loadingSlots ? (
                    <p className="text-sm text-stone-500">Checking availability...</p>
                  ) : slots.length === 0 ? (
                    <p className="text-xs text-stone-500 bg-stone-50 p-4 rounded-xl border border-stone-200 text-center">
                      No availability found for {selectedDate}. Try another date.
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {slots.map((slot) => {
                        const isSlotSelected = selectedSlot === slot.startTime;
                        return (
                          <button
                            key={slot.startTime}
                            type="button"
                            disabled={!slot.available}
                            onClick={() => slot.available && setSelectedSlot(slot.startTime)}
                            className={`p-2 rounded-xl text-center border text-xs font-semibold transition ${
                              slot.available
                                ? isSlotSelected
                                  ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold'
                                  : 'border-stone-200 bg-white text-stone-800 hover:border-emerald-400 hover:bg-emerald-50/50'
                                : 'border-stone-150 bg-stone-100 text-stone-400 cursor-not-allowed'
                            }`}
                          >
                            <div>{slot.startTime}</div>
                            <div className="text-[10px] opacity-80">{slot.available ? 'Available' : 'Booked'}</div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              {activePatientId && selectedDoctor && selectedSlot && (
                <div className="border-t border-stone-100 pt-4 flex flex-col gap-3">
                  <Button
                    onClick={handleBookSlot}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-2xl shadow-md transition-all"
                  >
                    Book Appointment with {selectedDoctor.fullName} at {selectedSlot}
                  </Button>
                </div>
              )}

              {bookingStatus && (
                <div className={`p-3 rounded-2xl text-sm font-semibold border ${
                  bookingStatus.startsWith('Success')
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    : 'border-rose-200 bg-rose-50 text-rose-900'
                }`}>
                  {bookingStatus}
                </div>
              )}

              <div className="text-[11px] text-stone-500 italic leading-normal border-t border-stone-100 pt-3">
                {result.disclaimer || 'AI suggestions are assistive only and not a final diagnosis.'}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default SymptomChatbotWidget;
