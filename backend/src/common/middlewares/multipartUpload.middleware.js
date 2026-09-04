/**
 * Middleware for handling multipart and base64 file uploads in AI-CMS.
 * Parses file buffers safely without external unvetted dependencies.
 */
const multipartUpload = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';

  // If already parsed as JSON (e.g. base64 payload or test runner)
  if (req.body && (req.body.file || req.body.file_data || req.body.fileData)) {
    const rawData = req.body.file || req.body.file_data || req.body.fileData;
    let buffer = null;

    if (typeof rawData === 'string') {
      const base64Index = rawData.indexOf(';base64,');
      const cleanBase64 = base64Index !== -1 ? rawData.substring(base64Index + 8) : rawData;
      buffer = Buffer.from(cleanBase64, 'base64');
    } else if (Buffer.isBuffer(rawData)) {
      buffer = rawData;
    }

    req.file = {
      buffer,
      originalname: req.body.fileName || req.body.file_name || 'uploaded_prescription.pdf',
      mimetype: req.body.contentType || req.body.mimeType || 'application/pdf',
      size: buffer ? buffer.length : 0
    };
    return next();
  }

  // If multipart form data
  if (contentType.startsWith('multipart/form-data')) {
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    const boundary = boundaryMatch ? (boundaryMatch[1] || boundaryMatch[2]) : null;

    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const fullBuffer = Buffer.concat(chunks);
      if (boundary) {
        const boundaryMarker = `--${boundary}`;
        const parts = fullBuffer.toString('binary').split(boundaryMarker);
        for (const part of parts) {
          if (part.includes('filename="')) {
            const filenameMatch = part.match(/filename="([^"]+)"/);
            const contentTypeMatch = part.match(/Content-Type:\s*([^\r\n]+)/i);
            const headerEndIndex = part.indexOf('\r\n\r\n');
            if (headerEndIndex !== -1) {
              const fileBinary = part.substring(headerEndIndex + 4, part.lastIndexOf('\r\n'));
              const fileBuf = Buffer.from(fileBinary, 'binary');
              req.file = {
                buffer: fileBuf,
                originalname: filenameMatch ? filenameMatch[1] : 'uploaded_prescription.pdf',
                mimetype: contentTypeMatch ? contentTypeMatch[1] : 'application/pdf',
                size: fileBuf.length
              };
            }
          }
        }
      }
      return next();
    });
    req.on('error', (err) => next(err));
    return;
  }

  return next();
};

module.exports = {
  multipartUpload
};
