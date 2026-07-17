const xlsx = require('xlsx');
const BaseParser = require('./baseParser');

class ExcelLabParser extends BaseParser {
  async canParse(buffer, filename, importType) {
    if (importType !== 'LAB') return false;
    const ext = filename.toLowerCase().split('.').pop();
    return ext === 'xlsx' || ext === 'xls';
  }

  async parse(buffer) {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    const records = [];
    let headerRowIndex = -1;
    let colIndices = {
      investigation: -1,
      sample: -1,
      methodology: -1,
      reportingTime: -1,
      mrp: -1,
      bTob: -1
    };

    let currentCategoryName = 'General';

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      if (headerRowIndex === -1) {
        const rowStrings = row.map(cell => cell ? cell.toString().trim().toUpperCase() : '');
        const hasInvestigation = rowStrings.includes('INVESTIGATION');
        const hasSample = rowStrings.includes('SAMPLE');

        if (hasInvestigation && hasSample) {
          headerRowIndex = i;
          colIndices.investigation = rowStrings.indexOf('INVESTIGATION');
          colIndices.sample = rowStrings.indexOf('SAMPLE');
          colIndices.methodology = rowStrings.indexOf('METHODOLOGY');
          colIndices.reportingTime = rowStrings.indexOf('REPORTING TIME');
          colIndices.mrp = rowStrings.indexOf('MRP');
          colIndices.bTob = rowStrings.indexOf('B TO B');
        }
        continue;
      }

      const invValue = row[colIndices.investigation] ? row[colIndices.investigation].toString().trim() : '';
      if (!invValue) continue;

      const hasSample = !!row[colIndices.sample];
      const hasMethodology = !!row[colIndices.methodology];
      const hasReportingTime = !!row[colIndices.reportingTime];
      const hasMrp = !!row[colIndices.mrp];
      const hasBtoB = !!row[colIndices.bTob];

      // If it's a category/department header row (only contains investigation name, no sample, mrp, methodology etc.)
      if (!hasSample && !hasMethodology && !hasReportingTime && !hasMrp && !hasBtoB) {
        currentCategoryName = invValue;
        continue;
      }

      records.push({
        name: invValue,
        shortName: '',
        alternateNames: [],
        department: currentCategoryName,
        categoryName: currentCategoryName,
        sampleType: row[colIndices.sample] ? row[colIndices.sample].toString().trim() : 'Blood',
        sampleVolume: '',
        sampleContainer: '',
        methodology: row[colIndices.methodology] ? row[colIndices.methodology].toString().trim() : '',
        clinicalDescription: '',
        patientPreparation: '',
        referenceRange: '',
        normalReportingTime: row[colIndices.reportingTime] ? row[colIndices.reportingTime].toString().trim() : 'Same Day',
        internalCode: '',
        loincCode: '',
        isActive: true
      });
    }

    return records;
  }
}

module.exports = ExcelLabParser;
