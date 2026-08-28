import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { eventsApi, securityApi, agentsApi } from '../api/client';
import DecisionBadge from '../components/security/DecisionBadge';
import RiskBadge from '../components/security/RiskBadge';
import PolicyResultCard from '../components/security/PolicyResultCard';
import ProvenanceResultCard from '../components/security/ProvenanceResultCard';
import IntentResultCard from '../components/security/IntentResultCard';

const Decisions = () => {
  const [events, setEvents] = useState([]);
  const [decisionsMap, setDecisionsMap] = useState({});
  const [agents, setAgents] = useState([]);
  const [expandedEventId, setExpandedEventId] = useState(null);
  const [decisionFilter, setDecisionFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDecisions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [eventsRes, agentsRes] = await Promise.allSettled([
        eventsApi.listEvents({ limit: 40 }),
        agentsApi.listAgents(),
      ]);

      const rawEvents = eventsRes.status === 'fulfilled' ? eventsRes.value.events || [] : [];
      const rawAgents = agentsRes.status === 'fulfilled' ? agentsRes.value.agents || [] : [];

      setEvents(rawEvents);
      setAgents(rawAgents);

      // Fetch security decision for each event
      const decMap = {};
      await Promise.all(
        rawEvents.map(async (ev) => {
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
      setError(err.message || 'Failed to load security decision records.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDecisions();
  }, [fetchDecisions]);

  const toggleExpand = (eventId) => {
    setExpandedEventId((prev) => (prev === eventId ? null : eventId));
  };

  const filteredEvents = events.filter((ev) => {
    const dec = decisionsMap[ev.eventId];
    const verdict = dec?.decision || (ev.dataSensitivity === 'CRITICAL' ? 'BLOCK' : 'ALLOW');

    if (decisionFilter !== 'ALL' && verdict !== decisionFilter) {
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-primary bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              DECISION CENTER
            </span>
            <span className="text-xs text-muted">// Authoritative Verdicts & Multi-Engine Signals</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Security Decision & Risk Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Every action decision is backed by Policy, Provenance, Intent Integrity, Risk Scoring, and Dynamic Trust calculations.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={fetchDecisions}
          disabled={isLoading}
        >
          <RefreshCw size={14} className={isLoading ? 'spinner' : ''} />
          <span>Refresh Decisions</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="chains-filter-bar">
        <div className="filter-search-box">
          <Search size={16} className="text-muted" />
          <input
            type="text"
            placeholder="Search by event ID, action, target resource, tool..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={15} className="text-muted" />
          <select
            className="filter-select"
            value={decisionFilter}
            onChange={(e) => setDecisionFilter(e.target.value)}
          >
            <option value="ALL">All Verdicts</option>
            <option value="BLOCK">Blocked Only</option>
            <option value="REVIEW">Review Only</option>
            <option value="ALLOW">Allowed Only</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Decisions Feed */}
      <div className="editorial-card">
        <div className="card-editorial-head">
          <h3>
            <ShieldAlert size={18} className="text-indigo" />
            <span>Arbitrated Decisions Feed ({filteredEvents.length})</span>
          </h3>
        </div>

        {isLoading ? (
          <div className="loading-state">
            <RefreshCw className="spinner" size={20} />
            <span>Loading authoritative decision records...</span>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="empty-state-card">
            <ShieldAlert size={36} />
            <p>No security decisions matching filter criteria.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredEvents.map((evt) => {
              const dec = decisionsMap[evt.eventId];
              const verdict = dec?.decision || (evt.dataSensitivity === 'CRITICAL' ? 'BLOCK' : 'ALLOW');
              const risk = dec?.riskLevel || (evt.dataSensitivity === 'CRITICAL' ? 'CRITICAL' : 'LOW');
              const isExpanded = expandedEventId === evt.eventId;
              const agent = agents.find((a) => a.agentId === evt.agentId);

              return (
                <div
                  key={evt.eventId}
                  className={`border rounded-xl p-4 bg-surface transition-all shadow-sm ${
                    verdict === 'BLOCK'
                      ? 'border-rose-300 bg-rose-50/20'
                      : verdict === 'REVIEW'
                      ? 'border-amber-300 bg-amber-50/20'
                      : 'border-slate-200'
                  }`}
                >
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleExpand(evt.eventId)}
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <DecisionBadge decision={verdict} />
                      <RiskBadge risk={risk} />
                      <span className="mono-val font-semibold text-xs text-indigo">{evt.eventId}</span>
                      <span className="text-xs text-slate-400">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-600 font-bold">
                        {isExpanded ? 'Hide Forensics ▲' : 'Expand Forensics ▼'}
                      </span>
                    </div>
                  </div>

                  {/* Summary row */}
                  <div className="mt-2 text-xs text-slate-700 flex items-center gap-4 flex-wrap">
                    <span>
                      Agent: <strong className="text-indigo">{evt.agentId || 'agent_001'}</strong>
                    </span>
                    <span>
                      Action: <strong>{evt.action}</strong>
                    </span>
                    <span>
                      Tool: <strong>{evt.tool}</strong>
                    </span>
                    <span>
                      Target: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">{evt.resource}</code>
                    </span>
                  </div>

                  {/* Rationale Snippet */}
                  {dec?.reasons && dec.reasons.length > 0 && (
                    <div className="mt-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border-l-3 border-indigo-500 font-medium">
                      <strong>Arbitration Rationale:</strong> {dec.reasons[0]}
                    </div>
                  )}

                  {/* Expanded Breakdown */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <PolicyResultCard
                          requiredPermission={
                            dec?.policy?.requiredPermission || evt.authorization?.requiredPermission
                          }
                          registeredPermissions={
                            agent?.permissions || dec?.policy?.registeredPermissions || []
                          }
                          reportedAuthStatus={
                            dec?.policy?.reportedAuthStatus || evt.authorization?.status
                          }
                          reportedGrantedPermissions={
                            dec?.policy?.reportedGrantedPermissions ||
                            evt.authorization?.grantedPermissions ||
                            []
                          }
                          policyViolation={
                            dec?.securitySignals?.policyViolation || dec?.policy?.violation || false
                          }
                          reason={dec?.reasons?.find((r) => r.toLowerCase().includes('policy'))}
                        />

                        <ProvenanceResultCard
                          sourceType={dec?.provenance?.sourceType || evt.provenance?.sourceType}
                          sourceId={dec?.provenance?.sourceId || evt.provenance?.sourceId}
                          trustLevel={dec?.provenance?.trustLevel || evt.provenance?.trustLevel}
                          provenanceRisk={dec?.provenance?.risk || (evt.provenance?.trustLevel === 'UNTRUSTED' ? 'HIGH' : 'LOW')}
                          reason={dec?.reasons?.find((r) => r.toLowerCase().includes('provenance') || r.toLowerCase().includes('untrusted'))}
                        />

                        <IntentResultCard
                          originalIntent={
                            agent?.declaredObjective || 'Analyze quarterly financial telemetry'
                          }
                          action={evt.action}
                          resource={evt.resource}
                          status={dec?.intent?.status || 'ALIGNED'}
                          alignmentScore={dec?.intent?.alignmentScore ?? 1.0}
                          intentDrift={dec?.intent?.status === 'DRIFT'}
                          reason={dec?.reasons?.find((r) => r.toLowerCase().includes('intent') || r.toLowerCase().includes('drift'))}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Decisions;
