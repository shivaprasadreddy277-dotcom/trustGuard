import React, { useState, useEffect } from 'react';
import {
  Zap,
  RefreshCw,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  FileCode,
  X,
  Send,
  Eye,
} from 'lucide-react';
import { eventsApi } from '../api/client';

const Events = () => {
  const [events, setEvents] = useState([]);
  const [sessionIdFilter, setSessionIdFilter] = useState('');
  const [agentIdFilter, setAgentIdFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Ingest Event Modal State
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestError, setIngestError] = useState('');
  const [ingestResult, setIngestResult] = useState(null);

  const [eventForm, setEventForm] = useState(() => ({
    eventId: `evt_${Date.now().toString(36)}`,
    sessionId: 'sess_9988',
    agentId: 'agent_001',
    parentAgentId: '',
    action: 'database_connector.query',
    tool: 'database_connector',
    resource: 'NovaCorp_DB',
    dataSensitivity: 'HIGH',
    authStatus: 'ALLOWED',
    requiredPermission: 'reports.read',
    grantedPermissions: 'reports.read, network.send',
    provenanceSourceType: 'EXTERNAL_DOCUMENT',
    provenanceSourceId: 'doc_001',
    provenanceTrustLevel: 'UNTRUSTED',
  }));

  // Selected event for raw JSON inspector
  const [inspectEvent, setInspectEvent] = useState(null);

  const fetchEvents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await eventsApi.listEvents({
        sessionId: sessionIdFilter || undefined,
        agentId: agentIdFilter || undefined,
        limit: 100,
      });
      setEvents(data.events || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch telemetry events.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [sessionIdFilter, agentIdFilter]);

  const handleIngestSubmit = async (e) => {
    e.preventDefault();
    setIsIngesting(true);
    setIngestError('');
    setIngestResult(null);

    try {
      const payload = {
        eventId: eventForm.eventId.trim(),
        sessionId: eventForm.sessionId.trim(),
        agentId: eventForm.agentId.trim(),
        parentAgentId: eventForm.parentAgentId.trim() || null,
        timestamp: new Date().toISOString(),
        action: eventForm.action.trim(),
        tool: eventForm.tool.trim(),
        resource: eventForm.resource.trim(),
        dataSensitivity: eventForm.dataSensitivity,
        authorization: {
          status: eventForm.authStatus,
          requiredPermission: eventForm.requiredPermission.trim() || null,
          grantedPermissions: eventForm.grantedPermissions
            ? eventForm.grantedPermissions.split(',').map((p) => p.trim()).filter(Boolean)
            : [],
        },
        provenance: {
          sourceType: eventForm.provenanceSourceType,
          sourceId: eventForm.provenanceSourceId.trim(),
          trustLevel: eventForm.provenanceTrustLevel,
        },
      };

      const result = await eventsApi.ingestEvent(payload);
      setIngestResult(result);
      fetchEvents();
      // Generate new eventId for next submission
      setEventForm((prev) => ({ ...prev, eventId: `evt_${Date.now().toString(36)}` }));
    } catch (err) {
      setIngestError(err.message || 'Failed to ingest event.');
    } finally {
      setIsIngesting(false);
    }
  };

  const loadPresetScenario = (preset) => {
    if (preset === 'normal_read') {
      setEventForm((prev) => ({
        ...prev,
        action: 'file_system.read',
        tool: 'file_system',
        resource: 'Q3_Financial_Summary.pdf',
        dataSensitivity: 'MEDIUM',
        authStatus: 'ALLOWED',
        requiredPermission: 'file.read',
        provenanceSourceType: 'INTERNAL_DOCUMENT',
        provenanceSourceId: 'int_doc_99',
        provenanceTrustLevel: 'TRUSTED',
      }));
    } else if (preset === 'db_exfil_attempt') {
      setEventForm((prev) => ({
        ...prev,
        action: 'database_connector.query',
        tool: 'database_connector',
        resource: 'NovaCorp_Master_Credentials',
        dataSensitivity: 'CRITICAL',
        authStatus: 'ALLOWED',
        requiredPermission: 'db.admin',
        provenanceSourceType: 'EXTERNAL_DOCUMENT',
        provenanceSourceId: 'untrusted_input.txt',
        provenanceTrustLevel: 'UNTRUSTED',
      }));
    }
  };

  return (
    <div className="page-container">
      <div className="page-header flex-between">
        <div>
          <h2>Agent Event Telemetry Stream</h2>
          <p className="subtitle">
            Continuous real-time evidence stream & runtime action inspection
          </p>
        </div>
        <div className="header-btn-group">
          <div className="filter-group">
            <input
              type="text"
              placeholder="Filter by Session ID..."
              value={sessionIdFilter}
              onChange={(e) => setSessionIdFilter(e.target.value)}
              className="text-input-sm"
            />
          </div>
          <div className="filter-group">
            <input
              type="text"
              placeholder="Filter by Agent ID..."
              value={agentIdFilter}
              onChange={(e) => setAgentIdFilter(e.target.value)}
              className="text-input-sm"
            />
          </div>
          <button className="secondary-btn" onClick={fetchEvents} disabled={isLoading}>
            <RefreshCw size={16} className={isLoading ? 'spin-icon' : ''} />
            <span>Refresh</span>
          </button>
          <button className="primary-btn" onClick={() => setIsIngestModalOpen(true)}>
            <PlusCircle size={16} />
            <span>Ingest Test Telemetry</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="auth-alert error mb-4">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="card-loader py-12">
          <div className="spinner" />
          <p className="mt-4">Loading real telemetry events from backend...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="empty-card-state card py-12">
          <Zap size={40} className="text-muted mb-3" />
          <h3>No Telemetry Events Found</h3>
          <p className="text-muted">
            No events match your query. Ingest a new event using the button above to begin monitoring.
          </p>
          <button
            className="primary-btn btn-sm mt-4"
            onClick={() => setIsIngestModalOpen(true)}
          >
            <PlusCircle size={14} className="mr-1" /> Ingest Test Event
          </button>
        </div>
      ) : (
        <div className="card table-card">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Event ID</th>
                  <th>Session / Agent</th>
                  <th>Action & Tool</th>
                  <th>Target Resource</th>
                  <th>Data Sensitivity</th>
                  <th>Claimed Auth</th>
                  <th>Provenance</th>
                  <th>Timestamp</th>
                  <th>Inspect</th>
                </tr>
              </thead>
              <tbody>
                {events.map((evt) => (
                  <tr key={evt.eventId}>
                    <td>
                      <span className="code-tag font-mono">{evt.eventId}</span>
                    </td>
                    <td>
                      <div className="cell-stack">
                        <span className="font-semibold text-xs">{evt.sessionId}</span>
                        <span className="text-muted text-xs">{evt.agentId}</span>
                      </div>
                    </td>
                    <td>
                      <div className="cell-stack">
                        <strong className="text-sm">{evt.tool}</strong>
                        <code className="text-xs text-accent">{evt.action}</code>
                      </div>
                    </td>
                    <td>
                      <code className="resource-tag">{evt.resource}</code>
                    </td>
                    <td>
                      <span className={`sensitivity-badge ${evt.dataSensitivity?.toLowerCase()}`}>
                        {evt.dataSensitivity}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`status-pill ${
                          evt.authorization?.status === 'ALLOWED' ? 'active' : 'suspended'
                        }`}
                      >
                        {evt.authorization?.status}
                      </span>
                    </td>
                    <td>
                      <div className="cell-stack">
                        <span className="text-xs font-medium">
                          {evt.provenance?.sourceType}
                        </span>
                        <span
                          className={`text-xs ${
                            evt.provenance?.trustLevel === 'UNTRUSTED'
                              ? 'text-danger'
                              : 'text-success'
                          }`}
                        >
                          {evt.provenance?.trustLevel}
                        </span>
                      </div>
                    </td>
                    <td className="text-xs text-muted">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </td>
                    <td>
                      <button
                        className="icon-btn-subtle"
                        onClick={() => setInspectEvent(evt)}
                        title="View Raw Evidence JSON"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Raw Event Inspector Modal */}
      {inspectEvent && (
        <div className="modal-backdrop" onClick={() => setInspectEvent(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header flex-between">
              <div className="flex-align gap-2">
                <FileCode className="text-accent" size={20} />
                <h3>Event Evidence Payload: {inspectEvent.eventId}</h3>
              </div>
              <button className="icon-close-btn" onClick={() => setInspectEvent(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <pre className="raw-json-viewer">
                {JSON.stringify(inspectEvent, null, 2)}
              </pre>
            </div>
            <div className="modal-footer flex-between">
              <span className="text-xs text-muted">
                Immutable security evidence stored in PostgreSQL agent_events
              </span>
              <button className="primary-btn btn-sm" onClick={() => setInspectEvent(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ingest Event Modal */}
      {isIngestModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsIngestModalOpen(false)}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header flex-between">
              <div className="flex-align gap-2">
                <Zap className="text-accent" size={22} />
                <h3>Ingest Live Telemetry Event (POST /api/agent/events)</h3>
              </div>
              <button className="icon-close-btn" onClick={() => setIsIngestModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="scenario-presets mb-4 flex-align gap-2">
                <span className="text-xs text-muted font-semibold">Test Presets:</span>
                <button
                  type="button"
                  className="preset-tag"
                  onClick={() => loadPresetScenario('normal_read')}
                >
                  Benign File Read
                </button>
                <button
                  type="button"
                  className="preset-tag danger"
                  onClick={() => loadPresetScenario('db_exfil_attempt')}
                >
                  Critical DB Query (Untrusted Doc)
                </button>
              </div>

              {ingestError && (
                <div className="auth-alert error mb-3">
                  <AlertCircle size={16} />
                  <span>{ingestError}</span>
                </div>
              )}

              {ingestResult && (
                <div className="auth-alert success mb-3 flex-between">
                  <div className="flex-align gap-2">
                    <CheckCircle2 size={18} />
                    <span>
                      Event <strong>{ingestResult.eventId}</strong> evaluated:{' '}
                      <strong className="text-accent">{ingestResult.decision}</strong> verdict
                      received!
                    </span>
                  </div>
                  <span className="text-xs font-mono">
                    Trust: {ingestResult.trustScore}/100
                  </span>
                </div>
              )}

              <form onSubmit={handleIngestSubmit} className="ingest-grid-form">
                <div className="form-group">
                  <label>Event ID</label>
                  <input
                    type="text"
                    value={eventForm.eventId}
                    onChange={(e) =>
                      setEventForm((prev) => ({ ...prev, eventId: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Session ID (must exist & belong to user)</label>
                  <input
                    type="text"
                    value={eventForm.sessionId}
                    onChange={(e) =>
                      setEventForm((prev) => ({ ...prev, sessionId: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Agent ID</label>
                  <input
                    type="text"
                    value={eventForm.agentId}
                    onChange={(e) =>
                      setEventForm((prev) => ({ ...prev, agentId: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Data Sensitivity</label>
                  <select
                    value={eventForm.dataSensitivity}
                    onChange={(e) =>
                      setEventForm((prev) => ({ ...prev, dataSensitivity: e.target.value }))
                    }
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Tool</label>
                  <input
                    type="text"
                    value={eventForm.tool}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, tool: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Action</label>
                  <input
                    type="text"
                    value={eventForm.action}
                    onChange={(e) =>
                      setEventForm((prev) => ({ ...prev, action: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="form-group span-2">
                  <label>Target Resource</label>
                  <input
                    type="text"
                    value={eventForm.resource}
                    onChange={(e) =>
                      setEventForm((prev) => ({ ...prev, resource: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Claimed Auth Status</label>
                  <select
                    value={eventForm.authStatus}
                    onChange={(e) =>
                      setEventForm((prev) => ({ ...prev, authStatus: e.target.value }))
                    }
                  >
                    <option value="ALLOWED">ALLOWED</option>
                    <option value="DENIED">DENIED</option>
                    <option value="UNKNOWN">UNKNOWN</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Provenance Trust Level</label>
                  <select
                    value={eventForm.provenanceTrustLevel}
                    onChange={(e) =>
                      setEventForm((prev) => ({
                        ...prev,
                        provenanceTrustLevel: e.target.value,
                      }))
                    }
                  >
                    <option value="TRUSTED">TRUSTED</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="UNTRUSTED">UNTRUSTED</option>
                  </select>
                </div>

                <div className="modal-form-actions span-2 flex-between mt-3">
                  <span className="text-xs text-muted">
                    Submits to real backend pipeline & computes real Security Result
                  </span>
                  <button type="submit" className="primary-btn" disabled={isIngesting}>
                    <Send size={16} />
                    <span>{isIngesting ? 'Ingesting...' : 'Send Event Telemetry'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Events;
