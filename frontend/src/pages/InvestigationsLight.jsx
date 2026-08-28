import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  RefreshCw,
  Eye,
  FileCode,
  CheckCircle2,
  ShieldAlert,
  AlertTriangle,
  Key,
  GitBranch,
  Compass,
  Flame,
  Shield,
  Layers,
  Copy,
  Check,
} from 'lucide-react';
import { eventsApi, securityApi, agentsApi, sessionsApi } from '../api/client';
import DecisionBadge from '../components/security/DecisionBadge';
import RiskBadge from '../components/security/RiskBadge';
import PolicyResultCard from '../components/security/PolicyResultCard';
import ProvenanceResultCard from '../components/security/ProvenanceResultCard';
import IntentResultCard from '../components/security/IntentResultCard';

const InvestigationsLight = () => {
  const [events, setEvents] = useState([]);
  const [agents, setAgents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [securityDecision, setSecurityDecision] = useState(null);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'POLICY' | 'PROVENANCE' | 'INTENT' | 'JSON'
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isLoadingDecision, setIsLoadingDecision] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const fetchEvents = useCallback(async () => {
    setIsLoadingEvents(true);
    setError(null);
    try {
      const [evRes, agRes, sessRes] = await Promise.allSettled([
        eventsApi.listEvents({ limit: 30 }),
        agentsApi.listAgents(),
        sessionsApi.listSessions(),
      ]);

      const rawEvents = evRes.status === 'fulfilled' ? evRes.value.events || [] : [];
      const rawAgents = agRes.status === 'fulfilled' ? agRes.value.agents || [] : [];
      const rawSessions = sessRes.status === 'fulfilled' ? sessRes.value.sessions || [] : [];

      setEvents(rawEvents);
      setAgents(rawAgents);
      setSessions(rawSessions);

      if (rawEvents.length > 0 && !selectedEventId) {
        setSelectedEventId(rawEvents[0].eventId);
      }
    } catch (err) {
      setError(err.message || 'Failed to load telemetry events.');
    } finally {
      setIsLoadingEvents(false);
    }
  }, [selectedEventId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Fetch security decision whenever selectedEventId changes
  useEffect(() => {
    if (!selectedEventId) return;

    let isMounted = true;
    async function loadDecision() {
      setIsLoadingDecision(true);
      try {
        const dec = await securityApi.getDecision(selectedEventId);
        if (isMounted) setSecurityDecision(dec);
      } catch (err) {
        if (isMounted) setSecurityDecision(null);
      } finally {
        if (isMounted) setIsLoadingDecision(false);
      }
    }
    loadDecision();
    return () => {
      isMounted = false;
    };
  }, [selectedEventId]);

  const selectedEvent = events.find((e) => e.eventId === selectedEventId) || events[0];
  const selectedAgent = agents.find((a) => a.agentId === selectedEvent?.agentId);
  const selectedSession = sessions.find((s) => s.sessionId === selectedEvent?.sessionId);

  const handleCopyJson = () => {
    if (!securityDecision) return;
    navigator.clipboard.writeText(JSON.stringify(securityDecision, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="title-row">
            <Search className="header-icon text-indigo" size={26} />
            <h1>Forensic Investigation Workbench</h1>
          </div>
          <p className="page-subtitle">
            Deep forensic drill-down into event context, 5-engine telemetry analysis, chain-of-custody, and JSON evidence.
          </p>
        </div>
        <div className="header-btn-group">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchEvents}
            disabled={isLoadingEvents}
          >
            <RefreshCw size={15} className={isLoadingEvents ? 'spinner' : ''} />
            <span>Refresh Workbench</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Split Layout: Event Selector on Left, Forensic Workbench on Right */}
      <div className="overview-split-layout">
        {/* Left Column: Events Selector List */}
        <div className="section-block" style={{ maxWidth: '340px', flex: '0 0 340px' }}>
          <div className="section-title-wrap mb-3">
            <h3>Select Event ({events.length})</h3>
          </div>

          {isLoadingEvents ? (
            <div className="loading-state">
              <RefreshCw className="spinner" size={18} />
              <span>Loading event stream...</span>
            </div>
          ) : events.length === 0 ? (
            <div className="empty-state-card">
              <p>No events available to inspect.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto pr-1">
              {events.map((ev) => {
                const isSelected = ev.eventId === selectedEventId;
                return (
                  <div
                    key={ev.eventId}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-500 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => setSelectedEventId(ev.eventId)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="mono-val text-xs font-bold text-indigo">{ev.eventId}</span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-800">{ev.action}</div>
                    <div className="text-xs text-slate-500 truncate mono-val">{ev.resource}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Multi-Engine Forensic Analysis Workbench */}
        <div className="section-block flex-1">
          {selectedEvent ? (
            <div>
              {/* Event Top Banner */}
              <div className="flex items-center justify-between border-b pb-4 mb-4 flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">{selectedEvent.action}</h2>
                    <span className="mono-val text-xs text-indigo font-bold bg-indigo-50 px-2 py-0.5 rounded">
                      {selectedEvent.eventId}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tool: <strong>{selectedEvent.tool}</strong> • Target:{' '}
                    <code>{selectedEvent.resource}</code>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <RiskBadge risk={securityDecision?.riskLevel || selectedEvent.dataSensitivity || 'LOW'} />
                  <DecisionBadge decision={securityDecision?.decision || 'ALLOW'} size="large" />
                </div>
              </div>

              {/* Forensic Navigation Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2 mb-4 overflow-x-auto">
                <button
                  type="button"
                  className={`btn btn-xs ${activeTab === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setActiveTab('ALL')}
                >
                  Complete 5-Engine Analysis
                </button>
                <button
                  type="button"
                  className={`btn btn-xs ${activeTab === 'POLICY' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setActiveTab('POLICY')}
                >
                  3.1 Policy
                </button>
                <button
                  type="button"
                  className={`btn btn-xs ${activeTab === 'PROVENANCE' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setActiveTab('PROVENANCE')}
                >
                  3.2 Provenance
                </button>
                <button
                  type="button"
                  className={`btn btn-xs ${activeTab === 'INTENT' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setActiveTab('INTENT')}
                >
                  3.3 Intent Integrity
                </button>
                <button
                  type="button"
                  className={`btn btn-xs ${activeTab === 'JSON' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setActiveTab('JSON')}
                >
                  <FileCode size={13} />
                  <span>Raw Evidence JSON</span>
                </button>
              </div>

              {isLoadingDecision ? (
                <div className="loading-state">
                  <RefreshCw className="spinner" size={20} />
                  <span>Evaluating security intelligence...</span>
                </div>
              ) : activeTab === 'JSON' ? (
                <div className="raw-evidence-box">
                  <div className="evidence-head">
                    <FileCode size={16} className="text-indigo" />
                    <h4>Authoritative Forensic JSON Evidence</h4>
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs ml-auto"
                      onClick={handleCopyJson}
                    >
                      {copied ? <Check size={13} /> : <Copy size={13} />}
                      <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                    </button>
                  </div>
                  <pre className="evidence-pre">
                    {JSON.stringify(securityDecision || selectedEvent, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {(activeTab === 'ALL' || activeTab === 'POLICY') && (
                    <PolicyResultCard
                      requiredPermission={
                        securityDecision?.policy?.requiredPermission ||
                        selectedEvent.authorization?.requiredPermission
                      }
                      registeredPermissions={
                        selectedAgent?.permissions || securityDecision?.policy?.registeredPermissions || []
                      }
                      reportedAuthStatus={
                        securityDecision?.policy?.reportedAuthStatus ||
                        selectedEvent.authorization?.status
                      }
                      reportedGrantedPermissions={
                        securityDecision?.policy?.reportedGrantedPermissions ||
                        selectedEvent.authorization?.grantedPermissions ||
                        []
                      }
                      policyViolation={
                        securityDecision?.securitySignals?.policyViolation ||
                        securityDecision?.policy?.violation ||
                        false
                      }
                      reason={securityDecision?.reasons?.find((r) => r.toLowerCase().includes('policy'))}
                    />
                  )}

                  {(activeTab === 'ALL' || activeTab === 'PROVENANCE') && (
                    <ProvenanceResultCard
                      sourceType={
                        securityDecision?.provenance?.sourceType || selectedEvent.provenance?.sourceType
                      }
                      sourceId={
                        securityDecision?.provenance?.sourceId || selectedEvent.provenance?.sourceId
                      }
                      trustLevel={
                        securityDecision?.provenance?.trustLevel ||
                        selectedEvent.provenance?.trustLevel
                      }
                      provenanceRisk={
                        securityDecision?.provenance?.risk ||
                        (selectedEvent.provenance?.trustLevel === 'UNTRUSTED' ? 'HIGH' : 'LOW')
                      }
                      reason={securityDecision?.reasons?.find(
                        (r) =>
                          r.toLowerCase().includes('provenance') || r.toLowerCase().includes('untrusted')
                      )}
                    />
                  )}

                  {(activeTab === 'ALL' || activeTab === 'INTENT') && (
                    <IntentResultCard
                      originalIntent={
                        selectedSession?.originalIntent ||
                        selectedAgent?.declaredObjective ||
                        'Analyze quarterly financial telemetry'
                      }
                      action={selectedEvent.action}
                      resource={selectedEvent.resource}
                      status={securityDecision?.intent?.status || 'ALIGNED'}
                      alignmentScore={securityDecision?.intent?.alignmentScore ?? 1.0}
                      intentDrift={securityDecision?.intent?.status === 'DRIFT'}
                      reason={securityDecision?.reasons?.find(
                        (r) => r.toLowerCase().includes('intent') || r.toLowerCase().includes('drift')
                      )}
                    />
                  )}

                  {/* Dynamic Trust & Risk Impact Card */}
                  {activeTab === 'ALL' && (
                    <div className="engine-card engine-card-clean">
                      <div className="engine-card-header">
                        <div className="engine-title-wrap">
                          <Shield className="engine-status-icon text-indigo" size={20} />
                          <div>
                            <h4>3.4 & 3.5 Risk Arbitration & Dynamic Trust Impact</h4>
                            <span className="engine-subtitle">Living Mathematical Agent Reputation</span>
                          </div>
                        </div>
                        <span className="font-bold text-sm text-slate-800">
                          Resulting Trust: {securityDecision?.trustScore ?? 90} / 100
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded border text-xs text-slate-700">
                        <strong>Security Reasons Evaluated:</strong>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                          {securityDecision?.reasons?.map((r, idx) => (
                            <li key={idx}>{r}</li>
                          )) || <li>Normal benign operation within baseline.</li>}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state-card">
              <Search size={36} />
              <p>Select an event from the left panel to inspect.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvestigationsLight;
