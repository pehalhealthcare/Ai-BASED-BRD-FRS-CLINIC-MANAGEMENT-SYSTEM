const fs = require('fs');
const content = fs.readFileSync('d:/Office_work/CMS/frontend/src/features/appointments/AppointmentDetailsPage.jsx', 'utf8');
console.log('Total lines:', content.split('\n').length);
