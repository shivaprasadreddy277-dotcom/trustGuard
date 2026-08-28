import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  FileText,
  Activity,
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
            <span className="text-xs font-mono font-bold text-[#6A4D00] bg-[#FFF5DD] px-2.5 py-0.5 rounded-full border border-[#FFE29E]">
              ⚖ DECISION CENTER
            </span>
            <span className="text-xs text-[#8F8F8F] font-mono">// Authoritative Verdicts & Multi-Engine Signals</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-[#2D2D2D]">
            Security Decision & Risk Center
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-1">
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
          <Search size={16} className="text-[#8F8F8F]" />
          <input
            type="text"
            placeholder="Search by event ID, action, target resource, tool..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={15} className="text-[#8F8F8F]" />
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
            <ShieldAlert size={18} className="text-[#FFC857]" />
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
                  className={`border rounded-2xl transition-all duration-200 overflow-hidden ${
                    verdict === 'BLOCK'
                      ? 'border-[#FF8B7B] bg-[#FEECEB]'
                      : verdict === 'REVIEW'
                      ? 'border-[#FDE68A] bg-[#FEF7EA]'
                      : 'border-[#EBEAE6] bg-[#FFFFFF]'
                  }`}
                >
                  {/* Summary Bar */}
                  <div
                    className="p-4 flex items-center justify-between flex-wrap gap-4 cursor-pointer"
                    onClick={() => toggleExpand(evt.eventId)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white border border-[#EBEAE6] flex items-center justify-center font-mono font-bold text-xs text-[#2D2D2D]">
                        {verdict === 'BLOCK' ? '🛡️' : '✓'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#48267E]">
                            {evt.eventId}
                          </span>
                          <span className="font-bold text-sm text-[#2D2D2D]">{evt.action}</span>
                          <span className="text-xs text-[#8F8F8F] font-mono">({evt.tool})</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#6B6B6B] mt-0.5">
                          <span>Agent: <strong>{agent?.name || evt.agentId}</strong></span>
                          <span>•</span>
                          <span>Resource: <code className="bg-white px-1.5 py-0.5 rounded border border-[#EBEAE6] text-[#07477D] font-mono">{evt.resource}</code></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <RiskBadge risk={risk} />
                      <DecisionBadge decision={verdict} />
                      <button
                        type="button"
                        className="btn btn-secondary btn-xs"
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        <span>{isExpanded ? 'Hide Analysis' : 'Explain'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Deep Analysis Drawer */}
                  {isExpanded && (
                    <div className="p-5 border-t border-[#EBEAE6] bg-white flex flex-col gap-4">
                      {dec ? (
                        <>
                          {/* Engine Diagnostic Cards Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <PolicyResultCard
                              event={evt}
                              agent={agent}
                              decision={dec}
                            />
                            <ProvenanceResultCard
                              provenance={evt.provenance}
                              signals={dec.signals}
                            />
                            <IntentResultCard
                              decision={dec}
                              originalIntent={dec.originalIntent || 'Session baseline'}
                            />
                          </div>

                          {/* Security Reasoning Box */}
                          {dec.reasons && dec.reasons.length > 0 && (
                            <div className="p-4 bg-[#FAF9F6] border border-[#EBEAE6] rounded-xl">
                              <div className="flex items-center gap-2 text-xs font-bold text-[#2D2D2D] uppercase mb-2">
                                <FileText size={14} className="text-[#FFC857]" />
                                <span>Authoritative Security Reasoning & Signals</span>
                              </div>
                              <ul className="list-disc pl-5 text-xs text-[#334155] space-y-1">
                                {dec.reasons.map((r, i) => (
                                  <li key={i}>{r}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Mitigation Directive */}
                          {dec.mitigation && (
                            <div className="p-3 bg-[#FEECEB] border border-[#FFC7BF] rounded-xl text-xs flex items-center justify-between">
                              <span className="font-bold text-[#991B1B]">
                                Active Mitigation: {dec.mitigation.action}
                              </span>
                              <span className="font-mono text-[#801C0E]">
                                {dec.mitigation.description || 'Action was actively blocked by policy guardrail.'}
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-4 text-xs text-[#8F8F8F]">
                          <Activity className="spinner mx-auto mb-2" size={16} />
                          Evaluating engine pipeline diagnostics...
                        </div>
                      )}
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
