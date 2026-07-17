const fs = require('fs');
const path = 'd:/Office_work/CMS/frontend/src/features/consultations/ConsultationPage.jsx';
const content = fs.readFileSync(path, 'utf8');

const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.toLowerCase().includes('mic') || line.toLowerCase().includes('speech') || line.toLowerCase().includes('recording') || line.toLowerCase().includes('voice')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
