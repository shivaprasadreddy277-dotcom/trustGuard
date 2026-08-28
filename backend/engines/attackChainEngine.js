/**
 * TrustGuard — Cycle 4 Attack Chain Intelligence Engine
 *
 * Correlates multiple security events within a session/agent context into a
 * coherent, explainable multi-stage attack narrative.
 *
 * Core Principles:
 *  - Deterministic & rule-based; NO external LLM, NO random numbers.
 *  - Requires meaningful correlation across multiple distinct stages/signals.
 *  - Normal safe events do NOT trigger false-positive attack chains.
 *  - Calculates bounded confidence (0.00 - 1.00) and severity (LOW, MEDIUM, HIGH, CRITICAL).
 *  - Produces explainable forensic reasoning derived strictly from evidence.
 */
'use strict';

/** Stage definitions for multi-stage attack correlation */
const ATTACK_STAGES = {
  STAGE_1_UNTRUSTED_INPUT: 'untrusted_input',
  STAGE_2_PROMPT_INFLUENCE: 'prompt_influence',
  STAGE_3_INTENT_DRIFT: 'intent_drift',
  STAGE_4_AGENT_DELEGATION: 'agent_delegation',
  STAGE_5_DATA_EXFILTRATION: 'data_exfiltration',
};

/**
 * Classify an individual event into an attack stage if matching suspicious patterns.
 *
 * @param {Object} event - Agent event object with authorization and provenance
 * @param {Object} decision - Security decision object or signals
 * @returns {string|null} Stage name or null if benign
 */
function classifyEventStage(event, decision = {}) {
  const action = (event.action || '').toLowerCase();
  const tool = (event.tool || '').toLowerCase();
  const resource = (event.resource || '').toLowerCase();
  const provTrust = event.provenance_trust_level || event.provenance?.trustLevel || 'TRUSTED';
  const provSource = event.provenance_source_type || event.provenance?.sourceType || 'USER';
  const sensitivity = event.data_sensitivity || event.dataSensitivity || 'LOW';
  const intentStatus = decision.intent_status || decision.intent?.status || 'ALIGNED';
  const policyViolation = decision.security_signals?.policyViolation || decision.securitySignals?.policyViolation || false;

  // Stage 5: External Data Transmission / Exfiltration
  if (
    action.includes('exfiltrate') ||
    action.includes('http_post') ||
    action.includes('send') ||
    tool.includes('http') ||
    tool.includes('network') ||
    resource.includes('http://') ||
    resource.includes('https://') ||
    resource.includes('exfiltrate')
  ) {
    return ATTACK_STAGES.STAGE_5_DATA_EXFILTRATION;
  }

  // Stage 4: Agent Delegation / Lateral Movement
  if (
    action.includes('delegate') ||
    tool.includes('agent_manager') ||
    tool.includes('sub_agent') ||
    resource.includes('sub_agent') ||
    provSource === 'ANOTHER_AGENT'
  ) {
    return ATTACK_STAGES.STAGE_4_AGENT_DELEGATION;
  }

  // Stage 3: Sensitive Resource Access / Intent Drift
  if (
    intentStatus === 'DRIFT' ||
    resource.includes('credential') ||
    resource.includes('secret') ||
    resource.includes('password') ||
    resource.includes('shadow') ||
    (action.includes('query_db') && (sensitivity === 'HIGH' || sensitivity === 'CRITICAL'))
  ) {
    return ATTACK_STAGES.STAGE_3_INTENT_DRIFT;
  }

  // Stage 2: Prompt Injection / Malicious Instruction Influence
  if (
    (action.includes('prompt') || tool.includes('llm') || resource.includes('prompt')) &&
    (provTrust === 'UNTRUSTED' || provTrust === 'MEDIUM' || provSource === 'EXTERNAL_DOCUMENT')
  ) {
    return ATTACK_STAGES.STAGE_2_PROMPT_INFLUENCE;
  }

  // Stage 1: Initial Untrusted External Input
  if (
    provTrust === 'UNTRUSTED' ||
    provSource === 'EXTERNAL_DOCUMENT' ||
    resource.includes('untrusted') ||
    resource.includes('payload') ||
    action.includes('view_file') ||
    action.includes('read_file')
  ) {
    return ATTACK_STAGES.STAGE_1_UNTRUSTED_INPUT;
  }

  return null;
}

/**
 * Correlate a sequence of session events into an Attack Chain evaluation.
 *
 * @param {Object} params
 * @param {Array<Object>} params.events - Chronological list of events in the session (including current)
 * @param {Array<Object>} params.decisions - Map or list of security decisions corresponding to events
 * @param {Object} params.session - Session details (sessionId, originalIntent)
 * @param {Object} params.agent - Primary agent details (agentId, permissions)
 * @returns {Object} Correlation result
 */
function correlateAttackChain({ events = [], decisions = [], session = {}, agent = {} }) {
  if (!events || events.length < 2) {
    return {
      detected: false,
      severity: 'NONE',
      confidence: 0.0,
      attackCategory: 'NONE',
      correlatedEventIds: [],
      stagesDetected: [],
      summary: 'Insufficient events to evaluate multi-stage correlation (minimum 2 events required).',
      reasons: ['Single event evaluated in isolation; multi-stage correlation requires temporal event sequence.'],
    };
  }

  // Build decision lookup by eventId / event UUID
  const decisionMap = new Map();
  for (const dec of decisions) {
    const key = dec.event_id || dec.eventId || dec.event_id_str;
    if (key) decisionMap.set(key, dec);
  }

  // Analyze each event for attack stage involvement and security anomalies
  const stageMatches = [];
  const detectedStages = new Set();
  const reasons = [];
  let highestRisk = 'LOW';
  let totalPolicyViolations = 0;
  let totalIntentDrifts = 0;
  let hasUntrustedProvenance = false;
  let hasExfiltrationAttempt = false;

  const riskOrder = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };

  for (const evt of events) {
    const evtId = evt.event_id_str || evt.eventId || evt.id;
    const dec = decisionMap.get(evtId) || decisionMap.get(evt.id) || {};
    const stage = classifyEventStage(evt, dec);

    const eventRisk = dec.risk_level || dec.riskLevel || (evt.data_sensitivity === 'CRITICAL' ? 'CRITICAL' : 'LOW');
    if (riskOrder[eventRisk] > riskOrder[highestRisk]) {
      highestRisk = eventRisk;
    }

    const isViolation = dec.security_signals?.policyViolation || dec.securitySignals?.policyViolation || false;
    if (isViolation) totalPolicyViolations++;

    const isDrift = (dec.intent_status || dec.intent?.status) === 'DRIFT';
    if (isDrift) totalIntentDrifts++;

    const trustLevel = evt.provenance_trust_level || evt.provenance?.trustLevel;
    if (trustLevel === 'UNTRUSTED') hasUntrustedProvenance = true;

    if (stage) {
      detectedStages.add(stage);
      stageMatches.push({
        eventId: evtId,
        timestamp: evt.timestamp,
        tool: evt.tool,
        action: evt.action,
        resource: evt.resource,
        stage,
        riskLevel: eventRisk,
      });

      if (stage === ATTACK_STAGES.STAGE_5_DATA_EXFILTRATION) {
        hasExfiltrationAttempt = true;
      }
    }
  }

  const distinctStageCount = detectedStages.size;

  // ── False Positive Guardrail ───────────────────────────────────────────────
  // A single benign or slightly unusual event must NOT trigger an attack chain.
  // We require at least 2 correlated distinct attack stages, OR
  // 1 high-risk stage (exfiltration or policy violation on critical data) + untrusted provenance.
  const isChainDetected =
    distinctStageCount >= 2 ||
    (hasExfiltrationAttempt && hasUntrustedProvenance) ||
    (distinctStageCount >= 1 && totalPolicyViolations > 0 && totalIntentDrifts > 0);

  if (!isChainDetected) {
    return {
      detected: false,
      severity: 'NONE',
      confidence: 0.0,
      attackCategory: 'NONE',
      correlatedEventIds: [],
      stagesDetected: Array.from(detectedStages),
      summary: 'Events evaluated are within normal operational baseline. No multi-stage attack pattern correlated.',
      reasons: ['No multi-stage attack trajectory or sustained security anomaly identified.'],
    };
  }

  // ── Correlation Reasons Generation ─────────────────────────────────────────
  const sessionIdStr = session.session_id_str || session.sessionId || 'session';
  const agentIdStr = agent.agent_id_str || agent.agentId || 'agent';

  reasons.push(`Correlated ${stageMatches.length} events across ${distinctStageCount} stages within session ${sessionIdStr} for agent ${agentIdStr}.`);

  if (detectedStages.has(ATTACK_STAGES.STAGE_1_UNTRUSTED_INPUT)) {
    reasons.push('Stage 1: Initial untrusted external document or directive ingested into execution context.');
  }
  if (detectedStages.has(ATTACK_STAGES.STAGE_2_PROMPT_INFLUENCE)) {
    reasons.push('Stage 2: LLM prompt evaluation influenced by untrusted external instructions.');
  }
  if (detectedStages.has(ATTACK_STAGES.STAGE_3_INTENT_DRIFT)) {
    reasons.push('Stage 3: Intent drift confirmed while attempting access to sensitive resources/credentials.');
  }
  if (detectedStages.has(ATTACK_STAGES.STAGE_4_AGENT_DELEGATION)) {
    reasons.push('Stage 4: Autonomous task delegation executed to sub-agent to circumvent security constraints.');
  }
  if (detectedStages.has(ATTACK_STAGES.STAGE_5_DATA_EXFILTRATION)) {
    reasons.push('Stage 5: External data transmission / exfiltration attempt directed to unauthorized endpoint.');
  }

  if (totalPolicyViolations > 0) {
    reasons.push(`Encountered ${totalPolicyViolations} authoritative policy violation(s) during execution.`);
  }

  // ── Severity Calculation ───────────────────────────────────────────────────
  let severity = 'LOW';
  if (distinctStageCount >= 4 || hasExfiltrationAttempt || highestRisk === 'CRITICAL') {
    severity = 'CRITICAL';
  } else if (distinctStageCount >= 3 || totalPolicyViolations > 0 || highestRisk === 'HIGH') {
    severity = 'HIGH';
  } else if (distinctStageCount >= 2 || totalIntentDrifts > 0) {
    severity = 'MEDIUM';
  }

  // ── Confidence Calculation (Deterministic & Bounded 0.00 - 1.00) ───────────
  let confidence = 0.40;
  confidence += distinctStageCount * 0.12; // up to +0.60
  if (totalPolicyViolations > 0) confidence += 0.10;
  if (totalIntentDrifts > 0) confidence += 0.10;
  if (hasUntrustedProvenance) confidence += 0.08;
  if (hasExfiltrationAttempt) confidence += 0.10;

  confidence = Math.min(0.99, Math.max(0.45, Math.round(confidence * 100) / 100));

  // ── Attack Category Classification ─────────────────────────────────────────
  let attackCategory = 'compound_attack';
  if (distinctStageCount >= 4) {
    attackCategory = 'compound_attack';
  } else if (hasExfiltrationAttempt) {
    attackCategory = 'data_exfiltration';
  } else if (detectedStages.has(ATTACK_STAGES.STAGE_2_PROMPT_INFLUENCE)) {
    attackCategory = 'indirect_prompt_injection';
  } else if (totalPolicyViolations > 0) {
    attackCategory = 'privilege_escalation';
  }

  const stageNarrative = Array.from(detectedStages).join(' -> ');
  const summary = `Stateful attack chain correlated (${attackCategory}): ${stageNarrative}`;

  return {
    detected: true,
    severity,
    confidence,
    attackCategory,
    correlatedEventIds: stageMatches.map((m) => m.eventId),
    stagesDetected: Array.from(detectedStages),
    summary,
    reasons,
    stageMatches,
  };
}

module.exports = {
  ATTACK_STAGES,
  classifyEventStage,
  correlateAttackChain,
};
