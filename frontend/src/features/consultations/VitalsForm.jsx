const INPUTS = [
  { key: 'temperature', label: 'Temperature', unit: '°F', icon: '🌡️', type: 'number', step: '0.1' },
  { key: 'bloodPressure', label: 'Blood Pressure', unit: 'mmHg', icon: '🩸', type: 'text', placeholder: '120/80' },
  { key: 'pulse', label: 'Pulse Rate', unit: 'bpm', icon: '❤️', type: 'number' },
  { key: 'oxygenSaturation', label: 'SpO₂', unit: '%', icon: '🫁', type: 'number' },
  { key: 'weight', label: 'Weight', unit: 'kg', icon: '⚖️', type: 'number', step: '0.1' },
  { key: 'height', label: 'Height', unit: 'cm', icon: '📏', type: 'number', step: '0.1' },
  { key: 'respiratoryRate', label: 'Resp. Rate', unit: '/min', icon: '💨', type: 'number' }
];

const VitalsForm = ({ vitals = {}, onChange }) => (
  <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
    {INPUTS.map((input) => {
      const hasValue = vitals?.[input.key] !== '' && vitals?.[input.key] != null;

      return (
        <label
          key={input.key}
          className={`group relative grid gap-1.5 rounded-2xl border p-3.5 text-sm transition-all duration-200 cursor-text ${
            hasValue
              ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30'
              : 'border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800/50'
          } hover:border-emerald-300 hover:shadow-md`}
        >
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            <span className="text-base leading-none">{input.icon}</span>
            {input.label}
          </span>
          <div className="flex items-baseline gap-1.5">
            <input
              className="w-full bg-transparent text-lg font-semibold text-stone-900 dark:text-stone-100 outline-none placeholder:text-stone-300 dark:placeholder:text-stone-600"
              type={input.type}
              step={input.step}
              placeholder={input.placeholder || '—'}
              value={vitals?.[input.key] ?? ''}
              onChange={(event) => onChange(input.key, event.target.value)}
            />
            <span className="text-xs font-medium text-stone-400 dark:text-stone-500 whitespace-nowrap">
              {input.unit}
            </span>
          </div>
        </label>
      );
    })}
  </div>
);

export default VitalsForm;
