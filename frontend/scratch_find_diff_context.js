import { execSync } from 'child_process';
const out = execSync('git diff -U40 frontend/src/features/consultations/ConsultationPage.jsx', { encoding: 'utf8' });
console.log(out);
