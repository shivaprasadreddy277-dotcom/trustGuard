import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  Lock,
  Eye,
  Activity,
  Cpu,
  Fingerprint,
  Award,
} from 'lucide-react';
import '../landing.css';

const Landing = () => {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState('hero');

  return (
    <div className="landing-body">
      {/* ── Sticky Top Navbar ─────────────────────────────────────────── */}
      <header className="landing-nav">
        <div className="landing-nav-container">
          <Link to="/" className="landing-brand">
            <div className="landing-brand-icon">
              <Shield size={20} />
            </div>
            <span className="landing-brand-name">TrustGuard</span>
          </Link>

          <nav className="landing-nav-links">
            <a
              href="#features"
              className={`landing-nav-link ${activeNav === 'features' ? 'active' : ''}`}
              onClick={() => setActiveNav('features')}
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className={`landing-nav-link ${activeNav === 'how-it-works' ? 'active' : ''}`}
              onClick={() => setActiveNav('how-it-works')}
            >
              How It Works
            </a>
            <a
              href="#metrics"
              className={`landing-nav-link ${activeNav === 'metrics' ? 'active' : ''}`}
              onClick={() => setActiveNav('metrics')}
            >
              Performance
            </a>
            <a
              href="#testimonial"
              className={`landing-nav-link ${activeNav === 'testimonial' ? 'active' : ''}`}
              onClick={() => setActiveNav('testimonial')}
            >
              Customer Story
            </a>
          </nav>

          <div className="landing-nav-actions">
            <Link to="/login" className="btn-landing-secondary">
              Sign In
            </Link>
            <button
              type="button"
              className="btn-landing-primary"
              onClick={() => navigate('/overview')}
            >
              <span>Launch Console</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* ── 1. Hero Section ───────────────────────────────────────────── */}
      <section className="landing-hero" id="hero">
        <div className="landing-container">
          <div className="hero-grid">
            <div>
              <div className="hero-badge">
                <ShieldCheck size={16} />
                <span>Next-Gen Autonomous Agent Security</span>
              </div>

              <h1 className="hero-h1">
                Autonomous Security &amp; Fraud Defense for AI Fleets
              </h1>

              <p className="hero-subtext">
                TrustGuard continuously monitors agent actions, intercepts indirect prompt injections,
                and blocks unauthorized mutations before sensitive data is exposed.
              </p>

              <div className="hero-actions">
                <button
                  type="button"
                  className="btn-landing-primary"
                  onClick={() => navigate('/overview')}
                >
                  <span>Get Protected Now</span>
                  <ArrowRight size={18} />
                </button>
                <Link to="/overview" className="btn-landing-secondary">
                  Live Product Demo
                </Link>
              </div>
            </div>

            {/* Live Security Interactive Visual */}
            <div className="hero-visual-card">
              <div className="flex items-center justify-between border-b border-slate-700/60 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-mono text-xs font-bold text-slate-300">REALTIME ARBITRATION BUS</span>
                </div>
                <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                  5/5 ACTIVE
                </span>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <Fingerprint size={14} className="text-sky-400" />
                    <span className="text-slate-300 font-bold">tool:db_query_users</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                    ALLOW
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <Cpu size={14} className="text-amber-400" />
                    <span className="text-slate-300 font-bold">drift_cosine: 0.74</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 font-bold">
                    REVIEW
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-900/60 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <Lock size={14} className="text-rose-400" />
                    <span className="text-rose-200 font-bold">auth_bypass: ungranted_scope</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800 font-bold">
                    BLOCK
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
                <span>Deterministic arbitration latency</span>
                <span className="font-mono font-bold text-emerald-400">12.4 ms</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Trust Indicators Bar ───────────────────────────────────── */}
      <section className="trust-bar-section">
        <div className="trust-bar-container">
          <span className="trust-bar-label">Enterprise-Grade Security Standards</span>
          <div className="trust-cert-badges">
            <div className="cert-badge-item">
              <Award size={18} />
              <span>SOC2 Type II Certified</span>
            </div>
            <div className="cert-badge-item">
              <CheckCircle2 size={18} />
              <span>ISO 27001 Compliant</span>
            </div>
            <div className="cert-badge-item">
              <ShieldCheck size={18} />
              <span>GDPR Ready</span>
            </div>
            <div className="cert-badge-item">
              <Lock size={18} />
              <span>HIPAA Aligned</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Core Features Section ──────────────────────────────────── */}
      <section className="landing-section" id="features">
        <div className="landing-container">
          <div className="section-header-center">
            <span className="section-eyebrow">Defensive Capabilities</span>
            <h2 className="section-title">Engineered to Neutralize Autonomous AI Vulnerabilities</h2>
            <p className="section-subtitle">
              Traditional firewalls cannot understand LLM logic. TrustGuard analyzes semantic intent,
              data lineage, and behavioral boundaries at runtime.
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <Activity size={24} />
              </div>
              <h3 className="feature-headline">Semantic Intent Drift Tracking</h3>
              <p className="feature-description">
                Calculates real-time vector distance between active agent commands and declared mission objectives,
                instantly intercepting hijacked trajectories.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <Lock size={24} />
              </div>
              <h3 className="feature-headline">Authoritative Policy Enforcement</h3>
              <p className="feature-description">
                Validates database mutations and sensitive tool executions directly against server-registered permissions,
                preventing privilege escalation attacks.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <Shield size={24} />
              </div>
              <h3 className="feature-headline">Multi-Stage Attack Chain Correlation</h3>
              <p className="feature-description">
                Correlates subtle reconnaissance steps across disconnected agent sessions to neutralize sophisticated
                persistent threat campaigns before data exfiltration.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. How It Works Section ───────────────────────────────────── */}
      <section className="landing-section bg-[#071324]" id="how-it-works">
        <div className="landing-container">
          <div className="section-header-center">
            <span className="section-eyebrow">Zero-Friction Architecture</span>
            <h2 className="section-title">How TrustGuard Protects Your Infrastructure</h2>
            <p className="section-subtitle">
              A 3-step automated arbitration pipeline operating seamlessly alongside your agents.
            </p>
          </div>

          <div className="how-it-works-grid">
            <div className="step-card">
              <span className="step-num-pill">01 // INTERCEPT</span>
              <h3 className="step-title">Detect Tool &amp; Data Payloads</h3>
              <p className="step-text">
                TrustGuard intercepts outgoing tool invocations, user prompts, and web retrieval payloads without slowing
                down execution.
              </p>
            </div>

            <div className="step-card">
              <span className="step-num-pill">02 // SYNTHESIZE</span>
              <h3 className="step-title">5-Engine Deterministic Audit</h3>
              <p className="step-text">
                Evaluates authoritative policy, provenance origin, intent drift, risk arbitration, and dynamic trust math in under 15ms.
              </p>
            </div>

            <div className="step-card">
              <span className="step-num-pill">03 // ENFORCE</span>
              <h3 className="step-title">Issue Instant Verdicts</h3>
              <p className="step-text">
                Returns deterministic ALLOW, REVIEW, or BLOCK decisions, recording immutable forensic evidence for compliance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. Live Stats Section ─────────────────────────────────────── */}
      <section className="stats-section" id="metrics">
        <div className="landing-container">
          <div className="stats-grid">
            <div className="stat-item-card">
              <div className="stat-big-number stat-accent">99.98%</div>
              <div className="stat-label-text">Threat Interception Rate</div>
            </div>
            <div className="stat-item-card">
              <div className="stat-big-number">&lt; 14ms</div>
              <div className="stat-label-text">Mean Decision Latency</div>
            </div>
            <div className="stat-item-card">
              <div className="stat-big-number stat-accent">450K+</div>
              <div className="stat-label-text">Agent Actions Evaluated</div>
            </div>
            <div className="stat-item-card">
              <div className="stat-big-number">0</div>
              <div className="stat-label-text">Unauthorized Data Leaks</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. Testimonial Section ────────────────────────────────────── */}
      <section className="landing-section" id="testimonial">
        <div className="landing-container">
          <div className="testimonial-box">
            <div className="quote-mark">“</div>
            <p className="testimonial-quote">
              TrustGuard transformed how our enterprise deploys autonomous agent fleets.
              We now run complex multi-agent workflows with total confidence that our financial records
              and confidential user data remain strictly safeguarded.
            </p>
            <div className="testimonial-author-meta">
              <span className="author-name">Alex Vance</span>
              <span className="author-role">Chief Information Security Officer · NovaCorp Enterprise</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. Pricing / Final CTA Section ────────────────────────────── */}
      <section className="landing-section bg-[#071324]">
        <div className="landing-container">
          <div className="cta-banner-card">
            <h2 className="cta-banner-h2">Ready to Secure Your Autonomous Agent Fleet?</h2>
            <p className="cta-banner-sub">
              Deploy TrustGuard in minutes with zero disruption to your existing agent workflows.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <button
                type="button"
                className="btn-landing-primary"
                onClick={() => navigate('/overview')}
              >
                <span>Launch Security Console</span>
                <ArrowRight size={18} />
              </button>
              <Link to="/login" className="btn-landing-secondary">
                Request Enterprise Demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. Footer ─────────────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="footer-grid">
          <div className="footer-col-brand">
            <div className="flex items-center gap-2">
              <div className="landing-brand-icon" style={{ width: '30px', height: '30px' }}>
                <Shield size={16} />
              </div>
              <span className="font-bold text-lg text-white">TrustGuard</span>
            </div>
            <p className="footer-brand-desc">
              Autonomous AI security and fraud defense platform for enterprise agent fleets.
            </p>
          </div>

          <div>
            <h4 className="footer-col-title">Platform</h4>
            <ul className="footer-links-list">
              <li className="footer-link-item"><Link to="/overview">Command Center</Link></li>
              <li className="footer-link-item"><Link to="/agents">Agent Fleets</Link></li>
              <li className="footer-link-item"><Link to="/events">Telemetry Stream</Link></li>
              <li className="footer-link-item"><Link to="/attack-chains">Attack Chains</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="footer-col-title">Security &amp; Policy</h4>
            <ul className="footer-links-list">
              <li className="footer-link-item"><a href="#how-it-works">5-Engine Arbitration</a></li>
              <li className="footer-link-item"><a href="#features">Intent Drift Sensor</a></li>
              <li className="footer-link-item"><a href="#metrics">Compliance Reports</a></li>
              <li className="footer-link-item"><a href="#testimonial">SOC2 &amp; ISO 27001</a></li>
            </ul>
          </div>

          <div>
            <h4 className="footer-col-title">Company</h4>
            <ul className="footer-links-list">
              <li className="footer-link-item"><Link to="/login">Sign In</Link></li>
              <li className="footer-link-item"><a href="#features">Documentation</a></li>
              <li className="footer-link-item"><a href="#testimonial">Customer Stories</a></li>
              <li className="footer-link-item"><a href="#how-it-works">Security Status</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <span>&copy; {new Date().getFullYear()} TrustGuard Inc. All rights reserved.</span>
          <div className="flex items-center gap-6">
            <a href="#hero" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#hero" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#hero" className="hover:text-white transition-colors">Security Whitepaper</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
