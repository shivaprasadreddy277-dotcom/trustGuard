import React from 'react';
import { Link2, ShieldAlert, Cpu, Sparkles } from 'lucide-react';

const AttackChains = () => {
  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Attack Chain Intelligence</h2>
        <p className="subtitle">
          Stateful multi-step behavioral anomaly correlation & threat detection
        </p>
      </div>

      <div className="card py-12 text-center">
        <div className="flex-center mb-4">
          <div className="engine-status-icon-wrap purple">
            <Link2 size={36} />
          </div>
        </div>
        <h3 className="text-xl font-bold mb-2">Stateful Attack Chain Engine</h3>
        <p className="text-muted max-w-lg mx-auto mb-6 text-sm">
          Telemetry ingestion is active. Multi-step correlation, privilege escalation detection, and
          compound attack sequence graph reconstruction will activate in <strong>Cycle 3 (Security Intelligence)</strong>.
        </p>

        <div className="engine-capability-grid max-w-2xl mx-auto text-left">
          <div className="capability-card">
            <ShieldAlert size={18} className="text-warning mb-2" />
            <h4 className="font-semibold text-sm">Privilege Escalation Rules</h4>
            <p className="text-xs text-muted">
              Detects sequences like file read &rarr; credential extraction &rarr; HTTP post.
            </p>
          </div>

          <div className="capability-card">
            <Cpu size={18} className="text-accent mb-2" />
            <h4 className="font-semibold text-sm">Graph Correlator</h4>
            <p className="text-xs text-muted">
              Correlates isolated agent events into correlated causal chains.
            </p>
          </div>

          <div className="capability-card">
            <Sparkles size={18} className="text-success mb-2" />
            <h4 className="font-semibold text-sm">Compound Verdicts</h4>
            <p className="text-xs text-muted">
              Generates ALLOW / REVIEW / BLOCK decisions with explainable indicators.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttackChains;
