const clampScore = (value) => Math.max(0, Math.min(1, Number(value.toFixed(2))));

const calculateNoShowRisk = ({
  patientAppointmentHistory = {},
  appointmentDate,
  startTime,
  appointmentType = 'scheduled'
}) => {
  const reasons = [];
  let score = appointmentType === 'walk_in' ? 0.05 : 0.1;

  const noShowCount = Number(patientAppointmentHistory.noShowCount || 0);
  const cancelledCount = Number(patientAppointmentHistory.cancelledCount || 0);
  const completedCount = Number(patientAppointmentHistory.completedCount || 0);
  const lastAppointmentStatus = patientAppointmentHistory.lastAppointmentStatus || null;
  const normalizedDate = appointmentDate instanceof Date ? appointmentDate : new Date(appointmentDate);
  const today = new Date();
  const appointmentDateKey = new Date(
    Date.UTC(normalizedDate.getUTCFullYear(), normalizedDate.getUTCMonth(), normalizedDate.getUTCDate())
  )
    .toISOString()
    .slice(0, 10);
  const todayKey = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
    .toISOString()
    .slice(0, 10);
  const appointmentHour = Number(String(startTime || '00:00').split(':')[0]);

  if (noShowCount > 0) {
    score += 0.25;
    reasons.push('Patient has previous no-show history');
  }

  if (lastAppointmentStatus === 'cancelled' || cancelledCount > 0) {
    score += 0.15;
    reasons.push('Patient recently cancelled an appointment');
  }

  if (appointmentHour < 9) {
    score += 0.1;
    reasons.push('Early morning appointment');
  }

  if (appointmentHour >= 18) {
    score += 0.1;
    reasons.push('Late evening appointment');
  }

  if (appointmentDateKey === todayKey) {
    score += 0.1;
    reasons.push('Same-day booking');
  }

  if (completedCount >= 3) {
    score -= 0.1;
    reasons.push('Patient has a strong completion history');
  }

  if (appointmentType === 'walk_in') {
    score = Math.min(score, 0.2);
    reasons.push('Walk-in appointments typically have lower no-show risk');
  }

  const normalizedScore = clampScore(score);
  const level = normalizedScore < 0.35 ? 'low' : normalizedScore < 0.7 ? 'medium' : 'high';

  return {
    score: normalizedScore,
    level,
    reasons,
    generatedAt: new Date()
  };
};

module.exports = {
  calculateNoShowRisk
};
