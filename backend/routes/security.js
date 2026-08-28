/**
 * TrustGuard — Security Intelligence Routes
 *
 * All routes require JWT authentication.
 *
 * GET /api/security/decisions/:eventId — Retrieve full evaluation breakdown
 */
'use strict';

const { Router } = require('express');
const { authenticate } = require('../middleware/authenticate');
const { getDecisionByEventId } = require('../controllers/securityController');

const router = Router();

// All security intelligence routes require authentication
router.use(authenticate);

router.get('/decisions/:eventId', getDecisionByEventId);

module.exports = router;
