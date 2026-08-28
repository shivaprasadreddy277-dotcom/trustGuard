import React, { useState } from 'react';
import {
  X,
  Send,
  Shield,
  Zap,
  AlertCircle,
  Compass,
  GitBranch,
  Key,
  Flame,
} from 'lucide-react';
import { eventsApi } from '../../api/client';
import DecisionBadge from './DecisionBadge';
import RiskBadge from './RiskBadge';
import TrustScoreMeter from './TrustScoreMeter';

const PRESET_SCENARIOS = [
  {
    name: 'Normal Authorized Query (Safe)',
    payload: {
      action: 'database_connector.query',
      tool: 'database_connector',
      resource: 'NovaCorp_Q2_Financials',
      dataSensitivity: 'LOW',
      requiredPermission: 'reports.read',
      grantedPermissions: 'reports.read',
      authStatus: 'ALLOWED',
      provenanceSourceType: 'USER',
      provenanceSourceId: 'operator_prompt',
      provenanceTrustLevel: 'TRUSTED',
    },
  },
  {
    name: 'Policy Violation: Unregistered Network Send',
    payload: {
      action: 'network.send',
      tool: 'http_client',
      resource: 'https://exfiltration-server.net/dump',
      dataSensitivity: 'HIGH',
      requiredPermission: 'network.send',
      grantedPermissions: 'network.send',
      authStatus: 'ALLOWED',
      provenanceSourceType: 'USER',
      provenanceSourceId: 'operator_prompt',
      provenanceTrustLevel: 'TRUSTED',
    },
  },
  {
    name: 'Prompt Injection: Untrusted Doc Exfiltration',
    payload: {
      action: 'network.send',
      tool: 'http_client',
      resource: 'https://external-c2-server.com/creds',
      dataSensitivity: 'CRITICAL',
      requiredPermission: 'network.send',
      grantedPermissions: 'network.send',
      authStatus: 'ALLOWED',
      provenanceSourceType: 'EXTERNAL_DOCUMENT',
      provenanceSourceId: 'invoice_payload.pdf',
      provenanceTrustLevel: 'UNTRUSTED',
    },
  },
  {
    name: 'Intent Drift: Credential Table Query',
    payload: {
      action: 'database_connector.query',
      tool: 'database_connector',
      resource: 'NovaCorp_Master_Credentials',
      dataSensitivity: 'CRITICAL',
      requiredPermission: 'db.read',
      grantedPermissions: 'db.read',
      authStatus: 'ALLOWED',
      provenanceSourceType: 'EXTERNAL_DOCUMENT',
      provenanceSourceId: 'doc_q3_report',
      provenanceTrustLevel: 'MEDIUM',
    },
  },
];

const LiveSecurityPipelineModal = ({ isOpen, onClose, onEventIngested }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(0); // 0: ready, 1: policy, 2: provenance, 3: intent, 4: decision, 5: complete
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState(null);

  const [form, setForm] = useState(() => ({
    eventId: `evt_${Date.now().toString(36)}`,
    sessionId: 'sess_9988',
    agentId: 'agent_001',
    parentAgentId: '',
    action: 'database_connector.query',
    tool: 'database_connector',
    resource: 'NovaCorp_DB',
    dataSensitivity: 'HIGH',
    authStatus: 'ALLOWED',
    requiredPermission: 'reports.read',
    grantedPermissions: 'reports.read',
    provenanceSourceType: 'EXTERNAL_DOCUMENT',
    provenanceSourceId: 'doc_001',
    provenanceTrustLevel: 'UNTRUSTED',
  }));

  const handleApplyScenario = (scenario) => {
    setForm((prev) => ({
      ...prev,
      eventId: `evt_${Date.now().toString(36)}`,
      ...scenario.payload,
    }));
    setResult(null);
    setErrorMsg('');
    setPipelineStep(0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setResult(null);
    setIsSubmitting(true);
    setPipelineStep(1);

    const payload = {
      eventId: form.eventId.trim(),
      sessionId: form.sessionId.trim(),
      agentId: form.agentId.trim(),
      parentAgentId: form.parentAgentId.trim() || null,
      timestamp: new Date().toISOString(),
      action: form.action.trim(),
      tool: form.tool.trim(),
      resource: form.resource.trim(),
      dataSensitivity: form.dataSensitivity,
      authorization: {
        status: form.authStatus,
        requiredPermission: form.requiredPermission.trim() || null,
        grantedPermissions: form.grantedPermissions
          ? form.grantedPermissions.split(',').map((p) => p.trim()).filter(Boolean)
          : [],
      },
      provenance: {
        sourceType: form.provenanceSourceType,
        sourceId: form.provenanceSourceId.trim(),
        trustLevel: form.provenanceTrustLevel,
      },
    };

    try {
      // Step simulation transition for visual feedback
      setPipelineStep(2);
      await new Promise((r) => setTimeout(r, 120));
      setPipelineStep(3);
      await new Promise((r) => setTimeout(r, 120));
      setPipelineStep(4);

      const securityResult = await eventsApi.ingestEvent(payload);

      setPipelineStep(5);
      setResult(securityResult);
      if (onEventIngested) onEventIngested(securityResult);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to ingest event.');
      setPipelineStep(0);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-ingest" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <Zap className="text-cyan" size={22} />
            <div>
              <h3>Real-Time Security Pipeline Simulator</h3>
              <span className="modal-subtitle">Ingest telemetry & observe continuous multi-engine arbitration</span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Quick Scenario Selector */}
        <div className="scenarios-bar">
          <span className="scenarios-label">Preset Attack / Operational Scenarios:</span>
          <div className="scenarios-chips">
            {PRESET_SCENARIOS.map((s, idx) => (
              <button
                key={idx}
                type="button"
                className="scenario-chip"
                onClick={() => handleApplyScenario(s)}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        {errorMsg && (
          <div className="form-error-banner">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Live Pipeline Step Visualizer */}
        {(isSubmitting || result) && (
          <div className="pipeline-visualizer-card">
            <h4>Live Pipeline Arbitration Sequence</h4>
            <div className="pipeline-stepper">
              <div className={`pipe-step ${pipelineStep >= 1 ? 'active' : ''}`}>
                <div className="pipe-icon"><Key size={14} /></div>
                <span>3.1 Policy</span>
              </div>
              <div className="pipe-arrow">&rarr;</div>
              <div className={`pipe-step ${pipelineStep >= 2 ? 'active' : ''}`}>
                <div className="pipe-icon"><GitBranch size={14} /></div>
                <span>3.2 Provenance</span>
              </div>
              <div className="pipe-arrow">&rarr;</div>
              <div className={`pipe-step ${pipelineStep >= 3 ? 'active' : ''}`}>
                <div className="pipe-icon"><Compass size={14} /></div>
                <span>3.3 Intent</span>
              </div>
              <div className="pipe-arrow">&rarr;</div>
              <div className={`pipe-step ${pipelineStep >= 4 ? 'active' : ''}`}>
                <div className="pipe-icon"><Flame size={14} /></div>
                <span>3.4 Decision</span>
              </div>
              <div className="pipe-arrow">&rarr;</div>
              <div className={`pipe-step ${pipelineStep >= 5 ? 'active' : ''}`}>
                <div className="pipe-icon"><Shield size={14} /></div>
                <span>3.5 Dynamic Trust</span>
              </div>
            </div>
          </div>
        )}

        {/* Live Result Callout */}
        {result && (
          <div className="pipeline-result-box">
            <div className="pipeline-result-header">
              <div className="result-badges-row">
                <DecisionBadge decision={result.decision} size="large" />
                <RiskBadge riskLevel={result.riskLevel} size="large" />
              </div>
              <div className="result-trust-wrap">
                <TrustScoreMeter score={result.trustScore} />
              </div>
            </div>
            {result.reasons && result.reasons.length > 0 && (
              <ul className="result-reasons-list">
                {result.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-grid-3col">
            <div className="form-group">
              <label>Event ID</label>
              <input
                type="text"
                value={form.eventId}
                onChange={(e) => setForm({ ...form, eventId: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Session ID</label>
              <input
                type="text"
                value={form.sessionId}
                onChange={(e) => setForm({ ...form, sessionId: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Agent ID</label>
              <input
                type="text"
                value={form.agentId}
                onChange={(e) => setForm({ ...form, agentId: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-grid-3col">
            <div className="form-group">
              <label>Action / Method</label>
              <input
                type="text"
                value={form.action}
                onChange={(e) => setForm({ ...form, action: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Tool</label>
              <input
                type="text"
                value={form.tool}
                onChange={(e) => setForm({ ...form, tool: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Target Resource</label>
              <input
                type="text"
                value={form.resource}
                onChange={(e) => setForm({ ...form, resource: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-grid-3col">
            <div className="form-group">
              <label>Data Sensitivity</label>
              <select
                value={form.dataSensitivity}
                onChange={(e) => setForm({ ...form, dataSensitivity: e.target.value })}
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>
            <div className="form-group">
              <label>Required Permission</label>
              <input
                type="text"
                value={form.requiredPermission}
                onChange={(e) => setForm({ ...form, requiredPermission: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Reported Granted (Claimed)</label>
              <input
                type="text"
                value={form.grantedPermissions}
                onChange={(e) => setForm({ ...form, grantedPermissions: e.target.value })}
              />
            </div>
          </div>

          <div className="form-grid-3col">
            <div className="form-group">
              <label>Provenance Source Type</label>
              <select
                value={form.provenanceSourceType}
                onChange={(e) => setForm({ ...form, provenanceSourceType: e.target.value })}
              >
                <option value="USER">USER</option>
                <option value="SYSTEM_POLICY">SYSTEM_POLICY</option>
                <option value="APPROVED_KNOWLEDGE">APPROVED_KNOWLEDGE</option>
                <option value="INTERNAL_DOCUMENT">INTERNAL_DOCUMENT</option>
                <option value="EXTERNAL_DOCUMENT">EXTERNAL_DOCUMENT</option>
                <option value="ANOTHER_AGENT">ANOTHER_AGENT</option>
              </select>
            </div>
            <div className="form-group">
              <label>Provenance Source ID</label>
              <input
                type="text"
                value={form.provenanceSourceId}
                onChange={(e) => setForm({ ...form, provenanceSourceId: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Provenance Trust Level</label>
              <select
                value={form.provenanceTrustLevel}
                onChange={(e) => setForm({ ...form, provenanceTrustLevel: e.target.value })}
              >
                <option value="TRUSTED">TRUSTED</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="UNTRUSTED">UNTRUSTED</option>
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              <Send size={15} />
              <span>{isSubmitting ? 'Arbitrating Security Pipeline...' : 'Submit to Security Pipeline'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LiveSecurityPipelineModal;
