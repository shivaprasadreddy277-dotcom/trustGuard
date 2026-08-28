/**
 * TrustGuard — Security Intelligence Routes
 *
 * All routes require JWT authentication.
 *
 * GET /api/security/decisions/:eventId — Retrieve full evaluation breakdown
 * GET /api/security/attack-chains/:chainId — Retrieve attack chain details and event steps
 * GET /api/security/attack-chains — List detected attack chains
 * GET /api/security/alerts — List security alerts
 */
'use strict';

const { Router } = require('express');
const { authenticate } = require('../middleware/authenticate');
const {
  getDecisionByEventId,
  getAttackChainById,
  listAttackChains,
  listAlerts,
} = require('../controllers/securityController');

const router = Router();

// All security intelligence routes require authentication
router.use(authenticate);

router.get('/decisions/:eventId', getDecisionByEventId);
router.get('/attack-chains/:chainId', getAttackChainById);
router.get('/attack-chains', listAttackChains);
router.get('/alerts', listAlerts);

module.exports = router;
