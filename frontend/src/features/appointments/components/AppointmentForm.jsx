import AvailableSlots from './AvailableSlots';

const AppointmentForm = ({
  form,
  onChange,
  onSubmit,
  patients = [],
  doctors = [],
  slots = [],
  loadingSlots = false,
  submitting = false,
  error = ''
}) => {
  const updateField = (field, value) => {
    onChange({
      ...form,
      [field]: value
    });
  };

  return (
    <form className="grid gap-6" onSubmit={onSubmit}>
      <div className="grid gap-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40 md:grid-cols-2">
        <label className="grid gap-2 text-sm text-stone-700">
          Patient
          <select value={form.patientId} onChange={(event) => updateField('patientId', event.target.value)} className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100">
            <option value="">Select patient</option>
            {patients.map((patient) => (
              <option key={patient._id} value={patient._id}>
                {patient.fullName || patient.firstName} {patient.patientId ? `(${patient.patientId})` : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm text-stone-700">
          Doctor
          <select value={form.doctorId} onChange={(event) => updateField('doctorId', event.target.value)} className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100">
            <option value="">Select doctor</option>
            {doctors.map((doctor) => (
              <option key={doctor._id} value={doctor._id}>
                {doctor.fullName || doctor.firstName} {doctor.specialization ? `- ${doctor.specialization}` : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm text-stone-700">
          Appointment date
          <input type="date" value={form.appointmentDate} onChange={(event) => updateField('appointmentDate', event.target.value)} className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
        </label>
        <label className="grid gap-2 text-sm text-stone-700">
          Duration
          <select value={form.durationMinutes} onChange={(event) => updateField('durationMinutes', Number(event.target.value))} className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100">
            {[15, 30, 45, 60].map((duration) => (
              <option key={duration} value={duration}>
                {duration} minutes
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm text-stone-700">
          Appointment type
          <select value={form.appointmentType} onChange={(event) => updateField('appointmentType', event.target.value)} className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100">
            <option value="scheduled">Scheduled</option>
            <option value="walk_in">Walk in</option>
            <option value="follow_up">Follow up</option>
            <option value="teleconsultation">Teleconsultation</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm text-stone-700">
          Booking source
          <select value={form.source} onChange={(event) => updateField('source', event.target.value)} className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100">
            <option value="reception">Reception</option>
            <option value="admin">Admin</option>
            <option value="patient_app">Patient app</option>
            <option value="chatbot">Chatbot</option>
          </select>
        </label>
        
        <div className="md:col-span-2 grid gap-4 rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
          <label className="flex items-center gap-3 text-sm font-semibold text-amber-900 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isEarlyBooking || false}
              onChange={(event) => {
                const checked = event.target.checked;
                onChange({
                  ...form,
                  isEarlyBooking: checked,
                  earlyBookingReason: checked ? 'doctor_request' : 'none'
                });
              }}
              className="h-5 w-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
            />
            Schedule Early (Doctor's Request / Special Override)
          </label>

          {form.isEarlyBooking && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm text-stone-700">
                Reason for Early Booking
                <select
                  value={form.earlyBookingReason}
                  onChange={(event) => updateField('earlyBookingReason', event.target.value)}
                  className="rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="doctor_request">As per Doctor's Request</option>
                  <option value="receptionist_discretion">Receptionist Discretion</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm text-stone-700">
                Custom Start Time
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(event) => updateField('startTime', event.target.value)}
                  className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
            </div>
          )}
        </div>

        <label className="grid gap-2 text-sm text-stone-700 md:col-span-2">
          Reason for visit
          <textarea value={form.reasonForVisit} onChange={(event) => updateField('reasonForVisit', event.target.value)} rows={3} className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
        </label>
        <label className="grid gap-2 text-sm text-stone-700 md:col-span-2">
          Symptoms summary
          <textarea value={form.symptomsSummary} onChange={(event) => updateField('symptomsSummary', event.target.value)} rows={3} className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
        </label>
      </div>

      <div className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
        <div>
          <h3 className="text-lg font-semibold text-stone-900">Available slots</h3>
          <p className="mt-2 text-sm text-stone-600">Choose a bookable slot after selecting doctor, date, and duration.</p>
        </div>
        {loadingSlots ? <p className="text-sm text-stone-600">Fetching slots...</p> : null}
        <AvailableSlots slots={slots} selectedSlot={form.startTime} onSelect={(startTime) => updateField('startTime', startTime)} />
      </div>

      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={submitting} className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60">
          {submitting ? 'Booking...' : 'Book appointment'}
        </button>
      </div>
    </form>
  );
};

export default AppointmentForm;
