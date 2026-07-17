const fs = require('fs');
const path = 'd:/Office_work/CMS/frontend/src/features/consultations/ConsultationMainPanel.jsx';
const content = fs.readFileSync(path, 'utf8');

const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('chiefComplaint') || line.includes('clinicalNotes') || line.includes('diagnosis') || line.includes('treatmentPlan') || line.includes('advice') || line.includes('followUp')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
