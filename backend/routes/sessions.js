/**
 * TrustGuard — Sessions Routes
 *
 * All routes require JWT authentication.
 *
 * POST /api/sessions              — create session
 * GET  /api/sessions/:sessionId   — retrieve session
 */
'use strict';

const { Router } = require('express');
const { authenticate } = require('../middleware/authenticate');
const { createSession, getSession } = require('../controllers/sessionsController');

const router = Router();

// All session endpoints require authentication
router.use(authenticate);

router.post('/', createSession);
router.get('/:sessionId', getSession);

module.exports = router;
