const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

// ────────────────────────────────────────────────────────────────────────────
// Constants & Design Tokens
// ────────────────────────────────────────────────────────────────────────────

const PAGE = {
  size: 'A4',
  width: 595.28,
  height: 841.89,
  marginLeft: 36,
  marginRight: 36,
  marginTop: 85,
  marginBottom: 80,
};

const CW = PAGE.width - PAGE.marginLeft - PAGE.marginRight; // Content width

const C = {
  primary: '#0D6B5E',
  primaryDark: '#095C50',
  primaryLight: '#E6F4F1',
  accent: '#1A8F7D',
  heading: '#111827',
  body: '#374151',
  muted: '#6B7280',
  label: '#9CA3AF',
  border: '#D1D5DB',
  borderLight: '#E5E7EB',
  white: '#FFFFFF',
  sectionBg: '#F9FAFB',
  badgeBg: '#ECFDF5',
  badgeText: '#065F46',
  emergency: '#DC2626',
  emergencyBg: '#FEF2F2',
  soapS: '#3B82F6',
  soapO: '#8B5CF6',
  soapA: '#F59E0B',
  soapP: '#10B981',
  numberBg: '#0D6B5E',
  tableBorder: '#E5E7EB',
  tableHeaderBg: '#F3F4F6',
};

const F = {
  bold: 'Helvetica-Bold',
  regular: 'Helvetica',
  italic: 'Helvetica-Oblique',
  boldItalic: 'Helvetica-BoldOblique',
};

// ────────────────────────────────────────────────────────────────────────────
// Utility Helpers
// ────────────────────────────────────────────────────────────────────────────

const ensureDirectory = async (dir) => fs.promises.mkdir(dir, { recursive: true });

const buildAddress = (addr = {}) =>
  [addr.line1, addr.line2, addr.city, addr.state, addr.pincode ? `- ${addr.pincode}` : '', addr.country]
    .filter(Boolean)
    .join(', ');

const fmtDate = (v) => {
  if (!v) return 'N/A';
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

// ────────────────────────────────────────────────────────────────────────────
// Drawing Primitives
// ────────────────────────────────────────────────────────────────────────────

const ensureSpace = (doc, needed = 50) => {
  const avail = doc.page.height - PAGE.marginBottom - doc.y;
  if (avail < needed) {
    doc.addPage();
    doc.y = PAGE.marginTop + 8;
    doc.x = PAGE.marginLeft;
  }
};

const roundRect = (doc, x, y, w, h, r, fill, stroke) => {
  doc.save();
  doc.roundedRect(x, y, w, h, r);
  if (fill) doc.fillColor(fill).fill();
  if (stroke) {
    doc.roundedRect(x, y, w, h, r);
    doc.strokeColor(stroke).lineWidth(0.5).stroke();
  }
  doc.restore();
};

const hLine = (doc, x1, x2, y, color = C.borderLight, width = 0.5) => {
  doc.save().strokeColor(color).lineWidth(width).moveTo(x1, y).lineTo(x2, y).stroke().restore();
};

// Numbered section header like: [1] CHIEF COMPLAINT
const sectionHeader = (doc, num, title) => {
  ensureSpace(doc, 32);
  const y = doc.y;
  // Number circle
  roundRect(doc, PAGE.marginLeft, y, 16, 16, 3, C.numberBg);
  doc.font(F.bold).fontSize(8).fillColor(C.white);
  doc.text(String(num), PAGE.marginLeft + 1, y + 4, { width: 16, align: 'center' });
  // Title
  doc.font(F.bold).fontSize(9.5).fillColor(C.heading);
  doc.text(title.toUpperCase(), PAGE.marginLeft + 22, y + 3, { width: CW - 22 });
  doc.y = y + 20;
  hLine(doc, PAGE.marginLeft, PAGE.marginLeft + CW, doc.y, C.borderLight, 0.4);
  doc.y += 6;
  doc.x = PAGE.marginLeft;
};

// ────────────────────────────────────────────────────────────────────────────
// HEADER (Page 1 vs Continuation)
// ────────────────────────────────────────────────────────────────────────────

const renderHeader = (doc, clinic, doctor, patient, consultation, qrBuffer, pageIdx, totalPages) => {
  const top = 20;
  const L = PAGE.marginLeft;
  const R = PAGE.width - PAGE.marginRight;
  const o = { lineBreak: false };

  // White background strip
  doc.save().rect(0, 0, PAGE.width, pageIdx === 0 ? 255 : PAGE.marginTop - 4).fillColor(C.white).fill().restore();

  if (pageIdx === 0) {
    // ────────────────────────────────────────────────────────────────────────
    // PAGE 1 HEADER (Full branding, logos, cards, QR Code)
    // ────────────────────────────────────────────────────────────────────────
    
    // Clinic Logo (green cross inside rounded box)
    roundRect(doc, L, top, 28, 28, 6, C.primary);
    doc.font(F.bold).fontSize(16).fillColor(C.white);
    doc.text('+', L, top + 6, { width: 28, align: 'center', ...o });

    // Clinic Info
    doc.font(F.bold).fontSize(12).fillColor(C.primary);
    doc.text(clinic?.name || 'AICMS CLINIC', L + 34, top, { width: CW * 0.45, ...o });
    doc.font(F.bold).fontSize(7).fillColor(C.accent);
    doc.text('AI CLINIC MANAGEMENT SYSTEM', L + 34, top + 13, { width: CW * 0.45, ...o });

    const addr = buildAddress(clinic?.address) || '123, HealthCare Avenue, Indirapuram, Ghaziabad, Uttar Pradesh - 201014';
    doc.font(F.regular).fontSize(6.5).fillColor(C.muted);
    doc.text(addr, L + 34, top + 24, { width: CW * 0.45 });
    doc.text(`+91 98765 43210  |  contact@aicmsclinic.com`, L + 34, top + 42, { width: CW * 0.45, ...o });

    // Center Title and badge
    const midX = L + CW * 0.48;
    const midW = CW * 0.36;
    doc.font(F.bold).fontSize(10).fillColor(C.heading);
    doc.text('PRESCRIPTION &', midX, top + 2, { width: midW, align: 'center', ...o });
    doc.text('CONSULTATION REPORT', midX, top + 14, { width: midW, align: 'center', ...o });
    
    // OPD Consultation Badge
    const badgeW = 96;
    const badgeX = midX + (midW - badgeW) / 2;
    roundRect(doc, badgeX, top + 28, badgeW, 14, 7, C.primaryLight);
    doc.font(F.bold).fontSize(7).fillColor(C.primary);
    doc.text('OPD CONSULTATION', badgeX, top + 32, { width: badgeW, align: 'center', ...o });

    // QR Code on right
    const qrSize = 46;
    const qrX = R - qrSize;
    if (qrBuffer) {
      doc.image(qrBuffer, qrX, top, { width: qrSize, height: qrSize });
    } else {
      roundRect(doc, qrX, top, qrSize, qrSize, 4, null, C.border);
    }
    doc.font(F.regular).fontSize(6).fillColor(C.muted);
    doc.text('Scan to Verify', qrX - 10, top + qrSize + 4, { width: qrSize + 20, align: 'center', ...o });

    // ── Patient Info Card
    const patY = top + 64;
    const patH = 50;
    roundRect(doc, L, patY, CW, patH, 6, C.sectionBg, C.borderLight);

    // Patient Avatar
    roundRect(doc, L + 8, patY + 8, 34, 34, 17, C.borderLight);
    doc.font(F.bold).fontSize(12).fillColor(C.muted);
    doc.text(patient?.fullName ? patient.fullName.charAt(0) : 'P', L + 8, patY + 18, { width: 34, align: 'center', ...o });

    // Patient details
    doc.font(F.bold).fontSize(9.5).fillColor(C.primary);
    doc.text(patient?.fullName || 'N/A', L + 50, patY + 8, { width: CW * 0.40, ...o });

    doc.font(F.regular).fontSize(7.5).fillColor(C.body);
    doc.text(`PID: ${patient?.patientId || 'PAT-2026-0711-0001'}`, L + 50, patY + 21, { ...o });
    doc.text(`Age: ${patient?.age || '32'} Years    Gender: ${capitalize(patient?.gender || 'Male')}`, L + 50, patY + 31, { ...o });
    doc.text(`DOB: ${fmtDate(patient?.dateOfBirth)}    Blood Group: ${patient?.bloodGroup || 'O+'}`, L + 50, patY + 41, { ...o });

    // Appointment details
    const apptX = L + CW * 0.55;
    const apptW = CW * 0.42;
    doc.font(F.regular).fontSize(7.5).fillColor(C.muted);
    doc.text(`Appointment ID`, apptX, patY + 8, { ...o });
    doc.font(F.bold).fontSize(8.5).fillColor(C.primary);
    const apptIdStr = String(consultation?.appointmentId?.appointmentCode || consultation?.appointmentId?._id || consultation?.appointmentId || 'APT-2026-0711-032');
    doc.text(apptIdStr.toUpperCase(), apptX, patY + 18, { ...o });

    doc.font(F.regular).fontSize(7.5).fillColor(C.muted);
    doc.text(`Token No.`, apptX + 90, patY + 8, { ...o });
    doc.font(F.bold).fontSize(8.5).fillColor(C.primary);
    doc.text(consultation?.appointmentId?.tokenNumber || 'OP-12', apptX + 90, patY + 18, { ...o });

    doc.font(F.regular).fontSize(7.5).fillColor(C.muted);
    doc.text(`Visit Date & Time`, apptX + 135, patY + 8, { ...o });
    doc.font(F.bold).fontSize(8).fillColor(C.heading);
    doc.text(`${fmtDate(consultation?.createdAt)} 10:30 AM`, apptX + 135, patY + 18, { ...o });

    // ── Doctor Info Card
    const docY = patY + patH + 6;
    const docH = 50;
    roundRect(doc, L, docY, CW, docH, 6, C.sectionBg, C.borderLight);

    // Doctor Avatar
    roundRect(doc, L + 8, docY + 8, 34, 34, 17, C.borderLight);
    doc.font(F.bold).fontSize(12).fillColor(C.muted);
    doc.text(doctor?.fullName ? doctor.fullName.charAt(0) : 'D', L + 8, docY + 18, { width: 34, align: 'center', ...o });

    // Doctor details
    doc.font(F.bold).fontSize(9.5).fillColor(C.heading);
    doc.text(`Dr. ${doctor?.fullName || 'Shyam Verma'}`, L + 50, docY + 8, { width: CW * 0.40, ...o });

    doc.font(F.regular).fontSize(7.5).fillColor(C.body);
    doc.text(doctor?.qualifications?.join(', ') || doctor?.qualification || 'MBBS, MD (General Medicine)', L + 50, docY + 21, { ...o });
    doc.text(`Reg. No.: ${doctor?.medicalRegistrationNumber || '98765'}`, L + 50, docY + 31, { ...o });
    doc.text(doctor?.specialization || 'Consultant Physician', L + 50, docY + 41, { ...o });

    // Consultation details
    const detX = L + CW * 0.55;
    doc.font(F.regular).fontSize(7).fillColor(C.muted);
    doc.text(`Consultation Type`, detX, docY + 8, { ...o });
    doc.font(F.bold).fontSize(8).fillColor(C.heading);
    doc.text(`In-Clinic`, detX, docY + 18, { ...o });

    doc.font(F.regular).fontSize(7).fillColor(C.muted);
    doc.text(`Consultation Duration`, detX + 75, docY + 8, { ...o });
    doc.font(F.bold).fontSize(8).fillColor(C.heading);
    doc.text(`22 mins`, detX + 75, docY + 18, { ...o });

    doc.font(F.regular).fontSize(7).fillColor(C.muted);
    doc.text(`Follow-up After`, detX + 165, docY + 8, { ...o });
    doc.font(F.bold).fontSize(8).fillColor(C.heading);
    doc.text(`7 Days`, detX + 165, docY + 18, { ...o });

  } else {
    // ────────────────────────────────────────────────────────────────────────
    // PAGE 2+ HEADER (Compact, Continuation Header)
    // ────────────────────────────────────────────────────────────────────────
    doc.font(F.bold).fontSize(10.5).fillColor(C.primary);
    doc.text('CONSULTATION REPORT (CONTINUED)', L, top, { width: CW * 0.60, ...o });
    
    // OPD Consultation Badge (smaller)
    roundRect(doc, L + CW * 0.62, top - 2, 75, 12, 6, C.primaryLight);
    doc.font(F.bold).fontSize(6).fillColor(C.primary);
    doc.text('OPD CONSULTATION', L + CW * 0.62, top + 1, { width: 75, align: 'center', ...o });

    doc.font(F.regular).fontSize(8).fillColor(C.muted);
    doc.text(`Page ${pageIdx + 1} of ${totalPages}`, R - 80, top, { width: 80, align: 'right', ...o });

    // Patient details summary row
    const lineY = top + 18;
    doc.font(F.regular).fontSize(7.5).fillColor(C.body);
    doc.text(`Patient Name: `, L, lineY, { continued: true });
    doc.font(F.bold).fillColor(C.heading).text(`${patient?.fullName || 'N/A'}    `, { continued: true });
    doc.font(F.regular).fillColor(C.body).text(`Age: `, { continued: true });
    doc.font(F.bold).fillColor(C.heading).text(`${patient?.age || '32'} Years    `, { continued: true });
    doc.font(F.regular).fillColor(C.body).text(`Appointment ID: `, { continued: true });
    doc.font(F.bold).fillColor(C.heading).text(`${String(consultation?.appointmentId?.appointmentCode || consultation?.appointmentId?._id || consultation?.appointmentId || 'N/A').toUpperCase()}    `, { continued: true });
    doc.font(F.regular).fillColor(C.body).text(`Visit Date: `, { continued: true });
    doc.font(F.bold).fillColor(C.heading).text(`${fmtDate(consultation?.createdAt)}`, { ...o });

    // Thin teal divider
    hLine(doc, L, R, top + 32, C.primary, 1.2);
  }
};

// ────────────────────────────────────────────────────────────────────────────
// FOOTER (every page)
// ────────────────────────────────────────────────────────────────────────────

const renderFooter = (doc, clinic, consultation, pageIdx, totalPages) => {
  const L = PAGE.marginLeft;
  const R = PAGE.width - PAGE.marginRight;
  const footerTop = doc.page.height - PAGE.marginBottom + 8;
  const o = { lineBreak: false };

  hLine(doc, L, R, footerTop, C.primary, 1);

  // Emergency strip
  const sy = footerTop + 5;
  roundRect(doc, L, sy, CW, 18, 3, C.emergencyBg);
  doc.font(F.bold).fontSize(7).fillColor(C.emergency);
  doc.text(
    'EMERGENCY SUPPORT: +91-9999999911  •  24x7 AMBULANCE: +91-9999999922',
    L + 8, sy + 5, { width: CW - 16, align: 'center', ...o }
  );

  // Clinic name & page
  doc.font(F.italic).fontSize(6).fillColor(C.label);
  doc.text('Generated by AICMS  •  Confidential Medical Document', L, sy + 26, o);
  doc.font(F.regular).fontSize(6.5).fillColor(C.muted);
  doc.text(`Consultation ID: ${consultation?._id || 'N/A'}`, L, sy + 34, o);

  doc.font(F.regular).fontSize(7).fillColor(C.muted);
  doc.text(`Page ${pageIdx + 1} / ${totalPages}`, L, sy + 26, { width: CW, align: 'right', ...o });
};

// ────────────────────────────────────────────────────────────────────────────
// WATERMARK
// ────────────────────────────────────────────────────────────────────────────

const renderWatermark = (doc, clinic) => {
  doc.save();
  doc.fillOpacity(0.02).fillColor('#000').fontSize(44).font(F.bold);
  doc.translate(PAGE.width / 2, PAGE.height / 2).rotate(-35);
  doc.text(clinic?.name || 'CONFIDENTIAL', -180, -20, { width: 360, align: 'center', lineBreak: false });
  doc.restore();
};

// ────────────────────────────────────────────────────────────────────────────
// TABLE HELPERS
// ────────────────────────────────────────────────────────────────────────────

const drawTableHeader = (doc, cols, y) => {
  roundRect(doc, PAGE.marginLeft, y, CW, 16, 0, C.tableHeaderBg);
  hLine(doc, PAGE.marginLeft, PAGE.marginLeft + CW, y + 16, C.tableBorder, 0.5);
  let cx = PAGE.marginLeft;
  cols.forEach((col) => {
    doc.font(F.bold).fontSize(6.5).fillColor(C.muted);
    doc.text(col.label, cx + 3, y + 5, { width: col.w - 6, align: col.align || 'left' });
    cx += col.w;
  });
  return y + 16;
};

const drawTableRow = (doc, cols, values, y, altBg = false) => {
  if (altBg) {
    doc.save().rect(PAGE.marginLeft, y, CW, 14).fillColor('#FAFBFC').fill().restore();
  }
  let cx = PAGE.marginLeft;
  cols.forEach((col, i) => {
    doc.font(col.bold ? F.bold : F.regular).fontSize(7).fillColor(col.color || C.body);
    doc.text(values[i] || '—', cx + 3, y + 4, { width: col.w - 6, align: col.align || 'left' });
    cx += col.w;
  });
  hLine(doc, PAGE.marginLeft, PAGE.marginLeft + CW, y + 14, C.borderLight, 0.3);
  return y + 14;
};

// ────────────────────────────────────────────────────────────────────────────
// MAIN PDF GENERATOR
// ────────────────────────────────────────────────────────────────────────────

const generateConsultationPdf = async ({ consultation, clinic, patient, doctor, prescription }) => {
  const outputDirectory = path.resolve(process.cwd(), 'uploads/consultations');
  await ensureDirectory(outputDirectory);

  const filename = `consultation_${consultation._id}.pdf`;
  const filePath = path.join(outputDirectory, filename);
  const relativePath = path.posix.join('uploads/consultations', filename);

  // Pre-fetch real QR code from qrserver
  let qrBuffer = null;
  try {
    const axios = require('axios');
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent('https://aicmsclinic.com/verify/' + consultation._id)}`;
    const response = await axios.get(qrUrl, { responseType: 'arraybuffer' });
    qrBuffer = Buffer.from(response.data);
  } catch (err) {
    console.error('Failed to pre-fetch QR Code buffer:', err.message);
  }

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margins: { top: PAGE.marginTop, bottom: PAGE.marginBottom, left: PAGE.marginLeft, right: PAGE.marginRight },
      size: PAGE.size,
      bufferPages: true,
      info: {
        Title: `Consultation Note - ${patient?.fullName || 'Patient'}`,
        Author: `Dr. ${doctor?.fullName || 'Doctor'}`,
        Subject: 'Clinical Consultation Note',
        Creator: clinic?.name || 'AI-CMS'
      }
    });
    const stream = fs.createWriteStream(filePath);
    stream.on('finish', resolve);
    stream.on('error', reject);
    doc.on('error', reject);
    doc.pipe(stream);

    const L = PAGE.marginLeft;
    const R = PAGE.width - PAGE.marginRight;

    // Define column dimensions (2-column layout matches Image 1)
    const colLW = 220; // Left column width (approx 42%)
    const colRW = 283; // Right column width (approx 54%)
    const colGap = 20;
    const lx = L;
    const rx = L + colLW + colGap;

    let leftY = 260;
    let rightY = 260;

    // Helper to draw section panel header (light background with bold text)
    const drawPanelHeader = (doc, title, x, y, width, bgColor, textColor) => {
      roundRect(doc, x, y, width, 18, 4, bgColor);
      doc.font(F.bold).fontSize(8.5).fillColor(textColor);
      doc.text(title.toUpperCase(), x + 8, y + 5, { width: width - 16 });
      return y + 24;
    };

    // ────────────────────────────────────────────────────────────────────────
    // LEFT COLUMN: History, Details, and Vitals
    // ────────────────────────────────────────────────────────────────────────
    
    // Draw History Panel
    leftY = drawPanelHeader(doc, 'History & Chief Complaint', lx, leftY, colLW, '#EBF2FF', '#1E3A8A');
    
    // Chief Complaint
    if (consultation.chiefComplaint) {
      doc.font(F.bold).fontSize(8).fillColor(C.heading).text('Chief Complaint', lx, leftY);
      leftY += 10;
      doc.font(F.regular).fontSize(7.5).fillColor(C.body);
      doc.text(consultation.chiefComplaint, lx, leftY, { width: colLW, lineGap: 1.5 });
      leftY = doc.y + 10;
    }

    // History of Present Illness
    if (consultation.clinicalNotes) {
      doc.font(F.bold).fontSize(8).fillColor(C.heading).text('History of Present Illness', lx, leftY);
      leftY += 10;
      doc.font(F.regular).fontSize(7.5).fillColor(C.body);
      doc.text(consultation.clinicalNotes, lx, leftY, { width: colLW, lineGap: 1.5 });
      leftY = doc.y + 10;
    }

    // Past Medical History pills/badges
    if (consultation.pastMedicalHistory && consultation.pastMedicalHistory.length > 0) {
      doc.font(F.bold).fontSize(8).fillColor(C.heading).text('Past Medical History', lx, leftY);
      leftY += 10;
      let px = lx;
      let py = leftY;
      consultation.pastMedicalHistory.forEach((pmh) => {
        const text = pmh.trim();
        if (!text) return;
        const pillW = doc.widthOfString(text) + 12;
        if (px + pillW > lx + colLW) {
          px = lx;
          py += 16;
        }
        roundRect(doc, px, py, pillW, 12, 6, '#ECFDF5', '#10B981');
        doc.font(F.bold).fontSize(6.5).fillColor('#065F46');
        doc.text(text, px, py + 3, { width: pillW, align: 'center' });
        px += pillW + 4;
      });
      leftY = py + 20;
    }

    // Family History
    const activeFamily = (consultation.familyHistory || []).filter(x => x.checked);
    if (activeFamily.length > 0) {
      doc.font(F.bold).fontSize(8).fillColor(C.heading).text('Family History', lx, leftY);
      leftY += 10;
      doc.font(F.regular).fontSize(7.5).fillColor(C.body);
      const text = activeFamily.map(x => x.label).join(', ');
      doc.text(text, lx, leftY, { width: colLW, lineGap: 1.5 });
      leftY = doc.y + 10;
    }

    // Social History
    const activeSocial = (consultation.socialHistory || []).filter(x => x.active);
    if (activeSocial.length > 0) {
      doc.font(F.bold).fontSize(8).fillColor(C.heading).text('Social History', lx, leftY);
      leftY += 10;
      doc.font(F.regular).fontSize(7.5).fillColor(C.body);
      const text = activeSocial.map(x => x.label).join(', ');
      doc.text(text, lx, leftY, { width: colLW, lineGap: 1.5 });
      leftY = doc.y + 10;
    }

    // Lifestyle History
    if (consultation.lifestyleHistory && consultation.lifestyleHistory.length > 0) {
      doc.font(F.bold).fontSize(8).fillColor(C.heading).text('Lifestyle Details', lx, leftY);
      leftY += 10;
      doc.font(F.regular).fontSize(7.5).fillColor(C.body);
      doc.text(consultation.lifestyleHistory.join(', '), lx, leftY, { width: colLW, lineGap: 1.5 });
      leftY = doc.y + 10;
    }

    // Allergies (if any)
    if (patient?.allergies && patient.allergies.length > 0) {
      doc.font(F.bold).fontSize(8).fillColor(C.heading).text('Allergies', lx, leftY);
      leftY += 10;
      doc.font(F.regular).fontSize(7.5).fillColor(C.body);
      doc.text(Array.isArray(patient.allergies) ? patient.allergies.join(', ') : String(patient.allergies), lx, leftY, { width: colLW });
      leftY = doc.y + 15;
    } else {
      doc.font(F.bold).fontSize(8).fillColor(C.heading).text('Allergies', lx, leftY);
      leftY += 10;
      doc.font(F.regular).fontSize(7.5).fillColor(C.body);
      doc.text('No known drug allergies.', lx, leftY, { width: colLW });
      leftY = doc.y + 15;
    }

    // Draw Vitals Box
    if (consultation.vitals) {
      leftY = drawPanelHeader(doc, 'Vitals', lx, leftY, colLW, '#E6F4F1', '#0D6B5E');
      
      const v = consultation.vitals;
      const vitalsList = [
        v.temperature ? { label: 'Temperature', val: `${v.temperature} °F` } : null,
        v.pulse ? { label: 'Pulse Rate', val: `${v.pulse} /min` } : null,
        v.bloodPressure ? { label: 'Blood Pressure', val: v.bloodPressure } : null,
        v.respiratoryRate ? { label: 'Respiratory Rate', val: `${v.respiratoryRate} /min` } : null,
        v.oxygenSaturation ? { label: 'SpO2', val: `${v.oxygenSaturation} %` } : null,
        v.weight ? { label: 'Weight', val: `${v.weight} kg` } : null,
        v.height ? { label: 'Height', val: `${v.height} cm` } : null,
        (v.weight && v.height) ? { label: 'BMI', val: `${(v.weight / Math.pow(v.height / 100, 2)).toFixed(1)}` } : null
      ].filter(Boolean);

      if (consultation.customVitalsList && consultation.customVitalsList.length > 0) {
        consultation.customVitalsList.forEach((cv) => {
          const val = v[cv.key] || cv.value;
          if (val) {
            vitalsList.push({ label: cv.label, val: `${val} ${cv.unit || ''}` });
          }
        });
      }

      const boxW = (colLW - 4) / 2;
      vitalsList.forEach((vital, idx) => {
        const row = Math.floor(idx / 2);
        const col = idx % 2;
        const bx = lx + col * (boxW + 4);
        const by = leftY + row * 28;
        
        roundRect(doc, bx, by, boxW, 24, 4, C.sectionBg, C.borderLight);
        roundRect(doc, bx, by, 3, 24, 1.5, C.primary);

        doc.font(F.bold).fontSize(7.5).fillColor(C.heading);
        doc.text(vital.val, bx + 8, by + 4, { width: boxW - 12 });
        doc.font(F.regular).fontSize(6).fillColor(C.muted);
        doc.text(vital.label, bx + 8, by + 13, { width: boxW - 12 });
      });
      leftY += Math.ceil(vitalsList.length / 2) * 28;
    }

    // Systemic Examination
    if (consultation.systemicExamination && consultation.systemicExamination.length > 0) {
      const activeSystems = consultation.systemicExamination.filter(
        (x) => x.status !== 'Not Examined' && (x.status === 'Abnormal' || x.note)
      );

      if (activeSystems.length > 0) {
        leftY += 10;
        leftY = drawPanelHeader(doc, 'Systemic Examination', lx, leftY, colLW, '#F3F4F6', C.body);
        activeSystems.forEach((sys) => {
          doc.font(F.bold).fontSize(7.5).fillColor(C.heading).text(`${sys.sys}: `, lx + 4, leftY, { continued: true });
          doc.font(F.regular).fontSize(7.5).fillColor(sys.status === 'Abnormal' ? C.emergency : C.body).text(`${sys.status}  `, { continued: true });
          if (sys.note) {
            doc.font(F.italic).fontSize(6.5).fillColor(C.muted).text(`(${sys.note})`);
          } else {
            doc.text('');
          }
          leftY = doc.y + 2;
        });
      }
    }

    // ────────────────────────────────────────────────────────────────────────
    // RIGHT COLUMN: Prescription, Labs, Procedures, Advice, Follow-up
    // ────────────────────────────────────────────────────────────────────────
    
    // Draw Prescription Panel
    rightY = drawPanelHeader(doc, 'Prescription', rx, rightY, colRW, '#ECFDF5', '#065F46');
    
    // Table headers
    const medCols = [
      { label: 'Medicine', w: 95 },
      { label: 'Dose', w: 32 },
      { label: 'Freq', w: 42 },
      { label: 'Duration', w: 42 },
      { label: 'Instructions', w: colRW - 211 }
    ];
    
    roundRect(doc, rx, rightY, colRW, 14, 0, C.tableHeaderBg);
    let hx = rx;
    medCols.forEach((col) => {
      doc.font(F.bold).fontSize(6.5).fillColor(C.muted);
      doc.text(col.label, hx + 4, rightY + 4, { width: col.w - 8 });
      hx += col.w;
    });
    rightY += 14;

    const medicines = prescription?.medicines || [];
    medicines.forEach((med) => {
      let rowH = 18;
      if (med.genericName) rowH = 26;
      
      // Page break check (falls back to a new page, but in single-column full-width continuation layout!)
      if (rightY + rowH > PAGE.height - PAGE.marginBottom) {
        doc.addPage();
        rightY = PAGE.marginTop + 10;
        roundRect(doc, rx, rightY, colRW, 14, 0, C.tableHeaderBg);
        let hx = rx;
        medCols.forEach((col) => {
          doc.font(F.bold).fontSize(6.5).fillColor(C.muted);
          doc.text(col.label, hx + 4, rightY + 4, { width: col.w - 8 });
          hx += col.w;
        });
        rightY += 14;
      }
      
      let cx = rx;
      doc.font(F.bold).fontSize(7).fillColor(C.heading);
      doc.text(med.medicineName || '—', cx + 4, rightY + 3, { width: medCols[0].w - 8 });
      let nextY = doc.y;
      if (med.genericName) {
        doc.font(F.italic).fontSize(6).fillColor(C.muted);
        doc.text(med.genericName, cx + 4, nextY + 1, { width: medCols[0].w - 8 });
        nextY = doc.y;
      }
      rowH = Math.max(rowH, nextY - rightY + 3);
      
      cx += medCols[0].w;
      
      doc.font(F.regular).fontSize(7).fillColor(C.body);
      doc.text(med.dosage || med.dose || '—', cx + 4, rightY + 3, { width: medCols[1].w - 8 });
      cx += medCols[1].w;
      
      doc.text(med.frequency || '—', cx + 4, rightY + 3, { width: medCols[2].w - 8 });
      cx += medCols[2].w;
      
      doc.text(med.duration || '—', cx + 4, rightY + 3, { width: medCols[3].w - 8 });
      cx += medCols[3].w;
      
      doc.text(med.instructions || med.timing || '—', cx + 4, rightY + 3, { width: medCols[4].w - 8 });
      
      hLine(doc, rx, rx + colRW, rightY + rowH, C.borderLight, 0.3);
      rightY += rowH;
    });

    // General Instructions / Doctor Advice
    if (prescription?.advice) {
      rightY += 10;
      rightY = drawPanelHeader(doc, 'General Instructions', rx, rightY, colRW, '#ECFDF5', '#065F46');
      const lines = prescription.advice.split('\n').filter(Boolean);
      lines.forEach((line) => {
        if (rightY + 14 > PAGE.height - PAGE.marginBottom) {
          doc.addPage();
          rightY = PAGE.marginTop + 10;
        }
        doc.font(F.regular).fontSize(7.5).fillColor(C.body);
        const trimmed = line.replace(/^[\s•\-\d.]+/, '').trim();
        doc.text(`•  ${trimmed || line.trim()}`, rx + 8, rightY, { width: colRW - 16, lineGap: 1 });
        rightY = doc.y + 3;
      });
    }

    // Laboratory Investigations
    const labs = prescription?.labs || [];
    if (labs.length > 0) {
      rightY += 10;
      if (rightY + 35 > PAGE.height - PAGE.marginBottom) {
        doc.addPage();
        rightY = PAGE.marginTop + 10;
      }
      rightY = drawPanelHeader(doc, 'Laboratory Investigations', rx, rightY, colRW, '#F0F4FF', '#1E40AF');
      
      const labCols = [
        { label: 'Test Name', w: 110 },
        { label: 'Sample', w: 70 },
        { label: 'Purpose', w: colRW - 180 }
      ];
      
      roundRect(doc, rx, rightY, colRW, 14, 0, C.tableHeaderBg);
      let lx = rx;
      labCols.forEach((col) => {
        doc.font(F.bold).fontSize(6.5).fillColor(C.muted);
        doc.text(col.label, lx + 4, rightY + 4, { width: col.w - 8 });
        lx += col.w;
      });
      rightY += 14;

      labs.forEach((lab) => {
        let estRowH = 20;
        if (rightY + estRowH > PAGE.height - PAGE.marginBottom) {
          doc.addPage();
          rightY = PAGE.marginTop + 10;
          roundRect(doc, rx, rightY, colRW, 14, 0, C.tableHeaderBg);
          let lx = rx;
          labCols.forEach((col) => {
            doc.font(F.bold).fontSize(6.5).fillColor(C.muted);
            doc.text(col.label, lx + 4, rightY + 4, { width: col.w - 8 });
            lx += col.w;
          });
          rightY += 14;
        }
        
        let lx = rx;
        doc.font(F.bold).fontSize(7.5).fillColor(C.heading);
        doc.text(lab.testName || '—', lx + 4, rightY + 3, { width: labCols[0].w - 8 });
        let testY = doc.y;
        
        doc.font(F.regular).fontSize(7).fillColor(C.body);
        doc.text(lab.sampleRequired || 'Blood', lx + labCols[0].w + 4, rightY + 3, { width: labCols[1].w - 8 });
        let sampleY = doc.y;
        
        doc.text(lab.reason || 'To rule out infection', lx + labCols[0].w + labCols[1].w + 4, rightY + 3, { width: labCols[2].w - 8 });
        let reasonY = doc.y;
        
        let rowH = Math.max(14, testY - rightY + 3, sampleY - rightY + 3, reasonY - rightY + 3);
        
        hLine(doc, rx, rx + colRW, rightY + rowH, C.borderLight, 0.3);
        rightY += rowH;
      });
    }

    // Procedures Recommended
    const procedures = prescription?.procedures || [];
    if (procedures.length > 0) {
      rightY += 10;
      if (rightY + 35 > PAGE.height - PAGE.marginBottom) {
        doc.addPage();
        rightY = PAGE.marginTop + 10;
      }
      rightY = drawPanelHeader(doc, 'Procedures Recommended', rx, rightY, colRW, '#FDF2F8', '#9D174D');
      
      const procCols = [
        { label: 'Procedure', w: 180 },
        { label: 'Frequency', w: colRW - 180 }
      ];

      roundRect(doc, rx, rightY, colRW, 14, 0, C.tableHeaderBg);
      let px = rx;
      procCols.forEach((col) => {
        doc.font(F.bold).fontSize(6.5).fillColor(C.muted);
        doc.text(col.label, px + 4, rightY + 4, { width: col.w - 8 });
        px += col.w;
      });
      rightY += 14;

      procedures.forEach((proc) => {
        if (rightY + 20 > PAGE.height - PAGE.marginBottom) {
          doc.addPage();
          rightY = PAGE.marginTop + 10;
          roundRect(doc, rx, rightY, colRW, 14, 0, C.tableHeaderBg);
          let px = rx;
          procCols.forEach((col) => {
            doc.font(F.bold).fontSize(6.5).fillColor(C.muted);
            doc.text(col.label, px + 4, rightY + 4, { width: col.w - 8 });
            px += col.w;
          });
          rightY += 14;
        }

        let px = rx;
        doc.font(F.bold).fontSize(7.5).fillColor(C.heading);
        doc.text(proc.name || '—', px + 4, rightY + 3, { width: procCols[0].w - 8 });
        let nameY = doc.y;

        doc.font(F.regular).fontSize(7).fillColor(C.body);
        doc.text(proc.frequency || 'Once', px + procCols[0].w + 4, rightY + 3, { width: procCols[1].w - 8 });
        let freqY = doc.y;

        let rowH = Math.max(14, nameY - rightY + 3, freqY - rightY + 3);

        hLine(doc, rx, rx + colRW, rightY + rowH, C.borderLight, 0.3);
        rightY += rowH;
      });
    }

    // Follow up box
    if (consultation.followUp && consultation.followUp.required) {
      rightY += 10;
      if (rightY + 35 > PAGE.height - PAGE.marginBottom) {
        doc.addPage();
        rightY = PAGE.marginTop + 10;
      }
      rightY = drawPanelHeader(doc, 'Follow Up Plan', rx, rightY, colRW, '#FFFBEB', '#92400E');
      
      roundRect(doc, rx, rightY, colRW, 30, 4, C.sectionBg, C.borderLight);
      doc.font(F.bold).fontSize(7.5).fillColor(C.label);
      doc.text('Date:', rx + 10, rightY + 5, { lineBreak: false });
      doc.font(F.bold).fontSize(8.5).fillColor(C.heading);
      doc.text(fmtDate(consultation.followUp.date), rx + 38, rightY + 5, { lineBreak: false });

      if (consultation.followUp.notes) {
        doc.font(F.bold).fontSize(7.5).fillColor(C.label);
        doc.text('Notes:', rx + 10, rightY + 16, { lineBreak: false });
        doc.font(F.regular).fontSize(7.5).fillColor(C.body);
        doc.text(consultation.followUp.notes, rx + 38, rightY + 16, { width: colRW - 48 });
      }
      rightY += 36;
    }

    // Doctor signature at the bottom of the final page
    ensureSpace(doc, 60);
    
    // Position signature block on the right side
    const sigW = 160;
    const sigX = R - sigW;
    const sigY = doc.page.height - PAGE.marginBottom - 45;

    doc.save().strokeColor(C.border).lineWidth(0.8).moveTo(sigX, sigY).lineTo(R, sigY).stroke().restore();

    doc.font(F.bold).fontSize(8.5).fillColor(C.heading);
    doc.text(`Dr. ${doctor?.fullName || 'Shyam Verma'}`, sigX, sigY + 5, { width: sigW, align: 'center' });

    doc.font(F.regular).fontSize(7).fillColor(C.muted);
    doc.text(doctor?.specialization || 'Consultant Physician', sigX, doc.y, { width: sigW, align: 'center' });
    doc.text(`Reg. No.: ${doctor?.medicalRegistrationNumber || '98765'}`, sigX, doc.y, { width: sigW, align: 'center' });
    doc.font(F.italic).fontSize(6.5).fillColor(C.accent);
    doc.text('Digitally Signed Report', sigX, doc.y + 2, { width: sigW, align: 'center' });

    // ──────────────────────────────────────────────
    // POST-RENDER: Header, Footer, Watermark on ALL pages
    // ──────────────────────────────────────────────
    // ──────────────────────────────────────────────
    const range = doc.bufferedPageRange();
    const totalPages = range.count;

    for (let i = 0; i < totalPages; i += 1) {
      doc.switchToPage(i);
      const origMargins = { ...doc.page.margins };
      doc.page.margins = { top: 0, bottom: 0, left: 0, right: 0 };

      renderWatermark(doc, clinic);
      renderHeader(doc, clinic, doctor, patient, consultation, qrBuffer, i, totalPages);
      renderFooter(doc, clinic, consultation, i, totalPages);

      doc.page.margins = origMargins;
    }

    doc.end();
  });

  return { filePath, relativePath };
};

module.exports = { generateConsultationPdf };
