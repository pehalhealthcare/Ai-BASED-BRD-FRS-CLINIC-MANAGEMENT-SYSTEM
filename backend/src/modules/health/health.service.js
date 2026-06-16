const { getDatabaseStatus } = require('../../config/database');

const getHealthStatus = () => {
  const database = getDatabaseStatus();

  return {
    service: 'backend',
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: {
      status: database.status,
      mode: database.mode
    }
  };
};

module.exports = { getHealthStatus };
