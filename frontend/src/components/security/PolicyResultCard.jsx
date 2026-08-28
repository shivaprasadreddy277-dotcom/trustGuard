import React from 'react';
import { ShieldCheck, ShieldAlert, Key, AlertTriangle } from 'lucide-react';

const PolicyResultCard = ({
  requiredPermission,
  registeredPermissions = [],
  reportedAuthStatus,
  reportedGrantedPermissions = [],
  policyViolation = false,
  reason,
}) => {
  const isViolation = policyViolation;

  return (
    <div className={`engine-card ${isViolation ? 'engine-card-violation' : 'engine-card-clean'}`}>
      <div className="engine-card-header">
        <div className="engine-title-wrap">
          {isViolation ? (
            <ShieldAlert className="engine-status-icon text-red" size={20} />
          ) : (
            <ShieldCheck className="engine-status-icon text-green" size={20} />
          )}
          <div>
            <h4>3.1 Policy Engine</h4>
            <span className="engine-subtitle">Authoritative Permission Verification</span>
          </div>
        </div>
        <span className={`engine-badge ${isViolation ? 'engine-badge-violation' : 'engine-badge-pass'}`}>
          {isViolation ? 'POLICY VIOLATION' : 'AUTHORIZED'}
        </span>
      </div>

      <div className="engine-card-body">
        <div className="policy-matrix-grid">
          <div className="policy-col">
            <div className="policy-col-header">
              <Key size={14} />
              <span>Required Permission</span>
            </div>
            <div className="policy-value-tag">
              <code>{requiredPermission || '(None required)'}</code>
            </div>
          </div>

          <div className="policy-col">
            <div className="policy-col-header">
              <span className="authoritative-tag">AUTHORITATIVE</span>
              <span>Registered (agents.permissions)</span>
            </div>
            <div className="policy-chips-wrap">
              {registeredPermissions && registeredPermissions.length > 0 ? (
                registeredPermissions.map((perm) => (
                  <span
                    key={perm}
                    className={`policy-chip ${perm === requiredPermission ? 'policy-chip-match' : ''}`}
                  >
                    {perm}
                  </span>
                ))
              ) : (
                <span className="policy-chip-empty">No permissions registered</span>
              )}
            </div>
          </div>

          <div className="policy-col">
            <div className="policy-col-header">
              <span className="evidence-tag">EVIDENCE ONLY</span>
              <span>Reported by Agent</span>
            </div>
            <div className="policy-reported-info">
              <span className="reported-status">
                Status: <strong>{reportedAuthStatus || 'UNKNOWN'}</strong>
              </span>
              <div className="policy-chips-wrap">
                {reportedGrantedPermissions && reportedGrantedPermissions.length > 0 ? (
                  reportedGrantedPermissions.map((p) => (
                    <span key={p} className="policy-chip-evidence">
                      {p}
                    </span>
                  ))
                ) : (
                  <span className="policy-chip-empty">(None claimed)</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {isViolation && (
          <div className="policy-alert-banner">
            <AlertTriangle size={15} />
            <span>
              {reason || 'Action requires permissions that are NOT registered for this agent in PostgreSQL.'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PolicyResultCard;
