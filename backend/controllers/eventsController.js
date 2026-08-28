/**
 * TrustGuard — Agent Events Controller
 *
 * Implements the event ingestion & telemetry endpoints defined in docs/API_CONTRACT.md:
 *   POST /api/agent/events — Ingest agent runtime event evidence
 *   GET  /api/agent/events — Retrieve historic agent telemetry stream
 *
 * Security rules:
 *  - Both endpoints require JWT authentication.
 *  - Event session ownership is verified against the authenticated JWT user (req.user.userId).
 *  - Referenced agents must exist in the database; unknown agents are rejected.
 *  - Reported authorization and permissions are stored purely as EVIDENCE;
 *    they are NOT treated as authoritative permissions or decisions.
 *  - Registered agent permissions (agents.permissions) are NEVER modified by event data.
 *  - attack_chain_id remains NULL at ingestion (engines evaluate in Cycle 3).
 *  - No security_decisions records are created during ingestion.
 *  - Public identifiers (event_id_str, session_id_str, agent_id_str) are used;
 *    internal UUIDs are never exposed in API responses.
 */
'use strict';

const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const { sendError } = require('../middleware/errorHandler');
const { evaluateEvent } = require('../engines/securityPipeline');
const { correlateAttackChain } = require('../engines/attackChainEngine');

const VALID_DATA_SENSITIVITY = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const VALID_AUTH_STATUS = ['ALLOWED', 'DENIED', 'UNKNOWN'];
const VALID_PROVENANCE_SOURCE_TYPE = [
  'USER',
  'SYSTEM_POLICY',
  'APPROVED_KNOWLEDGE',
  'INTERNAL_DOCUMENT',
  'EXTERNAL_DOCUMENT',
  'ANOTHER_AGENT',
];
const VALID_PROVENANCE_TRUST_LEVEL = ['TRUSTED', 'MEDIUM', 'UNTRUSTED'];

/**
 * POST /api/agent/events
 * Ingest telemetry about an agent's runtime step/activity.
 */
async function ingestEvent(req, res, next) {
  try {
    const {
      eventId,
      sessionId,
      agentId,
      parentAgentId,
      timestamp,
      action,
      tool,
      resource,
      dataSensitivity,
      authorization,
      provenance,
      metadata,
      eventMetadata,
    } = req.body;

    // ── 1. Basic Field Presence & Type Validation ──────────────────────────
    if (!eventId || typeof eventId !== 'string' || eventId.trim() === '') {
      return sendError(res, 400, 'VALIDATION_ERROR', "Field 'eventId' is required.");
    }

    if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
      return sendError(res, 400, 'VALIDATION_ERROR', "Field 'sessionId' is required.");
    }

    if (!agentId || typeof agentId !== 'string' || agentId.trim() === '') {
      return sendError(res, 400, 'VALIDATION_ERROR', "Field 'agentId' is required.");
    }

    if (!action || typeof action !== 'string' || action.trim() === '') {
      return sendError(res, 400, 'VALIDATION_ERROR', "Field 'action' is required.");
    }

    if (!tool || typeof tool !== 'string' || tool.trim() === '') {
      return sendError(res, 400, 'VALIDATION_ERROR', "Field 'tool' is required.");
    }

    if (!resource || typeof resource !== 'string' || resource.trim() === '') {
      return sendError(res, 400, 'VALIDATION_ERROR', "Field 'resource' is required.");
    }

    if (!dataSensitivity || !VALID_DATA_SENSITIVITY.includes(dataSensitivity)) {
      return sendError(
        res,
        400,
        'VALIDATION_ERROR',
        `Field 'dataSensitivity' must be one of: ${VALID_DATA_SENSITIVITY.join(', ')}.`
      );
    }

    // ── 2. Authorization Object Validation ─────────────────────────────────
    if (!authorization || typeof authorization !== 'object' || Array.isArray(authorization)) {
      return sendError(res, 400, 'VALIDATION_ERROR', "Field 'authorization' object is required.");
    }

    if (!authorization.status || !VALID_AUTH_STATUS.includes(authorization.status)) {
      return sendError(
        res,
        400,
        'VALIDATION_ERROR',
        `Field 'authorization.status' must be one of: ${VALID_AUTH_STATUS.join(', ')}.`
      );
    }

    const requiredPermission =
      authorization.requiredPermission && typeof authorization.requiredPermission === 'string'
        ? authorization.requiredPermission.trim()
        : null;

    let grantedPermissions = [];
    if (authorization.grantedPermissions) {
      if (!Array.isArray(authorization.grantedPermissions)) {
        return sendError(
          res,
          400,
          'VALIDATION_ERROR',
          "Field 'authorization.grantedPermissions' must be an array of strings."
        );
      }
      grantedPermissions = authorization.grantedPermissions.map(p => String(p).trim());
    }

    // ── 3. Provenance Object Validation ────────────────────────────────────
    if (!provenance || typeof provenance !== 'object' || Array.isArray(provenance)) {
      return sendError(res, 400, 'VALIDATION_ERROR', "Field 'provenance' object is required.");
    }

    if (!provenance.sourceType || !VALID_PROVENANCE_SOURCE_TYPE.includes(provenance.sourceType)) {
      return sendError(
        res,
        400,
        'VALIDATION_ERROR',
        `Field 'provenance.sourceType' must be one of: ${VALID_PROVENANCE_SOURCE_TYPE.join(', ')}.`
      );
    }

    if (!provenance.sourceId || typeof provenance.sourceId !== 'string' || provenance.sourceId.trim() === '') {
      return sendError(res, 400, 'VALIDATION_ERROR', "Field 'provenance.sourceId' is required.");
    }

    if (!provenance.trustLevel || !VALID_PROVENANCE_TRUST_LEVEL.includes(provenance.trustLevel)) {
      return sendError(
        res,
        400,
        'VALIDATION_ERROR',
        `Field 'provenance.trustLevel' must be one of: ${VALID_PROVENANCE_TRUST_LEVEL.join(', ')}.`
      );
    }

    // ── 4. Metadata Validation ─────────────────────────────────────────────
    const rawMeta = metadata || eventMetadata || {};
    if (typeof rawMeta !== 'object' || Array.isArray(rawMeta) || rawMeta === null) {
      return sendError(res, 400, 'VALIDATION_ERROR', "Field 'metadata' must be a valid JSON object.");
    }

    // ── 5. Timestamp Handling ──────────────────────────────────────────────
    let eventTimestamp = new Date();
    if (timestamp) {
      const parsedDate = new Date(timestamp);
      if (isNaN(parsedDate.getTime())) {
        return sendError(res, 400, 'VALIDATION_ERROR', "Field 'timestamp' must be a valid ISO date string.");
      }
      eventTimestamp = parsedDate;
    }

    // ── 6. Check Duplicate Event ID ────────────────────────────────────────
    const duplicateCheck = await pool.query(
      'SELECT id FROM agent_events WHERE event_id_str = $1',
      [eventId.trim()]
    );
    if (duplicateCheck.rows.length > 0) {
      return sendError(res, 409, 'DUPLICATE_EVENT', `Event with ID ${eventId.trim()} already exists.`);
    }

    // ── 7. Session Lookup & Ownership Verification ─────────────────────────
    const sessionRes = await pool.query(
      'SELECT id, user_id, original_intent, current_trust_score FROM sessions WHERE session_id_str = $1',
      [sessionId.trim()]
    );
    if (sessionRes.rows.length === 0) {
      return sendError(res, 404, 'SESSION_NOT_FOUND', `Session with ID ${sessionId.trim()} was not found.`);
    }

    const session = sessionRes.rows[0];
    if (session.user_id !== req.user.userId) {
      return sendError(res, 403, 'FORBIDDEN', 'You do not have permission to access this session.');
    }

    // ── 8. Agent Lookup ────────────────────────────────────────────────────
    const agentRes = await pool.query(
      'SELECT id, agent_id_str, permissions, current_trust_score FROM agents WHERE agent_id_str = $1',
      [agentId.trim()]
    );
    if (agentRes.rows.length === 0) {
      return sendError(res, 404, 'AGENT_NOT_FOUND', `Agent with ID ${agentId.trim()} was not found.`);
    }
    const agentRecord = agentRes.rows[0];
    const agentUuid = agentRecord.id;

    // ── 9. Parent Agent Lookup (Optional) ──────────────────────────────────
    let parentAgentUuid = null;
    if (parentAgentId && typeof parentAgentId === 'string' && parentAgentId.trim() !== '') {
      const parentAgentRes = await pool.query(
        'SELECT id FROM agents WHERE agent_id_str = $1',
        [parentAgentId.trim()]
      );
      if (parentAgentRes.rows.length === 0) {
        return sendError(res, 404, 'AGENT_NOT_FOUND', `Parent agent with ID ${parentAgentId.trim()} was not found.`);
      }
      parentAgentUuid = parentAgentRes.rows[0].id;
    }

    // ── 10. Execute Security Intelligence Pipeline (Cycle 3) ───────────────
    const securityResult = evaluateEvent({
      eventData: {
        eventId: eventId.trim(),
        action: action.trim(),
        tool: tool.trim(),
        resource: resource.trim(),
        dataSensitivity,
        authorization: {
          status: authorization.status,
          requiredPermission,
          grantedPermissions,
        },
        provenance,
      },
      agent: agentRecord,
      session,
    });

    // ── 11. Execute Attack Chain Correlation Engine (Cycle 4) ───────────────
    // Query historical events in this session to correlate multi-stage trajectories
    const histEventsRes = await pool.query(
      `SELECT
        e.id,
        e.event_id_str,
        e.action,
        e.tool,
        e.resource,
        e.data_sensitivity,
        e.reported_auth_status,
        e.provenance_source_type,
        e.provenance_trust_level,
        e.timestamp,
        d.decision,
        d.risk_level,
        d.intent_status,
        d.security_signals
      FROM agent_events e
      LEFT JOIN security_decisions d ON d.event_id = e.id
      WHERE e.session_id = $1
      ORDER BY e.timestamp ASC`,
      [session.id]
    );

    const historicalEvents = histEventsRes.rows.map((row) => ({
      id: row.id,
      event_id_str: row.event_id_str,
      action: row.action,
      tool: row.tool,
      resource: row.resource,
      data_sensitivity: row.data_sensitivity,
      reported_auth_status: row.reported_auth_status,
      provenance_source_type: row.provenance_source_type,
      provenance_trust_level: row.provenance_trust_level,
      timestamp: row.timestamp,
    }));

    const historicalDecisions = histEventsRes.rows.map((row) => ({
      event_id: row.id,
      event_id_str: row.event_id_str,
      decision: row.decision,
      risk_level: row.risk_level,
      intent_status: row.intent_status,
      security_signals: row.security_signals || {},
    }));

    // Combine previous events with current incoming event & decision
    const currentEventObj = {
      id: 'current_event',
      event_id_str: eventId.trim(),
      action: action.trim(),
      tool: tool.trim(),
      resource: resource.trim(),
      data_sensitivity: dataSensitivity,
      reported_auth_status: authorization.status,
      provenance_source_type: provenance.sourceType,
      provenance_trust_level: provenance.trustLevel,
      timestamp: eventTimestamp,
    };

    const currentDecisionObj = {
      event_id: 'current_event',
      event_id_str: eventId.trim(),
      decision: securityResult.decision,
      risk_level: securityResult.riskLevel,
      intent_status: securityResult.intent.status,
      security_signals: securityResult.securitySignals,
    };

    const chainResult = correlateAttackChain({
      events: [...historicalEvents, currentEventObj],
      decisions: [...historicalDecisions, currentDecisionObj],
      session,
      agent: agentRecord,
    });

    let chainDbUuid = null;
    let chainPublicId = null;

    if (chainResult.detected) {
      // Check if an attack chain record already exists for this session
      const existingChainRes = await pool.query(
        'SELECT id, chain_id_str, severity FROM attack_chains WHERE session_id = $1 AND status = $2',
        [session.id, 'ACTIVE']
      );

      if (existingChainRes.rows.length > 0) {
        chainDbUuid = existingChainRes.rows[0].id;
        chainPublicId = existingChainRes.rows[0].chain_id_str;

        // Update severity and summary if escalated
        await pool.query(
          'UPDATE attack_chains SET severity = $1, summary = $2 WHERE id = $3',
          [chainResult.severity, chainResult.summary, chainDbUuid]
        );
      } else {
        chainDbUuid = uuidv4();
        chainPublicId = 'chain_' + uuidv4().replace(/-/g, '').slice(0, 16);

        await pool.query(
          `INSERT INTO attack_chains (
            id,
            chain_id_str,
            session_id,
            severity,
            status,
            summary,
            detected_at
          ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
          [
            chainDbUuid,
            chainPublicId,
            session.id,
            chainResult.severity,
            'ACTIVE',
            chainResult.summary,
          ]
        );
      }

      // Associate historical events in this chain
      await pool.query(
        'UPDATE agent_events SET attack_chain_id = $1 WHERE session_id = $2',
        [chainDbUuid, session.id]
      );

      // Create alert if severity is HIGH or CRITICAL (with duplicate prevention)
      if (chainResult.severity === 'HIGH' || chainResult.severity === 'CRITICAL') {
        const existingAlert = await pool.query(
          'SELECT id FROM alerts WHERE attack_chain_id = $1',
          [chainDbUuid]
        );
        if (existingAlert.rows.length === 0) {
          const alertUuid = uuidv4();
          const alertIdStr = 'al_' + uuidv4().replace(/-/g, '').slice(0, 8);
          await pool.query(
            `INSERT INTO alerts (
              id,
              alert_id_str,
              attack_chain_id,
              agent_id,
              severity,
              type,
              title,
              description,
              status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              alertUuid,
              alertIdStr,
              chainDbUuid,
              agentUuid,
              chainResult.severity,
              'ATTACK_CHAIN_DETECTED',
              `Attack Chain Detected (${chainResult.attackCategory})`,
              chainResult.summary,
              'UNRESOLVED',
            ]
          );
        }
      }

      // Reflect in the securityResult payload
      securityResult.attackChain = {
        detected: true,
        severity: chainResult.severity,
        chainId: chainPublicId,
      };
      securityResult.securitySignals.attackChainRisk = chainResult.severity;
      if (!securityResult.reasons.some((r) => r.includes('Attack chain detected'))) {
        securityResult.reasons.push(`Attack chain detected: ${chainPublicId}`);
      }
    }

    // ── 12. Persist Event Evidence into DB ─────────────────────────────────
    const eventInternalUuid = uuidv4();

    await pool.query(
      `INSERT INTO agent_events (
        id,
        event_id_str,
        session_id,
        agent_id,
        parent_agent_id,
        timestamp,
        action,
        tool,
        resource,
        data_sensitivity,
        reported_auth_status,
        required_permission,
        reported_granted_permissions,
        provenance_source_type,
        provenance_source_id,
        provenance_trust_level,
        event_metadata,
        attack_chain_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18
      )`,
      [
        eventInternalUuid,
        eventId.trim(),
        session.id,
        agentUuid,
        parentAgentUuid,
        eventTimestamp.toISOString(),
        action.trim(),
        tool.trim(),
        resource.trim(),
        dataSensitivity,
        authorization.status,
        requiredPermission,
        grantedPermissions,
        provenance.sourceType,
        provenance.sourceId.trim(),
        provenance.trustLevel,
        JSON.stringify(rawMeta),
        chainDbUuid,
      ]
    );

    // ── 13. Persist Security Decision in DB ────────────────────────────────
    const decisionUuid = uuidv4();
    await pool.query(
      `INSERT INTO security_decisions (
        id,
        event_id,
        decision,
        risk_level,
        trust_score,
        intent_status,
        intent_alignment_score,
        attack_chain_detected,
        attack_chain_severity,
        attack_chain_id,
        security_signals,
        reasons
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        decisionUuid,
        eventInternalUuid,
        securityResult.decision,
        securityResult.riskLevel,
        securityResult.trustScore,
        securityResult.intent.status,
        securityResult.intent.alignmentScore,
        securityResult.attackChain.detected,
        securityResult.attackChain.severity,
        chainDbUuid,
        JSON.stringify(securityResult.securitySignals),
        securityResult.reasons,
      ]
    );

    // ── 14. Update Dynamic Trust Scores in Session and Agent ───────────────
    await pool.query(
      'UPDATE sessions SET current_trust_score = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [securityResult.trustScore, session.id]
    );
    await pool.query(
      'UPDATE agents SET current_trust_score = $1 WHERE id = $2',
      [securityResult.trustScore, agentUuid]
    );

    // ── 15. Return Contract-Compliant Security Result Response ─────────────
    return res.status(201).json({
      eventId: securityResult.eventId,
      decision: securityResult.decision,
      riskLevel: securityResult.riskLevel,
      trustScore: securityResult.trustScore,
      intent: securityResult.intent,
      attackChain: securityResult.attackChain,
      securitySignals: securityResult.securitySignals,
      reasons: securityResult.reasons,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/agent/events
 * Fetch historic telemetry logs and action streams for audit.
 */
async function listEvents(req, res, next) {
  try {
    const { sessionId, agentId, limit } = req.query;

    const queryLimit = parseInt(limit, 10) || 50;
    if (queryLimit < 1 || queryLimit > 1000 || !Number.isFinite(queryLimit)) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Parameter limit must be an integer between 1 and 1000.');
    }

    // If specific sessionId filter provided, verify ownership
    if (sessionId) {
      const sessionCheck = await pool.query(
        'SELECT id, user_id FROM sessions WHERE session_id_str = $1',
        [String(sessionId).trim()]
      );
      if (sessionCheck.rows.length === 0) {
        return sendError(res, 404, 'SESSION_NOT_FOUND', `Session with ID ${sessionId} was not found.`);
      }
      if (sessionCheck.rows[0].user_id !== req.user.userId) {
        return sendError(res, 403, 'FORBIDDEN', 'You do not have permission to access this session.');
      }
    }

    const query = `
      SELECT
        e.event_id_str,
        s.session_id_str,
        a.agent_id_str,
        pa.agent_id_str AS parent_agent_id_str,
        e.timestamp,
        e.action,
        e.tool,
        e.resource,
        e.data_sensitivity,
        e.reported_auth_status,
        e.required_permission,
        e.reported_granted_permissions,
        e.provenance_source_type,
        e.provenance_source_id,
        e.provenance_trust_level
      FROM agent_events e
      JOIN sessions s ON e.session_id = s.id
      JOIN agents a ON e.agent_id = a.id
      LEFT JOIN agents pa ON e.parent_agent_id = pa.id
      WHERE s.user_id = $1
        AND ($2::text IS NULL OR s.session_id_str = $2)
        AND ($3::text IS NULL OR a.agent_id_str = $3)
      ORDER BY e.timestamp ASC
      LIMIT $4
    `;

    const params = [
      req.user.userId,
      sessionId ? String(sessionId).trim() : null,
      agentId ? String(agentId).trim() : null,
      queryLimit,
    ];

    const result = await pool.query(query, params);

    const formattedEvents = result.rows.map(row => ({
      eventId: row.event_id_str,
      sessionId: row.session_id_str,
      agentId: row.agent_id_str,
      parentAgentId: row.parent_agent_id_str || null,
      timestamp: row.timestamp,
      action: row.action,
      tool: row.tool,
      resource: row.resource,
      dataSensitivity: row.data_sensitivity,
      authorization: {
        status: row.reported_auth_status,
        requiredPermission: row.required_permission || null,
        grantedPermissions: row.reported_granted_permissions || [],
      },
      provenance: {
        sourceType: row.provenance_source_type,
        sourceId: row.provenance_source_id,
        trustLevel: row.provenance_trust_level,
      },
    }));

    return res.status(200).json({
      events: formattedEvents,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { ingestEvent, listEvents };
