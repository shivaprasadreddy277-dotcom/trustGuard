import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, X, ChevronRight, ChevronLeft, ArrowRight, ShieldCheck, 
  Zap, Layers, ShieldAlert, Database, Search, CheckCircle2, 
  GitBranch, PlaySquare, FileText, Terminal, Users, Send, 
  Sparkles, ExternalLink, HelpCircle, Eye, Shield, Lock, Radio 
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
    headline: 'Welcome to TrustGuard Security Mesh',
    description: 'TrustGuard is a real-time security arbitration platform that intercepts, evaluates, and contains unauthorized AI agent actions before they execute.',
    sections: [
      {
        heading: 'What problem does TrustGuard solve?',
        body: 'When autonomous AI agents interact with external documents, databases, APIs, and sub-agents, they can be tricked by prompt injections, drift from user instructions, or attempt lateral privilege escalation. TrustGuard intercepts every tool call with zero LLM hallucination risk.'
      },
      {
        heading: 'The 5-Engine Real-Time Arbitration Pipeline',
        items: [
          { label: '1. Input Provenance Engine', text: 'Tags all inputs with cryptographic trust levels (TRUSTED vs UNTRUSTED).' },
          { label: '2. Intent Drift Engine', text: 'Computes cosine vector similarity against initial session intent baseline.' },
          { label: '3. Scope & Token Engine', text: 'Validates cryptographic token claims for target database and tool connectors.' },
          { label: '4. Dynamic Policy Engine', text: 'Enforces deterministic regex, keyword, and resource boundary rules.' },
          { label: '5. Risk Scoring Engine', text: 'Produces authoritative verdict: ALLOW, REVIEW, or BLOCK.' },
        ]
      }
    ],
    quickLink: { label: 'Explore Fleet Dashboard', path: '/' }
  },
  {
    id: 'simulations',
    title: '2. Security Simulation Lab',
    icon: PlaySquare,
    badge: 'Sandbox',
    color: '#F43F5E',
    bg: '#FFF1F2',
    border: '#FECDD3',
    headline: 'Test Controlled AI Attacks in the Sandbox',
    description: 'Execute realistic multi-stage AI exploits against the live security pipeline and observe real-time detection in isolated sandboxes.',
    sections: [
      {
        heading: 'How to Run a Simulation',
        steps: [
          'Navigate to the Simulations page from the sidebar.',
          'Select an attack vector (e.g. Featured Compound Attack, Indirect Injection, or Intent Drift).',
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
    quickLink: { label: 'Launch Simulation Studio', path: '/simulations' }
  },
  {
    id: 'events',
    title: '3. Live Telemetry Stream',
    icon: Zap,
    badge: 'Real-Time',
    color: '#0EA5E9',
    bg: '#F0F9FF',
    border: '#BAE6FD',
    headline: 'Real-Time Interception & Telemetry Stream',
    description: 'Every tool invocation across the agent fleet is recorded as a structured telemetry event with execution parameters, lineage, and arbitration verdicts.',
    sections: [
      {
        heading: 'Using the Telemetry Stream',
        steps: [
          'Browse real-time event logs with timestamps, agent IDs, and execution tools.',
          'Click any event row to open the full-width in-place telemetry card.',
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
    badge: 'SOC Triage',
    color: '#E11D48',
    bg: '#FFF1F2',
    border: '#FECDD3',
    headline: 'Side-by-Side Incident Queue & Forensic Console',
    description: 'When an agent violates security bounds, an incident alert is generated with immediate side-by-side triage capabilities.',
    sections: [
      {
        heading: 'Side-by-Side Triage Workflow',
        steps: [
          'Left Panel: Search and filter unresolved incidents by severity or status.',
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
    badge: 'Trajectories',
    color: '#8B5CF6',
    bg: '#F5F3FF',
    border: '#DDD6FE',
    headline: 'Correlating Discrete Events into Compound Chains',
    description: 'TrustGuard correlates discrete agent events over time into 5-stage compound attack trajectories.',
    sections: [
      {
        heading: 'The 5-Stage Trajectory Progression',
        items: [
          { label: 'Stage 01: Untrusted Input', text: 'Agent ingests external document containing hidden payload.' },
          { label: 'Stage 02: Prompt Influence', text: 'Untrusted text steers LLM execution context away from baseline.' },
          { label: 'Stage 03: Intent Drift', text: 'Agent queries credentials or sensitive tables deviating from baseline.' },
          { label: 'Stage 04: Lateral Delegation', text: 'Agent spawns sub-agent to bypass primary permission restrictions.' },
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
    badge: 'Governance',
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

const PlatformGuideModal = ({ isOpen, onClose }) => {
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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

  const handleJumpToPage = (path) => {
    onClose();
    navigate(path);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs transition-opacity duration-300"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* ── Slide-Over Side Drawer from Right Edge ── */}
      <div 
        className="fixed inset-y-0 right-0 z-50 w-full max-w-xl sm:max-w-2xl bg-white shadow-2xl border-l-2 border-orange-200 flex flex-col overflow-hidden animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: '-10px 0 40px rgba(0,0,0,0.2)' }}
      >
        {/* Drawer Header */}
        <div 
          className="p-5 sm:p-6 border-b-2 border-orange-100 flex items-center justify-between flex-wrap gap-3 shrink-0" 
          style={{ background: 'linear-gradient(135deg, #FFF9F5 0%, #FFFFFF 100%)' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0"
              style={{ background: 'linear-gradient(135deg, #FF6B35, #F59E0B)' }}
            >
              <BookOpen size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-extrabold px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-900 border border-orange-300">
                  PLATFORM USER GUIDE
                </span>
                <span className="text-[11px] font-bold text-slate-500 hidden sm:inline">
                  {activeChapterIndex + 1} of {CHAPTERS.length}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-0.5 truncate" style={{ fontFamily: 'Sora' }}>
                TrustGuard Operator Handbook
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 transition-colors cursor-pointer"
              title="Close Guide Drawer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Chapter Quick Switcher Ribbon */}
        <div className="p-2.5 bg-slate-50 border-b border-orange-100 flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
          {filteredChapters.map((ch, idx) => {
            const isSelected = CHAPTERS[activeChapterIndex]?.id === ch.id;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => {
                  const originalIdx = CHAPTERS.findIndex((c) => c.id === ch.id);
                  setActiveChapterIndex(originalIdx);
                }}
                className={`px-3 py-1.5 rounded-xl font-extrabold text-[11px] whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 border ${
                  isSelected
                    ? 'bg-orange-500 text-white border-orange-600 shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-orange-50 border-slate-200'
                }`}
              >
                <span>{ch.title.split('.')[0]}.</span>
                <span>{ch.badge}</span>
              </button>
            );
          })}
        </div>

        {/* Drawer Scrollable Content Body */}
        <div className="flex-1 p-5 sm:p-7 overflow-y-auto space-y-5 bg-white">
          {/* Chapter Hero Card */}
          <div 
            className="p-5 rounded-2xl border-2 space-y-2 relative overflow-hidden"
            style={{ background: currentChapter.bg, borderColor: currentChapter.border }}
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span 
                className="font-mono text-[10px] font-extrabold px-2.5 py-0.5 rounded-full text-white shadow-2xs"
                style={{ background: currentChapter.color }}
              >
                {currentChapter.badge}
              </span>
              {currentChapter.quickLink && (
                <button
                  type="button"
                  onClick={() => handleJumpToPage(currentChapter.quickLink.path)}
                  className="btn btn-primary btn-xs shadow-xs text-[11px]"
                >
                  <span>{currentChapter.quickLink.label}</span>
                  <ExternalLink size={11} />
                </button>
              )}
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 pt-0.5" style={{ fontFamily: 'Sora' }}>
              {currentChapter.headline}
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              {currentChapter.description}
            </p>
          </div>

          {/* Chapter Content Sections */}
          {currentChapter.sections.map((sec, sIdx) => (
            <div key={sIdx} className="space-y-2.5">
              <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: currentChapter.color }} />
                <span>{sec.heading}</span>
              </h4>

              {sec.body && (
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  {sec.body}
                </p>
              )}

              {sec.steps && (
                <div className="p-3.5 rounded-xl bg-white border-2 border-orange-100 shadow-2xs space-y-2">
                  {sec.steps.map((st, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center bg-orange-100 text-orange-800 font-mono font-bold text-[10px] shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <div className="leading-relaxed font-medium">{st}</div>
                    </div>
                  ))}
                </div>
              )}

              {sec.items && (
                <div className="grid grid-cols-1 gap-2">
                  {sec.items.map((it, idx) => (
                    <div 
                      key={idx} 
                      className="p-3 rounded-xl border border-orange-100/90 bg-orange-50/30 hover:bg-orange-50/60 transition-colors flex items-start gap-2.5 text-xs"
                    >
                      <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-900 block font-bold text-xs">{it.label}</strong>
                        <span className="text-slate-600 font-normal leading-relaxed mt-0.5 block" dangerouslySetInnerHTML={{ __html: it.text }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Drawer Footer Navigation */}
        <div className="p-4 border-t-2 border-orange-100 bg-slate-50 flex items-center justify-between flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={handlePrev}
            disabled={activeChapterIndex === 0}
            className="btn btn-secondary btn-xs"
          >
            <ChevronLeft size={13} />
            <span>Previous</span>
          </button>

          <div className="flex items-center gap-1.5">
            {CHAPTERS.map((ch, idx) => (
              <div
                key={ch.id}
                onClick={() => setActiveChapterIndex(idx)}
                className={`h-2 rounded-full cursor-pointer transition-all ${
                  activeChapterIndex === idx ? 'w-5 bg-orange-500' : 'w-2 bg-slate-300 hover:bg-slate-400'
                }`}
                title={ch.title}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {activeChapterIndex < CHAPTERS.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="btn btn-primary btn-xs"
              >
                <span>Next Chapter</span>
                <ChevronRight size={13} />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="btn btn-primary btn-xs"
              >
                <span>Done ✓</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformGuideModal;
