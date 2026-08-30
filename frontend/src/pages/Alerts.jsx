import React, { useState, useEffect, useCallback } from 'react';
import { Bell, RefreshCw, Search, Filter, AlertTriangle, CheckCircle2, Flame, ShieldAlert, ArrowRight } from 'lucide-react';
import { alertsApi } from '../api/client';
import RiskBadge from '../components/security/RiskBadge';
import AttackChainDetailModal from '../components/security/AttackChainDetailModal';

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedChainId, setSelectedChainId] = useState(null);
  const [isChainModalOpen, setIsChainModalOpen] = useState(false);

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true); setError(null);
    try { const res = await alertsApi.listAlerts({ resolved: statusFilter === 'RESOLVED' ? true : statusFilter === 'UNRESOLVED' ? false : undefined, limit: 50 }); setAlerts(res.alerts || []); }
    catch (err) { setError(err.message || 'Failed to load alerts.'); } finally { setIsLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const handleOpenChain = (chainId) => { if (!chainId) return; setSelectedChainId(chainId); setIsChainModalOpen(true); };

  const filteredAlerts = alerts.filter((al) => { if (!searchQuery) return true; const q = searchQuery.toLowerCase(); return al.alertId?.toLowerCase().includes(q) || al.title?.toLowerCase().includes(q) || al.description?.toLowerCase().includes(q) || al.severity?.toLowerCase().includes(q); });
  const openCount = alerts.filter((a) => a.status === 'UNRESOLVED').length;
  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL').length;
  const highCount = alerts.filter((a) => a.severity === 'HIGH').length;

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div className="rounded-3xl p-7 flex items-center justify-between flex-wrap gap-4" style={{ background: 'linear-gradient(135deg, #FFFBEB 0%, #FFF1F2 50%, #FFF4ED 100%)', border: '2px solid #FDE68A' }}>
        <div>
          <span className="text-xs font-mono font-extrabold px-3 py-1 rounded-full text-white shadow-sm" style={{ background: 'linear-gradient(135deg, #F59E0B, #F43F5E)' }}>🚨 INCIDENT TRIAGE</span>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-2" style={{ fontFamily: 'Sora' }}>Security Incident Alerts</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">Real-time notifications triggered by high-risk events, intent drift violations, and multi-stage attack correlations.</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={fetchAlerts} disabled={isLoading}><RefreshCw size={15} className={isLoading ? 'spinner' : ''} /><span>Refresh</span></button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="rounded-2xl p-5 border-2 border-l-[6px] transition-all duration-300 hover:-translate-y-2 hover:shadow-lg" style={{ background: '#FFFBEB', borderColor: '#FDE68A', borderLeftColor: '#F59E0B' }}>
          <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-500 tracking-wider mb-1"><span>Open Incidents</span><Bell className="text-amber-500" size={18} /></div>
          <div className="text-3xl font-extrabold text-amber-600" style={{ fontFamily: 'Sora' }}>{openCount}</div>
          <div className="text-xs text-slate-500 mt-1">Requiring operator review</div>
        </div>
        <div className="rounded-2xl p-5 border-2 border-l-[6px] transition-all duration-300 hover:-translate-y-2 hover:shadow-lg" style={{ background: '#FFF1F2', borderColor: '#FECDD3', borderLeftColor: '#F43F5E' }}>
          <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-500 tracking-wider mb-1"><span>Critical</span><Flame className="text-rose-500" size={18} /></div>
          <div className="text-3xl font-extrabold text-rose-600" style={{ fontFamily: 'Sora' }}>{criticalCount}</div>
          <div className="text-xs text-slate-500 mt-1">Exfiltration attempts</div>
        </div>
        <div className="rounded-2xl p-5 border-2 border-l-[6px] transition-all duration-300 hover:-translate-y-2 hover:shadow-lg" style={{ background: '#FFF4ED', borderColor: '#FFD0B5', borderLeftColor: '#FF6B35' }}>
          <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-500 tracking-wider mb-1"><span>High Severity</span><ShieldAlert className="text-orange-500" size={18} /></div>
          <div className="text-3xl font-extrabold text-orange-600" style={{ fontFamily: 'Sora' }}>{highCount}</div>
          <div className="text-xs text-slate-500 mt-1">Unauthorized access</div>
        </div>
      </div>

      {/* Filter */}
      <div className="card p-4 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[260px]"><Search size={18} className="text-amber-500" /><input type="text" className="w-full bg-transparent border-none outline-none text-sm font-medium text-slate-800 placeholder-slate-400" placeholder="Filter by title, description, or ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
        <div className="flex items-center gap-2 border-l-2 border-amber-200 pl-4"><Filter size={16} className="text-amber-500" />
          <select className="bg-transparent border-2 border-amber-200 rounded-lg px-3 py-1 text-xs font-bold text-slate-700 outline-none" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All Statuses</option><option value="UNRESOLVED">Unresolved</option><option value="RESOLVED">Resolved</option>
          </select>
        </div>
      </div>

      {error && <div className="card bg-rose-50 border-2 border-rose-200 p-4 text-rose-700 flex items-center gap-3 font-semibold text-sm"><AlertTriangle size={18} /><span>{error}</span></div>}

      {/* Alerts List */}
      {isLoading ? (
        <div className="card py-16 flex flex-col items-center gap-3"><RefreshCw className="spinner text-amber-500" size={28} /><span className="text-sm font-bold text-slate-500">Loading incident queue...</span></div>
      ) : filteredAlerts.length === 0 ? (
        <div className="card py-16 text-center"><CheckCircle2 size={36} className="text-emerald-500 mx-auto mb-2" /><p className="font-bold text-slate-500">Incident queue clear. No open alerts.</p></div>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map((al) => {
            const isCritical = al.severity === 'CRITICAL';
            return (
              <div key={al.alertId} className="card p-6 flex flex-col justify-between hover:border-amber-400 transition-all" style={isCritical ? { border: '2px solid #FECDD3', background: 'linear-gradient(135deg, #FFF1F2 0%, #FFFFFF 100%)' } : {}}>
                <div className="flex items-start justify-between flex-wrap gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 border border-amber-300">{al.alertId}</span>
                    <RiskBadge risk={al.severity} />
                  </div>
                  <span className={`badge text-xs font-bold ${al.status === 'UNRESOLVED' ? 'badge-block' : 'badge-allow'}`}>● {al.status}</span>
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 mb-1.5" style={{ fontFamily: 'Sora' }}>{al.title}</h3>
                <p className="text-xs text-slate-600 mb-4 leading-relaxed">{al.description}</p>
                <div className="pt-3 border-t-2 border-orange-100 flex items-center justify-between flex-wrap gap-2 text-xs">
                  <span className="font-mono text-slate-400 text-[11px]">{al.createdAt ? new Date(al.createdAt).toLocaleString() : 'Recent'}</span>
                  {al.attackChainId ? (
                    <button type="button" className="inline-flex items-center gap-1.5 font-bold text-rose-600 hover:underline cursor-pointer" onClick={() => handleOpenChain(al.attackChainId)}><span>Investigate Chain</span><ArrowRight size={14} /></button>
                  ) : (
                    <span className="text-slate-400 font-mono text-[11px]">Discrete Anomaly</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isChainModalOpen && selectedChainId && <AttackChainDetailModal chainId={selectedChainId} isOpen={isChainModalOpen} onClose={() => { setIsChainModalOpen(false); setSelectedChainId(null); }} />}
    </div>
  );
};

export default Alerts;
