import React, { useState, useEffect } from 'react';
import {
  Search,
  RefreshCw,
  Shield,
  Clock,
  FileCode,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import { eventsApi, agentsApi, securityApi, sessionsApi } from '../api/client';
import DecisionBadge from '../components/security/DecisionBadge';
import RiskBadge from '../components/security/RiskBadge';
import TrustScoreMeter from '../components/security/TrustScoreMeter';
import PolicyResultCard from '../components/security/PolicyResultCard';
import ProvenanceResultCard from '../components/security/ProvenanceResultCard';
import IntentResultCard from '../components/security/IntentResultCard';

const Investigations = () => {
  const [events, setEvents] = useState([]);
  const [agents, setAgents] = useState({});
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [activeEvent, setActiveEvent] = useState(null);
  const [decisionData, setDecisionData] = useState(null);
  const [sessionData, setSessionData] = useState(null);

  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isLoadingDecision, setIsLoadingDecision] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('engines'); // 'engines' | 'evidence'

  const fetchInitialData = async () => {
    setIsLoadingEvents(true);
    setError(null);
    try {
      const [eventsRes, agentsRes] = await Promise.all([
        eventsApi.listEvents({ limit: 50 }),
        agentsApi.listAgents(),
      ]);

      const rawEvents = eventsRes?.events || [];
      setEvents(rawEvents);

      const aMap = {};
      (agentsRes?.agents || []).forEach((a) => {
        aMap[a.agentId] = a;
      });
      setAgents(aMap);

      if (rawEvents.length > 0) {
        setSelectedEventId(rawEvents[0].eventId);
        setActiveEvent(rawEvents[0]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load investigation telemetry stream.');
    } finally {
      setIsLoadingEvents(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Fetch full decision & session details whenever active event changes
  useEffect(() => {
    if (!activeEvent) {
      setDecisionData(null);
      setSessionData(null);
      return;
    }

    let isMounted = true;
    const fetchDetails = async () => {
      setIsLoadingDecision(true);
      try {
        const [decRes, sessRes] = await Promise.allSettled([
          securityApi.getDecision(activeEvent.eventId),
          sessionsApi.getSession(activeEvent.sessionId),
        ]);

        if (isMounted) {
          if (decRes.status === 'fulfilled') setDecisionData(decRes.value);
          else setDecisionData(null);

          if (sessRes.status === 'fulfilled') setSessionData(sessRes.value);
          else setSessionData(null);
        }
      } finally {
        if (isMounted) setIsLoadingDecision(false);
      }
    };

    fetchDetails();
    return () => {
      isMounted = false;
    };
  }, [activeEvent]);

  const handleSelectEvent = (ev) => {
    setSelectedEventId(ev.eventId);
    setActiveEvent(ev);
  };

  const handleDirectSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const match = events.find((ev) => ev.eventId === searchQuery.trim());
    if (match) {
      handleSelectEvent(match);
    } else {
      // Try to query direct decision from API
      try {
        setIsLoadingDecision(true);
        const dec = await securityApi.getDecision(searchQuery.trim());
        setDecisionData(dec);
        setActiveEvent({
          eventId: searchQuery.trim(),
          action: 'Queried from Forensic Registry',
          tool: 'Security Index',
          resource: 'Unknown',
          dataSensitivity: 'HIGH',
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        setError(`Event ${searchQuery.trim()} not found: ${err.message}`);
      } finally {
        setIsLoadingDecision(false);
      }
    }
  };

  const filteredEvents = events.filter((ev) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      ev.eventId?.toLowerCase().includes(q) ||
      ev.agentId?.toLowerCase().includes(q) ||
      ev.action?.toLowerCase().includes(q) ||
      ev.resource?.toLowerCase().includes(q)
    );
  });

  const activeAgent = activeEvent ? agents[activeEvent.agentId] : null;
  const decision = decisionData?.decision || (activeEvent?.dataSensitivity === 'CRITICAL' ? 'BLOCK' : 'ALLOW');
  const riskLevel = decisionData?.riskLevel || (activeEvent?.dataSensitivity === 'CRITICAL' ? 'CRITICAL' : 'LOW');
  const trustScore = decisionData?.trustScore ?? (activeAgent?.currentTrustScore || 95);
  const signals = decisionData?.securitySignals || {};
  const reasons = decisionData?.reasons || [];

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2>3.7 Deep Forensic Investigation</h2>
          <p className="page-subtitle">
            Inspect authoritative security telemetry, 5-engine analysis traces, and dynamic trust impact.
          </p>
        </div>
        <div className="page-actions">
          <button className="btn-secondary" onClick={fetchInitialData} disabled={isLoadingEvents}>
            <RefreshCw size={15} className={isLoadingEvents ? 'spinner' : ''} />
            <span>Refresh Stream</span>
          </button>
        </div>
      </div>

      {/* Direct Search Bar */}
      <form onSubmit={handleDirectSearch} className="investigation-search-bar">
        <Search size={18} />
        <input
          type="text"
          placeholder="Lookup by public eventId (e.g. evt_01j6abc123) or filter by action/resource..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button type="submit" className="btn-primary">
          Investigate
        </button>
      </form>

      {error && (
        <div className="form-error-banner">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* 2-Column Investigation Layout */}
      <div className="investigation-split-workbench">
        {/* Left Column: Event Stream Selector */}
        <div className="investigation-sidebar-panel">
          <div className="panel-header">
            <h3>Telemetry Events ({filteredEvents.length})</h3>
          </div>

          {isLoadingEvents ? (
            <div className="panel-loading">
              <RefreshCw className="spinner" size={20} />
              <span>Loading telemetry...</span>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="panel-empty">No events match search.</div>
          ) : (
            <div className="events-select-list">
              {filteredEvents.map((ev) => (
                <div
                  key={ev.eventId}
                  className={`event-select-card ${selectedEventId === ev.eventId ? 'active' : ''}`}
                  onClick={() => handleSelectEvent(ev)}
                >
                  <div className="event-card-top">
                    <span className="event-card-id"><code>{ev.eventId}</code></span>
                    <span className="event-card-time">
                      {new Date(ev.timestamp || Date.now()).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="event-card-action">
                    <strong>{ev.action}</strong>
                  </div>
                  <div className="event-card-meta">
                    <span>{ev.agentId}</span>
                    <span className={`sensitivity-badge sensitivity-${ev.dataSensitivity?.toLowerCase()}`}>
                      {ev.dataSensitivity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Deep Forensic Trace Panel */}
        <div className="investigation-main-panel">
          {!activeEvent ? (
            <div className="empty-state-card">
              <Shield size={36} />
              <h3>Select an event to inspect its forensic trace</h3>
            </div>
          ) : (
            <>
              {/* Active Header */}
              <div className="investigation-active-header">
                <div className="active-header-left">
                  <div className="active-badge-row">
                    <DecisionBadge decision={decision} size="large" />
                    <RiskBadge riskLevel={riskLevel} size="large" />
                  </div>
                  <h3>Event: <code>{activeEvent.eventId}</code></h3>
                  <div className="active-meta-row">
                    <span><Clock size={13} /> {new Date(activeEvent.timestamp || Date.now()).toLocaleString()}</span>
                    <span>• Agent: <strong>{activeEvent.agentId}</strong></span>
                    <span>• Session: <strong>{activeEvent.sessionId}</strong></span>
                  </div>
                </div>
                <div className="active-header-right">
                  <span className="trust-impact-label">DYNAMIC TRUST</span>
                  <TrustScoreMeter score={trustScore} />
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="investigation-nav-tabs">
                <button
                  className={`investigation-tab-btn ${activeTab === 'engines' ? 'active' : ''}`}
                  onClick={() => setActiveTab('engines')}
                >
                  <Shield size={16} />
                  <span>5-Engine Security Arbitration Matrix</span>
                </button>
                <button
                  className={`investigation-tab-btn ${activeTab === 'evidence' ? 'active' : ''}`}
                  onClick={() => setActiveTab('evidence')}
                >
                  <FileCode size={16} />
                  <span>Raw Ingested Evidence JSON</span>
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === 'engines' ? (
                <div className="investigation-engines-view">
                  {isLoadingDecision && (
                    <div className="loading-bar-indicator">
                      <RefreshCw className="spinner" size={16} />
                      <span>Updating security intelligence engines...</span>
                    </div>
                  )}

                  <div className="engines-evaluation-stack">
                    {/* 3.1 Policy Engine */}
                    <PolicyResultCard
                      requiredPermission={activeEvent.authorization?.requiredPermission}
                      registeredPermissions={activeAgent?.permissions || []}
                      reportedAuthStatus={activeEvent.authorization?.status}
                      reportedGrantedPermissions={activeEvent.authorization?.grantedPermissions || []}
                      policyViolation={signals.policyViolation}
                      reason={reasons.find((r) => r.toLowerCase().includes('policy') || r.toLowerCase().includes('permission'))}
                    />

                    {/* 3.2 Provenance Engine */}
                    <ProvenanceResultCard
                      sourceType={activeEvent.provenance?.sourceType}
                      sourceId={activeEvent.provenance?.sourceId}
                      trustLevel={activeEvent.provenance?.trustLevel}
                      provenanceRisk={signals.provenanceRisk || 'LOW'}
                      reason={reasons.find((r) => r.toLowerCase().includes('provenance'))}
                    />

                    {/* 3.3 Intent Integrity Engine */}
                    <IntentResultCard
                      originalIntent={sessionData?.originalIntent || sessionData?.original_intent || activeAgent?.declaredObjective}
                      action={activeEvent.action}
                      resource={activeEvent.resource}
                      status={decisionData?.intent?.status || 'ALIGNED'}
                      alignmentScore={decisionData?.intent?.alignmentScore ?? 1.0}
                      intentDrift={signals.intentDrift}
                      reason={reasons.find((r) => r.toLowerCase().includes('intent'))}
                    />
                  </div>

                  {/* Explainable Reasons Summary */}
                  {reasons && reasons.length > 0 && (
                    <div className="reasons-summary-box">
                      <div className="reasons-header">
                        <Layers size={16} />
                        <h4>Authoritative Security Findings ({reasons.length})</h4>
                      </div>
                      <ul className="reasons-list">
                        {reasons.map((reasonText, idx) => (
                          <li key={idx} className="reason-item">
                            <span className="reason-dot" />
                            <span>{reasonText}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="investigation-evidence-view">
                  <div className="raw-json-inspector-box">
                    <h4>Authoritative Event Record</h4>
                    <pre>{JSON.stringify(activeEvent, null, 2)}</pre>
                  </div>
                  {decisionData && (
                    <div className="raw-json-inspector-box">
                      <h4>Authoritative Security Decision Record</h4>
                      <pre>{JSON.stringify(decisionData, null, 2)}</pre>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Investigations;
