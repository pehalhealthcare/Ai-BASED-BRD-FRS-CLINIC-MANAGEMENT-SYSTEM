import { execSync } from 'child_process';

const diff = execSync('git diff src/features/consultations/ConsultationPage.jsx', { encoding: 'utf8' });
const lines = diff.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.startsWith('-') && !line.startsWith('---')) {
    console.log(`${i}: ${line}`);
  }
}
