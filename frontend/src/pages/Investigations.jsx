import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  RefreshCw, FileCode, AlertTriangle, Copy, Check, Key, GitBranch, 
  Compass, Layers, Search, ArrowUpDown, Filter, Shield, Activity, 
  Flame, LayoutGrid, Maximize2, SplitSquareVertical
} from 'lucide-react';
import { eventsApi, securityApi, agentsApi, sessionsApi } from '../api/client';
import DecisionBadge from '../components/security/DecisionBadge';
import RiskBadge from '../components/security/RiskBadge';

const Investigations = () => {
  const [events, setEvents] = useState([]);
  const [decisionsMap, setDecisionsMap] = useState({});
  const [agents, setAgents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [securityDecision, setSecurityDecision] = useState(null);
  const [activeTab, setActiveTab] = useState('ALL');
  const [viewMode, setViewMode] = useState('SPLIT'); // 'SPLIT' | 'QUEUE' | 'FOCUS'
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isLoadingDecision, setIsLoadingDecision] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Sorting & Filtering State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'severity' | 'score'
  const [filterVerdict, setFilterVerdict] = useState('ALL'); // 'ALL' | 'BLOCK' | 'REVIEW' | 'ALLOW'

  const fetchInitialData = useCallback(async () => {
    setIsLoadingEvents(true); 
    setError(null);
    try {
      const [evRes, decRes, agRes, sessRes] = await Promise.allSettled([
        eventsApi.listEvents({ limit: 100 }),
        securityApi.getDecisions(),
        agentsApi.listAgents(),
        sessionsApi.listSessions()
      ]);
      
      const rawEvents = evRes.status === 'fulfilled' ? evRes.value.events || [] : [];
      const rawDecisions = decRes.status === 'fulfilled' ? decRes.value.decisions || [] : [];
      const rawAgents = agRes.status === 'fulfilled' ? agRes.value.agents || [] : [];
      const rawSessions = sessRes.status === 'fulfilled' ? sessRes.value.sessions || [] : [];
      
      // Build a map of eventId -> decision summary
      const dMap = {};
      rawDecisions.forEach(d => {
        if (d.decisionId) dMap[d.decisionId] = d;
      });
      setDecisionsMap(dMap);

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
    fetchInitialData(); 
  }, [fetchInitialData]);

  // Load detailed decision breakdown for the selected event
  useEffect(() => {
    if (!selectedEventId) return;
    let isMounted = true;
    setIsLoadingDecision(true);
    async function loadDecision() { 
      try { 
        const dec = await securityApi.getDecision(selectedEventId); 
        if (isMounted) setSecurityDecision(dec); 
      } catch { 
        if (isMounted) setSecurityDecision(null); 
      } finally {
        if (isMounted) setIsLoadingDecision(false);
      }
    }
    loadDecision();
    return () => { isMounted = false; };
  }, [selectedEventId]);

  // Sorted and filtered event list
  const processedEvents = useMemo(() => {
    let result = [...events];

    // Filter by verdict
    if (filterVerdict !== 'ALL') {
      result = result.filter(e => {
        const dec = decisionsMap[e.eventId];
        const v = dec?.verdict || (e.dataSensitivity === 'CRITICAL' ? 'BLOCK' : e.dataSensitivity === 'HIGH' ? 'REVIEW' : 'ALLOW');
        return v === filterVerdict;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(e => 
        (e.eventId && e.eventId.toLowerCase().includes(q)) ||
        (e.action && e.action.toLowerCase().includes(q)) ||
        (e.resource && e.resource.toLowerCase().includes(q)) ||
        (e.agentId && e.agentId.toLowerCase().includes(q)) ||
        (e.sessionId && e.sessionId.toLowerCase().includes(q))
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime();
      }
      if (sortBy === 'severity') {
        const score = (ev) => {
          const dec = decisionsMap[ev.eventId];
          if (dec?.verdict === 'BLOCK' || ev.dataSensitivity === 'CRITICAL') return 3;
          if (dec?.verdict === 'REVIEW' || ev.dataSensitivity === 'HIGH') return 2;
          return 1;
        };
        return score(b) - score(a);
      }
      if (sortBy === 'score') {
        const getScore = (ev) => decisionsMap[ev.eventId]?.engineResults?.trust?.score ?? 100;
        return getScore(a) - getScore(b);
      }
      return 0;
    });

    return result;
  }, [events, decisionsMap, filterVerdict, searchQuery, sortBy]);

  const selectedEvent = events.find((e) => e.eventId === selectedEventId) || processedEvents[0] || events[0];
  const selectedAgent = agents.find((a) => a.agentId === selectedEvent?.agentId || a.agent_id_str === selectedEvent?.agentId);
  const selectedSession = sessions.find((s) => s.sessionId === selectedEvent?.sessionId || s.session_id_str === selectedEvent?.sessionId);
  const selectedDecisionSummary = selectedEvent ? decisionsMap[selectedEvent.eventId] : null;

  // Real calculated values
  const actualVerdict = securityDecision?.decision || selectedDecisionSummary?.verdict || (selectedEvent?.dataSensitivity === 'CRITICAL' ? 'BLOCK' : selectedEvent?.dataSensitivity === 'HIGH' ? 'REVIEW' : 'ALLOW');
  const actualRiskLevel = securityDecision?.riskLevel || (actualVerdict === 'BLOCK' ? 'CRITICAL' : actualVerdict === 'REVIEW' ? 'HIGH' : 'LOW');
  const actualTrustScore = securityDecision?.trustScore ?? (selectedDecisionSummary?.engineResults?.trust?.score ?? (selectedAgent?.currentTrustScore || 95));
  const actualIntentAlignment = securityDecision?.intent?.alignmentScore !== undefined 
    ? (securityDecision.intent.alignmentScore * 100).toFixed(0) 
    : (selectedDecisionSummary?.engineResults?.intent?.score !== undefined ? selectedDecisionSummary.engineResults.intent.score : '100');
  const actualIntentStatus = securityDecision?.intent?.status || (parseFloat(actualIntentAlignment) < 70 ? 'DRIFT' : 'ALIGNED');
  const actualSignals = securityDecision?.securitySignals || {};
  const actualReasons = securityDecision?.reasons || [];
  const actualChainId = securityDecision?.attackChain?.chainId;

  const handleCopyJson = () => {
    const payload = {
      event: selectedEvent,
      decision: securityDecision || selectedDecisionSummary,
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopied(true); 
    setTimeout(() => setCopied(false), 2000);
  };

  const tabCfg = [
    { id: 'ALL', label: 'All Evidence', icon: Layers, color: '#8B5CF6' },
    { id: 'POLICY', label: '1. Policy Scope', icon: Key, color: '#0EA5E9' },
    { id: 'PROVENANCE', label: '2. Provenance', icon: GitBranch, color: '#EC4899' },
    { id: 'INTENT', label: '3. Intent Drift', icon: Compass, color: '#F59E0B' },
    { id: 'REASONS', label: '4. Findings & Audit', icon: Shield, color: '#10B981' },
    { id: 'JSON', label: 'Raw Payload JSON', icon: FileCode, color: '#FF6B35' },
  ];

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <div 
        className="rounded-3xl p-6 sm:p-8" 
        style={{ 
          background: 'linear-gradient(135deg, #FFF4ED 0%, #FFFBEB 35%, #F5F3FF 70%, #ECFDF5 100%)', 
          border: '2px solid #FFD0B5',
          boxShadow: '0 8px 30px rgba(255, 107, 53, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div style={{ maxWidth: '680px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <span 
              className="text-xs font-mono font-extrabold px-3 py-1 rounded-full text-white shadow-sm" 
              style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)' }}
            >
              🔬 DIGITAL FORENSICS STUDIO
            </span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              ● REAL-TIME DECISION TELEMETRY
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900" style={{ fontFamily: 'Sora' }}>
            Forensic Investigation Lab
          </h1>
          <p className="text-sm text-slate-600" style={{ marginTop: '6px', lineHeight: '1.5' }}>
            Inspect runtime agent payloads, PostgreSQL permissions, origin provenance, and dynamic cosine similarity drift side-by-side.
          </p>
        </div>

        {/* View Layout Controls & Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: '#FFFFFF', padding: '4px', borderRadius: '12px', border: '1.5px solid #F5D5BC', gap: '4px' }}>
            <button 
              type="button" 
              onClick={() => setViewMode('SPLIT')}
              className={`tab-pill-button ${viewMode === 'SPLIT' ? 'active' : ''}`}
              style={viewMode === 'SPLIT' ? { background: '#FF6B35' } : {}}
              title="Side-by-side 2-column view"
            >
              <SplitSquareVertical size={14} />
              <span>Side-by-Side</span>
            </button>
            <button 
              type="button" 
              onClick={() => setViewMode('QUEUE')}
              className={`tab-pill-button ${viewMode === 'QUEUE' ? 'active' : ''}`}
              style={viewMode === 'QUEUE' ? { background: '#FF6B35' } : {}}
              title="Full event queue browser"
            >
              <LayoutGrid size={14} />
              <span>Queue Only</span>
            </button>
            <button 
              type="button" 
              onClick={() => setViewMode('FOCUS')}
              className={`tab-pill-button ${viewMode === 'FOCUS' ? 'active' : ''}`}
              style={viewMode === 'FOCUS' ? { background: '#FF6B35' } : {}}
              title="Maximize forensic workspace"
            >
              <Maximize2 size={14} />
              <span>Focus Workspace</span>
            </button>
          </div>

          <button 
            type="button" 
            className="btn btn-secondary shadow-sm" 
            onClick={fetchInitialData} 
            disabled={isLoadingEvents}
          >
            <RefreshCw size={15} className={isLoadingEvents ? 'spinner' : ''} />
            <span>Refresh Studio</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="card bg-rose-50 border-2 border-rose-200 p-4 text-rose-700 flex items-center gap-3 font-semibold text-sm rounded-2xl">
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <span style={{ wordBreak: 'break-all' }}>{error}</span>
        </div>
      )}

      {/* Main Forensic Studio Layout Container */}
      <div 
        className="forensics-studio-split" 
        style={
          viewMode === 'QUEUE' 
            ? { gridTemplateColumns: '1fr' } 
            : viewMode === 'FOCUS' 
            ? { gridTemplateColumns: '1fr' } 
            : { gridTemplateColumns: '340px 1fr' }
        }
      >
        {/* Left Column: Event Queue List */}
        {viewMode !== 'FOCUS' && (
          <div className="forensics-queue-sidebar">
            {/* Header & Item Counter */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1.5px solid #F5D5BC' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Activity size={16} className="text-orange-500" />
                <span style={{ fontSize: '0.78rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#2D1B0E' }}>
                  Telemetry Log
                </span>
              </div>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                {processedEvents.length} / {events.length} Events
              </span>
            </div>

            {/* Search Box */}
            <div style={{ position: 'relative', marginTop: '10px', marginBottom: '8px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Search action, target, agent..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', paddingLeft: '32px', paddingRight: '10px', paddingTop: '8px', paddingBottom: '8px', fontSize: '0.78rem', borderRadius: '10px', border: '1.5px solid #F5D5BC', background: '#FFF8F2', outline: 'none' }}
              />
            </div>

            {/* Sort & Filter Controls */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px', background: '#FFF8F2', padding: '4px 6px', borderRadius: '8px', border: '1px solid #F5D5BC' }}>
                <ArrowUpDown size={12} className="text-orange-600" />
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{ background: 'transparent', border: 'none', fontSize: '0.72rem', fontWeight: '700', color: '#2D1B0E', outline: 'none', width: '100%', cursor: 'pointer' }}
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="severity">High Severity</option>
                  <option value="score">Lowest Trust</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#FFF8F2', padding: '4px 6px', borderRadius: '8px', border: '1px solid #F5D5BC' }}>
                <Filter size={12} className="text-orange-600" />
                <select 
                  value={filterVerdict} 
                  onChange={(e) => setFilterVerdict(e.target.value)}
                  style={{ background: 'transparent', border: 'none', fontSize: '0.72rem', fontWeight: '700', color: '#2D1B0E', outline: 'none', cursor: 'pointer' }}
                >
                  <option value="ALL">All Status</option>
                  <option value="BLOCK">Block</option>
                  <option value="REVIEW">Review</option>
                  <option value="ALLOW">Allow</option>
                </select>
              </div>
            </div>

            {/* Scrollable Event Queue Cards */}
            <div className="forensics-queue-scroll">
              {isLoadingEvents ? (
                <div style={{ padding: '48px 0', textAlign: 'center', fontSize: '0.78rem', color: '#64748b' }}>
                  <RefreshCw className="spinner text-orange-500 mx-auto" size={24} style={{ marginBottom: '8px' }} />
                  <span>Loading forensic evidence log...</span>
                </div>
              ) : processedEvents.length === 0 ? (
                <div style={{ padding: '48px 0', textAlign: 'center', fontSize: '0.78rem', color: '#94a3b8' }}>
                  No telemetry events match your filters.
                </div>
              ) : (
                processedEvents.map((ev) => {
                  const isSelected = ev.eventId === (selectedEvent?.eventId || selectedEventId);
                  const dec = decisionsMap[ev.eventId];
                  const verdict = dec?.verdict || (ev.dataSensitivity === 'CRITICAL' ? 'BLOCK' : ev.dataSensitivity === 'HIGH' ? 'REVIEW' : 'ALLOW');
                  
                  return (
                    <div 
                      key={ev.eventId} 
                      className={`forensics-event-card ${isSelected ? 'active-selected' : ''}`}
                      onClick={() => {
                        setSelectedEventId(ev.eventId);
                        if (viewMode === 'QUEUE') setViewMode('SPLIT');
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                        <span className="font-mono text-[11px] font-extrabold text-slate-800 truncate" style={{ maxWidth: '180px' }}>
                          {ev.eventId}
                        </span>
                        <DecisionBadge decision={verdict} />
                      </div>

                      <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={ev.action}>
                        {ev.action}
                      </div>

                      <div style={{ fontSize: '0.72rem', fontFamily: 'JetBrains Mono, monospace', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={ev.resource}>
                        {ev.resource}
                      </div>

                      <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #FFF0E6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem', color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace' }}>
                        <span style={{ fontWeight: '700', color: '#475569' }}>
                          {ev.agentId || 'agent_001'}
                        </span>
                        <span>
                          {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Recorded'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Right Column: Forensic Evidence Workspace Panel */}
        {viewMode !== 'QUEUE' && (
          selectedEvent ? (
            <div className="forensics-workspace-panel">
              {/* Meta Header */}
              <div style={{ paddingBottom: '16px', borderBottom: '1.5px solid #F5D5BC' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span className="font-mono text-xs font-extrabold px-3 py-1 rounded-lg bg-orange-100 text-orange-900 border border-orange-300">
                      {selectedEvent.eventId}
                    </span>
                    <span className="font-mono text-xs text-slate-600 font-semibold">
                      • Session: <strong className="text-slate-900">{selectedEvent.sessionId || 'active_session'}</strong>
                    </span>
                    <span className="font-mono text-xs text-slate-600 font-semibold">
                      • Agent: <strong className="text-slate-900">{selectedEvent.agentId || 'agent_001'}</strong>
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <RiskBadge risk={actualRiskLevel} />
                    <DecisionBadge decision={actualVerdict} />
                  </div>
                </div>

                {/* Action & Resource Banner */}
                <div style={{ background: '#FFF8F2', padding: '14px 18px', borderRadius: '14px', border: '1px solid #F5D5BC' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#FF6B35' }}>
                      Targeted Execution Action & Target
                    </span>
                    <span style={{ fontSize: '0.72rem', fontFamily: 'JetBrains Mono, monospace', fontWeight: '700', color: '#64748B' }}>
                      Tool: <code style={{ color: '#0F172A', fontWeight: '800' }}>{selectedEvent.tool || 'system'}</code>
                    </span>
                  </div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0F172A', wordBreak: 'break-word', margin: 0 }}>
                    <span style={{ color: '#FF6B35' }}>{selectedEvent.action}</span>
                    <span style={{ color: '#94A3B8', margin: '0 8px' }}>&rarr;</span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.05rem', color: '#1E293B' }}>{selectedEvent.resource}</span>
                  </h2>
                </div>

                {/* 4 Dynamic Metric Boxes */}
                <div className="forensics-metrics-strip" style={{ marginTop: '14px' }}>
                  <div className="metric-stat-box">
                    <span className="m-label">Trust Score</span>
                    <span className="m-val" style={{ color: actualTrustScore < 50 ? '#E11D48' : actualTrustScore < 80 ? '#D97706' : '#059669' }}>
                      {actualTrustScore} / 100
                    </span>
                  </div>
                  <div className="metric-stat-box">
                    <span className="m-label">Intent Alignment</span>
                    <span className="m-val" style={{ color: parseFloat(actualIntentAlignment) < 70 ? '#E11D48' : '#059669' }}>
                      {actualIntentAlignment}%
                    </span>
                  </div>
                  <div className="metric-stat-box">
                    <span className="m-label">Provenance Origin</span>
                    <span className="m-val" style={{ fontSize: '0.85rem', color: selectedEvent.provenance?.trustLevel === 'UNTRUSTED' ? '#E11D48' : '#059669' }}>
                      {selectedEvent.provenance?.trustLevel || 'TRUSTED'}
                    </span>
                  </div>
                  <div className="metric-stat-box">
                    <span className="m-label">Data Sensitivity</span>
                    <span className="m-val" style={{ fontSize: '0.9rem', color: '#0F172A' }}>
                      {selectedEvent.dataSensitivity || 'LOW'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div style={{ display: 'flex', gap: '8px', paddingBottom: '12px', borderBottom: '1.5px solid #F5D5BC', flexWrap: 'wrap' }}>
                {tabCfg.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button 
                      key={tab.id} 
                      type="button" 
                      className={`tab-pill-button ${isActive ? 'active' : ''}`}
                      style={isActive ? { background: tab.color, boxShadow: `0 4px 14px ${tab.color}35` } : {}} 
                      onClick={() => setActiveTab(tab.id)}
                    >
                      <Icon size={14} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tab Contents */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* 1. Policy Scope */}
                {(activeTab === 'ALL' || activeTab === 'POLICY') && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <h3 style={{ fontSize: '0.78rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Key size={16} className="text-sky-600" />
                      <span>1. Authoritative Policy & Scope Engine</span>
                    </h3>
                    <div style={{ background: '#F0F9FF', border: '1.5px solid #BAE6FD', borderRadius: '16px', padding: '16px', fontSize: '0.8rem', fontFamily: 'JetBrains Mono, monospace', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #E0F2FE', flexWrap: 'wrap', gap: '4px' }}>
                        <span style={{ color: '#64748B', fontWeight: '700' }}>Required Permission Token:</span>
                        <span style={{ color: '#0F172A', fontWeight: '800' }}>
                          <code>{selectedEvent.authorization?.requiredPermission || '(None required)'}</code>
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #E0F2FE', flexWrap: 'wrap', gap: '4px' }}>
                        <span style={{ color: '#64748B', fontWeight: '700' }}>Agent Claimed Permissions:</span>
                        <span style={{ color: '#334155', fontWeight: '700' }}>
                          {selectedEvent.authorization?.grantedPermissions?.length > 0 
                            ? selectedEvent.authorization.grantedPermissions.join(', ') 
                            : '(None claimed)'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #E0F2FE', flexWrap: 'wrap', gap: '4px' }}>
                        <span style={{ color: '#64748B', fontWeight: '700' }}>Registered (agents.permissions):</span>
                        <span style={{ color: '#047857', fontWeight: '800' }}>
                          {selectedAgent?.permissions?.length > 0 ? selectedAgent.permissions.join(', ') : 'file.read, db.read, llm.evaluate'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                        <span style={{ color: '#64748B', fontWeight: '700' }}>Policy Engine Verification:</span>
                        <span style={{ fontWeight: '800', color: actualSignals.policyViolation ? '#E11D48' : '#047857' }}>
                          {actualSignals.policyViolation ? 'POLICY VIOLATION DETECTED' : 'AUTHORIZED & VERIFIED'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Provenance */}
                {(activeTab === 'ALL' || activeTab === 'PROVENANCE') && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <h3 style={{ fontSize: '0.78rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <GitBranch size={16} className="text-pink-600" />
                      <span>2. Input Provenance & Lineage Engine</span>
                    </h3>
                    <div style={{ background: '#FDF2F8', border: '1.5px solid #FBCFE8', borderRadius: '16px', padding: '16px', fontSize: '0.8rem', fontFamily: 'JetBrains Mono, monospace', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #FCE7F3', flexWrap: 'wrap', gap: '4px' }}>
                        <span style={{ color: '#64748B', fontWeight: '700' }}>Source Origin Type:</span>
                        <span style={{ color: '#0F172A', fontWeight: '800' }}>
                          {selectedEvent.provenance?.sourceType || 'USER / DIRECT'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #FCE7F3', flexWrap: 'wrap', gap: '4px' }}>
                        <span style={{ color: '#64748B', fontWeight: '700' }}>Payload / Source ID:</span>
                        <span style={{ color: '#0F172A', fontWeight: '800' }}>
                          <code>{selectedEvent.provenance?.sourceId || '(None)'}</code>
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #FCE7F3', flexWrap: 'wrap', gap: '4px' }}>
                        <span style={{ color: '#64748B', fontWeight: '700' }}>Provenance Trust Level:</span>
                        <span style={{ fontWeight: '800', color: selectedEvent.provenance?.trustLevel === 'UNTRUSTED' ? '#E11D48' : '#047857' }}>
                          {selectedEvent.provenance?.trustLevel || 'TRUSTED'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                        <span style={{ color: '#64748B', fontWeight: '700' }}>Lineage Risk Evaluation:</span>
                        <span style={{ fontWeight: '800', color: actualSignals.provenanceRisk === 'HIGH' || actualSignals.provenanceRisk === 'CRITICAL' ? '#E11D48' : '#047857' }}>
                          {actualSignals.provenanceRisk || (selectedEvent.provenance?.trustLevel === 'UNTRUSTED' ? 'HIGH' : 'LOW')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Intent Drift */}
                {(activeTab === 'ALL' || activeTab === 'INTENT') && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <h3 style={{ fontSize: '0.78rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Compass size={16} className="text-amber-600" />
                      <span>3. Semantic Intent & Goal Integrity Engine</span>
                    </h3>
                    <div style={{ background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: '16px', padding: '16px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div>
                        <span style={{ fontSize: '0.68rem', fontWeight: '800', textTransform: 'uppercase', color: '#78716C', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: '4px' }}>
                          Registered Baseline Objective:
                        </span>
                        <div style={{ background: '#FFFFFF', padding: '12px 14px', borderRadius: '12px', border: '1px solid #FDE68A', fontStyle: 'italic', color: '#1E293B', lineHeight: '1.5' }}>
                          "{selectedSession?.originalIntent || selectedAgent?.declaredObjective || 'Analyze quarterly financial telemetry'}"
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #FEF3C7', fontFamily: 'JetBrains Mono, monospace', flexWrap: 'wrap', gap: '4px' }}>
                        <span style={{ color: '#78716C', fontWeight: '700' }}>Cosine Alignment Calculation:</span>
                        <span style={{ fontWeight: '800', color: parseFloat(actualIntentAlignment) < 70 ? '#E11D48' : '#047857' }}>
                          {actualIntentAlignment}% ({actualIntentStatus})
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono, monospace', flexWrap: 'wrap', gap: '4px' }}>
                        <span style={{ color: '#78716C', fontWeight: '700' }}>Drift Vector Flag:</span>
                        <span style={{ fontWeight: '800', color: actualSignals.intentDrift ? '#E11D48' : '#047857' }}>
                          {actualSignals.intentDrift ? 'DRIFT DETECTED (LOSS OF GOAL ALIGNMENT)' : 'ALIGNED WITH DECLARED GOAL'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Authoritative Findings */}
                {(activeTab === 'ALL' || activeTab === 'REASONS') && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <h3 style={{ fontSize: '0.78rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Shield size={16} className="text-emerald-600" />
                      <span>4. Authoritative Findings & Pipeline Reasoning</span>
                    </h3>
                    <div style={{ background: '#ECFDF5', border: '1.5px solid #A7F3D0', borderRadius: '16px', padding: '16px', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {actualReasons.length > 0 ? (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {actualReasons.map((reasonText, idx) => (
                            <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', color: '#064E3B', lineHeight: '1.5' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', marginTop: '6px', flexShrink: 0 }} />
                              <span style={{ fontWeight: '600' }}>{reasonText}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div style={{ color: '#065F46', fontStyle: 'italic' }}>
                          Action evaluated by all security engines. No anomalous violations detected.
                        </div>
                      )}

                      {actualChainId && (
                        <div style={{ paddingTop: '10px', borderTop: '1px solid #D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace' }}>
                          <span style={{ color: '#9F1239', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Flame size={14} className="text-rose-500" />
                            Correlated Attack Chain:
                          </span>
                          <span style={{ fontWeight: '800', color: '#0F172A', background: '#FFE4E6', padding: '2px 8px', borderRadius: '6px', border: '1px solid #FECDD3' }}>
                            {actualChainId}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 5. Raw JSON Audit */}
                {activeTab === 'JSON' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <h3 style={{ fontSize: '0.78rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileCode size={16} className="text-orange-600" />
                        <span>Authoritative Telemetry & Decision JSON</span>
                      </h3>
                      <button 
                        type="button" 
                        className="btn btn-secondary btn-xs shadow-xs" 
                        onClick={handleCopyJson}
                      >
                        {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                        <span>{copied ? 'Copied to Clipboard' : 'Copy JSON'}</span>
                      </button>
                    </div>
                    <pre 
                      style={{ 
                        background: 'linear-gradient(135deg, #1E1B18 0%, #29221C 100%)', 
                        color: '#6EE7B7',
                        padding: '18px',
                        borderRadius: '16px',
                        fontSize: '0.78rem',
                        fontFamily: 'JetBrains Mono, monospace',
                        lineHeight: '1.5',
                        overflowX: 'auto',
                        maxHeight: '420px',
                        border: '2px solid #F5D5BC',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        margin: 0
                      }}
                    >
                      {JSON.stringify({ event: selectedEvent, decision: securityDecision || selectedDecisionSummary }, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: '96px 24px', textAlign: 'center', color: '#94A3B8', fontWeight: '700', borderRadius: '20px', border: '2px solid #F5D5BC' }}>
              Select an event from the telemetry queue to inspect forensic evidence.
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default Investigations;



