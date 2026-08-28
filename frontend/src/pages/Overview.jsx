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
  PlusCircle,
} from 'lucide-react';
import { agentsApi, eventsApi } from '../api/client';

const Overview = () => {
  const navigate = useNavigate();

  const [agents, setAgents] = useState([]);
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [agentsRes, eventsRes] = await Promise.allSettled([
        agentsApi.listAgents(),
        eventsApi.listEvents({ limit: 10 }),
      ]);

      if (agentsRes.status === 'fulfilled') {
        setAgents(agentsRes.value.agents || []);
      }
      if (eventsRes.status === 'fulfilled') {
        setEvents(eventsRes.value.events || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load telemetry summary.');
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

  return (
    <div className="page-container">
      <div className="page-header flex-between">
        <div>
          <h2>Security Operations Overview</h2>
          <p className="subtitle">Real-time AI agent telemetry & trust reputation monitoring</p>
        </div>
        <div className="header-btn-group">
          <button className="secondary-btn" onClick={fetchDashboardData} disabled={isLoading}>
            <RefreshCw size={16} className={isLoading ? 'spin-icon' : ''} />
            <span>Refresh Telemetry</span>
          </button>
          <button className="primary-btn" onClick={() => navigate('/sessions')}>
            <PlusCircle size={16} />
            <span>New Agent Session</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="auth-alert error mb-4">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Row */}
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
              {avgTrustScore >= 80 ? 'Authoritative baseline intact' : 'Degraded trust detected'}
            </span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Telemetry Events Ingested</span>
            <div className="metric-icon-wrap purple">
              <Zap size={20} />
            </div>
          </div>
          <div className="metric-value">{isLoading ? '...' : events.length}</div>
          <div className="metric-subtext text-muted">
            Continuous event stream active
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Security Ingestion Pipeline</span>
            <div className="metric-icon-wrap emerald">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="metric-value text-success text-2xl font-bold">ACTIVE</div>
          <div className="metric-subtext text-muted">
            Cycle 2.4 Ingestion Engine connected
          </div>
        </div>
      </div>

      {/* Main Grid: Agents Summary & Recent Events */}
      <div className="overview-split-grid">
        {/* Left: Registered Agents */}
        <div className="card">
          <div className="card-header flex-between">
            <div className="card-title-wrap">
              <Users size={18} className="text-accent" />
              <h3>Registered Agents</h3>
            </div>
            <button className="text-btn" onClick={() => navigate('/agents')}>
              View All <ArrowUpRight size={14} />
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
                    <div className="trust-meter-small">
                      <div
                        className="trust-fill"
                        style={{
                          width: `${agent.currentTrustScore}%`,
                          backgroundColor:
                            agent.currentTrustScore >= 80
                              ? 'var(--status-allow)'
                              : agent.currentTrustScore >= 50
                              ? 'var(--status-review)'
                              : 'var(--status-block)',
                        }}
                      />
                    </div>
                    <span className="trust-score-label">{agent.currentTrustScore} / 100</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Live Event Telemetry Feed */}
        <div className="card">
          <div className="card-header flex-between">
            <div className="card-title-wrap">
              <Zap size={18} className="text-accent" />
              <h3>Recent Ingested Events</h3>
            </div>
            <button className="text-btn" onClick={() => navigate('/events')}>
              Full Telemetry <ArrowUpRight size={14} />
            </button>
          </div>

          {isLoading ? (
            <div className="card-loader">
              <div className="spinner-small" />
              <span>Loading event stream...</span>
            </div>
          ) : events.length === 0 ? (
            <div className="empty-card-state">
              <Zap size={32} className="text-muted mb-2" />
              <p>No telemetry events ingested yet.</p>
              <button
                className="secondary-btn btn-sm mt-3"
                onClick={() => navigate('/events')}
              >
                Ingest Test Event
              </button>
            </div>
          ) : (
            <div className="event-mini-list">
              {events.slice(0, 5).map((evt) => (
                <div key={evt.eventId} className="event-mini-item">
                  <div className="event-mini-top">
                    <span className="code-tag">{evt.eventId}</span>
                    <span className={`sensitivity-badge ${evt.dataSensitivity.toLowerCase()}`}>
                      {evt.dataSensitivity}
                    </span>
                    <span className="event-time">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="event-action-desc">
                    <strong>{evt.tool}</strong>: <code>{evt.action}</code>
                  </div>
                  <div className="event-resource-row">
                    <span>Target: <code>{evt.resource}</code></span>
                    <span className="text-muted">Provenance: {evt.provenance?.sourceType}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Overview;
