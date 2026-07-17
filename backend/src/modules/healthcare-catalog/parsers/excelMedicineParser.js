const xlsx = require('xlsx');
const BaseParser = require('./baseParser');

class ExcelMedicineParser extends BaseParser {
  async canParse(buffer, filename, importType) {
    if (importType !== 'MEDICINE') return false;
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

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      if (headerRowIndex === -1) {
        const rowStrings = row.map(cell => cell ? cell.toString().trim().toUpperCase() : '');
        const hasMedicine = rowStrings.includes('BRAND NAME') || rowStrings.includes('GENERIC NAME') || rowStrings.includes('MEDICINE NAME');
        if (hasMedicine) {
          headerRowIndex = i;
        }
        continue;
      }

      // Columns layout (based on existing logic):
      // row[0]: name / brandName
      // row[1]: genericName
      // row[2]: strength
      // row[3]: dosageForm
      // row[4]: categoryName
      // row[5]: route
      // row[6]: drugSchedule
      // row[7]: description
      const brandName = row[0] ? row[0].toString().trim() : '';
      const genericName = row[1] ? row[1].toString().trim() : '';

      if (!brandName && !genericName) continue;

      records.push({
        brandName,
        genericName,
        strength: row[2] ? row[2].toString().trim() : 'N/A',
        dosageForm: row[3] ? row[3].toString().trim() : 'Tablet',
        categoryName: row[4] ? row[4].toString().trim() : 'General',
        route: row[5] ? row[5].toString().trim() : '',
        drugSchedule: row[6] ? row[6].toString().trim() : '',
        description: row[7] ? row[7].toString().trim() : '',
        isActive: true
      });
    }

    return records;
  }
}

module.exports = ExcelMedicineParser;
