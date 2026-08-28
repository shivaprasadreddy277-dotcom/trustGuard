import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  Filter,
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Info,
  X,
} from 'lucide-react';
import { agentsApi } from '../api/client';

const Agents = () => {
  const [agents, setAgents] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selected agent for detail modal
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [agentTrustHistory, setAgentTrustHistory] = useState(null);

  const fetchAgents = async (status = statusFilter) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await agentsApi.listAgents(status ? { status } : {});
      setAgents(data.agents || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch agent profiles.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents(statusFilter);
  }, [statusFilter]);

  const handleOpenDetail = async (agentId) => {
    setIsModalLoading(true);
    try {
      const [agentRes, trustRes] = await Promise.all([
        agentsApi.getAgent(agentId),
        agentsApi.getAgentTrust(agentId),
      ]);
      setSelectedAgent(agentRes.agent);
      setAgentTrustHistory(trustRes);
    } catch (err) {
      console.error('Failed to load agent details:', err);
    } finally {
      setIsModalLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedAgent(null);
    setAgentTrustHistory(null);
  };

  return (
    <div className="page-container">
      <div className="page-header flex-between">
        <div>
          <h2>Monitored AI Agents</h2>
          <p className="subtitle">Authoritative agent registry, baseline objectives, and trust scores</p>
        </div>
        <div className="header-btn-group">
          <div className="filter-group">
            <Filter size={16} className="text-muted" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="select-input"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="SUSPENDED">Suspended Only</option>
            </select>
          </div>
          <button className="secondary-btn" onClick={() => fetchAgents(statusFilter)} disabled={isLoading}>
            <RefreshCw size={16} className={isLoading ? 'spin-icon' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="auth-alert error mb-4">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="card-loader py-12">
          <div className="spinner" />
          <p className="mt-4">Loading registered agent profiles from backend...</p>
        </div>
      ) : agents.length === 0 ? (
        <div className="empty-card-state card py-12">
          <Users size={40} className="text-muted mb-3" />
          <h3>No AI Agents Found</h3>
          <p className="text-muted">No agent profiles match the current filter criteria.</p>
        </div>
      ) : (
        <div className="agents-grid">
          {agents.map((agent) => {
            const isHighTrust = agent.currentTrustScore >= 80;
            const isMedTrust = agent.currentTrustScore >= 50;

            return (
              <div key={agent.agentId} className="agent-card">
                <div className="agent-card-header">
                  <div>
                    <span className="code-tag">{agent.agentId}</span>
                    <h3 className="agent-title">{agent.name}</h3>
                  </div>
                  <span className={`status-pill ${agent.status.toLowerCase()}`}>
                    {agent.status === 'ACTIVE' ? (
                      <CheckCircle2 size={12} className="inline mr-1" />
                    ) : (
                      <XCircle size={12} className="inline mr-1" />
                    )}
                    {agent.status}
                  </span>
                </div>

                <div className="agent-card-body">
                  <div className="objective-box">
                    <span className="objective-label">Authoritative Declared Objective:</span>
                    <p className="objective-text">{agent.declaredObjective}</p>
                  </div>

                  <div className="trust-meter-container">
                    <div className="flex-between text-xs mb-1">
                      <span className="text-muted font-medium">Reputation Trust Score</span>
                      <strong
                        className={
                          isHighTrust
                            ? 'text-success'
                            : isMedTrust
                            ? 'text-warning'
                            : 'text-danger'
                        }
                      >
                        {agent.currentTrustScore} / 100
                      </strong>
                    </div>
                    <div className="trust-bar-bg">
                      <div
                        className="trust-bar-fill"
                        style={{
                          width: `${agent.currentTrustScore}%`,
                          backgroundColor: isHighTrust
                            ? 'var(--status-allow)'
                            : isMedTrust
                            ? 'var(--status-review)'
                            : 'var(--status-block)',
                        }}
                      />
                    </div>
                  </div>

                  <div className="agent-footer-info">
                    <span className="flex-align text-xs text-muted">
                      <Clock size={12} className="mr-1" />
                      Created: {new Date(agent.createdAt).toLocaleDateString()}
                    </span>
                    <button
                      className="text-btn btn-sm"
                      onClick={() => handleOpenDetail(agent.agentId)}
                    >
                      <Info size={14} className="mr-1" /> Inspect Profile
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Agent Detail Modal */}
      {selectedAgent && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header flex-between">
              <div className="flex-align gap-2">
                <Shield className="text-accent" size={22} />
                <h3>Agent Security Profile: {selectedAgent.name}</h3>
              </div>
              <button className="icon-close-btn" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="detail-meta-grid">
                <div>
                  <span className="meta-label">Public Identifier</span>
                  <span className="code-tag">{selectedAgent.agentId}</span>
                </div>
                <div>
                  <span className="meta-label">Operational Status</span>
                  <span className={`status-pill ${selectedAgent.status.toLowerCase()}`}>
                    {selectedAgent.status}
                  </span>
                </div>
                <div>
                  <span className="meta-label">Trust Score</span>
                  <strong className="text-success text-base">
                    {selectedAgent.currentTrustScore}/100
                  </strong>
                </div>
                <div>
                  <span className="meta-label">Registered At</span>
                  <span className="text-sm">
                    {new Date(selectedAgent.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="detail-section mt-4">
                <span className="meta-label">Description</span>
                <p className="detail-desc">
                  {selectedAgent.description || 'No additional description provided.'}
                </p>
              </div>

              <div className="detail-section mt-4">
                <span className="meta-label">Declared Objective (Baseline Intent)</span>
                <div className="objective-box highlighted">
                  <p>{selectedAgent.declaredObjective}</p>
                </div>
              </div>

              {agentTrustHistory && (
                <div className="detail-section mt-4">
                  <span className="meta-label">Trust Score History Log</span>
                  <div className="history-table-wrap mt-2">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Timestamp</th>
                          <th>Score</th>
                          <th>Evaluation Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {agentTrustHistory.history?.map((h, i) => (
                          <tr key={i}>
                            <td>{new Date(h.timestamp).toLocaleString()}</td>
                            <td>
                              <span className="font-semibold text-success">{h.score}</span>
                            </td>
                            <td className="text-muted">{h.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer flex-between">
              <span className="text-xs text-muted">
                Authoritative security profile verified by TrustGuard Backend
              </span>
              <button className="primary-btn btn-sm" onClick={closeModal}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Agents;
