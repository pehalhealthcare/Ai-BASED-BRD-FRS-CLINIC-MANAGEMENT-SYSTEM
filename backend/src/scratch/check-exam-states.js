const fs = require('fs');
const path = 'd:/Office_work/CMS/frontend/src/features/consultations/ConsultationPage.jsx';
const content = fs.readFileSync(path, 'utf8');

const lines = content.split('\n');
let found = -1;
lines.forEach((line, idx) => {
  if (line.includes('General Examination') && line.includes('span')) {
    found = idx;
  }
});

if (found !== -1) {
  for (let i = found - 10; i < found + 40; i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
} else {
  console.log('Not found');
}
