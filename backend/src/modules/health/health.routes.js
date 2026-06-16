const { Router } = require('express');

const { getHealth } = require('./health.controller');

const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Service health check
 *     description: Returns backend runtime and database connection status.
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Backend health details returned successfully.
 */
router.get('/', getHealth);

module.exports = router;
