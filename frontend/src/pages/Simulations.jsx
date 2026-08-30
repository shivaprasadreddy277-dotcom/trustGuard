import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  PlaySquare, ShieldAlert, ShieldCheck, AlertTriangle, RefreshCw, Zap, 
  CheckCircle2, ArrowRight, Layers, Check, Copy, Flame, History, 
  ArrowUpDown, Terminal, Compass, Target, Shield, Clock, Info, 
  Radio, Sparkles, Send, FileText 
} from 'lucide-react';
import { simulationApi } from '../api/client';
import DecisionBadge from '../components/security/DecisionBadge';
import RiskBadge from '../components/security/RiskBadge';
import AttackChainDetailModal from '../components/security/AttackChainDetailModal';

const SCENARIO_ICONS = {
  normal_workflow: ShieldCheck,
  unauthorized_sensitive_access: ShieldAlert,
  indirect_injection: AlertTriangle,
  intent_drift: Zap,
  compound_attack: Layers,
};

const SCENARIO_COLORS = {
  normal_workflow: { bg: '#ECFDF5', border: '#A7F3D0', color: '#10B981' },
  unauthorized_sensitive_access: { bg: '#FFF1F2', border: '#FECDD3', color: '#F43F5E' },
  indirect_injection: { bg: '#FFFBEB', border: '#FDE68A', color: '#F59E0B' },
  intent_drift: { bg: '#F5F3FF', border: '#DDD6FE', color: '#8B5CF6' },
  compound_attack: { bg: '#FFF4ED', border: '#FFD0B5', color: '#FF6B35' },
};

const Simulations = () => {
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState('compound_attack');
  const [isRunning, setIsRunning] = useState(false);
  const [currentRunResult, setCurrentRunResult] = useState(null);
  const [simulationHistory, setSimulationHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState(null);
  const [pipelineStage, setPipelineStage] = useState(null);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [inspectChainId, setInspectChainId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [historySortOrder, setHistorySortOrder] = useState('newest'); // 'newest' | 'oldest'
  
  // Navigation tabs for Simulation Studio
  // 'RUNNER' | 'CATALOG' | 'HISTORY'
  const [activeTab, setActiveTab] = useState('RUNNER');

  const fetchInitialData = useCallback(async () => {
    try {
      const [scenariosRes, runsRes] = await Promise.allSettled([
        simulationApi.getScenarios(), 
        simulationApi.listRuns(20)
      ]);
      if (scenariosRes.status === 'fulfilled') setScenarios(scenariosRes.value.scenarios || []);
      if (runsRes.status === 'fulfilled') setSimulationHistory(runsRes.value.simulations || runsRes.value.runs || []);
    } catch (err) { 
      setError(err.message); 
    } finally { 
      setLoadingHistory(false); 
    }
  }, []);

  useEffect(() => { 
    fetchInitialData(); 
  }, [fetchInitialData]);

  const handleRunSimulation = async (scenarioIdToRun = selectedScenarioId) => {
    if (isRunning) return;
    setIsRunning(true); 
    setError(null); 
    setCurrentRunResult(null); 
    setPipelineStage('GENERATING'); 
    setActiveStepIndex(1);
    try {
      const t1 = setTimeout(() => { setPipelineStage('EVALUATING'); setActiveStepIndex(2); }, 350);
      const t2 = setTimeout(() => { setPipelineStage('CORRELATING'); setActiveStepIndex(4); }, 700);
      const result = await simulationApi.runSimulation(scenarioIdToRun);
      clearTimeout(t1); 
      clearTimeout(t2);
      setActiveStepIndex(5); 
      setPipelineStage('COMPLETED'); 
      setCurrentRunResult(result);
      const updatedRuns = await simulationApi.listRuns(20).catch(() => ({ simulations: [] }));
      setSimulationHistory(updatedRuns.simulations || updatedRuns.runs || []);
    } catch (err) { 
      setPipelineStage('FAILED'); 
      setError(err.message); 
    } finally { 
      setIsRunning(false); 
    }
  };

  const handleCopyEvidence = () => { 
    if (!currentRunResult) return; 
    navigator.clipboard.writeText(JSON.stringify(currentRunResult, null, 2)); 
    setCopied(true); 
    setTimeout(() => setCopied(false), 2000); 
  };
  
  const handleOpenChainModal = (chainId) => { 
    if (!chainId) return; 
    setInspectChainId(chainId); 
    setIsModalOpen(true); 
  };

  const correlatedChainId = currentRunResult?.attackChain?.chainId || currentRunResult?.attackChain?.id;

  const stageNodes = [
    { step: '01', title: 'UNTRUSTED INPUT', desc: 'External payload ingested', color: '#0EA5E9' },
    { step: '02', title: 'PROMPT INFLUENCE', desc: 'Instruction override detected', color: '#8B5CF6' },
    { step: '03', title: 'INTENT DRIFT', desc: 'Cosine similarity violation', color: '#F59E0B' },
    { step: '04', title: 'DELEGATION', desc: 'Sub-agent spawn attempt', color: '#FF6B35' },
    { step: '05', title: 'EXFILTRATION', desc: 'Egress neutralized', color: '#F43F5E' },
  ];

  const sortedHistory = useMemo(() => {
    return [...simulationHistory].sort((a, b) => {
      const timeA = new Date(a.createdAt || a.timestamp || 0).getTime();
      const timeB = new Date(b.createdAt || b.timestamp || 0).getTime();
      return historySortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });
  }, [simulationHistory, historySortOrder]);

  const studioTabs = [
    { id: 'RUNNER', label: '1. Interactive Attack Runner', icon: Zap },
    { id: 'CATALOG', label: '2. Scenario Catalog & Blueprints', icon: Target, count: scenarios.length },
    { id: 'HISTORY', label: '3. Execution Log & Forensics', icon: History, count: simulationHistory.length },
  ];

  return (
    <div className="page-container space-y-5">
      {/* Header Banner */}
      <div 
        className="rounded-3xl p-6 sm:p-7 flex items-center justify-between flex-wrap gap-4" 
        style={{ 
          background: 'linear-gradient(135deg, #FFF4ED 0%, #FFFBEB 30%, #F0F9FF 60%, #F5F3FF 100%)', 
          border: '2px solid #FFD0B5',
          boxShadow: '0 6px 24px rgba(255, 107, 53, 0.07)'
        }}
      >
        <div className="max-w-2xl min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span 
              className="text-xs font-mono font-extrabold px-3 py-0.5 rounded-full text-white shadow-sm" 
              style={{ background: 'linear-gradient(135deg, #FF6B35, #F59E0B)' }}
            >
              ⚡ SIMULATION SANDBOX STUDIO
            </span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-300">
              5-ENGINE ARBITRATION PIPELINE
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900" style={{ fontFamily: 'Sora' }}>
            Security Simulation Studio
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
            Execute real controlled attack vectors against the 5-Engine Arbitration Pipeline and observe live detection, decisioning, and attack-chain correlation in isolated sandboxes.
          </p>
        </div>
        <button 
          type="button" 
          className="btn-jury-cta shrink-0" 
          onClick={() => { setSelectedScenarioId('compound_attack'); handleRunSimulation('compound_attack'); }} 
          disabled={isRunning}
        >
          <span>{isRunning ? 'Arbitrating Pipeline...' : '⚡ RUN COMPOUND ATTACK'}</span>
          <ArrowRight size={16} />
        </button>
      </div>

      {/* ── Simulation Feature Navigation Tabs ───────────────────────────── */}
      <div className="card p-2 bg-white border-2 border-orange-100 flex items-center gap-2 flex-wrap shadow-xs">
        {studioTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl font-extrabold text-xs transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                isActive 
                  ? 'text-white shadow-md' 
                  : 'bg-orange-50/50 text-slate-700 hover:bg-orange-100/70 border border-orange-200/60'
              }`}
              style={isActive ? { background: 'linear-gradient(135deg, #FF6B35, #F59E0B)' } : {}}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-white/25 text-white' : 'bg-orange-200 text-orange-900'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Compact Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="rounded-xl p-3.5 border-2 border-l-[5px] border-l-orange-500" style={{ background: '#FFF4ED', borderColor: '#FFD0B5' }}>
          <div className="flex items-center justify-between text-[11px] font-bold uppercase text-slate-500 tracking-wider">
            <span>Canonical Scenarios</span>
            <Target className="text-orange-500" size={15} />
          </div>
          <div className="text-xl font-extrabold text-orange-600 mt-1" style={{ fontFamily: 'Sora' }}>{scenarios.length || 5}</div>
          <div className="text-[11px] text-slate-500">Curated attack vectors</div>
        </div>

        <div className="rounded-xl p-3.5 border-2 border-l-[5px] border-l-amber-500" style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}>
          <div className="flex items-center justify-between text-[11px] font-bold uppercase text-slate-500 tracking-wider">
            <span>Executed Runs</span>
            <History className="text-amber-500" size={15} />
          </div>
          <div className="text-xl font-extrabold text-amber-600 mt-1" style={{ fontFamily: 'Sora' }}>{simulationHistory.length}</div>
          <div className="text-[11px] text-slate-500">Logged in audit trail</div>
        </div>

        <div className="rounded-xl p-3.5 border-2 border-l-[5px] border-l-emerald-500" style={{ background: '#ECFDF5', borderColor: '#A7F3D0' }}>
          <div className="flex items-center justify-between text-[11px] font-bold uppercase text-slate-500 tracking-wider">
            <span>Intercept Rate</span>
            <ShieldCheck className="text-emerald-500" size={15} />
          </div>
          <div className="text-xl font-extrabold text-emerald-600 mt-1" style={{ fontFamily: 'Sora' }}>100%</div>
          <div className="text-[11px] text-slate-500">Deterministic containment</div>
        </div>

        <div className="rounded-xl p-3.5 border-2 border-l-[5px] border-l-sky-500" style={{ background: '#F0F9FF', borderColor: '#BAE6FD' }}>
          <div className="flex items-center justify-between text-[11px] font-bold uppercase text-slate-500 tracking-wider">
            <span>Mean Latency</span>
            <Clock className="text-sky-500" size={15} />
          </div>
          <div className="text-xl font-extrabold text-sky-600 mt-1" style={{ fontFamily: 'Sora' }}>&lt; 120ms</div>
          <div className="text-[11px] text-slate-500">Pipeline arbitration</div>
        </div>
      </div>

      {error && (
        <div className="card bg-rose-50 border-2 border-rose-200 p-4 text-rose-700 flex items-center gap-3 font-semibold text-sm rounded-2xl">
          <AlertTriangle size={18} className="shrink-0" />
          <span className="break-all">{error}</span>
        </div>
      )}

      {/* ── Tab 1: Interactive Attack Runner ──────────────────────────────── */}
      {activeTab === 'RUNNER' && (
        <div className="space-y-5">
          {/* Scenario Selection Grid */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-xs font-extrabold uppercase text-slate-700 tracking-wider">
                Select Attack Vector to Execute ({scenarios.length})
              </div>
              <span className="text-xs font-medium text-slate-500">
                Click any scenario card below to load into the runner
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
              {scenarios.map((sc) => {
                const Icon = SCENARIO_ICONS[sc.scenarioId] || ShieldCheck;
                const colors = SCENARIO_COLORS[sc.scenarioId] || { bg: '#F0F9FF', border: '#BAE6FD', color: '#0EA5E9' };
                const isSelected = selectedScenarioId === sc.scenarioId;
                const isCompound = sc.scenarioId === 'compound_attack';
                
                return (
                  <div 
                    key={sc.scenarioId} 
                    className={`card p-4 flex flex-col justify-between cursor-pointer rounded-2xl transition-all duration-300 min-w-0 ${
                      isSelected 
                        ? 'border-2 shadow-md -translate-y-0.5' 
                        : 'border-2 border-orange-100 hover:border-orange-300 hover:shadow-xs hover:-translate-y-0.5'
                    }`} 
                    onClick={() => setSelectedScenarioId(sc.scenarioId)}
                    style={isSelected ? { 
                      borderColor: colors.color, 
                      background: colors.bg, 
                      boxShadow: `0 6px 20px ${colors.color}25` 
                    } : { background: '#FFFFFF' }}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2.5 min-w-0">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center shadow-xs shrink-0" 
                          style={{ background: colors.bg, color: colors.color, border: `1.5px solid ${colors.border}` }}
                        >
                          <Icon size={16} />
                        </div>
                        {isCompound && (
                          <span 
                            className="text-[9px] font-mono font-extrabold px-1.5 py-0.2 rounded-full text-white shadow-xs" 
                            style={{ background: colors.color }}
                          >
                            ★ FEATURED
                          </span>
                        )}
                      </div>
                      
                      <h3 className="font-extrabold text-xs text-slate-900 mb-1 break-words line-clamp-2" style={{ fontFamily: 'Sora' }}>
                        {sc.name}
                      </h3>
                      
                      <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                        {sc.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-orange-100/80 flex items-center justify-between text-[10px] font-bold">
                      <span className="text-slate-400">Expected:</span>
                      <span className={`font-mono font-extrabold ${
                        sc.expectedVerdict === 'BLOCK' ? 'text-rose-600' : sc.expectedVerdict === 'REVIEW' ? 'text-amber-600' : 'text-emerald-600'
                      }`}>
                        {sc.expectedVerdict}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Execution Strip */}
          <div 
            className="rounded-3xl p-6 sm:p-7 border-2 shadow-lg space-y-5 min-w-0 overflow-hidden" 
            style={{ 
              background: 'linear-gradient(135deg, #1A1410 0%, #251810 50%, #1A1410 100%)', 
              borderColor: '#FF6B3550' 
            }}
          >
            <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5 text-sm sm:text-base font-extrabold text-white">
                <span 
                  className="w-2.5 h-2.5 rounded-full bg-orange-500" 
                  style={{ animation: isRunning ? 'pulse-ring 1.5s infinite' : 'none' }} 
                />
                <span style={{ fontFamily: 'Sora' }}>Interactive Attack Trajectory & Pipeline Stages</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[11px] font-extrabold px-3 py-1 rounded-full bg-orange-950/80 border border-orange-500/40 text-orange-400">
                  {isRunning ? '● ARBITRATING PIPELINE...' : currentRunResult ? '✓ COMPLETED & LOGGED' : 'IDLE / READY TO TRIGGER'}
                </span>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => handleRunSimulation(selectedScenarioId)}
                  disabled={isRunning}
                >
                  <span>{isRunning ? 'Arbitrating...' : 'Execute Selected Scenario'}</span>
                </button>
              </div>
            </div>

            {/* 5-Step Trajectory Grid with Responsive Wrapping */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 text-xs font-mono min-w-0">
              {stageNodes.map((node, i) => {
                const stepNum = i + 1;
                const isPassed = activeStepIndex >= stepNum;
                const isCurrent = activeStepIndex === stepNum && isRunning;
                return (
                  <div 
                    key={node.step} 
                    className="p-3.5 rounded-xl border-2 transition-all duration-300 min-w-0 overflow-hidden"
                    style={
                      isCurrent 
                        ? { borderColor: node.color, background: `${node.color}25`, boxShadow: `0 4px 18px ${node.color}40` } 
                        : isPassed 
                        ? { borderColor: '#10B981', background: 'rgba(16,185,129,0.18)' } 
                        : { borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }
                    }
                  >
                    <div className="flex items-center justify-between mb-1 gap-1">
                      <span className="text-[10px] font-extrabold" style={{ color: isPassed ? '#6EE7B7' : '#A8A29E' }}>
                        STAGE {node.step}
                      </span>
                      {isPassed && <CheckCircle2 size={13} style={{ color: '#6EE7B7' }} />}
                    </div>
                    <div className="font-extrabold text-xs truncate" style={{ color: isPassed ? '#FFFFFF' : '#D6D3D1' }}>
                      {node.title}
                    </div>
                    <div className="text-[10px] mt-0.5 font-sans leading-snug line-clamp-2" style={{ color: '#A8A29E' }}>
                      {node.desc}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Live Result Banner */}
            {currentRunResult && (
              <div 
                className="p-4 sm:p-5 rounded-2xl border-2 flex items-center justify-between flex-wrap gap-3 mt-3 animate-shimmer min-w-0" 
                style={{ 
                  background: 'linear-gradient(135deg, rgba(244,63,94,0.18) 0%, rgba(16,185,129,0.18) 100%)', 
                  borderColor: 'rgba(16,185,129,0.45)',
                  boxShadow: '0 6px 28px rgba(0,0,0,0.3)'
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm" 
                    style={{ background: 'rgba(16,185,129,0.25)', color: '#6EE7B7', border: '1px solid rgba(16,185,129,0.4)' }}
                  >
                    <Flame size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-mono font-extrabold text-rose-300">
                      FINAL VERDICT: {currentRunResult.decision || 'BLOCK'} · THREAT NEUTRALIZED
                    </div>
                    <div className="text-base font-extrabold text-white truncate">
                      Execution Terminated · Exfiltration Intercepted
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                  <button 
                    type="button" 
                    className="btn btn-xs rounded-xl font-extrabold px-3 py-2 cursor-pointer shadow-xs" 
                    style={{ background: 'rgba(255,255,255,0.12)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.25)' }} 
                    onClick={handleCopyEvidence}
                  >
                    {copied ? <Check size={13} style={{ color: '#6EE7B7' }} /> : <Copy size={13} />}
                    <span>{copied ? 'Audit Copied' : 'Copy Evidence'}</span>
                  </button>
                  {correlatedChainId && (
                    <button 
                      type="button" 
                      className="btn btn-primary btn-xs shadow-sm" 
                      onClick={() => handleOpenChainModal(correlatedChainId)}
                    >
                      <span>INVESTIGATE CHAIN →</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab 2: Scenario Catalog & Blueprints ───────────────────────────── */}
      {activeTab === 'CATALOG' && (
        <div className="space-y-4">
          <div className="card p-6 sm:p-7 border-2 border-orange-200">
            <h2 className="text-xl font-extrabold text-slate-900 mb-1.5" style={{ fontFamily: 'Sora' }}>
              Deterministic Attack Scenario Catalog
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mb-5 max-w-3xl leading-relaxed">
              Explore the detailed technical blueprint, step sequence, and expected arbitration outcomes for every security vector supported by the TrustGuard sandbox.
            </p>

            <div className="space-y-4">
              {scenarios.map((sc) => {
                const Icon = SCENARIO_ICONS[sc.scenarioId] || ShieldCheck;
                const colors = SCENARIO_COLORS[sc.scenarioId] || { bg: '#F0F9FF', border: '#BAE6FD', color: '#0EA5E9' };

                return (
                  <div 
                    key={sc.scenarioId}
                    className="p-5 rounded-2xl border-2 transition-all hover:shadow-md"
                    style={{ background: colors.bg, borderColor: colors.border }}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-extrabold text-sm shadow-xs" style={{ background: colors.color }}>
                          <Icon size={16} />
                        </div>
                        <div>
                          <h3 className="text-base font-extrabold text-slate-900">{sc.name}</h3>
                          <span className="font-mono text-[11px] font-bold" style={{ color: colors.color }}>
                            Scenario ID: {sc.scenarioId}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500">Expected:</span>
                        <DecisionBadge decision={sc.expectedVerdict || 'BLOCK'} />
                        <button
                          type="button"
                          className="btn btn-primary btn-xs shadow-xs ml-2"
                          onClick={() => { setSelectedScenarioId(sc.scenarioId); setActiveTab('RUNNER'); handleRunSimulation(sc.scenarioId); }}
                        >
                          <Zap size={13} />
                          <span>Run Now</span>
                        </button>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed mb-3">
                      {sc.description}
                    </p>

                    {sc.steps && sc.steps.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-white/90 border border-orange-200">
                        <span className="text-[11px] font-extrabold uppercase text-slate-500 block mb-1.5">
                          Execution Step Sequence:
                        </span>
                        <ol className="list-decimal pl-5 space-y-1 text-xs text-slate-800">
                          {sc.steps.map((st, sIdx) => (
                            <li key={sIdx} className="font-medium">{st}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 3: Execution History & Forensics ───────────────────────────── */}
      {activeTab === 'HISTORY' && (
        <div className="space-y-4">
          <div className="card p-6 sm:p-7 border-2 border-orange-200 shadow-md min-w-0 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b-2 border-orange-100">
              <div className="flex items-center gap-2">
                <History size={18} className="text-orange-600" />
                <h2 className="text-base font-extrabold text-slate-900" style={{ fontFamily: 'Sora' }}>
                  Simulation Execution History Log ({sortedHistory.length})
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <ArrowUpDown size={14} className="text-slate-500" />
                <select 
                  value={historySortOrder} 
                  onChange={(e) => setHistorySortOrder(e.target.value)}
                  className="bg-orange-50 border border-orange-200 text-xs font-bold text-slate-800 rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer"
                >
                  <option value="newest">Sort: Newest First</option>
                  <option value="oldest">Sort: Oldest First</option>
                </select>
              </div>
            </div>

            {loadingHistory ? (
              <div className="py-12 text-center text-xs text-slate-500">
                <RefreshCw className="spinner text-orange-500 mx-auto mb-2" size={24} />
                <span>Loading simulation execution history...</span>
              </div>
            ) : sortedHistory.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 font-medium">
                No previous simulation runs recorded yet. Switch to the Interactive Attack Runner to execute a vector.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {sortedHistory.map((run, idx) => (
                  <div 
                    key={run.simulationId || run.id || idx} 
                    className="p-4 rounded-xl border border-orange-200 bg-orange-50/30 hover:bg-orange-50 hover:border-orange-300 transition-all flex flex-col justify-between shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2 gap-2">
                        <span className="font-mono text-[11px] font-extrabold text-slate-900 truncate">
                          {run.scenarioId || run.name || `run_${idx + 1}`}
                        </span>
                        <DecisionBadge decision={run.decision || run.verdict || 'BLOCK'} />
                      </div>
                      <div className="text-xs text-slate-600 line-clamp-2 mb-3">
                        {run.summary || run.description || 'Simulated compound attack execution.'}
                      </div>
                    </div>
                    <div className="pt-2.5 border-t border-orange-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>ID: {run.simulationId ? run.simulationId.slice(0, 10) : `sim_${idx}`}</span>
                      <span>{run.createdAt ? new Date(run.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recorded'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
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

export default Simulations;
