import React from 'react';
import { ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';

const TrustScoreMeter = ({ score = 100, showLabel = true, size = 'normal' }) => {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));

  let colorClass = 'trust-meter-high';
  let Icon = ShieldCheck;
  let statusText = 'TRUSTED';

  if (clampedScore < 50) {
    colorClass = 'trust-meter-critical';
    Icon = ShieldX;
    statusText = 'DEGRADED / CRITICAL';
  } else if (clampedScore < 80) {
    colorClass = 'trust-meter-medium';
    Icon = ShieldAlert;
    statusText = 'SUSPICIOUS / ELEVATED RISK';
  }

  const isCompact = size === 'compact';

  return (
    <div className={`trust-meter-container ${isCompact ? 'trust-meter-compact' : ''}`}>
      <div className="trust-meter-header">
        {showLabel && (
          <div className="trust-meter-status">
            <Icon size={14} className="trust-icon" />
            <span className="trust-status-text">{statusText}</span>
          </div>
        )}
        <span className={`trust-score-value ${colorClass}`}>
          {clampedScore}
          <span className="trust-max">/100</span>
        </span>
      </div>
      <div className="trust-progress-track">
        <div
          className={`trust-progress-bar ${colorClass}`}
          style={{ width: `${clampedScore}%` }}
        />
      </div>
    </div>
  );
};

export default TrustScoreMeter;
