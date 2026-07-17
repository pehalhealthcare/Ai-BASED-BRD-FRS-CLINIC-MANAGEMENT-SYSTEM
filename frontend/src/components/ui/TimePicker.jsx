import { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';

export const parseTime12 = (timeStr) => {
  if (!timeStr) return { h: '09', m: '00', p: 'AM' };
  const match = String(timeStr).match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return { h: '09', m: '00', p: 'AM' };
  return {
    h: match[1].padStart(2, '0'),
    m: match[2].padStart(2, '0'),
    p: match[3].toUpperCase()
  };
};

export const formatTime12 = (h, m, p) => `${h}:${m} ${p}`;

const TimePicker = ({ value, onChange, label, minuteInterval = 1, className = '' }) => {
  const [open, setOpen] = useState(false);
  const [typedValue, setTypedValue] = useState(value || '09:00 AM');
  const [mode, setMode] = useState('hours'); // 'hours' or 'minutes'
  const parsed = parseTime12(value);
  const [draft, setDraft] = useState(parsed);
  const [validationError, setValidationError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const clockRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    setTypedValue(value || '09:00 AM');
    setDraft(parseTime12(value));
    setValidationError('');
  }, [value]);

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popoverHeight = 350;
      const popoverWidth = 260;
      
      const spaceBelow = window.innerHeight - rect.bottom;
      let top = rect.bottom + window.scrollY + 6;
      if (spaceBelow < popoverHeight && rect.top > popoverHeight) {
        top = rect.top + window.scrollY - popoverHeight - 6;
      }
      
      let left = rect.left + window.scrollX + (rect.width / 2) - (popoverWidth / 2);
      left = Math.max(10, Math.min(window.innerWidth - popoverWidth - 10, left));
      
      setPosition({ top, left });
    }
  };

  useEffect(() => {
    if (open) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
    }
    return () => window.removeEventListener('resize', updatePosition);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target) &&
        triggerRef.current && !triggerRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeys = (e) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'Enter') handleDone();
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [open, draft]);

  const calculateTimeFromCoords = (clientX, clientY) => {
    if (!clockRef.current) return;
    const rect = clockRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    let rad = Math.atan2(dx, -dy);
    if (rad < 0) rad += 2 * Math.PI;

    if (mode === 'hours') {
      let h = Math.round((rad / (2 * Math.PI)) * 12);
      if (h === 0) h = 12;
      setDraft(d => ({ ...d, h: String(h).padStart(2, '0') }));
    } else {
      let m = Math.round((rad / (2 * Math.PI)) * 60) % 60;
      if (minuteInterval > 1) {
        m = Math.round(m / minuteInterval) * minuteInterval % 60;
      }
      setDraft(d => ({ ...d, m: String(m).padStart(2, '0') }));
    }
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    calculateTimeFromCoords(e.clientX, e.clientY);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    calculateTimeFromCoords(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      if (mode === 'hours') {
        setTimeout(() => setMode('minutes'), 250);
      }
    }
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, mode]);

  const handleTouchStart = (e) => {
    if (e.touches && e.touches[0]) {
      setIsDragging(true);
      calculateTimeFromCoords(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    if (e.touches && e.touches[0]) {
      calculateTimeFromCoords(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchEnd = () => {
    if (isDragging) {
      setIsDragging(false);
      if (mode === 'hours') {
        setTimeout(() => setMode('minutes'), 250);
      }
    }
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
    }
    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, mode]);

  const validateTypedInput = (val) => {
    const regex = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s*(AM|PM)$/i;
    if (!regex.test(val.trim())) {
      setValidationError('Invalid format. Use hh:mm AM/PM');
      return false;
    }
    setValidationError('');
    return true;
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setTypedValue(val);
    if (validateTypedInput(val)) {
      const p = parseTime12(val);
      setDraft(p);
      onChange(formatTime12(p.h, p.m, p.p));
    }
  };

  const handleDone = () => {
    const finalVal = formatTime12(draft.h, draft.m, draft.p);
    setTypedValue(finalVal);
    onChange(finalVal);
    setOpen(false);
  };

  const hoursArray = ['12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];
  const minutesLabelMap = {
    0: '00', 5: '05', 10: '10', 15: '15', 20: '20', 25: '25',
    30: '30', 35: '35', 40: '40', 45: '45', 50: '50', 55: '55'
  };

  const getHourAngle = (h) => {
    const hourVal = parseInt(h, 10) % 12;
    return (hourVal * 30) * Math.PI / 180;
  };

  const getMinuteAngle = (m) => {
    const minVal = parseInt(m, 10);
    return (minVal * 6) * Math.PI / 180;
  };

  const angle = mode === 'hours' ? getHourAngle(draft.h) : getMinuteAngle(draft.m);
  const handLength = 58;
  const handX = 90 + handLength * Math.sin(angle);
  const handY = 90 - handLength * Math.cos(angle);

  const popoverContent = open && (
    <div
      ref={popoverRef}
      style={{
        position: 'absolute',
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 9999
      }}
      className="bg-white rounded-3xl shadow-2xl border border-slate-100/80 p-4 flex flex-col w-[260px] animate-in fade-in zoom-in-95 duration-150 select-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
        <div className="flex items-baseline gap-1">
          <button
            type="button"
            onClick={() => setMode('hours')}
            className={`text-2xl font-black transition-colors ${
              mode === 'hours' ? 'text-indigo-650' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {draft.h}
          </button>
          <span className="text-xl font-bold text-slate-300">:</span>
          <button
            type="button"
            onClick={() => setMode('minutes')}
            className={`text-2xl font-black transition-colors ${
              mode === 'minutes' ? 'text-indigo-650' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {draft.m}
          </button>
        </div>
        
        {/* AM/PM Switcher */}
        <div className="flex bg-slate-100 rounded-xl p-0.5 border border-slate-200/50">
          {['AM', 'PM'].map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setDraft(d => ({ ...d, p }))}
              className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${
                draft.p === p ? 'bg-white text-indigo-650 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Analog Clock Dial */}
      <div className="flex items-center justify-center py-2 bg-white">
        <div
          ref={clockRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className="w-[180px] h-[180px] bg-slate-50 border border-slate-100 rounded-full relative flex items-center justify-center cursor-pointer"
        >
          {/* Center Pin */}
          <div className="w-2 h-2 bg-indigo-600 rounded-full z-30" />
          
          {/* Clock Hand line */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
            <line
              x1="90"
              y1="90"
              x2={handX}
              y2={handY}
              stroke="#4f46e5"
              strokeWidth="2"
              strokeLinecap="round"
              className="transition-all duration-75 ease-out"
            />
            <circle
              cx={handX}
              cy={handY}
              r="10"
              fill="#4f46e5"
              className="transition-all duration-75 ease-out"
            />
          </svg>

          {/* Render Hours */}
          {mode === 'hours' && hoursArray.map((h, i) => {
            const hAngle = (i * 30) * Math.PI / 180;
            const hDist = 58; 
            const hX = 90 + hDist * Math.sin(hAngle);
            const hY = 90 - hDist * Math.cos(hAngle);
            const isSelected = parseInt(draft.h, 10) === parseInt(h, 10);

            return (
              <div
                key={h}
                style={{
                  position: 'absolute',
                  left: `${hX}px`,
                  top: `${hY}px`,
                  transform: 'translate(-50%, -50%)'
                }}
                className={`w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-bold pointer-events-none ${
                  isSelected ? 'text-white font-black z-30' : 'text-slate-600'
                }`}
              >
                {h}
              </div>
            );
          })}

          {/* Render Minutes (prominent intervals labeled) */}
          {mode === 'minutes' && Object.keys(minutesLabelMap).map((mKey) => {
            const mVal = parseInt(mKey, 10);
            const mAngle = (mVal * 6) * Math.PI / 180;
            const mDist = 58;
            const mX = 90 + mDist * Math.sin(mAngle);
            const mY = 90 - mDist * Math.cos(mAngle);
            const isSelected = parseInt(draft.m, 10) === mVal;

            return (
              <div
                key={mKey}
                style={{
                  position: 'absolute',
                  left: `${mX}px`,
                  top: `${mY}px`,
                  transform: 'translate(-50%, -50%)'
                }}
                className={`w-6 h-6 flex items-center justify-center rounded-full text-[9px] font-bold pointer-events-none ${
                  isSelected ? 'text-white font-black z-30' : 'text-slate-500'
                }`}
              >
                {minutesLabelMap[mKey]}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-3">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 text-[10px] font-bold transition-all"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleDone}
          className="px-4 py-1.5 rounded-xl bg-indigo-650 hover:bg-white hover:text-black bg-indigo-700 text-white text-[10px] font-black transition-all shadow-md shadow-indigo-650/10"
        >
          Done ✓
        </button>
      </div>
    </div>
  );

  return (
    <div className={`relative ${className}`}>
      <div ref={triggerRef} className="relative flex items-center">
        <input
          type="text"
          value={typedValue}
          onChange={handleInputChange}
          onClick={() => setOpen(true)}
          className={`w-full bg-white border rounded-xl pl-3 pr-8 py-1.5 text-xs text-slate-700 font-bold outline-none transition-all ${
            validationError
              ? 'border-rose-400 focus:border-rose-500 bg-rose-50/10'
              : 'border-slate-200 focus:border-indigo-400 focus:bg-indigo-50/5'
          }`}
          placeholder="09:00 AM"
        />
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="absolute right-2.5 text-slate-400 hover:text-indigo-650 transition-colors"
        >
          🕒
        </button>
      </div>
      {validationError && (
        <p className="text-[8px] text-rose-500 font-bold mt-0.5 ml-1">{validationError}</p>
      )}

      {open && ReactDOM.createPortal(popoverContent, document.body)}
    </div>
  );
};

export default TimePicker;
