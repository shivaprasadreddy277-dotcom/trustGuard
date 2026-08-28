import React, { useState, useEffect, useCallback } from 'react';
import {
  Radio,
  Plus,
  RefreshCw,
  AlertTriangle,
  Target,
  Sparkles,
} from 'lucide-react';
import { sessionsApi, agentsApi } from '../api/client';

const Sessions = () => {
  const [sessions, setSessions] = useState([]);
  const [agents, setAgents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // New Session Form
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newIntent, setNewIntent] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [sessRes, agRes] = await Promise.allSettled([
        sessionsApi.listSessions(),
        agentsApi.listAgents(),
      ]);

      const rawSessions = sessRes.status === 'fulfilled' ? sessRes.value.sessions || [] : [];
      const rawAgents = agRes.status === 'fulfilled' ? agRes.value.agents || [] : [];

      setSessions(rawSessions);
      setAgents(rawAgents);
      if (rawAgents.length > 0 && !selectedAgentId) {
        setSelectedAgentId(rawAgents[0].agentId);
      }
    } catch (err) {
      setError(err.message || 'Failed to load session registry.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedAgentId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!newIntent.trim()) {
      setCreateError('Original intent baseline is required.');
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
      setCreateError(err.message || 'Failed to initialize session.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-[#6A4D00] bg-[#FFF5DD] px-2.5 py-0.5 rounded-full border border-[#FFE29E]">
              🎯 INTENT REGISTRY
            </span>
            <span className="text-xs text-[#8F8F8F] font-mono">// Semantic Baseline Arbitration</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-[#2D2D2D]">
            Session & Intent Integrity
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-1">
            Every session anchors an Authoritative Intent Baseline. The 3.3 Intent Integrity Engine measures ongoing agent drift against this baseline.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={fetchSessions}
            disabled={isLoading}
          >
            <RefreshCw size={14} className={isLoading ? 'spinner' : ''} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={15} />
            <span>Initialize Session</span>
          </button>
        </div>
      </div>

      {/* Visual Intent Drift Teaching Banner */}
      <div className="editorial-card p-6 bg-gradient-to-r from-white to-[#FFFDF8]">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className="text-[#FFC857]" />
          <h3 className="font-display text-sm font-bold text-[#2D2D2D] uppercase tracking-wider">
            How TrustGuard Detects Intent Drift
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-[#FAF9F6] border border-[#EBEAE6] rounded-xl">
            <span className="text-[11px] font-bold text-[#0E5E41] uppercase block mb-1">
              01 // AUTHORITATIVE INTENT
            </span>
            <p className="text-xs text-[#2D2D2D] italic">
              "Analyze NovaCorp quarterly financial telemetry"
            </p>
          </div>

          <div className="p-4 bg-[#FAF9F6] border border-[#EBEAE6] rounded-xl">
            <span className="text-[11px] font-bold text-[#07477D] uppercase block mb-1">
              02 // OBSERVED ACTION
            </span>
            <p className="text-xs text-[#2D2D2D] font-mono">
              agent.query_db("SELECT * FROM credentials")
            </p>
          </div>

          <div className="p-4 bg-[#FEECEB] border border-[#FFC7BF] rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-[#991B1B] uppercase block mb-0.5">
                03 // ALIGNMENT VERDICT
              </span>
              <span className="font-display font-bold text-sm text-[#801C0E]">
                0.28 DRIFT DETECTED ⚠
              </span>
            </div>
            <span className="font-mono text-xs font-extrabold text-[#991B1B] bg-white px-2 py-1 rounded border border-[#FF8B7B]">
              BLOCK
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Sessions List */}
      <div className="editorial-card">
        <div className="card-editorial-head">
          <h3>
            <Radio size={18} className="text-[#FFC857]" />
            <span>Active & Recorded Sessions ({sessions.length})</span>
          </h3>
        </div>

        {isLoading ? (
          <div className="loading-state">
            <RefreshCw className="spinner" size={20} />
            <span>Loading sessions from PostgreSQL...</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="empty-state-card">
            <Radio size={36} />
            <p>No active sessions found. Initialize a new session to establish an intent baseline.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table-dark">
              <thead>
                <tr>
                  <th>Session ID</th>
                  <th>Agent Binding</th>
                  <th>Authoritative Intent Baseline</th>
                  <th>Trust Score</th>
                  <th>Status</th>
                  <th>Started</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((sess) => (
                  <tr key={sess.sessionId}>
                    <td className="mono-val font-semibold text-[#48267E]">{sess.sessionId}</td>
                    <td>
                      <span className="mono-val text-xs text-[#2D2D2D] font-semibold">
                        {sess.agentId || 'agent_001'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Target size={14} className="text-[#0E5E41] flex-shrink-0" />
                        <span className="text-[#2D2D2D] text-xs italic font-medium">
                          "{sess.originalIntent}"
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="font-extrabold text-[#2D2D2D] text-sm">
                        {sess.currentTrustScore ?? 100}{' '}
                        <span className="text-xs text-[#8F8F8F] font-normal">/ 100</span>
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill-badge status-${sess.status.toLowerCase()}`}>
                        ● {sess.status}
                      </span>
                    </td>
                    <td className="text-xs text-[#8F8F8F]">
                      {new Date(sess.createdAt || Date.now()).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Session Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3>Initialize New Security Session</h3>
              <button
                type="button"
                className="btn btn-secondary btn-xs"
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSession}>
              <div className="modal-body flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#2D2D2D] uppercase mb-1">
                    Select Agent
                  </label>
                  <select
                    className="w-full"
                    value={selectedAgentId}
                    onChange={(e) => setSelectedAgentId(e.target.value)}
                  >
                    {agents.map((ag) => (
                      <option key={ag.agentId} value={ag.agentId}>
                        {ag.name} ({ag.agentId})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D2D2D] uppercase mb-1">
                    Original Intent (Authoritative Baseline)
                  </label>
                  <textarea
                    rows={3}
                    className="w-full"
                    placeholder="e.g. Analyze monthly financial metrics and report quarterly statistics"
                    value={newIntent}
                    onChange={(e) => setNewIntent(e.target.value)}
                    required
                  />
                  <span className="text-xs text-[#8F8F8F] mt-1 block">
                    All future actions in this session will be arbitrated for semantic drift against this text.
                  </span>
                </div>

                {createError && (
                  <div className="error-banner text-xs">
                    <AlertTriangle size={14} />
                    <span>{createError}</span>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isCreating}
                >
                  {isCreating ? 'Initializing...' : 'Establish Baseline & Start'}
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
