const fs = require('fs');
const content = fs.readFileSync('d:/Office_work/CMS/frontend/src/features/consultations/ConsultationPage.jsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('handleAddPastMedicalHistory') || line.includes('handleAddFamilyHistory') || line.includes('handleAddSocialHistory') || line.includes('handleAddSystemicExamination') || line.includes('handleAddCustomVital')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
