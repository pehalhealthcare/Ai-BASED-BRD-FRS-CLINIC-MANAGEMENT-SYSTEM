const ExcelLabParser = require('./excelLabParser');

class CSVLabParser extends ExcelLabParser {
  async canParse(buffer, filename, importType) {
    if (importType !== 'LAB') return false;
    return filename.toLowerCase().endsWith('.csv');
  }
}

module.exports = CSVLabParser;
