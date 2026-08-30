import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Bell, RefreshCw, Search, Filter, AlertTriangle, CheckCircle2, 
  Flame, ShieldAlert, ArrowRight, Eye, Check, Copy, ArrowUpDown, 
  SplitSquareVertical, LayoutGrid, Maximize2, Layers, Key, Compass, 
  Shield, ShieldCheck, Target, FileCode, Clock, Zap, CheckSquare
} from 'lucide-react';
import { alertsApi, agentsApi, sessionsApi, attackChainsApi } from '../api/client';
import RiskBadge from '../components/security/RiskBadge';
import AttackChainDetailModal from '../components/security/AttackChainDetailModal';
import InvestigationModal from '../components/security/InvestigationModal';

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [agents, setAgents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [chains, setChains] = useState([]);
  const [selectedAlertId, setSelectedAlertId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'UNRESOLVED' | 'RESOLVED'
  const [severityFilter, setSeverityFilter] = useState('ALL'); // 'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM'
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'severity'
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('SPLIT'); // 'SPLIT' | 'QUEUE' | 'FOCUS'
  const [activeTab, setActiveTab] = useState('ANALYSIS'); // 'ANALYSIS' | 'CHAIN' | 'PLAYBOOK' | 'JSON'
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [resolvedStatusOverrides, setResolvedStatusOverrides] = useState({});

  // Modals state
  const [selectedChainId, setSelectedChainId] = useState(null);
  const [isChainModalOpen, setIsChainModalOpen] = useState(false);
  const [investigatingEvent, setInvestigatingEvent] = useState(null);

  const fetchAlertsData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [alertRes, agentRes, sessRes, chainRes] = await Promise.allSettled([
        alertsApi.listAlerts({ limit: 100 }),
        agentsApi.listAgents(),
        sessionsApi.listSessions(),
        attackChainsApi.listChains()
      ]);

      const rawAlerts = alertRes.status === 'fulfilled' ? alertRes.value.alerts || alertRes.value || [] : [];
      const rawAgents = agentRes.status === 'fulfilled' ? agentRes.value.agents || [] : [];
      const rawSessions = sessRes.status === 'fulfilled' ? sessRes.value.sessions || [] : [];
      const rawChains = chainRes.status === 'fulfilled' ? chainRes.value.attackChains || chainRes.value.chains || [] : [];

      setAlerts(rawAlerts);
      setAgents(rawAgents);
      setSessions(rawSessions);
      setChains(rawChains);

      if (rawAlerts.length > 0 && !selectedAlertId) {
        setSelectedAlertId(rawAlerts[0].alertId || rawAlerts[0].id);
      }
    } catch (err) {
      setError(err.message || 'Failed to load security alerts.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedAlertId]);

  useEffect(() => {
    fetchAlertsData();
  }, [fetchAlertsData]);

  // Normalized and filtered alerts
  const processedAlerts = useMemo(() => {
    let result = alerts.map((al) => {
      const isResolvedOverridden = resolvedStatusOverrides[al.alertId || al.id];
      const isResolved = isResolvedOverridden !== undefined 
        ? isResolvedOverridden 
        : (al.status === 'RESOLVED' || al.resolved === true);

      return {
        ...al,
        alertId: al.alertId || al.id || `al_${Math.random().toString(36).substring(2, 9)}`,
        title: al.title || al.message || (al.type ? al.type.replace(/_/g, ' ') : 'Security Anomaly Detected'),
        description: al.description || al.message || 'Security engine flagged a potential threat or anomalous agent event.',
        severity: (al.severity || 'HIGH').toUpperCase(),
        status: isResolved ? 'RESOLVED' : 'UNRESOLVED',
        resolved: isResolved,
        timestamp: al.timestamp || al.createdAt || new Date().toISOString(),
        chainId: al.chainId || al.attackChainId || null,
        agentId: al.agentId || 'agent_001',
        eventId: al.eventId || null,
        type: al.type || 'SECURITY_INCIDENT',
      };
    });

    // Filter by status
    if (statusFilter !== 'ALL') {
      result = result.filter((a) => a.status === statusFilter);
    }

    // Filter by severity
    if (severityFilter !== 'ALL') {
      result = result.filter((a) => a.severity === severityFilter);
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((a) =>
        a.alertId.toLowerCase().includes(q) ||
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.severity.toLowerCase().includes(q) ||
        (a.agentId && a.agentId.toLowerCase().includes(q)) ||
        (a.chainId && a.chainId.toLowerCase().includes(q)) ||
        (a.eventId && a.eventId.toLowerCase().includes(q))
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      }
      if (sortBy === 'severity') {
        const score = (sev) => (sev === 'CRITICAL' ? 3 : sev === 'HIGH' ? 2 : sev === 'MEDIUM' ? 1 : 0);
        return score(b.severity) - score(a.severity);
      }
      return 0;
    });

    return result;
  }, [alerts, statusFilter, severityFilter, searchQuery, sortBy, resolvedStatusOverrides]);

  const selectedAlert = processedAlerts.find((a) => a.alertId === selectedAlertId) || processedAlerts[0] || null;
  const selectedAgent = agents.find((ag) => ag.agentId === selectedAlert?.agentId);
  const selectedChain = chains.find((c) => (c.chainId || c.id) === selectedAlert?.chainId);

  // Quick statistics counts
  const totalCount = alerts.length;
  const openCount = processedAlerts.filter((a) => a.status === 'UNRESOLVED').length;
  const criticalCount = processedAlerts.filter((a) => a.severity === 'CRITICAL').length;
  const highCount = processedAlerts.filter((a) => a.severity === 'HIGH').length;
  const resolvedCount = processedAlerts.filter((a) => a.status === 'RESOLVED').length;

  const handleToggleResolve = (alertId) => {
    if (!alertId) return;
    setResolvedStatusOverrides((prev) => {
      const current = selectedAlert?.status === 'RESOLVED';
      return { ...prev, [alertId]: !current };
    });
  };

  const handleOpenChain = (chainId) => {
    if (!chainId) return;
    setSelectedChainId(chainId);
    setIsChainModalOpen(true);
  };

  const handleInvestigateEvent = () => {
    if (!selectedAlert?.eventId) return;
    const evt = {
      eventId: selectedAlert.eventId,
      agentId: selectedAlert.agentId,
      action: selectedAlert.title,
      resource: selectedAlert.description,
      dataSensitivity: selectedAlert.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
      timestamp: selectedAlert.timestamp,
    };
    setInvestigatingEvent(evt);
  };

  const handleCopyJson = () => {
    if (!selectedAlert) return;
    navigator.clipboard.writeText(JSON.stringify(selectedAlert, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs = [
    { id: 'ANALYSIS', label: '1. Threat Analysis & Signals', icon: ShieldAlert, color: '#E11D48' },
    { id: 'CHAIN', label: '2. Correlated Attack Chain', icon: Layers, color: '#9333EA' },
    { id: 'PLAYBOOK', label: '3. Incident Playbook & SOP', icon: Target, color: '#059669' },
    { id: 'JSON', label: '4. Raw Alert JSON', icon: FileCode, color: '#D97706' },
  ];

  return (
    <div className="page-container space-y-6">
      {/* Header Banner - Crimson Incident Triage Theme */}
      <div 
        className="rounded-3xl p-6 sm:p-8" 
        style={{ 
          background: 'linear-gradient(135deg, #FFF1F2 0%, #FFF5F7 35%, #FFFBEB 70%, #FFE4E6 100%)', 
          border: '2px solid #FECDD3',
          boxShadow: '0 8px 30px rgba(225, 29, 72, 0.07)',
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
              style={{ background: 'linear-gradient(135deg, #E11D48, #BE123C)' }}
            >
              🚨 INCIDENT TRIAGE & RESPONSE
            </span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-300">
              ● REAL-TIME DETECTION FEED
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900" style={{ fontFamily: 'Sora' }}>
            Security Incident Alerts
          </h1>
          <p className="text-sm text-slate-600" style={{ marginTop: '6px', lineHeight: '1.5' }}>
            Real-time threat notifications, runtime policy violations, and correlated attack chain anomalies across all AI agent sessions.
          </p>
        </div>

        {/* View Layout Controls & Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: '#FFFFFF', padding: '4px', borderRadius: '12px', border: '1.5px solid #FECDD3', gap: '4px' }}>
            <button 
              type="button" 
              onClick={() => setViewMode('SPLIT')}
              className={`tab-pill-button ${viewMode === 'SPLIT' ? 'active' : ''}`}
              style={viewMode === 'SPLIT' ? { background: '#E11D48', color: '#FFFFFF' } : {}}
              title="Side-by-side split view"
            >
              <SplitSquareVertical size={14} />
              <span>Side-by-Side</span>
            </button>
            <button 
              type="button" 
              onClick={() => setViewMode('QUEUE')}
              className={`tab-pill-button ${viewMode === 'QUEUE' ? 'active' : ''}`}
              style={viewMode === 'QUEUE' ? { background: '#E11D48', color: '#FFFFFF' } : {}}
              title="Full alerts feed queue"
            >
              <LayoutGrid size={14} />
              <span>Queue Only</span>
            </button>
            <button 
              type="button" 
              onClick={() => setViewMode('FOCUS')}
              className={`tab-pill-button ${viewMode === 'FOCUS' ? 'active' : ''}`}
              style={viewMode === 'FOCUS' ? { background: '#E11D48', color: '#FFFFFF' } : {}}
              title="Focus on selected alert detail"
            >
              <Maximize2 size={14} />
              <span>Focus Triage</span>
            </button>
          </div>

          <button 
            type="button" 
            className="btn btn-secondary shadow-sm" 
            onClick={fetchAlertsData} 
            disabled={isLoading}
            style={{ borderColor: '#FECDD3' }}
          >
            <RefreshCw size={15} className={isLoading ? 'spinner' : ''} style={{ color: '#E11D48' }} />
            <span>Refresh Alerts</span>
          </button>
        </div>
      </div>

      {/* Metrics Ribbon (Interactive Filters) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div 
          className="rounded-2xl p-4 sm:p-5 border-2 border-l-[6px] transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer" 
          style={{ background: '#FFF1F2', borderColor: '#FECDD3', borderLeftColor: '#E11D48' }}
          onClick={() => { setStatusFilter('UNRESOLVED'); setSeverityFilter('ALL'); }}
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-600 tracking-wider mb-1">
            <span>Open Incidents</span>
            <Bell className="text-rose-600" size={18} />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-700" style={{ fontFamily: 'Sora' }}>{openCount}</div>
          <div className="text-xs text-slate-500 mt-1">Requiring operator review</div>
        </div>

        <div 
          className="rounded-2xl p-4 sm:p-5 border-2 border-l-[6px] transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer" 
          style={{ background: '#FFE4E6', borderColor: '#FDA4AF', borderLeftColor: '#9F1239' }}
          onClick={() => { setSeverityFilter('CRITICAL'); }}
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-600 tracking-wider mb-1">
            <span>Critical</span>
            <Flame className="text-rose-700" size={18} />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-900" style={{ fontFamily: 'Sora' }}>{criticalCount}</div>
          <div className="text-xs text-slate-500 mt-1">Exfiltration & drift blocks</div>
        </div>

        <div 
          className="rounded-2xl p-4 sm:p-5 border-2 border-l-[6px] transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer" 
          style={{ background: '#FFFBEB', borderColor: '#FDE68A', borderLeftColor: '#D97706' }}
          onClick={() => { setSeverityFilter('HIGH'); }}
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-600 tracking-wider mb-1">
            <span>High Severity</span>
            <ShieldAlert className="text-amber-600" size={18} />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-700" style={{ fontFamily: 'Sora' }}>{highCount}</div>
          <div className="text-xs text-slate-500 mt-1">Policy & permission bounds</div>
        </div>

        <div 
          className="rounded-2xl p-4 sm:p-5 border-2 border-l-[6px] transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer" 
          style={{ background: '#ECFDF5', borderColor: '#A7F3D0', borderLeftColor: '#059669' }}
          onClick={() => { setStatusFilter('RESOLVED'); }}
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-600 tracking-wider mb-1">
            <span>Resolved</span>
            <CheckCircle2 className="text-emerald-600" size={18} />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700" style={{ fontFamily: 'Sora' }}>{resolvedCount}</div>
          <div className="text-xs text-slate-500 mt-1">Archived / mitigated</div>
        </div>
      </div>

      {error && (
        <div className="card bg-rose-50 border-2 border-rose-200 p-4 text-rose-700 flex items-center gap-3 font-semibold text-sm rounded-2xl">
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Mobile Split View Tab Switcher (Visible on screens < 1024px) ── */}
      <div className="flex lg:hidden bg-white p-1.5 rounded-2xl border-2 border-rose-200 shadow-2xs mb-2">
        <button
          type="button"
          onClick={() => setViewMode('QUEUE')}
          className={`flex-1 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
            viewMode === 'QUEUE' ? 'bg-rose-500 text-white shadow-xs' : 'text-slate-600 hover:text-rose-600'
          }`}
        >
          <Bell size={14} />
          <span>Incident Queue ({processedAlerts.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setViewMode('FOCUS')}
          className={`flex-1 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
            viewMode === 'FOCUS' || viewMode === 'SPLIT' ? 'bg-rose-500 text-white shadow-xs' : 'text-slate-600 hover:text-rose-600'
          }`}
        >
          <Target size={14} />
          <span>Forensic Console</span>
        </button>
      </div>

      {/* ── Two-Section Responsive Side-by-Side View ─────────────────────────────── */}
      <div 
        className={`grid gap-5 sm:gap-6 items-start w-full ${
          viewMode === 'QUEUE' 
            ? 'grid-cols-1' 
            : viewMode === 'FOCUS' 
            ? 'grid-cols-1' 
            : 'grid-cols-1 lg:grid-cols-[360px_1fr] xl:grid-cols-[380px_1fr]'
        }`}
      >
        {/* Section 1: Left Column — Incident & Alerts Feed Queue */}
        {viewMode !== 'FOCUS' && (
          <div className="alerts-queue-sidebar">
            {/* Queue Header & Counter */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1.5px solid #FECDD3' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Bell size={16} className="text-rose-600" />
                <span style={{ fontSize: '0.78rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#881337' }}>
                  Incident Feed
                </span>
              </div>
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-950 border border-rose-300">
                {processedAlerts.length} / {totalCount} Alerts
              </span>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', marginTop: '10px', marginBottom: '8px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#E11D48', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Search alert, ID, agent, keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ 
                  width: '100%', 
                  paddingLeft: '32px', 
                  paddingRight: '10px', 
                  paddingTop: '8px', 
                  paddingBottom: '8px', 
                  fontSize: '0.78rem', 
                  borderRadius: '10px', 
                  border: '1.5px solid #FECDD3', 
                  background: '#FFF8F8', 
                  outline: 'none' 
                }}
              />
            </div>

            {/* Filter & Sort Controls */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
              {/* Status Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#FFF8F8', padding: '4px 6px', borderRadius: '8px', border: '1px solid #FECDD3' }}>
                <Filter size={12} className="text-rose-600" />
                <select 
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ background: 'transparent', border: 'none', fontSize: '0.72rem', fontWeight: '700', color: '#881337', outline: 'none', width: '100%', cursor: 'pointer' }}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="UNRESOLVED">Unresolved</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </div>

              {/* Severity Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#FFF8F8', padding: '4px 6px', borderRadius: '8px', border: '1px solid #FECDD3' }}>
                <ShieldAlert size={12} className="text-rose-600" />
                <select 
                  value={severityFilter} 
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  style={{ background: 'transparent', border: 'none', fontSize: '0.72rem', fontWeight: '700', color: '#881337', outline: 'none', width: '100%', cursor: 'pointer' }}
                >
                  <option value="ALL">All Severities</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                </select>
              </div>
            </div>

            {/* Sort Control */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#FFF8F8', padding: '4px 6px', borderRadius: '8px', border: '1px solid #FECDD3', marginBottom: '4px' }}>
              <ArrowUpDown size={12} className="text-rose-600" />
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                style={{ background: 'transparent', border: 'none', fontSize: '0.72rem', fontWeight: '700', color: '#881337', outline: 'none', width: '100%', cursor: 'pointer' }}
              >
                <option value="newest">Sort: Newest First</option>
                <option value="oldest">Sort: Oldest First</option>
                <option value="severity">Sort: Highest Severity</option>
              </select>
            </div>

            {/* Scrollable Alert Queue Cards */}
            <div className="alerts-queue-scroll">
              {isLoading ? (
                <div style={{ padding: '48px 0', textAlign: 'center', fontSize: '0.78rem', color: '#9F1239' }}>
                  <RefreshCw className="spinner text-rose-600 mx-auto" size={24} style={{ marginBottom: '8px' }} />
                  <span>Loading incident queue...</span>
                </div>
              ) : processedAlerts.length === 0 ? (
                <div style={{ padding: '48px 12px', textAlign: 'center', fontSize: '0.78rem', color: '#94a3b8' }}>
                  <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2" />
                  <p className="font-bold text-slate-600">Incident queue clear.</p>
                  <p className="text-xs text-slate-400 mt-1">No alerts match active filters.</p>
                </div>
              ) : (
                processedAlerts.map((al) => {
                  const isSelected = al.alertId === (selectedAlert?.alertId || selectedAlertId);
                  const sevClass = al.severity === 'CRITICAL' 
                    ? 'severity-critical' 
                    : al.severity === 'HIGH' 
                    ? 'severity-high' 
                    : al.severity === 'MEDIUM' 
                    ? 'severity-medium' 
                    : 'severity-low';

                  return (
                    <div 
                      key={al.alertId} 
                      className={`alerts-queue-card ${sevClass} ${isSelected ? 'active-selected' : ''}`}
                      onClick={() => {
                        setSelectedAlertId(al.alertId);
                        if (viewMode === 'QUEUE') setViewMode('SPLIT');
                      }}
                    >
                      {/* Top Header: ID + Severity + Status */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                          <span className="font-mono text-[11px] font-extrabold text-slate-900 truncate">
                            {al.alertId}
                          </span>
                          <RiskBadge risk={al.severity} />
                        </div>
                        <span className={`badge text-[10px] font-bold ${al.status === 'UNRESOLVED' ? 'badge-block' : 'badge-allow'}`}>
                          ● {al.status}
                        </span>
                      </div>

                      {/* Title */}
                      <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#0F172A', lineHeight: '1.3' }}>
                        {al.title}
                      </div>

                      {/* Description Preview */}
                      <p style={{ fontSize: '0.72rem', color: '#64748B', lineHeight: '1.4', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {al.description}
                      </p>

                      {/* Footer: Agent & Chain Tag */}
                      <div style={{ marginTop: '4px', paddingTop: '6px', borderTop: '1px solid #FFE4E6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem', color: '#9F1239', fontFamily: 'JetBrains Mono, monospace' }}>
                        <span style={{ fontWeight: '700', color: '#475569' }}>
                          {al.agentId}
                        </span>
                        {al.chainId ? (
                          <span style={{ color: '#E11D48', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '2px' }}>
                            ⛓️ Chain
                          </span>
                        ) : (
                          <span style={{ color: '#94A3B8' }}>
                            {al.timestamp ? new Date(al.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Section 2: Right Column — Incident Detail & Triage Console */}
        {viewMode !== 'QUEUE' && (
          selectedAlert ? (
            <div className="alerts-detail-panel">
              {/* Meta Header */}
              <div style={{ paddingBottom: '16px', borderBottom: '1.5px solid #FECDD3' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span className="font-mono text-xs font-extrabold px-3 py-1 rounded-lg bg-rose-100 text-rose-950 border border-rose-300">
                      {selectedAlert.alertId}
                    </span>
                    <RiskBadge risk={selectedAlert.severity} />
                    <span className={`badge text-xs font-bold ${selectedAlert.status === 'UNRESOLVED' ? 'badge-block' : 'badge-allow'}`}>
                      ● {selectedAlert.status}
                    </span>
                    {selectedAlert.chainId ? (
                      <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                        ⛓️ MULTI-STAGE ATTACK CHAIN
                      </span>
                    ) : (
                      <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
                        DISCRETE ANOMALY
                      </span>
                    )}
                  </div>

                  {/* Actions: Toggle Resolve & Attack Chain Modal */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <button 
                      type="button" 
                      onClick={() => handleToggleResolve(selectedAlert.alertId)}
                      className={`btn btn-sm ${selectedAlert.status === 'UNRESOLVED' ? 'btn-primary' : 'btn-secondary'}`}
                      style={selectedAlert.status === 'UNRESOLVED' ? { background: '#059669', borderColor: '#047857' } : { borderColor: '#FECDD3' }}
                    >
                      {selectedAlert.status === 'UNRESOLVED' ? (
                        <>
                          <Check size={14} />
                          <span>Mark Resolved</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw size={14} />
                          <span>Reopen Incident</span>
                        </>
                      )}
                    </button>

                    {selectedAlert.chainId && (
                      <button 
                        type="button" 
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenChain(selectedAlert.chainId)}
                        style={{ borderColor: '#FECDD3', color: '#E11D48' }}
                      >
                        <Eye size={14} />
                        <span>Investigate Chain</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Hero Box: Alert Title & Description */}
                <div 
                  style={{ 
                    background: 'linear-gradient(135deg, #FFF1F2 0%, #FFF5F7 60%, #FFFBEB 100%)', 
                    padding: '16px 20px', 
                    borderRadius: '16px', 
                    border: '1.5px solid #FECDD3' 
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#E11D48' }}>
                      Incident Classification: {selectedAlert.type}
                    </span>
                    <span style={{ fontSize: '0.72rem', fontFamily: 'JetBrains Mono, monospace', color: '#64748B' }}>
                      <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
                      {selectedAlert.timestamp ? new Date(selectedAlert.timestamp).toLocaleString() : 'Recent telemetry'}
                    </span>
                  </div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0F172A', margin: 0, fontFamily: 'Sora' }}>
                    {selectedAlert.title}
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: '#475569', marginTop: '8px', lineHeight: '1.5', marginBottom: 0 }}>
                    {selectedAlert.description}
                  </p>
                </div>

                {/* 4 Key Security Attribute Metric Cards */}
                <div className="forensics-metrics-strip" style={{ marginTop: '14px' }}>
                  <div className="metric-stat-box" style={{ background: '#FFF8F8', borderColor: '#FECDD3' }}>
                    <span className="m-label" style={{ color: '#9F1239' }}>Target Agent</span>
                    <span className="m-val" style={{ fontSize: '0.9rem', color: '#0F172A' }}>
                      {selectedAgent?.name || selectedAlert.agentId || 'agent_001'}
                    </span>
                  </div>
                  <div className="metric-stat-box" style={{ background: '#FFF8F8', borderColor: '#FECDD3' }}>
                    <span className="m-label" style={{ color: '#9F1239' }}>Correlation ID</span>
                    <span className="m-val" style={{ fontSize: '0.85rem', color: selectedAlert.chainId ? '#E11D48' : '#64748B' }}>
                      {selectedAlert.chainId ? selectedAlert.chainId : 'Discrete'}
                    </span>
                  </div>
                  <div className="metric-stat-box" style={{ background: '#FFF8F8', borderColor: '#FECDD3' }}>
                    <span className="m-label" style={{ color: '#9F1239' }}>Severity Level</span>
                    <span className="m-val" style={{ color: selectedAlert.severity === 'CRITICAL' ? '#E11D48' : selectedAlert.severity === 'HIGH' ? '#D97706' : '#059669' }}>
                      {selectedAlert.severity}
                    </span>
                  </div>
                  <div className="metric-stat-box" style={{ background: '#FFF8F8', borderColor: '#FECDD3' }}>
                    <span className="m-label" style={{ color: '#9F1239' }}>Triage Status</span>
                    <span className="m-val" style={{ fontSize: '0.9rem', color: selectedAlert.status === 'UNRESOLVED' ? '#E11D48' : '#059669' }}>
                      {selectedAlert.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div style={{ display: 'flex', gap: '8px', paddingBottom: '12px', borderBottom: '1.5px solid #FECDD3', flexWrap: 'wrap' }}>
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button 
                      key={tab.id} 
                      type="button" 
                      className={`tab-pill-button ${isActive ? 'active' : ''}`}
                      style={isActive ? { background: tab.color, color: '#FFFFFF', boxShadow: `0 4px 14px ${tab.color}35` } : { background: '#FFF8F8', borderColor: '#FECDD3' }} 
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
                {/* 1. Threat Analysis & Signals */}
                {activeTab === 'ANALYSIS' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ background: '#FFF1F2', border: '1.5px solid #FECDD3', borderRadius: '16px', padding: '16px' }}>
                      <h3 style={{ fontSize: '0.78rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9F1239', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <ShieldAlert size={16} className="text-rose-600" />
                        <span>Threat Assessment & Security Impact</span>
                      </h3>
                      <p style={{ fontSize: '0.82rem', color: '#881337', lineHeight: '1.5', margin: 0 }}>
                        {selectedAlert.severity === 'CRITICAL'
                          ? 'Critical threat trajectory detected. Agent exhibited multi-stage exfiltration or uncontained prompt hijacking. Immediate quarantine and credential revocation are advised.'
                          : 'High-risk security anomaly recorded. Runtime telemetry indicates unauthorized resource access or unexpected prompt influence drifting from baseline intent.'}
                      </p>
                    </div>

                    {/* Monitored Security Signals Checklist */}
                    <div style={{ background: '#FFF8F8', border: '1.5px solid #FECDD3', borderRadius: '16px', padding: '16px' }}>
                      <h4 style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: '#881337', marginBottom: '10px' }}>
                        Automated Security Engine Signals
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-xl border bg-white flex items-center justify-between" style={{ borderColor: selectedAlert.severity === 'CRITICAL' ? '#FECDD3' : '#FDE68A' }}>
                          <span className="font-semibold text-slate-700">Policy Scope Verification:</span>
                          <span className={`font-mono font-extrabold ${selectedAlert.severity === 'CRITICAL' ? 'text-rose-600' : 'text-amber-600'}`}>
                            {selectedAlert.severity === 'CRITICAL' ? 'VIOLATION' : 'RESTRICTED'}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl border bg-white flex items-center justify-between" style={{ borderColor: selectedAlert.chainId ? '#FECDD3' : '#A7F3D0' }}>
                          <span className="font-semibold text-slate-700">Provenance Trust Lineage:</span>
                          <span className={`font-mono font-extrabold ${selectedAlert.chainId ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {selectedAlert.chainId ? 'UNTRUSTED ORIGIN' : 'TRUSTED'}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl border bg-white flex items-center justify-between" style={{ borderColor: '#FECDD3' }}>
                          <span className="font-semibold text-slate-700">Semantic Intent Drift:</span>
                          <span className="font-mono font-extrabold text-rose-600">
                            DRIFT DETECTED
                          </span>
                        </div>
                        <div className="p-3 rounded-xl border bg-white flex items-center justify-between" style={{ borderColor: '#A7F3D0' }}>
                          <span className="font-semibold text-slate-700">Automated Containment:</span>
                          <span className="font-mono font-extrabold text-emerald-600">
                            ENFORCED
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Target Agent Profile Details */}
                    {selectedAgent && (
                      <div style={{ background: '#FFF1F2', border: '1.5px solid #FECDD3', borderRadius: '16px', padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: '#9F1239' }}>
                            Associated Fleet Agent Profile
                          </span>
                          <span className="badge badge-allow text-xs">● {selectedAgent.status || 'ACTIVE'}</span>
                        </div>
                        <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0F172A' }}>
                          {selectedAgent.name} <code style={{ fontSize: '0.75rem', color: '#BE123C' }}>({selectedAgent.agentId})</code>
                        </div>
                        <p style={{ fontSize: '0.78rem', color: '#475569', fontStyle: 'italic', marginTop: '4px', margin: 0 }}>
                          Baseline Mission: "{selectedAgent.declaredObjective || 'Standard AI Agent Task'}"
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Correlated Attack Chain */}
                {activeTab === 'CHAIN' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {selectedAlert.chainId ? (
                      <div style={{ background: 'linear-gradient(135deg, #FFF1F2 0%, #FFF5F7 50%, #F5F3FF 100%)', border: '1.5px solid #FECDD3', borderRadius: '16px', padding: '18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                          <div>
                            <span className="font-mono text-xs font-extrabold px-3 py-1 rounded-full text-rose-900 bg-rose-100 border border-rose-300">
                              {selectedAlert.chainId}
                            </span>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0F172A', marginTop: '8px', marginBottom: 0 }}>
                              {selectedChain?.summary || 'Correlated Multi-Stage Exfiltration Trajectory'}
                            </h3>
                          </div>
                          <button 
                            type="button" 
                            className="btn btn-primary btn-sm"
                            onClick={() => handleOpenChain(selectedAlert.chainId)}
                            style={{ background: '#E11D48', borderColor: '#BE123C' }}
                          >
                            <Eye size={14} />
                            <span>Launch Forensic Chain Modal</span>
                          </button>
                        </div>

                        <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: '1.5', marginBottom: '14px' }}>
                          {selectedChain?.description || 'This alert is linked to a multi-stage trajectory correlating untrusted input ingestion, prompt influence, goal drift, tool delegation, and exfiltration attempts.'}
                        </p>

                        {/* 5-Stage Visual Pill Strip */}
                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-[11px] font-mono font-bold text-center">
                          <div className="p-2.5 rounded-lg border bg-rose-50 border-rose-200 text-rose-900">01 INPUT</div>
                          <div className="p-2.5 rounded-lg border bg-purple-50 border-purple-200 text-purple-900">02 INFLUENCE</div>
                          <div className="p-2.5 rounded-lg border bg-amber-50 border-amber-200 text-amber-900">03 DRIFT</div>
                          <div className="p-2.5 rounded-lg border bg-orange-50 border-orange-200 text-orange-900">04 DELEGATE</div>
                          <div className="p-2.5 rounded-lg border bg-rose-100 border-rose-300 text-rose-950">05 BLOCKED</div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ background: '#FFF8F8', border: '1.5px solid #FECDD3', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
                        <Compass size={32} className="text-rose-400 mx-auto mb-2" />
                        <h3 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#881337', marginBottom: '4px' }}>
                          Discrete Anomaly Event
                        </h3>
                        <p style={{ fontSize: '0.8rem', color: '#64748B', maxWidth: '420px', margin: '0 auto' }}>
                          This alert occurred as an isolated event and has not yet satisfied multi-stage temporal chain correlation thresholds.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Incident Playbook & SOP */}
                {activeTab === 'PLAYBOOK' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ background: '#ECFDF5', border: '1.5px solid #A7F3D0', borderRadius: '16px', padding: '16px' }}>
                      <h3 style={{ fontSize: '0.78rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#065F46', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <CheckSquare size={16} className="text-emerald-600" />
                        <span>Recommended Security Response Standard Operating Procedure (SOP)</span>
                      </h3>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.82rem' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: '#FFFFFF', padding: '10px 14px', borderRadius: '12px', border: '1px solid #A7F3D0' }}>
                          <span style={{ fontWeight: '800', color: '#059669', minWidth: '20px' }}>1.</span>
                          <div>
                            <strong className="text-slate-900">Isolate Target Agent & Freeze Session:</strong>
                            <p className="text-slate-600 text-xs mt-0.5 mb-0">Suspend execution token for agent <code>{selectedAlert.agentId}</code> to prevent subsequent lateral tool invocations.</p>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: '#FFFFFF', padding: '10px 14px', borderRadius: '12px', border: '1px solid #A7F3D0' }}>
                          <span style={{ fontWeight: '800', color: '#059669', minWidth: '20px' }}>2.</span>
                          <div>
                            <strong className="text-slate-900">Audit Provenance Origin & Sanitize Payload:</strong>
                            <p className="text-slate-600 text-xs mt-0.5 mb-0">Inspect the document or user prompt that induced the drift violation in the Forensic Studio.</p>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: '#FFFFFF', padding: '10px 14px', borderRadius: '12px', border: '1px solid #A7F3D0' }}>
                          <span style={{ fontWeight: '800', color: '#059669', minWidth: '20px' }}>3.</span>
                          <div>
                            <strong className="text-slate-900">Revoke Compromised Credentials:</strong>
                            <p className="text-slate-600 text-xs mt-0.5 mb-0">Rotate downstream database and API connector secrets targeted in the anomaly.</p>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: '#FFFFFF', padding: '10px 14px', borderRadius: '12px', border: '1px solid #A7F3D0' }}>
                          <span style={{ fontWeight: '800', color: '#059669', minWidth: '20px' }}>4.</span>
                          <div>
                            <strong className="text-slate-900">Acknowledge & Mark Incident Resolved:</strong>
                            <p className="text-slate-600 text-xs mt-0.5 mb-0">Archive the alert once containment verification is confirmed by security personnel.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Direct Quick Action Buttons */}
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {selectedAlert.eventId && (
                        <button 
                          type="button" 
                          className="btn btn-secondary btn-sm"
                          onClick={handleInvestigateEvent}
                          style={{ borderColor: '#FECDD3', color: '#BE123C' }}
                        >
                          <Zap size={14} />
                          <span>Investigate Trigger Event</span>
                        </button>
                      )}
                      <button 
                        type="button" 
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleToggleResolve(selectedAlert.alertId)}
                        style={{ borderColor: '#A7F3D0', color: '#059669' }}
                      >
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        <span>{selectedAlert.status === 'UNRESOLVED' ? 'Resolve Alert' : 'Reopen Alert'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. Raw Alert JSON */}
                {activeTab === 'JSON' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <h3 style={{ fontSize: '0.78rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#881337', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileCode size={16} className="text-rose-600" />
                        <span>Authoritative Alert Payload JSON</span>
                      </h3>
                      <button 
                        type="button" 
                        className="btn btn-secondary btn-xs shadow-xs" 
                        onClick={handleCopyJson}
                        style={{ borderColor: '#FECDD3' }}
                      >
                        {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                        <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                      </button>
                    </div>
                    <pre 
                      style={{ 
                        background: 'linear-gradient(135deg, #1C0A0D 0%, #291015 100%)', 
                        color: '#FDA4AF',
                        padding: '18px',
                        borderRadius: '16px',
                        fontSize: '0.78rem',
                        fontFamily: 'JetBrains Mono, monospace',
                        lineHeight: '1.5',
                        overflowX: 'auto',
                        maxHeight: '420px',
                        border: '2px solid #FECDD3',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        margin: 0
                      }}
                    >
                      {JSON.stringify(selectedAlert, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: '96px 24px', textAlign: 'center', color: '#9F1239', fontWeight: '700', borderRadius: '20px', border: '2px solid #FECDD3' }}>
              <Bell size={36} className="text-rose-300 mx-auto mb-2" />
              Select an incident alert from the left feed to view forensic triage details.
            </div>
          )
        )}
      </div>

      {/* Attack Chain Detail Modal */}
      {isChainModalOpen && selectedChainId && (
        <AttackChainDetailModal 
          chainId={selectedChainId} 
          isOpen={isChainModalOpen} 
          onClose={() => { setIsChainModalOpen(false); setSelectedChainId(null); }} 
        />
      )}

      {/* Investigation Modal for Trigger Event */}
      {investigatingEvent && (
        <InvestigationModal 
          event={investigatingEvent}
          agent={selectedAgent}
          isOpen={Boolean(investigatingEvent)}
          onClose={() => setInvestigatingEvent(null)}
        />
      )}
    </div>
  );
};

export default Alerts;
