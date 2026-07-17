class BaseParser {
  /**
   * Determine if this parser can handle the uploaded file
   * @param {Buffer} buffer - File data buffer
   * @param {string} filename - Name of the uploaded file
   * @param {string} importType - 'MEDICINE' or 'LAB'
   * @returns {boolean}
   */
  async canParse(buffer, filename, importType) {
    throw new Error('Method canParse must be implemented');
  }

  /**
   * Parse the file buffer and return raw extracted records
   * @param {Buffer} buffer - File data buffer
   * @returns {Promise<Array<object>>}
   */
  async parse(buffer) {
    throw new Error('Method parse must be implemented');
  }
}

module.exports = BaseParser;
