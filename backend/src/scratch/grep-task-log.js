const fs = require('fs');
const content = fs.readFileSync('C:/Users/Kaishav Gupta/.gemini/antigravity-ide/brain/dae2e2b3-5ccd-446b-a6ad-b7228896fc4a/.system_generated/tasks/task-446.log', 'utf8');
const lines = content.split('\n');
let count = 0;
lines.forEach((line) => {
  if (line.includes('Failed') || line.includes('error') || line.includes('Error') || line.includes('pdf') || line.includes('PDF')) {
    console.log(line);
    count++;
    if (count > 50) process.exit(0);
  }
});
