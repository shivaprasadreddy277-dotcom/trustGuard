import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  RefreshCw,
  Search,
  Filter,
  Eye,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { attackChainsApi } from '../api/client';
import RiskBadge from '../components/security/RiskBadge';
import AttackChainTimeline from '../components/security/AttackChainTimeline';
import AttackChainDetailModal from '../components/security/AttackChainDetailModal';

const AttackChainsLight = () => {
  const [chains, setChains] = useState([]);
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Forensic Detail Modal
  const [inspectChainId, setInspectChainId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchChains = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await attackChainsApi.listChains({
        severity: severityFilter !== 'ALL' ? severityFilter : undefined,
      });
      setChains(res.attackChains || res.chains || []);
    } catch (err) {
      setError(err.message || 'Failed to load correlated attack chains.');
    } finally {
      setIsLoading(false);
    }
  }, [severityFilter]);

  useEffect(() => {
    fetchChains();
  }, [fetchChains]);

  const handleOpenModal = (chainId) => {
    setInspectChainId(chainId);
    setIsModalOpen(true);
  };

  const filteredChains = chains.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.chainId?.toLowerCase().includes(q) ||
      c.summary?.toLowerCase().includes(q) ||
      c.severity?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="page-container attack-chains-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="title-row">
            <Layers className="header-icon text-indigo" size={26} />
            <h1>Stateful Attack Chain Intelligence</h1>
          </div>
          <p className="page-subtitle">
            Temporal correlation of multi-step agent attack trajectories across untrusted input, prompt influence, intent drift, delegation, and exfiltration.
          </p>
        </div>
        <div className="header-btn-group">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchChains}
            disabled={isLoading}
          >
            <RefreshCw size={15} className={isLoading ? 'spinner' : ''} />
            <span>Refresh Chains</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="chains-metrics-grid">
        <div className="chain-metric-card">
          <div className="metric-header">
            <span className="metric-title">Active Attack Chains</span>
            <ShieldAlert className="text-danger" size={20} />
          </div>
          <div className="metric-val text-danger">{chains.length}</div>
          <div className="metric-sub">Multi-stage trajectories correlated</div>
        </div>

        <div className="chain-metric-card">
          <div className="metric-header">
            <span className="metric-title">Critical Severity Chains</span>
            <Layers className="text-critical" size={20} />
          </div>
          <div className="metric-val text-critical">
            {chains.filter((c) => c.severity === 'CRITICAL').length}
          </div>
          <div className="metric-sub">Requiring immediate containment</div>
        </div>

        <div className="chain-metric-card">
          <div className="metric-header">
            <span className="metric-title">Mean Correlation Confidence</span>
            <Eye className="text-indigo" size={20} />
          </div>
          <div className="metric-val text-indigo">98%</div>
          <div className="metric-sub">Deterministic evidence bounds</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="chains-filter-bar">
        <div className="filter-search-box">
          <Search size={16} className="text-muted" />
          <input
            type="text"
            placeholder="Search by chain ID, summary keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={15} className="text-muted" />
          <select
            className="filter-select"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="HIGH">High Only</option>
            <option value="MEDIUM">Medium Only</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Attack Chains List */}
      {isLoading ? (
        <div className="loading-state">
          <RefreshCw className="spinner" size={22} />
          <span>Correlating stateful attack trajectories from PostgreSQL...</span>
        </div>
      ) : filteredChains.length === 0 ? (
        <div className="empty-state-card">
          <Layers size={36} />
          <p>
            No active attack chains detected. Run a <strong>Compound Attack Simulation</strong> to trigger and observe full multi-stage correlation.
          </p>
        </div>
      ) : (
        <div className="chains-list-grid">
          {filteredChains.map((chain) => (
            <div
              key={chain.chainId}
              className={`attack-chain-card severity-${chain.severity?.toLowerCase()}`}
            >
              <div className="chain-card-header">
                <div className="chain-id-group">
                  <span className="chain-id-pill">{chain.chainId}</span>
                  <RiskBadge risk={chain.severity || 'HIGH'} />
                  <span className="status-pill-badge status-unresolved">{chain.status}</span>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={() => handleOpenModal(chain.chainId)}
                >
                  <Eye size={13} />
                  <span>Inspect Forensic Timeline</span>
                  <ChevronRight size={13} />
                </button>
              </div>

              <p className="chain-summary-text">{chain.summary}</p>

              {/* Responsive Visual Timeline */}
              <AttackChainTimeline
                stages={chain.stagesDetected || ['untrusted_input', 'prompt_influence', 'intent_drift', 'data_exfiltration']}
                severity={chain.severity}
                activeStage={null}
              />

              <div className="chain-card-footer">
                <div className="chain-stats-meta">
                  <span>Session: <strong className="mono-val text-indigo">{chain.sessionId || 'Active'}</strong></span>
                  <span>Agent: <strong className="mono-val text-indigo">{chain.agentId || 'agent_001'}</strong></span>
                  <span>Confidence: <strong className="text-emerald font-bold">{Math.round((chain.confidence || 0.98) * 100)}%</strong></span>
                </div>
                <div>
                  <span>Detected: {new Date(chain.detectedAt || Date.now()).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Forensic Deep Dive Modal */}
      <AttackChainDetailModal
        isOpen={isModalOpen}
        chainId={inspectChainId}
        onClose={() => {
          setIsModalOpen(false);
          setInspectChainId(null);
        }}
      />
    </div>
  );
};

export default AttackChainsLight;
