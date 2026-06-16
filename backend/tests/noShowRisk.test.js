const { calculateNoShowRisk } = require('../src/common/utils/noShowRisk');

describe('noShowRisk', () => {
  it('returns low risk for walk-in appointments with stable history', () => {
    const result = calculateNoShowRisk({
      patientAppointmentHistory: {
        completedCount: 4,
        noShowCount: 0,
        cancelledCount: 0
      },
      appointmentDate: '2026-04-25',
      startTime: '11:00',
      appointmentType: 'walk_in'
    });

    expect(result.level).toBe('low');
    expect(result.reasons).toEqual(expect.arrayContaining(['Walk-in appointments typically have lower no-show risk']));
  });

  it('returns medium risk with meaningful reasons', () => {
    const today = new Date().toISOString().slice(0, 10);
    const result = calculateNoShowRisk({
      patientAppointmentHistory: {
        completedCount: 1,
        noShowCount: 1,
        cancelledCount: 0
      },
      appointmentDate: today,
      startTime: '08:00',
      appointmentType: 'scheduled'
    });

    expect(result.level).toBe('medium');
    expect(result.reasons).toEqual(
      expect.arrayContaining(['Patient has previous no-show history', 'Same-day booking', 'Early morning appointment'])
    );
  });

  it('returns high risk when several risk factors stack', () => {
    const today = new Date().toISOString().slice(0, 10);
    const result = calculateNoShowRisk({
      patientAppointmentHistory: {
        completedCount: 0,
        noShowCount: 2,
        cancelledCount: 1,
        lastAppointmentStatus: 'cancelled'
      },
      appointmentDate: today,
      startTime: '18:30',
      appointmentType: 'scheduled'
    });

    expect(result.level).toBe('high');
    expect(result.reasons.length).toBeGreaterThanOrEqual(3);
  });
});
