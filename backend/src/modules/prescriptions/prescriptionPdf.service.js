const fs = require('fs');
const path = require('path');

const PDFDocument = require('pdfkit');

const { env } = require('../../config/env');

const ensureDirectory = async (directoryPath) => {
  await fs.promises.mkdir(directoryPath, { recursive: true });
};

const buildAddressLine = (address = {}) =>
  [address.line1, address.line2, address.city, address.state, address.pincode, address.country]
    .filter(Boolean)
    .join(', ');

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

const drawLabelValue = (doc, label, value) => {
  doc.font('Helvetica-Bold').text(`${label}: `, { continued: true });
  doc.font('Helvetica').text(value || 'Not provided');
};

const generatePrescriptionPdf = async ({ prescription, clinic, patient, doctor }) => {
  const outputDirectory = path.resolve(process.cwd(), env.prescriptionPdfDir);
  await ensureDirectory(outputDirectory);

  const filename = `prescription_${prescription.prescriptionNumber}.pdf`;
  const filePath = path.join(outputDirectory, filename);
  const relativePath = path.posix.join(env.prescriptionPdfDir.replace(/\\/g, '/'), filename);

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
    doc.fontSize(10).font('Helvetica').text(buildAddressLine(clinic?.address) || 'Clinic address not provided');
    doc.moveDown();

    doc.fontSize(14).font('Helvetica-Bold').text('Digital Prescription');
    doc.moveDown(0.5);

    drawLabelValue(doc, 'Prescription Number', prescription.prescriptionNumber);
    drawLabelValue(doc, 'Date', formatDate(prescription.finalizedAt || prescription.createdAt));
    drawLabelValue(doc, 'Status', prescription.status);
    doc.moveDown();

    doc.font('Helvetica-Bold').text('Doctor');
    doc.font('Helvetica').text(
      `${doctor?.fullName || 'Not provided'}${doctor?.specialization ? ` (${doctor.specialization})` : ''}`
    );
    doc.moveDown(0.75);

    doc.font('Helvetica-Bold').text('Patient');
    doc.font('Helvetica').text(patient?.fullName || 'Not provided');
    drawLabelValue(doc, 'Patient ID', patient?.patientId || 'Not provided');
    drawLabelValue(
      doc,
      'Age / DOB',
      `${patient?.age ?? 'Not provided'} / ${formatDate(patient?.dateOfBirth)}`
    );
    drawLabelValue(doc, 'Gender', patient?.gender || 'Not provided');
    drawLabelValue(doc, 'Phone', patient?.phone || 'Not provided');
    doc.moveDown();

    drawLabelValue(doc, 'Diagnosis', prescription.diagnosisSnapshot || 'Not provided');
    drawLabelValue(doc, 'Symptoms', prescription.symptomsSnapshot || 'Not provided');
    drawLabelValue(doc, 'Notes', prescription.notes || 'Not provided');
    doc.moveDown();

    doc.font('Helvetica-Bold').text('Medicines');
    doc.moveDown(0.4);

    (prescription.medicines || []).forEach((medicine, index) => {
      doc.font('Helvetica-Bold').text(
        `${index + 1}. ${medicine.medicineName || 'Medicine'}${medicine.genericName ? ` (${medicine.genericName})` : ''}`
      );
      doc.font('Helvetica').text(
        `Dosage: ${medicine.dosage || 'Not provided'} | Frequency: ${medicine.frequency || 'Not provided'} | Duration: ${medicine.duration || 'Not provided'}`
      );
      doc.text(
        `Route: ${medicine.route || 'oral'} | Timing: ${medicine.timing || 'Not provided'} | Instructions: ${medicine.instructions || 'Not provided'}`
      );
      doc.text(`Quantity: ${medicine.quantity ?? 'Not provided'} | Substitute allowed: ${medicine.isSubstituteAllowed ? 'Yes' : 'No'}`);
      doc.moveDown(0.5);
    });

    drawLabelValue(doc, 'Advice', prescription.advice || 'Not provided');
    drawLabelValue(doc, 'Follow-up Date', formatDate(prescription.followUpDate));
    doc.moveDown();

    doc.font('Helvetica-Bold').text('Doctor Signature');
    doc.moveDown(1.2);
    doc.moveTo(doc.x, doc.y).lineTo(doc.x + 180, doc.y).stroke();
    doc.moveDown();
    doc.fontSize(9)
      .font('Helvetica-Oblique')
      .text('This prescription is generated digitally and is valid only after doctor approval.');

    doc.end();
  });

  return {
    filePath,
    relativePath
  };
};

module.exports = {
  generatePrescriptionPdf
};
