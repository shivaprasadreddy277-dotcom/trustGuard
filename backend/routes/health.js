/**
 * TrustGuard — Health Route
 * GET /api/health
 */
'use strict';

const { Router } = require('express');

const router = Router();

router.get('/', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

module.exports = router;
