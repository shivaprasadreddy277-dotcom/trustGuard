/**
 * TrustGuard — 3.3 Intent Integrity Engine
 *
 * Compares an agent's runtime actions against the authoritative session baseline
 * (sessions.original_intent) to detect goal hijacking, prompt injection drift,
 * and unauthorized secondary task executions.
 *
 * Security Rules:
 *  - Authoritative baseline is sessions.original_intent (never modified).
 *  - Evaluates action, tool, resource, and data context deterministically.
 *  - alignmentScore is strictly bounded between 0.00 and 1.00.
 *  - Outputs: status ('ALIGNED' | 'DRIFT' | 'UNKNOWN'), alignmentScore, intentDrift, reason.
 */
'use strict';

// Suspicious patterns indicating probable goal hijacking or exfiltration
const EXFILTRATION_ACTIONS = ['http_post', 'network.send', 'exfiltrate', 'webhook', 'send_email', 'upload'];
const CREDENTIAL_RESOURCES = ['credential', 'password', 'secret', 'master_key', 'private_key', 'shadow', 'api_token', 'token'];
const DESTRUCTIVE_ACTIONS = ['drop_table', 'delete', 'truncate', 'format', 'rmdir', 'chmod_777'];

/**
 * Tokenize and normalize text for keyword matching.
 */
function extractKeywords(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9_\-\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

/**
 * Evaluate intent alignment between session original intent and observed agent event.
 *
 * @param {Object} params
 * @param {string} params.originalIntent - Authoritative session objective baseline
 * @param {string} params.action         - Observed action/command name
 * @param {string} params.tool           - Observed tool name
 * @param {string} params.resource       - Target file/table/endpoint
 * @param {string} [params.dataSensitivity] - Sensitivity rating
 * @returns {Object} Intent alignment evaluation result
 */
function evaluateIntent({
  originalIntent = '',
  action = '',
  tool = '',
  resource = '',
  dataSensitivity = 'LOW',
}) {
  const normIntent = String(originalIntent).toLowerCase();
  const normAction = String(action).toLowerCase();
  const normTool = String(tool).toLowerCase();
  const normResource = String(resource).toLowerCase();

  // If no original intent is recorded, mark as UNKNOWN
  if (!normIntent.trim()) {
    return {
      status: 'UNKNOWN',
      alignmentScore: 0.5,
      intentDrift: false,
      reason: 'No authoritative session intent baseline provided for evaluation.',
    };
  }

  const intentKeywords = extractKeywords(normIntent);
  let score = 0.85; // Baseline expected alignment
  const reasons = [];

  // Check 1: Outbound network / exfiltration actions
  const isExfilAction = EXFILTRATION_ACTIONS.some(
    (act) => normAction.includes(act) || normTool.includes(act)
  );
  const intentAllowsNetwork = intentKeywords.some((w) =>
    ['send', 'post', 'upload', 'notify', 'publish', 'email', 'webhook'].includes(w)
  );

  if (isExfilAction && !intentAllowsNetwork) {
    score -= 0.65;
    reasons.push(`Outbound exfiltration action '${action}' not authorized in original intent.`);
  }

  // Check 2: Accessing credentials / secrets
  const isCredentialAccess = CREDENTIAL_RESOURCES.some((cred) =>
    normResource.includes(cred)
  );
  const intentMentionsCredentials = intentKeywords.some((w) =>
    ['credential', 'password', 'secret', 'auth', 'login'].includes(w)
  );

  if (isCredentialAccess && !intentMentionsCredentials) {
    score -= 0.55;
    reasons.push(`Access to credential/secret resource '${resource}' diverges from declared intent.`);
  }

  // Check 3: Destructive actions
  const isDestructive = DESTRUCTIVE_ACTIONS.some((d) =>
    normAction.includes(d) || normResource.includes(d)
  );
  const intentAllowsDestruction = intentKeywords.some((w) =>
    ['delete', 'remove', 'cleanup', 'purge'].includes(w)
  );

  if (isDestructive && !intentAllowsDestruction) {
    score -= 0.7;
    reasons.push(`Destructive operation '${action}' on '${resource}' is not aligned with original intent.`);
  }

  // Check 4: Context keyword affinity bonus
  const resourceWords = extractKeywords(normResource);
  const toolWords = extractKeywords(normTool);
  const actionWords = extractKeywords(normAction);
  const observedWords = [...resourceWords, ...toolWords, ...actionWords];

  const matchedKeywords = observedWords.filter((w) => intentKeywords.includes(w));
  if (matchedKeywords.length > 0 && score >= 0.5) {
    score = Math.min(1.0, score + 0.1);
  }

  // Check 5: Critical sensitivity penalty if no keyword overlap exists
  if (dataSensitivity === 'CRITICAL' && matchedKeywords.length === 0 && !isCredentialAccess) {
    score -= 0.2;
    reasons.push(`CRITICAL sensitivity resource '${resource}' accessed without direct keyword match in intent.`);
  }

  // Clamp alignment score to [0.00, 1.00]
  const finalScore = Math.max(0.0, Math.min(1.0, parseFloat(score.toFixed(2))));
  const isDrift = finalScore < 0.5;

  let finalReason;
  if (isDrift) {
    finalReason = reasons.length > 0
      ? `Intent Drift: ${reasons.join(' ')}`
      : `Intent Drift: Action '${action}' on '${resource}' shows low alignment (${finalScore}) with declared intent.`;
  } else {
    finalReason = `Intent Aligned: Action '${action}' on '${resource}' aligns with session intent (${finalScore} confidence).`;
  }

  return {
    status: isDrift ? 'DRIFT' : 'ALIGNED',
    alignmentScore: finalScore,
    intentDrift: isDrift,
    reason: finalReason,
  };
}

module.exports = { evaluateIntent };
