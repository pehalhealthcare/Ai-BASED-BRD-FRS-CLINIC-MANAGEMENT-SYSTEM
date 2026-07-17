const CDSCOPdfParser = require('./cdscoPdfParser');
const NLEMPdfParser = require('./nlemPdfParser');
const ExcelMedicineParser = require('./excelMedicineParser');
const ExcelLabParser = require('./excelLabParser');
const CSVMedicineParser = require('./csvMedicineParser');
const CSVLabParser = require('./csvLabParser');
const JSONMedicineParser = require('./jsonMedicineParser');
const JSONLabParser = require('./jsonLabParser');
const LabPriceListPdfParser = require('./labPriceListPdfParser');

const parsers = [
  new NLEMPdfParser(),
  new CDSCOPdfParser(),
  new ExcelMedicineParser(),
  new ExcelLabParser(),
  new CSVMedicineParser(),
  new CSVLabParser(),
  new JSONMedicineParser(),
  new JSONLabParser(),
  new LabPriceListPdfParser()
];

const getParser = async (buffer, filename, importType) => {
  for (const parser of parsers) {
    if (await parser.canParse(buffer, filename, importType)) {
      return parser;
    }
  }
  return null;
};

module.exports = {
  parsers,
  getParser
};
