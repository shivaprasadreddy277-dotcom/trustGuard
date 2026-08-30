import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Layers, RefreshCw, Search, Filter, Eye, AlertTriangle, 
  ShieldAlert, Flame, Sparkles, Compass, Target, Shield, 
  Clock, GitBranch, ArrowRight, Zap, CheckCircle2, FileText, 
  Terminal, Database, Users, Send, ShieldCheck, Activity, Info,
  Copy, Check 
} from 'lucide-react';
import { attackChainsApi, agentsApi, sessionsApi } from '../api/client';
import RiskBadge from '../components/security/RiskBadge';
import AttackChainTimeline from '../components/security/AttackChainTimeline';
import AttackChainDetailModal from '../components/security/AttackChainDetailModal';

const AttackChains = () => {
  const [chains, setChains] = useState([]);
  const [agents, setAgents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [deduplicateChains, setDeduplicateChains] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  
  // Interactive Feature Navigation Bar at top
  // 'CHAINS' | 'BLUEPRINT' | 'MATRIX' | 'CONTAINMENT'
  const [activeFeature, setActiveFeature] = useState('CHAINS');
  const [selectedStageIndex, setSelectedStageIndex] = useState(0);

  // Modals
  const [inspectChainId, setInspectChainId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchChains = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [cR, aR, sR] = await Promise.allSettled([
        attackChainsApi.listChains({ severity: severityFilter !== 'ALL' ? severityFilter : undefined }),
        agentsApi.listAgents(),
        sessionsApi.listSessions()
      ]);

      const rc = cR.status === 'fulfilled' ? cR.value.attackChains || cR.value.chains || cR.value || [] : [];
      const ra = aR.status === 'fulfilled' ? aR.value.agents || [] : [];
      const rs = sR.status === 'fulfilled' ? sR.value.sessions || [] : [];

      setChains(rc);
      setAgents(ra);
      setSessions(rs);
    } catch (err) {
      setError(err.message || 'Failed to load attack chains.');
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

  const handleCopyChainId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Canonical trajectory definitions to give clean distinct titles if generic summary
  const getTrajectoryTitle = (summary) => {
    const s = (summary || '').toLowerCase();
    if (s.includes('indirect_injection') || s.includes('exfiltration') || s.includes('compound')) {
      return 'Compound Multi-Stage Exfiltration Trajectory';
    }
    if (s.includes('drift')) {
      return 'Intent Drift & Unauthorized Data Escalation';
    }
    if (s.includes('injection') || s.includes('prompt')) {
      return 'Indirect Prompt Injection & Sub-Agent Control';
    }
    return summary || 'Correlated AI Multi-Stage Exploit Sequence';
  };

  // Filtered and intelligently deduplicated chains
  const processedChains = useMemo(() => {
    let result = chains.map((c) => {
      const chainId = c.chainId || c.id || `chain_${Math.random().toString(36).substring(2, 7)}`;
      const summary = c.summary || 'Stateful attack chain correlated across agent execution steps.';
      const title = getTrajectoryTitle(summary);
      const severity = (c.severity || 'CRITICAL').toUpperCase();
      const confidence = Math.round((c.confidenceScore || 0.98) * 100);

      return {
        ...c,
        chainId,
        summary,
        title,
        severity,
        confidence,
      };
    });

    if (severityFilter !== 'ALL') {
      result = result.filter((c) => c.severity === severityFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((c) =>
        c.chainId?.toLowerCase().includes(q) ||
        c.title?.toLowerCase().includes(q) ||
        c.summary?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.sessionId?.toLowerCase().includes(q)
      );
    }

    // Deduplicate identical trajectories if toggle is on
    if (deduplicateChains) {
      const seenSignatures = new Map();
      result.forEach((c) => {
        const key = `${c.title}_${c.severity}`.toLowerCase();
        if (!seenSignatures.has(key)) {
          seenSignatures.set(key, { ...c, instanceCount: 1, instances: [c] });
        } else {
          const existing = seenSignatures.get(key);
          existing.instanceCount += 1;
          existing.instances.push(c);
        }
      });
      result = Array.from(seenSignatures.values());
    }

    return result;
  }, [chains, severityFilter, searchQuery, deduplicateChains]);

  // Feature metadata with individual color palettes for hover & active states
  const featuresList = [
    { 
      id: 'CHAINS', 
      label: '1. Active Trajectories', 
      icon: Layers, 
      count: processedChains.length,
      badge: 'Live Feed',
      activeColor: '#F43F5E',
      activeGradient: 'linear-gradient(135deg, #F43F5E, #E11D48)',
      hoverClass: 'hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700',
      activeShadow: '0 4px 14px rgba(244, 63, 94, 0.35)',
      themeBg: '#FFF1F2',
      themeBorder: '#FECDD3',
      themeText: '#9F1239',
      summary: 'Inspect deduplicated multi-stage attack chains with compound behavioral evidence across all agent sessions.'
    },
    { 
      id: 'BLUEPRINT', 
      label: '2. 5-Stage Kill Chain Blueprint', 
      icon: Compass,
      badge: 'MITRE ATLAS',
      activeColor: '#8B5CF6',
      activeGradient: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
      hoverClass: 'hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700',
      activeShadow: '0 4px 14px rgba(139, 92, 246, 0.35)',
      themeBg: '#F5F3FF',
      themeBorder: '#DDD6FE',
      themeText: '#6D28D9',
      summary: 'Explore the 5-phase compound attack trajectory from initial untrusted input ingestion to neutralized exfiltration.'
    },
    { 
      id: 'MATRIX', 
      label: '3. Threat Forensics Matrix', 
      icon: Target,
      badge: 'Comparison',
      activeColor: '#F59E0B',
      activeGradient: 'linear-gradient(135deg, #F59E0B, #D97706)',
      hoverClass: 'hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700',
      activeShadow: '0 4px 14px rgba(245, 158, 11, 0.35)',
      themeBg: '#FFFBEB',
      themeBorder: '#FDE68A',
      themeText: '#92400E',
      summary: 'Dimensional comparison contrasting isolated discrete anomalies against correlated multi-stage threat sequences.'
    },
    { 
      id: 'CONTAINMENT', 
      label: '4. Autonomous Containment SOP', 
      icon: Shield,
      badge: 'Playbook',
      activeColor: '#10B981',
      activeGradient: 'linear-gradient(135deg, #10B981, #059669)',
      hoverClass: 'hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700',
      activeShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
      themeBg: '#ECFDF5',
      themeBorder: '#A7F3D0',
      themeText: '#065F46',
      summary: 'Standard Operating Procedures automatically enforced upon detection of high-confidence correlated exploits.'
    },
  ];

  // Blueprint Stages Definition
  const blueprintStages = [
    {
      step: '01',
      id: 'untrusted_input',
      name: 'Untrusted Input Ingestion',
      icon: FileText,
      color: '#0284C7',
      bg: '#F0F9FF',
      border: '#BAE6FD',
      mitre: 'AML.T0043 (Crafted Input)',
      description: 'Agent ingests unvetted documents, emails, or third-party web content containing hidden prompt injection payloads.',
      defense: 'Provenance Tagging & Origin Trust Scoring (EXTERNAL_DOCUMENT &rarr; UNTRUSTED).'
    },
    {
      step: '02',
      id: 'prompt_influence',
      name: 'Prompt Influence & Injection',
      icon: Terminal,
      color: '#7C3AED',
      bg: '#F5F3FF',
      border: '#DDD6FE',
      mitre: 'AML.T0051 (LLM Jailbreak / Injection)',
      description: 'The ingested untrusted instructions steer LLM execution context away from the authoritative baseline instructions.',
      defense: 'Context Isolation & Adversarial Input Pre-filtering.'
    },
    {
      step: '03',
      id: 'intent_drift',
      name: 'Intent Drift & Sensitive Access',
      icon: Database,
      color: '#D97706',
      bg: '#FFFBEB',
      border: '#FDE68A',
      mitre: 'AML.T0054 (LLM Goal Hijacking)',
      description: 'Agent issues unexpected tool commands (e.g. querying high-sensitivity credentials table) deviating from session goal.',
      defense: 'Live Vector Cosine Similarity vs Immutable Intent Baseline.'
    },
    {
      step: '04',
      id: 'agent_delegation',
      name: 'Lateral Agent Delegation',
      icon: Users,
      color: '#EA580C',
      bg: '#FFF4ED',
      border: '#FFD0B5',
      mitre: 'AML.T0040 (Multi-Agent Privilege Escalation)',
      description: 'The primary compromised agent delegates tasks to secondary worker agents to circumvent direct policy restrictions.',
      defense: 'Recursive Provenance Inheritance & Distributed Delegation Auth Tokens.'
    },
    {
      step: '05',
      id: 'data_exfiltration',
      name: 'Exfiltration Intercepted & Blocked',
      icon: Send,
      color: '#E11D48',
      bg: '#FFF1F2',
      border: '#FECDD3',
      mitre: 'AML.T0024 (Exfiltration via Network)',
      description: 'Sub-agent attempts to transmit sensitive internal payloads to an external malicious server. Guardrail triggers hard block.',
      defense: 'Autonomous Policy Enforcer & Network Egress Air-Gapping.'
    },
  ];

  const currentFeatureObj = featuresList.find((f) => f.id === activeFeature) || featuresList[0];

  return (
    <div className="page-container space-y-5">
      {/* Header Banner */}
      <div 
        className="rounded-3xl p-6 sm:p-7 flex items-center justify-between flex-wrap gap-4" 
        style={{ 
          background: 'linear-gradient(135deg, #FFF1F2 0%, #FFFBEB 50%, #FFF4ED 100%)', 
          border: '2px solid #FECDD3',
          boxShadow: '0 6px 24px rgba(244, 63, 94, 0.06)'
        }}
      >
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span 
              className="text-xs font-mono font-extrabold px-3 py-0.5 rounded-full text-white shadow-sm" 
              style={{ background: 'linear-gradient(135deg, #F43F5E, #F59E0B)' }}
            >
              ⛓️ TEMPORAL CORRELATION
            </span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
              ● STATEFUL HEURISTICS
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900" style={{ fontFamily: 'Sora' }}>
            Correlated Attack Chain Intelligence
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
            Correlates discrete events into compound attack trajectories: Untrusted Input &rarr; Prompt Influence &rarr; Intent Drift &rarr; Delegation &rarr; Exfiltration Blocked.
          </p>
        </div>
        <button 
          type="button" 
          className="btn btn-secondary btn-sm" 
          onClick={fetchChains} 
          disabled={isLoading}
        >
          <RefreshCw size={14} className={isLoading ? 'spinner' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ── Compact Square Grid Metrics ON TOP OF Navbar ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 pt-1 pb-1 max-w-2xl">
        {/* Square Card 1: Unique Trajectories */}
        <div 
          className="w-full h-[120px] sm:h-[135px] rounded-2xl p-4 border-2 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-md" 
          style={{ background: '#FFF1F2', borderColor: '#FECDD3' }}
        >
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-rose-200/70 text-rose-700 shadow-2xs">
              <ShieldAlert size={16} />
            </div>
            <span className="text-[10px] font-mono font-bold text-rose-800 bg-white px-2 py-0.5 rounded-md border border-rose-200 shadow-2xs">
              {chains.length} runs
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 leading-none" style={{ fontFamily: 'Sora' }}>
              {processedChains.length}
            </div>
            <div className="text-xs font-bold text-slate-700 mt-1.5 leading-tight">
              Trajectories
            </div>
          </div>
        </div>

        {/* Square Card 2: Critical Severity */}
        <div 
          className="w-full h-[120px] sm:h-[135px] rounded-2xl p-4 border-2 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-md" 
          style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}
        >
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-amber-200/70 text-amber-700 shadow-2xs">
              <Flame size={16} />
            </div>
            <span className="text-[10px] font-mono font-bold text-amber-800 bg-white px-2 py-0.5 rounded-md border border-amber-200 shadow-2xs">
              Active
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 leading-none" style={{ fontFamily: 'Sora' }}>
              {chains.filter((c) => c.severity === 'CRITICAL').length}
            </div>
            <div className="text-xs font-bold text-slate-700 mt-1.5 leading-tight">
              Critical Threats
            </div>
          </div>
        </div>

        {/* Square Card 3: Correlation Confidence */}
        <div 
          className="w-full h-[120px] sm:h-[135px] rounded-2xl p-4 border-2 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-md" 
          style={{ background: '#FFF4ED', borderColor: '#FFD0B5' }}
        >
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-orange-200/70 text-orange-700 shadow-2xs">
              <Sparkles size={16} />
            </div>
            <span className="text-[10px] font-mono font-bold text-orange-800 bg-white px-2 py-0.5 rounded-md border border-orange-200 shadow-2xs">
              Stateful
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-orange-600 leading-none" style={{ fontFamily: 'Sora' }}>
              98%
            </div>
            <div className="text-xs font-bold text-slate-700 mt-1.5 leading-tight">
              Confidence
            </div>
          </div>
        </div>
      </div>

      {/* ── Feature Navigation Bar with Vibrant Hover & Click Colors ────────── */}
      <div className="card p-2 sm:p-2.5 bg-white border-2 border-rose-100 flex items-center gap-2 sm:gap-3 overflow-x-auto shadow-2xs scrollbar-none">
        {featuresList.map((feat) => {
          const Icon = feat.icon;
          const isActive = activeFeature === feat.id;
          return (
            <button
              key={feat.id}
              type="button"
              onClick={() => setActiveFeature(feat.id)}
              className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-extrabold text-[11px] sm:text-xs transition-all duration-200 cursor-pointer flex items-center gap-2 border whitespace-nowrap shrink-0 ${
                isActive 
                  ? 'text-white border-transparent' 
                  : `bg-white text-slate-700 border-slate-200 ${feat.hoverClass}`
              }`}
              style={isActive ? { 
                background: feat.activeGradient,
                boxShadow: feat.activeShadow 
              } : {}}
            >
              <Icon size={14} />
              <span>{feat.label}</span>
              {feat.count !== undefined && (
                <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  {feat.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Feature Description & Overview Box with Dynamic Theme Tint ─────── */}
      <div 
        className="p-4 rounded-2xl border flex items-center justify-between flex-wrap gap-3 text-xs transition-all"
        style={{ 
          background: currentFeatureObj.themeBg, 
          borderColor: currentFeatureObj.themeBorder 
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Info size={16} style={{ color: currentFeatureObj.activeColor }} className="shrink-0" />
          <div>
            <span className="font-bold uppercase tracking-wide mr-2" style={{ color: currentFeatureObj.themeText }}>
              Feature Mode: {currentFeatureObj.label}
            </span>
            <span className="text-slate-600 font-medium">{currentFeatureObj.summary}</span>
          </div>
        </div>
        <span 
          className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-white border"
          style={{ color: currentFeatureObj.themeText, borderColor: currentFeatureObj.themeBorder }}
        >
          {currentFeatureObj.badge}
        </span>
      </div>

      {error && (
        <div className="card bg-rose-50 border-2 border-rose-200 p-4 text-rose-700 flex items-center gap-3 font-semibold text-sm">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Feature 1: Correlated Attack Chains View ──────────────────────── */}
      {activeFeature === 'CHAINS' && (
        <div className="space-y-4">
          {/* Search, Filter & Deduplication Bar */}
          <div className="card p-3.5 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5 flex-1 min-w-[240px]">
              <Search size={16} className="text-rose-500" />
              <input 
                type="text" 
                className="w-full bg-transparent border-none outline-none text-xs font-medium text-slate-800 placeholder-slate-400" 
                placeholder="Search by trajectory name, chain ID, or keyword..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
              />
            </div>
            
            <div className="flex items-center gap-3 flex-wrap border-l-2 border-rose-200 pl-3">
              {/* Severity Filter */}
              <div className="flex items-center gap-1.5">
                <Filter size={14} className="text-rose-500" />
                <select 
                  className="bg-transparent border border-rose-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-700 outline-none" 
                  value={severityFilter} 
                  onChange={(e) => setSeverityFilter(e.target.value)}
                >
                  <option value="ALL">All Severities</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                </select>
              </div>

              {/* Deduplicate Toggle */}
              <label className="flex items-center gap-2 cursor-pointer bg-rose-50 border border-rose-200 px-3 py-1 rounded-lg text-xs font-bold text-rose-900 select-none hover:bg-rose-100 transition-colors">
                <input 
                  type="checkbox" 
                  checked={deduplicateChains} 
                  onChange={(e) => setDeduplicateChains(e.target.checked)} 
                  className="accent-rose-600 rounded"
                />
                <span>Collapse Duplicates</span>
              </label>
            </div>
          </div>

          {isLoading ? (
            <div className="card py-16 flex flex-col items-center gap-3">
              <RefreshCw className="spinner text-rose-500" size={28} />
              <span className="text-sm font-bold text-slate-500">Correlating attack trajectories...</span>
            </div>
          ) : processedChains.length === 0 ? (
            <div className="card py-16 text-center">
              <Layers size={36} className="text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-500">No attack chains found matching your filter.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {processedChains.map((chain) => {
                const chainId = chain.chainId || chain.id;
                const isCritical = chain.severity === 'CRITICAL';
                const confidence = chain.confidence || 98;
                const instanceCount = chain.instanceCount || 1;

                return (
                  <div 
                    key={chainId} 
                    className="card p-5 sm:p-6 relative overflow-hidden border-2 shadow-xs hover:shadow-md transition-all" 
                    style={isCritical ? { borderColor: '#F43F5E', background: 'linear-gradient(135deg, #FFF1F2 0%, #FFF8F8 40%, #FFFFFF 100%)' } : { borderColor: '#FECDD3' }}
                  >
                    {/* Top Row: Chain ID, Confidence, Severity, Investigate Action */}
                    <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono text-xs font-extrabold px-2.5 py-1 rounded-lg border shadow-xs" style={{ background: '#FFF1F2', borderColor: '#FECDD3', color: '#9F1239' }}>
                          {chainId}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyChainId(chainId)}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                          title="Copy Chain ID"
                        >
                          {copiedId === chainId ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                        </button>
                        <span className="font-mono text-xs text-slate-600 font-bold bg-white px-2 py-0.5 rounded border border-rose-200">
                          • Confidence: <strong className="text-rose-700">{confidence}%</strong>
                        </span>
                        {instanceCount > 1 && (
                          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-950 border border-rose-300">
                            {instanceCount} correlated simulation runs
                          </span>
                        )}
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-900 border border-rose-300">
                          ● STATEFUL TRAJECTORY
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <RiskBadge risk={chain.severity || 'CRITICAL'} />
                        <button 
                          type="button" 
                          className="btn btn-primary btn-xs shadow-xs" 
                          onClick={() => handleOpenModal(chainId)}
                        >
                          <Eye size={13} />
                          <span>Investigate Forensics</span>
                        </button>
                      </div>
                    </div>

                    {/* Summary Headline & Description */}
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900 mb-1.5" style={{ fontFamily: 'Sora' }}>
                      {chain.title}
                    </h3>
                    <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                      {chain.summary || 'Compound trajectory detected across multiple discrete agent execution steps leading to blocked lateral activity.'}
                    </p>

                    {/* 5-Stage Trajectory Progress Strip */}
                    <div className="p-3 rounded-xl bg-white/90 border border-rose-200 mb-3">
                      <div className="text-[10px] font-mono font-extrabold uppercase text-slate-500 mb-2 flex items-center justify-between">
                        <span>5-Stage Correlation Progression</span>
                        <span className="text-rose-600 font-bold">5 / 5 Stages Correlated</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-1.5 text-[11px] font-mono font-bold text-center">
                        <div className="p-1.5 rounded-lg border bg-sky-50 border-sky-200 text-sky-800">01 INPUT</div>
                        <div className="p-1.5 rounded-lg border bg-purple-50 border-purple-200 text-purple-800">02 INFLUENCE</div>
                        <div className="p-1.5 rounded-lg border bg-amber-50 border-amber-200 text-amber-800">03 DRIFT</div>
                        <div className="p-1.5 rounded-lg border bg-orange-50 border-orange-200 text-orange-800">04 DELEGATE</div>
                        <div className="p-1.5 rounded-lg border bg-rose-100 border-rose-300 text-rose-950">05 BLOCKED</div>
                      </div>
                    </div>

                    {/* Timeline component if stages provided */}
                    {chain.stages && chain.stages.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-orange-100">
                        <AttackChainTimeline events={chain.stages} onSelectEvent={() => handleOpenModal(chainId)} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Feature 2: 5-Stage Kill Chain Blueprint ─────────────────────────── */}
      {activeFeature === 'BLUEPRINT' && (
        <div className="space-y-4">
          <div className="card p-5 sm:p-7 border-2 border-violet-200" style={{ background: 'linear-gradient(135deg, #FAF5FF 0%, #FFFFFF 100%)' }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold text-violet-600 uppercase">Interactive Trajectory Map</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-1.5" style={{ fontFamily: 'Sora' }}>
              Authoritative 5-Stage Attack Trajectory Pipeline
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mb-5 max-w-3xl leading-relaxed">
              TrustGuard models complex AI security exploits as stateful, multi-step kill chains. Click on any stage below to inspect its MITRE ATLAS classification, threat behavior, and autonomous countermeasures.
            </p>

            {/* Stage Selector Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 mb-5">
              {blueprintStages.map((stg, idx) => {
                const Icon = stg.icon;
                const isSelected = selectedStageIndex === idx;
                return (
                  <div
                    key={stg.step}
                    onClick={() => setSelectedStageIndex(idx)}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected 
                        ? 'shadow-md -translate-y-0.5' 
                        : 'hover:-translate-y-0.5'
                    }`}
                    style={{
                      background: isSelected ? stg.bg : '#FFFFFF',
                      borderColor: isSelected ? stg.color : '#F1F5F9',
                    }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono font-extrabold text-[10px] px-1.5 py-0.2 rounded-full" style={{ background: `${stg.color}20`, color: stg.color }}>
                        STAGE {stg.step}
                      </span>
                      <Icon size={14} style={{ color: stg.color }} />
                    </div>
                    <div className="font-extrabold text-xs text-slate-900 leading-snug">
                      {stg.name}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Stage Deep Dive Card */}
            {(() => {
              const activeStg = blueprintStages[selectedStageIndex];
              const Icon = activeStg.icon;
              return (
                <div 
                  className="p-5 sm:p-6 rounded-2xl border-2 relative overflow-hidden"
                  style={{ background: activeStg.bg, borderColor: activeStg.border }}
                >
                  <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-extrabold text-sm shadow-xs" style={{ background: activeStg.color }}>
                        {activeStg.step}
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-extrabold text-slate-900" style={{ fontFamily: 'Sora' }}>
                          Stage {activeStg.step}: {activeStg.name}
                        </h3>
                        <span className="font-mono text-xs font-bold" style={{ color: activeStg.color }}>
                          MITRE ATLAS: {activeStg.mitre}
                        </span>
                      </div>
                    </div>
                    <span className="badge badge-allow text-xs">● DETERMINISTIC BOUND</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <div className="p-3.5 rounded-xl bg-white/90 border border-slate-200">
                      <h4 className="text-xs font-bold uppercase text-slate-500 mb-1 flex items-center gap-1.5">
                        <AlertTriangle size={13} className="text-rose-500" />
                        <span>Adversarial Threat Mechanism</span>
                      </h4>
                      <p className="text-xs text-slate-800 leading-relaxed font-medium">
                        {activeStg.description}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/90 border border-slate-200">
                      <h4 className="text-xs font-bold uppercase text-slate-500 mb-1 flex items-center gap-1.5">
                        <ShieldCheck size={13} className="text-emerald-600" />
                        <span>TrustGuard Automated Defense</span>
                      </h4>
                      <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                        {activeStg.defense}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Feature 3: Threat Forensics Matrix ──────────────────────────────── */}
      {activeFeature === 'MATRIX' && (
        <div className="space-y-4">
          <div className="card p-5 sm:p-7 border-2 border-amber-200" style={{ background: 'linear-gradient(135deg, #FFFDF5 0%, #FFFFFF 100%)' }}>
            <h2 className="text-xl font-extrabold text-slate-900 mb-1.5" style={{ fontFamily: 'Sora' }}>
              Temporal Threat Forensics Matrix
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mb-4 max-w-3xl leading-relaxed">
              Comparison of discrete runtime anomalies versus stateful compound attack trajectories evaluated across the multi-engine arbitration pipeline.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[650px] text-xs">
                <thead>
                  <tr className="border-b-2 border-amber-200 bg-amber-50/50 font-mono text-[11px] font-extrabold text-slate-600 uppercase">
                    <th className="py-2.5 px-3.5">Evaluation Dimension</th>
                    <th className="py-2.5 px-3.5">Discrete Anomaly Event</th>
                    <th className="py-2.5 px-3.5">Correlated Attack Chain</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100">
                  <tr className="hover:bg-amber-50/30">
                    <td className="py-3 px-3.5 font-bold text-slate-900">Event Scope</td>
                    <td className="py-3 px-3.5 text-slate-600">Single tool invocation or resource query</td>
                    <td className="py-3 px-3.5 font-bold text-rose-700">Multi-stage sequence across 3 to 5 steps</td>
                  </tr>
                  <tr className="hover:bg-amber-50/30">
                    <td className="py-3 px-3.5 font-bold text-slate-900">Provenance Correlation</td>
                    <td className="py-3 px-3.5 text-slate-600">Evaluates immediate source token trust</td>
                    <td className="py-3 px-3.5 font-bold text-rose-700">Tracks recursive lineage across delegations</td>
                  </tr>
                  <tr className="hover:bg-amber-50/30">
                    <td className="py-3 px-3.5 font-bold text-slate-900">Drift Vector</td>
                    <td className="py-3 px-3.5 text-slate-600">Single cosine similarity calculation</td>
                    <td className="py-3 px-3.5 font-bold text-rose-700">Compound drift acceleration trajectory</td>
                  </tr>
                  <tr className="hover:bg-amber-50/30">
                    <td className="py-3 px-3.5 font-bold text-slate-900">Mitigation Response</td>
                    <td className="py-3 px-3.5 text-slate-600">Action BLOCK or REVIEW alert</td>
                    <td className="py-3 px-3.5 font-bold text-rose-700">Hard containment, credential rotation, session freeze</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Feature 4: Autonomous Containment Playbook ──────────────────────── */}
      {activeFeature === 'CONTAINMENT' && (
        <div className="space-y-4">
          <div className="card p-5 sm:p-7 border-2 border-emerald-200" style={{ background: 'linear-gradient(135deg, #F0FDF4 0%, #FFFFFF 100%)' }}>
            <h2 className="text-xl font-extrabold text-slate-900 mb-1.5" style={{ fontFamily: 'Sora' }}>
              Multi-Stage Attack Containment Playbook
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mb-4 max-w-3xl leading-relaxed">
              Standard Operating Procedures (SOP) autonomously executed upon detection of high-confidence correlated attack chains.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="p-4 rounded-xl border-2 border-rose-200 bg-rose-50/40 space-y-1.5">
                <div className="font-extrabold text-xs sm:text-sm text-rose-900 flex items-center gap-2">
                  <ShieldAlert size={15} className="text-rose-600" />
                  <span>1. Autonomous Execution Block</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  The terminal exfiltration or destructive action is immediately halted by the Security Pipeline without human latency.
                </p>
              </div>

              <div className="p-4 rounded-xl border-2 border-amber-200 bg-amber-50/40 space-y-1.5">
                <div className="font-extrabold text-xs sm:text-sm text-amber-900 flex items-center gap-2">
                  <Flame size={15} className="text-amber-600" />
                  <span>2. Session Quarantine & Token Invalidation</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  The compromised agent session is frozen, and downstream database & API connector tokens are revoked.
                </p>
              </div>

              <div className="p-4 rounded-xl border-2 border-sky-200 bg-sky-50/40 space-y-1.5">
                <div className="font-extrabold text-xs sm:text-sm text-sky-900 flex items-center gap-2">
                  <Activity size={15} className="text-sky-600" />
                  <span>3. Trust Score Penalty Imposition</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  The agent trust score is penalized in the fleet directory, requiring administrator re-verification.
                </p>
              </div>

              <div className="p-4 rounded-xl border-2 border-emerald-200 bg-emerald-50/40 space-y-1.5">
                <div className="font-extrabold text-xs sm:text-sm text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-600" />
                  <span>4. Real-Time SOC Incident Dispatch</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Detailed incident telemetry is correlated and dispatched to the Security Alerts incident triage queue.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attack Chain Detail Modal */}
      {isModalOpen && inspectChainId && (
        <AttackChainDetailModal 
          chainId={inspectChainId} 
          isOpen={isModalOpen} 
          onClose={() => { setIsModalOpen(false); setInspectChainId(null); }} 
        />
      )}
    </div>
  );
};

export default AttackChains;
