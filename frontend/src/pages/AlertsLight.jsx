import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  RefreshCw,
  Search,
  Filter,
  Eye,
  AlertTriangle,
  ShieldAlert,
  Layers,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { alertsApi } from '../api/client';
import RiskBadge from '../components/security/RiskBadge';
import AttackChainDetailModal from '../components/security/AttackChainDetailModal';

const AlertsLight = () => {
  const [alerts, setAlerts] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Attack Chain Detail Modal
  const [selectedChainId, setSelectedChainId] = useState(null);
  const [isChainModalOpen, setIsChainModalOpen] = useState(false);

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await alertsApi.listAlerts({
        resolved: statusFilter === 'RESOLVED' ? true : statusFilter === 'UNRESOLVED' ? false : undefined,
        limit: 50,
      });
      setAlerts(res.alerts || []);
    } catch (err) {
      setError(err.message || 'Failed to load security alerts.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleOpenChain = (chainId) => {
    if (!chainId) return;
    setSelectedChainId(chainId);
    setIsChainModalOpen(true);
  };

  const filteredAlerts = alerts.filter((al) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      al.alertId?.toLowerCase().includes(q) ||
      al.title?.toLowerCase().includes(q) ||
      al.description?.toLowerCase().includes(q) ||
      al.severity?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="title-row">
            <Bell className="header-icon text-indigo" size={26} />
            <h1>Security Alert Center</h1>
          </div>
          <p className="page-subtitle">
            Authoritative multi-engine anomaly alerts, critical policy violation notifications, and correlated attack chain incidents.
          </p>
        </div>
        <div className="header-btn-group">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchAlerts}
            disabled={isLoading}
          >
            <RefreshCw size={15} className={isLoading ? 'spinner' : ''} />
            <span>Refresh Alerts</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Total Security Alerts</span>
            <Bell className="stat-icon text-indigo" size={20} />
          </div>
          <div className="stat-value">{alerts.length}</div>
          <div className="stat-desc">Security events requiring operator attention</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Critical Severity</span>
            <ShieldAlert className="stat-icon text-critical" size={20} />
          </div>
          <div className="stat-value text-critical">
            {alerts.filter((a) => a.severity === 'CRITICAL').length}
          </div>
          <div className="stat-desc">Correlated multi-stage attack chains</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Unresolved Incidents</span>
            <AlertTriangle className="stat-icon text-warning" size={20} />
          </div>
          <div className="stat-value text-warning">
            {alerts.filter((a) => a.status === 'UNRESOLVED').length}
          </div>
          <div className="stat-desc">Active containment queue</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="section-block">
        <div className="chains-filter-bar">
          <div className="filter-search-box">
            <Search size={16} className="text-muted" />
            <input
              type="text"
              placeholder="Search by alert ID, title, description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={15} className="text-muted" />
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Alerts</option>
              <option value="UNRESOLVED">Unresolved Only</option>
              <option value="RESOLVED">Resolved Only</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Alerts Table */}
      <div className="section-block">
        <div className="section-title-wrap mb-3">
          <h3>Incident Alerts Queue ({filteredAlerts.length})</h3>
        </div>

        {isLoading ? (
          <div className="loading-state">
            <RefreshCw className="spinner" size={20} />
            <span>Loading security alerts from PostgreSQL...</span>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="empty-state-card">
            <CheckCircle2 size={36} className="text-emerald mx-auto" />
            <p>No unresolved security alerts. All agent activities are within policy parameters.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table-dark">
              <thead>
                <tr>
                  <th>Alert ID</th>
                  <th>Severity</th>
                  <th>Incident Type</th>
                  <th>Summary & Description</th>
                  <th>Attack Chain</th>
                  <th>Status</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.map((al) => (
                  <tr key={al.alertId}>
                    <td className="mono-val font-semibold text-indigo">{al.alertId}</td>
                    <td>
                      <RiskBadge risk={al.severity || 'HIGH'} />
                    </td>
                    <td>
                      <span className="font-semibold text-xs text-slate-800">{al.type}</span>
                    </td>
                    <td>
                      <div>
                        <div className="font-bold text-xs text-slate-900">{al.title}</div>
                        <div className="text-xs text-slate-600 mt-0.5">{al.description}</div>
                      </div>
                    </td>
                    <td>
                      {al.chainId ? (
                        <button
                          type="button"
                          className="btn-link text-xs font-bold text-critical"
                          onClick={() => handleOpenChain(al.chainId)}
                        >
                          {al.chainId}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">None</span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`status-pill-badge ${
                          al.status === 'RESOLVED' ? 'status-resolved' : 'status-unresolved'
                        }`}
                      >
                        {al.status}
                      </span>
                    </td>
                    <td className="text-xs text-slate-500">
                      {new Date(al.createdAt || Date.now()).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Attack Chain Modal */}
      <AttackChainDetailModal
        isOpen={isChainModalOpen}
        chainId={selectedChainId}
        onClose={() => {
          setIsChainModalOpen(false);
          setSelectedChainId(null);
        }}
      />
    </div>
  );
};

export default AlertsLight;
