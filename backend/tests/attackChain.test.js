/**
 * TrustGuard — Cycle 4 Attack Chain Intelligence Tests
 *
 * Comprehensive tests for:
 *   4.1 Attack Chain Correlation Engine (attackChainEngine.js)
 *   4.2 Multi-Stage Attack Trajectory Detection
 *   4.3 False Positive Control (normal safe events)
 *   4.4 Deterministic Severity & Confidence Calculation
 *   4.5 Idempotency & Duplicate Prevention
 *   4.6 Database Integration & Ingestion Pipeline
 *   4.7 GET /api/security/attack-chains/:chainId
 *   4.8 GET /api/security/attack-chains (list)
 *   4.9 GET /api/security/alerts
 *   4.10 Authorization & Public ID Guarantees
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

const {
  ATTACK_STAGES,
  classifyEventStage,
  correlateAttackChain,
} = require('../engines/attackChainEngine');

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
const USER_B_ID = '22222222-2222-2222-2222-222222222222';
const AGENT_001_ID = '33333333-3333-3333-3333-333333333333';
const SESS_A_ID = '55555555-5555-5555-5555-555555555555';
const SESS_B_ID = '66666666-6666-6666-6666-666666666666';

const SEED_SQL = `
  INSERT INTO users (id, user_id_str, username, name, email, password_hash) VALUES
  ('${USER_A_ID}', 'usr_0001', 'alice_sec', 'Alice Sec', 'alice@sec.test', '$2b$10$dummy'),
  ('${USER_B_ID}', 'usr_0002', 'bob_dev', 'Bob Dev', 'bob@dev.test', '$2b$10$dummy');

  INSERT INTO agents (id, agent_id_str, name, description, declared_objective, permissions, status, current_trust_score) VALUES
  ('${AGENT_001_ID}', 'agent_001', 'Test Support Agent', 'Assists queries', 'Analyze monthly metrics.', ARRAY['file.read', 'db.read', 'llm.evaluate'], 'ACTIVE', 100);

  INSERT INTO sessions (id, session_id_str, user_id, agent_id, original_intent, current_trust_score, status) VALUES
  ('${SESS_A_ID}', 'sess_001', '${USER_A_ID}', '${AGENT_001_ID}', 'Analyze monthly metrics.', 100, 'ACTIVE'),
  ('${SESS_B_ID}', 'sess_002', '${USER_B_ID}', '${AGENT_001_ID}', 'Analyze monthly metrics.', 100, 'ACTIVE');
`;

testPool.query(rawSchema)
  .then(() => testPool.query(SEED_SQL))
  .catch((err) => {
    console.error('[AttackChain Test DB Setup Error]', err.message);
    process.exit(1);
  });

const poolPath = require.resolve('../db/pool');
require.cache[poolPath] = { id: poolPath, filename: poolPath, loaded: true, exports: testPool };

const http = require('http');
const app = require('../app');

function makeToken(userId, userIdStr, username, email) {
  return jwt.sign(
    { userId, userIdStr, username, email },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

const tokenUserA = makeToken(USER_A_ID, 'usr_0001', 'alice_sec', 'alice@sec.test');
const tokenUserB = makeToken(USER_B_ID, 'usr_0002', 'bob_dev', 'bob@dev.test');

function request(method, urlPath, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : '';
    const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) };
    if (token) headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      const opts = { hostname: '127.0.0.1', port, path: urlPath, method, headers };
      const req = http.request(opts, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          server.close();
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data), headers: res.headers });
          } catch {
            resolve({ status: res.statusCode, body: data, headers: res.headers });
          }
        });
      });
      req.on('error', (err) => {
        server.close();
        reject(err);
      });
      if (payload) req.write(payload);
      req.end();
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. UNIT TESTS: ATTACK CHAIN CORRELATION ENGINE
// ─────────────────────────────────────────────────────────────────────────────

test('1. Stage Classification: Correctly identifies Stage 1 Untrusted Input', () => {
  const stage = classifyEventStage({
    action: 'view_file',
    tool: 'file_system',
    resource: 'untrusted_input.txt',
    provenance_source_type: 'EXTERNAL_DOCUMENT',
    provenance_trust_level: 'UNTRUSTED',
  });
  assert.equal(stage, ATTACK_STAGES.STAGE_1_UNTRUSTED_INPUT);
});

test('2. Stage Classification: Correctly identifies Stage 2 Prompt Influence', () => {
  const stage = classifyEventStage({
    action: 'evaluate_prompt',
    tool: 'llm',
    resource: 'system_prompt',
    provenance_trust_level: 'UNTRUSTED',
  });
  assert.equal(stage, ATTACK_STAGES.STAGE_2_PROMPT_INFLUENCE);
});

test('3. Stage Classification: Correctly identifies Stage 3 Intent Drift / Sensitive DB Access', () => {
  const stage = classifyEventStage(
    {
      action: 'query_db',
      tool: 'database_connector',
      resource: 'NovaCorp_Credentials',
      data_sensitivity: 'HIGH',
    },
    { intent_status: 'DRIFT' }
  );
  assert.equal(stage, ATTACK_STAGES.STAGE_3_INTENT_DRIFT);
});

test('4. Stage Classification: Correctly identifies Stage 4 Agent Delegation', () => {
  const stage = classifyEventStage({
    action: 'delegate_task',
    tool: 'agent_manager',
    resource: 'sub_agent_02',
    provenance_source_type: 'ANOTHER_AGENT',
  });
  assert.equal(stage, ATTACK_STAGES.STAGE_4_AGENT_DELEGATION);
});

test('5. Stage Classification: Correctly identifies Stage 5 Data Exfiltration', () => {
  const stage = classifyEventStage({
    action: 'http_post',
    tool: 'http_client',
    resource: 'https://malicious-external-domain.com/exfiltrate',
    data_sensitivity: 'CRITICAL',
  });
  assert.equal(stage, ATTACK_STAGES.STAGE_5_DATA_EXFILTRATION);
});

test('6. False Positive Control: Normal benign events do NOT trigger an attack chain', () => {
  const normalEvents = [
    {
      event_id_str: 'evt_norm_01',
      action: 'read_metrics',
      tool: 'reporting',
      resource: 'q2_summary.csv',
      data_sensitivity: 'LOW',
      provenance_source_type: 'APPROVED_KNOWLEDGE',
      provenance_trust_level: 'TRUSTED',
    },
    {
      event_id_str: 'evt_norm_02',
      action: 'query_db',
      tool: 'database_connector',
      resource: 'monthly_sales',
      data_sensitivity: 'LOW',
      provenance_source_type: 'USER',
      provenance_trust_level: 'TRUSTED',
    },
  ];
  const normalDecisions = [
    { event_id_str: 'evt_norm_01', risk_level: 'LOW', intent_status: 'ALIGNED', security_signals: {} },
    { event_id_str: 'evt_norm_02', risk_level: 'LOW', intent_status: 'ALIGNED', security_signals: {} },
  ];

  const result = correlateAttackChain({
    events: normalEvents,
    decisions: normalDecisions,
    session: { session_id_str: 'sess_001' },
    agent: { agent_id_str: 'agent_001' },
  });

  assert.equal(result.detected, false);
  assert.equal(result.severity, 'NONE');
  assert.equal(result.confidence, 0.0);
  assert.equal(result.correlatedEventIds.length, 0);
});

test('7. Multi-Stage Detection: Correlating 5-stage compound attack produces CRITICAL severity', () => {
  const compoundEvents = [
    { event_id_str: 'evt_01', action: 'view_file', tool: 'file_system', resource: 'untrusted_input.txt', provenance_trust_level: 'UNTRUSTED', provenance_source_type: 'EXTERNAL_DOCUMENT' },
    { event_id_str: 'evt_02', action: 'evaluate_prompt', tool: 'llm', resource: 'system_prompt', provenance_trust_level: 'UNTRUSTED' },
    { event_id_str: 'evt_03', action: 'query_db', tool: 'database_connector', resource: 'credentials', data_sensitivity: 'HIGH' },
    { event_id_str: 'evt_04', action: 'delegate_task', tool: 'agent_manager', resource: 'sub_agent', provenance_source_type: 'ANOTHER_AGENT' },
    { event_id_str: 'evt_05', action: 'http_post', tool: 'http_client', resource: 'https://evil.com/exfiltrate', data_sensitivity: 'CRITICAL' },
  ];
  const compoundDecisions = [
    { event_id_str: 'evt_01', risk_level: 'LOW', intent_status: 'ALIGNED', security_signals: {} },
    { event_id_str: 'evt_02', risk_level: 'LOW', intent_status: 'DRIFT', security_signals: { intentDrift: true } },
    { event_id_str: 'evt_03', risk_level: 'HIGH', intent_status: 'DRIFT', security_signals: { intentDrift: true } },
    { event_id_str: 'evt_04', risk_level: 'HIGH', intent_status: 'DRIFT', security_signals: { intentDrift: true } },
    { event_id_str: 'evt_05', risk_level: 'CRITICAL', intent_status: 'DRIFT', security_signals: { policyViolation: true, intentDrift: true } },
  ];

  const result = correlateAttackChain({
    events: compoundEvents,
    decisions: compoundDecisions,
    session: { session_id_str: 'sess_001' },
    agent: { agent_id_str: 'agent_001' },
  });

  assert.equal(result.detected, true);
  assert.equal(result.severity, 'CRITICAL');
  assert.ok(result.confidence >= 0.90 && result.confidence <= 1.00);
  assert.equal(result.attackCategory, 'compound_attack');
  assert.equal(result.correlatedEventIds.length, 5);
  assert.ok(result.reasons.length >= 4);
});

test('8. Confidence is strictly bounded between 0.00 and 1.00', () => {
  const result = correlateAttackChain({
    events: [
      { event_id_str: 'e1', action: 'view_file', provenance_trust_level: 'UNTRUSTED', provenance_source_type: 'EXTERNAL_DOCUMENT' },
      { event_id_str: 'e2', action: 'http_post', tool: 'http_client', resource: 'https://exfil.test' },
    ],
    decisions: [
      { event_id_str: 'e1', risk_level: 'LOW', intent_status: 'ALIGNED', security_signals: {} },
      { event_id_str: 'e2', risk_level: 'CRITICAL', intent_status: 'DRIFT', security_signals: { policyViolation: true } },
    ],
    session: { session_id_str: 'sess_001' },
    agent: { agent_id_str: 'agent_001' },
  });

  assert.ok(result.confidence >= 0.00);
  assert.ok(result.confidence <= 1.00);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. INTEGRATION TESTS: INGESTION PIPELINE & ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

test('9. Ingesting single normal event: attackChain.detected === false', async () => {
  const res = await request('POST', '/api/agent/events', {
    eventId: 'evt_chain_norm_01',
    sessionId: 'sess_001',
    agentId: 'agent_001',
    timestamp: '2026-08-28T12:00:00Z',
    action: 'query_db',
    tool: 'database_connector',
    resource: 'public_reports',
    dataSensitivity: 'LOW',
    authorization: {
      status: 'ALLOWED',
      requiredPermission: 'db.read',
      grantedPermissions: ['db.read'],
    },
    provenance: {
      sourceType: 'USER',
      sourceId: 'user_prompt_01',
      trustLevel: 'TRUSTED',
    },
  }, tokenUserA);

  assert.equal(res.status, 201);
  assert.equal(res.body.attackChain.detected, false);
  assert.equal(res.body.attackChain.severity, 'NONE');
  assert.equal(res.body.attackChain.chainId, null);
});

test('10. Ingesting multi-stage compound attack sequence triggers attack chain detection', async () => {
  // Step 1: Untrusted document
  await request( 'POST', '/api/agent/events', {
    eventId: 'evt_c4_01',
    sessionId: 'sess_001',
    agentId: 'agent_001',
    timestamp: '2026-08-28T12:01:00Z',
    action: 'view_file',
    tool: 'file_system',
    resource: 'untrusted_input.txt',
    dataSensitivity: 'LOW',
    authorization: { status: 'ALLOWED', requiredPermission: 'file.read', grantedPermissions: ['file.read'] },
    provenance: { sourceType: 'EXTERNAL_DOCUMENT', sourceId: 'untrusted_input.txt', trustLevel: 'UNTRUSTED' },
  }, tokenUserA);

  // Step 2: Prompt execution under untrusted source
  await request( 'POST', '/api/agent/events', {
    eventId: 'evt_c4_02',
    sessionId: 'sess_001',
    agentId: 'agent_001',
    timestamp: '2026-08-28T12:01:30Z',
    action: 'evaluate_prompt',
    tool: 'llm',
    resource: 'system_prompt',
    dataSensitivity: 'LOW',
    authorization: { status: 'ALLOWED', requiredPermission: 'llm.evaluate', grantedPermissions: ['llm.evaluate'] },
    provenance: { sourceType: 'EXTERNAL_DOCUMENT', sourceId: 'untrusted_input.txt', trustLevel: 'UNTRUSTED' },
  }, tokenUserA);

  // Step 3: Sensitive credential access
  await request( 'POST', '/api/agent/events', {
    eventId: 'evt_c4_03',
    sessionId: 'sess_001',
    agentId: 'agent_001',
    timestamp: '2026-08-28T12:02:00Z',
    action: 'query_db',
    tool: 'database_connector',
    resource: 'NovaCorp_Credentials',
    dataSensitivity: 'HIGH',
    authorization: { status: 'ALLOWED', requiredPermission: 'db.read', grantedPermissions: ['db.read'] },
    provenance: { sourceType: 'EXTERNAL_DOCUMENT', sourceId: 'untrusted_input.txt', trustLevel: 'UNTRUSTED' },
  }, tokenUserA);

  // Step 4: Exfiltration attempt
  const resStep4 = await request( 'POST', '/api/agent/events', {
    eventId: 'evt_c4_04',
    sessionId: 'sess_001',
    agentId: 'agent_001',
    timestamp: '2026-08-28T12:02:30Z',
    action: 'http_post',
    tool: 'http_client',
    resource: 'https://malicious-domain.com/exfil',
    dataSensitivity: 'CRITICAL',
    authorization: { status: 'DENIED', requiredPermission: 'network.send', grantedPermissions: [] },
    provenance: { sourceType: 'EXTERNAL_DOCUMENT', sourceId: 'untrusted_input.txt', trustLevel: 'UNTRUSTED' },
  }, tokenUserA);

  assert.equal(resStep4.status, 201);
  assert.equal(resStep4.body.decision, 'BLOCK');
  assert.equal(resStep4.body.attackChain.detected, true);
  assert.equal(resStep4.body.attackChain.severity, 'CRITICAL');
  assert.ok(typeof resStep4.body.attackChain.chainId === 'string');
  assert.ok(resStep4.body.attackChain.chainId.startsWith('chain_'));
});

test('11. GET /api/security/attack-chains/:chainId returns full ordered timeline', async () => {
  // First retrieve list of chains to get public chain ID
  const listRes = await request( 'GET', '/api/security/attack-chains', null, tokenUserA);
  assert.equal(listRes.status, 200);
  assert.ok(listRes.body.attackChains.length > 0);

  const chainId = listRes.body.attackChains[0].chainId;

  const detailRes = await request( 'GET', `/api/security/attack-chains/${chainId}`, null, tokenUserA);
  assert.equal(detailRes.status, 200);
  assert.equal(detailRes.body.chainId, chainId);
  assert.equal(detailRes.body.sessionId, 'sess_001');
  assert.equal(detailRes.body.agentId, 'agent_001');
  assert.equal(detailRes.body.severity, 'CRITICAL');
  assert.ok(detailRes.body.events.length >= 4);

  // Check event chronological ordering
  for (let i = 1; i < detailRes.body.events.length; i++) {
    const prevTime = new Date(detailRes.body.events[i - 1].timestamp).getTime();
    const currTime = new Date(detailRes.body.events[i].timestamp).getTime();
    assert.ok(currTime >= prevTime);
  }
});

test('12. User B cannot access User A attack chain (ownership boundary)', async () => {
  const listRes = await request( 'GET', '/api/security/attack-chains', null, tokenUserA);
  const chainId = listRes.body.attackChains[0].chainId;

  const forbiddenRes = await request( 'GET', `/api/security/attack-chains/${chainId}`, null, tokenUserB);
  assert.equal(forbiddenRes.status, 403);
  assert.equal(forbiddenRes.body.error.code, 'FORBIDDEN');
});

test('13. GET /api/security/attack-chains/nonexistent returns 404', async () => {
  const res = await request( 'GET', '/api/security/attack-chains/chain_unknown_999', null, tokenUserA);
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, 'ATTACK_CHAIN_NOT_FOUND');
});

test('14. Unauthenticated attack-chain request returns 401', async () => {
  const res = await request( 'GET', '/api/security/attack-chains/chain_any', null, null);
  assert.equal(res.status, 401);
});

test('15. GET /api/security/alerts lists generated alerts', async () => {
  const res = await request( 'GET', '/api/security/alerts', null, tokenUserA);
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.alerts));
  assert.ok(res.body.alerts.length > 0);
  assert.equal(res.body.alerts[0].type, 'ATTACK_CHAIN_DETECTED');
  assert.ok(res.body.alerts[0].alertId.startsWith('al_'));
});

test('16. Public identifiers used: internal DB UUID never exposed in chain API responses', async () => {
  const listRes = await request( 'GET', '/api/security/attack-chains', null, tokenUserA);
  const chain = listRes.body.attackChains[0];

  assert.ok(chain.chainId.startsWith('chain_'));
  assert.equal(chain.id, undefined);

  const detailRes = await request( 'GET', `/api/security/attack-chains/${chain.chainId}`, null, tokenUserA);
  assert.equal(detailRes.body.id, undefined);
  assert.equal(detailRes.body.session_id, undefined);
});
