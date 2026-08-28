/**
 * TrustGuard — Cycle 3 Security Intelligence Pipeline
 *
 * Orchestrates the full evaluation flow:
 *   Agent Event -> Policy Engine
 *               -> Provenance Engine
 *               -> Intent Integrity Engine
 *               -> Risk & Decision Engine
 *               -> Dynamic Trust Engine
 *               -> Security Result
 */
'use strict';

const { evaluatePolicy } = require('./policyEngine');
const { evaluateProvenance } = require('./provenanceEngine');
const { evaluateIntent } = require('./intentEngine');
const { evaluateRiskAndDecision } = require('./riskDecisionEngine');
const { calculateTrustScore } = require('./trustEngine');

/**
 * Execute the full Security Intelligence evaluation for an incoming agent event.
 *
 * @param {Object} params
 * @param {Object} params.eventData       - Raw event payload (eventId, action, tool, resource, dataSensitivity, authorization, provenance)
 * @param {Object} params.agent           - Authoritative agent record from DB (permissions, current_trust_score)
 * @param {Object} params.session         - Authoritative session record from DB (original_intent, current_trust_score)
 * @returns {Object} Complete Security Result object matching docs/API_CONTRACT.md
 */
function evaluateEvent({ eventData, agent, session }) {
  // ── 3.1 Policy Evaluation ────────────────────────────────────────────────
  const policyResult = evaluatePolicy({
    registeredPermissions: agent?.permissions || [],
    requiredPermission: eventData?.authorization?.requiredPermission || null,
    reportedAuthStatus: eventData?.authorization?.status || null,
    reportedPermissions: eventData?.authorization?.grantedPermissions || [],
  });

  // ── 3.2 Provenance Evaluation ────────────────────────────────────────────
  const provenanceResult = evaluateProvenance(eventData?.provenance || {});

  // ── 3.3 Intent Integrity Evaluation ──────────────────────────────────────
  const intentResult = evaluateIntent({
    originalIntent: session?.original_intent || '',
    action: eventData?.action || '',
    tool: eventData?.tool || '',
    resource: eventData?.resource || '',
    dataSensitivity: eventData?.dataSensitivity || 'LOW',
  });

  // ── 3.4 Risk & Decision Evaluation ───────────────────────────────────────
  const startingTrust = session?.current_trust_score ?? agent?.current_trust_score ?? 100;

  const decisionResult = evaluateRiskAndDecision({
    policyResult,
    provenanceResult,
    intentResult,
    dataSensitivity: eventData?.dataSensitivity || 'LOW',
    currentTrustScore: startingTrust,
  });

  // ── 3.5 Dynamic Trust Evaluation ─────────────────────────────────────────
  const updatedTrustScore = calculateTrustScore({
    currentTrustScore: startingTrust,
    decision: decisionResult.decision,
    riskLevel: decisionResult.riskLevel,
    policyViolation: decisionResult.securitySignals.policyViolation,
    intentDrift: decisionResult.securitySignals.intentDrift,
  });

  // ── Assemble Final Contract-Compliant Security Result ───────────────────
  return {
    eventId: eventData.eventId,
    decision: decisionResult.decision,
    riskLevel: decisionResult.riskLevel,
    trustScore: updatedTrustScore,
    intent: {
      status: intentResult.status,
      alignmentScore: intentResult.alignmentScore,
    },
    attackChain: {
      detected: false,
      severity: 'NONE',
      chainId: null,
    },
    securitySignals: decisionResult.securitySignals,
    reasons: decisionResult.reasons,
    // Internal metadata for database persistence
    _internal: {
      policyResult,
      provenanceResult,
      intentResult,
    },
  };
}

module.exports = { evaluateEvent };
