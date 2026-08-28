import React from 'react';
import { Shield, AlertCircle, AlertOctagon, Flame } from 'lucide-react';

const RiskBadge = ({ riskLevel = 'LOW', size = 'normal' }) => {
  const norm = String(riskLevel).toUpperCase();

  let colorClass = 'badge-risk-low';
  let Icon = Shield;
  let label = 'LOW RISK';

  if (norm === 'CRITICAL') {
    colorClass = 'badge-risk-critical';
    Icon = Flame;
    label = 'CRITICAL RISK';
  } else if (norm === 'HIGH') {
    colorClass = 'badge-risk-high';
    Icon = AlertOctagon;
    label = 'HIGH RISK';
  } else if (norm === 'MEDIUM') {
    colorClass = 'badge-risk-medium';
    Icon = AlertCircle;
    label = 'MEDIUM RISK';
  }

  const isLarge = size === 'large';

  return (
    <span className={`risk-badge ${colorClass} ${isLarge ? 'risk-badge-lg' : ''}`}>
      <Icon size={isLarge ? 15 : 12} className="badge-icon" />
      <span>{label}</span>
    </span>
  );
};

export default RiskBadge;
