import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, ShieldAlert, ShieldX, RefreshCw, Search, Filter, Eye, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { securityApi, agentsApi } from '../api/client';
import DecisionBadge from '../components/security/DecisionBadge';
import InvestigationModal from '../components/security/InvestigationModal';

const Decisions = () => {
  const [decisions, setDecisions] = useState([]);
  const [agents, setAgents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [verdictFilter, setVerdictFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const fetchDecisions = useCallback(async () => {
    setIsLoading(true); setError(null);
    try {
      const [dR, aR] = await Promise.allSettled([securityApi.getDecisions(), agentsApi.listAgents()]);
      setDecisions(dR.status === 'fulfilled' ? (dR.value.decisions || dR.value || []) : []);
      setAgents(aR.status === 'fulfilled' ? aR.value.agents || [] : []);
    } catch (err) { setError(err.message); } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchDecisions(); }, [fetchDecisions]);

  const filtered = decisions.filter((d) => {
    if (verdictFilter !== 'ALL' && d.verdict !== verdictFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return d.decisionId?.toLowerCase().includes(q) || d.event?.action?.toLowerCase().includes(q) || d.event?.resource?.toLowerCase().includes(q) || d.event?.agentId?.toLowerCase().includes(q);
  });

  const countByVerdict = (v) => decisions.filter((d) => d.verdict === v).length;
  const stats = [
    { label: 'ALLOW', count: countByVerdict('ALLOW'), icon: ShieldCheck, color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0' },
    { label: 'REVIEW', count: countByVerdict('REVIEW'), icon: ShieldAlert, color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
    { label: 'BLOCK', count: countByVerdict('BLOCK'), icon: ShieldX, color: '#F43F5E', bg: '#FFF1F2', border: '#FECDD3' },
  ];

  return (
    <div className="page-container space-y-6">
      <div className="rounded-3xl p-7 flex items-center justify-between flex-wrap gap-4" style={{ background: 'linear-gradient(135deg, #F5F3FF 0%, #FFF1F2 50%, #FFFBEB 100%)', border: '2px solid #DDD6FE' }}>
        <div>
          <span className="text-xs font-mono font-extrabold px-3 py-1 rounded-full text-white shadow-sm" style={{ background: 'linear-gradient(135deg, #8B5CF6, #F43F5E)' }}>⚖ SECURITY DECISIONS</span>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-2" style={{ fontFamily: 'Sora' }}>Arbitration Verdicts</h1>
          <p className="text-sm text-slate-500 mt-1">Each event passes through a 5-engine pipeline producing a deterministic ALLOW / REVIEW / BLOCK verdict.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={fetchDecisions} disabled={isLoading}><RefreshCw size={15} className={isLoading ? 'spinner' : ''} /><span>Refresh</span></button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl p-5 border-2 flex items-center gap-4 transition-all duration-300 hover:-translate-y-2 hover:shadow-lg cursor-pointer" style={{ background: s.bg, borderColor: s.border }} onClick={() => setVerdictFilter(verdictFilter === s.label ? 'ALL' : s.label)}>
              <Icon size={28} style={{ color: s.color }} />
              <div>
                <div className="text-3xl font-extrabold" style={{ color: s.color }}>{s.count}</div>
                <div className="text-xs font-bold uppercase" style={{ color: s.color }}>{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card p-4 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[250px]">
          <Search size={18} className="text-violet-500" />
          <input type="text" className="w-full bg-transparent border-none outline-none text-sm font-medium text-slate-800 placeholder-slate-400" placeholder="Search by action, resource, agent..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          {['ALL', 'ALLOW', 'REVIEW', 'BLOCK'].map((f) => (
            <button key={f} type="button" onClick={() => setVerdictFilter(f)} className={`px-3 py-1 rounded-full text-xs font-extrabold transition-all duration-200 cursor-pointer border-2 ${verdictFilter === f ? 'text-white shadow-md border-transparent' : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300'}`}
              style={verdictFilter === f ? { background: f === 'BLOCK' ? '#F43F5E' : f === 'REVIEW' ? '#F59E0B' : f === 'ALLOW' ? '#10B981' : 'linear-gradient(135deg, #8B5CF6, #F43F5E)' } : {}}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="card bg-rose-50 border-2 border-rose-200 p-4 text-rose-700 flex items-center gap-3 font-semibold text-sm"><AlertTriangle size={18} /><span>{error}</span></div>}

      {isLoading ? (
        <div className="card py-16 flex flex-col items-center gap-3"><RefreshCw className="spinner text-violet-500" size={28} /><span className="text-sm font-bold text-slate-500">Loading verdicts...</span></div>
      ) : filtered.length === 0 ? (
        <div className="card py-16 text-center"><ShieldCheck size={36} className="text-slate-300 mx-auto mb-2" /><p className="font-bold text-slate-500">No decisions found.</p></div>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => {
            const isExpanded = expandedId === d.decisionId;
            return (
              <div key={d.decisionId} className="card p-0 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-orange-50/50 transition-colors" onClick={() => setExpandedId(isExpanded ? null : d.decisionId)}>
                  <div className="flex items-center gap-3 min-w-0">
                    <DecisionBadge decision={d.verdict} />
                    <span className="font-bold text-sm text-slate-900 truncate">{d.event?.action || 'Unknown action'}</span>
                    <span className="font-mono text-xs text-slate-400 hidden sm:inline truncate">→ {d.event?.resource || '—'}</span>
                    <span className="font-mono text-xs text-sky-600 font-bold hidden sm:inline">{d.event?.agentId || '—'}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-mono text-slate-400">{d.timestamp ? new Date(d.timestamp).toLocaleTimeString() : ''}</span>
                    {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-5 pb-5 space-y-3 border-t-2 border-orange-100 pt-4" style={{ background: 'linear-gradient(180deg, #FFF8F2, #FFFFFF)' }}>
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                      {d.engineResults && Object.entries(d.engineResults).map(([engine, result]) => {
                        const cfg = { policy: { bg: '#F0F9FF', border: '#BAE6FD', color: '#0369A1' }, provenance: { bg: '#F5F3FF', border: '#DDD6FE', color: '#6D28D9' }, intent: { bg: '#FFFBEB', border: '#FDE68A', color: '#92400E' }, risk: { bg: '#FFF1F2', border: '#FECDD3', color: '#9F1239' }, trust: { bg: '#ECFDF5', border: '#A7F3D0', color: '#065F46' } }[engine] || { bg: '#F5F3FF', border: '#DDD6FE', color: '#6D28D9' };
                        return (
                          <div key={engine} className="rounded-xl p-3 border-2 text-center" style={{ background: cfg.bg, borderColor: cfg.border }}>
                            <div className="text-[10px] font-mono font-extrabold uppercase mb-1" style={{ color: cfg.color }}>{engine}</div>
                            <div className="text-lg font-extrabold" style={{ color: cfg.color }}>{typeof result?.score === 'number' ? result.score : '—'}</div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-3">
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => setSelectedEvent(d.event)}><Eye size={14} /><span>Investigate</span></button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selectedEvent && <InvestigationModal event={selectedEvent} agent={agents.find((a) => a.agentId === selectedEvent.agentId)} isOpen={Boolean(selectedEvent)} onClose={() => setSelectedEvent(null)} />}
    </div>
  );
};
export default Decisions;
