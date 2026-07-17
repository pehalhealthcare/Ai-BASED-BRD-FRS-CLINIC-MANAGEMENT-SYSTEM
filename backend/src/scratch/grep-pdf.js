const fs = require('fs');
const content = fs.readFileSync('d:/Office_work/CMS/frontend/src/features/appointments/AppointmentDetailsPage.jsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('PDF') || line.includes('pdf') || line.includes('Consultation') || line.includes('consultation')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
