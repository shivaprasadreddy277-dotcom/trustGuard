/**
 * TrustGuard — Agents Routes
 *
 * All routes require JWT authentication.
 *
 * GET /api/agents                    — list all agents (optional ?status)
 * GET /api/agents/:agentId           — get agent profile
 * GET /api/agents/:agentId/trust     — get trust score + history
 */
'use strict';

const { Router } = require('express');
const { authenticate } = require('../middleware/authenticate');
const { listAgents, getAgent, getAgentTrust } = require('../controllers/agentsController');

const router = Router();

// All agent endpoints require authentication
router.use(authenticate);

router.get('/', listAgents);
router.get('/:agentId/trust', getAgentTrust);  // must come before /:agentId
router.get('/:agentId', getAgent);

module.exports = router;
