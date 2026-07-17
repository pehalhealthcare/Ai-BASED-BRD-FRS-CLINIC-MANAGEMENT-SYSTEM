const fs = require('fs');
const path = 'd:/Office_work/CMS/frontend/src/features/consultations/ConsultationPage.jsx';
const content = fs.readFileSync(path, 'utf8');

const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('chiefComplaint') || line.includes('General Examination') || line.includes('clinicalNotes') || line.includes('Primary Diagnosis') || line.includes('Diet Advice') || line.includes('Follow-up Instructions') || line.includes('Reason for Follow-up')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
