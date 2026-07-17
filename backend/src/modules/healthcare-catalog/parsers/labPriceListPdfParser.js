const { cachedPdfParse } = require('./pdfUtils');
const BaseParser = require('./baseParser');

class LabPriceListPdfParser extends BaseParser {
  async canParse(buffer, filename, importType) {
    if (importType !== 'LAB') return false;
    return filename.toLowerCase().endsWith('.pdf');
  }

  async parse(buffer) {
    const parsedPdf = await cachedPdfParse(buffer);
    const text = parsedPdf.text;
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    const records = [];
    let currentCategory = 'General Lab Tests';
    
    // Noise filters
    const noiseRegex = /^(laboratory price list|lab catalog|page \d+|\d+ of \d+|s\.no|serial number|investigation name|mrp|price|department|reporting time)/i;
    
    // Sample type keywords
    const sampleTypeRegex = /\b(blood|serum|plasma|urine|stool|sputum|semen|swab|fluid|biopsy|saliva)\b/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (noiseRegex.test(line) || /^\d+$/.test(line)) {
        continue;
      }

      // Check if line is a category header (e.g. "HAEMATOLOGY", "BIOCHEMISTRY", "CLINICAL PATHOLOGY")
      // Short line, no price, all uppercase
      if (line.length < 50 && line.toUpperCase() === line && !line.match(/\d+/) && !sampleTypeRegex.test(line)) {
        currentCategory = line.trim();
        continue;
      }

      // Extract details: Test Name, optional sample type, optional price
      // Look for a price/number at the end of the line
      const priceMatch = line.match(/(\d+)\s*$/);
      let name = line;
      let mrp = '';
      if (priceMatch) {
        mrp = priceMatch[1];
        name = line.substring(0, line.lastIndexOf(mrp)).trim();
      }

      // Extract sample type if present
      const sampleMatch = name.match(sampleTypeRegex);
      let sampleType = 'Blood'; // Fallback
      if (sampleMatch) {
        sampleType = sampleMatch[1];
        // Clean name of sample type suffix
        name = name.replace(new RegExp(`\\b${sampleType}\\b`, 'i'), '').trim();
      }

      // Clean up punctuation from name
      name = name.replace(/^[\d\.\-\s]+/, '').replace(/[,;\-\s\/]+$/, '').trim();

      if (name && name.length > 2) {
        records.push({
          name,
          shortName: '',
          alternateNames: [],
          department: currentCategory,
          categoryName: currentCategory,
          sampleType: sampleType.charAt(0).toUpperCase() + sampleType.slice(1).toLowerCase(),
          sampleVolume: '2 ml',
          sampleContainer: 'Vaccutainer',
          methodology: 'Automated',
          clinicalDescription: '',
          patientPreparation: 'Fasting not required',
          referenceRange: 'Normal',
          normalReportingTime: '24 Hours',
          internalCode: '',
          loincCode: '',
          mrp,
          isActive: true
        });
      }
    }

    return records;
  }
}

module.exports = LabPriceListPdfParser;
