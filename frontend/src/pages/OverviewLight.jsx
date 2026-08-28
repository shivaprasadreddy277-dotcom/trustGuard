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
} from 'lucide-react';
import { agentsApi, eventsApi, securityApi, attackChainsApi, alertsApi } from '../api/client';
import DecisionBadge from '../components/security/DecisionBadge';
import RiskBadge from '../components/security/RiskBadge';
import InvestigationModal from '../components/security/InvestigationModal';

const OverviewLight = () => {
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
            // Decision fetch optional
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
      {/* Top Header */}
      <div className="page-header">
        <div>
          <div className="title-row">
            <Shield className="header-icon text-indigo" size={26} />
            <h1>Security Operations Command Center</h1>
          </div>
          <p className="page-subtitle">
            Autonomous multi-engine AI behavioral monitoring, intent drift prevention, and attack chain correlation.
          </p>
        </div>
        <div className="header-btn-group">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchDashboardData}
            disabled={isLoading}
          >
            <RefreshCw size={15} className={isLoading ? 'spinner' : ''} />
            <span>Refresh Telemetry</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/simulations')}
          >
            <PlaySquare size={16} />
            <span>Launch Simulation Lab</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Hero Security Posture Summary Card */}
      <div className="section-block posture-hero-card">
        <div className="posture-hero-left">
          <div className="posture-pill">
            <span className="dot-live" />
            <span>CONTINUOUS EVALUATION ACTIVE</span>
          </div>
          <h2 className="posture-title">AI Fleet Security Posture</h2>
          <p className="posture-desc">
            All ingested agent actions pass through Authoritative Policy, Origin Provenance,
            Intent Integrity, Risk Arbitration, and Dynamic Trust engines in real-time.
          </p>

          <div className="posture-quick-stats">
            <div className="quick-stat-item">
              <span className="q-label">Fleet Trust Score</span>
              <span className={`q-val ${avgTrustScore >= 80 ? 'text-success' : 'text-warning'}`}>
                {avgTrustScore} / 100
              </span>
            </div>
            <div className="quick-stat-item">
              <span className="q-label">Active Agents</span>
              <span className="q-val text-indigo">{activeAgentsCount}</span>
            </div>
            <div className="quick-stat-item">
              <span className="q-label">Attack Chains</span>
              <span className="q-val text-critical">{attackChains.length}</span>
            </div>
            <div className="quick-stat-item">
              <span className="q-label">Active Alerts</span>
              <span className="q-val text-warning">{alerts.length}</span>
            </div>
          </div>
        </div>

        <div className="posture-hero-right">
          <div className="trust-radial-card">
            <div className="radial-inner-badge">
              <Shield size={32} className={avgTrustScore >= 80 ? 'text-success' : 'text-warning'} />
              <span className="radial-score">{avgTrustScore}</span>
              <span className="radial-label">Mean Trust</span>
            </div>
            <span className="posture-status-badge">
              {avgTrustScore >= 80 ? 'REPUTATION INTACT' : 'ANOMALY DETECTED'}
            </span>
          </div>
        </div>
      </div>

      {/* 5-Engine Architecture Pipeline Flow Diagram */}
      <div className="section-block">
        <div className="section-title-wrap mb-3">
          <h3>TrustGuard 5-Engine Security Pipeline</h3>
          <span className="text-muted text-xs">Deterministic multi-layer security evaluation</span>
        </div>

        <div className="five-engines-pipeline">
          <div className="engine-step-box">
            <div className="engine-step-head">
              <Key size={16} className="text-indigo" />
              <h4>1. Policy Engine</h4>
            </div>
            <p className="engine-step-desc">Authoritative database permission verification</p>
            <span className="engine-step-status">VERIFIED ONLY</span>
          </div>

          <ArrowRight size={16} className="engine-flow-arrow" />

          <div className="engine-step-box">
            <div className="engine-step-head">
              <GitBranch size={16} className="text-cyan" />
              <h4>2. Provenance</h4>
            </div>
            <p className="engine-step-desc">Directive chain-of-custody & injection detection</p>
            <span className="engine-step-status">TRUSTED ORIGIN</span>
          </div>

          <ArrowRight size={16} className="engine-flow-arrow" />

          <div className="engine-step-box">
            <div className="engine-step-head">
              <Compass size={16} className="text-indigo" />
              <h4>3. Intent Integrity</h4>
            </div>
            <p className="engine-step-desc">Semantic objective baseline drift measurement</p>
            <span className="engine-step-status">GOAL ALIGNED</span>
          </div>

          <ArrowRight size={16} className="engine-flow-arrow" />

          <div className="engine-step-box">
            <div className="engine-step-head">
              <Flame size={16} className="text-critical" />
              <h4>4. Risk & Decision</h4>
            </div>
            <p className="engine-step-desc">Composite threat scoring (ALLOW / REVIEW / BLOCK)</p>
            <span className="engine-step-status">BOUNDED ARBITRATION</span>
          </div>

          <ArrowRight size={16} className="engine-flow-arrow" />

          <div className="engine-step-box">
            <div className="engine-step-head">
              <Shield size={16} className="text-success" />
              <h4>5. Dynamic Trust</h4>
            </div>
            <p className="engine-step-desc">Living mathematical agent reputation updates</p>
            <span className="engine-step-status">SCORE UPDATED</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Telemetry Activity Stream & Agent Fleet */}
      <div className="overview-split-layout">
        {/* Left: Live Activity Timeline */}
        <div className="section-block flex-1">
          <div className="section-title-wrap mb-3">
            <div className="title-row">
              <Activity size={18} className="text-indigo" />
              <h3>Live Security Activity Stream</h3>
            </div>
            <button
              type="button"
              className="btn-link text-xs"
              onClick={() => navigate('/events')}
            >
              View Full Telemetry →
            </button>
          </div>

          {isLoading ? (
            <div className="loading-state">
              <RefreshCw className="spinner" size={18} />
              <span>Loading live telemetry...</span>
            </div>
          ) : events.length === 0 ? (
            <div className="empty-state-card">
              <Zap size={32} />
              <p>No telemetry events ingested yet. Run a simulation to generate events.</p>
            </div>
          ) : (
            <div className="telemetry-timeline-list">
              {events.slice(0, 7).map((evt) => {
                const dec = decisionsMap[evt.eventId];
                const verdict = dec?.decision || (evt.dataSensitivity === 'CRITICAL' ? 'BLOCK' : 'ALLOW');
                const risk = dec?.riskLevel || (evt.dataSensitivity === 'CRITICAL' ? 'CRITICAL' : 'LOW');

                return (
                  <div key={evt.eventId} className="timeline-event-row">
                    <div className="t-time">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </div>
                    <div className="t-body">
                      <div className="t-top-line">
                        <span className="t-agent mono-val font-semibold text-indigo">
                          {evt.agentId || 'agent_001'}
                        </span>
                        <span className="t-action font-semibold">{evt.action}</span>
                        <span className="t-resource mono-val text-muted">
                          {evt.resource}
                        </span>
                        <div className="t-badges ml-auto">
                          <RiskBadge risk={risk} />
                          <DecisionBadge decision={verdict} />
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs"
                      onClick={() => setInvestigatingEvent(evt)}
                      title="Inspect Forensic Evidence"
                    >
                      <Eye size={12} />
                      <span>Inspect</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Monitored Agent Fleet */}
        <div className="section-block flex-1">
          <div className="section-title-wrap mb-3">
            <div className="title-row">
              <Users size={18} className="text-secondary" />
              <h3>Monitored Agent Fleet</h3>
            </div>
            <button
              type="button"
              className="btn-link text-xs"
              onClick={() => navigate('/agents')}
            >
              Fleet Directory →
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
            <div className="agents-fleet-mini-list">
              {agents.map((agent) => (
                <div key={agent.agentId} className="agent-mini-card">
                  <div className="agent-mini-head">
                    <div>
                      <h4 className="agent-name">{agent.name}</h4>
                      <span className="mono-val text-xs text-muted">{agent.agentId}</span>
                    </div>
                    <span className={`status-pill-badge status-${agent.status.toLowerCase()}`}>
                      {agent.status}
                    </span>
                  </div>

                  <p className="agent-obj-text">{agent.declaredObjective}</p>

                  <div className="agent-mini-footer">
                    <span className="text-xs text-muted">Trust Reputation:</span>
                    <span className={`font-bold text-sm ${agent.currentTrustScore >= 80 ? 'text-success' : 'text-warning'}`}>
                      {agent.currentTrustScore} / 100
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

export default OverviewLight;
