const fs = require('fs');
const f1 = 'd:/Office_work/CMS/frontend/src/features/consultations/ConsultationPage.jsx';
const f2 = 'd:/Office_work/CMS/frontend/src/pages/consultations/ConsultationPage.jsx';
console.log(f1, fs.existsSync(f1) ? fs.readFileSync(f1, 'utf8').split('\n').length : 'not found');
console.log(f2, fs.existsSync(f2) ? fs.readFileSync(f2, 'utf8').split('\n').length : 'not found');
