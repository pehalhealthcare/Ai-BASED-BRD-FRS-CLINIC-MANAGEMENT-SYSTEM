const { connectDB } = require('../src/config/database');
require('../src/modules/healthcare-catalog/globalMedicine.model');
const pharmacyService = require('../src/modules/pharmacy/pharmacy.service');
require('../src/modules/patients/patient.model');
require('../src/modules/doctors/doctor.model');
require('../src/modules/appointments/appointment.model');
require('../src/config/env');

connectDB().then(async () => {
  console.log('Connected to DB');
  
  // Call listMedicines directly with the query params that patient portal sent
  const result = await pharmacyService.listMedicines({
    requester: { role: 'patient' },
    query: {
      clinicId: '6a64ff8ff8f4ab3bd4696b79', // Patient's selected clinic (PhHealthCare)
      providerId: '6a5a6ee1b652682b5d78133a' // Selected pharmacy (Ram Krishna Pharmacy)
    }
  });

  console.log('Returned medicines count:', result.length || 0);
  console.log('Medicines details:', JSON.stringify(result));
  
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
