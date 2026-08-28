import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  RefreshCw,
  Search,
  Filter,
  Eye,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { alertsApi } from '../api/client';
import RiskBadge from '../components/security/RiskBadge';
import AttackChainDetailModal from '../components/security/AttackChainDetailModal';

const Alerts = () => {
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-coral bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              INCIDENT QUEUE
            </span>
            <span className="text-xs text-muted">// High Priority Anomaly Triage</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Security Incident Alerts
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Multi-engine anomaly alarms, critical policy violation notifications, and correlated attack chain incidents.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={fetchAlerts}
          disabled={isLoading}
        >
          <RefreshCw size={14} className={isLoading ? 'spinner' : ''} />
          <span>Refresh Alerts</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
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

      {error && (
        <div className="error-banner">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Alerts Grid / List */}
      <div className="editorial-card">
        <div className="card-editorial-head">
          <h3>
            <Bell size={18} className="text-coral" />
            <span>Incident Queue ({filteredAlerts.length})</span>
          </h3>
        </div>

        {isLoading ? (
          <div className="loading-state">
            <RefreshCw className="spinner" size={20} />
            <span>Loading security alerts from PostgreSQL...</span>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="empty-state-card">
            <CheckCircle2 size={36} className="text-emerald-600 mx-auto" />
            <p>No unresolved security alerts. All agent activities are within normal policy parameters.</p>
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
                      <span className="font-bold text-xs text-slate-800">{al.type}</span>
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
                          className="btn-link text-xs font-extrabold text-coral"
                          onClick={() => handleOpenChain(al.chainId)}
                        >
                          {al.chainId} →
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
                        ● {al.status}
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

export default Alerts;
