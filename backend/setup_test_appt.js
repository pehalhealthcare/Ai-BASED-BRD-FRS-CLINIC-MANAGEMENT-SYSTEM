const mongoose = require('mongoose');
const mongoUri = 'mongodb://Kaishav:Kaishav123@ac-3cqkn0c-shard-00-00.mbzaovj.mongodb.net:27017,ac-3cqkn0c-shard-00-01.mbzaovj.mongodb.net:27017,ac-3cqkn0c-shard-00-02.mbzaovj.mongodb.net:27017/ai-cms?replicaSet=atlas-onwb3s-shard-0&ssl=true&authSource=admin';

mongoose.connect(mongoUri)
  .then(async () => {
    const db = mongoose.connection.db;

    // 1. Get a template appointment to copy patient/doctor/clinic references from
    const templateAppt = await db.collection('appointments').findOne({ status: 'completed' });
    if (!templateAppt) {
      console.error('No completed template appointment found to copy references from!');
      process.exit(1);
    }

    const doctorId = templateAppt.doctorId;
    const patientId = templateAppt.patientId;
    const clinicId = templateAppt.clinicId;
    const createdBy = templateAppt.createdBy;

    // 2. Check if the target appointment already exists
    let appt = await db.collection('appointments').findOne({ appointmentCode: 'APT-2026-0711-032' });
    if (!appt) {
      console.log('Creating new appointment with code APT-2026-0711-032');
      const insertResult = await db.collection('appointments').insertOne({
        clinicId,
        patientId,
        doctorId,
        createdBy,
        appointmentDate: new Date('2026-08-01T00:00:00.000Z'),
        startTime: '10:30',
        endTime: '11:00',
        durationMinutes: 30,
        appointmentType: 'walk_in',
        status: 'in_consultation',
        reasonForVisit: 'Testing Consultation Workflow',
        source: 'reception',
        appointmentCode: 'APT-2026-0711-032',
        queueNumber: 3,
        tokenNumber: 3,
        paymentStatus: 'paid',
        consultationFee: 500,
        amountPaid: 500,
        paymentDate: new Date(),
        paymentMethod: 'cash',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      appt = await db.collection('appointments').findOne({ _id: insertResult.insertedId });
    } else {
      console.log('Updating existing appointment APT-2026-0711-032 to in_consultation');
      await db.collection('appointments').updateOne(
        { _id: appt._id },
        { $set: { status: 'in_consultation', paymentStatus: 'paid' } }
      );
      appt = await db.collection('appointments').findOne({ _id: appt._id });
    }

    console.log('Appointment ID:', appt._id);

    // 3. Create or update Token for this appointment
    let token = await db.collection('tokens').findOne({ appointmentId: appt._id });
    if (!token) {
      console.log('Creating Token T-003 for appointment');
      await db.collection('tokens').insertOne({
        appointmentId: appt._id,
        doctorId,
        tokenNumber: 'T-003',
        queuePosition: 3,
        priority: 'standard',
        status: 'in_consultation',
        otp: '',
        generatedTime: new Date(),
        calledTime: new Date(),
        consultationStarted: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } else {
      console.log('Updating Token status to in_consultation');
      await db.collection('tokens').updateOne(
        { _id: token._id },
        { $set: { status: 'in_consultation', consultationStarted: new Date() } }
      );
    }

    // 4. Create an active consultation document if none exists
    let consultation = await db.collection('consultations').findOne({ appointmentId: appt._id });
    if (!consultation) {
      console.log('Creating Consultation for appointment');
      await db.collection('consultations').insertOne({
        clinicId,
        patientId,
        doctorId,
        appointmentId: appt._id,
        status: 'in_progress',
        chiefComplaints: 'Testing Complete Consultation Flow',
        historyOfPresentIllness: 'N/A',
        diagnosis: { primary: 'Normal Checkup', secondary: '', ICD10Code: '' },
        prescriptions: [],
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } else {
      console.log('Updating Consultation status to in_progress');
      await db.collection('consultations').updateOne(
        { _id: consultation._id },
        { $set: { status: 'in_progress' } }
      );
    }

    // 5. Reset prescription status to 'draft'
    await db.collection('prescriptions').updateMany(
      { consultationId: consultation._id },
      { $set: { status: 'draft' } }
    );

    // 6. Broadcast live queue update so frontend UI auto-updates
    if (global.io) {
      console.log('Broadcasting queue update');
      global.io.emit('queue_update', { doctorId: String(doctorId) });
    }

    console.log('Setup finished successfully!');
    process.exit(0);
  });
