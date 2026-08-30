import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRight, RefreshCw, Shield, Zap, Users, Radio, ShieldCheck, AlertTriangle, Eye, Activity } from 'lucide-react';
import { eventsApi, agentsApi, sessionsApi, attackChainsApi, alertsApi, simulationApi, securityApi } from '../api/client';
import DecisionBadge from '../components/security/DecisionBadge';
import InvestigationModal from '../components/security/InvestigationModal';

const Overview = () => {
  const [stats, setStats] = useState({ agents: 0, sessions: 0, events: 0, chains: 0, alerts: 0 });
  const [recentEvents, setRecentEvents] = useState([]);
  const [agents, setAgents] = useState([]);
  const [avgTrustScore, setAvgTrustScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningDemo, setIsRunningDemo] = useState(false);
  const [demoResult, setDemoResult] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [verdictFilter, setVerdictFilter] = useState('ALL');

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [evRes, agRes, sessRes, chainRes, alertRes] = await Promise.allSettled([
        eventsApi.listEvents({ limit: 8 }),
        agentsApi.listAgents(),
        sessionsApi.listSessions(),
        attackChainsApi.listChains({}),
        alertsApi.listAlerts({ limit: 10 }),
      ]);
      const rawEvents = evRes.status === 'fulfilled' ? evRes.value.events || [] : [];
      const rawAgents = agRes.status === 'fulfilled' ? agRes.value.agents || [] : [];
      const rawSessions = sessRes.status === 'fulfilled' ? sessRes.value.sessions || [] : [];
      const rawChains = chainRes.status === 'fulfilled' ? (chainRes.value.attackChains || chainRes.value.chains || []) : [];
      const rawAlerts = alertRes.status === 'fulfilled' ? alertRes.value.alerts || [] : [];
      setStats({ agents: rawAgents.length, sessions: rawSessions.length, events: rawEvents.length, chains: rawChains.length, alerts: rawAlerts.length });
      setRecentEvents(rawEvents);
      setAgents(rawAgents);
      const scores = rawAgents.map((a) => a.currentTrustScore || 0).filter(Boolean);
      setAvgTrustScore(scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0);
    } catch {} finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  const handleRunDemo = async () => {
    setIsRunningDemo(true); setDemoResult(null);
    try { const r = await simulationApi.runSimulation('compound_attack'); setDemoResult(r); fetchDashboardData(); } catch {} finally { setIsRunningDemo(false); }
  };

  const filteredEvents = verdictFilter === 'ALL' ? recentEvents : recentEvents.filter((ev) => {
    const v = ev.dataSensitivity === 'CRITICAL' ? 'BLOCK' : 'ALLOW';
    return v === verdictFilter;
  });

  const trustPct = avgTrustScore;
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (trustPct / 100) * circumference;

  return (
    <div className="page-container space-y-8">
      {/* Hero Strip */}
      <div className="rounded-3xl p-8 sm:p-10 flex items-center justify-between flex-wrap gap-6" style={{ background: 'linear-gradient(135deg, #FFF4ED 0%, #FFF1F2 30%, #F5F3FF 60%, #ECFDF5 100%)', border: '2px solid #FFD0B5' }}>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono font-extrabold px-3 py-1 rounded-full text-white shadow-md" style={{ background: 'linear-gradient(135deg, #FF6B35, #F43F5E)' }}>⚡ COMMAND CENTER</span>
          </div>
          <h1 className="text-3xl font-extrabold gradient-text" style={{ fontFamily: 'Sora, sans-serif' }}>Security Operations Dashboard</h1>
          <p className="text-sm text-slate-600 mt-1 max-w-xl">Real-time agent behavior monitoring, autonomous policy enforcement, and deterministic threat neutralization.</p>
        </div>
        <button type="button" className="btn-jury-cta" onClick={handleRunDemo} disabled={isRunningDemo}>
          <span>{isRunningDemo ? 'Executing Attack...' : '⚡ RUN COMPOUND ATTACK DEMO'}</span>
          <ArrowRight size={18} />
        </button>
      </div>

      {/* Trust Posture + Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Trust Dial */}
        <div className="card flex flex-col items-center justify-center py-8" style={{ background: 'linear-gradient(180deg, #FFF8F2 0%, #FFFFFF 100%)' }}>
          <svg width="140" height="140" viewBox="0 0 120 120" className="mb-3">
            <circle cx="60" cy="60" r="54" fill="none" stroke="#FFE0CC" strokeWidth="8" />
            <circle cx="60" cy="60" r="54" fill="none" stroke="url(#trustGrad)" strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} transform="rotate(-90 60 60)" style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
            <defs><linearGradient id="trustGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#10B981" /><stop offset="50%" stopColor="#0EA5E9" /><stop offset="100%" stopColor="#8B5CF6" /></linearGradient></defs>
            <text x="60" y="55" textAnchor="middle" className="text-3xl font-extrabold" fill="#2D1B0E" style={{ fontFamily: 'Sora, sans-serif', fontSize: '28px' }}>{trustPct}</text>
            <text x="60" y="72" textAnchor="middle" className="text-xs" fill="#9A7B63" style={{ fontFamily: 'Inter', fontSize: '10px' }}>/ 100</text>
          </svg>
          <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">Fleet Trust Posture</span>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Active Agents', value: stats.agents, icon: Users, color: '#0EA5E9', bg: '#F0F9FF', border: '#BAE6FD' },
            { label: 'Live Sessions', value: stats.sessions, icon: Radio, color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0' },
            { label: 'Attack Chains', value: stats.chains, icon: Shield, color: '#F43F5E', bg: '#FFF1F2', border: '#FECDD3' },
            { label: 'Open Alerts', value: stats.alerts, icon: AlertTriangle, color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="rounded-2xl p-5 border-2 flex flex-col justify-between transition-all duration-300 hover:-translate-y-2 hover:shadow-lg cursor-default" style={{ background: s.bg, borderColor: s.border }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: s.color }}>{s.label}</span>
                  <Icon size={18} style={{ color: s.color }} />
                </div>
                <span className="text-3xl font-extrabold" style={{ color: s.color, fontFamily: 'Sora, sans-serif' }}>{isLoading ? '—' : s.value}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5-Engine Pipeline */}
      <div className="card p-6" style={{ background: 'linear-gradient(135deg, #F0F9FF 0%, #F5F3FF 25%, #FFF1F2 50%, #FFFBEB 75%, #ECFDF5 100%)' }}>
        <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-4">5-Engine Arbitration Pipeline</div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { n: '01', label: 'POLICY', sub: 'Permission Scope', color: '#0EA5E9', bg: '#F0F9FF', border: '#BAE6FD' },
            { n: '02', label: 'PROVENANCE', sub: 'Origin Lineage', color: '#8B5CF6', bg: '#F5F3FF', border: '#DDD6FE' },
            { n: '03', label: 'INTENT', sub: 'Drift Analysis', color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
            { n: '04', label: 'RISK', sub: 'Threat Synthesis', color: '#F43F5E', bg: '#FFF1F2', border: '#FECDD3' },
            { n: '05', label: 'TRUST', sub: 'Reputation Score', color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0' },
          ].map((eng) => (
            <div key={eng.n} className="rounded-xl p-4 border-2 text-center transition-all duration-300 hover:-translate-y-2 hover:shadow-md" style={{ background: eng.bg, borderColor: eng.border }}>
              <div className="text-[10px] font-mono font-extrabold mb-1" style={{ color: eng.color }}>ENGINE {eng.n}</div>
              <div className="text-sm font-extrabold" style={{ color: eng.color }}>{eng.label}</div>
              <div className="text-[11px] text-slate-500 mt-1">{eng.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Demo Result Banner */}
      {demoResult && (
        <div className="rounded-2xl p-6 border-2 border-emerald-300 flex items-center justify-between flex-wrap gap-4 shadow-lg" style={{ background: 'linear-gradient(135deg, #ECFDF5 0%, #F0F9FF 50%, #F5F3FF 100%)' }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md" style={{ background: 'linear-gradient(135deg, #10B981, #0EA5E9)' }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <div className="text-xs font-mono font-bold text-rose-600">CRITICAL ATTACK DETECTED & BLOCKED</div>
              <div className="text-base font-extrabold text-slate-900">Compound exfiltration attempt neutralized by 5-engine pipeline</div>
            </div>
          </div>
        </div>
      )}

      {/* Live Telemetry + Filter */}
      <div className="card p-0 overflow-hidden">
        <div className="p-5 flex items-center justify-between flex-wrap gap-3 border-b-2" style={{ borderColor: '#FFD0B5', background: 'linear-gradient(90deg, #FFF8F2, #FFFFFF)' }}>
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-orange-500" />
            <span className="text-base font-extrabold text-slate-900">Live Security Telemetry</span>
          </div>
          <div className="flex items-center gap-2">
            {['ALL', 'ALLOW', 'REVIEW', 'BLOCK'].map((f) => (
              <button key={f} type="button" onClick={() => setVerdictFilter(f)} className={`px-3 py-1 rounded-full text-xs font-extrabold transition-all duration-200 cursor-pointer border-2 ${verdictFilter === f ? 'text-white shadow-md border-transparent' : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300'}`}
                style={verdictFilter === f ? { background: f === 'BLOCK' ? '#F43F5E' : f === 'REVIEW' ? '#F59E0B' : f === 'ALLOW' ? '#10B981' : 'linear-gradient(135deg, #FF6B35, #8B5CF6)' } : {}}>
                {f}
              </button>
            ))}
            <button type="button" onClick={fetchDashboardData} disabled={isLoading} className="p-1.5 rounded-lg hover:bg-orange-100 text-orange-500 transition-colors cursor-pointer">
              <RefreshCw size={16} className={isLoading ? 'spinner' : ''} />
            </button>
          </div>
        </div>

        <div className="divide-y divide-orange-100">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center gap-3">
              <RefreshCw className="spinner text-orange-500" size={28} />
              <span className="text-sm font-bold text-slate-500">Loading telemetry...</span>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-bold">No events found.</div>
          ) : filteredEvents.map((ev) => {
            const verdict = ev.dataSensitivity === 'CRITICAL' ? 'BLOCK' : 'ALLOW';
            return (
              <div key={ev.eventId} className="px-5 py-3 flex items-center justify-between hover:bg-orange-50/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-xs font-bold text-slate-400 w-16 shrink-0">
                    {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                  </span>
                  <span className="font-mono text-xs font-bold text-sky-700 shrink-0">{ev.agentId || 'agent_001'}</span>
                  <span className="text-sm font-bold text-slate-900 truncate">{ev.action}</span>
                  <span className="font-mono text-xs text-slate-400 truncate hidden sm:inline">→ {ev.resource}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <DecisionBadge decision={verdict} />
                  <button type="button" onClick={() => setSelectedEvent(ev)} className="p-1.5 rounded-lg hover:bg-violet-100 text-violet-500 transition-colors cursor-pointer">
                    <Eye size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedEvent && (
        <InvestigationModal
          event={selectedEvent}
          agent={agents.find((a) => a.agentId === selectedEvent.agentId)}
          isOpen={Boolean(selectedEvent)}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
};

export default Overview;
