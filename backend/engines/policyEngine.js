/**
 * TrustGuard — 3.1 Policy Engine
 *
 * Evaluates whether an agent action is authorized according to the agent's
 * AUTHORITATIVE REGISTERED PERMISSIONS in the database (agents.permissions).
 *
 * Security Rules:
 *  - Authoritative source is agents.permissions (TEXT[]).
 *  - NEVER trusts event.reported_granted_permissions.
 *  - NEVER trusts event.reported_auth_status.
 *  - Evaluation is strictly read-only and deterministic.
 */
'use strict';

/**
 * Evaluate policy for an agent event.
 *
 * @param {Object} params
 * @param {string[]} params.registeredPermissions - Authoritative permissions from agents table
 * @param {string|null} params.requiredPermission - Permission token required by the action/tool
 * @param {string} [params.reportedAuthStatus]     - Claimed auth status from event (evidence only)
 * @param {string[]} [params.reportedPermissions] - Claimed granted permissions from event (evidence only)
 * @returns {Object} Policy evaluation result
 */
function evaluatePolicy({
  registeredPermissions = [],
  requiredPermission = null,
  reportedAuthStatus = null,
  reportedPermissions = [],
}) {
  const permissionsList = Array.isArray(registeredPermissions) ? registeredPermissions : [];
  const reqPerm = requiredPermission && typeof requiredPermission === 'string' ? requiredPermission.trim() : null;

  // Case 1: Action does not require a specific permission token
  if (!reqPerm) {
    return {
      isAuthorized: true,
      policyViolation: false,
      requiredPermission: null,
      reason: 'Action does not require a specific permission token.',
    };
  }

  // Case 2: Exact permission check against authoritative registered permissions
  const hasPermission = permissionsList.includes(reqPerm);

  if (hasPermission) {
    return {
      isAuthorized: true,
      policyViolation: false,
      requiredPermission: reqPerm,
      reason: `Permission '${reqPerm}' is authorized for this agent.`,
    };
  }

  // Case 3: Policy Violation — required permission is not in registered permissions
  let explanation = `Policy Violation: Required permission '${reqPerm}' is not registered for this agent.`;

  // Note if the agent falsely claimed to have it (evidence of deception/mismatch)
  if (Array.isArray(reportedPermissions) && reportedPermissions.includes(reqPerm)) {
    explanation += ` (Agent falsely claimed granted permission '${reqPerm}').`;
  } else if (reportedAuthStatus === 'ALLOWED') {
    explanation += ' (Agent self-reported status ALLOWED without registered permission).';
  }

  return {
    isAuthorized: false,
    policyViolation: true,
    requiredPermission: reqPerm,
    reason: explanation,
  };
}

module.exports = { evaluatePolicy };
