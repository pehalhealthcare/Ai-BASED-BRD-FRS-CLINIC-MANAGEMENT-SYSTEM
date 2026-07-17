const BaseParser = require('./baseParser');

class JSONLabParser extends BaseParser {
  async canParse(buffer, filename, importType) {
    if (importType !== 'LAB') return false;
    return filename.toLowerCase().endsWith('.json');
  }

  async parse(buffer) {
    const rawData = JSON.parse(buffer.toString('utf8'));
    const items = Array.isArray(rawData) ? rawData : (rawData.items || rawData.labTests || rawData.tests || []);

    return items.map(item => ({
      name: item.name || '',
      shortName: item.shortName || '',
      alternateNames: Array.isArray(item.alternateNames) ? item.alternateNames : [],
      department: item.department || item.category || 'General',
      categoryName: item.categoryName || item.category || 'General',
      sampleType: item.sampleType || 'Blood',
      sampleVolume: item.sampleVolume || '',
      sampleContainer: item.sampleContainer || '',
      methodology: item.methodology || '',
      clinicalDescription: item.clinicalDescription || '',
      patientPreparation: item.patientPreparation || '',
      referenceRange: item.referenceRange || '',
      normalReportingTime: item.normalReportingTime || 'Same Day',
      internalCode: item.internalCode || '',
      loincCode: item.loincCode || '',
      isActive: true
    }));
  }
}

module.exports = JSONLabParser;
