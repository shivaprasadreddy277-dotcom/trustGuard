import React from 'react';
import { GitBranch, ShieldCheck, AlertTriangle, ShieldX, FileText, User, Bot, Server } from 'lucide-react';

const ProvenanceResultCard = ({
  sourceType = 'UNKNOWN',
  sourceId = 'unknown',
  trustLevel = 'UNTRUSTED',
  provenanceRisk = 'LOW',
  reason,
}) => {
  const isUntrusted = trustLevel === 'UNTRUSTED';
  const isMedium = trustLevel === 'MEDIUM';

  let SourceIcon = FileText;
  if (sourceType === 'USER') SourceIcon = User;
  else if (sourceType === 'ANOTHER_AGENT') SourceIcon = Bot;
  else if (sourceType === 'SYSTEM_POLICY') SourceIcon = Server;

  return (
    <div className={`engine-card ${isUntrusted ? 'engine-card-violation' : isMedium ? 'engine-card-warning' : 'engine-card-clean'}`}>
      <div className="engine-card-header">
        <div className="engine-title-wrap">
          <GitBranch className="engine-status-icon text-cyan" size={20} />
          <div>
            <h4>3.2 Provenance Engine</h4>
            <span className="engine-subtitle">Directive Origin & Chain of Custody</span>
          </div>
        </div>
        <div className="provenance-badges-wrap">
          <span className={`provenance-trust-badge provenance-${trustLevel?.toLowerCase()}`}>
            {isUntrusted ? <ShieldX size={13} /> : isMedium ? <AlertTriangle size={13} /> : <ShieldCheck size={13} />}
            {trustLevel} TRUST
          </span>
          <span className={`provenance-risk-badge risk-${provenanceRisk?.toLowerCase()}`}>
            RISK: {provenanceRisk}
          </span>
        </div>
      </div>

      <div className="engine-card-body">
        <div className="provenance-details-grid">
          <div className="provenance-item">
            <span className="provenance-label">Origin Source Type</span>
            <div className="provenance-val">
              <SourceIcon size={14} />
              <span>{sourceType}</span>
            </div>
          </div>
          <div className="provenance-item">
            <span className="provenance-label">Origin Identifier</span>
            <div className="provenance-val">
              <code>{sourceId}</code>
            </div>
          </div>
        </div>

        {isUntrusted && sourceType === 'EXTERNAL_DOCUMENT' && (
          <div className="provenance-injection-warning">
            <AlertTriangle size={15} />
            <div>
              <strong>Prompt Injection Threat Vector Detected</strong>
              <p>Directive originated from an untrusted external document. High probability of indirect injection payload.</p>
            </div>
          </div>
        )}

        {reason && (
          <p className="engine-reason-text">
            <strong>Analysis:</strong> {reason}
          </p>
        )}
      </div>
    </div>
  );
};

export default ProvenanceResultCard;
