/**
 * TrustGuard — 3.5 Dynamic Trust Engine
 *
 * Computes deterministic trust score adjustments based on runtime agent behavior,
 * policy compliance, intent alignment, and safety verdicts.
 *
 * Security Rules:
 *  - Trust score is strictly bounded between 0 and 100.
 *  - Server-side controlled only (client cannot set or override).
 *  - Safe actions maintain or slightly restore reputation.
 *  - Suspicious behavior and violations degrade trust proportionally.
 */
'use strict';

/**
 * Calculate the updated trust score for an agent session.
 *
 * @param {Object} params
 * @param {number} params.currentTrustScore - Starting trust score (0-100)
 * @param {string} params.decision          - ALLOW, REVIEW, BLOCK
 * @param {string} params.riskLevel         - LOW, MEDIUM, HIGH, CRITICAL
 * @param {boolean} [params.policyViolation] - Whether a policy violation occurred
 * @param {boolean} [params.intentDrift]    - Whether intent drift was detected
 * @returns {number} Updated trust score (0-100)
 */
function calculateTrustScore({
  currentTrustScore = 100,
  decision = 'ALLOW',
  riskLevel = 'LOW',
  policyViolation = false,
  intentDrift = false,
}) {
  let score = Number.isFinite(currentTrustScore) ? currentTrustScore : 100;

  switch (decision) {
    case 'BLOCK':
      if (riskLevel === 'CRITICAL') {
        score -= 40;
      } else if (policyViolation) {
        score -= 30;
      } else {
        score -= 25;
      }
      break;

    case 'REVIEW':
      if (riskLevel === 'HIGH') {
        score -= 20;
      } else if (intentDrift) {
        score -= 15;
      } else {
        score -= 10;
      }
      break;

    case 'ALLOW':
    default:
      if (!policyViolation && !intentDrift && riskLevel === 'LOW') {
        // Safe operational step: small trust maintenance / recovery
        score = Math.min(100, score + 1);
      }
      break;
  }

  // Strict clamp to [0, 100]
  return Math.max(0, Math.min(100, Math.round(score)));
}

module.exports = { calculateTrustScore };
