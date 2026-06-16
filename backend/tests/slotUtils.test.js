const {
  parseTimeToMinutes,
  minutesToTime,
  calculateEndTime,
  isTimeRangeOverlap,
  generateSlots
} = require('../src/common/utils/slotUtils');

describe('slotUtils', () => {
  it('parses and formats times consistently', () => {
    expect(parseTimeToMinutes('09:30')).toBe(570);
    expect(minutesToTime(570)).toBe('09:30');
    expect(calculateEndTime('09:30', 45)).toBe('10:15');
  });

  it('detects overlapping time ranges', () => {
    expect(isTimeRangeOverlap('09:00', '09:30', '09:15', '09:45')).toBe(true);
    expect(isTimeRangeOverlap('09:00', '09:30', '09:30', '10:00')).toBe(false);
  });

  it('generates slots with booked and blocked reasons', () => {
    const slots = generateSlots({
      availability: [
        {
          dayOfWeek: 'monday',
          isAvailable: true,
          startTime: '09:00',
          endTime: '11:00',
          slotDurationMinutes: 30
        }
      ],
      existingAppointments: [
        {
          startTime: '09:30',
          endTime: '10:00'
        }
      ],
      blockedSlots: [
        {
          date: '2026-04-27',
          startTime: '10:30',
          endTime: '11:00',
          reason: 'Lunch break'
        }
      ],
      date: '2026-04-27',
      durationMinutes: 30
    });

    expect(slots).toEqual([
      { startTime: '09:00', endTime: '09:30', available: true, reason: null },
      { startTime: '09:30', endTime: '10:00', available: false, reason: 'Booked' },
      { startTime: '10:00', endTime: '10:30', available: true, reason: null },
      { startTime: '10:30', endTime: '11:00', available: false, reason: 'Lunch break' }
    ]);
  });
});
