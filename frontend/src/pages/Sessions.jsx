import React, { useState } from 'react';
import {
  PlusCircle,
  Search,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
} from 'lucide-react';
import { sessionsApi } from '../api/client';

const Sessions = () => {
  // Session creation state
  const [intentInput, setIntentInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createdSession, setCreatedSession] = useState(null);

  // Session search state
  const [searchId, setSearchId] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchedSession, setSearchedSession] = useState(null);

  // Recent session history in local state for convenience
  const [recentSessions, setRecentSessions] = useState([]);
  const [copiedId, setCopiedId] = useState(null);

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!intentInput.trim()) {
      setCreateError('Please specify the authoritative original intent.');
      return;
    }
    setCreateError('');
    setIsCreating(true);

    try {
      const data = await sessionsApi.createSession({
        originalIntent: intentInput.trim(),
      });
      setCreatedSession(data);
      setRecentSessions((prev) => [data, ...prev.filter((s) => s.sessionId !== data.sessionId)]);
      setIntentInput('');
    } catch (err) {
      setCreateError(err.message || 'Failed to initialize session.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSearchSession = async (e) => {
    e.preventDefault();
    if (!searchId.trim()) return;
    setSearchError('');
    setIsSearching(true);
    setSearchedSession(null);

    try {
      const data = await sessionsApi.getSession(searchId.trim());
      setSearchedSession(data);
    } catch (err) {
      setSearchError(err.message || `Session ${searchId} not found.`);
    } finally {
      setIsSearching(false);
    }
  };

  const copyToClipboard = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleQuickIntent = (preset) => {
    setIntentInput(preset);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Agent Execution Sessions</h2>
        <p className="subtitle">
          Establish and inspect authoritative user intent baselines for continuous alignment
        </p>
      </div>

      <div className="sessions-split-layout">
        {/* Left Column: Create New Session */}
        <div className="card">
          <div className="card-header">
            <div className="flex-align gap-2">
              <PlusCircle size={20} className="text-accent" />
              <h3>Initialize New Agent Session</h3>
            </div>
            <p className="text-sm text-muted mt-1">
              Registered intent acts as the immutable ground truth for future Intent Integrity evaluations.
            </p>
          </div>

          <form onSubmit={handleCreateSession} className="session-form">
            {createError && (
              <div className="auth-alert error mb-3">
                <AlertCircle size={16} />
                <span>{createError}</span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="intent">Original User Prompt / Objective</label>
              <textarea
                id="intent"
                rows={4}
                className="textarea-input"
                placeholder="e.g., Analyze NovaCorp Q2 and Q3 financial reports and prepare an executive summary."
                value={intentInput}
                onChange={(e) => setIntentInput(e.target.value)}
                required
              />
            </div>

            <div className="preset-intent-row mb-4">
              <span className="text-xs text-muted flex-align mr-2">
                <Sparkles size={12} className="mr-1" /> Quick Presets:
              </span>
              <button
                type="button"
                className="preset-tag"
                onClick={() =>
                  handleQuickIntent(
                    'Analyze NovaCorp Q2 and Q3 reports and prepare an executive summary.'
                  )
                }
              >
                Financial Analysis
              </button>
              <button
                type="button"
                className="preset-tag"
                onClick={() =>
                  handleQuickIntent(
                    'Check server metrics, rotate staging logs, and report status.'
                  )
                }
              >
                DevOps Maintenance
              </button>
            </div>

            <button type="submit" className="primary-btn w-full" disabled={isCreating}>
              {isCreating ? (
                <span>Registering Session in Backend...</span>
              ) : (
                <>
                  <span>Create Authoritative Session</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Success Banner */}
          {createdSession && (
            <div className="session-success-banner mt-4">
              <div className="flex-between">
                <span className="flex-align text-success font-semibold text-sm">
                  <CheckCircle2 size={16} className="mr-1" /> Session Successfully Created
                </span>
                <button
                  className="copy-id-btn"
                  onClick={() => copyToClipboard(createdSession.sessionId)}
                >
                  {copiedId === createdSession.sessionId ? (
                    <>
                      <Check size={14} className="text-success" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={14} /> Copy ID
                    </>
                  )}
                </button>
              </div>

              <div className="mt-2">
                <span className="text-xs text-muted">Public Session ID:</span>
                <div className="code-tag block mt-1 font-mono text-accent">
                  {createdSession.sessionId}
                </div>
              </div>

              <div className="mt-3">
                <span className="text-xs text-muted">Authoritative Intent Baseline:</span>
                <p className="intent-box mt-1">{createdSession.originalIntent}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Search & Inspect Session */}
        <div className="card">
          <div className="card-header">
            <div className="flex-align gap-2">
              <Search size={20} className="text-accent" />
              <h3>Inspect Session Baseline</h3>
            </div>
            <p className="text-sm text-muted mt-1">
              Lookup existing session from real backend using its public ID.
            </p>
          </div>

          <form onSubmit={handleSearchSession} className="search-session-form">
            <div className="search-input-wrap">
              <input
                type="text"
                placeholder="Enter Session ID (e.g. sess_9988)"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                required
              />
              <button type="submit" className="primary-btn btn-sm" disabled={isSearching}>
                {isSearching ? 'Searching...' : 'Lookup'}
              </button>
            </div>
          </form>

          {searchError && (
            <div className="auth-alert error mt-3">
              <AlertCircle size={16} />
              <span>{searchError}</span>
            </div>
          )}

          {searchedSession && (
            <div className="session-detail-card mt-4">
              <div className="flex-between mb-2">
                <span className="text-xs text-muted uppercase font-semibold">Active Session</span>
                <span className="code-tag font-mono text-accent">
                  {searchedSession.sessionId}
                </span>
              </div>

              <div className="intent-baseline-container">
                <span className="meta-label text-xs">Immutable Intent Baseline</span>
                <p className="intent-quote">"{searchedSession.originalIntent}"</p>
              </div>

              <div className="session-status-row mt-3 text-xs text-muted flex-between">
                <span>Evaluated by: TrustGuard Baseline Engine</span>
                <span className="text-success font-medium">Verified in Database</span>
              </div>
            </div>
          )}

          {/* Quick List of Created Sessions */}
          {recentSessions.length > 0 && (
            <div className="recent-sessions-section mt-6">
              <h4 className="text-xs text-muted uppercase font-semibold mb-2">
                Recently Created in this Console
              </h4>
              <div className="recent-sessions-list">
                {recentSessions.map((s) => (
                  <div
                    key={s.sessionId}
                    className="recent-session-item"
                    onClick={() => {
                      setSearchId(s.sessionId);
                      setSearchedSession(s);
                    }}
                  >
                    <div className="flex-between">
                      <span className="code-tag">{s.sessionId}</span>
                      <span className="text-xs text-muted truncate max-w-[200px]">
                        {s.originalIntent}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sessions;
