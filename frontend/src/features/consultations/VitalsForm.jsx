import { useMemo } from 'react';

const INPUTS = [
  { key: 'temperature',      label: 'Temperature', unit: '°F',    type: 'number', step: '0.1' },
  { key: 'bloodPressure',    label: 'BP',           unit: 'mmHg', type: 'text',   placeholder: '120/80' },
  { key: 'pulse',            label: 'Pulse',        unit: 'bpm',  type: 'number' },
  { key: 'respiratoryRate',  label: 'Resp. Rate',   unit: '/min', type: 'number' },
  { key: 'oxygenSaturation', label: 'SpO₂',         unit: '%',    type: 'number' },
  { key: 'weight',           label: 'Weight',       unit: 'kg',   type: 'number', step: '0.1' },
  { key: 'height',           label: 'Height',       unit: 'cm',   type: 'number', step: '0.1' },
  { key: '_bmi',             label: 'BMI',          unit: 'kg/m²', type: 'text',  readOnly: true },
];

/** 4 cells per row → 2 rows of 4 */
const COLS = 4;
const ROWS = Math.ceil(INPUTS.length / COLS); // 2

const VitalsForm = ({ vitals = {}, onChange }) => {
  const bmi = useMemo(() => {
    const w = parseFloat(vitals?.weight);
    const h = parseFloat(vitals?.height);
    return w > 0 && h > 0 ? (w / Math.pow(h / 100, 2)).toFixed(1) : '';
  }, [vitals?.weight, vitals?.height]);

  const getValue = (key) => key === '_bmi' ? bmi : (vitals?.[key] ?? '');

  return (
    <div
      className="vitals-grid-wrapper"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
        border: '1px solid #1f2d3d',
        borderRadius: '10px',
        overflow: 'hidden',
        width: '100%',
      }}
    >
      {INPUTS.map((inp, idx) => {
        const col = idx % COLS;
        const row = Math.floor(idx / COLS);
        const isLastRow = row === ROWS - 1;
        const isLastInRow = col === COLS - 1;

        const value = getValue(inp.key);
        const filled = value !== '' && value != null;

        return (
          <label
            key={inp.key}
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '10px 12px',
              minHeight: '68px',
              backgroundColor: '#0c1522',
              borderRight: !isLastInRow ? '1px solid #1f2d3d' : undefined,
              borderBottom: !isLastRow ? '1px solid #1f2d3d' : undefined,
              cursor: inp.readOnly ? 'default' : 'text',
              boxSizing: 'border-box',
            }}
          >
            {/* Label */}
            <span style={{
              fontSize: '9px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: '#64748b',
              marginBottom: '4px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {inp.label}
            </span>

            {/* Value + Unit */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', flex: 1 }}>
              <input
                readOnly={!!inp.readOnly}
                type={inp.readOnly ? 'text' : inp.type}
                step={inp.step}
                placeholder={inp.placeholder || '—'}
                value={value}
                onChange={inp.readOnly ? undefined : (e) => onChange(inp.key, e.target.value)}
                style={{
                  flex: '1 1 0%',
                  minWidth: 0,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '18px',
                  fontWeight: 700,
                  letterSpacing: '-0.3px',
                  color: filled ? '#e2e8f0' : '#374151',
                  fontFamily: 'inherit',
                  padding: 0,
                  cursor: inp.readOnly ? 'default' : 'text',
                }}
              />
              <span style={{
                flexShrink: 0,
                fontSize: '10px',
                fontWeight: 500,
                color: '#4b5563',
                whiteSpace: 'nowrap',
                lineHeight: 1,
              }}>
                {inp.unit}
              </span>
            </div>
          </label>
        );
      })}
    </div>
  );
};

export default VitalsForm;
