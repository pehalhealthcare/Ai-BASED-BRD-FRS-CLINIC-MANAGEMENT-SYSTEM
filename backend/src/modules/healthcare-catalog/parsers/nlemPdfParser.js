const { cachedPdfParse } = require('./pdfUtils');
const BaseParser = require('./baseParser');

class NLEMPdfParser extends BaseParser {
  async canParse(buffer, filename, importType) {
    if (importType !== 'MEDICINE') return false;
    const name = filename.toLowerCase();
    if (!name.endsWith('.pdf')) return false;
    if (name.includes('nlem') || name.includes('national')) return true;

    try {
      const data = await cachedPdfParse(buffer);
      const text = data.text || '';
      return text.includes('NLEM') || text.includes('National List of Essential Medicines') || text.includes('essential medicines');
    } catch (e) {
      return false;
    }
  }

  async parse(buffer) {
    const parsedPdf = await cachedPdfParse(buffer);
    const text = parsedPdf.text;
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    const records = [];
    let currentCategory = 'General Medicines';
    
    const noiseRegex = /^(national list of essential medicines|nlem|page \d+|\d+ of \d+|government of india|ministry of health|index|table of contents|alphabetical list|medicines added|medicines deleted|level of|healthcare|dosage form|strength)/i;
    const categoryRegex = /^(Section\s+\d+|\d+\.\d+\s*[-–])/i;
    const medicineStartRegex = /^(\d+\.\d+\.\d+(?:\.\d+)?)\s+(.+)$/;
    const healthcareLevelRegex = /\s*\b(P\s*,\s*S\s*,\s*T|S\s*,\s*T|P\s*,\s*T|P|S|T)\b\s*/i;

    let inIndexPage = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect index or appendix sections and skip them
      if (line.includes('Alphabetical List') || line.includes('INDEX') || line.includes('Medicines Added') || line.includes('Medicines Deleted')) {
        inIndexPage = true;
        continue;
      }
      // Resume if we hit a main section, though usually these are at the end
      if (inIndexPage && categoryRegex.test(line) && line.length < 100) {
        inIndexPage = false;
      }

      if (inIndexPage || noiseRegex.test(line) || /^\d+$/.test(line)) {
        continue;
      }

      // Category detection
      if (categoryRegex.test(line) && line.length < 120) {
        currentCategory = line.replace(/^\d+(\.\d+)*\s*[-\s]*/, '').replace(/^Section\s+\d+\s*[-\s]*/i, '').trim();
        continue;
      }

      // Check for medicine start (e.g. "1.1.1 Halothane S,T Liquid for inhalation")
      const startMatch = line.match(medicineStartRegex);
      if (startMatch) {
        const entryId = startMatch[1];
        const rest = startMatch[2].trim();

        // Split rest by Level of Healthcare
        const hcMatch = rest.match(healthcareLevelRegex);
        let medicineName = rest;
        let dosageAndStrengthsStr = '';

        if (hcMatch) {
          medicineName = rest.substring(0, hcMatch.index).trim();
          dosageAndStrengthsStr = rest.substring(hcMatch.index + hcMatch[0].length).trim();
        }

        // Clean up medicine name (remove asterisks, footnotes marks)
        medicineName = medicineName.replace(/[\*\#\+]/g, '').trim();

        // Collect multiline dosage forms and strengths
        const dosageLines = [];
        if (dosageAndStrengthsStr) {
          dosageLines.push(dosageAndStrengthsStr);
        }

        // Lookahead to collect succeeding dosage lines for this medicine
        let lookAhead = i + 1;
        while (lookAhead < lines.length) {
          const nextLine = lines[lookAhead];
          // Stop lookahead if next line is a new medicine, new category, or index page
          if (medicineStartRegex.test(nextLine) || categoryRegex.test(nextLine) || nextLine.includes('Alphabetical List') || nextLine.includes('INDEX') || noiseRegex.test(nextLine)) {
            break;
          }
          if (nextLine.length > 2) {
            dosageLines.push(nextLine);
          }
          lookAhead++;
        }
        i = lookAhead - 1; // Advance main loop index

        // Process each collected dosage form and strength line
        for (const dosageLine of dosageLines) {
          // Standardize combination format if needed (e.g. "Amoxicillin (A) + Clavulanic acid (B)" name / strength match)
          let cleanName = medicineName.replace(/\s*\([A-Z]\)/g, '').trim();
          let cleanDosageStrength = dosageLine.replace(/\s*\([A-Z]\)/g, '').trim();

          // Try to isolate dosage form vs strength
          const dosageFormRegex = /^(liquid for inhalation|liquid|emulsion for infusion|emulsion|concentrate for solution|concentrate for infusion|solution for infusion|solution for injection|powder for injection|powder for infusion|powder for oral|tablet|film-coated tablet|orodispersible tablet|chewable tablet|modified-release tablet|effervescent tablet|capsule|modified-release capsule|injection|infusion|oral liquid|oral solution|oral suspension|oral rehydration|syrup|suspension|cream|ointment|eye ointment|inhaler|metered dose inhaler|dry powder inhaler|eye drops|ear drops|nasal drops|nasal spray|nasal solution|gel|topical solution|topical cream|solution|powder|lotion|drops|pessary|suppository|vaginal tablet|dry syrup|granules|sachet|fluid|respirator solution|combi pack|transdermal patch|patch|enema|foam|spray|aerosol|nebuliser solution|mouthwash|lozenge|pastille|implant)/i;
          const formMatch = cleanDosageStrength.match(dosageFormRegex);
          let dosageForm = 'Other';
          let strength = cleanDosageStrength;

          if (formMatch) {
            dosageForm = formMatch[0];
            strength = cleanDosageStrength.substring(formMatch[0].length).trim();
          }

          records.push({
            brandName: '',
            genericName: cleanName,
            strength: strength || 'N/A',
            dosageForm: dosageForm.charAt(0).toUpperCase() + dosageForm.slice(1).toLowerCase(),
            categoryName: currentCategory,
            description: `Imported NLEM: ${cleanName} ${cleanDosageStrength}`
          });
        }
      }
    }

    return records;
  }
}

module.exports = NLEMPdfParser;
