const fs = require('fs');
const path = 'd:/Office_work/CMS/frontend/src/features/consultations/ConsultationPage.jsx';
const content = fs.readFileSync(path, 'utf8');

const lines = content.split('\n');
for (let i = 1510; i < 1560; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
