const fs = require('fs');
const path = require('path');

const PDFDocument = require('pdfkit');

const { env } = require('../../config/env');

const ensureDirectory = async (directoryPath) => {
  await fs.promises.mkdir(directoryPath, { recursive: true });
};

const formatCurrency = (value) => `INR ${Number(value || 0).toFixed(2)}`;

const formatDate = (value) => {
  if (!value) {
    return 'Not provided';
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not provided';
  }

  return date.toISOString().slice(0, 10);
};

const buildPatientLine = (patient = {}) =>
  [patient.fullName, patient.phone, patient.patientId].filter(Boolean).join(' | ');

const drawLabelValue = (doc, label, value) => {
  doc.font('Helvetica-Bold').text(`${label}: `, { continued: true });
  doc.font('Helvetica').text(value || 'Not provided');
};

const generateInvoicePdf = async ({ invoice, clinic, patient }) => {
  const outputDirectory = path.resolve(process.cwd(), env.invoiceStorageDir);
  await ensureDirectory(outputDirectory);

  const fileName = `${invoice.invoiceNumber}.pdf`;
  const filePath = path.join(outputDirectory, fileName);
  const relativePath = path.posix.join(env.invoiceStorageDir.replace(/\\/g, '/'), fileName);

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 48,
      size: 'A4'
    });
    const stream = fs.createWriteStream(filePath);

    stream.on('finish', resolve);
    stream.on('error', reject);
    doc.on('error', reject);

    doc.pipe(stream);

    doc.fontSize(20).font('Helvetica-Bold').text(clinic?.name || 'AI-CMS Clinic');
    doc.moveDown(0.2);
    doc.fontSize(10).font('Helvetica').text(
      [clinic?.address?.line1, clinic?.address?.city, clinic?.address?.state, clinic?.address?.pincode]
        .filter(Boolean)
        .join(', ') || 'Clinic address not provided'
    );
    doc.moveDown();

    doc.fontSize(16).font('Helvetica-Bold').text('Invoice');
    doc.moveDown(0.5);
    drawLabelValue(doc, 'Invoice Number', invoice.invoiceNumber);
    drawLabelValue(doc, 'Invoice Date', formatDate(invoice.invoiceDate || invoice.createdAt));
    drawLabelValue(doc, 'Due Date', formatDate(invoice.dueDate));
    drawLabelValue(doc, 'Patient', buildPatientLine(patient));
    drawLabelValue(doc, 'Payment Status', invoice.paymentStatus);
    doc.moveDown();

    doc.font('Helvetica-Bold').text('Items');
    doc.moveDown(0.4);

    (invoice.items || []).forEach((item, index) => {
      doc.font('Helvetica-Bold').text(`${index + 1}. ${item.name || 'Invoice item'} (${item.itemType || 'other'})`);
      doc
        .font('Helvetica')
        .text(`Description: ${item.description || 'Not provided'}`)
        .text(`Qty: ${item.quantity} | Unit Price: ${formatCurrency(item.unitPrice)} | Amount: ${formatCurrency(item.amount)}`);
      doc.moveDown(0.4);
    });

    drawLabelValue(doc, 'Subtotal', formatCurrency(invoice.subtotal));
    drawLabelValue(doc, 'Discount', `${invoice.discountType || 'none'} (${formatCurrency(invoice.discountAmount)})`);
    drawLabelValue(doc, 'Taxable Amount', formatCurrency(invoice.taxableAmount));
    drawLabelValue(doc, 'GST Rate', `${invoice.gstRate || 0}%`);
    drawLabelValue(doc, 'GST Amount', formatCurrency(invoice.gstAmount));
    drawLabelValue(doc, 'Total Amount', formatCurrency(invoice.totalAmount));
    drawLabelValue(doc, 'Paid Amount', formatCurrency(invoice.paidAmount));
    drawLabelValue(doc, 'Due Amount', formatCurrency(invoice.dueAmount));
    drawLabelValue(doc, 'Notes', invoice.notes || 'Not provided');
    doc.moveDown();

    doc.font('Helvetica-Bold').text('Payment History');
    doc.moveDown(0.3);

    if (invoice.payments?.length) {
      invoice.payments.forEach((payment, index) => {
        doc
          .font('Helvetica')
          .text(
            `${index + 1}. ${formatCurrency(payment.amount)} via ${payment.paymentMode || 'other'} on ${formatDate(payment.paidAt)}${
              payment.transactionId ? ` | Txn: ${payment.transactionId}` : ''
            }`
          );
      });
    } else {
      doc.font('Helvetica').text('No payments recorded.');
    }

    doc.moveDown();
    doc.fontSize(9).font('Helvetica-Oblique').text('This is a system-generated invoice.');
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
