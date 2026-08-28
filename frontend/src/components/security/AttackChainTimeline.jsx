import React from 'react';
import {
  FileText,
  Terminal,
  Database,
  Users,
  Send,
  AlertTriangle,
  ArrowDown,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import DecisionBadge from './DecisionBadge';
import RiskBadge from './RiskBadge';

const STAGE_CONFIG = {
  untrusted_input: {
    label: 'Stage 1: Untrusted Input Ingestion',
    color: '#3B82F6',
    icon: FileText,
    desc: 'External document or directive ingested with untrusted provenance.',
  },
  prompt_influence: {
    label: 'Stage 2: Prompt Injection / Instruction Influence',
    color: '#8B5CF6',
    icon: Terminal,
    desc: 'LLM prompt execution steered by untrusted external instructions.',
  },
  intent_drift: {
    label: 'Stage 3: Intent Drift & Sensitive Data Access',
    color: '#F59E0B',
    icon: Database,
    desc: 'Action deviated from original session baseline toward sensitive data.',
  },
  agent_delegation: {
    label: 'Stage 4: Autonomous Agent Delegation',
    color: '#EC4899',
    icon: Users,
    desc: 'Task delegated to secondary agent to circumvent primary constraints.',
  },
  data_exfiltration: {
    label: 'Stage 5: External Data Exfiltration',
    color: '#EF4444',
    icon: Send,
    desc: 'Attempted transmission of sensitive payload to external destination.',
  },
};

const AttackChainTimeline = ({ events = [], onSelectEvent }) => {
  if (!events || events.length === 0) {
    return (
      <div className="empty-timeline-card">
        <AlertTriangle size={24} className="text-muted" />
        <p>No event steps recorded for this attack chain.</p>
      </div>
    );
  }

  return (
    <div className="attack-chain-timeline-root">
      <div className="timeline-journey-header">
        <ShieldAlert size={18} className="text-critical" />
        <span>Correlated Multi-Stage Execution Progression ({events.length} Events)</span>
      </div>

      <div className="timeline-stepper">
        {events.map((evt, idx) => {
          const stageKey =
            evt.stage ||
            (evt.action?.includes('exfil') || evt.action?.includes('http_post')
              ? 'data_exfiltration'
              : evt.action?.includes('delegate')
              ? 'agent_delegation'
              : evt.action?.includes('query_db') || evt.resource?.toLowerCase().includes('credential')
              ? 'intent_drift'
              : evt.action?.includes('prompt')
              ? 'prompt_influence'
              : 'untrusted_input');

          const config = STAGE_CONFIG[stageKey] || STAGE_CONFIG.untrusted_input;
          const StageIcon = config.icon;
          const isLast = idx === events.length - 1;

          return (
            <div key={evt.eventId || idx} className={`timeline-step-card ${isLast ? 'step-terminal' : ''}`}>
              <div className="step-node-col">
                <div className="step-number-badge" style={{ borderColor: config.color }}>
                  <span>{String(idx + 1).padStart(2, '0')}</span>
                </div>
                {!isLast && (
                  <div className="step-line-connector">
                    <ArrowDown size={14} className="connector-arrow" />
                  </div>
                )}
              </div>

              <div className="step-content-card">
                <div className="step-top-row">
                  <div className="step-stage-pill" style={{ color: config.color, borderColor: config.color }}>
                    <StageIcon size={14} />
                    <span>{config.label}</span>
                  </div>
                  <div className="step-badges-wrap">
                    {evt.riskLevel && <RiskBadge risk={evt.riskLevel} />}
                    {evt.decision && <DecisionBadge decision={evt.decision} />}
                  </div>
                </div>

                <div className="step-main-meta">
                  <div className="step-action-headline">
                    <span className="step-event-id">{evt.eventId}</span>
                    <span className="step-action-name">{evt.action}</span>
                  </div>
                  <div className="step-detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">Tool / Connector:</span>
                      <span className="detail-value">{evt.tool || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Target Resource:</span>
                      <span className="detail-value mono-val">{evt.resource || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Data Sensitivity:</span>
                      <span className="detail-value">{evt.dataSensitivity || 'LOW'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Timestamp:</span>
                      <span className="detail-value">
                        <Clock size={12} className="inline-icon" />{' '}
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>

                {evt.reasons && evt.reasons.length > 0 && (
                  <div className="step-findings-callout">
                    <span className="findings-title">Engine Finding:</span>
                    <ul className="findings-list">
                      {evt.reasons.map((r, rIdx) => (
                        <li key={rIdx}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {onSelectEvent && (
                  <button
                    type="button"
                    className="btn btn-subtle btn-xs mt-2"
                    onClick={() => onSelectEvent(evt)}
                  >
                    Inspect Full Event
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AttackChainTimeline;
