const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../../../config/database');
const InsuranceProvider = require('../schemas/provider.schema');
const PatientInsurance = require('../schemas/policy.schema');
const InsuranceClaim = require('../schemas/claim.schema');
const Patient = require('../../patients/patient.model');
const Clinic = require('../../clinics/clinic.model');
const Invoice = require('../../billing/invoice.model');

const DUMMY_PROVIDERS = [
  {
    providerCode: 'STAR',
    providerName: 'Star Health Insurance',
    logo: 'star_health_logo.png',
    contactEmail: 'claims@starhealth.in',
    contactPhone: '1800-425-2255',
    website: 'https://www.starhealth.in',
    supportedClaimTypes: ['consultation', 'hospitalization', 'emergency', 'surgery']
  },
  {
    providerCode: 'NIVA',
    providerName: 'Niva Bupa Health Insurance',
    logo: 'niva_bupa_logo.png',
    contactEmail: 'customercare@nivabupa.com',
    contactPhone: '1860-500-8888',
    website: 'https://www.nivabupa.com',
    supportedClaimTypes: ['consultation', 'lab', 'hospitalization', 'emergency', 'surgery']
  },
  {
    providerCode: 'ICICI',
    providerName: 'ICICI Lombard General Insurance',
    logo: 'icici_lombard_logo.png',
    contactEmail: 'customersupport@icicilombard.com',
    contactPhone: '1800-2666',
    website: 'https://www.icicilombard.com',
    supportedClaimTypes: ['consultation', 'lab', 'pharmacy', 'hospitalization', 'emergency', 'surgery']
  },
  {
    providerCode: 'HDFC',
    providerName: 'HDFC Ergo General Insurance',
    logo: 'hdfc_ergo_logo.png',
    contactEmail: 'care@hdfcergo.com',
    contactPhone: '022-6234-6234',
    website: 'https://www.hdfcergo.com',
    supportedClaimTypes: ['consultation', 'lab', 'pharmacy', 'hospitalization', 'emergency', 'surgery']
  },
  {
    providerCode: 'CARE',
    providerName: 'Care Health Insurance',
    logo: 'care_health_logo.png',
    contactEmail: 'customerfirst@careinsurance.com',
    contactPhone: '1800-102-4488',
    website: 'https://www.careinsurance.com',
    supportedClaimTypes: ['consultation', 'lab', 'hospitalization', 'emergency', 'surgery']
  },
  {
    providerCode: 'MEDI',
    providerName: 'Medi Assist TPA',
    logo: 'medi_assist_logo.png',
    contactEmail: 'info@mediassist.in',
    contactPhone: '1800-425-9449',
    website: 'https://www.mediassist.in',
    supportedClaimTypes: ['consultation', 'lab', 'pharmacy', 'hospitalization', 'emergency', 'surgery']
  },
  {
    providerCode: 'PARAM',
    providerName: 'Paramount Health TPA',
    logo: 'paramount_logo.png',
    contactEmail: 'contact.tpa@paramounttpa.com',
    contactPhone: '022-6662-0808',
    website: 'https://www.paramounttpa.com',
    supportedClaimTypes: ['consultation', 'lab', 'hospitalization', 'emergency', 'surgery']
  },
  {
    providerCode: 'VIDAL',
    providerName: 'Vidal Health TPA',
    logo: 'vidal_health_logo.png',
    contactEmail: 'customerservice@vidalhealthtpa.com',
    contactPhone: '1860-345-3453',
    website: 'https://www.vidalhealthtpa.com',
    supportedClaimTypes: ['consultation', 'lab', 'pharmacy', 'hospitalization', 'emergency', 'surgery']
  }
];

const seedInsuranceData = async () => {
  try {
    console.log('Seeding Insurance Module...');
    
    // Clear old records
    await InsuranceProvider.deleteMany({});
    await PatientInsurance.deleteMany({});
    await InsuranceClaim.deleteMany({});
    console.log('Cleared existing insurance collections.');

    // Seed Providers
    const providers = await InsuranceProvider.insertMany(DUMMY_PROVIDERS);
    console.log(`Successfully seeded ${providers.length} Insurance Providers.`);

    // Fetch Patients
    const patients = await Patient.find({});
    if (patients.length === 0) {
      console.log('No patients found in DB. Skipping patient policy seeding.');
      return;
    }

    const clinics = await Clinic.find({});
    const invoices = await Invoice.find({});
    const defaultClinicId = clinics[0]?._id || new mongoose.Types.ObjectId();

    console.log(`Found ${patients.length} patients in DB. Seeding policies...`);

    const policies = [];
    
    // Seed policies for patients
    for (let i = 0; i < Math.min(patients.length, 50); i++) {
      const patient = patients[i];
      const provider = providers[i % providers.length];
      
      const numStr = String(1000 + i);
      const policyNumber = `${provider.providerCode}0000${numStr}`;
      
      const coverageAmount = 100000 * ((i % 5) + 1); // 100k, 200k, 300k, 400k, 500k
      const remainingCoverage = i % 4 === 0 ? 0 : coverageAmount - (15000 * (i % 5)); // Some fully used policies

      const relationTypes = ['Self', 'Spouse', 'Child', 'Parent'];
      const statusTypes = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'EXPIRED', 'SUSPENDED'];

      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);
      const endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + (i % 3 === 0 ? 1 : 2)); // Some expired already

      const policyStatus = new Date(endDate) < new Date() ? 'EXPIRED' : statusTypes[i % statusTypes.length];

      const nomineeNames = ['Sunita Sharma', 'Rajesh Verma', 'Anjali Gupta', 'Vikram Malhotra'];

      policies.push({
        patientId: patient._id,
        providerId: provider._id,
        policyNumber,
        memberId: `MEM-${100000 + i}`,
        groupId: `GRP-${500000 + i}`,
        policyHolderName: i % 3 === 0 ? patient.fullName : nomineeNames[i % nomineeNames.length],
        relationship: i % 3 === 0 ? 'Self' : relationTypes[i % relationTypes.length],
        policyStartDate: startDate,
        policyEndDate: endDate,
        coverageAmount,
        remainingCoverage,
        status: policyStatus,
        benefits: {
          consultation: true,
          lab: i % 2 === 0,
          pharmacy: i % 3 === 0,
          hospitalization: true,
          roomRent: true,
          surgery: true,
          emergency: true
        },
        nominee: nomineeNames[i % nomineeNames.length]
      });
    }

    const seededPolicies = await PatientInsurance.insertMany(policies);
    console.log(`Successfully seeded ${seededPolicies.length} Patient Insurance Policies.`);

    // Seed a few dummy claims
    if (invoices.length > 0) {
      const claims = [];
      for (let j = 0; j < Math.min(seededPolicies.length, 10); j++) {
        const policy = seededPolicies[j];
        const invoice = invoices[j % invoices.length];
        
        const claimNum = String(j + 1).padStart(6, '0');
        const claimId = `CLAIM-${claimNum}`;
        const claimAmount = invoice.totalAmount || 5000;

        const claimStatuses = ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SETTLED'];
        const status = claimStatuses[j % claimStatuses.length];

        const timeline = [
          { status: 'PENDING', description: 'Claim registered and details verified under mock portal.' }
        ];

        if (status !== 'PENDING') {
          timeline.push({ status: 'UNDER_REVIEW', description: 'Claim documents are being verified by TPA managers.' });
        }

        let approvedAmount = 0;
        let rejectionReason = '';
        if (status === 'APPROVED' || status === 'SETTLED') {
          approvedAmount = claimAmount;
          timeline.push({ status: 'APPROVED', description: `Approved for standard medical claim amount: ₹${approvedAmount}` });
        } else if (status === 'REJECTED') {
          rejectionReason = 'Non-covered diagnosis code.';
          timeline.push({ status: 'REJECTED', description: `Claim rejected. Reason: ${rejectionReason}` });
        }

        claims.push({
          claimId,
          patientId: policy.patientId,
          invoiceId: invoice._id,
          policyNumber: policy.policyNumber,
          clinicId: defaultClinicId,
          claimAmount,
          approvedAmount,
          status,
          rejectionReason,
          documents: ['prescription.pdf', 'invoice_copy.pdf'],
          timeline
        });
      }

      await InsuranceClaim.insertMany(claims);
      console.log('Successfully seeded sample claims.');
    }

    console.log('Insurance Module Seeding Complete!');
  } catch (err) {
    console.error('Seeding Insurance failed:', err);
  }
};

// If run directly
if (require.main === module) {
  connectDB()
    .then(seedInsuranceData)
    .then(disconnectDB)
    .catch((err) => {
      console.error('Seed execution script failed:', err);
      process.exit(1);
    });
}

module.exports = { seedInsuranceData };
