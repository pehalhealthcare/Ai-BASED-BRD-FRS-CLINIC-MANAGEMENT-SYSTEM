const fs = require('fs');
const readline = require('readline');

async function run() {
  const fileStream = fs.createReadStream('d:/Office_work/CMS/frontend/src/features/patients/PatientPortalPage.jsx');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lineNumber = 0;
  for await (const line of rl) {
    lineNumber++;
    if (line.includes('hasHomeDelivery') || line.includes('hasPickup')) {
      console.log(`${lineNumber}: ${line.trim()}`);
    }
  }
}

run().catch(console.error);
