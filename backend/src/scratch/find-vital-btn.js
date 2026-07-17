const fs = require('fs');
const content = fs.readFileSync('d:/Office_work/CMS/frontend/src/features/consultations/ConsultationPage.jsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('Vital') || line.includes('vitals')) {
    if (line.includes('Add') || line.includes('button')) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  }
});
