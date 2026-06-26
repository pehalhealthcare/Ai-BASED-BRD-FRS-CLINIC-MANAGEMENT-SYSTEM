const Receptionist = require('./receptionist.model');
const User = require('../users/user.model');
const { AppError } = require('../../common/utils/AppError');
const { HTTP_STATUS } = require('../../common/constants/httpStatus');
const gridFsStorage = require('../../common/utils/gridFsStorage.service');

const resolveReceptionistFiles = async (receptionist) => {
  if (!receptionist) return null;
  const recObj = receptionist.toObject ? receptionist.toObject() : receptionist;

  if (recObj.image && recObj.image.startsWith('gridfs:')) {
    recObj.image = await gridFsStorage.downloadAsBase64(recObj.image);
  }
  if (recObj.documentPdf && recObj.documentPdf.startsWith('gridfs:')) {
    recObj.documentPdf = await gridFsStorage.downloadAsBase64(recObj.documentPdf);
  }

  return recObj;
};

const processAndSaveFile = async (receptionist, field, newContent, filename) => {
  const currentRef = receptionist[field];

  if (newContent && newContent.startsWith('data:')) {
    const fileRef = await gridFsStorage.uploadBase64(newContent, filename);
    if (currentRef && currentRef.startsWith('gridfs:')) {
      await gridFsStorage.deleteFile(currentRef);
    }
    receptionist[field] = fileRef;
  } else {
    if (newContent === '' || !newContent) {
      if (currentRef && currentRef.startsWith('gridfs:')) {
        await gridFsStorage.deleteFile(currentRef);
      }
    }
    receptionist[field] = newContent || '';
  }
};

const getMyProfile = async ({ requester }) => {
  const receptionist = await Receptionist.findOne({ userId: requester._id })
    .populate('clinicId', 'name code address phone')
    .populate('userId', 'email name role');
  if (!receptionist) {
    throw new AppError('Receptionist profile not found', HTTP_STATUS.NOT_FOUND);
  }
  return resolveReceptionistFiles(receptionist);
};

const updateMyProfile = async ({ requester, payload }) => {
  const receptionist = await Receptionist.findOne({ userId: requester._id });
  if (!receptionist) {
    throw new AppError('Receptionist profile not found', HTTP_STATUS.NOT_FOUND);
  }

  if (payload.image !== undefined) {
    await processAndSaveFile(receptionist, 'image', payload.image, 'receptionist_photo');
  }
  if (payload.documentPdf !== undefined) {
    await processAndSaveFile(receptionist, 'documentPdf', payload.documentPdf, 'receptionist_document');
  }

  const allowedFields = [
    'qualification',
    'experienceYears',
    'organizationId',
    'currentAddress',
    'permanentAddress',
    'phone'
  ];

  for (const field of allowedFields) {
    if (payload[field] !== undefined) {
      receptionist[field] = payload[field];
    }
  }

  if (payload.organizationId !== undefined) {
    await User.updateOne({ _id: requester._id }, { $set: { organizationId: payload.organizationId || null } });
  }

  await receptionist.save();
  return resolveReceptionistFiles(receptionist);
};

const submitMyProfile = async ({ requester, payload }) => {
  const receptionist = await Receptionist.findOne({ userId: requester._id });
  if (!receptionist) {
    throw new AppError('Receptionist profile not found', HTTP_STATUS.NOT_FOUND);
  }

  if (payload.image !== undefined) {
    await processAndSaveFile(receptionist, 'image', payload.image, 'receptionist_photo');
  }
  if (payload.documentPdf !== undefined) {
    await processAndSaveFile(receptionist, 'documentPdf', payload.documentPdf, 'receptionist_document');
  }

  const allowedFields = [
    'qualification',
    'experienceYears',
    'organizationId',
    'currentAddress',
    'permanentAddress',
    'phone'
  ];

  for (const field of allowedFields) {
    if (payload[field] !== undefined) {
      receptionist[field] = payload[field];
    }
  }

  if (payload.organizationId !== undefined) {
    await User.updateOne({ _id: requester._id }, { $set: { organizationId: payload.organizationId || null } });
  }

  if (!receptionist.qualification?.trim()) {
    throw new AppError('Qualification is required for submission.', HTTP_STATUS.BAD_REQUEST);
  }
  if (!receptionist.documentPdf?.trim()) {
    throw new AppError('Document PDF is compulsory and must be uploaded.', HTTP_STATUS.BAD_REQUEST);
  }
  if (!receptionist.organizationId) {
    throw new AppError('Organization selection is required for submission.', HTTP_STATUS.BAD_REQUEST);
  }

  receptionist.approvalStatus = 'pending_approval';
  receptionist.reEditFields = {};
  receptionist.reEditComments = '';
  await receptionist.save();

  await User.updateOne(
    { _id: requester._id },
    { $set: { approvalStatus: 'pending_approval', reEditFields: {}, reEditComments: '' } }
  );

  return resolveReceptionistFiles(receptionist);
};

const acceptMySlot = async ({ requester }) => {
  const receptionist = await Receptionist.findOne({ userId: requester._id });
  if (!receptionist) {
    throw new AppError('Receptionist profile not found', HTTP_STATUS.NOT_FOUND);
  }

  receptionist.hasAcceptedSlot = true;
  receptionist.initialSlotAccepted = true;
  await receptionist.save();

  await User.updateOne(
    { _id: requester._id },
    { $set: { hasAcceptedSlot: true, initialSlotAccepted: true } }
  );

  return resolveReceptionistFiles(receptionist);
};

module.exports = {
  resolveReceptionistFiles,
  getMyProfile,
  updateMyProfile,
  submitMyProfile,
  acceptMySlot
};
