import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Eye,
  FileCode,
  AlertTriangle,
  Copy,
  Check,
  FileText,
} from 'lucide-react';
import { eventsApi, securityApi, agentsApi, sessionsApi } from '../api/client';
import DecisionBadge from '../components/security/DecisionBadge';
import RiskBadge from '../components/security/RiskBadge';
import PolicyResultCard from '../components/security/PolicyResultCard';
import ProvenanceResultCard from '../components/security/ProvenanceResultCard';
import IntentResultCard from '../components/security/IntentResultCard';

const Investigations = () => {
  const [events, setEvents] = useState([]);
  const [agents, setAgents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [securityDecision, setSecurityDecision] = useState(null);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'POLICY' | 'PROVENANCE' | 'INTENT' | 'JSON'
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isLoadingDecision, setIsLoadingDecision] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const fetchEvents = useCallback(async () => {
    setIsLoadingEvents(true);
    setError(null);
    try {
      const [evRes, agRes, sessRes] = await Promise.allSettled([
        eventsApi.listEvents({ limit: 30 }),
        agentsApi.listAgents(),
        sessionsApi.listSessions(),
      ]);

      const rawEvents = evRes.status === 'fulfilled' ? evRes.value.events || [] : [];
      const rawAgents = agRes.status === 'fulfilled' ? agRes.value.agents || [] : [];
      const rawSessions = sessRes.status === 'fulfilled' ? sessRes.value.sessions || [] : [];

      setEvents(rawEvents);
      setAgents(rawAgents);
      setSessions(rawSessions);

      if (rawEvents.length > 0 && !selectedEventId) {
        setSelectedEventId(rawEvents[0].eventId);
      }
    } catch (err) {
      setError(err.message || 'Failed to load telemetry events.');
    } finally {
      setIsLoadingEvents(false);
    }
  }, [selectedEventId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Fetch security decision whenever selectedEventId changes
  useEffect(() => {
    if (!selectedEventId) return;

    let isMounted = true;
    async function loadDecision() {
      setIsLoadingDecision(true);
      try {
        const dec = await securityApi.getDecision(selectedEventId);
        if (isMounted) setSecurityDecision(dec);
      } catch {
        if (isMounted) setSecurityDecision(null);
      } finally {
        if (isMounted) setIsLoadingDecision(false);
      }
    }
    loadDecision();
    return () => {
      isMounted = false;
    };
  }, [selectedEventId]);

  const selectedEvent = events.find((e) => e.eventId === selectedEventId) || events[0];
  const selectedAgent = agents.find((a) => a.agentId === selectedEvent?.agentId);
  const selectedSession = sessions.find((s) => s.sessionId === selectedEvent?.sessionId);

  const handleCopyJson = () => {
    if (!securityDecision) return;
    navigator.clipboard.writeText(JSON.stringify(securityDecision, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-[#48267E] bg-[#F4EFFF] px-2.5 py-0.5 rounded-full border border-[#DFD0F7]">
              🔬 FORENSIC LAB
            </span>
            <span className="text-xs text-[#8F8F8F] font-mono">// Case Evidence & Multi-Engine Chain-of-Custody</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-[#2D2D2D]">
            Forensic Investigation Workbench
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-1">
            Deep-dive forensic evaluation: Event &rarr; Evidence &rarr; Policy &rarr; Provenance &rarr; Intent &rarr; Risk &rarr; Trust &rarr; Verdict.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={fetchEvents}
          disabled={isLoadingEvents}
        >
          <RefreshCw size={14} className={isLoadingEvents ? 'spinner' : ''} />
          <span>Refresh Workbench</span>
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Split Layout: Event Selector on Left, Forensic Workbench on Right */}
      <div className="editorial-split-grid">
        {/* Left Column: Events Selector List */}
        <div className="editorial-card" style={{ maxHeight: '720px' }}>
          <div className="card-editorial-head">
            <h3>
              <Eye size={18} className="text-[#FFC857]" />
              <span>Select Telemetry Event ({events.length})</span>
            </h3>
          </div>

          {isLoadingEvents ? (
            <div className="loading-state">
              <RefreshCw className="spinner" size={18} />
              <span>Loading event stream...</span>
            </div>
          ) : events.length === 0 ? (
            <div className="empty-state-card">
              <p>No events available to inspect.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 overflow-y-auto pr-1">
              {events.map((ev) => {
                const isSelected = ev.eventId === selectedEventId;
                return (
                  <div
                    key={ev.eventId}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#FFF5DD] border-[#FFC857] shadow-sm'
                        : 'bg-[#FAF9F6] border-[#EBEAE6] hover:border-[#DCD9D2]'
                    }`}
                    onClick={() => setSelectedEventId(ev.eventId)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="mono-val text-xs font-bold text-[#48267E]">{ev.eventId}</span>
                      <span className="text-[11px] text-[#8F8F8F]">
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-[#2D2D2D]">{ev.action}</div>
                    <div className="text-xs text-[#6B6B6B] truncate mono-val">{ev.resource}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Multi-Engine Forensic Analysis Workbench */}
        <div className="editorial-card flex-1">
          {selectedEvent ? (
            <div>
              {/* Event Top Banner */}
              <div className="flex items-center justify-between border-b border-[#EBEAE6] pb-4 mb-4 flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-xl font-bold text-[#2D2D2D]">
                      {selectedEvent.action}
                    </h2>
                    <span className="mono-val text-xs text-[#48267E] font-bold bg-[#F4EFFF] px-2 py-0.5 rounded border border-[#DFD0F7]">
                      {selectedEvent.eventId}
                    </span>
                  </div>
                  <p className="text-xs text-[#6B6B6B] mt-1">
                    Tool: <strong>{selectedEvent.tool}</strong> • Target:{' '}
                    <code className="font-mono bg-[#FAF9F6] border border-[#EBEAE6] px-1.5 py-0.5 rounded text-[#07477D]">
                      {selectedEvent.resource}
                    </code>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <RiskBadge risk={securityDecision?.riskLevel || selectedEvent.dataSensitivity || 'LOW'} />
                  <DecisionBadge decision={securityDecision?.decision || 'ALLOW'} size="large" />
                </div>
              </div>

              {/* Forensic Navigation Tabs */}
              <div className="flex items-center gap-2 border-b border-[#EBEAE6] pb-2 mb-4 overflow-x-auto">
                <button
                  type="button"
                  className={`btn btn-xs ${activeTab === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setActiveTab('ALL')}
                >
                  Complete 5-Engine Analysis
                </button>
                <button
                  type="button"
                  className={`btn btn-xs ${activeTab === 'POLICY' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setActiveTab('POLICY')}
                >
                  3.1 Policy
                </button>
                <button
                  type="button"
                  className={`btn btn-xs ${activeTab === 'PROVENANCE' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setActiveTab('PROVENANCE')}
                >
                  3.2 Provenance
                </button>
                <button
                  type="button"
                  className={`btn btn-xs ${activeTab === 'INTENT' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setActiveTab('INTENT')}
                >
                  3.3 Intent Integrity
                </button>
                <button
                  type="button"
                  className={`btn btn-xs ${activeTab === 'JSON' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setActiveTab('JSON')}
                >
                  <FileCode size={13} />
                  <span>Raw JSON</span>
                </button>
              </div>

              {isLoadingDecision ? (
                <div className="loading-state">
                  <RefreshCw className="spinner" size={20} />
                  <span>Synthesizing multi-engine evaluation...</span>
                </div>
              ) : securityDecision ? (
                <div className="flex flex-col gap-4">
                  {/* Tab View: ALL */}
                  {(activeTab === 'ALL' || activeTab === 'POLICY') && (
                    <PolicyResultCard
                      event={selectedEvent}
                      agent={selectedAgent}
                      decision={securityDecision}
                    />
                  )}

                  {(activeTab === 'ALL' || activeTab === 'PROVENANCE') && (
                    <ProvenanceResultCard
                      provenance={selectedEvent.provenance}
                      signals={securityDecision.signals}
                    />
                  )}

                  {(activeTab === 'ALL' || activeTab === 'INTENT') && (
                    <IntentResultCard
                      decision={securityDecision}
                      originalIntent={selectedSession?.originalIntent || 'Session baseline objective'}
                    />
                  )}

                  {/* Security Reasoning Box */}
                  {activeTab === 'ALL' && securityDecision.reasons && (
                    <div className="p-4 bg-[#FAF9F6] border border-[#EBEAE6] rounded-xl">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#2D2D2D] uppercase mb-2">
                        <FileText size={14} className="text-[#FFC857]" />
                        <span>Authoritative Decision Explanations</span>
                      </div>
                      <ul className="list-disc pl-5 text-xs text-[#334155] space-y-1">
                        {securityDecision.reasons.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Raw JSON View */}
                  {activeTab === 'JSON' && (
                    <div className="relative">
                      <button
                        type="button"
                        className="btn btn-secondary btn-xs absolute top-2 right-2"
                        onClick={handleCopyJson}
                      >
                        {copied ? <Check size={12} className="text-[#0E5E41]" /> : <Copy size={12} />}
                        <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                      </button>
                      <pre className="evidence-pre">
                        {JSON.stringify(securityDecision, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="empty-state-card">
                  <p>No decision data recorded for this event.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state-card">
              <p>Select an event from the left list to begin forensic investigation.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Investigations;
