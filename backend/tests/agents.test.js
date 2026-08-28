/**
 * TrustGuard — Agents Tests (Cycle 2.2)
 *
 * Uses node:test (built-in) + pg-mem for in-memory PostgreSQL.
 * Seeds two agents matching the seed.sql data shapes.
 * No real database or real JWT secret required.
 *
 * Run: npm test:agents  OR  node --test tests/agents.test.js
 */
'use strict';

// ── Bootstrap env BEFORE any app module is loaded ────────────────────────────
process.env.JWT_SECRET = 'test-only-secret-do-not-use-in-production';
process.env.JWT_EXPIRES_IN = '1h';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgres://test:test@localhost/trustguard_test';

// ── Set up pg-mem ─────────────────────────────────────────────────────────────
const { newDb } = require('pg-mem');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const SCHEMA_PATH = path.resolve(__dirname, '../../db/schema.sql');

const memDb = newDb();

// Register uuid_generate_v4() for UUID column defaults
memDb.public.registerFunction({
  name: 'uuid_generate_v4',
  returns: memDb.public.getType('uuid'),
  implementation: () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },
});

const pgAdapter = memDb.adapters.createPg();
const { Pool: MemPool } = pgAdapter;
const testPool = new MemPool();

// Apply schema and seed agents
const rawSchema = fs.readFileSync(SCHEMA_PATH, 'utf8')
  .replace(/CREATE EXTENSION.*?;/gi, '')
  .replace(/gen_random_uuid\(\)/g, 'uuid_generate_v4()');

// Seed SQL (agents only — no FK dependency beyond themselves)
const SEED_AGENTS = `
  INSERT INTO users (id, user_id_str, username, name, email, password_hash)
  VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'usr_test0001',
    'test_admin',
    'Test Admin',
    'admin@trustguard.test',
    '$2b$12$placeholder_hash_value_for_testing_only_xxxxxxxxxxxxxx'
  );

  INSERT INTO agents (id, agent_id_str, name, description, declared_objective,
                      permissions, status, current_trust_score, created_at)
  VALUES
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'agent_001',
    'NovaCorp Customer Support Agent',
    'Assists customer queries and order searches.',
    'Analyze NovaCorp Q2 and Q3 reports and prepare an executive summary.',
    ARRAY['file.read', 'db.read', 'llm.evaluate', 'agent.delegate'],
    'ACTIVE',
    95,
    '2026-08-27T20:00:00Z'
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'agent_002',
    'NovaCorp DevOps Agent',
    'Maintain system resources and report security health logs.',
    'Maintain system resources and report security health logs.',
    ARRAY['file.read', 'db.read', 'network.send'],
    'SUSPENDED',
    32,
    '2026-08-27T20:15:00Z'
  );
`;

testPool.query(rawSchema).then(() => testPool.query(SEED_AGENTS)).catch((err) => {
  console.error('[Test Setup] Error:', err.message);
  process.exit(1);
});

// Inject mock pool into module cache
const poolModulePath = require.resolve('../db/pool');
require.cache[poolModulePath] = {
  id: poolModulePath, filename: poolModulePath, loaded: true, exports: testPool,
};

// ── Load app ──────────────────────────────────────────────────────────────────
const http = require('http');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../app');

// ── Generate a valid test JWT ─────────────────────────────────────────────────
const validToken = jwt.sign(
  { userId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', userIdStr: 'usr_test0001', username: 'test_admin', email: 'admin@trustguard.test' },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

// ── HTTP helper ───────────────────────────────────────────────────────────────
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
// Test 1 — Unauthenticated access rejected
// ════════════════════════════════════════════════════════════════════════════════
test('1. GET /api/agents without token → 401 UNAUTHORIZED', async () => {
  const res = await req('GET', '/api/agents', null, null);
  assert.equal(res.status, 401);
  assert.equal(res.body.error?.code, 'UNAUTHORIZED');
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 2 — List all agents
// ════════════════════════════════════════════════════════════════════════════════
test('2. GET /api/agents → 200 with agents array', async () => {
  const res = await req('GET', '/api/agents', null, validToken);
  assert.equal(res.status, 200, `Expected 200 got ${res.status}: ${JSON.stringify(res.body)}`);
  assert.ok(Array.isArray(res.body.agents), 'agents must be an array');
  assert.equal(res.body.agents.length, 2, 'Seed has 2 agents');
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 3 — agent_id_str is used as public ID (not internal UUID)
// ════════════════════════════════════════════════════════════════════════════════
test('3. agent_id_str is returned as agentId, internal UUID not exposed', async () => {
  const res = await req('GET', '/api/agents', null, validToken);
  assert.equal(res.status, 200);

  for (const agent of res.body.agents) {
    assert.ok(agent.agentId, 'agentId must be present');
    // Contract uses agent_id_str values like "agent_001"
    assert.ok(typeof agent.agentId === 'string', 'agentId must be a string');
    // Internal id (UUID) must never appear under the key "id" or "agentId" that looks like a UUID
    assert.ok(!/^[0-9a-f]{8}-[0-9a-f]{4}-/.test(agent.agentId),
      'agentId must not be a raw UUID');
    // internal "id" field must not be in the response
    assert.equal(agent.id, undefined, 'internal UUID id must not be exposed');
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 4 — List response shape matches API contract
// ════════════════════════════════════════════════════════════════════════════════
test('4. Agent list response shape matches API_CONTRACT.md', async () => {
  const res = await req('GET', '/api/agents', null, validToken);
  const agent = res.body.agents.find(a => a.agentId === 'agent_001');
  assert.ok(agent, 'agent_001 must be in list');
  assert.equal(agent.name, 'NovaCorp Customer Support Agent');
  assert.equal(agent.status, 'ACTIVE');
  assert.equal(agent.currentTrustScore, 95);
  assert.ok(agent.declaredObjective, 'declaredObjective must be present');
  assert.ok(agent.createdAt, 'createdAt must be present');
  // description is NOT part of list response shape per contract
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 5 — Filter agents by status=ACTIVE
// ════════════════════════════════════════════════════════════════════════════════
test('5. GET /api/agents?status=ACTIVE → only ACTIVE agents', async () => {
  const res = await req('GET', '/api/agents?status=ACTIVE', null, validToken);
  assert.equal(res.status, 200);
  assert.ok(res.body.agents.every(a => a.status === 'ACTIVE'), 'All returned agents must be ACTIVE');
  assert.equal(res.body.agents.length, 1);
  assert.equal(res.body.agents[0].agentId, 'agent_001');
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 6 — Filter agents by status=SUSPENDED
// ════════════════════════════════════════════════════════════════════════════════
test('6. GET /api/agents?status=SUSPENDED → only SUSPENDED agents', async () => {
  const res = await req('GET', '/api/agents?status=SUSPENDED', null, validToken);
  assert.equal(res.status, 200);
  assert.equal(res.body.agents.length, 1);
  assert.equal(res.body.agents[0].agentId, 'agent_002');
  assert.equal(res.body.agents[0].currentTrustScore, 32);
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 7 — Invalid status filter is rejected
// ════════════════════════════════════════════════════════════════════════════════
test('7. GET /api/agents?status=INVALID → 400 VALIDATION_ERROR', async () => {
  const res = await req('GET', '/api/agents?status=RUNNING', null, validToken);
  assert.equal(res.status, 400);
  assert.equal(res.body.error?.code, 'VALIDATION_ERROR');
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 8 — Get single agent detail
// ════════════════════════════════════════════════════════════════════════════════
test('8. GET /api/agents/agent_001 → 200 with full agent detail', async () => {
  const res = await req('GET', '/api/agents/agent_001', null, validToken);
  assert.equal(res.status, 200, `Expected 200 got ${res.status}: ${JSON.stringify(res.body)}`);
  assert.ok(res.body.agent, 'Must have agent object');
  const a = res.body.agent;
  assert.equal(a.agentId, 'agent_001');
  assert.equal(a.name, 'NovaCorp Customer Support Agent');
  assert.equal(a.description, 'Assists customer queries and order searches.');
  assert.equal(a.status, 'ACTIVE');
  assert.equal(a.currentTrustScore, 95);
  assert.ok(a.declaredObjective);
  assert.ok(a.createdAt);
  assert.equal(a.id, undefined, 'Internal UUID must not be exposed');
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 9 — Get non-existent agent returns 404
// ════════════════════════════════════════════════════════════════════════════════
test('9. GET /api/agents/agent_999 → 404 AGENT_NOT_FOUND', async () => {
  const res = await req('GET', '/api/agents/agent_999', null, validToken);
  assert.equal(res.status, 404);
  assert.equal(res.body.error?.code, 'AGENT_NOT_FOUND');
  assert.match(res.body.error.message, /agent_999/);
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 10 — Trust score is within 0–100 constraint
// ════════════════════════════════════════════════════════════════════════════════
test('10. currentTrustScore is within 0–100 for all agents', async () => {
  const res = await req('GET', '/api/agents', null, validToken);
  assert.equal(res.status, 200);
  for (const agent of res.body.agents) {
    assert.ok(
      Number.isInteger(agent.currentTrustScore) &&
      agent.currentTrustScore >= 0 &&
      agent.currentTrustScore <= 100,
      `Trust score ${agent.currentTrustScore} for ${agent.agentId} must be 0–100`
    );
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 11 — Permissions are stored and retrievable (via detail endpoint)
// ════════════════════════════════════════════════════════════════════════════════
test('11. Agent permissions are stored and retrievable', async () => {
  // Query DB directly to confirm permissions are stored correctly
  // (Permissions are stored server-side — not returned by GET /agents per the API contract,
  //  which only shows profile fields. We verify via DB query.)
  const dbRes = await testPool.query(
    `SELECT permissions FROM agents WHERE agent_id_str = 'agent_001'`
  );
  const perms = dbRes.rows[0].permissions;
  assert.ok(Array.isArray(perms), 'permissions must be an array');
  assert.ok(perms.includes('file.read'), 'file.read must be in permissions');
  assert.ok(perms.includes('db.read'), 'db.read must be in permissions');
  assert.ok(perms.includes('agent.delegate'), 'agent.delegate must be in permissions');
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 12 — GET /api/agents/:agentId/trust returns correct shape
// ════════════════════════════════════════════════════════════════════════════════
test('12. GET /api/agents/agent_001/trust → 200 with trust shape', async () => {
  const res = await req('GET', '/api/agents/agent_001/trust', null, validToken);
  assert.equal(res.status, 200, `Expected 200 got ${res.status}: ${JSON.stringify(res.body)}`);
  assert.equal(res.body.agentId, 'agent_001');
  assert.equal(res.body.currentTrustScore, 95);
  assert.ok(Array.isArray(res.body.history), 'history must be an array');
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 13 — Trust endpoint 404 for unknown agent
// ════════════════════════════════════════════════════════════════════════════════
test('13. GET /api/agents/agent_999/trust → 404 AGENT_NOT_FOUND', async () => {
  const res = await req('GET', '/api/agents/agent_999/trust', null, validToken);
  assert.equal(res.status, 404);
  assert.equal(res.body.error?.code, 'AGENT_NOT_FOUND');
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 14 — All agent endpoints reject unauthenticated requests
// ════════════════════════════════════════════════════════════════════════════════
test('14. All agent endpoints reject unauthenticated requests', async () => {
  const endpoints = [
    ['GET', '/api/agents'],
    ['GET', '/api/agents/agent_001'],
    ['GET', '/api/agents/agent_001/trust'],
  ];
  for (const [method, path] of endpoints) {
    const res = await req(method, path, null, null);
    assert.equal(res.status, 401, `${method} ${path} should return 401 without token`);
    assert.equal(res.body.error?.code, 'UNAUTHORIZED',
      `${method} ${path} should return UNAUTHORIZED error code`);
  }
});
