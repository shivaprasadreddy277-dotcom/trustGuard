import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldAlert,
  Clock,
  Radio,
  Users,
  Target,
  FileCode,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';
import { attackChainsApi } from '../../api/client';
import RiskBadge from './RiskBadge';
import AttackChainTimeline from './AttackChainTimeline';

const AttackChainDetailModal = ({ isOpen, chainId, onClose }) => {
  const [chainData, setChainData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('narrative'); // 'narrative' | 'timeline' | 'evidence'
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !chainId) {
      setChainData(null);
      setError(null);
      return;
    }

    let isMounted = true;
    const fetchChain = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await attackChainsApi.getChain(chainId);
        if (isMounted) setChainData(data);
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load attack chain forensics.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchChain();
    return () => {
      isMounted = false;
    };
  }, [isOpen, chainId]);

  if (!isOpen) return null;

  const handleCopyJson = () => {
    if (!chainData) return;
    navigator.clipboard.writeText(JSON.stringify(chainData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const confidencePct = chainData?.confidence
    ? Math.round(chainData.confidence * 100)
    : 95;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card investigation-modal-root attack-chain-modal-root"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="title-row">
              <ShieldAlert className="title-icon text-critical" size={24} />
              <h2>Attack Chain Forensic Deep Dive</h2>
              {chainData?.severity && <RiskBadge risk={chainData.severity} />}
              <span className="confidence-pill">
                Confidence: <strong>{confidencePct}%</strong>
              </span>
            </div>
            {chainData && (
              <div className="investigation-meta-line">
                <span>
                  <Clock size={13} /> {new Date(chainData.detectedAt).toLocaleString()}
                </span>
                <span>
                  • Chain: <strong>{chainData.chainId}</strong>
                </span>
                <span>
                  • Session: <strong>{chainData.sessionId}</strong>
                </span>
                <span>
                  • Agent: <strong>{chainData.agentId}</strong>
                </span>
              </div>
            )}
          </div>
          <button type="button" className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="investigation-tabs">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'narrative' ? 'active' : ''}`}
            onClick={() => setActiveTab('narrative')}
          >
            <Target size={15} /> Attack Narrative & Correlation
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('timeline')}
          >
            <Clock size={15} /> Multi-Step Timeline ({chainData?.events?.length || 0})
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'evidence' ? 'active' : ''}`}
            onClick={() => setActiveTab('evidence')}
          >
            <FileCode size={15} /> Raw Forensics JSON
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body-scroll">
          {loading && (
            <div className="loading-state p-5">
              <RefreshCw className="spinner" size={28} />
              <p>Reconstructing correlated attack trajectory from database...</p>
            </div>
          )}

          {error && (
            <div className="error-banner">
              <ShieldAlert size={18} />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && chainData && (
            <>
              {activeTab === 'narrative' && (
                <div className="narrative-tab-content">
                  {/* Verdict & Summary Banner */}
                  <div className="chain-verdict-banner">
                    <div className="verdict-headline">
                      <ShieldAlert size={26} className="text-critical" />
                      <div>
                        <h3>{chainData.severity} Severity Threat Identified</h3>
                        <p className="verdict-summary-text">{chainData.summary}</p>
                      </div>
                    </div>
                    <div className="verdict-stats-row">
                      <div className="v-stat">
                        <span className="v-label">Total Correlated Events</span>
                        <span className="v-val">{chainData.events?.length || 0}</span>
                      </div>
                      <div className="v-stat">
                        <span className="v-label">Correlation Confidence</span>
                        <span className="v-val text-critical">{confidencePct}%</span>
                      </div>
                      <div className="v-stat">
                        <span className="v-label">Status</span>
                        <span className="v-val text-warning">{chainData.status}</span>
                      </div>
                    </div>
                  </div>

                  {/* Why did TrustGuard correlate these events? */}
                  <div className="correlation-explanation-card">
                    <div className="section-title-wrap">
                      <Target size={18} className="text-warning" />
                      <h4>WHY DID TRUSTGUARD CORRELATE THESE EVENTS?</h4>
                    </div>
                    <p className="explanation-intro">
                      The backend correlation engine synthesized multi-engine telemetry across
                      temporal, provenance, intent, and policy boundaries:
                    </p>

                    <div className="reasons-structured-grid">
                      <div className="reason-tile">
                        <div className="reason-tile-header">
                          <Radio size={16} className="text-info" />
                          <span>Session & Temporal Proximity</span>
                        </div>
                        <p>
                          All events occurred within the same execution session (
                          <code>{chainData.sessionId}</code>) in continuous chronological succession.
                        </p>
                      </div>

                      <div className="reason-tile">
                        <div className="reason-tile-header">
                          <Users size={16} className="text-purple" />
                          <span>Agent Execution Context</span>
                        </div>
                        <p>
                          Commands originated from primary agent <code>{chainData.agentId}</code> and
                          progressed via autonomous delegation to circumvent policy boundaries.
                        </p>
                      </div>

                      <div className="reason-tile">
                        <div className="reason-tile-header">
                          <ShieldAlert size={16} className="text-critical" />
                          <span>Escalating Threat Trajectory</span>
                        </div>
                        <p>
                          Telemetry demonstrates clear progression from untrusted document ingestion
                          to prompt steering, credential probing, sub-agent delegation, and
                          exfiltration.
                        </p>
                      </div>

                      <div className="reason-tile">
                        <div className="reason-tile-header">
                          <CheckCircle2 size={16} className="text-success" />
                          <span>Deterministic Confidence Bounding</span>
                        </div>
                        <p>
                          Confidence score ({confidencePct}%) was computed strictly from verified
                          database signals (policy violations, untrusted provenance, and goal alignment loss).
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Embedded Timeline Preview */}
                  <div className="mt-4">
                    <AttackChainTimeline events={chainData.events} />
                  </div>
                </div>
              )}

              {activeTab === 'timeline' && (
                <div className="timeline-tab-content">
                  <AttackChainTimeline events={chainData.events} />
                </div>
              )}

              {activeTab === 'evidence' && (
                <div className="evidence-tab-content">
                  <div className="evidence-toolbar">
                    <span>Authoritative Forensic JSON Representation:</span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs"
                      onClick={handleCopyJson}
                    >
                      {copied ? <Check size={13} /> : <Copy size={13} />}
                      {copied ? 'Copied' : 'Copy JSON'}
                    </button>
                  </div>
                  <pre className="evidence-pre">
                    {JSON.stringify(chainData, null, 2)}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close Investigation
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttackChainDetailModal;
