import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Clock,
  Layers,
  AlertTriangle,
  RefreshCw,
  FileCode,
} from 'lucide-react';
import { securityApi } from '../../api/client';
import DecisionBadge from './DecisionBadge';
import RiskBadge from './RiskBadge';
import TrustScoreMeter from './TrustScoreMeter';
import PolicyResultCard from './PolicyResultCard';
import ProvenanceResultCard from './ProvenanceResultCard';
import IntentResultCard from './IntentResultCard';

const InvestigationModal = ({ event, agent, session, isOpen, onClose }) => {
  const [decisionData, setDecisionData] = useState(null);
  const [isLoadingDecision, setIsLoadingDecision] = useState(false);
  const [decisionError, setDecisionError] = useState(null);
  const [activeTab, setActiveTab] = useState('engines'); // 'engines' | 'evidence'

  useEffect(() => {
    if (!isOpen || !event?.eventId) {
      setDecisionData(null);
      setDecisionError(null);
      return;
    }

    let isMounted = true;
    const fetchDecision = async () => {
      setIsLoadingDecision(true);
      setDecisionError(null);
      try {
        const data = await securityApi.getDecision(event.eventId);
        if (isMounted) setDecisionData(data);
      } catch (err) {
        if (isMounted) {
          if (err.status === 404) {
            setDecisionError('No formal decision record exists yet for this event.');
          } else {
            setDecisionError(err.message || 'Failed to retrieve decision breakdown.');
          }
        }
      } finally {
        if (isMounted) setIsLoadingDecision(false);
      }
    };

    fetchDecision();
    return () => {
      isMounted = false;
    };
  }, [isOpen, event?.eventId]);

  if (!isOpen || !event) return null;

  const decision = decisionData?.decision || 'REVIEW';
  const riskLevel = decisionData?.riskLevel || (event.dataSensitivity === 'CRITICAL' ? 'HIGH' : 'LOW');
  const trustScore = decisionData?.trustScore ?? (agent?.currentTrustScore || 95);
  const signals = decisionData?.securitySignals || {};
  const reasons = decisionData?.reasons || [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-investigation" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="investigation-header">
          <div className="investigation-title-block">
            <div className="investigation-badge-row">
              <span className="investigation-tag">FORENSIC SECURITY ARBITRATION</span>
              <DecisionBadge decision={decision} size="large" />
              <RiskBadge riskLevel={riskLevel} size="large" />
            </div>
            <h2>Event Investigation: <code>{event.eventId}</code></h2>
            <div className="investigation-meta-line">
              <span><Clock size={13} /> {new Date(event.timestamp || Date.now()).toLocaleString()}</span>
              <span>• Agent: <strong>{event.agentId}</strong></span>
              <span>• Session: <strong>{event.sessionId}</strong></span>
              <span>• Data Sensitivity: <strong className={`text-sens-${event.dataSensitivity?.toLowerCase()}`}>{event.dataSensitivity}</strong></span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close investigation modal">
            <X size={20} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="investigation-nav-tabs">
          <button
            className={`investigation-tab-btn ${activeTab === 'engines' ? 'active' : ''}`}
            onClick={() => setActiveTab('engines')}
          >
            <Shield size={16} />
            <span>Security Engine Evaluation</span>
          </button>
          <button
            className={`investigation-tab-btn ${activeTab === 'evidence' ? 'active' : ''}`}
            onClick={() => setActiveTab('evidence')}
          >
            <FileCode size={16} />
            <span>Raw Ingested Evidence</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="investigation-body">
          {activeTab === 'engines' ? (
            <div className="investigation-engines-view">
              {isLoadingDecision ? (
                <div className="loading-state-card">
                  <RefreshCw className="spinner" size={24} />
                  <p>Querying authoritative security decision record from backend...</p>
                </div>
              ) : decisionError ? (
                <div className="info-callout">
                  <AlertTriangle size={18} />
                  <div>
                    <strong>Decision Notice</strong>
                    <p>{decisionError}</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Top Verdict & Trust Bar */}
                  <div className="verdict-summary-card">
                    <div className="verdict-summary-left">
                      <span className="verdict-label">OPERATIONAL VERDICT</span>
                      <div className="verdict-title-row">
                        <DecisionBadge decision={decision} size="large" />
                        <RiskBadge riskLevel={riskLevel} size="large" />
                      </div>
                      <p className="verdict-desc">
                        {decision === 'BLOCK'
                          ? 'Action terminated immediately. Prevented unauthorized execution.'
                          : decision === 'REVIEW'
                          ? 'Action quarantined for operator review due to security anomalies.'
                          : 'Action authorized and verified against security policy.'}
                      </p>
                    </div>
                    <div className="verdict-summary-right">
                      <span className="verdict-label">DYNAMIC TRUST IMPACT</span>
                      <TrustScoreMeter score={trustScore} />
                    </div>
                  </div>

                  {/* 5 Engine Evaluation Grid */}
                  <div className="engines-evaluation-stack">
                    {/* 3.1 Policy Engine */}
                    <PolicyResultCard
                      requiredPermission={event.authorization?.requiredPermission}
                      registeredPermissions={agent?.permissions || []}
                      reportedAuthStatus={event.authorization?.status}
                      reportedGrantedPermissions={event.authorization?.grantedPermissions || []}
                      policyViolation={signals.policyViolation}
                      reason={reasons.find((r) => r.toLowerCase().includes('policy') || r.toLowerCase().includes('permission'))}
                    />

                    {/* 3.2 Provenance Engine */}
                    <ProvenanceResultCard
                      sourceType={event.provenance?.sourceType}
                      sourceId={event.provenance?.sourceId}
                      trustLevel={event.provenance?.trustLevel}
                      provenanceRisk={signals.provenanceRisk || 'LOW'}
                      reason={reasons.find((r) => r.toLowerCase().includes('provenance'))}
                    />

                    {/* 3.3 Intent Integrity Engine */}
                    <IntentResultCard
                      originalIntent={session?.originalIntent || session?.original_intent || agent?.declaredObjective}
                      action={event.action}
                      resource={event.resource}
                      status={decisionData?.intent?.status || 'ALIGNED'}
                      alignmentScore={decisionData?.intent?.alignmentScore ?? 1.0}
                      intentDrift={signals.intentDrift}
                      reason={reasons.find((r) => r.toLowerCase().includes('intent'))}
                    />
                  </div>

                  {/* Explainable Reasons Summary */}
                  {reasons && reasons.length > 0 && (
                    <div className="reasons-summary-box">
                      <div className="reasons-header">
                        <Layers size={16} />
                        <h4>Authoritative Security Findings ({reasons.length})</h4>
                      </div>
                      <ul className="reasons-list">
                        {reasons.map((reasonText, idx) => (
                          <li key={idx} className="reason-item">
                            <span className="reason-dot" />
                            <span>{reasonText}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            /* Raw Evidence Tab */
            <div className="investigation-evidence-view">
              <div className="evidence-grid-2col">
                <div className="evidence-card">
                  <h4>Runtime Context</h4>
                  <table className="evidence-table">
                    <tbody>
                      <tr>
                        <td>Action</td>
                        <td><code>{event.action}</code></td>
                      </tr>
                      <tr>
                        <td>Tool</td>
                        <td><code>{event.tool}</code></td>
                      </tr>
                      <tr>
                        <td>Resource Target</td>
                        <td><code>{event.resource}</code></td>
                      </tr>
                      <tr>
                        <td>Data Sensitivity</td>
                        <td><span className={`sensitivity-badge sensitivity-${event.dataSensitivity?.toLowerCase()}`}>{event.dataSensitivity}</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="evidence-card">
                  <h4>Reported Authorization & Provenance</h4>
                  <table className="evidence-table">
                    <tbody>
                      <tr>
                        <td>Reported Status</td>
                        <td><strong>{event.authorization?.status || 'N/A'}</strong></td>
                      </tr>
                      <tr>
                        <td>Required Token</td>
                        <td><code>{event.authorization?.requiredPermission || 'None'}</code></td>
                      </tr>
                      <tr>
                        <td>Claimed Tokens</td>
                        <td><code>{JSON.stringify(event.authorization?.grantedPermissions || [])}</code></td>
                      </tr>
                      <tr>
                        <td>Provenance Origin</td>
                        <td>{event.provenance?.sourceType} ({event.provenance?.sourceId})</td>
                      </tr>
                      <tr>
                        <td>Provenance Trust</td>
                        <td><strong>{event.provenance?.trustLevel}</strong></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="raw-json-inspector-box">
                <h4>Raw Telemetry JSON</h4>
                <pre>{JSON.stringify(event, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="investigation-footer">
          <div className="security-guarantee-note">
            <Shield size={14} className="text-cyan" />
            <span>Decisions computed deterministically by TrustGuard security engines.</span>
          </div>
          <button className="btn-secondary" onClick={onClose}>
            Close Investigation
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvestigationModal;
