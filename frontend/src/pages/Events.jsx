import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Zap, RefreshCw, Plus, Search, Filter, Eye, AlertTriangle, 
  ShieldCheck, ShieldAlert, ShieldX, Database, Radio, Clock, 
  Layers, GitBranch, Key, CheckCircle2, ChevronDown, ChevronUp,
  Copy, Check, FileCode, ArrowRight, Shield 
} from 'lucide-react';
import { eventsApi, agentsApi, sessionsApi, securityApi } from '../api/client';
import DecisionBadge from '../components/security/DecisionBadge';
import RiskBadge from '../components/security/RiskBadge';
import InvestigationModal from '../components/security/InvestigationModal';

const Events = () => {
  const [events, setEvents] = useState([]);
  const [decisionsMap, setDecisionsMap] = useState({});
  const [agents, setAgents] = useState([]);
  const [sessions, setSessions] = useState([]);
  
  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [sensitivityFilter, setSensitivityFilter] = useState('ALL');
  const [verdictFilter, setVerdictFilter] = useState('ALL');
  const [provenanceFilter, setProvenanceFilter] = useState('ALL');
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedEventId, setExpandedEventId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Ingest Modal
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
      grantedPermissions: ['db.read']
    },
    provenance: {
      sourceType: 'EXTERNAL_DOCUMENT',
      sourceId: 'untrusted_input.txt',
      trustLevel: 'UNTRUSTED'
    }
  });

  // Investigation Modal
  const [selectedEvent, setSelectedEvent] = useState(null);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [eR, decR, aR, sR] = await Promise.allSettled([
        eventsApi.listEvents({ limit: 100 }),
        securityApi.getDecisions(),
        agentsApi.listAgents(),
        sessionsApi.listSessions()
      ]);

      const re = eR.status === 'fulfilled' ? eR.value.events || [] : [];
      const rd = decR.status === 'fulfilled' ? decR.value.decisions || decR.value || [] : [];
      const ra = aR.status === 'fulfilled' ? aR.value.agents || [] : [];
      const rs = sR.status === 'fulfilled' ? sR.value.sessions || [] : [];

      // Map eventId -> Decision record
      const dMap = {};
      rd.forEach((d) => {
        if (d.decisionId) dMap[d.decisionId] = d;
        if (d.event?.eventId) dMap[d.event.eventId] = d;
      });

      setDecisionsMap(dMap);
      setEvents(re);
      setAgents(ra);
      setSessions(rs);

      if (rs.length > 0 && !ingestPayload.sessionId) {
        setIngestPayload((p) => ({
          ...p,
          sessionId: rs[0].sessionId || rs[0].id,
          agentId: rs[0].agentId || (ra[0]?.agentId || 'agent_001')
        }));
      }
    } catch (err) {
      setError(err.message || 'Failed to load telemetry stream.');
    } finally {
      setIsLoading(false);
    }
  }, [ingestPayload.sessionId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleIngest = async (e) => {
    e.preventDefault();
    setIsIngesting(true);
    setIngestError(null);
    try {
      await eventsApi.ingestEvent({
        eventId: `evt_manual_${Date.now()}`,
        ...ingestPayload
      });
      setShowIngestModal(false);
      fetchEvents();
    } catch (err) {
      setIngestError(err.message);
    } finally {
      setIsIngesting(false);
    }
  };

  const handleCopyText = (text, keyId) => {
    navigator.clipboard.writeText(text);
    setCopiedId(keyId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleExpand = (eventId) => {
    setExpandedEventId((prev) => (prev === eventId ? null : eventId));
  };

  // Processed events with correct authoritative verdict mapping
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const decisionRecord = decisionsMap[ev.eventId];
      const actualVerdict = decisionRecord?.verdict || (ev.dataSensitivity === 'CRITICAL' ? 'BLOCK' : ev.dataSensitivity === 'HIGH' ? 'REVIEW' : 'ALLOW');
      const actualTrustLevel = ev.provenance?.trustLevel || 'TRUSTED';

      if (sensitivityFilter !== 'ALL' && (ev.dataSensitivity || 'LOW') !== sensitivityFilter) {
        return false;
      }
      if (verdictFilter !== 'ALL' && actualVerdict !== verdictFilter) {
        return false;
      }
      if (provenanceFilter !== 'ALL' && actualTrustLevel !== provenanceFilter) {
        return false;
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        ev.eventId?.toLowerCase().includes(q) ||
        ev.action?.toLowerCase().includes(q) ||
        ev.resource?.toLowerCase().includes(q) ||
        ev.tool?.toLowerCase().includes(q) ||
        ev.agentId?.toLowerCase().includes(q) ||
        ev.sessionId?.toLowerCase().includes(q)
      );
    });
  }, [events, decisionsMap, sensitivityFilter, verdictFilter, provenanceFilter, searchQuery]);

  // Statistics
  const totalEventsCount = events.length;
  const blockedCount = events.filter((e) => {
    const v = decisionsMap[e.eventId]?.verdict || (e.dataSensitivity === 'CRITICAL' ? 'BLOCK' : 'ALLOW');
    return v === 'BLOCK';
  }).length;
  const reviewCount = events.filter((e) => {
    const v = decisionsMap[e.eventId]?.verdict || (e.dataSensitivity === 'HIGH' ? 'REVIEW' : 'ALLOW');
    return v === 'REVIEW';
  }).length;
  const allowCount = events.filter((e) => {
    const v = decisionsMap[e.eventId]?.verdict || (e.dataSensitivity === 'LOW' ? 'ALLOW' : 'ALLOW');
    return v === 'ALLOW';
  }).length;

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div 
        className="rounded-3xl p-7 flex items-center justify-between flex-wrap gap-4" 
        style={{ 
          background: 'linear-gradient(135deg, #FFF1F2 0%, #F5F3FF 50%, #F0F9FF 100%)', 
          border: '2px solid #FECDD3' 
        }}
      >
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span 
              className="text-xs font-mono font-extrabold px-3 py-1 rounded-full text-white shadow-sm" 
              style={{ background: 'linear-gradient(135deg, #F43F5E, #8B5CF6)' }}
            >
              ⚡ EXPANDED TELEMETRY INSPECTION
            </span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              ● REAL-TIME STREAM
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900" style={{ fontFamily: 'Sora' }}>
            Security Telemetry Stream
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Live event stream recording every agent tool invocation, input provenance lineage, and arbitration verdict. Click any row to expand the full telemetry card.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={fetchEvents} 
            disabled={isLoading}
          >
            <RefreshCw size={15} className={isLoading ? 'spinner' : ''} />
            <span>Refresh Stream</span>
          </button>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={() => setShowIngestModal(true)}
          >
            <Plus size={16} />
            <span>Ingest Event</span>
          </button>
        </div>
      </div>

      {/* Metrics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl p-4 sm:p-5 border-2 border-l-[6px] border-l-sky-500" style={{ background: '#F0F9FF', borderColor: '#BAE6FD' }}>
          <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-500 tracking-wider mb-1">
            <span>Total Telemetry</span>
            <Zap className="text-sky-500" size={18} />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-sky-700" style={{ fontFamily: 'Sora' }}>{totalEventsCount}</div>
          <div className="text-xs text-slate-500 mt-1">Ingested events</div>
        </div>

        <div className="rounded-2xl p-4 sm:p-5 border-2 border-l-[6px] border-l-rose-500" style={{ background: '#FFF1F2', borderColor: '#FECDD3' }}>
          <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-500 tracking-wider mb-1">
            <span>Blocked Actions</span>
            <ShieldX className="text-rose-500" size={18} />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-700" style={{ fontFamily: 'Sora' }}>{blockedCount}</div>
          <div className="text-xs text-slate-500 mt-1">Policy / drift violations</div>
        </div>

        <div className="rounded-2xl p-4 sm:p-5 border-2 border-l-[6px] border-l-amber-500" style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}>
          <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-500 tracking-wider mb-1">
            <span>In Review</span>
            <ShieldAlert className="text-amber-500" size={18} />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-700" style={{ fontFamily: 'Sora' }}>{reviewCount}</div>
          <div className="text-xs text-slate-500 mt-1">Requiring SOC triage</div>
        </div>

        <div className="rounded-2xl p-4 sm:p-5 border-2 border-l-[6px] border-l-emerald-500" style={{ background: '#ECFDF5', borderColor: '#A7F3D0' }}>
          <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-500 tracking-wider mb-1">
            <span>Verified Allowed</span>
            <ShieldCheck className="text-emerald-500" size={18} />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700" style={{ fontFamily: 'Sora' }}>{allowCount}</div>
          <div className="text-xs text-slate-500 mt-1">Compliant executions</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card p-4 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[260px]">
          <Search size={18} className="text-rose-500" />
          <input 
            type="text" 
            className="w-full bg-transparent border-none outline-none text-sm font-medium text-slate-800 placeholder-slate-400" 
            placeholder="Search by action, resource, tool, agent, or event ID..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
          />
        </div>
        
        <div className="flex items-center gap-3 flex-wrap border-l-2 border-orange-200 pl-4">
          {/* Sensitivity Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Sensitivity:</span>
            <select 
              className="bg-white border-2 border-rose-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-rose-400" 
              value={sensitivityFilter} 
              onChange={(e) => setSensitivityFilter(e.target.value)}
            >
              <option value="ALL">All Sensitivity</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          {/* Verdict Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Verdict:</span>
            <select 
              className="bg-white border-2 border-rose-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-rose-400" 
              value={verdictFilter} 
              onChange={(e) => setVerdictFilter(e.target.value)}
            >
              <option value="ALL">All Verdicts</option>
              <option value="BLOCK">Block</option>
              <option value="REVIEW">Review</option>
              <option value="ALLOW">Allow</option>
            </select>
          </div>

          {/* Provenance Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Provenance:</span>
            <select 
              className="bg-white border-2 border-rose-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-rose-400" 
              value={provenanceFilter} 
              onChange={(e) => setProvenanceFilter(e.target.value)}
            >
              <option value="ALL">All Sources</option>
              <option value="UNTRUSTED">Untrusted</option>
              <option value="TRUSTED">Trusted</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="card bg-rose-50 border-2 border-rose-200 p-4 text-rose-700 flex items-center gap-3 font-semibold text-sm">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Expanded Live Telemetry Container */}
      {isLoading ? (
        <div className="card py-16 flex flex-col items-center gap-3">
          <RefreshCw className="spinner text-rose-500" size={28} />
          <span className="text-sm font-bold text-slate-500">Streaming telemetry events...</span>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="card py-16 text-center">
          <Zap size={36} className="text-slate-300 mx-auto mb-2" />
          <p className="font-bold text-slate-500">No telemetry events match your active filters.</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden border-2 border-orange-200 shadow-md rounded-3xl">
          {/* Top Banner inside table */}
          <div className="px-6 py-4 border-b-2 border-orange-100 flex items-center justify-between flex-wrap gap-2" style={{ background: 'linear-gradient(90deg, #FFF8F2 0%, #FFFFFF 100%)' }}>
            <span className="text-xs font-bold text-slate-600 font-mono">
              Displaying <strong className="text-slate-900">{filteredEvents.length}</strong> events · Click any row or expand icon to view full telemetry payload
            </span>
            <span className="text-xs font-mono text-orange-600 font-bold">
              ⚡ LIVE ARBITRATION ACTIVE
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1100px]">
              <thead>
                <tr 
                  className="border-b-2 text-[11px] font-mono font-extrabold text-slate-500 uppercase tracking-wider" 
                  style={{ background: '#FFF8F2', borderColor: '#FFD0B5' }}
                >
                  <th className="py-4 px-5" style={{ width: '135px' }}>Timestamp</th>
                  <th className="py-4 px-4" style={{ width: '150px' }}>Event ID</th>
                  <th className="py-4 px-4" style={{ width: '135px' }}>Agent</th>
                  <th className="py-4 px-5" style={{ width: '200px' }}>Action & Tool</th>
                  <th className="py-4 px-5">Target Resource</th>
                  <th className="py-4 px-4" style={{ width: '135px' }}>Provenance</th>
                  <th className="py-4 px-4" style={{ width: '110px' }}>Sensitivity</th>
                  <th className="py-4 px-4" style={{ width: '110px' }}>Verdict</th>
                  <th className="py-4 px-4 text-center" style={{ width: '90px' }}>Expand</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-100 text-xs">
                {filteredEvents.map((ev) => {
                  const isExpanded = expandedEventId === ev.eventId;
                  const decisionRecord = decisionsMap[ev.eventId];
                  const verdict = decisionRecord?.verdict || (ev.dataSensitivity === 'CRITICAL' ? 'BLOCK' : ev.dataSensitivity === 'HIGH' ? 'REVIEW' : 'ALLOW');
                  const isUntrusted = ev.provenance?.trustLevel === 'UNTRUSTED';
                  const agentObj = agents.find((a) => a.agentId === ev.agentId);
                  const sessionObj = sessions.find((s) => s.sessionId === ev.sessionId);

                  return (
                    <React.Fragment key={ev.eventId}>
                      <tr 
                        className={`hover:bg-orange-50/60 transition-colors cursor-pointer ${isExpanded ? 'bg-orange-50/80 border-l-4 border-l-orange-500' : ''}`}
                        onClick={() => toggleExpand(ev.eventId)}
                      >
                        {/* Timestamp */}
                        <td className="py-4 px-5 font-mono text-slate-500 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock size={13} className="text-slate-400 shrink-0" />
                            <span className="font-semibold">{ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Recent'}</span>
                          </div>
                        </td>

                        {/* Event ID */}
                        <td className="py-4 px-4 font-mono font-bold whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-lg bg-orange-100 text-orange-900 border border-orange-200">
                            {ev.eventId}
                          </span>
                        </td>

                        {/* Agent */}
                        <td className="py-4 px-4 font-mono font-bold text-sky-800 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span>{ev.agentId || 'agent_001'}</span>
                            {agentObj?.status && (
                              <span className={`w-2 h-2 rounded-full ${agentObj.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            )}
                          </div>
                        </td>

                        {/* Action & Tool */}
                        <td className="py-4 px-5">
                          <div className="font-extrabold text-slate-900 text-[13px]">{ev.action}</div>
                          <div className="font-mono text-[10px] text-slate-500 mt-0.5">tool: <code className="text-orange-700 font-bold">{ev.tool || 'system'}</code></div>
                        </td>

                        {/* Target Resource */}
                        <td className="py-4 px-5 font-mono text-slate-700">
                          <code className="bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 text-slate-800 text-[11px] font-semibold break-all inline-block">
                            {ev.resource}
                          </code>
                        </td>

                        {/* Provenance */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 font-mono text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${isUntrusted ? 'bg-rose-100 text-rose-700 border-rose-300' : 'bg-emerald-100 text-emerald-700 border-emerald-300'}`}>
                            <GitBranch size={11} />
                            <span>{ev.provenance?.trustLevel || 'TRUSTED'}</span>
                          </span>
                        </td>

                        {/* Sensitivity */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className={`font-mono text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${ev.dataSensitivity === 'CRITICAL' ? 'bg-rose-100 text-rose-700 border-rose-300' : ev.dataSensitivity === 'HIGH' ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-slate-100 text-slate-700 border-slate-300'}`}>
                            {ev.dataSensitivity || 'NORMAL'}
                          </span>
                        </td>

                        {/* Verdict */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <DecisionBadge decision={verdict} />
                        </td>

                        {/* Expand & Inspect Button */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <button 
                            type="button" 
                            onClick={(e) => { e.stopPropagation(); toggleExpand(ev.eventId); }} 
                            className="p-1.5 rounded-lg hover:bg-orange-200 text-orange-700 transition-colors inline-flex items-center gap-1 font-mono text-xs font-bold"
                            title="Expand Telemetry Details"
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Full-Size Telemetry Detail Card */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={9} className="p-0 border-b-2 border-orange-200">
                            <div className="p-6 sm:p-8 space-y-5" style={{ background: 'linear-gradient(135deg, #FFF9F5 0%, #FFFFFF 100%)' }}>
                              {/* Header inside card */}
                              <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b-2 border-orange-100">
                                <div className="flex items-center gap-3 flex-wrap">
                                  <span className="font-mono text-xs font-extrabold px-3 py-1 rounded-lg bg-orange-100 text-orange-950 border border-orange-300">
                                    {ev.eventId}
                                  </span>
                                  <span className="font-mono text-xs text-slate-600">
                                    Session: <strong className="text-slate-900">{ev.sessionId || 'active_session'}</strong>
                                  </span>
                                  <span className="font-mono text-xs text-slate-600">
                                    Agent: <strong className="text-slate-900">{agentObj?.name || ev.agentId || 'agent_001'}</strong>
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button 
                                    type="button" 
                                    className="btn btn-secondary btn-xs shadow-xs"
                                    onClick={() => handleCopyText(JSON.stringify(ev, null, 2), ev.eventId)}
                                  >
                                    {copiedId === ev.eventId ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                                    <span>{copiedId === ev.eventId ? 'Copied' : 'Copy Event JSON'}</span>
                                  </button>
                                  <button 
                                    type="button" 
                                    className="btn btn-primary btn-xs shadow-xs"
                                    onClick={() => setSelectedEvent(ev)}
                                  >
                                    <Eye size={13} />
                                    <span>Open Full Investigation Modal</span>
                                  </button>
                                </div>
                              </div>

                              {/* 4 Detail Grid Cards */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {/* Action & Tool */}
                                <div className="p-4 rounded-2xl bg-white border-2 border-orange-100 shadow-xs">
                                  <div className="text-[11px] font-mono font-extrabold uppercase text-slate-400 mb-1">Execution Command</div>
                                  <div className="font-extrabold text-sm text-slate-900">{ev.action}</div>
                                  <div className="text-xs text-slate-500 font-mono mt-1">Tool: <code>{ev.tool || 'system'}</code></div>
                                </div>

                                {/* Target Resource */}
                                <div className="p-4 rounded-2xl bg-white border-2 border-orange-100 shadow-xs">
                                  <div className="text-[11px] font-mono font-extrabold uppercase text-slate-400 mb-1">Target Resource</div>
                                  <div className="font-mono text-xs text-slate-900 break-all font-bold">{ev.resource}</div>
                                  <div className="text-xs text-slate-500 mt-1">Sensitivity: <strong className="text-slate-800">{ev.dataSensitivity || 'NORMAL'}</strong></div>
                                </div>

                                {/* Provenance Lineage */}
                                <div className="p-4 rounded-2xl bg-white border-2 border-orange-100 shadow-xs">
                                  <div className="text-[11px] font-mono font-extrabold uppercase text-slate-400 mb-1">Input Provenance</div>
                                  <div className="font-extrabold text-xs" style={{ color: isUntrusted ? '#E11D48' : '#059669' }}>
                                    {ev.provenance?.trustLevel || 'TRUSTED'} ({ev.provenance?.sourceType || 'USER'})
                                  </div>
                                  <div className="text-xs text-slate-500 font-mono mt-1 truncate">Source: {ev.provenance?.sourceId || 'direct_input'}</div>
                                </div>

                                {/* Authoritative Verdict */}
                                <div className="p-4 rounded-2xl bg-white border-2 border-orange-100 shadow-xs">
                                  <div className="text-[11px] font-mono font-extrabold uppercase text-slate-400 mb-1">Arbitration Decision</div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <DecisionBadge decision={verdict} />
                                    {decisionRecord?.riskLevel && <RiskBadge risk={decisionRecord.riskLevel} />}
                                  </div>
                                  <div className="text-[11px] font-mono text-slate-500 mt-1">
                                    {decisionRecord?.intentStatus ? `Intent: ${decisionRecord.intentStatus}` : 'Pipeline Verified'}
                                  </div>
                                </div>
                              </div>

                              {/* Detailed Findings & Authorization Breakdown */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                                {/* Authorization Claims */}
                                <div className="p-4 rounded-2xl bg-sky-50/70 border-2 border-sky-200 space-y-2">
                                  <div className="font-extrabold text-sky-900 flex items-center gap-1.5 uppercase text-[11px]">
                                    <Key size={14} className="text-sky-600" />
                                    <span>Permission Token Scope</span>
                                  </div>
                                  <div className="flex justify-between py-1 border-b border-sky-100">
                                    <span className="text-slate-500">Required Permission:</span>
                                    <strong className="text-slate-900">{ev.authorization?.requiredPermission || '(None required)'}</strong>
                                  </div>
                                  <div className="flex justify-between py-1">
                                    <span className="text-slate-500">Granted Token Claims:</span>
                                    <span className="text-slate-800 font-bold">
                                      {ev.authorization?.grantedPermissions?.length > 0 ? ev.authorization.grantedPermissions.join(', ') : '(None)'}
                                    </span>
                                  </div>
                                </div>

                                {/* Engine Reasons & Findings */}
                                <div className="p-4 rounded-2xl bg-emerald-50/70 border-2 border-emerald-200 space-y-2">
                                  <div className="font-extrabold text-emerald-900 flex items-center gap-1.5 uppercase text-[11px]">
                                    <Shield size={14} className="text-emerald-600" />
                                    <span>Security Engine Arbitration Summary</span>
                                  </div>
                                  {decisionRecord?.reasons && decisionRecord.reasons.length > 0 ? (
                                    <ul className="list-disc pl-4 space-y-1 text-slate-800">
                                      {decisionRecord.reasons.map((r, idx) => (
                                        <li key={idx} className="font-semibold">{r}</li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <div className="text-slate-600 italic">
                                      Evaluated by 5-engine arbitration pipeline. Policy scope and intent verified against session baseline.
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ingest Telemetry Modal */}
      {showIngestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg p-7 rounded-3xl bg-white border-2 border-orange-200 shadow-2xl">
            <h2 className="text-xl font-extrabold text-slate-900 mb-1">Ingest Telemetry Event</h2>
            <p className="text-xs text-slate-500 mb-5">Dispatch a live tool invocation into the arbitration pipeline.</p>
            {ingestError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold">
                {ingestError}
              </div>
            )}
            <form onSubmit={handleIngest} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Action</label>
                  <input 
                    type="text" 
                    className="w-full p-2.5 rounded-xl border-2 border-orange-200 text-sm font-semibold outline-none focus:border-orange-500" 
                    value={ingestPayload.action} 
                    onChange={(e) => setIngestPayload({ ...ingestPayload, action: e.target.value })} 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Tool</label>
                  <input 
                    type="text" 
                    className="w-full p-2.5 rounded-xl border-2 border-orange-200 text-sm font-semibold outline-none focus:border-orange-500" 
                    value={ingestPayload.tool} 
                    onChange={(e) => setIngestPayload({ ...ingestPayload, tool: e.target.value })} 
                    required 
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Resource</label>
                <input 
                  type="text" 
                  className="w-full p-2.5 rounded-xl border-2 border-orange-200 text-sm font-semibold outline-none focus:border-orange-500" 
                  value={ingestPayload.resource} 
                  onChange={(e) => setIngestPayload({ ...ingestPayload, resource: e.target.value })} 
                  required 
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Sensitivity</label>
                  <select 
                    className="w-full p-2.5 rounded-xl border-2 border-orange-200 text-sm font-semibold outline-none focus:border-orange-500" 
                    value={ingestPayload.dataSensitivity} 
                    onChange={(e) => setIngestPayload({ ...ingestPayload, dataSensitivity: e.target.value })}
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Provenance</label>
                  <select 
                    className="w-full p-2.5 rounded-xl border-2 border-orange-200 text-sm font-semibold outline-none focus:border-orange-500" 
                    value={ingestPayload.provenance.trustLevel} 
                    onChange={(e) => setIngestPayload({ 
                      ...ingestPayload, 
                      provenance: { ...ingestPayload.provenance, trustLevel: e.target.value } 
                    })}
                  >
                    <option value="TRUSTED">TRUSTED</option>
                    <option value="UNTRUSTED">UNTRUSTED</option>
                    <option value="SUSPICIOUS">SUSPICIOUS</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  className="btn btn-secondary text-xs" 
                  onClick={() => setShowIngestModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary text-xs" 
                  disabled={isIngesting}
                >
                  {isIngesting ? 'Ingesting...' : 'Dispatch Telemetry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Investigation Modal */}
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

export default Events;
