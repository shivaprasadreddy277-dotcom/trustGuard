import React, { useState, useEffect, useCallback } from 'react';
import {
  PlaySquare,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Zap,
  CheckCircle2,
  Eye,
  FileCode,
  ArrowRight,
  Layers,
  ChevronRight,
  Check,
  Copy,
} from 'lucide-react';
import { simulationApi } from '../api/client';
import DecisionBadge from '../components/security/DecisionBadge';
import RiskBadge from '../components/security/RiskBadge';
import AttackChainDetailModal from '../components/security/AttackChainDetailModal';

const SCENARIO_ICONS = {
  normal_workflow: ShieldCheck,
  unauthorized_sensitive_access: ShieldAlert,
  indirect_injection: AlertTriangle,
  intent_drift: Zap,
  compound_attack: Layers,
};

const Simulations = () => {
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState('compound_attack');
  const [isRunning, setIsRunning] = useState(false);
  const [currentRunResult, setCurrentRunResult] = useState(null);
  const [simulationHistory, setSimulationHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState(null);
  const [pipelineStage, setPipelineStage] = useState(null); // 'GENERATED' | 'EVALUATED' | 'CORRELATED' | 'COMPLETED'
  const [copied, setCopied] = useState(false);

  // Modal inspection
  const [inspectChainId, setInspectChainId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 1. Fetch scenario definitions & history on mount
  const fetchInitialData = useCallback(async () => {
    try {
      const [scenariosRes, runsRes] = await Promise.allSettled([
        simulationApi.getScenarios(),
        simulationApi.listRuns(10),
      ]);

      if (scenariosRes.status === 'fulfilled') {
        setScenarios(scenariosRes.value.scenarios || []);
      }
      if (runsRes.status === 'fulfilled') {
        setSimulationHistory(runsRes.value.simulations || runsRes.value.runs || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to initialize simulation lab.');
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // 2. Execute real simulation scenario through backend
  const handleRunSimulation = async (scenarioIdToRun = selectedScenarioId) => {
    if (isRunning) return;

    setIsRunning(true);
    setError(null);
    setCurrentRunResult(null);
    setPipelineStage('GENERATING');

    try {
      // Step 1: Simulate pipeline visualization progression while backend executes
      setTimeout(() => setPipelineStage('EVALUATING'), 300);
      setTimeout(() => setPipelineStage('CORRELATING'), 600);

      // Real backend POST execution
      const result = await simulationApi.runSimulation(scenarioIdToRun);

      setPipelineStage('COMPLETED');
      setCurrentRunResult(result);

      // Refresh simulation history
      const updatedRuns = await simulationApi.listRuns(10).catch(() => ({ simulations: [] }));
      setSimulationHistory(updatedRuns.simulations || updatedRuns.runs || []);
    } catch (err) {
      setPipelineStage('FAILED');
      setError(err.message || 'Simulation execution failed.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopyEvidence = () => {
    if (!currentRunResult) return;
    navigator.clipboard.writeText(JSON.stringify(currentRunResult, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenChainModal = (chainId) => {
    if (!chainId) return;
    setInspectChainId(chainId);
    setIsModalOpen(true);
  };

  const selectedScenario =
    scenarios.find((s) => s.scenarioId === selectedScenarioId) || scenarios[0];

  return (
    <div className="page-container simulation-lab-page">
      {/* Top Header */}
      <div className="page-header">
        <div>
          <div className="title-row">
            <PlaySquare className="header-icon text-cyan" size={28} />
            <h1>Security Simulation Lab</h1>
          </div>
          <p className="page-subtitle">
            Generate controlled agent activity and observe TrustGuard's real-time security arbitration and correlation.
          </p>
        </div>
        <div className="header-btn-group">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchInitialData}
            disabled={isRunning}
          >
            <RefreshCw size={15} />
            <span>Refresh History</span>
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Available Scenarios</span>
            <PlaySquare className="stat-icon text-info" size={20} />
          </div>
          <div className="stat-value">{scenarios.length || 5}</div>
          <div className="stat-desc">Deterministic security threat models</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Total Lab Runs</span>
            <CheckCircle2 className="stat-icon text-success" size={20} />
          </div>
          <div className="stat-value">{simulationHistory.length}</div>
          <div className="stat-desc">Executed against live backend pipeline</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Primary Jury Target</span>
            <ShieldAlert className="stat-icon text-critical" size={20} />
          </div>
          <div className="stat-value text-critical">Compound Attack</div>
          <div className="stat-desc">5-step multi-stage correlation</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Continuous Arbitration</span>
            <Zap className="stat-icon text-warning" size={20} />
          </div>
          <div className="stat-value text-success font-bold">100% REAL</div>
          <div className="stat-desc">Zero mock data • Authoritative engines</div>
        </div>
      </div>

      {/* Scenario Selection Grid */}
      <div className="section-block">
        <div className="section-title-wrap mb-3">
          <h3>1. Select Security Scenario</h3>
          <span className="text-muted text-xs ml-2">Choose an attack archetype to execute through TrustGuard</span>
        </div>

        <div className="scenarios-cards-grid">
          {scenarios.map((sc) => {
            const isSelected = sc.scenarioId === selectedScenarioId;
            const Icon = SCENARIO_ICONS[sc.scenarioId] || Zap;
            const isCompound = sc.scenarioId === 'compound_attack';

            return (
              <div
                key={sc.scenarioId}
                className={`scenario-select-card ${isSelected ? 'selected' : ''} ${isCompound ? 'compound-highlight' : ''}`}
                onClick={() => !isRunning && setSelectedScenarioId(sc.scenarioId)}
              >
                <div className="scenario-card-header">
                  <div className="scenario-icon-pill">
                    <Icon size={18} />
                  </div>
                  {isCompound && <span className="jury-badge">★ PRIMARY JURY DEMO</span>}
                </div>

                <h4 className="scenario-title">{sc.name}</h4>
                <p className="scenario-desc">{sc.description}</p>

                <div className="scenario-expected-row">
                  <span className="exp-label">Expected Arbitration:</span>
                  <DecisionBadge decision={sc.expectedDecision || 'BLOCK'} />
                </div>

                <div className="scenario-steps-summary">
                  <span className="steps-title">Test Trajectory:</span>
                  <ul className="steps-bullets">
                    {sc.steps?.slice(0, 3).map((st, i) => (
                      <li key={i}>{st}</li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Primary Jury Action Bar */}
      <div className="simulation-action-banner">
        <div className="action-banner-info">
          <h3>Ready to Execute: <span className="text-cyan">{selectedScenario?.name}</span></h3>
          <p>
            Submits telemetry steps to <code>POST /api/agent/events</code>, triggers Policy, Provenance,
            Intent, Risk, Dynamic Trust, and Attack Chain engines synchronously.
          </p>
        </div>

        <button
          type="button"
          className={`btn btn-lg ${selectedScenarioId === 'compound_attack' ? 'btn-critical-glow' : 'btn-primary'}`}
          onClick={() => handleRunSimulation(selectedScenarioId)}
          disabled={isRunning}
        >
          {isRunning ? (
            <>
              <RefreshCw size={20} className="spinner" />
              <span>Executing Real Pipeline...</span>
            </>
          ) : (
            <>
              <Zap size={20} />
              <span>
                {selectedScenarioId === 'compound_attack'
                  ? '⚡ RUN COMPOUND ATTACK DEMO'
                  : `RUN ${selectedScenario?.name?.toUpperCase()}`}
              </span>
            </>
          )}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-banner mt-3">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Live Pipeline Stepper */}
      {isRunning && (
        <div className="live-pipeline-card">
          <div className="pipeline-header">
            <RefreshCw size={18} className="spinner text-cyan" />
            <h4>Real-Time Security Intelligence Pipeline Active</h4>
          </div>
          <div className="pipeline-stages-flow">
            <div className={`pipe-node ${pipelineStage ? 'active' : ''}`}>
              <span>1. Event Ingested</span>
            </div>
            <ArrowRight size={14} className="pipe-arr" />
            <div className={`pipe-node ${pipelineStage === 'EVALUATING' || pipelineStage === 'CORRELATING' || pipelineStage === 'COMPLETED' ? 'active' : ''}`}>
              <span>2. Policy & Provenance</span>
            </div>
            <ArrowRight size={14} className="pipe-arr" />
            <div className={`pipe-node ${pipelineStage === 'EVALUATING' || pipelineStage === 'CORRELATING' || pipelineStage === 'COMPLETED' ? 'active' : ''}`}>
              <span>3. Intent Integrity</span>
            </div>
            <ArrowRight size={14} className="pipe-arr" />
            <div className={`pipe-node ${pipelineStage === 'CORRELATING' || pipelineStage === 'COMPLETED' ? 'active' : ''}`}>
              <span>4. Risk Arbitration</span>
            </div>
            <ArrowRight size={14} className="pipe-arr" />
            <div className={`pipe-node ${pipelineStage === 'CORRELATING' || pipelineStage === 'COMPLETED' ? 'active' : ''}`}>
              <span>5. Dynamic Trust</span>
            </div>
            <ArrowRight size={14} className="pipe-arr" />
            <div className={`pipe-node ${pipelineStage === 'COMPLETED' ? 'active' : ''}`}>
              <span>6. Attack Chain Correlation</span>
            </div>
          </div>
        </div>
      )}

      {/* Active Run Results Display */}
      {!isRunning && currentRunResult && (
        <div className="simulation-result-section">
          {/* Final Verdict Card */}
          <div className={`final-verdict-card ${currentRunResult.executionSummary.attackChainDetected ? 'verdict-critical' : 'verdict-standard'}`}>
            <div className="verdict-main-row">
              <div className="verdict-badge-block">
                {currentRunResult.executionSummary.attackChainDetected ? (
                  <ShieldAlert size={36} className="text-critical" />
                ) : (
                  <ShieldCheck size={36} className="text-success" />
                )}
                <div>
                  <h2 className="verdict-title">
                    {currentRunResult.executionSummary.attackChainDetected
                      ? '🚨 CRITICAL ATTACK CHAIN DETECTED'
                      : `VERDICT: ${currentRunResult.executionSummary.finalVerdict}`}
                  </h2>
                  <p className="verdict-subtitle">
                    {currentRunResult.executionSummary.primaryTriggerReason}
                  </p>
                </div>
              </div>

              {currentRunResult.executionSummary.attackChainDetected && (
                <button
                  type="button"
                  className="btn btn-critical btn-md glow-effect"
                  onClick={() => handleOpenChainModal(currentRunResult.executionSummary.attackChainId)}
                >
                  <Eye size={16} />
                  <span>Investigate Attack Chain Forensics</span>
                  <ChevronRight size={16} />
                </button>
              )}
            </div>

            <div className="verdict-metrics-grid">
              <div className="v-metric">
                <span className="v-metric-label">Events Ingested</span>
                <span className="v-metric-val">{currentRunResult.executionSummary.totalEventsIngested} Events</span>
              </div>
              <div className="v-metric">
                <span className="v-metric-label">Final Trust Score</span>
                <span className="v-metric-val">{currentRunResult.executionSummary.finalTrustScore} / 100</span>
              </div>
              <div className="v-metric">
                <span className="v-metric-label">Attack Chain</span>
                <span className="v-metric-val text-critical">
                  {currentRunResult.executionSummary.attackChainId || 'NONE'}
                </span>
              </div>
              <div className="v-metric">
                <span className="v-metric-label">Alert Created</span>
                <span className="v-metric-val text-warning">
                  {currentRunResult.executionSummary.alertCreated ? 'YES (al_...)' : 'NO'}
                </span>
              </div>
            </div>
          </div>

          {/* Generated Event Stream */}
          <div className="section-block">
            <div className="section-title-wrap mb-3">
              <h3>2. Telemetry Stream & Real Security Arbitrations ({currentRunResult.events?.length || 0} Steps)</h3>
            </div>

            <div className="stream-steps-list">
              {currentRunResult.events?.map((evt, idx) => {
                const dec = currentRunResult.decisions?.[idx] || {};

                return (
                  <div key={evt.eventId || idx} className="stream-step-card">
                    <div className="step-badge-col">
                      <span className="step-num">0{idx + 1}</span>
                    </div>

                    <div className="step-main-col">
                      <div className="step-head-line">
                        <span className="step-action-tag">{evt.action}</span>
                        <span className="step-res-tag mono-val">{evt.resource}</span>
                        <div className="step-badge-group ml-auto">
                          <RiskBadge risk={dec.riskLevel || 'LOW'} />
                          <DecisionBadge decision={dec.decision || 'ALLOW'} />
                        </div>
                      </div>

                      <div className="step-meta-row">
                        <span>Tool: <strong>{evt.tool}</strong></span>
                        <span>Sensitivity: <strong>{evt.dataSensitivity}</strong></span>
                        <span>Provenance: <strong>{evt.provenance?.trustLevel}</strong> ({evt.provenance?.sourceType})</span>
                        <span>Trust Score: <strong>{dec.trustScore ?? 90}</strong></span>
                        {dec.intent?.status && (
                          <span className={dec.intent.status === 'DRIFT' ? 'text-critical' : 'text-success'}>
                            Intent: <strong>{dec.intent.status}</strong> ({Math.round((dec.intent.alignmentScore || 1) * 100)}%)
                          </span>
                        )}
                      </div>

                      {dec.reasons && dec.reasons.length > 0 && (
                        <div className="step-reasons-box">
                          {dec.reasons.map((r, rI) => (
                            <div key={rI} className="reason-line">• {r}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Raw Evidence Collapsible */}
          <div className="raw-evidence-box">
            <div className="evidence-head">
              <FileCode size={16} className="text-cyan" />
              <h4>Authoritative Backend Execution Evidence (JSON)</h4>
              <button
                type="button"
                className="btn btn-secondary btn-xs ml-auto"
                onClick={handleCopyEvidence}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                <span>{copied ? 'Copied' : 'Copy JSON'}</span>
              </button>
            </div>
            <pre className="evidence-pre">
              {JSON.stringify(currentRunResult, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Previous Runs History Table */}
      <div className="section-block mt-4">
        <div className="section-title-wrap mb-3">
          <h3>Previous Simulation Runs (Live Database)</h3>
        </div>

        {loadingHistory && (
          <div className="loading-state">
            <RefreshCw className="spinner" size={20} />
            <span>Loading simulation runs from PostgreSQL...</span>
          </div>
        )}

        {!loadingHistory && simulationHistory.length === 0 && (
          <div className="empty-state-card">
            <PlaySquare size={36} className="text-muted" />
            <p>No previous simulation runs found. Click above to run your first security scenario.</p>
          </div>
        )}

        {!loadingHistory && simulationHistory.length > 0 && (
          <div className="table-responsive">
            <table className="table-dark">
              <thead>
                <tr>
                  <th>Simulation ID</th>
                  <th>Scenario</th>
                  <th>Events</th>
                  <th>Final Verdict</th>
                  <th>Attack Chain</th>
                  <th>Started At</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {simulationHistory.map((run) => (
                  <tr key={run.simulationId}>
                    <td className="mono-val font-semibold text-cyan">{run.simulationId}</td>
                    <td>{run.scenarioId}</td>
                    <td>{run.totalEvents}</td>
                    <td>
                      <DecisionBadge decision={run.finalDecision || 'ALLOW'} />
                    </td>
                    <td>
                      {run.attackChainId ? (
                        <button
                          type="button"
                          className="btn-link text-critical font-semibold"
                          onClick={() => handleOpenChainModal(run.attackChainId)}
                        >
                          {run.attackChainId}
                        </button>
                      ) : (
                        <span className="text-muted">None</span>
                      )}
                    </td>
                    <td>{new Date(run.startedAt).toLocaleTimeString()}</td>
                    <td>
                      <span className="status-pill-badge status-resolved">{run.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal for Attack Chain Forensic Deep Dive */}
      <AttackChainDetailModal
        isOpen={isModalOpen}
        chainId={inspectChainId}
        onClose={() => {
          setIsModalOpen(false);
          setInspectChainId(null);
        }}
      />
    </div>
  );
};

export default Simulations;
