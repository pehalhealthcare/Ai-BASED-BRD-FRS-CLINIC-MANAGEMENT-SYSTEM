const mongoose = require('mongoose');

const Medicine = require('./medicine.model');
const DispensingRecord = require('./dispensingRecord.model');
const PharmacySale = require('./pharmacySale.model');

const populateMedicine = (query) =>
  query
    .populate('createdBy', 'name email role')
    .populate('updatedBy', 'name email role')
    .populate('globalMedicineId')
    .populate('batches');

const populateDispensingRecord = (query) =>
  query
    .populate('prescriptionId', 'prescriptionNumber status dispensingStatus medicines advice followUpDate')
    .populate('patientId', 'patientId firstName lastName fullName gender age phone')
    .populate('doctorId', 'doctorCode firstName lastName fullName specialization')
    .populate('dispensedBy', 'name email role')
    .populate('items.medicineId', 'code name genericName brandName form strength manufacturer unitPrice');

const populatePharmacySale = (query) =>
  query
    .populate('dispensingRecordId')
    .populate('patientId', 'patientId firstName lastName fullName')
    .populate('invoiceId', 'invoiceNumber paymentStatus invoiceStatus totalAmount dueAmount')
    .populate('createdBy', 'name email role')
    .populate('updatedBy', 'name email role');

const createMedicine = (data) => Medicine.create(data);

const findMedicineDocumentById = ({ id, clinicId }) => Medicine.findOne({ _id: id, clinicId });

const findMedicineDocumentsByIds = ({ ids, clinicId }) => Medicine.find({ _id: { $in: ids }, clinicId }).populate('batches');

const findMedicineById = ({ id, clinicId, populateDetails = true, lean = false }) => {
  let query = Medicine.findOne({ _id: id, clinicId });

  if (populateDetails) {
    query = populateMedicine(query);
  }

  if (lean) {
    query = query.lean();
  }

  return query;
};

const listMedicines = ({ filter, sort = { name: 1 } }) => populateMedicine(Medicine.find(filter).sort(sort)).lean();

const updateMedicine = ({ id, clinicId, data, populateDetails = true }) => {
  let query = Medicine.findOneAndUpdate({ _id: id, clinicId }, data, {
    new: true,
    runValidators: true
  });

  if (populateDetails) {
    query = populateMedicine(query);
  }

  return query;
};

const createDispensingRecord = (data) => DispensingRecord.create(data);

const listDispensingRecords = async ({ filter, page = 1, limit = 10, sort = { dispensedAt: -1, createdAt: -1 } }) => {
  const skip = (page - 1) * limit;
  const [dispensingRecords, total] = await Promise.all([
    populateDispensingRecord(DispensingRecord.find(filter).sort(sort).skip(skip).limit(limit)).lean(),
    DispensingRecord.countDocuments(filter)
  ]);

  return { dispensingRecords, total };
};

const findDispensingRecordById = ({ id, clinicId, populateDetails = true, lean = false }) => {
  let query = DispensingRecord.findOne({ _id: id, clinicId });

  if (populateDetails) {
    query = populateDispensingRecord(query);
  }

  if (lean) {
    query = query.lean();
  }

  return query;
};

const findDispensingByPrescriptionId = ({ prescriptionId, clinicId, populateDetails = true, lean = false }) => {
  let query = DispensingRecord.findOne({ prescriptionId, clinicId });

  if (populateDetails) {
    query = populateDispensingRecord(query);
  }

  if (lean) {
    query = query.lean();
  }

  return query;
};

const updateDispensingRecord = ({ id, clinicId, data, populateDetails = true }) => {
  let query = DispensingRecord.findOneAndUpdate({ _id: id, clinicId }, data, {
    new: true,
    runValidators: true
  });

  if (populateDetails) {
    query = populateDispensingRecord(query);
  }

  return query;
};

const createPharmacySale = (data) => PharmacySale.create(data);

const findSaleByDispensingId = ({ dispensingRecordId, clinicId, populateDetails = true, lean = false }) => {
  let query = PharmacySale.findOne({ dispensingRecordId, clinicId });

  if (populateDetails) {
    query = populatePharmacySale(query);
  }

  if (lean) {
    query = query.lean();
  }

  return query;
};

const findSalesByDispensingIds = ({ dispensingRecordIds, clinicId }) =>
  PharmacySale.find({ clinicId, dispensingRecordId: { $in: dispensingRecordIds } }).lean();

const getMedicineSalesHistory = async ({ clinicId, medicineId, days = 90 }) => {
  const startDate = new Date();
  startDate.setUTCHours(0, 0, 0, 0);
  startDate.setUTCDate(startDate.getUTCDate() - Math.max(Number(days || 90) - 1, 0));

  return DispensingRecord.aggregate([
    {
      $match: {
        clinicId: new mongoose.Types.ObjectId(String(clinicId)),
        status: 'dispensed',
        dispensedAt: { $gte: startDate }
      }
    },
    { $unwind: '$items' },
    {
      $match: {
        'items.medicineId': new mongoose.Types.ObjectId(String(medicineId))
      }
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$dispensedAt'
          }
        },
        quantity_sold: { $sum: '$items.quantity' }
      }
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        date: '$_id',
        quantity_sold: 1
      }
    }
  ]);
};

module.exports = {
  createMedicine,
  findMedicineDocumentById,
  findMedicineDocumentsByIds,
  findMedicineById,
  listMedicines,
  updateMedicine,
  createDispensingRecord,
  listDispensingRecords,
  findDispensingRecordById,
  findDispensingByPrescriptionId,
  updateDispensingRecord,
  createPharmacySale,
  findSaleByDispensingId,
  findSalesByDispensingIds,
  getMedicineSalesHistory
};
