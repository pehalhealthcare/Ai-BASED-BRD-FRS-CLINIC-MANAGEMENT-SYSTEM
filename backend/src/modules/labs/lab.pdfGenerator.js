const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const fs = require("fs");

/**
 * Lab Report PDF Generator
 * Renders laboratory reports matching the official AICMS dual Clinic + Laboratory design (Reference UI).
 * Uses true A4 page geometry, vector icons for badges/comments/signatures, and robust multi-page pagination.
 */
const COLORS = {
  primary: "#1e293b",
  primaryDark: "#0f172a",
  accent: "#7c3aed",
  accentLight: "#faf5ff",
  accentBorder: "#e9d5ff",
  tableHeaderBg: "#eff6ff",
  cardBg: "#f8fafc",
  cardBorder: "#e2e8f0",
  rowBorder: "#f1f5f9",
  text: "#0f172a",
  textMuted: "#64748b",
  textSubtle: "#334155",
  brandOrange: "#ea580c",
  brandGreen: "#10b981",
  white: "#ffffff",
  // Badge colors
  normalBg: "#ecfdf5",
  normalBorder: "#a7f3d0",
  normalText: "#047857",
  lowBg: "#fffbeb",
  lowBorder: "#fde68a",
  lowText: "#b45309",
  highBg: "#fffbeb",
  highBorder: "#fde68a",
  highText: "#b45309",
  criticalBg: "#fef2f2",
  criticalBorder: "#fecdd3",
  criticalText: "#be123c"
};

const getFlag = (r) => (r.manualFlag || r.effectiveFlag || r.autoFlag || "normal").toLowerCase();

const toAsciiSafe = (val, fallback = "-") => {
  if (val == null || val === "") return fallback;
  return String(val)
    .replace(/[\u2013\u2014]/g, "-") // replace en-dash and em-dash with hyphen
    .replace(/[\u00B5\u03BC]/g, "u") // replace greek micro with u (e.g. uL)
    .replace(/[^\x00-\x7F]/g, "");    // strip any remaining non-ASCII characters to prevent Helvetica corruption
};

/**
 * Draws official PEHAL vector logo (top/bottom swoop arches + PEHAL wordmark + medical cross).
 */
const drawPehalLogo = (doc, x, y, scale = 0.045) => {
  doc.save();
  doc.translate(x, y);
  doc.scale(scale);

  // Top Swooshes
  doc.path("M 218 135 C 310 18, 590 10, 830 145 C 730 80, 480 70, 310 130 C 275 142, 235 142, 218 135 Z").fill("#00B140");
  doc.path("M 285 160 C 370 70, 600 60, 715 155 C 640 110, 460 100, 350 152 C 325 164, 295 164, 285 160 Z").fill("#F58220");
  doc.path("M 350 178 C 420 110, 560 105, 630 175 C 570 140, 470 135, 400 172 C 380 182, 360 182, 350 178 Z").fill("#00B140");

  // Bottom Swooshes
  doc.path("M 782 565 C 690 682, 410 690, 170 555 C 270 620, 520 630, 690 570 C 725 558, 765 558, 782 565 Z").fill("#00B140");
  doc.path("M 715 540 C 630 630, 400 640, 285 545 C 360 590, 540 600, 650 548 C 675 536, 705 536, 715 540 Z").fill("#F58220");
  doc.path("M 650 522 C 580 590, 440 595, 370 525 C 430 560, 530 565, 600 528 C 620 518, 640 518, 650 522 Z").fill("#00B140");

  // PEHAL Wordmark
  doc.path("M 2 290 L 160 290 C 205 290, 222 305, 222 342 L 222 360 C 222 398, 205 412, 160 412 L 72 412 L 72 470 L 2 470 L 2 315 L 25 290 Z M 72 338 L 72 364 L 152 364 L 152 338 Z").fill("#F58220");
  doc.path("M 238 290 L 388 290 L 388 335 L 308 335 L 308 355 L 380 355 L 380 400 L 308 400 L 308 425 L 392 425 L 392 470 L 238 470 Z").fill("#F58220");
  doc.path("M 408 290 L 478 290 L 478 470 L 408 470 Z").fill("#F58220");
  doc.path("M 568 290 L 638 290 L 638 470 L 568 470 Z").fill("#F58220");
  doc.path("M 654 470 L 714 290 L 784 290 L 844 470 L 772 470 L 760 425 L 710 425 L 698 470 Z M 720 375 L 750 375 L 735 320 Z").fill("#F58220");
  doc.path("M 860 290 L 930 290 L 930 425 L 998 425 L 998 470 L 860 470 Z").fill("#F58220");

  // Medical Cross
  doc.path("M 503 330 H 543 V 370 H 583 V 410 H 543 V 450 H 503 V 410 H 463 V 370 H 503 Z").fill("#FFFFFF");
  doc.path("M 506 335 H 540 V 373 H 578 V 407 H 540 V 445 H 506 V 407 H 468 V 373 H 506 Z").fill("#00B140");

  // HEALTHCARE Subtitle
  doc.fillColor("#00B140").fontSize(42).font("Helvetica-Bold").text("HEALTHCARE", 180, 500, { lineBreak: false });

  doc.restore();
};

const formatDate = (d) => {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return String(d);
  }
};

const formatDateTime = (d) => {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return String(d);
  }
};

/**
 * Builds the PDF document into a stream.
 */
const buildLabReportPdfDoc = async ({
  order,
  report,
  results = [],
  clinic,
  lab,
  patient,
  doctor,
  technician,
  testTitle
}) => {
  const doc = new PDFDocument({
    size: "A4", // 595.28 x 841.89 pt
    margins: { top: 20, bottom: 20, left: 28, right: 28 },
    bufferPages: true,
    autoFirstPage: true
  });

  const PAGE_W = 595.28;
  const PAGE_H = 841.89;
  const LEFT_X = 28;
  const W = PAGE_W - 56; // 539.28 pt usable width
  const MAX_CONTENT_Y = 800; // boundary before bottom footer
  const FOOTER_Y = PAGE_H - 28; // 813.89 pt

  // Data Normalization
  const patientName = toAsciiSafe(patient?.fullName || order?.guestPatient?.fullName || "vidya");
  const patientAge = toAsciiSafe(patient?.age ?? order?.guestPatient?.age ?? "29");
  const patientGender = toAsciiSafe(patient?.gender || order?.guestPatient?.gender || "Female");
  const patientId = toAsciiSafe(patient?.patientId || patient?.uhid || (patient?._id ? `PAT-${String(patient._id).slice(-5).toUpperCase()}` : "PAT-20260904-001"));
  const doctorName = toAsciiSafe(doctor?.fullName || (typeof order?.doctorId === "object" ? order?.doctorId?.fullName : "") || "Dr. Rajesh Sharma");
  const sampleId = toAsciiSafe(order?.sampleId || `SMP-${String(order?._id || "00125").slice(-5).toUpperCase()}`);
  const specimenType = toAsciiSafe(results[0]?.specimenType || order?.tests?.[0]?.specimenType || "Whole Blood (EDTA)");
  const reportNumber = toAsciiSafe(report?.reportNumber || `RPT-${order?.orderNumber || "20260904-0001"}`);
  const displayTestName = toAsciiSafe(testTitle || results[0]?.testName || "Complete Blood Count (CBC)");
  const orderNumber = toAsciiSafe(order?.orderNumber || "LAB-20260904-0001");

  // Clinic & Lab details
  const clinicName = toAsciiSafe(clinic?.name || "Ram's Dental Clinic");
  const clinicBranch = toAsciiSafe(clinic?.branchName || clinic?.branch || "Indirapuram Branch");
  const clinicAddress = toAsciiSafe([
    clinic?.address?.line1 || "Indirapuram",
    clinic?.address?.city || "Ghaziabad",
    clinic?.address?.pincode ? `- ${clinic?.address?.pincode}` : "- 201014"
  ].filter(Boolean).join(", "));
  const clinicPhone = toAsciiSafe(clinic?.phone || "+91 98765 43210");
  const clinicEmail = toAsciiSafe(clinic?.email || "info@ramsdentalclinic.com");

  const labName = toAsciiSafe(lab?.name || "LifeCare Diagnostics Laboratory");
  const labSubtitle = toAsciiSafe(lab?.subtitle || lab?.category || "Diagnostic & Pathology Services");
  const labAddress = toAsciiSafe([
    lab?.address?.line1 || "Sector 62",
    lab?.address?.city || "Noida",
    lab?.address?.pincode ? `- ${lab?.address?.pincode}` : "- 201309"
  ].filter(Boolean).join(", "));
  const labPhone = toAsciiSafe(lab?.phone || lab?.contactNumber || "+91 120 456 7890");
  const labEmail = toAsciiSafe(lab?.email || "info@lifecarediagnostics.com");

  // Total parameter count across groups
  const totalParamsCount = results.reduce((acc, g) => acc + (g.results?.length || 0), 0);

  // Generate QR code buffer
  let qrBuffer = null;
  try {
    const qrDataUrl = await QRCode.toDataURL(
      `https://pehalhealth.com/verify/${reportNumber}`,
      { margin: 0, width: 140, errorCorrectionLevel: "M" }
    );
    qrBuffer = Buffer.from(qrDataUrl.split(",")[1], "base64");
  } catch {
    qrBuffer = null;
  }

  // ── HEADER DRAWING FUNCTIONS ───────────────────────────────────────────────

  /**
   * Draws Full Page 1 Header (Platform bar + Dual Clinic/Lab box)
   */
  const drawPage1Header = () => {
    // 1. Top Platform Branding
    drawPehalLogo(doc, LEFT_X + 2, 20, 0.045);

    // Separator line between logo and text
    doc.rect(LEFT_X + 50, 20, 0.5, 30).fill(COLORS.cardBorder);

    doc.fillColor(COLORS.primaryDark).fontSize(14).font("Helvetica-Bold")
      .text("AICMS", LEFT_X + 56, 19, { lineBreak: false });
    doc.fillColor(COLORS.primaryDark).fontSize(7.5).font("Helvetica-Bold")
      .text("AI-CMS ENTERPRISE", LEFT_X + 56, 33, { lineBreak: false });
    doc.fillColor(COLORS.textMuted).fontSize(6.5).font("Helvetica")
      .text("Empowering Clinics. Enabling Better Care.", LEFT_X + 56, 42, { lineBreak: false });

    // Right: Digitally Powered
    doc.fillColor(COLORS.textMuted).fontSize(7.5).font("Helvetica-Bold")
      .text("Digitally Powered", LEFT_X, 23, { width: W - 4, align: "right", lineBreak: false });
    doc.fillColor(COLORS.textMuted).fontSize(6.5).font("Helvetica")
      .text("Clinics for a Healthier Tomorrow", LEFT_X, 33, { width: W - 4, align: "right", lineBreak: false });

    // Platform divider
    doc.rect(LEFT_X, 54, W, 0.5).fill(COLORS.cardBorder);

    // 2. Dual Clinic (Left) & Laboratory (Right) Box
    const headerBoxY = 60;
    const headerBoxH = 68;
    const halfW = (W - 16) / 2;

    // LEFT: Clinic Info
    doc.circle(LEFT_X + 16, headerBoxY + 20, 13).fill("#faf5ff").stroke(COLORS.accentBorder);
    doc.fillColor(COLORS.accent).fontSize(10).font("Helvetica-Bold")
      .text("C", LEFT_X + 12.5, headerBoxY + 15, { lineBreak: false });

    const clinicTextX = LEFT_X + 36;
    doc.fillColor(COLORS.primaryDark).fontSize(9.5).font("Helvetica-Bold")
      .text(clinicName, clinicTextX, headerBoxY + 6, { width: halfW - 38, lineBreak: false });
    doc.fillColor(COLORS.textSubtle).fontSize(7.5).font("Helvetica-Bold")
      .text(clinicBranch, clinicTextX, headerBoxY + 18, { width: halfW - 38, lineBreak: false });
    doc.fillColor(COLORS.textMuted).fontSize(7).font("Helvetica")
      .text(clinicAddress, clinicTextX, headerBoxY + 30, { width: halfW - 38, lineBreak: false })
      .text(clinicPhone, clinicTextX, headerBoxY + 41, { width: halfW - 38, lineBreak: false })
      .text(clinicEmail, clinicTextX, headerBoxY + 52, { width: halfW - 38, lineBreak: false });

    // Center vertical divider
    doc.rect(LEFT_X + W * 0.5, headerBoxY + 5, 0.75, headerBoxH - 10).fill(COLORS.cardBorder);

    // RIGHT: Laboratory Info
    const rightColX = LEFT_X + W * 0.5 + 10;
    doc.circle(rightColX + 16, headerBoxY + 20, 13).fill("#eff6ff").stroke("#bfdbfe");
    doc.fillColor("#2563eb").fontSize(10).font("Helvetica-Bold")
      .text("L", rightColX + 12.5, headerBoxY + 15, { lineBreak: false });

    const labTextX = rightColX + 36;
    doc.fillColor(COLORS.primaryDark).fontSize(9.5).font("Helvetica-Bold")
      .text(labName, labTextX, headerBoxY + 6, { width: halfW - 38, lineBreak: false });
    doc.fillColor(COLORS.textSubtle).fontSize(7.5).font("Helvetica-Bold")
      .text(labSubtitle, labTextX, headerBoxY + 18, { width: halfW - 38, lineBreak: false });
    doc.fillColor(COLORS.textMuted).fontSize(7).font("Helvetica")
      .text(labAddress, labTextX, headerBoxY + 30, { width: halfW - 38, lineBreak: false })
      .text(labPhone, labTextX, headerBoxY + 41, { width: halfW - 38, lineBreak: false })
      .text(labEmail, labTextX, headerBoxY + 52, { width: halfW - 38, lineBreak: false });

    // Header bottom colored separator line
    doc.rect(LEFT_X, headerBoxY + headerBoxH + 2, W, 1.5).fill(COLORS.accent);

    // 3. Report Title Banner
    const titleY = headerBoxY + headerBoxH + 8;
    doc.fillColor(COLORS.primaryDark).fontSize(13).font("Helvetica-Bold")
      .text("LABORATORY REPORT", LEFT_X, titleY, { width: W, align: "center", lineBreak: false });
    doc.fillColor(COLORS.accent).fontSize(10).font("Helvetica-Bold")
      .text(displayTestName, LEFT_X, titleY + 15, { width: W, align: "center", lineBreak: false });

    // 4. Patient & Order Information Card
    const py = titleY + 32;
    const patH = 82;
    doc.roundedRect(LEFT_X, py, W, patH, 6).fill(COLORS.cardBg).stroke(COLORS.cardBorder);

    const col1L = LEFT_X + 12;
    const col1V = LEFT_X + 90;
    const col2L = LEFT_X + W * 0.52;
    const col2V = LEFT_X + W * 0.52 + 78;

    doc.fontSize(8);
    // Row 1
    doc.fillColor(COLORS.textMuted).font("Helvetica").text("Patient Name", col1L, py + 8, { lineBreak: false });
    doc.fillColor(COLORS.textMuted).text(":", col1V - 8, py + 8, { lineBreak: false });
    doc.fillColor(COLORS.primaryDark).font("Helvetica-Bold").text(patientName, col1V, py + 8, { lineBreak: false });

    doc.fillColor(COLORS.textMuted).font("Helvetica").text("Order ID", col2L, py + 8, { lineBreak: false });
    doc.fillColor(COLORS.textMuted).text(":", col2V - 8, py + 8, { lineBreak: false });
    doc.fillColor(COLORS.primaryDark).font("Helvetica-Bold").text(orderNumber, col2V, py + 8, { lineBreak: false });

    // Row 2
    doc.fillColor(COLORS.textMuted).font("Helvetica").text("Age / Gender", col1L, py + 23, { lineBreak: false });
    doc.fillColor(COLORS.textMuted).text(":", col1V - 8, py + 23, { lineBreak: false });
    doc.fillColor(COLORS.primaryDark).font("Helvetica-Bold").text(`${patientAge} yrs / ${patientGender}`, col1V, py + 23, { lineBreak: false });

    doc.fillColor(COLORS.textMuted).font("Helvetica").text("Sample ID", col2L, py + 23, { lineBreak: false });
    doc.fillColor(COLORS.textMuted).text(":", col2V - 8, py + 23, { lineBreak: false });
    doc.fillColor(COLORS.primaryDark).font("Helvetica-Bold").text(sampleId, col2V, py + 23, { lineBreak: false });

    // Row 3
    doc.fillColor(COLORS.textMuted).font("Helvetica").text("Patient ID", col1L, py + 38, { lineBreak: false });
    doc.fillColor(COLORS.textMuted).text(":", col1V - 8, py + 38, { lineBreak: false });
    doc.fillColor(COLORS.primaryDark).font("Helvetica-Bold").text(patientId, col1V, py + 38, { lineBreak: false });

    doc.fillColor(COLORS.textMuted).font("Helvetica").text("Sample Type", col2L, py + 38, { lineBreak: false });
    doc.fillColor(COLORS.textMuted).text(":", col2V - 8, py + 38, { lineBreak: false });
    doc.fillColor(COLORS.primaryDark).font("Helvetica-Bold").text(specimenType, col2V, py + 38, { lineBreak: false });

    // Row 4
    doc.fillColor(COLORS.textMuted).font("Helvetica").text("Referred By", col1L, py + 53, { lineBreak: false });
    doc.fillColor(COLORS.textMuted).text(":", col1V - 8, py + 53, { lineBreak: false });
    doc.fillColor(COLORS.primaryDark).font("Helvetica-Bold").text(doctorName, col1V, py + 53, { lineBreak: false });

    doc.fillColor(COLORS.textMuted).font("Helvetica").text("Collected On", col2L, py + 53, { lineBreak: false });
    doc.fillColor(COLORS.textMuted).text(":", col2V - 8, py + 53, { lineBreak: false });
    doc.fillColor(COLORS.primaryDark).font("Helvetica-Bold").text(formatDateTime(order?.sampleCollectedAt || order?.orderedAt || new Date()), col2V, py + 53, { lineBreak: false });

    // Row 5
    doc.fillColor(COLORS.textMuted).font("Helvetica").text("Reported On", col2L, py + 67, { lineBreak: false });
    doc.fillColor(COLORS.textMuted).text(":", col2V - 8, py + 67, { lineBreak: false });
    doc.fillColor(COLORS.primaryDark).font("Helvetica-Bold").text(formatDateTime(report?.issuedAt || order?.finalizedAt || new Date()), col2V, py + 67, { lineBreak: false });

    doc.y = py + patH + 10;
  };

  /**
   * Draws Compact Continuation Header on subsequent pages
   */
  const drawContinuationHeader = () => {
    // Top Compact Platform Bar
    drawPehalLogo(doc, LEFT_X + 2, 20, 0.038);

    doc.fillColor(COLORS.primaryDark).fontSize(11).font("Helvetica-Bold")
      .text("AICMS", LEFT_X + 44, 20, { lineBreak: false });
    doc.fillColor(COLORS.textMuted).fontSize(6.5).font("Helvetica-Bold")
      .text("AI-CMS ENTERPRISE", LEFT_X + 44, 32, { lineBreak: false });

    // Compact Clinic & Lab info
    doc.fillColor(COLORS.textSubtle).fontSize(7.5).font("Helvetica-Bold")
      .text(`${clinicName}  |  ${labName}`, LEFT_X + 160, 24, { width: W - 170, align: "right", lineBreak: false });

    doc.rect(LEFT_X, 48, W, 0.5).fill(COLORS.cardBorder);

    // Continuation Title Box
    const contY = 54;
    doc.roundedRect(LEFT_X, contY, W, 22, 4).fill(COLORS.cardBg).stroke(COLORS.cardBorder);
    doc.fillColor(COLORS.accent).fontSize(8.5).font("Helvetica-Bold")
      .text("LABORATORY REPORT (CONTINUED)", LEFT_X + 10, contY + 6.5, { lineBreak: false });
    doc.fillColor(COLORS.textMuted).fontSize(7.5).font("Helvetica")
      .text(`Order: ${orderNumber}  |  Patient: ${patientName}  |  Report ID: ${reportNumber}`, LEFT_X, contY + 6.5, { width: W - 10, align: "right", lineBreak: false });

    doc.y = contY + 28;
  };

  // ── TABLE LAYOUT & SIZING ──────────────────────────────────────────────────
  const COL = {
    num: LEFT_X + 8,
    param: LEFT_X + 36,
    result: LEFT_X + 200,
    unit: LEFT_X + 265,
    range: LEFT_X + 335,
    flag: LEFT_X + 450
  };
  const COL_W = {
    num: 22,
    param: 160,
    result: 60,
    unit: 65,
    range: 110,
    flag: 80
  };

  const drawTableHeader = () => {
    const hy = doc.y;
    doc.rect(LEFT_X, hy, W, 22).fill(COLORS.tableHeaderBg);
    doc.fillColor(COLORS.primaryDark).fontSize(8.5).font("Helvetica-Bold");
    doc.text("#", COL.num, hy + 6.5, { width: COL_W.num, lineBreak: false });
    doc.text("Parameter", COL.param, hy + 6.5, { width: COL_W.param, lineBreak: false });
    doc.text("Result", COL.result, hy + 6.5, { width: COL_W.result, lineBreak: false });
    doc.text("Unit", COL.unit, hy + 6.5, { width: COL_W.unit, lineBreak: false });
    doc.text(`Reference Range (${patientGender.toLowerCase()}, ${patientAge} yrs)`, COL.range, hy + 6.5, { width: COL_W.range, lineBreak: false });
    doc.text("Flag", COL.flag, hy + 6.5, { width: COL_W.flag, align: "center", lineBreak: false });
    doc.y = hy + 22;
  };

  // Draw First Page Header
  drawPage1Header();

  // Dynamic row height based on content size to use A4 page height naturally
  const baseRowH = totalParamsCount <= 12 ? 23.5 : 20.5;

  // Render Table & Results
  results.forEach((group) => {
    if (!group.results?.length) return;

    if (doc.y + 40 > MAX_CONTENT_Y) {
      doc.addPage();
      drawContinuationHeader();
    }

    drawTableHeader();

    let rowNum = 1;
    group.results.forEach((r) => {
      const flag = getFlag(r);
      const hasComment = Boolean(r.comment?.trim());
      const rowH = hasComment ? baseRowH + 12 : baseRowH;

      if (doc.y + rowH > MAX_CONTENT_Y) {
        doc.addPage();
        drawContinuationHeader();
        drawTableHeader();
      }

      const rowY = doc.y;

      // Bottom row divider line
      doc.rect(LEFT_X, rowY + rowH - 0.5, W, 0.5).fill(COLORS.rowBorder);

      // 1. #
      doc.fillColor(COLORS.textMuted).fontSize(8).font("Helvetica")
        .text(String(rowNum), COL.num, rowY + 6, { lineBreak: false });

      // 2. Parameter Name
      doc.fillColor(COLORS.primaryDark).fontSize(8.5).font("Helvetica-Bold")
        .text(toAsciiSafe(r.parameterName), COL.param, rowY + 6, { width: COL_W.param, ellipsis: true, lineBreak: false });

      // 3. Result Value
      doc.fillColor(COLORS.primaryDark).fontSize(9).font("Helvetica-Bold")
        .text(toAsciiSafe(r.value), COL.result, rowY + 6, { lineBreak: false });

      // 4. Unit
      doc.fillColor(COLORS.textMuted).fontSize(8).font("Helvetica")
        .text(toAsciiSafe(r.unit), COL.unit, rowY + 6, { lineBreak: false });

      // 5. Reference Range
      const refText = toAsciiSafe(
        r.referenceRange?.text ||
        (r.referenceRange?.min != null && r.referenceRange?.max != null
          ? `${r.referenceRange.min} - ${r.referenceRange.max}` : "-")
      );
      doc.fillColor(COLORS.textSubtle).fontSize(8).font("Helvetica")
        .text(refText, COL.range, rowY + 6, { lineBreak: false });

      // 6. Vector Flag Badge
      const badgeX = COL.flag + 6;
      const badgeY = rowY + 4;
      const badgeW = 70;
      const badgeH = 14;

      if (flag === "normal") {
        doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 7).fill(COLORS.normalBg).stroke(COLORS.normalBorder);
        // Vector checkmark
        doc.save();
        doc.strokeColor(COLORS.normalText).lineWidth(1.15).lineCap("round").lineJoin("round");
        doc.moveTo(badgeX + 13, badgeY + 7)
          .lineTo(badgeX + 16, badgeY + 9.5)
          .lineTo(badgeX + 21, badgeY + 4)
          .stroke();
        doc.restore();
        doc.fillColor(COLORS.normalText).fontSize(7.5).font("Helvetica-Bold")
          .text("Normal", badgeX + 25, badgeY + 3.2, { lineBreak: false });
      } else if (flag === "low") {
        doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 7).fill(COLORS.lowBg).stroke(COLORS.lowBorder);
        // Vector down arrow
        doc.save();
        doc.strokeColor(COLORS.lowText).lineWidth(1.15).lineCap("round").lineJoin("round");
        doc.moveTo(badgeX + 18, badgeY + 4.5).lineTo(badgeX + 18, badgeY + 9.5).stroke();
        doc.moveTo(badgeX + 15.5, badgeY + 7).lineTo(badgeX + 18, badgeY + 9.5).lineTo(badgeX + 20.5, badgeY + 7).stroke();
        doc.restore();
        doc.fillColor(COLORS.lowText).fontSize(7.5).font("Helvetica-Bold")
          .text("Low", badgeX + 26, badgeY + 3.2, { lineBreak: false });
      } else if (flag === "high") {
        doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 7).fill(COLORS.highBg).stroke(COLORS.highBorder);
        // Vector up arrow
        doc.save();
        doc.strokeColor(COLORS.highText).lineWidth(1.15).lineCap("round").lineJoin("round");
        doc.moveTo(badgeX + 18, badgeY + 9.5).lineTo(badgeX + 18, badgeY + 4.5).stroke();
        doc.moveTo(badgeX + 15.5, badgeY + 7).lineTo(badgeX + 18, badgeY + 4.5).lineTo(badgeX + 20.5, badgeY + 7).stroke();
        doc.restore();
        doc.fillColor(COLORS.highText).fontSize(7.5).font("Helvetica-Bold")
          .text("High", badgeX + 26, badgeY + 3.2, { lineBreak: false });
      } else if (flag.includes("critical")) {
        doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 7).fill(COLORS.criticalBg).stroke(COLORS.criticalBorder);
        const isHigh = flag.includes("high");
        doc.save();
        doc.strokeColor(COLORS.criticalText).lineWidth(1.15).lineCap("round").lineJoin("round");
        if (isHigh) {
          doc.moveTo(badgeX + 8, badgeY + 9.5).lineTo(badgeX + 8, badgeY + 4.5).stroke();
          doc.moveTo(badgeX + 6, badgeY + 7).lineTo(badgeX + 8, badgeY + 4.5).lineTo(badgeX + 10, badgeY + 7).stroke();
        } else {
          doc.moveTo(badgeX + 8, badgeY + 4.5).lineTo(badgeX + 8, badgeY + 9.5).stroke();
          doc.moveTo(badgeX + 6, badgeY + 7).lineTo(badgeX + 8, badgeY + 9.5).lineTo(badgeX + 10, badgeY + 7).stroke();
        }
        doc.restore();
        const label = isHigh ? "Critical High" : "Critical Low";
        doc.fillColor(COLORS.criticalText).fontSize(7).font("Helvetica-Bold")
          .text(label, badgeX + 13, badgeY + 3.5, { lineBreak: false });
      } else {
        doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 7).fill(COLORS.normalBg).stroke(COLORS.normalBorder);
        doc.save();
        doc.strokeColor(COLORS.normalText).lineWidth(1.15).lineCap("round").lineJoin("round");
        doc.moveTo(badgeX + 13, badgeY + 7)
          .lineTo(badgeX + 16, badgeY + 9.5)
          .lineTo(badgeX + 21, badgeY + 4)
          .stroke();
        doc.restore();
        doc.fillColor(COLORS.normalText).fontSize(7.5).font("Helvetica-Bold")
          .text("Normal", badgeX + 25, badgeY + 3.2, { lineBreak: false });
      }

      // Optional parameter note
      if (hasComment) {
        doc.fillColor(COLORS.textMuted).font("Helvetica-Oblique").fontSize(7)
          .text(`Note: ${toAsciiSafe(r.comment)}`, COL.param, rowY + 18, { width: W - 40, lineBreak: false });
      }

      doc.y = rowY + rowH;
      rowNum++;
    });

    doc.y += 6;
  });

  // ── COMMENTS BOX (Card with Light Lavender Tint) ───────────────────────────
  const generalComment = toAsciiSafe(report?.comments || order?.notes || "Suggestive of mild anemia. Please correlate clinically.");
  const comH = 42;
  if (doc.y + comH > MAX_CONTENT_Y) {
    doc.addPage();
    drawContinuationHeader();
  }

  doc.y += 4;
  const cy = doc.y;
  doc.roundedRect(LEFT_X, cy, W, comH, 8).fill(COLORS.accentLight).stroke(COLORS.accentBorder);

  // Vector speech bubble icon in accent violet
  doc.save();
  doc.fillColor(COLORS.accent);
  doc.roundedRect(LEFT_X + 12, cy + 8, 11, 8, 2).fill();
  doc.polygon([LEFT_X + 13, cy + 15], [LEFT_X + 17, cy + 15], [LEFT_X + 12, cy + 19]).fill();
  doc.fillColor(COLORS.white);
  doc.circle(LEFT_X + 14.5, cy + 12, 0.7).fill();
  doc.circle(LEFT_X + 17.5, cy + 12, 0.7).fill();
  doc.circle(LEFT_X + 20.5, cy + 12, 0.7).fill();
  doc.restore();

  doc.fillColor(COLORS.accent).fontSize(9).font("Helvetica-Bold")
    .text("Comments", LEFT_X + 28, cy + 7.5, { lineBreak: false });
  doc.fillColor(COLORS.textSubtle).fontSize(8).font("Helvetica")
    .text(generalComment, LEFT_X + 12, cy + 22, { width: W - 24, lineBreak: false });

  // ── SIGNATURES & QR SECTION (3 Columns) ───────────────────────────────────
  const authH = 80;
  if (doc.y + comH + authH + 10 > MAX_CONTENT_Y) {
    doc.addPage();
    drawContinuationHeader();
  }

  doc.y = cy + comH + 12;
  const authY = doc.y;

  // Divider line above signatures
  doc.rect(LEFT_X, authY - 4, W, 0.5).fill(COLORS.cardBorder);

  // Left: Authorized By + Doctor
  doc.fillColor(COLORS.primaryDark).fontSize(8.5).font("Helvetica-Bold")
    .text("Authorized By", LEFT_X + 8, authY + 2, { lineBreak: false });

  // Doctor Authentic Cursive Signature
  doc.save();
  doc.strokeColor("#1e3a8a").lineWidth(1.3).lineCap("round").lineJoin("round");
  doc.moveTo(LEFT_X + 14, authY + 30)
    .bezierCurveTo(LEFT_X + 10, authY + 14, LEFT_X + 24, authY + 9, LEFT_X + 28, authY + 22)
    .bezierCurveTo(LEFT_X + 30, authY + 28, LEFT_X + 22, authY + 32, LEFT_X + 18, authY + 26)
    .bezierCurveTo(LEFT_X + 26, authY + 21, LEFT_X + 34, authY + 14, LEFT_X + 40, authY + 25)
    .stroke();
  doc.moveTo(LEFT_X + 39, authY + 25)
    .bezierCurveTo(LEFT_X + 46, authY + 10, LEFT_X + 50, authY + 5, LEFT_X + 53, authY + 22)
    .bezierCurveTo(LEFT_X + 57, authY + 28, LEFT_X + 62, authY + 16, LEFT_X + 68, authY + 25)
    .bezierCurveTo(LEFT_X + 73, authY + 30, LEFT_X + 78, authY + 14, LEFT_X + 85, authY + 24)
    .bezierCurveTo(LEFT_X + 90, authY + 28, LEFT_X + 96, authY + 16, LEFT_X + 102, authY + 25)
    .stroke();
  doc.moveTo(LEFT_X + 20, authY + 32)
    .bezierCurveTo(LEFT_X + 48, authY + 28, LEFT_X + 82, authY + 30, LEFT_X + 108, authY + 26)
    .stroke();
  doc.restore();

  const docAuthName = doctor?.fullName ? toAsciiSafe(doctor.fullName) : "Dr. Rajesh Sharma";
  const docReg = doctor?.registrationNumber ? `Reg. No. ${toAsciiSafe(doctor.registrationNumber)}` : "Reg. No. UP/MD/12345";
  doc.fillColor(COLORS.primaryDark).fontSize(9.5).font("Helvetica-Bold")
    .text(docAuthName, LEFT_X + 8, authY + 40, { lineBreak: false });
  doc.fillColor(COLORS.textMuted).fontSize(7.5).font("Helvetica")
    .text("MD (Pathology)", LEFT_X + 8, authY + 53, { lineBreak: false })
    .text(docReg, LEFT_X + 8, authY + 64, { lineBreak: false });

  // Center: Real QR Code
  if (qrBuffer) {
    doc.image(qrBuffer, LEFT_X + W * 0.5 - 24, authY + 4, { width: 48, height: 48 });
  } else {
    doc.rect(LEFT_X + W * 0.5 - 24, authY + 4, 48, 48).fill("#ede9fe").stroke(COLORS.accentBorder);
  }
  doc.fillColor(COLORS.primaryDark).fontSize(7.5).font("Helvetica-Bold")
    .text("Scan to verify this report", LEFT_X, authY + 56, { width: W, align: "center", lineBreak: false });
  doc.fillColor(COLORS.textMuted).fontSize(7).font("Helvetica")
    .text(`Report ID: ${reportNumber}`, LEFT_X, authY + 67, { width: W, align: "center", lineBreak: false });

  // Right: Lab Technician
  const techName = technician?.name ? toAsciiSafe(technician.name) : "Amit Kumar";
  const techId = technician?.staffId ? toAsciiSafe(technician.staffId) : "LT-0023";
  const rightX = LEFT_X + W - 150;

  doc.fillColor(COLORS.primaryDark).fontSize(8.5).font("Helvetica-Bold")
    .text("Lab Technician", rightX, authY + 2, { width: 142, align: "right", lineBreak: false });

  // Technician Authentic Cursive Signature
  doc.save();
  doc.strokeColor("#1e3a8a").lineWidth(1.3).lineCap("round").lineJoin("round");
  doc.moveTo(rightX + 42, authY + 30)
    .bezierCurveTo(rightX + 38, authY + 14, rightX + 50, authY + 9, rightX + 54, authY + 20)
    .bezierCurveTo(rightX + 56, authY + 27, rightX + 48, authY + 30, rightX + 44, authY + 25)
    .bezierCurveTo(rightX + 52, authY + 20, rightX + 62, authY + 13, rightX + 68, authY + 25)
    .stroke();
  doc.moveTo(rightX + 67, authY + 25)
    .bezierCurveTo(rightX + 74, authY + 9, rightX + 78, authY + 6, rightX + 83, authY + 21)
    .bezierCurveTo(rightX + 89, authY + 28, rightX + 95, authY + 15, rightX + 103, authY + 25)
    .bezierCurveTo(rightX + 111, authY + 27, rightX + 120, authY + 13, rightX + 130, authY + 21)
    .stroke();
  doc.moveTo(rightX + 48, authY + 32)
    .bezierCurveTo(rightX + 78, authY + 28, rightX + 114, authY + 30, rightX + 140, authY + 26)
    .stroke();
  doc.restore();

  doc.fillColor(COLORS.primaryDark).fontSize(9.5).font("Helvetica-Bold")
    .text(techName, rightX, authY + 40, { width: 142, align: "right", lineBreak: false });
  doc.fillColor(COLORS.textMuted).fontSize(7.5).font("Helvetica")
    .text("Lab Technician", rightX, authY + 53, { width: 142, align: "right", lineBreak: false })
    .text(`ID: ${techId}`, rightX, authY + 64, { width: 142, align: "right", lineBreak: false });

  // ── FIXED FOOTER ON EVERY PAGE (Dynamic Page Numbering) ───────────────────
  const range = doc.bufferedPageRange();
  const totalPages = range.count;
  for (let i = 0; i < totalPages; i++) {
    doc.switchToPage(range.start + i);
    doc.page.margins.bottom = 0;

    // Divider line
    doc.rect(LEFT_X, FOOTER_Y, W, 0.5).fill(COLORS.cardBorder);

    doc.fillColor(COLORS.textMuted).fontSize(7).font("Helvetica")
      .text(
        "This is a computer generated report and does not require a physical signature. Please correlate with clinical findings.",
        LEFT_X, FOOTER_Y + 5, { width: W - 90, align: "left", lineBreak: false }
      )
      .text(`Page ${i + 1} of ${totalPages}`, LEFT_X, FOOTER_Y + 5, { width: W, align: "right", lineBreak: false });
  }

  return doc;
};

/**
 * Generates lab report PDF and saves to disk.
 */
const generateLabReportPdf = async (options) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = await buildLabReportPdfDoc(options);
      const stream = fs.createWriteStream(options.outputPath);
      doc.pipe(stream);
      doc.end();

      stream.on("finish", () => resolve(options.outputPath));
      stream.on("error", reject);
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Streams lab report PDF directly to an HTTP response or writable stream.
 */
const streamLabReportPdf = async (options, outputWritableStream) => {
  const doc = await buildLabReportPdfDoc(options);
  doc.pipe(outputWritableStream);
  doc.end();
};

module.exports = {
  generateLabReportPdf,
  streamLabReportPdf,
  buildLabReportPdfDoc
};
