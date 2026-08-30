/**
 * TrustGuard — Security Intelligence Controller
 *
 * Implements endpoints defined under Section 6 of docs/API_CONTRACT.md:
 *   GET /api/security/decisions/:eventId — Retrieve full evaluation breakdown for an event
 *   GET /api/security/attack-chains/:chainId — Retrieve attack chain details and event steps
 *   GET /api/security/attack-chains — List detected attack chains for user sessions
 *   GET /api/security/alerts — List security alerts
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
      JOIN sessions s ON e.session_id = s.id
      LEFT JOIN attack_chains ac ON d.attack_chain_id = ac.id
      WHERE e.event_id_str = $1 AND s.user_id = $2
    `;

    const result = await pool.query(query, [eventId.trim(), req.user.userId]);

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

/**
 * GET /api/security/attack-chains/:chainId
 * Get details of a detected stateful attack chain, listing historical event steps in sequence.
 */
async function getAttackChainById(req, res, next) {
  try {
    const { chainId } = req.params;

    if (!chainId || typeof chainId !== 'string' || chainId.trim() === '') {
      return sendError(res, 400, 'VALIDATION_ERROR', "Parameter 'chainId' is required.");
    }

    // Query attack chain ensuring session ownership
    const chainQuery = `
      SELECT
        ac.id,
        ac.chain_id_str,
        ac.session_id,
        s.session_id_str,
        s.user_id,
        a.agent_id_str,
        ac.severity,
        ac.status,
        ac.summary,
        ac.detected_at,
        ac.resolved_at
      FROM attack_chains ac
      JOIN sessions s ON ac.session_id = s.id
      JOIN agents a ON s.agent_id = a.id
      WHERE ac.chain_id_str = $1
    `;

    const chainRes = await pool.query(chainQuery, [chainId.trim()]);

    if (chainRes.rows.length === 0) {
      return sendError(
        res,
        404,
        'ATTACK_CHAIN_NOT_FOUND',
        `Attack chain with ID ${chainId.trim()} was not found.`
      );
    }

    const chain = chainRes.rows[0];

    if (chain.user_id !== req.user.userId) {
      return sendError(res, 403, 'FORBIDDEN', 'You do not have permission to view this attack chain.');
    }

    // Query ordered events associated with this chain
    const eventsQuery = `
      SELECT
        e.event_id_str,
        e.timestamp,
        e.action,
        e.tool,
        e.resource,
        e.data_sensitivity,
        e.reported_auth_status,
        e.provenance_source_type,
        e.provenance_trust_level,
        d.decision,
        d.risk_level,
        d.reasons
      FROM agent_events e
      LEFT JOIN security_decisions d ON d.event_id = e.id
      WHERE e.attack_chain_id = $1
      ORDER BY e.timestamp ASC
    `;

    const eventsRes = await pool.query(eventsQuery, [chain.id]);

    const formattedEvents = eventsRes.rows.map((row) => ({
      eventId: row.event_id_str,
      timestamp: row.timestamp,
      tool: row.tool,
      action: row.action,
      resource: row.resource,
      dataSensitivity: row.data_sensitivity,
      decision: row.decision,
      riskLevel: row.risk_level,
      reasons: row.reasons || [],
    }));

    // Calculate deterministic confidence based on number of correlated steps & severity
    let confidence = 0.85;
    if (formattedEvents.length >= 5) confidence = 0.98;
    else if (formattedEvents.length >= 3) confidence = 0.92;
    else if (chain.severity === 'CRITICAL') confidence = 0.95;

    return res.status(200).json({
      chainId: chain.chain_id_str,
      sessionId: chain.session_id_str,
      agentId: chain.agent_id_str,
      detectedAt: chain.detected_at,
      severity: chain.severity,
      status: chain.status,
      summary: chain.summary,
      confidence,
      events: formattedEvents,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/security/attack-chains
 * List all detected attack chains for the operator's sessions.
 */
async function listAttackChains(req, res, next) {
  try {
    const query = `
      SELECT
        ac.chain_id_str AS "chainId",
        s.session_id_str AS "sessionId",
        a.agent_id_str AS "agentId",
        ac.severity,
        ac.status,
        ac.summary,
        ac.detected_at AS "detectedAt",
        COUNT(e.id)::int AS "eventCount"
      FROM attack_chains ac
      JOIN sessions s ON ac.session_id = s.id
      JOIN agents a ON s.agent_id = a.id
      LEFT JOIN agent_events e ON e.attack_chain_id = ac.id
      WHERE s.user_id = $1
      GROUP BY ac.id, ac.chain_id_str, s.session_id_str, a.agent_id_str, ac.severity, ac.status, ac.summary, ac.detected_at
      ORDER BY ac.detected_at DESC
    `;

    const result = await pool.query(query, [req.user.userId]);

    return res.status(200).json({
      attackChains: result.rows,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/security/alerts
 * Retrieve list of threat alerts matching docs/API_CONTRACT.md
 */
async function listAlerts(req, res, next) {
  try {
    const { resolved, limit } = req.query;

    const queryLimit = parseInt(limit, 10) || 50;
    if (queryLimit < 1 || queryLimit > 1000 || !Number.isFinite(queryLimit)) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Parameter limit must be an integer between 1 and 1000.');
    }

    let statusFilter = null;
    if (resolved !== undefined) {
      statusFilter = resolved === 'true' ? 'RESOLVED' : 'UNRESOLVED';
    }

    const query = `
      SELECT
        al.alert_id_str AS "alertId",
        e.event_id_str AS "eventId",
        ac.chain_id_str AS "chainId",
        al.created_at AS "timestamp",
        a.agent_id_str AS "agentId",
        al.severity,
        al.type,
        al.description AS "message",
        (al.status = 'RESOLVED') AS "resolved"
      FROM alerts al
      JOIN agents a ON al.agent_id = a.id
      LEFT JOIN agent_events e ON al.event_id = e.id
      LEFT JOIN attack_chains ac ON al.attack_chain_id = ac.id
      LEFT JOIN sessions s ON ac.session_id = s.id OR e.session_id = s.id
      WHERE (s.user_id = $1 OR s.user_id IS NULL)
        AND ($2::text IS NULL OR al.status = $2)
      ORDER BY al.created_at DESC
      LIMIT $3
    `;

    const result = await pool.query(query, [req.user.userId, statusFilter, queryLimit]);

    return res.status(200).json({
      alerts: result.rows,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/security/decisions
 * Auth: Required (JWT)
 * List all security decisions for the authenticated user's events.
 */
async function listDecisions(req, res, next) {
  try {
    const query = `
      SELECT
        e.event_id_str AS "eventId",
        d.decision AS "verdict",
        d.risk_level AS "riskLevel",
        d.trust_score AS "trustScore",
        d.intent_status AS "intentStatus",
        d.intent_alignment_score AS "intentAlignmentScore",
        d.attack_chain_detected AS "attackChainDetected",
        d.attack_chain_severity AS "attackChainSeverity",
        d.created_at AS "timestamp",
        e.action,
        e.resource,
        e.agent_id_str AS "agentId",
        ac.chain_id_str AS "attackChainId",
        d.security_signals AS "securitySignals"
      FROM security_decisions d
      JOIN (
        SELECT ae.id, ae.event_id_str, ae.action, ae.resource, ae.session_id, ag.agent_id_str
        FROM agent_events ae
        JOIN agents ag ON ae.agent_id = ag.id
      ) e ON d.event_id = e.id
      JOIN sessions s ON e.session_id = s.id
      LEFT JOIN attack_chains ac ON d.attack_chain_id = ac.id
      WHERE s.user_id = $1
      ORDER BY d.created_at DESC
    `;

    const result = await pool.query(query, [req.user.userId]);

    const formatted = result.rows.map((row) => {
      // Map securitySignals to mock engineResults object expected by Decisions.jsx
      const signals = row.securitySignals || {};
      const engineResults = {
        policy: { score: signals.policyViolation ? 0 : 100 },
        provenance: { score: signals.provenanceRisk === 'HIGH' ? 30 : signals.provenanceRisk === 'MEDIUM' ? 70 : 100 },
        intent: { score: Math.round((parseFloat(row.intentAlignmentScore) || 1.0) * 100) },
        risk: { score: row.riskLevel === 'CRITICAL' ? 100 : row.riskLevel === 'HIGH' ? 80 : row.riskLevel === 'MEDIUM' ? 50 : 10 },
        trust: { score: row.trustScore || 100 }
      };

      return {
        decisionId: row.eventId,
        verdict: row.verdict,
        timestamp: row.timestamp,
        event: {
          action: row.action,
          resource: row.resource,
          agentId: row.agentId,
        },
        engineResults
      };
    });

    return res.status(200).json({
      decisions: formatted,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getDecisionByEventId,
  getAttackChainById,
  listAttackChains,
  listAlerts,
  listDecisions,
};

