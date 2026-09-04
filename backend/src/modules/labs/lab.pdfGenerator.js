const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

/**
 * Lab Report PDF Generator
 * Generates a professional laboratory report PDF using pdfkit.
 *
 * @param {Object} opts
 * @param {Object} opts.order - LabOrder document (populated)
 * @param {Object} opts.report - LabReport document
 * @param {Array}  opts.results - LabResult[] grouped by test [{ testName, testCode, results: [] }]
 * @param {Object} opts.lab - Provider (laboratory) document
 * @param {Object} opts.patient - Patient document
 * @param {String} opts.outputPath - Absolute path to write the PDF
 * @returns {Promise<String>} outputPath
 */
const generateLabReportPdf = async ({ order, report, results = [], lab, patient, outputPath }) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 40, bufferPages: true });
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      const W = doc.page.width - 80; // usable width
      const COLORS = {
        primary: "#3b1fa3",
        accent: "#6d28d9",
        normal: "#16a34a",
        low: "#d97706",
        high: "#d97706",
        critical: "#dc2626",
        abnormal: "#d97706",
        headerBg: "#f5f3ff",
        border: "#ddd6fe",
        text: "#1c1917",
        muted: "#78716c",
        white: "#ffffff"
      };

      const FLAG_LABELS = {
        normal: "Normal",
        low: "Low",
        high: "High",
        critical_low: "CRITICAL LOW",
        critical_high: "CRITICAL HIGH",
        abnormal: "Abnormal",
        not_applicable: "N/A",
        not_evaluated: ""
      };

      const getFlag = (r) => r.manualFlag || r.autoFlag || "not_evaluated";
      const isCritical = (f) => f === "critical_low" || f === "critical_high";
      const isAbnormal = (f) => ["low", "high", "abnormal"].includes(f);
      const flagColor = (f) => {
        if (isCritical(f)) return COLORS.critical;
        if (isAbnormal(f)) return COLORS.low;
        return COLORS.normal;
      };

      const formatDate = (d) => {
        if (!d) return "—";
        return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
      };

      // ── HEADER ──────────────────────────────────────────────────────────
      doc.rect(40, 40, W, 80).fill(COLORS.headerBg).stroke(COLORS.border);
      doc.fillColor(COLORS.primary).fontSize(16).font("Helvetica-Bold")
        .text(lab?.name || "Clinical Laboratory", 55, 52);
      doc.fillColor(COLORS.muted).fontSize(9).font("Helvetica")
        .text([lab?.address?.line1, lab?.address?.city, lab?.address?.state].filter(Boolean).join(", ") || "", 55, 72);
      doc.text([lab?.phone, lab?.email].filter(Boolean).join("  |  ") || "", 55, 84);

      // Report title top-right
      doc.fillColor(COLORS.accent).fontSize(13).font("Helvetica-Bold")
        .text("LABORATORY REPORT", 40, 52, { align: "right" });
      doc.fillColor(COLORS.muted).fontSize(8).font("Helvetica")
        .text(`Report ID: ${String(report?._id || "").slice(-8).toUpperCase()}`, 40, 72, { align: "right" })
        .text(`Generated: ${formatDate(new Date())}`, 40, 84, { align: "right" });

      // ── PATIENT INFO PANEL ──────────────────────────────────────────────
      doc.moveDown(0.5);
      const py = 130;
      doc.rect(40, py, W, 70).fill("#fafaf9").stroke(COLORS.border);

      const patientName = patient?.fullName || order?.guestPatient?.fullName || "—";
      const patientAge = patient?.age ?? order?.guestPatient?.age ?? "—";
      const patientGender = patient?.gender || order?.guestPatient?.gender || "—";
      const patientId = patient?.uhid || patient?.patientId || String(patient?._id || "").slice(-6).toUpperCase();

      doc.fillColor(COLORS.primary).fontSize(10).font("Helvetica-Bold").text("PATIENT INFORMATION", 55, py + 8);
      const col2 = 40 + W / 2;
      doc.fillColor(COLORS.text).fontSize(9).font("Helvetica");
      const infoRows = [
        [`Patient Name: ${patientName}`, `Order ID: ${order?.orderNumber || "—"}`],
        [`Patient ID: ${patientId}`, `Collection Date: ${formatDate(order?.sampleCollectedAt || order?.collectionDate)}`],
        [`Age / Gender: ${patientAge} / ${patientGender}`, `Report Date: ${formatDate(new Date())}`]
      ];
      infoRows.forEach((row, i) => {
        doc.text(row[0], 55, py + 22 + i * 13);
        doc.text(row[1], col2, py + 22 + i * 13);
      });

      // ── RESULTS TABLES ──────────────────────────────────────────────────
      doc.y = py + 80;

      const COL = { param: 55, result: 280, unit: 340, range: 405, flag: 490 };
      const COL_W = { param: 220, result: 55, unit: 60, range: 80, flag: 80 };

      const drawTableHeader = () => {
        const hy = doc.y;
        doc.rect(40, hy, W, 18).fill(COLORS.primary);
        doc.fillColor(COLORS.white).fontSize(8).font("Helvetica-Bold");
        doc.text("PARAMETER", COL.param, hy + 5);
        doc.text("RESULT", COL.result, hy + 5);
        doc.text("UNIT", COL.unit, hy + 5);
        doc.text("REFERENCE RANGE", COL.range, hy + 5);
        doc.text("FLAG", COL.flag, hy + 5);
        doc.y = hy + 18;
      };

      results.forEach((group) => {
        if (!group.results?.length) return;

        // Test section header
        if (doc.y > 700) { doc.addPage(); }
        const shy = doc.y + 8;
        doc.rect(40, shy, W, 20).fill(COLORS.accent);
        doc.fillColor(COLORS.white).fontSize(10).font("Helvetica-Bold")
          .text(group.testName.toUpperCase(), 55, shy + 5);
        doc.y = shy + 20;

        drawTableHeader();

        let rowNum = 0;
        group.results.forEach((r) => {
          if (doc.y > 740) { doc.addPage(); drawTableHeader(); }
          const flag = getFlag(r);
          const rowY = doc.y;
          const rowH = 16;
          const isCrit = isCritical(flag);
          const isAbn = isAbnormal(flag);

          // Row background
          if (isCrit) {
            doc.rect(40, rowY, W, rowH).fill("#fef2f2");
          } else if (isAbn) {
            doc.rect(40, rowY, W, rowH).fill("#fffbeb");
          } else if (rowNum % 2 === 0) {
            doc.rect(40, rowY, W, rowH).fill("#fafaf9");
          }

          doc.fillColor(COLORS.text).fontSize(8).font("Helvetica");
          doc.text(r.parameterName || "—", COL.param, rowY + 4, { width: COL_W.param - 5, ellipsis: true });

          // Result value (bold if abnormal)
          if (isCrit || isAbn) {
            doc.font("Helvetica-Bold").fillColor(flagColor(flag));
          }
          doc.text(r.value || "—", COL.result, rowY + 4, { width: COL_W.result });

          doc.font("Helvetica").fillColor(COLORS.muted);
          doc.text(r.unit || "", COL.unit, rowY + 4, { width: COL_W.unit });

          const refText = r.referenceRange?.text ||
            (r.referenceRange?.min != null && r.referenceRange?.max != null
              ? `${r.referenceRange.min} – ${r.referenceRange.max}` : "—");
          doc.text(refText, COL.range, rowY + 4, { width: COL_W.range });

          // Flag label
          const flagLabel = FLAG_LABELS[flag] || "";
          if (flagLabel) {
            doc.fillColor(flagColor(flag)).font("Helvetica-Bold");
          } else {
            doc.fillColor(COLORS.muted).font("Helvetica");
          }
          doc.text(flagLabel || "Normal", COL.flag, rowY + 4, { width: COL_W.flag });

          doc.y = rowY + rowH;
          rowNum++;

          // Comment below the row
          if (r.comment?.trim()) {
            doc.fillColor(COLORS.muted).font("Helvetica-Oblique").fontSize(7.5)
              .text(`  ↳ ${r.comment}`, COL.param, doc.y, { width: W - 15 });
          }

          // Manual override note
          if (r.isFlagManuallyOverridden) {
            doc.fillColor(COLORS.low).font("Helvetica-Oblique").fontSize(7)
              .text("  ⚠ Manually overridden by laboratory", COL.param, doc.y);
          }
        });

        doc.y += 8;
      });

      // ── CRITICAL ALERT SUMMARY (if any) ─────────────────────────────────
      const criticals = [];
      results.forEach((g) => {
        (g.results || []).forEach((r) => {
          const f = getFlag(r);
          if (isCritical(f)) criticals.push(`${r.parameterName}: ${r.value} ${r.unit || ""}`);
        });
      });

      if (criticals.length > 0) {
        if (doc.y > 680) { doc.addPage(); }
        doc.y += 10;
        doc.rect(40, doc.y, W, 18 + criticals.length * 12).fill("#fef2f2").stroke(COLORS.critical);
        doc.fillColor(COLORS.critical).fontSize(9).font("Helvetica-Bold")
          .text("⚠  CRITICAL VALUES — Immediate clinical attention required", 55, doc.y + 5);
        criticals.forEach((c, i) => {
          doc.fillColor(COLORS.text).fontSize(8).font("Helvetica")
            .text(`• ${c}`, 65, doc.y + 18 + i * 12);
        });
        doc.y += 20 + criticals.length * 12;
      }

      // ── FOOTER ──────────────────────────────────────────────────────────
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i);
        const fy = doc.page.height - 50;
        doc.rect(40, fy, W, 1).fill(COLORS.border);
        doc.fillColor(COLORS.muted).fontSize(7.5).font("Helvetica")
          .text(
            "This report is generated by AICMS and should be interpreted by a qualified clinician. " +
            "AI-assisted analysis is supplementary and does not replace clinical judgment.",
            40, fy + 5, { width: W, align: "center" }
          )
          .text(`Page ${i + 1} of ${range.count}`, 40, fy + 18, { align: "right" });
      }

      doc.end();

      stream.on("finish", () => resolve(outputPath));
      stream.on("error", reject);
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generateLabReportPdf };
