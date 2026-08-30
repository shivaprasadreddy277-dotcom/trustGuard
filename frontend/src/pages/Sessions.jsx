import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Radio, Plus, RefreshCw, AlertTriangle, Target, Clock, 
  Search, Filter, ShieldCheck, ShieldAlert, Sparkles, Layers, 
  Copy, Check, Users, Compass, Eye, CheckCircle2 
} from 'lucide-react';
import { sessionsApi, agentsApi, eventsApi } from '../api/client';
import TrustScoreMeter from '../components/security/TrustScoreMeter';

const Sessions = () => {
  const [sessions, setSessions] = useState([]);
  const [agents, setAgents] = useState([]);
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL'); // 'ALL' | 'PRODUCTION' | 'SIMULATION'
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'COMPLIANT' | 'DRIFT'
  const [groupByUniqueIntent, setGroupByUniqueIntent] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newIntent, setNewIntent] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [selectedSessionDetail, setSelectedSessionDetail] = useState(null);

  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [sR, aR, eR] = await Promise.allSettled([
        sessionsApi.listSessions(),
        agentsApi.listAgents(),
        eventsApi.listEvents({ limit: 100 })
      ]);

      const rawSessions = sR.status === 'fulfilled' ? sR.value.sessions || [] : [];
      const rawAgents = aR.status === 'fulfilled' ? aR.value.agents || [] : [];
      const rawEvents = eR.status === 'fulfilled' ? eR.value.events || [] : [];

      setSessions(rawSessions);
      setAgents(rawAgents);
      setEvents(rawEvents);

      if (rawAgents.length > 0 && !selectedAgentId) {
        setSelectedAgentId(rawAgents[0].agentId);
      }
    } catch (err) {
      setError(err.message || 'Failed to load sessions.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedAgentId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newIntent.trim()) {
      setCreateError('Original Intent text is required.');
      return;
    }
    setIsCreating(true);
    setCreateError(null);
    try {
      await sessionsApi.createSession({
        originalIntent: newIntent.trim(),
        agentId: selectedAgentId || undefined,
      });
      setNewIntent('');
      setShowCreateModal(false);
      fetchSessions();
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopySessionId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Identify scenario from simulation session or intent
  const getScenarioLabel = (sess) => {
    const intent = (sess.originalIntent || '').toLowerCase();
    const id = (sess.sessionId || sess.id || '').toLowerCase();
    if (!id.startsWith('sess_sim_') && id !== 'sess_sim_99') {
      return { label: 'PRODUCTION SESSION', isSim: false, color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' };
    }
    if (intent.includes('compound') || intent.includes('performance logs and generate system report')) {
      return { label: 'SIMULATION · Compound Attack Scenario', isSim: true, color: '#E11D48', bg: '#FFF1F2', border: '#FECDD3' };
    }
    if (intent.includes('injection') || intent.includes('customer documentation')) {
      return { label: 'SIMULATION · Indirect Prompt Injection', isSim: true, color: '#E11D48', bg: '#FFF1F2', border: '#FECDD3' };
    }
    if (intent.includes('drift') || intent.includes('customer support volume')) {
      return { label: 'SIMULATION · Intent Drift Scenario', isSim: true, color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' };
    }
    if (intent.includes('sensitive') || intent.includes('usage metrics')) {
      return { label: 'SIMULATION · Sensitive Access Scenario', isSim: true, color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' };
    }
    if (intent.includes('financial') || intent.includes('monthly')) {
      return { label: 'SIMULATION · Normal Analytical Workflow', isSim: true, color: '#0284C7', bg: '#F0F9FF', border: '#BAE6FD' };
    }
    return { label: 'SIMULATION EXECUTION', isSim: true, color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' };
  };

  // Processed, filtered, and deduplicated sessions
  const processedSessions = useMemo(() => {
    let result = sessions.map((sess) => {
      const agent = agents.find((a) => a.agentId === sess.agentId);
      const trust = sess.trustScore ?? (agent?.currentTrustScore || 90);
      const tag = getScenarioLabel(sess);
      const sessionEvents = events.filter((e) => e.sessionId === (sess.sessionId || sess.id));

      return {
        ...sess,
        sessionId: sess.sessionId || sess.id,
        trustScore: trust,
        isCompliant: trust >= 80,
        tag,
        agentName: agent?.name || sess.agentId || 'NovaCorp Agent',
        eventCount: sessionEvents.length,
      };
    });

    // Category filter
    if (categoryFilter === 'PRODUCTION') {
      result = result.filter((s) => !s.tag.isSim);
    } else if (categoryFilter === 'SIMULATION') {
      result = result.filter((s) => s.tag.isSim);
    }

    // Status filter
    if (statusFilter === 'COMPLIANT') {
      result = result.filter((s) => s.isCompliant);
    } else if (statusFilter === 'DRIFT') {
      result = result.filter((s) => !s.isCompliant);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((s) =>
        s.sessionId?.toLowerCase().includes(q) ||
        s.originalIntent?.toLowerCase().includes(q) ||
        s.agentId?.toLowerCase().includes(q) ||
        s.agentName?.toLowerCase().includes(q)
      );
    }

    // Deduplicate identical intents if toggled
    if (groupByUniqueIntent) {
      const seenIntents = new Map();
      result.forEach((s) => {
        const key = (s.originalIntent || '').trim().toLowerCase();
        if (!seenIntents.has(key)) {
          seenIntents.set(key, { ...s, duplicateCount: 1 });
        } else {
          seenIntents.get(key).duplicateCount += 1;
        }
      });
      result = Array.from(seenIntents.values());
    }

    return result;
  }, [sessions, agents, events, categoryFilter, statusFilter, searchQuery, groupByUniqueIntent]);

  // Summary Metrics
  const totalSessionsCount = sessions.length;
  const compliantCount = sessions.filter((s) => {
    const ag = agents.find((a) => a.agentId === s.agentId);
    return (s.trustScore ?? (ag?.currentTrustScore || 90)) >= 80;
  }).length;
  const driftCount = totalSessionsCount - compliantCount;
  const uniqueAgentCount = new Set(sessions.map((s) => s.agentId).filter(Boolean)).size || agents.length;

  return (
    <div className="page-container space-y-6">
      {/* Header Banner */}
      <div 
        className="rounded-3xl p-7 flex items-center justify-between flex-wrap gap-4" 
        style={{ 
          background: 'linear-gradient(135deg, #ECFDF5 0%, #F0F9FF 50%, #F5F3FF 100%)', 
          border: '2px solid #A7F3D0' 
        }}
      >
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span 
              className="text-xs font-mono font-extrabold px-3 py-1 rounded-full text-white shadow-sm" 
              style={{ background: 'linear-gradient(135deg, #10B981, #0EA5E9)' }}
            >
              🎯 INTENT REGISTRY & BASELINES
            </span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              ● SEMANTIC COSINE ALIGNMENT
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900" style={{ fontFamily: 'Sora' }}>
            Session & Intent Integrity
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Each registered session anchors an authoritative original intent baseline. The TrustGuard Intent Engine calculates live vector cosine similarity to detect runtime behavioral drift.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={fetchSessions} 
            disabled={isLoading}
          >
            <RefreshCw size={15} className={isLoading ? 'spinner' : ''} />
            <span>Refresh</span>
          </button>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={16} />
            <span>Initialize Session</span>
          </button>
        </div>
      </div>

      {/* Metrics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl p-4 sm:p-5 border-2 border-l-[6px] border-l-emerald-500" style={{ background: '#ECFDF5', borderColor: '#A7F3D0' }}>
          <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-500 tracking-wider mb-1">
            <span>Total Sessions</span>
            <Radio className="text-emerald-500" size={18} />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700" style={{ fontFamily: 'Sora' }}>{totalSessionsCount}</div>
          <div className="text-xs text-slate-500 mt-1">Registered baselines</div>
        </div>

        <div className="rounded-2xl p-4 sm:p-5 border-2 border-l-[6px] border-l-teal-500" style={{ background: '#F0FDFA', borderColor: '#99F6E4' }}>
          <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-500 tracking-wider mb-1">
            <span>Compliant</span>
            <ShieldCheck className="text-teal-500" size={18} />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-teal-700" style={{ fontFamily: 'Sora' }}>{compliantCount}</div>
          <div className="text-xs text-slate-500 mt-1">Trust Score &ge; 80 / 100</div>
        </div>

        <div className="rounded-2xl p-4 sm:p-5 border-2 border-l-[6px] border-l-amber-500" style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}>
          <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-500 tracking-wider mb-1">
            <span>Drift Detected</span>
            <ShieldAlert className="text-amber-500" size={18} />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-700" style={{ fontFamily: 'Sora' }}>{driftCount}</div>
          <div className="text-xs text-slate-500 mt-1">Goal misalignment flagged</div>
        </div>

        <div className="rounded-2xl p-4 sm:p-5 border-2 border-l-[6px] border-l-sky-500" style={{ background: '#F0F9FF', borderColor: '#BAE6FD' }}>
          <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-500 tracking-wider mb-1">
            <span>Fleet Agents</span>
            <Users className="text-sky-500" size={18} />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-sky-700" style={{ fontFamily: 'Sora' }}>{uniqueAgentCount}</div>
          <div className="text-xs text-slate-500 mt-1">Active monitored agents</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card p-4 flex items-center justify-between flex-wrap gap-4">
        {/* Search */}
        <div className="flex items-center gap-3 flex-1 min-w-[260px]">
          <Search size={18} className="text-emerald-500" />
          <input 
            type="text" 
            className="w-full bg-transparent border-none outline-none text-sm font-medium text-slate-800 placeholder-slate-400" 
            placeholder="Search by session ID, agent name, or original intent..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
          />
        </div>

        {/* Filter Selects & Deduplicate Toggle */}
        <div className="flex items-center gap-3 flex-wrap border-l-2 border-emerald-100 pl-4">
          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Origin:</span>
            <select 
              className="bg-white border-2 border-emerald-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-emerald-500" 
              value={categoryFilter} 
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="ALL">All Origins ({sessions.length})</option>
              <option value="PRODUCTION">User / Production</option>
              <option value="SIMULATION">Simulation Runs</option>
            </select>
          </div>

          {/* Compliance Status */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Integrity:</span>
            <select 
              className="bg-white border-2 border-emerald-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-emerald-500" 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Status</option>
              <option value="COMPLIANT">Compliant</option>
              <option value="DRIFT">Drift Alert</option>
            </select>
          </div>

          {/* Group / Deduplicate Toggle */}
          <label className="flex items-center gap-2 cursor-pointer bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-800 select-none hover:bg-emerald-100 transition-colors">
            <input 
              type="checkbox" 
              checked={groupByUniqueIntent} 
              onChange={(e) => setGroupByUniqueIntent(e.target.checked)} 
              className="accent-emerald-600 rounded"
            />
            <span>Group Identical Intents</span>
          </label>
        </div>
      </div>

      {error && (
        <div className="card bg-rose-50 border-2 border-rose-200 p-4 text-rose-700 flex items-center gap-3 font-semibold text-sm">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Sessions Grid */}
      {isLoading ? (
        <div className="card py-16 flex flex-col items-center gap-3">
          <RefreshCw className="spinner text-emerald-500" size={28} />
          <span className="text-sm font-bold text-slate-500">Loading intent registry...</span>
        </div>
      ) : processedSessions.length === 0 ? (
        <div className="card py-16 text-center">
          <Radio size={36} className="text-slate-300 mx-auto mb-2" />
          <p className="font-bold text-slate-500">No sessions match your filter.</p>
          <button 
            type="button" 
            className="btn btn-primary mt-4" 
            onClick={() => { setSearchQuery(''); setCategoryFilter('ALL'); setStatusFilter('ALL'); }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {processedSessions.map((sess) => {
            const isCompliant = sess.isCompliant;
            const tag = sess.tag;

            return (
              <div 
                key={sess.sessionId} 
                className="card p-6 flex flex-col justify-between hover:border-emerald-400 hover:shadow-md transition-all relative overflow-hidden"
                style={{
                  borderLeftWidth: '6px',
                  borderLeftColor: isCompliant ? '#10B981' : '#F59E0B',
                }}
              >
                <div>
                  {/* Top Bar: Session ID, Agent, Status */}
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300">
                        {sess.sessionId}
                      </span>
                      <button 
                        type="button" 
                        onClick={() => handleCopySessionId(sess.sessionId)} 
                        className="text-slate-400 hover:text-emerald-600 transition-colors p-1"
                        title="Copy Session ID"
                      >
                        {copiedId === sess.sessionId ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {sess.duplicateCount && sess.duplicateCount > 1 && (
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
                          {sess.duplicateCount} runs grouped
                        </span>
                      )}
                      <span className={`badge text-xs font-bold ${isCompliant ? 'badge-allow' : 'badge-review'}`}>
                        {isCompliant ? '✓ COMPLIANT' : '⚠ DRIFT DETECTED'}
                      </span>
                    </div>
                  </div>

                  {/* Scenario / Origin Badge */}
                  <div className="mb-3">
                    <span 
                      className="text-[11px] font-mono font-extrabold px-2.5 py-1 rounded-md inline-flex items-center gap-1.5 border"
                      style={{ background: tag.bg, color: tag.color, borderColor: tag.border }}
                    >
                      {tag.isSim ? <Sparkles size={12} /> : <Target size={12} />}
                      <span>{tag.label}</span>
                    </span>
                  </div>

                  {/* Assigned Agent */}
                  <div className="flex items-center gap-2 text-xs text-slate-600 mb-3 font-semibold">
                    <Users size={13} className="text-sky-600" />
                    <span>Assigned Agent: <strong className="text-slate-900">{sess.agentName}</strong></span>
                    <span className="font-mono text-[11px] text-sky-700 bg-sky-50 px-1.5 py-0.2 rounded">({sess.agentId})</span>
                  </div>

                  {/* Original Intent Box */}
                  <div className="p-4 rounded-2xl bg-emerald-50/70 border-2 border-emerald-200 mb-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 uppercase mb-1">
                      <Target size={14} className="text-amber-500" />
                      <span>Authoritative Baseline Objective</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 italic leading-relaxed">
                      "{sess.originalIntent || 'Standard operational task'}"
                    </p>
                  </div>
                </div>

                {/* Footer: Trust Score & Timestamp */}
                <div className="pt-3.5 border-t-2 border-emerald-100 flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500 font-mono">
                    <Clock size={13} />
                    <span>{sess.createdAt ? new Date(sess.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Active Session'}</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-500">Trust:</span>
                    <span className={`font-mono font-extrabold text-sm ${isCompliant ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {sess.trustScore} / 100
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Initialize Session Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg p-7 rounded-3xl bg-white border-2 border-emerald-200 shadow-2xl">
            <h2 className="text-xl font-extrabold text-slate-900 mb-1" style={{ fontFamily: 'Sora' }}>
              Initialize Operational Session
            </h2>
            <p className="text-xs text-slate-500 mb-5">
              Register an immutable baseline objective for real-time drift cosine comparison.
            </p>
            {createError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold">
                {createError}
              </div>
            )}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Target Monitored Agent
                </label>
                <select 
                  className="w-full p-2.5 rounded-xl border-2 border-emerald-200 text-sm font-semibold outline-none focus:border-emerald-500" 
                  value={selectedAgentId} 
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                >
                  {agents.map((a) => (
                    <option key={a.agentId} value={a.agentId}>
                      {a.name} ({a.agentId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Original Intent Baseline (Objective)
                </label>
                <textarea 
                  rows={3} 
                  className="w-full p-3 rounded-xl border-2 border-emerald-200 text-sm outline-none focus:border-emerald-500" 
                  placeholder="e.g. Generate read-only financial analysis for quarterly board report..." 
                  value={newIntent} 
                  onChange={(e) => setNewIntent(e.target.value)} 
                  required 
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  This intent will serve as the ground truth vector for drift calculation across all subsequent tool calls.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  className="btn btn-secondary text-xs" 
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary text-xs" 
                  disabled={isCreating}
                >
                  {isCreating ? 'Registering...' : 'Register Intent Baseline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sessions;
