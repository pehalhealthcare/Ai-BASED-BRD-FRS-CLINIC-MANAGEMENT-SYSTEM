const pdfParse = require('pdf-parse');

// WeakMap cache: same Buffer reference → reuse parsed result
// Automatically GC'd when the buffer is no longer referenced
const _cache = new WeakMap();

/**
 * Parse a PDF buffer, caching the result by buffer reference.
 * If the same Buffer object is passed again, return the cached result instantly.
 * This avoids double-parsing when canParse() and parse() both receive the same buffer.
 */
const cachedPdfParse = async (buffer) => {
  if (_cache.has(buffer)) {
    return _cache.get(buffer);
  }
  const result = await pdfParse(buffer);
  _cache.set(buffer, result);
  return result;
};

module.exports = { cachedPdfParse };
