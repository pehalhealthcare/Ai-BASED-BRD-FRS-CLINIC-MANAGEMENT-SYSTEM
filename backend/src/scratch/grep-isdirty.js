const fs = require('fs');
const content = fs.readFileSync('d:/Office_work/CMS/frontend/src/features/consultations/ConsultationPage.jsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('isDirty') || line.includes('save') || line.includes('Save') || line.includes('autosave') || line.includes('autoSave')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
