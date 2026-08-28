/**
 * TrustGuard — Cycle 3 Security Intelligence Tests
 *
 * Comprehensive tests for:
 *   3.1 Policy Engine
 *   3.2 Provenance Engine
 *   3.3 Intent Integrity Engine
 *   3.4 Risk & Decision Engine
 *   3.5 Dynamic Trust Engine
 *   Integration: Full Ingestion Pipeline & GET /api/security/decisions/:eventId
 *
 * Run: npm run test:security
 */
'use strict';

process.env.JWT_SECRET = 'test-only-secret-do-not-use-in-production';
process.env.JWT_EXPIRES_IN = '1h';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgres://test:test@localhost/trustguard_test';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { newDb } = require('pg-mem');

// Engines unit testing imports
const { evaluatePolicy } = require('../engines/policyEngine');
const { evaluateProvenance } = require('../engines/provenanceEngine');
const { evaluateIntent } = require('../engines/intentEngine');
const { evaluateRiskAndDecision } = require('../engines/riskDecisionEngine');
const { calculateTrustScore } = require('../engines/trustEngine');
const { evaluateEvent } = require('../engines/securityPipeline');

// ── Set up In-Memory DB & Mock Pool for Integration Tests ────────────────────
const SCHEMA_PATH = path.resolve(__dirname, '../../db/schema.sql');
const memDb = newDb();

memDb.public.registerFunction({
  name: 'uuid_generate_v4',
  returns: memDb.public.getType('uuid'),
  implementation: () => crypto.randomUUID(),
});

const pgAdapter = memDb.adapters.createPg();
const { Pool: MemPool } = pgAdapter;
const testPool = new MemPool();

const rawSchema = fs.readFileSync(SCHEMA_PATH, 'utf8')
  .replace(/CREATE EXTENSION.*?;/gi, '')
  .replace(/gen_random_uuid\(\)/g, 'uuid_generate_v4()');

const USER_A_ID = '11111111-1111-1111-1111-111111111111';
const AGENT_001_ID = '33333333-3333-3333-3333-333333333333';
const SESS_A_ID = '55555555-5555-5555-5555-555555555555';

const SEED_SQL = `
  INSERT INTO users (id, user_id_str, username, name, email, password_hash) VALUES
  ('${USER_A_ID}', 'usr_test_a', 'user_a', 'User Alpha', 'usera@trustguard.test', 'hash');

  INSERT INTO agents (id, agent_id_str, name, description, declared_objective, permissions, status, current_trust_score) VALUES
  (
    '${AGENT_001_ID}',
    'agent_001',
    'NovaCorp Support Agent',
    'Customer service & query assistant.',
    'Analyze NovaCorp Q2 and Q3 financial reports and prepare an executive summary.',
    ARRAY['file.read', 'db.read', 'reports.read'],
    'ACTIVE',
    95
  );

  INSERT INTO sessions (id, session_id_str, user_id, agent_id, original_intent, current_trust_score, status) VALUES
  (
    '${SESS_A_ID}',
    'sess_sec_test',
    '${USER_A_ID}',
    '${AGENT_001_ID}',
    'Analyze NovaCorp Q2 and Q3 financial reports and prepare an executive summary.',
    95,
    'ACTIVE'
  );
`;

testPool.query(rawSchema)
  .then(() => testPool.query(SEED_SQL))
  .catch((err) => {
    console.error('[Security Test DB Setup Error]', err.message);
    process.exit(1);
  });

const poolPath = require.resolve('../db/pool');
require.cache[poolPath] = { id: poolPath, filename: poolPath, loaded: true, exports: testPool };

const http = require('http');
const app = require('../app');

const tokenA = jwt.sign(
  { userId: USER_A_ID, userIdStr: 'usr_test_a', username: 'user_a', email: 'usera@trustguard.test' },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

function req(method, urlPath, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : '';
    const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) };
    if (token) headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      const opts = { hostname: '127.0.0.1', port, path: urlPath, method, headers };
      const r = http.request(opts, (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => {
          server.close();
          try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode, body: data }); }
        });
      });
      r.on('error', (e) => { server.close(); reject(e); });
      if (payload) r.write(payload);
      r.end();
    });
  });
}

// ════════════════════════════════════════════════════════════════════════════════
// 3.1 POLICY ENGINE TESTS
// ════════════════════════════════════════════════════════════════════════════════
test('1. Policy: Authorized permission matches registered permissions', () => {
  const res = evaluatePolicy({
    registeredPermissions: ['file.read', 'db.read'],
    requiredPermission: 'file.read',
  });
  assert.equal(res.isAuthorized, true);
  assert.equal(res.policyViolation, false);
});

test('2. Policy: Unauthorized permission yields policyViolation === true', () => {
  const res = evaluatePolicy({
    registeredPermissions: ['file.read', 'db.read'],
    requiredPermission: 'network.send',
  });
  assert.equal(res.isAuthorized, false);
  assert.equal(res.policyViolation, true);
  assert.match(res.reason, /Policy Violation/);
});

test('3. Policy: False reported granted permission does NOT grant authorization', () => {
  const res = evaluatePolicy({
    registeredPermissions: ['file.read'],
    requiredPermission: 'network.send',
    reportedPermissions: ['network.send', 'admin.root'],
  });
  assert.equal(res.isAuthorized, false);
  assert.equal(res.policyViolation, true);
  assert.match(res.reason, /falsely claimed/);
});

test('4. Policy: Self-reported ALLOWED status without permission is still a violation', () => {
  const res = evaluatePolicy({
    registeredPermissions: ['file.read'],
    requiredPermission: 'system.shell',
    reportedAuthStatus: 'ALLOWED',
  });
  assert.equal(res.isAuthorized, false);
  assert.equal(res.policyViolation, true);
  assert.match(res.reason, /self-reported status ALLOWED/);
});

test('5. Policy: Empty registered permissions rejects any required permission', () => {
  const res = evaluatePolicy({
    registeredPermissions: [],
    requiredPermission: 'file.read',
  });
  assert.equal(res.isAuthorized, false);
  assert.equal(res.policyViolation, true);
});

test('6. Policy: Action requiring no permission is authorized', () => {
  const res = evaluatePolicy({
    registeredPermissions: ['file.read'],
    requiredPermission: null,
  });
  assert.equal(res.isAuthorized, true);
  assert.equal(res.policyViolation, false);
});

// ════════════════════════════════════════════════════════════════════════════════
// 3.2 PROVENANCE ENGINE TESTS
// ════════════════════════════════════════════════════════════════════════════════
test('7. Provenance: TRUSTED source results in LOW provenance risk', () => {
  const res = evaluateProvenance({
    sourceType: 'USER',
    sourceId: 'prompt_01',
    trustLevel: 'TRUSTED',
  });
  assert.equal(res.provenanceRisk, 'LOW');
  assert.match(res.reason, /Low provenance risk/);
});

test('8. Provenance: MEDIUM source results in MEDIUM provenance risk', () => {
  const res = evaluateProvenance({
    sourceType: 'INTERNAL_DOCUMENT',
    sourceId: 'doc_internal',
    trustLevel: 'MEDIUM',
  });
  assert.equal(res.provenanceRisk, 'MEDIUM');
  assert.match(res.reason, /Moderate provenance risk/);
});

test('9. Provenance: UNTRUSTED source results in HIGH provenance risk', () => {
  const res = evaluateProvenance({
    sourceType: 'EXTERNAL_DOCUMENT',
    sourceId: 'doc_external',
    trustLevel: 'UNTRUSTED',
  });
  assert.equal(res.provenanceRisk, 'HIGH');
  assert.match(res.reason, /High provenance risk/);
});

// ════════════════════════════════════════════════════════════════════════════════
// 3.3 INTENT INTEGRITY ENGINE TESTS
// ════════════════════════════════════════════════════════════════════════════════
test('10. Intent: Action matching original financial intent is ALIGNED', () => {
  const res = evaluateIntent({
    originalIntent: 'Analyze NovaCorp Q2 and Q3 financial reports and prepare an executive summary.',
    action: 'file.read',
    tool: 'file_reader',
    resource: 'NovaCorp_Q2_Report.pdf',
    dataSensitivity: 'MEDIUM',
  });
  assert.equal(res.status, 'ALIGNED');
  assert.equal(res.intentDrift, false);
  assert.ok(res.alignmentScore >= 0.7);
});

test('11. Intent: Credential theft or unauthorized DB exfil triggers DRIFT', () => {
  const res = evaluateIntent({
    originalIntent: 'Analyze NovaCorp Q2 and Q3 financial reports and prepare an executive summary.',
    action: 'http_post',
    tool: 'network_client',
    resource: 'https://external-attacker.com/credentials',
    dataSensitivity: 'CRITICAL',
  });
  assert.equal(res.status, 'DRIFT');
  assert.equal(res.intentDrift, true);
  assert.ok(res.alignmentScore < 0.5);
  assert.match(res.reason, /Intent Drift/);
});

test('12. Intent: Alignment score is strictly bounded between 0.00 and 1.00', () => {
  const res1 = evaluateIntent({ originalIntent: 'Test intent', action: 'read', resource: 'file' });
  assert.ok(res1.alignmentScore >= 0.0 && res1.alignmentScore <= 1.0);

  const res2 = evaluateIntent({ originalIntent: '', action: 'read', resource: 'file' });
  assert.ok(res2.alignmentScore >= 0.0 && res2.alignmentScore <= 1.0);
});

// ════════════════════════════════════════════════════════════════════════════════
// 3.4 RISK & DECISION ENGINE TESTS
// ════════════════════════════════════════════════════════════════════════════════
test('13. Decision: Safe authorized action yields LOW risk and ALLOW verdict', () => {
  const res = evaluateRiskAndDecision({
    policyResult: { policyViolation: false, isAuthorized: true },
    provenanceResult: { provenanceRisk: 'LOW', trustLevel: 'TRUSTED' },
    intentResult: { status: 'ALIGNED', alignmentScore: 0.95, intentDrift: false },
    dataSensitivity: 'LOW',
    currentTrustScore: 95,
  });
  assert.equal(res.riskLevel, 'LOW');
  assert.equal(res.decision, 'ALLOW');
  assert.equal(res.securitySignals.policyViolation, false);
});

test('14. Decision: Unauthorized access to sensitive resource yields CRITICAL risk and BLOCK verdict', () => {
  const res = evaluateRiskAndDecision({
    policyResult: { policyViolation: true, isAuthorized: false, reason: 'Policy Violation' },
    provenanceResult: { provenanceRisk: 'HIGH', trustLevel: 'UNTRUSTED', sourceType: 'EXTERNAL_DOCUMENT', sourceId: 'doc_01' },
    intentResult: { status: 'DRIFT', alignmentScore: 0.1, intentDrift: true },
    dataSensitivity: 'CRITICAL',
    currentTrustScore: 95,
  });
  assert.equal(res.riskLevel, 'CRITICAL');
  assert.equal(res.decision, 'BLOCK');
  assert.equal(res.securitySignals.policyViolation, true);
  assert.equal(res.securitySignals.intentDrift, true);
  assert.ok(res.reasons.length >= 2);
});

test('15. Decision: Moderate intent drift on medium data yields REVIEW verdict', () => {
  const res = evaluateRiskAndDecision({
    policyResult: { policyViolation: false, isAuthorized: true },
    provenanceResult: { provenanceRisk: 'LOW', trustLevel: 'TRUSTED' },
    intentResult: { status: 'DRIFT', alignmentScore: 0.35, intentDrift: true },
    dataSensitivity: 'MEDIUM',
    currentTrustScore: 80,
  });
  assert.equal(res.decision, 'REVIEW');
});

// ════════════════════════════════════════════════════════════════════════════════
// 3.5 DYNAMIC TRUST ENGINE TESTS
// ════════════════════════════════════════════════════════════════════════════════
test('16. Trust: Safe ALLOW does not reduce trust score', () => {
  const newScore = calculateTrustScore({
    currentTrustScore: 95,
    decision: 'ALLOW',
    riskLevel: 'LOW',
    policyViolation: false,
    intentDrift: false,
  });
  assert.ok(newScore >= 95, 'Trust should remain stable or increment');
});

test('17. Trust: REVIEW verdict degrades trust moderately', () => {
  const newScore = calculateTrustScore({
    currentTrustScore: 90,
    decision: 'REVIEW',
    riskLevel: 'HIGH',
    intentDrift: true,
  });
  assert.ok(newScore < 90, 'Trust should decrease on REVIEW');
  assert.equal(newScore, 70);
});

test('18. Trust: CRITICAL BLOCK significantly degrades trust', () => {
  const newScore = calculateTrustScore({
    currentTrustScore: 80,
    decision: 'BLOCK',
    riskLevel: 'CRITICAL',
    policyViolation: true,
  });
  assert.equal(newScore, 40, 'CRITICAL BLOCK reduces trust by 40 points');
});

test('19. Trust: Score never drops below 0', () => {
  const newScore = calculateTrustScore({
    currentTrustScore: 10,
    decision: 'BLOCK',
    riskLevel: 'CRITICAL',
    policyViolation: true,
  });
  assert.equal(newScore, 0, 'Score must be clamped at minimum 0');
});

test('20. Trust: Score never exceeds 100', () => {
  const newScore = calculateTrustScore({
    currentTrustScore: 100,
    decision: 'ALLOW',
    riskLevel: 'LOW',
  });
  assert.equal(newScore, 100, 'Score must be clamped at maximum 100');
});

// ════════════════════════════════════════════════════════════════════════════════
// INTEGRATION & API ENDPOINT TESTS (POST /events & GET /decisions/:eventId)
// ════════════════════════════════════════════════════════════════════════════════
test('21. Integration: End-to-end safe event ingestion returns 201 ALLOW Security Result', async () => {
  const payload = {
    eventId: 'evt_sec_allow_01',
    sessionId: 'sess_sec_test',
    agentId: 'agent_001',
    timestamp: '2026-08-27T21:10:00Z',
    action: 'file.read',
    tool: 'file_system',
    resource: 'NovaCorp_Q2_Report.pdf',
    dataSensitivity: 'LOW',
    authorization: {
      status: 'ALLOWED',
      requiredPermission: 'file.read',
      grantedPermissions: ['file.read'],
    },
    provenance: {
      sourceType: 'USER',
      sourceId: 'prompt_01',
      trustLevel: 'TRUSTED',
    },
  };

  const res = await req('POST', '/api/agent/events', payload, tokenA);
  assert.equal(res.status, 201);
  assert.equal(res.body.eventId, 'evt_sec_allow_01');
  assert.equal(res.body.decision, 'ALLOW');
  assert.equal(res.body.riskLevel, 'LOW');
  assert.equal(res.body.intent.status, 'ALIGNED');
  assert.equal(res.body.securitySignals.policyViolation, false);
});

test('22. Integration: End-to-end unauthorized attack event returns 201 BLOCK Security Result', async () => {
  const payload = {
    eventId: 'evt_sec_block_01',
    sessionId: 'sess_sec_test',
    agentId: 'agent_001',
    timestamp: '2026-08-27T21:12:00Z',
    action: 'network.send',
    tool: 'http_client',
    resource: 'https://malicious-exfil.com/credentials',
    dataSensitivity: 'CRITICAL',
    authorization: {
      status: 'ALLOWED', // False claimed status
      requiredPermission: 'network.send', // Not in agent_001 permissions
      grantedPermissions: ['network.send'],
    },
    provenance: {
      sourceType: 'EXTERNAL_DOCUMENT',
      sourceId: 'injected_prompt.pdf',
      trustLevel: 'UNTRUSTED',
    },
  };

  const res = await req('POST', '/api/agent/events', payload, tokenA);
  assert.equal(res.status, 201);
  assert.equal(res.body.eventId, 'evt_sec_block_01');
  assert.equal(res.body.decision, 'BLOCK');
  assert.equal(res.body.riskLevel, 'CRITICAL');
  assert.equal(res.body.intent.status, 'DRIFT');
  assert.equal(res.body.securitySignals.policyViolation, true);
  assert.equal(res.body.securitySignals.intentDrift, true);
  assert.equal(res.body.securitySignals.provenanceRisk, 'HIGH');
});

test('23. Integration: security_decisions row is persisted in database', async () => {
  const dbRes = await testPool.query(
    `SELECT d.* FROM security_decisions d
     JOIN agent_events e ON d.event_id = e.id
     WHERE e.event_id_str = 'evt_sec_block_01'`
  );
  assert.equal(dbRes.rows.length, 1, 'Decision record must exist in DB');
  assert.equal(dbRes.rows[0].decision, 'BLOCK');
  assert.equal(dbRes.rows[0].risk_level, 'CRITICAL');
  assert.equal(dbRes.rows[0].intent_status, 'DRIFT');
});

test('24. Integration: Dynamic trust score updated in sessions and agents table', async () => {
  const sessRes = await testPool.query(
    `SELECT current_trust_score FROM sessions WHERE session_id_str = 'sess_sec_test'`
  );
  assert.ok(sessRes.rows[0].current_trust_score < 90, 'Session trust score must be degraded');

  const agentRes = await testPool.query(
    `SELECT current_trust_score FROM agents WHERE agent_id_str = 'agent_001'`
  );
  assert.ok(agentRes.rows[0].current_trust_score < 90, 'Agent trust score must be degraded');
});

test('25. Integration: GET /api/security/decisions/:eventId returns full analysis', async () => {
  const res = await req('GET', '/api/security/decisions/evt_sec_block_01', null, tokenA);
  assert.equal(res.status, 200);
  assert.equal(res.body.eventId, 'evt_sec_block_01');
  assert.equal(res.body.decision, 'BLOCK');
  assert.equal(res.body.riskLevel, 'CRITICAL');
  assert.equal(res.body.intent.status, 'DRIFT');
  assert.equal(res.body.securitySignals.policyViolation, true);
  assert.ok(Array.isArray(res.body.reasons));
});

test('26. Integration: GET /api/security/decisions/:eventId for nonexistent event returns 404', async () => {
  const res = await req('GET', '/api/security/decisions/evt_does_not_exist', null, tokenA);
  assert.equal(res.status, 404);
  assert.equal(res.body.error?.code, 'DECISION_NOT_FOUND');
});

test('27. Integration: GET /api/security/decisions/:eventId without token returns 401', async () => {
  const res = await req('GET', '/api/security/decisions/evt_sec_block_01', null, null);
  assert.equal(res.status, 401);
  assert.equal(res.body.error?.code, 'UNAUTHORIZED');
});
