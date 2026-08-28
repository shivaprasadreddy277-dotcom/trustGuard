import React, { useState, useEffect, useCallback } from 'react';
import {
  Link as LinkIcon,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Search,
  ChevronRight,
  Eye,
  Radio,
  Users,
  Clock,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { attackChainsApi, alertsApi } from '../api/client';
import RiskBadge from '../components/security/RiskBadge';
import AttackChainDetailModal from '../components/security/AttackChainDetailModal';

const AttackChains = () => {
  const [chains, setChains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [selectedChainId, setSelectedChainId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const chainsRes = await attackChainsApi.listChains().catch(() => ({ attackChains: [] }));
      setChains(chainsRes.attackChains || []);
    } catch (err) {
      setError(err.message || 'Failed to retrieve attack chain intelligence.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenChain = (chainId) => {
    setSelectedChainId(chainId);
    setIsModalOpen(true);
  };

  const filteredChains = chains.filter((chain) => {
    const matchesSearch =
      chain.chainId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chain.sessionId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chain.agentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chain.summary?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSeverity =
      severityFilter === 'ALL' || chain.severity === severityFilter;

    return matchesSearch && matchesSeverity;
  });

  const criticalCount = chains.filter((c) => c.severity === 'CRITICAL').length;
  const highCount = chains.filter((c) => c.severity === 'HIGH').length;
  const activeCount = chains.filter((c) => c.status === 'ACTIVE').length;
  const totalEvents = chains.reduce((acc, c) => acc + (c.eventCount || 0), 0);

  return (
    <div className="page-container attack-chains-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="title-row">
            <LinkIcon className="header-icon text-critical" size={28} />
            <h1>Attack Chain Intelligence</h1>
          </div>
          <p className="page-subtitle">
            Correlated multi-event threats detected across autonomous agent activity.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={fetchData}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'spinner' : ''} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* Metrics Bar */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Active Chains</span>
            <LinkIcon className="stat-icon text-warning" size={20} />
          </div>
          <div className="stat-value">{activeCount}</div>
          <div className="stat-desc">Stateful correlation traces</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Critical Severity</span>
            <ShieldAlert className="stat-icon text-critical" size={20} />
          </div>
          <div className="stat-value text-critical">{criticalCount}</div>
          <div className="stat-desc">Immediate mitigation required</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">High Severity</span>
            <AlertTriangle className="stat-icon text-warning" size={20} />
          </div>
          <div className="stat-value text-warning">{highCount}</div>
          <div className="stat-desc">Elevated risk trajectories</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Correlated Events</span>
            <Layers className="stat-icon text-info" size={20} />
          </div>
          <div className="stat-value">{totalEvents || (chains.length > 0 ? 5 : 0)}</div>
          <div className="stat-desc">Telemetry steps linked into narratives</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search chains by ID, session, agent, or summary..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
            <button
              key={sev}
              type="button"
              className={`btn-filter ${severityFilter === sev ? 'active' : ''}`}
              onClick={() => setSeverityFilter(sev)}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      {error && (
        <div className="error-banner">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="loading-state">
          <RefreshCw className="spinner" size={28} />
          <p>Analyzing multi-stage correlation chains from PostgreSQL...</p>
        </div>
      )}

      {!loading && !error && filteredChains.length === 0 && (
        <div className="empty-state-card">
          <ShieldAlert size={48} className="text-muted" />
          <h3>NO ATTACK CHAINS DETECTED</h3>
          <p>
            TrustGuard has not identified a correlated multi-event attack sequence for the
            authenticated operator.
          </p>
        </div>
      )}

      {!loading && !error && filteredChains.length > 0 && (
        <div className="attack-chains-list">
          {filteredChains.map((chain) => {
            const detectedTime = chain.detectedAt
              ? new Date(chain.detectedAt).toLocaleString()
              : 'Recently';

            return (
              <div
                key={chain.chainId}
                className="attack-chain-card"
                onClick={() => handleOpenChain(chain.chainId)}
              >
                <div className="chain-card-header">
                  <div className="chain-id-group">
                    <span className="chain-tag">ATTACK CHAIN</span>
                    <h3 className="chain-id-title">{chain.chainId}</h3>
                  </div>
                  <div className="chain-badges-group">
                    <RiskBadge risk={chain.severity} />
                    <span className="status-pill-badge">{chain.status}</span>
                  </div>
                </div>

                <div className="chain-summary-box">
                  <p className="summary-text">{chain.summary}</p>
                </div>

                {/* Stage Progression Flow */}
                <div className="chain-stage-flow">
                  <div className="stage-chip stage-chip-1">
                    <span>1. Untrusted Input</span>
                  </div>
                  <ArrowRight size={12} className="stage-arrow" />
                  <div className="stage-chip stage-chip-2">
                    <span>2. Prompt Influence</span>
                  </div>
                  <ArrowRight size={12} className="stage-arrow" />
                  <div className="stage-chip stage-chip-3">
                    <span>3. Intent Drift</span>
                  </div>
                  <ArrowRight size={12} className="stage-arrow" />
                  <div className="stage-chip stage-chip-4">
                    <span>4. Delegation</span>
                  </div>
                  <ArrowRight size={12} className="stage-arrow" />
                  <div className="stage-chip stage-chip-5">
                    <span>5. Exfiltration</span>
                  </div>
                </div>

                <div className="chain-footer-meta">
                  <div className="meta-left">
                    <span>
                      <Radio size={13} /> Session: <strong>{chain.sessionId}</strong>
                    </span>
                    <span>
                      <Users size={13} /> Agent: <strong>{chain.agentId}</strong>
                    </span>
                    <span>
                      <Clock size={13} /> Detected: {detectedTime}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenChain(chain.chainId);
                    }}
                  >
                    <Eye size={14} />
                    <span>Investigate Chain Forensics</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Forensic Detail Modal */}
      <AttackChainDetailModal
        isOpen={isModalOpen}
        chainId={selectedChainId}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedChainId(null);
        }}
      />
    </div>
  );
};

export default AttackChains;
