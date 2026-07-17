const mongoose = require('mongoose');
require('dotenv').config();

const migrateLegacyData = async () => {
  try {
    const connStr = process.env.MONGO_URI_ATLAS || 'mongodb+srv://Kaishav:Kaishav123@cms.mbzaovj.mongodb.net/ai-cms?retryWrites=true&w=majority';
    console.log('Connecting to database...');
    await mongoose.connect(connStr);
    console.log('Connected!');

    const db = mongoose.connection.db;

    // 1. Fetch all organizations
    const orgs = await db.collection('organizations').find({}).toArray();
    console.log(`Found ${orgs.length} legacy organizations.`);

    for (const org of orgs) {
      console.log(`Migrating organization: ${org.name} (${org._id})...`);

      // Check if a clinic with the same code or name already exists
      let clinic = await db.collection('clinics').findOne({
        $or: [{ name: org.name }, { code: org.code }]
      });

      if (!clinic) {
        console.log(`Creating new Clinic document for organization: ${org.name}`);
        const insertRes = await db.collection('clinics').insertOne({
          name: org.name,
          code: org.code || 'ORG' + String(org._id).slice(-4).toUpperCase(),
          phone: org.phone || '9999999999',
          address: org.address || { country: 'India' },
          image: org.logo || '',
          approvalStatus: 'approved',
          isActive: true,
          subscription: {
            planId: new mongoose.Types.ObjectId('6a463837dc8d069ee38cdccf'), // Starter Plan
            billingCycle: 'monthly',
            startDate: new Date(),
            renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            status: 'Active'
          },
          createdAt: org.createdAt || new Date(),
          updatedAt: org.updatedAt || new Date()
        });
        clinic = { _id: insertRes.insertedId, name: org.name };
      }

      const clinicId = clinic._id;

      // Update all users referencing this organization
      const userRes = await db.collection('users').updateMany(
        { organizationId: org._id },
        { 
          $set: { clinicId }, 
          $unset: { organizationId: "" } 
        }
      );
      console.log(`Updated ${userRes.modifiedCount} users for clinic: ${clinic.name}`);

      // Update all doctors referencing this organization
      const docRes = await db.collection('doctors').updateMany(
        { organizationId: org._id },
        { 
          $set: { clinicId }, 
          $addToSet: { assignedClinics: clinicId },
          $unset: { organizationId: "" } 
        }
      );
      console.log(`Updated ${docRes.modifiedCount} doctors for clinic: ${clinic.name}`);

      // Update all receptionists referencing this organization
      const recepRes = await db.collection('receptionists').updateMany(
        { organizationId: org._id },
        { 
          $set: { clinicId }, 
          $addToSet: { assignedClinics: clinicId },
          $unset: { organizationId: "" } 
        }
      );
      console.log(`Updated ${recepRes.modifiedCount} receptionists for clinic: ${clinic.name}`);

      // Update all settlements/earnings
      await db.collection('organizationFinancialSettings').updateMany(
        { organizationId: org._id },
        { 
          $set: { clinicId }, 
          $unset: { organizationId: "" } 
        }
      );
      await db.collection('organizationEarnings').updateMany(
        { organizationId: org._id },
        { 
          $set: { clinicId }, 
          $unset: { organizationId: "" } 
        }
      );
    }

    // 2. Clean up any remaining references
    const cleanUsers = await db.collection('users').updateMany(
      { organizationId: { $exists: true } },
      { $unset: { organizationId: "" } }
    );
    console.log(`Cleaned up ${cleanUsers.modifiedCount} orphaned organizationId from users.`);

    const cleanDoctors = await db.collection('doctors').updateMany(
      { organizationId: { $exists: true } },
      { $unset: { organizationId: "" } }
    );
    console.log(`Cleaned up ${cleanDoctors.modifiedCount} orphaned organizationId from doctors.`);

    const cleanClinics = await db.collection('clinics').updateMany(
      { organizationId: { $exists: true } },
      { $unset: { organizationId: "" } }
    );
    console.log(`Cleaned up ${cleanClinics.modifiedCount} orphaned organizationId from clinics.`);

    // 3. Drop legacy collection
    try {
      await db.dropCollection('organizations');
      console.log('Successfully dropped legacy organizations collection.');
    } catch (dropErr) {
      console.log('No organizations collection to drop or already dropped.');
    }

    console.log('Migration finished successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrateLegacyData();
