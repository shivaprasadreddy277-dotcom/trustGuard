/**
 * TrustGuard — 3.4 Risk & Decision Engine
 *
 * Synthesizes outputs from Policy, Provenance, and Intent Integrity engines
 * along with data sensitivity ratings to determine the comprehensive risk level
 * and operational safety verdict.
 *
 * Verdict Options:
 *   - ALLOW   : Safe, authorized, and aligned action
 *   - REVIEW  : Moderate anomaly or unconfirmed permission; requires approval/inspection
 *   - BLOCK   : Clear security violation, prompt injection, or critical unauthorized access
 *
 * Risk Levels:
 *   - LOW, MEDIUM, HIGH, CRITICAL
 */
'use strict';

/**
 * Evaluate risk level, decision verdict, and explainable reasoning.
 *
 * @param {Object} params
 * @param {Object} params.policyResult     - Output from Policy Engine
 * @param {Object} params.provenanceResult - Output from Provenance Engine
 * @param {Object} params.intentResult     - Output from Intent Engine
 * @param {string} params.dataSensitivity  - LOW, MEDIUM, HIGH, CRITICAL
 * @param {number} [params.currentTrustScore] - Current agent/session trust score (0-100)
 * @returns {Object} Final Risk & Decision result
 */
function evaluateRiskAndDecision({
  policyResult,
  provenanceResult,
  intentResult,
  dataSensitivity = 'LOW',
  currentTrustScore = 100,
}) {
  const policyViolation = policyResult?.policyViolation === true;
  const intentDrift = intentResult?.status === 'DRIFT' || intentResult?.intentDrift === true;
  const untrustedProvenance = provenanceResult?.trustLevel === 'UNTRUSTED';
  const mediumProvenance = provenanceResult?.trustLevel === 'MEDIUM';
  const isCriticalData = dataSensitivity === 'CRITICAL';
  const isHighData = dataSensitivity === 'HIGH' || isCriticalData;

  const reasons = [];
  let riskLevel = 'LOW';
  let decision = 'ALLOW';

  // ── 1. Evaluate Risk Level ───────────────────────────────────────────────
  if (policyViolation && isHighData) {
    riskLevel = 'CRITICAL';
  } else if (isCriticalData && intentDrift && untrustedProvenance) {
    riskLevel = 'CRITICAL';
  } else if (policyViolation) {
    riskLevel = isCriticalData ? 'CRITICAL' : 'HIGH';
  } else if (intentDrift && (isHighData || untrustedProvenance)) {
    riskLevel = 'HIGH';
  } else if (untrustedProvenance && isHighData) {
    riskLevel = 'HIGH';
  } else if (intentDrift || mediumProvenance || dataSensitivity === 'MEDIUM' || untrustedProvenance) {
    riskLevel = 'MEDIUM';
  } else if (currentTrustScore < 50) {
    riskLevel = 'MEDIUM';
  } else {
    riskLevel = 'LOW';
  }

  // ── 2. Evaluate Decision Verdict ─────────────────────────────────────────
  if (riskLevel === 'CRITICAL') {
    decision = 'BLOCK';
  } else if (policyViolation && isHighData) {
    decision = 'BLOCK';
  } else if (intentDrift && untrustedProvenance && isHighData) {
    decision = 'BLOCK';
  } else if (riskLevel === 'HIGH') {
    // High risk with unauthorized action or severe drift is blocked
    if (policyViolation || untrustedProvenance) {
      decision = 'BLOCK';
    } else {
      decision = 'REVIEW';
    }
  } else if (riskLevel === 'MEDIUM' || intentDrift || currentTrustScore < 60) {
    decision = 'REVIEW';
  } else {
    decision = 'ALLOW';
  }

  // ── 3. Compile Explainable Reasons ───────────────────────────────────────
  if (policyViolation) {
    reasons.push(policyResult.reason);
  }

  if (intentDrift) {
    reasons.push(`Intent status changed to DRIFT (${intentResult.alignmentScore} alignment score).`);
  }

  if (untrustedProvenance) {
    reasons.push(`Provenance trust level is UNTRUSTED from source '${provenanceResult.sourceType}' (${provenanceResult.sourceId}).`);
  } else if (mediumProvenance) {
    reasons.push(`Provenance source '${provenanceResult.sourceType}' has MEDIUM trust verification.`);
  }

  if (isHighData) {
    reasons.push(`Data sensitivity ${dataSensitivity} combined with action requires elevated scrutiny.`);
  }

  if (currentTrustScore < 50) {
    reasons.push(`Agent session trust score is degraded (${currentTrustScore}/100).`);
  }

  if (reasons.length === 0) {
    reasons.push('Action verified against registered permissions and session intent.');
  }

  return {
    riskLevel,
    decision,
    reasons,
    securitySignals: {
      policyViolation,
      intentDrift,
      provenanceRisk: provenanceResult?.provenanceRisk || 'LOW',
      dataSensitivity,
      attackChainRisk: 'NONE', // Cycle 4 will populate stateful attack chain indicators
    },
  };
}

module.exports = { evaluateRiskAndDecision };
