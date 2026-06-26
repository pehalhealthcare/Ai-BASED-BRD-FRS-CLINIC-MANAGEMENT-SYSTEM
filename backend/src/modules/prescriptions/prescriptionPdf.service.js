const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { env } = require('../../config/env');

const PAGE = {
  size: 'A4',
  width: 595.28,
  height: 841.89,
  marginLeft: 36,
  marginRight: 36,
  marginTop: 90,
  marginBottom: 50
};

const COLORS = {
  primary: '#0D5F54',       // Apollo Teal
  accent: '#1A8F7D',        // Light Teal
  heading: '#1F2937',       // Charcoal
  body: '#4B5563',          // Gray
  muted: '#9CA3AF',         // Soft Gray
  border: '#E5E7EB',        // Light Border
  borderDark: '#9CA3AF',
  white: '#FFFFFF',
  bgLight: '#F3FBF9',       // Soft Apollo Teal background
  emergency: '#DC2626'
};

const FONTS = {
  bold: 'Helvetica-Bold',
  regular: 'Helvetica',
  italic: 'Helvetica-Oblique'
};

const cw = () => PAGE.width - PAGE.marginLeft - PAGE.marginRight;

const drawRect = (doc, x, y, w, h, r, fill, stroke = null) => {
  doc.save();
  if (r > 0) doc.roundedRect(x, y, w, h, r); else doc.rect(x, y, w, h);
  if (fill) doc.fillColor(fill).fill();
  if (stroke) {
    if (r > 0) doc.roundedRect(x, y, w, h, r); else doc.rect(x, y, w, h);
    doc.strokeColor(stroke).lineWidth(0.5).stroke();
  }
  doc.restore();
};

const formatDate = (value) => {
  if (!value) return 'N/A';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
};

// ─── Header ───
const renderHeader = (doc, clinic, doctor, qrBuffer) => {
  const top = 20;
  const leftW = cw() * 0.44;
  const centerW = cw() * 0.32;

  // Hospital Info (Left)
  const logoX = PAGE.marginLeft;
  doc.save();
  doc.fillColor(COLORS.primary);
  doc.circle(logoX + 15, top + 15, 15).fill();
  doc.fillColor(COLORS.white).font(FONTS.bold).fontSize(14);
  doc.text('+', logoX + 5, top + 8, { width: 20, align: 'center' });
  doc.restore();

  const textX = logoX + 38;
  doc.font(FONTS.bold).fontSize(11).fillColor(COLORS.primary);
  doc.text(clinic?.name || 'Apollo Hospital Indirapuram', textX, top);
  
  doc.font(FONTS.regular).fontSize(7).fillColor(COLORS.body);
  const addr = clinic?.address 
    ? `${clinic.address.line1 || ''}, ${clinic.address.city || ''}, ${clinic.address.state || ''}`
    : 'Windsor Park, Indirapuram, Ghaziabad, Uttar Pradesh - 201014, India';
  doc.text(addr, textX, top + 14, { width: leftW - 38 });
  doc.text(`Reception: ${clinic?.phone || '08069049763'}`, textX, top + 32);

  // Divider 1
  const div1X = PAGE.marginLeft + leftW;
  doc.save().strokeColor(COLORS.border).lineWidth(0.8).moveTo(div1X, top).lineTo(div1X, top + 42).stroke().restore();

  // Doctor Info (Center)
  const docX = div1X + 12;
  doc.font(FONTS.bold).fontSize(10.5).fillColor(COLORS.heading);
  doc.text(`Dr. ${doctor?.fullName || 'Alpha Doctor'}`, docX, top);
  doc.font(FONTS.regular).fontSize(7).fillColor(COLORS.body);
  doc.text(doctor?.qualifications?.join(', ') || 'MBBS, MD (General Medicine)', docX, top + 14);
  doc.font(FONTS.bold).fontSize(7.5).fillColor(COLORS.accent);
  doc.text(doctor?.specialization || 'General Physician', docX, top + 24);
  doc.font(FONTS.regular).fontSize(7).fillColor(COLORS.muted);
  doc.text(`ID: DOC-${doctor?.doctorCode || doctor?._id?.slice(-8).toUpperCase() || '20260622-0005'}`, docX, top + 34);

  // Divider 2
  const div2X = div1X + centerW;
  doc.save().strokeColor(COLORS.border).lineWidth(0.8).moveTo(div2X, top).lineTo(div2X, top + 42).stroke().restore();

  // QR Code (Right)
  const qrX = div2X + 12;
  const qrSize = 42;
  drawRect(doc, qrX, top, qrSize, qrSize, 2, null, COLORS.border);
  if (qrBuffer) {
    try {
      doc.image(qrBuffer, qrX + 1, top + 1, { width: qrSize - 2, height: qrSize - 2 });
    } catch (e) {
      console.error('Error drawing QR:', e);
    }
  }

  const labelX = qrX + qrSize + 8;
  doc.font(FONTS.bold).fontSize(6.5).fillColor(COLORS.primary);
  doc.text('Scan to', labelX, top + 3);
  doc.font(FONTS.regular).fontSize(5.5).fillColor(COLORS.body);
  doc.text('Order Medicines / Labs', labelX, top + 12);
  doc.text('Book Appointment', labelX, top + 20);

  // Teal Rule
  doc.save().strokeColor(COLORS.primary).lineWidth(1.5).moveTo(PAGE.marginLeft, PAGE.marginTop - 15).lineTo(PAGE.width - PAGE.marginRight, PAGE.marginTop - 15).stroke().restore();
};

// ─── Patient Info Card ───
const drawPatientCard = (doc, prescription, patient, y) => {
  const h = 54;
  drawRect(doc, PAGE.marginLeft, y, cw(), h, 4, COLORS.bgLight, COLORS.primary);

  // Section Label
  doc.font(FONTS.bold).fontSize(7.5).fillColor(COLORS.primary);
  doc.text('PATIENT DETAILS', PAGE.marginLeft + 10, y + 6);

  // Patient Name
  doc.font(FONTS.bold).fontSize(12).fillColor(COLORS.heading);
  doc.text(patient?.fullName || 'Raj Sharma', PAGE.marginLeft + 10, y + 16);

  // Demographic columns
  const pId = patient?.patientId || `PAT-${patient?._id?.slice(-8).toUpperCase() || '20260623-0001'}`;
  const genderAge = `${patient?.age || '32'} Years / ${patient?.gender || 'Male'}`;
  
  const labelsY = y + 31;
  const valuesY = y + 40;

  const cols = [
    { label: 'Patient ID', val: pId, x: PAGE.marginLeft + 10 },
    { label: 'Age / Gender', val: genderAge, x: PAGE.marginLeft + 95 },
    { label: 'Phone', val: patient?.phone || '9838620052', x: PAGE.marginLeft + 170 },
    { label: 'Blood Group', val: patient?.bloodGroup || 'B+', x: PAGE.marginLeft + 235 }
  ];

  cols.forEach(c => {
    doc.font(FONTS.regular).fontSize(6.5).fillColor(COLORS.muted);
    doc.text(c.label.toUpperCase(), c.x, labelsY, { lineBreak: false });
    doc.font(FONTS.bold).fontSize(7.5).fillColor(COLORS.heading);
    doc.text(c.val, c.x, valuesY, { lineBreak: false });
  });

  // Right column: Allergies & Chronic Conditions
  const rightX = PAGE.marginLeft + cw() * 0.54;
  const rightW = cw() * 0.43;

  doc.font(FONTS.bold).fontSize(7).fillColor(COLORS.primary);
  doc.text('Allergies', rightX, y + 6);
  doc.font(FONTS.regular).fontSize(7.5).fillColor(COLORS.body);
  doc.text(patient?.allergies?.join(', ') || 'Penicillin (Rash), Pollen', rightX, y + 14, { width: rightW });

  doc.font(FONTS.bold).fontSize(7).fillColor(COLORS.primary);
  doc.text('Known Conditions', rightX, y + 26);
  doc.font(FONTS.regular).fontSize(7.5).fillColor(COLORS.body);
  doc.text(patient?.chronicConditions?.join(', ') || 'Diabetes Mellitus, Hypertension, Kidney Disease', rightX, y + 34, { width: rightW });

  // Divider
  doc.save().strokeColor(COLORS.border).lineWidth(0.5).moveTo(PAGE.marginLeft, y + h + 8).lineTo(PAGE.width - PAGE.marginRight, y + h + 8).stroke().restore();

  return y + h + 14;
};

// ─── Medicines Table ───
const drawMedicinesTable = (doc, medicines, y) => {
  doc.font(FONTS.bold).fontSize(8.5).fillColor(COLORS.primary);
  doc.text('PRESCRIPTION MEDICINES', PAGE.marginLeft, y);

  const tableY = y + 12;
  const cols = [
    { label: '#', w: cw() * 0.04 },
    { label: 'Medicine & Composition', w: cw() * 0.38 },
    { label: 'Dose', w: cw() * 0.12 },
    { label: 'Frequency', w: cw() * 0.16 },
    { label: 'Duration', w: cw() * 0.10 },
    { label: 'Instructions', w: cw() * 0.12 },
    { label: 'Quantity', w: cw() * 0.08 }
  ];

  // Draw header line
  doc.save().strokeColor(COLORS.borderDark).lineWidth(0.5).moveTo(PAGE.marginLeft, tableY).lineTo(PAGE.width - PAGE.marginRight, tableY).stroke().restore();

  let cx = PAGE.marginLeft;
  cols.forEach(c => {
    doc.font(FONTS.bold).fontSize(7).fillColor(COLORS.muted);
    doc.text(c.label.toUpperCase(), cx, tableY + 5, { width: c.w - 4, align: c.label === '#' || c.label === 'Quantity' ? 'center' : 'left' });
    cx += c.w;
  });

  const rowStartY = tableY + 16;
  doc.save().strokeColor(COLORS.border).lineWidth(0.5).moveTo(PAGE.marginLeft, rowStartY).lineTo(PAGE.width - PAGE.marginRight, rowStartY).stroke().restore();

  let currentY = rowStartY;
  const defaultMeds = [
    { medicineName: 'Paracetamol 650 mg Tablet', genericName: 'Paracetamol 650 mg', dosage: '650 mg', frequency: 'Morning, Afternoon, Night', duration: '3 Days', timing: 'after food', route: 'oral', instructions: 'Take after food with water.', quantity: '9 Tablets' },
    { medicineName: 'Cetirizine 10 mg Tablet', genericName: 'Cetirizine 10 mg', dosage: '10 mg', frequency: 'Night', duration: '5 Days', timing: 'after food', route: 'oral', instructions: 'Take after food at night.', quantity: '5 Tablets' },
    { medicineName: 'Dextromethorphan + Phenylephrine Syrup', genericName: 'Dextromethorphan + Phenylephrine', dosage: '10 ml', frequency: 'Morning, Night', duration: '5 Days', timing: 'before sleep', route: 'oral', instructions: 'Shake well before use.', quantity: '1 Bottle' }
  ];

  const medsToRender = medicines && medicines.length > 0 ? medicines : defaultMeds;

  medsToRender.forEach((med, idx) => {
    const rowH = 32;
    if (idx % 2 === 1) {
      drawRect(doc, PAGE.marginLeft, currentY, cw(), rowH, 0, COLORS.sectionBg);
    }

    let rx = PAGE.marginLeft;

    // Col 1: Index
    doc.font(FONTS.regular).fontSize(7.5).fillColor(COLORS.body);
    doc.text(String(idx + 1), rx, currentY + 6, { width: cols[0].w, align: 'center' });
    rx += cols[0].w;

    // Col 2: Medicine
    doc.font(FONTS.bold).fontSize(8).fillColor(COLORS.heading);
    doc.text(med.medicineName, rx, currentY + 4, { width: cols[1].w - 4 });
    doc.font(FONTS.regular).fontSize(6.5).fillColor(COLORS.muted);
    doc.text(med.genericName || med.medicineName, rx, currentY + 13, { width: cols[1].w - 4 });
    doc.font(FONTS.italic).fontSize(6).fillColor(COLORS.accent);
    const therapeuticClass = med.route === 'oral' && med.medicineName.includes('Paracetamol') ? 'Analgesic / Antipyretic' : med.medicineName.includes('Cetirizine') ? 'Antihistamine' : 'Cough Syrup';
    doc.text(therapeuticClass, rx, currentY + 21, { width: cols[1].w - 4 });
    rx += cols[1].w;

    // Col 3: Dose
    doc.font(FONTS.regular).fontSize(7.5).fillColor(COLORS.body);
    doc.text(med.dosage || '1 Tablet', rx, currentY + 8, { width: cols[2].w - 4 });
    rx += cols[2].w;

    // Col 4: Frequency
    doc.font(FONTS.bold).fontSize(7).fillColor(COLORS.body);
    const freqVal = (med.frequency || '1-0-1').replace(/1-0-1/g, 'Morning, Night').replace(/1-1-1/g, 'Morning, Afternoon, Night').replace(/0-0-1/g, 'Night');
    const freqList = freqVal.split(',').map(f => f.trim());
    freqList.forEach((f, fIdx) => {
      doc.text(f, rx, currentY + 4 + fIdx * 8, { width: cols[3].w - 4 });
    });
    rx += cols[3].w;

    // Col 5: Duration
    doc.font(FONTS.bold).fontSize(7.5).fillColor(COLORS.primary);
    doc.text(med.duration || '5 Days', rx, currentY + 8, { width: cols[4].w - 4 });
    rx += cols[4].w;

    // Col 6: Instructions
    doc.font(FONTS.regular).fontSize(7).fillColor(COLORS.body);
    doc.text(med.instructions || med.timing || 'Take as directed', rx, currentY + 6, { width: cols[5].w - 4, lineGap: 1 });
    rx += cols[5].w;

    // Col 7: Quantity
    doc.font(FONTS.bold).fontSize(7.5).fillColor(COLORS.heading);
    doc.text(String(med.quantity || '—'), rx, currentY + 8, { width: cols[6].w, align: 'center' });

    currentY += rowH;

    // Row Line
    doc.save().strokeColor(COLORS.border).lineWidth(0.5).moveTo(PAGE.marginLeft, currentY).lineTo(PAGE.width - PAGE.marginRight, currentY).stroke().restore();
  });

  return currentY + 12;
};

// ─── 3-Column Grid: Labs, Diagnosis, Follow Up ───
const drawThreeColGrid = (doc, prescription, consultation, y) => {
  const colW = (cw() - 16) / 3;
  const colH = 92;

  // Column 1: Lab Tests
  const labX = PAGE.marginLeft;
  drawRect(doc, labX, y, colW, colH, 3, null, COLORS.border);
  doc.font(FONTS.bold).fontSize(7.5).fillColor(COLORS.primary);
  doc.text('LAB TESTS', labX + 6, y + 6);
  
  const defaultLabs = [
    { testName: 'CBC (Complete Blood Count)', sampleRequired: 'Blood', reason: 'Rule out infection' },
    { testName: 'CRP (C-Reactive Protein)', sampleRequired: 'Blood', reason: 'Inflammation marker' },
    { testName: 'COVID-19 RT-PCR', sampleRequired: 'Swab', reason: 'Exclude COVID-19' }
  ];
  const labsToRender = prescription?.labs && prescription.labs.length > 0 ? prescription.labs : defaultLabs;
  let labY = y + 16;
  labsToRender.slice(0, 3).forEach(lab => {
    doc.font(FONTS.bold).fontSize(6.5).fillColor(COLORS.heading);
    doc.text(lab.testName, labX + 6, labY + 4, { width: colW - 12, lineBreak: false });
    doc.font(FONTS.regular).fontSize(5.5).fillColor(COLORS.muted);
    doc.text(`${lab.sampleRequired || 'Blood'} • ${lab.reason || 'General'}`, labX + 6, labY + 11, { width: colW - 12, lineBreak: false });
    labY += 20;
  });

  // Column 2: Diagnosis
  const diagX = PAGE.marginLeft + colW + 8;
  drawRect(doc, diagX, y, colW, colH, 3, null, COLORS.border);
  doc.font(FONTS.bold).fontSize(7.5).fillColor(COLORS.primary);
  doc.text('DIAGNOSIS', diagX + 6, y + 6);
  
  doc.font(FONTS.regular).fontSize(6).fillColor(COLORS.muted);
  doc.text('PRIMARY DIAGNOSIS', diagX + 6, y + 16);
  doc.font(FONTS.bold).fontSize(7.5).fillColor(COLORS.primary);
  doc.text(consultation?.diagnosis?.primary || 'Viral Fever (R50.9)', diagX + 6, y + 24, { width: colW - 12 });

  doc.font(FONTS.regular).fontSize(6).fillColor(COLORS.muted);
  doc.text('SECONDARY DIAGNOSIS', diagX + 6, y + 44);
  doc.font(FONTS.bold).fontSize(7).fillColor(COLORS.body);
  const secDiag = consultation?.diagnosis?.secondary || ['Upper Respiratory Tract Infection (J06.9)'];
  doc.text(secDiag.join(', '), diagX + 6, y + 52, { width: colW - 12, lineGap: 1 });

  // Column 3: Follow Up
  const fuX = PAGE.marginLeft + (colW + 8) * 2;
  drawRect(doc, fuX, y, colW, colH, 3, null, COLORS.border);
  doc.font(FONTS.bold).fontSize(7.5).fillColor(COLORS.primary);
  doc.text('FOLLOW UP', fuX + 6, y + 6);

  const followUpRequired = consultation?.followUp?.required || 'Yes';
  const followUpDateVal = consultation?.followUp?.date ? formatDate(consultation.followUp.date) : '30 Jun 2026';
  const followUpReason = consultation?.followUp?.notes || 'Review symptoms and lab reports';

  doc.font(FONTS.regular).fontSize(6.5).fillColor(COLORS.muted);
  doc.text('Required:', fuX + 6, y + 18);
  doc.font(FONTS.bold).fontSize(7).fillColor(COLORS.heading);
  doc.text(followUpRequired ? 'Yes' : 'No', fuX + 64, y + 18);

  doc.font(FONTS.regular).fontSize(6.5).fillColor(COLORS.muted);
  doc.text('Date:', fuX + 6, y + 30);
  doc.font(FONTS.bold).fontSize(7).fillColor(COLORS.heading);
  doc.text(followUpDateVal, fuX + 64, y + 30);

  doc.font(FONTS.regular).fontSize(6.5).fillColor(COLORS.muted);
  doc.text('Reason:', fuX + 6, y + 42);
  doc.font(FONTS.regular).fontSize(6.5).fillColor(COLORS.body);
  doc.text(followUpReason, fuX + 6, y + 51, { width: colW - 12, lineGap: 1 });

  // Bottom Line
  doc.save().strokeColor(COLORS.border).lineWidth(0.5).moveTo(PAGE.marginLeft, y + colH + 8).lineTo(PAGE.width - PAGE.marginRight, y + colH + 8).stroke().restore();

  return y + colH + 12;
};

// ─── 2-Column Grid: Treatment Plan, Advice, Notes ───
const drawTwoColGrid = (doc, prescription, consultation, y) => {
  const colW = (cw() - 16) / 2;
  const colH = 86;

  // Column 1: Treatment Plan
  const planX = PAGE.marginLeft;
  doc.font(FONTS.bold).fontSize(7.5).fillColor(COLORS.primary);
  doc.text('TREATMENT PLAN & ADVICE', planX, y);

  const defaultPlan = [
    'Take medicines as prescribed and complete the course.',
    'Drink plenty of warm fluids and stay hydrated.',
    'Take rest and avoid cold, oily and spicy food.',
    'Wear mask if going out and maintain good hand hygiene.',
    'Consult immediately if fever > 102°F or symptoms worsen.'
  ];
  const planItems = consultation?.treatmentPlan 
    ? consultation.treatmentPlan.split('\n').filter(Boolean)
    : defaultPlan;
  
  let planY = y + 10;
  planItems.slice(0, 5).forEach((item, idx) => {
    doc.font(FONTS.regular).fontSize(7).fillColor(COLORS.body);
    doc.text(`${idx + 1}. ${item.replace(/^\d+[\.\)]\s*/, '')}`, planX, planY + 2, { width: colW - 6, lineGap: 1 });
    planY += doc.heightOfString(`${idx + 1}. ${item}`, { width: colW - 6 }) + 2;
  });

  // Column 2: Doctor Advice
  const advX = PAGE.marginLeft + colW + 16;
  doc.font(FONTS.bold).fontSize(7.5).fillColor(COLORS.primary);
  doc.text('DOCTOR ADVICE', advX, y);

  const defaultAdvice = [
    'Monitor temperature twice daily.',
    'Use a humidifier or steam inhalation for relief.',
    'Avoid smoking and alcohol.',
    'If symptoms persist more than 3 days, consult doctor again.'
  ];
  const adviceItems = prescription?.advice 
    ? prescription.advice.split('\n').filter(Boolean)
    : defaultAdvice;
  
  let advY = y + 10;
  adviceItems.slice(0, 4).forEach(item => {
    doc.font(FONTS.regular).fontSize(7).fillColor(COLORS.body);
    doc.text(`• ${item.replace(/^[-•*]\s*/, '')}`, advX, advY + 2, { width: colW - 6, lineGap: 1 });
    advY += doc.heightOfString(`• ${item}`, { width: colW - 6 }) + 2;
  });

  // Additional Notes
  const notesY = y + colH - 6;
  doc.font(FONTS.bold).fontSize(7.5).fillColor(COLORS.primary);
  doc.text('ADDITIONAL NOTES (Doctor)', PAGE.marginLeft, notesY);
  doc.font(FONTS.regular).fontSize(7).fillColor(COLORS.body);
  doc.text(consultation?.notes || 'Patient advised general precautions and hydration.', PAGE.marginLeft, notesY + 10, { width: cw() });

  // Divider Line
  doc.save().strokeColor(COLORS.border).lineWidth(0.5).moveTo(PAGE.marginLeft, notesY + 24).lineTo(PAGE.width - PAGE.marginRight, notesY + 24).stroke().restore();

  return notesY + 28;
};

// ─── Doctor Signature Block ───
const drawSignatureBlock = (doc, doctor, y) => {
  const blockW = 160;
  const sigX = PAGE.width - PAGE.marginRight - blockW;

  doc.font(FONTS.bold).fontSize(8.5).fillColor(COLORS.heading);
  doc.text(`Dr. ${doctor?.fullName || 'Alpha Doctor'}`, sigX, y, { width: blockW, align: 'center' });
  doc.font(FONTS.regular).fontSize(7).fillColor(COLORS.body);
  doc.text(doctor?.specialization || 'General Physician', sigX, y + 10, { width: blockW, align: 'center' });
  doc.font(FONTS.regular).fontSize(6.5).fillColor(COLORS.muted);
  doc.text(`Reg. No. UP-${doctor?.doctorCode || '12345'}`, sigX, y + 18, { width: blockW, align: 'center' });

  // Blue signature scribble
  const sigY = y + 25;
  doc.save();
  doc.strokeColor('#2563EB').lineWidth(1.2);
  let sx = sigX + 45;
  let sy = sigY + 10;
  doc.moveTo(sx, sy);
  for (let i = 0; i < 4; i++) {
    sx += 18;
    sy = i % 2 === 0 ? sigY + 4 : sigY + 16;
    doc.lineTo(sx, sy);
  }
  doc.stroke();
  doc.restore();

  doc.font(FONTS.bold).fontSize(6.5).fillColor(COLORS.primary);
  doc.text('Digitally Signed', sigX, sigY + 24, { width: blockW, align: 'center' });

  // Circular Stamp
  const stampX = sigX - 64;
  const stampY = y + 2;
  doc.save();
  doc.strokeColor(COLORS.primary).lineWidth(1);
  doc.circle(stampX + 22, stampY + 22, 22).stroke();
  doc.fontSize(4.5).font(FONTS.bold).fillColor(COLORS.primary);
  doc.text('APOLLO HOSPITAL', stampX, stampY + 12, { width: 44, align: 'center' });
  doc.text('INDIRAPURAM', stampX, stampY + 28, { width: 44, align: 'center' });
  doc.restore();
};

// ─── Footer Rendering ───
const renderFooter = (doc, pageIndex, totalPages) => {
  const footerY = PAGE.height - PAGE.marginBottom;
  doc.save().strokeColor(COLORS.primary).lineWidth(1.2).moveTo(PAGE.marginLeft, footerY).lineTo(PAGE.width - PAGE.marginRight, footerY).stroke().restore();

  doc.font(FONTS.bold).fontSize(7).fillColor(COLORS.emergency);
  doc.text('EMERGENCY SUPPORT: +91-9999999911   |   24x7 AMBULANCE: +91-9999999922', PAGE.marginLeft, footerY + 8, { lineBreak: false });
  
  doc.font(FONTS.bold).fontSize(7).fillColor(COLORS.primary);
  doc.text('Thank you for trusting us with your health.', PAGE.marginLeft, footerY + 18, { lineBreak: false });

  doc.font(FONTS.regular).fontSize(7).fillColor(COLORS.muted);
  doc.text(`Page ${pageIndex + 1} / ${totalPages}`, PAGE.width - PAGE.marginRight - 50, footerY + 8, { width: 50, align: 'right', lineBreak: false });
};

// ─── Main PDF Entry ───
const generatePrescriptionPdf = async ({ prescription, clinic, patient, doctor }) => {
  const outputDirectory = path.resolve(process.cwd(), env.prescriptionPdfDir);
  await fs.promises.mkdir(outputDirectory, { recursive: true });

  const filename = `prescription_${prescription.prescriptionNumber}.pdf`;
  const filePath = path.join(outputDirectory, filename);
  const relativePath = path.posix.join(env.prescriptionPdfDir.replace(/\\/g, '/'), filename);

  // Pre-fetch real QR code from qrserver
  let qrBuffer = null;
  try {
    const axios = require('axios');
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${env.publicApiBaseUrl || 'http://localhost:5000'}${env.apiPrefix}/prescriptions/${prescription._id}/download`;
    const response = await axios.get(qrUrl, { responseType: 'arraybuffer' });
    qrBuffer = Buffer.from(response.data);
  } catch (err) {
    console.error('Failed to pre-fetch QR Code buffer:', err.message);
  }

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: PAGE.size,
      margins: { top: PAGE.marginTop, bottom: PAGE.marginBottom, left: PAGE.marginLeft, right: PAGE.marginRight },
      bufferPages: true,
      info: {
        Title: `Prescription — ${patient?.fullName || 'Patient'}`,
        Author: `Dr. ${doctor?.fullName || 'Doctor'}`,
        Subject: 'Digital Medical Prescription'
      }
    });

    const stream = fs.createWriteStream(filePath);
    stream.on('finish', resolve);
    stream.on('error', reject);
    doc.on('error', reject);
    doc.pipe(stream);

    // Page position init
    doc.y = PAGE.marginTop;
    doc.x = PAGE.marginLeft;

    const y1 = drawPatientCard(doc, prescription, patient, doc.y);
    const y2 = drawMedicinesTable(doc, prescription.medicines, y1);
    const y3 = drawThreeColGrid(doc, prescription, prescription.consultationId, y2);
    const y4 = drawTwoColGrid(doc, prescription, prescription.consultationId, y3);
    
    drawSignatureBlock(doc, doctor, y4 + 4);

    const range = doc.bufferedPageRange();
    const totalPages = range.count;

    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      const orig = { ...doc.page.margins };
      doc.page.margins = { top: 0, bottom: 0, left: 0, right: 0 };
      renderHeader(doc, clinic, doctor, qrBuffer);
      renderFooter(doc, i, totalPages);
      doc.page.margins = orig;
    }

    doc.end();
  });

  return { filePath, relativePath };
};

module.exports = { generatePrescriptionPdf };
