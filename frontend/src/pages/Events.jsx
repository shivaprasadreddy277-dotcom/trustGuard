import React, { useState, useEffect, useCallback } from 'react';
import { Zap, RefreshCw, Plus, Search, Filter, Eye, AlertTriangle } from 'lucide-react';
import { eventsApi, agentsApi, sessionsApi } from '../api/client';
import DecisionBadge from '../components/security/DecisionBadge';
import InvestigationModal from '../components/security/InvestigationModal';

const Events = () => {
  const [events, setEvents] = useState([]);
  const [agents, setAgents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sensitivityFilter, setSensitivityFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestError, setIngestError] = useState(null);
  const [ingestPayload, setIngestPayload] = useState({ sessionId: '', agentId: '', action: 'query_db', tool: 'database_connector', resource: 'NovaCorp_Credentials', dataSensitivity: 'HIGH', authorization: { status: 'ALLOWED', requiredPermission: 'db.read', grantedPermissions: ['db.read'] }, provenance: { sourceType: 'EXTERNAL_DOCUMENT', sourceId: 'untrusted_input.txt', trustLevel: 'UNTRUSTED' } });
  const [selectedEvent, setSelectedEvent] = useState(null);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true); setError(null);
    try {
      const [eR, aR, sR] = await Promise.allSettled([eventsApi.listEvents({ limit: 50 }), agentsApi.listAgents(), sessionsApi.listSessions()]);
      const re = eR.status === 'fulfilled' ? eR.value.events || [] : [];
      const ra = aR.status === 'fulfilled' ? aR.value.agents || [] : [];
      const rs = sR.status === 'fulfilled' ? sR.value.sessions || [] : [];
      setEvents(re); setAgents(ra); setSessions(rs);
      if (rs.length > 0 && !ingestPayload.sessionId) setIngestPayload((p) => ({ ...p, sessionId: rs[0].sessionId, agentId: rs[0].agentId || (ra[0]?.agentId || 'agent_001') }));
    } catch (err) { setError(err.message); } finally { setIsLoading(false); }
  }, [ingestPayload.sessionId]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleIngest = async (e) => {
    e.preventDefault(); setIsIngesting(true); setIngestError(null);
    try { await eventsApi.ingestEvent({ eventId: `evt_manual_${Date.now()}`, ...ingestPayload }); setShowIngestModal(false); fetchEvents(); }
    catch (err) { setIngestError(err.message); } finally { setIsIngesting(false); }
  };

  const filtered = events.filter((ev) => {
    if (sensitivityFilter !== 'ALL' && ev.dataSensitivity !== sensitivityFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return ev.eventId?.toLowerCase().includes(q) || ev.action?.toLowerCase().includes(q) || ev.resource?.toLowerCase().includes(q) || ev.tool?.toLowerCase().includes(q) || ev.agentId?.toLowerCase().includes(q);
  });

  return (
    <div className="page-container space-y-6">
      <div className="rounded-3xl p-7 flex items-center justify-between flex-wrap gap-4" style={{ background: 'linear-gradient(135deg, #FFF1F2 0%, #F5F3FF 50%, #F0F9FF 100%)', border: '2px solid #FECDD3' }}>
        <div>
          <span className="text-xs font-mono font-extrabold px-3 py-1 rounded-full text-white shadow-sm" style={{ background: 'linear-gradient(135deg, #F43F5E, #8B5CF6)' }}>⚡ LIVE TELEMETRY</span>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-2" style={{ fontFamily: 'Sora' }}>Security Telemetry Stream</h1>
          <p className="text-sm text-slate-500 mt-1">Runtime event stream recording every agent tool invocation, provenance, and verdict.</p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" className="btn btn-secondary" onClick={fetchEvents} disabled={isLoading}><RefreshCw size={15} className={isLoading ? 'spinner' : ''} /><span>Refresh</span></button>
          <button type="button" className="btn btn-primary" onClick={() => setShowIngestModal(true)}><Plus size={16} /><span>Ingest Event</span></button>
        </div>
      </div>

      <div className="card p-4 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[250px]">
          <Search size={18} className="text-rose-500" />
          <input type="text" className="w-full bg-transparent border-none outline-none text-sm font-medium text-slate-800 placeholder-slate-400" placeholder="Filter by action, resource, tool, or agent..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 border-l-2 border-rose-200 pl-4">
          <Filter size={16} className="text-rose-500" />
          <select className="bg-transparent border-2 border-rose-200 rounded-lg px-3 py-1 text-xs font-bold text-slate-700 outline-none" value={sensitivityFilter} onChange={(e) => setSensitivityFilter(e.target.value)}>
            <option value="ALL">All Sensitivity</option><option value="CRITICAL">Critical</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {error && <div className="card bg-rose-50 border-2 border-rose-200 p-4 text-rose-700 flex items-center gap-3 font-semibold text-sm"><AlertTriangle size={18} /><span>{error}</span></div>}

      {isLoading ? (
        <div className="card py-16 flex flex-col items-center gap-3"><RefreshCw className="spinner text-rose-500" size={28} /><span className="text-sm font-bold text-slate-500">Streaming events...</span></div>
      ) : filtered.length === 0 ? (
        <div className="card py-16 text-center"><Zap size={36} className="text-slate-300 mx-auto mb-2" /><p className="font-bold text-slate-500">No events found.</p></div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="grid grid-cols-[80px_100px_130px_1fr_90px_80px_40px] gap-2 px-5 py-3 text-[11px] font-mono font-extrabold text-slate-400 uppercase tracking-wider border-b-2" style={{ background: 'linear-gradient(90deg, #FFF8F2, #FFFFFF)', borderColor: '#FFD0B5' }}>
            <span>Time</span><span>Agent</span><span>Action</span><span>Resource</span><span>Sensitivity</span><span>Verdict</span><span></span>
          </div>
          <div className="divide-y divide-orange-100">
            {filtered.map((ev) => {
              const verdict = ev.dataSensitivity === 'CRITICAL' ? 'BLOCK' : 'ALLOW';
              return (
                <div key={ev.eventId} className="grid grid-cols-[80px_100px_130px_1fr_90px_80px_40px] items-center gap-2 px-5 py-3 hover:bg-orange-50/50 transition-colors text-xs">
                  <span className="font-mono text-slate-500">{new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  <span className="font-mono font-bold text-sky-700 truncate">{ev.agentId || 'agent_001'}</span>
                  <span className="font-bold text-slate-900 truncate">{ev.action}</span>
                  <span className="font-mono text-slate-600 truncate">{ev.resource}</span>
                  <span><span className={`font-mono text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${ev.dataSensitivity === 'CRITICAL' ? 'bg-rose-100 text-rose-700 border-rose-300' : ev.dataSensitivity === 'HIGH' ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-emerald-100 text-emerald-700 border-emerald-300'}`}>{ev.dataSensitivity || 'NORMAL'}</span></span>
                  <DecisionBadge decision={verdict} />
                  <button type="button" onClick={() => setSelectedEvent(ev)} className="p-1.5 rounded-lg hover:bg-violet-100 text-violet-500 transition-colors cursor-pointer"><Eye size={14} /></button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showIngestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg p-7 rounded-3xl bg-white border-2 border-orange-200 shadow-2xl">
            <h2 className="text-xl font-extrabold text-slate-900 mb-1">Ingest Telemetry Event</h2>
            <p className="text-xs text-slate-500 mb-5">Dispatch a live tool invocation into the arbitration pipeline.</p>
            {ingestError && <div className="mb-4 p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold">{ingestError}</div>}
            <form onSubmit={handleIngest} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-bold uppercase text-slate-700 mb-1">Action</label><input type="text" className="w-full p-2.5 rounded-xl border-2 border-orange-200 text-sm font-semibold outline-none" value={ingestPayload.action} onChange={(e) => setIngestPayload({ ...ingestPayload, action: e.target.value })} required /></div>
                <div><label className="block text-xs font-bold uppercase text-slate-700 mb-1">Tool</label><input type="text" className="w-full p-2.5 rounded-xl border-2 border-orange-200 text-sm font-semibold outline-none" value={ingestPayload.tool} onChange={(e) => setIngestPayload({ ...ingestPayload, tool: e.target.value })} required /></div>
              </div>
              <div><label className="block text-xs font-bold uppercase text-slate-700 mb-1">Resource</label><input type="text" className="w-full p-2.5 rounded-xl border-2 border-orange-200 text-sm font-semibold outline-none" value={ingestPayload.resource} onChange={(e) => setIngestPayload({ ...ingestPayload, resource: e.target.value })} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-bold uppercase text-slate-700 mb-1">Sensitivity</label><select className="w-full p-2.5 rounded-xl border-2 border-orange-200 text-sm font-semibold outline-none" value={ingestPayload.dataSensitivity} onChange={(e) => setIngestPayload({ ...ingestPayload, dataSensitivity: e.target.value })}><option value="LOW">LOW</option><option value="MEDIUM">MEDIUM</option><option value="HIGH">HIGH</option><option value="CRITICAL">CRITICAL</option></select></div>
                <div><label className="block text-xs font-bold uppercase text-slate-700 mb-1">Provenance</label><select className="w-full p-2.5 rounded-xl border-2 border-orange-200 text-sm font-semibold outline-none" value={ingestPayload.provenance.trustLevel} onChange={(e) => setIngestPayload({ ...ingestPayload, provenance: { ...ingestPayload.provenance, trustLevel: e.target.value } })}><option value="TRUSTED">TRUSTED</option><option value="UNTRUSTED">UNTRUSTED</option><option value="SUSPICIOUS">SUSPICIOUS</option></select></div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" className="btn btn-secondary text-xs" onClick={() => setShowIngestModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary text-xs" disabled={isIngesting}>{isIngesting ? 'Ingesting...' : 'Dispatch'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedEvent && <InvestigationModal event={selectedEvent} agent={agents.find((a) => a.agentId === selectedEvent.agentId)} session={sessions.find((s) => s.sessionId === selectedEvent.sessionId)} isOpen={Boolean(selectedEvent)} onClose={() => setSelectedEvent(null)} />}
    </div>
  );
};
export default Events;
