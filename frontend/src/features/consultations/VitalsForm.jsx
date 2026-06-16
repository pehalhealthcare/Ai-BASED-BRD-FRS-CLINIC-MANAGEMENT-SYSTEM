const FIELD_CLASS =
  'rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';

const INPUTS = [
  { key: 'temperature', label: 'Temperature (F)', type: 'number', step: '0.1' },
  { key: 'bloodPressure', label: 'Blood pressure', type: 'text', placeholder: '120/80' },
  { key: 'pulse', label: 'Pulse', type: 'number' },
  { key: 'oxygenSaturation', label: 'Oxygen saturation', type: 'number' },
  { key: 'weight', label: 'Weight (kg)', type: 'number', step: '0.1' },
  { key: 'height', label: 'Height (cm)', type: 'number', step: '0.1' },
  { key: 'respiratoryRate', label: 'Respiratory rate', type: 'number' }
];

const VitalsForm = ({ vitals = {}, onChange }) => (
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    {INPUTS.map((input) => (
      <label key={input.key} className="grid gap-2 text-sm font-medium text-stone-700">
        <span>{input.label}</span>
        <input
          className={FIELD_CLASS}
          type={input.type}
          step={input.step}
          placeholder={input.placeholder}
          value={vitals?.[input.key] ?? ''}
          onChange={(event) => onChange(input.key, event.target.value)}
        />
      </label>
    ))}
  </div>
);

export default VitalsForm;
