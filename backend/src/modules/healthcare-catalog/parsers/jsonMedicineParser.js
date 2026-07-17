const BaseParser = require('./baseParser');

class JSONMedicineParser extends BaseParser {
  async canParse(buffer, filename, importType) {
    if (importType !== 'MEDICINE') return false;
    return filename.toLowerCase().endsWith('.json');
  }

  async parse(buffer) {
    const rawData = JSON.parse(buffer.toString('utf8'));
    const items = Array.isArray(rawData) ? rawData : (rawData.items || rawData.medicines || []);
    
    return items.map(item => ({
      brandName: item.brandName || item.name || '',
      genericName: item.genericName || '',
      strength: item.strength || 'N/A',
      dosageForm: item.dosageForm || 'Tablet',
      categoryName: item.categoryName || item.category || 'General',
      route: item.route || '',
      drugSchedule: item.drugSchedule || '',
      description: item.description || '',
      isActive: true
    }));
  }
}

module.exports = JSONMedicineParser;
