import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Users,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  ShieldAlert,
  Layers,
  Key,
  Compass,
  GitBranch,
  Eye,
  Activity,
  Flame,
  PlaySquare,
  Sparkles,
} from 'lucide-react';
import { agentsApi, eventsApi, securityApi, attackChainsApi, alertsApi } from '../api/client';
import DecisionBadge from '../components/security/DecisionBadge';
import RiskBadge from '../components/security/RiskBadge';
import InvestigationModal from '../components/security/InvestigationModal';

const Overview = () => {
  const navigate = useNavigate();

  const [agents, setAgents] = useState([]);
  const [events, setEvents] = useState([]);
  const [decisionsMap, setDecisionsMap] = useState({});
  const [attackChains, setAttackChains] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Forensic Investigation Modal
  const [investigatingEvent, setInvestigatingEvent] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [agentsRes, eventsRes, chainsRes, alertsRes] = await Promise.allSettled([
        agentsApi.listAgents(),
        eventsApi.listEvents({ limit: 15 }),
        attackChainsApi.listChains(),
        alertsApi.listAlerts({ limit: 10 }),
      ]);

      const rawAgents = agentsRes.status === 'fulfilled' ? agentsRes.value.agents || [] : [];
      const rawEvents = eventsRes.status === 'fulfilled' ? eventsRes.value.events || [] : [];
      const rawChains = chainsRes.status === 'fulfilled' ? chainsRes.value.attackChains || chainsRes.value.chains || [] : [];
      const rawAlerts = alertsRes.status === 'fulfilled' ? alertsRes.value.alerts || [] : [];

      setAgents(rawAgents);
      setEvents(rawEvents);
      setAttackChains(rawChains);
      setAlerts(rawAlerts);

      // Fetch security decisions for recent events
      const decMap = {};
      await Promise.all(
        rawEvents.slice(0, 10).map(async (ev) => {
          try {
            const dec = await securityApi.getDecision(ev.eventId);
            decMap[ev.eventId] = dec;
          } catch {
            // Optional decision fallback
          }
        })
      );
      setDecisionsMap(decMap);
    } catch (err) {
      setError(err.message || 'Failed to load security operations overview.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const activeAgentsCount = agents.filter((a) => a.status === 'ACTIVE').length;
  const avgTrustScore =
    agents.length > 0
      ? Math.round(agents.reduce((acc, a) => acc + (a.currentTrustScore || 0), 0) / agents.length)
      : 100;

  return (
    <div className="page-container">
      {/* Editorial Large Hero Header */}
      <div className="editorial-hero">
        <div className="hero-left-editorial">
          <div className="hero-doodle-tag">
            <Sparkles size={13} />
            <span>AI BEHAVIORAL SECURITY // CONTINUOUS ARBITRATION</span>
          </div>

          <h1 className="hero-display-headline">
            YOUR AI FLEET IS <br />
            <span className="highlight-word">UNDER CONTROL</span>.
          </h1>

          <p className="hero-editorial-desc">
            TrustGuard continuously monitors agent directives, flags semantic intent drift,
            and detects multi-stage compound attack trajectories before damage occurs.
          </p>

          <div className="hero-stats-cloud">
            <div className="hero-stat-pill">
              <span className="h-val">{agents.length}</span>
              <span className="h-lbl">Monitored Agents ({activeAgentsCount} Active)</span>
            </div>

            <div className="hero-stat-pill">
              <span className="h-val text-coral">{attackChains.length}</span>
              <span className="h-lbl">Attack Chains</span>
            </div>

            <div className="hero-stat-pill">
              <span className="h-val text-warning">{alerts.length}</span>
              <span className="h-lbl">Open Alerts</span>
            </div>

            <button
              type="button"
              className="btn btn-primary ml-2"
              onClick={() => navigate('/simulations')}
            >
              <PlaySquare size={15} />
              <span>Launch Simulation Lab →</span>
            </button>
          </div>
        </div>

        {/* Organic Living Trust Dial */}
        <div className="hero-trust-visual">
          <div className="organic-trust-orb">
            <span className="trust-orb-num">{avgTrustScore}</span>
            <span className="trust-orb-label">Mean Trust</span>
          </div>
          <span className="trust-orb-badge">
            {avgTrustScore >= 80 ? '✓ REPUTATION INTACT' : '⚠ ANOMALY DETECTED'}
          </span>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Signature 5-Engine Visual System */}
      <div className="connected-engines-zone">
        <div className="engines-zone-header">
          <div className="engines-zone-title">
            <Shield size={20} className="text-indigo" />
            <span>5-Engine Security Architecture</span>
            <span className="text-xs text-muted font-normal ml-2">// Deterministic Arbitration Flow</span>
          </div>
          <span className="text-xs font-mono font-bold text-primary bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
            5/5 ACTIVE
          </span>
        </div>

        <div className="engines-flow-diagram">
          <div className="engine-node-card">
            <div className="node-top-bar">
              <div className="node-icon-circle bg-indigo-50 text-indigo-700">
                <Key size={16} />
              </div>
              <span className="node-num">01 // POLICY</span>
            </div>
            <div className="node-name">Authoritative Policy</div>
            <p className="node-desc">
              Compares agent actions directly against database permissions. Self-reported claims are ignored.
            </p>
            <span className="node-status-pill badge-allow">AUTHORITATIVE</span>
          </div>

          <div className="engine-node-card">
            <div className="node-top-bar">
              <div className="node-icon-circle bg-cyan-50 text-cyan-700">
                <GitBranch size={16} />
              </div>
              <span className="node-num">02 // PROVENANCE</span>
            </div>
            <div className="node-name">Source Provenance</div>
            <p className="node-desc">
              Tracks directive chain-of-custody and flags untrusted inputs or indirect injection attempts.
            </p>
            <span className="node-status-pill badge-allow">LINEAGE CHECK</span>
          </div>

          <div className="engine-node-card">
            <div className="node-top-bar">
              <div className="node-icon-circle bg-purple-50 text-purple-700">
                <Compass size={16} />
              </div>
              <span className="node-num">03 // INTENT</span>
            </div>
            <div className="node-name">Intent Integrity</div>
            <p className="node-desc">
              Measures semantic goal divergence against original session baseline (Intent Drift).
            </p>
            <span className="node-status-pill badge-allow">BASELINE DRIFT</span>
          </div>

          <div className="engine-node-card">
            <div className="node-top-bar">
              <div className="node-icon-circle bg-rose-50 text-rose-700">
                <Flame size={16} />
              </div>
              <span className="node-num">04 // RISK</span>
            </div>
            <div className="node-name">Risk & Arbitration</div>
            <p className="node-desc">
              Synthesizes signals into composite threat score yielding ALLOW, REVIEW, or BLOCK verdicts.
            </p>
            <span className="node-status-pill badge-allow">BOUNDED VERDICT</span>
          </div>

          <div className="engine-node-card">
            <div className="node-top-bar">
              <div className="node-icon-circle bg-emerald-50 text-emerald-700">
                <Shield size={16} />
              </div>
              <span className="node-num">05 // TRUST</span>
            </div>
            <div className="node-name">Dynamic Trust</div>
            <p className="node-desc">
              Updates living mathematical agent reputation score based on arbitrated actions.
            </p>
            <span className="node-status-pill badge-allow">SCORE EVOLUTION</span>
          </div>
        </div>
      </div>

      {/* Asymmetric Split Layout: Live Activity Stream & Monitored Fleet */}
      <div className="editorial-split-grid">
        {/* Left: Live Activity Timeline */}
        <div className="editorial-card">
          <div className="card-editorial-head">
            <h3>
              <Activity size={18} className="text-indigo" />
              <span>Live Security Telemetry Stream</span>
            </h3>
            <button
              type="button"
              className="btn btn-secondary btn-xs"
              onClick={() => navigate('/events')}
            >
              All Events →
            </button>
          </div>

          {isLoading ? (
            <div className="loading-state">
              <RefreshCw className="spinner" size={18} />
              <span>Streaming telemetry from PostgreSQL...</span>
            </div>
          ) : events.length === 0 ? (
            <div className="empty-state-card">
              <Zap size={32} />
              <p>No telemetry events recorded yet. Run a simulation to generate live traffic.</p>
            </div>
          ) : (
            <div className="editorial-timeline-list">
              {events.slice(0, 6).map((evt) => {
                const dec = decisionsMap[evt.eventId];
                const verdict = dec?.decision || (evt.dataSensitivity === 'CRITICAL' ? 'BLOCK' : 'ALLOW');
                const risk = dec?.riskLevel || (evt.dataSensitivity === 'CRITICAL' ? 'CRITICAL' : 'LOW');

                return (
                  <div key={evt.eventId} className="editorial-event-row">
                    <span className="event-time-stamp">
                      {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>

                    <span className="event-agent-tag">
                      {evt.agentId || 'agent_001'}
                    </span>

                    <span className="event-action-text">{evt.action}</span>

                    <span className="event-resource-code" title={evt.resource}>
                      {evt.resource}
                    </span>

                    <div className="event-badges-col">
                      <RiskBadge risk={risk} />
                      <DecisionBadge decision={verdict} />

                      <button
                        type="button"
                        className="btn btn-secondary btn-xs ml-1"
                        onClick={() => setInvestigatingEvent(evt)}
                        title="Forensic Evidence Inspection"
                      >
                        <Eye size={12} />
                        <span>Inspect</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Monitored Agent Fleet */}
        <div className="editorial-card">
          <div className="card-editorial-head">
            <h3>
              <Users size={18} className="text-secondary" />
              <span>Monitored Agent Fleet</span>
            </h3>
            <button
              type="button"
              className="btn btn-secondary btn-xs"
              onClick={() => navigate('/agents')}
            >
              Fleet Matrix →
            </button>
          </div>

          {isLoading ? (
            <div className="loading-state">
              <RefreshCw className="spinner" size={18} />
              <span>Loading fleet records...</span>
            </div>
          ) : agents.length === 0 ? (
            <div className="empty-state-card">
              <Users size={32} />
              <p>No agents registered in database.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {agents.map((ag) => (
                <div
                  key={ag.agentId}
                  className="p-3 bg-canvas-bg border border-border rounded-lg flex items-center justify-between transition-transform hover:-translate-y-0.5"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{ag.name}</span>
                      <span className="font-mono text-xs text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded font-semibold">
                        {ag.agentId}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 max-w-[260px] truncate italic">
                      "{ag.declaredObjective}"
                    </p>
                  </div>

                  <div className="text-right flex flex-col items-end">
                    <span className={`text-xs font-bold ${ag.currentTrustScore >= 80 ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {ag.currentTrustScore} / 100
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Trust Reputation
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Forensic Investigation Modal */}
      {investigatingEvent && (
        <InvestigationModal
          event={investigatingEvent}
          agent={agents.find((a) => a.agentId === investigatingEvent.agentId)}
          session={{
            originalIntent:
              agents.find((a) => a.agentId === investigatingEvent.agentId)?.declaredObjective ||
              'Analyze quarterly financial telemetry',
          }}
          isOpen={Boolean(investigatingEvent)}
          onClose={() => setInvestigatingEvent(null)}
        />
      )}
    </div>
  );
};

export default Overview;
