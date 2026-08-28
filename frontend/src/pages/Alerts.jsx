import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  Users,
  Link as LinkIcon,
  ChevronRight,
} from 'lucide-react';
import { alertsApi } from '../api/client';
import RiskBadge from '../components/security/RiskBadge';
import AttackChainDetailModal from '../components/security/AttackChainDetailModal';

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'UNRESOLVED' | 'RESOLVED'
  const [selectedChainId, setSelectedChainId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await alertsApi.listAlerts();
      setAlerts(data.alerts || []);
    } catch (err) {
      setError(err.message || 'Failed to retrieve security alerts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const filteredAlerts = alerts.filter((al) => {
    const matchesSearch =
      al.alertId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      al.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      al.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      al.agentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      al.chainId?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSeverity =
      severityFilter === 'ALL' || al.severity === severityFilter;

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'RESOLVED' && al.resolved) ||
      (statusFilter === 'UNRESOLVED' && !al.resolved);

    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL').length;
  const highCount = alerts.filter((a) => a.severity === 'HIGH').length;
  const openCount = alerts.filter((a) => !a.resolved).length;

  return (
    <div className="page-container alerts-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="title-row">
            <Bell className="header-icon text-warning" size={28} />
            <h1>Security Threat Alerts</h1>
          </div>
          <p className="page-subtitle">
            Real-time security notifications triggered by correlated multi-event threats.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={fetchAlerts}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'spinner' : ''} />
          <span>Refresh Alerts</span>
        </button>
      </div>

      {/* Metrics Bar */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Open Alerts</span>
            <Bell className="stat-icon text-warning" size={20} />
          </div>
          <div className="stat-value">{openCount}</div>
          <div className="stat-desc">Requiring analyst review</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Critical Alerts</span>
            <ShieldAlert className="stat-icon text-critical" size={20} />
          </div>
          <div className="stat-value text-critical">{criticalCount}</div>
          <div className="stat-desc">Immediate action required</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">High Alerts</span>
            <AlertTriangle className="stat-icon text-warning" size={20} />
          </div>
          <div className="stat-value text-warning">{highCount}</div>
          <div className="stat-desc">Elevated risk anomalies</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Total Active</span>
            <CheckCircle2 className="stat-icon text-success" size={20} />
          </div>
          <div className="stat-value">{alerts.length}</div>
          <div className="stat-desc">Alert records in database</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search alerts by ID, agent, title, or message..."
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

        <div className="filter-group ml-2">
          {[
            { id: 'ALL', label: 'All Statuses' },
            { id: 'UNRESOLVED', label: 'Open' },
            { id: 'RESOLVED', label: 'Resolved' },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              className={`btn-filter ${statusFilter === st.id ? 'active' : ''}`}
              onClick={() => setStatusFilter(st.id)}
            >
              {st.label}
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
          <p>Loading authoritative threat alerts from PostgreSQL...</p>
        </div>
      )}

      {!loading && !error && filteredAlerts.length === 0 && (
        <div className="empty-state-card">
          <CheckCircle2 size={48} className="text-success" />
          <h3>NO ACTIVE SECURITY ALERTS</h3>
          <p>All monitored agents and execution sessions are operating within expected baselines.</p>
        </div>
      )}

      {!loading && !error && filteredAlerts.length > 0 && (
        <div className="alerts-list-grid">
          {filteredAlerts.map((al) => {
            const timeStr = al.timestamp
              ? new Date(al.timestamp).toLocaleString()
              : 'Recently';

            return (
              <div key={al.alertId} className="alert-card-item">
                <div className="alert-card-top">
                  <div className="alert-id-wrap">
                    <span className="alert-tag">ALERT</span>
                    <span className="alert-id-text">{al.alertId}</span>
                    <span className="alert-type-badge">{al.type}</span>
                  </div>
                  <div className="alert-badges">
                    <RiskBadge risk={al.severity} />
                    <span
                      className={`status-pill-badge ${al.resolved ? 'status-resolved' : 'status-open'}`}
                    >
                      {al.resolved ? 'RESOLVED' : 'UNRESOLVED'}
                    </span>
                  </div>
                </div>

                <div className="alert-body">
                  <h3 className="alert-title">{al.title || 'Security Incident Detected'}</h3>
                  <p className="alert-message">{al.message}</p>
                </div>

                <div className="alert-footer">
                  <div className="alert-meta-items">
                    <span>
                      <Users size={13} /> Agent: <strong>{al.agentId}</strong>
                    </span>
                    {al.chainId && (
                      <span>
                        <LinkIcon size={13} /> Chain: <strong>{al.chainId}</strong>
                      </span>
                    )}
                    <span>
                      <Clock size={13} /> {timeStr}
                    </span>
                  </div>

                  {al.chainId && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setSelectedChainId(al.chainId);
                        setIsModalOpen(true);
                      }}
                    >
                      <span>Investigate Chain</span>
                      <ChevronRight size={14} />
                    </button>
                  )}
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

export default Alerts;
