/**
 * TrustGuard — 3.2 Provenance Engine
 *
 * Evaluates the origin and chain of custody of directives and inputs.
 * Helps identify indirect prompt injection and untrusted instruction sources.
 *
 * Supported trust levels:
 *   - TRUSTED   -> LOW provenance risk
 *   - MEDIUM    -> MEDIUM provenance risk
 *   - UNTRUSTED -> HIGH provenance risk
 */
'use strict';

/**
 * Evaluate provenance risk for an agent event.
 *
 * @param {Object} provenance
 * @param {string} provenance.sourceType - USER, SYSTEM_POLICY, APPROVED_KNOWLEDGE, INTERNAL_DOCUMENT, EXTERNAL_DOCUMENT, ANOTHER_AGENT
 * @param {string} provenance.sourceId   - Identifier of the source document/user
 * @param {string} provenance.trustLevel - TRUSTED, MEDIUM, UNTRUSTED
 * @returns {Object} Provenance evaluation result
 */
function evaluateProvenance(provenance = {}) {
  const sourceType = provenance.sourceType || 'UNKNOWN';
  const sourceId = provenance.sourceId || 'unknown';
  const trustLevel = provenance.trustLevel || 'UNTRUSTED';

  let provenanceRisk = 'LOW';
  let reason = '';

  switch (trustLevel) {
    case 'UNTRUSTED':
      provenanceRisk = 'HIGH';
      if (sourceType === 'EXTERNAL_DOCUMENT') {
        reason = `High provenance risk: Directive originated from UNTRUSTED external document '${sourceId}' (potential prompt injection vector).`;
      } else if (sourceType === 'ANOTHER_AGENT') {
        reason = `High provenance risk: Directive cascaded from UNTRUSTED sub-agent '${sourceId}'.`;
      } else {
        reason = `High provenance risk: Directive originated from UNTRUSTED source '${sourceType}' (${sourceId}).`;
      }
      break;

    case 'MEDIUM':
      provenanceRisk = 'MEDIUM';
      reason = `Moderate provenance risk: Directive originated from source '${sourceType}' (${sourceId}) with MEDIUM trust verification.`;
      break;

    case 'TRUSTED':
    default:
      provenanceRisk = 'LOW';
      reason = `Low provenance risk: Directive verified from TRUSTED source '${sourceType}' (${sourceId}).`;
      break;
  }

  return {
    provenanceRisk,
    trustLevel,
    sourceType,
    sourceId,
    reason,
  };
}

module.exports = { evaluateProvenance };
