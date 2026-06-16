const path = require('path');
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'AI-CMS Backend API',
      version: '1.0.0',
      description: 'Backend API for the AI-Based Clinic Management System.'
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Local backend server'
      }
    ]
  },
  apis: [path.join(__dirname, '../modules/**/*.js')]
});

const setupSwagger = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};

module.exports = { setupSwagger };
