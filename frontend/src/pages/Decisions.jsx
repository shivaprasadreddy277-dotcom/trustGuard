import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Search,
  Layers,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { eventsApi, agentsApi, securityApi } from '../api/client';
import DecisionBadge from '../components/security/DecisionBadge';
import RiskBadge from '../components/security/RiskBadge';
import TrustScoreMeter from '../components/security/TrustScoreMeter';
import InvestigationModal from '../components/security/InvestigationModal';

const Decisions = () => {
  const [events, setEvents] = useState([]);
  const [agents, setAgents] = useState({});
  const [decisionsMap, setDecisionsMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [decisionFilter, setDecisionFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Investigation Modal
  const [investigatingEvent, setInvestigatingEvent] = useState(null);

  const fetchDecisionsData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch telemetry events
      const eventsRes = await eventsApi.listEvents({ limit: 100 });
      const rawEvents = eventsRes?.events || [];
      setEvents(rawEvents);

      // 2. Fetch agents for authoritative permissions/trust lookup
      const agentsRes = await agentsApi.listAgents();
      const rawAgents = agentsRes?.agents || [];
      const aMap = {};
      rawAgents.forEach((a) => {
        aMap[a.agentId] = a;
      });
      setAgents(aMap);

      // 3. For evaluated events, fetch security decision details in parallel
      const decMap = {};
      await Promise.all(
        rawEvents.slice(0, 30).map(async (ev) => {
          try {
            const dec = await securityApi.getDecision(ev.eventId);
            decMap[ev.eventId] = dec;
          } catch {
            // If decision record isn't explicitly persisted for a legacy event, continue
          }
        })
      );
      setDecisionsMap(decMap);
    } catch (err) {
      setError(err.message || 'Failed to load security decisions.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDecisionsData();
  }, []);

  // Filter events based on decision and risk
  const filteredEvents = events.filter((ev) => {
    const dec = decisionsMap[ev.eventId];
    const decisionVal = dec?.decision || (ev.dataSensitivity === 'CRITICAL' ? 'BLOCK' : 'ALLOW');
    const riskVal = dec?.riskLevel || (ev.dataSensitivity === 'CRITICAL' ? 'CRITICAL' : 'LOW');

    if (decisionFilter !== 'ALL' && decisionVal !== decisionFilter) return false;
    if (riskFilter !== 'ALL' && riskVal !== riskFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = ev.eventId?.toLowerCase().includes(q);
      const matchAgent = ev.agentId?.toLowerCase().includes(q);
      const matchAction = ev.action?.toLowerCase().includes(q);
      const matchResource = ev.resource?.toLowerCase().includes(q);
      if (!matchId && !matchAgent && !matchAction && !matchResource) return false;
    }

    return true;
  });

  const blockCount = events.filter((e) => decisionsMap[e.eventId]?.decision === 'BLOCK').length;
  const reviewCount = events.filter((e) => decisionsMap[e.eventId]?.decision === 'REVIEW').length;
  const allowCount = events.filter((e) => decisionsMap[e.eventId]?.decision === 'ALLOW').length;

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2>3.4 Security Decision Center</h2>
          <p className="page-subtitle">
            Authoritative verdict registry synthesized from Policy, Provenance, Intent, and Risk engines.
          </p>
        </div>
        <div className="page-actions">
          <button className="btn-secondary" onClick={fetchDecisionsData} disabled={isLoading}>
            <RefreshCw size={15} className={isLoading ? 'spinner' : ''} />
            <span>Refresh Decisions</span>
          </button>
        </div>
      </div>

      {/* Decision Summary Counters */}
      <div className="decision-counters-grid">
        <div
          className={`decision-stat-card card-stat-block ${decisionFilter === 'BLOCK' ? 'active-filter' : ''}`}
          onClick={() => setDecisionFilter(decisionFilter === 'BLOCK' ? 'ALL' : 'BLOCK')}
        >
          <div className="stat-icon-wrap bg-red-dim">
            <ShieldAlert className="text-red" size={22} />
          </div>
          <div>
            <span className="stat-count">{blockCount}</span>
            <span className="stat-label">BLOCK Verdicts</span>
          </div>
        </div>

        <div
          className={`decision-stat-card card-stat-review ${decisionFilter === 'REVIEW' ? 'active-filter' : ''}`}
          onClick={() => setDecisionFilter(decisionFilter === 'REVIEW' ? 'ALL' : 'REVIEW')}
        >
          <div className="stat-icon-wrap bg-amber-dim">
            <AlertTriangle className="text-amber" size={22} />
          </div>
          <div>
            <span className="stat-count">{reviewCount}</span>
            <span className="stat-label">REVIEW Verdicts</span>
          </div>
        </div>

        <div
          className={`decision-stat-card card-stat-allow ${decisionFilter === 'ALLOW' ? 'active-filter' : ''}`}
          onClick={() => setDecisionFilter(decisionFilter === 'ALLOW' ? 'ALL' : 'ALLOW')}
        >
          <div className="stat-icon-wrap bg-green-dim">
            <ShieldCheck className="text-green" size={22} />
          </div>
          <div>
            <span className="stat-count">{allowCount}</span>
            <span className="stat-label">ALLOW Verdicts</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="filter-card">
        <div className="filter-inputs-grid">
          <div className="search-input-wrap">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search event ID, agent, action, or resource..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-select-group">
            <label>Verdict:</label>
            <select
              value={decisionFilter}
              onChange={(e) => setDecisionFilter(e.target.value)}
            >
              <option value="ALL">ALL Verdicts</option>
              <option value="BLOCK">BLOCK</option>
              <option value="REVIEW">REVIEW</option>
              <option value="ALLOW">ALLOW</option>
            </select>
          </div>

          <div className="filter-select-group">
            <label>Risk Level:</label>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
            >
              <option value="ALL">ALL Risk Levels</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>
        </div>
      </div>

      {/* Decisions Stream */}
      {isLoading ? (
        <div className="loading-state-card">
          <RefreshCw className="spinner" size={26} />
          <p>Loading real security decision feed from TrustGuard engines...</p>
        </div>
      ) : error ? (
        <div className="error-state-card">
          <AlertTriangle size={24} />
          <p>{error}</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="empty-state-card">
          <ShieldCheck size={32} />
          <h3>No decisions match selected filters</h3>
          <p>Try resetting the verdict or risk filters to view more records.</p>
          <button className="btn-secondary" onClick={() => { setDecisionFilter('ALL'); setRiskFilter('ALL'); setSearchQuery(''); }}>
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="decisions-stack">
          {filteredEvents.map((ev) => {
            const dec = decisionsMap[ev.eventId];
            const decision = dec?.decision || (ev.dataSensitivity === 'CRITICAL' ? 'BLOCK' : 'ALLOW');
            const riskLevel = dec?.riskLevel || (ev.dataSensitivity === 'CRITICAL' ? 'CRITICAL' : 'LOW');
            const trustScore = dec?.trustScore ?? 95;
            const signals = dec?.securitySignals || {};
            const reasons = dec?.reasons || [];

            return (
              <div
                key={ev.eventId}
                className={`decision-feed-item decision-border-${decision.toLowerCase()}`}
              >
                <div className="decision-item-header">
                  <div className="decision-item-left">
                    <DecisionBadge decision={decision} size="large" />
                    <RiskBadge riskLevel={riskLevel} size="large" />
                    <span className="decision-event-id"><code>{ev.eventId}</code></span>
                    <span className="decision-timestamp">
                      {new Date(ev.timestamp || Date.now()).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="decision-item-right">
                    <button
                      className="btn-inspect-decision"
                      onClick={() => setInvestigatingEvent(ev)}
                    >
                      <Eye size={14} />
                      <span>Investigate Forensic Trace</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>

                <div className="decision-item-grid">
                  {/* Action & Resource Context */}
                  <div className="decision-context-block">
                    <span className="context-label">Observed Telemetry</span>
                    <div className="context-value">
                      <strong>{ev.action}</strong>
                      <span className="resource-sub">Resource: <code>{ev.resource}</code></span>
                      <span className="tool-sub">Tool: <code>{ev.tool}</code></span>
                    </div>
                  </div>

                  {/* 3.1 Policy & 3.2 Provenance Highlights */}
                  <div className="decision-signals-block">
                    <span className="context-label">Engine Signals</span>
                    <div className="signals-chips-wrap">
                      <span className={`signal-chip ${signals.policyViolation ? 'chip-violation' : 'chip-ok'}`}>
                        Policy: {signals.policyViolation ? 'VIOLATION' : 'AUTHORIZED'}
                      </span>
                      <span className={`signal-chip ${signals.intentDrift ? 'chip-violation' : 'chip-ok'}`}>
                        Intent: {dec?.intent?.status || 'ALIGNED'}
                      </span>
                      <span className={`signal-chip provenance-chip-${ev.provenance?.trustLevel?.toLowerCase()}`}>
                        Provenance: {ev.provenance?.trustLevel}
                      </span>
                    </div>
                  </div>

                  {/* 3.5 Dynamic Trust Outcome */}
                  <div className="decision-trust-block">
                    <span className="context-label">Dynamic Trust</span>
                    <TrustScoreMeter score={trustScore} size="compact" />
                  </div>
                </div>

                {/* Explainable Reasons Callout */}
                {reasons && reasons.length > 0 && (
                  <div className="decision-reasons-inline">
                    <Layers size={13} className="text-muted" />
                    <span className="reasons-label">Authoritative Findings:</span>
                    <span className="reasons-text">{reasons.join(' • ')}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Deep Investigation Modal */}
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

export default Decisions;
