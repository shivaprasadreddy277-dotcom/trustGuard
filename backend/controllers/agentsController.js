/**
 * TrustGuard — Agents Controller
 *
 * Implements the three agent endpoints defined in docs/API_CONTRACT.md:
 *   GET /api/agents               — list agents (optional ?status filter)
 *   GET /api/agents/:agentId      — get single agent profile
 *   GET /api/agents/:agentId/trust — get trust score + history stub
 *
 * Security rules:
 *  - All endpoints require JWT authentication (enforced by router)
 *  - agent_id_str is the PUBLIC identifier returned in responses
 *  - Internal UUID (id) is NEVER returned in responses
 *  - Trust history is stubbed from current_trust_score (dynamic engine is a later cycle)
 */
'use strict';

const pool = require('../db/pool');
const { sendError } = require('../middleware/errorHandler');

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Map a DB row to the list-view agent shape per API contract */
function toAgentListItem(row) {
  return {
    agentId: row.agent_id_str,
    name: row.name,
    status: row.status,
    currentTrustScore: row.current_trust_score,
    declaredObjective: row.declared_objective,
    createdAt: row.created_at,
  };
}

/** Map a DB row to the detail-view agent shape per API contract */
function toAgentDetail(row) {
  return {
    agentId: row.agent_id_str,
    name: row.name,
    description: row.description || null,
    status: row.status,
    currentTrustScore: row.current_trust_score,
    declaredObjective: row.declared_objective,
    createdAt: row.created_at,
  };
}

const VALID_STATUS_VALUES = ['ACTIVE', 'SUSPENDED'];

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * GET /api/agents
 * Optional query param: ?status=ACTIVE|SUSPENDED
 * Returns 200 { agents: [...] }
 */
async function listAgents(req, res, next) {
  try {
    const { status } = req.query;

    // Validate optional status filter — reject invalid values
    if (status !== undefined && !VALID_STATUS_VALUES.includes(status)) {
      return sendError(res, 400, 'VALIDATION_ERROR',
        `Invalid status filter. Allowed values: ${VALID_STATUS_VALUES.join(', ')}.`);
    }

    let query;
    let params;

    if (status) {
      query = `
        SELECT agent_id_str, name, status, current_trust_score,
               declared_objective, created_at
        FROM agents
        WHERE status = $1
        ORDER BY created_at ASC
      `;
      params = [status];
    } else {
      query = `
        SELECT agent_id_str, name, status, current_trust_score,
               declared_objective, created_at
        FROM agents
        ORDER BY created_at ASC
      `;
      params = [];
    }

    const result = await pool.query(query, params);

    return res.status(200).json({
      agents: result.rows.map(toAgentListItem),
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/agents/:agentId
 * agentId path param is the PUBLIC agent_id_str (e.g., "agent_001")
 * Returns 200 { agent: {...} } or 404
 */
async function getAgent(req, res, next) {
  try {
    const { agentId } = req.params;

    const result = await pool.query(
      `SELECT agent_id_str, name, description, status, current_trust_score,
              declared_objective, created_at
       FROM agents
       WHERE agent_id_str = $1`,
      [agentId]
    );

    if (result.rows.length === 0) {
      return sendError(res, 404, 'AGENT_NOT_FOUND',
        `Agent with ID ${agentId} was not found.`);
    }

    return res.status(200).json({
      agent: toAgentDetail(result.rows[0]),
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/agents/:agentId/trust
 * Returns current trust score and a history stub.
 * Dynamic trust history engine is implemented in a later cycle.
 * For MVP: returns a single-entry history reflecting the current stored score.
 *
 * Optional query param: ?limit=<integer> (default 50)
 */
async function getAgentTrust(req, res, next) {
  try {
    const { agentId } = req.params;
    const limit = parseInt(req.query.limit, 10) || 50;

    if (limit < 1 || limit > 1000 || !Number.isFinite(limit)) {
      return sendError(res, 400, 'VALIDATION_ERROR',
        'limit must be a positive integer (max 1000).');
    }

    const result = await pool.query(
      `SELECT agent_id_str, current_trust_score, created_at
       FROM agents
       WHERE agent_id_str = $1`,
      [agentId]
    );

    if (result.rows.length === 0) {
      return sendError(res, 404, 'AGENT_NOT_FOUND',
        `Agent with ID ${agentId} was not found.`);
    }

    const agent = result.rows[0];

    // Stub: trust history populated by Dynamic Trust Engine in a later cycle.
    // For now, return the current score as the single history entry.
    const historyStub = [
      {
        timestamp: agent.created_at,
        score: agent.current_trust_score,
        reason: 'Initial trust score at agent registration.',
      },
    ].slice(0, limit);

    return res.status(200).json({
      agentId: agent.agent_id_str,
      currentTrustScore: agent.current_trust_score,
      history: historyStub,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { listAgents, getAgent, getAgentTrust };
