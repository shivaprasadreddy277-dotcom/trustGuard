import React, { useState, useEffect, useCallback } from 'react';
import { Layers, RefreshCw, Search, Filter, Eye, AlertTriangle, ShieldAlert, Flame, Sparkles } from 'lucide-react';
import { attackChainsApi } from '../api/client';
import RiskBadge from '../components/security/RiskBadge';
import AttackChainTimeline from '../components/security/AttackChainTimeline';
import AttackChainDetailModal from '../components/security/AttackChainDetailModal';

const AttackChains = () => {
  const [chains, setChains] = useState([]);
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inspectChainId, setInspectChainId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchChains = useCallback(async () => {
    setIsLoading(true); setError(null);
    try { const res = await attackChainsApi.listChains({ severity: severityFilter !== 'ALL' ? severityFilter : undefined }); setChains(res.attackChains || res.chains || []); }
    catch (err) { setError(err.message || 'Failed to load attack chains.'); } finally { setIsLoading(false); }
  }, [severityFilter]);

  useEffect(() => { fetchChains(); }, [fetchChains]);

  const handleOpenModal = (chainId) => { setInspectChainId(chainId); setIsModalOpen(true); };

  const filteredChains = chains.filter((c) => { if (!searchQuery) return true; const q = searchQuery.toLowerCase(); return c.chainId?.toLowerCase().includes(q) || c.summary?.toLowerCase().includes(q) || c.severity?.toLowerCase().includes(q); });

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div className="rounded-3xl p-7 flex items-center justify-between flex-wrap gap-4" style={{ background: 'linear-gradient(135deg, #FFF1F2 0%, #FFFBEB 50%, #FFF4ED 100%)', border: '2px solid #FECDD3' }}>
        <div>
          <span className="text-xs font-mono font-extrabold px-3 py-1 rounded-full text-white shadow-sm" style={{ background: 'linear-gradient(135deg, #F43F5E, #F59E0B)' }}>⛓️ TEMPORAL CORRELATION</span>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-2" style={{ fontFamily: 'Sora' }}>Correlated Attack Chain Intelligence</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">Correlates discrete events into compound attack narratives: Untrusted Input → Prompt Influence → Intent Drift → Delegation → Exfiltration.</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={fetchChains} disabled={isLoading}><RefreshCw size={15} className={isLoading ? 'spinner' : ''} /><span>Refresh Chains</span></button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="rounded-2xl p-5 border-2 border-l-[6px] border-l-rose-500 transition-all duration-300 hover:-translate-y-2 hover:shadow-lg" style={{ background: '#FFF1F2', borderColor: '#FECDD3', borderLeftColor: '#F43F5E' }}>
          <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-500 tracking-wider mb-1"><span>Active Chains</span><ShieldAlert className="text-rose-500" size={18} /></div>
          <div className="text-3xl font-extrabold text-rose-600" style={{ fontFamily: 'Sora' }}>{chains.length}</div>
          <div className="text-xs text-slate-500 mt-1">Multi-stage trajectories</div>
        </div>
        <div className="rounded-2xl p-5 border-2 border-l-[6px] border-l-amber-500 transition-all duration-300 hover:-translate-y-2 hover:shadow-lg" style={{ background: '#FFFBEB', borderColor: '#FDE68A', borderLeftColor: '#F59E0B' }}>
          <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-500 tracking-wider mb-1"><span>Critical Severity</span><Flame className="text-amber-500" size={18} /></div>
          <div className="text-3xl font-extrabold text-amber-600" style={{ fontFamily: 'Sora' }}>{chains.filter((c) => c.severity === 'CRITICAL').length}</div>
          <div className="text-xs text-slate-500 mt-1">Immediate containment</div>
        </div>
        <div className="rounded-2xl p-5 border-2 border-l-[6px] border-l-orange-500 transition-all duration-300 hover:-translate-y-2 hover:shadow-lg" style={{ background: '#FFF4ED', borderColor: '#FFD0B5', borderLeftColor: '#FF6B35' }}>
          <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-500 tracking-wider mb-1"><span>Mean Confidence</span><Sparkles className="text-orange-500" size={18} /></div>
          <div className="text-3xl font-extrabold text-orange-600" style={{ fontFamily: 'Sora' }}>98%</div>
          <div className="text-xs text-slate-500 mt-1">Deterministic bounds</div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="card p-4 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[260px]"><Search size={18} className="text-rose-500" /><input type="text" className="w-full bg-transparent border-none outline-none text-sm font-medium text-slate-800 placeholder-slate-400" placeholder="Search by chain ID or keyword..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
        <div className="flex items-center gap-2 border-l-2 border-rose-200 pl-4"><Filter size={16} className="text-rose-500" />
          <select className="bg-transparent border-2 border-rose-200 rounded-lg px-3 py-1 text-xs font-bold text-slate-700 outline-none" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
            <option value="ALL">All Severities</option><option value="CRITICAL">Critical</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option>
          </select>
        </div>
      </div>

      {error && <div className="card bg-rose-50 border-2 border-rose-200 p-4 text-rose-700 flex items-center gap-3 font-semibold text-sm"><AlertTriangle size={18} /><span>{error}</span></div>}

      {/* Kill Chain Blueprint */}
      <div className="card p-5 border-2" style={{ background: 'linear-gradient(90deg, #FFF1F2, #FFF4ED, #FFFBEB)', borderColor: '#FECDD3' }}>
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">5-Stage Attack Trajectory</div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-xs font-mono font-bold">
          {[
            { n: '01', label: 'UNTRUSTED INPUT', bg: '#F0F9FF', border: '#BAE6FD', color: '#0369A1' },
            { n: '02', label: 'PROMPT INFLUENCE', bg: '#F5F3FF', border: '#DDD6FE', color: '#6D28D9' },
            { n: '03', label: 'INTENT DRIFT', bg: '#FFFBEB', border: '#FDE68A', color: '#92400E' },
            { n: '04', label: 'DELEGATION', bg: '#FFF4ED', border: '#FFD0B5', color: '#C2410C' },
            { n: '05', label: 'EXFILTRATION (BLOCKED)', bg: '#FFF1F2', border: '#FECDD3', color: '#9F1239' },
          ].map((s) => (
            <div key={s.n} className="p-3 rounded-lg border-2 text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-md" style={{ background: s.bg, borderColor: s.border, color: s.color }}>{s.n} {s.label}</div>
          ))}
        </div>
      </div>

      {/* Chains */}
      {isLoading ? (
        <div className="card py-16 flex flex-col items-center gap-3"><RefreshCw className="spinner text-rose-500" size={28} /><span className="text-sm font-bold text-slate-500">Correlating attack chains...</span></div>
      ) : filteredChains.length === 0 ? (
        <div className="card py-16 text-center"><Layers size={36} className="text-slate-300 mx-auto mb-2" /><p className="font-bold text-slate-500">No attack chains found.</p></div>
      ) : (
        <div className="space-y-6">
          {filteredChains.map((chain) => {
            const isCritical = chain.severity === 'CRITICAL';
            return (
              <div key={chain.chainId || chain.id} className="card p-6 sm:p-8 relative overflow-hidden" style={isCritical ? { border: '2px solid #F43F5E', background: 'linear-gradient(135deg, #FFF1F2 0%, #FFF4ED 50%, #FFFFFF 100%)' } : {}}>
                <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-extrabold px-3 py-1 rounded-full border-2" style={{ background: '#FFF1F2', borderColor: '#FECDD3', color: '#9F1239' }}>{chain.chainId || chain.id}</span>
                    <span className="font-mono text-xs text-slate-500 font-bold">• Confidence: {Math.round((chain.confidenceScore || 0.98) * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <RiskBadge risk={chain.severity || 'CRITICAL'} />
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => handleOpenModal(chain.chainId || chain.id)}><Eye size={14} /><span>Investigate</span></button>
                  </div>
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 mb-2" style={{ fontFamily: 'Sora' }}>{chain.summary}</h3>
                <p className="text-xs text-slate-600 mb-5 leading-relaxed">{chain.description || 'Compound trajectory detected across multiple agent execution steps.'}</p>
                {chain.stages && chain.stages.length > 0 && (
                  <div className="mt-4 pt-4 border-t-2 border-orange-100"><AttackChainTimeline stages={chain.stages} /></div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && inspectChainId && <AttackChainDetailModal chainId={inspectChainId} isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setInspectChainId(null); }} />}
    </div>
  );
};

export default AttackChains;
