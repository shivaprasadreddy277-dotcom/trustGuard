import React, { useState, useMemo } from 'react';
import { 
  BookOpen, ChevronRight, ChevronLeft, ArrowRight, ShieldCheck, 
  Zap, Layers, ShieldAlert, Database, Search, CheckCircle2, 
  GitBranch, PlaySquare, FileText, Terminal, Users, Send, 
  Sparkles, ExternalLink, HelpCircle, Eye, Shield, Lock, Radio,
  Compass, Target, Activity, Flame, Clock 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CHAPTERS = [
  {
    id: 'welcome',
    title: '1. Welcome & 5-Engine Mesh',
    icon: Sparkles,
    badge: 'Core Concept',
    color: '#FF6B35',
    bg: '#FFF4ED',
    border: '#FFD0B5',
    headline: 'Welcome to TrustGuard Autonomous AI Security Mesh',
    description: 'TrustGuard is a real-time security arbitration platform that intercepts, evaluates, and contains unauthorized AI agent actions before they execute in databases or external tools.',
    sections: [
      {
        heading: 'Why Autonomous AI Security is Critical',
        body: 'When autonomous AI agents interact with external documents, databases, APIs, and sub-agents, they can be tricked by prompt injections, drift from user instructions, or attempt lateral privilege escalation. TrustGuard sits as a proxy between AI agents and execution environments to ensure every tool call is mathematically and policy-verified.'
      },
      {
        heading: 'The 5-Engine Real-Time Arbitration Pipeline',
        items: [
          { label: '1. Input Provenance Engine', text: 'Tags all inputs (documents, emails, API responses) with cryptographic trust levels (TRUSTED vs UNTRUSTED).' },
          { label: '2. Intent Baseline Drift Engine', text: 'Computes cosine vector similarity between current agent tool invocation and initial session intent to catch goal hijacking.' },
          { label: '3. Scope & Token Engine', text: 'Validates that the agent holds cryptographic token claims for the requested database or API connector.' },
          { label: '4. Dynamic Policy Rule Engine', text: 'Enforces deterministic regex, keyword, and resource isolation rules with zero LLM hallucination risk.' },
          { label: '5. Risk Scoring & Decision Engine', text: 'Produces an authoritative verdict: ALLOW (safe), REVIEW (operator triage), or BLOCK (hard containment).' },
        ]
      }
    ],
    quickLink: { label: 'Go to Command Center', path: '/overview' }
  },
  {
    id: 'simulations',
    title: '2. Security Simulation Lab',
    icon: PlaySquare,
    badge: 'Hands-On Sandbox',
    color: '#F43F5E',
    bg: '#FFF1F2',
    border: '#FECDD3',
    headline: 'Execute Controlled AI Exploits in the Sandbox',
    description: 'The Simulation Studio allows security operators to test realistic multi-stage AI exploits against the live security pipeline and observe real-time detection in isolated sandboxes.',
    sections: [
      {
        heading: 'How to Run an Attack Simulation',
        steps: [
          'Navigate to the Simulations page from the sidebar.',
          'Select an attack vector (e.g. Featured Compound Attack, Indirect Prompt Injection, or Intent Drift).',
          'Click "Execute Selected Scenario" or "Run Compound Attack".',
          'Watch the 5-step interactive attack trajectory illuminate in real time.',
          'Review the final verdict (BLOCK) and click "Investigate Chain" for deep temporal forensics.'
        ]
      },
      {
        heading: 'Available Attack Scenarios',
        items: [
          { label: '★ Compound Multi-Stage Attack', text: '5-stage sequence: Untrusted document &rarr; Prompt override &rarr; DB query &rarr; Lateral delegation &rarr; Neutralized exfiltration.' },
          { label: 'Unauthorized Sensitive Access', text: 'Direct attempt to access restricted credentials or customer databases without permission.' },
          { label: 'Indirect Prompt Injection', text: 'Untrusted document instructing agent to ignore system boundaries.' },
          { label: 'Intent Drift', text: 'Subtle gradual deviation from user prompt toward unauthorized actions.' },
        ]
      }
    ],
    quickLink: { label: 'Open Simulation Lab', path: '/simulations' }
  },
  {
    id: 'events',
    title: '3. Live Telemetry Stream',
    icon: Zap,
    badge: 'Real-Time Telemetry',
    color: '#0EA5E9',
    bg: '#F0F9FF',
    border: '#BAE6FD',
    headline: 'Real-Time Interception & Telemetry Stream',
    description: 'Every tool invocation across the entire AI agent fleet is recorded as a structured telemetry event with execution parameters, lineage, and arbitration verdicts.',
    sections: [
      {
        heading: 'Using the Telemetry Stream',
        steps: [
          'Browse real-time event logs with timestamps, agent IDs, and execution tools.',
          'Click any event row to expand the full-width in-place telemetry card.',
          'Inspect full unclipped target resources, authorization claims, and input trust levels.',
          'Read security engine arbitration findings explaining why an action was allowed or blocked.',
          'Click "Copy Event JSON" or "Open Full Investigation Modal" for deep forensic audits.'
        ]
      },
      {
        heading: 'Filtering & Triage Controls',
        items: [
          { label: 'Sensitivity Filter', text: 'Filter events by data classification (CRITICAL, HIGH, MEDIUM, LOW).' },
          { label: 'Verdict Filter', text: 'Isolate BLOCKED attacks, REVIEW requests, or ALLOWED actions.' },
          { label: 'Provenance Filter', text: 'Filter by UNTRUSTED external documents versus TRUSTED user commands.' },
        ]
      }
    ],
    quickLink: { label: 'Inspect Live Telemetry', path: '/events' }
  },
  {
    id: 'alerts',
    title: '4. Incident Alerts & Forensics',
    icon: ShieldAlert,
    badge: 'SOC Triage Console',
    color: '#E11D48',
    bg: '#FFF1F2',
    border: '#FECDD3',
    headline: 'Side-by-Side Incident Queue & Forensic Console',
    description: 'When an agent violates security bounds, an incident alert is generated. The side-by-side console gives operators immediate triage capabilities.',
    sections: [
      {
        heading: 'Side-by-Side Triage Workflow',
        steps: [
          'Left Panel (Incident Queue): Search and filter unresolved incidents by severity or status.',
          'Select an incident to immediately inspect it in the Right Forensic Console.',
          'Explore the 4 Forensic Tabs: Threat Analysis, Attack Chain Timeline, SOP Playbook, and Raw JSON.',
          'Click "Resolve Incident" to mark the issue addressed with operator sign-off.'
        ]
      },
      {
        heading: 'The 4 Forensic Analysis Tabs',
        items: [
          { label: 'Threat Analysis', text: 'Risk breakdown, engine reasoning, provenance origin, and target assets.' },
          { label: 'Attack Chain Timeline', text: 'Visual correlated timeline of every step leading to the incident.' },
          { label: 'Playbook & SOP', text: 'Recommended containment actions and response checklist.' },
          { label: 'Raw Event JSON', text: 'Exact cryptographic payload and metadata for compliance logs.' },
        ]
      }
    ],
    quickLink: { label: 'Open Security Alerts', path: '/alerts' }
  },
  {
    id: 'attack-chains',
    title: '5. Correlated Attack Chains',
    icon: Layers,
    badge: 'Multi-Stage Exploits',
    color: '#8B5CF6',
    bg: '#F5F3FF',
    border: '#DDD6FE',
    headline: 'Assembling Discrete Events into Compound Attack Chains',
    description: 'Attackers rarely perform single isolated actions. TrustGuard correlates discrete agent events over time into 5-stage compound attack trajectories.',
    sections: [
      {
        heading: 'The 5-Stage Trajectory Progression',
        items: [
          { label: 'Stage 01: Untrusted Input Ingestion', text: 'Agent ingests external document containing hidden payload.' },
          { label: 'Stage 02: Prompt Influence', text: 'Untrusted text steers LLM execution context away from baseline.' },
          { label: 'Stage 03: Intent Drift & Sensitive Access', text: 'Agent queries credentials or sensitive tables deviating from baseline.' },
          { label: 'Stage 04: Lateral Agent Delegation', text: 'Agent spawns sub-agent to bypass primary permission restrictions.' },
          { label: 'Stage 05: Exfiltration Blocked', text: 'Egress transmission is intercepted and hard-blocked by policy enforcer.' },
        ]
      },
      {
        heading: 'Interactive Feature Navigation',
        steps: [
          'Use the top Feature Navigation Bar to switch between Active Trajectories, Kill Chain Blueprint, Threat Matrix, and Containment SOP.',
          'Click "Collapse Duplicates" to group identical simulation runs into distinct attack archetypes.',
          'Click "Investigate Forensics" on any chain to open the full visual timeline modal.'
        ]
      }
    ],
    quickLink: { label: 'View Attack Chains', path: '/attack-chains' }
  },
  {
    id: 'fleet',
    title: '6. Agents & Session Registry',
    icon: Users,
    badge: 'Fleet Governance',
    color: '#10B981',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    headline: 'Agent Fleet Identity & Session Isolation',
    description: 'Manage registered AI agents, configure allowed tools and data sensitivities, and audit active interactive sessions.',
    sections: [
      {
        heading: 'Agent Registry Features',
        items: [
          { label: 'Trust Scores', text: 'Dynamic 0-100 reputation score that penalizes agents that trigger security blocks.' },
          { label: 'Tool Scopes', text: 'Explicit allowlists of authorized tools and database connectors per agent.' },
          { label: 'Status Controls', text: 'Freeze, isolate, or activate agents with one-click administrative toggles.' },
        ]
      },
      {
        heading: 'Session Registry & Origin Filtering',
        items: [
          { label: 'Origin Filtering', text: 'Filter sessions between User/Production runs and Automated Simulation tests.' },
          { label: 'Group Identical Intents', text: 'Collapse repetitive simulations to view unique user workflows cleanly.' },
        ]
      }
    ],
    quickLink: { label: 'Manage Agent Fleet', path: '/agents' }
  }
];

const Guide = () => {
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const currentChapter = CHAPTERS[activeChapterIndex] || CHAPTERS[0];

  const filteredChapters = useMemo(() => {
    if (!searchQuery.trim()) return CHAPTERS;
    const q = searchQuery.toLowerCase().trim();
    return CHAPTERS.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.headline.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleNext = () => {
    if (activeChapterIndex < CHAPTERS.length - 1) {
      setActiveChapterIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (activeChapterIndex > 0) {
      setActiveChapterIndex((prev) => prev - 1);
    }
  };

  return (
    <div className="page-container space-y-5 sm:space-y-6">
      {/* Top Handbook Header Banner */}
      <div 
        className="rounded-3xl p-5 sm:p-7 md:p-9 flex flex-col md:flex-row md:items-center justify-between gap-4" 
        style={{ 
          background: 'linear-gradient(135deg, #FFF4ED 0%, #FFFBEB 40%, #F0F9FF 80%, #F5F3FF 100%)', 
          border: '2px solid #FFD0B5',
          boxShadow: '0 8px 30px rgba(255, 107, 53, 0.08)'
        }}
      >
        <div className="max-w-2xl min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span 
              className="text-xs font-mono font-extrabold px-3 py-1 rounded-full text-white shadow-sm" 
              style={{ background: 'linear-gradient(135deg, #FF6B35, #F59E0B)' }}
            >
              📖 COMPLETE PLATFORM GUIDE
            </span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-900 border border-orange-300">
              ● OPERATOR MANUAL
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900" style={{ fontFamily: 'Sora' }}>
            TrustGuard Platform Handbook
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
            Comprehensive architectural guide and operational manual explaining how TrustGuard protects autonomous AI agent fleets through real-time multi-engine arbitration.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button 
            type="button" 
            className="btn btn-primary w-full sm:w-auto justify-center" 
            onClick={() => navigate('/overview')}
          >
            <span>Go to Command Center →</span>
          </button>
        </div>
      </div>

      {/* Mobile Chapter Quick Selector Ribbon (Visible on small screens) */}
      <div className="md:hidden card p-2.5 bg-white border-2 border-orange-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none shadow-2xs">
        {filteredChapters.map((ch, idx) => {
          const originalIdx = CHAPTERS.findIndex((c) => c.id === ch.id);
          const isSelected = activeChapterIndex === originalIdx;
          return (
            <button
              key={ch.id}
              type="button"
              onClick={() => setActiveChapterIndex(originalIdx)}
              className={`px-3 py-1.5 rounded-xl font-extrabold text-[11px] whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 border ${
                isSelected
                  ? 'bg-orange-500 text-white border-orange-600 shadow-2xs'
                  : 'bg-slate-50 text-slate-700 hover:bg-orange-50 border-slate-200'
              }`}
            >
              <span>{ch.title.split('.')[0]}.</span>
              <span>{ch.badge}</span>
            </button>
          );
        })}
      </div>

      {/* Main Full-Size Guidebook Container */}
      <div className="card p-0 overflow-hidden border-2 border-orange-200 shadow-md rounded-3xl flex flex-col md:flex-row min-h-[600px] sm:min-h-[680px]">
        {/* Left Side: Table of Contents / Chapter Navigation (hidden on mobile, visible md+) */}
        <div className="hidden md:flex w-72 lg:w-80 bg-slate-50/80 border-r-2 border-orange-100 p-4 sm:p-5 flex-col justify-between shrink-0 space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-mono font-extrabold uppercase text-slate-500 tracking-wider">
                Chapters ({CHAPTERS.length})
              </span>
              <span className="text-[11px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                {activeChapterIndex + 1} of {CHAPTERS.length}
              </span>
            </div>

            {/* Chapter Search */}
            <div className="flex items-center gap-2 bg-white border-2 border-orange-100 px-3 py-2 rounded-xl text-xs">
              <Search size={14} className="text-orange-500 shrink-0" />
              <input
                type="text"
                placeholder="Search topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-xs font-medium text-slate-800 placeholder-slate-400 w-full"
              />
            </div>

            {/* Chapters List */}
            <div className="space-y-1.5">
              {filteredChapters.map((ch) => {
                const Icon = ch.icon;
                const originalIdx = CHAPTERS.findIndex((c) => c.id === ch.id);
                const isSelected = activeChapterIndex === originalIdx;

                return (
                  <div
                    key={ch.id}
                    onClick={() => setActiveChapterIndex(originalIdx)}
                    className={`p-3.5 rounded-2xl cursor-pointer transition-all flex items-center justify-between gap-2 border-2 ${
                      isSelected
                        ? 'bg-white shadow-md border-orange-400 -translate-y-0.5'
                        : 'hover:bg-white/80 border-transparent hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs"
                        style={{
                          background: isSelected ? ch.bg : '#F1F5F9',
                          color: isSelected ? ch.color : '#64748B',
                          border: `1.5px solid ${isSelected ? ch.border : '#E2E8F0'}`,
                        }}
                      >
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className={`text-xs font-extrabold truncate ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                          {ch.title}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 truncate">
                          {ch.badge}
                        </div>
                      </div>
                    </div>
                    {isSelected && <ChevronRight size={16} style={{ color: ch.color }} className="shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Left Footer: Progress Indicator */}
          <div className="p-3.5 rounded-2xl bg-white border border-orange-100 text-xs font-mono text-slate-600">
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="font-bold">Reading Progress:</span>
              <span className="text-orange-600 font-extrabold">
                {Math.round(((activeChapterIndex + 1) / CHAPTERS.length) * 100)}%
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((activeChapterIndex + 1) / CHAPTERS.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right Side: Chapter Reading Canvas */}
        <div className="flex-1 p-5 sm:p-8 md:p-10 flex flex-col justify-between space-y-6 bg-white overflow-y-auto min-w-0">
          <div className="space-y-5 sm:space-y-6">
            {/* Chapter Hero Banner */}
            <div 
              className="p-5 sm:p-7 rounded-3xl border-2 space-y-2.5 sm:space-y-3 relative overflow-hidden"
              style={{ background: currentChapter.bg, borderColor: currentChapter.border }}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span 
                  className="font-mono text-xs font-extrabold px-3 py-1 rounded-full text-white shadow-2xs"
                  style={{ background: currentChapter.color }}
                >
                  {currentChapter.badge}
                </span>
                {currentChapter.quickLink && (
                  <button
                    type="button"
                    onClick={() => navigate(currentChapter.quickLink.path)}
                    className="btn btn-primary btn-xs shadow-xs text-xs"
                  >
                    <span>{currentChapter.quickLink.label}</span>
                    <ExternalLink size={13} />
                  </button>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900" style={{ fontFamily: 'Sora' }}>
                {currentChapter.headline}
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium max-w-3xl">
                {currentChapter.description}
              </p>
            </div>

            {/* Chapter Detailed Sections */}
            {currentChapter.sections.map((sec, sIdx) => (
              <div key={sIdx} className="space-y-2.5 sm:space-y-3">
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: currentChapter.color }} />
                  <span>{sec.heading}</span>
                </h3>

                {sec.body && (
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-200">
                    {sec.body}
                  </p>
                )}

                {sec.steps && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-orange-100 shadow-xs space-y-2.5 sm:space-y-3">
                    {sec.steps.map((st, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 sm:gap-3 text-xs sm:text-sm text-slate-800">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center bg-orange-100 text-orange-800 font-mono font-bold text-[11px] sm:text-xs shrink-0 mt-0.5 shadow-2xs">
                          {idx + 1}
                        </div>
                        <div className="leading-relaxed font-medium">{st}</div>
                      </div>
                    ))}
                  </div>
                )}

                {sec.items && (
                  <div className="grid grid-cols-1 gap-2 sm:gap-2.5">
                    {sec.items.map((it, idx) => (
                      <div 
                        key={idx} 
                        className="p-3.5 sm:p-4 rounded-2xl border border-orange-100/90 bg-orange-50/30 hover:bg-orange-50/60 transition-colors flex items-start gap-3 text-xs sm:text-sm"
                      >
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <strong className="text-slate-900 block font-bold text-xs sm:text-sm">{it.label}</strong>
                          <span className="text-slate-600 font-normal leading-relaxed mt-0.5 sm:mt-1 block text-xs" dangerouslySetInnerHTML={{ __html: it.text }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Chapter Navigation Footer */}
          <div className="pt-5 sm:pt-6 border-t-2 border-orange-100 flex items-center justify-between flex-wrap gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={handlePrev}
              disabled={activeChapterIndex === 0}
              className="btn btn-secondary btn-xs sm:btn-sm"
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {CHAPTERS.map((ch, idx) => (
                <div
                  key={ch.id}
                  onClick={() => setActiveChapterIndex(idx)}
                  className={`h-2 sm:h-2.5 rounded-full cursor-pointer transition-all ${
                    activeChapterIndex === idx ? 'w-6 sm:w-8 bg-orange-500' : 'w-2 sm:w-2.5 bg-slate-200 hover:bg-slate-300'
                  }`}
                  title={ch.title}
                />
              ))}
            </div>

            {activeChapterIndex < CHAPTERS.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="btn btn-primary btn-xs sm:btn-sm"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/overview')}
                className="btn btn-primary btn-xs sm:btn-sm"
              >
                <span>Finish ✓</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Guide;
