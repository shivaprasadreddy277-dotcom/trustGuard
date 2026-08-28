/**
 * TrustGuard — Security Intelligence Controller
 *
 * Implements endpoints defined under Section 6 of docs/API_CONTRACT.md:
 *   GET /api/security/decisions/:eventId — Retrieve full evaluation breakdown for an event
 */
'use strict';

const pool = require('../db/pool');
const { sendError } = require('../middleware/errorHandler');

/**
 * GET /api/security/decisions/:eventId
 * Retrieve full analysis and engine breakdown for a specific event decision.
 */
async function getDecisionByEventId(req, res, next) {
  try {
    const { eventId } = req.params;

    if (!eventId || typeof eventId !== 'string' || eventId.trim() === '') {
      return sendError(res, 400, 'VALIDATION_ERROR', "Parameter 'eventId' is required.");
    }

    const query = `
      SELECT
        e.event_id_str,
        d.decision,
        d.risk_level,
        d.trust_score,
        d.intent_status,
        d.intent_alignment_score,
        d.attack_chain_detected,
        d.attack_chain_severity,
        ac.chain_id_str AS attack_chain_id_str,
        d.security_signals,
        d.reasons
      FROM security_decisions d
      JOIN agent_events e ON d.event_id = e.id
      LEFT JOIN attack_chains ac ON d.attack_chain_id = ac.id
      WHERE e.event_id_str = $1
    `;

    const result = await pool.query(query, [eventId.trim()]);

    if (result.rows.length === 0) {
      return sendError(
        res,
        404,
        'DECISION_NOT_FOUND',
        `Decision for event ID ${eventId.trim()} was not found.`
      );
    }

    const row = result.rows[0];

    return res.status(200).json({
      eventId: row.event_id_str,
      decision: row.decision,
      riskLevel: row.risk_level,
      trustScore: row.trust_score,
      intent: {
        status: row.intent_status,
        alignmentScore: parseFloat(row.intent_alignment_score),
      },
      attackChain: {
        detected: row.attack_chain_detected,
        severity: row.attack_chain_severity,
        chainId: row.attack_chain_id_str || null,
      },
      securitySignals: row.security_signals || {},
      reasons: row.reasons || [],
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getDecisionByEventId };
