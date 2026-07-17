const mongoose = require('mongoose');
const Invoice = require('../src/modules/billing/invoice.model');
const Appointment = require('../src/modules/appointments/appointment.model');

async function run() {
  const uri = 'mongodb+srv://Kaishav:Kaishav123@cms.mbzaovj.mongodb.net/ai-cms?retryWrites=true&w=majority';
  await mongoose.connect(uri);
  console.log('Connected to Atlas DB');

  try {
    const paidInvoices = await Invoice.find({ paymentStatus: 'paid' });
    console.log(`Found ${paidInvoices.length} paid invoices. Checking linked appointments...`);

    let updatedCount = 0;
    for (const invoice of paidInvoices) {
      if (invoice.appointmentId) {
        const appt = await Appointment.findById(invoice.appointmentId);
        if (appt && appt.paymentStatus !== 'paid') {
          appt.paymentStatus = 'paid';
          appt.amountPaid = appt.consultationFee || invoice.totalAmount;
          appt.paymentDate = invoice.updatedAt || new Date();
          appt.paymentMethod = 'digital';
          if (appt.status === 'booked') {
            appt.status = 'confirmed';
          }
          await appt.save();
          console.log(`Synced appointment ${appt._id} (${appt.appointmentId || ''}) to PAID status.`);
          updatedCount++;
        }
      }
    }
    console.log(`Synchronization finished. Updated ${updatedCount} appointments.`);
  } catch (err) {
    console.error('Sync failed:', err);
  } finally {
    await mongoose.disconnect();
  }
}

run().catch(console.error);
