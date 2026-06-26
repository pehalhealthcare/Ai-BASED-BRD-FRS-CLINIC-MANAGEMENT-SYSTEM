import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, X, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { clinicApi } from '../../lib/api';

const BottomFloatingNavBar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [holidays, setHolidays] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredDate, setHoveredDate] = useState(null);
  const [hoveredHolidays, setHoveredHolidays] = useState([]);

  // Fetch holidays
  const fetchHolidays = async () => {
    try {
      const response = await clinicApi.getHolidays();
      setHolidays(response?.holidays || []);
    } catch (err) {
      console.error('Failed to fetch holidays for bottom bar', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHolidays();
    }
  }, [isOpen]);

  // Calendar Helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOffset = (y, m) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(year, month);
  const offset = getFirstDayOffset(year, month);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const formatLocalDate = (day) => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  // Get holidays for a specific day
  const getHolidaysForDay = (day) => {
    const formatted = formatLocalDate(day);
    return holidays.filter(h => {
      const hDate = new Date(h.holiday_date).toISOString().slice(0, 10);
      return hDate === formatted;
    });
  };

  const handleMouseEnter = (day, dayHolidays) => {
    if (dayHolidays.length > 0) {
      setHoveredDate(day);
      setHoveredHolidays(dayHolidays);
    }
  };

  const handleMouseLeave = () => {
    setHoveredDate(null);
    setHoveredHolidays([]);
  };

  return (
    <>
      {/* Floating Bottom Nav Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white/80 dark:bg-navy-900/80 backdrop-blur-lg border border-stone-200/60 dark:border-white/[0.08] shadow-2xl rounded-full px-5 py-2.5 flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 group">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 text-stone-700 dark:text-stone-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-bold text-xs cursor-pointer select-none transition-colors"
          title="View Clinic Holidays"
        >
          <CalendarIcon size={18} className="text-emerald-500 group-hover:rotate-6 transition-transform" />
          <span>Holidays Calendar</span>
        </button>
      </div>

      {/* Calendar Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-navy-900 rounded-3xl border border-stone-200 dark:border-white/[0.08] p-6 max-w-md w-full shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-stone-900 dark:text-white flex items-center gap-2">
                <CalendarIcon className="text-emerald-500" size={20} />
                <span>Clinic Holidays Calendar</span>
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-white transition p-1.5 rounded-xl cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Calendar Controls */}
            <div className="flex items-center justify-between mb-4 bg-stone-50 dark:bg-navy-800 p-2.5 rounded-2xl">
              <button
                onClick={prevMonth}
                className="p-1 rounded-lg hover:bg-stone-200 dark:hover:bg-white/[0.08] text-stone-600 dark:text-stone-400 transition cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-bold text-stone-850 dark:text-white capitalize">
                {currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <button
                onClick={nextMonth}
                className="p-1 rounded-lg hover:bg-stone-200 dark:hover:bg-white/[0.08] text-stone-600 dark:text-stone-400 transition cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-stone-500 mb-2">
              <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: offset }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayHolidays = getHolidaysForDay(day);
                const isHoliday = dayHolidays.length > 0;
                
                return (
                  <div
                    key={`day-${day}`}
                    onMouseEnter={() => handleMouseEnter(day, dayHolidays)}
                    onMouseLeave={handleMouseLeave}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center relative cursor-default transition-all ${
                      isHoliday
                        ? 'bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 font-extrabold shadow-sm'
                        : 'hover:bg-stone-50 dark:hover:bg-white/[0.04] text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    <span>{day}</span>
                    {isHoliday && (
                      <span className="w-1 h-1 rounded-full bg-rose-500 mt-0.5" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Hover Tooltip/Card Container */}
            <div className="min-h-24 mt-6 p-4 rounded-2xl bg-stone-50 dark:bg-navy-800 border border-stone-200/50 dark:border-white/[0.04] flex flex-col justify-center">
              {hoveredDate ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold text-xs">
                    <Info size={14} />
                    <span>Holiday on {hoveredDate} {currentDate.toLocaleString('en-US', { month: 'short' })}</span>
                  </div>
                  {hoveredHolidays.map((h, i) => (
                    <div key={h._id || i} className="text-[10px] text-stone-600 dark:text-stone-400 leading-normal">
                      <p className="font-extrabold text-stone-850 dark:text-stone-250">
                        {h.holiday_name}
                      </p>
                      <p className="text-[9px] mt-0.5 text-stone-500">
                        Closed: {h.all_clinics ? 'All Hospitals / Clinics' : (h.clinicId?.name || 'This Hospital')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-[10px] text-stone-400 dark:text-stone-500 italic">
                  Hover over a marked holiday date to see closed hospital details.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BottomFloatingNavBar;
