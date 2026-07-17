const fs = require('fs');
const content = fs.readFileSync('d:/Office_work/CMS/frontend/src/features/consultations/ConsultationMainPanel.jsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.toLowerCase().includes('family') || line.toLowerCase().includes('medical') || line.toLowerCase().includes('social') || line.toLowerCase().includes('lifestyle') || line.toLowerCase().includes('system') || line.toLowerCase().includes('vital')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
