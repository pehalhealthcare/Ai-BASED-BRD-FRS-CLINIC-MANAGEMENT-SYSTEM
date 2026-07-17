const { cachedPdfParse } = require('./pdfUtils');
const BaseParser = require('./baseParser');

class CDSCOPdfParser extends BaseParser {
  async canParse(buffer, filename, importType) {
    if (importType !== 'MEDICINE') return false;
    const name = filename.toLowerCase();
    if (!name.endsWith('.pdf')) return false;

    if (name.includes('cdsco') || name.includes('standard')) return true;
    if (name.includes('nlem') || name.includes('national')) return false;

    try {
      const data = await cachedPdfParse(buffer);
      const text = data.text || '';
      if (text.includes('NLEM') || text.includes('National List of Essential Medicines')) {
        return false;
      }
      return text.includes('CDSCO') || text.includes('Central Drugs Standard') || text.includes('Control Organization');
    } catch (e) {
      return false;
    }
  }

  async parse(buffer) {
    const parsedPdf = await cachedPdfParse(buffer);
    const text = parsedPdf.text;
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    const records = [];
    let currentCategory = 'CDSCO Approved Medicines';
    
    const noiseRegex = /^(cdsco|central drugs standard control|page \d+|\d+ of \d+|directorate general of health services|ministry of health)/i;
    const strengthRegex = /(\d+(\.\d+)?\s*(?:mg|g|mcg|ml|%|units|iu)\b(\/\d+\s*(?:ml|g)\b)?)/i;
    const dosageFormRegex = /\b(tablet|capsule|injection|oral liquid|syrup|suspension|cream|ointment|inhaler|eye drops|ear drops|nasal drops|gel|solution|powder|lotion|drops)\b/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (noiseRegex.test(line) || /^\d+$/.test(line)) {
        continue;
      }

      if (line.length < 60 && !strengthRegex.test(line) && (line.toUpperCase() === line || line.startsWith('Category:'))) {
        currentCategory = line.replace(/^Category:\s*/i, '').trim();
        continue;
      }

      const strengthMatch = line.match(strengthRegex);
      if (strengthMatch) {
        const strength = strengthMatch[0];
        const parts = line.split(strength);
        const nameAndForm = parts[0].trim();
        
        const formMatch = nameAndForm.match(dosageFormRegex);
        let name = nameAndForm;
        let dosageForm = 'Tablet';

        if (formMatch) {
          dosageForm = formMatch[0];
          name = nameAndForm.split(formMatch[0])[0].trim();
        }

        name = name.replace(/^[\d\.\-\s]+/, '').replace(/[,;\-\s]+$/, '').trim();

        if (name && name.length > 2) {
          records.push({
            brandName: '',
            genericName: name,
            strength,
            dosageForm: dosageForm.charAt(0).toUpperCase() + dosageForm.slice(1).toLowerCase(),
            categoryName: currentCategory,
            description: `Imported CDSCO PDF: ${line}`
          });
        }
      }
    }

    return records;
  }
}

module.exports = CDSCOPdfParser;
