const fs = require('fs');
const content = fs.readFileSync('d:/Office_work/CMS/backend/src/modules/consultations/consultation.service.js', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('pdf') || line.includes('PDF') || line.includes('download')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
