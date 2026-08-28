/**
 * TrustGuard — Agent Events & Telemetry Routes
 *
 * All routes require JWT authentication.
 *
 * POST /api/agent/events — Ingest agent runtime event evidence
 * GET  /api/agent/events — Retrieve historic agent telemetry stream
 */
'use strict';

const { Router } = require('express');
const { authenticate } = require('../middleware/authenticate');
const { ingestEvent, listEvents } = require('../controllers/eventsController');

const router = Router();

// All event telemetry endpoints require authentication
router.use(authenticate);

router.post('/', ingestEvent);
router.get('/', listEvents);

module.exports = router;
