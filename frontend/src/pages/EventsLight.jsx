import React, { useState, useEffect, useCallback } from 'react';
import {
  Zap,
  RefreshCw,
  Plus,
  Search,
  Filter,
  Eye,
  AlertTriangle,
  Send,
  FileCode,
} from 'lucide-react';
import { eventsApi, agentsApi, sessionsApi } from '../api/client';
import DecisionBadge from '../components/security/DecisionBadge';
import RiskBadge from '../components/security/RiskBadge';
import InvestigationModal from '../components/security/InvestigationModal';

const EventsLight = () => {
  const [events, setEvents] = useState([]);
  const [agents, setAgents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sensitivityFilter, setSensitivityFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Ingest Event Modal
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestError, setIngestError] = useState(null);
  const [ingestPayload, setIngestPayload] = useState({
    sessionId: '',
    agentId: '',
    action: 'query_db',
    tool: 'database_connector',
    resource: 'NovaCorp_Credentials',
    dataSensitivity: 'HIGH',
    authorization: {
      status: 'ALLOWED',
      requiredPermission: 'db.read',
      grantedPermissions: ['db.read'],
    },
    provenance: {
      sourceType: 'EXTERNAL_DOCUMENT',
      sourceId: 'untrusted_input.txt',
      trustLevel: 'UNTRUSTED',
    },
  });

  // Forensic Investigation Modal
  const [selectedEvent, setSelectedEvent] = useState(null);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [evRes, agRes, sessRes] = await Promise.allSettled([
        eventsApi.listEvents({ limit: 50 }),
        agentsApi.listAgents(),
        sessionsApi.listSessions(),
      ]);

      const rawEvents = evRes.status === 'fulfilled' ? evRes.value.events || [] : [];
      const rawAgents = agRes.status === 'fulfilled' ? agRes.value.agents || [] : [];
      const rawSessions = sessRes.status === 'fulfilled' ? sessRes.value.sessions || [] : [];

      setEvents(rawEvents);
      setAgents(rawAgents);
      setSessions(rawSessions);

      if (rawSessions.length > 0 && !ingestPayload.sessionId) {
        setIngestPayload((prev) => ({
          ...prev,
          sessionId: rawSessions[0].sessionId,
          agentId: rawSessions[0].agentId || (rawAgents[0]?.agentId || 'agent_001'),
        }));
      }
    } catch (err) {
      setError(err.message || 'Failed to load telemetry events.');
    } finally {
      setIsLoading(false);
    }
  }, [ingestPayload.sessionId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleIngestEvent = async (e) => {
    e.preventDefault();
    setIsIngesting(true);
    setIngestError(null);
    try {
      const eventId = `evt_manual_${Date.now()}`;
      await eventsApi.ingestEvent({
        eventId,
        ...ingestPayload,
      });

      setShowIngestModal(false);
      fetchEvents();
    } catch (err) {
      setIngestError(err.message || 'Event ingestion failed.');
    } finally {
      setIsIngesting(false);
    }
  };

  const filteredEvents = events.filter((ev) => {
    if (sensitivityFilter !== 'ALL' && ev.dataSensitivity !== sensitivityFilter) {
      return false;
    }
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      ev.eventId?.toLowerCase().includes(q) ||
      ev.action?.toLowerCase().includes(q) ||
      ev.resource?.toLowerCase().includes(q) ||
      ev.tool?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="title-row">
            <Zap className="header-icon text-indigo" size={26} />
            <h1>Real-Time Evidence & Telemetry Stream</h1>
          </div>
          <p className="page-subtitle">
            Ingested agent execution actions, directive provenance, reported claims, and authoritative security results.
          </p>
        </div>
        <div className="header-btn-group">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchEvents}
            disabled={isLoading}
          >
            <RefreshCw size={15} className={isLoading ? 'spinner' : ''} />
            <span>Refresh Telemetry</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowIngestModal(true)}
          >
            <Plus size={16} />
            <span>Ingest Test Event</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="section-block">
        <div className="chains-filter-bar">
          <div className="filter-search-box">
            <Search size={16} className="text-muted" />
            <input
              type="text"
              placeholder="Search by event ID, action, resource, tool..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={15} className="text-muted" />
            <select
              className="filter-select"
              value={sensitivityFilter}
              onChange={(e) => setSensitivityFilter(e.target.value)}
            >
              <option value="ALL">All Sensitivity Levels</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Events Table */}
      <div className="section-block">
        <div className="section-title-wrap mb-3">
          <h3>Ingested Agent Events ({filteredEvents.length})</h3>
        </div>

        {isLoading ? (
          <div className="loading-state">
            <RefreshCw className="spinner" size={20} />
            <span>Streaming telemetry from PostgreSQL...</span>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="empty-state-card">
            <Zap size={36} />
            <p>No telemetry events matching filter criteria.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table-dark">
              <thead>
                <tr>
                  <th>Event ID</th>
                  <th>Timestamp</th>
                  <th>Agent & Action</th>
                  <th>Target Resource</th>
                  <th>Sensitivity</th>
                  <th>Provenance</th>
                  <th>Decision</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((evt) => {
                  const decision = evt.dataSensitivity === 'CRITICAL' ? 'BLOCK' : 'ALLOW';
                  const risk = evt.dataSensitivity === 'CRITICAL' ? 'CRITICAL' : 'LOW';

                  return (
                    <tr key={evt.eventId}>
                      <td className="mono-val font-semibold text-indigo">{evt.eventId}</td>
                      <td className="text-xs text-slate-500">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </td>
                      <td>
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800">{evt.action}</span>
                          <span className="text-xs text-slate-400 mono-val">{evt.tool}</span>
                        </div>
                      </td>
                      <td>
                        <code className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                          {evt.resource}
                        </code>
                      </td>
                      <td>
                        <RiskBadge risk={evt.dataSensitivity || 'LOW'} />
                      </td>
                      <td>
                        <div className="text-xs">
                          <span className="font-semibold text-slate-700 block">
                            {evt.provenance?.trustLevel || 'TRUSTED'}
                          </span>
                          <span className="text-slate-400">
                            {evt.provenance?.sourceType || 'USER'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <DecisionBadge decision={decision} />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary btn-xs"
                          onClick={() => setSelectedEvent(evt)}
                        >
                          <Eye size={12} />
                          <span>Forensics</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Event Ingestion Modal */}
      {showIngestModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>Ingest Synthetic Agent Telemetry Event</h3>
              <button
                type="button"
                className="btn btn-secondary btn-xs"
                onClick={() => setShowIngestModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleIngestEvent}>
              <div className="modal-body flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Session
                    </label>
                    <select
                      className="w-full"
                      value={ingestPayload.sessionId}
                      onChange={(e) =>
                        setIngestPayload({ ...ingestPayload, sessionId: e.target.value })
                      }
                      required
                    >
                      {sessions.map((s) => (
                        <option key={s.sessionId} value={s.sessionId}>
                          {s.sessionId} ({s.agentId})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Agent ID
                    </label>
                    <input
                      type="text"
                      className="w-full"
                      value={ingestPayload.agentId}
                      onChange={(e) =>
                        setIngestPayload({ ...ingestPayload, agentId: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Action
                    </label>
                    <input
                      type="text"
                      className="w-full"
                      value={ingestPayload.action}
                      onChange={(e) =>
                        setIngestPayload({ ...ingestPayload, action: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Tool
                    </label>
                    <input
                      type="text"
                      className="w-full"
                      value={ingestPayload.tool}
                      onChange={(e) =>
                        setIngestPayload({ ...ingestPayload, tool: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Target Resource
                  </label>
                  <input
                    type="text"
                    className="w-full"
                    value={ingestPayload.resource}
                    onChange={(e) =>
                      setIngestPayload({ ...ingestPayload, resource: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Data Sensitivity
                    </label>
                    <select
                      className="w-full"
                      value={ingestPayload.dataSensitivity}
                      onChange={(e) =>
                        setIngestPayload({ ...ingestPayload, dataSensitivity: e.target.value })
                      }
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Provenance Trust Level
                    </label>
                    <select
                      className="w-full"
                      value={ingestPayload.provenance.trustLevel}
                      onChange={(e) =>
                        setIngestPayload({
                          ...ingestPayload,
                          provenance: {
                            ...ingestPayload.provenance,
                            trustLevel: e.target.value,
                          },
                        })
                      }
                    >
                      <option value="TRUSTED">TRUSTED</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="UNTRUSTED">UNTRUSTED</option>
                    </select>
                  </div>
                </div>

                {ingestError && (
                  <div className="error-banner text-xs">
                    <AlertTriangle size={14} />
                    <span>{ingestError}</span>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowIngestModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isIngesting}
                >
                  <Send size={14} />
                  <span>{isIngesting ? 'Ingesting...' : 'Ingest & Evaluate'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Forensic Modal */}
      {selectedEvent && (
        <InvestigationModal
          event={selectedEvent}
          agent={agents.find((a) => a.agentId === selectedEvent.agentId)}
          session={sessions.find((s) => s.sessionId === selectedEvent.sessionId)}
          isOpen={Boolean(selectedEvent)}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
};

export default EventsLight;
