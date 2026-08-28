import React from 'react';
import { CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';

const DecisionBadge = ({ decision = 'ALLOW', size = 'normal' }) => {
  const norm = String(decision).toUpperCase();

  let colorClass = 'badge-decision-allow';
  let Icon = CheckCircle2;
  let label = 'ALLOW';

  if (norm === 'BLOCK') {
    colorClass = 'badge-decision-block';
    Icon = ShieldAlert;
    label = 'BLOCK';
  } else if (norm === 'REVIEW') {
    colorClass = 'badge-decision-review';
    Icon = AlertTriangle;
    label = 'REVIEW';
  }

  const isLarge = size === 'large';

  return (
    <span className={`decision-badge ${colorClass} ${isLarge ? 'decision-badge-lg' : ''}`}>
      <Icon size={isLarge ? 16 : 13} className="badge-icon" />
      <span>{label}</span>
    </span>
  );
};

export default DecisionBadge;
