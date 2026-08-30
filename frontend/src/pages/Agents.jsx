import React, { useState, useEffect, useCallback } from 'react';
import { Users, AlertTriangle, RefreshCw, Search, Filter, Key, Target, Shield } from 'lucide-react';
import { agentsApi } from '../api/client';

const Agents = () => {
  const [agents, setAgents] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAgents = useCallback(async () => {
    setIsLoading(true); setError(null);
    try { const r = await agentsApi.listAgents(statusFilter !== 'ALL' ? statusFilter : undefined); setAgents(r.agents || []); }
    catch (err) { setError(err.message || 'Failed to load agents.'); }
    finally { setIsLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  const filtered = agents.filter((a) => { if (!searchQuery) return true; const q = searchQuery.toLowerCase(); return a.name?.toLowerCase().includes(q) || a.agentId?.toLowerCase().includes(q) || a.declaredObjective?.toLowerCase().includes(q); });
  const featured = filtered[0] || agents[0];
  const others = filtered.slice(1);

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div className="rounded-3xl p-7 flex items-center justify-between flex-wrap gap-4" style={{ background: 'linear-gradient(135deg, #F0F9FF 0%, #F5F3FF 50%, #ECFDF5 100%)', border: '2px solid #BAE6FD' }}>
        <div>
          <span className="text-xs font-mono font-extrabold px-3 py-1 rounded-full text-white shadow-sm" style={{ background: 'linear-gradient(135deg, #0EA5E9, #8B5CF6)' }}>★ FLEET DIRECTORY</span>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-2" style={{ fontFamily: 'Sora' }}>Monitored AI Agent Fleet</h1>
          <p className="text-sm text-slate-500 mt-1">Each agent maintains a server-registered permission boundary and live behavioral trust score.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={fetchAgents} disabled={isLoading}><RefreshCw size={16} className={isLoading ? 'spinner' : ''} /><span>Refresh Fleet</span></button>
      </div>

      {/* Filter Bar */}
      <div className="card p-4 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[250px]">
          <Search size={18} className="text-violet-500" />
          <input type="text" className="w-full bg-transparent border-none outline-none text-sm font-medium text-slate-800 placeholder-slate-400" placeholder="Search by agent name, ID, or mission..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 border-l-2 border-orange-200 pl-4">
          <Filter size={16} className="text-orange-500" />
          <select className="bg-transparent border-2 border-orange-200 rounded-lg px-3 py-1 text-xs font-bold text-slate-700 outline-none focus:border-orange-500" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All Statuses</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option>
          </select>
        </div>
      </div>

      {error && <div className="card bg-rose-50 border-2 border-rose-200 p-4 text-rose-700 flex items-center gap-3 font-semibold text-sm"><AlertTriangle size={18} /><span>{error}</span></div>}

      {isLoading ? (
        <div className="card py-16 flex flex-col items-center gap-3"><RefreshCw className="spinner text-orange-500" size={28} /><span className="text-sm font-bold text-slate-500">Loading agent fleet...</span></div>
      ) : filtered.length === 0 ? (
        <div className="card py-16 text-center"><Users size={40} className="text-slate-300 mx-auto mb-2" /><p className="font-bold text-slate-500">No agents found.</p></div>
      ) : (
        <div className="space-y-6">
          {/* Featured Agent */}
          {featured && (
            <div className="rounded-3xl p-8 border-2 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #FFF4ED 0%, #F0F9FF 50%, #F5F3FF 100%)', borderColor: '#FFD0B5' }}>
              <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl text-white font-extrabold text-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #FF6B35, #F43F5E, #8B5CF6)' }}>01</div>
                  <div>
                    <h2 className="text-2xl font-extrabold text-slate-900">{featured.name}</h2>
                    <span className="font-mono text-xs font-bold text-orange-600">{featured.agentId}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-extrabold text-emerald-600">{featured.currentTrustScore}<span className="text-sm text-slate-400"> / 100</span></span>
                  <span className="badge badge-allow">● {featured.status}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl border-2 border-orange-200 bg-white/80 mb-4">
                <div className="flex items-center gap-2 text-xs font-bold text-orange-800 uppercase mb-1"><Target size={15} className="text-amber-500" /><span>Baseline Mission</span></div>
                <p className="text-sm text-slate-800 italic font-medium">"{featured.declaredObjective || 'No objective registered'}"</p>
              </div>

              <div>
                <div className="flex items-center gap-2 text-xs font-extrabold text-slate-600 uppercase mb-2"><Key size={15} className="text-violet-500" /><span>Validated Permissions:</span></div>
                <div className="flex flex-wrap gap-2">
                  {featured.permissions?.length > 0 ? featured.permissions.map((p) => (
                    <span key={p} className="font-mono text-xs font-bold px-3 py-1.5 rounded-xl border-2 border-emerald-300 bg-emerald-50 text-emerald-700 shadow-sm">✓ {p}</span>
                  )) : <span className="text-xs text-slate-400">No permissions</span>}
                </div>
              </div>
            </div>
          )}

          {/* Other Agents Grid */}
          {others.length > 0 && (
            <div>
              <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2"><Shield size={18} className="text-orange-500" /><span>Fleet ({others.length})</span></h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {others.map((ag) => (
                  <div key={ag.agentId} className="card p-5 flex flex-col justify-between hover:border-orange-400">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-extrabold text-base text-slate-900">{ag.name}</span>
                        <span className="badge badge-allow text-xs">● {ag.status}</span>
                      </div>
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-700 border border-orange-200 inline-block mb-3">{ag.agentId}</span>
                      <p className="text-xs text-slate-500 italic line-clamp-2 leading-relaxed">"{ag.declaredObjective}"</p>
                    </div>
                    <div className="pt-3 mt-3 border-t-2 border-orange-100 flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-bold">Trust</span>
                      <span className={`text-base font-extrabold ${ag.currentTrustScore >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>{ag.currentTrustScore} / 100</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Agents;
