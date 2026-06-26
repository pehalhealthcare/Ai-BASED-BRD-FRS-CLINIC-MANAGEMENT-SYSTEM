const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { env } = require('../../config/env');

const PAGE = {
  size: 'A4',
  marginLeft: 50,
  marginRight: 50,
  marginTop: 110,   // space reserved for header
  marginBottom: 90, // space reserved for footer
};

const COLORS = {
  primary: '#0D6B5E',       // deep teal
  primaryLight: '#E6F4F1',  // teal tint
  accent: '#1A8F7D',        // lighter teal
  heading: '#111827',        // near-black
  body: '#374151',           // dark gray
  muted: '#6B7280',          // medium gray
  border: '#D1D5DB',         // soft border
  borderLight: '#E5E7EB',    // light border
  white: '#FFFFFF',
  sectionBg: '#F9FAFB',     // section bg
  // Casing based on payment status
  success: '#10B981',       // Green (paid)
  successBg: '#D1FAE5',
  successText: '#065F46',
  unpaid: '#EF4444',        // Red (unpaid)
  unpaidBg: '#FEE2E2',
  unpaidText: '#991B1B',
  refund: '#F59E0B',        // Yellow/Amber (refund)
  refundBg: '#FEF3C7',
  refundText: '#92400E',
  watermark: '#000000',
};

const ensureDirectory = async (directoryPath) => {
  await fs.promises.mkdir(directoryPath, { recursive: true });
};

const formatCurrency = (value) => `INR ${Number(value || 0).toFixed(2)}`;

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const contentWidth = () => 595.28 - PAGE.marginLeft - PAGE.marginRight;

const drawRoundedRect = (doc, x, y, w, h, r, fillColor, strokeColor = null) => {
  doc.save();
  doc.roundedRect(x, y, w, h, r);
  if (fillColor) {
    doc.fillColor(fillColor).fill();
  }
  if (strokeColor) {
    doc.roundedRect(x, y, w, h, r);
    doc.strokeColor(strokeColor).lineWidth(0.5).stroke();
  }
  doc.restore();
};

const ensureSpace = (doc, requiredHeight = 60) => {
  const available = doc.page.height - PAGE.marginBottom - doc.y;
  if (available < requiredHeight) {
    doc.addPage();
    doc.y = PAGE.marginTop + 10;
    doc.x = PAGE.marginLeft;
  }
};

const generateInvoicePdf = async ({ invoice, clinic, patient }) => {
  const outputDirectory = path.resolve(process.cwd(), env.invoiceStorageDir);
  await ensureDirectory(outputDirectory);

  const fileName = `${invoice.invoiceNumber}.pdf`;
  const filePath = path.join(outputDirectory, fileName);
  const relativePath = path.posix.join(env.invoiceStorageDir.replace(/\\/g, '/'), fileName);

  const status = String(invoice.paymentStatus || 'unpaid').toLowerCase();
  let themeColor = COLORS.unpaid;
  let themeBg = COLORS.unpaidBg;
  let themeText = COLORS.unpaidText;
  let statusText = 'UNPAID';

  if (status === 'paid') {
    themeColor = COLORS.success;
    themeBg = COLORS.successBg;
    themeText = COLORS.successText;
    statusText = 'PAID';
  } else if (status === 'refunded' || status === 'refund') {
    themeColor = COLORS.refund;
    themeBg = COLORS.refundBg;
    themeText = COLORS.refundText;
    statusText = 'REFUNDED';
  }

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margins: { top: PAGE.marginTop, bottom: PAGE.marginBottom, left: PAGE.marginLeft, right: PAGE.marginRight },
      size: PAGE.size,
      bufferPages: true
    });
    const stream = fs.createWriteStream(filePath);

    stream.on('finish', resolve);
    stream.on('error', reject);
    doc.on('error', reject);

    doc.pipe(stream);

    // ── Patient Info Card
    doc.y = PAGE.marginTop + 5;
    const cardY = doc.y;
    const cardH = 50;
    drawRoundedRect(doc, PAGE.marginLeft, cardY, contentWidth(), cardH, 5, COLORS.sectionBg, COLORS.borderLight);

    const col1X = PAGE.marginLeft + 12;
    const col2X = PAGE.marginLeft + contentWidth() / 2 + 10;
    const fieldGap = 11;

    // Left column
    let fy = cardY + 7;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.muted);
    doc.text('Patient Name', col1X, fy);
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(COLORS.heading);
    doc.text(patient?.fullName || 'N/A', col1X + 80, fy);

    fy += fieldGap;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.muted);
    doc.text('Patient ID', col1X, fy);
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.body);
    doc.text(patient?.patientId || 'N/A', col1X + 80, fy);

    fy += fieldGap;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.muted);
    doc.text('Phone', col1X, fy);
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.body);
    doc.text(patient?.phone || 'N/A', col1X + 80, fy);

    // Right column
    fy = cardY + 7;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.muted);
    doc.text('Invoice Date', col2X, fy);
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.body);
    doc.text(formatDate(invoice.invoiceDate || invoice.createdAt), col2X + 75, fy);

    fy += fieldGap;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.muted);
    doc.text('Due Date', col2X, fy);
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.body);
    doc.text(formatDate(invoice.dueDate), col2X + 75, fy);

    fy += fieldGap;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.muted);
    doc.text('Status', col2X, fy);
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(themeText);
    const badgeW = doc.widthOfString(statusText) + 14;
    drawRoundedRect(doc, col2X + 75, fy - 1, badgeW, 13, 3, themeBg);
    doc.text(statusText, col2X + 75 + 7, fy + 1);

    doc.y = cardY + cardH + 12;

    // ── Bill Purpose Card
    const purposeY = doc.y;
    drawRoundedRect(doc, PAGE.marginLeft, purposeY, contentWidth(), 30, 4, themeBg, themeColor);
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(themeText);
    doc.text(`BILL SUMMARY: Purpose of this bill is for ${invoice.serviceType || 'medical'} services.`, PAGE.marginLeft + 12, purposeY + 10);
    doc.y = purposeY + 45;

    // ── Items Table
    doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.heading);
    doc.text('Invoice Items');
    doc.moveDown(0.5);

    (invoice.items || []).forEach((item, index) => {
      ensureSpace(doc, 50);
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(COLORS.heading).text(`${index + 1}. ${item.name || 'Service Item'}`);
      doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.body);
      if (item.description) {
        doc.text(`Description: ${item.description}`);
      }
      doc.text(`Qty: ${item.quantity}  •  Unit Price: ${formatCurrency(item.unitPrice)}  •  Amount: ${formatCurrency(item.amount)}`);
      doc.moveDown(0.6);
    });

    doc.moveDown(0.5);
    ensureSpace(doc, 120);

    // Summary calculations block
    const sumX = 595.28 - PAGE.marginRight - 220;
    let sy = doc.y;
    const drawSummaryRow = (label, val, isBold = false) => {
      doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(isBold ? COLORS.heading : COLORS.body);
      doc.text(label, sumX, sy);
      doc.text(val, sumX + 120, sy, { width: 100, align: 'right' });
      sy += 14;
    };

    drawSummaryRow('Subtotal:', formatCurrency(invoice.subtotal));
    if (invoice.discountAmount > 0) {
      drawSummaryRow('Discount:', `-${formatCurrency(invoice.discountAmount)}`);
    }
    if (invoice.gstAmount > 0) {
      drawSummaryRow(`GST (${invoice.gstRate || 0}%):`, `+${formatCurrency(invoice.gstAmount)}`);
    }
    doc.strokeColor(COLORS.borderLight).lineWidth(0.5);
    doc.moveTo(sumX, sy + 2).lineTo(595.28 - PAGE.marginRight, sy + 2).stroke();
    sy += 8;
    drawSummaryRow('Total Amount:', formatCurrency(invoice.totalAmount), true);
    drawSummaryRow('Paid Amount:', formatCurrency(invoice.paidAmount));
    drawSummaryRow('Due Amount:', formatCurrency(invoice.dueAmount), true);

    doc.y = sy + 30;

    // ── Signature block
    ensureSpace(doc, 60);
    const sigX = 595.28 - PAGE.marginRight - 200;
    const sigY = doc.y;

    doc.strokeColor(COLORS.border).lineWidth(0.8);
    doc.moveTo(sigX, sigY).lineTo(595.28 - PAGE.marginRight, sigY).stroke();

    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(COLORS.heading);
    doc.text('Invoice Department', sigX, sigY + 6, { width: 200, align: 'center' });
    doc.font('Helvetica-Oblique').fontSize(7.5).fillColor(COLORS.muted);
    doc.text('Authorized Signature', sigX, doc.y + 2, { width: 200, align: 'center' });

    // ── Watermark, Header, Footer
    const range = doc.bufferedPageRange();
    const totalPages = range.count;

    for (let i = 0; i < totalPages; i += 1) {
      doc.switchToPage(i);
      const origMargins = { ...doc.page.margins };
      doc.page.margins = { top: 0, bottom: 0, left: 0, right: 0 };

      // Watermark
      doc.save();
      doc.fillOpacity(0.035);
      doc.fillColor(themeColor);
      doc.fontSize(64).font('Helvetica-Bold');
      doc.translate(doc.page.width / 2, doc.page.height / 2);
      doc.rotate(-35);
      doc.text(statusText, -200, -20, { width: 400, align: 'center', lineBreak: false });
      doc.restore();

      // Header
      const headerTop = 28;
      const cw = contentWidth();
      const leftColW = cw * 0.7;
      const rightX = 595.28 - PAGE.marginRight - 150;

      doc.font('Helvetica-Bold').fontSize(14).fillColor(COLORS.primary);
      doc.text(clinic?.name || 'AI-CMS Clinic', PAGE.marginLeft, headerTop, { width: leftColW });
      
      const addressStr = [clinic?.address?.line1, clinic?.address?.city, clinic?.address?.state, clinic?.address?.pincode]
        .filter(Boolean)
        .join(', ') || 'Address not provided';
      doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.muted);
      doc.text(addressStr, PAGE.marginLeft, headerTop + 18, { width: leftColW });
      doc.text(`Reception: ${clinic?.phone || 'N/A'}`, PAGE.marginLeft, headerTop + 28, { width: leftColW });

      doc.font('Helvetica-Bold').fontSize(15).fillColor(themeColor);
      doc.text('INVOICE / RECEIPT', rightX, headerTop, { width: 150, align: 'right' });
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.muted);
      doc.text(`No: ${invoice.invoiceNumber}`, rightX, headerTop + 16, { width: 150, align: 'right' });

      const lineY = PAGE.marginTop - 10;
      doc.strokeColor(themeColor).lineWidth(1.8);
      doc.moveTo(PAGE.marginLeft, lineY).lineTo(595.28 - PAGE.marginRight, lineY).stroke();
      doc.strokeColor(COLORS.borderLight).lineWidth(0.4);
      doc.moveTo(PAGE.marginLeft, lineY + 3).lineTo(595.28 - PAGE.marginRight, lineY + 3).stroke();

      // Footer
      const pageH = doc.page.height;
      const footerTop = pageH - PAGE.marginBottom + 12;

      doc.strokeColor(themeColor).lineWidth(1.0);
      doc.moveTo(PAGE.marginLeft, footerTop).lineTo(595.28 - PAGE.marginRight, footerTop).stroke();

      doc.font('Helvetica').fontSize(7).fillColor(COLORS.muted);
      doc.text(
        'Thank you for choosing us. For billing queries, contact support@clinic.com',
        PAGE.marginLeft, footerTop + 8,
        { width: contentWidth(), align: 'center' }
      );

      doc.text(
        `Page ${i + 1} / ${totalPages}`,
        PAGE.marginLeft, footerTop + 18,
        { width: contentWidth(), align: 'right' }
      );

      doc.page.margins = origMargins;
    }

    doc.end();
  });

  return {
    filePath,
    relativePath
  };
};

module.exports = {
  ensureDirectory,
  generateInvoicePdf
};
