import React, { useState, useEffect, useCallback } from 'react';
import {
  Zap,
  RefreshCw,
  PlusCircle,
  AlertCircle,
  FileCode,
  Shield,
} from 'lucide-react';
import { eventsApi, agentsApi, securityApi } from '../api/client';
import DecisionBadge from '../components/security/DecisionBadge';
import InvestigationModal from '../components/security/InvestigationModal';
import LiveSecurityPipelineModal from '../components/security/LiveSecurityPipelineModal';

const Events = () => {
  const [events, setEvents] = useState([]);
  const [agents, setAgents] = useState({});
  const [decisionsMap, setDecisionsMap] = useState({});
  const [sessionIdFilter, setSessionIdFilter] = useState('');
  const [agentIdFilter, setAgentIdFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Ingest Modal & Investigation Modal States
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);
  const [investigatingEvent, setInvestigatingEvent] = useState(null);
  const [inspectRawEvent, setInspectRawEvent] = useState(null);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [eventsData, agentsData] = await Promise.all([
        eventsApi.listEvents({
          sessionId: sessionIdFilter || undefined,
          agentId: agentIdFilter || undefined,
          limit: 100,
        }),
        agentsApi.listAgents(),
      ]);

      const rawEvents = eventsData.events || [];
      setEvents(rawEvents);

      const aMap = {};
      (agentsData.agents || []).forEach((a) => {
        aMap[a.agentId] = a;
      });
      setAgents(aMap);

      // Fetch decisions for visible events
      const decMap = {};
      await Promise.all(
        rawEvents.slice(0, 20).map(async (ev) => {
          try {
            const dec = await securityApi.getDecision(ev.eventId);
            decMap[ev.eventId] = dec;
          } catch {
            // Optional fallback
          }
        })
      );
      setDecisionsMap(decMap);
    } catch (err) {
      setError(err.message || 'Failed to fetch telemetry events.');
    } finally {
      setIsLoading(false);
    }
  }, [sessionIdFilter, agentIdFilter]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleEventIngested = (securityResult) => {
    fetchEvents();
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header flex-between">
        <div>
          <h2>Agent Events & Telemetry Stream</h2>
          <p className="subtitle">Real-time runtime observation and inline security engine arbitration</p>
        </div>
        <div className="header-btn-group">
          <button className="secondary-btn" onClick={fetchEvents} disabled={isLoading}>
            <RefreshCw size={16} className={isLoading ? 'spin-icon' : ''} />
            <span>Refresh Stream</span>
          </button>
          <button className="primary-btn" onClick={() => setIsIngestModalOpen(true)}>
            <PlusCircle size={16} />
            <span>Ingest Live Telemetry</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="auth-alert error mb-4">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="card mb-4 filter-bar-card">
        <div className="filters-grid">
          <div className="filter-group">
            <label htmlFor="filter-session">Filter by Session ID</label>
            <input
              id="filter-session"
              type="text"
              placeholder="e.g. sess_9988"
              value={sessionIdFilter}
              onChange={(e) => setSessionIdFilter(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label htmlFor="filter-agent">Filter by Agent ID</label>
            <input
              id="filter-agent"
              type="text"
              placeholder="e.g. agent_001"
              value={agentIdFilter}
              onChange={(e) => setAgentIdFilter(e.target.value)}
            />
          </div>
          {(sessionIdFilter || agentIdFilter) && (
            <div className="filter-reset-wrap">
              <button
                className="secondary-btn btn-sm"
                onClick={() => {
                  setSessionIdFilter('');
                  setAgentIdFilter('');
                }}
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Telemetry Stream Table */}
      <div className="card">
        <div className="card-header flex-between">
          <div className="card-title-wrap">
            <Zap size={18} className="text-accent" />
            <h3>Runtime Action Stream ({events.length})</h3>
          </div>
          <span className="text-muted text-sm">Real-time DB Evidence</span>
        </div>

        {isLoading ? (
          <div className="card-loader">
            <div className="spinner-small" />
            <span>Loading telemetry stream...</span>
          </div>
        ) : events.length === 0 ? (
          <div className="empty-card-state">
            <Zap size={36} className="text-muted mb-2" />
            <p>No telemetry events match your criteria.</p>
            <button
              className="primary-btn btn-sm mt-3"
              onClick={() => setIsIngestModalOpen(true)}
            >
              Ingest First Event
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Verdict</th>
                  <th>Event ID</th>
                  <th>Timestamp</th>
                  <th>Agent / Session</th>
                  <th>Action / Tool</th>
                  <th>Target Resource</th>
                  <th>Sensitivity</th>
                  <th>Provenance</th>
                  <th>Forensics</th>
                </tr>
              </thead>
              <tbody>
                {events.map((evt) => {
                  const dec = decisionsMap[evt.eventId];
                  const verdict = dec?.decision || (evt.dataSensitivity === 'CRITICAL' ? 'BLOCK' : 'ALLOW');
                  const risk = dec?.riskLevel || (evt.dataSensitivity === 'CRITICAL' ? 'CRITICAL' : 'LOW');

                  return (
                    <tr key={evt.eventId}>
                      <td>
                        <DecisionBadge decision={verdict} />
                      </td>
                      <td>
                        <code className="text-accent font-semibold">{evt.eventId}</code>
                      </td>
                      <td className="text-muted whitespace-nowrap">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </td>
                      <td>
                        <div className="cell-stacked">
                          <span className="font-medium">{evt.agentId}</span>
                          <span className="text-muted text-xs">{evt.sessionId}</span>
                        </div>
                      </td>
                      <td>
                        <div className="cell-stacked">
                          <code className="action-code">{evt.action}</code>
                          <span className="text-muted text-xs">{evt.tool}</span>
                        </div>
                      </td>
                      <td>
                        <code>{evt.resource}</code>
                      </td>
                      <td>
                        <span className={`sensitivity-badge ${evt.dataSensitivity.toLowerCase()}`}>
                          {evt.dataSensitivity}
                        </span>
                      </td>
                      <td>
                        <div className="cell-stacked">
                          <span className="text-xs font-semibold">{evt.provenance?.sourceType}</span>
                          <span className={`provenance-trust-tag ${evt.provenance?.trustLevel.toLowerCase()}`}>
                            {evt.provenance?.trustLevel}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="actions-cell-wrap">
                          <button
                            className="btn-forensic-inspect"
                            onClick={() => setInvestigatingEvent(evt)}
                            title="Inspect 5-Engine Analysis Trace"
                          >
                            <Shield size={13} />
                            <span>Inspect</span>
                          </button>
                          <button
                            className="icon-action-btn"
                            onClick={() => setInspectRawEvent(evt)}
                            title="View Raw Evidence JSON"
                          >
                            <FileCode size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Raw Evidence JSON Inspector Modal */}
      {inspectRawEvent && (
        <div className="modal-overlay" onClick={() => setInspectRawEvent(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <FileCode size={20} className="text-accent" />
                <h3>Event Evidence: {inspectRawEvent.eventId}</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setInspectRawEvent(null)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <pre className="json-viewer">
                {JSON.stringify(inspectRawEvent, null, 2)}
              </pre>
            </div>
            <div className="modal-footer">
              <button
                className="secondary-btn"
                onClick={() => setInspectRawEvent(null)}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Security Pipeline Ingestion Simulator Modal */}
      <LiveSecurityPipelineModal
        isOpen={isIngestModalOpen}
        onClose={() => setIsIngestModalOpen(false)}
        onEventIngested={handleEventIngested}
      />

      {/* Deep 5-Engine Forensic Investigation Modal */}
      {investigatingEvent && (
        <InvestigationModal
          event={investigatingEvent}
          agent={agents[investigatingEvent.agentId]}
          session={{ originalIntent: agents[investigatingEvent.agentId]?.declaredObjective }}
          isOpen={Boolean(investigatingEvent)}
          onClose={() => setInvestigatingEvent(null)}
        />
      )}
    </div>
  );
};

export default Events;
