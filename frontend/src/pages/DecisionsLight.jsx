import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Key,
  GitBranch,
  Compass,
  Flame,
  Shield,
  Eye,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { eventsApi, securityApi, agentsApi } from '../api/client';
import DecisionBadge from '../components/security/DecisionBadge';
import RiskBadge from '../components/security/RiskBadge';
import PolicyResultCard from '../components/security/PolicyResultCard';
import ProvenanceResultCard from '../components/security/ProvenanceResultCard';
import IntentResultCard from '../components/security/IntentResultCard';

const DecisionsLight = () => {
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
      <div className="page-header">
        <div>
          <div className="title-row">
            <ShieldAlert className="header-icon text-indigo" size={26} />
            <h1>Security Decision Center</h1>
          </div>
          <p className="page-subtitle">
            Authoritative verdicts, composite multi-engine risk calculations, and forensic policy reasoning.
          </p>
        </div>
        <div className="header-btn-group">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchDecisions}
            disabled={isLoading}
          >
            <RefreshCw size={15} className={isLoading ? 'spinner' : ''} />
            <span>Refresh Decisions</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="section-block">
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
      </div>

      {error && (
        <div className="error-banner">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Decisions Explanatory Feed */}
      <div className="section-block">
        <div className="section-title-wrap mb-3">
          <h3>Arbitrated Decisions Feed ({filteredEvents.length})</h3>
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
                  className={`border rounded-lg p-4 bg-white transition-all shadow-sm ${
                    verdict === 'BLOCK'
                      ? 'border-red-200'
                      : verdict === 'REVIEW'
                      ? 'border-amber-200'
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
                      <span className="text-xs text-slate-500">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-600 font-semibold">
                        {isExpanded ? 'Hide Forensic Analysis' : 'Expand Forensic Analysis'}
                      </span>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>

                  {/* High level overview line */}
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
                      Target: <code className="bg-slate-100 px-1 rounded">{evt.resource}</code>
                    </span>
                    <span>
                      Provenance:{' '}
                      <strong>{evt.provenance?.trustLevel || 'TRUSTED'}</strong> (
                      {evt.provenance?.sourceType || 'USER'})
                    </span>
                  </div>

                  {/* Primary Reasons Snippet */}
                  {dec?.reasons && dec.reasons.length > 0 && (
                    <div className="mt-2 text-xs text-slate-600 bg-slate-50 p-2 rounded border-l-2 border-indigo-400">
                      <strong>Arbitration Rationale:</strong> {dec.reasons[0]}
                    </div>
                  )}

                  {/* Expanded Multi-Engine Breakdown */}
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

export default DecisionsLight;
