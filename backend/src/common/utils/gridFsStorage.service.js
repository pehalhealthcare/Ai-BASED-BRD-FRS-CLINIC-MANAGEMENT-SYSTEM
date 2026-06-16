const mongoose = require('mongoose');
const { GridFSBucket, ObjectId } = require('mongodb');
const zlib = require('zlib');
const { logger } = require('./logger');

let bucketInstance = null;

const getBucket = () => {
  if (bucketInstance) {
    return bucketInstance;
  }

  if (!mongoose.connection || !mongoose.connection.db) {
    throw new Error('MongoDB connection not established.');
  }

  bucketInstance = new GridFSBucket(mongoose.connection.db, {
    bucketName: 'doctor_files'
  });
  return bucketInstance;
};

/**
 * Parses a base64 data URI into mimetype and raw buffer.
 */
const parseBase64 = (base64Str) => {
  if (typeof base64Str !== 'string') return null;
  const matches = base64Str.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) return null;

  return {
    mimeType: matches[1],
    buffer: Buffer.from(matches[2], 'base64')
  };
};

/**
 * Uploads base64 file data to GridFS after compressing it with zlib gzip.
 * Returns the GridFS reference string "gridfs:<fileId>".
 */
const uploadBase64 = async (base64Str, filename = 'upload') => {
  const parsed = parseBase64(base64Str);
  if (!parsed) {
    // If it's not a data URI, it might be an existing gridfs reference or URL; return as-is
    return base64Str;
  }

  const { mimeType, buffer } = parsed;
  const compressedBuffer = zlib.gzipSync(buffer);
  const bucket = getBucket();

  const uploadStream = bucket.openUploadStream(filename, {
    metadata: { mimeType }
  });

  return new Promise((resolve, reject) => {
    uploadStream.on('finish', () => {
      resolve(`gridfs:${uploadStream.id.toString()}`);
    });
    uploadStream.on('error', (err) => {
      logger.error('GridFS Upload Error:', err);
      reject(err);
    });
    uploadStream.end(compressedBuffer);
  });
};

/**
 * Downloads a compressed file from GridFS and returns it as a base64 data URI.
 */
const downloadAsBase64 = async (reference) => {
  if (typeof reference !== 'string' || !reference.startsWith('gridfs:')) {
    return reference;
  }

  const fileIdStr = reference.split(':')[1];
  let fileId;
  try {
    fileId = new ObjectId(fileIdStr);
  } catch (_err) {
    return reference;
  }

  const bucket = getBucket();

  // Fetch file metadata to get MIME type
  const files = await mongoose.connection.db.collection('doctor_files.files').find({ _id: fileId }).toArray();
  if (!files || files.length === 0) {
    logger.warn(`GridFS File not found for ID: ${fileIdStr}`);
    return '';
  }

  const mimeType = files[0].metadata?.mimeType || 'application/octet-stream';

  return new Promise((resolve, reject) => {
    const downloadStream = bucket.openDownloadStream(fileId);
    const chunks = [];

    downloadStream.on('data', (chunk) => {
      chunks.push(chunk);
    });

    downloadStream.on('end', () => {
      try {
        const compressedBuffer = Buffer.concat(chunks);
        const decompressedBuffer = zlib.gunzipSync(compressedBuffer);
        const base64Data = decompressedBuffer.toString('base64');
        resolve(`data:${mimeType};base64,${base64Data}`);
      } catch (err) {
        logger.error('GridFS Decompression Error:', err);
        reject(err);
      }
    });

    downloadStream.on('error', (err) => {
      logger.error('GridFS Download Error:', err);
      reject(err);
    });
  });
};

/**
 * Deletes a file from GridFS.
 */
const deleteFile = async (reference) => {
  if (typeof reference !== 'string' || !reference.startsWith('gridfs:')) {
    return;
  }

  const fileIdStr = reference.split(':')[1];
  let fileId;
  try {
    fileId = new ObjectId(fileIdStr);
  } catch (_err) {
    return;
  }

  const bucket = getBucket();
  try {
    await bucket.delete(fileId);
  } catch (err) {
    logger.warn(`Failed to delete GridFS file ${fileIdStr}: ${err.message}`);
  }
};

module.exports = {
  uploadBase64,
  downloadAsBase64,
  deleteFile
};
