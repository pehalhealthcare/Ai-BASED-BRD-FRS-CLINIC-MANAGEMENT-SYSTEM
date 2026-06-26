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
  marginTop: 110,
  marginBottom: 80,
};

const CW = PAGE.width - PAGE.marginLeft - PAGE.marginRight; // content width

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
  doc.y += 5;
  doc.x = PAGE.marginLeft;
};

// ────────────────────────────────────────────────────────────────────────────
// HEADER (every page)
// ────────────────────────────────────────────────────────────────────────────

const renderHeader = (doc, clinic, doctor) => {
  const top = 20;
  const L = PAGE.marginLeft;
  const R = PAGE.width - PAGE.marginRight;
  const o = { lineBreak: false };

  // White background strip
  doc.save().rect(0, 0, PAGE.width, PAGE.marginTop - 4).fillColor(C.white).fill().restore();

  // ── Left: Clinic name & address
  doc.font(F.bold).fontSize(13).fillColor(C.primary);
  doc.text(clinic?.name || 'Hospital Name', L, top, { width: CW * 0.55, ...o });

  const addr = buildAddress(clinic?.address);
  doc.font(F.regular).fontSize(7).fillColor(C.muted);
  const addrY = top + 17;
  // wrap address across 2 lines max
  const addrLines = addr.length > 55
    ? [addr.substring(0, addr.lastIndexOf(',', 55) + 1), addr.substring(addr.lastIndexOf(',', 55) + 1).trim()]
    : [addr];
  addrLines.forEach((line, i) => {
    doc.text(line, L, addrY + i * 10, { width: CW * 0.55, ...o });
  });

  const phoneY = addrY + addrLines.length * 10 + 2;
  doc.text(`Reception: ${clinic?.phone || 'N/A'}`, L, phoneY, { width: CW * 0.55, ...o });

  // ── Right: Doctor info
  const rW = CW * 0.40;
  const rX = R - rW;
  doc.font(F.bold).fontSize(10.5).fillColor(C.heading);
  doc.text(`Dr. ${doctor?.fullName || 'Doctor'}`, rX, top, { width: rW, align: 'right', ...o });

  let dy = top + 14;
  if (doctor?.specialization) {
    doc.font(F.italic).fontSize(8).fillColor(C.accent);
    doc.text(doctor.specialization, rX, dy, { width: rW, align: 'right', ...o });
    dy += 11;
  }
  if (doctor?.medicalRegistrationNumber) {
    doc.font(F.regular).fontSize(7).fillColor(C.muted);
    doc.text(`Reg. No.: ${doctor.medicalRegistrationNumber}`, rX, dy, { width: rW, align: 'right', ...o });
    dy += 10;
  }
  if (doctor?.qualification) {
    doc.font(F.regular).fontSize(7).fillColor(C.muted);
    doc.text(doctor.qualification, rX, dy, { width: rW, align: 'right', ...o });
    dy += 10;
  }

  // ── Thick teal divider
  const lineY = PAGE.marginTop - 6;
  doc.save().strokeColor(C.primary).lineWidth(2).moveTo(L, lineY).lineTo(R, lineY).stroke().restore();
  doc.save().strokeColor(C.borderLight).lineWidth(0.4).moveTo(L, lineY + 3).lineTo(R, lineY + 3).stroke().restore();
};

// ────────────────────────────────────────────────────────────────────────────
// FOOTER (every page)
// ────────────────────────────────────────────────────────────────────────────

const renderFooter = (doc, clinic, pageIdx, totalPages) => {
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
  doc.text(clinic?.name || '', L, sy + 26, o);
  doc.font(F.regular).fontSize(7).fillColor(C.muted);
  doc.text(`Page ${pageIdx + 1} / ${totalPages}`, L, sy + 26, { width: CW, align: 'right', ...o });
};

// ────────────────────────────────────────────────────────────────────────────
// WATERMARK
// ────────────────────────────────────────────────────────────────────────────

const renderWatermark = (doc, clinic) => {
  doc.save();
  doc.fillOpacity(0.03).fillColor('#000').fontSize(48).font(F.bold);
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

    // ──────────────────────────────────────────────
    // PATIENT INFO CARD
    // ──────────────────────────────────────────────
    doc.y = PAGE.marginTop + 4;
    doc.x = L;

    const cardY = doc.y;
    const cardH = 72;
    roundRect(doc, L, cardY, CW, cardH, 5, C.sectionBg, C.borderLight);

    // Divide into 4 columns
    const c1x = L + 10;
    const c2x = L + CW * 0.28;
    const c3x = L + CW * 0.50;
    const c4x = L + CW * 0.73;
    const fh = 12; // field height

    // Patient Name (bold header)
    let fy = cardY + 6;
    doc.font(F.regular).fontSize(6.5).fillColor(C.label);
    doc.text('Patient Name', c1x, fy, { lineBreak: false });
    doc.font(F.bold).fontSize(9).fillColor(C.heading);
    doc.text(patient?.fullName || 'N/A', c2x, fy, { lineBreak: false });

    // Age/Gender
    doc.font(F.regular).fontSize(6.5).fillColor(C.label);
    doc.text('Age / Gender', c3x, fy, { lineBreak: false });
    doc.font(F.regular).fontSize(8).fillColor(C.body);
    const ageGender = `${patient?.age ?? '—'} Years / ${capitalize(patient?.gender || '—')}`;
    doc.text(ageGender, c4x, fy, { lineBreak: false });

    // Row 2
    fy += fh;
    doc.font(F.regular).fontSize(6.5).fillColor(C.label);
    doc.text('Patient ID', c1x, fy, { lineBreak: false });
    doc.font(F.regular).fontSize(8).fillColor(C.body);
    doc.text(patient?.patientId || 'N/A', c2x, fy, { lineBreak: false });

    doc.font(F.regular).fontSize(6.5).fillColor(C.label);
    doc.text('Date', c3x, fy, { lineBreak: false });
    doc.font(F.regular).fontSize(8).fillColor(C.body);
    doc.text(fmtDate(consultation.completedAt || consultation.createdAt), c4x, fy, { lineBreak: false });

    // Row 3
    fy += fh;
    doc.font(F.regular).fontSize(6.5).fillColor(C.label);
    doc.text('Phone', c1x, fy, { lineBreak: false });
    doc.font(F.regular).fontSize(8).fillColor(C.body);
    doc.text(patient?.phone || 'N/A', c2x, fy, { lineBreak: false });

    doc.font(F.regular).fontSize(6.5).fillColor(C.label);
    doc.text('Status', c3x, fy, { lineBreak: false });
    // Status badge
    const statusText = (consultation.status || 'completed').toUpperCase();
    const bw = doc.font(F.bold).fontSize(7).widthOfString(statusText) + 14;
    roundRect(doc, c4x, fy - 1, bw, 12, 3, C.badgeBg);
    doc.font(F.bold).fontSize(7).fillColor(C.badgeText);
    doc.text(statusText, c4x + 7, fy + 1, { lineBreak: false });

    // Row 4
    fy += fh;
    doc.font(F.regular).fontSize(6.5).fillColor(C.label);
    doc.text('Blood Group', c1x, fy, { lineBreak: false });
    doc.font(F.bold).fontSize(8).fillColor(C.body);
    doc.text(patient?.bloodGroup || '—', c2x, fy, { lineBreak: false });

    doc.font(F.regular).fontSize(6.5).fillColor(C.label);
    doc.text('Appointment ID', c3x, fy, { lineBreak: false });
    doc.font(F.regular).fontSize(8).fillColor(C.body);
    const apptId = String(consultation.appointmentId?.appointmentId || consultation.appointmentId?._id || consultation.appointmentId || '—');
    doc.text(apptId.length > 12 ? apptId.slice(-10).toUpperCase() : apptId, c4x, fy, { lineBreak: false });

    // Row 5 - Allergies & Known Conditions
    fy += fh;
    doc.font(F.regular).fontSize(6.5).fillColor(C.label);
    doc.text('Allergies', c1x, fy, { lineBreak: false });
    doc.font(F.regular).fontSize(7.5).fillColor(C.emergency);
    const allergies = patient?.allergies?.length ? patient.allergies.join(', ') : 'None';
    doc.text(allergies, c2x, fy, { lineBreak: false });

    doc.font(F.regular).fontSize(6.5).fillColor(C.label);
    doc.text('Known Conditions', c3x, fy, { lineBreak: false });
    doc.font(F.regular).fontSize(7.5).fillColor(C.body);
    const conditions = patient?.chronicConditions?.length ? patient.chronicConditions.join(', ') : 'None';
    doc.text(conditions, c4x, fy, { width: CW - (c4x - L) - 8 });

    doc.y = cardY + cardH + 8;
    doc.x = L;

    // ──────────────────────────────────────────────
    // 1. CHIEF COMPLAINT
    // ──────────────────────────────────────────────
    sectionHeader(doc, 1, 'Chief Complaint');
    doc.font(F.regular).fontSize(8.5).fillColor(C.body);
    doc.text(consultation.chiefComplaint || 'No chief complaint documented.', L + 4, doc.y, { width: CW - 8, lineGap: 1 });
    doc.moveDown(0.6);

    // ──────────────────────────────────────────────
    // 2. CLINICAL NOTES — SOAP
    // ──────────────────────────────────────────────
    const soap = consultation.formattedClinicalNotes;
    if (soap && (soap.subjective || soap.objective || soap.assessment || soap.plan)) {
      sectionHeader(doc, 2, 'Clinical Notes — SOAP');

      const soapItems = [
        { letter: 'S', label: 'Subjective', text: soap.subjective, color: C.soapS },
        { letter: 'O', label: 'Objective', text: soap.objective, color: C.soapO },
        { letter: 'A', label: 'Assessment', text: soap.assessment, color: C.soapA },
        { letter: 'P', label: 'Plan', text: soap.plan, color: C.soapP },
      ];

      soapItems.forEach((item) => {
        if (!item.text) return;
        ensureSpace(doc, 28);
        const sy = doc.y;
        // Letter badge
        roundRect(doc, L + 4, sy, 16, 14, 3, item.color);
        doc.font(F.bold).fontSize(9).fillColor(C.white);
        doc.text(item.letter, L + 4, sy + 3, { width: 16, align: 'center' });
        // Label
        doc.font(F.bold).fontSize(8).fillColor(C.heading);
        doc.text(item.label, L + 26, sy + 1, { width: CW - 30 });
        // Body
        doc.font(F.regular).fontSize(8).fillColor(C.body);
        doc.text(item.text, L + 26, doc.y + 1, { width: CW - 30, lineGap: 1.5 });
        doc.moveDown(0.5);
      });
      doc.moveDown(0.3);
    } else if (consultation.clinicalNotes) {
      sectionHeader(doc, 2, 'Clinical Notes');
      doc.font(F.regular).fontSize(8.5).fillColor(C.body);
      doc.text(consultation.clinicalNotes, L + 4, doc.y, { width: CW - 8, lineGap: 2 });
      doc.moveDown(0.6);
    }

    // ──────────────────────────────────────────────
    // 3. DIAGNOSIS
    // ──────────────────────────────────────────────
    if (consultation.diagnosis && (consultation.diagnosis.primary || consultation.diagnosis.notes)) {
      sectionHeader(doc, 3, 'Diagnosis');

      const diagY = doc.y;
      const halfW = CW / 2 - 4;

      // Primary
      doc.font(F.bold).fontSize(7).fillColor(C.label);
      doc.text('Primary Diagnosis', L + 4, diagY, { width: halfW });
      doc.font(F.bold).fontSize(9).fillColor(C.primary);
      doc.text(consultation.diagnosis.primary || 'N/A', L + 4, doc.y, { width: halfW });

      // Secondary
      const secY = diagY;
      if (consultation.diagnosis.secondary && consultation.diagnosis.secondary.length > 0) {
        doc.font(F.bold).fontSize(7).fillColor(C.label);
        doc.text('Secondary Diagnosis', L + halfW + 8, secY, { width: halfW });
        doc.font(F.regular).fontSize(8.5).fillColor(C.body);
        doc.text(consultation.diagnosis.secondary.join(', '), L + halfW + 8, doc.y, { width: halfW });
      }

      if (consultation.diagnosis.notes) {
        doc.moveDown(0.3);
        doc.font(F.bold).fontSize(7).fillColor(C.label);
        doc.text('Notes:', L + 4, doc.y, { continued: true });
        doc.font(F.regular).fontSize(8).fillColor(C.body);
        doc.text(`  ${consultation.diagnosis.notes}`, { width: CW - 8 });
      }
      doc.moveDown(0.6);
    }

    // ──────────────────────────────────────────────
    // 4. TREATMENT PLAN & ADVICE
    // ──────────────────────────────────────────────
    if (consultation.treatmentPlan) {
      sectionHeader(doc, 4, 'Treatment Plan & Advice');
      const lines = consultation.treatmentPlan.split('\n').filter(Boolean);
      lines.forEach((line) => {
        ensureSpace(doc, 14);
        doc.font(F.regular).fontSize(8).fillColor(C.body);
        const trimmed = line.replace(/^[\s•\-\d.]+/, '').trim();
        doc.text(`  •  ${trimmed || line.trim()}`, L + 4, doc.y, { width: CW - 12, lineGap: 1 });
      });
      doc.moveDown(0.6);
    }

    // ──────────────────────────────────────────────
    // 5. PRESCRIPTION MEDICINES
    // ──────────────────────────────────────────────
    const medicines = prescription?.medicines || [];
    if (medicines.length > 0) {
      sectionHeader(doc, 5, 'Prescription Medicines');
      ensureSpace(doc, 40);

      const medCols = [
        { label: '#', w: 18, align: 'center' },
        { label: 'Medicine & Strength', w: CW * 0.24 },
        { label: 'Dose & Frequency', w: CW * 0.18 },
        { label: 'Duration', w: CW * 0.11, align: 'center' },
        { label: 'Instructions', w: CW * 0.22 },
        { label: 'Qty', w: CW * 0.08, align: 'center' },
      ];
      // Adjust last column width to fill remaining
      const usedW = medCols.reduce((s, c) => s + c.w, 0);
      medCols[medCols.length - 1].w += CW - usedW;

      let ty = drawTableHeader(doc, medCols, doc.y);

      medicines.forEach((med, idx) => {
        ensureSpace(doc, 28);
        // Medicine name row (bold) + generic/route row (small)
        const rowY = doc.y > ty ? doc.y : ty;

        // # column
        let cx = L;
        doc.font(F.bold).fontSize(7).fillColor(C.body);
        doc.text(String(idx + 1), cx + 3, rowY + 2, { width: medCols[0].w - 6, align: 'center' });
        cx += medCols[0].w;

        // Medicine name + generic
        doc.font(F.bold).fontSize(7.5).fillColor(C.heading);
        doc.text(med.medicineName || '—', cx + 3, rowY + 1, { width: medCols[1].w - 6 });
        if (med.genericName || med.route) {
          doc.font(F.italic).fontSize(6).fillColor(C.muted);
          const subText = [med.genericName, med.route ? capitalize(med.route) : ''].filter(Boolean).join(' • ');
          doc.text(subText, cx + 3, doc.y, { width: medCols[1].w - 6 });
        }
        cx += medCols[1].w;

        // Dose & Frequency
        doc.font(F.regular).fontSize(7).fillColor(C.body);
        const doseFreq = [med.dosage, med.frequency].filter(Boolean).join('\n');
        doc.text(doseFreq || '—', cx + 3, rowY + 2, { width: medCols[2].w - 6 });
        cx += medCols[2].w;

        // Duration
        doc.font(F.regular).fontSize(7).fillColor(C.body);
        doc.text(med.duration || '—', cx + 3, rowY + 2, { width: medCols[3].w - 6, align: 'center' });
        cx += medCols[3].w;

        // Instructions
        doc.font(F.regular).fontSize(7).fillColor(C.body);
        const instr = med.instructions || med.timing || '—';
        doc.text(instr, cx + 3, rowY + 2, { width: medCols[4].w - 6 });
        cx += medCols[4].w;

        // Qty
        doc.font(F.bold).fontSize(7).fillColor(C.body);
        doc.text(med.quantity ? String(med.quantity) : '—', cx + 3, rowY + 2, { width: medCols[5].w - 6, align: 'center' });

        // Bottom border
        const rowBottom = Math.max(doc.y + 4, rowY + 18);
        hLine(doc, L, L + CW, rowBottom, C.borderLight, 0.3);
        doc.y = rowBottom + 1;
        ty = doc.y;
      });
      doc.moveDown(0.5);
    }

    // ──────────────────────────────────────────────
    // 6. LAB TESTS   |   7. PROCEDURES
    // ──────────────────────────────────────────────
    const labs = prescription?.labs || [];
    const procedures = prescription?.procedures || [];

    if (labs.length > 0 || procedures.length > 0) {
      const halfW = CW / 2 - 4;

      // LAB TESTS
      if (labs.length > 0) {
        sectionHeader(doc, 6, 'Lab Tests');
        ensureSpace(doc, 40);

        const labCols = [
          { label: 'Test Name', w: halfW * 0.40 },
          { label: 'Priority', w: halfW * 0.22 },
          { label: 'Sample', w: halfW * 0.20 },
          { label: 'Reason', w: halfW * 0.18 + (CW - halfW) },
        ];

        let ly = drawTableHeader(doc, labCols, doc.y);
        labs.forEach((lab, i) => {
          ensureSpace(doc, 16);
          ly = drawTableRow(doc, labCols, [
            lab.testName || '—',
            capitalize(lab.priority || 'routine'),
            lab.sampleRequired || 'Blood',
            lab.reason || '—'
          ], doc.y > ly ? doc.y : ly, i % 2 === 1);
          doc.y = ly;
        });
        doc.moveDown(0.5);
      }

      // PROCEDURES
      if (procedures.length > 0) {
        sectionHeader(doc, 7, 'Procedures');
        ensureSpace(doc, 40);

        const procCols = [
          { label: 'Procedure', w: CW * 0.35 },
          { label: 'Code', w: CW * 0.15 },
          { label: 'Fee (₹)', w: CW * 0.15, align: 'right' },
          { label: 'Status', w: CW * 0.35 },
        ];

        let py = drawTableHeader(doc, procCols, doc.y);
        procedures.forEach((proc, i) => {
          ensureSpace(doc, 16);
          py = drawTableRow(doc, procCols, [
            proc.name || '—',
            proc.code || '—',
            proc.fee ? `₹ ${proc.fee}` : '—',
            capitalize(proc.status || 'scheduled'),
          ], doc.y > py ? doc.y : py, i % 2 === 1);
          doc.y = py;
        });
        doc.moveDown(0.5);
      }
    }

    // ──────────────────────────────────────────────
    // 8. VITALS
    // ──────────────────────────────────────────────
    if (consultation.vitals && Object.keys(consultation.vitals).length > 0) {
      const v = consultation.vitals;
      const vitals = [
        v.temperature ? { label: 'Temp', val: `${v.temperature}°F` } : null,
        v.bloodPressure ? { label: 'BP', val: v.bloodPressure } : null,
        v.pulse ? { label: 'Pulse', val: `${v.pulse} bpm` } : null,
        v.respiratoryRate ? { label: 'Resp', val: `${v.respiratoryRate}/min` } : null,
        v.oxygenSaturation ? { label: 'SpO₂', val: `${v.oxygenSaturation}%` } : null,
        v.weight ? { label: 'Weight', val: `${v.weight} kg` } : null,
        v.height ? { label: 'Height', val: `${v.height} cm` } : null,
      ].filter(Boolean);

      if (vitals.length > 0) {
        sectionHeader(doc, 8, 'Vitals & Measurements');
        ensureSpace(doc, 32);

        const pillW = Math.min(68, (CW - (vitals.length - 1) * 6) / vitals.length);
        const py = doc.y;
        vitals.forEach((vi, idx) => {
          const px = L + idx * (pillW + 6);
          roundRect(doc, px, py, pillW, 28, 4, C.primaryLight, C.accent);
          doc.font(F.bold).fontSize(9).fillColor(C.primary);
          doc.text(vi.val, px + 3, py + 4, { width: pillW - 6, align: 'center' });
          doc.font(F.regular).fontSize(6).fillColor(C.muted);
          doc.text(vi.label, px + 3, py + 17, { width: pillW - 6, align: 'center' });
        });
        doc.y = py + 34;
        doc.moveDown(0.3);
      }
    }

    // ──────────────────────────────────────────────
    // 9. FOLLOW-UP
    // ──────────────────────────────────────────────
    if (consultation.followUp && consultation.followUp.required) {
      sectionHeader(doc, 9, 'Follow Up');
      ensureSpace(doc, 34);

      const fuY = doc.y;
      roundRect(doc, L, fuY, CW, 28, 4, C.primaryLight, C.accent);

      doc.font(F.bold).fontSize(8).fillColor(C.label);
      doc.text('Follow-up Required:', L + 10, fuY + 4, { lineBreak: false });
      doc.font(F.bold).fontSize(9).fillColor(C.badgeText);
      doc.text('Yes', L + 110, fuY + 4, { lineBreak: false });

      doc.font(F.bold).fontSize(8).fillColor(C.label);
      doc.text('Follow-up Date:', L + 160, fuY + 4, { lineBreak: false });
      doc.font(F.bold).fontSize(9).fillColor(C.heading);
      doc.text(fmtDate(consultation.followUp.date), L + 250, fuY + 4, { lineBreak: false });

      if (consultation.followUp.notes) {
        doc.font(F.bold).fontSize(7).fillColor(C.label);
        doc.text('Reason:', L + 10, fuY + 16, { lineBreak: false });
        doc.font(F.regular).fontSize(7.5).fillColor(C.body);
        doc.text(consultation.followUp.notes, L + 55, fuY + 16, { width: CW - 65 });
      }

      doc.y = fuY + 34;
      doc.moveDown(0.5);
    }

    // ──────────────────────────────────────────────
    // 10. AI CLINICAL ASSISTANT SUMMARY
    // ──────────────────────────────────────────────
    if (consultation.aiSuggestions && consultation.aiSuggestions.status === 'generated' && consultation.aiSuggestions.suggestions?.length > 0) {
      sectionHeader(doc, 10, 'AI Clinical Assistant Summary');
      ensureSpace(doc, 40);

      const aiY = doc.y;
      roundRect(doc, L, aiY, CW, 4 + consultation.aiSuggestions.suggestions.length * 14, 4, C.sectionBg, C.borderLight);

      let aiy = aiY + 4;
      consultation.aiSuggestions.suggestions.forEach((sug) => {
        doc.font(F.regular).fontSize(7.5).fillColor(C.body);
        const conf = sug.confidence ? ` (${Math.round(sug.confidence * 100)}%)` : '';
        doc.text(`•  ${sug.condition}${conf}`, L + 10, aiy, { width: CW - 20 });
        aiy += 14;
      });

      doc.y = aiy + 4;
      doc.moveDown(0.5);
    }

    // ──────────────────────────────────────────────
    // PATIENT ADVICE (from prescription)
    // ──────────────────────────────────────────────
    if (prescription?.advice) {
      ensureSpace(doc, 40);
      sectionHeader(doc, consultation.aiSuggestions?.suggestions?.length > 0 ? 11 : 10, 'Patient Advice');
      const adviceLines = prescription.advice.split('\n').filter(Boolean);
      adviceLines.forEach((line) => {
        ensureSpace(doc, 12);
        doc.font(F.regular).fontSize(7.5).fillColor(C.body);
        const trimmed = line.replace(/^[\s•\-\d.]+/, '').trim();
        doc.text(`  •  ${trimmed || line.trim()}`, L + 4, doc.y, { width: CW - 12, lineGap: 1 });
      });
      doc.moveDown(0.5);
    }

    // ──────────────────────────────────────────────
    // DOCTOR SIGNATURE BLOCK
    // ──────────────────────────────────────────────
    ensureSpace(doc, 55);
    doc.moveDown(1);

    const sigW = 180;
    const sigX = R - sigW;
    const sigY = doc.y;

    // Signature line
    doc.save().strokeColor(C.border).lineWidth(0.8).moveTo(sigX, sigY).lineTo(R, sigY).stroke().restore();

    doc.font(F.bold).fontSize(10).fillColor(C.heading);
    doc.text(`Dr. ${doctor?.fullName || 'Doctor'}`, sigX, sigY + 5, { width: sigW, align: 'center' });

    if (doctor?.specialization) {
      doc.font(F.italic).fontSize(7.5).fillColor(C.accent);
      doc.text(doctor.specialization, sigX, doc.y, { width: sigW, align: 'center' });
    }
    if (doctor?.medicalRegistrationNumber) {
      doc.font(F.regular).fontSize(7).fillColor(C.muted);
      doc.text(`Reg. No.: ${doctor.medicalRegistrationNumber}`, sigX, doc.y, { width: sigW, align: 'center' });
    }
    doc.font(F.italic).fontSize(7).fillColor(C.muted);
    doc.text('Digitally Signed', sigX, doc.y + 2, { width: sigW, align: 'center' });

    // ──────────────────────────────────────────────
    // POST-RENDER: Header, Footer, Watermark on ALL pages
    // ──────────────────────────────────────────────
    const range = doc.bufferedPageRange();
    const totalPages = range.count;

    for (let i = 0; i < totalPages; i += 1) {
      doc.switchToPage(i);
      const origMargins = { ...doc.page.margins };
      doc.page.margins = { top: 0, bottom: 0, left: 0, right: 0 };

      renderWatermark(doc, clinic);
      renderHeader(doc, clinic, doctor);
      renderFooter(doc, clinic, i, totalPages);

      doc.page.margins = origMargins;
    }

    doc.end();
  });

  return { filePath, relativePath };
};

module.exports = { generateConsultationPdf };
