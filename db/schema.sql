-- TrustGuard PostgreSQL Database Schema
-- MVP persistent storage definition

-- Enable UUID extension (if available in environment)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id_str VARCHAR(50) NOT NULL UNIQUE,
    username VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. agents table
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id_str VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    declared_objective TEXT NOT NULL,
    permissions TEXT[] NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    current_trust_score INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_agent_status CHECK (status IN ('ACTIVE', 'SUSPENDED')),
    CONSTRAINT chk_agent_trust CHECK (current_trust_score BETWEEN 0 AND 100)
);

-- 3. sessions table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id_str VARCHAR(50) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE RESTRICT,
    original_intent TEXT NOT NULL,
    current_trust_score INTEGER NOT NULL DEFAULT 100,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_session_status CHECK (status IN ('ACTIVE', 'COMPLETED', 'SUSPENDED')),
    CONSTRAINT chk_session_trust CHECK (current_trust_score BETWEEN 0 AND 100)
);

-- 4. attack_chains table
CREATE TABLE attack_chains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chain_id_str VARCHAR(50) NOT NULL UNIQUE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    summary TEXT NOT NULL,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMPTZ,
    CONSTRAINT chk_chain_severity CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    CONSTRAINT chk_chain_status CHECK (status IN ('ACTIVE', 'RESOLVED'))
);

-- 5. agent_events table
CREATE TABLE agent_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id_str VARCHAR(50) NOT NULL UNIQUE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE RESTRICT,
    parent_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    action VARCHAR(100) NOT NULL,
    tool VARCHAR(100) NOT NULL,
    resource VARCHAR(255) NOT NULL,
    data_sensitivity VARCHAR(20) NOT NULL DEFAULT 'LOW',
    reported_auth_status VARCHAR(20) NOT NULL,
    required_permission VARCHAR(100),
    reported_granted_permissions TEXT[] NOT NULL DEFAULT '{}',
    provenance_source_type VARCHAR(50) NOT NULL,
    provenance_source_id VARCHAR(255) NOT NULL,
    provenance_trust_level VARCHAR(20) NOT NULL,
    event_metadata JSONB NOT NULL DEFAULT '{}',
    attack_chain_id UUID REFERENCES attack_chains(id) ON DELETE SET NULL,
    CONSTRAINT chk_event_sensitivity CHECK (data_sensitivity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    CONSTRAINT chk_event_reported_auth CHECK (reported_auth_status IN ('ALLOWED', 'DENIED', 'UNKNOWN')),
    CONSTRAINT chk_event_provenance_trust CHECK (provenance_trust_level IN ('TRUSTED', 'MEDIUM', 'UNTRUSTED'))
);

-- 6. security_decisions table
CREATE TABLE security_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID UNIQUE NOT NULL REFERENCES agent_events(id) ON DELETE CASCADE,
    decision VARCHAR(20) NOT NULL,
    risk_level VARCHAR(20) NOT NULL,
    trust_score INTEGER NOT NULL,
    intent_status VARCHAR(20) NOT NULL,
    intent_alignment_score NUMERIC(3,2) NOT NULL,
    attack_chain_detected BOOLEAN NOT NULL DEFAULT FALSE,
    attack_chain_severity VARCHAR(20) NOT NULL DEFAULT 'NONE',
    attack_chain_id UUID REFERENCES attack_chains(id) ON DELETE SET NULL,
    security_signals JSONB NOT NULL DEFAULT '{}',
    reasons TEXT[] NOT NULL DEFAULT '{}',
    mitigation_action VARCHAR(50),
    mitigation_masked_content TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_decision_verdict CHECK (decision IN ('ALLOW', 'REVIEW', 'BLOCK')),
    CONSTRAINT chk_decision_risk CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    CONSTRAINT chk_decision_trust CHECK (trust_score BETWEEN 0 AND 100),
    CONSTRAINT chk_decision_intent CHECK (intent_status IN ('ALIGNED', 'DRIFT', 'UNKNOWN')),
    CONSTRAINT chk_decision_intent_score CHECK (intent_alignment_score BETWEEN 0.00 AND 1.00),
    CONSTRAINT chk_decision_chain_severity CHECK (attack_chain_severity IN ('NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))
);

-- 7. alerts table
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id_str VARCHAR(50) NOT NULL UNIQUE,
    event_id UUID REFERENCES agent_events(id) ON DELETE CASCADE,
    attack_chain_id UUID REFERENCES attack_chains(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE RESTRICT,
    severity VARCHAR(20) NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'UNRESOLVED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMPTZ,
    CONSTRAINT chk_alert_severity CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    CONSTRAINT chk_alert_status CHECK (status IN ('UNRESOLVED', 'RESOLVED'))
);

-- 8. simulation_runs table
CREATE TABLE simulation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    simulation_id_str VARCHAR(50) NOT NULL UNIQUE,
    scenario_name VARCHAR(50) NOT NULL,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'RUNNING',
    total_events INTEGER NOT NULL DEFAULT 0,
    final_decision VARCHAR(20),
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    CONSTRAINT chk_sim_scenario CHECK (scenario_name IN ('normal_workflow', 'indirect_injection', 'intent_drift', 'unauthorized_sensitive_access', 'compound_attack')),
    CONSTRAINT chk_sim_status CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED')),
    CONSTRAINT chk_sim_decision CHECK (final_decision IN ('ALLOW', 'REVIEW', 'BLOCK'))
);

-- Essential Performance Indexes
CREATE UNIQUE INDEX idx_users_user_id_str ON users(user_id_str);
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE UNIQUE INDEX idx_agents_agent_id_str ON agents(agent_id_str);
CREATE UNIQUE INDEX idx_sessions_session_id_str ON sessions(session_id_str);
CREATE INDEX idx_sessions_agent_id ON sessions(agent_id);
CREATE INDEX idx_agent_events_session_id_timestamp ON agent_events(session_id, timestamp ASC);
CREATE INDEX idx_agent_events_attack_chain_id ON agent_events(attack_chain_id) WHERE attack_chain_id IS NOT NULL;
CREATE UNIQUE INDEX idx_security_decisions_event_id ON security_decisions(event_id);
CREATE INDEX idx_alerts_status_created_at ON alerts(status, created_at DESC);
CREATE INDEX idx_simulation_runs_session_id ON simulation_runs(session_id) WHERE session_id IS NOT NULL;

