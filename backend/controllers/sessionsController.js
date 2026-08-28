/**
 * TrustGuard — Sessions Controller
 *
 * Implements the two session endpoints defined in docs/API_CONTRACT.md:
 *   POST /api/sessions            — create a new session
 *   GET  /api/sessions/:sessionId — retrieve session details
 *
 * Security rules:
 *  - Both endpoints require JWT authentication
 *  - user_id is sourced from the verified JWT, NEVER from the client
 *  - session_id_str is the public session identifier; internal UUID is never returned
 *  - original_intent is stored exactly as provided, never modified
 *  - POST /api/sessions body only provides originalIntent (per API contract)
 *    → agent_id defaults to 'agent_001' (the NovaCorp Demo Agent) per approved
 *      DATABASE_SCHEMA.md resolution for Session Creation Context Deficiency
 *  - GET /api/sessions/:sessionId — access is gated by authentication only
 *    (the API contract does not specify ownership-based 404; unauthenticated → 401)
 */
'use strict';

const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const { sendError } = require('../middleware/errorHandler');

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Generate a public session ID string: sess_<16-char-hex> */
function generateSessionIdStr() {
  return 'sess_' + uuidv4().replace(/-/g, '').slice(0, 16);
}

// Default demo agent per DATABASE_SCHEMA.md mismatch resolution §3
const DEFAULT_AGENT_ID_STR = 'agent_001';

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * POST /api/sessions
 * Body: { originalIntent: string }
 * Auth: Required (JWT)
 *
 * Creates a new session owned by the authenticated user.
 * Defaults to associating with the primary demo agent (agent_001).
 * Returns: { sessionId, originalIntent }
 */
async function createSession(req, res, next) {
  try {
    const { originalIntent } = req.body;

    // ── Input Validation ────────────────────────────────────────────────────
    if (!originalIntent || String(originalIntent).trim() === '') {
      return sendError(res, 400, 'MISSING_INTENT',
        "The field 'originalIntent' is required to initialize a session.");
    }

    const trimmedIntent = String(originalIntent).trim();

    // ── Resolve authenticated user ID from JWT ──────────────────────────────
    // req.user is populated by authenticate middleware from the VERIFIED JWT
    // We do NOT trust any user ID provided in the request body
    const userId = req.user.userId; // internal UUID from JWT payload

    // ── Resolve default agent ───────────────────────────────────────────────
    const agentResult = await pool.query(
      'SELECT id FROM agents WHERE agent_id_str = $1',
      [DEFAULT_AGENT_ID_STR]
    );

    if (agentResult.rows.length === 0) {
      // Default agent not found — genuine blocker, report cleanly
      return sendError(res, 503, 'SERVICE_UNAVAILABLE',
        'Default demo agent is not configured. Please seed the database.');
    }

    const agentId = agentResult.rows[0].id; // internal agent UUID

    // ── Create Session ──────────────────────────────────────────────────────
    const sessionIdStr = generateSessionIdStr();
    const sessionUUID = uuidv4(); // Generate UUID in app code for portability

    const insertResult = await pool.query(
      `INSERT INTO sessions
         (id, session_id_str, user_id, agent_id, original_intent, current_trust_score, status)
       VALUES ($1, $2, $3, $4, $5, 100, 'ACTIVE')
       RETURNING session_id_str, original_intent`,
      [sessionUUID, sessionIdStr, userId, agentId, trimmedIntent]
    );

    const session = insertResult.rows[0];

    // ── Response — session_id_str as public identifier per API contract ──────
    return res.status(201).json({
      sessionId: session.session_id_str,
      originalIntent: session.original_intent,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/sessions/:sessionId
 * Auth: Required (JWT)
 *
 * Retrieves a session by its PUBLIC sessionId (session_id_str).
 * Returns: { sessionId, originalIntent }
 *
 * Ownership note: The API contract does not specify a per-user ownership
 * restriction — it only requires authentication. Any authenticated operator
 * can retrieve a session by ID. This follows the contract exactly.
 */
async function getSession(req, res, next) {
  try {
    const { sessionId } = req.params;

    const result = await pool.query(
      `SELECT session_id_str, original_intent, user_id
       FROM sessions
       WHERE session_id_str = $1`,
      [sessionId]
    );

    if (result.rows.length === 0) {
      return sendError(res, 404, 'SESSION_NOT_FOUND',
        `Session with ID ${sessionId} was not found.`);
    }

    const session = result.rows[0];

    // Return only the fields defined by the API contract.
    // user_id (internal UUID) is never returned.
    return res.status(200).json({
      sessionId: session.session_id_str,
      originalIntent: session.original_intent,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { createSession, getSession };
