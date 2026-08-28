import React from 'react';
import { Target, Compass, AlertOctagon, CheckCircle2 } from 'lucide-react';

const IntentResultCard = ({
  originalIntent = '',
  action = '',
  resource = '',
  status = 'ALIGNED',
  alignmentScore = 1.0,
  intentDrift = false,
  reason,
}) => {
  const isDrift = status === 'DRIFT' || intentDrift;
  const pct = Math.max(0, Math.min(100, Math.round(alignmentScore * 100)));

  return (
    <div className={`engine-card ${isDrift ? 'engine-card-violation' : 'engine-card-clean'}`}>
      <div className="engine-card-header">
        <div className="engine-title-wrap">
          <Compass className="engine-status-icon text-indigo" size={20} />
          <div>
            <h4>3.3 Intent Integrity Engine</h4>
            <span className="engine-subtitle">Semantic Baseline & Goal Alignment</span>
          </div>
        </div>
        <span className={`engine-badge ${isDrift ? 'engine-badge-drift' : 'engine-badge-aligned'}`}>
          {isDrift ? <AlertOctagon size={13} /> : <CheckCircle2 size={13} />}
          {status} ({pct}%)
        </span>
      </div>

      <div className="engine-card-body">
        <div className="intent-comparison-grid">
          <div className="intent-baseline-box">
            <div className="intent-box-header">
              <Target size={14} className="text-emerald" />
              <span className="authoritative-tag">AUTHORITATIVE BASELINE</span>
            </div>
            <p className="intent-text">
              {originalIntent ? `"${originalIntent}"` : '(No original intent baseline recorded)'}
            </p>
          </div>

          <div className="intent-observed-box">
            <div className="intent-box-header">
              <span className="evidence-tag">OBSERVED EXECUTION</span>
            </div>
            <div className="intent-observed-details">
              <div>
                <span className="text-muted">Action:</span> <code>{action}</code>
              </div>
              <div>
                <span className="text-muted">Target Resource:</span> <code>{resource}</code>
              </div>
            </div>
          </div>
        </div>

        <div className="alignment-meter-wrap">
          <div className="alignment-meter-labels">
            <span>Goal Alignment Score</span>
            <strong className={isDrift ? 'text-red' : 'text-green'}>
              {alignmentScore.toFixed(2)} / 1.00 ({pct}%)
            </strong>
          </div>
          <div className="alignment-progress-track">
            <div
              className={`alignment-progress-bar ${isDrift ? 'bar-drift' : 'bar-aligned'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {isDrift && (
          <div className="intent-drift-callout">
            <AlertOctagon size={16} />
            <span>
              {reason || 'Action diverges significantly from the declared objective authorized by the operator.'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default IntentResultCard;
