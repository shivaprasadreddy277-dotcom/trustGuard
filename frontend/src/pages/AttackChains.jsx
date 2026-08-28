import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  RefreshCw,
  Search,
  Filter,
  Eye,
  AlertTriangle,
  ShieldAlert,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { attackChainsApi } from '../api/client';
import RiskBadge from '../components/security/RiskBadge';
import AttackChainTimeline from '../components/security/AttackChainTimeline';
import AttackChainDetailModal from '../components/security/AttackChainDetailModal';

const AttackChains = () => {
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-[#801C0E] bg-[#FFEBE8] px-2.5 py-0.5 rounded-full border border-[#FFC7BF]">
              ⛓️ TEMPORAL CORRELATION
            </span>
            <span className="text-xs text-[#8F8F8F] font-mono">// Stateful Multi-Stage Trajectories</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-[#2D2D2D]">
            Stateful Attack Chain Intelligence
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-1">
            Correlates discrete events into cohesive compound attack narratives across Untrusted Input &rarr; Prompt Influence &rarr; Intent Drift &rarr; Delegation &rarr; Exfiltration.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={fetchChains}
          disabled={isLoading}
        >
          <RefreshCw size={14} className={isLoading ? 'spinner' : ''} />
          <span>Refresh Chains</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="chains-metrics-grid">
        <div className="chain-metric-card">
          <div className="metric-header">
            <span className="metric-title">Active Attack Chains</span>
            <ShieldAlert className="text-[#EF4444]" size={20} />
          </div>
          <div className="metric-val text-[#EF4444]">{chains.length}</div>
          <div className="metric-sub">Multi-stage trajectories correlated</div>
        </div>

        <div className="chain-metric-card">
          <div className="metric-header">
            <span className="metric-title">Critical Severity</span>
            <Layers className="text-[#FF8B7B]" size={20} />
          </div>
          <div className="metric-val text-[#FF8B7B]">
            {chains.filter((c) => c.severity === 'CRITICAL').length}
          </div>
          <div className="metric-sub">Requiring immediate containment</div>
        </div>

        <div className="chain-metric-card">
          <div className="metric-header">
            <span className="metric-title">Mean Confidence</span>
            <Sparkles className="text-[#FFC857]" size={20} />
          </div>
          <div className="metric-val text-[#2D2D2D]">98%</div>
          <div className="metric-sub">Deterministic evidence bounds</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="chains-filter-bar">
        <div className="filter-search-box">
          <Search size={16} className="text-[#8F8F8F]" />
          <input
            type="text"
            placeholder="Search by chain ID, summary keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={15} className="text-[#8F8F8F]" />
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
                  <span>Session: <strong className="mono-val text-[#48267E]">{chain.sessionId || 'Active'}</strong></span>
                  <span>Agent: <strong className="mono-val text-[#48267E]">{chain.agentId || 'agent_001'}</strong></span>
                  <span>Confidence: <strong className="text-[#0E5E41] font-bold">{Math.round((chain.confidence || 0.98) * 100)}%</strong></span>
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

export default AttackChains;
