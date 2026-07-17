const ExcelMedicineParser = require('./excelMedicineParser');

class CSVMedicineParser extends ExcelMedicineParser {
  async canParse(buffer, filename, importType) {
    if (importType !== 'MEDICINE') return false;
    return filename.toLowerCase().endsWith('.csv');
  }
}

module.exports = CSVMedicineParser;
