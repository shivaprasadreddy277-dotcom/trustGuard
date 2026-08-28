/**
 * TrustGuard — Simulation Service (Cycle 5)
 *
 * Orchestrates deterministic security simulation scenarios by executing real event
 * telemetry through the authoritative Cycle 3 security pipeline and Cycle 4 attack chain engine.
 */
'use strict';

const crypto = require('crypto');
const pool = require('../db/pool');
const { evaluateEvent } = require('../engines/securityPipeline');
const { correlateAttackChain } = require('../engines/attackChainEngine');

// ── Canonical Scenario Definitions ───────────────────────────────────────────
const SCENARIOS = [
  {
    scenarioId: 'normal_workflow',
    name: 'A. Normal Workflow',
    description: 'Agent performs regular analytical tasks within its defined role limits.',
    expectedDecision: 'ALLOW',
    steps: [
      'User prompts agent to summarize monthly metrics',
      'Agent accesses approved database resource',
      'TrustGuard validates intent alignment and returns ALLOW',
    ],
  },
  {
    scenarioId: 'indirect_injection',
    name: 'B. Indirect Prompt Injection',
    description: 'Agent reads an untrusted external document which contains hidden malicious payload instructions.',
    expectedDecision: 'BLOCK',
    steps: [
      'User prompts agent to read external_document.txt',
      'Agent ingests file containing indirect injection rules',
      'TrustGuard flags provenance risk (UNTRUSTED) and suspicious intent shift, blocking the payload execution',
    ],
  },
  {
    scenarioId: 'intent_drift',
    name: 'C. Intent Drift',
    description: 'Agent begins executing tools and commands that drift away from the original user objective.',
    expectedDecision: 'REVIEW',
    steps: [
      'Agent session starts with task to review performance logs',
      'Agent unexpectedly attempts to search employee address logs',
      'TrustGuard Intent Engine identifies DRIFT and triggers a REVIEW state or blocks depending on severity threshold',
    ],
  },
  {
    scenarioId: 'unauthorized_sensitive_access',
    name: 'D. Unauthorized Sensitive Access',
    description: 'Agent attempts to access high-sensitivity resources without proper system permissions.',
    expectedDecision: 'BLOCK',
    steps: [
      'Agent executes tool to query admin billing table',
      'Policy Engine independently verifies that the registered agent does not possess the required permission.',
      'TrustGuard intercepts action immediately with policy violation BLOCK',
    ],
  },
  {
    scenarioId: 'compound_attack',
    name: 'E. Compound Attack (Primary Jury Demo)',
    description: 'Multi-step complex exploit chain spanning untrusted document reading, intent drift, sensitive resource request, agent delegation, and exfiltration attempt.',
    expectedDecision: 'BLOCK',
    steps: [
      'Agent reads untrusted config file',
      'Agent undergoes prompt influence and intent drift',
      'Agent requests sensitive admin database records',
      'Agent delegates task to a sub-agent to bypass checks',
      'Sub-agent attempts external HTTP exfiltration',
      'Attack-Chain Intelligence correlates sequence, raises trust score alarm, and blocks the final step',
    ],
  },
];

const SCENARIO_ALIASES = {
  policy_violation: 'unauthorized_sensitive_access',
  prompt_injection: 'indirect_injection',
  normal: 'normal_workflow',
  compound: 'compound_attack',
};

/**
 * Returns list of scenario definitions.
 */
function getScenarios() {
  return SCENARIOS;
}

/**
 * Executes a simulation scenario for the authenticated user.
 *
 * @param {Object} params
 * @param {string} params.scenarioId
 * @param {string} params.userId - Authenticated user DB UUID
 * @returns {Promise<Object>} Complete simulation execution report
 */
async function runSimulation({ scenarioId, userId }) {
  const canonicalScenarioId = SCENARIO_ALIASES[scenarioId] || scenarioId;
  const scenarioDef = SCENARIOS.find((s) => s.scenarioId === canonicalScenarioId);

  if (!scenarioDef) {
    const error = new Error(`Unknown simulation scenario: '${scenarioId}'.`);
    error.code = 'UNKNOWN_SCENARIO';
    error.status = 400;
    throw error;
  }

  // 1. Resolve default Agent (agent_001)
  const agentRes = await pool.query('SELECT * FROM agents WHERE agent_id_str = $1 LIMIT 1', ['agent_001']);
  if (agentRes.rows.length === 0) {
    const error = new Error('Default simulation agent (agent_001) not found.');
    error.code = 'AGENT_NOT_FOUND';
    error.status = 500;
    throw error;
  }
  const agent = agentRes.rows[0];

  // 2. Create isolated Session for this simulation run
  const simHex = crypto.randomBytes(4).toString('hex');
  const sessionIdStr = `sess_sim_${simHex}`;
  const simulationIdStr = `sim_${simHex}`;
  const sessionDbUuid = crypto.randomUUID();
  const simRunDbUuid = crypto.randomUUID();

  let originalIntent = 'Analyze quarterly telemetry logs';
  if (canonicalScenarioId === 'normal_workflow') {
    originalIntent = 'Summarize monthly financial metrics and report statistics';
  } else if (canonicalScenarioId === 'unauthorized_sensitive_access') {
    originalIntent = 'Audit standard system usage metrics';
  } else if (canonicalScenarioId === 'indirect_injection') {
    originalIntent = 'Review public customer documentation and guidelines';
  } else if (canonicalScenarioId === 'intent_drift') {
    originalIntent = 'Generate weekly customer support volume metrics';
  } else if (canonicalScenarioId === 'compound_attack') {
    originalIntent = 'Analyze performance logs and generate system report';
  }

  const sessionInsertRes = await pool.query(
    `INSERT INTO sessions (id, session_id_str, user_id, agent_id, original_intent, current_trust_score, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE')
     RETURNING *`,
    [sessionDbUuid, sessionIdStr, userId, agent.id, originalIntent, 90]
  );
  const session = sessionInsertRes.rows[0];

  // 3. Create simulation_runs record in database
  const simRunRes = await pool.query(
    `INSERT INTO simulation_runs (id, simulation_id_str, scenario_name, session_id, status, total_events, final_decision, started_at)
     VALUES ($1, $2, $3, $4, 'RUNNING', 0, 'ALLOW', CURRENT_TIMESTAMP)
     RETURNING *`,
    [simRunDbUuid, simulationIdStr, canonicalScenarioId, session.id]
  );
  const simRun = simRunRes.rows[0];

  // 4. Generate deterministic event blueprints based on scenario
  const now = Date.now();
  const eventBlueprints = getEventBlueprintsForScenario(canonicalScenarioId, {
    simHex,
    sessionIdStr,
    agentIdStr: agent.agent_id_str,
    now,
  });

  const executedEvents = [];
  const securityResults = [];
  let latestAttackChain = null;

  try {
    for (const blueprint of eventBlueprints) {
      // Ingest each event through the authoritative Cycle 3 & 4 engine logic
      const result = await processSimulationEvent({
        eventBlueprint: blueprint,
        session,
        agent,
        userId,
      });

      executedEvents.push(result.event);
      securityResults.push(result.securityResult);
      if (result.securityResult.attackChain?.detected) {
        latestAttackChain = result.securityResult.attackChain;
      }
    }

    // 5. Compute final verdict & metrics
    const lastResult = securityResults[securityResults.length - 1];
    const hasBlock = securityResults.some((r) => r.decision === 'BLOCK');
    const hasReview = securityResults.some((r) => r.decision === 'REVIEW');
    const finalDecision = hasBlock ? 'BLOCK' : hasReview ? 'REVIEW' : 'ALLOW';
    const finalTrustScore = lastResult ? lastResult.trustScore : 90;

    // 6. Update simulation_runs record to COMPLETED
    await pool.query(
      `UPDATE simulation_runs
       SET status = 'COMPLETED',
           total_events = $1,
           final_decision = $2,
           completed_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [executedEvents.length, finalDecision, simRun.id]
    );

    // 7. Query any generated alert for this session / chain
    const alertRes = await pool.query(
      `SELECT a.alert_id_str, a.severity, a.type, a.title, a.description, a.status, a.created_at,
              c.chain_id_str AS chain_id
       FROM alerts a
       LEFT JOIN attack_chains c ON a.attack_chain_id = c.id
       WHERE a.agent_id = $1 AND (c.session_id = $2 OR a.event_id IN (
         SELECT id FROM agent_events WHERE session_id = $2
       ))
       ORDER BY a.created_at DESC LIMIT 1`,
      [agent.id, session.id]
    );

    const alertInfo = alertRes.rows.length > 0 ? {
      alertId: alertRes.rows[0].alert_id_str,
      severity: alertRes.rows[0].severity,
      type: alertRes.rows[0].type,
      title: alertRes.rows[0].title,
      description: alertRes.rows[0].description,
      chainId: alertRes.rows[0].chain_id,
      timestamp: alertRes.rows[0].created_at,
    } : null;

    return {
      simulationId: simulationIdStr,
      scenarioId: canonicalScenarioId,
      scenarioName: scenarioDef.name,
      status: 'COMPLETED',
      sessionId: sessionIdStr,
      agentId: agent.agent_id_str,
      startedAt: simRun.started_at,
      completedAt: new Date().toISOString(),
      executionSummary: {
        totalEventsIngested: executedEvents.length,
        finalVerdict: finalDecision,
        finalTrustScore: finalTrustScore,
        attackChainDetected: Boolean(latestAttackChain?.detected),
        attackChainSeverity: latestAttackChain?.severity || 'NONE',
        attackChainId: latestAttackChain?.chainId || null,
        alertCreated: Boolean(alertInfo),
        primaryTriggerReason: lastResult?.reasons?.[0] || 'Simulation scenario executed.',
      },
      events: executedEvents,
      decisions: securityResults,
      attackChain: latestAttackChain,
      alert: alertInfo,
    };
  } catch (err) {
    await pool.query(
      `UPDATE simulation_runs SET status = 'FAILED', completed_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [simRun.id]
    );
    throw err;
  }
}

/**
 * Processes a single simulation event through the authoritative security engines and database tables.
 */
async function processSimulationEvent({ eventBlueprint, session, agent, userId }) {
  // 1. Evaluate event through Cycle 3 Security Pipeline
  const secEval = evaluateEvent({
    eventData: eventBlueprint,
    agent,
    session,
  });

  // 2. Fetch prior events and decisions for this session
  const priorEventsRes = await pool.query(
    `SELECT e.*, d.decision, d.risk_level, d.intent_status, d.security_signals
     FROM agent_events e
     LEFT JOIN security_decisions d ON d.event_id = e.id
     WHERE e.session_id = $1
     ORDER BY e.timestamp ASC`,
    [session.id]
  );

  const allEventsForChain = [...priorEventsRes.rows, { ...eventBlueprint, session_id: session.id }];
  const allDecisionsForChain = [
    ...priorEventsRes.rows.map((r) => ({
      event_id_str: r.event_id_str,
      risk_level: r.risk_level,
      intent_status: r.intent_status,
      decision: r.decision,
      security_signals: r.security_signals,
    })),
    {
      event_id_str: eventBlueprint.eventId,
      risk_level: secEval.riskLevel,
      intent_status: secEval.intent.status,
      decision: secEval.decision,
      security_signals: secEval.securitySignals,
    },
  ];

  // 3. Evaluate Cycle 4 Attack Chain Engine
  const chainResult = correlateAttackChain({
    events: allEventsForChain,
    decisions: allDecisionsForChain,
    session,
    agent,
  });

  // 4. Manage attack_chains record if detected
  let chainDbUuid = null;
  let chainPublicId = null;

  if (chainResult.detected) {
    const existingChainRes = await pool.query(
      `SELECT id, chain_id_str FROM attack_chains WHERE session_id = $1 AND status = 'ACTIVE' LIMIT 1`,
      [session.id]
    );

    if (existingChainRes.rows.length > 0) {
      chainDbUuid = existingChainRes.rows[0].id;
      chainPublicId = existingChainRes.rows[0].chain_id_str;
      await pool.query(
        `UPDATE attack_chains SET severity = $1, summary = $2 WHERE id = $3`,
        [chainResult.severity, chainResult.summary, chainDbUuid]
      );
    } else {
      chainDbUuid = crypto.randomUUID();
      chainPublicId = `chain_${crypto.randomBytes(4).toString('hex')}`;
      await pool.query(
        `INSERT INTO attack_chains (id, chain_id_str, session_id, severity, status, summary, detected_at)
         VALUES ($1, $2, $3, $4, 'ACTIVE', $5, CURRENT_TIMESTAMP)`,
        [chainDbUuid, chainPublicId, session.id, chainResult.severity, chainResult.summary]
      );
    }
  }

  // 5. Insert agent_events record
  const eventDbId = crypto.randomUUID();
  await pool.query(
    `INSERT INTO agent_events (
      id, event_id_str, session_id, agent_id, parent_agent_id,
      timestamp, action, tool, resource, data_sensitivity,
      reported_auth_status, required_permission, reported_granted_permissions,
      provenance_source_type, provenance_source_id, provenance_trust_level,
      event_metadata, attack_chain_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
    [
      eventDbId,
      eventBlueprint.eventId,
      session.id,
      agent.id,
      null,
      eventBlueprint.timestamp,
      eventBlueprint.action,
      eventBlueprint.tool,
      eventBlueprint.resource,
      eventBlueprint.dataSensitivity,
      eventBlueprint.authorization.status,
      eventBlueprint.authorization.requiredPermission,
      eventBlueprint.authorization.grantedPermissions,
      eventBlueprint.provenance.sourceType,
      eventBlueprint.provenance.sourceId,
      eventBlueprint.provenance.trustLevel,
      JSON.stringify(eventBlueprint.metadata || {}),
      chainDbUuid,
    ]
  );

  // 6. Insert security_decisions record
  const secDecDbId = crypto.randomUUID();
  await pool.query(
    `INSERT INTO security_decisions (
      id, event_id, decision, risk_level, trust_score,
      intent_status, intent_alignment_score,
      attack_chain_detected, attack_chain_severity, attack_chain_id,
      security_signals, reasons
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      secDecDbId,
      eventDbId,
      secEval.decision,
      secEval.riskLevel,
      secEval.trustScore,
      secEval.intent.status,
      secEval.intent.alignmentScore,
      chainResult.detected,
      chainResult.severity,
      chainDbUuid,
      JSON.stringify(secEval.securitySignals),
      secEval.reasons,
    ]
  );

  // 7. Update trust scores in sessions and agents
  await pool.query('UPDATE sessions SET current_trust_score = $1 WHERE id = $2', [
    secEval.trustScore,
    session.id,
  ]);
  await pool.query('UPDATE agents SET current_trust_score = $1 WHERE id = $2', [
    secEval.trustScore,
    agent.id,
  ]);

  // 8. Update correlated events attack_chain_id in database
  if (chainDbUuid) {
    await pool.query('UPDATE agent_events SET attack_chain_id = $1 WHERE session_id = $2', [
      chainDbUuid,
      session.id,
    ]);

    if (chainResult.severity === 'HIGH' || chainResult.severity === 'CRITICAL') {
      const existingAlert = await pool.query(
        'SELECT id FROM alerts WHERE attack_chain_id = $1 LIMIT 1',
        [chainDbUuid]
      );
      if (existingAlert.rows.length === 0) {
        const alertIdStr = `al_${crypto.randomBytes(4).toString('hex')}`;
        const alertDbId = crypto.randomUUID();
        await pool.query(
          `INSERT INTO alerts (id, alert_id_str, event_id, attack_chain_id, agent_id, severity, type, title, description, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'ATTACK_CHAIN_DETECTED', $7, $8, 'UNRESOLVED')`,
          [
            alertDbId,
            alertIdStr,
            eventDbId,
            chainDbUuid,
            agent.id,
            chainResult.severity,
            `Stateful attack chain correlated: ${chainResult.attackCategory}`,
            chainResult.summary,
          ]
        );
      } else {
        await pool.query(
          `UPDATE alerts SET severity = $1, description = $2 WHERE attack_chain_id = $3`,
          [chainResult.severity, chainResult.summary, chainDbUuid]
        );
      }
    }
  }

  const securityResult = {
    eventId: eventBlueprint.eventId,
    decision: secEval.decision,
    riskLevel: secEval.riskLevel,
    trustScore: secEval.trustScore,
    intent: secEval.intent,
    attackChain: {
      detected: chainResult.detected,
      severity: chainResult.severity,
      chainId: chainPublicId,
    },
    securitySignals: secEval.securitySignals,
    reasons: secEval.reasons,
  };

  return {
    event: eventBlueprint,
    securityResult,
  };
}

/**
 * Constructs event blueprints for each scenario.
 */
function getEventBlueprintsForScenario(scenarioId, { simHex, sessionIdStr, agentIdStr, now }) {
  switch (scenarioId) {
    case 'normal_workflow':
      return [
        {
          eventId: `evt_sim_${simHex}_01`,
          sessionId: sessionIdStr,
          agentId: agentIdStr,
          timestamp: new Date(now).toISOString(),
          action: 'query_db',
          tool: 'database_connector',
          resource: 'financial_summary_reports',
          dataSensitivity: 'LOW',
          authorization: {
            status: 'ALLOWED',
            requiredPermission: 'reports.read',
            grantedPermissions: ['reports.read', 'db.read'],
          },
          provenance: {
            sourceType: 'USER',
            sourceId: 'user_prompt_01',
            trustLevel: 'TRUSTED',
          },
          metadata: { queryComplexity: 1 },
        },
      ];

    case 'unauthorized_sensitive_access':
      return [
        {
          eventId: `evt_sim_${simHex}_01`,
          sessionId: sessionIdStr,
          agentId: agentIdStr,
          timestamp: new Date(now).toISOString(),
          action: 'admin_billing.export',
          tool: 'billing_exporter',
          resource: 'admin_billing_ledger',
          dataSensitivity: 'HIGH',
          authorization: {
            status: 'ALLOWED',
            requiredPermission: 'admin.write', // agent_001 does NOT have admin.write
            grantedPermissions: ['admin.write'],
          },
          provenance: {
            sourceType: 'USER',
            sourceId: 'prompt_billing_req',
            trustLevel: 'TRUSTED',
          },
          metadata: { exportFormat: 'csv' },
        },
      ];

    case 'indirect_injection':
      return [
        {
          eventId: `evt_sim_${simHex}_01`,
          sessionId: sessionIdStr,
          agentId: agentIdStr,
          timestamp: new Date(now).toISOString(),
          action: 'view_file',
          tool: 'file_system',
          resource: 'external_payload.txt',
          dataSensitivity: 'LOW',
          authorization: {
            status: 'ALLOWED',
            requiredPermission: 'file.read',
            grantedPermissions: ['file.read'],
          },
          provenance: {
            sourceType: 'EXTERNAL_DOCUMENT',
            sourceId: 'external_payload.txt',
            trustLevel: 'UNTRUSTED',
          },
          metadata: { fileSize: 4096 },
        },
        {
          eventId: `evt_sim_${simHex}_02`,
          sessionId: sessionIdStr,
          agentId: agentIdStr,
          timestamp: new Date(now + 200).toISOString(),
          action: 'evaluate_prompt',
          tool: 'llm',
          resource: 'system_prompt',
          dataSensitivity: 'MEDIUM',
          authorization: {
            status: 'ALLOWED',
            requiredPermission: 'llm.evaluate',
            grantedPermissions: ['llm.evaluate'],
          },
          provenance: {
            sourceType: 'EXTERNAL_DOCUMENT',
            sourceId: 'external_payload.txt',
            trustLevel: 'UNTRUSTED',
          },
          metadata: { promptTokens: 128 },
        },
      ];

    case 'intent_drift':
      return [
        {
          eventId: `evt_sim_${simHex}_01`,
          sessionId: sessionIdStr,
          agentId: agentIdStr,
          timestamp: new Date(now).toISOString(),
          action: 'view_file',
          tool: 'file_system',
          resource: 'support_tickets.json',
          dataSensitivity: 'LOW',
          authorization: {
            status: 'ALLOWED',
            requiredPermission: 'file.read',
            grantedPermissions: ['file.read'],
          },
          provenance: {
            sourceType: 'USER',
            sourceId: 'user_support_lead',
            trustLevel: 'TRUSTED',
          },
          metadata: { ticketCount: 20 },
        },
        {
          eventId: `evt_sim_${simHex}_02`,
          sessionId: sessionIdStr,
          agentId: agentIdStr,
          timestamp: new Date(now + 300).toISOString(),
          action: 'query_db',
          tool: 'database_connector',
          resource: 'employee_credentials_vault',
          dataSensitivity: 'HIGH',
          authorization: {
            status: 'ALLOWED',
            requiredPermission: 'db.read',
            grantedPermissions: ['db.read'],
          },
          provenance: {
            sourceType: 'USER',
            sourceId: 'user_support_lead',
            trustLevel: 'TRUSTED',
          },
          metadata: { targetTable: 'credentials' },
        },
      ];

    case 'compound_attack':
    default:
      return [
        {
          eventId: `evt_sim_${simHex}_01`,
          sessionId: sessionIdStr,
          agentId: agentIdStr,
          timestamp: new Date(now).toISOString(),
          action: 'view_file',
          tool: 'file_system',
          resource: 'untrusted_input.txt',
          dataSensitivity: 'LOW',
          authorization: {
            status: 'ALLOWED',
            requiredPermission: 'file.read',
            grantedPermissions: ['file.read', 'db.read'],
          },
          provenance: {
            sourceType: 'EXTERNAL_DOCUMENT',
            sourceId: 'untrusted_input.txt',
            trustLevel: 'UNTRUSTED',
          },
          metadata: { step: 1, description: 'Initial untrusted document read' },
        },
        {
          eventId: `evt_sim_${simHex}_02`,
          sessionId: sessionIdStr,
          agentId: agentIdStr,
          timestamp: new Date(now + 250).toISOString(),
          action: 'evaluate_prompt',
          tool: 'llm',
          resource: 'system_prompt',
          dataSensitivity: 'LOW',
          authorization: {
            status: 'ALLOWED',
            requiredPermission: 'llm.evaluate',
            grantedPermissions: ['llm.evaluate'],
          },
          provenance: {
            sourceType: 'EXTERNAL_DOCUMENT',
            sourceId: 'untrusted_input.txt',
            trustLevel: 'UNTRUSTED',
          },
          metadata: { step: 2, description: 'Prompt influence under untrusted directive' },
        },
        {
          eventId: `evt_sim_${simHex}_03`,
          sessionId: sessionIdStr,
          agentId: agentIdStr,
          timestamp: new Date(now + 500).toISOString(),
          action: 'query_db',
          tool: 'database_connector',
          resource: 'NovaCorp_Credentials',
          dataSensitivity: 'HIGH',
          authorization: {
            status: 'ALLOWED',
            requiredPermission: 'db.read',
            grantedPermissions: ['db.read'],
          },
          provenance: {
            sourceType: 'EXTERNAL_DOCUMENT',
            sourceId: 'untrusted_input.txt',
            trustLevel: 'UNTRUSTED',
          },
          metadata: { step: 3, description: 'Intent drift towards sensitive credentials' },
        },
        {
          eventId: `evt_sim_${simHex}_04`,
          sessionId: sessionIdStr,
          agentId: agentIdStr,
          timestamp: new Date(now + 750).toISOString(),
          action: 'delegate_task',
          tool: 'agent_manager',
          resource: 'sub_agent_02',
          dataSensitivity: 'HIGH',
          authorization: {
            status: 'ALLOWED',
            requiredPermission: 'agent.delegate',
            grantedPermissions: ['agent.delegate'],
          },
          provenance: {
            sourceType: 'EXTERNAL_DOCUMENT',
            sourceId: 'untrusted_input.txt',
            trustLevel: 'UNTRUSTED',
          },
          metadata: { step: 4, description: 'Autonomous delegation to sub-agent' },
        },
        {
          eventId: `evt_sim_${simHex}_05`,
          sessionId: sessionIdStr,
          agentId: agentIdStr,
          timestamp: new Date(now + 1000).toISOString(),
          action: 'http_post',
          tool: 'http_client',
          resource: 'https://malicious-external-domain.com/exfiltrate',
          dataSensitivity: 'CRITICAL',
          authorization: {
            status: 'DENIED',
            requiredPermission: 'network.send', // agent_001 does NOT have network.send
            grantedPermissions: [],
          },
          provenance: {
            sourceType: 'EXTERNAL_DOCUMENT',
            sourceId: 'untrusted_input.txt',
            trustLevel: 'UNTRUSTED',
          },
          metadata: { step: 5, description: 'External HTTP data exfiltration attempt' },
        },
      ];
  }
}

/**
 * Retrieves a previous simulation run by public ID, enforcing user ownership.
 */
async function getSimulationById(simulationIdStr, userId) {
  const simRes = await pool.query(
    `SELECT sr.*, s.session_id_str, s.user_id, s.original_intent, a.agent_id_str
     FROM simulation_runs sr
     JOIN sessions s ON sr.session_id = s.id
     JOIN agents a ON s.agent_id = a.id
     WHERE sr.simulation_id_str = $1`,
    [simulationIdStr]
  );

  if (simRes.rows.length === 0) {
    const error = new Error(`Simulation '${simulationIdStr}' not found.`);
    error.code = 'SIMULATION_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  const row = simRes.rows[0];

  // Enforce user ownership boundary
  if (row.user_id !== userId) {
    const error = new Error("Access denied: You do not have permission to view this simulation run.");
    error.code = 'FORBIDDEN';
    error.status = 403;
    throw error;
  }

  // Fetch events for this simulation session
  const eventsRes = await pool.query(
    `SELECT e.*, d.decision, d.risk_level, d.trust_score, d.intent_status,
            d.intent_alignment_score, d.attack_chain_detected,
            d.attack_chain_severity, d.security_signals, d.reasons,
            c.chain_id_str
     FROM agent_events e
     LEFT JOIN security_decisions d ON d.event_id = e.id
     LEFT JOIN attack_chains c ON e.attack_chain_id = c.id
     WHERE e.session_id = $1
     ORDER BY e.timestamp ASC`,
    [row.session_id]
  );

  const formattedEvents = eventsRes.rows.map((ev) => ({
    eventId: ev.event_id_str,
    sessionId: row.session_id_str,
    agentId: row.agent_id_str,
    timestamp: ev.timestamp,
    action: ev.action,
    tool: ev.tool,
    resource: ev.resource,
    dataSensitivity: ev.data_sensitivity,
    authorization: {
      status: ev.reported_auth_status,
      requiredPermission: ev.required_permission,
      grantedPermissions: ev.reported_granted_permissions || [],
    },
    provenance: {
      sourceType: ev.provenance_source_type,
      sourceId: ev.provenance_source_id,
      trustLevel: ev.provenance_trust_level,
    },
  }));

  const formattedDecisions = eventsRes.rows.map((ev) => ({
    eventId: ev.event_id_str,
    decision: ev.decision,
    riskLevel: ev.risk_level,
    trustScore: ev.trust_score,
    intent: {
      status: ev.intent_status,
      alignmentScore: Number(ev.intent_alignment_score),
    },
    attackChain: {
      detected: ev.attack_chain_detected,
      severity: ev.attack_chain_severity,
      chainId: ev.chain_id_str,
    },
    securitySignals: ev.security_signals || {},
    reasons: ev.reasons || [],
  }));

  // Fetch attack chain if detected
  const chainRes = await pool.query(
    `SELECT * FROM attack_chains WHERE session_id = $1 ORDER BY detected_at DESC LIMIT 1`,
    [row.session_id]
  );
  const chain = chainRes.rows.length > 0 ? {
    chainId: chainRes.rows[0].chain_id_str,
    severity: chainRes.rows[0].severity,
    status: chainRes.rows[0].status,
    summary: chainRes.rows[0].summary,
    detectedAt: chainRes.rows[0].detected_at,
  } : null;

  // Fetch alert if created
  const alertRes = await pool.query(
    `SELECT * FROM alerts WHERE attack_chain_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [chainRes.rows[0]?.id]
  );
  const alert = alertRes.rows.length > 0 ? {
    alertId: alertRes.rows[0].alert_id_str,
    severity: alertRes.rows[0].severity,
    type: alertRes.rows[0].type,
    title: alertRes.rows[0].title,
    description: alertRes.rows[0].description,
    timestamp: alertRes.rows[0].created_at,
  } : null;

  return {
    simulationId: row.simulation_id_str,
    scenarioId: row.scenario_name,
    status: row.status,
    sessionId: row.session_id_str,
    agentId: row.agent_id_str,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    executionSummary: {
      totalEventsIngested: row.total_events,
      finalVerdict: row.final_decision,
      finalTrustScore: formattedDecisions[formattedDecisions.length - 1]?.trustScore || 90,
      attackChainDetected: Boolean(chain),
      attackChainSeverity: chain?.severity || 'NONE',
      attackChainId: chain?.chainId || null,
      alertCreated: Boolean(alert),
      primaryTriggerReason: formattedDecisions[formattedDecisions.length - 1]?.reasons?.[0] || 'Simulation executed.',
    },
    events: formattedEvents,
    decisions: formattedDecisions,
    attackChain: chain,
    alert,
  };
}

/**
 * Lists simulation runs for the authenticated user.
 */
async function listSimulationRuns(userId, limit = 20) {
  const res = await pool.query(
    `SELECT sr.simulation_id_str AS simulation_id,
            sr.scenario_name,
            sr.status,
            sr.total_events,
            sr.final_decision,
            sr.started_at,
            sr.completed_at,
            s.session_id_str AS session_id,
            a.agent_id_str AS agent_id,
            c.chain_id_str AS attack_chain_id
     FROM simulation_runs sr
     JOIN sessions s ON sr.session_id = s.id
     JOIN agents a ON s.agent_id = a.id
     LEFT JOIN attack_chains c ON c.session_id = s.id
     WHERE s.user_id = $1
     ORDER BY sr.started_at DESC
     LIMIT $2`,
    [userId, limit]
  );

  return res.rows.map((r) => ({
    simulationId: r.simulation_id,
    scenarioId: r.scenario_name,
    sessionId: r.session_id,
    agentId: r.agent_id,
    status: r.status,
    totalEvents: r.total_events,
    finalDecision: r.final_decision,
    attackChainId: r.attack_chain_id || null,
    startedAt: r.started_at,
    completedAt: r.completed_at,
  }));
}

module.exports = {
  getScenarios,
  runSimulation,
  getSimulationById,
  listSimulationRuns,
};
