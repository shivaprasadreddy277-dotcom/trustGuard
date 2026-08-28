import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Users,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  RefreshCw,
  ShieldAlert,
  Flame,
  Key,
  Compass,
  GitBranch,
  Eye,
} from 'lucide-react';
import { agentsApi, eventsApi, securityApi } from '../api/client';
import DecisionBadge from '../components/security/DecisionBadge';
import RiskBadge from '../components/security/RiskBadge';
import TrustScoreMeter from '../components/security/TrustScoreMeter';
import InvestigationModal from '../components/security/InvestigationModal';

const Overview = () => {
  const navigate = useNavigate();

  const [agents, setAgents] = useState([]);
  const [events, setEvents] = useState([]);
  const [decisionsMap, setDecisionsMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Investigation Modal
  const [investigatingEvent, setInvestigatingEvent] = useState(null);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [agentsRes, eventsRes] = await Promise.allSettled([
        agentsApi.listAgents(),
        eventsApi.listEvents({ limit: 20 }),
      ]);

      const rawAgents = agentsRes.status === 'fulfilled' ? agentsRes.value.agents || [] : [];
      const rawEvents = eventsRes.status === 'fulfilled' ? eventsRes.value.events || [] : [];

      setAgents(rawAgents);
      setEvents(rawEvents);

      // Fetch security decisions for recent events
      const decMap = {};
      await Promise.all(
        rawEvents.slice(0, 10).map(async (ev) => {
          try {
            const dec = await securityApi.getDecision(ev.eventId);
            decMap[ev.eventId] = dec;
          } catch {
            // Optional legacy fallback
          }
        })
      );
      setDecisionsMap(decMap);
    } catch (err) {
      setError(err.message || 'Failed to load security overview.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const activeAgentsCount = agents.filter((a) => a.status === 'ACTIVE').length;
  const suspendedAgentsCount = agents.filter((a) => a.status === 'SUSPENDED').length;
  const avgTrustScore =
    agents.length > 0
      ? Math.round(agents.reduce((acc, a) => acc + (a.currentTrustScore || 0), 0) / agents.length)
      : 100;

  const blockCount = events.filter((e) => decisionsMap[e.eventId]?.decision === 'BLOCK').length;
  const reviewCount = events.filter((e) => decisionsMap[e.eventId]?.decision === 'REVIEW').length;
  const allowCount = events.filter((e) => decisionsMap[e.eventId]?.decision === 'ALLOW').length;

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header flex-between">
        <div>
          <h2>Security Operations Center</h2>
          <p className="subtitle">Real-time AI continuous security arbitration, trust reputation, and threat prevention</p>
        </div>
        <div className="header-btn-group">
          <button className="secondary-btn" onClick={fetchDashboardData} disabled={isLoading}>
            <RefreshCw size={16} className={isLoading ? 'spin-icon' : ''} />
            <span>Refresh SOC</span>
          </button>
          <button className="primary-btn" onClick={() => navigate('/events')}>
            <Zap size={16} />
            <span>Test Telemetry Stream</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="auth-alert error mb-4">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Primary SOC Metrics Row */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Monitored AI Agents</span>
            <div className="metric-icon-wrap blue">
              <Users size={20} />
            </div>
          </div>
          <div className="metric-value">{isLoading ? '...' : agents.length}</div>
          <div className="metric-subtext">
            <span className="text-success font-medium">{activeAgentsCount} Active</span>
            {suspendedAgentsCount > 0 && (
              <span className="text-warning font-medium ml-2">({suspendedAgentsCount} Suspended)</span>
            )}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Mean Agent Trust Score</span>
            <div className="metric-icon-wrap green">
              <Shield size={20} />
            </div>
          </div>
          <div className="metric-value">
            {isLoading ? '...' : `${avgTrustScore}/100`}
          </div>
          <div className="metric-subtext">
            <span className={avgTrustScore >= 80 ? 'text-success' : 'text-warning'}>
              {avgTrustScore >= 80 ? 'Authoritative reputation intact' : 'Degraded trust detected'}
            </span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Security Decisions Arbitrated</span>
            <div className="metric-icon-wrap red">
              <ShieldAlert size={20} />
            </div>
          </div>
          <div className="metric-value">{isLoading ? '...' : events.length}</div>
          <div className="metric-subtext">
            <span className="text-danger font-medium">{blockCount} Blocked</span>
            <span className="text-warning font-medium ml-2">{reviewCount} Review</span>
            <span className="text-success font-medium ml-2">{allowCount} Allowed</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Security Intelligence Pipeline</span>
            <div className="metric-icon-wrap emerald">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="metric-value text-success text-2xl font-bold">ACTIVE</div>
          <div className="metric-subtext text-muted">
            5 Engines Arbitrating (Cycle 3)
          </div>
        </div>
      </div>

      {/* Continuous Security Engines Status Bar */}
      <div className="engines-status-banner">
        <div className="engines-banner-header">
          <Shield size={16} className="text-cyan" />
          <span className="font-semibold">TrustGuard Multi-Engine Security Architecture (Cycle 3)</span>
        </div>
        <div className="engines-chips-grid">
          <div className="engine-status-tag">
            <Key size={13} className="text-blue" />
            <span>3.1 Policy Engine: <strong>Authoritative</strong></span>
          </div>
          <div className="engine-status-tag">
            <GitBranch size={13} className="text-cyan" />
            <span>3.2 Provenance Engine: <strong>Active</strong></span>
          </div>
          <div className="engine-status-tag">
            <Compass size={13} className="text-indigo" />
            <span>3.3 Intent Integrity: <strong>Active</strong></span>
          </div>
          <div className="engine-status-tag">
            <Flame size={13} className="text-red" />
            <span>3.4 Risk & Decision: <strong>Active</strong></span>
          </div>
          <div className="engine-status-tag">
            <Shield size={13} className="text-emerald" />
            <span>3.5 Dynamic Trust: <strong>Active</strong></span>
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Arbitrated Decisions & Registered Agents */}
      <div className="overview-split-grid">
        {/* Left: Recent Security Decisions */}
        <div className="card">
          <div className="card-header flex-between">
            <div className="card-title-wrap">
              <ShieldAlert size={18} className="text-accent" />
              <h3>Recent Security Decisions</h3>
            </div>
            <button className="text-btn" onClick={() => navigate('/decisions')}>
              Decision Center <ArrowUpRight size={14} />
            </button>
          </div>

          {isLoading ? (
            <div className="card-loader">
              <div className="spinner-small" />
              <span>Loading security decisions...</span>
            </div>
          ) : events.length === 0 ? (
            <div className="empty-card-state">
              <Zap size={32} className="text-muted mb-2" />
              <p>No security telemetry events ingested yet.</p>
              <button
                className="secondary-btn btn-sm mt-3"
                onClick={() => navigate('/events')}
              >
                Ingest Test Event
              </button>
            </div>
          ) : (
            <div className="event-mini-list">
              {events.slice(0, 6).map((evt) => {
                const dec = decisionsMap[evt.eventId];
                const verdict = dec?.decision || (evt.dataSensitivity === 'CRITICAL' ? 'BLOCK' : 'ALLOW');
                const risk = dec?.riskLevel || (evt.dataSensitivity === 'CRITICAL' ? 'CRITICAL' : 'LOW');

                return (
                  <div key={evt.eventId} className="event-mini-item">
                    <div className="event-mini-top">
                      <DecisionBadge decision={verdict} />
                      <RiskBadge riskLevel={risk} />
                      <span className="code-tag">{evt.eventId}</span>
                      <span className="event-time">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="event-action-desc">
                      <strong>{evt.tool}</strong>: <code>{evt.action}</code>
                    </div>
                    <div className="event-resource-row flex-between">
                      <span>Target: <code>{evt.resource}</code></span>
                      <button
                        className="btn-text-action"
                        onClick={() => setInvestigatingEvent(evt)}
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

        {/* Right: Monitored Agents & Dynamic Trust */}
        <div className="card">
          <div className="card-header flex-between">
            <div className="card-title-wrap">
              <Users size={18} className="text-accent" />
              <h3>Monitored AI Agents</h3>
            </div>
            <button className="text-btn" onClick={() => navigate('/agents')}>
              Agent Registry <ArrowUpRight size={14} />
            </button>
          </div>

          {isLoading ? (
            <div className="card-loader">
              <div className="spinner-small" />
              <span>Loading agent profiles...</span>
            </div>
          ) : agents.length === 0 ? (
            <div className="empty-card-state">
              <Users size={32} className="text-muted mb-2" />
              <p>No agents registered in database yet.</p>
            </div>
          ) : (
            <div className="agent-mini-list">
              {agents.map((agent) => (
                <div key={agent.agentId} className="agent-mini-item">
                  <div className="agent-mini-info">
                    <div className="agent-name-row">
                      <span className="font-semibold">{agent.name}</span>
                      <span className="code-tag">{agent.agentId}</span>
                    </div>
                    <p className="agent-objective-snip">{agent.declaredObjective}</p>
                  </div>
                  <div className="agent-mini-stats">
                    <span className={`status-pill ${agent.status.toLowerCase()}`}>
                      {agent.status}
                    </span>
                    <TrustScoreMeter score={agent.currentTrustScore} size="compact" />
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
          session={{ originalIntent: agents.find((a) => a.agentId === investigatingEvent.agentId)?.declaredObjective }}
          isOpen={Boolean(investigatingEvent)}
          onClose={() => setInvestigatingEvent(null)}
        />
      )}
    </div>
  );
};

export default Overview;
