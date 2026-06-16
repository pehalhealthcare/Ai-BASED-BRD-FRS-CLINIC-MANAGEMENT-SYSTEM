import EmptyState from '../../../components/common/EmptyState';

const AvailableSlots = ({ slots = [], selectedSlot, onSelect }) => {
  if (!slots.length) {
    return <EmptyState title="No availability found" description="This doctor does not have bookable slots for the selected date and duration." />;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {slots.map((slot) => {
        const isSelected = selectedSlot === slot.startTime;

        return (
          <button
            key={`${slot.startTime}-${slot.endTime}`}
            type="button"
            disabled={!slot.available}
            onClick={() => slot.available && onSelect(slot.startTime)}
            className={`rounded-2xl border px-4 py-3 text-left transition ${
              slot.available
                ? isSelected
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                  : 'border-stone-300 bg-white text-stone-800 hover:border-emerald-400 hover:bg-emerald-50/70'
                : 'border-stone-200 bg-stone-100 text-stone-500'
            }`}
          >
            <p className="text-sm font-semibold">
              {slot.startTime} - {slot.endTime}
            </p>
            <p className="mt-1 text-xs">
              {slot.available ? 'Available' : slot.reason || 'Unavailable'}
            </p>
          </button>
        );
      })}
    </div>
  );
};

export default AvailableSlots;
