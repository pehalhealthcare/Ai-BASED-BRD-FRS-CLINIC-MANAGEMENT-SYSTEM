/**
 * Multi-Pass Robust QR Image Decoder for AICMS
 * 
 * Pre-processes images using in-memory HTML5 Canvas and runs multi-strategy
 * decoding using `jsQR`, native `BarcodeDetector` (where available), and `Html5Qrcode`.
 * 
 * Handles:
 * - Direct screenshots (Patient portal, lab orders, appointment tickets)
 * - Mobile camera photos of screens or printed receipts
 * - Cropped, rotated, low-contrast, or dark-mode QR images
 * - High-resolution uncompressed camera photos
 */

import jsQR from 'jsqr';

/**
 * Loads an image from a File, Blob, or URL string
 * @param {File|Blob|string} source 
 * @returns {Promise<HTMLImageElement>}
 */
export const loadImageElement = (source) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    let urlToRevoke = null;

    img.onload = () => {
      if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);
      resolve(img);
    };

    img.onerror = (_err) => {
      if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);
      reject(new Error('Failed to load image file for decoding.'));
    };

    if (typeof source === 'string') {
      img.src = source;
    } else if (source instanceof Blob || source instanceof File) {
      urlToRevoke = URL.createObjectURL(source);
      img.src = urlToRevoke;
    } else {
      reject(new Error('Unsupported image source type.'));
    }
  });
};

/**
 * Creates an in-memory canvas and draws an image with optional scale and region
 */
const createCanvas = (width, height) => {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  return { canvas, ctx };
};

/**
 * Decode attempt using jsQR
 */
const tryJsQr = (imageData, width, height) => {
  if (!imageData || !width || !height) return null;
  try {
    const result = jsQR(imageData.data, width, height, {
      inversionAttempts: 'attemptBoth'
    });
    if (result && result.data && result.data.trim().length > 0) {
      return result.data.trim();
    }
  } catch (_e) {
    // ignore pass decode error
  }
  return null;
};

/**
 * Decode attempt using native BarcodeDetector API (Chromium / Web standard)
 */
const tryNativeBarcodeDetector = async (canvas) => {
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
      const barcodes = await barcodeDetector.detect(canvas);
      if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
        return barcodes[0].rawValue.trim();
      }
    } catch (_e) {
      // BarcodeDetector not supported or failed
    }
  }
  return null;
};

/**
 * Pre-processing Pass: Grayscale
 */
const applyGrayscale = (imageData) => {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const gray = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    d[i] = gray;
    d[i + 1] = gray;
    d[i + 2] = gray;
  }
  return imageData;
};

/**
 * Pre-processing Pass: High Contrast
 */
const applyContrast = (imageData, contrast = 1.6) => {
  const d = imageData.data;
  const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const adjusted = Math.min(255, Math.max(0, factor * (gray - 128) + 128));
    d[i] = adjusted;
    d[i + 1] = adjusted;
    d[i + 2] = adjusted;
  }
  return imageData;
};

/**
 * Pre-processing Pass: Adaptive / Global Thresholding (Binarization)
 */
const applyBinarization = (imageData, threshold = 128) => {
  const d = imageData.data;
  let totalLum = 0;
  for (let i = 0; i < d.length; i += 4) {
    totalLum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  }
  const avgLum = totalLum / (d.length / 4);
  const effectiveThreshold = avgLum > 0 && avgLum < 255 ? avgLum : threshold;

  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const val = gray < effectiveThreshold ? 0 : 255;
    d[i] = val;
    d[i + 1] = val;
    d[i + 2] = val;
  }
  return imageData;
};

/**
 * Pre-processing Pass: Sharpen Convolution
 */
const applySharpen = (ctx, width, height) => {
  const srcData = ctx.getImageData(0, 0, width, height);
  const src = srcData.data;
  const output = ctx.createImageData(width, height);
  const dst = output.data;

  // 3x3 Sharpen Kernel:
  // [  0, -1,  0 ]
  // [ -1,  5, -1 ]
  // [  0, -1,  0 ]
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        const top = ((y - 1) * width + x) * 4 + c;
        const bottom = ((y + 1) * width + x) * 4 + c;
        const left = (y * width + (x - 1)) * 4 + c;
        const right = (y * width + (x + 1)) * 4 + c;
        const center = idx + c;

        const val = 5 * src[center] - src[top] - src[bottom] - src[left] - src[right];
        dst[center] = Math.min(255, Math.max(0, val));
      }
      dst[idx + 3] = src[idx + 3];
    }
  }
  return output;
};

/**
 * Decodes a QR code from an image source with automatic multi-pass retry.
 * 
 * @param {File|Blob|string|HTMLImageElement} source
 * @returns {Promise<{ success: boolean, text: string|null, pass: string|null, error: string|null }>}
 */
export const decodeQrCodeFromImage = async (source) => {
  let img = null;
  try {
    if (source instanceof HTMLImageElement) {
      img = source;
    } else {
      img = await loadImageElement(source);
    }
  } catch (_err) {
    return {
      success: false,
      text: null,
      pass: null,
      error: 'Unable to open image file. Please verify file format.'
    };
  }

  const origWidth = img.naturalWidth || img.width;
  const origHeight = img.naturalHeight || img.height;

  if (!origWidth || !origHeight) {
    return {
      success: false,
      text: null,
      pass: null,
      error: 'Invalid image dimensions.'
    };
  }

  // Determine standard scaling sizes to try
  const targetSizes = [];
  const maxDim = Math.max(origWidth, origHeight);

  if (maxDim > 1200) {
    targetSizes.push({
      w: Math.round((origWidth / maxDim) * 1000),
      h: Math.round((origHeight / maxDim) * 1000)
    });
    targetSizes.push({
      w: Math.round((origWidth / maxDim) * 600),
      h: Math.round((origHeight / maxDim) * 600)
    });
  } else if (maxDim < 400) {
    targetSizes.push({ w: origWidth * 2, h: origHeight * 2 });
    targetSizes.push({ w: origWidth, h: origHeight });
  } else {
    targetSizes.push({ w: origWidth, h: origHeight });
    targetSizes.push({
      w: Math.round((origWidth / maxDim) * 800),
      h: Math.round((origHeight / maxDim) * 800)
    });
  }

  // Attempt across sizes and multi-pass strategies
  for (const { w, h } of targetSizes) {
    const { canvas, ctx } = createCanvas(w, h);
    ctx.drawImage(img, 0, 0, w, h);

    // Pass 1: Native BarcodeDetector (fast & accurate if supported)
    const nativeText = await tryNativeBarcodeDetector(canvas);
    if (nativeText) {
      return { success: true, text: nativeText, pass: 'native-barcode-detector', error: null };
    }

    // Pass 2: jsQR on raw canvas
    let rawImageData = ctx.getImageData(0, 0, w, h);
    let decoded = tryJsQr(rawImageData, w, h);
    if (decoded) {
      return { success: true, text: decoded, pass: 'original-raw', error: null };
    }

    // Pass 3: Grayscale
    ctx.drawImage(img, 0, 0, w, h);
    let grayData = ctx.getImageData(0, 0, w, h);
    applyGrayscale(grayData);
    ctx.putImageData(grayData, 0, 0);
    decoded = tryJsQr(grayData, w, h);
    if (decoded) {
      return { success: true, text: decoded, pass: 'grayscale', error: null };
    }

    // Pass 4: High Contrast (Enhances faint / photographed QRs)
    ctx.drawImage(img, 0, 0, w, h);
    let contrastData = ctx.getImageData(0, 0, w, h);
    applyContrast(contrastData, 1.8);
    ctx.putImageData(contrastData, 0, 0);
    decoded = tryJsQr(contrastData, w, h);
    if (decoded) {
      return { success: true, text: decoded, pass: 'high-contrast', error: null };
    }

    // Pass 5: Binarization / Thresholding (Otsu-style)
    ctx.drawImage(img, 0, 0, w, h);
    let binData = ctx.getImageData(0, 0, w, h);
    applyBinarization(binData);
    ctx.putImageData(binData, 0, 0);
    decoded = tryJsQr(binData, w, h);
    if (decoded) {
      return { success: true, text: decoded, pass: 'binarization', error: null };
    }

    // Pass 6: Sharpen Convolution
    ctx.drawImage(img, 0, 0, w, h);
    const sharpenData = applySharpen(ctx, w, h);
    decoded = tryJsQr(sharpenData, w, h);
    if (decoded) {
      return { success: true, text: decoded, pass: 'sharpened', error: null };
    }
  }

  // Pass 7: Cropped regions (Center 70%, Center 50%, Top-half, Bottom-half)
  // For screenshots containing entire browser / patient portal screens with QR inside
  const crops = [
    { name: 'center-70', sx: 0.15, sy: 0.15, sw: 0.7, sh: 0.7 },
    { name: 'center-50', sx: 0.25, sy: 0.25, sw: 0.5, sh: 0.5 },
    { name: 'top-60', sx: 0.1, sy: 0.05, sw: 0.8, sh: 0.6 },
    { name: 'bottom-60', sx: 0.1, sy: 0.35, sw: 0.8, sh: 0.6 }
  ];

  for (const crop of crops) {
    const sx = Math.round(origWidth * crop.sx);
    const sy = Math.round(origHeight * crop.sy);
    const sw = Math.round(origWidth * crop.sw);
    const sh = Math.round(origHeight * crop.sh);

    const { canvas: cropCanvas, ctx: cropCtx } = createCanvas(sw, sh);
    cropCtx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

    // Try native on crop
    const nativeCrop = await tryNativeBarcodeDetector(cropCanvas);
    if (nativeCrop) {
      return { success: true, text: nativeCrop, pass: `crop-${crop.name}-native`, error: null };
    }

    // Try jsQR on crop
    const cropImageData = cropCtx.getImageData(0, 0, sw, sh);
    let decoded = tryJsQr(cropImageData, sw, sh);
    if (decoded) {
      return { success: true, text: decoded, pass: `crop-${crop.name}-raw`, error: null };
    }

    // Try contrast on crop
    applyContrast(cropImageData, 1.7);
    decoded = tryJsQr(cropImageData, sw, sh);
    if (decoded) {
      return { success: true, text: decoded, pass: `crop-${crop.name}-contrast`, error: null };
    }

    // Try binarization on crop
    applyBinarization(cropImageData);
    decoded = tryJsQr(cropImageData, sw, sh);
    if (decoded) {
      return { success: true, text: decoded, pass: `crop-${crop.name}-binarized`, error: null };
    }
  }

  return {
    success: false,
    text: null,
    pass: null,
    error: 'Unable to detect readable QR code after all pre-processing attempts.'
  };
};

export default {
  loadImageElement,
  decodeQrCodeFromImage
};
