import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Shield,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Activity,
  Layers,
} from 'lucide-react';
import { agentsApi, eventsApi } from '../api/client';
import TrustScoreMeter from '../components/security/TrustScoreMeter';

const AgentsLight = () => {
  const [agents, setAgents] = useState([]);
  const [events, setEvents] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAgents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [agentsRes, eventsRes] = await Promise.allSettled([
        agentsApi.listAgents(statusFilter !== 'ALL' ? statusFilter : undefined),
        eventsApi.listEvents({ limit: 100 }),
      ]);

      const rawAgents = agentsRes.status === 'fulfilled' ? agentsRes.value.agents || [] : [];
      const rawEvents = eventsRes.status === 'fulfilled' ? eventsRes.value.events || [] : [];

      setAgents(rawAgents);
      setEvents(rawEvents);
    } catch (err) {
      setError(err.message || 'Failed to load agent fleet.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const filteredAgents = agents.filter((ag) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      ag.name?.toLowerCase().includes(q) ||
      ag.agentId?.toLowerCase().includes(q) ||
      ag.declaredObjective?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="title-row">
            <Users className="header-icon text-indigo" size={26} />
            <h1>Monitored Agent Fleet</h1>
          </div>
          <p className="page-subtitle">
            Autonomous agent identities, permission registries, declared objectives, and living trust reputations.
          </p>
        </div>
        <div className="header-btn-group">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchAgents}
            disabled={isLoading}
          >
            <RefreshCw size={15} className={isLoading ? 'spinner' : ''} />
            <span>Refresh Fleet</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Total Registered Fleet</span>
            <Users className="stat-icon text-indigo" size={20} />
          </div>
          <div className="stat-value">{agents.length}</div>
          <div className="stat-desc">Identities registered in database</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Active Monitoring</span>
            <CheckCircle2 className="stat-icon text-success" size={20} />
          </div>
          <div className="stat-value text-success">
            {agents.filter((a) => a.status === 'ACTIVE').length}
          </div>
          <div className="stat-desc">Continuously arbitrated</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Average Fleet Trust</span>
            <Shield className="stat-icon text-secondary" size={20} />
          </div>
          <div className="stat-value">
            {agents.length > 0
              ? Math.round(agents.reduce((acc, a) => acc + (a.currentTrustScore || 0), 0) / agents.length)
              : 100}{' '}
            <span className="text-sm font-normal text-muted">/ 100</span>
          </div>
          <div className="stat-desc">Dynamic trust reputation metric</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="section-block">
        <div className="chains-filter-bar">
          <div className="filter-search-box">
            <Search size={16} className="text-muted" />
            <input
              type="text"
              placeholder="Search agent name, ID, or declared objective..."
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
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="SUSPENDED">Suspended Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="error-banner">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Agents Fleet Grid */}
      {isLoading ? (
        <div className="loading-state">
          <RefreshCw className="spinner" size={22} />
          <span>Querying agent fleet from PostgreSQL...</span>
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="empty-state-card">
          <Users size={36} />
          <p>No agents matching your filter criteria.</p>
        </div>
      ) : (
        <div className="scenarios-cards-grid">
          {filteredAgents.map((ag) => {
            const agEvents = events.filter((e) => e.agentId === ag.agentId);
            const trustState =
              ag.currentTrustScore >= 80
                ? 'TRUSTED'
                : ag.currentTrustScore >= 50
                ? 'SUSPICIOUS'
                : 'DEGRADED';

            return (
              <div key={ag.agentId} className="stat-card">
                <div className="flex-between mb-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{ag.name}</h3>
                    <span className="mono-val text-xs text-indigo font-semibold">{ag.agentId}</span>
                  </div>
                  <span className={`status-pill-badge status-${ag.status.toLowerCase()}`}>
                    {ag.status}
                  </span>
                </div>

                <div className="my-2 p-2 bg-slate-50 border border-slate-200 rounded">
                  <span className="text-xs font-semibold text-slate-500 block mb-1">
                    Declared Objective:
                  </span>
                  <p className="text-xs text-slate-700 italic">
                    "{ag.declaredObjective || 'No objective recorded'}"
                  </p>
                </div>

                <div className="my-2">
                  <span className="text-xs font-semibold text-slate-500 block mb-1">
                    Authoritative Permissions:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {ag.permissions && ag.permissions.length > 0 ? (
                      ag.permissions.map((p) => (
                        <span key={p} className="policy-chip text-xs">
                          {p}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">No permissions registered</span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-auto">
                  <div>
                    <span className="text-xs text-slate-500 block">Security State</span>
                    <span
                      className={`text-xs font-bold ${
                        trustState === 'TRUSTED'
                          ? 'text-emerald-700'
                          : trustState === 'SUSPICIOUS'
                          ? 'text-amber-700'
                          : 'text-red-700'
                      }`}
                    >
                      ● {trustState}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500 block">Trust Score</span>
                    <span className="text-base font-extrabold text-slate-900">
                      {ag.currentTrustScore} <span className="text-xs font-normal text-slate-400">/100</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AgentsLight;
