import React, { useState, useEffect, useCallback } from 'react';
import { Radio, Plus, RefreshCw, AlertTriangle, Target, Clock } from 'lucide-react';
import { sessionsApi, agentsApi } from '../api/client';

const Sessions = () => {
  const [sessions, setSessions] = useState([]);
  const [agents, setAgents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newIntent, setNewIntent] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  const fetchSessions = useCallback(async () => {
    setIsLoading(true); setError(null);
    try {
      const [sR, aR] = await Promise.allSettled([sessionsApi.listSessions(), agentsApi.listAgents()]);
      setSessions(sR.status === 'fulfilled' ? sR.value.sessions || [] : []);
      const ra = aR.status === 'fulfilled' ? aR.value.agents || [] : [];
      setAgents(ra);
      if (ra.length > 0 && !selectedAgentId) setSelectedAgentId(ra[0].agentId);
    } catch (err) { setError(err.message); } finally { setIsLoading(false); }
  }, [selectedAgentId]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newIntent.trim()) { setCreateError('Intent required.'); return; }
    setIsCreating(true); setCreateError(null);
    try { await sessionsApi.createSession({ originalIntent: newIntent.trim(), agentId: selectedAgentId || undefined }); setNewIntent(''); setShowCreateModal(false); fetchSessions(); }
    catch (err) { setCreateError(err.message); } finally { setIsCreating(false); }
  };

  return (
    <div className="page-container space-y-6">
      <div className="rounded-3xl p-7 flex items-center justify-between flex-wrap gap-4" style={{ background: 'linear-gradient(135deg, #ECFDF5 0%, #F0F9FF 50%, #F5F3FF 100%)', border: '2px solid #A7F3D0' }}>
        <div>
          <span className="text-xs font-mono font-extrabold px-3 py-1 rounded-full text-white shadow-sm" style={{ background: 'linear-gradient(135deg, #10B981, #0EA5E9)' }}>🎯 INTENT REGISTRY</span>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-2" style={{ fontFamily: 'Sora' }}>Session & Intent Integrity</h1>
          <p className="text-sm text-slate-500 mt-1">Each session anchors an authoritative intent baseline for runtime drift analysis.</p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" className="btn btn-secondary" onClick={fetchSessions} disabled={isLoading}><RefreshCw size={15} className={isLoading ? 'spinner' : ''} /><span>Refresh</span></button>
          <button type="button" className="btn btn-primary" onClick={() => setShowCreateModal(true)}><Plus size={16} /><span>New Session</span></button>
        </div>
      </div>

      {error && <div className="card bg-rose-50 border-2 border-rose-200 p-4 text-rose-700 flex items-center gap-3 font-semibold text-sm"><AlertTriangle size={18} /><span>{error}</span></div>}

      {isLoading ? (
        <div className="card py-16 flex flex-col items-center gap-3"><RefreshCw className="spinner text-emerald-500" size={28} /><span className="text-sm font-bold text-slate-500">Loading sessions...</span></div>
      ) : sessions.length === 0 ? (
        <div className="card py-16 text-center"><Radio size={36} className="text-slate-300 mx-auto mb-2" /><p className="font-bold text-slate-500">No sessions yet.</p>
          <button type="button" className="btn btn-primary mt-4" onClick={() => setShowCreateModal(true)}>Create First Session</button></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {sessions.map((sess) => {
            const agent = agents.find((a) => a.agentId === sess.agentId);
            const trust = sess.trustScore ?? (agent?.currentTrustScore || 90);
            return (
              <div key={sess.sessionId || sess.id} className="card p-6 space-y-3 hover:border-emerald-400">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-300">{sess.sessionId || sess.id}</span>
                    {sess.agentId && <span className="font-mono text-xs text-sky-600 font-bold">• {sess.agentId}</span>}
                  </div>
                  <span className={`badge text-xs ${trust >= 80 ? 'badge-allow' : 'badge-review'}`}>{trust >= 80 ? '✓ COMPLIANT' : '⚠ DRIFT'}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-emerald-50 border-2 border-emerald-200">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase mb-1"><Target size={14} className="text-amber-500" /><span>Original Intent</span></div>
                  <p className="text-sm font-semibold text-slate-800 italic">"{sess.originalIntent || 'Analyze quarterly financial telemetry'}"</p>
                </div>
                <div className="pt-3 border-t-2 border-emerald-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-slate-500 font-mono"><Clock size={13} /><span>{sess.createdAt ? new Date(sess.createdAt).toLocaleString() : 'Active'}</span></div>
                  <span className={`font-mono font-extrabold text-sm ${trust >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>{trust} / 100</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg p-7 rounded-3xl bg-white border-2 border-orange-200 shadow-2xl">
            <h2 className="text-xl font-extrabold text-slate-900 mb-1">Initialize Session</h2>
            <p className="text-xs text-slate-500 mb-5">Register a new intent baseline for drift analysis.</p>
            {createError && <div className="mb-4 p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold">{createError}</div>}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Assign Agent</label>
                <select className="w-full p-2.5 rounded-xl border-2 border-orange-200 text-sm font-semibold outline-none focus:border-orange-500" value={selectedAgentId} onChange={(e) => setSelectedAgentId(e.target.value)}>
                  {agents.map((a) => <option key={a.agentId} value={a.agentId}>{a.name} ({a.agentId})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Original Intent</label>
                <textarea rows={3} className="w-full p-3 rounded-xl border-2 border-orange-200 text-sm outline-none focus:border-orange-500" placeholder="e.g. Generate read-only financial summary..." value={newIntent} onChange={(e) => setNewIntent(e.target.value)} required />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" className="btn btn-secondary text-xs" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary text-xs" disabled={isCreating}>{isCreating ? 'Creating...' : 'Create Session'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Sessions;
