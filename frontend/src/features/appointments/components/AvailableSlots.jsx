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
                  ? 'border-blue-600 bg-blue-50 text-blue-900'
                  : 'border-stone-300 bg-white text-stone-800 hover:border-blue-400 hover:bg-blue-50/70'
                : 'border-gray-300 bg-gray-200 text-gray-400 cursor-not-allowed'
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
