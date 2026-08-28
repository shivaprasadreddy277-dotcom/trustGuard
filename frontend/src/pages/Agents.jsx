import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Key,
  Target,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { agentsApi } from '../api/client';

const Agents = () => {
  const [agents, setAgents] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAgents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await agentsApi.listAgents(statusFilter !== 'ALL' ? statusFilter : undefined);
      setAgents(res.agents || []);
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

  const featuredAgent = filteredAgents[0] || agents[0];
  const otherAgents = filteredAgents.slice(1);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-slate-800 bg-[#FFF5DD] px-2.5 py-0.5 rounded-full border border-[#FFE29E]">
              ★ FLEET DIRECTORY
            </span>
            <span className="text-xs text-[#8F8F8F] font-mono">// Living Agent Identities</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-[#2D2D2D]">
            Monitored AI Agent Fleet
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-1">
            Every AI agent identity has an authoritative permission registry, declared baseline objective, and dynamic reputation score.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={fetchAgents}
          disabled={isLoading}
        >
          <RefreshCw size={14} className={isLoading ? 'spinner' : ''} />
          <span>Refresh Fleet</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="chains-filter-bar">
        <div className="filter-search-box">
          <Search size={16} className="text-[#8F8F8F]" />
          <input
            type="text"
            placeholder="Search by agent name, ID, or declared objective..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={15} className="text-[#8F8F8F]" />
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

      {error && (
        <div className="error-banner">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="loading-state">
          <RefreshCw className="spinner" size={22} />
          <span>Loading agent fleet from PostgreSQL...</span>
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="empty-state-card">
          <Users size={36} />
          <p>No agents matching your filter criteria.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Featured Agent Spotlight */}
          {featuredAgent && (
            <div className="editorial-card border-2 border-[#2D2D2D] relative overflow-hidden bg-gradient-to-br from-white to-[#FFFDF8]">
              <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#FFF5DD] border-2 border-[#2D2D2D] text-[#2D2D2D] font-display font-extrabold text-lg flex items-center justify-center shadow-[2px_2px_0px_#2D2D2D]">
                    01
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-xl font-bold text-[#2D2D2D]">
                        {featuredAgent.name}
                      </h2>
                      <span className="font-mono text-xs font-bold text-[#48267E] bg-[#F4EFFF] px-2 py-0.5 rounded border border-[#DFD0F7]">
                        {featuredAgent.agentId}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#8F8F8F] font-mono">
                      PRIMARY MONITORED AGENT // FLEET SPOTLIGHT
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] text-[#8F8F8F] block font-bold uppercase tracking-wider">
                      Trust Score
                    </span>
                    <span className="font-display text-2xl font-extrabold text-[#2D2D2D]">
                      {featuredAgent.currentTrustScore}{' '}
                      <span className="text-xs font-normal text-[#8F8F8F]">/ 100</span>
                    </span>
                  </div>
                  <span className={`status-pill-badge status-${featuredAgent.status.toLowerCase()}`}>
                    ● {featuredAgent.status}
                  </span>
                </div>
              </div>

              {/* Declared Baseline Objective */}
              <div className="p-4 bg-[#FAF9F6] border border-[#EBEAE6] rounded-xl mb-4">
                <div className="flex items-center gap-2 text-xs font-bold text-[#2D2D2D] uppercase mb-1">
                  <Target size={14} className="text-[#6A4D00]" />
                  <span>Authoritative Declared Objective</span>
                </div>
                <p className="text-sm text-[#334155] italic">
                  "{featuredAgent.declaredObjective || 'No objective recorded'}"
                </p>
              </div>

              {/* Authoritative Permissions Chips */}
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-[#6B6B6B] uppercase mb-2">
                  <Key size={13} />
                  <span>Authoritative Registered Permissions:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {featuredAgent.permissions && featuredAgent.permissions.length > 0 ? (
                    featuredAgent.permissions.map((p) => (
                      <span
                        key={p}
                        className="font-mono text-xs font-bold text-[#0E5E41] bg-[#EEFAF4] px-2.5 py-1 rounded-lg border border-[#C8F2E2]"
                      >
                        ✓ {p}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-[#8F8F8F]">No permissions registered</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Surrounding Fleet Cards */}
          {otherAgents.length > 0 && (
            <div>
              <h3 className="font-display text-sm font-bold text-[#2D2D2D] uppercase tracking-wider mb-3">
                Other Registered Agents ({otherAgents.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {otherAgents.map((ag) => (
                  <div
                    key={ag.agentId}
                    className="editorial-card p-5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm text-[#2D2D2D]">{ag.name}</span>
                        <span className={`status-pill-badge status-${ag.status.toLowerCase()}`}>
                          ● {ag.status}
                        </span>
                      </div>
                      <span className="font-mono text-xs font-semibold text-[#48267E] bg-[#F4EFFF] px-1.5 py-0.5 rounded border border-[#DFD0F7] inline-block mb-2">
                        {ag.agentId}
                      </span>
                      <p className="text-xs text-[#6B6B6B] line-clamp-2 italic mb-3">
                        "{ag.declaredObjective}"
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[#EBEAE6] flex items-center justify-between">
                      <span className="text-xs text-[#8F8F8F] font-semibold">Trust Reputation</span>
                      <span
                        className={`text-sm font-bold ${
                          ag.currentTrustScore >= 80 ? 'text-[#0E5E41]' : 'text-[#92400E]'
                        }`}
                      >
                        {ag.currentTrustScore} / 100
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Agents;
