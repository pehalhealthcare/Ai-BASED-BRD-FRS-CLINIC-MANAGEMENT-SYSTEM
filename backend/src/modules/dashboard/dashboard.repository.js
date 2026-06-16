const Patient = require('../patients/patient.model');
const Appointment = require('../appointments/appointment.model');
const Consultation = require('../consultations/consultation.model');
const Prescription = require('../prescriptions/prescription.model');
const Invoice = require('../billing/invoice.model');
const { LabOrder } = require('../labs/labOrder.model');
const LabReport = require('../labs/labReport.model');
const Medicine = require('../pharmacy/medicine.model');
const DispensingRecord = require('../pharmacy/dispensingRecord.model');
const PharmacySale = require('../pharmacy/pharmacySale.model');
const NotificationLog = require('../notifications/notificationLog.model');
const FollowUpTask = require('../notifications/followUpTask.model');
const Doctor = require('../doctors/doctor.model');

const countDocuments = (Model, filter) => Model.countDocuments(filter);
const aggregateDocuments = (Model, pipeline) => Model.aggregate(pipeline);
const distinctValues = (Model, field, filter) => Model.distinct(field, filter);
const findDocuments = (Model, filter, projection = null, options = {}) =>
  Model.find(filter, projection, options).lean();

module.exports = {
  models: {
    Patient,
    Appointment,
    Consultation,
    Prescription,
    Invoice,
    LabOrder,
    LabReport,
    Medicine,
    DispensingRecord,
    PharmacySale,
    NotificationLog,
    FollowUpTask,
    Doctor
  },
  countDocuments,
  aggregateDocuments,
  distinctValues,
  findDocuments
};
