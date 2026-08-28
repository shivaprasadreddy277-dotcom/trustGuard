import React, { useState, useEffect, useCallback } from 'react';
import {
  Radio,
  Plus,
  RefreshCw,
  AlertTriangle,
  Target,
  Activity,
  Shield,
  Clock,
  Compass,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { sessionsApi, agentsApi } from '../api/client';
import TrustScoreMeter from '../components/security/TrustScoreMeter';

const SessionsLight = () => {
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
      <div className="page-header">
        <div>
          <div className="title-row">
            <Radio className="header-icon text-indigo" size={26} />
            <h1>Session & Intent Registry</h1>
          </div>
          <p className="page-subtitle">
            Authoritative session baselines, original declared intent, and dynamic intent drift tracking.
          </p>
        </div>
        <div className="header-btn-group">
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

      {/* Concept Explainer Banner */}
      <div className="section-block bg-slate-50 border-l-4 border-indigo-500">
        <div className="flex items-start gap-3">
          <Compass size={20} className="text-indigo mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Authoritative Baseline vs. Observed Execution
            </h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              TrustGuard requires every agent session to declare an <strong>Original Intent</strong>.
              When agents subsequently ingest untrusted input or execute downstream tools, the
              <strong> 3.3 Intent Integrity Engine</strong> computes semantic drift against this baseline.
            </p>
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
      <div className="section-block">
        <div className="section-title-wrap mb-3">
          <h3>Active & Recorded Sessions ({sessions.length})</h3>
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
                    <td className="mono-val font-semibold text-indigo">{sess.sessionId}</td>
                    <td>
                      <span className="mono-val text-xs text-slate-700 font-medium">
                        {sess.agentId || 'agent_001'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Target size={14} className="text-emerald flex-shrink-0" />
                        <span className="text-slate-800 text-xs italic font-medium">
                          "{sess.originalIntent}"
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="font-extrabold text-slate-900 text-sm">
                        {sess.currentTrustScore ?? 100}{' '}
                        <span className="text-xs text-slate-400 font-normal">/100</span>
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill-badge status-${sess.status.toLowerCase()}`}>
                        {sess.status}
                      </span>
                    </td>
                    <td className="text-xs text-slate-500">
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
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
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
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
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
                  <span className="text-xs text-slate-500 mt-1 block">
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

export default SessionsLight;
