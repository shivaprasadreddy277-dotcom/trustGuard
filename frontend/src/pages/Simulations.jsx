import React from 'react';
import { PlaySquare, Terminal, ShieldCheck, Zap } from 'lucide-react';

const Simulations = () => {
  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Adversarial Attack Simulations</h2>
        <p className="subtitle">
          Synthetic stress-testing sandbox for AI agent goal hijacking & cascading tool abuse
        </p>
      </div>

      <div className="card py-12 text-center">
        <div className="flex-center mb-4">
          <div className="engine-status-icon-wrap blue">
            <PlaySquare size={36} />
          </div>
        </div>
        <h3 className="text-xl font-bold mb-2">Automated Attack Simulation Sandbox</h3>
        <p className="text-muted max-w-lg mx-auto mb-6 text-sm">
          Simulate prompt injections, unauthorized tool invocations, and multi-stage exfiltrations
          against the TrustGuard arbitrator in <strong>Cycle 3 / Cycle 4</strong>.
        </p>

        <div className="engine-capability-grid max-w-2xl mx-auto text-left">
          <div className="capability-card">
            <Terminal size={18} className="text-accent mb-2" />
            <h4 className="font-semibold text-sm">Synthetic Agent Runner</h4>
            <p className="text-xs text-muted">
              Executes autonomous multi-step threat vectors to validate policy boundaries.
            </p>
          </div>

          <div className="capability-card">
            <Zap size={18} className="text-warning mb-2" />
            <h4 className="font-semibold text-sm">Real-time Interception</h4>
            <p className="text-xs text-muted">
              Live telemetry emission directly into the TrustGuard security pipeline.
            </p>
          </div>

          <div className="capability-card">
            <ShieldCheck size={18} className="text-success mb-2" />
            <h4 className="font-semibold text-sm">Verdict Verification</h4>
            <p className="text-xs text-muted">
              Validates expected verdicts against ground truth attack classifications.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Simulations;
